
const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if(menu && nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function formatAddress(props){
  const street = [props.housenumber, props.street || props.name].filter(Boolean).join(' ');
  const locality = props.city || props.town || props.village || props.county || '';
  const region = props.state || '';
  const zip = props.postcode || '';
  return [street, [locality, region].filter(Boolean).join(', '), zip].filter(Boolean).join(', ').replace(/\s+,/g, ',');
}

function initAddressSearch(){
  const input = document.getElementById('address');
  const list = document.getElementById('address-results');
  const hint = document.getElementById('address-hint');
  const verified = document.getElementById('address_verified');
  if(!input || !list) return;

  let timer = 0;
  let items = [];
  let active = -1;
  let currentAbort = null;

  const close = ()=>{
    list.hidden = true;
    list.innerHTML = '';
    input.setAttribute('aria-expanded','false');
    active = -1;
  };

  const markVerified = (value)=>{
    input.value = value;
    if(verified) verified.value = 'yes';
    if(hint){
      hint.textContent = 'Address confirmed.';
      hint.className = 'field-hint ok';
    }
    close();
  };

  const render = ()=>{
    list.innerHTML = items.map((item,i)=>`<li role="option"><button type="button" aria-selected="${i===active}">${escapeHtml(item.label)}</button></li>`).join('');
    list.hidden = items.length === 0;
    input.setAttribute('aria-expanded', items.length ? 'true' : 'false');
    [...list.querySelectorAll('button')].forEach((btn,i)=>{
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=>markVerified(items[i].label));
    });
  };

  const search = async (query)=>{
    if(currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=26.122&lon=-80.137&limit=7&lang=en`;
    const res = await fetch(url, { signal: currentAbort.signal, headers: { Accept: 'application/json' } });
    const data = await res.json();
    items = (data.features || [])
      .filter(f => {
        const c = (f.properties?.country || f.properties?.countrycode || '').toLowerCase();
        return c === 'united states' || c === 'us' || c === 'usa' || !c;
      })
      .map(f => ({ label: formatAddress(f.properties || {}) }))
      .filter(item => item.label.length > 5);
    const seen = new Set();
    items = items.filter(item => { if(seen.has(item.label)) return false; seen.add(item.label); return true; });
    active = items.length ? 0 : -1;
    render();
    if(!items.length && hint){
      hint.textContent = 'No matching addresses yet. Include the city, such as Fort Lauderdale, FL.';
      hint.className = 'field-hint warn';
    }
  };

  input.addEventListener('input', ()=>{
    if(verified) verified.value = 'no';
    if(hint){
      hint.textContent = 'Keep typing, then choose the matching address so we can confirm the location.';
      hint.className = 'field-hint';
    }
    const query = input.value.trim();
    clearTimeout(timer);
    if(query.length < 4){ close(); return; }
    timer = setTimeout(()=>search(query).catch(()=>{
      if(hint){
        hint.textContent = 'Address search is unavailable. Enter the full street address, city, and ZIP.';
        hint.className = 'field-hint warn';
      }
    }), 280);
  });

  input.addEventListener('keydown', e=>{
    if(list.hidden || !items.length) return;
    if(e.key === 'ArrowDown'){ e.preventDefault(); active = (active + 1) % items.length; render(); }
    if(e.key === 'ArrowUp'){ e.preventDefault(); active = (active - 1 + items.length) % items.length; render(); }
    if(e.key === 'Enter' && active >= 0){ e.preventDefault(); markVerified(items[active].label); }
    if(e.key === 'Escape') close();
  });

  input.addEventListener('blur', ()=>setTimeout(close, 150));
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
