import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { getReviewPromptState } from '../../utils/storage';
import {
  recordStopAndMaybeRequestReview,
  shouldRequestReview,
  REVIEW_MIN_INTERVAL_MS,
  REVIEW_MIN_STOPS,
} from '../reviewPrompt';

const NOW = Date.parse('2026-11-17T12:00:00Z');
const notUndone = () => false;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('shouldRequestReview', () => {
  it('waits for real use', () => {
    expect(shouldRequestReview({ stops: REVIEW_MIN_STOPS - 1 }, NOW, '3.3.0')).toBe(false);
    expect(shouldRequestReview({ stops: REVIEW_MIN_STOPS }, NOW, '3.3.0')).toBe(true);
  });

  it('asks at most once per version and not again within the interval', () => {
    const askedAt = new Date(NOW - 10 * 86_400_000).toISOString();
    expect(shouldRequestReview({ stops: 9, askedAt, askedVersion: '3.3.0' }, NOW, '3.3.0')).toBe(false);
    expect(shouldRequestReview({ stops: 9, askedAt, askedVersion: '3.2.0' }, NOW, '3.3.0')).toBe(false);
    const longAgo = new Date(NOW - REVIEW_MIN_INTERVAL_MS - 1000).toISOString();
    expect(shouldRequestReview({ stops: 9, askedAt: longAgo, askedVersion: '3.2.0' }, NOW, '3.3.0')).toBe(true);
  });
});

describe('recordStopAndMaybeRequestReview', () => {
  it('counts stops and requests the prompt on the third one, once', async () => {
    expect(await recordStopAndMaybeRequestReview(notUndone, NOW, '3.3.0')).toBe(false);
    expect(await recordStopAndMaybeRequestReview(notUndone, NOW, '3.3.0')).toBe(false);
    expect(await recordStopAndMaybeRequestReview(notUndone, NOW, '3.3.0')).toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(await recordStopAndMaybeRequestReview(notUndone, NOW, '3.3.0')).toBe(false);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(await getReviewPromptState()).toMatchObject({ stops: 4, askedVersion: '3.3.0' });
  });

  it('ignores an undone stop', async () => {
    expect(await recordStopAndMaybeRequestReview(() => true, NOW, '3.3.0')).toBe(false);
    expect((await getReviewPromptState()).stops).toBe(0);
  });

  it('does not record a request when the store cannot show one', async () => {
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await AsyncStorage.setItem('@review_prompt', JSON.stringify({ stops: 5 }));
    expect(await recordStopAndMaybeRequestReview(notUndone, NOW, '3.3.0')).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    expect((await getReviewPromptState()).askedAt).toBeUndefined();
  });
});
