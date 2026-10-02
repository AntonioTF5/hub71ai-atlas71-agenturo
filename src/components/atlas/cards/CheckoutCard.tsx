"use client";

// The sandbox checkout: an express checkout with saved details, shown when the founder confirms.
// Live, it plays once (fields autofill, Pay processes, then the receipt) in about 2 s, finishing
// before the filings arrive. From history, or with reduced motion, it opens on the receipt.
// The payment already happened on the server, so nothing here is interactive.
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { CheckoutCardData } from "@/lib/atlas/types";
import { aed, fmtDateLong, isIsoDate } from "@/lib/atlas/format";
import { IconCheck, IconLock, IconSparkle, Spinner } from "../icons";
import { Money, cx } from "../ui";

type Phase = "fill" | "processing" | "done";

const STAGGER_MS = 120;
const PROCESSING_AT = 900;
const DONE_AT = 1700;

function GenericCard() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-6 w-9 shrink-0 place-items-end overflow-hidden rounded-[5px] bg-ink p-1"
    >
      <span className="absolute left-1 top-1 h-1.5 w-2 rounded-[2px] bg-gold/80" />
      <span className="flex gap-[2px]">
        <span className="size-1.5 rounded-full bg-white/70" />
        <span className="size-1.5 rounded-full bg-white/40" />
      </span>
    </span>
  );
}

function Field({ label, index, animate, children }: { label: string; index: number; animate: boolean; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12.5px] font-medium text-muted">{label}</p>
      <div
        className={cx(
          "flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink",
          animate && "atlas-autofill",
        )}
        style={animate ? { animationDelay: `${120 + index * STAGGER_MS}ms` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function CheckoutCard({ data, live = false }: { data: CheckoutCardData; live?: boolean }) {
  // Decided once, when the card mounts: a card that arrives mid-stream animates, history doesn't.
  const [animate] = useState(live);
  const [phase, setPhase] = useState<Phase>(live ? "fill" : "done");

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setPhase("processing"), PROCESSING_AT);
    const t2 = setTimeout(() => setPhase("done"), DONE_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [animate]);

  const done = phase === "done";
  const method = data.method ?? { brand: "Card", last4: "0000", expiry: "", label: "Test card" };
  const payer = data.payer ?? { name: "", email: "", company: null, country: null };
  const lines = data.lines ?? [];
  const methodText = `${method.brand} •••• ${method.last4}`;

  const confirmation = (
    <div role="status" className="flex flex-col items-center justify-center px-2 py-6 text-center">
      <span className={cx("grid size-14 place-items-center rounded-full bg-good text-white shadow-lift", animate && "atlas-pop")}>
        <IconCheck size={28} strokeWidth={3} />
      </span>
      <p className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-ink">Payment confirmed</p>
      <p className="mt-1 text-[15px] tabular-nums text-ink">
        {aed(data.amountAed)} · {methodText}
      </p>
      <dl className="mt-4 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-left text-[13px]">
        <dt className="text-muted">Receipt</dt>
        <dd translate="no" className="font-mono text-[12.5px] text-ink">
          {data.receipt}
        </dd>
        {isIsoDate(data.paidOn) ? (
          <>
            <dt className="text-muted">Paid on</dt>
            <dd className="tabular-nums text-ink">{fmtDateLong(data.paidOn)}</dd>
          </>
        ) : null}
      </dl>
      <p className="mt-4 rounded-full bg-gold-soft px-3 py-1 text-[12.5px] font-medium text-gold-ink">Sandbox: no money moved</p>
    </div>
  );

  const form = (
    <div className="space-y-3">
      <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent-ink">
        <IconSparkle size={12} />
        Autofilled from saved details
      </span>
      <Field label="Contact email" index={0} animate={animate}>
        <span className="min-w-0 truncate">{payer.email}</span>
      </Field>
      <Field label="Payment method" index={1} animate={animate}>
        <GenericCard />
        <span className="min-w-0 flex-1 py-1.5 leading-tight">
          <span className="block truncate tabular-nums">{methodText}</span>
          {method.expiry ? <span className="block text-[12.5px] tabular-nums text-muted">Expires {method.expiry}</span> : null}
        </span>
        <span className="shrink-0 rounded-full border border-dashed border-gold px-2 py-0.5 text-[11px] font-semibold text-gold-ink">
          {method.label || "Test card"}
        </span>
      </Field>
      <div className="grid gap-3 @min-[420px]:grid-cols-2">
        <Field label="Name on card" index={2} animate={animate}>
          <span className="min-w-0 truncate">{payer.name}</span>
        </Field>
        <Field label="Country" index={3} animate={animate}>
          <span className="min-w-0 truncate">{payer.country ?? "—"}</span>
        </Field>
      </div>
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none mt-1 flex h-12 w-full select-none items-center justify-center gap-2 rounded-xl text-[16px] font-semibold text-white transition-[transform,background-color] duration-150",
          phase === "processing" ? "scale-[0.985] bg-accent-ink" : "bg-accent shadow-lift",
        )}
      >
        {phase === "processing" ? (
          <>
            <Spinner size={18} />
            Processing…
          </>
        ) : (
          `Pay ${aed(data.amountAed)}`
        )}
      </div>
    </div>
  );

  return (
    <section
      aria-label={`Sandbox checkout, ${aed(data.amountAed)}${done ? ", payment confirmed" : ""}`}
      className="atlas-rise @container overflow-clip rounded-card border border-line bg-surface shadow-card"
    >
      <div className="grid @min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="border-b border-line bg-sunken px-5 py-5 @min-[600px]:border-b-0 @min-[600px]:border-r">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full border border-line bg-surface">
              <Image src="/brand/atlas71-mark.png" width={22} height={22} alt="" className="size-[22px]" />
            </span>
            <p className="text-[14px] font-medium text-muted">Pay {data.merchant || "Atlas71"}</p>
          </div>
          <p className="mt-4 text-[36px] font-semibold leading-none tracking-[-0.025em] text-ink">
            <Money amount={data.amountAed} />
          </p>
          {data.description ? <p className="mt-2 text-pretty text-[14px] leading-snug text-muted">{data.description}</p> : null}
          {lines.length ? (
            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {lines.map((l, i) => (
                <li key={`${l.label}-${i}`} className="flex items-baseline justify-between gap-4 text-[14px]">
                  <span className="min-w-0 text-ink">{l.label}</span>
                  <span className="shrink-0 tabular-nums text-ink">{aed(l.amountAed)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-[15px] font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{aed(data.amountAed)}</span>
          </div>
        </div>

        <div className="px-5 py-5">
          {animate ? (
            <div className="grid">
              <div
                className={cx(
                  "[grid-area:1/1] transition-[opacity,transform] duration-300",
                  done ? "pointer-events-none scale-[0.98] opacity-0" : "opacity-100",
                )}
                aria-hidden={done}
              >
                {form}
              </div>
              <div
                className={cx(
                  "[grid-area:1/1] self-center transition-opacity duration-300",
                  done ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                aria-hidden={!done}
              >
                {done ? confirmation : null}
              </div>
            </div>
          ) : (
            confirmation
          )}
        </div>
      </div>
      <p className="flex items-center gap-2 border-t border-line bg-surface px-5 py-2.5 text-[12.5px] text-muted">
        <IconLock size={14} className="shrink-0" />
        Sandbox checkout · no money moves
      </p>
    </section>
  );
}
