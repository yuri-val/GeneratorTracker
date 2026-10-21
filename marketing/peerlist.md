# Peerlist Launchpad

Weekly launches (the week starts on Monday); the project must be complete. Images: the Product Hunt gallery
(`producthunt/gallery-*.png`, 1270×760) and `producthunt/thumbnail-240.png` as the logo.

## Project

- **Name:** Generator Tracker
- **Tagline:** Run hours, fuel and maintenance log for your power generator
- **Links:** website https://generatortracker.yuri-val.dev/ · App Store https://apps.apple.com/app/id6819560707 ·
  Google Play https://play.google.com/store/apps/details?id=com.yurival.GeneratorTracker ·
  GitHub https://github.com/yuri-val/GeneratorTracker · TestFlight https://testflight.apple.com/join/wZcGdJar
- **Categories:** Productivity, Mobile App, Open Source (pick the closest offered)
- **Built with:** React Native, Expo, TypeScript, Firebase, Firestore, SwiftUI

**Description:**

Generator Tracker is a logbook for power generators. Scheduled blackouts in Ukraine turned generators into everyday appliances — and engine hours, oil changes and fuel are easy to lose track of, especially since most portable generators have no hour meter.

- One tap to Start/Stop: engine hours count themselves; several generators can run at once; Undo a mistaken Stop
- Fuel left and runtime estimate from the tank size; litres per hour from your refills
- Maintenance by engine hours, days or both — overdue tasks show on the home screen
- Monthly charts of hours and fuel per generator
- Big buttons for the dark and a true black theme that saves battery during outages
- Offline-first: data stays on the phone; an optional account only syncs your own devices

Under the hood: offline-first sync with pending state instead of a queue, tombstones for deletes and a pure last-write-wins merge, covered by unit and emulator tests. Native SwiftUI forms on iOS, Material 3 on Android. Open source (MIT).

iPhone: free on the App Store (ads on two screens, removable with a one-time purchase), plus a public TestFlight beta. Android: full paid app without ads, and a free Lite version in closed testing — testers welcome: https://groups.google.com/g/generator-tracker-lite

## First comment (maker)

Hi Peerlist 👋 I'm Yuri, a developer from Ukraine. Generator Tracker started as a fix for a very local problem — keeping a generator serviced during scheduled blackouts — and turned into a deep dive into offline-first sync (the phone has to work when there's no power and no internet).

I'd love feedback on two things: what would make it useful for your setup (home backup, job site, rental fleet), and whether the sync approach — pending state + tombstones + a pure merge instead of a sync queue — matches how you'd solve it. Code: https://github.com/yuri-val/GeneratorTracker
