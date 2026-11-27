// 台鐵時刻表 → src/entities/TrainTimetable.js（火車照現實班表經過遊戲地圖那段縱貫線）
//
// 資料來源：臺鐵開放資料「鐵路時刻表-JSON」（https://ods.railway.gov.tw/tra-ods-web/ods/download/dataResource/railway_schedule/JSON/list，
// 政府資料開放授權條款第 1 版），每天一個檔，例如 20261202.json。挑一個平日、一個週六的檔餵進來：
//   node tools/train_timetable.mjs <平日.json> <週六.json>
//
// 地圖裡的鐵軌（data/cycu.json rail）在內壢站（車站代碼 1090）與中壢站（1100）之間。每班經過這段的車，取它在這段前後
// 的兩個停靠站，照里程內插出「車頭在內壢站」與「在中壢站」的時刻（遊戲分鐘數，0 = 午夜），遊戲裡就在兩者之間等速前進。
// 跳過內壢的對號列車（桃園 → 中壢）也一樣照里程內插。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 各站離內壢站的里程（公里，往中壢為正；縱貫線北段實際站距）。內壢 → 中壢 3.93 km 也是 data/cycu.json 鐵軌量出的長度
const KM = {
  1070: -13.6, // 鶯歌
  1075: -9.9, // 鳳鳴
  1080: -5.5, // 桃園
  1090: 0, // 內壢
  1100: 3.93, // 中壢
  1105: 9.1, // 埔心
  1110: 12.9, // 楊梅
  1120: 17.6, // 富岡
};
const A = 0,
  B = 3.93; // 內壢、中壢
const mins = (s) => {
  const [h, m, x] = s.split(':').map(Number);
  return h * 60 + m + (x || 0) / 60;
};
// 車種 → 外觀（Trains.js LOOK）與節數
const looks = (cc) => {
  if (cc === '1131') return ['local', 8]; // 區間車
  if (cc === '1132') return ['local', 10]; // 區間快
  if (/^111/.test(cc)) return ['chukuang', 9]; // 莒光（機車頭＋客車）
  if (cc === '110G' || cc === '110H') return ['express', 12]; // 自強 3000
  return ['express', 8]; // 其他自強（普悠瑪、太魯閣、推拉式）
};

function convert(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  for (const t of d.TrainInfos) {
    // 依停靠順序，每站時間（跨午夜的續行車照順序遞增）
    let prev = -1,
      add = 0;
    const st = [];
    for (const x of [...t.TimeInfos].sort((a, b) => +a.Order - +b.Order)) {
      let arr = mins(x.ARRTime) + add,
        dep = mins(x.DEPTime) + add;
      if (arr < prev - 600) {
        add += 1440;
        arr += 1440;
        dep += 1440;
      }
      if (dep < arr) dep += 1440;
      prev = dep;
      if (x.Station in KM) st.push({ km: KM[x.Station], arr, dep });
    }
    // 跨過內壢—中壢這段的一對相鄰停靠站
    let seg = null;
    for (let i = 0; i < st.length - 1; i++) {
      const p = st[i],
        q = st[i + 1];
      const lo = Math.min(p.km, q.km),
        hi = Math.max(p.km, q.km);
      if (lo <= A && hi >= B) {
        seg = [p, q];
        break;
      }
    }
    if (!seg) continue;
    const [p, q] = seg,
      at = (km) => p.dep + ((q.arr - p.dep) * (km - p.km)) / (q.km - p.km);
    const [look, cars] = looks(t.CarClass);
    out.push([+at(A).toFixed(2), +at(B).toFixed(2), t.Train, look, cars]);
  }
  out.sort((a, b) => Math.min(a[0], a[1]) - Math.min(b[0], b[1]));
  return out;
}

const [wk, sat] = process.argv.slice(2);
if (!wk || !sat) {
  console.error('usage: node tools/train_timetable.mjs <平日.json> <週六.json>');
  process.exit(1);
}
const W = convert(wk),
  S = convert(sat);
const row = (r) => `  [${r[0]}, ${r[1]}, '${r[2]}', '${r[3]}', ${r[4]}],`;
const src = `// 由 tools/train_timetable.mjs 從臺鐵開放資料「鐵路時刻表」產生（${path.basename(wk)} 平日、${path.basename(sat)} 週六），不要手改。
// 每列：[車頭經過內壢站的時刻, 經過中壢站的時刻, 車次, 外觀, 節數]；時刻是午夜起算的分鐘數（遊戲時鐘 game.clock 同單位）。
// 內壢時刻 < 中壢時刻：南下（往中壢）；反之北上。
export const WEEKDAY = [
${W.map(row).join('\n')}
];
export const WEEKEND = [
${S.map(row).join('\n')}
];
`;
fs.writeFileSync(path.join(ROOT, 'src/entities/TrainTimetable.js'), src);
console.log(`weekday ${W.length} trains, weekend ${S.length} trains`);
