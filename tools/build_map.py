"""Convert raw OpenStreetMap data (tools/osm_raw.json) around Chung Yuan Christian
University into a compact game map (data/cycu.json).

Coordinates: metres, x = east, z = south, origin at ORIGIN (campus centre).
Map data (c) OpenStreetMap contributors, ODbL.

Usage: python3 tools/build_map.py

Refreshing the raw data
-----------------------
tools/osm_raw.json is the verbatim result of tools/overpass_query.overpassql
(bbox = BOUNDS below plus ~50 m). To re-download it:

    curl -s --data-urlencode data@tools/overpass_query.overpassql \
         https://overpass-api.de/api/interpreter -o tools/osm_raw.json
    python3 tools/build_map.py

Anything outside BOUNDS is dropped here, so the query may over-fetch.
tools/overrides.json holds hand-checked facts (floors/height) with a source URL
per entry; it wins over OSM tags and the height estimate.

Height model: floors first (building:levels > height > estimate by type/area),
then h = floors * 3.3 + 0.6. Neighbouring look-alike buildings share a seed so
a row of houses gets one height.
"""
import json, math, os, re, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm_raw.json')
OVR = os.path.join(HERE, 'overrides.json')
DST = os.path.join(HERE, '..', 'data', 'cycu.json')

LAT0, LON0 = 24.9580, 121.2425
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110574
# playable bounds (metres)
BOUNDS = dict(minX=-820, maxX=1000, minZ=-900, maxZ=740)
AREA_PAD = 60          # areas are clipped to BOUNDS grown by this
FLOOR_H, ROOF_H = 3.3, 0.6
NIGHT_MARKET_REL = 13287977   # 中原夜市 (amenity=marketplace)
CAMPUS_REL = 8286924

# Buildings the game replaces with hand-built geometry or keeps clear for
# landmarks / spawn / missions. (x0, z0, x1, z1) boxes in metres; any OSM
# building intersecting one is dropped unless it is listed in KEEP_NAMES
# (those are handled by name in js/main.js).
# Checked 2026-11 against mission points, spawn, 鐘塔, 舊校門, 噴水池, night market
# and the interiors' reserved footprints: no new OSM building overlaps them, so
# both lists are empty. Entry formats: ((x0, z0, x1, z1), 'reason'), 'w123': 'reason'.
KEEP_CLEAR = [
]
KEEP_NAMES = {'資訊管理學系', '警衛室', '學生活動中心'}
# OSM ids dropped on purpose: id -> reason
EXCLUDE = {
}


def proj(lat, lon):
    return [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]


def hrand(seed, a, b):
    h = int(hashlib.md5(str(seed).encode()).hexdigest()[:8], 16) / 0xffffffff
    return a + (b - a) * h


def parse_num(v):
    if v is None:
        return None
    m = re.match(r'\s*([0-9]+(?:\.[0-9]+)?)', str(v).replace(',', '.'))
    return float(m.group(1)) if m else None


def geom(e):
    return [proj(p['lat'], p['lon']) for p in e.get('geometry', []) if p]


def area(pts):
    s = 0
    for i in range(len(pts)):
        x1, z1 = pts[i]; x2, z2 = pts[(i + 1) % len(pts)]
        s += x1 * z2 - x2 * z1
    return s / 2


def centroid(pts):
    xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
    return [round(sum(xs) / len(xs), 1), round(sum(zs) / len(zs), 1)]


def poly_centroid(rings):
    """Area-weighted centroid of one or more (outer) rings."""
    sx = sz = sa = 0
    for pts in rings:
        if area(pts) < 0:  # same winding for every ring, or the sum cancels out
            pts = pts[::-1]
        for i in range(len(pts)):
            x1, z1 = pts[i]; x2, z2 = pts[(i + 1) % len(pts)]
            c = x1 * z2 - x2 * z1
            sa += c; sx += (x1 + x2) * c; sz += (z1 + z2) * c
    if abs(sa) < 1e-9:
        return centroid([p for r in rings for p in r])
    return [round(sx / (3 * sa), 1), round(sz / (3 * sa), 1)]


def closed(pts):
    if len(pts) > 2 and pts[0] == pts[-1]:
        return pts[:-1]
    return pts


def in_bounds(pts, pad=0):
    return any(BOUNDS['minX'] - pad <= x <= BOUNDS['maxX'] + pad and BOUNDS['minZ'] - pad <= z <= BOUNDS['maxZ'] + pad for x, z in pts)


def pt_in_bounds(x, z, pad=0):
    return BOUNDS['minX'] - pad <= x <= BOUNDS['maxX'] + pad and BOUNDS['minZ'] - pad <= z <= BOUNDS['maxZ'] + pad


def clip_rect(pts, pad):
    """Sutherland-Hodgman clip of a ring against BOUNDS grown by pad."""
    x0, x1 = BOUNDS['minX'] - pad, BOUNDS['maxX'] + pad
    z0, z1 = BOUNDS['minZ'] - pad, BOUNDS['maxZ'] + pad
    edges = [(0, x0, 1), (0, x1, -1), (1, z0, 1), (1, z1, -1)]
    out = pts
    for ax, v, sgn in edges:
        if not out:
            break
        src, out = out, []
        for i in range(len(src)):
            a, b = src[i - 1], src[i]
            ia, ib = (a[ax] - v) * sgn >= 0, (b[ax] - v) * sgn >= 0
            if ib:
                if not ia:
                    out.append(_cut(a, b, ax, v))
                out.append(b)
            elif ia:
                out.append(_cut(a, b, ax, v))
    res = []
    for p in out:
        p = [round(p[0], 1), round(p[1], 1)]
        if not res or res[-1] != p:
            res.append(p)
    if len(res) > 1 and res[0] == res[-1]:
        res.pop()
    return res


def _cut(a, b, ax, v):
    t = (v - a[ax]) / ((b[ax] - a[ax]) or 1e-12)
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]


def assemble_rings(ways):
    """Join member way polylines into closed rings."""
    segs = [w[:] for w in ways if len(w) > 1]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i); changed = True
                break
        rings.append(closed(ring))
    return rings


def rel_rings(e, role='outer'):
    ways = [[proj(p['lat'], p['lon']) for p in m['geometry'] if p] for m in e.get('members', [])
            if m['type'] == 'way' and (m.get('role') or 'outer') == role and m.get('geometry')]
    return [r for r in assemble_rings(ways) if len(r) > 2]


def elem_rings(e):
    if e['type'] == 'way':
        pts = geom(e)
        return [closed(pts)] if len(pts) > 3 and pts[0] == pts[-1] else []
    if e['type'] == 'relation' and e.get('tags', {}).get('type') == 'multipolygon':
        return rel_rings(e)
    return []


def elem_holes(e):
    """Inner rings of a multipolygon relation, wound clockwise (opposite to outers)."""
    if e['type'] != 'relation' or e.get('tags', {}).get('type') != 'multipolygon':
        return []
    return [r if area(r) < 0 else r[::-1] for r in rel_rings(e, 'inner')]


def holes_in(ring, holes):
    return [h for h in holes if point_in_poly(h[0][0], h[0][1], ring)]


def inset(pts, d):
    """Shrink a counter-clockwise ring by d metres (miter offset)."""
    n = len(pts); out = []
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        nn = []
        for p, q in ((a, b), (b, c)):
            dx, dz = q[0] - p[0], q[1] - p[1]; l = math.hypot(dx, dz) or 1
            nn.append((dz / l, -dx / l))
        mx, mz = nn[0][0] + nn[1][0], nn[0][1] + nn[1][1]
        k = max(0.3, 1 + nn[0][0] * nn[1][0] + nn[0][1] * nn[1][1])
        out.append([round(b[0] - d * mx / k, 2), round(b[1] - d * mz / k, 2)])
    return out


def osm_id(e):
    return e['type'][0] + str(e['id'])


ROAD_W = dict(primary=16, secondary=13, tertiary=10, unclassified=8, residential=7,
              living_street=5, service=5, pedestrian=4, footway=2.6, path=2.2,
              cycleway=2.4, steps=2.4, track=3)
DRIVABLE = {'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service'}

AREA_KIND = {
    ('leisure', 'park'): 'park', ('leisure', 'garden'): 'park', ('leisure', 'pitch'): 'pitch',
    ('leisure', 'track'): 'track', ('landuse', 'grass'): 'grass', ('natural', 'water'): 'water',
    ('landuse', 'residential'): 'residential', ('landuse', 'industrial'): 'industrial',
    ('landuse', 'construction'): 'construction', ('landuse', 'brownfield'): 'construction',
    ('amenity', 'parking'): 'parking', ('amenity', 'motorcycle_parking'): 'parking',
    ('amenity', 'school'): 'school', ('amenity', 'kindergarten'): 'school',
    ('landuse', 'religious'): 'park', ('natural', 'wood'): 'park', ('natural', 'scrub'): 'park',
    ('landuse', 'commercial'): 'commercial', ('amenity', 'marketplace'): 'commercial',
    ('amenity', 'fountain'): 'water', ('leisure', 'swimming_pool'): 'water', ('landuse', 'retail'): 'commercial',
}
# street furniture / point features kept for later stages: tag -> values
FURN = {
    'highway': {'street_lamp', 'traffic_signals', 'crossing', 'bus_stop', 'traffic_mirror', 'stop', 'give_way'},
    'barrier': None, 'power': None,
    'man_made': {'street_cabinet', 'utility_pole', 'water_tower', 'flagpole', 'mast', 'monitoring_station', 'surveillance'},
}
# extra building tags passed through (OSM key -> json key)
BTAGS = {'building:colour': 'colour', 'building:material': 'material', 'roof:shape': 'roof',
         'roof:colour': 'roofColour', 'roof:material': 'roofMaterial', 'roof:height': 'roofH'}


def building_kind(t):
    b = t.get('building', 'yes')
    if b == 'university' or t.get('amenity') == 'library':
        return 'campus'
    if b == 'dormitory':
        return 'dorm'
    if b in ('church',) or t.get('amenity') == 'place_of_worship':
        return 'church'
    if b in ('retail', 'commercial', 'industrial', 'warehouse'):
        return 'commercial'
    if b == 'guardhouse':
        return 'small'
    return 'town'


ONE_STOREY = {'roof', 'shed', 'garage', 'garages', 'carport', 'hut', 'kiosk', 'toilets', 'guardhouse', 'service', 'cabin'}


def floor_range(t, kind, a):
    """(class, lo, hi) floors for a building without levels/height."""
    b = t.get('building', 'yes')
    if kind == 'small' or b in ONE_STOREY:
        return 'one', 1, 1
    if b == 'apartments':
        return 'apt', 7, 14
    if b in ('house', 'detached', 'terrace', 'semidetached_house'):
        return 'house', 3, 4
    if b in ('industrial', 'warehouse'):
        return 'ind', 1, 2
    if kind == 'commercial':
        return 'shop', 2, 4
    if kind == 'church':
        return 'church', 2, 3
    if kind == 'dorm':
        return 'dorm', 5, 7
    if kind == 'campus':
        return ('campus-s', 2, 3) if a < 200 else ('campus', 3, 5)
    if a < 150:
        return 'house', 3, 4
    if a < 600:
        return 'mid', 4, 6
    if a < 1500:
        return 'big', 3, 5
    return 'huge', 2, 3


def tag_floors(t):
    """Floors from tags: (floors, source) or (None, None)."""
    lv = parse_num(t.get('building:levels'))
    h = parse_num(t.get('height'))
    if lv:
        return max(1, int(round(lv))), 'l'
    if h:
        return max(1, int(round((h - ROOF_H) / FLOOR_H))), 'h'
    return None, None


class DSU:
    def __init__(s, n): s.p = list(range(n))
    def find(s, i):
        while s.p[i] != i:
            s.p[i] = s.p[s.p[i]]; i = s.p[i]
        return i
    def union(s, a, b):
        a, b = s.find(a), s.find(b)
        if a != b: s.p[max(a, b)] = min(a, b)


def point_in_poly(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]; xj, zj = poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def poly_hits_box(pts, box):
    x0, z0, x1, z1 = box
    if any(x0 <= x <= x1 and z0 <= z <= z1 for x, z in pts):
        return True
    if any(point_in_poly(x, z, pts) for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1), ((x0 + x1) / 2, (z0 + z1) / 2))):
        return True
    return False


def load_overrides():
    if not os.path.exists(OVR):
        return []
    return json.load(open(OVR, encoding='utf8')).get('buildings', [])


def main():
    raw = json.load(open(SRC, encoding='utf8'))
    els = raw['elements']
    out = dict(origin=[LAT0, LON0], bounds=BOUNDS, buildings=[], roads=[], areas=[],
               waterways=[], rail=[], pois=[], campus=[], nightMarket=None,
               barriers=[], furniture=[], power=[], structures=[], streetAreas=[])
    stats = dict(excluded=[], warn=[])

    # campus outline
    for e in els:
        if e['type'] == 'relation' and e['id'] == CAMPUS_REL:
            out['campus'] = [r for r in rel_rings(e) if len(r) > 3]
    campus_ring = max(out['campus'], key=lambda r: abs(area(r))) if out['campus'] else []

    # ---- buildings: collect footprints first, heights are decided later ----
    blds, parts = [], []
    seen = set()
    for e in els:
        t = e.get('tags', {})
        if e['type'] not in ('way', 'relation') or (e['type'], e['id']) in seen:
            continue
        if 'building' not in t and 'building:part' not in t:
            continue
        seen.add((e['type'], e['id']))
        is_part = 'building' not in t
        holes = elem_holes(e)
        for pts in elem_rings(e):
            if len(pts) < 3:
                continue
            if area(pts) < 0:  # make counter-clockwise in x/z (consistent)
                pts = pts[::-1]
            c = poly_centroid([pts])
            if not pt_in_bounds(*c):
                continue
            hs = holes_in(pts, holes)
            rec = dict(e=e, t=t, pts=pts, c=c, a=abs(area(pts)) - sum(abs(area(h)) for h in hs), holes=hs)
            (parts if is_part else blds).append(rec)

    # building:part heights replace the parent's (parent = contains the part centroid)
    for p in parts:
        p['floors'], p['src'] = tag_floors(p['t'])
        for b in blds:
            if point_in_poly(p['c'][0], p['c'][1], b['pts']):
                b.setdefault('parts', []).append(p)
                break
    extra = []
    for b in blds:
        ps = [p for p in b.get('parts', []) if p['floors']]
        if not ps:
            continue
        cover = sum(p['a'] for p in ps) / max(b['a'], 1)
        big = max(ps, key=lambda p: p['a'])
        base = min(p['floors'] for p in ps)
        for p in ps:
            q = dict(p, t=dict(b['t'], **{k: v for k, v in p['t'].items() if k != 'building:part'}))
            if p is not big or cover < 0.85:
                q['t'].pop('name', None)
            q['part_of'] = b['e']
            if cover < 0.85:
                if p['floors'] <= base:
                    continue  # same height as the outline drawn below: nothing to add
                # taller part rises out of the outline; pull its walls in so
                # they don't share a plane with the outline's walls
                q['pts'] = inset(p['pts'], 0.12)
            extra.append(q)
        if cover >= 0.85:
            # parts tile the parent: draw only the parts
            b['drop'] = 'replaced by %d building:part' % len(ps)
        else:
            # partial parts: part heights replace the outline's own tags, the
            # outline becomes the base at the lowest part height
            b['floors_part'] = base
    blds = [b for b in blds if not b.get('drop')] + extra

    ovr = load_overrides()
    used_ovr = set()

    def find_ovr(b):
        oid, name = osm_id(b['e']), b['t'].get('name')
        for i, o in enumerate(ovr):
            if o.get('osm') == oid or (name and o.get('name') == name and not o.get('osm')):
                used_ovr.add(i)
                return o
        return None

    for b in blds:
        t = b['t']
        b['kind'] = building_kind(t)
        if b['kind'] == 'town' and campus_ring and point_in_poly(b['c'][0], b['c'][1], campus_ring):
            b['kind'] = 'campus'
        b['ovr'] = find_ovr(b)
        if b.get('floors_part'):
            b['floors'], b['src'] = b['floors_part'], 'p'
        elif b.get('part_of'):
            b['floors'], b['src'] = b['floors'], 'p'
        else:
            b['floors'], b['src'] = tag_floors(t)
        lv, h = parse_num(t.get('building:levels')), parse_num(t.get('height'))
        if lv and h and h / lv > 4.5:
            stats['warn'].append('%s %s: height %.1f / levels %g = %.1f m per floor (using levels)'
                                 % (osm_id(b['e']), t.get('name', '?'), h, lv, h / lv))

    # neighbours with similar footprints share one seed -> same height in a row
    est = [b for b in blds if not b['floors'] and not b['ovr']]
    for b in est:
        b['cls'], b['lo'], b['hi'] = floor_range(b['t'], b['kind'], b['a'])
    dsu = DSU(len(est))
    cell = {}
    for i, b in enumerate(est):
        cell.setdefault((int(b['c'][0] // 12), int(b['c'][1] // 12)), []).append(i)
    for i, b in enumerate(est):
        gx, gz = int(b['c'][0] // 12), int(b['c'][1] // 12)
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for j in cell.get((gx + dx, gz + dz), []):
                    if j <= i:
                        continue
                    o = est[j]
                    if o['cls'] != b['cls'] or math.dist(b['c'], o['c']) >= 12:
                        continue
                    if max(b['a'], o['a']) / max(min(b['a'], o['a']), 1) > 1.5:
                        continue
                    dsu.union(i, j)
    for i, b in enumerate(est):
        seed = est[dsu.find(i)]['e']['id']
        n = b['hi'] - b['lo'] + 1
        b['floors'] = b['lo'] + min(n - 1, int(hrand(seed, 0, n)))
        b['src'] = 'e'

    for b in blds:
        e, t, pts = b['e'], b['t'], b['pts']
        oid = osm_id(e)
        name = t.get('name')
        h = b['floors'] * FLOOR_H + ROOF_H
        o = b['ovr']
        if o:
            if o.get('floors'):
                b['floors'] = int(o['floors'])
            h = float(o['h']) if o.get('h') else b['floors'] * FLOOR_H + ROOF_H
            b['src'] = 'o'
        if oid in EXCLUDE:
            stats['excluded'].append('%s %s: %s' % (oid, name or '', EXCLUDE[oid]))
            continue
        hit = name not in KEEP_NAMES and next((k for k in KEEP_CLEAR if poly_hits_box(pts, k[0])), None)
        if hit:
            stats['excluded'].append('%s %s: overlaps %s' % (oid, name or '', hit[1]))
            continue
        rec = dict(pts=pts, h=round(h, 1), floors=b['floors'], kind=b['kind'], id=oid, src=b['src'])
        if b.get('holes'):
            rec['holes'] = b['holes']
        if name:
            rec['name'] = name
        for k, j in BTAGS.items():
            if t.get(k):
                rec[j] = parse_num(t[k]) if j == 'roofH' else t[k].strip()
        if rec.get('roofH') is None:
            rec.pop('roofH', None)
        out['buildings'].append(rec)
    for i, o in enumerate(ovr):
        if i not in used_ovr:
            stats['warn'].append('override not matched: %s' % (o.get('osm') or o.get('name')))

    # ---- everything else ----
    seen = set()
    for e in els:
        key = (e['type'], e['id'])
        if key in seen:
            continue
        seen.add(key)
        t = e.get('tags', {})
        name = t.get('name')

        if e['type'] == 'node':
            x, z = proj(e['lat'], e['lon'])
            if not pt_in_bounds(x, z):
                continue
            ft = None
            for k, vals in FURN.items():
                if k in t and (vals is None or t[k] in vals):
                    ft = t[k] if k != 'barrier' and k != 'power' else k + ':' + t[k]
                    break
            if ft:
                f = dict(x=x, z=z, t=ft)
                if ft == 'crossing' and t.get('crossing'):
                    f['c'] = t['crossing']
                if ft == 'bus_stop' and name:
                    f['name'] = name
                out['furniture'].append(f)
            if name:
                kind = (t.get('amenity') or t.get('shop') or t.get('leisure') or t.get('man_made')
                        or t.get('historic') or t.get('entrance') and 'gate' or t.get('barrier') or t.get('tourism')
                        or t.get('cuisine') and 'restaurant' or '')
                if t.get('railway') or t.get('power') or t.get('utility') or t.get('place') or t.get('highway') \
                        or t.get('public_transport'):
                    continue
                out['pois'].append(dict(name=name, x=x, z=z, kind=kind))
            continue

        if 'building' in t or 'building:part' in t:
            continue

        # polygon areas (way or multipolygon relation)
        kind = None
        for k in ('leisure', 'natural', 'landuse', 'amenity'):
            if (k, t.get(k)) in AREA_KIND:
                kind = AREA_KIND[(k, t.get(k))]
                break
        if kind:
            rings = elem_rings(e)
            holes = elem_holes(e)
            rings = [clip_rect(r, AREA_PAD) for r in rings if in_bounds(r, AREA_PAD)]
            rings = [r for r in rings if len(r) > 2 and abs(area(r)) > 1]
            holes = [clip_rect(r, AREA_PAD) for r in holes if in_bounds(r, AREA_PAD)]
            holes = [r for r in holes if len(r) > 2 and abs(area(r)) > 1]
            for r in rings:
                a = dict(pts=r, kind=kind)
                hs = holes_in(r, holes)
                if hs:
                    a['holes'] = hs
                if name:
                    a['name'] = name
                if e['type'] == 'relation':
                    a['rel'] = e['id']
                out['areas'].append(a)
                if kind == 'track':
                    # a running track's infield is a sports field, not track surface
                    for h in hs:
                        out['areas'].append(dict(pts=h[::-1], kind='pitch', infield=1))
            if rings and e['type'] == 'relation' and e['id'] == NIGHT_MARKET_REL:
                c = poly_centroid(rings)
                out['nightMarket'] = dict(x=c[0], z=c[1], osm='r%d' % e['id'])
            if rings and name:
                c = centroid(rings[0]) if e['type'] == 'way' else poly_centroid(rings)
                out['pois'].append(dict(name=name, x=c[0], z=c[1], kind='area:' + kind))
            if e['type'] == 'relation' or 'barrier' not in t:
                continue

        if e['type'] != 'way':
            continue
        pts = geom(e)
        if len(pts) < 2 or not in_bounds(pts, 50):
            continue

        hw = t.get('highway')
        if hw in ROAD_W:
            w = ROAD_W[hw]
            if hw == 'service' and not name:
                w = 4.2
            if t.get('area') == 'yes':
                continue
            r = dict(pts=pts, w=w, type=hw, nodes=e.get('nodes', []))
            if name:
                r['name'] = name
            if hw in DRIVABLE:
                r['drive'] = 1
            if t.get('oneway') == 'yes':
                r['oneway'] = 1
            if t.get('bridge') and t['bridge'] != 'no':
                r['bridge'] = 1
            if t.get('tunnel') and t['tunnel'] != 'no':
                r['tunnel'] = 1
            ly = parse_num(t.get('layer'))
            if t.get('layer') and ly:
                r['layer'] = int(-ly if t['layer'].strip().startswith('-') else ly)
            if parse_num(t.get('lanes')):
                r['lanes'] = int(parse_num(t['lanes']))
            if parse_num(t.get('width')):
                r['width'] = parse_num(t['width'])
            if t.get('surface'):
                r['surface'] = t['surface']
            if hw == 'service' and t.get('service'):
                r['service'] = t['service']
            # carriageway width from width= or lanes= (lanes count both ways
            # unless oneway); 3.3 m per lane plus a small shoulder
            if hw in DRIVABLE and t.get('area') != 'yes':
                if r.get('width') and 3 <= r['width'] <= 40:
                    r['w'] = round(r['width'], 1)
                elif r.get('lanes'):
                    r['w'] = round(max(4.2, r['lanes'] * 3.3 + (0.8 if r.get('oneway') else 1.4)), 1)
            out['roads'].append(r)
            continue

        if t.get('area:highway'):
            out['streetAreas'].append(dict(pts=closed(pts), type=t['area:highway']))
            continue

        if t.get('railway') in ('rail', 'light_rail', 'subway', 'construction'):
            if t.get('tunnel') == 'yes' or t.get('railway') != 'rail':
                continue
            rr = dict(pts=pts)
            if t.get('bridge') and t['bridge'] != 'no':
                rr['bridge'] = 1
            out['rail'].append(rr)
            continue

        if 'waterway' in t:
            ww = t['waterway']
            w = {'river': 14, 'stream': 4, 'drain': 3, 'canal': 6}.get(ww, 3)
            if t.get('tunnel') or t.get('layer', '0').startswith('-'):
                continue
            out['waterways'].append(dict(pts=pts, w=w))
            continue

        if t.get('barrier'):
            bar = dict(pts=pts, type=t['barrier'])
            if kind:
                bar['onArea'] = 1  # barrier tag on a landuse outline
            if t.get('height'):
                bar['h'] = parse_num(t['height'])
            out['barriers'].append(bar)
            continue

        if t.get('power') in ('line', 'minor_line', 'cable'):
            out['power'].append(dict(pts=pts, type=t['power']))
            continue

        if t.get('man_made') in ('bridge', 'pier', 'embankment', 'water_tower'):
            out['structures'].append(dict(pts=pts, type=t['man_made']))
            continue

    # sort areas so big/background ones draw first
    order = {'residential': 0, 'industrial': 0, 'commercial': 0, 'construction': 1, 'school': 1,
             'parking': 2, 'park': 3, 'grass': 4, 'pitch': 5, 'track': 5, 'water': 6}
    out['areas'].sort(key=lambda a: (order.get(a['kind'], 3), -abs(area(a['pts']))))

    if not out['nightMarket']:
        stats['warn'].append('night market relation %d missing' % NIGHT_MARKET_REL)

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    src = {}
    for b in out['buildings']:
        src[b['src']] = src.get(b['src'], 0) + 1
    print('buildings', len(out['buildings']), 'floors from', src, 'roads', len(out['roads']), 'areas', len(out['areas']),
          'water', len(out['waterways']), 'rail', len(out['rail']), 'pois', len(out['pois']),
          'furniture', len(out['furniture']), 'barriers', len(out['barriers']), 'power', len(out['power']),
          'campus rings', len(out['campus']), 'size', os.path.getsize(DST))
    print('night market', out['nightMarket'])
    for s in stats['excluded']:
        print('excluded', s)
    for s in stats['warn']:
        print('WARN', s)


if __name__ == '__main__':
    main()
