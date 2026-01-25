# Google Play Store Descriptions

This directory contains app store descriptions for Generator Tracker in multiple languages.

## Files

- `en.md` - English (United States)
- `uk.md` - Ukrainian (Українська)

## Structure

Each description file contains:

1. **Short Description** (max 80 characters)
   - Brief tagline for app store listings
   - Appears in search results

2. **Full Description** (max 4000 characters)
   - Complete app description
   - Key features
   - Use cases
   - What's new section
   - Technical details

## When to Update

**ALWAYS update descriptions when:**
- ✅ Adding new features (MINOR version)
- ✅ Major redesigns (MINOR/MAJOR version)
- ✅ Removing features (MAJOR version)
- ✅ Significant UX improvements
- ✅ New functionality that users will notice

**Skip updates for:**
- ❌ Bug fixes without visible changes (PATCH version)
- ❌ Code refactoring without user impact
- ❌ Internal optimizations
- ❌ Dependency updates

## Update Process

When updating descriptions:

1. **Update "What's New" section** with current version highlights
2. **Update "Key Features"** if new features added
3. **Update both language files** (en.md and uk.md)
4. **Keep consistent formatting** across languages
5. **Include in git commit** with version bump

## Guidelines

### Writing Style
- **Clear and concise** - Easy to understand
- **Benefit-focused** - Explain value to users
- **Professional** - Suitable for business use
- **Specific** - Use concrete examples

### Keywords for SEO
- Generator tracking
- Operating hours
- Fuel consumption
- Generator maintenance
- Equipment monitoring
- Runtime tracker

### Formatting
- Use **bold** for emphasis
- Use bullet points for features
- Use emojis sparingly for visual appeal (🎯, 📊, 🔒, etc.)
- Keep paragraphs short and scannable

## Translation Notes

When adding new languages:

1. Create new file: `{language_code}.md`
2. Translate all sections
3. Maintain same structure as English version
4. Adapt content for local market if needed
5. Update this README with new language

## Character Limits

Google Play Store limits:
- **Short description**: 80 characters
- **Full description**: 4000 characters
- **What's new**: 500 characters (per release notes)
- **App title**: 50 characters

**Always check character counts before publishing!**

## Resources

- [Google Play Console](https://play.google.com/console)
- [Play Store Listing Best Practices](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [ASO (App Store Optimization) Guide](https://developer.android.com/distribute/best-practices/launch/app-store-optimization)
