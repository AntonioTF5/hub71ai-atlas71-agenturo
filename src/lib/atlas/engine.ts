// The deterministic Atlas71 engine: route rules, plan dates, the one price, and the filing simulator.
// Pure functions over plain-JSON CaseState, shared by the server tools and the client tracker.
import type {
  CaseState,
  Dependant,
  Filing,
  FilingsCardData,
  FitResult,
  Judgment,
  Milestone,
  Person,
  PlanCardData,
  PlanStep,
  PriceCardData,
  PriceLine,
  Profile,
  RouteCardData,
  RouteId,
  SimEvent,
  StepId,
  StepStatus,
  UpdatesCardData,
} from "./types";
import { EXCLUDED, FEES, GROUPS, INCLUDED, ROUTES, STEPS, sourceRefs } from "./kb.ts";
import { addDays, addMonths, aed, fmtDate, fmtDateLong, fmtDay, isIsoDate, maxDate } from "./format.ts";
import { emptyCase } from "./personas.ts";

// ---------- small helpers ----------

/** FNV-1a 32-bit: a stable, dependency-free hash for keys and sandbox reference numbers. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function digits(seed: string, n: number): string {
  let s = "";
  for (let i = 0; s.length < n; i++) s += String(hash(`${seed}#${i}`)).padStart(10, "0");
  return s.slice(0, n);
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "x"
  );
}

const clone = <T>(v: T): T => structuredClone(v);

export function isRoute(route: CaseState["route"] | FitResult["route"] | undefined): route is RouteId {
  return route === "adgm_tsl" || route === "adgm_standard" || route === "masdar";
}

export function relocating(profile: Profile): Person[] {
  return profile.people.filter((p) => p.relocating);
}

export function deskCount(profile: Profile): number {
  return Math.max(1, Math.ceil(relocating(profile).length / 3));
}

export function dayNumber(state: CaseState): number {
  return Math.round((Date.parse(`${state.today}T00:00:00Z`) - Date.parse(`${state.startDate}T00:00:00Z`)) / 86_400_000);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function dependantLabel(profile: Profile, d: Dependant): string {
  if (d.name) return `${d.name} (${d.relation})`;
  const sponsor = profile.people.find((p) => p.id === d.sponsorId);
  const rel = d.relation === "spouse" ? "Spouse" : "Child";
  return sponsor ? `${rel} of ${firstName(sponsor.name)}` : rel;
}

/** "Meera Iyer", "Rohan (spouse)", or undefined for company-level steps. */
export function whoFor(profile: Profile, step: StepId, subjectId?: string): string | undefined {
  if (!subjectId) return undefined;
  if (STEPS[step].scope === "dependant") {
    const d = profile.dependants.find((x) => x.id === subjectId);
    return d ? dependantLabel(profile, d) : undefined;
  }
  return profile.people.find((p) => p.id === subjectId)?.name;
}

export function providerFor(route: RouteId, step: StepId): string {
  const info = STEPS[step];
  return route === "masdar" && info.masdarProvider ? info.masdarProvider : info.provider;
}

// ---------- facts and keys ----------

/** A stable hash of the facts a check depends on. When it changes, the stored result is stale. */
export function profileKey(profile: Profile, scope: "fit" | "bank" = "fit"): string {
  const p = profile;
  const team = relocating(p)
    .map((x) => `${x.name}:${x.role}`)
    .sort()
    .join(",");
  const facts =
    scope === "fit"
      ? [p.company, p.description, p.website, p.homeBase, p.stage, team, p.hub71Letter, p.parentEntity, p.sellsOnshoreUAE]
      : [p.company, p.description, p.fundingUsd, p.fundingSource, p.parentEntity, p.ownership, p.monthlyVolumeUsd, p.transactionCountries];
  return hash(JSON.stringify(facts)).toString(36);
}

/** Key of the exact inputs the TypeSafe fit batch sees, so unchanged judgments can be reused. */
export function fitInputKey(profile: Profile): string {
  const p = profile;
  return hash(
    JSON.stringify([p.company, p.description, p.website, p.homeBase, p.stage, relocating(p).map((x) => x.role).sort()]),
  ).toString(36);
}

export function isFitStale(state: CaseState): boolean {
  return !!state.fit && state.fit.profileKey !== profileKey(state.profile, "fit");
}

export function isBankFileStale(state: CaseState): boolean {
  return !!state.bankFile && state.bankFile.profileKey !== profileKey(state.profile, "bank");
}

export const FACT_LABELS: Record<string, string> = {
  company: "the company name",
  description: "what the company sells and to whom",
  homeBase: "where the company and founders are based today",
  people: "who is moving to Abu Dhabi",
  relocating: "who is moving to Abu Dhabi",
  dependants: "whether any family members are moving too",
  hub71Letter: "whether they have a Hub71 eligibility letter",
  fundingSource: "where the company's money came from (who invested, how much, how)",
  ownership: "the ownership chain from the UAE company up to the people, with percentages",
  monthlyVolumeUsd: "expected monthly payment volume",
  transactionCountries: "the countries money will come from and go to",
};

/** What to ask next, in order. `route` facts come before check_route, `bank` facts before the bank file. */
export function missingFacts(state: CaseState): { route: string[]; bank: string[] } {
  const p = state.profile;
  const route: string[] = [];
  if (!p.company) route.push("company");
  if (!p.description) route.push("description");
  if (!p.homeBase) route.push("homeBase");
  if (!p.people.length) route.push("people");
  for (const person of p.people) {
    if (state.inputs[`relocating:${person.id}`] === "unconfirmed") route.push(`relocating:${person.name}`);
  }
  if (p.people.length && !p.people.some((x) => x.relocating)) route.push("relocating");
  if (!p.dependants.length && !state.inputs.dependants) route.push("dependants");
  if (!p.hub71Letter) route.push("hub71Letter");
  const bank: string[] = [];
  if (!p.fundingSource) bank.push("fundingSource");
  if (!p.ownership) bank.push("ownership");
  if (p.monthlyVolumeUsd == null) bank.push("monthlyVolumeUsd");
  if (!p.transactionCountries) bank.push("transactionCountries");
  return { route, bank };
}

export function describeFact(key: string): string {
  if (key.startsWith("relocating:")) return `whether ${key.slice("relocating:".length)} is relocating too`;
  return FACT_LABELS[key] ?? key;
}

// ---------- route rules ----------

/** Verdict for a TypeSafe probability. Good questions pass high; bad questions are the mirror image. */
export function verdictFor(p: number, polarity: "good" | "bad"): Judgment["verdict"] {
  const yes = polarity === "good" ? p : 1 - p;
  if (yes >= 0.65) return "pass";
  if (yes <= 0.35) return "flag";
  return "review";
}

export function decideRoute(
  judgments: Judgment[],
  profile: Profile,
): Pick<FitResult, "route" | "reasons" | "flags" | "alternatives"> {
  const v = (key: string) => judgments.find((j) => j.key === key)?.verdict;
  const reasons: string[] = [];
  const flags: string[] = [];
  let route: FitResult["route"];
  let alternatives: RouteId[];

  if (v("regulated_finance") === "flag") {
    route = "specialist";
    alternatives = [];
    reasons.push(
      "The activity looks like regulated finance (payments, lending, investment, insurance or crypto). That needs an FSRA or Central Bank licence, which is outside this demo, so a specialist takes it from here.",
    );
  } else if (v("service_provider") === "flag" || v("tech_product") === "flag" || v("excluded_sector") === "flag") {
    route = "adgm_standard";
    alternatives = ["masdar"];
    if (v("service_provider") === "flag" || v("tech_product") === "flag") {
      reasons.push("The startup licence isn't for technology service providers [source:adgm-tsl].");
    }
    if (v("excluded_sector") === "flag") {
      reasons.push("The startup licence is for technology companies, and this sector sits outside it [source:adgm-tsl].");
    }
    reasons.push("A standard ADGM non-financial licence covers the activity, under English common law [source:adgm-fees].");
    reasons.push("Masdar City Free Zone is the cheaper alternative, with a flexi desk included [source:masdar].");
  } else {
    route = "adgm_tsl";
    alternatives = ["adgm_standard", "masdar"];
    reasons.push("You sell your own technology product, which is what the Tech Startup Licence is for [source:adgm-tsl].");
    reasons.push(
      `It's the lowest ADGM licence fee, ${aed(ROUTES.adgm_tsl.licenceAed)} in year one, and it's incentivised for up to 3 years [source:adgm-fees].`,
    );
    reasons.push("You stay under English common law, with 3 visas for each dedicated desk [source:adgm-tsl].");
  }

  if (judgments.some((j) => j.verdict === "review")) flags.push("A specialist confirms this before filing.");
  if (profile.sellsOnshoreUAE) {
    flags.push("Selling to mainland customers may need an ADRA dual licence, depending on the activity [source:adra-dual].");
  }
  return { route, reasons, flags, alternatives };
}

function alternativeWhy(state: CaseState, chosen: RouteId, alt: RouteId): string {
  const p = state.profile;
  const n = relocating(p).length;
  const desks = deskCount(p);
  const deskCost = desks * FEES.desk;
  if (alt === "adgm_standard") {
    return "The fallback if the Hub71 letter doesn't come through: any non-financial activity, the same desk rule, a higher licence fee.";
  }
  if (alt === "masdar") {
    const chosenSetup = ROUTES[chosen].licenceAed + (ROUTES[chosen].deskAed ? deskCost : 0);
    const diff = chosenSetup - ROUTES.masdar.licenceAed;
    const visas =
      n > 2
        ? `2 visas included; moving ${n} people needs a bigger package, quoted by the free zone`
        : "2 visas included, with visa fees quoted by the free zone";
    const saving = diff > 0 ? `${aed(diff)} less on licence and ${desks > 1 ? "desks" : "desk"}, with a flexi desk included. ` : "";
    return `${saving}${visas}. UAE civil law instead of common law.`;
  }
  return ROUTES[alt].summary;
}

export function routeCard(state: CaseState, fit: FitResult): RouteCardData {
  const p = state.profile;
  const live = fit.meta.live;
  const recommended: RouteCardData["recommended"] = !live
    ? {
        id: "specialist",
        name: "Route check paused",
        summary: "The AI eligibility check didn't answer, so Atlas71 hasn't picked a route yet.",
      }
    : fit.route === "specialist"
      ? {
          id: "specialist",
          name: "Specialist review",
          summary:
            "Regulated financial activity needs an FSRA or Central Bank licence. A licensing specialist reviews the case before anything is filed.",
        }
      : {
          id: fit.route,
          name: ROUTES[fit.route].name,
          summary: ROUTES[fit.route].summary,
          licenceAed: ROUTES[fit.route].licenceAed,
        };

  const prerequisites: RouteCardData["prerequisites"] = [];
  const route = live && isRoute(fit.route) ? fit.route : null;
  if (route === "adgm_tsl") {
    prerequisites.push(
      p.hub71Letter === "have"
        ? { label: "Hub71 eligibility letter", state: "met", note: "You have it; Atlas71 attaches it to the ADGM file." }
        : p.hub71Letter === "applied"
          ? { label: "Hub71 eligibility letter", state: "review", note: "You've applied; Atlas71 tracks it." }
          : { label: "Hub71 eligibility letter", state: "missing", note: "Atlas71 files it [source:hub71-tsl]." },
    );
  }
  if (route === "adgm_tsl" || route === "adgm_standard") {
    const desks = deskCount(p);
    prerequisites.push({
      label: desks > 1 ? `${desks} dedicated desks` : "Dedicated desk",
      state: "missing",
      note: `Required: ${aed(FEES.desk)} a year each, 3 visas per desk; hot desks don't count. Atlas71 books it [source:adgm-faq].`,
    });
  }
  if (route === "masdar") {
    prerequisites.push({ label: "Flexi desk", state: "met", note: "Included in the package [source:masdar]." });
  }
  if (route && p.parentEntity) {
    prerequisites.push({
      label: "Ownership review",
      state: "review",
      note: "ADGM and the bank need the parent's certificate of incorporation and shareholder register.",
    });
  }
  if (route && p.sellsOnshoreUAE) {
    prerequisites.push({
      label: "Mainland sales",
      state: "review",
      note: "An ADRA dual licence may be needed, depending on the activity [source:adra-dual].",
    });
  }

  const alternatives: RouteCardData["alternatives"] =
    route
      ? fit.alternatives.map((alt) => ({
          id: alt,
          name: ROUTES[alt].name,
          why: alternativeWhy(state, route, alt),
          licenceAed: ROUTES[alt].licenceAed,
        }))
      : [];

  const sourceIds = route
    ? [
        ...ROUTES[route].sources,
        ...(route === "adgm_tsl" ? ["hub71-tsl"] : []),
        ...(route !== "masdar" ? ["adgm-faq"] : []),
        ...fit.alternatives.flatMap((a) => ROUTES[a].sources),
        ...(p.sellsOnshoreUAE ? ["adra-dual"] : []),
      ]
    : [];

  return {
    recommended,
    reasons: live ? fit.reasons : [],
    prerequisites,
    alternatives,
    checks: fit.judgments,
    checksMeta: fit.meta,
    sources: sourceRefs(sourceIds),
  };
}

// ---------- plan ----------

export interface StepInstance {
  id: string;
  step: StepId;
  subjectId?: string;
  deps: string[];
}

export function stepInstances(state: CaseState, route: RouteId): StepInstance[] {
  const p = state.profile;
  const out: StepInstance[] = [];
  const add = (step: StepId, deps: string[], subjectId?: string) => {
    const id = subjectId ? `${step}:${subjectId}` : step;
    out.push({ id, step, subjectId, deps });
    return id;
  };
  const adgm = route !== "masdar";
  const incDeps: string[] = [];
  if (route === "adgm_tsl" && p.hub71Letter !== "have") incDeps.push(add("hub71_letter", []));
  if (adgm) incDeps.push(add("desk", []));
  const inc = add("incorporation", incDeps);
  const est = add("establishment_card", [inc]);
  add("tax_registration", [inc]);

  const movers = relocating(p);
  const eid: Record<string, string> = {};
  for (const person of movers) {
    const ep = add("entry_permit", [est], person.id);
    const med = add("medical", [ep], person.id);
    eid[person.id] = add("emirates_id", [med], person.id);
  }
  for (const d of p.dependants) {
    const sponsor = eid[d.sponsorId] ? d.sponsorId : movers[0]?.id;
    add("dependant_visa", sponsor ? [eid[sponsor]] : [inc], d.id);
  }
  const bankFile = add("bank_file", [inc]);
  const signatory = movers.find((m) => m.role === "founder") ?? movers[0];
  const bank = add("bank_account", signatory ? [bankFile, eid[signatory.id]] : [bankFile]);
  add("payments", [bank]);
  return out;
}

function bankFactsMissing(profile: Profile): boolean {
  return (
    !profile.fundingSource || !profile.ownership || profile.monthlyVolumeUsd == null || !profile.transactionCountries
  );
}

function inputMissing(state: CaseState, inst: StepInstance): boolean {
  switch (inst.step) {
    case "medical":
      return !state.inputs[`medical:${inst.subjectId}`];
    case "dependant_visa":
      return !state.inputs[`documents:${inst.subjectId}`];
    case "bank_file":
      return (
        bankFactsMissing(state.profile) ||
        (!!state.bankFile && !state.bankFile.ready && !isBankFileStale(state))
      );
    default:
      return false;
  }
}

export function stepStatuses(state: CaseState, insts: StepInstance[]): Record<string, StepStatus> {
  const filing = new Map(state.filings.map((f) => [f.id, f]));
  const out: Record<string, StepStatus> = {};
  for (const inst of insts) {
    const f = filing.get(inst.id);
    if (f) out[inst.id] = f.status;
    else if (!inst.deps.every((d) => filing.get(d)?.status === "done")) out[inst.id] = "locked";
    else out[inst.id] = inputMissing(state, inst) ? "needs_input" : "ready";
  }
  return out;
}

function stepFee(state: CaseState, route: RouteId, inst: StepInstance): number | undefined {
  const full = ROUTES[route].fullyPriced;
  switch (inst.step) {
    case "desk":
      return deskCount(state.profile) * FEES.desk;
    case "incorporation":
      return ROUTES[route].licenceAed;
    case "establishment_card":
      return full ? FEES.establishmentCard : undefined;
    case "entry_permit":
      return full ? FEES.visa : undefined;
    case "medical":
      return full ? FEES.medical : undefined;
    case "emirates_id":
      return full ? FEES.emiratesId : undefined;
    case "dependant_visa": {
      if (!full) return undefined;
      const d = state.profile.dependants.find((x) => x.id === inst.subjectId);
      return d?.relation === "child"
        ? FEES.dependantVisaChild + FEES.dependantExtrasChild
        : FEES.dependantVisaAdult + FEES.dependantExtrasAdult;
    }
    default:
      return undefined;
  }
}

function taxDeadline(state: CaseState): string | undefined {
  const inc = state.filings.find((f) => f.step === "incorporation" && f.status === "done");
  return inc?.doneOn ? addMonths(inc.doneOn, 3) : undefined;
}

function stepNote(state: CaseState, route: RouteId, inst: StepInstance, status: StepStatus): string | undefined {
  const p = state.profile;
  const base = STEPS[inst.step].note;
  switch (inst.step) {
    case "hub71_letter":
      return p.hub71Letter === "applied" ? "You've applied; Atlas71 tracks it." : base;
    case "desk": {
      const n = relocating(p).length;
      const desks = deskCount(p);
      return `${desks} ${desks > 1 ? "desks" : "desk"} for ${n} ${n === 1 ? "visa" : "visas"} (3 per desk). ${base}`;
    }
    case "medical":
      return status === "needs_input"
        ? "Pick a test slot."
        : state.inputs[`medical:${inst.subjectId}`]
          ? `Slot: ${state.inputs[`medical:${inst.subjectId}`]}`
          : undefined;
    case "dependant_visa":
      return state.inputs[`documents:${inst.subjectId}`] ? "Documents received." : base;
    case "bank_file": {
      if (status === "done") return "Prepared for bank review.";
      const missing = missingFacts(state).bank.map((k) => FACT_LABELS[k]);
      if (missing.length) return `Needs ${missing.join("; ")}.`;
      if (state.bankFile && !state.bankFile.ready && !isBankFileStale(state)) return "Fix the flagged items, then Atlas71 re-checks.";
      return base;
    }
    case "incorporation":
      return route === "masdar" ? undefined : "Within 10 business days of a complete file.";
    default:
      return base;
  }
}

interface Window {
  best: [string, string];
  typical: [string, string];
}

export function buildPlan(state: CaseState): PlanCardData | null {
  const route = state.route;
  if (!isRoute(route)) return null;
  const insts = stepInstances(state, route);
  const status = stepStatuses(state, insts);
  const filing = new Map(state.filings.map((f) => [f.id, f]));
  const win: Record<string, Window> = {};
  const today = state.today;

  for (const inst of insts) {
    const [bestDays, typicalDays] = STEPS[inst.step].days;
    const f = filing.get(inst.id);
    if (f?.status === "done" && f.doneOn) {
      win[inst.id] = { best: [f.filedOn, f.doneOn], typical: [f.filedOn, f.doneOn] };
    } else if (f) {
      const bestEnd = maxDate(addDays(f.filedOn, bestDays), today);
      const typicalEnd = maxDate(addDays(f.filedOn, typicalDays), bestEnd);
      win[inst.id] = { best: [f.filedOn, bestEnd], typical: [f.filedOn, typicalEnd] };
    } else {
      const bestStart = maxDate(today, ...inst.deps.map((d) => win[d]?.best[1]));
      const typicalStart = maxDate(today, ...inst.deps.map((d) => win[d]?.typical[1]));
      win[inst.id] = {
        best: [bestStart, addDays(bestStart, bestDays)],
        typical: [typicalStart, addDays(typicalStart, typicalDays)],
      };
    }
  }

  const deadline = taxDeadline(state);
  const toStep = (inst: StepInstance): PlanStep => {
    const f = filing.get(inst.id);
    const st = status[inst.id];
    return {
      id: inst.id,
      step: inst.step,
      title: STEPS[inst.step].title,
      who: whoFor(state.profile, inst.step, inst.subjectId),
      provider: providerFor(route, inst.step),
      status: st,
      best: win[inst.id].best,
      typical: win[inst.id].typical,
      doneOn: f?.status === "done" ? f.doneOn : undefined,
      feeAed: stepFee(state, route, inst),
      note: stepNote(state, route, inst, st),
      deadline: inst.step === "tax_registration" ? deadline : undefined,
    };
  };

  const steps = insts.map(toStep);
  const byId = new Map(steps.map((s) => [s.id, s]));
  const groups: PlanCardData["groups"] = GROUPS.map((g) => ({
    label: g.label,
    steps: steps.filter((s) => STEPS[s.step].group === g.label),
  })).filter((g) => g.steps.length);

  const milestone = (key: Milestone["key"], label: string, ids: string[]): Milestone => {
    const parts = ids.map((id) => byId.get(id)).filter((s): s is PlanStep => !!s);
    if (!parts.length) return { key, label, best: "", typical: "" };
    const allDone = parts.every((s) => s.doneOn);
    return {
      key,
      label,
      best: maxDate(...parts.map((s) => s.best[1])),
      typical: maxDate(...parts.map((s) => s.typical[1])),
      doneOn: allDone ? maxDate(...parts.map((s) => s.doneOn)) : undefined,
    };
  };
  const movers = relocating(state.profile);
  const milestones: Milestone[] = [
    milestone("licensed", "Licensed", ["incorporation"]),
    milestone("resident", "Resident", movers.map((m) => `emirates_id:${m.id}`)),
    milestone("banked", "Banked", ["bank_account"]),
    milestone("payments", "Payments live", ["payments"]),
  ];

  const sourceIds = [...ROUTES[route].sources, ...insts.flatMap((i) => STEPS[i.step].sources)];
  return { routeName: ROUTES[route].name, today, milestones, groups, sources: sourceRefs(sourceIds) };
}

// ---------- price ----------

export function quote(state: CaseState, routeOverride?: RouteId): PriceCardData | null {
  const route = routeOverride ?? state.route;
  if (!isRoute(route)) return null;
  const r = ROUTES[route];
  const p = state.profile;
  const n = relocating(p).length;
  const adults = p.dependants.filter((d) => d.relation === "spouse").length;
  const kids = p.dependants.filter((d) => d.relation === "child").length;
  const lines: PriceLine[] = [
    { label: "Atlas71 landing fee", amountAed: FEES.atlas, group: "Atlas", sourceId: "atlas-pricing" },
    {
      label: route === "masdar" ? r.licenceLabel : `${r.name}, year one`,
      amountAed: r.licenceAed,
      group: "Government",
      sourceId: route === "masdar" ? "masdar" : "adgm-fees",
    },
  ];
  if (r.fullyPriced) {
    lines.push({
      label: "Establishment card + e-Channels",
      amountAed: FEES.establishmentCard,
      group: "Government",
      sourceId: "adgm-gs-fees",
    });
    if (n) {
      lines.push(
        { label: "Employment visa (2 years)", qty: n, unitAed: FEES.visa, amountAed: n * FEES.visa, group: "Government", sourceId: "adgm-gs-fees" },
        {
          label: "Medical test + Emirates ID",
          qty: n,
          unitAed: FEES.medical + FEES.emiratesId,
          amountAed: n * (FEES.medical + FEES.emiratesId),
          group: "Government",
          sourceId: "seha-medical",
        },
      );
    }
    const adultUnit = FEES.dependantVisaAdult + FEES.dependantExtrasAdult;
    const childUnit = FEES.dependantVisaChild + FEES.dependantExtrasChild;
    if (adults) {
      lines.push({ label: "Dependant visa + medical + Emirates ID · adult", qty: adults, unitAed: adultUnit, amountAed: adults * adultUnit, group: "Government", sourceId: "adgm-gs-fees" });
    }
    if (kids) {
      lines.push({ label: "Dependant visa + medical + Emirates ID · child", qty: kids, unitAed: childUnit, amountAed: kids * childUnit, group: "Government", sourceId: "adgm-gs-fees" });
    }
    const desks = deskCount(p);
    lines.push({ label: "Dedicated desk, 12 months", qty: desks, unitAed: FEES.desk, amountAed: desks * FEES.desk, group: "Provider", sourceId: "desk-price" });
  }
  const total = lines.reduce((sum, l) => sum + l.amountAed, 0);
  const paid = !!state.paid && (routeOverride === undefined || routeOverride === state.route);
  return {
    routeName: r.name,
    totalAed: paid && state.paid ? state.paid.amountAed : total,
    lines,
    included: [...INCLUDED],
    excluded: r.fullyPriced
      ? [...EXCLUDED]
      : ["Establishment card, visas, medicals and Emirates IDs (quoted by the free zone)", ...EXCLUDED],
    validUntil: addDays(state.today, 30),
    paid,
  };
}

/** True when the route isn't fully priced (Masdar): show "from", hide Confirm & pay. */
export function priceIsPartial(card: PriceCardData): boolean {
  const route = Object.values(ROUTES).find((r) => r.name === card.routeName);
  return route ? !route.fullyPriced : false;
}

// ---------- simulator ----------

function refFor(state: CaseState, route: RouteId, inst: StepInstance, filedOn: string): string {
  const seed = `${state.profile.company ?? "company"}|${inst.id}`;
  const year = filedOn.slice(0, 4);
  const yy = year.slice(2);
  const masdar = route === "masdar";
  switch (inst.step) {
    case "hub71_letter":
      return `H71-EL-${yy}-${digits(seed, 5)}`;
    case "desk":
      return `CWK-${yy}-${digits(seed, 5)}`;
    case "incorporation":
      return masdar ? `MCFZ-LIC-${year}-${digits(seed, 5)}` : `ADGM-RA-${year}-${digits(seed, 5)}`;
    case "establishment_card":
      return masdar ? `MCFZ-EC-${digits(seed, 6)}` : `ADGM-GS-EC-${digits(seed, 6)}`;
    case "tax_registration":
      return `FTA-TRN-100${digits(seed, 12)}`;
    case "entry_permit":
      return `ICP-EP-${year}-${digits(seed, 7)}`;
    case "medical":
      return `SEHA-MF-${digits(seed, 6)}`;
    case "emirates_id":
      return `ICP-EID-${digits(seed, 7)}`;
    case "dependant_visa":
      return `ICP-DV-${year}-${digits(seed, 7)}`;
    case "bank_file":
      return `A71-BF-${digits(seed, 5)}`;
    case "bank_account":
      return `WIO-BA-${digits(seed, 8)}`;
    case "payments":
      return `STRIPE-AE-${digits(seed, 8)}`;
  }
}

function withWho(text: string, who?: string): string {
  return who ? `${text} for ${who}` : text;
}

function filedText(state: CaseState, f: Filing): string {
  const who = whoFor(state.profile, f.step, f.subjectId);
  const forWho = who ? ` for ${who}` : "";
  const what: Record<StepId, string> = {
    hub71_letter: "Applied for the Hub71 eligibility letter",
    desk: "Reserved the dedicated desk",
    incorporation: "Filed incorporation and the commercial licence",
    establishment_card: "Filed the establishment card and e-Channels",
    tax_registration: "Filed corporate tax registration",
    entry_permit: `Filed the entry and work permit${forWho}`,
    medical: `Booked the medical fitness test${forWho}`,
    emirates_id: `Filed biometrics, Emirates ID and residence visa${forWho}`,
    dependant_visa: `Filed the dependant residence visa${forWho}`,
    bank_file: "Prepared the bank file",
    bank_account: "Applied for the business bank account",
    payments: "Applied for payments",
  };
  return `${what[f.step]} with ${f.provider} (${f.ref}), ETA ${fmtDate(f.etaOn)}`;
}

function issuedText(state: CaseState, f: Filing): string {
  const p = state.profile;
  const who = whoFor(p, f.step, f.subjectId);
  switch (f.step) {
    case "hub71_letter":
      return "Hub71 eligibility letter issued";
    case "desk":
      return `Dedicated desk lease signed (${deskCount(p)} ${deskCount(p) > 1 ? "desks" : "desk"})`;
    case "incorporation":
      return `Licence issued: ${p.company ?? "the company"} is incorporated with ${f.provider}`;
    case "establishment_card":
      return "Establishment card and e-Channels account active";
    case "tax_registration":
      return `Corporate tax registration done (${f.ref.replace("FTA-", "")})`;
    case "entry_permit":
      return withWho("Entry permit and work permit issued", who);
    case "medical":
      return withWho("Medical fitness test cleared", who);
    case "emirates_id":
      return withWho("Emirates ID and residence visa issued", who);
    case "dependant_visa":
      return withWho("Dependant residence visa issued", who);
    case "bank_file":
      return "Bank file prepared for bank review";
    case "bank_account":
      return "Wio Business account open";
    case "payments":
      return "Stripe account live: payments enabled";
  }
}

function needsInputText(state: CaseState, inst: StepInstance): string {
  const who = whoFor(state.profile, inst.step, inst.subjectId);
  switch (inst.step) {
    case "medical":
      return withWho("Choose a medical test slot", who);
    case "dependant_visa": {
      const d = state.profile.dependants.find((x) => x.id === inst.subjectId);
      return `${d?.relation === "child" ? "Legalised birth certificate" : "Legalised marriage certificate"} needed for ${who ?? "the dependant visa"}`;
    }
    case "bank_file": {
      const missing = missingFacts(state).bank.map((k) => FACT_LABELS[k]);
      return missing.length
        ? `Bank file: confirm ${missing.join("; ")}`
        : "Bank file: fix the flagged items so Atlas71 can re-check it";
    }
    default:
      return withWho(`${STEPS[inst.step].title} needs your input`, who);
  }
}

export interface SimResult {
  state: CaseState;
  filed: Filing[];
  events: SimEvent[];
}

/** File every ready step that needs no input; note steps blocked on the founder once. Only after payment. */
export function fileReady(input: CaseState): SimResult {
  const route = input.route;
  if (!input.paid || !isRoute(route)) return { state: input, filed: [], events: [] };
  const state = clone(input);
  const insts = stepInstances(state, route);
  const status = stepStatuses(state, insts);
  const filed: Filing[] = [];
  const events: SimEvent[] = [];
  for (const inst of insts) {
    const st = status[inst.id];
    if (st === "ready" && inst.step !== "bank_file") {
      const f: Filing = {
        id: inst.id,
        step: inst.step,
        subjectId: inst.subjectId,
        provider: providerFor(route, inst.step),
        ref: refFor(state, route, inst, state.today),
        filedOn: state.today,
        etaOn: addDays(state.today, STEPS[inst.step].sim),
        status: "filed",
      };
      state.filings.push(f);
      filed.push(f);
      events.push({ on: state.today, kind: "filed", text: filedText(state, f), step: f.step, subjectId: f.subjectId });
    } else if (st === "needs_input") {
      const seen = state.events.some((e) => e.kind === "needs_input" && e.step === inst.step && e.subjectId === inst.subjectId);
      if (!seen) {
        events.push({ on: state.today, kind: "needs_input", text: needsInputText(state, inst), step: inst.step, subjectId: inst.subjectId });
      }
    }
  }
  const deadline = taxDeadline(state);
  if (deadline && !state.events.some((e) => e.kind === "deadline" && e.step === "tax_registration")) {
    events.push({
      on: state.today,
      kind: "deadline",
      text: `Corporate tax registration is due by ${fmtDateLong(deadline)}, 3 months from incorporation; late registration costs ${aed(FEES.latePenalty)} [source:fta-ct]`,
      step: "tax_registration",
    });
  }
  state.events.push(...events);
  return { state, filed, events };
}

export function startLanding(input: CaseState): SimResult & { error?: string } {
  if (input.paid) return { state: input, filed: [], events: [], error: "Already paid; the price is locked." };
  const q = quote(input);
  if (!q) return { state: input, filed: [], events: [], error: "No route chosen yet, so there's nothing to pay for." };
  if (priceIsPartial(q)) {
    return { state: input, filed: [], events: [], error: "This route needs a provider quote for visas before payment." };
  }
  const state = clone(input);
  state.paid = { on: state.today, amountAed: q.totalAed };
  const paidEvent: SimEvent = { on: state.today, kind: "paid", text: `Paid ${aed(q.totalAed)}; the price is locked` };
  state.events.push(paidEvent);
  const r = fileReady(state);
  return { state: r.state, filed: r.filed, events: [paidEvent, ...r.events] };
}

export function advance(
  input: CaseState,
  opts: { days?: number; untilNextEvent?: boolean },
): SimResult & { from: string; to: string; error?: string } {
  const from = input.today;
  if (!input.paid) {
    return { state: input, filed: [], events: [], from, to: from, error: "Nothing is filed yet: the founder confirms and pays on the price card first." };
  }
  const pending = (s: CaseState) => s.filings.some((f) => f.status !== "done");
  if (opts.untilNextEvent && !pending(input)) {
    return { state: input, filed: [], events: [], from, to: from, error: "Nothing is in flight right now; every open step is waiting on the founder." };
  }
  let state = clone(input);
  const events: SimEvent[] = [];
  const filed: Filing[] = [];
  const limit = opts.untilNextEvent ? 60 : Math.min(90, Math.max(1, Math.round(opts.days ?? 7)));
  for (let i = 0; i < limit; i++) {
    state.today = addDays(state.today, 1);
    let issued = false;
    for (const f of state.filings) {
      if (f.status !== "done" && f.etaOn <= state.today) {
        f.status = "done";
        f.doneOn = state.today;
        issued = true;
        const ev: SimEvent = { on: state.today, kind: "issued", text: issuedText(state, f), step: f.step, subjectId: f.subjectId };
        state.events.push(ev);
        events.push(ev);
      } else if (f.status === "filed" && f.filedOn < state.today) {
        f.status = "in_review";
      }
    }
    const r = fileReady(state);
    state = r.state;
    events.push(...r.events);
    filed.push(...r.filed);
    if (opts.untilNextEvent && issued) break;
    if (opts.untilNextEvent && !pending(state)) break;
  }
  return { state, filed, events, from, to: state.today };
}

/** The next working day after `iso` (the UAE weekend is Saturday and Sunday). */
function nextWorkday(iso: string): string {
  let d = addDays(iso, 1);
  while ([0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay())) d = addDays(d, 1);
  return d;
}

export function medicalSlots(state: CaseState): string[] {
  const d1 = nextWorkday(state.today);
  const d2 = nextWorkday(d1);
  return [`${fmtDay(d1)}, 09:00 · SEHA Al Bateen`, `${fmtDay(d1)}, 14:30 · SEHA Mussafah`, `${fmtDay(d2)}, 10:00 · SEHA Khalifa City`];
}

/** Resolve `medical:<personId>` / `documents:<dependantId>`, also accepting a name instead of the id. */
export function resolveInputKey(state: CaseState, key: string): string | null {
  const m = /^(medical|documents):(.+)$/.exec(key.trim());
  if (!m) return null;
  const [, kind, ref] = m;
  const want = ref.trim().toLowerCase();
  if (kind === "medical") {
    const person =
      state.profile.people.find((p) => p.id === ref) ??
      state.profile.people.find((p) => p.name.toLowerCase() === want || firstName(p.name).toLowerCase() === want || p.id === `p-${slug(ref)}`);
    return person && person.relocating ? `medical:${person.id}` : null;
  }
  const d =
    state.profile.dependants.find((x) => x.id === ref) ??
    state.profile.dependants.find(
      (x) => (x.name && (x.name.toLowerCase() === want || firstName(x.name).toLowerCase() === want)) || x.relation === want,
    );
  return d ? `documents:${d.id}` : null;
}

export function provideInput(input: CaseState, key: string, value: string): SimResult & { key?: string; error?: string } {
  const resolved = resolveInputKey(input, key);
  if (!resolved) return { state: input, filed: [], events: [], error: `Unknown input key "${key}". Use medical:<personId> or documents:<dependantId>.` };
  const v = value.trim().slice(0, 200);
  if (!v) return { state: input, filed: [], events: [], error: "The value is empty." };
  const state = clone(input);
  state.inputs[resolved] = v;
  const r = fileReady(state);
  return { ...r, key: resolved };
}

/** Mark the bank file step done once the checks pass, then file whatever it unblocked. */
export function completeBankFile(input: CaseState): SimResult {
  const route = input.route;
  if (!isRoute(route) || !input.bankFile?.ready || input.filings.some((f) => f.step === "bank_file")) {
    return fileReady(input);
  }
  const state = clone(input);
  const inst: StepInstance = { id: "bank_file", step: "bank_file", deps: [] };
  const f: Filing = {
    id: "bank_file",
    step: "bank_file",
    provider: providerFor(route, "bank_file"),
    ref: refFor(state, route, inst, state.today),
    filedOn: state.today,
    etaOn: state.today,
    status: "done",
    doneOn: state.today,
  };
  state.filings.push(f);
  const ev: SimEvent = { on: state.today, kind: "issued", text: issuedText(state, f), step: "bank_file" };
  state.events.push(ev);
  const r = fileReady(state);
  return { state: r.state, filed: [f, ...r.filed], events: [ev, ...r.events] };
}

// ---------- what the founder owes ----------

export interface WaitingItem {
  key: string;
  label: string;
  options?: string[];
}

export function waitingItems(state: CaseState): WaitingItem[] {
  const route = state.route;
  if (!isRoute(route)) return [];
  if (!state.paid) {
    const q = quote(state);
    return q && !priceIsPartial(q) ? [{ key: "pay", label: `Confirm and pay ${aed(q.totalAed)} to start filing` }] : [];
  }
  const insts = stepInstances(state, route);
  const status = stepStatuses(state, insts);
  const out: WaitingItem[] = [];
  for (const inst of insts) {
    if (status[inst.id] !== "needs_input") continue;
    if (inst.step === "medical") {
      out.push({ key: `medical:${inst.subjectId}`, label: needsInputText(state, inst), options: medicalSlots(state) });
    } else if (inst.step === "dependant_visa") {
      out.push({ key: `documents:${inst.subjectId}`, label: needsInputText(state, inst), options: ["It's legalised and ready", "Not yet"] });
    } else if (inst.step === "bank_file") {
      out.push({ key: "bank_file", label: needsInputText(state, inst) });
    }
  }
  return out;
}

export function waitingOn(state: CaseState): string[] {
  return waitingItems(state).map((w) => w.label);
}

// ---------- cards ----------

export function filingsCard(state: CaseState, filings: Filing[]): FilingsCardData {
  return {
    items: filings.map((f) => ({
      provider: f.provider,
      title: STEPS[f.step].title,
      who: whoFor(state.profile, f.step, f.subjectId),
      ref: f.ref,
      filedOn: f.filedOn,
      etaOn: f.etaOn,
      status: f.status,
    })),
  };
}

export function updatesCard(state: CaseState, from: string, to: string, events: SimEvent[]): UpdatesCardData {
  return { from, to, events, waitingOn: waitingOn(state) };
}

// ---------- state hygiene ----------

/** Coerce untrusted JSON (a request body or localStorage) into a usable CaseState, or start fresh. */
export function normalizeState(raw: unknown, today: string): CaseState {
  const fresh = emptyCase(today);
  if (!raw || typeof raw !== "object") return fresh;
  const s = raw as Partial<CaseState>;
  if (s.v !== 1 || !isIsoDate(s.startDate) || !isIsoDate(s.today) || !s.profile || typeof s.profile !== "object") return fresh;
  const p = s.profile as Partial<Profile>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 600) : null);
  const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const people: Person[] = Array.isArray(p.people)
    ? p.people
        .filter((x): x is Person => !!x && typeof x.id === "string" && typeof x.name === "string")
        .slice(0, 20)
        .map((x) => ({
          id: x.id,
          name: x.name.slice(0, 80),
          role: x.role === "employee" ? "employee" : "founder",
          nationality: str(x.nationality),
          relocating: x.relocating === true,
        }))
    : [];
  const dependants: Dependant[] = Array.isArray(p.dependants)
    ? p.dependants
        .filter((x): x is Dependant => !!x && typeof x.id === "string" && typeof x.sponsorId === "string")
        .slice(0, 20)
        .map((x) => ({ id: x.id, name: str(x.name), relation: x.relation === "child" ? "child" : "spouse", sponsorId: x.sponsorId }))
    : [];
  const route = isRoute(s.route) ? s.route : null;
  return {
    v: 1,
    persona: s.persona === "routely" || s.persona === "byteforge" ? s.persona : null,
    startDate: s.startDate,
    today: s.today < s.startDate ? s.startDate : s.today,
    profile: {
      company: str(p.company),
      description: str(p.description),
      website: str(p.website),
      homeBase: str(p.homeBase),
      stage: str(p.stage),
      fundingUsd: numOrNull(p.fundingUsd),
      fundingSource: str(p.fundingSource),
      parentEntity: str(p.parentEntity),
      ownership: str(p.ownership),
      hub71Letter: p.hub71Letter === "none" || p.hub71Letter === "applied" || p.hub71Letter === "have" ? p.hub71Letter : null,
      sellsOnshoreUAE: typeof p.sellsOnshoreUAE === "boolean" ? p.sellsOnshoreUAE : null,
      monthlyVolumeUsd: numOrNull(p.monthlyVolumeUsd),
      transactionCountries: str(p.transactionCountries),
      people,
      dependants,
    },
    fit: s.fit && typeof s.fit === "object" && Array.isArray(s.fit.judgments) ? s.fit : null,
    route,
    paid:
      s.paid && typeof s.paid === "object" && isIsoDate(s.paid.on) && typeof s.paid.amountAed === "number" ? s.paid : null,
    filings: Array.isArray(s.filings)
      ? s.filings.filter((f): f is Filing => !!f && typeof f.id === "string" && typeof f.step === "string" && f.step in STEPS && isIsoDate(f.filedOn) && isIsoDate(f.etaOn))
      : [],
    events: Array.isArray(s.events)
      ? s.events.filter((e): e is SimEvent => !!e && isIsoDate(e.on) && typeof e.text === "string").slice(-300)
      : [],
    bankFile: s.bankFile && typeof s.bankFile === "object" && Array.isArray(s.bankFile.sections) ? s.bankFile : null,
    inputs:
      s.inputs && typeof s.inputs === "object"
        ? Object.fromEntries(Object.entries(s.inputs).filter(([, v]) => typeof v === "string").slice(0, 100))
        : {},
  };
}
