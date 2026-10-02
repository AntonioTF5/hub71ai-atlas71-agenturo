"use client";

// "Your landing": the live mirror of the case. A sticky side panel from 1100px, a bottom sheet below.
import type { ReactNode } from "react";
import type { AgentAction, CaseState, PlanCardData, PriceCardData, Profile } from "@/lib/atlas/types";
import { fmtDate, fmtDay, fmtSimDay, isIsoDate } from "@/lib/atlas/format";
import { IconCheck, IconFastForward, IconRoute, IconSkip } from "./icons";
import { CompactStepRow, MilestoneTiles } from "./plan-parts";
import { RichInline } from "./rich-text";
import { MicroLabel, Money, SandboxPill, cx } from "./ui";

export const ADVANCE: { key: string; label: string; text: string; action: AgentAction; icon: ReactNode }[] = [
  { key: "week", label: "+1 week", text: "Fast-forward 1 week", action: { type: "advance", days: 7 }, icon: <IconFastForward size={15} /> },
  { key: "two", label: "+2 weeks", text: "Fast-forward 2 weeks", action: { type: "advance", days: 14 }, icon: <IconFastForward size={15} /> },
  { key: "next", label: "Next event", text: "Skip to the next event", action: { type: "advance", untilNextEvent: true }, icon: <IconSkip size={14} /> },
];

/** +1 week, +2 weeks, Next event. Only rendered once the case is paid. */
export function TimeControls({
  busy,
  onAdvance,
  compact = false,
  className,
}: {
  busy: boolean;
  onAdvance: (text: string, action: AgentAction) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Move the simulated clock" className={cx("flex", compact ? "gap-2" : "gap-1.5", className)}>
      {ADVANCE.map((a) => (
        <button
          key={a.key}
          type="button"
          disabled={busy}
          onClick={() => onAdvance(a.text, a.action)}
          className={cx(
            "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-surface text-[14px] font-medium text-ink transition-colors",
            "hover:border-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-strong disabled:hover:text-ink",
            compact ? "shrink-0 px-3 max-sm:flex-1 max-sm:px-2" : "min-w-0 flex-1 px-2",
          )}
        >
          <span className={cx("text-accent", compact && "max-sm:hidden")}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function facts(
  p: Profile,
  inputs: Record<string, string> = {},
  filings: CaseState["filings"] = [],
): { label: string; value: ReactNode }[] {
  const out: { label: string; value: ReactNode }[] = [];
  const movers = p.people.filter((x) => x.relocating);
  const unsure = p.people.filter((x) => inputs[`relocating:${x.id}`] === "unconfirmed");
  const staying = p.people.filter((x) => !x.relocating && !unsure.includes(x));
  if (p.homeBase || p.stage) out.push({ label: "From", value: [p.homeBase, p.stage].filter(Boolean).join(" · ") });
  if (movers.length) {
    out.push({
      label: "Moving",
      value: movers.map((m) => `${m.name}${m.role === "founder" ? " (founder)" : ""}`).join(", "),
    });
  }
  if (p.dependants.length) {
    out.push({
      label: "Family",
      value: p.dependants.map((d) => `${d.name ?? (d.relation === "spouse" ? "Spouse" : "Child")} (${d.relation})`).join(", "),
    });
  }
  if (staying.length) out.push({ label: "Staying", value: staying.map((s) => s.name).join(", ") });
  if (unsure.length) out.push({ label: "Not sure yet", value: unsure.map((s) => s.name).join(", ") });
  if (p.hub71Letter) {
    const letter = filings.find((f) => f.step === "hub71_letter");
    out.push({
      label: "Hub71 letter",
      value:
        letter?.status === "done" && letter.doneOn
          ? `Issued ${fmtDate(letter.doneOn)}`
          : letter
            ? `Filed · ETA ${fmtDate(letter.etaOn)}`
            : p.hub71Letter === "have"
              ? "Have it"
              : p.hub71Letter === "applied"
                ? "Applied"
                : inputs["consent:hub71_letter"] === "yes"
                  ? "Not yet · you asked Atlas71 to apply"
                  : "Not yet · asks your OK first",
    });
  }
  if (p.fundingSource || (p.fundingUsd ?? 0) > 0) {
    out.push({ label: "Funding", value: p.fundingSource ?? usd(p.fundingUsd as number) });
  }
  if (p.parentEntity) out.push({ label: "Parent", value: p.parentEntity });
  return out;
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("border-t border-line px-5 py-4", className)}>{children}</section>;
}

export function TrackerPanel({
  state,
  plan,
  price,
  partial,
  waiting,
  day,
  busy,
  onAdvance,
  headingId,
}: {
  state: CaseState;
  plan: PlanCardData | null;
  price: PriceCardData | null;
  partial: boolean;
  waiting: string[];
  day: number;
  busy: boolean;
  onAdvance: (text: string, action: AgentAction) => void;
  headingId?: string;
}) {
  const p = state.profile;
  const factList = facts(p, state.inputs, state.filings);
  const etas = new Map(state.filings.map((f) => [f.id, f.etaOn]));
  const steps = plan?.groups.flatMap((g) => g.steps) ?? [];
  const done = steps.filter((s) => s.status === "done").length;

  return (
    <div className="pb-6">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-[12px] font-semibold uppercase leading-4 tracking-[0.09em] text-ink">
            Your landing
          </h2>
          <SandboxPill />
        </div>
        <p className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.015em] tabular-nums text-ink">
          {isIsoDate(state.startDate) && isIsoDate(state.today) ? fmtSimDay(state.startDate, state.today) : `Day ${day}`}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">
          Simulated clock{isIsoDate(state.startDate) ? ` · started ${fmtDay(state.startDate)}` : ""}
          {plan && steps.length ? ` · ${done} of ${steps.length} steps done` : ""}
        </p>
        {state.paid ? <TimeControls busy={busy} onAdvance={onAdvance} className="mt-3.5" /> : null}
      </div>

      {waiting.length ? (
        <Section>
          <div className="rounded-xl bg-gold-soft px-3.5 py-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-gold-ink">
              <span className="grid size-[18px] place-items-center rounded-full bg-gold text-[11px] font-bold text-white" aria-hidden="true">
                !
              </span>
              Waiting on you
            </p>
            <ul className={cx("mt-2", waiting.length > 1 ? "space-y-2" : undefined)}>
              {waiting.map((w, i) => (
                <li key={i} className="flex gap-2.5 text-pretty text-[14px] leading-snug text-ink">
                  {waiting.length > 1 ? (
                    <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold" />
                  ) : null}
                  <span className="min-w-0">
                    <RichInline text={w} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      <Section>
        <p className="text-[18px] font-semibold leading-snug text-ink">{p.company ?? "Your company"}</p>
        {p.description ? <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-muted">{p.description}</p> : null}
        {factList.length ? (
          <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px] leading-snug">
            {factList.map((f) => (
              <div key={f.label} className="contents">
                <dt className="atlas-fade text-muted">{f.label}</dt>
                <dd className="atlas-fade min-w-0 text-ink [overflow-wrap:anywhere]">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-[14px] leading-snug text-muted">Facts appear here as you tell Atlas71 about your company.</p>
        )}
      </Section>

      {plan ? (
        <>
          <Section>
            <MicroLabel>Route</MicroLabel>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{plan.routeName}</p>
            {price ? (
              <div className="mt-3">
                <MicroLabel>{state.paid ? "Paid" : partial ? "From" : "Price"}</MicroLabel>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {state.paid ? <IconCheck size={20} strokeWidth={3} className="self-center text-good" /> : null}
                  <Money amount={state.paid ? state.paid.amountAed : price.totalAed} />
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {state.paid ? "Price locked" : partial ? "+ visas, provider quote" : "One price, all-in"}
                </p>
              </div>
            ) : null}
          </Section>

          <Section>
            <MicroLabel className="mb-2">Milestones</MicroLabel>
            <MilestoneTiles milestones={plan.milestones} compact />
          </Section>

          {plan.groups.map((g) => (
            <Section key={g.label} className="py-3">
              <MicroLabel className="mb-1">{g.label}</MicroLabel>
              <ul>
                {g.steps.map((s) => (
                  <CompactStepRow key={s.id} step={s} etaOn={etas.get(s.id)} />
                ))}
              </ul>
            </Section>
          ))}
        </>
      ) : (
        <Section>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-5 py-7 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
              <IconRoute size={19} />
            </span>
            <p className="max-w-[24ch] text-pretty text-[14px] leading-snug text-muted">
              Your plan appears here once Atlas71 picks a route.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
