"use client";

import type { ReactNode } from "react";
import type { SimEvent, UpdatesCardData } from "@/lib/atlas/types";
import { diffDays, fmtDay, fmtSimDay, isIsoDate } from "@/lib/atlas/format";
import { useAtlasUi } from "../context";
import { IconCard, IconCheck, IconClock, IconFlag, IconSend } from "../icons";
import { RichInline } from "../rich-text";
import { Notice, SandboxPill, cx } from "../ui";
import { CardShell } from "./CardShell";

const KIND: Record<SimEvent["kind"], { icon: ReactNode; ring: string; label: string }> = {
  issued: { icon: <IconCheck size={13} strokeWidth={3} />, ring: "bg-good text-white", label: "Issued" },
  filed: { icon: <IconSend size={12} strokeWidth={2.4} />, ring: "bg-accent-soft text-accent", label: "Filed" },
  needs_input: { icon: <span className="text-[12px] font-bold leading-none">!</span>, ring: "bg-gold text-white", label: "Needs you" },
  deadline: { icon: <IconFlag size={12} strokeWidth={2.4} />, ring: "bg-warn-soft text-warn-ink", label: "Deadline" },
  paid: { icon: <IconCard size={12} strokeWidth={2.4} />, ring: "bg-accent text-white", label: "Paid" },
};

export function UpdatesCard({ data }: { data: UpdatesCardData }) {
  const ui = useAtlasUi();
  const start = ui.state.startDate;
  const events = (data.events ?? []).filter((e) => e && isIsoDate(e.on));
  const days: { on: string; events: SimEvent[] }[] = [];
  for (const ev of events) {
    const last = days[days.length - 1];
    if (last && last.on === ev.on) last.events.push(ev);
    else days.push({ on: ev.on, events: [ev] });
  }
  const waiting = data.waitingOn ?? [];
  const span = isIsoDate(data.from) && isIsoDate(data.to) ? diffDays(data.from, data.to) : 0;
  const label = (iso: string) => (isIsoDate(start) ? fmtSimDay(start, iso) : fmtDay(iso));

  return (
    <CardShell
      icon={<IconClock size={19} />}
      title="What happened"
      subtitle={
        isIsoDate(data.from) && isIsoDate(data.to)
          ? `${fmtDay(data.from)} → ${fmtDay(data.to)}${span > 0 ? ` · ${span} ${span === 1 ? "day" : "days"}` : ""}`
          : undefined
      }
      meta={<SandboxPill />}
    >
      {days.length ? (
        <ol className="space-y-4">
          {days.map((d) => (
            <li key={d.on}>
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] tabular-nums text-muted">{label(d.on)}</p>
              <ul className="mt-2 space-y-2.5">
                {d.events.map((ev, i) => {
                  const k = KIND[ev.kind] ?? KIND.filed;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span role="img" aria-label={k.label} className={cx("mt-px grid size-[22px] shrink-0 place-items-center rounded-full", k.ring)}>
                        {k.icon}
                      </span>
                      <p
                        className={cx(
                          "min-w-0 text-pretty text-[15px] leading-snug",
                          ev.kind === "needs_input" ? "font-medium text-gold-ink" : "text-ink",
                        )}
                      >
                        <RichInline text={ev.text} />
                      </p>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[14px] text-muted">Nothing new happened in this window.</p>
      )}

      <div className="mt-5">
        {waiting.length ? (
          <Notice tone="gold" title="Waiting on you" icon={<span className="grid size-[18px] place-items-center rounded-full bg-gold text-[11px] font-bold text-white">!</span>}>
            <ul className="mt-1 space-y-1">
              {waiting.map((w, i) => (
                <li key={i} className="text-pretty text-ink">
                  <RichInline text={w} />
                </li>
              ))}
            </ul>
          </Notice>
        ) : (
          <p className="flex items-center gap-2 text-[14px] text-muted">
            <IconCheck size={15} strokeWidth={2.8} className="text-good" />
            Nothing is waiting on you right now.
          </p>
        )}
      </div>
    </CardShell>
  );
}
