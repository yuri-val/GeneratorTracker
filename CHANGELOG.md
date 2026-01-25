# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
