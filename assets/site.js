
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if(menuBtn && navLinks){
  menuBtn.addEventListener('click',()=>navLinks.classList.toggle('open'));
}
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click',()=>navLinks?.classList.remove('open'));
});
const year = document.getElementById('year');
if(year) year.textContent = new Date().getFullYear();

document.querySelectorAll('form[data-demo]').forEach(form=>{
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    alert('The design is complete. Connect this form to Formspree, Netlify Forms, your CRM, or booking platform before launch.');
  });
});
