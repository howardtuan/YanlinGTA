/**
 * Persistent boot-stage checkpoint tracker (boot.stages for the benchmark / smoke reports).
 * - Developer mode (`?diag=1` / `?diag=halt`): shows crash breadcrumbs & breaks iOS reload loops.
 * The old player-side automatic safe mode (low budgets after 2 unfinished boots or a lost WebGL context) is gone
 * (#455): it tripped on ordinary reloads / backgrounding on iOS and silently locked the display settings. Stored
 * states from that time may still carry `safeMode` / `contextLost`: they are dropped on the next begin().
 */

export const BOOT_DIAG_KEY = 'yanlinGTA.bootDiag.v1';

function readStored(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BOOT_DIAG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function writeStored(storage, state) {
  if (!storage) return;
  try {
    storage.setItem(BOOT_DIAG_KEY, JSON.stringify(state));
  } catch (_e) {}
}

function formatStages(stages = []) {
  if (!stages.length) return '（無已完成階段）';
  return stages.map((s) => `${s.step}(${s.ms}ms)`).join(' → ');
}

export function createBootDiag({
  diagMode = 'off',
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  doc = typeof document !== 'undefined' ? document : null,
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  const t0 = now();
  let stepStart = t0;
  let stepWait = 0; // ms the current stage spent waiting for frames it gave the loading bar (waited())
  // a finished stage: ms is its own work (the frames it waited for in the middle are in waitMs, #464)
  const stageRecord = (t) => {
    const r = {
      step: state.current.step,
      ms: Math.max(0, Math.round(t - stepStart - stepWait)),
    };
    if (stepWait >= 0.5) r.waitMs = Math.round(stepWait);
    return r;
  };
  let state = {
    current: null,
    lastCrash: null,
    crashCount: 0,
  };
  let box = null;
  let summaryEl = null;
  let currentEl = null;
  let actionRow = null;

  const ensureOverlay = () => {
    if (diagMode === 'off' || !doc?.body || box) return;
    box = doc.createElement('div');
    Object.assign(box.style, {
      position: 'fixed',
      left: '8px',
      right: '8px',
      bottom: '8px',
      zIndex: '100000',
      maxWidth: '520px',
      font: '12px/1.45 ui-monospace,monospace',
      color: '#f5f7fa',
      background: 'rgba(12,16,28,0.9)',
      border: '1px solid rgba(255,210,63,0.45)',
      borderRadius: '8px',
      padding: '8px 10px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
    });
    summaryEl = doc.createElement('div');
    currentEl = doc.createElement('div');
    actionRow = doc.createElement('div');
    Object.assign(actionRow.style, {
      marginTop: '6px',
      display: 'flex',
      gap: '8px',
    });
    box.append(summaryEl, currentEl, actionRow);
    doc.body.appendChild(box);
  };

  const renderOverlay = () => {
    if (!box) return;
    const lc = state.lastCrash;
    if (lc) {
      const errText = lc.error ? `\n錯誤: ${lc.error}` : '';
      summaryEl.textContent =
        `⚠ 上次未完成載入（連續 ${state.crashCount} 次）\n` +
        `停在: ${lc.step} (${Math.round((lc.pct || 0) * 100)}% ${lc.label || ''}) +${lc.elapsedMs || 0}ms${errText}\n` +
        `已過: ${formatStages(lc.stages)}`;
      summaryEl.style.color = '#ffd23f';
      summaryEl.style.marginBottom = '6px';
    } else {
      summaryEl.textContent = `🩺 BootDiag 監控中（無前次異常）`;
      summaryEl.style.color = '#9be7a8';
      summaryEl.style.marginBottom = '4px';
    }

    const cur = state.current;
    if (cur) {
      const doneTag = cur.completed ? '✅ 完成' : cur.error ? `❌ ${cur.error}` : '⏳ 執行中';
      currentEl.textContent =
        `本次: ${cur.step} (${Math.round((cur.pct || 0) * 100)}% ${cur.label || ''}) +${cur.elapsedMs || 0}ms · ${doneTag}\n` +
        `已完成: ${formatStages(cur.stages)}`;
    }
  };

  const addDismissButton = () => {
    if (!actionRow || !doc) return;
    actionRow.innerHTML = '';
    const btn = doc.createElement('button');
    btn.textContent = '✕ 關閉診斷列';
    Object.assign(btn.style, {
      padding: '3px 8px',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      cursor: 'pointer',
      font: 'inherit',
    });
    btn.onclick = () => {
      box?.remove();
      box = null;
    };
    actionRow.appendChild(btn);
  };

  return {
    async begin() {
      const prev = readStored(storage);
      let nextCrashCount = 0;
      let lastCrash = prev?.lastCrash || null;
      if (prev?.current && !prev.current.completed) {
        lastCrash = { ...prev.current };
        nextCrashCount = (prev.crashCount || 0) + 1;
      }

      // (a state stored by an older version may still have safeMode / contextLost: not carried over)
      state = {
        current: null,
        lastCrash,
        crashCount: nextCrashCount,
      };

      stepStart = now();
      stepWait = 0;
      state.current = {
        startedAt: Date.now(),
        step: 'init',
        pct: 0,
        label: '準備啟動',
        elapsedMs: 0,
        stages: [],
        completed: false,
        error: null,
      };
      writeStored(storage, state);

      if (diagMode !== 'off') {
        ensureOverlay();
        renderOverlay();
      }

      const shouldHalt =
        diagMode !== 'off' &&
        ((diagMode === 'halt' && Boolean(state.lastCrash)) ||
          (diagMode === 'on' && state.crashCount >= 2));

      if (shouldHalt && actionRow && doc) {
        state.halted = true;
        await new Promise((resolve) => {
          actionRow.innerHTML = '';
          const retryBtn = doc.createElement('button');
          retryBtn.textContent = '▶ 繼續單次載入';
          Object.assign(retryBtn.style, {
            padding: '5px 10px',
            borderRadius: '4px',
            border: '0',
            background: '#ffd23f',
            color: '#111',
            fontWeight: '700',
            cursor: 'pointer',
            font: 'inherit',
          });
          retryBtn.onclick = () => {
            actionRow.innerHTML = '';
            state.crashCount = 0;
            writeStored(storage, state);
            resolve();
          };
          actionRow.appendChild(retryBtn);
        });
      }

      return state;
    },

    checkpoint(step, pct, label = '') {
      if (!state.current) return;
      const t = now();
      if (state.current.step && state.current.step !== step) {
        state.current.stages.push(stageRecord(t));
        stepStart = t;
        stepWait = 0;
      }
      state.current.step = step;
      state.current.pct = pct;
      state.current.label = label;
      state.current.elapsedMs = Math.max(0, Math.round(t - t0));
      writeStored(storage, state);
      renderOverlay();
    },

    // inside a long stage (build-interiors goes zone by zone): what the loading bar shows now, so a crash
    // record says which part it stopped in
    progress(pct, label = '') {
      if (!state.current) return;
      state.current.pct = pct;
      state.current.label = label;
      state.current.elapsedMs = Math.max(0, Math.round(now() - t0));
      writeStored(storage, state);
      renderOverlay();
    },

    // the current stage gave the browser a frame (ms): kept out of the stage's own time
    waited(ms) {
      if (ms > 0) stepWait += ms;
    },

    fail(err) {
      if (!state.current) return;
      const t = now();
      state.current.error = String(err?.message || err || 'unknown error');
      state.current.elapsedMs = Math.max(0, Math.round(t - t0));
      writeStored(storage, state);
      renderOverlay();
    },

    complete() {
      if (!state.current) return;
      const t = now();
      if (state.current.step && state.current.step !== 'complete') {
        state.current.stages.push(stageRecord(t));
      }
      state.current.step = 'complete';
      state.current.pct = 1;
      state.current.label = '完成';
      state.current.elapsedMs = Math.max(0, Math.round(t - t0));
      state.current.completed = true;
      state.crashCount = 0;
      writeStored(storage, state);
      renderOverlay();
      if (box) addDismissButton();
    },

    attachCanvas(canvas) {
      if (!canvas?.addEventListener) return;
      // diagnostics only: noted on this boot's record, changes nothing about how the game is drawn
      canvas.addEventListener('webglcontextlost', () => {
        if (state.current) state.current.contextLost = (state.current.contextLost || 0) + 1;
        writeStored(storage, state);
        renderOverlay();
      });
    },

    getState() {
      return state;
    },
  };
}
