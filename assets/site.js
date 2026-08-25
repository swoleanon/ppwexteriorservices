
const menu = document.getElementById('menuBtn');
const nav = document.getElementById('navLinks');
if(menu && nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

const nextField = document.querySelector('form input[name="_next"]');
if (nextField) nextField.value = `${location.origin}/thank-you.html`;
