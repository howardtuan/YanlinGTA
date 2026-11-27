# shared helpers for the v3 promo shots (bash). JS goes through stdin so Chinese text survives Windows argv.
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ev() { printf '%s' "$1" | curl -s -m 900 -X POST --data-binary @- http://127.0.0.1:7788/eval; echo; }
rec() { # name frames [pre-js] [query]
  echo "rec $1"
  printf '%s' "${3:-}" | curl -s -m 3600 -X POST --data-binary @- "http://127.0.0.1:7788/rec?dir=tools/promo/out/clips/$1&frames=$2${4:-}"; echo
}
shot() { curl -s "http://127.0.0.1:7788/shot?file=$1"; echo; }
# camera still: peek file x y z lx ly lz [fov] [clock]
peek() { ev "(()=>{ __rec.hook=null; ${9:+__D.clock($9);} __rec.step(3); __rec.hook=()=>__D.camAt([$2,$3,$4],[$5,$6,$7],${8:-62}); __rec.step(2); return 1})()" >/dev/null; shot "tools/promo/out/peek/$1.jpg"; }
reset() { ev "(()=>{ if(game.player.vehicle) game.player.exit(game.scene, game.world.collision, game.interiors); __D.unride(); __rec.hook=null; if(game.phone.call) game.phone._callEnd(true); game.phone.open&&game.phone.close(); if(game.pc.isOpen) game.pc.close(); __D.P=null; __D.hud(false); __D.place(-300,400,0); return 1})()" >/dev/null; }
# ground-relative still: peekg file x dy z lx ldy lz [fov] [clock]
peekg() { ev "(()=>{ __rec.hook=null; ${9:+__D.clock($9);} __rec.step(3); const p=__D.G([[$2,$3,$4]])[0], l=__D.G([[$5,$6,$7]])[0]; __rec.hook=()=>__D.camAt(p,l,${8:-62}); __rec.step(2); return 1})()" >/dev/null; shot "tools/promo/out/peek/$1.jpg"; }
sheet3() { ffmpeg -v error -y -i "tools/promo/out/peek/$2.jpg" -i "tools/promo/out/peek/$3.jpg" -i "tools/promo/out/peek/$4.jpg" -filter_complex "[0]scale=640:-1[a];[1]scale=640:-1[b];[2]scale=640:-1[c];[a][b][c]hstack=3" "tools/promo/out/$1.jpg"; }
