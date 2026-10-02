"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Health } from "./store";
import { IconChevronDown, IconLogOut, IconMore, IconPhone, IconRefresh, IconShare } from "./icons";
import { initialsOf, type Identity } from "./identity";
import { useInstall } from "./pwa";
import { Dot, cx } from "./ui";

function HealthBadge({ health }: { health: Health }) {
  const label = health === "live" ? "Live AI" : health === "setup" ? "AI setup required" : "Checking AI…";
  const short = health === "live" ? "Live AI" : health === "setup" ? "AI setup" : "AI…";
  return (
    <span
      title={label}
      className={cx(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-surface px-2.5 text-[13px] font-medium sm:px-3",
        health === "live" ? "border-good/25 text-ink" : "border-line text-muted",
      )}
    >
      <Dot
        className={cx(
          health === "live" && "bg-good shadow-[0_0_0_3px_color-mix(in_srgb,var(--good)_18%,transparent)]",
          health === "setup" && "bg-line-strong",
          health === "checking" && "atlas-pulse bg-line-strong",
        )}
      />
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

/** A small disclosure menu: Escape and outside taps close it; focus returns to the button. */
function OverflowMenu({
  items,
  hint,
  heading,
  trigger,
  label = "More",
  className,
}: {
  items: MenuItem[];
  hint?: ReactNode;
  heading?: ReactNode;
  trigger?: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  if (!items.length && !hint) return null;
  return (
    <div className={cx("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "rounded-full text-ink transition-colors",
          trigger
            ? "flex h-10 items-center gap-2 border border-line bg-surface pl-1 pr-2.5 hover:border-accent"
            : "grid size-11 place-items-center hover:bg-surface",
        )}
      >
        {trigger ?? <IconMore size={20} />}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={id}
          className="atlas-fade absolute right-0 top-[calc(100%+6px)] z-40 w-72 rounded-2xl border border-line bg-surface p-1.5 shadow-float"
        >
          {heading ? <div className="mb-1 border-b border-line px-3 pb-2.5 pt-2 text-[13px] leading-snug text-muted">{heading}</div> : null}
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-ink transition-colors hover:bg-sunken"
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {hint ? <div className={cx("px-3 py-2.5 text-[13px] leading-snug text-muted", items.length > 0 && "mt-1 border-t border-line")}>{hint}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function AccountHeading({ user }: { user: Identity }) {
  return (
    <span className="block">
      Signed in as <span className="font-medium text-ink [overflow-wrap:anywhere]">{user.email}</span>{" "}
      <span className="whitespace-nowrap text-gold-ink">(sandbox)</span>
    </span>
  );
}

export function Header({
  health,
  onReset,
  user,
  onSignOut,
}: {
  health: Health;
  onReset: () => void;
  user: Identity | null;
  onSignOut: () => void;
}) {
  const { canInstall, iosHint, install } = useInstall();
  const signOutItem: MenuItem[] = user
    ? [{ key: "signout", label: "Sign out", icon: <IconLogOut size={18} />, onSelect: onSignOut }]
    : [];
  const installItem: MenuItem[] = canInstall
    ? [{ key: "install", label: "Install app", icon: <IconPhone size={18} />, onSelect: () => void install() }]
    : [];
  const hint = iosHint ? (
    <span className="flex items-start gap-2">
      <IconShare size={16} className="mt-px shrink-0" />
      <span>To install, tap Share, then Add to Home Screen.</span>
    </span>
  ) : undefined;

  return (
    <header className="atlas-safe-top relative z-30 shrink-0 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="atlas-safe-x flex h-14 items-center gap-2.5 sm:h-16 sm:gap-3">
        <Image src="/brand/atlas71-mark.png" width={32} height={32} alt="" className="size-8 shrink-0" loading="eager" fetchPriority="high" />
        <p className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Atlas71</span>
          <span className="hidden text-[15px] text-muted sm:inline">· Abu Dhabi</span>
        </p>
        <span
          title="Filings, approvals and payments are simulated"
          className="ml-1 inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-gold bg-surface px-2.5 text-[12px] font-semibold text-gold-ink sm:h-8 sm:px-3 sm:text-[13px]"
        >
          <span className="md:hidden">Sandbox</span>
          <span className="hidden md:inline">Sandbox · simulated integrations</span>
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <HealthBadge health={health} />
          {user ? (
            <OverflowMenu
              className="hidden sm:block"
              label={`Account: ${user.name}`}
              trigger={
                <>
                  <span className="grid size-8 place-items-center rounded-full bg-accent text-[12.5px] font-semibold text-white">
                    {initialsOf(user.name)}
                  </span>
                  <span className="max-w-[9rem] truncate text-[14px] font-medium">{user.name.split(" ")[0]}</span>
                  <IconChevronDown size={15} className="text-muted" />
                </>
              }
              heading={<AccountHeading user={user} />}
              items={signOutItem}
            />
          ) : null}
          <button
            type="button"
            onClick={onReset}
            className="hidden h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent-ink sm:inline-flex"
          >
            <IconRefresh size={16} />
            Reset demo
          </button>
          <OverflowMenu
            className="sm:hidden"
            heading={user ? <AccountHeading user={user} /> : undefined}
            items={[{ key: "reset", label: "Reset demo", icon: <IconRefresh size={18} />, onSelect: onReset }, ...signOutItem, ...installItem]}
            hint={hint}
          />
          {installItem.length || hint ? <OverflowMenu className="hidden sm:block" items={installItem} hint={hint} /> : null}
        </div>
      </div>
    </header>
  );
}
