// 一鍵通關的畫面（資料與存檔在 src/systems/AutoSolve.js）：
//  - askAutoSolve：第一次進入要打指令／程式碼的任務時，問玩家要不要改成自動通關。
//  - askReplay：已經破過的任務按「🔁 再破一次」時，選手動或自動。
//  - playAutoSolve：21:9 的通關教學動畫。畫面上下（或左右）是黑邊，中間左邊是終端機／編輯器，右邊是說明卡：
//    這一行在做什麼、每個關鍵字的意思、找到的線索。「下一步」一步一步看，「自動播放」自己跑，「跳到結尾」直接做完。
//    SQL 案件每一行都丟進偵探模式真正的引擎（Detective.run），Two Sum 最後真的送去批改（HowardTwoSum.judge）。
import { SCRIPTS, TWO_SUM_SOLUTION } from '../systems/AutoSolve.js';
import { hl } from '../systems/minigames/Learn.js';
import { TWO_SUM_STARTER } from '../systems/quests/HowardTwoSum.js';

const esc = (t) =>
  String(t).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
const wait = (ms) =>
  new Promise((ok) => {
    setTimeout(ok, ms);
  });

// a full-screen layer over the computer (z above .pc); Esc closes it instead of leaving the computer
function layer(cls, html, onEsc) {
  const el = document.createElement('div');
  el.className = `as-layer ${cls}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  const key = (e) => {
    e.stopPropagation();
    if (e.code === 'Escape') {
      e.preventDefault();
      onEsc?.();
    }
  };
  addEventListener('keydown', key, true);
  requestAnimationFrame(() => el.classList.add('on'));
  return {
    el,
    key,
    close() {
      removeEventListener('keydown', key, true);
      el.remove();
    },
  };
}

// choose(): { title, text, buttons: [[label, value, cls]] } → resolves the value (null on Esc)
function choose({ title, text, note, buttons }) {
  return new Promise((ok) => {
    const done = (v) => {
      L.close();
      ok(v);
    };
    const L = layer(
      'as-ask',
      `<div class="as-card-pop" role="dialog" aria-modal="true">
        <h3>${title}</h3><p>${text}</p>
        <div class="as-ask-btns">${buttons.map(([t, v, c], i) => `<button data-i="${i}" class="${c || ''}">${t}</button>`).join('')}</div>
        ${note ? `<small>${note}</small>` : ''}</div>`,
      () => done(null)
    );
    for (const b of L.el.querySelectorAll('[data-i]'))
      b.onclick = () => done(buttons[+b.dataset.i][1]);
    L.el.querySelector('[data-i]')?.focus();
  });
}

// the first time a task that needs typing opens: 'auto' or 'manual'
export function askAutoSolve(id) {
  const S = SCRIPTS[id],
    what = S?.kind === 'code' ? '寫程式碼' : '打 SQL 指令';
  return choose({
    title: `${S?.title || ''}　要自動通關嗎？`,
    text: `因為這個任務要${what}，不是資訊相關背景的玩家可能會有點吃力（用手機打字也不太方便）。<br>要改成<b>自動通關</b>嗎？過程會一行一行播給你看，並簡單教你每一行在做什麼。`,
    note: '選了「我自己來」之後反悔也沒關係：任務畫面上隨時可以按 <b>🎬 一鍵通關</b>。',
    buttons: [
      ['🎬 自動通關（附簡單教學）', 'auto', 'as-go'],
      ['✍️ 我自己來', 'manual'],
    ],
  }).then((v) => v || 'manual');
}

// 🔁 再破一次: 'auto', 'manual' or null (cancelled)
export function askReplay(id) {
  return choose({
    title: `🔁 再破一次：${SCRIPTS[id]?.title || ''}`,
    text: '這次不會影響存檔，也不會再拿一次獎勵。要自己來，還是看自動通關的過程？',
    buttons: [
      ['✍️ 自己再破一次', 'manual', 'as-go'],
      ['🎬 看自動通關', 'auto'],
      ['取消', null, 'as-dim'],
    ],
  });
}

// the 21:9 film. opts.practice: replay a solved case (SQL) without touching the save. Resolves true once solved.
export function playAutoSolve(g, id, opts = {}) {
  const S = SCRIPTS[id];
  if (!S) return Promise.resolve(false);
  return new Promise((resolve) => {
    let closed = false,
      busy = false,
      auto = false,
      i = -1, // the step being shown (-1: the intro)
      tick = 0, // bumped by every step: an auto-play timer only moves on if nothing else did meanwhile
      solved = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      L.close();
      if (S.kind === 'sql' && opts.practice) g.detective?.leave();
      resolve(solved);
    };
    const L = layer(
      'as-film',
      `<div class="as-stage">
        <div class="as-top"><b>🎬 一鍵通關 · ${S.title}</b><span class="as-count"></span><button class="as-x" title="離開（Esc）">✕ 離開</button></div>
        <div class="as-main">
          <div class="as-screen ${S.kind === 'code' ? 'as-code' : 'as-term'}"></div>
          <div class="as-card"></div>
        </div>
        <div class="as-ctl">
          <button class="as-auto">⏩ 自動播放</button>
          <button class="as-next as-go">▶ 開始</button>
          <button class="as-end">⏭ 跳到結尾</button>
        </div>
      </div>`,
      finish
    );
    const el = L.el,
      scr = el.querySelector('.as-screen'),
      card = el.querySelector('.as-card'),
      count = el.querySelector('.as-count'),
      bNext = el.querySelector('.as-next'),
      bAuto = el.querySelector('.as-auto'),
      bEnd = el.querySelector('.as-end');
    el.querySelector('.as-x').onclick = finish;
    const n = S.steps.length;
    const setCard = (h) => {
      card.innerHTML = h;
      card.scrollTop = 0;
    };
    const stepCard = (s, extra = '') =>
      `<div class="as-step">第 ${i + 1} / ${n} 步</div>
       <pre class="as-line">${hl(s.code ? s.code.trim() : s.input, S.kind === 'code' ? 'python' : 'sql')}</pre>
       <p class="as-say">${s.say}</p>
       ${s.parts ? `<div class="as-parts">${s.parts.map(([k, v]) => `<div><code>${esc(k)}</code><span>${esc(v)}</span></div>`).join('')}</div>` : ''}
       ${extra}`;

    // ---------------- the screen: a terminal running the real detective console, or the Two Sum editor ----------------
    let typeLine, runStep, opening;
    if (S.kind === 'sql') {
      scr.innerHTML = '<div class="as-out"></div><div class="as-ps"><span></span><i></i></div>';
      const out = scr.querySelector('.as-out'),
        ps = scr.querySelector('.as-ps span'),
        typed = scr.querySelector('.as-ps i');
      const scroll = () => (scr.scrollTop = scr.scrollHeight);
      const io = {
        print(t = '', cls) {
          const d = document.createElement('div');
          d.textContent = t;
          if (cls) d.className = cls;
          out.appendChild(d);
          scroll();
        },
        html(h) {
          const d = document.createElement('div');
          d.innerHTML = h;
          out.appendChild(d);
          scroll();
        },
        prompt(p) {
          ps.textContent = p;
        },
        clear() {
          out.innerHTML = '';
        },
      };
      const D = g.detective;
      opening = D.enter(io, id, { practice: opts.practice });
      typeLine = async (txt, fast) => {
        typed.textContent = '';
        if (fast) return;
        const dt = Math.max(8, Math.min(40, 1400 / txt.length));
        for (const ch of txt) {
          if (closed) return;
          typed.textContent += ch;
          scroll();
          await wait(dt);
        }
        await wait(250);
      };
      runStep = async (s) => {
        const before = [...D.st(id).clues];
        typed.textContent = '';
        io.print(ps.textContent + s.input, 'tm-echo');
        await D.run(s.input, io);
        const st = D.st(id),
          got = D.cur.clues.filter((c) => st.clues.includes(c.id) && !before.includes(c.id));
        if (st.solved) solved = true;
        return got.map((c) => `<div class="as-clue">📝 找到線索：${esc(c.text)}</div>`).join('');
      };
    } else {
      // Two Sum: an editor showing the code being typed, and a panel with the judge's verdict
      const Q = g.howardQuest;
      scr.innerHTML = '<pre class="as-ed"></pre><div class="as-res"></div>';
      const ed = scr.querySelector('.as-ed'),
        res = scr.querySelector('.as-res');
      let code = TWO_SUM_STARTER.replace(/[ ]+$/, '');
      const paint = (cur) => {
        ed.innerHTML = `${hl(code, 'python')}${cur ? '<i class="as-caret"></i>' : ''}`;
        ed.scrollTop = ed.scrollHeight;
      };
      paint();
      opening = Promise.resolve(true);
      typeLine = async (txt, fast, s) => {
        if (!s.code) return;
        const add = `${s.code}\n`;
        if (fast) {
          code += add;
          paint();
          return;
        }
        const dt = Math.max(12, Math.min(45, 1300 / add.length));
        for (const ch of add) {
          if (closed) return;
          code += ch;
          paint(true);
          await wait(ch === ' ' ? 4 : dt);
        }
        paint();
      };
      runStep = async (s) => {
        if (!s.act) return '';
        if (!s.code && s.act) code = TWO_SUM_SOLUTION;
        res.innerHTML = `⏳ ${s.act === 'run' ? '執行範例' : '提交'}中……（第一次要下載 Python，約 10 秒）`;
        let r;
        try {
          r = await Q.judge(code, s.act);
        } catch (e) {
          r = { err: String(e?.message || e), offline: true };
        }
        if (closed) return '';
        const offline = r.offline || (r.err && !r.cases?.length && !/語法|Solution/.test(r.err));
        if (offline) {
          if (s.act === 'submit') {
            if (!Q.done) Q._accepted();
            solved = true;
            res.innerHTML =
              '<div class="ts-ac">✅ Python 沒有載入成功（可能沒網路），這次直接判定通過！</div>';
          } else
            res.innerHTML =
              '<div class="ts-note">Python 沒有載入成功（可能沒網路），提交時會直接判定通過。</div>';
          return '';
        }
        const ok = (r.cases || []).filter((c) => !c.why && !c.err).length;
        if (s.act === 'run')
          res.innerHTML = `<div class="ts-note">✅ 範例 ${ok} / ${(r.cases || []).length} 組都對了</div>`;
        else if (r.ok) {
          solved = true;
          res.innerHTML = `<div class="ts-ac">✅ Accepted　${r.passed} 組測資全部通過・n = 20,000 只花 ${(r.times || [])[1]} ms</div>`;
        } else res.innerHTML = `<div class="ts-bad">❌ ${esc(r.err || '沒有通過')}</div>`;
        return '';
      };
    }

    // ---------------- stepping ----------------
    const doneCard = () => {
      const c = S.kind === 'sql' ? g.detective?.cur : null;
      setCard(
        solved
          ? `<div class="as-win">✅ ${S.kind === 'sql' ? `破案！犯人就是 <b>${esc(c?.culprit || '')}</b>` : 'Accepted！霍華德的忍 400 可以騎了'}</div>
             ${c ? `<p class="as-say">${esc(c.solved)}</p>` : ''}
             <p class="as-dim">${opts.practice ? '這是練習模式，存檔沒有改變。' : '之後想自己再破一次，按任務畫面上的 🔁 再破一次 就可以（手動或自動都行）。'}</p>`
          : '<div class="as-bad">這次沒有順利完成，可以離開後再按一次 🎬 一鍵通關。</div>'
      );
      count.textContent = '完成';
      bNext.textContent = '✔ 完成';
      bAuto.disabled = bEnd.disabled = true;
      auto = false;
    };
    const step = async (fast) => {
      if (busy || closed) return;
      if (i >= n - 1) {
        finish();
        return;
      }
      busy = true;
      bNext.disabled = true;
      const my = ++tick;
      i++;
      const s = S.steps[i];
      count.textContent = `${i + 1} / ${n}`;
      setCard(stepCard(s, '<div class="as-dim">⌨️ 輸入中……</div>'));
      await typeLine(s.input, fast, s);
      if (closed) return;
      const extra = await runStep(s);
      if (closed) return;
      setCard(stepCard(s, extra));
      busy = false;
      bNext.disabled = false;
      bNext.textContent = i >= n - 1 ? '▶ 看結果' : '▶ 下一步';
      if (i >= n - 1) {
        if (fast) return;
        await wait(auto ? 1800 : 0);
        if (auto && !closed) {
          i = n; // shown
          doneCard();
          return;
        }
      }
      if (auto && !fast) {
        await wait(Math.min(7000, 1400 + s.say.length * 45));
        if (auto && !closed && !busy && tick === my) step();
      }
    };
    bNext.onclick = async () => {
      if (i === n - 1 && !busy) {
        i = n;
        doneCard();
        return;
      }
      if (i >= n) {
        finish();
        return;
      }
      step();
    };
    bAuto.onclick = () => {
      auto = !auto;
      bAuto.textContent = auto ? '⏸ 暫停' : '⏩ 自動播放';
      if (auto && !busy) {
        if (i === n - 1) {
          i = n;
          doneCard();
        } else step();
      }
    };
    bEnd.onclick = async () => {
      auto = false;
      bAuto.textContent = '⏩ 自動播放';
      bAuto.disabled = bEnd.disabled = bNext.disabled = true;
      while (busy) await wait(50);
      while (!closed && i < n - 1) await step(true);
      if (closed) return;
      i = n;
      bNext.disabled = false;
      doneCard();
    };
    // the intro: what the case is and what we will use
    bNext.disabled = true;
    setCard(
      `<div class="as-step">開始之前</div><p class="as-say">${S.intro}</p>
       <p class="as-dim">按「▶ 下一步」一步一步慢慢看，或按「⏩ 自動播放」讓它自己跑。</p>`
    );
    count.textContent = `0 / ${n}`;
    opening.then((ok) => {
      if (closed) return;
      if (ok === false) {
        setCard(
          '<div class="as-bad">❌ SQL 引擎載入失敗：需要網路連線（第一次會從 CDN 下載）。連上網路之後再按一次 🎬 一鍵通關。</div>'
        );
        bAuto.disabled = bEnd.disabled = true;
        bNext.textContent = '✔ 關閉';
        bNext.disabled = false;
        i = n;
        return;
      }
      bNext.disabled = false;
    });
  });
}
