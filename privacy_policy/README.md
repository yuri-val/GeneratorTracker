# Privacy policy

Source of the public privacy policy for Generator Tracker (also used as the privacy URL in Google
Play and App Store Connect):

| Language | Source | Published |
|---|---|---|
| English | `en.md` | <https://yuri-val.github.io/GeneratorTracker/privacy_policy/privacy-policy.html> |
| Ukrainian | `uk.md` | <https://yuri-val.github.io/GeneratorTracker/privacy_policy/privacy-policy-uk.html> |

`template.html` is the pandoc template; the pages share the landing page's styles
(`../landing/styles.css`).

## Updating

1. Edit `en.md` and `uk.md` together and update the "Last Updated" / "Останнє оновлення" date.
2. Keep it true to the app: describe every stored field (`src/models/types.ts`), the sync behaviour
   and how data can be deleted.
3. Push to `main`: `.github/workflows/deploy-gh-pages.yml` renders the pages with pandoc
   (`markdown+lists_without_preceding_blankline`) and deploys them together with the landing page.
   The published URLs never change, so the store listings need no update.
