# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- New app icon: a white lightning bolt inside a glowing orange 3/4 "run-hours" ring with gauge ticks on dark
  glass — the same visual language as the app's dark theme and the landing page, readable down to 29 px and in
  tinted/grayscale modes. Android gets a proper adaptive icon (separate background layer, mark inside the 66 dp
  safe zone) and a monochrome layer for themed icons. Splash, web favicon, landing icons and OG images follow.
  Sources and geometry live in `scripts/icons/build-icons.mjs` (`assets/icon-source/`).

## [2.6.0] - 2026-10-06

**Account deletion in the app** and email/anonymous-only sign-in on iOS — required by the App Store
(guidelines 5.1.1(v) and 4.8) and by Google Play's account-deletion policy.

### Added
- **Settings → Delete Account** (signed-in users): deletes the Firebase account and everything it synced to the cloud — generators, work sessions, refills, maintenance tasks and children orphaned by versions before 2.4.2. Data on the device stays and keeps working offline.
  - Email accounts confirm with their password (re-authentication), so a stale session can never leave the cloud wiped with the account still in place; anonymous accounts just confirm.
  - Order: sync lock and realtime listeners stopped → local records detached from the account (pending, no owner) → cloud data deleted → account deleted. A failure at any step loses nothing: the next sync re-uploads the detached records, and a new sign-in (any account) uploads them as new data.
  - iOS: system alert with a destructive action and a secure-text password prompt; Android/web: Material dialog.
- Tests: `accountDeletion.test.ts`, cloud wipe (`deleteAllRemoteData`), local detach, sync ordering, and an emulator e2e covering wrong password, orphan cleanup, kept local data and re-upload to a new account.

### Changed
- iOS no longer offers Google sign-in (App Store guideline 4.8 would require Sign in with Apple next to it); email/password and anonymous sign-in remain. Android never offered Google sign-in; the web version keeps it.
- Privacy policy and landing FAQ describe in-app account deletion.

## [2.5.0] - 2026-10-01

**Platform-native design** — iOS follows the Human Interface Guidelines, Android Material 3, web keeps the
Paper look (`docs/NATIVE_DESIGN_PLAN.md`). Logic, storage and sync are unchanged.

### Added
- Native tab bars: iOS `UITabBar` (Liquid Glass on iOS 26+, top tab bar on iPadOS) and the Android Material 3 `BottomNavigationView` (`react-native-bottom-tabs`); web keeps the Paper tab bar.
- iOS native navigation bars (`ScreenHeader`): large titles, transparent bars with the iOS 26 scroll-edge effect, glass bar buttons; "+" in the bar instead of the FAB; a "More" pull-down (Edit, destructive Delete) on the generator screen.
- iOS generator screen as one inset-grouped list with a native segmented control for sessions / refills / maintenance.
- iOS forms (generator, session, refill, maintenance) and Settings as SwiftUI grouped forms via `@expo/ui` (`NativeForm`): labelled rows, compact date/time pickers, menu picker for the language; modal sheets with native close/done buttons.
- SF Symbols on iOS through a semantic icon map (`ICONS` + `AppIcon`), MaterialCommunityIcons on Android/web.
- Android: explicit edit action in the generator screen's app bar.
- Maestro native UI tests for iOS and Android (`.maestro/`, `npm run test:native:ios|android`).

### Changed
- The app follows the system light/dark appearance (`userInterfaceStyle: automatic`, `expo-system-ui`).
- Delete confirmations use the system alert on iOS/Android (destructive action); web keeps the Paper dialog.
- iOS uses system semantic colours (grouped backgrounds, labels, separators).
- Content on tablets, foldables and wide screens is a centred column of at most 720 pt/dp (S-34).
- The generator model is shown in the screen content on all platforms (Paper MD3 never rendered app-bar subtitles, so it was invisible on Android); the unused "Tap to edit" strings were removed.
- `DESIGN_GUIDE.md` rewritten around platform-native design; `docs/TESTING.md` documents Maestro.

### Fixed
- **Dates after midnight** (S-10): `getCurrentDate`, every date picker, `formatDate` and chart month labels mixed UTC and local time — a session started between 00:00 and 03:00 in Kyiv got yesterday's date and an active session showed +24 h; west of UTC dates showed a day early. Local calendar helpers (`toLocalDateString` / `parseLocalDate`) are used everywhere; Jest now runs with `TZ=America/New_York` so these bugs reproduce on every machine. Stored records are intentionally not migrated.
- **Tablets** (S-34): the Home empty-state text was cut off; chart width came from `Dimensions` once at import and the x-axis overflowed the card — charts now follow `useWindowDimensions`, reserve the y-axis label column and clamp the axis.

### Verified
- Unit 118/118, web e2e 7/7, Firebase-emulator e2e 14/14.
- Maestro flows: iPhone 17 (iOS 27) and Android 16 tablet; manual checks on iPad Pro 13", Android 16 phone, light and dark themes.

## [2.4.3] - 2026-09-30

Platform upgrade to **Expo SDK 57** (React Native 0.86, React 19.2) — required for iOS builds with
Xcode 27 / the iOS 27 SDK (S-35). No new features.

### Changed
- Expo SDK 54 → 57: React Native 0.81 → 0.86, React 19.1 → 19.2, reanimated 4.1 → 4.5, worklets 0.5 → 0.10, all `expo-*` modules and navigation/UI native libraries aligned via `expo install --fix`; TypeScript 6.
- iOS minimum version is now 16.4 (Expo SDK 56+). Android is unchanged (min SDK 24, target SDK 36).
- `app.json`: removed `newArchEnabled` and `android.edgeToEdgeEnabled` (both mandatory since SDK 55); added `expo-build-properties` with `ios.enableSceneSupport`.
- `build-android.yml` uses the Node version from `.nvmrc` (22).

### Fixed
- **iOS app exited immediately at launch when built with Xcode 27** (S-35): the UIScene life cycle required by the iOS 27 SDK is now enabled.
- Xcode 27 rejected pods with a deployment target below iOS 15 — config plugin `plugins/withPodsDeploymentTarget.js` raises them to the SDK floor.
- **The "+" button overlapped the tab bar** on iPhones with a home indicator and on Android tablets: the custom tab bar reports its real height and the FAB / bottom padding of Home, Analytics and Settings follow it (part of S-34).
- **Empty "Sessions" and "Refills" tabs showed "?" instead of an icon** (names that do not exist in MaterialCommunityIcons); a new test checks every icon name against the installed font.
- **`npm ci` failed on GitHub Actions/EAS** because a global `legacy-peer-deps=true` produced a lockfile without peer dependencies; a project `.npmrc` now enforces strict peers and the lockfile was regenerated.

### Verified
- Unit 109/109, web + Firebase-emulator e2e 14/14.
- Native iOS Release build (Xcode 27, iOS 27 simulator): launch, create generator, start/stop session, restart with data kept.
- Android release APK (GitHub Actions, Android 16 emulator): full smoke test incl. refills, maintenance, analytics, settings, restart.

## [2.4.2] - 2026-09-30

Stabilization stage 1 — sync data integrity (`docs/STABILIZATION_PLAN.md` S-1, S-2, S-3, S-8, S-9, S-28).
No new features; Firestore structure unchanged (one added field, `serverUpdatedAt`), compatible with
devices still on 2.4.0/2.4.1.

### Fixed
- **Initial sync after sign-in never ran** (S-28): the Settings screen called it before the auth state reached React, so it threw "User must be authenticated"; data created before signing in was never uploaded. The signed-in uid is now passed explicitly.
- **Cross-device edits stopped arriving** (S-1): Firestore replaced `lastModified` with a server timestamp and realtime listeners stored it unconverted, so last-write-wins compared `NaN` and the local copy won forever. The client ISO time is now kept (server time goes to `serverUpdatedAt`), Timestamps are converted everywhere, and values already stored by older versions are normalized when read.
- **Cleared fields were never cleared in the cloud**: documents are written with a full `set` instead of `merge`.
- **Deletions did not sync and deleted records came back** (S-2): every local delete now records a tombstone (also while signed out) that is pushed before any pull; realtime `removed` events are applied; complete snapshots reconcile deletions made elsewhere, touching only records confirmed in this account's cloud.
- **Deleting a generator left its sessions/refills/tasks in Firestore** (S-3): cascade delete in batches; orphaned cloud records are never stored locally; Analytics only counts records of existing generators.
- **Concurrent storage writes could overwrite each other** (S-8): all writes go through one FIFO mutex and `multiSet`; syncs never overlap.
- **Queued changes were dropped after 3 failed attempts** (S-6): replaced by state-based change tracking — failures stay pending and are retried.
- **Sync could hang forever offline** (S-7, partial): network operations time out after 30 s; reconciliation reads come from the server only (`getDocsFromServer`), never from an empty offline cache.
- Unreadable local data is backed up under `<key>.corrupt-<timestamp>` before being reset.
- **Settings screen crashed when the build had no Google OAuth client id for its platform** (S-31): expo-auth-session throws during render in that case. Google sign-in is now only offered when the id is present; the rest of Settings always works. Store builds carry all three ids, so released apps were not affected.
- CI: pull requests no longer run the workflow twice (push + pull_request), and Playwright fails a missing element after 15 s instead of waiting for the whole test timeout.

### Changed
- The persisted sync queue (`src/utils/syncQueue.ts`) was removed; old installs migrate automatically (queued deletes → tombstones, queued updates → pending).
- Local saves always set `syncStatus: 'pending'` and a monotonic `lastModified`, keeping the stored `syncedAt`/`userId`.
- New modules: `src/services/syncMerge.ts` (pure merge rules), `src/utils/mutex.ts`, `src/utils/syncMeta.ts`.

### Security
- `firestore.rules`: writes must be self-consistent with their path (`userId`, `id`, `generatorId`) and carry a `lastModified`; covered by 11 emulator tests (`npm run test:rules`, new CI job). Deploying to the production project is still a manual step.

### Tests
- 105 unit tests (new: `syncMerge`, `firestore`, `mutex`, `syncMeta`; rewritten: `storage`, `sync`).
- Emulator e2e extended to 7 cloud-sync scenarios (cross-device edits incl. legacy server timestamps, cleared fields, remote deletion, deletion while signed out, cascade delete, cloud orphans).

## [2.4.1] - 2026-09-30

Stabilization phase kick-off: no functional changes for users. This release fixes the
build health issues found in the audit and sets up the test environment used for the
upcoming stabilization work (see `docs/STABILIZATION_PLAN.md`).

### Fixed
- TypeScript errors that broke `tsc --noEmit`: `getReactNativePersistence` typing for the React Native build of `firebase/auth`, and the obsolete `expoClientId` option in the Google OAuth request.
- Google OAuth now uses the dedicated Android client id (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`) instead of the web client id.
- Settings → About reads the version from `expo-constants` instead of a hard-coded string.

### Changed
- Expo SDK 54 dependencies aligned with `expo install --fix` (expo 54.0.37, expo-auth-session, expo-constants, expo-crypto, expo-dev-client, expo-font, expo-localization, expo-web-browser, jest-expo); added the `expo-localization` and `expo-web-browser` config plugins.
- `@react-native-community/cli` pinned instead of `latest`; `engines.node >= 20.19`; `.nvmrc` = 22.
- `CLAUDE.md` describes the actual sync triggers (sign-in and "Sync Now" only) and the testing commands; `README.md` prerequisites updated.

### Added
- **Firebase Emulator Suite support**: `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` wires the app to local Auth/Firestore emulators (forced `demo-generatortracker` project, host auto-detected for devices), with `firebase.json`, reference `firestore.rules` and `firestore.indexes.json`, an "Firebase Emulator" indicator in Settings, and `npm run emulators` / `start:emu` / `web:emu` scripts.
- **Unit tests** for `storage`, `syncQueue`, `calculations`, `analytics` and the `sync` service (Firestore mocked): 64 tests in total.
- **Web e2e** (`e2e/core-flows.spec.ts`): generator CRUD, start/stop session, refill → analytics, language switch persistence, seeded history/analytics; shared helpers in `e2e/helpers.ts`.
- **Cloud-sync e2e** (`e2e/sync-emulator.spec.ts`, `npm run test:e2e:emu`): sign-up, push via "Sync Now" and realtime pull verified against the emulators.
- `testID`s on key UI elements and stable bottom-tab ids (`tab-home`, `tab-analytics`, `tab-settings`).
- GitHub Actions `ci.yml` (typecheck + unit + emulator e2e on every push/PR) and a husky pre-commit hook (`npm run typecheck && npm test`).
- `docs/TESTING.md` (test environment guide) and `docs/STABILIZATION_PLAN.md` (audit findings S-1…S-27 with proposed fixes and order of work).

## [2.4.0] - 2026-06-29

### Added
- **Maintenance / Service Tracking** — Define recurring service tasks per generator (e.g. oil change every 250 engine hours, seasonal check every 180 days). Each task tracks its own interval by engine hours, by calendar days, or both.
- **Due Status & Reminders (in-app)** — Every task shows an at-a-glance status: OK / Due soon / Due now, with the remaining engine hours and days. The worst axis wins when both intervals are set.
- **Maintenance tab** on the Generator Detail screen, with a per-task "Mark serviced" action that resets the counters to the current engine hours and today's date.
- **Maintenance badges** — The Home generator cards and the Detail stats card surface a coloured badge when a generator has tasks due soon or overdue.

### Technical
- New `MaintenanceTask` entity wired through the offline-first stack: storage (with cascade delete), Firestore `maintenanceTasks` subcollection, and bidirectional sync (push/pull/realtime, last-write-wins).
- New maintenance status logic (`calculateMaintenanceStatus`, `getGeneratorMaintenanceSummary`, `markTaskServiced`) covered by unit tests (TDD).
- Introduced a test toolchain: Jest (jest-expo) unit tests and Playwright web e2e for the maintenance flow.
- Full English + Ukrainian localization for the maintenance feature.

## [2.3.1] - 2026-02-19

### Fixed
- Add 10 missing i18n translation keys (sync status and auth error messages) that caused raw key strings to display to users.
- Internationalize hardcoded "Generator Tracker" app name in Settings screen.

### Removed
- Delete unused components: `AnimatedCard`, `SignInButton`, and old `colors.ts` theme constants.
- Remove unused `getWeekLabel()` helper from analytics utilities.
- Remove unused `LineChart` import from AnalyticsScreen.
- Remove unused `Generator` import from navigation types.

### Changed
- Replace deprecated `String.substr()` with `String.substring()` in ID generation.
- Remove redundant field re-declarations from `Generator`, `WorkSession`, and `Refill` interfaces (already inherited from `SyncMetadata`).

## [2.3.0] - 2026-02-18

### Added
- **Generator Filter on Analytics** — Horizontal chip bar to filter charts and stats by a specific generator or view all combined.

### Changed
- Overview stats (total hours, fuel, avg hours) now reflect the selected generator filter.
- "Generator Comparison" and "Fuel Distribution" charts are hidden when a single generator is selected.

## [2.2.0] - 2026-02-06

### Added
- **Multi-language Support** — Full app localization in English and Ukrainian.
- **Language Switcher** — New language selection section in Settings with persistence.
- **Native Date & Time Pickers** — Replaced manual text inputs with native system pickers for a smoother user experience.

### Changed
- **Localized Formatting** — Date and time displays now automatically adapt to the user's selected language and locale.
- **Improved Forms** — Add Generator, Add Work Session, and Add Refill screens now use calendar and clock pickers.
- **Real-time Duration Tracking** — Refined duration calculation in work sessions when picking times.

### Technical
- Integrated `i18next` and `react-i18next` for translation management.
- Integrated `@react-native-community/datetimepicker` for native platform pickers.
- Updated `storage.ts` to persist language preferences across sessions.

## [2.1.1] - 2026-02-06

### Changed
- Updated app icon with a completely modernized, energy-themed design featuring high contrast and contemporary aesthetics
- Enabled EAS autoIncrement for Android builds, streamlining version management
- Removed custom version increment script and pre-commit hook in favor of EAS-managed build numbers

### Technical
- Simplified build process by leveraging EAS Build's automatic version code management
- Removed `scripts/increment-build.sh` and related Husky pre-commit hook
- Updated `app.json` to use EAS Build autoIncrement feature

## [2.0.3] - 2026-02-06

### Changed
- Updated app icon to a new modern, high-contrast design
- Improved FAB position on HomeScreen to avoid overlapping with bottom tab bar on small screens

## [2.0.2] - 2026-02-06

### Fixed
- Bumped dependencies via `npm audit fix` / `package-lock.json` updates
- Standardized release process (build number increments)

## [2.0.1] - 2026-02-06

### Fixed
- Fix bottom tab bar blur tint in light mode — BlurView now adapts to system color scheme (`dark`/`light`) instead of being hardcoded to dark

## [2.0.0] - 2026-02-06

### Added
- **React Native Paper v5 (Material Design 3)** — Complete UI library migration
- **Theme System** — Centralized MD3 dark/light themes (`src/theme/index.ts`, `src/theme/useAppTheme.ts`)
- **Animations** — Spring-based entrance animations via React Native Reanimated v4 (staggered FadeInUp, ZoomIn, FadeIn)
- **Haptic Feedback** — Tactile feedback via Expo Haptics on key interactions (start/stop session, save, delete, FAB press)
- **Charts & Data Visualization** — Analytics charts via React Native Gifted Charts (BarChart, PieChart donut)
- **Analytics Utilities** (`src/utils/analytics.ts`) — Data aggregation for hours over time, fuel over time, generator comparison, fuel distribution
- **Glassmorphism Effects** — Frosted glass bottom tab bar via Expo Blur (BlurView)
- **New Components:**
  - `StatBlock` — Reusable icon + value + label stat display
  - `GradientCard` — LinearGradient card wrapper for active sessions
  - `AnimatedCard` — Paper Card with entrance animation
  - `DeleteConfirmDialog` — Paper Dialog for delete confirmations (replaces Alert.alert)
  - `PaperBottomTabBar` — Custom tab bar with BlurView + Paper BottomNavigation.Bar

### Changed
- **COMPLETE UI REWRITE** — Every screen and component rebuilt with React Native Paper
- **HomeScreen** — Paper Appbar, Card elevated with Avatar.Icon, StatBlock row, Chip for last activity, animated FAB
- **GeneratorDetailScreen** — GradientCard for active sessions, Surface stat cards, Paper Dialog for delete
- **AnalyticsScreen** — SegmentedButtons (Overview/Charts), 2x2 stat grid, BarChart/PieChart with animations
- **SettingsScreen** — Paper List sections, Surface cards, Avatar.Text for user, Badge for sync count
- **AddGeneratorScreen** — Paper TextInput outlined with icons, HelperText validation, Appbar with close/check
- **AddWorkSessionScreen** — Paper Banner for active sessions, TextInput with clock icons, Surface duration display
- **AddRefillScreen** — TextInput with fuel icon and Affix suffix, Paper form patterns
- **WorkSessionsList** — Paper Card outlined items, contained-tonal add button
- **RefillsList** — Paper Card outlined items, contained-tonal add button
- **SyncStatusIndicator** — Paper Text + Badge, internal theme access
- **EmailAuthForm** — Paper TextInput outlined with password visibility toggle
- **SignInButton** — Thin Paper Button wrapper
- **Bottom Tab Bar** — Now floating with blur effect, absolute positioning
- **Navigation** — MaterialCommunityIcons replace Ionicons, adaptNavigationTheme unifies themes
- **DESIGN_GUIDE.md** — Complete rewrite for Paper/MD3 component system (v2.0.0)

### Removed
- Direct dependency on `colors` prop pattern — all components now use `useAppTheme()` internally
- `Alert.alert` for delete confirmations — replaced by `DeleteConfirmDialog`
- Ionicons — replaced by MaterialCommunityIcons

### Technical
- New dependencies: react-native-paper, react-native-reanimated, expo-haptics, expo-blur, expo-linear-gradient, react-native-gifted-charts, react-native-svg
- PaperProvider wraps entire app with MD3 theme
- adaptNavigationTheme unifies Paper + React Navigation themes
- No changes to data models, storage, sync, or navigation structure

## [1.6.2] - 2026-01-25

### Added
- Google Play Store descriptions directory (`description/`)
- English app store description (`description/en.md`)
- Ukrainian app store description (`description/uk.md`)
- Description README with guidelines (`description/README.md`)
- Standard workflow rule: Update store descriptions when functional changes occur

### Changed
- Update CLAUDE.md workflow: Add step 5 for Play Store description updates (6 steps → 7 steps)
- Update .github/copilot-instructions.md workflow: Add step 5 for description updates
- Update README.md: Add App Store Descriptions section
- Workflow now includes description updates for MINOR/MAJOR versions with new features

### Documentation
- Created comprehensive Play Store listing content in English and Ukrainian
- Short description (80 chars): "Track generator hours, fuel refills, and analyze performance efficiently"
- Full description with key features, use cases, and technical details
- Guidelines for when to update descriptions (new features yes, bug fixes no)
- Instructions for adding new language translations

## [1.6.1] - 2026-01-25

### Fixed
- Fix number formatting for hours display across all screens
- Work session hours now display with 1 decimal place (e.g., "8.0h" instead of "7.98333333333333h")
- Total hours on Generator Detail screen formatted to 1 decimal place
- Total hours on Home screen cards formatted to 1 decimal place
- Analytics screen stats formatted to 1 decimal place
- Average fuel consumption formatted to 2 decimal places (e.g., "0.03 L/hour")

### Changed
- WorkSessionsList: Apply toFixed(1) to hours display
- GeneratorDetailScreen: Apply toFixed(1) to total hours, toFixed(2) to average fuel
- HomeScreen: Apply toFixed(1) to total hours
- AnalyticsScreen: Apply toFixed(1) to all numeric stats

## [1.6.0] - 2026-01-25

### Changed
**COMPLETE VISUAL REDESIGN** - Applied DESIGN_GUIDE.md specifications across entire app

#### Color Palette (src/constants/colors.ts)
- **Primary Color**: Changed from Blue (#0a7ea4) → Orange (#FF6B35) for energy theme
- Added primaryLight (#FF8C42) and primaryDark (#F77F00) variants
- **Secondary Color**: Blue (#0a7ea4) retained for time-related features
- Added secondaryLight (#06BEE1) and secondaryDark (#0077B6) variants
- Added warning color (#F59E0B)
- Updated notification color to orange (#FF6B35)
- All CTAs now use energetic orange
- All time-related stats use technology blue

#### Typography
- Updated all headings to fontWeight '600' (Semi-Bold)
- Updated all stat numbers to fontWeight '700' (Bold)
- Increased consistency across heading sizes (H2: 24px, H3: 20px)

#### Spacing & Layout (8px Grid System)
- Card padding: 16px → 20-24px
- Card margins: 12px → 16px
- Button padding: Standardized to 16px vertical, 24px horizontal
- All spacing now uses 8px multiples (8, 16, 24, 32)

#### Border Radius (Increased for Modern Look)
- Cards: 12px → 16px
- Buttons: 8px → 12px
- Form inputs: 8px → 12px
- FAB button: Increased to 32px

#### Screens Redesigned
- **HomeScreen**: Enhanced generator cards, larger FAB, bold typography
- **AnalyticsScreen**: Smart color coding (orange for energy stats, blue for time stats)
- **SettingsScreen**: Updated all buttons and cards with new styling
- **GeneratorDetailScreen**: Enhanced stat cards, updated action buttons
- **AddGeneratorScreen**: Modernized form inputs
- **AddWorkSessionScreen**: Updated info cards, hours display, form inputs
- **AddRefillScreen**: Modernized form inputs and delete button

#### Components Redesigned
- **WorkSessionsList**: Enhanced list items, modernized add button with shadow
- **RefillsList**: Enhanced list items, modernized add button with shadow
- **EmailAuthForm**: Updated form inputs and submit button
- **SignInButton**: Updated button styling

#### Visual Enhancements
- Added shadows to primary action buttons for depth
- Increased font weights for better hierarchy
- Improved touch targets (FAB: 56px → 64px)
- Enhanced visual consistency across all screens

### Technical
- No functional changes - pure visual redesign
- No breaking changes to APIs or data structures
- Maintains backward compatibility

## [1.5.1] - 2026-01-25

### Fixed
- Fix missing "Add" button after adding first item in Work Sessions and Refills tabs
- Move "+ Add Work Session" button from ListEmptyComponent to ListHeaderComponent in WorkSessionsList
- Move "+ Add Refill" button from ListEmptyComponent to ListHeaderComponent in RefillsList
- Add button now always visible at the top of the list, regardless of content

## [1.5.0] - 2026-01-25

### Added
- DESIGN_GUIDE.md - Comprehensive visual design system documentation
  - Color palette (Orange primary #FF6B35, Blue secondary #0a7ea4, Dark Mode)
  - Typography hierarchy (H1, H2, H3, Body, Labels)
  - Component patterns (buttons, cards, navigation)
  - Layout principles (Z-pattern, spacing system)
  - Graphic elements (wave gradients, circuit pattern texture)
  - Accessibility guidelines
  - Platform-specific considerations
- Design System section in CLAUDE.md with mandatory UI guidelines
- Design System reference in .github/copilot-instructions.md
- Design System section in README.md
- Updated app icons (adaptive-icon.png, icon.png, favicon.png, splash-icon.png)

### Changed
- Makefile: Add `docker compose up -d` to build commands for automatic container startup
- All future UI changes must follow DESIGN_GUIDE.md specifications
- Establish orange as primary accent for CTAs and energy features
- Establish blue as secondary accent for time and informational features

## [1.4.1] - 2026-01-25

### Fixed
- Fix white background in dark mode for tab content in Generator Detail screen
- Add theme-aware background color to WorkSessionsList component
- Add theme-aware background color to RefillsList component
- Tab lists now properly use `colors.background` for dark mode compatibility

## [1.4.0] - 2026-01-25

### Added
- CHANGELOG.md file for tracking version history
- Standard workflow step for updating CHANGELOG.md on every version change
- Documentation in CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/) format

### Changed
- Update standard change workflow in CLAUDE.md (5 steps → 6 steps)
- Update standard change workflow in .github/copilot-instructions.md
- Workflow now requires CHANGELOG.md update before commit
- Example workflow includes CHANGELOG.md update step

## [1.3.3] - 2026-01-25

### Fixed
- Fix text color visibility in dark mode on Settings screen
- Replace undefined `colors.tabIconDefault` with `colors.textMuted`
- Affected elements: sign-in prompt, user display name, sync status labels, app name in About section

## [1.3.2] - 2026-01-25

### Fixed
- Standardize header title font size across all tab screens (Settings: 32 → 24)
- Home, Analytics, and Settings screens now have consistent header styling

## [1.3.1] - 2026-01-25

### Added
- Create comprehensive CLAUDE.md documentation file
  - Architecture overview (offline-first data flow)
  - Essential commands (dev, build, versioning)
  - Critical conventions (theming, date/time, active sessions)
  - Common development patterns
  - Standard change workflow (5-step process)
- Add standard change workflow to .github/copilot-instructions.md

### Changed
- Establish standard workflow: make changes → discover/validate → bump version → describe changelog → commit

## [1.3.0] - 2026-01-25

### Added
- Tab navigation to Generator Detail screen
- WorkSessionsList component for sessions list view
- RefillsList component for refills list view
- Material Top Tabs dependencies (`@react-navigation/material-top-tabs`, `react-native-tab-view`, `react-native-pager-view`)

### Changed
- Replace SectionList with Tab.Navigator in GeneratorDetailScreen
- Separate Work Sessions and Refills into individual tabs
- Add pull-to-refresh, empty states, and item counts in tab labels

### Removed
- Unused styles from GeneratorDetailScreen

## [1.2.2] - 2026-01-25

### Added
- Email/Password authentication UI to Settings screen
- EmailAuthForm component with Sign In/Sign Up modes
- Form validation (email format, password length)
- Loading states and error handling during authentication

### Changed
- Update version display in Settings screen
- Add visual divider between email and OAuth options
- Email auth works on all platforms (web, iOS, Android)

## [1.2.1] - 2026-01-25

### Added
- Semantic versioning automation system
- `scripts/bump-version.sh` - Automated version bumping script
  - Supports major, minor, and patch version increments
  - Auto-increments iOS buildNumber and Android versionCode
  - Updates both app.json and package.json
- VERSIONING.md - Comprehensive versioning guide
  - Semantic versioning rules and examples
  - Workflow documentation
  - Version history tracking

### Changed
- Makefile: Add version-major, version-minor, version-patch commands
- Makefile: Improve help text organization
- README.md: Add Development section with build and versioning commands

## [1.2.0] - 2026-01-25

### Added
- Gitingest digest generation support
- `make digest` command to Makefile
- Comprehensive AI coding assistant documentation

### Changed
- Improve build organization with separate preview/production directories
- Build outputs automatically moved to organized directories

## [1.1.0] - 2026-01-21

### Added
- EAS Build configuration (eas.json)
- Deep linking scheme configuration
- expo-font dependency
- Docker build environment setup
- Makefile with build commands
  - `make build-preview` - Local Android APK via Docker
  - `make build-prod` - Local Android production bundle via Docker
  - `make eas-build-preview` - Remote preview build
  - `make eas-build-prod` - Remote production build
- BUILD.md - Comprehensive build instructions
- credentials.json.example - Template for local credentials

### Changed
- Replace emojis with professional vector icons (Ionicons)
- Add edit/delete functionality for all entities
- Fix web delete confirmation dialogs
- Update Docker configuration for Expo SDK 54
  - Android SDK platform 36 and build-tools 36.0.0
  - NDK 27.1.12297006
  - Memory optimizations (16g limit, 6 CPU cores)
- Hide Google auth and anonymous auth on Android
- Add Settings screen header

### Fixed
- Firebase Auth for web and native platforms
- Firebase Auth persistence and Google OAuth configuration
- eas.json validation errors
- Android build out-of-memory errors

## [1.0.0] - 2026-01-19

### Added
- Initial release
- Offline-first generator tracking with AsyncStorage
- Firebase authentication and sync
  - Google Sign-In
  - Anonymous authentication
  - Automatic sync queue
  - Conflict resolution (last-write-wins)
- Track multiple generators
- Quick Start/Stop buttons for active work sessions
- Log work sessions with start/end times
- Real-time tracking of active sessions
- Record fuel refills
- View analytics and statistics
- Dark mode support
- Bottom tab navigation (Home, Analytics, Settings)
- Work sessions and refills management
- Generator statistics calculation
- Automatic hours calculation
- Data persistence across app sessions

### Technical
- React Native with Expo SDK 54
- TypeScript
- React Navigation (Bottom Tabs + Stack)
- Firebase (Auth + Firestore)
- AsyncStorage for offline-first architecture
- SyncQueue for background synchronization
