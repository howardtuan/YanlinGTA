// 衣櫃造型穿到模型上：彥霖本人（src/ui/Wardrobe.js、存檔）和多人麻將牌桌上別的玩家（src/systems/mahjong/MahjongScene.js）
// 都走這裡。上衣、褲子的顏色與長短由 createCharacter 組（characterOpts），帽子和套裝配件（領帶、肩章、機翼徽章、絲巾、名牌）
// 掛在頭／軀幹上。麥當勞制服沿用打工那套（src/systems/minigames/McUniform.js 的 dressCrew）。
// 航空公司一律是遊戲裡的「彥霖航空」（直升機、機翼徽章都是），不放任何真實航空公司的名稱或標誌。
import * as THREE from 'three';
import { createCharacter } from '../entities/Character.js';
import { YANLIN_LOOK } from '../entities/Player.js';
import { dressCrew } from './minigames/McUniform.js';
import { buildHat } from '../entities/Hats.js';
import { normalizeLook, wornParts, characterOpts, hatById } from './OutfitData.js';

let M = null;
const tone = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function mats() {
  if (M) return M;
  M = {
    gold: tone('#d4a93a', { metalness: 0.75, roughness: 0.3 }),
    black: tone('#141416', { roughness: 0.55 }),
    visor: tone('#0c0c0e', { roughness: 0.2, metalness: 0.2 }),
    navy: tone('#1b2233', { roughness: 0.7 }),
    white: tone('#f6f6f4', { roughness: 0.6 }),
    tie: tone('#1b2233', { roughness: 0.5 }),
    scarf: tone('#e07b39', { roughness: 0.75 }),
  };
  return M;
}

// ------------------------------------------------------------------ textures
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
// 彥霖航空的機翼徽章：金色雙翼，中間圓章寫「彥」，下面「彥霖航空」
function wingsTex() {
  return canvasTex('wings', 256, 112, (g, w) => {
    g.fillStyle = '#e2b84a';
    g.strokeStyle = '#8a6a1c';
    g.lineWidth = 2;
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        const y = 26 + i * 9;
        g.moveTo(w / 2 + s * 18, y);
        g.quadraticCurveTo(
          w / 2 + s * 70,
          y - 12 + i * 2,
          w / 2 + s * (118 - i * 18),
          y - 6 + i * 3
        );
        g.lineTo(w / 2 + s * (112 - i * 18), y + 6);
        g.quadraticCurveTo(w / 2 + s * 60, y + 6, w / 2 + s * 18, y + 8);
        g.closePath();
        g.fill();
        g.stroke();
      }
    g.beginPath();
    g.arc(w / 2, 40, 22, 0, 7);
    g.fill();
    g.stroke();
    g.fillStyle = '#1b2233';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 26px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('彥', w / 2, 41);
    g.fillStyle = '#e2b84a';
    g.font = '900 24px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('彥霖航空', w / 2, 92);
  });
}
// 胸前名牌：白底深藍字
function badgeTex(text) {
  return canvasTex(`badge:${text}`, 192, 64, (g, w, h) => {
    g.fillStyle = '#f7f7f4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b2233';
    g.fillRect(0, 0, 14, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 28px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText(text, w / 2 + 6, h / 2 + 1);
  });
}
const decal = (tex, w, h) =>
  new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.2, roughness: 0.5 })
  );

// 機長帽：深藍帽頂（前面略高）、黑色帽帶、亮黑帽簷、金色帽繩和機翼徽章
function pilotCap() {
  const m = mats(),
    g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.136, 0.134, 0.05, 28), m.black);
  band.scale.set(1, 1, 1.08);
  band.position.y = 0.17;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.14, 0.05, 28), m.navy);
  crown.scale.set(1, 1, 1.1);
  crown.position.set(0, 0.215, 0.006);
  crown.rotation.x = -0.1;
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.01, 24, 1, false, -Math.PI / 2, Math.PI),
    m.visor
  );
  visor.scale.set(1, 1, 0.72);
  visor.position.set(0, 0.148, 0.09);
  visor.rotation.x = 0.32;
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.137, 0.137, 0.008, 28, 1, true, -Math.PI / 2, Math.PI),
    m.gold
  );
  cord.scale.set(1, 1, 1.09);
  cord.position.y = 0.158;
  const pin = decal(wingsTex(), 0.11, 0.048);
  pin.position.set(0, 0.208, 0.157);
  pin.rotation.x = -0.1;
  g.add(band, crown, visor, cord, pin);
  return g;
}

// ------------------------------------------------------------------ torso pieces (torso-pivot frame = root y - 0.93;
// chest surface about z 0.13-0.14 between torso y 0.32 and 0.52, the neck round y 0.6)
function tie(mat) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.22, 0.006), mat);
  blade.position.set(0, 0.47, 0.135);
  blade.rotation.x = -0.2;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 4, 1), mat);
  tip.rotation.x = Math.PI / 2;
  tip.scale.set(1, 1, 0.8);
  tip.position.set(0, 0.357, 0.157);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.026, 0.016), mat);
  knot.position.set(0, 0.585, 0.105);
  g.add(blade, tip, knot);
  return g;
}
function epaulettes(stripes) {
  const m = mats(),
    g = new THREE.Group();
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.065), m.black));
    for (let i = 0; i < stripes; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.014, 0.066), m.gold);
      st.position.x = 0.04 - i * 0.017;
      e.add(st);
    }
    e.position.set(0.13 * s, 0.585, -0.005);
    e.rotation.z = -0.3 * s;
    e.scale.x = s; // the stripes sit at the shoulder end on both sides
    g.add(e);
  }
  return g;
}
function wingsPin() {
  const p = decal(wingsTex(), 0.1, 0.044);
  p.position.set(0.078, 0.475, 0.142);
  p.rotation.y = 0.14;
  return p;
}
function nameBadge(text) {
  const b = decal(badgeTex(text), 0.075, 0.025);
  b.position.set(-0.08, 0.42, 0.141);
  b.rotation.y = -0.12;
  return b;
}
// 空服員絲巾：繞頸一圈，前面打結、兩片垂下
function scarf() {
  const m = mats(),
    g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.016, 6, 22), m.scarf);
  ring.rotation.x = Math.PI / 2 + 0.25;
  ring.scale.set(1.05, 1, 1);
  ring.position.set(0, 0.6, 0.012);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), m.scarf);
  knot.position.set(0.012, 0.565, 0.095);
  g.add(ring, knot);
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.006), m.scarf);
    tail.position.set(0.012 + 0.016 * s, 0.525, 0.112);
    tail.rotation.set(-0.35, 0, 0.22 * s);
    g.add(tail);
  }
  return g;
}

// ------------------------------------------------------------------ dress / undress
// Put the look's hat and set pieces on a figure that was built with characterOpts(look). Returns an undo function.
export function dressOutfit(ch, look) {
  const W = wornParts(look),
    added = [];
  const add = (parent, o) => {
    if (!parent) return;
    o.traverse((c) => {
      if (c.isMesh) c.castShadow = false;
    });
    parent.add(o);
    added.push([parent, o]);
  };
  let undoCrew = null;
  if (W.set === 'mc') undoCrew = dressCrew(ch, { name: '彥霖' });
  else if (W.set === 'pilot') {
    add(ch.head, pilotCap());
    add(ch.torso, tie(mats().tie));
    add(ch.torso, epaulettes(4));
    add(ch.torso, wingsPin());
    add(ch.torso, nameBadge('機長 彥霖'));
  } else if (W.set === 'cabin') {
    add(ch.torso, scarf());
    add(ch.torso, wingsPin());
    add(ch.torso, nameBadge('彥霖航空'));
  }
  const H = W.setHat || hatById(W.hat); // a set's own hat (理查's bucket hat) or the one picked
  if (H) add(ch.head, buildHat(H.kind, H.color));
  const parts = added.map(([, o]) => o);
  ch.outfit = {
    parts,
    // take everything off for a moment (the 麥當勞 shift puts its own uniform on, src/systems/minigames/McShift.js)
    hide() {
      if (undoCrew) {
        undoCrew();
        undoCrew = null;
        const back = () => {
          undoCrew = dressCrew(ch, { name: '彥霖' });
        };
        for (const o of parts) o.visible = false;
        return () => {
          back();
          for (const o of parts) o.visible = true;
        };
      }
      for (const o of parts) o.visible = false;
      return () => {
        for (const o of parts) o.visible = true;
      };
    },
  };
  return () => {
    undoCrew?.();
    for (const [p, o] of added) p.remove(o);
    ch.outfit = null;
  };
}

// a whole 彥霖 figure wearing the look (the player's own figure, and the other players at the 277 mahjong table)
export function makeOutfitFigure(look) {
  const L = normalizeLook(look);
  const ch = createCharacter({ ...YANLIN_LOOK, ...characterOpts(L) });
  dressOutfit(ch, L);
  return ch;
}

// put a look on the player (wardrobe, loading a save): the figure is rebuilt where it stands
export function wearLook(player, look) {
  if (!player) return;
  player.setLook(normalizeLook(look), makeOutfitFigure);
}

// take the wardrobe's hat and set pieces off for a while (a work uniform goes on instead); returns the undo
export function hideOutfit(ch) {
  return ch?.outfit?.hide() || (() => {});
}
