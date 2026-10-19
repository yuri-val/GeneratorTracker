// Product Hunt gallery (1270×760) and thumbnail (240×240), in the 3.0 store-creative style.
// Run from the repo root:  node marketing/producthunt/render.mjs
// Screenshots: store/app-store/iphone69-en (local, git-ignored); falls back to landing/assets/screens.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = 'marketing/producthunt';
const shot = (n) => {
  const png = `store/app-store/iphone69-en/ios-en-${n}.png`;
  return 'file://' + path.resolve(fs.existsSync(png) ? png : `landing/assets/screens/ios-en-${n}.jpg`);
};
const font = (w) => `@font-face{font-family:Plex;font-weight:${w};src:url(file://${path.resolve(`landing/fonts/plex-sans-${w}.woff2`)})}`;
const css = `${font(500)}${font(700)}
*{box-sizing:border-box;margin:0}
html,body{width:1270px;height:760px;overflow:hidden;background:#f3f1ec;font-family:Plex,system-ui,sans-serif;color:#1b1a17;-webkit-font-smoothing:antialiased}
.stage{position:relative;width:100%;height:100%;overflow:hidden}
.phone{position:absolute;aspect-ratio:1320/2868;border-radius:13%/6%;padding:1.1%;background:#1b1a17;box-shadow:0 40px 80px -36px rgba(27,26,23,.6)}
.phone img{width:100%;height:100%;display:block;border-radius:11.6%/5.4%;object-fit:cover}
h1{font-weight:700;letter-spacing:-.03em;line-height:1.05}
em{font-style:normal;box-shadow:inset 0 -.14em 0 #ff6b35}
.rule{height:2px;background:#1b1a17;width:120px;margin:28px 0}
ul{list-style:none;padding:0;font-weight:500;font-size:25px;line-height:1.45;color:#3d3a34}
li{margin:0 0 14px;padding-left:34px;position:relative}
li::before{content:"";position:absolute;left:0;top:.55em;width:16px;height:3px;background:#ff6b35}
.text{position:absolute;left:84px;top:110px;width:560px}
.text h1{font-size:58px}
.cover h1{position:absolute;top:58px;left:0;right:0;text-align:center;font-size:62px}
.cover .sub{position:absolute;top:150px;left:0;right:0;text-align:center;font-size:26px;font-weight:500;color:#4f4b43}
.tag{display:inline-block;margin-top:30px;font-size:20px;font-weight:500;color:#4f4b43;border:1.5px solid #1b1a17;padding:8px 14px}`;
const ph = (n, style) => `<div class="phone" style="${style}"><img src="${shot(n)}"></div>`;
const text = (title, items, tag = '') =>
  `<div class="text"><h1>${title}</h1><div class="rule"></div><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>${tag && `<span class="tag">${tag}</span>`}</div>`;

const slides = {
  '1-cover': `<div class="stage cover"><h1>Every run hour. <em>Every litre.</em></h1>
    <div class="sub">A logbook for your power generator · iPhone &amp; Android · open source</div>
    ${ph('charts', 'width:200px;left:180px;top:290px;transform:rotate(-8deg)')}
    ${ph('maintenance', 'width:200px;left:400px;top:240px;transform:rotate(-3deg)')}
    ${ph('home-dark', 'width:230px;left:520px;top:215px;z-index:2')}
    ${ph('active', 'width:200px;left:670px;top:240px;transform:rotate(3deg)')}
    ${ph('home', 'width:200px;left:890px;top:290px;transform:rotate(8deg)')}</div>`,
  '2-start-stop': `<div class="stage">${text('One tap to <em>start and stop</em>', [
    'Engine hours count themselves',
    'Running generators rise to the top with a live timer',
    'Several can run at once; Undo a mistaken Stop',
    'Forgot to tap? Fix the start time later'])}
    ${ph('home', 'width:270px;left:720px;top:120px;transform:rotate(-4deg)')}
    ${ph('active', 'width:270px;left:950px;top:160px;transform:rotate(4deg)')}</div>`,
  '3-fuel': `<div class="stage">${text('Know how much <em>fuel is left</em>', [
    'Tank size in — fuel and runtime left out',
    'Refill in a few taps: to full, same as last time or ±',
    'Litres per hour calculated from your refills',
    'Refill is locked while the engine runs'])}
    ${ph('refill', 'width:270px;left:720px;top:120px;transform:rotate(-4deg)')}
    ${ph('active', 'width:270px;left:950px;top:160px;transform:rotate(4deg)')}</div>`,
  '4-maintenance': `<div class="stage">${text('Maintenance <em>on time</em>', [
    'Oil, filters, spark plugs — by engine hours, days or both',
    'See how much of each interval is used',
    'Overdue service shows on the home screen',
    'Monthly charts of hours and fuel per generator'])}
    ${ph('maintenance', 'width:270px;left:720px;top:120px;transform:rotate(-4deg)')}
    ${ph('charts', 'width:270px;left:950px;top:160px;transform:rotate(4deg)')}</div>`,
  '5-private': `<div class="stage">${text('Offline. Private. <em>Open source.</em>', [
    'Everything stays on your phone and works offline',
    'Account optional — only syncs your own devices',
    'Big buttons and a true black theme for blackouts',
    'English and Ukrainian · phones and tablets'], 'MIT · github.com/yuri-val/GeneratorTracker')}
    ${ph('home-dark', 'width:290px;left:830px;top:110px;transform:rotate(3deg)')}</div>`,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1270, height: 760 }, deviceScaleFactor: 2 });
for (const [name, body] of Object.entries(slides)) {
  // A file:// page, so the file:// screenshots and fonts may load (about:blank blocks them).
  const tmp = path.resolve(`${OUT}/_slide.html`);
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
  await page.goto('file://' + tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/gallery-${name}.png` });
}
await browser.close();
fs.rmSync(path.resolve(`${OUT}/_slide.html`), { force: true });
