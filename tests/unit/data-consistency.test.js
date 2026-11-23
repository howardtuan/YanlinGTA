import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const readJson = (relPath) => JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));

describe('Game Data Consistency Tests', () => {
  it('data/npcs.json has valid places and unique NPC definitions', () => {
    const data = readJson('data/npcs.json');
    expect(data && typeof data === 'object').toBe(true);
    expect(data.places && typeof data.places === 'object').toBe(true);

    for (const [placeName, pos] of Object.entries(data.places)) {
      expect(placeName.length).toBeGreaterThan(0);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.z)).toBe(true);
      expect(Number.isFinite(pos.h)).toBe(true);
    }

    expect(Array.isArray(data.npcs)).toBe(true);
    expect(data.npcs.length).toBeGreaterThan(0);

    const seenIds = new Set();
    for (const npc of data.npcs) {
      expect(typeof npc.id).toBe('string');
      expect(npc.id.length).toBeGreaterThan(0);
      expect(seenIds.has(npc.id)).toBe(false);
      seenIds.add(npc.id);

      expect(typeof npc.name).toBe('string');
      expect(npc.name.length).toBeGreaterThan(0);
      expect(['builtin', 'custom']).toContain(npc.kind);

      if (npc.kind === 'builtin' && Array.isArray(npc.sources)) {
        for (const srcPath of npc.sources) {
          expect(fs.existsSync(path.join(ROOT, srcPath))).toBe(true);
        }
      }

      if (npc.kind === 'custom') {
        if (npc.place) {
          expect(Object.hasOwn(data.places, npc.place)).toBe(true);
        } else {
          expect(npc.spot && typeof npc.spot === 'object').toBe(true);
          expect(Number.isFinite(npc.spot.x)).toBe(true);
          expect(Number.isFinite(npc.spot.z)).toBe(true);
        }
      }
    }
  });

  it('data/cycu.json contains valid buildings and roads arrays', () => {
    const cycu = readJson('data/cycu.json');
    expect(cycu && typeof cycu === 'object').toBe(true);
    expect(Array.isArray(cycu.buildings)).toBe(true);
    expect(cycu.buildings.length).toBeGreaterThan(0);
    expect(Array.isArray(cycu.roads)).toBe(true);
    expect(cycu.roads.length).toBeGreaterThan(0);
  });

  it('data/terrain.json contains valid elevation grid metadata', () => {
    const terrain = readJson('data/terrain.json');
    expect(terrain && typeof terrain === 'object').toBe(true);
    expect(Number.isFinite(terrain.nx) && terrain.nx > 0).toBe(true);
    expect(Number.isFinite(terrain.nz) && terrain.nz > 0).toBe(true);
    expect(Number.isFinite(terrain.step) && terrain.step > 0).toBe(true);
    expect(Array.isArray(terrain.rows)).toBe(true);
    expect(terrain.rows.length).toBe(terrain.nz);
  });
});
