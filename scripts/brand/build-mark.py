#!/usr/bin/env python3
"""
Build the Dumuwaks mark: Africa (Natural Earth 1:50m, 50 states dissolved,
mainland + Madagascar) with a wrench and a screwdriver cut into it.

  curl -sSfLo /tmp/c50.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
  python3 scripts/brand/build-mark.py /tmp/c50.json /tmp/mark-out

Writes SVG variants and paths.json (paste into frontend/src/components/brand/BrandMark.tsx).
Rasters: rsvg-convert + ImageMagick, see docs/design/DESIGN_SYSTEM.md.
Requires: shapely.
"""
import sys, os
SRC = sys.argv[1] if len(sys.argv) > 1 else 'c50.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
os.makedirs(OUT, exist_ok=True)
import json, math
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
t=json.load(open(SRC))
sc=t['transform']['scale']; tr=t['transform']['translate']
arcs=[]
for a in t['arcs']:
    x=y=0; pts=[]
    for dx,dy in a:
        x+=dx;y+=dy; pts.append((x*sc[0]+tr[0], y*sc[1]+tr[1]))
    arcs.append(pts)
def ring(idx):
    out=[]
    for i in idx:
        pts = arcs[i] if i>=0 else arcs[~i][::-1]
        out.extend(pts if not out else pts[1:])
    return out
ids={'012','024','204','072','854','108','120','140','148','178','180','384','262','818','226','232','748','231','266','270','288','324','624','404','426','430','434','450','454','466','478','504','508','516','562','566','646','686','694','706','710','728','729','834','768','788','800','732','894','716'}
names={'Somaliland','W. Sahara'}
polys=[];found=set()
for g in t['objects']['countries']['geometries']:
    if g.get('id') in ids or g['properties'].get('name') in names:
        found.add(g['properties'].get('name'))
        rings = g['arcs'] if g['type']=='Polygon' else [r for p in g['arcs'] for r in p]
        parts = [g['arcs']] if g['type']=='Polygon' else g['arcs']
        for p in parts:
            polys.append(Polygon(ring(p[0])).buffer(0))
print(len(found))
u=unary_union([p.buffer(0.02) for p in polys]).buffer(-0.02)
lat0=0
def proj(lon,lat): return (lon*math.cos(math.radians(2)), -lat)
gs=[g for g in u.geoms] if hasattr(u,'geoms') else [u]
gs=sorted(gs,key=lambda g:-g.area)[:2]  # mainland + Madagascar
print([round(g.area,1) for g in gs])
P=[Polygon([proj(*c) for c in g.exterior.coords]) for g in gs]
m=MultiPolygon(P)
minx,miny,maxx,maxy=m.bounds
s=300/(maxy-miny)
from shapely import affinity
m=affinity.translate(m,-minx,-miny); m=affinity.scale(m,s,s,origin=(0,0))
m=m.simplify(0.9)
print(m.bounds, [len(g.exterior.coords) for g in m.geoms])
A=m

# ---- tools ----
import math
from shapely.geometry import Polygon, box, Point, MultiPolygon, LineString
from shapely.ops import unary_union
from shapely import affinity

def ngon(cx,cy,r,n,rot=0):
    return Polygon([(cx+r*math.cos(math.radians(rot+360*i/n)),cy+r*math.sin(math.radians(rot+360*i/n))) for i in range(n)])
def place(shape, p0, p1):
    # shape built along +x from 0..L centered y=0 ; map to segment p0->p1
    ang=math.degrees(math.atan2(p1[1]-p0[1],p1[0]-p0[0]))
    s=affinity.rotate(shape,ang,origin=(0,0))
    return affinity.translate(s,p0[0],p0[1])
def wrench(L, w=13, R=22):
    handle=box(R*0.6,-w/2,L-R*0.6,w/2)
    # open end at x=0: octagon head with jaw slot opening toward -x
    head=ngon(0,0,R,8,22.5)
    jaw=unary_union([box(-R-2,-R*0.36,0,R*0.36), ngon(0,0,R*0.42,6,0)])
    head=head.difference(jaw)
    # box end at x=L: octagon with hex hole
    ring=ngon(L,0,R*0.82,8,22.5).difference(ngon(L,0,R*0.42,6,30))
    return unary_union([handle,head,ring])
def screwdriver(L, hw=24):
    # tip at x=0, handle at x=L
    hl=L*0.40
    tip=Polygon([(0,-2.5),(0,2.5),(16,5),(16,-5)])
    shaft=box(16,-5,L-hl-8,5)
    ferrule=box(L-hl-8,-hw*0.34,L-hl,hw*0.34)
    c=6
    handle=Polygon([(L-hl,-hw/2+c),(L-hl+c,-hw/2),(L-c,-hw/2),(L,-hw/2+c),(L,hw/2-c),(L-c,hw/2),(L-hl+c,hw/2),(L-hl,hw/2-c)])
    grooves=unary_union([box(L-hl+12,y-2,L-10,y+2) for y in (-6,0,6)])
    return unary_union([tip,shaft,ferrule,handle.difference(grooves)])
cfg=dict(w0=(104,52),w1=(180,248),s0=(26,98),s1=(250,118),gap=5.5)
wp0,wp1,sp0,sp1=cfg['w0'],cfg['w1'],cfg['s0'],cfg['s1']
Lw=math.dist(wp0,wp1); Ls=math.dist(sp0,sp1)
W=place(wrench(Lw),wp0,wp1)
S=place(screwdriver(Ls),sp0,sp1)
gap=cfg['gap']
# wrench on top of screwdriver
S_vis=S.difference(W.buffer(gap,join_style=2))
tools=unary_union([W,S_vis])
body=A.difference(tools.buffer(gap,join_style=2))
Wc=W.intersection(A.buffer(0)); Sc=S_vis.intersection(A)
def P(g):
    gs=g.geoms if hasattr(g,'geoms') else [g]
    out=[]
    for p in gs:
        if p.is_empty or p.area<4: continue
        for r in [p.exterior,*p.interiors]:
            out.append('M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in list(r.coords)[:-1])+'Z')
    return ' '.join(out)

# ---- outputs ----
import json

from shapely import affinity
from shapely.geometry import box
# normalise: translate so bounds start at 0
minx,miny,maxx,maxy=A.bounds
def T(g): return affinity.translate(g,-minx,-miny)
body_,W_,S_=T(body),T(Wc),T(Sc)
w,h=maxx-minx,maxy-miny
pad=6
vb=f"{-pad} {-pad} {w+2*pad:.0f} {h+2*pad:.0f}"
paths=dict(body=P(body_),wrench=P(W_),screwdriver=P(S_))
# small icon: continent + single thick wrench
Ws=place(wrench(math.dist((104,52),(180,248)),w=24,R=34),(104,52),(180,248))
Wsc=Ws.intersection(A); bodys=A.difference(Ws.buffer(9,join_style=2))
paths['smallBody']=P(T(bodys)); paths['smallWrench']=P(T(Wsc))
paths['viewBox']=vb
json.dump(paths,open(os.path.join(OUT,'paths.json'),'w'))
def mk(parts,fname,bg=None,label='Dumuwaks'):
    inner=''.join(f'<path d="{d}" fill="{c}" fill-rule="evenodd"/>' for d,c in parts)
    rect=f'<rect x="{-pad}" y="{-pad}" width="{w+2*pad:.0f}" height="{h+2*pad:.0f}" fill="{bg}"/>' if bg else ''
    open(fname,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{label}">{rect}{inner}</svg>\n')
CREAM,INK,AMBER,BLUE,BLUE_D,NIGHT='#f5eee1','#1a1610','#e8a317','#1fa3d6','#0080b3','#0b0907'
mk([(paths['body'],CREAM),(paths['screwdriver'],BLUE),(paths['wrench'],AMBER)],os.path.join(OUT,'dumuwaks-mark.svg'))
mk([(paths['body'],INK),(paths['screwdriver'],BLUE_D),(paths['wrench'],AMBER)],os.path.join(OUT,'dumuwaks-mark-dark.svg'))
mk([(paths['smallBody'],CREAM),(paths['smallWrench'],AMBER)],os.path.join(OUT,'dumuwaks-icon-small.svg'))
mk([(paths['smallBody'],CREAM),(paths['smallWrench'],AMBER)],os.path.join(OUT,'dumuwaks-icon-small-on-night.svg'),bg=NIGHT)
mk([(paths['body'],CREAM),(paths['screwdriver'],BLUE),(paths['wrench'],AMBER)],os.path.join(OUT,'dumuwaks-mark-on-night.svg'),bg=NIGHT)
print(vb)
