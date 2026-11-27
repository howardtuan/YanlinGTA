// 有實體的 AI：M.O.N.D.A.Y（青，舊正門起點）、W.E.D.N.E.S.D.A.Y（紫，資管系館前）在地圖上的樣子 ——
// 一個浮在半空中的 3D 全息圓圈（跟右下角 S.U.N.D.A.Y 同一套圖樣，src/graphics/HoloRing.js），取代以前的小安、阿哲。
// 結構：三層各自反向旋轉的光弧貼圖（前後錯開一點，有視差）永遠轉向鏡頭，外面再套兩個會翻轉的陀螺儀光環、
// 一團球殼狀的光點，底下有投影光柱和地面光圈。全部是加色混合、不寫深度、顏色超過 1，夜裡會被 bloom 帶出光暈。
// makeHoloNpc() 回傳跟 makeMissionNpc()（src/entities/NPC.js）一樣的形狀，主線任務、game.npcs 迴圈照用。
import * as THREE from 'three';
import { HOLO_AI, drawHolo } from '../graphics/HoloRing.js';
import { canvasTexture, uploadAndRelease } from '../graphics/GpuMemLifecycle.js';
import { makeLabel } from '../world/MapBuilder.js';
import { surfaceAt } from '../world/Terrain.js';

const glow = (hex, k = 1.8) => new THREE.Color(hex).multiplyScalar(k);
const addMat = (o) =>
  Object.assign(o, {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

const texCache = new Map();
const texOf = (pal, o) => {
  const key = `${pal.id}|${JSON.stringify(o)}`;
  if (!texCache.has(key)) {
    const t = canvasTexture(512, 512, (g, s) => drawHolo(g, s, 3.7, pal, o), false);
    if (t.isCanvasTexture) {
      t.anisotropy = 4;
      uploadAndRelease(t);
    }
    texCache.set(key, t);
  }
  return texCache.get(key);
};
let dotTex = null;
const dot = () => {
  if (dotTex) return dotTex;
  dotTex = canvasTexture(
    32,
    32,
    (x) => {
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
    },
    false
  );
  if (dotTex.isCanvasTexture) uploadAndRelease(dotTex);
  return dotTex;
};

// the floating ring itself (no label): { root, update(dt), pal }
export function createHoloAI(name, { radius = 1, height = 1.6 } = {}) {
  const pal = HOLO_AI[name] || HOLO_AI['M.O.N.D.A.Y'];
  const R = radius;
  const root = new THREE.Group();
  root.name = `holo:${pal.id}`;
  const holo = new THREE.Group();
  holo.position.y = height;
  root.add(holo);

  // 1) the face: three layers of arcs, turned towards the camera
  const face = new THREE.Group();
  holo.add(face);
  const plane = new THREE.PlaneGeometry(R * 2.2, R * 2.2);
  const layers = [
    { o: { min: 0.66, max: 1.2, blocks: false, swirl: false, core: false }, z: 0, spin: 0.16 },
    {
      o: { min: 0.34, max: 0.7, ticks: false, halo: false, swirl: false, core: false },
      z: 0.09,
      spin: -0.27,
    },
    { o: { min: 0, max: 0.38, ticks: false, halo: false }, z: -0.08, spin: 0.55 },
  ].map((L) => {
    const m = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial(
        addMat({
          map: texOf(pal, L.o),
          color: new THREE.Color(2.3, 2.3, 2.3),
          side: THREE.DoubleSide,
        })
      )
    );
    m.position.z = L.z;
    m.renderOrder = 5;
    face.add(m);
    return { m, spin: L.spin };
  });
  // turn the face to the camera (around the vertical axis) just before it is drawn
  layers[0].m.onBeforeRender = (_r, _s, cam) => {
    const p = root.position;
    face.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z) - root.rotation.y;
  };

  // 2) gyroscope rings tumbling around the face
  const gyros = [
    [R * 1.08, 0.011, pal.main, [Math.PI / 2, 0, 0], [0.0, 0.55, 0.0]],
    [R * 0.96, 0.008, pal.core, [0.3, 0, 0.9], [0.42, 0.0, 0.3]],
    [R * 1.16, 0.006, pal.deep, [1.2, 0.4, 0], [0.0, -0.35, 0.22]],
  ].map(([rr, tube, col, rot, spin]) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(rr, tube, 6, 96),
      new THREE.MeshBasicMaterial(addMat({ color: glow(col, 2.2), opacity: 0.85 }))
    );
    m.rotation.set(...rot);
    m.renderOrder = 5;
    holo.add(m);
    return { m, spin };
  });

  // 3) a shell of glowing dots
  const N = 260,
    pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1,
      a = Math.random() * Math.PI * 2,
      rr = R * (0.45 + Math.random() * 0.75),
      s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * rr, u * rr * 0.9, Math.sin(a) * s * rr], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    pg,
    new THREE.PointsMaterial(
      addMat({
        map: dot(),
        color: glow(pal.main, 2),
        size: 0.07,
        sizeAttenuation: true,
        opacity: 0.9,
      })
    )
  );
  pts.renderOrder = 5;
  holo.add(pts);

  // 4) the projector beam from the ground and a glowing circle on the ground
  const beamH = height - R * 0.55;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.55, 0.06, beamH, 24, 1, true),
    new THREE.MeshBasicMaterial(
      addMat({ color: glow(pal.main, 1.2), opacity: 0.09, side: THREE.DoubleSide })
    )
  );
  beam.position.y = beamH / 2;
  root.add(beam);
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 1.6, R * 1.6),
    new THREE.MeshBasicMaterial(
      addMat({
        map: texOf(pal, {
          min: 0.5,
          max: 1.2,
          blocks: false,
          swirl: false,
          core: false,
          sparks: false,
        }),
        color: new THREE.Color(1.2, 1.2, 1.2),
        opacity: 0.55,
      })
    )
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.04;
  root.add(pad);

  let t = Math.random() * 10;
  const update = (dt = 0.016) => {
    t += dt;
    for (const L of layers) L.m.rotation.z += L.spin * dt;
    for (const G of gyros) {
      G.m.rotation.x += G.spin[0] * dt;
      G.m.rotation.y += G.spin[1] * dt;
      G.m.rotation.z += G.spin[2] * dt;
    }
    pts.rotation.y += 0.25 * dt;
    pts.material.opacity = 0.7 + 0.25 * Math.sin(t * 2.1);
    layers[2].m.material.opacity = 0.85 + 0.15 * Math.sin(t * 3.3);
    holo.position.y = height + Math.sin(t * 1.3) * 0.05;
    pad.rotation.z -= 0.2 * dt;
    beam.material.opacity = 0.07 + 0.03 * Math.sin(t * 2.7);
  };
  return { root, update, pal, face };
}

// a story AI standing on the map: same shape as makeMissionNpc's NPCs ({ ch, name, pos, mark, label, pose })
export function makeHoloNpc(scene, name, x, z, heading = 0) {
  const ai = createHoloAI(name);
  const root = ai.root;
  root.position.set(x, surfaceAt(x, z), z);
  root.rotation.y = heading;
  scene.add(root);
  // name tag and "!" above the ring (the game loop bobs mark.position.y around 2.75, so they sit in a raised group)
  const top = new THREE.Group();
  top.position.y = 0.6;
  root.add(top);
  const lbl = makeLabel(`${ai.pal.title} ${name}`, { height: 0.3, color: ai.pal.main });
  lbl.position.set(0, 2.33, 0);
  top.add(lbl);
  const mark = makeLabel('!', { height: 0.45, color: '#111', bg: ai.pal.main });
  mark.position.set(0, 2.75, 0);
  top.add(mark);
  return {
    ch: { root, update: (dt) => ai.update(dt) },
    name,
    pos: root.position,
    mark,
    label: lbl,
    pose: null,
    holo: true,
  };
}
