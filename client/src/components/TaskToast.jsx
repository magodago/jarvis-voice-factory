import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, Loader2, Zap, ExternalLink } from 'lucide-react';

export default function TaskToast({ tasks = [] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="fixed top-12 left-0 right-0 z-30 flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence>
        {tasks.slice(0, 3).map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`
              pointer-events-auto rounded-2xl px-4 py-3 border backdrop-blur-xl
              flex items-start gap-3 shadow-2xl max-w-[380px] w-full
              ${task.status === 'completed'
                ? 'bg-cyber-green/10 border-cyber-green/30 shadow-cyber-green/10'
                : task.status === 'processing'
                  ? 'bg-cyber-amber/10 border-cyber-amber/30 shadow-cyber-amber/10'
                  : 'bg-cyber-magenta/10 border-cyber-magenta/30 shadow-cyber-magenta/10'
              }
            `}
          >
            <div className="relative shrink-0 mt-0.5">
              {task.status === 'completed' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <CheckCircle size={22} className="text-cyber-green" />
                </motion.div>
              ) : task.status === 'processing' ? (
                <Loader2 size={22} className="text-cyber-amber animate-spin" />
              ) : (
                <Zap size={22} className="text-cyber-magenta" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-display tracking-[0.1em] uppercase ${
                task.status === 'completed' ? 'text-cyber-green/80' :
                task.status === 'processing' ? 'text-cyber-amber/80' : 'text-cyber-magenta/80'
              }`}>
                {task.status === 'completed' ? 'TAREA COMPLETADA' :
                 task.status === 'processing' ? 'AGENTE NEO TRABAJANDO' : 'TAREA ENVIADA A NEO'}
              </p>
              <p className="text-sm text-cyber-white/90 font-body truncate mt-0.5">
                {task.prompt}
              </p>
              {task.status === 'processing' && (
                <div className="mt-1.5 h-1 bg-cyber-border/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyber-amber/60 to-cyber-amber progress-shimmer"
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress || 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
              {/* Show URL when completed */}
              {task.status === 'completed' && task.result?.url && (
                <a
                  href={task.result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-cyber-cyan/80 hover:text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span className="truncate max-w-[200px]">{task.result.url.replace('https://', '')}</span>
                </a>
              )}
              {task.status === 'completed' && !task.result?.url && task.result?.repo && (
                <a
                  href={task.result.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-cyber-cyan/80 hover:text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <ExternalLink size={12} />
                  Repo GitHub
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
