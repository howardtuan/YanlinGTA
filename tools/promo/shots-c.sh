#!/bin/zsh
# Segment C: computer. Needs tools/promo/boot.sh running. Output: tools/promo/out/clips/<name>/
cd "$(dirname "$0")/../.."
ev() { curl -s -X POST --data-binary "$1" http://127.0.0.1:7788/eval; echo; }
rec() { echo "rec $1"; curl -s -X POST --data-binary "${3:-}" "http://127.0.0.1:7788/rec?dir=tools/promo/out/clips/$1&frames=$2${4:-}"; echo; }
TICK="await __D.tick(i);"
R="&rate=0.33"
# page helpers: one maximised window on the desktop; wait for a condition (real time, Pyodide / sql.js run off-thread)
ev "(()=>{ window.__C = {
  solo(id){ const pc=game.pc; if(!pc.isOpen) pc.open('資管系 電腦教室'); for(const k of Object.keys(pc.wins)) pc._closeWin(k);
    document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click();
    pc.launch(id); const W=pc.wins[id]; if(W && !W.w.classList.contains('max')) { const b=W.w.querySelector('.pc-max'); const r=W.w.getBoundingClientRect(); if(r.width<1900) b?.click(); }
    document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(); return W; },
  w(id){ return game.pc.wins[id].w; },
  until(fn, ms=20000){ return new Promise(r=>{ const t0=Date.now(); const t=setInterval(()=>{ if(fn()||Date.now()-t0>ms){clearInterval(t); r(1);} },40); }); },
}; return 1})()"
reset() { ev "(()=>{ document.querySelectorAll('.as-layer.on .as-x').forEach(b=>b.click()); __rec.hook=null; __D.P=null; if(game.pc.isOpen) game.pc.close(); game.phone.open&&game.phone.close(); return 1})()" >/dev/null; }
only=${1:-all}
want() { [[ $only == all || $only == *$1* ]]; }

if want warm; then # load Pyodide and sql.js once so later runs answer within a frame or two
ev "(async()=>{ const W=__C.solo('learn'); const w=W.w; w.querySelector('.lr-card[data-c=py]').click(); __rec.step(2);
  const t=w.querySelector('.lr-code'); t.value='print(1)'; w.querySelector('.lr-run').click(); await __C.until(()=>/通過|錯誤|答案|不對|Error/.test(w.querySelector('.lr-out, .lr-result, .lr-fb')?.textContent||''), 60000);
  w.querySelector('.lr-home-b').click(); __rec.step(2); w.querySelector('.lr-card[data-c=sq]').click(); __rec.step(2);
  const t2=w.querySelector('.lr-code'); t2.value='SELECT 1;'; w.querySelector('.lr-run').click(); await __C.until(()=>false, 3000);
  w.querySelector('.lr-reset')?.click(); w.querySelector('.lr-home-b').click(); return 'warm' })()"
fi

if want lab; then reset
ev "(()=>{ __D.clock(10,0); const ux=0.944,uz=0.325, sx=84.01, sz=98.18, gy=2.6;
  const scr=[sx-0.85*ux, gy+1.0, sz-0.85*uz];
  __D.shot({frames:100, ease:'inout', fov:62,
    pos:[[sx+2.4*ux+0.3,gy+1.75,sz+2.4*uz+0.6],[sx+0.9*ux+0.1,gy+1.45,sz+0.9*uz+0.2],[sx+0.05*ux,gy+1.1,sz+0.05*uz]],
    look:[scr,scr,scr]}); return 1})()"
rec c10_lab 100 "" "$R"
ev "(()=>{ __rec.hook=null; game.pc.open('資管系 電腦教室'); for(const k of Object.keys(game.pc.wins)) game.pc._closeWin(k); __D.plan({taps:[{at:30, sel:'#pc .pc-icon[data-app=learn]'}]}); return 1})()"
rec c10_desk 60 "$TICK" "$R"; fi

if want sql; then reset
ev "(()=>{ const W=__C.solo('learn'); const w=W.w; __D.plan({
  taps:[{at:15, sel:()=>__C.w('learn').querySelector('.lr-card[data-c=sq]')},{at:34, sel:()=>__C.w('learn').querySelector('[data-l=\"1\"]')},{at:190, sel:()=>__C.w('learn').querySelector('.lr-run')}],
  steps:[{at:48, fn:()=>__C.w('learn').querySelector('.lr-code').scrollIntoView({block:'center', behavior:'instant'})}],
  types:[{from:62, sel:'#pc .lr-code', text:'SELECT name, score FROM students WHERE dept = \'資管\';', cps:14}], scrolls:[{from:200,to:232,sel:'#pc .lr-main',px:300}] }); return 1})()"
rec c_sql 240 "$TICK" "$R"; fi

if want term; then reset
ev "(()=>{ __C.solo('term'); const sel='#pc .tm-in'; const enter=()=>{ const el=document.querySelector(sel); el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true})); };
  __D.plan({ types:[{from:10, sel, text:'case', cps:8},{from:80, sel, text:'SELECT camera, time, plate FROM cctv WHERE plate LIKE \'MKZ%\';', cps:20}],
   steps:[{at:45, fn:()=>{ enter(); return __C.until(()=>!document.querySelector('.as-ask.on')||(document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(),false), 3000); }},
          {at:60, fn:()=>{ document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(); }},
          {at:200, fn:()=>{ enter(); }}] }); return 1})()"
rec c_term 240 "$TICK" "$R"; fi

if want leet; then reset
ev "(()=>{ game.howardQuest.onPC = true; const W=__C.solo('leet'); __D.plan({ taps:[{at:30, sel:'#pc .ts-auto'},{at:62, sel:()=>document.querySelector('.as-layer.on .as-auto')}] }); return 1})()"
rec c_leet 240 "$TICK" "$R"; fi

if want paint; then reset
ev "(()=>{ const W=__C.solo('paint'); const cv=W.w.querySelector('canvas'); const r=()=>cv.getBoundingClientRect();
  const P=(t,x,y)=>{ const b=r(); cv.dispatchEvent(new PointerEvent(t,{clientX:b.left+x*b.width, clientY:b.top+y*b.height, bubbles:true, pointerId:1, buttons:1})); if(t==='pointerup') window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1})); };
  // a heart, then a V sign, each stroke drawn over frames
  const heart=[]; for(let k=0;k<=60;k++){ const a=k/60*Math.PI*2; const x=16*Math.sin(a)**3, y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a); heart.push([0.32+x/80, 0.45-y/70]); }
  const vee=[[0.6,0.3],[0.66,0.62],[0.72,0.3]];
  const strokes=[{c:'#e8323c',pts:heart,from:20,dur:80},{c:'#2f7fd8',pts:vee,from:120,dur:40}];
  __D.plan({ taps:[{at:12, sel:'#pc .pt-c[data-c=\"#e8323c\"]'},{at:108, sel:'#pc .pt-c[data-c=\"#2f7fd8\"]'}],
    steps: strokes.flatMap(s=>{ const out=[]; for(let f=0; f<=s.dur; f++){ out.push({at:s.from+f, fn:()=>{ const n=s.pts.length-1; const k=Math.round(f/s.dur*n); const [x,y]=s.pts[k]; P(f===0?'pointerdown':f===s.dur?'pointerup':'pointermove', x, y); }}); } return out; }) }); return 1})()"
rec c_paint 200 "$TICK" "$R"; fi

if want mines; then reset
ev "(()=>{ const W=__C.solo('mines'); const N=9; const cells=()=>[...__C.w('mines').querySelectorAll('.mn-grid button')];
  const nbr=(i)=>{ const x=i%N, y=Math.floor(i/N), o=[]; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const a=x+dx, b=y+dy; if(a>=0&&b>=0&&a<N&&b<N) o.push(b*N+a);} return o; };
  // a tiny solver: first click in the middle, then only moves that follow from the numbers (flag sure mines, open sure-safe cells)
  const move=()=>{ const c=cells(); const st=c.map(b=>/\bop\b/.test(b.className)?(+((b.className.match(/n(\d)/)||[])[1]||0)):/\bfl\b/.test(b.className)?'F':null);
    if(st.every(v=>v===null)) return {i:40, flag:false};
    for(let i=0;i<N*N;i++){ const n=st[i]; if(typeof n!=='number'||n===0) continue; const nb=nbr(i); const hid=nb.filter(j=>st[j]===null), fl=nb.filter(j=>st[j]==='F');
      if(hid.length && fl.length===n) return {i:hid[0], flag:false};
      if(hid.length && hid.length+fl.length===n) return {i:hid[0], flag:true}; }
    return null; };
  const cache={}; const taps=[]; for(let k=0;k<12;k++){ const at=20+k*18; taps.push({at, sel:()=>{ if(!(k in cache)){ if(i_now()<at-8) return null; const m=move(); cache[k]=m; } const m=cache[k]; if(!m) return null; const el=cells()[m.i]; el.__flag=m.flag; return el; }}); }
  let fr=0; window.i_now=()=>fr; __D.plan({ taps, steps:Array.from({length:240},(_,f)=>({at:f, fn:()=>{fr=f;}})) }); return 1})()"
rec c_mines 240 "$TICK" "$R"; fi

if want stats; then reset
ev "(()=>{ const W=__C.solo('stats'); return 1})()"
rec c_stats 120 "" "$R"; fi

if want hero; then reset
ev "(()=>{ const W=__C.solo('learn'); __C.w('learn').querySelector('.lr-card[data-c=py]').click(); __rec.step(2); __C.w('learn').querySelector('[data-l=\"1\"]').click(); __rec.step(2);
  const w=__C.w('learn'); w.querySelector('.lr-reset')?.click(); w.querySelector('.lr-code').scrollIntoView({block:'center', behavior:'instant'}); __rec.step(2);
  __D.plan({ types:[{from:12, sel:'#pc .lr-code', text:'votes = 120\nvotes += 34\nprint(votes)', cps:16, keep:''}],
    taps:[{at:100, sel:()=>__C.w('learn').querySelector('.lr-run')}], scrolls:[{from:110,to:138,sel:'#pc .lr-main',px:260}] }); return 1})()"
rec c12_hero 160 "$TICK" "$R"; fi

if want outro; then reset
ev "(()=>{ __D.clock(17,5); game.fpv.on=false; for(const l of game.world.labels) l.material.visible=false; __D.place(-16.5,127,0); __rec.step(20); const gy=__D.gy(-16.5,131); __D.place(-16.5,127,0); __rec.step(5);
  __D.shot({frames:165, ease:'inout', fov:55, pos:[[-16.5,gy+1.55,130.4],[-16.2,gy+3.5,138],[-15,gy+22,165],[-14,gy+48,192]], look:[[-16.5,gy+1.35,127],[-16.5,gy+2,124],[-16.5,gy+4,112],[-18,gy,96]]});
  __D.plan({ steps:[{at:0, fn:()=>game.player.setPose('peace', 2.2)},{at:60, fn:()=>game.player.setPose('peace', 2.2)},{at:120, fn:()=>game.player.setPose('peace', 2.2)}] }); return 1})()"
rec d14_outro 165 "$TICK" "&rate=0.33"
ev "game.fpv.on=true; 1"; fi
