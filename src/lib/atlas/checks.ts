// TypeSafe question sets and verdict mapping. Server only: it reads TYPESAFE_API_KEY.
// One systemOne call per batch; the state carries named case facts only, never keys or secrets.
import { noul, TypeSafeError, type NoulQuestion } from "@typesafe-ai/sdk";
import { typesafe } from "@/lib/typesafe";
import type { CaseState, ChecksMeta, Judgment } from "./types";
import { relocating, verdictFor } from "./engine.ts";

interface CheckDef {
  label: string;
  polarity: "good" | "bad";
  instructions: string;
  notes?: Partial<Record<Judgment["verdict"], string>>;
}

export const FIT_CHECKS: Record<string, CheckDef> = {
  tech_product: {
    label: "Sells its own tech product",
    polarity: "good",
    instructions:
      "Does the company sell its own technology product (software, a platform, or an app that customers use) rather than building technology for clients as a service?",
    notes: { flag: "Reads as client work rather than an own product." },
  },
  service_provider: {
    label: "Technology service provider",
    polarity: "bad",
    instructions:
      "Is the company mainly a technology service provider: custom software development, IT consulting, outsourcing, or agency work for clients?",
    notes: { flag: "The startup licence isn't for technology service providers [source:adgm-tsl]." },
  },
  regulated_finance: {
    label: "Regulated financial activity",
    polarity: "bad",
    instructions:
      "Does the business carry out a regulated financial activity such as payments, lending, deposit-taking, investment advice, insurance, or crypto-asset services?",
    notes: { flag: "Needs an FSRA or Central Bank licence: specialist review." },
  },
  excluded_sector: {
    label: "Retail, manufacturing or gaming",
    polarity: "bad",
    instructions: "Is the core business consumer retail, manufacturing, or gaming or gambling?",
  },
  scalable: {
    label: "Scalable technology",
    polarity: "good",
    instructions:
      "Does the company use technology to solve a customer problem in a way that could scale across the region or globally?",
  },
};

export const BANK_CHECKS: Record<string, CheckDef> = {
  funds_explained: {
    label: "Source of funds explained",
    polarity: "good",
    instructions:
      "Does the file say where the company's money came from, naming the sources (for example investors or the founders' savings) and the amounts?",
    notes: { flag: "Source of funds not explained.", review: "Source of funds needs more detail." },
  },
  ownership_traced: {
    label: "Ownership traced to people",
    polarity: "good",
    instructions:
      "Does the file trace ownership from the UAE company up to the individual people who ultimately own it, with percentages?",
    notes: { flag: "Ownership chain incomplete.", review: "Ownership chain needs percentages for every level." },
  },
  activity_specific: {
    label: "Business activity is specific",
    polarity: "good",
    instructions:
      "Does the file describe what the company sells and to whom, specifically enough for a bank to understand the business?",
    notes: { flag: "The business description is too vague for a bank." },
  },
  transactions_fit: {
    label: "Expected transactions fit",
    polarity: "good",
    instructions:
      "Does the file give expected monthly transaction volumes and countries, and do they fit the described business?",
    notes: { flag: "Expected volumes or countries are missing or don't fit." },
  },
  high_risk: {
    label: "High-risk activity mentioned",
    polarity: "bad",
    instructions: "Does the file mention crypto-assets, cash-heavy business, or payments involving sanctioned countries?",
    notes: { flag: "Mentions a high-risk activity the bank will question." },
  },
};

export interface BatchResult {
  judgments: Judgment[];
  meta: ChecksMeta;
}

type JsonState = Parameters<ReturnType<typeof typesafe>["systemOne"]>[0]["state"];

async function runBatch(defs: Record<string, CheckDef>, state: JsonState): Promise<BatchResult> {
  if (!process.env.TYPESAFE_API_KEY?.trim()) return { judgments: [], meta: { live: false, error: "setup_required" } };
  const questions: Record<string, NoulQuestion> = Object.fromEntries(
    Object.entries(defs).map(([key, d]) => [key, noul(d.instructions)]),
  );
  const started = Date.now();
  try {
    const res = await typesafe().systemOne({ state, questions }, { timeout: 8000, retry: { maxRetries: 1 } });
    const latencyMs = Date.now() - started;
    const judgments: Judgment[] = Object.entries(defs).map(([key, d]) => {
      const p = Math.min(1, Math.max(0, Number(res.answers[key]?.noul ?? NaN)));
      if (!Number.isFinite(p)) throw new Error(`no answer for ${key}`);
      const verdict = verdictFor(p, d.polarity);
      return { key, label: d.label, p: Math.round(p * 1000) / 1000, verdict, note: d.notes?.[verdict] };
    });
    return { judgments, meta: { live: true, latencyMs, model: res.model } };
  } catch (err) {
    const setup = err instanceof TypeSafeError && /api key/i.test(err.message);
    console.error("TypeSafe batch failed:", err instanceof Error ? err.message : "unknown error");
    return { judgments: [], meta: { live: false, error: setup ? "setup_required" : "unavailable" } };
  }
}

export function fitState(state: CaseState) {
  const p = state.profile;
  const movers = relocating(p);
  return {
    company: {
      name: p.company,
      description: p.description,
      website: p.website,
      home_base: p.homeBase,
      stage: p.stage,
    },
    team: { relocating_count: movers.length, roles: movers.map((m) => m.role) },
  };
}

export function runFitChecks(state: CaseState): Promise<BatchResult> {
  return runBatch(FIT_CHECKS, fitState(state));
}

export function runBankChecks(state: CaseState, sections: { title: string; body: string }[]): Promise<BatchResult> {
  const p = state.profile;
  return runBatch(BANK_CHECKS, {
    bank_file: sections.map((s) => ({ title: s.title, body: s.body })),
    facts: {
      fundingSource: p.fundingSource,
      parentEntity: p.parentEntity,
      ownership: p.ownership,
      monthlyVolumeUsd: p.monthlyVolumeUsd,
      transactionCountries: p.transactionCountries,
      description: p.description,
    },
  });
}

/** One TypeSafe batch: is each claim supported by what the founder actually said? Returns p(yes) per key. */
export async function verifyClaims(
  conversation: { role: "user" | "assistant"; content: string }[],
  claims: { key: string; question: string }[],
): Promise<{ p: Record<string, number>; meta: ChecksMeta }> {
  if (!claims.length) return { p: {}, meta: { live: true, latencyMs: 0 } };
  if (!process.env.TYPESAFE_API_KEY?.trim()) return { p: {}, meta: { live: false, error: "setup_required" } };
  const questions: Record<string, NoulQuestion> = Object.fromEntries(claims.map((c, i) => [`c${i}`, noul(c.question)]));
  const state = {
    conversation: conversation.slice(-6).map((m) => ({
      speaker: m.role === "user" ? "Founder" : "Atlas71",
      text: m.content.slice(0, 1500),
    })),
  };
  const started = Date.now();
  try {
    const res = await typesafe().systemOne({ state, questions }, { timeout: 6000, retry: { maxRetries: 1 } });
    const p = Object.fromEntries(claims.map((c, i) => [c.key, Number(res.answers[`c${i}`]?.noul ?? 1)]));
    return { p, meta: { live: true, latencyMs: Date.now() - started, model: res.model } };
  } catch (err) {
    console.error("TypeSafe claim check failed:", err instanceof Error ? err.message : "unknown error");
    return { p: {}, meta: { live: false, error: "unavailable" } };
  }
}
