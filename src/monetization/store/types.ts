import type { ProductId } from '../products';

export interface StoreProduct {
  id: ProductId;
  /** Localised price from the store, e.g. "0,99 $" / "₴44.99". */
  price: string;
}

/**
 * The slice of the App Store / Google Play billing APIs the app needs. `expoIapStore`
 * wraps expo-iap; `fakeStore` replaces it on web, in Jest and in dev builds.
 */
export interface Store {
  /** Connects to the store; resolves false when billing is unavailable (no store account, Expo Go…). */
  connect(): Promise<boolean>;
  /** Products with localised prices; missing IDs are left out (not created in the console yet). */
  fetchProducts(ids: ProductId[]): Promise<StoreProduct[]>;
  /** Product IDs the store account owns (non-consumables are returned forever). */
  ownedProductIds(): Promise<ProductId[]>;
  /**
   * Starts the purchase UI. Resolves with the owned product IDs after a successful purchase,
   * null when the user cancelled; rejects on a store error.
   */
  purchase(id: ProductId): Promise<ProductId[] | null>;
  disconnect(): void;
}
