import AsyncStorage from '@react-native-async-storage/async-storage';
import { Generator, WorkSession, Refill } from '../models/types';

const GENERATORS_KEY = '@generators';
const WORK_SESSIONS_KEY = '@work_sessions';
const REFILLS_KEY = '@refills';

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

    if (index >= 0) {
      generators[index] = generator;
    } else {
      generators.push(generator);
    }

    await AsyncStorage.setItem(GENERATORS_KEY, JSON.stringify(generators));
  } catch (error) {
    console.error('Error saving generator:', error);
    throw error;
  }
};

export const deleteGenerator = async (id: string): Promise<void> => {
  try {
    const generators = await getGenerators();
    const filtered = generators.filter(g => g.id !== id);
    await AsyncStorage.setItem(GENERATORS_KEY, JSON.stringify(filtered));

    // Also delete associated work sessions and refills
    const workSessions = await getWorkSessions();
    const filteredSessions = workSessions.filter(ws => ws.generatorId !== id);
    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(filteredSessions));

    const refills = await getRefills();
    const filteredRefills = refills.filter(r => r.generatorId !== id);
    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(filteredRefills));
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

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving work session:', error);
    throw error;
  }
};

export const deleteWorkSession = async (id: string): Promise<void> => {
  try {
    const sessions = await getWorkSessions();
    const filtered = sessions.filter(s => s.id !== id);
    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(filtered));
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

    if (index >= 0) {
      refills[index] = refill;
    } else {
      refills.push(refill);
    }

    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(refills));
  } catch (error) {
    console.error('Error saving refill:', error);
    throw error;
  }
};

export const deleteRefill = async (id: string): Promise<void> => {
  try {
    const refills = await getRefills();
    const filtered = refills.filter(r => r.id !== id);
    await AsyncStorage.setItem(REFILLS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting refill:', error);
    throw error;
  }
};
