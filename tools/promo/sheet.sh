#!/bin/zsh
# Contact sheet for checking clips: first / middle / last frame of each clip, one row per clip.
# usage: tools/promo/sheet.sh out.jpg tools/promo/out/clips/a01_gate tools/promo/out/clips/a02_tower ...
out=$1
shift
tmp=$(mktemp -d)
rows=()
for d in "$@"; do
  n=$(ls "$d" | wc -l | tr -d ' ')
  m=$((n / 2))
  l=$((n - 1))
  r="$tmp/$(basename "$d").jpg"
  ffmpeg -v error -y -i "$d/f00000.jpg" -i "$d/$(printf 'f%05d.jpg' $m)" -i "$d/$(printf 'f%05d.jpg' $l)" \
    -filter_complex "[0]scale=480:-1[a];[1]scale=480:-1[b];[2]scale=480:-1[c];[a][b][c]hstack=3" "$r"
  rows+=(-i "$r")
done
if (($# > 1)); then
  ffmpeg -v error -y "${rows[@]}" -filter_complex "vstack=$#" "$out"
else
  cp "$tmp/$(basename "$1").jpg" "$out"
fi
