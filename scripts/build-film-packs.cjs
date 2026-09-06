/* Reproducible asset conversion: existing six-frame WebP sheets -> indexed packs.
 * Run with Node: node build-packs.cjs [source-root] [output-root]
 * No source media is changed. Output contains no loose frame files except posters.
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.LOUHICHI_SHARP_PATH || 'sharp');

const SOURCE = path.resolve(process.argv[2] || 'assets/film-v2');
const OUTPUT = path.resolve(process.argv[3] || 'assets/film-v3');
const CLIPS = ['reveal', 'road', 'crane', 'departure'];
const PORTRAIT = { reveal: 'portrait/scene-01', road: 'portrait/scene-02', crane: 'portrait/scene-07', departure: 'portrait/scene-04' };
const PROFILES = [
  { name: 'mobile', width: 384, height: 832, quality: 68, clips: PORTRAIT },
  { name: 'eco', width: 288, height: 624, quality: 60, clips: PORTRAIT },
  { name: 'desktop', width: 960, height: 600, quality: 70, clips: { reveal: 'desktop/scene-05', road: 'portrait/scene-02', crane: 'portrait/scene-07', departure: 'desktop/scene-06' } },
];
const FRAME_COUNT = 96;
const FRAMES_PER_SHEET = 6;
const FRAMES_PER_PACK = 24;
const SELECTED = [0, 31, 63, 95];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const pad = n => String(n).padStart(2, '0');
sharp.concurrency(2);
sharp.cache({ memory: 64, files: 16, items: 32 });

async function cover(frame, raw, width, height, padding, sigma) {
  // Extra image around the viewport reproduces the published overscan for blur.
  let result = sharp(frame, { raw }).resize(width + 2 * padding, height + 2 * padding, { fit: 'cover', position: 'centre' });
  if (sigma) result = result.blur(sigma);
  return result.extract({ left: padding, top: padding, width, height }).raw().toBuffer({ resolveWithObject: true });
}

async function encodeFrame(frame, raw, profile) {
  const { width, height } = profile;
  let composed;
  if (profile.name !== 'desktop') {
    const scale = width / 384;
    const bg = await cover(frame, raw, width, height, Math.round(20 * scale), 14 * scale);
    const fitH = Math.round(width * raw.height / raw.width);
    const foreground = await sharp(frame, { raw }).resize(width, fitH, { fit: 'fill' }).png().toBuffer();
    composed = sharp(bg.data, { raw: bg.info }).composite([{ input: foreground, left: 0, top: Math.round((height - fitH) * 0.48) }]);
  } else if (raw.width < raw.height) {
    const bg = await cover(frame, raw, width, height, 30, 20);
    const subjectW = Math.round(height * raw.width / raw.height);
    const left = Math.round(width * 0.70 - subjectW / 2);
    const foreground = await sharp(frame, { raw }).resize(subjectW, height, { fit: 'fill' }).png().toBuffer();
    const tint = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgb(6,20,33)" fill-opacity="0.34"/></svg>`);
    const fadeW = Math.round(subjectW * 0.3);
    const fade = Buffer.from(`<svg width="${fadeW}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="f" x1="0" x2="93.333333%"><stop offset="0" stop-color="rgb(7,23,37)" stop-opacity="0.7"/><stop offset="1" stop-color="rgb(7,23,37)" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`);
    composed = sharp(bg.data, { raw: bg.info }).composite([
      { input: tint, left: 0, top: 0 },
      { input: foreground, left, top: 0 },
      { input: fade, left, top: 0 },
    ]);
  } else {
    composed = sharp(frame, { raw }).resize(width, height, { fit: 'cover', position: 'centre' });
  }
  return composed.webp({ quality: profile.quality, effort: 5, smartSubsample: true }).toBuffer();
}

async function buildProfile(profile) {
  const profileDir = path.join(OUTPUT, profile.name);
  await fs.mkdir(profileDir, { recursive: true });
  const manifest = { version: 3, profile: profile.name, width: profile.width, height: profile.height, framesPerPack: FRAMES_PER_PACK, clips: {} };
  const report = { width: profile.width, height: profile.height, quality: profile.quality, frameCount: FRAME_COUNT * CLIPS.length, packBytes: 0, posterBytes: 0, manifestBytes: 0, totalBytes: 0, packs: [], clips: {} };
  for (const clip of CLIPS) {
    const clipDir = path.join(profileDir, clip);
    await fs.mkdir(clipDir, { recursive: true });
    const frames = [];
    let pending = [];
    let packIndex = 0;
    let offset = 0;
    const clipReport = { source: profile.clips[clip], frameBytes: 0, minFrameBytes: Infinity, maxFrameBytes: 0, posterBytes: 0 };
    for (let sheetIndex = 0; sheetIndex < FRAME_COUNT / FRAMES_PER_SHEET; sheetIndex++) {
      const sheetPath = path.join(SOURCE, profile.clips[clip], `sprite-${pad(sheetIndex)}.webp`);
      const sheet = await sharp(sheetPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      if (sheet.info.width % FRAMES_PER_SHEET !== 0) throw new Error(`Invalid six-frame sheet ${sheetPath}`);
      const frameW = sheet.info.width / FRAMES_PER_SHEET;
      for (let batchStart = 0; batchStart < FRAMES_PER_SHEET; batchStart += 3) {
        const encoded = await Promise.all([0, 1, 2].map(async b => {
          const index = batchStart + b;
          const frame = await sharp(sheet.data, { raw: sheet.info }).extract({ left: index * frameW, top: 0, width: frameW, height: sheet.info.height }).raw().toBuffer({ resolveWithObject: true });
          return encodeFrame(frame.data, frame.info, profile);
        }));
        for (const data of encoded) {
          if (frames.length === 0) {
            await fs.writeFile(path.join(clipDir, 'poster.webp'), data);
            clipReport.posterBytes = data.length;
            report.posterBytes += data.length;
          }
          frames.push({ pack: `${clip}/pack-${pad(packIndex)}.bin`, offset, length: data.length });
          pending.push(data);
          offset += data.length;
          clipReport.frameBytes += data.length;
          clipReport.minFrameBytes = Math.min(clipReport.minFrameBytes, data.length);
          clipReport.maxFrameBytes = Math.max(clipReport.maxFrameBytes, data.length);
          if (pending.length === FRAMES_PER_PACK) {
            const name = `${clip}/pack-${pad(packIndex)}.bin`;
            const packed = Buffer.concat(pending);
            await fs.writeFile(path.join(profileDir, name), packed);
            report.packs.push({ path: name, bytes: packed.length, sha256: hash(packed) });
            report.packBytes += packed.length;
            pending = [];
            offset = 0;
            packIndex++;
          }
        }
      }
    }
    if (pending.length || frames.length !== FRAME_COUNT || packIndex !== 4) throw new Error(`Wrong pack/frame count: ${profile.name}/${clip}`);
    manifest.clips[clip] = { frames, poster: `${clip}/poster.webp` };
    report.clips[clip] = clipReport;
    console.log(`${profile.name}/${clip}: 96 independently encoded frames, ${clipReport.frameBytes.toLocaleString()} pack bytes`);
  }
  const manifestData = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(profileDir, 'manifest.json'), manifestData);
  report.manifestBytes = manifestData.length;
  report.totalBytes = report.packBytes + report.posterBytes + report.manifestBytes;
  report.manifestSha256 = hash(manifestData);
  await verifyProfile(profileDir, manifest, report);
  await contactSheet(profileDir, manifest);
  return report;
}

async function verifyProfile(profileDir, manifest, report) {
  let verifiedFrames = 0;
  for (const clip of CLIPS) {
    const entry = manifest.clips[clip];
    const names = [...new Set(entry.frames.map(frame => frame.pack))];
    for (const name of names) {
      const packed = await fs.readFile(path.join(profileDir, name));
      let cursor = 0;
      for (const frame of entry.frames.filter(frame => frame.pack === name)) {
        if (frame.offset !== cursor) throw new Error(`Offset gap/overlap in ${name}: ${frame.offset} != ${cursor}`);
        const data = packed.subarray(frame.offset, frame.offset + frame.length);
        if (data.length !== frame.length || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP' || data.readUInt32LE(4) + 8 !== frame.length) throw new Error(`Invalid WebP boundary in ${name}`);
        const decoded = await sharp(data).raw().toBuffer({ resolveWithObject: true });
        if (decoded.info.width !== manifest.width || decoded.info.height !== manifest.height) throw new Error(`Wrong dimensions in ${name}`);
        cursor += frame.length;
        verifiedFrames++;
      }
      if (cursor !== packed.length) throw new Error(`Trailing bytes in ${name}`);
      const saved = report.packs.find(pack => pack.path === name);
      if (saved.bytes !== packed.length || saved.sha256 !== hash(packed)) throw new Error(`Pack hash mismatch: ${name}`);
    }
    const first = entry.frames[0];
    const firstPack = await fs.readFile(path.join(profileDir, first.pack));
    const poster = await fs.readFile(path.join(profileDir, entry.poster));
    if (!poster.equals(firstPack.subarray(first.offset, first.offset + first.length))) throw new Error(`Poster mismatch: ${clip}`);
  }
  report.verification = { fullyDecodedFrames: verifiedFrames, contiguousOffsets: true, exactRiffBoundaries: true, hashesRecheckedFromDisk: true, postersMatchFirstFrames: true };
  console.log(`${manifest.profile}: verified ${verifiedFrames} full frame decodes, offsets, RIFF boundaries, posters, and pack SHA-256 checks`);
}

async function contactSheet(profileDir, manifest) {
  const isDesktop = manifest.profile === 'desktop';
  const thumbW = isDesktop ? 320 : 192;
  const thumbH = Math.round(thumbW * manifest.height / manifest.width);
  const cellW = thumbW + 16;
  const cellH = thumbH + 42;
  const titleH = 42;
  const width = cellW * SELECTED.length;
  const height = titleH + cellH * CLIPS.length;
  const composite = [];
  let labels = `<text x="10" y="27" fill="white" font-size="20">${manifest.profile} ${manifest.width}×${manifest.height} · columns frames ${SELECTED.join(', ')}</text>`;
  for (let row = 0; row < CLIPS.length; row++) {
    const clip = CLIPS[row];
    for (let col = 0; col < SELECTED.length; col++) {
      const index = SELECTED[col];
      const frame = manifest.clips[clip].frames[index];
      const packed = await fs.readFile(path.join(profileDir, frame.pack));
      const data = packed.subarray(frame.offset, frame.offset + frame.length);
      const input = await sharp(data).resize(thumbW, thumbH).png().toBuffer();
      const left = col * cellW + 8;
      const top = titleH + row * cellH;
      composite.push({ input, left, top });
      labels += `<text x="${left}" y="${top + thumbH + 25}" fill="white" font-size="16">${clip} · ${index}</text>`;
    }
  }
  const labelSvg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial, sans-serif">${labels}</g></svg>`);
  composite.push({ input: labelSvg, left: 0, top: 0 });
  const qa = path.join(OUTPUT, 'qa');
  await fs.mkdir(qa, { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: '#14212b' } }).composite(composite).png().toFile(path.join(qa, `${manifest.profile}-contact.png`));
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), source: SOURCE, output: OUTPUT, sharpVersion: sharp.versions.sharp, encoderVersions: sharp.versions, profiles: {} };
  for (const profile of PROFILES) report.profiles[profile.name] = await buildProfile(profile);
  const hashLines = [];
  for (const [name, profile] of Object.entries(report.profiles)) for (const pack of profile.packs) hashLines.push(`${pack.sha256}  ${name}/${pack.path}`);
  await fs.writeFile(path.join(OUTPUT, 'pack-sha256.txt'), hashLines.join('\n') + '\n');
  await fs.writeFile(path.join(OUTPUT, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(report.profiles).map(([key, value]) => [key, { packBytes: value.packBytes, posterBytes: value.posterBytes, manifestBytes: value.manifestBytes, totalBytes: value.totalBytes, verification: value.verification }])), null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });


