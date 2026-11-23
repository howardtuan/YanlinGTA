// 「資管學堂」：彥霖電腦（和系館電腦教室）桌面上的線上學習網站，兩門課：Python 入門、MySQL 入門。
// 每一課有說明、範例和一題練習；練習在網頁裡真的執行再自動批改：
//  - Python：Pyodide（CPython 編成 WebAssembly）跑在背景 Web Worker 裡，第一次執行時才從 CDN 載入（約 10 秒），
//    超過 10 秒沒跑完（多半是無窮迴圈）就把 Worker 停掉重開。批改方式是比對印出來的結果，有些題目還要求用到某個語法。
//  - MySQL：sql.js（SQLite 編成 WebAssembly），同樣第一次才載入。每次執行都從一份全新的範例資料庫開始
//    （students、candidates、votes 三張表），練習只用 MySQL 和 SQLite 寫法相同的語法。
//    SELECT 題比對最後一個查詢的結果（題目要求排序時連順序一起比）；INSERT／UPDATE／DELETE 題執行後再用檢查查詢比對。
// 進度（完成的課、你寫的程式）存在這台瀏覽器的 localStorage（yanlinGTA.learn.v1），跟遊戲存檔分開。
const esc = (t) =>
  String(t).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
const KEY = 'yanlinGTA.learn.v1';
const PY_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const SQL_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

// ---------------------------------------------------------------- courses (content in src/systems/minigames/LearnCourses.js)
import { PY, SQ, AG, SEED, SCHEMA } from './LearnCourses.js';
const COURSES = [
  {
    id: 'py',
    name: 'Python 入門',
    icon: '🐍',
    color: '#3776ab',
    desc: '從 print 到函式，9 堂課學會 Python 基本功',
    lessons: PY,
    lang: 'python',
  },
  {
    id: 'sq',
    name: 'MySQL 入門',
    icon: '🐬',
    color: '#00758f',
    desc: '用系上投票資料庫練習 SELECT、GROUP BY、JOIN',
    lessons: SQ,
    lang: 'sql',
  },
  {
    id: 'ag',
    name: 'AI Agent 入門',
    icon: '🤖',
    color: '#6a3fd6',
    desc: '用 Python 一步步做出會感知、規劃、用工具、記憶、查資料、自我檢查的 AI 代理',
    lessons: AG,
    lang: 'python',
  },
];

// ---------------------------------------------------------------- progress
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
function store(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: progress just isn't kept */
  }
}

// ---------------------------------------------------------------- engines
let pyW = null,
  pyReady = null,
  pyId = 0;
const pyWait = new Map();
function pyWorker() {
  if (pyW) return pyReady;
  const src = `importScripts('${PY_URL}pyodide.js');
let py; const ready = loadPyodide({ indexURL: '${PY_URL}' }).then(p => { py = p; postMessage({ ready: true }); }, e => postMessage({ fail: String(e) }));
onmessage = async (e) => {
  await ready; let out = '';
  // raw writes (not line-batched), so text printed without a newline (print(x, end=" ")) shows up too
  const dec = new TextDecoder(), write = (b) => { out += dec.decode(b, { stream: true }); return b.length; };
  py.setStdout({ write }); py.setStderr({ write });
  const ns = py.globals.get('dict')();
  // print(..., end="") leaves a line without a newline in the buffer: flush it, or it shows up in the next run
  const flush = () => { try { py.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()"); } catch {} };
  try { await py.runPythonAsync(e.data.code, { globals: ns }); flush(); postMessage({ id: e.data.id, out }); }
  catch (err) { flush(); postMessage({ id: e.data.id, out, err: String(err.message || err) }); }
  finally { ns.destroy(); }
};`;
  pyW = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  pyReady = new Promise((ok, bad) => {
    pyW.onmessage = (e) => {
      const d = e.data;
      if (d.ready) return ok();
      if (d.fail) {
        bad(new Error(d.fail));
        pyW.terminate();
        pyW = null;
        return;
      }
      const w = pyWait.get(d.id);
      if (w) {
        pyWait.delete(d.id);
        w(d);
      }
    };
    pyW.onerror = (e) => {
      bad(new Error(e.message || '載入失敗'));
      pyW?.terminate();
      pyW = null;
    };
  });
  return pyReady;
}
async function runPython(code) {
  await pyWorker();
  const id = ++pyId;
  return new Promise((ok) => {
    const t = setTimeout(() => {
      // an endless loop: stop the worker, the next run starts a new one
      pyWait.delete(id);
      pyW?.terminate();
      pyW = null;
      ok({ out: '', err: '執行超過 10 秒，已經強制停止（是不是寫成無窮迴圈了？）', timeout: true });
    }, 10000);
    pyWait.set(id, (d) => {
      clearTimeout(t);
      ok(d);
    });
    pyW.postMessage({ id, code });
  });
}
// Python's traceback without Pyodide's own frames: from the first line about the user's code
function pyErr(e) {
  const i = e.indexOf('File "<exec>"');
  return i >= 0 ? `Traceback（錯誤位置）:\n  ${e.slice(i)}` : e;
}
let SQL = null;
export function sqlEngine() {
  if (SQL) return SQL;
  SQL = new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = `${SQL_URL}sql-wasm.js`;
    s.onload = () => window.initSqlJs({ locateFile: (f) => SQL_URL + f }).then(ok, bad);
    s.onerror = () => {
      SQL = null;
      bad(new Error('載入失敗'));
    };
    document.head.appendChild(s);
  });
  return SQL;
}
// run statements on a fresh copy of the practice database: { res: last result set or null, err, changes }
async function runSql(code, check) {
  const S = await sqlEngine(),
    db = new S.Database();
  try {
    db.exec(SEED);
    let res = null;
    const all = db.exec(code);
    if (all.length) res = all[all.length - 1];
    const changes = db.getRowsModified();
    const after = check ? db.exec(check)[0] || null : null;
    return { res, after, changes };
  } catch (e) {
    return { err: String(e.message || e) };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------- syntax colours (VS Code Dark+)
// A small tokenizer for the two languages on the site. Every token becomes <span class="hl-…">; a token that spans
// lines (a triple-quoted string) is wrapped line by line, so the result can still be split on \n for line numbers.
const PY_CTL = new Set(
  'if elif else for while break continue return import from as try except finally raise with pass yield assert del'.split(
    ' '
  )
);
const PY_KW = new Set(
  'def class lambda and or not in is None True False global nonlocal async await'.split(' ')
);
const PY_BI = new Set(
  'print len range sum max min sorted list dict set tuple int str float bool round enumerate zip any all isinstance open iter next super type abs map filter reversed input repr'.split(
    ' '
  )
);
const SQL_KW = new Set(
  'SELECT FROM WHERE AND OR NOT IN IS NULL AS ORDER BY GROUP HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE JOIN LEFT RIGHT INNER OUTER ON DISTINCT CREATE TABLE PRIMARY KEY INT VARCHAR BETWEEN LIKE ASC DESC UNION ALL CASE WHEN THEN ELSE END DROP ALTER ADD AUTO_INCREMENT'.split(
    ' '
  )
);
const SQL_FN = new Set(
  'COUNT SUM AVG MAX MIN ROUND UPPER LOWER LENGTH NOW CONCAT COALESCE'.split(' ')
);
const PY_RE =
  /(#[^\n]*)|([fFrRbB]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g;
const SQL_RE = /(--[^\n]*)|('(?:''|[^'])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g;
export function hl(code, lang) {
  let out = '';
  const put = (cls, t) => {
    out += cls
      ? t
          .split('\n')
          .map((x) => x && `<span class="hl-${cls}">${esc(x)}</span>`)
          .join('\n')
      : esc(t);
  };
  const callNext = (i) => /^\s*\(/.test(code.slice(i, i + 40));
  if (lang === 'sql') {
    for (const m of code.matchAll(SQL_RE)) {
      const end = m.index + m[0].length;
      if (m[1]) put('cm', m[1]);
      else if (m[2]) put('str', m[2]);
      else if (m[3]) put('num', m[3]);
      else if (m[4]) {
        const u = m[4].toUpperCase();
        put(SQL_KW.has(u) ? 'kw' : SQL_FN.has(u) && callNext(end) ? 'fn' : '', m[4]);
      } else put('', m[0]);
    }
    return out;
  }
  let prev = '',
    dot = false;
  for (const m of code.matchAll(PY_RE)) {
    const end = m.index + m[0].length;
    if (m[1]) put('cm', m[1]);
    else if (m[2]) {
      const s = m[2];
      if (/^[rRbB]?[fF]/.test(s)) {
        // f-string: the {…} parts are code
        let last = 0;
        for (const b of s.matchAll(/\{[^{}\n]*\}/g)) {
          put('str', s.slice(last, b.index));
          put('br', '{');
          put('var', b[0].slice(1, -1));
          put('br', '}');
          last = b.index + b[0].length;
        }
        put('str', s.slice(last));
      } else put('str', s);
    } else if (m[3]) put('fn', m[3]);
    else if (m[4]) put('num', m[4]);
    else if (m[5]) {
      const w = m[5];
      let cls = 'var';
      if (prev === 'def') cls = 'fn';
      else if (prev === 'class') cls = 'cls';
      else if (!dot && PY_CTL.has(w)) cls = 'ctl';
      else if (!dot && PY_KW.has(w)) cls = 'kw';
      else if (/^[A-Z]\w*(Error|Exception)$|^Exception$/.test(w)) cls = 'cls';
      else if (callNext(end)) cls = /^[A-Z]/.test(w) ? 'cls' : 'fn';
      else if (!dot && PY_BI.has(w)) cls = 'fn';
      put(cls, w);
      prev = w;
      dot = false;
      continue;
    } else put('', m[0]);
    if (m[0].trim()) {
      dot = m[0] === '.';
      prev = '';
    }
  }
  return out;
}

// ---------------------------------------------------------------- page
export function learnUI(root, game) {
  const st = load();
  st.done ||= {};
  st.code ||= {};
  let lesson = null;
  const doneIn = (c) => c.lessons.filter((l) => st.done[l.id]).length;

  function home() {
    lesson = null;
    root.innerHTML = `<div class="lr"><div class="lr-top"><b>🎓 資管學堂</b><span>iCode · 線上程式課</span></div>
      <div class="lr-home"><div class="lr-hero"><h2>寫程式，從今天開始</h2><p>每一課都有說明、範例和練習；程式在網頁裡直接執行，寫對了自動打勾 ✅</p></div>
      <div class="lr-cards">${COURSES.map((c) => {
        const n = doneIn(c),
          all = c.lessons.length;
        return `<button class="lr-card" data-c="${c.id}" style="--c:${c.color}">
        <span class="lr-ic">${c.icon}</span><b>${c.name}${n === all ? ' 🏅' : ''}</b><small>${c.desc}</small>
        <span class="lr-bar"><i style="width:${(n / all) * 100}%"></i></span><em>${n} / ${all} 課完成</em></button>`;
      }).join('')}</div>
      <p class="lr-note">第一次執行程式時會下載執行環境（Python 約 10 MB），需要網路，請稍等一下。</p></div></div>`;
    root
      .querySelectorAll('[data-c]')
      .forEach((b) => (b.onclick = () => open(COURSES.find((c) => c.id === b.dataset.c))));
  }

  function open(c, l) {
    lesson = l || c.lessons.find((x) => !st.done[x.id]) || c.lessons[0];
    const L = lesson,
      i = c.lessons.indexOf(L),
      sql = c.lang === 'sql';
    root.innerHTML = `<div class="lr"><div class="lr-top"><button class="lr-home-b">← 課程</button><b>${c.icon} ${c.name}</b><span>${doneIn(c)} / ${c.lessons.length} 完成</span></div>
      <div class="lr-cols"><nav class="lr-nav">${c.lessons.map((x, k) => `<button data-l="${k}" class="${x === L ? 'on' : ''}">${st.done[x.id] ? '✅' : `<i>${k + 1}</i>`} ${esc(x.t)}</button>`).join('')}
        ${sql ? `<div class="lr-schema"><b>📋 範例資料庫</b>${SCHEMA.map(([n, z, cols]) => `<div><code>${n}</code> ${z}<small>${cols}</small></div>`).join('')}</div>` : ''}</nav>
      <main class="lr-main"><h2>第 ${i + 1} 課　${esc(L.t)}</h2>
        <div class="lr-sec"><div class="lr-h">📖 觀念說明</div><div class="lr-text">${L.intro}</div></div>
        ${L.ex
          .map(
            (
              x,
              k
            ) => `<div class="lr-ex"><div class="lr-h">💻 範例 ${k + 1}：${esc(x.h)} <button class="lr-try" data-x="${k}">▶ 試跑</button></div>
          <pre class="lr-src">${lines(x.code, c.lang)}</pre><div class="lr-xout hidden" data-xo="${k}"></div><div class="lr-note"><b>解說</b>${x.note}</div></div>`
          )
          .join('')}
        <div class="lr-sec lr-pit"><div class="lr-h">⚠️ 常見錯誤</div><ul>${L.pit.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        <div class="lr-sec lr-sum"><div class="lr-h">📌 重點整理</div><ul>${L.sum.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        <div class="lr-task"><div class="lr-h">✏️ 練習</div><p>${L.task}</p></div>
        <div class="lr-edit"><pre class="lr-hl" aria-hidden="true"></pre><textarea class="lr-code" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div>
        <div class="lr-btns"><button class="lr-run">▶ 執行並批改</button><button class="lr-hint">💡 看解答</button><button class="lr-reset">↺ 重設</button>
          <span class="lr-flex"></span>${i < c.lessons.length - 1 ? '<button class="lr-next">下一課 →</button>' : ''}</div>
        <div class="lr-out hidden"></div><pre class="lr-ans hidden">${hl(L.ans, c.lang)}</pre></main></div></div>`;
    const ta = root.querySelector('.lr-code'),
      out = root.querySelector('.lr-out');
    // the editor: a transparent textarea over a coloured copy of its text (.lr-hl), grown to fit its lines
    const pre = root.querySelector('.lr-hl');
    const paint = () => {
      pre.innerHTML = `${hl(ta.value, c.lang)}\n`;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
      pre.scrollLeft = ta.scrollLeft;
    };
    ta.value = st.code[L.id] ?? L.start;
    ta.rows = Math.max(6, ta.value.split('\n').length + 2);
    ta.addEventListener('input', () => {
      st.code[L.id] = ta.value;
      store(st);
      paint();
    });
    ta.addEventListener('scroll', () => {
      pre.scrollLeft = ta.scrollLeft;
    });
    paint();
    requestAnimationFrame(paint);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // indent with 4 spaces (Python cares)
        e.preventDefault();
        const a = ta.selectionStart,
          b = ta.selectionEnd;
        ta.value = `${ta.value.slice(0, a)}    ${ta.value.slice(b)}`;
        ta.selectionStart = ta.selectionEnd = a + 4;
        ta.dispatchEvent(new Event('input'));
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        run(false);
      } else if (e.key === 'Enter' && !sql) {
        // keep the indent of the line, one more after a colon
        e.preventDefault();
        const a = ta.selectionStart,
          line = ta.value.slice(ta.value.lastIndexOf('\n', a - 1) + 1, a);
        const ind = line.match(/^ */)[0] + (/:\s*$/.test(line) ? '    ' : '');
        ta.value = `${ta.value.slice(0, a)}\n${ind}${ta.value.slice(ta.selectionEnd)}`;
        ta.selectionStart = ta.selectionEnd = a + 1 + ind.length;
        ta.dispatchEvent(new Event('input'));
      }
      e.stopPropagation();
    });
    root.querySelector('.lr-home-b').onclick = home;
    root
      .querySelectorAll('[data-l]')
      .forEach((b) => (b.onclick = () => open(c, c.lessons[+b.dataset.l])));
    root.querySelector('.lr-reset').onclick = () => {
      ta.value = L.start;
      delete st.code[L.id];
      store(st);
      out.classList.add('hidden');
      paint();
    };
    root.querySelector('.lr-hint').onclick = () =>
      root.querySelector('.lr-ans').classList.toggle('hidden');
    root.querySelector('.lr-next')?.addEventListener('click', () => open(c, c.lessons[i + 1]));
    root
      .querySelectorAll('[data-x]')
      .forEach(
        (b) =>
          (b.onclick = () =>
            run(true, L.ex[+b.dataset.x].code, root.querySelector(`[data-xo="${b.dataset.x}"]`)))
      );
    root.querySelector('.lr-run').onclick = () => run(false);

    // example: run one of the examples into its own box (no grading); otherwise the exercise, graded
    async function run(example, src, box = out) {
      const code = example ? src : ta.value,
        out = box;
      out.classList.remove('hidden');
      out.innerHTML = `<div class="lr-wait">⏳ ${sql ? (SQL ? '執行中…' : '第一次執行，正在載入 SQL 引擎…') : pyW ? '執行中…' : '第一次執行，正在載入 Python（約 10 秒）…'}</div>`;
      try {
        if (sql) await sqlRun(code, example, out);
        else await pyRun(code, example, out);
      } catch (e) {
        console.error(e);
        out.innerHTML = `<div class="lr-bad">❌ 執行環境載入失敗：${esc(e.message || e)}<br><small>需要網路連線（從 CDN 下載），請確認網路後再按一次。</small></div>`;
      }
    }
    async function pyRun(code, example, out) {
      const r = await runPython(code);
      const text = (r.out || '').replace(/\s+$/, '');
      let h = `<div class="lr-h">輸出</div><pre class="lr-term">${esc(text) || '<span class="lr-dim">（沒有輸出）</span>'}${r.err ? `\n<span class="lr-red">${esc(pyErr(r.err))}</span>` : ''}</pre>`;
      if (!example) {
        const norm = (s) =>
          s
            .replace(/\r/g, '')
            .split('\n')
            .map((x) => x.replace(/\s+$/, ''))
            .join('\n')
            .trim();
        const okOut = !r.err && norm(text) === norm(L.out);
        const okMust =
          !L.must ||
          (L.mustAny
            ? L.must.some((m) => code.includes(m))
            : L.must.every((m) => code.includes(m)));
        h += verdict(
          okOut && okMust,
          r.err
            ? '程式有錯誤，看看上面紅字的最後一行。'
            : !okOut
              ? `輸出跟題目要的不一樣。題目要的是：<pre>${esc(L.out)}</pre>`
              : `結果對了，但這題要練習用 <code>${esc((L.must || []).join(' / '))}</code> 寫喔。`
        );
      }
      out.innerHTML = h;
    }
    async function sqlRun(code, example, out) {
      const r = await runSql(code, example ? null : L.check);
      if (r.err) {
        out.innerHTML = `<div class="lr-h">結果</div><pre class="lr-term"><span class="lr-red">錯誤：${esc(r.err)}</span></pre>${example ? '' : verdict(false, 'SQL 有語法錯誤，檢查一下拼字、逗號和引號。')}`;
        return;
      }
      let h = `<div class="lr-h">結果</div>`;
      if (L.check && !example)
        h += `<div class="lr-dim">影響了 ${r.changes} 筆資料。執行後的 <code>students</code>：</div>${table(r.after)}`;
      else
        h += r.res
          ? table(r.res)
          : `<div class="lr-dim">執行完成，影響了 ${r.changes} 筆資料（沒有查詢結果）。</div>`;
      if (!example) {
        const want = await runSql(L.ans, L.check);
        const rows = (t) =>
          (t?.values || []).map((v) =>
            JSON.stringify(v.map((x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x)))
          );
        const same = (a, b) => {
          const x = rows(a),
            y = rows(b);
          if (!L.ordered) {
            x.sort();
            y.sort();
          }
          return x.length === y.length && x.every((v, k) => v === y[k]);
        };
        const ok = L.check ? same(r.after, want.after) : same(r.res, want.res);
        h += verdict(
          ok,
          L.check
            ? '資料表的結果跟題目要的不一樣，看看「💡 看解答」。'
            : !r.res
              ? '這題要用 SELECT 查出結果。'
              : L.ordered
                ? '查詢結果（或排列順序）跟題目要的不一樣。'
                : '查詢結果跟題目要的不一樣。'
        );
      }
      out.innerHTML = h;
    }
    function verdict(ok, why) {
      if (!ok) return `<div class="lr-bad">❌ 還差一點：${why}</div>`;
      const first = !st.done[L.id];
      st.done[L.id] = true;
      store(st);
      const all = doneIn(c) === c.lessons.length;
      if (first) {
        game?.audio?.pop?.();
        game?.hud?.toast(
          all ? `🏅 恭喜完成「${c.name}」全部課程！` : `✅ 第 ${i + 1} 課完成`,
          'good',
          2400
        );
        const nb = root.querySelector(`[data-l="${i}"]`);
        if (nb) nb.innerHTML = `✅ ${esc(L.t)}`;
        const top = root.querySelector('.lr-top span');
        if (top) top.textContent = `${doneIn(c)} / ${c.lessons.length} 完成`;
      }
      return `<div class="lr-good">✅ 答對了！${all ? `你已經完成整門「${c.name}」🏅` : i < c.lessons.length - 1 ? '可以往下一課了 →' : ''}</div>`;
    }
  }
  // example source with line numbers (the notes refer to 第 n 行)
  function lines(code, lang) {
    return hl(code, lang)
      .split('\n')
      .map((l, k) => `<span class="lr-ln">${k + 1}</span>${l}`)
      .join('\n');
  }
  function table(t) {
    if (!t) return '<div class="lr-dim">（沒有資料）</div>';
    return `<div class="lr-tbl"><table><tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${t.values.map((r) => `<tr>${r.map((v) => `<td>${v === null ? '<i>NULL</i>' : esc(typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v)}</td>`).join('')}</tr>`).join('')}</table></div><div class="lr-dim">${t.values.length} 筆</div>`;
  }
  home();
  return { home };
}
