import type { DocumentsCardData } from "@/lib/atlas/types";
import { IconCheck, IconFile, IconLandmark } from "../icons";
import { SandboxPill } from "../ui";
import { CardSection, CardShell } from "./CardShell";

/** The investor documents a founder uploaded, and exactly what Atlas71 read from them. */
export function DocumentsCard({ data }: { data: DocumentsCardData }) {
  const files = data.files ?? [];
  const facts = data.facts ?? [];
  const usedFor = data.usedFor ?? [];
  return (
    <CardShell
      icon={<IconFile size={19} />}
      title="Investor documents"
      subtitle="Read once, used for the bank file"
      meta={data.sandbox ? <SandboxPill /> : undefined}
    >
      {files.length ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li
              key={f}
              translate="no"
              className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-line bg-sunken px-3 py-1.5 text-[13px] text-ink"
            >
              <IconFile size={14} className="shrink-0 text-muted" />
              <span className="truncate">{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {facts.length ? (
        <dl className="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-[14.5px] leading-snug">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted">{f.label}</dt>
              <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {usedFor.length ? (
        <CardSection label="Used for" className="mt-5">
          <ul className="space-y-1.5">
            {usedFor.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink">
                <span className="mt-px shrink-0 text-accent">
                  {/bank/i.test(u) ? <IconLandmark size={15} /> : <IconCheck size={15} strokeWidth={2.6} />}
                </span>
                <span className="min-w-0">{u}</span>
              </li>
            ))}
          </ul>
        </CardSection>
      ) : null}
    </CardShell>
  );
}
