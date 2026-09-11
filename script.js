(() => {
  const DESIGN_W=853, DESIGN_H=1510;
  const app=document.getElementById('app');
  const ui=document.getElementById('ui');
  const modeToggle=document.getElementById('modeToggle');
  const rpm33=document.getElementById('rpm33');
  const rpm45=document.getElementById('rpm45');
  const startStop=document.getElementById('startStop');
  const fineBody=document.getElementById('fineScaleBody');
  const fineKnob=document.getElementById('fineKnob');
  const ultraBody=document.getElementById('ultraScaleBody');
  const ultraKnob=document.getElementById('ultraKnob');
  const digits=[...document.querySelectorAll('.digit')];

  const state={running:false,mode:'phone',baseRPM:33,finePitch:0,ultraPitch:0};

  function surface(){
    const standalone=window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
    const vv=window.visualViewport;
    return {
      w:vv?vv.width:(window.innerWidth||document.documentElement.clientWidth),
      h:standalone?window.screen.height:(vv?vv.height:(window.innerHeight||document.documentElement.clientHeight))
    };
  }

  function fitUI(){
    const {w,h}=surface();
    document.documentElement.style.height=h+'px';
    document.body.style.height=h+'px';
    app.style.width=w+'px'; app.style.height=h+'px';
    const pad=8;
    const scale=Math.min((w-pad*2)/DESIGN_W,(h-pad*2)/DESIGN_H);
    const sw=DESIGN_W*scale, sh=DESIGN_H*scale;
    ui.style.left=((w-sw)/2)+'px';
    ui.style.top=((h-sh)/2)+'px';
    ui.style.transform=`scale(${scale})`;
  }

  window.addEventListener('resize',fitUI,{passive:true});
  window.addEventListener('orientationchange',fitUI,{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',fitUI,{passive:true});
    window.visualViewport.addEventListener('scroll',fitUI,{passive:true});
  }
  fitUI();

  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
  document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
  document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});
  document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

  function buildScales(){
    const l=document.querySelector('.fine-scale.left');
    const r=document.querySelector('.fine-scale.right');
    const u=document.querySelector('.ultra-scale');
    l.innerHTML=''; r.innerHTML=''; u.innerHTML='';
    for(let i=0;i<17;i++){
      const p=(i/16)*100;
      [l,r].forEach(t=>{const x=document.createElement('i');x.className=i%4===0?'major':'';x.style.setProperty('--p',p+'%');t.appendChild(x)});
    }
    for(let i=0;i<21;i++){
      const p=(i/20)*100;
      const x=document.createElement('i');
      x.className=i===0||i===20?'end':i===10?'center':i%5===0?'major':'';
      x.style.setProperty('--p',p+'%');u.appendChild(x);
    }
  }
  buildScales();

  const map={0:['a','b','c','d','e','f'],1:['b','c'],2:['a','b','g','e','d'],3:['a','b','c','d','g'],4:['f','g','b','c'],5:['a','f','g','c','d'],6:['a','f','g','e','c','d'],7:['a','b','c'],8:['a','b','c','d','e','f','g'],9:['a','b','c','d','f','g']};
  digits.forEach(el=>['a','b','c','d','e','f','g'].forEach(n=>{const s=document.createElement('i');s.className=`segment ${['a','g','d'].includes(n)?'h':'v'} ${n}`;el.appendChild(s)}));
  function setDigit(el,n){el.querySelectorAll('.segment').forEach(s=>s.classList.remove('on'));(map[n]||[]).forEach(k=>el.querySelector('.'+k).classList.add('on'))}
  function updateDisplay(){
    const v=Math.min(99.9,Math.abs(state.finePitch+state.ultraPitch));
    const t=v.toFixed(1).padStart(4,'0');
    setDigit(digits[0],+t[0]); setDigit(digits[1],+t[1]); setDigit(digits[2],+t[3]);
  }

  function setMode(m){state.mode=m==='hardware'?'hardware':'phone';modeToggle.classList.toggle('phone-active',state.mode==='phone');modeToggle.classList.toggle('hardware-active',state.mode==='hardware');ui.classList.toggle('hardware-mode',state.mode==='hardware')}
  modeToggle.addEventListener('click',()=>setMode(state.mode==='phone'?'hardware':'phone'));

  function setBaseRPM(r){state.baseRPM=r===45?45:33;rpm33.classList.toggle('selected',state.baseRPM===33);rpm45.classList.toggle('selected',state.baseRPM===45)}
  rpm33.addEventListener('click',()=>setBaseRPM(33)); rpm45.addEventListener('click',()=>setBaseRPM(45));

  function setRunning(v){state.running=!!v;startStop.classList.toggle('running',state.running)}
  startStop.addEventListener('click',()=>setRunning(!state.running));

  function setFinePitch(v){v=Math.max(-8,Math.min(8,Number(v)||0));state.finePitch=v;fineKnob.style.top=((8-v)/16*100)+'%';updateDisplay()}
  function setUltraPitch(v){v=Math.max(-50,Math.min(50,Number(v)||0));state.ultraPitch=v;ultraKnob.style.left=((v+50)/100*100)+'%';updateDisplay()}

  let fd=null,ud=null;
  fineKnob.addEventListener('pointerdown',e=>{if(state.mode!=='phone')return;e.preventDefault();const k=fineKnob.getBoundingClientRect();fd={id:e.pointerId,o:e.clientY-(k.top+k.height/2)};fineKnob.setPointerCapture(e.pointerId)});
  fineKnob.addEventListener('pointermove',e=>{if(!fd||fd.id!==e.pointerId||state.mode!=='phone')return;e.preventDefault();const r=fineBody.getBoundingClientRect();const p=Math.max(0,Math.min(1,(e.clientY-fd.o-r.top)/r.height));setFinePitch(8-p*16)});
  function endF(e){if(!fd||fd.id!==e.pointerId)return;try{fineKnob.releasePointerCapture(e.pointerId)}catch(_){}fd=null} fineKnob.addEventListener('pointerup',endF);fineKnob.addEventListener('pointercancel',endF);

  ultraKnob.addEventListener('pointerdown',e=>{if(state.mode!=='phone')return;e.preventDefault();const k=ultraKnob.getBoundingClientRect();ud={id:e.pointerId,o:e.clientX-(k.left+k.width/2)};ultraKnob.setPointerCapture(e.pointerId)});
  ultraKnob.addEventListener('pointermove',e=>{if(!ud||ud.id!==e.pointerId||state.mode!=='phone')return;e.preventDefault();const r=ultraBody.getBoundingClientRect();const p=Math.max(0,Math.min(1,(e.clientX-ud.o-r.left)/r.width));setUltraPitch(-50+p*100)});
  function endU(e){if(!ud||ud.id!==e.pointerId)return;try{ultraKnob.releasePointerCapture(e.pointerId)}catch(_){}ud=null} ultraKnob.addEventListener('pointerup',endU);ultraKnob.addEventListener('pointercancel',endU);

  fineKnob.addEventListener('dblclick',()=>setFinePitch(0)); ultraKnob.addEventListener('dblclick',()=>setUltraPitch(0));

  window.turntableUI={state,setRunning,setMode,setBaseRPM,setFinePitch,setUltraPitch};
  setMode('phone'); setBaseRPM(33); setFinePitch(0); setUltraPitch(0); setRunning(false); updateDisplay();
})();
