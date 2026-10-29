// Correctness gate for the modes, the five CAGED shapes and their names, the
// 3-notes-per-string patterns and the Scale Map grips: `npm run verify`.
//
// Everything lives in App.jsx, so this lifts the data and the pure helpers out
// of it by name and checks them against melodic minor and the minor chord
// grips typed out again here — never against the app's own tables, which
// would only prove they agree with themselves.
import fs from 'fs';

const SRC = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

// The source of a top-level `const NAME = …;` or `function NAME(…) {…}`.
function lift(name) {
  const m = new RegExp(`\\n(const ${name}\\s*=\\s*|function ${name}\\s*\\()`).exec(SRC);
  if (!m) throw new Error(`${name} not found in App.jsx`);
  const isFn = m[1].startsWith('function');
  let i = isFn ? SRC.indexOf('{', m.index + m[0].length) : m.index + m[0].length;
  let depth = 0, str = null;
  for (; i < SRC.length; i++) {
    const c = SRC[i], d = SRC[i + 1];
    if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
    if (c === '/' && d === '/') { i = SRC.indexOf('\n', i) - 1; continue; }
    if (c === '/' && d === '*') { i = SRC.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) { depth--; if (isFn && depth === 0) { i++; break; } }
    else if (!isFn && depth === 0 && c === ';') { i++; break; }
  }
  return SRC.slice(m.index + 1, i);
}
const NAMES = ['NOTE_NAMES', 'OPEN_MIDI', 'pc', 'MODE_OFFSETS', 'CAGED_MM', 'MODES', 'getParentPc', 'transposeShape',
  'CAGED_NAME', 'SHAPE_IDS', 'getBoxPositions', 'getTnpsPositions', 'getFullNeck', 'getRootSpans',
  'findVoicing', 'pickChordVoicing', 'chartChordVoicing', 'CHORD_MAP', 'QUIZ_Q'];
const app = new Function(`${NAMES.map(lift).join('\n')}\nreturn { ${NAMES.join(', ')} };`)();

// ── Ground truth, typed here ────────────────────────────────────────────────
const OPEN = [40, 45, 50, 55, 59, 64];                    // E A D G B e
const MEL_MINOR = [0, 2, 3, 5, 7, 9, 11];
const pc = n => ((n % 12) + 12) % 12;
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
// Acceptable names for each interval above a mode's root.
const DEG_OK = { 0: ['R'], 1: ['b9', 'b2'], 2: ['2', '9'], 3: ['b3', '#9'], 4: ['3'], 5: ['4', '11'], 6: ['#11', 'b5', '#4'], 7: ['5'], 8: ['#5', 'b13', 'b6'], 9: ['6', '13'], 10: ['b7'], 11: ['7'] };
// The open minor chord grips the five shapes are named after, low E → high e
// as played in their open keys (null = not played).
const GRIPS = {
  E: { key: 4, frets: [0, 2, 2, 0, 0, 0] },        // Em
  D: { key: 2, frets: [null, null, 0, 2, 3, 1] },  // Dm
  C: { key: 0, frets: [null, 3, 1, 0, 1, null] },  // Cm, C shape
  A: { key: 9, frets: [null, 0, 2, 2, 1, 0] },     // Am
  G: { key: 7, frets: [3, 1, 0, 0, 3, 3] },        // Gm, G shape
};

let n = 0;
const fails = [];
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
let mark = 0;
const section = name => { console.log(`\n${name}`); mark = fails.length; };
const done = label => { console.log(`  ${fails.length > mark ? '✗' : '✓'} ${label}`); mark = fails.length; };

section('the shape data');
{
  // The same pin as Altered Trainer's verify.mjs: this copy must stay identical
  // to the one that was transcribed from Zak's chart and checked dot for dot.
  const dots = app.CAGED_MM.reduce((t, p) => t + Object.values(p).reduce((m, a) => m + a.length, 0), 0);
  check(app.CAGED_MM.length === 5 && dots === 84, `CAGED_MM has ${app.CAGED_MM.length} patterns, ${dots} dots`);
  const sum = JSON.stringify(app.CAGED_MM).split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  check(sum === 300970779, 'CAGED_MM checksum differs from Altered Trainer\'s verified copy');
  for (let i = 0; i < 5; i++) for (let s = 0; s < 6; s++) for (const [f] of app.CAGED_MM[i][s] || [])
    check(MEL_MINOR.includes(pc(OPEN[s] + f)), `CAGED_MM[${i}] string ${s} fret ${f} is not in C melodic minor`);
  done('five patterns, 84 dots, identical to Altered Trainer\'s, every dot in C melodic minor');
}

section('modes');
for (const m of app.MODES) {
  const off = MEL_MINOR[m.id - 1];
  const want = MEL_MINOR.map(i => pc(i - off)).sort((a, b) => a - b);
  check(app.MODE_OFFSETS[m.id - 1] === off, `mode ${m.id}: offset`);
  check(JSON.stringify(m.intervals) === JSON.stringify(want), `mode ${m.id} ${m.name}: intervals ${m.intervals}, want ${want}`);
  check(JSON.stringify(Object.keys(m.degMap).map(Number).sort((a, b) => a - b)) === JSON.stringify(want), `mode ${m.id}: degree map keys`);
  for (const [iv, d] of Object.entries(m.degMap)) check(DEG_OK[iv].includes(d), `mode ${m.id} ${m.name}: ${iv} semitones named ${d}`);
  check(m.formula.split(' ').join() === m.intervals.map(i => m.degMap[i]).join(), `mode ${m.id}: formula "${m.formula}"`);
  const ex = m.example.chord.match(/^([A-G])([b#]?)/);
  check(pc({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[ex[1]] + (ex[2] === '#' ? 1 : ex[2] === 'b' ? -1 : 0)) === m.example.chordRoot, `mode ${m.id}: example ${m.example.chord}`);
}
done('seven modes: intervals, degree names and formulas from the melodic minor scale');

section('shape names');
{
  check(new Set(app.CAGED_NAME).size === 5 && app.CAGED_NAME.every(x => x in GRIPS), `CAGED_NAME ${app.CAGED_NAME}`);
  for (const [nme, g] of Object.entries(GRIPS)) {
    const ivs = g.frets.map((f, s) => f == null ? null : pc(OPEN[s] + f - g.key)).filter(x => x != null);
    check(ivs.every(x => [0, 3, 7].includes(x)) && ivs.includes(3), `the typed ${nme}m grip is not a minor triad`);
  }
  // Each pattern (in C) holds exactly one of the five open-minor grips, at some
  // octave — and it is the one in its name.
  for (let i = 0; i < 5; i++) {
    const cells = new Set(); for (let s = 0; s < 6; s++) for (const [f] of app.CAGED_MM[i][s] || []) cells.add(`${s}_${f}`);
    const holds = Object.entries(GRIPS).filter(([, g]) => [-24, -12, 0, 12, 24].some(sh => g.frets.every((f, s) => f == null || cells.has(`${s}_${f + pc(-g.key) + sh}`)))).map(([k]) => k);
    check(holds.length === 1 && holds[0] === app.CAGED_NAME[i], `CAGED_MM[${i}] is named ${app.CAGED_NAME[i]} but holds ${holds.join(', ') || 'no grip'}`);
  }
  done('each shape holds exactly one open minor grip, and it is the one in its name');
}

section('every mode, every key');
for (const m of app.MODES) for (let r = 0; r < 12; r++) {
  const scale = new Set(MEL_MINOR.map(i => pc(r - MEL_MINOR[m.id - 1] + i)));
  const tag = `${KEYS[r]} ${m.name}`;
  const box = app.getBoxPositions(m.id, r);
  check(box.length === 5 && new Set(box.map(p => p.id)).size === 5, `${tag}: shapes ${box.map(p => p.id)}`);
  // Climb the neck in E D C A G order (cyclically).
  const order = box.map(p => p.id).join('');
  check((app.SHAPE_IDS.join('') + app.SHAPE_IDS.join('')).includes(order), `${tag}: neck order ${order}`);
  let prev = -1;
  for (const p of box) {
    check(p.lo >= prev && p.lo >= 0 && p.lo <= 11, `${tag} ${p.name}: placed at fret ${p.lo}`); prev = p.lo;
    check(p.name === `${p.id} shape`, `${tag}: name ${p.name}`);
    for (const c of p.cells) {
      check(scale.has(pc(OPEN[c.s] + c.f)), `${tag} ${p.name}: string ${c.s} fret ${c.f} not in the scale`);
      check(c.deg === m.degMap[pc(OPEN[c.s] + c.f - r)], `${tag} ${p.name}: string ${c.s} fret ${c.f} labelled ${c.deg}`);
    }
    for (const [a, b] of app.getRootSpans(p.cells)) check(b - a === 12, `${tag} ${p.name}: root span ${a}→${b}`);
  }
  // A shape name means the same picture in every key (only the frets move).
  if (m.id === 1) for (const p of box) {
    const pic = p.cells.map(c => `${c.s}:${c.f - p.lo}:${c.deg}`).sort().join();
    const ref = app.getBoxPositions(1, 0).find(x => x.id === p.id);
    check(pic === ref.cells.map(c => `${c.s}:${c.f - ref.lo}:${c.deg}`).sort().join(), `${p.name} is a different picture in ${KEYS[r]}`);
  }
  const tn = app.getTnpsPositions(m.id, r);
  check(tn.length === 7, `${tag}: ${tn.length} 3nps patterns`);
  for (const p of tn) {
    check(p.cells.length === 18, `${tag} ${p.name}: ${p.cells.length} notes`);
    for (let s = 0; s < 6; s++) {
      const on = p.cells.filter(c => c.s === s).map(c => c.f);
      check(on.length === 3 && on[0] < on[1] && on[1] < on[2] && on[2] - on[0] <= 5 && on[0] >= 0, `${tag} ${p.name}: string ${s} frets ${on}`);
    }
    for (const c of p.cells) check(c.deg === m.degMap[pc(OPEN[c.s] + c.f - r)], `${tag} ${p.name}: label`);
  }
  let count = 0; for (let s = 0; s < 6; s++) for (let f = 0; f <= 15; f++) if (scale.has(pc(OPEN[s] + f))) count++;
  check(app.getFullNeck(m.id, r).length === count, `${tag}: full neck`);
}
done('7 modes × 12 keys: five named shapes in neck order, right notes and labels, same picture in every key; 3nps patterns; full neck');

section('Scale Map grips');
{
  const SEMI = { R: 0, b3: 3, 3: 4, 5: 7, '#5': 8, b5: 6, 7: 11, b7: 10, '#9': 3, '#11': 6 };
  for (const ch of app.CHORD_MAP) for (let r = 0; r < 12; r++) {
    const cr = pc(r + MEL_MINOR[ch.modeId - 1]);
    const { voicing } = app.chartChordVoicing(ch.modeId, cr, ch.tones);
    const tag = `${ch.degree}${ch.quality} in ${KEYS[r]} melodic minor`;
    check(voicing.length === 4 && new Set(voicing.map(c => c.s)).size === 4, `${tag}: ${voicing.length} notes`);
    check(voicing.every(c => c.s >= 1 && c.s <= 4), `${tag}: uses an outer string`);
    const root = voicing.find(c => c.deg === 'R');
    check(root && root.s === 1 && Math.min(...voicing.map(c => OPEN[c.s] + c.f)) === OPEN[1] + root.f, `${tag}: root not in the bass on the A string`);
    for (const c of voicing) check(ch.tones.includes(c.deg) && pc(OPEN[c.s] + c.f - cr) === SEMI[c.deg], `${tag}: ${c.deg} sounds the wrong note`);
    const fs = voicing.map(c => c.f);
    check(Math.max(...fs) - Math.min(...fs) <= 4, `${tag}: a ${Math.max(...fs) - Math.min(...fs)}-fret stretch`);
  }
  for (const q of app.QUIZ_Q) check(q.choices.includes(q.a) && new Set(q.choices).size === q.choices.length, `quiz: "${q.q}" answer not among its choices`);
  done('seven chords × 12 keys: four notes, root in the bass on A, within four frets; quiz answers are among the choices');
}

if (fails.length) {
  console.log(`\n${fails.length} of ${n} checks FAILED:`);
  for (const f of [...new Set(fails)].slice(0, 40)) console.log('  ' + f);
  process.exit(1);
}
console.log(`\nAll checks passed. ${n} assertions.`);
