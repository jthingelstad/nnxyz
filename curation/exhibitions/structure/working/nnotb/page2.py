import json,base64,io,html,datetime
from PIL import Image
R='/private/tmp/claude-502/-Users-otto-Projects/38dc4115-9628-5c90-9ca9-a87bf7784fc8/scratchpad/'
S=R+'nnotb/'
idx={e['ref']:e for e in json.load(open(S+'index.json'))}
W={w['inkId']:w for w in json.load(open('data/gallery.json'))}
old={}
for c in json.load(open('curation/exhibitions/map.json'))['collections']:
  for g in c['galleries']:
    for ch in g['chapters']:
      for s in ch['stops']: old[s['artworkId']]=g['title']
notes={l.split()[0]:' '.join(l.split()[1:-1]) for l in open(S+'notes.txt') if l.startswith('N')}
PARTS=[('p1','Part 1','Figures and Creatures','Dec 8, 2021 to Jun 4, 2022','Whole figures, creatures and black silhouettes, ending with the May 2022 light beams and the first framed masks.'),
       ('p2','Part 2','Masks','Jun 8 to Aug 19, 2022','Ten weeks of masks: square, round and scribbled heads, with one room for the figures and places drawn in between.'),
       ('p3','Part 3','Cats and Portraits','Aug 20 to Oct 15, 2022','The August cats and flat creatures, the last crowned masks, and a turn to portraits.')]
def mon(d): return datetime.date.fromisoformat(d).strftime('%b %Y')
def thumb(p,w=220,q=62):
  im=Image.open(p).convert('RGB')
  im=im.resize((w,int(im.size[1]*w/im.size[0])),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=q); return base64.b64encode(b.getvalue()).decode()
body=[];nav=[];structure=[];total=0;rows=[]
for pk,pn,pt,pd,pdesc in PARTS:
  g=json.load(open(S+f'groups-{pk}.json')); border=json.load(open(S+f'border-{pk}.json'))
  n_part=sum(len(x['refs']) for x in g['groups']); total+=n_part
  rows.append(f'<tr><td><a href="#{pk}"><b>{pn}. {pt}</b></a></td><td>{pd}</td><td>{n_part}</td><td>{len(g["groups"])}</td></tr>')
  links=[];gals=[]
  body.append(f'<div class="part" id="{pk}"><p class="eyebrow">{pn} · {pd}</p><h2>{pt}</h2><p>{pdesc}</p></div>')
  for grp in g['groups']:
    refs=[f'N{r:03d}' for r in grp['refs']]; ds=[idx[r]['date'] for r in refs]; figs=[];works=[]
    for r in refs:
      e=idx[r]; w=W[e['inkId']]; short=e['title'].replace('nnxyz nnotb ','')
      if r=='N249': short+=' (unsigned)'
      if r=='N250': short+=' (signed)'
      b=border.get(r); cls=' class="border"' if b else ''; em=f'<em>{html.escape(b)}</em>' if b else ''
      figs.append(f'<figure{cls}><img src="data:image/webp;base64,{thumb(w["imagePath"])}" alt="New Nifty on the Block {html.escape(short)}" width="260" height="260" loading="lazy"><figcaption><b>{html.escape(short)}</b> <span>{e["date"]}</span><small>was in {html.escape(old.get(e["inkId"],"no gallery"))}</small>{em}</figcaption></figure>')
      works.append({'artworkId':e['inkId'],'title':e['title'],'recordedDate':e['date'],'visualNote':notes[r]})
    gals.append({'key':grp['key'],'title':grp['title'],'theme':grp['theme'],'works':works})
    links.append(f'<a href="#{grp["key"]}">{html.escape(grp["title"])} <span>{len(refs)}</span></a>')
    body.append(f'<section id="{grp["key"]}"><header><h3>{html.escape(grp["title"])}</h3><p class="theme">{html.escape(grp["theme"])}</p><p class="meta">{len(refs)} works · {mon(min(ds))} to {mon(max(ds))}</p></header><div class="wall">{"".join(figs)}</div></section>')
  nav.append(f'<div><b>{pn}. {pt}</b>{"".join(links)}</div>')
  structure.append({'key':pk,'title':pt,'dates':pd,'description':pdesc,'galleries':gals})
json.dump(structure,open(S+'structure.json','w'),indent=1)
body.append(f'''<section id="two-249"><header><h3>The two #249s</h3><p class="theme">One drawing, minted twice, 85 seconds apart on Aug 25, 2022. The pictures match pixel for pixel except the bottom-right corner, where the second adds the yellow nnxyz signature.</p><p class="meta">Cats and Creatures · ink 19826 at 6:59 am, ink 19827 at 7:00 am, US Central</p></header>
<figure class="pair"><img src="data:image/webp;base64,{thumb(S+'249-compare.png',1180,85)}" alt="The two #249 drawings side by side, with the changed pixels marked in red in the bottom-right corner" width="1180" height="407" loading="lazy"><figcaption><span>Unsigned, signed, and the changed pixels (811 of 544,644) in red</span></figcaption></figure>
<figure class="pair zoom"><img src="data:image/webp;base64,{thumb(S+'249-zoom.png',572,90)}" alt="Close-up of the bottom-right corner: unsigned on the left, yellow nnxyz signature on the right" width="572" height="184" loading="lazy"><figcaption><span>The corner, enlarged</span></figcaption></figure>
<p class="note">Neither was burned. Only the signed one (19827) was later priced and given four extra mints to the 0xdead address, the same thing nnxyz did with 506 of the 547 works in this collection. The unsigned one (19826) was never released as an edition, like the #0000 works and #1 fork. You hold the only live token of each.</p></section>''')
tpl=open(R+'faces/skeleton.html').read()
head=tpl.split('<main>')[0].replace('<title>Faces Gallery Plan</title>','<title>NNOTB Gallery Plan</title>')
css='''<style>
.parts{border-collapse:collapse;font-size:14px;width:100%;max-width:680px}.parts th,.parts td{text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--rule);vertical-align:top}.parts th{font-weight:500;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}.parts td:nth-child(n+3){font-variant-numeric:tabular-nums}.parts a{color:var(--ink)}
nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px 24px}nav div{display:grid;gap:3px;align-content:start}nav div b{font-weight:600;font-size:13px}
.part{display:grid;gap:6px;max-width:68ch;border-top:2px solid var(--ink);padding-top:22px;scroll-margin-top:16px}.part h2{font:500 clamp(30px,4vw,40px)/1.1 var(--serif)}.part p{margin:0}
h3{font:500 26px/1.15 var(--serif);margin:0;text-wrap:balance}
.pair img{aspect-ratio:auto;object-fit:contain;background:transparent}.zoom{max-width:572px}.note{max-width:70ch;margin:0}
@media (max-width:520px){.parts td:nth-child(2){font-size:12.5px}}
</style>'''
intro=f'''<div class="intro">
<p class="eyebrow">nnxyz gallery · structure review · New Nifty on the Block</p>
<h1>New Nifty on the Block: three parts, thirteen galleries</h1>
<p>New Nifty on the Block is too large for one wing, so it is split into three parts by date. The dates fall where the drawing changes, so each part is one stretch of time and one way of drawing. Inside each part, the galleries come from looking at the images alone. The earlier labels and galleries were not used. Within each gallery the works are in the order they were drawn. There is no gallery text yet.</p>
<table class="parts"><tr><th>Part</th><th>Dates</th><th>Works</th><th>Galleries</th></tr>{"".join(rows)}</table>
<ul class="rules"><li>Every work in exactly one gallery</li><li>Every gallery 20 to 28 works</li><li>{total} of 303 placed</li></ul>
<p class="key"><b>Dashed outline</b>: a borderline work, with the other gallery it could go to. The small grey line under each work shows its gallery in the current site.</p>
</div>'''
out=head+css+'<main>'+intro+f'<nav aria-label="Galleries">{"".join(nav)}</nav>'+''.join(body)+'</main>'
open(S+'nnotb-gallery-plan.html','w').write(out); print(len(out)//1024,'KB',total)
