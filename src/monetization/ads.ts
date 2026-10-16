import { Platform } from 'react-native';
import { isLite } from './edition';
import { getAdsSdk, type AdsSdk } from './adsSdk';

/**
 * AdMob ad units of the lite edition. Google's test units are used until the real ones are
 * configured (EXPO_PUBLIC_ADMOB_* in the EAS environment), so a dev build never serves
 * live ads. Placement (docs/MONETIZATION.md): a banner under the header of Analytics and
 * Settings, one interstitial when Analytics opens — never on Home, around Start/Stop or on
 * the generator screen, and never at launch.
 */
const TEST_UNITS = {
  banner: 'ca-app-pub-3940256099942544/9214589741',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};
export const AD_UNITS = {
  banner: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT || TEST_UNITS.banner,
  interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT || TEST_UNITS.interstitial,
};
export const usingTestAds = AD_UNITS.banner === TEST_UNITS.banner;

/** No interstitial in the first 10 minutes after launch, and at most one per 10 minutes after that. */
export const INTERSTITIAL_MIN_INTERVAL_MS = 10 * 60 * 1000;

/** Pure gate for the interstitial cadence, unit-tested separately from the SDK. */
export const interstitialDue = (now: number, lastShownAt: number, minInterval = INTERSTITIAL_MIN_INTERVAL_MS) =>
  now - lastShownAt >= minInterval;

/** The native SDK only exists in native lite builds; everything else gets a no-op. */
export const adsSupported = isLite && Platform.OS !== 'web' && getAdsSdk() !== null;

const sdk = (): AdsSdk => getAdsSdk()!;

type AdsStatus = {
  /** Consent gathered (UMP form / ATT where required) and the SDK initialised. */
  ready: boolean;
  /** The UMP "privacy options" entry point must be offered (EEA/UK users). */
  privacyOptionsRequired: boolean;
};

let status: AdsStatus = { ready: false, privacyOptionsRequired: false };
let initPromise: Promise<AdsStatus> | null = null;

/**
 * Consent first, SDK second, as the AdMob policies require: the UMP form is shown where
 * the law needs one (GDPR), iOS adds the App Tracking Transparency prompt, and only then
 * is the SDK initialised. Safe to call more than once.
 */
export function initAds(): Promise<AdsStatus> {
  if (!adsSupported) return Promise.resolve(status);
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, default: mobileAds } = sdk();
        const info = await AdsConsent.gatherConsent();
        const privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
        if (info.canRequestAds) await mobileAds().initialize();
        status = { ready: info.canRequestAds, privacyOptionsRequired };
      } catch (error) {
        console.warn('Ads not initialised:', error);
      }
      return status;
    })();
  }
  return initPromise;
}

export const adsStatus = () => status;

/** Opens the UMP privacy options form (Settings → "Privacy options" when `privacyOptionsRequired`). */
export async function showPrivacyOptions() {
  if (!adsSupported) return;
  await sdk().AdsConsent.showPrivacyOptionsForm();
}

// One interstitial instance, preloaded after init so it is ready when Analytics opens.
let interstitial: ReturnType<AdsSdk['InterstitialAd']['createForAdRequest']> | null = null;
let interstitialLoaded = false;
let lastInterstitialAt = Date.now(); // the launch counts: nothing in the first interval

function preloadInterstitial() {
  if (interstitial) return;
  const { InterstitialAd, AdEventType } = sdk();
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    interstitial?.load();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });
  interstitial.load();
}

/**
 * Shows the Analytics interstitial if one is loaded and the cadence allows it. Resolves
 * true when an ad was shown. `noAds` callers must not call this at all.
 */
export async function maybeShowInterstitial(now = Date.now()): Promise<boolean> {
  if (!adsSupported) return false;
  const { ready } = await initAds();
  if (!ready) return false;
  preloadInterstitial();
  if (!interstitialLoaded || !interstitialDue(now, lastInterstitialAt)) return false;
  lastInterstitialAt = now;
  interstitialLoaded = false;
  try {
    await interstitial!.show();
    return true;
  } catch (error) {
    console.warn('Interstitial not shown:', error);
    return false;
  }
}
