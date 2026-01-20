import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  collectionGroup,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Generator, WorkSession, Refill } from '../models/types';

/**
 * Firestore Service
 * Handles all Firestore CRUD operations
 */

/**
 * Get document reference for a generator
 */
const getGeneratorRef = (userId: string, generatorId: string) => {
  return doc(db, `users/${userId}/generators/${generatorId}`);
};

/**
 * Get collection reference for generators
 */
const getGeneratorsRef = (userId: string) => {
  return collection(db, `users/${userId}/generators`);
};

/**
 * Get document reference for a work session
 */
const getWorkSessionRef = (userId: string, generatorId: string, sessionId: string) => {
  return doc(db, `users/${userId}/generators/${generatorId}/workSessions/${sessionId}`);
};

/**
 * Get collection reference for work sessions
 */
const getWorkSessionsRef = (userId: string, generatorId: string) => {
  return collection(db, `users/${userId}/generators/${generatorId}/workSessions`);
};

/**
 * Get document reference for a refill
 */
const getRefillRef = (userId: string, generatorId: string, refillId: string) => {
  return doc(db, `users/${userId}/generators/${generatorId}/refills/${refillId}`);
};

/**
 * Get collection reference for refills
 */
const getRefillsRef = (userId: string, generatorId: string) => {
  return collection(db, `users/${userId}/generators/${generatorId}/refills`);
};

// ============= Generator Operations =============

export const saveGeneratorToFirestore = async (
  generator: Generator,
  userId: string
): Promise<void> => {
  const genRef = getGeneratorRef(userId, generator.id);
  await setDoc(genRef, {
    ...generator,
    userId,
    lastModified: serverTimestamp(),
  }, { merge: true });
};

export const getGeneratorFromFirestore = async (
  userId: string,
  generatorId: string
): Promise<Generator | null> => {
  const genRef = getGeneratorRef(userId, generatorId);
  const snapshot = await getDoc(genRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return convertTimestamps(data) as Generator;
  }

  return null;
};

export const getAllGeneratorsFromFirestore = async (
  userId: string
): Promise<Generator[]> => {
  const genRef = getGeneratorsRef(userId);
  const snapshot = await getDocs(genRef);

  return snapshot.docs.map(doc => convertTimestamps(doc.data()) as Generator);
};

export const deleteGeneratorFromFirestore = async (
  userId: string,
  generatorId: string
): Promise<void> => {
  // Delete the generator document
  const genRef = getGeneratorRef(userId, generatorId);
  await deleteDoc(genRef);

  // Note: Subcollections (workSessions, refills) are NOT automatically deleted
  // They need to be deleted separately or handled by a Cloud Function
};

// ============= Work Session Operations =============

export const saveWorkSessionToFirestore = async (
  session: WorkSession,
  userId: string
): Promise<void> => {
  const sessionRef = getWorkSessionRef(userId, session.generatorId, session.id);
  await setDoc(sessionRef, {
    ...session,
    userId,
    lastModified: serverTimestamp(),
  }, { merge: true });
};

export const getWorkSessionFromFirestore = async (
  userId: string,
  generatorId: string,
  sessionId: string
): Promise<WorkSession | null> => {
  const sessionRef = getWorkSessionRef(userId, generatorId, sessionId);
  const snapshot = await getDoc(sessionRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return convertTimestamps(data) as WorkSession;
  }

  return null;
};

export const getWorkSessionsForGeneratorFromFirestore = async (
  userId: string,
  generatorId: string
): Promise<WorkSession[]> => {
  const sessionsRef = getWorkSessionsRef(userId, generatorId);
  const snapshot = await getDocs(sessionsRef);

  return snapshot.docs.map(doc => convertTimestamps(doc.data()) as WorkSession);
};

export const getAllWorkSessionsFromFirestore = async (
  userId: string
): Promise<WorkSession[]> => {
  // Use collection group query to get all work sessions across all generators
  const sessionsQuery = collectionGroup(db, 'workSessions');
  const q = query(sessionsQuery, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => convertTimestamps(doc.data()) as WorkSession);
};

export const deleteWorkSessionFromFirestore = async (
  userId: string,
  generatorId: string,
  sessionId: string
): Promise<void> => {
  const sessionRef = getWorkSessionRef(userId, generatorId, sessionId);
  await deleteDoc(sessionRef);
};

// ============= Refill Operations =============

export const saveRefillToFirestore = async (
  refill: Refill,
  userId: string
): Promise<void> => {
  const refillRef = getRefillRef(userId, refill.generatorId, refill.id);
  await setDoc(refillRef, {
    ...refill,
    userId,
    lastModified: serverTimestamp(),
  }, { merge: true });
};

export const getRefillFromFirestore = async (
  userId: string,
  generatorId: string,
  refillId: string
): Promise<Refill | null> => {
  const refillRef = getRefillRef(userId, generatorId, refillId);
  const snapshot = await getDoc(refillRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return convertTimestamps(data) as Refill;
  }

  return null;
};

export const getRefillsForGeneratorFromFirestore = async (
  userId: string,
  generatorId: string
): Promise<Refill[]> => {
  const refillsRef = getRefillsRef(userId, generatorId);
  const snapshot = await getDocs(refillsRef);

  return snapshot.docs.map(doc => convertTimestamps(doc.data()) as Refill);
};

export const getAllRefillsFromFirestore = async (
  userId: string
): Promise<Refill[]> => {
  // Use collection group query to get all refills across all generators
  const refillsQuery = collectionGroup(db, 'refills');
  const q = query(refillsQuery, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => convertTimestamps(doc.data()) as Refill);
};

export const deleteRefillFromFirestore = async (
  userId: string,
  generatorId: string,
  refillId: string
): Promise<void> => {
  const refillRef = getRefillRef(userId, generatorId, refillId);
  await deleteDoc(refillRef);
};

// ============= Helper Functions =============

/**
 * Convert Firestore Timestamps to ISO strings
 */
function convertTimestamps(data: any): any {
  const converted = { ...data };

  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  }

  return converted;
}
