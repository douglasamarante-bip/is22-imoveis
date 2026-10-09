'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {URL}=require('url');
const importer=require('./plugins/bonanza-importer');
const visitas=require('./visitas-server');
const clientes=require('./clientes-server');

const ROOT=__dirname;
const PORT=Number(process.env.PORT||3000);
const DATA_DIR=path.resolve(process.env.DATA_DIR||process.env.UPLOAD_DIR||path.join(ROOT,'data'));
const UPLOAD_DIR=path.join(DATA_DIR,'uploads');
const ADMIN_EMAIL=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
const ADMIN_PASSWORD=String(process.env.ADMIN_PASSWORD||'');
const SESSION_SECRET=String(process.env.SESSION_SECRET||'');
fs.mkdirSync(UPLOAD_DIR,{recursive:true});

const P1='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=84';
const P2='https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=84';
const P3='https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=84';
const HERO='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88';
const defaultSettings={
  brandName:'IS22 Imóveis',creci:'1764-J',tagline:'Sonhos em endereços reais',primary:'#082452',accent:'#25D366',
  logo:'',heroImage:HERO,heroKicker:'SONHOS EM ENDEREÇOS REAIS',heroTitle:'Não é só uma casa.',heroStrong:'É a sua próxima conquista.',
  heroText:'O endereço certo marca uma nova fase. Encontre o imóvel que combina com o que você já conquistou — e com tudo o que ainda quer viver.',
  phone:'(31) 00000-0000',whatsapp:'5531000000000',email:'contato@is22.com.br',instagram:'@is22imoveis',instagramUrl:'https://instagram.com/is22imoveis',
  storyTitle:'A chave não abre apenas uma porta.',storyStrong:'Ela abre uma nova fase.',
  phrases:['CONQUISTA.','REALIZAÇÃO.','NOVOS COMEÇOS.','SEU LUGAR NO MUNDO.'],
  footer:'© 2026 IS22 Imóveis. Todos os direitos reservados.'
};
const seedProperties=[
  {id:'IS22-001',title:'Casa contemporânea com área gourmet',type:'Casa',purpose:'Venda',status:'Disponível',price:890000,city:'Conselheiro Lafaiete',neighborhood:'Rosário',address:'Rosário, Conselheiro Lafaiete - MG',bedrooms:3,suites:1,bathrooms:3,parking:2,area:210,featured:true,premium:true,images:[P1,P2],description:'Casa ampla, moderna e iluminada, com área gourmet e excelente localização.'},
  {id:'IS22-002',title:'Apartamento com varanda e vista aberta',type:'Apartamento',purpose:'Venda',status:'Disponível',price:420000,city:'Conselheiro Lafaiete',neighborhood:'Centro',address:'Centro, Conselheiro Lafaiete - MG',bedrooms:2,suites:1,bathrooms:2,parking:1,area:88,featured:true,premium:false,images:[P2,P3],description:'Apartamento bem distribuído, próximo a comércio, escolas e serviços.'},
  {id:'IS22-003',title:'Casa compacta para locação',type:'Casa',purpose:'Aluguel',status:'Disponível',price:2200,city:'Conselheiro Lafaiete',neighborhood:'Santa Matilde',address:'Santa Matilde, Conselheiro Lafaiete - MG',bedrooms:2,suites:0,bathrooms:1,parking:1,area:95,featured:false,premium:false,images:[P3],description:'Imóvel pronto para morar, com quintal e ótimo acesso.'}
];

const FILES={settings:'settings.json',siteSettingsV2:'site-settings-v2.json',properties:'properties.json',leads:'leads.json',hero:'site-hero.json'};
function fileOf(key){return path.join(DATA_DIR,FILES[key])}
function readJSON(key,fallback){try{return JSON.parse(fs.readFileSync(fileOf(key),'utf8'))}catch{return JSON.parse(JSON.stringify(fallback))}}
function writeJSON(key,value){fs.mkdirSync(DATA_DIR,{recursive:true});const f=fileOf(key),tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2));fs.renameSync(tmp,f)}
function initData(){if(!fs.existsSync(fileOf('settings')))writeJSON('settings',defaultSettings);if(!fs.existsSync(fileOf('properties')))writeJSON('properties',seedProperties);if(!fs.existsSync(fileOf('leads')))writeJSON('leads',[])}
initData();

const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
function sendJSON(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store'});res.end(body)}
async function readRaw(req,limit=8*1024*1024){const chunks=[];let total=0;for await(const c of req){total+=c.length;if(total>limit)throw new Error('Requisição muito grande.');chunks.push(c)}return Buffer.concat(chunks)}
async function readBody(req,limit=6*1024*1024){const raw=(await readRaw(req,limit)).toString('utf8');return raw?JSON.parse(raw):{}}
function safeFile(base,pathname){const rel=decodeURIComponent(pathname).replace(/^\/+/,''),resolved=path.resolve(base,rel);return resolved===base||resolved.startsWith(base+path.sep)?resolved:null}
function serveFile(res,file){try{const st=fs.statSync(file);if(!st.isFile())return false;const type=TYPES[path.extname(file).toLowerCase()]||'application/octet-stream';res.writeHead(200,{'content-type':type,'content-length':st.size,'cache-control':type.startsWith('image/')?'public,max-age=86400':'no-cache'});fs.createReadStream(file).pipe(res);return true}catch{return false}}
function b64url(s){return Buffer.from(s).toString('base64url')}
function sign(payload){if(!SESSION_SECRET)return'';return crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url')}
function makeToken(email){const p=b64url(JSON.stringify({email,exp:Date.now()+12*60*60*1000}));return p+'.'+sign(p)}
function verifyToken(token){if(!token||!SESSION_SECRET)return null;const [p,s]=String(token).split('.');if(!p||!s)return null;const expected=sign(p);if(s.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;try{const d=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));return d.exp>Date.now()?d:null}catch{return null}}
function auth(req){const h=String(req.headers.authorization||'');let token=h.startsWith('Bearer ')?h.slice(7):'';if(!token){const cookie=String(req.headers.cookie||'');const m=cookie.match(/(?:^|;\s*)is22_session=([^;]+)/);if(m)token=decodeURIComponent(m[1])}return verifyToken(token)}
function requireAuth(req,res){const u=auth(req);if(!u){sendJSON(res,401,{ok:false,error:'Não autorizado.'});return null}return u}
function cleanProperty(p){const o={...p};o.id=String(o.id||'').trim()||('IS22-'+Date.now());o.title=String(o.title||'Imóvel sem título').trim();o.price=Number(o.price||0);o.area=Number(o.area||0);o.bedrooms=Number(o.bedrooms||0);o.suites=Number(o.suites||0);o.bathrooms=Number(o.bathrooms||0);o.parking=Number(o.parking||0);o.images=Array.isArray(o.images)?o.images.filter(Boolean):[];o.image=o.images[0]||o.image||'';o.status=o.status||'Disponível';return o}
function upsertProperty(p){const arr=readJSON('properties',seedProperties);const item=cleanProperty(p);const i=arr.findIndex(x=>String(x.id)===String(item.id));if(i>=0)arr[i]={...arr[i],...item};else arr.unshift(item);writeJSON('properties',arr);return item}

async function api(req,res,url){
  // A foto principal é compartilhada entre todos os navegadores e guardada no volume persistente.
  if(url.pathname==='/api/site/hero'){
    if(req.method==='GET'){
      const current=readJSON('hero',{image:null});
      return sendJSON(res,200,{ok:true,image:current.image||null});
    }
    if(!requireAuth(req,res))return;
    if(req.method==='POST'){
      const type=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
      const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[type];
      if(!ext)return sendJSON(res,415,{ok:false,error:'Envie uma foto JPG, PNG ou WebP.'});
      const max=10*1024*1024;
      let raw;
      try{raw=await readRaw(req,max+1)}catch{return sendJSON(res,413,{ok:false,error:'Foto acima de 10 MB. Escolha uma imagem menor.'})}
      if(raw.length>max)return sendJSON(res,413,{ok:false,error:'Foto acima de 10 MB. Escolha uma imagem menor.'});
      if(raw.length<32)return sendJSON(res,400,{ok:false,error:'Arquivo de imagem inválido.'});
      const first=raw.subarray(0,16).toString('hex');
      const valid=type==='image/jpeg'?first.startsWith('ffd8ff'):
        type==='image/png'?first.startsWith('89504e470d0a1a0a'):
        (raw.toString('ascii',0,4)==='RIFF'&&raw.toString('ascii',8,12)==='WEBP');
      if(!valid)return sendJSON(res,400,{ok:false,error:'A imagem não corresponde ao formato selecionado.'});
      const filename='casal-hero-'+Date.now()+'-'+crypto.randomBytes(5).toString('hex')+ext;
      fs.writeFileSync(path.join(UPLOAD_DIR,filename),raw,{flag:'wx',mode:0o644});
      const image='/uploads/'+filename;
      writeJSON('hero',{image,updatedAt:new Date().toISOString()});
      return sendJSON(res,201,{ok:true,image});
    }
    if(req.method==='PUT'){
      const body=await readBody(req,4096);
      const image=String(body.image||'').trim();
      if(image.length>1800||!(/^(https:\/\/[^\s<>"']+)$/i.test(image)||/^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(image))){
        return sendJSON(res,400,{ok:false,error:'Informe um link HTTPS válido de imagem ou envie uma foto pelo botão.'});
      }
      writeJSON('hero',{image,updatedAt:new Date().toISOString()});
      return sendJSON(res,200,{ok:true,image});
    }
    return sendJSON(res,405,{ok:false,error:'Método não permitido.'});
  }
  if(req.method==='GET'&&url.pathname==='/api/health')return sendJSON(res,200,{ok:true,dataDir:DATA_DIR,importer:'bonanza',authReady:!!(ADMIN_EMAIL&&ADMIN_PASSWORD&&SESSION_SECRET)});
  if(req.method==='POST'&&url.pathname==='/api/auth/login'){const b=await readBody(req);if(!ADMIN_EMAIL||!ADMIN_PASSWORD||!SESSION_SECRET)return sendJSON(res,503,{ok:false,error:'Acesso administrativo ainda não configurado no servidor.'});if(String(b.email||'').trim().toLowerCase()!==ADMIN_EMAIL||String(b.password||'')!==ADMIN_PASSWORD)return sendJSON(res,401,{ok:false,error:'E-mail ou senha incorretos.'});const token=makeToken(ADMIN_EMAIL);const body=JSON.stringify({ok:true,token,user:{email:ADMIN_EMAIL,name:'Equipe IS22',role:'Administrador'}});res.writeHead(200,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store','set-cookie':`is22_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`});return res.end(body)}
  if(req.method==='POST'&&url.pathname==='/api/auth/logout'){res.writeHead(200,{'content-type':'application/json; charset=utf-8','set-cookie':'is22_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});return res.end('{"ok":true}')}
  if(req.method==='GET'&&url.pathname==='/api/auth/me'){const u=requireAuth(req,res);if(!u)return;return sendJSON(res,200,{ok:true,user:{email:u.email,role:'Administrador'}})}
  if(req.method==='GET'&&url.pathname==='/api/settings'){
    const shared=readJSON('siteSettingsV2',null);
    return sendJSON(res,200,{ok:true,settings:shared&&typeof shared==='object'?shared:null});
  }
  if(req.method==='PUT'&&url.pathname==='/api/settings'){
    if(!requireAuth(req,res))return;
    const b=await readBody(req,8*1024*1024);
    if(!b||typeof b!=='object'||Array.isArray(b)||!b.brand||!b.contact||!b.colors){
      return sendJSON(res,400,{ok:false,error:'Configurações do site inválidas.'});
    }
    const next={...b,_sharedVersion:2,_updatedAt:new Date().toISOString()};
    writeJSON('siteSettingsV2',next);
    return sendJSON(res,200,{ok:true,settings:next});
  }
  if(req.method==='GET'&&url.pathname==='/api/properties')return sendJSON(res,200,{ok:true,properties:readJSON('properties',seedProperties)});
  if(req.method==='POST'&&url.pathname==='/api/properties'){if(!requireAuth(req,res))return;const p=upsertProperty(await readBody(req));return sendJSON(res,200,{ok:true,property:p})}
  if(req.method==='PUT'&&url.pathname==='/api/properties'){if(!requireAuth(req,res))return;const b=await readBody(req);const arr=Array.isArray(b)?b:(Array.isArray(b.properties)?b.properties:null);if(!arr)return sendJSON(res,400,{ok:false,error:'Lista de imóveis inválida.'});const clean=arr.map(cleanProperty);writeJSON('properties',clean);return sendJSON(res,200,{ok:true,properties:clean})}
  const pm=url.pathname.match(/^\/api\/properties\/([^/]+)$/);if(pm){const id=decodeURIComponent(pm[1]);if(req.method==='PUT'){if(!requireAuth(req,res))return;const p=upsertProperty({...await readBody(req),id});return sendJSON(res,200,{ok:true,property:p})}if(req.method==='DELETE'){if(!requireAuth(req,res))return;let arr=readJSON('properties',seedProperties);arr=arr.filter(x=>String(x.id)!==id);writeJSON('properties',arr);return sendJSON(res,200,{ok:true})}}
  if(req.method==='POST'&&url.pathname==='/api/leads'){const b=await readBody(req);const arr=readJSON('leads',[]);const lead={id:'L-'+Date.now(),name:String(b.name||'').trim(),phone:String(b.phone||'').trim(),email:String(b.email||'').trim(),propertyId:String(b.propertyId||'').trim(),message:String(b.message||'').trim(),stage:'Novo',createdAt:new Date().toISOString()};if(!lead.name||!lead.phone)return sendJSON(res,400,{ok:false,error:'Informe nome e telefone.'});arr.unshift(lead);writeJSON('leads',arr);return sendJSON(res,200,{ok:true,lead})}
  if(req.method==='GET'&&url.pathname==='/api/leads'){if(!requireAuth(req,res))return;return sendJSON(res,200,{ok:true,leads:readJSON('leads',[])})}
  if(req.method==='PUT'&&url.pathname.startsWith('/api/leads/')){if(!requireAuth(req,res))return;const id=decodeURIComponent(url.pathname.split('/').pop());const b=await readBody(req);const arr=readJSON('leads',[]),i=arr.findIndex(x=>x.id===id);if(i<0)return sendJSON(res,404,{ok:false,error:'Lead não encontrado.'});arr[i]={...arr[i],...b,id};writeJSON('leads',arr);return sendJSON(res,200,{ok:true,lead:arr[i]})}
  if(req.method==='GET'&&url.pathname==='/api/import/bonanza/preview'){if(!requireAuth(req,res))return;const input=url.searchParams.get('entrada')||url.searchParams.get('url')||url.searchParams.get('codigo');const property=await importer.scrapeByInput(input);return sendJSON(res,200,{ok:true,property})}
  if(req.method==='POST'&&url.pathname==='/api/import/bonanza/import'){if(!requireAuth(req,res))return;const b=await readBody(req);if(b.confirmRights!==true)return sendJSON(res,400,{ok:false,error:'Confirme que você tem autorização para reutilizar as fotos e o conteúdo.'});const input=b.entrada||b.url||b.codigo;const property=await importer.importByInput(input,UPLOAD_DIR,b.overrides||{});upsertProperty(property);return sendJSON(res,200,{ok:true,property})}
  return false;
}

async function handler(req,res){const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);try{if(url.pathname.startsWith('/api/clientes')){const result=await clientes.route(req,res,url,{isAdmin:!!auth(req)});if(result===false)return sendJSON(res,404,{ok:false,error:'Rota de cliente não encontrada.'});return}if(url.pathname.startsWith('/api/visitas')){const result=await visitas.route(req,res,url,{isAdmin:!!auth(req)});if(result===false)return sendJSON(res,404,{ok:false,error:'Rota de visita não encontrada.'});return}if(url.pathname.startsWith('/api/')){const done=await api(req,res,url);if(done!==false)return;return sendJSON(res,404,{ok:false,error:'Rota não encontrada.'})}if(url.pathname.startsWith('/uploads/')){const file=safeFile(UPLOAD_DIR,url.pathname.replace(/^\/uploads\//,''));if(file&&serveFile(res,file))return;res.writeHead(404);return res.end('Not found')}let pathname=url.pathname==='/'?'/index.html':url.pathname;const file=safeFile(ROOT,pathname);if(file&&serveFile(res,file))return;res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado.')}catch(e){console.error('[IS22]',e);if(url.pathname.startsWith('/api/'))return sendJSON(res,500,{ok:false,error:e.message||'Erro interno.'});res.writeHead(500);res.end('Erro interno.')}}
http.createServer(handler).listen(PORT,'0.0.0.0',()=>console.log(`IS22 online na porta ${PORT}`));