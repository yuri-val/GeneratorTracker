# Release Notes

This directory contains release notes for Generator Tracker organized by version and language.

## Structure

```
release_notes/
  └── {version}/
      ├── en.md
      └── uk.md
```

Each version has its own directory containing release notes in multiple languages.

## Files

- `{version}/en.md` - English (United States)
- `{version}/uk.md` - Ukrainian (Українська)

## Format

Each release note file contains:

1. **Version Header** - Version number and release date
2. **Overview** - Brief summary of what's new/changed
3. **What's New** - Key features and improvements
4. **Fixed** - Bug fixes (if applicable)
5. **Technical** - Technical improvements (optional)

## When to Create Release Notes

**ALWAYS create release notes for:**
- ✅ All MINOR versions (new features)
- ✅ All MAJOR versions (breaking changes)
- ✅ PATCH versions with significant bug fixes

**Skip for:**
- ❌ Minor PATCH versions with internal changes only
- ❌ Development builds
- ❌ Pre-release versions

## Update Process

When creating release notes for a new version:

1. **Create version directory**: `release_notes/{version}/`
2. **Create en.md** with release highlights
3. **Create uk.md** with Ukrainian translation
4. **Keep concise** - Focus on user-facing changes
5. **Use bullet points** - Easy to scan
6. **Include in git commit** with version bump

## Guidelines

### Writing Style
- **User-focused**: Explain benefits, not technical details
- **Concise**: 3-5 key points per section
- **Action-oriented**: "You can now...", "Added ability to..."
- **Positive tone**: Emphasize improvements and value

### Length
- **Optimal**: 100-300 words total
- **Maximum**: 500 words (Google Play limit)
- **Minimum**: 50 words (meaningful content)

### Formatting
- Use Markdown headers (`##`, `###`)
- Bullet points for lists
- Emoji sparingly (✨, 🐛, ⚡️)
- Keep consistent across languages

## Examples

### Good Release Note
```markdown
# Version 1.7.0 - February 2026

We've added powerful new analytics features to help you understand your generator usage better!

## What's New

✨ **Advanced Analytics Dashboard**
- View fuel efficiency trends over time
- Compare performance across multiple generators
- Export data to CSV for external analysis

⚡️ **Performance Improvements**
- Faster sync with cloud storage
- Reduced app startup time by 40%

## Fixed

🐛 Fixed occasional crash when editing work sessions
🐛 Improved offline mode reliability
```

### Bad Release Note
```markdown
# Version 1.7.0

Bug fixes and performance improvements.
```

## Language Consistency

Ensure translations maintain the same:
- Structure and sections
- Number of bullet points
- Information content
- Tone and style

Ukrainian translations should be natural and idiomatic, not literal word-for-word translations.

## Adding New Languages

To add a new language:

1. Create `{language_code}.md` in each version directory
2. Follow the same format as existing files
3. Update this README with new language information
4. Consider Play Store language requirements

## Integration with Workflow

Release notes are part of the standard change workflow:

1. Make changes
2. Bump version
3. Update CHANGELOG.md
4. **Create release notes** (for MINOR/MAJOR versions)
5. Update Play Store descriptions (if needed)
6. Commit all changes together
