import { controlsHTML, bindControls } from './Controls.js';
import { saveSettings } from '../systems/AudioSystem.js';
import { readSave, writeSave, applySave, clearSave } from '../systems/SaveSystem.js';
import { Q_NAME, resolveQuality } from './GameLoop.js';

const $ = id => document.getElementById(id);
const onClick = (id, fn) => {
  const el = $(id);
  if (el) el.onclick = fn;
  else console.warn(`missing #${  id}`);
};

export const lockPointer = el => {
  try {
    const r = el.requestPointerLock?.();
    if (r && r.catch) r.catch(() => {});
  } catch (_e) {}
};

const setLoad = (p, t) => {
  const f = $('loadFill');
  if (f) f.style.width = `${p * 100  }%`;
  const tx = $('loadText');
  if (tx) tx.textContent = `${t || '載入中 LOADING'} · ${Math.round(p * 100)}%`;
};

const ABOUT_HTML = `<div class="about">
<p><b style="font-size:20px;color:#ffd23f">彥霖 Yanlin</b>　第34屆 中原大學 資訊管理學系 系學會會長候選人</p>
<p style="font-size:20px;font-weight:900">資管要贏　票投彥霖</p>
<p>《中原順起來》是彥霖的競選宣傳小遊戲。整個地圖依照真實的中原大學與周邊街區（中北路、實踐路、新中北路、中原夜市）搭建，建築位置與高度來自 OpenStreetMap。</p>
<p>在遊戲裡，你就是彥霖：</p>
<ul><li>騎著粉白色 SYM JET SL 穿梭校園送傳單</li><li>走進資管系館上樓、進教室，用電腦教室的電腦上網、玩踩地雷</li><li>去活動中心的麥當勞點餐，或從櫃台後面的員工入口打工值班、幫同學出餐賺錢拉票</li><li>坐進警衛室值班</li><li>一早衝去中原夜市那條街買早餐</li><li>對路上的同學發傳單拉票</li><li>在學生活動中心發表政見</li></ul>
<p>真實的投票日，資管要贏，票投 <b style="color:#ffd23f">彥霖</b> 🗳✌</p>
<p style="color:#a9adbf;font-size:12px">地圖資料 © OpenStreetMap contributors，依 ODbL 授權使用。<br>地形資料：內政部 20m 網格數值地形模型（政府資料開放授權條款第1版）。</p></div>`;

export class MenuManager {
  constructor(game) {
    this.game = game;
  }

  setup() {
    const game = this.game;
    const sv = readSave();
    if (sv && $('btnStart')) {
      $('btnStart').innerHTML = `<span>▶ 開始遊戲</span><small>繼續上次進度 · 得票 ${sv.votes} · 選票 ${(sv.ballots || []).length}/34</small>`;
    }
    const startGame = async () => {
      if (game._starting) return;
      game._starting = true;
      game.audio.init(); // music starts on this click (browsers need a gesture)
      $('title').classList.add('hidden');
      await this.splash(5000);
      $('hud').classList.remove('hidden');
      if (game.input.touch) $('touch').classList.remove('hidden');
      game.state = 'play';
      game.input.enabled = true;
      // pointer lock needs a fresh click after the splash
      if (!game.input.touch && !game.prompts.pad) game.hud.toast('點一下畫面鎖定滑鼠視角', 'good', 3000);
      const d = readSave();
      if (d) {
        const m = applySave(game, d);
        game.missions.spawnNpcs(m.done ? 99 : m.idx ?? 0);
        if (m.done) {
          game.missions.done = true;
          game.missions.free = true;
          game.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
        } else {
          // back at the start of the section you were on (progress inside it isn't saved); a timed one waits
          // paused, so its clock only starts when you pick ▶ 繼續任務 in the pause menu
          game.missions.resumeAt(Math.max(0, m.idx ?? 0), m.prog ? { ...m.prog, hits: null, base: null } : m.prog);
          if (game.missions.step && game.missions.timer !== null) game.missions.exit();
        }
        game.hud.toast('💾 進度已載入', 'good', 2200);
      } else {
        game.missions.start();
      }
      $('app').onclick = () => {
        if (game.state === 'play' && !game.input.touch && !game.hud.bigOpen && !game._modalOpen && !game.videoOpen && !game.phone.open && !game.job.active && !game.pc?.isOpen && !game.wardrobe?.isOpen) {
          lockPointer(game.renderer.domElement);
        }
      };
      // auto save every 10 s during play
      window.addEventListener('beforeunload', () => {
        if (!game._noSave && game.state === 'play') writeSave(game);
      });
    };

    onClick('btnStart', startGame);
    onClick('btnControls', () => this.showControls());
    onClick('btnSettings', () => this.openSettings());
    onClick('btnAbout', () => this.modal('關於彥霖', ABOUT_HTML, 'ABOUT'));
    onClick('modalClose', () => this.closeModal());
    onClick('videoClose', () => this.closeVideo());
    // the pause menu (and the settings / controls / delete-save pages opened from it) also closes with Esc or a click on
    // the dark backdrop around it
    addEventListener('keydown', e => {
      if (e.code !== 'Escape' || e.repeat || game.state !== 'paused' || !game._modalOpen) return;
      e.preventDefault();
      game.input.pressed.delete('Escape'); // or the next frame would pause again
      this.closeModal();
    });
    $('modal').addEventListener('click', e => {
      if (e.target === e.currentTarget && game.state === 'paused' && game._modalOpen) this.closeModal();
    });
    onClick('btnEndingCredits', () => this.modal('製作群名單', `<p><b>中原順起來 · 資管要贏 票投彥霖</b></p><p>企劃・程式・地圖：彥霖競選團隊</p><p>致敬：中原大學、OpenStreetMap、Rapier 物理引擎、Three.js</p><p style="color:#a9adbf">感謝所有在中原相遇的師長、同學與朋友！</p>`, 'CREDITS'));
    onClick('btnKeepPlaying', () => {
      $('ending').classList.add('hidden');
      game.state = 'play';
      game._clearCrowd(); // crowd stays for the ending shot, then goes
      game.missions.free = true;
      game.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
      if (!game.input.touch) lockPointer(game.renderer.domElement);
    });
    onClick('btnRestart', () => this.confirmClear(1, true));
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && game.state === 'play' && !game.hud.bigOpen && !game.input.touch && !game._modalOpen && !game._overlay && !game.videoOpen && !game.phone?.open && !game.job?.active && !game.pc?.isOpen && !game.wardrobe?.isOpen) {
        this.pause();
      }
    });
  }

  // artwork + 5 s progress bar shown after pressing Start
  splash(ms) {
    const stages = ['建立地形中', '鋪設中北路與實踐路', '種下校園的樹', '蓋資管系館與電腦教室', '炸好麥當勞的薯條', '幫 SYM JET SL 加滿油', '召喚同學與競選幹部', '印好「資管要贏 票投彥霖」傳單', '準備出發！'];
    $('loading').classList.remove('hidden');
    return new Promise(res => {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        const ease = k < 1 ? k * (0.9 + 0.1 * Math.sin(k * 20)) : 1;
        setLoad(Math.min(1, ease), stages[Math.min(stages.length - 1, Math.floor(k * stages.length))]);
        if (k < 1) requestAnimationFrame(tick);
        else setTimeout(() => {
          $('loading').classList.add('hidden');
          res();
        }, 250);
      };
      tick();
    });
  }

  modal(title, html, sub = '') {
    $('modalTitle').innerHTML = title + (sub ? ` <small class="mh-sub">${sub}</small>` : '');
    $('modalBody').innerHTML = html;
    $('modal').classList.remove('hidden');
    this.game._modalOpen = true;
    $('modal').classList.toggle('wide', sub === 'CONTROLS');
  }

  // 操作說明: keyboard & mouse / gamepad / touch tabs (js/controls.js); opens on the device in use
  showControls(fromPause = false) {
    this.modal('操作說明', controlsHTML(this.game) + (fromPause ? '<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="mBack"><span>▶ 繼續遊戲</span><small>RESUME</small></button></div>' : ''), 'CONTROLS');
    bindControls($('modalBody'));
    if (fromPause) $('mBack').onclick = () => this.closeModal();
  }

  closeModal() {
    $('modal').classList.add('hidden');
    this.game._modalOpen = false;
    if (this.game.state === 'paused') this.resume();
  }

  pause() {
    const game = this.game;
    game.state = 'paused';
    game.audio.setEngine(false, 0); // _update stops while paused, so silence the engine here
    const racing = game.race.state === 'count' || game.race.state === 'race';
    writeSave(game);
    this.modal(
      racing ? '暫停 · 新中北路障礙賽' : '暫停 · 設定',
      `${racing ? '' : this.settingsHTML() 
        }<div class="modal-btns" style="margin-top:14px">
      ${racing ? '<button class="menu-btn primary" id="mQuitRace"><span>🏳 退出比賽</span><small>QUIT RACE</small></button>' : ''}
      <button class="menu-btn ${racing ? '' : 'primary'}" id="mResume"><span>▶ ${racing ? '繼續比賽' : '繼續遊戲'}</span><small>RESUME</small></button>
      ${!racing && game.missions?.canExit ? '<button class="menu-btn" id="mMisQuit"><span>⏹ 退出目前任務</span><small>這一小節的進度不會保存</small></button>' : ''}
      ${racing ? '' : `<button class="menu-btn" id="mGate" ${this.gateBlock() ? 'disabled' : ''}><span>🏫 回到校門口</span><small>${this.gateBlock() || 'BACK TO THE GATE'}</small></button>`}
      <button class="menu-btn" id="mCtrl"><span>⌨ 操作說明</span><small>CONTROLS</small></button>
      <button class="menu-btn" id="mTitle"><span>🏠 儲存並回到主畫面</span><small>SAVE &amp; QUIT</small></button>
      <button class="menu-btn danger" id="mRestart"><span>🗑 清除遊戲紀錄</span><small>DELETE SAVE</small></button></div>`
    );
    if (!racing) this.bindSettings();
    if (racing) {
      $('mQuitRace').onclick = () => {
        game.race.abandon('你退出了比賽');
        this.closeModal();
      };
    }
    $('mResume').onclick = () => this.closeModal();
    if (!racing && $('mGate')) $('mGate').onclick = () => this.toGate();
    if ($('mMisQuit')) {
      $('mMisQuit').onclick = () => {
        game.missions.exit();
        this.closeModal();
        game.hud.toast('⏹ 已退出任務：回到地圖上 ▶ 的任務起點，打開手機「任務」App 按「▶ 繼續任務」', 'good', 3600);
      };
    }
    $('mCtrl').onclick = () => this.showControls(true);
    $('mTitle').onclick = () => {
      if (racing) game.race.abandon('你退出了比賽');
      writeSave(game);
      game._noSave = true;
      location.reload();
    };
    $('mRestart').onclick = () => this.confirmClear(1);
  }

  // 🏫 回到校門口 (pause menu): back to where the game starts, inside the old campus gate (舊校門), on foot or with
  // the vehicle you are in. Not during a shift at McDonald's / the guardhouse (they need you at the counter).
  gateBlock() {
    const game = this.game;
    if (game.job?.active) return '打工中不能傳送';
    if (game.gate?.active) return '站崗中不能傳送';
    if (game.speechOn) return '政見發表中不能傳送';
    return '';
  }

  toGate() {
    if (this.gateBlock()) return;
    const game = this.game,
      pl = game.player,
      s = game.startPos;
    if (!s) return;
    if (game.drone?.active) game.drone._end(); // the drone lands first
    if (pl.seat) pl.standUp();
    const v = pl.vehicle;
    if (v) {
      v.place(s.x, s.z, s.h);
      v.mesh.visible = true;
    } else {
      pl.place(s.x, s.z, s.h);
      pl.y = 0;
      pl.vy = 0;
      pl.ground = 0;
      pl.vel.set(0, 0);
      pl.tumble = 0;
    }
    game.rig.yaw = s.h;
    game.rig.pitch = 0.32;
    game.rig.first = true;
    this.closeModal();
    game.hud.toast('🏫 已回到校門口', 'good', 2000);
  }

  // deleting the save takes three steps: warn, ask again, then type 清除
  confirmClear(step, fromEnding = false) {
    const back = () => {
      if (fromEnding) this.closeModal();
      else this.pause();
    };
    const lost = '得票、金色選票、零用錢、主線進度、衣服、打工／門禁／比賽紀錄、手機訊息和記事本';
    const btns = (no, yes) => `<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="cNo"><span>${no}</span><small>CANCEL</small></button><button class="menu-btn danger" id="cYes"><span>${yes}</span><small>CONTINUE</small></button></div>`;
    if (step === 1) this.modal('清除遊戲紀錄（1/3）', `<p>確定要清除這台瀏覽器裡的遊戲紀錄嗎？</p><p style="color:#a9adbf">會刪除：${lost}。</p>${  btns('取消', '確定，下一步')}`);
    else if (step === 2) this.modal('清除遊戲紀錄（2/3）', `<p><b style="color:#ff6b6b">再確認一次：清除之後無法復原。</b></p><p style="color:#a9adbf">遊戲會從序章重新開始。</p>${  btns('不要清除', '我確定要清除')}`);
    else {
      this.modal('清除遊戲紀錄（3/3）', `<p>最後一步：請在下面輸入「<b>清除</b>」兩個字。</p><input id="cType" class="clear-type" autocomplete="off" spellcheck="false" placeholder="清除">${  btns('不要清除', '永久清除')}`);
      const inp = $('cType'),
        yes = $('cYes');
      yes.disabled = true;
      inp.oninput = () => {
        yes.disabled = inp.value.trim() !== '清除';
      };
      inp.onkeydown = e => e.stopPropagation(); // typing must not reach the game keys
      setTimeout(() => inp.focus(), 30);
    }
    $('cNo').onclick = back;
    $('cYes').onclick = () => {
      if (step < 3) {
        this.confirmClear(step + 1, fromEnding);
        return;
      }
      if ($('cType').value.trim() !== '清除') return;
      this.game._noSave = true;
      clearSave();
      location.reload();
    };
  }

  // ---------- settings (music / volume / sensitivity) ----------
  settingsHTML() {
    const s = this.game.settings;
    const opt = (v, t) => `<button data-music="${v}" class="${s.music === v ? 'on' : ''}">${t}</button>`;
    const q = (v, t) => `<button data-q="${v}" class="${(s.quality || 'auto') === v ? 'on' : ''}">${t}</button>`;
    const qNow = resolveQuality(s.quality, s);
    const fl = (v, t) => `<button data-fill="${v}" class="${(s.fill || 'on') === v ? 'on' : ''}">${t}</button>`;
    const full = !!document.fullscreenElement;
    const nv = (v, t) => `<button data-nav="${v}" class="${(s.navGround || 'on') === v ? 'on' : ''}">${t}</button>`;
    const fs = (v, t) => `<button data-full="${v}" class="${(v === 'on') === full ? 'on' : ''}">${t}</button>`;
    return `<div class="set-row"><label>🎵 背景音樂</label><div class="seg" id="setMusic">${opt('default', '預設音樂')}${opt('opera', '彥霖歌劇 🎭')}${opt('scene', '情境配樂 🎬')}${opt('off', '關閉')}</div></div>
      <div class="set-row"><label>音樂音量</label><input type="range" id="setMusicVol" min="0" max="1" step="0.05" value="${s.musicVol}"><span class="set-val" id="vMusic">${Math.round(s.musicVol * 100)}%</span></div>
      <div class="set-row"><label>音效音量</label><input type="range" id="setSfxVol" min="0" max="1" step="0.05" value="${s.sfxVol}"><span class="set-val" id="vSfx">${Math.round(s.sfxVol * 100)}%</span></div>
      <div class="set-row"><label>🐦 環境音</label><div class="seg" id="setAmb">${['on', 'off'].map(v => `<button data-amb="${v}" class="${(s.amb || 'on') === v ? 'on' : ''}">${v === 'on' ? '開' : '關'}</button>`).join('')}</div></div>
      <div class="set-row"><label>滑鼠靈敏度</label><input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"><span class="set-val" id="vSens">${s.sens.toFixed(1)}</span></div>
      <div class="set-row"><label>🖼 畫質</label><div class="seg" id="setQuality">${q('auto', '自動')}${q('xlow', '超低')}${q('low', '低')}${q('medium', '中')}${q('high', '高')}</div></div>
      <div class="set-row"><label></label><small id="qNote" style="color:#a9adbf">${this.qualityNote(qNow)}</small></div>
      <div class="set-row"><label>➕ 準心</label><div class="seg" id="setAim">${['on', 'off'].map(v => `<button data-aim="${v}" class="${(s.aim || 'on') === v ? 'on' : ''}">${v === 'on' ? '開' : '關'}</button>`).join('')}</div></div>
      <div class="set-row"><label>🧭 地面導航線</label><div class="seg" id="setNav">${nv('on', '開')}${nv('off', '關')}</div></div>
      <div class="set-row"><label>🖥 全螢幕</label><div class="seg" id="setFull">${fs('on', '開')}${fs('off', '關')}</div></div>
      ${document.fullscreenEnabled ? '' : '<div class="set-row"><label></label><small style="color:#a9adbf">這個瀏覽器不支援網頁全螢幕（iPhone 可用「分享 → 加入主畫面」以全螢幕開啟）</small></div>'}
      <div class="set-row"><label>🏘 補建街區</label><div class="seg" id="setFill">${fl('on', '開')}${fl('off', '關')}</div></div>
      <div class="set-row"><label></label><small id="fNote" style="color:#a9adbf">${this.fillNote()}</small></div>`;
  }

  bindSettings() {
    const game = this.game;
    const s = game.settings,
      save = () => saveSettings(s);
    for (const b of document.querySelectorAll('#setMusic button')) {
      b.onclick = () => {
        s.music = b.dataset.music;
        save();
        game.audio.init();
        game.audio.applyMusic();
        for (const o of document.querySelectorAll('#setMusic button')) o.classList.toggle('on', o === b);
      };
    }
    $('setMusicVol').oninput = e => {
      s.musicVol = +e.target.value;
      $('vMusic').textContent = `${Math.round(s.musicVol * 100)  }%`;
      game.audio.applyVolumes();
      save();
    };
    $('setSfxVol').oninput = e => {
      s.sfxVol = +e.target.value;
      $('vSfx').textContent = `${Math.round(s.sfxVol * 100)  }%`;
      game.audio.applyVolumes();
      game.audio.blip();
      save();
    };
    for (const b of document.querySelectorAll('#setAmb button')) {
      b.onclick = () => {
        s.amb = b.dataset.amb;
        save();
        game.audio.applyVolumes();
        for (const o of document.querySelectorAll('#setAmb button')) o.classList.toggle('on', o === b);
      };
    }
    $('setSens').oninput = e => {
      s.sens = +e.target.value;
      $('vSens').textContent = s.sens.toFixed(1);
      save();
    };
    for (const b of document.querySelectorAll('#setQuality button')) {
      b.onclick = () => {
        s.quality = b.dataset.q;
        if (s.quality === 'auto') delete s.autoQ; // picking 自動 again re-detects from scratch
        save();
        for (const o of document.querySelectorAll('#setQuality button')) o.classList.toggle('on', o === b);
        const qn = resolveQuality(s.quality, s);
        // sky, shadows, bloom / colour grade and lamp lights switch now
        game.setQuality(qn);
        $('qNote').textContent = this.qualityNote(qn);
      };
    }
    for (const b of document.querySelectorAll('#setAim button')) {
      b.onclick = () => {
        s.aim = b.dataset.aim;
        save();
        for (const o of document.querySelectorAll('#setAim button')) o.classList.toggle('on', o === b);
      };
    }
    for (const b of document.querySelectorAll('#setNav button')) {
      b.onclick = () => {
        s.navGround = b.dataset.nav;
        save();
        for (const o of document.querySelectorAll('#setNav button')) o.classList.toggle('on', o === b);
      };
    }
    for (const b of document.querySelectorAll('#setFull button')) {
      b.onclick = async () => {
        try {
          if (b.dataset.full === 'on' && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
          if (b.dataset.full === 'off' && document.fullscreenElement) await document.exitFullscreen();
        } catch (_e) {
          game.hud.toast('無法切換全螢幕（瀏覽器拒絕了）', 'bad', 2400);
        }
        const on = !!document.fullscreenElement;
        for (const o of document.querySelectorAll('#setFull button')) o.classList.toggle('on', (o.dataset.full === 'on') === on);
      };
    }
    for (const b of document.querySelectorAll('#setFill button')) {
      b.onclick = () => {
        s.fill = b.dataset.fill;
        save();
        for (const o of document.querySelectorAll('#setFill button')) o.classList.toggle('on', o === b);
        $('fNote').textContent = this.fillNote();
      };
    }
  }

  qualityNote(q) {
    const game = this.game;
    // the low-quality world (no MSAA, fewer 補建 rows, smaller crowds) is chosen at load time
    const pending = (q === 'low' || q === 'xlow') !== game.lowQ || q === 'xlow' !== game.xlowQ;
    return `目前：${Q_NAME[q]}畫質（自動＝最高用到中：內建顯示晶片、手機用低；畫面不夠順會一路往下調到超低；要高畫質請自己選「高」）${  pending ? '・抗鋸齒與人車數量在重新整理後套用' : ''}`;
  }

  fillNote() {
    const game = this.game;
    const on = (game.settings.fill || 'on') !== 'off',
      now = game.data.buildings.some(b => b.synthetic) || game.data.areas.some(a => a.synthetic);
    return (on ? '空白街區依街景／衛星判斷用途後由程式補上建物與地面（示意，不是真實建物）' : 'OSM 沒有資料的街區保持空白') + (on !== now ? '・重新整理後套用' : '');
  }

  openSettings() {
    this.game.audio.init();
    this.modal('設定 / 音樂', this.settingsHTML());
    this.bindSettings();
  }

  // ---------- computer lab video ----------
  openVideo() {
    this.game.videoOpen = true;
    document.exitPointerLock?.();
    this.game.audio.setEngine(false, 0);
    $('videoFrame').src = 'https://www.youtube-nocookie.com/embed/-AiDMXovNmA?autoplay=1&rel=0&playsinline=1';
    $('video').classList.remove('hidden');
    this.game.audio.duck(true);
  }

  closeVideo() {
    if (!this.game.videoOpen) return;
    this.game.videoOpen = false;
    $('videoFrame').src = 'about:blank';
    $('video').classList.add('hidden');
    this.game.audio.duck(false);
    if (!this.game.input.touch && this.game.state === 'play') lockPointer(this.game.renderer.domElement);
  }

  resume() {
    this.game.state = 'play';
    if (!this.game.input.touch && !this.game.job?.active) lockPointer(this.game.renderer.domElement); // the shift panel needs a free mouse
  }

  // gamepad on screens where game input is off (title, pause / settings modal, ending, video)
  padMenus() {
    const game = this.game;
    const h = game.input.pad.hits;
    if (!h.size) return;
    const A = h.has(0),
      B = h.has(1),
      S = h.has(9);
    if (game._modalOpen) {
      if (A || B || S) this.closeModal();
      return;
    }
    if (game.state === 'title' && !game._starting && (A || S)) {
      $('btnStart').click();
      return;
    }
    if (game.state === 'ending' && (A || S)) {
      $('btnKeepPlaying').click();
      return;
    }
    if (game.videoOpen && (B || S)) this.closeVideo();
    if (game.pc?.isOpen && B) game.pc.close();
    if (game.wardrobe?.isOpen && (A || B)) game.wardrobe.close();
  }

  checkRotate() {
    $('rotateHint').classList.toggle('hidden', !(this.game.input && this.game.input.touch && innerHeight > innerWidth && this.game.state === 'play'));
  }
}
