// 麥當勞員工制服 — the crew look of the real 中原店 (grey crew shirt, black pants, black cap with the arches
// at the counter or a hairnet in the kitchen, name badge, charcoal waist apron with yellow ties).
// dressCrew() puts it on any createCharacter() figure and returns an undo function, so 彥霖 can take it
// off again after a shift; the shop's NPC crew wear it permanently.
import * as THREE from 'three';

export const CREW_SHIRT = '#6a6d72';
let M = null;
function mats() {
  if (M) return M;
  M = {
    shirt: new THREE.MeshStandardMaterial({ color: CREW_SHIRT, roughness: 0.92 }),
    black: new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.7 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#2a2b2f', roughness: 0.9, side: THREE.DoubleSide }),
    tie: new THREE.MeshStandardMaterial({ color: '#ffbc0d', roughness: 0.6 }),
    net: new THREE.MeshStandardMaterial({ map: netTex(), color: '#ffffff', roughness: 1, metalness: 0, envMapIntensity: 0.2 }),
    logo: new THREE.MeshStandardMaterial({ map: mTex(), transparent: true, roughness: 0.6 }),
  };
  return M;
}

// opts: name (badge text), hairnet (kitchen: hairnet instead of the cap)
export function dressCrew(ch, { name = '', hairnet = false } = {}) {
  const m = mats(), added = [], swapped = [];
  const add = (parent, o) => { o.traverse(c => { if (c.isMesh) c.castShadow = c.geometry.boundingSphere?.radius > 0.04 || !!c.userData.shadow; }); parent.add(o); added.push([parent, o]); };
  // crew shirt: a continuous skinned body (bodymesh.js) is recoloured; the old part-built body swaps the
  // material of every part drawn in the figure's own shirt material (torso, hem, shoulders, sleeves)
  const recolor = ch.bodyMesh?.userData.recolor;
  if (recolor) recolor({ shirt: CREW_SHIRT });
  else {
    const own = ch.torso.children.find(o => o.isMesh)?.material;
    if (own && own !== m.shirt) ch.root.traverse(o => { if (o.isMesh && o.material === own) { swapped.push([o, own]); o.material = m.shirt; } });
  }
  // head: cap (counter) or hairnet (kitchen)
  const hat = new THREE.Group();
  if (hairnet) {
    // sized to enclose the hair cap of character.js (r 0.127, y-scale 1.1, centre y 0.108)
    const net = new THREE.Mesh(new THREE.SphereGeometry(0.135, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m.net);
    net.scale.set(1.03, 1.13, 1.08); net.position.set(0, 0.106, -0.006); hat.add(net);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.139, 0.006, 5, 32), m.net);
    band.rotation.x = Math.PI / 2 + 0.12; band.scale.set(1.0, 1.06, 1); band.position.set(0, 0.112, -0.006); hat.add(band);
  } else {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.black);
    crown.scale.set(1.0, 0.78, 1.06); crown.position.y = 0.135; crown.userData.shadow = true; hat.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), m.black);
    brim.scale.set(1, 1, 0.9); brim.position.set(0, 0.14, 0.085); brim.rotation.x = 0.12; hat.add(brim);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.055), m.logo);
    logo.position.set(0, 0.19, 0.122); logo.rotation.x = -0.32; hat.add(logo);
  }
  add(ch.head, hat);
  // name badge on the chest
  if (name) {
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.03), new THREE.MeshStandardMaterial({ map: badgeTex(name), roughness: 0.5 }));
    badge.position.set(-0.08, 0.42, 0.139); badge.rotation.y = -0.12; add(ch.torso, badge);
  }
  // waist apron: charcoal panel with the arches, yellow ties round the waist
  const apron = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.27, 0.46, 16, 1, true, -1.05, 2.1), m.cloth);
  panel.scale.set(1, 1, 0.78); panel.position.set(0, -0.2, 0); panel.userData.shadow = true; apron.add(panel);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.011, 6, 28), m.tie);
  band.rotation.x = Math.PI / 2; band.scale.set(1.12, 0.86, 1); band.position.y = 0.03; apron.add(band);
  for (const s of [-1, 1]) { // tie ends hanging at the back
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.006), m.tie);
    end.position.set(0.035 * s, -0.05, -0.172); end.rotation.z = 0.12 * s; apron.add(end);
  }
  const am = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.052), m.logo);
  am.position.set(0.07, -0.08, 0.205); am.rotation.y = 0.32; apron.add(am);
  add(ch.hips, apron);
  return () => {
    for (const [p, o] of added) p.remove(o);
    for (const [o, mat] of swapped) o.material = mat;
    if (recolor) recolor({});
  };
}

// ------------------------------------------------------------------ small textures
let _m = null; const _b = new Map();
function mTex() {
  if (_m) return _m;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const g = cv.getContext('2d');
  g.fillStyle = '#ffc72c'; g.font = '900 96px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.scale(1.25, 1); g.fillText('M', 51, 52); g.restore();
  _m = new THREE.CanvasTexture(cv); _m.colorSpace = THREE.SRGBColorSpace; return _m;
}
function netTex() {
  // white hairnet: fine mesh over the dark hair, gathered by the elastic band
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#9a9ea3'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#eef0f2'; g.lineWidth = 2.2;
  for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t;
}
function badgeTex(name) {
  if (_b.has(name)) return _b.get(name);
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 160, 64); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 36, 64);
  g.fillStyle = '#ffc72c'; g.font = '900 34px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', 18, 34);
  g.fillStyle = '#1b1b1b'; g.font = '900 34px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText(name, 98, 34);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; _b.set(name, t); return t;
}
