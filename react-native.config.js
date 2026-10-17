// Native module linking per build variant (see app.config.js).
// The paid Android app (full edition) ships without the AdMob SDK at all: no ads code, nothing that could
// collect device identifiers, which is what the privacy policy promises for it. iOS is always the lite
// edition, so the SDK stays linked there.
const liteAndroid = process.env.APP_VARIANT === 'lite';

module.exports = {
  dependencies: {
    'react-native-google-mobile-ads': {
      platforms: { android: liteAndroid ? undefined : null },
    },
  },
};
