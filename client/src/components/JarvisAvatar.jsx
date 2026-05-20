import { motion } from 'framer-motion';

export default function JarvisAvatar({ status = 'idle' }) {
  const c = {
    idle:        { ring: 'rgba(255,21,208,0.3)', core: 'rgba(255,21,208,0.5)', speed: 3 },
    connecting:  { ring: 'rgba(0,212,255,0.5)', core: 'rgba(0,212,255,0.75)', speed: 0.8 },
    listening:   { ring: 'rgba(0,212,255,0.5)', core: 'rgba(0,212,255,0.8)', speed: 0.6 },
    speaking:    { ring: 'rgba(0,255,180,0.5)', core: 'rgba(0,255,180,0.7)', speed: 0.5 },
    thinking:    { ring: 'rgba(255,179,71,0.5)', core: 'rgba(255,179,71,0.7)', speed: 1 },
  };
  const cfg = c[status] || c.idle;

  return (
    <div className="relative w-full max-w-[260px] aspect-square mx-auto">
      {/* Heartbeat glow beneath the image */}
      <motion.div
        className="absolute -inset-6 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(255,21,208,0.25) 0%, rgba(255,64,240,0.1) 40%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Outer ambient glow */}
      <motion.div
        className="absolute -inset-8 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${cfg.ring}, transparent 65%)` }}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
        transition={{ duration: cfg.speed * 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pulsing rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: cfg.ring, borderWidth: 1 + i * 0.5 }}
          animate={{ scale: [0.85, 1.3 + i * 0.1, 0.85], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: cfg.speed * (1 + i * 0.3), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}

      {/* Main circle with image */}
      <motion.div
        className="absolute inset-[8%] rounded-full overflow-hidden border-2"
        style={{ borderColor: cfg.ring }}
        animate={{
          boxShadow: [
            `0 0 30px ${cfg.ring}, inset 0 0 30px rgba(255,21,208,0.06)`,
            `0 0 70px ${cfg.ring}, inset 0 0 50px rgba(255,21,208,0.12)`,
            `0 0 30px ${cfg.ring}, inset 0 0 30px rgba(255,21,208,0.06)`,
          ],
        }}
        transition={{ duration: cfg.speed, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0020] via-[#0d0030] to-[#060015]" />
        <img src="/jarvis-face.png" alt="JARVIS" className="absolute inset-0 w-full h-full object-cover rounded-full" />
        <motion.div className="absolute left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.ring}, transparent)` }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
        <div className="absolute inset-0 rounded-full"
          style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 0 15px rgba(0,0,0,0.3)' }} />
      </motion.div>
    </div>
  );
}
