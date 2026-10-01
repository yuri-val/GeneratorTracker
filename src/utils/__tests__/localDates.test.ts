/**
 * S-10: calendar dates are local dates. jest.config.js pins TZ=America/New_York, where
 * 20:00 local is already the next day in UTC and a 'YYYY-MM-DD' string parsed with
 * `new Date()` (UTC midnight) is still the previous day.
 */
import {
  toLocalDateString,
  parseLocalDate,
  getCurrentDate,
  formatDate,
  calculateActiveSessionHours,
  calculateMaintenanceStatus,
} from '../calculations';
import { getHoursOverTime } from '../analytics';
import { MaintenanceTask, WorkSession } from '../../models/types';

// 2026-10-01 20:00 EDT = 2026-10-02 00:00 UTC
const EVENING = new Date('2026-10-02T00:00:00.000Z');

describe('local calendar dates (S-10)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(EVENING);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs in a zone where the UTC date differs from the local one', () => {
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-02');
  });

  it('getCurrentDate returns the local date', () => {
    expect(getCurrentDate()).toBe('2026-10-01');
  });

  it('toLocalDateString converts a picked date to its local calendar date', () => {
    expect(toLocalDateString(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01');
  });

  it('parseLocalDate returns local midnight of the same day and round-trips', () => {
    const date = parseLocalDate('2026-03-15');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 15, 0]);
    expect(toLocalDateString(parseLocalDate('2026-12-31'))).toBe('2026-12-31');
  });

  it('formatDate shows the stored day, not the day before', () => {
    expect(formatDate('2026-03-15', 'en-US')).toBe('Mar 15, 2026');
  });

  it('an active session started at 19:40 today shows 20 minutes', () => {
    expect(calculateActiveSessionHours('19:40', getCurrentDate())).toBeCloseTo(20 / 60, 5);
  });

  it('a date-based maintenance task counts days from the local today', () => {
    const task: MaintenanceTask = {
      id: 't1',
      generatorId: 'g1',
      title: 'Oil',
      intervalDays: 30,
      lastServiceDate: '2026-10-01',
      lastServiceHours: 0,
      createdAt: '2026-10-01T12:00:00.000Z',
      lastModified: '2026-10-01T12:00:00.000Z',
      syncStatus: 'synced',
    };
    expect(calculateMaintenanceStatus(task, 0).daysRemaining).toBe(30);
  });

  it('chart month labels use the stored month', () => {
    const session: WorkSession = {
      id: 's1',
      generatorId: 'g1',
      date: '2026-03-01',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      createdAt: '2026-03-01T09:00:00.000Z',
      lastModified: '2026-03-01T09:00:00.000Z',
      syncStatus: 'synced',
    };
    expect(getHoursOverTime([session], '#000', 'en-US')[0].label).toBe('Mar');
  });
});
