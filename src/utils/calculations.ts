import { WorkSession, Refill, GeneratorStats } from '../models/types';

export const calculateHours = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight sessions
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
};

export const calculateGeneratorStats = (
  workSessions: WorkSession[],
  refills: Refill[]
): GeneratorStats => {
  const totalHours = workSessions.reduce((sum, session) => sum + session.hours, 0);
  const totalRefills = refills.length;
  const totalFuel = refills.reduce((sum, refill) => sum + refill.amount, 0);

  const averageFuelPerHour = totalHours > 0 ? totalFuel / totalHours : 0;

  const sortedSessions = [...workSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastWorkSessionDate = sortedSessions[0]?.date;

  const sortedRefills = [...refills].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastRefillDate = sortedRefills[0]?.date;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalRefills,
    averageFuelPerHour: Math.round(averageFuelPerHour * 100) / 100,
    lastWorkSessionDate,
    lastRefillDate,
  };
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timeString: string): string => {
  const [hour, minute] = timeString.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getCurrentDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const calculateActiveSessionHours = (startTime: string, startDate: string): number => {
  const sessionStart = new Date(`${startDate}T${startTime}`);
  const now = new Date();
  const diffMs = now.getTime() - sessionStart.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
};
