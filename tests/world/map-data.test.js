// 地圖資料的無頭檢核（#145）：改 tools/roads.json、分區註冊表、街屋分段資料時，格式或引用壞掉在 npm test 就擋下來，
// 不用等 tools/build_map.py 重建或進遊戲才發現。
//   - tools/roads.json：五個區塊（ways / marks / features / shift / pave）的欄位、型別、列舉值、座標範圍；
//     way id 要是 tools/osm_raw.json 裡真的有的 OSM way，ways / marks / shift 同一區塊內不能重複
//   - src/world/zones/Zones.js：drop 的建物 id 要在 data/cycu.json 裡、footprints 回傳合理的多邊形、ownSign 是店名字串，
//     src/world/zones/ 每個區檔都有註冊
//   - 街屋格：src/world/buildings/xzb/ 每個分段檔都接進 StreetXinzhongbei.js；新中北路一帶（XZ_ST.lots）同一條參考線、
//     同一側的 s 範圍不能重疊；各街道的街屋格 s0 < s1、side 是 ±1
//   - tools/looks.json：每棟都有 source / confidence，id 在 data/cycu.json 裡
// 規格來源：tools/roads.json 的 _doc、tools/build_map.py 的 MARK_CENTRE / MARK_FEATURES、各檔開頭的註解。
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZONES } from '../../src/world/zones/Zones.js';
import { XZ_ST } from '../../src/world/buildings/StreetXinzhongbei.js';
import { ZB_ST } from '../../src/world/buildings/StreetZhongbei.js';
import { D1_ST } from '../../src/world/buildings/StreetDaren1.js';
import { D2_ST } from '../../src/world/buildings/StreetDaren2.js';
import { SJ_ST } from '../../src/world/buildings/StreetShijian.js';
import { HZ_ST } from '../../src/world/buildings/StreetHuanzhong.js';
import { PZ_ST } from '../../src/world/buildings/StreetPuzhong.js';
import { RX_ST } from '../../src/world/buildings/StreetRixin.js';
import { DAREN_ST } from '../../src/world/buildings/StreetDaren.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const roads = readJson('tools/roads.json');
const cycu = readJson('data/cycu.json');
const osmWays = new Set(
  readJson('tools/osm_raw.json')
    .elements.filter((e) => e.type === 'way')
    .map((e) => e.id)
);
const buildingIds = new Set(cycu.buildings.map((b) => String(b.id)));

// map extent: every road point of the built map, plus a margin
const BOUNDS = (() => {
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const r of cycu.roads)
    for (const [x, z] of r.pts) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  const m = 100;
  return { x0: x0 - m, x1: x1 + m, z0: z0 - m, z1: z1 + m };
})();

// collects every problem as "where: what" so one failing expect lists them all, not just the first
function collector() {
  const errs = [];
  const fail = (where, what) => errs.push(`${where}: ${what}`);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  return {
    fail,
    num,
    // [x, z] inside the map
    xz(where, p) {
      if (!Array.isArray(p) || p.length < 2 || !num(p[0]) || !num(p[1]))
        return fail(where, `not an [x, z] point: ${JSON.stringify(p)}`);
      if (p[0] < BOUNDS.x0 || p[0] > BOUNDS.x1 || p[1] < BOUNDS.z0 || p[1] > BOUNDS.z1)
        fail(where, `point (${p[0]}, ${p[1]}) is outside the map`);
    },
    range(where, k, v, lo, hi) {
      if (!num(v)) fail(where, `${k} must be a number, got ${JSON.stringify(v)}`);
      else if (v < lo || v > hi) fail(where, `${k} = ${v} is outside ${lo}..${hi}`);
    },
    str(where, k, v) {
      if (typeof v !== 'string' || !v.trim()) fail(where, `${k} must be a non-empty string`);
    },
    oneOf(where, k, v, set) {
      if (!set.includes(v))
        fail(where, `${k} = ${JSON.stringify(v)} is not one of ${set.join(', ')}`);
    },
    keys(where, e, allowed) {
      for (const k of Object.keys(e)) if (!allowed.includes(k)) fail(where, `unknown field ${k}`);
    },
    way(where, id) {
      if (!Number.isInteger(id) || id <= 0)
        fail(where, `way must be a positive integer OSM way id, got ${JSON.stringify(id)}`);
      else if (!osmWays.has(id)) fail(where, `way ${id} is not in tools/osm_raw.json`);
    },
    done() {
      expect(errs, errs.join('\n')).toEqual([]);
    },
  };
}

// tools/build_map.py MARK_CENTRE / MARK_FEATURES
const MARK_CENTRE = [
  'double-yellow',
  'yellow',
  'yellow-dash',
  'white-dash',
  'none',
  'median',
  'pair',
  'pair-other',
];
const MARK_FEATURES = ['box', 'zebra', 'stop', 'bikebox', 'arrow', 'nozebra'];
const CONFIDENCE = ['low', 'medium', 'high'];
const HIGHWAY = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'living_street',
  'service',
  'footway',
  'pedestrian',
  'path',
  'track',
  'cycleway',
  'steps',
];

describe('tools/roads.json', () => {
  it('has exactly the documented sections', () => {
    expect(typeof roads._doc).toBe('string');
    expect(Object.keys(roads).sort()).toEqual(
      ['_doc', 'features', 'marks', 'pave', 'shift', 'ways'].sort()
    );
    for (const k of ['ways', 'marks', 'features', 'shift', 'pave'])
      expect(Array.isArray(roads[k]), `${k} must be an array`).toBe(true);
  });

  it('ways: measured widths', () => {
    const C = collector(),
      seen = new Set();
    roads.ways.forEach((e, i) => {
      const at = `ways[${i}] (way ${e.way} ${e.name || ''})`;
      C.keys(at, e, ['way', 'name', 'type', 'w', 'was', 'lanes', 'wat', 'confidence', 'source']);
      C.way(at, e.way);
      if (seen.has(e.way)) C.fail(at, 'duplicate way');
      seen.add(e.way);
      if (typeof e.name !== 'string')
        C.fail(at, 'name must be a string (empty for an unnamed way)');
      C.oneOf(at, 'type', e.type, HIGHWAY);
      C.range(at, 'w', e.w, 2, 30);
      C.range(at, 'was', e.was, 1, 40);
      C.oneOf(at, 'confidence', e.confidence, CONFIDENCE);
      C.str(at, 'source', e.source);
      if (e.lanes !== undefined && !(Number.isInteger(e.lanes) && e.lanes >= 1 && e.lanes <= 8))
        C.fail(at, `lanes must be an integer 1..8, got ${e.lanes}`);
      if (e.wat !== undefined) {
        if (!Array.isArray(e.wat) || e.wat.length < 2) C.fail(at, 'wat needs at least 2 anchors');
        else
          e.wat.forEach((a, j) => {
            C.xz(`${at} wat[${j}]`, a);
            C.range(`${at} wat[${j}]`, 'w', a[2], 2, 30);
          });
      }
    });
    C.done();
  });

  it('marks: painted markings per way', () => {
    const C = collector(),
      seen = new Set();
    roads.marks.forEach((e, i) => {
      const at = `marks[${i}] (way ${e.way} ${e.name || ''})`;
      C.keys(at, e, [
        'way',
        'name',
        'centre',
        'edge',
        'lanes',
        'walk',
        'cv',
        'ev',
        'inner',
        'segs',
        'span',
        'confidence',
        'source',
      ]);
      C.way(at, e.way);
      if (seen.has(e.way)) C.fail(at, 'duplicate way');
      seen.add(e.way);
      C.oneOf(at, 'centre', e.centre, MARK_CENTRE);
      if (typeof e.edge !== 'boolean') C.fail(at, 'edge must be true / false');
      if (!(Number.isInteger(e.lanes) && e.lanes >= 0 && e.lanes <= 6))
        C.fail(at, `lanes must be an integer 0..6, got ${e.lanes}`);
      C.oneOf(at, 'confidence', e.confidence, CONFIDENCE);
      C.str(at, 'source', e.source);
      if (e.cv !== undefined) C.range(at, 'cv', e.cv, -10, 10);
      if (e.ev !== undefined) {
        if (!Array.isArray(e.ev) || e.ev.length !== 2) C.fail(at, 'ev must be [vPos, vNeg]');
        else e.ev.forEach((v) => C.range(at, 'ev', v, -15, 15));
      }
      if (e.inner !== undefined && typeof e.inner !== 'boolean')
        C.fail(at, 'inner must be true / false');
      if (e.walk !== undefined) {
        if (!e.walk || typeof e.walk !== 'object') C.fail(at, 'walk must be an object');
        else
          for (const [k, v] of Object.entries(e.walk)) {
            if (k === 'col') {
              if (!/^#[0-9a-f]{6}$/i.test(v)) C.fail(at, `walk.col must be #rrggbb, got ${v}`);
            } else if (['n', 's', 'e', 'w'].includes(k)) C.range(at, `walk.${k}`, v, 0, 15);
            else C.fail(at, `unknown walk field ${k}`);
          }
      }
      const fromTo = (where, o) => {
        if (!o || typeof o !== 'object') return C.fail(where, 'must be {from, to}');
        C.xz(`${where}.from`, o.from);
        C.xz(`${where}.to`, o.to);
      };
      if (e.span !== undefined) fromTo(`${at} span`, e.span);
      if (e.segs !== undefined) {
        if (!Array.isArray(e.segs)) C.fail(at, 'segs must be an array');
        else
          e.segs.forEach((s, j) => {
            fromTo(`${at} segs[${j}]`, s);
            C.oneOf(`${at} segs[${j}]`, 'centre', s && s.centre, MARK_CENTRE);
          });
      }
    });
    C.done();
  });

  it('features: painted spots', () => {
    const C = collector();
    roads.features.forEach((f, i) => {
      const at = `features[${i}] (${f.t} at ${f.x}, ${f.z})`;
      C.keys(at, f, ['t', 'x', 'z', 'ang', 'len', 'w', 'way', 'osm', 'confidence', 'source']);
      C.oneOf(at, 't', f.t, MARK_FEATURES);
      C.xz(at, [f.x, f.z]);
      C.way(at, f.way);
      C.str(at, 'source', f.source);
      if (f.ang !== undefined) C.range(at, 'ang', f.ang, -360, 360);
      if (f.len !== undefined) C.range(at, 'len', f.len, 0.3, 60);
      if (f.w !== undefined) C.range(at, 'w', f.w, 0.3, 40);
      if (f.osm !== undefined && typeof f.osm !== 'boolean') C.fail(at, 'osm must be true / false');
      if (f.confidence !== undefined) C.oneOf(at, 'confidence', f.confidence, CONFIDENCE);
    });
    C.done();
  });

  it('shift: sideways moves of OSM ways', () => {
    const C = collector(),
      seen = new Set();
    roads.shift.forEach((e, i) => {
      const at = `shift[${i}] (way ${e.way} ${e.name || ''})`;
      C.keys(at, e, ['way', 'name', 'at', 'confidence', 'source']);
      C.way(at, e.way);
      if (seen.has(e.way)) C.fail(at, 'duplicate way');
      seen.add(e.way);
      C.oneOf(at, 'confidence', e.confidence, CONFIDENCE);
      C.str(at, 'source', e.source);
      if (!Array.isArray(e.at) || !e.at.length)
        C.fail(at, 'at needs at least one [x, z, v] anchor');
      else
        e.at.forEach((a, j) => {
          C.xz(`${at} at[${j}]`, a);
          C.range(`${at} at[${j}]`, 'v', a[2], -10, 10);
        });
    });
    C.done();
  });

  it('pave: asphalt strips', () => {
    const C = collector();
    roads.pave.forEach((e, i) => {
      const at = `pave[${i}]`;
      C.keys(at, e, ['pts', 'w', 'ways', 'confidence', 'source']);
      if (!Array.isArray(e.pts) || e.pts.length < 2) C.fail(at, 'pts needs at least 2 points');
      else e.pts.forEach((p, j) => C.xz(`${at} pts[${j}]`, p));
      C.range(at, 'w', e.w, 0.5, 30);
      if (!Array.isArray(e.ways)) C.fail(at, 'ways must be an array of way ids');
      else e.ways.forEach((w) => C.way(at, w));
      C.oneOf(at, 'confidence', e.confidence, CONFIDENCE);
      C.str(at, 'source', e.source);
    });
    C.done();
  });
});

describe('src/world/zones/Zones.js registry', () => {
  it('drops only buildings that exist in data/cycu.json', () => {
    const C = collector();
    for (const z of ZONES)
      for (const id of z.drop || []) {
        if (typeof id !== 'string' || !id) C.fail(z.name, `drop id must be a string, got ${id}`);
        else if (!buildingIds.has(id))
          C.fail(z.name, `drop ${id} is not a building in data/cycu.json`);
      }
    C.done();
  });

  it('footprints are real polygons inside the map', () => {
    const C = collector(),
      data = structuredClone(cycu);
    for (const z of ZONES) {
      if (!z.footprints) continue;
      let fps;
      try {
        fps = z.footprints(data);
      } catch (e) {
        C.fail(z.name, `footprints() threw ${e.message}`);
        continue;
      }
      if (!Array.isArray(fps)) {
        C.fail(z.name, 'footprints() must return an array of polygons');
        continue;
      }
      fps.forEach((poly, i) => {
        const at = `${z.name} footprint ${i}`;
        if (!Array.isArray(poly) || poly.length < 3) return C.fail(at, 'needs at least 3 points');
        poly.forEach((p) => C.xz(at, p));
        let a = 0;
        poly.forEach((p, j) => {
          const q = poly[(j + 1) % poly.length];
          a += p[0] * q[1] - q[0] * p[1];
        });
        if (!(Math.abs(a / 2) > 0.01)) C.fail(at, `zero area (${(a / 2).toFixed(3)} m²)`);
      });
    }
    C.done();
  });

  it('ownSign lists shop names', () => {
    const C = collector();
    for (const z of ZONES)
      for (const n of z.ownSign || [])
        if (typeof n !== 'string' || !n.trim())
          C.fail(z.name, `ownSign entry ${JSON.stringify(n)}`);
    C.done();
  });

  it('every zone file in src/world/zones is registered', () => {
    const src = readText('src/world/zones/Zones.js');
    const files = fs
      .readdirSync(path.join(ROOT, 'src/world/zones'))
      .filter((f) => /^Zone[A-Z]\w*\.js$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files)
      expect(src.includes(`from './${f}'`), `${f} is not imported by Zones.js`).toBe(true);
  });
});

describe('street rows', () => {
  // ['X', s0, s1, side, spec] (reference line first) or [s0, s1, side, spec] (one reference line per file)
  const norm = (L) => (typeof L[0] === 'string' ? L : ['', ...L]);
  const STREETS = { XZ_ST, ZB_ST, D1_ST, D2_ST, SJ_ST, HZ_ST, PZ_ST, RX_ST, DAREN_ST };

  it('every lot has s0 < s1 and side ±1', () => {
    const C = collector();
    for (const [n, S] of Object.entries(STREETS)) {
      if (!Array.isArray(S.lots) || !S.lots.length) C.fail(n, 'has no lots');
      (S.lots || []).forEach((L, i) => {
        const [ref, s0, s1, side, spec] = norm(L);
        const at = `${n}.lots[${i}] ${ref} ${s0}～${s1}`;
        if (!C.num(s0) || !C.num(s1) || !(s1 > s0)) C.fail(at, 'needs numbers s0 < s1');
        if (side !== 1 && side !== -1) C.fail(at, `side must be 1 or -1, got ${side}`);
        if (spec !== undefined && (typeof spec !== 'object' || spec === null))
          C.fail(at, 'spec must be an object');
      });
    }
    C.done();
  });

  it('新中北路一帶 (xzb) lots on the same reference line and side do not overlap', () => {
    const C = collector(),
      by = new Map();
    for (const L of XZ_ST.lots) {
      const [ref, s0, s1, side] = norm(L),
        k = `${ref} side ${side}`;
      if (!by.has(k)) by.set(k, []);
      by.get(k).push([s0, s1]);
    }
    for (const [k, a] of by) {
      a.sort((p, q) => p[0] - q[0]);
      for (let i = 1; i < a.length; i++)
        if (a[i][0] < a[i - 1][1] - 0.05)
          C.fail(k, `s ${a[i - 1][0]}～${a[i - 1][1]} overlaps ${a[i][0]}～${a[i][1]}`);
    }
    C.done();
  });

  it('every xzb segment file is wired into StreetXinzhongbei.js', () => {
    const src = readText('src/world/buildings/StreetXinzhongbei.js');
    const segs = fs
      .readdirSync(path.join(ROOT, 'src/world/buildings/xzb'))
      .filter((f) => /^Seg\w+\.js$/.test(f));
    expect(segs.length).toBeGreaterThan(0);
    for (const f of segs) {
      const name = f.replace(/\.js$/, '');
      expect(src.includes(`from './xzb/${f}'`), `${f} is not imported`).toBe(true);
      expect(new RegExp(`^\\s+${name},$`, 'm').test(src), `${name} is not in SEGS`).toBe(true);
    }
  });
});

describe('tools/looks.json', () => {
  it('every entry has a source, a confidence and an existing building', () => {
    const C = collector(),
      looks = readJson('tools/looks.json');
    expect(typeof looks.buildings).toBe('object');
    for (const [id, e] of Object.entries(looks.buildings)) {
      const at = `${id} ${e.name || ''}`;
      if (!buildingIds.has(id)) C.fail(at, 'not a building in data/cycu.json');
      C.str(at, 'source', e.source);
      C.oneOf(at, 'confidence', e.confidence, CONFIDENCE);
      if (!e.look || typeof e.look !== 'object') C.fail(at, 'look must be an object');
    }
    C.done();
  });
});
