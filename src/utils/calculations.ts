import {
  WorkSession,
  Refill,
  GeneratorStats,
  MaintenanceTask,
  MaintenanceStatus,
  MaintenanceStatusLevel,
  MaintenanceSummary,
} from '../models/types';

export const calculateHours = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight sessions
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
};

export const calculateGeneratorStats = (
  workSessions: WorkSession[],
  refills: Refill[]
): GeneratorStats => {
  const totalHours = workSessions.reduce((sum, session) => sum + session.hours, 0);
  const totalRefills = refills.length;
  const totalFuel = refills.reduce((sum, refill) => sum + refill.amount, 0);

  const averageFuelPerHour = totalHours > 0 ? totalFuel / totalHours : 0;

  const sortedSessions = [...workSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastWorkSessionDate = sortedSessions[0]?.date;

  const sortedRefills = [...refills].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastRefillDate = sortedRefills[0]?.date;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalRefills,
    averageFuelPerHour: Math.round(averageFuelPerHour * 100) / 100,
    lastWorkSessionDate,
    lastRefillDate,
  };
};

export const formatDate = (dateString: string, locale: string = 'en-US'): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timeString: string, locale: string = 'en-US'): string => {
  const [hour, minute] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale.startsWith('en'),
  });
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getCurrentDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const calculateActiveSessionHours = (startTime: string, startDate: string): number => {
  const sessionStart = new Date(`${startDate}T${startTime}`);
  const now = new Date();
  const diffMs = now.getTime() - sessionStart.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
};

// ===== Maintenance =====

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SOON_DAYS = 7; // a date-based task is "soon" within this many days
const SOON_HOURS_FRACTION = 0.1; // an hours-based task is "soon" within 10% of its interval

// Parse a 'YYYY-MM-DD' date as UTC midnight so day math is timezone-independent.
const parseDateUTC = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const toDateStringUTC = (ms: number): string => new Date(ms).toISOString().split('T')[0];

const startOfDayUTC = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const worstLevel = (a: MaintenanceStatusLevel, b: MaintenanceStatusLevel): MaintenanceStatusLevel => {
  const rank: Record<MaintenanceStatusLevel, number> = { ok: 0, soon: 1, due: 2 };
  return rank[a] >= rank[b] ? a : b;
};

/**
 * Determine whether a maintenance task is ok / due soon / due, based on the
 * generator's current engine hours and the calendar. When both an hours- and a
 * date-interval are set, the worst (soonest-due) axis wins.
 */
export const calculateMaintenanceStatus = (
  task: MaintenanceTask,
  currentEngineHours: number,
  now: Date = new Date()
): MaintenanceStatus => {
  const status: MaintenanceStatus = { level: 'ok' };
  let level: MaintenanceStatusLevel = 'ok';
  let hasAxis = false;

  if (task.intervalHours && task.intervalHours > 0) {
    hasAxis = true;
    const dueHours = task.lastServiceHours + task.intervalHours;
    const hoursRemaining = dueHours - currentEngineHours;
    status.dueHours = dueHours;
    status.hoursRemaining = hoursRemaining;

    const hoursLevel: MaintenanceStatusLevel =
      hoursRemaining <= 0
        ? 'due'
        : hoursRemaining <= task.intervalHours * SOON_HOURS_FRACTION
        ? 'soon'
        : 'ok';
    level = worstLevel(level, hoursLevel);
  }

  if (task.intervalDays && task.intervalDays > 0) {
    hasAxis = true;
    const dueMs = parseDateUTC(task.lastServiceDate) + task.intervalDays * MS_PER_DAY;
    const daysRemaining = Math.round((dueMs - startOfDayUTC(now)) / MS_PER_DAY);
    status.dueDate = toDateStringUTC(dueMs);
    status.daysRemaining = daysRemaining;

    const dateLevel: MaintenanceStatusLevel =
      daysRemaining <= 0 ? 'due' : daysRemaining <= SOON_DAYS ? 'soon' : 'ok';
    level = worstLevel(level, dateLevel);
  }

  status.level = hasAxis ? level : 'ok';
  return status;
};

/**
 * Aggregate the maintenance state of all of a generator's tasks into the worst
 * level plus per-bucket counts (drives badges on Home and the Detail header).
 */
export const getGeneratorMaintenanceSummary = (
  tasks: MaintenanceTask[],
  currentEngineHours: number,
  now: Date = new Date()
): MaintenanceSummary => {
  let level: MaintenanceStatusLevel = 'ok';
  let dueCount = 0;
  let soonCount = 0;

  for (const task of tasks) {
    const { level: taskLevel } = calculateMaintenanceStatus(task, currentEngineHours, now);
    if (taskLevel === 'due') dueCount++;
    else if (taskLevel === 'soon') soonCount++;
    level = worstLevel(level, taskLevel);
  }

  return { level, dueCount, soonCount, total: tasks.length };
};

/**
 * Reset a task's counters after the user marks it serviced. The caller persists
 * the returned task via storage.
 */
export const markTaskServiced = (
  task: MaintenanceTask,
  currentEngineHours: number,
  date: string
): MaintenanceTask => ({
  ...task,
  lastServiceHours: currentEngineHours,
  lastServiceDate: date,
  lastModified: new Date().toISOString(),
  syncStatus: 'pending',
});
