import type OpenAI from "openai";
import { AGENT_MODEL, llm, modelParams } from "@/lib/llm";
import type { AgentAction, AgentRequest, StreamEvent } from "@/lib/atlas/types";
import { normalizeState } from "@/lib/atlas/engine";
import { localToday } from "@/lib/atlas/format";
import { casePrompt, STATIC_PROMPT } from "@/lib/atlas/prompt";
import { executeTool, TOOLS, type ToolContext } from "@/lib/atlas/tools";
import {
  ATTACHMENT_MIME,
  dataUrlBytes,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type Attachment,
  type AgentRequestWithFiles,
} from "@/lib/atlas/attachments";
import { allow, clientIp } from "@/lib/ratelimit";

// The agent loop: up to 8 model turns over the tools, streamed to the client as NDJSON StreamEvents.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_TURNS = 8;
const SOFT_DEADLINE_MS = 48_000; // leave room to close the stream cleanly inside maxDuration
const ACTION_TOOL = { pay: "start_landing", advance: "advance_time", export: "export_pack" } as const;

type HistoryMessage = AgentRequest["messages"][number];

/** Keep only well-formed images and PDFs within the size caps; anything else is dropped. */
function sanitizeAttachments(raw: unknown): Attachment[] {
  if (!Array.isArray(raw)) return [];
  const out: Attachment[] = [];
  let total = 0;
  for (const a of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!a || typeof a !== "object") continue;
    const { name, mime, dataUrl } = a as Record<string, unknown>;
    if (typeof name !== "string" || typeof mime !== "string" || typeof dataUrl !== "string") continue;
    if (!(ATTACHMENT_MIME as readonly string[]).includes(mime) || !dataUrl.startsWith(`data:${mime};base64,`)) continue;
    const size = dataUrlBytes(dataUrl);
    if (size > MAX_ATTACHMENT_BYTES || total + size > MAX_TOTAL_ATTACHMENT_BYTES) continue;
    total += size;
    out.push({ name: name.replace(/[^\w .()-]/g, "_").slice(0, 100) || "file", mime, size, dataUrl });
  }
  return out;
}

/** The newest user message carries its files as content parts; older turns stay text only. */
function withAttachments(history: HistoryMessage[], files: Attachment[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  if (!files.length) return history;
  const i = history.map((m) => m.role).lastIndexOf("user");
  if (i < 0) return history;
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: "text", text: history[i].content }];
  for (const f of files) {
    parts.push(
      f.mime === "application/pdf"
        ? { type: "file", file: { filename: f.name, file_data: f.dataUrl } }
        : { type: "image_url", image_url: { url: f.dataUrl } },
    );
  }
  return history.map((m, j) => (j === i ? { role: "user", content: parts } : m));
}

function sanitizeMessages(raw: unknown): HistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryMessage[] = [];
  for (const m of raw.slice(-40)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) continue;
    const last = out[out.length - 1];
    const content = m.content.slice(0, 4000);
    if (last?.role === m.role) last.content += `\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

function sanitizeAction(raw: unknown): AgentAction | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Record<string, unknown>;
  if (a.type === "pay" || a.type === "export") return { type: a.type };
  if (a.type === "advance") {
    return {
      type: "advance",
      days: typeof a.days === "number" && Number.isFinite(a.days) ? Math.min(90, Math.max(1, Math.round(a.days))) : undefined,
      untilNextEvent: a.untilNextEvent === true,
    };
  }
  return undefined;
}

// The static rules and knowledge come first so they're cached: OpenAI caches a repeated prefix on its
// own; Anthropic needs a cache_control breakpoint. The live case summary follows.
function systemMessage(state: ToolContext["state"]): OpenAI.Chat.ChatCompletionSystemMessageParam {
  if (!AGENT_MODEL.startsWith("anthropic/")) return { role: "system", content: `${STATIC_PROMPT}\n\n${casePrompt(state)}` };
  const parts = [
    { type: "text", text: STATIC_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: casePrompt(state) },
  ];
  return { role: "system", content: parts as OpenAI.Chat.ChatCompletionContentPartText[] };
}

async function runAgent(
  ctx: ToolContext,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  send: (e: StreamEvent) => void,
  signal: AbortSignal,
) {
  const started = Date.now();
  let lastVisible: "text" | "other" | null = null;
  let turnHasText = false;
  let fresh = ""; // text since the last card, activity or choices
  let spoke = false; // any words or choices shown in this response
  ctx.emit = (e) => {
    if (e.t === "card" || e.t === "activity" || e.t === "choices") {
      lastVisible = "other";
      fresh = "";
    }
    if (e.t === "choices") spoke = true;
    send(e);
  };
  const emitText = (d: string) => {
    // A new turn's text after earlier text (with only state changes in between) starts a new paragraph.
    const text = !turnHasText && lastVisible === "text" ? `\n\n${d.replace(/^\s+/, "")}` : d;
    turnHasText = true;
    lastVisible = "text";
    fresh += text;
    if (text.trim()) spoke = true;
    send({ t: "text", d: text });
  };
  ctx.freshText = () => fresh;
  ctx.say = (d) => {
    const text = lastVisible === "text" && !/^\s/.test(d) ? `\n\n${d}` : d;
    lastVisible = "text";
    fresh += text;
    spoke = true;
    send({ t: "text", d: text });
  };

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [systemMessage(ctx.state), ...history];

  // Buttons (pay, clock, export) run their tool directly; the model then narrates the result.
  if (ctx.action) {
    const name = ACTION_TOOL[ctx.action.type];
    const args =
      ctx.action.type === "advance" ? { days: ctx.action.days, untilNextEvent: ctx.action.untilNextEvent || undefined } : {};
    const id = "call_action_0";
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
    });
    messages.push({ role: "tool", tool_call_id: id, content: await executeTool(name, JSON.stringify(args), ctx) });
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (Date.now() - started > SOFT_DEADLINE_MS) break;
    messages[0] = systemMessage(ctx.state);
    turnHasText = false;

    const completion = await llm().chat.completions.create(
      {
        model: AGENT_MODEL,
        stream: true,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 4000,
        messages,
        ...modelParams(AGENT_MODEL),
      },
      { signal, timeout: 30_000, maxRetries: 1 },
    );

    const turnStarted = Date.now();
    let text = "";
    let finish: string | null = null;
    const calls: { id: string; name: string; args: string }[] = [];
    for await (const chunk of completion) {
      finish = chunk.choices?.[0]?.finish_reason ?? finish;
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        text += delta.content;
        emitText(delta.content);
      }
      for (const tc of delta.tool_calls ?? []) {
        const call = (calls[tc.index] ??= { id: "", name: "", args: "" });
        if (tc.id) call.id = tc.id;
        if (tc.function?.name) call.name += tc.function.name;
        if (tc.function?.arguments) call.args += tc.function.arguments;
      }
    }

    const toolCalls = calls.filter((c) => c?.name);
    // One compact line per model turn (no founder content) for the runtime logs.
    console.log(
      JSON.stringify({
        atlas: "turn",
        turn,
        ms: Date.now() - turnStarted,
        textChars: text.length,
        tools: toolCalls.map((c) => c.name),
        finish,
        action: ctx.action?.type,
      }),
    );
    if (!toolCalls.length) break;
    toolCalls.forEach((c, i) => {
      if (!c.id) c.id = `call_${turn}_${i}`;
    });
    messages.push({
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" } })),
    });
    let stop = false;
    for (const c of toolCalls) {
      const result = await executeTool(c.name, c.args, ctx);
      messages.push({ role: "tool", tool_call_id: c.id, content: result });
      if (c.name === "offer_choices" && !result.startsWith('{"error"')) stop = true;
    }
    if (stop) break;
  }

  // Never leave the founder without a reply: if nothing was said, force one message with choices.
  if (!spoke && Date.now() - started < SOFT_DEADLINE_MS) {
    messages[0] = systemMessage(ctx.state);
    const res = await llm().chat.completions.create(
      {
        model: AGENT_MODEL,
        max_tokens: 3000,
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "offer_choices" } },
        messages,
        ...modelParams(AGENT_MODEL),
      },
      { signal, timeout: 20_000, maxRetries: 1 },
    );
    const call = res.choices[0]?.message?.tool_calls?.[0];
    console.log(JSON.stringify({ atlas: "fallback", ok: call?.type === "function" }));
    if (call?.type === "function") await executeTool("offer_choices", call.function.arguments, ctx);
  }
  send({ t: "state", state: ctx.state });
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const line = (e: StreamEvent) => encoder.encode(`${JSON.stringify(e)}\n`);
  const headers = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  };

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    const body = `${JSON.stringify({ t: "error", d: "setup_required", retryable: false })}\n${JSON.stringify({ t: "done" })}\n`;
    return new Response(body, { headers });
  }

  if (!allow(`agent:${clientIp(req)}`, 300)) {
    const body = `${JSON.stringify({ t: "error", d: "Too many requests from this network. Try again in a few minutes.", retryable: true })}\n${JSON.stringify({ t: "done" })}\n`;
    return new Response(body, { headers });
  }

  let body: Partial<AgentRequestWithFiles>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const history = sanitizeMessages(body.messages);
  const ctx: ToolContext = {
    state: normalizeState(body.state, localToday()),
    action: sanitizeAction(body.action),
    emit: () => {},
    conversation: history.slice(-6),
  };
  if (!history.length) return Response.json({ error: "Expected at least one user message." }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: StreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(line(e));
        } catch {
          open = false;
        }
      };
      try {
        await runAgent(ctx, withAttachments(history, sanitizeAttachments(body.attachments)), send, req.signal);
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("Agent loop failed:", err instanceof Error ? `${err.name}: ${err.message}` : "unknown error");
        }
        send({ t: "state", state: ctx.state });
        send({ t: "error", d: "The AI service didn't answer. Try again.", retryable: true });
      } finally {
        send({ t: "done" });
        open = false;
        try {
          controller.close();
        } catch {
          // already closed by a client disconnect
        }
      }
    },
  });
  return new Response(stream, { headers });
}
