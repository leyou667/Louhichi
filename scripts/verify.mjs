import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const html = await readFile('index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids');
for (const match of html.matchAll(/(?:href|aria-controls)="#?([^"]+)"/g)) {
  if (match[0].startsWith('href="#') || match[0].startsWith('aria-controls=')) assert(ids.includes(match[1]), 'Missing anchor ' + match[1]);
}
assert.equal((html.match(/<section\b/g) || []).length, 4, 'Four main sections');
assert(!/<video\b|\bautoplay\b/i.test(html), 'No autoplay video');
for (const file of ['app.js', 'cinema.js', 'styles.css', 'assets/louhichi-logo-official.jpg']) assert((await stat(file)).size > 0);
const profiles=[];
for (const profile of ['mobile','eco','desktop']) {
  const base='assets/film-v3/'+profile+'/', manifest=JSON.parse(await readFile(base+'manifest.json','utf8'));
  assert.equal(manifest.version,3);assert.equal(manifest.framesPerPack,24);
  const packs=new Map();let frames=0;
  for(const clip of Object.values(manifest.clips)) {
    assert.equal(clip.frames.length,96);
    for(const frame of clip.frames) {
      assert(!frame.pack.includes('..'));
      if(!packs.has(frame.pack))packs.set(frame.pack,await readFile(base+frame.pack));
      const data=packs.get(frame.pack),webp=data.subarray(frame.offset,frame.offset+frame.length);
      assert.equal(webp.length,frame.length);assert.equal(webp.subarray(0,4).toString(),'RIFF');
      assert.equal(webp.subarray(8,12).toString(),'WEBP');assert.equal(webp.readUInt32LE(4)+8,frame.length);
      frames++;
    }
    const first=clip.frames[0],data=packs.get(first.pack).subarray(first.offset,first.offset+first.length);
    assert.deepEqual(await readFile(base+clip.poster),data,'Poster equals first decoded frame');
  }
  assert.equal(packs.size,16);
  profiles.push({profile,frames,packs:packs.size,bytes:[...packs.values()].reduce((sum,data)=>sum+data.length,0),framePixelBytes:manifest.width*manifest.height*4});
}
const app = await readFile('app.js','utf8');
assert(!/\bfetch\s*\(|localStorage|sessionStorage/.test(app), 'Demo forms must not transmit or persist');
const cinema = await readFile('cinema.js','utf8');
assert(cinema.includes('cacheLimit') && cinema.includes('decodedBudgetBytes'),'Bounded image cache');
assert(!/ctx\.filter|context\.filter|\.play\(/.test(cinema),'No runtime blur or video');
assert(html.includes('cinema-core.js'),'Timeline loaded before renderer');
await import('./verify-cinema.mjs');
console.log(JSON.stringify({result:'PASS',sections:4,profiles},null,2));
