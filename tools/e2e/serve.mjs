#!/usr/bin/env node
// Tiny zero-dependency static file server for the game (ES modules need http://, not file://).
//   node tools/e2e/serve.mjs [--root=<repo dir>] [--port=5173] [--host=127.0.0.1]
// Also importable: const srv = await startServer({ root, port: 0 }); srv.url; await srv.close();
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

export function startServer({
  root,
  port = 0,
  host = '127.0.0.1',
  basePath = '/',
  log = false,
} = {}) {
  const base = path.resolve(root);
  const normBase = `/${String(basePath || '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/+$/, '/');
  const bareBase = normBase === '/' ? '/' : normBase.slice(0, -1);
  const server = http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (normBase !== '/') {
      if (rel === bareBase) {
        res.writeHead(301, { Location: normBase });
        res.end();
        return;
      }
      if (!rel.startsWith(normBase)) {
        if (log) console.log('404 (outside basePath)', rel);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      rel = `/${rel.slice(normBase.length)}`;
    }
    let file = path.join(base, rel);
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        file = path.join(file, 'index.html');
        st = fs.existsSync(file) ? fs.statSync(file) : null;
        err = st ? null : err || new Error('no index');
      }
      if (err || !st) {
        if (log) console.log('404', rel);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const headers = {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes',
      };
      // Range support so <audio>/<video> can seek
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (m) {
        const start = m[1] ? +m[1] : 0,
          end = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
        if (start >= st.size || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${st.size}`,
          'Content-Length': end - start + 1,
        });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const a = server.address();
      resolve({
        server,
        port: a.port,
        url: `http://${host}:${a.port}${normBase}`,
        close: () =>
          new Promise((r) => {
            server.closeAllConnections?.();
            server.close(() => r());
          }),
      });
    });
  });
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (k, d) => {
    const a = process.argv.find((s) => s.startsWith(`--${k}=`));
    return a ? a.slice(k.length + 3) : d;
  };
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(arg('root', path.join(here, '..', '..')));
  const srv = await startServer({
    root,
    port: +arg('port', 5173),
    host: arg('host', '127.0.0.1'),
    log: process.argv.includes('--log'),
  });
  console.log(`serving ${root} at ${srv.url}  (Ctrl+C to stop)`);
}
