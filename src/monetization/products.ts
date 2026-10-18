/**
 * In-app purchases of the lite edition. Product IDs are the same in App Store Connect and
 * Google Play (docs/MONETIZATION.md lists what to create in each console). All three are
 * non-consumables: bought once, restored on any device of the same store account.
 */
export const PRODUCT_IDS = {
  removeAds: 'gt_remove_ads',
  unlimited: 'gt_unlimited',
  everything: 'gt_everything',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];
export const ALL_PRODUCT_IDS: ProductId[] = [PRODUCT_IDS.removeAds, PRODUCT_IDS.unlimited, PRODUCT_IDS.everything];

/** What the user is entitled to; both are granted by `gt_everything`. */
export interface Entitlements {
  noAds: boolean;
  unlimited: boolean;
}

export const NO_ENTITLEMENTS: Entitlements = { noAds: false, unlimited: false };

/** Entitlements implied by a set of owned product IDs (unknown IDs are ignored). */
export function entitlementsFor(ownedProductIds: Iterable<string>): Entitlements {
  const owned = new Set(ownedProductIds);
  const everything = owned.has(PRODUCT_IDS.everything);
  return {
    noAds: everything || owned.has(PRODUCT_IDS.removeAds),
    unlimited: everything || owned.has(PRODUCT_IDS.unlimited),
  };
}

/** Reference prices (USD tier) for the fake store and the docs; the stores are the source of truth. */
export const REFERENCE_PRICES: Record<ProductId, string> = {
  gt_remove_ads: '$0.99',
  gt_unlimited: '$0.99',
  gt_everything: '$1.49',
};
