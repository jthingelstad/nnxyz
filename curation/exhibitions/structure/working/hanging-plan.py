"""Build the all-wings hanging plan review page from the structure files.

Usage: python3 hanging-plan.py OUT.html [CACHE_DIR]

Reads curation/exhibitions/structure/*.json, fetches each work's published
thumbnail from CloudFront into CACHE_DIR (default /tmp/nnxyz-thumbs; never
inside the repo), embeds them as WebP data URIs and writes one HTML page.
Run from the repository root. Needs Pillow and network access to the CDN.
"""
import json, base64, io, html, datetime, os, sys, urllib.request
from PIL import Image

ROOT = os.getcwd()
STRUCT = f'{ROOT}/curation/exhibitions/structure'
OUT = sys.argv[1]
CACHE = sys.argv[2] if len(sys.argv) > 2 else '/tmp/nnxyz-thumbs'
os.makedirs(CACHE, exist_ok=True)
CDN = 'https://d1of1z466a2mhl.cloudfront.net'
THUMB_PX, THUMB_Q = 210, 60

def esc(s): return html.escape(str(s), quote=True)

def fetch(aid):
    path = f'{CACHE}/{aid}.webp'
    if not os.path.exists(path):
        url = f'{CDN}/abstract/images/{aid}-640.webp' if aid.startswith('polygon-') else f'{CDN}/raster/{aid}-320.webp'
        urllib.request.urlretrieve(url, path)
    return path

def thumb(aid):
    im = Image.open(fetch(aid)).convert('RGB').resize((THUMB_PX, THUMB_PX), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=THUMB_Q, method=6)
    return base64.b64encode(b.getvalue()).decode()

PREFIXES = ('nnxyz nifty faces ', 'nnxyz nnotb ', 'nnxyz rawblocks ', 'nnxyz abstract ', 'nnxyz ')
def short(t):
    for p in PREFIXES:
        if t.startswith(p): return t[len(p):]
    return t

def mdy(d):
    if not d: return ''
    return datetime.date.fromisoformat(d).strftime('%b %-d, %Y')
def my(d): return datetime.date.fromisoformat(d).strftime('%b %Y')
def date_range(works):
    ds = [w['recordedDate'] for w in works if w.get('recordedDate')]
    if not ds: return 'no per-work dates; title order'
    a, b = min(ds), max(ds)
    return mdy(a) if a == b else f'{my(a)} to {my(b)}'

# ---------- wings ----------
WINGS = [
    ('nifty-faces', 'Faces', 'approved'),
    ('nnotb', 'New Nifty on the Block', 'approved'),
    ('rawblocks', 'Rawblocks', 'open questions'),
    ('abstract', 'Abstract', 'reviewed'),
    ('nnxyz-other', 'Other nnxyz', 'reviewed'),
    ('scrimshaw', 'Scrimshaw', 'open question'),
]

# Per-work marks: artwork short title -> (css class, note). Keyed by (wing, short title).
MARKS = {
    ('rawblocks', '#42'): ('move', 'Q2: to Scribbled Heads?'),
    ('rawblocks', '#43'): ('move', 'Q2: to Scribbled Heads?'),
    ('rawblocks', '#44'): ('move', 'Q2: to Scribbled Heads?'),
    ('rawblocks', '#45'): ('move', 'Q2: to Scribbled Heads?'),
    ('rawblocks', '#46'): ('move', 'Q2: to Scribbled Heads?'),
    ('rawblocks', '#19'): ('move', 'Q2: to Patterned Masks? (pair with #20)'),
    ('rawblocks', '#20'): ('move', 'Q2: to Patterned Masks?'),
    ('rawblocks', '#24'): ('move', 'Q2: to Patterned Masks?'),
    ('rawblocks', '#25'): ('move', 'Q2: to Patterned Masks?'),
    ('rawblocks', '#47'): ('stay', 'stays (decided)'),
    ('rawblocks', '#48'): ('stay', 'stays (decided)'),
}

# Question boxes, placed after a given gallery key (or 'wing-end').
def q_box(qid, title, body_html, options, free_label='Notes'):
    opts = ''.join(
        f'<label><input type="radio" name="{qid}" id="{qid}-{i}" value="{esc(o)}"> {esc(o)}</label>'
        for i, o in enumerate(options))
    return (f'<aside class="q" id="{qid}" data-q="{qid}" data-title="{esc(title)}"><p class="eyebrow">Open question</p>'
            f'<h4>{esc(title)}</h4>{body_html}'
            f'<form class="decide" onsubmit="return false"><fieldset><legend>Your decision</legend>{opts}'
            f'<label class="free">{esc(free_label)} <input type="text" id="{qid}-note" name="{qid}-note" placeholder="optional"></label></fieldset></form></aside>')

Q1 = q_box('q1', 'Rawblocks #64 and #65, the two painted landscapes',
    '<p>Made on March 15, 2023, the day after #0000. They are the last two Rawblocks works and the only two with no head or figure in them. Seen next to Scribbled Heads they are clearly out of place; seen next to the end of Portraits (#51 and #52, painted in January 2023) the handling is close but the subject is not.</p>'
    '<p><b>Suggestion:</b> hang them as a two-work coda that closes the wing, after Scribbled Heads. It is honest to the record, since they really were made after the collection piece, and it gives the wing a quiet ending. The cost is a room of two, below the 20-work floor, which the wing text can name as a coda rather than a gallery.</p>',
    ['Two-work coda ending the wing (suggested)', 'End of Portraits', 'Something else (say below)'])

Q2 = q_box('q2', 'Scribbled Heads has 16 works',
    '<p>After the approved moves, Portraits has 26, Patterned Masks 22 and Scribbled Heads 16. Looking at the walls: the line heads #42 to #46 sit on the same bright grounds as #47 and #48, which already open Scribbled Heads, so the seven make one run. In Portraits, #19 and #20 are a pair of pink patterned faces, and #24 and #25 are skulls, none of them a person painted fast.</p>'
    '<p><b>Suggestion:</b> move #42 to #46 into Scribbled Heads, and move #19, #20, #24 and #25 into Patterned Masks. That gives Portraits 22, Patterned Masks 21 and Scribbled Heads 21. The handoff proposed #20, #24 and #25 only; #19 is added here so the pair stays together. Marked works show the proposed move on the walls above.</p>',
    ['Both moves, with #19 (suggested)', 'Both moves, #20, #24, #25 only', 'Move #42 to #46 only; accept Patterned Masks at 17', 'Accept Scribbled Heads at 16'])

Q3 = q_box('q3', 'GM is off the wall',
    '<p>GM is the letters G and M in looping colored line on a muddy ground, dated November 24, 2021. It is the only text piece in the collection and it has left the Scrimshaw gallery.</p>'
    '<p><b>Suggestion:</b> keep it on the site as a related item at the end of Occasions and Figures, which already holds the greeting and milestone pieces. Dropping it removes an owned work from a site that otherwise shows every one.</p>',
    ['Related item on Occasions and Figures (suggested)', 'Drop it from the site'])

Q4 = q_box('q4', 'Where each #0000 hangs',
    '<p>The four collection pieces now sit where their images placed them. Faces #0000 ends Crossed-Out Eyes, the second of six rooms. NNOTB #0000 ends Crowns and Last Masks, the middle room of part 3. Rawblocks #0000 already ends the last room. Abstract #0000 opens Splatter, Scribble and Swirl, because title order puts it first.</p>'
    '<p><b>Suggestion:</b> make each #0000 the last work a visitor sees, without moving it to a room it does not look like. For NNOTB, order part 3 as Cats, Portraits, then Crowns and Last Masks, which also ends the wing on the three works minted October 15, 2022. For Abstract, hang #0000 last in its room. For Faces, either leave it where it is or make Crossed-Out Eyes the final room; it is a box head with crossed eyes, so moving it to Clean Lines would not look right.</p>',
    ['End each wing with its #0000 by reordering rooms (suggested)', 'Leave each where its image placed it', 'Mixed; say which below'])

Q5 = q_box('q5', 'Your wing notes stopped at an empty item 7',
    '<p>The review notes for the wings ended with a numbered item 7 that had no text. If it was a decision or a work to move, it is not recorded anywhere.</p>',
    ['Nothing; drop it', 'It was something; written below'], free_label='Item 7')

PLACE = {  # after this gallery key
    ('rawblocks', 'rb-late'): [Q1, Q2],
    ('scrimshaw', 'sc-scrimshaw'): [Q3],
}

# ---------- build ----------
seen = set()
body = []; nav = []; total = 0; wing_rows = []
gallery_count = 0

def figure(wing_id, w, extra_cls='', extra_note=''):
    global total
    aid = w['artworkId']
    assert aid not in seen, aid
    seen.add(aid); total += 1
    st = short(w['title'])
    cls, note = MARKS.get((wing_id, st), ('', ''))
    if w.get('collectionPiece'):
        cls = (cls + ' piece').strip(); note = note or 'collection piece, edition of one'
    if extra_cls: cls = (cls + ' ' + extra_cls).strip()
    if extra_note: note = extra_note
    c = f' class="{cls}"' if cls else ''
    em = f'<em>{esc(note)}</em>' if note else ''
    when = f'<span>{esc(mdy(w.get("recordedDate")))}</span>' if w.get('recordedDate') else ''
    return (f'<figure{c} data-id="{esc(aid)}"><img src="data:image/webp;base64,{thumb(aid)}" alt="{esc(w["title"])}" width="{THUMB_PX}" height="{THUMB_PX}" loading="lazy">'
            f'<figcaption><b>{esc(st)}</b>{when}{em}</figcaption></figure>')

def gallery(wing_id, g, part_key=''):
    global gallery_count
    gallery_count += 1
    key = f'{wing_id}-{g["key"]}'
    n = len(g['works'])
    flag = '' if 20 <= n <= 30 else ' <em class="warn">outside 20 to 30</em>'
    figs = ''.join(figure(wing_id, w) for w in g['works'])
    out = (f'<section class="gallery" id="{key}"><header><h3>{esc(g["title"])}</h3><p class="theme">{esc(g["theme"])}</p>'
           f'<p class="meta">{n} works · {esc(date_range(g["works"]))}{flag}</p></header><div class="wall">{figs}</div></section>')
    for q in PLACE.get((wing_id, g['key']), []):
        out += q
    return out, f'<a href="#{key}">{esc(g["title"])} <span>{n}</span></a>'

for wing_id, wing_name, status in WINGS:
    d = json.load(open(f'{STRUCT}/{wing_id}.json'))
    links = []; wing_html = []; wing_n = 0
    parts = d.get('parts') or [{'key': '', 'title': '', 'galleries': d['galleries']}]
    for p in parts:
        if p['key']:
            wing_html.append(f'<div class="part" id="{wing_id}-{p["key"]}"><p class="eyebrow">Part {p["key"][1:]} · {esc(p["dates"])}</p><h2 class="part-title">{esc(p["title"])}</h2><p>{esc(p["description"])}</p></div>')
            links.append(f'<b class="sub">{esc(p["title"])}</b>')
        for g in p['galleries']:
            h, l = gallery(wing_id, g, p['key']); wing_html.append(h); links.append(l); wing_n += len(g['works'])
    extras = d.get('unplaced', []) + d.get('offWall', [])
    if extras:
        label = 'Unplaced' if d.get('unplaced') else 'Off the wall'
        figs = ''.join(figure(wing_id, w, 'border', 'needs a home' if d.get('unplaced') else 'off the wall') for w in extras)
        wing_html.append(f'<section class="gallery extra" id="{wing_id}-extra"><header><h3>{esc(label)}</h3><p class="meta">{len(extras)} work{"s" if len(extras)>1 else ""} · not in any gallery</p></header><div class="wall">{figs}</div></section>')
        links.append(f'<a href="#{wing_id}-extra">{label} <span>{len(extras)}</span></a>')
        wing_n += len(extras)
    decisions = d.get('collectorDecisions', [])
    dec_html = ('<details class="decided"><summary>Decisions already made</summary><ul>' + ''.join(f'<li>{esc(x)}</li>' for x in decisions) + '</ul></details>') if decisions else ''
    desc = d.get('description', '')
    ngal = sum(len(p['galleries']) for p in parts)
    head = (f'<div class="wing" id="{wing_id}"><p class="eyebrow">Wing · {esc(status)}</p><h2>{esc(wing_name)}</h2>'
            f'<p class="meta">{wing_n} works · {ngal} galler{"y" if ngal==1 else "ies"}{" · " + str(len(parts)) + " parts" if d.get("parts") else ""}</p>'
            + (f'<p>{esc(desc)}</p>' if desc else '') + dec_html + '</div>')
    body.append(head + ''.join(wing_html))
    nav.append(f'<div><b><a href="#{wing_id}">{esc(wing_name)}</a> <span>{wing_n}</span></b>{"".join(links)}</div>')
    wing_rows.append((wing_name, wing_n, ngal, status))

# integrity: every owned work exactly once
gal = {w['inkId'] for w in json.load(open(f'{ROOT}/data/gallery.json'))}
abs_ = {w['id'] for w in json.load(open(f'{ROOT}/data/abstract.json'))['artworks']}
assert seen == gal | abs_, (len(seen), len(gal | abs_), list(seen ^ (gal | abs_))[:5])

CSS = r'''
<style>
/* Layout: a museum hanging plan. One quiet wall, wings as chapters, galleries as dense thumbnail walls; the open questions sit in-flow as pinned cards beside the works they concern. */
:root{
 --wall:#fbfbfa; --ink:#26272a; --muted:#6c6e73; --rule:#e3e3e0; --mark:#b5562f; --card:#ffffff; --pin:#f6efe6; --pin-rule:#e4cfb8; --ok:#3f7a4f;
 --serif:"Newsreader",Georgia,"Times New Roman",serif; --sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--wall:#151618;--ink:#e6e6e3;--muted:#9a9ca1;--rule:#2c2e32;--mark:#e08a63;--card:#1d1f22;--pin:#24201b;--pin-rule:#4a3d30;--ok:#7fc08f;color-scheme:dark}}
:root[data-theme="dark"]{--wall:#151618;--ink:#e6e6e3;--muted:#9a9ca1;--rule:#2c2e32;--mark:#e08a63;--card:#1d1f22;--pin:#24201b;--pin-rule:#4a3d30;--ok:#7fc08f;color-scheme:dark}
body{background:var(--wall);color:var(--ink);font:15px/1.55 var(--sans)}
main{max-width:1240px;margin:0 auto;padding-block:40px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:44px}
.intro{display:grid;gap:14px;max-width:70ch}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font:500 clamp(30px,4.5vw,44px)/1.1 var(--serif);margin:0;text-wrap:balance}
p{margin:0}
a{color:var(--ink)}
.parts{border-collapse:collapse;font-size:14px;width:100%;max-width:640px}.parts th,.parts td{text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--rule);vertical-align:top}.parts th{font-weight:500;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}.parts td:nth-child(2),.parts td:nth-child(3){font-variant-numeric:tabular-nums}
.rules{display:flex;flex-wrap:wrap;gap:8px 20px;padding:0;margin:4px 0 0;list-style:none;font-size:13px;color:var(--muted)}
.rules li::before{content:"✓ ";color:var(--ok)}
.key{font-size:13px;color:var(--muted)} .key b{color:var(--mark);font-weight:500}
.qlist{margin:0;padding-left:1.2em;display:grid;gap:4px}
nav.toc{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 24px;font-size:14px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding-block:16px}
nav.toc div{display:grid;gap:3px;align-content:start;min-width:0}
nav.toc b{font-weight:600;font-size:13px}
nav.toc b.sub{font-weight:500;color:var(--muted);margin-top:4px}
nav.toc a{color:var(--ink);text-decoration:none}
nav.toc a span,nav.toc b span{color:var(--muted);font-variant-numeric:tabular-nums;font-weight:400}
nav.toc a:hover,nav.toc a:focus-visible{text-decoration:underline}
.wing{display:grid;gap:6px;max-width:70ch;border-top:2px solid var(--ink);padding-top:22px;scroll-margin-top:16px}
.wing h2{font:500 clamp(30px,4vw,40px)/1.1 var(--serif);margin:0;text-wrap:balance}
.part{display:grid;gap:6px;max-width:70ch;border-top:1px solid var(--rule);padding-top:16px;scroll-margin-top:16px}
.part-title{font:500 24px/1.15 var(--serif);margin:0}
.decided{font-size:13px;color:var(--muted);max-width:70ch}.decided summary{cursor:pointer}.decided ul{margin:6px 0 0;padding-left:1.2em}
section.gallery{display:grid;gap:16px;scroll-margin-top:16px}
section.gallery header{display:grid;gap:4px;max-width:70ch}
h3{font:500 26px/1.15 var(--serif);margin:0;text-wrap:balance}
.theme{font-size:16px}
.meta{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.meta .warn{font-style:normal;color:var(--mark)}
.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:18px 12px}
figure{margin:0;display:grid;gap:6px;align-content:start;min-width:0}
figure img{width:100%;max-width:100%;height:auto;aspect-ratio:1;object-fit:cover;display:block;background:var(--card)}
figcaption{font-size:12px;line-height:1.35;display:grid;gap:1px;min-width:0}
figcaption b{font-weight:600}
figcaption span{color:var(--muted)}
figcaption em{font-style:normal;color:var(--mark);font-size:11.5px}
figure.move img{outline:2px dashed var(--mark);outline-offset:3px}
figure.border img{outline:2px dashed var(--mark);outline-offset:3px}
figure.piece img{outline:2px solid var(--ink);outline-offset:3px}
figure.stay figcaption em{color:var(--ok)}
section.extra .wall{grid-template-columns:repeat(auto-fill,minmax(128px,1fr))}
aside.q{background:var(--pin);border:1px solid var(--pin-rule);padding:18px 20px;display:grid;gap:10px;max-width:76ch;scroll-margin-top:16px}
aside.q h4{font:500 22px/1.2 var(--serif);margin:0}
aside.q p{font-size:14.5px}
.decide fieldset{border:0;padding:0;margin:4px 0 0;display:grid;gap:6px}
.decide legend{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:0;margin-bottom:4px}
.decide label{font-size:14px;display:flex;gap:8px;align-items:baseline}
.decide label.free{display:grid;gap:4px;margin-top:4px;font-size:13px;color:var(--muted)}
.decide input[type=text]{font:14px var(--sans);padding:6px 8px;border:1px solid var(--pin-rule);background:var(--card);color:var(--ink);width:100%;max-width:60ch}
.decide input:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.summary{display:grid;gap:10px;max-width:76ch;border-top:2px solid var(--ink);padding-top:22px}
.summary h2{font:500 28px/1.15 var(--serif);margin:0}
.summary textarea{font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%;min-height:200px;padding:10px;border:1px solid var(--rule);background:var(--card);color:var(--ink);box-sizing:border-box}
.summary button{font:500 14px var(--sans);padding:8px 14px;border:1px solid var(--ink);background:var(--card);color:var(--ink);cursor:pointer;justify-self:start}
.summary button:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.summary .status{font-size:13px;color:var(--muted)}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
</style>'''

rows = ''.join(f'<tr><td><a href="#{wid}">{esc(n)}</a></td><td>{c}</td><td>{g}</td><td>{esc(s)}</td></tr>'
               for (wid, _, _), (n, c, g, s) in zip(WINGS, wing_rows))

intro = f'''<div class="intro">
<p class="eyebrow">nnxyz gallery · structure review · all wings · October 15, 2026</p>
<h1>Every work, in its wing, part and room</h1>
<p>All {total} owned works, hung as the structure files now stand: six wings, {gallery_count} rooms, every work in exactly one room except the three set aside below. Works are in the order they were drawn, or in title order for Abstract. Each room is named for what you can see in every work in it.</p>
<p>Five questions are still open. Each sits on the page next to the works it concerns, with a short observation from looking at the walls and a suggested answer. Pick an answer there, then copy the summary at the end of the page back into the chat.</p>
<table class="parts"><tr><th>Wing</th><th>Works</th><th>Rooms</th><th>Status</th></tr>{rows}</table>
<ul class="rules"><li>{total} of {total} owned works shown once</li><li>Every room 20 to 30 works, except where flagged</li><li>Dates in US Central</li></ul>
<p class="key"><b>Dashed outline</b>: a proposed move or an unplaced work, with the note under it. <b>Solid outline</b>: a #0000 collection piece, edition of one.</p>
<p><b>Open questions:</b></p>
<ol class="qlist"><li><a href="#q1">The two Rawblocks landscapes, #64 and #65</a></li><li><a href="#q2">Scribbled Heads at 16 works</a></li><li><a href="#q3">GM, off the Scrimshaw wall</a></li><li><a href="#q4">Where each #0000 hangs</a></li><li><a href="#q5">The empty item 7 in your wing notes</a></li></ol>
</div>'''

summary = '''<div class="summary" id="decisions">
<h2>Your decisions</h2>
<p>Everything picked on this page is collected here. It stays in this browser only; copy it and paste it into the chat.</p>
<textarea id="out" readonly aria-label="Decision summary"></textarea>
<button type="button" id="copy">Copy decisions</button>
<p class="status" id="status"></p>
</div>'''

SCRIPT = r'''<script>
(function(){
  var qs = Array.prototype.slice.call(document.querySelectorAll('aside.q'));
  var out = document.getElementById('out'), status = document.getElementById('status');
  var KEY = 'nnxyz-hanging-plan-decisions';
  function read(){ var d={}; qs.forEach(function(q){ var id=q.dataset.q; var r=q.querySelector('input[type=radio]:checked'); var n=q.querySelector('input[type=text]'); d[id]={choice:r?r.value:'', note:n?n.value:''}; }); return d; }
  function render(){
    var d=read(), lines=['nnxyz hanging plan decisions, '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),''];
    qs.forEach(function(q,i){ var id=q.dataset.q, v=d[id]; lines.push((i+1)+'. '+q.dataset.title); lines.push('   Decision: '+(v.choice||'(not yet decided)')); if(v.note) lines.push('   Note: '+v.note); });
    out.value=lines.join('\n');
    try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){}
  }
  function restore(){
    var d=null; try{ d=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
    if(!d) return;
    qs.forEach(function(q){ var id=q.dataset.q, v=d[id]; if(!v) return;
      q.querySelectorAll('input[type=radio]').forEach(function(r){ r.checked = (r.value===v.choice); });
      var n=q.querySelector('input[type=text]'); if(n) n.value=v.note||''; });
  }
  restore(); render();
  document.addEventListener('change', render); document.addEventListener('input', render);
  document.getElementById('copy').addEventListener('click', function(){
    render();
    function fallback(){ out.focus(); out.select(); status.textContent='Select the text above and copy it.'; }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(out.value).then(function(){ status.textContent='Copied.'; }, fallback); } else { fallback(); }
  });
})();
</script>'''

page = ('<title>nnxyz Hanging Plan</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">\n'
        + CSS + '\n<main>' + intro + '<nav class="toc" aria-label="Wings and rooms">' + ''.join(nav) + '</nav>'
        + ''.join(body) + Q4 + Q5 + summary + '</main>' + SCRIPT)
open(OUT, 'w').write(page)
print(f'{len(page)/1024/1024:.2f} MB, {total} works, {gallery_count} rooms')
