#!/usr/bin/env python3
"""App Store downloads, redownloads, updates and in-app purchases from Apple's daily Sales reports.

Usage:  python3 marketing/appstore_sales.py [--days 14]

Needs an App Store Connect API key with the Sales (or Finance/Admin) role — the EAS key is App Manager and gets 403:
- credentials/ios/AuthKey_<KEY_ID>.p8
- credentials/ios/asc-sales-key.env with ASC_SALES_KEY_ID=<KEY_ID> and ASC_VENDOR_NUMBER=<vendor #> (Payments and
  Financial Reports); the issuer ID comes from credentials/ios/asc-api-key.env (EXPO_ASC_ISSUER_ID).
Everything under credentials/ is git-ignored. The JWT is signed with the openssl CLI, so no pip packages are needed.

Daily reports appear the next morning (US time) and don't change afterwards, so fetched days are cached in the local
marketing/appstore_sales.local.csv (excluded via .git/info/exclude) and only missing days are downloaded. A day
without transactions comes back as 404 "no sales". A vendor that has never had a transaction gets 400 "Invalid vendor
number" until Apple generates its first report.
"""
import argparse
import base64
import csv
import datetime as dt
import gzip
import io
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / 'credentials' / 'ios'
CACHE = ROOT / 'marketing' / 'appstore_sales.local.csv'
COLUMNS = ('date', 'sku', 'title', 'type', 'country', 'units', 'proceeds', 'currency')
# Product Type Identifier → bucket (https://developer.apple.com/help/app-store-connect/reference/product-type-identifiers)
TYPES = {
    **dict.fromkeys(('1', '1F', '1T', '1E', '1EP', '1EU', 'F1'), 'downloads'),
    **dict.fromkeys(('3', '3F', '3T', 'F3'), 'redownloads'),
    **dict.fromkeys(('7', '7F', '7T', 'F7'), 'updates'),
    **dict.fromkeys(('IA1', 'IA1-M', 'FI1', 'IA9', 'IA9-M', 'IAY', 'IAY-M', 'IAC', 'IAC-M'), 'purchases'),
}
BUCKETS = ('downloads', 'redownloads', 'updates', 'purchases')


def read_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.replace('export ', '').strip()] = v.strip().strip('"')
    return env


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def der_to_raw(sig):
    """openssl gives an ASN.1 DER ECDSA signature; JWS ES256 wants r || s, 32 bytes each."""
    def read_int(buf, i):
        assert buf[i] == 0x02
        n = buf[i + 1]
        return int.from_bytes(buf[i + 2:i + 2 + n], 'big'), i + 2 + n
    i = 2 if sig[1] < 0x80 else 2 + (sig[1] & 0x7F)
    r, i = read_int(sig, i)
    s, _ = read_int(sig, i)
    return r.to_bytes(32, 'big') + s.to_bytes(32, 'big')


def token(key_id, issuer, key_path):
    now = int(time.time())
    header = b64url(json.dumps({'alg': 'ES256', 'kid': key_id, 'typ': 'JWT'}).encode())
    payload = b64url(json.dumps({'iss': issuer, 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'}).encode())
    signing_input = f'{header}.{payload}'.encode()
    der = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(key_path)], input=signing_input,
                         capture_output=True, check=True).stdout
    return f'{header}.{payload}.{b64url(der_to_raw(der))}'


def fetch_day(day, auth, vendor):
    """Rows of the day's SALES SUMMARY report, [] for a day without sales."""
    params = urllib.parse.urlencode({
        'filter[frequency]': 'DAILY', 'filter[reportType]': 'SALES', 'filter[reportSubType]': 'SUMMARY',
        'filter[vendorNumber]': vendor, 'filter[reportDate]': day.isoformat(), 'filter[version]': '1_1'})
    req = urllib.request.Request(f'https://api.appstoreconnect.apple.com/v1/salesReports?{params}',
                                 headers={'Authorization': f'Bearer {auth}', 'Accept': 'application/a-gzip'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            text = gzip.decompress(r.read()).decode('utf-8')
    except urllib.error.HTTPError as e:
        detail = json.loads(e.read() or b'{}').get('errors', [{}])[0].get('detail', '')
        if e.code == 404:
            return []
        raise RuntimeError(f'{e.code}: {detail}') from None
    return [{'date': day.isoformat(), 'sku': x['SKU'], 'title': x['Title'], 'type': x['Product Type Identifier'],
             'country': x['Country Code'], 'units': x['Units'], 'proceeds': x['Developer Proceeds'],
             'currency': x['Currency of Proceeds']}
            for x in csv.DictReader(io.StringIO(text), delimiter='\t')]


def load_cache():
    if not CACHE.exists():
        return [], set()
    rows = list(csv.DictReader(CACHE.open(encoding='utf-8')))
    return [r for r in rows if r['sku']], {r['date'] for r in rows}


def save_cache(rows, days):
    with CACHE.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r['date'], r['sku'], r['country'])))
        # a marker row keeps days without sales from being downloaded again
        w.writerows({'date': d, **dict.fromkeys(COLUMNS[1:], '')} for d in sorted(days - {r['date'] for r in rows}))


def report(rows, days):
    if not days:
        print('Звітів за цей період ще немає.')
        return
    per_day = defaultdict(lambda: dict.fromkeys(BUCKETS, 0))
    countries = defaultdict(int)
    proceeds = defaultdict(float)
    for r in rows:
        bucket = TYPES.get(r['type'])
        if not bucket:
            continue
        per_day[r['date']][bucket] += int(r['units'])
        if bucket == 'downloads':
            countries[r['country']] += int(r['units'])
        if r['proceeds'] and float(r['proceeds']):
            proceeds[r['currency']] += float(r['proceeds']) * int(r['units'])
    print('| Дата | Завантаження | Повторні | Оновлення | Покупки |')
    print('|---|---|---|---|---|')
    total = dict.fromkeys(BUCKETS, 0)
    for d in sorted(days):
        v = per_day[d]
        for b in BUCKETS:
            total[b] += v[b]
        print(f"| {d} | {v['downloads']} | {v['redownloads']} | {v['updates']} | {v['purchases']} |")
    print(f"| **Разом** | **{total['downloads']}** | **{total['redownloads']}** | **{total['updates']}** "
          f"| **{total['purchases']}** |")
    if countries:
        print('\nЗавантаження за країнами: ' + ', '.join(f'{c} {n}' for c, n in sorted(countries.items(), key=lambda x: -x[1])))
    if proceeds:
        print('Дохід розробника: ' + ', '.join(f'{v:.2f} {c}' for c, v in proceeds.items()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=14, help='how many days back from yesterday (default 14)')
    args = ap.parse_args()

    sales = read_env(CREDS / 'asc-sales-key.env')
    key_id, vendor = sales['ASC_SALES_KEY_ID'], sales['ASC_VENDOR_NUMBER']
    issuer = read_env(CREDS / 'asc-api-key.env')['EXPO_ASC_ISSUER_ID']
    auth = token(key_id, issuer, CREDS / f'AuthKey_{key_id}.p8')

    yesterday = dt.date.today() - dt.timedelta(days=1)
    wanted = {(yesterday - dt.timedelta(days=i)).isoformat() for i in range(args.days)}
    rows, cached = load_cache()
    fetched = set()
    for day in sorted(wanted - cached):
        try:
            rows += fetch_day(dt.date.fromisoformat(day), auth, vendor)
            fetched.add(day)
        except RuntimeError as e:
            if 'Invalid vendor number' in str(e):
                print(f'{e} — Apple has no Sales report for this vendor yet (it appears after the first '
                      'transaction) or ASC_VENDOR_NUMBER is wrong.', file=sys.stderr)
                break
            # the newest day may not be published yet
            print(f'{day}: {e}', file=sys.stderr)
    save_cache(rows, cached | fetched)
    report([r for r in rows if r['date'] in wanted], wanted & (cached | fetched))


if __name__ == '__main__':
    main()
