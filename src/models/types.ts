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
}

export interface Refill extends SyncMetadata {
  id: string;
  generatorId: string;
  date: string; // ISO 8601 date
  amount: number; // Liters or gallons
  notes?: string;
  createdAt: string; // ISO 8601 datetime
}

export interface MaintenanceTask extends SyncMetadata {
  id: string;
  generatorId: string;
  title: string;
  intervalHours?: number; // engine-hours interval between services
  intervalDays?: number; // calendar-days interval between services
  lastServiceHours: number; // engine hours recorded at the last service
  lastServiceDate: string; // ISO 8601 date (YYYY-MM-DD) of the last service
  notes?: string;
  createdAt: string; // ISO 8601 datetime
}

export type MaintenanceStatusLevel = 'ok' | 'soon' | 'due';

export interface MaintenanceStatus {
  level: MaintenanceStatusLevel;
  hoursRemaining?: number; // engine hours until due (negative = overdue)
  daysRemaining?: number; // whole days until due (negative = overdue)
  dueHours?: number; // absolute engine-hour mark when due
  dueDate?: string; // ISO 8601 date when due
}

export interface MaintenanceSummary {
  level: MaintenanceStatusLevel;
  dueCount: number;
  soonCount: number;
  total: number;
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
  entityType: 'generator' | 'workSession' | 'refill' | 'maintenance';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
}
