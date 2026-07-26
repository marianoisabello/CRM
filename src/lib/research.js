/**
 * Research enrichment for Analista perfiles.
 * SOURCE OF TRUTH for scrape + web search used by CRM perfiles agent.
 * n8n mirrors a slim version in its "Research Context" Code node
 * (or can call POST /api/hooks/research with x-crm-internal-key).
 *
 * Search order:
 *  1) SERPER_API_KEY / TAVILY_API_KEY / GOOGLE_CSE_* if set
 *  2) DuckDuckGo HTML lite fallback
 *  3) Site scrape only + note "sin búsqueda web"
 */
'use strict';

const MAX_HTML_BYTES = 350_000;
const MAX_TEXT_CHARS = 3500;
const FETCH_TIMEOUT_MS = 8000;

function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    'i'
  );
  const m = html.match(re) || html.match(re2);
  return m ? m[1].trim() : '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0, 200) : '';
}

function extractHeadings(html, limit = 8) {
  const out = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < limit) {
    const t = stripHtml(m[1]).slice(0, 120);
    if (t) out.push(t);
  }
  return out;
}

async function fetchText(url, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'DanaAnalistaBot/1.0 (+research enrichment)',
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const sliced = buf.subarray(0, MAX_HTML_BYTES).toString('utf8');
    return { ok: res.ok, status: res.status, text: sliced };
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeWebsite(sitioWeb) {
  const url = normalizeUrl(sitioWeb);
  if (!url) {
    return { ok: false, skipped: true, reason: 'sin_sitio_web' };
  }
  try {
    const { ok, status, text } = await fetchText(url);
    if (!ok) {
      return { ok: false, url, status, reason: `http_${status}` };
    }
    const title = extractTitle(text);
    const description =
      extractMeta(text, 'description') || extractMeta(text, 'og:description');
    const headings = extractHeadings(text);
    const body = stripHtml(text).slice(0, MAX_TEXT_CHARS);
    return {
      ok: true,
      url,
      title,
      description,
      headings,
      excerpt: body.slice(0, 1800),
      fetched: true,
    };
  } catch (err) {
    return {
      ok: false,
      url,
      reason: err.name === 'AbortError' ? 'timeout' : err.message,
      fetched: false,
    };
  }
}

function buildSearchQuery(lead) {
  const parts = [
    lead.empresa,
    lead.nombre,
    lead.rubro,
    lead.sitio_web ? lead.sitio_web.replace(/^https?:\/\//i, '') : '',
  ].filter(Boolean);
  return parts.join(' ').trim().slice(0, 160);
}

async function searchSerper(query) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
      body: JSON.stringify({ q: query, num: 5, gl: 'ar', hl: 'es' }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, provider: 'serper', reason: `http_${res.status}` };
    const data = await res.json();
    const organic = Array.isArray(data.organic) ? data.organic : [];
    return {
      ok: true,
      provider: 'serper',
      results: organic.slice(0, 5).map((r) => ({
        title: r.title || '',
        snippet: r.snippet || '',
        link: r.link || '',
      })),
    };
  } catch (err) {
    return { ok: false, provider: 'serper', reason: err.message };
  }
}

async function searchTavily(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: 5,
        search_depth: 'basic',
        include_answer: false,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, provider: 'tavily', reason: `http_${res.status}` };
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return {
      ok: true,
      provider: 'tavily',
      results: results.slice(0, 5).map((r) => ({
        title: r.title || '',
        snippet: r.content || '',
        link: r.url || '',
      })),
    };
  } catch (err) {
    return { ok: false, provider: 'tavily', reason: err.message };
  }
}

async function searchGoogleCse(query) {
  const key = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', key);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '5');
    url.searchParams.set('hl', 'es');
    const { ok, status, text } = await fetchText(url.toString());
    if (!ok) return { ok: false, provider: 'google_cse', reason: `http_${status}` };
    const data = JSON.parse(text);
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      ok: true,
      provider: 'google_cse',
      results: items.slice(0, 5).map((r) => ({
        title: r.title || '',
        snippet: r.snippet || '',
        link: r.link || '',
      })),
    };
  } catch (err) {
    return { ok: false, provider: 'google_cse', reason: err.message };
  }
}

async function searchDuckDuckGo(query) {
  try {
    const url =
      'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
    const { ok, status, text } = await fetchText(url);
    if (!ok) return { ok: false, provider: 'duckduckgo', reason: `http_${status}` };

    const results = [];
    const re =
      /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)>)/gi;
    let m;
    while ((m = re.exec(text)) && results.length < 5) {
      results.push({
        link: m[1],
        title: stripHtml(m[2]).slice(0, 160),
        snippet: stripHtml(m[3] || '').slice(0, 280),
      });
    }

    // Fallback looser parse
    if (!results.length) {
      const loose = /class="result__snippet"[^>]*>([\s\S]*?)<\//gi;
      let s;
      while ((s = loose.exec(text)) && results.length < 5) {
        const snip = stripHtml(s[1]).slice(0, 280);
        if (snip) results.push({ title: '', snippet: snip, link: '' });
      }
    }

    if (!results.length) {
      return { ok: false, provider: 'duckduckgo', reason: 'sin_resultados' };
    }
    return { ok: true, provider: 'duckduckgo', results };
  } catch (err) {
    return { ok: false, provider: 'duckduckgo', reason: err.message };
  }
}

async function webSearch(lead) {
  const query = buildSearchQuery(lead);
  if (!query) {
    return { ok: false, skipped: true, reason: 'sin_query', note: 'sin búsqueda web' };
  }

  const attempts = [];
  for (const fn of [searchSerper, searchTavily, searchGoogleCse, searchDuckDuckGo]) {
    const result = await fn(query);
    if (result == null) continue; // env not configured
    attempts.push({ provider: result.provider, ok: result.ok, reason: result.reason });
    if (result.ok && result.results?.length) {
      return { ...result, query, attempts };
    }
  }

  return {
    ok: false,
    query,
    reason: 'sin_proveedor',
    note: 'sin búsqueda web',
    attempts,
  };
}

function formatResearchForPrompt(research) {
  const lines = [];
  const site = research.site;
  const search = research.search;

  if (site?.ok) {
    lines.push('SITIO WEB (fetch real):');
    lines.push(`URL: ${site.url}`);
    if (site.title) lines.push(`Título: ${site.title}`);
    if (site.description) lines.push(`Meta: ${site.description}`);
    if (site.headings?.length) lines.push(`Headings: ${site.headings.join(' | ')}`);
    if (site.excerpt) lines.push(`Excerpt: ${site.excerpt.slice(0, 1200)}`);
  } else if (site && !site.skipped) {
    lines.push(`SITIO WEB: no se pudo obtener (${site.reason || 'error'}). No inventes que lo visitaste.`);
  } else {
    lines.push('SITIO WEB: no disponible.');
  }

  if (search?.ok && search.results?.length) {
    lines.push(`BÚSQUEDA WEB (${search.provider}, query="${search.query}"):`);
    for (const r of search.results.slice(0, 5)) {
      lines.push(`- ${r.title || '(sin título)'}: ${r.snippet || ''} ${r.link || ''}`.trim());
    }
  } else {
    lines.push(
      'BÚSQUEDA WEB: ' + (search?.note || 'sin búsqueda web') +
        (search?.reason ? ` (${search.reason})` : '') +
        '. No inventes resultados de búsqueda.'
    );
  }

  return lines.join('\n');
}

/**
 * Full research for a normalized lead.
 * @param {{ empresa?: string, nombre?: string, rubro?: string, sitio_web?: string }} lead
 */
async function researchLead(lead) {
  const [site, search] = await Promise.all([
    scrapeWebsite(lead.sitio_web),
    webSearch(lead),
  ]);

  const research = {
    site,
    search,
    researched_at: new Date().toISOString(),
  };
  const summary = formatResearchForPrompt(research);
  return { research, summary };
}

module.exports = {
  researchLead,
  scrapeWebsite,
  webSearch,
  formatResearchForPrompt,
  normalizeUrl,
};
