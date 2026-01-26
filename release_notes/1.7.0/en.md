# Release Notes - Version 1.7.0

**Release Date:** January 26, 2026

## 🆕 New Features

### Privacy Policy Implementation

Added comprehensive privacy policy for Google Play Store and App Store compliance:

- **Multi-language Support**: Privacy policy available in English and Ukrainian
- **GitHub Pages Hosting**: Deployed on separate public branch for transparency
- **Automated Deployment**: Script for easy updates and regeneration
- **Compliance Ready**: Covers GDPR, data collection, user rights, and third-party services

**Privacy Policy URLs:**
- 🇺🇸 English: https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
- 🇺🇦 Ukrainian: https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html

### Key Privacy Highlights

- ✅ **Local-First**: Data stays on device by default
- ✅ **Optional Cloud Sync**: User controls data synchronization
- ✅ **No Tracking**: Zero analytics, ads, or third-party data sharing
- ✅ **User Rights**: Clear data access and deletion procedures
- ✅ **Transparent**: Open source code, clear policies

## 📝 Documentation

### New Files

1. **privacy_policy/en.md** - English privacy policy (6,920 characters)
2. **privacy_policy/uk.md** - Ukrainian privacy policy (13,394 characters)
3. **privacy_policy/README.md** - Setup and hosting instructions
4. **privacy_policy/DEPLOYMENT.md** - Detailed deployment guide
5. **privacy_policy/setup-github-pages.sh** - Automated deployment script

### Updated Files

- **app.json**: Added privacy policy URL

## 🛠️ Technical Details

### Privacy Policy Coverage

**Data Collection:**
- Local storage via AsyncStorage (generators, work sessions, refills)
- Optional Firebase Authentication (email, Google Sign-In, anonymous)
- Optional Firebase Firestore sync (when user signs in)

**Third-Party Services:**
- Google Firebase (authentication and sync only)
- Google Sign-In (optional OAuth)
- No analytics, tracking, or advertising SDKs

**User Rights:**
- View all data in-app
- Delete local data (uninstall app)
- Delete cloud data (contact support)
- Control synchronization (sign in/out)

**Security Measures:**
- HTTPS for all network communication
- Firebase Security Rules for data isolation
- No plaintext password storage
- Device-level encryption for local data

### GitHub Pages Setup

The privacy policy is hosted on a separate `gh-pages` branch:

**Branch Structure:**
- `main` (private): Full application source code
- `gh-pages` (public): Privacy policy HTML files only

**Deployment Process:**
1. Edit Markdown files (en.md, uk.md)
2. Run `./setup-github-pages.sh`
3. Script converts MD to HTML with styled template
4. Pushes to gh-pages branch
5. Live in 1-5 minutes

**HTML Features:**
- Responsive design (mobile-friendly)
- App theme colors (orange primary, blue secondary)
- Language switcher
- Professional styling

## 📋 Compliance

### Google Play Store

**Required Actions:**
1. Enable GitHub Pages in repository settings
2. Add privacy URL to Store Listing
3. Complete Data Safety questionnaire
4. Submit for review

**Data Safety Answers:**
- Email, Name, User-generated content (if signed in)
- Purpose: App functionality, Account management
- Encrypted in transit and at rest
- Users can request deletion

### App Store Connect (iOS)

**Required Actions:**
1. Add Privacy Policy URL
2. Complete App Privacy questionnaire
3. Similar data disclosure as Google Play

## 🔄 Update Process

To update the privacy policy in the future:

```bash
cd privacy_policy
# Edit en.md and/or uk.md
# Update "Last Updated" date
./setup-github-pages.sh
# Changes live in 1-5 minutes
```

## 📞 Contact Information

**Support Email:** yuri.valigursky@gmail.com
**GitHub Repository:** https://github.com/yuri-val/GeneratorTracker
**Privacy Inquiries:** 7 business day response time

## 🎯 Next Steps

1. ✅ Privacy policy files created
2. ✅ Deployment script configured
3. ✅ Pushed to gh-pages branch
4. ⏳ Enable GitHub Pages (manual step)
5. ⏳ Verify URLs are accessible
6. ⏳ Add to Google Play Console
7. ⏳ Add to App Store Connect

## 🔗 Related Commits

- c394693: Add privacy policy for Google Play Store
- e8f8ba1: Add privacy policy deployment guide
- f1d297e: Update release notes process and enhance documentation

## 📦 Build Information

- **Version:** 1.7.0
- **iOS Build:** 17
- **Android Version Code:** 19
- **Platform:** Expo SDK
- **Min iOS:** 13.0
- **Min Android:** 23 (6.0)

## ⚠️ Breaking Changes

None

## 🐛 Bug Fixes

None

## 🎨 UI/UX Changes

None - This release focuses on compliance and documentation

## 🔐 Security

Enhanced transparency through public privacy policy hosting on GitHub Pages.

## 📱 Platforms

- ✅ iOS
- ✅ Android
- ✅ Web (Expo)

## 🧪 Testing

- ✅ Privacy policy URLs verified locally
- ✅ HTML generation tested with pandoc
- ✅ Language switcher functional
- ✅ Responsive design tested
- ⏳ GitHub Pages deployment (pending manual activation)

## 📚 Additional Resources

- [Privacy Policy (English)](https://yuri-val.github.io/GeneratorTracker/privacy-policy.html)
- [Privacy Policy (Ukrainian)](https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html)
- [Deployment Guide](../privacy_policy/DEPLOYMENT.md)
- [Setup Instructions](../privacy_policy/README.md)

---

**Note:** This release prepares the app for Google Play Store and App Store submission by adding required privacy policy documentation. No changes to app functionality or UI.
