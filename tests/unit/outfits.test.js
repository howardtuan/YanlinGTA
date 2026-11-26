import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOOK,
  TOPS,
  BOTTOMS,
  HATS,
  SETS,
  normalizeLook,
  wornParts,
  characterOpts,
  pickItem,
} from '../../src/systems/OutfitData.js';
import { wearLook } from '../../src/systems/Outfits.js';
import { readSave, writeSave } from '../../src/systems/SaveSystem.js';

// 衣櫃（src/ui/Wardrobe.js）的服裝資料、舊存檔相容與穿上身的參數
describe('衣櫃服裝資料（OutfitData.js）', () => {
  it('每件衣服顏色合法、帽子與套裝 id 不重複', () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const t of TOPS) expect(t.shirt).toMatch(hex);
    for (const b of BOTTOMS) expect(b.shorts).toMatch(hex);
    for (const h of HATS) expect(h.color).toMatch(hex);
    for (const s of SETS) {
      expect(s.shirt).toMatch(hex);
      expect(s.shorts).toMatch(hex);
    }
    const ids = [...HATS, ...SETS].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('有麥當勞制服和彥霖航空制服，不出現真實航空公司的名稱', () => {
    const names = SETS.map((s) => s.name);
    expect(names).toContain('麥當勞制服');
    expect(names.some((n) => n.includes('彥霖航空'))).toBe(true);
    const all = JSON.stringify(SETS);
    for (const bad of ['長榮', 'EVA', 'Evergreen', '華航', 'China Airlines', '星宇'])
      expect(all).not.toContain(bad);
  });

  it('舊存檔的造型（只有 shirt／shorts／pants／top）原樣讀回，新欄位補預設', () => {
    const old = { shirt: '#4a5131', shorts: '#3d5a80', pants: true, top: 'im' };
    expect(normalizeLook(old)).toEqual({
      shirt: '#4a5131',
      shorts: '#3d5a80',
      pants: true,
      top: 'im',
      long: false,
      hat: null,
      set: null,
    });
  });

  it('壞掉或惡意的資料一律退回預設', () => {
    expect(normalizeLook(null)).toEqual(DEFAULT_LOOK);
    expect(normalizeLook('x')).toEqual(DEFAULT_LOOK);
    expect(
      normalizeLook({
        shirt: 'red;background:url(x)',
        shorts: '#12',
        pants: 'yes',
        top: '<b>',
        hat: 'crown',
        set: 'evil',
        long: 1,
      })
    ).toEqual(DEFAULT_LOOK);
  });

  it('套裝蓋過單件：上衣、褲子、帽子都由套裝決定，而且不印胸前小臉', () => {
    const look = normalizeLook({ shirt: '#7a1f2b', hat: 'capRed', set: 'pilot' });
    const W = wornParts(look);
    const pilot = SETS.find((s) => s.id === 'pilot');
    expect(W.shirt).toBe(pilot.shirt);
    expect(W.pants).toBe(true);
    expect(W.hat).toBe(null);
    const o = characterOpts(look);
    expect(o.plain).toBe(true);
    expect(o.shoes).toBe(pilot.shoes);
    const cabin = characterOpts({ set: 'cabin' });
    expect(cabin.longSleeve).toBe(true);
  });

  it('單件照舊：印花上衣、長袖、帽子', () => {
    expect(characterOpts({ shirt: '#1d2340', top: 'polo' })).toMatchObject({
      polo: true,
      imTee: false,
      plain: false,
    });
    expect(characterOpts({ shirt: '#1a1a1c', long: true }).longSleeve).toBe(true);
    expect(wornParts({ hat: 'bucket' }).hat).toBe('bucket');
  });

  it('換單件會脫下套裝、保留其他單件；選「不戴帽子」「不穿套裝」', () => {
    let L = normalizeLook({ shorts: '#3d5a80', pants: true, hat: 'beanie' });
    L = pickItem(L, 'set', SETS[0]);
    expect(L.set).toBe('mc');
    L = pickItem(
      L,
      'top',
      TOPS.find((t) => t.top === 'im')
    );
    expect(L).toMatchObject({
      set: null,
      top: 'im',
      shorts: '#3d5a80',
      pants: true,
      hat: 'beanie',
    });
    L = pickItem(L, 'hat', null);
    expect(L.hat).toBe(null);
    L = pickItem(pickItem(L, 'set', SETS[1]), 'set', null);
    expect(L.set).toBe(null);
    L = pickItem(L, 'bottom', BOTTOMS[0]);
    expect(L).toMatchObject({ shorts: BOTTOMS[0].shorts, pants: false });
  });
});

describe('造型存檔與穿上身（SaveSystem.js、Outfits.js）', () => {
  it('wearLook 把整理過的造型交給 player.setLook，並附上組模型的函式', () => {
    const got = [];
    wearLook({ setLook: (l, make) => got.push([l, make]) }, { set: 'cabin', hat: 'nope' });
    expect(got[0][0]).toMatchObject({ set: 'cabin', hat: null });
    expect(typeof got[0][1]).toBe('function');
  });

  it('套裝與帽子寫進存檔、讀得回來', () => {
    localStorage.clear();
    const look = normalizeLook({ set: 'mc', hat: 'capBlack', shirt: '#7a1f2b' });
    const ok = writeSave({
      state: 'playing',
      votes: 0,
      money: 0,
      ledger: [],
      clock: 1080,
      playTime: 0,
      ballotList: [],
      eggs: [],
      job: {},
      gate: {},
      race: {},
      missions: {
        idx: 0,
        rewarded: new Set(),
        done: false,
        free: false,
        progress: () => ({}),
      },
      player: { worldPos: () => ({ x: 0, z: 0 }), worldHeading: () => 0, y: 0, look },
      phone: { storySeen: new Set(), chats: [] },
    });
    expect(ok).toBe(true);
    expect(normalizeLook(readSave().look)).toEqual(look);
  });
});
