// 力行宿舍（力行大樓）平面圖的設定。幾何（牆、地板、樓梯、門牌）全部取自 src/world/buildings/Lixing.js 實際蓋出來的東西；
// 這裡只補「哪一塊叫什麼」：位置用 src/world/buildings/Lixing.js 檔頭那組平面常數算（readConsts），或用讀到的門牌／招牌的位置。
import { readConsts } from '../lib/consts.mjs';

const SRC = 'src/world/buildings/Lixing.js';

export default {
  id: 'lixing',
  name: '力行宿舍（力行大樓）',
  source: SRC,
  note: '依目前模型產生；一、二樓配置經使用者確認（2026-11-22）',
  scale: 8,

  async build(env) {
    const { buildLixing } = await env.game(SRC);
    const r = buildLixing(env.I, env.scene, env.data, env.collision, env.Kit, env.regMat);
    if (!r) throw new Error('data/cycu.json 裡找不到力行大樓');
    return { kit: r.k, base: r.B, FL: r.FL };
  },

  floors(ctx) {
    const FL = ctx.built.FL, st = FL[1] - FL[0], names = ['一樓', '二樓', '三樓', '四樓'];
    // 一樓：門房、大門台階站在比一樓地板低的地面上，文字往下多收一點
    return FL.map((y, i) => ({ id: `${i + 1}f`, name: names[i] || `${i + 1} 樓`, y, top: FL[i + 1] ?? y + st, ...(i === 0 ? { lo: y - 3 } : {}) }));
  },

  plan({ sl, floor, find }) {
    const K = readConsts(SRC, ['NX', 'RA', 'CZ', 'SG', 'RC', 'WW', 'EW', 'MID', 'BW', 'BE', 'ROWC_W', 'ROWC_E', 'OPEN_ROOMS', 'SW', 'WD', 'ANNEX']);
    const { RA, CZ, SG, RC, WW, EW, MID, BW, BE, ROWC_W, ROWC_E, OPEN_ROOMS, SW, WD, ANNEX } = K;
    const f1 = floor.id === '1f', f2 = floor.id === '2f', mid = (a, b) => (a + b) / 2;
    const here = (text, f) => sl.texts.filter(t => (text instanceof RegExp ? text.test(t.text) : t.text === text) && (!f || f(t)));
    const zones = [], labels = [];

    // 進不去的房間（模型只有走廊牆上的門）：北排、中段南排、兩翼南排
    const closedRows = [
      { x0: WW.x0, x1: EW.x1, z0: 0, z1: RA, doors: 's' },
      { x0: MID.x0, x1: MID.x1, z0: CZ, z1: MID.z1, doors: 'n' },
      { x0: ROWC_W.x0, x1: ROWC_W.x1, z0: RC, z1: ROWC_W.z1, doors: 'n' },
      { x0: ROWC_E.x0, x1: Math.min(ROWC_E.x1, EW.x1), z0: RC, z1: ROWC_E.z1, doors: 'n' },
    ];

    // 兩個天井：一樓是鋪面庭院，二樓以上挑空
    for (const [w, name] of [[WW, '西天井'], [EW, '東天井']]) {
      const sign = here(/曬被場/, t => t.x > w.g0 && t.x < w.g1)[0];
      zones.push({ x0: w.g0, x1: w.g1, z0: CZ, z1: SG, style: f1 ? 'outdoor' : 'void', label: f1 ? `${name}${sign ? `\n${sign.text.replace(/\s*·\s*/g, '・')}` : ''}` : `${name}（挑空）`, max: 12 });
    }

    // 可以走進去的寢室：門上「276 寢」那種牌子的位置，寬度是兩翼南排一格
    const wC = (ROWC_W.x1 - ROWC_W.x0) / 11;
    for (const no of OPEN_ROOMS) { const s = here(`${no} 寢`)[0]; if (s) zones.push({ x0: s.x - wC / 2, x1: s.x + wC / 2, z0: RC, z1: ROWC_W.z1, style: 'open', label: String(no), bold: true }); }

    // 東西兩端凸出的三格：曬衣場／浴廁／樓梯
    for (const b of [BW, BE]) {
      const x = mid(b.x0, b.x1);
      labels.push({ text: '曬衣場', x, z: mid(b.z0, b.zA) }, { text: '浴廁', x, z: mid(b.zA, b.zB) });
    }
    // 樓梯的名稱都寫在樓層平台上（不壓在梯段的箭頭和中間隔牆上）。東西兩端的折返梯：入口平台靠迴廊那一頭，長 1.5
    labels.push({ text: '樓梯', x: BW.x1 - 0.75, z: mid(BW.zB, BW.z1), size: 7, vertical: true }, { text: '樓梯', x: BE.x0 + 0.75, z: mid(BE.zB, BE.z1), size: 7, vertical: true });
    // 中段北側樓梯（走廊牆上那塊「樓梯」牌子的位置；入口平台在走廊這一頭，長 1.6）
    for (const s of here(/^樓梯/, t => Math.abs(t.z - RA) < 0.3)) labels.push({ text: '樓梯', x: s.x, z: RA - 0.8, size: 8 });
    // 兩翼靠中段朝前院的剪刀梯：名稱寫在北端平台上。北端平台接回主走廊的那段走道（z CZ..SW.z0）使用者確認有通，
    // 用紅色虛線框起來。
    for (const [x0, x1] of [[WW.x1, WW.e], [EW.w, EW.x0]]) {
      labels.push({ text: '樓梯', x: mid(x0, x1), z: SW.z0 + SW.ld / 2, size: 7.5 });
      zones.push({ x0, x1, z0: CZ, z1: SW.z0, style: 'note' });
      labels.push({ text: '走道', x: mid(x0, x1), z: mid(CZ, SW.z0) - 0.2, size: 8, vertical: true, color: '#c0392b' });
    }
    // 電梯（門在東天井西側迴廊的牆上）
    for (const e of here('電梯')) labels.push({ text: '電梯', x: e.x + 1.25, z: e.z, size: 7.5 });
    // 走廊
    labels.push({ text: '主走廊', x: mid(WW.g0, WW.g1), z: mid(RA, CZ), size: 8 }, { text: '主走廊', x: mid(EW.g0, EW.g1), z: mid(RA, CZ), size: 8 });
    labels.push({ text: '南迴廊', x: mid(WW.g0, WW.g1), z: mid(SG, RC), size: 8 }, { text: '南迴廊', x: mid(EW.g0, EW.g1), z: mid(SG, RC), size: 8 });
    labels.push({ text: '中廊', x: mid(MID.hall0, MID.hall1), z: mid(CZ, MID.z1), vertical: true, bold: true });

    const doorX = mid(MID.door0, MID.door1), zS = MID.z1 + 0.25; // 中段南牆（外牆面）
    if (f1) {
      labels.push({ text: '一樓大門（門楣「力行大樓」）', x: doorX + 9, z: zS + 2.2, leader: [doorX, zS + 0.6], anchor: 'start' });
      labels.push({ text: '前院', x: mid(MID.x0, MID.hall0), z: mid(zS, ANNEX.z0), size: 11, color: '#5a6070' }, { text: '前院', x: mid(MID.hall1, MID.x1), z: mid(zS, ANNEX.z0) + 1.6, size: 11, color: '#5a6070' });
      // 兩翼朝前院挖空的那一格
      labels.push({ text: '通道口（朝前院挖空，上面是二樓走道）', x: SW.fW + 4.5, z: mid(WD.z0, WD.z1) + 1.7, leader: [SW.fW + 0.8, mid(WD.z0, WD.z1) + 0.3], size: 8, anchor: 'start' });
      labels.push({ text: '通道口（朝前院挖空）', x: SW.fE - 4.5, z: mid(WD.z0, WD.z1) + 1.7, leader: [SW.fE - 0.8, mid(WD.z0, WD.z1) + 0.3], size: 8, anchor: 'end' });
      // 沿新中北路的一層樓門房：實心，名稱用朝前院那面的門
      zones.push({ x0: ANNEX.x0, x1: ANNEX.gate0, z0: ANNEX.z0, z1: ANNEX.z1, style: 'solid' }, { x0: ANNEX.gate1, x1: ANNEX.x1, z0: ANNEX.z0, z1: ANNEX.z1, style: 'solid' });
      for (const d of sl.texts.filter(t => t.door && Math.abs(t.z - ANNEX.z0) < 0.3)) labels.push({ text: d.text, x: d.x, z: mid(ANNEX.z0, ANNEX.z1), bold: true });
      for (const s of here(/公佈欄/)) labels.push({ text: '公佈欄', x: s.x, z: mid(ANNEX.z0, ANNEX.z1), bold: true });
      labels.push({ text: '門房大門', x: ANNEX.gate1 - 2.05, z: mid(ANNEX.z0, ANNEX.z1) + 0.3, size: 7.5, bold: true }); // 靠缺口東半邊，不壓在西邊的旋轉閘門上
      labels.push({ text: '門房（一層樓）　南邊是新中北路', x: mid(ANNEX.x0, ANNEX.x1), z: ANNEX.z1 + 1.7, size: 8.5, color: '#5a6070' });
      const adv = here('指導老師辦公室')[0]; if (adv) labels.push({ text: '指導老師辦公室', x: adv.x + 6, z: -1.6, leader: [adv.x, 1.2], size: 8 });
    }
    if (f2) {
      labels.push({ text: '天橋門', x: doorX - 6, z: zS + 2, leader: [doorX - 0.6, zS], size: 8.5, anchor: 'end' });
      labels.push({ text: '牆外平台與露天樓梯\n（往上到新中北路天橋）', x: doorX + 4, z: zS + 4, leader: [doorX + 1.2, zS + 3], anchor: 'start', size: 8.5 });
    }
    const legend = [f1 ? '寢室號碼取自模型門上的字；一樓只有公共空間和走廊能走，寢室都是關著的門。' : f2 ? '寢室號碼取自模型門上的字；二樓只有 276～281 能走進去，其他寢室都是關著的門。' : '寢室號碼取自模型門上的字。'];
    legend.push('紅色虛線框：兩翼剪刀梯北端接回主走廊的走道（使用者看過平面圖確認）。');
    return { closedRows, zones, labels, legend, zoneNames: { open: '可以走進去的寢室' } };
  },
};
