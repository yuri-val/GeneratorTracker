# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native/Expo mobile app (Expo SDK 57, React Native 0.86, React 19.2) for tracking generator operating hours and fuel refills. Uses Firebase for authentication/sync with an **offline-first architecture** where local AsyncStorage is the source of truth.

## Essential Commands

### Development
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run web version
```

### Building
```bash
make build-preview     # Local Android APK build via Docker
make build-prod        # Local Android production AAB via Docker
make eas-build-preview # Remote preview build on EAS
make eas-build-prod    # Remote production build on EAS
```

### Versioning (Semantic Versioning)
```bash
make version-patch     # Bug fixes (x.y.Z)
make version-minor     # New features (x.Y.0)
make version-major     # Breaking changes (X.0.0)
```

**IMPORTANT**: Always use these make commands to bump versions. Never manually edit version numbers in `app.json` or `package.json`. The script automatically increments iOS buildNumber and Android versionCode.

### Utilities
```bash
make digest           # Generate project digest using gitingest
make help             # Show all available commands
```

### Testing (see `docs/TESTING.md`)
```bash
npm run typecheck      # tsc --noEmit
npm test               # Jest unit tests (src/**/__tests__)
npm run check          # typecheck + unit (same as the pre-commit hook)
npm run test:e2e       # Playwright against the Expo web build (offline flows)
npm run test:e2e:emu   # Playwright + Firebase Auth/Firestore emulators (cloud sync flows)
npm run test:rules     # Firestore security rules tests (emulator)
npm run test:native:ios      # Maestro native UI flows on an iOS simulator (app open on Home)
npm run test:native:android  # Maestro native UI flows on an Android emulator
npm run emulators      # Firebase emulators for manual testing (UI at :4000)
npm run start:emu      # Expo dev server wired to the emulators (never touches prod data)
```
Use Node 22 (`.nvmrc`). The project `.npmrc` forces `legacy-peer-deps=false` so the lockfile matches what `npm ci`
expects on CI/EAS — never regenerate it with legacy peer resolution. `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` forces the `demo-generatortracker`
project, so emulator mode cannot reach production.

## Current Phase: Stabilization

The app is live on Google Play. The current goal is to **stabilize existing functionality — no new
features**. The audit, prioritized backlog (`S-1` … `S-27`) and proposed order of work live in
`docs/STABILIZATION_PLAN.md`; update that file when an item is fixed.

## Architecture

### Offline-First Data Flow (CRITICAL)

This is the most important architectural pattern in the app:

1. **Local-first**: ALL data operations go through `src/utils/storage.ts` → AsyncStorage
   - AsyncStorage is the source of truth, not Firebase
   - UI always reads from and writes to local storage first

2. **State-based change tracking** (since 2.4.2 — there is no sync queue any more):
   - Every local create/update is stored with `syncStatus: 'pending'` and a fresh, monotonic
     `lastModified` (set by storage, not by the caller). Cloud metadata (`syncedAt`, `userId`) is kept.
   - Every local delete records a **tombstone** (`@sync_tombstones`) — signed in or not — so the
     deletion reaches the cloud later and a pull can never resurrect the record. Deleting a generator
     cascades locally and records one tombstone.
   - All storage writes are serialized by one FIFO mutex (`updateLocalData`); never write AsyncStorage
     keys directly.
   - Old installs' `@sync_queue` is migrated automatically (deletes → tombstones, updates → pending).

3. **Sync** (`src/services/sync.ts`): `performFullSync` = push then pull, never two at once
   - Push: tombstones → cloud deletes (a generator with all its subcollections), then pending generators,
     then pending children of generators that made it to the cloud. Successes are marked synced only if
     the record was not edited meanwhile. Failures stay pending and are retried by the next sync.
   - Pull: complete snapshot via `getDocsFromServer` (children before generators), merged by the pure
     `applyRemoteChanges` in `src/services/syncMerge.ts`.
   - Realtime `onSnapshot` listeners apply added/modified/removed changes; the first *server* snapshot of
     each listener reconciles deletions made while offline; cache-only snapshots never prune.
   - Triggered on sign-in (`performInitialSync`) and by "Sync Now" (`performManualSync`). There is **no**
     periodic/foreground/network-reconnect trigger yet (`docs/STABILIZATION_PLAN.md` S-5).
   - Network calls time out after 30 s (`withTimeout` in `firestore.ts`).

4. **Conflict resolution** (`syncMerge.ts`): last write wins on the client ISO `lastModified`
   - Firestore stores the client `lastModified` unchanged (server time goes to `serverUpdatedAt`);
     documents are written with a full `set` so cleared fields propagate.
   - Equal timestamps = the remote copy is this version → synced.
   - A local tombstone wins; a remote deletion wins. Absence from a snapshot only deletes records known to
     be in this account's cloud (`userId === uid` and synced before the snapshot).
   - Remote children without an existing generator (orphans) are never stored.

### Data Models Layer

All synced entities in `src/models/types.ts` extend `SyncMetadata`:
```typescript
interface SyncMetadata {
  lastModified: string;      // ISO 8601 datetime for conflict resolution
  syncStatus: 'synced' | 'pending' | 'error';
  syncedAt?: string;         // Last successful sync timestamp
  userId?: string;           // Firebase UID of owner
}
```

Core entities:
- **Generator**: Main tracked equipment
- **WorkSession**: Time tracking records (can be "active" with `isActive: true`)
- **Refill**: Fuel refill records

### Firestore Structure
```
users/{userId}/
  └── generators/{generatorId}
      ├── workSessions/{sessionId}
      └── refills/{refillId}
```

All data is scoped to the authenticated user.

### Navigation Structure

- **RootStackParamList** (Stack Navigator):
  - MainTabs → GeneratorDetail → Add* screens (modal presentation)

- **TabParamList** (Bottom Tabs):
  - Home, Analytics, Settings

Navigation types are defined in `src/navigation/types.ts` - **always update this file when adding new screens**.

## Design System

### Visual Design Guide
**IMPORTANT:** All UI changes MUST follow the comprehensive design guide in `DESIGN_GUIDE.md`.

Key design principles:
- **Philosophy:** Modern, Reliable, Technological, Dynamic, Energetic
- **Primary Accent:** Orange (`#FF6B35`) for CTAs and energy-related features
- **Secondary Accent:** Blue (`#0a7ea4`) for time-related and informational features
- **Typography:** Bold sans-serif (Montserrat, Poppins, Inter, or system fonts)
- **Layout:** Z-pattern reading flow, card-based design
- **Dark Mode First:** Dark backgrounds with bright accents

**Platform-native UI (since 2.5.0):** iOS uses native chrome (native tabs/bars with Liquid Glass, SF Symbols,
SwiftUI forms via `@expo/ui`), Android uses Material 3 (Paper + native Material tabs), web keeps Paper. Build screens
with `ScreenHeader`, `AppIcon`/`ICONS`, `NativeForm` (iOS forms), `surfaces()`/`textColors()` and `contentColumn`
— see "Platform-Native Design" in `DESIGN_GUIDE.md` for the rules.

**3.0 design (since 3.0.0) — overrides the colours/typography of `DESIGN_GUIDE.md`:** the source of truth is the
handoff in `docs/design/redesign-3.0/` (README = spec, `Generator Tracker 3.0.dc.html` = mocks) and
`docs/REDESIGN_3.0.md` (plan and decisions). In code:
- Tokens in `src/theme/tokens.ts` (light 5a / dark 5d), resolved per scheme on `useAppTheme().gt`; Paper themes use
  ink as primary and `roundness: 0`. IBM Plex Sans for labels, IBM Plex Mono for digits only (`src/theme/fonts.ts`).
- UI kit `src/components/gt`: `GtText`/`Num`, `SquareButton` (red = Stop/destructive only), `AccentRule`
  (generator colour), app-wide `SnackbarProvider` (`useSnackbar`, `useSnackbarBottomOffset`).
- Data for Home/detail/live bar: `useFleet` + `buildFleet` (`src/hooks/useFleet.ts`); start/stop/undo/refill go through
  `src/services/sessions.ts` (emits `onSessionsChanged`) and `useSessionActions` (Stop: no confirm, 5 s Undo).
- Fuel estimate `src/utils/fuel.ts`, formatting `src/utils/format.ts` (Intl, NBSP), maintenance texts/bars
  `src/utils/maintenanceView.ts`; timers via `useNow` (60 s Home/live bar, 1 s detail clock).
- Native chrome stays native; nested pressables are avoided (web renders nested `<button>`s).

**Before implementing any UI change:**
1. Read `DESIGN_GUIDE.md` for complete style specifications
2. Use defined color palette from the guide
3. Follow typography hierarchy (H1, H2, Body, Labels)
4. Apply spacing system (8px base unit)
5. Use circuit pattern texture for empty states
6. Maintain card design principles (12-16px radius, proper shadows)

## Critical Conventions

### Theming
Always use the theme system from `src/constants/colors.ts`:
```typescript
const colorScheme = useColorScheme();
const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
```

Use color properties: `primary`, `background`, `surface`, `text`, `textMuted`, `border`, `success`, `error`, `card`, `notification`.

### Date/Time Formats (STRICT)
- **Dates**: ISO 8601 date format (`YYYY-MM-DD`)
- **Times**: ISO 8601 time format (`HH:mm`)
- **Timestamps**: Full ISO 8601 datetime (`createdAt`, `lastModified`)

### ID Generation
Use `generateId()` from `src/utils/calculations.ts`:
```typescript
generateId() // Returns: ${Date.now()}-${random}
```

### Active Work Sessions Pattern

Work sessions can be "active" (currently running):
- Set `isActive: true` and leave `endTime: undefined`
- Display real-time elapsed hours (see `GeneratorDetailScreen.tsx`)
- Use `calculateActiveSessionHours()` from `src/utils/calculations.ts`
- Update UI every minute with `setInterval`

Example flow:
1. User taps "START SESSION" → create session with `isActive: true`, `hours: 0`
2. Display green card with elapsed time updating every minute
3. User taps "STOP" → set `endTime`, calculate final hours, set `isActive: false`

## Common Development Patterns

### Adding a New Entity Type

1. **Model** (`src/models/types.ts`):
   ```typescript
   export interface NewEntity extends SyncMetadata {
     id: string;
     generatorId: string;
     // ... fields
     createdAt: string;
     lastModified: string;
     syncStatus: 'synced' | 'pending' | 'error';
     syncedAt?: string;
     userId?: string;
   }
   ```

2. **Storage** (`src/utils/storage.ts`):
   - Add CRUD functions: `getNewEntities()`, `saveNewEntity()`, `deleteNewEntity()`
   - Add the key to `STORAGE_KEYS`/`COLLECTION_FIELD` and go through `saveEntity`/`deleteEntity`
     (pending status, monotonic `lastModified` and tombstones are handled there)

3. **Firestore** (`src/services/firestore.ts`):
   - Add the subcollection to `CHILD_COLLECTIONS`/`CHILD_TYPES` (fetch, write, cascade delete follow)
   - Add a rule block to `firestore.rules` and a case to `rules-tests/firestore.rules.test.ts`

4. **Sync** (`src/services/sync.ts`, `src/services/syncMerge.ts`):
   - Add the entity to `LocalData`, the pull change sets and a realtime listener
   - Extend `sync.test.ts` / `syncMerge.test.ts`

### Adding a New Screen

1. **Create screen**: `src/screens/{category}/{Name}Screen.tsx`

2. **Update navigation types** (`src/navigation/types.ts`):
   ```typescript
   export type RootStackParamList = {
     // ... existing routes
     NewScreen: { param1: string; param2?: number };
   };
   ```

3. **Register in App.tsx**:
   ```typescript
   <Stack.Screen name="NewScreen" component={NewScreenComponent} />
   ```

### Creating Reusable Components

Place in `src/components/` following existing patterns:
- **gt/**: the 3.0 UI kit (text, square buttons, snackbar)
- **fleet/**: Home rows/cards (`FleetRows`), `LiveBar`, `TabLiveBar`
- **EmailAuthForm.tsx**: Form with validation
- **SyncStatusIndicator.tsx**: Status display

Use props pattern with theme colors passed down:
```typescript
interface ComponentProps {
  colors: typeof Colors.light;
  // ... other props
}
```

### Tabs inside a screen

Since 3.0 the generator screen uses plain text tabs (a `Pressable` row with counts and a 2 px underline, one
`FlatList` below) on every platform — there is no Material top-tab navigator any more.

## Authentication & Sync

### Firebase Configuration
- Config loaded from environment variables: `EXPO_PUBLIC_FIREBASE_*` in `.env`
- Handled in `src/config/firebase.ts`

### Auth Flow
- Authentication managed in `src/services/auth.ts`
- Supports Google Sign-In and Email/Password
- Auth state triggers automatic sync

### Sync Behavior
- Initial sync on authentication (push all local data, pull remote, start realtime listeners)
- Realtime pull via Firestore listeners while signed in
- Manual push+pull via "Sync Now" in Settings (pull-to-refresh only reloads local storage)
- Sync status visible via `SyncStatusIndicator` component
- Local testing: Firebase Emulator Suite (`npm run emulators` + `npm run start:emu`)

## Version Management

**Critical**: This project follows Semantic Versioning 2.0.0. See `VERSIONING.md` for detailed guidelines.

### When to Bump Version
- **PATCH** (bug fixes): UI tweaks, bug fixes, small improvements, dependency updates
- **MINOR** (new features): New screens, new entity types, new auth methods, tab navigation
- **MAJOR** (breaking): Database schema changes, Firebase structure changes, breaking API changes

### Standard Change Workflow

Follow this workflow for ALL changes to the project:

1. **Make Changes**
   - Implement what the task requests
   - Follow all conventions and patterns documented above
   - Ensure code compiles and runs without errors

2. **Discover and Validate Changes**
   - Run `git status` to see all modified/new files
   - Review the changes with `git diff` for modified files
   - Run `npm run check` (typecheck + unit tests) and `npm run test:e2e` (web e2e); for sync changes also `npm run test:e2e:emu`, for rules changes `npm run test:rules`
   - Test the changes in the development environment (`npm start`)
   - Verify no regressions or breaking changes
   - Check that the app builds successfully

3. **Bump Semantic Version**
   - Determine version type based on changes:
     - **PATCH** for bug fixes and small improvements
     - **MINOR** for new features
     - **MAJOR** for breaking changes
   - Run: `make version-{patch|minor|major}`
   - The Settings screen reads the version from `expo-constants` (`app.json`), no manual update needed

4. **Update CHANGELOG.md**
   - Add new version section at the top (after "## [Unreleased]" if it exists)
   - Use format: `## [X.Y.Z] - YYYY-MM-DD`
   - Categorize changes:
     - **Added** for new features
     - **Changed** for changes in existing functionality
     - **Deprecated** for soon-to-be removed features
     - **Removed** for now removed features
     - **Fixed** for any bug fixes
     - **Security** for vulnerability fixes
   - Be specific and clear about what changed
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

5. **Update Play Store Descriptions (if functional changes)**
   - **IMPORTANT**: If changes affect app functionality or add/remove features, update store descriptions
   - Update `description/en.md` (English)
   - Update `description/uk.md` (Ukrainian)
   - Key sections to update:
     - "What's New" section with new version highlights
     - "Key Features" if new features added
     - Screenshots references if UI changed significantly
   - When to update:
     - ✅ New features (MINOR version)
     - ✅ Major redesigns (MINOR/MAJOR version)
     - ✅ Removed features (MAJOR version)
     - ✅ Significant UX improvements
     - ❌ Bug fixes without visible changes (PATCH version)
     - ❌ Code refactoring without user impact

6. **Create Release Notes**
   - **IMPORTANT**: Create release notes for MINOR/MAJOR versions and significant PATCH versions
   - Create directory: `release_notes/{version}/`
   - Create `release_notes/{version}/en.md` (English)
   - Create `release_notes/{version}/uk.md` (Ukrainian)
   - Structure each release note with:
     - Version header with release date
     - Brief overview of changes
     - "What's New" section with key features
     - "Fixed" section for bug fixes (if applicable)
     - "Technical" section for technical improvements (optional)
   - Keep concise and user-focused (100-300 words optimal)
   - When to create:
     - ✅ All MINOR versions (new features)
     - ✅ All MAJOR versions (breaking changes)
     - ✅ PATCH versions with significant bug fixes
     - ❌ Minor PATCH versions with internal changes only
   - See `release_notes/README.md` for detailed guidelines

7. **Write Commit Message**
   - Create clear, descriptive commit message
   - Include "what" and "why" of the changes
   - List key modifications and new files
   - Format:
     ```
     Version X.Y.Z: Brief summary of changes

     Detailed description of what changed and why:
     - Specific change 1
     - Specific change 2
     - New files created: path/to/file.ts

     ```

8. **Commit Changes**
   - Stage all relevant files: `git add [files]` (include CHANGELOG.md, description/*.md, and release_notes/ if created!)
   - Commit with the prepared message
   - Verify commit with `git log -1`
   - Push if appropriate: `git push`

**Example Complete Workflow:**
```bash
# 1. Changes made (coding work)

# 2. Discover and validate
git status
git diff
npm start  # Test the app

# 3. Bump version
make version-minor

# 4. Update CHANGELOG.md
# Add new section:
## [1.3.0] - 2026-01-25
### Added
- Tab navigation to Generator Detail screen
- WorkSessionsList and RefillsList components
### Changed
- Replace SectionList with Tab.Navigator

# 5. Update Play Store descriptions (for new features)
# Edit description/en.md and description/uk.md:
# - Add tab navigation to "What's New"
# - Update "Key Features" if needed

# 6 & 7. Commit with changelog
git add app.json package.json CHANGELOG.md description/*.md [other files]
git commit -m "Version 1.3.0: Add tab navigation to Generator Detail screen

Separate Work Sessions and Refills into individual tabs using Material Top Tabs.

Changes:
- Create WorkSessionsList and RefillsList components
- Replace SectionList with Tab.Navigator in GeneratorDetailScreen
- Add Material Top Tabs dependencies
- Remove unused styles and imports
- Update Play Store descriptions with new feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## File Organization

```
src/
├── components/       # Reusable UI components
├── constants/        # colors.ts - theme system
├── models/          # types.ts - TypeScript interfaces
├── navigation/      # types.ts - navigation type definitions
├── screens/         # Screen components organized by feature
│   ├── home/
│   ├── generator/
│   ├── analytics/
│   └── settings/
├── services/        # External services (Firebase, sync)
│   ├── auth.ts
│   ├── firestore.ts   # Firestore I/O (batches, cascade deletes, timeouts)
│   ├── sync.ts        # push/pull orchestration + realtime listeners
│   └── syncMerge.ts   # pure merge rules (last-write-wins, tombstones, orphans)
└── utils/           # Helper functions and storage
    ├── calculations.ts
    ├── storage.ts     # PRIMARY data access layer (+ tombstones, mutex)
    ├── mutex.ts       # FIFO async mutex
    └── syncMeta.ts    # timestamp normalization / comparison
```

## Key Files to Understand

1. **src/utils/storage.ts** - Main data access layer (read this first!)
2. **src/services/sync.ts** - Sync orchestration and conflict resolution
3. **src/models/types.ts** - All data models and interfaces
4. **src/screens/generator/GeneratorDetailScreen.tsx** - Complex screen example with tabs and active session pattern
5. **src/theme/tokens.ts** + **src/theme/index.ts** - Theme system (3.0 tokens → Paper themes)

## Environment Setup

Firebase configuration via `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```
