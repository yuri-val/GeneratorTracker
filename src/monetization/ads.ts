import { Platform } from 'react-native';
import { isLite } from './edition';
import { getAdsSdk, type AdsSdk } from './adsSdk';
import { ensureTrackingPrompt } from './tracking';

/**
 * AdMob ad units of the lite edition: the app's live units in release builds, Google's test units in
 * development builds (so a dev build never serves live ads). Placement (docs/MONETIZATION.md): a banner under the header of Analytics and
 * Settings, one interstitial when Analytics opens — never on Home, around Start/Stop or on
 * the generator screen, and never at launch.
 */
const TEST_UNITS = {
  banner: { android: 'ca-app-pub-3940256099942544/9214589741', ios: 'ca-app-pub-3940256099942544/2435281174' },
  interstitial: { android: 'ca-app-pub-3940256099942544/1033173712', ios: 'ca-app-pub-3940256099942544/4411468910' },
};
// The app's own AdMob units (publisher pub-6097353818165340). They are not secret — every ad unit ID
// ships inside the app binary. AdMob issues separate units per platform app.
const LIVE_UNITS = {
  banner: { android: 'ca-app-pub-6097353818165340/2550287420', ios: 'ca-app-pub-6097353818165340/7415601293' },
  interstitial: { android: 'ca-app-pub-6097353818165340/4860011134', ios: 'ca-app-pub-6097353818165340/8018236522' },
};
const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
// Live units only in release builds: requesting (or tapping) live ads from development builds counts as
// invalid traffic. EXPO_PUBLIC_ADMOB_TEST_ADS=true forces test units in a release build (e.g. internal QA).
const useLive = !__DEV__ && process.env.EXPO_PUBLIC_ADMOB_TEST_ADS !== 'true';
const UNITS = useLive ? LIVE_UNITS : TEST_UNITS;
export const AD_UNITS = {
  banner: UNITS.banner[platformKey],
  interstitial: UNITS.interstitial[platformKey],
};
export const usingTestAds = !useLive;

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
 * the law needs one (GDPR), then iOS asks App Tracking Transparency (UMP shows it after its
 * IDFA explainer; `ensureTrackingPrompt` asks itself when UMP did not), and only then is the
 * SDK initialised. Safe to call more than once.
 */
export function initAds(): Promise<AdsStatus> {
  if (!adsSupported) return Promise.resolve(status);
  if (!initPromise) {
    initPromise = (async () => {
      const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, default: mobileAds } = sdk();
      let info: Awaited<ReturnType<typeof AdsConsent.gatherConsent>> | null = null;
      try {
        info = await AdsConsent.gatherConsent();
      } catch (error) {
        // Typically no network for the consent request: stay without ads and let the next
        // screen that needs one try again, instead of pinning this launch to "no ads".
        console.warn('Consent not gathered:', error);
      }
      await ensureTrackingPrompt();
      if (!info) {
        initPromise = null;
        return status;
      }
      try {
        const privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
        if (info.canRequestAds) await mobileAds().initialize();
        status = { ready: info.canRequestAds, privacyOptionsRequired };
      } catch (error) {
        console.warn('Ads not initialised:', error);
        initPromise = null;
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
