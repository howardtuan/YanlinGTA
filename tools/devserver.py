"""Local dev server: like `python -m http.server`, but tells the browser to re-check every file
(Cache-Control: no-cache). Without it the browser may keep an old js/*.js next to a new index.html
after an update, and the game fails to load ("Cannot set properties of null").

It also serves the NPC dashboard's save API (tools/npc-dashboard), only to this computer:
  GET  /__dev/ping              -> {"ok": true}   (the dashboard checks it is on the dev server)
  POST /__dev/npcs              -> writes data/npcs.json (the NPC registry, JSON body)
  POST /__dev/npc-photo?id=...  -> keeps a reference photo in tools/npc-dashboard/photos/ (git-ignored)
The deployed site (Dockerfile / nginx) has none of this and never ships tools/.

Usage: python -I tools/devserver.py [port]   (default 5173, serves the repository root)
"""
import functools, http.server, json, os, re, sys, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
NPCS = os.path.join(ROOT, 'data', 'npcs.json')
PHOTOS = os.path.join(ROOT, 'tools', 'npc-dashboard', 'photos')
LOCAL = {'127.0.0.1', '::1', '::ffff:127.0.0.1'}
MAX_BODY = 12 * 1024 * 1024


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _local(self):
        return self.client_address[0] in LOCAL

    def do_GET(self):
        if self.path.startswith('/__dev/ping'):
            return self._json(200, {'ok': True, 'local': self._local()})
        return super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if not url.path.startswith('/__dev/'):
            return self._json(404, {'error': 'not found'})
        if not self._local():
            return self._json(403, {'error': '只接受本機（127.0.0.1）的請求'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            return self._json(400, {'error': 'empty or too large'})
        body = self.rfile.read(n)
        if url.path == '/__dev/npcs':
            try:
                data = json.loads(body.decode('utf-8'))
                assert isinstance(data, dict) and isinstance(data.get('npcs'), list) and isinstance(data.get('places'), dict)
                ids = [p.get('id') for p in data['npcs']]
                assert all(isinstance(i, str) and i for i in ids) and len(ids) == len(set(ids)), 'NPC id 要唯一'
            except Exception as e:  # noqa: BLE001
                return self._json(400, {'error': f'格式不對：{e}'})
            tmp = NPCS + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')
            os.replace(tmp, NPCS)
            return self._json(200, {'ok': True, 'count': len(data['npcs'])})
        if url.path == '/__dev/npc-photo':
            q = urllib.parse.parse_qs(url.query)
            npc = (q.get('id') or [''])[0]
            if not re.fullmatch(r'[a-z0-9_-]{1,40}', npc):
                return self._json(400, {'error': 'bad id'})
            ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}.get(self.headers.get('Content-Type', ''), '')
            if not ext:
                return self._json(400, {'error': '只收 jpg / png / webp'})
            os.makedirs(PHOTOS, exist_ok=True)
            for old in os.listdir(PHOTOS):
                if old.rsplit('.', 1)[0] == npc:
                    os.remove(os.path.join(PHOTOS, old))
            name = f'{npc}.{ext}'
            with open(os.path.join(PHOTOS, name), 'wb') as f:
                f.write(body)
            return self._json(200, {'ok': True, 'path': f'tools/npc-dashboard/photos/{name}'})
        return self._json(404, {'error': 'not found'})


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = functools.partial(NoCache, directory=ROOT)
    http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
