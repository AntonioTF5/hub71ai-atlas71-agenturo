"use client";

// The sandbox express checkout. It follows the shape of a saved-details one-click checkout
// (email recognised → one-time code → saved card → consent → pay → receipt) in Atlas71's own look.
// Live, it plays once in about 4.8 s, before the server sends the filings. From history, or with
// reduced motion, it opens on the receipt. The payment already happened on the server, so nothing
// here is interactive except the "and N more" disclosure.
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { CheckoutCardData } from "@/lib/atlas/types";
import { aed, fmtDateLong, isIsoDate } from "@/lib/atlas/format";
import { IconCheck, IconChevronDown, IconLock, Spinner } from "../icons";
import { Money, cx } from "../ui";

/** 0 email · 1 code · 2 saved card · 3 consent · 4 processing · 5 confirmed */
type Stage = 0 | 1 | 2 | 3 | 4 | 5;

const AT = { code: 600, firstDigit: 700, digitEvery: 150, card: 1900, consent: 2600, processing: 3300, done: 4200 };
const SHOWN_AUTHORISATIONS = 4;

function GenericCard() {
  return (
    <span aria-hidden="true" className="relative grid h-7 w-10 shrink-0 place-items-end overflow-hidden rounded-[6px] bg-ink p-1">
      <span className="absolute left-1.5 top-1.5 h-1.5 w-2.5 rounded-[2px] bg-gold/80" />
      <span className="flex gap-[2px]">
        <span className="size-1.5 rounded-full bg-white/70" />
        <span className="size-1.5 rounded-full bg-white/40" />
      </span>
    </span>
  );
}

function Step({ show, animate, children, className }: { show: boolean; animate: boolean; children: ReactNode; className?: string }) {
  if (!show) return null;
  return <div className={cx(animate && "atlas-rise", className)}>{children}</div>;
}

function Authorisations({ items, animate }: { items: string[]; animate: boolean }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const shown = open ? items : items.slice(0, SHOWN_AUTHORISATIONS);
  const more = items.length - SHOWN_AUTHORISATIONS;
  return (
    <div>
      <p className="text-[13px] font-medium text-ink">By paying, you authorise Atlas71 to:</p>
      <ul className="mt-2 space-y-1.5">
        {shown.map((a, i) => (
          <li
            key={`${a}-${i}`}
            className={cx("flex gap-2 text-[13px] leading-snug text-ink", animate && i < SHOWN_AUTHORISATIONS && "atlas-rise")}
            style={animate && i < SHOWN_AUTHORISATIONS ? { animationDelay: `${i * 110}ms` } : undefined}
          >
            <IconCheck size={14} strokeWidth={2.8} className="mt-[2px] shrink-0 text-accent" />
            <span className="min-w-0">{a}</span>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-full text-[13px] font-medium text-accent-ink hover:underline"
        >
          {open ? "Show less" : `and ${more} more`}
          <IconChevronDown size={14} className={cx("transition-transform", open && "rotate-180")} />
        </button>
      ) : null}
    </div>
  );
}

export function CheckoutCard({ data, live = false }: { data: CheckoutCardData; live?: boolean }) {
  const code = (data.code || "424242").slice(0, 8);
  // Decided once, when the card mounts: a card that arrives mid-stream plays, history doesn't.
  const [animate] = useState(live);
  const [stage, setStage] = useState<Stage>(live ? 0 : 5);
  const [typed, setTyped] = useState(live ? 0 : code.length);

  useEffect(() => {
    if (!animate) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setTyped(code.length);
        setStage(5);
      });
    } else {
      at(AT.code, () => setStage(1));
      for (let i = 0; i < code.length; i++) at(AT.firstDigit + i * AT.digitEvery, () => setTyped(i + 1));
      at(AT.card, () => setStage(2));
      at(AT.consent, () => setStage(3));
      at(AT.processing, () => setStage(4));
      at(AT.done, () => setStage(5));
    }
    return () => timers.forEach(clearTimeout);
  }, [animate, code.length]);

  const method = data.method ?? { brand: "Card", last4: "0000", expiry: "", label: "Test card" };
  const payer = data.payer ?? { name: "", email: "", company: null, country: null };
  const lines = data.lines ?? [];
  const authorises = data.authorises ?? [];
  const methodText = `${method.brand} •••• ${method.last4}`;
  const verified = typed >= code.length;
  const done = stage === 5;

  const confirmation = (
    <div className={cx("space-y-5", animate && "atlas-fade")}>
      <div role="status" className="flex flex-col items-center px-2 pt-3 text-center">
        <span className={cx("grid size-14 place-items-center rounded-full bg-good text-white shadow-lift", animate && "atlas-pop")}>
          <IconCheck size={28} strokeWidth={3} />
        </span>
        <p className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-ink">Payment confirmed</p>
        <p className="mt-1 text-[15px] tabular-nums text-ink">
          {aed(data.amountAed)} · {methodText}
        </p>
        <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-left text-[13px]">
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
        <p className="mt-3 rounded-full bg-gold-soft px-3 py-1 text-[12.5px] font-medium text-gold-ink">Sandbox: no money moved</p>
      </div>
      {authorises.length ? (
        <div className="rounded-xl border border-line bg-sunken px-3.5 py-3">
          <Authorisations items={authorises} animate={false} />
        </div>
      ) : null}
    </div>
  );

  const flow = (
    <div className="space-y-4" aria-hidden="true">
      <div>
        <p className="mb-1 text-[12.5px] font-medium text-muted">Email</p>
        <div className={cx("flex min-h-11 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink", animate && "atlas-autofill")}>
          <span className="min-w-0 flex-1 truncate">{payer.email}</span>
          <span className={cx("inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-good", animate && "atlas-fade [animation-delay:350ms]")}>
            <IconCheck size={13} strokeWidth={3} />
            Saved details found
          </span>
        </div>
      </div>

      <Step show={stage >= 1} animate={animate}>
        <p className="mb-1.5 text-[13px] text-ink">
          Enter the code sent to <span className="whitespace-nowrap tabular-nums font-medium">{data.phoneMasked}</span>
        </p>
        <div className="flex items-center gap-1.5">
          {code.split("").map((digit, i) => (
            <span
              key={i}
              className={cx(
                "grid h-11 w-9 place-items-center rounded-[9px] border text-[18px] font-semibold tabular-nums transition-colors",
                verified ? "border-good/60 bg-good-soft text-good" : i === typed ? "border-accent bg-surface text-ink ring-2 ring-accent/20" : "border-line-strong bg-surface text-ink",
              )}
            >
              {i < typed ? <span className={animate ? "atlas-pop" : undefined}>{digit}</span> : null}
            </span>
          ))}
          {verified ? (
            <span className="atlas-fade ml-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-good">
              <IconCheck size={14} strokeWidth={3} />
              Verified
            </span>
          ) : null}
        </div>
      </Step>

      <Step show={stage >= 2} animate={animate} className="space-y-3">
        <div>
          <p className="mb-1 text-[12.5px] font-medium text-muted">Pay with</p>
          <div className="flex min-h-14 items-center gap-3 rounded-[10px] border-2 border-accent bg-accent-soft/40 px-3 py-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-accent">
              <span className="size-2 rounded-full bg-accent" />
            </span>
            <GenericCard />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] tabular-nums text-ink">{methodText}</span>
              {method.expiry ? <span className="block text-[12.5px] tabular-nums text-muted">Expires {method.expiry}</span> : null}
            </span>
            <span className="shrink-0 rounded-full border border-dashed border-gold px-2 py-0.5 text-[11px] font-semibold text-gold-ink">
              {method.label || "Test card"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className={cx("min-w-0 rounded-[10px] border border-line px-3 py-2", animate && "atlas-autofill [animation-delay:150ms]")}>
            <p className="text-[11.5px] text-muted">Name</p>
            <p className="truncate text-[14px] text-ink">{payer.name}</p>
          </div>
          <div className={cx("min-w-0 rounded-[10px] border border-line px-3 py-2", animate && "atlas-autofill [animation-delay:270ms]")}>
            <p className="text-[11.5px] text-muted">Country</p>
            <p className="truncate text-[14px] text-ink">{payer.country ?? "—"}</p>
          </div>
        </div>
      </Step>

      <Step show={stage >= 3} animate={animate}>
        <Authorisations items={authorises} animate={animate} />
      </Step>

      <div
        className={cx(
          "pointer-events-none flex h-12 w-full select-none items-center justify-center gap-2 rounded-xl text-[16px] font-semibold text-white transition-[transform,background-color,opacity] duration-200",
          stage === 4 ? "scale-[0.985] bg-accent-ink" : "bg-accent shadow-lift",
          stage < 3 && "opacity-40",
        )}
      >
        {stage === 4 ? (
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
      aria-label={`Sandbox checkout, ${aed(data.amountAed)}${done ? ", payment confirmed" : ", in progress"}`}
      className="atlas-rise @container overflow-clip rounded-card border border-line bg-surface shadow-card"
    >
      <div className="grid @min-[600px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-ink">Express checkout</p>
            <span className="rounded-full border border-gold bg-surface px-2.5 py-0.5 text-[11.5px] font-semibold text-gold-ink">sandbox</span>
          </div>
          {done ? confirmation : flow}
          {!done ? (
            <p className="sr-only" role="status">
              {stage === 4 ? "Processing the sandbox payment" : "Filling the saved checkout details"}
            </p>
          ) : null}
        </div>
      </div>
      <p className="flex items-center gap-2 border-t border-line bg-surface px-5 py-2.5 text-[12.5px] text-muted">
        <IconLock size={14} className="shrink-0" />
        Express checkout · sandbox · no money moves
      </p>
    </section>
  );
}
