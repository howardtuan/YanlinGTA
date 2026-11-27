// 義務役（照真實世界的日期，不是遊戲時鐘）：肉舖老闆 2026/11/6 入伍、2027/3/6 退伍；黃蓋瑞、霍華德 2026/11/30 入伍、2027/3/30 退伍；
// 吱吱、侯舌、理查 2026/12/18 入伍、2027/4/18 退伍（四個月）。退伍那天起就是平常的樣子。
// 服役期間：
//   - 真實世界的平日（週一到週五）穿迷彩軍服、戴迷彩鋼盔（跟 YeeMing 同一套，src/entities/npcs/Yeeming.js），
//     週末（週六、週日）放假，穿自己的便服；
//   - 名牌前面加上「義務役服役中」（平日、週末都是）。
// 退伍之後一切回到原本的樣子。
// 用法：每個會出現在校園裡的人物在建立時 serviceWear(id, ch, look, { tag, hide, onChange }) 登記一次，
// Game 每一幀呼叫 serviceTick(dt)，每 20 秒檢查一次日期，變了才換裝（src/entities/Character.js 的 restyle）、改名牌（relabel）。
// 測試用：網址加 ?date=2026-12-21（模擬那一天的日期，平日／週末照那天算）。
import { restyle } from '../Character.js';
import { relabel } from '../../world/MapBuilder.js';

// start: 入伍日（當天開始服役）；end: 退伍日（當天起不再服役）
export const SERVICE = {
  gd: { start: [2026, 11, 6], end: [2027, 3, 6] },
  garry: { start: [2026, 11, 30], end: [2027, 3, 30] },
  howard: { start: [2026, 11, 30], end: [2027, 3, 30] },
  zz: { start: [2026, 12, 18], end: [2027, 4, 18] },
  houshe: { start: [2026, 12, 18], end: [2027, 4, 18] },
  richard: { start: [2026, 12, 18], end: [2027, 4, 18] },
};
export const SERVICE_TAG = '義務役服役中';

// "now" for the service calendar: the real date, or ?date=YYYY-MM-DD while testing
function today() {
  const q =
    typeof location !== 'undefined' ? new URLSearchParams(location.search).get('date') : null;
  const m = q && /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q);
  if (m) {
    const d = new Date();
    d.setFullYear(+m[1], +m[2] - 1, +m[3]);
    return d;
  }
  return new Date();
}
// the service period, [入伍日 00:00, 退伍日 00:00) in local time
export function servicePeriod(id) {
  const s = SERVICE[id];
  if (!s) return null;
  const day = ([y, mo, d]) => new Date(y, mo - 1, d);
  return { from: day(s.start), to: day(s.end) };
}
// null: not serving (before or after); 'duty': a weekday in the service (uniform); 'leave': a weekend in the service (own clothes)
export function serviceState(id, now = today()) {
  const P = servicePeriod(id);
  if (!P || now < P.from || now >= P.to) return null;
  const wd = now.getDay();
  return wd === 0 || wd === 6 ? 'leave' : 'duty';
}
export const inService = (id, now) => !!serviceState(id, now);
// a name with the prefix while serving
export const serviceName = (id, name) => (inService(id) ? `${SERVICE_TAG} ${name}` : name);

// the army uniform over someone's own look: same face, hair, glasses and build; camouflage shirt and long trousers, boots, helmet
export function uniformLook(look) {
  return {
    ...look,
    shirt: '#56643a',
    shorts: '#56643a',
    pants: true,
    camo: true,
    helmet: 'camo',
    shoes: '#2a2620',
    jacket: undefined,
    polo: false,
    imTee: false,
    bag: undefined,
    hem: undefined,
  };
}

// a label with the prefix in front of the name, after a leading emoji ('📷 侯舌' → '📷 義務役服役中 侯舌')
const withTag = (t) => {
  const m = /^(\p{Extended_Pictographic}\S*\s)(.*)$/u.exec(t);
  return m ? `${m[1]}${SERVICE_TAG} ${m[2]}` : `${SERVICE_TAG} ${t}`;
};

// ---------------------------------------------------------------- the people being watched
const list = [];
let wait = 0;
// ch: the figure; look: their own clothes; tag: their name label (makeLabel) and its text without the prefix (tagText);
// hide: props to put away while in uniform (a hat, permed curls that would poke through the helmet, an aloha shirt…);
// onChange(state): after changing clothes (e.g. 黃蓋瑞 puts his running tee back on)
export function serviceWear(id, ch, look, { tag, tagText, hide = [], onChange } = {}) {
  if (!SERVICE[id] || !ch) return;
  const e = {
    id,
    ch,
    look,
    tag,
    tagText: tagText ?? tag?.userData.label?.text,
    hide,
    onChange,
    state: undefined,
  };
  list.push(e);
  apply(e);
}
function apply(e) {
  const st = serviceState(e.id);
  if (st === e.state) return;
  const was = e.state;
  e.state = st;
  const uni = st === 'duty';
  if (uni !== (was === 'duty')) {
    restyle(e.ch, uni ? uniformLook(e.look) : e.look);
    for (const h of typeof e.hide === 'function' ? e.hide() : e.hide) if (h) h.visible = !uni;
  }
  e.ch.uniform = uni;
  if (e.tag && e.tagText) relabel(e.tag, st ? withTag(e.tagText) : e.tagText);
  e.onChange?.(st);
}
// called every frame by Game; the date is looked at every 20 s (midnight: weekday ↔ weekend, the first and last day)
export function serviceTick(dt) {
  if ((wait -= dt) > 0) return;
  wait = 20;
  for (const e of list) apply(e);
}
