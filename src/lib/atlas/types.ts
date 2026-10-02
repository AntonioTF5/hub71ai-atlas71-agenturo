// Shared contract between the agent (server), the deterministic engine, and the chat UI.
// Everything here is plain JSON so the case can live in localStorage and travel with each request.

export type RouteId = "adgm_tsl" | "adgm_standard" | "masdar";

export type StepId =
  | "hub71_letter" | "desk" | "incorporation" | "establishment_card" | "tax_registration"
  | "entry_permit" | "medical" | "emirates_id" | "dependant_visa"
  | "bank_file" | "bank_account" | "payments";

export type StepGroup = "Company" | "People" | "Money & tax";

// locked: waiting on another step · ready: can be filed now · needs_input: waiting on the founder
// filed/in_review: submitted to a (simulated) provider · done: issued
export type StepStatus = "locked" | "ready" | "needs_input" | "filed" | "in_review" | "done";

export interface Person { id: string; name: string; role: "founder" | "employee"; nationality?: string | null; relocating: boolean }
export interface Dependant { id: string; name?: string | null; relation: "spouse" | "child"; sponsorId: string }

export interface Profile {
  company: string | null;
  description: string | null;        // what it sells and to whom, in the founder's words
  website: string | null;
  homeBase: string | null;           // e.g. "Bangalore, India"
  stage: string | null;
  fundingUsd: number | null;
  fundingSource: string | null;      // founder-confirmed only, never inferred
  parentEntity: string | null;       // e.g. "Routely Inc., Delaware C-corp"
  ownership: string | null;          // founder-confirmed chain + percentages
  hub71Letter: "none" | "applied" | "have" | null;
  sellsOnshoreUAE: boolean | null;
  monthlyVolumeUsd: number | null;
  transactionCountries: string | null;
  people: Person[];
  dependants: Dependant[];
}

export interface Judgment { key: string; label: string; p: number; verdict: "pass" | "flag" | "review"; note?: string }
export interface ChecksMeta { live: boolean; latencyMs?: number; model?: string; error?: string }
export interface SourceRef { id: string; title: string; url: string }

export interface FitResult {
  route: RouteId | "specialist";
  reasons: string[]; flags: string[]; alternatives: RouteId[];
  judgments: Judgment[]; meta: ChecksMeta;
  checkedAt: string; profileKey: string; // stale when the facts it used change
}

export interface Filing {
  id: string;                 // `${step}` or `${step}:${subjectId}`
  step: StepId; subjectId?: string;
  provider: string; ref: string;
  filedOn: string; etaOn: string;
  status: "filed" | "in_review" | "done"; doneOn?: string;
}

export interface SimEvent { on: string; kind: "filed" | "issued" | "needs_input" | "deadline" | "paid"; text: string; step?: StepId; subjectId?: string }

export interface BankFile { sections: { title: string; body: string }[]; missing: string[]; checks: Judgment[]; meta: ChecksMeta; ready: boolean; profileKey: string }

export interface CaseState {
  v: 1;
  persona: "routely" | "byteforge" | null;
  startDate: string; today: string;   // ISO dates; today is the simulated clock
  profile: Profile;
  fit: FitResult | null;
  route: RouteId | null;
  paid: { on: string; amountAed: number } | null;
  filings: Filing[];
  events: SimEvent[];
  bankFile: BankFile | null;
  inputs: Record<string, string>;     // founder answers that unblock steps, keyed by step or filing id
}

// ---------- Inline cards ----------
export interface RouteCardData {
  recommended: { id: RouteId | "specialist"; name: string; summary: string; licenceAed?: number };
  reasons: string[];
  prerequisites: { label: string; state: "met" | "missing" | "review"; note?: string }[];
  alternatives: { id: RouteId; name: string; why: string; licenceAed: number }[];
  checks: Judgment[]; checksMeta: ChecksMeta; sources: SourceRef[];
}
export interface PlanStep {
  id: string; step: StepId; title: string; who?: string; provider: string; status: StepStatus;
  best: [string, string]; typical: [string, string]; doneOn?: string; feeAed?: number; note?: string; deadline?: string;
}
export interface Milestone { key: "licensed" | "resident" | "banked" | "payments"; label: string; best: string; typical: string; doneOn?: string }
export interface PlanCardData { routeName: string; today: string; milestones: Milestone[]; groups: { label: StepGroup; steps: PlanStep[] }[]; sources: SourceRef[] }
export interface PriceLine { label: string; qty?: number; unitAed?: number; amountAed: number; group: "Atlas" | "Government" | "Provider"; sourceId?: string }
export interface PriceCardData { routeName: string; totalAed: number; lines: PriceLine[]; included: string[]; excluded: string[]; validUntil: string; paid: boolean }
export interface FilingsCardData { items: { provider: string; title: string; who?: string; ref: string; filedOn: string; etaOn: string; status: Filing["status"] }[] }
export interface UpdatesCardData { from: string; to: string; events: SimEvent[]; waitingOn: string[] }
export interface BankFileCardData { bank: string; sections: { title: string; body: string }[]; missing: string[]; checks: Judgment[]; checksMeta: ChecksMeta; ready: boolean }
// Added after the spec (user request, 2 Oct): the "does Abu Dhabi fit your business and life?" comparison.
export type CompareTopic = "taxes" | "opportunities" | "residency" | "work" | "costs";
export interface CompareRow { topic: CompareTopic; label: string; abuDhabi: string; home: string; edge: "abu_dhabi" | "home" | "even"; matters?: boolean; sourceIds: string[] }
export interface CompareCardData {
  homeBase: string; homeLabel: string;   // "Bangalore, India" · "Bangalore"
  verdict: string;                       // one line, written by code from the rows and checks
  rows: CompareRow[];
  firstYear: { label: string; abuDhabiAed: [number, number]; homeAed: [number, number] | null; note?: string }[];
  checks: Judgment[]; checksMeta: ChecksMeta; sources: SourceRef[];
}

export type Card =
  | { kind: "route"; data: RouteCardData }
  | { kind: "plan"; data: PlanCardData }
  | { kind: "price"; data: PriceCardData }
  | { kind: "filings"; data: FilingsCardData }
  | { kind: "updates"; data: UpdatesCardData }
  | { kind: "bank_file"; data: BankFileCardData }
  | { kind: "export"; data: { generatedOn: string } }
  | { kind: "compare"; data: CompareCardData };

// ---------- Chat + stream protocol ----------
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "card"; card: Card }
  | { type: "choices"; options: string[] }
  | { type: "activity"; text: string; done: boolean };

export interface ChatMessage { id: string; role: "user" | "assistant"; parts: MessagePart[]; error?: string }

export type StreamEvent =                  // one JSON object per line from POST /api/agent
  | { t: "text"; d: string }
  | { t: "activity"; d: string; done?: boolean }
  | { t: "card"; card: Card }
  | { t: "choices"; options: string[] }
  | { t: "state"; state: CaseState }
  | { t: "error"; d: string; retryable: boolean }
  | { t: "done" };

export type AgentAction = { type: "advance"; days?: number; untilNextEvent?: boolean } | { type: "pay" } | { type: "export" };
export interface AgentRequest { messages: { role: "user" | "assistant"; content: string }[]; state: CaseState; action?: AgentAction }
