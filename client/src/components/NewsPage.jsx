import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ExternalLink, Loader2, Bot, Globe, Landmark, X, Cpu, Zap } from 'lucide-react';

const TOPICS = [
  { id: 'ai', label: 'Inteligencia Artificial', icon: Cpu, query: 'inteligencia artificial 2026' },
  { id: 'robots', label: 'Robótica', icon: Bot, query: 'robotics humanoid robots 2026' },
  { id: 'spain', label: 'Política España', icon: Landmark, query: 'política española actualidad 2026' },
  { id: 'world', label: 'Política Internacional', icon: Globe, query: 'world politics international 2026' },
];

export default function NewsPage({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('ai');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchNews(activeTopic);
  }, [isOpen, activeTopic]);

  const fetchNews = async (topic) => {
    setLoading(true);
    setArticles([]);
    try {
      const topicData = TOPICS.find(t => t.id === topic);
      // Use server-side proxy to avoid CORS
      const res = await fetch(`/news/search?q=${encodeURIComponent(topicData.query)}`);
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      
      const items = [];
      if (data.RelatedTopics) {
        for (const item of data.RelatedTopics.slice(0, 15)) {
          if (item.Text && item.FirstURL) {
            items.push({
              title: item.Text.split(' - ')[0]?.slice(0, 120) || item.Text.slice(0, 120),
              snippet: item.Text.slice(0, 250),
              url: item.FirstURL,
              source: new URL(item.FirstURL).hostname.replace('www.', ''),
            });
          }
        }
      }
      if (data.AbstractText) {
        items.unshift({
          title: data.Heading || topicData.label,
          snippet: data.AbstractText,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(topicData.query)}`,
          source: data.AbstractSource || 'Wikipedia',
        });
      }
      setArticles(items.length > 0 ? items : [{ title: 'No se encontraron noticias', snippet: 'Intenta con otro tema.', url: '#', source: '' }]);
    } catch {
      setArticles([{ title: 'Error de conexión', snippet: 'No se pudo cargar las noticias. Verifica que el servidor esté corriendo.', url: '#', source: '' }]);
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
            <p className="text-[10px] text-cyber-cyan/50 font-body tracking-wide">JARVIS News Network</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 hover:bg-cyber-cyan/20 transition-all">
          <X size={20} className="text-cyber-cyan/70" />
        </button>
      </div>

      {/* Topic tabs */}
      <div className="flex gap-2 px-5 py-4 overflow-x-auto border-b border-cyber-cyan/10">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-body whitespace-nowrap transition-all ${
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

      {/* Articles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="relative">
              <Loader2 size={32} className="animate-spin text-cyber-cyan" />
              <div className="absolute inset-0 blur-xl bg-cyber-cyan/30 rounded-full" />
            </div>
            <span className="text-sm font-body text-cyber-cyan/70">Buscando noticias...</span>
          </div>
        )}
        <AnimatePresence>
          {!loading && articles.map((a, i) => (
            <motion.a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="block bg-cyber-panel/90 backdrop-blur-sm border border-cyber-cyan/10 rounded-2xl p-4 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap size={10} className="text-cyber-cyan/60" />
                    {a.source && (
                      <span className="text-[10px] font-mono text-cyber-cyan/50 bg-cyber-cyan/5 px-2 py-0.5 rounded-md border border-cyber-cyan/10">
                        {a.source}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-body text-cyber-white/90 font-medium leading-snug group-hover:text-cyber-cyan transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-xs text-cyber-muted/60 mt-1.5 line-clamp-2 font-body">
                    {a.snippet}
                  </p>
                </div>
                <ExternalLink size={14} className="text-cyber-muted/30 group-hover:text-cyber-cyan shrink-0 mt-1 transition-colors" />
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      {/* Matrix-style cascade in background */}
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
