# Version 2.4.0 — Maintenance & Service Tracking

**Release Date:** June 29, 2026

## Overview

This release introduces maintenance tracking, so you never miss a service again. Define recurring service tasks for each generator and see at a glance when each one is due — based on engine hours, calendar time, or both.

## What's New

- **Maintenance Tasks** — Add recurring service tasks per generator (e.g. "Oil change every 250 engine hours" or "Seasonal check every 180 days"). Set an hours interval, a days interval, or both.
- **Smart Due Status** — Each task shows a clear status — **OK**, **Due soon**, or **Due now** — along with the remaining engine hours and days. When a task has both an hours and a days interval, whichever comes first wins.
- **Maintenance Tab** — A new tab on the generator screen lists all of its service tasks, with a one-tap **Mark serviced** action that resets the task from "today" at the current engine hours.
- **At-a-glance Badges** — The home screen and generator details highlight a coloured badge when a generator has tasks due soon or overdue, so problems surface without digging.

## Technical

- New maintenance data type integrated end-to-end with the offline-first architecture and Firebase sync (works offline, syncs when connected).
- Maintenance status logic is covered by automated unit tests, and the feature is verified with an end-to-end browser test.
- Fully localized in English and Ukrainian.
