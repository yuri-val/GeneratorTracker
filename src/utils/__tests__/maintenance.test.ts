import {
  calculateMaintenanceStatus,
  getGeneratorMaintenanceSummary,
  markTaskServiced,
} from '../calculations';
import { MaintenanceTask } from '../../models/types';

// Factory for a maintenance task with sensible defaults.
const makeTask = (overrides: Partial<MaintenanceTask> = {}): MaintenanceTask => ({
  id: 't1',
  generatorId: 'g1',
  title: 'Oil change',
  intervalHours: 250,
  intervalDays: undefined,
  lastServiceHours: 0,
  lastServiceDate: '2026-01-01',
  notes: undefined,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastModified: '2026-01-01T00:00:00.000Z',
  syncStatus: 'synced',
  ...overrides,
});

// Fixed "now" so date-based assertions are deterministic.
const NOW = new Date('2026-06-29T12:00:00.000Z');

describe('calculateMaintenanceStatus — hours-based interval', () => {
  it('is OK when well below the interval', () => {
    const task = makeTask({ intervalHours: 250, lastServiceHours: 100 });
    const status = calculateMaintenanceStatus(task, 200, NOW); // 100 used of 250
    expect(status.level).toBe('ok');
    expect(status.hoursRemaining).toBe(150); // 100 + 250 - 200
    expect(status.dueHours).toBe(350);
  });

  it('is SOON when within 10% of the interval', () => {
    const task = makeTask({ intervalHours: 250, lastServiceHours: 0 });
    // dueHours = 250, current = 230 -> 20 remaining, threshold = 25
    const status = calculateMaintenanceStatus(task, 230, NOW);
    expect(status.level).toBe('soon');
    expect(status.hoursRemaining).toBe(20);
  });

  it('is DUE exactly at the interval', () => {
    const task = makeTask({ intervalHours: 250, lastServiceHours: 0 });
    const status = calculateMaintenanceStatus(task, 250, NOW);
    expect(status.level).toBe('due');
    expect(status.hoursRemaining).toBe(0);
  });

  it('is DUE (overdue) past the interval, with negative hoursRemaining', () => {
    const task = makeTask({ intervalHours: 250, lastServiceHours: 0 });
    const status = calculateMaintenanceStatus(task, 300, NOW);
    expect(status.level).toBe('due');
    expect(status.hoursRemaining).toBe(-50);
  });
});

describe('calculateMaintenanceStatus — date-based interval', () => {
  it('is OK when the due date is far away', () => {
    const task = makeTask({
      intervalHours: undefined,
      intervalDays: 180,
      lastServiceDate: '2026-06-01',
    });
    const status = calculateMaintenanceStatus(task, 0, NOW);
    expect(status.level).toBe('ok');
    expect(status.dueDate).toBe('2026-11-28'); // 2026-06-01 + 180 days
    expect(status.daysRemaining).toBeGreaterThan(7);
  });

  it('is SOON when within 7 days of the due date', () => {
    const task = makeTask({
      intervalHours: undefined,
      intervalDays: 30,
      lastServiceDate: '2026-06-04', // due 2026-07-04, NOW is 2026-06-29 -> 5 days
    });
    const status = calculateMaintenanceStatus(task, 0, NOW);
    expect(status.level).toBe('soon');
    expect(status.daysRemaining).toBe(5);
  });

  it('is DUE when the due date has passed', () => {
    const task = makeTask({
      intervalHours: undefined,
      intervalDays: 30,
      lastServiceDate: '2026-05-01', // due 2026-05-31, well before NOW
    });
    const status = calculateMaintenanceStatus(task, 0, NOW);
    expect(status.level).toBe('due');
    expect(status.daysRemaining).toBeLessThan(0);
  });
});

describe('calculateMaintenanceStatus — combined intervals (worst axis wins)', () => {
  it('is DUE when hours are fine but the date has passed', () => {
    const task = makeTask({
      intervalHours: 250,
      lastServiceHours: 0,
      intervalDays: 30,
      lastServiceDate: '2026-05-01', // date overdue
    });
    const status = calculateMaintenanceStatus(task, 10, NOW); // hours fine
    expect(status.level).toBe('due');
  });

  it('is SOON when hours are soon but the date is fine', () => {
    const task = makeTask({
      intervalHours: 250,
      lastServiceHours: 0,
      intervalDays: 365,
      lastServiceDate: '2026-06-01',
    });
    const status = calculateMaintenanceStatus(task, 240, NOW); // 10 hours left -> soon
    expect(status.level).toBe('soon');
  });
});

describe('calculateMaintenanceStatus — no interval set', () => {
  it('is OK with no remaining figures', () => {
    const task = makeTask({ intervalHours: undefined, intervalDays: undefined });
    const status = calculateMaintenanceStatus(task, 999, NOW);
    expect(status.level).toBe('ok');
    expect(status.hoursRemaining).toBeUndefined();
    expect(status.daysRemaining).toBeUndefined();
  });
});

describe('getGeneratorMaintenanceSummary', () => {
  it('reports ok with no tasks', () => {
    const summary = getGeneratorMaintenanceSummary([], 100, NOW);
    expect(summary.level).toBe('ok');
    expect(summary.total).toBe(0);
    expect(summary.dueCount).toBe(0);
    expect(summary.soonCount).toBe(0);
  });

  it('returns the worst level across tasks and counts each bucket', () => {
    // currentEngineHours = 110 for all:
    const tasks = [
      makeTask({ id: 'a', intervalHours: 250, lastServiceHours: 0 }), // due 250, remaining 140 -> ok
      makeTask({ id: 'b', intervalHours: 100, lastServiceHours: 0 }), // due 100, remaining -10 -> due
      makeTask({ id: 'c', intervalHours: 120, lastServiceHours: 0 }), // due 120, remaining 10 (<=12) -> soon
    ];
    const summary = getGeneratorMaintenanceSummary(tasks, 110, NOW);
    expect(summary.total).toBe(3);
    expect(summary.level).toBe('due'); // worst wins
    expect(summary.dueCount).toBe(1);
    expect(summary.soonCount).toBe(1);
  });
});

describe('markTaskServiced', () => {
  it('resets the counters to the current hours and given date', () => {
    const task = makeTask({ lastServiceHours: 0, lastServiceDate: '2026-01-01' });
    const updated = markTaskServiced(task, 275, '2026-06-29');
    expect(updated.lastServiceHours).toBe(275);
    expect(updated.lastServiceDate).toBe('2026-06-29');
    // After servicing, the task should read as OK again.
    const status = calculateMaintenanceStatus(updated, 275, NOW);
    expect(status.level).toBe('ok');
  });
});
