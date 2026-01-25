# Generator Tracker - AI Coding Instructions

## Project Overview
React Native/Expo mobile app for tracking generator operating hours and fuel refills. Uses Firebase for auth/sync and AsyncStorage for offline-first local persistence.

## Architecture

### Data Flow (Offline-First Pattern)
1. **Local-first**: All data operations go through `src/utils/storage.ts` → AsyncStorage
2. **Sync queue**: Changes queue in `src/utils/syncQueue.ts` when user is authenticated
3. **Background sync**: `src/services/sync.ts` pushes queued changes to Firestore
4. **Conflict resolution**: Last-write-wins using `lastModified` timestamp (see `resolveConflict` in sync.ts)

### Key Layers
- **Models** (`src/models/types.ts`): All entities extend `SyncMetadata` with `lastModified`, `syncStatus`, `syncedAt`, `userId`
- **Storage** (`src/utils/storage.ts`): CRUD operations that auto-queue for sync when user authenticated
- **Firestore** (`src/services/firestore.ts`): Firebase document operations
- **Sync** (`src/services/sync.ts`): Orchestrates local↔cloud synchronization

### Firestore Structure
```
users/{userId}/generators/{generatorId}
users/{userId}/generators/{generatorId}/workSessions/{sessionId}
users/{userId}/generators/{generatorId}/refills/{refillId}
```

## Navigation Structure
- **Bottom Tabs** (`TabParamList`): Home, Analytics, Settings
- **Stack Navigator** (`RootStackParamList`): MainTabs → GeneratorDetail → Add screens (modal presentation)
- Navigation types defined in `src/navigation/types.ts` - update when adding screens

## Design System

**CRITICAL:** All UI implementations MUST follow `DESIGN_GUIDE.md`.

Key principles:
- Orange (#FF6B35) = Primary actions, energy features
- Blue (#0a7ea4) = Secondary actions, time features
- Dark Mode first with bright accents
- Bold sans-serif typography
- 8px spacing grid system
- Card-based layout (12-16px radius)

Before UI work: Read `DESIGN_GUIDE.md` for complete specifications.

## Conventions

### Theming
Always use `Colors[colorScheme === 'dark' ? 'dark' : 'light']` from `src/constants/colors.ts`. Access via `useColorScheme()` hook.

### ID Generation
Use `generateId()` from `src/utils/calculations.ts` - returns `${Date.now()}-${random}` format.

### Date/Time Formats
- Dates: ISO 8601 date (`YYYY-MM-DD`)
- Times: ISO 8601 time (`HH:mm`)
- Timestamps: Full ISO 8601 datetime for `createdAt`, `lastModified`

### Active Sessions Pattern
Work sessions can be "active" (`isActive: true`, `endTime: undefined`). See `GeneratorDetailScreen.tsx` for start/stop logic and real-time elapsed time display.

### Screen File Organization
```
src/screens/{feature}/
  └── {Feature}Screen.tsx
```

## Build Commands
```bash
npm start              # Dev server (Expo Go)
make build-preview     # Local APK build via Docker
make build-prod        # Local production AAB
make eas-build-preview # Remote build on EAS
```

## Environment Variables
Firebase config via `EXPO_PUBLIC_FIREBASE_*` in `.env` (see `src/config/firebase.ts`).

## Common Patterns

### Adding New Entity Type
1. Add interface extending `SyncMetadata` in `src/models/types.ts`
2. Add CRUD functions in `src/utils/storage.ts` (follow existing pattern for sync queue integration)
3. Add Firestore operations in `src/services/firestore.ts`
4. Update sync service in `src/services/sync.ts`

### Adding New Screen
1. Create in `src/screens/{category}/{Name}Screen.tsx`
2. Add route to `RootStackParamList` or `TabParamList` in `src/navigation/types.ts`
3. Register in `App.tsx` Stack or Tab navigator

## Standard Change Workflow

**IMPORTANT**: Follow this workflow for ALL changes:

1. **Make Changes**
   - Implement the requested task
   - Follow all project conventions and patterns

2. **Discover and Validate**
   - `git status` - Review all changed files
   - `git diff` - Review actual changes
   - `npm start` - Test in dev environment
   - Verify no errors or regressions

3. **Bump Semantic Version**
   - PATCH: bug fixes, small improvements
   - MINOR: new features, new screens
   - MAJOR: breaking changes
   - Run: `make version-{patch|minor|major}`
   - Update: `src/screens/settings/SettingsScreen.tsx` version display

4. **Update CHANGELOG.md**
   - Add new version section: `## [X.Y.Z] - YYYY-MM-DD`
   - Categorize: Added, Changed, Fixed, Removed, etc.
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

5. **Write Commit Message**
   - Clear message with what/why
   - Include detailed list of changes
   - Format: "Version X.Y.Z: Brief summary\n\nDetailed changes...\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

6. **Commit Changes**
   - `git add [files]` (include CHANGELOG.md!)
   - `git commit -m "[message]"`
   - Verify with `git log -1`
