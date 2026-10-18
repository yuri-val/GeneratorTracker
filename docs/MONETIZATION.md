# Монетизація (3.1.0): видання, реклама, покупки

## Видання

| | Android `Generator Tracker` | Android `Generator Tracker Lite` | iOS `Generator Tracker: Run Hours` |
|---|---|---|---|
| Пакет / bundle | `com.yurival.GeneratorTracker` | `com.yurival.GeneratorTrackerLite` | `com.yuri-val.generatortracker` |
| Ціна | платний (як і раніше) | безкоштовний | безкоштовний |
| Видання в коді | `full` | `lite` | `lite` |
| Реклама | ні, SDK не ініціалізується | так | так |
| Ліміти | ні | 3 генератори, 2 завдання ТО на генератор | ті самі |
| Покупки | ні | «Прибрати рекламу» $0.99, «Без обмежень» $0.99, «Усе разом» $1.49 | ті самі |
| EAS-профіль | `production` | `production-lite` (`APP_VARIANT=lite`) | `production` |

Видання визначається в `app.config.js` на етапі збірки й читається з `extra.edition`
(`src/monetization/edition.ts`). Окремого форку немає: той самий код, різні збірки.

Apple не дозволяє дві копії одного застосунку (Guideline 4.3), тому на iOS один застосунок, який
стає безкоштовним із покупками. У Google Play платний застосунок не можна зробити безкоштовним і
навпаки, тому там дві окремі позиції. Слово «Free» у назві заборонене обома сторами; «Lite» — ні.

## Що робить код

`src/monetization/`:

- `products.ts` — ID продуктів (`gt_remove_ads`, `gt_unlimited`, `gt_everything`) і права
  (`noAds`, `unlimited`; «Усе разом» дає обидва).
- `limits.ts` — чисті перевірки лімітів. Ліміти блокують лише **створення** нових записів: усе, що
  вже є на пристрої або прийшло з хмари (обліковий запис із платної версії), лишається видимим і
  робочим.
- `entitlements.tsx` — `EntitlementsProvider`/`useEntitlements()`: кеш придбаних продуктів в
  AsyncStorage (`@owned_products`), оновлення з магазину при запуску, `purchase()`, `restore()`.
  У виданні `full` провайдер інертний (усе дозволено, магазин не викликається).
- `store/expoIapStore.ts` — App Store / Google Play через `expo-iap` (non-consumable, без сервера:
  власник — обліковий запис магазину, `finishTransaction` підтверджує покупку).
  `store/fakeStore.ts` — миттєві покупки в AsyncStorage для web, Jest і dev-збірок
  (`EXPO_PUBLIC_FAKE_STORE=true`).
- `ads.ts` — AdMob: спершу згода (UMP-форма в ЄЕЗ/Британії/Швейцарії, ATT на iOS), потім
  ініціалізація SDK; одна повноекранна реклама при відкритті «Аналітики», не раніше ніж через 10 хв
  після запуску й не частіше ніж раз на 10 хв (`interstitialDue`). `AdBanner.tsx` — банер під
  шапкою «Аналітики» й «Налаштувань» із посиланням «Прибрати рекламу».
- Екран `src/screens/upgrade/UpgradeScreen.tsx` (`Upgrade` у стеку, modal) — пейвол у стилі 3.0.
  Відкривається з ліміту (Головна «+», «+ Додати завдання ТО»), з посилання під банером і з
  «Налаштування → Покупки». Там же «Відновити покупки» й «Налаштування приватності реклами».

Де реклами **немає** і не має бути (політики AdMob і здоровий глузд під час відключення світла):
головна, «Старт»/«Стоп», екран генератора, форми, запуск застосунку, після закриття іншої реклами.

## Що треба зробити в консолях (одноразово)

### AdMob
✅ 2026-10-17: обліковий запис (publisher `pub-6097353818165340`), застосунки й блоки створено:

| | App ID | Banner — Analytics/Settings | Interstitial — Analytics |
|---|---|---|---|
| Generator Tracker Lite (Android) | `ca-app-pub-6097353818165340~3630689949` | `…/2550287420` | `…/4860011134` |
| Generator Tracker: Run Hours (iOS) | `ca-app-pub-6097353818165340~4270563203` | `…/7415601293` | `…/8018236522` |

ID записані в `app.config.js` (App ID) і `src/monetization/ads.ts` (блоки); вони не секретні. Реальні блоки —
лише в релізних збірках, dev-збірки завжди беруть тестові блоки Google (`EXPO_PUBLIC_ADMOB_TEST_ADS=true`
вмикає тестові й у релізній). «Test 1C» — службовий застосунок із реєстрації, прихований.

Лишилось: Privacy & messaging (GDPR-повідомлення + IDFA explainer), `app-ads.txt` на сайті, а після публікації —
зв'язати застосунки з Google Play / App Store (до того реклама обмежена). Data safety (Play) і App Privacy (ASC):
Device ID, Coarse location, Advertising data, App interactions.

### App Store Connect (iOS)
1. Pricing and Availability → ціна **Free** (платна версія не вмикалась, нікому нічого не
   повертати).
2. In-App Purchases → три **Non-Consumable** з Product ID `gt_remove_ads`, `gt_unlimited`,
   `gt_everything`, ціни $0.99 / $0.99 / $1.49, локалізовані назви (uk/en), скріншот для рецензії
   (екран «Прибрати рекламу й обмеження»). Для цього договір Paid Apps має бути Active.
3. Додати покупки до версії 3.1.0 у полі «In-App Purchases and Subscriptions» перед відправкою
   на перевірку (перша покупка перевіряється разом із версією).
4. App Privacy: додати Advertising Data, Device ID (Tracking — лише якщо ATT), Coarse Location,
   Purchase History (не linked).

### Google Play (Lite)
1. ✅ 2026-10-17: застосунок «Generator Tracker Lite» створено (безкоштовний, мова uk, пакет
   `com.yurival.GeneratorTrackerLite` зарезервовано). Особистий акаунт: перед робочою версією потрібне
   закрите тестування — щонайменше 12 тестувальників протягом 14 днів. Опис: `description/lite/{en,uk}.md`, скріншоти ті самі, що
   для платної (`store/play/`), іконка `store/icon/play-store-512.png`.
2. Monetize → In-app products: ті самі три Product ID з цінами.
3. Перша збірка: `eas build -p android --profile production-lite`, потім `eas submit … --profile
   production-lite` (трек internal). In-app products стають активними лише після того, як
   застосунок із Billing-дозволом опублікований хоча б у внутрішньому тестуванні.
4. Google Sign-In на Android нативний (`@react-native-google-signin`, з 3.1): у застосунок іде лише web
   client id, тож Lite окремої змінної не потребує. Але в Google Cloud (проєкт Firebase) має бути
   OAuth-клієнт типу Android на кожну пару «пакет + SHA-1»: `com.yurival.GeneratorTrackerLite` з SHA-1
   upload-ключа і ключа підпису Play (Play Console → Цілісність додатка), інакше `DEVELOPER_ERROR` (10).
5. Data safety: Advertising ID, Location (approximate), App interactions — «collected, shared with
   AdMob».

## Перевірка

- `npm run check` — unit-тести прав/лімітів/каденсу реклами.
- `npm run test:e2e:lite` — web-збірка з `EXPO_PUBLIC_EDITION=lite` і фейковим магазином: ліміти,
  пейвол, покупки, відновлення.
- Dev-збірка iOS/Android з `EXPO_PUBLIC_FAKE_STORE=true` — реклама з тестовими ID + фейкові покупки.
- Справжні покупки: iOS — Sandbox-тестер у TestFlight; Android — License testers у Play Console на
  треку internal.
