// 市區公車：照實際路線（src/systems/BusRoutes.js）在地圖上開的公車，玩家可以在站牌搭乘。
//
// 路線：每個方向是一串道路名稱（照實際走的順序）＋進出地圖的端點，在路網（world.graph）上找「依序只走這些路」的
// 最短路（每條路一層的 Dijkstra），得到一串邊（route，Traffic.placeBus 用）與累計里程 cum。站牌照實際站名放在
// 路線上：OSM 有同名站牌的用它的位置，沒有的照研究的座標（at）投影到路線上，並在路邊補一支站牌（stopProps）。
//
// 排班：照 ebus 的發車時刻（遊戲時鐘，現實 4 秒＝遊戲 1 分鐘；沒有時刻表的方向照平均班距）從地圖邊界開進來
// （跟火車一樣，班表用遊戲時間、行駛用現實速度）。每班車是一個「虛擬公車」：離玩家遠時只照平均速度沿路線前進、到站停 DWELL 秒；
// 離玩家 280 m 內換成真的車（Traffic 的一員，src/entities/NPC.js addBus / placeBus：跟車、讓行人、平交道照常），
// 由 ctl() 控制到站減速、靠邊、開門、停幾秒、關門開走，以及紅燈停在停止線前（world.signals，src/world/Furniture.js）；
// 離玩家 330 m 外又變回虛擬的。開到路線終點（地圖邊界）就消失。
//
// 搭乘（src/systems/BusRide.js）：站牌按 E 看各路線下一班幾分鐘到；車到站開門時可以上車、選下車站，
// 坐著看或快轉到站。
import * as THREE from 'three';
import { BUS_ROUTES, BUS_FARE } from './BusRoutes.js';
import { surfaceAt } from '../world/Terrain.js';
import { canvasTexture } from '../graphics/GpuMemLifecycle.js';
import { Vehicle } from '../entities/Vehicles.js';
import { BUS } from '../entities/BusModel.js';

export const MIN_REAL = 4; // 現實秒／遊戲分鐘（src/core/Game.js clock += dt / 4）
const V_AVG = 7.2; // m/s：虛擬公車的平均速度（含起步、轉彎）
const DWELL = 9; // s：到站開門停的時間（現實秒）
const NEAR = 280,
  FAR = 330; // m：離玩家多近換成真的車／多遠變回虛擬
const POOL_MAX = 3; // 每條路線最多幾台真的車

const LAT0 = 24.958,
  LON0 = 121.2425,
  KX = 111320 * Math.cos((LAT0 * Math.PI) / 180),
  KZ = 110574;
// 經緯度 → 遊戲座標（tools/build_map.py proj）
export const proj = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
const hhmm = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// 依序只走 roads 裡的路（可以接沒名字的連接段、橋、路口裡的短段，成本加倍）的最短路：狀態 (節點, 走到第幾條路)。
// 起點：第一條路上離 a 最近的幾個節點（分隔道路兩側各有一條同名單行道，所以不只取最近的一個）；終點：最後一條路上
// 離 b 最近的幾個「開得進去」的節點，先到的那個
function routeEdges(world, roads, a, b) {
  const nodes = world.driveNodes,
    into = new Map(); // 節點 → 開進它的邊的路名
  for (const n of nodes)
    for (const e of n.adj)
      if (e.drive) (into.get(e.to) || into.set(e.to, new Set()).get(e.to)).add(e.road.name);
  const cand = (p, ok) => {
    const L = nodes.filter(ok).map((n) => [Math.hypot(n.x - p[0], n.z - p[1]), n]);
    if (!L.length) return [];
    const d0 = Math.min(...L.map((x) => x[0]));
    return L.filter((x) => x[0] < d0 + (p.exact ? 3 : 40)); // 地圖裡的點（正門口）：就是那個節點
  };
  const S0 = cand(a, (n) => n.adj.some((e) => e.drive && e.road.name === roads[0])),
    T = new Set(cand(b, (n) => into.get(n)?.has(roads[roads.length - 1])).map((x) => x[1]));
  if (!S0.length || !T.size) return null;
  const key = (n, i) => `${n.id}|${i}`;
  const dist = new Map(),
    prev = new Map(),
    heap = [];
  const d0 = Math.min(...S0.map((x) => x[0]));
  for (const [d, n] of S0) {
    dist.set(key(n, 0), (d - d0) * 2);
    heap.push([(d - d0) * 2, n, 0]);
  }
  const pop = () => {
    let m = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[m][0]) m = i;
    return heap.splice(m, 1)[0];
  };
  let end = null;
  const done = new Set();
  while (heap.length) {
    const [d, n, i] = pop(),
      k = key(n, i);
    if (done.has(k)) continue;
    done.add(k);
    if (T.has(n) && i === roads.length - 1 && prev.has(k)) {
      end = k;
      break;
    }
    for (const e of n.adj) {
      if (!e.drive) continue;
      const nm = e.road.name || '';
      const l = Math.hypot(e.to.x - n.x, e.to.z - n.z);
      for (const [j, c] of [
        // 沒名字的連接段、橋（新中北路的中北橋）、路口裡很短的別條路：可以接，但成本加倍
        [i, nm === roads[i] ? 1 : !nm || e.road.bridge || /橋$/.test(nm) || l < 20 ? 3 : 0],
        [i + 1, i + 1 < roads.length && nm === roads[i + 1] ? 1 : 0],
      ]) {
        if (!c) continue;
        const k2 = key(e.to, j),
          nd = d + l * c;
        if (nd < (dist.get(k2) ?? Infinity)) {
          dist.set(k2, nd);
          prev.set(k2, [k, e, n]);
          heap.push([nd, e.to, j]);
        }
      }
    }
  }
  if (!end) return null;
  const edges = [],
    froms = [];
  for (let k = end; prev.has(k);) {
    const [pk, e, n] = prev.get(k);
    edges.push(e);
    froms.push(n);
    k = pk;
  }
  edges.reverse();
  froms.reverse();
  edges.nodes = froms;
  return edges;
}
// 進出點：[緯度, 經度]，或 { xz: [x, z] }（遊戲座標）
const pt = (p) => (p.xz ? Object.assign([...p.xz], { exact: true }) : proj(...p));

// 路線上的點：里程 s → 位置、前進方向、所在的邊
function along(R, s) {
  const { edges, cum } = R;
  let i = 0;
  while (i < edges.length - 1 && cum[i + 1] <= s) i++;
  const f = edges.nodes[i],
    t = edges[i].to,
    l = cum[i + 1] - cum[i] || 1,
    k = Math.max(0, Math.min(1, (s - cum[i]) / l));
  const tx = (t.x - f.x) / l,
    tz = (t.z - f.z) / l;
  return {
    x: f.x + (t.x - f.x) * k,
    z: f.z + (t.z - f.z) * k,
    tx,
    tz,
    i,
    d: s - cum[i],
    e: edges[i],
  };
}
// (x, z) 投影到路線上：最近的里程與距離（只看 s0 之後）
function project(R, x, z, s0 = 0) {
  const { edges, cum } = R;
  let best = { s: 0, d: Infinity };
  for (let i = 0; i < edges.length; i++) {
    if (cum[i + 1] < s0) continue;
    const f = edges.nodes[i],
      t = edges[i].to,
      dx = t.x - f.x,
      dz = t.z - f.z,
      l2 = dx * dx + dz * dz || 1;
    const k = Math.max(0, Math.min(1, ((x - f.x) * dx + (z - f.z) * dz) / l2));
    const d = Math.hypot(f.x + dx * k - x, f.z + dz * k - z),
      s = cum[i] + k * Math.sqrt(l2);
    if (d < best.d && s >= s0) best = { s, d };
  }
  return best;
}

// 號誌：phase 與 src/world/Furniture.js 的 36 秒週期相同（第 0 組 0–15 綠、15–18 黃、其餘紅；第 1 組相反）
export function lightOf(grp, t) {
  const c = t % 36;
  if (grp === 0) return c < 15 ? 'g' : c < 18 ? 'y' : 'r';
  return c < 18 ? 'r' : c < 33 ? 'g' : 'y';
}

export class Buses {
  constructor(game) {
    this.g = game;
    this.lines = []; // 每條路線的每個方向：{ id, def, dir, dest, edges, cum, len, stops, lights, livery, mins }
    this.runs = []; // 虛擬公車
    this.pool = new Map(); // 路線 id → 真的車（Vehicle）
    this.places = []; // 站牌（同名、相近的各方向站合成一個），{ name, x, z, entries: [{ L, k }] }
    this._clock = null;
    this._build();
  }

  _build() {
    const w = this.g.world;
    const osm = (w.data.furniture || []).filter((f) => f.t === 'bus_stop');
    for (const def of BUS_ROUTES)
      for (const dir of def.dirs) {
        // 一個方向可以分幾段（legs）：段與段之間是地圖上開不過去的地方（中北路正門 → 校內 → 全人大道），
        // 車在段尾（沒人看到時）收起來，gap 秒後從下一段的段頭出來
        let prevL = null;
        const legs = dir.legs || [dir];
        for (const [li, leg] of legs.entries()) {
          const edges = routeEdges(w, leg.roads, pt(leg.enter), pt(leg.exit));
          if (!edges || !edges.length) {
            console.warn(`[公車] ${def.id} 往${dir.dest}：路網上找不到第 ${li + 1} 段路線`);
            prevL = null;
            break;
          }
          const cum = [0];
          for (let i = 0; i < edges.length; i++) {
            const f = edges.nodes[i],
              t = edges[i].to;
            cum.push(cum[i] + Math.hypot(t.x - f.x, t.z - f.z));
          }
          const L = {
            id: def.id,
            def,
            dir,
            leg: li,
            dest: dir.dest,
            edges,
            cum,
            len: cum[cum.length - 1],
            livery: def.livery,
            prev: prevL,
            next: null,
            gap: leg.gap || 0, // 從上一段段尾到這一段段頭要幾秒（看不到的那段）
            // 這個方向每天進地圖的時刻（遊戲分鐘，只有第一段有）：起站發車時刻＋lead，或 first～last 每 headway 一班
            mins:
              li > 0
                ? []
                : dir.times
                  ? dir.times.map((t) => hhmm(t) + (dir.lead || 0))
                  : (() => {
                      const out = [];
                      for (let m = hhmm(dir.first); m <= hhmm(dir.last); m += dir.headway)
                        out.push(m);
                      return out;
                    })(),
            stops: [],
            lights: [],
          };
          if (prevL) prevL.next = L;
          prevL = L;
          // 站：OSM 同名站牌（離路線 14 m 內、在行進方向右側）優先，否則照研究座標
          let s0 = 0;
          for (const st of leg.stops) {
            const name = typeof st === 'string' ? st : st.name;
            const at = typeof st === 'string' ? null : st.at;
            let best = null;
            for (const o of osm) {
              if (o.name !== name && o.name !== st.osm) continue;
              const p = project(L, o.x, o.z, s0);
              if (p.d > 14) continue;
              const q = along(L, p.s),
                side = (o.x - q.x) * -q.tz + (o.z - q.z) * q.tx; // >0：行進方向右側
              if (side < -1) continue;
              if (!best || p.d < best.d) best = { ...p, x: o.x, z: o.z, osm: true };
            }
            if (!best && at) {
              const [x, z] = proj(...at),
                p = project(L, x, z, s0);
              if (p.d < 40) best = { ...p, osm: false };
            }
            if (!best) {
              console.warn(`[公車] ${def.id} 往${dir.dest}：站「${name}」不在路線上，略過`);
              continue;
            }
            // 公車停的位置要留得下整台車：離路線起點至少一個車長
            const s = Math.max(best.s, BUS.L + 4);
            if (s > L.len - 8) continue;
            const q = along(L, s),
              hw = q.e.w / 2;
            // 站牌立在右側路緣外 0.9 m（OSM 有的就用 OSM 的位置）
            const px = best.osm ? best.x : q.x - q.tz * (hw + 0.9),
              pz = best.osm ? best.z : q.z + q.tx * (hw + 0.9);
            L.stops.push({ name, s, x: px, z: pz, osm: best.osm, tx: q.tx, tz: q.tz, w: q.e.w });
            s0 = s + 5;
          }
          // 路上的號誌：路口（節點 id 對得上）與路段中間的行人號誌
          const sig = new Map((w.signals || []).filter((g) => !g.mid).map((g) => [g.id, g]));
          for (let i = 0; i < edges.length; i++) {
            const n = edges[i].to,
              G = sig.get(n.id);
            if (!G) continue;
            const f = edges.nodes[i],
              l = cum[i + 1] - cum[i] || 1,
              ix = (f.x - n.x) / l,
              iz = (f.z - n.z) / l;
            // 從哪一支臂進來：方向最接近「節點 → 來的地方」的那支
            let arm = null,
              bd = -2;
            for (const a of G.arms) {
              const d = a.ex * ix + a.ez * iz;
              if (d > bd) {
                bd = d;
                arm = a;
              }
            }
            if (!arm || bd < 0.5) continue;
            L.lights.push({ s: cum[i + 1] - Math.min(arm.stop, l - 1), grp: arm.grp });
          }
          for (const g of (w.signals || []).filter((g) => g.mid)) {
            const p = project(L, g.x, g.z);
            if (p.d < 4) L.lights.push({ s: p.s - 3, grp: 0 });
          }
          L.lights.sort((a, b) => a.s - b.s);
          this.lines.push(L);
        }
      }
    // 站牌：同名、20 m 內的合成一個（不同路線共用一支）
    for (const L of this.lines)
      L.stops.forEach((st, k) => {
        // 同名、同方向（對面車道的是另一支站牌）、20 m 內的合成一支
        let P = this.places.find(
          (p) =>
            p.name === st.name &&
            p.tx * st.tx + p.tz * st.tz > 0.3 &&
            Math.hypot(p.x - st.x, p.z - st.z) < 20
        );
        if (!P)
          this.places.push(
            (P = {
              name: st.name,
              x: st.x,
              z: st.z,
              tx: st.tx,
              tz: st.tz,
              osm: st.osm,
              entries: [],
            })
          );
        P.osm = P.osm || st.osm;
        P.entries.push({ L, k });
        st.place = P;
      });
  }

  // ---------- 站牌 ----------
  // OSM 沒有的站（照實際站名補）：一支站牌桿、藍底白字的站名牌、下面一塊列出停靠路線的白牌；碰撞是桿子的細圓柱。
  // 立的位置被建物、樹佔住就沿路前後挪（最多 8 m）
  stopProps(scene, collision) {
    const add = [];
    for (const P of this.places) {
      if (P.osm) continue;
      let at = null;
      for (const o of [0, 1.5, -1.5, 3, -3, 5, -5, 8, -8]) {
        const x = P.x + P.tx * o,
          z = P.z + P.tz * o;
        if (!collision.insideAny(x, z) && !collision.blocked?.(x, z, 0.4)) {
          at = [x, z];
          break;
        }
      }
      if (!at) at = [P.x, P.z];
      P.x = at[0];
      P.z = at[1];
      add.push(P);
    }
    this.added = add.map((P) => P.name);
    if (!add.length) return;
    const g = new THREE.Group();
    const pole = new THREE.MeshStandardMaterial({
      color: '#8a9096',
      roughness: 0.5,
      metalness: 0.4,
    });
    const pg = new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8);
    for (const P of add) {
      const y = surfaceAt(P.x, P.z);
      const m = new THREE.Mesh(pg, pole);
      m.position.set(P.x, y + 1.4, P.z);
      g.add(m);
      const routes = [...new Set(P.entries.map((e) => e.L.id))].join('  ');
      const tex = canvasTexture(
        256,
        420,
        (c, w, h) => {
          c.fillStyle = '#1d4f9c';
          c.fillRect(0, 0, w, 250);
          c.fillStyle = '#fff';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = '800 46px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
          c.fillText('🚏 公車站', w / 2, 52);
          let fs = 54;
          c.font = `900 ${fs}px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
          const lines =
            P.name.length > 5
              ? [
                  P.name.slice(0, Math.ceil(P.name.length / 2)),
                  P.name.slice(Math.ceil(P.name.length / 2)),
                ]
              : [P.name];
          for (const ln of lines)
            while (c.measureText(ln).width > w - 20 && fs > 24) {
              fs -= 2;
              c.font = `900 ${fs}px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
            }
          lines.forEach((ln, i) =>
            c.fillText(ln, w / 2, (lines.length > 1 ? 130 : 160) + i * (fs + 10))
          );
          c.fillStyle = '#f4f4f0';
          c.fillRect(0, 258, w, h - 258);
          c.fillStyle = '#1d4f9c';
          c.font = '900 64px system-ui, sans-serif';
          c.fillText(routes, w / 2, 340, w - 16);
        },
        false
      );
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.82),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })
      );
      // 面向來車（沿路逆著行進方向看得到）
      sign.position.set(P.x - P.tx * 0.04, y + 2.35, P.z - P.tz * 0.04);
      sign.rotation.y = Math.atan2(-P.tx, -P.tz);
      g.add(sign);
      collision.addCircle(P.x, P.z, 0.12);
    }
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(g);
    this.propGroup = g;
  }

  // ---------- 排班 ----------
  // 這個方向在遊戲時刻 (from, to]（分鐘，可以跨日）之間開進地圖的班次（只有第一段有班表）
  _deps(L, from, to) {
    const out = [];
    for (let d = Math.floor(from / 1440) - 1; d <= Math.floor(to / 1440); d++)
      for (const m of L.mins) {
        const t = d * 1440 + m;
        if (t > from && t <= to) out.push(t);
      }
    return out.sort((a, b) => a - b);
  }
  // 從 (L, 里程 s, 下一站 k0) 照平均速度開到 (Lt, 站 kt) 要幾秒（中間每站停 DWELL）；開不到：Infinity
  _secTo(L, s, k0, Lt, kt) {
    let t = 0;
    for (; L; L = L.next, s = 0, k0 = 0) {
      const last = L === Lt ? kt : L.stops.length - 1;
      for (let j = k0; j <= last; j++) {
        const sj = L.stops[j].s - BUS.doorF;
        if (sj < s - 0.5) continue;
        t += (sj - s) / V_AVG + (L === Lt && j === kt ? 0 : DWELL);
        s = sj;
      }
      if (L === Lt) return t;
      t += (L.len - s) / V_AVG + (L.next?.gap || 0);
    }
    return Infinity;
  }
  // 進地圖 sec 秒後（現實秒）開到哪：{ L, s, k, dwell, wait }；null：已經開出地圖
  _timeline(L, sec) {
    let t = sec;
    for (; L; L = L.next) {
      if (L.prev) {
        if (t < L.gap) return { L, s: 0, k: 0, dwell: 0, wait: L.gap - t };
        t -= L.gap;
      }
      let s = 0;
      for (const [k, st] of L.stops.entries()) {
        const tgt = st.s - BUS.doorF,
          run = (tgt - s) / V_AVG;
        if (t < run) return { L, s: s + t * V_AVG, k, dwell: 0, wait: 0 };
        t -= run;
        s = tgt;
        if (t < DWELL) return { L, s, k, dwell: DWELL - t, wait: 0 };
        t -= DWELL;
      }
      const rest = (L.len - s) / V_AVG;
      if (t < rest) return { L, s: s + t * V_AVG, k: L.stops.length, dwell: 0, wait: 0 };
      t -= rest;
    }
    return null;
  }
  _run(L, dep, p = { s: 0, k: 0, dwell: 0, wait: 0 }) {
    return {
      L: p.L || L,
      s: p.s,
      k: p.k,
      dwell: p.dwell,
      wait: p.wait,
      v: null,
      dep,
      state: p.dwell > 0 ? 'dwell' : 'run',
      door: 0,
    };
  }
  // 重排所有虛擬公車（開始玩、時間被快轉時）
  _reset(clock) {
    for (const r of this.runs) this._unspawn(r);
    this.runs = [];
    for (const L of this.lines) {
      if (L.prev) continue;
      let span = 1; // 走完全程要幾分鐘
      for (let M = L; M; M = M.next)
        span += (M.len / V_AVG + M.stops.length * DWELL + M.gap) / MIN_REAL;
      for (const t of this._deps(L, clock - span, clock)) {
        const p = this._timeline(L, (clock - t) * MIN_REAL);
        if (p) this.runs.push(this._run(L, t, p));
      }
    }
    this._clock = clock;
  }

  update(dt) {
    const g = this.g,
      clock = g.clock;
    if (this._clock === null || clock - this._clock > 2 || clock < this._clock) this._reset(clock);
    else {
      for (const L of this.lines)
        for (const t of this._deps(L, this._clock, clock)) this.runs.push(this._run(L, t));
      this._clock = clock;
    }
    const p = g.ride?.bus ? g.ride.bus.pos : g.player.worldPos();
    for (const r of this.runs) {
      if (r.v) this._real(r, dt, p);
      else this._virtual(r, dt);
      if (!r.v && !r.gone && !(r.wait > 0)) {
        const q = along(r.L, r.s);
        if (Math.hypot(q.x - p.x, q.z - p.z) < NEAR) this._spawn(r);
      }
    }
    this.runs = this.runs.filter((r) => !r.gone);
    this._sound(dt);
  }

  _virtual(r, dt) {
    const L = r.L;
    if (r.wait > 0) {
      r.wait -= dt; // 在看不到的那段（校內）
      return;
    }
    if (r.dwell > 0) {
      r.dwell -= dt;
      if (r.dwell <= 0) {
        r.k++;
        r.state = 'run';
      }
      return;
    }
    const st = L.stops[r.k],
      tgt = st ? st.s - BUS.doorF : Infinity;
    r.s += V_AVG * dt;
    if (r.s >= tgt) {
      r.s = tgt;
      r.dwell = DWELL;
      r.state = 'dwell';
    }
    if (r.s >= L.len - 1) this._nextLeg(r);
  }
  // 段尾：接到下一段（沒有下一段就是開出地圖了）
  _nextLeg(r) {
    const N = r.L.next;
    if (!N) {
      r.gone = true;
      return;
    }
    Object.assign(r, { L: N, s: 0, k: 0, dwell: 0, wait: N.gap, state: 'run', atEnd: false });
  }

  // 換成真的車：同一條路線的車池裡拿一台空的
  _spawn(r) {
    const L = r.L,
      tr = this.g.traffic;
    let list = this.pool.get(L.id);
    if (!list) this.pool.set(L.id, (list = []));
    let v = list.find((o) => !o.busRun);
    if (!v) {
      if (list.length >= POOL_MAX) return;
      v = new Vehicle('bus', Math.random, { livery: L.livery, route: L.id, dest: L.dest });
      tr.addBus(v, (veh, want, dt) => this._ctl(veh, want, dt));
      v.signDest = L.dest;
      list.push(v);
    }
    // 段頭在地圖裡（校內全人大道）：看得到的時候不要憑空冒出來，等一下（坐在車上的玩家除外）
    const q = along(L, r.s),
      riding = this.g.ride?.run === r;
    if (L.prev && r.s < 25 && !riding && this.g.traffic.inView(q)) return;
    // 生成的位置不能壓到別的車：在看得到的地方就等一下，看不到就把那台一般車收掉
    for (const o of tr.vehicles()) {
      if (o === v || Math.hypot(o.pos.x - q.x, o.pos.z - q.z) > BUS.L) continue;
      if (o.bus || (tr.inView(o.pos) && !riding)) return;
      o.ai.dormant = true;
      o.mesh.visible = false;
    }
    if (v.signDest !== L.dest) {
      v.mesh.userData.setSign(L.id, L.dest);
      v.signDest = L.dest;
    }
    v.busRun = r;
    r.v = v;
    tr.placeBus(v, L.edges, q.i, q.d, r.state === 'dwell' ? 0 : 6);
    // 停在站上：一放下就靠在路邊
    if (r.state === 'dwell') {
      const st = L.stops[r.k];
      v.ai.lat = v.ai.latT = this._curb(v, st);
      r.door = 1;
      v.mesh.userData.open01(1);
    } else {
      r.door = 0;
      v.mesh.userData.open01(0);
    }
  }
  _unspawn(r) {
    const v = r.v;
    if (!v) return;
    v.busRun = null;
    v.ai.dormant = true;
    v.ai.route = null;
    v.mesh.visible = false;
    r.v = null;
  }
  // 靠站時往右偏多少（貼近路緣，留 0.35 m）
  _curb(v, st) {
    const lane = this.g.traffic._lane(v);
    return Math.max(0, st.w / 2 - v.hw - 0.35 - lane);
  }
  _sAt(v) {
    const a = v.ai;
    return v.busRun.L.cum[a.ri] + a.d;
  }

  _real(r, dt, p) {
    const v = r.v,
      a = v.ai;
    if (a.dormant || !a.route) {
      // 開出地圖（路線走完）
      this._unspawn(r);
      this._nextLeg(r);
      return;
    }
    r.s = this._sAt(v);
    // 段尾停好了（中北路正門口）：沒人看到（或玩家就坐在車上）時開進校園，接到下一段
    if (r.atEnd && (this.g.ride?.run === r || !this.g.traffic.inView(v.pos))) {
      this._unspawn(r);
      this._nextLeg(r);
      if (this.g.ride?.run === r) {
        r.wait = 0;
        this._spawn(r);
      }
      return;
    }
    const ud = v.mesh.userData;
    // 車門
    const want = r.state === 'dwell' && r.dwell > 1.2 ? 1 : 0;
    if (r.door !== want) {
      r.door = Math.max(0, Math.min(1, r.door + (want ? dt : -dt) * 1.1));
      ud.open01(r.door);
    }
    if (r.state === 'dwell') {
      if (r.hold) r.dwell = Math.max(r.dwell, 2); // 玩家正在上下車
      r.dwell -= dt;
      if (r.dwell <= 0 && r.door <= 0) {
        r.state = 'run';
        r.k++;
        a.latT = 0;
      }
    }
    const far = Math.hypot(v.pos.x - p.x, v.pos.z - p.z) > FAR;
    if (far && !(this.g.ride?.run === r) && !this.g.traffic.inView(v.pos)) this._unspawn(r);
  }

  // Traffic.update 問：這台公車現在最快可以開多快（到站、紅燈）
  _ctl(v, want, dt) {
    const r = v.busRun;
    if (!r) return want;
    const L = r.L,
      s = this._sAt(v);
    if (r.state === 'dwell') return 0;
    let lim = want;
    const st = L.stops[r.k];
    if (st) {
      const tgt = st.s - BUS.doorF,
        d = tgt - s;
      if (d < 45) v.ai.latT = this._curb(v, st);
      lim = Math.min(lim, d > 0 ? Math.sqrt(2 * 1.1 * d) + 0.4 : 0);
      if (d < 0.8 && Math.abs(v.speed) < 0.5) {
        r.state = 'dwell';
        r.dwell = DWELL;
        this._chime(v);
        return 0;
      }
      if (d < -6) {
        // 被擋住開過頭了：這站不停
        r.k++;
        v.ai.latT = 0;
      }
    }
    // 段尾在地圖裡（開進校園的正門口）：停在段尾前
    if (L.next) {
      const d = L.len - 1.5 - (s + v.radius);
      lim = Math.min(lim, d > 0 ? Math.sqrt(2 * 1.2 * d) : 0);
      if (d < 1.5 && Math.abs(v.speed) < 0.3) r.atEnd = true;
    }
    // 校門警衛室的柵欄（全人大道）：開近時減速到 3 m/s，柵欄自己會升起
    const [fx, fz] = v.forward();
    for (const [bx, bz] of this.g.interiors?.barriers || []) {
      const dx = bx - v.pos.x,
        dz = bz - v.pos.z,
        ahead = dx * fx + dz * fz;
      if (ahead > -2 && ahead < 30 && Math.abs(dx * fz - dz * fx) < 8)
        lim = Math.min(lim, 3 + Math.max(0, ahead - v.radius - 4) * 0.35);
    }
    // 紅燈（黃燈來不及停的照開）：車頭停在停止線前
    const t = this.g.time || 0,
      nose = s + v.radius;
    for (const li of L.lights) {
      const d = li.s - nose;
      if (d < -1) continue;
      if (d > 70) break;
      const c = lightOf(li.grp, t);
      if (c === 'g') continue;
      const stopD = (v.speed * v.speed) / (2 * 3);
      if (c === 'y' && d < stopD + 2) continue;
      lim = Math.min(lim, d > 0.5 ? Math.sqrt(2 * 1.6 * (d - 0.5)) : 0);
      break;
    }
    return lim;
  }

  // 有沒有真的公車在 (x, z) 的 r 公尺內（警衛室柵欄自動升起，src/world/Interiors.js）
  nearAny(x, z, r) {
    for (const o of this.runs)
      if (o.v && Math.abs(o.v.pos.x - x) < r && Math.abs(o.v.pos.z - z) < r) {
        if (Math.hypot(o.v.pos.x - x, o.v.pos.z - z) < r) return true;
      }
    return false;
  }

  // ---------- 到站時間 ----------
  // 同一個方向的第一段
  _head(L) {
    while (L.prev) L = L.prev;
    return L;
  }
  // (L, 站 k) 在這個方向上的順序（跨段比較用）
  _ord(L, k) {
    return L.leg * 1000 + k;
  }
  // 站 k（L.stops 的索引）：下一班幾秒（現實秒）到；null：今天沒有車了
  etaSec(L, k) {
    const H = this._head(L),
      tgt = L.stops[k].s - BUS.doorF;
    let best = null;
    for (const r of this.runs) {
      if (this._head(r.L) !== H) continue;
      if (r.L === L) {
        if (r.k === k && r.state === 'dwell') return 0;
        if (r.k > k || r.s > tgt + 0.5) continue;
      } else if (r.L.leg > L.leg) continue;
      const t =
        Math.max(0, r.wait || 0) +
        (r.state === 'dwell' ? Math.max(0, r.dwell) : 0) +
        this._secTo(r.L, r.s, r.state === 'dwell' ? r.k + 1 : r.k, L, k);
      if (best === null || t < best) best = t;
    }
    if (best !== null) return best;
    const c = this.g.clock;
    const next = this._deps(H, c, c + 1440)[0];
    if (next === undefined) return null;
    return (next - c) * MIN_REAL + this._secTo(H, 0, 0, L, k);
  }
  // 停在站 k、開著門的那台車
  atStop(L, k) {
    return (
      this.runs.find((r) => r.L === L && r.k === k && r.state === 'dwell' && r.v && r.door > 0.6) ||
      null
    );
  }
  // 從 (L, 站 k) 往後的站（可以跨段），最多 n 個：[{ L, k }]
  after(L, k, n = 9) {
    const out = [];
    for (k++; L && out.length < n; L = L.next, k = 0)
      for (; k < L.stops.length && out.length < n; k++) out.push({ L, k });
    return out;
  }
  // 從 (L, 站 k) 坐到 (Lt, 站 j) 要幾秒
  rideSec(L, k, Lt, j) {
    return DWELL + this._secTo(L, L.stops[k].s - BUS.doorF, k + 1, Lt, j);
  }

  // ---------- 音效 ----------
  _chime(v) {
    const au = this.g.audio;
    au.at?.(v.pos.x, v.pos.z, 45, () => au.busChime?.());
    au.at?.(v.pos.x, v.pos.z, 30, () => au.busDoor?.(true));
  }
  _sound(dt) {
    const au = this.g.audio;
    if (!au?.ctx || !au.loopBufAt) return;
    const Lp = au.L;
    let best = null,
      bd = 70;
    for (const r of this.runs) {
      if (!r.v) continue;
      const d = Math.hypot(r.v.pos.x - Lp.x, r.v.pos.z - Lp.z);
      if (d < bd) {
        bd = d;
        best = r.v;
      }
      if (r.door > 0 && r.doorSfx !== (r.state === 'dwell')) {
        r.doorSfx = r.state === 'dwell';
        if (!r.doorSfx) au.at?.(r.v.pos.x, r.v.pos.z, 30, () => au.busDoor?.(false));
      }
    }
    // 引擎：最近的一台，柴油引擎低沉的轟轟聲（用汽車引擎錄音降速），起步時大聲
    if (best) {
      const sp = Math.abs(best.speed),
        dx = best.pos.x - Lp.x,
        dz = best.pos.z - Lp.z,
        pan = bd < 1 ? 0 : (-dx * Math.cos(Lp.yaw) + dz * Math.sin(Lp.yaw)) / bd;
      const v = Math.pow(1 - bd / 70, 1.6) * (0.22 + 0.25 * Math.min(1, sp / 10)),
        inside = this.g.ride?.bus === best;
      au.loopBufAt(
        'bus_engine',
        'engine_car',
        inside ? 0.18 : v,
        dt,
        inside ? 0 : pan * 0.8,
        0.5 + sp * 0.035
      );
    } else au.loopBufAt('bus_engine', 'engine_car', 0, dt);
  }
}
export { BUS_FARE };
