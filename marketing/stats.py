#!/usr/bin/env python3
"""Collect views/reactions/comments for every publication in marketing/publications.local.md.

Usage:  python3 marketing/stats.py [--no-write]

Reads the links from the table in publications.local.md, fetches the public counters of each site,
prints a table, appends a snapshot to marketing/stats.local.csv and rewrites the "Статистика" section at
the end of publications.local.md (both files are local, excluded via .git/info/exclude).

Sources:
- telegra.ph   — api.telegra.ph/getViews (views)
- drukarnia    — the article page's Nuxt payload (viewNum, readNum, fullReadNum, likeNum, commentNum)
- dev.to       — public API (reactions, comments); views need a DEV API key: DEVTO_API_KEY (env or the local pub.env) or
                 credentials/devto-api-key (dev.to → Settings → Extensions → DEV Community API Keys)
- anything else (Reddit blocks scripted requests, …) is listed as "manual".

Opening an article in a browser counts as a view on some sites; this script's requests may too.
"""
import csv
import datetime as dt
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBS = ROOT / 'marketing' / 'publications.local.md'
CSV = ROOT / 'marketing' / 'stats.local.csv'
STATS_HEADING = '## Статистика'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) GeneratorTrackerStats/1.0'


def get(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8')


def telegraph(url):
    path = urllib.parse.urlparse(url).path.strip('/')
    data = json.loads(get(f'https://api.telegra.ph/getViews/{path}'))
    return {'views': data['result']['views']} if data.get('ok') else {'error': data.get('error')}


def drukarnia(url):
    html = get(url)
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return {'error': 'no Nuxt payload'}
    arr = json.loads(m.group(1))  # devalue: objects map keys to indices into the array
    slug = urllib.parse.urlparse(url).path.rstrip('/').split('/')[-1]
    for item in arr:
        if isinstance(item, dict) and 'viewNum' in item and 'slug' in item and arr[item['slug']] == slug:
            val = lambda k: arr[item[k]] if k in item else None
            return {'views': val('viewNum'), 'reads': val('readNum'), 'full_reads': val('fullReadNum'),
                    'reactions': val('likeNum'), 'comments': val('commentNum')}
    return {'error': 'article not found in payload'}


def devto_key():
    """DEVTO_API_KEY from the environment, the local pub.env (KEY=value lines) or credentials/devto-api-key."""
    key = os.environ.get('DEVTO_API_KEY')
    env = ROOT / 'pub.env'
    if not key and env.exists():
        for line in env.read_text().splitlines():
            name, _, value = line.partition('=')
            if name.strip().removeprefix('export ') == 'DEVTO_API_KEY':
                key = value.strip().strip('"\'')
    f = ROOT / 'credentials' / 'devto-api-key'
    return key or (f.read_text().strip() if f.exists() else None)


def devto(url):
    path = urllib.parse.urlparse(url).path.strip('/')
    art = json.loads(get(f'https://dev.to/api/articles/{path}'))
    out = {'reactions': art.get('public_reactions_count'), 'comments': art.get('comments_count')}
    key = devto_key()
    if key:
        mine = json.loads(get('https://dev.to/api/articles/me/all?per_page=1000', {'api-key': key}))
        for a in mine:
            if a.get('id') == art.get('id'):
                out['views'] = a.get('page_views_count')
    else:
        out['note'] = 'views need DEVTO_API_KEY'
    return out


def medium(url):
    # Views are author-only, and Cloudflare answers scripted requests (page, ?format=json, GraphQL) with 403.
    return {'note': 'manual: medium.com/me/stats'}


FETCHERS = {'telegra.ph': telegraph, 'drukarnia.com.ua': drukarnia, 'dev.to': devto, 'medium.com': medium}


def publications():
    """Rows of the first table in publications.local.md that have an http(s) link."""
    rows = []
    for line in PUBS.read_text().splitlines():
        if line.startswith(STATS_HEADING):
            break
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        link = next((c for c in cells if c.startswith('http')), None)
        if line.startswith('|') and link:
            rows.append({'date': cells[0], 'site': cells[1], 'lang': cells[2], 'url': link})
    return rows


def collect():
    results = []
    for pub in publications():
        host = urllib.parse.urlparse(pub['url']).netloc.removeprefix('www.')
        fetch = FETCHERS.get(host)
        try:
            data = fetch(pub['url']) if fetch else {'note': 'manual'}
        except Exception as e:  # one failing site must not stop the rest
            data = {'error': f'{type(e).__name__}: {e}'}
        results.append({**pub, **data})
    return results


def fmt(v):
    return '—' if v is None else str(v)


def table(results, now):
    lines = [f'{STATS_HEADING} (оновлено {now:%Y-%m-%d %H:%M}, `python3 marketing/stats.py`)', '',
             '| Де | Мова | Перегляди | Прочитання | Реакції | Коментарі | Примітка |', '|---|---|---|---|---|---|---|']
    for r in results:
        reads = r.get('reads') if r.get('full_reads') is None else f"{fmt(r.get('reads'))} ({r['full_reads']} повністю)"
        lines.append(f"| [{r['site']}]({r['url']}) | {r['lang']} | {fmt(r.get('views'))} | {fmt(reads)} | "
                     f"{fmt(r.get('reactions'))} | {fmt(r.get('comments'))} | {r.get('error') or r.get('note') or ''} |")
    total = sum(r.get('views') or 0 for r in results)
    lines += ['', f'Разом переглядів (де відомо): **{total}**', '']
    return '\n'.join(lines)


def previous_views():
    if not CSV.exists():
        return {}
    last = {}
    with CSV.open() as f:
        for row in csv.DictReader(f):
            if row['views']:
                last[row['url']] = int(row['views'])
    return last


def main():
    now = dt.datetime.now()
    before = previous_views()
    results = collect()
    md = table(results, now)
    print(md)
    for r in results:
        if r.get('views') is not None and r['url'] in before:
            print(f"{r['site']}: {r['views'] - before[r['url']]:+d} переглядів з минулого запуску")
    if '--no-write' in sys.argv:
        return
    new = not CSV.exists()
    with CSV.open('a', newline='') as f:
        w = csv.writer(f)
        if new:
            w.writerow(['timestamp', 'site', 'lang', 'url', 'views', 'reads', 'full_reads', 'reactions', 'comments'])
        for r in results:
            w.writerow([now.isoformat(timespec='minutes'), r['site'], r['lang'], r['url']] +
                       ['' if r.get(k) is None else r[k] for k in ('views', 'reads', 'full_reads', 'reactions', 'comments')])
    text = PUBS.read_text()
    head = text.split(STATS_HEADING)[0].rstrip() + '\n\n'
    PUBS.write_text(head + md)


if __name__ == '__main__':
    main()
