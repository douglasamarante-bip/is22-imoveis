(function(){
  'use strict';
  const root=document.getElementById('ccWelcome');
  if(!root)return;
  const dialog=root.querySelector('.cc-welcome-dialog');
  const form=document.getElementById('ccWelcomeForm');
  const phone=document.getElementById('ccWelcomePhone');
  const email=document.getElementById('ccWelcomeEmail');
  const error=document.getElementById('ccWelcomeError');
  const submit=document.getElementById('ccWelcomeSubmit');
  const closeBtn=document.getElementById('ccWelcomeClose');
  const skipBtn=document.getElementById('ccWelcomeSkip');
  const STORAGE='casal-welcome-capture-v1';
  const WEEK=7*24*60*60*1000;
  const HALF_YEAR=180*24*60*60*1000;
  let lastFocus=null;
  let submitted=false;

  function suppressionActive(){
    try{return Number(localStorage.getItem(STORAGE)||'0')>Date.now()}catch{return false}
  }
  function suppress(duration){
    try{localStorage.setItem(STORAGE,String(Date.now()+duration))}catch{}
  }
  function close(duration=WEEK){
    if(root.hidden)return;
    root.hidden=true;
    document.body.classList.remove('cc-welcome-visible');
    suppress(duration);
    lastFocus?.focus?.({preventScroll:true});
  }
  function open(){
    if(suppressionActive()||document.visibilityState==='hidden'||!root.hidden)return;
    if(document.querySelector('.modal:not(.hidden)'))return;
    lastFocus=document.activeElement;
    root.hidden=false;
    document.body.classList.add('cc-welcome-visible');
    window.requestAnimationFrame(()=>phone.focus({preventScroll:true}));
  }
  closeBtn?.addEventListener('click',()=>close());
  skipBtn?.addEventListener('click',()=>close());
  root.addEventListener('click',e=>{if(e.target.classList.contains('cc-welcome-backdrop'))close()});
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return}
    if(e.key!=='Tab')return;
    const focusables=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),summary')].filter(x=>x.getClientRects().length);
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(submitted||!form.reportValidity())return;
    const digits=phone.value.replace(/\D/g,'');
    if(!/^(?:\d{10,11}|55\d{10,11})$/.test(digits)){
      error.textContent='Digite o WhatsApp com DDD (ex.: 31 99999-9999).';
      phone.focus();return;
    }
    error.textContent='';
    const label=submit.textContent;
    submit.disabled=true;
    submit.textContent='Enviando...';
    try{
      const res=await fetch('/api/leads/capture',{
        method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({phone:phone.value.trim(),email:email.value.trim(),consent:document.getElementById('ccWelcomeConsent').checked,website:form.elements.website?.value||''})
      });
      const result=await res.json().catch(()=>({}));
      if(!res.ok||!result.ok)throw new Error(result.error||'Não foi possível enviar agora.');
      submitted=true;
      form.innerHTML='<p class="cc-welcome-success" role="status">Recebemos seu contato! A equipe Lilian e Douglas poderá falar com você em breve.</p>';
      suppress(HALF_YEAR);
      window.setTimeout(()=>close(HALF_YEAR),2300);
    }catch(err){
      error.textContent=err.message||'Erro ao enviar. Tente novamente.';
      submit.textContent=label;
      submit.disabled=false;
    }
  });

  const delay=new URLSearchParams(location.search).has('imovel')?7000:2200;
  window.setTimeout(open,delay);
})();
