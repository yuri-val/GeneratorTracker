import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
  type PurchaseAndroid,
} from 'expo-iap';
import { ALL_PRODUCT_IDS, type ProductId } from '../products';
import type { Store, StoreProduct } from './types';

const isKnown = (id: string): id is ProductId => (ALL_PRODUCT_IDS as string[]).includes(id);

/** Non-consumables: a purchase counts once it is in the "purchased" state (Android pending = not yet paid). */
const ownedIn = (purchases: Purchase[]): ProductId[] =>
  [...new Set(purchases.filter(p => p.purchaseState === 'purchased').map(p => p.productId).filter(isKnown))];

/**
 * The real stores through expo-iap. Non-consumables need no server: the store account owns
 * them, `getAvailablePurchases` returns them on every device, and `finishTransaction`
 * acknowledges them (Google refunds unacknowledged purchases after three days).
 */
export const expoIapStore: Store = {
  connect: async () => {
    try {
      return await initConnection();
    } catch (error) {
      console.warn('In-app purchases unavailable:', error);
      return false;
    }
  },

  fetchProducts: async ids => {
    const products = await fetchProducts({ skus: ids, type: 'in-app' });
    return (products ?? [])
      .filter(p => isKnown(p.id))
      .map((p): StoreProduct => ({ id: p.id as ProductId, price: p.displayPrice }));
  },

  ownedProductIds: async () => {
    const purchases = (await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })) ?? [];
    // Acknowledge anything the store still reports as unfinished (interrupted purchase, reinstall).
    await Promise.all(
      purchases
        .filter(p => p.purchaseState === 'purchased' && isKnown(p.productId) && Platform.OS === 'android' && (p as PurchaseAndroid).isAcknowledgedAndroid === false)
        .map(p => finishTransaction({ purchase: p, isConsumable: false }).catch(() => undefined)),
    );
    return ownedIn(purchases);
  },

  purchase: id =>
    new Promise<ProductId[] | null>((resolve, reject) => {
      const done = () => {
        updated.remove();
        failed.remove();
      };
      const updated = purchaseUpdatedListener(async purchase => {
        if (purchase.productId !== id) return;
        if (purchase.purchaseState === 'pending') return; // Android: paid later (cash, bank transfer); re-checked on next launch
        try {
          await finishTransaction({ purchase, isConsumable: false });
          done();
          resolve(ownedIn([purchase, ...((await getAvailablePurchases()) ?? [])]));
        } catch (error) {
          done();
          reject(error);
        }
      });
      const failed = purchaseErrorListener(error => {
        done();
        if (error.code === 'user-cancelled') resolve(null);
        else reject(new Error(error.message));
      });
      requestPurchase({
        type: 'in-app',
        request: Platform.OS === 'ios' ? { apple: { sku: id } } : { google: { skus: [id] } },
      }).catch(error => {
        done();
        reject(error);
      });
    }),

  disconnect: () => {
    endConnection().catch(() => undefined);
  },
};
