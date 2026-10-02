// The save_identity tool: passport details read once (from the founder's photos, or the demo personas'
// saved passports) and reused by every filing. Server only. Only the last 4 passport characters are kept.
import type OpenAI from "openai";
import type { CaseState, IdentityDetails, StreamEvent } from "./types";
import { filingsCard, identityCard, kycSubjects, sandboxIdentities, saveIdentities, waitingItems } from "./engine.ts";
import { isIsoDate } from "./format.ts";

interface Ctx {
  state: CaseState;
  emit: (e: StreamEvent) => void;
}

export const SAVE_IDENTITY_TOOL: OpenAI.Chat.ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: "save_identity",
    description:
      'Save passport details for the people Atlas71 files for, then show the details card. source "saved" uses the founder\'s saved passports (demo accounts). source "document" is for passport photos or PDFs the founder attached: pass only the fields you can actually read; never guess.',
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", enum: ["saved", "document"] },
        people: {
          type: "array",
          description: 'For source "document": one entry per passport you read.',
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Who this passport belongs to, as named in the case (e.g. Meera Iyer, Rohan)." },
              fullName: { type: "string", description: "Name exactly as printed in the passport." },
              nationality: { type: "string" },
              passportNumber: { type: "string", description: "As printed; only its last 4 characters are stored." },
              dateOfBirth: { type: "string", description: "YYYY-MM-DD" },
              passportExpiry: { type: "string", description: "YYYY-MM-DD" },
              sex: { type: "string", enum: ["F", "M", "X"] },
            },
            required: ["name", "fullName", "nationality", "passportNumber", "dateOfBirth", "passportExpiry"],
            additionalProperties: false,
          },
        },
      },
      required: ["source"],
      additionalProperties: false,
    },
  },
};

const ok = (o: unknown) => JSON.stringify(o);
const fail = (error: string) => JSON.stringify({ error });
const first = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

export function executeSaveIdentity(args: Record<string, unknown>, ctx: Ctx): string {
  const subjects = kycSubjects(ctx.state);
  if (!subjects.length) return fail("Save who is moving first; there's no one to file for yet.");
  let entries: IdentityDetails[] = [];
  const problems: string[] = [];

  if (args.source === "saved") {
    entries = sandboxIdentities(ctx.state);
    if (!entries.length) return fail("There are no saved passports for this founder. Ask them to attach passport photos instead.");
  } else if (args.source === "document") {
    const people = Array.isArray(args.people) ? args.people.slice(0, 12) : [];
    if (!people.length) return fail("Pass the passports you read in people[].");
    for (const raw of people) {
      const a = (raw ?? {}) as Record<string, unknown>;
      const name = typeof a.name === "string" ? a.name : "";
      const subject =
        subjects.find((s) => s.who.toLowerCase() === name.toLowerCase()) ?? subjects.find((s) => first(s.who) === first(name));
      const number = typeof a.passportNumber === "string" ? a.passportNumber.replace(/\s+/g, "") : "";
      if (!subject) {
        problems.push(`${name || "A passport"} doesn't match anyone in the case.`);
        continue;
      }
      if (typeof a.fullName !== "string" || typeof a.nationality !== "string" || number.length < 5) {
        problems.push(`Couldn't read every field for ${subject.who}.`);
        continue;
      }
      if (!isIsoDate(a.dateOfBirth) || !isIsoDate(a.passportExpiry)) {
        problems.push(`Dates for ${subject.who} must be YYYY-MM-DD.`);
        continue;
      }
      entries.push({
        subjectId: subject.id,
        fullName: a.fullName.trim().slice(0, 80),
        nationality: a.nationality.trim().slice(0, 40),
        passportLast4: number.slice(-4),
        dateOfBirth: a.dateOfBirth,
        passportExpiry: a.passportExpiry,
        sex: a.sex === "F" || a.sex === "M" || a.sex === "X" ? a.sex : undefined,
        source: "document",
      });
    }
    if (!entries.length) return fail(problems.join(" ") || "No passport could be saved.");
  } else {
    return fail('source must be "saved" or "document".');
  }

  const r = saveIdentities(ctx.state, entries);
  ctx.state = r.state;
  ctx.emit({ t: "state", state: r.state });
  const card = identityCard(r.state);
  ctx.emit({ t: "card", card: { kind: "identity", data: card } });
  if (r.filed.length) ctx.emit({ t: "card", card: { kind: "filings", data: filingsCard(r.state, r.filed) } });
  return ok({
    saved: card.people.map((p) => `${p.who}: ${p.nationality} passport ending ${p.passportLast4}, valid ${p.validMonths} months${p.ok ? "" : " (too short for a residence visa)"}`),
    missing: card.missing,
    problems: problems.length ? problems : undefined,
    filed: r.filed.map((f) => f.step),
    waitingOnFounder: waitingItems(r.state).map((w) => w.label),
    note: "The details card is on screen. Never repeat full passport numbers. If anyone is missing, ask for their passport; otherwise move on (usually: Confirm & pay).",
  });
}
