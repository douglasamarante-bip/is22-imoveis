const Data=window.IS22Data,Auth=window.IS22Auth,Site=window.IS22Settings;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=(v,p)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(v||0))+(p==='Aluguel'?' / mês':'');
let adminFilter='',importPreviewData=null;
function toast(m){const t=$('toast');if(!t)return;t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2300)}
function statusClass(p){if(['Vendido','Alugado'].includes(p.status))return['Concluído','status-done'];if(p.status==='Reservado')return['Reservado','status-reserved'];if(p.status==='Inativo')return['Inativo','status-off'];if(p.purpose==='Aluguel')return['Para alugar','status-rent'];if(p.purpose==='Lançamento')return['Lançamento','status-launch'];return['À venda','status-sale']}
function stats(){const d=Data.properties(),l=Data.leads(),a=Data.appointments();$('statTotal').textContent=d.length;$('statVenda').textContent=d.filter(x=>x.purpose==='Venda'&&x.status==='Disponível').length;$('statAluguel').textContent=d.filter(x=>x.purpose==='Aluguel'&&x.status==='Disponível').length;$('statDestaque').textContent=d.filter(x=>x.featured&&x.status==='Disponível').length;$('statLeads').textContent=l.length;$('statVisits').textContent=a.filter(x=>x.status!=='Cancelada').length}
function list(){let d=Data.properties();if(adminFilter==='Destaque')d=d.filter(x=>x.featured);else if(adminFilter)d=d.filter(x=>x.purpose===adminFilter);const q=($('adminSearch')?.value||'').toLowerCase();if(q)d=d.filter(x=>(x.title+' '+x.city+' '+x.neighborhood+' '+x.id).toLowerCase().includes(q));$('propertyTable').innerHTML=d.map(i=>{const s=statusClass(i);return `<tr><td><div class="table-property"><img src="${esc(i.image)}"><span><b>${esc(i.title)}</b><small>Ref. ${esc(i.id)}${i.premium?' · PREMIUM':''}${i.source?.name?' · IMPORTADO':''}</small></span></div></td><td>${esc(i.type)}</td><td>${esc(i.neighborhood)}<br><small>${esc(i.city)}</small></td><td><b>${money(i.price,i.purpose)}</b></td><td><span class="status-pill ${s[1]}">${esc(i.status||s[0])}</span></td><td>${i.views||0}</td><td><div class="row-actions"><button onclick="editProperty('${esc(i.id)}')">Editar</button><button onclick="duplicateProperty('${esc(i.id)}')">Duplicar</button><button class="delete" onclick="deleteProperty('${esc(i.id)}')">Excluir</button></div></td></tr>`}).join('');$('adminPropertyCards').innerHTML=d.map(i=>`<article class="admin-property-card"><img src="${esc(i.image)}"><div><h3>${esc(i.title)}</h3><p>${esc(i.neighborhood)}, ${esc(i.city)} · ${money(i.price,i.purpose)} · ${esc(i.status)}</p></div><div class="card-actions"><button class="btn btn-outline btn-sm" onclick="editProperty('${esc(i.id)}')">Editar</button><button class="btn btn-outline btn-sm" onclick="cyclePropertyStatus('${esc(i.id)}')">Status</button></div></article>`).join('')||'<div class="empty">Nenhum imóvel.</div>';stats()}
function openForm(i=null){$('propertyForm').reset();$('propId').value=i?.id||'';$('formTitle').textContent=i?'Editar imóvel':'Novo imóvel';$('propFinancing').checked=true;$('propPets').checked=true;if(i){const v=(id,val)=>{$(id).value=val??''};v('propTitle',i.title);v('propRef',i.id);v('propType',i.type);v('propPurpose',i.purpose);v('propStatus',i.status||'Disponível');v('propPrice',i.price);v('propCity',i.city);v('propNeighborhood',i.neighborhood);v('propAddress',i.address);v('propBedrooms',i.bedrooms);v('propSuites',i.suites);v('propBathrooms',i.bathrooms);v('propParking',i.parking);v('propArea',i.area);v('propCondo',i.condo);v('propIptu',i.iptu);v('propDescription',i.description);v('propAmenities',(i.amenities||[]).join(', '));$('propFeatured').checked=!!i.featured;$('propPremium').checked=!!i.premium;$('propFurnished').checked=!!i.furnished;$('propFinancing').checked=!!i.financing;$('propPets').checked=!!i.pets}$('adminModal').classList.remove('hidden')}
function editProperty(id){openForm(Data.properties().find(x=>x.id===id))}
function deleteProperty(id){if(!confirm('Excluir este imóvel do catálogo?'))return;Data.saveProperties(Data.properties().filter(x=>x.id!==id));list();toast('Imóvel excluído')}
function duplicateProperty(id){const d=Data.properties(),s=d.find(x=>x.id===id);if(!s)return;let n=1,newId;do{newId=s.id+'-C'+n++}while(d.some(x=>x.id===newId));d.unshift({...s,id:newId,title:s.title+' (cópia)',status:'Inativo',views:0});Data.saveProperties(d);list();toast('Cópia criada')}
function cyclePropertyStatus(id){const seq=['Disponível','Reservado','Vendido','Alugado','Inativo'],d=Data.properties(),i=d.findIndex(x=>x.id===id);if(i<0)return;d[i].status=seq[(seq.indexOf(d[i].status)+1)%seq.length];Data.saveProperties(d);list();toast('Status: '+d[i].status)}
async function imageData(file){if(!file)return null;return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,1400/im.width,1000/im.height),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};im.onerror=no;im.src=r.result};r.onerror=no;r.readAsDataURL(file)})}
$('propertyForm').onsubmit=async e=>{e.preventDefault();const d=Data.properties(),old=d.find(x=>x.id===$('propId').value),id=$('propId').value||$('propRef').value.trim()||'CC-'+Date.now();let image=old?.image||$('propImage').value||'',images=old?.images||[image];if($('propImageUpload').files?.[0]){image=await imageData($('propImageUpload').files[0]);images=[image,...images.filter(Boolean).filter(x=>x!==old?.image)]}const item={...old,id,title:$('propTitle').value,type:$('propType').value,purpose:$('propPurpose').value,status:$('propStatus').value,price:+$('propPrice').value,city:$('propCity').value,neighborhood:$('propNeighborhood').value,address:$('propAddress').value,bedrooms:+$('propBedrooms').value,suites:+$('propSuites').value,bathrooms:+$('propBathrooms').value,parking:+$('propParking').value,area:+$('propArea').value,condo:+$('propCondo').value,iptu:+$('propIptu').value,image,images,description:$('propDescription').value,amenities:$('propAmenities').value.split(',').map(x=>x.trim()).filter(Boolean),featured:$('propFeatured').checked,premium:$('propPremium').checked,furnished:$('propFurnished').checked,financing:$('propFinancing').checked,pets:$('propPets').checked,views:old?.views||0};const n=d.findIndex(x=>x.id===$('propId').value);if(n>=0)d[n]=item;else d.unshift(item);Data.saveProperties(d);$('adminModal').classList.add('hidden');list();toast('Imóvel salvo')};
const stages=['Novo','Contatado','Visita','Proposta','Negociação','Fechado','Perdido'];
function renderLeads(){const d=Data.leads();$('crmSummary').innerHTML=stages.slice(0,6).map(s=>`<div><small>${s}</small><strong>${d.filter(x=>x.stage===s).length}</strong></div>`).join('');$('leadList').innerHTML=d.map(l=>`<article class="lead-row"><div class="lead-avatar">${esc((l.name||'?')[0])}</div><div class="lead-main"><b>${esc(l.name||'Contato')}</b><span>${esc(l.phone||'')} · ${esc(l.source||'Site')}</span><small>${esc(l.propertyId||'Sem imóvel definido')}</small></div><select onchange="changeLeadStage('${esc(l.id)}',this.value)">${stages.map(s=>`<option ${s===l.stage?'selected':''}>${s}</option>`).join('')}</select></article>`).join('')||'<div class="empty">Nenhum lead.</div>'}
function changeLeadStage(id,stage){const d=Data.leads(),l=d.find(x=>x.id===id);if(l){l.stage=stage;Data.saveLeads(d);renderLeads()}}
function renderClients(){$('clientGrid').innerHTML=Data.leads().map(l=>`<article class="client-card"><div class="lead-avatar">${esc((l.name||'?')[0])}</div><div><b>${esc(l.name||'Cliente')}</b><span>${esc(l.phone||l.email||'')}</span><small>${esc(l.propertyId||'')}</small></div></article>`).join('')||'<div class="empty">Nenhum cliente.</div>'}
function renderAppointments(){$('appointmentList').innerHTML=Data.appointments().map(a=>`<article class="appointment-row"><div class="appointment-date"><b>${esc(a.date||'—')}</b><span>${esc(a.time||'')}</span></div><div><b>${esc(a.name)}</b><span>${esc(a.propertyId)}</span></div></article>`).join('')||'<div class="empty">Nenhum agendamento.</div>'}
function renderOwners(){$('ownerLeadList').innerHTML=Data.owners().map(o=>`<article class="owner-admin-row"><div><b>${esc(o.name)}</b><span>${esc(o.phone)}</span></div><div><b>${esc(o.type)} · ${esc(o.purpose)}</b><span>${esc(o.location)}</span></div></article>`).join('')||'<div class="empty">Nenhuma captação.</div>'}
function renderReports(){const p=Data.properties(),l=Data.leads();$('reportGrid').innerHTML=`<div class="report-card"><small>Visualizações</small><strong>${p.reduce((s,x)=>s+(+x.views||0),0)}</strong></div><div class="report-card"><small>Leads</small><strong>${l.length}</strong></div><div class="report-card"><small>Imóveis</small><strong>${p.length}</strong></div>`;$('topProperties').innerHTML=[...p].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,6).map((x,n)=>`<div><span>${n+1}</span><img src="${esc(x.image)}"><div><b>${esc(x.title)}</b><small>${x.views||0} visualizações</small></div><strong>${money(x.price,x.purpose)}</strong></div>`).join('')}
function fillLeadProperty(){if($('leadProperty'))$('leadProperty').innerHTML='<option value="">Sem imóvel definido</option>'+Data.properties().map(p=>`<option value="${esc(p.id)}">${esc(p.id)} · ${esc(p.title)}</option>`).join('')}
$('newLeadBtn')?.addEventListener('click',()=>{fillLeadProperty();$('leadForm').reset();$('leadModal').classList.remove('hidden')});$('closeLeadModal')?.addEventListener('click',()=>$('leadModal').classList.add('hidden'));$('leadForm')?.addEventListener('submit',e=>{e.preventDefault();Data.upsertLead({name:$('leadName').value,phone:$('leadPhone').value,email:$('leadEmail').value,propertyId:$('leadProperty').value,source:$('leadSource').value,stage:$('leadStage').value,notes:$('leadNotes').value});$('leadModal').classList.add('hidden');renderLeads();stats();toast('Lead salvo')});
function populateAccess(){const u=Auth.user();$('accessName').value=u.name;$('accessEmail').value=u.email;$('accessRole').value=u.role;$('accessPassword').value=''}
$('logoutBtn')?.addEventListener('click',()=>{Auth.logout();location.replace('login.html')});
function populateSettings(){if(!Site)return;const s=Site.get();document.querySelectorAll('[data-setting]').forEach(el=>{const v=Site.getPath(s,el.dataset.setting);if(el.type==='checkbox')el.checked=!!v;else el.value=v??''});[['previewLogoNavy',s.brand.logoNavy],['previewLogoWhite',s.brand.logoWhite],['previewSymbolWhite',s.brand.symbolWhite],['previewHero',s.hero.image],['previewDream',s.experience.image]].forEach(([id,src])=>{if($(id))$(id).src=src})}
// Upload real da foto de capa; a publicação é persistida no volume do Railway.
let heroPreviewUrl=null;
const heroUpload=$('uploadHero'),heroInput=$('setHeroImage'),heroPreview=$('previewHero'),heroStatus=$('heroUploadStatus');
function setHeroStatus(message,failed=false){
 if(heroStatus){heroStatus.textContent=message;heroStatus.style.color=failed?'#ad3535':'#456982'}
}
function clearHeroPreviewUrl(){
 if(heroPreviewUrl){URL.revokeObjectURL(heroPreviewUrl);heroPreviewUrl=null}
}
heroUpload?.addEventListener('change',()=>{
 clearHeroPreviewUrl();
 const file=heroUpload.files?.[0];
 if(!file){heroPreview.src=heroInput.value||Site.get().hero.image;setHeroStatus('Nenhuma foto selecionada.');return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
   heroUpload.value='';heroPreview.src=Site.get().hero.image;
   setHeroStatus('Formato não suportado. Use JPG, PNG ou WebP.',true);return
 }
 if(file.size>10*1024*1024){
   heroUpload.value='';heroPreview.src=Site.get().hero.image;
   setHeroStatus('A foto deve ter no máximo 10 MB.',true);return
 }
 heroPreviewUrl=URL.createObjectURL(file);
 heroPreview.src=heroPreviewUrl;
 setHeroStatus('Foto selecionada: '+file.name+'. Clique em Salvar alterações para publicar.');
});
heroInput?.addEventListener('change',()=>{
 if(heroUpload?.files?.length)return;
 const url=heroInput.value.trim();if(url)heroPreview.src=url;
});
window.addEventListener('casal-hero-synced',event=>{
 if(heroUpload?.files?.length || document.activeElement===heroInput)return;
 heroInput.value=event.detail.image;
 heroPreview.src=event.detail.image;
});
$('saveSiteSettings')?.addEventListener('click',async e=>{
 e.preventDefault();
 const button=$('saveSiteSettings');
 if(button.disabled)return;
 button.disabled=true;
 const previousText=button.textContent;
 button.textContent='Publicando...';
 try{
   const previous=Site.get(),s=Site.get(),done={};
   document.querySelectorAll('[data-setting]').forEach(el=>{
     const p=el.dataset.setting;if(done[p])return;done[p]=1;
     Site.setPath(s,p,el.type==='checkbox'?el.checked:el.value);
   });
   const file=heroUpload?.files?.[0];
   if(file){
     const response=await fetch('/api/site/hero',{method:'POST',credentials:'same-origin',headers:{'content-type':file.type},body:file});
     const result=await response.json().catch(()=>({}));
     if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível enviar a foto ao servidor.');
     s.hero.image=result.image;
   }else if(s.hero.image.trim()!==previous.hero.image.trim()){
     const response=await fetch('/api/site/hero',{
       method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},
       body:JSON.stringify({image:s.hero.image.trim()})
     });
     const result=await response.json().catch(()=>({}));
     if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível atualizar a imagem principal.');
     s.hero.image=result.image;
   }
   Site.publishHeroImage(s.hero.image);
   Site.save(s);
   Site.apply(s);
   heroInput.value=s.hero.image;
   heroPreview.src=s.hero.image;
   if(file){heroUpload.value='';clearHeroPreviewUrl()}
   setHeroStatus('Foto principal publicada com sucesso no site.');
   toast('Alterações salvas. Foto principal publicada no site.');
 }catch(err){
   console.error('[Casal Corretores] Falha ao salvar alterações',err);
   setHeroStatus(err.message||'Erro ao publicar foto.',true);
   alert('Não foi possível salvar a foto principal: '+(err.message||'Verifique sua conexão e faça login novamente.'));
 }finally{
   button.disabled=false;
   button.textContent=previousText;
 }
});$('resetSiteSettings')?.addEventListener('click',()=>{if(confirm('Restaurar identidade original?')){Site.reset();populateSettings();toast('Identidade restaurada')}});document.querySelectorAll('#editorNav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#editorNav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.editor-pane').forEach(x=>x.classList.toggle('active',x.dataset.editorPane===b.dataset.editorTab))});
async function importerRequest(url,opt={}){const r=await fetch(url,{...opt,credentials:'same-origin',headers:{'content-type':'application/json',...(opt.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||'Falha na importação');return d}
function importerFill(p){importPreviewData=p;$('importRef').value=p.id||p.source?.code||'';if($('importType'))$('importType').value=[...$('importType').options].some(o=>o.value===p.type)?p.type:'Imóvel';$('importTitle').value=p.title||'';$('importPurpose').value=p.purpose==='Aluguel'?'Aluguel':'Venda';$('importPrice').value=+p.price||0;$('importCity').value=p.city||'';$('importNeighborhood').value=p.neighborhood||'';$('importAddress').value=p.address||'';$('importArea').value=+p.area||0;$('importBedrooms').value=+p.bedrooms||0;$('importSuites').value=+p.suites||0;$('importBathrooms').value=+p.bathrooms||0;$('importParking').value=+p.parking||0;$('importDescription').value=p.description||'';$('importPreviewTitle').textContent=p.title||p.id;$('importPreviewSource').textContent='Cód. '+(p.id||'')+' · '+(p.address||p.city||'');$('importPhotoCount').textContent=(p.images||[]).length+' fotos';$('importPhotoStrip').innerHTML=(p.images||[]).map((x,n)=>`<img src="${esc(x)}" alt="Foto ${n+1}">`).join('');$('importSourceLink').href=p.source?.url||'#';$('importRights').checked=false;$('importPreview').classList.remove('hidden')}
async function runImporterLookup(){const input=($('importCode').value||'').trim();if(!input)return toast('Cole o link do imóvel ou digite o código');$('importLookupBtn').disabled=true;$('importLookupBtn').textContent='Lendo anúncio…';try{const d=await importerRequest('/api/import/bonanza/preview?entrada='+encodeURIComponent(input));importerFill(d.property);toast('Anúncio lido e campos preenchidos')}catch(e){alert(e.message)}finally{$('importLookupBtn').disabled=false;$('importLookupBtn').textContent='Buscar anúncio'}}$('importLookupBtn')?.addEventListener('click',runImporterLookup);$('importCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runImporterLookup()}});
$('importConfirmBtn')?.addEventListener('click',async()=>{if(!importPreviewData)return;if(!$('importRights').checked)return alert('Confirme que você tem autorização para reutilizar o conteúdo.');const entrada=importPreviewData.source?.url||importPreviewData.source?.input||importPreviewData.source?.code||importPreviewData.id;const overrides={type:$('importType').value,title:$('importTitle').value,purpose:$('importPurpose').value,price:+$('importPrice').value,city:$('importCity').value,neighborhood:$('importNeighborhood').value,address:$('importAddress').value,area:+$('importArea').value,bedrooms:+$('importBedrooms').value,suites:+$('importSuites').value,bathrooms:+$('importBathrooms').value,parking:+$('importParking').value,description:$('importDescription').value};$('importConfirmBtn').disabled=true;try{const p=Data.normalizeProperty((await importerRequest('/api/import/bonanza/import',{method:'POST',body:JSON.stringify({entrada,confirmRights:true,overrides})})).property),arr=Data.properties(),i=arr.findIndex(x=>String(x.id)===String(p.id));if(i>=0)arr[i]=p;else arr.unshift(p);Data.saveProperties(arr);list();showPanel('imoveis');toast('Imóvel importado com sucesso')}catch(e){alert(e.message)}finally{$('importConfirmBtn').disabled=false}});
function showPanel(name){document.querySelectorAll('.admin-panel').forEach(x=>x.classList.add('hidden'));$('panel-'+name)?.classList.remove('hidden');document.querySelectorAll('.sidebar-nav button').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));if(name==='imoveis')list();if(name==='leads')renderLeads();if(name==='clientes')renderClients();if(name==='agenda')renderAppointments();if(name==='captacoes')renderOwners();if(name==='relatorios')renderReports();if(name==='acessos')populateAccess();if(name==='config')populateSettings()}
document.querySelectorAll('.sidebar-nav button').forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));document.querySelectorAll('.admin-tabs button').forEach(b=>b.onclick=()=>{adminFilter=b.dataset.adminFilter;document.querySelectorAll('.admin-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');list()});$('newPropertyBtn').onclick=()=>openForm();$('newPropertyBtn2').onclick=()=>openForm();$('closeAdminModal').onclick=()=>$('adminModal').classList.add('hidden');$('cancelForm').onclick=()=>$('adminModal').classList.add('hidden');$('adminSearch').oninput=list;
window.editProperty=editProperty;window.deleteProperty=deleteProperty;window.duplicateProperty=duplicateProperty;window.cyclePropertyStatus=cyclePropertyStatus;window.changeLeadStage=changeLeadStage;
const sess=Auth.session(),u=Auth.user();if(!sess)location.replace('login.html');document.querySelectorAll('.sidebar-user b').forEach(el=>el.textContent=sess?.name||u.name);document.querySelectorAll('.sidebar-user span').forEach(el=>el.textContent=sess?.role||u.role);list();populateSettings();fillLeadProperty();window.addEventListener('is22-data-sync',()=>{list();fillLeadProperty()});