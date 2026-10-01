# Release Notes 2.5.0

**Date:** 2026-10-01
**Version:** 2.5.0

## Overview
Generator Tracker now looks and feels native on every device: Material 3 on Android and the native iOS design on iPhone and iPad. Your data, features and sync work exactly as before.

## ✨ What's New
- **Native navigation**: the bottom bar is now the system Material 3 navigation bar on Android, and the system tab bar (with the new glass look) on iOS.
- **Native iOS screens**: "+" in the top bar, a segment switch for sessions, refills and maintenance, and native forms, date pickers and settings.
- **Clearer actions on Android**: the generator screen has explicit edit and delete buttons, and the generator model is shown on screen.
- **Dark theme**: the app follows your device's light/dark setting.
- **Tablets and foldables**: content sits in a comfortable centred column, and charts fit the screen and follow rotation.

## 🐛 Fixed
- **Dates after midnight**: sessions, refills and services recorded shortly after midnight got the previous day's date, and an active session could show an extra 24 hours. Dates now always use your local calendar day.
- **Tablets**: the empty-screen hint is no longer cut off, and the chart axis no longer overflows its card.
