// 貨物列車（src/entities/Trains.js schedule、src/entities/TrainModel.js 平車與貨櫃）：每天挑幾班換成貨櫃／軍運列車，
// 同一天每次都一樣、不同天不一樣；貨櫃方塊的每個三角形都朝外（三角形方向反了會變成只看得到兩端的薄片）
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { schedule, FREIGHT_PER_DAY, SPEED } from '../../src/entities/Trains.js';
import { carGeometry, cargoKind, CAR_L } from '../../src/entities/TrainModel.js';
import { WEEKDAY, WEEKEND } from '../../src/entities/TrainTimetable.js';

const cargo = (L) => L.filter((t) => t.look === 'freight' || t.look === 'military');

describe('貨物列車班次', () => {
  it('每天挑 FREIGHT_PER_DAY 班，同一天一樣、不同天不一樣，沒給日期就不換', () => {
    const a = cargo(schedule(WEEKDAY, 446, 4376, 17, 20261127)),
      b = cargo(schedule(WEEKDAY, 446, 4376, 17, 20261127)),
      c = cargo(schedule(WEEKDAY, 446, 4376, 17, 20261201));
    expect(a).toHaveLength(FREIGHT_PER_DAY);
    expect(cargo(schedule(WEEKEND, 446, 4376, 17, 20261128))).toHaveLength(FREIGHT_PER_DAY);
    expect(a.map((t) => t.no)).toEqual(b.map((t) => t.no));
    expect(a.map((t) => t.no)).not.toEqual(c.map((t) => t.no));
    expect(cargo(schedule(WEEKDAY, 446, 4376))).toHaveLength(0);
  });
  it('換成貨物列車後，同方向前後兩班仍不會追撞', () => {
    for (const day of [20261127, 20261128, 20261201, 20270315]) {
      const L = schedule(WEEKDAY, 446, 4376, 17, day);
      for (const dir of [1, -1]) {
        const D = L.filter((t) => t.dir === dir).sort((x, y) => x.tRef - y.tRef);
        for (let i = 1; i < D.length; i++)
          expect((D[i].tRef - D[i - 1].tRef) * 4 * SPEED).toBeGreaterThan(D[i - 1].cars * CAR_L);
      }
    }
  });
  it('第 0 節是機車頭，最後一節掛尾燈', () => {
    expect(cargoKind('freight', 0, false, 3)).toBe('head');
    expect(cargoKind('freight', 12, true, 3)).toMatch(/^w\dT$/);
    expect(cargoKind('military', 5, false, 3)).toMatch(/^m\d$/);
  });
});

describe('平車上的貨櫃、軍車', () => {
  it('貨櫃每個三角形都朝外', () => {
    const p = carGeometry('freight', 'w1').attributes.position.array;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    let n = 0,
      inward = 0;
    for (let i = 0; i < p.length; i += 9) {
      a.fromArray(p, i);
      b.fromArray(p, i + 3);
      c.fromArray(p, i + 6);
      const cen = a.clone().add(b).add(c).divideScalar(3);
      if (cen.y < 1.3) continue; // 地板以下是車底架、轉向架
      const zc = [-6.3, 0, 6.3].reduce((q, z) =>
        Math.abs(z - cen.z) < Math.abs(q - cen.z) ? z : q
      );
      if (Math.abs(cen.z - zc) > 6.06 / 2 + 1e-3) continue; // 貨櫃以外（手煞車桿）
      const out = cen.clone().sub(new THREE.Vector3(0, 1.22 + 2.59 / 2, zc));
      const nn = b.clone().sub(a).cross(c.clone().sub(a));
      n++;
      if (nn.dot(out) < 0) inward++;
    }
    expect(n).toBeGreaterThan(20);
    expect(inward).toBe(0);
  });
  it('每種貨車的三角形數在預算內、沒有壞值', () => {
    for (const [look, kinds] of [
      ['freight', ['head', 'w0', 'w1', 'w2', 'w3T']],
      ['military', ['head', 'm0', 'm1', 'm2T']],
    ])
      for (const k of kinds) {
        const g = carGeometry(look, k),
          P = g.attributes.position.array;
        expect(P.length / 9).toBeLessThan(3000);
        expect(P.every(Number.isFinite)).toBe(true);
        expect(g.boundingBox.max.y).toBeLessThan(5.5);
      }
  });
});
