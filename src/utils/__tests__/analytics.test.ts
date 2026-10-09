import { hoursByMonth, fuelByMonth, totalsByGenerator, lastMonths, niceMax, monthLabel } from '../analytics';
import type { Refill, WorkSession } from '../../models/types';

const META = { createdAt: '2026-06-01T00:00:00.000Z', lastModified: '2026-06-01T00:00:00.000Z', syncStatus: 'synced' as const };
let n = 0;
const session = (generatorId: string, date: string, hours: number, isActive = false): WorkSession => ({
  id: `s${n++}`, generatorId, date, startTime: '09:00', endTime: isActive ? undefined : '12:00', hours, isActive, ...META,
});
const refill = (generatorId: string, date: string, amount: number): Refill => ({ id: `r${n++}`, generatorId, date, amount, ...META });
const NOW = new Date(2026, 9, 10, 12); // 10 Oct 2026

describe('analytics', () => {
  it('lastMonths: six calendar months ending with the current one, across a year boundary', () => {
    expect(lastMonths(6, NOW)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(lastMonths(3, new Date(2026, 0, 5))).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('hours by month: split by generator in the given order, empty months kept, active sessions ignored', () => {
    const sessions = [
      session('a', '2026-10-01', 2), session('b', '2026-10-03', 4.5), session('a', '2026-10-05', 1),
      session('b', '2026-08-02', 3), session('a', '2026-10-09', 0, true), session('a', '2026-03-01', 9),
    ];
    const months = hoursByMonth(sessions, ['a', 'b'], 'en', 6, NOW);
    expect(months.map(m => m.total)).toEqual([0, 0, 0, 3, 0, 7.5]);
    expect(months[5].segments).toEqual([{ generatorId: 'a', value: 3 }, { generatorId: 'b', value: 4.5 }]);
    expect(months[3].segments).toEqual([{ generatorId: 'b', value: 3 }]);
    expect(months[5].label).toBe('Oct');
  });

  it('fuel by month keeps each generator separate (petrol and diesel are never one number)', () => {
    const months = fuelByMonth([refill('a', '2026-10-01', 3.6), refill('b', '2026-10-02', 40)], ['b', 'a'], 'uk', 2, NOW);
    expect(months[1].segments).toEqual([{ generatorId: 'b', value: 40 }, { generatorId: 'a', value: 3.6 }]);
    expect(months[1].label).toBe('жовт.');
  });

  it('totals by generator', () => {
    const totals = totalsByGenerator(
      [{ id: 'a' }, { id: 'b' }],
      [session('a', '2026-10-01', 4), session('a', '2026-10-02', 1, true)],
      [refill('a', '2026-10-01', 2), refill('a', '2026-10-02', 1)],
    );
    expect(totals).toEqual([
      { generatorId: 'a', hours: 4, litres: 3, lph: 0.75, sessions: 1, refills: 2 },
      { generatorId: 'b', hours: 0, litres: 0, lph: 0, sessions: 0, refills: 0 },
    ]);
  });

  it('niceMax rounds the axis up to 1 / 2 / 2.5 / 5 × 10ⁿ', () => {
    expect([0, 0.4, 3, 7, 12, 23, 130, 620].map(niceMax)).toEqual([1, 0.5, 5, 10, 20, 25, 200, 1000]);
  });

  it('month labels follow the UI language', () => {
    expect(monthLabel('2026-05', 'uk')).toBe('трав.');
    expect(monthLabel('2026-05', 'en')).toBe('May');
  });
});
