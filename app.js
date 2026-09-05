(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  $('[data-year]').textContent = new Date().getFullYear();

  const menu = $('[data-menu]');
  const navigation = $('#navigation');
  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Ouvrir le menu');
    $('use', menu).setAttribute('href', '#i-menu');
    navigation.classList.remove('is-open');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    $('use', menu).setAttribute('href', open ? '#i-close' : '#i-menu');
  });
  $$('a', navigation).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  document.addEventListener('click', e => { if (!$('[data-header]').contains(e.target)) closeMenu(); });
  const updateHeader = () => $('[data-header]').classList.toggle('is-scrolled', scrollY > 60);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const shipments = {
    'LOU-26091': { origin: 'Anvers', destination: 'Abidjan', status: 'En transit', etd: '12 sept. 2026', eta: '28 sept. 2026', container: 'DEMO1234567', stage: 3, update: 'Exemple : votre expédition poursuit sa route vers Abidjan.' },
    'LOU-25842': { origin: 'Anvers', destination: 'Dakar', status: 'Arrivée au port', etd: '26 août 2026', eta: '9 sept. 2026', container: 'DEMO2584200', stage: 4, update: 'Exemple : le conteneur est arrivé au port de Dakar. La livraison reste à coordonner.' },
    'LOU-25117': { origin: 'Anvers', destination: 'Lomé', status: 'Arrivée au port', etd: '14 août 2026', eta: '31 août 2026', container: 'DEMO2511700', stage: 4, update: 'Exemple : arrivée au port de Lomé confirmée. Les documents sont disponibles.' }
  };
  let selectedReference = 'LOU-26091';
  const steps = ['Réservation', 'Prise en charge', 'Au terminal', 'En mer', 'Arrivée au port'];
  const tabs = $$('[data-client-tab]');
  function selectTab(name, focus = false) {
    tabs.forEach(tab => {
      const selected = tab.dataset.clientTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $('#' + tab.getAttribute('aria-controls')).hidden = !selected;
      if (selected && focus) tab.focus();
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.clientTab));
    tab.addEventListener('keydown', e => {
      let target;
      if (e.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') target = 0;
      if (e.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { e.preventDefault(); selectTab(tabs[target].dataset.clientTab, true); }
    });
  });
  function showShipment(reference) {
    const data = shipments[reference];
    $('#tracking-error').hidden = Boolean(data);
    $('#tracking-code').setAttribute('aria-invalid', String(!data));
    if (!data) return;
    selectedReference = reference;
    const values = { reference, origin: data.origin, destination: data.destination, status: data.status, etd: data.etd, eta: data.eta, container: data.container, 'shipment-update': data.update, 'document-reference': reference, 'profile-reference': reference };
    Object.entries(values).forEach(([key, value]) => $('[data-' + key + ']').textContent = value);
    const timeline = $('[data-timeline]');
    timeline.replaceChildren(...steps.map((step, i) => {
      const li = document.createElement('li');
      li.textContent = step;
      li.className = i < data.stage ? 'done' : i === data.stage ? 'current' : '';
      if (i === data.stage) li.setAttribute('aria-current', 'step');
      return li;
    }));
    $('[data-documents]').replaceChildren(...['Confirmation de réservation', 'Connaissement maritime', 'Dossier douanier'].map((title, i) => {
      const link = document.createElement('a');
      link.className = 'document-row';
      link.href = 'assets/demo-documents/EXEMPLE-' + reference + '-' + (i + 1) + '.txt';
      link.download = 'EXEMPLE-' + reference + '-' + (i + 1) + '.txt';
      link.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-document"/></svg><span>' + title + '<small>Exemple · TXT · non contractuel</small></span><svg class="icon" aria-hidden="true"><use href="#i-download"/></svg>';
      link.setAttribute('aria-label', 'Télécharger un exemple : ' + title);
      return link;
    }));
  }
  $('[data-tracking-form]').addEventListener('submit', e => {
    e.preventDefault();
    const query = $('#tracking-code').value.trim().toUpperCase();
    const reference = shipments[query] ? query : Object.keys(shipments).find(key => shipments[key].container === query) || query;
    $('#tracking-code').value = reference;
    showShipment(reference);
    if (shipments[reference]) { selectTab('expedition'); $('#panel-expedition').focus({ preventScroll: true }); }
  });
  $$('[data-demo-ref]').forEach(button => button.addEventListener('click', () => {
    $('#tracking-code').value = button.dataset.demoRef;
    showShipment(button.dataset.demoRef);
    selectTab('expedition');
  }));
  showShipment(selectedReference);

  const form = $('[data-quote-form]');
  const quoteSteps = $$('[data-quote-step]', form);
  const previous = $('[data-quote-prev]');
  const next = $('[data-quote-next]');
  const names = ['Départ', 'Destination', 'Marchandise', 'Coordonnées'];
  let currentStep = 0;
  function updateQuote(focus = true) {
    quoteSteps.forEach((step, i) => { step.hidden = i !== currentStep; });
    previous.hidden = currentStep === 0;
    next.innerHTML = (currentStep === 3 ? 'Tester ma demande' : 'Continuer') + ' <svg class="icon" aria-hidden="true"><use href="#i-right"/></svg>';
    $('[data-quote-label]').textContent = '0' + (currentStep + 1) + ' / 04 · ' + names[currentStep];
    $('[data-quote-progress]').style.width = ((currentStep + 1) * 25) + '%';
    if (focus) {
      const legend = $('legend', quoteSteps[currentStep]);
      legend.tabIndex = -1; legend.focus({ preventScroll: true });
    }
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const invalid = $$('input, textarea', quoteSteps[currentStep]).find(field => !field.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    if (currentStep < 3) { currentStep++; updateQuote(); return; }
    quoteSteps.forEach(step => step.hidden = true);
    $('.quote-actions', form).hidden = true;
    $('.quote-progress', form).hidden = true;
    $('[data-quote-success]').hidden = false;
    $('[data-quote-success]').tabIndex = -1;
    $('[data-quote-success]').focus({ preventScroll: true });
    form.reset();
  });
  previous.addEventListener('click', () => { if (currentStep > 0) { currentStep--; updateQuote(); } });
  $('[data-quote-reset]').addEventListener('click', () => {
    currentStep = 0;
    $('[data-quote-success]').hidden = true;
    $('.quote-actions', form).hidden = false;
    $('.quote-progress', form).hidden = false;
    updateQuote();
  });
  updateQuote(false);
})();
