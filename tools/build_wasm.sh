#!/bin/sh
# Rebuild js/wasm/*.wasm from the Rust sources in wasm/ (the .wasm files are committed, so playing
# or deploying the game needs no build step; only run this after changing wasm/).
# Needs Rust with the wasm32 target:  rustup target add wasm32-unknown-unknown
set -eu
cd "$(dirname "$0")/.."
for crate in kernels; do
  cargo build --quiet --release --target wasm32-unknown-unknown --manifest-path "wasm/$crate/Cargo.toml" \
    --target-dir wasm/target
  cp "wasm/target/wasm32-unknown-unknown/release/$crate.wasm" "js/wasm/$crate.wasm"
  echo "js/wasm/$crate.wasm: $(wc -c < "js/wasm/$crate.wasm") bytes"
done
