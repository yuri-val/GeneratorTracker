// Number / time formatting for Generator Tracker 3.0. Locale = i18n.language ('uk' | 'en').
// Rule: digits in IBM Plex Mono; units and words in IBM Plex Sans; NBSP (\u00A0) between
// "≈" and number and between number and unit so they never wrap apart.

const NBSP = '\u00A0';
const loc = (l: string) => (l === 'uk' ? 'uk-UA' : 'en-US');

export const fmtNumber = (v: number, l: string, digits = 1) =>
  new Intl.NumberFormat(loc(l), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

/** "≈ 2,4 л" / "≈ 2.4 L" */
export const fmtLitres = (v: number, l: string, approx = true) =>
  `${approx ? '≈' + NBSP : ''}${fmtNumber(v, l)}${NBSP}${l === 'uk' ? 'л' : 'L'}`;

/** Home timer — words, no seconds: "2 год 22 хв" / "2 h 22 min". Re-render once a minute. */
export function fmtDurationWords(ms: number, l: string) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), mm = m % 60;
  return l === 'uk' ? `${h}${NBSP}год ${mm}${NBSP}хв` : `${h}${NBSP}h ${mm}${NBSP}min`;
}

/** Detail timer — clock with seconds: "2:22:17". Re-render every second (detail screen only). */
export function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000), p = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

/** Time of day: "22:59" (uk) / "10:59 PM" (en) */
export const fmtTime = (d: Date, l: string) =>
  new Intl.DateTimeFormat(loc(l), { hour: '2-digit', minute: '2-digit' }).format(d);

/** Short date: "4 жовт." / "Oct 4" */
export const fmtShortDate = (d: Date, l: string) =>
  new Intl.DateTimeFormat(loc(l), { day: 'numeric', month: 'short' }).format(d);

/** "3 генератори · 2 працюють" — Ukrainian plural rules via Intl.PluralRules. */
export function fmtSummary(total: number, running: number, l: string) {
  const pr = new Intl.PluralRules(loc(l));
  if (l !== 'uk') return `${total} generator${total === 1 ? '' : 's'} · ${running === 0 ? 'all off' : `${running} running`}`;
  const gen = { one: 'генератор', few: 'генератори', many: 'генераторів', other: 'генератора' }[pr.select(total)];
  const run = pr.select(running) === 'one' ? 'працює' : 'працюють';
  return `${total} ${gen} · ${running === 0 ? 'усі вимкнені' : `${running} ${run}`}`;
}
