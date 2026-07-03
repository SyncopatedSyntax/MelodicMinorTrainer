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
  see `../altered-trainer/CLAUDE.md`. **This copy has not been independently
  re-verified in this repo** — it inherits Altered Trainer's correctness, it
  doesn't re-prove it. There's no `verify.mjs` here.
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
  spelling (degrees + note names), audio playback, jazz rule, example chord,
  and "key rule" (see below).
- **Fretboard** 🎸 — the 5 CAGED positions, 7 three-notes-per-string
  patterns, and a full-neck view for the selected mode + root; tap dots to
  hear notes; switch positions/patterns via buttons below the diagram (no
  sequenced "next position" flow — you jump around freely).
- **Scale Map** 🗺️ — each of the 7 modes' typical chord across diatonic
  degrees i–vii with its jazz rule; "See on neck" jumps to that mode on
  Fretboard.
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

## Before shipping any change
- `npm run build` must pass.
- Any change to `MODES`, `MODE_OFFSETS`, or `CAGED_MM`: re-verify against
  Altered Trainer's source of truth (see Theory above) before shipping.
