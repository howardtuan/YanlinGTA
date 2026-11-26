import { describe, it, expect } from 'vitest';
import { RIDE_PLACES } from '../../src/systems/minigames/PinHanRide.js';

describe('品漢堡 ride list (PinHanRide.js)', () => {
  const home = RIDE_PLACES.find((p) => p.key === 'home');
  const listed = (g) => RIDE_PLACES.filter((p) => !p.shown || p.shown(g)).map((p) => p.key);

  it('leaves 彥霖家 out until the player has found it (same rule as 🏠 on the map)', () => {
    expect(home).toBeDefined();
    expect(listed({ missions: { homeKnown: false } })).not.toContain('home');
    expect(listed({ missions: { homeKnown: true } })).toContain('home');
    expect(listed({ missions: { homeKnown: false } })).toContain('im');
  });
});
