import { motion } from 'framer-motion';

export default function HolographicGrid() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(180,0,255,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,0,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          perspective: '800px',
          transform: 'rotateX(60deg) scaleY(1.5)',
          transformOrigin: 'center bottom',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.1]"
        style={{ background: 'radial-gradient(circle, rgba(180,0,255,0.5) 0%, rgba(0,212,255,0.2) 40%, transparent 70%)' }}
      />
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-magenta/20 to-transparent"
        animate={{ top: ['-2px', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
