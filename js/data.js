(function(){
  const KEYS={properties:'is22PropertiesV3',leads:'is22LeadsV1',appointments:'is22AppointmentsV1',owners:'is22OwnerLeadsV1',clients:'is22ClientsV1'};
  const P1='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84';
  const P2='https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=84';
  const P3='https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=84';
  const P4='https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=84';
  const seedProperties=[
    {id:'IS22-001',title:'Casa contemporânea no Altiplano',type:'Casa',purpose:'Venda',status:'Disponível',price:2980000,city:'João Pessoa',neighborhood:'Altiplano',address:'Altiplano Cabo Branco, João Pessoa - PB',bedrooms:4,suites:3,bathrooms:5,parking:3,area:320,condo:0,iptu:4200,featured:true,premium:true,furnished:false,financing:true,pets:true,amenities:['Piscina','Área gourmet','Closet','Jardim'],image:P1,images:[P1,P2,P4],views:892,description:'Residência contemporânea com integração entre sala, área gourmet e lazer, acabamento sofisticado e excelente iluminação natural.'},
    {id:'IS22-002',title:'Apartamento alto padrão em Manaíra',type:'Apartamento',purpose:'Venda',status:'Disponível',price:1750000,city:'João Pessoa',neighborhood:'Manaíra',address:'Manaíra, João Pessoa - PB',bedrooms:3,suites:2,bathrooms:4,parking:2,area:180,condo:1350,iptu:2800,featured:true,premium:true,furnished:false,financing:true,pets:true,amenities:['Varanda gourmet','Elevador','Piscina','Academia'],image:P2,images:[P2,P1,P3],views:1245,description:'Apartamento amplo, varanda generosa, ambientes integrados e localização privilegiada próximo aos principais serviços.'},
    {id:'IS22-003',title:'Apartamento mobiliado no Cabo Branco',type:'Apartamento',purpose:'Aluguel',status:'Disponível',price:4500,city:'João Pessoa',neighborhood:'Cabo Branco',address:'Cabo Branco, João Pessoa - PB',bedrooms:3,suites:1,bathrooms:2,parking:1,area:85,condo:780,iptu:1200,featured:true,premium:false,furnished:true,financing:false,pets:true,amenities:['Mobiliado','Vista mar','Portaria','Elevador'],image:P3,images:[P3,P2],views:456,description:'Apartamento mobiliado, pronto para morar, com vista agradável e fácil acesso à orla.'},
    {id:'IS22-004',title:'Casa com área de lazer em Intermares',type:'Casa',purpose:'Venda',status:'Disponível',price:2200000,city:'Cabedelo',neighborhood:'Intermares',address:'Intermares, Cabedelo - PB',bedrooms:4,suites:3,bathrooms:5,parking:3,area:280,condo:0,iptu:3100,featured:true,premium:true,furnished:false,financing:true,pets:true,amenities:['Piscina','Área gourmet','Jardim','Home office'],image:P4,images:[P4,P1,P2],views:321,description:'Casa de alto padrão com piscina, área gourmet e ambientes amplos em uma das regiões mais desejadas do litoral.'},
    {id:'IS22-005',title:'Sala comercial na região da Epitácio',type:'Comercial',purpose:'Comercial',status:'Disponível',price:650000,city:'João Pessoa',neighborhood:'Tambaúzinho',address:'Tambaúzinho, João Pessoa - PB',bedrooms:0,suites:0,bathrooms:1,parking:1,area:55,condo:640,iptu:1100,featured:false,premium:false,furnished:false,financing:true,pets:false,amenities:['Recepção','Elevador','Estacionamento'],image:P2,images:[P2],views:278,description:'Sala comercial versátil para escritório, consultório ou operação de serviços.'},
    {id:'IS22-006',title:'Lançamento residencial próximo à orla',type:'Apartamento',purpose:'Lançamento',status:'Disponível',price:890000,city:'João Pessoa',neighborhood:'Bessa',address:'Bessa, João Pessoa - PB',bedrooms:2,suites:1,bathrooms:2,parking:1,area:76,condo:0,iptu:0,featured:false,premium:false,furnished:false,financing:true,pets:true,amenities:['Lazer completo','Coworking','Piscina','Academia'],image:P3,images:[P3,P4],views:198,description:'Novo empreendimento com lazer completo, plantas modernas e condições especiais de lançamento.'}
  ];
  const parse=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||fallback}catch{return fallback}};
  function normalizeProperty(p){
    const images=Array.isArray(p.images)&&p.images.length?p.images:[p.image||P1];
    return {status:'Disponível',suites:0,condo:0,iptu:0,furnished:false,financing:true,pets:true,amenities:[],address:`${p.neighborhood||''}, ${p.city||''}`, ...p, image:images[0], images};
  }
  function init(){
    if(!localStorage.getItem(KEYS.properties)){
      const legacy=parse('is22PropertiesV2',null);
      localStorage.setItem(KEYS.properties,JSON.stringify((legacy||seedProperties).map(normalizeProperty)));
    }
    if(!localStorage.getItem(KEYS.leads)) localStorage.setItem(KEYS.leads,JSON.stringify([
      {id:'L-001',name:'Marina Alves',phone:'(83) 99999-1001',email:'',propertyId:'IS22-001',source:'WhatsApp',stage:'Novo',createdAt:new Date(Date.now()-3600000*3).toISOString(),notes:'Interesse em visita no fim de semana.'},
      {id:'L-002',name:'João Victor',phone:'(83) 99999-2002',email:'joao@email.com',propertyId:'IS22-002',source:'Site',stage:'Contatado',createdAt:new Date(Date.now()-86400000).toISOString(),notes:'Busca imóvel para moradia.'}
    ]));
    if(!localStorage.getItem(KEYS.appointments)) localStorage.setItem(KEYS.appointments,JSON.stringify([]));
    if(!localStorage.getItem(KEYS.owners)) localStorage.setItem(KEYS.owners,JSON.stringify([]));
    if(!localStorage.getItem(KEYS.clients)) localStorage.setItem(KEYS.clients,JSON.stringify([]));
  }
  const properties=()=>parse(KEYS.properties,seedProperties).map(normalizeProperty);
  const saveProperties=v=>{const clean=v.map(normalizeProperty);localStorage.setItem(KEYS.properties,JSON.stringify(clean));if(localStorage.getItem('is22AdminSessionV1'))fetch('/api/properties',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({properties:clean})}).catch(()=>{});};
  const leads=()=>parse(KEYS.leads,[]); const saveLeads=v=>localStorage.setItem(KEYS.leads,JSON.stringify(v));
  const appointments=()=>parse(KEYS.appointments,[]); const saveAppointments=v=>localStorage.setItem(KEYS.appointments,JSON.stringify(v));
  const owners=()=>parse(KEYS.owners,[]); const saveOwners=v=>localStorage.setItem(KEYS.owners,JSON.stringify(v));
  function upsertLead(data){
    const arr=leads(); const phone=(data.phone||'').replace(/\D/g,'');
    const existing=arr.find(x=>phone && (x.phone||'').replace(/\D/g,'')===phone && x.propertyId===data.propertyId);
    if(existing){Object.assign(existing,data,{updatedAt:new Date().toISOString()});saveLeads(arr);return existing}
    const lead={id:'L-'+String(Date.now()).slice(-7),stage:'Novo',createdAt:new Date().toISOString(),...data};arr.unshift(lead);saveLeads(arr);return lead;
  }
  function addAppointment(data){const arr=appointments();const item={id:'A-'+String(Date.now()).slice(-7),status:'Agendada',createdAt:new Date().toISOString(),...data};arr.unshift(item);saveAppointments(arr);return item}
  function addOwner(data){const arr=owners();const item={id:'C-'+String(Date.now()).slice(-7),status:'Novo',createdAt:new Date().toISOString(),...data};arr.unshift(item);saveOwners(arr);return item}
  init();
  window.IS22Data={KEYS,properties,saveProperties,leads,saveLeads,appointments,saveAppointments,owners,saveOwners,upsertLead,addAppointment,addOwner,normalizeProperty};
  fetch('/api/properties',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(Array.isArray(d.properties)){localStorage.setItem(KEYS.properties,JSON.stringify(d.properties.map(normalizeProperty)));window.dispatchEvent(new Event('is22-data-sync'));}}).catch(()=>{});
})();