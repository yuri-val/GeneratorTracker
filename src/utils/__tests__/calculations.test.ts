import {
  calculateHours,
  calculateGeneratorStats,
  generateId,
  getCurrentTime,
  calculateActiveSessionHours,
  formatTime,
} from '../calculations';
import { WorkSession, Refill } from '../../models/types';

const NOW = '2026-06-29T10:00:00.000Z';

const session = (date: string, hours: number, overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: `${date}-${hours}`,
  generatorId: 'g1',
  date,
  startTime: '09:00',
  endTime: '12:00',
  hours,
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'synced',
  ...overrides,
});

const refill = (date: string, amount: number): Refill => ({
  id: `${date}-${amount}`,
  generatorId: 'g1',
  date,
  amount,
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'synced',
});

describe('calculateHours', () => {
  it('computes a same-day duration', () => {
    expect(calculateHours('09:00', '17:00')).toBe(8);
    expect(calculateHours('10:30', '11:15')).toBe(0.75);
  });

  it('treats an end time before the start time as an overnight session', () => {
    expect(calculateHours('22:00', '02:00')).toBe(4);
    expect(calculateHours('23:30', '00:15')).toBe(0.75);
  });

  it('returns 0 for identical times', () => {
    expect(calculateHours('08:00', '08:00')).toBe(0);
  });
});

describe('calculateGeneratorStats', () => {
  it('returns zeros for an empty history', () => {
    expect(calculateGeneratorStats([], [])).toEqual({
      totalHours: 0,
      totalRefills: 0,
      averageFuelPerHour: 0,
      lastWorkSessionDate: undefined,
      lastRefillDate: undefined,
    });
  });

  it('sums hours, counts refills and derives fuel per hour, rounded', () => {
    const stats = calculateGeneratorStats(
      [session('2026-06-01', 2.25), session('2026-06-10', 3.33)],
      [refill('2026-06-02', 10), refill('2026-06-11', 4.5)]
    );

    expect(stats.totalHours).toBe(5.6); // 5.58 rounded to one decimal
    expect(stats.totalRefills).toBe(2);
    expect(stats.averageFuelPerHour).toBe(2.6); // 14.5 / 5.58 = 2.598...
  });

  it('reports the most recent session and refill dates regardless of input order', () => {
    const stats = calculateGeneratorStats(
      [session('2026-06-10', 1), session('2026-06-25', 1), session('2026-06-01', 1)],
      [refill('2026-05-01', 1), refill('2026-06-20', 1)]
    );

    expect(stats.lastWorkSessionDate).toBe('2026-06-25');
    expect(stats.lastRefillDate).toBe('2026-06-20');
  });
});

describe('generateId', () => {
  it('produces unique, timestamp-prefixed ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateId()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(/^\d{13,}-[a-z0-9]{1,9}$/);
    }
  });
});

describe('time helpers (fixed clock)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Local time, so the assertions hold in any timezone.
    jest.setSystemTime(new Date(2026, 5, 29, 14, 5, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getCurrentTime returns the local HH:mm', () => {
    expect(getCurrentTime()).toBe('14:05');
  });

  it('calculateActiveSessionHours measures elapsed time from a local date + time', () => {
    expect(calculateActiveSessionHours('12:05', '2026-06-29')).toBeCloseTo(2, 5);
    expect(calculateActiveSessionHours('10:05', '2026-06-28')).toBeCloseTo(28, 5);
  });

  it('calculateActiveSessionHours never goes negative for a start in the future', () => {
    expect(calculateActiveSessionHours('18:00', '2026-06-29')).toBe(0);
  });
});

describe('formatTime', () => {
  it('uses 12-hour clock for English and 24-hour for Ukrainian', () => {
    expect(formatTime('09:05', 'en-US')).toBe('9:05 AM');
    expect(formatTime('21:05', 'uk')).toBe('21:05');
  });
});
