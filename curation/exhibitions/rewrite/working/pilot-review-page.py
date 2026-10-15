"""Render a rewrite file as one review page with the images beside the text, in tour order.

Usage: python3 pilot-review-page.py REWRITE.json OUT.html [CACHE_DIR]
Fetches each work's 640 px WebP from CloudFront into CACHE_DIR (default /tmp/nnxyz-thumbs-640).
Run from the repository root.
"""
import json, base64, html, os, io, sys, urllib.request
from PIL import Image
ROOT = os.getcwd()
d = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
CACHE = sys.argv[3] if len(sys.argv) > 3 else '/tmp/nnxyz-thumbs-640'
os.makedirs(CACHE, exist_ok=True)
def esc(x): return html.escape(str(x), quote=True)
def img(aid, px=520, q=68):
    path = f'{CACHE}/{aid}.webp'
    if not os.path.exists(path):
        urllib.request.urlretrieve(f'https://d1of1z466a2mhl.cloudfront.net/raster/{aid}-640.webp', path)
    im = Image.open(path).convert('RGB').resize((px, px), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
W = {w['artworkId']: w for c in d['chapters'] for w in c['works']}
SRC = {aid: img(aid) for aid in W}

def fig(aid, size=''):
    w = W[aid]
    return f'<figure class="{size}"><img src="{SRC[aid]}" alt="{esc(w["title"])}" width="520" height="520" loading="lazy"><figcaption><b>{esc(w["short"])}</b> <span>{esc(w["facts"]["recordedDate"])} · {w["facts"]["strokes"]} strokes</span></figcaption></figure>'

parts = []
parts.append(f'<section class="seg intro"><p class="eyebrow">Introduction · spoken with no work on screen</p>' + ''.join(f'<p class="voice">{esc(p)}</p>' for p in d['introduction']) + '</section>')
n = 0
for c in d['chapters']:
    n += 1
    parts.append(f'<section class="chapter" id="{c["key"]}"><p class="eyebrow">Chapter {n} of {len(d["chapters"])}</p><h2>{esc(c["title"])}</h2><p class="voice">{esc(c["opening"])}</p></section>')
    for w in c['works']:
        t = w['treatment']
        badge = {'label': 'label', 'line': 'one line', 'none': 'no text · holds four seconds'}[t]
        body = f'<p class="voice">{esc(w["text"])}</p>' if w['text'] else '<p class="voice silent">(silence)</p>'
        cmp_ = ''
        if w.get('compareWith'):
            cmp_ = fig(w['compareWith']['artworkId'], 'second')
            badge += f' · comparison with {esc(w["compareWith"]["short"])}, both on screen'
        parts.append(f'''<section class="seg work" id="w-{esc(w["short"].strip("#"))}">
<div class="pics">{fig(w["artworkId"])}{cmp_}</div>
<div class="text"><p class="eyebrow">{esc(w["title"])} · {badge}</p>{body}
<dl><dt>Caption · screen saver</dt><dd>{esc(w["caption"])}</dd><dt>Reading · artwork page</dt><dd>{esc(w["reading"])}</dd></dl></div>
</section>''')
first = d['chapters'][0]['works'][0]['artworkId']; last = d['chapters'][-1]['works'][-1]['artworkId']
parts.append(f'<section class="seg work closing"><div class="pics">{fig(last)}{fig(first, "second")}</div><div class="text"><p class="eyebrow">Closing · the last and the first cat on screen</p><p class="voice">{esc(d["closing"])}</p></div></section>')

ck = d['checks']; tour = d['tour']
chk = f'''<section class="notes"><h2>Checks</h2><ul>
<li>{len(W)} works, every one in recorded order; {ck["treatmentCounts"]["label"]} labels, {ck["treatmentCounts"]["line"]} one-liners, {ck["treatmentCounts"]["none"]} with no text.</li>
<li>Every work has a caption of 20 words or fewer and a separate artwork-page reading. {"No caption problems." if not ck["captionProblems"] else esc(ck["captionProblems"])}</li>
<li>Habit words from the style guide (reads as, rather than, pushes, pulls, pressure, tension, holds both): {"none found." if not ck["habitWordHits"] else esc(ck["habitWordHits"])}</li>
<li>Tour: {tour["spokenWords"]} spoken words plus {tour["silentHoldSeconds"]} seconds of holds, about {tour["estimatedMinutesAt150wpm"]} minutes at 150 words a minute. The style guide asks for five to eight; this room has 28 works.</li>
<li>Dates are UTC. Numbers come from the catalog, not from looking.</li>
<li>Every image was inspected at 640 px before writing. No model inference calls were made.</li>
<li>Spoken forms proposed in the pronunciation list: number signs read as "number", SCAFFOLD ETH, X eyes.</li>
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
navs = ''.join(f'<a href="#{c["key"]}">{esc(c["title"])}</a>' for c in d['chapters'])
head = f'''<div class="head"><p class="eyebrow">nnxyz gallery · New Nifty on the Block · part 1 · pilot text for review</p>
<h1>Black Silhouettes</h1>
<p>The first room written in the new voice, shown as the audio tour would play it: each stop with its picture, then the caption the screen saver would show over the full image and the short reading the artwork page would carry. Nothing here is on the site yet.</p>
<ul><li>Spoken text is in the larger serif. The gallery page shows the same text as ordinary wall text.</li><li>Labels carry the argument. One-liners point at one thing. Works with no text hold on screen for a few seconds.</li><li>Comparisons show both works together.</li></ul></div>'''
page = ('<title>Black Silhouettes Pilot</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">\n'
        + CSS + '<main>' + head + f'<nav aria-label="Chapters">{navs}</nav>' + ''.join(parts) + chk + '</main>')
open(OUT, 'w').write(page); print(f'{len(page)/1024/1024:.2f} MB')
