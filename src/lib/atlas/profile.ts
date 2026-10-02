// Merges founder-stated facts into the case. Pure, so the save_profile tool and the tests share it.
// Arguments come from the model, so every field is checked by hand and bad values are dropped, never stored.
import type { CaseState, Dependant, Person, Profile } from "./types";
import { relocating, slug } from "./engine.ts";

const STRING_FIELDS = [
  "company",
  "description",
  "website",
  "homeBase",
  "stage",
  "fundingSource",
  "parentEntity",
  "ownership",
  "transactionCountries",
] as const;
const NUMBER_FIELDS = ["fundingUsd", "monthlyVolumeUsd"] as const;

// A "fact" that only says it's missing ("not yet stated", "unknown", "TBD") must stay missing, so the
// agent asks for it and the bank file keeps flagging it.
const PLACEHOLDER_FACT =
  /\b(not (yet )?(stated|provided|confirmed|known|specified|disclosed|given|shared)|unknown|unspecified|tbd|tbc|n\/a|to be (confirmed|provided|determined)|pending confirmation|awaiting)\b/i;
const MUST_BE_REAL = new Set(["fundingSource", "ownership", "transactionCountries"]);

export interface ProfileUpdate {
  state: CaseState;
  changed: string[];
  errors: string[];
}

function parseAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v < 1e12 ? v : null;
  if (typeof v !== "string") return null;
  const m = /^\s*\$?\s*([\d.,]+)\s*([km]?)\b/i.exec(v);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult = m[2].toLowerCase() === "k" ? 1e3 : m[2].toLowerCase() === "m" ? 1e6 : 1;
  return n * mult;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const first = (s: string) => norm(s).split(" ")[0];

function findPerson(people: Person[], name: string): number {
  const n = norm(name);
  const exact = people.findIndex((p) => norm(p.name) === n);
  if (exact >= 0) return exact;
  // "Arjun" matches "Arjun Rao" (and the other way round) when only one person has that first name.
  const matches = people
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => first(p.name) === first(n) && (!n.includes(" ") || !norm(p.name).includes(" ")));
  return matches.length === 1 ? matches[0].i : -1;
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function applyProfile(input: CaseState, raw: unknown): ProfileUpdate {
  const errors: string[] = [];
  const changed: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { state: input, changed, errors: ["Arguments must be an object of profile fields."] };
  }
  const args = raw as Record<string, unknown>;
  const state = structuredClone(input);
  const p: Profile = state.profile;

  for (const key of STRING_FIELDS) {
    const v = args[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") {
      errors.push(`${key} must be a string`);
      continue;
    }
    const s = v.trim().slice(0, 600);
    if (!s || p[key] === s) continue;
    if (MUST_BE_REAL.has(key) && PLACEHOLDER_FACT.test(s)) {
      errors.push(`${key}: leave it out until the founder states it`);
      continue;
    }
    p[key] = s;
    changed.push(key);
  }
  for (const key of NUMBER_FIELDS) {
    const v = args[key];
    if (v === undefined || v === null) continue;
    const n = parseAmount(v);
    if (n === null) {
      errors.push(`${key} must be a non-negative number in USD`);
      continue;
    }
    if (p[key] !== n) {
      p[key] = n;
      changed.push(key);
    }
  }
  if (args.hub71Letter !== undefined && args.hub71Letter !== null) {
    const v = args.hub71Letter;
    if (v === "none" || v === "applied" || v === "have") {
      if (p.hub71Letter !== v) {
        p.hub71Letter = v;
        changed.push("hub71Letter");
      }
    } else errors.push('hub71Letter must be "none", "applied" or "have"');
  }
  if (args.sellsOnshoreUAE !== undefined && args.sellsOnshoreUAE !== null) {
    if (typeof args.sellsOnshoreUAE === "boolean") {
      if (p.sellsOnshoreUAE !== args.sellsOnshoreUAE) {
        p.sellsOnshoreUAE = args.sellsOnshoreUAE;
        changed.push("sellsOnshoreUAE");
      }
    } else errors.push("sellsOnshoreUAE must be true or false");
  }

  // People: upsert by name, so a follow-up about one person never drops the others.
  if (args.people !== undefined) {
    if (!Array.isArray(args.people)) errors.push("people must be an array");
    else {
      for (const [i, item] of args.people.slice(0, 20).entries()) {
        const a = item as Record<string, unknown> | null;
        if (!a || typeof a !== "object" || typeof a.name !== "string" || !a.name.trim()) {
          errors.push(`people[${i}] needs a name`);
          continue;
        }
        const name = a.name.trim().slice(0, 80);
        const idx = findPerson(p.people, name);
        const existing = idx >= 0 ? p.people[idx] : undefined;
        if (a.remove === true) {
          if (existing) {
            p.people.splice(idx, 1);
            delete state.inputs[`relocating:${existing.id}`];
            changed.push(`people:${existing.name}:removed`);
          }
          continue;
        }
        const role = a.role === "employee" || a.role === "founder" ? a.role : (existing?.role ?? "founder");
        const nationality =
          typeof a.nationality === "string" && a.nationality.trim() ? a.nationality.trim().slice(0, 60) : (existing?.nationality ?? null);
        const stated = typeof a.relocating === "boolean";
        const person: Person = {
          id: existing?.id ?? uniqueId(`p-${slug(name)}`, new Set(p.people.map((x) => x.id))),
          name: existing && existing.name.length > name.length ? existing.name : name,
          role,
          nationality,
          relocating: stated ? (a.relocating as boolean) : (existing?.relocating ?? false),
        };
        if (stated) delete state.inputs[`relocating:${person.id}`];
        else if (!existing) state.inputs[`relocating:${person.id}`] = "unconfirmed";
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(person)) changed.push(`people:${person.name}`);
          p.people[idx] = person;
        } else {
          p.people.push(person);
          changed.push(`people:${person.name}`);
        }
      }
    }
  }

  // Dependants: upsert by name (or by relation and sponsor when unnamed). Dependants don't use the company visa quota.
  if (args.dependants !== undefined) {
    if (!Array.isArray(args.dependants)) errors.push("dependants must be an array");
    else {
      state.inputs.dependants = "confirmed";
      const touched = new Set<string>();
      for (const [i, item] of args.dependants.slice(0, 20).entries()) {
        const a = item as Record<string, unknown> | null;
        if (!a || typeof a !== "object" || (a.relation !== "spouse" && a.relation !== "child")) {
          errors.push(`dependants[${i}].relation must be "spouse" or "child"`);
          continue;
        }
        const relation = a.relation;
        const sponsorIdx = typeof a.sponsorName === "string" ? findPerson(p.people, a.sponsorName) : -1;
        const sponsor =
          (sponsorIdx >= 0 ? p.people[sponsorIdx] : undefined) ??
          relocating(p).find((x) => x.role === "founder") ??
          relocating(p)[0] ??
          p.people[0];
        if (!sponsor) {
          errors.push(`dependants[${i}]: save the sponsoring person in people first`);
          continue;
        }
        const name = typeof a.name === "string" && a.name.trim() ? a.name.trim().slice(0, 80) : null;
        const idx = p.dependants.findIndex((d) =>
          name
            ? !!d.name && norm(d.name) === norm(name)
            : !d.name && d.relation === relation && d.sponsorId === sponsor.id && !touched.has(d.id),
        );
        if (a.remove === true) {
          if (idx >= 0) {
            changed.push(`dependants:${p.dependants[idx].name ?? relation}:removed`);
            p.dependants.splice(idx, 1);
          }
          continue;
        }
        const taken = new Set(p.dependants.map((d) => d.id));
        const dep: Dependant = {
          id: idx >= 0 ? p.dependants[idx].id : uniqueId(name ? `d-${slug(name)}` : `d-${relation}-${slug(sponsor.name)}`, taken),
          name,
          relation,
          sponsorId: sponsor.id,
        };
        touched.add(dep.id);
        if (idx >= 0) {
          if (JSON.stringify(p.dependants[idx]) !== JSON.stringify(dep)) changed.push(`dependants:${name ?? relation}`);
          p.dependants[idx] = dep;
        } else {
          p.dependants.push(dep);
          changed.push(`dependants:${name ?? relation}`);
        }
      }
    }
  }

  // Family members are dependants, never company visa holders: drop a person who is also listed as a dependant.
  const dependantNames = new Set(p.dependants.filter((d) => d.name).map((d) => norm(d.name as string)));
  const dependantFirst = new Set([...dependantNames].map((n) => n.split(" ")[0]));
  const sponsors = new Set(p.dependants.map((d) => d.sponsorId));
  for (let i = p.people.length - 1; i >= 0; i--) {
    const person = p.people[i];
    const n = norm(person.name);
    const isFamily = dependantNames.has(n) || (!n.includes(" ") && dependantFirst.has(n));
    if (isFamily && !sponsors.has(person.id)) {
      p.people.splice(i, 1);
      delete state.inputs[`relocating:${person.id}`];
      changed.push(`people:${person.name}:is-dependant`);
    }
  }

  return { state, changed, errors };
}

// ---------- facts that must come from the founder's own words ----------

export interface FactClaim {
  key: string; // "hub71Letter", "fundingSource", "relocating:<name>"
  label: string; // shown to the model when a claim is dropped
  question: string; // a TypeSafe yes/no question about the conversation
}

const quoted = (v: unknown) => `"${String(v).slice(0, 300)}"`;

/**
 * Sensitive facts in a save_profile call that are new or changed: who is relocating, the Hub71 letter, and the
 * bank facts. Each one is checked against the conversation before it's stored, so the agent can't assume them.
 */
export function factClaims(state: CaseState, raw: unknown): FactClaim[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const args = raw as Record<string, unknown>;
  const p = state.profile;
  const claims: FactClaim[] = [];
  const said = "In this conversation, has the founder said";
  const letter = args.hub71Letter;
  if ((letter === "none" || letter === "applied" || letter === "have") && letter !== p.hub71Letter) {
    const what =
      letter === "none"
        ? "that the company does not have a Hub71 eligibility letter"
        : letter === "applied"
          ? "that they have applied for a Hub71 eligibility letter but don't have it yet"
          : "that they already have a Hub71 eligibility letter";
    claims.push({ key: "hub71Letter", label: "the Hub71 letter status", question: `${said} ${what}?` });
  }
  if (Array.isArray(args.people)) {
    for (const item of args.people) {
      const a = item as Record<string, unknown> | null;
      if (!a || typeof a.name !== "string" || typeof a.relocating !== "boolean" || a.remove === true) continue;
      const idx = findPerson(p.people, a.name);
      const existing = idx >= 0 ? p.people[idx] : undefined;
      const known = existing && state.inputs[`relocating:${existing.id}`] !== "unconfirmed";
      if (known && existing.relocating === a.relocating) continue;
      const name = existing?.name ?? a.name.trim();
      claims.push({
        key: `relocating:${name}`,
        label: `whether ${name} is relocating`,
        question: a.relocating
          ? `${said} that ${name} is moving (relocating) to Abu Dhabi?`
          : `${said} that ${name} is not moving to Abu Dhabi, at least for now?`,
      });
    }
  }
  const bank: [string, string, (v: unknown) => string][] = [
    ["fundingSource", "the source of funds", (v) => `explained where the company's money came from (who invested, how much), consistent with ${quoted(v)}`],
    ["ownership", "the ownership", (v) => `stated who owns the company, consistent with ${quoted(v)}`],
    ["monthlyVolumeUsd", "the monthly volume", (v) => `given an expected monthly payment volume of about USD ${String(v)}`],
    ["transactionCountries", "the transaction countries", (v) => `said which countries payments will come from or go to, consistent with ${quoted(v)}`],
  ];
  for (const [key, label, what] of bank) {
    const v = args[key];
    if (v === undefined || v === null || v === "" || v === p[key as keyof Profile]) continue;
    claims.push({ key, label, question: `${said} ${what(v)}?` });
  }
  return claims;
}

/** The same arguments without the claims that weren't supported by the founder's words. */
export function withoutClaims(raw: unknown, dropped: FactClaim[]): unknown {
  if (!dropped.length || !raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const args = { ...(raw as Record<string, unknown>) };
  for (const c of dropped) {
    if (c.key.startsWith("relocating:")) {
      const name = c.key.slice("relocating:".length);
      if (Array.isArray(args.people)) {
        args.people = args.people.map((item) => {
          const a = item as Record<string, unknown> | null;
          if (!a || typeof a.name !== "string" || findPerson([{ id: "x", name, role: "founder", relocating: false }], a.name) < 0) return item;
          const rest = { ...a };
          delete rest.relocating;
          return rest;
        });
      }
    } else delete args[c.key];
  }
  return args;
}
