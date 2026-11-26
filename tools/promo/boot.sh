#!/bin/zsh
# Start the recorder daemon, wait for the title screen, start the game in free-roam with the director loaded.
# usage: tools/promo/boot.sh   (from the repo root; daemon log in tools/promo/out/rec.log)
cd "$(dirname "$0")/../.."
mkdir -p tools/promo/out
node tools/promo/rec.mjs "$@" > tools/promo/out/rec.log 2>&1 &
for i in $(seq 1 200); do grep -q "recorder ready" tools/promo/out/rec.log && break; sleep 1; done
ev() { curl -s -X POST --data-binary "$1" http://127.0.0.1:7788/eval; echo; }
ev "document.getElementById('btnStart').click(); 1"
ev "new Promise(r=>{const t=setInterval(()=>{if(game.state==='play'){clearInterval(t);r('play')}},200)})"
curl -s -X POST --data-binary @tools/promo/director.js http://127.0.0.1:7788/eval; echo
ev "__D.free(); __D.hud(false); __rec.setManual(true); __rec.step(5); 'free'"
