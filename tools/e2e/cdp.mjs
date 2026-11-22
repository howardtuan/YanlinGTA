// Minimal Chrome DevTools Protocol client: launches Chrome and talks to one page target
// over the built-in WebSocket (Node >= 22). No npm dependencies.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sleep = ms => new Promise(r => { setTimeout(r, ms); });

export function defaultChromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'win32') {
    for (const p of [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ]) if (fs.existsSync(p)) return p;
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (fs.existsSync(p)) return p;
  return 'google-chrome';
}

// gpu: 'swiftshader' | 'gpu'
export function chromeArgs({ gpu, width, height, headless = true }) {
  const a = [
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=Translate,MediaRouter,CalculateNativeWinOcclusion', '--autoplay-policy=no-user-gesture-required',
    '--mute-audio', `--window-size=${width},${height}`, '--hide-scrollbars', '--password-store=basic', '--use-mock-keychain',
  ];
  if (headless) a.push('--headless=new');
  if (gpu === 'swiftshader') a.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  else if (process.platform === 'win32') a.push('--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization');
  else if (process.platform === 'darwin') a.push('--use-angle=metal', '--ignore-gpu-blocklist');
  else a.push('--ignore-gpu-blocklist', '--enable-gpu');
  // after a GPU-process hiccup Chrome would otherwise block WebGL for the page's origin
  if (gpu !== 'swiftshader') a.push('--disable-domain-blocking-for-3d-apis', '--disable-gpu-process-crash-limit');
  return a;
}

export async function launchChrome({ chrome, gpu = 'swiftshader', width = 1280, height = 720, headless = true, extraArgs = [] }) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yanlin-e2e-'));
  const args = [...chromeArgs({ gpu, width, height, headless }), ...extraArgs, `--user-data-dir=${userDir}`, '--remote-debugging-port=0', 'about:blank'];
  const proc = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', d => { stderr += d; if (stderr.length > 20000) stderr = stderr.slice(-10000); });
  let exited = false; proc.on('exit', () => { exited = true; });
  proc.on('error', e => { exited = true; stderr += String(e); });
  // Chrome writes the chosen port to DevToolsActivePort
  const portFile = path.join(userDir, 'DevToolsActivePort');
  let port = 0;
  for (let i = 0; i < 300 && !port; i++) {
    if (exited) throw new Error(`Chrome exited during startup (${chrome}):\n${stderr.slice(-2000)}`);
    try { const t = fs.readFileSync(portFile, 'utf8').split('\n'); if (t[0]) port = +t[0]; } catch { }
    if (!port) await sleep(100);
  }
  if (!port) throw new Error('Chrome did not open a DevTools port:\n' + stderr.slice(-2000));
  const kill = async () => {
    try { proc.kill(); } catch { }
    for (let i = 0; i < 30 && !exited; i++) await sleep(100);
    if (!exited) try { proc.kill('SIGKILL'); } catch { }
    for (let i = 0; i < 10; i++) { try { fs.rmSync(userDir, { recursive: true, force: true }); break; } catch { await sleep(300); } }
  };
  return { proc, port, userDir, kill, stderr: () => stderr };
}

export class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map(); this.closed = false;
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`)); else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.handlers.get(msg.method) || []) { try { fn(msg.params); } catch (e) { console.error(e); } }
      }
    });
    ws.addEventListener('close', () => { this.closed = true; for (const { reject, method } of this.pending.values()) reject(new Error(`${method}: socket closed`)); this.pending.clear(); });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', () => rej(new Error('WebSocket error ' + url)), { once: true }); });
    return new CDP(ws);
  }
  send(method, params = {}, timeoutMs = 60000) {
    if (this.closed) return Promise.reject(new Error(`${method}: socket closed`));
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`${method}: timeout`)); } }, timeoutMs);
      this.pending.set(id, { resolve: v => { clearTimeout(t); resolve(v); }, reject: e => { clearTimeout(t); reject(e); }, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(fn); }
  // evaluate an expression in the page; returns its JSON value
  async eval(expression, { awaitPromise = true, timeoutMs = 60000 } = {}) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, timeoutMs);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('page eval: ' + (d.exception?.description || d.text));
    }
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch { } }
}

// first page target of a freshly launched Chrome
export async function connectPage(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return CDP.connect(page.webSocketDebuggerUrl);
    } catch { }
    await sleep(100);
  }
  throw new Error('no page target');
}
