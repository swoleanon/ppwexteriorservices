
const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if(menu && nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

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
