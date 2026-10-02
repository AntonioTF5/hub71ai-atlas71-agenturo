// TypeSafe judgments: the statement, how likely TypeSafe thinks it's true, and the verdict.
// Shown as an "AI check (TypeSafe)", never as an approval chance.
import type { ReactNode } from "react";
import type { Judgment } from "@/lib/atlas/types";
import { IconAlert, IconCheck, IconFlag } from "./icons";
import { RichInline } from "./rich-text";
import { Pill, cx, type Tone } from "./ui";

const VERDICT: Record<Judgment["verdict"], { tone: Tone; label: string; bar: string; icon: ReactNode }> = {
  pass: { tone: "good", label: "Pass", bar: "bg-good", icon: <IconCheck size={12} strokeWidth={3} /> },
  review: { tone: "gold", label: "Review", bar: "bg-gold", icon: <IconAlert size={12} strokeWidth={2.6} /> },
  flag: { tone: "bad", label: "Flag", bar: "bg-bad", icon: <IconFlag size={12} strokeWidth={2.4} /> },
};

export function VerdictChip({ verdict }: { verdict: Judgment["verdict"] }) {
  const v = VERDICT[verdict] ?? VERDICT.review;
  return (
    <Pill tone={v.tone} icon={v.icon}>
      {v.label}
    </Pill>
  );
}

function clamp01(p: unknown): number {
  const n = typeof p === "number" && Number.isFinite(p) ? p : 0;
  return Math.min(1, Math.max(0, n));
}

/** For "what matters to this founder" questions: a plain answer, never a pass or a fail. */
function AnswerChip({ p }: { p: number }) {
  const label = p >= 0.65 ? "Yes" : p <= 0.35 ? "No" : "Unsure";
  return <Pill tone="neutral" className="min-w-[3.25rem] justify-center text-ink">{label}</Pill>;
}

export function CheckList({ checks, mode = "verdict" }: { checks: Judgment[]; mode?: "verdict" | "answer" }) {
  if (!checks.length) return null;
  return (
    <ul className="divide-y divide-line">
      {checks.map((c, i) => {
        const pct = Math.round(clamp01(c.p) * 100);
        const v = VERDICT[c.verdict] ?? VERDICT.review;
        return (
          <li key={c.key || i} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-1 last:pb-1">
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-[14px] font-medium leading-snug text-ink">{c.label}</p>
              {c.note ? (
                <p className="mt-0.5 text-pretty text-[13px] leading-snug text-muted">
                  <RichInline text={c.note} />
                </p>
              ) : null}
            </div>
            <div className="order-3 flex w-full items-center gap-2.5 sm:order-none sm:w-44">
              <div
                role="img"
                aria-label={`AI check (TypeSafe): ${pct}% likely`}
                className="h-2 flex-1 overflow-hidden rounded-full bg-line"
              >
                <div className={cx("h-full rounded-full", mode === "answer" ? "bg-ink/55" : v.bar)} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <span className="w-9 text-right text-[13px] font-medium tabular-nums text-muted">{pct}%</span>
            </div>
            {mode === "answer" ? <AnswerChip p={clamp01(c.p)} /> : <VerdictChip verdict={c.verdict} />}
          </li>
        );
      })}
    </ul>
  );
}
