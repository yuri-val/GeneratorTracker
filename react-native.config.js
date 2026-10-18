// Native module linking per build variant (see app.config.js).
// The paid Android app (full edition) ships without the AdMob SDK at all: no ads code, nothing that could
// collect device identifiers, which is what the privacy policy promises for it. iOS is always the lite
// edition, so the SDK stays linked there.
// Google sign-in is native on Android only; iOS does not offer it (App Store guideline 4.8), so the
// Google Sign-In SDK is not linked there (its Expo adapter is excluded in package.json → expo.autolinking).
const liteAndroid = process.env.APP_VARIANT === 'lite';

module.exports = {
  dependencies: {
    'react-native-google-mobile-ads': {
      platforms: { android: liteAndroid ? undefined : null },
    },
    '@react-native-google-signin/google-signin': {
      platforms: { ios: null },
    },
  },
};
