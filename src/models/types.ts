export interface Generator {
  id: string;
  name: string;
  model?: string;
  purchaseDate: string; // ISO 8601 date
  createdAt: string; // ISO 8601 datetime
}

export interface WorkSession {
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

export interface Refill {
  id: string;
  generatorId: string;
  date: string; // ISO 8601 date
  amount: number; // Liters or gallons
  notes?: string;
  createdAt: string; // ISO 8601 datetime
}

export interface GeneratorStats {
  totalHours: number;
  totalRefills: number;
  averageFuelPerHour: number;
  lastWorkSessionDate?: string;
  lastRefillDate?: string;
}
