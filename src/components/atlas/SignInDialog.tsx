"use client";

// Sandbox sign-in: two clicks for the presenter (a provider button, then the demo account).
// Deliberately not a copy of any real sign-in page: Atlas71's own look, no passwords, no codes,
// nothing collected. The accounts are the fictional personas.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Persona } from "@/lib/atlas/personas";
import { IconAt, IconChevronDown, IconMail, IconUserPlus, IconX, Spinner } from "./icons";
import { wrapTab } from "./focus";
import { initialsOf, personaName } from "./identity";
import { cx } from "./ui";

const SIGN_IN_MS = 700;

export function SignInDialog({
  persona,
  onClose,
  onSignedIn,
}: {
  persona: Persona;
  onClose: () => void;
  onSignedIn: (persona: Persona) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step, setStep] = useState<"start" | "choose">("start");
  const [signing, setSigning] = useState(false);
  const name = personaName(persona);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    try {
      if (!d.open) d.showModal();
    } catch {
      d.setAttribute("open", "");
    }
    document.documentElement.classList.add("atlas-locked");
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (d.open) d.close();
      document.documentElement.classList.remove("atlas-locked");
    };
  }, []);

  useEffect(() => {
    (step === "choose" ? accountRef : firstRef).current?.focus();
  }, [step]);

  const close = () => {
    if (!signing) onClose();
  };

  const signIn = () => {
    if (signing) return;
    setSigning(true);
    timer.current = setTimeout(() => onSignedIn(persona), SIGN_IN_MS);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="atlas-signin-title"
      aria-describedby="atlas-signin-sub"
      className="atlas-modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={wrapTab}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line-strong sm:hidden" />

        <div className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full border border-line bg-surface shadow-card">
            <Image src="/brand/atlas71-mark.png" width={40} height={40} alt="" className="size-10" />
          </span>
          <h2 id="atlas-signin-title" className="mt-4 text-[22px] font-semibold tracking-[-0.015em] text-ink">
            {step === "start" ? "Sign in to Atlas71" : "Choose an account"}
          </h2>
          <p id="atlas-signin-sub" className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-muted">
            {step === "start" ? (
              <>
                <span className="rounded-full border border-gold px-2 py-px text-[11.5px] font-semibold text-gold-ink">Sandbox</span>
                demo accounts only
              </>
            ) : (
              "to continue to Atlas71"
            )}
          </p>
        </div>

        {step === "start" ? (
          <div className="mt-7 space-y-2.5">
            <button
              ref={firstRef}
              type="button"
              onClick={() => setStep("choose")}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line-strong bg-surface px-4 text-left text-[15.5px] font-medium text-ink shadow-card transition-colors hover:border-accent hover:bg-sunken"
            >
              <IconAt size={19} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1">Continue with Google</span>
              <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink">sandbox</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-[15.5px] font-medium text-ink transition-colors hover:bg-sunken"
            >
              <IconMail size={19} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1">Continue with email</span>
            </button>
            <p className="pt-3 text-center text-[12.5px] leading-snug text-muted">
              No password or code. The demo accounts are fictional.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <ul className="divide-y divide-line overflow-clip rounded-xl border border-line">
              <li>
                <button
                  ref={accountRef}
                  type="button"
                  onClick={signIn}
                  aria-busy={signing}
                  className={cx(
                    "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2",
                    signing ? "bg-accent-soft" : "hover:bg-sunken",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-semibold text-white">
                    {initialsOf(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-medium text-ink">{name}</span>
                    <span className="block truncate text-[13.5px] text-muted">{persona.email}</span>
                  </span>
                  {signing ? <Spinner size={18} className="shrink-0 text-accent" /> : null}
                </button>
              </li>
              <li>
                <span
                  title="Demo accounts only"
                  aria-disabled="true"
                  className="flex min-h-14 w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-left text-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-line-strong">
                    <IconUserPlus size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px]">Use another account</span>
                  <span className="shrink-0 text-[12px]">Demo accounts only</span>
                </span>
              </li>
            </ul>
            <p aria-live="polite" className="mt-3 min-h-5 text-center text-[14px] text-muted">
              {signing ? "Signing you in…" : ""}
            </p>
            {!signing ? (
              <button
                type="button"
                onClick={() => setStep("start")}
                className="mx-auto mt-1 flex min-h-10 items-center gap-1 rounded-full px-3 text-[14px] font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <IconChevronDown size={15} className="rotate-90" />
                Back
              </button>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={close}
          disabled={signing}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
        >
          <IconX size={19} />
        </button>
      </div>
    </dialog>
  );
}
