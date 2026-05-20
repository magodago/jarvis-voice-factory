import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ExternalLink, Loader2, Cpu, Globe, Landmark, X, Zap, Monitor } from 'lucide-react';

const TOPICS = [
  { id: 'ai', label: 'IA & Tecnología', icon: Cpu },
  { id: 'tech', label: 'Tech & Ciencia', icon: Monitor },
  { id: 'spain', label: 'España', icon: Landmark },
  { id: 'world', label: 'Internacional', icon: Globe },
];

const RELATIVE_TIME = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function NewsPage({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('ai');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!isOpen) return;
    fetchFeed(activeTopic);
  }, [isOpen, activeTopic]);

  const fetchFeed = async (topic) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/news/feed?topic=${topic}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (!data.articles || data.articles.length === 0) {
        setArticles([]);
        setError('No se encontraron noticias para este tema. Intenta con otro.');
        setLoading(false);
        return;
      }
      
      // Filter out already seen articles (dedup across topic switches)
      const fresh = data.articles.filter(a => {
        if (seenRef.current.has(a.url)) return false;
        seenRef.current.add(a.url);
        return true;
      });
      
      // Keep seen set from growing too large
      if (seenRef.current.size > 200) {
        const entries = [...seenRef.current];
        seenRef.current = new Set(entries.slice(-100));
      }
      
      setArticles(fresh);
    } catch (err) {
      console.error('[News] Error:', err);
      setError('Error de conexión. Verifica que el servidor esté corriendo.');
      setArticles([]);
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
            <p className="text-[10px] text-cyber-cyan/50 font-body tracking-wide">RSS Live • {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
              onClick={() => { setActiveTopic(t.id); setArticles([]); }}
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
            <span className="text-sm font-body text-cyber-cyan/70">Cargando titulares...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Zap size={32} className="text-cyber-muted/40" />
            <span className="text-sm font-body text-cyber-muted/60 text-center px-4">{error}</span>
          </div>
        )}

        <AnimatePresence>
          {!loading && articles.map((a, i) => (
            <motion.a
              key={a.url}
              href={a.url}
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
                    {/* Source badge */}
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                      style={{
                        color: a.sourceColor || '#00d4ff',
                        borderColor: (a.sourceColor || '#00d4ff') + '30',
                        backgroundColor: (a.sourceColor || '#00d4ff') + '08',
                      }}
                    >
                      {a.source}
                    </span>
                    {/* Time */}
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
