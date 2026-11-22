#!/bin/sh
# Rebuild src/graphics/wasm/*.wasm from the Rust sources in tools/wasm-kernels/ (the .wasm files are committed, so playing
# or deploying the game needs no build step; only run this after changing tools/wasm-kernels/).
# Needs Rust with the wasm32 target:  rustup target add wasm32-unknown-unknown
set -eu
cd "$(dirname "$0")/.."
for crate in kernels; do
  cargo build --quiet --release --target wasm32-unknown-unknown --manifest-path "tools/wasm-$crate/Cargo.toml" \
    --target-dir "tools/wasm-$crate/target"
  cp "tools/wasm-$crate/target/wasm32-unknown-unknown/release/$crate.wasm" "src/graphics/wasm/$crate.wasm"
  echo "src/graphics/wasm/$crate.wasm: $(wc -c < "src/graphics/wasm/$crate.wasm") bytes"
done
