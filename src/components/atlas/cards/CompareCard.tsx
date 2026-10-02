"use client";

import { useState } from "react";
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

/** Rows and the column header share this template, so every column starts at the same x. */
const COLS = "sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** A value cell. The tick sits in a fixed left gutter every cell keeps, so text lines up whether or not it wins. */
function Cell({ place, value, wins, tint }: { place: string; value: string; wins: boolean; tint: string }) {
  return (
    <div className={cx("relative min-w-0 rounded-lg py-2 pl-8 pr-3", wins ? tint : "bg-transparent")}>
      {wins ? <IconCheck size={14} strokeWidth={2.8} className="absolute left-3 top-[11px] text-current opacity-70" /> : null}
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted sm:hidden">{place}</p>
      <p className="text-pretty text-[14px] leading-snug text-ink">
        {value || "—"}
        {wins ? <span className="sr-only"> (better here)</span> : null}
      </p>
    </div>
  );
}

/** The first source and "+N" for the rest, so every row reads the same and never turns into a stack of chips. */
function RowSources({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? ids : ids.slice(0, 1);
  const more = ids.length - shown.length;
  return (
    <>
      {shown.map((id) => (
        <SourceChip key={id} id={id} compact />
      ))}
      {more > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Show ${more} more ${more === 1 ? "source" : "sources"}`}
          className="inline-flex h-6 items-center rounded-full border border-line bg-surface px-2 text-[12px] font-medium tabular-nums text-muted transition-colors hover:border-accent hover:text-accent-ink"
        >
          +{more}
        </button>
      ) : null}
    </>
  );
}

function Row({ row, home }: { row: CompareRow; home: string }) {
  const ids = (row.sourceIds ?? []).filter(Boolean);
  return (
    <li className={cx("grid gap-x-3 gap-y-1.5 px-3 py-3 sm:items-start sm:px-2", COLS)}>
      <div className="min-w-0 sm:px-1 sm:pt-2">
        <p className="text-[14px] font-medium leading-snug text-ink">{row.label}</p>
        {row.matters || ids.length ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {row.matters ? <Pill tone="accent">Matters for you</Pill> : null}
            <RowSources ids={ids} />
          </div>
        ) : null}
      </div>
      <Cell place="Abu Dhabi" value={row.abuDhabi} wins={row.edge === "abu_dhabi"} tint="bg-accent-soft text-accent-ink" />
      <Cell place={home} value={row.home} wins={row.edge === "home"} tint="bg-gold-soft text-gold-ink" />
    </li>
  );
}

/** First-year costs: one column template for the header and every row, figures right-aligned and tabular. */
const MONEY_COLS = "sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem]";

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
        // Same template, padding and (transparent) border as the rows below, so the labels sit over their text.
        <div className={cx("mt-3 hidden gap-x-3 border-x border-transparent px-2 sm:grid", COLS)}>
          <span />
          <p className="pl-8 pr-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent-ink">Abu Dhabi</p>
          <p className="pl-8 pr-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{home}</p>
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
            <div className={cx("hidden gap-x-4 border-b border-line px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted sm:grid", MONEY_COLS)}>
              <span />
              <span className="text-right text-accent-ink">Abu Dhabi</span>
              <span className="text-right">{home}</span>
            </div>
            <ul className="divide-y divide-line">
              {firstYear.map((f, i) => (
                <li key={`${f.label}-${i}`} className={cx("grid grid-cols-2 gap-x-4 gap-y-1.5 px-3.5 py-3", MONEY_COLS)}>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className="text-[14px] leading-snug text-ink">{f.label}</p>
                    {f.note ? <p className="mt-0.5 text-pretty text-[12.5px] leading-snug text-muted">{f.note}</p> : null}
                  </div>
                  <p className="text-[14px] font-medium leading-snug tabular-nums text-ink sm:text-right">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-ink sm:hidden">Abu Dhabi</span>
                    {range(f.abuDhabiAed)}
                  </p>
                  <p className="text-[14px] leading-snug tabular-nums text-muted sm:text-right">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] sm:hidden">{home}</span>
                    {range(f.homeAed)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </CardSection>
      ) : null}

      {data.checks?.length ? (
        <CardSection label="AI checks (TypeSafe), not official advice" className="mt-5">
          <CheckList checks={data.checks} mode="answer" />
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
