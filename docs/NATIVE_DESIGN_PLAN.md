# Нативний дизайн для iOS і Android — аналіз і план

> Гілка `feature/native-platform-design` від `main@55f7c79` (2.4.3, Expo SDK 57, RN 0.86).
> Окрема задача, поза фазою стабілізації. Статус: **реалізовано (етапи 0–4), реліз 2.5.0** — див. §10 «Результат».

## 1. Що є зараз

Увесь UI побудований на **React Native Paper 5 (Material Design 3)** однаково для всіх платформ.
На iOS застосунок виглядає як Android-застосунок: Material-шапки, FAB, Material-поля вводу, Material-діалоги.

| Файл | Рядків | Компоненти, що визначають «вигляд платформи» |
|---|---|---|
| `App.tsx` | 137 | `PaperProvider`, `adaptNavigationTheme`, `createBottomTabNavigator` з власним `tabBar` |
| `src/components/PaperBottomTabBar.tsx` | 81 | JS-панель вкладок: `BottomNavigation.Bar` + `BlurView` (не нативна → **немає Liquid Glass**) |
| `src/screens/home/HomeScreen.tsx` | 219 | `Appbar`, `Card`, `FAB`, `Avatar`, `Chip` |
| `src/screens/generator/GeneratorDetailScreen.tsx` | 468 | `Appbar`, material top tabs (Sessions/Refills/Maintenance), `Chip` |
| `src/screens/generator/Add*Screen.tsx` (4 шт.) | 169–383 | `Appbar` з ✓/✕, `TextInput` (Material outlined), `@react-native-community/datetimepicker`, `Banner` |
| `src/screens/settings/SettingsScreen.tsx` | 375 | `List`, `Card`, `SegmentedButtons`, `Button`, `Badge` |
| `src/screens/analytics/AnalyticsScreen.tsx` | 441 | `SegmentedButtons`, `Chip`, `Surface`, gifted-charts |
| `src/components/DeleteConfirmDialog.tsx` | 40 | Paper `Dialog` + `Portal` |
| Списки (`WorkSessionsList`, `RefillsList`, `MaintenanceList`) | 104–177 | `Card`, `Button`, `Icon` |

Іконки — MaterialCommunityIcons (≈45 назв), шрифт — `System`, тема — власні MD3-токени (`src/theme`).
`app.json` → `userInterfaceStyle: "light"`: темна тема вимкнена на пристроях (S-17), хоча код її підтримує.

## 2. Що означає «нативний дизайн» для кожної платформи

| Елемент | iOS 26+ (Human Interface Guidelines) | Android (Material 3) |
|---|---|---|
| Панель вкладок | Нативний `UITabBar` → **Liquid Glass** автоматично (збірка з Xcode 26+) | Нативний M3 `BottomNavigationView` |
| Шапка | Нативна навігаційна панель: великий заголовок на кореневих екранах, скляні кнопки | M3 Top App Bar |
| Головна дія («додати») | Кнопка `+` у навігаційній панелі | FAB |
| Перемикач Sessions/Refills/Maintenance | Нативний segmented control | M3 вкладки |
| Форми | Згруповані секції (як «Налаштування»), нативні поля й компактні пікери дати | M3 outlined поля, M3 date picker |
| Налаштування | Inset-grouped список | M3 список |
| Підтвердження видалення | `UIAlertController` з destructive-кнопкою | M3 AlertDialog |
| Іконки | SF Symbols | Material Symbols / MCI |
| Шрифт | SF Pro, Dynamic Type | Roboto, M3 type scale |

## 3. Інструменти (перевірено на встановлених версіях для SDK 57)

| Пакет | Версія | Що дає | Джерело |
|---|---|---|---|
| `react-native-bottom-tabs` + `@bottom-tabs/react-navigation` | 1.4.0 | Нативні вкладки: iOS `UITabBar` (Liquid Glass), Android M3 BottomNavigation; інтеграція з React Navigation 7; SF Symbols; config plugin | npm peerDeps: `react-native: *`, `@react-navigation/native >=7`; **web-реалізації немає** |
| `@expo/ui` | ~57.0.21 (у `bundledNativeModules` SDK 57) | **universal**-компоненти: одна розмітка → SwiftUI на iOS, Jetpack Compose на Android, DOM-fallback на web. `List`, `ListItem`, `FieldGroup`, `TextInput`, `Picker`, `Switch`, `Button`, `BottomSheet`, `Icon`. Окремо `swift-ui/DatePicker`, `jetpack-compose/DatePicker`, модифікатор `glassEffect` | `package/build/universal/index.d.ts`; кожен компонент має `index.ios.tsx` / `index.android.tsx` / `index.tsx` (web) і підтримує `testID` |
| `@react-native-segmented-control/segmented-control` | 2.5.7 (bundled) | Нативний `UISegmentedControl` | bundledNativeModules |
| `expo-symbols` | ~57.0.3 (bundled) | SF Symbols на iOS | bundledNativeModules |
| react-native-screens / native-stack | 4.26 (вже є) | Нативні шапки iOS з великими заголовками; на iOS 26 — скляні кнопки автоматично | вже використовується навігатором |

**Відкинуто:** перехід на `expo-router` заради його `NativeTabs` — це заміна всієї навігації на файлову маршрутизацію, непропорційно
задачі; React Navigation 8 з нативними вкладками — лише `8.0.0-alpha.55`, для продакшну рано.

## 4. Запропоноване рішення

Один код, платформні примітиви. Логіка, сховище й синк **не змінюються**.

1. **Вкладки** — `react-native-bottom-tabs` для iOS/Android (Liquid Glass / M3). Web лишає поточну JS-панель
   (`MainTabs.web.tsx`), бо бібліотека не має web-реалізації. Іконки вкладок: SF Symbols на iOS
   (`bolt.fill`, `chart.bar.fill`, `gearshape.fill`), на Android — растрові/векторні ресурси (спосіб обирається на спайку, див. §6).
   Висоту панелі беремо з хука бібліотеки (замість нашого `BottomTabBarHeightCallbackContext`).
2. **Шапки** — iOS: нативна шапка native-stack (`headerLargeTitle` на кореневих екранах, кнопки через `headerRight`),
   Paper `Appbar` на iOS прибирається. Android і web: Paper `Appbar` (вже M3). Спільний хук `useScreenHeader({ title, actions })`
   ховає цю різницю від екранів.
3. **Головні дії** — iOS: `+` у шапці Home і в шапці вкладок деталі; Android/web: FAB і кнопки «Add …» як зараз.
4. **Екран генератора** — iOS: segmented control замість material top tabs; Android/web: M3 вкладки як зараз.
   Кнопка START/STOP лишається брендовим елементом (помаранчевий tint), на iOS — нативна prominent-кнопка.
5. **Форми (4 екрани Add*) і вхід (EmailAuthForm)** — `@expo/ui` universal `FieldGroup` + `TextInput` + `Picker`;
   дата — `swift-ui/DatePicker` (compact) на iOS, `jetpack-compose/DatePicker` на Android, поточний web-варіант на web.
   `@react-native-community/datetimepicker` після цього стає непотрібним.
6. **Налаштування** — universal `List`/`FieldGroup` (iOS grouped, Android M3), мова — universal `Picker`.
7. **Підтвердження видалення** — нативний `Alert.alert` з destructive-стилем на iOS і Android; Paper `Dialog`/`Portal` видаляються.
   На web `Alert` не працює — лишаємо поточний діалог для web (`DeleteConfirmDialog.web.tsx`).
8. **Іконки в контенті** — компонент `AppIcon` із семантичними назвами → `{ sf, mci }`: SF Symbols на iOS, MCI на Android/web.
   Тест `icons.test.ts` розширюється на мапу SF Symbols.
9. **Картки й дашборди** (Home, статистика, графіки) — лишаються картками (це контент, а не «хром» платформи), але токени
   стилю платформні: на iOS системні кольори grouped-фону, без Material-тіней; на Android — M3 elevation. Графіки gifted-charts не змінюються.
10. **Бренд** — помаранчевий `#FF6B35` як accent/tint на обох платформах; синій — для часу (як у `DESIGN_GUIDE.md`).
    `DESIGN_GUIDE.md` оновлюється: «Material 3 скрізь» → «нативно для платформи з брендовим accent».

**Web** лишається на поточному Paper-вигляді (Android-подібному) там, де нативних компонентів немає; universal-компоненти
`@expo/ui` мають власний web-fallback, тож e2e продовжують тестувати логіку.

## 5. Що НЕ чіпаємо

Моделі, `storage`, синк, Firestore, правила, розрахунки, i18n-ключі (крім нових підписів кнопок, якщо з'являться), логіку екранів,
графіки. Жодних нових функцій — лише вигляд і поведінка елементів керування за нормами платформи.

## 6. Ризики й як їх зняти (спайк перед основною роботою, ~0.5 дня)

| Ризик | Перевірка на спайку | Запасний варіант |
|---|---|---|
| `react-native-bottom-tabs` 1.4.0 + RN 0.86 / New Arch / Expo SDK 57 | Нативна збірка iOS (Xcode 27) і Android APK, перемикання вкладок, Liquid Glass на iOS 27 | Лишити JS-панель на Android, нативну — лише на iOS |
| Android-іконки для нативних вкладок (потрібні image-ресурси, шрифтові іконки не підходять) | Растрування 3 іконок MCI у PNG @1x–@3x або vector drawable через config plugin | Готові PNG у `assets/tabs/` |
| `@expo/ui` universal: власна модель стану (`useNativeState`), контрольовані поля, клавіатура, `testID` у web-e2e | Одна форма (AddRefill) повністю на universal + web e2e + нативний прогін | Платформні файли `*.ios.tsx` з `swift-ui`, Paper лишається на Android |
| iOS-шапки: кнопки ✓/✕ модальних форм як нативні bar items, поведінка на iOS 26 | Модальна форма з нативною шапкою | Paper Appbar на модальних екранах |
| e2e на web перестане покривати iOS/Android-вигляд | — | Нативні UI-тести **Maestro** (iOS-симулятор + Android-емулятор): ті самі сценарії, що в `core-flows.spec.ts` |

## 7. Тестування

- Unit і web e2e (Playwright + емулятори Firebase) — як зараз, мають лишатися зеленими.
- **Нові нативні UI-тести на Maestro** для iOS і Android: створення генератора, старт/стоп сесії, заправка, ТО, мова, перезапуск.
  Потребує встановлення Maestro CLI (одноразово, офіційний інсталятор).
- Ручна візуальна перевірка: iPhone 17 (iOS 27), iPad, Android-телефон і планшет (Android 16), світла й темна теми.
- Знімки «до/після» для кожного екрана — у цей документ і для оновлення скріншотів у Google Play.

## 8. Етапи

| Етап | Зміст | Результат |
|---|---|---|
| 0. Спайк | §6: вкладки, одна форма на `@expo/ui`, іконки Android, нативна шапка модалки | go / no-go по кожній бібліотеці |
| 1. Навігаційний «хром» | Нативні вкладки, шапки iOS, `+` у шапці, `AppIcon`, темна тема (якщо погоджено) | Застосунок «відчувається» нативним на обох платформах |
| 2. Екран генератора й списки | Segmented control (iOS), M3 вкладки (Android), рядки списків, `Alert` замість Paper Dialog | |
| 3. Форми й налаштування | 4 форми + вхід + Settings на `@expo/ui`, нативні пікери дат | `datetimepicker` видалено |
| 4. Шліфування | Платформні токени кольорів/типографіки, планшет (S-34: максимальна ширина контенту), Maestro-тести, скріншоти | |

Версія — **MINOR (2.5.0)**: помітна зміна UX. Оновити `CHANGELOG`, `description/*.md`, `release_notes/2.5.0`, скріншоти стору.

## 9. Рішення, потрібні від власника

1. **Темна тема за системою** (`userInterfaceStyle: automatic`, S-17). Нативні компоненти iOS/Android самі йдуть за системною темою;
   примусово світлий режим можливий, але суперечить «нативності». **Рекомендую: так.**
2. **Material You (динамічні кольори з шпалер) на Android.** **Рекомендую: ні** — лишити брендовий помаранчевий.
3. **iOS: `+` у шапці та segmented control** замість FAB і Material-вкладок. **Рекомендую: так** (норма HIG).
4. **Web лишається на поточному вигляді.** **Рекомендую: так.**
5. **Maestro для нативних UI-тестів** (встановлення CLI на Mac). **Рекомендую: так.**
6. **Реліз**: Android 2.5.0 у Google Play одразу після готовності, iOS — коли буде ліцензія Apple Developer. **Рекомендую: так.**

## 10. Результат реалізації (2026-10-01)

Рішення власника: усі шість рекомендацій §9 — **так**.

### Що зроблено
| Етап | Коміт | Суть |
|---|---|---|
| 1 | `feat(native-design): stage 1` | Нативні вкладки (iOS `UITabBar` з Liquid Glass, на iPadOS — верхня панель; Android M3 BottomNavigation), `ScreenHeader`, `AppIcon` + мапа `ICONS` (SF Symbols / MCI), `PlatformSegmented`, системні кольори iOS, тема за системою |
| 2 | `feat(native-design): stage 2` | Екран генератора на iOS — один inset-grouped список із segmented control, `+` і меню «Ще» (Edit / destructive Delete) у прозорій шапці зі scroll-edge ефектом iOS 26; системні алерти видалення на iOS/Android |
| — | `fix(dates)` | **S-10** (локальні дати) — виправлено, бо форми з датами переписувались |
| 3 | `feat(native-design): stage 3` | Форми та Settings на iOS — SwiftUI `Form` через `@expo/ui` (`NativeForm`), модальні аркуші з нативною шапкою |
| 4 | `feat(native-design): stage 4` | Темна тема перевірена на обох платформах, планшети (S-34), Maestro-тести, документація |

### Відхилення від плану (і чому)
1. **Форми на Android лишились на Paper (M3), дата — нативний Material-діалог `@react-native-community/datetimepicker`.**
   Paper-форми вже є Material 3, а `jetpack-compose/DatePicker` — це вбудований (inline) календар, а не діалог,
   тобто менш нативний для форми. Тому `datetimepicker` **не видалено**.
2. **iOS-форми — `@expo/ui/swift-ui` напряму, а не universal-компоненти.** Universal-шар не має DatePicker і
   `LabeledContent`; один iOS-файл `NativeForm.ios.tsx` з декларативним описом полів (`FormSection`) ізолює
   SwiftUI-імпорти, логіка екранів спільна.
3. **`ScreenHeader`-компонент замість хука `useScreenHeader`** — те саме API, але на Android/web він сам малює `Appbar`.
4. **Модальні екрани iOS отримують шапку лише якщо `headerShown` увімкнено на момент монтування** (react-native-screens) —
   кореневий стек вмикає нативні шапки на iOS одразу.
5. **`DeleteConfirmDialog.native.tsx` + web за замовчуванням** (замість `.web.tsx`) — той самий ефект, менше файлів.
6. **Android: явна дія «редагувати» у шапці, модель генератора — у контенті.** Paper v5 (MD3) не малює
   `Appbar.Content subtitle`, тож модель і підказка «Tap to edit» на Android ніколи не показувались.
7. **`useTabBarOverlap` замість висоти панелі** — нативні панелі не перекривають контент (Android кладе екран над
   панеллю, iOS дає інсет скролу), відступ потрібен лише web-панелі.

### Знахідки по ходу
- Metro, запущений з `CI=1`, **не стежить за файлами** — усі «застарілі бандли» під час перевірок були через це.
- Debug-APK на Android при першому запуску може показати ANR від `expo-dev-menu` (сканування великого debug-APK у
  головному потоці) — лише dev-клієнт; у релізній збірці цього коду немає.
- S-34 (планшети): обрізаний текст порожнього стану зник, вісь X графіків більше не виходить за картку (ширина
  графіка тепер з `useWindowDimensions` з урахуванням колонки підписів осі Y і `xAxisLength`), контент — у колонці
  до 720 pt/dp.

### Перевірено
- `npm run check` (118 unit), web e2e 7/7, emulator e2e 14/14.
- Maestro: `.maestro/ios` — iPhone 17 (iOS 27); `.maestro/android` — планшет Android 16. Вручну: iPad Pro 13",
  телефон Android 16, світла й темна теми.
