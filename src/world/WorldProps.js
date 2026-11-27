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

// Loose boxes in front of the shop rows (crates, cartons, coolers, sign boards: src/world/Kit.js looseBox, collected
// by finishRow into interiors.crates): props you knock about like the cones (#302: you walked through them).
// All of them are one InstancedMesh (one draw call); each has its own sleeping physics body, and a moved one
// writes its new matrix into its instance (Physics.js calls obj.updateMatrix() after every step it moves).
export function spawnWorldCrates(scene, physics, crates = []) {
  if (!crates.length) return null;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0); // origin on the floor
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const im = new THREE.InstancedMesh(geo, mat, crates.length);
  im.name = 'worldCrates';
  im.castShadow = true;
  im.receiveShadow = true;
  const col = new THREE.Color(),
    up = new THREE.Vector3(0, 1, 0),
    props = [];
  crates.forEach((c, i) => {
    const o = new THREE.Object3D();
    o.position.set(c.x, Math.max(surfaceAt(c.x, c.z), c.y), c.z);
    o.quaternion.setFromAxisAngle(up, c.yaw);
    o.scale.set(c.w, c.h, c.d);
    o.matrixAutoUpdate = false;
    o.updateMatrix = function () {
      this.matrix.compose(this.position, this.quaternion, this.scale);
      im.setMatrixAt(i, this.matrix);
      im.instanceMatrix.needsUpdate = true;
      im.boundingSphere = null; // a crate knocked out of the row's bounds stays visible
    };
    o.updateMatrix();
    im.setColorAt(i, col.set(c.color));
    const vol = c.w * c.h * c.d;
    const rec = physics?.ready
      ? physics.addProp(o, {
          shape: 'box',
          hx: c.w / 2,
          hy: c.h / 2,
          hz: c.d / 2,
          y: c.h / 2,
          mass: Math.min(60, Math.max(3, vol * 120)), // a carton of drinks, not a bank safe
          friction: 0.6,
          restitution: 0.15,
          sound: 'barrier',
        })
      : null;
    if (rec) rec.crate = true; // the walker stops at / shoves these (src/entities/Walker.js)
    props.push(rec);
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  scene.add(im);
  return { mesh: im, props, count: crates.length };
}
