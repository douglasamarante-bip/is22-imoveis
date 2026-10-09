'use strict';
/* Registros de visita e propostas — banco SQLite no volume persistente Railway.
   Acesso administrativo autenticado; QR individual com código de acesso. */
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const QR=require('qrcode');
const PDFDocument=require('pdfkit');
const ROOT=path.resolve(process.env.DATA_DIR||process.env.UPLOAD_DIR||path.join(__dirname,'data'));
const DOC_DIR=path.join(ROOT,'visitas-documentos');
fs.mkdirSync(DOC_DIR,{recursive:true});
const db=new DatabaseSync(path.join(ROOT,'casal-visitas.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
db.exec('CREATE TABLE IF NOT EXISTS visitas (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)');
db.exec('CREATE TABLE IF NOT EXISTS visita_docs (id TEXT PRIMARY KEY, visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS visita_revisoes (id INTEGER PRIMARY KEY AUTOINCREMENT, visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at TEXT NOT NULL)');
const FIELDS=['cliente','cpf','endereco','celular','telefone','data_visita','corretor','creci','imovel_procurado','visitas_imoveis','local','data_registro','proposta_codigo','proposta_valor','proposta_pagamento','proposta_validade','proposta_detalhes','contra_valor','contra_validade','contra_detalhes','observacoes_finais','aceite','recusada','pendente','nova'];
const ATTEMPTS=new Map();
const now=()=>new Date().toISOString();
const rand=()=>crypto.randomBytes(24).toString('base64url');
const safeName=n=>String(n||'documento').replace(/[^\w.\- áéíóúâêôãõç]/gi,'_').slice(0,100);
const SECRET=String(process.env.SESSION_SECRET||'');
const BASE=String(process.env.VISIT_BASE_URL||'https://is22-app-production.up.railway.app').replace(/\/+$/,'');
const urlFor=token=>BASE+'/consulta-visita.html?t='+encodeURIComponent(token);
function hashPin(pin,salt){return crypto.scryptSync(String(pin),salt,32).toString('hex')}
function safeEq(a,b){let x=Buffer.from(a,'utf8'),y=Buffer.from(b,'utf8');return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function cookie(req,name){const match=String(req.headers.cookie||'').match(new RegExp('(?:^|;\\s*)'+name+'=([^;]*)'));return match?decodeURIComponent(match[1]):''}
function viewerCookie(token){
 const payload=Buffer.from(JSON.stringify({t:token,e:Date.now()+3600000})).toString('base64url');
 const sig=crypto.createHmac('sha256',SECRET).update(payload).digest('base64url');return payload+'.'+sig
}
function validViewer(req,token){
 if(!SECRET)return false;
 const raw=cookie(req,'casal_visita_view');const parts=raw.split('.');if(parts.length!==2)return false;
 const sig=crypto.createHmac('sha256',SECRET).update(parts[0]).digest('base64url');
 if(!safeEq(sig,parts[1]))return false;
 try{const d=JSON.parse(Buffer.from(parts[0],'base64url').toString());return d.t===token&&d.e>Date.now()}catch{return false}
}
const findId=id=>db.prepare('SELECT * FROM visitas WHERE id=? AND revoked=0').get(id);
const findToken=t=>db.prepare('SELECT * FROM visitas WHERE token=? AND revoked=0').get(t);
const docs=id=>db.prepare('SELECT id,name,mime,size,created_at FROM visita_docs WHERE visita_id=? ORDER BY created_at DESC').all(id);
function clean(body){
 const v={};for(const k of FIELDS){v[k]=['aceite','recusada','pendente','nova'].includes(k)?!!body?.[k]:String(body?.[k]??'').trim().slice(0,k.endsWith('_detalhes')?12000: k==='observacoes_finais'?7000: k==='visitas_imoveis'?6000:500)}
 return v
}
function decorate(record,share=false){
 return {id:record.id,createdAt:record.created_at,updatedAt:record.updated_at,...JSON.parse(record.data),documents:docs(record.id),...(share?{}:{shareUrl:urlFor(record.token),qrPath:'/api/visitas/'+record.id+'/qr'})}
}
function json(res,status,obj){const str=JSON.stringify(obj);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(str),'x-content-type-options':'nosniff'});res.end(str)}
function forbidden(res){json(res,401,{ok:false,error:'Faça login como administrador para acessar os registros.'})}
async function body(req,limit=7200000){let chunks=[],total=0;for await(const buf of req){total+=buf.length;if(total>limit)throw Object.assign(new Error('Arquivo ou solicitação muito grande.'),{http:413});chunks.push(buf)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
function documentResponse(req,res,id,docId,allowed){
 if(!allowed)return forbidden(res);
 const row=db.prepare('SELECT * FROM visita_docs WHERE visita_id=? AND id=?').get(id,docId);
 if(!row||!fs.existsSync(row.path))return json(res,404,{ok:false,error:'Documento não encontrado.'});
 res.writeHead(200,{'content-type':row.mime,'content-length':row.size,'cache-control':'private,no-store','content-disposition':'inline; filename="'+safeName(row.name).replace(/"/g,'')+'"','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});
 fs.createReadStream(row.path).pipe(res);
 return true;
}
async function pdfResponse(res,row){
 const info=JSON.parse(row.data);
 const pdf=new PDFDocument({size:'A4',margin:46,autoFirstPage:true,info:{Title:'Registro de visita - Casal Corretores',Author:'Casal Corretores',Subject:'Visita, proposta e contraproposta'}});
 res.writeHead(200,{'content-type':'application/pdf','cache-control':'private,no-store','content-disposition':'inline; filename="visita-'+row.id+'.pdf"','x-content-type-options':'nosniff'});
 pdf.pipe(res);
 const navy='#0E2A47',gold='#B88C53';
 function title(s){pdf.moveDown(.7).fillColor(navy).font('Helvetica-Bold').fontSize(13).text(s);pdf.moveDown(.45)}
 function field(label,value){pdf.font('Helvetica-Bold').fontSize(9).fillColor(navy).text(label+': ',{continued:true});pdf.font('Helvetica').fillColor('#243447').text(String(value||'Não informado'),{continued:false});pdf.moveDown(.48)}
 function block(label,value){title(label);pdf.font('Helvetica').fontSize(10).fillColor('#253746').text(String(value||'Não informado'),{lineGap:4});pdf.moveDown(.55)}
 function header(sub){pdf.font('Helvetica-Bold').fontSize(19).fillColor(navy).text('CASAL CORRETORES');pdf.font('Helvetica').fontSize(10).fillColor(gold).text('SONHOS EM ENDEREÇOS REAIS');pdf.moveDown(.45);pdf.moveTo(46,pdf.y).lineTo(550,pdf.y).strokeColor(gold).stroke();pdf.moveDown(.7);pdf.font('Helvetica-Bold').fontSize(16).fillColor(navy).text(sub);pdf.moveDown(.65)}
 header('REGISTRO DE VISITA A IMÓVEL');
 field('Registro',row.id);field('Data da visita',info.data_visita);field('Cliente',info.cliente);field('CPF',info.cpf);field('Endereço',info.endereco);
 field('Celular',info.celular);field('Telefone',info.telefone);field('Corretor',info.corretor);field('CRECI',info.creci);field('Imóvel procurado',info.imovel_procurado);
 if(info.visitas_imoveis){
  try{const rows=JSON.parse(info.visitas_imoveis);if(Array.isArray(rows)&&rows.length){title('IMÓVEIS VISITADOS');rows.forEach(r=>{pdf.font('Helvetica').fontSize(8.5).fillColor('#253746').text(r.filter(Boolean).join('  |  '),{lineGap:2});pdf.moveDown(.3)})}}catch{}
 }
 field('Local e data',String(info.local||'')+' - '+String(info.data_registro||''));
 title('CIÊNCIA DA INTERMEDIAÇÃO');
 pdf.font('Helvetica').fontSize(9.2).fillColor('#273748').text('O interessado declara ter recebido atendimento e informações sobre o(s) imóvel(is) indicado(s). Este registro não substitui proposta aceita, promessa de compra e venda nem instrumento específico de corretagem. As condições e obrigações devem ser formalizadas pelas partes.',{lineGap:4});
 pdf.moveDown(3);pdf.font('Helvetica').fontSize(10).text('_____________________________________        _____________________________________',{align:'center'});pdf.fontSize(9).text('Cliente                                                               Corretor(a)',{align:'center'});
 pdf.addPage();header('PROPOSTA E CONTRAPROPOSTA');
 field('Imóvel / Código',info.proposta_codigo);field('Valor ofertado',info.proposta_valor);field('Forma de pagamento',info.proposta_pagamento);field('Validade da proposta',info.proposta_validade);
 block('PROPOSTA DO CLIENTE',info.proposta_detalhes);
 field('Valor da contraproposta',info.contra_valor);field('Validade da contraproposta',info.contra_validade);
 block('CONTRAPROPOSTA DO PROPRIETÁRIO',info.contra_detalhes);
 field('Situação',[info.aceite?'Aceita':'',info.recusada?'Recusada':'',info.pendente?'Pendente':'',info.nova?'Nova negociação':''].filter(Boolean).join(', ')||'Não informada');
 block('OBSERVAÇÕES FINAIS',info.observacoes_finais);
 if(pdf.y>635)pdf.addPage();
 pdf.moveDown(.6);pdf.fontSize(9).fillColor(navy).text('CONSULTA DIGITAL — QR CODE INDIVIDUAL (EXIGE CÓDIGO DE ACESSO)');
 const q=await QR.toBuffer(urlFor(row.token),{type:'png',margin:1,width:220,errorCorrectionLevel:'M'});
 if(pdf.y>690)pdf.addPage();
 pdf.image(q,46,pdf.y+7,{width:92,height:92});pdf.fillColor('#334155').font('Helvetica').fontSize(8).text('Escaneie o código para consultar o registro salvo.',150,pdf.y+25,{width:370});pdf.text('Por segurança, informe também o código de acesso.',150,pdf.y+10,{width:370});
 pdf.end();
}
function canRead(req,row,isAdmin){return !!row&&(isAdmin||validViewer(req,row.token))}
function failLock(req,token){
 const key=(req.socket.remoteAddress||'remote')+':'+token;
 const timestamp=Date.now();const previous=ATTEMPTS.get(key);if(previous&&timestamp-previous.since<900000)return {key,n:previous.n};return {key,n:0}
}
async function route(req,res,url,{isAdmin=false}={}){
 const p=url.pathname; if(!p.startsWith('/api/visitas'))return false;
 try{
 if(p==='/api/visitas'&&req.method==='GET'){
  if(!isAdmin)return forbidden(res);
  const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
  const all=db.prepare('SELECT id, data, created_at, updated_at FROM visitas WHERE revoked=0 ORDER BY updated_at DESC LIMIT 400').all();
  const list=all.map(v=>{const d=JSON.parse(v.data);return {id:v.id,cliente:d.cliente,imovel:d.proposta_codigo||d.imovel_procurado,status:d.aceite?'Aceita':d.recusada?'Recusada':d.pendente?'Pendente':'Em negociação',createdAt:v.created_at,updatedAt:v.updated_at}});
  return json(res,200,{ok:true,records:q?list.filter(v=>JSON.stringify(v).toLowerCase().includes(q)):list});
 }
 if(p==='/api/visitas'&&req.method==='POST'){
  if(!isAdmin)return forbidden(res);
  const data=clean(await body(req,100000));
  if(!data.cliente||(!data.imovel_procurado&&!data.proposta_codigo))return json(res,400,{ok:false,error:'Preencha nome do cliente e identificação do imóvel.'});
  const id='CV-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const token=rand(),pin=String(crypto.randomInt(0,100000000)).padStart(8,'0'),salt=crypto.randomBytes(16).toString('hex'),created=now();
  db.prepare('INSERT INTO visitas (id,token,pin_salt,pin_hash,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id,token,salt,hashPin(pin,salt),JSON.stringify(data),created,created);
  return json(res,201,{ok:true,record:decorate(findId(id)),accessPin:pin});
 }
 const pub=p.match(/^\/api\/visitas\/consulta\/([A-Za-z0-9_-]+)(?:\/(pdf|documentos\/[A-Za-z0-9_-]+))?$/);
 if(pub){
  const row=findToken(pub[1]);if(!row)return json(res,404,{ok:false,error:'Registro não encontrado ou acesso revogado.'});
  if(!pub[2]&&req.method==='POST'){
   const attempts=failLock(req,row.token);if(attempts.n>=6)return json(res,429,{ok:false,error:'Muitas tentativas. Aguarde 15 minutos.'});
   const data=await body(req,2000);const pin=String(data.pin||'');
   if(!/^\d{8}$/.test(pin)||!safeEq(hashPin(pin,row.pin_salt),row.pin_hash)){
    ATTEMPTS.set(attempts.key,{n:attempts.n+1,since:Date.now()});
    return json(res,403,{ok:false,error:'Código de acesso incorreto.'});
   }
   ATTEMPTS.delete(attempts.key);
   res.setHeader('Set-Cookie','casal_visita_view='+encodeURIComponent(viewerCookie(row.token))+'; Path=/api/visitas/consulta/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600');
   return json(res,200,{ok:true,record:decorate(row,true)});
  }
  if(!canRead(req,row,isAdmin))return json(res,401,{ok:false,error:'Informe o código de acesso para consultar o registro.'});
  if(!pub[2]&&req.method==='GET')return json(res,200,{ok:true,record:decorate(row,true)});
  if(pub[2]==='pdf'&&req.method==='GET')return await pdfResponse(res,row),true;
  if(pub[2]?.startsWith('documentos/')&&req.method==='GET')return documentResponse(req,res,row.id,pub[2].split('/')[1],true);
  return json(res,405,{ok:false,error:'Método não permitido.'});
 }
 const match=p.match(/^\/api\/visitas\/([A-Za-z0-9_-]+)(?:\/(pdf|qr|pin|documentos|documentos\/[A-Za-z0-9_-]+))?$/);
 if(!match)return false;
 if(!isAdmin)return forbidden(res);
 const row=findId(match[1]);if(!row)return json(res,404,{ok:false,error:'Registro não encontrado.'});
 const extra=match[2];
 if(!extra&&req.method==='GET'){
  const revisions=db.prepare('SELECT created_at FROM visita_revisoes WHERE visita_id=? ORDER BY created_at DESC LIMIT 30').all(row.id);
  return json(res,200,{ok:true,record:decorate(row),revisions});
 }
 if(!extra&&req.method==='PUT'){
  const updated=clean(await body(req,100000));
  if(!updated.cliente)return json(res,400,{ok:false,error:'Informe o nome do cliente.'});
  const at=now();db.exec('BEGIN');
  try{db.prepare('INSERT INTO visita_revisoes(visita_id,data,created_at) VALUES (?,?,?)').run(row.id,row.data,at);
  db.prepare('UPDATE visitas SET data=?,updated_at=? WHERE id=?').run(JSON.stringify(updated),at,row.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return json(res,200,{ok:true,record:decorate(findId(row.id))});
 }
 if(extra==='pin'&&req.method==='POST'){
  const pin=String(crypto.randomInt(0,100000000)).padStart(8,'0'),salt=crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE visitas SET pin_salt=?,pin_hash=?,updated_at=? WHERE id=?').run(salt,hashPin(pin,salt),now(),row.id);
  return json(res,200,{ok:true,accessPin:pin,record:decorate(findId(row.id))});
 }
 if(extra==='qr'&&req.method==='GET'){
  const svg=await QR.toString(urlFor(row.token),{type:'svg',margin:2,width:310,errorCorrectionLevel:'M'});
  res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'private,no-store','x-content-type-options':'nosniff'});
  return res.end(svg);
 }
 if(extra==='pdf'&&req.method==='GET')return await pdfResponse(res,row),true;
 if(extra==='documentos'&&req.method==='POST'){
  const item=await body(req,7500000);
  const mime=String(item.mime||'');if(!['application/pdf','image/png','image/jpeg'].includes(mime))return json(res,400,{ok:false,error:'Envie somente PDF, PNG ou JPG.'});
  const raw=String(item.base64||'');if(raw.length>7200000||!/^[a-zA-Z0-9+/\r\n]*={0,2}$/.test(raw))return json(res,400,{ok:false,error:'Arquivo inválido ou grande demais.'});
  const file=Buffer.from(raw,'base64');
  if(file.length>5*1024*1024||file.length<8)return json(res,400,{ok:false,error:'Arquivo precisa ter até 5 MB.'});
  if(mime==='application/pdf'&&file.subarray(0,5).toString()!=='%PDF-')return json(res,400,{ok:false,error:'PDF inválido.'});
  if(mime==='image/png'&&file.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return json(res,400,{ok:false,error:'PNG inválido.'});
  if(mime==='image/jpeg'&&file.subarray(0,3).toString('hex')!=='ffd8ff')return json(res,400,{ok:false,error:'JPEG inválido.'});
  const id=crypto.randomUUID(),filename=id+({ 'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[mime]);
  const pth=path.join(DOC_DIR,filename);fs.writeFileSync(pth,file,{flag:'wx',mode:0o600});
  db.prepare('INSERT INTO visita_docs(id,visita_id,name,mime,size,path,created_at) VALUES (?,?,?,?,?,?,?)').run(id,row.id,safeName(item.name||filename),mime,file.length,pth,now());
  return json(res,201,{ok:true,documents:docs(row.id)});
 }
 if(extra?.startsWith('documentos/')&&req.method==='GET')return documentResponse(req,res,row.id,extra.split('/')[1],true);
 if(extra?.startsWith('documentos/')&&req.method==='DELETE'){
  const did=extra.split('/')[1];const doc=db.prepare('SELECT * FROM visita_docs WHERE id=? AND visita_id=?').get(did,row.id);
  if(!doc)return json(res,404,{ok:false,error:'Documento não encontrado.'});
  db.prepare('DELETE FROM visita_docs WHERE id=?').run(did);try{fs.unlinkSync(doc.path)}catch{}
  return json(res,200,{ok:true,documents:docs(row.id)});
 }
 return json(res,405,{ok:false,error:'Método não permitido.'});
 }catch(e){if(!res.headersSent)return json(res,e.http||500,{ok:false,error:e.http?'Arquivo grande demais.':'Não foi possível processar o registro.'});console.error('[VISIT PDF]',e.message)}
}
module.exports={route};