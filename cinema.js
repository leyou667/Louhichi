(() => {
  'use strict';
  const root = document.querySelector('.cinematic'), canvas = document.querySelector('[data-film]');
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) { root.classList.add('is-lite'); return; }
  const C = LouCinemaCore;
  const $ = selector => document.querySelector(selector);
  const intro = $('[data-hero-intro]'), copy = $('[data-scene-copy]'), progressBar = $('[data-film-progress]');
  const toggle = $('[data-motion-toggle]'), hint = $('[data-film-hint]');
  const chapterNumber = $('[data-chapter]'), chapterName = $('[data-chapter-name]'), sceneLabel = $('[data-scene-label]');
  const sceneTitle = $('[data-scene-title]'), sceneDescription = $('[data-scene-description]');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), mobileQuery = matchMedia('(max-width: 640px)');
  const connection = navigator.connection;
  const autoLite = () => motionQuery.matches || Boolean(connection?.saveData);
  const weakDevice = () => (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || /(^|-)2g$/.test(connection?.effectiveType || '');
  const qaLocal = ['localhost','127.0.0.1'].includes(new URL(document.baseURI).hostname);
  const slow = qaLocal && (window.LOU_QA_SLOW || new URLSearchParams(location.search).has('qa_slow'));
  const metrics = window.louCinemaMetrics = {version:3,draws:0,drawTotalMs:0,drawMaxMs:0,misses:0,requests:0,networkBytes:0,decodes:0,decodeMs:0,errors:0,decodedPeakBytes:0,staleFramesClosed:0,qualityDrops:0};
  let lite = autoLite(), visible = true, scheduled = false, manifest, transport, epoch = 0, initController;
  let mobile = mobileQuery.matches, profile = '', forcedEco = false, cacheLimit = 17, frameBytes = 0;
  let position = 0, direction = 1, speed = 0, lastScroll = scrollY, lastTime = performance.now();
  let rootTop = 0, travel = 1, lastWidth = innerWidth, stage = -1, introState, lastProgress = -1;
  let signature = '', planSignature = '', desired = [], workerTimer, slowDraws = 0;
  const cache = new Map();
  const chapters = [
    [0,'Le départ','Chaque départ|est une promesse.','Une solution pensée autour de votre marchandise.'],
    [.125,'La prise en charge','Votre projet|prend la route.','Le chargement et le transport sont coordonnés.'],
    [.25,'Le transport','Chaque kilomètre|nous rapproche.','De votre point de départ jusqu’au terminal portuaire.'],
    [.405,'Le terminal','Le monde|s’ouvre à vous.','Arrivée au port. Le relais maritime se prépare.'],
    [.5,'La manutention','Précision|à chaque étape.','Le conteneur quitte le camion pour rejoindre le navire.'],
    [.625,'L’embarquement','Un nouveau cap.|Le même engagement.','Votre marchandise prend place à bord.'],
    [.75,'La traversée','Vos ambitions.|Sans frontières.','Un seul interlocuteur, jusqu’à votre destination.']
  ];
  function active() { return !lite && visible && !document.hidden; }
  function clearFrames() { for (const image of cache.values()) image.close?.(); cache.clear(); planSignature=''; updateMemory(); }
  function updateMemory() {
    const bytes = cache.size * frameBytes;
    metrics.decodedPeakBytes = Math.max(metrics.decodedPeakBytes,bytes);
    canvas.dataset.cacheFrames = String(cache.size); canvas.dataset.decodedMib = (bytes/1048576).toFixed(1);
  }
  function trim(limit) {
    const protectedKeys = new Set(desired.map(frame=>frame.key));
    while (cache.size > limit) {
      const victim = [...cache.keys()].find(key=>!protectedKeys.has(key)) || cache.keys().next().value;
      cache.get(victim).close?.(); cache.delete(victim);
    }
  }
  function receive(key, image, generation) {
    if (epoch !== generation || !active() || !desired.some(frame=>frame.key===key)) { image.close?.(); metrics.staleFramesClosed++; }
    else {
      if (cache.has(key)) cache.get(key).close?.();
      else trim(cacheLimit-1);
      cache.set(key,image); updateMemory();
      delete canvas.dataset.loadError;
      if (hint.textContent !== 'Faites défiler pour voyager') hint.textContent = 'Faites défiler pour voyager';
      requestDraw();
    }
    if (epoch===generation) transport?.send({type:'ack',key});
  }
  function report(payload, generation) {
    if (generation!==epoch) return;
    if(payload.stats) Object.assign(metrics,payload.stats);
    if(payload.error && active()) { canvas.dataset.loadError=payload.error; hint.textContent='Chargement ralenti · vous pouvez continuer'; }
  }
  async function fallback(base,generation) {
    if (epoch!==generation) return;
    clearTimeout(workerTimer); transport?.close(); transport=null;
    if (!window.LouFrameLoader) {
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='cinema-loader.js?v=3';script.onload=resolve;script.onerror=reject;document.head.append(script);});
    }
    if (epoch!==generation) return;
    const loader = new LouFrameLoader({base,slow,bitmap:typeof createImageBitmap==='function',deliver:(key,image)=>receive(key,image,generation),report:payload=>report(payload,generation)});
    transport={send:data=>{if(data.type==='plan')loader.plan(data.frames,data.packs);else if(data.type==='pause')loader.pause(data.value);else if(data.type==='ack')loader.ack(data.key);},close:()=>loader.close()};
    canvas.dataset.decoder='main-fallback'; planSignature=''; requestDraw();
  }
  async function initialize() {
    const generation=++epoch;
    clearTimeout(workerTimer); initController?.abort(); transport?.close(); transport=null; clearFrames();
    manifest=null; profile=mobile?(forcedEco||weakDevice()?'eco':'mobile'):'desktop';
    if(qaLocal&&mobile&&['mobile','eco'].includes(window.LOU_QA_PROFILE))profile=window.LOU_QA_PROFILE;
    canvas.dataset.profile=profile; canvas.dataset.version='3'; signature='';
    const base=new URL('assets/film-v3/'+profile+'/',document.baseURI).href;
    initController=new AbortController();
    try {
      const response=await fetch(new URL('manifest.json',base),{signal:initController.signal});
      if(!response.ok)throw Error('Index des images indisponible');
      const next=await response.json(); if(generation!==epoch)return;
      manifest=next; frameBytes=next.width*next.height*4;
      // Two additional slots cover decoding + transferred but unacknowledged bitmaps.
      cacheLimit=Math.max(6,Math.floor((mobile?24:32)*1048576/frameBytes)-2);
      metrics.decodedBudgetBytes=(cacheLimit+2)*frameBytes;
      canvas.width=next.width; canvas.height=next.height; canvas.classList.remove('ready');
      canvas.dataset.resolution=next.width+'x'+next.height;
      if(lite)return;
      try {
        const worker=new Worker(new URL('cinema-loader.js?v=3',document.baseURI));
        transport={send:data=>worker.postMessage(data),close:()=>worker.terminate()};
        worker.onmessage=({data})=>{
          if(generation!==epoch){data.image?.close?.();return;}
          if(data.type==='frame')receive(data.key,data.image,generation);
          else if(data.type==='report')report(data,generation);
          else if(data.type==='unsupported')void fallback(base,generation).catch(showError);
          else if(data.type==='ready'){clearTimeout(workerTimer);canvas.dataset.decoder='worker';planSignature='';requestDraw();}
        };
        worker.onerror=()=>void fallback(base,generation).catch(showError);
        transport.send({type:'init',base,slow});
        workerTimer=setTimeout(()=>void fallback(base,generation).catch(showError),4000);
      } catch { await fallback(base,generation); }
      measure(); requestDraw();
    } catch(error) { if(generation===epoch&&error.name!=='AbortError')showError(error); }
  }
  function showError(error) { if(active()){canvas.dataset.loadError=error.message;hint.textContent='Chargement indisponible · nos services restent accessibles';} }
  function measure() {
    rootTop=root.getBoundingClientRect().top+scrollY;
    // svh fixes the timeline; dvh only changes CSS display height, never canvas pixels.
    travel=Math.max(1,root.offsetHeight*(1-1/(mobile?5.7:6.5)));
  }
  function text(progress) {
    const showIntro=progress<.10 || lite;
    if(showIntro!==introState){introState=showIntro;intro.hidden=!showIntro;copy.hidden=showIntro;}
    let next=0;chapters.forEach((chapter,i)=>{if(progress>=chapter[0])next=i;});
    if(next!==stage){
      stage=next;const chapter=chapters[next];
      chapterNumber.textContent=String(next+1).padStart(2,'0')+' / 07';chapterName.textContent=chapter[1];
      sceneLabel.textContent='Une expédition · '+String(next+1).padStart(2,'0');
      const [first,second]=chapter[2].split('|'),em=document.createElement('em');em.textContent=second;
      sceneTitle.replaceChildren(document.createTextNode(first),document.createElement('br'),em);sceneDescription.textContent=chapter[3];
    }
    if(progress!==lastProgress){progressBar.style.transform='scaleX('+progress+')';lastProgress=progress;}
  }
  function queue() {
    if(!manifest||!transport||!active())return;
    desired=C.windowAt(position,direction,cacheLimit,speed);
    const frames=desired.filter(frame=>!cache.has(frame.key)).map(frame=>({...frame,...manifest.clips[frame.clip].frames[frame.frame]}));
    const packs=C.packsAhead(position,direction,manifest,Math.max(72,Math.min(144,Math.ceil(speed*2))));
    const next=frames.map(frame=>frame.key).join('|')+'#'+packs.join('|');
    if(next!==planSignature){planSignature=next;transport.send({type:'plan',frames,packs});}
  }
  function draw() {
    scheduled=false;if(!visible||document.hidden)return;
    const progress=lite?0:C.clamp((scrollY-rootTop)/travel,0,1);position=progress*(C.TOTAL-1);
    text(progress);if(lite||!manifest)return;
    queue();
    const layers=C.layersAt(position,profile!=='eco');
    const first=cache.get(layers[0].key);
    if(!first){metrics.misses++;return;} // Keep the last image/poster; no clear or black flash.
    const available=layers.filter(layer=>cache.has(layer.key));
    const nextSignature=available.map(layer=>layer.key+':'+layer.alpha.toFixed(3)).join('|');
    if(nextSignature===signature)return;
    const start=performance.now();
    for(const layer of available){ctx.globalAlpha=layer.alpha;ctx.drawImage(cache.get(layer.key),0,0,canvas.width,canvas.height);}
    ctx.globalAlpha=1;signature=nextSignature;canvas.classList.add('ready');
    canvas.dataset.frame=String(Math.floor(position));canvas.dataset.scene=String(layers[0].scene+1);
    const elapsed=performance.now()-start;
    metrics.draws++;metrics.drawTotalMs+=elapsed;metrics.drawMaxMs=Math.max(metrics.drawMaxMs,elapsed);
    slowDraws=elapsed>12?slowDraws+1:Math.max(0,slowDraws-1);
    // A one-way quality change avoids profile oscillation on a struggling phone.
    if(mobile&&profile==='mobile'&&slowDraws>=8){forcedEco=true;metrics.qualityDrops++;void initialize();}
  }
  function requestDraw(){if(!scheduled&&active()){scheduled=true;requestAnimationFrame(draw);}}
  function onScroll(){
    const now=performance.now(),delta=scrollY-lastScroll;
    if(delta){direction=delta>0?1:-1;speed=Math.abs(delta)/Math.max(16,now-lastTime)*1000/travel*(C.TOTAL-1);}
    lastScroll=scrollY;lastTime=now;requestDraw();
  }
  function suspend(){transport?.send({type:'pause',value:!active()});if(!active()){clearFrames();}else{measure();planSignature='';requestDraw();}}
  function setLite(value){
    lite=Boolean(value);root.classList.toggle('is-lite',lite);toggle.setAttribute('aria-pressed',String(lite));
    toggle.textContent=lite?'Activer le voyage':'Version légère';hint.textContent=lite?'L’essentiel, sans animation':'Faites défiler pour voyager';
    introState=undefined;text(0);signature='';
    if(lite){++epoch;initController?.abort();clearTimeout(workerTimer);transport?.close();transport=null;clearFrames();canvas.classList.remove('ready');}
    else void initialize();
    measure();
  }
  toggle.addEventListener('click',()=>{const above=scrollY>rootTop;setLite(!lite);if(above)root.scrollIntoView({behavior:'instant'});});
  motionQuery.addEventListener('change',()=>setLite(autoLite()));
  connection?.addEventListener?.('change',()=>{if(connection.saveData)setLite(true);});
  mobileQuery.addEventListener('change',()=>{mobile=mobileQuery.matches;measure();if(!lite)void initialize();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;suspend();},{rootMargin:'100px'}).observe(root);
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{if(lastWidth!==innerWidth){lastWidth=innerWidth;measure();}requestDraw();},{passive:true});
  document.addEventListener('visibilitychange',suspend);
  addEventListener('pagehide',()=>{transport?.send({type:'pause',value:true});clearFrames();});
  addEventListener('pageshow',()=>suspend());
  setLite(lite);
})();
