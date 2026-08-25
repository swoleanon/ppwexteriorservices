
const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if(menu && nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

document.querySelectorAll('form[data-demo]').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    alert('Quote form design is ready. Connect it to Formspree, your CRM, or another form handler before launch.');
  });
});
