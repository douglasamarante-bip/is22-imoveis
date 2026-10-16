'use strict';
// Autorização de venda: dados privados no SQLite persistente, PDFs para conferência/assinatura.
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const PDFDocument=require('pdfkit');
const {drawAuthorizationBrand}=require('./pdf-brand');

const ROOT=path.resolve(process.env.DATA_DIR||process.env.UPLOAD_DIR||path.join(__dirname,'data'));
fs.mkdirSync(ROOT,{recursive:true});
const db=new DatabaseSync(path.join(ROOT,'casal-autorizacoes.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec('CREATE TABLE IF NOT EXISTS autorizacoes (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
const now=()=>new Date().toISOString();
const FIELDS=[
 'titulo_documento','texto_autorizacao',
 'empresa_autorizada','creci_empresa','prazo_meses','comissao','imovel','endereco_imovel',
 'municipio_imovel','area_total','area_construida','documentacao','matricula','comarca',
 'valor_venda','aceita_propostas','proprietario','cpf','rg','profissao','nascimento',
 'estado_civil','conjuge','conjuge_cpf','conjuge_rg','conjuge_profissao','conjuge_nascimento',
 'endereco_proprietario','municipio_proprietario','email','telefone','local_assinatura',
 'data_assinatura','corretor_responsavel','creci_corretor','testemunha1','testemunha2',
 'observacoes'
];
const DEFAULTS={
 titulo_documento:'AUTORIZAÇÃO PARA VENDA DE IMÓVEIS\nURBANOS E RURAIS',
 texto_autorizacao:"Pelo presente instrumento particular, o(s) proprietário(s) abaixo qualificado(s) autoriza(m) a empresa ou profissional identificado(a) neste documento a divulgar e promover a venda do imóvel descrito, inclusive por anúncios e visitas, pelo prazo e comissão acordados. Eventual renovação deverá ser expressamente acertada pelas partes.",
 empresa_autorizada:'',creci_empresa:'',prazo_meses:'',comissao:'',
 aceita_propostas:'Sim',documentacao:'Escritura',local_assinatura:'Conselheiro Lafaiete - MG'
};
function clean(input){
 const d={...DEFAULTS};
 for(const k of FIELDS){
  const max=k==='texto_autorizacao'?4000:k==='titulo_documento'?130:k==='observacoes'?2500:500;
  d[k]=String(input?.[k]??DEFAULTS[k]??'').trim().slice(0,max);
 }
 if(!['Escritura','Contrato','Outro'].includes(d.documentacao))d.documentacao='Outro';
 if(!['Sim','Não'].includes(d.aceita_propostas))d.aceita_propostas='Não';
 return d;
}
function json(res,status,data){
 const body=JSON.stringify(data);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'private,no-store',
 'content-length':Buffer.byteLength(body),'x-content-type-options':'nosniff'});
 res.end(body);return true;
}
function forbidden(res){return json(res,401,{ok:false,error:'Acesso restrito ao administrador.'})}
async function read(req){
 let chunks=[],total=0;
 for await(const chunk of req){
  total+=chunk.length;
  if(total>35000)throw Object.assign(new Error('Dados excedem o tamanho permitido.'),{http:413});
  chunks.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
 catch{throw Object.assign(new Error('JSON inválido.'),{http:400})}
}
function view(row){
 return {id:row.id,createdAt:row.created_at,updatedAt:row.updated_at,...JSON.parse(row.data)};
}
function find(id){return db.prepare('SELECT * FROM autorizacoes WHERE id=?').get(id)}
function text(v){return String(v||'Não informado')}
function pdfPage(pdf){
 const previousY=pdf.y,previousX=pdf.x,width=pdf.page.width;
 pdf.font('Helvetica').fontSize(8).fillColor('#728076')
   .text('Casal Corretores  |  Modelo para conferência jurídica e assinatura manuscrita',43,pdf.page.height-76,
     {width:width-86,align:'center'});
 pdf.x=previousX;
 pdf.y=previousY;
}
function section(pdf,label){
 pdf.moveDown(0.6);
 pdf.font('Helvetica-Bold').fontSize(11).fillColor('#16642F').text(label);
 pdf.moveDown(0.35);
}
function editableField(pdf,label,x,y,width,height,value,fontSize=9){
 pdf._authorizationFormCount=(pdf._authorizationFormCount||0)+1;
 const name='autorizacao.campo_'+pdf._authorizationFormCount;
 pdf.font('Helvetica');
 pdf.formText(name,x,y,Math.max(24,width),height,{
  value:String(value??''),defaultValue:String(value??''),
  fontSize,align:'left',noSpell:true,borderColor:'#FFFFFF'
 });
}
function line(pdf,label,value){
 const x=44,y=pdf.y,total=pdf.page.width-88;
 pdf.font('Helvetica-Bold').fontSize(9).fillColor('#214A30');
 if(label==='Registro'){
  pdf.text('Registro: '+String(value||''),x,y,{lineBreak:false});
 }else{
  const title=label+':';
  const lw=Math.min(total*.57,Math.max(65,pdf.widthOfString(title)+11));
  pdf.text(title,x,y,{lineBreak:false});
  editableField(pdf,label,x+lw,y-1,total-lw-4,17,value,9);
 }
 pdf.y=Math.max(pdf.y,y+19);
}
function pair(pdf,leftLabel,leftValue,rightLabel,rightValue){
 const x=44,gap=10,w=(pdf.page.width-88-gap)/2,y=pdf.y;
 pdf.font('Helvetica-Bold').fontSize(8.5).fillColor('#214A30')
   .text(leftLabel+':',x,y,{width:w,lineBreak:false});
 editableField(pdf,leftLabel,x,y+12,w-6,17,leftValue,9);
 pdf.font('Helvetica-Bold').fontSize(8.5).fillColor('#214A30')
   .text(rightLabel+':',x+w+gap,y,{width:w,lineBreak:false});
 editableField(pdf,rightLabel,x+w+gap,y+12,w-6,17,rightValue,9);
 pdf.y=Math.max(y+39,pdf.y);
}
function signature(pdf,label,x,y,width){
 pdf.strokeColor('#718175').lineWidth(.7).moveTo(x,y).lineTo(x+width,y).stroke();
 pdf.font('Helvetica').fontSize(9).fillColor('#2E4231').text(label,x,y+7,{width,align:'center'});
}
async function outputPdf(res,row){
 const d=JSON.parse(row.data);
 const pdf=new PDFDocument({size:'A4',margins:{top:44,bottom:58,left:44,right:44},
   info:{Title:'Autorização para venda de imóveis - '+row.id,Author:'Casal Corretores'}});
 res.writeHead(200,{
  'content-type':'application/pdf','cache-control':'private,no-store',
  'content-disposition':'inline; filename="autorizacao-venda-'+row.id+'.pdf"',
  'x-content-type-options':'nosniff'
 });
 pdf.font('Helvetica');
 pdf.initForm();
 pdf.pipe(res);
 // Cabeçalho: logo branca idêntica à do rodapé em faixa verde e título ao lado.
 drawAuthorizationBrand(pdf,{x:44,y:30,outerWidth:pdf.page.width-88,outerHeight:95,leftWidth:229,title:d.titulo_documento||DEFAULTS.titulo_documento});
 pdf.font('Helvetica').fontSize(8.7).fillColor('#314136')
  .text('Identificação do documento: '+row.id+'  |  Emitido em '+new Date().toLocaleDateString('pt-BR'),{align:'center'});
 section(pdf,'1. CONDIÇÕES DA AUTORIZAÇÃO');
 line(pdf,'Empresa / profissional autorizado',d.empresa_autorizada);
 pair(pdf,'CRECI da empresa',d.creci_empresa,'Prazo (meses)',d.prazo_meses);
 line(pdf,'Comissão de intermediação acordada',d.comissao);
 const clause=String(d.texto_autorizacao||DEFAULTS.texto_autorizacao).slice(0,4000);
 pdf.moveDown(.3);
 pdf.font('Helvetica').fontSize(9).fillColor('#2D3D32').text(clause,{align:'justify',lineGap:3});
 section(pdf,'2. DESCRIÇÃO DO IMÓVEL');
 line(pdf,'Imóvel / tipo',d.imovel);
 line(pdf,'Endereço',d.endereco_imovel);
 line(pdf,'Município',d.municipio_imovel);
 pair(pdf,'Área total',d.area_total,'Área construída',d.area_construida);
 pair(pdf,'Documento',d.documentacao,'Matrícula nº',d.matricula);
 line(pdf,'Comarca',d.comarca);
 pair(pdf,'Valor pretendido (R$)',d.valor_venda,'Aceita receber propostas',d.aceita_propostas);
 section(pdf,'3. QUALIFICAÇÃO DO(S) PROPRIETÁRIO(S)');
 line(pdf,'Nome',d.proprietario);
 pair(pdf,'CPF',d.cpf,'RG',d.rg);
 pair(pdf,'Profissão',d.profissao,'Nascimento',d.nascimento);
 pair(pdf,'Estado civil',d.estado_civil,'Cônjuge',d.conjuge);
 // Página 2: complemento e assinaturas sem simular aceite
 pdf.addPage();pdfPage(pdf);
 pdf.font('Helvetica-Bold').fontSize(14).fillColor('#16642F')
  .text('AUTORIZAÇÃO DE VENDA - CONTINUAÇÃO',{align:'center'});
 pdf.moveDown(.6);
 line(pdf,'Registro',row.id);
 section(pdf,'4. DADOS COMPLEMENTARES');
 pair(pdf,'CPF do cônjuge',d.conjuge_cpf,'RG do cônjuge',d.conjuge_rg);
 pair(pdf,'Profissão do cônjuge',d.conjuge_profissao,'Nascimento do cônjuge',d.conjuge_nascimento);
 line(pdf,'Endereço do(s) proprietário(s)',d.endereco_proprietario);
 line(pdf,'Município',d.municipio_proprietario);
 pair(pdf,'E-mail',d.email,'Telefone',d.telefone);
 pair(pdf,'Corretor(a) responsável',d.corretor_responsavel,'CRECI do(a) corretor(a)',d.creci_corretor);
 section(pdf,'5. OBSERVAÇÕES');
 const notesY=pdf.y;
 editableField(pdf,'Observações',44,notesY,507,75,d.observacoes||'',9);
 pdf.y=notesY+85;
 section(pdf,'6. LOCAL, DATA E ASSINATURAS');
 line(pdf,'Local',d.local_assinatura);
 line(pdf,'Data de assinatura (a preencher/confirmar)',d.data_assinatura);
 pdf.moveDown(2.3);
 let y=pdf.y;
 signature(pdf,'Proprietário(a)',44,y,241);
 signature(pdf,'Cônjuge, quando aplicável',306,y,245);
 y+=73;
 signature(pdf,'Corretor(a) / representante da empresa',44,y,241);
 signature(pdf,'Testemunha 1: '+(d.testemunha1||'________________'),306,y,245);
 y+=73;
 signature(pdf,'Testemunha 2: '+(d.testemunha2||'________________'),44,y,241);
 pdf.font('Helvetica-Oblique').fontSize(8).fillColor('#6C786D')
  .text('Documento gerado sem assinatura. A autorização só deve ser tratada como formalizada após revisão e assinatura das partes.',
    44,y+49,{width:510,align:'left'});
 pdf.end();return true;
}
async function route(req,res,url,{isAdmin=false}={}){
 if(!url.pathname.startsWith('/api/autorizacoes'))return false;
 if(!isAdmin)return forbidden(res);
 try{
  const p=url.pathname;
  if(p==='/api/autorizacoes'){
   if(req.method==='GET'){
    const rows=db.prepare('SELECT * FROM autorizacoes ORDER BY updated_at DESC LIMIT 300').all();
    return json(res,200,{ok:true,records:rows.map(view)});
   }
   if(req.method==='POST'){
    const d=clean(await read(req));
    if(!d.proprietario||!d.imovel) return json(res,400,{ok:false,error:'Informe proprietário e descrição do imóvel.'});
    const id='AV-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase(),ts=now();
    db.prepare('INSERT INTO autorizacoes(id,data,created_at,updated_at) VALUES(?,?,?,?)')
      .run(id,JSON.stringify(d),ts,ts);
    return json(res,201,{ok:true,record:view(find(id))});
   }
   return json(res,405,{ok:false,error:'Método não permitido.'});
  }
  const m=p.match(/^\/api\/autorizacoes\/([A-Za-z0-9_-]+)(?:\/(pdf))?$/);
  if(!m)return false;
  const row=find(m[1]);if(!row)return json(res,404,{ok:false,error:'Autorização não encontrada.'});
  if(m[2]==='pdf'&&req.method==='GET')return await outputPdf(res,row);
  if(m[2])return json(res,405,{ok:false,error:'Método não permitido.'});
  if(req.method==='GET')return json(res,200,{ok:true,record:view(row)});
  if(req.method==='PUT'){
   const d=clean(await read(req));
   if(!d.proprietario||!d.imovel)return json(res,400,{ok:false,error:'Informe proprietário e imóvel.'});
   db.prepare('UPDATE autorizacoes SET data=?,updated_at=? WHERE id=?').run(JSON.stringify(d),now(),row.id);
   return json(res,200,{ok:true,record:view(find(row.id))});
  }
  return json(res,405,{ok:false,error:'Método não permitido.'});
 }catch(err){
  console.error('[AUTORIZACOES]',err.message);
  if(!res.headersSent)return json(res,err.http||500,{ok:false,error:err.http?err.message:'Não foi possível processar a autorização.'});
  return false;
 }
}
module.exports={route,clean};
