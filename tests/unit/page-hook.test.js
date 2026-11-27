// @vitest-environment happy-dom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOOK_PATH = path.join(ROOT, 'tools', 'perf', 'page-hook.js');

describe('perf page-hook peakCanvasMB tracking', () => {
  let origGetContext;
  let origWidthDesc;
  let origHeightDesc;
  let origBench;

  beforeAll(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
    origWidthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
    origHeightDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
    origBench = window.__bench;

    HTMLCanvasElement.prototype.getContext = function () {
      return {};
    };
    const src = fs
      .readFileSync(HOOK_PATH, 'utf8')
      .replaceAll('__BENCH_CFG__', JSON.stringify({ seed: 1 }));
    new Function(src)();
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    if (origWidthDesc) Object.defineProperty(HTMLCanvasElement.prototype, 'width', origWidthDesc);
    if (origHeightDesc)
      Object.defineProperty(HTMLCanvasElement.prototype, 'height', origHeightDesc);
    if (origBench === undefined) delete window.__bench;
    else window.__bench = origBench;
    vi.restoreAllMocks();
  });

  it('tracks live canvasMB and preserves historical peakCanvasMB after 1x1 release', () => {
    const a = document.createElement('canvas');
    a.width = 512;
    a.height = 512;
    a.getContext('2d');
    expect(window.__bench.canvasReport()).toMatchObject({
      canvasCount: 1,
      canvasMB: 1,
      peakCanvasMB: 1,
    });

    const b = document.createElement('canvas');
    b.getContext('2d');
    b.width = 1024;
    b.height = 512;
    expect(window.__bench.canvasReport()).toMatchObject({
      canvasCount: 2,
      canvasMB: 3,
      peakCanvasMB: 3,
    });

    a.width = 1;
    a.height = 1;
    b.width = 1;
    b.height = 1;
    const afterRelease = window.__bench.canvasReport();
    expect(afterRelease.canvasMB).toBe(0);
    expect(afterRelease.peakCanvasMB).toBe(3);
  });
});
