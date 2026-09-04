
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
