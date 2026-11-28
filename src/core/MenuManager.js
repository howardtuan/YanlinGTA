import { controlsHTML, bindControls } from './Controls.js';
import { saveSettings } from '../systems/AudioSystem.js';
import { readSave, writeSave, applySave, clearSave } from '../systems/SaveSystem.js';
import { Q_NAME, resolveQuality } from './GameLoop.js';
import { isCustom, reloadPending } from './GraphicsConfig.js';

// 設定 → ⚙ 細部顯示設定: one row per display setting (src/core/GraphicsConfig.js); live ones switch at once
const GFX_ROWS = [
  {
    key: 'shadows',
    label: '☀ 太陽陰影',
    opts: [
      ['off', '關'],
      ['low', '低'],
      ['medium', '中'],
      ['high', '高'],
    ],
  },
  {
    key: 'envLight',
    label: '🌤 環境光反射',
    opts: [
      ['hemi', '半球光'],
      ['pmrem', '天空 IBL'],
    ],
  },
  {
    key: 'postFx',
    label: '✨ 後製光暈',
    opts: [
      ['off', '關'],
      ['bloom-quarter', '光暈'],
      ['bloom-half-msaa', '光暈＋MSAA'],
    ],
  },
  {
    key: 'nightLamps',
    label: '💡 夜間路燈光源',
    opts: [
      [0, '0'],
      [2, '2'],
      [4, '4'],
      [8, '8'],
    ],
  },
  {
    key: 'materialMode',
    label: '🧱 材質',
    reload: true,
    opts: [
      ['lambert', '輕量'],
      ['standard', '標準 PBR'],
    ],
  },
  {
    key: 'antialias',
    label: '〰 抗鋸齒',
    reload: true,
    opts: [
      [false, '關'],
      [true, '開'],
    ],
  },
  {
    key: 'crowdTier',
    label: '🚶 人車密度',
    reload: true,
    opts: [
      ['xlow', '超低'],
      ['low', '低'],
      ['full', '完整'],
    ],
  },
];
const GFX_LABEL = {
  materialMode: '材質',
  antialias: '抗鋸齒',
  crowdTier: '人車密度',
};

const $ = (id) => document.getElementById(id);
const onClick = (id, fn) => {
  const el = $(id);
  if (el) el.onclick = fn;
  else console.warn(`missing #${id}`);
};

// when the game last asked for the mouse back (closing the phone, a modal, the map...); see the pointerlockchange
// handler below
let lockReqAt = -1e9;
export const lockPointer = (el) => {
  lockReqAt = performance.now();
  try {
    const r = el.requestPointerLock?.();
    if (r && r.catch) r.catch(() => {});
  } catch (_e) {}
};

const setLoad = (p, t) => {
  const f = $('loadFill');
  if (f) f.style.width = `${p * 100}%`;
  const tx = $('loadText');
  if (tx) tx.textContent = `${t || '載入中 LOADING'} · ${Math.round(p * 100)}%`;
};

export class MenuManager {
  constructor(game) {
    this.game = game;
  }

  setup() {
    const game = this.game;
    const sv = readSave();
    if (sv && $('btnStart')) {
      $('btnStart').innerHTML =
        `<span>▶ 開始遊戲</span><small>繼續上次進度 · 得票 ${sv.votes} · 選票 ${(sv.ballots || []).length}/34</small>`;
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
      if (!game.input.touch && !game.prompts.pad)
        game.hud.toast('點一下畫面鎖定滑鼠視角', 'good', 3000);
      const d = readSave();
      if (d) {
        const m = applySave(game, d);
        game.missions.spawnNpcs(m.done ? 99 : (m.idx ?? 0));
        if (m.done) {
          game.missions.done = true;
          game.missions.free = true;
          game.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
        } else {
          // back at the start of the section you were on (progress inside it isn't saved); a timed one waits
          // paused, so its clock only starts when you pick ▶ 繼續任務 in the pause menu
          game.missions.resumeAt(
            Math.max(0, m.idx ?? 0),
            m.prog ? { ...m.prog, hits: null, base: null } : m.prog
          );
          if (game.missions.step && game.missions.timer !== null) game.missions.exit();
        }
        game.hud.toast('💾 進度已載入', 'good', 2200);
      } else {
        game.missions.start();
      }
      $('app').onclick = () => {
        if (game.state === 'play' && !game.input.touch && !game.mouseOwnedByUI()) {
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
    onClick('btnBench', () => game.bench?.openDialog());
    // 遊戲百科 Wiki（yanlin-gta.com/wiki/，wiki/build.mjs）：開新分頁，遊戲留在原本的分頁
    onClick('btnWiki', () => window.open('wiki/', '_blank', 'noopener'));
    onClick('modalClose', () => this.closeModal());
    onClick('videoClose', () => this.closeVideo());
    // the pause menu (and the settings / controls / delete-save pages opened from it) also closes with Esc or a click on
    // the dark backdrop around it
    addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || e.repeat || game.state !== 'paused' || !game._modalOpen) return;
      e.preventDefault();
      game.input.pressed.delete('Escape'); // or the next frame would pause again
      this.closeModal();
    });
    $('modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget && game.state === 'paused' && game._modalOpen)
        this.closeModal();
    });
    onClick('btnEndingCredits', () =>
      this.modal(
        '製作群名單',
        `<p><b>中原順起來 · 資管要贏 票投彥霖</b></p><p>企劃・程式・地圖：彥霖競選團隊</p><p>致敬：中原大學、OpenStreetMap、Rapier 物理引擎、Three.js</p><p style="color:#a9adbf">感謝所有在中原相遇的師長、同學與朋友！</p>`,
        'CREDITS'
      )
    );
    onClick('btnKeepPlaying', () => {
      $('ending').classList.add('hidden');
      game.state = 'play';
      game._clearCrowd(); // crowd stays for the ending shot, then goes
      game.missions.free = true;
      game.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
      if (!game.input.touch) lockPointer(game.renderer.domElement);
    });
    onClick('btnRestart', () => this.confirmClear(1, true));
    // losing the mouse lock while playing means the player pressed Esc, so pause. But not when the loss comes right
    // after the game itself asked for the lock back (e.g. phone → 直升機空投 / 無人機 / 任務 buttons close the phone and
    // relock while a cut-scene starts: the browser can refuse or drop that fresh lock), and not during a cut-scene,
    // where the player is frozen anyway and a real Esc still reaches the Escape handler in Game.js once unlocked.
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) return;
      const cine =
        game.airdrop?.cinema ||
        game.drone?.cinema ||
        game.mingshan?.cinema ||
        game.pinhanRide?.cinema ||
        game.zzQuest?.busy ||
        game.mahjong?.playing;
      if (cine || performance.now() - lockReqAt < 1200) return;
      if (game.state === 'play' && !game.input.touch && !game.mouseOwnedByUI()) this.pause();
    });
  }

  // artwork + 5 s progress bar shown after pressing Start
  splash(ms) {
    const stages = [
      '建立地形中',
      '鋪設中北路與實踐路',
      '種下校園的樹',
      '蓋資管系館與電腦教室',
      '炸好麥當勞的薯條',
      '幫 JAT SM 加滿油',
      '召喚同學與競選幹部',
      '印好「資管要贏 票投彥霖」傳單',
      '準備出發！',
    ];
    $('loading').classList.remove('hidden');
    return new Promise((res) => {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        const ease = k < 1 ? k * (0.9 + 0.1 * Math.sin(k * 20)) : 1;
        setLoad(
          Math.min(1, ease),
          stages[Math.min(stages.length - 1, Math.floor(k * stages.length))]
        );
        if (k < 1) requestAnimationFrame(tick);
        else
          setTimeout(() => {
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

  // 操作說明: keyboard & mouse / gamepad / touch tabs (src/core/Controls.js); opens on the device in use
  showControls(fromPause = false) {
    this.modal(
      '操作說明',
      controlsHTML(this.game) +
        (fromPause
          ? '<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="mBack"><span>▶ 繼續遊戲</span><small>RESUME</small></button></div>'
          : ''),
      'CONTROLS'
    );
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
      `${racing ? '' : this.settingsHTML()}<div class="modal-btns" style="margin-top:14px">
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
        game.hud.toast(
          '⏹ 已退出任務：回到地圖上 ▶ 的任務起點，打開手機「任務」App 按「▶ 繼續任務」',
          'good',
          3600
        );
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
    const btns = (no, yes) =>
      `<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="cNo"><span>${no}</span><small>CANCEL</small></button><button class="menu-btn danger" id="cYes"><span>${yes}</span><small>CONTINUE</small></button></div>`;
    if (step === 1)
      this.modal(
        '清除遊戲紀錄（1/3）',
        `<p>確定要清除這台瀏覽器裡的遊戲紀錄嗎？</p><p style="color:#a9adbf">會刪除：${lost}。</p>${btns('取消', '確定，下一步')}`
      );
    else if (step === 2)
      this.modal(
        '清除遊戲紀錄（2/3）',
        `<p><b style="color:#ff6b6b">再確認一次：清除之後無法復原。</b></p><p style="color:#a9adbf">遊戲會從序章重新開始。</p>${btns('不要清除', '我確定要清除')}`
      );
    else {
      this.modal(
        '清除遊戲紀錄（3/3）',
        `<p>最後一步：請在下面輸入「<b>清除</b>」兩個字。</p><input id="cType" class="clear-type" autocomplete="off" spellcheck="false" placeholder="清除">${btns('不要清除', '永久清除')}`
      );
      const inp = $('cType'),
        yes = $('cYes');
      yes.disabled = true;
      inp.oninput = () => {
        yes.disabled = inp.value.trim() !== '清除';
      };
      inp.onkeydown = (e) => e.stopPropagation(); // typing must not reach the game keys
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
    const opt = (v, t) =>
      `<button data-music="${v}" class="${s.music === v ? 'on' : ''}">${t}</button>`;
    const q = (v, t) =>
      `<button data-q="${v}" class="${(s.quality || 'auto') === v ? 'on' : ''}">${t}</button>`;
    const qNow = resolveQuality(s.quality, s);
    const full = !!document.fullscreenElement;
    const pf = (v, t) =>
      `<button data-perf="${v}" class="${(s.perfHud || 'off') === v ? 'on' : ''}">${t}</button>`;
    const nv = (v, t) =>
      `<button data-nav="${v}" class="${(s.navGround || 'on') === v ? 'on' : ''}">${t}</button>`;
    const fs = (v, t) =>
      `<button data-full="${v}" class="${(v === 'on') === full ? 'on' : ''}">${t}</button>`;
    return `<div class="set-row"><label>🎵 背景音樂</label><div class="seg" id="setMusic">${opt('scene', '情境配樂 🎬')}${opt('opera', '彥霖歌劇 🎭')}${opt('off', '關閉')}</div></div>
      <div class="set-row"><label>音樂音量</label><input type="range" id="setMusicVol" min="0" max="1" step="0.05" value="${s.musicVol}"><span class="set-val" id="vMusic">${Math.round(s.musicVol * 100)}%</span></div>
      <div class="set-row"><label>音效音量</label><input type="range" id="setSfxVol" min="0" max="1" step="0.05" value="${s.sfxVol}"><span class="set-val" id="vSfx">${Math.round(s.sfxVol * 100)}%</span></div>
      <div class="set-row"><label>🐦 環境音</label><div class="seg" id="setAmb">${['on', 'off'].map((v) => `<button data-amb="${v}" class="${(s.amb || 'on') === v ? 'on' : ''}">${v === 'on' ? '開' : '關'}</button>`).join('')}</div></div>
      <div class="set-row"><label>滑鼠靈敏度</label><input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"><span class="set-val" id="vSens">${s.sens.toFixed(1)}</span></div>
      <div class="set-row"><label>🖼 畫質</label><div class="seg" id="setQuality">${q('auto', '自動')}${q('xlow', '超低')}${q('low', '低')}${q('medium', '中')}${q('high', '高')}</div></div>
      <div class="set-row"><label></label><small id="qNote" style="color:#a9adbf">${this.qualityNote(qNow)}</small></div>
      ${this.gfxHTML()}
      <div class="set-row"><label>➕ 準心</label><div class="seg" id="setAim">${['on', 'off'].map((v) => `<button data-aim="${v}" class="${(s.aim || 'on') === v ? 'on' : ''}">${v === 'on' ? '開' : '關'}</button>`).join('')}</div></div>
      <div class="set-row"><label>🧭 地面導航線</label><div class="seg" id="setNav">${nv('on', '開')}${nv('off', '關')}</div></div>
      <div class="set-row"><label>🖥 全螢幕</label><div class="seg" id="setFull">${fs('on', '開')}${fs('off', '關')}</div></div>
      ${document.fullscreenEnabled ? '' : '<div class="set-row"><label></label><small style="color:#a9adbf">這個瀏覽器不支援網頁全螢幕（iPhone 可用「分享 → 加入主畫面」以全螢幕開啟）</small></div>'}
      <div class="set-row"><label>📊 效能顯示</label><div class="seg" id="setPerf">${pf('off', '關閉')}${pf('fps', '簡易')}${pf('detail', '詳細')}${pf('dev', '開發者')}</div></div>
      <div class="set-row"><label></label><small style="color:#a9adbf">左上角顯示 FPS 等數據；簡易＝只有 FPS，詳細＝加上 1% 低幀、主執行緒負載、記憶體，開發者＝全部（含位置）</small></div>
`;
  }

  // ⚙ 細部顯示設定: collapsible block under 🖼 畫質 (values shown are the effective ones, game.gfx)
  gfxHTML() {
    const s = this.game.settings,
      G = this.game.gfx;
    const fl = (v, t) =>
      `<button data-fill="${v}" class="${(s.fill || 'on') === v ? 'on' : ''}">${t}</button>`;
    const rows = GFX_ROWS.map(
      (r) =>
        `<div class="set-row"><label>${r.label}${r.reload ? ' <small style="color:#a9adbf">（重整）</small>' : ''}</label><div class="seg" data-gfx="${r.key}">${r.opts
          .map(
            ([v, t]) =>
              `<button data-v="${String(v)}" class="${G[r.key] === v ? 'on' : ''}">${t}</button>`
          )
          .join('')}</div></div>`
    ).join('');
    return `<details id="gfxMore" class="set-more"${this._gfxOpen ? ' open' : ''}><summary>⚙ 細部顯示設定</summary>
      <div class="set-row"><label>🔍 清晰度倍率</label><input type="range" id="setDpr" min="0.5" max="2" step="0.05" value="${G.dprCap}"><span class="set-val" id="vDpr">${G.dprCap.toFixed(2)}x</span></div>
      <div class="set-row"><label>🔭 視距</label><input type="range" id="setView" min="0.3" max="1" step="0.05" value="${G.viewScale}"><span class="set-val" id="vView">${Math.round(G.viewScale * 100)}%</span></div>
      ${rows}
      <div class="set-row"><label>🏘 補建街區 <small style="color:#a9adbf">（重整）</small></label><div class="seg" id="setFill">${fl('on', '開')}${fl('off', '關')}</div></div>
      <div class="set-row"><label></label><small id="fNote" style="color:#a9adbf">${this.fillNote()}</small></div>
      <div class="set-row"><label></label><div class="seg"><button id="gfxReset">↺ 還原成畫質檔位預設</button></div></div>
      <div class="set-row"><label></label><small id="gfxNote" style="color:#a9adbf">${this.gfxNote()}</small></div>
    </details>`;
  }

  gfxNote() {
    const game = this.game,
      wait = reloadPending(game.gfxBuilt, game.gfx);
    return `沒標（重整）的項目立即套用；清晰度倍率越高越清楚但越耗電${wait.length ? `・${wait.map((k) => GFX_LABEL[k] || k).join('、')}在重新整理後套用` : ''}`;
  }

  // effective values back into the controls (after a preset pick, a reset or a change clamped by safe mode / URL)
  refreshGfx() {
    const game = this.game,
      G = game.gfx;
    for (const seg of document.querySelectorAll('[data-gfx]'))
      for (const b of seg.querySelectorAll('button'))
        b.classList.toggle('on', b.dataset.v === String(G[seg.dataset.gfx]));
    if ($('setDpr')) {
      $('setDpr').value = G.dprCap;
      $('vDpr').textContent = `${G.dprCap.toFixed(2)}x`;
      $('setView').value = G.viewScale;
      $('vView').textContent = `${Math.round(G.viewScale * 100)}%`;
    }
    if ($('gfxNote')) $('gfxNote').textContent = this.gfxNote();
    if ($('qNote')) $('qNote').textContent = this.qualityNote(game.quality);
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
        for (const o of document.querySelectorAll('#setMusic button'))
          o.classList.toggle('on', o === b);
      };
    }
    $('setMusicVol').oninput = (e) => {
      s.musicVol = +e.target.value;
      $('vMusic').textContent = `${Math.round(s.musicVol * 100)}%`;
      game.audio.applyVolumes();
      save();
    };
    $('setSfxVol').oninput = (e) => {
      s.sfxVol = +e.target.value;
      $('vSfx').textContent = `${Math.round(s.sfxVol * 100)}%`;
      game.audio.applyVolumes();
      game.audio.blip();
      save();
    };
    for (const b of document.querySelectorAll('#setAmb button')) {
      b.onclick = () => {
        s.amb = b.dataset.amb;
        save();
        game.audio.applyVolumes();
        for (const o of document.querySelectorAll('#setAmb button'))
          o.classList.toggle('on', o === b);
      };
    }
    $('setSens').oninput = (e) => {
      s.sens = +e.target.value;
      $('vSens').textContent = s.sens.toFixed(1);
      save();
    };
    for (const b of document.querySelectorAll('#setQuality button')) {
      b.onclick = () => {
        s.quality = b.dataset.q;
        if (s.quality === 'auto') delete s.autoQ; // picking 自動 again re-detects from scratch
        delete s.gfx; // a preset restores its own combination (⚙ 細部顯示設定 back to the preset)
        save();
        for (const o of document.querySelectorAll('#setQuality button'))
          o.classList.toggle('on', o === b);
        const qn = resolveQuality(s.quality, s);
        // sky, shadows, bloom / colour grade and lamp lights switch now
        game.setQuality(qn);
        game.applyDisplaySettings({});
        this.refreshGfx();
      };
    }
    const gfxSet = (patch) => {
      game.applyDisplaySettings(patch);
      this.refreshGfx();
    };
    if ($('gfxMore')) $('gfxMore').ontoggle = (e) => (this._gfxOpen = e.target.open);
    for (const seg of document.querySelectorAll('[data-gfx]'))
      for (const b of seg.querySelectorAll('button'))
        b.onclick = () => {
          const raw = b.dataset.v,
            v = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? +raw : raw;
          gfxSet({ [seg.dataset.gfx]: v });
        };
    if ($('setDpr')) {
      $('setDpr').oninput = (e) => ($('vDpr').textContent = `${(+e.target.value).toFixed(2)}x`);
      $('setDpr').onchange = (e) => gfxSet({ dprCap: +e.target.value });
      $('setView').oninput = (e) =>
        ($('vView').textContent = `${Math.round(+e.target.value * 100)}%`);
      $('setView').onchange = (e) => gfxSet({ viewScale: +e.target.value });
    }
    onClick('gfxReset', () => {
      delete s.gfx;
      save();
      gfxSet({});
    });
    for (const b of document.querySelectorAll('#setAim button')) {
      b.onclick = () => {
        s.aim = b.dataset.aim;
        save();
        for (const o of document.querySelectorAll('#setAim button'))
          o.classList.toggle('on', o === b);
      };
    }
    for (const b of document.querySelectorAll('#setNav button')) {
      b.onclick = () => {
        s.navGround = b.dataset.nav;
        save();
        for (const o of document.querySelectorAll('#setNav button'))
          o.classList.toggle('on', o === b);
      };
    }
    for (const b of document.querySelectorAll('#setFull button')) {
      b.onclick = async () => {
        try {
          if (b.dataset.full === 'on' && !document.fullscreenElement)
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
          if (b.dataset.full === 'off' && document.fullscreenElement)
            await document.exitFullscreen();
        } catch (_e) {
          game.hud.toast('無法切換全螢幕（瀏覽器拒絕了）', 'bad', 2400);
        }
        const on = !!document.fullscreenElement;
        for (const o of document.querySelectorAll('#setFull button'))
          o.classList.toggle('on', (o.dataset.full === 'on') === on);
      };
    }
    for (const b of document.querySelectorAll('#setPerf button')) {
      b.onclick = () => {
        s.perfHud = b.dataset.perf;
        save();
        game.perfHud?.setLevel(s.perfHud);
        for (const o of document.querySelectorAll('#setPerf button'))
          o.classList.toggle('on', o === b);
      };
    }
    for (const b of document.querySelectorAll('#setFill button')) {
      b.onclick = () => {
        s.fill = b.dataset.fill;
        save();
        for (const o of document.querySelectorAll('#setFill button'))
          o.classList.toggle('on', o === b);
        $('fNote').textContent = this.fillNote();
      };
    }
  }

  qualityNote(q) {
    const game = this.game;
    // the reload-only settings (MSAA, materials, crowds) are chosen at load time
    const pending = reloadPending(game.gfxBuilt, game.gfx).length > 0;
    const custom = isCustom(q, game.settings.gfx);
    return `目前：${Q_NAME[q]}畫質${custom ? '（自訂）' : ''}（自動＝最高用到中：內建顯示晶片、手機用低；畫面不夠順會一路往下調到超低；要高畫質請自己選「高」）${pending ? '・部分設定在重新整理後套用' : ''}`;
  }

  fillNote() {
    const game = this.game;
    const on = (game.settings.fill || 'on') !== 'off',
      now =
        game.data.buildings.some((b) => b.synthetic) || game.data.areas.some((a) => a.synthetic);
    return (
      (on
        ? '空白街區依街景／衛星判斷用途後由程式補上建物與地面（示意，不是真實建物）'
        : 'OSM 沒有資料的街區保持空白') + (on !== now ? '・重新整理後套用' : '')
    );
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
    $('videoFrame').src =
      'https://www.youtube-nocookie.com/embed/-AiDMXovNmA?autoplay=1&rel=0&playsinline=1';
    $('video').classList.remove('hidden');
    this.game.audio.duck(true);
  }

  closeVideo() {
    if (!this.game.videoOpen) return;
    this.game.videoOpen = false;
    $('videoFrame').src = 'about:blank';
    $('video').classList.add('hidden');
    this.game.audio.duck(false);
    if (!this.game.input.touch && this.game.state === 'play')
      lockPointer(this.game.renderer.domElement);
  }

  resume() {
    this.game.state = 'play';
    if (!this.game.input.touch && !this.game.job?.active)
      lockPointer(this.game.renderer.domElement); // the shift panel needs a free mouse
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
    $('rotateHint').classList.toggle(
      'hidden',
      !(
        this.game.input &&
        this.game.input.touch &&
        innerHeight > innerWidth &&
        this.game.state === 'play'
      )
    );
  }
}
