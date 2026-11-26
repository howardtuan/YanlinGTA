import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CAM_VIEW,
  camPoints,
  discardScale,
  fitCamera,
  MahjongScene,
  specSpot,
  zoneRank,
} from '../../src/systems/mahjong/MahjongScene.js';
import { MahjongEngine } from '../../src/systems/mahjong/Engine.js';
import { makeAI } from '../../src/systems/mahjong/AI.js';
import { serializeStateFor, RemoteMahjongEngine } from '../../src/systems/mahjong/Net.js';

// 麻將桌的鏡頭自動取景與海底放大（src/systems/mahjong/MahjongScene.js）
const SIZES = [
  { name: '手機橫拿', w: 844, h: 390, bar: 74, mode: 'close' },
  { name: '手機直拿', w: 390, h: 844, bar: 170, mode: 'close' },
  { name: '電腦小視窗', w: 800, h: 600, bar: 0, mode: 'far' },
  { name: '電腦全螢幕', w: 1920, h: 1080, bar: 0, mode: 'far' },
  { name: '直立平板遠景', w: 768, h: 1024, bar: 0, mode: 'far' },
];

describe('fitCamera：重點區塊塞滿畫面又不被切掉', () => {
  for (const S of SIZES) {
    it(S.name, () => {
      const c = new THREE.PerspectiveCamera(50, S.w / S.h, 0.05, 30);
      const mine = S.mode === 'far';
      const top = 40,
        side = 10,
        bottom = S.bar ? 6 : 34;
      const r = fitCamera(c, CAM_VIEW[S.mode](S.w / S.h), { w: S.w, h: S.h, bar: S.bar, mine });
      expect(r.y).toBeLessThanOrEqual(2.55 + 1e-6); // 不撞到天花板的燈
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of camPoints(mine)) {
        const v = p.clone().project(c);
        const x = ((v.x + 1) / 2) * S.w,
          y = ((1 - v.y) / 2) * S.h;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      // 全部在可用範圍裡（上面留名牌、下面留手牌條或提示列）
      expect(minX).toBeGreaterThanOrEqual(side - 1);
      expect(maxX).toBeLessThanOrEqual(S.w - side + 1);
      expect(minY).toBeGreaterThanOrEqual(top - 1);
      expect(maxY).toBeLessThanOrEqual(S.h - S.bar - bottom + 1);
      // 而且是塞滿的：至少有一個方向貼齊可用範圍
      const fillW = (maxX - minX) / (S.w - 2 * side),
        fillH = (maxY - minY) / (S.h - S.bar - bottom - top);
      expect(Math.max(fillW, fillH)).toBeGreaterThan(0.97);
    });
  }
});

describe('discardScale：海底放大但不壓到牌牆', () => {
  it('前三排放大 1.3 倍', () => {
    expect(discardScale(0)).toBeCloseTo(1.3);
    expect(discardScale(21)).toBeCloseTo(1.3);
  });
  it('排到第四、五排時縮回，最外排仍在牌牆內側', () => {
    for (const n of [22, 28, 29, 35]) {
      const k = discardScale(n),
        rows = Math.ceil(n / 7);
      expect(k).toBeLessThan(1.3);
      expect(k).toBeGreaterThan(rows === 4 ? 1.1 : 0.95); // (五排很少見：跟原本差不多大)
      // 海底最外緣 = k × (0.072 + rows × (0.04 + 0.003))，牌牆內側 = 0.3 − 0.011
      expect(k * (0.072 + rows * 0.043)).toBeLessThanOrEqual(0.3 - 0.011);
    }
  });
});

describe('discardScale：近景不擺牌牆時海底放更大', () => {
  it('前三排放大到約 1.5 倍，最外排在花那排（0.335）前面', () => {
    expect(discardScale(14, false)).toBeGreaterThan(1.5);
    for (const n of [21, 28, 35]) {
      const k = discardScale(n, false),
        rows = Math.max(3, Math.ceil(n / 7));
      expect(k).toBeGreaterThanOrEqual(discardScale(n, true));
      expect(k * (0.072 + rows * 0.043)).toBeLessThanOrEqual(0.335 - 0.02);
    }
  });
});

describe('_lastDiscard：最後打出的那張被吃碰走就不再標記', () => {
  const last = MahjongScene.prototype._lastDiscard;
  const mk = () => ({
    players: [0, 1, 2, 3].map(() => ({ discards: [] })),
    last: null,
  });
  it('打出來時標記、被碰走後取消、下一張打出又標記', () => {
    const sc = {},
      e = mk();
    expect(last.call(sc, e)).toBe(null);
    e.players[1].discards.push(5);
    e.last = { t: 5, from: 1 };
    expect(last.call(sc, e)).toBe(1);
    e.players[1].discards.pop(); // 被碰走（引擎不會清掉 e.last）
    expect(last.call(sc, e)).toBe(null);
    expect(last.call(sc, e)).toBe(null);
    e.players[2].discards.push(9);
    e.last = { t: 9, from: 2 };
    expect(last.call(sc, e)).toBe(2);
  });
  it('搶槓的牌不在海底，不標記', () => {
    const e = mk();
    e.last = { t: 3, from: 0, rob: true };
    expect(last.call({}, e)).toBe(null);
  });
});

describe('specSpot：觀戰者繞桌站的位置', () => {
  it('前後站在地上、兩側坐在下舖，都在牆內、桌子外', () => {
    expect(specSpot(0).mode).toBe('stand');
    expect(specSpot(180).mode).toBe('stand');
    expect(specSpot(90).mode).toBe('sit');
    expect(specSpot(270).mode).toBe('sit');
    for (let d = 0; d < 360; d += 7.5) {
      const p = specSpot(d);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.31); // 牆在 ±1.68
      expect(p.z).toBeGreaterThan(-1.6 + 0.3); // 後牆
      expect(p.z).toBeLessThan(2.2 - 0.3);
      expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeGreaterThan(1.2); // 在坐著的玩家（0.9）後面
    }
  });
});

describe('fitCamera：觀戰者繞桌轉鏡頭也塞得下', () => {
  for (const yaw of [0, 30, -45, 90, 180]) {
    it(`yaw ${yaw}°`, () => {
      const c = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 30);
      fitCamera(c, { ...CAM_VIEW.far(16 / 9), yaw }, { w: 1280, h: 720, mine: true });
      for (const p of camPoints(true)) {
        const v = p.clone().project(c);
        expect(Math.abs(v.x)).toBeLessThanOrEqual(1.001);
        expect(Math.abs(v.y)).toBeLessThanOrEqual(1.001);
      }
      // 鏡頭在那個方向那一側
      const a = (yaw * Math.PI) / 180;
      expect(c.position.x * Math.sin(a) + c.position.z * Math.cos(a)).toBeGreaterThan(0.3);
    });
  }
});

describe('配牌動畫：打出的牌從那家手上飛出去，不會拿牌牆上的', () => {
  const rng = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const fakeScene = (e) => {
    const sc = Object.create(MahjongScene.prototype);
    sc.e = e;
    sc._mobile = false;
    sc.intro = null;
    sc.pool = [];
    sc.tiles = [];
    sc.geos = [];
    for (let k = 0; k < 42; k++) {
      sc.pool[k] = [];
      for (let i = 0; i < (k < 34 ? 4 : 1); i++) {
        const m = new THREE.Object3D();
        m.userData.k = m.userData.k0 = k;
        m.userData.fresh = true;
        sc.pool[k].push(m);
        sc.tiles.push(m);
      }
    }
    return sc;
  };
  it('zoneRank：手牌→海底、牌牆→手牌最合理', () => {
    expect(zoneRank('d0', 'h0')).toBe(1);
    expect(zoneRank('d0', 'w')).toBeGreaterThan(1);
    expect(zoneRank('h2', 'w')).toBe(1);
    expect(zoneRank('m1', 'h1')).toBe(1);
    expect(zoneRank('m1', 'd3')).toBe(1);
    expect(zoneRank('w', 'w')).toBe(0);
    expect(zoneRank('w', 'h0')).toBeGreaterThan(zoneRank('h0', 'w'));
  });
  for (const seed of [1, 7, 42, 99, 2024]) {
    it(`整局打下來（seed ${seed}）：每張打出的牌都來自那家手上，牌牆上的牌不亂換位置`, () => {
      const e = new MahjongEngine({
        rng: rng(seed),
        human: [false, false, false, false],
        ai: makeAI(),
      });
      const sc = fakeScene(e);
      e.step(); // deal
      sc._layout(true);
      for (const m of sc.tiles) m.userData.fresh = false;
      let n = 0;
      while (e.phase !== 'end' && n++ < 2000) {
        const before = new Map(sc.tiles.map((m) => [m, m.userData.zone]));
        const wallAt = new Map(
          sc.tiles.filter((m) => m.userData.zone === 'w').map((m) => [m, m.userData.to.p.clone()])
        );
        const discards = e.players.map((P) => P.discards.length);
        e.step();
        sc._layout(true);
        for (let s = 0; s < 4; s++) {
          if (e.players[s].discards.length !== discards[s] + 1) continue;
          const m = sc.tiles.find(
            (x) => x.userData.zone === `d${s}` && before.get(x) !== `d${s}` && x.visible
          );
          expect(before.get(m)).toBe(`h${s}`);
        }
        // 還在牌牆上的牌：留在同一疊（下面那張被摸走時，上面那張會落下一層，水平位置不變）
        for (const [m, p] of wallAt)
          if (m.userData.zone === 'w')
            expect(Math.hypot(m.userData.to.p.x - p.x, m.userData.to.p.z - p.z)).toBeLessThan(1e-6);
      }
    });
  }
});

describe('配牌動畫（多人客端）：別家打出的牌從他手上飛出去，不會跟蓋著的牌交換', () => {
  const rng = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const fakeScene = (e) => {
    const sc = Object.create(MahjongScene.prototype);
    sc.e = e;
    sc._mobile = false;
    sc.intro = null;
    sc.pool = [];
    sc.tiles = [];
    sc.geos = [];
    sc.blankGeo = 'blank';
    for (let k = 0; k < 42; k++) {
      sc.geos[k] = `g${k}`;
      sc.pool[k] = [];
      for (let i = 0; i < (k < 34 ? 4 : 1); i++) {
        const m = new THREE.Object3D();
        m.userData.k = m.userData.k0 = k;
        m.userData.fresh = true;
        sc.pool[k].push(m);
        sc.tiles.push(m);
      }
    }
    return sc;
  };
  for (const [seed, spectate] of [
    [3, false],
    [8, false],
    [21, true],
    [77, true],
  ]) {
    it(`seed ${seed}${spectate ? '（觀戰者）' : '（客端玩家，座位 1）'}`, () => {
      const host = new MahjongEngine({
        rng: rng(seed),
        human: [false, false, false, false],
        ai: makeAI(),
      });
      const mySeat = 1;
      const guest = new RemoteMahjongEngine(() => {});
      const sc = fakeScene(guest);
      const sync = () => guest.applySnapshot(serializeStateFor(host, mySeat, { spectate }));
      host.step();
      sync();
      sc._layout(true);
      for (const m of sc.tiles) m.userData.fresh = false;
      let n = 0,
        checked = 0;
      while (host.phase !== 'end' && n++ < 2000) {
        const before = new Map(sc.tiles.map((m) => [m, m.userData.zone]));
        const wallAt = new Map(
          sc.tiles.filter((m) => m.userData.zone === 'w').map((m) => [m, m.userData.to.p.clone()])
        );
        const discards = guest.players.map((P) => P.discards.length);
        host.step();
        sync();
        sc._layout(true);
        for (let s = 0; s < 4; s++) {
          if (guest.players[s].discards.length !== discards[s] + 1) continue;
          const m = sc.tiles.find(
            (x) => x.userData.zone === `d${s}` && before.get(x) !== `d${s}` && x.visible
          );
          expect(before.get(m)).toBe(`h${s}`);
          // 牌面是真的那張
          expect(m.userData.k).toBe(guest.players[s].discards.at(-1));
          checked++;
        }
        for (const [m, p] of wallAt)
          if (m.userData.zone === 'w')
            expect(Math.hypot(m.userData.to.p.x - p.x, m.userData.to.p.z - p.z)).toBeLessThan(1e-6);
        // 看得到的牌面都對：海底、吃碰槓
        for (let s = 0; s < 4; s++) {
          const ks = sc.tiles
            .filter((x) => x.userData.zone === `d${s}`)
            .map((x) => x.userData.k)
            .sort((a, b) => a - b);
          expect(ks).toEqual([...guest.players[s].discards].sort((a, b) => a - b));
        }
        // 看不到牌面的假牌兩面都是牌背（觀戰者走到別人背後不會看到亂填的牌面），其他牌顯示自己的牌面
        for (const m of sc.tiles)
          if (m.userData.zone)
            expect(m.geometry).toBe(m.userData.blind ? 'blank' : `g${m.userData.k}`);
        if (spectate && guest.phase !== 'end')
          for (let s = 0; s < 4; s++)
            for (const m of sc.tiles.filter((x) => x.userData.zone === `h${s}`))
              expect(m.geometry).toBe('blank');
      }
      expect(checked).toBeGreaterThan(10);
    });
  }
});
