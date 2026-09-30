/**
 * Minimal FIFO async mutex.
 *
 * `run(fn)` joins the queue synchronously at call time, so the order in which
 * callers invoke `run` is exactly the order in which their critical sections
 * execute. A failing section does not block the ones queued after it.
 */
export interface Mutex {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export const createMutex = (): Mutex => {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      const result = tail.then(fn);
      tail = result.catch(() => undefined);
      return result;
    },
  };
};
