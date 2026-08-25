
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if(menuBtn && navLinks){
  menuBtn.addEventListener('click',()=>navLinks.classList.toggle('open'));
}
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click',()=>navLinks?.classList.remove('open'));
});
const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
document.querySelectorAll('form[data-demo]').forEach(form=>{
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    alert('This form is ready to connect to Formspree, Netlify Forms, your CRM, or booking platform.');
  });
});
