import { motion } from 'framer-motion';

/**
 * JarvisOrb — the central holographic interface orb
 *
 * States:
 * - idle: dim, slow pulse
 * - listening: bright cyan pulse, rings expanding
 * - processing: amber pulse, data flow animation
 * - building: green pulse, construction animation
 * - error: red pulse
 */
export default function JarvisOrb({ status = 'idle', onClick, size = 'lg' }) {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
  };

  const ringCount = status === 'listening' ? 3 : status === 'processing' ? 2 : 1;

  const statusColors = {
    idle: 'from-jarvis-cyan/20 to-jarvis-cyan/5',
    listening: 'from-jarvis-cyan/40 to-jarvis-cyan/15',
    processing: 'from-jarvis-amber/40 to-jarvis-amber/10',
    building: 'from-jarvis-green/40 to-jarvis-green/10',
    error: 'from-jarvis-red/40 to-jarvis-red/10',
  };

  const glowColor = {
    idle: 'rgba(0,212,255,0.3)',
    listening: 'rgba(0,212,255,0.6)',
    processing: 'rgba(255,179,71,0.6)',
    building: 'rgba(0,255,136,0.6)',
    error: 'rgba(255,68,102,0.6)',
  };

  const pulseDuration = status === 'listening' ? 1.5 : status === 'processing' ? 1 : 2.5;

  return (
    <div className="relative flex items-center justify-center">
      {/* Expanding rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`absolute ${sizeMap[size]} rounded-full border border-jarvis-cyan/20`}
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{
            scale: [0.8, 1.6, 0.8],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: pulseDuration + i * 0.6,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Outer glow */}
      <div
        className={`absolute ${sizeMap[size]} rounded-full blur-2xl opacity-50 transition-colors duration-500`}
        style={{ background: `radial-gradient(circle, ${glowColor[status]}, transparent 70%)` }}
      />

      {/* Main orb */}
      <motion.button
        onClick={onClick}
        className={`
          relative ${sizeMap[size]} rounded-full cursor-pointer
          bg-gradient-to-br ${statusColors[status]}
          border border-jarvis-cyan/30
          backdrop-blur-sm
          flex items-center justify-center
          transition-all duration-500
          hover:border-jarvis-cyan/50
          focus:outline-none focus:border-jarvis-cyan
        `}
        animate={{
          boxShadow: [
            `0 0 30px ${glowColor[status]}, inset 0 0 30px rgba(0,212,255,0.1)`,
            `0 0 60px ${glowColor[status]}, inset 0 0 60px rgba(0,212,255,0.2)`,
            `0 0 30px ${glowColor[status]}, inset 0 0 30px rgba(0,212,255,0.1)`,
          ],
        }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Inner rings decoration */}
        <div className="absolute inset-4 rounded-full border border-jarvis-cyan/10 animate-orb-rotate" />
        <div className="absolute inset-8 rounded-full border border-jarvis-cyan/5 animate-orb-rotate" style={{ animationDirection: 'reverse' }} />

        {/* Status text */}
        <motion.span
          className="font-display text-sm font-bold tracking-[0.3em] uppercase text-jarvis-cyan"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {status === 'idle' && 'J.A.R.V.I.S.'}
          {status === 'listening' && 'LISTENING'}
          {status === 'processing' && 'THINKING'}
          {status === 'building' && 'BUILDING'}
          {status === 'error' && 'ERROR'}
        </motion.span>
      </motion.button>
    </div>
  );
}
