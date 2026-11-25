// 電腦打牌（動態強度 skill 0.15–1.0）：完全公平資訊（只看自己手牌與場上已公開的牌，不偷看牌牆或玩家手牌）。
// - 輕鬆（< 0.35）：邊聊天邊打，記牌較鬆、偶爾選次佳進張、防守率低
// - 普通（0.35–0.62）：精算向聽數與剩餘進張、基本現物／字牌避槍
// - 認真／全力（≥ 0.62）：加入筋牌／壁牌／副露染手警戒、一向聽兜牌、基本做牌傾向（清一色／混一色／碰碰胡／護門清）、挑最優吃法、不無腦加槓
// style: { attack 0–1 愛不愛吃碰, defense 0–1 多常防守, skill 0–1 或 () => number }，每個 NPC 個性不同（src/systems/mahjong/Mahjong.js）。
import { counts, shanten, suitOf } from './Rules.js';

export const SKILL_MIN = 0.15;
export const SKILL_MAX = 1.0;
export const SKILL_DEFAULT = 0.5;
// 各底台對應的基礎強度微調（30/10 休閒 → 300/100 豪賭認真打）
export const STAKE_SKILL = [-0.08, 0, 0.06, 0.14];
export const SKILL_TIERS = [
  { id: 0, label: '輕鬆', badge: '😌 輕鬆' },
  { id: 1, label: '普通', badge: '' },
  { id: 2, label: '認真', badge: '😤 認真' },
  { id: 3, label: '全力', badge: '🔥 全力' },
];

export const clampSkill = (v) =>
  Math.max(SKILL_MIN, Math.min(SKILL_MAX, Number.isFinite(v) ? v : SKILL_DEFAULT));

export function skillTier(skill) {
  const s = clampSkill(skill);
  if (s < 0.35) return SKILL_TIERS[0];
  if (s < 0.62) return SKILL_TIERS[1];
  if (s < 0.84) return SKILL_TIERS[2];
  return SKILL_TIERS[3];
}

export function effectiveSkill(baseSkill, { stake = 0, heat = 0 } = {}) {
  return clampSkill((baseSkill ?? SKILL_DEFAULT) + (STAKE_SKILL[stake] || 0) + (heat || 0));
}

// 每局結束後依玩家勝負雙向微調強度：連贏上升、連輸下降，流局或旁觀時熱度自然回落
export function adjustSkill(baseSkill, heat = 0, outcome = {}) {
  const cur = clampSkill(baseSkill);
  const h = Number.isFinite(heat) ? heat : 0;
  const {
    winner,
    from,
    self = false,
    tai = 0,
    delta = 0,
    draw = false,
    winStreak = 0,
    loseStreak = 0,
  } = outcome;
  if (!draw && winner === 0) {
    const step = Math.min(0.1, 0.06 + (self || tai >= 4 ? 0.02 : 0) + (winStreak >= 2 ? 0.02 : 0));
    const nextSkill = clampSkill(cur + step);
    const nextHeat = Math.min(0.18, Math.max(0, h) + 0.04);
    return { skill: +nextSkill.toFixed(3), heat: +nextHeat.toFixed(3) };
  }
  if (!draw && delta < 0) {
    const dealtIn = from === 0;
    const step = Math.min(
      0.1,
      (dealtIn ? 0.07 : 0.04) + (tai >= 4 ? 0.02 : 0) + (loseStreak >= 2 ? 0.02 : 0)
    );
    const nextSkill = clampSkill(cur - step);
    const nextHeat = Math.max(-0.18, Math.min(0, h) - (dealtIn ? 0.05 : 0.03));
    return { skill: +nextSkill.toFixed(3), heat: +nextHeat.toFixed(3) };
  }
  const nextHeat = Math.abs(h) < 0.01 ? 0 : +(h * 0.6).toFixed(3);
  return { skill: +cur.toFixed(3), heat: nextHeat };
}

function unseen(engine, seat, c, skill) {
  const v = engine.visible(seat);
  if (skill >= 0.35) return v.map((n) => Math.max(0, 4 - n));
  // 輕鬆模式：沒有仔細記別人打過幾張，部分把場上棄牌當沒看到
  const acc = Math.max(0, (skill - SKILL_MIN) / (0.35 - SKILL_MIN));
  return v.map((n, k) => {
    const exact = Math.max(0, 4 - n);
    const naive = Math.max(0, 4 - c[k]);
    return exact + (naive - exact) * (1 - acc);
  });
}

// how many tiles left in play would bring c (needing `sets` sets) closer to winning
function ukeire(c, sets, un, sh) {
  let n = 0;
  for (let k = 0; k < 34; k++) {
    if (un[k] <= 0 || c[k] >= 4) continue;
    c[k]++;
    if (shanten(c, sets) < sh) n += un[k];
    c[k]--;
  }
  return n;
}

// the best discard from counts c: { t, sh, uk, score }
export function bestDiscard(c, sets, un, danger, bonus) {
  let best = null;
  for (let k = 0; k < 34; k++) {
    if (!c[k]) continue;
    c[k]--;
    const sh = shanten(c, sets),
      uk = ukeire(c, sets, un, sh);
    c[k]++;
    const d = danger ? danger(k) : 0;
    const b = bonus ? bonus(k) : 0;
    const score = -sh * 1000 + uk - d - b;
    if (!best || score > best.score) best = { t: k, sh, uk, score };
  }
  return best;
}

// 偵測對手副露是否明顯在染某一門（清一色／混一色警戒）
function flushSuitOf(P) {
  if (P.melds.length < 2) return -1;
  let suit = -1;
  for (const m of P.melds) {
    if (m.closed) continue;
    const s = suitOf(m.t);
    if (s === 3) continue;
    if (suit === -1) suit = s;
    else if (suit !== s) return -1;
  }
  if (suit === -1) return -1;
  const sameDiscards = P.discards.filter((t) => t < 27 && suitOf(t) === suit).length;
  return sameDiscards <= 2 ? suit : -1;
}

function threats(engine, seat, pro) {
  return [0, 1, 2, 3].filter((s) => {
    if (s === seat) return false;
    const P = engine.players[s];
    if (P.melds.length >= 3 || engine.live < 24) return true;
    if (pro > 0.2 && P.melds.length >= 2 && (engine.live < 36 || flushSuitOf(P) >= 0)) return true;
    return false;
  });
}

// 0 = safe … 3+ = dangerous, against the seats that look close
function dangerFn(engine, seat, ths, pro = 0) {
  const v = engine.visible(seat);
  const flushOf = pro > 0 ? ths.map((s) => flushSuitOf(engine.players[s])) : null;
  return (k) => {
    let worst = 0;
    for (let idx = 0; idx < ths.length; idx++) {
      const s = ths[idx];
      const P = engine.players[s];
      if (P.discards.includes(k)) continue;
      let d;
      if (k >= 27) {
        if (pro > 0) d = v[k] >= 3 ? 0 : v[k] === 2 ? 0.7 : v[k] === 1 ? 1.8 : 2.3;
        else d = v[k] >= 3 ? 0 : v[k] === 2 ? 1 : 2;
      } else {
        const n = k % 9;
        d = n === 0 || n === 8 ? 2 : pro > 0 && (n === 1 || n === 7) ? 2.6 : 3;
        if (pro > 0) {
          const b = k - n;
          // 壁牌（斷張）：四張相鄰牌已全部現出，降低外側順子放槍風險
          if (n === 0 && v[b + 1] >= 4) d -= 1.1 * pro;
          else if (n === 0 && v[b + 2] >= 4) d -= 0.6 * pro;
          else if (n === 1 && v[b + 2] >= 4) d -= 0.8 * pro;
          else if (n === 8 && v[b + 7] >= 4) d -= 1.1 * pro;
          else if (n === 8 && v[b + 6] >= 4) d -= 0.6 * pro;
          else if (n === 7 && v[b + 6] >= 4) d -= 0.8 * pro;
          // 筋牌：對手打過 4/5/6 時，對應 1/2/8/9 兩面風險降低
          if (n <= 2 && P.discards.includes(k + 3)) d -= 0.7 * pro;
          else if (n >= 6 && P.discards.includes(k - 3)) d -= 0.7 * pro;
          else if (n >= 3 && n <= 5 && P.discards.includes(k - 3) && P.discards.includes(k + 3))
            d -= 0.8 * pro;
        }
      }
      if (pro > 0) {
        const fs = flushOf[idx];
        if (fs >= 0) {
          if (k < 27 && suitOf(k) === fs) d *= 1 + 0.65 * pro;
          else if (k >= 27) d *= 1 + 0.3 * pro;
          else d *= 1 - 0.35 * pro;
        }
      }
      worst = Math.max(worst, Math.max(0, d));
    }
    return worst;
  };
}

// 進階做牌價值傾向（高強度限定）：回傳「留下這張牌」的分數（越高越不想打掉）
function valueBonusFn(c, P, engine, seat, pro) {
  if (pro <= 0) return null;
  const seatW = 27 + engine.seatWind(seat);
  const roundW = 27 + engine.round;
  // 統計各花色張數（含副露），判斷是否走向清一色／混一色
  const sc = [0, 0, 0, 0];
  for (let k = 0; k < 34; k++) sc[suitOf(k)] += c[k];
  let meldSuit = -1,
    meldMixed = false,
    allPungs = true;
  for (const m of P.melds) {
    if (m.type === 'chow') allPungs = false;
    const s = suitOf(m.t);
    sc[s] += 3;
    if (s < 3) {
      if (meldSuit === -1) meldSuit = s;
      else if (meldSuit !== s) meldMixed = true;
    }
  }
  let domSuit = -1;
  if (!meldMixed) {
    for (let s = 0; s < 3; s++) {
      if (meldSuit !== -1 && meldSuit !== s) continue;
      if (sc[s] >= 9 && sc[s] + sc[3] >= 11) domSuit = s;
    }
  }
  let pairOrTrip = 0;
  for (let k = 0; k < 34; k++) if (c[k] >= 2) pairOrTrip++;
  const wantToitoi = allPungs && (P.melds.length >= 2 ? pairOrTrip >= 2 : pairOrTrip >= 5);

  return (k) => {
    let b = 0;
    // 役牌對子／刻子保護
    if (c[k] >= 2 && (k >= 31 || k === seatW || k === roundW)) b += 6 * pro;
    // 清一色／混一色方向
    if (domSuit >= 0) {
      const s = suitOf(k);
      if (s === domSuit) b += 6 * pro;
      else if (s === 3) b += (c[k] >= 2 ? 5 : 2) * pro;
      else b -= 5 * pro;
    }
    // 碰碰胡方向
    if (wantToitoi && c[k] >= 2) b += 4 * pro;
    return b;
  };
}

// 輕鬆模式專用：偶爾挑第 2～3 佳的牌（像跟室友邊聊天邊打沒算那麼細）
function pickRelaxedDiscard(c, sets, un, danger, skill, rng) {
  const list = [];
  for (let k = 0; k < 34; k++) {
    if (!c[k]) continue;
    c[k]--;
    const sh = shanten(c, sets),
      uk = ukeire(c, sets, un, sh);
    c[k]++;
    const d = danger ? danger(k) : 0;
    list.push({ t: k, sh, uk, score: -sh * 1000 + uk - d });
  }
  list.sort((a, b) => b.score - a.score);
  const best = list[0];
  const mistakeP = Math.max(0, (0.38 - skill) * 1.15);
  if (list.length > 1 && rng() < mistakeP) {
    const pool = list.slice(1, 4).filter((x) => (best.sh === 0 ? x.sh === 0 : x.sh <= best.sh + 1));
    if (pool.length) return pool[Math.floor(rng() * pool.length)];
  }
  return best;
}

export function makeAI(style = {}) {
  const attack = style.attack ?? 0.5,
    defense = style.defense ?? 0.5;
  const getSkill =
    typeof style.skill === 'function'
      ? () => clampSkill(style.skill())
      : () => clampSkill(style.skill ?? SKILL_DEFAULT);

  return (engine, seat, kind, options) => {
    const skill = getSkill();
    const pro = Math.max(0, Math.min(1, (skill - 0.55) / 0.45));
    const effDef = Math.min(0.95, Math.max(0.05, defense * (0.35 + skill * 0.95)));
    const effAtk = Math.min(0.95, Math.max(0.15, attack + (0.5 - skill) * 0.12));

    const P = engine.players[seat];
    const c = counts(P.hand);
    const sets = engine.sets(seat);
    const un = unseen(engine, seat, c, skill);

    if (kind === 'turn') {
      if (options.tsumo) return { type: 'tsumo' };
      const sh0 = shanten(c, sets);
      const ths = threats(engine, seat, pro);
      for (const k of options.kongs) {
        if (k.kind === 'added') {
          // 高強度：有人明顯逼近或尾盤時不隨便加槓（防被搶槓）
          if (pro > 0.2 && (ths.length > 0 || engine.live < 12)) continue;
          return { type: 'kong', t: k.t };
        }
        c[k.t] -= 4;
        const sh = shanten(c, sets - 1);
        const uk = pro > 0.2 && sh0 === 0 ? ukeire(c, sets - 1, un, sh) : 1;
        c[k.t] += 4;
        if (sh <= sh0 && uk > 0) return { type: 'kong', t: k.t };
      }

      let danger = null;
      if (ths.length) {
        const df = dangerFn(engine, seat, ths, pro);
        const urgent =
          pro > 0.2 &&
          ths.some(
            (s) =>
              engine.players[s].melds.length >= 3 ||
              engine.live < 16 ||
              flushSuitOf(engine.players[s]) >= 0
          );
        if (sh0 >= 2 && engine.rng() < effDef) {
          danger = (k) => df(k) * 3000; // safety first
        } else if (sh0 === 1 && urgent && engine.rng() < effDef * pro * 0.65) {
          danger = (k) => df(k) * 2600; // 高強度：一向聽遇到大牌／尾盤威脅也懂得兜牌
        } else {
          danger = (k) => df(k) * (4 + (urgent ? 14 : 6) * pro); // tie-break / 輕度避險
        }
      }

      if (skill < 0.35) {
        return {
          type: 'discard',
          t: pickRelaxedDiscard(c, sets, un, danger, skill, engine.rng).t,
        };
      }
      const bonus = valueBonusFn(c, P, engine, seat, pro);
      return { type: 'discard', t: bestDiscard(c, sets, un, danger, bonus).t };
    }

    // a claim on somebody's discard
    const hu = options.find((o) => o.type === 'hu');
    if (hu) return hu;
    const sh0 = shanten(c, sets);
    const bonus = valueBonusFn(c, P, engine, seat, pro);
    const after = (remove, extra) => {
      for (const x of remove) c[x]--;
      const b = bestDiscard(c, sets - 1, un, null, bonus);
      for (const x of remove) c[x]++;
      return extra ? b : (b?.sh ?? 99);
    };
    const kong = options.find((o) => o.type === 'kong');
    if (kong) {
      const ths = pro > 0.2 ? threats(engine, seat, pro) : [];
      if (!(pro > 0.3 && P.melds.length === 0 && sh0 <= 1) && !(pro > 0.4 && ths.length > 0)) {
        c[kong.t] -= 3;
        const sh = shanten(c, sets - 1);
        c[kong.t] += 3;
        if (sh <= sh0) return kong;
      }
    }
    const menqingKeep = pro > 0.25 && P.melds.length === 0 && sh0 <= 1;
    const pon = options.find((o) => o.type === 'pon');
    if (pon) {
      const t = pon.t;
      const valuable = t >= 31 || t === 27 + engine.seatWind(seat) || t === 27 + engine.round;
      if (valuable && engine.rng() < 0.4 + effAtk) return pon;
      const b = after([t, t], true);
      if (b && b.sh < sh0) {
        // 高強度門清一向聽時，非役牌且碰完沒聽牌就比較不亂破門清
        const prob = menqingKeep && b.sh > 0 ? effAtk * 0.45 : 0.3 + effAtk;
        if (engine.rng() < prob) return pon;
      }
    }
    const chis = options.filter((x) => x.type === 'chi');
    if (chis.length) {
      let bestChi = null;
      for (const o of chis) {
        const rm = [o.t, o.t + 1, o.t + 2].filter((x) => x !== engine.last.t);
        const b = after(rm, true);
        if (b && b.sh < sh0) {
          if (!bestChi || b.score > bestChi.b.score) bestChi = { o, b };
          if (skill < 0.35) break; // 輕鬆模式不細比多種吃法進張
        }
      }
      if (bestChi) {
        const prob = menqingKeep && bestChi.b.sh > 0 ? effAtk * 0.4 : effAtk;
        if (engine.rng() < prob) return bestChi.o;
      }
    }
    return { type: 'pass' };
  };
}
