// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { Physics } from '../../src/physics/Physics.js';
import { mountStaticWallsAndSurfaces } from '../../src/physics/PhysWorld.js';
import { learnUI } from '../../src/systems/minigames/Learn.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith('.js')
          ? [path.join(dir, e.name)]
          : []
    );

const STATIC_IMPORT =
  /^\s*(?:import(?!\s*\()|export)\b[^'"]*?(?:from\s*)?['"](\.{1,2}\/[^'"]+)['"]/gm;

describe('Issue #389 重型子系統按需拆包與物理補掛', () => {
  it('src/ 內對 Arena.js / LearnCourses.js / MahjongScene.js / P2P.js 皆為 0 靜態匯入', () => {
    const forbidden = new Set([
      'world/buildings/Arena.js',
      'systems/minigames/LearnCourses.js',
      'systems/mahjong/MahjongScene.js',
      'systems/mahjong/P2P.js',
    ]);
    const offenders = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of text.matchAll(STATIC_IMPORT)) {
        const target = path.resolve(path.dirname(file), m[1].split('?')[0]);
        const relTarget = path.relative(SRC, target).split(path.sep).join('/');
        if (forbidden.has(relTarget)) {
          offenders.push(`${path.relative(SRC, file)} -> ${relTarget}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('mountStaticWallsAndSurfaces 在真實 Rapier 世界建立牆體與看台樓板並寫入 tags.walls', async () => {
    const R = await import('../../vendor/rapier/rapier.mjs');
    const wasm = fs.readFileSync(path.join(ROOT, 'vendor/rapier/rapier.wasm'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () =>
        wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
    });
    await R.init();
    fetchSpy.mockRestore();

    const physics = new Physics();
    physics.R = R;
    physics.world = new R.World({ x: 0, y: -9.81, z: 0 });
    physics.tags = { walls: new Set(), trunks: new Set(), ground: new Set() };

    const res = mountStaticWallsAndSurfaces(
      physics,
      [[3000, -3000, 3010, -3000, 0, 4]],
      [
        {
          pts: [
            [3000, -3010],
            [3010, -3010],
            [3010, -2990],
            [3000, -2990],
          ],
          h: () => 5.5,
        },
      ]
    );
    expect(res).toEqual({ walls: 1, floors: 1 });
    expect(physics.tags.walls.size).toBe(1);

    physics.world.step();

    // 向下射線應命中 y = 5.5 的看台樓板
    const floorHit = physics.world.castRay(
      new R.Ray({ x: 3005, y: 10, z: -3002 }, { x: 0, y: -1, z: 0 }),
      20,
      true
    );
    expect(floorHit).toBeTruthy();
    expect(10 - floorHit.timeOfImpact).toBeCloseTo(5.5, 2);

    // 水平射線應命中掛載於 tags.walls 的牆體
    const wallHit = physics.world.castRay(
      new R.Ray({ x: 3005, y: 2, z: -3004 }, { x: 0, y: 0, z: 1 }),
      10,
      true
    );
    expect(wallHit).toBeTruthy();
    expect(physics.tags.walls.has(wallHit.collider.handle)).toBe(true);
  });

  it('learnUI 首次按需載入教材並於快取後同步渲染', async () => {
    const root1 = document.createElement('div');
    const ui1 = learnUI(root1, {});
    expect(root1.textContent).toContain('正在載入資管學堂教材');
    await ui1.ready;
    expect(root1.querySelectorAll('.lr-card').length).toBe(3);

    const root2 = document.createElement('div');
    learnUI(root2, {});
    expect(root2.querySelectorAll('.lr-card').length).toBe(3);
  });
});
