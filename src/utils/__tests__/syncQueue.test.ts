import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from '../syncQueue';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('syncQueue', () => {
  it('is empty by default', async () => {
    expect(await syncQueue.getQueue()).toEqual([]);
    expect(await syncQueue.getPendingCount()).toBe(0);
  });

  it('appends items in order with generated metadata', async () => {
    await syncQueue.addToQueue({ entityType: 'generator', entityId: 'g1', operation: 'create', data: { id: 'g1' } });
    await syncQueue.addToQueue({ entityType: 'refill', entityId: 'r1', operation: 'delete', data: { id: 'r1' } });

    const queue = await syncQueue.getQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ entityType: 'generator', entityId: 'g1', operation: 'create', retryCount: 0 });
    expect(queue[1].entityType).toBe('refill');
    expect(queue[0].id).not.toBe(queue[1].id);
    expect(new Date(queue[0].timestamp).getTime()).not.toBeNaN();
  });

  it('survives a "restart" because it is persisted, not kept in memory', async () => {
    await syncQueue.addToQueue({ entityType: 'generator', entityId: 'g1', operation: 'create', data: {} });

    const raw = await AsyncStorage.getItem('@sync_queue');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });

  it('removes and updates items by id', async () => {
    await syncQueue.addToQueue({ entityType: 'generator', entityId: 'g1', operation: 'create', data: {} });
    await syncQueue.addToQueue({ entityType: 'generator', entityId: 'g2', operation: 'create', data: {} });
    const [first, second] = await syncQueue.getQueue();

    await syncQueue.updateQueueItem(first.id, { retryCount: 2 });
    await syncQueue.removeFromQueue(second.id);

    const queue = await syncQueue.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ id: first.id, retryCount: 2 });
  });

  it('clears everything', async () => {
    await syncQueue.addToQueue({ entityType: 'generator', entityId: 'g1', operation: 'create', data: {} });
    await syncQueue.clearQueue();
    expect(await syncQueue.getPendingCount()).toBe(0);
  });
});
