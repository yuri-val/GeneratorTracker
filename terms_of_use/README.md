# Terms of use

Source of the public terms of use for Generator Tracker:

| Language | Source | Published |
|---|---|---|
| English | `en.md` | <https://generatortracker.yuri-val.dev/terms_of_use/terms-of-use.html> |
| Ukrainian | `uk.md` | <https://generatortracker.yuri-val.dev/terms_of_use/terms-of-use-uk.html> |

The pages are rendered with the privacy policy's pandoc template (`../privacy_policy/template.html`,
metadata `dir`, `file`, `file_en`, `file_uk`).

## Updating

1. Edit `en.md` and `uk.md` together and update the "Last Updated" / "Останнє оновлення" date.
2. Keep it true to the app: editions, limits (`src/monetization/limits.ts`), purchases
   (`src/monetization/products.ts`) and the account/sync behaviour; keep it consistent with the privacy policy.
3. Push to `main`: `.github/workflows/deploy-gh-pages.yml` renders and deploys the pages with the landing page.
