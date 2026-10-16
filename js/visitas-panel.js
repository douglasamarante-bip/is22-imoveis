(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={records:[],leads:[]};
  function el(tag,text,cls){
    const node=document.createElement(tag);
    if(text!==undefined&&text!==null)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  }
  function anchor(text,url,cls){
    const a=el('a',text,cls);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function authHeaders(){
    const token=window.IS22Auth?.session?.()?.token;
    return token?{Authorization:'Bearer '+token}:{};
  }
  async function getJson(url){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:authHeaders()});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Não foi possível carregar os registros.');
    return d;
  }
  function message(text){
    const target=$('visitPanelError');
    if(target)target.textContent=text||'';
  }
  function recordTitle(r){return r.cliente||'Cliente não identificado'}
  function safeId(id){return /^[A-Za-z0-9_-]+$/.test(String(id||''))}
  function rowTitle(parent,title,subtitle){
    const block=el('div',null,'visit-entry-copy');
    block.append(el('b',title),el('small',subtitle));
    parent.append(block);
  }
  function formatDate(value){
    const d=new Date(value);
    return Number.isNaN(d.valueOf())?'':d.toLocaleDateString('pt-BR');
  }
  function renderRecords(){
    const target=$('visitRecordList');
    if(!target)return;
    target.replaceChildren();
    const q=String($('visitSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
    const filtered=state.records.filter(r=>([r.cliente,r.imovel,r.id,r.status].join(' ').toLocaleLowerCase('pt-BR')).includes(q));
    if(!filtered.length){
      target.append(el('p',state.records.length?'Nenhum registro corresponde à busca.':'Ainda não existem visitas ou propostas registradas. Abaixo você pode iniciar uma usando um lead.', 'visit-empty'));
      return;
    }
    for(const r of filtered){
      const card=el('div',null,'visit-entry');
      rowTitle(card,recordTitle(r),'Registro '+r.id+' · '+(r.imovel||'Imóvel a definir')+' · '+(r.status||'Em negociação')+' · '+formatDate(r.updatedAt));
      const actions=el('div',null,'visit-entry-actions');
      const btn=el('button','Ver resumo','btn btn-outline');
      btn.type='button';
      btn.addEventListener('click',()=>showDetails(r.id));
      actions.append(btn,anchor('Documentos e QR ↗','registros.html?id='+encodeURIComponent(r.id),'btn btn-primary'));
      card.append(actions);target.append(card);
    }
  }
  function renderLeads(){
    const target=$('visitLeadList');
    if(!target)return;
    target.replaceChildren();
    const active=state.leads.filter(l=>l&&l.id&&l.stage!=='Perdido').slice(0,120);
    const count=$('visitLeadCount');if(count)count.textContent=active.length;
    if(!active.length){
      target.append(el('p','Nenhum lead disponível para iniciar um registro.', 'visit-empty'));
      return;
    }
    for(const lead of active){
      const card=el('div',null,'visit-entry');
      const name=(lead.name==='Contato pelo site'||lead.name==='Visitante do site')?'Contato sem nome informado':(lead.name||'Contato sem nome informado');
      rowTitle(card,name,[lead.phone||lead.email||'Sem contato',lead.propertyId||'Imóvel ainda não informado',lead.stage||'Novo'].join(' · '));
      const actions=el('div',null,'visit-entry-actions');
      if(safeId(lead.id)){
        actions.append(anchor('Iniciar registro ↗','registro-visita.html?lead='+encodeURIComponent(lead.id),'btn btn-primary'));
      }
      card.append(actions);target.append(card);
    }
  }
  async function showDetails(id){
    const container=$('visitRecordDetail');if(!container||!safeId(id))return;
    container.classList.remove('hidden');container.replaceChildren(el('p','Carregando detalhes...', 'visit-empty'));
    try{
      const {record:r}=await getJson('/api/visitas/'+encodeURIComponent(id));
      container.replaceChildren();
      const header=el('div',null,'visit-entry visit-detail-head');
      const copy=el('div');
      copy.append(el('h2','Registro '+r.id),el('p',[r.cliente,r.imovel_procurado||r.proposta_codigo].filter(Boolean).join(' · ')));
      header.append(copy);
      const actions=el('div',null,'visit-entry-actions');
      actions.append(anchor('Editar ↗','registro-visita.html?id='+encodeURIComponent(r.id),'btn btn-outline'));
      actions.append(anchor('PDF ↗','/api/visitas/'+encodeURIComponent(r.id)+'/pdf','btn btn-primary'));
      actions.append(anchor('Documentos / QR ↗','registros.html?id='+encodeURIComponent(r.id),'btn btn-outline'));
      header.append(actions);container.append(header);
      const wrap=el('div',null,'visit-info-grid');
      for(const [label,value] of [
        ['Cliente',r.cliente],['Telefone',r.celular||r.telefone],
        ['Imóvel',r.imovel_procurado||r.proposta_codigo],
        ['Valor ofertado',r.proposta_valor],
        ['Contraproposta',r.contra_valor],
        ['Data da visita',r.data_visita]
      ]){
        const item=el('div',null,'visit-info-item');
        item.append(el('small',label),el('strong',value||'Não informado'));
        wrap.append(item);
      }
      container.append(wrap);
      container.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){
      container.replaceChildren(el('p',e.message,'visit-panel-message'));
    }
  }
  async function load(){
    const panel=$('panel-visitas');if(!panel||panel.classList.contains('hidden'))return;
    message('');
    $('visitRecordList').replaceChildren(el('p','Carregando registros...', 'visit-empty'));
    const count=$('visitRecordCount');if(count)count.textContent='…';
    const local=window.IS22Data?.leads?.()||[];
    const results=await Promise.allSettled([getJson('/api/visitas'),getJson('/api/leads')]);
    if(results[0].status==='fulfilled'){
      state.records=Array.isArray(results[0].value.records)?results[0].value.records:[];
      if(count)count.textContent=state.records.length;
    }else{
      state.records=[];
      if(count)count.textContent='—';
      message(results[0].reason?.message||'Falha ao carregar registros. Entre novamente no painel.');
    }
    const byId=new Map(local.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    if(results[1].status==='fulfilled'){
      for(const lead of (results[1].value.leads||[])){
        if(lead&&lead.id)byId.set(String(lead.id),lead);
      }
    }
    state.leads=[...byId.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    renderRecords();renderLeads();
  }
  $('visitRefresh')?.addEventListener('click',load);
  $('visitSearch')?.addEventListener('input',renderRecords);
  window.loadVisitPanel=load;
})();
