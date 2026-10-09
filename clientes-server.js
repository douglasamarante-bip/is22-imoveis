'use strict';
// Casal Corretores — fichas de clientes no volume persistente do Railway.
// Acesso administrativo obrigatório; consulta QR mediante código de acesso separado.
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const QR=require('qrcode');
const PDFDocument=require('pdfkit');
const ROOT=path.resolve(process.env.DATA_DIR||process.env.UPLOAD_DIR||path.join(__dirname,'data'));
const DIR=path.join(ROOT,'clientes-documentos');
fs.mkdirSync(DIR,{recursive:true});
const db=new DatabaseSync(path.join(ROOT,'casal-clientes.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
db.exec('CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0)');
db.exec('CREATE TABLE IF NOT EXISTS cliente_docs (id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, path TEXT NOT NULL, shared INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS cliente_history (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE, data TEXT NOT NULL, changed_at TEXT NOT NULL)');
const FIELDS=[
'nome','cpf','nascimento','telefone','outro_telefone','email','endereco','cidade','uf',
'origem','tipo_cliente','objetivo','tipo_imovel','localizacao_interesse','bairros','codigo_imovel',
'valor_min','valor_max','quartos','vagas','area_min','forma_pagamento','financiamento',
'prazo','etapa','corretor','data_ultimo_contato','proximo_contato',
'observacoes_compartilhaveis','notas_internas','aceite_privacidade'
];
const SHARED_FIELDS=FIELDS.filter(k=>!['cpf','nascimento','endereco','notas_internas','aceite_privacidade'].includes(k));
const BOOL=new Set(['aceite_privacidade','financiamento']);
const now=()=>new Date().toISOString();
const BASE=String(process.env.CLIENT_BASE_URL||'https://is22-app-production.up.railway.app').replace(/\/+$/,'');
const SECRET=String(process.env.SESSION_SECRET||'');
const ATTEMPTS=new Map();
function json(res,status,obj){const data=JSON.stringify(obj);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(data),'cache-control':'private,no-store','x-content-type-options':'nosniff'});res.end(data);}
function b64(s){return Buffer.from(s).toString('base64url')}
function eq(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function digest(pin,salt){return crypto.scryptSync(String(pin),salt,32).toString('hex')}
function randomPin(){return String(crypto.randomInt(0,100000000)).padStart(8,'0')}
function shareUrl(token){return BASE+'/consulta-cliente.html?t='+encodeURIComponent(token)}
function cookies(req,name){const s=String(req.headers.cookie||'');const m=s.match(new RegExp('(?:^|;\\s*)'+name+'=([^;]*)'));return m?decodeURIComponent(m[1]):''}
function issueSession(row){const data=b64(JSON.stringify({token:row.token,check:row.pin_hash,exp:Date.now()+1800000}));const sig=crypto.createHmac('sha256',SECRET).update(data).digest('base64url');return data+'.'+sig}
function viewerAuthorized(req,row){
 if(!SECRET)return false;
 const [data,sig]=cookies(req,'casal_cliente_view').split('.');
 if(!data||!sig)return false;
 const expected=crypto.createHmac('sha256',SECRET).update(data).digest('base64url');
 if(!eq(sig,expected))return false;
 try{const x=JSON.parse(Buffer.from(data,'base64url'));return x.token===row.token&&x.check===row.pin_hash&&x.exp>Date.now()}catch{return false}
}
function sanitize(b){
 const d={};
 for(const key of FIELDS){const value=b?.[key];d[key]=BOOL.has(key)?value===true:String(value??'').trim().slice(0,key.endsWith('internas')||key.startsWith('observacoes')?7000:1200)}
 return d;
}
function validate(d){if(d.nome.length<3)throw Object.assign(new Error('Informe o nome completo do cliente.'),{status:400});if(!d.telefone&&!d.email)throw Object.assign(new Error('Informe telefone ou e-mail.'),{status:400});if(d.email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||d.email.length>200))throw Object.assign(new Error('E-mail inválido.'),{status:400});if(d.cpf&&d.cpf.replace(/\D/g,'').length!==11)throw Object.assign(new Error('CPF deve ter 11 dígitos ou ficar em branco.'),{status:400});}
function byId(id){return db.prepare('SELECT * FROM clientes WHERE id=? AND archived=0').get(id)}
function byToken(token){return db.prepare('SELECT * FROM clientes WHERE token=? AND archived=0').get(token)}
function docs(id,publicOnly=false){const q=publicOnly?' AND shared=1':'';return db.prepare('SELECT id,name,mime,size,shared,created_at FROM cliente_docs WHERE cliente_id=?'+q+' ORDER BY created_at DESC').all(id)}
function view(row,admin){
 const d=JSON.parse(row.data),payload={id:row.id,createdAt:row.created_at,updatedAt:row.updated_at};
 for(const key of (admin?FIELDS:SHARED_FIELDS))payload[key]=d[key];
 payload.documents=docs(row.id,!admin);
 if(admin){payload.shareUrl=shareUrl(row.token);payload.qrUrl='/api/clientes/'+row.id+'/qr'}
 return payload;
}
async function readBody(req,maxBytes=120000){
 const chunks=[];let size=0;
 for await (const c of req){size+=c.length;if(size>maxBytes)throw Object.assign(new Error('Envio acima do limite.'),{status:413});chunks.push(c)}
 try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw Object.assign(new Error('JSON inválido.'),{status:400})}
}
const mimeExt={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png'};
function docResponse(res,row,did,publicOnly){
 const item=db.prepare('SELECT * FROM cliente_docs WHERE id=? AND cliente_id=?').get(did,row.id);
 if(!item||(publicOnly&&!item.shared)||!fs.existsSync(item.path))return json(res,404,{ok:false,error:'Documento não encontrado.'});
 const safe=String(item.name).replace(/["\r\n\\]/g,'_');
 res.writeHead(200,{'content-type':item.mime,'content-length':item.size,'cache-control':'private,no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; sandbox",'content-disposition':'attachment; filename="'+safe+'"'});
 fs.createReadStream(item.path).pipe(res);return true;
}
async function pdfResponse(res,row,admin){
 const d=view(row,admin),doc=new PDFDocument({size:'A4',margin:44,info:{Title:'Ficha de cliente - Casal Corretores',Author:'Casal Corretores'}});
 res.writeHead(200,{'content-type':'application/pdf','cache-control':'private,no-store','content-disposition':'attachment; filename="ficha-'+row.id+'.pdf"','x-content-type-options':'nosniff'});
 doc.pipe(res);
 const navy='#0E2A47',gold='#BA9057',muted='#3A4B5E';
 function heading(text){doc.moveDown(.65).font('Helvetica-Bold').fontSize(12).fillColor(navy).text(text);doc.moveDown(.35)}
 function field(label,value){doc.font('Helvetica-Bold').fontSize(9).fillColor(navy).text(label+': ',{continued:true});doc.font('Helvetica').fillColor(muted).text(String(value===true?'Sim':value===false?'Não':value||'—'));doc.moveDown(.34)}
 function block(label,value){heading(label);doc.font('Helvetica').fontSize(10).fillColor(muted).text(String(value||'—'),{lineGap:3});doc.moveDown(.25)}
 doc.font('Helvetica-Bold').fontSize(21).fillColor(navy).text('CASAL CORRETORES');doc.font('Helvetica').fontSize(10).fillColor(gold).text('SONHOS EM ENDEREÇOS REAIS');
 doc.moveDown(.5).strokeColor(gold).moveTo(44,doc.y).lineTo(550,doc.y).stroke();
 doc.moveDown(.6).font('Helvetica-Bold').fontSize(17).fillColor(navy).text('FICHA DE CLIENTE');
 field('Registro',row.id);field('Atualizado em',new Date(row.updated_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}));
 heading('IDENTIFICAÇÃO E CONTATO');field('Nome completo',d.nome);
 if(admin){field('CPF',d.cpf);field('Nascimento',d.nascimento)}
 field('Telefone / WhatsApp',d.telefone);field('Outro telefone',d.outro_telefone);field('E-mail',d.email);
 if(admin)field('Endereço',d.endereco);
 field('Cidade e UF',[d.cidade,d.uf].filter(Boolean).join(' - '));field('Origem do contato',d.origem);
 heading('PERFIL E PREFERÊNCIAS');
 [['Perfil',d.tipo_cliente],['Objetivo',d.objetivo],['Imóvel desejado',d.tipo_imovel],['Região',d.localizacao_interesse],['Bairros',d.bairros],['Código de referência',d.codigo_imovel],['Valor mínimo',d.valor_min],['Valor máximo',d.valor_max],['Quartos',d.quartos],['Vagas',d.vagas],['Área mínima (m²)',d.area_min],['Pagamento',d.forma_pagamento],['Financiamento',d.financiamento?'Sim':'Não'],['Prazo',d.prazo]].forEach(([k,v])=>field(k,v));
 heading('ACOMPANHAMENTO');field('Etapa',d.etapa);field('Corretor responsável',d.corretor);field('Último contato',d.data_ultimo_contato);field('Próximo contato',d.proximo_contato);
 block('OBSERVAÇÕES COMPARTILHÁVEIS',d.observacoes_compartilhaveis);
 if(admin)block('OBSERVAÇÕES INTERNAS (NÃO COMPARTILHAR)',d.notas_internas);
 if(doc.y>630)doc.addPage();
 heading('CONSULTA DIGITAL DA FICHA');
 doc.font('Helvetica').fontSize(9).fillColor(muted).text('O QR Code abre a consulta protegida por código de oito dígitos. Não divulgue o código publicamente.');
 const png=await QR.toBuffer(shareUrl(row.token),{type:'png',width:250,margin:2,errorCorrectionLevel:'M'});
 if(doc.y>640)doc.addPage();doc.moveDown(.55);doc.image(png,44,doc.y,{width:94});doc.moveDown(7);
 doc.font('Helvetica').fontSize(8).text('Documento gerado digitalmente. Não constitui assinatura eletrônica ou comprovante de identidade.');
 doc.end();return true;
}
async function route(req,res,url,{isAdmin=false}={}){
 const p=url.pathname;if(!p.startsWith('/api/clientes'))return false;
 try{
  if(p==='/api/clientes'&&req.method==='GET'){
   if(!isAdmin)return json(res,401,{ok:false,error:'Acesse o painel administrativo para consultar clientes.'});
   const q=String(url.searchParams.get('q')||'').toLowerCase().slice(0,200);
   const all=db.prepare('SELECT id,data,created_at,updated_at FROM clientes WHERE archived=0 ORDER BY updated_at DESC LIMIT 500').all();
   let items=all.map(r=>{const d=JSON.parse(r.data);return{id:r.id,nome:d.nome,telefone:d.telefone,email:d.email,etapa:d.etapa,objetivo:d.objetivo,corretor:d.corretor,proximo_contato:d.proximo_contato,updatedAt:r.updated_at}});
   if(q)items=items.filter(v=>Object.values(v).some(s=>String(s||'').toLowerCase().includes(q)));
   return json(res,200,{ok:true,clients:items});
  }
  if(p==='/api/clientes'&&req.method==='POST'){
   if(!isAdmin)return json(res,401,{ok:false,error:'Acesso administrativo necessário.'});
   const data=sanitize(await readBody(req));validate(data);
   const id='CL-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
   const token=crypto.randomBytes(32).toString('base64url'),pin=randomPin(),salt=crypto.randomBytes(16).toString('hex'),when=now();
   db.prepare('INSERT INTO clientes(id,token,pin_salt,pin_hash,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id,token,salt,digest(pin,salt),JSON.stringify(data),when,when);
   return json(res,201,{ok:true,client:view(byId(id),true),accessPin:pin});
  }
  const publicPath=p.match(/^\/api\/clientes\/consulta\/([A-Za-z0-9_-]+)(?:\/(pdf|documentos\/[A-Za-z0-9_-]+))?$/);
  if(publicPath){
   const row=byToken(publicPath[1]);if(!row)return json(res,404,{ok:false,error:'Ficha não encontrada ou link expirado.'});
   if(!publicPath[2]&&req.method==='POST'){
    if(!SECRET)return json(res,503,{ok:false,error:'Consulta indisponível no momento.'});
    const key=(req.socket.remoteAddress||'unknown')+':'+row.token,prior=ATTEMPTS.get(key),stamp=Date.now(),attempts=prior&&stamp-prior.since<900000?prior:{count:0,since:stamp};
    if(attempts.count>=6)return json(res,429,{ok:false,error:'Muitas tentativas. Tente novamente em 15 minutos.'});
    const b=await readBody(req,2000),pin=String(b.pin||'');
    if(!/^\d{8}$/.test(pin)||!eq(digest(pin,row.pin_salt),row.pin_hash)){
     ATTEMPTS.set(key,{count:attempts.count+1,since:attempts.since});
     return json(res,403,{ok:false,error:'Código incorreto.'});
    }
    ATTEMPTS.delete(key);
    res.setHeader('Set-Cookie','casal_cliente_view='+encodeURIComponent(issueSession(row))+'; Path=/api/clientes/consulta/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800');
    return json(res,200,{ok:true,client:view(row,false)});
   }
   if(!(isAdmin||viewerAuthorized(req,row)))return json(res,401,{ok:false,error:'Informe o código de acesso para consultar esta ficha.'});
   if(!publicPath[2]&&req.method==='GET')return json(res,200,{ok:true,client:view(row,false)});
   if(publicPath[2]==='pdf'&&req.method==='GET')return await pdfResponse(res,row,false);
   if(publicPath[2]?.startsWith('documentos/')&&req.method==='GET')return docResponse(res,row,publicPath[2].split('/')[1],true);
   return json(res,405,{ok:false,error:'Método não permitido.'});
  }
  const match=p.match(/^\/api\/clientes\/([A-Za-z0-9_-]+)(?:\/(pdf|qr|pin|documentos|documentos\/[A-Za-z0-9_-]+))?$/);
  if(!match)return false;
  if(!isAdmin)return json(res,401,{ok:false,error:'Faça login para acessar clientes.'});
  const row=byId(match[1]);if(!row)return json(res,404,{ok:false,error:'Ficha não encontrada.'});
  const op=match[2];
  if(!op&&req.method==='GET'){
   const changes=db.prepare('SELECT changed_at FROM cliente_history WHERE cliente_id=? ORDER BY id DESC LIMIT 20').all(row.id);
   return json(res,200,{ok:true,client:view(row,true),history:changes});
  }
  if(!op&&req.method==='PUT'){
   const data=sanitize(await readBody(req));validate(data);
   db.exec('BEGIN');
   try{
    db.prepare('INSERT INTO cliente_history(cliente_id,data,changed_at) VALUES (?,?,?)').run(row.id,row.data,now());
    db.prepare('UPDATE clientes SET data=?,updated_at=? WHERE id=?').run(JSON.stringify(data),now(),row.id);
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e}
   return json(res,200,{ok:true,client:view(byId(row.id),true)});
  }
  if(!op&&req.method==='DELETE'){
   db.prepare('UPDATE clientes SET archived=1,updated_at=? WHERE id=?').run(now(),row.id);
   return json(res,200,{ok:true});
  }
  if(op==='pin'&&req.method==='POST'){
   const pin=randomPin(),salt=crypto.randomBytes(16).toString('hex');
   db.prepare('UPDATE clientes SET pin_salt=?,pin_hash=?,updated_at=? WHERE id=?').run(salt,digest(pin,salt),now(),row.id);
   return json(res,200,{ok:true,accessPin:pin,client:view(byId(row.id),true)});
  }
  if(op==='qr'&&req.method==='GET'){
   const svg=await QR.toString(shareUrl(row.token),{type:'svg',width:260,margin:2});
   res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'private,no-store','x-content-type-options':'nosniff'});
   res.end(svg);return true;
  }
  if(op==='pdf'&&req.method==='GET')return await pdfResponse(res,row,true);
  if(op==='documentos'&&req.method==='POST'){
   const input=await readBody(req,7300000),mime=String(input.mime||'');
   if(!mimeExt[mime])return json(res,400,{ok:false,error:'Formato permitido: PDF, PNG ou JPEG.'});
   const encoded=String(input.base64||'');
   if(!/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(encoded))return json(res,400,{ok:false,error:'Conteúdo inválido.'});
   const file=Buffer.from(encoded,'base64');
   if(file.length<8||file.length>5*1024*1024)return json(res,400,{ok:false,error:'Arquivo deve ter até 5 MB.'});
   const magic=file.subarray(0,8).toString('hex');
   if((mime==='application/pdf'&&file.subarray(0,5).toString()!=='%PDF-')||(mime==='image/jpeg'&&!magic.startsWith('ffd8ff'))||(mime==='image/png'&&magic!=='89504e470d0a1a0a'))return json(res,400,{ok:false,error:'Arquivo inválido.'});
   const id=crypto.randomUUID(),filePath=path.join(DIR,id+mimeExt[mime]);
   fs.writeFileSync(filePath,file,{flag:'wx',mode:0o600});
   const filename=path.basename(String(input.name||'documento')).replace(/[\r\n"\\]/g,'_').slice(0,90);
   db.prepare('INSERT INTO cliente_docs(id,cliente_id,name,mime,size,path,shared,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,row.id,filename,mime,file.length,filePath,0,now());
   return json(res,201,{ok:true,documents:docs(row.id)});
  }
  const docMatch=op?.match(/^documentos\/([A-Za-z0-9_-]+)$/);
  if(docMatch){
   const d=db.prepare('SELECT * FROM cliente_docs WHERE id=? AND cliente_id=?').get(docMatch[1],row.id);
   if(!d)return json(res,404,{ok:false,error:'Documento não encontrado.'});
   if(req.method==='GET')return docResponse(res,row,d.id,false);
   if(req.method==='PATCH'){
    const body=await readBody(req,2000);db.prepare('UPDATE cliente_docs SET shared=? WHERE id=?').run(body.shared===true?1:0,d.id);
    return json(res,200,{ok:true,documents:docs(row.id)});
   }
   if(req.method==='DELETE'){
    db.prepare('DELETE FROM cliente_docs WHERE id=?').run(d.id);try{fs.unlinkSync(d.path)}catch{}
    return json(res,200,{ok:true,documents:docs(row.id)});
   }
  }
  return json(res,405,{ok:false,error:'Método não permitido.'});
 }catch(err){console.error('[CLIENTES]',err.message);if(!res.headersSent)return json(res,err.status||500,{ok:false,error:err.status?err.message:'Não foi possível processar a ficha.'});return true}
}
module.exports={route};
