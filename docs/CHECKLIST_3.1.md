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
      - [x] DNS: `generatortracker.yuri-val.dev  CNAME  yuri-val.github.io.` — Ти.
      - [x] Pages → custom domain + Enforce HTTPS; старі github.io-адреси → 301 на новий домен.
      - [x] `app-ads.txt` генерує `landing/build.py`; `cname:` у деплой-воркфлоу; усі URL сайту оновлено (PR #11).
      - [x] «Сайт розробника» = `https://generatortracker.yuri-val.dev` у Play — обидва застосунки (2026-10-17, через Play API).
      - [ ] App Store: Support/Marketing URL на новий домен — разом із метаданими версії 3.1 (F) — Я.
      - [ ] **PR #12** (сайт: політика, `cname:`, `app-ads.txt` у `main`) — мердж — Ти. Зараз `/app-ads.txt` на сайті = 404,
        AdMob не підтвердить застосунки, доки PR не задеплоїться; після мерджу — «Перевірити наявність оновлень» в AdMob — Я.
      - [x] QR `landing/assets/qr-get.svg` → `https://generatortracker.yuri-val.dev/get/` (перевірено декодуванням).

## C. Код (поки йдуть A/B)

- [x] **C0. Окремі ad unit ID для Android і iOS** — зараз у коді одна пара `EXPO_PUBLIC_ADMOB_*`; AdMob видає
      різні блоки для кожної платформи → зробити `…_ANDROID` / `…_IOS` — Я.
- [ ] **C1. Перевірка реклами з реальними ID** на емуляторі/симуляторі (тестові пристрої, без кліків) — Я.
- [ ] **C2. Sandbox-покупки**: iOS — Sandbox-тестер у TestFlight; Android — License testers — Разом.

## D. Google Play — Generator Tracker Lite (застосунок створено ✅)

- [x] **D1. Перша збірка** `production-lite` → трек internal — 3.1.0 (versionCode 3) відправлено 2026-10-17.
- [x] **D2. In-app products** `gt_remove_ads` $0.99, `gt_unlimited` $0.99, `gt_everything` $1.49 — активні з 2026-10-17
      (варіант покупки `buy`, 174 регіони, базова ціна в USD → 54,99 / 54,99 / 79,99 ₴; назви й описи uk + en-US).
- [x] **D3. Сторінка в магазині** — 2026-10-17 через Play API: uk (за умовчанням) + en-US, тексти в `description/lite/`
      (на основі сторінки платного 3.0 + розділ «Що входить у Lite»), іконка, feature graphic з тегом LITE, по 6 скріншотів;
      категорія «Інструменти», контакти й сайт. Теги в консолі поки недоступні (необов'язково).
- [x] **D4. Розділ «Контент додатка»** — 2026-10-17, усі 11 декларацій: політика (URL нового домену), доступ — без входу,
      реклама — так, IARC (PEGI 3 / ESRB Everyone / ClassInd 14 через покупки), аудиторія 18+, державний/фінанси/здоров'я — ні,
      рекламний ID — так (аналітика, реклама, шахрайство), Data safety: AdMob-дані (приблизне місцезнаходження, діагностика,
      взаємодії, ID пристрою — збираються й передаються, обов'язково) + акаунт (ім'я, email, UID, записи — лише збираються,
      необов'язково); видалення — `privacy-policy.html#delete-your-data`. Purchase history не декларуємо: покупки лишаються
      на пристрої й у Google Play. Зміни чекають в «Огляді публікації» — підуть на перевірку разом із закритим тестом.
- [ ] **D5. Закрите тестування** ⛔: ≥12 тестувальників ≥14 днів (вимога для особистих акаунтів), потім заявка
      на робочу версію — Ти збираєш тестувальників, Я готую трек і листа-запрошення.
- [ ] **D6. Google Sign-In на Android** (була схована з 2.x: браузерний флоу Google відхиляє на Android — custom URI scheme):
      - [x] Нативний вхід `@react-native-google-signin` на Android (обидва застосунки), web без змін, iOS не лінкує SDK — Я.
      - [x] OAuth-клієнти Android у Google Cloud (2026-10-18): Lite — upload + Play-ключ, платний — Play-ключ (upload уже був).
      - [ ] Перевірка на пристрої зі збірки з internal-треку (Lite) — Разом.

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

## H. Після релізу 3.1 — Expo SDK 58 (версія 3.2)

- [ ] **H1. Оновлення на SDK 58** (RN 0.86 → 0.88, iOS 27 SDK, Xcode 27) окремою гілкою після виходу 3.1 — Я:
      `npx expo install expo@^58.0.0 --fix`, `npx expo-doctor@latest`, перегенерувати `android/` та `ios/`,
      нові dev-клієнти. Очікувано лагодить локальну iOS-збірку на Swift 6.4.
- [ ] **H2. Що перевірити**: R8 у релізних Android-збірках (keep-правила для Play Billing / AdMob, якщо щось
      зріже), сумісність react-native-bottom-tabs / react-native-paper / react-native-google-mobile-ads / expo-iap
      з RN 0.88, нова логіка `NODE_ENV` і `.env` (режим емулятора Firebase), `@expo/ui` (`Host` вирівнює вгору),
      iOS scene life cycle (у нас уже `enableSceneSupport`) — Я.
- [ ] **H3. Повний прогін**: unit, e2e (full + lite), Maestro на емуляторі/симуляторі, тестові збірки в обидва стори — Я.

## Поточний крок (оновлено)

Ти: змерджити **PR #12** (політика + `app-ads.txt` на сайт), додати свій Google-акаунт у тестувальники internal (D1).
Далі **D5** (закритий тест: 12 тестувальників × 14 днів — збір людей) і **D6** (OAuth для Lite); паралельно **F** (iOS).
