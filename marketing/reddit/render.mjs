// Reddit post images (1200×800 @2x), one per audience, in the 3.0 store-creative style.
// Run from the repo root:  node marketing/reddit/render.mjs
// Screenshots: store/app-store/iphone69-{en,uk} (local, git-ignored); falls back to landing/assets/screens.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = 'marketing/reddit';
const shot = (n, lang = 'en') => {
  const png = `store/app-store/iphone69-${lang}/ios-${lang}-${n}.png`;
  return 'file://' + path.resolve(fs.existsSync(png) ? png : `landing/assets/screens/ios-${lang}-${n}.jpg`);
};
const font = (w) => `@font-face{font-family:Plex;font-weight:${w};src:url(file://${path.resolve(`landing/fonts/plex-sans-${w}.woff2`)})}`;
const css = `${font(500)}${font(700)}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:800px;overflow:hidden;background:#f3f1ec;font-family:Plex,system-ui,sans-serif;color:#1b1a17;-webkit-font-smoothing:antialiased}
body.dark{background:#0d0d0c;color:#f3f1ec}
.stage{position:relative;width:100%;height:100%;overflow:hidden}
.phone{position:absolute;aspect-ratio:1320/2868;border-radius:13%/6%;padding:1.1%;background:#1b1a17;box-shadow:0 40px 80px -36px rgba(27,26,23,.6)}
.dark .phone{background:#3a3833;box-shadow:0 40px 90px -30px rgba(0,0,0,.9)}
.phone img{width:100%;height:100%;display:block;border-radius:11.6%/5.4%;object-fit:cover}
.kicker{font-size:19px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#6f6a60}
.dark .kicker{color:#a19c92}
h1{font-weight:700;letter-spacing:-.03em;line-height:1.04;font-size:56px;margin-top:14px}
em{font-style:normal;box-shadow:inset 0 -.14em 0 #ff6b35}
.rule{height:2px;background:currentColor;width:110px;margin:26px 0}
ul{list-style:none;padding:0;font-weight:500;font-size:24px;line-height:1.4;color:#3d3a34}
.dark ul{color:#d8d4cb}
li{margin:0 0 12px;padding-left:32px;position:relative}
li::before{content:"";position:absolute;left:0;top:.55em;width:16px;height:3px;background:#ff6b35}
.text{position:absolute;left:72px;top:78px;width:600px}
.foot{position:absolute;left:72px;bottom:54px;font-size:19px;font-weight:500;color:#4f4b43;border:1.5px solid currentColor;padding:8px 14px}
.dark .foot{color:#d8d4cb}`;

const ph = (n, lang, style) => `<div class="phone" style="${style}"><img src="${shot(n, lang)}"></div>`;
// Two phones on the right: the main one in front, the second tilted behind it.
const card = ({ kicker, title, items, foot, lang = 'en', shots: [a, b] }) =>
  `<div class="stage"><div class="text"><div class="kicker">${kicker}</div><h1>${title}</h1><div class="rule"></div>
  <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div><div class="foot">${foot}</div>
  ${ph(b, lang, 'width:250px;left:905px;top:118px;transform:rotate(6deg)')}
  ${ph(a, lang, 'width:270px;left:700px;top:84px;transform:rotate(-3deg);z-index:2')}</div>`;

const EN_FOOT = 'Free · offline · open source (MIT)';
const cards = {
  // r/Generator, r/smallengines
  generator: { kicker: 'For portable generators', title: 'No hour meter? <em>Count engine hours</em> with one tap', shots: ['active', 'charts'],
    items: ['Start / Stop — hours count themselves', 'Break-in and 100-hour oil change reminders', 'Fuel left and litres per hour from refills', 'Several generators at once'], foot: EN_FOOT },
  // r/OffGrid, r/OffGridLiving, r/SolarDIY
  offgrid: { kicker: 'Off-grid backup', title: 'Your backup generator, <em>logged</em>', shots: ['charts', 'home'],
    items: ['Monthly run hours and fuel — see what solar didn’t cover', 'Oil, filter and plug intervals by hours or days', 'Works with no internet, no account', 'Overdue service on the home screen'], foot: EN_FOOT },
  // r/homestead
  homestead: { kicker: 'Farm & backup generators', title: 'Hours, fuel and <em>oil changes</em> in your pocket', shots: ['maintenance', 'refill'],
    items: ['Well pump, barn or house backup — log them all', 'Tank size in → fuel and runtime left', 'Service by engine hours, days or both', 'Big buttons for gloves and the dark'], foot: EN_FOOT },
  // r/preppers, r/prepping
  preppers: { kicker: 'Grid-down ready', title: 'Know your <em>fuel runway</em>', shots: ['active', 'charts'],
    items: ['Real litres per hour from your own refills', 'Fuel and runtime left for every generator', 'Fully offline — data stays on the phone', 'True black theme saves battery in a blackout'], foot: EN_FOOT },
  // r/GoRVing, r/rvs, r/boating, r/liveaboard
  'rv-boat': { kicker: 'RV & marine gensets', title: 'Genset hours <em>on the road</em> and on the water', shots: ['home', 'maintenance'],
    items: ['One tap per run — no spreadsheet', 'Service by hours plus monthly exercise reminders', 'Fuel per hour from fill-ups', 'No signal needed in the middle of nowhere'], foot: EN_FOOT },
  // r/Nigeria, r/southafrica, r/Philippines — daily outages
  outages: { kicker: 'Daily power cuts', title: 'Running a generator <em>every day?</em>', shots: ['active', 'refill'],
    items: ['How many hours since the last oil change', 'How much petrol is left and burns per hour', 'Reminders for oil, filters and plugs', 'Works when the outage takes the network down'], foot: EN_FOOT },
  // r/reddit_ukr, r/Ukraine_UA, r/kyiv
  uk: { kicker: 'Для генераторів під відключення', title: 'Мотогодини, пальне й ТО — <em>без зошита</em>', lang: 'uk', shots: ['active', 'home'],
    items: ['Старт / стоп — мотогодини рахуються самі', 'Залишок пального й витрата л/год', 'Нагадування про мастило, фільтри, свічки', 'Працює без інтернету й без реєстрації'], foot: 'Безкоштовно · офлайн · відкритий код' },
  // r/PuertoRico (the app is English/Ukrainian — say so in the post)
  es: { kicker: 'Para apagones', title: 'Horas, combustible y <em>cambios de aceite</em>', shots: ['active', 'refill'],
    items: ['Un toque al encender y apagar', 'Combustible restante y litros por hora', 'Recordatorios de aceite, filtros y bujías', 'Funciona sin internet, sin cuenta'], foot: 'Gratis · sin internet · código abierto' },
  // r/SideProject, r/ShowYourApp, r/iOSApps — builder story, dark
  sideproject: { kicker: 'Built during Ukraine’s blackouts', title: 'An <em>offline-first</em> logbook for generators', shots: ['home-dark', 'charts'], dark: true,
    items: ['Expo / React Native · SwiftUI forms · Material 3', 'Offline-first sync: pending state + tombstones', 'Pure last-write-wins merge, Firestore optional', 'iOS free · Android paid + free Lite'], foot: 'MIT · github.com/yuri-val/GeneratorTracker' },
  // r/TestFlight, r/AndroidClosedTesting
  testers: { kicker: 'Testers wanted', title: 'Help ship the <em>free Android</em> version', shots: ['home', 'active'],
    items: ['iPhone: public TestFlight beta', 'Android: free Lite in closed testing', 'Google needs 12 testers for 14 days', 'Feedback in English or Ukrainian'], foot: 'Free · offline · open source (MIT)' },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
const tmp = path.resolve(`${OUT}/_card.html`);
for (const [name, c] of Object.entries(cards)) {
  // A file:// page, so the file:// screenshots and fonts may load (about:blank blocks them).
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body class="${c.dark ? 'dark' : ''}">${card(c)}</body></html>`);
  await page.goto('file://' + tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/cover-${name}.png` });
}
await browser.close();
fs.rmSync(tmp, { force: true });
