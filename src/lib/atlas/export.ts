// The landing pack: a Markdown summary and the full case as JSON, built in the browser from CaseState.
import type { CaseState, PlanStep } from "./types";
import { KB_CHECKED_ON, ROUTES, SOURCES } from "./kb.ts";
import { buildPlan, dayNumber, quote, slug } from "./engine.ts";
import { aed, fmtDate, fmtDateLong, fmtRange } from "./format.ts";

const STATUS_LABEL: Record<PlanStep["status"], string> = {
  locked: "Waiting on another step",
  ready: "Ready to file",
  needs_input: "Waiting on you",
  filed: "Filed",
  in_review: "In review",
  done: "Done",
};

/** "[source:adgm-tsl]" → a Markdown link to the source. */
function linkSources(text: string, used: Set<string>): string {
  return text.replace(/\[source:([a-z0-9-]+)\]/g, (_, id: string) => {
    const s = SOURCES[id];
    if (!s) return "";
    used.add(id);
    return s.url ? `([${s.title}](${s.url}))` : `(${s.title})`;
  });
}

export function packFileName(state: CaseState, ext: "md" | "json"): string {
  return `atlas71-${slug(state.profile.company ?? "case")}-${state.today}.${ext}`;
}

export function buildMarkdownPack(state: CaseState): string {
  const p = state.profile;
  const used = new Set<string>();
  const L = (t: string) => linkSources(t, used);
  const plan = buildPlan(state);
  const q = quote(state);
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    `# Atlas71 landing pack: ${p.company ?? "your company"}`,
    "",
    `Generated ${fmtDateLong(state.today)} (day ${dayNumber(state)} of the landing).`,
    "",
    "> Sandbox: integrations, filings and approvals are simulated and the founders are fictional. TypeSafe results are AI checks, not official decisions. Nothing here guarantees an approval.",
    "",
    "## Company",
    "",
  );
  const facts: [string, string | null][] = [
    ["Company", p.company],
    ["What it does", p.description],
    ["Website", p.website],
    ["Based in", p.homeBase],
    ["Stage", p.stage],
    ["Raised", p.fundingUsd != null ? `USD ${p.fundingUsd.toLocaleString("en-US")}` : null],
    ["Source of funds", p.fundingSource],
    ["Parent entity", p.parentEntity],
    ["Ownership", p.ownership],
    ["Expected monthly volume", p.monthlyVolumeUsd != null ? `USD ${p.monthlyVolumeUsd.toLocaleString("en-US")}` : null],
    ["Transaction countries", p.transactionCountries],
  ];
  for (const [k, v] of facts) if (v) push(`- **${k}:** ${v}`);

  push("", "## People", "");
  for (const person of p.people) {
    push(`- ${person.name} (${person.role})${person.relocating ? ", relocating" : ", not relocating"}`);
  }
  for (const d of p.dependants) {
    const sponsor = p.people.find((x) => x.id === d.sponsorId);
    push(`- ${d.name ?? d.relation} (${d.relation}${sponsor ? ` of ${sponsor.name}` : ""}), dependant visa`);
  }

  if (state.fit && state.route) {
    const r = ROUTES[state.route];
    push("", "## Route", "", `**${r.name}**, licence ${aed(r.licenceAed)} in year one. ${r.law}.`, "");
    for (const reason of state.fit.reasons) push(`- ${L(reason)}`);
    for (const flag of state.fit.flags) push(`- Note: ${L(flag)}`);
    if (state.fit.judgments.length) {
      push("", `AI checks (TypeSafe${state.fit.meta.model ? `, ${state.fit.meta.model}` : ""}), not official decisions:`, "");
      for (const j of state.fit.judgments) push(`- ${j.label}: ${j.verdict} (p = ${j.p.toFixed(2)})`);
    }
  }

  if (q) {
    push("", "## Price", "", `**${aed(q.totalAed)}**, one price, all-in${q.paid && state.paid ? `. Paid ${fmtDateLong(state.paid.on)}; locked.` : `. Valid until ${fmtDateLong(q.validUntil)}.`}`, "");
    push("| Item | Group | Qty | AED |", "|---|---|---:|---:|");
    for (const l of q.lines) {
      push(`| ${l.label} | ${l.group === "Atlas" ? "Atlas71" : l.group} | ${l.qty ?? ""} | ${l.amountAed.toLocaleString("en-US")} |`);
      if (l.sourceId) used.add(l.sourceId);
    }
    push("", "Included: " + q.included.join("; ") + ".", "", "Not included: " + q.excluded.join("; ") + ".");
  }

  if (plan) {
    push("", "## Milestones", "");
    for (const m of plan.milestones) {
      push(`- **${m.label}:** ${m.doneOn ? `done ${fmtDateLong(m.doneOn)}` : m.best ? `best ${fmtDate(m.best)}, typical ${fmtDate(m.typical)}` : "n/a"}`);
    }
    for (const g of plan.groups) {
      push("", `### ${g.label}`, "");
      for (const s of g.steps) {
        const filing = state.filings.find((f) => f.id === s.id);
        const dates = s.doneOn ? `done ${fmtDate(s.doneOn)}` : `best ${fmtRange(s.best[0], s.best[1])}, typical ${fmtRange(s.typical[0], s.typical[1])}`;
        push(
          `- **${s.title}**${s.who ? ` (${s.who})` : ""}: ${STATUS_LABEL[s.status]} · ${s.provider} · ${dates}${s.feeAed ? ` · ${aed(s.feeAed)}` : ""}${filing ? ` · ref \`${filing.ref}\`` : ""}${s.deadline ? ` · due by ${fmtDateLong(s.deadline)}` : ""}`,
        );
      }
    }
  }

  if (state.events.length) {
    push("", "## Timeline", "");
    for (const e of state.events) push(`- ${fmtDate(e.on)} · ${L(e.text)}`);
  }

  if (state.bankFile) {
    const b = state.bankFile;
    push("", "## Bank file (Wio Business)", "", b.ready ? "Prepared for bank review." : "Not ready yet.", "");
    for (const s of b.sections) push(`**${s.title}.** ${s.body}`, "");
    if (b.checks.length) {
      push("AI checks (TypeSafe), not official decisions:", "");
      for (const c of b.checks) push(`- ${c.label}: ${c.verdict} (p = ${c.p.toFixed(2)})`);
    }
  }

  if (used.size) {
    push("", `## Sources (checked ${fmtDateLong(KB_CHECKED_ON)})`, "");
    for (const id of used) {
      const s = SOURCES[id];
      push(`- ${s.url ? `[${s.title}](${s.url})` : s.title} (${s.status}): ${s.claim}`);
    }
  }
  return out.join("\n") + "\n";
}

export function buildJsonPack(state: CaseState): string {
  return JSON.stringify(
    {
      product: "Atlas71",
      sandbox: true,
      generatedOn: state.today,
      case: state,
      plan: buildPlan(state),
      price: quote(state),
    },
    null,
    2,
  );
}
