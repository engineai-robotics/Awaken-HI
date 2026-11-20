#!/usr/bin/env python3
"""Serve the local Awaken-HI project page with byte ranges and visit stats."""
import argparse
import gzip
import hashlib
import ipaddress
import json
import os
import re
from pathlib import Path
import secrets
import sqlite3
import time
from functools import lru_cache
from io import BytesIO
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from email.utils import formatdate
from urllib.parse import urlsplit, unquote, parse_qs
from urllib.request import ProxyHandler, build_opener

PREVIEW = Path(__file__).resolve().parent
ROOT = PREVIEW.parent / 'docs'
STATE = Path(os.environ.get('ENGINE_HI_STATE', str(PREVIEW / '.state')))
VISITS_PATH = '/api/visits.json'
STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
DB = STATE / 'visits.sqlite3'
with sqlite3.connect(DB) as db:
    db.executescript('''
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, country TEXT, name TEXT, lat REAL, lon REAL, created REAL);
    CREATE TABLE IF NOT EXISTS geo_cache (key TEXT PRIMARY KEY, data TEXT, expires REAL);
    ''')
    db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)')
    db.execute('INSERT OR IGNORE INTO settings VALUES (?, ?)', ('salt', secrets.token_hex(32)))
    SALT = db.execute("SELECT value FROM settings WHERE key='salt'").fetchone()[0]
WORLD = json.loads((ROOT / 'assets/world-countries.geojson').read_text())
CENTERS = {f['properties']['code']: f['properties'] for f in WORLD['features']}
PROXIES = [ipaddress.ip_network(p.strip()) for p in os.environ.get('ENGINE_HI_TRUSTED_PROXIES', '').split(',') if p.strip()]
VISIT_ORIGINS = frozenset(origin.strip() for origin in os.environ.get('AWAKEN_VISIT_ORIGINS', '').split(',') if origin.strip())
UNKNOWN = {'country': '', 'name': 'Local / unknown', 'lat': None, 'lon': None}

def locate(ip):
    if not ipaddress.ip_address(ip).is_global:
        return UNKNOWN
    key = hashlib.sha256((SALT + ip).encode()).hexdigest()
    with sqlite3.connect(DB, timeout=10) as db:
        cached = db.execute('SELECT data FROM geo_cache WHERE key=? AND expires>?', (key, time.time())).fetchone()
    if cached:
        return json.loads(cached[0])
    result = UNKNOWN
    try:
        # Always specify the visitor IP; never geolocate the server's own address.
        with build_opener(ProxyHandler({})).open('https://ipwho.is/' + ip, timeout=4) as response:
            data = json.load(response)
        center = CENTERS.get(data.get('country_code')) if data.get('success') else None
        if center:
            result = {'country': data['country_code'], 'name': data['country'],
                      'lat': center['lat'], 'lon': center['lon']}
    except Exception:
        pass
    with sqlite3.connect(DB, timeout=10) as db:
        db.execute('INSERT OR REPLACE INTO geo_cache VALUES (?, ?, ?)',
                   (key, json.dumps(result), time.time() + (604800 if result['country'] else 300)))
    return result

def statistics():
    with sqlite3.connect(DB, timeout=10) as db:
        rows = db.execute('SELECT country, name, lat, lon, COUNT(*) FROM visits GROUP BY country ORDER BY COUNT(*) DESC, country').fetchall()
    countries = [dict(zip(('code', 'name', 'lat', 'lon', 'count'), r)) for r in rows if r[0]]
    return {'total': sum(r[4] for r in rows), 'unknown': sum(r[4] for r in rows if not r[0]),
            'countries': countries, 'country_count': len(countries)}

@lru_cache(maxsize=64)
def compressed_asset(path, modified, size):
    return gzip.compress(Path(path).read_bytes(), compresslevel=6, mtime=0)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    timeout = 30

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        self._range_remaining = None
        path = self.translate_path(self.path)
        query = parse_qs(urlsplit(self.path).query)
        self._static_cache = 'public, max-age=31536000, immutable' if query.get('v') and not path.endswith('.html') else 'no-cache'
        text_asset = Path(path).suffix.lower() in {'.html', '.css', '.js', '.svg', '.json', '.geojson'}
        # The index is served for /. Other paths still use the existing allowlist.
        if Path(path).is_dir() and (Path(path) / 'index.html').is_file():
            path = str(Path(path) / 'index.html')
            text_asset = True
            self._static_cache = 'no-cache'
        if text_asset and Path(path).is_file():
            self._vary_encoding = True
            if 'gzip' in self.headers.get('Accept-Encoding', ''):
                stat = os.stat(path)
                etag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}-gzip"'
                if self.headers.get('If-None-Match') == etag:
                    self.send_response(304)
                    self.send_header('ETag', etag)
                    self.end_headers()
                    return None
                data = compressed_asset(path, stat.st_mtime_ns, stat.st_size)
                self.send_response(200)
                self.send_header('Content-Type', self.guess_type(path))
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('ETag', etag)
                self.send_header('Last-Modified', formatdate(stat.st_mtime, usegmt=True))
                self.end_headers()
                return BytesIO(data)
        if Path(path).suffix.lower() != '.mp4' or not Path(path).is_file():
            return super().send_head()
        stream = open(path, 'rb')
        stat = os.fstat(stream.fileno())
        size = stat.st_size
        start, end = 0, size - 1
        requested = self.headers.get('Range')
        # Ignore a stale If-Range and send the complete current representation.
        if self.headers.get('If-Range') not in (None, formatdate(stat.st_mtime, usegmt=True)):
            requested = None
        if requested:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
            valid = bool(match and any(match.groups()))
            if valid:
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    start = max(0, size - int(last))
                valid = 0 <= start <= end < size
            if not valid:
                stream.close()
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
        self.send_response(206 if requested else 200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Last-Modified', formatdate(stat.st_mtime, usegmt=True))
        self.send_header('Content-Length', str(end - start + 1))
        if requested:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        stream.seek(start)
        self._range_remaining = end - start + 1
        return stream

    def end_headers(self):
        if getattr(self, '_static_cache', None):
            self.send_header('Cache-Control', self._static_cache)
            self._static_cache = None
        if getattr(self, '_vary_encoding', False):
            self.send_header('Vary', 'Accept-Encoding')
            self._vary_encoding = False
        super().end_headers()

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_range_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        try:
            while remaining:
                chunk = source.read(min(256 * 1024, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            # Browsers cancel old range requests while seeking or leaving a video.
            pass

    def send_json(self, value, status=200):
        content = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_visit_cors()
        self.end_headers()
        self.wfile.write(content)

    def send_visit_cors(self):
        origin = self.headers.get('Origin')
        self.send_header('Vary', 'Origin')
        if origin in VISIT_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)

    def do_OPTIONS(self):
        if urlsplit(self.path).path != VISITS_PATH:
            return self.send_error(404)
        if self.headers.get('Origin') not in VISIT_ORIGINS:
            return self.send_error(403)
        self.send_response(204)
        self.send_visit_cors()
        self.send_header('Access-Control-Allow-Methods', 'GET, POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == VISITS_PATH:
            return self.send_json({'live': True, **statistics()})
        if not self.static_allowed(path):
            return self.send_error(404)
        return super().do_GET()

    def static_allowed(self, path):
        target = (ROOT / unquote(path).lstrip('/')).resolve()
        return target in [ROOT, ROOT / 'index.html', ROOT / 'script.js', ROOT / 'styles.css', ROOT / 'visitors.js'] or target.is_relative_to(ROOT / 'assets')

    def do_HEAD(self):
        if not self.static_allowed(urlsplit(self.path).path):
            return self.send_error(404)
        return super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)

    def do_POST(self):
        if urlsplit(self.path).path != VISITS_PATH:
            return self.send_error(404)
        if (self.headers.get('Sec-Fetch-Site') == 'cross-site' and
                self.headers.get('Origin') not in VISIT_ORIGINS):
            return self.send_error(403)
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 512:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            visit_id = payload['id']
            if not isinstance(visit_id, str) or not 16 <= len(visit_id) <= 80 or not all(c.isalnum() or c in '-_' for c in visit_id):
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            return self.send_json({'error': 'Invalid visit ID'}, 400)
        with sqlite3.connect(DB, timeout=10) as db:
            if db.execute('SELECT 1 FROM visits WHERE id=?', (visit_id,)).fetchone():
                return self.send_json(statistics())
        ip = self.client_address[0]
        if any(ipaddress.ip_address(ip) in network for network in PROXIES):
            chain = self.headers.get('X-Forwarded-For', '').split(',')
            for candidate in reversed(chain):
                try:
                    parsed = ipaddress.ip_address(candidate.strip())
                except ValueError:
                    continue
                ip = str(parsed)
                if not any(parsed in network for network in PROXIES):
                    break
        geo = locate(ip)
        with sqlite3.connect(DB, timeout=10) as db:
            db.execute('INSERT OR IGNORE INTO visits VALUES (?, ?, ?, ?, ?, ?)',
                       (visit_id, geo['country'], geo['name'], geo['lat'], geo['lon'], time.time()))
        self.send_json(statistics())

    def log_message(self, fmt, *args):
        # Avoid retaining visitor IP addresses in access logs.
        print(time.strftime('%Y-%m-%d %H:%M:%S'), fmt % args, flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=18088)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    print(f'Awaken-HI project page at http://{args.host}:{args.port}/', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
