import type { MaintenanceTask } from '../../models/types';
import { worstTask, usedFraction, statusText, shortStatusText, criticalAxis } from '../maintenanceView';
import { calculateMaintenanceStatus } from '../calculations';

const t = ((key: string, o: Record<string, unknown> = {}) => `${key}:${JSON.stringify(o)}`) as any;
const META = { lastModified: '2026-10-01T00:00:00.000Z', syncStatus: 'synced' as const, createdAt: '2026-01-01T00:00:00.000Z', generatorId: 'g' };
const task = (id: string, extra: Partial<MaintenanceTask>): MaintenanceTask => ({
  id, title: id, lastServiceHours: 0, lastServiceDate: '2026-10-01', ...META, ...extra,
});
const NOW = new Date(2026, 9, 10, 12);

describe('maintenanceView', () => {
  it('picks the most urgent task that is not OK', () => {
    const tasks = [
      task('oil', { intervalHours: 100 }), // 104 h → due
      task('air', { intervalHours: 120 }), // 104 of 120 → soon? (≤ 12 h left → soon)
      task('plug', { intervalDays: 365 }), // ok
    ];
    expect(worstTask(tasks, 104, NOW)?.task.id).toBe('oil');
    expect(worstTask([tasks[1], tasks[2]], 110, NOW)?.task.id).toBe('air');
    expect(worstTask([tasks[2]], 110, NOW)).toBeNull();
  });

  it('bar fraction and texts follow the axis closer to its limit', () => {
    const tk = task('oil', { intervalHours: 100, intervalDays: 365 });
    const status = calculateMaintenanceStatus(tk, 104, NOW);
    expect(criticalAxis(tk, status)).toBe('hours');
    expect(usedFraction(tk, status)).toBe(1);
    expect(statusText(tk, status, t)).toBe('maintenance.hoursOverdue:{"hours":"4"}');
    expect(shortStatusText(tk, status, t)).toBe('maintenance.shortHoursOverdue:{"hours":"4"}');

    const days = task('battery', { intervalDays: 100, lastServiceDate: '2026-09-10' });
    const s2 = calculateMaintenanceStatus(days, 0, NOW);
    expect(criticalAxis(days, s2)).toBe('days');
    expect(usedFraction(days, s2)).toBeCloseTo(0.3);
    expect(statusText(days, s2, t)).toBe('maintenance.daysLeft:{"days":70}');
  });
});

it('localises fractional hours', () => {
  const tk = task('air', { intervalHours: 100, lastServiceHours: 0 });
  const status = calculateMaintenanceStatus(tk, 98.4, NOW);
  expect(shortStatusText(tk, status, t, 'uk')).toBe('maintenance.shortHoursLeft:{"hours":"1,6"}');
});
