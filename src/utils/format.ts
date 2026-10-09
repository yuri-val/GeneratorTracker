// Number and time formatting for the 3.0 design. `lang` is i18n.language ('uk' | 'en').
// Digits are set in the mono font by the caller; NBSP ( ) keeps "≈" with its number and a
// number with its unit, so they never wrap apart.

export const NBSP = ' ';

const locale = (lang: string) => (lang === 'uk' ? 'uk-UA' : 'en-US');
const isUk = (lang: string) => lang === 'uk';

export const fmtNumber = (value: number, lang: string, digits = 1) =>
  new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** Litres without the unit, e.g. "2,4" / "2.4". */
export const fmtLitresValue = (value: number, lang: string) => fmtNumber(value, lang, 1);

export const litreUnit = (lang: string) => (isUk(lang) ? 'л' : 'L');
export const hourUnit = (lang: string) => (isUk(lang) ? 'год' : 'h');

/** "≈ 2,4 л" / "≈ 2.4 L". */
export const fmtLitres = (value: number, lang: string, approx = true) =>
  `${approx ? `≈${NBSP}` : ''}${fmtLitresValue(value, lang)}${NBSP}${litreUnit(lang)}`;

/** "4,6 год" / "4.6 h". */
export const fmtHours = (value: number, lang: string, digits = 1) => `${fmtNumber(value, lang, digits)}${NBSP}${hourUnit(lang)}`;

/** Home timer, words, no seconds: "2 год 22 хв" / "2 h 22 min". Re-render once a minute. */
export function fmtDurationWords(ms: number, lang: string) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return isUk(lang) ? `${h}${NBSP}год ${m}${NBSP}хв` : `${h}${NBSP}h ${m}${NBSP}min`;
}

/** Detail timer, clock with seconds: "2:22:17". Re-render every second (detail screen only). */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Time of day: "22:59" (uk) / "10:59 PM" (en). */
export const fmtTime = (date: Date, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(date);

/** A stored 'HH:mm' as a localised time of day. */
export const fmtClockTime = (hhmm: string, lang: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return fmtTime(d, lang);
};

/** Short date: "4 жовт." / "Oct 4". Accepts a Date or a local 'YYYY-MM-DD'. */
export const fmtShortDate = (date: Date | string, lang: string) => {
  const d = typeof date === 'string' ? new Date(`${date}T12:00`) : date;
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(d);
};

/** "3 генератори · 2 працюють" / "3 generators · 2 running". */
export function fmtSummary(total: number, running: number, lang: string) {
  if (!isUk(lang)) {
    return `${total} generator${total === 1 ? '' : 's'} · ${running === 0 ? 'all off' : `${running} running`}`;
  }
  const rules = new Intl.PluralRules('uk-UA');
  const noun = ({ one: 'генератор', few: 'генератори', many: 'генераторів', other: 'генератора' } as Record<string, string>)[
    rules.select(total)
  ];
  const verb = rules.select(running) === 'one' ? 'працює' : 'працюють';
  return `${total} ${noun} · ${running === 0 ? 'усі вимкнені' : `${running} ${verb}`}`;
}

const SLOT = '\u0000';
/**
 * Split a translated string around one interpolated value, so the value can be set in mono:
 * splitAround(t, 'home.since', 'time') → ['з ', ''] for "з {{time}}".
 */
export function splitAround(t: (key: string, options?: Record<string, unknown>) => string, key: string, name: string, extra: Record<string, unknown> = {}): [string, string] {
  const [before, after = ''] = t(key, { ...extra, [name]: SLOT }).split(SLOT);
  return [before, after];
}
