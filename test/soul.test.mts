import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOUL } from "../src/lib/atlas/soul.generated.ts";
import { STATIC_PROMPT } from "../src/lib/atlas/prompt.ts";
import { declineEvents, shouldCheckScope } from "../src/lib/atlas/scope.ts";
import { emptyCase } from "../src/lib/atlas/personas.ts";

const source = readFileSync(new URL("../SOUL.md", import.meta.url), "utf8");
const CHAPTERS = ["identity", "voice", "knowledge", "objectives", "behavior", "constraints", "examples", "output_format"];

test("the generated soul is SOUL.md without its header comment", () => {
  const body = source.replace(/<!--[\s\S]*?-->/g, "");
  assert.equal(SOUL, body.slice(body.indexOf("<identity>")).trim());
});

test("the soul has the eight chapters, in order", () => {
  const at = CHAPTERS.map((c) => SOUL.indexOf(`<${c}>`));
  assert.ok(at.every((i) => i >= 0), `missing chapter: ${CHAPTERS.filter((_, i) => at[i] < 0)}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, "chapters are out of order");
  assert.ok(SOUL.includes("<anti_goals>") && SOUL.includes("<mission>"));
});

test("soul quality: sharp constraints, enough examples, scenarios that include off_topic", () => {
  const constraints = SOUL.slice(SOUL.indexOf("<constraints>"), SOUL.indexOf("</constraints>"));
  const rules = constraints.match(/^\d+\. /gm) ?? [];
  assert.ok(rules.length >= 5 && rules.length <= 12, `${rules.length} constraints`);
  assert.ok(rules.length === (constraints.match(/^\d+\. NEVER /gm) ?? []).length, "every constraint is a NEVER");
  const examples = SOUL.match(/<example>/g) ?? [];
  assert.ok(examples.length >= 5 && examples.length <= 8, `${examples.length} examples`);
  const scenarios = SOUL.match(/<scenario name="/g) ?? [];
  assert.ok(scenarios.length >= 5 && scenarios.length <= 15, `${scenarios.length} scenarios`);
  assert.ok(SOUL.includes('<scenario name="off_topic">'));
  assert.ok(/bitcoin/i.test(SOUL), "an off-topic example is in the soul");
});

test("the prompt is the soul with the knowledge base slotted in", () => {
  assert.ok(!STATIC_PROMPT.includes("{{KNOWLEDGE}}"));
  assert.ok(STATIC_PROMPT.startsWith("<identity>"));
  assert.ok(STATIC_PROMPT.includes("Knowledge (checked 2 Oct 2026"));
  assert.ok(STATIC_PROMPT.indexOf("Knowledge (checked") < STATIC_PROMPT.indexOf("<objectives>"), "knowledge sits in its own chapter");
  assert.ok(!/it's free/i.test(STATIC_PROMPT), "the Hub71 letter is never called free");
});

test("the scope guard skips buttons, files, taps Atlas71 offers and one- or two-word replies", () => {
  const none = { hasFiles: false, hasAction: false };
  assert.equal(shouldCheckScope("what's the bitcoin price?", none), true);
  assert.equal(shouldCheckScope("No", none), false);
  assert.equal(shouldCheckScope("Not yet", none), false);
  assert.equal(shouldCheckScope("Both of us", none), true, "three words or more are judged with the previous message as context");
  assert.equal(shouldCheckScope("what's the bitcoin price?", { hasFiles: true, hasAction: false }), false);
  assert.equal(shouldCheckScope("Fast-forward 2 weeks", { hasFiles: false, hasAction: true }), false);
  assert.equal(shouldCheckScope("What can you help with?", none), false);
  assert.equal(shouldCheckScope("Pick up where we left off", none), false);
});

test("the decline names the company, says what Atlas71 does and offers two taps back", () => {
  const s = emptyCase("2026-10-02", "routely");
  const bare = declineEvents(s);
  assert.equal(bare[0].t, "text");
  const withCompany = declineEvents({ ...s, profile: { ...s.profile, company: "Routely" } });
  assert.ok((withCompany[0] as { d: string }).d.includes("Routely"));
  assert.ok((withCompany[0] as { d: string }).d.includes("land a company in Abu Dhabi"));
  const choices = withCompany[1] as { t: "choices"; options: string[] };
  assert.equal(choices.t, "choices");
  assert.deepEqual(choices.options, ["Pick up where we left off", "What can you help with?"]);
});
