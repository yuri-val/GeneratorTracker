# Maintenance / Service Tracking

> Feature design & implementation reference. Introduced in v2.4.0.

## Overview

Generators need periodic servicing (oil changes, filter replacement, seasonal
checks). The **Maintenance** feature lets a user define recurring service tasks
per generator and see, at a glance, when each one is **due**. Reminders are
**in-app only** — visual status badges, no push/local notifications.

A maintenance task is due based on **either**:

- **Engine hours** — e.g. "every 250 motohours" (measured against the
  generator's accumulated work-session hours), and/or
- **Calendar time** — e.g. "every 6 months" (measured from the last service
  date).

Both axes are optional, but at least one is expected. When both are set, the
**worst (soonest-due) axis wins**.

## Data model

`MaintenanceTask` (in `src/models/types.ts`) extends `SyncMetadata` like every
other synced entity, and lives as a Firestore subcollection of its generator —
mirroring `WorkSession` and `Refill`.

```ts
interface MaintenanceTask extends SyncMetadata {
  id: string;
  generatorId: string;
  title: string;             // e.g. "Oil change"
  intervalHours?: number;    // engine-hours interval (optional)
  intervalDays?: number;     // calendar-days interval (optional)
  lastServiceHours: number;  // engine hours recorded at the last service
  lastServiceDate: string;   // ISO date (YYYY-MM-DD) of the last service
  notes?: string;
  createdAt: string;         // ISO 8601 datetime
}
```

`SyncQueueItem.entityType` gains `'maintenance'`.

Firestore path: `users/{userId}/generators/{generatorId}/maintenanceTasks/{taskId}`.

## Due logic (`src/utils/calculations.ts`)

The generator's **current engine hours** = sum of `hours` over its completed
(non-active) work sessions — the same `totalHours` produced by
`calculateGeneratorStats`.

```ts
type MaintenanceStatusLevel = 'ok' | 'soon' | 'due';

interface MaintenanceStatus {
  level: MaintenanceStatusLevel;
  hoursRemaining?: number; // engine hours until due (negative = overdue)
  daysRemaining?: number;  // whole days until due (negative = overdue)
  dueHours?: number;       // absolute engine-hour mark when due
  dueDate?: string;        // ISO date when due
}

calculateMaintenanceStatus(task, currentEngineHours, now?): MaintenanceStatus
```

Per axis:

- **Hours**: `dueHours = lastServiceHours + intervalHours`;
  `hoursRemaining = dueHours - currentEngineHours`.
- **Date**: `dueDate = lastServiceDate + intervalDays`;
  `daysRemaining = whole calendar days from today to dueDate` (UTC, date-only,
  so the result is independent of the time of day).

Thresholds (per axis):

| Level  | Condition                                                       |
|--------|-----------------------------------------------------------------|
| `due`  | `hoursRemaining <= 0` **or** `daysRemaining <= 0`               |
| `soon` | `hoursRemaining <= 10% of intervalHours` **or** `daysRemaining <= 7` |
| `ok`   | otherwise                                                       |

The task's overall level is the **worst** across its set axes
(`due > soon > ok`). A task with no intervals is always `ok`.

```ts
getGeneratorMaintenanceSummary(tasks, currentEngineHours, now?):
  { level: MaintenanceStatusLevel; dueCount: number; soonCount: number; total: number }
```

Returns the worst level among a generator's tasks plus per-bucket counts —
used to drive the badge on the Home card and the Detail header.

```ts
markTaskServiced(task, currentEngineHours, date): MaintenanceTask
```

Pure helper that resets `lastServiceHours` to the current engine hours and
`lastServiceDate` to the given date, returning the updated task (the screen
then persists it via storage).

## Storage (`src/utils/storage.ts`)

`getMaintenanceTasks(generatorId?)`, `saveMaintenanceTask(task)`,
`deleteMaintenanceTask(id)` — follow the existing Refill pattern (set
`lastModified` + `syncStatus: 'pending'`, enqueue for sync when authenticated).
`deleteGenerator()` also cascade-deletes its maintenance tasks.

## Firestore & sync

- `src/services/firestore.ts`: `save/get/getAll/delete` for the
  `maintenanceTasks` subcollection (collection-group query for `getAll`), same
  shape as refills.
- `src/services/sync.ts`: `'maintenance'` added to `EntityType`,
  `pushEntityToFirestore`, `deleteEntityFromFirestore`, `performInitialSync`,
  `pullAllDataFromFirestore`, and a `collectionGroup('maintenanceTasks')`
  realtime listener. Conflict resolution is unchanged (last-write-wins on
  `lastModified`).

## UI

- **`MaintenanceList`** (`src/components/MaintenanceList.tsx`) — FlatList of
  tasks, each showing title, interval, a coloured status chip
  (ok=green / soon=amber / due=red), the remaining hours/days, and a
  **"Mark serviced"** action. Add button + empty state, like the other lists.
- **`AddMaintenanceScreen`** (`src/screens/generator/AddMaintenanceScreen.tsx`)
  — fields: title, interval hours, interval days, last-service date (native
  date picker), notes. Edit + delete when opened with a `taskId`.
- **`GeneratorDetailScreen`** — a third Material Top Tab "Maintenance (n)";
  the header shows a warning badge when the generator has due tasks.
- **`HomeScreen`** — each generator card shows a small badge when it has
  `soon`/`due` tasks.
- **Navigation** — `RootStackParamList` gains
  `AddMaintenance: { generatorId: string; taskId?: string }`, registered as a
  modal in `App.tsx`.

## i18n

New `maintenance.*` key group added to both `src/i18n/locales/en.json` and
`uk.json` (titles, field labels, status words, validation, confirmations).

## Out of scope (deliberately)

- Push / local notifications (`expo-notifications`) — would require a native
  rebuild; reminders stay in-app for this release.
- Fuel-unit selection and generator search/sort.
