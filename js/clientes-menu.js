(function(){
'use strict';
function initialize(){
 const aside=document.getElementById('clientSidebar');
 const btn=document.getElementById('clientMenuBtn');
 const shade=document.getElementById('clientShade');
 if(!aside||!btn||!shade)return;
 function toggle(open){
  aside.classList.toggle('mobile-open',open);
  shade.classList.toggle('mobile-open',open);
  btn.setAttribute('aria-expanded',String(open));
  btn.textContent=open?'×':'☰';
  document.body.style.overflow=open?'hidden':'';
 }
 btn.addEventListener('click',()=>toggle(!aside.classList.contains('mobile-open')));
 shade.addEventListener('click',()=>toggle(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
 addEventListener('resize',()=>{if(innerWidth>900)toggle(false)});
 aside.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>toggle(false)));
 const auth=window.IS22Auth;
 const current=auth?.session?.(),u=auth?.user?.();
 if(!current){location.replace('login.html?motivo=sessao');return}
 const name=document.getElementById('clientUserName');
 if(name)name.textContent=current.name||u?.name||'Equipe Casal';
 document.getElementById('clientSidebarLogout')?.addEventListener('click',async()=>{
  try{await auth.logout()}finally{location.replace('login.html')}
 });
 auth.verify?.().then(ok=>{if(!ok)location.replace('login.html?motivo=sessao')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);
else initialize();
})();
