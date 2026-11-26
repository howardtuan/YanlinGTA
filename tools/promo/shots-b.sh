#!/bin/zsh
# Segment B: phone apps. Needs tools/promo/boot.sh running. Output: tools/promo/out/clips/<name>/
cd "$(dirname "$0")/../.."
ev() { curl -s -X POST --data-binary "$1" http://127.0.0.1:7788/eval; echo; }
rec() { # name frames [pre-js] [query]
  echo "rec $1"
  curl -s -X POST --data-binary "${3:-}" "http://127.0.0.1:7788/rec?dir=tools/promo/out/clips/$1&frames=$2${4:-}"; echo
}
PH="&clip=1586,225,300,630,2&rate=0.33"
TICK="__D.tick(i);"
reset() { ev "(()=>{ if(game.player.vehicle) game.player.exit(game.scene, game.world.collision, game.interiors); __D.unride(); __rec.hook=null; game.phone.open&&game.phone.close(); __D.P=null; return 1})()" >/dev/null; }
# stand on the lawn north of the tower facing it; camera locked so the backdrop stays calm
stage() { ev "(()=>{__D.clock(16,30); __D.place(-16.5,138,Math.PI); __rec.step(10);
  const p=__D.G([[-16.5,1.68,138]])[0]; __rec.hook=()=>__D.camAt(p,[-16.5,6,103.6],62); return 1})()" >/dev/null; }
app() { ev "(()=>{game.phone.show(); game.phone.openApp('$1'); __rec.step(12); return 1})()" >/dev/null; }
only=${1:-all}
want() { [[ $only == all || $only == *$1* ]]; }

if want b07; then reset; stage
ev "(()=>{ game.phone._last=null; __D.plan({steps:[{at:24, fn:()=>{game.phone.show(); game.phone.home();}}]}); return 1})()"
rec b07_phone 105 "$TICK" "&rate=0.33"; fi

if want garage; then reset; stage; app garage
ev "__D.plan({taps:[{at:150, sel:'#phone .ph-gbtn'}]}); 1"
rec p_garage 240 "$TICK" "$PH"; fi

if want stock; then reset; stage; app stock
ev "__D.plan({scrolls:[{from:20,to:100,sel:'#phone .ph-content',px:520},{from:110,to:150,sel:'#phone .ph-content',px:-520}], taps:[{at:175, sel:'#phone .sk-row[data-code=PYL]'}]}); 1"
rec p_stock 240 "$TICK" "$PH"; fi

if want gram; then reset; stage; app gram
ev "__D.plan({taps:[{at:40, sel:'#phone .pg-like'},{at:110, sel:'#phone .pg-story[data-s=\"1\"]'}]}); 1"
rec p_gram 240 "$TICK" "$PH"; fi

if want burger; then reset; stage; app burger
ev "__D.plan({scrolls:[{from:30,to:110,sel:'#phone .ph-content',px:300},{from:130,to:170,sel:'#phone .ph-content',px:-120}], taps:[{at:205, sel:'#phone .ph-hb[data-k=tower]'}]}); 1"
rec p_burger 240 "$TICK" "$PH"; fi

if want news; then reset; stage; app news
ev "__D.plan({taps:[{at:45, sel:'#phone .nw-row'}], scrolls:[{from:110,to:200,sel:'#phone .ph-content',px:200}]}); 1"
rec p_news 240 "$TICK" "$PH"; fi

if want msg; then reset; stage; app messages
ev "__D.plan({taps:[{at:50, sel:'#phone .ph-chatrow[data-i=\"0\"]'}]}); 1"
rec p_msg 240 "$TICK" "$PH"; fi

# d13: the mobile touch UI while riding. Needs the daemon started with `tools/promo/boot.sh --mobile`;
# the HUD stays on (only dialogs / toasts are hidden) and the joystick knob follows the virtual stick.
if [[ $only == mobile ]]; then
ev "(()=>{ __D.hud(true); document.getElementById('promoCss').textContent='#dialog, .toast, #toasts, #sunday { display:none !important }';
  game.hud.setObjective('自由探索','收集 <b>34 張金色選票</b>，繼續發傳單拉票！'); __D.clock(10,25);
  const raw=[[222,-9],[209,-22],[194,-37],[188,-43],[170,-55],[146,-68],[110,-85],[88,-94],[71,-101],[51,-108],[29,-115],[12,-121],[-1,-126]];
  window.__XP=__D.offsetPath(raw,1.2); __D.mount(205,-26,Math.atan2(-13,-13)); __D.ride(window.__XP, 11);
  const ride=__rec.hook, knob=document.getElementById('joyKnob');
  __rec.hook=(g,t)=>{ ride(g,t); const j=game.input.joy; knob.style.transform='translate('+(j.x*38)+'px,'+(j.y*38)+'px)'; };
  __rec.step(60); return 1})()"
rec d13_mobile 150; fi
