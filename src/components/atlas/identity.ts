// The sandbox account the presenter "signed in" with: a fictional persona, nothing collected.
// Kept in localStorage under atlas:user; every access is guarded.
import { useSyncExternalStore } from "react";
import type { Persona, PersonaId } from "@/lib/atlas/personas";

export interface Identity {
  name: string;
  email: string;
  personaId: PersonaId;
}

const KEY = "atlas:user";
let cache: Identity | null | undefined;
const listeners = new Set<() => void>();

function read(): Identity | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    const { name, email, personaId } = v as Record<string, unknown>;
    if (typeof name !== "string" || typeof email !== "string") return null;
    if (personaId !== "routely" && personaId !== "byteforge") return null;
    return { name, email, personaId };
  } catch {
    return null;
  }
}

function getIdentity(): Identity | null {
  if (cache === undefined) cache = read();
  return cache;
}

export function setIdentity(next: Identity | null): void {
  cache = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the identity still lives for this page
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIdentity(): Identity | null {
  return useSyncExternalStore(subscribe, getIdentity, () => null);
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** The name the founder introduces themselves with ("Meera Iyer"), never with a title. */
export function personaName(p: Persona): string {
  return (p.founderName || p.founder.split(",")[0]).trim();
}
