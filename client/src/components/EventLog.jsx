import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * EventLog — scrollable log of all system events during a call
 */
export default function EventLog({ events = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div className="w-full bg-jarvis-panel/60 backdrop-blur-md rounded-2xl border border-jarvis-border/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-jarvis-border/20 flex items-center justify-between">
        <span className="font-display text-[10px] tracking-[0.15em] text-jarvis-cyan/70 uppercase">Event Log</span>
        <span className="text-[10px] font-mono text-jarvis-muted/50">{events.length}</span>
      </div>
      <div className="max-h-[180px] overflow-y-auto scrollbar-thin p-2 space-y-1">
        <AnimatePresence initial={false}>
          {events.slice(-40).map((evt, i) => (
            <motion.div
              key={evt.id || i}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              className="flex items-start gap-2 px-2 py-1 rounded-lg"
            >
              <span className="text-[9px] font-mono text-jarvis-muted/40 shrink-0 mt-0.5 w-12">
                {evt.time}
              </span>
              <span className={`text-[10px] font-mono ${evt.color || 'text-jarvis-cyan/70'}`}>
                {evt.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
