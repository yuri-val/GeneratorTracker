# Чекліст випуску 3.0 → 3.1 (монетизація)

Позначки: **Я** — робить Claude, **Ти** — тільки власник (паролі, договори, банк, кнопки Submit/Publish),
**Разом** — Claude готує й заповнює, власник підтверджує. Порядок — зверху вниз; ⛔ = блокує наступні кроки.

## A. Облікові записи й договори

- [x] **A1. AdMob: реєстрація** — Ти. Той самий Google-акаунт, що й Play Console; Україна, USD, Individual.
- [ ] **A2. App Store Connect: договір Paid Apps → Active** — Ти. ⛔ без нього покупки на iOS не працюють
      (Business → Agreements: банк, податкова форма W-8BEN, контакти).
- [ ] **A3. Google Play: платіжний профіль продавця** — перевірити, що активний (платний застосунок уже
      продається, тож майже напевно так) — Разом.

## B. AdMob (після A1)

- [x] **B1. Додати застосунки** Generator Tracker Lite (Android) і Generator Tracker: Run Hours (iOS) як
      неопубліковані — Разом.
- [x] **B2. Рекламні блоки**: Banner + Interstitial у кожному — Разом.
- [x] **B3. Privacy & messaging** — Разом:
      - [x] GDPR (ЄЕЗ/Британія/Швейцарія) «Generator Tracker - GDPR» — **опубліковано** 2026-10-17 (Lite + Run Hours,
        en/uk/pl/de/cs, кнопка «Не погоджуюся»). Відкликання згоди — Налаштування → «Налаштування приватності реклами».
      - [x] IDFA explainer (iOS) «Generator Tracker - IDFA explainer» — опубліковано (en + uk).
      - [x] Штати США «Generator Tracker - US states» — опубліковано (Lite + Run Hours, en).
- [ ] **B5. app-ads.txt** — сайт переїжджає на `https://generatortracker.yuri-val.dev/` (GitHub Pages, custom domain):
      - [ ] DNS: `generatortracker.yuri-val.dev  CNAME  yuri-val.github.io.` — Ти.
      - [ ] Pages → custom domain + Enforce HTTPS (після DNS) — Я.
      - [x] `app-ads.txt` генерує `landing/build.py`; `cname:` у деплой-воркфлоу; усі URL сайту оновлено (PR #11).
      - [ ] «Сайт розробника» = `https://generatortracker.yuri-val.dev` у Play (обидва застосунки) і App Store (Support/Marketing URL) — Разом.
      - [ ] QR `landing/assets/qr-get.svg` веде на старий `/get/` (працює через переадресацію GitHub) — перегенерувати — Я.

## C. Код (поки йдуть A/B)

- [x] **C0. Окремі ad unit ID для Android і iOS** — зараз у коді одна пара `EXPO_PUBLIC_ADMOB_*`; AdMob видає
      різні блоки для кожної платформи → зробити `…_ANDROID` / `…_IOS` — Я.
- [ ] **C1. Перевірка реклами з реальними ID** на емуляторі/симуляторі (тестові пристрої, без кліків) — Я.
- [ ] **C2. Sandbox-покупки**: iOS — Sandbox-тестер у TestFlight; Android — License testers — Разом.

## D. Google Play — Generator Tracker Lite (застосунок створено ✅)

- [ ] **D1. Перша збірка** `production-lite` → трек internal — Я (submit — Ти або з дозволу).
- [ ] **D2. In-app products** `gt_remove_ads` $0.99, `gt_unlimited` $0.99, `gt_everything` $1.49 (після D1) — Разом.
- [ ] **D3. Сторінка в магазині**: назва, короткий/повний опис (`description/lite/`), іконка 512
      (`store/icon/play-store-512.png`), feature graphic 1024×500, скріншоти (`store/play/phone-*-1200x2400`) — Разом.
- [ ] **D4. Розділ «Контент додатка»**: політика конфіденційності (URL), реклама — «так», доступ до застосунку,
      вікова категорія (анкета IARC), цільова аудиторія 18+ (не діти — інакше Families-правила для реклами),
      Data safety (Advertising ID, approximate location, app interactions → AdMob; purchase history),
      фінансові функції — «ні», державний застосунок — «ні» — Разом.
- [ ] **D5. Закрите тестування** ⛔: ≥12 тестувальників ≥14 днів (вимога для особистих акаунтів), потім заявка
      на робочу версію — Ти збираєш тестувальників, Я готую трек і листа-запрошення.
- [ ] **D6. OAuth для Google Sign-In у Lite**: Android client ID (пакет Lite + SHA-1 ключа підпису Play)
      у Google Cloud, SHA-1 у Firebase, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` для профілів `*-lite` — Разом.

## E. Google Play — платний Generator Tracker

- [ ] **E1. 3.0.0 (1015) в alpha** — чекає перевірки Google; після неї — промоут у робочу версію — Ти.
- [ ] **E2. Оновити сторінку**: нова іконка, скріншоти 3.0 (`store/play/`), опис (`description/en|uk.md`),
      новий feature graphic — Разом.
- [ ] **E3. 3.1.0 (full)**: для платного змін майже немає (рядок «Session running»); випускати разом із Lite
      або пропустити — рішення Ти.

## F. App Store — iOS (один безкоштовний застосунок з покупками)

- [ ] **F1. Рішення по 2.6.0**, що 10+ днів у черзі: чекати / запит Apple / зняти й подати одразу 3.1 — Ти.
      Рекомендація: подавати 3.1 (одна перевірка замість двох).
- [ ] **F2. Ціна Free** у Pricing and Availability — Разом.
- [ ] **F3. Три покупки** Non-Consumable (ті самі ID і ціни), локалізації uk/en, скріншот для рецензії (після A2) — Разом.
- [ ] **F4. Збірка 3.1.0** через EAS → TestFlight (altool) — Я.
- [ ] **F5. Версія 3.1.0 в ASC**: тексти й «Що нового» (`store/app-store/listing.json`), скріншоти iPhone/iPad
      (`store/app-store/`), нотатки для рецензента (`review-notes.txt`), покупки прив'язати до версії — Разом.
- [ ] **F6. App Privacy**: Advertising Data, Device ID, Coarse Location, Purchase History; Tracking — так (ATT) — Разом.
- [ ] **F7. Відео з фізичного iPhone** (3.1 з TestFlight) для рецензента, як просили в 2.1 — Ти.
- [ ] **F8. Submit for Review** — Ти.

## G. GitHub і сайт

- [ ] **G1. PR #11** (3.1.0) — мердж після того, як консолі готові: лендінг одразу говорить про безкоштовні
      видання й покупки — Ти.
- [ ] **G2. Лендінг**: посилання на Lite у Google Play, коли сторінка стане публічною (кнопка «Безкоштовна версія»),
      `/get/` з вибором видання — Я.
- [ ] **G3. Політика конфіденційності** вже оновлена в PR #11 (розділи «Реклама», «Покупки») — викотиться з мерджем.

## Поточний крок (оновлено)

**B3** — опублікувати GDPR-повідомлення, створити IDFA explainer і повідомлення для штатів США. Далі **B5** (app-ads.txt)
і **D1** (перша збірка Lite в internal testing).
