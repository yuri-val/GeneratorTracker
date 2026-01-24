# Semantic Versioning Guide

Generator Tracker follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format: MAJOR.MINOR.PATCH

### MAJOR version (X.0.0)
Increment when you make **incompatible/breaking changes**:
- Breaking API changes
- Database schema changes that require migration
- Removing features
- Incompatible Firebase structure changes
- Changes that break existing user data

**Command:** `make version-major`

**Examples:**
- Changing data models that require migration
- Removing support for old Firebase structure
- Major UI/UX redesign that changes user workflows

---

### MINOR version (x.Y.0)
Increment when you add **new features** in a backwards-compatible manner:
- New screens or major UI components
- New entity types (e.g., adding maintenance records)
- New authentication methods
- Enhanced analytics features
- New sync capabilities

**Command:** `make version-minor`

**Examples:**
- Adding a new "Maintenance Records" feature
- Adding export functionality
- Adding new chart types to analytics
- Adding OAuth providers

---

### PATCH version (x.y.Z)
Increment when you make **backwards-compatible bug fixes**:
- Bug fixes
- UI tweaks and improvements
- Performance optimizations
- Documentation updates
- Dependency updates (security patches)
- Small UX improvements that don't add features

**Command:** `make version-patch`

**Examples:**
- Fixing delete button not working on web
- Fixing sync queue issues
- Updating icons from emoji to vector icons
- Improving build configuration
- Fixing memory leaks

---

## Workflow

### 1. Make your changes
Develop your feature, fix, or improvement.

### 2. Bump version
Run the appropriate command based on your changes:
```bash
# For breaking changes
make version-major

# For new features
make version-minor

# For bug fixes
make version-patch
```

This will:
- Update version in `app.json` and `package.json`
- Increment iOS `buildNumber`
- Increment Android `versionCode`

### 3. Commit with version info
```bash
git add app.json package.json [your other files]
git commit -m "Version X.Y.Z: Your commit message

[Detailed description of changes]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 4. Tag the release (optional, for releases)
```bash
git tag -a vX.Y.Z -m "Version X.Y.Z"
git push origin vX.Y.Z
```

---

## Version History

### 1.2.0 (Current)
- Add gitingest digest generation support
- Improve build organization with separate preview/production directories
- Add comprehensive AI coding assistant documentation

### 1.1.0
- Replace emojis with professional vector icons (Ionicons)
- Add edit/delete functionality for all entities
- Fix web delete confirmation dialogs
- Add deep linking scheme configuration

### 1.0.0
- Initial release
- Offline-first generator tracking
- Firebase authentication and sync
- Work sessions and refill tracking
- Analytics dashboard

---

## Automated Version Bumping

The `scripts/bump-version.sh` script handles all version updates:
- Updates `app.json` version
- Updates `package.json` version
- Increments iOS buildNumber
- Increments Android versionCode

**Never manually edit version numbers** - always use the script to maintain consistency.

---

## Guidelines

### When in doubt:
- **Bug fix or small improvement?** → PATCH
- **New feature users can see?** → MINOR
- **Breaking existing functionality?** → MAJOR

### Pre-release versions (future):
For beta releases, use: `X.Y.Z-beta.N`
Example: `2.0.0-beta.1`

### iOS and Android Version Codes
These are automatically incremented on every version bump:
- iOS uses `buildNumber` (string, sequential)
- Android uses `versionCode` (integer, sequential)

Both increment with every version bump regardless of type.
