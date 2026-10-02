"use client";

import Image from "next/image";
import { PERSONAS, type PersonaId } from "@/lib/atlas/personas";
import { IconArrowRight } from "./icons";

function initials(name: string): string {
  return name
    .split(",")[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const PROVIDERS = ["Hub71", "ADGM", "ICP", "SEHA", "Wio", "FTA", "Stripe"];

export function Welcome({ onPick, disabled }: { onPick: (id: PersonaId) => void; disabled?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 pb-8 pt-[clamp(1.75rem,7vh,5rem)] sm:px-6">
      <Image
        src="/brand/atlas71-mark.png"
        width={72}
        height={72}
        alt=""
        loading="eager"
        className="atlas-rise size-16 sm:size-[72px]"
      />
      <h1 className="atlas-rise mt-5 text-balance text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink [animation-delay:60ms] sm:text-[54px]">
        Land your startup in Abu&nbsp;Dhabi.
      </h1>
      <p className="atlas-rise mt-4 max-w-[56ch] text-pretty text-[17px] leading-relaxed text-muted [animation-delay:120ms] sm:text-[19px]">
        Tell Atlas71 what you build and who&apos;s moving. It picks your route, shows every step with dates, quotes one price, and
        files everything.
      </p>

      <div className="atlas-rise mt-8 [animation-delay:180ms] sm:mt-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">Try a founder</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(p.id)}
              className="group flex w-full items-start gap-4 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-[15px] font-semibold text-accent-ink">
                {initials(p.founderName || p.founder)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[18px] font-semibold leading-tight text-ink">{p.name}</span>
                  <IconArrowRight
                    size={18}
                    className="shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </span>
                <span className="mt-1 block text-[14.5px] leading-snug text-muted">{p.tagline}</span>
                <span className="mt-3 block text-[13.5px] font-medium text-ink">{p.founder}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="atlas-rise mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted [animation-delay:240ms]">
        <span>Files with</span>
        {PROVIDERS.map((name, i) => (
          <span key={name} className="font-medium text-ink/80">
            {name}
            {i < PROVIDERS.length - 1 ? <span className="ml-2 text-line-strong">·</span> : null}
          </span>
        ))}
        <span className="text-gold-ink">· sandbox</span>
      </p>
    </div>
  );
}
