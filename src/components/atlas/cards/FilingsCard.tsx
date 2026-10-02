import type { FilingsCardData } from "@/lib/atlas/types";
import { fmtDate, fmtDay, isIsoDate } from "@/lib/atlas/format";
import { IconSend } from "../icons";
import { Monogram, Pill, SandboxPill, type Tone } from "../ui";
import { CardShell } from "./CardShell";

const STATUS: Record<FilingsCardData["items"][number]["status"], { tone: Tone; label: string }> = {
  filed: { tone: "accent", label: "Filed" },
  in_review: { tone: "accent", label: "In review" },
  done: { tone: "good", label: "Done" },
};

export function FilingsCard({ data }: { data: FilingsCardData }) {
  const items = data.items ?? [];
  const filedOn = items.find((i) => isIsoDate(i.filedOn))?.filedOn;
  return (
    <CardShell
      icon={<IconSend size={18} />}
      title={items.length === 1 ? "Filed for you" : `Filed for you · ${items.length} filings`}
      subtitle={filedOn ? `Submitted ${fmtDay(filedOn)} through Atlas71's integrations` : "Submitted through Atlas71's integrations"}
      meta={<SandboxPill />}
    >
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((f, i) => {
            const st = STATUS[f.status] ?? STATUS.filed;
            return (
              <li key={`${f.ref}-${i}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Monogram provider={f.provider} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[15px] font-medium leading-snug text-ink">
                      {f.title}
                      {f.who ? <span className="font-normal text-muted"> · {f.who}</span> : null}
                    </p>
                    <Pill tone={st.tone} className="mt-px">
                      {st.label}
                    </Pill>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-snug text-muted">
                    <span>{f.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span translate="no" className="min-w-0 break-all font-mono text-[12.5px] tracking-tight text-ink sm:break-normal sm:whitespace-nowrap">
                      {f.ref}
                    </span>
                    {isIsoDate(f.etaOn) ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {f.status === "done" ? "Issued" : "ETA"} {fmtDate(f.etaOn)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[14px] text-muted">Nothing new was filed.</p>
      )}
    </CardShell>
  );
}
