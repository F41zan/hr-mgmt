/**
 * lib/utils/dates.ts
 * Timezone-safe helpers that work on "YYYY-MM-DD" strings.
 * Safe to import from client components.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function toUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  return fromUtc(toUtc(value)) === value;
}

/** Inclusive list of dates between start and end. */
export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = toUtc(start);
  const last = toUtc(end);
  while (cur <= last) {
    out.push(fromUtc(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function isWeekend(dateStr: string): boolean {
  const day = toUtc(dateStr).getUTCDay();
  return day === 0 || day === 6;
}

/** Working days (Mon–Fri) between two dates, inclusive. */
export function workingDaysBetween(start: string, end: string): string[] {
  return eachDate(start, end).filter((d) => !isWeekend(d));
}

/** First and last date of a "YYYY-MM" month. */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(last).padStart(2, "0")}`,
  };
}

/** "2026-10" → "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Stored Date → "YYYY-MM-DD" in the business timezone. */
export function toDateString(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function currentMonth(): string {
  return toDateString(new Date()).slice(0, 7);
}
