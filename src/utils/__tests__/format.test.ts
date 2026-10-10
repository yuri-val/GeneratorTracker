import { ukPlural, fmtLitres, fmtDurationWords, fmtClock, fmtTime, fmtShortDate, fmtSummary, fmtHours, NBSP } from '../format';

describe('format', () => {
  it('litres: decimal comma for uk, NBSP between ≈, number and unit', () => {
    expect(fmtLitres(2.4, 'uk')).toBe(`≈${NBSP}2,4${NBSP}л`);
    expect(fmtLitres(2.4, 'en')).toBe(`≈${NBSP}2.4${NBSP}L`);
    expect(fmtLitres(18, 'uk', false)).toBe(`18,0${NBSP}л`);
    expect(fmtHours(4.6, 'uk')).toBe(`4,6${NBSP}год`);
  });

  it('home timer in words, no seconds', () => {
    expect(fmtDurationWords((2 * 60 + 22) * 60_000 + 59_000, 'uk')).toBe(`2${NBSP}год 22${NBSP}хв`);
    expect(fmtDurationWords(41 * 60_000, 'en')).toBe(`0${NBSP}h 41${NBSP}min`);
    expect(fmtDurationWords(-5, 'en')).toBe(`0${NBSP}h 0${NBSP}min`);
  });

  it('detail clock with seconds', () => {
    expect(fmtClock((2 * 3600 + 22 * 60 + 17) * 1000)).toBe('2:22:17');
    expect(fmtClock(5000)).toBe('0:00:05');
  });

  it('time of day: 24 h for uk, 12 h for en', () => {
    const d = new Date(2026, 9, 4, 22, 59);
    expect(fmtTime(d, 'uk')).toBe('22:59');
    expect(fmtTime(d, 'en')).toMatch(/10:59\sPM/);
  });

  it('short date, local calendar day', () => {
    expect(fmtShortDate('2026-10-04', 'uk')).toBe('4 жовт.');
    expect(fmtShortDate('2026-10-04', 'en')).toBe('Oct 4');
  });

  it('summary with Ukrainian plural rules', () => {
    expect(fmtSummary(1, 1, 'uk')).toBe('1 генератор · 1 працює');
    expect(fmtSummary(3, 2, 'uk')).toBe('3 генератори · 2 працюють');
    expect(fmtSummary(5, 0, 'uk')).toBe('5 генераторів · усі вимкнені');
    expect(fmtSummary(21, 21, 'uk')).toBe('21 генератор · 21 працює');
    expect(fmtSummary(1, 0, 'en')).toBe('1 generator · all off');
    expect(fmtSummary(3, 2, 'en')).toBe('3 generators · 2 running');
  });
});

it('Ukrainian plural categories match Intl.PluralRules (which Hermes lacks)', () => {
  const rules = new Intl.PluralRules('uk-UA');
  for (let n = 0; n <= 125; n++) {
    const expected = rules.select(n) === 'other' ? 'many' : rules.select(n);
    expect([n, ukPlural(n)]).toEqual([n, expected]);
  }
});
