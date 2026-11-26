#!/bin/zsh
# Segment A: first-person campus tour. Needs tools/promo/boot.sh running. Output: tools/promo/out/clips/<name>/
# usage: tools/promo/shots-a.sh [all | "gate tower shops ride street aerial"]
cd "$(dirname "$0")/../.."
ev() { curl -s -X POST --data-binary "$1" http://127.0.0.1:7788/eval; echo; }
rec() { # name frames [pre-js] [query]
  echo "rec $1"
  curl -s -X POST --data-binary "${3:-}" "http://127.0.0.1:7788/rec?dir=tools/promo/out/clips/$1&frames=$2${4:-}"; echo
}
reset() { ev "(()=>{ if(game.player.vehicle) game.player.exit(game.scene, game.world.collision, game.interiors); __D.unride(); __rec.hook=null; game.phone.open&&game.phone.close(); __D.P=null; __D.place(-300,400,0); return 1})()" >/dev/null; }
only=${1:-all}
want() { [[ $only == all || $only == *$1* ]]; }

# 01 walk in through the main gate (中北路 -> 正門 -> campus)
if want gate; then reset
ev "(()=>{__D.clock(8,40); __rec.step(20);
 __D.shot({frames:150, bob:1, ease:'linear',
  pos: __D.G([[-229,1.68,92],[-219,1.68,89],[-209,1.68,86.4],[-199,1.68,85.6],[-188,1.68,82.5]]),
  look: __D.G([[-212,2.4,86],[-200,2.6,84],[-189,2.8,81],[-177,3.0,78],[-164,3.2,76]])}); return 1})()"
rec a01_gate 150; fi

# 02 across the lawn toward the bell tower (二一鐘塔 at -16.5, 103.6)
if want tower; then reset
ev "(()=>{__D.clock(9,10); __rec.step(20);
 __D.shot({frames:120, bob:1, ease:'linear',
  pos: __D.G([[-16.5,1.68,146],[-16.5,1.68,136],[-16.5,1.68,126]]),
  look: [[-16.5,9,103.6],[-16.5,12,103.6],[-16.5,15,103.6]]}); return 1})()"
rec a02_tower 120; fi

# 03 three store fronts: 戈登肉鋪, 涼韌足體, 茶學苑
if want shops; then reset
ev "(()=>{__D.clock(17,35); __rec.step(30); __D.shot({frames:45, ease:'linear', pos:__D.G([[-98.6,1.68,59.2],[-100.3,1.68,63.6]]), look:[[-102.5,2.5,69.8],[-102.5,2.6,69.8]]}); return 1})()"
rec a03_gordon 45
ev "(()=>{__rec.step(2); __D.shot({frames:45, ease:'linear', pos:__D.G([[213.2,1.68,-18.5],[212.2,1.68,-22]]), look:[[210.5,2.6,-29],[210.5,2.6,-29]]}); return 1})()"
rec a03_massage 45
ev "(()=>{__rec.step(2); __D.shot({frames:45, ease:'linear', pos:__D.G([[-245.8,1.68,103.5],[-245.8,1.68,99]]), look:[[-245.8,2.6,92.8],[-245.8,2.6,92.8]]}); return 1})()"
rec a03_tea 45; fi

# 04 really ride the JET SL down 新中北路 (virtual joystick follows the road, 1.2 m right of centre)
if want ride; then reset
ev "(()=>{__D.clock(10,20); const raw=[[222,-9],[209,-22],[194,-37],[188,-43],[170,-55],[146,-68],[110,-85],[88,-94],[71,-101],[51,-108],[29,-115],[12,-121],[-1,-126]]; window.__XP=__D.offsetPath(raw,1.2); __D.mount(220,-11,Math.atan2(-13,-13)); __D.ride(window.__XP, 11); __rec.step(110); return 1})()"
rec a04_ride 120; fi

# 05 time-lapse on 新中北路: 16:50 -> 19:20, the shop fronts light up
if want street; then reset
ev "(()=>{__D.clock(16,50); __rec.step(20);
 __D.shot({frames:90, ease:'linear', pos: __D.G([[160,3.6,-60],[155,3.4,-62.4]]), look: __D.G([[110,3.0,-85],[105,3.0,-87.4]])}); return 1})()"
rec a05_street 90 "__D.clock(16,50 + Math.round(150*__D.ease(i/89)));"; fi

# 06 aerial over the lawn and the tower (title card background)
if want aerial; then reset
ev "(()=>{__D.clock(16,40); __rec.step(20);
 __D.shot({frames:100, ease:'out', pos:[[-96,62,22],[-78,52,44]], look:[[-24,4,108],[-20,5,110]], fov:58}); return 1})()"
rec a06_aerial 100; fi
