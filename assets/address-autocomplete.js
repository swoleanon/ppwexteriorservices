(() => {
  const street = document.getElementById('street');
  const city = document.getElementById('city');
  const zip = document.getElementById('zip');
  const form = document.getElementById('quote-form');
  if (!street || !city || !zip || !form) return;

  const SOUTH_FLORIDA_CENTER = { lat: 26.1224, lon: -80.1373 };
  const MIN_CHARS = 3;
  const DEBOUNCE_MS = 280;
  const MAX_RESULTS = 6;

  const wrapper = document.createElement('div');
  wrapper.className = 'address-autocomplete-wrap';
  street.parentNode.insertBefore(wrapper, street);
  wrapper.appendChild(street);

  const list = document.createElement('div');
  list.id = 'address-suggestions';
  list.className = 'address-suggestions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Suggested addresses');
  list.hidden = true;
  wrapper.appendChild(list);

  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  wrapper.appendChild(live);

  const helper = document.createElement('small');
  helper.className = 'address-helper';
  helper.textContent = 'Start typing and choose a suggested address, or enter it manually.';
  wrapper.appendChild(helper);

  const addHidden = (name) => {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    return input;
  };

  const latInput = addHidden('address_latitude');
  const lngInput = addHidden('address_longitude');
  const sourceInput = addHidden('address_source');

  street.setAttribute('aria-autocomplete', 'list');
  street.setAttribute('aria-controls', list.id);
  street.setAttribute('aria-expanded', 'false');
  street.setAttribute('autocomplete', 'off');

  const style = document.createElement('style');
  style.textContent = `
    .address-autocomplete-wrap{position:relative;display:grid;gap:7px}
    .address-suggestions{position:absolute;z-index:80;top:calc(52px + 6px);left:0;right:0;background:#fff;border:1px solid rgba(5,8,6,.2);box-shadow:0 18px 38px rgba(5,8,6,.18);max-height:330px;overflow:auto}
    .address-suggestions[hidden]{display:none}
    .address-suggestion{display:block;width:100%;border:0;border-bottom:1px solid rgba(5,8,6,.08);background:#fff;color:#111;text-align:left;padding:12px 14px;cursor:pointer;font:inherit}
    .address-suggestion:last-of-type{border-bottom:0}
    .address-suggestion:hover,.address-suggestion.is-active{background:#f2f8ea}
    .address-suggestion strong{display:block;color:#111;font-size:.88rem;line-height:1.35;font-weight:700}
    .address-suggestion span{display:block;margin-top:3px;color:#647068;font-size:.74rem;line-height:1.35}
    .address-suggestion-attribution{padding:8px 12px;background:#f7f8f5;color:#7b847d;font-size:.64rem;text-align:right;border-top:1px solid rgba(5,8,6,.08)}
    .address-helper{display:block;color:#788078;font-size:.69rem;line-height:1.4;font-weight:500}
    .address-autocomplete-wrap.is-loading::after{content:'Searching…';position:absolute;right:13px;top:17px;color:#7a847c;font-size:.68rem;background:#fff;padding-left:8px}
    .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    @media(max-width:680px){.address-suggestions{max-height:280px}.address-suggestion{padding:13px 12px}}
  `;
  document.head.appendChild(style);

  let debounceTimer = null;
  let controller = null;
  let results = [];
  let activeIndex = -1;

  const clean = (value) => String(value || '').trim();
  const uniqueParts = (parts) => [...new Set(parts.map(clean).filter(Boolean))];

  function streetLine(props) {
    const house = clean(props.housenumber);
    const road = clean(props.street || props.name);
    if (house && road) return `${house} ${road}`;
    return road || house;
  }

  function cityName(props) {
    return clean(props.city || props.locality || props.district || props.county);
  }

  function stateLabel(props) {
    return clean(props.statecode || props.state);
  }

  function resultLabel(feature) {
    const props = feature.properties || {};
    const line1 = streetLine(props);
    const locality = uniqueParts([cityName(props), stateLabel(props), props.postcode]).join(', ');
    return { line1, locality, full: uniqueParts([line1, locality]).join(', ') };
  }

  function closeList() {
    list.hidden = true;
    list.innerHTML = '';
    street.setAttribute('aria-expanded', 'false');
    street.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    results = [];
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

  function selectResult(feature) {
    const props = feature.properties || {};
    const line = streetLine(props);
    if (line) street.value = line;
    const nextCity = cityName(props);
    const nextZip = clean(props.postcode);
    if (nextCity) city.value = nextCity;
    if (nextZip) zip.value = nextZip;
    const coordinates = feature.geometry?.coordinates || [];
    lngInput.value = Number.isFinite(Number(coordinates[0])) ? String(coordinates[0]) : '';
    latInput.value = Number.isFinite(Number(coordinates[1])) ? String(coordinates[1]) : '';
    sourceInput.value = 'Photon / OpenStreetMap';
    [street, city, zip].forEach(input => input.dispatchEvent(new Event('change', { bubbles: true })));
    live.textContent = `Selected ${resultLabel(feature).full}. City and ZIP code were filled in.`;
    closeList();
  }

  function render(nextResults) {
    results = nextResults;
    activeIndex = -1;
    list.innerHTML = '';
    if (!results.length) {
      closeList();
      live.textContent = 'No address suggestions found. You can enter the address manually.';
      return;
    }

    results.forEach((feature, index) => {
      const label = resultLabel(feature);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-suggestion';
      button.id = `address-suggestion-${index}`;
      button.setAttribute('role', 'option');
      button.innerHTML = `<strong></strong><span></span>`;
      button.querySelector('strong').textContent = label.line1 || label.full;
      button.querySelector('span').textContent = label.locality;
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => selectResult(feature));
      button.addEventListener('mouseenter', () => setActive(index));
      list.appendChild(button);
    });

    const attribution = document.createElement('div');
    attribution.className = 'address-suggestion-attribution';
    attribution.textContent = 'Address data © OpenStreetMap contributors';
    list.appendChild(attribution);
    list.hidden = false;
    street.setAttribute('aria-expanded', 'true');
    live.textContent = `${results.length} address suggestions available.`;
  }

  function relevanceScore(feature) {
    const p = feature.properties || {};
    const state = `${p.state || ''} ${p.statecode || ''}`.toLowerCase();
    const cityText = `${p.city || ''} ${p.district || ''} ${p.county || ''}`.toLowerCase();
    let score = 0;
    if (state.includes('florida') || /(^|\s)fl($|\s)/.test(state)) score += 100;
    if (/broward|miami|palm beach|fort lauderdale|pompano|coral springs|margate|hollywood|boca raton|delray|west palm/.test(cityText)) score += 50;
    if (p.housenumber) score += 20;
    if (p.street) score += 10;
    return score;
  }

  async function searchAddress(query) {
    controller?.abort();
    controller = new AbortController();
    wrapper.classList.add('is-loading');
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '12',
        lang: 'en',
        lat: String(SOUTH_FLORIDA_CENTER.lat),
        lon: String(SOUTH_FLORIDA_CENTER.lon),
      });
      const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Address service returned ${response.status}`);
      const payload = await response.json();
      const features = Array.isArray(payload.features) ? payload.features : [];
      const filtered = features
        .filter(feature => {
          const p = feature.properties || {};
          const country = String(p.countrycode || '').toUpperCase();
          return (!country || country === 'US') && Boolean(streetLine(p));
        })
        .sort((a, b) => relevanceScore(b) - relevanceScore(a))
        .slice(0, MAX_RESULTS);
      render(filtered);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        closeList();
        live.textContent = 'Address suggestions are temporarily unavailable. Please enter the address manually.';
      }
    } finally {
      wrapper.classList.remove('is-loading');
    }
  }

  street.addEventListener('input', () => {
    latInput.value = '';
    lngInput.value = '';
    sourceInput.value = '';
    clearTimeout(debounceTimer);
    const query = clean(street.value);
    if (query.length < MIN_CHARS) {
      controller?.abort();
      closeList();
      return;
    }
    debounceTimer = window.setTimeout(() => searchAddress(query), DEBOUNCE_MS);
  });

  street.addEventListener('keydown', event => {
    if (list.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex < results.length - 1 ? activeIndex + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex > 0 ? activeIndex - 1 : results.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    } else if (event.key === 'Escape') {
      closeList();
    }
  });

  street.addEventListener('focus', () => {
    if (results.length) {
      list.hidden = false;
      street.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('pointerdown', event => {
    if (!wrapper.contains(event.target)) closeList();
  });
})();
