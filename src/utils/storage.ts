import AsyncStorage from '@react-native-async-storage/async-storage';
import { Generator, WorkSession, Refill, MaintenanceTask } from '../models/types';
import { syncQueue } from './syncQueue';
import { getCurrentUser } from '../services/auth';

const GENERATORS_KEY = '@generators';
const WORK_SESSIONS_KEY = '@work_sessions';
const REFILLS_KEY = '@refills';
const MAINTENANCE_KEY = '@maintenance_tasks';
const LANGUAGE_KEY = '@app_language';

// Language storage
export const getSavedLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error getting language:', error);
    return null;
  }
};

export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Generator CRUD
export const getGenerators = async (): Promise<Generator[]> => {
  try {
    const data = await AsyncStorage.getItem(GENERATORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting generators:', error);
    return [];
  }
};

export const saveGenerator = async (generator: Generator): Promise<void> => {
  try {
    const generators = await getGenerators();
    const index = generators.findIndex(g => g.id === generator.id);
    const isUpdate = index >= 0;

    // Add sync metadata - preserve existing values or set defaults
    const generatorWithMeta: Generator = {
      ...generator,
      lastModified: generator.lastModified || new Date().toISOString(),
      syncStatus: generator.syncStatus || 'pending',
    };

    if (isUpdate) {
      generators[index] = generatorWithMeta;
    } else {
      generators.push(generatorWithMeta);
    }

    await AsyncStorage.setItem(GENERATORS_KEY, JSON.stringify(generators));

    // Queue for sync only if status is pending and user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && generatorWithMeta.syncStatus === 'pending') {
      await syncQueue.addToQueue({
        entityType: 'generator',
        entityId: generator.id,
        operation: isUpdate ? 'update' : 'create',
        data: generatorWithMeta,
      });
    }
  } catch (error) {
    console.error('Error saving generator:', error);
    throw error;
  }
};

export const deleteGenerator = async (id: string): Promise<void> => {
  try {
    const generators = await getGenerators();
    const generator = generators.find(g => g.id === id);
    const filtered = generators.filter(g => g.id !== id);
    await AsyncStorage.setItem(GENERATORS_KEY, JSON.stringify(filtered));

    // Also delete associated work sessions and refills
    const workSessions = await getWorkSessions();
    const filteredSessions = workSessions.filter(ws => ws.generatorId !== id);
    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(filteredSessions));

    const refills = await getRefills();
    const filteredRefills = refills.filter(r => r.generatorId !== id);
    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(filteredRefills));

    const maintenanceTasks = await getMaintenanceTasks();
    const filteredTasks = maintenanceTasks.filter(m => m.generatorId !== id);
    await AsyncStorage.setItem(MAINTENANCE_KEY, JSON.stringify(filteredTasks));

    // Queue for sync if user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && generator) {
      await syncQueue.addToQueue({
        entityType: 'generator',
        entityId: id,
        operation: 'delete',
        data: generator,
      });
    }
  } catch (error) {
    console.error('Error deleting generator:', error);
    throw error;
  }
};

// Work Session CRUD
export const getWorkSessions = async (generatorId?: string): Promise<WorkSession[]> => {
  try {
    const data = await AsyncStorage.getItem(WORK_SESSIONS_KEY);
    const sessions: WorkSession[] = data ? JSON.parse(data) : [];

    if (generatorId) {
      return sessions.filter(s => s.generatorId === generatorId);
    }

    return sessions;
  } catch (error) {
    console.error('Error getting work sessions:', error);
    return [];
  }
};

export const saveWorkSession = async (session: WorkSession): Promise<void> => {
  try {
    const sessions = await getWorkSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    const isUpdate = index >= 0;

    // Add sync metadata - preserve existing values or set defaults
    const sessionWithMeta: WorkSession = {
      ...session,
      lastModified: session.lastModified || new Date().toISOString(),
      syncStatus: session.syncStatus || 'pending',
    };

    if (isUpdate) {
      sessions[index] = sessionWithMeta;
    } else {
      sessions.push(sessionWithMeta);
    }

    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(sessions));

    // Queue for sync only if status is pending and user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && sessionWithMeta.syncStatus === 'pending') {
      await syncQueue.addToQueue({
        entityType: 'workSession',
        entityId: session.id,
        operation: isUpdate ? 'update' : 'create',
        data: sessionWithMeta,
      });
    }
  } catch (error) {
    console.error('Error saving work session:', error);
    throw error;
  }
};

export const deleteWorkSession = async (id: string): Promise<void> => {
  try {
    const sessions = await getWorkSessions();
    const session = sessions.find(s => s.id === id);
    const filtered = sessions.filter(s => s.id !== id);
    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(filtered));

    // Queue for sync if user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && session) {
      await syncQueue.addToQueue({
        entityType: 'workSession',
        entityId: id,
        operation: 'delete',
        data: session,
      });
    }
  } catch (error) {
    console.error('Error deleting work session:', error);
    throw error;
  }
};

export const getActiveWorkSession = async (generatorId: string): Promise<WorkSession | null> => {
  try {
    const sessions = await getWorkSessions(generatorId);
    return sessions.find(s => s.isActive) || null;
  } catch (error) {
    console.error('Error getting active work session:', error);
    return null;
  }
};

// Refill CRUD
export const getRefills = async (generatorId?: string): Promise<Refill[]> => {
  try {
    const data = await AsyncStorage.getItem(REFILLS_KEY);
    const refills: Refill[] = data ? JSON.parse(data) : [];

    if (generatorId) {
      return refills.filter(r => r.generatorId === generatorId);
    }

    return refills;
  } catch (error) {
    console.error('Error getting refills:', error);
    return [];
  }
};

export const saveRefill = async (refill: Refill): Promise<void> => {
  try {
    const refills = await getRefills();
    const index = refills.findIndex(r => r.id === refill.id);
    const isUpdate = index >= 0;

    // Add sync metadata - preserve existing values or set defaults
    const refillWithMeta: Refill = {
      ...refill,
      lastModified: refill.lastModified || new Date().toISOString(),
      syncStatus: refill.syncStatus || 'pending',
    };

    if (isUpdate) {
      refills[index] = refillWithMeta;
    } else {
      refills.push(refillWithMeta);
    }

    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(refills));

    // Queue for sync only if status is pending and user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && refillWithMeta.syncStatus === 'pending') {
      await syncQueue.addToQueue({
        entityType: 'refill',
        entityId: refill.id,
        operation: isUpdate ? 'update' : 'create',
        data: refillWithMeta,
      });
    }
  } catch (error) {
    console.error('Error saving refill:', error);
    throw error;
  }
};

export const deleteRefill = async (id: string): Promise<void> => {
  try {
    const refills = await getRefills();
    const refill = refills.find(r => r.id === id);
    const filtered = refills.filter(r => r.id !== id);
    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(filtered));

    // Queue for sync if user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && refill) {
      await syncQueue.addToQueue({
        entityType: 'refill',
        entityId: id,
        operation: 'delete',
        data: refill,
      });
    }
  } catch (error) {
    console.error('Error deleting refill:', error);
    throw error;
  }
};

// Maintenance Task CRUD
export const getMaintenanceTasks = async (generatorId?: string): Promise<MaintenanceTask[]> => {
  try {
    const data = await AsyncStorage.getItem(MAINTENANCE_KEY);
    const tasks: MaintenanceTask[] = data ? JSON.parse(data) : [];

    if (generatorId) {
      return tasks.filter(t => t.generatorId === generatorId);
    }

    return tasks;
  } catch (error) {
    console.error('Error getting maintenance tasks:', error);
    return [];
  }
};

export const saveMaintenanceTask = async (task: MaintenanceTask): Promise<void> => {
  try {
    const tasks = await getMaintenanceTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    const isUpdate = index >= 0;

    // Add sync metadata - preserve existing values or set defaults
    const taskWithMeta: MaintenanceTask = {
      ...task,
      lastModified: task.lastModified || new Date().toISOString(),
      syncStatus: task.syncStatus || 'pending',
    };

    if (isUpdate) {
      tasks[index] = taskWithMeta;
    } else {
      tasks.push(taskWithMeta);
    }

    await AsyncStorage.setItem(MAINTENANCE_KEY, JSON.stringify(tasks));

    // Queue for sync only if status is pending and user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && taskWithMeta.syncStatus === 'pending') {
      await syncQueue.addToQueue({
        entityType: 'maintenance',
        entityId: task.id,
        operation: isUpdate ? 'update' : 'create',
        data: taskWithMeta,
      });
    }
  } catch (error) {
    console.error('Error saving maintenance task:', error);
    throw error;
  }
};

export const deleteMaintenanceTask = async (id: string): Promise<void> => {
  try {
    const tasks = await getMaintenanceTasks();
    const task = tasks.find(t => t.id === id);
    const filtered = tasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(MAINTENANCE_KEY, JSON.stringify(filtered));

    // Queue for sync if user is authenticated
    const currentUser = getCurrentUser();
    if (currentUser && task) {
      await syncQueue.addToQueue({
        entityType: 'maintenance',
        entityId: id,
        operation: 'delete',
        data: task,
      });
    }
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    throw error;
  }
};
