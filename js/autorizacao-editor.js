
(function(){
'use strict';
const form=document.getElementById('authForm');
if(!form)return;
const first=form.querySelector('fieldset');
if(!first)return;
const visual=document.createElement('section');
visual.id='authorizationVisual';
visual.className='auth-visual-editor';
const detail=document.createElement('div');
detail.id='authorizationDetails';
detail.className='auth-detailed-fields';
form.insertBefore(detail,first);
while(detail.nextElementSibling && detail.nextElementSibling.tagName==='FIELDSET'){
 detail.append(detail.nextElementSibling);
}
const legalField=document.createElement('fieldset');
legalField.innerHTML='<legend>00 · Título e cláusula</legend><div class="auth-form-grid"><label class="span-2">Título da ficha<textarea name="titulo_documento" rows="2" maxlength="130"></textarea></label><label class="span-2">Texto da autorização<textarea name="texto_autorizacao" rows="6" maxlength="4000"></textarea></label></div>';
detail.prepend(legalField);
form.insertBefore(visual,detail);

const field=(label,key)=>'<label class="sheet-field"><span>'+label+'</span><input type="text" maxlength="500" aria-label="'+label+'" data-sheet-field="'+key+'" autocomplete="off"></label>';
const selection=(label,key,options)=>'<label class="sheet-field"><span>'+label+'</span><select aria-label="'+label+'" data-sheet-field="'+key+'">'+options.map(o=>'<option>'+o+'</option>').join('')+'</select></label>';
const row=(items,cls='')=>'<div class="sheet-row '+cls+'">'+items.join('')+'</div>';
const ta=(key,label,rows)=>'<textarea data-sheet-field="'+key+'" aria-label="'+label+'" rows="'+rows+'" spellcheck="true"></textarea>';

visual.innerHTML=
 '<div class="auth-mode-toolbar">'+
   '<div class="auth-mode-tabs" role="group" aria-label="Modo de edição">'+
     '<button id="authVisualMode" class="auth-mode active" type="button" aria-pressed="true">✎ Editar na ficha</button>'+
     '<button id="authDetailsMode" class="auth-mode" type="button" aria-pressed="false">Campos detalhados</button>'+
   '</div>'+
   '<button id="authPrintVisual" class="auth-btn auth-btn-outline" type="button">Imprimir / salvar em PDF</button>'+
 '</div>'+
 '<p class="auth-edit-hint">Clique diretamente nos espaços em branco para preencher. Ao terminar, pressione <b>Salvar rascunho</b> abaixo do documento.</p>'+
 '<div class="sheet-scroll"><article class="sheet-paper" aria-label="Autorização de venda editável">'+
   '<div class="sheet-header">'+
     '<img src="assets/lilian-douglas-logo-verde-laranja.svg" alt="Lilian e Douglas">'+
     '<textarea class="sheet-title" data-sheet-field="titulo_documento" aria-label="Título do documento" rows="2" maxlength="130"></textarea>'+
   '</div>'+
   '<div class="sheet-legal">'+ta('texto_autorizacao','Texto jurídico da autorização',5)+'</div>'+
   '<div class="sheet-main-terms">'+
     row([field('Empresa / profissional autorizado','empresa_autorizada')])+
     row([field('CRECI','creci_empresa'),field('Prazo (meses)','prazo_meses')])+
     row([field('Comissão de intermediação','comissao')])+
   '</div>'+
   '<h3>DESCRIÇÃO DO IMÓVEL</h3>'+
   '<div class="sheet-table">'+
     row([field('Imóvel','imovel')],'sheet-one')+
     row([field('Endereço','endereco_imovel'),field('Município','municipio_imovel')])+
     row([field('Área total','area_total'),field('Área construída','area_construida')])+
     row([selection('Documentação','documentacao',['Escritura','Contrato','Outro']),field('Matrícula nº','matricula')])+
     row([field('Comarca','comarca')],'sheet-one')+
     row([field('Valor da venda (R$)','valor_venda'),selection('Aceita propostas','aceita_propostas',['Sim','Não'])])+
   '</div>'+
   '<p class="sheet-note">Passivo de proposta, desde que comunicada e aceita pelas partes.</p>'+
   '<h3>QUALIFICAÇÃO DO(S) PROPRIETÁRIO(S)</h3>'+
   '<div class="sheet-table">'+
     row([field('Nome','proprietario')],'sheet-one')+
     row([field('CPF','cpf'),field('RG','rg'),field('Profissão','profissao')],'sheet-three')+
     row([field('Nascimento','nascimento'),field('Estado civil','estado_civil')])+
     row([field('Cônjuge','conjuge')],'sheet-one')+
     row([field('CPF cônjuge','conjuge_cpf'),field('RG cônjuge','conjuge_rg'),field('Profissão','conjuge_profissao'),field('Nascimento','conjuge_nascimento')],'sheet-four')+
     row([field('Endereço','endereco_proprietario'),field('Município','municipio_proprietario')])+
     row([field('E-mail','email'),field('Telefone','telefone')])+
     '<div class="sheet-observations"><span>Observações e condições adicionais</span>'+ta('observacoes','Observações adicionais',4)+'</div>'+
   '</div>'+
   '<div class="sheet-date">'+row([field('Local','local_assinatura'),field('Data','data_assinatura')])+'</div>'+
   '<div class="sheet-signatory">'+row([field('Corretor responsável','corretor_responsavel'),field('CRECI do corretor','creci_corretor')])+'</div>'+
   '<div class="sheet-signatures">'+
     '<div>____________________________<small>Assinatura do proprietário</small></div>'+
     '<div>____________________________<small>Assinatura do cônjuge</small></div>'+
     '<div>____________________________<small>Assinatura do corretor</small></div>'+
     '<div class="sheet-witness">'+field('Testemunha 1','testemunha1')+'</div>'+
     '<div class="sheet-witness">'+field('Testemunha 2','testemunha2')+'</div>'+
   '</div>'+
   '<p class="sheet-unsigned">RASCUNHO NÃO ASSINADO — Revisar informações e condições antes de formalizar a autorização.</p>'+
 '</article></div>';

const defaultTitle='AUTORIZAÇÃO PARA VENDA DE IMÓVEIS\nURBANOS E RURAIS';
const defaultClause='Pelo presente instrumento particular, o(s) proprietário(s) abaixo qualificado(s) autoriza(m) a empresa ou profissional identificado(a) neste documento a divulgar e promover a venda do imóvel descrito, inclusive por anúncios e visitas, pelo prazo e comissão acordados. Eventual renovação deverá ser expressamente acertada pelas partes.';
const visualInputs=[...visual.querySelectorAll('[data-sheet-field]')];
const detailedInputs=new Map([...detail.querySelectorAll('[name]')].map(el=>[el.name,el]));
function resize(el){
 if(el.tagName!=='TEXTAREA')return;
 el.style.height='auto';
 el.style.height=Math.max(el.scrollHeight,el.classList.contains('sheet-title')?57:60)+'px';
}
function syncFromDetails(){
 for(const input of visualInputs){
  const d=detailedInputs.get(input.dataset.sheetField);
  if(!d)continue;
  const value=d.value;
  input.value=value || (input.dataset.sheetField==='titulo_documento'?defaultTitle:input.dataset.sheetField==='texto_autorizacao'?defaultClause:'');
  resize(input);
 }
}
function syncToDetails(){
 for(const input of visualInputs){
  const d=detailedInputs.get(input.dataset.sheetField);
  if(d)d.value=input.value;
 }
}
visualInputs.forEach(input=>{
 const update=()=>{
  const d=detailedInputs.get(input.dataset.sheetField);
  if(d)d.value=input.value;
  resize(input);
 };
 input.addEventListener('input',update);
 input.addEventListener('change',update);
});
detail.addEventListener('input',e=>{
 if(e.target.closest('[name]'))syncFromDetails();
});
detail.addEventListener('change',e=>{
 if(e.target.closest('[name]'))syncFromDetails();
});
const visualButton=document.getElementById('authVisualMode');
const detailsButton=document.getElementById('authDetailsMode');
function setMode(mode){
 const isVisual=mode!=='details';
 if(isVisual)syncFromDetails();else syncToDetails();
 visual.querySelector('.sheet-scroll').hidden=!isVisual;
 visual.querySelector('.auth-edit-hint').hidden=!isVisual;
 detail.hidden=isVisual;
 visualButton.classList.toggle('active',isVisual);
 detailsButton.classList.toggle('active',!isVisual);
 visualButton.setAttribute('aria-pressed',String(isVisual));
 detailsButton.setAttribute('aria-pressed',String(!isVisual));
}
visualButton.addEventListener('click',()=>setMode('visual'));
detailsButton.addEventListener('click',()=>setMode('details'));
document.getElementById('authPrintVisual').addEventListener('click',()=>{
 setMode('visual');
 visualInputs.forEach(resize);
 window.print();
});
window.CasalAuthVisual={
 syncFromDetails,syncToDetails,setMode,
 focusField(key){
  setMode('visual');
  const input=visualInputs.find(x=>x.dataset.sheetField===key);
  if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'})}
 }
};
syncFromDetails();
setMode('visual');
})();
