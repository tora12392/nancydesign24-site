
const menu=document.querySelector('.menu'),nav=document.querySelector('.nav');if(menu&&nav){menu.addEventListener('click',()=>{const o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',o)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))}
const modal=document.querySelector('#video-modal'),frame=document.querySelector('#video-frame'),modalTitle=document.querySelector('#video-title');
function openVideo(url,title){frame.src=url;modalTitle.textContent=title||'';modal.hidden=false;document.body.style.overflow='hidden'}
function closeVideo(){frame.src='about:blank';modal.hidden=true;document.body.style.overflow=''}
document.querySelectorAll('[data-video]').forEach(el=>el.addEventListener('click',()=>openVideo(el.dataset.video,el.dataset.title)));
document.querySelector('.modal-close')?.addEventListener('click',closeVideo);modal?.addEventListener('click',e=>{if(e.target===modal)closeVideo()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeVideo()});
const deckFrame=document.querySelector('#deck-frame'),tabs=[...document.querySelectorAll('.deck-tab')],base='https://docs.google.com/presentation/d/15Vj_iGWgsj51VMfYH-bBHJVKepZBeRDd7_PrriwYQ5s/embed?start=false&loop=false&delayms=30000&rm=minimal';tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');deckFrame.src=base+'&slide=id.'+t.dataset.slide;}));
