import { Router } from 'express';

const router = Router();

// === RSS Sources ===
// Each source has: id, name, url, color (for UI badge), topic category
const SOURCES = {
  ai: [
    { id: 'xataka', name: 'Xataka', url: 'https://www.xataka.com/index.xml', color: '#00d4ff', topic: 'ai' },
    { id: 'hipertextual', name: 'Hipertextual', url: 'https://hipertextual.com/rss.xml', color: '#40f0ff', topic: 'ai' },
    { id: 'genbeta', name: 'Genbeta', url: 'https://www.genbeta.com/index.xml', color: '#7b00ff', topic: 'ai' },
  ],
  tech: [
    { id: 'xataka', name: 'Xataka', url: 'https://www.xataka.com/index.xml', color: '#00d4ff', topic: 'tech' },
    { id: 'hipertextual', name: 'Hipertextual', url: 'https://hipertextual.com/rss.xml', color: '#40f0ff', topic: 'tech' },
    { id: 'microsiervos', name: 'Microsiervos', url: 'https://www.microsiervos.com/index.xml', color: '#ffb347', topic: 'tech' },
  ],
  spain: [
    { id: 'elpais', name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', color: '#00d4ff', topic: 'spain' },
    { id: 'elmundo', name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', color: '#40f0ff', topic: 'spain' },
    { id: 'eldiario', name: 'elDiario.es', url: 'https://www.eldiario.es/rss/', color: '#ffb347', topic: 'spain' },
  ],
  world: [
    { id: 'elpais-int', name: 'El País Internacional', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/internacional', color: '#00d4ff', topic: 'world' },
    { id: 'elmundo-int', name: 'El Mundo Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/internacional.xml', color: '#40f0ff', topic: 'world' },
  ],
};

// In-memory dedup cache — prevents repeating same article within a session
const seenUrls = new Set();
const MAX_SEEN = 500;

/**
 * GET /news/feed?topic=ai|spain|world|tech
 * Returns aggregated RSS feed articles from multiple Spanish sources
 */
router.get('/feed', async (req, res) => {
  const { topic = 'ai' } = req.query;
  const sources = SOURCES[topic] || SOURCES.ai;

  try {
    const allArticles = [];
    const fetchPromises = sources.map(async (src) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(src.url, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRSSArticles(xml, src);
      } catch (err) {
        console.error(`[News] Error fetching ${src.name}:`, err.message);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }

    // Deduplicate by URL + sort by date (most recent first)
    const unique = [];
    const urlSet = new Set();
    for (const a of allArticles) {
      if (!urlSet.has(a.url) && !seenUrls.has(a.url)) {
        urlSet.add(a.url);
        unique.push(a);
        seenUrls.add(a.url);
        if (seenUrls.size > MAX_SEEN) {
          // Clear oldest entries
          const entries = [...seenUrls];
          seenUrls.clear();
          entries.slice(-MAX_SEEN / 2).forEach(e => seenUrls.add(e));
        }
      }
    }

    // Sort: articles with pubDate first, then by date descending
    unique.sort((a, b) => {
      if (a.pubDate && b.pubDate) return new Date(b.pubDate) - new Date(a.pubDate);
      if (a.pubDate) return -1;
      if (b.pubDate) return 1;
      return 0;
    });

    // Limit to 30 articles
    const sliced = unique.slice(0, 30);

    res.json({
      topic,
      count: sliced.length,
      articles: sliced,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[News] Feed error:', err);
    res.status(502).json({ error: 'FEED_ERROR', message: 'No se pudieron obtener noticias.' });
  }
});

/**
 * GET /news/search?q=... (mantenemos compatibilidad)
 * Redirige al feed con el topic más cercano
 */
router.get('/search', async (req, res) => {
  const { q = '' } = req.query;
  const qLower = q.toLowerCase();
  let topic = 'ai';
  if (qLower.includes('política') || qLower.includes('españa')) topic = 'spain';
  else if (qLower.includes('internacional') || qLower.includes('world')) topic = 'world';
  else if (qLower.includes('robot') || qLower.includes('tech')) topic = 'tech';

  // Proxy al feed
  try {
    const feedRes = await fetch(`http://localhost:${process.env.PORT || 4000}/news/feed?topic=${topic}`);
    const data = await feedRes.json();
    res.json(data);
  } catch {
    res.json({ topic, count: 0, articles: [], timestamp: new Date().toISOString() });
  }
});

/**
 * Simple RSS XML parser — extracts <item> entries
 * Handles both RSS 2.0 and Atom feeds
 */
function parseRSSArticles(xml, source) {
  const articles = [];

  // Try RSS 2.0 <item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const article = extractItem(item, source);
    if (article && article.title && article.url) {
      articles.push(article);
    }
  }

  // Try Atom <entry> tags if no items found
  if (articles.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const article = extractAtomEntry(entry, source);
      if (article && article.title && article.url) {
        articles.push(article);
      }
    }
  }

  return articles;
}

function extractItem(xml, source) {
  const title = extractTag(xml, 'title');
  const link = extractTag(xml, 'link');
  const description = stripHtml(extractTag(xml, 'description') || '');
  const pubDate = extractTag(xml, 'pubDate');
  const category = extractTag(xml, 'category');
  const guid = extractTag(xml, 'guid');

  // Use guid for dedup if available, otherwise link
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
    category: category || null,
  };
}

function extractAtomEntry(xml, source) {
  const title = extractTag(xml, 'title');
  const summary = stripHtml(extractTag(xml, 'summary') || extractTag(xml, 'content') || '');
  const pubDate = extractTag(xml, 'published') || extractTag(xml, 'updated');

  // Atom links: <link href="..." />
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
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export default router;
