# Privacy Policy

This directory contains privacy policies for Generator Tracker in multiple languages.

## Files

- `en.md` - English (United States)
- `uk.md` - Ukrainian (Українська)
- `setup-github-pages.sh` - Script to deploy privacy policy to GitHub Pages

## Hosting on GitHub Pages

Privacy policy is hosted on a separate public branch (`gh-pages`) to keep the main codebase private.

### Setup Instructions

1. **Run the setup script:**
   ```bash
   cd privacy_policy
   ./setup-github-pages.sh
   ```

2. **Enable GitHub Pages:**
   - Go to https://github.com/yuri-val/GeneratorTracker/settings/pages
   - Source: Deploy from branch
   - Branch: `gh-pages`
   - Folder: `/ (root)`
   - Save

3. **Access URLs (after GitHub Pages is enabled):**
   - English: https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
   - Ukrainian: https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html

### Updating Privacy Policy

When you need to update the privacy policy:

1. Edit `en.md` and/or `uk.md` files
2. Update "Last Updated" date
3. Run the setup script again:
   ```bash
   cd privacy_policy
   ./setup-github-pages.sh
   ```

This will:
- Convert Markdown to HTML
- Push changes to `gh-pages` branch
- Update live URLs automatically

## Google Play Store Links

Use these URLs in Google Play Console:

- **English listing**: https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
- **Ukrainian listing**: https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html

## Requirements

- ✅ Accessible via HTTPS
- ✅ Publicly available (no login required)
- ✅ Multi-language support
- ✅ Developer contact information included

## Contact

Privacy policy issues: yuri.valigursky@gmail.com
