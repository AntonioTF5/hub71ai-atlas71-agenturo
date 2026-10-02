// Agent tools: the schemas the model sees and the executors that run them against the case. Server only.
// Each executor returns a compact JSON string for the model and may emit card, state and activity events.
// Arguments are checked by hand; malformed arguments never mutate state.
import type OpenAI from "openai";
import { AGENT_MODEL, llm, modelParams } from "@/lib/llm";
import type { AgentAction, BankFile, CaseState, Filing, FitResult, StreamEvent } from "./types";
import { ROUTES, STEPS } from "./kb.ts";
import {
  advance,
  buildPlan,
  completeBankFile,
  decideRoute,
  describeFact,
  fileReady,
  filingsCard,
  isBankFileStale,
  isFitStale,
  isRoute,
  missingFacts,
  priceIsPartial,
  profileKey,
  provideInput,
  quote,
  relocating,
  routeCard,
  startLanding,
  updatesCard,
  waitingItems,
  whoFor,
} from "./engine.ts";
import { applyProfile } from "./profile.ts";
import { runBankChecks, runFitChecks } from "./checks.ts";
import { aed, fmtDateLong, fmtSimDay } from "./format.ts";

export interface ToolContext {
  state: CaseState;
  action?: AgentAction;
  emit: (e: StreamEvent) => void;
  /** Text shown since the last card, activity or choices in this response. */
  freshText?: () => string;
  say?: (text: string) => void;
}

type Args = Record<string, unknown>;
type Executor = (args: Args, ctx: ToolContext) => string | Promise<string>;

const ok = (o: unknown) => JSON.stringify(o);
const fail = (error: string) => JSON.stringify({ error });
const ROUTE_IDS = ["adgm_tsl", "adgm_standard", "masdar"];

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) =>
  ({
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
  }) satisfies OpenAI.Chat.ChatCompletionFunctionTool;

export const TOOLS: OpenAI.Chat.ChatCompletionFunctionTool[] = [
  fn(
    "save_profile",
    "Save facts the founder stated. Call it before replying whenever they state something new. Only include fields they actually stated; never guess. Returns what's still missing.",
    {
      company: { type: "string" },
      description: { type: "string", description: "What the company sells and to whom, in the founder's words." },
      website: { type: "string" },
      homeBase: { type: "string", description: 'Where the company is based today, e.g. "Bangalore, India".' },
      stage: { type: "string", description: 'e.g. "Seed".' },
      fundingUsd: { type: "number", description: "Total raised so far, in USD." },
      fundingSource: { type: "string", description: "Only as the founder stated it: who invested, how much, and how (e.g. SAFEs)." },
      parentEntity: { type: "string", description: 'An existing parent company, e.g. "Routely Inc., Delaware C-corp".' },
      ownership: { type: "string", description: "Only as the founder stated it: the chain from the UAE company up to the people, with percentages." },
      hub71Letter: { type: "string", enum: ["none", "applied", "have"], description: "Hub71 eligibility letter status." },
      sellsOnshoreUAE: { type: "boolean", description: "True if they'll sell to customers on the UAE mainland." },
      monthlyVolumeUsd: { type: "number", description: "Expected monthly payment volume, in USD." },
      transactionCountries: { type: "string", description: "Countries money will come from and go to." },
      people: {
        type: "array",
        description:
          "Founders and staff who would hold company visas, upserted by name (send only the people this message is about). Family members go in dependants, never here. Set relocating only when the founder said whether that person moves to Abu Dhabi; omit it when unknown.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string", enum: ["founder", "employee"] },
            nationality: { type: "string" },
            relocating: { type: "boolean" },
            remove: { type: "boolean", description: "True to drop this person from the case." },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
      dependants: {
        type: "array",
        description:
          "Family members moving with someone, upserted by name. Send an empty array when the founder says no family is moving.",
        items: {
          type: "object",
          properties: {
            relation: { type: "string", enum: ["spouse", "child"] },
            sponsorName: { type: "string", description: "The person they move with." },
            name: { type: "string" },
            remove: { type: "boolean" },
          },
          required: ["relation", "sponsorName"],
          additionalProperties: false,
        },
      },
    },
  ),
  fn(
    "check_route",
    "Run the live TypeSafe eligibility checks and pick the licence route. Shows the route card. Call once nothing is missing before the route, and again if the facts it used change.",
  ),
  fn("show_plan", "Show the plan card: every step with best and typical dates, and the four milestones."),
  fn("show_price", "Show the price card: one all-in total with the itemised breakdown and a Confirm & pay button."),
  fn(
    "choose_route",
    "Switch to another eligible route when the founder explicitly picks one of the alternatives on the route card.",
    { route: { type: "string", enum: ROUTE_IDS } },
    ["route"],
  ),
  fn(
    "start_landing",
    "Starts the landing after the founder pressed Confirm & pay. Never call it yourself; the app calls it when they press the button.",
  ),
  fn(
    "advance_time",
    "Move the simulated clock forward and show what happened. Use days for a fixed jump (14 for '2 weeks'), or untilNextEvent to stop at the next issued document.",
    {
      days: { type: "integer", minimum: 1, maximum: 90 },
      untilNextEvent: { type: "boolean" },
    },
  ),
  fn(
    "provide_input",
    "Save a founder answer that unblocks a step and file whatever it unblocks. Keys: medical:<personId> (value: the chosen slot), documents:<dependantId> (value: what they confirmed). Bank facts go through save_profile.",
    { key: { type: "string" }, value: { type: "string" } },
    ["key", "value"],
  ),
  fn(
    "prepare_bank_file",
    "Draft the bank file from confirmed facts only, then run the TypeSafe bank checks. If it passes, the file is prepared for bank review and the bank application files when it can. Call after incorporation, and again after the founder fills gaps.",
  ),
  fn(
    "offer_choices",
    "Reply to the founder and show 2–4 tappable answers. `say` is your message, shown above the buttons: 1–3 short sentences ending with the question. Ends your turn.",
    {
      say: { type: "string", description: "Your message to the founder, ending with the question the buttons answer." },
      options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    },
    ["say", "options"],
  ),
  fn("export_pack", "Show the export card, where the founder downloads the landing pack and the case file."),
];

// ---------- bank file drafting ----------

const BANK_SECTIONS = [
  "Company and activity",
  "Source of funds",
  "Ownership and control",
  "Expected account activity",
  "Signatory and documents",
];
const PLACEHOLDER = "[Founder confirmation required]";

function bankFacts(state: CaseState) {
  const p = state.profile;
  const route = isRoute(state.route) ? ROUTES[state.route] : null;
  const inc = state.filings.find((f) => f.step === "incorporation" && f.status === "done");
  const signatory = relocating(p).find((x) => x.role === "founder") ?? relocating(p)[0];
  const eid = signatory && state.filings.find((f) => f.id === `emirates_id:${signatory.id}`);
  return {
    bank: "Wio Business",
    company: p.company,
    licence: route && inc ? `${route.name}, licence ${inc.ref}, issued ${fmtDateLong(inc.doneOn ?? inc.etaOn)}` : null,
    activity: p.description,
    website: p.website,
    homeBase: p.homeBase,
    parentEntity: p.parentEntity,
    fundingRaisedUsd: p.fundingUsd,
    fundingSource: p.fundingSource,
    ownership: p.ownership,
    expectedMonthlyVolumeUsd: p.monthlyVolumeUsd,
    transactionCountries: p.transactionCountries,
    people: p.people.map((x) => ({ name: x.name, role: x.role, relocating: x.relocating })),
    signatory: signatory
      ? { name: signatory.name, emiratesId: eid?.status === "done" ? "issued" : "in progress (ICP)" }
      : null,
  };
}

function templateBankFile(state: CaseState): { title: string; body: string }[] {
  const f = bankFacts(state);
  const usd = (n: number | null) => (n == null ? PLACEHOLDER : `USD ${Math.round(n).toLocaleString("en-US")}`);
  return [
    {
      title: BANK_SECTIONS[0],
      body: `${f.company ?? PLACEHOLDER}${f.licence ? ` holds the ${f.licence}` : ""}. ${f.activity ?? PLACEHOLDER}${f.website ? ` (${f.website})` : ""}.`,
    },
    {
      title: BANK_SECTIONS[1],
      body: `The company has raised ${usd(f.fundingRaisedUsd)}. Source: ${f.fundingSource ?? PLACEHOLDER}.`,
    },
    {
      title: BANK_SECTIONS[2],
      body: `${f.parentEntity ? `Parent: ${f.parentEntity}. ` : ""}Ownership: ${f.ownership ?? PLACEHOLDER}.`,
    },
    {
      title: BANK_SECTIONS[3],
      body: `Expected volume: ${f.expectedMonthlyVolumeUsd == null ? PLACEHOLDER : `${usd(f.expectedMonthlyVolumeUsd)} a month`}. Countries: ${f.transactionCountries ?? PLACEHOLDER}.`,
    },
    {
      title: BANK_SECTIONS[4],
      body: f.signatory
        ? `Signatory: ${f.signatory.name}; Emirates ID ${f.signatory.emiratesId}. Enclosed: trade licence, certificate of incorporation${f.parentEntity ? ", the parent's certificate of incorporation and shareholder register" : ""}.`
        : `Signatory: ${PLACEHOLDER}.`,
    },
  ];
}

function cleanSections(raw: unknown): { title: string; body: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is { title: string; body: string } => !!s && typeof s.title === "string" && typeof s.body === "string")
    .map((s) => ({ title: s.title.trim().slice(0, 80), body: s.body.trim().slice(0, 1200) }))
    .filter((s) => s.title && s.body)
    .slice(0, 6);
}

async function draftBankFile(state: CaseState): Promise<{ title: string; body: string }[]> {
  try {
    const res = await llm().chat.completions.create(
      {
        model: AGENT_MODEL,
        max_tokens: 4000,
        ...modelParams(AGENT_MODEL),
        tool_choice: { type: "function", function: { name: "write_bank_file" } },
        tools: [
          fn("write_bank_file", "Write the bank file sections.", {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, body: { type: "string" } },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
          }, ["sections"]),
        ],
        messages: [
          {
            role: "system",
            content: `You draft the business profile that a UAE bank (Wio Business) reads when a newly licensed company opens an account. Use only the confirmed facts in the JSON you're given. Wherever a fact the bank needs is missing or null, write exactly ${PLACEHOLDER} in its place. Never guess or infer the source of funds, ownership percentages or transaction volumes. Write these five sections, in order: ${BANK_SECTIONS.join("; ")}. Each body is 1–3 plain sentences: no markdown, no bullet points, no marketing language.`,
          },
          { role: "user", content: JSON.stringify(bankFacts(state)) },
        ],
      },
      { timeout: 25_000, maxRetries: 1 },
    );
    const call = res.choices[0]?.message?.tool_calls?.[0];
    if (call?.type === "function") {
      const sections = cleanSections(JSON.parse(call.function.arguments || "{}").sections);
      if (sections.length >= 4) return sections;
    }
  } catch (err) {
    console.error("Bank file draft failed:", err instanceof Error ? err.message : "unknown error");
  }
  return templateBankFile(state);
}

// ---------- executors ----------

function nextHint(state: CaseState): string | undefined {
  const missing = missingFacts(state);
  if (missing.route.length) return `Ask about ${describeFact(missing.route[0])}.`;
  if (!state.fit) return "Nothing is missing before the route: call check_route.";
  if (!state.paid && isFitStale(state)) return "Facts the route check used changed: call check_route again.";
  if (state.bankFile && isBankFileStale(state) && !state.filings.some((f) => f.step === "bank_file")) {
    return missing.bank.length
      ? `Still needed for the bank file: ${missing.bank.map(describeFact).join("; ")}.`
      : "The bank file facts changed: call prepare_bank_file again.";
  }
  return undefined;
}

function filedSummary(state: CaseState, filed: Filing[]) {
  return filed.map((f) => ({
    title: STEPS[f.step].title,
    for: whoFor(state.profile, f.step, f.subjectId),
    provider: f.provider,
    ref: f.ref,
    eta: f.etaOn,
  }));
}

function bankHint(state: CaseState): string | undefined {
  const incorporated = state.filings.some((f) => f.step === "incorporation" && f.status === "done");
  if (!incorporated || state.filings.some((f) => f.step === "bank_file")) return undefined;
  if (!state.bankFile || isBankFileStale(state)) return "The company is incorporated, so prepare_bank_file can run now.";
  return "The bank file has open flags: ask the founder for the missing facts.";
}

const EXECUTORS: Record<string, Executor> = {
  save_profile(args, ctx) {
    const { state, changed, errors } = applyProfile(ctx.state, args);
    ctx.state = state;
    if (changed.length) ctx.emit({ t: "state", state });
    const missing = missingFacts(state);
    return ok({
      saved: changed,
      errors: errors.length ? errors : undefined,
      missingBeforeRoute: missing.route.map(describeFact),
      missingForBankFile: missing.bank.map(describeFact),
      next: nextHint(state),
    });
  },

  async check_route(_args, ctx) {
    const missing = missingFacts(ctx.state).route;
    if (missing.length) return fail(`Ask the founder first: ${missing.map(describeFact).join("; ")}.`);
    if (ctx.state.paid) return fail("The founder has paid, so the route is locked.");
    ctx.emit({ t: "activity", d: "Checking eligibility with TypeSafe…" });
    const { judgments, meta } = await runFitChecks(ctx.state);
    const decided = meta.live
      ? decideRoute(judgments, ctx.state.profile)
      : { route: "specialist" as const, reasons: [], flags: [], alternatives: [] };
    const fit: FitResult = {
      ...decided,
      judgments,
      meta,
      checkedAt: ctx.state.today,
      profileKey: profileKey(ctx.state.profile, "fit"),
    };
    ctx.emit({
      t: "activity",
      d: meta.live ? `Checked eligibility with TypeSafe · ${meta.latencyMs} ms` : "TypeSafe didn't answer",
      done: true,
    });
    const card = routeCard(ctx.state, fit);
    if (meta.live) {
      ctx.state = { ...ctx.state, fit, route: isRoute(fit.route) ? fit.route : null };
      ctx.emit({ t: "state", state: ctx.state });
    }
    ctx.emit({ t: "card", card: { kind: "route", data: card } });
    if (!meta.live) {
      return fail(
        meta.error === "setup_required"
          ? "TypeSafe isn't set up on this deployment. Tell the founder the eligibility check is unavailable here; don't guess a route."
          : "TypeSafe didn't answer. Tell the founder the check didn't run, don't guess a route, and offer_choices with \"Retry the eligibility check\".",
      );
    }
    return ok({
      recommended: card.recommended.name,
      routeId: fit.route,
      licenceAed: card.recommended.licenceAed,
      reasons: fit.reasons,
      flags: fit.flags,
      prerequisites: card.prerequisites.map((x) => `${x.label}: ${x.state}`),
      alternatives: card.alternatives.map((a) => ({ id: a.id, name: a.name, licenceAed: a.licenceAed, why: a.why })),
      checks: judgments.map((j) => `${j.label}: ${j.verdict} (p=${j.p})`),
      note:
        fit.route === "specialist"
          ? "Specialist review: explain why in one sentence; there's no plan or price in this demo for regulated activity."
          : "The route card is on screen. Give the pick and the main reason in 1–2 sentences, then offer the plan or the price.",
    });
  },

  show_plan(_args, ctx) {
    const plan = buildPlan(ctx.state);
    if (!plan) {
      return fail(ctx.state.fit?.route === "specialist" ? "No plan: this case goes to specialist review." : "No route yet: call check_route first.");
    }
    ctx.emit({ t: "card", card: { kind: "plan", data: plan } });
    return ok({
      route: plan.routeName,
      milestones: plan.milestones.map((m) => ({ label: m.label, best: m.best, typical: m.typical, done: m.doneOn })),
      waitingOnFounder: waitingItems(ctx.state).map((w) => w.label),
      note: "The plan card is on screen. Don't list steps; give the key milestone dates in one sentence.",
    });
  },

  show_price(_args, ctx) {
    const q = quote(ctx.state);
    if (!q) {
      return fail(ctx.state.fit?.route === "specialist" ? "No price: this case goes to specialist review." : "No route yet: call check_route first.");
    }
    ctx.emit({ t: "card", card: { kind: "price", data: q } });
    const partial = priceIsPartial(q);
    return ok({
      total: aed(q.totalAed),
      partial,
      paid: q.paid,
      lines: q.lines.map((l) => `${l.label}${l.qty ? ` × ${l.qty}` : ""}: ${aed(l.amountAed)}`),
      validUntil: q.validUntil,
      note: q.paid
        ? "Already paid; the price is locked."
        : partial
          ? `This is a "from" price: Masdar's visa and establishment-card fees are quoted by the free zone, so there's no payment yet.`
          : "The price card is on screen with a Confirm & pay button. Say it's one all-in price and that they can press Confirm & pay when ready.",
    });
  },

  choose_route(args, ctx) {
    const route = args.route;
    if (typeof route !== "string" || !isRoute(route as CaseState["route"])) return fail(`route must be one of ${ROUTE_IDS.join(", ")}`);
    if (ctx.state.paid) return fail("Already paid, so the route is locked.");
    const fit = ctx.state.fit;
    if (!fit?.meta.live) return fail("Run check_route first.");
    const allowed = [fit.route, ...fit.alternatives].filter((r): r is NonNullable<CaseState["route"]> => isRoute(r));
    if (!allowed.includes(route as NonNullable<CaseState["route"]>)) {
      return fail(`That route isn't open to this company. Options: ${allowed.map((r) => ROUTES[r].name).join("; ")}.`);
    }
    ctx.state = { ...ctx.state, route: route as NonNullable<CaseState["route"]> };
    ctx.emit({ t: "state", state: ctx.state });
    return ok({ route, name: ROUTES[route as NonNullable<CaseState["route"]>].name, note: "Route switched. Show the price or the plan." });
  },

  start_landing(_args, ctx) {
    if (ctx.action?.type !== "pay") {
      return fail("Only the founder can pay, by pressing Confirm & pay on the price card. Ask them to press it.");
    }
    const r = startLanding(ctx.state);
    if (r.error) return fail(r.error);
    ctx.state = r.state;
    ctx.emit({ t: "state", state: r.state });
    if (r.filed.length) ctx.emit({ t: "card", card: { kind: "filings", data: filingsCard(r.state, r.filed) } });
    return ok({
      paid: aed(r.state.paid?.amountAed ?? 0),
      filed: filedSummary(r.state, r.filed),
      note: "Say once that this is a sandbox with simulated filings. Confirm the price is locked and what's filed, and that the clock moves with the tracker buttons (+2 weeks, Next event).",
    });
  },

  advance_time(args, ctx) {
    const days = typeof args.days === "number" && Number.isFinite(args.days) ? Math.round(args.days) : undefined;
    const untilNextEvent = args.untilNextEvent === true;
    const r = advance(ctx.state, { days: untilNextEvent ? undefined : (days ?? 7), untilNextEvent });
    if (r.error) {
      return fail(`${r.error} Waiting on the founder: ${waitingItems(ctx.state).map((w) => w.label).join("; ") || "nothing"}.`);
    }
    ctx.state = r.state;
    ctx.emit({ t: "state", state: r.state });
    ctx.emit({ t: "card", card: { kind: "updates", data: updatesCard(r.state, r.from, r.to, r.events) } });
    const waiting = waitingItems(r.state);
    const plan = buildPlan(r.state);
    const hasMedical = waiting.some((w) => w.key.startsWith("medical:"));
    const bank = bankHint(r.state);
    return ok({
      from: fmtSimDay(r.state.startDate, r.from),
      to: fmtSimDay(r.state.startDate, r.to),
      events: r.events.map((e) => `${e.on} ${e.kind}: ${e.text}`),
      milestonesDone: plan?.milestones.filter((m) => m.doneOn).map((m) => `${m.label} (${m.doneOn})`),
      waitingOnFounder: waiting,
      bankFile: bank,
      note: [
        "The updates card is on screen. Narrate the highlights in 1–2 sentences, milestones first.",
        hasMedical ? "Ask which medical slot works and offer the slot options as choices." : "",
        hasMedical && bank ? "After the slot is picked, prepare the bank file." : bank ?? "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  },

  provide_input(args, ctx) {
    const { key, value } = args;
    if (typeof key !== "string" || typeof value !== "string") return fail("key and value must be strings.");
    if (/^bank|funding|ownership/i.test(key)) {
      return fail("Bank facts go through save_profile (fundingSource, ownership, monthlyVolumeUsd, transactionCountries).");
    }
    const r = provideInput(ctx.state, key, value);
    if (r.error) return fail(r.error);
    ctx.state = r.state;
    ctx.emit({ t: "state", state: r.state });
    if (r.filed.length) ctx.emit({ t: "card", card: { kind: "filings", data: filingsCard(r.state, r.filed) } });
    return ok({
      saved: r.key,
      filed: filedSummary(r.state, r.filed),
      note: r.filed.length ? undefined : "Saved. The step files automatically as soon as it unlocks.",
      waitingOnFounder: waitingItems(r.state).map((w) => w.label),
      bankFile: bankHint(r.state),
    });
  },

  async prepare_bank_file(_args, ctx) {
    const s = ctx.state;
    if (!s.paid || !isRoute(s.route)) return fail("There's nothing to bank yet: the landing starts after payment.");
    const inc = s.filings.find((f) => f.step === "incorporation");
    if (inc?.status !== "done") {
      return fail(`The bank needs the licence first. Incorporation ${inc ? `is due ${inc.etaOn}` : "isn't filed yet"}.`);
    }
    if (s.filings.some((f) => f.step === "bank_file")) return ok({ ready: true, note: "Already prepared for bank review." });

    ctx.emit({ t: "activity", d: "Drafting the bank file…" });
    const sections = await draftBankFile(s);
    ctx.emit({ t: "activity", d: "Drafted the bank file", done: true });
    ctx.emit({ t: "activity", d: "Checking the bank file with TypeSafe…" });
    const { judgments, meta } = await runBankChecks(s, sections);
    ctx.emit({
      t: "activity",
      d: meta.live ? `Checked the bank file with TypeSafe · ${meta.latencyMs} ms` : "TypeSafe didn't answer",
      done: true,
    });

    const missing = missingFacts(s).bank.map(describeFact);
    const ready = meta.live && !missing.length && judgments.every((j) => j.verdict === "pass");
    const bankFile: BankFile = { sections, missing, checks: judgments, meta, ready, profileKey: profileKey(s.profile, "bank") };
    const r = ready ? completeBankFile({ ...s, bankFile }) : fileReady({ ...s, bankFile });
    ctx.state = r.state;
    ctx.emit({ t: "state", state: r.state });
    ctx.emit({
      t: "card",
      card: { kind: "bank_file", data: { bank: "Wio Business", sections, missing, checks: judgments, checksMeta: meta, ready } },
    });
    const others = r.filed.filter((f) => f.step !== "bank_file");
    if (others.length) ctx.emit({ t: "card", card: { kind: "filings", data: filingsCard(r.state, others) } });

    if (!meta.live) {
      return fail("TypeSafe didn't answer, so the bank file isn't checked. Tell the founder and offer to retry (\"Re-check the bank file\").");
    }
    return ok({
      ready,
      notPassing: judgments.filter((j) => j.verdict !== "pass").map((j) => `${j.label}: ${j.verdict}${j.note ? ` (${j.note})` : ""}`),
      missingFacts: missing,
      filed: filedSummary(r.state, others),
      note: ready
        ? "Say it's prepared for bank review (never \"approved\"). The bank application files as soon as the signatory has an Emirates ID."
        : "Name the gaps TypeSafe flagged in plain words and ask for the missing facts in one question. Don't suggest answers.",
    });
  },

  offer_choices(args, ctx) {
    // Show the message unless the model already wrote it; if it wrote text without the question, add the question.
    const say = typeof args.say === "string" ? args.say.trim().slice(0, 600) : "";
    const fresh = ctx.freshText?.() ?? "";
    if (say && ctx.say) {
      if (!fresh.trim()) ctx.say(say);
      else if (!fresh.includes("?") && say.includes("?")) {
        const question = say.match(/[^.!?]*\?/g)?.pop()?.trim();
        if (question) ctx.say(`\n\n${question}`);
      }
    }
    const raw = Array.isArray(args.options) ? args.options : [];
    const options = [
      ...new Set(
        raw
          .filter((o): o is string => typeof o === "string")
          .map((o) => o.trim().replace(/\s+/g, " "))
          .filter((o) => o.length > 0 && o.length <= 90),
      ),
    ].slice(0, 4);
    if (!options.length) return fail("options must be 2–4 short strings.");
    ctx.emit({ t: "choices", options });
    return ok({ shown: options });
  },

  export_pack(_args, ctx) {
    ctx.emit({ t: "card", card: { kind: "export", data: { generatedOn: ctx.state.today } } });
    return ok({ note: "The export card is on screen: the landing pack (.md) and the case file (.json) download from it." });
  },
};

export const TOOL_NAMES = new Set(Object.keys(EXECUTORS));

export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const exec = EXECUTORS[name];
  if (!exec) return fail(`Unknown tool ${name}.`);
  let args: Args = {};
  if (rawArgs && rawArgs.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawArgs);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("Arguments must be a JSON object.");
      args = parsed as Args;
    } catch {
      return fail("Arguments weren't valid JSON.");
    }
  }
  try {
    return await exec(args, ctx);
  } catch (err) {
    console.error(`Tool ${name} failed:`, err instanceof Error ? err.message : "unknown error");
    return fail("That step failed inside Atlas71. Say so briefly and offer to try again.");
  }
}
