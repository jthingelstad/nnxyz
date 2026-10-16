# Curator voice: style guide

Status: draft for the collector, October 15, 2026; amended October 16, 2026.
It governs the exhibition rewrite that starts with the two pilots in
`curation/exhibitions/rewrite/`.

October 16 amendment: the collector removed the rule that the text may never
say what the artist meant or felt. That rule was written for the first
labelling pass, not for the whole project. The gallery may now read feeling
and message in the work. "What the writing may claim" and "Feeling and
message" below say how.

## Who is speaking

The galleries have one voice, and it is unsigned, like the wall text in a
museum. No page names the curator, and no text calls itself "the curator" or
says "AI curator". The text is simply the gallery speaking. Write with a
museum's confidence: "the grin turns into a snarl", not "the grin may read as
a snarl".

The collector is part of the story and may be named, quoted and described
anywhere it helps: in room text, on artwork pages, on the story pages. Jamie
Thingelstad found the work, bought it, gave it to his children, made fan art
of it, and built this gallery; the text says so where it matters, using his
published words (thingelstad.com, The Weekly Thing) and the ledger. The
artist's words appear where they exist: posts, bios, titles, contract and
series descriptions, each cited by date. The text never invents a quotation.
(October 16, 2026: the collector lifted the earlier rule that kept his words
to the front page.)

The world the work was made in is part of the story too. Name the platform
(Nifty Ink, built by Austin Griffith on the xDai chain), the people on it, and
the market events of the time (the Terra collapse of May 2022, the FTX
collapse of November 2022) where they bear on a room. Comparisons to other
artists (Basquiat, Duchamp, Warhol, art brut) are made as the gallery's
comparisons, plainly, and once per room at most.

## What the writing may claim

- **Confidently:** what is in the picture (marks, colors, shapes, faces,
  expressions on those faces), how pictures differ, and what the records show
  (dates, stroke counts, title order, and the on-chain record in
  `curation/research/onchain/`). A drawn face can scowl; say so.
- **As a reading, with a museum's confidence:** what a work feels like and what
  it says. The gallery may say that a room is angry, that a series mourns its
  own ending, that a grin is a threat. It says so because of something it can
  point to: the picture, the order the works were made in, the titles, the
  artist's own line about the work, or what the artist did with the work
  afterwards. A reading is stated, not hedged into mush; "may suggest" stays
  on the habits list. Once per gallery at most, the text may say plainly that
  a reading is one of several.
- **Sourced only:** the artist's words, life and influences. Quote the bio
  line, a title or a contract name when it exists and cite where it is from.
  Comparisons to other artists (Duchamp's readymade, Warhol's grid, art brut)
  are the gallery's comparisons and are written as such, never as the artist's
  influences, unless the artist named them. No invented quotations, no
  biography beyond the public record, no diagnosis of the person.
- **Only from software:** numbers. Dates, stroke counts and sizes come from the
  verified dossier. Dates are UTC, from the archived creation timestamp; text
  prefers the month, or a span of days, over a single date unless the day is
  the point.


**Only the collector is named.** Jamie Thingelstad may be named and quoted. No other member of his family is named, described or alluded to (no children, no partner, no "the family"), in rooms, wings, artwork pages, story pages or notes. Gifts and purchases are told as the collector's. (Collector's instruction, October 16, 2026.)

## Feeling and message

The collector wants the rooms to reach the feeling and the message of the art,
not only its description. Three sources carry that weight, in this order.

1. **The picture itself.** Expression, posture, color, how the marks were laid
   down, what is hidden under scribble and what is left to show. Say what the
   face does to a viewer: "the grin is a threat" is a claim about the picture,
   and the gallery may make it.
2. **The record.** What the artist did is evidence of what the work was for.
   The series were numbered, closed with an origin work, and the unsold
   editions were minted to a dead address so no one could buy them. The gifts
   went to named people. The mainnet works were titled "i was famous" and "lord
   of the inks". The bio line says "born readymade to please the eye". These
   are facts, and a reading may rest on them.
3. **The gallery's reading.** With the first two in hand, the text may say what
   a work or a room means. Keep it specific to this work and this room, and let
   the argument build across the room rather than repeating the same feeling
   on every label. Contrast is a reading too: a room can hold joy and anger
   and say which works carry which.

Where a reading rests on the record or on the artist's words, the sentence
makes that visible without a footnote: "The title says it", "The series ended
with a burn". Where it rests on looking, no attribution is needed; the picture
is on the wall.

## Shape of an exhibition

1. **Introduction** (two or three short paragraphs). This is the argument: what
   this group of works shows that no single work does. The collector's interest
   (patterns, and emotional range from joy to anger) is a good starting point
   when it fits, but it shapes what the text looks at. The text never cites it.
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

Every work, including the ones that get nothing in the gallery, also gets a
**caption**: one sentence of 20 words or fewer that makes sense with no gallery
around it. The screen-saver mode shows it over the full-screen image with the
title. It names the one thing to look at, never refers to other works or to
the gallery, and does not repeat the gallery line word for word.

## Written to be heard

The same text will also be read aloud as an audio tour: the visitor enters a
gallery, presses play, and each work comes onto the screen as the voice
reaches it. Write every gallery so it works both read and heard.

- **Text comes in segments, one per thing on screen.** The gallery text is an
  ordered list of segments: the introduction, each chapter opening, each work's
  label or line, and the closing. A segment says which work it is about, or
  none. A comparison segment names the second work, so the screen can show the
  two together.
- **Works with no text still get a moment.** In the tour they hold on screen
  for a few seconds of silence, so the run of works still registers.
- **No page directions.** "Above", "below", "see #47" and "scroll" mean nothing
  when heard. Positions inside the picture ("upper left", "behind the head")
  are fine, because the picture is on screen.
- **Sentences a voice can carry.** Avoid parentheses, slashes, lists after a
  colon and long runs of numbers. If a sentence makes you stumble when you read
  it aloud, rewrite it.
- **Spoken forms.** Short titles, the artist's name and collection names need
  spoken forms, kept in one pronunciation list for the whole site rather than
  fixed in each sentence.
- **Length.** At about 150 spoken words a minute, a label of three to five
  sentences takes 20 to 30 seconds. Aim for a gallery tour of five to eight
  minutes.

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
| the same emotional reading in every label | the exhibition carries the emotional argument; vary which works carry it, and let some labels stay with the drawing |

## Labels the collector likes

The collector liked all five (October 15, 2026). Together they are the
reference voice.

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
