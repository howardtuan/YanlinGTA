import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROSTER } from '../../src/systems/mahjong/Mahjong.js';
import {
  NPC_STICKERS,
  NPC_STICKER_KINDS,
  npcReactions,
  npcSticker,
  stickerByText,
} from '../../src/systems/mahjong/NpcStickers.js';
import { SPECTATE_REACTS, reactSticker } from '../../src/systems/mahjong/P2P.js';

const ids = [null, 'zz', 'houshe', 'jianyu'];
const always = () => 0; // rnd：每個機率都會中

describe('同學表情貼圖', () => {
  it('會來打牌的每位同學都有完整一組、圖檔都在', () => {
    for (const r of ROSTER) {
      expect(NPC_STICKERS[r.id]).toBeTruthy();
      for (const k of NPC_STICKER_KINDS) {
        const st = npcSticker(r.id, k);
        expect(st.label.length).toBeGreaterThan(0);
        expect(fs.existsSync(path.resolve(st.img))).toBe(true);
      }
    }
  });

  it('所有貼圖文字都不重複（含彥霖的），連線傳文字換得回同一張圖', () => {
    const all = [
      ...SPECTATE_REACTS.flatMap((r) => [r.text, r.label]),
      ...Object.values(NPC_STICKERS).flatMap((set) => Object.values(set)),
    ];
    expect(new Set(all).size).toBe(all.length);
    for (const id in NPC_STICKERS)
      for (const k of NPC_STICKER_KINDS) {
        const st = npcSticker(id, k);
        expect(stickerByText(st.label)?.img).toBe(st.img);
        expect(reactSticker(st.label)?.img).toBe(st.img);
      }
    expect(stickerByText('隨便講講')).toBeNull();
  });

  it('胡牌：胡的人跳「胡」、放槍的人跳「放槍」、其他同學可能跳「別人胡」', () => {
    const r = npcReactions({ type: 'win', winner: 1, from: 2, self: false }, ids, { rnd: always });
    expect(r.map((x) => [x.seat, x.kind])).toEqual([
      [1, 'hu'],
      [2, 'gun'],
      [3, 'other'],
    ]);
  });

  it('你胡了或你放槍：你自己（座位 0）不跳貼圖', () => {
    const r = npcReactions({ type: 'win', winner: 0, from: 3, self: false }, ids, { rnd: always });
    expect(r.find((x) => x.seat === 0)).toBeUndefined();
    expect(r.find((x) => x.seat === 3)?.kind).toBe('gun');
    const r2 = npcReactions({ type: 'win', winner: 2, from: 0, self: false }, ids, {
      rnd: always,
    });
    expect(r2.map((x) => x.kind)).toEqual(['hu', 'other', 'other']);
  });

  it('聽牌一局只喊一次；暗槓不跳', () => {
    const told = new Set();
    const ev = { type: 'discard', seat: 2 };
    expect(npcReactions(ev, ids, { ting: () => true, told, rnd: always })).toHaveLength(1);
    expect(npcReactions(ev, ids, { ting: () => true, told, rnd: always })).toHaveLength(0);
    expect(npcReactions(ev, ids, { ting: () => false, rnd: always })).toHaveLength(0);
    const closed = { type: 'kong', seat: 1, closed: true };
    expect(npcReactions(closed, ids, { rnd: always })).toHaveLength(0);
    expect(npcReactions({ type: 'pon', seat: 1 }, ids, { rnd: always })[0].kind).toBe('call');
  });

  it('座位上不是同學（多人的真人）就不跳', () => {
    const r = npcReactions(
      { type: 'win', winner: 1, from: 2, self: false },
      [null, null, null, null],
      {
        rnd: always,
      }
    );
    expect(r).toEqual([]);
  });
});
