import { useId, type ReactNode } from "react";
import { cx, type Tone } from "../ui";

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink",
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-gold-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad",
};

/** One shell for every inline card: icon + title on the left, a meta pill on the right. */
export function CardShell({
  icon,
  tone = "accent",
  title,
  subtitle,
  meta,
  children,
  className,
}: {
  icon: ReactNode;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cx("atlas-rise min-w-0 rounded-card border border-line bg-surface shadow-card", className)}
    >
      <header className="flex items-start gap-3 px-4 pb-3.5 pt-4 sm:px-5 sm:pt-[18px]">
        <span className={cx("grid size-9 shrink-0 place-items-center rounded-[10px]", ICON_TONE[tone])}>{icon}</span>
        <div className="min-w-0 flex-1 pt-px">
          <h3 id={id} className="text-[15px] font-semibold leading-snug text-ink">
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-muted">{subtitle}</p> : null}
          {meta ? <div className="mt-2 flex sm:hidden">{meta}</div> : null}
        </div>
        {meta ? <div className="hidden shrink-0 pt-0.5 sm:flex">{meta}</div> : null}
      </header>
      <div className="border-t border-line px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}

/** A titled block inside a card body. */
export function CardSection({ label, children, className, aside }: { label: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <div className={cx("mt-5 first:mt-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="text-[12px] font-semibold uppercase leading-4 tracking-[0.09em] text-muted">{label}</h4>
        {aside}
      </div>
      {children}
    </div>
  );
}
