/**
 * Helpers for the sync metadata carried by every entity (see SyncMetadata).
 */

/** Oldest possible timestamp: a record with an unreadable time loses every conflict. */
export const EPOCH_ISO = new Date(0).toISOString();

/**
 * Convert any timestamp shape the app has ever stored into an ISO 8601 string.
 *
 * Accepts ISO strings, Date, Firestore `Timestamp` instances (`toDate()`), and the
 * plain `{ seconds, nanoseconds }` objects that pre-2.4.2 realtime listeners wrote
 * into AsyncStorage. Anything unreadable becomes the epoch.
 */
export const toIsoTimestamp = (value: unknown): string => {
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? EPOCH_ISO : new Date(ms).toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? EPOCH_ISO : value.toISOString();
  }
  if (value && typeof value === 'object') {
    const candidate = value as { toDate?: () => Date; seconds?: unknown; nanoseconds?: unknown; _seconds?: unknown };
    if (typeof candidate.toDate === 'function') {
      return toIsoTimestamp(candidate.toDate());
    }
    const seconds = typeof candidate.seconds === 'number' ? candidate.seconds : candidate._seconds;
    if (typeof seconds === 'number') {
      const nanos = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
    }
  }
  return EPOCH_ISO;
};

/** Milliseconds since epoch for a normalized timestamp (0 when unreadable). */
export const timestampMillis = (value: unknown): number => Date.parse(toIsoTimestamp(value));

/** Negative when a is older than b, positive when newer, 0 when equal. */
export const compareTimestamps = (a: unknown, b: unknown): number => timestampMillis(a) - timestampMillis(b);

/**
 * A new modification time for a local edit: now, but always strictly later than the
 * previous one, so a device whose clock moved backwards still wins against its own
 * older version.
 */
export const nextModificationTime = (previous?: unknown, now: Date = new Date()): string => {
  const prev = previous === undefined ? 0 : timestampMillis(previous);
  return new Date(Math.max(now.getTime(), prev + 1)).toISOString();
};
