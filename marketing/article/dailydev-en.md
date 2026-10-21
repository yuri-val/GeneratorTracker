# daily.dev post

*Audience: Everyone + GitHub Nexus (own squad). Developer audience → technical angle (a condensed English version of the DOU article).*

**Title:** Offline-first sync in React Native + Firestore: pending state, tombstones and a pure merge

*(Renamed on 2026-10-21 from "…that never loses data": daily.dev flagged the absolute claim as clickbait.)*

**Body:**

In Ukraine, scheduled blackouts turned generators into everyday appliances — and mobile internet often goes down with the power. So I built Generator Tracker, an open-source logbook for generators (run hours, fuel, maintenance by engine hours), where the phone is the source of truth and the cloud is optional.

Stack: Expo SDK 57, React Native 0.86, React 19, AsyncStorage, Firebase Auth + Firestore. Native SwiftUI forms on iOS via @expo/ui, Material 3 on Android.

What I learned building the sync:

- State, not a queue. My first version had a classic sync queue — and changes that failed three times were silently dropped. Now every write is stored as "pending" with a monotonic lastModified, and deletes leave a tombstone (even when signed out), so a pull can never resurrect a record.
- One FIFO mutex for every storage write. Without it, a "Stop" tap and a cloud pull would read the same version and overwrite each other.
- Push, then pull — never both at once. Pull takes a complete server snapshot and merges it with a pure function: last write wins on the client timestamp, a local tombstone always wins, and absence from a snapshot only deletes records known to be in this account's cloud.
- Cache-only snapshots never prune. After a reinstall the Firestore cache is empty, and "missing from cache" doesn't mean "deleted" — the sneakiest bug of the lot.
- Pure merge = easy tests: Jest for the merge rules, Playwright + Firebase emulators for end-to-end sync, rules tests, Maestro for native UI.

Gotchas: Hermes has no Intl.PluralRules (hand-written Ukrainian plurals), and on iOS 26 attaching the tab bar accessory conditionally rebuilds SwiftUI's TabView and crashes.

Code (MIT): https://github.com/yuri-val/GeneratorTracker
Free iPhone beta: https://testflight.apple.com/join/wZcGdJar

How do you handle offline sync — CRDTs, your own queue, WatermelonDB, PowerSync?
