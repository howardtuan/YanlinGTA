// Browser drivers for the profile harness. Both expose the same small surface:
//   { engine, eval(expr), addInitScript(src), navigate(url), gc(), version(), close() }
// - chrome: raw CDP through tools/e2e/cdp.mjs (no dependencies). Can emulate an iPhone viewport and
//   force GC, but its WebGL goes through ANGLE/Metal|SwiftShader, not Safari.
// - webkit: Playwright's WebKit build (optional dev dependency `playwright-core`). It is the real Safari
//   engine and renders with the Apple GPU on a Mac, the closest thing to iOS that runs unattended.
import { launchChrome, connectPage } from '../e2e/cdp.mjs';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';

export async function launchChromeDriver({ chrome, gpu, mobile, width, height, uncap }) {
  const extraArgs = uncap ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [];
  const browser = await launchChrome({ chrome, gpu, width, height, extraArgs });
  const page = await connectPage(browser.port);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('HeapProfiler.enable');
  if (mobile) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA });
  }
  return {
    engine: 'chrome',
    eval: (expr) => page.eval(expr),
    addInitScript: (source) => page.send('Page.addScriptToEvaluateOnNewDocument', { source }),
    navigate: (url) => page.send('Page.navigate', { url }),
    async gc() {
      await page.send('HeapProfiler.collectGarbage');
      await new Promise((r) => {
        setTimeout(r, 400);
      });
      await page.send('HeapProfiler.collectGarbage');
    },
    async version() {
      return (await page.send('Browser.getVersion')).product;
    },
    async close() {
      page.close();
      await browser.kill();
    },
  };
}

export async function launchWebKitDriver({ mobile, width, height }) {
  let pw;
  try {
    pw = await import('playwright-core');
  } catch (_e) {
    throw new Error(
      'playwright-core is not installed (WebKit engine unavailable): npm i -D playwright-core && npx playwright-core install webkit'
    );
  }
  let browser;
  try {
    browser = await pw.webkit.launch({ headless: true });
  } catch (e) {
    throw new Error(
      `WebKit browser unavailable (${String(e.message).split('\n')[0]}): npx playwright-core install webkit`
    );
  }
  const ctxOpts = mobile
    ? { ...pw.devices['iPhone 15 Pro'] }
    : { viewport: { width, height }, deviceScaleFactor: 1 };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  return {
    engine: 'webkit',
    eval: (expr) => page.evaluate(expr),
    addInitScript: (source) => page.addInitScript(source),
    navigate: (url) => page.goto(url, { waitUntil: 'commit' }),
    gc: async () => {}, // WebKit exposes no forced GC; WeakRef counts are best-effort there
    version: async () => `WebKit/${browser.version()}`,
    async close() {
      await browser.close();
    },
  };
}
