import { Router } from 'express';

const router = Router();

// === RSS Sources — Organizadas por tema ===
const SOURCES = {
  // AI & LLMs — OpenAI, Anthropic, Google, nuevos modelos, asistentes
  ai: [
    { id: 'xataka-ia', name: 'Xataka IA', url: 'https://www.xataka.com/tag/inteligencia-artificial/rss2.xml', color: '#00d4ff', topic: 'ai' },
    { id: 'genbeta-ia', name: 'Genbeta IA', url: 'https://www.genbeta.com/tag/inteligencia-artificial/rss2.xml', color: '#7b00ff', topic: 'ai' },
    { id: 'hipertextual', name: 'Hipertextual', url: 'https://hipertextual.com/feed.xml', color: '#40f0ff', topic: 'ai' },
    { id: 'xataka', name: 'Xataka', url: 'https://www.xataka.com/index.xml', color: '#00d4ff', topic: 'ai' },
    { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', color: '#00ff88', topic: 'ai' },
    { id: 'venturebeat-ai', name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', color: '#ffb347', topic: 'ai' },
  ],
  // Ciencia + Medicina + AI
  science: [
    { id: 'nature-ai', name: 'Nature AI', url: 'https://www.nature.com/subjects/artificial-intelligence.rss', color: '#00d4ff', topic: 'science' },
    { id: 'sciencedaily-ai', name: 'ScienceDaily AI', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', color: '#40f0ff', topic: 'science' },
    { id: 'xataka-med', name: 'Xataka Medicina', url: 'https://www.xataka.com/tag/medicina/rss2.xml', color: '#00ff88', topic: 'science' },
    { id: 'agenciasinc', name: 'SINC Ciencia', url: 'https://www.agenciasinc.es/rss', color: '#ffb347', topic: 'science' },
    { id: 'elconfidencial-tec', name: 'El Confidencial Tec', url: 'https://www.elconfidencial.com/rss/tecnologia/', color: '#7b00ff', topic: 'science' },
  ],
  // Tecnología general + modelos baratos + herramientas nuevas
  tech: [
    { id: 'xataka', name: 'Xataka', url: 'https://www.xataka.com/index.xml', color: '#00d4ff', topic: 'tech' },
    { id: 'genbeta', name: 'Genbeta', url: 'https://www.genbeta.com/index.xml', color: '#7b00ff', topic: 'tech' },
    { id: 'hipertextual', name: 'Hipertextual', url: 'https://hipertextual.com/feed.xml', color: '#40f0ff', topic: 'tech' },
    { id: 'microsiervos', name: 'Microsiervos', url: 'https://www.microsiervos.com/index.xml', color: '#ffb347', topic: 'tech' },
    { id: 'muylinux', name: 'MuyLinux', url: 'https://www.muylinux.com/feed/', color: '#00ff88', topic: 'tech' },
  ],
  // Política España
  spain: [
    { id: 'elpais', name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', color: '#00d4ff', topic: 'spain' },
    { id: 'elmundo', name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', color: '#40f0ff', topic: 'spain' },
    { id: 'eldiario', name: 'elDiario.es', url: 'https://www.eldiario.es/rss/', color: '#ffb347', topic: 'spain' },
    { id: 'elconfidencial', name: 'El Confidencial', url: 'https://www.elconfidencial.com/rss/espana/', color: '#7b00ff', topic: 'spain' },
    { id: 'abc', name: 'ABC España', url: 'https://www.abc.es/rss/feeds/abc_espana.xml', color: '#ff4466', topic: 'spain' },
  ],
  // Política Internacional
  world: [
    { id: 'elpais-int', name: 'El País Internacional', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/internacional', color: '#00d4ff', topic: 'world' },
    { id: 'elmundo-int', name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/internacional.xml', color: '#40f0ff', topic: 'world' },
    { id: 'bbc-mundo', name: 'BBC Mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', color: '#ffb347', topic: 'world' },
  ],
  // Real Madrid
  realmadrid: [
    { id: 'marca-rm', name: 'Marca RM', url: 'https://e00-marca.uecdn.es/rss/futbol/real-madrid.xml', color: '#00d4ff', topic: 'realmadrid' },
    { id: 'mundodeportivo-rm', name: 'Mundo Dep. RM', url: 'https://www.mundodeportivo.com/rss/futbol/real-madrid', color: '#ffb347', topic: 'realmadrid' },
    { id: 'defcentral-rm', name: 'Defensa Central', url: 'https://www.defensacentral.com/feed/', color: '#7b00ff', topic: 'realmadrid' },
  ],
};

// In-memory dedup cache
const seenUrls = new Set();
const MAX_SEEN = 500;

router.get('/feed', async (req, res) => {
  const { topic = 'ai' } = req.query;
  const sources = SOURCES[topic] || SOURCES.ai;

  try {
    const allArticles = [];
    const fetchPromises = sources.map(async (src) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(src.url, { 
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'JARVIS-News/1.0 (RSS Reader)' }
        });
        clearTimeout(timeout);
        
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRSSArticles(xml, src);
      } catch (err) {
        // Silent fail for individual sources
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }

    // Deduplicate + sort by date
    const unique = [];
    const urlSet = new Set();
    for (const a of allArticles) {
      if (!urlSet.has(a.url) && !seenUrls.has(a.url)) {
        urlSet.add(a.url);
        unique.push(a);
        seenUrls.add(a.url);
        if (seenUrls.size > MAX_SEEN) {
          const entries = [...seenUrls];
          seenUrls.clear();
          entries.slice(-MAX_SEEN / 2).forEach(e => seenUrls.add(e));
        }
      }
    }

    unique.sort((a, b) => {
      if (a.pubDate && b.pubDate) return new Date(b.pubDate) - new Date(a.pubDate);
      if (a.pubDate) return -1;
      if (b.pubDate) return 1;
      return 0;
    });

    const sliced = unique.slice(0, 30);

    res.json({ topic, count: sliced.length, articles: sliced, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[News] Feed error:', err);
    res.status(502).json({ error: 'FEED_ERROR', message: 'No se pudieron obtener noticias.' });
  }
});

router.get('/search', async (req, res) => {
  const { q = '' } = req.query;
  const qLower = q.toLowerCase();
  let topic = 'ai';
  if (qLower.includes('politica') || qLower.includes('españa')) topic = 'spain';
  else if (qLower.includes('internacional') || qLower.includes('mundo')) topic = 'world';
  else if (qLower.includes('ciencia') || qLower.includes('medic')) topic = 'science';
  else if (qLower.includes('real madrid') || qLower.includes('futbol')) topic = 'realmadrid';
  else if (qLower.includes('robot') || qLower.includes('tech')) topic = 'tech';

  try {
    const feedRes = await fetch(`http://localhost:${process.env.PORT || 4000}/news/feed?topic=${topic}`);
    const data = await feedRes.json();
    res.json(data);
  } catch {
    res.json({ topic, count: 0, articles: [], timestamp: new Date().toISOString() });
  }
});

// === XML Parser ===
function parseRSSArticles(xml, source) {
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const article = extractItem(match[1], source);
    if (article && article.title && article.url) articles.push(article);
  }
  if (articles.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const article = extractAtomEntry(match[1], source);
      if (article && article.title && article.url) articles.push(article);
    }
  }
  return articles;
}

function extractItem(xml, source) {
  const title = extractTag(xml, 'title');
  const link = extractTag(xml, 'link');
  const description = stripHtml(extractTag(xml, 'description') || '');
  const pubDate = extractTag(xml, 'pubDate');
  const guid = extractTag(xml, 'guid');
  const url = link || guid || '';
  if (!title || !url) return null;
  return {
    title: decodeHtml(title).slice(0, 150),
    snippet: description.slice(0, 250),
    url,
    source: source.name,
    sourceColor: source.color,
    topic: source.topic,
    pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    category: null,
  };
}

function extractAtomEntry(xml, source) {
  const title = extractTag(xml, 'title');
  const summary = stripHtml(extractTag(xml, 'summary') || extractTag(xml, 'content') || '');
  const pubDate = extractTag(xml, 'published') || extractTag(xml, 'updated');
  const linkMatch = xml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
  const url = linkMatch ? linkMatch[1] : '';
  if (!title || !url) return null;
  return {
    title: decodeHtml(title).slice(0, 150),
    snippet: summary.slice(0, 250),
    url,
    source: source.name,
    sourceColor: source.color,
    topic: source.topic,
    pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    category: null,
  };
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>|<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export default router;
