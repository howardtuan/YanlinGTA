// Shadow pass: one depth material per kind of object.
// three.js (r160) draws every shadow caster with the same MeshDepthMaterial. That material's shader
// differs for plain meshes, InstancedMesh (trees, lamps, parked scooters ...) and SkinnedMesh
// (people), and the shadow pass walks the scene in tree order, so it switched between those variants
// thousands of times a frame, re-checking the program each time (getProgram / getParameters showed up
// as a big part of the CPU time of a frame). Giving instanced and skinned casters a depth material of
// their own keeps each variant on its own material, so nothing switches.
// Below high quality, tiny casters (under TINY m across, ~3 texels of the 2048 shadow map: scooter
// mirrors, small parts of people and furniture) skip the shadow pass too: about half of the shadow
// draw calls for shadows nobody can see. They cast again when the quality goes back to high.
import * as THREE from 'three';

const make = () => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); // same as three's own
const DEPTH = { inst: make(), skin: make() };

// casters whose material needs its own depth variant (alpha-tested leaves ...) keep three's handling
const needsOwn = (m) =>
  (m.alphaTest > 0 && (m.map || m.alphaMap)) ||
  (m.displacementMap && m.displacementScale !== 0) ||
  (m.clippingPlanes && m.clippingPlanes.length);

const TINY = 0.15; // bounding-sphere radius (m)
function tiny(o) {
  if (o.isInstancedMesh || !o.geometry) return false;
  const g = o.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < TINY;
}
function tag(o, skipTiny) {
  if (!o.isMesh) return;
  if (o.userData.tinyShadow) {
    if (!skipTiny) {
      o.castShadow = true;
      o.userData.tinyShadow = false;
    }
    return;
  }
  if (!o.castShadow) return;
  if (skipTiny && tiny(o)) {
    o.castShadow = false;
    o.userData.tinyShadow = true;
    return;
  }
  if (o.customDepthMaterial || !(o.isInstancedMesh || o.isSkinnedMesh)) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  if (mats.some((m) => m && needsOwn(m))) return;
  o.customDepthMaterial = o.isSkinnedMesh ? DEPTH.skin : DEPTH.inst;
}

// tags the scene now and again every `everyMs` (people and vehicles appear while you play);
// skipTiny(): whether tiny casters should skip the shadow pass right now
export function installShadowDepth(renderer, scene, skipTiny = () => false, everyMs = 1000) {
  const sm = renderer.shadowMap,
    render = sm.render.bind(sm);
  let next = 0;
  sm.render = (lights, sc, camera) => {
    const now = performance.now();
    if (now >= next) {
      next = now + everyMs;
      const t = skipTiny();
      scene.traverse((o) => tag(o, t));
    }
    render(lights, sc, camera);
  };
}
