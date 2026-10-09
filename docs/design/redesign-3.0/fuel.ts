// Fuel level estimation + refill calibration for Generator Tracker 3.0.
// Pure functions — unit-test like src/utils/__tests__/calculations.test.ts.
//
// Model changes (src/models/types.ts):
//   Generator: tankCapacity?: number        // litres; feature hidden when undefined
//   Refill:    isFull?: boolean             // "Заправлено до повного" — resets estimate error
//
// Level is reconstructed from history; nothing new is persisted besides the two fields.

import type { Generator, Refill, WorkSession } from '../src/models/types';

export interface FuelEstimate {
  level: number;        // litres now, clamped to [0, tankCapacity]
  free: number;         // tankCapacity - level
  hoursLeft: number;    // level / lph
  lph: number;          // average L/h used for the estimate
  known: boolean;       // false until the first full refill (show "—" instead of ≈)
}

type Ev = { t: string; kind: 'refill'; amount: number; full: boolean } | { t: string; kind: 'run'; hours: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const key = (date: string, time = '00:00') => `${date}T${time}`;

/** Average consumption. Prefer the existing stats value; fall back to a sane default. */
export function averageLph(sessions: WorkSession[], refills: Refill[], fallback = 0.5): number {
  const hours = sessions.reduce((s, x) => s + (x.hours || 0), 0);
  const litres = refills.reduce((s, x) => s + x.amount, 0);
  return hours > 1 && litres > 0 ? litres / hours : fallback;
}

/**
 * Replays refills and completed sessions in time order.
 * - full refill → level = tank (calibrates away accumulated error)
 * - partial refill bigger than free space → also treated as full (the estimate was too low)
 * - session → level -= hours × lph
 * Active session: pass `activeHours` (elapsed) — consumption is applied live.
 */
export function estimateFuel(
  gen: Pick<Generator, 'tankCapacity'>, sessions: WorkSession[], refills: Refill[], activeHours = 0,
): FuelEstimate | null {
  const tank = gen.tankCapacity;
  if (!tank) return null;
  const lph = averageLph(sessions, refills);
  const evs: Ev[] = [
    ...refills.map(r => ({ t: key(r.date, r.createdAt.slice(11, 16)), kind: 'refill' as const, amount: r.amount, full: !!r.isFull })),
    ...sessions.filter(s => !s.isActive).map(s => ({ t: key(s.date, s.endTime ?? s.startTime), kind: 'run' as const, hours: s.hours })),
  ].sort((a, b) => a.t.localeCompare(b.t));

  let level: number | null = null;
  for (const e of evs) {
    if (e.kind === 'refill') {
      const cur = level ?? 0;
      level = e.full || cur + e.amount > tank ? tank : cur + e.amount;
    } else if (level !== null) {
      level = clamp(level - e.hours * lph, 0, tank);
    }
  }
  const known = level !== null;
  const now = clamp((level ?? 0) - activeHours * lph, 0, tank);
  return { level: now, free: tank - now, hoursLeft: lph > 0 ? now / lph : 0, lph, known };
}

/** What the refill sheet shows before saving. */
export function previewRefill(est: FuelEstimate, tank: number, amount: number, markedFull: boolean) {
  const diff = amount - est.free;
  const over = !markedFull && diff > 0.05;           // more than fits → will be recorded as full
  const calibrate = markedFull && Math.abs(diff) > 0.05; // full + amount ≠ free → estimate correction
  const after = markedFull || over ? tank : Math.min(tank, est.level + amount);
  return { after, over, calibrate, correction: diff, tankFull: est.free < 0.05 };
}

export interface Preset { label: string; litres: number; enabled: boolean }

/** Presets depend on the generator: free space, last refill, 1 L (small tanks) / 20 L (big tanks). */
export function refillPresets(est: FuelEstimate, tank: number, lastRefill?: number): Preset[] {
  const fits = (v: number) => v <= est.free + 0.05;
  const round = (v: number) => Math.round(v * 10) / 10;
  const list: Preset[] = [{ label: 'toFull', litres: round(est.free), enabled: true }];
  if (lastRefill) list.push({ label: 'asLastTime', litres: lastRefill, enabled: fits(lastRefill) });
  const step = tank <= 10 ? 1 : 20;
  list.push({ label: 'fixed', litres: step, enabled: fits(step) });
  return list;
}

/** Default value when the sheet opens: to-full (small tank) or last refill if it fits. */
export function defaultRefill(est: FuelEstimate, tank: number, lastRefill?: number) {
  const round = (v: number) => Math.round(v * 10) / 10;
  if (tank > 10 && lastRefill && lastRefill <= est.free + 0.05) return { litres: lastRefill, full: false };
  return { litres: Math.max(0.1, round(est.free)), full: true };
}
