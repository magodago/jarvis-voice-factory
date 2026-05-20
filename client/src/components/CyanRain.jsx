import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * CyanRain — phosphorescent cyan particles falling from top
 * Intense matrix-style rain, pure cyan
 */
export default function CyanRain() {
  const drops = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 1.5 + Math.random() * 3.5,
      size: 1.2 + Math.random() * 2.5,
      opacity: 0.25 + Math.random() * 0.55,
    })), []
  );

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {drops.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size * 18}px`,
            background: `linear-gradient(180deg, rgba(0,212,255,${d.opacity}) 0%, rgba(64,240,255,${d.opacity * 0.8}) 50%, transparent 100%)`,
            boxShadow: `0 0 ${d.size * 5}px rgba(0,212,255,${d.opacity * 0.6})`,
          }}
          animate={{
            top: ['-5%', '105%'],
            opacity: [d.opacity, d.opacity * 0.5, 0],
          }}
          transition={{
            duration: d.duration,
            repeat: Infinity,
            delay: d.delay,
            ease: 'linear',
          }}
        />
      ))}
      {/* Strong ambient glow at top */}
      <div className="absolute top-0 left-0 right-0 h-40"
        style={{ background: 'linear-gradient(180deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.05) 50%, transparent 100%)' }} />
      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-20"
        style={{ background: 'linear-gradient(0deg, rgba(0,212,255,0.04) 0%, transparent 100%)' }} />
    </div>
  );
}
