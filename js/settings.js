(function(){
  const STORAGE='is22SiteSettingsV1';
  const svgLogo=(color)=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="76" viewBox="0 0 250 76"><g fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40L36 13l28 27V66H8Z"/><path d="M36 13v53"/></g><text x="76" y="44" font-family="Arial,sans-serif" font-size="38" font-weight="800" fill="${color}">IS22</text><text x="78" y="63" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="4" fill="${color}">IMÓVEIS</text></svg>`);
  const svgSymbol=(color)=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 42L40 12l30 30v28H10Z"/><path d="M40 12v58"/></g><text x="18" y="56" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="${color}">IS</text></svg>`);
  const defaults={
    brand:{name:'IS22 Imóveis',creci:'1764-J',tagline:'Sonhos em endereços reais',logoNavy:'assets/is22-logo-navy.png',logoWhite:'assets/is22-logo-white.png',symbolWhite:'assets/is22-symbol-white.png'},
    colors:{primary:'#082452',secondary:'#0d356c',accent:'#2b87c8',text:'#102038',soft:'#f5f8fb'},
    appearance:{radius:'18px',shadow:'soft'},
    nav:{buy:'Comprar',rent:'Alugar',launch:'Lançamentos',premium:'Imóveis Premium',about:'Sobre nós',contact:'Contato',cta:'Falar com um corretor'},
    hero:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88',kicker:'SONHOS EM ENDEREÇOS REAIS',title:'Não é só uma casa.',strong:'É a sua próxima conquista.',description:'O endereço certo marca uma nova fase. A IS22 aproxima você do imóvel que combina com o que já conquistou — e com tudo o que ainda quer viver.',emotion1:'Conquista',emotion2:'Realização',emotion3:'Novos começos',overlay:'70'},
    experience:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88',kicker:'Um endereço pode representar muito mais.',phrase1:'CONQUISTA.',phrase2:'REALIZAÇÃO.',phrase3:'NOVOS COMEÇOS.',phrase4:'SEU LUGAR NO MUNDO.',footer:'IS22 IMÓVEIS · SONHOS EM ENDEREÇOS REAIS.',position:'bottom-right',delay:'650'},
    emotions:{title1:'CONQUISTA',text1:'Um espaço que representa o caminho que você percorreu.',title2:'REALIZAÇÃO',text2:'O momento em que um plano deixa de ser ideia e ganha endereço.',title3:'PERTENCIMENTO',text3:'Mais do que morar: sentir que finalmente chegou ao seu lugar.'},
    highlights:{kicker:'DESTAQUES',title:'Imóveis em evidência',text:'Uma seleção pensada para diferentes momentos e estilos de vida.'},
    story:{image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84',kicker:'O PRÓXIMO CAPÍTULO',title:'A chave não abre apenas uma porta.',strong:'Ela abre uma nova fase.',text:'Escolher um imóvel é escolher onde os próximos anos vão acontecer. A IS22 cuida dessa decisão com curadoria, proximidade e atendimento humano.',button:'Encontrar meu lugar →'},
    launch:{image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=84',kicker:'CONDOMÍNIOS EXCLUSIVOS',title:'Viva o extraordinário.',text:'Imóveis selecionados em condomínios com infraestrutura completa e localização estratégica.',button:'Ver lançamentos →'},
    premium:{image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=84',kicker:'IS22 PREMIUM',title:'Para quem chegou até aqui e quer ir além.',text:'Imóveis que traduzem uma nova etapa: arquitetura marcante, localização especial e detalhes à altura das suas conquistas.'},
    about:{kicker:'IS22 IMÓVEIS',title:'Imóvel certo, atendimento do jeito certo.',title1:'Seleção de imóveis',text1:'Casas, apartamentos, terrenos e oportunidades comerciais em um catálogo claro e organizado.',title2:'Contato direto',text2:'O cliente encontra o imóvel e fala com a equipe sem etapas desnecessárias.',title3:'Gestão profissional',text3:'A corretora controla anúncios, leads, destaques e disponibilidade em um painel dedicado.'},
    contact:{phone:'(83) 99926-7089',whatsapp:'5583999267089',email:'contato@is22.com.br',instagram:'@is22imoveis',instagramUrl:'https://instagram.com/is22imoveis'},
    contactSection:{kicker:'VAMOS CONVERSAR?',title:'Seu próximo endereço pode estar aqui.',text:'Fale com a equipe IS22 para comprar, alugar ou anunciar seu imóvel.'},
    footer:{copyright:'© 2026 IS22 Imóveis. Todos os direitos reservados.'},
    visibility:{experience:true,emotions:true,highlights:true,story:true,launch:true,premium:true,about:true,contact:true}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  const merge=(base,extra)=>{const out=clone(base);const walk=(t,s)=>Object.keys(s||{}).forEach(k=>{if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])){if(!t[k]||typeof t[k]!=='object')t[k]={};walk(t[k],s[k])}else t[k]=s[k]});walk(out,extra||{});return out};
  const getPath=(obj,path)=>path.split('.').reduce((o,k)=>o?.[k],obj);
  const setPath=(obj,path,value)=>{const a=path.split('.');let o=obj;for(let i=0;i<a.length-1;i++){o[a[i]]??={};o=o[a[i]]}o[a.at(-1)]=value};
  function get(){try{return merge(defaults,JSON.parse(localStorage.getItem(STORAGE)||'{}'))}catch{return clone(defaults)}}
  function save(v){localStorage.setItem(STORAGE,JSON.stringify(v));return v}
  function reset(){localStorage.removeItem(STORAGE);return clone(defaults)}
  const text=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.textContent=v};
  const img=(id,v)=>{const e=document.getElementById(id);if(e&&v)e.src=v};
  const visible=(id,on)=>{const e=document.getElementById(id);if(e)e.style.display=on?'':'none'};
  function apply(s=get()){
    const root=document.documentElement;
    root.style.setProperty('--navy',s.colors.primary);root.style.setProperty('--navy2',s.colors.secondary);root.style.setProperty('--blue',s.colors.accent);root.style.setProperty('--ink',s.colors.text);root.style.setProperty('--soft',s.colors.soft);root.style.setProperty('--radius',s.appearance.radius);
    root.style.setProperty('--shadow',s.appearance.shadow==='strong'?'0 22px 65px rgba(20,42,71,.18)':s.appearance.shadow==='medium'?'0 18px 55px rgba(20,42,71,.13)':'0 16px 50px rgba(20,42,71,.09)');
    if(!document.body.classList.contains('admin-body')) document.title=`${s.brand.name} · Imóveis`;
    img('headerLogo',s.brand.logoNavy);img('footerLogo',s.brand.logoWhite);img('dreamSymbol',s.brand.symbolWhite);
    text('navBuy',s.nav.buy);text('navRent',s.nav.rent);text('navLaunch',s.nav.launch);text('navPremium',s.nav.premium);text('navAbout',s.nav.about);text('navContact',s.nav.contact);text('headerCta',s.nav.cta);
    img('heroImage',s.hero.image);text('heroKicker',s.hero.kicker);text('heroTitle',s.hero.title);text('heroStrong',s.hero.strong);text('heroDescription',s.hero.description);text('heroEmotion1',s.hero.emotion1);text('heroEmotion2',s.hero.emotion2);text('heroEmotion3',s.hero.emotion3);
    const overlay=document.getElementById('heroOverlay');if(overlay){const a=Math.max(.2,Math.min(.95,Number(s.hero.overlay||70)/100));overlay.style.background=`linear-gradient(90deg,rgba(2,15,35,${Math.min(.95,a+.13)}),rgba(8,36,82,${Math.max(.25,a-.16)}) 48%,rgba(8,36,82,.12))`}
    document.querySelectorAll('.dream-house-half').forEach(h=>h.style.backgroundImage=`linear-gradient(rgba(3,17,40,.08),rgba(3,17,40,.26)),url("${s.experience.image}")`);
    text('dreamKicker',s.experience.kicker);text('dreamPhrase1',s.experience.phrase1);text('dreamPhrase2',s.experience.phrase2);text('dreamPhrase3',s.experience.phrase3);text('dreamPhrase4',s.experience.phrase4);text('dreamFooter',s.experience.footer);
    const dw=document.getElementById('dreamWidget');if(dw){dw.classList.remove('pos-bottom-right','pos-bottom-left','pos-top-right','pos-top-left');dw.classList.add('pos-'+s.experience.position)}
    text('emotionTitle1',s.emotions.title1);text('emotionText1',s.emotions.text1);text('emotionTitle2',s.emotions.title2);text('emotionText2',s.emotions.text2);text('emotionTitle3',s.emotions.title3);text('emotionText3',s.emotions.text3);
    text('highlightsKicker',s.highlights.kicker);text('highlightsTitle',s.highlights.title);text('highlightsText',s.highlights.text);
    img('storyImage',s.story.image);text('storyKicker',s.story.kicker);text('storyTitle',s.story.title);text('storyStrong',s.story.strong);text('storyText',s.story.text);text('storyButton',s.story.button);
    text('launchKicker',s.launch.kicker);text('launchTitle',s.launch.title);text('launchText',s.launch.text);text('launchButton',s.launch.button);const li=document.getElementById('launchImage');if(li)li.style.backgroundImage=`linear-gradient(90deg,rgba(8,36,82,.25),rgba(8,36,82,.05)),url("${s.launch.image}")`;
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