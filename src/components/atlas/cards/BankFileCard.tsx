"use client";

import { Fragment } from "react";
import type { BankFileCardData } from "@/lib/atlas/types";
import { useAtlasUi } from "../context";
import { IconAlert, IconCheck, IconChevronDown, IconLandmark, IconRefresh } from "../icons";
import { CheckList } from "../checks";
import { RichInline } from "../rich-text";
import { BUTTON, ChecksMetaPill, Notice, cx } from "../ui";
import { CardSection, CardShell } from "./CardShell";

const PLACEHOLDER = /\[Founder confirmation required\]/;

/** Section text with "[Founder confirmation required]" placeholders marked in gold. */
function SectionBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        const pieces = para.split(PLACEHOLDER);
        return (
          <p key={i} className="whitespace-pre-line text-pretty text-[14px] leading-relaxed text-ink">
            {pieces.map((piece, j) => (
              <Fragment key={j}>
                {j > 0 ? (
                  <mark className="rounded-md bg-gold-soft px-1.5 py-px font-medium text-gold-ink">Founder confirmation required</mark>
                ) : null}
                <RichInline text={piece} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function BankFileCard({ data }: { data: BankFileCardData }) {
  const ui = useAtlasUi();
  const meta = data.checksMeta;
  const sections = data.sections ?? [];
  const missing = data.missing ?? [];
  const checks = data.checks ?? [];
  // A missing fact and the check it fails are the same gap, so count the larger of the two, not both.
  const issues = Math.max(checks.filter((c) => c.verdict !== "pass").length, missing.length);
  const ready = !!data.ready && !!meta?.live;

  return (
    <CardShell
      icon={<IconLandmark size={19} />}
      tone={ready ? "good" : "accent"}
      title="Bank file"
      subtitle={data.bank ? `For ${data.bank} · drafted from facts you confirmed` : "Drafted from facts you confirmed"}
      meta={<ChecksMetaPill meta={meta} />}
    >
      {ready ? (
        <Notice tone="good" icon={<IconCheck size={18} strokeWidth={2.8} />} title="Prepared for bank review" role="status">
          Every AI check passed. Atlas71 sends the file with your account application{data.bank ? ` to ${data.bank}` : ""}.
        </Notice>
      ) : !meta?.live ? (
        <div>
          <Notice tone="gold" icon={<IconAlert size={18} />}>
            {meta?.error === "setup_required"
              ? "TypeSafe isn't set up on this deployment, so the file isn't checked yet."
              : "The AI check didn't answer, so the file isn't checked yet."}
          </Notice>
          <button
            type="button"
            className={cx(BUTTON.secondary, "mt-3")}
            disabled={ui.busy}
            onClick={() => ui.send("Re-check the bank file")}
          >
            <IconRefresh size={17} />
            Retry check
          </button>
        </div>
      ) : (
        <Notice tone="gold" icon={<IconAlert size={18} />} title="Not ready for the bank yet">
          {issues
            ? `${issues} ${issues === 1 ? "item needs" : "items need"} your answer. Reply in the chat and Atlas71 re-checks the file.`
            : "Reply in the chat and Atlas71 re-checks the file."}
        </Notice>
      )}

      {checks.length ? (
        <CardSection label="AI checks · TypeSafe" aside={<span className="text-[12px] text-muted">Not a bank decision</span>} className="mt-5">
          <CheckList checks={checks} />
        </CardSection>
      ) : null}

      {missing.length ? (
        <CardSection label="Still missing" className="mt-5">
          <ul className="space-y-1.5">
            {missing.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink">
                <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold" />
                <span className="min-w-0 text-pretty">
                  <RichInline text={m} />
                </span>
              </li>
            ))}
          </ul>
        </CardSection>
      ) : null}

      {sections.length ? (
        <CardSection label="The file" className="mt-5">
          <div className="divide-y divide-line overflow-clip rounded-xl border border-line">
            {sections.map((s, i) => {
              const needs = PLACEHOLDER.test(s.body ?? "");
              return (
                <details key={i} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 text-[14.5px] font-medium leading-snug text-ink">{s.title}</span>
                    {needs ? (
                      <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-ink">
                        Needs you
                      </span>
                    ) : null}
                    <IconChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-3.5 pb-3.5 pt-0.5">
                    <SectionBody body={s.body ?? ""} />
                  </div>
                </details>
              );
            })}
          </div>
        </CardSection>
      ) : null}
    </CardShell>
  );
}
