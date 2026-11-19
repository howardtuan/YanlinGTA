"""Convert raw OpenStreetMap data (tools/osm_raw.json) around Chung Yuan Christian
University into a compact game map (data/cycu.json).

Coordinates: metres, x = east, z = south, origin at ORIGIN (campus centre).
Map data (c) OpenStreetMap contributors, ODbL.

Usage: python tools/build_map.py
"""
import json, math, os, re, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'osm_raw.json')
DST = os.path.join(HERE, '..', 'data', 'cycu.json')

LAT0, LON0 = 24.9580, 121.2425
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110574
# playable bounds (metres)
BOUNDS = dict(minX=-820, maxX=1000, minZ=-900, maxZ=740)


def proj(lat, lon):
    return [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]


def hrand(seed, a, b):
    h = int(hashlib.md5(str(seed).encode()).hexdigest()[:8], 16) / 0xffffffff
    return a + (b - a) * h


def parse_num(v):
    if v is None:
        return None
    m = re.match(r'\s*([0-9.]+)', str(v))
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


def closed(pts):
    if len(pts) > 2 and pts[0] == pts[-1]:
        return pts[:-1]
    return pts


def in_bounds(pts, pad=0):
    return any(BOUNDS['minX'] - pad <= x <= BOUNDS['maxX'] + pad and BOUNDS['minZ'] - pad <= z <= BOUNDS['maxZ'] + pad for x, z in pts)


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


def building_height(e, t, kind, campus_ring):
    h = parse_num(t.get('height'))
    lv = parse_num(t.get('building:levels'))
    if h:
        return h
    if lv:
        return lv * 3.3 + 0.6
    if kind == 'campus':
        return 12
    if kind == 'dorm':
        return 18
    if kind == 'small':
        return 3.2
    if kind == 'commercial':
        return hrand(e['id'], 7, 12)
    b = t.get('building')
    if b == 'apartments':
        return hrand(e['id'], 22, 40)
    if b in ('house', 'detached', 'terrace'):
        return hrand(e['id'], 9, 14)
    return hrand(e['id'], 7, 16)


def point_in_poly(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]; xj, zj = poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def main():
    raw = json.load(open(SRC, encoding='utf8'))
    els = raw['elements']
    out = dict(origin=[LAT0, LON0], bounds=BOUNDS, buildings=[], roads=[], areas=[],
               waterways=[], rail=[], pois=[], campus=[])

    # campus outline
    for e in els:
        if e['type'] == 'relation' and e['id'] == 8286924:
            outers = [[proj(p['lat'], p['lon']) for p in m['geometry']] for m in e['members']
                      if m['type'] == 'way' and m.get('role', 'outer') == 'outer' and m.get('geometry')]
            out['campus'] = [r for r in assemble_rings(outers) if len(r) > 3]
    campus_ring = max(out['campus'], key=lambda r: abs(area(r))) if out['campus'] else []

    seen = set()
    for e in els:
        key = (e['type'], e['id'])
        if key in seen:
            continue
        seen.add(key)
        t = e.get('tags', {})
        name = t.get('name')

        if e['type'] == 'node':
            if name and in_bounds([proj(e['lat'], e['lon'])]):
                kind = (t.get('amenity') or t.get('shop') or t.get('leisure') or t.get('man_made')
                        or t.get('historic') or t.get('entrance') and 'gate' or t.get('barrier') or t.get('tourism')
                        or t.get('cuisine') and 'restaurant' or '')
                if t.get('railway') or t.get('power') or t.get('utility') or t.get('place') or t.get('highway'):
                    continue
                x, z = proj(e['lat'], e['lon'])
                out['pois'].append(dict(name=name, x=x, z=z, kind=kind))
            continue

        # building (way or relation)
        if 'building' in t and e['type'] in ('way', 'relation'):
            if e['type'] == 'way':
                rings = [closed(geom(e))]
            else:
                rings = assemble_rings([[proj(p['lat'], p['lon']) for p in m['geometry']]
                                        for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry')])
            for pts in rings:
                if len(pts) < 3 or not in_bounds(pts):
                    continue
                if area(pts) < 0:  # make counter-clockwise in x/z (consistent)
                    pts = pts[::-1]
                kind = building_kind(t)
                c = centroid(pts)
                if kind == 'town' and campus_ring and point_in_poly(c[0], c[1], campus_ring):
                    kind = 'campus'
                h = building_height(e, t, kind, campus_ring)
                b = dict(pts=pts, h=round(h, 1), kind=kind)
                if name:
                    b['name'] = name
                out['buildings'].append(b)
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
            out['roads'].append(r)
            continue

        if t.get('railway') in ('rail', 'light_rail', 'subway', 'construction'):
            if t.get('tunnel') == 'yes' or t.get('railway') != 'rail':
                continue
            out['rail'].append(dict(pts=pts))
            continue

        if 'waterway' in t:
            ww = t['waterway']
            w = {'river': 14, 'stream': 4, 'drain': 3, 'canal': 6}.get(ww, 3)
            if t.get('tunnel') or t.get('layer', '0').startswith('-'):
                continue
            out['waterways'].append(dict(pts=pts, w=w))
            continue

        kind = None
        for k in ('leisure', 'natural', 'landuse', 'amenity'):
            if (k, t.get(k)) in AREA_KIND:
                kind = AREA_KIND[(k, t.get(k))]
                break
        if kind and pts[0] == pts[-1]:
            a = dict(pts=closed(pts), kind=kind)
            if name:
                a['name'] = name
            out['areas'].append(a)

    # area POIs for named areas (used for labels / missions)
    for a in out['areas']:
        if a.get('name'):
            c = centroid(a['pts'])
            out['pois'].append(dict(name=a['name'], x=c[0], z=c[1], kind='area:' + a['kind']))

    # sort areas so big/background ones draw first
    order = {'residential': 0, 'industrial': 0, 'commercial': 0, 'construction': 1, 'school': 1,
             'parking': 2, 'park': 3, 'grass': 4, 'pitch': 5, 'track': 5, 'water': 6}
    out['areas'].sort(key=lambda a: (order.get(a['kind'], 3), -abs(area(a['pts']))))

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('buildings', len(out['buildings']), 'roads', len(out['roads']), 'areas', len(out['areas']),
          'water', len(out['waterways']), 'rail', len(out['rail']), 'pois', len(out['pois']),
          'campus rings', len(out['campus']), 'size', os.path.getsize(DST))
    if campus_ring:
        xs = [p[0] for p in campus_ring]; zs = [p[1] for p in campus_ring]
        print('campus bbox', min(xs), max(xs), min(zs), max(zs))


if __name__ == '__main__':
    main()
