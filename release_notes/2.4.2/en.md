# Release Notes 2.4.2

**Date:** 2026-09-30
**Version:** 2.4.2

## Overview
A reliability update for cloud sync. No new features — your data now stays consistent across devices and never comes back after you delete it.

## 🐛 Fixed
- **Data created before signing in is uploaded**: signing in now uploads everything you recorded while signed out (previously the first sync after signing in silently failed).
- **Changes from your other devices keep arriving**: after a record had been synced once, later edits made on another device could stop reaching this device.
- **Deletions are synced**: deleting a generator, session, refill or maintenance task now removes it on all your devices — including deletions made while signed out or offline. Deleted records no longer reappear after signing in again.
- **Deleting a generator removes all its records from the cloud**: its sessions, refills and maintenance tasks are deleted too, so Analytics on other devices is no longer inflated by leftovers.
- **Cleared fields are synced**: removing a model, notes or an interval now clears it in the cloud as well.
- **No lost edits**: saving while a sync is running can no longer overwrite other changes.
- **Changes that fail to upload are retried** by the next sync instead of being dropped after three attempts.
- **Sync no longer hangs forever** without a connection; it stops with an error after 30 seconds.

## 🔧 Technical
- Firestore security rules tightened and covered by automated tests.
- Compatible with devices still running older versions of the app.
