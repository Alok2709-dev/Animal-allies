(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const form = $('form[data-rescue-form]');
  const locationButton = $('#usePreciseLocation');
  const locationInput = $('#location');
  const status = $('#locationStatus');
  const latitude = $('#latitude');
  const longitude = $('#longitude');
  const preview = $('#mapPreview');
  const map = $('#locationMap');
  const openMap = $('#openMap');

  locationButton?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (status) status.textContent = 'This browser does not support location. Please type the address manually.';
      return;
    }
    locationButton.disabled = true;
    locationButton.textContent = 'Finding location…';
    if (status) status.textContent = 'Please allow location access in your browser prompt.';
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const coords = 'Latitude: ' + lat.toFixed(6) + ', Longitude: ' + lon.toFixed(6);
      if (latitude) latitude.value = lat.toFixed(6);
      if (longitude) longitude.value = lon.toFixed(6);
      if (locationInput && !locationInput.value.includes('Latitude:')) {
        locationInput.value = locationInput.value.trim() ? locationInput.value.trim() + '\n' + coords : coords;
      } else if (locationInput) {
        locationInput.value = locationInput.value.replace(/Latitude:.*Longitude:.*$/m, coords);
      }
      const delta = 0.006;
      if (map) map.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lon-delta) + '%2C' + (lat-delta) + '%2C' + (lon+delta) + '%2C' + (lat+delta) + '&layer=mapnik&marker=' + lat + '%2C' + lon;
      if (openMap) openMap.href = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=18/' + lat + '/' + lon;
      if (preview) preview.hidden = false;
      if (status) status.textContent = 'Location added. You can edit the address before sending.';
      locationButton.disabled = false;
      locationButton.textContent = '◎ Update my precise location';
    }, error => {
      const messages = {1:'Location permission denied. Click the site settings icon near the address bar, allow Location, then refresh.',2:'Your location could not be determined. Try again or type the address.',3:'Location timed out. Try again or type the address.'};
      if (status) status.textContent = messages[error.code] || 'Could not get location. Please type the address manually.';
      locationButton.disabled = false;
      locationButton.textContent = '◎ Try precise location again';
    }, {enableHighAccuracy:true, timeout:20000, maximumAge:0});
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('button[type="submit"]', form);
    const note = $('.form-note', form);
    const oldText = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Sending report…';
    if (note) { note.textContent = 'Sending your report securely…'; note.style.color = '#65786c'; }
    try {
      const response = await fetch('https://formsubmit.co/ajax/animalallies11@gmail.com', {
        method:'POST', body:new FormData(form), headers:{'Accept':'application/json'}
      });
      const result = await response.json();
      if (!response.ok || result.success === false || result.success === 'false') throw new Error(result.message || 'Submission failed');
      form.reset();
      if (preview) preview.hidden = true;
      if (status) status.textContent = '';
      if (note) {
        note.textContent = '';
        const title = document.createElement('strong');
        title.textContent = 'Thank you — your rescue report has been submitted.';
        const detail = document.createElement('span');
        detail.textContent = ' We have sent your report by email. For urgent cases, please call or WhatsApp the rescue line as well.';
        const home = document.createElement('a');
        home.href = 'https://alok2709-dev.github.io/Animal-allies/index.html';
        home.textContent = ' Back to Animal Allies';
        note.append(title, detail, home);
        note.style.color = '#1f7048';
        note.setAttribute('role','status');
        note.scrollIntoView({behavior:'smooth',block:'center'});
      }
    } catch (error) {
      if (note) {
        note.textContent = 'We could not submit the report right now. Please call or WhatsApp the rescue line, then try again.';
        note.style.color = '#ae291e';
        note.setAttribute('role','alert');
      }
    } finally {
      submit.disabled = false;
      submit.textContent = oldText;
    }
  });
})();