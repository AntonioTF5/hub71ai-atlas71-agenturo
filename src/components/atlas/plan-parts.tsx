// Milestone tiles and step rows, shared by the plan card (full) and the tracker (compact).
import type { ReactNode } from "react";
import type { Milestone, PlanStep } from "@/lib/atlas/types";
import { aed, fmtDate, fmtDateLong, fmtDay, fmtRange } from "@/lib/atlas/format";
import { IconCheck } from "./icons";
import { RichInline } from "./rich-text";
import { StatusIcon, StatusTag, cx } from "./ui";

function safeRange(a?: string, b?: string): string {
  if (!a && !b) return "—";
  if (!a) return fmtDate(b!);
  if (!b) return fmtDate(a);
  return a <= b ? fmtRange(a, b) : fmtRange(b, a);
}

export function milestoneRange(m: Milestone): string {
  if (!m.best) return "—";
  return m.typical ? safeRange(m.best, m.typical) : fmtDate(m.best);
}

export function MilestoneTiles({ milestones, compact = false }: { milestones: Milestone[]; compact?: boolean }) {
  if (!milestones.length) return null;
  return (
    <ul className={cx("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
      {milestones.map((m) => {
        const done = !!m.doneOn;
        return (
          <li
            key={m.key}
            className={cx(
              "min-w-0 rounded-xl border px-3 py-2.5",
              done ? "border-transparent bg-good-soft" : "border-line bg-sunken",
            )}
          >
            <p className={cx("truncate text-[12px] font-semibold uppercase tracking-[0.08em]", done ? "text-good" : "text-muted")}>
              {m.label}
            </p>
            {done ? (
              <p className="mt-1 flex items-center gap-1.5 text-[16px] font-semibold leading-tight tabular-nums text-good">
                <IconCheck size={16} strokeWidth={3} />
                {fmtDate(m.doneOn!)}
              </p>
            ) : (
              <p className="mt-1 text-[16px] font-semibold leading-tight tabular-nums text-ink">{milestoneRange(m)}</p>
            )}
            <p className="mt-0.5 text-[12px] leading-tight text-muted">{done ? "Done" : m.best ? "best – typical" : "Not in this plan"}</p>
          </li>
        );
      })}
    </ul>
  );
}

function deadlineText(deadline: string, today: string): string {
  return deadline.slice(0, 4) !== today.slice(0, 4) ? fmtDateLong(deadline) : fmtDate(deadline);
}

/** A full plan row: status, title + who, provider, best and typical windows, fee, deadline, note. */
export function StepRow({ step, today }: { step: PlanStep; today: string }) {
  const fee = typeof step.feeAed === "number" ? aed(step.feeAed) : null;
  const best = step.best ?? ["", ""];
  const typical = step.typical ?? ["", ""];
  return (
    <li className="flex gap-3 py-3 first:pt-1 last:pb-1">
      <span className="pt-px">
        <StatusIcon status={step.status} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-[15px] font-medium leading-snug text-ink">
            {step.title}
            {step.who ? <span className="font-normal text-muted"> · {step.who}</span> : null}
          </p>
          <StatusTag status={step.status} />
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          <span>{step.provider}</span>
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">
            {step.doneOn ? (
              <span className="font-medium text-good">Done {fmtDay(step.doneOn)}</span>
            ) : (
              <>
                Best {safeRange(best[0], best[1])} · Typical {safeRange(typical[0], typical[1])}
              </>
            )}
          </span>
          {fee ? (
            <span className="sm:hidden">
              <span aria-hidden="true"> · </span>
              <span className="tabular-nums text-ink">{fee}</span>
            </span>
          ) : null}
        </p>
        {step.deadline && step.status !== "done" ? (
          <p className="mt-1 text-[13px] font-semibold leading-snug text-warn-ink">Due by {deadlineText(step.deadline, today)}</p>
        ) : null}
        {step.note ? (
          <p className="mt-1 text-pretty text-[13px] leading-snug text-muted">
            <RichInline text={step.note} />
          </p>
        ) : null}
      </div>
      {fee ? <p className="hidden shrink-0 pt-px text-[14px] font-medium tabular-nums text-ink sm:block">{fee}</p> : null}
    </li>
  );
}

/** A compact tracker row: status, title, and the one date that matters now. */
export function CompactStepRow({ step, etaOn }: { step: PlanStep; etaOn?: string }) {
  let when: ReactNode;
  if (step.doneOn) when = <span className="text-good">{fmtDate(step.doneOn)}</span>;
  else if (step.status === "needs_input") when = <span className="font-semibold text-gold-ink">Your move</span>;
  else if ((step.status === "filed" || step.status === "in_review") && etaOn) when = <>ETA {fmtDate(etaOn)}</>;
  else when = safeRange(step.best?.[1], step.typical?.[1]);
  return (
    <li className="flex items-start gap-2.5 py-[7px]">
      <span className="pt-px">
        <StatusIcon status={step.status} size={18} />
      </span>
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
        {step.title}
        {step.who ? <span className="text-muted"> · {step.who.split(" ")[0]}</span> : null}
      </p>
      <span className="shrink-0 pt-px text-[12.5px] tabular-nums text-muted">{when}</span>
    </li>
  );
}
