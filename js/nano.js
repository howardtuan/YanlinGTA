// Chrome 內建的 Gemini Nano（Prompt API，模型在本機執行，不連網、不需金鑰）。
// 只有 Google Chrome 會啟用；其他瀏覽器（或 Chrome 不支援/關閉時）訊息 App 照原本寫死的劇本走。
// API 有新舊兩版：新版是全域 LanguageModel，舊版是 window.ai.languageModel，兩者都支援。

const PERSONA = {
  team: '群組成員：柏宇（競選總幹事，務實、愛排行程）、芷瑄（美宣組，做海報，愛吐槽但很挺）、阿凱（熱血、負責發傳單、很愛吃）。三人會輪流回話。',
  xiaohan: '彥霖的直屬學妹，資管一甲，可愛、很崇拜學長，常問計概和程式作業，講話常用「學長～」開頭和哭哭臉。',
  azhe: '資管一乙學弟，愛打遊戲、講話很嗆很好笑，常約宵夜，偶爾耍廢。',
  boyu: '同班同學兼競選總幹事，務實可靠，負責排行程、計算票數，講話簡潔、愛列清單。',
  zhixuan: '同班同學、競選美宣組，負責海報和社群貼文，毒舌愛吐槽但其實很貼心。',
  guanting: '資管二甲學弟、系籃隊員，熱血運動咖，常約打球，講話很直、很多驚嘆號。',
  pinyan: '資管二乙學妹，認真讀書、常待圖書館，說話溫和有禮貌，會問系學會的事。',
  mom: '彥霖的媽媽，關心吃飯、睡覺、騎車安全和錢夠不夠用，長輩打字風格，愛用「！」和長輩表情，會叫他早點回家。',
  mcd: '麥當勞中原店店長，彥霖打工的主管，親切又專業，關心排班、出餐速度，偶爾稱讚他。',
};

const BASE = `你在一款校園遊戲的手機聊天 App 裡扮演角色，正在用通訊軟體和「彥霖」聊天。
彥霖是中原大學資訊管理學系的學生，正在競選資管系第34屆系學會會長（唯一一組，要過投票率門檻）。口號是「資管要贏，票投彥霖」，政見是系學會透明、課程回饋、系烤升級。他騎白色 SYM JET SL 機車（車牌 PYL0803），也在學校附近的麥當勞打工。
規則：
- 一律使用台灣繁體中文，台灣大學生的口語聊天語氣，不可以用簡體字。
- 每則訊息要短，像即時通訊一樣，15～40 個字，可以用 emoji。
- 不要說自己是 AI，不要跳出角色，不要談論遊戲本身。
- 輸出 JSON：replies 是你這次傳的 1～3 則訊息；options 是彥霖接下來可以回你的兩則訊息（以彥霖的口吻，語氣或方向不同，各 40 字內）。`;

const isChrome = () => {
  const brands = navigator.userAgentData?.brands;
  if (brands?.length) return brands.some(b => b.brand === 'Google Chrome');
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|Brave/.test(ua);
};
const api = () => globalThis.LanguageModel || globalThis.ai?.languageModel || null;
// language hints: newer Chrome versions may accept zh, older ones only en/ja/es — try in order
const LANG_OPTS = [
  { expectedInputs: [{ type: 'text', languages: ['zh'] }], expectedOutputs: [{ type: 'text', languages: ['zh'] }] },
  { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] },
  {},
];

function schema(group, members) {
  const who = group ? { type: 'string', enum: members } : { type: 'string' };
  return {
    type: 'object', required: ['replies', 'options'],
    properties: {
      replies: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', required: ['who', 'text'], properties: { who, text: { type: 'string' } } } },
      options: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } },
    },
  };
}
function parse(raw) {
  if (typeof raw !== 'string') return null;
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(raw.slice(a, b + 1)); } catch (e) { return null; }
}
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export const Nano = {
  // 'off' (not Chrome / no API) | 'checking' | 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'error'
  state: 'off', progress: 0, fails: 0, langOpt: null, listeners: new Set(),
  get on() { return this.state === 'available' && this.fails < 3; },
  get chrome() { return isChrome(); },
  label() {
    return {
      off: isChrome() ? '這版 Chrome 沒有開放內建 AI' : '非 Chrome 瀏覽器（使用劇本對話）',
      checking: '檢查中…', unavailable: '此裝置無法使用 Gemini Nano', downloadable: '可下載（開啟聊天時自動下載）',
      downloading: `下載模型中 ${Math.round(this.progress * 100)}%`, available: '已啟用 · 裝置端執行', error: '啟動失敗，改用劇本對話',
    }[this.state] || this.state;
  },
  _emit() { for (const f of this.listeners) try { f(this.state); } catch (e) { } },
  _set(s) { this.state = s; this._emit(); },
  async init() {
    if (!isChrome() || !api()) { this._set('off'); return; }
    this._set('checking');
    try {
      const A = api(); let av;
      if (A.availability) {
        // an unsupported language hint answers 'unavailable' (newer builds) or throws (older ones)
        for (const o of LANG_OPTS) {
          try { av = await A.availability(o); } catch (e) { continue; }
          this.langOpt = o; if (av !== 'unavailable') break;
        }
      } else if (A.capabilities) {
        const c = await A.capabilities(); av = { readily: 'available', 'after-download': 'downloadable', no: 'unavailable' }[c.available];
      }
      this._set(av === 'available' || av === 'downloadable' || av === 'downloading' ? av : 'unavailable');
      if (av === 'downloading') this.download(); // resume: no user gesture needed once it has started
    } catch (e) { this._set('unavailable'); }
  },
  // creating the first session downloads the model; Chrome wants a user gesture for that (a key press / click just before is enough)
  async download() {
    if (this.state !== 'downloadable' && this.state !== 'downloading') return;
    if (this._dl) return this._dl;
    this._set('downloading');
    const self = this;
    this._dl = this._create({ monitor(m) { m.addEventListener('downloadprogress', e => { self.progress = e.loaded > 1 ? e.loaded / (e.total || 1) : e.loaded; self._emit(); }); } })
      .then(s => { s.destroy?.(); this._set('available'); })
      .catch(() => { this._dl = null; this._set('downloadable'); });
    return this._dl;
  },
  async _create(extra = {}) {
    const A = api();
    const tries = this.langOpt ? [this.langOpt, ...LANG_OPTS.filter(o => o !== this.langOpt)] : LANG_OPTS;
    let err;
    for (const o of tries) {
      try { const s = await A.create({ ...o, ...extra }); this.langOpt = o; return s; } catch (e) { err = e; if (e?.name === 'NotAllowedError') throw e; }
    }
    throw err;
  },
  // one session per conversation, seeded with the persona and the chat so far
  async sessionFor(st) {
    if (st.session) return st.session;
    const C = st.c;
    const members = C.group ? C.sub.split('、').filter(n => n !== '你') : [C.name];
    const log = st.msgs.filter(m => m.text).slice(-24).map(m => `${m.who === 'me' ? '彥霖' : C.group ? m.who : C.name}：${m.text}`).join('\n');
    const sys = `${BASE}\n\n你扮演：${C.group ? `群組「${C.name}」裡的其他成員` : `「${C.name}」（${C.sub || '家人'}）`}。\n${PERSONA[C.id] || ''}\n` +
      (C.group ? `replies 每則的 who 要填發言人名字（${members.join('、')}之一）。` : `replies 每則的 who 填「${C.name}」。`) +
      `\n\n目前為止的聊天紀錄：\n${log || '（還沒聊過）'}`;
    st.members = members;
    st.session = this._create({ initialPrompts: [{ role: 'system', content: sys }] }).catch(e => { st.session = null; throw e; });
    return st.session;
  },
  // ask the model for the contact's replies to `text` (null = suggest two ways to start a new topic)
  async reply(st, text) {
    const s = await this.sessionFor(st);
    const C = st.c, members = st.members;
    const q = text == null
      ? '（彥霖打開了聊天室還沒說話。replies 請給一則你主動開啟的新話題訊息，options 給彥霖兩種回法。只輸出 JSON。）'
      : `彥霖傳來：「${text}」\n請以角色身分回覆，只輸出 JSON。`;
    const sch = schema(C.group, members);
    let raw;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 60000));
    try { raw = await Promise.race([s.prompt(q, { responseConstraint: sch }), timeout]); }
    catch (e) { if (e?.message === 'timeout') throw e; raw = await Promise.race([s.prompt(q), timeout]); } // older builds without responseConstraint
    const out = parse(raw);
    if (!out || !Array.isArray(out.replies) || !out.replies.length) { this.fails++; throw new Error('bad output'); }
    this.fails = 0;
    const replies = out.replies.slice(0, 3).map(r => {
      const t = clip(typeof r === 'string' ? r : r.text, 80);
      let who = C.group ? (members.includes(r.who) ? r.who : members[Math.floor(Math.random() * members.length)]) : C.id;
      return { who, text: t };
    }).filter(r => r.text);
    const opts = (Array.isArray(out.options) ? out.options : []).map(o => clip(o, 60)).filter(Boolean).slice(0, 2);
    return { replies, options: opts };
  },
};
