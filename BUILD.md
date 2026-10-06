# Build Instructions

## Local Builds Configuration

### Output Directory
Local builds are saved in the project root directory by EAS. After building, you can move them to the `builds/` directory for organization:
```bash
mkdir -p builds
mv *.apk builds/ 2>/dev/null || true
mv *.aab builds/ 2>/dev/null || true
```

### Credentials Setup

All keys live in `credentials/` (gitignored, see `credentials/README.md`). Only `credentials.json` stays in the
project root because EAS CLI reads it only from there.

1. **Copy the credentials template:**
   ```bash
   cp credentials.json.example credentials.json
   ```

2. **Put the keystore at `credentials/android/keystore.jks`** (or generate one):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore credentials/android/keystore.jks \
     -alias generatortracker \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

3. **Fill in the alias and passwords in `credentials.json`.**

4. **For `eas submit` to Google Play** put the service account key at
   `credentials/android/play-service-account.json` (referenced from `eas.json`).

### Building

**Local builds (using Docker):**
```bash
# Preview APK
make build-preview

# Production bundle
make build-prod
```

**Remote builds (on EAS servers):**
```bash
# Preview APK
make eas-build-preview

# Production bundle
make eas-build-prod
```

### Notes

- `credentials.json` and everything in `credentials/` (except its README) are gitignored
- Keep your keystore and passwords safe - losing them means you can't update your app
- For remote builds on EAS, credentials are managed by Expo
- Local builds output to `builds/` directory
