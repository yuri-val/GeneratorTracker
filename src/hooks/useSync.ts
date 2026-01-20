import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getSyncStatus,
  performManualSync,
  performInitialSync,
  processSyncQueue,
  startRealtimeListeners,
  stopRealtimeListeners,
} from '../services/sync';
import { syncQueue } from '../utils/syncQueue';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface UseSyncReturn {
  syncStatus: SyncStatus;
  pendingCount: number;
  performManualSync: () => Promise<void>;
  performInitialSync: () => Promise<void>;
}

/**
 * Hook to manage sync status and operations
 */
export const useSync = (): UseSyncReturn => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update pending count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();

    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Start listeners when user is authenticated
  useEffect(() => {
    if (user) {
      startRealtimeListeners(user.uid);
    } else {
      stopRealtimeListeners();
    }

    return () => {
      stopRealtimeListeners();
    };
  }, [user]);

  const handleManualSync = async () => {
    if (!user) {
      throw new Error('User must be authenticated to sync');
    }

    await performManualSync(user.uid);
  };

  const handleInitialSync = async () => {
    if (!user) {
      throw new Error('User must be authenticated to sync');
    }

    await performInitialSync(user.uid);
  };

  return {
    syncStatus,
    pendingCount,
    performManualSync: handleManualSync,
    performInitialSync: handleInitialSync,
  };
};
