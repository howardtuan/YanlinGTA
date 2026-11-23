// 大仁街一帶的補建（只做外觀，不能進入）。大仁街臨街那排在 src/world/buildings/StreetDaren.js，這裡只補
// 從大仁街看得到、卻還是通用填充樓的房子；照 Google 街景（2026-05）與國土測繪 2024 正射建模。
//
// 大仁四街西北側、離大仁街口 13～23 m（原本的填充樓 f1527、f1528，站在大仁街口往大仁四街看得到）：
//   一整棟五層白色馬賽克磁磚公寓，每扇窗都是鐵窗加藍綠色窗頂，冷氣室外機掛在二樓窗下；
//   一樓靠大仁街那間是 925 SILVER 銀飾（白色帆布雨棚、灰色鐵捲門），往裡面那間是「旋轉木馬」童裝（玻璃櫥窗、白色側掛招牌）。
// 這個檔案不 import src/world/Interiors.js；src/world/zones/Zones.js import 這裡的 DF_ST 與 dfFootprints()。

// 大仁四街中心線（data/cycu.json，寬 5 m），s 從大仁街口量
export const DF_D4 = { pts: [[-121.4, 210.9], [-155.0, 240.2]], half: 2.5, set: 4.6 };

export const DF_ST = {
  drop: ['f1527', 'f1528'], // 被取代的通用填充樓
  ownSign: [],
  // [s0, s1, spec]：都在西北側（往大仁四街裡面走的右手邊）
  lots: [
    [13, 18, { shop: 'silver' }],
    [18, 23.1, { shop: 'kids' }],
  ],
};
const NF = 5, GF = 3.3, FH = 3.0, D = 14, TOP = GF + (NF - 1) * FH;

function lotFrame([s0, s1]) {
  const [a, b] = DF_D4.pts, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  const sm = (s0 + s1) / 2, w = s1 - s0, nx = -uz, nz = ux; // 西北側的法線
  return { ox: a[0] + ux * sm + nx * DF_D4.set - ux * w / 2, oz: a[1] + uz * sm + nz * DF_D4.set - uz * w / 2, ang: Math.atan2(uz, ux), w, apron: DF_D4.set - DF_D4.half - 0.2 };
}
export function dfFootprints() {
  return DF_ST.lots.map((L) => {
    const { ox, oz, ang, w, apron } = lotFrame(L), c = Math.cos(ang), s = Math.sin(ang), p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, D), p(-0.1, D)];
  });
}

export function buildDarenFill(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const TEAL = def('dfTeal', () => std({ color: '#5fa8a0', roughness: 0.6 })), CANVAS = def('dfCanvas', () => std({ color: '#ecebe6', roughness: 0.9 }));
  const GREYBOX = def('dfGreyBox', () => std({ color: '#7a7e80', roughness: 0.7 }));
  const MOSAIC = def('dfMosaic', () => std({ map: YHT.facade(), color: '#ffffff', roughness: 0.6 }));        // 白色馬賽克磁磚（比 rowTools 的灰白再亮一點）
  const font = (px, wgt = 900) => `${wgt} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  // 925 SILVER 雨棚垂邊：白底、淡灰字（實景字已經褪色）
  const silverTex = sg('dfSilver', 512, 96, (g) => {
    g.fillStyle = '#efeeea'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#b9b8b2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 54px Georgia,serif'; g.fillText('925 SILVER', 256, 52);
  });
  // 旋轉木馬童裝的白色側掛招牌（兩面）
  const kidsTex = sg('dfKids', 128, 192, (g) => {
    g.fillStyle = '#f6f5f1'; g.fillRect(0, 0, 128, 192); g.fillStyle = '#3a3a3a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(20, 700); g.fillText('旋 轉 木 馬', 64, 30); g.font = font(56); g.fillText('童', 64, 88); g.fillText('裝', 64, 150);
  });
  const kits = [];
  DF_ST.lots.forEach((L, i) => {
    const sp = L[2], { ox, oz, ang, w, apron } = lotFrame(L), k = new Kit(I, ox, oz, ang); kits.push(k);
    shell(k, w);
    // 樓上：每層兩扇鐵窗，窗頂藍綠色遮雨板；二樓窗下掛冷氣
    for (let f = 1; f < NF; f++) {
      const y = GF + (f - 1) * FH;
      for (const x of [w * 0.28, w * 0.72]) {
        win(k, x, y + 1.45, w * 0.36, 1.35);
        k.box(x - w * 0.2, x + w * 0.2, y + 2.2, y + 2.28, -0.55, 0, TEAL, { col: false });
        k.box(x - w * 0.18, x + w * 0.18, y + 0.72, y + 0.78, -0.3, 0, MR.white, { col: false });           // 鐵窗下緣的窗台
      }
      if (f === 1 || (f + i) % 3 === 0) for (const x of f === 1 ? [0.2, 1.1, w - 1.0] : [w - 1.0]) ac(k, x, y + 0.15, -0.5);
    }
    k.box(0.05, w - 0.05, GF - 0.45, GF, -0.4, 0, MR.white, { col: false });                                 // 一樓上緣的雨遮板
    if (sp.shop === 'silver') {
      k.plane(ROWT.shutter(), w - 0.5, GF - 0.9, w / 2, (GF - 0.9) / 2, -0.02, FRONT);
      k.box(0.25, w - 0.25, GF - 0.92, GF - 0.72, -0.25, 0, GREYBOX, { col: false });                        // 鐵捲門罩盒
      const g = new THREE.BoxGeometry(w - 0.2, 0.05, 1.5); g.rotateX(-0.42); g.translate(w / 2, GF - 0.95, -0.7);   // 往前斜的白色帆布雨棚
      k._part(CANVAS, g);
      k.plane(silverTex, w - 0.3, 0.5, w / 2, GF - 1.52, -1.39, FRONT, { emissive: 0.15 });
    } else {
      shopGlass(k, 0.2, w - 1.2, 0, GF - 0.8, ROWT.shop('dfKids', '#f6f0ea', '#c99aa8', 311));
      k.plane(YHT.win(), 0.9, 2.2, w - 0.65, 1.1, -0.03, FRONT);                                                // 公寓樓梯門
      for (const sd of [-1, 1]) k.plane(kidsTex, 0.75, 1.15, 0.45 + sd * 0.03, GF + 0.9, -0.9, sd * Math.PI / 2, { emissive: 0.25 });
      k.box(0.42, 0.48, GF + 1.42, GF + 1.48, -0.9, 0, MR.black, { col: false });
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });                // 騎樓前的水泥地
    // 頂樓水塔與後牆的窗
    if (i === 1) k.cyl(w * 0.4, D * 0.6, 0.6, TOP + 0.12, TOP + 1.5, MR.white, { seg: 12 });
    for (let f = 0; f < NF; f++) k.plane(YHT.win(), 1.4, 1.1, w / 2, (f === 0 ? 0.3 : GF + (f - 1) * FH + 0.3) + 1.1, D + 0.03, 0);
  });
  function shell(k, w) { // 用 function 宣告，上面的 forEach 才能先呼叫
    k.box(0, w, -0.8, TOP, 0, D, MOSAIC, { tile: [0.6, 0.6] });
    k.box(-0.02, w + 0.02, TOP, TOP + 0.12, -0.04, D, 'gray', { col: false });
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, TOP, -0.06, 0, MR.white, { col: false });          // 分戶牆邊
  }
  finishRow(scene, kits);
}
