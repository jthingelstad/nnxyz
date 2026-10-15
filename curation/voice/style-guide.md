# Curator voice: style guide

Status: draft for the collector, October 15, 2026. It governs the exhibition
rewrite that starts with the two pilots in `curation/exhibitions/rewrite/`.

## Who is speaking

The galleries have one voice: the AI curator's. Each gallery page and artwork
page says so once ("AI curator"), and one site-wide note explains what that
means: the readings are the AI curator's, made by looking at the images and the
archived records, not statements from the artist. Because that note exists,
sentences do not hedge one by one. Write "the grin turns into a snarl", not
"the grin may read as a snarl".

The collector's own words appear only as quotations, attributed, from
`curation/collector-perspective.json`. Never paraphrase the collector into the
curator's voice, and never put words in the artist's mouth.

## What the writing may claim

- **Confidently:** what is in the picture (marks, colors, shapes, faces,
  expressions on those faces), how pictures differ, and what the records show
  (dates, stroke counts, title order). A drawn face can scowl; say so.
- **Never:** what the artist meant, felt or was influenced by. No "the artist
  explores", no "nnxyz wanted". Nothing about the artist's life.
- **Only from software:** numbers. Dates, stroke counts and sizes come from the
  verified dossier, and are converted to US Central.

## Shape of an exhibition

1. **Introduction** (two or three short paragraphs). This is the argument: what
   this group of works shows that no single work does. Use the collector's
   interest (patterns, and emotional range from joy to anger) as the starting
   point when it fits. It usually does.
2. **Chapters** (three to five). Each one opens with one or two sentences that
   move the argument forward. A chapter title names what you will see, not a
   theme.
3. **Works.** Not every work gets the same treatment:
   - about one in four gets a **label**: three to five sentences, the works
     that carry the argument;
   - most get **one line**: a single sentence pointing at the one thing to see;
   - a few get **nothing** beyond the title, when the work is there to be part
     of a run and the chapter text has already said why.
4. **Comparisons** only where the change is the point. One or two per chapter at
   most. Name the earlier work by its short title ("#47"), never the full
   "nnxyz nifty faces #47", and never in a pattern repeated stop after stop.
5. **Closing** (two or three sentences). Send the visitor back to look again at
   something specific.

The artwork page gets its own short reading, written in the same session as the
gallery text. It covers what the gallery text leaves out (a closer look at the
one work) and does not repeat the gallery's sentence.

## Sentences

- Lead with the thing seen. "Two rows of teeth" beats "The composition features
  two rows of teeth".
- One idea per sentence. Short sentences are fine; so is the occasional long
  one when it follows the eye across the picture.
- Plain words. A visitor who has never read art criticism should not stumble.
- Vary how labels start. If three labels in a row start with the ground color,
  change two.

### Habits from the first pass to drop

These are not banned words. They became habits because every one of the 574
labels was written alone, and the review aid in `tools/audit-curation-language.py`
counts them. In the first pass "reads as" was in 49% of labels and "rather than"
in 38%.

| Habit | Instead |
| --- | --- |
| "reads as", "can read as", "may suggest" | say what it is, or what it does |
| "X rather than Y" | say X |
| "pushes forward", "pulls the eye", "pressure", "tension" | name the specific thing that draws attention, and why |
| "holds both A and B at once", "refuses to settle", "without resolving" | pick the stronger reading, or say plainly that the face is ambiguous, once per exhibition at most |
| "nnxyz nifty faces #87's X; nnxyz nifty faces #47's Y" | a comparison only where it matters, with short titles |
| emotional readings in every label | the exhibition carries the emotional argument; individual labels can stay with the drawing |

## Labels the collector likes

The collector should choose three or four of these as the reference voice; the
rest get removed from this guide.

1. **New Nifty on the Block #1 fork.** "Heads and raised, limb-like forms
   compete for space in a dense weave of colored marks. Teeth recur at different
   sizes, while broad cyan passages keep small openings between the figures. The
   drawing alternates between recognizable characters and almost illegible
   crossings. Looking becomes a process of finding a face, losing it, and
   finding another."
2. **Stick Together.** "Five upright figures stand close together, their long
   colored bodies filling the square. Thin lines cross between them, while
   differences in facial marks and color keep each figure distinct. Loops above
   their heads repeat the same gesture across the group."
3. **New Nifty on the Block #26.** "A small, contained figure holds its ground in
   deep black space, its raised hand the only outward gesture. White and orange
   lines run along bones and surfaces like cracks letting light through, giving
   the dark shell a fragile quality. The doubled skull form, head above and
   pelvis below, creates an internal echo."
4. **Scrimshaw6.** "A large head nearly fills the square, assembled from thick
   red, black and yellow lines. Its eyes receive different frames: a purple ring
   on one side and orange loops on the other. Yellow and blue ovals organize the
   dark mouth into repeated rows."
5. **Trio1.** "Three narrow figures stand together in a field of orange, their
   upright bodies assembled from red, blue, white and yellow lines. Looking can
   alternate between three characters and one interwoven pattern."

(Trimmed from the catalog text; the hedged closing sentences are left out on
purpose.)

## How the work is done

- One session writes one whole exhibition. It looks at every work in it, the
  collection map, the dossiers and the running list of what other exhibitions
  have already said.
- An editing pass then reads the whole site in page order and removes repeats
  across exhibitions.
- The repetition count is a review aid, not a word ban.
- Old text and its evidence stay in place. Rewrites live in
  `curation/exhibitions/rewrite/` and override the earlier text only for the
  galleries they cover.
