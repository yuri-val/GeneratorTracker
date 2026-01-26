# Privacy Policy Deployment Guide

## ✅ Completed Steps

1. ✅ Created privacy policy in English and Ukrainian
2. ✅ Created deployment script
3. ✅ Deployed to `gh-pages` branch
4. ✅ Added privacy URL to app.json

## 🚀 Next Steps (Manual)

### 1. Enable GitHub Pages

Go to repository settings and enable GitHub Pages:

**URL:** https://github.com/yuri-val/GeneratorTracker/settings/pages

**Settings:**
- **Source:** Deploy from branch
- **Branch:** `gh-pages`
- **Folder:** `/ (root)`
- Click **Save**

### 2. Wait for Deployment

GitHub Pages will automatically build and deploy your site.
This usually takes 1-5 minutes.

You can check deployment status at:
https://github.com/yuri-val/GeneratorTracker/deployments

### 3. Verify URLs Work

After deployment completes, verify these URLs are accessible:

- 🇺🇸 **English:** https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
- 🇺🇦 **Ukrainian:** https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html
- 🔗 **Root (redirects to English):** https://yuri-val.github.io/GeneratorTracker/

### 4. Google Play Console Setup

#### 4.1 Store Listing Privacy Policy

1. Go to [Google Play Console](https://play.google.com/console)
2. Select Generator Tracker app
3. Navigate to: **Store presence** → **Store listing**
4. Scroll to **Privacy Policy** section
5. Enter URL:
   ```
   https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
   ```
6. Click **Save**

#### 4.2 Data Safety Section

1. Navigate to: **App content** → **Data safety**
2. Click **Start**
3. Fill out the questionnaire based on the privacy policy:

**Does your app collect or share any of the required user data types?**
- ✅ Yes (if user signs in)
- ❌ No (if user uses app offline only)

**Data types collected (if user signs in):**

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | ✅ Yes | ❌ No | Account management, App functionality |
| Name | ✅ Yes (Google Sign-In) | ❌ No | Account management |
| User-generated content | ✅ Yes | ❌ No | App functionality (sync) |

**Encryption:**
- ✅ Data is encrypted in transit
- ✅ Data is encrypted at rest (via Firebase)

**User controls:**
- ✅ Users can request data deletion
- ✅ Users can access their data in the app

4. Review and submit

#### 4.3 Multi-Language Support

If you have Ukrainian listing:
1. Switch to Ukrainian language in Play Console
2. Update Privacy Policy URL to:
   ```
   https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html
   ```

### 5. App Store Connect (iOS) Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select Generator Tracker
3. Navigate to **App Privacy**
4. Add Privacy Policy URL:
   ```
   https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
   ```
5. Fill out Data Types questionnaire (similar to Google Play)

## 🔄 Updating Privacy Policy

When you need to update the privacy policy:

1. Edit files:
   ```bash
   cd privacy_policy
   # Edit en.md and/or uk.md
   # Update "Last Updated" date
   ```

2. Run deployment script:
   ```bash
   ./setup-github-pages.sh
   ```

3. Wait 1-5 minutes for GitHub Pages to rebuild

4. URLs will automatically update (no need to change Play Console/App Store)

## 📝 Important Notes

### Security
- ✅ `gh-pages` branch contains ONLY privacy policy HTML files
- ✅ Main codebase remains private on `main` branch
- ✅ No sensitive data or credentials exposed

### Branch Structure
- **main** (private): Full app source code
- **gh-pages** (public): Only privacy policy HTML files

### GitHub Pages Settings
- The `gh-pages` branch is set to public visibility for GitHub Pages
- Main repository remains private
- Only HTML files are deployed, no source code

## 🆘 Troubleshooting

### GitHub Pages not working?
1. Check Settings → Pages is enabled
2. Verify `gh-pages` branch exists
3. Check deployments: https://github.com/yuri-val/GeneratorTracker/deployments
4. Wait 5-10 minutes for first deployment

### URLs not accessible?
1. Verify GitHub Pages is enabled
2. Check deployment status (green checkmark)
3. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Check browser console for errors

### Need to update policy?
1. Always edit the `.md` files, not HTML directly
2. Run `./setup-github-pages.sh` to regenerate HTML
3. Changes are live within 1-5 minutes

## ✅ Verification Checklist

Before submitting to app stores:

- [ ] GitHub Pages enabled at repository settings
- [ ] English URL works: https://yuri-val.github.io/GeneratorTracker/privacy-policy.html
- [ ] Ukrainian URL works: https://yuri-val.github.io/GeneratorTracker/privacy-policy-uk.html
- [ ] Language switcher works between pages
- [ ] Email link works: yuri.valigursky@gmail.com
- [ ] GitHub repo link works: https://github.com/yuri-val/GeneratorTracker
- [ ] Privacy URL added to app.json ✅
- [ ] Privacy URL added to Google Play Console
- [ ] Privacy URL added to App Store Connect
- [ ] Data Safety section filled in Google Play
- [ ] App Privacy filled in App Store Connect

## 📞 Contact

If you encounter issues:
- Email: yuri.valigursky@gmail.com
- GitHub Issues: https://github.com/yuri-val/GeneratorTracker/issues
