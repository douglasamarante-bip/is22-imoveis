(function(){
  const STORAGE='casalCorretoresSiteSettingsV1';
  const OLD_STORAGE='is22SiteSettingsV1';
    const defaults={
    brand:{name:'Casal Corretores',creci:'1764-J',tagline:'Sonhos em endereços reais',logoNavy:'assets/casal-logo-navy.svg',logoWhite:'assets/casal-logo-white.svg',symbolWhite:'assets/casal-symbol-white.svg'},
    colors:{primary:'#0E2A47',secondary:'#173B59',accent:'#D4AF7F',text:'#172A3E',soft:'#F8F7F4'},
    appearance:{radius:'18px',shadow:'soft'},
    nav:{buy:'Comprar',rent:'Alugar',launch:'Lançamentos',premium:'Imóveis Premium',about:'Sobre nós',contact:'Contato',cta:'Falar com um corretor'},
    hero:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88',kicker:'IMÓVEIS COM PROPÓSITO',title:'Mais que imóveis.',strong:'Realizamos histórias.',description:'Comprar ou vender um imóvel é uma decisão importante. A Casal Corretores une parceria, confiança e atendimento próximo para transformar essa escolha em uma conquista segura.',emotion1:'Parceria',emotion2:'Confiança',emotion3:'Realizações',overlay:'70'},
    experience:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88',kicker:'Um imóvel pode marcar o começo de uma nova história.',phrase1:'PARCERIA.',phrase2:'CONFIANÇA.',phrase3:'NOVOS COMEÇOS.',phrase4:'REALIZAÇÕES.',footer:'CASAL CORRETORES · IMÓVEIS COM PROPÓSITO.',position:'bottom-right',delay:'650'},
    emotions:{title1:'PARCERIA',text1:'Atendimento próximo para entender o que realmente faz sentido para você.',title2:'CONFIANÇA',text2:'Transparência em cada etapa, da primeira conversa até a assinatura.',title3:'REALIZAÇÃO',text3:'Mais que encontrar um imóvel: ajudar você a construir uma nova história.'},
    highlights:{kicker:'DESTAQUES',title:'Imóveis em evidência',text:'Uma seleção pensada para diferentes momentos e estilos de vida.'},
    story:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84',kicker:'UMA NOVA HISTÓRIA',title:'A chave não abre apenas uma porta.',strong:'Ela abre possibilidades.',text:'Na Casal Corretores, cada negociação começa com escuta, parceria e cuidado para que a sua próxima decisão imobiliária faça sentido de verdade.',button:'Encontrar meu lugar →'},
    launch:{image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=84',kicker:'CONDOMÍNIOS EXCLUSIVOS',title:'Viva o extraordinário.',text:'Imóveis selecionados em condomínios com infraestrutura completa e localização estratégica.',button:'Ver lançamentos →'},
    premium:{image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=84',kicker:'CASAL SELECT',title:'Imóveis para viver uma nova fase.',text:'Uma seleção especial com localização, arquitetura e detalhes que combinam com grandes conquistas.'},
    about:{kicker:'CASAL CORRETORES',title:'Parceria para encontrar o imóvel certo.',title1:'Curadoria de imóveis',text1:'Casas, apartamentos, terrenos e oportunidades selecionadas com atenção ao perfil de cada cliente.',title2:'Atendimento próximo',text2:'Conversa direta, acompanhamento e clareza durante toda a negociação.',title3:'Negociação segura',text3:'Organização e cuidado em cada etapa para comprar, vender ou alugar com tranquilidade.'},
    contact:{phone:'(83) 99926-7089',whatsapp:'5583999267089',email:'contato@is22.com.br',instagram:'@is22imoveis',instagramUrl:'https://instagram.com/is22imoveis'},
    contactSection:{kicker:'VAMOS CONVERSAR?',title:'Sua próxima história pode começar aqui.',text:'Fale com a Casal Corretores para comprar, alugar ou anunciar seu imóvel.'},
    footer:{copyright:'© 2026 Casal Corretores. Todos os direitos reservados.'},
    visibility:{experience:true,emotions:true,highlights:true,story:true,launch:true,premium:true,about:true,contact:true}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  const merge=(base,extra)=>{const out=clone(base);const walk=(t,s)=>Object.keys(s||{}).forEach(k=>{if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])){if(!t[k]||typeof t[k]!=='object')t[k]={};walk(t[k],s[k])}else t[k]=s[k]});walk(out,extra||{});return out};
  const getPath=(obj,path)=>path.split('.').reduce((o,k)=>o?.[k],obj);
  const setPath=(obj,path,value)=>{const a=path.split('.');let o=obj;for(let i=0;i<a.length-1;i++){o[a[i]]??={};o=o[a[i]]}o[a.at(-1)]=value};
  /* Upgrade only previous default values; retain the visitor's custom editor choices. */
  function updatedBrand(s){
    const oldColors={primary:['#0B2D4F','#0E2A47'],secondary:['#123C63','#173B59'],accent:['#D4AF7C','#D4AF7F'],text:['#18283A','#172A3E']};
    Object.entries(oldColors).forEach(([key,[previous,next]])=>{if(s.colors?.[key]===previous)s.colors[key]=next});
    if(s.brand?.tagline==='Imóveis com propósito')s.brand.tagline='Sonhos em endereços reais';
    return s;
  }
  function get(){
    try{
      const current=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(current)return updatedBrand(merge(defaults,current));
      const old=JSON.parse(localStorage.getItem(OLD_STORAGE)||'null');
      if(old){
        const migrated=clone(defaults);
        if(old.contact)migrated.contact={...migrated.contact,...old.contact};
        if(old.visibility)migrated.visibility={...migrated.visibility,...old.visibility};
        if(old.hero?.image)migrated.hero.image=old.hero.image;
        if(old.experience?.image)migrated.experience.image=old.experience.image;
        if(old.experience?.position)migrated.experience.position=old.experience.position;
        if(old.experience?.delay)migrated.experience.delay=old.experience.delay;
        if(old.story?.image)migrated.story.image=old.story.image;
        if(old.launch?.image)migrated.launch.image=old.launch.image;
        if(old.premium?.image)migrated.premium.image=old.premium.image;
        localStorage.setItem(STORAGE,JSON.stringify(migrated));
        return updatedBrand(migrated);
      }
      return clone(defaults);
    }catch{return clone(defaults)}
  }
  function save(v){localStorage.setItem(STORAGE,JSON.stringify(v));return v}
  function reset(){localStorage.removeItem(STORAGE);return clone(defaults)}
  const text=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.textContent=v};
  const img=(id,v)=>{const e=document.getElementById(id);if(e&&v)e.src=v};
  const visible=(id,on)=>{const e=document.getElementById(id);if(e)e.style.display=on?'':'none'};
  function apply(s=get()){
    const root=document.documentElement;
    root.style.setProperty('--navy',s.colors.primary);root.style.setProperty('--navy2',s.colors.secondary);root.style.setProperty('--blue',s.colors.accent);root.style.setProperty('--ink',s.colors.text);root.style.setProperty('--soft',s.colors.soft);root.style.setProperty('--radius',s.appearance.radius);
    root.style.setProperty('--shadow',s.appearance.shadow==='strong'?'0 22px 65px rgba(11,45,79,.18)':s.appearance.shadow==='medium'?'0 18px 55px rgba(11,45,79,.13)':'0 16px 50px rgba(11,45,79,.09)');
    if(!document.body.classList.contains('admin-body')) document.title=`${s.brand.name} · Imóveis`;
    img('headerLogo',s.brand.logoNavy);img('footerLogo',s.brand.logoWhite);img('dreamSymbol',s.brand.symbolWhite);
    text('navBuy',s.nav.buy);text('navRent',s.nav.rent);text('navLaunch',s.nav.launch);text('navPremium',s.nav.premium);text('navAbout',s.nav.about);text('navContact',s.nav.contact);text('headerCta',s.nav.cta);
    img('heroImage',s.hero.image);text('heroKicker',s.hero.kicker);text('heroTitle',s.hero.title);text('heroStrong',s.hero.strong);text('heroDescription',s.hero.description);text('heroEmotion1',s.hero.emotion1);text('heroEmotion2',s.hero.emotion2);text('heroEmotion3',s.hero.emotion3);
    const overlay=document.getElementById('heroOverlay');if(overlay){const a=Math.max(.2,Math.min(.95,Number(s.hero.overlay||70)/100));overlay.style.background=`linear-gradient(90deg,rgba(6,25,44,${Math.min(.95,a+.13)}),rgba(11,45,79,${Math.max(.25,a-.16)}) 48%,rgba(11,45,79,.12))`}
    document.querySelectorAll('.dream-house-half').forEach(h=>h.style.backgroundImage=`linear-gradient(rgba(6,25,44,.08),rgba(6,25,44,.26)),url("${s.experience.image}")`);
    text('dreamKicker',s.experience.kicker);text('dreamPhrase1',s.experience.phrase1);text('dreamPhrase2',s.experience.phrase2);text('dreamPhrase3',s.experience.phrase3);text('dreamPhrase4',s.experience.phrase4);text('dreamFooter',s.experience.footer);
    const dw=document.getElementById('dreamWidget');if(dw){dw.classList.remove('pos-bottom-right','pos-bottom-left','pos-top-right','pos-top-left');dw.classList.add('pos-'+s.experience.position)}
    text('emotionTitle1',s.emotions.title1);text('emotionText1',s.emotions.text1);text('emotionTitle2',s.emotions.title2);text('emotionText2',s.emotions.text2);text('emotionTitle3',s.emotions.title3);text('emotionText3',s.emotions.text3);
    text('highlightsKicker',s.highlights.kicker);text('highlightsTitle',s.highlights.title);text('highlightsText',s.highlights.text);
    img('storyImage',s.story.image);text('storyKicker',s.story.kicker);text('storyTitle',s.story.title);text('storyStrong',s.story.strong);text('storyText',s.story.text);text('storyButton',s.story.button);
    text('launchKicker',s.launch.kicker);text('launchTitle',s.launch.title);text('launchText',s.launch.text);text('launchButton',s.launch.button);const li=document.getElementById('launchImage');if(li)li.style.backgroundImage=`linear-gradient(90deg,rgba(11,45,79,.25),rgba(11,45,79,.05)),url("${s.launch.image}")`;
    img('premiumImage',s.premium.image);text('premiumKicker',s.premium.kicker);text('premiumTitle',s.premium.title);text('premiumText',s.premium.text);
    text('aboutKicker',s.about.kicker);text('aboutTitle',s.about.title);text('aboutTitle1',s.about.title1);text('aboutText1',s.about.text1);text('aboutTitle2',s.about.title2);text('aboutText2',s.about.text2);text('aboutTitle3',s.about.title3);text('aboutText3',s.about.text3);
    text('contactKicker',s.contactSection.kicker);text('contactTitle',s.contactSection.title);text('contactText',s.contactSection.text);
    const wa=`https://wa.me/${String(s.contact.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent('Olá '+s.brand.name+', gostaria de atendimento.')}`;
    ['headerCta','contactWhatsapp'].forEach(id=>{const e=document.getElementById(id);if(e)e.href=wa});
    const ce=document.getElementById('contactEmail');if(ce){ce.textContent=s.contact.email;ce.href='mailto:'+s.contact.email}
    const fp=document.getElementById('footerPhone');if(fp){fp.textContent=s.contact.phone;fp.href='tel:+'+String(s.contact.whatsapp||'').replace(/\D/g,'')}
    const fe=document.getElementById('footerEmail');if(fe){fe.textContent=s.contact.email;fe.href='mailto:'+s.contact.email}
    const fi=document.getElementById('footerInstagram');if(fi){fi.textContent=s.contact.instagram;fi.href=s.contact.instagramUrl}
    text('footerCreci',`Imobiliária · CRECI ${s.brand.creci}`);text('footerCopyright',s.footer.copyright);
    visible('dreamWidget',s.visibility.experience);visible('emotionSection',s.visibility.emotions);visible('highlightsSection',s.visibility.highlights);visible('storySection',s.visibility.story);visible('lancamentos',s.visibility.launch);visible('premium',s.visibility.premium);visible('sobre',s.visibility.about);visible('contato',s.visibility.contact);
    return s;
  }
  window.IS22Settings={STORAGE,defaults,get,save,reset,getPath,setPath,apply};
  apply();
})();