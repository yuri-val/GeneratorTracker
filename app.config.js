// Build variants on top of app.json.
//
// Editions (read at runtime from `extra.edition`, see src/monetization/edition.ts):
//   full — the paid Android app: no ads, no limits, no in-app purchases.
//   lite — free with ads and limits; "Remove ads" / "Unlimited" in-app purchases.
//
// iOS has a single App Store app and it is the lite edition (free with purchases).
// Android has two apps: `APP_VARIANT=lite` builds "Generator Tracker Lite" with its own
// package name; the default is the paid app. `EXPO_PUBLIC_EDITION=lite` forces the lite
// edition in a web/dev build (used by the lite e2e tests with the fake store).
const variant = process.env.APP_VARIANT === 'lite' ? 'lite' : 'full';

// AdMob app IDs are native config; Google's sample IDs are used until real ones are set
// (EAS secrets ADMOB_ANDROID_APP_ID / ADMOB_IOS_APP_ID). Ad unit IDs live in src/monetization/ads.ts.
const ADMOB_TEST_APP_IDS = { android: 'ca-app-pub-3940256099942544~3347511713', ios: 'ca-app-pub-3940256099942544~1458002511' };

module.exports = ({ config }) => {
  const lite = variant === 'lite';
  const edition = process.env.EXPO_PUBLIC_EDITION === 'lite' || lite ? 'lite' : 'full';
  return {
    ...config,
    name: lite ? 'Generator Tracker Lite' : config.name,
    scheme: lite ? 'generatortrackerlite' : config.scheme,
    android: {
      ...config.android,
      package: lite ? `${config.android.package}Lite` : config.android.package,
    },
    extra: {
      ...config.extra,
      // Android: per app; iOS: the only app is the free one with purchases.
      edition: { android: edition, ios: 'lite', web: edition },
    },
    plugins: [
      ...config.plugins,
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || ADMOB_TEST_APP_IDS.android,
          iosAppId: process.env.ADMOB_IOS_APP_ID || ADMOB_TEST_APP_IDS.ios,
          // The SDK must not start measuring at launch: the full edition never initialises
          // it, and the lite edition initialises it only after the consent flow.
          delayAppMeasurementInit: true,
          userTrackingUsageDescription: 'Allows ads in the free version to be more relevant. The app itself never tracks you.',
        },
      ],
    ],
  };
};
