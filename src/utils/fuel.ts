// Fuel level estimate and refill calibration (since 3.0).
//
// Nothing new is persisted besides Generator.tankCapacity and Refill.isFull/time: the level is
// replayed from history. Ported from the 3.0 design handoff with three fixes:
//  - event times are local (the handoff took the refill time from the UTC part of createdAt);
//  - a session ends at start + hours, so overnight sessions sort after a late-evening refill;
//  - the level is unknown until the first full refill (the handoff counted any partial refill
//    from an empty tank, which under-reports the level).
import type { Generator, Refill, WorkSession } from '../models/types';

export interface FuelEstimate {
  /** Litres now, clamped to [0, tank]. 0 while unknown. */
  level: number;
  /** Free space in litres. Equals the tank while unknown. */
  free: number;
  /** Hours the current level lasts at the average consumption. */
  hoursLeft: number;
  /** Average consumption used for the estimate, L/h. */
  lph: number;
  /** False until the first full refill: the UI shows "—" instead of "≈". */
  known: boolean;
}

/** Consumption used when the history is too short to compute one. */
export const DEFAULT_LPH = 0.5;
const EPSILON = 0.05;

type FuelEvent = { at: number; kind: 'refill'; amount: number; full: boolean } | { at: number; kind: 'run'; hours: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const roundLitres = (v: number) => Math.round(v * 10) / 10;

const localTimeOf = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

/** Local timestamp of a refill: its own time, else the creation time on the same day, else midday. */
export const refillTimestamp = (refill: Pick<Refill, 'date' | 'time' | 'createdAt'>): number => {
  let time = refill.time;
  if (!time) {
    const created = localTimeOf(refill.createdAt);
    time = created.date === refill.date ? created.time : '12:00';
  }
  return new Date(`${refill.date}T${time}`).getTime();
};

/** Local timestamp when a completed session ended (start + duration, so overnight sessions work). */
export const sessionEndTimestamp = (session: Pick<WorkSession, 'date' | 'startTime' | 'hours'>): number =>
  new Date(`${session.date}T${session.startTime}`).getTime() + session.hours * 3_600_000;

/** Average consumption from the history, or the fallback while there is too little of it. */
export function averageLph(sessions: WorkSession[], refills: Refill[], fallback = DEFAULT_LPH): number {
  const hours = sessions.reduce((sum, s) => sum + (s.isActive ? 0 : s.hours || 0), 0);
  const litres = refills.reduce((sum, r) => sum + r.amount, 0);
  return hours > 1 && litres > 0 ? litres / hours : fallback;
}

/**
 * Replays refills and completed sessions in time order:
 * - a full refill sets the level to the tank (calibrates away accumulated error);
 * - a partial refill bigger than the free space also means "full" (the estimate was too low);
 * - a session subtracts hours × lph.
 * `activeHours` (elapsed time of a running session) is subtracted live.
 * Returns null when the generator has no tank capacity — the fuel UI is hidden then.
 */
export function estimateFuel(
  generator: Pick<Generator, 'tankCapacity'>,
  sessions: WorkSession[],
  refills: Refill[],
  activeHours = 0,
): FuelEstimate | null {
  const tank = generator.tankCapacity;
  if (!tank || tank <= 0) return null;
  const lph = averageLph(sessions, refills);
  const events: FuelEvent[] = [
    ...refills.map(r => ({ at: refillTimestamp(r), kind: 'refill' as const, amount: r.amount, full: !!r.isFull })),
    ...sessions.filter(s => !s.isActive).map(s => ({ at: sessionEndTimestamp(s), kind: 'run' as const, hours: s.hours })),
  ].sort((a, b) => a.at - b.at || (a.kind === 'refill' ? -1 : 1));

  let level: number | null = null;
  for (const e of events) {
    if (e.kind === 'refill') {
      if (e.full) level = tank;
      else if (level !== null) level = level + e.amount > tank + EPSILON ? tank : Math.min(tank, level + e.amount);
    } else if (level !== null) {
      level = clamp(level - e.hours * lph, 0, tank);
    }
  }
  if (level === null) return { level: 0, free: tank, hoursLeft: 0, lph, known: false };
  const now = clamp(level - activeHours * lph, 0, tank);
  return { level: now, free: tank - now, hoursLeft: lph > 0 ? now / lph : 0, lph, known: true };
}

export interface RefillPreview {
  /** Level after the refill, or null while the level is unknown and the refill is not "full". */
  after: number | null;
  /** Not marked full but more than fits: it will be recorded as a full tank. */
  over: boolean;
  /** Marked full and the amount differs from the free space: the estimate gets corrected. */
  calibrate: boolean;
  /** amount − free (positive: the estimate was too high). */
  correction: number;
  /** The tank is already full: there is nothing to save. */
  tankFull: boolean;
}

/** What the refill sheet shows before saving. */
export function previewRefill(est: FuelEstimate, tank: number, amount: number, markedFull: boolean): RefillPreview {
  if (!est.known) {
    return { after: markedFull ? tank : null, over: false, calibrate: false, correction: 0, tankFull: false };
  }
  const diff = amount - est.free;
  const over = !markedFull && diff > EPSILON;
  const calibrate = markedFull && Math.abs(diff) > EPSILON;
  const after = markedFull || over ? tank : Math.min(tank, est.level + amount);
  return { after, over, calibrate, correction: diff, tankFull: est.free < EPSILON };
}

export interface RefillPreset {
  key: 'toFull' | 'asLastTime' | 'fixed';
  /** Litres to set; undefined for "to full" while the level is unknown (it only ticks "full"). */
  litres?: number;
  enabled: boolean;
}

/** Presets: to full, same as last time, 1 L (tanks ≤ 10 L) or 20 L (bigger tanks). */
export function refillPresets(est: FuelEstimate, tank: number, lastRefill?: number): RefillPreset[] {
  const fits = (v: number) => !est.known || v <= est.free + EPSILON;
  const list: RefillPreset[] = [
    { key: 'toFull', litres: est.known ? roundLitres(est.free) : undefined, enabled: !est.known || est.free >= EPSILON },
  ];
  if (lastRefill) list.push({ key: 'asLastTime', litres: lastRefill, enabled: fits(lastRefill) });
  const fixed = fixedPresetLitres(tank);
  list.push({ key: 'fixed', litres: fixed, enabled: fits(fixed) });
  return list;
}

export const fixedPresetLitres = (tank: number) => (tank <= 10 ? 1 : 20);
/** Stepper step: 0.1 L for small tanks, 1 L for bigger ones. */
export const stepperStep = (tank?: number) => (tank && tank > 10 ? 1 : 0.1);

/** Value when the sheet opens: to full (small tanks), or the last refill if it fits (big tanks). */
export function defaultRefill(est: FuelEstimate | null, tank?: number, lastRefill?: number): { litres: number; full: boolean } {
  if (!est || !tank) return { litres: lastRefill ?? 0, full: false };
  if (!est.known) return { litres: lastRefill ?? tank, full: true };
  if (tank > 10 && lastRefill && lastRefill <= est.free + EPSILON) return { litres: lastRefill, full: false };
  return { litres: Math.max(0.1, roundLitres(est.free)), full: true };
}
