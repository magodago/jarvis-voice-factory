import { motion } from 'framer-motion';
import { MessageSquare, Clock } from 'lucide-react';

/**
 * CommandLog — chronological log of all voice commands detected
 */
export default function CommandLog({ history }) {
  if (history.length === 0) {
    return (
      <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-3">
        <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
          Command Log
        </h3>
        <div className="flex flex-col items-center justify-center py-6 text-jarvis-muted/30">
          <MessageSquare size={24} className="mb-2" />
          <p className="text-xs font-body">No commands yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
          Command Log
        </h3>
        <span className="text-[10px] font-mono text-jarvis-cyan">{history.length}</span>
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1.5 scrollbar-thin">
        {history.map((cmd, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-jarvis-border/20 transition-colors"
          >
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
              cmd.confidence > 0.8 ? 'bg-jarvis-green' :
              cmd.confidence > 0.5 ? 'bg-jarvis-amber' : 'bg-jarvis-muted'
            }`} />

            <div className="min-w-0 flex-1">
              <p className="text-xs text-jarvis-white/70 font-body truncate">
                &ldquo;{cmd.command}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-jarvis-cyan/60">{cmd.type}</span>
                <span className="text-[10px] font-mono text-jarvis-muted/50">
                  {Math.round(cmd.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            <Clock size={10} className="text-jarvis-muted/30 mt-1 shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
