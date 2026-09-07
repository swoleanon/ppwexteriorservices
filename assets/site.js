
// Keep every page on the same visual content boundary. Full-bleed backgrounds/media
// can still span the viewport, but readable content stays on one shared grid.
const boundaryStyle = document.createElement('style');
boundaryStyle.dataset.ppwBoundaries = '1';
boundaryStyle.textContent = `
  :root { --ppw-content-max: 1280px; --ppw-content-inline: 80px; }
  html, body { max-width: 100%; overflow-x: hidden; }
  .container:not(.nav-inner),
  .about-premium .about-shell {
    width: min(var(--ppw-content-max), calc(100% - var(--ppw-content-inline))) !important;
    margin-inline: auto !important;
  }
  main, section, footer,
  .container, .about-shell,
  .page-hero-copy, .premium-head, .premium-head > *,
  .commercial-intro-grid > *, .commercial-case > *,
  .residential-result-grid > *, .residential-reviews > *,
  .quote-page-grid > *, .about-hero-grid > *, .about-story-grid > * {
    min-width: 0;
  }
  img, video, iframe { max-width: 100%; }
  [href^="mailto:"], [href^="tel:"], .footer-links, .cta-contact, .quote-contact-card strong {
    overflow-wrap: anywhere;
  }
  table { max-width: 100%; }

  @media (max-width: 1040px) {
    .nav-inner {
      width: calc(100% - 24px) !important;
      margin-inline: auto !important;
    }
    .nav-links.open {
      width: 100%;
      max-width: 100%;
      max-height: calc(100dvh - 92px) !important;
      overscroll-behavior: contain;
    }
    .nav-links.open > a,
    .nav-links.open .nav-parent,
    .nav-links.open .nav-sub a {
      min-height: 44px;
    }
  }

  @media (max-width: 900px) {
    :root { --ppw-content-inline: 48px; }
    .footer-bottom { flex-wrap: wrap; }
  }

  @media (max-width: 760px) {
    .site-nav .call-btn { display: none !important; }
    .site-nav .brand img {
      max-width: min(172px, 50vw) !important;
      height: auto !important;
      max-height: 52px;
    }
    .site-nav .menu,
    .site-nav .quote-btn,
    .btn,
    button,
    .portfolio-filters button,
    summary,
    .social-link {
      min-height: 44px;
    }
    input, select, textarea {
      font-size: 16px !important;
    }
    .premium-case-meta,
    .commercial-project-meta,
    .premium-services-footer,
    .footer-bottom {
      flex-wrap: wrap;
    }
    .about-premium .about-portrait-wrap {
      order: -1 !important;
      min-height: 330px !important;
      margin-top: 0 !important;
    }
    .about-premium .about-portrait {
      max-height: 390px !important;
    }
    .about-premium .about-hero-grid {
      padding-top: 22px !important;
    }
    .about-premium .about-hero-copy {
      padding-top: 8px !important;
    }
    .ba-handle span {
      width: 48px;
      height: 48px;
    }
    .promo-close {
      width: 44px;
      height: 44px;
    }
  }

  @media (max-width: 560px) {
    :root { --ppw-content-inline: 32px; }
    .site-nav .quote-btn { display: none !important; }
    .nav-inner {
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 8px !important;
    }
    .site-nav .brand img {
      max-width: min(168px, 58vw) !important;
    }
    .hero-actions,
    .premium-hero-actions,
    .about-hero-actions {
      width: 100%;
    }
    .hero-actions .btn,
    .premium-hero-actions .btn,
    .about-hero-actions .btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }
    .premium-case-meta,
    .commercial-project-meta,
    .premium-services-footer,
    .residential-hero-meta,
    .footer-bottom {
      flex-direction: column !important;
      align-items: flex-start !important;
    }
    .footer-grid { grid-template-columns: 1fr !important; }
    .footer-bottom { gap: 8px; }
    .section,
    .premium-section,
    .about-premium .about-section {
      padding-top: 68px !important;
      padding-bottom: 68px !important;
    }
    .commercial-value-row {
      grid-template-columns: 36px minmax(0, 1fr) !important;
      gap: 12px !important;
    }
    .quote-contact-card,
    .premium-quote-form-head,
    .premium-quote-form form,
    .commercial-case-copy,
    .commercial-feature-copy,
    .premium-service-copy,
    .about-premium .about-principle,
    .about-premium .about-review {
      max-width: 100%;
    }
    .portfolio-filters {
      gap: 10px;
    }
    .portfolio-filters button {
      flex: 1 1 calc(50% - 10px);
    }
    details > summary {
      padding-block: 10px;
      cursor: pointer;
    }
  }

  @media (max-width: 380px) {
    :root { --ppw-content-inline: 28px; }
    .site-nav .brand img { max-width: 150px !important; }
    .portfolio-filters button { flex-basis: 100%; }
  }
`;
document.head.appendChild(boundaryStyle);

const siteNav = document.querySelector('.site-nav');
const setNavScroll = () => {
  siteNav?.classList.toggle('is-scrolled', window.scrollY > 20);
};
setNavScroll();
window.addEventListener('scroll', setNavScroll, { passive: true });

const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if (menu && nav) {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-controls', 'navLinks');

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
    menu?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  });
});

const desktopNav = window.matchMedia('(min-width: 1041px)');

document.querySelectorAll('.nav-parent').forEach((btn) => {
  btn.addEventListener('mousedown', (event) => {
    if (desktopNav.matches) event.preventDefault();
  });

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const item = btn.closest('.has-sub');

    if (desktopNav.matches) {
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.blur();
      return;
    }

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

desktopNav.addEventListener('change', (event) => {
  if (!event.matches) return;
  document.querySelectorAll('.has-sub.open').forEach((item) => {
    item.classList.remove('open');
    item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('click', (event) => {
  if (
    nav?.classList.contains('open') &&
    !event.target.closest('#navLinks') &&
    !event.target.closest('#menuBtn')
  ) {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }

  if (event.target.closest('.has-sub') || event.target.closest('#menuBtn')) return;
  document.querySelectorAll('.has-sub.open').forEach((item) => {
    item.classList.remove('open');
    item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
  });
});

const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

// Keep the site-wide conversion language consistent with the premium brand system.
document.querySelectorAll('.quote-btn, footer .btn-lime').forEach((button) => {
  if (/^Get a Free Quote$/i.test(button.textContent.trim())) {
    button.textContent = 'Request a Quote';
  }
});

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
  script.src = new URL('promo-popup.js', document.currentScript?.src || window.location.href).href;
  script.defer = true;
  script.dataset.ppwPromo = '1';
  document.body.appendChild(script);
})();