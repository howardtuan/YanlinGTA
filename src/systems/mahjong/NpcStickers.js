// 單人模式：一起打牌的同學在牌局中會自己跳表情貼圖（assets/mahjong/npc/<id>-<kind>.webp，
// 家裡 GPU 的 Qwen-Image 照各自的 3D 外觀畫的，每個人一組、文字照個性寫）。
// kind：hu 自己胡、gun 自己放槍、ting 剛聽牌、call 碰／槓、other 別人胡（不是自己放的槍）
export const NPC_STICKER_KINDS = ['hu', 'gun', 'ting', 'call', 'other'];

export const NPC_STICKERS = {
  zz: {
    hu: '漂亮殺球！',
    gun: '我送頭啦！',
    ting: '油門催落！',
    call: '攔網！',
    other: '這波好秀！',
  },
  houshe: {
    hu: '大發啦！',
    gun: '學妹救我！',
    ting: '對焦完成！',
    call: '抓拍成功！',
    other: '幫你拍一張',
  },
  jianyu: {
    hu: '滿載入港！',
    gun: '小錢而已',
    ting: '架好槍囉',
    call: '順手收下',
    other: '好槍法喔！',
  },
  hank: {
    hu: '編譯過啦！',
    gun: '斷弦了啦！',
    ting: '副歌要來囉',
    call: '精準切音！',
    other: '去看夜景囉',
  },
  gd: {
    hu: '報告胡牌！',
    gun: '被禁假了！',
    ting: '磨刀霍霍',
    call: '這塊切走！',
    other: '回去顧店',
  },
  howard: {
    hu: '見證奇蹟！',
    gun: '財報赤字！',
    ting: '上重量囉！',
    call: '變走囉！',
    other: '幫你記帳！',
  },
  richard: { hu: '胡了！', gun: '放槍了…', ting: '聽牌！', call: '碰！', other: '好牌！' },
  garry: {
    hu: '承讓囉！',
    gun: '哎呀放槍了',
    ting: '我聽牌囉！',
    call: '這張先收囉',
    other: '打得漂亮！',
  },
};

// 那位同學那種時機的貼圖；沒有就 null
export function npcSticker(id, kind) {
  const label = NPC_STICKERS[id]?.[kind];
  return label ? { img: `assets/mahjong/npc/${id}-${kind}.webp`, label } : null;
}

// 一個牌局事件該讓哪些座位跳哪種貼圖：回傳 [{ seat, kind, delay }]（delay 秒）。
// ids[s] = 坐在 s 位的同學 id（0 是你、空的是真人或沒人）；ting(s) = s 現在有沒有聽牌；
// told = 這一局已經跳過「聽牌」的座位（會被更新）；rnd 讓測試可以固定
export function npcReactions(
  ev,
  ids,
  { ting = () => false, told = new Set(), rnd = Math.random } = {}
) {
  const out = [];
  const npc = (s) => s != null && s > 0 && !!ids[s] && !!NPC_STICKERS[ids[s]];
  if (ev.type === 'win') {
    if (npc(ev.winner)) out.push({ seat: ev.winner, kind: 'hu', delay: 0.2 });
    if (!ev.self && npc(ev.from)) out.push({ seat: ev.from, kind: 'gun', delay: 0.6 });
    for (let s = 1; s < 4; s++)
      if (npc(s) && s !== ev.winner && s !== ev.from && rnd() < 0.5)
        out.push({ seat: s, kind: 'other', delay: 1 + rnd() * 0.8 });
  } else if ((ev.type === 'pon' || ev.type === 'kong') && !ev.closed && npc(ev.seat)) {
    if (rnd() < 0.45) out.push({ seat: ev.seat, kind: 'call', delay: 0.3 });
  } else if (ev.type === 'discard' && npc(ev.seat) && !told.has(ev.seat) && ting(ev.seat)) {
    told.add(ev.seat); // (一局只講一次，不管這次有沒有真的跳出來)
    if (rnd() < 0.5) out.push({ seat: ev.seat, kind: 'ting', delay: 0.4 });
  }
  return out;
}
