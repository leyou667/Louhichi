const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = $("[data-header]");
const menuButton = $("[data-menu]");
const navigation = $("#navigation");

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  navigation.classList.toggle("open", !open);
});

$$('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.target.classList.toggle("visible", entry.isIntersecting));
}, { threshold: 0.13 });
$$('.reveal').forEach((element) => revealObserver.observe(element));

const journey = $('.journey');
const cinema = $('[data-cinema]');
const hero = $('.hero');
const heroSequence = $('[data-hero-sequence]');
const cinemaSequence = $('[data-cinema-sequence]');
const scenes = $$('[data-scene]');
const journeyCurrent = $('[data-journey-current]');
const journeyBar = $('[data-journey-bar]');
const stageLocation = $('[data-stage-location]');
const stageCode = $('[data-stage-code]');
const weight = $('[data-weight]');
const stageLocations = ['Studio Louhichi · BE', 'Contrôle technique · BE', 'Site de chargement · BE', 'Station VGM · BE', 'Douane export · BE', 'Terminal d’Anvers · BE', 'Port de destination · Afrique'];
const stageCodes = ['01 · BOOKING', '02 · CONTENEUR', '03 · CHARGEMENT', '04 · CONTRÔLE & VGM', '05 · FORMALITÉS', '06 · EMBARQUEMENT', '07 · DESTINATION'];
const sequenceIds = ['scene-01-hero', 'scene-02-container', 'scene-03-loading', 'scene-04-vgm', 'scene-04-vgm', 'scene-05-port', 'scene-06-destination'];
const sequenceFrameCount = 120;
const framesPerSheet = 10;
const frameWidth = 1024;
const frameHeight = 576;
const sheetCache = new Map();
const sequencePreloads = new Set();

let ticking = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function frameAsset(sequenceId, frameIndex) {
  const safeIndex = Math.max(0, Math.min(sequenceFrameCount - 1, frameIndex));
  const sheetIndex = Math.floor(safeIndex / framesPerSheet);
  return {
    url: `assets/cinematics/sprites/${sequenceId}/sheet-${String(sheetIndex).padStart(2, '0')}.webp`,
    slot: safeIndex % framesPerSheet,
  };
}

function loadSheet(url) {
  if (sheetCache.has(url)) return sheetCache.get(url);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  sheetCache.set(url, promise);
  return promise;
}

function drawCover(canvas, image, slot = 0) {
  if (!canvas || !image) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const displayWidth = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const displayHeight = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  const context = canvas.getContext('2d', { alpha: false });
  const scale = Math.max(displayWidth / frameWidth, displayHeight / frameHeight);
  const width = frameWidth * scale;
  const height = frameHeight * scale;
  context.drawImage(image, slot * frameWidth, 0, frameWidth, frameHeight, (displayWidth - width) / 2, (displayHeight - height) / 2, width, height);
  canvas._lastFrame = { image, slot };
}

function renderFrame(canvas, sequenceId, frameIndex, onReady) {
  if (!canvas) return;
  const requestKey = `${sequenceId}:${frameIndex}`;
  canvas.dataset.requestedFrame = requestKey;
  const asset = frameAsset(sequenceId, frameIndex);
  loadSheet(asset.url).then((image) => {
    if (canvas.dataset.requestedFrame !== requestKey) return;
    drawCover(canvas, image, asset.slot);
    onReady?.();
    [-10, 10].forEach((offset) => loadSheet(frameAsset(sequenceId, frameIndex + offset).url).catch(() => {}));
  }).catch(() => {});
}

async function preloadSequence(sequenceId) {
  if (sequencePreloads.has(sequenceId)) return;
  sequencePreloads.add(sequenceId);
  const sheetCount = Math.ceil(sequenceFrameCount / framesPerSheet);
  for (let start = 0; start < sheetCount; start += 3) {
    const batch = Array.from({ length: Math.min(3, sheetCount - start) }, (_, index) => loadSheet(frameAsset(sequenceId, (start + index) * framesPerSheet).url).catch(() => null));
    await Promise.all(batch);
    await new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 80 }) : setTimeout(resolve, 16)));
  }
}

renderFrame(heroSequence, sequenceIds[0], 0, () => hero?.classList.add('media-ready'));
renderFrame(cinemaSequence, sequenceIds[0], 0, () => cinema?.classList.add('has-active-sequence'));
preloadSequence(sequenceIds[0]);

const journeyPreloader = new IntersectionObserver((entries, observer) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  void (async () => {
    for (const sequenceId of new Set(sequenceIds.slice(1))) await preloadSequence(sequenceId);
  })();
  observer.disconnect();
}, { rootMargin: '150% 0px' });
if (journey) journeyPreloader.observe(journey);

function updateScrollExperience() {
  const y = window.scrollY;
  header?.classList.toggle('scrolled', y > 24);
  const heroProgress = Math.max(0, Math.min(1, y / Math.max(window.innerHeight, 1)));
  const heroFrame = reducedMotion ? 0 : Math.round(heroProgress * (sequenceFrameCount - 1));
  renderFrame(heroSequence, sequenceIds[0], heroFrame, () => hero?.classList.add('media-ready'));
  const container = $('[data-container]');
  if (container && y < window.innerHeight * 1.2) {
    const shift = Math.min(y * 0.08, 50);
    container.style.transform = `translateY(calc(-43% + ${shift}px)) perspective(1200px) rotateY(${-4 + y * .006}deg) rotateX(1deg)`;
  }

  if (journey) {
    const rect = journey.getBoundingClientRect();
    const scrollable = journey.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
    const sceneIndex = Math.min(6, Math.floor(progress * 7));
    const sceneProgress = Math.max(0, Math.min(1, progress * 7 - sceneIndex));
    scenes.forEach((scene, index) => scene.classList.toggle('active', index === sceneIndex));
    if (cinema) cinema.dataset.step = String(sceneIndex);
    const frameIndex = reducedMotion ? 0 : sceneIndex === 4 ? sequenceFrameCount - 1 : Math.round(sceneProgress * (sequenceFrameCount - 1));
    renderFrame(cinemaSequence, sequenceIds[sceneIndex], frameIndex, () => cinema?.classList.add('has-active-sequence'));
    if (stageLocation) stageLocation.textContent = stageLocations[sceneIndex];
    if (stageCode) stageCode.textContent = stageCodes[sceneIndex];
    if (weight) weight.textContent = sceneIndex === 3 ? String(Math.round(12000 + progress * 21500)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '00 000';
    if (journeyCurrent) journeyCurrent.textContent = String(sceneIndex + 1).padStart(2, '0');
    if (journeyBar) journeyBar.style.width = `${progress * 100}%`;
  }
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(updateScrollExperience); ticking = true; }
}, { passive: true });
window.addEventListener('resize', updateScrollExperience);
window.addEventListener('resize', () => {
  if (heroSequence?._lastFrame) drawCover(heroSequence, heroSequence._lastFrame.image, heroSequence._lastFrame.slot);
  if (cinemaSequence?._lastFrame) drawCover(cinemaSequence, cinemaSequence._lastFrame.image, cinemaSequence._lastFrame.slot);
});
updateScrollExperience();

const trackSteps = ['Booking', 'Positionné', 'Chargement', 'VGM', 'Douane', 'Gate-in', 'Embarqué', 'En transit', 'Arrivé'];
const trackingForm = $('[data-tracking-form]');
const trackingResult = $('[data-tracking-result]');
const trackingInput = $('#tracking-code');
const timeline = $('[data-timeline]');
const trackingError = $('[data-tracking-error]');
const demoShipments = {
  'LOU-26091': { origin:'Anvers', originCode:'BE', destination:'Abidjan', destinationCode:'CI', status:'En transit', container:'DEMO1234567', etd:'12 sept. 2026', eta:'28 sept. 2026', progress:7 },
  'LOU-25842': { origin:'Anvers', originCode:'BE', destination:'Dakar', destinationCode:'SN', status:'Arrivée', container:'DEMO7654321', etd:'02 août 2026', eta:'18 août 2026', progress:9 },
  'LOU-25117': { origin:'Anvers', originCode:'BE', destination:'Lomé', destinationCode:'TG', status:'Arrivée', container:'DEMO2468135', etd:'04 juil. 2026', eta:'22 juil. 2026', progress:9 }
};

function renderTimeline(progress) {
  timeline.innerHTML = trackSteps.map((step, index) => `<span class="track-step ${index < progress ? 'done' : index === progress ? 'current' : ''}">${step}</span>`).join('');
}
$$('[data-fill-tracking]').forEach((button) => button.addEventListener('click', () => { trackingInput.value = button.textContent.trim(); trackingInput.focus(); }));
trackingForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = trackingInput.value.trim().toUpperCase();
  if (!value) return;
  const shipment = demoShipments[value];
  if (!shipment) {
    trackingError.hidden = false;
    trackingResult.hidden = true;
    return;
  }
  trackingError.hidden = true;
  $('[data-track-origin]').textContent = shipment.origin;
  $('[data-track-origin-code]').textContent = shipment.originCode;
  $('[data-track-destination]').textContent = shipment.destination;
  $('[data-track-destination-code]').textContent = shipment.destinationCode;
  $('[data-track-status]').textContent = shipment.status;
  $('[data-track-reference]').textContent = value;
  $('[data-track-container]').textContent = shipment.container;
  $('[data-track-etd]').textContent = shipment.etd;
  $('[data-track-eta]').textContent = shipment.eta;
  renderTimeline(shipment.progress);
  trackingResult.hidden = false;
  trackingResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

const quoteForm = $('[data-quote-form]');
const quoteSteps = $$('[data-quote-step]');
const quotePrevious = $('[data-quote-prev]');
const quoteNext = $('[data-quote-next]');
const quoteLabel = $('[data-quote-label]');
const quoteProgress = $('[data-quote-progress]');
const quoteSuccess = $('[data-quote-success]');
let quoteStep = 0;

function showQuoteStep() {
  quoteSteps.forEach((step, index) => step.classList.toggle('active', index === quoteStep));
  quotePrevious.hidden = quoteStep === 0;
  quoteLabel.textContent = `Étape ${quoteStep + 1} sur ${quoteSteps.length}`;
  quoteProgress.style.width = `${((quoteStep + 1) / quoteSteps.length) * 100}%`;
  quoteNext.textContent = quoteStep === quoteSteps.length - 1 ? 'Valider la démonstration →' : 'Continuer →';
}

function currentStepIsValid() {
  if (quoteStep === 2 && !$('[data-container-choice]').value) {
    $('[data-container-error]').hidden = false;
    return false;
  }
  return $$('input, textarea', quoteSteps[quoteStep]).every((field) => !field.required || field.reportValidity());
}

quoteNext?.addEventListener('click', () => {
  if (!currentStepIsValid()) return;
  if (quoteStep < quoteSteps.length - 1) { quoteStep += 1; showQuoteStep(); return; }
  quoteSteps.forEach((step) => step.classList.remove('active'));
  $('.quote-actions', quoteForm).hidden = true;
  quoteSuccess.hidden = false;
});
quotePrevious?.addEventListener('click', () => { quoteStep = Math.max(0, quoteStep - 1); showQuoteStep(); });
$$('[data-choice]').forEach((button) => button.addEventListener('click', () => {
  $$('[data-choice]').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected');
  $('[data-container-choice]').value = button.dataset.choice;
  $('[data-container-error]').hidden = true;
}));
showQuoteStep();

$$('.portal-nav button').forEach((button) => button.addEventListener('click', () => {
  $$('.portal-nav button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('[data-portal-mode]').forEach((button) => button.addEventListener('click', () => {
  const mode = button.dataset.portalMode;
  $$('[data-portal-mode]').forEach((item) => item.classList.toggle('active', item === button));
  $$('[data-portal-screen]').forEach((screen) => { screen.hidden = screen.dataset.portalScreen !== mode; });
}));

$('[data-year]').textContent = new Date().getFullYear();
