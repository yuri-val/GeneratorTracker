# r/Generator — launch post kit

r/Generator (~57k): generator owners and techs — portables, inverters, home standby, RV/marine. They like concrete
maintenance talk (oil intervals, break-in, fuel burn) and dislike ads. The post must be useful even to someone who
never installs the app.

## Before posting

1. Read the sidebar rules and the pinned posts (rules weren't readable from here). If self-promotion is banned or
   unclear → send the modmail below first and wait for the answer.
2. Account: older than 3 days, a few genuine comments in r/Generator in the last days (answer 2–3 questions about
   oil, break-in, won't-start) — no links.
3. Time: Tue–Thu, 9–11 am US Eastern = **16:00–18:00 Kyiv**. 62% of the r/OffGridLiving views were from the US.
4. Flair: "Discussion" or "Maintenance" if offered (not "For sale"/"Help").
5. Image: `marketing/reddit/cover-generator.png`, attached in the text post editor.
6. Block 2 hours after posting to answer every comment — the first hour decides whether Reddit keeps showing it.

## Modmail (if the rules are unclear)

> **Subject:** Developer post about a free generator logbook app — OK?
>
> Hi mods! I'm a developer from Ukraine. With daily blackouts our portable runs for hours every day, so I built a
> free, open-source, offline app that logs engine hours, fuel and oil-change intervals. I'd like to make one text post
> (clearly saying I made it), framed as a discussion about tracking hours without an hour meter, with the link only in
> a comment. Is that OK, or would you prefer something else? Thanks!

## Title (pick one)

1. **How do you know when your oil change is due if your generator has no hour meter? (I built a free app for this — curious how you all track it)**
2. No hour meter on most portables, but every service interval is in engine hours — how do you keep track?
3. Daily blackouts in Ukraine taught me to log every engine hour — I made a free offline logbook for generators

Recommended: **1** — a real question first, honest disclosure, invites comments.

## Body

> Most portables and inverters don't have an hour meter, but the manual's whole service schedule is in engine hours —
> e.g. a Honda EU2200i wants the first oil change at 20 hours, then every 100 hours or 6 months (check your own manual).
>
> In Ukraine we've had scheduled blackouts for a while, so our generator runs 6–10 hours a day, and I kept losing
> count of when the last oil change was. So I built a small logbook app for it (disclosure: I'm the developer — it's
> free and open source):
>
> - tap Start / Stop and engine hours count themselves; several generators at once
> - oil, air filter and spark plug intervals by engine hours, days or both, with an overdue warning
> - enter the tank size → it estimates fuel and runtime left; litres per hour calculated from your refills
> - monthly hours and fuel charts
> - fully offline, no account needed (an optional one only syncs your own devices)
>
> Litres only for now — if gallons would make it useful for you, say so and it's next.
>
> I'm genuinely curious how you do it today: a notebook taped to the generator, an aftermarket hour meter, a phone
> note, or "when it sounds rough"? And what do you track besides hours and oil — valve clearance, plugs, exercise runs,
> fuel stabilizer?

## First comment (right after posting)

> Links if anyone wants to try it:
> - iPhone/iPad (free): https://apps.apple.com/app/id6819560707
> - Android: free Lite in closed testing (join https://groups.google.com/g/generator-tracker-lite, then opt in at https://play.google.com/apps/testing/com.yurival.GeneratorTrackerLite) or the paid full version https://play.google.com/store/apps/details?id=com.yurival.GeneratorTracker
> - Source (MIT): https://github.com/yuri-val/GeneratorTracker
>
> Happy to answer questions or take feature requests.

## Replies to likely comments

- **"Just buy a $15 inductive hour meter."** — Totally, that's the most reliable counter. The app is more about what
  comes after the number: which service is due next, fuel per hour, several generators in one place. Some people here
  use both.
- **"Gallons?"** — Not yet, litres only. It's the most requested thing so far — I'll add a gallons/US setting. Would you
  want fuel in gallons and gal/h, or also tank size?
- **"Is it another AI-made app?"** — It's a small hand-built project from a Ukrainian dev; the code is public on GitHub
  if you want to see what's inside. No ads in the paid Android version; the free version has a small banner on two
  screens.
- **"Why do you need my data / account?"** — You don't: it works fully offline and stores everything on the phone.
  The account is optional and only syncs your own devices.
- **"Android is paid?"** — The full Android app is a one-time $0.99; a free Lite version (3 generators, small banner)
  is in Google's closed test — Google requires 14 days with 12 testers before it can go public. Testers welcome.
- **"Does it read the generator automatically / Bluetooth?"** — No, it's a manual Start/Stop log — works with any
  generator, no hardware. Auto-detection would be cool but needs sensors.
- **"What intervals do you use?"** — Answer with the manual's numbers for their model; don't invent. Ask their model.
- **Criticism** — thank them, agree with what's fair, say what you'd change. Never argue.

## After posting

- Answer every comment within the first 2 hours, then check twice a day for 2 days.
- If it's removed by AutoModerator: don't repost — modmail with the link.
- Send me the stats (views, upvotes, comments) — I'll log them.
- Gallons came up → it's the first feature for the next version.

## Modmail after removal (sent 2026-10-24)

> **Subject:** Removed post — how can I make it fit the rules?
>
> Hi mods, my post "How do you know when your oil change is due if your generator has no hour meter?" was removed:
> https://www.reddit.com/r/Generator/comments/1xe7wzo/how_do_you_know_when_your_oil_change_is_due_if/
>
> I'm a developer from Ukraine; with daily blackouts our portable runs for hours every day, so I built a free,
> open-source, offline app for logging engine hours, fuel and service intervals. I disclosed that it's mine and kept
> the links in one comment, but I understand if that still counts as self-promotion here.
>
> Would any of these be OK?
> 1. Restore the post without the links comment (I'd only share a link if someone asks), or
> 2. a plain discussion post about tracking engine hours without mentioning the app at all, or
> 3. posting it in a weekly/self-promo thread, if you have one.
>
> If none of that fits r/Generator, no problem — I won't repost. Thanks for keeping the sub clean.
