import {readFile,stat} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
await import('../cinema-core.js');
const C=globalThis.LouCinemaCore;
const manifest=JSON.parse(await readFile('assets/film-v3/mobile/manifest.json','utf8'));
const source=await readFile('cinema-loader.js','utf8');
const packSizes=new Map();
for(const clip of Object.values(manifest.clips))for(const frame of clip.frames)if(!packSizes.has(frame.pack))packSizes.set(frame.pack,(await stat('assets/film-v3/mobile/'+frame.pack)).size);
const flush=async()=>{for(let n=0;n<30;n++)await new Promise(setImmediate);};
function environment(fetchOverride) {
  let now=10000,id=0,closed=0;
  const timers=new Map(),requests=[];
  const sandbox={document:{},URL,Blob,Uint8Array,AbortController,performance,Map,Set,Date:{now:()=>now},
    setTimeout:(callback,delay)=>{timers.set(++id,{callback,delay});return id;},clearTimeout:key=>timers.delete(key),
    createImageBitmap:async()=>({close:()=>closed++}),
    fetch:async(url,options)=>{requests.push(url.pathname);return fetchOverride?fetchOverride(url,options):{ok:true,arrayBuffer:async()=>new ArrayBuffer(packSizes.get(url.pathname.split('/').slice(-2).join('/')))};}};
  runInNewContext(source,sandbox);
  return {Loader:sandbox.LouFrameLoader,timers,requests,closed:()=>closed,tick:async()=>{now+=5011;const list=[...timers.values()];timers.clear();list.forEach(t=>t.callback());await flush();}};
}
function record(frame){return {...frame,...manifest.clips[frame.clip].frames[frame.frame]};}
for(let n=0;n<384;n++) {
  for(const direction of [-1,1]) {
    const window=C.windowAt(n+.2,direction,17,40);
    assert(window.length<=17);assert.equal(new Set(window.map(f=>f.key)).size,window.length);
    for(const layer of C.layersAt(n+.2))assert(window.some(f=>f.key===layer.key));
    const packs=C.packsAhead(n,direction,manifest);
    assert(packs.includes(record(C.frameAt(n)).pack));
  }
}
assert(C.windowAt(230,1).some(frame=>frame.key===C.frameAt(231).key),'Accelerated crane adjacent frame must be prefetched');
assert(C.windowAt(200,1).some(frame=>frame.key===C.frameAt(201).key),'Reversed lift adjacent frame must be prefetched');
assert.deepEqual(C.layersAt(88.5),C.layersAt(88.5),'Stopped scroll is deterministic');
{
  const env=environment(),received=new Map();let desired=[],loader;
  loader=new env.Loader({base:'http://local/assets/',deliver:(key,image)=>{
    if(!desired.some(f=>f.key===key)){image.close();loader.ack(key);return;}
    while(received.size>=17){const victim=[...received.keys()].find(k=>!desired.some(f=>f.key===k))||received.keys().next().value;received.get(victim).close();received.delete(victim);}
    received.set(key,image);loader.ack(key);
  },report:()=>{}});
  for(const direction of [1,-1,1,-1])for(let i=0;i<384;i++){
    const n=direction===1?i:383-i;desired=C.windowAt(n,direction,17,30);
    loader.plan(desired.filter(f=>!received.has(f.key)).map(record),C.packsAhead(n,direction,manifest));await flush();
    assert(received.has(C.frameAt(n).key),'Target available at '+n);assert(received.size<=17);
    assert(loader.bytes<=loader.maxBytes);
  }
  assert.equal(env.requests.length,16,'One transfer per pack across two complete round trips');
  loader.close();console.log('PASS timeline: 1,536 positions; 16 pack transfers; bounded receiver cache');
}
{
  const env=environment(),pending=[];let loader;
  loader=new env.Loader({base:'http://local/',deliver:(key,image)=>pending.push({key,image}),report:()=>{}});
  loader.plan(C.windowAt(0,1,17).map(record),[]);await flush();assert.equal(pending.length,2,'Two unacknowledged bitmap maximum');
  loader.ack(pending[0].key);await flush();assert.equal(pending.length,3);
  loader.pause(true);const count=pending.length;await flush();assert.equal(pending.length,count);loader.close();
}
{
  const env=environment();let deliveries=0,loader;
  loader=new env.Loader({base:'http://local/',deliver:(key,image)=>{deliveries++;image.close();loader.ack(key);},report:()=>{}});
  loader.plan([record(C.frameAt(0))],[]);await flush();loader.pause(true);loader.pause(false);
  loader.plan([record(C.frameAt(0))],[]);await flush();assert.equal(deliveries,2,'Pause after ACK before next plan must not strand frame');loader.close();
}
{
  let attempts=0,deliveries=0,loader;
  const env=environment(async()=>{if(!attempts++)throw Error('offline');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1024*1024)};});
  loader=new env.Loader({base:'http://local/',deliver:(key,image)=>{deliveries++;image.close();loader.ack(key);},report:()=>{}});
  loader.plan([record(C.frameAt(0))],[]);await flush();assert.equal(env.timers.size,1,'Failed load schedules retry without scroll');
  await env.tick();assert.equal(deliveries,1);loader.close();assert.equal(env.timers.size,0);
}
{
  const env=environment();let calls=0;
  const loader=new env.Loader({base:'http://local/',deliver:()=>{calls++;throw Error('transfer failed');},report:()=>{}});
  loader.plan(C.windowAt(0,1,6).map(record),[]);await flush();assert.equal(loader.unacked.size,0);assert.equal(calls,6);assert.equal(env.closed(),6);loader.close();
}
console.log('PASS loader: ACK backpressure, pause/resume, retry after network failure, failed-transfer cleanup');
