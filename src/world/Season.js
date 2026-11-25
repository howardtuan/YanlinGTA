// 節慶月份：照真實日期（測試時可用 ?date=YYYY-MM-DD，和 src/entities/npcs/Service.js 同一個參數）。
//  - 12 月：正門噴水池東側（從校門往內看是右邊）的大聖誕樹（src/world/Festive.js）
//  - 1、2 月：過年，金色選票換成紅包圖案（src/core/Game.js _ballots）、店家和校內建築掛燈籠／春聯
//    （src/world/Festive.js）、路人放鞭炮（src/systems/Firecrackers.js）
// 遊戲開場時決定一次，玩到跨月也不會中途換景。
export function seasonDate() {
  const q =
    typeof location !== 'undefined' ? new URLSearchParams(location.search).get('date') : null;
  const m = q && /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
}
export const isChristmas = (d = seasonDate()) => d.getMonth() === 11;
export const isLunarNewYear = (d = seasonDate()) => d.getMonth() === 0 || d.getMonth() === 1;
