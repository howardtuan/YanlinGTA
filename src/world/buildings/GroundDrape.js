// 坡地上的地面鋪面（門前人行道、空地）：一個 Kit 只照原點的地面高度畫，平板放在坡上會一頭埋進土裡、一頭浮起來，
// 而玩家走的高度一直是「離地多高」（addSurface 登記的是離地高度），低的那頭看起來就像人陷進板子裡。
// 這裡每 2.5 m 一個頂點照 Terrain.H 鋪成貼地斜面，可走表面照樣登記；寫法和 StreetXinzhongbei.js 的 C.drape 相同。
// 給各條舊街道（StreetZhongbei、StreetShijian、StreetHuanzhong…）自己的街屋格產生器用。
import * as THREE from 'three';
import { H } from '../Terrain.js';

// Kit 區域座標這一塊地面的高低差（四角與中間）
export function groundSlope(k, x0, x1, z0, z1) {
  let lo = 1e9,
    hi = -1e9;
  for (const [x, z] of [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
    [(x0 + x1) / 2, (z0 + z1) / 2],
  ]) {
    const h = H(...k.w(x, z));
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  return hi - lo;
}

// 貼著地形的鋪面網格，頂面離地 up 公尺，登記可走表面
export function drapeGround(k, x0, x1, z0, z1, mat, up = 0.05) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / 2.5)),
    nz = Math.max(1, Math.ceil((z1 - z0) / 2.5)),
    pos = [],
    uv = [],
    idx = [];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx,
        z = z0 + ((z1 - z0) * j) / nz;
      pos.push(x, H(...k.w(x, z)) - k.base + up, z);
      uv.push(x / 2, z / 2);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        c = a + nx + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  k._part(mat, g);
  k.I.addSurface(k.rect(x0, x1, z0, z1), up);
}

// 地面鋪面：這一塊高低差超過 8 cm 就鋪成貼地斜面，平地照舊用平板（和原本的 k.box 一模一樣）
export function paveGround(k, x0, x1, y0, y1, z0, z1, mat) {
  if (groundSlope(k, x0, x1, z0, z1) > 0.08) drapeGround(k, x0, x1, z0, z1, mat, y1);
  else k.box(x0, x1, y0, y1, z0, z1, mat, { col: false, surface: true });
}
