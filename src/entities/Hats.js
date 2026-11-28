// 帽子模型：衣櫃（src/systems/Outfits.js）和路人（src/entities/Character.js 的 opts.hat）共用
import * as THREE from 'three';

const hats = new Map();
const hatMat = (c) => {
  if (!hats.has(c))
    hats.set(
      c,
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide })
    );
  return hats.get(c);
};

// Hats (head-pivot frame; the hair cap of
// src/entities/Character.js is a sphere r 0.127 scaled y 1.1 round y 0.108, so its top is near y 0.25)
export function buildHat(kind, color) {
  const g = new THREE.Group(),
    m = hatMat(color);
  if (kind === 'cap') {
    // a baseball cap big enough to cover 彥霖's bowl cut (the crown of the hair reaches y 0.26, its sides r 0.142),
    // the brim sticking out over the bangs, a button on top
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      m
    );
    crown.scale.set(1.02, 0.86, 1.08);
    crown.position.set(0, 0.14, -0.004);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.014, 24, 1, false, -Math.PI / 2, Math.PI),
      m
    );
    brim.scale.set(1, 1, 1.1);
    brim.position.set(0, 0.145, 0.1);
    brim.rotation.x = 0.3;
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), m);
    btn.position.set(0, 0.268, -0.004);
    g.add(crown, brim, btn);
  } else if (kind === 'bucket') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.138, 0.1, 24, 1, false), m);
    crown.position.y = 0.2;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.05, 28, 1, true), m);
    brim.position.y = 0.135;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.139, 0.139, 0.022, 24, 1, true),
      hatMat('#5a4a32')
    );
    band.position.y = 0.162;
    g.add(crown, brim, band);
    g.rotation.x = -0.08;
  } else if (kind === 'beanie') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      m
    );
    dome.scale.set(1.02, 1.12, 1.08);
    dome.position.set(0, 0.11, -0.006);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.157, 0.16, 0.05, 24, 1, true), m);
    cuff.scale.set(1, 1, 1.06);
    cuff.position.set(0, 0.125, -0.006);
    cuff.rotation.x = -0.12;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), hatMat('#f2f0ea'));
    pom.position.set(0, 0.3, -0.01);
    g.add(dome, cuff, pom);
  } else if (kind === 'santa') {
    // 聖誕老人帽（src/entities/XmasPudding.js 男宿的聖誕夜）：紅色軟圓錐往後垂，白色毛邊和毛球
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 20, 1, true), m);
    cone.position.set(0, 0.26, -0.03);
    cone.rotation.x = -0.55;
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.142, 0.032, 8, 24).rotateX(Math.PI / 2),
      hatMat('#f4f2ee')
    );
    cuff.scale.set(1, 1, 1.06);
    cuff.position.set(0, 0.135, -0.006);
    cuff.rotation.x = -0.12;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), hatMat('#f4f2ee'));
    pom.position.set(0, 0.36, -0.17);
    g.add(cone, cuff, pom);
  }
  return g;
}
