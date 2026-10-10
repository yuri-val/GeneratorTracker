// Presentation helpers for maintenance in the 3.0 design: which task to surface, its status text and
// how much of the service interval is used (the bar on the generator screen).
import type { TFunction } from 'i18next';
import type { MaintenanceStatus, MaintenanceStatusLevel, MaintenanceTask } from '../models/types';
import { calculateMaintenanceStatus } from './calculations';
import { fmtNumber } from './format';

const RANK: Record<MaintenanceStatusLevel, number> = { ok: 0, soon: 1, due: 2 };
/** Hours with at most one decimal, localised ("1,6" in Ukrainian). */
const hrs = (v: number, lang: string) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : fmtNumber(r, lang);
};

/** Fraction of the interval used on each axis (1 = due now, > 1 = overdue). */
const axisFractions = (task: MaintenanceTask, status: MaintenanceStatus) => ({
  hours: task.intervalHours && status.hoursRemaining !== undefined ? 1 - status.hoursRemaining / task.intervalHours : undefined,
  days: task.intervalDays && status.daysRemaining !== undefined ? 1 - status.daysRemaining / task.intervalDays : undefined,
});

/** The axis that is closer to (or further past) its limit — the one worth telling the user about. */
export function criticalAxis(task: MaintenanceTask, status: MaintenanceStatus): 'hours' | 'days' | undefined {
  const f = axisFractions(task, status);
  if (f.hours === undefined) return f.days === undefined ? undefined : 'days';
  if (f.days === undefined) return 'hours';
  return f.hours >= f.days ? 'hours' : 'days';
}

/** Used share of the interval for the bar, capped at 100 %. */
export function usedFraction(task: MaintenanceTask, status: MaintenanceStatus): number {
  const axis = criticalAxis(task, status);
  if (!axis) return 0;
  const value = axisFractions(task, status)[axis] ?? 0;
  return Math.min(1, Math.max(0, value));
}

/** Detail screen: "Прострочено на 4 год" / "Залишилось 70 дн.". */
export function statusText(task: MaintenanceTask, status: MaintenanceStatus, t: TFunction, lang = 'en'): string {
  const axis = criticalAxis(task, status);
  if (axis === 'hours') {
    const h = status.hoursRemaining!;
    return h >= 0 ? t('maintenance.hoursLeft', { hours: hrs(h, lang) }) : t('maintenance.hoursOverdue', { hours: hrs(-h, lang) });
  }
  if (axis === 'days') {
    const d = status.daysRemaining!;
    return d >= 0 ? t('maintenance.daysLeft', { days: d }) : t('maintenance.daysOverdue', { days: -d });
  }
  return t('maintenance.statusOk');
}

/** Home: "прострочено 4 год" / "ще 12 год" (follows the task title). */
export function shortStatusText(task: MaintenanceTask, status: MaintenanceStatus, t: TFunction, lang = 'en'): string {
  const axis = criticalAxis(task, status);
  if (axis === 'hours') {
    const h = status.hoursRemaining!;
    return h >= 0 ? t('maintenance.shortHoursLeft', { hours: hrs(h, lang) }) : t('maintenance.shortHoursOverdue', { hours: hrs(-h, lang) });
  }
  if (axis === 'days') {
    const d = status.daysRemaining!;
    return d >= 0 ? t('maintenance.shortDaysLeft', { days: d }) : t('maintenance.shortDaysOverdue', { days: -d });
  }
  return '';
}

export interface TaskWithStatus {
  task: MaintenanceTask;
  status: MaintenanceStatus;
}

/** The single most urgent task that is not OK (due before soon, then the most used interval). */
export function worstTask(tasks: MaintenanceTask[], engineHours: number, now = new Date()): TaskWithStatus | null {
  let best: (TaskWithStatus & { used: number }) | null = null;
  for (const task of tasks) {
    const status = calculateMaintenanceStatus(task, engineHours, now);
    if (status.level === 'ok') continue;
    const f = axisFractions(task, status);
    const used = Math.max(f.hours ?? -Infinity, f.days ?? -Infinity);
    if (!best || RANK[status.level] > RANK[best.status.level] || (status.level === best.status.level && used > best.used)) {
      best = { task, status, used };
    }
  }
  return best ? { task: best.task, status: best.status } : null;
}
