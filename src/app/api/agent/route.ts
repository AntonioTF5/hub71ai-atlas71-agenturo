import type OpenAI from "openai";
import { DEFAULT_MODEL, llm } from "@/lib/llm";
import type { AgentAction, AgentRequest, StreamEvent } from "@/lib/atlas/types";
import { normalizeState } from "@/lib/atlas/engine";
import { localToday } from "@/lib/atlas/format";
import { buildSystemPrompt } from "@/lib/atlas/prompt";
import { executeTool, TOOLS, type ToolContext } from "@/lib/atlas/tools";

// The agent loop: up to 8 model turns over the tools, streamed to the client as NDJSON StreamEvents.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_TURNS = 8;
const SOFT_DEADLINE_MS = 48_000; // leave room to close the stream cleanly inside maxDuration
const ACTION_TOOL = { pay: "start_landing", advance: "advance_time", export: "export_pack" } as const;

type HistoryMessage = AgentRequest["messages"][number];

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

async function runAgent(ctx: ToolContext, history: HistoryMessage[], send: (e: StreamEvent) => void, signal: AbortSignal) {
  const started = Date.now();
  let lastVisible: "text" | "other" | null = null;
  let turnHasText = false;
  ctx.emit = (e) => {
    if (e.t === "card" || e.t === "activity" || e.t === "choices") lastVisible = "other";
    send(e);
  };
  const emitText = (d: string) => {
    // A new turn's text after earlier text (with only state changes in between) starts a new paragraph.
    const text = !turnHasText && lastVisible === "text" ? `\n\n${d.replace(/^\s+/, "")}` : d;
    turnHasText = true;
    lastVisible = "text";
    send({ t: "text", d: text });
  };

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(ctx.state) },
    ...history,
  ];

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
    messages[0] = { role: "system", content: buildSystemPrompt(ctx.state) };
    turnHasText = false;

    const completion = await llm().chat.completions.create(
      {
        model: DEFAULT_MODEL,
        stream: true,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 1000,
        messages,
      },
      { signal, timeout: 30_000, maxRetries: 1 },
    );

    let text = "";
    const calls: { id: string; name: string; args: string }[] = [];
    for await (const chunk of completion) {
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
      messages.push({ role: "tool", tool_call_id: c.id, content: await executeTool(c.name, c.args, ctx) });
      if (c.name === "offer_choices") stop = true;
    }
    if (stop) break;
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

  let body: Partial<AgentRequest>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const ctx: ToolContext = {
    state: normalizeState(body.state, localToday()),
    action: sanitizeAction(body.action),
    emit: () => {},
  };
  const history = sanitizeMessages(body.messages);
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
        await runAgent(ctx, history, send, req.signal);
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
