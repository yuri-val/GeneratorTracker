# Privacy Policy for Generator Tracker

**Last Updated:** January 26, 2026

## Introduction

Generator Tracker ("we", "our", or "the app") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our mobile application.

**Key Privacy Principles:**
- 🔒 **Local-First**: Your data stays on your device by default
- 🎯 **Optional Cloud Sync**: You choose whether to sync
- 🚫 **No Tracking**: We don't track, profile, or sell your data
- ✅ **Open Source**: Our code is transparent and auditable

## Information We Collect

### 1. Data You Create (Stored Locally)

When you use Generator Tracker, you create and store data **locally on your device** using AsyncStorage:

- **Generators**: Name, model, purchase date
- **Work Sessions**: Date, start/end times, hours worked, notes
- **Refills**: Date, fuel amount, notes

**This data:**
- ✅ Stays on your device
- ✅ Is NOT sent anywhere unless you sign in
- ✅ Can be deleted anytime by uninstalling the app

### 2. Optional Account Information (Firebase Authentication)

**ONLY if you choose to sign in** for cloud synchronization:

**Email/Password Sign-In:**
- Email address
- Encrypted password (we never see your actual password)

**Google Sign-In:**
- Email address
- Profile name (if provided by Google)
- Profile photo URL (if provided by Google)

**Anonymous Sign-In:**
- Randomly generated user ID (no personal information)

### 3. Synchronized Data (Firebase Firestore)

**ONLY if you sign in**, your generator data is uploaded to Firebase Firestore:
- All generators, work sessions, and refills you've created
- User ID to associate data with your account
- Timestamps for synchronization and conflict resolution

**This data:**
- ✅ Is encrypted in transit (HTTPS)
- ✅ Is stored in Google Cloud (Firebase) servers
- ✅ Is accessible only to you when signed in
- ✅ Can be deleted by signing out and clearing data

## How We Use Your Information

### Local Usage (No Account)
- Display your generator tracking data
- Calculate statistics and analytics
- Provide app functionality

**No data leaves your device.**

### Cloud Sync Usage (With Account)
- Synchronize data across your devices
- Backup your data to prevent loss
- Restore data when you reinstall the app
- Resolve conflicts when editing on multiple devices

**We do NOT:**
- ❌ Analyze your usage patterns
- ❌ Show advertisements
- ❌ Sell or share your data with third parties
- ❌ Use your data for any purpose other than syncing

## Data Storage and Security

### Local Storage
- **Method**: React Native AsyncStorage
- **Location**: Your device's internal storage
- **Encryption**: Standard device encryption (if enabled on your device)
- **Access**: Only Generator Tracker app can access this data

### Cloud Storage (Firebase)
- **Provider**: Google Firebase (Google Cloud Platform)
- **Location**: Based on your Firebase project region
- **Encryption**:
  - In transit: TLS/HTTPS
  - At rest: Google Cloud encryption
- **Access Control**: Firebase Security Rules ensure only authenticated users access their own data

### Security Measures
- ✅ No passwords stored in plaintext
- ✅ Authentication tokens securely managed by Firebase
- ✅ HTTPS for all network communication
- ✅ No sensitive data in app logs

## Data Sharing and Third Parties

### We Do NOT Share Your Data
Generator Tracker does **not sell, rent, or share** your personal data with third parties for marketing or advertising purposes.

### Third-Party Services We Use

**Google Firebase** (ONLY if you sign in):
- **Purpose**: Authentication and data synchronization
- **Data Shared**: Account information and app data (as described above)
- **Privacy Policy**: https://firebase.google.com/support/privacy

**Google Sign-In** (ONLY if you choose this sign-in method):
- **Purpose**: Authentication via Google account
- **Data Shared**: Email, name, profile photo (as provided by Google)
- **Privacy Policy**: https://policies.google.com/privacy

### No Analytics or Tracking
- ❌ No Google Analytics
- ❌ No Facebook Pixel
- ❌ No advertising SDKs
- ❌ No usage tracking
- ❌ No crash reporting with personal data

## Your Rights and Choices

### Access Your Data
- ✅ View all your data directly in the app
- ✅ Export data (functionality planned for future versions)

### Delete Your Data

**Option 1: Delete Local Data**
- Uninstall the app from your device
- This removes all local data immediately

**Option 2: Delete Cloud Data**
1. Sign in to the app
2. Go to Settings
3. Tap "Sign Out"
4. Your cloud data remains in Firebase
5. To permanently delete: Contact us at yuri.valigursky@gmail.com

**Option 3: Delete Account**
- Contact us at yuri.valigursky@gmail.com
- We will delete your account and all associated data within 30 days

### Control Synchronization
- ✅ Use the app without signing in (no cloud sync)
- ✅ Sign in to enable sync
- ✅ Sign out to stop syncing (local data remains)

## Children's Privacy

Generator Tracker is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13.

If you are a parent or guardian and believe your child has provided us with personal information, please contact us at yuri.valigursky@gmail.com.

## Data Retention

### Local Data
- Retained until you uninstall the app
- No automatic deletion

### Cloud Data (Firebase)
- Retained while your account is active
- Deleted within 30 days after account deletion request
- Automatic backup retention: Firebase's standard retention policy

## International Data Transfers

If you are located outside the United States, please note:
- Firebase servers may be located globally
- Data may be transferred to and stored in countries outside your residence
- We rely on Google Cloud's data protection measures

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be posted:
- In this document (with updated "Last Updated" date)
- In the app (if changes are material)

**Material changes** will be notified via:
- In-app notification on next launch
- Update to app store listing

## Open Source

Generator Tracker is open source software:
- **License**: MIT License
- **Repository**: https://github.com/yuri-val/GeneratorTracker
- **Code Review**: You can review our code to verify privacy practices

## Contact Us

If you have questions about this Privacy Policy or our privacy practices:

**Email**: yuri.valigursky@gmail.com
**Response Time**: We aim to respond within 7 business days

---

**Summary**

🔒 **Privacy-First Design**: Local storage by default, optional cloud sync
📱 **User Control**: You decide what data to sync and when
🚫 **No Tracking**: Zero analytics, ads, or third-party tracking
✅ **Transparent**: Open source code, clear policies

Thank you for trusting Generator Tracker with your data.
