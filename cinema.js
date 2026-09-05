(() => {
  'use strict';
  const root = document.querySelector('.cinematic');
  const canvas = document.querySelector('[data-film]');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) { root.classList.add('is-lite'); return; }
  const poster = document.querySelector('.film-poster');
  const intro = document.querySelector('[data-hero-intro]');
  const copy = document.querySelector('[data-scene-copy]');
  const progressBar = document.querySelector('[data-film-progress]');
  const toggle = document.querySelector('[data-motion-toggle]');
  const hint = document.querySelector('[data-film-hint]');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const portraitQuery = matchMedia('(max-width: 640px)');
  const connection = navigator.connection;
  const automaticLite = () => motionQuery.matches || connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  let lite = Boolean(automaticLite());
  let mobile = portraitQuery.matches;
  let scheduled = false;
  let visible = true;
  let fetching = false;
  let pending = [];
  let target = [];
  let frameSignature = '';
  let stage = -1;
  let lastWidth = 0;
  let oldProgress = 0;
  let generation = 0;
  let lastDrawn = -1;
  const cache = new Map();
  const failures = new Map();
  const BASE = 'assets/film-v2/';
  const SHEET_FRAMES = 6;
  const FRAME_COUNT = 96;
  // 6 × 576 × 1024 × 4 = 14,155,776 bytes per decoded sheet.
  // Two cached sheets + at most one decoding => <= 40.5 MiB of sheet pixels.
  const MAX_SHEETS = 3;
  const chapters = [
    { at: 0, label: 'Le départ', title: 'Chaque départ|est une promesse.', description: 'Une solution pensée autour de votre marchandise.' },
    { at: .125, label: 'La prise en charge', title: 'Votre projet|prend la route.', description: 'Le chargement et le transport sont coordonnés.' },
    { at: .25, label: 'Le transport', title: 'Chaque kilomètre|nous rapproche.', description: 'De votre point de départ jusqu’au terminal portuaire.' },
    { at: .405, label: 'Le terminal', title: 'Le monde|s’ouvre à vous.', description: 'Arrivée au port. Le relais maritime se prépare.' },
    { at: .50, label: 'La manutention', title: 'Précision|à chaque étape.', description: 'Le conteneur quitte le camion pour rejoindre le navire.' },
    { at: .625, label: 'L’embarquement', title: 'Un nouveau cap.|Le même engagement.', description: 'Votre marchandise prend place à bord.' },
    { at: .75, label: 'La traversée', title: 'Vos ambitions.|Sans frontières.', description: 'Un seul interlocuteur, jusqu’à votre destination.' }
  ];
  function clipFor(index) {
    const wide = !mobile && (index === 0 || index === 3);
    return { path: wide ? 'desktop/scene-0' + (index === 0 ? 5 : 6) : 'portrait/scene-0' + (index + 1), width: wide ? 1024 : 576, height: wide ? 576 : 1024 };
  }
  function frameFor(index, frame, weight = 1) {
    let clip = clipFor(index);
    let sourceFrame = frame;
    if (index === 2) {
      // Reverse the mechanically credible truck-loading take for the lift.
      // The original crane take is rejected in full; the corrected take
      // handles lowering onto the ship with a level four-corner spreader.
      if (frame < 36) { clip = clipFor(0); sourceFrame = 95 - Math.round(frame * 45 / 35); }
      else {
        clip = { path: 'portrait/scene-07', width: 576, height: 1024 };
        sourceFrame = Math.round((frame - 36) * 95 / 59);
      }
    }
    const sheet = Math.floor(sourceFrame / SHEET_FRAMES);
    return { ...clip, key: clip.path + '/sprite-' + String(sheet).padStart(2, '0') + '.webp', offset: sourceFrame % SHEET_FRAMES, frame, index, weight };
  }
  function release(entry) { if (entry.image.close) entry.image.close(); }
  function clearCache() { for (const entry of cache.values()) release(entry); cache.clear(); pending = []; canvas.dataset.cacheSheets = '0'; canvas.dataset.decodedMib = '0.0'; }
  function trimCache(keep, max = MAX_SHEETS) {
    while (cache.size > max) {
      const evict = [...cache.keys()].find(key => !keep.includes(key)) || cache.keys().next().value;
      release(cache.get(evict)); cache.delete(evict);
    }
  }
  async function decode(url) {
    const response = await fetch(url, { cache: 'default' });
    if (!response.ok) throw Error('Media ' + response.status + ' ' + response.url);
    const blob = await response.blob();
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    try { image.src = objectUrl; await image.decode(); return image; }
    finally { URL.revokeObjectURL(objectUrl); }
  }
  async function pump() {
    if (fetching || lite || !visible) return;
    const item = pending.shift();
    if (!item) return;
    if (cache.has(item.key)) { pump(); return; }
    const failureAt = failures.get(item.key);
    if (failureAt && Date.now() - failureAt < 15000) { pump(); return; }
    fetching = true;
    const epoch = generation;
    canvas.dataset.requested = BASE + item.key;
    trimCache(target.map(x => x.key), MAX_SHEETS - 1);
    try {
      const image = await decode(BASE + item.key);
      if (epoch !== generation || lite || !visible) { release({ image }); }
      else {
        cache.set(item.key, { image, width: item.width, height: item.height });
        failures.delete(item.key);
        delete canvas.dataset.loadError;
        hint.textContent = 'Faites défiler pour voyager';
        trimCache(target.map(x => x.key));
        frameSignature = '';
        requestDraw();
      }
    } catch (error) {
      canvas.dataset.loadError = error.message;
      failures.set(item.key, Date.now());
      hint.textContent = 'Chargement ralenti · vous pouvez continuer';
      // The already painted canvas/poster stays visible, never a blank frame.
    } finally { fetching = false; pump(); }
  }
  function queueImages() {
    if (lite || !visible) return;
    const list = [...target];
    const main = target[0];
    const next = main.frame + SHEET_FRAMES;
    const previous = main.frame - SHEET_FRAMES;
    if (next < FRAME_COUNT) list.push(frameFor(main.index, next));
    else if (main.index < 3) list.push(frameFor(main.index + 1, 0));
    if (previous >= 0) list.push(frameFor(main.index, previous));
    pending = list.filter((item, i) => list.findIndex(other => other.key === item.key) === i).slice(0, MAX_SHEETS).filter(item => !cache.has(item.key));
    // Keep the immediate next and previous sheets; don't fetch the whole film.
    pump();
  }
  function cover(image, sx, width, height, dx, dy, dw, dh) {
    const scale = Math.max(dw / width, dh / height);
    const sw = dw / scale, sh = dh / scale;
    context.drawImage(image, sx + (width - sw) / 2, (height - sh) / 2, sw, sh, dx, dy, dw, dh);
  }
  function paint(item, image, alpha) {
    const w = canvas.width, h = canvas.height;
    const sx = item.offset * item.width;
    context.globalAlpha = alpha;
    if (mobile && h / w > 1.9) {
      // Tall phones retain the complete vertical composition, including the
      // truck and container edges. The same scene fills the extra height.
      context.save();
      context.filter = 'blur(14px)';
      cover(image, sx, item.width, item.height, -20, -20, w + 40, h + 40);
      context.restore();
      const subjectHeight = w * item.height / item.width;
      const y = (h - subjectHeight) * .48;
      context.drawImage(image, sx, 0, item.width, item.height, 0, y, w, subjectHeight);
    } else if (!mobile && item.width < item.height) {
      // Full portrait composition remains visible on desktop; its own image
      // provides an atmospheric edge-to-edge background, with no black bars.
      context.save();
      context.filter = 'blur(20px)';
      cover(image, sx, item.width, item.height, -30, -30, w + 60, h + 60);
      context.restore();
      context.fillStyle = 'rgba(6,20,33,.34)';
      context.fillRect(0, 0, w, h);
      const subjectWidth = h * item.width / item.height;
      const x = w * .70 - subjectWidth / 2;
      context.drawImage(image, sx, 0, item.width, item.height, x, 0, subjectWidth, h);
      const fade = context.createLinearGradient(x, 0, x + subjectWidth * .28, 0);
      fade.addColorStop(0, 'rgba(7,23,37,.7)'); fade.addColorStop(1, 'rgba(7,23,37,0)');
      context.fillStyle = fade; context.fillRect(x, 0, subjectWidth * .3, h);
    } else {
      cover(image, sx, item.width, item.height, 0, 0, w, h);
    }
    context.globalAlpha = 1;
  }
  function updateText(progress) {
    const introVisible = progress < .10;
    intro.hidden = !introVisible;
    copy.hidden = introVisible || lite;
    let nextStage = 0;
    chapters.forEach((chapter, i) => { if (progress >= chapter.at) nextStage = i; });
    if (stage !== nextStage) {
      stage = nextStage;
      const chapter = chapters[stage];
      document.querySelector('[data-chapter]').textContent = String(stage + 1).padStart(2, '0') + ' / 07';
      document.querySelector('[data-chapter-name]').textContent = chapter.label;
      document.querySelector('[data-scene-label]').textContent = 'Une expédition · ' + String(stage + 1).padStart(2, '0');
      const title = document.querySelector('[data-scene-title]');
      const [first, second] = chapter.title.split('|');
      const emphasis = document.createElement('em'); emphasis.textContent = second;
      title.replaceChildren(document.createTextNode(first), document.createElement('br'), emphasis);
      document.querySelector('[data-scene-description]').textContent = chapter.description;
    }
    progressBar.style.transform = 'scaleX(' + progress + ')';
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.25, Math.sqrt(2100000 / (rect.width * rect.height)));
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height; frameSignature = '';
      // Resize clears a canvas: immediately repaint below, or reveal the poster.
      canvas.classList.remove('ready');
    }
  }
  function draw() {
    scheduled = false;
    if (!visible || document.hidden) return;
    const rect = root.getBoundingClientRect();
    const travel = Math.max(1, root.offsetHeight * (1 - 1 / (mobile ? 5.7 : 6.5)));
    const progress = lite ? 0 : Math.max(0, Math.min(1, -rect.top / travel));
    oldProgress = progress;
    updateText(progress);
    if (lite) return;
    resizeCanvas();
    const position = progress * (4 * FRAME_COUNT - 1);
    const index = Math.min(3, Math.floor(position / FRAME_COUNT));
    const local = Math.min(FRAME_COUNT - 1, Math.floor(position - index * FRAME_COUNT));
    target = [frameFor(index, local)];
    if (index === 2 && local >= 30 && local < 36) target.push(frameFor(2, 36, (local - 30) / 6));
    // Eight scroll-controlled overlap frames soften the editorial raccords.
    if (local >= FRAME_COUNT - 8 && index < 3) target.push(frameFor(index + 1, 0, (local - (FRAME_COUNT - 8)) / 8));
    const signature = target.map(x => x.key + ':' + x.offset + ':' + x.weight).join('|');
    if (signature !== frameSignature) {
      let main = target[0], entry = cache.get(main.key);
      if (!entry) {
        const fallback = [...cache.keys()].filter(key => key.startsWith(main.path)).sort((a,b) => Math.abs(Number(a.match(/sprite-(\d+)/)[1]) * 6 - main.frame) - Math.abs(Number(b.match(/sprite-(\d+)/)[1]) * 6 - main.frame))[0];
        if (fallback && lastDrawn < 0) {
          entry = cache.get(fallback);
          main = { ...main, key: fallback, offset: 0 };
        }
      }
      if (entry) {
        paint(main, entry.image, 1);
        const second = target[1];
        if (second && cache.has(second.key)) paint(second, cache.get(second.key).image, second.weight);
        canvas.classList.add('ready');
        lastDrawn = index * FRAME_COUNT + local;
        canvas.dataset.frame = String(lastDrawn);
        canvas.dataset.scene = String(index + 1);
        frameSignature = signature;
      }
    }
    queueImages();
    canvas.dataset.cacheSheets = String(cache.size);
    canvas.dataset.decodedMib = (cache.size * 6 * 576 * 1024 * 4 / 1048576).toFixed(1);
  }
  function requestDraw() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(draw); }
  }
  function setLite(value) {
    lite = value; generation++; clearCache();
    root.classList.toggle('is-lite', lite);
    toggle.setAttribute('aria-pressed', String(lite));
    toggle.textContent = lite ? 'Activer le voyage' : 'Version légère';
    hint.textContent = lite ? 'L’essentiel, sans animation' : 'Faites défiler pour voyager';
    intro.hidden = false; copy.hidden = true;
    canvas.classList.remove('ready');
    if (lite) {
      // Reset the static image without an autoplay or any animation request.
      poster.style.opacity = '1';
    }
    frameSignature = ''; lastDrawn = -1;
    requestDraw();
  }
  toggle.addEventListener('click', () => {
    const relativeTop = root.getBoundingClientRect().top;
    setLite(!lite);
    if (relativeTop < 0) root.scrollIntoView({ behavior: 'instant' });
  });
  motionQuery.addEventListener('change', () => setLite(Boolean(automaticLite())));
  portraitQuery.addEventListener('change', () => {
    mobile = portraitQuery.matches; generation++; clearCache(); frameSignature = ''; lastDrawn = -1; requestDraw();
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { generation++; clearCache(); }
    else requestDraw();
  }, { rootMargin: '100px' }).observe(root);
  addEventListener('scroll', requestDraw, { passive: true });
  addEventListener('resize', () => {
    // Only width changes alter scroll length. Address-bar height changes don't
    // reset the story; dvh fills the newly visible area, svh keeps travel stable.
    if (lastWidth !== innerWidth) { lastWidth = innerWidth; frameSignature = ''; }
    requestDraw();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestDraw(); });
  addEventListener('pagehide', () => { generation++; clearCache(); });
  setLite(lite);
})();
