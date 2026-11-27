// 經過地圖的市區公車路線（src/systems/Buses.js 照這裡開）。
// 資料來源：桃園市公車動態資訊系統 https://ebus.tycg.gov.tw/ebus （2026-11-25 平日查詢：路線站序、站點座標、
// 去程發車時刻）。只放資料查得到站序與座標的路線：
//   155 中壢－元智大學（桃園客運）、156 中壢－上內壢（桃園客運）、167／167A 中壢循環線（中壢客運，兩個方向的環線）
// 沒做的：172B（試辦線，起點在校內）、181（試辦線，ebus 查不到）。
// 中北路與新中北路在地圖上不相連：公車從中北路底的中原大學正門開進校園，停校內全人大道上的「中原大學全人村」
// （ebus 的站點座標就在全人大道上），再從全人大道出新中北路（反方向倒過來）。正門口到全人大道北端那 90 m 在遊戲裡
// 是 4.2 m 寬、不給車開的校內小路，12 m 的公車開不過去，所以路線在那裡分成兩段（legs）：車停在正門口，沒人看到時
// 收起來，gap 秒後從全人大道北端出來（src/systems/Buses.js）。
//
// 每條路線的每個方向（dirs；一段一段的放在 legs，每段有自己的 roads／enter／exit／stops，後面的段有 gap）：
//   dest：LED 看板上的終點
//   roads：在地圖裡依序走的道路（OSM 路名；src/systems/Buses.js routeEdges 照這個順序在路網上找路）
//   enter／exit：進出地圖那一頭的下一個（地圖外的）站的座標 [緯度, 經度]，用來決定從哪一端進出
//   stops：地圖裡依序停的站（ebus 站名、座標）；osm：OpenStreetMap 上同一站的寫法不同時（六和／六合汽車）
//   times：起站發車時刻（ebus 平日班表）；lead：從起站開到地圖邊界大約幾分鐘（照站數估的）
//   沒有 times 的方向（ebus 只給去程發車時刻）：first／last 之間每 headway 分鐘一班，headway 用去程一天的班數換算
export const BUS_FARE = 18; // 桃園市區公車一段票全票

const LIV = {
  155: { upper: '#f3f3ef', lower: '#2a8a4a', stripe: '#f2c230' },
  156: { upper: '#f3f3ef', lower: '#2b62b0', stripe: '#e8613a' },
  167: { upper: '#f4f1e8', lower: '#c8452e', stripe: '#3a3a3e' },
};

// 站（[緯度, 經度] 是 ebus 的站點座標，兩個方向各自的）
const S = {
  xiaoE: { name: '中原國小', at: [24.956559, 121.238481] },
  xiaoW: { name: '中原國小', at: [24.956593, 121.238522] },
  quanE: { name: '中原大學全人村', at: [24.958252, 121.241605] },
  quanW: { name: '中原大學全人村', at: [24.95829, 121.24151] },
  xinshiE: { name: '中原大學信實宿舍', at: [24.957454, 121.245429] },
  xinshiW: { name: '中原大學信實宿舍', at: [24.957661, 121.245429] },
  yingE: { name: '營頭厝', at: [24.95688, 121.250575] },
  yingW: { name: '營頭厝', at: [24.956957, 121.250601] },
  liuheN: { name: '六和汽車', osm: '六合汽車', at: [24.958516, 121.250389] },
  liuheS: { name: '六和汽車', osm: '六合汽車', at: [24.958543, 121.250135] },
  xzbk: { name: '新中北路口', at: [24.955786, 121.236054] },
  zhongyuanW: { name: '中原', at: [24.965987, 121.240938] },
  lalianW: { name: '台灣拉鍊', at: [24.964626, 121.236996] },
  lalianE: { name: '台灣拉鍊', at: [24.96438, 121.236824] },
  courtE: { name: '中壢簡易庭', at: [24.963701, 121.234767] },
};
// 地圖外的下一站（進出地圖的那一頭）
const OUT = {
  zsdk: [24.95646, 121.231867], // 中山東路口（中山東路一段）
  renai: [24.956555, 121.25296], // 仁愛社區（新中北路）
  fude: [24.960643, 121.253254], // 福德宮（環中東路）
  office: [24.963061, 121.229233], // 中壢聯合辦公大樓（中華路二段）
  gyq: [24.966986, 121.243798], // 中壢工業區（中華路二段）
};
// 中北路底的正門口、全人大道北端（遊戲座標）；兩者之間是開不過去的校內小路，約 90 m
const GATE = { xz: [-209, 85] },
  QUAN = { xz: [-130, 98] },
  CAMPUS = 30; // s：穿過那段校內小路

// 往東：中山東路一段 → 中北路 →（正門、校內）→ 全人大道 → 新中北路 …
// （ebus 往東的「中山東中北路口」站在中山東路一段、過了中北路口往東北約 80 m，資料沒寫公車停完之後怎麼轉回中北路，
// 所以往東先不停這站）
const east = (stops1, stops2, roads2, exit) => [
  { roads: ['中山東路一段', '中北路'], enter: OUT.zsdk, exit: GATE, stops: stops1 },
  { roads: ['全人大道', ...roads2], enter: QUAN, exit, stops: stops2, gap: CAMPUS },
];
// 往西：… 新中北路 → 全人大道 →（校內、正門）→ 中北路 → 中山東路一段
const west = (roads1, enter, stops1, stops2) => [
  { roads: [...roads1, '全人大道'], enter, exit: QUAN, stops: stops1 },
  { roads: ['中北路', '中山東路一段'], enter: GATE, exit: OUT.zsdk, stops: stops2, gap: CAMPUS },
];

export const BUS_ROUTES = [
  {
    id: '155',
    name: '中壢－元智大學',
    operator: '桃園客運',
    livery: LIV[155],
    dirs: [
      {
        dest: '元智大學',
        legs: east([S.xiaoE], [S.quanE, S.xinshiE, S.liuheN], ['新中北路', '環中東路'], OUT.fude),
        times: [
          '07:20',
          '08:00',
          '09:00',
          '12:00',
          '13:00',
          '14:00',
          '15:00',
          '17:50',
          '18:30',
          '21:00',
        ],
        lead: 6,
      },
      {
        dest: '中壢公車站',
        legs: west(
          ['環中東路', '新中北路'],
          OUT.fude,
          [S.liuheS, S.xinshiW, S.quanW],
          [S.xiaoW, S.xzbk]
        ),
        // ebus 只有去程發車時刻：照去程一天 10 班換算，約 80 分一班
        first: '07:50',
        last: '21:30',
        headway: 80,
      },
    ],
  },
  {
    id: '156',
    name: '中壢－上內壢',
    operator: '桃園客運',
    livery: LIV[156],
    dirs: [
      {
        dest: '上內壢',
        legs: east([S.xiaoE], [S.quanE, S.xinshiE, S.yingE], ['新中北路'], OUT.renai),
        times: [
          '05:40',
          '06:50',
          '07:40',
          '09:30',
          '10:45',
          '11:30',
          '12:30',
          '14:30',
          '17:20',
          '18:00',
          '19:30',
          '21:30',
        ],
        lead: 6,
      },
      {
        dest: '中壢公車站',
        legs: west(['新中北路'], OUT.renai, [S.yingW, S.xinshiW, S.quanW], [S.xiaoW, S.xzbk]),
        // ebus 只有去程發車時刻：照去程一天 12 班換算，約 85 分一班
        first: '06:30',
        last: '22:10',
        headway: 85,
      },
    ],
  },
  {
    id: '167',
    name: '中壢循環線（經篤行六村、內壢）',
    operator: '中壢客運',
    livery: LIV[167],
    dirs: [
      {
        dest: '中壢總站（循環）',
        legs: east([S.xiaoE], [S.quanE, S.xinshiE, S.yingE], ['新中北路'], OUT.renai),
        times: ['05:50', '06:20', '08:25', '10:45', '14:30', '16:40', '17:10'],
        lead: 6,
      },
      {
        // 同一班車繞過篤行六村、內壢之後從東邊沿中華路二段開回來（第 38～40 站）
        dest: '中壢總站（循環）',
        roads: ['中華路二段'],
        enter: OUT.gyq,
        exit: OUT.office,
        stops: [S.zhongyuanW, S.lalianW], // 中壢簡易庭在地圖西邊界外一點，車開到那裡就出地圖了
        times: ['05:50', '06:20', '08:25', '10:45', '14:30', '16:40', '17:10'],
        lead: 55,
      },
    ],
  },
  {
    id: '167A',
    name: '中壢循環線（經內壢、篤行六村）',
    operator: '中壢客運',
    livery: LIV[167],
    dirs: [
      {
        dest: '中壢總站（循環）',
        roads: ['中華路二段'],
        enter: OUT.office,
        exit: OUT.gyq,
        stops: [S.courtE, S.lalianE], // 中原在地圖北邊界上，車開到那裡就出地圖了
        times: ['07:00', '07:40', '09:35', '12:00', '15:40', '18:20', '18:45'],
        lead: 8,
      },
      {
        // 繞過內壢、篤行六村之後沿新中北路往西開回中壢（第 36～40 站；167A 的中原國小用 ebus 給的座標）
        dest: '中壢總站（循環）',
        legs: west(
          ['新中北路'],
          OUT.renai,
          [S.yingW, S.xinshiW, S.quanW],
          [{ ...S.xiaoE }, S.xzbk]
        ),
        times: ['07:00', '07:40', '09:35', '12:00', '15:40', '18:20', '18:45'],
        lead: 50,
      },
    ],
  },
];
