import { describe, it, expect, vi } from 'vitest';
import { SPEECH, MONDAY, WEDNESDAY, Missions } from '../../src/systems/MissionSystem.js';
import { HOLO_AI } from '../../src/graphics/HoloRing.js';

function makeMockGame() {
  const pos = { x: 90, z: 130 };
  return {
    startPos: { x: -224, z: 46, h: 1.37 },
    npcs: [],
    votes: 0,
    _saveT: 0,
    world: {
      named: {
        資訊管理學系: { x: 92, z: 132 },
        張靜愚紀念圖書館: { x: -152, z: -42 },
        學生活動中心: { x: -161, z: -125 },
        全人教育村: { x: -30, z: -54 },
        電學大樓: { x: -10, z: 252 },
        良善樓: { x: -19, z: 257 },
        鐘塔: { x: -14, z: 96 },
        校史館: { x: -67, z: 102 },
        中原大學體育館: { x: -46, z: -253 },
        管理大樓: { x: 88, z: 48 },
        科學館: { x: -60, z: 71 },
      },
      nightMarket: { x: -191, z: 349 },
      nearestRoadPoint: (x, z) => ({ x, z }),
    },
    interiors: { actions: [], yh: { door: [-560, 218] } },
    player: { worldPos: () => pos, _pos: pos },
    hud: {
      inDialog: false,
      setObjective: vi.fn(),
      setTimer: vi.fn(),
      bigToast: vi.fn(),
      toast: vi.fn(),
    },
    audio: {
      fail: vi.fn(),
      fanfare: vi.fn(),
      objective: vi.fn(),
    },
    setBeam: vi.fn(),
    dialog: vi.fn((_lines, cb) => cb?.()),
  };
}

describe('Campaign Story & Missions Tests (MissionSystem.js)', () => {
  it('should provide complete candidate campaign speech lines', () => {
    expect(SPEECH).toBeDefined();
    expect(SPEECH.length).toBe(4);
    expect(SPEECH[0][0]).toBe('彥霖');
    expect(SPEECH[3][1]).toContain('資管要贏，票投彥霖');
  });

  it('gives the missions through the two holographic story AIs, each in its own colour', () => {
    expect(MONDAY).toBe('M.O.N.D.A.Y');
    expect(WEDNESDAY).toBe('W.E.D.N.E.S.D.A.Y');
    const cols = [HOLO_AI[MONDAY], HOLO_AI[WEDNESDAY], HOLO_AI['S.U.N.D.A.Y']].map((p) => p.main);
    expect(new Set(cols).size).toBe(3);
    const lines = Missions.prototype.steps.map(String).join(' ');
    expect(lines).not.toMatch(/'小安'|'阿哲'/);
  });

  describe('Missions state machine', () => {
    it('should enter free-roam mode without starting story steps', () => {
      const game = makeMockGame();
      const missions = new Missions(game);

      missions.start(true);
      expect(missions.free).toBe(true);
      expect(missions.idx).toBe(-1);
      expect(missions.active).toBeNull();
      expect(game.hud.setObjective).toHaveBeenCalledWith('自由探索', expect.stringContaining('34'));
    });

    it('should deduplicate checkpoint rewards via once()', () => {
      const game = makeMockGame();
      const missions = new Missions(game);

      expect(missions.once('m1_cp1')).toBe(true);
      expect(missions.once('m1_cp1')).toBe(false);
      expect(missions.once('m1_cp2')).toBe(true);
    });

    it('should pause via exit(), track inRing proximity, and restore via resumeSection()', () => {
      const game = makeMockGame();
      const missions = new Missions(game);

      const onArrive = vi.fn();
      missions.steps = [
        () => {},
        function () {
          this.talk([[WEDNESDAY, '出發吧']], () => {
            this.goto({ x: 10, z: 20 }, '任務一', '前往測試點', onArrive);
          });
        },
      ];

      missions.idx = 0;
      missions.next();

      expect(missions.idx).toBe(1);
      expect(missions.canExit).toBe(true);
      expect(missions.progress()).toMatchObject({ talked: true, sub: 0 });

      game.hud.inDialog = true;
      expect(missions.canExit).toBe(false);
      game.hud.inDialog = false;

      expect(missions.exit('時間到')).toBe(true);
      expect(missions.step).toBeNull();
      expect(missions.canExit).toBe(false);
      expect(missions.markers[0]).toMatchObject({ icon: '▶', x: 92, z: 132 });
      expect(game.audio.fail).toHaveBeenCalledTimes(1);

      expect(missions.inRing).toBe(true);
      game.player._pos.x = 0;
      game.player._pos.z = 0;
      expect(missions.inRing).toBe(false);

      const dialogCallsBefore = game.dialog.mock.calls.length;
      expect(missions.resumeSection()).toBe(true);
      expect(missions.exited).toBeNull();
      expect(missions.step?.type).toBe('goto');
      expect(game.dialog.mock.calls.length).toBe(dialogCallsBefore);
      expect(game.hud.bigToast).toHaveBeenCalledWith('繼續任務', '任務一');
    });
  });
  describe('彥霖的家 on the map', () => {
    it('stays hidden until the player has been there, or the story is past 任務五', () => {
      const game = makeMockGame();
      const missions = new Missions(game);
      expect(missions.showHome).toBe(false);
      missions.idx = 6;
      expect(missions.showHome).toBe(true);
      missions.idx = 2;
      missions.discoverHome();
      expect(missions.homeFound).toBe(true);
      expect(missions.showHome).toBe(true);
      expect(game.hud.toast).toHaveBeenCalledTimes(1);
      missions.discoverHome(); // only once
      expect(game.hud.toast).toHaveBeenCalledTimes(1);
    });

    it('任務五 skips the search when the place was found before, and says so', () => {
      const game = makeMockGame();
      game.detective = { solved: () => false };
      game.pc = { isOpen: false };
      const missions = new Missions(game);
      missions.homeFound = true;
      missions.idx = 4;
      missions.next();
      expect(missions.idx).toBe(5);
      const lines = game.dialog.mock.calls.flatMap((c) => c[0].map((l) => l[1])).join('\n');
      expect(lines).toContain('先前已經找到');
      expect(missions.step?.type).toBe('until');
      expect(missions.sub).toBe(2); // search section skipped, computer section active
      expect(missions.hideHome).toBe(false);
      expect(missions.markers[0]).toMatchObject({ icon: '★', x: -560, z: 218 });
    });

    it('任務五 hides 🏠 and searches when the place was not found yet', () => {
      const game = makeMockGame();
      const missions = new Missions(game);
      missions.idx = 4;
      missions.next();
      expect(missions.sub).toBe(1);
      expect(missions.hideHome).toBe(true);
      expect(missions.showHome).toBe(false);
      expect(missions.markers[0]).toMatchObject({ icon: '?' });
    });
  });
});
