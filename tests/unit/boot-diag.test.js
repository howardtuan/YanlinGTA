// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { BOOT_DIAG_KEY, createBootDiag } from '../../src/core/BootDiag.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('BootDiag', () => {
  it('records checkpoints and resets crashCount on complete()', async () => {
    const storage = createMemoryStorage();
    let t = 1000;
    const diag = createBootDiag({ diagMode: 'off', storage, now: () => t });

    await diag.begin();
    diag.checkpoint('fetch-and-wasm', 0.02, '載入地圖資料');
    t += 120;
    diag.checkpoint('build-world', 0.08, '搭建中原大學');
    t += 450;
    diag.complete();

    const saved = JSON.parse(storage.getItem(BOOT_DIAG_KEY));
    expect(saved.crashCount).toBe(0);
    expect(saved.safeMode).toBeUndefined();
    expect(saved.current.completed).toBe(true);
    expect(saved.current.step).toBe('complete');
    expect(saved.current.stages).toEqual([
      { step: 'init', ms: 0 },
      { step: 'fetch-and-wasm', ms: 120 },
      { step: 'build-world', ms: 450 },
    ]);
  });

  it('promotes an unfinished prior boot to lastCrash and increments crashCount', async () => {
    const storage = createMemoryStorage();
    let t = 0;

    // Session 1 dies abruptly inside build-world without calling complete()
    const run1 = createBootDiag({ diagMode: 'off', storage, now: () => t });
    await run1.begin();
    run1.checkpoint('fetch-and-wasm', 0.02, '載入地圖資料');
    t += 80;
    run1.checkpoint('build-world', 0.08, '搭建中原大學');
    t += 300;

    // Session 2 starts after WebKit page reload
    const run2 = createBootDiag({ diagMode: 'on', storage, doc: document, now: () => t });
    const s2 = await run2.begin();
    expect(s2.crashCount).toBe(1);
    expect(s2.safeMode).toBeUndefined();
    expect(s2.lastCrash.step).toBe('build-world');
    expect(s2.lastCrash.pct).toBe(0.08);
    expect(s2.lastCrash.stages).toEqual([
      { step: 'init', ms: 0 },
      { step: 'fetch-and-wasm', ms: 80 },
    ]);

    run2.complete();
  });

  it('never turns on a safe mode (#455): repeated unfinished boots or a lost context only leave diagnostics', async () => {
    const storage = createMemoryStorage();
    // an old stored state with the removed safe-mode flags
    storage.setItem(
      BOOT_DIAG_KEY,
      JSON.stringify({ current: null, crashCount: 3, safeMode: true, contextLost: true })
    );
    for (let i = 0; i < 3; i++) {
      const r = createBootDiag({ diagMode: 'off', storage });
      await r.begin();
      r.checkpoint('build-world', 0.08, '搭建中原大學');
      expect(r.isSafeMode).toBeUndefined();
      expect(r.tickHealthy).toBeUndefined();
    }
    const fakeCanvas = document.createElement('canvas');
    const r = createBootDiag({ diagMode: 'off', storage });
    const st = await r.begin();
    expect(st.safeMode).toBeUndefined();
    expect(st.contextLost).toBeUndefined();
    expect(st.crashCount).toBe(3);
    r.attachCanvas(fakeCanvas);
    fakeCanvas.dispatchEvent(new Event('webglcontextlost'));
    const saved = JSON.parse(storage.getItem(BOOT_DIAG_KEY));
    expect(saved.safeMode).toBeUndefined();
    expect(saved.current.contextLost).toBe(1);
    r.complete();
    expect(JSON.parse(storage.getItem(BOOT_DIAG_KEY)).crashCount).toBe(0);
  });

  it('halts reload loops in ?diag=halt until user clicks continue', async () => {
    const storage = createMemoryStorage();
    document.body.innerHTML = '';

    const seeded = createBootDiag({ diagMode: 'off', storage });
    await seeded.begin();
    seeded.checkpoint('build-world', 0.08, '搭建中原大學');

    const haltedDiag = createBootDiag({ diagMode: 'halt', storage, doc: document });
    let resolved = false;
    const pending = haltedDiag.begin().then((res) => {
      resolved = true;
      return res;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    const btn = document.body.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('繼續單次載入');

    btn.click();
    const state = await pending;
    expect(resolved).toBe(true);
    expect(state.crashCount).toBe(0);
    expect(state.lastCrash.step).toBe('build-world');
  });
});
