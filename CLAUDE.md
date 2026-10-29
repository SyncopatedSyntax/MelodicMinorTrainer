# Melodic Minor Trainer — project context

A single-file React PWA that teaches all **seven melodic minor modes** — the
seven scales derived from one melodic-minor parent, each with its own jazz
context and chord application. Explore a mode across 5 CAGED positions,
3-notes-per-string patterns, and a full-neck view; a **Chord-Scale Map** shows
which mode fits which diatonic degree (i–mMaj7, ii–7sus(b9), bIII–Maj7#5,
IV–7#11, V–7b13, vi–ø, vii–7alt); a quiz drills mode recognition and
application. Sibling to ChordTrainer, DiatonicChordsTrainer, AlteredTrainer,
Circle of Fifths, Triad Trainer in the **Fretworks** toolbox. Single dev +
end user: Zak.

- Toolbox-wide conventions (git-dep workflow, multi-zone, single PWA,
  verify-in-prod, naming): `../CLAUDE.md`.

## Integration
- Single-file React (`App.jsx`, ~670 lines), Vite `base: '/melodic-minor/'`,
  served as a Vercel zone with an old-domain redirect.
- Registered in `@fretworks/design` `tools.js`: `key:"mm"`, `name:"Melodic
  Minor Trainer"`, `path:"/melodic-minor/"`, **accent blue `#74b9ff`**.
- Inline styles, no CSS files, `@fretworks/design` git dependency.
- No separate theory file — all logic inline in `App.jsx`.

## Theory — verified, but inherited rather than independently re-derived here
- `MODE_OFFSETS = [0,2,3,5,7,9,11]` — each mode's interval offset within the
  parent melodic-minor scale. `MODES` (7 objects) carries each mode's
  intervals, `degMap` (pitch-class → degree label), typical chord, colour,
  jazz-usage rule, and an example.
- `CAGED_MM` — 5 hardcoded fretboard positions, **ported from Altered
  Trainer's `CAGED_MM`** (code comment: "verified from AlteredTrainer's
  CAGED_MM"). That original was transcribed dot-for-dot from a reference
  chart and checked (all 84 dots against C-melodic-minor pitch classes) —
  see `../altered-trainer/CLAUDE.md`. `npm run verify` pins this copy to
  **the same checksum** Altered's verify.mjs pins, so the two cannot drift,
  and checks every dot is in C melodic minor.
- **The five shapes are named the CAGED way**, like the Natural Minor
  Trainer's: `CAGED_NAME = ['A','G','E','D','C']` (one per `CAGED_MM` index)
  names each after the minor chord shape it is built around, and in any key
  they climb the neck E, D, C, A, G (`SHAPE_IDS`). Two independent checks
  agree in all 12 keys: each pattern holds exactly one open-minor grip (typed
  into verify.mjs by hand) and it is its namesake, and each sits on the same
  roots as the natural minor chart of that name. The name is attached
  **before** the neck-order sort — they used to be "Position 1–5" numbered
  after sorting, so the shape under a number changed with the key (the bug
  Altered fixed). The Fretboard tab keeps the selected shape by name, so
  changing key or mode keeps it; 3nps patterns keep their number.
- Modes 2–7 use their **parent** melodic minor's shapes, so the label says
  so: C Altered shows "E shape (C# melodic minor)", as the scale trainers
  show "A shape (F major)".
- Generated at runtime (not hardcoded): `getParentPc()` finds the parent
  melodic-minor root for a given mode + mode-root; `getBoxPositions()`
  transposes the 5 CAGED patterns to any root and relabels each dot with the
  mode's degree; `getTnpsPositions()` builds 7 three-notes-per-string
  patterns from the parent scale's pitch classes; `getFullNeck()` marks every
  scale tone across a 16-fret neck.
- Before changing `MODES`, `MODE_OFFSETS`, or `CAGED_MM`: write a Node script
  that re-derives each position's pitch classes from first principles and
  checks them — same standard as the rest of the toolbox. Don't "correct"
  `CAGED_MM` without first checking it against Altered Trainer's own
  verification, since the two are meant to stay in sync.

## Tabs
- **Modes** 🎼 — browse all 7 modes by name/colour/intervals; tap one for its
  spelling (degrees + note names), a root-to-root scale playback ("▶ Root →
  Root", one octave, tonic to tonic — `mode.intervals` always starts at 0/'R'
  so this needs no separate span logic), jazz rule, example chord, and "key
  rule" (see below).
- **Fretboard** 🎸 — (string names: low E at the bottom, high e on top. The
  `Fretboard` prints `STR_LABELS[r]` on row `5-r`; printing `STR_LABELS[5-r]`
  there turned every name upside down against its dots until October 2026.)
  The 5 CAGED positions, 7 three-notes-per-string
  patterns, and a full-neck view for the selected mode + root; tap dots to
  hear notes; switch positions/patterns via buttons below the diagram (no
  sequenced "next position" flow — you jump around freely). Two playback
  modes per position/pattern: **"▶ Play this shape"** (every dot, lowest to
  highest fret) and **"▶ Root → Root"** (`getRootSpans()` finds the shape's
  root-note occurrences and plays just one octave, tonic to tonic, so the
  mode's sound is unambiguous). A shape with 2 root occurrences gets one
  Root→Root button; 3 occurrences (root doubles on the low-E/high-e strings)
  gets two, labelled "(low)"/"(high)" for each octave span. Hidden in
  Full-neck view (too many roots across 16 frets for a clean span). All
  scale/shape playback uses a 0.22s note gap (slower, deliberate pace so
  individual notes are distinguishable — not the same speed as a strum).
- **Scale Map** 🗺️ — the 7 diatonic 7th chords of melodic minor (i m(maj7),
  ii m7, ♭III maj7♯5, IV7, V7, vi ø, vii ø) with each mode's jazz rule. Tap a
  card to reveal **how to play the chord**: a compact 4-note grip pulsing
  inside its scale position, a **▶ Play chord** button, and **"See on neck"**
  (jumps to that mode + the chord's root on Fretboard). Uses the shared
  `Fretboard` with a new `highlightCells` prop — matching {s,f} dots pulse,
  the rest of the scale dims. Respects the Degrees/Notes header toggle
  (`labelMode` is threaded through). The grips reproduce Zak's melodic-minor
  chord chart (`CHORD_MAP` + `chartChordVoicing()`): **root on the 5th (A)
  string**, other tones on D/G/B, outer strings unused — derived from the
  verified scale (not hand-transcribed), so they can't go out of key.
  `CHORD_MAP.tones` are labelled in each **mode's** own degree vocabulary
  (the box is built on the chord root), so vii's ♭3/♭5 read as ♯9/♯11 — the
  altered scale's spelling of the same Aø pitches. **ii uses a natural 5**
  (a plain m7); the chart draws a ♭5 there, but that note is out of the key,
  so we correct it (the chart's ii⁻7 label agrees).
- **Quiz** 🎯 — 7 hardcoded mode-application questions; shuffle, answer,
  grade yourself. No persistence — every attempt is a fresh shuffle.
- **Guide** 📖 — collapsible help sections on mode names, intervals, usage,
  jazz rules.

## "Key rules" are mnemonics, not live logic
Each mode shows a **rule for finding its parent key** relative to the chord
you're playing over — e.g. Altered = "half step above the chord root", Lydian
Dominant = "perfect 4th below", Locrian #2 = "minor 3rd above" (marked with
an ↑). The app **displays** these rules; it does not compute or enforce the
transposition for you — the player works out the parent key mentally. Don't
build a "live transpose" feature without checking whether that changes the
pedagogy here (the rules are meant to be memorised, not looked up).

## Audio
iOS silent-switch bypass: the toolbox-standard **two-layer fix** (audioSession
'playback' on iOS 16.4+, plus a looping silent `<audio>` fallback for older
iOS) sits at the top of the audio block; every play path routes through
`playMidis() → unlockAudio()`. See root `CLAUDE.md → Audio`; reference
implementation in `Chord-Trainer/App.jsx`. Don't regress to a fire-once MP3.
Also carries the shared bus + gentle limiter (`getBus()`) and idle-suspend
(`bumpIdle()`, in `playMidis`) — rapid taps don't swell, and iOS drops "now
playing" once quiet (root `CLAUDE.md → Audio`).

## Not built yet
- **No spaced repetition.** Every visit to Modes/Fretboard/Quiz is fresh —
  no `nextDue`/`interval` scheduling, no per-card history. `localStorage` is
  used only for persistent *preferences* (last root key, label mode,
  selected mode ID), not progress. If SRS is added later, follow the
  toolbox's SM-2 pattern with an `mm_*` key prefix.
- No editor, no multi-page Vite setup — single `index.html` + one component.

## Settings are read synchronously

`mm_root`, `mm_label` and `mm_mode` are read in the `useState` initialisers.
They used to load in an async effect, which yielded at its first `await`;
the save effects then wrote the defaults and the loader read those back, so
Degrees/Notes and the mode were lost on every reload (only the key, read
before the yield, survived) — the trap Altered Trainer's CLAUDE.md
describes. Do not move them back into an async loader.

The caption over the key buttons follows the tab, because the key means
different things: the mode's own root on Fretboard ("Root · C Altered
Scale"), the root every mode starts on in Modes ("Root · C"), the parent
key on Scale Map ("Key · C melodic minor"). It used to read "C melodic
minor" everywhere, including over C Altered.

## Before shipping any change
- `npm run verify` and `npm run build` must pass. verify.mjs lifts the data
  and helpers out of App.jsx by name and checks the modes, the shapes and
  their names, the 3nps patterns and the Scale Map grips in every key.
- Any change to `MODES`, `MODE_OFFSETS`, or `CAGED_MM`: re-verify against
  Altered Trainer's source of truth (see Theory above) before shipping.
