(function(){
'use strict';
const $=id=>document.getElementById(id);
const form=$('authForm');
const fields=[...form.querySelectorAll('[name]')];
const state={records:[],id:''};
function escapedId(id){return /^[A-Za-z0-9_-]{1,100}$/.test(String(id||''))}
function report(text,error=false){
 const p=$('authFeedback');
 p.textContent=text||'';
 p.classList.toggle('error',!!error);
}
function authorization(){
 const token=window.IS22Auth?.session?.()?.token;
 return token?{Authorization:'Bearer '+token}:{};
}
async function api(url,options={}){
 const r=await fetch(url,{
  credentials:'same-origin',cache:'no-store',...options,
  headers:{...authorization(),...(options.headers||{})}
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok||d.ok===false){
  const error=new Error(d.error||'Erro ao consultar ou salvar autorização.');
  error.status=r.status;throw error;
 }
 return d;
}
function onError(e){
 report(e.message||'Erro ao carregar documento.',true);
 if(e.status===401){
  const link=document.createElement('a');link.href='login.html?motivo=sessao';
  link.textContent=' Entrar novamente';$('authFeedback').append(link);
 }
}
function collect(){
 window.CasalAuthVisual?.syncToDetails?.();
 const data={};
 for(const item of fields)data[item.name]=item.value.trim();
 return data;
}
function populate(data={}){
 for(const item of fields){
  item.value=Object.prototype.hasOwnProperty.call(data,item.name)?String(data[item.name]||''):'';
 }
 if(!data.documentacao)form.elements.documentacao.value='Escritura';
 if(!data.aceita_propostas)form.elements.aceita_propostas.value='Sim';
 if(!data.local_assinatura)form.elements.local_assinatura.value='Conselheiro Lafaiete - MG';
 window.CasalAuthVisual?.syncFromDetails?.();
}
function setCurrent(id=''){
 state.id=id;
 const badge=$('authBadge');
 badge.textContent=id?'Rascunho '+id:'Novo rascunho';
 const pdf='\/api/autorizacoes\/'+encodeURIComponent(id)+'\/pdf';
 for(const linkId of ['pdfAuthLink','bottomPdfAuthLink']){
  const a=$(linkId);a.hidden=!id;
  if(id)a.href=pdf;else a.removeAttribute('href');
 }
}
function reset(){
 setCurrent();populate();
 report('Novo formulário pronto. Preencha e clique em Salvar rascunho.');
 history.replaceState({},'',location.pathname);
 window.CasalAuthVisual?.focusField?.('imovel');
 drawList();
}
function make(tag,text,className){
 const el=document.createElement(tag);if(className)el.className=className;
 if(text!=null)el.textContent=String(text);
 return el;
}
function drawList(){
 const target=$('authList');target.replaceChildren();
 const query=String($('authSearch').value||'').trim().toLocaleLowerCase('pt-BR');
 const filtered=state.records.filter(r=>{
  const s=[r.id,r.proprietario,r.imovel,r.endereco_imovel,r.municipio_imovel].join(' ').toLocaleLowerCase('pt-BR');
  return s.includes(query);
 });
 $('authListMessage').textContent=filtered.length?
    filtered.length+' autorização(ões) encontrada(s)':
    (state.records.length?'Nenhuma autorização corresponde à busca.':'Nenhuma autorização cadastrada ainda.');
 for(const r of filtered){
  const btn=make('button',null,'auth-item'+(state.id===r.id?' active':''));
  btn.type='button';
  btn.append(
   make('b',r.proprietario||'Proprietário não informado'),
   make('span',(r.imovel||'Imóvel não informado')+' · '+(r.municipio_imovel||'Município não informado')),
   make('small',r.id+' · Salvo em '+new Date(r.updatedAt).toLocaleString('pt-BR'))
  );
  btn.addEventListener('click',()=>loadOne(r.id));
  target.append(btn);
 }
}
async function loadList(){
 try{
  const {records}=await api('/api/autorizacoes');
  state.records=Array.isArray(records)?records:[];
  drawList();
 }catch(e){$('authListMessage').textContent='Não foi possível carregar autorizações.';onError(e)}
}
async function loadOne(id){
 if(!escapedId(id))return;
 report('Carregando autorização...');
 try{
  const {record}=await api('/api/autorizacoes/'+encodeURIComponent(id));
  populate(record);setCurrent(record.id);
  report('Rascunho carregado. Confira os dados antes de imprimir.');
  history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(record.id));
  drawList();
  document.querySelector('.auth-form-card')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){onError(e)}
}
async function save(e){
 e.preventDefault();
 const isDetailsVisible=!document.getElementById('authorizationDetails')?.hidden;
 if(isDetailsVisible&&!form.reportValidity())return;
 const data=collect();
 if(!data.proprietario||!data.imovel){
  const missing=data.imovel?'proprietario':'imovel';
  report('Preencha o imóvel e o nome completo do proprietário antes de salvar.',true);
  window.CasalAuthVisual?.focusField?.(missing);
  return;
 }
 if(data.email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)){
  report('Digite um e-mail válido antes de salvar.',true);
  window.CasalAuthVisual?.focusField?.('email');return;
 }
 const btn=$('saveAuth');btn.disabled=true;btn.textContent='Salvando...';
 report('Salvando rascunho com segurança...');
 try{
  const editing=!!state.id;
  const {record}=await api(editing?'/api/autorizacoes/'+encodeURIComponent(state.id):'/api/autorizacoes',{
   method:editing?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)
  });
  setCurrent(record.id);
  report('Ficha salva no servidor! Continue editando aqui ou imprima a ficha para conferência e assinatura.');
  history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(record.id));
  await loadList();
 }catch(err){onError(err)}
 finally{btn.disabled=false;btn.textContent='Salvar rascunho'}
}
form.addEventListener('submit',save);
$('newAuthorization').addEventListener('click',reset);
$('resetAuth').addEventListener('click',()=>{
 if(confirm('Limpar o formulário atual? Os registros já salvos continuarão no banco.'))reset();
});
$('refreshAuthorization').addEventListener('click',loadList);
$('authSearch').addEventListener('input',drawList);
const params=new URLSearchParams(location.search);
loadList().then(()=>{
 const id=params.get('id');
 if(id&&escapedId(id))return loadOne(id);
});
})();
