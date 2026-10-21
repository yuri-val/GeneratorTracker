# Indie Hackers post (en)

*Community post at indiehackers.com/new-post (text, Markdown). Story + numbers + a question; one link block at the end.*

**Title:** I built a generator logbook for Ukraine's blackouts. Launch week: 1,375 views, and 2/3 came from one Threads post

---

In Ukraine, scheduled power outages turned portable generators into a household appliance. They run for hours every day, and they come with a service schedule — oil every 50–100 engine hours, filters, spark plugs. Most of them have no hour meter, so people keep a paper log or guess.

So I built **Generator Tracker**: tap Start when the generator runs, Stop when it shuts down. The app counts engine hours, estimates fuel left and litres per hour from your refills, reminds you about maintenance and draws monthly charts. Fully offline (the outage usually takes mobile internet with it); an account is optional and only syncs your own devices. Open source, MIT.

**Business model** (one codebase, two editions chosen at build time):
- Android: a paid full version (one-time $0.99) + a free "Lite" edition with ads on two screens and a 3-generator limit.
- iOS: free with the same limits; one-time purchases remove ads ($0.99), limits ($0.99) or both ($1.49). No subscriptions — for a logbook it felt wrong.

**Launch week so far** (posted the same story on ~12 sites, in Ukrainian and English):
- Threads (Ukrainian, account with 0 followers): **908 views**, 7 replies — including someone who runs 8 generators of 40–100 kW and wants to test it.
- Vmist, a Ukrainian blog platform: 354 views, 5 comments.
- Drukarnia, Telegraph, X: 10–50 each.
- dev.to, Medium, Hashnode (English): **0**. daily.dev: 36 impressions, 2 clicks.
- Reddit: both posts removed by the site-wide spam filter (new account + several links).

**What I'm taking from it:**
1. The audience is not developers. Developer sites gave me nothing; a casual post in the users' own language did.
2. Lead with the pain ("the kettle doesn't ask for an oil change every 50 hours"), not with the feature list.
3. Google Play now needs 12 testers opted in for 14 days before a new personal-account app can go public — that's the real bottleneck for the free Android edition.

**Questions for IH:**
- Outside Ukraine, generator owners are RV/van people, cabins, job sites, rental fleets. Where would you go to reach them without spamming?
- Would you keep the paid Android app at $0.99, or raise it now that there's a free Lite edition?

Links if you want to try it:
- iPhone/iPad (free): https://apps.apple.com/app/id6819560707
- Android Lite closed test: join https://groups.google.com/g/generator-tracker-lite, then opt in at https://play.google.com/apps/testing/com.yurival.GeneratorTrackerLite
- Site: https://generatortracker.yuri-val.dev · Code: https://github.com/yuri-val/GeneratorTracker
