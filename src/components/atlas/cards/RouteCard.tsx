"use client";

import type { RouteCardData } from "@/lib/atlas/types";
import { aed } from "@/lib/atlas/format";
import { useAtlasUi } from "../context";
import { IconAlert, IconCheck, IconFlag, IconRefresh, IconRoute } from "../icons";
import { CheckList } from "../checks";
import { RichInline } from "../rich-text";
import { BUTTON, ChecksMetaPill, MicroLabel, Notice, Pill, SourceRow, cx, type Tone } from "../ui";
import { CardSection, CardShell } from "./CardShell";

const PREREQ: Record<RouteCardData["prerequisites"][number]["state"], { tone: Tone; label: string }> = {
  met: { tone: "good", label: "Met" },
  missing: { tone: "neutral", label: "Missing" },
  review: { tone: "gold", label: "Review" },
};

function RetryCheck() {
  const ui = useAtlasUi();
  // Only offer it while the case still has no live eligibility check.
  if (ui.state.fit?.meta?.live) return null;
  return (
    <button
      type="button"
      className={cx(BUTTON.secondary, "mt-4")}
      disabled={ui.busy}
      onClick={() => ui.send("Retry the eligibility check")}
    >
      <IconRefresh size={17} />
      Retry check
    </button>
  );
}

export function RouteCard({ data }: { data: RouteCardData }) {
  const ui = useAtlasUi();
  const meta = data.checksMeta;

  if (!meta?.live) {
    return (
      <CardShell icon={<IconRoute size={19} />} tone="gold" title="Route check" subtitle="AI eligibility check" meta={<ChecksMetaPill meta={meta} />}>
        <Notice tone="gold" icon={<IconAlert size={18} />}>
          {meta?.error === "setup_required"
            ? "TypeSafe isn't set up on this deployment."
            : "The AI eligibility check didn't answer, so no route is picked yet."}
        </Notice>
        <RetryCheck />
      </CardShell>
    );
  }

  const rec = data.recommended ?? { id: "specialist", name: "Specialist review", summary: "" };
  const specialist = rec.id === "specialist";
  const reasons = data.reasons ?? [];
  const prerequisites = data.prerequisites ?? [];
  const alternatives = data.alternatives ?? [];
  const checks = data.checks ?? [];
  // Flags live on the fit result; the card type doesn't carry them yet, so read them from the live case.
  const carried = (data as RouteCardData & { flags?: unknown }).flags;
  const flags: string[] = Array.isArray(carried)
    ? carried.filter((f): f is string => typeof f === "string")
    : ui.state.fit && ui.state.fit.route === rec.id
      ? (ui.state.fit.flags ?? [])
      : [];

  return (
    <CardShell
      icon={<IconRoute size={19} />}
      tone={specialist ? "gold" : "accent"}
      title={specialist ? "Specialist review" : "Recommended route"}
      subtitle={specialist ? "Regulated activity" : "Picked from your facts and the AI checks"}
      meta={<ChecksMetaPill meta={meta} />}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <MicroLabel>{specialist ? "Next step" : "Your route"}</MicroLabel>
          <p className="mt-1 text-balance text-[21px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {specialist ? "Specialist review" : rec.name}
          </p>
        </div>
        {!specialist && typeof rec.licenceAed === "number" ? (
          <div className="shrink-0 sm:text-right">
            <p className="text-[21px] font-semibold leading-tight tabular-nums text-ink">{aed(rec.licenceAed)}</p>
            <p className="text-[12px] text-muted">licence, year one</p>
          </div>
        ) : null}
      </div>
      {rec.summary ? (
        <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-muted">
          <RichInline text={rec.summary} />
        </p>
      ) : null}

      {reasons.length ? (
        <CardSection label="Why">
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                <IconCheck size={16} strokeWidth={2.6} className="mt-[5px] shrink-0 text-accent" />
                <span className="min-w-0 text-pretty">
                  <RichInline text={r} />
                </span>
              </li>
            ))}
          </ul>
        </CardSection>
      ) : null}

      {flags.length ? (
        <div className="mt-4">
          <Notice tone="gold" icon={<IconFlag size={17} />}>
            <ul className="space-y-1">
              {flags.map((f, i) => (
                <li key={i} className="text-pretty">
                  <RichInline text={f} />
                </li>
              ))}
            </ul>
          </Notice>
        </div>
      ) : null}

      {prerequisites.length ? (
        <CardSection label="Before filing">
          <ul className="divide-y divide-line overflow-clip rounded-xl border border-line">
            {prerequisites.map((p, i) => {
              const st = PREREQ[p.state] ?? PREREQ.review;
              return (
                <li key={i} className="flex items-start gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug text-ink">{p.label}</p>
                    {p.note ? (
                      <p className="mt-0.5 text-pretty text-[13px] leading-snug text-muted">
                        <RichInline text={p.note} />
                      </p>
                    ) : null}
                  </div>
                  <Pill tone={st.tone} className="mt-px">
                    {st.label}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </CardSection>
      ) : null}

      {checks.length ? (
        <CardSection label="AI checks · TypeSafe" aside={<span className="text-[12px] text-muted">Not official decisions</span>}>
          <CheckList checks={checks} />
        </CardSection>
      ) : null}

      {alternatives.length ? (
        <CardSection label="Other routes">
          <ul className="space-y-2">
            {alternatives.map((a) => (
              <li key={a.id} className="rounded-xl border border-line bg-sunken px-3.5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 text-[15px] font-semibold leading-snug text-ink">{a.name}</p>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                    {aed(a.licenceAed)}
                    <span className="ml-1 text-[12px] font-normal text-muted">licence</span>
                  </p>
                </div>
                {a.why ? (
                  <p className="mt-1 text-pretty text-[14px] leading-snug text-muted">
                    <RichInline text={a.why} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
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
