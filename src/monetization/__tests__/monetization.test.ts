import { entitlementsFor, NO_ENTITLEMENTS, PRODUCT_IDS } from '../products';
import { canAddGenerator, canAddMaintenanceTask, LIMITS } from '../limits';
import { interstitialDue, INTERSTITIAL_MIN_INTERVAL_MS } from '../ads';

describe('entitlementsFor', () => {
  it('maps owned products to entitlements and ignores unknown IDs', () => {
    expect(entitlementsFor([])).toEqual(NO_ENTITLEMENTS);
    expect(entitlementsFor([PRODUCT_IDS.removeAds])).toEqual({ noAds: true, unlimited: false });
    expect(entitlementsFor([PRODUCT_IDS.unlimited, 'something_else'])).toEqual({ noAds: false, unlimited: true });
    expect(entitlementsFor([PRODUCT_IDS.everything])).toEqual({ noAds: true, unlimited: true });
  });
});

describe('limits', () => {
  const none = NO_ENTITLEMENTS;
  const unlimited = { noAds: false, unlimited: true };

  it('never apply to the full edition', () => {
    expect(canAddGenerator(false, none, 100)).toBe(true);
    expect(canAddMaintenanceTask(false, none, 100)).toBe(true);
  });

  it('cap new generators and tasks in the lite edition without the purchase', () => {
    expect(canAddGenerator(true, none, LIMITS.generators - 1)).toBe(true);
    expect(canAddGenerator(true, none, LIMITS.generators)).toBe(false);
    // Records synced from the cloud can exceed the limit; they only block creating more.
    expect(canAddGenerator(true, none, LIMITS.generators + 5)).toBe(false);
    expect(canAddMaintenanceTask(true, none, LIMITS.maintenanceTasksPerGenerator - 1)).toBe(true);
    expect(canAddMaintenanceTask(true, none, LIMITS.maintenanceTasksPerGenerator)).toBe(false);
  });

  it('are lifted by the Unlimited purchase', () => {
    expect(canAddGenerator(true, unlimited, 50)).toBe(true);
    expect(canAddMaintenanceTask(true, unlimited, 50)).toBe(true);
  });
});

describe('interstitial cadence', () => {
  it('allows one ad per interval, counting from the launch', () => {
    const launch = 1_000_000;
    expect(interstitialDue(launch + 60_000, launch)).toBe(false);
    expect(interstitialDue(launch + INTERSTITIAL_MIN_INTERVAL_MS - 1, launch)).toBe(false);
    expect(interstitialDue(launch + INTERSTITIAL_MIN_INTERVAL_MS, launch)).toBe(true);
  });
});
