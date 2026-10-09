// Generator Tracker 3.0 — design tokens (light = 5a, dark = 5d).
// Colours, type scale and sizes of the 3.0 design (copied from docs/design/redesign-3.0/tokens.ts).
// Mapped into the Paper themes in src/theme/index.ts; screens use useAppTheme().gt.

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

/** Font family names registered by loadAppFonts() (src/theme/fonts.ts). One family per weight. */
export const FONT = {
  sans400: 'IBMPlexSans_400Regular',
  sans500: 'IBMPlexSans_500Medium',
  sans600: 'IBMPlexSans_600SemiBold',
  sans700: 'IBMPlexSans_700Bold',
  mono400: 'IBMPlexMono_400Regular',
  mono500: 'IBMPlexMono_500Medium',
} as const;

/**
 * Colours of the 3.0 design resolved for one scheme. Screens read these through
 * `useAppTheme().gt` so light (5a) and dark (5d) share one set of names.
 */
export interface GtColors {
  dark: boolean;
  bg: string;
  surface: string; // grouped lists, sheets
  raised: string; // presets, chips
  text: string;
  textMuted: string;
  textFaint: string;
  rule: string;
  ruleStrong: string;
  pressed: string;
  // running card
  runSurface: string;
  runText: string;
  runMuted: string;
  runRule: string;
  runOutline: string;
  runInfo: string;
  runInfoText: string;
  running: string; // "● running" on a running card
  runningOnBg: string; // "● running" on the page background
  // idle row
  idleName: string;
  idleButtonBg: string;
  idleButtonBorder: string;
  idleButtonText: string;
  // status
  stop: string;
  onStop: string;
  due: string;
  soon: string;
  ok: string;
  warnBg: string;
  warnText: string;
  dangerBg: string;
  dangerBorder: string;
  dangerTitle: string;
  dangerBody: string;
  disabledText: string;
  disabledRule: string;
  snackBg: string;
  snackText: string;
  snackAction: string;
  barTrack: string;
}

const L = palette.light;
const D = palette.dark;
const S = palette.status;

export const gtLight: GtColors = {
  dark: false,
  bg: L.bg,
  surface: L.bg,
  raised: L.pressed,
  text: L.ink,
  textMuted: L.inkMuted,
  textFaint: L.inkFaint,
  rule: L.rule,
  ruleStrong: L.ruleStrong,
  pressed: L.pressed,
  runSurface: L.runSurface,
  runText: L.runText,
  runMuted: L.runMuted,
  runRule: L.runRule,
  runOutline: L.runOutline,
  runInfo: L.infoSurface,
  runInfoText: '#C9C4B8',
  running: S.running.light,
  runningOnBg: S.running.onLight,
  idleName: L.ink,
  idleButtonBg: 'transparent',
  idleButtonBorder: L.ink,
  idleButtonText: L.ink,
  stop: S.stop,
  onStop: S.stopOnText,
  due: S.due.light,
  soon: S.soon.light,
  ok: S.ok.light,
  warnBg: S.warnBg.light,
  warnText: S.warnText.light,
  dangerBg: S.dangerBg.light,
  dangerBorder: S.dangerBorder.light,
  dangerTitle: S.dangerTitle.light,
  dangerBody: S.dangerBody.light,
  disabledText: L.inkFaint,
  disabledRule: 'rgba(27,26,23,0.25)',
  snackBg: L.ink,
  snackText: L.bg,
  snackAction: S.undoAction,
  barTrack: 'rgba(27,26,23,0.1)',
};

export const gtDark: GtColors = {
  dark: true,
  bg: D.bg,
  surface: D.surface1,
  raised: D.surface3,
  text: D.text,
  textMuted: D.textMuted,
  textFaint: D.textFaint,
  rule: D.rule,
  ruleStrong: D.ruleStrong,
  pressed: D.surface3,
  runSurface: D.surface3,
  runText: D.text,
  runMuted: D.textMuted,
  runRule: D.ruleStrong,
  runOutline: D.surface4,
  runInfo: D.surface4,
  runInfoText: '#C9C4B8',
  running: S.running.dark,
  runningOnBg: S.running.dark,
  idleName: D.textIdle,
  idleButtonBg: D.surface2,
  idleButtonBorder: D.surface2,
  idleButtonText: '#D9D5CB',
  stop: S.stop,
  onStop: S.stopOnText,
  due: S.due.dark,
  soon: S.soon.dark,
  ok: S.ok.dark,
  warnBg: S.warnBg.dark,
  warnText: S.warnText.dark,
  dangerBg: S.dangerBg.dark,
  dangerBorder: S.dangerBorder.dark,
  dangerTitle: S.dangerTitle.dark,
  dangerBody: S.dangerBody.dark,
  disabledText: D.textFaint,
  disabledRule: D.ruleStrong,
  snackBg: D.surface3,
  snackText: D.text,
  snackAction: S.undoAction,
  barTrack: '#2A2925',
};

/** Identity colour of a generator: its position in creation order, cycling after six. */
export const generatorColor = (index: number) => palette.generator[((index % palette.generator.length) + palette.generator.length) % palette.generator.length];
