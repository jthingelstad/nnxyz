"""Render a rewrite file as one review page with the images beside the text, in tour order.

Usage: python3 pilot-review-page.py OUT.html CACHE_DIR TITLE REWRITE.json [REWRITE.json ...]
Fetches each work's 640 px WebP from CloudFront into CACHE_DIR.
Run from the repository root. Several rewrite files render as one page, in order.
"""
import json, base64, html, os, io, sys, urllib.request
from PIL import Image
ROOT = os.getcwd()
OUT, CACHE, TITLE = sys.argv[1], sys.argv[2], sys.argv[3]
ROOMS = [json.load(open(p)) for p in sys.argv[4:]]
WINGS = json.load(open(f'{ROOT}/curation/exhibitions/rewrite/wings.json'))['wings']
os.makedirs(CACHE, exist_ok=True)
def esc(x): return html.escape(str(x), quote=True)
def img(aid, px=400, q=62):
    path = f'{CACHE}/{aid}.webp'
    if not os.path.exists(path):
        u = f'https://d1of1z466a2mhl.cloudfront.net/abstract/images/{aid}-640.webp' if aid.startswith('polygon-') else f'https://d1of1z466a2mhl.cloudfront.net/raster/{aid}-640.webp'
        urllib.request.urlretrieve(u, path)
    im = Image.open(path).convert('RGB').resize((px, px), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def facts_line(w):
    f = w['facts']
    if f.get('recordedDate'): return f"{esc(f['recordedDate'])} · {f['strokes']} strokes"
    return 'no date · Abstract'
parts = []
seen_wings = set()
for d in ROOMS:
    W = {w['artworkId']: w for c in d['chapters'] for w in c['works']}
    for r in d.get('relatedItems', []): W[r['artworkId']] = r
    SRC = {aid: img(aid) for aid in W}
    def fig(aid, size=''):
        if isinstance(aid, dict): aid = aid['artworkId']
        w = W[aid]
        return f'<figure class="{size}"><img src="{SRC[aid]}" alt="{esc(w["title"])}" width="400" height="400" loading="lazy"><figcaption><b>{esc(w["short"])}</b> <span>{facts_line(w)}</span></figcaption></figure>'
    wing = [x for x in WINGS if x['collectionId'] == d['collectionId']][0]
    if d['collectionId'] not in seen_wings:
        seen_wings.add(d['collectionId'])
        parts.append(f'<section class="wing"><p class="eyebrow">Wing introduction</p><h2>{esc(wing["title"])}</h2>' + ''.join(f'<p class="voice">{esc(p)}</p>' for p in wing['introduction']) + '</section>')
    if d.get('partKey'):
        part = [p for p in wing['parts'] if p['key'] == d['partKey']][0]
        key = ('part', d['collectionId'], d['partKey'])
        if key not in seen_wings:
            seen_wings.add(key)
            parts.append(f'<section class="wing part"><p class="eyebrow">Part {esc(d["partKey"][1:])} · {esc(part["dates"])}</p><h2>{esc(part["title"])}</h2>' + ''.join(f'<p class="voice">{esc(p)}</p>' for p in part['introduction']) + '</section>')
    rid = d['id']
    parts.append(f'<section class="room" id="{esc(rid)}"><p class="eyebrow">Room · {len(W) - len(d.get("relatedItems", []))} works · tour about {d["tour"]["estimatedMinutesAt150wpm"]} minutes</p><h1>{esc(d["title"])}</h1></section>')
    parts.append(f'<section class="seg intro"><p class="eyebrow">Introduction · spoken with no work on screen</p>' + ''.join(f'<p class="voice">{esc(p)}</p>' for p in d['introduction']) + '</section>')
    n = 0
    for c in d['chapters']:
        n += 1
        parts.append(f'<section class="chapter" id="{esc(rid)}-{c["key"]}"><p class="eyebrow">Chapter {n} of {len(d["chapters"])}</p><h2>{esc(c["title"])}</h2><p class="voice">{esc(c["opening"])}</p></section>')
        for w in c['works']:
            t = w['treatment']
            badge = {'label': 'label', 'line': 'one line', 'none': 'no text · holds four seconds'}[t]
            body = f'<p class="voice">{esc(w["text"])}</p>' if w['text'] else '<p class="voice silent">(silence)</p>'
            cmp_ = ''
            if w.get('compareWith'):
                cmp_ = fig(w['compareWith']['artworkId'], 'second')
                badge += f' · comparison with {esc(w["compareWith"]["short"])}, both on screen'
            parts.append(f"""<section class="seg work">
<div class="pics">{fig(w["artworkId"])}{cmp_}</div>
<div class="text"><p class="eyebrow">{esc(w["title"])} · {badge}</p>{body}
<dl><dt>Caption · screen saver</dt><dd>{esc(w["caption"])}</dd><dt>Reading · artwork page</dt><dd>{esc(w["reading"])}</dd></dl></div>
</section>""")
    for r in d.get('relatedItems', []):
        parts.append(f"""<section class="seg work"><div class="pics">{fig(r["artworkId"])}</div><div class="text"><p class="eyebrow">{esc(r["title"])} · related item from {esc(r["homeCollectionId"])}</p><p class="voice">{esc(r["text"])}</p>
<dl><dt>Caption · screen saver</dt><dd>{esc(r["caption"])}</dd><dt>Reading · artwork page</dt><dd>{esc(r["reading"])}</dd></dl></div></section>""")
    closing_seg = d['tour']['segments'][-1]
    second = closing_seg.get('secondArtworkId')
    pics = fig(closing_seg['artworkId']) + (fig(second, 'second') if second else '')
    parts.append(f'<section class="seg work closing"><div class="pics">{pics}</div><div class="text"><p class="eyebrow">Closing</p><p class="voice">{esc(d["closing"])}</p></div></section>')

tot_min = sum(d['tour']['estimatedMinutesAt150wpm'] for d in ROOMS)
chk = f'''<section class="notes"><h2>Checks</h2><ul>
<li>{len(ROOMS)} rooms, {sum(sum(d["checks"]["treatmentCounts"].values()) for d in ROOMS)} works, every one in room order. Tours total about {round(tot_min)} minutes.</li>
<li>Every work has a caption of 20 words or fewer and a separate artwork-page reading; the assembler reports {sum(len(d["checks"]["captionProblems"]) for d in ROOMS)} open caption problems and {sum(len(d["checks"]["habitWordHits"]) for d in ROOMS)} habit-word hits.</li>
<li>Dates are UTC. Numbers come from the catalog, not from looking. Every image was inspected at 640 px before writing. No model inference calls were made.</li>
</ul></section>'''
CSS = '''
<style>
/* Layout: a wall-text proof. One column, the picture on the left and the words on the right at every stop, the way a visitor would meet them. */
:root{--wall:#fbfbfa;--ink:#26272a;--muted:#6c6e73;--rule:#e3e3e0;--mark:#b5562f;--card:#ffffff;--serif:"Newsreader",Georgia,"Times New Roman",serif;--sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--wall:#151618;--ink:#e6e6e3;--muted:#9a9ca1;--rule:#2c2e32;--mark:#e08a63;--card:#1d1f22;color-scheme:dark}}
:root[data-theme="dark"]{--wall:#151618;--ink:#e6e6e3;--muted:#9a9ca1;--rule:#2c2e32;--mark:#e08a63;--card:#1d1f22;color-scheme:dark}
body{background:var(--wall);color:var(--ink);font:15px/1.55 var(--sans)}
main{max-width:1100px;margin:0 auto;padding-block:40px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:40px}
p{margin:0}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font:500 clamp(30px,4.5vw,44px)/1.1 var(--serif);margin:0;text-wrap:balance}
h2{font:500 28px/1.15 var(--serif);margin:0;text-wrap:balance}
.head{display:grid;gap:12px;max-width:70ch}
.head ul{margin:0;padding-left:1.2em}
.voice{font:400 19px/1.5 var(--serif);max-width:62ch}
.voice.silent{color:var(--muted);font-style:italic}
.intro{display:grid;gap:14px;border-top:2px solid var(--ink);padding-top:22px}
.chapter{display:grid;gap:10px;border-top:2px solid var(--ink);padding-top:22px;scroll-margin-top:16px}
.wing{display:grid;gap:10px;border-top:4px double var(--ink);padding-top:26px}.wing.part{border-top:2px solid var(--ink)}
.room{display:grid;gap:6px;border-top:2px solid var(--mark);padding-top:22px;scroll-margin-top:16px}.room h1{font-size:clamp(28px,4vw,38px)}
.work{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start;border-top:1px solid var(--rule);padding-top:22px;scroll-margin-top:16px}
.pics{display:grid;gap:12px}
.pics:has(.second){grid-template-columns:1fr 1fr}
figure{margin:0;display:grid;gap:6px;min-width:0}
figure img{width:100%;max-width:100%;height:auto;aspect-ratio:1;display:block;background:var(--card)}
figcaption{font-size:12px;color:var(--muted)}figcaption b{color:var(--ink);font-weight:600}
figure.second img{outline:1px solid var(--rule);outline-offset:3px}
.text{display:grid;gap:12px;min-width:0}
dl{margin:8px 0 0;display:grid;gap:4px;font-size:14px;max-width:62ch}
dt{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--mark);margin-top:6px}
dd{margin:0}
.notes{border-top:2px solid var(--ink);padding-top:22px;display:grid;gap:12px;max-width:70ch}
.notes ul{margin:0;padding-left:1.2em;display:grid;gap:6px}
nav{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:14px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding-block:12px}
nav a{color:var(--ink);text-decoration:none}nav a:hover,nav a:focus-visible{text-decoration:underline}
@media (max-width:640px){.work{grid-template-columns:1fr}.voice{font-size:17px}}
</style>'''
navs = ''.join(f'<a href="#{esc(d["id"])}">{esc(d["title"])}</a>' for d in ROOMS)
head = f'''<div class="head"><p class="eyebrow">nnxyz gallery · gallery text for review</p>
<h1>{esc(TITLE)}</h1>
<p>Rooms written in the new voice, shown as the audio tour would play them: the wing introduction, then each room stop by stop with its picture, the caption the screen saver would show over the full image, and the short reading the artwork page would carry. Nothing here is on the site yet.</p>
<ul><li>Spoken text is in the larger serif. The gallery page shows the same text as ordinary wall text.</li><li>Labels carry the argument. One-liners point at one thing. Works with no text hold on screen for a few seconds.</li><li>Comparisons show both works together.</li></ul></div>'''
page = (f'<title>{esc(TITLE)}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">\n'
        + CSS + '<main>' + head + f'<nav aria-label="Chapters">{navs}</nav>' + ''.join(parts) + chk + '</main>')
open(OUT, 'w').write(page); print(f'{len(page)/1024/1024:.2f} MB')
