/* Pure timeline and bounded prefetch policy; shared with regression tests. */
((scope) => {
  'use strict';
  const TOTAL = 384;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function frameAt(position) {
    const n = clamp(Math.floor(position), 0, TOTAL - 1);
    const scene = Math.floor(n / 96), local = n % 96;
    let clip = ['reveal', 'road', 'crane', 'departure'][scene], frame = local;
    if (scene === 2 && local < 36) { clip = 'reveal'; frame = 95 - Math.round(local * 45 / 35); }
    else if (scene === 2) frame = Math.round((local - 36) * 95 / 59);
    return { key: clip + ':' + frame, clip, frame, scene, local, position: n };
  }
  function layersAt(position, blend = true) {
    const value = clamp(position, 0, TOTAL - 1), first = frameAt(value);
    const layers = [{ ...first, alpha: 1 }], fraction = value - Math.floor(value);
    // Only scroll position changes blend weights: no timer-driven catch-up.
    if (blend && fraction > .015 && first.local < 95) layers.push({ ...frameAt(value + 1), alpha: fraction });
    if (first.scene === 2 && first.local >= 30 && first.local < 36) layers.push({ ...frameAt(228), alpha: (first.local + fraction - 30) / 6 });
    else if (first.local >= 88 && first.scene < 3) layers.push({ ...frameAt((first.scene + 1) * 96), alpha: (first.local + fraction - 88) / 8 });
    return layers;
  }
  function windowAt(position, direction = 1, limit = 17, speed = 0) {
    const result = [], seen = new Set();
    const add = frame => { if (!seen.has(frame.key) && result.length < limit) { seen.add(frame.key); result.push(frame); } };
    layersAt(position).forEach(add);
    const ahead = clamp(Math.ceil(6 + Math.abs(speed) * .25), 6, limit - 3);
    // Walk the actual editorial timeline, including accelerated/reversed clips.
    for (let i = 1; i <= ahead; i++) layersAt(position + i * direction, false).forEach(add);
    for (let i = 1; i <= 3; i++) add(frameAt(position - i * direction));
    for (let i = ahead + 1; result.length < limit && i < TOTAL; i++) {
      const next=position+i*direction;if(next<0||next>=TOTAL)break;add(frameAt(next));
    }
    for (let i = 4; result.length < limit && i < limit + 8; i++) add(frameAt(position - i * direction));
    return result;
  }
  function packsAhead(position, direction, manifest, horizon = 96) {
    const packs = [], seen = new Set();
    const add = frame => { const pack = manifest.clips[frame.clip].frames[frame.frame].pack; if (!seen.has(pack)) { seen.add(pack); packs.push(pack); } };
    layersAt(position).forEach(add);
    for (let n = 1; n <= horizon; n++) add(frameAt(position + n * direction));
    for (let n = 1; n <= 12; n++) add(frameAt(position - n * direction));
    return packs;
  }
  scope.LouCinemaCore = { TOTAL, clamp, frameAt, layersAt, windowAt, packsAhead };
})(globalThis);
