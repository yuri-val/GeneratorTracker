import type { Refill, WorkSession } from '../../models/types';
import {
  estimateFuel,
  previewRefill,
  refillPresets,
  defaultRefill,
  refillTimestamp,
  sessionEndTimestamp,
  averageLph,
  stepperStep,
} from '../fuel';

const META = { lastModified: '2026-10-01T00:00:00.000Z', syncStatus: 'synced' as const };
let n = 0;
const refill = (date: string, amount: number, extra: Partial<Refill> = {}): Refill => ({
  id: `r${n++}`, generatorId: 'g', date, amount, createdAt: `${date}T12:00:00.000Z`, ...META, ...extra,
});
const session = (date: string, startTime: string, hours: number, extra: Partial<WorkSession> = {}): WorkSession => ({
  id: `s${n++}`, generatorId: 'g', date, startTime, hours, createdAt: `${date}T00:00:00.000Z`, ...META, ...extra,
});
const TANK = { tankCapacity: 3.6 };

describe('estimateFuel', () => {
  it('returns null without a tank capacity (the fuel UI is hidden)', () => {
    expect(estimateFuel({}, [], [])).toBeNull();
    expect(estimateFuel({ tankCapacity: 0 }, [], [])).toBeNull();
  });

  it('is unknown until the first full refill, even after partial refills', () => {
    const est = estimateFuel(TANK, [], [refill('2026-10-01', 1.5, { time: '10:00' })])!;
    expect(est.known).toBe(false);
    expect(est.free).toBe(3.6);
  });

  it('a full refill sets the level to the tank, sessions consume at the average rate', () => {
    // 1 h + 1 h of running and 2 L refilled → 1 L/h average
    const refills = [refill('2026-10-01', 2, { time: '08:00', isFull: true })];
    const sessions = [session('2026-10-01', '09:00', 1), session('2026-10-01', '12:00', 1)];
    const est = estimateFuel(TANK, sessions, refills)!;
    expect(est.known).toBe(true);
    expect(est.lph).toBeCloseTo(1);
    expect(est.level).toBeCloseTo(1.6);
    expect(est.free).toBeCloseTo(2);
    expect(est.hoursLeft).toBeCloseTo(1.6);
  });

  it('a partial refill bigger than the free space counts as full (calibration)', () => {
    const refills = [refill('2026-10-01', 3.6, { time: '08:00', isFull: true }), refill('2026-10-01', 3, { time: '20:00' })];
    const sessions = [session('2026-10-01', '09:00', 2)]; // lph = 6.6 / 2 = 3.3 → level 0 before the 2nd refill
    const est = estimateFuel(TANK, sessions, refills)!;
    expect(est.level).toBeCloseTo(3);
    const overfull = estimateFuel(TANK, sessions, [...refills, refill('2026-10-01', 2, { time: '21:00' })])!;
    expect(overfull.level).toBeCloseTo(3.6);
  });

  it('subtracts a running session live and clamps at empty', () => {
    const refills = [refill('2026-10-01', 3.6, { time: '08:00', isFull: true })];
    const sessions = [session('2026-10-01', '09:00', 2)]; // 1.8 L/h → 0 L left
    expect(estimateFuel(TANK, sessions, refills, 0)!.level).toBeCloseTo(0);
    const fresh = estimateFuel(TANK, [], refills, 1)!; // fallback 0.5 L/h
    expect(fresh.level).toBeCloseTo(3.1);
    expect(estimateFuel(TANK, [], refills, 100)!.level).toBe(0);
  });

  it('orders an overnight session after a late-evening refill', () => {
    // Full at 23:00, session 22:00 → 02:00 next day (4 h). It ends after the refill, so it consumes.
    const refills = [refill('2026-10-01', 3.6, { time: '23:00', isFull: true })];
    const sessions = [session('2026-10-01', '22:00', 4), session('2026-09-01', '10:00', 4)];
    const est = estimateFuel({ tankCapacity: 10 }, sessions, refills)!;
    expect(est.level).toBeLessThan(10);
  });

  it('places a refill created after midnight on its local date', () => {
    // createdAt 01:30 local (America/New_York in tests) is the previous day in no zone here, but in UTC
    // it is 05:30 — the time must be read locally.
    const created = new Date(2026, 9, 2, 1, 30).toISOString();
    const r = refill('2026-10-02', 1, { createdAt: created });
    expect(new Date(refillTimestamp(r)).getHours()).toBe(1);
    expect(new Date(refillTimestamp(r)).getDate()).toBe(2);
  });

  it('uses midday for an old refill back-dated to another day', () => {
    const r = refill('2026-09-20', 1, { createdAt: new Date(2026, 9, 2, 8, 0).toISOString() });
    expect(new Date(refillTimestamp(r)).getHours()).toBe(12);
  });
});

describe('helpers', () => {
  it('session end = start + duration', () => {
    const end = new Date(sessionEndTimestamp(session('2026-10-01', '22:00', 4)));
    expect(end.getDate()).toBe(2);
    expect(end.getHours()).toBe(2);
  });

  it('average consumption falls back while the history is short', () => {
    expect(averageLph([], [])).toBe(0.5);
    expect(averageLph([session('2026-10-01', '09:00', 4)], [refill('2026-10-01', 2)])).toBeCloseTo(0.5);
    expect(averageLph([session('2026-10-01', '09:00', 4, { isActive: true })], [refill('2026-10-01', 2)])).toBe(0.5);
  });

  it('stepper step depends on the tank', () => {
    expect(stepperStep(3.6)).toBe(0.1);
    expect(stepperStep(25)).toBe(1);
  });
});

describe('refill sheet', () => {
  const known = { level: 2.4, free: 1.2, hoursLeft: 4.7, lph: 0.51, known: true };
  const unknown = { level: 0, free: 3.6, hoursLeft: 0, lph: 0.5, known: false };

  it('preview: exact to-full, calibration, overflow, partial, full tank', () => {
    expect(previewRefill(known, 3.6, 1.2, true)).toMatchObject({ after: 3.6, calibrate: false, over: false });
    expect(previewRefill(known, 3.6, 1.5, true)).toMatchObject({ after: 3.6, calibrate: true });
    expect(previewRefill(known, 3.6, 1.5, true).correction).toBeCloseTo(0.3);
    expect(previewRefill(known, 3.6, 2, false)).toMatchObject({ after: 3.6, over: true });
    expect(previewRefill(known, 3.6, 0.5, false).after).toBeCloseTo(2.9);
    expect(previewRefill({ ...known, level: 3.6, free: 0 }, 3.6, 0.1, false).tankFull).toBe(true);
    expect(previewRefill(unknown, 3.6, 1, false).after).toBeNull();
    expect(previewRefill(unknown, 3.6, 1, true).after).toBe(3.6);
  });

  it('presets: to full, as last time (disabled when it does not fit), fixed 1 L / 20 L', () => {
    expect(refillPresets(known, 3.6, 3.2)).toEqual([
      { key: 'toFull', litres: 1.2, enabled: true },
      { key: 'asLastTime', litres: 3.2, enabled: false },
      { key: 'fixed', litres: 1, enabled: true },
    ]);
    expect(refillPresets({ ...known, free: 30 }, 72)[1]).toEqual({ key: 'fixed', litres: 20, enabled: true });
    expect(refillPresets(unknown, 3.6, 3.2)[0]).toEqual({ key: 'toFull', litres: undefined, enabled: true });
  });

  it('defaults: to full for small tanks, last refill for big tanks when it fits', () => {
    expect(defaultRefill(known, 3.6, 3.2)).toEqual({ litres: 1.2, full: true });
    expect(defaultRefill({ ...known, free: 40 }, 72, 20)).toEqual({ litres: 20, full: false });
    expect(defaultRefill({ ...known, free: 10 }, 72, 20)).toEqual({ litres: 10, full: true });
    expect(defaultRefill(unknown, 3.6, 3.2)).toEqual({ litres: 3.2, full: true });
    expect(defaultRefill(null, undefined, 2)).toEqual({ litres: 2, full: false });
  });
});
