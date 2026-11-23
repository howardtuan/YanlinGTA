// 📷 拍照模式：手機的「相機」App 打開後，手機翻過來變成後鏡頭對著前方，像真的拿著手機在拍照。
// 視角換成彥霖眼睛的高度（第一人稱，自己的身體藏起來，src/entities/FirstPerson.js 的 photo），
// 畫面中間是一支直拿的手機，觀景窗就是遊戲畫面本身；快門只存觀景窗那一塊。
//   滑鼠／方向鍵／右搖桿 — 把手機往上下左右轉
//   W A S D／左搖桿     — 拿著手機走動
//   左鍵／Space／Enter  — 拍照（手把 X）
//   E／Esc／Backspace   — 收起相機回到手機（這次有拍就到「照片」，沒拍就回主畫面；手把 A）
// Game.js 每格先呼叫 update()，它會吃掉這些按鍵，所以拍照時不會發傳單、跳起來或打開暫停選單。
import { LABEL_LAYER } from '../world/MapBuilder.js';

const hhmm = (m) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const TURN = 520; // arrow keys: "mouse pixels" per second

export class PhotoMode {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.el = null;
    this.n = 0;
  }
  _build() {
    const el = document.createElement('div');
    el.id = 'photoMode';
    el.className = 'hidden';
    el.innerHTML = `<div class="pm-phone"><div class="pm-top"><span class="pm-time"></span><b>相機</b><span>📶 🔋</span></div>
      <div class="pm-vf"><i class="pm-g1"></i><i class="pm-g2"></i><i class="pm-g3"></i><i class="pm-g4"></i><span class="pm-focus"></span></div>
      <div class="pm-bar"><button class="pm-thumb"></button><button class="pm-shutter" aria-label="拍照"></button><button class="pm-exit" aria-label="返回">↩</button></div></div>
      <div class="pm-hint"></div>`;
    document.getElementById('app')?.appendChild(el) || document.body.appendChild(el);
    el.querySelector('.pm-shutter').onclick = () => this.shoot();
    el.querySelector('.pm-exit').onclick = () => this.exit();
    el.querySelector('.pm-thumb').onclick = () => this.exit('photos');
    this.el = el;
    // Esc while the mouse is captured only frees the mouse (the browser eats the key): put the camera away then
    document.addEventListener('pointerlockchange', () => {
      if (this.on && !document.pointerLockElement && !this.g.input.touch && this._locked)
        this.exit();
      this._locked = !!document.pointerLockElement;
    });
  }
  enter() {
    const g = this.g;
    if (this.on) return;
    if (!this.el) this._build();
    this.on = true;
    this.n = 0;
    g.phone.close();
    g.phone._last = null; // opening the phone again later must not jump straight back into the camera
    g.fpv.photo = true;
    g.camera.layers.disable(LABEL_LAYER); // no floating name labels in the photos
    g.rig.pitch = 0.05; // hold the phone about level
    this._thumb();
    this.el.querySelector('.pm-hint').innerHTML = g.input.touch
      ? '拖曳畫面 轉動手機 · 搖桿 走動 · ⚪ 拍照 · ↩ 返回'
      : '<kbd>滑鼠</kbd>／<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 轉動手機 · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走動 · <kbd>左鍵</kbd>／<kbd>Space</kbd> 拍照 · <kbd>E</kbd>／<kbd>Esc</kbd> 返回';
    this.el.classList.remove('hidden', 'pm-flip');
    void this.el.offsetWidth;
    this.el.classList.add('pm-flip');
    document.body.classList.add('photo-mode');
    g.audio.tap?.();
    g.lockPointer();
  }
  // back to the phone (its camera app, or the photos)
  exit(app = this.n ? 'photos' : null) {
    const g = this.g;
    if (!this.on) return;
    this.on = false;
    g.fpv.photo = false;
    g.camera.layers.enable(LABEL_LAYER);
    this.el.classList.add('hidden');
    document.body.classList.remove('photo-mode');
    g.openPhone();
    if (app) g.phone.openApp(app);
    else g.phone.home();
  }
  // only the viewfinder part of the screen goes into the photo
  shoot() {
    const g = this.g,
      cv = g.renderer.domElement,
      vf = this.el.querySelector('.pm-vf').getBoundingClientRect(),
      cr = cv.getBoundingClientRect();
    const kx = cv.width / cr.width,
      ky = cv.height / cr.height;
    const sx = Math.max(0, (vf.left - cr.left) * kx),
      sy = Math.max(0, (vf.top - cr.top) * ky);
    const sw = Math.min(cv.width - sx, vf.width * kx),
      sh = Math.min(cv.height - sy, vf.height * ky);
    g.capture((url) => {
      const img = new Image();
      img.onload = () => {
        const out = document.createElement('canvas'),
          k = Math.min(1, 1080 / sh);
        out.width = Math.round(sw * k);
        out.height = Math.round(sh * k);
        out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
        const ph = g.phone;
        ph.photos.unshift(out.toDataURL('image/jpeg', 0.88));
        if (ph.photos.length > 24) ph.photos.pop();
        this._thumb();
      };
      img.src = url;
    });
    g.audio.shutter?.();
    this.el.classList.remove('pm-snap');
    void this.el.offsetWidth;
    this.el.classList.add('pm-snap');
    this.n++;
  }
  _thumb() {
    const p = this.g.phone.photos[0],
      t = this.el?.querySelector('.pm-thumb');
    if (t) t.innerHTML = p ? `<img src="${p}" alt="">` : '';
  }
  // every frame before the rest of the game reads the input; returns true while the camera is up
  update(dt, inp) {
    if (!this.on) return false;
    const g = this.g;
    if (g.hud.inDialog || g.state !== 'play') return true;
    this.el.querySelector('.pm-time').textContent = hhmm(g.clock);
    const ax = (inp.down('ArrowRight') ? 1 : 0) - (inp.down('ArrowLeft') ? 1 : 0),
      ay = (inp.down('ArrowDown') ? 1 : 0) - (inp.down('ArrowUp') ? 1 : 0);
    inp.mdx += ax * TURN * dt;
    inp.mdy += ay * TURN * dt * 0.7;
    if (inp.hit('KeyE', 'Escape', 'Backspace')) {
      ['KeyE', 'Escape', 'Backspace'].forEach((k) => inp.pressed.delete(k));
      this.exit();
      return true;
    }
    if (inp.hit('Mouse0', 'Space', 'Enter', 'NumpadEnter')) this.shoot();
    for (const k of [
      'Mouse0',
      'Space',
      'Enter',
      'NumpadEnter',
      'KeyF',
      'KeyG',
      'KeyM',
      'KeyV',
      'Tap',
    ])
      inp.pressed.delete(k);
    return true;
  }
}
