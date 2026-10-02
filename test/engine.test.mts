import { test } from "node:test";
import assert from "node:assert/strict";
import type { CaseState, Judgment } from "../src/lib/atlas/types.ts";
import {
  advance,
  buildPlan,
  completeBankFile,
  decideRoute,
  fileReady,
  missingFacts,
  normalizeState,
  provideInput,
  quote,
  startLanding,
  stepInstances,
  stepStatuses,
  verdictFor,
  waitingOn,
} from "../src/lib/atlas/engine.ts";
import { applyProfile, factClaims, withoutClaims } from "../src/lib/atlas/profile.ts";
import { emptyCase } from "../src/lib/atlas/personas.ts";
import { addDays } from "../src/lib/atlas/format.ts";
import { compareCard } from "../src/lib/atlas/compare.ts";

const START = "2026-10-02";

function routely(arjunMoves = false): CaseState {
  const { state, errors } = applyProfile(emptyCase(START, "routely"), {
    company: "Routely",
    description: "Route-planning SaaS for delivery fleets, sold on monthly subscriptions to logistics companies in India and the Gulf.",
    website: "routely.io",
    homeBase: "Bangalore, India",
    stage: "Seed",
    fundingUsd: 600000,
    parentEntity: "Routely Inc., Delaware C-corp",
    hub71Letter: "none",
    monthlyVolumeUsd: 40000,
    transactionCountries: "UAE, Saudi Arabia, India",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Arjun Rao", role: "founder", relocating: arjunMoves },
    ],
    dependants: [
      { relation: "spouse", sponsorName: "Meera Iyer", name: "Rohan" },
      { relation: "child", sponsorName: "Meera", name: "Anya" },
    ],
  });
  assert.deepEqual(errors, []);
  return { ...state, route: "adgm_tsl" };
}

function byteforge(): CaseState {
  const { state } = applyProfile(emptyCase(START, "byteforge"), {
    company: "Byteforge",
    description: "Software development agency building custom web and mobile apps for clients.",
    hub71Letter: "none",
    people: ["Omar Farouk", "Laila Mansour", "Karim Adel", "Nour Hassan"].map((name, i) => ({
      name,
      role: i === 0 ? "founder" : "employee",
      relocating: true,
    })),
    dependants: [],
  });
  return { ...state, route: "adgm_standard" };
}

const j = (key: string, verdict: Judgment["verdict"]): Judgment => ({ key, label: key, p: 0.5, verdict });

test("Routely price: one founder + spouse + child on the startup licence is AED 40,075", () => {
  const q = quote(routely(false))!;
  assert.equal(q.totalAed, 40075);
  assert.equal(q.lines.reduce((s, l) => s + l.amountAed, 0), 40075);
});

test("Routely price with both founders relocating is AED 43,912", () => {
  assert.equal(quote(routely(true))!.totalAed, 43912);
});

test("Byteforge on the standard licence needs two desks for four people", () => {
  const q = quote(byteforge())!;
  const desk = q.lines.find((l) => l.group === "Provider")!;
  assert.equal(desk.qty, 2);
  assert.equal(q.totalAed, 4900 + 21301 + 5325 + 4 * 3237 + 4 * 600 + 2 * 13800);
});

test("Masdar is priced as a partial quote", () => {
  const q = quote(byteforge(), "masdar")!;
  assert.equal(q.totalAed, 4900 + 12600);
  assert.ok(q.excluded[0].includes("quoted by the free zone"));
});

test("verdicts mirror for bad questions", () => {
  assert.equal(verdictFor(0.9, "good"), "pass");
  assert.equal(verdictFor(0.2, "good"), "flag");
  assert.equal(verdictFor(0.5, "good"), "review");
  assert.equal(verdictFor(0.9, "bad"), "flag");
  assert.equal(verdictFor(0.1, "bad"), "pass");
  assert.equal(verdictFor(0.65, "good"), "pass");
  assert.equal(verdictFor(0.35, "bad"), "pass");
});

test("route rules: product → TSL, service provider → standard + Masdar, regulated → specialist", () => {
  const p = routely().profile;
  const clean = ["tech_product", "service_provider", "regulated_finance", "excluded_sector", "scalable"].map((k) => j(k, "pass"));
  assert.equal(decideRoute(clean, p).route, "adgm_tsl");
  assert.deepEqual(decideRoute(clean, p).alternatives, ["adgm_standard", "masdar"]);
  assert.deepEqual(decideRoute(clean, p).flags, []);

  const agency = clean.map((x) => (x.key === "service_provider" ? j(x.key, "flag") : x));
  const r = decideRoute(agency, p);
  assert.equal(r.route, "adgm_standard");
  assert.deepEqual(r.alternatives, ["masdar"]);
  assert.ok(r.reasons[0].includes("[source:adgm-tsl]"));

  const fintech = clean.map((x) => (x.key === "regulated_finance" ? j(x.key, "flag") : x));
  assert.equal(decideRoute(fintech, p).route, "specialist");

  const unsure = clean.map((x) => (x.key === "scalable" ? j(x.key, "review") : x));
  assert.ok(decideRoute(unsure, p).flags.includes("A specialist confirms this before filing."));
});

test("missing facts: an unconfirmed co-founder is asked about before the route", () => {
  const { state } = applyProfile(emptyCase(START), {
    company: "Routely",
    description: "SaaS",
    homeBase: "Bangalore, India",
    people: [{ name: "Meera Iyer", relocating: true }, { name: "Arjun Rao" }],
    dependants: [{ relation: "spouse", sponsorName: "Meera Iyer" }],
  });
  assert.deepEqual(missingFacts(state).route, ["relocating:Arjun Rao", "hub71Letter"]);
  const { state: s2 } = applyProfile(state, { people: [{ name: "Arjun", relocating: false }], hub71Letter: "none" });
  assert.deepEqual(missingFacts(s2).route, []);
  assert.equal(s2.profile.people.length, 2, "a follow-up about one person keeps the others");
  assert.equal(s2.profile.people.find((x) => x.name === "Arjun Rao")?.relocating, false);
});

test("nothing is filed before payment", () => {
  const r = fileReady(routely());
  assert.equal(r.filed.length, 0);
});

test("payment files the Hub71 letter and the desk; incorporation waits for both", () => {
  const { state, filed } = startLanding(routely());
  assert.deepEqual(filed.map((f) => f.step).sort(), ["desk", "hub71_letter"]);
  assert.equal(state.paid?.amountAed, 40075);
  const status = stepStatuses(state, stepInstances(state, "adgm_tsl"));
  assert.equal(status.incorporation, "locked");
  assert.match(filed.find((f) => f.step === "hub71_letter")!.ref, /^H71-EL-26-\d{5}$/);
  // deterministic refs
  assert.deepEqual(startLanding(routely()).filed.map((f) => f.ref), filed.map((f) => f.ref));
});

test("the demo clock: two '+2 weeks' get from payment to the medical slot", () => {
  let s = startLanding(routely()).state;
  const w1 = advance(s, { days: 14 });
  s = w1.state;
  assert.equal(s.today, addDays(START, 14));
  assert.ok(w1.events.some((e) => e.kind === "issued" && e.step === "hub71_letter"));
  assert.ok(w1.events.some((e) => e.kind === "filed" && e.step === "incorporation"));

  const w2 = advance(s, { days: 14 });
  s = w2.state;
  const kinds = w2.events.map((e) => `${e.kind}:${e.step}`);
  assert.ok(kinds.includes("issued:incorporation"));
  assert.ok(kinds.includes("deadline:tax_registration"));
  assert.ok(kinds.includes("issued:entry_permit"));
  assert.ok(kinds.includes("needs_input:medical"));
  assert.ok(waitingOn(s).some((w) => w.startsWith("Choose a medical test slot for Meera")));
  const plan = buildPlan(s)!;
  const licensed = plan.milestones.find((m) => m.key === "licensed")!;
  assert.equal(licensed.doneOn, addDays(START, 21));
  const tax = plan.groups.flatMap((g) => g.steps).find((x) => x.step === "tax_registration")!;
  assert.equal(tax.deadline, "2027-01-23");

  // the slot unblocks the medical filing
  const meera = s.profile.people.find((p) => p.name === "Meera Iyer")!;
  const r = provideInput(s, "medical:Meera", "Tue 3 Nov, 09:00 · SEHA Al Bateen");
  assert.equal(r.key, `medical:${meera.id}`);
  assert.deepEqual(r.filed.map((f) => f.step), ["medical"]);
});

test("next event stops on the first day something is issued", () => {
  const s = startLanding(routely()).state;
  const r = advance(s, { untilNextEvent: true });
  assert.equal(r.to, addDays(START, 2));
  assert.ok(r.events.every((e) => e.on === r.to));
});

test("the bank account waits for the bank file and the founder's Emirates ID", () => {
  let s = startLanding(routely()).state;
  s = advance(s, { days: 28 }).state;
  s = provideInput(s, "medical:Meera", "slot").state;
  s = advance(s, { days: 14 }).state; // Emirates ID done, but no bank file yet
  const status = () => stepStatuses(s, stepInstances(s, "adgm_tsl"));
  assert.equal(status().bank_file, "needs_input");
  assert.equal(status().bank_account, "locked");
  const meera = s.profile.people.find((p) => p.name === "Meera Iyer")!;
  assert.equal(status()[`emirates_id:${meera.id}`], "done");

  s = applyProfile(s, {
    fundingSource: "$600k from 8 angels via SAFEs into Routely Inc.",
    ownership: "Routely Inc. owns 100% of the ADGM company; Meera holds 55%, Arjun 45%.",
  }).state;
  s = { ...s, bankFile: { sections: [], missing: [], checks: [], meta: { live: true }, ready: true, profileKey: "x" } };
  const done = completeBankFile(s);
  assert.deepEqual(done.filed.map((f) => f.step), ["bank_file", "bank_account"]);
  s = advance(done.state, { days: 14 }).state;
  const plan = buildPlan(s)!;
  for (const key of ["licensed", "resident", "banked", "payments"]) {
    assert.ok(plan.milestones.find((m) => m.key === key)?.doneOn, `${key} done`);
  }
  // dependants are waiting on legalised documents, not on the company
  assert.ok(waitingOn(s).some((w) => w.includes("marriage certificate")));
});

test("plan windows before payment start today and chain best and typical separately", () => {
  const plan = buildPlan(routely())!;
  const step = (id: string) => plan.groups.flatMap((g) => g.steps).find((x) => x.step === id)!;
  assert.deepEqual(step("hub71_letter").best, [START, addDays(START, 14)]);
  assert.deepEqual(step("incorporation").best, [addDays(START, 14), addDays(START, 19)]);
  assert.deepEqual(step("incorporation").typical, [addDays(START, 28), addDays(START, 42)]);
  assert.equal(step("hub71_letter").status, "ready");
  assert.equal(step("incorporation").status, "locked");
});

test("normalizeState rejects garbage and keeps a valid case", () => {
  assert.equal(normalizeState("nope", START).v, 1);
  assert.equal(normalizeState({ v: 2 }, START).profile.company, null);
  const s = routely();
  const back = normalizeState(JSON.parse(JSON.stringify(s)), START);
  assert.equal(quote(back)!.totalAed, 40075);
});

test("a family member saved as a person is moved out of the visa holders", () => {
  const { state } = applyProfile(emptyCase(START), {
    company: "Routely",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Rohan", role: "employee", relocating: true },
    ],
    dependants: [{ relation: "spouse", sponsorName: "Meera Iyer", name: "Rohan" }],
  });
  assert.deepEqual(state.profile.people.map((p) => p.name), ["Meera Iyer"]);
  assert.equal(state.profile.dependants.length, 1);
});

test("sensitive facts become TypeSafe claims, and dropped claims are not saved", () => {
  const args = {
    company: "Routely",
    hub71Letter: "none",
    fundingSource: "$600k from 8 angels via SAFEs",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Arjun Rao", role: "founder", relocating: false },
    ],
  };
  const claims = factClaims(emptyCase(START), args);
  assert.deepEqual(claims.map((c) => c.key).sort(), ["fundingSource", "hub71Letter", "relocating:Arjun Rao", "relocating:Meera Iyer"]);
  const dropped = claims.filter((c) => c.key === "hub71Letter" || c.key === "relocating:Arjun Rao");
  const { state } = applyProfile(emptyCase(START), withoutClaims(args, dropped));
  assert.equal(state.profile.hub71Letter, null);
  assert.equal(state.profile.fundingSource, "$600k from 8 angels via SAFEs");
  assert.deepEqual(missingFacts(state).route, ["description", "homeBase", "relocating:Arjun Rao", "dependants", "hub71Letter"]);
  // an unchanged, already-confirmed fact isn't re-checked
  assert.deepEqual(factClaims(state, { people: [{ name: "Meera", relocating: true }] }), []);
});

test("compare card: Abu Dhabi vs Bangalore for Routely, Cairo for Byteforge", () => {
  const checks: Judgment[] = [
    { key: "gcc_customers", label: "GCC", p: 0.92, verdict: "pass" },
    { key: "raising_capital", label: "VC", p: 0.81, verdict: "pass" },
    { key: "hiring_abroad", label: "Hiring", p: 0.2, verdict: "flag" },
    { key: "cost_sensitive", label: "Costs", p: 0.7, verdict: "pass" },
  ];
  const r = compareCard({ ...routely(), route: null }, checks, { live: true, latencyMs: 120 });
  assert.equal(r.homeLabel, "Bangalore");
  assert.deepEqual([...new Set(r.rows.map((x) => x.topic))], ["taxes", "opportunities", "residency", "work", "costs"]);
  assert.ok(r.verdict.includes("Gulf customers") && r.verdict.includes("Bangalore"));
  assert.deepEqual(r.firstYear[0].abuDhabiAed, [40075, 54765]); // startup licence vs standard licence, same people
  assert.equal(r.firstYear.length, 3); // landing, family home, school for Anya
  assert.ok(r.rows.find((x) => x.label === "Market access")?.matters);

  const b = compareCard({ ...byteforge(), route: null, profile: { ...byteforge().profile, homeBase: "Cairo, Egypt" } }, [], { live: true });
  assert.equal(b.homeLabel, "Cairo");
  assert.match(b.firstYear[1].label, /1-bed × 4/);
});

test("a bank fact that only says it's missing is not saved", () => {
  const { state, errors } = applyProfile(emptyCase(START), {
    fundingSource: "Raised $600k; investor identities and instrument not yet stated.",
    ownership: "Unknown",
    fundingUsd: 600000,
  });
  assert.equal(state.profile.fundingSource, null);
  assert.equal(state.profile.ownership, null);
  assert.equal(state.profile.fundingUsd, 600000);
  assert.equal(errors.length, 2);
});
