'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const importer = require('./plugins/bonanza-importer');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'uploads'));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TYPES = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8', '.md':'text/markdown; charset=utf-8'
};

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store'});
  res.end(body);
}

async function readBody(req, limit = 1024 * 1024) {
  const chunks = []; let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw new Error('Requisição muito grande.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function safeFile(base, pathname) {
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  const resolved = path.resolve(base, rel);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

function serveFile(res, file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {'content-type':type,'content-length':stat.size,'cache-control':type.startsWith('image/')?'public, max-age=86400':'no-cache'});
    fs.createReadStream(file).pipe(res);
    return true;
  } catch { return false; }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, {ok:true, importer:'bonanza', uploadDir:UPLOAD_DIR});

    if (req.method === 'GET' && url.pathname === '/api/import/bonanza/preview') {
      const property = await importer.scrapeByCode(url.searchParams.get('codigo'));
      return json(res, 200, {ok:true, property});
    }

    if (req.method === 'POST' && url.pathname === '/api/import/bonanza/import') {
      const body = await readBody(req);
      if (body.confirmRights !== true) return json(res, 400, {ok:false,error:'Confirme que você tem autorização para reutilizar as fotos e o conteúdo do anúncio.'});
      const property = await importer.importByCode(body.codigo, UPLOAD_DIR, body.overrides || {});
      return json(res, 200, {ok:true, property});
    }

    if (url.pathname.startsWith('/uploads/')) {
      const file = safeFile(UPLOAD_DIR, url.pathname.replace(/^\/uploads\//,''));
      if (file && serveFile(res, file)) return;
      res.writeHead(404); return res.end('Not found');
    }

    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = safeFile(ROOT, pathname);
    if (file && serveFile(res, file)) return;
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); res.end('Arquivo não encontrado.');
  } catch (e) {
    console.error('[IS22]', e);
    if (url.pathname.startsWith('/api/')) return json(res, 500, {ok:false,error:e.message || 'Erro inesperado.'});
    res.writeHead(500, {'content-type':'text/plain; charset=utf-8'}); res.end('Erro interno.');
  }
}

http.createServer(handler).listen(PORT, '0.0.0.0', () => {
  console.log(`IS22 rodando em http://localhost:${PORT}`);
  console.log(`Importador: Painel > Importar anúncio`);
});
