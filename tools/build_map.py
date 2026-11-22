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
tools/overrides.json holds hand-checked facts with a source URL per entry; it
wins over OSM tags and the height estimate. Building entries may set floors, h,
colour, material, roof, roofColour, facade (window style), feature (list of
named extras drawn by js/map.js) and split (cut one footprint into blocks of
different heights). The 'landmarks' section describes the hand-built landmarks
in js/map.js and is copied to cycu.json without its source/note fields.

tools/looks.json holds per-building facade looks for the campus (wall finish and
colour, window type per storey, bands, plinth, fins, canopies, roof extras; see its
_doc), keyed by OSM id, each entry with its own source and confidence. Its 'look'
object is copied to the building as 'look' (js/map.js reads it); 'noShop' is
copied as a plain field. Entries with 'skip' (a reason) are survey data only and
are not merged. Kept apart from overrides.json so looks and sizes can
be edited independently.

tools/block_survey.json (地圖寫實化 7) classifies the blank blocks OSM leaves
empty (by eye, Google 街景 / 衛星; text only). fill_blocks() turns each block's
'plan' into deterministic synthetic buildings / ground / 鐵皮圍籬 marked
synthetic=1 -- generated, not real footprints. Round 2 (地圖寫實化 8, 'blocks2')
does the same for the blanks still left after round 1.

Height model: floors first (building:levels > height > estimate by type/area),
then h = floors * 3.3 + 0.6. Neighbouring look-alike buildings share a seed so
a row of houses gets one height.
"""
import json, math, os, re, hashlib, random

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm_raw.json')
OVR = os.path.join(HERE, 'overrides.json')
LOOKS = os.path.join(HERE, 'looks.json')
WATER = os.path.join(HERE, 'water.json')
ROADS = os.path.join(HERE, 'roads.json')
WAY_OF = {}   # id(road dict) -> OSM way id (tools/roads.json is keyed by way)
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
        return {}
    return json.load(open(OVR, encoding='utf8'))


def build_levels(sites):
    """overrides.json 'levels' (see levels_doc there) -> data 'levels': pads,
    stairs and floors in game x/z for js/terrain.js + js/map.js, sinks for
    tools/build_terrain.py. Heights pass through unchanged."""
    out = dict(pads=[], stairs=[], floors=[], sinks=[])
    for site in sites:
        (ox, oz), (dx, dz) = site['frame']['o'], site['frame']['u']
        l = math.hypot(dx, dz); ux, uz = dx / l, dz / l
        w = lambda p: [round(ox + p[0] * ux - p[1] * uz, 2), round(oz + p[0] * uz + p[1] * ux, 2)]
        name = site['name']
        if 'sink' in site:
            s0, s1, t0, t1 = site['sink']['rect']
            out['sinks'].append(dict(name=name, pts=[w((s0, t0)), w((s1, t0)), w((s1, t1)), w((s0, t1))],
                                     y=site['sink']['y'], ramp=site['sink'].get('ramp', 10)))
        for f in site.get('floors', []):
            out['floors'].append(dict(site=name, pts=[w(p) for p in f['pts']], tint=f.get('tint', '#ffffff')))
        for p in site.get('pads', []):
            out['pads'].append(dict({k: v for k, v in p.items() if k != 'pts'}, site=name, pts=[w(q) for q in p['pts']]))
        for st in site.get('stairs', []):
            out['stairs'].append(dict({k: v for k, v in st.items() if k not in ('a', 'b')}, site=name, a=w(st['a']), b=w(st['b'])))
    return out


def load_looks():
    """tools/looks.json buildings: {osm id: {name, source, confidence, look, noShop?}}."""
    if not os.path.exists(LOOKS):
        return {}
    out = json.load(open(LOOKS, encoding='utf8')).get('buildings', {})
    for oid, e in out.items():
        if not e.get('source') or not e.get('confidence'):
            raise SystemExit('looks.json %s (%s): every entry needs source and confidence' % (oid, e.get('name')))
    return out


MARK_CENTRE = ('double-yellow', 'yellow', 'yellow-dash', 'white-dash', 'none', 'median', 'pair', 'pair-other')
MARK_FEATURES = ('box', 'zebra', 'stop', 'bikebox', 'arrow', 'nozebra')


def apply_marks(out, stats):
    """tools/roads.json 'marks' and 'features' (see its _doc): the painted markings of a street as
    the NLSC 2024 orthophoto shows them. 'marks' sets r['marks'] = {centre, edge, lanes} on that OSM
    way (js/map.js draws it instead of the class defaults); 'features' (網狀黃線, 斑馬線, 停止線,
    機車停等區, lane arrows at their surveyed spots) go to out['roadMarks'] as they are."""
    if not os.path.exists(ROADS):
        return
    R = json.load(open(ROADS, encoding='utf8'))
    by = {WAY_OF.get(id(r)): r for r in out['roads']}
    n = 0
    for e in R.get('marks', []):
        if not e.get('source') or not e.get('confidence') or e.get('centre') not in MARK_CENTRE:
            raise SystemExit('roads.json marks way %s: needs source, confidence and a centre in %s' % (e.get('way'), MARK_CENTRE))
        r = by.get(e['way'])
        if r is None:
            stats['warn'].append('roads.json marks way %s (%s): not in the map' % (e['way'], e.get('name', '')))
            continue
        r['marks'] = {k: e[k] for k in ('centre', 'edge', 'lanes', 'walk', 'cv', 'ev', 'inner', 'segs') if k in e}
        n += 1
    feats = []
    for f in R.get('features', []):
        if f.get('t') not in MARK_FEATURES or not f.get('source'):
            raise SystemExit('roads.json feature %s: needs t in %s and a source' % (f, MARK_FEATURES))
        feats.append({k: f[k] for k in ('t', 'x', 'z', 'ang', 'len', 'w', 'way', 'osm') if k in f})
    out['roadMarks'] = feats
    print('roads.json: %d ways marked, %d painted features' % (n, len(feats)))


def shift_roads(out, items, by, real, stats, st, final_w={}):
    """tools/roads.json 'shift' (see its _doc): move an OSM way sideways onto the carriageway the
    orthophoto shows. Each entry gives anchors [x, z, v] near the way: at the anchor's place along
    the way its line moves v metres along (-uz, ux) of the way's direction (+ = the top of an
    _survey/xsec.py cut). Between anchors v is interpolated along the way; past the first / last
    anchor it holds for HOLD m, then eases back to 0 over another HOLD m. A node shared with other
    ways moves in all of them (as overrides.json grade 'move' does). Returns the roads whose line
    changed; each keeps its OSM line in r['osm'] and gets r['sh'] = 1 (js/map.js lays trees, lamps
    and shop fronts out on the OSM line, then moves the spots the moved road now covers)."""
    HOLD = 40.0
    moved = {}   # node id -> [sum x, sum z, n]
    pre = {}     # id(r) -> its OSM line before the extra vertices (r['osm'] keeps that one)
    own = {}     # id(r) -> (r, {index: [x, z]}) for ways without a node list
    for e in items:
        if not e.get('source') or not e.get('confidence') or not e.get('at'):
            raise SystemExit('roads.json shift way %s: needs at, source and confidence' % e.get('way'))
        r = by.get(e['way'])
        if r is None:
            stats['warn'].append('roads.json shift way %s: not in the map' % e['way'])
            continue
        if r.get('grade') or r.get('bridge') or r.get('tunnel') or 'osm' in r:
            stats['warn'].append('roads.json shift way %s: on / moved by a grade separation, skipped' % e['way'])
            continue
        P = r['pts']
        S = [0.0]
        for a, b in zip(P, P[1:]):
            S.append(S[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        A = []
        for x, z, v in e['at']:
            best = None
            for i, (a, b) in enumerate(zip(P, P[1:])):
                dx, dz = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dz * dz or 1
                t = max(0, min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2))
                d = math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)
                if best is None or d < best[0]:
                    best = (d, S[i] + t * math.sqrt(l2))
            if best[0] > r['w'] / 2 + 6:
                stats['warn'].append('roads.json shift way %s: anchor (%s, %s) is %.1f m off the way' % (e['way'], x, z, best[0]))
            A.append((best[1], v))
        A.sort()
        # extra vertices where v changes slope (anchors, end of hold, end of ease) so the line follows
        # the anchors and not only the OSM nodes; they get their own (negative) node ids
        cuts = sorted({a for a, _ in A} | {A[0][0] - HOLD, A[0][0] - 2 * HOLD, A[-1][0] + HOLD, A[-1][0] + 2 * HOLD})
        nodes = r.get('nodes') or []
        NP, NN, NS = [P[0]], [nodes[0]] if len(nodes) == len(P) else None, [0.0]
        k = 0
        for i in range(1, len(P)):
            for c in cuts:
                if S[i - 1] + 3 < c < S[i] - 3:
                    t = (c - S[i - 1]) / (S[i] - S[i - 1])
                    NP.append([round(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, 1), round(P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, 1)])
                    NS.append(c)
                    if NN is not None:
                        k += 1; NN.append(-(e['way'] * 100 + k))
            NP.append(P[i]); NS.append(S[i])
            if NN is not None:
                NN.append(nodes[i])
        if len(NP) != len(P):
            pre[id(r)] = ([list(p) for p in P], list(nodes))
            r['pts'] = P = NP; S = NS
            if NN is not None:
                r['nodes'] = NN

        def v_at(s):
            if s <= A[0][0]:
                k = A[0][0] - s; return A[0][1] * (1 if k <= HOLD else max(0, 1 - (k - HOLD) / HOLD))
            if s >= A[-1][0]:
                k = s - A[-1][0]; return A[-1][1] * (1 if k <= HOLD else max(0, 1 - (k - HOLD) / HOLD))
            for (s0, v0), (s1, v1) in zip(A, A[1:]):
                if s0 <= s <= s1:
                    return v0 + (v1 - v0) * (s - s0) / ((s1 - s0) or 1)
        nodes = r.get('nodes') or []
        for i, p in enumerate(P):
            v = v_at(S[i])
            if abs(v) < 0.05:
                continue
            nx = nz = 0.0
            for j, k in ((i - 1, i), (i, i + 1)):
                if 0 <= j and k < len(P):
                    dx, dz = P[k][0] - P[j][0], P[k][1] - P[j][1]; l = math.hypot(dx, dz) or 1
                    nx += -dz / l; nz += dx / l
            l = math.hypot(nx, nz) or 1
            q = [p[0] + nx / l * v, p[1] + nz / l * v]
            if len(nodes) == len(P):
                m = moved.setdefault(nodes[i], [0.0, 0.0, 0])
                m[0] += q[0]; m[1] += q[1]; m[2] += 1
            else:
                own.setdefault(id(r), (r, {}))[1][i] = q
        r['sh'] = 1
        st['shifted'] += 1
    changed = []
    for r in out['roads']:
        new = None
        for i, n in enumerate(r.get('nodes') or []):
            if n in moved and i < len(r['pts']) and len(r['nodes']) == len(r['pts']):
                m = moved[n]
                new = new or [list(p) for p in r['pts']]
                new[i] = [round(m[0] / m[2], 1), round(m[1] / m[2], 1)]
        if id(r) in own:
            new = new or [list(p) for p in r['pts']]
            for i, q in own[id(r)][1].items():
                new[i] = [round(q[0], 1), round(q[1], 1)]
        if new is None or new == r['pts']:
            if id(r) in pre:   # nothing moved after all: back to the OSM vertices
                r['pts'], nn = pre[id(r)]
                if nn:
                    r['nodes'] = nn
            continue
        if r.get('grade') or 'osm' in r:
            stats['warn'].append('roads.json shift: node shared with grade-separated way %s left alone' % WAY_OF.get(id(r)))
            continue
        # an OSM building / wall the old carriageway was clear of and the moved one runs into
        # (at the width roads.json 'ways' narrows it to afterwards, when that is narrower than OSM's)
        hw = min(r['w'], final_w.get(WAY_OF.get(id(r)), r['w'])) / 2
        for a0, b0, a, b in zip(r['pts'], r['pts'][1:], new, new[1:]):
            for kind, Pb in real.query(bbox_of([a, b], hw + 1)):
                d1 = poly_seg_dist(Pb, a, b) if kind == 'b' else seg_seg(Pb[0], Pb[1], a, b)
                d0 = poly_seg_dist(Pb, a0, b0) if kind == 'b' else seg_seg(Pb[0], Pb[1], a0, b0)
                if d1 < hw - 0.3 and d0 >= hw - 0.3 and kind == 'b':   # (walls / hedges: push_barriers)
                    stats['warn'].append('roads.json shift way %s: now %.1f m into an OSM %s near (%.0f, %.0f)' % (
                        WAY_OF.get(id(r)), hw - d1, 'building' if kind == 'b' else 'wall', a[0], a[1]))
        r['osm'] = {'w': r['w'], 'pts': pre[id(r)][0] if id(r) in pre else [list(p) for p in r['pts']]}
        r['pts'] = new
        r['sh'] = 1
        changed.append(r)
    return changed


def push_barriers(out, moved, stats, st):
    """An OSM wall / hedge running along a shifted road (shift_roads) that the new carriageway now
    covers or comes within its draw margin of (and that did not stand in the old one) moves
    sideways to just past the new kerb, so js/furniture.js (which drops the stretches within
    0.3 m + half its thickness of a carriageway) still draws it; e.g. a median hedge OSM traced
    along one kerb of the median. Only the 2 m steps near the road move (at most 2.5 m); the rest
    of the barrier keeps its OSM vertices. Run after the widths are final."""
    if not moved:
        return
    segs = Grid(20)
    for r in moved:
        for a, b in zip(r['pts'], r['pts'][1:]):
            segs.add(bbox_of([a, b], r['w'] / 2 + 2), (r, a, b))

    def near(x, z, P_of):
        best = None
        for r, _, _ in segs.query((x - 0.1, z - 0.1, x + 0.1, z + 0.1)):
            P = P_of(r)
            for a, b in zip(P, P[1:]):
                d = pt_seg(x, z, a[0], a[1], b[0], b[1]) - r['w'] / 2
                if best is None or d < best[0]:
                    best = (d, r, a, b)
        return best

    def foot(x, z, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2))
        return a[0] + dx * t, a[1] + dz * t

    for br in out['barriers']:
        if br.get('synthetic') or br.get('onArea') or br['type'] not in ('wall', 'hedge', 'sheet_fence'):
            continue
        pad = 0.3 + (0.8 if br['type'] == 'hedge' else 0.08 if br['type'] == 'sheet_fence' else 0.2) / 2 + 0.15
        P = br['pts']
        new, hit, most = [list(P[0])], False, 0.0
        for p, q in zip(P, P[1:]):
            L = math.hypot(q[0] - p[0], q[1] - p[1])
            n = max(1, int(math.ceil(L / 2)))
            pts = [[p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n] for k in range(n + 1)]
            out_pts, seg_hit = [], False
            for x, z in pts:
                b1 = near(x, z, lambda r: r['pts'])
                if b1 is None or b1[0] >= pad:
                    out_pts.append([x, z]); continue
                b0 = near(x, z, lambda r: r['osm']['pts'])
                if b0 is None or b0[0] < -0.5 or b1[0] > b0[0] - 0.3:   # it stood in the old carriageway
                    out_pts.append([x, z]); continue                       # already / the shift barely nears it
                _, r, a, b = b1
                dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1
                if abs(dx * (q[0] - p[0]) + dz * (q[1] - p[1])) < 0.9 * l * L:   # only along the road, not across it
                    out_pts.append([x, z]); continue
                fx, fz = foot(x, z, a, b)
                ox, oz = foot(x, z, b0[2], b0[3])
                sx, sz = x - ox, z - oz   # the side of the old line the barrier is on
                nx, nz = -dz / l, dx / l
                if nx * sx + nz * sz < 0:
                    nx, nz = -nx, -nz
                hw = r['w'] / 2 + pad
                nxp, nzp = fx + nx * hw, fz + nz * hw
                k = math.hypot(nxp - x, nzp - z)
                if k > 2.5 or k < 0.05:   # (> 2.5: a junction mouth, not a kerb that moved past it)
                    out_pts.append([x, z]); continue
                most = max(most, k)
                out_pts.append([nxp, nzp]); seg_hit = True
            if seg_hit:
                hit = True
                new[-1] = out_pts[0]
                new.extend(out_pts[1:])
            else:
                new.append(list(q))
        if hit:
            br['pts'] = [[round(x, 2), round(z, 2)] for x, z in new]
            st['pushed'] += 1
            st.setdefault('pushlog', []).append('%s (%.0f, %.0f)-(%.0f, %.0f) up to %.1f m' % (
                br['type'], P[0][0], P[0][1], P[-1][0], P[-1][1], most))


def apply_roads(out, stats):
    """tools/roads.json (see its _doc): measured carriageway widths by OSM way.

    Roads on a bridge / tunnel / grade separation keep the grade's width. A road
    only widens as far as the OSM buildings and walls beside it allow (its kerb,
    or the back of the sidewalk on primary..tertiary, stays clear of them); the
    補建 (synthetic) houses, ground and fences the block fill laid along the old
    kerb are cut back behind the new one instead (ones left too small are
    skipped: they draw from their own random streams). Every road changed here
    keeps its OSM width / line in r['osm'] (as build_grade does), so js/map.js
    lays the trees and lamps out as before and moves the ones the wider road takes."""
    if not os.path.exists(ROADS):
        return
    R = json.load(open(ROADS, encoding='utf8'))
    by = {WAY_OF.get(id(r)): r for r in out['roads']}
    real = Grid(20)
    for bd in out['buildings']:
        if not bd.get('synthetic'):
            real.add(bbox_of(bd['pts']), ('b', bd['pts']))
    for br in out['barriers']:
        if not br.get('synthetic'):
            for p, q in zip(br['pts'], br['pts'][1:]):
                real.add(bbox_of([p, q]), ('w', [p, q]))
    st = dict(n=0, capped=[], cut=0, skipped=0, areas=0, fences=0, shifted=0, pushed=0)
    grown = []
    orig = shift_roads(out, R.get('shift', []), by, real, stats, st, {e['way']: e['w'] for e in R['ways']})
    for r in orig:
        side = SIDEWALK if r['type'] in ('primary', 'secondary', 'tertiary') and not (r.get('name') or '').startswith('中北路') else 0.3
        grown.append((r, r['w'] / 2 + (side if side > 0.3 else 1.1)))
    for e in R['ways']:
        if not e.get('source') or not e.get('confidence'):
            raise SystemExit('roads.json way %s: every entry needs source and confidence' % e['way'])
        r = by.get(e['way'])
        if r is None:
            stats['warn'].append('roads.json way %s (%s): not in the map' % (e['way'], e.get('name', '')))
            continue
        if r.get('grade') or r.get('bridge') or r.get('tunnel') or ('osm' in r and not r.get('sh')):
            stats['warn'].append('roads.json way %s: on / moved by a grade separation, skipped' % e['way'])
            continue
        if abs(r['w'] - e['was']) > 0.05:
            stats['warn'].append('roads.json way %s: width from OSM is %s, survey saw %s' % (e['way'], r['w'], e['was']))
        side = SIDEWALK if r['type'] in ('primary', 'secondary', 'tertiary') and not (r.get('name') or '').startswith('中北路') else 0.3
        w = e['w']
        if w > r['w']:
            # the nearest OSM building / wall that the old road was clear of
            room = 1e9
            for a, b in zip(r['pts'], r['pts'][1:]):
                for kind, P in real.query(bbox_of([a, b], w / 2 + side + 1)):
                    dd = poly_seg_dist(P, a, b) if kind == 'b' else seg_seg(P[0], P[1], a, b)
                    if dd >= r['w'] / 2 + (side if kind == 'b' else 0) - 0.05:
                        room = min(room, dd - (side if kind == 'b' else 0.2))
            if room < w / 2:
                cap = max(r['w'], math.floor(room * 2 * 2) / 2)
                st['capped'].append('%s %s %.1f->%.1f' % (e['way'], e.get('name', ''), w, cap))
                w = cap
        if abs(w - r['w']) < 0.05:
            continue
        if 'osm' not in r:   # (a shifted road already keeps its OSM line there)
            r['osm'] = {'w': r['w'], 'pts': [list(p) for p in r['pts']]}
        r['rw'] = 1   # width from roads.json (js/map.js: the OSM width stays in r.osm.w)
        if w > r['w']:
            grown = [g for g in grown if g[0] is not r]
            grown.append((r, w / 2 + (side if side > 0.3 else 1.1)))
        r['w'] = w
        if e.get('lanes'):
            r['lanes'] = e['lanes']
        st['n'] += 1

    # 補建 houses / ground / fences behind the new kerbs
    def cut_back(P, closed=True):
        """clip ring P off every grown road strip; None when nothing is left"""
        hit = False
        for r, half in grown:
            for a, b in zip(r['pts'], r['pts'][1:]):
                L = math.hypot(b[0] - a[0], b[1] - a[1])
                if L < 0.5 or not P:
                    continue
                if poly_seg_dist(P, a, b) >= half - 0.01:
                    continue
                ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
                cx = sum(p[0] for p in P) / len(P); cz = sum(p[1] for p in P) / len(P)
                t = (cx - a[0]) * ux + (cz - a[1]) * uz
                if t < -half or t > L + half:
                    continue   # beyond this segment's end: the next segment / the junction decides
                sd = 1 if (cx - a[0]) * -uz + (cz - a[1]) * ux > 0 else -1   # left of a->b = +
                nx, nz = -uz * sd * half, ux * sd * half
                p0, q0 = [a[0] + nx - ux * 50, a[1] + nz - uz * 50], [b[0] + nx + ux * 50, b[1] + nz + uz * 50]
                P = clip_half(P, p0, q0, sd) if closed else P
                hit = True
                if len(P) < 3:
                    return None, True
        return P, hit

    for bd in out['buildings']:
        if not bd.get('synthetic') or bd.get('skip'):
            continue
        P, hit = cut_back(bd['pts'])
        if not hit:
            continue
        if P is None or area(P) < 20 or min(max(p[i] for p in P) - min(p[i] for p in P) for i in (0, 1)) < 3:
            bd['skip'] = 1; st['skipped'] += 1
        else:
            bd['pre'] = bd['pts']; bd['pts'] = P; st['cut'] += 1
    # cut ground keeps its old ring in 'pre': js/map.js lays the 補建 woods' / lawns' trees
    # out on it (one random stream for all of them), and a wood / lawn left with nothing stays
    # in the list as 'gone' so the ones after it keep their draws
    for ar in out['areas']:
        if not ar.get('synthetic'):
            continue
        P, hit = cut_back(ar['pts'])
        if hit:
            pre = ar['pts']
            if P is None or area(P) < 4:
                if ar['kind'] in ('wood', 'grass'):
                    ar['gone'] = 1
                ar['pts'] = []
            else:
                ar['pts'] = P
            ar['pre'] = pre
            st['areas'] += 1
    out['areas'] = [ar for ar in out['areas'] if ar['pts'] or ar.get('gone')]
    keep = []
    for br in out['barriers']:
        if not br.get('synthetic'):
            keep.append(br); continue
        parts, cur = [], []
        for p, q in zip(br['pts'], br['pts'][1:]):
            near = any(seg_seg(p, q, a, b) < half for r, half in grown for a, b in zip(r['pts'], r['pts'][1:]))
            if near:
                if len(cur) > 1:
                    parts.append(cur)
                cur = []
                st['fences'] += 1
            else:
                if not cur:
                    cur = [p]
                cur.append(q)
        if len(cur) > 1:
            parts.append(cur)
        if len(parts) == 1 and len(parts[0]) == len(br['pts']):
            keep.append(br)
        else:
            for pp in parts:
                nb = dict(br); nb['pts'] = pp; keep.append(nb)
    out['barriers'] = keep
    push_barriers(out, orig, stats, st)
    stats['roads'] = st


def apply_water(out, stats):
    """tools/water.json (see its _doc): fix water areas (kind / outline) and attach
    'sink' (sunk water, banks, railings for js/map.js) to areas and waterway segments.
    Runs after the block fill and grade so neither moves."""
    if not os.path.exists(WATER):
        return
    W = json.load(open(WATER, encoding='utf8'))
    for e in W.get('areas', []) + W.get('ways', []):
        if not e.get('source') or not e.get('confidence'):
            raise SystemExit('water.json %s: every entry needs source and confidence' % (e.get('name') or e.get('near') or e.get('along')))
    for e in W.get('areas', []):
        best, bd = None, 25.0
        for a in out['areas']:
            if a['kind'] != 'water' or a.get('synthetic') or ('name' in e and a.get('name') != e['name']):
                continue
            n = len(a['pts'])  # vertex mean (what the survey quoted)
            d = math.hypot(sum(p[0] for p in a['pts']) / n - e['near'][0], sum(p[1] for p in a['pts']) / n - e['near'][1])
            if d < bd:
                best, bd = a, d
        if best is None:
            stats['warn'].append('water.json area not matched: %s %s' % (e.get('name', ''), e['near']))
            continue
        if 'pts' in e:
            best['pts'] = [[float(x), float(z)] for x, z in e['pts']]
        if 'kind' in e:
            best['kind'] = e['kind']
            best['was'] = 'water'  # trees keep off it as before (js/map.js), so no other tree moves
        if 'sink' in e:
            best['sink'] = e['sink']

    def seg_d(px, pz, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dz * dz or 1
        t = max(0.0, min(1.0, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2))
        return math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t)

    def spec_at(px, pz):
        best, bd = None, 25.0
        for e in W.get('ways', []):
            L = e['along']
            d = min(seg_d(px, pz, L[i], L[i + 1]) for i in range(len(L) - 1))
            if d < bd:
                best, bd = e, d
        return best

    KEYS = ('w', 'top', 'drop', 'bank', 'mat', 'rail')
    ways, n_cov = [], 0
    for w in out['waterways']:
        run = None  # consecutive segments with the same spec become one waterway
        for a, b in zip(w['pts'], w['pts'][1:]):
            e = spec_at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) if w['w'] < 10 else None  # rivers are not in the survey
            if e is not None and e.get('covered'):
                run = None; n_cov += 1
                continue
            if run is None or run[0] is not e:
                nw = dict(pts=[a, b], w=w['w'])
                if e is not None:
                    nw['w'] = e['w']
                    nw['sink'] = {k: e[k] for k in KEYS if k in e and k != 'w'}
                ways.append(nw); run = (e, nw)
            else:
                run[1]['pts'].append(b)
    out['waterways'] = ways
    stats['water'] = '%d sunk areas, %d sunk waterways, %d covered segments dropped' % (
        sum(1 for a in out['areas'] if a.get('sink')), sum(1 for w in ways if w.get('sink')), n_cov)


def path_proj(path, x, z):
    """(s, signed offset, inside) of a point against a polyline: s = distance
    along it, offset > 0 left of it (x/z cross product); beyond either end s
    and offset continue along the extended end segment and inside is False."""
    best, acc, last = None, 0.0, len(path) - 2
    for i, (a, b) in enumerate(zip(path, path[1:])):
        dx, dz = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dz)
        t0 = ((x - a[0]) * dx + (z - a[1]) * dz) / (l * l)
        t = min(1.0, max(0.0, t0))
        d = math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)
        if best is None or d < best[0]:
            out = (i == 0 and t0 < 0) or (i == last and t0 > 1)
            cross = dx * (z - a[1]) - dz * (x - a[0])
            off = cross / l if out else math.copysign(d, cross)
            best = (d, acc + l * (t0 if out else t), off, not out)
        acc += l
    return best[1:]


def path_at(path, s):
    """point and unit direction at distance s along a polyline (extended past its ends)"""
    acc, last = 0.0, len(path) - 2
    for i, (a, b) in enumerate(zip(path, path[1:])):
        l = math.hypot(b[0] - a[0], b[1] - a[1])
        if s <= acc + l or i == last:
            t = (s - acc) / l
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), ((b[0] - a[0]) / l, (b[1] - a[1]) / l)
        acc += l


def prof_at(prof, s):
    """[s, v] anchors joined linearly; the ends hold their value"""
    if s <= prof[0][0]:
        return prof[0][1]
    for (s0, v0), (s1, v1) in zip(prof, prof[1:]):
        if s <= s1:
            return v0 + (v1 - v0) * (s - s0) / ((s1 - s0) or 1)
    return prof[-1][1]


def build_grade(out, items, stats):
    """overrides.json 'grade' -> data 'grade' (see grade_doc there).

    Tags the matched roads (r['grade'] = id, width = item w), applies the node
    moves, pushes nearby roads clear of the deck / cut (never into a building),
    and turns the [x, z, v] anchors into [s, v] along the path. A tunnel way of
    a cut sets its roof span; other tunnel ways alongside the cut get
    r['beside'] = id (no portals of their own). Every road changed here keeps
    its OSM geometry in r['osm'] = {w, pts}: js/map.js lays the trees out on it,
    so the shared random streams are drawn as without this step."""
    res = []
    orig = [(r['w'], [list(p) for p in r['pts']]) for r in out['roads']]
    for it in items:
        path = it['path']
        # hand corrections of single OSM nodes (shared nodes move in every way)
        mv = {int(k): v for k, v in it.get('move', {}).items()}
        if mv:
            for r in out['roads']:
                for i, n in enumerate(r.get('nodes') or []):
                    if n in mv and i < len(r['pts']):
                        r['pts'][i] = list(mv[n])
        mine = []
        for r in out['roads']:
            if r.get('name' if 'road' in it else 'type') != it.get('road', it.get('type')):
                continue
            if it['kind'] != 'cut' and not r.get('bridge'):
                continue
            if all(abs(path_proj(path, *p)[1]) < 1.5 for p in r['pts']):
                r['grade'] = it['id']
                r['w'] = it['w']
                mine.append(r)
        if not mine:
            stats['warn'].append('grade %s: no road matched' % it['id'])
            continue
        prof = sorted([round(path_proj(path, x, z)[0], 1), v] for x, z, v in it['prof'])
        g = dict(id=it['id'], kind=it['kind'], name=it['name'], path=path, w=it['w'], prof=prof)
        if it.get('clearance'):
            g['clearance'] = it['clearance']
        tun = [path_proj(path, *p)[0] for r in mine if r.get('tunnel') for p in r['pts']]
        if tun:
            g['roof'] = [round(min(tun), 1), round(max(tun), 1)]
        # push the other roads' nodes out of the deck / cut
        c = it.get('clear')
        moved = {}
        if c:
            m0, m1 = c['margin'] if isinstance(c.get('margin'), list) else [c.get('margin', 0)] * 2
            below = c.get('below', 1e9)

            def need(s):  # deck / cut within the margins and lower than 'below'
                return any(0 < prof_at(prof, s + k) < below for k in range(-int(m1), int(m0) + 1))
            own = {n for r in mine for n in r.get('nodes') or []}
            for r in out['roads']:
                if r in mine or not r.get('nodes') or len(r['nodes']) != len(r['pts']):
                    continue
                w = c.get('narrow', {}).get(r['type'], r['w'])
                for i, (n, p) in enumerate(zip(r['nodes'], r['pts'])):
                    if n in own or n in moved:
                        continue
                    s, off, inside = path_proj(path, *p)
                    if abs(off) < c['d'] and need(s):
                        q, (ux, uz) = path_at(path, s)
                        nb = [r['pts'][j] for j in (i - 1, i + 1) if 0 <= j < len(r['pts'])]
                        # out to d on its own side (left of the path = (-uz, ux)), less where
                        # the road would run into a building it was clear of
                        for k in [c['d'] - 0.1 * m for m in range(int((c['d'] - abs(off)) * 10) + 1)]:
                            k = k if off >= 0 else -k
                            np_ = [round(q[0] - uz * k, 1), round(q[1] + ux * k, 1)]
                            if not hits_building(out, np_, nb, p, w / 2 + 0.2):
                                break
                        moved[n] = np_
            for r in out['roads']:
                hit = False
                for i, n in enumerate(r.get('nodes') or []):
                    if n in moved and i < len(r['pts']):
                        r['pts'][i] = moved[n]; hit = True
                if hit and r['type'] in c.get('narrow', {}):
                    r['w'] = c['narrow'][r['type']]
        if it['kind'] == 'cut' and c:
            for r in out['roads']:
                if r not in mine and r.get('tunnel') and all(abs(path_proj(path, *p)[1]) < c['d'] + 1 for p in r['pts']):
                    r['beside'] = it['id']
        res.append(g)
        print('grade %-22s %d ways, %d nodes pushed%s' % (it['id'], len(mine), len(moved) if c else 0,
                                                          ', roof %s' % g['roof'] if 'roof' in g else ''))
    for r, (w, pts) in zip(out['roads'], orig):
        if r['w'] != w or r['pts'] != pts:
            r['osm'] = {'w': w, 'pts': pts}
    return res


def hits_building(out, p, nbrs, p0, r):
    """True if a road node moved from p0 to p (segments to its neighbours nbrs,
    half width r) comes closer than r to a building edge it was clear of."""
    box = (p[0] - r - 40, p[1] - r - 40, p[0] + r + 40, p[1] + r + 40)
    for b in out['buildings']:
        P = b['pts']
        if not poly_hits_box(P, box):
            continue
        for q in nbrs or [p]:
            if poly_seg_dist(P, p, q) < r and poly_seg_dist(P, p0, q) >= r:
                return True
    return False


def clip_half(pts, p, q, keep):
    """Clip a ring to one side of the line p->q: keep=-1 left of it (cross < 0),
    keep=1 right of it. Works for the simple notched shapes used here."""
    side = lambda a: ((q[0] - p[0]) * (a[1] - p[1]) - (q[1] - p[1]) * (a[0] - p[0])) * keep
    out = []
    for i in range(len(pts)):
        a, b = pts[i - 1], pts[i]
        sa, sb = side(a), side(b)
        if sb >= 0:
            if sa < 0:
                t = sa / (sa - sb); out.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
            out.append(b)
        elif sa >= 0:
            t = sa / (sa - sb); out.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    res = []
    for v in out:
        v = [round(v[0], 1), round(v[1], 1)]
        if not res or res[-1] != v:
            res.append(v)
    if len(res) > 1 and res[0] == res[-1]:
        res.pop()
    return despike(res)


def despike(r, tol=0.5):
    """Drop zero-width spikes that clipping a notched ring leaves along the cut
    (a vertex where the outline doubles back on itself)."""
    r = r[:]
    changed = True
    while changed and len(r) > 3:
        changed = False
        for i in range(len(r)):
            a, b, c = r[i - 1], r[i], r[(i + 1) % len(r)]
            ux, uz, vx, vz = b[0] - a[0], b[1] - a[1], c[0] - b[0], c[1] - b[1]
            l = math.hypot(c[0] - a[0], c[1] - a[1])
            d = abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / l if l > 1e-6 else math.hypot(ux, uz)
            if (ux * vx + uz * vz < 0 and d < tol) or d < 0.02:
                r.pop(i); changed = True
                break
    return r


def thin_edge(r, w=2.0):
    """True if some edge (> 4 m) has the outside again within w behind it: a
    sliver left by a cut line that runs on past the wing it was meant for."""
    for i in range(len(r)):
        a, b = r[i - 1], r[i]
        l = math.dist(a, b)
        if l < 4:
            continue
        nx, nz = -(b[1] - a[1]) / l, (b[0] - a[0]) / l  # inward for CCW x/z
        if not point_in_poly((a[0] + b[0]) / 2 + nx * w, (a[1] + b[1]) / 2 + nz * w, r):
            return True
    return False


def split_parts(pts, sp):
    """Override 'split': cut a footprint into blocks along lines. cuts[i] = [p, q];
    block 0 lies left of cut 0 (cross < 0), block i between cut i-1 and cut i.
    Optional h[i] sets a block's height in metres (null = from its floors)."""
    cuts, fl, hs = sp['cuts'], sp['floors'], sp.get('h') or []
    out = []
    for i, f in enumerate(fl):
        r = pts
        if i > 0:
            r = clip_half(r, *cuts[i - 1], 1)
        if i < len(cuts):
            r = clip_half(r, *cuts[i], -1)
        if area(r) < 0:
            r = r[::-1]
        h = hs[i] if i < len(hs) and hs[i] else f * FLOOR_H + ROOF_H
        part = dict(pts=r, floors=int(f), h=round(h, 1))
        if sp.get('labels'):
            part['label'] = sp['labels'][i]
        out.append(part)
    return out


# ---------------------------------------------------------------------------
# Fill blocks (地圖寫實化 7). OSM has no buildings or areas on ~46% of the map.
# tools/block_survey.json classifies those blank blocks by eye (Google 街景 /
# 衛星, text only, no imagery used); here each block's 'plan' becomes
# deterministic synthetic content: buildings (synthetic=1, src='f'), ground
# areas (synthetic=1; new kinds farm / dirt / wood) and 鐵皮圍籬 barriers
# (type sheet_fence). None of it is a real footprint. js/main.js drops all of
# it when the 補建街區 setting is off.
SURVEY = os.path.join(HERE, 'block_survey.json')
FC = 10            # blank-cell size: the survey's grid (blank_cells below)
FF = 2.5           # fine cell for ground polygons and footprint tests
FN = int(FC / FF)
B_BLD, B_AREA, B_ROAD, B_WATER, B_RAIL = 1, 2, 4, 8, 16
CONTENT = {'park', 'grass', 'pitch', 'track', 'water', 'parking', 'school'}
SIDEWALK = 2.6     # js/map.js sidewalk(): kerb strip out to w/2 + 2.6 on primary..tertiary
GROUND_KIND = {'farm': 'farm', 'wood': 'wood', 'grass': 'grass', 'dirt': 'dirt', 'parking': 'parking',
               'yard': 'industrial', 'factory': 'industrial', 'apt': 'grass', 'campus': 'grass', 'pond': 'water'}
STRICT = {'parking', 'yard', 'sport', 'factory', 'pond'}   # ground kept >= 1 m off kerbs (cars spawn on parking)
RES = {'row', 'shop'}


def blank_cells(out, syn=False):
    """10 m occupancy grid and blank components, computed exactly as the survey
    did (scratch blank.py): building footprints, content areas, roads / water /
    rail with w/2 + 2 m. Returns (nx, nz, occ bitmask rows, components sorted by
    area desc; each {cells, area, bbox}). syn=True also counts synthetic ground
    as occupied (round 2: the blanks round 1 left)."""
    B = out['bounds']; C = FC
    nx = int((B['maxX'] - B['minX']) / C); nz = int((B['maxZ'] - B['minZ']) / C)
    occ = [bytearray(nx) for _ in range(nz)]

    def mark_poly(poly, bit):
        xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
        i0 = max(0, int((min(xs) - B['minX']) / C)); i1 = min(nx - 1, int((max(xs) - B['minX']) / C))
        j0 = max(0, int((min(zs) - B['minZ']) / C)); j1 = min(nz - 1, int((max(zs) - B['minZ']) / C))
        for j in range(j0, j1 + 1):
            for i in range(i0, i1 + 1):
                if point_in_poly(B['minX'] + (i + .5) * C, B['minZ'] + (j + .5) * C, poly):
                    occ[j][i] |= bit

    def seg_mark(pts, w, bit):
        r = int(math.ceil((w / 2 + 2) / C))
        for k in range(len(pts) - 1):
            (x1, z1), (x2, z2) = pts[k], pts[k + 1]
            n = max(1, int(math.hypot(x2 - x1, z2 - z1) / 3))
            for s in range(n + 1):
                x = x1 + (x2 - x1) * s / n; z = z1 + (z2 - z1) * s / n
                ci = int((x - B['minX']) / C); cj = int((z - B['minZ']) / C)
                for dj in range(-r, r + 1):
                    for di in range(-r, r + 1):
                        i, j = ci + di, cj + dj
                        if 0 <= i < nx and 0 <= j < nz and math.hypot(di * C, dj * C) <= w / 2 + 2:
                            occ[j][i] |= bit
    for b in out['buildings']:
        mark_poly(b['pts'], B_BLD)
    for a in out['areas']:
        if a['kind'] in CONTENT or (syn and a.get('synthetic')):
            mark_poly(a['pts'], B_AREA)
    for r in out['roads']:
        seg_mark(r['pts'], r['w'], B_ROAD)
    for w in out['waterways']:
        seg_mark(w['pts'], w['w'], B_WATER)
    for r in out['rail']:
        seg_mark(r['pts'], 6, B_RAIL)
    seen = [bytearray(nx) for _ in range(nz)]
    comps = []
    for j in range(nz):
        for i in range(nx):
            if occ[j][i] or seen[j][i]:
                continue
            st = [(i, j)]; seen[j][i] = 1; cells = []
            while st:
                a, b = st.pop(); cells.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    u, v = a + da, b + db
                    if 0 <= u < nx and 0 <= v < nz and not occ[v][u] and not seen[v][u]:
                        seen[v][u] = 1; st.append((u, v))
            if len(cells) * C * C < 2500:
                continue
            xs = [B['minX'] + (a + .5) * C for a, b in cells]; zs = [B['minZ'] + (b + .5) * C for a, b in cells]
            comps.append(dict(cells=cells, area=len(cells) * C * C,
                              bbox=[round(min(xs)), round(min(zs)), round(max(xs)), round(max(zs))]))
    comps.sort(key=lambda o: -o['area'])
    return nx, nz, occ, comps


def pt_seg(x, z, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az
    l2 = dx * dx + dz * dz
    t = 0 if l2 <= 0 else max(0, min(1, ((x - ax) * dx + (z - az) * dz) / l2))
    return math.hypot(ax + dx * t - x, az + dz * t - z)


def seg_cross(a, b, c, d):
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    d1, d2, d3, d4 = o(c, d, a), o(c, d, b), o(a, b, c), o(a, b, d)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)) and d1 * d2 < 0 and d3 * d4 < 0


def seg_seg(a, b, c, d):
    if seg_cross(a, b, c, d):
        return 0.0
    return min(pt_seg(a[0], a[1], *c, *d), pt_seg(b[0], b[1], *c, *d), pt_seg(c[0], c[1], *a, *b), pt_seg(d[0], d[1], *a, *b))


def poly_dist(P, Q):
    """0 if the rings overlap, else the smallest edge-to-edge gap."""
    if point_in_poly(P[0][0], P[0][1], Q) or point_in_poly(Q[0][0], Q[0][1], P):
        return 0.0
    m = 1e9
    for i in range(len(P)):
        a, b = P[i - 1], P[i]
        for j in range(len(Q)):
            m = min(m, seg_seg(a, b, Q[j - 1], Q[j]))
            if m <= 0:
                return 0.0
    return m


def poly_seg_dist(P, a, b):
    if point_in_poly(a[0], a[1], P) or point_in_poly(b[0], b[1], P):
        return 0.0
    return min(seg_seg(P[i - 1], P[i], a, b) for i in range(len(P)))


class Grid:
    """Bucket index of items by bbox (cell metres)."""
    def __init__(s, cell=20):
        s.cell = cell; s.g = {}; s.items = []

    def add(s, box, item):
        k = len(s.items); s.items.append(item)
        c = s.cell
        for i in range(int(math.floor(box[0] / c)), int(math.floor(box[2] / c)) + 1):
            for j in range(int(math.floor(box[1] / c)), int(math.floor(box[3] / c)) + 1):
                s.g.setdefault((i, j), []).append(k)

    def query(s, box):
        c = s.cell; out = set()
        for i in range(int(math.floor(box[0] / c)), int(math.floor(box[2] / c)) + 1):
            for j in range(int(math.floor(box[1] / c)), int(math.floor(box[3] / c)) + 1):
                out.update(s.g.get((i, j), ()))
        return [s.items[k] for k in sorted(out)]


def bbox_of(pts, pad=0):
    xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
    return [min(xs) - pad, min(zs) - pad, max(xs) + pad, max(zs) + pad]


def keepouts(out):
    """Spots the fill must keep off: spawn / 舊校門, night market, the enterable
    buildings and their flattened terrain (js/interiors.js, tools/build_terrain.py
    interior_zones), guardhouse barriers, named landmarks. (circles, rings+gap)"""
    circ, polys = [], []
    poi = {p['name']: p for p in out['pois']}
    g = poi.get('舊校門') or dict(x=-231, z=39)
    circ.append((g['x'], g['z'], 35))            # player spawn + boom barriers
    if out.get('nightMarket'):
        circ.append((out['nightMarket']['x'], out['nightMarket']['z'], 50))
    for a in out['areas']:
        if a.get('rel') == NIGHT_MARKET_REL:
            polys.append((a['pts'], 6))
    for n in ('鐘塔', '中原噴水池', 'A6校門'):
        if n in poi:
            circ.append((poi[n]['x'], poi[n]['z'], 20))
    circ.append((-201.2, 82.25, 18))             # 正門警衛室 + 校名牆 (MAIN_GATE)
    ang = math.atan2(16.9, 49.3); c, s = math.cos(ang), math.sin(ang)
    w = lambda x, z: [79.9 + x * c - z * s, 92.6 + x * s + z * c]
    polys.append(([w(-5, -0.5), w(52.5, -0.5), w(52.5, 16.5), w(-5, 16.5)], 14))       # 資管系館 + flatten pad / ramp
    polys.append(([[-136, -114], [-107, -114], [-107, -92], [-136, -92]], 14))           # 麥當勞
    polys.append(([[-194.7, -128.6], [-163.2, -128.4], [-112, -129.9], [-112, -114], [-136, -114],
                   [-136, -94.4], [-144.4, -94.4], [-195.2, -94.5]], 14))                 # 學生活動中心
    return circ, polys


def fill_blocks(out, stats, rnd=1):
    """rnd 1 fills survey['blocks'] (blank components of the OSM-only map);
    rnd 2 fills survey['blocks2'], the components still blank after round 1
    (its synthetic ground counts as occupied). Round-2 ids index those."""
    if not os.path.exists(SURVEY):
        return
    survey = json.load(open(SURVEY, encoding='utf8'))
    skey = 'blocks' if rnd == 1 else 'blocks%d' % rnd
    if skey not in survey:
        return
    B = out['bounds']
    nx, nz, occ, comps = blank_cells(out, syn=rnd > 1)
    cell_area = nx * nz * FC * FC
    fkey_ = 'fill' if rnd == 1 else 'fill%d' % rnd
    stats[fkey_] = dict(blank_before=sum(c['area'] for c in comps), map=cell_area)
    NXF = nx * FN

    # ---- indices ----
    roads = Grid(20)
    for r in out['roads']:
        side = r['type'] in ('primary', 'secondary', 'tertiary') and not r.get('bridge') and not r.get('tunnel') \
            and not (r.get('name') or '').startswith('中北路')
        hw = r['w'] / 2 + (SIDEWALK if side else 0)
        # buildings: >= w/2 + 1 m from the centreline (behind the sidewalk where there is one)
        clr = r['w'] / 2 + (SIDEWALK + 0.4 if side else 1.1 if r.get('drive') else 1.05)
        for a, b in zip(r['pts'], r['pts'][1:]):
            roads.add(bbox_of([a, b], hw + 12), (a, b, hw, clr, r))
    wet = Grid(20)
    for w in out['waterways']:
        for a, b in zip(w['pts'], w['pts'][1:]):
            wet.add(bbox_of([a, b], w['w'] / 2 + 8), (a, b, w['w'] / 2, w['w'] / 2 + 1.5))
    for r in out['rail']:
        for a, b in zip(r['pts'], r['pts'][1:]):
            wet.add(bbox_of([a, b], 10), (a, b, 2.4, 4.8))
    blds = Grid(20)
    for b in out['buildings']:
        blds.add(bbox_of(b['pts']), b['pts'])
    cont = Grid(25)
    for a in out['areas']:
        if a['kind'] in CONTENT or (rnd > 1 and a.get('synthetic')):
            cont.add(bbox_of(a['pts']), a['pts'])
    k_circ, k_polys = keepouts(out)
    syn = Grid(20)

    fine_cache = {}

    def fine(k):
        """(ground_ok, strict_ok) for fine cell k"""
        v = fine_cache.get(k)
        if v is not None:
            return v
        ix, iz = k % NXF, k // NXF
        x, z = B['minX'] + (ix + .5) * FF, B['minZ'] + (iz + .5) * FF
        box = [x, z, x, z]
        rd = 99
        for a, b, hw, clr, r in roads.query(box):
            rd = min(rd, pt_seg(x, z, *a, *b) - hw)
        ok = rd >= -0.4
        if ok:
            for a, b, hw, clr in wet.query(box):
                if pt_seg(x, z, *a, *b) < hw:
                    ok = False; break
        if ok and any(point_in_poly(x, z, p) for p in blds.query(box)):
            ok = False
        if ok and any(point_in_poly(x, z, p) for p in cont.query(box)):
            ok = False
        v = fine_cache[k] = (ok, ok and rd >= 1.0, rd)
        return v

    def fkey(x, z):
        ix = int((x - B['minX']) // FF); iz = int((z - B['minZ']) // FF)
        if ix < 0 or iz < 0 or ix >= NXF or iz >= nz * FN:
            return -1
        return iz * NXF + ix

    blocks = {b['id']: b for b in survey[skey]}
    claimed = set()
    added_b, added_a, added_f = [], [], []
    tally = {}

    for bid, comp in enumerate(comps):
        sv = blocks.get(bid)
        if not sv or not sv.get('plan'):
            continue
        if sv['bbox'] != comp['bbox'] or sv['area'] != comp['area']:
            stats['warn'].append('fill r%d block %d: blank component changed (survey bbox %s area %d, now %s %d), skipped'
                                 % (rnd, bid, sv['bbox'], sv['area'], comp['bbox'], comp['area']))
            continue
        plan = sv['plan']
        rng = random.Random((7000 if rnd == 1 else 9000 * rnd) + bid)
        tag = bid if rnd == 1 else rnd * 1000 + bid   # blk: round-2 block n is 2000 + n
        R = rng.random
        cells = comp['cells']
        cx = sum(a for a, b in cells) / len(cells); cz = sum(b for a, b in cells) / len(cells)

        # ---- zones: take each zone's share of the remaining cells from its side ----
        DIRV = dict(N=(0, -1), S=(0, 1), E=(1, 0), W=(-1, 0), NE=(.707, -.707), NW=(-.707, -.707),
                    SE=(.707, .707), SW=(-.707, .707))
        zones = plan['zones']
        left = list(cells); zcells = []
        for zi, zd in enumerate(zones):
            if zi == len(zones) - 1:
                take = left
            else:
                n = min(len(left), int(round(zd.get('f', 1 / len(zones)) * len(cells))))
                if zd.get('at'):   # 指定中心（世界座標 x, z）：取離它最近的格
                    ax = (zd['at'][0] - B['minX']) / FC - 0.5; az = (zd['at'][1] - B['minZ']) / FC - 0.5
                    key = lambda c, ax=ax, az=az: (c[0] - ax) ** 2 + (c[1] - az) ** 2
                elif zd.get('dir') == 'C' or not zd.get('dir'):
                    key = lambda c: (c[0] - cx) ** 2 + (c[1] - cz) ** 2
                else:
                    dv = DIRV[zd['dir']]
                    key = lambda c, dv=dv: -((c[0] - cx) * dv[0] + (c[1] - cz) * dv[1])
                order = sorted(left, key=key)
                take = order[:n]
            ts = set(take)
            left = [c for c in left if c not in ts]
            zcells.append(ts)
        # road / rail-only cells next to a zone join it (houses face the kerb, ground runs under it)
        zone_of = {}
        for zi, ts in enumerate(zcells):
            for c in ts:
                zone_of[c] = zi
        dil = {}
        for (i, j), zi in sorted(zone_of.items()):
            if zones[zi]['t'] == 'pond':   # 水面不延伸到路面底下
                continue
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    u, v = i + di, j + dj
                    if (u, v) in zone_of or (u, v) in dil or not (0 <= u < nx and 0 <= v < nz):
                        continue
                    m = occ[v][u]
                    if m and not m & (B_BLD | B_AREA | B_WATER):
                        dil[(u, v)] = zi
        zfine = []
        for zi, ts in enumerate(zcells):
            seeds = []
            for i, j in sorted(ts):
                for a in range(FN):
                    for b in range(FN):
                        k = (j * FN + b) * NXF + i * FN + a
                        if k not in claimed and fine(k)[0]:
                            seeds.append(k)
            S = set(seeds); st = list(seeds)
            while st:
                k = st.pop()
                for d in (1, -1, NXF, -NXF):
                    q = k + d
                    if q in S or q in claimed or q < 0:
                        continue
                    ci = ((q // NXF) // FN, (q % NXF) // FN)
                    ci = (ci[1], ci[0])
                    if dil.get(ci) != zi or not fine(q)[0]:
                        continue
                    S.add(q); st.append(q)
            claimed.update(S)
            zfine.append(S)

        # dominant street direction around the block (for grids and field stripes)
        x0, z0, x1, z1 = sv['bbox']
        hist = {}
        for a, b, hw, clr, r in roads.query([x0 - 20, z0 - 20, x1 + 20, z1 + 20]):
            if not r.get('drive'):
                continue
            l = math.dist(a, b)
            ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 90
            hist[int(ang // 3)] = hist.get(int(ang // 3), 0) + l
        theta = math.radians((max(hist, key=lambda k: (hist[k], -k)) * 3 + 1.5) if hist else 0)

        wall = plan.get('wall') or []
        roofc = plan.get('roofc') or []
        shed = plan.get('shed')
        cnt = tally.setdefault(bid, {})

        def ok_rect(P, S, gap_syn, frontage=False):
            bx = bbox_of(P)
            # inside this zone's cells (sampled every <= 2.2 m)
            (ax, az), (bx_, bz), (cx_, cz_), (dx, dz) = P
            L1 = math.dist(P[0], P[1]); L2 = math.dist(P[1], P[2])
            n1 = max(1, int(math.ceil((L1 - 0.6) / 2.2))); n2 = max(1, int(math.ceil((L2 - 0.6) / 2.2)))
            for s in range(n1 + 1):
                t = (0.3 + (L1 - 0.6) * s / n1) / L1
                for q in range(n2 + 1):
                    w = (0.3 + (L2 - 0.6) * q / n2) / L2
                    x = ax + (bx_ - ax) * t + (dx - ax) * w; z = az + (bz - az) * t + (dz - az) * w
                    if fkey(x, z) not in S:
                        return False
            for a, b, hw, clr, r in roads.query(bbox_of(P, 2)):
                if poly_seg_dist(P, a, b) < clr:
                    return False
            for a, b, hw, clr in wet.query(bbox_of(P, 2)):
                if poly_seg_dist(P, a, b) < clr:
                    return False
            for Q in blds.query(bbox_of(P, 1.2)):
                if poly_dist(P, Q) < 1.0:
                    return False
            for x, z, r in k_circ:
                if math.hypot(min(max(x, bx[0]), bx[2]) - x, min(max(z, bx[1]), bx[3]) - z) < r and \
                        (point_in_poly(x, z, P) or min(pt_seg(x, z, *P[i - 1], *P[i]) for i in range(4)) < r):
                    return False
            for Q, g in k_polys:
                if poly_dist(P, Q) < g:
                    return False
            # 既有 OSM 內容區（停車場、公園…）：邊界斜切進來時細格取樣抓不到，再比一次多邊形
            for Q in cont.query(bbox_of(P, 1)):
                if poly_dist(P, Q) < 0.5:
                    return False
            # gap_syn = 0（同排街屋）：允許共用牆面，但轉角／斜向 run 接續時只要真的重疊（> 0.005 m2）
            # （> 0.002 m2，以輸出的 2 位小數座標計）就拒絕，避免薄片重疊造成的 z-fighting
            Pr = [[round(p[0], 2), round(p[1], 2)] for p in P]
            for Q in syn.query(bbox_of(P, gap_syn + 0.5)):
                dq = poly_dist(Pr, Q)
                if gap_syn > 0:
                    if dq < gap_syn:
                        return False
                elif dq <= 0 and overlap_area(Pr, Q) > 0.002:
                    return False
            return True

        def rect(o, u, v, W, D):
            P = [list(o), [o[0] + u[0] * W, o[1] + u[1] * W],
                 [o[0] + u[0] * W + v[0] * D, o[1] + u[1] * W + v[1] * D], [o[0] + v[0] * D, o[1] + v[1] * D]]
            return P if area(P) > 0 else P[::-1]

        def add_bld(P, kind, floors, zt, h=None, lod=0, **kw):
            pts = [[round(p[0], 2), round(p[1], 2)] for p in P]   # 2 decimals: neighbours in a row must not overlap
            rec = dict(pts=pts, h=round(h if h else floors * FLOOR_H + ROOF_H, 1), floors=floors, kind=kind,
                       id=('f%d' if rnd == 1 else 'f' + str(rnd) + '_%d') % len(added_b), src='f',
                       synthetic=1, blk=tag)
            rec.update({k: v for k, v in kw.items() if v is not None})
            if lod:
                rec['lod'] = 1
            added_b.append(rec)
            syn.add(bbox_of(pts), pts)   # 存輸出用的 2 位小數座標，重疊檢查和最後資料一致
            cnt[zt] = cnt.get(zt, 0) + 1
            return rec

        def fl_range(zd, dflt):
            s = (zd.get('fl') or dflt).split('-')
            return int(s[0]), int(s[-1])

        def tint(p=0.5):
            if wall and R() < p:
                c = wall[int(R() * len(wall))]
                k = 0.94 + R() * 0.1
                return '#%02x%02x%02x' % tuple(min(255, int(int(c[i:i + 2], 16) * k)) for i in (1, 3, 5))
            return None

        def town_extra(zd, zt):
            sp = zd.get('shop', {'shop': .95, 'row': .5, 'apt': .5, 'farmhouse': 0}.get(zt, .5))
            return dict(noShop=1 if R() >= sp else None, shed=shed if shed is not None else None)

        def frontage(zi, zd, zt, S):
            """Houses along every drivable street side of the zone: runs of 3-8
            with one width / depth / storey count (+-1), lanes between some runs."""
            lo, hi = fl_range(zd, '3-4')
            dens = zd.get('dens', 1.0)
            fronts = []
            segs = roads.query([x0 - 25, z0 - 25, x1 + 25, z1 + 25])
            seen = set()
            for a, b, hw, clr, r in segs:
                if not r.get('drive') or (id(r), tuple(a), tuple(b)) in seen:
                    continue
                seen.add((id(r), tuple(a), tuple(b)))
                L = math.dist(a, b)
                if L < 6:
                    continue
                u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
                for sd in (1, -1):
                    # each side is walked with the street on its right: v points away from it
                    a2, u2 = (a, u) if sd > 0 else (b, (-u[0], -u[1]))
                    v = (-u2[1], u2[0])
                    off = clr + 0.3 + R() * 0.9
                    # quick test: is there any zone cell behind this side at all?
                    mid = (a2[0] + u2[0] * L / 2 + v[0] * (off + 6), a2[1] + u2[1] * L / 2 + v[1] * (off + 6))
                    probe = [fkey(a2[0] + u2[0] * t + v[0] * (off + 5), a2[1] + u2[1] * t + v[1] * (off + 5)) for t in
                             (1.5, L * 0.25, L / 2, L * 0.75, L - 1.5)]
                    if not any(k in S for k in probe) and fkey(*mid) not in S:
                        continue
                    p, run = 0.5 + R() * 1.5, 0
                    while p < L - 3.5:
                        if run <= 0:
                            if zt == 'store':
                                W0, D0, run, f0 = 16 + R() * 14, 14 + R() * 10, 1, lo + int(R() * (hi - lo + 1))
                            elif zt == 'farmhouse':
                                W0, D0, run, f0 = 8 + R() * 4, 8 + R() * 4, 1, lo + int(R() * (hi - lo + 1))
                            else:
                                W0 = (4 + R() * 1.6) if zt == 'shop' else (4.5 + R() * 2.5)
                                D0, run, f0 = 12 + R() * 8, 3 + int(R() * 6), lo + int(R() * (hi - lo + 1))
                            col0 = tint()
                            if R() < 0.25 and zt in RES:
                                p += 2.5 + R() * 1.5   # 巷
                        W = min(7.0, max(4.05, W0 * (0.95 + R() * 0.1))) if zt in RES else W0   # 面寬 4–7 m（座標取 2 位小數後仍 >= 4）
                        placed = None
                        if R() < dens:
                            for D in (D0, D0 * 0.75, max(8, D0 * 0.55)):
                                o = (a2[0] + u2[0] * p + v[0] * off, a2[1] + u2[1] * p + v[1] * off)
                                P = rect(o, u2, v, W, D)
                                if ok_rect(P, S, 0 if zt in RES else 3):
                                    placed = (P, D); break
                        if placed:
                            P, D = placed
                            f = max(lo, min(hi, f0 + (1 if R() < 0.12 else -1 if R() < 0.12 else 0)))
                            if zt == 'store':
                                rc = zd.get('roof')
                                add_bld(P, 'commercial', f, zt, h=f * 4.2 + ROOF_H, colour=tint(0.8),
                                        roof='gabled' if rc else None, roofColour=rc, roofH=1.8 if rc else None)
                            elif zt == 'farmhouse':
                                add_bld(P, 'town', f, zt, roof='gabled', roofH=1.4,
                                        roofColour=(roofc or ['#8d959b'])[int(R() * len(roofc or [1]))], noShop=1,
                                        colour=tint(0.3))
                            else:
                                add_bld(P, 'town', f, zt, colour=col0, **town_extra(zd, zt))
                                fronts.append((o, u2, v, W, D, off, f))
                            run -= 1
                            p += W
                            if zt == 'farmhouse':
                                p += 40 + R() * 60
                            elif zt == 'store':
                                p += 3 + R() * 8
                        else:
                            p += 1.0
                            if zt not in RES:
                                run = 0
            return fronts

        def back_rows(zd, zt, S, fronts):
            dens = zd.get('dens', 1.0)
            for o, u, v, W, D, off, f in fronts:
                if R() >= dens * 0.9:
                    continue
                d2 = off + D + 2.5 + R() * 1.0
                o2 = (o[0] + v[0] * (D + 2.5 + R() * 1.0), o[1] + v[1] * (D + 2.5 + R() * 1.0))
                for D2 in (10 + R() * 5, 8):
                    P = rect(o2, u, v, W, D2)
                    if ok_rect(P, S, 0):
                        lo, hi = fl_range(zd, '3-4')
                        add_bld(P, 'town', max(lo, min(hi, f + (-1 if R() < 0.3 else 0))), zt, lod=R() < 0.5,
                                colour=tint(), **town_extra(zd, zt))
                        break

        def frame(S):
            uu = (math.cos(theta), math.sin(theta)); vv = (-uu[1], uu[0])
            us, vs = [], []
            for k in S:
                x = B['minX'] + (k % NXF + .5) * FF; z = B['minZ'] + (k // NXF + .5) * FF
                us.append(x * uu[0] + z * uu[1]); vs.append(x * vv[0] + z * vv[1])
            P = lambda U, V: (uu[0] * U + vv[0] * V, uu[1] * U + vv[1] * V)
            return uu, vv, min(us), max(us), min(vs), max(vs), P

        def grid_fill(zd, zt, S, sizes, gu, gv, prob, make):
            """Scan the zone on a grid along the street direction; sizes() gives
            candidate (W along u, D along v) from big to small."""
            if not S:
                return
            uu, vv, u0, u1, v0, v1, P = frame(S)
            v = v0 - 2 + R() * 6
            while v < v1:
                Dmax = 0
                u = u0 - 2 + R() * 4
                while u < u1:
                    put = False
                    if R() < prob:
                        for W, D in sizes():
                            Pr = rect(P(u, v), uu, vv, W, D)
                            if ok_rect(Pr, S, 0 if zt in RES else 3):
                                make(Pr, W, D); u += W + gu(); Dmax = max(Dmax, D); put = True
                                break
                    if not put:
                        u += 3
                v += (Dmax or sizes()[-1][1]) + gv()

        for zi, zd in enumerate(zones):
            zt, S = zd['t'], zfine[zi]
            if not S:
                continue
            if zt in RES:
                fronts = frontage(zi, zd, zt, S)
                back_rows(zd, zt, S, fronts)
                lo, hi = fl_range(zd, '3-4')
                dens = zd.get('dens', 1.0)
                # interior: back-to-back pairs of rows with a 4 m lane
                pair = [0]

                def mk(Pr, W, D, zd=zd, zt=zt, lo=lo, hi=hi):
                    add_bld(Pr, 'town', lo + int(R() * (hi - lo + 1)), zt, lod=R() < 0.5, colour=tint(), **town_extra(zd, zt))

                def gv(pair=pair):
                    pair[0] ^= 1
                    return 0 if pair[0] else 3.5 + R()
                grid_fill(zd, zt, S, lambda: [(4.5 + R() * 2, 13 + R() * 4), (5, 10)], lambda: 0 if R() < 0.8 else 2.5,
                          gv, dens * (0.9 if zt == 'shop' else 0.75), mk)
            elif zt == 'store':
                frontage(zi, zd, zt, S)
            elif zt == 'apt':
                lo, hi = fl_range(zd, '7-12')
                kd = zd.get('kind', 'town')
                fc = zd.get('facade')   # e.g. 'glass' for a curtain-wall tower (js/map.js window style)

                def mk(Pr, W, D, lo=lo, hi=hi, kd=kd, fc=fc):
                    add_bld(Pr, kd, lo + int(R() * (hi - lo + 1)), 'apt', colour=tint(0.7),
                            noShop=1 if R() < 0.5 or kd != 'town' or fc else None, shed=0, facade=fc)
                grid_fill(zd, zt, S, lambda: [(28 + R() * 14, 14 + R() * 4), (20, 13), (14, 12)], lambda: 10 + R() * 5,
                          lambda: 12 + R() * 5, 0.9, mk)
            elif zt == 'campus':
                lo, hi = fl_range(zd, '3-5')
                kd = zd.get('kind', 'campus')

                def mk(Pr, W, D, lo=lo, hi=hi, kd=kd):
                    add_bld(Pr, kd, lo + int(R() * (hi - lo + 1)), 'campus', colour=tint(0.7))
                grid_fill(zd, zt, S, lambda: [(34 + R() * 20, 13 + R() * 4), (24, 12), (16, 11)], lambda: 14 + R() * 6,
                          lambda: 16 + R() * 6, 0.85, mk)
            elif zt == 'factory':
                lo, hi = fl_range(zd, '1-2')
                saw, gab = plan.get('saw', 0.2), plan.get('gable', 0)

                def mk(Pr, W, D, lo=lo, hi=hi, saw=saw, gab=gab):
                    f = lo + int(R() * (hi - lo + 1))
                    h = (6 + R() * 1.6) if f == 1 else (8 + R() * 2)
                    q = R()
                    roof = dict(roof='gabled', feature=['gable_row'], roofH=1.6) if q < saw else \
                        dict(roof='gabled', roofH=round(1.2 + R() * 1.2, 1)) if gab or q < saw + (1 - saw) * 0.55 else {}
                    add_bld(Pr, 'commercial', 2 if h >= 8 else 1, 'factory', h=h, material='metal', facade='concrete',
                            colour=tint(0.85) or ['#b8bcbc', '#c8c8c4', '#9fa6ad', '#d0d0cc'][int(R() * 4)],
                            roofColour=(roofc or ['#b0b4b4'])[int(R() * len(roofc or [1]))], **roof)
                grid_fill(zd, zt, S, lambda: [(44 + R() * 22, 24 + R() * 10), (34, 22), (24, 16), (16, 12)],
                          lambda: 10 + R() * 4, lambda: 11 + R() * 4, 0.92, mk)
            elif zd.get('houses'):
                # scattered 農舍 along the field roads
                frontage(zi, dict(zd, fl='1-2', dens=zd['houses']), 'farmhouse', S)

        # ---- ground areas (merged fine cells) ----
        for zi, zd in enumerate(zones):
            zt, S = zd['t'], zfine[zi]
            if not S:
                continue
            if zt == 'pond':
                # 水面會擋路（world.isFree）：細格外緣 1.8 m + 輪廓簡化 1.3 m，離路面至少再 1 m
                S2 = {k for k in S if fine(k)[1] and fine(k)[2] >= 4.2}
            elif zt in STRICT:
                S2 = {k for k in S if fine(k)[1]}
            else:
                S2 = S
            if zt == 'sport':
                tr = sport_field(S2, NXF, B)
                if tr:
                    outer, inner = tr
                    added_a.append(dict(pts=outer, kind='track', holes=[inner[::-1]], synthetic=1, blk=tag))
                    added_a.append(dict(pts=inner, kind='pitch', infield=1, synthetic=1, blk=tag))
                    ib = bbox_of(outer)
                    S2 = {k for k in S2 if not (ib[0] <= B['minX'] + (k % NXF + .5) * FF <= ib[2]
                                                and ib[1] <= B['minZ'] + (k // NXF + .5) * FF <= ib[3])}
                    cnt['sport'] = cnt.get('sport', 0) + 1
                kind = 'grass'
            else:
                kind = GROUND_KIND.get(zt)
            if not kind:
                continue
            for P, hs in trace_cells(S2, NXF, B):
                a = dict(pts=P, kind=kind, synthetic=1, blk=tag)
                if hs:
                    a['holes'] = hs
                if kind == 'farm':
                    a['ang'] = round(math.degrees(theta), 1)
                if kind == 'dirt':
                    a['sub'] = zd.get('sub', 'weeds')
                added_a.append(a)
            cnt['ground:' + kind] = cnt.get('ground:' + kind, 0) + len(S2) * FF * FF
            if zd.get('fence') or zd.get('sub') == 'site':
                for f in fences(S, roads, x0, z0, x1, z1, fkey, blds):
                    added_f.append(dict(pts=f, type='sheet_fence', colour=zd.get('fence') or '#2f6aa8', synthetic=1, blk=tag))
                    cnt['fence'] = cnt.get('fence', 0) + 1

    out['buildings'].extend(added_b)
    out['areas'].extend(added_a)
    out['barriers'].extend(added_f)
    stats[fkey_].update(blocks=len(tally), buildings=len(added_b), areas=len(added_a), fences=len(added_f), tally=tally)


def overlap_area(P, Q):
    """Intersection area of two convex rings (Sutherland-Hodgman)."""
    sg = 1 if sum(Q[i - 1][0] * Q[i][1] - Q[i][0] * Q[i - 1][1] for i in range(len(Q))) > 0 else -1
    out = [list(p) for p in P]
    for i in range(len(Q)):
        if len(out) < 3:
            return 0.0
        a, b = Q[i - 1], Q[i]
        f = lambda p: sg * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]))
        inp, out = out, []
        for j in range(len(inp)):
            p, q = inp[j - 1], inp[j]
            fp, fq = f(p), f(q)
            if fq >= 0:
                if fp < 0:
                    t = fp / (fp - fq); out.append([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
                out.append(q)
            elif fp >= 0:
                t = fp / (fp - fq); out.append([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    return abs(area(out)) if len(out) >= 3 else 0.0


def trace_cells(S, NXF, B, tol=1.3):
    """Fine cells -> polygons: outlines traced along the cell edges (outer rings
    counter-clockwise like build_map's other rings, holes clockwise), staircases
    straightened with Douglas-Peucker (tol metres). Returns [(ring, holes)]."""
    nxt = {}
    for k in S:
        ix, iz = k % NXF, k // NXF
        c = [(ix, iz), (ix + 1, iz), (ix + 1, iz + 1), (ix, iz + 1)]
        for e, q in enumerate((k - NXF, k + 1, k + NXF, k - 1)):
            if q not in S:
                nxt.setdefault(c[e], []).append(c[(e + 1) % 4])
    loops = []
    while nxt:
        st = min(nxt)
        loop = [st]; cur = st; prev = None
        while True:
            outs = nxt[cur]
            if len(outs) > 1 and prev is not None:
                # pinch vertex (cells touching diagonally): turn so each loop stays on its own cells
                d = (cur[0] - prev[0], cur[1] - prev[1])
                outs.sort(key=lambda q: -((q[0] - cur[0]) * -d[1] + (q[1] - cur[1]) * d[0]))
            q = outs.pop(0)
            if not outs:
                del nxt[cur]
            prev, cur = cur, q
            if cur == st:
                break
            loop.append(cur)
        loops.append(loop)

    def simplify(L):
        P = [(B['minX'] + x * FF, B['minZ'] + z * FF) for x, z in L]
        # drop collinear vertices
        Q = [P[i] for i in range(len(P)) if (P[i][0] - P[i - 1][0]) * (P[(i + 1) % len(P)][1] - P[i][1])
             != (P[i][1] - P[i - 1][1]) * (P[(i + 1) % len(P)][0] - P[i][0])]
        if len(Q) < 4:
            return [list(q) for q in Q]

        def dp(pts):
            if len(pts) < 3:
                return pts
            a, b = pts[0], pts[-1]
            i, m = 0, -1
            for j in range(1, len(pts) - 1):
                d = pt_seg(pts[j][0], pts[j][1], *a, *b)
                if d > m:
                    i, m = j, d
            if m <= tol:
                return [a, b]
            return dp(pts[:i + 1])[:-1] + dp(pts[i:])
        far = max(range(len(Q)), key=lambda j: math.dist(Q[0], Q[j]))
        R = dp(Q[:far + 1])[:-1] + dp(Q[far:] + [Q[0]])[:-1]
        return [[round(x, 1), round(z, 1)] for x, z in R]
    outers, holes = [], []
    for L in loops:
        r = simplify(L)
        if len(r) < 3 or abs(area(r)) < 1:
            continue
        (outers if area(r) > 0 else holes).append(r)
    res = [(o, []) for o in outers]
    for h in holes:
        for o, hs in res:
            if point_in_poly(h[0][0], h[0][1], o) or point_in_poly(*centroid(h), o):
                hs.append(h); break
    return res


def sport_field(S, NXF, B):
    """Largest axis-aligned rectangle of fine cells; a running track around a
    pitch if it is at least 50 x 34 m. Returns (outer ring, infield ring) or None."""
    if not S:
        return None
    zs = sorted({k // NXF for k in S}); xs = sorted({k % NXF for k in S})
    best = (0, None)
    hgt = {}
    for iz in range(zs[0], zs[-1] + 1):
        for ix in range(xs[0], xs[-1] + 1):
            hgt[ix] = hgt.get(ix, 0) + 1 if iz * NXF + ix in S else 0
        st = []
        for ix in list(range(xs[0], xs[-1] + 1)) + [xs[-1] + 1]:
            hh = hgt.get(ix, 0) if ix <= xs[-1] else 0
            start = ix
            while st and st[-1][1] >= hh:
                s0, h0 = st.pop()
                a = h0 * (ix - s0)
                if a > best[0]:
                    best = (a, (s0, ix - 1, iz - h0 + 1, iz))
                start = s0
            st.append((start, hh))
    if not best[1]:
        return None
    a, b, z0, z1 = best[1]
    X0, X1 = B['minX'] + a * FF, B['minX'] + (b + 1) * FF
    Z0, Z1 = B['minZ'] + z0 * FF, B['minZ'] + (z1 + 1) * FF
    W, Hh = X1 - X0, Z1 - Z0
    if min(W, Hh) < 34 or max(W, Hh) < 50:
        return None
    ring = lambda x0, z0, x1, z1: [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]
    o = ring(X0 + 1, Z0 + 1, X1 - 1, Z1 - 1)
    if area(o) < 0:
        o = o[::-1]
    t = 7 if min(W, Hh) >= 46 else 5   # lane band width
    i = ring(X0 + 1 + t, Z0 + 1 + t, X1 - 1 - t, Z1 - 1 - t)
    if area(i) < 0:
        i = i[::-1]
    return o, i


def fences(S, roads, x0, z0, x1, z1, fkey, blds):
    """鐵皮圍籬 along the street sides of a zone: 2 m steps on a line 1.2 m off
    the kerb (behind the sidewalk), kept where the zone lies behind it; pieces of
    <= 30 m with 5 m openings so the lots stay walkable."""
    out = []
    for a, b, hw, clr, r in roads.query([x0 - 25, z0 - 25, x1 + 25, z1 + 25]):
        if not r.get('drive'):
            continue
        L = math.dist(a, b)
        if L < 6:
            continue
        u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        for sd in (1, -1):
            v = (-u[1] * sd, u[0] * sd)
            off = hw + 1.2
            run = []
            n = int(L // 2)
            for s in range(n + 1):
                t = s * L / max(n, 1)
                p = (a[0] + u[0] * t + v[0] * off, a[1] + u[1] * t + v[1] * off)
                ok = fkey(p[0] + v[0] * 3, p[1] + v[1] * 3) in S and fkey(*p) in S
                if ok:
                    bx = [p[0], p[1], p[0], p[1]]
                    if any(pt_seg(p[0], p[1], *q, *w) < hh + 0.8 for q, w, hh, c, rr in roads.query(bx)):
                        ok = False
                    elif any(point_in_poly(p[0], p[1], Q) for Q in blds.query(bx)):
                        ok = False
                if ok:
                    run.append(p)
                if (not ok or s == n) and run:
                    i = 0
                    while i < len(run) - 1:
                        j = min(len(run) - 1, i + 15)
                        if math.dist(run[i], run[j]) >= 4:
                            out.append([[round(run[i][0], 2), round(run[i][1], 2)], [round(run[j][0], 2), round(run[j][1], 2)]])
                        i = j + 3   # 6 m opening
                    run = []
    return out


def main():
    raw = json.load(open(SRC, encoding='utf8'))
    els = raw['elements']
    links = []   # highway=primary_link ways, added after the block fill
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

    ovr_all = load_overrides()
    ovr = ovr_all.get('buildings', [])
    used_ovr = set()
    looks = load_looks()
    used_looks = set()

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
        if lv and h and h / lv > 4.5 and not b['ovr']:
            stats['warn'].append('%s %s: height %.1f / levels %g = %.1f m per floor (using levels)'
                                 % (osm_id(b['e']), t.get('name', '?'), h, lv, h / lv))

    # neighbours with similar footprints share one seed -> same height in a row
    # overrides that only set looks still need a floor estimate
    est = [b for b in blds if not b['floors'] and not (b['ovr'] and b['ovr'].get('floors'))]
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
        if o and o.get('pts'):   # footprint redrawn on the orthophoto (OSM's outline runs into a street)
            pts = [list(p) for p in o['pts']]
        if o and o.get('move'):   # footprint OSM traced off its place on the orthophoto
            mx, mz = o['move']
            pts = [[round(x + mx, 2), round(z + mz, 2)] for x, z in pts]
            if b.get('holes'):
                b['holes'] = [[[round(x + mx, 2), round(z + mz, 2)] for x, z in hole] for hole in b['holes']]
        if o and (o.get('floors') or o.get('h')):
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
        if o:
            # hand-checked looks win over OSM tags (see overrides.json sources)
            for k in ('colour', 'material', 'roof', 'roofColour', 'facade', 'feature'):
                if o.get(k):
                    rec[k] = o[k]
            if o.get('split'):
                rec['parts'] = split_parts(pts, o['split'])
                a0 = abs(area(pts)); a1 = sum(abs(area(q['pts'])) for q in rec['parts'])
                if abs(a0 - a1) > 0.02 * a0:
                    stats['warn'].append('%s split area %.0f != %.0f' % (oid, a1, a0))
                for q in rec['parts']:
                    if thin_edge(q['pts']):
                        stats['warn'].append('%s split part %s has a strip < 2 m wide' % (oid, q.get('label', '')))
                rec['floors'] = max(q['floors'] for q in rec['parts'])
                rec['h'] = max(q['h'] for q in rec['parts'])
                if o['split'].get('ac'):
                    rec['splitAc'] = 1   # js/map.js: keep the unsplit roof's AC units
        lk = looks.get(oid)
        if lk:
            used_looks.add(oid)
        if lk and not lk.get('skip'):
            if lk.get('look'):
                rec['look'] = lk['look']
            if 'noShop' in lk:
                rec['noShop'] = lk['noShop']
        out['buildings'].append(rec)
    for i, o in enumerate(ovr):
        if i not in used_ovr:
            stats['warn'].append('override not matched: %s' % (o.get('osm') or o.get('name')))
    for oid in looks:
        if oid not in used_looks:
            stats['warn'].append('looks.json entry not matched: %s %s' % (oid, looks[oid].get('name', '')))

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
                if t.get('amenity') == 'motorcycle_parking':
                    a['sub'] = 'motorcycle'
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
        link = hw == 'primary_link'
        if link:   # the two right-turn slip lanes at 中園路 x 中華路二段: drawn as primary
            hw = 'primary'
        if hw in ROAD_W:
            w = ROAD_W[hw]
            if hw == 'service' and not name:
                w = 4.2
            if t.get('area') == 'yes':
                continue
            r = dict(pts=pts, w=w, type=hw, nodes=e.get('nodes', []))
            WAY_OF[id(r)] = e['id']
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
            (links if link else out['roads']).append(r)
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

    # hand-built landmarks (map.js): looks checked against the sources in overrides.json
    out['landmarks'] = {k: {j: v for j, v in o.items() if j not in ('source', 'note')}
                        for k, o in ovr_all.get('landmarks', {}).items()}

    # outdoor level changes (overrides.json 'levels'): local site frames -> game x/z
    out['levels'] = build_levels(ovr_all.get('levels', []))

    # shops OSM lacks (overrides.json 'pois'); egg = easter-egg trigger (js/main.js)
    out['eggs'] = []
    for p in ovr_all.get('pois', []):
        x, z = proj(p['lat'], p['lon'])
        # prio: js/furniture.js gives these a shop-sign atlas cell before OSM pois
        out['pois'].append(dict(name=p['name'], x=round(x, 1), z=round(z, 1), kind=p['kind'], prio=1))
        if p.get('egg'):
            e = p['egg']; ex, ez = proj(*e['at'])
            out['eggs'].append(dict(x=round(ex, 1), z=round(ez, 1), r=e.get('r', 6), title=e['title'], text=e['text']))

    if not out['nightMarket']:
        stats['warn'].append('night market relation %d missing' % NIGHT_MARKET_REL)

    # synthetic content for the blank blocks of tools/block_survey.json (after
    # everything from OSM, so the blank grid matches the survey's)
    fill_blocks(out, stats)
    fill_blocks(out, stats, 2)   # 第二輪：第一輪補完後仍空白的區塊（survey['blocks2']）

    # viaducts / footbridge / underpass (overrides.json 'grade'); after the
    # block fill so the synthetic blocks stay exactly as they were
    out['grade'] = build_grade(out, ovr_all.get('grade', []), stats)
    # measured carriageway widths (tools/roads.json); after the block fill and
    # grade so neither moves, and the old width stays in r['osm'] for js/map.js
    # the slip lanes join the map only now: the block fill (and the survey it replays) ran without them,
    # and at the end of the list they leave every other road's index (hashed by js) as it was
    out['roads'] += links
    apply_roads(out, stats)
    # tools/roads.json 'pave': asphalt the orthophoto shows between two one-way carriageways where the
    # build leaves a grass gap (a median opening); short unnamed service strips without nodes, so they stay
    # out of the traffic graph, the junction / zebra code and the lamp / moto / tree streams
    for e in json.load(open(ROADS, encoding='utf8')).get('pave', []):
        if not e.get('source') or not e.get('confidence'):
            raise SystemExit('roads.json pave: every entry needs source and confidence')
        out['roads'].append(dict(pts=[list(p) for p in e['pts']], w=e['w'], type='service', nodes=[], drive=1, pave=1))
    # painted markings read off the same survey (tools/roads.json 'marks' / 'features')
    apply_marks(out, stats)
    # sunk ponds / streams (tools/water.json); last, so nothing above moves
    apply_water(out, stats)

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
    for fk in ('fill', 'fill2'):
        fs = stats.get(fk)
        if not fs:
            continue
        print(fk + ': blank before %d of %d m2 (%.1f%%); %d blocks -> %d buildings, %d ground areas, %d fences'
              % (fs['blank_before'], fs['map'], 100 * fs['blank_before'] / fs['map'], fs.get('blocks', 0),
                 fs.get('buildings', 0), fs.get('areas', 0), fs.get('fences', 0)))
        for bid, t in sorted(fs.get('tally', {}).items()):
            print('  block %2d' % bid, ', '.join('%s %d' % (k, v) for k, v in sorted(t.items())))
    if stats.get('water'):
        print('water:', stats['water'])
    if stats.get('roads'):
        st = stats['roads']
        print('roads.json: %d widths, %d ways shifted, %d OSM walls / hedges pushed off them; 補建 cut back: %d houses cut, %d skipped, %d ground areas, %d fence segments'
              % (st['n'], st['shifted'], st['pushed'], st['cut'], st['skipped'], st['areas'], st['fences']))
        for c in st.get('pushlog', []):
            print('  pushed off a shifted road: OSM', c)
        for c in st['capped']:
            print('  capped by an OSM building / wall:', c)
    for s in stats['excluded']:
        print('excluded', s)
    for s in stats['warn']:
        print('WARN', s)


if __name__ == '__main__':
    main()
