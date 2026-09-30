import { createMutex } from '../mutex';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(r => (resolve = r));
  return { promise, resolve };
};

describe('createMutex', () => {
  it('runs critical sections one at a time, in call order', async () => {
    const mutex = createMutex();
    const events: string[] = [];
    const gate = deferred();

    const first = mutex.run(async () => {
      events.push('first:start');
      await gate.promise;
      events.push('first:end');
    });
    const second = mutex.run(async () => {
      events.push('second');
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    gate.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second']);
  });

  it('returns the section result and keeps going after a failure', async () => {
    const mutex = createMutex();
    const failing = mutex.run(async () => {
      throw new Error('boom');
    });
    const next = mutex.run(async () => 42);

    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe(42);
  });
});
