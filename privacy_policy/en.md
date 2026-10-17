# Privacy Policy for Generator Tracker

**Last Updated:** October 17, 2026

## Introduction

Generator Tracker ("we", "our", or "the app") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our mobile application.

**Key Privacy Principles:**
- 🔒 **Local-First**: Your data stays on your device by default
- 🎯 **Optional Cloud Sync**: You choose whether to sync
- 🚫 **No Tracking**: We don't track, profile, or sell your data
- ✅ **Open Source**: Our code is transparent and auditable
- 📣 **Ads only in the free editions**: Generator Tracker Lite (Android) and the iOS app show ads until you remove them with a one-time purchase; the paid Android app has none (see "Advertising")

## Information We Collect

### 1. Data You Create (Stored Locally)

When you use Generator Tracker, you create and store data **locally on your device** using AsyncStorage:

- **Generators**: Name, model, purchase date
- **Work Sessions**: Date, start/end times, hours worked, notes
- **Refills**: Date, fuel amount, notes
- **Maintenance tasks**: Task name, service intervals (engine hours and/or days), last service date and engine hours, notes

**This data:**
- ✅ Stays on your device
- ✅ Is NOT sent anywhere unless you sign in
- ✅ Can be deleted anytime in the app or by uninstalling the app

### 2. Optional Account Information (Firebase Authentication)

**ONLY if you choose to sign in** for cloud synchronization:

**Email/Password Sign-In:**
- Email address
- Encrypted password (we never see your actual password)

**Google Sign-In (web version only):**
- Email address
- Profile name (if provided by Google)
- Profile photo URL (if provided by Google)

**Anonymous Sign-In:**
- Randomly generated user ID (no personal information)

### 3. Synchronized Data (Firebase Firestore)

**ONLY if you sign in**, your generator data is uploaded to Firebase Firestore:
- All generators, work sessions, refills, and maintenance tasks you've created
- User ID to associate data with your account
- Timestamps for synchronization and conflict resolution

**This data:**
- ✅ Is encrypted in transit (HTTPS)
- ✅ Is stored in Google Cloud (Firebase) servers
- ✅ Is accessible only to you when signed in
- ✅ Can be deleted at any time in the app (Settings → Delete Account) or by email request; signing out does not delete it

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

### Advertising (free editions only)

**Generator Tracker Lite** (Android) and the **iOS app** are free and show ads from **Google AdMob** until you buy "Remove ads" or "Everything". The paid Android app **Generator Tracker** contains no ads and never initialises the advertising SDK.

- **Where ads appear**: a banner on the Analytics and Settings screens, and at most one full-screen ad when Analytics is opened, no more than once every 10 minutes. There are no ads on the home screen, around Start/Stop, on the generator screen or at launch.
- **Data used by AdMob**: the advertising identifier of your device (if you allow it), IP address, device type and operating system, coarse location derived from the IP address, and ad interaction data. Google uses this to serve, measure and limit ads. AdMob's handling of this data is described at https://policies.google.com/technologies/ads and https://support.google.com/admob/answer/6128543.
- **Your choices**: in the European Economic Area, the UK and Switzerland the app asks for your consent before showing ads (Google's consent form) and you can change it any time in Settings → "Ad privacy options". On iOS the system "Allow tracking" prompt controls whether ads may use the advertising identifier; declining it keeps ads non-personalised. Buying "Remove ads" removes ads and stops all advertising requests.
- **The app itself** sends nothing about you to the advertising network: your generators, sessions and refills never leave the app for advertising purposes.

### In-App Purchases (free editions only)

Purchases ("Remove ads", "Unlimited", "Everything") are processed by **Apple (App Store)** or **Google (Google Play)**. The app receives only a confirmation that a product is owned; it never sees your payment details. Purchase records are tied to your store account and are restored from it ("Restore purchases"). Apple's and Google's privacy policies apply to the payment: https://www.apple.com/legal/privacy/ and https://policies.google.com/privacy.

### No Analytics or Tracking by the App
- ❌ No Google Analytics
- ❌ No Facebook Pixel
- ❌ No usage tracking
- ❌ No crash reporting with personal data
- ❌ No advertising SDK in the paid Android app; in the free editions it is used only to show ads (see above)

## Your Rights and Choices

### Access Your Data
- ✅ View all your data directly in the app
- ✅ Export data (functionality planned for future versions)

### Delete Your Data

**Option 1: Delete your account in the app**
1. Open Settings while signed in
2. Tap "Delete Account" and confirm (email accounts confirm with their password)
3. Your account and all data synced to the cloud (generators, work sessions, refills, maintenance tasks) are deleted immediately and permanently

Data on your device is not deleted: it stays available offline and is no longer linked to any account.

**Option 2: Delete local data**
- Delete records in the app, or uninstall the app to remove all local data immediately

**Option 3: Request deletion by email**
- If you can no longer access the app, email yuri.valigursky@gmail.com from the address of your account
- We will delete your account and all associated data within 30 days

Signing out does not delete cloud data.

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
- Deleted immediately when you delete your account in the app, or within 30 days of an email request
- Automatic backup retention: Firebase's standard retention policy

## International Data Transfers

If you are located outside the United States, please note:
- Firebase servers may be located globally
- Data may be transferred to and stored in countries outside your residence
- We rely on Google Cloud's data protection measures

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be posted:
- In this document (with updated "Last Updated" date)

**Material changes** will also be reflected in the app store listing.

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
