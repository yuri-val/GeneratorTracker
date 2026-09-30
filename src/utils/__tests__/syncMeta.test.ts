import { toIsoTimestamp, compareTimestamps, nextModificationTime, EPOCH_ISO } from '../syncMeta';

describe('toIsoTimestamp', () => {
  it('normalizes ISO strings', () => {
    expect(toIsoTimestamp('2026-09-30T10:00:00Z')).toBe('2026-09-30T10:00:00.000Z');
  });

  it('converts Dates, Timestamp-like objects and serialized {seconds, nanoseconds}', () => {
    const ms = Date.UTC(2026, 8, 30, 10, 0, 0, 250);
    expect(toIsoTimestamp(new Date(ms))).toBe('2026-09-30T10:00:00.250Z');
    expect(toIsoTimestamp({ toDate: () => new Date(ms) })).toBe('2026-09-30T10:00:00.250Z');
    expect(toIsoTimestamp({ seconds: ms / 1000 - 0.25, nanoseconds: 250_000_000 })).toBe('2026-09-30T10:00:00.250Z');
    expect(toIsoTimestamp({ _seconds: 0, _nanoseconds: 0 })).toBe(EPOCH_ISO);
  });

  it('turns anything unreadable into the epoch (loses every conflict)', () => {
    for (const bad of [undefined, null, '', 'yesterday', {}, NaN, new Date('invalid')]) {
      expect(toIsoTimestamp(bad)).toBe(EPOCH_ISO);
    }
  });
});

describe('compareTimestamps', () => {
  it('orders mixed representations', () => {
    expect(compareTimestamps('2026-01-02T00:00:00.000Z', { seconds: Date.UTC(2026, 0, 1) / 1000 })).toBeGreaterThan(0);
    expect(compareTimestamps(undefined, '2026-01-01T00:00:00.000Z')).toBeLessThan(0);
    expect(compareTimestamps('2026-01-01T00:00:00Z', '2026-01-01T00:00:00.000Z')).toBe(0);
  });
});

describe('nextModificationTime', () => {
  const now = new Date('2026-09-30T10:00:00.000Z');

  it('is now for a new record or an older previous version', () => {
    expect(nextModificationTime(undefined, now)).toBe(now.toISOString());
    expect(nextModificationTime('2026-01-01T00:00:00.000Z', now)).toBe(now.toISOString());
  });

  it('stays strictly after a previous version from the future', () => {
    expect(nextModificationTime('2026-09-30T12:00:00.000Z', now)).toBe('2026-09-30T12:00:00.001Z');
  });
});
