// #302：交通車要閃停在路上的車，不只玩家身邊 25 m 內的。玩家走開時 AI 計程車直接開過停在中北路車道上的 JET SL，
// 走回來時它被當成障礙物，計程車就卡在車身重疊的位置（遊戲裡實測：玩家在 40 m 外跑 160 秒，壓過 4 次；改成 150 m 後 0 次）
import { describe, it, expect } from 'vitest';
import { Traffic } from '../../src/entities/NPC.js';

const v = (x, z, kind = 'scooter') => ({ kind, pos: { x, z } });

describe('Traffic.parkedObstacles', () => {
  it('counts parked vehicles well away from you, not the one you ride', () => {
    const me = { x: 0, z: 0 },
      riding = v(1, 1, 'car'),
      jet = v(40, 0), // your JET SL, left on the lane 40 m back
      far = v(120, 60),
      gone = v(400, 0);
    const out = Traffic.parkedObstacles([riding, jet, far, gone], riding, me);
    expect(out).toContain(jet);
    expect(out).toContain(far);
    expect(out).not.toContain(riding);
    expect(out).not.toContain(gone);
  });
});
