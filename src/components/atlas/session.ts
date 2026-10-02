// Pure pieces of the chat session: message types, applying NDJSON stream events to the in-progress
// assistant message, reading the stream, and validating what comes back from localStorage.
import type { AgentAction, Card, CaseState, MessagePart, StreamEvent } from "@/lib/atlas/types";
import type { AttachmentMeta, ChatMessageWithFiles } from "@/lib/atlas/attachments";

export interface UiMessage extends ChatMessageWithFiles {
  /** User turns: the action the message was sent with, so Retry resends it exactly. */
  action?: AgentAction;
  /** Assistant turns: the error can't be retried (setup_required, or the server said so). */
  noRetry?: boolean;
  /** Assistant turns: still streaming. A reload mid-stream turns this into a retryable error. */
  pending?: boolean;
}

export const CONNECTION_LOST = "Connection lost. Try again.";
export const NO_REPLY = "Atlas71 didn't reply. Try again.";
export const SETUP_REQUIRED = "setup_required";

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const CARD_KINDS = new Set(["route", "plan", "price", "filings", "updates", "bank_file", "export", "compare", "checkout"]);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function isCard(v: unknown): v is Card {
  return isObj(v) && typeof v.kind === "string" && CARD_KINDS.has(v.kind) && isObj(v.data);
}

export function isCaseStateLike(v: unknown): v is CaseState {
  return (
    isObj(v) &&
    v.v === 1 &&
    typeof v.startDate === "string" &&
    typeof v.today === "string" &&
    isObj(v.profile) &&
    Array.isArray((v.profile as Record<string, unknown>).people) &&
    Array.isArray(v.filings) &&
    Array.isArray(v.events)
  );
}

export function isStreamEvent(v: unknown): v is StreamEvent {
  if (!isObj(v) || typeof v.t !== "string") return false;
  switch (v.t) {
    case "text":
    case "activity":
      return typeof v.d === "string";
    case "card":
      return isCard(v.card);
    case "choices":
      return Array.isArray(v.options);
    case "state":
      return isCaseStateLike(v.state);
    case "error":
      return typeof v.d === "string";
    case "done":
      return true;
    default:
      return false;
  }
}

/** Applies one display event (text, activity, card, choices) to the assistant message. */
export function applyEvent(msg: UiMessage, ev: StreamEvent): UiMessage {
  switch (ev.t) {
    case "text": {
      if (!ev.d) return msg;
      const parts = msg.parts.slice();
      const last = parts[parts.length - 1];
      if (last?.type === "text") parts[parts.length - 1] = { type: "text", text: last.text + ev.d };
      else parts.push({ type: "text", text: ev.d });
      return { ...msg, parts };
    }
    case "activity": {
      const parts = msg.parts.slice();
      if (!ev.done) {
        parts.push({ type: "activity", text: ev.d, done: false });
        return { ...msg, parts };
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.type === "activity" && !p.done) {
          parts[i] = { type: "activity", text: ev.d || p.text, done: true };
          return { ...msg, parts };
        }
      }
      parts.push({ type: "activity", text: ev.d, done: true });
      return { ...msg, parts };
    }
    case "card":
      return { ...msg, parts: [...msg.parts, { type: "card", card: ev.card }] };
    case "choices": {
      const options = ev.options
        .filter((o): o is string => typeof o === "string" && !!o.trim())
        .map((o) => o.trim().slice(0, 200))
        .slice(0, 6);
      if (!options.length) return msg;
      return { ...msg, parts: [...msg.parts, { type: "choices", options }] };
    }
    default:
      return msg;
  }
}

/** Reads an NDJSON body line by line, buffering partial lines across chunks. Bad lines are skipped. */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onEvent: (ev: StreamEvent) => void,
  onChunk?: () => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const flush = (line: string) => {
    const s = line.trim();
    if (!s) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(s);
    } catch {
      return;
    }
    if (isStreamEvent(parsed)) onEvent(parsed);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk?.();
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf("\n");
      while (nl !== -1) {
        flush(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
      }
    }
    buf += decoder.decode();
    if (buf) flush(buf);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // already released
    }
  }
}

/** The first protocol error inside a non-OK response body, if the server sent one. */
export function findErrorEvent(text: string): Extract<StreamEvent, { t: "error" }> | null {
  for (const line of text.split("\n")) {
    try {
      const v: unknown = JSON.parse(line.trim());
      if (isStreamEvent(v) && v.t === "error") return v;
    } catch {
      // not NDJSON
    }
  }
  return null;
}

// ---------- persisted messages ----------

function sanitizePart(p: unknown): MessagePart | null {
  if (!isObj(p)) return null;
  switch (p.type) {
    case "text":
      return typeof p.text === "string" ? { type: "text", text: p.text } : null;
    case "activity":
      return typeof p.text === "string" ? { type: "activity", text: p.text, done: p.done === true } : null;
    case "card":
      return isCard(p.card) ? { type: "card", card: p.card } : null;
    case "choices":
      return Array.isArray(p.options)
        ? { type: "choices", options: p.options.filter((o): o is string => typeof o === "string" && !!o.trim()) }
        : null;
    default:
      return null;
  }
}

function sanitizeAction(a: unknown): AgentAction | undefined {
  if (!isObj(a)) return undefined;
  if (a.type === "pay" || a.type === "export") return { type: a.type };
  if (a.type === "advance") {
    return {
      type: "advance",
      ...(typeof a.days === "number" && Number.isFinite(a.days) ? { days: a.days } : {}),
      ...(a.untilNextEvent === true ? { untilNextEvent: true } : {}),
    };
  }
  return undefined;
}

function sanitizeAttachments(v: unknown): AttachmentMeta[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((a): a is AttachmentMeta => isObj(a) && typeof a.name === "string" && typeof a.mime === "string")
    .map((a) => ({ name: a.name.slice(0, 200), mime: a.mime, size: typeof a.size === "number" ? a.size : 0 }));
  return out.length ? out : undefined;
}

/**
 * Messages from localStorage. A message without an id, role or parts array means the save is not ours:
 * return null and the caller starts fresh. Unknown parts are dropped rather than failing the whole chat.
 */
export function sanitizeMessages(raw: unknown): UiMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: UiMessage[] = [];
  for (const m of raw) {
    if (!isObj(m) || typeof m.id !== "string" || (m.role !== "user" && m.role !== "assistant") || !Array.isArray(m.parts)) {
      return null;
    }
    const parts = m.parts.map(sanitizePart).filter((p): p is MessagePart => !!p);
    const msg: UiMessage = { id: m.id, role: m.role, parts };
    if (typeof m.error === "string" && m.error) msg.error = m.error;
    if (m.noRetry === true) msg.noRetry = true;
    const action = sanitizeAction(m.action);
    if (action) msg.action = action;
    const attachments = sanitizeAttachments(m.attachments);
    if (attachments) msg.attachments = attachments;
    if (m.pending === true) msg.pending = true;
    out.push(msg);
  }
  // A reply that was still streaming when the page closed can't resume: offer Retry instead.
  for (const msg of out) {
    if (!msg.pending) continue;
    delete msg.pending;
    if (!msg.error) msg.error = CONNECTION_LOST;
  }
  return out;
}
