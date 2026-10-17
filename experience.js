(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const header = $('.site-header');
  const menu = $('.nav-links');
  const menuButton = $('.menu-button');
  const setHeader = () => header?.classList.toggle('scrolled', window.scrollY > 18);
  setHeader(); window.addEventListener('scroll', setHeader, { passive: true });
  menuButton?.addEventListener('click', () => { const open = menu.classList.toggle('open'); menuButton.setAttribute('aria-expanded', open); menuButton.textContent = open ? '×' : '☰'; });
  $$('.nav-links a').forEach(link => link.addEventListener('click', () => { menu?.classList.remove('open'); menuButton?.setAttribute('aria-expanded', 'false'); if (menuButton) menuButton.textContent = '☰'; }));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } }), { threshold: .14 });
  $$('.reveal').forEach(element => observer.observe(element));
  const statObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; const target = entry.target; const end = Number(target.dataset.count); const start = performance.now(); const duration = 1300; const frame = time => { const t = Math.min((time - start) / duration, 1), current = Math.floor(end * (1 - Math.pow(1 - t, 3))); target.textContent = current.toLocaleString('en-IN') + (target.dataset.suffix || ''); if (t < 1) requestAnimationFrame(frame); }; requestAnimationFrame(frame); statObserver.unobserve(target); }), { threshold: .45 });
  $$('[data-count]').forEach(element => statObserver.observe(element));
  const cards = $('.animal-card');
  const animalDetails = {
    tiger: ['Bengal tiger', 'Panthera tigris', 'Forests and grasslands of the Indian subcontinent', 'Tigers are apex predators that help keep ecosystems balanced. Major threats include habitat loss, poaching and conflict near settlements. Protecting connected forests and reporting wildlife crime helps them survive.'],
    turtle: ['Green turtle', 'Chelonia mydas', 'Tropical and subtropical oceans', 'Green turtles spend most of their lives at sea and depend on healthy marine habitats. Plastic, fishing gear and nesting-beach disturbance are serious threats. Never touch a nesting turtle or disturb hatchlings.'],
    elephant: ['Asian elephant', 'Elephas maximus', 'South and Southeast Asian forests and grasslands', 'Elephants are highly social, intelligent mammals that shape their habitats. Habitat fragmentation and conflict with people are major challenges. Observe wild elephants from a safe distance and never approach a herd.'],
    leopard: ['Leopard', 'Panthera pardus', 'Woodlands, forests and varied landscapes across Africa and Asia', 'Leopards are adaptable, mostly solitary big cats. Habitat loss and conflict can put them at risk. If one is spotted nearby, do not crowd it or attempt to chase it; follow local wildlife guidance.']
  };
  let animalDialog = null;
  const closeAnimalDialog = () => { if (animalDialog) { animalDialog.remove(); animalDialog = null; } };
  cards.forEach(card => {
    const learn = $('.learn-animal', card);
    if (!learn) return;
    learn.addEventListener('click', event => {
      event.stopPropagation();
      closeAnimalDialog();
      const id = card.dataset.animal;
      const fallback = animalDetails[id] || [card.querySelector('h3')?.textContent || 'Animal', card.dataset.scientific || 'Species details', card.dataset.range || 'Learn about its habitat', card.dataset.facts || 'Every animal needs a safe habitat, clean water and compassionate, informed care. If you find an injured animal, keep a safe distance and contact a qualified local rescuer or veterinarian.'];
      const title = card.querySelector('h3')?.textContent || fallback[0];
      const scientific = card.dataset.scientific || fallback[1];
      const range = card.dataset.range || fallback[2];
      const facts = card.dataset.facts || fallback[3];
      animalDialog = document.createElement('div');
      animalDialog.className = 'animal-dialog-backdrop';
      animalDialog.innerHTML = '<section class="animal-dialog" role="dialog" aria-modal="true" aria-labelledby="animalDialogTitle"><button class="animal-dialog-close" type="button" aria-label="Close animal details">×</button><p class="eyebrow">Field notes · Animal guide</p><h2 id="animalDialogTitle"></h2><p class="animal-scientific"></p><div class="animal-detail-rule"></div><h3>Where it lives</h3><p class="animal-range"></p><h3>Know and protect</h3><p class="animal-facts"></p><a class="btn animal-rescue-link" href="report-injured-animal.html">Report an animal in need ↗</a></section>';
      $('.animal-dialog h2', animalDialog).textContent = title;
      $('.animal-scientific', animalDialog).textContent = scientific;
      $('.animal-range', animalDialog).textContent = range;
      $('.animal-facts', animalDialog).textContent = facts;
      document.body.append(animalDialog);
      $('.animal-dialog-close', animalDialog).focus();
      animalDialog.addEventListener('click', e => { if (e.target === animalDialog || e.target.closest('.animal-dialog-close')) closeAnimalDialog(); });
      document.addEventListener('keydown', function escapeDialog(e) { if (e.key === 'Escape' && animalDialog) { closeAnimalDialog(); document.removeEventListener('keydown', escapeDialog); } });
    });
  });
  const search = $('#animalSearch');
  const filterButtons = $$('.filter');
  const applyFilter = () => { const term = (search?.value || '').toLowerCase(); const active = $('.filter.active')?.dataset.filter || 'all'; let count = 0; cards.forEach(card => { const animal = (card.dataset.animal || '').toLowerCase(); const categoryMatch = active === 'all' || (active === 'dog' && animal.includes('dog')) || (active === 'cat' && animal.includes('cat')) || (active === 'bird' && (animal.includes('owl') || animal.includes('bird'))) || (active === 'farm' && (animal.includes('cow') || animal.includes('dog') || animal.includes('cat'))); const match = categoryMatch && card.textContent.toLowerCase().includes(term); card.hidden = !match; if (match) count++; }); const empty = $('.empty'); if (empty) empty.style.display = count ? 'none' : 'block'; };
  search?.addEventListener('input', applyFilter);
  // Search the live web via Wikipedia's public API; local rescue cards remain available without network access.
  const onlineResults = $('#onlineAnimalResults');
  const onlineStatus = $('#onlineAnimalStatus');
  let onlineSearchController = null;
  let onlineSearchTimer = null;
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const searchAnimalsOnline = async term => {
    if (!onlineResults || !onlineStatus) return;
    if (onlineSearchController) onlineSearchController.abort();
    onlineResults.replaceChildren();
    if (term.length < 2) { onlineStatus.textContent = 'Search an animal name to discover images and facts from Wikipedia.'; return; }
    onlineSearchController = new AbortController();
    onlineStatus.textContent = 'Searching the web for animals…';
    try {
      const endpoint = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=0&gsrlimit=8&gsrsearch=' + encodeURIComponent(term + ' animal') + '&prop=pageimages%7Cextracts&piprop=thumbnail&pithumbsize=700&exintro=1&explaintext=1&format=json&origin=*';
      const response = await fetch(endpoint, {signal: onlineSearchController.signal});
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      const pages = Object.values(data.query?.pages || {}).filter(page => page.thumbnail?.source && page.extract);
      if (!pages.length) { onlineStatus.textContent = 'No illustrated web results found. Try a broader animal name.'; return; }
      onlineResults.innerHTML = pages.map(page => '<article class="online-animal-card"><img loading="lazy" src="' + escapeHTML(page.thumbnail.source) + '" alt="' + escapeHTML(page.title) + '"><div class="online-animal-copy"><h3>' + escapeHTML(page.title) + '</h3><p>' + escapeHTML(page.extract.slice(0, 210)) + (page.extract.length > 210 ? '…' : '') + '</p><a href="https://en.wikipedia.org/?curid=' + encodeURIComponent(page.pageid) + '" target="_blank" rel="noopener noreferrer">Read source ↗</a></div></article>').join('');
      onlineStatus.textContent = 'Web results from Wikipedia. Open a source to read more; these are educational results, not verified rescue listings.';
    } catch (error) {
      if (error.name === 'AbortError') return;
      onlineStatus.textContent = 'Could not reach the animal search right now. Check your internet connection and try again.';
    }
  };
  search?.addEventListener('input', () => { clearTimeout(onlineSearchTimer); onlineSearchTimer = setTimeout(() => searchAnimalsOnline(search.value.trim()), 350); });
  filterButtons.forEach(button => button.addEventListener('click', () => { filterButtons.forEach(item => item.classList.toggle('active', item === button)); applyFilter(); }));
  const saved = JSON.parse(localStorage.getItem('aa-favourites') || '[]');
  $$('.save').forEach(button => { const id = button.closest('.animal-card').dataset.animal; button.classList.toggle('saved', saved.includes(id)); button.setAttribute('aria-pressed', saved.includes(id)); button.addEventListener('click', event => { event.stopPropagation(); const at = saved.indexOf(id); at === -1 ? saved.push(id) : saved.splice(at, 1); localStorage.setItem('aa-favourites', JSON.stringify(saved)); button.classList.toggle('saved'); button.setAttribute('aria-pressed', String(at === -1)); }); });
  cards.forEach(card => {
    card.tabIndex = 0; card.setAttribute('role', 'link');
    card.setAttribute('aria-label', 'Open details for ' + (card.querySelector('h3')?.textContent || 'animal'));
    const openAnimal = () => { const slug = card.dataset.animal || card.querySelector('h3')?.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-'); window.location.href = 'animal.html?animal=' + encodeURIComponent(slug); };
    card.addEventListener('click', event => { if (event.target.closest('.save')) return; openAnimal(); });
    card.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === card) { event.preventDefault(); openAnimal(); } });
  });
    cards.forEach(card => card.addEventListener('mousemove', event => { if (matchMedia('(pointer:fine)').matches) { const box = card.getBoundingClientRect(), x = (event.clientX - box.left) / box.width - .5, y = (event.clientY - box.top) / box.height - .5; card.style.transform = `translateY(-6px) rotate(${x * .8}deg) perspective(600px) rotateX(${-y * 2}deg)`; } }));
  cards.forEach(card => card.addEventListener('mouseleave', () => card.style.transform = ''));
  const contactForms = $$('form[data-demo-form]');
  contactForms.forEach(form => form.addEventListener('submit', event => { event.preventDefault(); const note = $('.form-note', form); if (note) { note.textContent = 'Thanks — your message has been prepared. Connect this form to your email service to send it live.'; note.style.color = '#1f7048'; } }));
  // Submit rescue reports through FormSubmit's AJAX endpoint (GitHub Pages has no server runtime).
  const rescueForm = $('form[data-rescue-form]');
  const locationButton = $('#usePreciseLocation');
  const locationInput = $('#location');
  const locationStatus = $('#locationStatus');
  const latitudeInput = $('#latitude');
  const longitudeInput = $('#longitude');
  const mapPreview = $('#mapPreview');
  const locationMap = $('#locationMap');
  const openMap = $('#openMap');

  locationButton?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (locationStatus) locationStatus.textContent = 'Precise location is not supported by this browser. Please type the address.';
      return;
    }
    locationButton.disabled = true;
    locationButton.textContent = 'Finding location…';
    if (locationStatus) locationStatus.textContent = 'Allow location access in your browser when prompted.';
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const coordinates = `Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`;
      if (latitudeInput) latitudeInput.value = lat.toFixed(6);
      if (longitudeInput) longitudeInput.value = lon.toFixed(6);
      if (locationInput) {
        const existing = locationInput.value.trim();
        locationInput.value = existing ? `${existing}\n${coordinates}` : coordinates;
      }
      const delta = 0.006;
      if (locationMap) locationMap.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-delta}%2C${lat-delta}%2C${lon+delta}%2C${lat+delta}&layer=mapnik&marker=${lat}%2C${lon}`;
      if (openMap) openMap.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
      if (mapPreview) mapPreview.hidden = false;
      if (locationStatus) locationStatus.textContent = 'Precise coordinates added. You can still edit the address above.';
      locationButton.disabled = false;
      locationButton.textContent = '◎ Update my precise location';
    }, error => {
      const messages = {
        1: 'Location permission was denied. Allow it in browser settings or type the address manually.',
        2: 'Could not determine your location. Try again outdoors or type the address.',
        3: 'Location request timed out. Please try again.'
      };
      if (locationStatus) locationStatus.textContent = messages[error.code] || 'Could not get location. Please type the address manually.';
      locationButton.disabled = false;
      locationButton.textContent = '◎ Try precise location again';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
  rescueForm?.addEventListener('reset', () => {
    if (latitudeInput) latitudeInput.value = '';
    if (longitudeInput) longitudeInput.value = '';
    if (locationStatus) locationStatus.textContent = '';
    if (mapPreview) mapPreview.hidden = true;
    if (locationMap) locationMap.removeAttribute('src');
  });
  rescueForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('button[type="submit"]', rescueForm);
    const note = $('.form-note', rescueForm);
    const originalText = 'Send rescue report →';
    submit.disabled = true;
    submit.textContent = 'Sending report…';
    try {
      const response = await fetch('https://formsubmit.co/ajax/animalallies11@gmail.com', {
        method: 'POST',
        body: new FormData(rescueForm),
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();
      if (!response.ok || result.success === 'false' || result.success === false) {
        throw new Error(result.message || 'Email service did not accept the report.');
      }
      rescueForm.reset();
      note.innerHTML = 'Thank you! Your rescue report has been submitted. <a href="https://alok2709-dev.github.io/Animal-allies/index.html">Visit the Animal Allies website</a>. For urgent cases, call or WhatsApp the rescue line.';
      note.style.color = '#1f7048';
    } catch (error) {
      note.textContent = 'Could not send the report. Please call or WhatsApp the rescue line now, then try again later.';
      note.style.color = '#ae291e';
    } finally {
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });
  if (!document.body.classList.contains('auth-page')) {
    const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = 'ally.css'; document.head.append(stylesheet);
    const assistant = document.createElement('section');
    assistant.className = 'ally-widget';
    assistant.innerHTML = '<button class="ally-fab" type="button" aria-expanded="false" aria-controls="allyPanel"><span>✦</span> Ask Ally</button><div class="ally-panel" id="allyPanel" hidden><div class="ally-head"><div><span>✦</span><b>Ally, your care guide</b><small>Concise, safety-first help</small></div><button class="ally-close" type="button" aria-label="Close guide">×</button></div><div class="ally-messages" aria-live="polite"><p class="ally-message ally-bot">Hi, I’m Ally. Ask about safe next steps for an animal, a habitat, or how to help.</p></div><form class="ally-form"><textarea maxlength="600" aria-label="Ask Ally a question" placeholder="How can I help an injured bird?"></textarea><button type="submit" aria-label="Send question">↑</button></form><p class="ally-limit">AI answers are brief to conserve costs. Not a veterinary service.</p></div>';
    document.body.append(assistant);
    const fab = $('.ally-fab', assistant), panel = $('.ally-panel', assistant), close = $('.ally-close', assistant), form = $('.ally-form', assistant), input = $('textarea', form), messages = $('.ally-messages', assistant);
    const toggle = open => { panel.hidden = !open; fab.setAttribute('aria-expanded', String(open)); if (open) input.focus(); };
    fab.addEventListener('click', () => toggle(panel.hidden)); close.addEventListener('click', () => toggle(false));
    form.addEventListener('submit', async event => {
      event.preventDefault(); const message = input.value.trim(); if (!message) return;
      const user = document.createElement('p'); user.className = 'ally-message ally-user'; user.textContent = message; messages.append(user); input.value = '';
      const waiting = document.createElement('p'); waiting.className = 'ally-message ally-bot ally-waiting'; waiting.textContent = 'Thinking…'; messages.append(waiting); messages.scrollTop = messages.scrollHeight;
      try {
        const response = await fetch('/api/ask-ally', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error);
        waiting.textContent = result.answer;
      } catch (error) { waiting.textContent = error.message || 'I am unavailable right now. Please try again shortly.'; }
      waiting.classList.remove('ally-waiting'); messages.scrollTop = messages.scrollHeight;
    });
  }
})();
