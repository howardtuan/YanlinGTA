#!/usr/bin/env bash
# v3 promo (about 2 min): every clip the new timeline needs. Needs the recorder daemon in free roam
# (tools/promo/boot.sh, or rec.mjs + the boot evals) with director.js loaded. Output: tools/promo/out/clips/<name>/
# usage: tools/promo/shots_v3.sh [all | "campus area phone pc zz map"]  (or single clip names, e.g. "t_train")
source "$(dirname "$0")/v3_lib.sh"
only=${1:-all}
want() { [[ $only == all || " $only " == *" $1 "* || " $only " == *" $2 "* ]]; }
PH="&clip=1586,225,300,630,2&rate=0.33"
R="&rate=0.33"
TICK="await __D.tick(i);"
# keep dialogs, modals and toasts on screen (the story shots), hide the rest of the HUD
STORYCSS="document.getElementById('promoCss').textContent='#hud > *:not(#dialog):not(#toast), #keyHints, .keyhints, #prompt, .prompt, #crosshair, #sunday { display:none !important }';"

# ---------------------------------------------------------------- campus
if want campus a01_gate; then reset
ev "(()=>{__D.clock(8,40); __rec.step(20);
 __D.shot({frames:150, bob:1, ease:'linear',
  pos: __D.G([[-229,1.68,92],[-219,1.68,89],[-209,1.68,86.4],[-199,1.68,85.6],[-188,1.68,82.5]]),
  look: __D.G([[-212,2.4,86],[-200,2.6,84],[-189,2.8,81],[-177,3.0,78],[-164,3.2,76]])}); return 1})()"
rec a01_gate 150; fi

if want campus a02_tower; then reset
ev "(()=>{__D.clock(9,10); __rec.step(20);
 __D.shot({frames:120, bob:1, ease:'linear',
  pos: __D.G([[-16.5,1.68,146],[-16.5,1.68,136],[-16.5,1.68,126]]),
  look: [[-16.5,9,103.6],[-16.5,12,103.6],[-16.5,15,103.6]]}); return 1})()"
rec a02_tower 120; fi

if want campus a03_lawn; then reset
ev "(()=>{__D.clock(17,20); __rec.step(20);
 __D.shot({frames:70, ease:'linear', pos: __D.G([[-27,1.7,141],[-22,1.7,137]]), look: [[-16.5,9,103.6],[-16.5,9,103.6]]}); return 1})()"
rec a03_lawn 70; fi

if want campus a03_gym; then reset
ev "(()=>{__D.clock(10,30); __rec.step(20);
 __D.shot({frames:70, ease:'linear', fov:55, pos: [[-30,46,-148],[-8,43,-154]], look: [[-23,0,-226],[-21,0,-226]]}); return 1})()"
rec a03_gym 70; fi

if want campus a03_dept; then reset
ev "(()=>{__D.clock(10,10); __rec.step(20);
 __D.shot({frames:70, ease:'linear', pos: __D.G([[131,1.7,136],[125,1.7,132]]), look: __D.G([[108,7,116],[108,7,116]])}); return 1})()"
rec a03_dept 70; fi

if want campus a04_crane; then reset
ev "(()=>{__D.clock(17,25); __rec.step(20); const gy=__D.gy(-16.5,146);
 __D.shot({frames:100, ease:'inout', fov:58, pos: [[-16.5,gy+1.4,146],[-16.5,gy+8,152],[-16.5,gy+34,166]], look: [[-16.5,gy+9,103.6],[-16.5,gy+8,103.6],[-16.5,gy+2,103.6]]}); return 1})()"
rec a04_crane 100; fi

if want campus a06_aerial; then reset
ev "(()=>{__D.clock(16,40); __rec.step(20);
 __D.shot({frames:100, ease:'out', pos:[[-96,62,22],[-78,52,44]], look:[[-24,4,108],[-20,5,110]], fov:58}); return 1})()"
rec a06_aerial 100; fi

# the big map as a still for the map fly-over (shot 3)
if want campus map; then reset
ev "(()=>{__D.clock(10,0); game.openMap(); __rec.step(10); return 1})()"
shot tools/promo/out/stills/m_map.jpg
ev "(()=>{ game.closeMap?.(); document.querySelector('#bigMap .bm-x, #mapClose, .map-close')?.click(); __rec.step(4); return 1})()"; fi

# ---------------------------------------------------------------- the streets around campus
if want area a04_ride; then reset
ev "(()=>{__D.clock(10,20); const raw=[[222,-9],[209,-22],[194,-37],[188,-43],[170,-55],[146,-68],[110,-85],[88,-94],[71,-101],[51,-108],[29,-115],[12,-121],[-1,-126]]; window.__XP=__D.offsetPath(raw,1.2); __D.mount(220,-11,Math.atan2(-13,-13)); __D.ride(window.__XP, 11); __rec.step(110); return 1})()"
rec a04_ride 130; fi

if want area t_gordon; then reset
ev "(()=>{__D.clock(17,35); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[-98.2,1.68,58.2],[-100.6,1.68,64.4]]), look:[[-102.5,2.5,69.8],[-102.5,2.6,69.8]]}); return 1})()"
rec t_gordon 200; fi

if want area t_massage; then reset
ev "(()=>{__D.clock(17,35); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[213.6,1.68,-16.8],[212.1,1.68,-22.4]]), look:[[210.5,2.6,-29],[210.5,2.6,-29]]}); return 1})()"
rec t_massage 200; fi

if want area t_tea; then reset
ev "(()=>{__D.clock(17,35); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[-245.8,1.68,105.5],[-245.8,1.68,98.6]]), look:[[-245.8,2.6,92.8],[-245.8,2.6,92.8]]}); return 1})()"
rec t_tea 200; fi

if want area t_mcd; then reset
ev "(()=>{__D.clock(12,0); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[-133.5,1.7,-100.2],[-129.5,1.7,-101.6]]), look:__D.G([[-116,1.2,-101],[-116,1.2,-102]]), fov:66}); return 1})()"
rec t_mcd 200; fi

if want area t_market; then reset
ev "(()=>{__D.clock(17,40); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[-199,1.7,306],[-199,1.7,318]]), look:__D.G([[-199,3,345],[-199,3,350]])}); return 1})()"
rec t_market 200; fi

if want area t_train; then reset
ev "(()=>{ game.clock=9*60-1.2; __rec.step(2); const p=__D.G([[-262,1.7,-201]])[0], l=__D.G([[-292,3,-197]])[0]; __rec.hook=()=>__D.camAt(p,l,62); return 1})()"
rec t_train 450; fi

if want area a05_street; then reset
ev "(()=>{__D.clock(16,50); __rec.step(20);
 __D.shot({frames:120, ease:'linear', pos: __D.G([[160,3.6,-60],[154,3.4,-63]]), look: __D.G([[110,3.0,-85],[104,3.0,-88]])}); return 1})()"
rec a05_street 120 "__D.clock(16,50 + Math.round(150*__D.ease(i/119)));"; fi

# ---------------------------------------------------------------- phone
stage() { ev "(()=>{__D.clock(16,30); __D.place(-16.5,138,Math.PI); __rec.step(10);
  const p=__D.G([[-16.5,1.68,138]])[0]; __rec.hook=()=>__D.camAt(p,[-16.5,6,103.6],62); return 1})()" >/dev/null; }
app() { ev "(()=>{game.phone.show(); game.phone.openApp('$1'); __rec.step(12); return 1})()" >/dev/null; }

if want phone b07_phone; then reset; stage
ev "(()=>{ game.phone._last=null; __D.plan({steps:[{at:24, fn:()=>{game.phone.show(); game.phone.home();}}]}); return 1})()"
rec b07_phone 105 "$TICK" "$R"; fi

if want phone p_news; then reset; stage; app news
ev "__D.plan({taps:[{at:45, sel:'#phone .nw-row'}], scrolls:[{from:110,to:200,sel:'#phone .ph-content',px:200}]}); 1"
rec p_news 240 "$TICK" "$PH"; fi

if want phone p_gram; then reset; stage; app gram
ev "__D.plan({taps:[{at:40, sel:'#phone .pg-like'},{at:110, sel:'#phone .pg-story[data-s=\"1\"]'}]}); 1"
rec p_gram 240 "$TICK" "$PH"; fi

for a in wallet votes mcd shop; do
  if want phone p_$a; then reset; stage; app $a
  ev "__D.plan({scrolls:[{from:40,to:130,sel:'#phone .ph-content',px:420},{from:160,to:210,sel:'#phone .ph-content',px:-200}]}); 1"
  rec p_$a 240 "$TICK" "$PH"; fi
done

if want phone p_drone; then reset; stage; app drone
rec p_drone 120 "$TICK" "$PH"; fi

# the drone itself: VR goggles film, then it climbs over the lawn (its own HUD stays on)
if want phone d_drone; then reset
ev "(()=>{ __D.clock(16,40); __D.place(-16.5,150,Math.PI); __rec.step(10);
  document.getElementById('promoCss').textContent='#hud > *:not(#droneHud), #keyHints, .keyhints, #prompt, .prompt, #crosshair, #sunday, .toast, #toasts, #toast { display:none !important } #droneHud .dh-keys{display:none!important}';
  for(const l of game.world.labels) l.material.visible=false;
  const m=game.drone.start(); let k=0; while(game.drone.state!=='fly' && k++<600) __rec.step(1);
  const d=game.drone, gy=__D.gy(-16.5,150);
  const P=__D.spline([[-16.5,gy+3,150],[-40,gy+30,166],[-140,180,222],[-260,380,280]]), L=__D.spline([[-16.5,gy+8,103],[-14,gy+2,90],[0,0,-20],[30,0,-110]]);
  let f=0; __rec.hook=()=>{ const u=D2(Math.min(1,f/130)); const p=P(u), l=L(u); d.vel.set(0,0,0); d.pos.set(p[0],p[1],p[2]);
    const fo=game.scene.fog; if(fo&&fo.density!==undefined) fo.density=Math.min(fo.density, 0.0006-0.00025*u);
    __D.camAt(p,l,60); f++; };
  function D2(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  return m||d.state })()"
rec d_drone 165
ev "(()=>{ __rec.hook=null; game.drone.stop(); let k=0; while(game.drone.active && k++<600) __rec.step(1); for(const l of game.world.labels) l.material.visible=true; __D.hud(false); return 1})()"; fi

# the 夜市 crossroads of 任務二 食字路口 (yellow box junction on 實踐路, lots of shops)
if want area t_cross; then reset
ev "(()=>{__D.clock(17,10); __rec.step(30); __D.shot({frames:200, ease:'linear', pos:__D.G([[-171,3.3,282],[-176,3.0,278.5]]), look:__D.G([[-191.5,2,270],[-192,2,270]])}); return 1})()"
rec t_cross 200; fi

# 維澈樓 from the lawn side: the gold 維澈聯合行政服務中心 letters, the stair and STARBUCKS
if want campus a03_weiche; then reset
ev "(()=>{__D.clock(10,30); __rec.step(20); __D.shot({frames:70, ease:'linear', fov:62, pos:[[-144.5,6.3,71],[-147,6.0,69.5]], look:[[-156.5,8.5,88.5],[-156.5,8.5,88.5]]}); return 1})()"
rec a03_weiche 70; fi

# ---------------------------------------------------------------- computer (bash port of shots-c.sh; default wallpaper via director.js)
if want pc pc_setup; then
ev "(()=>{ window.__C = {
  solo(id){ const pc=game.pc; if(!pc.isOpen) pc.open('資管系 電腦教室'); for(const k of Object.keys(pc.wins)) pc._closeWin(k);
    document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click();
    pc.launch(id); const W=pc.wins[id]; if(W && !W.w.classList.contains('max')) { const b=W.w.querySelector('.pc-max'); const r=W.w.getBoundingClientRect(); if(r.width<1900) b?.click(); }
    document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(); return W; },
  w(id){ return game.pc.wins[id].w; },
  until(fn, ms=20000){ return new Promise(r=>{ const t0=Date.now(); const t=setInterval(()=>{ if(fn()||Date.now()-t0>ms){clearInterval(t); r(1);} },40); }); },
}; return 1})()"
ev "(async()=>{ const W=__C.solo('learn'); const w=W.w; w.querySelector('.lr-card[data-c=py]').click(); __rec.step(2);
  const t=w.querySelector('.lr-code'); t.value='print(1)'; w.querySelector('.lr-run').click(); await __C.until(()=>/通過|錯誤|答案|不對|Error/.test(w.querySelector('.lr-out, .lr-result, .lr-fb')?.textContent||''), 60000);
  w.querySelector('.lr-home-b').click(); __rec.step(2); w.querySelector('.lr-card[data-c=sq]').click(); __rec.step(2);
  const t2=w.querySelector('.lr-code'); t2.value='SELECT 1;'; w.querySelector('.lr-run').click(); await __C.until(()=>false, 3000);
  w.querySelector('.lr-reset')?.click(); w.querySelector('.lr-home-b').click(); return 'warm' })()"
fi
pcreset() { ev "(()=>{ document.querySelectorAll('.as-layer.on .as-x').forEach(b=>b.click()); __rec.hook=null; __D.P=null; if(game.pc.isOpen) game.pc.close(); game.phone.open&&game.phone.close(); return 1})()" >/dev/null; }

if want pc c10_lab; then pcreset
ev "(()=>{ __D.clock(10,0); const ux=0.944,uz=0.325, sx=84.01, sz=98.18, gy=2.6;
  const scr=[sx-0.85*ux, gy+1.0, sz-0.85*uz];
  __D.shot({frames:100, ease:'inout', fov:62,
    pos:[[sx+2.4*ux+0.3,gy+1.75,sz+2.4*uz+0.6],[sx+0.9*ux+0.1,gy+1.45,sz+0.9*uz+0.2],[sx+0.05*ux,gy+1.1,sz+0.05*uz]],
    look:[scr,scr,scr]}); return 1})()"
rec c10_lab 100 "" "$R"
ev "(()=>{ __rec.hook=null; game.pc.open('資管系 電腦教室'); for(const k of Object.keys(game.pc.wins)) game.pc._closeWin(k); __D.plan({taps:[{at:30, sel:'#pc .pc-icon[data-app=learn]'}]}); return 1})()"
rec c10_desk 60 "$TICK" "$R"; fi

if want pc c_sql; then pcreset
ev "(()=>{ const W=__C.solo('learn'); const w=W.w; __D.plan({
  taps:[{at:15, sel:()=>__C.w('learn').querySelector('.lr-card[data-c=sq]')},{at:34, sel:()=>__C.w('learn').querySelector('[data-l=\"1\"]')},{at:190, sel:()=>__C.w('learn').querySelector('.lr-run')}],
  steps:[{at:48, fn:()=>__C.w('learn').querySelector('.lr-code').scrollIntoView({block:'center', behavior:'instant'})}],
  types:[{from:62, sel:'#pc .lr-code', text:'SELECT name, score FROM students WHERE dept = \'資管\';', cps:14}], scrolls:[{from:200,to:232,sel:'#pc .lr-main',px:300}] }); return 1})()"
rec c_sql 240 "$TICK" "$R"; fi

if want pc c_term; then pcreset
ev "(()=>{ __C.solo('term'); const sel='#pc .tm-in'; const enter=()=>{ const el=document.querySelector(sel); el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true})); };
  __D.plan({ types:[{from:10, sel, text:'case', cps:8},{from:80, sel, text:'SELECT camera, time, plate FROM cctv WHERE plate LIKE \'MKZ%\';', cps:20}],
   steps:[{at:45, fn:()=>{ enter(); return __C.until(()=>!document.querySelector('.as-ask.on')||(document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(),false), 3000); }},
          {at:60, fn:()=>{ document.querySelector('.as-ask.on .as-ask-btns button:last-child')?.click(); }},
          {at:200, fn:()=>{ enter(); }}] }); return 1})()"
rec c_term 240 "$TICK" "$R"; fi

if want pc c_leet; then pcreset
ev "(()=>{ game.howardQuest.onPC = true; const W=__C.solo('leet'); __D.plan({ taps:[{at:30, sel:'#pc .ts-auto'},{at:62, sel:()=>document.querySelector('.as-layer.on .as-auto')}] }); return 1})()"
rec c_leet 240 "$TICK" "$R"; fi

if want pc c_paint; then pcreset
ev "(()=>{ const W=__C.solo('paint'); const cv=W.w.querySelector('canvas'); const r=()=>cv.getBoundingClientRect();
  const P=(t,x,y)=>{ const b=r(); cv.dispatchEvent(new PointerEvent(t,{clientX:b.left+x*b.width, clientY:b.top+y*b.height, bubbles:true, pointerId:1, buttons:1})); if(t==='pointerup') window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1})); };
  const heart=[]; for(let k=0;k<=60;k++){ const a=k/60*Math.PI*2; const x=16*Math.sin(a)**3, y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a); heart.push([0.32+x/80, 0.45-y/70]); }
  const vee=[[0.6,0.3],[0.66,0.62],[0.72,0.3]];
  const strokes=[{c:'#e8323c',pts:heart,from:20,dur:80},{c:'#2f7fd8',pts:vee,from:120,dur:40}];
  __D.plan({ taps:[{at:12, sel:'#pc .pt-c[data-c=\"#e8323c\"]'},{at:108, sel:'#pc .pt-c[data-c=\"#2f7fd8\"]'}],
    steps: strokes.flatMap(s=>{ const out=[]; for(let f=0; f<=s.dur; f++){ out.push({at:s.from+f, fn:()=>{ const n=s.pts.length-1; const k=Math.round(f/s.dur*n); const [x,y]=s.pts[k]; P(f===0?'pointerdown':f===s.dur?'pointerup':'pointermove', x, y); }}); } return out; }) }); return 1})()"
rec c_paint 200 "$TICK" "$R"; fi

if want pc c_mines; then pcreset
ev "(()=>{ const W=__C.solo('mines'); const N=9; const cells=()=>[...__C.w('mines').querySelectorAll('.mn-grid button')];
  const nbr=(i)=>{ const x=i%N, y=Math.floor(i/N), o=[]; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const a=x+dx, b=y+dy; if(a>=0&&b>=0&&a<N&&b<N) o.push(b*N+a);} return o; };
  const move=()=>{ const c=cells(); const st=c.map(b=>/\bop\b/.test(b.className)?(+((b.className.match(/n(\d)/)||[])[1]||0)):/\bfl\b/.test(b.className)?'F':null);
    if(st.every(v=>v===null)) return {i:40, flag:false};
    for(let i=0;i<N*N;i++){ const n=st[i]; if(typeof n!=='number'||n===0) continue; const nb=nbr(i); const hid=nb.filter(j=>st[j]===null), fl=nb.filter(j=>st[j]==='F');
      if(hid.length && fl.length===n) return {i:hid[0], flag:false};
      if(hid.length && hid.length+fl.length===n) return {i:hid[0], flag:true}; }
    return null; };
  const cache={}; const taps=[]; for(let k=0;k<12;k++){ const at=20+k*18; taps.push({at, sel:()=>{ if(!(k in cache)){ if(i_now()<at-8) return null; const m=move(); cache[k]=m; } const m=cache[k]; if(!m) return null; const el=cells()[m.i]; el.__flag=m.flag; return el; }}); }
  let fr=0; window.i_now=()=>fr; __D.plan({ taps, steps:Array.from({length:240},(_,f)=>({at:f, fn:()=>{fr=f;}})) }); return 1})()"
rec c_mines 240 "$TICK" "$R"; fi

# AI Agent 入門: open the course and scroll through a lesson with its runnable example
if want pc c_ai; then pcreset
ev "(()=>{ const W=__C.solo('learn'); const w=W.w; const card=[...w.querySelectorAll('.lr-card')].find(c=>/AI/.test(c.textContent));
  __D.plan({ taps:[{at:15, sel:()=>card},{at:40, sel:()=>__C.w('learn').querySelector('[data-l=\"1\"]')}],
    scrolls:[{from:80,to:200,sel:'#pc .lr-main',px:520}] }); return card? card.dataset.c : 'no card' })()"
rec c_ai 240 "$TICK" "$R"; fi

if want pc c12_hero; then pcreset
ev "(()=>{ const W=__C.solo('learn'); __C.w('learn').querySelector('.lr-card[data-c=py]').click(); __rec.step(2); __C.w('learn').querySelector('[data-l=\"1\"]').click(); __rec.step(2);
  const w=__C.w('learn'); w.querySelector('.lr-reset')?.click(); w.querySelector('.lr-code').scrollIntoView({block:'center', behavior:'instant'}); __rec.step(2);
  __D.plan({ types:[{from:12, sel:'#pc .lr-code', text:'votes = 120\nvotes += 34\nprint(votes)', cps:16, keep:''}],
    taps:[{at:100, sel:()=>__C.w('learn').querySelector('.lr-run')}], scrolls:[{from:110,to:138,sel:'#pc .lr-main',px:260}] }); return 1})()"
rec c12_hero 160 "$TICK" "$R"; fi
if want pc pc_done; then pcreset; fi

# ---------------------------------------------------------------- side quest: 吱吱武嶺跑山受傷 (run in order)
if want zz z_meet_zz; then reset
ev "(()=>{ ${STORYCSS} __D.clock(15,20); const f=game.friends; f.added.delete('zz'); f.added.delete('gd');
  const s={x:-39.5,z:-182.2}; __D.place(s.x-2.4, s.z, Math.PI/2); __rec.step(10);
  const p=__D.G([[s.x-2.4,1.62,s.z+0.3]])[0], l=__D.G([[s.x,1.45,s.z]])[0]; const gy=l[1]-1.45; const n=game.friends.npcs.zz, r=n.ch.root;
  __rec.hook=()=>{ r.visible=true; r.position.set(s.x,gy,s.z); r.rotation.y=Math.atan2(p[0]-s.x,p[2]-s.z); __D.camAt(p,l,58); };
  __D.plan({ steps:[{at:4, fn:()=>game.dialog([['吱吱','欸！彥霖！你怎麼跑來體育館？']], ()=>game.friends._ask('zz'))},
    {at:34, fn:()=>game.hud.advanceDialog()}], taps:[{at:62, sel:'#frYes'}],
    }); return 1})()"
rec z_meet_zz 110 "$TICK" "$R"
ev "(()=>{ for(let k=0;k<8 && game.hud.inDialog;k++) game.hud.advanceDialog(); return game.friends.added.has('zz') })()"; fi

if want zz z_meet_gd; then reset
ev "(()=>{ ${STORYCSS} __D.clock(15,30); const k=game.interiors.gordon.keeper; const dx=Math.sin(k.h), dz=Math.cos(k.h);
  game.player.place(k.x+dx*2.2, k.z+dz*2.2, k.h+Math.PI); __rec.step(10);
  const p=[k.x+dx*2.1, k.y+1.62, k.z+dz*2.1+0.2], l=[k.x, k.y+1.45, k.z]; __rec.hook=()=>__D.camAt(p,l,58);
  __D.plan({ steps:[{at:4, fn:()=>game.dialog([['肉舖老闆','欸，等一下。你是那個在選系會長的彥霖吧？']], ()=>game.friends._ask('gd'))},
    {at:34, fn:()=>game.hud.advanceDialog()}], taps:[{at:62, sel:'#frYes'}] }); return 1})()"
rec z_meet_gd 110 "$TICK" "$R"
ev "(()=>{ for(let k=0;k<8 && game.hud.inDialog;k++) game.hud.advanceDialog(); __D.hud(false); return game.friends.added.has('gd') })()"; fi

zchat() { ev "(()=>{ const ph=game.phone; ph.show(); ph.openApp('messages'); const st=ph.chats.find(s=>s.c.id==='zz'); ph.openChat(st); __rec.step(6); return 1})()" >/dev/null; }

if want zz z_invite; then reset; stage
ev "(()=>{ const Q=game.zzQuest; Q.state.stage='none'; let k=0; while(Q.state.stage==='none' && k++<200) __rec.step(1); return Q.state.stage })()"
zchat
ev "__D.plan({taps:[{at:120, sel:'#phone .ph-choice'},{at:140, sel:'#phone .ph-send'}]}); 1"
rec z_invite 230 "$TICK" "$PH"; fi

if want zz z_ring; then reset; stage
ev "(()=>{ const Q=game.zzQuest; if(Q.state.stage!=='declined') Q.decline(); Q.state.callAt=game.clock; let k=0; while(!game.phone.call && k++<120) __rec.step(1); return !!game.phone.call })()"
ev "__D.plan({taps:[{at:60, sel:'#phone .ph-cb.yes'}]}); 1"
rec z_ring 200 "$TICK" "$PH"
ev "(async()=>{ const c=game.phone.call; await new Promise(r=>{const t=setInterval(()=>{ if(!c||c.shown>=c.lines.length){clearInterval(t); r(1);} },100)}); __rec.step(2); document.querySelector('#phone .ph-cb[data-c=end]')?.click(); __rec.step(5); return game.zzQuest.state.stage })()"; fi

if want zz z_bubble; then reset; stage
ev "(async()=>{ await new Promise(r=>setTimeout(r,15000)); return 1 })()" >/dev/null
zchat
ev "(()=>{ const v=[...document.querySelectorAll('#phone .ph-video')].pop(); v?.scrollIntoView({block:'center'}); __D.plan({taps:[{at:56, sel:()=>[...document.querySelectorAll('#phone .ph-video')].pop()}]}); return document.querySelectorAll('#phone .ph-video').length })()"
rec z_bubble 60 "$TICK" "$PH"
ev "(()=>{ document.getElementById('promoCss').textContent+=' .skip{display:none!important}'; return game.zzQuest.cinema })()"
rec z_film 330
ev "(()=>{ let k=0; while(game.zzQuest.cinema && k++<300) __rec.step(1); game.phone.open&&game.phone.close(); __D.hud(false); return 1 })()"; fi

# the bathroom (力行 2F): a 3D look at 吱吱 and 侯舌, then the mini-game on night 1, 2 and 10
bathnight() { # name washes frames
  ev "(()=>{ ${STORYCSS} const Q=game.zzQuest; Q.state.stage='injured'; Q.state.washes=$2; Q.state.washDay=null; Q.state.dmAt=game.clock; Q.state.relapse=false;
    __D.clock(20,30); const s=Q.bathSpot; game.player.place(s.x-1.6, s.z-1.2, 0); __rec.step(15); Q.openBath(); __rec.step(3);
    const cv=document.querySelector('#zzBath canvas'); const tap=(x,y)=>{ const b=cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:b.left+x/640*b.width, clientY:b.top+y/480*b.height, bubbles:true, cancelable:true, pointerId:1})); };
    const tool=(t)=>document.querySelector('#zzBath .zb-tool[data-t='+t+']').click();
    const SP=[[320,92],[262,178],[378,178],[320,210],[320,268],[296,410]]; const steps=[]; let f=10;
    for(const [x,y] of SP){ steps.push({at:f, fn:()=>tap(x,y)}); steps.push({at:f+5, fn:()=>tap(x,y)}); f+=11; }
    steps.push({at:f, fn:()=>tool('water')}); f+=8;
    steps.push({at:f, fn:()=>tap(410,72)}); f+=24;
    for(const [x,y] of SP){ steps.push({at:f, fn:()=>tap(x,y)}); f+=9; }
    __D.plan({steps}); return f })()"
  rec $1 $3 "$TICK" "&clip=680,250,560,580,2&rate=0.33"
}
if want zz z_bath3d; then reset
ev "(()=>{ const Q=game.zzQuest; Q.state.stage='injured'; Q.state.washDay=null; Q.state.dmAt=game.clock; __D.clock(20,30); const s=Q.bathSpot;
  const a=Q.bz.root.rotation.y, dx=Math.sin(a), dz=Math.cos(a); game.player.place(s.x+dx*2.4, s.z+dz*2.4, a+Math.PI); __rec.step(20);
  __D.shot({frames:80, ease:'linear', fov:64, pos:[[s.x+dx*2.3-dz*0.3,s.y+1.55,s.z+dz*2.3+dx*0.3],[s.x+dx*1.9-dz*0.1,s.y+1.5,s.z+dz*1.9+dx*0.1]], look:[[s.x-dz*0.4,s.y+1.15,s.z+dx*0.4],[s.x-dz*0.4,s.y+1.15,s.z+dx*0.4]]}); const cam=__rec.hook; __rec.hook=(g,t)=>{ Q.bz.root.visible=true; Q.bh.root.visible=true; Q.bzHurt.set(true); cam(g,t); }; return 1})()"
rec z_bath3d 80; fi
if want zz z_bath1; then reset; bathnight z_bath1 0 200; ev "(()=>{ __rec.step(60); for(let k=0;k<6 && game.hud.inDialog;k++) game.hud.advanceDialog(); return game.zzQuest.state.washes })()"; fi
if want zz z_bath2; then reset; bathnight z_bath2 1 200; ev "(()=>{ __rec.step(60); for(let k=0;k<6 && game.hud.inDialog;k++) game.hud.advanceDialog(); return game.zzQuest.state.washes })()"; fi
if want zz z_bath10; then reset; bathnight z_bath10 9 200
  rec z_bath10b 120 "if(i===50) game.hud.advanceDialog(); if(i===90) game.hud.advanceDialog();" "$R"
  ev "(()=>{ for(let k=0;k<8 && game.hud.inDialog;k++) game.hud.advanceDialog(); return game.zzQuest.state.tee })()"; fi

# the reward: the 排球 T in the wardrobe at home
if want zz z_tee; then reset
ev "(()=>{ for(let k=0;k<10 && game.hud.inDialog;k++) game.hud.advanceDialog(); __D.hud(false); for(const l of game.world.labels) l.material.visible=false; game.zzQuest.state.tee=true; __D.clock(16,20); game.fpv.on=false; __D.place(-16.5,140,Math.PI); __rec.step(10);
  const P=game.player.pos, y=P.y; game.wardrobe.open('home'); __rec.step(4);
  document.getElementById('promoCss').textContent+=' #wardrobe, .wardrobe, #wd { display:none !important }';
  window.__look0=JSON.parse(JSON.stringify(game.player.look)); const b=[...document.querySelectorAll('.wd-item[data-k=top]')].find(x=>x.querySelector('span')?.textContent==='排球 T'); b?.click(); __rec.step(4); game.wardrobe.close(); __rec.step(4);
  game.player.place(-16.5,140,Math.PI);
  let f=0; __rec.hook=()=>{ const u=Math.min(1,f/110), e=u*u*(3-2*u); const a=Math.PI*(0.0+1.0*e); const r=2.6;
    game.player.heading=Math.PI; __D.camAt([-16.5+Math.sin(a)*r*0.9, y+1.35, 140-Math.cos(a)*r], [-16.5, y+1.05, 140], 50); f++; };
  return !!b })()"
rec z_tee 130
ev "(()=>{ __rec.hook=null; game.wardrobe._wear(window.__look0); game.fpv.on=true; for(const l of game.world.labels) l.material.visible=true; __D.hud(false); return 1 })()"; fi


# ---------------------------------------------------------------- side-quest NPCs (examples for the hidden quests grid)
# npc name clock "chars" x z dx dz : the characters stand at (x,z) (+ i*dx/dz for the next), the camera 3.2 m in front, slow push
npc() { reset
ev "(()=>{ __D.clock($2); const C=[$3]; const P=$4, Z=$5; __D.place(P+6, Z+6, 0); __rec.step(10);
  const gy=__D.gy(P,Z); const cam=[[P+$6/2, gy+1.62, Z+3.6],[P+$6/2, gy+1.58, Z+2.9]], look=[[P+$6/2, gy+1.35, Z],[P+$6/2, gy+1.35, Z]];
  const sh=(__D.shot({frames:100, ease:'linear', fov:52, pos:cam, look}), __rec.hook);
  __rec.hook=(g,t)=>{ C.forEach((c,i)=>{ const r=c.root; r.visible=true; r.position.set(P+i*$6, gy, Z+i*$7); r.rotation.y=0; }); sh(g,t); }; return C.length })()"
rec $1 100; }
if want npcs n_yulu; then npc n_yulu "16,10" "game.yulu.ch" 137 108 0 0; fi
if want npcs n_tzuyu; then npc n_tzuyu "17,20" "game.howard.ch, game.howard.gf" -22 132 0.9 0; fi
if want npcs n_howard; then npc n_howard "12,0" "game.howard.ch" 118 124 0 0; fi
# 劍玉 at noon stands by his supercars west of the 資管系館 (his own schedule, no forcing)
if want npcs n_jianyu; then reset
ev "(()=>{ __D.clock(12,0); __D.place(70,90,0); __rec.step(120); __D.shot({frames:100, ease:'linear', fov:55, pos:[[63.5,4.25,96.5],[65,4.2,98.2]], look:[[70.5,3.6,103],[70.3,3.6,102.9]]}); return 1})()"
rec n_jianyu 100; fi
if want npcs n_pinhan; then npc n_pinhan "11,0" "game.pinhan.ch" -205 86 0 0; fi

# ---------------------------------------------------------------- outro
if want end d14_outro; then reset
ev "(()=>{ __D.clock(17,5); game.fpv.on=false; for(const l of game.world.labels) l.material.visible=false; __D.place(-16.5,127,0); __rec.step(20); const gy=__D.gy(-16.5,131); __D.place(-16.5,127,0); __rec.step(5);
  __D.shot({frames:165, ease:'inout', fov:55, pos:[[-16.5,gy+1.55,130.4],[-16.2,gy+3.5,138],[-15,gy+22,165],[-14,gy+48,192]], look:[[-16.5,gy+1.35,127],[-16.5,gy+2,124],[-16.5,gy+4,112],[-18,gy,96]]});
  __D.plan({ steps:[{at:0, fn:()=>game.player.setPose('peace', 2.2)},{at:60, fn:()=>game.player.setPose('peace', 2.2)},{at:120, fn:()=>game.player.setPose('peace', 2.2)}] }); return 1})()"
rec d14_outro 165 "$TICK" "&rate=0.33"
ev "(()=>{ game.fpv.on=true; for(const l of game.world.labels) l.material.visible=true; return 1})()"; fi
