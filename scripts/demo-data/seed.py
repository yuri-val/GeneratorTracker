#!/usr/bin/env python3
"""Seed realistic demo data into a simulator/emulator install of Generator Tracker.

Used for store and landing-page screenshots. Writes the app's AsyncStorage directly, so the
app must be terminated while seeding and relaunched afterwards. Never touches real devices or
the cloud: the data is local-only (signed out, syncStatus "pending").

  # iOS simulator (container from `xcrun simctl get_app_container booted <bundle> data`)
  scripts/demo-data/seed.py ios <data-container> [--lang en|uk] [--active]
  # Android: a copy of the RKStorage SQLite database (pulled with `adb exec-out run-as … cat`)
  scripts/demo-data/seed.py android <RKStorage file> [--lang en|uk] [--active]
"""
import argparse
import hashlib
import json
import os
import random
import sqlite3
from datetime import date, datetime, timedelta

IOS_BUNDLE = 'com.yuri-val.generatortracker'

GENERATORS = [
    ('gen-honda', 'Honda EU22i', '2025-03-12', 0.55),
    ('gen-hyundai', 'Hyundai HHY 7020FE', '2024-11-02', 1.35),
    ('gen-atlas', 'Atlas Copco QES 30', '2023-06-20', 4.1),
]
TEXT = {
    'en': {
        'models': ['Inverter 2.2 kW', '6.5 kW, electric start', 'Diesel 30 kVA'],
        'tasks': {'oil': 'Oil change', 'air': 'Air filter', 'plug': 'Spark plug',
                  'fuel': 'Fuel filter', 'battery': 'Battery check'},
    },
    'uk': {
        'models': ['Інвертор 2,2 кВт', '6,5 кВт, електростартер', 'Дизель 30 кВА'],
        'tasks': {'oil': 'Заміна мастила', 'air': 'Повітряний фільтр', 'plug': 'Свічка запалювання',
                  'fuel': 'Паливний фільтр', 'battery': 'Перевірка акумулятора'},
    },
}


def iso(dt: datetime) -> str:
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')


def build(today: date, active: bool, lang: str = 'en'):
    text = TEXT[lang]
    rnd = random.Random(42)
    now = datetime.now()
    generators, sessions, refills, tasks = [], [], [], []
    for index, (gid, name, purchased, burn) in enumerate(GENERATORS):
        model = text['models'][index]
        created = datetime.fromisoformat(purchased + 'T10:00:00')
        generators.append({'id': gid, 'name': name, 'model': model, 'purchaseDate': purchased,
                           'createdAt': iso(created), 'lastModified': iso(now - timedelta(minutes=index)),
                           'syncStatus': 'pending'})
        total_hours = 0.0
        fuel_since_refill = 0.0
        day = today - timedelta(days=150)
        n = 0
        while day < today:
            # More frequent runs in autumn, fewer in early summer; bigger units run less often.
            gap = rnd.choice([1, 2, 2, 3, 4]) + index
            day += timedelta(days=gap)
            if day >= today:
                break
            start_h = rnd.choice([7, 8, 9, 17, 18, 19, 20])
            hours = round(rnd.uniform(1.5, 5.5) if index < 2 else rnd.uniform(3, 9), 1)
            end_dt = datetime.combine(day, datetime.min.time()) + timedelta(hours=start_h + hours)
            n += 1
            sessions.append({'id': f'{gid}-s{n}', 'generatorId': gid, 'date': day.isoformat(),
                             'startTime': f'{start_h:02d}:00', 'endTime': end_dt.strftime('%H:%M'),
                             'hours': hours, 'isActive': False,
                             'createdAt': iso(end_dt), 'lastModified': iso(end_dt), 'syncStatus': 'pending'})
            total_hours += hours
            fuel_since_refill += hours * burn
            tank = {0: 3.6, 1: 25, 2: 90}[index]
            if fuel_since_refill > tank * 0.7:
                amount = round(min(tank, fuel_since_refill) * 2) / 2
                refills.append({'id': f'{gid}-r{len(refills)}', 'generatorId': gid, 'date': day.isoformat(),
                                'amount': amount, 'createdAt': iso(end_dt), 'lastModified': iso(end_dt),
                                'syncStatus': 'pending'})
                fuel_since_refill = 0.0
        # Maintenance: one task due, one soon, one fine — shows every status.
        base = [
            ('oil', text['tasks']['oil'], 100, None, total_hours - 104),
            ('air', text['tasks']['air'], 200, 180, total_hours - 182),
            ('plug', text['tasks']['plug'], None, 365, 0),
            ('fuel', text['tasks']['fuel'], 300, None, total_hours - 40),
            ('battery', text['tasks']['battery'], None, 90, 0),
        ]
        for key, title, ih, idays, last_hours in base:
            last_date = (today - timedelta(days={'plug': 120, 'battery': 20}.get(key, 30))).isoformat()
            task = {'id': f'{gid}-{key}', 'generatorId': gid, 'title': title,
                    'lastServiceHours': round(max(0.0, last_hours), 1), 'lastServiceDate': last_date,
                    'createdAt': iso(now), 'lastModified': iso(now), 'syncStatus': 'pending'}
            if ih:
                task['intervalHours'] = ih
            if idays:
                task['intervalDays'] = idays
            tasks.append(task)
    if active:
        start = now - timedelta(hours=2, minutes=15)
        sessions.append({'id': 'gen-honda-active', 'generatorId': 'gen-honda', 'date': start.date().isoformat(),
                         'startTime': start.strftime('%H:%M'), 'hours': 0, 'isActive': True,
                         'createdAt': iso(start), 'lastModified': iso(start), 'syncStatus': 'pending'})
    return {
        '@generators': generators,
        '@work_sessions': sessions,
        '@refills': refills,
        '@maintenance_tasks': tasks,
    }


def write_ios(container: str, data: dict, lang: str):
    directory = os.path.join(container, 'Library', 'Application Support', IOS_BUNDLE, 'RCTAsyncLocalStorage_V1')
    os.makedirs(directory, exist_ok=True)
    manifest_path = os.path.join(directory, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    entries = {key: json.dumps(value) for key, value in data.items()}
    entries['@app_language'] = lang
    entries['@sync_tombstones'] = '[]'
    for key, value in entries.items():
        file_path = os.path.join(directory, hashlib.md5(key.encode()).hexdigest())
        if len(value) > 1024:  # RCTInlineValueThreshold: large values live in their own file
            with open(file_path, 'w') as f:
                f.write(value)
            manifest[key] = None
        else:
            if os.path.exists(file_path):
                os.remove(file_path)
            manifest[key] = value
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f)


def write_android(db_path: str, data: dict, lang: str):
    db = sqlite3.connect(db_path)
    db.execute('CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    rows = [(key, json.dumps(value)) for key, value in data.items()]
    rows += [('@app_language', lang), ('@sync_tombstones', '[]')]
    db.executemany('INSERT OR REPLACE INTO catalystLocalStorage (key, value) VALUES (?, ?)', rows)
    db.commit()
    db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('platform', choices=['ios', 'android'])
    parser.add_argument('target')
    parser.add_argument('--lang', choices=['en', 'uk'], default='en')
    parser.add_argument('--active', action='store_true', help='add a running session on the first generator')
    args = parser.parse_args()
    data = build(date.today(), args.active, args.lang)
    (write_ios if args.platform == 'ios' else write_android)(args.target, data, args.lang)
    print({key: len(value) for key, value in data.items()})


if __name__ == '__main__':
    main()
