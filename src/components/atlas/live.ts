// The client's view of the engine: plan, price and what's waiting on the founder, recomputed from the
// live case. Every call is guarded, so an engine edge case shows an empty tracker instead of a crash.
import type { CaseState, PlanCardData, PriceCardData } from "@/lib/atlas/types";
import { buildPlan, dayNumber, payChecklist, priceIsPartial, quote, waitingOn, type PayCheck } from "@/lib/atlas/engine";
import { buildJsonPack, buildMarkdownPack, packFileName } from "@/lib/atlas/export";
import type { ExportFile } from "./context";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("[atlas71] engine call failed", err);
    return fallback;
  }
}

export interface Derived {
  plan: PlanCardData | null;
  price: PriceCardData | null;
  checklist: PayCheck[];
  waiting: string[];
  day: number;
}

export function derive(state: CaseState): Derived {
  return {
    plan: safe(() => buildPlan(state), null),
    price: safe(() => quote(state), null),
    checklist: safe(() => (state.paid ? [] : payChecklist(state)), []),
    waiting: safe(() => waitingOn(state), []),
    day: safe(() => dayNumber(state), 0),
  };
}

export function isPartialPrice(card: PriceCardData): boolean {
  return safe(() => priceIsPartial(card), false);
}

export function exportCase(state: CaseState, ext: "md" | "json"): ExportFile | null {
  return safe(
    () =>
      ext === "md"
        ? { name: packFileName(state, "md"), body: buildMarkdownPack(state), type: "text/markdown;charset=utf-8" }
        : { name: packFileName(state, "json"), body: buildJsonPack(state), type: "application/json;charset=utf-8" },
    null,
  );
}
