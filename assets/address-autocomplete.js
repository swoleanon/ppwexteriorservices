(() => {
  const street = document.getElementById('street');
  const city = document.getElementById('city');
  const zip = document.getElementById('zip');
  const form = document.getElementById('quote-form');
  if (!street || !city || !zip || !form) return;

  const SOUTH_FLORIDA_CENTER = { lat: 26.1224, lng: -80.1373 };
  const SOUTH_FLORIDA_BOUNDS = { west: -80.95, south: 25.10, east: -79.95, north: 27.10 };
  const MIN_CHARS = 4;
  const DEBOUNCE_MS = 240;
  const MAX_RESULTS = 6;

  // Keep the visible lookup field non-semantic so browser autofill does not cover
  // the Google suggestions. The submitted street value stays in a hidden field.
  const originalLabel = document.querySelector('label[for="street"]');
  street.id = 'property_address_lookup';
  street.name = 'property_address_lookup';
  street.autocomplete = 'new-password';
  street.setAttribute('data-form-type', 'other');
  street.setAttribute('data-lpignore', 'true');
  street.setAttribute('data-1p-ignore', 'true');
  street.setAttribute('spellcheck', 'false');
  street.setAttribute('autocapitalize', 'words');
  street.setAttribute('aria-autocomplete', 'list');
  if (originalLabel) originalLabel.setAttribute('for', street.id);

  form.setAttribute('autocomplete', 'off');
  city.setAttribute('autocomplete', 'off');
  zip.setAttribute('autocomplete', 'off');

  const addHidden = (name) => {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.autocomplete = 'off';
      form.appendChild(input);
    }
    return input;
  };

  const streetSubmission = addHidden('street');
  const latInput = addHidden('address_latitude');
  const lngInput = addHidden('address_longitude');
  const sourceInput = addHidden('address_source');
  const placeIdInput = addHidden('google_place_id');
  streetSubmission.value = street.value || '';

  const wrapper = document.createElement('div');
  wrapper.className = 'address-autocomplete-wrap';
  street.parentNode.insertBefore(wrapper, street);
  wrapper.appendChild(street);

  const list = document.createElement('div');
  list.id = 'address-suggestions';
  list.className = 'address-suggestions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Suggested South Florida addresses');
  list.hidden = true;
  wrapper.appendChild(list);

  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  wrapper.appendChild(live);

  const helper = document.createElement('small');
  helper.className = 'address-helper';
  helper.textContent = 'Start typing a Broward, Miami-Dade, or Palm Beach address and choose a match.';
  wrapper.appendChild(helper);

  street.setAttribute('aria-controls', list.id);
  street.setAttribute('aria-expanded', 'false');

  const style = document.createElement('style');
  style.textContent = `
    .address-autocomplete-wrap{position:relative;display:grid;gap:7px}
    .address-suggestions{position:absolute;z-index:9999;top:calc(52px + 6px);left:0;right:0;background:#fff;border:1px solid rgba(5,8,6,.2);box-shadow:0 18px 38px rgba(5,8,6,.22);max-height:330px;overflow:auto}
    .address-suggestions[hidden]{display:none}
    .address-suggestion{display:block;width:100%;border:0;border-bottom:1px solid rgba(5,8,6,.08);background:#fff;color:#111;text-align:left;padding:12px 14px;cursor:pointer;font:inherit}
    .address-suggestion:last-of-type{border-bottom:0}
    .address-suggestion:hover,.address-suggestion.is-active{background:#f2f8ea}
    .address-suggestion strong{display:block;color:#111;font-size:.88rem;line-height:1.35;font-weight:700}
    .address-suggestion span{display:block;margin-top:3px;color:#647068;font-size:.74rem;line-height:1.35}
    .address-suggestion-attribution{padding:8px 12px;background:#f7f8f5;color:#5e5e5e;font-size:.7rem;font-weight:500;text-align:right;border-top:1px solid rgba(5,8,6,.08);white-space:nowrap}
    .address-helper{display:block;color:#788078;font-size:.69rem;line-height:1.4;font-weight:500}
    .address-autocomplete-wrap.is-loading::after{content:'Searching…';position:absolute;right:13px;top:17px;color:#7a847c;font-size:.68rem;background:#fff;padding-left:8px}
    .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    @media(max-width:680px){.address-suggestions{max-height:280px}.address-suggestion{padding:13px 12px}}
  `;
  document.head.appendChild(style);

  let debounceTimer = null;
  let photonController = null;
  let searchRequestId = 0;
  let results = [];
  let activeIndex = -1;
  let googleLoadPromise = null;
  let googlePlaces = null;
  let googleSessionToken = null;

  const clean = (value) => String(value || '').trim();
  const normalize = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const uniqueParts = (parts) => [...new Set(parts.map(clean).filter(Boolean))];

  function resetAddressMetadata() {
    latInput.value = '';
    lngInput.value = '';
    sourceInput.value = '';
    placeIdInput.value = '';
  }

  function closeList({ resetSession = false } = {}) {
    list.hidden = true;
    list.innerHTML = '';
    street.setAttribute('aria-expanded', 'false');
    street.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    results = [];
    if (resetSession) googleSessionToken = null;
  }

  function setActive(index) {
    const options = [...list.querySelectorAll('.address-suggestion')];
    if (!options.length) return;
    activeIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, i) => option.classList.toggle('is-active', i === activeIndex));
    const active = options[activeIndex];
    street.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function mapsApiKey() {
    return clean(document.querySelector('meta[name="ppw-google-maps-key"]')?.content);
  }

  function loadGoogleMaps() {
    if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
    if (googleLoadPromise) return googleLoadPromise;

    const key = mapsApiKey();
    if (!key) return Promise.reject(new Error('Google Maps key is not configured.'));

    googleLoadPromise = new Promise((resolve, reject) => {
      const callbackName = `__ppwGoogleMapsReady_${Date.now()}`;
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key,
        v: 'weekly',
        loading: 'async',
        libraries: 'places',
        region: 'US',
        language: 'en',
        callback: callbackName,
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.onerror = () => {
        delete window[callbackName];
        googleLoadPromise = null;
        reject(new Error('Google Maps could not be loaded.'));
      };
      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };
      document.head.appendChild(script);
    });

    return googleLoadPromise;
  }

  async function ensureGooglePlaces() {
    if (googlePlaces) return googlePlaces;
    await loadGoogleMaps();
    const library = await window.google.maps.importLibrary('places');
    googlePlaces = {
      AutocompleteSuggestion: library.AutocompleteSuggestion,
      AutocompleteSessionToken: library.AutocompleteSessionToken,
    };
    return googlePlaces;
  }

  async function googleSuggestions(query) {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await ensureGooglePlaces();
    if (!googleSessionToken) googleSessionToken = new AutocompleteSessionToken();

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      inputOffset: query.length,
      sessionToken: googleSessionToken,
      locationRestriction: SOUTH_FLORIDA_BOUNDS,
      includedRegionCodes: ['us'],
      origin: SOUTH_FLORIDA_CENTER,
      language: 'en-US',
      region: 'us',
    });

    return (suggestions || [])
      .map((suggestion) => suggestion.placePrediction)
      .filter(Boolean)
      .slice(0, MAX_RESULTS)
      .map((prediction) => ({
        provider: 'google',
        prediction,
        line1: clean(prediction.mainText?.toString()) || clean(prediction.text?.toString()),
        locality: clean(prediction.secondaryText?.toString()),
        full: clean(prediction.text?.toString()),
      }));
  }

  function component(components, type) {
    return (components || []).find((item) => item.types?.includes(type));
  }

  async function selectGoogleResult(result) {
    wrapper.classList.add('is-loading');
    try {
      const place = result.prediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress', 'location', 'id'] });
      const components = place.addressComponents || [];
      const number = clean(component(components, 'street_number')?.longText);
      const route = clean(component(components, 'route')?.longText || component(components, 'route')?.shortText);
      const nextStreet = uniqueParts([number, route]).join(' ');
      const nextCity = clean(
        component(components, 'locality')?.longText ||
        component(components, 'postal_town')?.longText ||
        component(components, 'sublocality_level_1')?.longText ||
        component(components, 'administrative_area_level_2')?.longText
      );
      const state = clean(component(components, 'administrative_area_level_1')?.shortText || component(components, 'administrative_area_level_1')?.longText);
      const postal = clean(component(components, 'postal_code')?.longText);
      const postalSuffix = clean(component(components, 'postal_code_suffix')?.longText);
      const nextZip = postalSuffix ? `${postal}-${postalSuffix}` : postal;

      if (nextStreet) {
        street.value = nextStreet;
        streetSubmission.value = nextStreet;
      } else {
        street.value = result.line1 || result.full;
        streetSubmission.value = street.value;
      }
      if (nextCity) city.value = nextCity;
      if (nextZip) zip.value = nextZip;

      const location = place.location;
      latInput.value = location ? String(location.lat()) : '';
      lngInput.value = location ? String(location.lng()) : '';
      sourceInput.value = 'Google Maps';
      placeIdInput.value = clean(place.id);

      [street, city, zip].forEach((input) => input.dispatchEvent(new Event('change', { bubbles: true })));
      live.textContent = `Selected ${[street.value, city.value, state || 'FL', zip.value].filter(Boolean).join(', ')}. City and ZIP code were filled in.`;
      closeList({ resetSession: true });
    } finally {
      wrapper.classList.remove('is-loading');
    }
  }

  // OpenStreetMap fallback keeps address entry usable if Google is temporarily
  // unavailable or the production key has not been configured yet.
  function photonStreetLine(props) {
    const house = clean(props.housenumber);
    const road = clean(props.street || props.name);
    if (house && road) return `${house} ${road}`;
    return road || house;
  }

  function photonCity(props) {
    return clean(props.city || props.locality || props.district || props.county);
  }

  function photonState(props) {
    const code = clean(props.statecode).replace(/^US-/, '');
    return code || clean(props.state);
  }

  function coordinatesInServiceArea(feature) {
    const coords = feature.geometry?.coordinates || [];
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    return Number.isFinite(lon) && Number.isFinite(lat) &&
      lon >= SOUTH_FLORIDA_BOUNDS.west && lon <= SOUTH_FLORIDA_BOUNDS.east &&
      lat >= SOUTH_FLORIDA_BOUNDS.south && lat <= SOUTH_FLORIDA_BOUNDS.north;
  }

  function isFlorida(props) {
    const state = `${props.state || ''} ${props.statecode || ''}`.toLowerCase();
    return state.includes('florida') || state.includes('us-fl') || /(^|\s)fl($|\s)/.test(state);
  }

  function photonLabel(feature) {
    const props = feature.properties || {};
    const line1 = photonStreetLine(props);
    const locality = uniqueParts([photonCity(props), photonState(props), props.postcode]).join(', ');
    return { line1, locality, full: uniqueParts([line1, locality]).join(', ') };
  }

  function photonRelevance(feature, query) {
    const props = feature.properties || {};
    const label = photonLabel(feature);
    const normalizedQuery = normalize(query);
    const normalizedStreet = normalize(label.line1);
    const normalizedFull = normalize(label.full);
    let score = 0;
    if (isFlorida(props)) score += 200;
    if (coordinatesInServiceArea(feature)) score += 150;
    if (props.housenumber) score += 60;
    if (props.street) score += 30;
    if (normalizedStreet.startsWith(normalizedQuery)) score += 180;
    if (normalizedFull.startsWith(normalizedQuery)) score += 120;
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const streetTokens = new Set(normalizedStreet.split(' ').filter(Boolean));
    score += queryTokens.reduce((sum, token) => sum + (streetTokens.has(token) ? 18 : 0), 0);
    const cityText = `${props.city || ''} ${props.district || ''} ${props.county || ''}`.toLowerCase();
    if (/broward|miami-dade|miami dade|palm beach/.test(cityText)) score += 80;
    return score;
  }

  async function photonSuggestions(query) {
    photonController?.abort();
    photonController = new AbortController();
    const cityHint = clean(city.value);
    const searchText = cityHint ? `${query}, ${cityHint}, Florida` : `${query}, Florida`;
    const params = new URLSearchParams({
      q: searchText,
      limit: '20',
      lang: 'en',
      lat: String(SOUTH_FLORIDA_CENTER.lat),
      lon: String(SOUTH_FLORIDA_CENTER.lng),
      bbox: `${SOUTH_FLORIDA_BOUNDS.west},${SOUTH_FLORIDA_BOUNDS.south},${SOUTH_FLORIDA_BOUNDS.east},${SOUTH_FLORIDA_BOUNDS.north}`,
    });
    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      signal: photonController.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Address fallback returned ${response.status}`);
    const payload = await response.json();
    const features = Array.isArray(payload.features) ? payload.features : [];
    return features
      .filter((feature) => {
        const props = feature.properties || {};
        const country = String(props.countrycode || '').toUpperCase();
        return (!country || country === 'US') && isFlorida(props) && coordinatesInServiceArea(feature) && Boolean(photonStreetLine(props));
      })
      .sort((a, b) => photonRelevance(b, query) - photonRelevance(a, query))
      .slice(0, MAX_RESULTS)
      .map((feature) => {
        const label = photonLabel(feature);
        return { provider: 'photon', feature, ...label };
      });
  }

  function selectPhotonResult(result) {
    const feature = result.feature;
    const props = feature.properties || {};
    const line = photonStreetLine(props);
    if (line) {
      street.value = line;
      streetSubmission.value = line;
    }
    const nextCity = photonCity(props);
    const nextZip = clean(props.postcode);
    if (nextCity) city.value = nextCity;
    if (nextZip) zip.value = nextZip;
    const coordinates = feature.geometry?.coordinates || [];
    lngInput.value = Number.isFinite(Number(coordinates[0])) ? String(coordinates[0]) : '';
    latInput.value = Number.isFinite(Number(coordinates[1])) ? String(coordinates[1]) : '';
    sourceInput.value = 'Photon / OpenStreetMap';
    placeIdInput.value = '';
    [street, city, zip].forEach((input) => input.dispatchEvent(new Event('change', { bubbles: true })));
    live.textContent = `Selected ${result.full}. City and ZIP code were filled in.`;
    closeList({ resetSession: true });
  }

  async function selectResult(result) {
    try {
      if (result.provider === 'google') await selectGoogleResult(result);
      else selectPhotonResult(result);
    } catch {
      // Preserve the prediction as manual input if Google Place Details ever fails.
      street.value = result.line1 || result.full || street.value;
      streetSubmission.value = street.value;
      resetAddressMetadata();
      live.textContent = 'Address selected. Please confirm the city and ZIP code before submitting.';
      closeList({ resetSession: true });
    }
  }

  function render(nextResults) {
    results = nextResults;
    activeIndex = -1;
    list.innerHTML = '';
    if (!results.length) {
      closeList();
      live.textContent = 'No matching South Florida address found. You can still enter the address manually.';
      return;
    }

    results.forEach((result, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-suggestion';
      button.id = `address-suggestion-${index}`;
      button.setAttribute('role', 'option');
      button.innerHTML = '<strong></strong><span></span>';
      button.querySelector('strong').textContent = result.line1 || result.full;
      button.querySelector('span').textContent = result.locality || '';
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => { void selectResult(result); });
      button.addEventListener('mouseenter', () => setActive(index));
      list.appendChild(button);
    });

    const attribution = document.createElement('div');
    attribution.className = 'address-suggestion-attribution';
    attribution.setAttribute('translate', 'no');
    attribution.textContent = results.some((result) => result.provider === 'google') ? 'Google Maps' : 'Address data © OpenStreetMap contributors';
    list.appendChild(attribution);
    list.hidden = false;
    street.setAttribute('aria-expanded', 'true');
    live.textContent = `${results.length} South Florida address suggestions available.`;
  }

  async function searchAddress(query) {
    const requestId = ++searchRequestId;
    wrapper.classList.add('is-loading');
    try {
      try {
        const googleResults = await googleSuggestions(query);
        if (requestId !== searchRequestId) return;
        if (googleResults.length) {
          render(googleResults);
          return;
        }
      } catch {
        // Silent fallback below. The public quote form remains usable even during
        // Google quota/configuration incidents.
      }

      const fallbackResults = await photonSuggestions(query);
      if (requestId !== searchRequestId) return;
      render(fallbackResults);
    } catch (error) {
      if (error?.name !== 'AbortError' && requestId === searchRequestId) {
        closeList();
        live.textContent = 'Address suggestions are temporarily unavailable. Please enter the address manually.';
      }
    } finally {
      if (requestId === searchRequestId) wrapper.classList.remove('is-loading');
    }
  }

  street.addEventListener('input', () => {
    streetSubmission.value = street.value;
    resetAddressMetadata();
    clearTimeout(debounceTimer);
    const query = clean(street.value);
    if (query.length < MIN_CHARS) {
      searchRequestId += 1;
      photonController?.abort();
      closeList({ resetSession: true });
      return;
    }
    debounceTimer = window.setTimeout(() => { void searchAddress(query); }, DEBOUNCE_MS);
  });

  street.addEventListener('keydown', (event) => {
    if (list.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex < results.length - 1 ? activeIndex + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex > 0 ? activeIndex - 1 : results.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      void selectResult(results[activeIndex]);
    } else if (event.key === 'Escape') {
      closeList({ resetSession: true });
    }
  });

  street.addEventListener('focus', () => {
    if (results.length) {
      list.hidden = false;
      street.setAttribute('aria-expanded', 'true');
    }
  });

  form.addEventListener('submit', () => {
    streetSubmission.value = street.value;
  });

  document.addEventListener('pointerdown', (event) => {
    if (!wrapper.contains(event.target)) closeList({ resetSession: true });
  });
})();
