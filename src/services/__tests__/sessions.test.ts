import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkSessions, getRefills, saveWorkSession } from '../../utils/storage';
import { startSession, stopSession, undoStop, stopForRefill, recordRefill, sessionElapsedMs } from '../sessions';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});

describe('sessions service', () => {
  it('start creates one running, pending session; a second start returns it', async () => {
    const a = await startSession('g1');
    const b = await startSession('g1');
    expect(b.id).toBe(a.id);
    const stored = await getWorkSessions('g1');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ isActive: true, hours: 0, syncStatus: 'pending' });
  });

  it('stop computes the real elapsed hours, undo restores the original start', async () => {
    const start = new Date(Date.now() - 2.5 * 3_600_000);
    const pad = (x: number) => String(x).padStart(2, '0');
    const running = {
      id: 's1', generatorId: 'g1', hours: 0, isActive: true, createdAt: start.toISOString(),
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      lastModified: start.toISOString(), syncStatus: 'pending' as const,
    };
    await saveWorkSession(running);
    const { stopped } = await stopSession(running);
    expect(stopped.isActive).toBe(false);
    expect(stopped.hours).toBeGreaterThanOrEqual(2.4);
    expect(stopped.hours).toBeLessThanOrEqual(2.6);

    expect(await undoStop(running)).toBe(true);
    const [restored] = await getWorkSessions('g1');
    expect(restored).toMatchObject({ isActive: true, hours: 0, startTime: running.startTime, date: running.date });
    expect(restored.endTime).toBeUndefined();
  });

  it('undo is skipped when another session started meanwhile or the record is gone', async () => {
    const first = await startSession('g1');
    await stopSession(first);
    await startSession('g1');
    expect(await undoStop(first)).toBe(false);
    expect(await undoStop({ ...first, id: 'missing' })).toBe(false);
  });

  it('stop and refill: session ends, refill gets the stop date/time and the full flag', async () => {
    const running = await startSession('g1');
    const { date, time } = await stopForRefill(running);
    const refill = await recordRefill({ generatorId: 'g1', amount: 1.2, date, time, isFull: true });
    expect((await getWorkSessions('g1'))[0].isActive).toBe(false);
    expect((await getRefills('g1'))[0]).toMatchObject({ id: refill.id, amount: 1.2, isFull: true, time, date, syncStatus: 'pending' });
  });

  it('a partial refill does not store isFull', async () => {
    await recordRefill({ generatorId: 'g1', amount: 1, date: '2026-10-01', isFull: false });
    expect((await getRefills('g1'))[0].isFull).toBeUndefined();
  });

  it('elapsed time of a running session', () => {
    const now = new Date(2026, 9, 1, 12, 30).getTime();
    expect(sessionElapsedMs({ date: '2026-10-01', startTime: '10:00' }, now)).toBe(2.5 * 3_600_000);
  });
});
