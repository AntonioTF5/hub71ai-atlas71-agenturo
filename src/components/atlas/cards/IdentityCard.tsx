import type { IdentityCardData } from "@/lib/atlas/types";
import { fmtDateLong, isIsoDate } from "@/lib/atlas/format";
import { IconAlert, IconBuilding, IconCheck, IconFile, IconLandmark, IconUsers } from "../icons";
import { initialsOf } from "../identity";
import { RichInline } from "../rich-text";
import { Notice, Pill, SandboxPill, cx } from "../ui";
import { CardSection, CardShell } from "./CardShell";

/** Never more than the last 4 characters, whatever arrives. */
function last4(v: string | undefined): string {
  return (v ?? "").replace(/\s+/g, "").slice(-4) || "····";
}

function usedForIcon(text: string) {
  if (/wio|bank/i.test(text)) return <IconLandmark size={15} />;
  if (/seha|medical/i.test(text)) return <IconFile size={15} />;
  if (/visa|permit|emirates id|icp/i.test(text)) return <IconUsers size={15} />;
  return <IconBuilding size={15} />;
}

export function IdentityCard({ data }: { data: IdentityCardData }) {
  const people = data.people ?? [];
  const missing = data.missing ?? [];
  const usedFor = data.usedFor ?? [];
  return (
    <CardShell
      icon={<IconFile size={19} />}
      title="Passport details"
      subtitle="Read once, reused for every filing"
      meta={data.sandbox ? <SandboxPill /> : undefined}
    >
      {people.length ? (
        <ul className="divide-y divide-line">
          {people.map((p) => {
            const name = p.fullName && p.fullName !== p.who ? p.fullName : null;
            return (
              <li key={p.subjectId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink">
                  {initialsOf(p.fullName || p.who)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 text-[15px] font-medium leading-snug text-ink">
                      {p.who}
                      {name ? <span className="font-normal text-muted"> · {name}</span> : null}
                    </p>
                    {p.ok ? (
                      <Pill tone="good" icon={<IconCheck size={12} strokeWidth={3} />}>
                        Valid {p.validMonths} months
                      </Pill>
                    ) : (
                      <Pill tone="warn" icon={<IconAlert size={12} strokeWidth={2.6} />}>
                        Valid {p.validMonths} {p.validMonths === 1 ? "month" : "months"}
                      </Pill>
                    )}
                  </div>
                  <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[13px] leading-snug sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
                    <dt className="text-muted">Nationality</dt>
                    <dd className="text-ink">{p.nationality || "—"}</dd>
                    <dt className="text-muted">Passport</dt>
                    <dd translate="no" className="font-mono text-[12.5px] text-ink">
                      •••• {last4(p.passportLast4)}
                    </dd>
                    <dt className="text-muted">Born</dt>
                    <dd className="tabular-nums text-ink">{isIsoDate(p.dateOfBirth) ? fmtDateLong(p.dateOfBirth) : "—"}</dd>
                    <dt className="text-muted">Expires</dt>
                    <dd className={cx("tabular-nums", p.ok ? "text-ink" : "font-medium text-warn-ink")}>
                      {isIsoDate(p.passportExpiry) ? fmtDateLong(p.passportExpiry) : "—"}
                    </dd>
                  </dl>
                  {!p.ok && p.note ? (
                    <p className="mt-1.5 text-pretty text-[13px] leading-snug text-warn-ink">
                      <RichInline text={p.note} />
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[14px] text-muted">No passport details yet.</p>
      )}

      {missing.length ? (
        <Notice tone="gold" icon={<IconAlert size={17} />} className="mt-4">
          <span className="font-semibold">Still needed:</span> {missing.join(", ")}
        </Notice>
      ) : null}

      {usedFor.length ? (
        <CardSection label="Used for" className="mt-5">
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {usedFor.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink">
                <span className="mt-px shrink-0 text-accent">{usedForIcon(u)}</span>
                <span className="min-w-0">{u}</span>
              </li>
            ))}
          </ul>
        </CardSection>
      ) : null}
    </CardShell>
  );
}
