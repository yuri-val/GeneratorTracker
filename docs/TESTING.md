# Testing & Stabilization Environment

> How to verify the app at every level — from a type check to a full cloud-sync
> round trip against local Firebase emulators — without touching production data.

## Layers at a glance

| Layer | Tool | Command | Covers |
|---|---|---|---|
| Types | TypeScript | `npm run typecheck` | Whole project incl. `e2e/` |
| Unit | Jest (`jest-expo`) | `npm test` / `npm run test:coverage` | `calculations`, `analytics`, `storage` (AsyncStorage mock: mutex, tombstones, migration), `syncMerge` (pure merge rules), `firestore` (batching/cascade with a fake SDK), `sync` service, `mutex`, `syncMeta` |
| Security rules | `@firebase/rules-unit-testing` + Firestore emulator | `npm run test:rules` | `firestore.rules`: owner isolation, document shape, collection-group queries |
| Web e2e | Playwright (Chromium) | `npm run test:e2e` | Core UI flows on the Expo web build, offline only |
| Cloud sync e2e | Playwright + Firebase Emulator Suite | `npm run test:e2e:emu` | Sign-up, push via *Sync Now*, realtime pull — against local emulators |
| Manual, device | Expo dev server / EAS preview APK | `npm start`, `npm run start:emu`, `make eas-build-preview` | Real devices, Play *closed testing* track |
| Everything local | — | `npm run check` | typecheck + unit (same as the pre-commit hook) |

## Prerequisites

- **Node 22** — see `.nvmrc` (`nvm use`). The login shell may default to an older Node; every
  command below assumes Node ≥ 20.19.
- `npm ci`
- Playwright browser (once): `npx playwright install chromium`
- **Java 17+** for the Firestore emulator (`java -version`); Java 21 is recommended because
  `firebase-tools@15` will drop older JDKs (the scripts pin `firebase-tools@14`). The CLI itself is
  fetched on demand through `npx`, nothing to install globally.
- A `.env` file. Unit tests do not need one. The web bundle (e2e, `npm run web`) needs a
  *syntactically* complete config — copying `.env.example` to `.env` is enough when you never sign in.
  In emulator mode (`*:emu` scripts) the real values are ignored entirely.

## Unit tests

```bash
npm test                # all suites
npm run test:watch      # watch mode
npm run test:coverage   # + coverage/ (HTML report in coverage/lcov-report)
```

Conventions:

- Tests live next to the code in `src/**/__tests__/*.test.ts`.
- `src/config/firebase` is stubbed globally in `jest.setup.js`, so importing any service in a test is
  safe. Storage tests mock `../services/auth` to control the "signed in" state (it decides whether a
  change is queued for sync). See `src/utils/__tests__/storage.test.ts`.
- The sync service is tested end-to-end against the in-memory AsyncStorage with every Firestore call
  mocked (`src/services/__tests__/sync.test.ts`). Extend it whenever sync logic changes.
- Time-dependent helpers use `jest.useFakeTimers()` + `jest.setSystemTime()` with **local** dates so
  the suite is timezone-independent.

## Security rules tests

```bash
npm run test:rules
```

Runs `rules-tests/*.test.ts` (separate Jest config `jest.rules.config.js`, Node environment) inside
`firebase emulators:exec --only firestore`. Every change to `firestore.rules` needs a matching case.

## Web e2e (Playwright)

```bash
npm run test:e2e        # headless; starts `expo start --web` on :8081 if nothing is listening
npm run test:e2e:ui     # Playwright UI mode
```

- Specs are in `e2e/`. Shared helpers and fixtures: `e2e/helpers.ts`.
- Elements are located by `testID` (rendered as `data-testid` on web). Prefer adding a `testID` over
  matching translated text; when text is unavoidable the default locale in Chromium is English.
- Seed state through `seedLocalStorage(page, {...})` — on web, AsyncStorage is `localStorage`, keys are
  the ones in `src/utils/storage.ts` (`@generators`, `@work_sessions`, `@refills`, `@maintenance_tasks`).
- The native date/time pickers have **no web implementation**; e2e flows must not open them. Seed
  dated records instead.
- `Alert.alert` is a no-op on web, so success/error alerts cannot be asserted there.
- CI has no `.env` and no Google OAuth client ids — the app must work without them. To reproduce CI
  locally, move `.env` aside temporarily (`EXPO_NO_DOTENV` is not honoured by the Expo CLI here) and start
  Metro with `--clear`: `EXPO_PUBLIC_*` values are inlined into the cached transform.
- Playwright fails a missing element after 15 s (`actionTimeout`); the first navigation may take up to
  120 s while Metro compiles the bundle.
- In CI mode Metro does not hot-reload: restart the web server after code changes when you keep one
  running between runs.

## Cloud sync e2e (Firebase Emulator Suite)

```bash
npm run test:e2e:emu
```

This wraps Playwright in `firebase emulators:exec`: it boots the **Auth** (`:9099`) and
**Firestore** (`:8080`) emulators for the `demo-generatortracker` project, serves the web app with
`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`, runs *all* specs (including `e2e/sync-emulator.spec.ts`, which
is skipped otherwise), then shuts everything down. No real Firebase project or credentials are used.

The emulator spec creates throw-away accounts through the app's own forms and simulates a second device by
writing straight into Firestore through the emulator REST API. It covers: initial push on sign-up, push via
*Sync Now*, realtime pull, edits from another device (incl. the server-time `lastModified` of old app
versions), clearing an optional field, remote deletion, deletion while signed out, cascade delete of a
generator's subcollections, and cloud orphans not reaching Analytics.

## Running the app against the emulators (manual testing)

```bash
npm run emulators        # terminal 1 — Auth + Firestore + UI at http://localhost:4000
npm run start:emu        # terminal 2 — Expo dev server in emulator mode (add --android / --ios / --web)
```

- Settings → About shows a **Firebase Emulator** row when the app is in emulator mode.
- Android emulator and iOS simulator work out of the box (`10.0.2.2` / `localhost`).
- A physical device on the same Wi-Fi reuses the Metro host IP automatically; set
  `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=<your LAN IP>` if detection fails.
- The emulator writes `firestore-debug.log` / `ui-debug.log` into the project root (git-ignored).
- Emulator data is discarded on shutdown. To keep a dataset between sessions:
  `npx firebase-tools@14 emulators:start --only auth,firestore --project demo-generatortracker --import ./.emulator-data --export-on-exit`
  (add `.emulator-data/` to `.gitignore` if you use it).
- Useful manual scenarios: two browser profiles / a device + web signed in as the same account to watch
  sync in both directions; edit documents in the Emulator UI to simulate another device.

### Rules and indexes

> The emulator does **not** enforce composite/collection-group index requirements. A query that works in
> e2e can still fail in production with FAILED_PRECONDITION — keep `firestore.indexes.json` in sync with
> every collection-group query and deploy it before releasing (see S-30).


`firestore.rules` and `firestore.indexes.json` are loaded by the emulator and are the reference for the
production project (they were reconstructed from the data model — **compare them with the Firebase
console before relying on them**). To deploy them to the real project:

```bash
npx firebase-tools@14 login
npx firebase-tools@14 deploy --only firestore:rules,firestore:indexes --project <real-project-id>
```

## Manual device testing

- **Dev client / Expo Go**: `npm start` and scan the QR code. Combine with `npm run start:emu` to test
  sync without touching production data.
- **Preview APK**: `make eas-build-preview` (remote) or `make build-preview` (Docker). Install on a
  device with `adb install`.
- **Play closed testing (alpha)**: `make eas-build-prod` then `eas submit -p android --profile production`
  (see `eas.json`, track `alpha`).

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main` (one run per PR update):

1. **unit** — `npm ci`, `npm run typecheck`, `npm test -- --ci --coverage` (coverage uploaded as an artifact).
2. **rules** — Firestore security rules tests on the emulator (`npm run test:rules`).
3. **e2e** — installs Chromium and Java, caches the emulator binaries, runs `npm run test:e2e:emu`;
   the Playwright report is uploaded on failure.

Locally, the husky **pre-commit** hook runs `npm run typecheck && npm test -- --bail` (`.husky/pre-commit`).
Skip it in an emergency with `git commit --no-verify`.

## Not covered yet

- Native-only behaviour (date pickers, haptics, Android edge-to-edge, Google Sign-In) needs a device
  or a native e2e runner (Maestro / Detox) — a candidate for a later phase.
- Component rendering tests: `@testing-library/react-native` was removed because it broke EAS
  `npm ci`; reintroduce it only with a matching `react-test-renderer` version.
