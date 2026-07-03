import { useState, useEffect, useMemo, useRef } from "react";
import { AppHeader, TabBar } from "@fretworks/design";

// ════════════════════════════════════════════════════════════════════════
//  MelodicMinor Trainer — the 7 modes of melodic minor, their shapes on the
//  neck, the chords they fit, and how to drill them.
//  Part of the Jazz Guitar Toolbox. Single-file React PWA.
//  Position shapes ported (verified) from AlteredTrainer's CAGED_MM data.
// ════════════════════════════════════════════════════════════════════════

// ── Degree colours (shared toolbox palette) ─────────────────────────────
const DC = {
  'R':'#ff4757','3':'#ffd93d','b3':'#ff9f43','7':'#ff6b6b','b7':'#fdcb6e',
  '9':'#2ed573','13':'#00b894','6':'#1e9e77','#11':'#0fbcf9','5':'#778ca3',
  'b9':'#7c5cbf','#9':'#6c5ce7','b13':'#9b2335','b5':'#fd79a8','#5':'#a29bfe',
  '4':'#74b9ff','2':'#b2d9ff','11':'#81ecec','Δ7':'#ff6b6b','1':'#ff4757',
};
const NOTE_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const OPEN_MIDI  = [40,45,50,55,59,64];      // str0 lowE .. str5 high e
const STR_LABELS = ['E','A','D','G','B','e'];
const pc = n => ((n % 12) + 12) % 12;
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);

// offset of each mode's root within its parent melodic-minor scale
const MODE_OFFSETS = [0, 2, 3, 5, 7, 9, 11];

// ── 5 CAGED positions — verified C-melodic-minor shapes ──────────────────
// str0=lowE..5=high e; entries are [fret, melMinDegree] where the melodic
// minor degrees are 1 2 b3 4 5 6 7. Every dot verified against C mel-min
// pitch classes (84 dots, 0 errors).
const CAGED_MM = [
  {0:[[3,'5'],[5,'6']],1:[[2,'7'],[3,'1'],[5,'2'],[6,'b3']],2:[[3,'4'],[5,'5']],3:[[2,'6'],[4,'7'],[5,'1']],4:[[3,'2'],[4,'b3'],[6,'4']],5:[[3,'5'],[5,'6']]},
  {0:[[5,'6'],[7,'7'],[8,'1']],1:[[5,'2'],[6,'b3'],[8,'4']],2:[[5,'5'],[7,'6']],3:[[4,'7'],[5,'1'],[7,'2'],[8,'b3']],4:[[6,'4'],[8,'5']],5:[[5,'6'],[7,'7'],[8,'1']]},
  {0:[[7,'7'],[8,'1'],[10,'2'],[11,'b3']],1:[[8,'4'],[10,'5']],2:[[7,'6'],[9,'7'],[10,'1']],3:[[7,'2'],[8,'b3'],[10,'4']],4:[[8,'5'],[10,'6']],5:[[7,'7'],[8,'1'],[10,'2'],[11,'b3']]},
  {0:[[10,'2'],[11,'b3'],[13,'4']],1:[[10,'5'],[12,'6']],2:[[9,'7'],[10,'1'],[12,'2'],[13,'b3']],3:[[10,'4'],[12,'5']],4:[[10,'6'],[12,'7'],[13,'1']],5:[[10,'2'],[11,'b3'],[13,'4']]},
  {0:[[13,'4'],[15,'5']],1:[[12,'6'],[14,'7'],[15,'1']],2:[[12,'2'],[13,'b3'],[15,'4']],3:[[12,'5'],[14,'6']],4:[[12,'7'],[13,'1'],[15,'2'],[16,'b3']],5:[[13,'4'],[15,'5']]},
];

// ── MODES ─────────────────────────────────────────────────────────────────
const MODES = [
  {id:1,name:'Melodic Minor',short:'Jazz Minor',formula:'R 2 b3 4 5 6 7',
   intervals:[0,2,3,5,7,9,11],degMap:{0:'R',2:'2',3:'b3',5:'4',7:'5',9:'6',11:'7'},
   chords:['mMaj7','m9(Maj7)'],color:'#74b9ff',
   desc:'Major scale with a b3. The foundational jazz minor tonic sound.',
   jazzRule:'Over i(Maj7). Same root as chord.',keyRule:'Mel. minor root = chord root.',
   example:{chord:'AmMaj7',chordRoot:9}},
  {id:2,name:'Dorian b2',short:'Phrygian #6',formula:'R b9 b3 4 5 6 b7',
   intervals:[0,1,3,5,7,9,10],degMap:{0:'R',1:'b9',3:'b3',5:'4',7:'5',9:'6',10:'b7'},
   chords:['7sus(b9)'],color:'#a29bfe',
   desc:'Dorian with a b2. Dark and exotic over suspended dominant chords.',
   jazzRule:'Over V7sus(b9) in minor cadences.',keyRule:'Mel. minor root = whole step below chord.',
   example:{chord:'E7sus(b9)',chordRoot:4}},
  {id:3,name:'Lydian Augmented',short:'Lydian #5',formula:'R 2 3 #11 #5 6 7',
   intervals:[0,2,4,6,8,9,11],degMap:{0:'R',2:'2',4:'3',6:'#11',8:'#5',9:'6',11:'7'},
   chords:['Maj7#5'],color:'#ffd93d',
   desc:'Lydian with a #5. Dreamy over augmented major 7th chords.',
   jazzRule:'Over Maj7#5 tonic chords.',keyRule:'Mel. minor root = minor 3rd below chord.',
   example:{chord:'EbMaj7#5',chordRoot:3}},
  {id:4,name:'Lydian Dominant',short:'Mixolydian #4',formula:'R 2 3 #11 5 13 b7',
   intervals:[0,2,4,6,7,9,10],degMap:{0:'R',2:'2',4:'3',6:'#11',7:'5',9:'13',10:'b7'},
   chords:['7#11','bII7'],color:'#00b894',
   desc:'Dominant 7th with a #11. Most-used melodic minor mode. The tritone sub scale.',
   jazzRule:'Over 7#11 and tritone subs (bII7). Most common mode!',keyRule:'Mel. minor root = P4 below chord.',
   example:{chord:'G7#11',chordRoot:7}},
  {id:5,name:'Mixolydian b6',short:'Hindu Scale',formula:'R 2 3 4 5 b13 b7',
   intervals:[0,2,4,5,7,8,10],degMap:{0:'R',2:'2',4:'3',5:'4',7:'5',8:'b13',10:'b7'},
   chords:['7b13'],color:'#fd79a8',
   desc:'Mixolydian with a b13. Dark colour over dominant chords resolving to major.',
   jazzRule:'Over V7b13 → I major.',keyRule:'Mel. minor root = P5 below chord.',
   example:{chord:'G7b13',chordRoot:7}},
  {id:6,name:'Locrian #2',short:'Aeolian b5',formula:'R 2 b3 4 b5 b13 b7',
   intervals:[0,2,3,5,6,8,10],degMap:{0:'R',2:'2',3:'b3',5:'4',6:'b5',8:'b13',10:'b7'},
   chords:['ø','m7b5'],color:'#4ecdc4',
   desc:'Locrian with a natural 2. The standard for half-diminished chords.',
   jazzRule:'Over iiø in minor ii-V-i. Minor 3rd above chord!',keyRule:'Mel. minor root = minor 3rd ABOVE chord. ↑',
   example:{chord:'Bø',chordRoot:11}},
  {id:7,name:'Altered Scale',short:'Super Locrian',formula:'R b9 #9 3 #11 b13 b7',
   intervals:[0,1,3,4,6,8,10],degMap:{0:'R',1:'b9',3:'#9',4:'3',6:'#11',8:'b13',10:'b7'},
   chords:['7alt','7b9#9'],color:'#e17055',
   desc:'All tensions: b9, #9, #11, b13. Maximum dissonance — must resolve.',
   jazzRule:'🔑 THE RULE: Half step ABOVE any V7alt.',keyRule:'G7alt → Ab mel. minor. D7alt → Eb mel. minor.',
   example:{chord:'G7alt',chordRoot:7},special:true},
];

// ── Music engine ─────────────────────────────────────────────────────────
// The CAGED_MM shapes are stored for C melodic-minor (the parent). For a chosen
// mode + mode-root we: (1) find the parent mel-min root, (2) transpose the
// C-shape by that pitch class, (3) relabel each dot to the mode's own degree.
const getParentPc = (modeId, modeRoot) => ((modeRoot - MODE_OFFSETS[modeId-1]) % 12 + 12) % 12;

function transposeShape(pat, parentPc) {
  let cells = [];
  for (let s = 0; s < 6; s++) (pat[s]||[]).forEach(([f]) => cells.push({ s, f: f + parentPc }));
  let mn = Math.min(...cells.map(c => c.f));
  while (mn >= 12) { cells.forEach(c => c.f -= 12); mn -= 12; }
  while (mn < 0)   { cells.forEach(c => c.f += 12); mn += 12; }
  return cells;
}

// 5 box positions for a given mode + root, ordered low->high, degrees relabeled
function getBoxPositions(modeId, modeRoot) {
  const parentPc = getParentPc(modeId, modeRoot);
  const mode = MODES[modeId-1];
  const list = CAGED_MM.map(pat => {
    const cells = transposeShape(pat, parentPc).map(c => {
      const semi = (pc(OPEN_MIDI[c.s] + c.f) - modeRoot + 12) % 12;
      return { s: c.s, f: c.f, deg: mode.degMap[semi] };
    });
    const fs = cells.map(c => c.f);
    return { cells, lo: Math.min(...fs), hi: Math.max(...fs) };
  });
  list.sort((a,b) => a.lo - b.lo);
  return list.map((p,i) => ({ ...p, name: `Position ${i+1}` }));
}

// 7 three-notes-per-string patterns for a given mode + root
function getTnpsPositions(modeId, modeRoot) {
  const mode = MODES[modeId-1];
  const parentPc = getParentPc(modeId, modeRoot);
  const scale = new Set([0,2,3,5,7,9,11].map(i => pc(parentPc + i))); // parent mel-min PCs
  const allM = [];
  for (let m = OPEN_MIDI[0] + 1; m <= OPEN_MIDI[5] + 18; m++) if (scale.has(pc(m))) allM.push(m);
  const starts = [];
  for (let f = 1; f <= 12; f++) if (scale.has(pc(OPEN_MIDI[0] + f))) starts.push(f);
  return starts.map((f0, i) => {
    const seq = allM.filter(m => m >= OPEN_MIDI[0] + f0).slice(0, 18);
    const cells = [];
    for (let s = 0; s < 6; s++) seq.slice(s*3, s*3+3).forEach(m => {
      const semi = (pc(m) - modeRoot + 12) % 12;
      cells.push({ s, f: m - OPEN_MIDI[s], deg: mode.degMap[semi] });
    });
    const fs = cells.map(c => c.f);
    return { cells, lo: Math.min(...fs), hi: Math.max(...fs), name: `Pattern ${i+1}` };
  });
}

// full-neck cells for a mode + root
function getFullNeck(modeId, modeRoot, loF=0, hiF=15) {
  const mode = MODES[modeId-1];
  const parentPc = getParentPc(modeId, modeRoot);
  const scale = new Set([0,2,3,5,7,9,11].map(i => pc(parentPc + i)));
  const cells = [];
  for (let s = 0; s < 6; s++) for (let f = loF; f <= hiF; f++)
    if (scale.has(pc(OPEN_MIDI[s] + f))) {
      const semi = (pc(OPEN_MIDI[s] + f) - modeRoot + 12) % 12;
      cells.push({ s, f, deg: mode.degMap[semi] });
    }
  return cells;
}

// ── Audio (Web Audio pluck) ──────────────────────────────────────────────
let _ctx = null, _unlocked = false;
// ── iOS silent-switch bypass (toolbox standard, see root CLAUDE.md → Audio) ──
// Layer 1 (iOS 16.4+): declare real media playback — Web Audio then ignores
// the hardware ringer switch, same as the Music app. Feature-detected.
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
// Layer 2 (older iOS): the "playback" promotion from a real <audio> element
// only holds while it is PLAYING, so keep a silent element looping for the
// life of the page (a fire-once silent MP3 does not stick — don't regress).
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAA7AAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tb////////////////////////////////////////////////////////////////AAAA8ExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
let _silentLoop = null;
function startSilentLoop() {
  if (navigator.audioSession || !/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
  try {
    if (!_silentLoop) { _silentLoop = new Audio(SILENT_MP3); _silentLoop.loop = true; }
    if (_silentLoop.paused) { // must run inside a user gesture — callers are tap handlers
      const p = _silentLoop.play(); if (p && p.catch) p.catch(() => { _silentLoop = null; });
    }
  } catch (e) { _silentLoop = null; }
}
function getCtx() { if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)(); if (_ctx.state === 'suspended') _ctx.resume(); return _ctx; }
function unlockAudio() {
  startSilentLoop(); // re-checked every play: iOS pauses media on backgrounding
  if (_unlocked) return;
  const ctx = getCtx();
  const buf = ctx.createBuffer(1,1,22050), src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination); src.start(0);
  ctx.resume().then(() => { _unlocked = true; });
}
// Shared bus + gentle limiter so rapid overlapping notes don't stack/swell.
let _bus = null;
function getBus(ctx) {
  if (!_bus || _bus.context !== ctx) {
    const g = ctx.createGain(); g.gain.value = 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 20; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    g.connect(comp); comp.connect(ctx.destination);
    _bus = g;
  }
  return _bus;
}
// Idle-suspend: release the audio session when quiet so iOS drops "now playing";
// getCtx() resumes on the next play. (Toolbox audio standard — root CLAUDE.md.)
let _idleTimer = null, _idleEnd = 0;
function bumpIdle(ctx, end) {
  _idleEnd = Math.max(_idleEnd, end);
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    _idleTimer = null;
    if (ctx.currentTime < _idleEnd - 0.05) return;
    if (ctx.state === 'running') ctx.suspend().catch(() => {});
  }, Math.max(0, (_idleEnd - ctx.currentTime) * 1000) + 400);
}
function pluck(ctx, freq, when, vol=0.16) {
  [[1,1.0],[2,0.45],[3,0.22],[4,0.09],[6,0.04]].forEach(([h,a]) => {
    const osc = ctx.createOscillator(), g = ctx.createGain(), filt = ctx.createBiquadFilter();
    osc.type='sine'; osc.frequency.value=freq*h; filt.type='lowpass'; filt.frequency.value=Math.min(3200,freq*h*3);
    g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(vol*a,when+0.005); g.gain.exponentialRampToValueAtTime(0.0001,when+(h===1?1.6:0.9));
    osc.connect(filt); filt.connect(g); g.connect(getBus(ctx)); osc.start(when); osc.stop(when+2);
  });
}
function playMidis(midis, gap=0.12) {
  unlockAudio();
  const ctx = getCtx(), now = ctx.currentTime + 0.05;
  midis.forEach((m, i) => pluck(ctx, midiToHz(m), now + i * gap));
  bumpIdle(ctx, now + (midis.length - 1) * gap + 2);
}

// ── Persistent storage ───────────────────────────────────────────────────
const store = {
  async get(k) { try { const v = localStorage.getItem(k); if (v !== null) return { value: v }; } catch (e) {} try { if (typeof window.storage !== 'undefined') { const r = await window.storage.get(k); if (r) return r; } } catch (e) {} return null; },
  async set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} try { if (typeof window.storage !== 'undefined') await window.storage.set(k, v); } catch (e) {} },
};

const txtOn = hex => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return (0.299*r+0.587*g+0.114*b) > 150 ? '#111' : '#fff'; };
const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };

// ════════════════════════════════════════════════════════════════════════
//  COMPONENTS
// ════════════════════════════════════════════════════════════════════════

// Horizontal fretboard: high e on top, low E bottom, frets L->R.
function Fretboard({ cells, labelMode, root, sc=1, onTapNote }) {
  if (!cells.length) return null;
  const fs = cells.map(c => c.f);
  let lo = Math.max(0, Math.min(...fs) - 1), hi = Math.max(...fs) + 1;
  const FW=36, RH=27, padL=22, padT=14, padB=20, padR=10, nf=hi-lo+1;
  const W = padL + nf*FW + padR, H = padT + 6*RH + padB;
  const fx = f => padL + (f - lo + 0.5)*FW, fxl = f => padL + (f - lo)*FW, ry = r => padT + r*RH;
  const dotMidi = c => OPEN_MIDI[c.s] + c.f;
  const lbl = c => labelMode === 'notes' ? NOTE_NAMES[pc(dotMidi(c))] : c.deg;
  const isRoot = c => c.deg === 'R';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W*sc} height={H*sc} style={{ display:'block', width:'auto', maxWidth:'100%', height:280, margin:'0 auto', userSelect:'none', WebkitUserSelect:'none' }}>
      {Array.from({length:6},(_,r)=><line key={'s'+r} x1={padL} y1={ry(r)} x2={padL+nf*FW} y2={ry(r)} stroke="#2a2840" strokeWidth={1.4}/>)}
      {Array.from({length:nf+1},(_,j)=>{const f=lo+j;const nut=f===0;return <line key={'f'+j} x1={fxl(f)} y1={ry(0)} x2={fxl(f)} y2={ry(5)} stroke={nut?'#cccccc':'#2a2840'} strokeWidth={nut?3:1.4}/>;})}
      {[3,5,7,9,12,15].filter(f=>f>=lo&&f<=hi).map(f=><circle key={'m'+f} cx={fx(f)} cy={ry(2)+RH/2} r={2.6} fill="#2a2840"/>)}
      {STR_LABELS.map((s,r)=><text key={'l'+r} x={6} y={ry(5-r)+3.5} fontSize={10} fill="#777" fontFamily="monospace">{STR_LABELS[5-r]}</text>)}
      {Array.from({length:nf},(_,j)=>{const f=lo+j;if(f===0)return null;return <text key={'n'+j} x={fx(f)} y={H-6} fontSize={9} fill="#666" textAnchor="middle" fontFamily="monospace">{f}</text>;})}
      {cells.map((c,i)=>{const col=DC[c.deg]||'#888',cx=fx(c.f),cy=ry(5-c.s),L=lbl(c);return (
        <g key={i} onClick={onTapNote?()=>onTapNote(dotMidi(c)):undefined} style={{cursor:onTapNote?'pointer':'default'}}>
          {onTapNote && <circle cx={cx} cy={cy} r={16} fill="transparent"/>}
          <circle cx={cx} cy={cy} r={11} fill={col} stroke={isRoot(c)?'#fff':'none'} strokeWidth={isRoot(c)?2:0}/>
          <text x={cx} y={cy+0.5} fontSize={L.length>2?7:9} fill={txtOn(col)} textAnchor="middle" dominantBaseline="central" fontWeight="bold">{L}</text>
        </g>);})}
    </svg>
  );
}

function Chip({ deg, note }) {
  const col = DC[deg] || '#888';
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:6, fontWeight:800, fontSize:11, background:col, color:txtOn(col), margin:'2px 4px 2px 0' }}>{deg}{note!=null?` · ${note}`:''}</span>;
}

function PlayBtn({ onClick, label='▶ Play', small }) {
  const [hot, setHot] = useState(false);
  return <button onClick={()=>{setHot(true);onClick();setTimeout(()=>setHot(false),500);}}
    style={{ background:hot?'#ffd93d15':'transparent', border:`1px solid ${hot?'#ffd93d':'#2a2840'}`, color:hot?'#ffd93d':'#aaa', borderRadius:7, padding:small?'4px 9px':'7px 13px', fontSize:small?11:12, fontWeight:700, cursor:'pointer', minHeight:small?30:38, touchAction:'manipulation' }}>{label}</button>;
}

// ── MODES TAB ─────────────────────────────────────────────────────────────
function ModesTab({ root, labelMode, onPickMode }) {
  const [sel, setSel] = useState(null);
  const mode = sel != null ? MODES[sel] : null;

  if (mode) {
    const parentPc = getParentPc(mode.id, root);
    const spelling = mode.intervals.map(iv => ({ deg: mode.degMap[iv], note: NOTE_NAMES[pc(root + iv)] }));
    const rootMidi = 48 + root;
    const playScale = () => playMidis([...mode.intervals.map(i=>rootMidi+i), rootMidi+12]);
    const card = { background:'#13121f', border:'1px solid #1a1928', borderRadius:12, padding:'12px 13px', marginBottom:12 };
    const h = { fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 };
    return (
      <div style={{ padding:'14px 12px' }}>
        <button onClick={()=>setSel(null)} style={{ background:'transparent', border:'1px solid #2a2840', color:'#aaa', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:12, marginBottom:12, minHeight:36 }}>← All modes</button>
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ width:13, height:13, borderRadius:'50%', background:mode.color }}/>
              <div style={{ fontSize:21, fontWeight:900, color:'#fff' }}>{NOTE_NAMES[root]} {mode.name}</div>
            </div>
            <PlayBtn onClick={playScale} label="▶ Hear" />
          </div>
          <div style={{ fontSize:12, color:'#888', marginBottom:10, fontStyle:'italic' }}>{mode.short}</div>
          <div style={{ fontSize:13, lineHeight:1.8, marginBottom:4 }}>
            {spelling.map((s,i)=><Chip key={i} deg={s.deg} note={labelMode==='notes'?s.note:undefined} />)}
          </div>
          <div style={{ fontSize:11, color:'#888' }}>Formula: {mode.formula}</div>
        </div>

        <div style={card}>
          <div style={h}>When to use</div>
          <div style={{ fontSize:14, color:'#ffd93d', fontWeight:700, marginBottom:5 }}>{mode.jazzRule}</div>
          <div style={{ fontSize:12, color:'#888', marginBottom:9 }}>{mode.keyRule}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {mode.chords.map(c => <span key={c} style={{ background:mode.color+'22', color:mode.color, border:`1px solid ${mode.color}55`, borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:700 }}>{c}</span>)}
          </div>
        </div>

        <div style={card}>
          <div style={h}>Parent key</div>
          <div style={{ fontSize:14, lineHeight:1.6 }}>
            <b style={{ color:mode.color }}>{NOTE_NAMES[root]} {mode.name}</b> is mode {mode.id} of{' '}
            <b style={{ color:'#74b9ff' }}>{NOTE_NAMES[parentPc]} melodic minor</b>. Same 7 notes — just starting on a different degree.
          </div>
        </div>

        <button onClick={()=>onPickMode(mode.id)} style={{ width:'100%', background:mode.color, color:txtOn(mode.color), border:'none', borderRadius:10, padding:'12px', fontSize:14, fontWeight:800, cursor:'pointer', minHeight:46, touchAction:'manipulation' }}>
          See {NOTE_NAMES[root]} {mode.name} on the neck →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:'14px 12px' }}>
      <div style={{ fontSize:12, color:'#888', marginBottom:12, lineHeight:1.5 }}>The 7 modes of melodic minor. Tap one to see its sound, chords, and parent key.</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {MODES.map((m,i)=>(
          <button key={m.id} onClick={()=>setSel(i)} style={{ textAlign:'left', background:'#13121f', border:`1px solid ${m.color}33`, borderRadius:12, padding:'12px 13px', cursor:'pointer', minHeight:44, touchAction:'manipulation' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <div style={{ width:11, height:11, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
              <span style={{ fontSize:10, color:m.color, fontWeight:700, background:m.color+'22', borderRadius:5, padding:'1px 7px' }}>Mode {m.id}</span>
              <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{m.name}</span>
              <span style={{ fontSize:10, color:'#666' }}>{m.short}</span>
              {m.special && <span style={{ marginLeft:'auto', fontSize:9, background:'#e1705522', color:'#e17055', padding:'1px 7px', borderRadius:5, fontWeight:700 }}>★ KEY</span>}
            </div>
            <div style={{ fontSize:11.5, color:'#888', lineHeight:1.5 }}>{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── FRETBOARD TAB (Box / 3NPS toggle) ───────────────────────────────────
function FretboardTab({ root, labelMode, modeId, setModeId }) {
  const [system, setSystem] = useState('box');   // 'box' | 'tnps'
  const [idx, setIdx] = useState(0);
  const [fullNeck, setFullNeck] = useState(false);
  const mode = MODES[modeId-1];

  const positions = useMemo(
    () => system === 'box' ? getBoxPositions(modeId, root) : getTnpsPositions(modeId, root),
    [system, modeId, root]
  );
  const i = Math.min(idx, positions.length - 1);
  const cur = positions[i];
  const cells = fullNeck ? getFullNeck(modeId, root) : cur.cells;
  const playPos = () => playMidis(cells.map(c => OPEN_MIDI[c.s] + c.f).sort((a,b)=>a-b), 0.10);

  const segBtn = on => ({ flex:1, padding:'8px', background:on?mode.color:'transparent', color:on?txtOn(mode.color):'#aaa', border:`1px solid ${on?mode.color:'#2a2840'}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', minHeight:38, touchAction:'manipulation' });
  const navBtn = { background:'transparent', border:'1px solid #2a2840', color:'#ccc', borderRadius:8, padding:'9px 16px', fontSize:16, fontWeight:700, cursor:'pointer', minHeight:42, touchAction:'manipulation' };

  return (
    <div style={{ padding:'14px 12px' }}>
      {/* mode selector */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>{setModeId(m.id);setIdx(0);}} style={{ padding:'5px 10px', borderRadius:16, cursor:'pointer', fontSize:10, fontWeight:700, border:`1px solid ${modeId===m.id?m.color:m.color+'44'}`, background:modeId===m.id?m.color+'22':'transparent', color:modeId===m.id?m.color:'#777', minHeight:30, touchAction:'manipulation' }}>{m.id}. {m.short}</button>
        ))}
      </div>

      {/* mode strip */}
      <div style={{ background:'#13121f', border:`1px solid ${mode.color}44`, borderRadius:10, padding:'9px 12px', marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:800, color:'#fff', marginBottom:2 }}>{NOTE_NAMES[root]} {mode.name}</div>
        <div style={{ fontSize:11, color:'#aaa' }}>{mode.jazzRule}</div>
      </div>

      {/* system toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        <button onClick={()=>{setSystem('box');setIdx(0);}} style={segBtn(system==='box')}>5 Positions</button>
        <button onClick={()=>{setSystem('tnps');setIdx(0);}} style={segBtn(system==='tnps')}>3 notes/string</button>
      </div>

      {/* position header + full-neck toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6 }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>
          {fullNeck ? 'Full neck' : cur.name}
          {!fullNeck && <span style={{ color:'#888', fontWeight:600, fontSize:11 }}> · frets {cur.lo}–{cur.hi}</span>}
        </div>
        <button onClick={()=>setFullNeck(f=>!f)} style={{ background:fullNeck?'#74b9ff':'transparent', color:fullNeck?'#111':'#74b9ff', border:'1px solid #74b9ff55', borderRadius:7, padding:'6px 11px', fontSize:11, fontWeight:700, cursor:'pointer', minHeight:34, touchAction:'manipulation' }}>{fullNeck?'◧ Full neck':'◫ Full neck'}</button>
      </div>

      <div style={{ background:'#13121f', border:'1px solid #1a1928', borderRadius:12, padding:'10px 8px', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        <Fretboard cells={cells} root={root} labelMode={labelMode} sc={1.15} onTapNote={m=>playMidis([m])} />
      </div>

      {!fullNeck && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:10 }}>
          <button onClick={()=>setIdx((i - 1 + positions.length) % positions.length)} style={navBtn}>‹</button>
          <div style={{ fontSize:12, color:'#888', minWidth:64, textAlign:'center' }}>{i+1} / {positions.length}</div>
          <button onClick={()=>setIdx((i + 1) % positions.length)} style={navBtn}>›</button>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'center', marginTop:12 }}>
        <PlayBtn onClick={playPos} label="▶ Play this shape" />
      </div>

      {/* degree legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14, justifyContent:'center' }}>
        {mode.intervals.map(iv=>{const d=mode.degMap[iv];return <span key={iv} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#aaa' }}><span style={{width:12,height:12,borderRadius:'50%',background:DC[d]||'#888',display:'inline-block'}}/>{d}</span>;})}
      </div>
    </div>
  );
}

// ── SCALE MAP TAB ────────────────────────────────────────────────────────
const CHORD_MAP = [
  {degree:'i',    quality:'mMaj7', modeId:1},
  {degree:'ii',   quality:'7sus(b9)', modeId:2},
  {degree:'bIII', quality:'Maj7#5',modeId:3},
  {degree:'IV',   quality:'7#11',  modeId:4},
  {degree:'V',    quality:'7b13',  modeId:5},
  {degree:'vi',   quality:'ø',     modeId:6},
  {degree:'vii',  quality:'7alt',  modeId:7},
];
function ScaleMapTab({ root, onPickMode }) {
  const [hl, setHl] = useState(null);
  return (
    <div style={{ padding:'14px 12px' }}>
      <div style={{ fontSize:12, color:'#888', marginBottom:12, lineHeight:1.5 }}>
        The 7 chords built from <b style={{color:'#74b9ff'}}>{NOTE_NAMES[root]} melodic minor</b>, and the mode for each.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {CHORD_MAP.map((entry,i)=>{
          const mode = MODES[entry.modeId-1];
          const cr = (root + MODE_OFFSETS[entry.modeId-1]) % 12;
          const isHl = hl===i;
          return (
            <div key={i} onClick={()=>setHl(isHl?null:i)} style={{ background:'#13121f', borderRadius:11, padding:'11px 13px', border:`1px solid ${isHl?mode.color:mode.color+'33'}`, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, color:'#666', minWidth:30 }}>{entry.degree}</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{NOTE_NAMES[cr]}{entry.quality}</span>
                <span style={{ marginLeft:'auto', background:mode.color+'22', color:mode.color, borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:700 }}>Mode {mode.id}</span>
              </div>
              <div style={{ fontSize:11, color:'#888', marginTop:4 }}>{mode.name} · {mode.short}</div>
              {isHl && (
                <div style={{ borderTop:'1px solid #2a2840', marginTop:8, paddingTop:8 }}>
                  <div style={{ fontSize:11, color:'#ffd93d', fontWeight:700, marginBottom:6 }}>{mode.jazzRule}</div>
                  <button onClick={(e)=>{e.stopPropagation();onPickMode(mode.id);}} style={{ background:mode.color, color:txtOn(mode.color), border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', minHeight:38, touchAction:'manipulation' }}>
                    See on neck →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── QUIZ TAB ──────────────────────────────────────────────────────────────
const QUIZ_Q = [
  {q:'Which mode over a 7alt chord?', a:'Mode 7 Altered Scale', choices:['Mode 4 Lydian Dominant','Mode 7 Altered Scale','Mode 1 Melodic Minor','Mode 5 Mixolydian b6'], exp:'Altered Scale = half step ABOVE chord root. G7alt → Ab melodic minor.'},
  {q:'G7#11 — which melodic minor key?', a:'D melodic minor', choices:['G melodic minor','D melodic minor','Ab melodic minor','C melodic minor'], exp:'Lydian Dominant (mode 4) = P4 below chord. G is the 4th of D.'},
  {q:'Over a half-diminished (ø) chord, which mode?', a:'Mode 6 Locrian #2', choices:['Mode 4 Lydian Dom','Mode 5 Mixolydian b6','Mode 6 Locrian #2','Mode 7 Altered'], exp:'Locrian #2 (mode 6). Root = minor 3rd ABOVE the chord root.'},
  {q:'G7alt — parent melodic minor key?', a:'Ab melodic minor', choices:['Ab melodic minor','G melodic minor','F melodic minor','Bb melodic minor'], exp:'Altered = half step up. G7alt → Ab melodic minor.'},
  {q:'Mode 4 (Lydian Dominant) characteristic colour?', a:'#11 (tritone)', choices:['b9 and #9','#11 (tritone)','b13','b3 and b7'], exp:'#11 is the defining colour of Lydian Dominant.'},
  {q:'AmMaj7 chord — which scale?', a:'A melodic minor', choices:['D melodic minor','G melodic minor','A melodic minor','E melodic minor'], exp:'Mode 1 uses the same root as the chord. AmMaj7 → A melodic minor.'},
  {q:'Locrian #2 differs from Locrian by having a...', a:'Natural 2nd', choices:['Natural 2nd','Natural 3rd','Natural 5th','Major 7th'], exp:'Regular Locrian has b2. Locrian #2 raises it to a natural 2.'},
];
function QuizTab() {
  const [phase, setPhase] = useState('idle');
  const [order, setOrder] = useState([]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [shuffledChoices, setShuffledChoices] = useState([]);
  const q = phase==='playing' ? QUIZ_Q[order[qi]] : null;

  const start = () => { setOrder(shuffle(QUIZ_Q.map((_,i)=>i))); setQi(0); setScore(0); setPicked(null); setPhase('playing'); };
  useEffect(()=>{ if(q) setShuffledChoices(shuffle(q.choices)); }, [qi, phase]);

  const pick = c => {
    if (picked!==null) return;
    setPicked(c);
    if (c===q.a) setScore(s=>s+1);
    setTimeout(()=>{ if(qi+1>=QUIZ_Q.length) setPhase('done'); else { setQi(i=>i+1); setPicked(null); } }, 1400);
  };

  if (phase==='idle') return (
    <div style={{ padding:'28px 16px', textAlign:'center' }}>
      <div style={{ fontSize:46, marginBottom:10 }}>🎯</div>
      <div style={{ fontSize:19, fontWeight:900, color:'#fff', marginBottom:8 }}>Mode Quiz</div>
      <div style={{ fontSize:12, color:'#888', lineHeight:1.6, marginBottom:20 }}>{QUIZ_Q.length} questions on applying the melodic minor modes.</div>
      <button onClick={start} style={{ background:'#ffd93d', color:'#111', border:'none', padding:'13px 36px', borderRadius:11, fontSize:14, fontWeight:900, cursor:'pointer', minHeight:46 }}>Start</button>
    </div>
  );
  if (phase==='done') {
    const pct = Math.round(score/QUIZ_Q.length*100);
    return (
      <div style={{ padding:'28px 16px', textAlign:'center' }}>
        <div style={{ fontSize:50, marginBottom:6 }}>{pct===100?'🏆':pct>=70?'⭐':'💪'}</div>
        <div style={{ fontSize:54, fontWeight:900, color:'#ffd93d', lineHeight:1 }}>{score}/{QUIZ_Q.length}</div>
        <div style={{ color:'#888', marginBottom:20 }}>{pct}%</div>
        <button onClick={start} style={{ background:'#ffd93d', color:'#111', border:'none', padding:'11px 30px', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer', minHeight:44 }}>Again</button>
      </div>
    );
  }
  return (
    <div style={{ padding:'14px 12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:11 }}>
        <span style={{ color:'#666' }}>Q{qi+1}/{QUIZ_Q.length}</span>
        <span style={{ color:'#ffd93d', fontWeight:700 }}>{score} correct</span>
      </div>
      <div style={{ background:'#13121f', borderRadius:12, padding:16, border:'1px solid #2a2840', marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.5 }}>{q.q}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
        {shuffledChoices.map((c,ci)=>{
          const isSel=picked===c, isC=c===q.a, show=picked!==null;
          return (
            <button key={ci} onClick={()=>pick(c)} disabled={picked!==null} style={{ background:show?(isC?'#00b89420':isSel?'#ff636320':'#13121f'):'#13121f', border:`2px solid ${show?(isC?'#00b894':isSel?'#ff6363':'#2a2840'):'#2a2840'}`, borderRadius:10, padding:'12px 14px', cursor:picked?'default':'pointer', textAlign:'left', color:show?(isC?'#00b894':isSel?'#ff6363':'#aaa'):'#fff', fontSize:13, fontWeight:600, minHeight:44, touchAction:'manipulation' }}>
              {c}{show&&isC&&<span style={{ float:'right' }}>✓</span>}{show&&isSel&&!isC&&<span style={{ float:'right' }}>✗</span>}
            </button>
          );
        })}
      </div>
      {picked!==null && (
        <div style={{ background:'#13121f', borderRadius:10, padding:'10px 12px', border:`1px solid ${picked===q.a?'#00b89444':'#ff636344'}` }}>
          <div style={{ fontSize:11, color:picked===q.a?'#00b894':'#ff6363', fontWeight:700, marginBottom:4 }}>{picked===q.a?'✓ Correct':'✗ Incorrect'}</div>
          <div style={{ fontSize:11, color:'#aaa', lineHeight:1.5 }}>{q.exp}</div>
        </div>
      )}
    </div>
  );
}

// ── GUIDE TAB ─────────────────────────────────────────────────────────────
function GuideTab() {
  const [open, setOpen] = useState(null);
  const S = [
    {icon:'🔑',title:'The #1 Rule: Altered Scale',color:'#e17055',body:`Over ANY altered dominant (V7alt), play melodic minor a HALF STEP above the chord root.\n\nG7alt → Ab melodic minor\nD7alt → Eb melodic minor\nE7alt → F melodic minor\nB7alt → C melodic minor\n\nThis gives you b9, #9, #11, and b13 — every altered tension from one scale.`},
    {icon:'🎵',title:'Lydian Dominant & Tritone Subs',color:'#00b894',body:`Lydian Dominant (mode 4) is a dom7 with a #11.\n\nOver V7#11 → mel. minor a P4 below chord root:\nG7#11 → D mel. minor\n\nFor tritone subs (bII7):\nDb7 (sub for G7) → Ab mel. minor`},
    {icon:'🌙',title:'Minor ii–V–i in Full',color:'#4ecdc4',body:`Three modes chain through a minor ii-V-i:\n\n1. iiø → Locrian #2 (minor 3rd ABOVE chord root)\n   Bø → D mel. minor\n2. V7alt → Altered (half step above)\n   E7alt → F mel. minor\n3. i(Maj7) → Melodic Minor (same root)\n   AmMaj7 → A mel. minor`},
    {icon:'🗝️',title:'One Key, Seven Sounds',color:'#a29bfe',body:`C melodic minor unlocks 7 chord-scale pairs:\n\nMode 1 → CmMaj7    Melodic Minor\nMode 2 → D7sus(b9) Dorian b2\nMode 3 → EbMaj7#5  Lydian Augmented\nMode 4 → F7#11     Lydian Dominant\nMode 5 → G7b13     Mixolydian b6\nMode 6 → Aø        Locrian #2\nMode 7 → B7alt     Altered Scale`},
    {icon:'🎸',title:'Positions vs 3 Notes/String',color:'#74b9ff',body:`The Fretboard tab offers two systems:\n\n5 Positions — compact CAGED boxes, ~5 frets each, great for chord-tone targeting and comping.\n\n3 Notes/String — 7 patterns of three notes per string, ideal for fast scalar runs and legato. Each pattern starts on a different scale degree.\n\nBoth show the same scale; switch freely to learn the neck from both angles.`},
    {icon:'🎨',title:'Degree Colour Guide',color:'#ffd93d',body:`● Red    R    Root\n● Yellow 3    Major 3rd\n● Orange b3   Minor 3rd\n● Grey   5    Perfect 5th\n● Pink   7    Major 7th\n● Peach  b7   Dominant 7th\n● Green  9,13 Safe extensions\n● Cyan   #11  Lydian brightness\n● Purple b9,#9 Altered tensions`},
  ];
  return (
    <div style={{ padding:'14px 12px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {S.map((s,i)=>{
          const isO = open===i;
          return (
            <div key={i} style={{ background:'#13121f', borderRadius:10, border:`1px solid ${isO?s.color+'55':'#1a1928'}`, overflow:'hidden' }}>
              <button onClick={()=>setOpen(isO?null:i)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 13px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', minHeight:44, touchAction:'manipulation' }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <span style={{ flex:1, fontSize:13, fontWeight:700, color:'#fff' }}>{s.title}</span>
                <span style={{ color:'#555', fontSize:14, transform:isO?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
              </button>
              {isO && <div style={{ padding:'0 13px 13px' }}><div style={{ fontSize:12, color:'#ccc', lineHeight:1.8, whiteSpace:'pre-line', fontFamily:'monospace' }}>{s.body.trim()}</div></div>}
            </div>
          );
        })}
      </div>
      <a href="https://ko-fi.com/syncopatedsyntax" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#FF5E5B', color:'#fff', borderRadius:11, padding:'12px 20px', textDecoration:'none', fontWeight:800, fontSize:14, marginTop:14, touchAction:'manipulation' }}>
        <span style={{ fontSize:18 }}>☕</span> Buy me a coffee
      </a>
      <div style={{ fontSize:10, color:'#555', textAlign:'center', marginTop:12 }}>Part of the Jazz Guitar Toolbox by Zak</div>
    </div>
  );
}

// ── Install banner ───────────────────────────────────────────────────────
function BannerStack() {
  const [dp, setDp] = useState(null);
  const [show, setShow] = useState(false);
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    if (standalone) return;
    const onBip = e => { e.preventDefault(); setDp(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBip);
    if (isIOS) { try { if (!localStorage.getItem('mm_ios_hint')) setShow(true); } catch(e){ setShow(true);} }
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, [standalone, isIOS]);
  if (!show || standalone) return null;
  const wrap = { position:'fixed', bottom:'max(14px,env(safe-area-inset-bottom))', left:'50%', transform:'translateX(-50%)', width:'calc(100% - 24px)', maxWidth:406, boxSizing:'border-box', background:'#1a1830', border:'1px solid #2a2840', borderRadius:12, padding:'11px 13px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 30px #0008', zIndex:50 };
  const close = () => { setShow(false); try { localStorage.setItem('mm_ios_hint','1'); } catch(e){} };
  return (
    <div style={wrap} onClick={e=>e.stopPropagation()}>
      <div style={{ fontSize:12, color:'#ddd', flex:1, lineHeight:1.4 }}>
        {isIOS && !dp ? <>Add to Home Screen: tap <b>Share</b> ⃞↑ then <b>Add to Home Screen</b>.</> : <>Install MelodicMinor Trainer for offline practice.</>}
      </div>
      {dp && <button onClick={async()=>{dp.prompt();await dp.userChoice;setShow(false);}} style={{ background:'#74b9ff', color:'#111', border:'none', borderRadius:8, padding:'8px 13px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Install</button>}
      <button onClick={close} style={{ background:'transparent', color:'#888', border:'none', fontSize:18, cursor:'pointer', padding:'0 4px' }}>×</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════════════════
export default function App() {
  const [root, setRoot] = useState(0);          // C default
  const [labelMode, setLabelMode] = useState('degrees');
  const [tab, setTab] = useState('fretboard');
  const [modeId, setModeId] = useState(1);
  const scrollRef = useRef(null);

  // load prefs
  useEffect(() => { (async () => {
    try { const r = await store.get('mm_root'); if (r) setRoot(parseInt(r.value,10)); } catch(e){}
    try { const l = await store.get('mm_label'); if (l) setLabelMode(l.value); } catch(e){}
    try { const m = await store.get('mm_mode'); if (m) setModeId(parseInt(m.value,10)); } catch(e){}
  })(); }, []);
  useEffect(() => { store.set('mm_root', String(root)); }, [root]);
  useEffect(() => { store.set('mm_label', labelMode); }, [labelMode]);
  useEffect(() => { store.set('mm_mode', String(modeId)); }, [modeId]);

  // PWA setup
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `*{-webkit-tap-highlight-color:transparent}body{margin:0}`;
    document.head.appendChild(style);
    const makeIcon = (size) => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d'); const u = size/512;
      x.fillStyle = '#0f0e17'; x.beginPath();
      const rr = 96*u; x.moveTo(rr,0); x.arcTo(size,0,size,size,rr); x.arcTo(size,size,0,size,rr); x.arcTo(0,size,0,0,rr); x.arcTo(0,0,size,0,rr); x.fill();
      const dots = [['R','#ff4757'],['b3','#ff9f43'],['5','#778ca3'],['6','#1e9e77'],['7','#ff6b6b']];
      dots.forEach((d,i) => { x.beginPath(); x.arc((110+i*73)*u,(256)*u,30*u,0,7); x.fillStyle=d[1]; x.fill(); });
      x.fillStyle = '#fff'; x.font = `bold ${64*u}px sans-serif`; x.textAlign='center';
      x.fillText('mm', size/2, 150*u);
      return c.toDataURL('image/png');
    };
    const i512 = makeIcon(512), i180 = makeIcon(180);
    const setLink = (rel, sizes, href) => { let l = document.querySelector(`link[rel="${rel}"]${sizes?`[sizes="${sizes}"]`:''}`); if(!l){l=document.createElement('link');l.rel=rel;if(sizes)l.sizes=sizes;document.head.appendChild(l);} l.href=href; };
    setLink('apple-touch-icon','180x180',i180); setLink('icon','512x512',i512);
    const setMeta = (n,c) => { let m=document.querySelector(`meta[name="${n}"]`); if(!m){m=document.createElement('meta');m.name=n;document.head.appendChild(m);} m.content=c; };
    setMeta('theme-color','#0f0e17');
    setMeta('viewport','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    setMeta('apple-mobile-web-app-capable','yes');
    setMeta('apple-mobile-web-app-status-bar-style','black-translucent');
    setMeta('apple-mobile-web-app-title','Fretworks');
    // Single PWA: reference the unified shell manifest (one manifest per origin)
    // instead of generating a competing per-app manifest.
    let mlink = document.querySelector('link[rel="manifest"]'); if(!mlink){mlink=document.createElement('link');mlink.rel='manifest';document.head.appendChild(mlink);} mlink.href = '/manifest.webmanifest';
    window.scrollTo(0,0);
    const lock = () => { if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0,0); };
    window.addEventListener('scroll', lock, { passive:true });
    return () => { document.head.removeChild(style); window.removeEventListener('scroll', lock); };
  }, []);

  const goMode = (id) => { setModeId(id); setTab('fretboard'); if(scrollRef.current) scrollRef.current.scrollTop=0; };

  const CW = 600; // centered content max-width (matches ChordTrainer)

  const TABS = [
    {id:'modes',label:'Modes',icon:'🎼'},
    {id:'fretboard',label:'Fretboard',icon:'🎸'},
    {id:'map',label:'Scale Map',icon:'🗺️'},
    {id:'quiz',label:'Quiz',icon:'🎯'},
    {id:'guide',label:'Guide',icon:'📖'},
  ];

  return (
    <div style={{ background:'#0f0e17', height:'100dvh', width:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', color:'#fffffe', fontFamily:"var(--font-body)", WebkitFontSmoothing:'antialiased' }}>
      <AppHeader toolKey="mm">
        <button className={`fw-header-btn${labelMode==='degrees'?' is-on':''}`} onClick={()=>setLabelMode(m=>m==='degrees'?'notes':'degrees')}>
          {labelMode==='degrees'?'✦ Degrees':'Note names'}
        </button>
      </AppHeader>

      <TabBar toolKey="mm" tabs={TABS} active={tab} onChange={(id)=>{setTab(id); if(scrollRef.current)scrollRef.current.scrollTop=0;}} />

      {/* root selector — below the tabs, full-bleed border, centered inner */}
      <div style={{ borderBottom:'1px solid #1a1928' }}>
       <div style={{ padding:'8px 10px', maxWidth:CW, margin:'0 auto' }}>
        <div style={{ fontSize:9, color:'#666', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Root · <span style={{color:'#74b9ff'}}>{NOTE_NAMES[root]} melodic minor</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:3 }}>
          {NOTE_NAMES.map((n,i)=>(
            <button key={i} onClick={()=>setRoot(i)} style={{ padding:'7px 0', borderRadius:6, fontSize:11, fontWeight:800, cursor:'pointer', minHeight:34, border:`1px solid ${root===i?'#74b9ff':'#2a2840'}`, background:root===i?'#74b9ff':'transparent', color:root===i?'#06283f':'#999', touchAction:'manipulation' }}>{n}</button>
          ))}
        </div>
       </div>
      </div>

      {/* content — centered inner */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehaviorY:'none' }}>
        <div style={{ maxWidth:CW, margin:'0 auto', paddingBottom:'max(80px,env(safe-area-inset-bottom))' }}>
          {tab==='modes' && <ModesTab root={root} labelMode={labelMode} onPickMode={goMode} />}
          {tab==='fretboard' && <FretboardTab root={root} labelMode={labelMode} modeId={modeId} setModeId={setModeId} />}
          {tab==='map' && <ScaleMapTab root={root} onPickMode={goMode} />}
          {tab==='quiz' && <QuizTab />}
          {tab==='guide' && <GuideTab />}
        </div>
      </div>

      <BannerStack />
    </div>
  );
}
