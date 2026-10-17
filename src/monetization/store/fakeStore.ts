import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_PRODUCT_IDS, REFERENCE_PRICES, type ProductId } from '../products';
import type { Store, StoreProduct } from './types';

const KEY = '@fake_store_purchases';

/**
 * Purchases that succeed instantly and persist in AsyncStorage: for web, Jest and dev
 * builds (EXPO_PUBLIC_FAKE_STORE=true). Never used by a store build.
 */
export const fakeStore: Store = {
  connect: async () => true,
  fetchProducts: async (ids): Promise<StoreProduct[]> => ids.map(id => ({ id, price: REFERENCE_PRICES[id] })),
  ownedProductIds: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.filter((id): id is ProductId => (ALL_PRODUCT_IDS as string[]).includes(id));
  },
  purchase: async id => {
    const owned = new Set(await fakeStore.ownedProductIds());
    owned.add(id);
    await AsyncStorage.setItem(KEY, JSON.stringify([...owned]));
    return [...owned];
  },
  disconnect: () => {},
};
