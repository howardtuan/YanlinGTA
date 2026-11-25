import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const NPCS = path.join(ROOT, 'data', 'npcs.json');
const PHOTOS = path.join(ROOT, 'tools', 'npc-dashboard', 'photos');
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);
const MAX_BODY = 12 * 1024 * 1024;

function npcDashboardPlugin() {
  return {
    name: 'npc-dashboard-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        if (!reqUrl.pathname.startsWith('/__dev/')) {
          return next();
        }

        const remoteIp = req.socket.remoteAddress;
        const isLocal =
          LOCAL_HOSTS.has(remoteIp) ||
          req.headers.host?.startsWith('localhost') ||
          req.headers.host?.startsWith('127.0.0.1');

        const sendJson = (code, obj) => {
          const body = Buffer.from(JSON.stringify(obj));
          res.writeHead(code, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': body.length,
          });
          res.end(body);
        };

        if (req.method === 'GET' && reqUrl.pathname === '/__dev/ping') {
          return sendJson(200, { ok: true, local: isLocal });
        }

        if (req.method === 'POST') {
          if (!isLocal) {
            return sendJson(403, { error: '只接受本機（127.0.0.1）的請求' });
          }

          const contentLength = parseInt(req.headers['content-length'] || '0', 10);
          if (contentLength <= 0 || contentLength > MAX_BODY) {
            return sendJson(400, { error: 'empty or too large' });
          }

          const chunks = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            const body = Buffer.concat(chunks);

            if (reqUrl.pathname === '/__dev/npcs') {
              try {
                const data = JSON.parse(body.toString('utf-8'));
                if (
                  !data ||
                  typeof data !== 'object' ||
                  !Array.isArray(data.npcs) ||
                  typeof data.places !== 'object'
                ) {
                  throw new Error('格式不正確');
                }
                const ids = data.npcs.map((p) => p.id);
                if (
                  !ids.every((id) => typeof id === 'string' && id) ||
                  ids.length !== new Set(ids).size
                ) {
                  throw new Error('NPC id 要唯一');
                }

                const tmp = `${NPCS}.tmp`;
                fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
                fs.renameSync(tmp, NPCS);
                return sendJson(200, { ok: true, count: data.npcs.length });
              } catch (e) {
                return sendJson(400, { error: `格式不對：${e.message}` });
              }
            }

            if (reqUrl.pathname === '/__dev/npc-photo') {
              const npc = reqUrl.searchParams.get('id') || '';
              if (!/^[a-z0-9_-]{1,40}$/.test(npc)) {
                return sendJson(400, { error: 'bad id' });
              }
              const contentType = req.headers['content-type'] || '';
              const extMap = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
              };
              const ext = extMap[contentType];
              if (!ext) {
                return sendJson(400, { error: '只收 jpg / png / webp' });
              }

              fs.mkdirSync(PHOTOS, { recursive: true });
              for (const old of fs.readdirSync(PHOTOS)) {
                if (old.split('.')[0] === npc) {
                  fs.unlinkSync(path.join(PHOTOS, old));
                }
              }
              const fileName = `${npc}.${ext}`;
              fs.writeFileSync(path.join(PHOTOS, fileName), body);
              return sendJson(200, { ok: true, path: `tools/npc-dashboard/photos/${fileName}` });
            }

            return sendJson(404, { error: 'not found' });
          });
          return;
        }

        return sendJson(404, { error: 'not found' });
      });
    },
  };
}

// ?boottrace（src/core/BootTrace.js）：手機載入時每走一步就 POST 一筆到 /__boot，這裡印在終端機並附加到
// 系統暫存資料夾的 yanlin-boot-trace.jsonl。被系統殺掉、自動重整的那一次，也看得到最後走到哪一步。
// 只在 npm run dev 有效；只收小筆 JSON，不寫專案裡的任何檔案。
const BOOT_LOG = path.join(os.tmpdir(), 'yanlin-boot-trace.jsonl');
const BOOT_MAX = 16 * 1024;
function bootTracePlugin() {
  return {
    name: 'boot-trace',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || !req.url.split('?')[0].endsWith('/__boot')) return next();
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
          size += c.length;
          if (size <= BOOT_MAX) chunks.push(c);
        });
        req.on('end', () => {
          res.statusCode = 204;
          res.end();
          if (size > BOOT_MAX) return;
          let r;
          try {
            r = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
          } catch (_e) {
            return;
          }
          if (!r || typeof r !== 'object') return;
          // one line per record: control characters (newlines, escapes) become spaces
          const s = (v) =>
            Array.from(String(v ?? '').slice(0, 300), (ch) =>
              ch.charCodeAt(0) < 32 || ch === '\u007f' ? ' ' : ch
            ).join('');
          const num = (v) => (Number.isFinite(v) ? v : '?');
          const heap = Number.isFinite(r.heap) ? `  heap ${r.heap}MB` : '';
          const extra = r.extra ? `  ${s(r.extra)}` : '';
          server.config.logger.info(
            `[boot ${s(r.sid)}] ${String(num(r.t)).padStart(6)}ms  ${s(r.label)}  canvas ${num(r.cmb)}MB/${num(r.cn)}${heap}${extra}`,
            { timestamp: true }
          );
          fs.appendFile(
            BOOT_LOG,
            `${JSON.stringify({ at: new Date().toISOString(), ...r })}\n`,
            () => {}
          );
        });
      });
    },
  };
}

// Copy static game data to dist on build
function staticAssetsPlugin() {
  return {
    name: 'static-assets-copy',
    closeBundle() {
      const copyDir = (src, dest, skip = null) => {
        if (!fs.existsSync(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        for (const item of fs.readdirSync(src)) {
          if (skip?.has(item)) continue;
          const s = path.join(src, item);
          const d = path.join(dest, item);
          if (fs.statSync(s).isDirectory()) {
            copyDir(s, d);
          } else {
            fs.copyFileSync(s, d);
          }
        }
      };

      const outDir = path.resolve(ROOT, 'dist');
      copyDir(path.resolve(ROOT, 'data'), path.resolve(outDir, 'data'));
      copyDir(path.resolve(ROOT, 'assets'), path.resolve(outDir, 'assets'), new Set(['private']));
      copyDir(path.resolve(ROOT, 'vendor'), path.resolve(outDir, 'vendor'));
      if (fs.existsSync(path.resolve(ROOT, 'manifest.webmanifest'))) {
        fs.copyFileSync(
          path.resolve(ROOT, 'manifest.webmanifest'),
          path.resolve(outDir, 'manifest.webmanifest')
        );
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [wasm(), npcDashboardPlugin(), bootTracePlugin(), staticAssetsPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // three 自己一個檔：遊戲程式更新時它的內容雜湊不變，玩家不用重新下載
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
  },
});
