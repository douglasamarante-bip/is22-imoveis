'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SOURCE_NAME = 'Bonanza Imóveis';
const SOURCE_HOST = 'bonanzaimoveis.com.br';
const SOURCE_BASE = `https://${SOURCE_HOST}`;
const ALLOWED_IMAGE_HOSTS = new Set(['cdn.vistahost.com.br', SOURCE_HOST, `www.${SOURCE_HOST}`]);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154 Safari/537.36 IS22Importer/1.0';

function cleanCode(value) {
  const code = String(value || '').replace(/\D/g, '').slice(0, 12);
  if (!code) throw new Error('Informe um código de imóvel válido.');
  return code;
}

function normalizeSourceInput(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Cole o link do imóvel ou informe o código.');

  if (/^https?:\/\//i.test(raw)) {
    let u;
    try { u = new URL(raw); } catch { throw new Error('O link informado não é válido.'); }
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== SOURCE_HOST) throw new Error('Por enquanto o importador aceita links da Bonanza Imóveis.');
    if (!/^\/imovel\//i.test(u.pathname)) throw new Error('Cole o link da página do imóvel, não o link de busca.');
    const allCodes = u.pathname.match(/\d{3,12}/g) || [];
    const code = cleanCode(allCodes[allCodes.length - 1] || '');
    u.hash = '';
    return { code, detailUrl: u.href, raw };
  }

  return { code: cleanCode(raw), detailUrl: '', raw };
}

function decodeEntities(str = '') {
  const named = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
  return String(str)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function normalize(str = '') {
  return decodeEntities(String(str).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function htmlToText(html = '') {
  return decodeEntities(
    String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function meta(html, prop) {
  const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
  ];
  for (const re of patterns) {
    const m = String(html).match(re);
    if (m) return normalize(m[1]);
  }
  return '';
}

function firstTagText(html, tags = ['h1','h2']) {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    for (const m of String(html).matchAll(re)) {
      const t = normalize(m[1]);
      if (t && !/^carregando/i.test(t) && !/^[-–—\s]+$/.test(t)) return t;
    }
  }
  return '';
}

function parseMoney(value = '') {
  const n = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(n) || 0;
}

function parseNumber(value = '') {
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

function extractImageUrls(html, code) {
  const source = decodeEntities(String(html));
  const urls = [];
  const add = raw => {
    if (!raw) return;
    const candidates = String(raw).split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
    for (let u of candidates) {
      u = u.replace(/^['"]|['"]$/g, '');
      if (u.startsWith('//')) u = 'https:' + u;
      if (u.startsWith('/')) u = SOURCE_BASE + u;
      if (!/^https?:\/\//i.test(u)) continue;
      try {
        const x = new URL(u);
        const href = x.href;
        const looksLikeListing = new RegExp(`/fotos/${code}/`, 'i').test(x.pathname) || new RegExp(`(?:^|[/_-])${code}(?:[/_.-]|$)`, 'i').test(x.pathname);
        const imageExt = /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(href);
        if (ALLOWED_IMAGE_HOSTS.has(x.hostname.toLowerCase()) && imageExt && looksLikeListing && !urls.includes(href)) urls.push(href);
      } catch {}
    }
  };

  for (const m of source.matchAll(/(?:src|data-src|data-original|data-lazy|href|content)=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of source.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of source.matchAll(/https?:\\?\/\\?\/[^"'\s<>]+/gi)) add(m[0].replace(/\\\//g, '/'));
  return urls.slice(0, 40);
}

function sanitizeDescription(value = '') {
  let out = decodeEntities(String(value))
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // O site de origem mistura CTAs e componentes da página logo após a descrição.
  // A partir dessas frases, o restante não pertence ao texto do imóvel.
  const stopPatterns = [
    /\bAgende\s+(?:agora\s+)?sua\s+visita\b/i,
    /\bAgendar\s+visita\b/i,
    /\bFale\s+com\s+(?:um|nossos?)\s+consultor/i,
    /\bEntre\s+em\s+contato\b/i,
    /\bMapa\s+do\s+im[oó]vel\b/i,
    /\bIm[oó]veis\s+semelhantes\b/i,
    /\bCompartilhar\b/i,
    /\bFavorito(?:s)?\b/i,
    /\bFinanciamento\b/i,
    /\bWhatsApp\b/i,
    /\bloading\.{0,3}\b/i
  ];

  let cut = out.length;
  for (const re of stopPatterns) {
    const m = out.match(re);
    if (m && typeof m.index === 'number' && m.index >= 12) cut = Math.min(cut, m.index);
  }
  out = out.slice(0, cut);

  // Remove rótulos de interface que eventualmente aparecem antes do corte.
  out = out
    .replace(/(?:^|\s)(?:Descrição|Detalhes\s+do\s+im[oó]vel)\s*[:\-]?\s*/gi, ' ')
    .replace(/\b(?:loading\.{0,3}|WhatsApp|Agendar visita|Mapa do imóvel)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '')
    .trim();

  return out;
}

function extractDescription(text) {
  const flat = String(text).replace(/\r/g, '');

  // Primeiro tenta isolar especificamente o bloco que vem depois de "Descrição".
  const m = flat.match(
    /(?:^|\n)\s*Descrição\s*[:\-]?\s*\n?([\s\S]+?)(?=\n\s*(?:Valor\s+(?:de\s+)?(?:venda|loca[cç][aã]o)|Agende\s+(?:agora\s+)?sua\s+visita|Agendar\s+visita|Entre\s+em\s+contato|Mapa\s+do\s+im[oó]vel|Im[oó]veis\s+semelhantes|Financiamento|Compartilhar|Favorito|WhatsApp)\b|$)/i
  );
  if (m) {
    const clean = sanitizeDescription(m[1]);
    if (clean.length >= 8) return clean;
  }

  // Alguns anúncios não possuem o título "Descrição", então usamos o texto
  // promocional principal, mas sempre limpando a interface da página.
  const alt = flat.match(
    /(OPORTUNIDADE[\s\S]{20,1800}?)(?=\n\s*(?:Agende\s+(?:agora\s+)?sua\s+visita|Agendar\s+visita|Entre\s+em\s+contato|Mapa\s+do\s+im[oó]vel|Im[oó]veis\s+semelhantes|WhatsApp)\b|$)/i
  );
  if (alt) {
    const clean = sanitizeDescription(alt[1]);
    if (clean.length >= 8) return clean;
  }

  return '';
}

function extractLocation(text, title = '') {
  const lines = String(text).split('\n').map(x => x.trim()).filter(Boolean);
  const locationLine = lines.find(x => /,\s*[^,\n]{2,60}\s*-\s*[A-Z]{2}\b/.test(x) && !/CRECI|contato@|R\$/i.test(x));
  if (locationLine) return locationLine.replace(/^[-–—\s]+|[-–—\s]+$/g, '');
  const t = String(text).match(/([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^\n]{2,90},\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^\n]{2,60}\s*-\s*[A-Z]{2})/);
  return t ? t[1].trim() : title;
}

function splitLocation(location = '') {
  const clean = String(location).trim();
  const noState = clean.replace(/\s*-\s*[A-Z]{2}\s*$/i, '').trim();
  const parts = noState.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) return { neighborhood: parts[0], city: parts[parts.length - 1] };
  return { neighborhood: parts[0] || '', city: '' };
}

function inferTypePurpose(text) {
  const src = String(text);
  const types = ['Apartamento','Casa','Sítio','Sitio','Chácara','Chacara','Fazenda','Terreno','Lote','Comercial','Sala','Galpão','Galpao','Cobertura','Flat','Loja'];
  let type = types.find(t => new RegExp(`\\b${t}\\b`, 'i').test(src)) || 'Imóvel';
  type = type.replace(/^Sitio$/i,'Sítio').replace(/^Chacara$/i,'Chácara').replace(/^Galpao$/i,'Galpão');
  const purpose = /\bAluguel\b/i.test(src) ? 'Aluguel' : 'Venda';
  return { type, purpose };
}

function inferAmenities(description = '') {
  const known = ['Garagem','Piscina','Área gourmet','Area gourmet','Poço','Poço semiartesiano','Cisterna','Lagoa','Fibra óptica','Internet','Portão','Jardim','Varanda','Churrasqueira','Nascente','Pomar','Horta'];
  const found = [];
  for (const a of known) if (new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i').test(description)) found.push(a.replace('Area gourmet','Área gourmet'));
  return [...new Set(found)];
}

function extractFeature(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*([\\d.,]+)`, 'i');
    const m = String(text).match(re);
    if (m) return parseNumber(m[1]);
  }
  return 0;
}

function extractNaturalFeature(text, nouns) {
  const src = String(text || '');
  for (const noun of nouns) {
    const n = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp('(\\d+(?:[.,]\\d+)?)\\s+' + n + 's?\\b', 'i'),
      new RegExp(n + 's?\\s*[:\\-]?\\s*(\\d+(?:[.,]\\d+)?)', 'i'),
      new RegExp('(?:com|possui|conta com|sendo)\\s+(\\d+(?:[.,]\\d+)?)\\s+' + n + 's?\\b', 'i')
    ];
    for (const re of patterns) {
      const m = src.match(re);
      if (m) return parseNumber(m[1]);
    }
  }
  return 0;
}

function extractNaturalArea(text) {
  const src = String(text || '');
  const patterns = [
    /(?:área\s+(?:total|útil|construída)?\s*(?:de|:)?\s*)([\d.,]+)\s*m[²2]/i,
    /(?:terreno|lote|imóvel|chácara|sítio)\s+(?:com|de)\s+([\d.,]+)\s*m[²2]/i,
    /([\d.,]+)\s*m[²2]\s+(?:de\s+)?(?:área|terreno|lote)/i
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) return parseNumber(m[1]);
  }
  return 0;
}

function sanitizeTitle(title) {
  return String(title || '')
    .replace(/\s*[|\-–—]\s*Bonanza Imóveis.*$/i, '')
    .replace(/^Bonanza Imóveis\s*[|\-–—]\s*/i, '')
    .trim();
}

function findDetailUrl(searchHtml, code) {
  const links = [];
  for (const m of String(searchHtml).matchAll(/href=["']([^"']+)["']/gi)) {
    const href = decodeEntities(m[1]);
    if (!/\/imovel\//i.test(href)) continue;
    try {
      const u = new URL(href, SOURCE_BASE);
      if (u.hostname.replace(/^www\./,'') !== SOURCE_HOST) continue;
      links.push(u.href);
    } catch {}
  }
  return links.find(x => new RegExp(`(?:-|/|=)${code}(?:$|[/?#])`).test(x)) || links.find(x => x.includes(code)) || '';
}

async function fetchWithTimeout(url, { timeout = 18000, binary = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, 'accept': binary ? 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language':'pt-BR,pt;q=0.9,en;q=0.6' }
    });
    if (!res.ok) throw new Error(`A fonte respondeu HTTP ${res.status}.`);
    return res;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('A fonte demorou demais para responder.');
    throw e;
  } finally { clearTimeout(timer); }
}

async function scrapeByInput(rawInput) {
  const input = normalizeSourceInput(rawInput);
  const code = input.code;
  const searchUrl = `${SOURCE_BASE}/busca?codigo=${encodeURIComponent(code)}`;
  let searchHtml = '';
  let detailUrl = input.detailUrl;

  if (!detailUrl) {
    const searchRes = await fetchWithTimeout(searchUrl);
    searchHtml = await searchRes.text();
    detailUrl = findDetailUrl(searchHtml, code);
    if (!detailUrl) throw new Error(`Não encontrei o código ${code} na busca da ${SOURCE_NAME}.`);
  }

  const detailRes = await fetchWithTimeout(detailUrl);
  const html = await detailRes.text();
  const text = htmlToText(html);
  const sourceText = `${searchHtml ? htmlToText(searchHtml) : ''}\n${text}`;

  const ogTitle = meta(html, 'og:title') || meta(html, 'twitter:title');
  const title = sanitizeTitle(ogTitle || firstTagText(html) || `Imóvel cód. ${code}`);
  const ogDesc = meta(html, 'og:description') || meta(html, 'description');
  const description = extractDescription(text) || sanitizeDescription(ogDesc) || '';
  const typePurpose = inferTypePurpose(`${title}\n${description}\n${sourceText.slice(0, 8000)}`);
  const location = extractLocation(text, title);
  const loc = splitLocation(location);
  const priceMatch = sourceText.match(/R\$\s*([\d.]+,\d{2})/i) || sourceText.match(/R\$\s*([\d.]+)/i);
  const areaMatch = sourceText.match(/Área\s+Total\s*([\d.,]+)\s*m[²2]/i) || sourceText.match(/([\d.,]+)\s*m[²2]/i);
  const images = extractImageUrls(html, code);

  return {
    source: { name: SOURCE_NAME, code, url: detailUrl, searchUrl, importedAt: null, input: input.raw },
    id: code,
    title,
    type: typePurpose.type,
    purpose: typePurpose.purpose,
    status: 'Disponível',
    price: priceMatch ? parseMoney(priceMatch[1]) : 0,
    city: loc.city,
    neighborhood: loc.neighborhood,
    address: location,
    bedrooms: extractFeature(sourceText, ['Quartos?', 'Dormitórios?', 'Dormitorios?']) || extractNaturalFeature(description, ['quarto', 'dormitório', 'dormitorio']),
    suites: extractFeature(sourceText, ['Suítes?', 'Suites?']) || extractNaturalFeature(description, ['suíte', 'suite']),
    bathrooms: extractFeature(sourceText, ['Banheiros?']) || extractNaturalFeature(description, ['banheiro']),
    parking: extractFeature(sourceText, ['Vagas?', 'Garagens?']) || extractNaturalFeature(description, ['vaga', 'garagem']),
    area: areaMatch ? parseNumber(areaMatch[1]) : extractNaturalArea(description),
    condo: 0,
    iptu: 0,
    featured: false,
    premium: false,
    furnished: /mobiliad[oa]/i.test(description),
    financing: !/não\s+aceita\s+financiamento/i.test(description),
    pets: true,
    amenities: inferAmenities(description),
    image: images[0] || '',
    images,
    views: 0,
    description,
    remoteImages: images
  };
}

async function scrapeByCode(rawCode) { return scrapeByInput(rawCode); }

function extFrom(contentType, url) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('avif')) return '.avif';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  const m = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif)$/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg','jpg') : '.jpg';
}

async function downloadImages(urls, code, uploadDir) {
  const target = path.join(uploadDir, 'imported', code);
  fs.mkdirSync(target, { recursive: true });
  const local = [];
  let total = 0;
  for (let i = 0; i < urls.length && i < 30; i++) {
    const remote = urls[i];
    let u;
    try { u = new URL(remote); } catch { continue; }
    if (!ALLOWED_IMAGE_HOSTS.has(u.hostname.toLowerCase())) continue;
    const res = await fetchWithTimeout(u.href, { timeout: 22000, binary: true });
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) continue;
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > 15 * 1024 * 1024) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    total += buf.length;
    if (buf.length > 15 * 1024 * 1024 || total > 120 * 1024 * 1024) break;
    const ext = extFrom(ct, u.href);
    const filename = `${String(i + 1).padStart(2, '0')}${ext}`;
    fs.writeFileSync(path.join(target, filename), buf);
    local.push(`/uploads/imported/${code}/${filename}`);
  }
  return local;
}

function mergeOverrides(property, overrides = {}) {
  const allowed = ['title','type','purpose','status','price','city','neighborhood','address','bedrooms','suites','bathrooms','parking','area','condo','iptu','description','featured','premium','furnished','financing','pets'];
  const out = { ...property };
  for (const key of allowed) {
    if (!(key in overrides)) continue;
    const v = overrides[key];
    if (['price','bedrooms','suites','bathrooms','parking','area','condo','iptu'].includes(key)) out[key] = Number(v) || 0;
    else if (['featured','premium','furnished','financing','pets'].includes(key)) out[key] = !!v;
    else out[key] = String(v ?? '').trim();
  }
  return out;
}

async function importByInput(rawInput, uploadDir, overrides = {}) {
  const property = mergeOverrides(await scrapeByInput(rawInput), overrides);
  const downloaded = await downloadImages(property.remoteImages || property.images || [], property.source.code, uploadDir);
  if (!downloaded.length) throw new Error('Encontrei o anúncio, mas não consegui baixar nenhuma foto da origem.');
  property.images = downloaded;
  property.image = downloaded[0];
  property.source = { ...property.source, importedAt: new Date().toISOString() };
  delete property.remoteImages;
  return property;
}

async function importByCode(rawCode, uploadDir, overrides = {}) {
  return importByInput(rawCode, uploadDir, overrides);
}

module.exports = { SOURCE_NAME, SOURCE_HOST, scrapeByInput, scrapeByCode, importByInput, importByCode, cleanCode, normalizeSourceInput };
