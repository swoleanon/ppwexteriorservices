
const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if(menu && nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

const SOUTH_FLORIDA = { south: 25.14, west: -80.89, north: 26.98, east: -79.96 };

function loadGoogleMaps(key){
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ppw-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.ppwMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
}

function confirmAddress(value, input, verified, hint){
  if (input) input.value = value;
  if (verified) verified.value = 'yes';
  if (hint) {
    hint.textContent = 'Address confirmed.';
    hint.className = 'field-hint ok';
  }
}

async function initGoogleAutocomplete(input, verified, hint){
  const bounds = SOUTH_FLORIDA;
  try {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
    if (typeof PlaceAutocompleteElement === 'function') {
      const widget = new PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        includedPrimaryTypes: ['street_address', 'premise'],
        locationBias: bounds,
        requestedLanguage: 'en'
      });
      widget.setAttribute('placeholder', 'Start typing the street address');
      const mount = document.getElementById('address-autocomplete') || input.parentElement;
      input.type = 'hidden';
      input.removeAttribute('required');
      input.removeAttribute('placeholder');
      mount.appendChild(widget);

      widget.addEventListener('gmp-select', async (event) => {
        const prediction = event.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress'] });
        confirmAddress(place.formattedAddress || '', input, verified, hint);
      });

      widget.addEventListener('gmp-placeselect', async (event) => {
        const place = event.place;
        if (!place) return;
        if (place.fetchFields) await place.fetchFields({ fields: ['formattedAddress'] });
        confirmAddress(place.formattedAddress || place.formatted_address || '', input, verified, hint);
      });
      return;
    }
  } catch (error) {
    // Fall through to the classic Autocomplete widget.
  }

  const Autocomplete = google.maps.places?.Autocomplete;
  if (!Autocomplete) throw new Error('Places Autocomplete is unavailable');
  const autocomplete = new Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    fields: ['formatted_address'],
    bounds: new google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    ),
    strictBounds: false
  });
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place?.formatted_address) confirmAddress(place.formatted_address, input, verified, hint);
  });
}

async function initAddressSearch(){
  const input = document.getElementById('address');
  const hint = document.getElementById('address-hint');
  const verified = document.getElementById('address_verified');
  if (!input) return;

  const key = window.PPW_GOOGLE_MAPS_KEY;
  if (!key) {
    if (hint) {
      hint.textContent = 'Add a Google Maps API key in assets/maps-key.js to enable address suggestions.';
      hint.className = 'field-hint warn';
    }
    return;
  }

  try {
    await loadGoogleMaps(key);
    await initGoogleAutocomplete(input, verified, hint);
    input.addEventListener('input', () => {
      if (verified) verified.value = 'no';
      if (hint) {
        hint.textContent = 'Start typing, then choose your address from the Google suggestions.';
        hint.className = 'field-hint';
      }
    });
  } catch (error) {
    if (hint) {
      hint.textContent = 'Google address search could not load. Enter the full street address, city, and ZIP.';
      hint.className = 'field-hint warn';
    }
  }
}

function initPhotoPreview(){
  const input = document.getElementById('photos');
  const previews = document.getElementById('photo-previews');
  const status = document.getElementById('form-status');
  if(!input || !previews) return;
  const maxFiles = 5;
  const maxSize = 10 * 1024 * 1024;

  input.addEventListener('change', ()=>{
    const files = [...input.files];
    if(files.length > maxFiles || files.some(file => file.size > maxSize || !file.type.startsWith('image/'))){
      input.value = '';
      previews.innerHTML = '';
      if(status) status.textContent = 'Please upload up to 5 image files, each 10MB or smaller.';
      return;
    }
    if(status && status.textContent.includes('image files')) status.textContent = '';
    previews.innerHTML = '';
    files.forEach(file=>{
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = ()=>URL.revokeObjectURL(img.src);
      previews.appendChild(img);
    });
  });
}

initAddressSearch();
initPhotoPreview();

const quoteForm = document.getElementById('quote-form');
if (quoteForm) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = quoteForm.querySelector('button[type="submit"]');
    const status = document.getElementById('form-status');
    const address = document.getElementById('address');
    const verified = document.getElementById('address_verified');
    if (status) status.textContent = '';

    if (address && (!/\d/.test(address.value) || address.value.trim().length < 8)) {
      if (status) status.textContent = 'Enter a complete property address, including the street number.';
      address?.focus();
      return;
    }

    if (button) button.disabled = true;
    if (status) status.textContent = 'Sending…';

    try {
      const formData = new FormData(quoteForm);
      const photos = document.getElementById('photos');
      if (photos?.files?.length) {
        formData.delete('picture');
        [...photos.files].forEach((file, i) => {
          formData.append(i === 0 ? 'picture' : `picture${i + 1}`, file, file.name);
        });
      }

      const response = await fetch(quoteForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && (result.code === 200 || result.status === 'success')) {
        window.location.href = 'thank-you.html';
        return;
      }

      if (status) {
        status.textContent = result.message || 'The request did not go through. Call 954-588-5359 or email info@ppwexteriorservices.com.';
      }
    } catch (error) {
      if (status) {
        status.textContent = 'Could not send right now. Call 954-588-5359 or email info@ppwexteriorservices.com.';
      }
    } finally {
      if (button) button.disabled = false;
    }
  });
}
