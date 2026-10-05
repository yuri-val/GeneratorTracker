# Landing page

Static product site published to GitHub Pages: <https://yuri-val.github.io/GeneratorTracker/>
(English at `/`, Ukrainian at `/uk/`, privacy policy at `/privacy_policy/`).

## Structure

| Path | What |
|---|---|
| `template.html` | The page markup with `{{key}}` placeholders |
| `i18n/en.json`, `i18n/uk.json` | All texts per language (strings may contain HTML and other `{{keys}}`) |
| `styles.css`, `main.js` | Shared styles (also used by the privacy-policy pages) and the mobile menu |
| `assets/screens/` | App screenshots: `{android,ios}-{en,uk}-{screen}.jpg`, 540 px wide |
| `assets/og-{en,uk}.png` | Social preview images (1200×630) |
| `build.py` | Renders both languages into `_site/` (git-ignored) with sitemap and robots.txt |

The privacy policy lives in `../privacy_policy/{en,uk}.md` and is rendered with pandoc by
`.github/workflows/deploy-gh-pages.yml`, which also runs `build.py` and deploys on every push to
`main` that touches `landing/` or the policy.

## Preview locally

```bash
python3 landing/build.py
python3 -m http.server 8765 -d landing/_site   # http://localhost:8765/ and /uk/
```

The privacy pages need pandoc (`brew install pandoc`); see the workflow for the exact command.

## Updating screenshots

Screenshots are taken from simulator/emulator builds with realistic demo data, never from real
accounts:

1. `scripts/demo-data/seed.py` writes demo generators, sessions, refills and maintenance tasks
   straight into the app's local storage (iOS simulator container or a copy of the Android
   `RKStorage` database), in English or Ukrainian, optionally with a running session.
2. `scripts/demo-data/ios-screens.yaml`, `ios-screens-dark.yaml` and `android-screens.yaml`
   (Maestro) open the screens and save the screenshots; `android-demo-statusbar.sh` gives
   Android a clean status bar, `xcrun simctl status_bar … override` does it on iOS.
3. Resize to 540 px wide JPEG (quality ~84) into `assets/screens/` with the same names.
