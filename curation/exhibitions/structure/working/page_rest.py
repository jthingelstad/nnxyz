import json,base64,io,html,datetime
from PIL import Image
R='/private/tmp/claude-502/-Users-otto-Projects/38dc4115-9628-5c90-9ca9-a87bf7784fc8/scratchpad/'
W={w['inkId']:w for w in json.load(open('data/gallery.json'))}
old={}
for c in json.load(open('curation/exhibitions/map.json'))['collections']:
  for g in c['galleries']:
    for ch in g['chapters']:
      for s in ch['stops']: old[s['artworkId']]=g['title']
for g in json.load(open('curation/abstract/exhibitions.json'))['collections'][0]['galleries']:
  for ch in g['chapters']:
    for s in ch['stops']: old[s['artworkId']]=g['title']
cfg=json.load(open(R+'rest.json'))
def mon(d): return datetime.date.fromisoformat(d).strftime('%b %Y')
def thumb(p,w=220,q=62):
  im=Image.open(p); im.draft('RGB',(w*2,w*2)); im=im.convert('RGB').resize((w,w),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=q); return base64.b64encode(b.getvalue()).decode()
body=[];nav=[];rows=[];total=0;structs={}
for key,c in cfg.items():
  idx=json.load(open(R+c['dir']+'/index.json')); g=json.load(open(R+c['dir']+'/groups.json')); border=json.load(open(R+c['dir']+'/border.json'))
  notes={l.split()[0]:' '.join(l.split()[1:-1]) for l in open(R+c['dir']+'/notes.txt') if l[:1]==c['prefix']}
  n=sum(len(x['refs']) for x in g['groups']); total+=n
  rows.append(f'<tr><td><a href="#{key}"><b>{c["name"]}</b></a></td><td>{n}</td><td>{" · ".join(f"{html.escape(x["title"])} {len(x["refs"])}" for x in g["groups"])}</td></tr>')
  body.append(f'<div class="part" id="{key}"><p class="eyebrow">{html.escape(c["dates"])}</p><h2>{c["name"]}</h2><p>{html.escape(c["desc"])}</p></div>')
  links=[];gals=[]
  for grp in g['groups']:
    es=[idx[r-1] for r in grp['refs']]; figs=[];works=[]
    for e in es:
      aid=e.get('inkId') or e['id']; path=e.get('imagePath') or W[aid]['imagePath']
      short=e['title'].replace(c['strip'],'') if c['strip'] else e['title']
      b=border.get(e['ref']); cls=' class="border"' if b else ''; em=f'<em>{html.escape(b)}</em>' if b else ''
      when=f' <span>{e["date"]}</span>' if e.get('date') else ''
      figs.append(f'<figure{cls}><img src="data:image/webp;base64,{thumb(path)}" alt="{html.escape(c["name"])} {html.escape(short)}" width="220" height="220" loading="lazy"><figcaption><b>{html.escape(short)}</b>{when}<small>was in {html.escape(old.get(aid,"no gallery"))}</small>{em}</figcaption></figure>')
      works.append({'artworkId':aid,'title':e['title'],'recordedDate':e.get('date'),'visualNote':notes.get(e['ref'],'')})
    ds=[e['date'] for e in es if e.get('date')]
    meta=f'{len(es)} works · {mon(min(ds))} to {mon(max(ds))}' if ds else f'{len(es)} works · in title order'
    gals.append({'key':grp['key'],'title':grp['title'],'theme':grp['theme'],'works':works})
    links.append(f'<a href="#{grp["key"]}">{html.escape(grp["title"])} <span>{len(es)}</span></a>')
    body.append(f'<section id="{grp["key"]}"><header><h3>{html.escape(grp["title"])}</h3><p class="theme">{html.escape(grp["theme"])}</p><p class="meta">{meta}</p></header><div class="wall">{"".join(figs)}</div></section>')
  nav.append(f'<div><b>{c["name"]}</b>{"".join(links)}</div>')
  structs[key]=gals
json.dump(structs,open(R+'rest-structure.json','w'),indent=1)
tpl=open(R+'faces/skeleton.html').read()
head=tpl.split('<main>')[0].replace('<title>Faces Gallery Plan</title>','<title>Remaining Wings Plan</title>')
css=open(R+'nnotb/page2.py').read().split("css='''")[1].split("'''")[0]
intro=f'''<div class="intro">
<p class="eyebrow">nnxyz gallery · structure review · the remaining wings</p>
<h1>Rawblocks, Abstract, Other nnxyz and Scrimshaw</h1>
<p>The last four collections, grouped the same way as Faces and New Nifty on the Block: by looking at the images alone, with the earlier labels and galleries set aside. Works are in the order they were drawn, or in title order for Abstract, which has no per-work dates. There is no gallery text yet.</p>
<table class="parts"><tr><th>Collection</th><th>Works</th><th>Galleries</th></tr>{"".join(rows)}</table>
<ul class="rules"><li>Every work in exactly one gallery</li><li>Every gallery 20 to 27 works</li><li>{total} of 189 placed</li></ul>
<p class="key"><b>Dashed outline</b>: a borderline work, with the other gallery it could go to. The small grey line under each work shows its gallery in the current site.</p>
</div>'''
out=head+css+'<main>'+intro+f'<nav aria-label="Galleries">{"".join(nav)}</nav>'+''.join(body)+'</main>'
open(R+'rest-gallery-plan.html','w').write(out); print(len(out)//1024,'KB',total)
