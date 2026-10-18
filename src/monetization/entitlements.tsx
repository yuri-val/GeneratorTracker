import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLite, useFakeStore } from './edition';
import { ALL_PRODUCT_IDS, entitlementsFor, NO_ENTITLEMENTS, type Entitlements, type ProductId } from './products';
import type { Store, StoreProduct } from './store/types';
import { fakeStore } from './store/fakeStore';
import { expoIapStore } from './store/expoIapStore';

const KEY = '@owned_products';

export interface EntitlementsState {
  /** Whether this build shows ads / enforces limits at all. */
  lite: boolean;
  entitlements: Entitlements;
  /** Products with store prices; empty until the store answers (or when billing is unavailable). */
  products: StoreProduct[];
  owned: ProductId[];
  /** Billing reachable (store account, network); the paywall explains when it is not. */
  storeAvailable: boolean;
  /** A purchase or restore is in flight. */
  busy: boolean;
  /** Resolves true when the product is now owned, false when cancelled; rejects on a store error. */
  purchase: (id: ProductId) => Promise<boolean>;
  /** Re-reads the store account's purchases; resolves the number of owned products. */
  restore: () => Promise<number>;
}

const inert: EntitlementsState = {
  lite: false,
  entitlements: { noAds: true, unlimited: true },
  products: [],
  owned: [],
  storeAvailable: false,
  busy: false,
  purchase: async () => false,
  restore: async () => 0,
};

const EntitlementsContext = createContext<EntitlementsState>(inert);

const readCached = async (): Promise<ProductId[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.filter((id): id is ProductId => (ALL_PRODUCT_IDS as string[]).includes(id));
  } catch {
    return [];
  }
};

// expoIapStore is the real store in native builds and the fake one on web (platform file).
const getStore = (): Store => (useFakeStore ? fakeStore : expoIapStore);

/**
 * Owns the purchase state of the lite edition. Entitlements come from the cached owned
 * products first (so the app starts offline without ads flashing for a paying user) and
 * are refreshed from the store account on launch. The full edition renders an inert
 * provider: everything is entitled, nothing talks to a store.
 */
export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<ProductId[] | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [storeAvailable, setStoreAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const connected = useRef(false);

  const commit = useCallback(async (ids: ProductId[]) => {
    setOwned(ids);
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  }, []);

  useEffect(() => {
    if (!isLite) return;
    let cancelled = false;
    (async () => {
      const cached = await readCached();
      if (!cancelled) setOwned(cached);
      const store = getStore();
      const ok = await store.connect();
      if (cancelled || !ok) return;
      connected.current = true;
      setStoreAvailable(true);
      try {
        const [list, ownedNow] = await Promise.all([store.fetchProducts(ALL_PRODUCT_IDS), store.ownedProductIds()]);
        if (cancelled) return;
        setProducts(list);
        // The store is the source of truth; a refund or a different account removes an entitlement.
        await commit(ownedNow);
      } catch (error) {
        console.warn('Could not read purchases:', error);
      }
    })();
    return () => {
      cancelled = true;
      if (connected.current) getStore().disconnect();
    };
  }, [commit]);

  const purchase = useCallback(
    async (id: ProductId) => {
      setBusy(true);
      try {
        const result = await getStore().purchase(id);
        if (!result) return false;
        await commit(result);
        return result.includes(id);
      } finally {
        setBusy(false);
      }
    },
    [commit],
  );

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      const ids = await getStore().ownedProductIds();
      await commit(ids);
      return ids.length;
    } finally {
      setBusy(false);
    }
  }, [commit]);

  const value = useMemo<EntitlementsState>(() => {
    if (!isLite) return inert;
    return {
      lite: true,
      // Until the cache is read nothing is entitled, which only matters for the first frame.
      entitlements: owned ? entitlementsFor(owned) : NO_ENTITLEMENTS,
      products,
      owned: owned ?? [],
      storeAvailable,
      busy,
      purchase,
      restore,
    };
  }, [owned, products, storeAvailable, busy, purchase, restore]);

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export const useEntitlements = () => useContext(EntitlementsContext);
