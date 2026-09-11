(() => {
  const app = document.getElementById('app');
  const ui = document.getElementById('ui');

  const startStop = document.getElementById('startStop');
  const modeToggle = document.getElementById('modeToggle');
  const rpm33 = document.getElementById('rpm33');
  const rpm45 = document.getElementById('rpm45');

  const fineScaleBody = document.getElementById('fineScaleBody');
  const fineKnob = document.getElementById('fineKnob');

  const ultraScaleBody = document.getElementById('ultraScaleBody');
  const ultraKnob = document.getElementById('ultraKnob');

  const digits = [...document.querySelectorAll('.digit')];

  const state = {
    running:false,
    mode:'phone',
    baseRPM:33,
    finePitch:0,
    ultraPitch:0
  };

  function fitUI(){
    const standalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    const vv = window.visualViewport;

    const usedWidth =
      vv ? vv.width :
      (window.innerWidth || document.documentElement.clientWidth);

    const usedHeight = standalone
      ? window.screen.height
      : (vv ? vv.height :
        (window.innerHeight || document.documentElement.clientHeight));

    document.documentElement.style.height = usedHeight + 'px';
    document.body.style.height = usedHeight + 'px';

    app.style.width = usedWidth + 'px';
    app.style.height = usedHeight + 'px';

    window.__uiViewportDebug = {
      standalone,
      screenHeight:window.screen.height,
      innerHeight:window.innerHeight,
      clientHeight:document.documentElement.clientHeight,
      visualViewportHeight:vv ? vv.height : null,
      usedWidth,
      usedHeight
    };
  }

  window.addEventListener('resize', fitUI, {passive:true});
  window.addEventListener('orientationchange', fitUI, {passive:true});

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', fitUI, {passive:true});
    window.visualViewport.addEventListener('scroll', fitUI, {passive:true});
  }

  fitUI();

  document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
  document.addEventListener('gesturechange', e => e.preventDefault(), {passive:false});
  document.addEventListener('gestureend', e => e.preventDefault(), {passive:false});
  document.addEventListener('touchmove', e => e.preventDefault(), {passive:false});

  function buildScales(){
    const left = document.querySelector('.fine-left');
    const right = document.querySelector('.fine-right');
    const ultra = document.querySelector('.ultra-scale');

    left.innerHTML = '';
    right.innerHTML = '';
    ultra.innerHTML = '';

    for(let i=0;i<17;i++){
      const p=(i/16)*100;
      for(const target of [left,right]){
        const tick=document.createElement('i');
        tick.className='tick'+(i%4===0?' major':'');
        tick.style.setProperty('--p',p+'%');
        target.appendChild(tick);
      }
    }

    for(let i=0;i<21;i++){
      const p=(i/20)*100;
      const tick=document.createElement('i');
      let cls='tick';
      if(i===0 || i===20) cls+=' end';
      else if(i===10) cls+=' center';
      else if(i%5===0) cls+=' major';
      tick.className=cls;
      tick.style.setProperty('--p',p+'%');
      ultra.appendChild(tick);
    }
  }
  buildScales();

  const segmentMap={
    0:['a','b','c','d','e','f'],
    1:['b','c'],
    2:['a','b','g','e','d'],
    3:['a','b','c','d','g'],
    4:['f','g','b','c'],
    5:['a','f','g','c','d'],
    6:['a','f','g','e','c','d'],
    7:['a','b','c'],
    8:['a','b','c','d','e','f','g'],
    9:['a','b','c','d','f','g']
  };

  digits.forEach(el=>{
    ['a','b','c','d','e','f','g'].forEach(name=>{
      const s=document.createElement('i');
      s.className=`segment ${['a','g','d'].includes(name)?'h':'v'} ${name}`;
      el.appendChild(s);
    });
  });

  function setDigit(el,value){
    el.querySelectorAll('.segment').forEach(s=>s.classList.remove('on'));
    (segmentMap[value]||[]).forEach(name=>{
      el.querySelector('.'+name).classList.add('on');
    });
  }

  function totalPitch(){
    return state.finePitch+state.ultraPitch;
  }

  function updatePitchDisplay(){
    const absValue=Math.min(99.9,Math.abs(totalPitch()));
    const text=absValue.toFixed(1).padStart(4,'0');
    setDigit(digits[0],Number(text[0]));
    setDigit(digits[1],Number(text[1]));
    setDigit(digits[2],Number(text[3]));
  }

  function setMode(mode){
    state.mode=mode==='hardware'?'hardware':'phone';
    modeToggle.classList.toggle('phone-active',state.mode==='phone');
    modeToggle.classList.toggle('hardware-active',state.mode==='hardware');
    ui.classList.toggle('hardware-mode',state.mode==='hardware');
  }

  modeToggle.addEventListener('click',()=>{
    setMode(state.mode==='phone'?'hardware':'phone');
  });

  function setBaseRPM(rpm){
    state.baseRPM=rpm===45?45:33;
    rpm33.classList.toggle('selected',state.baseRPM===33);
    rpm45.classList.toggle('selected',state.baseRPM===45);
  }

  rpm33.addEventListener('click',()=>setBaseRPM(33));
  rpm45.addEventListener('click',()=>setBaseRPM(45));

  function setFinePitch(value){
    value=Math.max(-8,Math.min(8,Number(value)||0));
    state.finePitch=value;
    fineKnob.style.top=(((8-value)/16)*100)+'%';
    updatePitchDisplay();
  }

  let fineDrag=null;

  fineKnob.addEventListener('pointerdown',e=>{
    if(state.mode!=='phone') return;
    e.preventDefault();
    e.stopPropagation();

    const knobRect=fineKnob.getBoundingClientRect();
    fineDrag={
      id:e.pointerId,
      grabOffset:e.clientY-(knobRect.top+knobRect.height/2)
    };

    fineKnob.setPointerCapture(e.pointerId);
  });

  fineKnob.addEventListener('pointermove',e=>{
    if(!fineDrag || fineDrag.id!==e.pointerId || state.mode!=='phone') return;
    e.preventDefault();

    const rect=fineScaleBody.getBoundingClientRect();
    const y=e.clientY-fineDrag.grabOffset;
    const p=Math.max(0,Math.min(1,(y-rect.top)/rect.height));
    setFinePitch(8-p*16);
  });

  function stopFine(e){
    if(!fineDrag || fineDrag.id!==e.pointerId) return;
    try{
      if(fineKnob.hasPointerCapture(e.pointerId)){
        fineKnob.releasePointerCapture(e.pointerId);
      }
    }catch(_){}
    fineDrag=null;
  }

  fineKnob.addEventListener('pointerup',stopFine);
  fineKnob.addEventListener('pointercancel',stopFine);

  function setUltraPitch(value){
    value=Math.max(-50,Math.min(50,Number(value)||0));
    state.ultraPitch=value;
    ultraKnob.style.left=(((value+50)/100)*100)+'%';
    updatePitchDisplay();
  }

  let ultraDrag=null;

  ultraKnob.addEventListener('pointerdown',e=>{
    if(state.mode!=='phone') return;
    e.preventDefault();
    e.stopPropagation();

    const knobRect=ultraKnob.getBoundingClientRect();
    ultraDrag={
      id:e.pointerId,
      grabOffset:e.clientX-(knobRect.left+knobRect.width/2)
    };

    ultraKnob.setPointerCapture(e.pointerId);
  });

  ultraKnob.addEventListener('pointermove',e=>{
    if(!ultraDrag || ultraDrag.id!==e.pointerId || state.mode!=='phone') return;
    e.preventDefault();

    const rect=ultraScaleBody.getBoundingClientRect();
    const x=e.clientX-ultraDrag.grabOffset;
    const p=Math.max(0,Math.min(1,(x-rect.left)/rect.width));
    setUltraPitch(-50+p*100);
  });

  function stopUltra(e){
    if(!ultraDrag || ultraDrag.id!==e.pointerId) return;
    try{
      if(ultraKnob.hasPointerCapture(e.pointerId)){
        ultraKnob.releasePointerCapture(e.pointerId);
      }
    }catch(_){}
    ultraDrag=null;
  }

  ultraKnob.addEventListener('pointerup',stopUltra);
  ultraKnob.addEventListener('pointercancel',stopUltra);

  fineKnob.addEventListener('dblclick',e=>{
    e.preventDefault();
    e.stopPropagation();
    setFinePitch(0);
  });

  ultraKnob.addEventListener('dblclick',e=>{
    e.preventDefault();
    e.stopPropagation();
    setUltraPitch(0);
  });

  let fineLastTap=0;
  let ultraLastTap=0;
  const DOUBLE_TAP_MS=320;

  fineKnob.addEventListener('pointerup',e=>{
    const now=performance.now();
    if(now-fineLastTap<=DOUBLE_TAP_MS){
      e.preventDefault();
      e.stopPropagation();
      setFinePitch(0);
      fineLastTap=0;
    }else{
      fineLastTap=now;
    }
  });

  ultraKnob.addEventListener('pointerup',e=>{
    const now=performance.now();
    if(now-ultraLastTap<=DOUBLE_TAP_MS){
      e.preventDefault();
      e.stopPropagation();
      setUltraPitch(0);
      ultraLastTap=0;
    }else{
      ultraLastTap=now;
    }
  });

  function setRunning(running){
    state.running=!!running;
    startStop.classList.toggle('running',state.running);
  }

  startStop.addEventListener('click',()=>{
    setRunning(!state.running);
  });

  window.turntableUI={
    state,
    setRunning,
    setMode,
    setBaseRPM,
    setFinePitch,
    setUltraPitch
  };

  setMode('phone');
  setBaseRPM(33);
  setFinePitch(0);
  setUltraPitch(0);
  setRunning(false);
  updatePitchDisplay();
})();
