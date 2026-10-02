import { test } from "node:test";
import assert from "node:assert/strict";
import type { CaseState } from "../src/lib/atlas/types.ts";
import {
  advance,
  authorisations,
  identityCard,
  monthsValid,
  provideInput,
  sandboxIdentities,
  saveIdentities,
  startLanding,
  stepInstances,
  stepStatuses,
  waitingItems,
} from "../src/lib/atlas/engine.ts";
import { applyProfile } from "../src/lib/atlas/profile.ts";
import { emptyCase } from "../src/lib/atlas/personas.ts";

const START = "2026-10-02";

/** Routely as the founder describes it: no consent and no passports yet. */
function routely(): CaseState {
  const { state } = applyProfile(emptyCase(START, "routely"), {
    company: "Routely",
    description: "Route-planning SaaS for delivery fleets.",
    website: "routely.io",
    homeBase: "Bangalore, India",
    hub71Letter: "none",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Arjun Rao", role: "founder", relocating: false },
    ],
    dependants: [
      { relation: "spouse", sponsorName: "Meera", name: "Rohan" },
      { relation: "child", sponsorName: "Meera", name: "Anya" },
    ],
  });
  return { ...state, route: "adgm_tsl" };
}

const status = (s: CaseState) => stepStatuses(s, stepInstances(s, "adgm_tsl"));

test("the Hub71 letter waits for the founder's OK, before and after payment", () => {
  const s = routely();
  assert.equal(status(s).hub71_letter, "needs_input");
  assert.equal(waitingItems(s)[0].key, "consent:hub71_letter");

  const paid = startLanding(s);
  assert.deepEqual(paid.filed.map((f) => f.step), ["desk"], "only the desk is filed without consent");

  const no = provideInput(paid.state, "consent:hub71_letter", "Not yet");
  assert.equal(no.state.inputs["consent:hub71_letter"], "no");
  assert.equal(no.filed.length, 0);

  const yes = provideInput(paid.state, "consent:hub71_letter", "Yes, apply for me");
  assert.equal(yes.state.inputs["consent:hub71_letter"], "yes");
  assert.deepEqual(yes.filed.map((f) => f.step), ["hub71_letter"]);
});

test("incorporation waits for every founder's passport, and the sandbox fills them in one go", () => {
  let s: CaseState = { ...routely(), inputs: { ...routely().inputs, "consent:hub71_letter": "yes" } };
  s = startLanding(s).state;
  s = advance(s, { days: 14 }).state; // letter and desk done; incorporation now depends on passports
  assert.equal(status(s).incorporation, "needs_input");
  const waiting = waitingItems(s);
  assert.ok(waiting.some((w) => w.key === "identity" && w.label.includes("Meera Iyer") && w.label.includes("Arjun Rao")));

  const ids = sandboxIdentities(s);
  assert.deepEqual(ids.map((i) => i.fullName).sort(), ["Anya Iyer", "Arjun Rao", "Meera Iyer", "Rohan Iyer"]);
  const r = saveIdentities(s, ids);
  assert.ok(r.filed.some((f) => f.step === "incorporation"));
  assert.ok(Object.values(r.state.identities ?? {}).every((i) => i.passportLast4.length === 4));
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
  const s = { ...routely(), inputs: { ...routely().inputs, "consent:hub71_letter": "yes" } };
  const list = authorisations(s, "adgm_tsl");
  assert.equal(list[0], "Apply to Hub71 for the eligibility letter");
  assert.ok(list.some((l) => l.includes("Meera Iyer")));
  assert.ok(list.some((l) => l.includes("Rohan and Anya")));
  assert.ok(!authorisations(routely(), "adgm_tsl").some((l) => l.includes("Hub71")), "no consent, no Hub71 application");
});
