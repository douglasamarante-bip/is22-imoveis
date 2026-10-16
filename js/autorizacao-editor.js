(function(){
'use strict';
const form=document.getElementById('authForm');
if(!form)return;
const first=form.querySelector('fieldset');
if(!first)return;
const detail=document.createElement('div');
detail.id='authorizationDetails';
detail.className='auth-detailed-fields';
form.insertBefore(detail,first);
while(detail.nextElementSibling&&detail.nextElementSibling.tagName==='FIELDSET') detail.append(detail.nextElementSibling);
const legal=document.createElement('fieldset');
legal.innerHTML='<legend>00 · Texto do documento</legend><div class="auth-form-grid"><label class="span-2">Título da autorização<textarea name="titulo_documento" maxlength="130" rows="2"></textarea></label><label class="span-2">Texto integral da autorização<textarea name="texto_autorizacao" maxlength="4000" rows="7"></textarea></label></div>';
detail.prepend(legal);
const editor=document.createElement('section');
editor.id='authorizationVisual';
editor.className='auth-visual-editor';
form.insertBefore(editor,detail);
const f=(caption,key,extra='')=>'<label class="doc-field '+extra+'"><span>'+caption+'</span><input aria-label="'+caption+'" type="text" maxlength="500" autocomplete="off" data-sheet-field="'+key+'"></label>';
const ta=(caption,key,cls,rows=4)=>'<label class="doc-textarea '+cls+'"><span>'+caption+'</span><textarea aria-label="'+caption+'" maxlength="'+(key==='texto_autorizacao'?4000:2500)+'" rows="'+rows+'" data-sheet-field="'+key+'"></textarea></label>';
const line=(fields,cls='')=>'<div class="doc-row '+cls+'">'+fields.join('')+'</div>';
const title='AUTORIZAÇÃO PARA VENDA DE IMÓVEIS\nURBANOS E RURAIS';
const clause='Pelo presente instrumento particular, o(s) proprietário(s) identificado(s) neste documento autoriza(m) a empresa ou profissional qualificado(a) abaixo a promover a venda do imóvel descrito, com liberdade para anúncios em meios de comunicação e realização de visitas. A presente autorização é concedida pelo prazo indicado, contado da assinatura. Eventual prorrogação e as condições da intermediação devem ser acordadas expressamente pelas partes.';
editor.innerHTML=[
'<div class="auth-mode-toolbar"><div class="auth-mode-tabs" role="group" aria-label="Modo de edição">',
'<button class="auth-mode active" type="button" id="authVisualMode" aria-pressed="true">✎ Editar na própria ficha</button>',
'<button class="auth-mode" type="button" id="authDetailsMode" aria-pressed="false">Campos detalhados</button>',
'</div><button type="button" id="authPrintVisual" class="auth-btn auth-btn-outline">Imprimir ficha / salvar PDF</button></div>',
'<p class="auth-edit-hint">Esta ficha reproduz a organização do modelo enviado. Clique nas linhas para digitar, depois use <strong>Salvar rascunho</strong>. A assinatura é feita após revisão.</p>',
'<div class="sheet-scroll"><article id="authSheetPaper" class="sheet-paper doc-original" aria-label="Autorização para venda editável">',
'<div class="doc-heading"><img src="assets/lilian-douglas-logo-verde-laranja.svg" alt="Logo Lilian e Douglas">',
'<textarea class="doc-title" data-sheet-field="titulo_documento" rows="2" maxlength="130" aria-label="Título do documento"></textarea></div>',
'<div class="doc-contract">',ta('Texto da autorização','texto_autorizacao','doc-contract-text',5),'</div>',
'<div class="doc-contract-fields">',
 line([f('Autorização concedida à','empresa_autorizada'),f('CRECI','creci_empresa')],'doc-cf-top'),
 line([f('Prazo de','prazo_meses'),' <span class="doc-static">meses a contar da assinatura.</span>'],'doc-cf-term'),
'</div>',
'<div class="doc-commission">',f('Comissão de intermediação taxada em','comissao'),'</div>',
'<h3>DESCRIÇÃO DO IMÓVEL</h3>',
'<div class="doc-table doc-property">',
 line([f('Imóvel:','imovel')],'doc-single'),
 line([f('Endereço:','endereco_imovel'),f('Município:','municipio_imovel')],'doc-address'),
 line([f('Área Total:','area_total'),f('Área Construída:','area_construida')]),
 '<div class="doc-row doc-document-line"><div class="doc-document-types"><label><input type="radio" name="_docType" value="Escritura" data-doc-type> Escritura</label><label><input type="radio" name="_docType" value="Contrato" data-doc-type> Contrato</label><label><input type="radio" name="_docType" value="Outro" data-doc-type> Outro</label></div>',
 f('Matrícula Nº:','matricula'),'</div>',
 line([f('Comarca:','comarca')],'doc-single'),
 line([f('Valor da Venda: R$','valor_venda')],'doc-single'),
'</div>',
'<div class="doc-proposal"><span>Passivo de proposta, desde que comunicada e aceita pelas partes.</span><label class="doc-proposal-checkbox"><input type="checkbox" id="sheetAcceptProposal"> Aceita propostas</label></div>',
'<h3>QUALIFICAÇÃO DO(S) PROPRIETÁRIO(S)</h3>',
'<div class="doc-table doc-owner">',
 line([f('Nome:','proprietario')],'doc-single'),
 line([f('CPF:','cpf'),f('RG:','rg'),f('Profissão:','profissao')],'doc-three'),
 line([f('Nasc.:','nascimento'),f('Estado Civil:','estado_civil')]),
 line([f('Cônjuge:','conjuge')],'doc-single'),
 line([f('CPF:','conjuge_cpf'),f('RG:','conjuge_rg'),f('Profissão:','conjuge_profissao'),f('Nasc.:','conjuge_nascimento')],'doc-four'),
 line([f('Endereço:','endereco_proprietario'),f('Município:','municipio_proprietario')],'doc-address'),
 line([f('Email:','email'),f('Tels.:','telefone')]),
 '<div class="doc-notes">',ta('Observações adicionais','observacoes','doc-notes-entry',4),'</div>',
'</div>',
'<div class="doc-dateline">',f('Local:','local_assinatura'),'<span>,</span>',f('Data:','data_assinatura'),'</div>',
'<div class="doc-firm">',
 '<div class="doc-firm-name">',f('Empresa / profissional:','empresa_autorizada'),'<span>—</span>',f('CRECI:','creci_empresa'),'</div>',
 '</div>',
'<div class="doc-signatures">',
'<div class="doc-signature"><div class="doc-signline"></div><span>Proprietário(a)</span></div>',
'<div class="doc-signature"><div class="doc-signline"></div><span>Cônjuge</span></div>',
'<div class="doc-signature"><div class="doc-signline"></div><span>Corretor(a)</span></div>',
'<div class="doc-signature doc-witness">',f('Testemunha:','testemunha1'),'</div>',
'<div class="doc-signature doc-witness">',f('Testemunha:','testemunha2'),'</div>',
'</div>',
'<div class="doc-extra">',f('Corretor(a) responsável:','corretor_responsavel'),f('CRECI:','creci_corretor'),'</div>',
'<p class="doc-disclaimer">Modelo editável — rascunho não assinado. Verifique os dados e o texto antes da formalização.</p>',
'</article></div>'
].join('');
const detailed=new Map([...detail.querySelectorAll('[name]')].map(el=>[el.name,el]));
const visualInputs=[...editor.querySelectorAll('[data-sheet-field]')];
const radioInputs=[...editor.querySelectorAll('[data-doc-type]')];
const proposal=editor.querySelector('#sheetAcceptProposal');
const buttonVisual=editor.querySelector('#authVisualMode');
const buttonDetails=editor.querySelector('#authDetailsMode');
let updating=false;
const currentMode=()=>!detail.hidden?'details':'visual';
function resize(el){
 if(el.tagName!=='TEXTAREA')return;
 el.style.height='auto';
 el.style.height=Math.max(el.scrollHeight,el.classList.contains('doc-title')?58:el.closest('.doc-notes')?96:90)+'px';
}
function updateSelection(){
 const type=detailed.get('documentacao')?.value||'Escritura';
 radioInputs.forEach(r=>{r.checked=r.value===type});
 proposal.checked=detailed.get('aceita_propostas')?.value!=='Não';
}
function syncFromDetails(){
 if(updating)return;
 updating=true;
 for(const input of visualInputs){
  const other=detailed.get(input.dataset.sheetField);
  if(other){
   const fallback=input.dataset.sheetField==='titulo_documento'?title:input.dataset.sheetField==='texto_autorizacao'?clause:'';
   if(document.activeElement!==input)input.value=other.value||fallback;
   resize(input);
  }
 }
 updateSelection();
 updating=false;
}
function syncToDetails(){
 for(const input of visualInputs){
  const other=detailed.get(input.dataset.sheetField);
  if(other&&other.value!==input.value)other.value=input.value;
 }
 const selected=radioInputs.find(x=>x.checked);
 if(selected&&detailed.has('documentacao'))detailed.get('documentacao').value=selected.value;
 if(detailed.has('aceita_propostas'))detailed.get('aceita_propostas').value=proposal.checked?'Sim':'Não';
}
visualInputs.forEach(input=>{
 const update=()=>{const other=detailed.get(input.dataset.sheetField);if(other)other.value=input.value;resize(input)};
 input.addEventListener('input',update);
 input.addEventListener('change',update);
});
radioInputs.forEach(r=>r.addEventListener('change',()=>{if(r.checked&&detailed.get('documentacao'))detailed.get('documentacao').value=r.value}));
proposal.addEventListener('change',()=>{if(detailed.get('aceita_propostas'))detailed.get('aceita_propostas').value=proposal.checked?'Sim':'Não'});
detail.addEventListener('input',e=>{if(e.target.matches('[name]'))syncFromDetails()});
detail.addEventListener('change',e=>{if(e.target.matches('[name]'))syncFromDetails()});
function setMode(mode){
 if(mode==='visual')syncFromDetails();else syncToDetails();
 const showing=mode==='visual';
 editor.querySelector('.sheet-scroll').hidden=!showing;
 editor.querySelector('.auth-edit-hint').hidden=!showing;
 detail.hidden=showing;
 buttonVisual.classList.toggle('active',showing);
 buttonDetails.classList.toggle('active',!showing);
 buttonVisual.setAttribute('aria-pressed',String(showing));
 buttonDetails.setAttribute('aria-pressed',String(!showing));
}
buttonVisual.addEventListener('click',()=>setMode('visual'));
buttonDetails.addEventListener('click',()=>setMode('details'));
editor.querySelector('#authPrintVisual').addEventListener('click',()=>{setMode('visual');visualInputs.forEach(resize);window.print()});
window.CasalAuthVisual={
 syncFromDetails,syncToDetails,setMode,
 focusField(key){
  setMode('visual');
  const target=visualInputs.find(el=>el.dataset.sheetField===key);
  if(target){target.focus();target.scrollIntoView({behavior:'smooth',block:'center'})}
 }
};
syncFromDetails();
setMode('visual');
})();