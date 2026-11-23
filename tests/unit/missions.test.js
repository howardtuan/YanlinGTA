import { describe, it, expect, vi } from 'vitest';
import { SPEECH, MANAGER, SENIOR, Missions } from '../../src/systems/MissionSystem.js';

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

  it('should export valid character visual presets for key story NPCs', () => {
    expect(MANAGER.shirt).toBe('#ffd23f');
    expect(MANAGER.hairStyle).toBe('pony');
    expect(MANAGER.face).toBe(true);

    expect(SENIOR.shirt).toBe('#2f6bff');
    expect(SENIOR.glasses).toBe(true);
    expect(SENIOR.face).toBe(true);
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
          this.talk([['阿哲', '出發吧']], () => {
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
});
