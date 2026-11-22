import { describe, it, expect } from 'vitest';
import { SPEECH, MANAGER, SENIOR } from '../../src/systems/MissionSystem.js';

describe('Campaign Story & Missions Tests (missions.js)', () => {
  it('should provide complete candidate campaign speech lines', () => {
    expect(SPEECH).toBeDefined();
    expect(SPEECH.length).toBe(4);
    expect(SPEECH[0][0]).toBe('彥霖');
    expect(SPEECH[3][1]).toContain('資管要贏，票投彥霖');
  });

  it('should export valid character visual presets for key story NPCs', () => {
    // MANAGER (小安)
    expect(MANAGER.shirt).toBe('#ffd23f');
    expect(MANAGER.hairStyle).toBe('pony');
    expect(MANAGER.face).toBe(true);

    // SENIOR (阿哲)
    expect(SENIOR.shirt).toBe('#2f6bff');
    expect(SENIOR.glasses).toBe(true);
    expect(SENIOR.face).toBe(true);
  });
});
