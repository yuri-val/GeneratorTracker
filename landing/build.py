#!/usr/bin/env python3
"""Build the static landing site (English at /, Ukrainian at /uk/) into landing/_site.

  python3 landing/build.py            # writes landing/_site
  python3 -m http.server -d landing/_site 8000

The deploy workflow runs this and adds the privacy-policy pages next to it.
"""
import json
import re
import shutil
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '_site'
SITE_URL = 'https://yuri-val.github.io/GeneratorTracker/'
PLAY_URL = 'https://play.google.com/store/apps/details?id=com.yurival.GeneratorTracker&hl={hl}'
PLACEHOLDER = re.compile(r'\{\{(\w+)\}\}')


def render(template: str, strings: dict) -> str:
    def replace(match):
        key = match.group(1)
        if key not in strings:
            raise KeyError(f'missing string "{key}" for lang {strings.get("lang")}')
        return str(strings[key])

    # Two passes: strings may reference other strings (e.g. a link to the privacy policy).
    return PLACEHOLDER.sub(replace, PLACEHOLDER.sub(replace, template))


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    template = (ROOT / 'template.html').read_text()
    build_id = str(int(time.time()))
    for lang_file in sorted((ROOT / 'i18n').glob('*.json')):
        strings = json.loads(lang_file.read_text())
        strings.update(site_url=SITE_URL, build_id=build_id, play_url=PLAY_URL.format(hl=strings['play_hl']))
        target = OUT / strings['canonical_path'] / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(template, strings))

    for name in ('styles.css', 'main.js', 'favicon.svg', 'favicon.png', 'apple-touch-icon.png'):
        shutil.copy(ROOT / name, OUT / name)
    shutil.copytree(ROOT / 'assets', OUT / 'assets')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE_URL}sitemap.xml\n')
    pages = ['', 'uk/', 'privacy_policy/privacy-policy.html', 'privacy_policy/privacy-policy-uk.html']
    urls = '\n'.join(f'  <url><loc>{SITE_URL}{page}</loc></url>' for page in pages)
    (OUT / 'sitemap.xml').write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n'
    )
    (OUT / '.nojekyll').write_text('')
    print(f'Built {OUT}')


if __name__ == '__main__':
    main()
