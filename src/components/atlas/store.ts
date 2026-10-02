// The live chat session as an external store: case state, messages, the streaming request to
// /api/agent, persistence and the AI health badge. It lives outside React so a double click, a
// re-render or StrictMode can never start a second request, and a reset can cut a stream off cleanly.
import { useSyncExternalStore } from "react";
import type { AgentAction, CaseState, StreamEvent } from "@/lib/atlas/types";
import type { AgentRequestWithFiles, Attachment } from "@/lib/atlas/attachments";
import { emptyCase, PERSONAS, type PersonaId } from "@/lib/atlas/personas";
import { localToday } from "@/lib/atlas/format";
import { toLlmHistory } from "@/lib/atlas/history";
import { CONNECTION_LOST, NO_REPLY, SETUP_REQUIRED, applyEvent, findErrorEvent, readNdjson, uid, type UiMessage } from "./session";
import { loadSession, saveSession } from "./storage";

export type Health = "checking" | "live" | "setup";

export interface Snapshot {
  /** False until the saved session has been read on the client. */
  ready: boolean;
  state: CaseState;
  messages: UiMessage[];
  busy: boolean;
  health: Health;
  /** A reset happened in the last few seconds and can be undone. */
  canUndo: boolean;
  /** Image thumbnails for user messages sent this session (memory only, never persisted). */
  previews: Record<string, (string | null)[]>;
}

export interface SendOptions {
  action?: AgentAction;
  files?: Attachment[];
  previews?: (string | null)[];
}

export interface AtlasStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Snapshot;
  getServerSnapshot: () => Snapshot;
  init: () => void;
  send: (text: string, opts?: SendOptions) => boolean;
  retry: () => void;
  reset: () => void;
  undoReset: () => void;
  dismissUndo: () => void;
  startPersona: (id: PersonaId) => void;
}

/** Abort a stream that has been silent this long. */
const IDLE_TIMEOUT_MS = 75_000;
const UNDO_MS = 8_000;
/**
 * Vercel refuses function request bodies over 4.5 MB. Uploaded files travel as URLs and the composer
 * keeps inline ones within MAX_INLINE_TOTAL_BYTES, so this only catches a surprise before the server does.
 */
const MAX_REQUEST_BYTES = 4_400_000;
const TOO_LARGE = "These files are too large to send together. Attach fewer and send again.";
/** Files live in memory only: after a reload, a failed file turn can't be resent as it was. */
const FILES_GONE = "Attach the files again to resend them.";

const SERVER_SNAPSHOT: Snapshot = {
  ready: false,
  state: emptyCase("2026-10-02"),
  messages: [],
  busy: false,
  health: "checking",
  canUndo: false,
  previews: {},
};

function settle(m: UiMessage, error?: string): UiMessage {
  const out: UiMessage = { id: m.id, role: m.role, parts: m.parts };
  if (m.error || error) out.error = m.error ?? error;
  if (m.noRetry) out.noRetry = true;
  if (m.action) out.action = m.action;
  if (m.attachments) out.attachments = m.attachments;
  return out;
}

export function createAtlasStore(): AtlasStore {
  let snap: Snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  let generation = 0;
  let controller: AbortController | null = null;
  let undo: Pick<Snapshot, "state" | "messages" | "previews"> | null = null;
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingFiles = new Map<string, Attachment[]>();
  let frame = 0;
  let initialized = false;

  const notify = () => {
    frame = 0;
    for (const l of listeners) l();
  };

  /** Text deltas are batched to one render per frame; everything else renders at once. */
  const emit = (batch = false) => {
    if (!batch || typeof requestAnimationFrame !== "function") {
      if (frame) cancelAnimationFrame(frame);
      notify();
      return;
    }
    if (!frame) frame = requestAnimationFrame(notify);
  };

  const set = (patch: Partial<Snapshot>, batch = false) => {
    snap = { ...snap, ...patch };
    emit(batch);
  };

  const persist = () => {
    if (snap.ready) saveSession({ state: snap.state, messages: snap.messages });
  };

  const updateMessage = (id: string, fn: (m: UiMessage) => UiMessage, batch = false) => {
    const i = snap.messages.findIndex((m) => m.id === id);
    if (i < 0) return;
    const messages = snap.messages.slice();
    messages[i] = fn(messages[i]);
    set({ messages }, batch);
  };

  const abortCurrent = () => {
    generation++;
    controller?.abort();
    controller = null;
  };

  const clearUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = null;
    undo = null;
    if (snap.canUndo) set({ canUndo: false });
  };

  async function run(history: UiMessage[], assistantId: string, action?: AgentAction, files?: Attachment[]) {
    const gen = ++generation;
    const ctrl = new AbortController();
    controller = ctrl;
    const live = () => gen === generation;
    let sawDone = false;
    let sawError = false;
    let idle: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => ctrl.abort(), IDLE_TIMEOUT_MS);
    };

    const fail = (message: string, noRetry = false) => {
      if (!live() || sawError) return;
      sawError = true;
      updateMessage(assistantId, (m) => ({ ...m, error: message, ...(noRetry ? { noRetry: true } : {}) }));
    };

    const onEvent = (ev: StreamEvent) => {
      if (!live()) return;
      switch (ev.t) {
        case "state":
          set({ state: ev.state });
          persist();
          return;
        case "error":
          fail(ev.d || CONNECTION_LOST, ev.d === SETUP_REQUIRED || !ev.retryable);
          return;
        case "done":
          sawDone = true;
          persist();
          return;
        default:
          updateMessage(assistantId, (m) => applyEvent(m, ev), ev.t === "text");
      }
    };

    try {
      bump();
      const body: AgentRequestWithFiles = {
        messages: toLlmHistory(history),
        state: snap.state,
        ...(action ? { action } : {}),
        ...(files?.length ? { attachments: files } : {}),
      };
      const json = JSON.stringify(body);
      if (files?.length && new Blob([json]).size > MAX_REQUEST_BYTES) {
        fail(TOO_LARGE, true);
        return;
      }
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: json,
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!live()) return;
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        const ev = findErrorEvent(text);
        if (ev) onEvent(ev);
        else fail(CONNECTION_LOST);
        return;
      }
      await readNdjson(res.body, onEvent, bump);
      if (!sawDone) fail(CONNECTION_LOST);
    } catch {
      fail(CONNECTION_LOST);
    } finally {
      if (idle) clearTimeout(idle);
      if (live()) {
        controller = null;
        const msg = snap.messages.find((m) => m.id === assistantId);
        // Activity rows alone ("Couldn't read icp.gov.ae") aren't a reply: offer Retry.
        const blank =
          !!msg && !msg.error && !msg.parts.some((p) => (p.type === "text" && p.text.trim()) || p.type === "card" || p.type === "choices");
        set({
          messages: snap.messages.map((m) => (m.id === assistantId ? settle(m, blank ? NO_REPLY : undefined) : m)),
          busy: false,
        });
        const failed = snap.messages.find((m) => m.id === assistantId)?.error;
        if (!failed) {
          const user = history[history.length - 1];
          if (user) pendingFiles.delete(user.id);
        }
        persist();
      }
    }
  }

  const store: AtlasStore = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snap,
    getServerSnapshot: () => SERVER_SNAPSHOT,

    init() {
      if (initialized) return;
      initialized = true;
      const saved = loadSession();
      snap = {
        ...snap,
        ready: true,
        state: saved?.state ?? emptyCase(localToday()),
        messages: saved?.messages ?? [],
      };
      emit();
      window.addEventListener("pagehide", persist);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      fetch("/api/health", { cache: "no-store", signal: ctrl.signal })
        .then((res) => set({ health: res.ok ? "live" : "setup" }))
        .catch(() => set({ health: "setup" }))
        .finally(() => clearTimeout(timer));
    },

    send(text, opts = {}) {
      if (!snap.ready || snap.busy) return false;
      const files = opts.files?.length ? opts.files : undefined;
      const clean = text.trim() || (files ? (files.length > 1 ? "Here are my documents." : "Here's my document.") : "");
      if (!clean) return false;
      const user: UiMessage = { id: uid(), role: "user", parts: [{ type: "text", text: clean }] };
      if (opts.action) user.action = opts.action;
      if (files) {
        user.attachments = files.map(({ name, mime, size }) => ({ name, mime, size }));
        pendingFiles.set(user.id, files);
      }
      const assistant: UiMessage = { id: uid(), role: "assistant", parts: [], pending: true };
      const history = [...snap.messages, user];
      if (undo) clearUndo();
      set({
        messages: [...history, assistant],
        busy: true,
        previews: files && opts.previews ? { ...snap.previews, [user.id]: opts.previews } : snap.previews,
      });
      persist();
      void run(history, assistant.id, opts.action, files);
      return true;
    },

    retry() {
      if (!snap.ready || snap.busy) return;
      const last = snap.messages[snap.messages.length - 1];
      if (!last || last.role !== "assistant" || !last.error || last.noRetry) return;
      const history = snap.messages.slice(0, -1);
      const user = [...history].reverse().find((m) => m.role === "user");
      if (!user) return;
      if (user.attachments?.length && !pendingFiles.has(user.id)) {
        // Resending only the "(attached: …)" note would let the model answer about files it can't see.
        updateMessage(last.id, (m) => ({ ...m, error: FILES_GONE, noRetry: true }));
        persist();
        return;
      }
      const assistant: UiMessage = { id: uid(), role: "assistant", parts: [], pending: true };
      set({ messages: [...history, assistant], busy: true });
      persist();
      void run(history, assistant.id, user.action, pendingFiles.get(user.id));
    },

    reset() {
      if (!snap.ready) return;
      const hadChat = snap.messages.length > 0;
      abortCurrent();
      if (undoTimer) clearTimeout(undoTimer);
      undo = hadChat
        ? {
            state: snap.state,
            messages: snap.messages.map((m) => (m.pending ? settle(m, CONNECTION_LOST) : m)),
            previews: snap.previews,
          }
        : null;
      set({ state: emptyCase(localToday()), messages: [], busy: false, previews: {}, canUndo: hadChat });
      persist();
      if (hadChat) undoTimer = setTimeout(() => store.dismissUndo(), UNDO_MS);
    },

    undoReset() {
      if (!undo || snap.busy) return;
      const back = undo;
      clearUndo();
      set({ ...back, canUndo: false });
      persist();
    },

    dismissUndo() {
      clearUndo();
    },

    startPersona(id) {
      const persona = PERSONAS.find((p) => p.id === id);
      if (!persona || !snap.ready) return;
      abortCurrent();
      clearUndo();
      pendingFiles.clear();
      set({ state: emptyCase(localToday(), persona.id), messages: [], busy: false, previews: {} });
      store.send(persona.opener);
    },
  };
  return store;
}

let singleton: AtlasStore | null = null;

export function getAtlasStore(): AtlasStore {
  if (!singleton) singleton = createAtlasStore();
  return singleton;
}

export function useAtlasSession(): Snapshot {
  const store = getAtlasStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
