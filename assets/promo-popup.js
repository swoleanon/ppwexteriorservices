/**
 * PPW promotional newsletter popup
 * Google Form signup + unique promo code generation + contact page tracking
 */
(function initPpwPromoPopup() {
  'use strict';

  const STORAGE = {
    closed: 'ppwPromoClosed',
    claimed: 'ppwPromoClaimed',
    session: 'ppwPromoShownSession',
  };

  const GOOGLE_FORM = {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSe2FMH7fsYAoGxrPpnvOX6h8CgsDAxl6gZUQwQk_zmG0TW7nA/formResponse',
    fields: {
      email: 'entry.707553159',
      consent: 'entry.1582292643',
      promoCode: 'entry.482495123',
      source: 'entry.14377080',
    },
    consentValue:
      'Yes, send me my $100 PPW welcome offer and occasional emails about promotions, property-care tips, and company updates. I understand I can unsubscribe at any time.',
    sourceValue: 'Website Popup',
  };

  const PROMO_PREFIX = 'PPW100-';
  const PROMO_SUFFIX_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const PROMO_PATTERN = /^PPW100-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
  const CLOSE_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;

  const SKIP_PATHS = /\/(thank-you|form-error)\.html$/;

  let backdrop;
  let formPanel;
  let successPanel;
  let formEl;
  let emailInput;
  let consentInput;
  let errorEl;
  let submitBtn;
  let closeBtn;
  let lastFocused;
  let hasOpened = false;
  let iframe;

  function shouldSkipPopup() {
    if (SKIP_PATHS.test(window.location.pathname)) return true;
    if (localStorage.getItem(STORAGE.claimed)) return true;

    const closedAt = localStorage.getItem(STORAGE.closed);
    if (closedAt) {
      const elapsed = Date.now() - Number(closedAt);
      if (!Number.isNaN(elapsed) && elapsed < CLOSE_SUPPRESS_MS) return true;
    }

    if (sessionStorage.getItem(STORAGE.session)) return true;

    const promoParam = new URLSearchParams(window.location.search).get('promo');
    if (promoParam && PROMO_PATTERN.test(promoParam)) return true;

    return false;
  }

  function generatePromoCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += PROMO_SUFFIX_CHARS[bytes[i] % PROMO_SUFFIX_CHARS.length];
    }
    return `${PROMO_PREFIX}${suffix}`;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }

  function ensureIframe() {
    if (iframe) return iframe;
    iframe = document.createElement('iframe');
    iframe.name = 'ppwPromoGoogleForm';
    iframe.id = 'ppwPromoGoogleForm';
    iframe.title = 'PPW promotion signup';
    iframe.hidden = true;
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);
    return iframe;
  }

  function submitToGoogleForm(email, promoCode) {
    return new Promise((resolve, reject) => {
      ensureIframe();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = GOOGLE_FORM.action;
      form.target = iframe.name;
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';

      const payload = {
        [GOOGLE_FORM.fields.email]: email,
        [GOOGLE_FORM.fields.consent]: GOOGLE_FORM.consentValue,
        [GOOGLE_FORM.fields.promoCode]: promoCode,
        [GOOGLE_FORM.fields.source]: GOOGLE_FORM.sourceValue,
      };

      Object.entries(payload).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        form.remove();
        ok ? resolve() : reject(new Error('submit_failed'));
      };

      const onLoad = () => {
        iframe.removeEventListener('load', onLoad);
        window.setTimeout(() => finish(true), 400);
      };

      iframe.addEventListener('load', onLoad);
      document.body.appendChild(form);
      form.submit();

      window.setTimeout(() => {
        iframe.removeEventListener('load', onLoad);
        finish(true);
      }, 5000);
    });
  }

  function buildPopup() {
    if (document.getElementById('ppwPromoBackdrop')) return;

    backdrop = document.createElement('div');
    backdrop.id = 'ppwPromoBackdrop';
    backdrop.className = 'promo-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <div class="promo-modal" role="document">
        <button type="button" class="promo-close" id="ppwPromoClose" aria-label="Close offer">&times;</button>
        <div class="promo-panel promo-panel-form" id="ppwPromoFormPanel">
          <p class="promo-eyebrow">NEW CUSTOMER OFFER</p>
          <h2 id="ppwPromoTitle" class="promo-headline">$100 OFF</h2>
          <p class="promo-subhead">Your First PPW Service</p>
          <p class="promo-desc">Join the PPW list and we'll send your exclusive $100 welcome offer directly to your inbox.</p>
          <form id="ppwPromoForm" novalidate>
            <div class="promo-field">
              <label for="ppwPromoEmail">Email Address</label>
              <input type="email" id="ppwPromoEmail" name="email" required autocomplete="email" placeholder="you@example.com">
            </div>
            <div class="promo-consent">
              <input type="checkbox" id="ppwPromoConsent" name="consent" required value="yes">
              <label for="ppwPromoConsent">Send me my $100 offer and occasional PPW promotions, property-care tips and updates. I can unsubscribe anytime.</label>
            </div>
            <p id="ppwPromoError" class="promo-error" role="alert" hidden></p>
            <button type="submit" class="promo-submit" id="ppwPromoSubmit">SEND MY $100 OFFER &rarr;</button>
          </form>
          <p class="promo-fine">New customers only &bull; $500 minimum service &bull; One offer per property &bull; Cannot be combined with other offers</p>
        </div>
        <div class="promo-panel promo-panel-success" id="ppwPromoSuccessPanel" hidden>
          <div class="promo-check" aria-hidden="true">&check;</div>
          <p class="promo-eyebrow">YOU'RE ALL SET</p>
          <h2 class="promo-success-title" id="ppwPromoSuccessTitle">THANK YOU!</h2>
          <p class="promo-desc promo-desc-primary">Your $100 PPW welcome offer is on its way.</p>
          <p class="promo-desc promo-desc-secondary">Check your inbox for your exclusive offer and details on how to claim it.</p>
          <p class="promo-inbox-hint">Didn't see it? Check your spam or promotions folder.</p>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    formPanel = backdrop.querySelector('#ppwPromoFormPanel');
    successPanel = backdrop.querySelector('#ppwPromoSuccessPanel');
    formEl = backdrop.querySelector('#ppwPromoForm');
    emailInput = backdrop.querySelector('#ppwPromoEmail');
    consentInput = backdrop.querySelector('#ppwPromoConsent');
    errorEl = backdrop.querySelector('#ppwPromoError');
    submitBtn = backdrop.querySelector('#ppwPromoSubmit');
    closeBtn = backdrop.querySelector('#ppwPromoClose');

    closeBtn.addEventListener('click', () => closePopup(true));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closePopup(true);
    });
    formEl.addEventListener('submit', onSubmit);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && backdrop.classList.contains('is-open')) {
        closePopup(true);
      }
    });
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function openPopup() {
    if (hasOpened || shouldSkipPopup()) return;
    buildPopup();
    hasOpened = true;
    sessionStorage.setItem(STORAGE.session, '1');

    lastFocused = document.activeElement;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'ppwPromoTitle');
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    emailInput?.focus();
  }

  function closePopup(recordDismissal) {
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    window.setTimeout(() => {
      backdrop.hidden = true;
    }, 350);

    if (recordDismissal && !localStorage.getItem(STORAGE.claimed)) {
      localStorage.setItem(STORAGE.closed, String(Date.now()));
    }

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function showSuccess(promoCode) {
    localStorage.setItem(STORAGE.claimed, promoCode);
    localStorage.removeItem(STORAGE.closed);

    formPanel.hidden = true;
    successPanel.hidden = false;

    backdrop.setAttribute('aria-labelledby', 'ppwPromoSuccessTitle');
    closeBtn?.focus();
  }

  async function onSubmit(event) {
    event.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    if (!email) {
      showError('Please enter your email address.');
      emailInput.focus();
      return;
    }
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address.');
      emailInput.focus();
      return;
    }
    if (!consentInput.checked) {
      showError('Please check the box to receive your offer.');
      consentInput.focus();
      return;
    }

    submitBtn.disabled = true;
    const promoCode = generatePromoCode();

    try {
      await submitToGoogleForm(email, promoCode);
      showSuccess(promoCode);
    } catch {
      showError('We could not submit your signup right now. Please try again in a moment.');
      submitBtn.disabled = false;
    }
  }

  function initPopup() {
    if (shouldSkipPopup()) return;
    requestAnimationFrame(() => openPopup());
  }

  function initContactPromo() {
    const params = new URLSearchParams(window.location.search);
    const promo = params.get('promo');
    if (!promo || !PROMO_PATTERN.test(promo)) return;

    const quoteForm = document.getElementById('quote-form');
    if (!quoteForm) return;

    let hidden = quoteForm.querySelector('input[name="promoCode"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'promoCode';
      quoteForm.appendChild(hidden);
    }
    hidden.value = promo;

    if (quoteForm.querySelector('.promo-applied-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'promo-applied-banner';
    banner.innerHTML = `
      <strong>$100 Welcome Offer Applied</strong>
      <span class="promo-applied-code">Promo code: ${promo}</span>
    `;
    quoteForm.insertBefore(banner, quoteForm.firstChild);
  }

  initContactPromo();
  initPopup();
})();
