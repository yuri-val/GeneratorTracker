# credentials/

All signing keys and store API keys live here. Everything in this folder except this README is gitignored —
keep a backup in a password manager, losing the Android keystore means you can no longer update the app on Google Play.

```
credentials/
├── android/
│   ├── keystore.jks               # upload/signing key (alias + passwords in ../credentials.json)
│   └── play-service-account.json  # Google Play API key for `eas submit` (apk-upload-eas@generator-tracker-df1a5)
└── ios/
    ├── AuthKey_<KEY_ID>.p8        # App Store Connect API key (for `eas submit` / EAS-managed signing)
    ├── asc-api-key.env            # EXPO_ASC_API_KEY_PATH / EXPO_ASC_KEY_ID / EXPO_ASC_ISSUER_ID for EAS CLI
    ├── dist-cert.p12              # only if signing locally (credentialsSource: "local")
    └── profile.mobileprovision    # only if signing locally
```

## What references what

| File | Used by |
|------|---------|
| `android/keystore.jks` | `credentials.json` → `android.keystore.keystorePath` (local builds, `credentialsSource: "local"`) |
| `android/play-service-account.json` | `eas.json` → `submit.production.android.serviceAccountKeyPath` |
| `ios/AuthKey_*.p8` + `ios/asc-api-key.env` | EAS CLI reads the key from env: `set -a; source credentials/ios/asc-api-key.env; set +a` before `eas build -p ios` / `eas submit -p ios` (keeps the Issuer ID out of `eas.json`) |

`credentials.json` itself stays in the project root: EAS CLI only reads it from there. Template: `credentials.json.example`.

The Firebase web config (`EXPO_PUBLIC_*`) is not a secret and stays in the root `.env` — Expo loads it from there.

## CI

`.github/workflows/build-android.yml` recreates `android/keystore.jks` and `credentials.json` from GitHub secrets
(`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).

## iOS

Recommended: let EAS manage iOS signing (the default — `eas.json` has no `credentialsSource` for iOS). On the first
`eas build -p ios` EAS signs in to the Apple Developer account and creates the distribution certificate and provisioning
profile itself. Download them with `eas credentials -p ios` into `ios/` if a local copy is needed.

### iOS: builds and TestFlight

- Signing: the distribution certificate and App Store provisioning profile were created by EAS through the App Store
  Connect API key (team `76CNNHP734`) and live on Expo's servers — `eas build -p ios --profile production`
  (load `ios/asc-api-key.env` first).
- Upload: the App Store Connect app is `6819560707` ("Generator Tracker: Run Hours", `eas.json` → `submit.production.ios.ascAppId`).
  `eas submit --non-interactive` would upload the `.p8` key to Expo, so builds are uploaded locally instead:
  ```bash
  set -a; source credentials/ios/asc-api-key.env; set +a
  xcrun altool --upload-app -f GeneratorTracker.ipa -t ios \
    --apiKey "$EXPO_ASC_KEY_ID" --apiIssuer "$EXPO_ASC_ISSUER_ID" --p8-file-path "$EXPO_ASC_API_KEY_PATH"
  ```
  (download the IPA from the EAS build page). The internal TestFlight group "Team (Expo)" gets every build.
