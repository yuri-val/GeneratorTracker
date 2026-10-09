import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Generator, MaintenanceTask, Refill, WorkSession } from '../models/types';
import { getGenerators, getMaintenanceTasks, getRefills, getWorkSessions } from '../utils/storage';
import { calculateGeneratorStats } from '../utils/calculations';
import { averageLph, estimateFuel, type FuelEstimate } from '../utils/fuel';
import { generatorColor } from '../theme/tokens';
import { worstTask, type TaskWithStatus } from '../utils/maintenanceView';
import { sessionElapsedMs } from '../services/sessions';

export interface FleetItem {
  generator: Generator;
  color: string;
  running: WorkSession | null;
  sessions: WorkSession[];
  refills: Refill[];
  tasks: MaintenanceTask[];
  /** Completed engine hours (the running session is added live by the caller). */
  engineHours: number;
  lph: number;
  lastSession?: WorkSession;
  /** Fuel estimate at `now` (includes the running session). Null without a tank capacity. */
  fuel: FuelEstimate | null;
  maintenance: TaskWithStatus | null;
}

const byCreation = (a: Generator, b: Generator) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** Everything Home and the live bar need, computed for a moment in time. */
export function buildFleet(
  generators: Generator[], sessions: WorkSession[], refills: Refill[], tasks: MaintenanceTask[], now = Date.now(),
): FleetItem[] {
  const ordered = [...generators].sort(byCreation);
  const items = ordered.map((generator, index): FleetItem => {
    const gSessions = sessions.filter(s => s.generatorId === generator.id);
    const gRefills = refills.filter(r => r.generatorId === generator.id);
    const gTasks = tasks.filter(t => t.generatorId === generator.id);
    const running = gSessions.find(s => s.isActive) ?? null;
    const completed = gSessions.filter(s => !s.isActive);
    const engineHours = calculateGeneratorStats(completed, []).totalHours;
    const activeHours = running ? sessionElapsedMs(running, now) / 3_600_000 : 0;
    const lastSession = [...completed].sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))[0];
    return {
      generator,
      color: generatorColor(index),
      running,
      sessions: gSessions,
      refills: gRefills,
      tasks: gTasks,
      engineHours,
      lph: averageLph(gSessions, gRefills),
      lastSession,
      fuel: estimateFuel(generator, gSessions, gRefills, activeHours),
      maintenance: worstTask(gTasks, engineHours + activeHours, new Date(now)),
    };
  });
  // Running first (in creation order), then idle ones in stable creation order.
  return [...items.filter(i => i.running), ...items.filter(i => !i.running)];
}

/** Loads the fleet on focus; `reload()` after a start/stop/undo. */
export function useFleet() {
  const [raw, setRaw] = useState<{ g: Generator[]; s: WorkSession[]; r: Refill[]; t: MaintenanceTask[] } | null>(null);

  const reload = useCallback(async () => {
    const [g, s, r, t] = await Promise.all([getGenerators(), getWorkSessions(), getRefills(), getMaintenanceTasks()]);
    setRaw({ g, s, r, t });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload().catch(error => console.error('Error loading generators:', error));
    }, [reload]),
  );

  return { raw, reload };
}
