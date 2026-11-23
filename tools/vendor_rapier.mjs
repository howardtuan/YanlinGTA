// Vendor the Rapier physics engine (Rust, compiled to WebAssembly) into vendor/rapier/ without a build step.
//   node tools/vendor_rapier.mjs <path to an unpacked @dimforge/rapier3d-compat package>
//   (npm pack @dimforge/rapier3d-compat@0.21.0, then tar -xzf the .tgz)
// The compat bundle carries the 3 MB .wasm inlined as base64 (4.3 MB of JS). This writes the bundle with the
// base64 replaced by a fetch of the sibling rapier.wasm: ~230 kB of JS, and the .wasm can be gzipped by the
// server and compiled while it downloads. The API is unchanged: `import * as RAPIER` then `await RAPIER.init()`.
import fs from 'node:fs';
import path from 'node:path';

const pkg = process.argv[2];
if (!pkg) {
  console.error('usage: node tools/vendor_rapier.mjs <unpacked rapier3d-compat package dir>');
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
if (meta.name !== '@dimforge/rapier3d-compat')
  throw new Error(`not @dimforge/rapier3d-compat: ${meta.name}`);
const src = fs.readFileSync(path.join(pkg, 'dist/rapier.mjs'), 'utf8');
// init(): yield EI({module_or_path: <base64 decoder>.toByteArray("AGFzbQ...").buffer}) -> a Uint8Array of ./rapier.wasm
// (a Uint8Array, so the .buffer that follows in the bundle still works)
const re = /module_or_path:([A-Za-z_$][\w$]*)\.toByteArray\("([A-Za-z0-9+/=]+)"\)/;
const m = src.match(re);
if (!m) throw new Error('inlined wasm not found: the bundle layout changed, update this script');
const wasm = Buffer.from(m[2], 'base64');
if (!wasm.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109])))
  throw new Error('inlined data is not a wasm module');
const out = src.replace(
  re,
  'module_or_path:(yield fetch(new URL("./rapier.wasm",import.meta.url)).then(r=>{if(!r.ok)throw new Error("rapier.wasm "+r.status);return r.arrayBuffer()}).then(b=>new Uint8Array(b)))'
);
const dir = new URL('../vendor/rapier/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  new URL('rapier.mjs', dir),
  `// @dimforge/rapier3d-compat ${meta.version} (${meta.license}), https://rapier.rs — vendored by tools/vendor_rapier.mjs\n${out}`
);
fs.writeFileSync(new URL('rapier.wasm', dir), wasm);
fs.copyFileSync(path.join(pkg, 'LICENSE'), new URL('LICENSE', dir));
console.log(
  `vendor/rapier: rapier.mjs ${(out.length / 1024).toFixed(0)} kB, rapier.wasm ${(wasm.length / 1024).toFixed(0)} kB (Rapier ${meta.version})`
);
