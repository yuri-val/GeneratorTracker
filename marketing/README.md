# Marketing: article, channels, short posts

- `article/uk.md`, `article/en.md` — the main article (images in `article/images/`, from the landing and store creatives).
- Links: App Store (free since 3.1, 2026-10-21) https://apps.apple.com/app/id6819560707 · TestFlight public beta https://testflight.apple.com/join/wZcGdJar (group "Public beta", up to 1000 testers; works
  once Apple's beta review approves build 3.1.0 (3)), Lite closed test: group https://groups.google.com/g/generator-tracker-lite
  → opt-in https://play.google.com/apps/testing/com.yurival.GeneratorTrackerLite, paid Android
  https://play.google.com/store/apps/details?id=com.yurival.GeneratorTracker.

## Stats

`python3 marketing/stats.py` — views/reactions/comments of every link in the local `marketing/publications.local.md`
(history in the local `marketing/stats.local.csv`; `--set "Medium:views=N,reads=N"` stores numbers read in a signed-in browser for sites without a public counter; dev.to views need `DEVTO_API_KEY` in the env, the local git-excluded `pub.env` or `credentials/devto-api-key`).

`python3 marketing/appstore_sales.py [--days 14]` — App Store downloads, redownloads, updates and in-app purchases per day
from Apple's daily Sales reports (cached in the local `marketing/appstore_sales.local.csv`). Needs an App Store Connect API
key with the Sales role (`credentials/ios/AuthKey_<KEY_ID>.p8` + `credentials/ios/asc-sales-key.env` with
`ASC_SALES_KEY_ID` and `ASC_VENDOR_NUMBER`); the EAS key is App Manager and can't read reports.

## Tags

Order = priority; take the first N where a site limits them (dev.to: 4, lowercase, no spaces; Medium / Hashnode: 5).

**Українська:** генератор, блекаут, відключення світла, енергонезалежність, мобільний застосунок, Android, iOS, ТО генератора,
пальне, pet-проєкт, open source, Україна
Хештеги: #генератор #блекаут #відключенняСвітла #енергонезалежність #застосунок #Android #iOS #GeneratorTracker

**English:** generator, power outage, backup power, off-grid, mobile app, android, ios, maintenance, fuel tracking,
side project, open source, react native
Hashtags: #generator #poweroutage #backuppower #offgrid #androidapp #iosapp #sideproject #GeneratorTracker
dev.to (4): `reactnative`, `showdev`, `opensource`, `android`

## Channels (researched 2026-10-19, check each sidebar/rules before posting)

[T] = good for the 12+ Lite testers (Google: 12 testers opted in continuously for 14 days).

| Order | Where | Rules in short | Format |
|---|---|---|---|
| 1 | r/AndroidClosedTesting [T], r/TestersCommunity [T] | the whole sub is test-for-test; test others back | short tester request (below) |
| 2 | DOU Форум → Блоги [T] | no promotional tone, **no links to paid products in the text**; GitHub is fine; moderated | technical variant of the article (offline-first RN/Expo + Firebase), Lite tester ask at the end |
| 3 | r/Ukraine_UA [T] | no written promo rule — ask mods first | short UA post + tester ask |
| 4 | r/SideProject, dev.to / Hashnode | disclose it's yours; value beyond promotion | the English article |
| 5 | r/iOSApps (self-promo ≤ 1 per 30 days, dev flair), r/TestFlight, r/droidappshowcase | self-promo allowed | TestFlight invite |
| 6 | dev.ua Блоги, ITC.ua Дописи | moderated; ITC bans posts made to advertise | consumer angle in Ukrainian |
| later | Show HN (GitHub + builds without sign-in), r/Generator, r/preppers / r/OffGrid (mod permission), Telegram @TBattSpeek, @slyvkadenyschanel (ask admins), Product Hunt (once Lite is public) | | |

Avoid r/androidapps: Rule 2 bans self-promotion and tester requests.

**Reddit's spam filter (2026-10-19):** the first posts from a new, low-karma account with several Google links, posted to two
subreddits within an hour, were removed by Reddit's site-wide filter (r/TestersCommunity, r/Ukraine_UA) — not by the mods.
Fix: ask the mods to approve via modmail; build karma with a few genuine comments first; one link in the post, the rest in a
comment; never the same text in several subs on the same day; no TestFlight link until Apple's beta review passes.

## Short posts

### Tester request (r/AndroidClosedTesting / r/TestersCommunity)

> **[Test for test] Generator Tracker Lite — generator run hours, fuel and maintenance log**
>
> Offline-first logbook for power generators: one-tap run-hour timer, fuel refills with L/h, maintenance by engine hours or days, monthly charts. Free with ads on two screens; English + Ukrainian.
>
> 1. Join https://groups.google.com/g/generator-tracker-lite
> 2. Opt in https://play.google.com/apps/testing/com.yurival.GeneratorTrackerLite and install
> 3. Keep it 14 days
>
> Drop your link below — I'll test yours back.

### Коротко українською (Telegram, r/Ukraine_UA)

> Зробив безкоштовний застосунок для тих, хто живе з генератором: мотогодини одним дотиком, залишок пального й витрата л/год, нагадування про ТО (мастило, фільтри, свічки), графіки. Працює без інтернету.
>
> Шукаю тестувальників:
> • iPhone — https://testflight.apple.com/join/wZcGdJar
> • Android — вступіть у https://groups.google.com/g/generator-tracker-lite, потім https://play.google.com/apps/testing/com.yurival.GeneratorTrackerLite
>
> Буду вдячний за відгуки 🙏
