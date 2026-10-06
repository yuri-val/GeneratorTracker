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
@font-face { font-family: Inter; font-weight: 400 800; src: url(${file('fonts/inter-latin.woff2')}) format("woff2"); unicode-range: U+0000-00FF, U+2000-206F; }
@font-face { font-family: Inter; font-weight: 400 800; src: url(${file('fonts/inter-cyrillic.woff2')}) format("woff2"); unicode-range: U+0400-045F, U+0490-0491; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; font-family: Inter, system-ui, sans-serif; color: #f4f5f7; -webkit-font-smoothing: antialiased;
  background: radial-gradient(55% 70% at 78% 40%, rgba(255,107,53,.30), transparent 70%), radial-gradient(35% 45% at 95% 85%, rgba(56,189,248,.14), transparent 70%), #0b0d10; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(70% 80% at 60% 30%, #000 20%, transparent 80%); }
.brand { position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 18px; font-size: 30px; font-weight: 700; letter-spacing: -.01em; }
.brand img { width: 72px; height: 72px; border-radius: 18px; }
h1 { position: absolute; left: 72px; top: 200px; width: 620px; font-size: 62px; line-height: 1.04; font-weight: 800; letter-spacing: -.035em; }
h1 em { font-style: normal; background: linear-gradient(100deg, #ff6b35 10%, #ffb347 90%); -webkit-background-clip: text; color: transparent; }
.sub { position: absolute; left: 72px; top: 414px; width: 600px; font-size: 24px; line-height: 1.35; color: #aab1bc; }
.note { position: absolute; left: 72px; top: 484px; font-size: 17px; color: #7c8591; }
.badges { position: absolute; left: 72px; top: 522px; display: flex; gap: 14px; }
.badge { display: flex; align-items: center; gap: 12px; height: 60px; padding: 0 22px 0 16px; border-radius: 15px; background: #fff; color: #0b0b0b; }
.badge svg { width: 28px; height: 28px; }
.badge span { display: flex; flex-direction: column; line-height: 1.1; }
.badge small { font-size: 11px; font-weight: 500; }
.badge strong { font-size: 20px; font-weight: 600; letter-spacing: -.01em; }
.phone { position: absolute; padding: 10px; background: linear-gradient(145deg, #2a2e36, #0a0c0f); box-shadow: 0 40px 90px -20px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.07); }
.phone img { display: block; width: 100%; }
.android { left: 745px; top: 70px; width: 290px; border-radius: 36px; z-index: 2; }
.android img { border-radius: 28px; }
.ios { left: 980px; top: 120px; width: 250px; border-radius: 42px; transform: rotate(6deg); }
.ios img { border-radius: 34px; }
.chip { position: absolute; z-index: 3; left: 690px; top: 150px; display: flex; align-items: center; gap: 12px; padding: 12px 18px 12px 14px; border-radius: 16px; background: rgba(24,28,35,.92); border: 1px solid rgba(255,255,255,.1); box-shadow: 0 20px 40px -20px rgba(0,0,0,.8); }
.dot { width: 12px; height: 12px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 5px rgba(52,211,153,.2); }
.chip span { display: flex; flex-direction: column; line-height: 1.15; }
.chip small { font-size: 13px; color: #7c8591; font-weight: 500; }
.chip strong { font-size: 19px; font-weight: 700; }
</style></head><body>
<div class="grid"></div>
<div class="brand"><img src="${file('assets/app-icon.png')}"><span>Generator Tracker</span></div>
<h1>${s.hero_title}</h1>
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
