// Analytics data (3.0): monthly totals split by generator, so petrol and diesel units are never
// summed into one anonymous bar, and per-generator totals for the "By generator" list.
import type { Generator, Refill, WorkSession } from '../models/types';

export interface MonthSegment {
  generatorId: string;
  value: number;
}

export interface MonthBucket {
  /** 'YYYY-MM' (local calendar month). */
  key: string;
  /** Short month name in the UI language, e.g. "жовт." / "Oct". */
  label: string;
  /** One segment per generator with a non-zero value, in the order of `generatorOrder`. */
  segments: MonthSegment[];
  total: number;
}

export interface GeneratorTotals {
  generatorId: string;
  hours: number;
  litres: number;
  /** Litres per hour; 0 while there are no completed hours. */
  lph: number;
  sessions: number;
  refills: number;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const locale = (lang: string) => (lang === 'uk' ? 'uk-UA' : 'en-US');

/** The last `count` calendar months ending with the month of `now` (oldest first). */
export function lastMonths(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return keys;
}

export const monthLabel = (key: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { month: 'short' }).format(new Date(`${key}-15T12:00`));

function buckets(
  records: { generatorId: string; date: string; value: number }[],
  generatorOrder: string[],
  months: number,
  lang: string,
  now: Date,
): MonthBucket[] {
  return lastMonths(months, now).map(key => {
    const segments = generatorOrder
      .map(generatorId => ({
        generatorId,
        value: round1(records.filter(r => r.generatorId === generatorId && r.date.startsWith(key)).reduce((s, r) => s + r.value, 0)),
      }))
      .filter(s => s.value > 0);
    return { key, label: monthLabel(key, lang), segments, total: round1(segments.reduce((s, x) => s + x.value, 0)) };
  });
}

/** Run hours per month (completed sessions), split by generator. */
export const hoursByMonth = (sessions: WorkSession[], generatorOrder: string[], lang: string, months = 6, now = new Date()) =>
  buckets(
    sessions.filter(s => !s.isActive && s.hours > 0).map(s => ({ generatorId: s.generatorId, date: s.date, value: s.hours })),
    generatorOrder,
    months,
    lang,
    now,
  );

/** Litres refilled per month, split by generator. */
export const fuelByMonth = (refills: Refill[], generatorOrder: string[], lang: string, months = 6, now = new Date()) =>
  buckets(
    refills.map(r => ({ generatorId: r.generatorId, date: r.date, value: r.amount })),
    generatorOrder,
    months,
    lang,
    now,
  );

/** All-time totals per generator (completed sessions only). */
export function totalsByGenerator(generators: Pick<Generator, 'id'>[], sessions: WorkSession[], refills: Refill[]): GeneratorTotals[] {
  return generators.map(g => {
    const done = sessions.filter(s => s.generatorId === g.id && !s.isActive);
    const fills = refills.filter(r => r.generatorId === g.id);
    const hours = done.reduce((s, x) => s + x.hours, 0);
    const litres = fills.reduce((s, x) => s + x.amount, 0);
    return {
      generatorId: g.id,
      hours: round1(hours),
      litres: round1(litres),
      lph: hours > 0 ? Math.round((litres / hours) * 100) / 100 : 0,
      sessions: done.length,
      refills: fills.length,
    };
  });
}

/** The largest "nice" value (1, 2, 2.5, 5 × 10ⁿ) at or below `value` — the chart's guide line. */
export function niceFloor(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [5, 2.5, 2, 1]) if (step * exp <= value) return step * exp;
  return exp;
}
