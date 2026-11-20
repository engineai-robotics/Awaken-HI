#!/usr/bin/env python3
"""Serve a GitHub-style local preview generated directly from README.md."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit

import mistune

PREVIEW = Path(__file__).resolve().parent
ROOT = PREVIEW.parent
ASSETS = ROOT / 'docs' / 'assets'
render = mistune.create_markdown(escape=False, plugins=['table', 'task_lists'])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        if urlsplit(self.path).path in ('/', '/github-preview.html'):
            template = (PREVIEW / 'readme.html').read_text(encoding='utf-8')
            readme = (ROOT / 'README.md').read_text(encoding='utf-8')
            page = template.replace('<!-- README -->', render(readme)).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(page)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return BytesIO(page)
        path = Path(self.translate_path(self.path)).resolve()
        if not path.is_relative_to(ASSETS) or not path.is_file():
            self.send_error(404)
            return None
        return super().send_head()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=18099)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    print(f'Awaken-HI README preview at http://{args.host}:{args.port}/', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
