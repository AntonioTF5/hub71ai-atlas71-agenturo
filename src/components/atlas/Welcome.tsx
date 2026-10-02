"use client";

import { PERSONAS, type PersonaId } from "@/lib/atlas/personas";
import { IconArrowRight, IconSparkle } from "./icons";
import { cx } from "./ui";

function initials(name: string): string {
  return name
    .split(",")[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** The journey, in the order Atlas71 runs it. Each stop carries the promise that makes it different. */
const ROUTE = [
  { stop: "Decide", what: "Abu Dhabi against your home city, every number sourced" },
  { stop: "Plan", what: "Your licence route, dated step by step" },
  { stop: "Pay last", what: "One all-in price, paid once every detail is in" },
  { stop: "Land", what: "Licence, visas and bank account, filed with your OK" },
];

const PROVIDERS = ["Hub71", "ADGM", "ICP", "SEHA", "Wio", "FTA", "Stripe"];

/** A brand or product name: kept as written by machine translation. */
function Name({ children }: { children: string }) {
  return (
    <span translate="no" className="font-medium text-ink">
      {children}
    </span>
  );
}

export function Welcome({ onPick, disabled }: { onPick: (id: PersonaId) => void; disabled?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 pb-8 pt-[clamp(1.5rem,6vh,4rem)] sm:px-6">
      <h1 className="atlas-rise text-balance text-[34px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[54px]">
        Should your startup move to Abu&nbsp;Dhabi?
      </h1>
      <p className="atlas-rise mt-4 max-w-[58ch] text-pretty text-[17px] leading-relaxed text-muted [animation-delay:60ms] sm:text-[19px]">
        Atlas71 answers with sourced numbers. If it’s a yes, it picks your licence, prices the whole move and files
        the paperwork. <span className="font-medium text-ink">Ask anything on the way.</span>
      </p>

      {/* The signature: one dashed route from the question to the landing. Vertical on phones, a line across from 640px. */}
      <ol
        aria-label="How Atlas71 works"
        className="atlas-rise mt-8 grid gap-4 [animation-delay:120ms] sm:mt-10 sm:grid-cols-4 sm:gap-6"
      >
        {ROUTE.map((r, i) => {
          const last = i === ROUTE.length - 1;
          return (
            <li key={r.stop} className="relative pl-7 sm:pl-0 sm:pt-6">
              <span
                aria-hidden="true"
                className={cx(
                  "absolute left-0 top-[3px] size-3 rounded-full border-2 border-accent sm:top-0",
                  last ? "bg-accent" : "bg-paper",
                )}
              />
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[15px] left-[5px] top-[19px] border-l-2 border-dashed border-line-strong sm:-right-5 sm:bottom-auto sm:left-4 sm:top-[5px] sm:border-l-0 sm:border-t-2"
                />
              )}
              <p className="font-mono text-[12px] font-medium uppercase leading-[18px] tracking-[0.08em] text-accent-ink">
                {r.stop}
              </p>
              <p className="mt-1 text-pretty text-[15px] leading-snug text-ink">{r.what}</p>
            </li>
          );
        })}
      </ol>

      <p className="atlas-rise mt-8 flex gap-2.5 text-pretty text-[14.5px] leading-relaxed text-muted [animation-delay:180ms] sm:mt-9">
        <IconSparkle size={17} className="mt-[3px] shrink-0 text-accent" />
        <span>
          Built on frontier AI, so you answer questions instead of filling in forms. <Name>GPT-6.1 Sol</Name> reasons
          through your case, <Name>TypeSafe</Name> fact-checks every answer in about 150&nbsp;ms and <Name>Tavily</Name>{" "}
          reads official pages live.
        </span>
      </p>

      <div className="atlas-rise mt-8 [animation-delay:240ms] sm:mt-9">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">Try a demo founder</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(p.id)}
              className="group flex w-full items-center gap-3.5 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:hover:translate-y-0"
            >
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-[15px] font-semibold text-accent-ink"
              >
                {initials(p.founderName || p.founder)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold leading-tight text-ink">{p.name}</span>
                <span className="mt-1 block text-[14px] leading-snug text-muted">{p.tagline}</span>
                <span className="mt-1.5 block text-[13px] font-medium text-ink/80">{p.founder}</span>
              </span>
              <IconArrowRight
                size={18}
                className="shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </button>
          ))}
        </div>
      </div>

      <p className="atlas-rise mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted [animation-delay:300ms]">
        <span>Files with</span>
        {PROVIDERS.map((name, i) => (
          <span key={name} translate="no" className="font-medium text-ink/80">
            {name}
            {i < PROVIDERS.length - 1 ? (
              <span aria-hidden="true" className="ml-2 text-line-strong">
                ·
              </span>
            ) : null}
          </span>
        ))}
        <span className="text-gold-ink">· sandbox</span>
      </p>
    </div>
  );
}
