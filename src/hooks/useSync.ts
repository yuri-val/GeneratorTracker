import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getSyncStatus,
  performManualSync,
  performInitialSync,
  startRealtimeListeners,
  stopRealtimeListeners,
  SyncStatus,
} from '../services/sync';
import { getPendingChangesCount } from '../utils/storage';
import { getCurrentUser } from '../services/auth';

interface UseSyncReturn {
  syncStatus: SyncStatus;
  pendingCount: number;
  performManualSync: (uid?: string) => Promise<void>;
  performInitialSync: (uid?: string) => Promise<void>;
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
      try {
        setPendingCount(await getPendingChangesCount());
      } catch (error) {
        console.error('Error counting pending changes:', error);
      }
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

  /**
   * Right after a sign-in the React auth state has not caught up yet (the auth listener
   * fires later), so callers pass the new uid; otherwise fall back to the context user
   * and finally to Firebase's own current user.
   */
  const resolveUid = (uid?: string): string => {
    const resolved = uid ?? user?.uid ?? getCurrentUser()?.uid;
    if (!resolved) {
      throw new Error('User must be authenticated to sync');
    }
    return resolved;
  };

  const handleManualSync = async (uid?: string) => {
    await performManualSync(resolveUid(uid));
  };

  const handleInitialSync = async (uid?: string) => {
    await performInitialSync(resolveUid(uid));
  };

  return {
    syncStatus,
    pendingCount,
    performManualSync: handleManualSync,
    performInitialSync: handleInitialSync,
  };
};
