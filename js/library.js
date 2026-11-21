// 圖書館門口（張靜愚紀念圖書館南面、面向懷恩樓的那片草地，緊貼圖書館南牆前）一個發光的黃色圓圈：
// 站上去按 E 會問要不要開啟外部網站「中原大學電子書 HyRead」，確定的話用新分頁打開。
import * as THREE from 'three';
import { surfaceAt } from './terrain.js';

const SPOT = { x: -170, z: -5 };          // user's pick on the aerial view (square D3): the lawn just south of the library wall
const URL = 'https://cycu.ebook.hyread.com.tw/';
const NAME = '中原大學電子書 HyRead';

export class LibraryLink {
  constructor(game) {
    this.g = game;
    const y = surfaceAt(SPOT.x, SPOT.z) + 0.03;
    const grp = this.grp = new THREE.Group(); grp.position.set(SPOT.x, y, SPOT.z);
    const glow = (col, o) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48).rotateX(-Math.PI / 2), glow('#ffd23f', 0.28));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.18, 64).rotateX(-Math.PI / 2), glow('#ffe066', 0.95));
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.6, 64).rotateX(-Math.PI / 2), glow('#ffd23f', 0.25));
    disc.position.y = 0.005; halo.position.y = 0.002; ring.position.y = 0.008;
    grp.add(disc, ring, halo);
    for (const o of [disc, ring, halo]) o.renderOrder = 2;
    game.scene.add(grp);
    // pulse
    let t = 0;
    game.interiors.updaters.push((dt) => {
      t += dt; const k = 0.5 + 0.5 * Math.sin(t * 3);
      ring.material.opacity = 0.65 + 0.35 * k; halo.material.opacity = 0.12 + 0.2 * k; disc.material.opacity = 0.18 + 0.14 * k;
      halo.scale.setScalar(1 + 0.08 * k);
    });
    game.interiors.actions.push({ x: SPOT.x, z: SPOT.z, r: 1.3, y: 0, anyY: true,
      label: () => `按 <kbd>E</kbd> 開啟「${NAME}」`, fn: () => this.ask() });
  }
  // confirm first: it leaves the game for an outside website (new tab)
  ask() {
    const g = this.g;
    document.exitPointerLock?.();
    g.modal('📚 開啟外部網站？', `<p style="margin:0 0 8px;line-height:1.7">要在新分頁開啟 <b>${NAME}</b> 嗎？</p>
      <p style="margin:0 0 14px;font-size:12px;opacity:.75;word-break:break-all">${URL}</p>
      <div class="modal-btns"><button class="menu-btn primary" id="libGo"><span>🔗 開啟網站</span><small>Enter</small></button>
      <button class="menu-btn" id="libNo"><span>取消</span><small>Esc</small></button></div>`, 'HYREAD');
    const done = (go) => {
      removeEventListener('keydown', key, true);
      g.closeModal(); g.resume();
      if (go) { window.open(URL, '_blank', 'noopener'); g.hud.toast(`📚 已在新分頁開啟 ${NAME}`, 'good', 2200); }
    };
    const key = (e) => {
      if (!g._modalOpen) { removeEventListener('keydown', key, true); return; }
      const y = e.code === 'Enter' || e.code === 'NumpadEnter', n = e.code === 'Escape';
      if (!y && !n) return; e.preventDefault(); e.stopPropagation(); done(y);
    };
    addEventListener('keydown', key, true);
    document.getElementById('libGo').onclick = () => done(true);
    document.getElementById('libNo').onclick = () => done(false);
  }
}
