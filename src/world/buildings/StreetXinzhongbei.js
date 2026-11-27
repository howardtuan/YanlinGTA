// 新中北路（校園西南側那段）與新中北路469巷（校園西側）兩側的街屋與圍牆（照 Google 街景 2026-05、國土測繪 2024 正射與 Google 衛星建模，只做外觀，不能進入）。
// 寫法比照 src/world/buildings/StreetZhongbei.js，每一格是 [ref, s0, s1, side, spec]
//   ref  參考線：'X' 新中北路（s=0 在環中東路口，往西走；469巷口在 s≈350、實踐路口 s≈1014、中北橋 s 1078～1089、信陽街口 s≈1222、西端中山東路口 s≈1515）、'L' 新中北路469巷（s=0 在新中北路巷口，往北走）、
//        'Z' 中山東路一～二段（s=0 在西南端跨縱貫線的高架橋上，往東北走；高架到 s≈199、弘揚路口 s≈749、地圖北緣 s≈905）、'H' 弘揚路（s=0 在中山東路口，往東北走到大仁街一帶，全長約 315）、
//        'D3' 大仁三街（s=0 在大仁街口，往西南走到實踐路口，全長約 81）、'D4' 大仁四街（s=0 在大仁街口，往西南走；大仁五街口 s≈44.6、實踐路口 s≈90.5）、
//        'F' 幸福街（s=0 在中北路口，往南走；中山東路口 s≈192.5、地圖南緣約 s 580；西側整條貼著老街溪）、
//        'LB' 力行北街（s=0 在中北路口，往東南走；中原夜市 s≈150～225、日新路口 s≈240、弘揚路口 s≈446）
//   side +1 = 順著 s 走的右手邊（X 的北側＝靠校園側、L 的東側＝靠校園側、Z 與 H 的東南側、D3 與 D4 的西北側、F 的西側＝老街溪側、LB 的西南側），-1 = 左手邊
//   spec 欄位與 src/world/buildings/StreetZhongbei.js 相同（nf、gf、fh、d、wall、low、sign、ground、sh、awn、bal、glass、hood、vert、round、banner、
//        roof、bill、tin、arch、fins、big、sign2、noband、roofCol、door、tower、bikes、set）
//   inside: true  一樓可以走進去：這裡只蓋二樓以上的外殼，一樓（立面、室內、碰撞）由那段的 custom 自己蓋（例：SegX4 的涼韌足體養生）
// 一段路一個資料檔（src/world/buildings/xzb/Seg*.js），各自 export default { lots, drop, hide, ownSign, custom, footprints }：
//   hide           不能 drop 的建物 id（OSM 建物、有店面牆的填充樓）：資料留著、不畫、碰撞收成一點（見 xzLook）
//   custom(C)      不是街屋的東西（機車棚、圍牆、大樓…）用 Kit 自己蓋；C 有 kit(ref, s0, s1, side, set) 開一個對著街的 Kit、paint 招牌貼圖等工具
//   footprints(F)  custom 佔的地（多邊形陣列），F(ref, s0, s1, side, set, d) 回傳一格的四個角
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。
// 這個檔案不 import src/world/Interiors.js（Kit、材質、貼圖工具由 src/world/zones/Zones.js 呼叫 buildXinzhongbeiStreet 時從 X 傳進來），
// src/world/zones/Zones.js 直接 import 這裡的 XZ_ST.drop 與 xzFootprints() 來刪填充樓、保留空地。
import { makeSideShop } from './StreetZhongbei.js';
import SegL1 from './xzb/SegL1.js';
import SegL2 from './xzb/SegL2.js';
import SegX1 from './xzb/SegX1.js';
import SegX2 from './xzb/SegX2.js';
import SegX3 from './xzb/SegX3.js';
import SegX4 from './xzb/SegX4.js';
import SegL3 from './xzb/SegL3.js';
import SegX5 from './xzb/SegX5.js';
import SegX6 from './xzb/SegX6.js';
import SegX7 from './xzb/SegX7.js';
import SegX8 from './xzb/SegX8.js';
import SegX0 from './xzb/SegX0.js';
import SegX9 from './xzb/SegX9.js';
import SegX10 from './xzb/SegX10.js';
import SegX11 from './xzb/SegX11.js';
import SegZ1 from './xzb/SegZ1.js';
import SegZ2 from './xzb/SegZ2.js';
import SegZ3 from './xzb/SegZ3.js';
import SegZ4 from './xzb/SegZ4.js';
import SegH1 from './xzb/SegH1.js';
import SegH2 from './xzb/SegH2.js';
import SegD3 from './xzb/SegD3.js';
import SegD4 from './xzb/SegD4.js';
import SegF1 from './xzb/SegF1.js';
import SegF2 from './xzb/SegF2.js';
import SegF3 from './xzb/SegF3.js';
import SegLB1 from './xzb/SegLB1.js';
import SegLB2 from './xzb/SegLB2.js';
import SegLB3 from './xzb/SegLB3.js';

// SegX0、SegX9～SegX11、中山東路 SegZ*、弘揚路 SegH*、大仁三街 SegD3、大仁四街 SegD4、幸福街 SegF*、力行北街 SegLB* 依序加在最後面，前面各段的亂數種子（seed 用 SEGS 的索引）才不會變
const SEGS = [
  SegL1,
  SegL2,
  SegX1,
  SegX2,
  SegX3,
  SegX4,
  SegL3,
  SegX5,
  SegX6,
  SegX7,
  SegX8,
  SegX0,
  SegX9,
  SegX10,
  SegX11,
  SegZ1,
  SegZ2,
  SegZ3,
  SegZ4,
  SegH1,
  SegH2,
  SegD3,
  SegD4,
  SegF1,
  SegF2,
  SegF3,
  SegLB1,
  SegLB2,
  SegLB3,
];

// 參考線（data/cycu.json 的道路中心線，遊戲座標 x 東、z 南）
export const XZ_REF = {
  X: [
    [576.6, 104.2],
    [562.6, 105.5],
    [550.9, 102.7],
    [510.9, 101.0],
    [471.0, 98.2],
    [423.0, 94.5],
    [401.2, 92.9],
    [381.9, 90.7],
    [366.2, 86.5],
    [360.0, 83.3],
    [332.4, 68.6],
    [328.5, 66.4],
    [313.9, 58.5],
    [279.4, 40.2],
    [264.8, 28.9],
    [254.1, 20.6],
    [247.6, 15.7],
    [222.0, -9.4],
    [208.7, -22.5],
    [193.5, -37.4],
    [187.9, -43.0],
    [170.1, -55.3],
    [146.3, -67.8],
    [109.9, -84.9],
    [88.3, -93.9],
    [71.3, -101.0],
    [50.9, -108.0],
    [29.1, -115.5],
    [22.3, -117.5],
    [12.4, -120.9],
    [-1.5, -125.6],
    [-46.3, -135.7],
    [-77.0, -141.1],
    [-89.5, -142.7],
    [-96.6, -142.7],
    [-103.7, -142.9],
    [-144.9, -143.2],
    [-179.0, -142.8],
    [-213.2, -142.4],
    [-220.2, -142.3],
    [-227.4, -142.1],
    [-231.5, -142.1],
    [-249.0, -138.9],
    [-264.1, -134.1],
    [-294.3, -117.0],
    [-318.3, -103.5],
    [-342.6, -90.2],
    [-348.7, -86.7],
    [-358.2, -82.6],
    [-364.2, -79.2],
    [-382.6, -69.0],
    [-388.6, -65.4],
    [-394.8, -62.0],
    [-408.3, -54.8],
    [-414.5, -51.6],
    [-423.9, -47.3],
    [-441.5, -35.0],
    [-530.7, 32.9],
    [-563.4, 56.6],
    [-587.9, 74.9],
    [-626.6, 108.0],
    [-657.1, 131.7],
    [-676.9, 149.1],
    [-713.3, 176.0],
    [-750.2, 206.9],
    [-759.1, 215.3],
  ],
  L: [
    [247.6, 15.7],
    [255.4, 7.0],
    [254.8, -25.2],
    [253.1, -73.3],
    [239.3, -202.4],
    [224.2, -324.8],
    [223.6, -329.1],
    [224.7, -356.3],
    [233.1, -375.0],
    [269.9, -403.9],
  ],
  // 中山東路：s 0～199 是跨縱貫線的高架橋（grade zhongshan_viaduct），s≈575 日新路口、s≈749 弘揚路口
  Z: [
    [-848.9, 106.9],
    [-840.8, 115.5],
    [-775.7, 189.1],
    [-716.0, 254.7],
    [-704.1, 269.4],
    [-686.4, 287.8],
    [-671.2, 305.2],
    [-667.1, 309.9],
    [-646.3, 329.6],
    [-636.3, 337.4],
    [-629.6, 342.6],
    [-624.8, 346.3],
    [-594.0, 366.6],
    [-578.3, 376.1],
    [-539.0, 400.1],
    [-437.6, 464.7],
    [-369.0, 511.9],
    [-337.0, 531.3],
    [-329.7, 537.0],
    [-317.0, 548.9],
    [-290.0, 593.4],
    [-277.1, 614.0],
    [-238.2, 676.5],
    [-214.4, 714.1],
    [-212.9, 725.3],
    [-196.3, 741.9],
  ],
  // 弘揚路：s=0 在中山東路口
  H: [
    [-290.0, 593.4],
    [-261.9, 576.7],
    [-228.4, 557.1],
    [-183.5, 522.8],
    [-161.0, 505.9],
    [-131.9, 482.6],
    [-92.0, 452.6],
    [-43.4, 414.6],
    [-35.6, 408.6],
  ],
  // 大仁三街：s=0 在大仁街口，往西南走到實踐路口（data/cycu.json 的整條，OSM 長度和實景相同）
  D3: [
    [-53.7, 283.3],
    [-105.3, 335.0],
    [-112.7, 337.9],
  ],
  // 大仁四街：s=0 在大仁街口，往西南走；s≈44.6 大仁五街從西北側接進來，終點是實踐路口
  D4: [
    [-121.4, 210.9],
    [-155.0, 240.2],
    [-191.8, 267.6],
  ],
  // 幸福街：s=0 在中北路口（中北橋東端），往南走；s≈192.5 穿過中山東路（普仁橋東側），接著沿老街溪東岸到地圖南緣
  // （data/cycu.json 的兩條幸福街接起來，南段只取到 z≈745）
  F: [
    [-517.7, 196.9],
    [-519.7, 212.8],
    [-526.0, 264.4],
    [-535.3, 292.8],
    [-548.3, 323.7],
    [-569.8, 367.3],
    [-573.2, 369.7],
    [-575.2, 371.0],
    [-578.3, 376.1],
    [-586.6, 383.1],
    [-591.8, 391.7],
    [-609.0, 421.3],
    [-623.7, 474.4],
    [-654.8, 555.7],
    [-653.7, 565.7],
    [-652.7, 574.5],
    [-648.8, 605.4],
    [-646.3, 625.1],
    [-642.9, 645.0],
    [-641.7, 655.1],
    [-640.4, 665.2],
    [-639.9, 676.4],
    [-640.0, 680.5],
    [-639.1, 685.5],
    [-638.0, 691.5],
    [-632.4, 706.0],
    [-636.4, 710.2],
    [-640.1, 721.3],
    [-641.8, 729.5],
    [-642.5, 733.9],
    [-643.4, 744.7],
  ],
  // 力行北街：s=0 在中北路口，往東南走；s 150～225 是中原夜市那排、s≈240 穿過日新路、終點 s≈446 接弘揚路（H s≈128）
  LB: [
    [-470.8, 181.4],
    [-460.9, 194.3],
    [-452.7, 204.3],
    [-446.4, 212.2],
    [-429.7, 232.6],
    [-421.5, 241.5],
    [-402.1, 263.3],
    [-377.0, 294.1],
    [-359.9, 315.1],
    [-341.3, 334.7],
    [-316.0, 365.7],
    [-314.8, 367.1],
    [-289.8, 395.9],
    [-250.5, 440.1],
    [-183.5, 522.8],
  ],
};
// 路寬的一半（data/cycu.json）：新中北路 8.5、469巷 7.5、中山東路 13（高架段 10）、弘揚路 10、大仁三街與大仁四街 5、幸福街 5、力行北街 6
const HALF = { X: 4.25, L: 3.75, Z: 6.5, H: 5, D3: 2.5, D4: 2.5, F: 2.5, LB: 3 };
// 立面離參考線的預設距離（各格可用 spec.set 覆寫）；大仁三、四街、幸福街、力行北街的街屋立面在路面外 1.3 m（雨棚外伸 1.27 m 才不會伸到路面上）
const SET = { X: 7.4, L: 4.8, Z: 10, H: 6.5, D3: 3.8, D4: 3.8, F: 3.8, LB: 4.3 };

const LOTS = SEGS.flatMap((S, si) =>
  (S.lots || []).map((L, j) => Object.assign(L, { seed: 6000 + si * 1000 + j * 7 }))
);
export const XZ_ST = {
  ownSign: SEGS.flatMap((S) => S.ownSign || []), // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: SEGS.flatMap((S) => S.drop || []), // 被自建街屋取代的填充樓（全部是 synthetic，各自用自己的亂數，刪掉不影響別的東西）
  lots: LOTS,
};
// 不能 drop 的建物（OSM 建物、有店面牆的填充樓）：各段在自己的 hide 列出 id。照環中東路 hzLook／大仁二街 d2Look 的做法，
// 資料原封不動（全圖共用亂數、world.shopWalls 的牆數都不變，停放機車不會重排），只叫 src/world/MapBuilder.js 不畫牆和屋頂
// （look.open.bare＋noShop），碰撞輪廓在 buildXinzhongbeiStreet 最後收成一個點（xzUncollide），由各段自建的街屋取代
const XZ_HIDE = new Set(SEGS.flatMap((S) => S.hide || []));
export function xzLook(b) {
  if (!XZ_HIDE.has(b.id)) return;
  // 原本就 noShop、沒有 look 的填充樓本來不產生店面牆；一加 look，MapBuilder 會把它當成「有店面但不畫」推進 world.shopWalls，
  // 牆數一變全圖停放機車就重排。facade 設成 glass 只換樣式（rb() 照抽），店面牆照舊不產生
  if (b.noShop && !b.look) b.facade = 'glass';
  b.look = {
    ...(b.look || {}),
    wall: { base: 'smooth', colour: '#d9d9d6' },
    open: { bare: true },
    roof: { ac: false, extras: false },
  };
  b.noShop = true;
}
function xzUncollide(data, collision) {
  if (!data || !collision || !collision.polys) return;
  for (const b of data.buildings) {
    if (!XZ_HIDE.has(b.id)) continue;
    const pi = collision.polys.findIndex((q) => q.pts === b.pts);
    if (pi < 0) {
      console.warn(`[xinzhongbei] 找不到 ${b.id} 的碰撞輪廓`);
      continue;
    }
    const Q = collision.polys[pi],
      n = b.pts.length,
      c0 = b.pts[0];
    Q.pts = b.pts.map(() => [c0[0], c0[1]]);
    Q.top = -Infinity;
    for (let k = 0; k < n; k++)
      collision.segs[Q.s0 + k] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
  }
}
export function xzAt(ref, s) {
  const R = XZ_REF[ref];
  let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i],
      b = R[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) {
      const t = (s - acc) / L;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        ux: (b[0] - a[0]) / L,
        uz: (b[1] - a[1]) / L,
      };
    }
    acc += L;
  }
}
// 每一格的區域座標：原點在立面線的起點，+x 沿立面（side -1 時朝 s 變小的方向，立面才對著街），+z 離開街道
export function xzLotFrame([ref, s0, s1, side, sp]) {
  const m = xzAt(ref, (s0 + s1) / 2),
    w = s1 - s0,
    nx = -m.uz * side,
    nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux,
    az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || SET[ref];
  return {
    ox: m.x + nx * set - (ax * w) / 2,
    oz: m.z + nz * set - (az * w) / 2,
    ang: Math.atan2(az, ax),
    w,
    apron: Math.min((sp && sp.apron) || 99, Math.max(0.6, set - HALF[ref])),
  };
}
// 一格佔的地：從立面線往街道 front 公尺、往後 d 公尺
const quad = (ref, s0, s1, side, set, d, front = 0) => {
  const { ox, oz, ang, w } = xzLotFrame([ref, s0, s1, side, { set }]),
    c = Math.cos(ang),
    s = Math.sin(ang),
    p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [p(-0.1, -front), p(w + 0.1, -front), p(w + 0.1, d), p(-0.1, d)];
};
export function xzFootprints() {
  return LOTS.map((L) => {
    const f = xzLotFrame(L);
    return quad(
      L[0],
      L[1],
      L[2],
      L[3],
      (L[4] && L[4].set) || SET[L[0]],
      L[4].d || 10,
      f.apron + 0.2
    );
  }).concat(SEGS.flatMap((S) => (S.footprints ? S.footprints(quad) : [])));
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildXinzhongbeiStreet(I, scene, X, data, collision) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => {
    if (!MATS[key]) MATS[key] = f();
    return key;
  };
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 單色的方塊（招牌底、雨棚、牆…）全部用頂點顏色畫在同一種材質上，一排房子只剩幾種材質，才不會有上百個 draw call：
  // 'VC' 是素色、'WVC' 是帶磁磚紋的牆；k.box / k.cyl 收到 #hex 或 'wall#hex' 就自動改成這兩種材質加頂點色
  const VC = def('zbVC', () => std({ vertexColors: true })),
    WVC = def('zbWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const MRW = { grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic };
  const WALLC = {
    tile: '#f0efea',
    beige: '#eadfc6',
    grey: '#c9c8c2',
    pinkGrey: '#e3cfc9',
    stone: '#b9b7af',
    redbrown: '#b07a66',
  };
  // 磁磚貼面在日光下看起來比色票暗，深色與飽和色往白色提亮一點才像街景裡的樣子
  const lift = (hex, k = 0.22) => {
    const n = parseInt(hex.slice(1), 16),
      c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k);
    return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
  };
  const wallMat = (w) =>
    MRW[w]
      ? MRW[w]
      : WALLC[w]
        ? `wall${WALLC[w]}`
        : w && w[0] === '#'
          ? `wall${lift(w)}`
          : `wall${WALLC.tile}`;
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex),
      n = g.attributes.position.count,
      a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = c.r;
      a[i * 3 + 1] = c.g;
      a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const vcKit = (k) => {
    const kb = k.box.bind(k),
      kc = k.cyl.bind(k),
      hexOf = (m) =>
        typeof m !== 'string' ? null : m[0] === '#' ? m : m.startsWith('wall#') ? m.slice(4) : null;
    k.box = (x0, x1, y0, y1, z0, z1, mat, o) => {
      const h = hexOf(mat);
      return h
        ? paintGeo(kb(x0, x1, y0, y1, z0, z1, mat[0] === '#' ? VC : WVC, o), h)
        : kb(x0, x1, y0, y1, z0, z1, mat, o);
    };
    k.cyl = (x, z, r, y0, y1, mat, o) => {
      const h = hexOf(mat);
      return h ? paintGeo(kc(x, z, r, y0, y1, VC, o), h) : kc(x, z, r, y0, y1, mat, o);
    };
    return k;
  };
  // ---- textures ----
  // 招牌：一公尺 ppm 像素，字自動縮到放得下；text 可用 \n 分行；sub 小字；style 加上品牌色條
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128, style) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm),
      Hh = r16(hm * ppm);
    return sg(`zb_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, Hh);
      if (style === 'seven') {
        const hs = Hh / 3;
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, hs * 0.5);
        g.fillStyle = '#f26b21';
        g.fillRect(0, hs * 0.5, W, hs * 0.5);
        g.fillStyle = '#00843d';
        g.fillRect(0, hs, W, hs * 0.5);
        g.fillStyle = '#e2231a';
        g.fillRect(0, hs * 1.5, W, hs * 0.5);
        g.fillStyle = '#ffffff';
        g.fillRect(0, hs * 2, W, hs);
      }
      if (style === 'fam') {
        g.fillStyle = '#00a0e0';
        g.fillRect(0, 0, W, Hh * 0.16);
        g.fillStyle = '#2fb34a';
        g.fillRect(0, Hh * 0.16, W, Hh * 0.1);
      }
      if (style === 'frame') {
        g.strokeStyle = fg;
        g.lineWidth = Math.max(3, Hh * 0.04);
        g.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh * 0.88);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lines = String(text).split('\n'),
        n = lines.length,
        avail = (Hh * (sub ? 0.64 : 0.86)) / n;
      const px = Math.min(avail * 0.92, W * 0.5);
      const fit = (t) => {
        let p = px;
        g.font = font(p);
        while (g.measureText(t).width > W * 0.94 && p > 10) {
          p -= 2;
          g.font = font(p);
        }
        return p;
      };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => {
        fit(t);
        g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail);
      });
      if (sub) {
        let p = Hh * 0.2;
        g.font = font(p, 700);
        while (g.measureText(sub).width > W * 0.94 && p > 9) {
          p -= 2;
          g.font = font(p, 700);
        }
        g.fillText(sub, W / 2, Hh * 0.82);
      }
    });
  };
  const roundSign = (text, bg, fg) =>
    sg(`zbR_${text}|${bg}|${fg}`, 128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = bg;
      g.beginPath();
      g.arc(64, 64, 62, 0, 7);
      g.fill();
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(64, 64, 52, 0, 7);
      g.stroke();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const t = [...text];
      if (t.length <= 2) {
        g.font = font(t.length === 1 ? 70 : 48);
        g.fillText(text, 64, 66);
      } else if (t.length <= 4) {
        g.font = font(40);
        g.fillText(t.slice(0, 2).join(''), 64, 44);
        g.fillText(t.slice(2).join(''), 64, 88);
      } else {
        let p = 34;
        g.font = font(p);
        while (g.measureText(text).width > 100 && p > 12) {
          p -= 2;
          g.font = font(p);
        }
        g.fillText(text, 64, 66);
      }
    });
  const shutterTex = (hex) =>
    sg(`zbSh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  const openTex = sg('zbOpen', 256, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, '#4a4640');
    gr.addColorStop(0.3, '#2a2724');
    gr.addColorStop(1, '#161513');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,248,225,.85)';
    for (let x = 24; x < 256; x += 80) g.fillRect(x, 8, 36, 5);
    const r = lcg(41);
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 34 + r() * 8;
      g.fillStyle = ['#3a3a40', '#6a2a2a', '#2a4a6a', '#5a5a52'][i % 4];
      g.fillRect(x, 96, 20, 44);
      g.fillRect(x - 4, 112, 28, 12);
    }
  });
  const archWin = sg('zbArchWin', 256, 160, (g) => {
    // 三井3C 的白色拱形鐵窗
    g.fillStyle = '#e8e8e4';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#566673';
    g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(14, 14, 100, 130);
    g.strokeStyle = '#f2f2ee';
    g.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const x0 = 14 + i * 77,
        x1 = x0 + 70;
      g.beginPath();
      g.moveTo(x0, 148);
      g.lineTo(x0, 70);
      g.arc((x0 + x1) / 2, 70, 35, Math.PI, 0);
      g.lineTo(x1, 148);
      g.stroke();
      g.beginPath();
      g.moveTo((x0 + x1) / 2, 35);
      g.lineTo((x0 + x1) / 2, 148);
      g.stroke();
    }
  });
  const archRow = sg('zbArchRow', 256, 64, (g) => {
    // 粉紅拱形女兒牆
    g.fillStyle = '#d8a0a0';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#efe0d8';
    for (let x = 6; x < 256; x += 32) {
      g.beginPath();
      g.moveTo(x, 58);
      g.lineTo(x, 28);
      g.arc(x + 10, 28, 10, Math.PI, 0);
      g.lineTo(x + 20, 58);
      g.closePath();
      g.fill();
    }
  });
  const bars = sg('zbBars', 64, 64, (g) => {
    // 圍牆黑色鐵欄杆
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#1c1c1e';
    for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillRect(0, 2, 64, 4);
    g.fillRect(0, 58, 64, 4);
  });
  const litWin = (gr) =>
    sg(`zbLit${gr ? 1 : 0}`, 256, 160, (g) => {
      // 亮著燈的窗：暖色玻璃、窗簾，鐵窗版加欄杆
      g.fillStyle = '#d4d6d6';
      g.fillRect(0, 0, 256, 160);
      const gl = g.createLinearGradient(0, 8, 0, 152);
      gl.addColorStop(0, '#f6e2a8');
      gl.addColorStop(1, '#e0bd72');
      g.fillStyle = gl;
      g.fillRect(8, 8, 240, 144);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(14, 12, 50, 136);
      g.fillStyle = 'rgba(150,110,80,.45)';
      g.fillRect(8, 8, 70, 144);
      g.fillRect(178, 8, 70, 144);
      g.fillStyle = '#d4d6d6';
      g.fillRect(124, 0, 8, 160);
      if (gr) {
        g.fillStyle = '#3a3a3a';
        for (let x = 22; x < 256; x += 30) g.fillRect(x, 0, 4, 160);
        g.fillRect(0, 76, 256, 4);
      }
    });
  const shopTex = (i) =>
    ROWT.shop(
      `zb${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      300 + i * 3
    );

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => k.scooter(x, z, rot, col);

  const exposed = (L, lo) =>
    !LOTS.some(
      (M) =>
        M !== L &&
        M[0] === L[0] &&
        M[3] === L[3] &&
        (lo ? Math.abs(M[2] - L[1]) < 1.2 : Math.abs(M[1] - L[2]) < 1.2)
    ); // 這一側有沒有鄰居
  // 轉角格對著另一條街的側面店面（spec.side，寫法見 src/world/buildings/StreetZhongbei.js makeSideShop）
  const sideShop = makeSideShop({ paint, shopGlass, shopTex, openTex, shutterTex, ROWT, FRONT });
  LOTS.forEach((L, i) => {
    const sp = L[4],
      { ox, oz, ang, w, apron } = xzLotFrame(L),
      r = lcg(L.seed);
    const ex0 = L[3] > 0 ? exposed(L, true) : exposed(L, false),
      ex1 = L[3] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    const win2 = (x, y, ww, h, gr = true) =>
      r() < 0.2
        ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 })
        : win(k, x, y, ww, h, gr); // 兩成的窗亮著燈
    const nf = sp.nf || 4,
      fh = sp.fh || 3.0,
      gf = sp.gf || (nf === 1 ? 3.2 : 3.3),
      top = gf + (nf - 1) * fh,
      d = sp.d || 10;
    // 側面店面畫在哪一面側牆：at 1 = s1 那端、0 = s0 那端（side -1 的 +x 朝 s 變小）
    const sideX = sp.side ? ((sp.side.at === 1) === L[3] > 0 ? w : 0) : -1;
    const glassWall = sp.bal === 'glass';
    const wm = glassWall && sp.glass ? sp.glass : wallMat(sp.wall);
    if (sp.inside) {
      // the ground floor is a shop you can walk into, built by the segment's custom(): shell the floors above only
      k.box(0, w, gf, top, 0, d, wm, { tile: [0.6, 0.6], col: false });
      k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', { col: false });
    } else shell(k, w, d, top, wm);
    if (sp.low && !glassWall)
      k.box(-0.01, w + 0.01, 0, gf, -0.05, 0, wallMat(sp.low), { col: false, tile: [0.6, 0.6] });
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false }); // 分戶牆邊
    // ---- 一樓 ----
    if (sp.sign) {
      const [text, bg, fg, sub, style] = sp.sign,
        sw = w - 0.15,
        sh = 0.8;
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.03, -0.28, 0, bg, { col: false });
      k.plane(
        paint(text, bg, fg, sub, sw, sh, 128, style),
        sw,
        sh,
        w / 2,
        gf - 0.44,
        -0.29,
        FRONT,
        { emissive: 0.35 }
      );
    } else if (!sp.noband)
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.4, -0.06, 0, '#d8d6cf', { col: false });
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn],
        n = A.length > 1 ? Math.max(2, Math.round(w / 0.3)) : 1,
        bw = w / n;
      for (let j = 0; j < n; j++)
        k.box(
          -0.05 + j * bw,
          -0.05 + (j + 1) * bw + 0.01,
          gf - 1.05,
          gf - 0.97,
          -1.25,
          0,
          A[j % A.length],
          { col: false }
        );
      k.box(-0.05, w + 0.05, gf - 1.18, gf - 1.05, -1.27, -1.2, A[0], { col: false });
    }
    if (sp.tin) {
      const ty = nf === 1 ? top : sp.sign ? gf + 0.1 : gf - 0.35;
      k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false });
    }
    const doorW = sp.door === 0 ? 0 : 1.0,
      bodyW = w - doorW;
    if (doorW) k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    const gh = gf - 1.0;
    const gk = sp.ground || 'shop';
    if (sp.inside) {
      // ground floor front: the segment's custom() builds it
    } else if (gk === 'shop' || gk === 'stall') {
      shopGlass(k, 0.15, bodyW - 0.2 + (doorW ? 0 : 0.2), 0, gh, shopTex(i));
      if (gk === 'stall') {
        k.box(0.3, bodyW - 0.3, 0, 0.95, -0.55, -0.05, '#c9c9c4', { col: false });
        k.box(0.3, bodyW - 0.3, 0.95, 1.0, -0.6, -0.02, '#8d9196', { col: false });
      }
    } else if (gk === 'open') {
      k.plane(openTex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [0.12, bodyW - 0.22])
        k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      const tex = sp.sh ? shutterTex(sp.sh) : ROWT.shutter();
      k.plane(tex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.02, FRONT);
      if (gk === 'gate')
        k.plane(YHT.win(), bodyW - 0.5, gh - 0.4, bodyW / 2, gh / 2 - 0.15, -0.05, FRONT);
      k.box(0.15, bodyW - 0.15, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false }); // 鐵捲門的罩盒
    }
    if (sp.bikes)
      for (let j = 0; j < sp.bikes; j++) {
        const x = 0.2 + j * ((w - 2.2) / Math.max(1, sp.bikes - 0.5));
        bike(k, x, -0.9 - (j % 2) * 0.35, 0, bikeCols[(i + j) % 6]);
      }
    else if (w > 4 && r() < 0.6) {
      // 騎樓邊停幾台機車
      const n = 1 + ((r() * 3) | 0);
      let x = 0.3 + r() * 1.5;
      for (let j = 0; j < n && x < w - 1.7; j++) {
        const per = r() < 0.4;
        bike(
          k,
          per ? x + 0.3 : x,
          per ? -1.75 : -1.0 - r() * 0.3,
          per ? 1 : 0,
          bikeCols[(i * 3 + j) % 6]
        );
        x += per ? 0.8 : 1.9 + r() * 0.5;
      }
    }
    if (r() < 0.3) k.box(w - 0.38, w - 0.3, 0, top, -0.13, -0.05, '#8a8d90', { col: false }); // 外牆水管
    if ((gk === 'shop' || gk === 'stall') && w > 3.5 && r() < 0.4) {
      const sx = 0.4 + r() * (w - 2);
      k.box(sx, sx + 0.55, 0, 0.95, -1.5, -1.45, '#26282b', { col: false });
      k.box(sx + 0.04, sx + 0.51, 0.55, 0.9, -1.51, -1.49, '#f3efe4', { col: false });
    } // 門口立牌
    if (sp.banner) {
      const [bt, bb, bf] = sp.banner;
      k.plane(
        paint(bt, bb, bf, null, Math.min(w - 0.4, 3.4), 0.5, 96),
        Math.min(w - 0.4, 3.4),
        0.5,
        w / 2,
        gf - 1.5,
        -0.3,
        FRONT,
        { emissive: 0.15 }
      );
    }
    // ---- 樓上 ----
    for (let f = 1; f < nf; f++) {
      const y = gf + (f - 1) * fh,
        ww = w - 1.0;
      if (glassWall) {
        // 玻璃帷幕：一格一格的窗與白色分隔
        k.box(0.05, w - 0.05, y, y + 0.4, -0.08, -0.02, '#e9e9e6', { col: false });
        for (let x = 0.05; x <= w - 0.04; x += 1.4)
          k.box(x, x + 0.07, y, y + fh, -0.1, -0.02, '#e9e9e6', { col: false });
        if (f === 1)
          k.box(0.05, w - 0.05, y + fh - 0.06, y + fh, -0.18, -0.02, '#e9e9e6', { col: false });
        continue;
      }
      const bk = sp.bal || 'grille';
      if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18)
          k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (bk === 'open') {
        k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, wallMat(sp.wall), { col: false });
        win2(w / 2, y + 1.6, ww, 1.6, false);
      } else if (bk === 'rail') {
        win2(w / 2, y + 1.5, ww, 1.4, false);
        if (f === 1) {
          k.box(0.1, w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false });
          for (const yy of [0.5, 0.85, 1.2])
            k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false });
          for (const x of [0.1, w - 0.14])
            k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false });
        }
      } else if (bk === 'arch') {
        const n = Math.max(1, Math.round(ww / 3.2)),
          cw = ww / n;
        for (let j = 0; j < n; j++)
          k.plane(archWin, cw - 0.2, 1.7, 0.5 + cw * (j + 0.5), y + 1.5, -0.03, FRONT);
      } else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins)
        for (let x = 0.3; x <= w - 0.3; x += 0.55)
          k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (r() < 0.65)
        ac(
          k,
          r() < 0.5 ? 0.25 : w - 1.05,
          y + 0.1 + (r() < 0.5 ? 0 : 1.9),
          bk === 'cage' ? -1.2 : -0.45
        );
    }
    if (sp.big) {
      const [bt, bb, bf] = sp.big,
        y0 = gf + ((sp.bigFrom || 2) - 1) * fh,
        bh = top - y0 - 0.1,
        bw = sp.bigW || w - 0.6,
        bx = sp.bigW ? w * (sp.bigAt || 0.5) : w / 2;
      k.plane(paint(bt, bb, bf, null, bw, bh, 40), bw, bh, bx, y0 + bh / 2 + 0.05, -0.06, FRONT, {
        emissive: 0.15,
      });
    }
    if (sp.sign2) {
      const [bt, bb, bf] = sp.sign2;
      k.box(0.1, w - 0.1, gf + 0.3, gf + 1.5, -0.2, -0.06, bb, { col: false });
      k.plane(
        paint(bt, bb, bf, null, w - 0.3, 1.1, 100),
        w - 0.3,
        1.1,
        w / 2,
        gf + 0.9,
        -0.21,
        FRONT,
        { emissive: 0.3 }
      );
    }
    if (sp.vert) {
      const [text, bg, fg] = sp.vert,
        len = 0.6 * text.length + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`zb${text}${bg}`, bg, fg, text),
          0.6,
          len,
          0.25 + sd * 0.04,
          gf + 0.4 + len / 2,
          -0.55,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
    }
    if (sp.round) {
      const [text, bg, fg] = sp.round;
      for (const sd of [-1, 1])
        k.plane(
          roundSign(text, bg, fg),
          0.85,
          0.85,
          w - 0.3 + sd * 0.03,
          gf + 1.5,
          -0.7,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
    }
    if (sp.arch) {
      k.box(0, w, top + 0.12, top + 0.95, d - 0.2, d, sp.arch, { col: false });
      k.box(0, 0.12, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(w - 0.12, w, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(0, w, top + 0.12, top + 0.95, -0.02, 0.1, sp.arch, { col: false });
      k.plane(archRow, w, 0.8, w / 2, top + 0.53, -0.04, FRONT);
    }
    if (sp.tower) {
      const T = sp.tower,
        back = T.back || 2.5,
        tn = T.nf || 8,
        tw = wallMat(T.wall || '#e9e7e3'),
        th = tn * 3.0;
      k.box(0.3, w - 0.3, top + 0.12, top + 0.12 + th, back, d - 0.5, tw);
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', {
          col: false,
        });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3,
          n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex, xs] of [
          [-0.03, -Math.PI / 2, ex0, 0],
          [w + 0.03, Math.PI / 2, ex1, w],
        ])
          if (ex && !(sideX === xs && f === 0))
            for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
    if (sp.side) sideShop(k, sp.side, sideX, w, d, gf, top, i);
    if (nf > 1 && !sp.roof) {
      const q = r();
      if (q < 0.3)
        k.cyl(w * (0.3 + r() * 0.4), d * 0.7, 0.55, top + 0.12, top + 1.4, '#d8d8d0', { seg: 10 });
      else if (q < 0.55) {
        const hx = w * (0.15 + r() * 0.3),
          hz = d * 0.35;
        k.box(hx, hx + 2.2, top + 0.12, top + 2.6, hz, hz + 2.4, wallMat(sp.wall), { col: false });
        k.box(hx - 0.15, hx + 2.35, top + 2.6, top + 2.72, hz - 0.15, hz + 2.55, MR.roof, {
          col: false,
        });
      } else if (q < 0.7) {
        k.box(0.3, w - 0.3, top + 0.12, top + 2.3, d * 0.45, d - 0.4, '#3a6fb0', { col: false });
        k.box(0.1, w - 0.1, top + 2.3, top + 2.4, d * 0.4, d - 0.2, MR.roof, { col: false });
      }
    }
    if (sp.roof === 'shack') {
      k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false });
      k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false });
    } else if (sp.roof === 'tank') {
      k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });
      if (w > 4.5) k.cyl(w / 2 + 1.3, d - 3, 0.5, top + 0.12, top + 1.3, '#cfd2d4', { seg: 10 });
    } else if (sp.roof === 'bill' && sp.bill) {
      // 屋頂鐵架看板
      const [bt, bb, bf, bw0, bh] = sp.bill,
        bw = Math.min(bw0 || w - 0.6, w),
        y0 = top + (nf === 1 ? 0.9 : 0.4);
      k.plane(paint(bt, bb, bf, null, bw, bh, 80), bw, bh, w / 2, y0 + bh / 2, 0.45, FRONT, {
        emissive: 0.35,
        double: true,
      });
      k.box(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, y0 - 0.06, y0, 0.4, 0.5, '#4a4d50', {
        col: false,
      });
      for (const x of [w / 2 - bw / 2 + 0.2, w / 2 + bw / 2 - 0.25])
        k.box(x, x + 0.06, top, y0 + bh * 0.6, 0.38, 0.5, '#4a4d50', { col: false });
    }
    if (nf === 1) {
      // 一樓鐵皮屋：浪板屋頂往後傾
      k.box(-0.15, w + 0.15, top - 0.12, top, -0.4, d, sp.roofCol || MR.roof, { col: false });
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });
  // ---- 各段自己蓋的東西（機車棚、圍牆、大樓…）----
  const C = {
    THREE,
    MR,
    FRONT,
    VC,
    WVC,
    lcg,
    sg,
    YHT,
    ROWT,
    paint,
    roundSign,
    shutterTex,
    openTex,
    litWin,
    bars,
    archWin,
    archRow,
    wallMat,
    paintGeo,
    shell,
    win,
    ac,
    shopGlass,
    bike,
    bikeCols,
    SET,
    HALF,
    // 開一個對著街的 Kit：原點在立面線起點，+x 沿立面、+z 離開街道（-z 是街道），w 是這一格的寬度
    kit: (ref, s0, s1, side, set) => {
      const f = xzLotFrame([ref, s0, s1, side, { set }]),
        k = vcKit(new Kit(I, f.ox, f.oz, f.ang));
      kits.push(k);
      k.w = f.w;
      k.apron = f.apron;
      return k;
    },
  };
  for (const S of SEGS) if (S.custom) S.custom(C);
  finishRow(scene, kits);
  xzUncollide(data, collision);
}
