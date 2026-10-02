// The system prompt, rebuilt every turn: the soul (identity, voice, knowledge, behaviour, constraints, examples) and the live case summary.
import type { CaseState } from "./types";
import { FEES, ROUTES, SOURCES, STEPS } from "./kb.ts";
import {
  buildPlan,
  dayNumber,
  describeFact,
  documentsReady,
  isBankFileStale,
  isFitStale,
  isRoute,
  missingFacts,
  payChecklist,
  quote,
  readyToPay,
  waitingItems,
} from "./engine.ts";
import { aed, fmtDay } from "./format.ts";
import { SOUL } from "./soul.generated.ts";

function knowledge(): string {
  const sources = Object.values(SOURCES)
    .map((s) => `- [source:${s.id}] (${s.status}) ${s.claim}`)
    .join("\n");
  const routes = Object.values(ROUTES)
    .map(
      (r) =>
        `- ${r.id}: ${r.name}. Licence year one ${aed(r.licenceAed)}. ${r.law}. ${
          r.deskAed ? `Dedicated desk ${aed(r.deskAed)}/year, ${r.visasPerDesk} visas per desk.` : `Flexi desk included, ${r.includedVisas} visas included; visa fees quoted by the free zone.`
        }`,
    )
    .join("\n");
  const steps = Object.values(STEPS)
    .map((s) => `- ${s.title} (${s.provider}): ${s.days[0]}–${s.days[1]} days${s.note ? `. ${s.note}` : ""}`)
    .join("\n");
  return `Knowledge (checked 2 Oct 2026; cite by id)
${sources}

Routes
${routes}

Steps (best–typical calendar days)
${steps}

Other facts
- Dependants are sponsored by a resident. Whether they count toward ADGM's desk visa quota isn't published, so don't claim it either way.
- Atlas71's fee is ${aed(FEES.atlas)} flat per company landing (a pricing hypothesis). Health insurance, housing, school fees, document legalisation, bookkeeping, the bank plan and VAT on Atlas71's fee are not included.
- Hub71's Access programme (AED 250k in kind + AED 250k via SAFE) is separate and selective; never deduct it from a price [source:hub71-access].`;
}

function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length))) as Partial<T>;
}

export function caseSummary(state: CaseState) {
  const p = state.profile;
  const missing = missingFacts(state);
  const plan = buildPlan(state);
  const price = quote(state);
  return compact({
    today: `${state.today} (${fmtDay(state.today)}), day ${dayNumber(state)} of the landing`,
    persona: state.persona,
    profile: compact({
      company: p.company,
      description: p.description,
      website: p.website,
      homeBase: p.homeBase,
      stage: p.stage,
      fundingUsd: p.fundingUsd,
      fundingSource: p.fundingSource,
      parentEntity: p.parentEntity,
      ownership: p.ownership,
      hub71Letter: p.hub71Letter,
      sellsOnshoreUAE: p.sellsOnshoreUAE,
      monthlyVolumeUsd: p.monthlyVolumeUsd,
      transactionCountries: p.transactionCountries,
    }),
    people: p.people.map((x) => ({
      id: x.id,
      name: x.name,
      role: x.role,
      relocating: state.inputs[`relocating:${x.id}`] === "unconfirmed" ? "unknown (ask)" : x.relocating,
    })),
    dependants: p.dependants.map((d) =>
      compact({
        id: d.id,
        name: d.name,
        relation: d.relation,
        sponsorId: d.sponsorId,
        certificate: state.inputs[`documents:${d.id}`] ? (documentsReady(state, d.id) ? "legalised" : "not legalised yet") : undefined,
      }),
    ),
    missingBeforeRoute: missing.route.map(describeFact),
    missingForBankFile: missing.bank.map(describeFact),
    route: state.route ? `${state.route} (${ROUTES[state.route].name})` : null,
    routeCheck: state.fit
      ? compact({
          recommended: state.fit.route,
          flags: state.fit.flags,
          alternatives: state.fit.alternatives,
          stale: isFitStale(state) || undefined,
        })
      : null,
    price: price ? `${aed(price.totalAed)}${price.paid ? " (paid, locked)" : ""}` : null,
    paid: state.paid ? `${aed(state.paid.amountAed)} on ${state.paid.on}` : null,
    // Payment comes last: what the founder still owes before Confirm & pay unlocks, in the order to ask.
    beforePayment:
      !state.paid && isRoute(state.route)
        ? payChecklist(state).map((c) =>
            compact({ key: c.key, item: c.label, status: c.done ? "done" : "needed", detail: c.detail, options: c.done ? undefined : c.options }),
          )
        : null,
    readyToPay: !state.paid && isRoute(state.route) ? readyToPay(state) : null,
    milestones: plan?.milestones.map((m) => `${m.label}: ${m.doneOn ? `done ${m.doneOn}` : m.best ? `best ${m.best}, typical ${m.typical}` : "n/a"}`),
    steps: plan
      ? plan.groups
          .flatMap((g) => g.steps)
          .map((s) => `${s.id}: ${s.status}${s.doneOn ? ` ${s.doneOn}` : ""}`)
      : null,
    waitingOnFounder: state.paid ? waitingItems(state) : null,
    bankFile: state.bankFile
      ? compact({
          ready: state.bankFile.ready,
          notPassing: state.bankFile.checks.filter((c) => c.verdict !== "pass").map((c) => c.label),
          missing: state.bankFile.missing,
          stale: isBankFileStale(state) || undefined,
        })
      : null,
    incorporated: isRoute(state.route) ? state.filings.some((f) => f.step === "incorporation" && f.status === "done") : null,
  });
}

// The static system prompt is the soul (SOUL.md, built by scripts/build-soul.mjs) with the knowledge base slotted in.
export const STATIC_PROMPT = SOUL.replace("{{KNOWLEDGE}}", () => knowledge());

export function casePrompt(state: CaseState): string {
  return `Case right now (JSON)
${JSON.stringify(caseSummary(state))}`;
}

export function buildSystemPrompt(state: CaseState): string {
  return `${STATIC_PROMPT}

${casePrompt(state)}`;
}
