// Date and money helpers shared by the engine, the agent and the UI.
// Dates are ISO calendar days ("2026-10-16") and all math runs in UTC, so server and browser agree.

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = toUtc(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

export function maxDate(...dates: (string | undefined | null)[]): string {
  return dates.filter((d): d is string => !!d).reduce((a, b) => (b > a ? b : a));
}

/** Local calendar date of the browser or server, as ISO. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "16 Oct" */
export function fmtDate(iso: string): string {
  const d = toUtc(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "16 Oct 2026" */
export function fmtDateLong(iso: string): string {
  return `${fmtDate(iso)} ${toUtc(iso).getUTCFullYear()}`;
}

/** "Fri 16 Oct" */
export function fmtDay(iso: string): string {
  return `${WEEKDAYS[toUtc(iso).getUTCDay()]} ${fmtDate(iso)}`;
}

/** "16–21 Oct", "30 Oct – 4 Nov", or "16 Oct" when both ends match. */
export function fmtRange(from: string, to: string): string {
  if (from === to) return fmtDate(from);
  const a = toUtc(from);
  const b = toUtc(to);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  }
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

/** "Day 14 · Fri 16 Oct" */
export function fmtSimDay(startDate: string, iso: string): string {
  return `Day ${diffDays(startDate, iso)} · ${fmtDay(iso)}`;
}

/** "40,075" */
export function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "AED 40,075" */
export function aed(n: number): string {
  return `AED ${num(n)}`;
}
