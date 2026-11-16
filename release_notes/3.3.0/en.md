# Release Notes 3.3.0

**Date:** 2026-11-17
**Version:** 3.3.0

## Overview
A small release that helps other people find Generator Tracker.

## ✨ What's New
- **A one-time rating request**: after you have stopped a few work sessions, the app may ask for a rating with the
  standard Apple or Google dialog. It happens after the Undo window, never at launch, at most once per version — and
  Apple and Google may decide not to show it at all.
- **Store pages in more languages**: Spanish, Portuguese, French, Arabic, Hindi, Bengali, Indonesian, Vietnamese and
  Turkish. The app itself stays in English and Ukrainian.

## Technical
- `expo-store-review`; the prompt logic is in `src/services/reviewPrompt.ts` and is covered by unit tests.
