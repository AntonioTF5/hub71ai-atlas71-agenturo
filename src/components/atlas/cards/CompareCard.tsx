import type { CompareCardData, CompareRow, CompareTopic } from "@/lib/atlas/types";
import { CheckList } from "../checks";
import { IconCheck, IconScale } from "../icons";
import { ChecksMetaPill, Pill, SourceChip, SourceRow, cx } from "../ui";
import { CardSection, CardShell } from "./CardShell";

const TOPICS: { key: CompareTopic; label: string }[] = [
  { key: "taxes", label: "Taxes" },
  { key: "opportunities", label: "Opportunities" },
  { key: "residency", label: "Residency" },
  { key: "work", label: "Working conditions" },
  { key: "costs", label: "Costs" },
];

function k(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

/** "AED 90k–130k", "AED 40k", or "—". */
function range(r: [number, number] | null | undefined): string {
  if (!r || !Array.isArray(r) || typeof r[0] !== "number") return "—";
  const [a, b] = r[0] <= r[1] ? r : [r[1], r[0]];
  return a === b ? `AED ${k(a)}` : `AED ${k(a)}–${k(b)}`;
}

function Cell({ place, value, wins, tint }: { place: string; value: string; wins: boolean; tint: string }) {
  return (
    <div className={cx("min-w-0 rounded-lg px-3 py-2", wins ? tint : "bg-transparent")}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted sm:hidden">{place}</p>
      <p className="flex items-start gap-1.5 text-pretty text-[14px] leading-snug text-ink">
        {wins ? <IconCheck size={14} strokeWidth={2.8} className="mt-[3px] shrink-0 text-current opacity-70" /> : null}
        <span className="min-w-0">{value || "—"}</span>
        {wins ? <span className="sr-only">(better here)</span> : null}
      </p>
    </div>
  );
}

function Row({ row, home }: { row: CompareRow; home: string }) {
  const ids = (row.sourceIds ?? []).filter(Boolean);
  return (
    <li className="grid gap-x-3 gap-y-1.5 px-3 py-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start sm:px-2">
      <div className="min-w-0 sm:px-1 sm:pt-2">
        <p className="text-[14px] font-medium leading-snug text-ink">{row.label}</p>
        {row.matters || ids.length ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {row.matters ? <Pill tone="accent">Matters for you</Pill> : null}
            {ids.map((id) => (
              <SourceChip key={id} id={id} />
            ))}
          </div>
        ) : null}
      </div>
      <Cell place="Abu Dhabi" value={row.abuDhabi} wins={row.edge === "abu_dhabi"} tint="bg-accent-soft text-accent-ink" />
      <Cell place={home} value={row.home} wins={row.edge === "home"} tint="bg-gold-soft text-gold-ink" />
    </li>
  );
}

export function CompareCard({ data }: { data: CompareCardData }) {
  const home = data.homeLabel || data.homeBase || "Home";
  const rows = data.rows ?? [];
  const firstYear = data.firstYear ?? [];
  const known = new Set(TOPICS.map((t) => t.key));
  const extra = rows.filter((r) => !known.has(r.topic));

  return (
    <CardShell
      icon={<IconScale size={19} />}
      title={`Abu Dhabi vs ${home}`}
      subtitle="Does Abu Dhabi fit your business and your life?"
      meta={<ChecksMetaPill meta={data.checksMeta} />}
    >
      {data.verdict ? <p className="text-pretty text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">{data.verdict}</p> : null}

      {rows.length ? (
        <div className="mt-2 hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 px-2 pt-2 sm:grid">
          <span />
          <p className="px-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent-ink">Abu Dhabi</p>
          <p className="px-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{home}</p>
        </div>
      ) : null}

      {[...TOPICS, ...(extra.length ? [{ key: "other" as CompareTopic, label: "Other" }] : [])].map((t) => {
        const group = t.label === "Other" ? extra : rows.filter((r) => r.topic === t.key);
        if (!group.length) return null;
        return (
          <CardSection key={t.label} label={t.label} className="mt-4">
            <ul className="divide-y divide-line rounded-xl border border-line">
              {group.map((r, i) => (
                <Row key={`${r.label}-${i}`} row={r} home={home} />
              ))}
            </ul>
          </CardSection>
        );
      })}

      {firstYear.length ? (
        <CardSection label="First year" className="mt-5">
          <div className="rounded-xl border border-line">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 border-b border-line px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              <span />
              <span className="text-right text-accent-ink">Abu Dhabi</span>
              <span className="min-w-[4.5rem] text-right">{home}</span>
            </div>
            <ul className="divide-y divide-line">
              {firstYear.map((f, i) => (
                <li key={`${f.label}-${i}`} className="px-3.5 py-2.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4">
                    <p className="min-w-0 text-[14px] leading-snug text-ink">{f.label}</p>
                    <p className="text-right text-[14px] font-medium tabular-nums text-ink">{range(f.abuDhabiAed)}</p>
                    <p className="min-w-[4.5rem] text-right text-[14px] tabular-nums text-muted">{range(f.homeAed)}</p>
                  </div>
                  {f.note ? <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{f.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </CardSection>
      ) : null}

      {data.checks?.length ? (
        <CardSection label="AI checks (TypeSafe), not official advice" className="mt-5">
          <CheckList checks={data.checks} />
        </CardSection>
      ) : null}

      {data.sources?.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <SourceRow sources={data.sources} />
        </div>
      ) : null}
    </CardShell>
  );
}
