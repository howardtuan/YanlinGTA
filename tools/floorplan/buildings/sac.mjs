// 學生活動中心一～四樓平面圖的設定。幾何（牆、地板、樓梯、門牌）全部取自 src/world/buildings/Sac.js 實際蓋出來的東西
// （旋轉梯在 SacB1.js）；這裡只補「哪一塊叫什麼」，位置用 Sac.js 檔頭那組平面常數算（readConsts）。
// B1 沒有出圖：學餐攤販和麥當勞的牆走世界碰撞（不是 Interiors），麥當勞又蓋在 Interiors.js 裡，這個工具切不出完整的一層。
import { readConsts } from '../lib/consts.mjs';

const SRC = 'src/world/buildings/Sac.js';
// 不當成房間名稱的字：古箏社教室裡的海報、旋轉梯和樓梯間的指示牌（改由下面的 labels 標）
const CLUTTER = /期末成發|高 山|漁 舟|弦歌|出席與分部|GUZHENG|中原大學 古箏社|← 古箏社|B1 學習區|樓梯 ↓ 1F|古箏社 → 3F|往 天橋|門禁管制|^空橋|^培英廳$|^服務台$/;

export default {
  id: 'sac',
  name: '學生活動中心',
  source: SRC,
  note: '依目前模型產生；配置大多是推測，待使用者確認',
  scale: 9,

  async build(env) {
    // 和遊戲同樣的順序：先挖 G 區的坑（下沉舞台、B1），再蓋 B1（旋轉梯在裡面），最後蓋樓上
    const { zoneGTerrain } = await env.game('src/world/zones/ZoneG.js');
    zoneGTerrain(env.data);
    const { buildSacB1 } = await env.game('src/world/buildings/SacB1.js');
    buildSacB1(env.I, env.scene, env.Kit, env.regMat, null);
    const { buildSac } = await env.game(SRC);
    const r = buildSac(env.I, env.scene, env.data, env.collision, env.Kit, env.regMat) || env.I.sac;
    if (!r) throw new Error('data/cycu.json 裡找不到學生活動中心');
    return { kit: r.k, base: 0, FL: r.FL };
  },

  floors(ctx) {
    const FL = ctx.built.FL, names = ['一樓', '二樓', '三樓', '四樓'];
    return FL.map((y, i) => ({ id: `${i + 1}f`, name: names[i], y, top: FL[i + 1] ?? y + 3.4 }));
  },

  plan({ sl, floor }) {
    const K = readConsts(SRC, ['XL', 'XCL', 'XMC', 'XR', 'ZS', 'ZN', 'CN', 'CS', 'AX0', 'AX1', 'V', 'ST', 'STE', 'BH', 'NH', 'WC', 'CF', 'SF', 'HALL', 'WELL']);
    const { XL, XMC, XR, ZS, ZN, CN, CS, AX0, AX1, V, ST, BH, NH, CF, SF, HALL, WELL } = K;
    const f = Number(floor.id[0]), mid = (a, b) => (a + b) / 2, dim = '#5a6070', red = '#c0392b';
    sl.texts = sl.texts.filter(t => !CLUTTER.test(t.text));
    const zones = [], labels = [], legend = [];
    const wellX = mid(WELL[0], WELL[1]), wellZ = mid(WELL[2], WELL[3]);

    // 東南角：麥當勞（B1～1F 挑高）和它樓上，模型裡沒有做這幾層的室內
    if (f === 1) {
      zones.push({ x0: XMC, x1: XR, z0: CS, z1: ZS, style: 'solid' });
      labels.push({ text: '麥當勞\n（從戶外下沉廣場進出，不在這張圖）', x: mid(XMC, XR), z: mid(CS, ZS), size: 9, color: dim });
    }
    labels.push({ text: '主走廊', x: -128, z: mid(CN, CS), size: 8 });

    if (f === 1) {
      labels.push({ text: '培英廳', x: mid(HALL.row0, HALL.x1) - 1, z: mid(CS, ZS), size: 13, bold: true });
      labels.push({ text: '舞台', x: mid(XL, HALL.stage), z: mid(CS, ZS) - 3, size: 10, bold: true, vertical: true });
      labels.push({ text: '一樓大廳', x: mid(AX0, AX1) - 2, z: mid(CS, ZS) - 2.5, size: 12, bold: true });
      labels.push({ text: '服務台', x: -158.8, z: -99.6, size: 8 });
      labels.push({ text: '旋轉梯\n往上到二樓、往下到 B1', x: wellX + 5.5, z: wellZ - 3.6, leader: [wellX + 1.2, wellZ - 1.4], size: 8, anchor: 'start' });
      labels.push({ text: '南面大門（前庭）', x: -151.2, z: ZS + 1.6, size: 8.5 });
      labels.push({ text: '北門（斜坡下到新中北路人行道）', x: mid(NH.x0, NH.x1) - 9, z: ZN + 3.2, leader: [NH.x0 + 0.4, ZN + 1.6], size: 8, anchor: 'end' });
      legend.push('白色區塊：模型裡只有走廊牆上關著的門，沒有做室內。培英廳（階梯座位，往後一排比一排高）、大廳、101 交誼廳可以走進去。');
      legend.push('待確認：培英廳、101、廁所、電梯與兩座樓梯的位置都是推測；旋轉梯的位置照使用者給的 B1 平面圖。');
    }
    if (f === 2) {
      zones.push({ x0: HALL.x0, x1: ST.x0, z0: CS, z1: ZS, style: 'void', label: '培英廳上空', max: 12 });
      labels.push({ text: '中庭（2F 前平台）', x: mid(AX0, AX1) + 1, z: -100.2, size: 12, bold: true });
      labels.push({ text: '南面開放、沒有門：大階梯走上來直接進中庭', x: -155.3, z: ZS + 2.9, size: 8.5, color: red });
      labels.push({ text: '布告欄牆（兩側可以繞過去）', x: -171.5, z: -101.2, leader: [-164.6, -103], size: 8, anchor: 'end' });
      labels.push({ text: '往三樓的樓梯', x: mid(CF.x0, V.x1) - 1, z: CF.z0 - 1.1, size: 8 });
      labels.push({ text: '旋轉梯頂（從一樓、B1 上來，到二樓為止）', x: wellX + 3.2, z: wellZ + 4.2, leader: [wellX + 0.6, wellZ + 1.2], size: 8, anchor: 'start' });
      labels.push({ text: '往天橋\n（上 7 階到橋面）', x: mid(BH.x0, BH.x1) + 6.5, z: ZN + 4.6, leader: [BH.x1 - 0.5, ZN + 3], size: 8, anchor: 'start' });
      legend.push('白色區塊：模型裡只有走廊牆上關著的門，沒有做室內。雅文 A 廳可以走進去。');
      legend.push('使用者確認過：中庭的方向（西端是布告欄與圓窗、北邊往天橋、南邊接大階梯）、南面沒有門、旋轉梯到二樓為止。');
      legend.push('待確認：旋轉梯在二樓的出口位置與朝向、雅文廳與廁所的位置、往三樓那座樓梯的位置。');
    }
    if (f >= 3) {
      zones.push({ x0: V.x0, x1: V.x1, z0: V.z0, z1: V.z1, style: 'void' });
      labels.push({ text: '挑空（下面是二樓中庭）', x: mid(V.x0, V.x1), z: V.z0 + 2, size: 9, color: dim });
      labels.push({ text: '迴廊', x: mid(V.x1, AX1), z: mid(V.z0, V.z1), size: 8.5, vertical: true });
    }
    if (f === 3) {
      labels.push({ text: '二樓上來的樓梯', x: mid(CF.x0, V.x1), z: CF.z0 - 1, size: 7.5 });
      labels.push({ text: '往四樓的樓梯', x: mid(V.x0, SF.x1), z: SF.z0 - 1, size: 7.5 });
      labels.push({ text: '古箏社教室', x: -187.5, z: -123, size: 10, bold: true });
      labels.push({ text: '往生科館的空橋（門禁管制，門打不開）', x: XL - 1, z: -97.6, leader: [XL - 2.5, -101.2], size: 8, anchor: 'start' });
      labels.push({ text: '西牆圓窗', x: AX0 + 3.4, z: -104.5, leader: [AX0 + 0.3, -104.5], size: 7.5, anchor: 'start' });
      legend.push('白色區塊：模型裡只有走廊牆上關著的門，沒有做室內。301、302、303、312、317、318 與古箏社教室可以走進去。');
      legend.push('待確認：各教室的位置與大小、往四樓那座樓梯的位置（照片只看得到它在中庭南側）、通往生科館空橋的走廊位置。');
    }
    if (f === 4) {
      labels.push({ text: '三樓上來的樓梯', x: mid(V.x0, SF.x2) + 1.5, z: SF.z0 - 1.4, size: 7.5 });
      legend.push('白色區塊：模型裡只有走廊牆上關著的門，沒有做室內。401、403、405、412 琴房、419 武術練習室可以走進去。');
      legend.push('待確認：各社辦、琴房的位置與大小（房號取自場地借用說明，位置是推測）。');
    }
    return { zones, labels, legend, autoLabels: true, zoneNames: { void: '挑空', solid: '麥當勞（另一處室內）' } };
  },
};
