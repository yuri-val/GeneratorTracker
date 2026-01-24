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

For local builds, you need to configure your Android signing credentials.

1. **Copy the credentials template:**
   ```bash
   cp credentials.json.example credentials.json
   ```

2. **Generate a keystore (if you don't have one):**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore android-release.keystore \
     -alias generatortracker \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

3. **Update credentials.json with your keystore information:**
   ```json
   {
     "android": {
       "keystore": {
         "keystorePath": "android-release.keystore",
         "keystorePassword": "your-keystore-password",
         "keyAlias": "generatortracker",
         "keyPassword": "your-key-password"
       }
     }
   }
   ```

4. **Ensure your keystore file is in the project root or update the path in credentials.json**

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

- `credentials.json` and `*.keystore` files are gitignored for security
- Keep your keystore and passwords safe - losing them means you can't update your app
- For remote builds on EAS, credentials are managed by Expo
- Local builds output to `builds/` directory
