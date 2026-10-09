(function(){
  function closePublicMenu(){
    const nav=document.getElementById('navMenu');
    const btn=document.getElementById('mobileMenu');
    if(!nav||!btn)return;
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    btn.textContent='☰';
  }

  function setupPublicMenu(){
    const nav=document.getElementById('navMenu');
    const btn=document.getElementById('mobileMenu');
    if(!nav||!btn)return;
    btn.setAttribute('aria-controls','navMenu');
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const open=nav.classList.toggle('open');
      btn.setAttribute('aria-expanded',String(open));
      btn.textContent=open?'×':'☰';
    });
    nav.addEventListener('click',e=>{
      if(e.target.closest('a')) closePublicMenu();
    });
    document.addEventListener('click',e=>{
      if(window.innerWidth<=760 && nav.classList.contains('open') && !nav.contains(e.target) && e.target!==btn) closePublicMenu();
    });
    window.addEventListener('resize',()=>{if(window.innerWidth>760)closePublicMenu()});
  }


  function setupMobileSearch(){
    if(window.innerWidth>760)return;
    const shell=document.getElementById('comprar');
    const advanced=document.getElementById('advancedSearch');
    const toggle=document.getElementById('toggleAdvancedFilters');
    if(!shell||!advanced||!toggle)return;

    advanced.classList.add('collapsed');
    shell.classList.remove('mobile-filters-open');
    toggle.textContent='Mais filtros';

    toggle.addEventListener('click',()=>{
      requestAnimationFrame(()=>{
        const open=!advanced.classList.contains('collapsed');
        shell.classList.toggle('mobile-filters-open',open);
        toggle.textContent=open?'Ocultar filtros':'Mais filtros';
      });
    });
  }

  function setupCompactMobileWhatsapp(){
    if(window.innerWidth>760)return;
    const widget=document.getElementById('dreamWidget');
    const scene=document.getElementById('dreamScene');
    if(!widget||!scene)return;
    widget.classList.add('compact');
    scene.classList.remove('opening');
  }

  function setupAdminDrawer(){
    const sidebar=document.querySelector('.sidebar');
    const header=document.querySelector('.admin-header');
    if(!sidebar||!header)return;

    let btn=document.getElementById('adminMenuBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='adminMenuBtn';
      btn.className='admin-menu-toggle';
      btn.setAttribute('aria-label','Abrir menu do painel');
      btn.setAttribute('aria-expanded','false');
      btn.textContent='☰';
      header.insertBefore(btn,header.firstChild);
    }

    let backdrop=document.querySelector('.admin-mobile-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='admin-mobile-backdrop';
      document.body.appendChild(backdrop);
    }

    const setOpen=open=>{
      sidebar.classList.toggle('mobile-open',open);
      backdrop.classList.toggle('show',open);
      btn.setAttribute('aria-expanded',String(open));
      btn.textContent=open?'×':'☰';
      document.body.style.overflow=open?'hidden':'';
    };

    btn.addEventListener('click',()=>setOpen(!sidebar.classList.contains('mobile-open')));
    backdrop.addEventListener('click',()=>setOpen(false));
    sidebar.addEventListener('click',e=>{
      if(window.innerWidth<=860 && e.target.closest('.sidebar-nav button,.sidebar-exit,.sidebar-logout')) setOpen(false);
    });
    window.addEventListener('resize',()=>{if(window.innerWidth>860)setOpen(false)});
  }

  function setupMobileModalScrollLock(){
    const observer=new MutationObserver(()=>{
      const open=[...document.querySelectorAll('.modal')].some(x=>!x.classList.contains('hidden'));
      if(!document.querySelector('.sidebar.mobile-open')) document.body.style.overflow=open?'hidden':'';
    });
    document.querySelectorAll('.modal').forEach(m=>observer.observe(m,{attributes:true,attributeFilter:['class']}));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      setupPublicMenu();setupMobileSearch();setupCompactMobileWhatsapp();setupAdminDrawer();setupMobileModalScrollLock();
    });
  }else{
    setupPublicMenu();setupMobileSearch();setupCompactMobileWhatsapp();setupAdminDrawer();setupMobileModalScrollLock();
  }
})();