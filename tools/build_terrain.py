"""Build the game's terrain height grid (data/terrain.json) from the MOI 20 m DTM.

Source
------
內政部 20公尺網格數值地形模型（DTM），分幅_桃園市DEM，圖幅 96224020
(TWD97 / TM2 121E, TWVD2001 heights, 20 m posts; header date 2003-09-28).
Download (about 16 MB, zip of .hdr/.grd tiles):

    https://www.tgos.tw/MDE/VirtualDir_TC/Product/b798161a-d60f-4399-a83f-9a9d182a134f/分幅_桃園市DEM.zip

Licence: 政府資料開放授權條款－第1版 (Open Government Data License, version 1.0).
Attribution required: 「內政部」. The game credits it in README.md, index.html
and the About page.

The zip is NOT committed. Put it at tools/.cache/taoyuan_dem.zip (git-ignored),
or pass --dem <zip | .grd>, or run with --download to fetch it into the cache.

Usage: python3 -I tools/build_terrain.py [--dem PATH] [--download]

Output
------
Game coordinates as in build_map.py (x = east, z = south, metres). A 10 m grid
covering BOUNDS plus one cell, heights relative to REF (so y is roughly -15..+10),
lightly smoothed. Enterable buildings (js/interiors.js) are flattened to their
entrance height on the footprint grown by FLAT_PAD, with every grid cell that
touches that area pinned so the game's triangle interpolation is exactly constant
there; small ponds and the fountain are flattened to their median bank height.
Sunken plazas (data/cycu.json levels.sinks, from tools/overrides.json 'levels')
pin only the grid posts inside their rectangle to the given height, so the cut
does not spill a whole cell onto the roads around them; raised terraces and
stairs are not in the grid (js/terrain.js adds them on top).
Road cuts (data/cycu.json 'grade', kind cut, from tools/overrides.json) are
filled back up to their bank height along the road, so the streets beside the
cut stay level; the cut itself is drawn below that by js/map.js.

Encoding: heights in decimetres; per row, r0[i] is the first value and rows[i]
holds one char per following column, chr(OFF + delta) with |delta| <= 45.
js/terrain.js decodes it.
"""
import json, math, os, sys, zipfile, urllib.request, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
CACHE = os.path.join(HERE, '.cache', 'taoyuan_dem.zip')
MAP = os.path.join(ROOT, 'data', 'cycu.json')
DST = os.path.join(ROOT, 'data', 'terrain.json')
URL = ('https://www.tgos.tw/MDE/VirtualDir_TC/Product/b798161a-d60f-4399-a83f-9a9d182a134f/'
       '%E5%88%86%E5%B9%85_%E6%A1%83%E5%9C%92%E5%B8%82DEM.zip')
TILE = '96224020'

LAT0, LON0 = 24.9580, 121.2425
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110574
STEP = 10
REF = 135.0          # metres; subtracted so campus sits near y = 0
OFF = 80             # char code for delta 0
FLAT_PAD = 3.0       # flatten this far around enterable footprints
RAMP = 10.0          # then blend back to the DTM over this distance (~10 m)
POND_RAMP = 12.0


# ---------- TWD97 TM2 (121E) ----------
def tm2(lat, lon):
    a = 6378137.0; f = 1 / 298.257222101; k0 = 0.9999; lon0 = math.radians(121); E0 = 250000
    e2 = f * (2 - f); ep2 = e2 / (1 - e2); p = math.radians(lat); l = math.radians(lon)
    N = a / math.sqrt(1 - e2 * math.sin(p) ** 2); T = math.tan(p) ** 2; C = ep2 * math.cos(p) ** 2
    A = (l - lon0) * math.cos(p)
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * p
             - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * p)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * p)
             - (35 * e2 ** 3 / 3072) * math.sin(6 * p))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + E0
    y = k0 * (M + N * math.tan(p) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
                                     + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720))
    return x, y


def game_to_tm2(x, z):
    return tm2(LAT0 - z / KZ, LON0 + x / KX)


# ---------- DTM ----------
def read_grd(path):
    if path.lower().endswith('.zip'):
        with zipfile.ZipFile(path) as zf:
            name = next((n for n in zf.namelist() if n.lower().endswith(TILE + 'dem.grd')), None)
            if not name:
                sys.exit('tile %s not found in %s' % (TILE, path))
            text = zf.read(name).decode('ascii', 'replace')
    else:
        text = open(path, encoding='ascii', errors='replace').read()
    H = {}
    for line in text.splitlines():
        p = line.split()
        if len(p) == 3:
            H[(int(round(float(p[0]))), int(round(float(p[1]))))] = float(p[2])
    return H


def sampler(H):
    es = sorted({k[0] for k in H}); ns = sorted({k[1] for k in H})
    e_lo, e_hi, n_lo, n_hi = es[0], es[-1], ns[0], ns[-1]

    def get(e, n):
        e = min(max(e, e_lo), e_hi); n = min(max(n, n_lo), n_hi)
        return H[(e, n)]

    def at(x, z):
        E, N = game_to_tm2(x, z)
        e0 = math.floor(E / 20) * 20; n0 = math.floor(N / 20) * 20
        fx = (E - e0) / 20; fy = (N - n0) / 20
        return (get(e0, n0) * (1 - fx) * (1 - fy) + get(e0 + 20, n0) * fx * (1 - fy)
                + get(e0, n0 + 20) * (1 - fx) * fy + get(e0 + 20, n0 + 20) * fx * fy)
    return at, (e_lo, e_hi, n_lo, n_hi)


# ---------- geometry helpers ----------
def pip(x, z, pts):
    ins = False; j = len(pts) - 1
    for i in range(len(pts)):
        xi, zi = pts[i]; xj, zj = pts[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi:
            ins = not ins
        j = i
    return ins


def seg_d(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az; l2 = dx * dx + dz * dz
    t = 0 if l2 == 0 else max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / l2))
    return math.hypot(ax + dx * t - px, az + dz * t - pz)


def poly_d(x, z, pts):
    if pip(x, z, pts):
        return 0.0
    return min(seg_d(x, z, *pts[i], *pts[(i + 1) % len(pts)]) for i in range(len(pts)))


class Kit:  # mirrors Kit.w() in js/interiors.js
    def __init__(self, ox, oz, ang):
        self.ox, self.oz, self.c, self.s = ox, oz, math.cos(ang), math.sin(ang)

    def w(self, lx, lz):
        return [self.ox + lx * self.c - lz * self.s, self.oz + lx * self.s + lz * self.c]

    def rect(self, x0, x1, z0, z1):
        return [self.w(x0, z0), self.w(x1, z0), self.w(x1, z1), self.w(x0, z1)]


def interior_zones(data):
    """Flatten zones for the enterable buildings. Keep in sync with js/interiors.js
    (IM_SPEC / imFootprint, MCD_SPEC / sacTrimmedPts, GUARD_SPECS / guardFootprint)."""
    zones = []
    # 資管系館
    ang = math.atan2(16.9, 49.3); L, D = 46, 12.5
    k = Kit(79.9, 92.6, ang)
    zones.append(('資訊管理學系', [k.rect(-5, L + 6.5, -0.5, D + 4)], k.w(L / 2, D + 4)))
    # 麥當勞 + the rest of 學生活動中心 (one slab)
    x0, x1, z0, z1 = -136, -112, -114, -94
    sac = [[-194.7, -128.6], [-163.2, -128.4], [-112, -129.9], [-112, -114], [-136, -114],
           [-136, -94.4], [-144.4, -94.4], [-195.2, -94.5]]
    zones.append(('學生活動中心/麥當勞', [[[x0, z0], [x1 + 5, z0], [x1 + 5, z1 + 2], [x0, z1 + 2]], sac],
                  [x0 + (x1 - x0) + 3, z0 + 10]))
    # 警衛室 x2
    specs = [dict(x=-201.2, z=79.6, ang=math.atan2(78.1 - 79.7, -195.6 + 200.0), name='正門警衛室')]
    a6 = next((p for p in data['pois'] if p['name'] == 'A6校門'), {'x': 128.4, 'z': -14.5})
    best = None
    for r in data['roads']:
        if not r.get('drive'):
            continue
        for a, b in zip(r['pts'], r['pts'][1:]):
            d = seg_d(a6['x'], a6['z'], a[0], a[1], b[0], b[1])
            if best is None or d < best[0]:
                best = (d, math.atan2(b[1] - a[1], b[0] - a[0]), r['w'])
    _, rang, rw = best
    off = rw / 2 + 2.2
    specs.append(dict(x=a6['x'] - math.sin(rang) * off, z=a6['z'] + math.cos(rang) * off, ang=rang, name='側門警衛室'))
    # 全人大道 side gate by the activity centre (mirror of GUARD_SPECS in js/interiors.js)
    best = None
    for r in data['roads']:
        if not r.get('drive'):
            continue
        for a, b in zip(r['pts'], r['pts'][1:]):
            d = seg_d(-91.4, -117, a[0], a[1], b[0], b[1])
            if best is None or d < best[0]:
                ax, az, bx, bz = a[0], a[1], b[0], b[1]
                L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1
                t = max(0, min(1, ((-91.4 - ax) * (bx - ax) + (-117 - az) * (bz - az)) / L2))
                best = (d, math.atan2(bz - az, bx - ax), r['w'], ax + (bx - ax) * t, az + (bz - az) * t)
    _, qang, qw, qx, qz = best
    if -math.sin(qang) < 0:
        qang += math.pi
    qoff = qw / 2 + 2.2
    specs.append(dict(x=qx - math.sin(qang) * qoff, z=qz + math.cos(qang) * qoff, ang=qang, name='活動中心側門警衛室'))
    for s in specs:
        k = Kit(s['x'], s['z'], s['ang'])
        zones.append((s['name'], [k.rect(-0.6, 5, -0.6, 3.8)], k.w(0.7, 2.8 + 0.6)))
    return zones


def pond_zones(data, gx0, gz0, gx1, gz1):
    out = []
    for a in data['areas']:
        if a['kind'] != 'water':
            continue
        xs = [p[0] for p in a['pts']]; zs = [p[1] for p in a['pts']]
        if max(xs) - min(xs) > 200 or max(zs) - min(zs) > 200:
            continue  # rivers keep the DTM channel
        if min(xs) < gx0 or max(xs) > gx1 or min(zs) < gz0 or max(zs) > gz1:
            continue
        out.append((a.get('name') or 'pond', a['pts']))
    return out


CUT_FLAT = 12.0      # cut fill: level across this far from the road centre
CUT_REACH = 22.0     # then blend back to the DTM by here
CUT_BANK = (22.0, 28.0)   # bank height sampled this far out on both sides
CUT_RAMP = 15.0      # and over this distance past the cut's ends


def cut_fill(g, bil, gx0, gz0, nx, nz, W, T):
    """Level the terrain posts along a cut road to its banks (see main)."""
    path, prof = g['path'], g['prof']
    on = [i for i, (s, v) in enumerate(prof) if v > 0]
    sa, sb = prof[max(0, on[0] - 1)][0], prof[min(len(prof) - 1, on[-1] + 1)][0]
    segs, acc = [], 0.0
    for a, b in zip(path, path[1:]):
        l = math.hypot(b[0] - a[0], b[1] - a[1]); segs.append((a, b, l, acc)); acc += l

    def proj(x, z):  # (s, offset, ux, uz) on the nearest segment
        best = None
        for a, b, l, s0 in segs:
            dx, dz = (b[0] - a[0]) / l, (b[1] - a[1]) / l
            t = min(l, max(0.0, (x - a[0]) * dx + (z - a[1]) * dz))
            d = math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)
            if best is None or d < best[0]:
                best = (d, s0 + t, dx * (z - a[1]) - dz * (x - a[0]), dx, dz)
        return best[1:]

    def smooth(t):
        t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
    xs = [p[0] for p in path]; zs = [p[1] for p in path]
    i0 = max(0, int((min(xs) - CUT_REACH - gx0) / STEP)); i1 = min(nx - 1, int((max(xs) + CUT_REACH - gx0) / STEP) + 1)
    j0 = max(0, int((min(zs) - CUT_REACH - gz0) / STEP)); j1 = min(nz - 1, int((max(zs) + CUT_REACH - gz0) / STEP) + 1)
    n = 0
    for j in range(j0, j1 + 1):
        for i in range(i0, i1 + 1):
            x, z = gx0 + i * STEP, gz0 + j * STEP
            s, off, ux, uz = proj(x, z)
            w = (1 - smooth((abs(off) - CUT_FLAT) / (CUT_REACH - CUT_FLAT))) * \
                (1 - smooth((sa - s) / CUT_RAMP)) * (1 - smooth((s - sb) / CUT_RAMP))
            if w <= 0:
                continue
            cx, cz = x + uz * off, z - ux * off  # the centreline point (left normal = (-uz, ux))
            bank = sum(bil(cx - uz * k * o, cz + ux * k * o) for o in CUT_BANK for k in (1, -1)) / 4
            if w > W[j][i]:
                W[j][i] = w; T[j][i] = bank; n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dem', default=CACHE)
    ap.add_argument('--download', action='store_true')
    args = ap.parse_args()
    if not os.path.exists(args.dem):
        if not args.download:
            sys.exit('DTM not found: %s\nDownload it from\n  %s\nor run with --download' % (args.dem, URL))
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        print('downloading', URL)
        urllib.request.urlretrieve(URL, CACHE)
        args.dem = CACHE
    data = json.load(open(MAP, encoding='utf-8'))
    B = data['bounds']
    gx0, gz0 = B['minX'] - STEP, B['minZ'] - STEP
    nx = int((B['maxX'] + STEP - gx0) / STEP) + 1
    nz = int((B['maxZ'] + STEP - gz0) / STEP) + 1
    gx1, gz1 = gx0 + (nx - 1) * STEP, gz0 + (nz - 1) * STEP

    at, ext = sampler(read_grd(args.dem))
    for x, z in ((gx0, gz0), (gx1, gz0), (gx0, gz1), (gx1, gz1)):
        E, N = game_to_tm2(x, z)
        if not (ext[0] <= E <= ext[1] and ext[2] <= N <= ext[3]):
            print('warning: grid corner (%d,%d) outside tile %s, edge values reused' % (x, z, TILE))
    raw = [[at(gx0 + i * STEP, gz0 + j * STEP) - REF for i in range(nx)] for j in range(nz)]

    # light 3x3 binomial smoothing (edges clamp)
    def g(j, i):
        return raw[min(max(j, 0), nz - 1)][min(max(i, 0), nx - 1)]
    K = ((1, 2, 1), (2, 4, 2), (1, 2, 1))
    h = [[sum(K[b + 1][a + 1] * g(j + b, i + a) for a in (-1, 0, 1) for b in (-1, 0, 1)) / 16
          for i in range(nx)] for j in range(nz)]

    def bil(x, z):  # matches js/terrain.js triangle split (diagonal i,j -> i+1,j+1)
        fx = min(max((x - gx0) / STEP, 0), nx - 1.001); fz = min(max((z - gz0) / STEP, 0), nz - 1.001)
        i, j = int(fx), int(fz); u, v = fx - i, fz - j
        h00, h10, h01, h11 = h[j][i], h[j][i + 1], h[j + 1][i], h[j + 1][i + 1]
        if u >= v:
            return h00 + u * (h10 - h00) + v * (h11 - h10)
        return h00 + v * (h01 - h00) + u * (h11 - h01)

    # ---- flatten: (target, polys, pad, ramp, cells) ----
    # cells: pin every corner of each cell touching the padded footprint (exactly
    # flat on it); otherwise only the posts inside it
    jobs = []
    for name, polys, door in interior_zones(data):
        jobs.append((name, round(bil(*door), 1), polys, FLAT_PAD, RAMP, True))
    for name, pts in pond_zones(data, gx0, gz0, gx1, gz1):
        banks = sorted(bil(x, z) for x, z in pts)  # water level: median bank height
        jobs.append((name, round(banks[len(banks) // 2], 1), [pts], 0.0, POND_RAMP, True))
    for sk in data.get('levels', {}).get('sinks', []):
        jobs.append((sk['name'], sk['y'], [sk['pts']], 0.0, sk.get('ramp', RAMP), False))
    half = STEP * math.sqrt(2) / 2
    W = [[0.0] * nx for _ in range(nz)]
    T = [[0.0] * nx for _ in range(nz)]
    flat = []
    for name, target, polys, pad, ramp, cells in jobs:
        xs = [p[0] for pl in polys for p in pl]; zs = [p[1] for pl in polys for p in pl]
        reach = pad + half + ramp + STEP
        i0 = max(0, int((min(xs) - reach - gx0) / STEP)); i1 = min(nx - 1, int((max(xs) + reach - gx0) / STEP) + 1)
        j0 = max(0, int((min(zs) - reach - gz0) / STEP)); j1 = min(nz - 1, int((max(zs) + reach - gz0) / STEP) + 1)
        pinned = set()
        for j in range(j0, j1 + (not cells)):
            for i in range(i0, i1 + (not cells)):
                if not cells:
                    if min(poly_d(gx0 + i * STEP, gz0 + j * STEP, p) for p in polys) <= pad:
                        pinned.add((j, i))
                    continue
                cx, cz = gx0 + (i + 0.5) * STEP, gz0 + (j + 0.5) * STEP
                if min(poly_d(cx, cz, p) for p in polys) <= pad + half:
                    pinned.update(((j, i), (j, i + 1), (j + 1, i), (j + 1, i + 1)))
        pl = list(pinned)
        for j in range(j0, j1 + 1):
            for i in range(i0, i1 + 1):
                if (j, i) in pinned:
                    w = 1.0
                else:
                    d = min(math.hypot(i - b, j - a) for a, b in pl) * STEP
                    t = max(0.0, 1 - d / ramp); w = t * t * (3 - 2 * t)
                if w > W[j][i]:
                    W[j][i] = w; T[j][i] = target
        flat.append({'name': name, 'h': target})
        print('flatten %-14s -> %+.1f m (%d pinned posts)' % (name, target, len(pinned)))
    # ---- road cuts (data 'grade', kind cut): the 20 m DTM blurs a real cut into a
    # shallow valley 1-2.5 m deep and ~50 m wide. Fill it back up to the banks so
    # the streets beside the cut stay at grade; js/terrain.js then sinks the road
    # itself between vertical retaining walls (and js/map.js draws them).
    for g in data.get('grade', []):
        if g['kind'] != 'cut':
            continue
        n = cut_fill(g, bil, gx0, gz0, nx, nz, W, T)
        print('fill cut %-14s %d posts' % (g['name'], n))
    for j in range(nz):
        for i in range(nx):
            if W[j][i] > 0:
                h[j][i] = h[j][i] * (1 - W[j][i]) + T[j][i] * W[j][i]

    # ---- encode ----
    dm = [[int(round(v * 10)) for v in row] for row in h]
    for j in range(nz):  # pinned posts must stay exactly equal after rounding
        for i in range(nx):
            if W[j][i] == 1.0:
                dm[j][i] = int(round(T[j][i] * 10))
    r0, rows = [], []
    for row in dm:
        r0.append(row[0]); s = []
        for a, b in zip(row, row[1:]):
            d = b - a
            if abs(d) > 45:
                sys.exit('delta %d too large to encode' % d)
            s.append(chr(OFF + d))
        rows.append(''.join(s))
    flat_vals = [v / 10 for row in dm for v in row]
    out = {
        'source': '內政部 20公尺網格數值地形模型 (DTM) 分幅_桃園市DEM 圖幅 %s' % TILE,
        'license': '政府資料開放授權條款－第1版；標示「內政部」',
        'ref': REF, 'step': STEP, 'minX': gx0, 'minZ': gz0, 'nx': nx, 'nz': nz,
        'scale': 0.1, 'off': OFF, 'flat': flat, 'r0': r0, 'rows': rows,
    }
    with open(DST, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('grid %dx%d step %d, y %.1f..%.1f m (ref %.0f) -> %s (%d bytes)' % (
        nx, nz, STEP, min(flat_vals), max(flat_vals), REF, os.path.relpath(DST, ROOT), os.path.getsize(DST)))


if __name__ == '__main__':
    main()
