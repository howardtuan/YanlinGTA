import { describe, it, expect, beforeEach } from 'vitest';
import { readSave, writeSave, applySave, clearSave } from '../../src/systems/SaveSystem.js';

describe('Save System & Height Synchronization Tests (save.js)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when reading empty or invalid save data', () => {
    expect(readSave()).toBeNull();
    localStorage.setItem('yanlinGTA.save.v1', 'invalid-json');
    expect(readSave()).toBeNull();
    localStorage.setItem('yanlinGTA.save.v1', JSON.stringify({ v: 2 })); // wrong version
    expect(readSave()).toBeNull();
  });

  it('should serialize game state correctly via writeSave', () => {
    const mockGame = {
      state: 'playing',
      votes: 12,
      money: 500,
      ledger: [],
      clock: 1080,
      playTime: 120,
      ballotList: [{ got: true }, { got: false }],
      eggs: [{ title: 'Easter1', found: true }],
      job: { shifts: 2, earned: 400, best: 200, totalVotes: 5 },
      gate: { votesGiven: 3, shifts: 1, best: 3 },
      race: { wins: 1, runs: 2 },
      missions: {
        idx: 2,
        rewarded: new Set([1]),
        done: false,
        free: false,
        progress: () => ({ talked: true, sub: 1, hits: null, base: null }),
      },
      player: {
        worldPos: () => ({ x: 10.5, z: 20.5 }),
        worldHeading: () => 1.57,
        y: 3.5, // 2nd floor height!
        look: { skin: '#fff' },
      },
      phone: { storySeen: new Set(), chats: [] },
    };

    const saved = writeSave(mockGame);
    expect(saved).toBe(true);

    const loaded = readSave();
    expect(loaded).not.toBeNull();
    expect(loaded.v).toBe(1);
    expect(loaded.money).toBe(500);
    expect(loaded.pos.y).toBe(3.5);
    expect(loaded.pos.x).toBe(10.5);
    expect(loaded.pos.z).toBe(20.5);
  });

  it('CRITICAL: applySave must synchronize player.y and player.pos.y to prevent hollow floor drop (small black room)', () => {
    const mockGame = {
      votes: 0,
      money: 0,
      hud: {
        setVotes: () => {},
        setMoney: () => {},
        setBallots: () => {},
      },
      ballotList: [],
      eggs: [],
      job: {},
      gate: {},
      race: {},
      phone: {
        storySeen: new Set(),
        chats: [],
        resumePending: () => {},
      },
      player: {
        x: 0,
        z: 0,
        y: 0,
        pos: { x: 0, y: 0, z: 0 },
        place(x, z, _h) {
          this.pos.x = x;
          this.pos.z = z;
        },
      },
      rig: { yaw: 0 },
      bringMyScooter: () => {},
      missions: { rewarded: new Set() },
    };

    const saveData = {
      v: 1,
      votes: 5,
      money: 300,
      pos: { x: 15, z: 25, y: 4.2, h: 0.5 },
      mission: { mv: 2, idx: 1 },
    };

    applySave(mockGame, saveData);

    // Verify both player.y and player.pos.y are restored to the saved height
    expect(mockGame.player.y).toBe(4.2);
    expect(mockGame.player.pos.y).toBe(4.2);
    expect(mockGame.player.pos.x).toBe(15);
    expect(mockGame.player.pos.z).toBe(25);
  });

  it('should migrate legacy mission saves gracefully', () => {
    const mockGame = {
      hud: { setVotes: () => {}, setMoney: () => {}, setBallots: () => {} },
      ballotList: [],
      eggs: [],
      job: {},
      gate: {},
      race: {},
      phone: { storySeen: new Set(), chats: [], resumePending: () => {} },
      missions: { rewarded: new Set() },
    };

    // Old save without mv and idx = 5 (saved before mission 5 existed)
    const legacySave = {
      v: 1,
      mission: { idx: 5 }, // no mv property
    };

    const mission = applySave(mockGame, legacySave);
    expect(mission.idx).toBe(7); // shifted past both missions added later (任務五, 任務六)
  });

  it('moves mv 2 saves at the speech or the ending past 任務六 (宿舍拉票)', () => {
    const mk = () => ({
      hud: { setVotes: () => {}, setMoney: () => {}, setBallots: () => {} },
      ballotList: [],
      eggs: [],
      job: {},
      gate: {},
      race: {},
      phone: { storySeen: new Set(), chats: [], resumePending: () => {} },
      missions: { rewarded: new Set() },
    });
    expect(applySave(mk(), { v: 1, mission: { mv: 2, idx: 5 } }).idx).toBe(5);
    expect(applySave(mk(), { v: 1, mission: { mv: 2, idx: 6 } }).idx).toBe(7);
    expect(applySave(mk(), { v: 1, mission: { mv: 2, idx: 7 } }).idx).toBe(8);
    expect(applySave(mk(), { v: 1, mission: { mv: 3, idx: 6 } }).idx).toBe(6);
  });

  it('clearSave should remove the save record', () => {
    localStorage.setItem('yanlinGTA.save.v1', JSON.stringify({ v: 1 }));
    expect(readSave()).not.toBeNull();
    clearSave();
    expect(readSave()).toBeNull();
  });
});
