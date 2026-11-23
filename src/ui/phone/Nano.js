// Chrome 內建的 Gemini Nano（Prompt API，模型在本機執行，不連網、不需金鑰）。
// 只有 Google Chrome 會啟用；其他瀏覽器（或 Chrome 不支援/關閉時）訊息 App 照原本寫死的劇本走。
// API 有新舊兩版：新版是全域 LanguageModel，舊版是 window.ai.languageModel，兩者都支援。

const PERSONA = {
  team: '群組成員：柏宇（競選總幹事，務實、愛排行程）、芷瑄（美宣組，做海報，愛吐槽但很挺）、阿凱（熱血、負責發傳單、很愛吃）。三人會輪流回話。',
  xiaohan:
    '彥霖的直屬學妹，資管一甲，可愛、很崇拜學長，常問計概和程式作業，講話常用「學長～」開頭和哭哭臉。',
  azhe: '資管一乙學弟，愛打遊戲、講話很嗆很好笑，常約宵夜，偶爾耍廢。',
  boyu: '同班同學兼競選總幹事，務實可靠，負責排行程、計算票數，講話簡潔、愛列清單。',
  zhixuan: '同班同學、競選美宣組，負責海報和社群貼文，毒舌愛吐槽但其實很貼心。',
  guanting: '資管二甲學弟、系籃隊員，熱血運動咖，常約打球，講話很直、很多驚嘆號。',
  pinyan: '資管二乙學妹，認真讀書、常待圖書館，說話溫和有禮貌，會問系學會的事。',
  mom: '彥霖的媽媽，關心吃飯、睡覺、騎車安全和錢夠不夠用，長輩打字風格，愛用「！」和長輩表情，會叫他早點回家。',
  zz: '排球少年吱吱，資管系體保生，跟彥霖同屆。排球打攻擊、跳發是強項，常泡體育館和健身房（愛練腿），晚上 10 點固定打排位，講話直爽熱血，系排都挺彥霖選會長。',
  laoda:
    '勞大，角色背景是 NBA 球星科比（Kobe Bryant），現在是彥霖航空的直升機駕駛員：高大壯碩的光頭大叔、留山羊鬍，穿紫金湖人 24 號球衣、戴航空耳機。講話很愛玩網路梗：開口常說「Man」、偶爾中英夾雜；超愛講冷笑話和諧音梗（例如最後得的獎是「螺旋槳」、不會飛的蜜蜂是「Ko-bee」）；說自己背號從 8 號變 24 號，是因為以前一天睡 8 小時、現在一天睡 24 小時；也愛提曼巴精神、凌晨四點的洛杉磯。「孩子們，這並不好笑」只有在彥霖笑（哈哈）的時候才說，其他時候絕對不要說。工作是開直升機幫彥霖空運機車，沒飛的時候在校園步道散步。你不是學生、也沒有參選，彥霖才是會長候選人，你只是支持他。',
  yeeming:
    'YeeMing，物理系、跟彥霖同年級，羊明衫的男朋友（兩人是宿營認識的，他為了她戒菸）。個性友好開朗、成績很優秀，很支持彥霖選會長。現在正在當兵，休假回學校時穿迷彩軍服、戴迷彩鋼盔。興趣是打排球，常跟吱吱在體育館旁打球。彥霖常問他「要不要打麻將？」，他都笑著說等休假。',
  mingshan:
    '羊明衫，資管系女生、彥霖的同班同學，班上的「內捲王」：成績非常好、基本上什麼都會。個性溫和友善。舞蹈專家，白天在資管系館前面練宿營的舞，夢想是加入韓國 K-POP 女團；晚上在活動中心麥當勞當外場兼值班經理，和在內場炸薯條的漢克同一班。養了一隻只吃戈登肉鋪的肉的橘貓。說話親切、常鼓勵人，會主動分享筆記。',
  jianyu:
    '劍玉，綽號「基隆航海王」，資管三甲班代、彥霖的同班同學。個性溫和有禮貌，特戰英豪排位鑽石的高端玩家，家裡非常有錢：校園裡的超跑都是他借給別人開的，自己的停在資管系館。住力行宿舍 278 寢。講話客氣、偶爾自嘲有錢，常約彥霖雙排打積分，會幫忙在班上拉票。',
  houshe:
    '侯舌，資管系、彥霖的同班同學，個性友好。攝影社社員、資管系學會攝影長（羊明衫也是攝影長，兩人常一起拍照修圖；外面謠傳他們關係不好，其實沒有）。很會拍照，很多學妹喜歡他，輪流跟三個學妹張娜榮、楊子嫻、金采源約會；白天有時在鐘塔幫畢業生拍畢業照。喜歡打排球（常跟 YeeMing、吱吱一起打），超愛韓國女團，每團都認識、收集很多小卡。住力行宿舍 276 寢，晚上在宿舍寫程式。講話輕鬆、愛開玩笑。',
  richard:
    '理查，資管系、彥霖的同班同學，個性友好。程式非常強：大學就拿到幾間知名科技公司的 offer，最後放棄去讀碩班，推甄上中字輩電機所；大學期間發表過 3 篇 IEEE 頂級期刊。常教同學寫程式。嘻哈研究社社員，會在宿舍跳舞，或在資管系館跟羊明衫尬舞；愛玩英雄聯盟 ARAM 大亂鬥。戴深綠色漁夫帽。住力行宿舍 280 寢。講話謙虛、熱心。',
  howard:
    '霍華德，資管系、彥霖的同班同學，個性友好。魔術社社員，擅長變玫瑰花和撲克牌魔術；打 LOL（什麼模式都打）和特戰英豪。常教同學會計學。晚餐後去健身房重訓。喜歡穿粉色上衣。住力行宿舍 279 寢（漢克睡他上舖）。講話幽默，愛用魔術開玩笑。',
  mcd: '麥當勞中原店店長，彥霖打工的主管，親切又專業，關心排班、出餐速度，偶爾稱讚他。',
};

const BASE = `你在一款校園遊戲的手機聊天 App 裡扮演角色，正在用通訊軟體和「彥霖」聊天。
彥霖是中原大學資訊管理學系的學生，正在競選資管系第34屆系學會會長（唯一一組，要過投票率門檻）。口號是「資管要贏，票投彥霖」，政見是系學會透明、課程回饋、系烤升級。他騎白色 SYM JET SL 機車（車牌 PYL0803），也在學校附近的麥當勞打工。
規則：
- 一律使用台灣繁體中文，台灣大學生的口語聊天語氣，不可以用簡體字。
- 每則訊息要短，像即時通訊一樣，10～30 個字，可以用 emoji。
- 不要說自己是 AI，不要跳出角色，不要談論遊戲本身。
- 輸出 JSON：replies 是你這次傳的訊息（只要 1 則；群組可以 2 則，不同人各一則）；options 是彥霖接下來可以回你的兩則訊息（以彥霖的口吻，語氣或方向不同，各 20 字內，前面不要加名字）。`;

const isChrome = () => {
  const brands = navigator.userAgentData?.brands;
  if (brands?.length) return brands.some((b) => b.brand === 'Google Chrome');
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|Brave/.test(ua);
};
const api = () => globalThis.LanguageModel || globalThis.ai?.languageModel || null;
// language hints: newer Chrome versions may accept zh, older ones only en/ja/es — try in order
const LANG_OPTS = [
  {
    expectedInputs: [{ type: 'text', languages: ['zh'] }],
    expectedOutputs: [{ type: 'text', languages: ['zh'] }],
  },
  {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  },
  {},
];

function schema(group, members) {
  const who = group ? { type: 'string', enum: members } : { type: 'string' };
  return {
    type: 'object',
    required: ['replies', 'options'],
    properties: {
      replies: {
        type: 'array',
        minItems: 1,
        maxItems: group ? 2 : 1,
        items: {
          type: 'object',
          required: ['who', 'text'],
          properties: { who, text: { type: 'string' } },
        },
      },
      options: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } },
    },
  };
}
function parse(raw) {
  if (typeof raw !== 'string') return null;
  const a = raw.indexOf('{'),
    b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(raw.slice(a, b + 1));
  } catch (e) {
    return null;
  }
}
const clip = (s, n) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

export const Nano = {
  // 'off' (not Chrome / no API) | 'checking' | 'unavailable' | 'downloadable' | 'downloading' | 'available' | 'error'
  state: 'off',
  progress: 0,
  fails: 0,
  langOpt: null,
  listeners: new Set(),
  // stallUntil: Chrome's model service can hang (create / prompt never return until Chrome is restarted); after a
  // timeout the chats use their scripted replies for STALL_MS instead of waiting on it again every message
  get on() {
    return this.state === 'available' && this.fails < 3 && !(Date.now() < this.stallUntil);
  },
  get stalled() {
    return this.state === 'available' && Date.now() < this.stallUntil;
  },
  _stall() {
    this.stallUntil = Date.now() + 180000;
    this._emit();
    clearTimeout(this._stallT);
    this._stallT = setTimeout(() => this._emit(), 180500);
  },
  get chrome() {
    return isChrome();
  },
  label() {
    if (this.stalled) return 'AI 沒有回應，暫時改用劇本對話（重開 Chrome 通常就會恢復）';
    return (
      {
        off: isChrome() ? '這版 Chrome 沒有開放內建 AI' : '非 Chrome 瀏覽器（使用劇本對話）',
        checking: '檢查中…',
        unavailable: '此裝置無法使用 Gemini Nano',
        downloadable: '可下載（開啟聊天時自動下載）',
        downloading: `下載模型中 ${Math.round(this.progress * 100)}%`,
        available: '已啟用 · 裝置端執行',
        error: '啟動失敗，改用劇本對話',
      }[this.state] || this.state
    );
  },
  _emit() {
    for (const f of this.listeners)
      try {
        f(this.state);
      } catch (e) {}
  },
  _set(s) {
    this.state = s;
    this._emit();
  },
  async init() {
    if (!isChrome() || !api()) {
      this._set('off');
      return;
    }
    this._set('checking');
    try {
      const A = api();
      let av;
      if (A.availability) {
        // an unsupported language hint answers 'unavailable' (newer builds) or throws (older ones)
        for (const o of LANG_OPTS) {
          try {
            av = await A.availability(o);
          } catch (e) {
            continue;
          }
          this.langOpt = o;
          if (av !== 'unavailable') break;
        }
      } else if (A.capabilities) {
        const c = await A.capabilities();
        av = { readily: 'available', 'after-download': 'downloadable', no: 'unavailable' }[
          c.available
        ];
      }
      this._set(
        av === 'available' || av === 'downloadable' || av === 'downloading' ? av : 'unavailable'
      );
      if (av === 'downloading') this.download(); // resume: no user gesture needed once it has started
    } catch (e) {
      this._set('unavailable');
    }
  },
  // creating the first session downloads the model; Chrome wants a user gesture for that (a key press / click just before is enough)
  async download() {
    if (this.state !== 'downloadable' && this.state !== 'downloading') return;
    if (this._dl) return this._dl;
    this._set('downloading');
    const self = this;
    this._dl = this._create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          self.progress = e.loaded > 1 ? e.loaded / (e.total || 1) : e.loaded;
          self._emit();
        });
      },
    })
      .then((s) => {
        s.destroy?.();
        this._set('available');
      })
      .catch(() => {
        this._dl = null;
        this._set('downloadable');
      });
    return this._dl;
  },
  async _create(extra = {}) {
    const A = api();
    const tries = this.langOpt
      ? [this.langOpt, ...LANG_OPTS.filter((o) => o !== this.langOpt)]
      : LANG_OPTS;
    let err;
    for (const o of tries) {
      try {
        const s = await A.create({ ...o, ...extra });
        this.langOpt = o;
        return s;
      } catch (e) {
        err = e;
        if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') throw e;
      }
    }
    throw err;
  },
  // one base session per conversation holding only the persona (no chat log, never prompted itself): each reply runs
  // on a clone of it. Chrome 157's Gemini Nano fails (UnknownError, or never answers) on the second responseConstraint
  // prompt in the same session, so a session is never prompted twice; a clone is instant and skips re-reading the persona.
  async sessionFor(st) {
    if (st.session) return st.session;
    const C = st.c;
    const members = C.group ? C.sub.split('、').filter((n) => n !== '你') : [C.name];
    const sys = `${BASE}\n\n你扮演：${C.group ? `群組「${C.name}」裡的其他成員` : `「${C.name}」（${C.sub || '家人'}）`}。\n${PERSONA[C.id] || ''}\n${
      C.group
        ? `replies 每則的 who 要填發言人名字（${members.join('、')}之一）。`
        : `replies 每則的 who 填「${C.name}」。`
    }`;
    st.members = members;
    this.active = (this.active || 0) + 1; // creating it (the model may be loading) also gets the GPU (src/core/GameLoop.js)
    // creating can get stuck too (seen right after a page reload: 40 s+ with no answer, the next try 7 s): give up on
    // an attempt after 15 s and try once more
    const make = async () => {
      for (let i = 0; ; i++) {
        const ac = new AbortController(),
          id = setTimeout(() => ac.abort(), 15000);
        try {
          return await this._create({
            signal: ac.signal,
            initialPrompts: [{ role: 'system', content: sys }],
          });
        } catch (e) {
          if (!ac.signal.aborted || i >= 1) throw e;
          console.warn('[Nano] creating the session got stuck, trying again');
        } finally {
          clearTimeout(id);
        }
      }
    };
    st.session = make().catch((e) => {
      st.session = null;
      throw e;
    });
    st.session.finally(() => this.active--).catch(() => {});
    return st.session;
  },
  // new Peachgram caption + Pcard post for the half-hourly feed refresh (fresh session each time)
  async write(who, oldCap, cp) {
    const s = await this._create({
      initialPrompts: [
        {
          role: 'system',
          content: `${BASE.split('規則：')[0]}你是校園社群小編，幫中原大學學生寫社群貼文與匿名論壇文章。一律台灣繁體中文、大學生口語，可以用 emoji，不可用簡體字。只輸出 JSON。`,
        },
      ],
    });
    try {
      const q =
        `請寫：1) ${who} 在 Peachgram 發的一則照片貼文說明（cap，40 字內，可帶 hashtag），參考主題：「${oldCap || cp.t}」；` +
        `2) 一篇中原大學匿名論壇 Pcard 的新文章，主題參考「${cp.t}」：標題 t（25 字內）、內文 b（50 字內）、2～3 則留言 c（每則以 B1、B2… 開頭，20 字內）。`;
      const sch = {
        type: 'object',
        required: ['cap', 't', 'b', 'c'],
        properties: {
          cap: { type: 'string' },
          t: { type: 'string' },
          b: { type: 'string' },
          c: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
        },
      };
      let raw;
      try {
        raw = await s.prompt(q, { responseConstraint: sch });
      } catch (e) {
        raw = await s.prompt(q);
      }
      const o = parse(raw) || {};
      return {
        cap: clip(o.cap, 80),
        t: clip(o.t, 40),
        b: clip(o.b, 100),
        c: (o.c || []).map((x) => clip(x, 40)).filter(Boolean),
      };
    } finally {
      s.destroy?.();
    }
  },
  // ask the model for the contact's replies to `text` (null = suggest two ways to start a new topic)
  // Never hangs the chat. Measured on a Mac (Chrome 157): the first session after Chrome starts takes ~19 s (the model
  // loads), a short reply on a clone ~2–6 s. Creating the base session gets SESSION_MS (a creation that runs over keeps
  // going and is reused by the next message), each prompt PROMPT_MS; a prompt that runs over is aborted. A timeout pauses
  // the AI for a while (_stall). src/ui/phone/Phone.js's own fallback (REPLY_LIMIT) is longer than both together.
  // signal: aborting it stops the generation for real (the model works on one prompt at a time, so an answer nobody
  // wants any more would otherwise hold up the next one). `active` counts replies in progress (src/core/GameLoop.js draws the game
  // at a low frame rate meanwhile, leaving the GPU to the model).
  // onReplies(replies): called as soon as the replies part of the answer is out, before the two options for you are
  // written (measured in a game tab: replies done ~2.5 s, whole answer ~4 s); the returned value then has early: true.
  async reply(st, text, signal, onReplies) {
    this.active = (this.active || 0) + 1;
    try {
      return await this._reply(st, text, signal, onReplies);
    } finally {
      this.active--;
    }
  },
  async _reply(st, text, signal, onReplies) {
    const SESSION_MS = 40000,
      PROMPT_MS = 25000,
      T = performance.now();
    const within = (p, ms, onLate) =>
      new Promise((res, rej) => {
        const id = setTimeout(() => {
          onLate?.();
          rej(new Error('timeout'));
        }, ms);
        p.then(
          (v) => {
            clearTimeout(id);
            res(v);
          },
          (e) => {
            clearTimeout(id);
            rej(e);
          }
        );
      });
    let base;
    try {
      base = await within(this.sessionFor(st), SESSION_MS);
    } catch (e) {
      console.warn('[Nano] session', e?.message || e);
      if (e?.message === 'timeout') this._stall();
      throw e;
    }
    const C = st.c,
      members = st.members,
      me = (m) => (m.who === 'me' ? '彥霖' : C.group ? m.who : C.name);
    const log = st.msgs
      .filter((m) => m.text)
      .slice(-10)
      .map((m) => `${me(m)}：${m.text}`)
      .join('\n');
    // a message that is only laughter is described instead of quoted: fed 「哈哈哈哈」 the model tends to keep laughing
    // until it hits the output limit (QuotaExceededError after a long wait); long runs of one character are shortened
    const laughOnly =
      text != null &&
      /^[\s哈呵嘿嘻ㄏ笑死XxDd😂🤣!！~～.。]+$/u.test(text) &&
      /[哈呵嘿嘻ㄏ笑XxDd😂🤣]/u.test(text);
    const said = text == null ? '' : laughOnly ? '' : String(text).replace(/(.)\1{3,}/gu, '$1$1$1');
    const q = `最近的聊天紀錄：\n${log || '（還沒聊過）'}\n\n${
      text == null
        ? '（彥霖打開了聊天室還沒說話。replies 請給一則你主動開啟的新話題訊息，options 給彥霖兩種回法。只輸出 JSON。）'
        : laughOnly
          ? '彥霖剛傳來一串笑聲（他覺得很好笑）。請以角色身分回覆，只輸出 JSON。'
          : `彥霖剛傳來：「${said}」\n請以角色身分回覆這句，只輸出 JSON。`
    }`;
    const sch = schema(C.group, members);
    if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
    const t0 = performance.now();
    // one fresh clone per prompt (see sessionFor); aborted and destroyed when it runs over. Streamed, so:
    // - a reply that runs away (the model repeating itself) is cut off at MAX_CHARS right away;
    // - a prompt that gets stuck (no first word within STUCK_MS, or no new words for STUCK_MS; measured: the first
    //   words normally come within ~1 s, but now and then a prompt never answers at all) is dropped and asked again
    //   on a fresh clone, once, instead of waiting out the whole time limit;
    // - the replies are handed to onReplies as soon as they are complete.
    const MAX_CHARS = 320,
      STUCK_MS = 6000; // a normal answer is 110–190 characters
    const norm = (list) =>
      list
        .slice(0, 3)
        .map((r) => {
          // stray punctuation / JSON leftovers at either end (seen when the model's output goes slightly off the format)
          const t = clip(
            String((typeof r === 'string' ? r : r?.text) || '')
              .replace(/^[\s。，,、！!？?：:]+/u, '')
              .replace(/[\s{}[\]"]+$/u, ''),
            80
          );
          const who = C.group
            ? members.includes(r?.who)
              ? r.who
              : members[Math.floor(Math.random() * members.length)]
            : C.id;
          return { who, text: t };
        })
        .filter((r) => r.text);
    let early = false;
    const ask = async (opts) => {
      const c = await base.clone(),
        ac = new AbortController(),
        stop = () => ac.abort();
      signal?.addEventListener('abort', stop);
      let last = performance.now(),
        stuck = false;
      const dog = setInterval(() => {
        if (performance.now() - last > STUCK_MS) {
          stuck = true;
          ac.abort();
        }
      }, 500);
      const run = async () => {
        if (!c.promptStreaming) return c.prompt(q, { ...opts, signal: ac.signal });
        let acc = '';
        for await (const ch of c.promptStreaming(q, { ...opts, signal: ac.signal })) {
          last = performance.now();
          acc = acc && ch.length > acc.length && ch.startsWith(acc) ? ch : acc + ch; // older builds stream the whole text so far (always longer), newer ones just the new part (may repeat itself)
          // runaway: past MAX_CHARS, or the reply itself still going at 220 characters (a normal one ends by ~110 and the
          // options follow), so a model stuck repeating itself is caught in a few seconds
          if (acc.length > MAX_CHARS || (acc.length > 220 && !acc.includes('"options"'))) {
            ac.abort();
            throw new Error('runaway');
          }
          if (!early && onReplies) {
            const k = acc.indexOf('"options"');
            if (k > 0) {
              const head = parse(`${acc.slice(0, k).replace(/,\s*$/, '')}}`);
              const rs = Array.isArray(head?.replies) ? norm(head.replies) : [];
              if (rs.length) {
                early = true;
                try {
                  onReplies(rs);
                } catch (e) {}
              }
            }
          }
        }
        return acc;
      };
      try {
        return await within(run(), PROMPT_MS - (performance.now() - t0), () => ac.abort());
      } catch (e) {
        if (stuck && !signal?.aborted) throw new Error('stuck');
        throw e;
      } finally {
        clearInterval(dog);
        signal?.removeEventListener('abort', stop);
        try {
          c.destroy();
        } catch (e) {}
      }
    };
    let raw;
    for (let tries = 0; ; tries++) {
      try {
        raw = await ask({ responseConstraint: sch });
        break;
      } catch (e) {
        if (signal?.aborted) throw e; // cancelled by the chat (you sent something else)
        if ((e?.message === 'stuck' || e?.message === 'runaway') && tries === 0 && !early) {
          console.warn('[Nano] prompt', e.message, '— asking again');
          continue;
        }
        if (e?.message === 'runaway') {
          console.warn('[Nano] reply ran away, cut at', MAX_CHARS, 'chars');
          this.fails++;
          throw e;
        }
        if (e?.message === 'timeout' || e?.message === 'stuck') {
          console.warn(
            '[Nano] reply',
            e.message,
            'after',
            Math.round(performance.now() - t0),
            'ms'
          );
          if (!early) this._stall();
          throw e;
        }
        try {
          raw = await ask({});
          break;
        } catch (e2) {
          // older builds without responseConstraint
          console.warn('[Nano] reply failed', e2?.name, e2?.message);
          if (e2?.message === 'timeout' || e2?.message === 'stuck') this._stall();
          else {
            st.session = null;
            try {
              base.destroy();
            } catch (x) {}
          }
          throw e2;
        }
      }
    }
    const out = parse(raw);
    if (!out || !Array.isArray(out.replies) || !out.replies.length) {
      this.fails++;
      throw new Error('bad output');
    }
    this.fails = 0;
    console.info(
      '[Nano] reply in',
      Math.round(performance.now() - T),
      'ms (session',
      Math.round(t0 - T),
      'ms, prompt',
      Math.round(performance.now() - t0),
      'ms)'
    );
    const replies = norm(out.replies);
    const opts = (Array.isArray(out.options) ? out.options : [])
      .map((o) => clip(String(o || '').replace(/^\s*彥霖\s*[：:]\s*/, ''), 60))
      .filter(Boolean)
      .slice(0, 2);
    return { replies, options: opts, early };
  },
};
