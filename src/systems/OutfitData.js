// 衣櫃的服裝資料（純資料，不碰 three.js，存檔、多人麻將同步、單元測試都用這裡）。
// 造型 look 的欄位（舊存檔只有前四個，照樣讀得進來）：
//   shirt  上衣顏色（#rrggbb）      shorts 褲子顏色      pants  true = 長褲、false = 短褲
//   top    上衣款式：null 素 T、'polo' 系學會幹部T、'im' 資管系服、'volley' 排球 T
//   long   長袖                    hat    帽子 id（HATS），null = 不戴
//   set    套裝 id（SETS）：穿套裝時上衣、褲子、帽子都由套裝決定；換任何單件就會脫下套裝，回到原本的單件
// 穿上身的模型由 src/systems/Outfits.js 依這份資料組出來。

export const DEFAULT_LOOK = Object.freeze({
  shirt: '#121212',
  shorts: '#f3f2ec',
  pants: false,
  top: null,
  long: false,
  hat: null,
  set: null,
});

// 上衣：unlock 是解鎖條件（拿到才會出現在衣櫃；別人的造型照樣看得到）
export const TOPS = [
  { name: '黑色素 T', shirt: '#121212', tag: '預設' },
  { name: '白色素 T', shirt: '#f4f4f0' },
  // 資管系服：深綠短袖，左胸幾何線條獅子頭，背後 Information Management 程式碼印花（Since.1988）
  { name: '資管系服', shirt: '#4a5131', tag: '深綠', top: 'im' },
  { name: '霧藍 T', shirt: '#6b7f99' },
  { name: '海軍藍 T', shirt: '#2f3e5c' },
  { name: '卡其襯衫', shirt: '#d8c9a8' },
  { name: '灰色帽 T', shirt: '#5b5d63' },
  { name: '森林綠 T', shirt: '#2f5d46' },
  { name: '酒紅 T', shirt: '#7a1f2b' },
  { name: '芥末黃 T', shirt: '#d4a93a' },
  { name: '黑色長袖', shirt: '#1a1a1c', tag: '長袖', long: true },
  { name: '白色長袖', shirt: '#ecebe6', tag: '長袖', long: true },
  { name: '系學會幹部T', shirt: '#1d2340', tag: 'Polo', top: 'polo' }, // 深藍 polo，左胸白色獅子（34TH、CYIMSA）
  // 胸前 CYCU VOLLEYBALL、背後「中原排球」7 號；幫吱吱洗完 10 次殘廢澡才有（src/systems/quests/ZzInjury.js）
  { name: '排球 T', shirt: '#c8102e', tag: '吱吱送的', top: 'volley', unlock: 'volleyTee' },
];

export const BOTTOMS = [
  { name: '白色短褲', shorts: '#f3f2ec', pants: false, tag: '預設' },
  { name: '卡其短褲', shorts: '#c9b48a', pants: false },
  { name: '黑色短褲', shorts: '#202022', pants: false },
  { name: '牛仔長褲', shorts: '#3d5a80', pants: true },
  { name: '黑色長褲', shorts: '#1c1c1e', pants: true },
  { name: '灰色運動褲', shorts: '#7c7f86', pants: true },
  { name: '軍綠工作褲', shorts: '#4f5536', pants: true },
  { name: '深藍西裝褲', shorts: '#1b2233', pants: true },
];

// 帽子：kind 決定形狀（src/systems/Outfits.js），color 是帽子本體的顏色
export const HATS = [
  { id: 'capBlack', name: '黑色棒球帽', kind: 'cap', color: '#18181b' },
  { id: 'capRed', name: '紅色棒球帽', kind: 'cap', color: '#b3202a' },
  { id: 'capWhite', name: '白色棒球帽', kind: 'cap', color: '#eeede8' },
  { id: 'bucket', name: '卡其漁夫帽', kind: 'bucket', color: '#c9b48a' },
  { id: 'beanie', name: '海軍藍毛帽', kind: 'beanie', color: '#2f3e5c' },
];

// 套裝：整套換上（上衣、褲子、帽子與配件一起）。航空公司一律是遊戲裡的「彥霖航空」，不放真實航空公司的名稱或標誌
export const SETS = [
  {
    id: 'mc',
    name: '麥當勞制服',
    tag: '內場同款',
    shirt: '#6a6d72', // = CREW_SHIRT（src/systems/minigames/McUniform.js）
    shorts: '#17171a',
    pants: true,
    shoes: '#141414',
  },
  {
    id: 'pilot',
    name: '彥霖航空 機長',
    tag: '四條槓',
    shirt: '#f4f5f7',
    shorts: '#1b2233',
    pants: true,
    shoes: '#111111',
  },
  {
    id: 'cabin',
    name: '彥霖航空 空服員',
    tag: '墨綠制服',
    shirt: '#1f4d3a',
    shorts: '#1a2b22',
    pants: true,
    long: true,
    shoes: '#111111',
  },
  // ---- 同學穿搭（衣櫃的「同學穿搭」區）：照各 NPC 的外觀設定（src/entities/npcs/*.js 的 *_LOOK），只借衣服、鞋子和帽子，
  // 臉、髮型、身材還是彥霖。friend 是好友 id（src/ui/phone/Friends.js 的 FRIENDS）：加了好友才穿得到他的衣服。extra 是 createCharacter 的服裝參數（皮衣、迷彩、水洗寬褲…），hat 是帽子（形狀＋顏色）
  {
    id: 'fZz',
    group: 'friend',
    friend: 'zz',
    name: '吱吱',
    tag: '排球少年',
    shirt: '#7a1f2c',
    shorts: '#161616',
    pants: false,
    shoes: '#1d1d1d',
  },
  {
    id: 'fHoushe',
    group: 'friend',
    friend: 'houshe',
    name: '侯舌',
    tag: '276',
    shirt: '#141416',
    shorts: '#4a4d52',
    pants: true,
    shoes: '#f2f0ec',
  },
  {
    id: 'fJianyu',
    group: 'friend',
    friend: 'jianyu',
    name: '劍玉',
    tag: '灰藍牛仔襯衫',
    shirt: '#5d6b8a',
    shorts: '#2c2f36',
    pants: true,
    shoes: '#f2f2ee',
  },
  {
    id: 'fPinhan',
    group: 'friend',
    friend: 'pinhan',
    name: '品漢堡',
    tag: '278',
    shirt: '#2b2e35',
    shorts: '#3a3f4a',
    pants: true,
    shoes: '#ededea',
  },
  {
    id: 'fRuizhe',
    group: 'friend',
    friend: 'ruizhe',
    name: '瑞哲',
    tag: '水洗 oversize',
    shirt: '#2f2f31',
    shorts: '#1b1b1e',
    pants: true,
    shoes: '#1d1d1f',
    extra: { wash: true, longTee: true, pantsLow: '#6a6c70', wide: true, sole: '#2b2b2d' },
  },
  {
    id: 'fHank',
    group: 'friend',
    friend: 'hank',
    name: '漢克',
    tag: '樂團吉他手',
    shirt: '#202124',
    shorts: '#33445e',
    pants: true,
    shoes: '#ececec',
  },
  {
    id: 'fHoward',
    group: 'friend',
    friend: 'howard',
    name: '霍華德',
    tag: '粉色上衣',
    shirt: '#f0a9bc',
    shorts: '#e9e4da',
    pants: true,
    shoes: '#f4f4f1',
  },
  {
    id: 'fRichard',
    group: 'friend',
    friend: 'richard',
    name: '理查',
    tag: '深綠漁夫帽',
    shirt: '#f1f0ec',
    shorts: '#2d3138',
    pants: true,
    shoes: '#1c1c1e',
    hat: { kind: 'bucket', color: '#2f4a32' },
  },
  {
    id: 'fGd',
    group: 'friend',
    friend: 'gd',
    name: '女拳大帝',
    tag: '皮衣',
    shirt: '#242424',
    shorts: '#1d1e24',
    pants: true,
    shoes: '#141414',
    extra: { jacket: '#121212' },
  },
  {
    id: 'fYeeming',
    group: 'friend',
    friend: 'yeeming',
    name: 'YeeMing',
    tag: '迷彩軍服',
    shirt: '#56643a',
    shorts: '#56643a',
    pants: true,
    shoes: '#2a2620',
    extra: { camo: true, helmet: 'camo' },
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
const TOP_STYLES = new Set(['polo', 'im', 'volley']);
const HAT_IDS = new Set(HATS.map((h) => h.id));
const SET_IDS = new Set(SETS.map((s) => s.id));
export const hatById = (id) => HATS.find((h) => h.id === id) || null;
export const setById = (id) => SETS.find((s) => s.id === id) || null;

// 任何來源的造型（舊存檔、別的玩家傳來的、壞掉的資料）整理成合法的 look；認不得的欄位一律退回預設
export function normalizeLook(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    shirt: HEX.test(r.shirt) ? r.shirt.toLowerCase() : DEFAULT_LOOK.shirt,
    shorts: HEX.test(r.shorts) ? r.shorts.toLowerCase() : DEFAULT_LOOK.shorts,
    pants: r.pants === true,
    top: TOP_STYLES.has(r.top) ? r.top : null,
    long: r.long === true,
    hat: HAT_IDS.has(r.hat) ? r.hat : null,
    set: SET_IDS.has(r.set) ? r.set : null,
  };
}

// 實際穿在身上的是什麼（套裝蓋過單件）：createCharacter 的參數＋要加的配件
export function wornParts(look) {
  const L = normalizeLook(look);
  const S = setById(L.set);
  if (S)
    return {
      shirt: S.shirt,
      shorts: S.shorts,
      pants: !!S.pants,
      top: null,
      long: !!S.long,
      shoes: S.shoes || null,
      hat: null,
      setHat: S.hat || null,
      extra: S.extra || null,
      set: S.id,
    };
  return {
    shirt: L.shirt,
    shorts: L.shorts,
    pants: L.pants,
    top: L.top,
    long: L.long,
    shoes: null,
    hat: L.hat,
    setHat: null,
    extra: null,
    set: null,
  };
}

// createCharacter() 的服裝參數（臉、髮型等由 YANLIN_LOOK 決定）
export function characterOpts(look) {
  const W = wornParts(look);
  const o = {
    shirt: W.shirt,
    shorts: W.shorts,
    pants: W.pants,
    polo: W.top === 'polo',
    imTee: W.top === 'im',
    volleyTee: W.top === 'volley',
    longSleeve: W.long,
    plain: !!W.set, // 套裝不印彥霖胸前的小臉 logo
  };
  if (W.shoes) o.shoes = W.shoes;
  if (W.extra) Object.assign(o, W.extra);
  return o;
}

// 衣櫃裡點一件：套裝直接換上；單件（上衣、褲子、帽子）會脫下套裝、保留其他單件
// 這套衣服現在能不能穿：同學穿搭要先加那位同學好友（friends: 已加好友的 id 集合）
export function canWear(item, friends) {
  return !item?.friend || !!friends?.has?.(item.friend);
}

export function pickItem(look, kind, item) {
  const L = normalizeLook(look);
  if (kind === 'set') return { ...L, set: item?.id || null };
  if (kind === 'top')
    return {
      ...L,
      set: null,
      shirt: item.shirt,
      top: item.top || null,
      long: !!item.long,
    };
  if (kind === 'bottom') return { ...L, set: null, shorts: item.shorts, pants: !!item.pants };
  if (kind === 'hat') return { ...L, set: null, hat: item?.id || null };
  return L;
}
