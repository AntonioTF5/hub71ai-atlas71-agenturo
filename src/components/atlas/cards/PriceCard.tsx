"use client";

import { useState } from "react";
import type { PriceCardData, PriceLine } from "@/lib/atlas/types";
import { SOURCES } from "@/lib/atlas/kb";
import { aed, fmtDate, fmtDateLong, fmtDay, isIsoDate } from "@/lib/atlas/format";
import { useAtlasUi } from "../context";
import { IconCheck, IconExternal, IconInfo, IconReceipt, Spinner } from "../icons";
import { BUTTON, Money, MicroLabel, Notice, SandboxPill, SourceRow, cx } from "../ui";
import { CardShell } from "./CardShell";

const GROUPS: { key: PriceLine["group"]; label: string }[] = [
  { key: "Atlas", label: "Atlas71" },
  { key: "Government", label: "Government fees, at cost" },
  { key: "Provider", label: "Providers, at cost" },
];

function LineSource({ id }: { id?: string }) {
  const s = id ? SOURCES[id] : undefined;
  if (!s) return null;
  if (!s.url) {
    return (
      <span title={s.claim} className="ml-1.5 inline-flex h-5 items-center rounded-full border border-dashed border-line-strong px-1.5 align-[0.1em] text-[11px] font-medium text-muted">
        hypothesis
      </span>
    );
  }
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${s.title}: ${s.claim}`}
      aria-label={`Source: ${s.title} (opens in a new tab)`}
      className="ml-1 inline-grid size-6 place-items-center rounded-full align-[-0.3em] text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
    >
      <IconExternal size={12} />
    </a>
  );
}

function PaidStamp({ on }: { on?: string }) {
  return (
    <div
      aria-hidden="true"
      className="atlas-stamp pointer-events-none absolute right-0 top-1 select-none rounded-[10px] border-[3px] border-double border-good px-3 py-1.5 text-center text-good"
    >
      <span className="block text-[22px] font-bold leading-none tracking-[0.2em]">PAID</span>
      <span className="mt-1 block text-[10.5px] font-semibold uppercase leading-none tracking-[0.08em] tabular-nums">
        {on && isIsoDate(on) ? fmtDateLong(on) : "Sandbox"}
      </span>
    </div>
  );
}

export function PriceCard({ data }: { data: PriceCardData }) {
  const ui = useAtlasUi();
  const [clicked, setClicked] = useState(false);

  const partial = ui.isPartial(data);
  const live = ui.livePrice;
  // A card shows the state it was shown in: only a card built after payment says "Paid".
  const paid = !!data.paid;
  const paidOn = ui.state.paid?.on;
  // The case was paid after this card was shown: no second Confirm & pay, and no retroactive stamp.
  const paidLater = !paid && !!ui.state.paid;
  const total = data.totalAed;
  const otherRoute = !paid && !paidLater && !!live && live.routeName !== data.routeName;
  const outOfDate = !paid && !paidLater && !partial && !!live && !otherRoute && live.totalAed !== data.totalAed;
  const payable = !paid && !paidLater && !partial && !!live && !otherRoute && !outOfDate;
  const lines = data.lines ?? [];

  const pay = () => {
    if (ui.busy) return;
    if (ui.send("Confirm and pay", { type: "pay" })) setClicked(true);
  };

  return (
    <CardShell
      icon={<IconReceipt size={19} />}
      title="Your price"
      subtitle={data.routeName}
      meta={<SandboxPill />}
    >
      <div className={cx("relative", paid && "pr-28 sm:pr-32")}>
        <p className="text-[13px] font-medium text-muted">{partial ? "From" : paid ? "Paid" : "Total"}</p>
        <p className="mt-1.5 text-[42px] font-semibold leading-none tracking-[-0.025em] text-ink sm:text-[46px]">
          <Money amount={total} />
        </p>
        <p className="mt-2 text-[15px] leading-snug text-muted">
          <span className="font-medium text-ink">{partial ? "+ visas, provider quote" : "One price, all-in"}</span>
          {paid ? " · price locked" : isIsoDate(data.validUntil) ? ` · valid until ${fmtDate(data.validUntil)}` : ""}
        </p>
        {paid ? <PaidStamp on={paidOn} /> : null}
      </div>

      <div className="mt-5 space-y-4">
        {GROUPS.map((g) => {
          const rows = lines.filter((l) => l.group === g.key);
          if (!rows.length) return null;
          return (
            <div key={g.key}>
              <MicroLabel>{g.label}</MicroLabel>
              <ul className="mt-1 divide-y divide-line">
                {rows.map((l, i) => (
                  <li key={`${l.label}-${i}`} className="flex items-start justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-pretty text-[15px] leading-snug text-ink">
                        {l.label}
                        <LineSource id={l.sourceId} />
                      </p>
                      {typeof l.qty === "number" && typeof l.unitAed === "number" ? (
                        <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                          {l.qty} × {aed(l.unitAed)}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-[15px] font-medium tabular-nums text-ink">{aed(l.amountAed)}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
          <p className="text-[15px] font-semibold text-ink">{partial ? "From" : "Total"}</p>
          <p className="text-[18px] font-semibold tabular-nums text-ink">{aed(total)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {data.included?.length ? (
          <div>
            <MicroLabel>Included</MicroLabel>
            <ul className="mt-2 space-y-1.5">
              {data.included.map((item, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-snug text-ink">
                  <IconCheck size={15} strokeWidth={2.8} className="mt-[3px] shrink-0 text-good" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.excluded?.length ? (
          <div>
            <MicroLabel>Not included</MicroLabel>
            <ul className="mt-2 space-y-1.5">
              {data.excluded.map((item, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-snug text-muted">
                  <span aria-hidden="true" className="mt-[9px] h-[1.5px] w-2.5 shrink-0 rounded-full bg-muted" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {lines.some((l) => l.sourceId) ? (
        <div className="mt-5 border-t border-line pt-4">
          <SourceRow sources={lines.map((l) => l.sourceId).filter((id): id is string => !!id)} />
        </div>
      ) : null}

      {payable ? (
        <div className="sticky bottom-3 z-10 -mx-1 mt-6 rounded-[18px] bg-surface p-1 pb-2 shadow-[0_-14px_18px_-14px_rgb(16_24_40/0.16)]">
          <button
            type="button"
            onClick={pay}
            disabled={ui.busy}
            className={cx(BUTTON.primary, "h-14 w-full rounded-[14px] text-[16px] shadow-lift")}
          >
            {clicked && ui.busy ? <Spinner size={18} /> : null}
            Confirm &amp; pay {aed(total)}
          </button>
          <p className="mt-2 text-pretty text-center text-[12.5px] leading-snug text-muted">
            Paying authorises Atlas71 to file the steps in your plan on your behalf. Nothing is filed before you pay.
          </p>
          <p className="mt-1 text-center text-[12px] text-muted">Simulated checkout in the sandbox. No card is charged.</p>
        </div>
      ) : null}

      {paidLater && ui.state.paid ? (
        <p className="mt-6 text-[14px] leading-snug text-muted">
          Paid{isIsoDate(ui.state.paid.on) ? ` ${fmtDay(ui.state.paid.on)}` : ""} · see the receipt below.
        </p>
      ) : null}

      {paid ? (
        <p className="mt-6 text-pretty text-[14px] leading-snug text-muted">
          <span className="font-medium text-good">
            Paid{paidOn && isIsoDate(paidOn) ? ` ${fmtDay(paidOn)}` : ""}.
          </span>{" "}
          The price is locked, and Atlas71 files each step as it becomes ready.
        </p>
      ) : null}

      {partial && !paid && !paidLater ? (
        <Notice tone="neutral" icon={<IconInfo size={17} className="text-muted" />} className="mt-6">
          Visa and establishment-card fees come from the free zone&apos;s own quote, so this route can&apos;t be paid here yet.
        </Notice>
      ) : null}

      {otherRoute && !partial && live ? (
        <Notice tone="neutral" icon={<IconInfo size={17} className="text-muted" />} className="mt-6">
          This quote is for {data.routeName}. Your case is on {live.routeName}.
        </Notice>
      ) : null}

      {outOfDate ? (
        <Notice tone="gold" icon={<IconInfo size={17} />} className="mt-6">
          This quote is out of date: your facts changed since. The current price is {aed(live!.totalAed)}.
        </Notice>
      ) : null}
    </CardShell>
  );
}
