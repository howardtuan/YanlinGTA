import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildWiki } from './wiki/build.mjs';
import { buildSeo } from './wiki/seo.mjs';

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

// PWA manifest 的 <link> 在 Vite 處理完 HTML 之後才加上去：如果寫在 index.html 裡，Vite 會把它當資產搬到
// assets/manifest-xxxx.webmanifest，裡面的 start_url "./" 就變成 /assets/，加到 iPhone 主畫面後會開到
// yanlin-gta.com/assets/（icons 路徑也會跟著錯）。manifest 本身由 staticAssetsPlugin 原封不動複製到 dist 根目錄。
// 網頁圖示同理：寫在 index.html 會被改成 assets/favicon-<雜湊>.ico，每次換圖網址就變，Google 搜尋結果的網站圖示
// 抓不穩；改在這裡加上固定網址 assets/icon/…（staticAssetsPlugin 原樣複製），另外 dist 根目錄也放一份 favicon.ico。
// Google 要求圖示是 48px 倍數的正方形，所以 192×192 的 PNG 放第一個。
function manifestLinkPlugin() {
  const link = (attrs) => ({ tag: 'link', attrs, injectTo: 'head' });
  return {
    name: 'manifest-link',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        link({
          rel: 'icon',
          type: 'image/png',
          href: 'assets/icon/icon-192.png',
          sizes: '192x192',
        }),
        link({ rel: 'icon', href: 'favicon.ico', sizes: '16x16 32x32 48x48' }),
        link({ rel: 'apple-touch-icon', href: 'assets/icon/apple-touch-icon.png' }),
        link({ rel: 'manifest', href: 'manifest.webmanifest' }),
      ],
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
      // 網站根目錄的 /favicon.ico：Google 和瀏覽器找不到 <link rel="icon"> 時會直接抓這個網址
      fs.copyFileSync(
        path.resolve(ROOT, 'assets', 'icon', 'favicon.ico'),
        path.resolve(outDir, 'favicon.ico')
      );
      // 遊戲百科 Wiki：yanlin-gta.com/wiki/（wiki/build.mjs）
      buildWiki({ root: ROOT, outDir: path.resolve(outDir, 'wiki') });
      // SEO / AEO / GEO：sitemap.xml、robots.txt、llms.txt 放在網站根目錄（wiki/seo.mjs）
      buildSeo({ root: ROOT, outDir });
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [wasm(), npcDashboardPlugin(), manifestLinkPlugin(), staticAssetsPlugin()],
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
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/graphics/wasm/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
