
const siteNav = document.querySelector('.site-nav');
const setNavScroll = () => {
  siteNav?.classList.toggle('is-scrolled', window.scrollY > 20);
};
setNavScroll();
window.addEventListener('scroll', setNavScroll, { passive: true });

const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
    if (!open) {
      nav.querySelectorAll('.has-sub.open').forEach((item) => {
        item.classList.remove('open');
        item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

document.querySelectorAll('#navLinks a').forEach((link) => {
  link.addEventListener('click', () => {
    nav?.classList.remove('open');
    document.body.classList.remove('nav-open');
  });
});

document.querySelectorAll('.nav-parent').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const item = btn.closest('.has-sub');
    const willOpen = !item.classList.contains('open');
    nav?.querySelectorAll('.has-sub.open').forEach((openItem) => {
      if (openItem !== item) {
        openItem.classList.remove('open');
        openItem.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.has-sub') || event.target.closest('#menuBtn')) return;
  document.querySelectorAll('.has-sub.open').forEach((item) => {
    item.classList.remove('open');
    item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
  });
});

const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

function initBeforeAfter(){
  document.querySelectorAll('.ba-slider').forEach((slider) => {
    const range = slider.querySelector('.ba-range');
    const setPos = (pct) => {
      const p = Math.max(0, Math.min(100, Number(pct)));
      slider.style.setProperty('--pos', p + '%');
      if (range && Number(range.value) !== Math.round(p)) range.value = String(Math.round(p));
    };
    const fromEvent = (event) => {
      const rect = slider.getBoundingClientRect();
      const x = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
      return ((x - rect.left) / rect.width) * 100;
    };

    setPos(slider.dataset.start || range?.value || 50);

    slider.addEventListener('pointerdown', (event) => {
      if (event.target === range) return;
      slider.setPointerCapture(event.pointerId);
      slider.classList.add('is-dragging');
      event.preventDefault();
      setPos(fromEvent(event));
    });
    slider.addEventListener('pointermove', (event) => {
      if (!slider.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      setPos(fromEvent(event));
    });
    const stopDrag = (event) => {
      if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
      slider.classList.remove('is-dragging');
    };
    slider.addEventListener('pointerup', stopDrag);
    slider.addEventListener('pointercancel', stopDrag);
    range?.addEventListener('input', () => setPos(range.value));
  });
}

function initPortfolioFilters(){
  const filters = document.querySelector('.portfolio-filters');
  if (!filters) return;
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filters.querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button));
    const key = button.dataset.filter;
    document.querySelectorAll('.portfolio-item').forEach((item) => {
      item.hidden = key !== 'all' && item.dataset.cat !== key;
    });
  });
}

initBeforeAfter();
initPortfolioFilters();

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

initPhotoPreview();
initAddressSuggest();

function initAddressSuggest(){
  const input = document.getElementById('street');
  const list = document.getElementById('address-suggestions');
  const city = document.getElementById('city');
  const zip = document.getElementById('zip');
  if (!input || !list) return;

  const PHOTON = 'https://photon.komoot.io/api/';
  const BIAS = { lat: 26.1223, lon: -80.1373 };
  let timer = 0;
  let controller = null;
  let items = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.innerHTML = '';
    items = [];
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const highlight = (index) => {
    active = index;
    [...list.children].forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === active));
      if (i === active) {
        input.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const apply = (item) => {
    if (!item) return;
    input.value = item.street;
    if (city && item.city) city.value = item.city;
    if (zip && item.zip) zip.value = item.zip;
    close();
  };

  const render = (next) => {
    items = next;
    active = next.length ? 0 : -1;
    list.innerHTML = '';
    if (!next.length) {
      close();
      return;
    }
    next.forEach((item, i) => {
      const li = document.createElement('li');
      li.id = 'address-option-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === 0));
      const line = document.createElement('span');
      line.textContent = item.street;
      const sub = document.createElement('small');
      sub.textContent = item.detail;
      li.append(line, sub);
      li.addEventListener('mousedown', (event) => {
        event.preventDefault();
        apply(item);
      });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', 'address-option-0');
  };

  const parseFeature = (feature) => {
    const p = feature.properties || {};
    if (p.countrycode && p.countrycode !== 'US') return null;
    const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ').trim();
    if (!street) return null;
    const cityName = p.city || p.district || '';
    const state = p.state === 'Florida' ? 'FL' : (p.state || '');
    const zipcode = p.postcode || '';
    const detail = [cityName, state, zipcode].filter(Boolean).join(', ');
    const score =
      (p.state === 'Florida' || p.state === 'FL' ? 10 : 0) +
      (/broward|miami-dade|palm beach/i.test(p.county || '') ? 6 : 0) +
      (p.housenumber ? 3 : 0) +
      (zipcode ? 1 : 0);
    return { street, city: cityName, zip: zipcode, detail, key: (street + '|' + zipcode).toLowerCase(), score };
  };

  const search = async (query) => {
    if (controller) controller.abort();
    controller = new AbortController();
    const url = `${PHOTON}?q=${encodeURIComponent(query)}&lat=${BIAS.lat}&lon=${BIAS.lon}&limit=8&lang=en`;
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      const seen = new Set();
      const next = (data.features || [])
        .map(parseFeature)
        .filter((item) => item && !seen.has(item.key) && seen.add(item.key))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
      if (input.value.trim() === query) render(next);
    } catch (error) {
      if (error.name !== 'AbortError') close();
    }
  };

  input.addEventListener('input', () => {
    const query = input.value.trim();
    window.clearTimeout(timer);
    if (query.length < 3) {
      close();
      return;
    }
    timer = window.setTimeout(() => search(query), 280);
  });

  input.addEventListener('keydown', (event) => {
    if (list.hidden || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(active < items.length - 1 ? active + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(active > 0 ? active - 1 : items.length - 1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      apply(items[active]);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  input.addEventListener('blur', () => {
    window.setTimeout(close, 120);
  });
}

const quoteForm = document.getElementById('quote-form');
if (quoteForm) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = quoteForm.querySelector('button[type="submit"]');
    const status = document.getElementById('form-status');
    const street = document.getElementById('street');
    const zip = document.getElementById('zip');
    if (status) status.textContent = '';

    if (street && (!/\d/.test(street.value) || street.value.trim().length < 5)) {
      if (status) status.textContent = 'Enter a complete street address, including the street number.';
      street?.focus();
      return;
    }

    if (zip && !/^\d{5}(?:-\d{4})?$/.test(zip.value.trim())) {
      if (status) status.textContent = 'Enter a valid 5-digit ZIP code.';
      zip?.focus();
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

(function loadPromoPopup() {
  if (document.querySelector('script[data-ppw-promo]')) return;
  const script = document.createElement('script');
  script.src = 'assets/promo-popup.js';
  script.defer = true;
  script.dataset.ppwPromo = '1';
  document.body.appendChild(script);
})();
