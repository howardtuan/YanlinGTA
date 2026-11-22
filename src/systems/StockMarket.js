// 靈感股 — a pretend Taiwan stock market for the i-Piyan app and the desktop computers.
// 100 listings: PYL first, then 99 companies modelled on real TWSE stocks (price levels and industries
// taken from them) with altered names (homophones / look-alike characters) and codes (last digit + 5).
// Prices are generated, not real: a market regime (bull / bear / sideways, with the odd shock day) drives
// every stock through its beta, plus its own noise. Everything is a pure function of (seed, stock, day),
// so the same game day always shows the same chart and the save only has to keep holdings and plans.
// Hours follow the TWSE: 整股 09:00–13:30, 盤中零股 09:10–13:30, closed on Saturday and Sunday.
// PYtoday news about a listed company (js/news.js, also a pure function of the day) moves its price: news before the
// open (or from the evening / weekend before) gaps the open, news during the session pushes the path from that minute.

import { newsEffects } from '../ui/phone/News.js';

// [real code, name in the game, industry, price level]
const RAW = [
  ['2330', '苔積電', '半導體', 1050], ['2454', '連發科', '半導體', 1350], ['2303', '蓮電', '半導體', 48],
  ['3711', '日月先投控', '半導體', 160], ['2379', '瑞玉', '半導體', 550], ['3034', '聯泳', '半導體', 480],
  ['2344', '華幫電', '半導體', 25], ['6415', '砂力-KY', '半導體', 450], ['3443', '創義', '半導體', 1400],
  ['3661', '世心-KY', '半導體', 2500], ['5274', '信華', '半導體', 4000], ['3529', '力王', '半導體', 2200],
  ['6488', '環球精', '半導體', 400], ['5347', '世屆', '半導體', 95], ['2449', '京圓電子', '半導體', 110],
  ['3105', '穩茂', '半導體', 100], ['2337', '旺洪', '半導體', 23], ['8299', '群連', '半導體', 500],
  ['6669', '偉穎', '電腦週邊', 2600], ['2317', '紅海', '電子代工', 180], ['2382', '廣搭', '電腦週邊', 280],
  ['2357', '華石', '電腦週邊', 600], ['2353', '宏基', '電腦週邊', 38], ['2324', '仁保', '電腦週邊', 32],
  ['3231', '偉創', '電腦週邊', 110], ['2356', '英葉達', '電腦週邊', 45], ['2301', '光保科', '電子零組件', 100],
  ['2308', '抬達電', '電子零組件', 400], ['2327', '國鉅', '電子零組件', 500], ['2345', '智幫', '通信網路', 600],
  ['3008', '大力光', '光電', 2400], ['2474', '可城', '電子零組件', 200], ['4938', '和石', '電腦週邊', 90],
  ['2395', '研樺', '電腦週邊', 380], ['3037', '欣星', '電子零組件', 150], ['2376', '技佳', '電腦週邊', 260],
  ['2377', '微心', '電腦週邊', 150], ['3017', '奇宏', '電子零組件', 700], ['2383', '台光店', '電子零組件', 500],
  ['3045', '台彎大', '通信網路', 110], ['2412', '中樺電', '通信網路', 125], ['4904', '遠船', '通信網路', 85],
  ['2409', '有達', '光電', 14], ['3481', '裙創', '光電', 13], ['2498', '洪達電', '通信網路', 40],
  ['2360', '至茂', '電子零組件', 400], ['8046', '楠電', '電子零組件', 130], ['4958', '臻頂-KY', '電子零組件', 120],
  ['3533', '佳澤', '電子零組件', 1500], ['6409', '旭準', '電子零組件', 1000], ['2059', '穿湖', '電子零組件', 1100],
  ['2368', '金象電', '電子零組件', 300], ['3324', '雙紅', '電子零組件', 650], ['2347', '連強', '電子通路', 70],
  ['2881', '富幫金', '金融保險', 85], ['2882', '國太金', '金融保險', 60], ['2891', '中心金', '金融保險', 40],
  ['2886', '兆風金', '金融保險', 40], ['2884', '玉衫金', '金融保險', 28], ['2892', '第壹金', '金融保險', 27],
  ['2880', '華楠金', '金融保險', 30], ['2885', '元大今', '金融保險', 33], ['2883', '開法金', '金融保險', 14],
  ['2887', '抬新金', '金融保險', 18], ['2890', '永風金', '金融保險', 23], ['5880', '合庫今', '金融保險', 26],
  ['2801', '章銀', '金融保險', 19], ['5871', '中祖-KY', '金融保險', 120],
  ['1301', '台素', '塑膠', 40], ['1303', '南牙', '塑膠', 35], ['1326', '台花', '塑膠', 35],
  ['6505', '台素化', '油電燃氣', 50], ['2002', '中剛', '鋼鐵', 22], ['1101', '台尼', '水泥', 32],
  ['1216', '統壹', '食品', 80], ['1210', '大城', '食品', 60], ['2912', '統壹超', '貿易百貨', 270],
  ['2207', '和太車', '汽車', 600], ['9910', '風泰', '其他', 130], ['9921', '鉅大', '其他', 200],
  ['9914', '美力達', '其他', 150], ['1402', '遠冬新', '紡織纖維', 30], ['1476', '儒紅', '紡織纖維', 450],
  ['1477', '聚揚', '紡織纖維', 300], ['2603', '長容', '航運', 200], ['2609', '楊明', '航運', 70],
  ['2618', '長容航', '航運', 38], ['2633', '抬灣高鐵', '航運', 28], ['1504', '東圓', '電機機械', 55],
  ['1519', '華成', '電機機械', 650], ['1513', '中星電', '電機機械', 160], ['2049', '尚銀', '電機機械', 250],
  ['6446', '葯華藥', '生技醫療', 500], ['1795', '美石', '生技醫療', 300], ['4743', '和一', '生技醫療', 80],
  ['6547', '高短疫苗', '生技醫療', 50], ['1760', '寶靈富錦', '生技醫療', 40], ['9945', '閏泰新', '建材營造', 40],
  ['2542', '星富發', '建材營造', 45],
];
// daily volatility and market beta by industry
const IND = {
  半導體: [0.022, 1.25], 電腦週邊: [0.022, 1.15], 電子代工: [0.018, 1.1], 電子零組件: [0.024, 1.2], 通信網路: [0.016, 0.8],
  光電: [0.024, 1.1], 電子通路: [0.015, 0.9], 金融保險: [0.012, 0.75], 塑膠: [0.015, 0.8], 油電燃氣: [0.014, 0.7],
  鋼鐵: [0.016, 0.9], 水泥: [0.013, 0.7], 食品: [0.011, 0.55], 貿易百貨: [0.011, 0.5], 汽車: [0.016, 0.8],
  其他: [0.018, 0.9], 紡織纖維: [0.018, 0.85], 航運: [0.03, 1.3], 電機機械: [0.026, 1.2], 生技醫療: [0.03, 0.9],
  建材營造: [0.017, 0.9], 帥氣產業: [0.028, 1.3],
};
const PYL = { code: 'PYL', name: '彥霖好帥', full: '彥霖好帥股份有限公司', ind: '帥氣產業', base: 888 };
export const STOCKS = [PYL, ...RAW.map(([c, name, ind, base]) => ({ code: c.slice(0, 3) + ((+c[3] + 5) % 10), name, full: `${name.replace(/-KY$/, '')  }股份有限公司`, ind, base }))];

// TWSE price steps (升降單位)
const TICK = (p) => (p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5);
export const roundTick = (p) => { const t = TICK(p); return +(Math.round(p / t) * t).toFixed(2); };
const floorTick = (p) => { const t = TICK(p); return +(Math.floor(p / t + 1e-9) * t).toFixed(2); };
const ceilTick = (p) => { const t = TICK(p); return +(Math.ceil(p / t - 1e-9) * t).toFixed(2); };
export const fmtP = (p) => (p < 10 ? p.toFixed(2) : p < 50 ? p.toFixed(2) : p < 500 ? p.toFixed(1) : p.toFixed(0));
const hashN = (...n) => { let h = 2166136261; for (const x of n) { h ^= (x | 0) + 0x9e3779b9 + (h << 6) + (h >>> 2); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const rngOf = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

export const OPEN = 9 * 60, CLOSE = 13 * 60 + 30, ODD_OPEN = 9 * 60 + 10;
const SEG = 5, NP = (CLOSE - OPEN) / SEG + 1;  // intraday path: one point every 5 game minutes
const HIST0 = -160;                             // days of history before the game starts
const REG = { bull: { mu: 0.0035, sd: 0.009, name: '多頭' }, bear: { mu: -0.0045, sd: 0.012, name: '空頭' }, flat: { mu: 0, sd: 0.007, name: '盤整' } };
export const isTradingDay = (d) => ((d % 7) + 7) % 7 < 5; // day 0 is a Monday
export const dayDate = (d) => { const t = new Date(2026, 10, 23 + d); return `${t.getMonth() + 1}/${t.getDate()}`; };
const WEEK = '一二三四五六日';
export const dayLabel = (d) => `${dayDate(d)}（${WEEK[((d % 7) + 7) % 7]}）`;

export class Market {
  constructor(game) {
    this.g = game; this.seed = 34;
    this.list = STOCKS.map((s, i) => {
      const [vol, beta] = IND[s.ind] || [0.018, 1];
      const r = rngOf(hashN(this.seed, i, 7));
      return { ...s, i, vol: vol * (0.85 + r() * 0.3), beta: beta * (0.85 + r() * 0.3), drift: s.code === 'PYL' ? 0.0012 : (r() - 0.5) * 0.0012, vbase: Math.round((s.base > 500 ? 800 : s.base > 100 ? 4000 : 20000) * (0.4 + r() * 1.2)), candles: [], close: 1, path: null, pathDay: null };
    });
    this.by = new Map(this.list.map((s) => [s.code, s]));
    this.regime = 'bull'; this.regDay = {}; this.genDay = HIST0 - 1; this.index = [];
    this.holdings = {}; this.dca = []; this.trades = []; this.watch = ['PYL', '2335', '2312', '2459'];
    // history, scaled so the last close before day 0 sits on today's real price level
    for (const s of this.list) s.close = 100;
    this._gen(-1);
    for (const s of this.list) {
      const k = s.base / s.candles[s.candles.length - 1].c;
      for (const c of s.candles) { c.o = roundTick(c.o * k); c.h = roundTick(c.h * k); c.l = roundTick(c.l * k); c.c = roundTick(c.c * k); }
      s.close = s.candles[s.candles.length - 1].c;
    }
    this._indexHistory();
    this._lastMin = null;
  }
  // ---------- generation ----------
  _gen(upTo) {
    for (let d = this.genDay + 1; d <= upTo; d++) {
      this.genDay = d;
      if (!isTradingDay(d)) continue;
      const R = rngOf(hashN(this.seed, 999, d + 100000));
      if (R() < 0.07) { const o = Object.keys(REG).filter((k) => k !== this.regime); this.regime = o[R() < 0.5 ? 0 : 1]; }
      const reg = REG[this.regime];
      let mret = reg.mu + reg.sd * gauss(R);
      if (R() < 0.025) mret += (R() < 0.5 ? -1 : 1) * (0.02 + R() * 0.025); // shock day
      this.regDay[d] = this.regime;
      const E = newsEffects(d);
      for (const s of this.list) this._genStock(s, d, mret, E.filter((e) => e.code === s.code));
    }
  }
  _genStock(s, d, mret, eff = []) {
    const r = rngOf(hashN(this.seed, s.i, d + 100000)), prev = s.close;
    const lo = d < 0 ? prev * 0.9 : ceilTick(prev * 0.9), hi = d < 0 ? prev * 1.1 : floorTick(prev * 1.1);
    const clamp = (p) => Math.max(lo, Math.min(hi, p));
    const gap = eff.filter((e) => e.at <= OPEN).reduce((t, e) => t + e.pct, 0), intra = eff.filter((e) => e.at > OPEN);
    const ret = Math.max(-0.0995, Math.min(0.0995, s.beta * mret + s.vol * gauss(r) + s.drift + gap));
    const open = clamp(prev * (1 + (ret - gap) * 0.35 + gap * 0.8 + s.vol * 0.35 * gauss(r)));
    const close = clamp(prev * (1 + ret));
    // Brownian bridge from open to close in log space
    const w = [0]; const sd = s.vol * 0.55 / Math.sqrt(NP - 1);
    for (let k = 1; k < NP; k++) w.push(w[k - 1] + sd * gauss(r));
    const lo0 = Math.log(open), lc = Math.log(close), path = new Array(NP);
    let h = -Infinity, l = Infinity;
    for (let k = 0; k < NP; k++) {
      const t = k / (NP - 1), p = clamp(Math.exp(lo0 + (lc - lo0) * t + w[k] - t * w[NP - 1]));
      path[k] = d < 0 ? p : roundTick(p);
    }
    // news during the session: the price moves toward the news over ~20 minutes from the moment it is out
    for (const e of intra) for (let k = 0; k < NP; k++) {
      const tm = OPEN + k * SEG; if (tm < e.at) continue;
      path[k] = roundTick(clamp(path[k] * (1 + e.pct * Math.min(1, (tm - e.at) / 20))));
    }
    for (const q of path) { if (q > h) h = q; if (q < l) l = q; }
    const v = Math.round(s.vbase * (0.6 + r() * 0.8) * (1 + Math.abs(ret) * 15) * (1 + eff.reduce((t, e) => t + Math.abs(e.pct), 0) * 20)); // news days trade heavier
    s.candles.push({ d, o: path[0], h, l, c: path[NP - 1], v });
    s.close = path[NP - 1]; s.path = path; s.pathDay = d;
  }
  _idxVal(get) { let a = 0, b = 0; for (const s of this.list) { a += s.base * (get(s) / s.base); b += s.base; } return 20000 * a / b; }
  _indexHistory() {
    this.index = [];
    const n = this.list[0].candles.length;
    for (let k = 0; k < n; k++) {
      const d = this.list[0].candles[k].d;
      const at = (f) => this._idxVal((s) => s.candles[k][f]);
      this.index.push({ d, o: at('o'), h: at('h'), l: at('l'), c: at('c'), v: this.list.reduce((t, s) => t + s.candles[k].v, 0) });
    }
  }
  // ---------- clock ----------
  get day() { return Math.floor(this.g.clock / 1440); }
  get minute() { return this.g.clock - this.day * 1440; }
  session() {
    const d = this.day, m = this.minute;
    if (!isTradingDay(d)) return { k: 'holiday', label: '休市（週末）', open: false };
    if (m < OPEN - 30) return { k: 'pre', label: '尚未開盤', open: false };
    if (m < OPEN) return { k: 'auction', label: '盤前試撮', open: false };
    if (m < CLOSE) return { k: 'open', label: m < ODD_OPEN ? '交易中（零股 09:10 開始）' : '交易中', open: true, odd: m >= ODD_OPEN };
    return { k: 'closed', label: '已收盤', open: false };
  }
  update() {
    const d = this.day;
    if (d > this.genDay) { this._gen(d); this._indexHistory(); }
    const m = Math.floor(this.g.clock); // absolute game minute (minute-of-day repeats every day)
    if (m !== this._lastMin) { this._lastMin = m; this._runDca(); }
  }
  // candles strictly before today + today's (partial) candle when the market has opened
  todayIdx(s) { return s.candles.length && s.candles[s.candles.length - 1].d === this.day ? s.candles.length - 1 : -1; }
  _pathAt(s) {
    const k = Math.max(0, Math.min(NP - 1, (Math.min(this.minute, CLOSE) - OPEN) / SEG));
    const a = Math.floor(k), b = Math.min(NP - 1, a + 1), t = k - a;
    return roundTick(s.path[a] + (s.path[b] - s.path[a]) * t);
  }
  started() { return isTradingDay(this.day) && this.minute >= OPEN; }
  price(s) {
    if (typeof s === 'string') s = this.by.get(s);
    this.update();
    const ti = this.todayIdx(s);
    if (ti >= 0 && this.started()) return this._pathAt(s);
    return ti >= 0 ? s.candles[ti - 1].c : s.candles[s.candles.length - 1].c;
  }
  prevClose(s) { const ti = this.todayIdx(s); return ti >= 0 ? s.candles[ti - 1].c : s.candles[s.candles.length - 2]?.c ?? s.close; }
  // shown change: against yesterday's close (today) or the day before the last session (closed days)
  quote(s) {
    if (typeof s === 'string') s = this.by.get(s);
    const p = this.price(s), ti = this.todayIdx(s);
    const live = ti >= 0 && this.started();
    // before today's open (or on a closed day) show the last session against the one before it
    const last = ti >= 0 ? ti - 1 : s.candles.length - 1;
    const ref = live ? s.candles[ti - 1].c : s.candles[last - 1].c;
    let o = null, h = null, l = null, v = 0;
    if (live) {
      const kk = Math.min(NP - 1, Math.floor((Math.min(this.minute, CLOSE) - OPEN) / SEG));
      o = s.path[0]; h = Math.max(...s.path.slice(0, kk + 1), p); l = Math.min(...s.path.slice(0, kk + 1), p);
      v = Math.round(s.candles[ti].v * Math.min(1, (this.minute - OPEN) / (CLOSE - OPEN)));
    } else { const c = s.candles[last]; o = c.o; h = c.h; l = c.l; v = c.v; }
    return { p, ref, ch: p - ref, pct: (p - ref) / ref * 100, o, h, l, v, upLimit: floorTick(ref * 1.1), downLimit: ceilTick(ref * 0.9) };
  }
  // daily candles to draw (today's only once it has traded)
  candles(s, n) {
    if (typeof s === 'string') s = this.by.get(s);
    this.update();
    const ti = this.todayIdx(s), q = this.quote(s);
    const hist = (ti >= 0 ? s.candles.slice(0, ti) : s.candles).slice(-n);
    if (ti >= 0 && this.started()) hist.push({ d: this.day, o: q.o, h: q.h, l: q.l, c: q.p, v: q.v });
    return hist.slice(-n);
  }
  // intraday points so far: [{m, p}]
  intraday(s) {
    if (typeof s === 'string') s = this.by.get(s);
    this.update();
    if (this.todayIdx(s) < 0 || !this.started()) return [];
    const out = [], now = Math.min(this.minute, CLOSE);
    for (let m = OPEN; m <= now; m += SEG) { const k = (m - OPEN) / SEG; out.push({ m, p: s.path[k] }); }
    out.push({ m: now, p: this._pathAt(s) });
    return out;
  }
  indexQuote() {
    this.update();
    const ti = this.todayIdx(this.list[0]);
    const cur = this._idxVal((s) => this.price(s));
    const last = ti >= 0 ? ti - 1 : this.index.length - 1;
    const ref = ti >= 0 && this.started() ? this.index[ti - 1].c : this.index[last - 1].c;
    return { p: cur, ref, ch: cur - ref, pct: (cur - ref) / ref * 100, regime: REG[this.regDay[this.genDay] || this.regime].name };
  }
  // ---------- trading ----------
  fee(amount, odd) { return Math.max(odd ? 1 : 20, Math.round(amount * 0.001425)); }
  // side 'buy' | 'sell', mode 'lot' (張) | 'odd' (股); returns an error message or null
  order(code, side, mode, qty) {
    const s = this.by.get(code), st = this.session(), g = this.g;
    qty = Math.floor(qty);
    if (!s) return '找不到這支股票';
    if (!(qty > 0)) return '請輸入數量';
    if (!st.open) return st.k === 'holiday' ? '今天休市，下個交易日 09:00 開盤' : `目前${st.label}，整股 09:00–13:30、零股 09:10–13:30 可以交易`;
    if (mode === 'odd' && !st.odd) return '盤中零股 09:10 才開始交易';
    if (mode === 'odd' && qty > 999) return '零股一次最多 999 股';
    const sh = mode === 'lot' ? qty * 1000 : qty, p = this.price(s), amount = Math.round(p * sh), fee = this.fee(amount, mode === 'odd');
    const H = this.holdings[code] || { sh: 0, cost: 0 };
    if (side === 'buy') {
      const total = amount + fee;
      if (!g.spend(total, `買進 ${s.name} ${sh.toLocaleString()} 股`)) return `錢不夠：需要 NT$${total.toLocaleString()}（含手續費 ${fee}）`;
      H.sh += sh; H.cost += total; this.holdings[code] = H;
      this._log({ side, code, sh, p, total: -total });
    } else {
      if (H.sh < sh) return `庫存只有 ${H.sh.toLocaleString()} 股`;
      const tax = Math.round(amount * 0.003), net = amount - fee - tax;
      g.earn(net, `賣出 ${s.name} ${sh.toLocaleString()} 股`);
      H.cost = Math.round(H.cost * (H.sh - sh) / H.sh); H.sh -= sh;
      if (H.sh <= 0) delete this.holdings[code]; else this.holdings[code] = H;
      this._log({ side, code, sh, p, total: net });
    }
    g._saveT = 9.5;
    return null;
  }
  _log(t) { this.trades.unshift({ ...t, at: this.g.clock }); if (this.trades.length > 40) this.trades.length = 40; }
  // ---------- 定期定額: buys odd lots at the open price on its days ----------
  addDca(code, amount, freq) {
    amount = Math.floor(amount);
    if (!this.by.get(code)) return '找不到這支股票';
    if (!(amount >= 100)) return '每次至少 NT$100';
    const p = this.price(code), need = Math.ceil(p) + this.fee(Math.ceil(p), true);
    if (amount < need) return `每次金額要能買到 1 股：至少 NT$${need.toLocaleString()}`;
    this.dca.push({ id: Date.now() + Math.random(), code, amount, freq, last: this.day - (this.minute >= OPEN ? 0 : 1) });
    this.g._saveT = 9.5; return null;
  }
  removeDca(id) { this.dca = this.dca.filter((p) => p.id !== id); this.g._saveT = 9.5; }
  _runDca() {
    const d = this.day;
    if (!this.dca.length || !isTradingDay(d) || this.minute < OPEN) return;
    const g = this.g, dow = ((d % 7) + 7) % 7;
    for (const plan of this.dca) {
      if (plan.last >= d) continue;
      if (plan.freq === 'week' && dow !== 0) { plan.last = d; continue; }
      plan.last = d;
      const s = this.by.get(plan.code); if (!s) continue;
      const p = s.path[0];
      let sh = Math.floor(plan.amount / p);
      while (sh > 0 && Math.round(p * sh) + this.fee(Math.round(p * sh), true) > plan.amount) sh--;
      if (sh < 1) { g.hud.toast(`📈 定期定額 ${s.name}：NT$${plan.amount} 買不到 1 股`, 'bad', 3000); continue; }
      const total = Math.round(p * sh) + this.fee(Math.round(p * sh), true);
      if (!g.spend(total, `定期定額 ${s.name} ${sh} 股`)) { g.hud.toast(`📈 定期定額 ${s.name} 扣款失敗：零用錢不夠`, 'bad', 3000); continue; }
      const H = this.holdings[plan.code] || { sh: 0, cost: 0 };
      H.sh += sh; H.cost += total; this.holdings[plan.code] = H;
      this._log({ side: 'dca', code: plan.code, sh, p, total: -total });
      g.hud.toast(`📈 定期定額買進 ${s.name} ${sh} 股（NT$${total}）`, 'good', 2800);
    }
    g._saveT = 9.5;
  }
  // ---------- save ----------
  toJSON() { return { holdings: this.holdings, dca: this.dca, trades: this.trades, watch: this.watch }; }
  load(d) {
    if (!d) return;
    this.holdings = d.holdings || {}; this.dca = d.dca || []; this.trades = d.trades || []; if (d.watch) this.watch = d.watch;
  }
}
