// 電腦打牌（中等強度）：打出去之後離聽牌最近（向聽數最小）、能進的牌最多的那張；
// 有人看起來快胡了（亮了 3 組以上，或牌局後段），自己又還差很遠時，改打比較安全的牌（他打過的、字牌見過的）。
// 吃碰槓只在能更接近聽牌時才叫；三元牌、自己的風、圈風的對子一律碰；能胡就胡。
// style: { attack 0–1 愛不愛吃碰, defense 0–1 多常防守 }，每個 NPC 個性不同（src/systems/mahjong/Mahjong.js 的 STYLE）。
import { counts, shanten } from './Rules.js';

function unseen(engine, seat) {
  const v = engine.visible(seat);
  return v.map((n) => Math.max(0, 4 - n));
}

// how many tiles left in play would bring c (needing `sets` sets) closer to winning
function ukeire(c, sets, un, sh) {
  let n = 0;
  for (let k = 0; k < 34; k++) {
    if (!un[k] || c[k] >= 4) continue;
    c[k]++;
    if (shanten(c, sets) < sh) n += un[k];
    c[k]--;
  }
  return n;
}

// the best discard from counts c: { t, sh, uk }
export function bestDiscard(c, sets, un, danger) {
  let best = null;
  for (let k = 0; k < 34; k++) {
    if (!c[k]) continue;
    c[k]--;
    const sh = shanten(c, sets),
      uk = ukeire(c, sets, un, sh);
    c[k]++;
    const d = danger ? danger(k) : 0;
    const score = -sh * 1000 + uk - d;
    if (!best || score > best.score) best = { t: k, sh, uk, score };
  }
  return best;
}

function threats(engine, seat) {
  return [0, 1, 2, 3].filter(
    (s) => s !== seat && (engine.players[s].melds.length >= 3 || engine.live < 24)
  );
}

// 0 = safe … 3 = dangerous, against the seats that look close
function dangerFn(engine, seat, ths) {
  const v = engine.visible(seat);
  return (k) => {
    let worst = 0;
    for (const s of ths) {
      const P = engine.players[s];
      if (P.discards.includes(k)) continue;
      const d =
        k >= 27 ? (v[k] >= 3 ? 0 : v[k] === 2 ? 1 : 2) : [1, 9].includes((k % 9) + 1) ? 2 : 3;
      worst = Math.max(worst, d);
    }
    return worst;
  };
}

export function makeAI(style = {}) {
  const attack = style.attack ?? 0.5,
    defense = style.defense ?? 0.5;
  return (engine, seat, kind, options) => {
    const P = engine.players[seat];
    const c = counts(P.hand);
    const sets = engine.sets(seat);
    const un = unseen(engine, seat);
    if (kind === 'turn') {
      if (options.tsumo) return { type: 'tsumo' };
      const sh0 = shanten(c, sets);
      for (const k of options.kongs) {
        if (k.kind === 'added') return { type: 'kong', t: k.t };
        c[k.t] -= 4;
        const sh = shanten(c, sets - 1);
        c[k.t] += 4;
        if (sh <= sh0) return { type: 'kong', t: k.t };
      }
      const ths = threats(engine, seat);
      let danger = null;
      if (ths.length && sh0 >= 2 && engine.rng() < defense) {
        const df = dangerFn(engine, seat, ths);
        danger = (k) => df(k) * 3000; // safety first
      } else if (ths.length) {
        const df = dangerFn(engine, seat, ths);
        danger = (k) => df(k) * 4; // only as a tie-break
      }
      return { type: 'discard', t: bestDiscard(c, sets, un, danger).t };
    }
    // a claim on somebody's discard
    const hu = options.find((o) => o.type === 'hu');
    if (hu) return hu;
    const sh0 = shanten(c, sets);
    const after = (remove, extra) => {
      for (const x of remove) c[x]--;
      const b = bestDiscard(c, sets - 1, un);
      for (const x of remove) c[x]++;
      return extra ? b : (b?.sh ?? 99);
    };
    const kong = options.find((o) => o.type === 'kong');
    if (kong) {
      c[kong.t] -= 3;
      const sh = shanten(c, sets - 1);
      c[kong.t] += 3;
      if (sh <= sh0) return kong;
    }
    const pon = options.find((o) => o.type === 'pon');
    if (pon) {
      const t = pon.t;
      const valuable = t >= 31 || t === 27 + engine.seatWind(seat) || t === 27 + engine.round;
      if (valuable && engine.rng() < 0.4 + attack) return pon;
      if (after([t, t]) < sh0 && engine.rng() < 0.3 + attack) return pon;
    }
    for (const o of options.filter((x) => x.type === 'chi')) {
      const rm = [o.t, o.t + 1, o.t + 2].filter((x) => x !== engine.last.t);
      if (after(rm) < sh0 && engine.rng() < attack) return o;
    }
    return { type: 'pass' };
  };
}
