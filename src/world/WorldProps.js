// Dynamic world props spawned once after buildPhysicsWorld (traffic cones, etc.).
// Keeps geometry & materials shared so dozens of props cost almost zero GPU memory,
// and relies on Physics.js PROP_FAR auto-disable so distant cones cost zero CPU.
import * as THREE from 'three';
import { surfaceAt } from './Terrain.js';

let _coneAssets = null;
function coneAssets() {
  if (_coneAssets) return _coneAssets;
  const baseGeo = new THREE.BoxGeometry(0.38, 0.04, 0.38);
  baseGeo.translate(0, 0.02, 0);
  const bodyGeo = new THREE.CylinderGeometry(0.03, 0.16, 0.66, 10);
  bodyGeo.translate(0, 0.37, 0);
  const bandGeo = new THREE.CylinderGeometry(0.088, 0.114, 0.14, 10);
  bandGeo.translate(0, 0.44, 0);
  const baseMat = new THREE.MeshStandardMaterial({ color: '#262628', roughness: 0.9 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#e86420', roughness: 0.55 });
  const bandMat = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.4 });
  return (_coneAssets = { baseGeo, bodyGeo, bandGeo, baseMat, bodyMat, bandMat });
}

export function createConeMesh() {
  const A = coneAssets();
  const grp = new THREE.Group();
  const base = new THREE.Mesh(A.baseGeo, A.baseMat);
  const body = new THREE.Mesh(A.bodyGeo, A.bodyMat);
  const band = new THREE.Mesh(A.bandGeo, A.bandMat);
  base.castShadow = body.castShadow = true;
  base.receiveShadow = body.receiveShadow = true;
  grp.add(base, body, band);
  grp.matrixAutoUpdate = false;
  return grp;
}

export function spawnWorldCones(scene, physics, cones = []) {
  if (!cones.length) return [];
  const placed = [];
  const out = [];
  for (const [x, z] of cones) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    // Skip accidental duplicates at the exact same spot
    if (placed.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 0.04)) continue;
    placed.push([x, z]);
    const grp = createConeMesh();
    const y = surfaceAt(x, z);
    grp.position.set(x, y, z);
    grp.updateMatrix();
    scene.add(grp);
    const prop = physics?.ready
      ? physics.addProp(grp, {
          parts: [
            { shape: 'box', hx: 0.19, hy: 0.025, hz: 0.19, y: 0.025, mass: 1.8 },
            { shape: 'cone', r: 0.16, hh: 0.33, y: 0.37, mass: 1.4 },
          ],
          friction: 0.65,
          restitution: 0.25,
          sound: 'cone',
        })
      : null;
    out.push({ grp, prop, x, z });
  }
  return out;
}
