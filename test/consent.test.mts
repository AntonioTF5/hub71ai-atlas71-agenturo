import { test } from "node:test";
import assert from "node:assert/strict";
import type { CaseState } from "../src/lib/atlas/types.ts";
import {
  advance,
  authorisations,
  entryDate,
  entryOptions,
  identityCard,
  monthsValid,
  payChecklist,
  payHint,
  provideInput,
  readyToPay,
  sandboxIdentities,
  saysYes,
  signatoryOf,
  saveIdentities,
  startLanding,
  stepInstances,
  stepStatuses,
  waitingItems,
  waitingOn,
} from "../src/lib/atlas/engine.ts";
import { applyProfile } from "../src/lib/atlas/profile.ts";
import { emptyCase } from "../src/lib/atlas/personas.ts";

const START = "2026-10-02";
const BANK_FACTS = {
  fundingSource: "$600k from 8 angel investors through convertible notes in Routely, a DPIIT-recognised Bangalore company",
  ownership: "Routely will own 100% of the ADGM company; Meera holds 55% and Arjun 45% of Routely",
};

/** Routely as the founder describes it in the opener, on the startup licence: nothing collected for payment yet. */
function routely(): CaseState {
  const { state } = applyProfile(emptyCase(START, "routely"), {
    company: "Routely",
    description: "Route-planning SaaS for delivery fleets.",
    website: "routely.io",
    homeBase: "Bangalore, India",
    hub71Letter: "none",
    monthlyVolumeUsd: 40000,
    transactionCountries: "UAE, Saudi Arabia, India",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Arjun Rao", role: "founder", relocating: false },
    ],
    dependants: [
      { relation: "spouse", sponsorName: "Meera", name: "Rohan" },
      { relation: "child", sponsorName: "Meera", name: "Anya" },
    ],
  });
  return { ...state, route: "adgm_tsl", inputs: { ...state.inputs, quoted: START } };
}

/** Routely with everything payment needs, except whatever `skip` leaves out. */
function complete(skip: string[] = []): CaseState {
  let s = routely();
  if (!skip.includes("consent")) s = provideInput(s, "consent:hub71_letter", "Yes, apply for me").state;
  if (!skip.includes("identity")) s = saveIdentities(s, sandboxIdentities(s)).state;
  if (!skip.includes("entry")) s = provideInput(s, "entry:Meera", "Already in the UAE").state;
  if (!skip.includes("documents")) s = provideInput(s, "documents:all", "Not yet").state;
  if (!skip.includes("bank")) s = applyProfile(s, BANK_FACTS).state;
  return s;
}

const status = (s: CaseState) => stepStatuses(s, stepInstances(s, "adgm_tsl"));

test("payment comes last: the details are asked in order, and Confirm & pay unlocks only at the end", () => {
  let s = routely();
  const sig = signatoryOf(s.profile)!;
  const keys = () => waitingItems(s).map((w) => w.key);
  assert.deepEqual(keys(), ["consent:hub71_letter", "identity", `entry:${sig.id}`, "documents", "bank"]);
  assert.equal(readyToPay(s), false);
  assert.match(startLanding(s).error ?? "", /^Payment comes last/);

  s = provideInput(s, "consent:hub71_letter", "Yes, apply for me").state;
  s = saveIdentities(s, sandboxIdentities(s)).state;
  s = provideInput(s, `entry:${sig.id}`, entryOptions(s)[1]).state;
  s = provideInput(s, "documents:all", "They're legalised and ready").state;
  assert.deepEqual(keys(), ["bank"]);
  assert.equal(waitingItems(s)[0].label, "For the bank file: the source of funds and the ownership chain");
  assert.match(startLanding(s).error ?? "", /source of funds/);
  assert.equal(s.filings.length, 0, "nothing is filed while details are being collected");

  s = applyProfile(s, BANK_FACTS).state;
  assert.ok(readyToPay(s));
  assert.ok(payChecklist(s).every((c) => c.done));
  assert.deepEqual(keys(), ["pay"]);
  assert.match(waitingItems(s)[0].label, /^Confirm and pay AED [\d,]+ to start filing$/);

  const paid = startLanding(s);
  assert.equal(paid.error, undefined);
  assert.deepEqual(paid.filed.map((f) => f.step).sort(), ["desk", "hub71_letter"]);
  assert.equal(status(paid.state)[`signatory_entry:${sig.id}`], "filed", "the landing date is already known");
  assert.deepEqual(waitingItems(paid.state), [], "after payment nothing is waiting on the founder");
});

test("the Hub71 letter needs a yes before payment; 'Not yet' offers the standard licence instead", () => {
  const s = complete(["consent"]);
  assert.deepEqual(waitingItems(s).map((w) => w.key), ["consent:hub71_letter"]);

  const no = provideInput(s, "consent:hub71_letter", "Not yet");
  assert.equal(no.state.inputs["consent:hub71_letter"], "no");
  for (const refusal of ["Please don't apply yet", "OK, but not yet", "Apply later"]) {
    const r = provideInput(s, "consent:hub71_letter", refusal);
    assert.equal(r.state.inputs["consent:hub71_letter"], "no", refusal);
    assert.ok(!readyToPay(r.state), refusal);
  }
  const item = waitingItems(no.state)[0];
  assert.match(item.label, /switch to the standard ADGM licence/);
  assert.deepEqual(item.options, ["Yes, apply for me", "Switch to the standard licence"]);
  assert.match(startLanding(no.state).error ?? "", /Hub71/);
  assert.ok(readyToPay({ ...no.state, route: "adgm_standard" }), "the standard licence needs no Hub71 letter");

  const yes = provideInput(no.state, "consent:hub71_letter", "Yes, apply for me");
  assert.equal(yes.state.inputs["consent:hub71_letter"], "yes");
  assert.equal(yes.filed.length, 0, "the OK is recorded; the application files once they pay");
  assert.ok(startLanding(yes.state).filed.some((f) => f.step === "hub71_letter"));
});

test("only an explicit, unhedged yes counts as consent", () => {
  for (const yes of ["Yes, apply for me", "yes", "Yeah go ahead", "OK", "Sure, please do", "Approved"]) assert.ok(saysYes(yes), yes);
  for (const no of ["Not yet", "Please don't apply yet", "OK, but not yet", "Apply later", "Yes, but wait for my co-founder", "Hold on", "y", "true", ""]) {
    assert.ok(!saysYes(no), no);
  }
  assert.ok(saysYes("Show me the plan first\n\nYes, apply for me"), "the newest paragraph decides");
});

test("passports are read once before payment, and one that expires too soon holds it", () => {
  const s = complete(["identity"]);
  const item = waitingItems(s)[0];
  assert.equal(item.key, "identity");
  assert.equal(item.label, "Passport details for Meera Iyer, Arjun Rao, Rohan (spouse) and Anya (child)");

  const ids = sandboxIdentities(s);
  assert.deepEqual(ids.map((i) => i.fullName).sort(), ["Anya Iyer", "Arjun Rao", "Meera Iyer", "Rohan Iyer"]);
  const saved = saveIdentities(s, ids);
  assert.equal(saved.filed.length, 0);
  assert.ok(Object.values(saved.state.identities ?? {}).every((i) => i.passportLast4.length === 4));
  assert.ok(readyToPay(saved.state));

  // Meera needs a residence visa, so 4 months left isn't enough; Arjun stays, so his only has to be valid.
  const meera = s.profile.people.find((p) => p.name === "Meera Iyer")!.id;
  const arjun = s.profile.people.find((p) => p.name === "Arjun Rao")!.id;
  const short = ids.map((i) =>
    i.subjectId === meera || i.subjectId === arjun ? { ...i, passportExpiry: "2027-02-01" } : i,
  );
  const held = saveIdentities(s, short).state;
  const passports = payChecklist(held).find((c) => c.key === "identity")!;
  assert.equal(passports.done, false);
  assert.equal(passports.detail, "A renewed passport for Meera Iyer: the one on file expires too soon");
  assert.match(startLanding(held).error ?? "", /renewed passport/);
  const card = identityCard(held);
  assert.equal(card.people.find((p) => p.subjectId === meera)?.ok, false);
  assert.equal(card.people.find((p) => p.subjectId === arjun)?.ok, true);
});

test("family certificates: 'not yet' is an answer before payment, and the visa waits for the real thing", () => {
  const s = complete(["documents"]);
  const ask = waitingItems(s)[0];
  assert.equal(ask.key, "documents");
  assert.match(ask.label, /^Are the marriage certificate for Rohan \(spouse\) and the birth certificate for Anya \(child\) legalised/);

  let paid = complete();
  const rohan = paid.profile.dependants.find((d) => d.name === "Rohan")!.id;
  const anya = paid.profile.dependants.find((d) => d.name === "Anya")!.id;
  assert.equal(paid.inputs[`documents:${rohan}`], "not_yet");
  assert.equal(payChecklist(paid).find((c) => c.key === "documents")!.detail, "Not legalised yet for Rohan and Anya; those visas file once they are");
  assert.ok(authorisations(paid, "adgm_tsl").some((l) => l.endsWith("once their certificates are legalised")));

  // After payment, the clock runs to Meera's Emirates ID; then the dependant visas wait for the certificates.
  paid = startLanding(paid).state;
  paid = advance(paid, { days: 28 }).state;
  paid = advance(paid, { untilNextEvent: true }).state;
  paid = provideInput(paid, "medical:Meera", "slot").state;
  paid = advance(paid, { days: 14 }).state;
  assert.equal(status(paid)[`dependant_visa:${rohan}`], "needs_input");
  assert.ok(waitingOn(paid).includes("Legalised marriage certificate needed for Rohan (spouse)"));

  const unstamped = provideInput(paid, "documents:Anya", "Birth certificate (anya.pdf), no MOFA legalisation stamp");
  assert.equal(unstamped.state.inputs[`documents:${anya}`], "not_yet", "an unlegalised upload isn't the document");
  assert.equal(unstamped.filed.length, 0);

  const ready = provideInput(unstamped.state, "documents:Rohan", "It's legalised and ready");
  assert.deepEqual(ready.filed.map((f) => f.id), [`dependant_visa:${rohan}`]);
  assert.ok(!waitingOn(ready.state).some((w) => w.includes("Rohan")));
});

test("the agent's next step: the price before the details, the review before payment", () => {
  const fresh = routely();
  delete fresh.inputs.quoted; // the price card hasn't been shown yet
  assert.match(payHint(fresh) ?? "", /Approve the Hub71 eligibility letter application/, "the Hub71 OK comes with the route");
  const consented = provideInput(fresh, "consent:hub71_letter", "Yes").state;
  assert.match(payHint(consented) ?? "", /Offer the plan or the price/);
  const declined = provideInput(fresh, "consent:hub71_letter", "Not yet").state;
  assert.match(payHint(declined) ?? "", /Offer the plan or the price/, "a 'not yet' still sees the price before being asked again");
  assert.match(payHint(complete(["identity"])) ?? "", /^Payment comes last\. Ask for: Passport details for Meera Iyer/);
  assert.match(payHint(complete()) ?? "", /call show_price for the final review/);
  assert.equal(payHint(startLanding(complete()).state), undefined);
});

test("each route asks only for what it needs", () => {
  const masdar = { ...complete(), route: "masdar" as const };
  assert.deepEqual(payChecklist(masdar).map((c) => c.key), ["identity", "documents", "bank"], "no ADGM signatory entry, no Hub71 letter");
  assert.equal(readyToPay(masdar), false, "Masdar's visa fees come from the free zone's quote");
  assert.ok(!waitingItems(masdar).some((w) => w.key === "pay"));

  const { state } = applyProfile(emptyCase(START, "byteforge"), {
    company: "Byteforge",
    description: "Software development agency.",
    hub71Letter: "none",
    people: [
      { name: "Omar Farouk", role: "founder", relocating: true },
      { name: "Laila Mansour", role: "employee", relocating: true },
    ],
    dependants: [],
  });
  const omar = signatoryOf(state.profile)!;
  assert.deepEqual(
    payChecklist({ ...state, route: "adgm_standard" }).map((c) => c.key),
    ["identity", `entry:${omar.id}`, "bank"],
    "no family certificates when no family moves",
  );
});

test("the passport card checks validity and says what the details pre-fill", () => {
  const s = saveIdentities(routely(), sandboxIdentities(routely())).state;
  const card = identityCard(s);
  assert.equal(card.people.length, 4);
  assert.deepEqual(card.missing, []);
  assert.ok(card.people.every((p) => p.ok));
  assert.ok(card.sandbox);
  assert.ok(card.usedFor[0].startsWith("ADGM Registration Authority"));
  assert.equal(monthsValid("2026-10-02", "2027-04-01"), 5);
  assert.equal(monthsValid("2026-10-02", "2027-04-02"), 6);
});

test("paying authorises exactly the filings Atlas71 will make", () => {
  const s = complete();
  const list = authorisations(s, "adgm_tsl");
  assert.equal(list[0], "Apply to Hub71 for the eligibility letter");
  assert.ok(list.some((l) => l.includes("Meera Iyer")));
  assert.ok(list.some((l) => l.includes("Rohan and Anya")));
  assert.ok(!authorisations(routely(), "adgm_tsl").some((l) => l.includes("Hub71")), "no consent, no Hub71 application");
  const legalised = provideInput(s, "documents:all", "They're legalised and ready").state;
  assert.ok(authorisations(legalised, "adgm_tsl").includes("Dependant visas for Rohan and Anya"));
});

test("the signatory's entry date is read from the offered options without mixing up '4 Oct' and '14 Oct'", () => {
  const s = routely();
  assert.equal(entryDate(s, "Landing Fri 9 Oct"), "2026-10-09");
  assert.equal(entryDate(s, "Landing Wed 14 Oct"), "2026-10-14");
  assert.equal(entryDate(s, "Landing Mon 19 Oct"), "2026-10-19");
  assert.equal(entryDate(s, "Sun 4 Oct"), "2026-10-04");
  assert.equal(entryDate(s, "Already in the UAE"), s.today);
  assert.equal(entryDate(s, "2026-11-03"), "2026-11-03");
  assert.equal(entryDate(s, "sometime soon"), null);
});
