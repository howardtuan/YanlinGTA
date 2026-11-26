// 學生活動中心一～四樓平面圖的設定。幾何（牆、地板、樓梯、門牌）全部取自 src/world/buildings/Sac.js 實際蓋出來的東西
// （旋轉梯在 SacB1.js）；這裡只補「哪一塊叫什麼」，位置用 Sac.js 檔頭那組平面常數算（readConsts）。
// B1：西半（樓梯廳、用餐區、學餐攤販）在 SacB1.js，東半是麥當勞（Interiors.js 的 buildMcD，沒有匯出，用 env.gamePrivate 取）；
// 攤販的牆走世界碰撞，傳 env.worldWalls 給 buildSacB1 才收得到。
import { readConsts } from '../lib/consts.mjs';

const SRC = 'src/world/buildings/Sac.js';
// 不當成房間名稱的字：古箏社教室裡的海報、旋轉梯和樓梯間的指示牌（改由下面的 labels 標）
const B1_CLUTTER = /今日菜單|影印部|用 餐 區|餐具回收|飲水機|資源回收|樓梯 往/;
const CLUTTER =
  /期末成發|高 山|漁 舟|弦歌|出席與分部|GUZHENG|中原大學 古箏社|← 古箏社|B1 用餐區|樓梯 ↓ 1F|古箏社 → 3F|往 天橋|門禁管制|^空橋|^培英廳$|^服務台$/;

function planB1(sl) {
  const { SAC_B1: S } = readConsts('src/world/buildings/SacB1.js', ['SAC_B1']);
  const { MCD_SPEC: M, MCD_OPEN: O } = readConsts('src/world/Interiors.js', [
    'MCD_SPEC',
    'MCD_OPEN',
  ]);
  const { PIT } = readConsts('src/world/zones/ZoneG.js', ['PIT']);
  const mid = (a, b) => (a + b) / 2,
    dim = '#5a6070';
  sl.texts = sl.texts.filter((t) => !B1_CLUTTER.test(t.text));
  const x0 = S.ox,
    x1 = S.ox + S.W,
    z0 = S.oz,
    zD = S.oz + S.D,
    zS = S.oz + S.stallD,
    xSt = S.ox + S.stallW; // 西半：x 往東、z 往南
  const mx = (v) => M.x1 - v,
    mz = (v) => M.z1 - v; // 麥當勞的店內座標轉了 180°：店內 x 往西、z 往北
  const zones = [
    { x0, x1: xSt, z0: zD, z1: zS, style: 'open' }, // 攤販前的走道與櫃台（站在坑底，沒有另外的地板面）
    { x0: xSt, x1: PIT.court[2], z0: PIT.court[1], z1: PIT.flatW, style: 'outdoor' }, // 入口前的戶外平地（下沉區）
  ];
  const labels = [
    { text: '樓梯廳', x: x0 - 6, z: z0 + 2.6, size: 11, bold: true },
    {
      text: '旋轉梯\n往上到一樓、二樓',
      x: x0 + 3.6,
      z: z0 + 3.6,
      leader: [x0 + 1.8, z0 + 0.9], // the stair stands where the 1F plan has it (SacB1.js SPIRAL)
      size: 8,
      anchor: 'start',
    },
    { text: '學餐用餐區', x: x0 + 0.4, z: z0 + 8.6, size: 12, bold: true },
    { text: '四人桌 × 36', x: x0 + 0.4, z: z0 + 9.4, size: 7.5, color: dim },
    {
      text: '餐具回收\n飲水機\n資源回收',
      x: x0 - 12.2,
      z: z0 + 13,
      size: 7,
      color: dim,
      anchor: 'start',
    },
    { text: '學餐攤販（在廣場底下）', x: mid(x0, xSt), z: zD + 1.3, size: 8.5, bold: true },
    {
      text: '入口（門楣「影印部」招牌）',
      x: x1 + 0.6,
      z: zD + 2.2,
      leader: [mid(xSt, x1), zD + 0.3],
      size: 8,
      anchor: 'start',
    },
    {
      text: '下沉廣場（戶外）\n往南是上到地面的樓梯',
      x: mid(x1, PIT.court[2]) + 3,
      z: PIT.flatW - 1.6,
      size: 9,
      color: dim,
    },
    {
      text: '通往麥當勞的開口',
      x: x1 - 0.6,
      z: mz(mid(O[0], O[1])) - 3.2,
      leader: [x1, mz(mid(O[0], O[1]))],
      size: 8,
      anchor: 'end',
    },
    { text: '麥當勞', x: mid(M.x0, M.x1), z: M.z0 + 1.9, size: 13, bold: true },
    { text: '用餐區', x: mid(M.x0, M.x1), z: mz(15.6), size: 11, bold: true },
    { text: '點餐大廳', x: mx(20.2), z: mz(6.6), size: 10, bold: true },
    { text: '櫃台', x: mx(15.7), z: mz(4.9), size: 8, vertical: true },
    { text: '廚房', x: mx(12.4), z: mz(4.9), size: 9, vertical: true },
    { text: '內場\n（不開放）', x: mx(4.8), z: mz(4), size: 9, color: dim },
  ];
  const legend = [
    '西半（樓梯廳、用餐區、學餐攤販、入口位置）照使用者給的 B1 平面圖，往西、往北擴到整個一樓大廳底下，旋轉梯照一樓平面圖的位置；東半是麥當勞。攤販區站在坑底，上面是廣場的甲板。',
    '待確認：麥當勞店內的格局（櫃台、廚房、用餐區的位置）、用餐區的桌椅擺法、三個攤販的名稱。',
  ];
  return {
    zones,
    labels,
    legend,
    autoLabels: true,
    zoneNames: { open: '學餐攤販區', outdoor: '下沉廣場（戶外）' },
    bounds: { x0: PIT.west[0] - 1, x1: M.x1 + 1, z0: PIT.west[1] - 1, z1: zS + 1.5 },
  };
}

export default {
  id: 'sac',
  name: '學生活動中心',
  source: SRC,
  note: '依目前模型產生（核對用）',
  scale: 9,

  async build(env) {
    // 和遊戲同樣的順序：先挖 G 區的坑（下沉舞台、B1），再蓋 B1（旋轉梯在裡面），最後蓋樓上
    const { zoneGTerrain } = await env.game('src/world/zones/ZoneG.js');
    zoneGTerrain(env.data);
    const { buildMcD } = await env.gamePrivate('src/world/Interiors.js', ['buildMcD']);
    buildMcD(env.I, env.scene);
    const { buildSacB1 } = await env.game('src/world/buildings/SacB1.js');
    buildSacB1(env.I, env.scene, env.Kit, env.regMat, env.worldWalls);
    const { buildSac } = await env.game(SRC);
    const r = buildSac(env.I, env.scene, env.data, env.collision, env.Kit, env.regMat) || env.I.sac;
    if (!r) throw new Error('data/cycu.json 裡找不到學生活動中心');
    return { kit: r.k, base: 0, FL: r.FL, pit: env.H(-150, -110) };
  },

  floors(ctx) {
    const FL = ctx.built.FL,
      names = ['一樓', '二樓', '三樓', '四樓'];
    return [
      {
        id: 'b1',
        name: 'B1 ',
        scale: 18,
        cut: 0.6,
        source: 'SacB1.js、Interiors.js',
        note: '依目前模型產生；麥當勞店內格局待確認',
        y: ctx.built.pit + 0.1,
        top: FL[0],
        hi: ctx.built.pit + 2.9,
      },
      ...FL.map((y, i) => ({ id: `${i + 1}f`, name: names[i], y, top: FL[i + 1] ?? y + 3.4 })),
    ];
  },

  plan({ sl, floor }) {
    if (floor.id === 'b1') return planB1(sl);
    // 1F～4F：docs/references/floorplans/sac/ 放的是使用者給的修改版平面圖（參考圖，不是這支工具產生的）。
    // 這裡只把模型切出來畫成圖，給改模型的人和修改版並排核對：門牌、招牌自動標，不另外排房間名稱
    const { XR } = readConsts(SRC, ['XR']);
    sl.texts = sl.texts.filter((t) => !CLUTTER.test(t.text));
    sl.walls = sl.walls.filter((w) => Math.max(w.a[0], w.b[0]) <= XR + 0.6); // 麥當勞門外的柱子（為了 B1 才一起蓋的）不屬於樓上
    return {
      autoLabels: true,
      legend: ['依目前模型產生，給和修改版平面圖（同資料夾的 sac-1f.svg 等）並排核對用。'],
    };
  },
  // 1F～4F 的 docs 圖是修改版參考圖：預設不覆蓋，要看模型切出來的圖請加 --out
  reference: ['1f', '2f', '3f', '4f'],
};
