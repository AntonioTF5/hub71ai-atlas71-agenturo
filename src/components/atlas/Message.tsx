"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { MessagePart } from "@/lib/atlas/types";
import { CardView } from "./cards/CardView";
import { IconAlert, IconCard, IconCheck, IconFastForward, IconInfo, IconRefresh, Spinner } from "./icons";
import { RichText } from "./rich-text";
import { SETUP_REQUIRED, type UiMessage } from "./session";
import { BUTTON, Notice, cx } from "./ui";
import { FileBadge } from "./file-badge";
import { formatBytes } from "./files";

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span className={cx("grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface", className)}>
      <Image src="/brand/atlas71-mark.png" width={24} height={24} alt="" className="size-6" />
    </span>
  );
}

const THINKING_STEPS: [number, string][] = [
  [0, "Thinking…"],
  [4_000, "Working on it…"],
  [10_000, "Still on it. Checks can take a few seconds…"],
];

/** Typing dots with a label that moves on during a long wait, so 10 seconds never feels stuck. */
export function Thinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = THINKING_STEPS.slice(1).map(([at], i) => setTimeout(() => setStep(i + 1), at));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="flex min-h-8 items-center gap-2.5 text-[14px] text-muted" role="status">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 160, 320].map((d) => (
          <span key={d} className="atlas-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      <span key={step} className="atlas-fade">
        {THINKING_STEPS[step][1]}
      </span>
    </div>
  );
}

function ActivityRow({ text, done, failed, running }: { text: string; done: boolean; failed?: boolean; running: boolean }) {
  return (
    <div className="flex items-start gap-2.5 text-[13.5px] leading-[18px] text-muted">
      {done && failed ? (
        // Finished, but it didn't work (a page that couldn't be read, a check that didn't answer): no tick.
        <span className="atlas-fade grid size-[18px] shrink-0 place-items-center rounded-full bg-gold-soft text-gold-ink">
          <IconAlert size={12} strokeWidth={2.6} />
        </span>
      ) : done ? (
        <span className="atlas-fade grid size-[18px] shrink-0 place-items-center rounded-full bg-good-soft text-good">
          <IconCheck size={11} strokeWidth={3.2} />
        </span>
      ) : running ? (
        <Spinner size={18} className="shrink-0 text-accent" />
      ) : (
        <span className="grid size-[18px] shrink-0 place-items-center" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-line-strong" />
        </span>
      )}
      <span className="min-w-0">{text}</span>
    </div>
  );
}

function Choices({
  options,
  enabled,
  chosen,
  onPick,
}: {
  options: string[];
  enabled: boolean;
  chosen?: string;
  onPick: (text: string) => void;
}) {
  return (
    <div role="group" aria-label="Suggested replies" className="flex flex-wrap gap-2 pt-0.5">
      {options.map((o, i) => {
        const picked = !enabled && chosen?.trim() === o.trim();
        return (
          <button
            key={`${o}-${i}`}
            type="button"
            disabled={!enabled}
            onClick={() => onPick(o)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cx(
              "atlas-rise inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-4 py-2 text-left text-[15px] leading-snug transition-colors",
              enabled
                ? "border-line-strong bg-surface text-ink shadow-sm hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
                : picked
                  ? "cursor-default border-transparent bg-accent-soft text-accent-ink"
                  : "cursor-default border-line text-muted",
            )}
          >
            {picked ? <IconCheck size={14} strokeWidth={2.8} className="shrink-0" /> : null}
            <span className="min-w-0 [overflow-wrap:anywhere]">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

function ErrorRow({ error, canRetry, busy, onRetry }: { error: string; canRetry: boolean; busy: boolean; onRetry: () => void }) {
  if (error === SETUP_REQUIRED) {
    return (
      <Notice tone="gold" icon={<IconInfo size={18} />} role="status">
        Atlas71&apos;s AI isn&apos;t set up on this deployment yet.
      </Notice>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-bad/20 bg-bad-soft px-4 py-2.5">
      <IconAlert size={18} className="shrink-0 text-bad" />
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-bad">{error}</p>
      {canRetry ? (
        <button type="button" className={cx(BUTTON.secondary, "bg-surface")} disabled={busy} onClick={onRetry}>
          <IconRefresh size={16} />
          Retry
        </button>
      ) : null}
    </div>
  );
}

function UserMessage({ message, previews }: { message: UiMessage; previews?: (string | null)[] }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n\n");
  const action = message.action;
  return (
    <div className="flex flex-col items-end gap-2">
      {message.attachments?.length ? (
        <ul className="flex max-w-[85%] flex-wrap items-end justify-end gap-2" aria-label="Attachments">
          {message.attachments.map((a, i) => {
            const thumb = previews?.[i];
            const kind = a.mime === "application/pdf" ? "PDF" : "Photo";
            return (
              <li key={`${a.name}-${i}`} title={a.name}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local data URL thumbnail
                  <img src={thumb} alt={a.name} width={88} height={88} className="size-[88px] rounded-2xl border border-line object-cover shadow-card" />
                ) : (
                  <span className="flex h-14 max-w-[260px] items-center gap-2.5 rounded-2xl border border-line bg-surface py-2 pl-2 pr-3.5 shadow-card">
                    <FileBadge mime={a.mime} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium leading-5 text-ink">{a.name}</span>
                      <span className="block text-[12px] leading-4 tabular-nums text-muted">
                        {a.size ? `${kind} · ${formatBytes(a.size)}` : kind}
                      </span>
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="max-w-[88%] rounded-[20px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[16px] leading-[1.55] text-white sm:max-w-[80%]">
        {action ? (
          <span className="mr-1.5 inline-flex translate-y-[2px] text-white/70" aria-hidden="true">
            {action.type === "pay" ? <IconCard size={16} /> : <IconFastForward size={15} />}
          </span>
        ) : null}
        <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</span>
      </div>
    </div>
  );
}

type Block =
  | { kind: "activities"; items: Extract<MessagePart, { type: "activity" }>[] }
  | { kind: "part"; part: MessagePart; index: number };

/** Consecutive activity rows render as one compact group. */
function blocks(parts: MessagePart[]): Block[] {
  const out: Block[] = [];
  parts.forEach((part, index) => {
    const last = out[out.length - 1];
    if (part.type === "activity") {
      if (last?.kind === "activities") last.items.push(part);
      else out.push({ kind: "activities", items: [part] });
    } else out.push({ kind: "part", part, index });
  });
  return out;
}

function AssistantMessage({
  message,
  isLast,
  busy,
  nextUserText,
  onPick,
  onRetry,
}: {
  message: UiMessage;
  isLast: boolean;
  busy: boolean;
  nextUserText?: string;
  onPick: (text: string) => void;
  onRetry: () => void;
}) {
  const pending = !!message.pending;
  const all = blocks(message.parts);
  const lastTextIndex = message.parts.map((p) => p.type).lastIndexOf("text");
  const lastPart = message.parts[message.parts.length - 1];
  const running = message.parts.some((p) => p.type === "activity" && !p.done);
  // Keep a sign of life until visible words arrive: before any part, and after activities or a card.
  // The checkout card plays its own animation; dots under it would compete.
  const checkoutPlaying = lastPart?.type === "card" && lastPart.card.kind === "checkout";
  const waiting = pending && !running && !checkoutPlaying && (!lastPart || lastPart.type === "activity" || lastPart.type === "card");
  const rendered: ReactNode[] = all.map((b, i) => {
    if (b.kind === "activities") {
      return (
        <div key={i} className="space-y-1">
          {b.items.map((a, j) => (
            <ActivityRow key={j} text={a.text} done={a.done} failed={a.failed} running={pending && !a.done} />
          ))}
        </div>
      );
    }
    const part = b.part;
    switch (part.type) {
      case "text":
        return part.text.trim() ? <RichText key={i} text={part.text} streaming={pending && b.index === lastTextIndex} /> : null;
      case "card":
        return <CardView key={i} card={part.card} live={pending} />;
      case "choices":
        return <Choices key={i} options={part.options} enabled={isLast && !busy && !pending} chosen={nextUserText} onPick={onPick} />;
      default:
        return null;
    }
  });

  return (
    <div className="flex gap-3">
      <AssistantAvatar className="mt-0.5 hidden sm:grid" />
      <div className="min-w-0 flex-1 space-y-3.5" aria-live={isLast ? "polite" : "off"} aria-busy={pending}>
        {rendered}
        {waiting ? <Thinking /> : null}
        {message.error ? <ErrorRow error={message.error} canRetry={isLast && !message.noRetry} busy={busy} onRetry={onRetry} /> : null}
      </div>
    </div>
  );
}

export const MessageView = memo(function MessageView({
  message,
  isLast,
  busy,
  nextUserText,
  previews,
  onPick,
  onRetry,
}: {
  message: UiMessage;
  isLast: boolean;
  busy: boolean;
  nextUserText?: string;
  previews?: (string | null)[];
  onPick: (text: string) => void;
  onRetry: () => void;
}) {
  return (
    <div data-mid={message.id} className={cx("scroll-mt-4", message.role === "user" ? "atlas-rise" : undefined)}>
      {message.role === "user" ? (
        <UserMessage message={message} previews={previews} />
      ) : (
        <AssistantMessage
          message={message}
          isLast={isLast}
          busy={busy}
          nextUserText={nextUserText}
          onPick={onPick}
          onRetry={onRetry}
        />
      )}
    </div>
  );
});
