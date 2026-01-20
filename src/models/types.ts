// Base sync metadata for all synced entities
export interface SyncMetadata {
  lastModified: string; // ISO 8601 datetime for conflict resolution
  syncStatus: 'synced' | 'pending' | 'error';
  syncedAt?: string; // Last successful sync timestamp
  userId?: string; // Firebase UID of the owner
}

export interface Generator extends SyncMetadata {
  id: string;
  name: string;
  model?: string;
  purchaseDate: string; // ISO 8601 date
  createdAt: string; // ISO 8601 datetime
  lastModified: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncedAt?: string;
  userId?: string;
}

export interface WorkSession extends SyncMetadata {
  id: string;
  generatorId: string;
  date: string; // ISO 8601 date
  startTime: string; // ISO 8601 time (HH:mm)
  endTime?: string; // ISO 8601 time (HH:mm) - optional for active sessions
  hours: number; // Calculated duration in hours (0 for active sessions)
  notes?: string;
  createdAt: string; // ISO 8601 datetime
  isActive?: boolean; // True if session is currently running
  lastModified: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncedAt?: string;
  userId?: string;
}

export interface Refill extends SyncMetadata {
  id: string;
  generatorId: string;
  date: string; // ISO 8601 date
  amount: number; // Liters or gallons
  notes?: string;
  createdAt: string; // ISO 8601 datetime
  lastModified: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncedAt?: string;
  userId?: string;
}

export interface GeneratorStats {
  totalHours: number;
  totalRefills: number;
  averageFuelPerHour: number;
  lastWorkSessionDate?: string;
  lastRefillDate?: string;
}

// Auth user type
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Sync queue item for offline changes
export interface SyncQueueItem {
  id: string;
  entityType: 'generator' | 'workSession' | 'refill';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
}
