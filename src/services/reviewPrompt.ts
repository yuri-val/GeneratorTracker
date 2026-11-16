import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { getReviewPromptState, saveReviewPromptState, type ReviewPromptState } from '../utils/storage';

/**
 * The system "rate this app" prompt (StoreKit on iOS, In-App Review on Android). It is asked at a
 * moment of success — after a work session was stopped and its Undo window passed — and only once
 * the person has really used the app. Apple and Google add their own quotas on top (Apple shows it
 * at most 3 times a year) and may show nothing at all, so the app never shows its own rating UI and
 * never asks again right away.
 */
export const REVIEW_MIN_STOPS = 3;
export const REVIEW_MIN_INTERVAL_MS = 120 * 24 * 60 * 60 * 1000;
/** Longer than the 5 s Undo snackbar after Stop, so an undone stop never triggers the prompt. */
export const REVIEW_DELAY_AFTER_STOP_MS = 6000;

const APP_VERSION = Constants.expoConfig?.version ?? '';

/** Pure gate, unit-tested: enough real use, not asked for this version, not asked recently. */
export function shouldRequestReview(state: ReviewPromptState, now: number, appVersion: string): boolean {
  if (state.stops < REVIEW_MIN_STOPS) return false;
  if (state.askedVersion && state.askedVersion === appVersion) return false;
  if (state.askedAt && now - Date.parse(state.askedAt) < REVIEW_MIN_INTERVAL_MS) return false;
  return true;
}

/**
 * Counts a stopped session and, when the gate allows it, requests the system prompt.
 * `wasUndone` is checked right before asking. Resolves true when the prompt was requested.
 */
export async function recordStopAndMaybeRequestReview(
  wasUndone: () => boolean,
  now = Date.now(),
  appVersion = APP_VERSION,
): Promise<boolean> {
  if (Platform.OS === 'web' || wasUndone()) return false;
  const state = await getReviewPromptState();
  const next = { ...state, stops: state.stops + 1 };
  await saveReviewPromptState(next);
  if (!shouldRequestReview(next, now, appVersion)) return false;
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    await saveReviewPromptState({ ...next, askedAt: new Date(now).toISOString(), askedVersion: appVersion });
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    console.warn('Store review not requested:', error);
    return false;
  }
}
