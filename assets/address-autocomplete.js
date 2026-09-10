(() => {
  const lookup = document.getElementById('ppw-property-address-search') || document.getElementById('street');
  const city = document.getElementById('city');
  const zip = document.getElementById('zip');
  const form = document.getElementById('quote-form');
  if (!lookup || !city || !zip || !form) return;

  const SOUTH_FLORIDA_CENTER = { lat: 26.1224, lng: -80.1373 };
  const SOUTH_FLORIDA_BOUNDS = { west: -80.95, south: 25.10, east: -79.95, north: 27.10 };
  const MIN_CHARS = 3;
  const DEBOUNCE_MS = 220;
  const MAX_RESULTS = 6;

  // The Cloudflare Worker rewrites this field before the HTML reaches the browser.
  // Keep the same protection here as a fallback for direct/static previews.
  const oldLabel = document.querySelector('label[for="street"]');
  if (lookup.id === 'street') {
    lookup.id = 'ppw-property-address-search';
    lookup.name = 'property_address_lookup';
    lookup.type = 'search';
    if (oldLabel) oldLabel.setAttribute('for', lookup.id);
  }
  lookup.setAttribute('autocomplete', 'off');
  lookup.setAttribute('data-form-type', 'other');
  lookup.setAttribute('data-lpignore', 'true');
  lookup.setAttribute('data-1p-ignore', 'true');
  lookup.setAttribute('spellcheck', 'false');
  lookup.setAttribute('autocapitalize', 'words');
  lookup.setAttribute('aria-autocomplete', 'list');
  form.setAttribute('autocomplete', 'off');

  const addHidden = (name, initialValue = '') => {
    let input = form.querySelector(`input[name="${name}"]`);
    if (input === lookup) input = null;
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = initialValue;
      form.appendChild(input);
    }
    return input;
  };

  const streetSubmission = addHidden('street', lookup.value || '');
  const stateInput = form.querySelector('input[name="state"]') || addHidden('state', 'FL');
  const latInput = addHidden('address_latitude');
  const lngInput = addHidden('address_longitude');
  const sourceInput = addHidden('address_source');
  const placeIdInput = addHidden('google_place_id');

  const wrapper = document.createElement('div');
  wrapper.className = 'address-autocomplete-wrap';
  lookup.parentNode.insertBefore(wrapper, lookup);
  wrapper.appendChild(lookup);

  const list = document.createElement('div');
  list.id = 'address-suggestions';
  list.className = 'address-suggestions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Google address suggestions');
  list.hidden = true;
  wrapper.appendChild(list);

  const helper = document.createElement('small');
  helper.className = 'address-helper';
  helper.textContent = 'Start typing the property address, then choose the matching Google result.';
  wrapper.appendChild(helper);

  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  wrapper.appendChild(live);

  lookup.setAttribute('aria-controls', list.id);
  lookup.setAttribute('aria-expanded', 'false');
  lookup.setAttribute('role', 'combobox');

  const style = document.createElement('style');
  style.textContent = `
    .address-autocomplete-wrap{position:relative;display:grid;gap:7px}
    .address-suggestions{position:absolute;z-index:99999;top:calc(52px + 6px);left:0;right:0;background:#fff;border:1px solid rgba(5,8,6,.22);box-shadow:0 20px 44px rgba(5,8,6,.22);max-height:350px;overflow:auto}
    .address-suggestions[hidden]{display:none}
    .address-suggestion{display:block;width:100%;border:0;border-bottom:1px solid rgba(5,8,6,.08);background:#fff;color:#111;text-align:left;padding:12px 14px;cursor:pointer;font:inherit}
    .address-suggestion:hover,.address-suggestion.is-active{background:#f2f8ea}
    .address-suggestion-main{display:block;color:#111;font-size:.89rem;line-height:1.35;font-weight:700}
    .address-suggestion-secondary{display:block;margin-top:3px;color:#667068;font-size:.74rem;line-height:1.35}
    .address-google-attribution{display:flex;justify-content:flex-end;align-items:center;padding:8px 12px;background:#f7f8f5;border-top:1px solid rgba(5,8,6,.08)}
    .address-google-attribution img{display:block;width:120px;max-width:42%;height:auto}
    .address-helper{display:block;color:#788078;font-size:.69rem;line-height:1.4;font-weight:500}
    .address-helper.is-error{color:#a1492a}
    .address-autocomplete-wrap.is-loading::after{content:'Searching…';position:absolute;right:13px;top:17px;color:#7a847c;font-size:.68rem;background:#fff;padding-left:8px;pointer-events:none}
    .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    input[type="search"]::-webkit-search-cancel-button{display:none}
    @media(max-width:680px){.address-suggestions{max-height:300px}.address-suggestion{padding:13px 12px}}
  `;
  document.head.appendChild(style);

  let debounceTimer = null;
  let newestRequest = 0;
  let activeIndex = -1;
  let results = [];
  let loadPromise = null;
  let placesLibrary = null;
  let sessionToken = null;

  const clean = value => String(value || '').trim();

  function mapsApiKey() {
    return clean(document.querySelector('meta[name="ppw-google-maps-key"]')?.content);
  }

  function showError(message) {
    helper.textContent = message;
    helper.classList.add('is-error');
  }

  function clearError() {
    helper.textContent = 'Start typing the property address, then choose the matching Google result.';
    helper.classList.remove('is-error');
  }

  function loadGoogleMaps() {
    if (window.google?.maps?.importLibrary) return Promise.resolve();
    if (loadPromise) return loadPromise;

    const key = mapsApiKey();
    if (!key) {
      return Promise.reject(new Error('Google address search is not configured on this page.'));
    }

    loadPromise = new Promise((resolve, reject) => {
      const callbackName = `__ppwGoogleMapsReady_${Date.now()}`;
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key,
        v: 'weekly',
        loading: 'async',
        libraries: 'places',
        language: 'en',
        region: 'US',
        callback: callbackName,
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';

      const fail = () => {
        delete window[callbackName];
        loadPromise = null;
        reject(new Error('Google address search could not load.'));
      };
      script.onerror = fail;
      window[callbackName] = () => {
        delete window[callbackName];
        if (window.google?.maps?.importLibrary) resolve();
        else fail();
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  async function ensurePlaces() {
    if (placesLibrary) return placesLibrary;
    await loadGoogleMaps();
    placesLibrary = await window.google.maps.importLibrary('places');
    return placesLibrary;
  }

  function resetMetadata() {
    latInput.value = '';
    lngInput.value = '';
    sourceInput.value = '';
    placeIdInput.value = '';
  }

  function closeList({ endSession = false } = {}) {
    list.hidden = true;
    list.replaceChildren();
    lookup.setAttribute('aria-expanded', 'false');
    lookup.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    results = [];
    if (endSession) sessionToken = null;
  }

  function optionButtons() {
    return [...list.querySelectorAll('.address-suggestion')];
  }

  function setActive(index) {
    const buttons = optionButtons();
    if (!buttons.length) return;
    activeIndex = Math.max(0, Math.min(index, buttons.length - 1));
    buttons.forEach((button, i) => button.classList.toggle('is-active', i === activeIndex));
    const active = buttons[activeIndex];
    lookup.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function predictionText(prediction) {
    return {
      main: clean(prediction.mainText?.toString()) || clean(prediction.text?.toString()),
      secondary: clean(prediction.secondaryText?.toString()),
      full: clean(prediction.text?.toString()),
    };
  }

  function render(predictions) {
    closeList();
    results = predictions.slice(0, MAX_RESULTS);
    if (!results.length) {
      live.textContent = 'No matching address found. Continue typing or enter the address manually.';
      return;
    }

    results.forEach((prediction, index) => {
      const text = predictionText(prediction);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-suggestion';
      button.id = `address-suggestion-${index}`;
      button.setAttribute('role', 'option');

      const main = document.createElement('span');
      main.className = 'address-suggestion-main';
      main.textContent = text.main || text.full;
      button.appendChild(main);

      if (text.secondary) {
        const secondary = document.createElement('span');
        secondary.className = 'address-suggestion-secondary';
        secondary.textContent = text.secondary;
        button.appendChild(secondary);
      }

      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('mouseenter', () => setActive(index));
      button.addEventListener('click', () => selectPrediction(prediction));
      list.appendChild(button);
    });

    const attribution = document.createElement('div');
    attribution.className = 'address-google-attribution';
    const googleLogo = document.createElement('img');
    googleLogo.src = 'https://storage.googleapis.com/geo-devrel-public-buckets/powered_by_google_on_white.png';
    googleLogo.alt = 'Powered by Google';
    attribution.appendChild(googleLogo);
    list.appendChild(attribution);

    list.hidden = false;
    lookup.setAttribute('aria-expanded', 'true');
    live.textContent = `${results.length} Google address suggestions available.`;
  }

  function addressComponent(components, type) {
    return (components || []).find(component => component.types?.includes(type));
  }

  function componentText(components, type, short = false) {
    const item = addressComponent(components, type);
    return clean(short ? (item?.shortText || item?.longText) : (item?.longText || item?.shortText));
  }

  async function selectPrediction(prediction) {
    wrapper.classList.add('is-loading');
    clearError();
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'location', 'id'],
      });

      const components = place.addressComponents || [];
      const streetNumber = componentText(components, 'street_number');
      const route = componentText(components, 'route');
      const subpremise = componentText(components, 'subpremise');
      const selectedStreet = [streetNumber, route].filter(Boolean).join(' ') || clean(place.formattedAddress).split(',')[0];
      const selectedCity =
        componentText(components, 'locality') ||
        componentText(components, 'postal_town') ||
        componentText(components, 'sublocality_level_1') ||
        componentText(components, 'administrative_area_level_2');
      const selectedState = componentText(components, 'administrative_area_level_1', true) || 'FL';
      const postal = componentText(components, 'postal_code');
      const postalSuffix = componentText(components, 'postal_code_suffix');
      const selectedZip = postalSuffix ? `${postal}-${postalSuffix}` : postal;

      lookup.value = subpremise ? `${selectedStreet}, ${subpremise}` : selectedStreet;
      streetSubmission.value = lookup.value;
      if (selectedCity) city.value = selectedCity;
      if (selectedZip) zip.value = selectedZip;
      stateInput.value = selectedState;

      const location = place.location;
      if (location) {
        latInput.value = String(typeof location.lat === 'function' ? location.lat() : location.lat);
        lngInput.value = String(typeof location.lng === 'function' ? location.lng() : location.lng);
      }
      sourceInput.value = 'Google Places';
      placeIdInput.value = clean(place.id || prediction.placeId);

      [lookup, city, zip].forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      live.textContent = `Selected ${[lookup.value, city.value, selectedState, zip.value].filter(Boolean).join(', ')}.`;
      closeList({ endSession: true });
    } catch (error) {
      showError('Google found the address, but its details could not be loaded. You can still enter it manually.');
      closeList({ endSession: true });
    } finally {
      wrapper.classList.remove('is-loading');
    }
  }

  async function search(query) {
    const requestId = ++newestRequest;
    wrapper.classList.add('is-loading');
    clearError();
    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await ensurePlaces();
      if (!sessionToken) sessionToken = new AutocompleteSessionToken();

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        inputOffset: query.length,
        sessionToken,
        locationRestriction: SOUTH_FLORIDA_BOUNDS,
        includedRegionCodes: ['us'],
        origin: SOUTH_FLORIDA_CENTER,
        language: 'en-US',
        region: 'us',
      });

      if (requestId !== newestRequest) return;
      const predictions = (suggestions || []).map(item => item.placePrediction).filter(Boolean);
      render(predictions);
    } catch (error) {
      if (requestId !== newestRequest) return;
      closeList({ endSession: true });
      const message = String(error?.message || '');
      if (/ApiNotActivatedMapError|REQUEST_DENIED|not authorized|not enabled/i.test(message)) {
        showError('Google Places is connected but not enabled for this API key yet. Address entry still works manually.');
      } else if (/key|configured/i.test(message)) {
        showError('Google address search is not connected on the live page yet. Address entry still works manually.');
      } else {
        showError('Google address suggestions are temporarily unavailable. Address entry still works manually.');
      }
    } finally {
      if (requestId === newestRequest) wrapper.classList.remove('is-loading');
    }
  }

  lookup.addEventListener('input', () => {
    streetSubmission.value = lookup.value;
    resetMetadata();
    clearTimeout(debounceTimer);
    const query = clean(lookup.value);
    if (query.length < MIN_CHARS) {
      closeList({ endSession: query.length === 0 });
      return;
    }
    debounceTimer = window.setTimeout(() => search(query), DEBOUNCE_MS);
  });

  lookup.addEventListener('keydown', event => {
    if (list.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex < results.length - 1 ? activeIndex + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex > 0 ? activeIndex - 1 : results.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectPrediction(results[activeIndex]);
    } else if (event.key === 'Escape') {
      closeList();
    }
  });

  lookup.addEventListener('focus', () => {
    if (results.length) {
      list.hidden = false;
      lookup.setAttribute('aria-expanded', 'true');
    }
  });

  form.addEventListener('submit', () => {
    streetSubmission.value = lookup.value;
  });

  document.addEventListener('pointerdown', event => {
    if (!wrapper.contains(event.target)) closeList();
  });
})();
