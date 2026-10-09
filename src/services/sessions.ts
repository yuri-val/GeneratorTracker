// Starting, stopping and undoing work sessions (since 3.0 shared by Home, the generator screen,
// the live bar and the refill sheet). Every write goes through storage.saveWorkSession / saveRefill,
// so records are pending with a fresh lastModified and sync exactly as before.
import type { Refill, WorkSession } from '../models/types';
import { getActiveWorkSession, getWorkSessions, saveRefill, saveWorkSession } from '../utils/storage';
import { calculateActiveSessionHours, generateId, getCurrentDate, getCurrentTime } from '../utils/calculations';

type Listener = () => void;
const listeners = new Set<Listener>();
/** Subscribe to start/stop/undo writes (the live bar on the tabs listens). Returns unsubscribe. */
export const onSessionsChanged = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const emit = () => listeners.forEach(l => l());

/** Elapsed milliseconds of a running session (date + startTime are local). */
export const sessionElapsedMs = (session: Pick<WorkSession, 'date' | 'startTime'>, now = Date.now()): number =>
  Math.max(0, now - new Date(`${session.date}T${session.startTime}`).getTime());

/** Start a session now. Returns the running session (an already running one is returned as is). */
export async function startSession(generatorId: string): Promise<WorkSession> {
  const running = await getActiveWorkSession(generatorId);
  if (running) return running;
  const now = new Date().toISOString();
  const session: WorkSession = {
    id: generateId(),
    generatorId,
    date: getCurrentDate(),
    startTime: getCurrentTime(),
    hours: 0,
    createdAt: now,
    isActive: true,
    lastModified: now,
    syncStatus: 'pending',
  };
  await saveWorkSession(session);
  emit();
  return session;
}

export interface StoppedSession {
  /** The session as it was while running — pass it to undoStop. */
  running: WorkSession;
  /** The completed session that was saved. */
  stopped: WorkSession;
}

/**
 * Stop a running session. The duration comes from the real elapsed time (so a session longer than a
 * day is not cut at 24 h), rounded to 0.1 h like the manual session form.
 */
export async function stopSession(running: WorkSession): Promise<StoppedSession> {
  const hours = Math.round(calculateActiveSessionHours(running.startTime, running.date) * 10) / 10;
  const stopped: WorkSession = {
    ...running,
    endTime: getCurrentTime(),
    hours,
    isActive: false,
    lastModified: new Date().toISOString(),
    syncStatus: 'pending',
  };
  await saveWorkSession(stopped);
  emit();
  return { running, stopped };
}

/**
 * Undo a stop: the session runs again from its original start time. Skipped when the record was
 * removed meanwhile, or when another session of the same generator has started since.
 */
export async function undoStop(running: WorkSession): Promise<boolean> {
  const sessions = await getWorkSessions(running.generatorId);
  if (!sessions.some(s => s.id === running.id)) return false;
  if (sessions.some(s => s.isActive && s.id !== running.id)) return false;
  await saveWorkSession({
    ...running,
    endTime: undefined,
    hours: 0,
    isActive: true,
    lastModified: new Date().toISOString(),
    syncStatus: 'pending',
  });
  emit();
  return true;
}

/** "Stop and refill": ends the running session; the refill gets the stop date and time. */
export async function stopForRefill(running: WorkSession): Promise<{ stopped: WorkSession; date: string; time: string }> {
  const { stopped } = await stopSession(running);
  return { stopped, date: getCurrentDate(), time: stopped.endTime ?? getCurrentTime() };
}

/** Save a refill recorded in the 3.0 sheet. */
export async function recordRefill(input: {
  id?: string;
  generatorId: string;
  amount: number;
  date: string;
  time?: string;
  isFull: boolean;
  notes?: string;
  createdAt?: string;
}): Promise<Refill> {
  const now = new Date().toISOString();
  const refill: Refill = {
    id: input.id ?? generateId(),
    generatorId: input.generatorId,
    date: input.date,
    time: input.time,
    amount: input.amount,
    isFull: input.isFull || undefined,
    notes: input.notes,
    createdAt: input.createdAt ?? now,
    lastModified: now,
    syncStatus: 'pending',
  };
  await saveRefill(refill);
  return refill;
}
