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
  const cards = $$('.animal-card');
  const search = $('#animalSearch');
  const filterButtons = $$('.filter');
  const applyFilter = () => { const term = (search?.value || '').toLowerCase(); const active = $('.filter.active')?.dataset.filter || 'all'; let count = 0; cards.forEach(card => { const match = (active === 'all' || card.dataset.habitat.includes(active) || card.dataset.status.includes(active)) && card.textContent.toLowerCase().includes(term); card.hidden = !match; if (match) count++; }); const empty = $('.empty'); if (empty) empty.style.display = count ? 'none' : 'block'; };
  search?.addEventListener('input', applyFilter);
  filterButtons.forEach(button => button.addEventListener('click', () => { filterButtons.forEach(item => item.classList.toggle('active', item === button)); applyFilter(); }));
  const saved = JSON.parse(localStorage.getItem('aa-favourites') || '[]');
  $$('.save').forEach(button => { const id = button.closest('.animal-card').dataset.animal; button.classList.toggle('saved', saved.includes(id)); button.setAttribute('aria-pressed', saved.includes(id)); button.addEventListener('click', event => { event.stopPropagation(); const at = saved.indexOf(id); at === -1 ? saved.push(id) : saved.splice(at, 1); localStorage.setItem('aa-favourites', JSON.stringify(saved)); button.classList.toggle('saved'); button.setAttribute('aria-pressed', String(at === -1)); }); });
  cards.forEach(card => card.addEventListener('mousemove', event => { if (matchMedia('(pointer:fine)').matches) { const box = card.getBoundingClientRect(), x = (event.clientX - box.left) / box.width - .5, y = (event.clientY - box.top) / box.height - .5; card.style.transform = `translateY(-6px) rotate(${x * .8}deg) perspective(600px) rotateX(${-y * 2}deg)`; } }));
  cards.forEach(card => card.addEventListener('mouseleave', () => card.style.transform = ''));
  const contactForms = $$('form[data-demo-form]');
  contactForms.forEach(form => form.addEventListener('submit', event => { event.preventDefault(); const note = $('.form-note', form); if (note) { note.textContent = 'Thanks — your message has been prepared. Connect this form to your email service to send it live.'; note.style.color = '#1f7048'; } }));
  // Submit rescue reports through FormSubmit's AJAX endpoint (GitHub Pages has no server runtime).
  const rescueForm = $('form[data-rescue-form]');
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
