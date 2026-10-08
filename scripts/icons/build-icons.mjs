// Generates the app icon (C4 "meter": dark glass, gauge ticks, glowing orange 3/4 run-hours ring, white bolt) as SVG
// sources and every PNG the app and the landing page use. Geometry lives here; edit the numbers and re-run:
//   node scripts/icons/build-icons.mjs        (Node 22; Playwright comes from the repo's node_modules)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const C = 512;

const DEFS = `
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2F38"/><stop offset="0.55" stop-color="#171A20"/><stop offset="1" stop-color="#0B0D10"/></linearGradient>
  <radialGradient id="sheen" cx="0.5" cy="0" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  <linearGradient id="orangeRing" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF5A1F"/><stop offset="1" stop-color="#FFB15C"/></linearGradient>
  <linearGradient id="white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6ECF2"/></linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
  <filter id="glowS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`;

// Chunky bolt: unit shape ~0.8 wide x 1 tall, centred; corners rounded by a same-colour stroke.
const bolt = (h, fill) => {
  const unit = [[0.5, 0], [0.1, 0.58], [0.45, 0.58], [0.36, 1], [0.9, 0.4], [0.55, 0.4], [0.86, 0]];
  const d = 'M' + unit.map(([x, y]) => `${(C + (x - 0.5) * h).toFixed(1)} ${(C + (y - 0.5) * h).toFixed(1)}`).join(' L') + ' Z';
  return `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${Math.round(h * 0.07)}" stroke-linejoin="round"/>`;
};
// 3/4 ring running clockwise from 6 o'clock to 3 o'clock (the gap sits bottom-right), optional faint track.
const ring = (r, w, color, track) => {
  const circ = 2 * Math.PI * r;
  return (track ? `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="${track}" stroke-width="${w}"/>` : '') +
    `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ` +
    `stroke-dasharray="${(circ * 0.75).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(90 ${C} ${C})"/>`;
};
// Gauge ticks every 30° over the top 270°, every third one longer.
const ticks = (s, mono) => Array.from({ length: 10 }, (_, i) => {
  const major = i % 3 === 0;
  const y2 = C - (major ? 380 : 402) * s;
  return `<line x1="${C}" y1="${C - 432 * s}" x2="${C}" y2="${y2}" stroke="#FFFFFF" stroke-opacity="${mono ? 1 : major ? 0.6 : 0.35}" ` +
    `stroke-width="${(major ? 14 : 10) * s}" stroke-linecap="round" transform="rotate(${i * 30 - 135} ${C} ${C})"/>`;
}).join('');
const svg = (body, rounded = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${DEFS}` +
  (rounded ? '<clipPath id="squircle"><rect width="1024" height="1024" rx="230"/></clipPath>' : '') +
  `</defs><g${rounded ? ' clip-path="url(#squircle)"' : ''}>${body}</g></svg>`;

const glow = (inner, filter, opacity) => `<g filter="url(#${filter})" opacity="${opacity}">${inner}</g>`;
// Full mark at scale s (1 = ticks reach 84% of the canvas); mono = single-colour layer for themed icons.
const mark = (s, mono = false) => mono
  ? ticks(s, true) + ring(330 * s, 78 * s, '#FFFFFF') + bolt(370 * s, '#FFFFFF')
  : ticks(s) + glow(ring(330 * s, 78 * s, '#FF6B35'), 'glow', 0.5) + ring(330 * s, 78 * s, 'url(#orangeRing)', 0.08) +
    glow(bolt(370 * s, '#FFFFFF'), 'glowS', 0.3) + bolt(370 * s, 'url(#white)');
const background = '<rect width="1024" height="1024" fill="url(#base)"/><rect width="1024" height="1024" fill="url(#sheen)"/>';
// Android adaptive icon: 108 dp canvas, launchers show the central 72 dp and guarantee the central 66 dp,
// so the mark is scaled to ~53% of the canvas (ticks included).
const ADAPTIVE = 0.63;

const sources = {
  'icon.svg': svg(background + mark(1)),
  'icon-rounded.svg': svg(background + mark(1), true),
  'adaptive-background.svg': svg(background),
  'adaptive-foreground.svg': svg(mark(ADAPTIVE)),
  'monochrome.svg': svg(mark(ADAPTIVE, true)),
};
const srcDir = path.join(root, 'assets/icon-source');
fs.mkdirSync(srcDir, { recursive: true });
for (const [name, content] of Object.entries(sources)) fs.writeFileSync(path.join(srcDir, name), content + '\n');

// [source, output, size, transparent]
const outputs = [
  ['icon.svg', 'assets/icon.png', 1024, false],                 // iOS + Expo (no alpha: App Store rejects it)
  ['adaptive-foreground.svg', 'assets/adaptive-icon.png', 1024, true],
  ['adaptive-background.svg', 'assets/adaptive-icon-background.png', 1024, false],
  ['monochrome.svg', 'assets/adaptive-icon-monochrome.png', 1024, true],
  ['icon-rounded.svg', 'assets/splash-icon.png', 1024, true],
  ['icon-rounded.svg', 'assets/favicon.png', 256, true],
  ['icon.svg', 'store/icon/play-store-512.png', 512, false],    // Google Play listing icon (Play rounds it)
  ['icon.svg', 'landing/assets/app-icon.png', 256, false],      // CSS rounds it on the page
  ['icon.svg', 'landing/apple-touch-icon.png', 180, false],
  ['icon.svg', 'landing/icon-192.png', 192, false],
  ['icon.svg', 'landing/icon-512.png', 512, false],
  ['icon-rounded.svg', 'landing/favicon.png', 64, true],
];
const browser = await chromium.launch();
for (const [src, out, size, transparent] of outputs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const markup = fs.readFileSync(path.join(srcDir, src), 'utf8').replace('width="1024" height="1024"', `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  await page.screenshot({ path: path.join(root, out), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log(out);
}
await browser.close();
// The landing favicon is the SVG itself (rounded, so browser tabs show the icon shape).
fs.copyFileSync(path.join(srcDir, 'icon-rounded.svg'), path.join(root, 'landing/favicon.svg'));
console.log('landing/favicon.svg');
