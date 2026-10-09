// Generator Tracker 3.0 — design tokens (light = 5a, dark = 5d).
// Drop-in companion for src/theme/index.ts. Map these into the MD3 theme
// (react-native-paper) and into the iOS surfaces in src/theme/platform.ts.

export const palette = {
  light: {
    bg: '#F3F1EC',            // screen background (warm paper)
    ink: '#1B1A17',           // primary text, hairline rules, Start outline, running-card surface
    inkMuted: '#6E6A60',      // secondary text (≥ 4.9:1 on bg)
    inkFaint: '#A39E93',      // placeholder / disabled text (decorative only)
    rule: 'rgba(27,26,23,0.15)',      // row dividers
    ruleStrong: '#1B1A17',            // 1.5px section rules, top of tab bar
    pressed: '#E8E5DD',       // pressed / hover fill for outline buttons
    // running card (inverted ink)
    runSurface: '#1B1A17',
    runText: '#F3F1EC',
    runMuted: '#A8A398',
    runRule: '#3A3833',
    runOutline: '#57534B',    // secondary button border on running card
    infoSurface: '#2A2925',   // ⓘ explanation box on running card
  },
  dark: {
    bg: '#000000',            // true black (OLED). If smearing shows on device tests → '#0A0A0A'
    surface1: '#121211',      // sheets, grouped lists (ТО list)
    surface2: '#1A1918',      // idle Start button fill, + button
    surface3: '#24231F',      // RUNNING card (raised), live bar, presets
    surface4: '#33322D',      // secondary button on running card
    rule: '#1C1B19',
    ruleStrong: '#33322D',
    text: '#F5F2EA',
    textIdle: '#BDB8AD',      // idle generator name (dimmed)
    textMuted: '#A8A398',     // secondary on surface3 (≥ 6:1)
    textFaint: '#8C877C',     // tertiary on black (≥ 5.3:1) — also disabled-form text
    disabledRule: '#4A4842',
  },
  status: {
    running: { light: '#7BD88F', onLight: '#1E7A36', dark: '#7BD88F' }, // "light" = on ink card
    stop: '#C0392B',          // Stop / destructive fill; white text 5.4:1
    stopOnText: '#FFFFFF',
    due:  { light: '#C4321F', dark: '#FF8A78' },   // overdue (Час ТО)
    soon: { light: '#B86E0A', dark: '#FFC266' },   // due soon (Скоро ТО)
    ok:   { light: '#1B1A17', dark: '#D9D5CB' },   // OK — neutral, never green
    warnBg: { light: '#FCEFD9', dark: '#2A2010' }, warnText: { light: '#8A5300', dark: '#FFC266' },
    dangerBg: { light: '#FBE9E5', dark: '#2A1210' }, dangerBorder: { light: '#C4321F', dark: '#E0533F' },
    dangerTitle: { light: '#8E2415', dark: '#FF8A78' }, dangerBody: { light: '#5E2A20', dark: '#E8C9C2' },
    success: '#2F7D4A',
    undoAction: '#F2B35C',    // "Скасувати" text on snackbar
    fuelBar: '#F2B35C',
  },
  // Generator identity colours — deliberately free of red / amber / green.
  // Assign by creation order, cycle after 6.
  generator: ['#4C6EDB', '#8A5CC9', '#2F86A6', '#C9508C', '#5E6673', '#8B6A4F'],
} as const;

export const type = {
  sans: 'IBM Plex Sans',      // all labels (Cyrillic supported)
  mono: 'IBM Plex Mono',      // DIGITS ONLY: timer, litres, hours, L/h, times of day
  // [size, lineHeight, weight]
  largeTitle: [30, 30, '700'], // "Генератори" (letterSpacing -0.6)
  screenTitle: [28, 29, '700'],// generator name on detail (letterSpacing -0.56)
  sheetTitle: [22, 28, '700'],
  cardTitle: [17, 22, '600'],
  body: [15, 20, '400'],
  rowTitle: [14, 18, '500'],
  meta: [13, 18, '400'],
  caption: [12, 16, '400'],
  tab: [11, 14, '600'],        // active 600, inactive 400
  timerHome: [28, 28, '600'],  // "2 год 22 хв" sans + tabular-nums (light); 30 in dark
  timerDetail: [48, 48, '500'],// mono "2:22:17", letterSpacing -1.4
  stepper: [36, 36, '500'],    // mono litres in refill sheet
} as const;

export const space = { xs: 4, s: 6, m: 8, l: 12, xl: 14, xxl: 16, screenX: 20, section: 18 } as const;

export const size = {
  hit: 44,                     // minimum hit target
  startStop: { w: 76, h: 56 }, // square Start/Stop on Home rows & cards
  primaryButton: 52,           // Stop / Запустити сесію on detail (56 in sheets)
  liveBar: 60,                 // live bar height; inset 12 from sides, 26 from bottom
  tabBar: 76,
  accentRule: { w: 3, h: 16 }, // generator colour rule next to name (4×24 on detail title)
  hairline: 1, rule: 1.5,
  radius: 0,                   // the system is square; only the phone/OS chrome is rounded
} as const;
