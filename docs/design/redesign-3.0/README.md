# Handoff: Generator Tracker 3.0 — redesign

## Overview
Version 3.0 redesigns Home, the generator screen (active session + maintenance), the refill flow and the dark theme of **GeneratorTracker** (React Native + Expo, react-native-paper, native bottom tabs on iOS). The main job of the app is: *the power went out → start a generator in one tap → watch it → don't miss maintenance*. Every decision below follows from that.

Final direction: **5a** (light) + **5d** (dark, OLED). **5e** (night red) is shipped only as a Settings hint pointing to the OS colour filter (5h), not as an in-app theme.

## About the design files
`Generator Tracker 3.0.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behaviour; it is not production code to copy. Recreate it in the existing codebase (`src/screens/*`, `src/components/*`, `src/theme/*`) using its current patterns: react-native-paper on Android, native iOS components (`ScreenHeader`, `NativeForm.ios`, `react-native-bottom-tabs`) on iOS. Open the file in a browser (keep `support.js` and `assets/` next to it). All buttons work: Start/Stop, undo, refill sheet, presets, "Start again".

`fuel.ts`, `format.ts` and `tokens.ts` are **real code** you can move into `src/utils/` and `src/theme/` (adjust import paths). The i18n files hold **new keys** to merge into `src/i18n/locales/{uk,en}.json`.

## Fidelity
**High-fidelity.** Colours, type, spacing and copy are final. Phone chrome in the mock (status bar, rounded frame, tab bar drawing) is generic: use the native status bar, native `UITabBar` on iOS and Material bottom navigation on Android, styled with these tokens.

---

## Design principles (apply everywhere)
1. **State through inversion/elevation.** Light: a running generator's card turns ink (`#1B1A17`, light text). Dark: a running card is raised to `surface3 #24231F` with a 3px top strip in the generator colour; idle rows stay flat on black with a dimmed name.
2. **Mono only for digits.** IBM Plex Mono for timer, litres, hours, L/h and times of day. All labels are IBM Plex Sans in sentence case (never all caps: Ukrainian strings are about 2× longer).
3. **Square system.** Radius 0 for cards, buttons, sheets, inputs. Hairlines are 1px, section rules 1.5px.
4. **Red means Stop or a problem, and nothing else.** Generator identity colours never use red, amber or green.
5. **A second cue that isn't colour.** Maintenance warnings start with `▲`; running state is `●` plus a text label.
6. **NBSP** (`\u00A0`) between `≈` and the number, and between number and unit (`2,4 л`, `4 год`).

## Screens

### 1. Home (Головна) — `HomeScreen.tsx`
**Layout.** Column, screen padding 20 horizontal. Order: header, then a 1.5px ink rule, then the generator list (gap 6), then the tab bar.
- Header: a summary line (13/400, `inkMuted`), e.g. `3 генератори · 2 працюють` (see `fmtSummary`), and the title `Генератори` (30/700, letter-spacing −0.6) on the left. On the right a **+** button, 44×44, 1.5px ink border, radius 0. On iOS the + stays in the nav bar (as today); on Android it replaces the FAB.
- **Order:** running generators on top, then idle ones in stable creation order. Animate reorders with `LinearTransition` (Reanimated, ~250 ms).

**Running card (light)** — bg `#1B1A17`, padding 16, margin −4 horizontal (bleeds slightly past the rule), gap 10.
- Row 1: accent rule 3×16 in generator colour, gap 8, then the name (17/600 `#F3F1EC`). Right side: `● з 22:59` (12/500 `#7BD88F`, time in mono).
- Row 2, left: duration in words `2 год 22 хв` (28/600 sans, tabular-nums), refreshed **every minute**, no seconds. Below it `Пальне ≈ 2,4 л · ~4,6 год` (13/400 `#A8A398`, litres in mono `#F3F1EC`).
- Row 2, right: **Stop button** 76×56, `#C0392B`, white 12×12 square icon above the label `Стоп` (13/600), gap 5.
- Row 3, only if maintenance is not OK: 1px `#3A3833` rule, 10 top padding, then `▲ Масло · прострочено 4 год` (13/500, due `#FF8A78` or soon `#FFC266`). Use the **short** title on Home and the full one on the detail screen.

**Idle row (light)** — padding 12 vertical, bottom rule `rgba(27,26,23,.15)`, gap 14.
- Accent rule plus name (17/600 ink).
- `Остання сесія 4 жовт. · ≈ 18,0 л` (13/400 `inkMuted`, litres in mono ink), indented 11.
- Optional `▲ <short maintenance>` (13/500, `#C4321F` or `#B86E0A`).
- **Start button** 76×56: transparent with a 1.5px ink border, ink play triangle (11×14) above the label `Старт`. Pressed fill `#E8E5DD`.

**Dark (5d)** — bg `#000`.
- Running card: `#24231F` with a 3px top border in the generator colour, the same accent rule by the name, the same content. Timer 30/600.
- Idle row: name 17/**500** `#BDB8AD`, accent rule at 60% opacity, meta `#8C877C`. Start button: `#1A1918` fill, no border, text and icon `#D9D5CB`.
- Rules `#1C1B19`.

**Tab bar** — height 76, 1.5px top rule, labels `Головна / Аналітика / Налаштування` (11px; active 600 ink, inactive 400 muted), icons from `assets/tabs/*.svg` (20px).

### 2. Generator screen — `GeneratorDetailScreen.tsx`
Scrollable column, padding 6/20/16, gap 14. **No tab bar.** Live bar (if any) is a footer **in the layout**, not an overlay.
- Nav row (36 high): `‹ Головна` on the left and `Редагувати` on the right (14/500 muted). `Редагувати` edits the **generator**.
- Title: accent rule 4×24 plus the name (28/700).
- **Session card (running)**, light ink or dark `#24231F` with a 3px accent top. Padding 16/18, gap 12:
  - `● Сесія триває` (green) on the left, `з 22:59` on the right (13/500).
  - Clock `2:22:17`: mono 48/500, letter-spacing −1.4, refreshed every second.
  - Two columns:
    - `Використано` / `≈ 1,2 л`.
    - `У баку (i)` / `≈ 2,4 л ~4,6 год`. Tapping (i) toggles a box with `detail.fuelEstimateInfo` (12/400 `#C9C4B8` on `#2A2925`).
  - Buttons in a grid `1fr auto`, gap 8: **Зупинити** (52 high, `#C0392B`) and **Змінити час** (52, 1px `#57534B` border). `Змінити час` opens the existing active-session editor.
- **Session card (idle)**: 1.5px ink border, padding 16. `Пальне ≈ 2,4 л з 3,6 · ~4,6 год`, then the ink button **Запустити сесію** (52).
- Tabs: `Сесії 60 · Заправки 33 · ТО 5`. Active tab is ink with a 2px underline, counts in mono. Keep `PlatformSegmented` on iOS if preferred.
- Maintenance (ТО) tab:
  - Caption `Шкала — використаний ресурс до наступного ТО` (12 muted).
  - Rows: title (14/500) on the left, status text on the right (12/500, colour by status, e.g. `Прострочено на 4 год`).
  - Under each row a 4px bar: track `rgba(27,26,23,.1)`, fill = used fraction (capped at 100%), and a 1.5×10 tick at the right end marking the limit.
  - Statuses: due `#C4321F` / dark `#FF8A78`; soon `#B86E0A` / dark `#FFC266`; ok ink / dark `#D9D5CB`. **OK is never green.**
- Header stats (only when the session card is idle, or move them under the tabs): `Мотогодини` (**include the running session live**), `л/год`, `Бак, л`.

**Live bar** (from 2b): 60 high, ink (dark: `#24231F`), inset 12 from the sides and 26 from the bottom (safe area), part of the layout.
- `others` = running generators **excluding the one on screen**. Show the bar only when `others.length ≥ 1`. Never show it on Home, where the cards already show the state.
- `others.length === 1`: accent rule 3×28, name (13/500), `● працює · 0 год 52 хв` (12 green), and a Stop button (48 high, padding 14, `#C0392B`).
- `others.length ≥ 2` (mock **5g**): `● Ще 2 працюють` plus the names (ellipsis) and `На головну ›`. Tapping goes to Home.
- iOS 26: check whether `react-native-bottom-tabs` exposes the bottom accessory. On screens with tabs (Analytics, Settings) the bar should be that accessory. On pushed screens it is this footer.

### 3. Refill sheet — `AddRefillScreen.tsx` (present as a sheet)
Sheet bg `bg` (dark `#121211`) with a 1.5px ink top rule (dark 1px `#33322D`), padding 18/20/26, gap 14.
- Title `Додати заправку` (22/700), subtitle `Бак 3,6 л · зараз ≈ 2,4 л · вільно 1,2 л`, and `Скасувати` on the right.
- **If the generator is running:**
  - Danger banner: 1.5px border `#C4321F` (dark `#E0533F`), bg `#FBE9E5` (dark `#2A1210`). Title `▲ Генератор працює`, body text, and the red **Зупинити й заправити** button (52), which ends the session and fills the refill date/time with the stop time.
  - The form below is **disabled**. Light: 35% opacity. Dark: use explicit disabled colours instead of opacity (text `#8C877C`, border `#33322D`, contrast ≥ 4.5:1) and the hint `Форма стане доступною після зупинки.`
  - No Save button.
- **Stepper:** grid `56px 1fr 56px`, 66 high, 1.5px border. Value in mono 36/500 plus `л`, step 0.1 (tanks ≤ 10 L) or 1 (bigger tanks).
- **Presets** (3 columns, gap 6, min height 52) from `refillPresets()`: `До повного <free>`, `Як минулого разу <last>`, `1 літр` (or `20 л` for big tanks).
  - A preset larger than the free space is disabled: dashed border and the text `більше за вільне`.
  - `До повного` also ticks the checkbox.
- **Checkbox** `Заправлено до повного` (22px square) with the hint `Рівень у баку стане 3,6 л`.
- **Messages** (warn bg `#FCEFD9`, text `#8A5300`; dark `#2A2010` / `#FFC266`):
  - full ticked and amount ≠ free → `Оцінку буде скориговано на +0,3 л …`
  - not full and amount > free → `Більше за вільне місце …`
- Preview line: `Після заправки ≈ 3,6 л з 3,6 · Сьогодні, 22:41`.
- **Defaults when opening:** `defaultRefill()`, i.e. to-full with the checkbox ticked for small tanks, or the last refill if it fits for big tanks.
- **Save:** ink button `Зберегти 1,2 л` (56). After saving, show a snackbar `✓ Заправку збережено · [▶ Запустити знову]` for 6 s. "Запустити знову" starts a new session.
- If the tank is already full: a disabled `Бак повний` instead of Save.

### 4. Settings hint (5h) — `SettingsScreen.tsx`
In the `Вигляд` group: `Тема → Як у системі` and `Нічний червоний режим ›`. The latter opens an ink card with the iOS/Android steps (`settings.nightRed*` keys) and `Відкрити налаштування доступності`.
- iOS: `Linking.openURL('App-prefs:ACCESSIBILITY')` if allowed, otherwise `Linking.openSettings()`.
- Android: `Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS')`.
- The step names are approximate translations. Check them on a device in each locale.

### Not redesigned in 3.0
Analytics keeps its current layout. Planned for 3.1: stacked bars by generator colour, so petrol and diesel litres are never summed into one bar. Add-generator form: only add the `tankCapacity` field. Session list and refill list: keep, apply tokens.

## Interactions & behaviour
- **Stop (anywhere):** stops immediately with no confirm dialog, `Haptics.notificationAsync(Success)`. Then a snackbar for **5 s**: `Записано 2,4 год. роботи · Honda EU22i` with `Скасувати`. Undo restores the session with the original start time; the fuel and motor-hour changes are reverted too.
- **Start:** one tap, `Haptics.impactAsync(Medium)`. The card flips to running and moves to the top.
- **Timers:** Home and the live bar refresh every 60 s (minute precision). The detail screen refreshes every 1 s. Use `AppState` to pause.
- **Several running generators** are fully supported: each card flips independently, and the header counter updates.
- **Refill while running:** blocked as described in screen 3.
- Snackbars sit 12 from the screen edges, above the tab bar or live bar (bottom 88–96). Bg ink, action text `#F2B35C`.

## State / data model
```ts
// src/models/types.ts
interface Generator { …; tankCapacity?: number }   // litres, optional — hide fuel UI when missing
interface Refill    { …; isFull?: boolean }        // resets the estimate
```
- Fuel level: `estimateFuel()` in `fuel.ts`. It replays refills and completed sessions, clamps to `[0, tankCapacity]`, applies the active session live, and treats a refill larger than the free space as full (calibration).
- Firestore: both fields are optional, so there is no migration. Add them to the sync whitelist and to `firestore.rules`.
- UI state per screen: `undo: { sessionId, startTime } | null` (5 s), `refill: { litres, markedFull }`, `infoOpen: boolean`.
- Motor hours on the detail screen = stored total + elapsed of the active session.

## Design tokens
All values are in **`tokens.ts`**: light/dark palettes, status colours, generator palette `['#4C6EDB','#8A5CC9','#2F86A6','#C9508C','#5E6673','#8B6A4F']`, type scale, spacing, sizes.
- Contrast checks: Stop `#C0392B` with white text ≈ 5.4:1. `inkMuted #6E6A60` on `#F3F1EC` ≈ 4.9:1. `#A8A398` on `#24231F` ≈ 6.2:1. `#8C877C` on `#000` ≈ 5.6:1.
- Dark background: start with `#000`. If black smearing shows on test devices (cheap OLED panels), switch to `#0A0A0A`. Also check that `#24231F` is visibly different from black on low-end Android screens.
- **Fonts:** IBM Plex Sans 400/500/600/700 and IBM Plex Mono 400/500 (both include Cyrillic). Install with `@expo-google-fonts/ibm-plex-sans` and `@expo-google-fonts/ibm-plex-mono`, then set them in `fontConfig` in `src/theme/index.ts`.

## Formatting
Use **`format.ts`**: `Intl.NumberFormat` (decimal comma for uk), `fmtDurationWords` on Home, `fmtClock` on the detail screen, `fmtTime` (24 h for uk), `fmtShortDate` (`4 жовт.`), and `fmtSummary` with `Intl.PluralRules`.

## Implementation plan (suggested order)
1. **Model and logic:** `tankCapacity`, `isFull`, `fuel.ts` with tests (full refill, overflow calibration, active session, no tank), `format.ts` with tests. These don't depend on the UI.
2. **Tokens and fonts:** extend `src/theme/index.ts` and `platform.ts`. Dark theme = 5d.
3. **Home:** running and idle cards, sorting, undo snackbar, short maintenance titles, per-minute timer.
4. **Generator screen:** session card, (i) info, maintenance bars with caption and limit tick, live motor hours, live-bar footer (1 vs ≥ 2 others).
5. **Refill sheet:** presets, checkbox, calibration messages, running block, "Start again".
6. **iOS native:** `UITabBar` accessory for the live bar (iOS 26) where tabs are visible. Verify layout insets so the live bar never covers content (the same bug class as the current tab-bar overlap).
7. **Settings:** night-red hint (5h), `tankCapacity` field in the add/edit generator form.
8. **e2e:** extend `e2e/core-flows.spec.ts`: start → stop → undo; refill while running → stop and refill → save → start again; two running at once.

## Assets
- `assets/flash.svg`, `assets/chart.svg`, `assets/cog.svg` are copied from the repo's `assets/tabs/`. Keep using the originals.
- Play and stop glyphs are drawn shapes (a triangle and a square). Use the existing icon set if it has equivalents, e.g. `ICONS.play` / `ICONS.stop`.
- No new images.

## Files
- `Generator Tracker 3.0.dc.html` — final mocks: 5a (light Home / generator / refill), 5d (dark Home / generator), 5f (dark refill), 5g (collapsed live bar), 5h (night-red Settings hint). Open in a browser; needs `support.js` and `assets/` beside it.
- `tokens.ts`, `fuel.ts`, `format.ts` — code to move into `src/theme` and `src/utils`.
- `i18n/uk.additions.json`, `i18n/en.additions.json` — new strings. Existing keys in `uk.json` are reused where possible (`detail.activeSession`, `maintenance.hoursOverdue`, `common.cancel` …).
- The exploration history (directions 1a–4a, with the review notes as captions) is in `Redesign Directions.dc.html` in the design project, kept for context.

## Sample data in the mocks
Tank sizes (Honda 3.6 L, Hyundai 25 L, Atlas 72 L), consumption figures for Hyundai and Atlas, their maintenance items and the 3.2 L "last refill" are placeholders. The Honda maintenance list and 0.51 L/h come from the current app's demo data (`scripts/demo-data/seed.py`).
