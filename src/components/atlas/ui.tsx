// Small shared pieces: pills, source chips, AI-check bars, step status icons, provider monograms.
import type { ReactNode } from "react";
import { SOURCES } from "@/lib/atlas/kb";
import { num } from "@/lib/atlas/format";
import type { ChecksMeta, SourceRef, StepStatus } from "@/lib/atlas/types";
import { IconCheck, IconClock, IconExternal, IconLock, IconSend } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "accent" | "gold" | "good" | "warn" | "bad";

const PILL_TONE: Record<Tone, string> = {
  neutral: "border-line bg-sunken text-muted",
  accent: "border-transparent bg-accent-soft text-accent-ink",
  gold: "border-transparent bg-gold-soft text-gold-ink",
  good: "border-transparent bg-good-soft text-good",
  warn: "border-transparent bg-warn-soft text-warn-ink",
  bad: "border-transparent bg-bad-soft text-bad",
};

export function Pill({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold leading-none",
        PILL_TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Gold outline: every simulated integration carries it. */
export function SandboxPill({ children = "Sandbox", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-gold bg-surface px-2.5 text-[12px] font-semibold leading-none text-gold-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("inline-block size-2 shrink-0 rounded-full", className)} />;
}

/** "TypeSafe · 312 ms · live", or an honest "no answer" when the check didn't run. */
export function ChecksMetaPill({ meta }: { meta: ChecksMeta | undefined }) {
  if (meta?.live) {
    const ms = typeof meta.latencyMs === "number" ? `${Math.round(meta.latencyMs)} ms · ` : "";
    return (
      <Pill tone="good" icon={<Dot className="bg-good" />}>
        TypeSafe · {ms}live
      </Pill>
    );
  }
  return (
    <Pill tone="neutral" icon={<Dot className="bg-line-strong" />}>
      TypeSafe · {meta?.error === "setup_required" ? "not set up" : "no answer"}
    </Pill>
  );
}

export function MicroLabel({ children, className, as: As = "p" }: { children: ReactNode; className?: string; as?: "p" | "h4" | "dt" | "span" }) {
  return (
    <As className={cx("text-[12px] font-semibold uppercase leading-4 tracking-[0.09em] text-muted", className)}>
      {children}
    </As>
  );
}

/** Big tabular money with a small raised "AED", the figure treatment used for totals. */
export function Money({ amount, className, prefix }: { amount: number; className?: string; prefix?: string }) {
  return (
    <span className={cx("whitespace-nowrap tabular-nums", className)}>
      {prefix ? <span className="mr-[0.25em] text-[0.42em] font-semibold text-muted">{prefix}</span> : null}
      <span className="mr-[0.18em] align-[0.5em] text-[0.4em] font-semibold tracking-[0.08em] text-muted">AED</span>
      {num(amount)}
    </span>
  );
}

const NOTICE_TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink border-line",
  accent: "bg-accent-soft text-accent-ink border-transparent",
  gold: "bg-gold-soft text-gold-ink border-transparent",
  good: "bg-good-soft text-good border-transparent",
  warn: "bg-warn-soft text-warn-ink border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
};

export function Notice({
  tone = "neutral",
  icon,
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div role={role} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-[14px] leading-relaxed", NOTICE_TONE[tone], className)}>
      {icon ? <span className="mt-[2px] shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

// ---------- sources ----------

/** A source citation. Opens the page in a new tab; Atlas71's own pricing has no URL, so it's a plain chip. */
export function SourceChip({ id, fallback }: { id: string; fallback?: SourceRef }) {
  const known = SOURCES[id];
  const s = known ?? (fallback ? { ...fallback, claim: fallback.title } : null);
  if (!s || !s.title) return null;
  const base =
    "mx-[0.15em] inline-flex max-w-full items-center gap-1 rounded-full border bg-surface px-2 py-px align-[0.06em] text-[12px] font-medium leading-[20px] text-muted";
  const url = typeof s.url === "string" && /^https?:\/\//.test(s.url) ? s.url : "";
  if (!url) {
    return (
      <span className={cx(base, "border-dashed border-line-strong")} title={s.claim}>
        <span className="truncate">{s.title}</span>
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={s.claim}
      className={cx(base, "border-line transition-colors hover:border-accent hover:text-accent-ink")}
    >
      <span className="truncate">{s.title}</span>
      <IconExternal size={11} className="shrink-0 opacity-70" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** A row of source chips. Takes ids or the SourceRef objects a card carries. */
export function SourceRow({ sources, label = "Sources" }: { sources: (string | SourceRef)[] | undefined; label?: string }) {
  const seen = new Set<string>();
  const refs: SourceRef[] = [];
  for (const s of sources ?? []) {
    const ref = typeof s === "string" ? (SOURCES[s] ? { id: s, title: SOURCES[s].title, url: SOURCES[s].url } : null) : s;
    if (!ref || !ref.id || seen.has(ref.id)) continue;
    seen.add(ref.id);
    refs.push(ref);
  }
  if (!refs.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      <MicroLabel as="span" className="mr-1">
        {label}
      </MicroLabel>
      {refs.map((r) => (
        <SourceChip key={r.id} id={r.id} fallback={r} />
      ))}
    </div>
  );
}

// ---------- step status ----------

export const STATUS_LABEL: Record<StepStatus, string> = {
  locked: "Waiting on an earlier step",
  ready: "Ready to file",
  needs_input: "Waiting on you",
  filed: "Filed",
  in_review: "In review",
  done: "Done",
};

export function StatusIcon({ status, size = 22 }: { status: StepStatus; size?: number }) {
  const label = STATUS_LABEL[status] ?? "Status unknown";
  const box = { width: size, height: size };
  const inner = Math.round(size * 0.6);
  const common = "grid shrink-0 place-items-center rounded-full";
  switch (status) {
    case "done":
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "bg-good text-white")}>
          <IconCheck size={inner} strokeWidth={3.2} />
        </span>
      );
    case "needs_input":
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "bg-gold text-white")}>
          <span className="text-[13px] font-bold leading-none" style={{ fontSize: Math.round(size * 0.6) }}>
            !
          </span>
        </span>
      );
    case "filed":
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "bg-accent-soft text-accent")}>
          <IconSend size={inner - 1} strokeWidth={2.4} />
        </span>
      );
    case "in_review":
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "bg-accent-soft text-accent")}>
          <IconClock size={inner} strokeWidth={2.4} />
        </span>
      );
    case "ready":
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "border-2 border-accent bg-surface")}>
          <span className="size-1.5 rounded-full bg-accent" />
        </span>
      );
    default:
      return (
        <span role="img" aria-label={label} title={label} style={box} className={cx(common, "border border-line bg-sunken text-muted")}>
          <IconLock size={inner - 2} strokeWidth={2.2} />
        </span>
      );
  }
}

/** Short visible tag for the statuses worth reading at a glance. */
export function StatusTag({ status }: { status: StepStatus }) {
  switch (status) {
    case "needs_input":
      return <Pill tone="gold">Waiting on you</Pill>;
    case "filed":
      return <Pill tone="accent">Filed</Pill>;
    case "in_review":
      return <Pill tone="accent">In review</Pill>;
    case "ready":
      return <Pill tone="neutral">Ready to file</Pill>;
    default:
      return null;
  }
}

// ---------- provider monograms ----------

const MONOGRAMS: { test: RegExp; mark: string; tone: "gov" | "private" | "atlas" }[] = [
  { test: /hub71/i, mark: "HB", tone: "atlas" },
  { test: /atlas71/i, mark: "A7", tone: "atlas" },
  { test: /registration authority/i, mark: "RA", tone: "gov" },
  { test: /masdar/i, mark: "MC", tone: "gov" },
  { test: /government services|adgm gs/i, mark: "GS", tone: "gov" },
  { test: /cowork/i, mark: "CW", tone: "private" },
  { test: /emaratax|\bfta\b/i, mark: "FT", tone: "gov" },
  { test: /seha/i, mark: "SE", tone: "gov" },
  { test: /\bicp\b/i, mark: "IC", tone: "gov" },
  { test: /wio/i, mark: "WI", tone: "private" },
  { test: /stripe/i, mark: "ST", tone: "private" },
];

const MONO_TONE = {
  gov: "bg-accent-soft text-accent-ink",
  private: "bg-sunken text-ink border border-line",
  atlas: "bg-ink text-white",
};

export function Monogram({ provider, size = 36 }: { provider: string; size?: number }) {
  const hit = MONOGRAMS.find((m) => m.test.test(provider));
  const words = provider.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  const mark = hit?.mark ?? ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cx(
        "grid shrink-0 place-items-center rounded-[10px] text-[12px] font-bold tracking-[0.04em]",
        MONO_TONE[hit?.tone ?? "private"],
      )}
    >
      {mark}
    </span>
  );
}

// ---------- buttons ----------

export const BUTTON = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-line-strong",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink transition-colors hover:border-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-strong disabled:hover:text-ink",
  quiet:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-medium text-muted transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
} as const;
