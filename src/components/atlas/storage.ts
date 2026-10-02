// localStorage persistence for the case and the chat, under one key. Every access is guarded:
// private windows, blocked storage and quota errors must never break the demo.
import type { CaseState } from "@/lib/atlas/types";
import { localToday } from "@/lib/atlas/format";
import { normalizeState } from "@/lib/atlas/engine";
import { sanitizeMessages, type UiMessage } from "./session";

export const STORAGE_KEY = "atlas:v1";

export interface SavedSession {
  state: CaseState;
  messages: UiMessage[];
}

export function loadSession(): SavedSession | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const { state, messages } = data as { state?: unknown; messages?: unknown };
    if (!state || typeof state !== "object" || (state as { v?: unknown }).v !== 1) return null;
    const msgs = sanitizeMessages(messages);
    if (!msgs) return null;
    return { state: normalizeState(state, localToday()), messages: msgs };
  } catch {
    return null;
  }
}

export function saveSession(session: SavedSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: session.state, messages: session.messages }));
  } catch {
    // Quota or blocked storage: the session still works in memory.
  }
}
