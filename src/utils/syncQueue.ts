import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueueItem } from '../models/types';
import { generateId } from './calculations';

const SYNC_QUEUE_KEY = '@sync_queue';

/**
 * Sync Queue Manager
 * Manages a queue of pending sync operations for offline support
 */
class SyncQueue {
  /**
   * Get all items in the sync queue
   */
  async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!queueJson) {
        return [];
      }
      return JSON.parse(queueJson);
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  /**
   * Add an item to the sync queue
   */
  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getQueue();

      const newItem: SyncQueueItem = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        ...item,
      };

      queue.push(newItem);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Remove an item from the sync queue by ID
   */
  async removeFromQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Error removing from sync queue:', error);
      throw error;
    }
  }

  /**
   * Update an item in the sync queue (for retry count, etc.)
   */
  async updateQueueItem(itemId: string, updates: Partial<SyncQueueItem>): Promise<void> {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Error updating sync queue item:', error);
      throw error;
    }
  }

  /**
   * Clear the entire sync queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      throw error;
    }
  }

  /**
   * Get count of pending items in queue
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
