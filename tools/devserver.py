"""Local dev server: like `python -m http.server`, but tells the browser to re-check every file
(Cache-Control: no-cache). Without it the browser may keep an old js/*.js next to a new index.html
after an update, and the game fails to load ("Cannot set properties of null").

Usage: python -I tools/devserver.py [port]   (default 5173, serves the repository root)
"""
import functools, http.server, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = functools.partial(NoCache, directory=ROOT)
    http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
