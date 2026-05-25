import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ExternalLink, Loader2, Cpu, Globe, Landmark, X, Monitor, Trophy, FlaskConical, Sparkles, Clock } from 'lucide-react';

const TOPICS = [
  { id: 'ai', label: 'IA & LLMs', icon: Cpu, color: '#00d4ff', desc: 'OpenAI, Anthropic, Google, modelos, asistentes' },
  { id: 'science', label: 'Ciencia', icon: FlaskConical, color: '#00ff88', desc: 'Avances médicos, papers, descubrimientos' },
  { id: 'tech', label: 'Tech', icon: Monitor, color: '#40f0ff', desc: 'Herramientas, software, gadgets' },
  { id: 'spain', label: 'España', icon: Landmark, color: '#ffb347', desc: 'Política y actualidad nacional' },
  { id: 'world', label: 'Mundo', icon: Globe, color: '#7b00ff', desc: 'Geopolítica internacional' },
  { id: 'realmadrid', label: 'Madrid', icon: Trophy, color: '#ffd700', desc: 'Fútbol, fichajes, resultados' },
];

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

function getBackendUrls() {
  if (typeof window === 'undefined') return [];
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return [''];
  return ['https://jarvis-neo-david.loca.lt', 'https://jarvis-neo-david.serveo.net'];
}

// Discover active backend URL (used for article fetching)
async function discoverBackendUrl() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';

  // 1. tunnel.json
  try {
    const r = await fetch('/jarvis-voice-factory/tunnel.json', { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      if (d.tunnelUrl) {
        const t = await fetch(`${d.tunnelUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (t.ok) return d.tunnelUrl;
      }
    }
  } catch {}

  // 2. Fallback candidates
  const candidates = getBackendUrls().filter(Boolean);
  for (const c of candidates) {
    try {
      const r = await fetch(`${c}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return c;
    } catch {}
  }

  return null;
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
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const SOURCE_COLORS = {
  'Xataka': '#00d4ff', 'Genbeta': '#7b00ff', 'Hipertextual': '#40f0ff',
  'El País': '#00d4ff', 'El Mundo': '#40f0ff', 'elDiario.es': '#ffb347',
  'Marca': '#00d4ff', 'Mundo Dep.': '#ffb347', 'BBC Mundo': '#ffb347',
  'ScienceDaily': '#00ff88', 'SINC': '#40f0ff', 'Nature': '#00d4ff',
  'El Confidencial': '#7b00ff', 'MuyComputer': '#ffb347', 'Microsiervos': '#ffb347',
  'MuyLinux': '#00ff88', 'ABC España': '#ff4466', 'Nobbot': '#7b00ff',
  'Defensa Central': '#7b00ff',
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
  if (url.includes('elconfidencial')) return 'El Confidencial';
  if (url.includes('muycomputer')) return 'MuyComputer';
  if (url.includes('microsiervos')) return 'Microsiervos';
  if (url.includes('muylinux')) return 'MuyLinux';
  if (url.includes('abc')) return 'ABC España';
  if (url.includes('nobbot')) return 'Nobbot';
  if (url.includes('defensacentral')) return 'Defensa Central';
  return 'Noticias';
}

export default function NewsPage({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('ai');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  // Cache: Map<topic, {articles, timestamp}>
  const cacheRef = useRef(new Map());
  const seenRef = useRef(new Set());
  const backendUrls = useMemo(() => getBackendUrls(), []);
  const activeTopicData = TOPICS.find(t => t.id === activeTopic) || TOPICS[0];

  // Open article reader modal
  const openArticle = async (article) => {
    setSelectedArticle(article);
    setArticleContent(null);
    setArticleLoading(true);
    try {
      const baseUrl = await discoverBackendUrl();
      const url = baseUrl ? `${baseUrl}/news/article?url=${encodeURIComponent(article.url || article.link)}` : `/news/article?url=${encodeURIComponent(article.url || article.link)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setArticleContent(data);
    } catch (err) {
      setArticleContent({ error: true, message: 'No se pudo cargar el artículo completo.', url: article.url || article.link });
    }
    setArticleLoading(false);
  };

  // When topic changes: show cache immediately, then refresh
  const switchTopic = useCallback((topicId) => {
    setActiveTopic(topicId);
    const cached = cacheRef.current.get(topicId);
    if (cached?.articles?.length) {
      setArticles(cached.articles);
      setError(null);
      setLoading(false);
    } else {
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchFeed(activeTopic);
  }, [isOpen, activeTopic]);

  const tryBackend = async (topic) => {
    for (const baseUrl of backendUrls) {
      try {
        const url = baseUrl ? `${baseUrl}/news/feed?topic=${topic}` : `/news/feed?topic=${topic}`;
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
      } catch { return []; }
    });
    const results = await Promise.allSettled(fetchPromises);
    for (const r of results) {
      if (r.status === 'fulfilled') allArticles.push(...r.value);
    }
    return allArticles;
  };

  const fetchFeed = async (topic) => {
    // Show cached articles while loading
    const cached = cacheRef.current.get(topic);
    const hasCache = cached?.articles?.length > 0;
    if (hasCache) {
      setArticles(cached.articles);
    }
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    let fresh = await tryBackend(topic);

    if (!fresh || fresh.length === 0) {
      setUsingFallback(true);
      fresh = await fetchViaCORSProxy(topic);
    }

    if (!fresh || fresh.length === 0) {
      if (!hasCache) setArticles([]);
      setError('No se encontraron noticias.');
      setLoading(false);
      return;
    }

    // Dedup globally
    const newArticles = fresh.filter(a => {
      const key = a.url || a.link || '';
      if (!key || seenRef.current.has(key)) return false;
      seenRef.current.add(key);
      return true;
    });

    // Sort by date
    newArticles.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate) : 0;
      const db = b.pubDate ? new Date(b.pubDate) : 0;
      return db - da;
    });

    if (seenRef.current.size > 500) {
      const entries = [...seenRef.current];
      seenRef.current = new Set(entries.slice(-250));
    }

    const sliced = newArticles.slice(0, 30);

    // Update cache
    cacheRef.current.set(topic, { articles: sliced, timestamp: Date.now() });

    if (sliced.length === 0 && hasCache) {
      // Keep showing cached
      setLoading(false);
      return;
    }

    setArticles(sliced);
    if (sliced.length === 0) {
      setError('Ya has visto todas las noticias de esta categoría.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col bg-[#060010]/98 backdrop-blur-2xl pb-[env(safe-area-inset-bottom,20px)]"
    >
      {/* === HEADER === */}
      <div className="px-5 pt-5 pb-3 border-b border-cyber-cyan/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-cyan/5 border-2 border-cyber-cyan/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.2)]">
              <Newspaper size={24} className="text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
            </div>
            <div>
              <h2 className="font-display text-lg tracking-[0.15em] text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                NOTICIAS
              </h2>
              <p className="text-[10px] text-cyber-cyan/40 font-body">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                {usingFallback && <span className="text-amber-400/60 ml-1.5">• directo</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyber-cyan/30 transition-all group">
            <X size={20} className="text-white/60 group-hover:text-cyber-cyan transition-colors" />
          </button>
        </div>

        {/* === TOPIC TABS - Premium Pills === */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTopic === t.id;
            const cached = cacheRef.current.get(t.id);
            const count = cached?.articles?.length || 0;
            return (
              <motion.button
                key={t.id}
                onClick={() => switchTopic(t.id)}
                whileTap={{ scale: 0.94 }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-white/50 bg-white/3 border border-white/5 hover:text-white/80 hover:bg-white/8'
                }`}
                style={isActive ? {
                  backgroundColor: t.color + '18',
                  borderColor: t.color + '40',
                  boxShadow: `0 0 20px ${t.color}25, 0 0 8px ${t.color}15`,
                  border: `2px solid ${t.color}40`,
                } : {}}
              >
                {isActive && (
                  <motion.div layoutId="topicGlow" className="absolute inset-0 rounded-2xl opacity-30"
                    style={{ background: `radial-gradient(circle at 30% 50%, ${t.color}20, transparent)` }} />
                )}
                <Icon size={15} style={{ color: isActive ? t.color : undefined }}
                  className={isActive ? 'drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]' : ''} />
                <span style={{ color: isActive ? t.color : undefined }}>{t.label}</span>
                {count > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-white/30">
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* === DESCRIPTION BAR === */}
      <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <p className="text-[11px] text-white/30 font-body italic flex items-center gap-2">
          <Sparkles size={12} className="text-cyber-cyan/40" />
          {activeTopicData.desc}
        </p>
      </div>

      {/* === ARTICLES LIST === */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {loading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Loader2 size={36} className="text-cyber-cyan/60" />
            </motion.div>
            <span className="text-sm text-white/40 font-body">Cargando titulares...</span>
          </div>
        )}

        {error && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center">
              <Newspaper size={24} className="text-white/20" />
            </div>
            <span className="text-sm text-white/40 font-body text-center">{error}</span>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {articles.map((a, i) => {
            const sourceColor = a.sourceColor || SOURCE_COLORS[a.source] || '#00d4ff';
            return (
              <motion.div
                key={a.url || a.link || i}
                onClick={() => openArticle(a)}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                className="group block relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: sourceColor + '06',
                  borderColor: sourceColor + '12',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = sourceColor + '10';
                  e.currentTarget.style.borderColor = sourceColor + '35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = sourceColor + '06';
                  e.currentTarget.style.borderColor = sourceColor + '12';
                }}
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: sourceColor }} />

                <div className="pl-5 pr-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Source badge + time */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                          style={{
                            color: sourceColor,
                            backgroundColor: sourceColor + '10',
                            border: `1px solid ${sourceColor}20`,
                            boxShadow: `0 0 6px ${sourceColor}10`,
                          }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sourceColor }} />
                          {a.source || getSourceName(a.url || '')}
                        </span>
                        {a.pubDate && (
                          <span className="text-[10px] font-mono text-white/25 flex items-center gap-1">
                            <Clock size={9} />
                            {RELATIVE_TIME(a.pubDate)}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-[13px] font-medium text-white/90 leading-snug group-hover:text-white transition-colors line-clamp-2"
                        style={{ textShadow: `0 0 1px transparent` }}>
                        {a.title}
                      </h3>

                      {/* Snippet */}
                      {a.snippet && (
                        <p className="text-[11px] text-white/35 mt-1.5 line-clamp-2 leading-relaxed font-body">
                          {a.snippet}
                        </p>
                      )}
                    </div>

                    <ExternalLink size={13}
                      className="shrink-0 mt-1 text-white/15 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading more indicator */}
        {loading && articles.length > 0 && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={14} className="animate-spin text-cyber-cyan/40" />
            <span className="text-[11px] text-white/30 font-body">Actualizando...</span>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="text-center py-6">
            <span className="text-[10px] text-white/15 font-mono">
              {articles.length} noticias • {new Date().toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
      </div>

      {/* === BACKGROUND PARTICLES === */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[1px] rounded-full"
            style={{
              left: `${5 + Math.random() * 90}%`,
              height: `${40 + Math.random() * 80}px`,
              background: `linear-gradient(180deg, rgba(0,212,255,0.6) 0%, rgba(100,200,255,0.2) 60%, transparent 100%)`,
            }}
            animate={{ top: ['-5%', '105%'], opacity: [0.5, 0.1, 0] }}
            transition={{ duration: 2.5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: 'linear' }}
          />
        ))}
      </div>

      {/* === ARTICLE READER MODAL === */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#060010]"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-[10px] font-mono px-2 py-1 rounded-lg"
                  style={{
                    color: selectedArticle.sourceColor || '#00d4ff',
                    backgroundColor: (selectedArticle.sourceColor || '#00d4ff') + '10',
                    border: `1px solid ${(selectedArticle.sourceColor || '#00d4ff')}20`,
                  }}>
                  {selectedArticle.source || 'Noticia'}
                </span>
                <span className="text-[10px] text-white/30 font-mono">{RELATIVE_TIME(selectedArticle.pubDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedArticle(null); setArticleContent(null); }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <X size={18} className="text-white/60" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {articleLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                    <Loader2 size={36} className="text-cyber-cyan/60" />
                  </motion.div>
                  <span className="text-sm text-white/40">Cargando artículo...</span>
                </div>
              )}

              {articleContent && !articleContent.error && (
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-xl font-bold text-white/95 leading-tight mb-6 font-body"
                    style={{ textShadow: '0 0 20px rgba(0,212,255,0.15)' }}>
                    {articleContent.title || selectedArticle.title}
                  </h1>

                  {articleContent.content?.map((p, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="text-[15px] text-white/75 leading-relaxed mb-4 font-body"
                    >
                      {p}
                    </motion.p>
                  ))}
                </div>
              )}

              {articleContent?.error && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-md mx-auto text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center">
                    <Newspaper size={28} className="text-white/20" />
                  </div>
                  <p className="text-sm text-white/40 font-body">{articleContent.message}</p>
                  <a href={articleContent.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs font-body hover:bg-cyber-cyan/20 transition-all">
                    <ExternalLink size={14} /> Abrir en navegador
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── RSS Parser (client fallback) ──
function parseRSSClient(xml, sourceUrl) {
  const articles = [];
  const sourceName = getSourceName(sourceUrl);
  const sourceColor = SOURCE_COLORS[sourceName] || '#00d4ff';

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
        url: link, link,
        source: sourceName, sourceColor,
        pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      };
      if (isSpanishText(article.title)) articles.push(article);
    }
  }

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
          url: link, link,
          source: sourceName, sourceColor,
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
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
