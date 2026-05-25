import { useState, useEffect, useMemo } from "react";

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const DC={
  'R':'#ff4757','3':'#ffd93d','b3':'#ff9f43','7':'#ff6b6b','b7':'#fdcb6e',
  '9':'#2ed573','13':'#00b894','6':'#1e9e77','#11':'#0fbcf9','5':'#778ca3',
  'b9':'#7c5cbf','#9':'#6c5ce7','b13':'#9b2335','b5':'#fd79a8','#5':'#a29bfe',
  'bb7':'#b2bec3','4':'#74b9ff','2':'#b2d9ff','11':'#81ecec',
};
const NOTE_NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const OPEN_MIDI=[40,45,50,55,59,64];
const STR_ORDER=[5,4,3,2,1,0];
const STR_LABELS=['e','B','G','D','A','E'];
const MODE_OFFSETS=[0,2,3,5,7,9,11];

const MODES=[
  {id:1,name:'Melodic Minor',short:'Jazz Minor · Ionian b3',
   formula:'R 2 b3 4 5 6 7',
   intervals:[0,2,3,5,7,9,11],
   degMap:{0:'R',2:'2',3:'b3',5:'4',7:'5',9:'6',11:'7'},
   chords:['mMaj7','m9(Maj7)'],color:'#74b9ff',
   desc:'Major scale with a b3. The foundational jazz minor tonic sound.',
   jazzRule:'Over i(Maj7) — tonic minor. Same root as chord.',
   keyRule:'Mel. minor root = chord root.',
   example:{chord:'AmMaj7',chordRoot:9},
  },
  {id:2,name:'Dorian b2',short:'Phrygian #6 · Assyrian',
   formula:'R b9 b3 4 5 6 b7',
   intervals:[0,1,3,5,7,9,10],
   degMap:{0:'R',1:'b9',3:'b3',5:'4',7:'5',9:'6',10:'b7'},
   chords:['7sus(b9)'],color:'#a29bfe',
   desc:'Dorian with a b2. Dark and exotic over suspended dominant chords.',
   jazzRule:'Over V7sus(b9) in minor cadences.',
   keyRule:'Mel. minor root = whole step below chord root.',
   example:{chord:'E7sus(b9)',chordRoot:4},
  },
  {id:3,name:'Lydian Augmented',short:'Lydian #5',
   formula:'R 2 3 #11 #5 6 7',
   intervals:[0,2,4,6,8,9,11],
   degMap:{0:'R',2:'2',4:'3',6:'#11',8:'#5',9:'6',11:'7'},
   chords:['Maj7#5','Maj7#5#11'],color:'#ffd93d',
   desc:'Lydian with a #5. Dreamy and floating over augmented major 7th chords.',
   jazzRule:'Over Maj7#5 tonic chords.',
   keyRule:'Mel. minor root = minor 3rd below chord root.',
   example:{chord:'EbMaj7#5',chordRoot:3},
  },
  {id:4,name:'Lydian Dominant',short:'Mixolydian #4 · Overtone',
   formula:'R 2 3 #11 5 13 b7',
   intervals:[0,2,4,6,7,9,10],
   degMap:{0:'R',2:'2',4:'3',6:'#11',7:'5',9:'13',10:'b7'},
   chords:['7#11','13#11','bII7'],color:'#00b894',
   desc:'Dominant 7th with a #11. Most-used melodic minor mode. The tritone sub scale.',
   jazzRule:'Over 7#11 and tritone subs (bII7). Most common mode!',
   keyRule:'Mel. minor root = P4 below chord (= P5 above).',
   example:{chord:'G7#11',chordRoot:7},
  },
  {id:5,name:'Mixolydian b6',short:'Hindu Scale · Melodic Major',
   formula:'R 2 3 4 5 b13 b7',
   intervals:[0,2,4,5,7,8,10],
   degMap:{0:'R',2:'2',4:'3',5:'4',7:'5',8:'b13',10:'b7'},
   chords:['7b13'],color:'#fd79a8',
   desc:'Mixolydian with a b13. Dark colour over dominant chords resolving to a major tonic.',
   jazzRule:'Over V7b13 → I major.',
   keyRule:'Mel. minor root = P5 below chord root.',
   example:{chord:'G7b13',chordRoot:7},
  },
  {id:6,name:'Locrian #2',short:'Aeolian b5 · Half-Dim',
   formula:'R 2 b3 4 b5 b13 b7',
   intervals:[0,2,3,5,6,8,10],
   degMap:{0:'R',2:'2',3:'b3',5:'4',6:'b5',8:'b13',10:'b7'},
   chords:['ø','m7b5'],color:'#4ecdc4',
   desc:'Locrian with a natural 2 (not b2). The standard for half-diminished chords.',
   jazzRule:'Over iiø in minor ii-V-i. Minor 3rd above chord!',
   keyRule:'Mel. minor root = minor 3rd ABOVE chord root. ↑',
   example:{chord:'Bø',chordRoot:11},
  },
  {id:7,name:'Altered Scale',short:'Super Locrian · Dim Whole-Tone',
   formula:'R b9 #9 3 #11 b13 b7',
   intervals:[0,1,3,4,6,8,10],
   degMap:{0:'R',1:'b9',3:'#9',4:'3',6:'#11',8:'b13',10:'b7'},
   chords:['7alt','7b9#9','7b9b13'],color:'#e17055',
   desc:'All tensions: b9, #9, #11, b13. Maximum dissonance — always resolves.',
   jazzRule:'🔑 THE BIG RULE: Over ANY V7alt — half step ABOVE!',
   keyRule:'G7alt → Ab mel. minor. D7alt → Eb mel. minor.',
   example:{chord:'G7alt',chordRoot:7},
   special:true,
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────
const getParentKey=(chordRoot,modeId)=>((chordRoot-MODE_OFFSETS[modeId-1])+12)%12;
function getDefaultWin(n){let f=((n-4)+12)%12;if(f<1)f+=12;return Math.max(1,f-1);}
function getScaleMidi(rootNote,mode,wStart=1,nFrets=5){
  const s=new Set();
  STR_ORDER.forEach(si=>{for(let c=0;c<nFrets;c++){const m=OPEN_MIDI[si]+wStart+c,iv=((m%12+12)%12-rootNote+12)%12;if(mode.intervals.includes(iv))s.add(m);}});
  return[...s].sort((a,b)=>a-b);
}
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};

// ── SHARED STYLES ─────────────────────────────────────────────────────────
const navBtn={background:'transparent',border:'1px solid #2a2840',color:'#aaa',width:'32px',height:'38px',borderRadius:'8px',cursor:'pointer',fontSize:'20px',flexShrink:0,padding:0,lineHeight:'1',textAlign:'center'};
const scaleBtn={background:'#ffd93d22',color:'#ffd93d',border:'1px solid #ffd93d44',padding:'5px 11px',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:700,minHeight:'32px'};

// ── AUDIO ─────────────────────────────────────────────────────────────────
let _ctx=null,_unlocked=false;
function getCtx(){if(!_ctx)_ctx=new(window.AudioContext||window.webkitAudioContext)();if(_ctx.state==='suspended')_ctx.resume();return _ctx;}
function unlock(){if(_unlocked)return;const ctx=getCtx();const b=ctx.createBuffer(1,1,22050);const s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0);ctx.resume().then(()=>{_unlocked=true;});}
function pluck(ctx,freq,when,vol=0.16){[[1,1],[2,.45],[3,.22],[4,.09]].forEach(([h,a])=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sine';o.frequency.value=freq*h;f.type='lowpass';f.frequency.value=Math.min(3200,freq*h*3);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vol*a,when+0.005);g.gain.exponentialRampToValueAtTime(0.0001,when+(h===1?1.6:.9));o.connect(f);f.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+2);});}
const hz=m=>440*Math.pow(2,(m-69)/12);
function playMidi(midis,gap=0.1){unlock();const ctx=getCtx(),now=ctx.currentTime+0.04;midis.forEach((m,i)=>pluck(ctx,hz(m),now+i*gap));}

// ── FRETBOARD DIAGRAM ─────────────────────────────────────────────────────
function FretboardDiagram({rootNote,mode,wStart=1,nFrets=5,onTap}){
  const FW=50,SH=26,L=24,T=22,DR=10;
  const W=L+nFrets*FW+8, H=T+5*SH+16;
  const sy=r=>T+r*SH, fx=c=>L+(c+0.5)*FW;
  const showNut=wStart===1;
  const deg=(si,fret)=>{const iv=((((OPEN_MIDI[si]+fret)%12+12)%12)-rootNote+12)%12;return mode.intervals.includes(iv)?mode.degMap[iv]:null;};
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',touchAction:'manipulation'}}>
      {Array.from({length:nFrets},(_,c)=>(
        <text key={c} x={fx(c)} y={T-8} fontSize={8} fill="#4a5568" textAnchor="middle">{wStart+c}</text>
      ))}
      {STR_ORDER.map((_,row)=>(
        <line key={row} x1={L} y1={sy(row)} x2={L+nFrets*FW} y2={sy(row)} stroke="#1e2d42" strokeWidth={0.7+row*0.38}/>
      ))}
      {Array.from({length:nFrets+1},(_,c)=>(
        <line key={c} x1={L+c*FW} y1={T} x2={L+c*FW} y2={T+5*SH}
          stroke={c===0&&showNut?'#666':'#182030'} strokeWidth={c===0&&showNut?4:1.5}/>
      ))}
      {[3,5,7,9,12,15].flatMap(f=>{
        const c=f-wStart;if(c<0||c>=nFrets)return[];
        const x=L+(c+0.5)*FW;
        return f===12?[
          <circle key="a" cx={x} cy={sy(1.5)} r={3} fill="#1a2d3e"/>,
          <circle key="b" cx={x} cy={sy(3.5)} r={3} fill="#1a2d3e"/>,
        ]:[<circle key={f} cx={x} cy={sy(2.5)} r={3} fill="#1a2d3e"/>];
      })}
      {STR_LABELS.map((lbl,row)=>(
        <text key={row} x={L-7} y={sy(row)} fontSize={8} fill="#3a4a5a" textAnchor="middle" dominantBaseline="central">{lbl}</text>
      ))}
      {STR_ORDER.flatMap((si,row)=>Array.from({length:nFrets},(_,c)=>{
        const fret=wStart+c,d=deg(si,fret);if(!d)return null;
        const x=fx(c),y=sy(row),col=DC[d]||'#ffd93d';
        return(
          <g key={`${row}-${c}`} onClick={()=>onTap&&onTap(OPEN_MIDI[si]+fret)} style={{cursor:onTap?'pointer':'default'}}>
            <circle cx={x} cy={y} r={18} fill="transparent"/>
            <circle cx={x} cy={y} r={DR} fill={col} opacity={0.93}/>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fontSize={d.length>2?5.5:d.length>1?6.5:7.5} fill="#111" fontWeight="bold" fontFamily="sans-serif">{d}</text>
          </g>
        );
      }).filter(Boolean))}
    </svg>
  );
}

// ── SCALE DOTS ────────────────────────────────────────────────────────────
function ScaleDots({mode}){
  return(
    <div style={{display:'flex',gap:'2px',flexWrap:'wrap'}}>
      {Array.from({length:12},(_,i)=>{
        const ok=mode.intervals.includes(i),d=mode.degMap[i];
        return(
          <div key={i} style={{width:'18px',height:'18px',borderRadius:'50%',flexShrink:0,
            background:ok?(DC[d]||'#ffd93d'):'#131220',border:`1px solid ${ok?(DC[d]||'#ffd93d')+'66':'#1a1928'}`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            {ok&&d&&<span style={{fontSize:'5.5px',fontWeight:700,color:'#111'}}>{d}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── FRETBOARD CONTROLS (shared) ───────────────────────────────────────────
function FretNav({wStart,setWStart,rootNote,mode,showFull,onPlay}){
  return(
    <div>
      {showFull?(
        <div style={{background:'#0c0b17',borderRadius:'8px',padding:'8px',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <FretboardDiagram rootNote={rootNote} mode={mode} wStart={1} nFrets={15} onTap={m=>playMidi([m])}/>
          <div style={{fontSize:'9px',color:'#3a4050',textAlign:'center',marginTop:'3px'}}>← scroll →</div>
        </div>
      ):(
        <div style={{background:'#0c0b17',borderRadius:'8px',padding:'8px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <button onClick={()=>setWStart(w=>Math.max(1,w-1))} style={navBtn}>‹</button>
            <div style={{flex:1,overflow:'hidden'}}><FretboardDiagram rootNote={rootNote} mode={mode} wStart={wStart} nFrets={5} onTap={m=>playMidi([m])}/></div>
            <button onClick={()=>setWStart(w=>Math.min(12,w+1))} style={navBtn}>›</button>
          </div>
          <div style={{display:'flex',gap:'3px',justifyContent:'center',marginTop:'6px'}}>
            {[1,3,5,7,9,12].map(f=>(
              <button key={f} onClick={()=>setWStart(f)} style={{width:'24px',height:'17px',background:wStart===f?mode.color:'transparent',
                border:`1px solid ${wStart===f?mode.color:'#2a2840'}`,borderRadius:'4px',cursor:'pointer',fontSize:'8px',color:wStart===f?'#111':'#555'}}>{f}</button>
            ))}
          </div>
          <div style={{textAlign:'center',fontSize:'9px',color:'#3a4050',marginTop:'3px'}}>Frets {wStart}–{wStart+4} · tap dots to hear</div>
        </div>
      )}
    </div>
  );
}

// ── MODES TAB ─────────────────────────────────────────────────────────────
function ModesTab(){
  const[sel,setSel]=useState(null);
  const[wStart,setWStart]=useState(1);
  const[showFull,setShowFull]=useState(false);
  const mode=sel!=null?MODES[sel]:null;
  if(mode){
    const pk=getParentKey(mode.example.chordRoot,mode.id);
    return(
      <div style={{padding:'14px',maxWidth:'520px',margin:'0 auto'}}>
        <button onClick={()=>{setSel(null);setShowFull(false);}} style={{background:'transparent',border:'1px solid #2a2840',color:'#aaa',padding:'5px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',marginBottom:'12px'}}>← Back</button>
        <div style={{marginBottom:'12px'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'3px'}}>
            <div style={{width:'13px',height:'13px',borderRadius:'50%',background:mode.color,flexShrink:0}}/>
            <div style={{fontSize:'20px',fontWeight:900,color:'#fff'}}>{mode.name}</div>
            {mode.special&&<span style={{fontSize:'9px',background:mode.color+'33',color:mode.color,padding:'2px 8px',borderRadius:'5px',fontWeight:700}}>★ KEY MODE</span>}
          </div>
          <div style={{fontSize:'11px',color:'#666',marginBottom:'10px',paddingLeft:'21px'}}>{mode.short}</div>
          <div style={{background:'#13121f',borderRadius:'9px',padding:'10px 12px',border:`1px solid ${mode.color}33`,marginBottom:'10px'}}>
            <div style={{fontSize:'9px',color:'#555',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'7px'}}>Formula</div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
              {mode.formula.split(' ').map((d,i)=>(
                <span key={i} style={{background:(DC[d]||'#333')+'22',color:DC[d]||'#aaa',padding:'4px 10px',borderRadius:'8px',fontSize:'13px',fontWeight:700,border:`1px solid ${(DC[d]||'#333')}44`}}>{d}</span>
              ))}
            </div>
          </div>
          <div style={{fontSize:'12px',color:'#ccc',lineHeight:'1.6',marginBottom:'10px'}}>{mode.desc}</div>
          <div style={{background:'#0f0e17',borderRadius:'9px',padding:'9px 11px',border:`1px solid ${mode.color}44`,marginBottom:'10px'}}>
            <div style={{fontSize:'9px',color:mode.color,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'4px',fontWeight:700}}>Jazz Application</div>
            <div style={{fontSize:'12px',color:'#ddd',fontWeight:600,marginBottom:'3px'}}>{mode.jazzRule}</div>
            <div style={{fontSize:'11px',color:'#777'}}>{mode.keyRule}</div>
          </div>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'12px'}}>
            {mode.chords.map(c=><span key={c} style={{background:mode.color+'22',color:mode.color,padding:'3px 9px',borderRadius:'10px',fontSize:'12px',fontWeight:700,border:`1px solid ${mode.color}44`}}>{c}</span>)}
          </div>
          <div style={{fontSize:'10px',color:'#555',marginBottom:'5px'}}>
            Example: <span style={{color:'#fff',fontWeight:700}}>{NOTE_NAMES[mode.example.chordRoot]} {mode.name}</span> over <span style={{color:mode.color}}>{mode.example.chord}</span>
            {' · '}Parent key: <span style={{color:'#ffd93d',fontWeight:700}}>{NOTE_NAMES[pk]} mel. minor</span>
          </div>
        </div>
        <div style={{background:'#13121f',borderRadius:'10px',padding:'10px',border:`1px solid ${mode.color}22`,marginBottom:'8px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',flexWrap:'wrap'}}>
            <div style={{fontSize:'11px',color:'#777',flex:1}}>{NOTE_NAMES[mode.example.chordRoot]} {mode.name}</div>
            <button onClick={()=>setShowFull(v=>!v)} style={{...scaleBtn,color:showFull?mode.color:'#777',borderColor:showFull?mode.color:'#2a2840'}}>
              {showFull?'Full ●':'Full'}
            </button>
            <button onClick={()=>playMidi(getScaleMidi(mode.example.chordRoot,mode,showFull?1:wStart,showFull?15:5),0.1)} style={scaleBtn}>▶ Play</button>
          </div>
          <FretNav wStart={wStart} setWStart={w=>{setWStart(w);setShowFull(false);}} rootNote={mode.example.chordRoot} mode={mode} showFull={showFull} />
        </div>
      </div>
    );
  }
  return(
    <div style={{padding:'14px',maxWidth:'520px',margin:'0 auto'}}>
      <div style={{fontSize:'16px',fontWeight:900,color:'#fff',marginBottom:'2px'}}>7 Modes of Melodic Minor</div>
      <div style={{fontSize:'11px',color:'#777',marginBottom:'12px'}}>One parent scale — seven distinct sounds</div>
      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
        {MODES.map((m,i)=>(
          <div key={m.id} onClick={()=>{setSel(i);setWStart(getDefaultWin(m.example.chordRoot));}}
            style={{background:'#13121f',borderRadius:'10px',padding:'10px 12px',border:`1px solid ${m.color}22`,cursor:'pointer',transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=m.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor=`${m.color}22`}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'20px',flexShrink:0,paddingTop:'2px'}}>
                <div style={{fontSize:'8px',color:m.color,fontWeight:700}}>#{m.id}</div>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:m.color,marginTop:'3px'}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:'13px',color:'#fff'}}>{m.name}</span>
                  {m.special&&<span style={{fontSize:'8px',background:m.color+'33',color:m.color,padding:'1px 5px',borderRadius:'5px',fontWeight:700}}>KEY</span>}
                </div>
                <div style={{fontSize:'9px',color:'#555',marginBottom:'6px'}}>{m.short}</div>
                <ScaleDots mode={m}/>
              </div>
              <div style={{flexShrink:0,fontSize:'9px',color:'#555',textAlign:'right',maxWidth:'68px',lineHeight:'1.5'}}>
                {m.chords.join('\n')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FRETBOARD TAB ─────────────────────────────────────────────────────────
function FretboardTab(){
  const[root,setRoot]=useState(7);
  const[modeId,setModeId]=useState(7);
  const[wStart,setWStart]=useState(()=>getDefaultWin(7));
  const[showFull,setShowFull]=useState(false);
  const mode=MODES.find(m=>m.id===modeId);
  const pk=getParentKey(root,modeId);

  useEffect(()=>{
    (async()=>{try{const r=await window.storage.get('mm_r');const m=await window.storage.get('mm_m');if(r){const rv=parseInt(r.value);setRoot(rv);setWStart(getDefaultWin(rv));}if(m)setModeId(parseInt(m.value));}catch(e){}})();
  },[]);
  const savePrefs=async(r,m)=>{try{await window.storage.set('mm_r',String(r));await window.storage.set('mm_m',String(m));}catch(e){}};

  const handleRoot=r=>{setRoot(r);setWStart(getDefaultWin(r));savePrefs(r,modeId);};
  const handleMode=m=>{setModeId(m);savePrefs(root,m);};

  return(
    <div style={{padding:'12px',maxWidth:'520px',margin:'0 auto'}}>
      <div style={{marginBottom:'10px'}}>
        <div style={{fontSize:'9px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'5px'}}>Root Note</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'3px'}}>
          {NOTE_NAMES.map((n,i)=>(
            <button key={i} onClick={()=>handleRoot(i)} style={{padding:'5px 7px',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:700,
              border:`1px solid ${i===root?'#ffd93d':'#2a2840'}`,background:i===root?'#ffd93d22':'transparent',
              color:i===root?'#ffd93d':'#666',transition:'all .15s',minHeight:'32px'}}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={{fontSize:'9px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'5px'}}>Mode</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>handleMode(m.id)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 9px',borderRadius:'8px',cursor:'pointer',
              border:`1px solid ${m.id===modeId?m.color:m.color+'22'}`,background:m.id===modeId?m.color+'18':'transparent',
              transition:'all .15s',textAlign:'left',width:'100%',minHeight:'34px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:m.color,flexShrink:0}}/>
              <span style={{fontSize:'11px',fontWeight:700,color:m.id===modeId?m.color:'#777',flex:1}}>{m.name}</span>
              {m.special&&<span style={{fontSize:'8px',color:m.color,fontWeight:700}}>★</span>}
              <span style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>{m.chords[0]}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{background:'#13121f',borderRadius:'9px',padding:'8px 10px',border:`1px solid ${mode.color}44`,marginBottom:'8px',display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:'13px',fontWeight:900,color:'#fff'}}>{NOTE_NAMES[root]} {mode.name}</div>
          <div style={{fontSize:'10px',color:'#777',marginTop:'1px'}}>Parent: <span style={{color:'#ffd93d',fontWeight:700}}>{NOTE_NAMES[pk]} melodic minor</span></div>
        </div>
        <button onClick={()=>setShowFull(v=>!v)} style={{...scaleBtn,color:showFull?mode.color:'#777',borderColor:showFull?mode.color+'88':'#2a2840'}}>
          {showFull?'Full ●':'Full'}
        </button>
        <button onClick={()=>playMidi(getScaleMidi(root,mode,showFull?1:wStart,showFull?15:5),0.1)} style={scaleBtn}>▶ Play</button>
      </div>
      <div style={{display:'flex',gap:'3px',flexWrap:'wrap',marginBottom:'8px',padding:'7px 9px',background:'#13121f',borderRadius:'8px',border:'1px solid #1a1928'}}>
        {mode.formula.split(' ').map((d,i)=>(
          <span key={i} style={{background:(DC[d]||'#333')+'28',color:DC[d]||'#aaa',padding:'2px 7px',borderRadius:'5px',fontSize:'11px',fontWeight:700}}>{d}</span>
        ))}
      </div>
      <div style={{background:'#13121f',borderRadius:'10px',padding:'10px',border:`1px solid ${mode.color}22`}}>
        <FretNav wStart={wStart} setWStart={w=>{setWStart(w);setShowFull(false);}} rootNote={root} mode={mode} showFull={showFull}/>
      </div>
      <div style={{marginTop:'8px',padding:'8px 10px',background:'#13121f',borderRadius:'9px',border:`1px solid ${mode.color}22`}}>
        <div style={{fontSize:'11px',color:'#bbb',lineHeight:'1.6',marginBottom:'3px'}}>{mode.desc}</div>
        <div style={{fontSize:'10px',color:mode.color,fontWeight:600}}>{mode.jazzRule}</div>
      </div>
    </div>
  );
}

// ── SCALE MAP TAB ─────────────────────────────────────────────────────────
function ScaleMapTab(){
  const[view,setView]=useState('lookup');
  const[selIdx,setSelIdx]=useState(6);
  const[chordRoot,setChordRoot]=useState(7);
  const[keyRoot,setKeyRoot]=useState(0);
  const[wStart,setWStart]=useState(()=>getDefaultWin(7));
  const[showFull,setShowFull]=useState(false);
  const selMode=MODES[selIdx];
  const pk=getParentKey(chordRoot,selMode.id);
  return(
    <div style={{padding:'14px',maxWidth:'520px',margin:'0 auto'}}>
      <div style={{display:'flex',gap:'0',marginBottom:'12px',background:'#13121f',borderRadius:'10px',padding:'3px',border:'1px solid #2a2840'}}>
        {[{id:'lookup',label:'🔍 Chord Lookup'},{id:'breakdown',label:'🗝️ Key Breakdown'}].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{flex:1,padding:'8px 4px',borderRadius:'8px',cursor:'pointer',border:'none',
            background:view===v.id?'#2a2840':'transparent',color:view===v.id?'#ffd93d':'#888',fontSize:'11px',fontWeight:700,transition:'all .15s'}}>{v.label}</button>
        ))}
      </div>
      {view==='lookup'&&(
        <div>
          <div style={{marginBottom:'10px'}}>
            <div style={{fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'5px'}}>Chord Type</div>
            <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
              {MODES.map((m,i)=>(
                <button key={i} onClick={()=>setSelIdx(i)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 9px',borderRadius:'8px',cursor:'pointer',
                  border:`1px solid ${i===selIdx?m.color:m.color+'22'}`,background:i===selIdx?m.color+'18':'transparent',
                  transition:'all .15s',textAlign:'left',width:'100%',minHeight:'34px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:m.color,flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:700,color:i===selIdx?m.color:'#777'}}>{m.chords[0]}</span>
                  <span style={{fontSize:'9px',color:'#555',marginLeft:'2px',flex:1}}>→ {m.name}</span>
                  {m.special&&<span style={{fontSize:'8px',color:m.color}}>★</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:'10px'}}>
            <div style={{fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'5px'}}>Chord Root</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'3px'}}>
              {NOTE_NAMES.map((n,i)=>(
                <button key={i} onClick={()=>{setChordRoot(i);setWStart(getDefaultWin(i));setShowFull(false);}} style={{padding:'5px 7px',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:700,
                  border:`1px solid ${i===chordRoot?'#ffd93d':'#2a2840'}`,background:i===chordRoot?'#ffd93d22':'transparent',
                  color:i===chordRoot?'#ffd93d':'#666',transition:'all .15s',minHeight:'32px'}}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{background:'#13121f',borderRadius:'10px',padding:'11px 12px',border:`1px solid ${selMode.color}44`,marginBottom:'14px'}}>
            <div style={{display:'flex',gap:'8px',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:'15px',fontWeight:900,color:'#fff',marginBottom:'2px'}}>{NOTE_NAMES[chordRoot]}{selMode.chords[0]}</div>
                <div style={{fontSize:'11px',color:selMode.color,fontWeight:700,marginBottom:'2px'}}>{selMode.name}</div>
                <div style={{fontSize:'10px',color:'#777'}}>{selMode.keyRule}</div>
              </div>
              <div style={{textAlign:'center',padding:'8px 14px',background:'#0f0e17',borderRadius:'9px',border:`1px solid ${selMode.color}44`}}>
                <div style={{fontSize:'9px',color:'#555',marginBottom:'2px'}}>Use</div>
                <div style={{fontSize:'18px',fontWeight:900,color:'#ffd93d'}}>{NOTE_NAMES[pk]}</div>
                <div style={{fontSize:'9px',color:'#888'}}>mel. minor</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
              <button onClick={()=>setShowFull(v=>!v)} style={{...scaleBtn,fontSize:'10px',color:showFull?selMode.color:'#777',borderColor:showFull?selMode.color:'#2a2840'}}>
                {showFull?'Full ●':'Full'}
              </button>
              <button onClick={()=>playMidi(getScaleMidi(chordRoot,selMode,showFull?1:wStart,showFull?15:5),0.1)} style={scaleBtn}>▶ Play</button>
            </div>
            <FretNav wStart={wStart} setWStart={w=>{setWStart(w);setShowFull(false);}} rootNote={chordRoot} mode={selMode} showFull={showFull}/>
          </div>
          <div style={{marginBottom:'4px',fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px'}}>Minor ii–V–i · A minor</div>
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {[{chord:'Bø',rn:'iiø',modeId:6,cr:11},{chord:'E7alt',rn:'V7alt',modeId:7,cr:4},{chord:'AmMaj7',rn:'i',modeId:1,cr:9}].map((item,i)=>{
              const m=MODES.find(x=>x.id===item.modeId),p=getParentKey(item.cr,item.modeId);
              return(
                <div key={i} style={{background:'#13121f',borderRadius:'8px',padding:'8px 10px',border:`1px solid ${m.color}33`,display:'flex',gap:'8px',alignItems:'center'}}>
                  <div style={{fontSize:'13px',fontWeight:900,color:'#fff',minWidth:'68px'}}>{item.chord}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'10px',color:m.color,fontWeight:700}}>{m.name}</div>
                    <div style={{fontSize:'9px',color:'#555'}}><span style={{color:'#ffd93d'}}>{NOTE_NAMES[p]}</span> mel. minor</div>
                  </div>
                  <div style={{fontSize:'9px',color:'#444'}}>{item.rn}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view==='breakdown'&&(
        <div>
          <div style={{marginBottom:'10px'}}>
            <div style={{fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'5px'}}>Melodic Minor Key</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'3px'}}>
              {NOTE_NAMES.map((n,i)=>(
                <button key={i} onClick={()=>setKeyRoot(i)} style={{padding:'5px 7px',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:700,
                  border:`1px solid ${i===keyRoot?'#a29bfe':'#2a2840'}`,background:i===keyRoot?'#a29bfe22':'transparent',
                  color:i===keyRoot?'#a29bfe':'#666',transition:'all .15s',minHeight:'32px'}}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{fontSize:'13px',fontWeight:700,color:'#fff',marginBottom:'8px'}}>{NOTE_NAMES[keyRoot]} Melodic Minor — 7 sounds:</div>
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {MODES.map((m,i)=>{
              const cr=(keyRoot+MODE_OFFSETS[i])%12;
              return(
                <div key={m.id} style={{background:'#13121f',borderRadius:'9px',padding:'9px 11px',border:`1px solid ${m.color}22`,display:'flex',gap:'9px',alignItems:'center'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',background:m.color,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:900,color:'#111'}}>{m.id}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'11px',color:m.color,fontWeight:700}}>{m.name}</div>
                    <div style={{fontSize:'9px',color:'#555'}}>{m.chords.join(' · ')}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'15px',fontWeight:900,color:'#fff'}}>{NOTE_NAMES[cr]}</div>
                    <div style={{fontSize:'8px',color:'#555'}}>{m.chords[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── QUIZ TAB ──────────────────────────────────────────────────────────────
function QuizTab(){
  const QL=10;
  const[phase,setPhase]=useState('setup');
  const[qType,setQType]=useState('scale');
  const[qs,setQs]=useState([]);
  const[qi,setQi]=useState(0);
  const[picked,setPicked]=useState(null);
  const[results,setResults]=useState([]);

  const makeScaleQ=()=>{
    const m=MODES[Math.floor(Math.random()*7)];
    const cr=Math.floor(Math.random()*12);
    const correct=getParentKey(cr,m.id);
    const wrong=shuffle(NOTE_NAMES.map((_,i)=>i).filter(i=>i!==correct)).slice(0,3);
    return{type:'scale',mode:m,chordRoot:cr,correct,choices:shuffle([correct,...wrong]),
      q:`What mel. minor key works over ${NOTE_NAMES[cr]}${m.chords[0]}?`};
  };
  const makeModeQ=()=>{
    const m=MODES[Math.floor(Math.random()*7)];
    const wrong=shuffle(MODES.filter(x=>x.id!==m.id)).slice(0,3).map(x=>x.id);
    return{type:'mode',mode:m,correct:m.id,choices:shuffle([m.id,...wrong]),
      q:`Which mode works over "${m.chords[0]}" chords?`};
  };
  const start=()=>{
    setQs(Array.from({length:QL},()=>qType==='scale'?makeScaleQ():makeModeQ()));
    setQi(0);setPicked(null);setResults([]);setPhase('playing');
  };
  const pick=c=>{
    if(picked!==null)return;
    setPicked(c);
    const ok=c===qs[qi].correct;
    setResults(r=>[...r,{correct:ok}]);
    if(ok)setTimeout(()=>{if(qi+1>=QL)setPhase('done');else{setQi(i=>i+1);setPicked(null);}},700);
  };
  const next=()=>{if(qi+1>=QL)setPhase('done');else{setQi(i=>i+1);setPicked(null);}};

  if(phase==='setup')return(
    <div style={{padding:'20px 14px',maxWidth:'400px',margin:'0 auto'}}>
      <div style={{textAlign:'center',marginBottom:'16px'}}>
        <div style={{fontSize:'40px',marginBottom:'6px'}}>🎯</div>
        <div style={{fontSize:'20px',fontWeight:900,color:'#fff',marginBottom:'3px'}}>Scale Quiz</div>
        <div style={{fontSize:'12px',color:'#888'}}>Test your melodic minor knowledge</div>
      </div>
      <div style={{marginBottom:'14px'}}>
        <div style={{fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'7px'}}>Quiz Type</div>
        {[{id:'scale',label:'🗝️ Chord → Scale Key',desc:'Given a chord and root, which mel. minor key?'},
          {id:'mode',label:'🎼 Chord → Mode Name',desc:'Given a chord quality, which mode name fits?'}].map(qt=>(
          <button key={qt.id} onClick={()=>setQType(qt.id)} style={{display:'flex',flexDirection:'column',padding:'10px',borderRadius:'9px',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:'6px',
            border:`1px solid ${qType===qt.id?'#ffd93d':'#2a2840'}`,background:qType===qt.id?'#ffd93d11':'#13121f'}}>
            <div style={{fontWeight:700,fontSize:'13px',color:qType===qt.id?'#ffd93d':'#bbb'}}>{qt.label}</div>
            <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>{qt.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={start} style={{display:'block',width:'100%',background:'#ffd93d',color:'#111',border:'none',padding:'13px',borderRadius:'11px',fontSize:'15px',fontWeight:900,cursor:'pointer'}}>Start Quiz 🎸</button>
    </div>
  );
  if(phase==='done'){
    const sc=results.filter(r=>r.correct).length,pct=Math.round(sc/QL*100);
    return(
      <div style={{padding:'28px 14px',maxWidth:'360px',margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:'50px',marginBottom:'4px'}}>{pct===100?'🏆':pct>=70?'⭐':'💪'}</div>
        <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'2px'}}>{pct>=80?'Sharp ears!':pct>=60?'Getting there!':'Keep studying!'}</div>
        <div style={{fontSize:'52px',fontWeight:900,color:'#ffd93d',lineHeight:1,marginBottom:'2px'}}>{sc}/{QL}</div>
        <div style={{color:'#aaa',marginBottom:'14px'}}>{pct}% correct</div>
        <div style={{display:'flex',gap:'4px',justifyContent:'center',flexWrap:'wrap',marginBottom:'16px'}}>
          {results.map((r,i)=><div key={i} style={{width:'24px',height:'24px',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',background:r.correct?'#00b89420':'#ff636320',border:`1px solid ${r.correct?'#00b894':'#ff6363'}`,color:r.correct?'#00b894':'#ff6363'}}>{r.correct?'✓':'✗'}</div>)}
        </div>
        <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
          <button onClick={()=>setPhase('setup')} style={{background:'transparent',border:'1px solid #2a2840',color:'#aaa',padding:'8px 16px',borderRadius:'9px',cursor:'pointer',fontSize:'12px'}}>Settings</button>
          <button onClick={start} style={{background:'#ffd93d',color:'#111',border:'none',padding:'8px 24px',borderRadius:'9px',fontSize:'13px',fontWeight:800,cursor:'pointer'}}>Again</button>
        </div>
      </div>
    );
  }
  const q=qs[qi];if(!q)return null;
  const sc=results.filter(r=>r.correct).length;
  const isCorrect=picked===q.correct;
  return(
    <div style={{padding:'12px',maxWidth:'420px',margin:'0 auto'}}>
      <div style={{marginBottom:'12px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
          <span style={{color:'#777',fontSize:'11px'}}>Q{qi+1}/{QL}</span>
          <span style={{color:'#ffd93d',fontSize:'11px',fontWeight:700}}>{sc} correct</span>
        </div>
        <div style={{background:'#1a1928',borderRadius:'3px',height:'4px'}}>
          <div style={{background:`linear-gradient(90deg,${q.mode.color},#ffd93d)`,height:'4px',borderRadius:'3px',width:`${(qi/QL)*100}%`,transition:'width .3s'}}/>
        </div>
      </div>
      <div style={{background:'#13121f',borderRadius:'10px',padding:'12px',border:'1px solid #2a2840',marginBottom:'12px',textAlign:'center'}}>
        <div style={{fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'6px'}}>Question</div>
        <div style={{fontSize:'14px',fontWeight:700,color:'#fff',lineHeight:'1.5'}}>{q.q}</div>
        {picked!==null&&<div style={{fontSize:'11px',color:'#888',marginTop:'6px',fontStyle:'italic'}}>{q.mode.jazzRule}</div>}
      </div>
      {q.type==='scale'?(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'10px'}}>
          {q.choices.map(c=>{
            const sel=picked===c,isC=c===q.correct,show=picked!==null;
            return(
              <button key={c} onClick={()=>pick(c)} style={{padding:'12px',borderRadius:'10px',cursor:picked?'default':'pointer',
                border:`2px solid ${!show?'#2a2840':isC?'#00b894':sel?'#ff6363':'#2a2840'}`,
                background:!show?'#13121f':isC?'#00b89420':sel?'#ff636320':'#13121f',
                fontSize:'16px',fontWeight:900,color:'#fff',transition:'all .2s',minHeight:'56px'}}>
                {NOTE_NAMES[c]}<div style={{fontSize:'9px',color:'#555',fontWeight:400,marginTop:'2px'}}>mel. minor</div>
                {show&&<div style={{fontSize:'13px',color:isC?'#00b894':sel?'#ff6363':'transparent',marginTop:'2px'}}>{isC?'✓':sel?'✗':' '}</div>}
              </button>
            );
          })}
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'10px'}}>
          {q.choices.map(c=>{
            const m=MODES.find(x=>x.id===c),sel=picked===c,isC=c===q.correct,show=picked!==null;
            return(
              <button key={c} onClick={()=>pick(c)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 12px',borderRadius:'10px',cursor:picked?'default':'pointer',
                border:`2px solid ${!show?m.color+'33':isC?'#00b894':sel?'#ff6363':m.color+'22'}`,
                background:!show?'#13121f':isC?'#00b89420':sel?'#ff636320':'#13121f',
                transition:'all .2s',textAlign:'left',width:'100%',minHeight:'44px'}}>
                <div style={{width:'9px',height:'9px',borderRadius:'50%',background:m.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{m.name}</div>
                  <div style={{fontSize:'9px',color:'#555'}}>{m.short}</div>
                </div>
                {show&&<span style={{fontSize:'13px',color:isC?'#00b894':sel?'#ff6363':'transparent'}}>{isC?'✓':sel?'✗':' '}</span>}
              </button>
            );
          })}
        </div>
      )}
      {picked!==null&&!isCorrect&&(
        <button onClick={next} style={{display:'block',width:'100%',background:'#ffd93d',color:'#111',border:'none',padding:'11px',borderRadius:'10px',fontSize:'14px',fontWeight:800,cursor:'pointer'}}>
          Next →
        </button>
      )}
    </div>
  );
}

// ── GUIDE TAB ─────────────────────────────────────────────────────────────
function GuideTab(){
  const[open,setOpen]=useState(null);
  const S=[
    {id:'r1',icon:'🔑',title:'The #1 Rule: Altered Scale',color:'#e17055',
     body:`The most important rule in jazz: over any altered dominant (V7alt), play melodic minor starting a HALF STEP above the chord root.

G7alt → Ab melodic minor
D7alt → Eb melodic minor
E7alt → F melodic minor
B7alt → C melodic minor

Why? The 7th degree of Ab melodic minor is G. That scale gives G its b9, #9, #11, and b13 — every possible altered tension from a single scale.`},
    {id:'r2',icon:'🎵',title:'Lydian Dominant & Tritone Subs',color:'#00b894',
     body:`Lydian Dominant (mode 4) is a dominant 7th with a #11 — the tritone sub sound.

Over V7#11 → mel. minor a P4 below chord root:
G7#11 → D mel. minor
F7#11 → C mel. minor

For tritone substitutions (bII7 replaces V7):
Db7 (sub for G7) → Ab mel. minor (Db Lydian Dominant)

The Lydian Dominant scale is the sound of movement without full resolution — bright, floating, cinematic.`},
    {id:'r3',icon:'🌙',title:'Minor ii–V–i in Full',color:'#4ecdc4',
     body:`Three different melodic minor modes chain through a minor ii-V-i:

1. iiø (half-diminished) → Locrian #2
   Play mel. minor a minor 3rd ABOVE chord root.
   Bø → D mel. minor

2. V7alt (altered dominant) → Altered Scale
   Play mel. minor a HALF STEP above chord root.
   E7alt → F mel. minor

3. i(Maj7) (tonic minor) → Melodic Minor
   Play mel. minor from the chord root.
   AmMaj7 → A mel. minor`},
    {id:'r4',icon:'🗝️',title:'One Key, Seven Sounds',color:'#a29bfe',
     body:`Every melodic minor scale unlocks 7 chord-scale pairs. C melodic minor:

Mode 1 → C:  CmMaj7      (Melodic Minor)
Mode 2 → D:  D7sus(b9)   (Dorian b2)
Mode 3 → Eb: EbMaj7#5    (Lydian Augmented)
Mode 4 → F:  F7#11       (Lydian Dominant)
Mode 5 → G:  G7b13       (Mixolydian b6)
Mode 6 → A:  Aø          (Locrian #2)
Mode 7 → B:  B7alt       (Altered Scale)

Practice tip: focus on one melodic minor key per week and drill all 7 of its modes in that key.`},
    {id:'r5',icon:'🎸',title:'Getting Started on Guitar',color:'#74b9ff',
     body:`Practical order for a jazz guitarist:

1. Start with the Altered Scale (mode 7).
   It's the most immediately useful in jazz.
   Drill: memorise the half-step-above rule cold.

2. Add Lydian Dominant (mode 4) next.
   Works over tritone subs and 7#11 — very common.

3. Add Locrian #2 (mode 6) for minor ii-V-i.

4. Learn one position at a time using the Fretboard tab.
   Start at frets 5–9 where the neck is most playable.

5. Connect scales to chord shapes:
   Shell chord on string 6 at fret 3 (G7) → Altered Scale
   starts at Ab on the same strings — just one fret up.`},
    {id:'r6',icon:'🎨',title:'Degree Colour Guide',color:'#ffd93d',
     body:`The fretboard uses the same colour system as ChordTrainer:

● Red    R     — Root. Tonal anchor.
● Yellow 3/b3  — 3rd. Defines major/minor quality.
● Green  9,6,13— Safe extensions. Add freely.
● Cyan   #11   — Lydian brightness. Lydian Dom signature.
● Purple b9,#9 — Altered tensions. Handle with care.
● Pink   b13,b5— More altered colour. Resolve well.
● Grey   5     — Perfect 5th. Stable, least interesting.
● Blue   4     — Sus 4th. Sus chord identity.`},
  ];
  return(
    <div style={{padding:'14px',maxWidth:'520px',margin:'0 auto'}}>
      <div style={{fontSize:'16px',fontWeight:900,color:'#fff',marginBottom:'2px'}}>Theory Guide</div>
      <div style={{fontSize:'11px',color:'#777',marginBottom:'12px'}}>Melodic minor applied to jazz guitar</div>
      <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
        {S.map(s=>{
          const isO=open===s.id;
          return(
            <div key={s.id} style={{background:'#13121f',borderRadius:'10px',border:`1px solid ${isO?s.color+'55':s.color+'22'}`,overflow:'hidden',transition:'border-color .2s'}}>
              <button onClick={()=>setOpen(isO?null:s.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'11px 12px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:'18px',flexShrink:0}}>{s.icon}</span>
                <span style={{flex:1,fontWeight:700,fontSize:'13px',color:s.color}}>{s.title}</span>
                <span style={{color:'#444',fontSize:'14px',flexShrink:0,display:'inline-block',transition:'transform .2s',transform:isO?'rotate(180deg)':'none'}}>▾</span>
              </button>
              {isO&&<div style={{padding:'0 12px 12px'}}>
                <div style={{fontSize:'12px',color:'#ccc',lineHeight:'1.8',whiteSpace:'pre-line'}}>{s.body.trim()}</div>
              </div>}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:'14px',textAlign:'center',padding:'10px',background:'#13121f',borderRadius:'10px',border:'1px solid #1a1928'}}>
        <div style={{fontSize:'12px',color:'#444'}}>Part of the <span style={{color:'#ffd93d',fontWeight:700}}>Jazz Guitar Toolbox</span> by Zak</div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState('fretboard');
  const TABS=[
    {id:'modes',label:'Modes',icon:'🎼'},
    {id:'fretboard',label:'Fretboard',icon:'🎸'},
    {id:'map',label:'Scale Map',icon:'🗺️'},
    {id:'quiz',label:'Quiz',icon:'🎯'},
    {id:'guide',label:'Guide',icon:'📖'},
  ];
  return(
    <div style={{background:'#0f0e17',minHeight:'100vh',color:'#fffffe',fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:'100vw',overflowX:'hidden'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid #1a1928',display:'flex',alignItems:'center',gap:'8px'}}>
        <div style={{display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:'16px',fontWeight:900,lineHeight:'1.1'}}>🎼 <span style={{color:'#ffd93d'}}>Melodic</span>Minor</div>
          <div style={{fontSize:'9px',color:'#444',letterSpacing:'1px',paddingLeft:'22px'}}>Jazz Guitar Toolbox · by Zak</div>
        </div>
      </div>
      <div style={{display:'flex',borderBottom:'1px solid #1a1928',overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:'0 0 auto',padding:'10px 10px',background:'transparent',border:'none',cursor:'pointer',fontSize:'10px',fontWeight:600,color:tab===t.id?'#ffd93d':'#666',borderBottom:tab===t.id?'2px solid #ffd93d':'2px solid transparent',whiteSpace:'nowrap',minHeight:'44px',transition:'color .15s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div style={{paddingBottom:'40px'}}>
        {tab==='modes'&&<ModesTab/>}
        {tab==='fretboard'&&<FretboardTab/>}
        {tab==='map'&&<ScaleMapTab/>}
        {tab==='quiz'&&<QuizTab/>}
        {tab==='guide'&&<GuideTab/>}
      </div>
    </div>
  );
}
