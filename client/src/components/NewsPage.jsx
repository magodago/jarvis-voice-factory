import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ExternalLink, Loader2, Cpu, Globe, Landmark, X, Zap, Monitor, Trophy, FlaskConical } from 'lucide-react';

const TOPICS = [
  { id: 'ai', label: 'IA & LLMs', icon: Cpu, desc: 'OpenAI, Anthropic, Google, modelos, asistentes' },
  { id: 'science', label: 'Ciencia + Med', icon: FlaskConical, desc: 'Avances médicos, Nature, papers' },
  { id: 'tech', label: 'Tech & Tools', icon: Monitor, desc: 'Nuevas herramientas, modelos baratos' },
  { id: 'spain', label: 'España', icon: Landmark, desc: 'Política y actualidad nacional' },
  { id: 'world', label: 'Internacional', icon: Globe, desc: 'Geopolítica y mundo' },
  { id: 'realmadrid', label: 'Real Madrid', icon: Trophy, desc: 'Fútbol, fichajes, resultados' },
];

// RSS sources per topic — used as fallback when backend is unreachable
// ALL Spanish-language sources, specific feeds per category
const RSS_SOURCES = {
  ai: [
    'https://www.xataka.com/tag/inteligencia-artificial/rss2.xml',
    'https://www.genbeta.com/tag/inteligencia-artificial/rss2.xml',
    'https://hipertextual.com/tag/inteligencia-artificial/feed.xml',
    'https://www.muycomputer.com/tag/inteligencia-artificial/feed/',
    'https://www.elconfidencial.com/rss/tecnologia/',
  ],
  science: [
    'https://www.agenciasinc.es/rss',
    'https://www.xataka.com/tag/medicina/rss2.xml',
    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/ciencia',
    'https://e00-elmundo.uecdn.es/elmundo/rss/ciencia.xml',
  ],
  tech: [
    'https://www.xataka.com/index.xml',
    'https://www.genbeta.com/index.xml',
    'https://hipertextual.com/feed.xml',
    'https://www.microsiervos.com/index.xml',
    'https://www.muylinux.com/feed/',
    'https://www.muycomputer.com/feed/',
  ],
  spain: [
    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
    'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml',
    'https://www.eldiario.es/rss/',
  ],
  world: [
    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/internacional',
    'https://feeds.bbci.co.uk/mundo/rss.xml',
  ],
  realmadrid: [
    'https://e00-marca.uecdn.es/rss/futbol/real-madrid.xml',
    'https://www.mundodeportivo.com/rss/futbol/real-madrid',
  ],
};

// Backend URLs to try (in order)
function getBackendUrls() {
  if (typeof window === 'undefined') return [];
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return ['']; // use Vite proxy
  return [
    'https://jarvis-neo-david.loca.lt',
    'https://jarvis-neo-david.serveo.net',
  ];
}

const CORS_PROXY = 'https://corsproxy.io/?';

const RELATIVE_TIME = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  const diffHrs = Math.floor((now - date) / 3600000);
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const SOURCE_COLORS = {
  'Xataka': '#00d4ff', 'Genbeta': '#7b00ff', 'Hipertextual': '#40f0ff',
  'El País': '#00d4ff', 'El Mundo': '#40f0ff', 'elDiario.es': '#ffb347',
  'Marca': '#00d4ff', 'Mundo Dep.': '#ffb347', 'BBC Mundo': '#ffb347',
  'ScienceDaily': '#00ff88', 'SINC': '#40f0ff', 'Nature': '#00d4ff',
};

function getSourceName(url) {
  if (url.includes('xataka')) return 'Xataka';
  if (url.includes('genbeta')) return 'Genbeta';
  if (url.includes('hipertextual')) return 'Hipertextual';
  if (url.includes('elpais')) return 'El País';
  if (url.includes('elmundo')) return 'El Mundo';
  if (url.includes('eldiario')) return 'elDiario.es';
  if (url.includes('marca')) return 'Marca';
  if (url.includes('mundodeportivo')) return 'Mundo Dep.';
  if (url.includes('bbci')) return 'BBC Mundo';
  if (url.includes('sciencedaily')) return 'ScienceDaily';
  if (url.includes('agenciasinc')) return 'SINC';
  if (url.includes('nature')) return 'Nature';
  return 'Noticias';
}

export default function NewsPage({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('ai');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const seenRef = useRef(new Set());
  const backendUrls = useMemo(() => getBackendUrls(), []);

  useEffect(() => {
    if (!isOpen) return;
    fetchFeed(activeTopic);
  }, [isOpen, activeTopic]);

  const tryBackend = async (topic) => {
    for (const baseUrl of backendUrls) {
      try {
        const url = baseUrl 
          ? `${baseUrl}/news/feed?topic=${topic}`
          : `/news/feed?topic=${topic}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.articles?.length > 0) {
          return data.articles.map(a => ({
            ...a,
            source: a.source || getSourceName(a.url || ''),
            sourceColor: a.sourceColor || SOURCE_COLORS[a.source] || '#00d4ff',
          }));
        }
      } catch {}
    }
    return null;
  };

  const fetchViaCORSProxy = async (topic) => {
    const sources = RSS_SOURCES[topic] || RSS_SOURCES.ai;
    const allArticles = [];
    
    const fetchPromises = sources.map(async (srcUrl) => {
      try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(srcUrl);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSClient(xml, srcUrl);
      } catch {
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const r of results) {
      if (r.status === 'fulfilled') allArticles.push(...r.value);
    }

    return allArticles;
  };

  const fetchFeed = async (topic) => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    // Try backend first
    let articles = await tryBackend(topic);

    // If backend fails, use CORS proxy (direct RSS)
    if (!articles || articles.length === 0) {
      setUsingFallback(true);
      articles = await fetchViaCORSProxy(topic);
    }

    if (!articles || articles.length === 0) {
      setArticles([]);
      setError('No se encontraron noticias. Verifica tu conexion.');
      setLoading(false);
      return;
    }

    // Dedup
    const fresh = articles.filter(a => {
      const key = a.url || a.link || '';
      if (!key || seenRef.current.has(key)) return false;
      seenRef.current.add(key);
      return true;
    });

    // Sort by date
    fresh.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate) : 0;
      const db = b.pubDate ? new Date(b.pubDate) : 0;
      return db - da;
    });

    if (seenRef.current.size > 300) {
      const entries = [...seenRef.current];
      seenRef.current = new Set(entries.slice(-150));
    }

    setArticles(fresh.slice(0, 30));
    if (fresh.length === 0) {
      setError('Ya has visto todas las noticias. Prueba otra categoria.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col bg-cyber-bg/98 backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-cyber-cyan/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center">
            <Newspaper size={22} className="text-cyber-cyan drop-shadow-[0_0_6px_rgba(0,212,255,0.5)]" />
          </div>
          <div>
            <h2 className="font-display text-base tracking-[0.15em] text-cyber-cyan drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]">
              NOTICIAS
            </h2>
            <p className="text-[10px] text-cyber-cyan/50 font-body tracking-wide">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              {usingFallback && <span className="text-cyber-amber/60 ml-1">• modo directo</span>}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 hover:bg-cyber-cyan/20 transition-all">
          <X size={20} className="text-cyber-cyan/70" />
        </button>
      </div>

      {/* Topic tabs */}
      <div className="flex flex-wrap gap-2 px-5 py-4 border-b border-cyber-cyan/10">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTopic(t.id); setArticles([]); }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-body whitespace-nowrap transition-all ${
                activeTopic === t.id
                  ? 'bg-cyber-cyan/15 border-2 border-cyber-cyan/40 text-cyber-cyan shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                  : 'bg-cyber-panel/50 border border-cyber-border/30 text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-white/70'
              }`}
            >
              <Icon size={14} className={activeTopic === t.id ? 'drop-shadow-[0_0_4px_rgba(0,212,255,0.5)]' : ''} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Topic description */}
      {TOPICS.find(t => t.id === activeTopic)?.desc && (
        <div className="px-5 py-2 border-b border-cyber-cyan/5">
          <p className="text-[10px] text-cyber-cyan/40 font-body italic">
            {TOPICS.find(t => t.id === activeTopic)?.desc}
          </p>
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin text-cyber-cyan" />
            <span className="text-sm font-body text-cyber-cyan/70">Cargando titulares...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
            <Zap size={28} className="text-cyber-amber/40" />
            <span className="text-sm font-body text-cyber-amber/60 text-center">{error}</span>
          </div>
        )}

        <AnimatePresence>
          {!loading && articles.map((a, i) => (
            <motion.a
              key={a.url || a.link || i}
              href={a.url || a.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="block bg-cyber-panel/90 backdrop-blur-sm border border-cyber-cyan/10 rounded-2xl p-4 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                      style={{
                        color: a.sourceColor || '#00d4ff',
                        borderColor: (a.sourceColor || '#00d4ff') + '30',
                        backgroundColor: (a.sourceColor || '#00d4ff') + '08',
                      }}
                    >
                      {a.source || getSourceName(a.url || '')}
                    </span>
                    {a.pubDate && (
                      <span className="text-[10px] font-mono text-cyber-muted/50">
                        {RELATIVE_TIME(a.pubDate)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-body text-cyber-white/90 font-medium leading-snug group-hover:text-cyber-cyan transition-colors">
                    {a.title}
                  </h3>
                  {a.snippet && (
                    <p className="text-xs text-cyber-muted/60 mt-1.5 line-clamp-2 font-body">
                      {a.snippet}
                    </p>
                  )}
                </div>
                <ExternalLink size={14} className="text-cyber-muted/30 group-hover:text-cyber-cyan shrink-0 mt-1 transition-colors" />
              </div>
            </motion.a>
          ))}
        </AnimatePresence>

        {!loading && !error && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Newspaper size={32} className="text-cyber-muted/30" />
            <span className="text-sm font-body text-cyber-muted/50">Selecciona un tema para ver noticias</span>
          </div>
        )}
      </div>

      {/* Matrix cascade */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[1.5px] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              height: `${50 + Math.random() * 100}px`,
              background: `linear-gradient(180deg, rgba(0,212,255,0.5) 0%, rgba(64,240,255,0.3) 50%, transparent 100%)`,
              boxShadow: `0 0 6px rgba(0,212,255,0.3)`,
            }}
            animate={{ top: ['-10%', '110%'], opacity: [0.7, 0.2, 0] }}
            transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 4, ease: 'linear' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Client-side RSS parser (used as fallback)
function parseRSSClient(xml, sourceUrl) {
  const articles = [];
  const sourceName = getSourceName(sourceUrl);
  const sourceColor = SOURCE_COLORS[sourceName] || '#00d4ff';

  // RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    const desc = stripHtml(extractTag(item, 'description') || '');
    const pubDate = extractTag(item, 'pubDate');
    if (title && link) {
      const article = {
        title: decodeHtml(title).slice(0, 150),
        snippet: desc.slice(0, 250),
        url: link,
        link,
        source: sourceName,
        sourceColor,
        pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      };
      if (isSpanishText(article.title)) articles.push(article);
    }
  }

  // Atom entries  
  if (articles.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = extractTag(entry, 'title');
      const summary = stripHtml(extractTag(entry, 'summary') || extractTag(entry, 'content') || '');
      const pubDate = extractTag(entry, 'published') || extractTag(entry, 'updated');
      const linkMatch = entry.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
      const link = linkMatch ? linkMatch[1] : '';
      if (title && link) {
        const article = {
          title: decodeHtml(title).slice(0, 150),
          snippet: summary.slice(0, 250),
          url: link,
          link,
          source: sourceName,
          sourceColor,
          pubDate: pubDate ? new Date(pubDate).toISOString() : null,
        };
        if (isSpanishText(article.title)) articles.push(article);
      }
    }
  }

  return articles;
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>|<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const m = xml.match(regex);
  return m ? (m[1] || m[2] || '').trim() : '';
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&aacute;/gi, 'a').replace(/&eacute;/gi, 'e').replace(/&iacute;/gi, 'i')
    .replace(/&oacute;/gi, 'o').replace(/&uacute;/gi, 'u').replace(/&ntilde;/gi, 'n')
    .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function isSpanishText(text) {
  if (!text) return true;
  const t = text.toLowerCase();
  if (/[áéíóúüñ]/.test(t)) return true;
  const englishWords = /\b(the|is|are|was|were|has|have|this|that|with|from|will|would|could|should|about|your|their|they|been|more|also|what|when|which|said|like|just|over|into|than|them|some|only|other|after|being|down|most|such|much|even|still)\b/g;
  const matches = t.match(englishWords) || [];
  if (matches.length >= 3) return false;
  if (/^(The|How|What|Why|When|This|New|Apple|Google|Meta|Microsoft|OpenAI)\s/.test(text)) return false;
  return true;
}
