/** One cell of the month grid. `date` is a local calendar date, YYYY-MM-DD. */
export interface GridDay {
  date: string;
  inMonth: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Dates are built in UTC so the arithmetic never meets a daylight-saving shift; only the Y-M-D parts are used.
const isoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function parseMonth(month: string): [number, number] {
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
}

/**
 * Monday-first weeks from the Monday on or before the 1st to the Sunday on or after the last day.
 * Same rule as CalendarGrid in the API.
 */
export function buildMonthGrid(month: string): GridDay[][] {
  const [year, mon] = parseMonth(month);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const last = new Date(Date.UTC(year, mon, 0));
  const sinceMonday = (d: Date) => (d.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, mon - 1, 1 - sinceMonday(first));
  const count = sinceMonday(first) + last.getUTCDate() + (6 - sinceMonday(last));

  const weeks: GridDay[][] = [];
  for (let w = 0; w < count / 7; w++) {
    weeks.push(
      Array.from({ length: 7 }, (_, d) => {
        const day = new Date(start + (w * 7 + d) * 86_400_000);
        return { date: isoDate(day), inMonth: day.getUTCMonth() === mon - 1 };
      }),
    );
  }
  return weeks;
}

/** The month `delta` months away, YYYY-MM. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = parseMonth(month);
  return isoDate(new Date(Date.UTC(year, mon - 1 + delta, 1))).slice(0, 7);
}

/** The date `delta` days away, YYYY-MM-DD. */
export function shiftDay(date: string, delta: number): string {
  const [year, mon] = parseMonth(date);
  return isoDate(new Date(Date.UTC(year, mon - 1, Number(date.slice(8, 10)) + delta)));
}

/** True for a real YYYY-MM-DD date in the years 2000–2100 (the API's rule). */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100 && shiftDay(value, 0) === value;
}

/** The YYYY-MM part of a YYYY-MM-DD date. */
export const monthOf = (date: string) => date.slice(0, 7);

/** Today's local date, YYYY-MM-DD (not the UTC date). */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
