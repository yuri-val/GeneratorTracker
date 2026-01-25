# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native/Expo mobile app for tracking generator operating hours and fuel refills. Uses Firebase for authentication/sync with an **offline-first architecture** where local AsyncStorage is the source of truth.

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

## Architecture

### Offline-First Data Flow (CRITICAL)

This is the most important architectural pattern in the app:

1. **Local-first**: ALL data operations go through `src/utils/storage.ts` → AsyncStorage
   - AsyncStorage is the source of truth, not Firebase
   - UI always reads from and writes to local storage first

2. **Sync queue**: When user is authenticated, changes automatically queue in `src/utils/syncQueue.ts`
   - Operations (create/update/delete) are queued for background sync
   - Queue persists across app restarts

3. **Background sync**: `src/services/sync.ts` pushes queued changes to Firestore
   - Triggered on auth state changes and periodic intervals
   - Handles network failures with retry logic

4. **Conflict resolution**: Last-write-wins using `lastModified` timestamp
   - See `resolveConflict()` in `src/services/sync.ts`
   - More recent `lastModified` wins during bidirectional sync

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
   - Follow existing pattern with sync queue integration
   - Always set `lastModified` and `syncStatus: 'pending'`

3. **Firestore** (`src/services/firestore.ts`):
   - Add collection operations: `saveNewEntityToFirestore()`, etc.
   - Follow subcollection pattern under generators

4. **Sync** (`src/services/sync.ts`):
   - Add to `syncAllData()` function
   - Handle push/pull for new entity type

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
- **EmailAuthForm.tsx**: Form with validation
- **SignInButton.tsx**: Authentication UI
- **SyncStatusIndicator.tsx**: Status display
- **WorkSessionsList.tsx** / **RefillsList.tsx**: List components with FlatList, pull-to-refresh, empty states

Use props pattern with theme colors passed down:
```typescript
interface ComponentProps {
  colors: typeof Colors.light;
  // ... other props
}
```

### Tab Navigation Pattern

For Material Top Tabs (as in GeneratorDetailScreen):
1. Install dependencies if needed:
   - `@react-navigation/material-top-tabs`
   - `react-native-tab-view`
   - `react-native-pager-view`

2. Create tab navigator and inline tab components:
   ```typescript
   const Tab = createMaterialTopTabNavigator();

   const FirstTab = () => <YourListComponent {...props} />;
   const SecondTab = () => <YourOtherListComponent {...props} />;

   return (
     <Tab.Navigator screenOptions={{...}}>
       <Tab.Screen name="First" component={FirstTab} />
       <Tab.Screen name="Second" component={SecondTab} />
     </Tab.Navigator>
   );
   ```

## Authentication & Sync

### Firebase Configuration
- Config loaded from environment variables: `EXPO_PUBLIC_FIREBASE_*` in `.env`
- Handled in `src/config/firebase.ts`

### Auth Flow
- Authentication managed in `src/services/auth.ts`
- Supports Google Sign-In and Email/Password
- Auth state triggers automatic sync

### Sync Behavior
- Auto-sync on authentication
- Auto-sync on app foreground (when network available)
- Manual sync via pull-to-refresh on screens
- Sync status visible via `SyncStatusIndicator` component

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
   - Test the changes in the development environment (`npm start`)
   - Verify no regressions or breaking changes
   - Check that the app builds successfully

3. **Bump Semantic Version**
   - Determine version type based on changes:
     - **PATCH** for bug fixes and small improvements
     - **MINOR** for new features
     - **MAJOR** for breaking changes
   - Run: `make version-{patch|minor|major}`
   - Update version display in `src/screens/settings/SettingsScreen.tsx`

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

6. **Write Commit Message**
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

     Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
     ```

7. **Commit Changes**
   - Stage all relevant files: `git add [files]` (include CHANGELOG.md and description/*.md if updated!)
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
git add app.json package.json CHANGELOG.md description/*.md src/screens/settings/SettingsScreen.tsx [other files]
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
│   ├── firestore.ts
│   └── sync.ts
└── utils/           # Helper functions and storage
    ├── calculations.ts
    ├── storage.ts     # PRIMARY data access layer
    └── syncQueue.ts
```

## Key Files to Understand

1. **src/utils/storage.ts** - Main data access layer (read this first!)
2. **src/services/sync.ts** - Sync orchestration and conflict resolution
3. **src/models/types.ts** - All data models and interfaces
4. **src/screens/generator/GeneratorDetailScreen.tsx** - Complex screen example with tabs and active session pattern
5. **src/constants/colors.ts** - Theme system

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
