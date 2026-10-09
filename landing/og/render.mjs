// Renders the social preview images assets/og-{en,uk}.png (1200×630) from the real app screenshots.
//   cd landing/og && node render.mjs      (Node 22; Playwright comes from the repo's node_modules)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const landing = path.resolve(here, '..');
const file = (p) => 'file://' + path.resolve(landing, p);
const strings = (lang) => JSON.parse(fs.readFileSync(path.join(landing, 'i18n', `${lang}.json`), 'utf8'));

const page_html = (lang, s) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: Plex; font-weight: 400; src: url(${file('fonts/plex-sans-400.woff2')}) format("woff2"); }
@font-face { font-family: Plex; font-weight: 500; src: url(${file('fonts/plex-sans-500.woff2')}) format("woff2"); }
@font-face { font-family: Plex; font-weight: 600; src: url(${file('fonts/plex-sans-600.woff2')}) format("woff2"); }
@font-face { font-family: Plex; font-weight: 700; src: url(${file('fonts/plex-sans-700.woff2')}) format("woff2"); }
@font-face { font-family: PlexMono; font-weight: 500; src: url(${file('fonts/plex-mono-500.woff2')}) format("woff2"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
/* The app's 3.0 language: warm paper, ink, square shapes, a 1.5 px ink rule; phones are the only rounded things. */
body { position: relative; font-family: Plex, system-ui, sans-serif; color: #1b1a17; background: #f3f1ec; -webkit-font-smoothing: antialiased; }
.brand { position: absolute; left: 72px; top: 60px; display: flex; align-items: center; gap: 16px; font-size: 28px; font-weight: 700; letter-spacing: -.01em; }
.brand img { width: 64px; height: 64px; border-radius: 22%; }
h1 { position: absolute; left: 72px; top: 178px; width: 620px; font-size: 60px; line-height: 1.02; font-weight: 700; letter-spacing: -.03em; }
h1 em { font-style: normal; box-shadow: inset 0 -.14em 0 #ff6b35; }
.rule { position: absolute; left: 72px; top: 400px; width: 600px; height: 1.5px; background: #1b1a17; }
.sub { position: absolute; left: 72px; top: 418px; width: 600px; font-size: 23px; line-height: 1.35; color: #4f4b43; }
.note { position: absolute; left: 72px; top: 482px; font-size: 16px; color: #6e6a60; }
.badges { position: absolute; left: 72px; top: 522px; display: flex; gap: 12px; }
.badge { display: flex; align-items: center; gap: 12px; height: 58px; padding: 0 22px 0 16px; background: #1b1a17; color: #f3f1ec; }
.badge svg { width: 26px; height: 26px; }
.badge span { display: flex; flex-direction: column; line-height: 1.1; }
.badge small { font-size: 11px; font-weight: 500; }
.badge strong { font-size: 19px; font-weight: 600; letter-spacing: -.01em; }
.phone { position: absolute; padding: 10px; background: #1b1a17; box-shadow: 0 30px 60px -30px rgba(27,26,23,.55); }
.phone img { display: block; width: 100%; }
.android { left: 745px; top: 60px; width: 290px; border-radius: 36px; z-index: 2; }
.android img { border-radius: 28px; }
.ios { left: 985px; top: 120px; width: 250px; border-radius: 42px; transform: rotate(5deg); }
.ios img { border-radius: 34px; }
.chip { position: absolute; z-index: 3; left: 612px; top: 96px; display: flex; align-items: center; gap: 12px; padding: 12px 18px 12px 14px; background: #1b1a17; color: #f3f1ec; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #7bd88f; }
.chip span { display: flex; flex-direction: column; line-height: 1.2; }
.chip small { font-size: 13px; color: #a8a398; font-weight: 400; }
.chip strong { font-size: 19px; font-weight: 600; }
</style></head><body>
<div class="brand"><img src="${file('assets/app-icon.png')}"><span>Generator Tracker</span></div>
<h1>${s.hero_title}</h1>
<div class="rule"></div>
<p class="sub">${s.footer_tagline}</p>
<p class="note">${s.hero_note}</p>
<div class="badges">
  <div class="badge"><svg viewBox="0 0 512 512"><path fill="#00d7fe" d="M48 59.5v393c0 8.5 4.6 15.9 11.5 19.8L285 256 59.5 39.7C52.6 43.6 48 51 48 59.5z"/><path fill="#00f076" d="M352.9 188.3 107.7 46.4c-10-5.8-21.6-6.3-32-1.9L285 256l67.9-67.7z"/><path fill="#ff3a44" d="M285 256 75.7 467.5c10.4 4.4 22 3.9 32-1.9l245.2-141.9L285 256z"/><path fill="#ffd500" d="M440.9 225.6 352.9 175 285 256l67.9 67.7 88-50.3c19.7-11.3 19.7-36.5 0-47.8z"/></svg><span><small>${s.badge_play_small}</small><strong>Google Play</strong></span></div>
  <div class="badge"><svg viewBox="0 0 384 512"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg><span><small>${s.badge_ios_small}</small><strong>App Store</strong></span></div>
</div>
<div class="phone android"><img src="${file(`assets/screens/android-${lang}-active.jpg`)}"></div>
<div class="phone ios"><img src="${file(`assets/screens/ios-${lang}-home-dark.jpg`)}"></div>
<div class="chip"><span class="dot"></span><span><small>${s.chip_running_t}</small><strong>${s.chip_running_v}</strong></span></div>
</body></html>`;

const browser = await chromium.launch();
for (const lang of ['en', 'uk']) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const tmp = path.join(here, `_og-${lang}.html`);
  fs.writeFileSync(tmp, page_html(lang, strings(lang)));
  await page.goto('file://' + tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(landing, 'assets', `og-${lang}.png`) });
  await page.close();
  fs.unlinkSync(tmp);
  console.log(`assets/og-${lang}.png`);
}
await browser.close();
