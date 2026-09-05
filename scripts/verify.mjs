import { readFile, stat, readdir } from 'node:fs/promises';
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
let bytes = 0, sheets = 0;
for (const [folder, scenes] of [['portrait', [1,2,3,4,7]], ['desktop', [5,6]]]) {
  for (const scene of scenes) {
    const base = 'assets/film-v2/' + folder + '/scene-' + String(scene).padStart(2,'0');
    for (let i = 0; i < 16; i++) {
      const path = base + '/sprite-' + String(i).padStart(2,'0') + '.webp';
      const data = await readFile(path);
      assert.equal(data.subarray(0,4).toString(), 'RIFF', path);
      assert.equal(data.subarray(8,12).toString(), 'WEBP', path);
      bytes += data.length; sheets++;
    }
    await stat(base + '/poster.webp');
  }
}
const app = await readFile('app.js','utf8');
assert(!/\bfetch\s*\(|localStorage|sessionStorage/.test(app), 'Demo forms must not transmit or persist');
const cinema = await readFile('cinema.js','utf8');
assert(cinema.includes('MAX_SHEETS = 3'), 'Bounded image cache');
assert(cinema.includes('portrait/scene-07'), 'Corrected crane shot included');
console.log(JSON.stringify({result:'PASS', sections:4, sheets, optimizedSheetMB:(bytes/1e6).toFixed(2),maxDecodedSheetMiB:3*6*576*1024*4/1048576},null,2));

