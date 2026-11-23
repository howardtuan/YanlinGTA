// 台式麻將（16 張）規則：牌的編號、向聽數、胡牌拆解、聽牌、台數、結算。純邏輯，不碰畫面（tests/unit/mahjong.test.js）。
// 牌種 kind：0–8 一萬～九萬、9–17 一筒～九筒、18–26 一條～九條、27–30 東南西北、31–33 中發白；34–41 花牌（春夏秋冬、梅蘭竹菊）。
// 一副 144 張：34 種各 4 張 + 8 張花。胡牌 = 5 組（順子／刻子／槓）+ 1 對，手上 16 張再進 1 張。
// 底 30、一台 10（src/systems/mahjong/Mahjong.js 用 settle() 算錢）。

export const KINDS = 34;
export const FLOWER0 = 34;
export const isFlower = (k) => k >= FLOWER0;
export const isHonor = (k) => k >= 27 && k < FLOWER0;
export const suitOf = (k) => (k < 27 ? Math.floor(k / 9) : 3); // 0 萬 1 筒 2 條 3 字
export const numOf = (k) => (k < 27 ? (k % 9) + 1 : 0);
const NUMS = '一二三四五六七八九';
const HONORS = ['東', '南', '西', '北', '中', '發', '白'];
const FLOWERS = ['春', '夏', '秋', '冬', '梅', '蘭', '竹', '菊'];
export const WINDS = ['東', '南', '西', '北'];
export function tileName(k) {
  if (isFlower(k)) return FLOWERS[k - FLOWER0];
  if (isHonor(k)) return HONORS[k - 27];
  return NUMS[k % 9] + '萬筒條'[suitOf(k)];
}

// the whole set, shuffled with rng() (0..1)
export function makeWall(rng = Math.random) {
  const w = [];
  for (let k = 0; k < KINDS; k++) for (let i = 0; i < 4; i++) w.push(k);
  for (let k = FLOWER0; k < FLOWER0 + 8; k++) w.push(k);
  for (let i = w.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [w[i], w[j]] = [w[j], w[i]];
  }
  return w;
}

export function counts(tiles) {
  const c = new Array(KINDS).fill(0);
  for (const t of tiles) if (!isFlower(t)) c[t]++;
  return c;
}
export const sortTiles = (a) => [...a].sort((x, y) => x - y);

// ---------------- 向聽數（shanten）----------------
// shanten = 2N − 2m − t − p（N = 還要湊的組數，m 完整組、t 搭子、p 有沒有雀頭，m + t ≤ N）；−1 = 已經胡了。
// 每一門各自列舉 (m, t, p) 的可能，再合起來（各門的結果用字串當 key 記住）。
const memo = new Map();
function suitOpts(c, seq) {
  const key = (seq ? 's' : 'h') + c.join('');
  const hit = memo.get(key);
  if (hit) return hit;
  const out = new Map();
  const rec = (m, t, p) => {
    let i = 0;
    while (i < c.length && !c[i]) i++;
    if (i === c.length) {
      out.set(`${m},${t},${p}`, [m, t, p]);
      return;
    }
    if (c[i] >= 3) {
      c[i] -= 3;
      rec(m + 1, t, p);
      c[i] += 3;
    }
    if (seq && i + 2 < c.length && c[i + 1] && c[i + 2]) {
      (c[i]--, c[i + 1]--, c[i + 2]--);
      rec(m + 1, t, p);
      (c[i]++, c[i + 1]++, c[i + 2]++);
    }
    if (c[i] >= 2) {
      c[i] -= 2;
      if (!p) rec(m, t, 1);
      rec(m, t + 1, p);
      c[i] += 2;
    }
    if (seq && i + 1 < c.length && c[i + 1]) {
      (c[i]--, c[i + 1]--);
      rec(m, t + 1, p);
      (c[i]++, c[i + 1]++);
    }
    if (seq && i + 2 < c.length && c[i + 2]) {
      (c[i]--, c[i + 2]--);
      rec(m, t + 1, p);
      (c[i]++, c[i + 2]++);
    }
    c[i]--;
    rec(m, t, p);
    c[i]++;
  };
  rec(0, 0, 0);
  // keep only the options nothing else beats
  const all = [...out.values()];
  const res = all.filter(
    (a) =>
      !all.some(
        (b) => b !== a && b[0] >= a[0] && b[1] >= a[1] && b[2] >= a[2] && b.join() !== a.join()
      )
  );
  if (memo.size > 50000) memo.clear();
  memo.set(key, res);
  return res;
}

// c: counts of the concealed tiles; sets: how many sets the concealed part still has to make (5 − melds)
export function shanten(c, sets) {
  let acc = [[0, 0, 0]];
  for (let s = 0; s < 4; s++) {
    const part = s < 3 ? c.slice(s * 9, s * 9 + 9) : c.slice(27, 34);
    const opts = suitOpts(part, s < 3);
    const next = new Map();
    for (const a of acc)
      for (const o of opts) {
        if (a[2] && o[2]) continue;
        const r = [a[0] + o[0], a[1] + o[1], a[2] + o[2]];
        next.set(r.join(), r);
      }
    acc = [...next.values()];
  }
  let best = 99;
  for (const [m0, t0, p] of acc) {
    const m = Math.min(m0, sets),
      t = Math.min(t0, sets - m);
    best = Math.min(best, 2 * sets - 2 * m - t - p);
  }
  return best;
}

// ---------------- 胡牌拆解 ----------------
// every way the concealed counts split into `sets` sets + a pair: [{pair, sets: [{type: 'pung'|'chow', t}]}]
export function decompose(c, sets) {
  const out = [];
  const cur = [];
  const rec = (pair) => {
    let i = 0;
    while (i < KINDS && !c[i]) i++;
    if (i === KINDS) {
      if (pair >= 0 && cur.length === sets) out.push({ pair, sets: cur.map((s) => ({ ...s })) });
      return;
    }
    if (pair < 0 && c[i] >= 2) {
      c[i] -= 2;
      rec(i);
      c[i] += 2;
    }
    if (c[i] >= 3) {
      c[i] -= 3;
      cur.push({ type: 'pung', t: i });
      rec(pair);
      cur.pop();
      c[i] += 3;
    }
    if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) {
      (c[i]--, c[i + 1]--, c[i + 2]--);
      cur.push({ type: 'chow', t: i });
      rec(pair);
      cur.pop();
      (c[i]++, c[i + 1]++, c[i + 2]++);
    }
  };
  rec(-1);
  return out;
}

export const isWin = (c, sets) => shanten(c, sets) === -1;

// the kinds that would complete a hand of 16 − 3·melds concealed tiles
export function waits(c, sets) {
  const w = [];
  for (let k = 0; k < KINDS; k++) {
    if (c[k] >= 4) continue;
    c[k]++;
    if (isWin(c, sets)) w.push(k);
    c[k]--;
  }
  return w;
}

// ---------------- 台數 ----------------
// seat: 0 東 1 南 2 西 3 北（門風）；正花：東 = 春梅、南 = 夏蘭、西 = 秋竹、北 = 冬菊
// w: { concealed: [kinds incl. the winning tile], melds: [{type:'chow'|'pung'|'kong', t, closed}], flowers: [kinds],
//      win: kind, self: 自摸?, seat, round: 圈風 0..3, last: 海底／河底, afterKong: 槓上開花, robKong: 搶槓,
//      first: 'heaven'|'earth'|'human'|null }
// returns { tai, items: [[名稱, 台]] } —— 莊家／連莊不在這裡（要看誰付錢，見 settle）
export function scoreHand(w) {
  const c = counts(w.concealed);
  const sets = 5 - w.melds.length;
  const decs = decompose(c, sets);
  if (!decs.length) return null;
  const open = w.melds.filter((m) => !m.closed);
  const menqing = open.length === 0;
  const all = [...w.concealed, ...w.melds.flatMap((m) => meldTiles(m))];
  const suits = new Set(all.map(suitOf));
  const hasHonor = suits.has(3);
  const numSuits = [...suits].filter((s) => s < 3);
  // 單一聽牌：拿掉胡的那張之後只聽一種
  const before = c.slice();
  before[w.win]--;
  const single = waits(before, sets).length === 1;

  let best = null;
  for (const d of decs) {
    const items = [];
    const add = (n, t) => items.push([n, t]);
    if (w.first === 'heaven') add('天胡', 24);
    else if (w.first === 'earth') add('地胡', 16);
    else if (w.first === 'human') add('人胡', 8);
    if (menqing && w.self) add('門清自摸', 3);
    else {
      if (w.self) add('自摸', 1);
      if (menqing) add('門清', 1);
    }
    if (open.length === 5 && !w.self) add('全求人', 2);
    if (w.last) add(w.self ? '海底撈月' : '河底撈魚', 1);
    if (w.afterKong) add('槓上開花', 1);
    if (w.robKong) add('搶槓', 1);
    if (single) add('獨聽', 1);
    // pungs: concealed ones are those in the hand, except one finished with somebody else's discard
    const pungs = [
      ...w.melds.filter((m) => m.type !== 'chow').map((m) => ({ t: m.t, closed: !!m.closed })),
      ...d.sets
        .filter((s) => s.type === 'pung')
        .map((s) => ({
          t: s.t,
          closed:
            w.self ||
            s.t !== w.win ||
            d.sets.some((o) => o.type === 'chow' && o.t <= w.win && w.win <= o.t + 2) ||
            d.pair === w.win,
        })),
    ];
    const chows =
      d.sets.filter((s) => s.type === 'chow').length +
      w.melds.filter((m) => m.type === 'chow').length;
    if (!chows) add('碰碰胡', 4);
    const an = pungs.filter((p) => p.closed).length;
    if (an >= 5) add('五暗刻', 8);
    else if (an === 4) add('四暗刻', 5);
    else if (an === 3) add('三暗刻', 2);
    // 平胡：全順子、沒字、沒花、不自摸、兩面聽
    if (
      pungs.length === 0 &&
      !hasHonor &&
      !w.flowers.length &&
      !w.self &&
      !single &&
      d.sets.some((s) => s.type === 'chow' && twoSided(s.t, w.win))
    )
      add('平胡', 2);
    if (!numSuits.length) add('字一色', 16);
    else if (numSuits.length === 1) add(hasHonor ? '混一色' : '清一色', hasHonor ? 4 : 8);
    // 三元
    const dr = [31, 32, 33].filter((k) => pungs.some((p) => p.t === k)).length;
    if (dr === 3) add('大三元', 8);
    else if (dr === 2 && d.pair >= 31) add('小三元', 4);
    else for (let i = 0; i < dr; i++) add('三元牌', 1);
    // 風
    const wd = [27, 28, 29, 30].filter((k) => pungs.some((p) => p.t === k)).length;
    if (wd === 4) add('大四喜', 16);
    else if (wd === 3 && d.pair >= 27 && d.pair <= 30) add('小四喜', 8);
    else {
      if (pungs.some((p) => p.t === 27 + w.round)) add('圈風', 1);
      if (pungs.some((p) => p.t === 27 + w.seat)) add('門風', 1);
    }
    // 花
    const fl = new Set(w.flowers);
    if (fl.size === 8) add('八仙過海', 8);
    else
      for (const g of [0, 4]) {
        const grp = [0, 1, 2, 3].map((i) => FLOWER0 + g + i);
        if (grp.every((f) => fl.has(f))) add(g ? '梅蘭竹菊' : '春夏秋冬', 2);
        else if (fl.has(FLOWER0 + g + w.seat)) add('正花', 1);
      }
    const tai = items.reduce((s, [, t]) => s + t, 0);
    if (!best || tai > best.tai) best = { tai, items };
  }
  return best;
}
function twoSided(t, win) {
  const n = t % 9;
  return (win === t && n <= 5) || (win === t + 2 && n >= 1);
}
export function meldTiles(m) {
  if (m.type === 'chow') return [m.t, m.t + 1, m.t + 2];
  return new Array(m.type === 'kong' ? 4 : 3).fill(m.t);
}

// ---------------- 結算 ----------------
// 每個付錢的人付 底 + 台 × 每台；莊家有關（莊家胡或莊家付錢）再加 1 台 + 連 N 拉 N（2N 台）
// r: { winner, from: 放槍的人（自摸 = null）, tai, dealer, streak }；回傳 4 家的輸贏
export function settle(r, base = 30, perTai = 10) {
  const d = [0, 0, 0, 0];
  const payers = r.from == null ? [0, 1, 2, 3].filter((s) => s !== r.winner) : [r.from];
  for (const p of payers) {
    const extra = r.winner === r.dealer || p === r.dealer ? 1 + 2 * (r.streak || 0) : 0;
    const amt = base + perTai * (r.tai + extra);
    d[p] -= amt;
    d[r.winner] += amt;
  }
  return d;
}
