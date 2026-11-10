#!/usr/bin/env python3
"""Build the static landing site (English at /, Ukrainian at /uk/) into landing/_site.

  python3 landing/build.py            # writes landing/_site
  python3 -m http.server -d landing/_site 8765

Besides the two home pages the build writes the download pages (/download/, /uk/download/: the free
editions first, the paid Android app below), the smart download link (/get/), 404.html, llms.txt,
site.webmanifest, robots.txt and a sitemap with hreflang alternates. The app version comes from
app.json and the "What's new" section from release_notes/<version>/<lang>.md, so a release updates
the site without touching landing/. The deploy workflow runs this and adds the privacy-policy pages.
"""
import html
import json
import re
import shutil
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
OUT = ROOT / '_site'
SITE_URL = 'https://generatortracker.yuri-val.dev/'
GITHUB_URL = 'https://github.com/yuri-val/GeneratorTracker'
PLAY_URL = 'https://play.google.com/store/apps/details?id=com.yurival.GeneratorTracker&hl={hl}'
LITE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.yurival.GeneratorTrackerLite&hl={hl}'
# Country-less form: the App Store opens the visitor's own storefront.
APP_STORE_URL = 'https://apps.apple.com/app/id6819560707'
APP_STORE_ID = '6819560707'
PLACEHOLDER = re.compile(r'\{\{(\w+)\}\}')
MONTHS = {
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
           'October', 'November', 'December'],
    'uk': ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня',
           'жовтня', 'листопада', 'грудня'],
}
MARK = ('<span class="mark is-{cls}"><svg viewBox="0 0 24 24" aria-hidden="true">{path}</svg>'
        '<span class="sr-only">{text}</span></span>')
PLAY_ICON = '<svg class="store-icon" viewBox="0 0 512 512" aria-hidden="true"><path fill="#00d7fe" d="M48 59.5v393c0 8.5 4.6 15.9 11.5 19.8L285 256 59.5 39.7C52.6 43.6 48 51 48 59.5z"/><path fill="#00f076" d="M352.9 188.3 107.7 46.4c-10-5.8-21.6-6.3-32-1.9L285 256l67.9-67.7z"/><path fill="#ff3a44" d="M285 256 75.7 467.5c10.4 4.4 22 3.9 32-1.9l245.2-141.9L285 256z"/><path fill="#ffd500" d="M440.9 225.6 352.9 175 285 256l67.9 67.7 88-50.3c19.7-11.3 19.7-36.5 0-47.8z"/></svg>'
APPLE_ICON = '<svg class="store-icon" viewBox="0 0 384 512" aria-hidden="true"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>'
MARK_PATHS = {'yes': '<path d="M5 12.5 10 17l9-10"/>', 'no': '<path d="M7 7l10 10M17 7 7 17"/>',
              'partly': '<path d="M5 12h14"/>'}


def render(template: str, strings: dict) -> str:
    def replace(match):
        key = match.group(1)
        if key not in strings:
            raise KeyError(f'missing string "{key}" for lang {strings.get("lang")}')
        return str(strings[key])

    # Two passes: strings may reference other strings (e.g. a link to the privacy policy).
    return PLACEHOLDER.sub(replace, PLACEHOLDER.sub(replace, template))


def plain(text: str) -> str:
    """Strip markup from an i18n string for use in JSON-LD, meta tags and llms.txt."""
    return html.unescape(re.sub(r'<[^>]+>', '', text)).strip()


def human_date(iso: str, lang: str) -> str:
    d = date.fromisoformat(iso)
    return f'{d.day} {MONTHS[lang][d.month - 1]} {d.year}'


def version_key(name: str):
    return tuple(int(part) for part in name.split('.')) if re.fullmatch(r'\d+(\.\d+)*', name) else ()


def inline_markdown(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2" rel="noopener">\1</a>', text)


def read_release_notes(version: str, lang: str) -> dict:
    """Parse release_notes/<version>/<lang>.md (falls back to the newest notes if this version has none)."""
    notes_dir = REPO / 'release_notes'
    candidates = [p.name for p in notes_dir.iterdir() if p.is_dir() and (p / f'{lang}.md').exists()]
    chosen = version if version in candidates else max(candidates, key=version_key)
    text = (notes_dir / chosen / f'{lang}.md').read_text()
    found = re.search(r'(\d{4}-\d{2}-\d{2})', text)
    sections, current = [], None
    for line in text.splitlines():
        if line.startswith('# ') or re.match(r'^\*\*[^*]+:\*\*', line):
            continue
        heading = re.match(r'^##\s+(.*)', line)
        if heading:
            # Drop the leading emoji used in the notes ("## ✨ What's New").
            current = {'title': re.sub(r'^[^\w]+', '', heading.group(1)).strip(), 'items': [], 'paras': []}
            sections.append(current)
        elif current is None or not line.strip():
            continue
        elif line.startswith('- '):
            current['items'].append(line[2:].strip())
        else:
            current['paras'].append(line.strip())
    overview = ''
    if sections and re.search(r'overview|огляд', sections[0]['title'], re.I):
        overview = ' '.join(sections.pop(0)['paras'])
    body = []
    for section in sections:
        items = ''.join(f'<li>{inline_markdown(item)}</li>' for item in section['items'])
        paras = ''.join(f'<p>{inline_markdown(p)}</p>' for p in section['paras'])
        body.append(f'<section class="news-group"><h3>{html.escape(section["title"])}</h3>'
                    f'{paras}{f"<ul>{items}</ul>" if items else ""}</section>')
    return {
        'notes_version': chosen,
        'notes_date': found.group(1) if found else date.today().isoformat(),
        'notes_overview': inline_markdown(overview),
        'notes_body_html': '\n'.join(body),
    }


def json_ld(s: dict) -> str:
    page = SITE_URL + s['canonical_path']
    screenshots = [
        (f'android-{s["lang"]}-active.jpg', s['hero_shot_main_alt']),
        (f'ios-{s["lang"]}-home-dark.jpg', s['hero_shot_second_alt']),
        (f'ios-{s["lang"]}-maintenance.jpg', s['show2_alt']),
        (f'android-{s["lang"]}-charts.jpg', s['show3_alt']),
    ]
    features = [plain(s[k]) for k in ('f_session_t', 'f_fuel_t', 'f_service_t', 'f_analytics_t', 'f_fleet_t',
                                      'f_sync_t', 'f_theme_t')]
    questions = [{'@type': 'Question', 'name': plain(s[f'q{i}']),
                  'acceptedAnswer': {'@type': 'Answer', 'text': plain(s[f'a{i}'])}} for i in range(1, 8)]
    graph = [
        {'@type': 'WebSite', '@id': SITE_URL + '#website', 'url': SITE_URL, 'name': 'Generator Tracker',
         'inLanguage': ['en', 'uk'], 'publisher': {'@id': SITE_URL + '#author'}},
        {'@type': 'Person', '@id': SITE_URL + '#author', 'name': 'Yuri Valigursky',
         'url': 'https://github.com/yuri-val', 'sameAs': ['https://github.com/yuri-val']},
        {'@type': 'WebPage', '@id': page + '#webpage', 'url': page, 'name': plain(s['meta_title']),
         'description': plain(s['meta_description']), 'inLanguage': s['lang'],
         'isPartOf': {'@id': SITE_URL + '#website'}, 'about': {'@id': SITE_URL + '#app'},
         'dateModified': s['today'],
         'primaryImageOfPage': {'@type': 'ImageObject', 'url': f'{SITE_URL}assets/og-{s["lang"]}.png',
                                'width': 1200, 'height': 630}},
        {'@type': 'MobileApplication', '@id': SITE_URL + '#app', 'name': 'Generator Tracker',
         'url': SITE_URL, 'image': SITE_URL + 'assets/app-icon.png',
         'description': plain(s['meta_description']),
         'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Android 7.0+, iOS 16.4+',
         'softwareVersion': s['app_version'], 'dateModified': s['notes_date'],
         'inLanguage': ['en', 'uk'],
         'installUrl': [s['play_url'], APP_STORE_URL], 'downloadUrl': [s['play_url'], APP_STORE_URL],
         'sameAs': [s['play_url'], APP_STORE_URL, GITHUB_URL],
         'featureList': features,
         'screenshot': [{'@type': 'ImageObject', 'url': f'{SITE_URL}assets/screens/{name}',
                         'caption': plain(alt)} for name, alt in screenshots],
         'author': {'@id': SITE_URL + '#author'}, 'license': GITHUB_URL + '/blob/main/LICENSE'},
        {'@type': 'FAQPage', '@id': page + '#faq', 'mainEntity': questions},
    ]
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)


def json_ld_download(s: dict) -> str:
    """Structured data for the download page: the two free apps with a zero-price offer, the paid one, FAQ."""
    home = SITE_URL + s['home_path']
    page = SITE_URL + s['canonical_path']
    free = {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD', 'availability': 'https://schema.org/InStock'}
    common = {'applicationCategory': 'UtilitiesApplication', 'softwareVersion': s['app_version'],
              'dateModified': s['notes_date'], 'inLanguage': ['en', 'uk'],
              'image': SITE_URL + 'assets/app-icon.png', 'description': plain(s['dl_meta_description']),
              'author': {'@id': SITE_URL + '#author'}, 'license': GITHUB_URL + '/blob/main/LICENSE'}
    questions = [{'@type': 'Question', 'name': plain(s[f'dl_q{i}']),
                  'acceptedAnswer': {'@type': 'Answer', 'text': plain(s[f'dl_a{i}'])}} for i in range(1, 7)]
    graph = [
        {'@type': 'WebPage', '@id': page + '#webpage', 'url': page, 'name': plain(s['dl_meta_title']),
         'description': plain(s['dl_meta_description']), 'inLanguage': s['lang'],
         'isPartOf': {'@id': SITE_URL + '#website'}, 'about': {'@id': SITE_URL + '#app'},
         'dateModified': s['today'], 'breadcrumb': {'@id': page + '#breadcrumb'},
         'primaryImageOfPage': {'@type': 'ImageObject', 'url': f'{SITE_URL}assets/og-{s["lang"]}.png',
                                'width': 1200, 'height': 630}},
        {'@type': 'BreadcrumbList', '@id': page + '#breadcrumb', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Generator Tracker', 'item': home},
            {'@type': 'ListItem', 'position': 2, 'name': plain(s['dl_crumb']), 'item': page}]},
        {'@type': 'Person', '@id': SITE_URL + '#author', 'name': 'Yuri Valigursky',
         'url': 'https://github.com/yuri-val'},
        {'@type': 'MobileApplication', '@id': SITE_URL + '#app-ios', 'name': 'Generator Tracker',
         'operatingSystem': 'iOS 16.4+, iPadOS 16.4+', 'url': APP_STORE_URL, 'installUrl': APP_STORE_URL,
         'downloadUrl': APP_STORE_URL, 'offers': free, **common},
        {'@type': 'MobileApplication', '@id': SITE_URL + '#app-android-lite', 'name': 'Generator Tracker Lite',
         'operatingSystem': 'Android 7.0+', 'url': s['lite_play_url'], 'installUrl': s['lite_play_url'],
         'downloadUrl': s['lite_play_url'], 'offers': free, **common},
        {'@type': 'MobileApplication', '@id': SITE_URL + '#app-android', 'name': 'Generator Tracker',
         'operatingSystem': 'Android 7.0+', 'url': s['play_url'], 'installUrl': s['play_url'], **common},
        {'@type': 'FAQPage', '@id': page + '#faq', 'mainEntity': questions},
    ]
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)


def download_strings(s: dict) -> dict:
    """The home page's strings re-based one directory deeper (/download/ and /uk/download/)."""
    d = dict(s)
    d.update(home_path=s['canonical_path'], home_href='../', canonical_path=s['canonical_path'] + 'download/',
             dir_root='../' + s['dir_root'],
             alt_lang_href='../uk/download/' if s['lang'] == 'en' else '../../download/',
             privacy_href='../' + s['privacy_href'],
             footer_privacy_alt_href='../' + s['footer_privacy_alt_href'])
    d['json_ld'] = json_ld_download(d)
    return d


def llms_txt(en: dict, uk: dict) -> str:
    features = '\n'.join(f'- {plain(en[f"{k}_t"])}: {plain(en[f"{k}_d"])}'
                         for k in ('f_session', 'f_fuel', 'f_service', 'f_analytics', 'f_fleet', 'f_sync', 'f_theme'))
    faq = '\n'.join(f'- {plain(en[f"q{i}"])} {plain(en[f"a{i}"])}' for i in range(1, 8))
    return f"""# Generator Tracker

> {plain(en['meta_description'])}

Mobile app for Android (7.0+) and iPhone/iPad (iOS 16.4+) that tracks generator run hours, fuel refills
and maintenance intervals. Offline-first: data lives on the device, an account is optional and used only
for syncing between the owner's devices. No analytics SDKs; the paid Android app has no ads, the free editions (the iOS app and Generator Tracker Lite on Android) show ads removable with a one-time purchase. Open source under the MIT license.
Current version: {en['app_version']} (released {en['notes_date']}). Languages: English, Ukrainian.
Author: Yuri Valigursky.

## Pages
- [Home, English]({SITE_URL})
- [Головна, українською]({SITE_URL}uk/): {plain(uk['meta_description'])}
- [Download, English]({SITE_URL}download/): {plain(en['dl_meta_description'])}
- [Завантажити, українською]({SITE_URL}uk/download/): {plain(uk['dl_meta_description'])}
- [Privacy policy]({SITE_URL}privacy_policy/privacy-policy.html)
- [Політика конфіденційності]({SITE_URL}privacy_policy/privacy-policy-uk.html)

## Install
- [App Store, free (iPhone and iPad)]({APP_STORE_URL})
- [Google Play, free Generator Tracker Lite (Android)]({LITE_PLAY_URL.format(hl='en')})
- [Google Play, paid Generator Tracker without ads or limits (Android)]({en['play_url']})
- [Smart link that opens the free app in the right store for the device]({SITE_URL}get/)

## Editions and prices
- Free: Generator Tracker for iPhone and iPad (App Store) and Generator Tracker Lite for Android (Google Play).
  Ads on the Analytics and Settings screens only; up to 3 generators and 2 maintenance tasks per generator.
- One-time purchases in the free editions: "Remove ads" $0.99, "Unlimited" $0.99, "Everything" $1.49. No subscriptions.
- Paid: Generator Tracker for Android (Google Play), one payment, no ads, no limits, no in-app purchases.
- All editions track the same things, work offline and need no account.

## Features
{features}

## FAQ
{faq}

## Source and changes
- [Source code on GitHub]({GITHUB_URL})
- [Release notes]({GITHUB_URL}/tree/main/release_notes)
- [Changelog]({GITHUB_URL}/blob/main/CHANGELOG.md)
- [MIT license]({GITHUB_URL}/blob/main/LICENSE)
"""


def get_page(en: dict, uk: dict) -> str:
    """/get/: opens the free app in the visitor's store; shows both links where it cannot tell."""
    lite = LITE_PLAY_URL.format(hl='en')
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{plain(en['get_title'])} — Generator Tracker</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="{SITE_URL}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../styles.css?v={en['build_id']}">
  <script>
    (function () {{
      try {{ var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; }} catch (e) {{}}
      var ua = navigator.userAgent || '';
      var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var url = /android/i.test(ua) ? '{lite}' : ios ? '{APP_STORE_URL}' : null;
      if (url) location.replace(url);
    }})();
  </script>
</head>
<body class="utility-page">
  <main class="container utility">
    <img src="../assets/app-icon.png" width="80" height="80" alt="">
    <h1>{en['get_title']}</h1>
    <p class="lead">{en['get_text']} <span lang="uk">{uk['get_text']}</span></p>
    <div class="store-badges is-centered">
      <a class="store-badge" href="{APP_STORE_URL}" rel="noopener">{APPLE_ICON}<span><small>{en['dl_badge_ios_small']}</small><strong>App Store</strong></span></a>
      <a class="store-badge" href="{lite}" rel="noopener">{PLAY_ICON}<span><small>{en['dl_badge_play_small']}</small><strong>Google Play</strong></span></a>
    </div>
    <p class="utility-links"><a href="../download/">{en['get_free_more']}</a> · <a href="../uk/download/" lang="uk" hreflang="uk">{uk['get_free_more']}</a></p>
    <p class="utility-links"><a href="../">{en['get_site']}</a> · <a href="../uk/" lang="uk" hreflang="uk">{uk['get_site']}</a></p>
  </main>
</body>
</html>
"""


def not_found_page(en: dict, uk: dict) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{en['nf_title']} — Generator Tracker</title>
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="/GeneratorTracker/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/GeneratorTracker/styles.css?v={en['build_id']}">
  <script>
    (function () {{ try {{ var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; }} catch (e) {{}} }})();
  </script>
</head>
<body class="utility-page">
  <main class="container utility">
    <p class="eyebrow">404</p>
    <h1>{en['nf_title']}</h1>
    <p class="lead">{en['nf_text']}</p>
    <p class="lead" lang="uk">{uk['nf_title']}. {uk['nf_text']}</p>
    <p class="utility-links"><a class="btn" href="/GeneratorTracker/">{en['nf_home']}</a> <a class="btn btn-ghost" href="/GeneratorTracker/uk/" lang="uk" hreflang="uk">{uk['nf_home']}</a></p>
  </main>
</body>
</html>
"""


def manifest(en: dict) -> str:
    return json.dumps({
        'name': 'Generator Tracker', 'short_name': 'GenTracker', 'description': plain(en['meta_description']),
        'lang': 'en', 'start_url': './', 'scope': './', 'display': 'browser',
        'background_color': '#f3f1ec', 'theme_color': '#1b1a17',
        'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                  {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'}],
    }, indent=2)


def sitemap(today: str) -> str:
    xhtml = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    alternates = {
        '': 'uk/', 'uk/': '',
        'download/': 'uk/download/', 'uk/download/': 'download/',
        'privacy_policy/privacy-policy.html': 'privacy_policy/privacy-policy-uk.html',
        'privacy_policy/privacy-policy-uk.html': 'privacy_policy/privacy-policy.html',
    }
    langs = {'': 'en', 'uk/': 'uk', 'download/': 'en', 'uk/download/': 'uk',
             'privacy_policy/privacy-policy.html': 'en',
             'privacy_policy/privacy-policy-uk.html': 'uk'}
    entries = []
    for page, alt in alternates.items():
        links = ''.join(
            f'\n    <xhtml:link rel="alternate" hreflang="{langs[p]}" href="{SITE_URL}{p}"/>' for p in (page, alt))
        default = f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE_URL}{page if langs[page] == "en" else alt}"/>'
        entries.append(f'  <url>\n    <loc>{SITE_URL}{page}</loc>\n    <lastmod>{today}</lastmod>{links}{default}\n  </url>')
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" {xhtml}>\n' + '\n'.join(entries) + '\n</urlset>\n')


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    template = (ROOT / 'template.html').read_text()
    download_template = (ROOT / 'download.html').read_text()
    build_id = str(int(time.time()))
    today = date.today().isoformat()
    app_version = json.loads((REPO / 'app.json').read_text())['expo']['version']

    rendered = {}
    for lang_file in sorted((ROOT / 'i18n').glob('*.json')):
        s = json.loads(lang_file.read_text())
        s.update(site_url=SITE_URL, build_id=build_id, today=today, app_version=app_version,
                 play_url=PLAY_URL.format(hl=s['play_hl']), app_store_url=APP_STORE_URL,
                 lite_play_url=LITE_PLAY_URL.format(hl=s['play_hl']))
        s.update(read_release_notes(app_version, s['lang']))
        s['notes_date_human'] = human_date(s['notes_date'], s['lang'])
        for kind in MARK_PATHS:
            s[f'mark_{kind}'] = MARK.format(cls=kind, path=MARK_PATHS[kind], text=s[f'cmp_{kind}_text'])
        s['json_ld'] = json_ld(s)
        target = OUT / s['canonical_path'] / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(template, s))
        (target.parent / 'download').mkdir()
        (target.parent / 'download' / 'index.html').write_text(render(download_template, download_strings(s)))
        rendered[s['lang']] = s

    en, uk = rendered['en'], rendered['uk']
    for name in ('styles.css', 'main.js', 'favicon.svg', 'favicon.png', 'apple-touch-icon.png',
                 'icon-192.png', 'icon-512.png'):
        shutil.copy(ROOT / name, OUT / name)
    shutil.copytree(ROOT / 'assets', OUT / 'assets')
    shutil.copytree(ROOT / 'fonts', OUT / 'fonts')
    (OUT / 'get').mkdir()
    (OUT / 'get' / 'index.html').write_text(get_page(en, uk))
    (OUT / '404.html').write_text(not_found_page(en, uk))
    (OUT / 'llms.txt').write_text(llms_txt(en, uk))
    (OUT / 'site.webmanifest').write_text(manifest(en))
    # AdMob verifies the seller of the ad inventory at <developer website host>/app-ads.txt (IAB app-ads.txt).
    (OUT / 'app-ads.txt').write_text('google.com, pub-6097353818165340, DIRECT, f08c47fec0942fa0\n')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /get/\nSitemap: {SITE_URL}sitemap.xml\n')
    (OUT / 'sitemap.xml').write_text(sitemap(today))
    (OUT / '.nojekyll').write_text('')
    print(f'Built {OUT} (app {app_version}, notes {en["notes_version"]})')


if __name__ == '__main__':
    main()
