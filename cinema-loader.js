/* Runs in a Worker, with the same bounded scheduler available as a fallback. */
((scope) => {
  'use strict';
  class FrameLoader {
    constructor({ base, slow = false, bitmap = true, deliver, report }) {
      Object.assign(this, {base, slow, bitmap, deliver, report});
      this.packs = new Map(); this.fetching = new Map(); this.decoding = new Set(); this.delivered = new Set(); this.unacked = new Set();
      this.frames = []; this.wantedPacks = []; this.failures = new Map(); this.paused = false; this.closed = false; this.retryTimer = null;
      this.bytes = 0; this.maxBytes = 10 * 1024 * 1024;
      this.stats = {requests:0,networkBytes:0,decodes:0,decodeMs:0,maxDecodeMs:0,packBytes:0,errors:0};
    }
    plan(frames, packs) {
      if (this.closed) return;
      this.frames = frames; this.wantedPacks = [...new Set([...frames.map(f=>f.pack), ...packs])];
      const wanted = new Set(frames.map(f=>f.key));
      this.delivered = new Set([...this.delivered].filter(key=>wanted.has(key)));
      // Obsolete network work must not block a rapid jump or reversal.
      for (const [key, controller] of this.fetching) if (!this.wantedPacks.includes(key)) controller.abort();
      this.pump();
    }
    pause(value) {
      this.paused = value;
      if (value) {
        clearTimeout(this.retryTimer); this.retryTimer=null;
        this.delivered.clear(); this.frames=[]; this.wantedPacks=[];
        for (const controller of this.fetching.values()) controller.abort();
      }
      else this.pump();
    }
    close() { this.closed = true; this.pause(true); this.packs.clear(); this.bytes = 0; }
    ack(key) { this.unacked.delete(key); this.pump(); }
    remember(key, data) {
      while (this.bytes + data.byteLength > this.maxBytes && this.packs.size) {
        const victim = [...this.packs.keys()].find(k=>!this.frames.some(f=>f.pack===k)) || this.packs.keys().next().value;
        this.bytes -= this.packs.get(victim).byteLength; this.packs.delete(victim);
      }
      this.packs.set(key, data); this.bytes += data.byteLength; this.stats.packBytes = this.bytes;
    }
    async load(key) {
      const controller = new AbortController(); this.fetching.set(key, controller);
      try {
        const url = new URL(key, this.base);
        if (this.slow) url.searchParams.set('qa_slow','1');
        const response = await fetch(url, {signal:controller.signal,cache:'default'});
        if (!response.ok) throw Error('Média indisponible ('+response.status+')');
        const data = await response.arrayBuffer();
        if (!this.closed && !controller.signal.aborted) {
          this.remember(key,data); this.failures.delete(key);
          this.stats.requests++; this.stats.networkBytes += data.byteLength;
        }
      } catch (error) {
        if (error.name !== 'AbortError' && !this.closed && !this.paused) {
          this.failures.set(key,Date.now()); this.stats.errors++; this.report({error:error.message});
        }
      } finally { this.fetching.delete(key); this.pump(); }
    }
    async decode(frame) {
      this.decoding.add(frame.key);
      let image;
      try {
        const data = this.packs.get(frame.pack);
        // LRU touch compressed bytes; only one small frame is decoded.
        this.packs.delete(frame.pack); this.packs.set(frame.pack,data);
        const blob = new Blob([new Uint8Array(data,frame.offset,frame.length)], {type:'image/webp'});
        const start = performance.now();
        if (this.bitmap && typeof createImageBitmap === 'function') image = await createImageBitmap(blob);
        else {
          const url = URL.createObjectURL(blob);
          try { image = new Image(); image.src = url; await image.decode(); }
          finally { URL.revokeObjectURL(url); }
        }
        const time = performance.now()-start;
        this.stats.decodes++; this.stats.decodeMs += time; this.stats.maxDecodeMs = Math.max(this.stats.maxDecodeMs,time);
        if (this.closed || this.paused || !this.frames.some(f=>f.key===frame.key)) image.close?.();
        else { this.delivered.add(frame.key); this.unacked.add(frame.key); this.deliver(frame.key,image); }
      } catch (error) {
        this.unacked.delete(frame.key); image?.close?.();
        this.delivered.add(frame.key); // Do not spin on a corrupt image.
        if (!this.closed && !this.paused) { this.stats.errors++; this.report({error:error.message}); }
      } finally { this.decoding.delete(frame.key); this.report({stats:{...this.stats}}); this.pump(); }
    }
    pump() {
      if (this.paused || this.closed) return;
      clearTimeout(this.retryTimer); this.retryTimer=null;
      let retryIn=Infinity;
      for (const key of this.wantedPacks) {
        if (this.fetching.size >= 2) break;
        if (!this.packs.has(key) && !this.fetching.has(key)) {
          const failure=this.failures.get(key), wait=failure?5000-(Date.now()-failure):0;
          if(wait<=0)void this.load(key);else retryIn=Math.min(retryIn,wait);
        }
      }
      for (const frame of this.frames) {
        if (this.decoding.size + this.unacked.size >= 2) break;
        if (this.packs.has(frame.pack) && !this.decoding.has(frame.key) && !this.delivered.has(frame.key)) void this.decode(frame);
      }
      if(Number.isFinite(retryIn))this.retryTimer=setTimeout(()=>this.pump(),retryIn+10);
    }
  }
  scope.LouFrameLoader = FrameLoader;
  if (typeof document === 'undefined') {
    let loader;
    scope.onmessage = ({data}) => {
      if (data.type==='init') {
        if (typeof createImageBitmap!=='function') { scope.postMessage({type:'unsupported'}); return; }
        loader?.close();
        loader = new FrameLoader({...data,deliver:(key,image)=>scope.postMessage({type:'frame',key,image},[image]),report:payload=>scope.postMessage({type:'report',...payload})});
        scope.postMessage({type:'ready'});
      } else if(data.type==='plan') loader?.plan(data.frames,data.packs);
      else if(data.type==='pause') loader?.pause(data.value);
      else if(data.type==='ack') loader?.ack(data.key);
    };
  }
})(globalThis);
