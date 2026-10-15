"""Assemble a rewrite file from a content module and the locked structure.

Usage: python3 curation/exhibitions/rewrite/working/assemble.py CONTENT.py
Run from the repository root. CONTENT.py defines WING (structure file stem),
PART (part key or ''), GALLERY (gallery key), INTRO (list of paragraphs),
CHAPTERS (list of dicts: key, title, opening, works=[dict(short, treatment,
text?, compare?, caption, reading)]) and CLOSING. Works must appear in the
room's recorded order. The output goes to curation/exhibitions/rewrite/
<wing>--<part>--<gallery>.json (or <wing>--<gallery>.json without a part).
"""
import json, datetime, re, sys, os, importlib.util, collections
ROOT = os.getcwd()
spec = importlib.util.spec_from_file_location('content', sys.argv[1])
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)

G = {w['inkId']: w for w in json.load(open(f'{ROOT}/data/gallery.json'))}
A = {w['id']: w for w in json.load(open(f'{ROOT}/data/abstract.json'))['artworks']}
S = json.load(open(f'{ROOT}/curation/exhibitions/structure/{C.WING}.json'))
if C.PART:
    part = [p for p in S['parts'] if p['key'] == C.PART][0]; gals = part['galleries']
else:
    gals = S['galleries']
gal = [g for g in gals if g['key'] == C.GALLERY][0]
PREFIXES = ('nnxyz nifty faces ', 'nnxyz nnotb ', 'nnxyz rawblocks ', 'nnxyz abstract ', 'nnxyz ')
def short(t):
    for p in PREFIXES:
        if t.startswith(p): return t[len(p):]
    return t
BY = collections.OrderedDict()
for w in gal['works']:
    k = short(w['title'])
    if k in BY: k = k + ' (' + w['recordedAt'][11:16] + ')'  # repeated title: disambiguate by time
    BY[k] = w
order = list(BY)
placed = [w['short'] for c in C.CHAPTERS for w in c['works']]
assert placed == order, f'order mismatch\n placed {placed}\n room   {order}'

def facts(w):
    aid = w['artworkId']
    if aid in G:
        x = G[aid]; return dict(recordedAt=w['recordedAt'], recordedDate=w['recordedDate'], strokes=x['strokes'], points=x['points'])
    x = A[aid]; return dict(recordedAt=None, recordedDate=None, width=x['width'], height=x['height'])

chapters = []
for c in C.CHAPTERS:
    works = []
    for w in c['works']:
        src = BY[w['short']]
        item = dict(artworkId=src['artworkId'], title=src['title'], short=w['short'], treatment=w['treatment'],
                    text=w.get('text'), caption=w['caption'], reading=w['reading'], facts=facts(src))
        assert (item['text'] is None) == (w['treatment'] == 'none'), w['short']
        if w.get('compare'):
            item['compareWith'] = dict(artworkId=BY[w['compare']]['artworkId'], short=w['compare'])
        works.append(item)
    chapters.append(dict(key=c['key'], title=c['title'], opening=c['opening'], works=works))

segs = [dict(kind='introduction', artworkId=None, text=p) for p in C.INTRO]
for c in chapters:
    segs.append(dict(kind='chapter', chapter=c['key'], artworkId=c['works'][0]['artworkId'], text=c['opening']))
    for w in c['works']:
        s = dict(kind='work', artworkId=w['artworkId'], treatment=w['treatment'], text=w['text'])
        if w['treatment'] == 'none': s['holdSeconds'] = 4
        if w.get('compareWith'): s['kind'] = 'comparison'; s['secondArtworkId'] = w['compareWith']['artworkId']
        segs.append(s)
closing = dict(kind='closing', artworkId=chapters[-1]['works'][-1]['artworkId'], text=C.CLOSING)
if getattr(C, 'CLOSING_SECOND', None): closing['secondArtworkId'] = BY[C.CLOSING_SECOND]['artworkId']
segs.append(closing)

def words(t): return len(re.findall(r"[A-Za-z0-9#']+", t))
problems = []
for c in chapters:
    for w in c['works']:
        if words(w['caption']) > 20: problems.append(f"caption {w['short']} has {words(w['caption'])} words")
        if w['text'] and w['caption'].rstrip('.') in w['text']: problems.append(f"caption repeats the line for {w['short']}")
        for t in (w['text'] or '', w['reading']):
            if re.search(r'\b(scroll|see #|the (work|label|text|image|picture) (above|below)|^(Above|Below)\b)', t):
                problems.append(f"page direction in {w['short']}")
HABITS = ['reads as', 'can read as', 'may suggest', 'rather than', 'pushes forward', 'pulls the eye', 'pressure', 'tension', 'holds both', 'refuses to settle', 'without resolving', 'explores', 'the artist', 'nnxyz wanted']
alltext = ' '.join(s['text'] for s in segs if s['text']) + ' ' + ' '.join(w['reading'] + ' ' + w['caption'] for c in chapters for w in c['works'])
habit_hits = {h: len(re.findall(re.escape(h), alltext, re.I)) for h in HABITS if re.search(re.escape(h), alltext, re.I)}
spoken = sum(words(s['text']) for s in segs if s['text']); holds = sum(s.get('holdSeconds', 0) for s in segs)
counts = {t: sum(1 for c in chapters for w in c['works'] if w['treatment'] == t) for t in ('label', 'line', 'none')}
starts = collections.Counter((w['text'] or '').split(' ')[0] for c in chapters for w in c['works'] if w['text'])

out = dict(
    schemaVersion=1,
    id=f'{C.WING}--{C.PART}--{C.GALLERY}' if C.PART else f'{C.WING}--{C.GALLERY}',
    collectionId=S['collectionId'], partKey=C.PART or None, galleryKey=C.GALLERY,
    structureFile=f'curation/exhibitions/structure/{C.WING}.json', title=gal['title'],
    status='draft-for-collector-review',
    writtenAt=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    voice='Unsigned gallery voice; curation/voice/style-guide.md',
    dateBasis='UTC, from the archived creation timestamp' if any(w['facts']['recordedAt'] for c in chapters for w in c['works']) else 'No per-work dates; title order',
    method='Every work in the room was inspected directly from the published WebP at 640 px in room order and as one wall before writing. Numbers come from data/gallery.json or data/abstract.json. No model inference calls were made; the text was written by the assistant in the session.',
    scope=f'The owned subset: the {len(order)} works the locked structure places in this room, in room order.',
    introduction=list(C.INTRO), chapters=chapters, closing=C.CLOSING,
    tour=dict(segments=segs, spokenWords=spoken, silentHoldSeconds=holds, estimatedMinutesAt150wpm=round(spoken / 150 + holds / 60, 1), spokenFormsFile='curation/voice/pronunciation.json'),
    checks=dict(treatmentCounts=counts, captionMaxWords=20, captionProblems=problems, habitWordHits=habit_hits, lineOpeners=dict(starts.most_common(4)),
                everyWorkHasCaptionAndReading=all(w['caption'] and w['reading'] for c in chapters for w in c['works'])),
)
p = f"{ROOT}/curation/exhibitions/rewrite/{out['id']}.json"
json.dump(out, open(p, 'w'), indent=2, ensure_ascii=False); open(p, 'a').write('\n')
print(out['id'], json.dumps(out['checks']), spoken, 'words', out['tour']['estimatedMinutesAt150wpm'], 'min')
