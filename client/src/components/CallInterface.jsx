import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, MessageCircle, Upload, Newspaper, Languages } from 'lucide-react';
import JarvisAvatar from './JarvisAvatar';
import NeoChat from './NeoChat';
import FileUpload from './FileUpload';
import NewsPage from './NewsPage';
import usePushNotifications from '../hooks/usePushNotifications';

export default function CallInterface({
  isCallActive, connectionState, userTranscript, assistantTranscript, error,
  onStartCall, onEndCall, recentTasks = [],
}) {
  const avatarStatus = !isCallActive ? 'idle'
    : connectionState === 'connecting' ? 'connecting'
    : assistantTranscript ? 'speaking' : 'listening';

  const activeTaskCount = recentTasks.filter(t => t.status === 'processing').length;
  const [neoChatOpen, setNeoChatOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  usePushNotifications();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-[430px] mx-auto px-5 pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)] relative">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,21,208,0.3) 2px, rgba(255,21,208,0.3) 3px)',
          backgroundSize: '100% 4px',
        }} />
      </div>

      <AnimatePresence mode="wait">
        {!isCallActive && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <JarvisAvatar status="idle" />

            <div className="text-center space-y-1 -mt-6">
              <h1 className="font-display text-2xl tracking-[0.12em] text-cyber-white text-glow-cyber">
                J.A.R.V.I.S.
              </h1>
              <p className="text-xs text-cyber-cyan/70 font-display tracking-[0.2em] uppercase">
                Voice AI Factory
              </p>
              <p className="text-[10px] text-cyber-cyan/50 font-body tracking-wide">
                Agente NEO
              </p>
            </div>

            {/* Task list */}
            {recentTasks.length > 0 && (
              <div className="w-full space-y-1.5">
                {recentTasks.slice(0, 3).map((task) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl px-3 py-2 border backdrop-blur-sm flex items-center gap-2 ${
                      task.status === 'completed' ? 'bg-cyber-green/5 border-cyber-green/20' :
                      task.status === 'processing' ? 'bg-cyber-amber/5 border-cyber-amber/20' :
                      'bg-cyber-magenta/5 border-cyber-magenta/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      task.status === 'completed' ? 'bg-cyber-green' :
                      task.status === 'processing' ? 'bg-cyber-amber animate-pulse' : 'bg-cyber-magenta'}`} />
                    <p className="text-[11px] text-cyber-white/70 font-body truncate flex-1">{task.prompt}</p>
                    {task.status === 'processing' && <span className="text-[10px] font-mono text-cyber-amber/60">{task.progress || 0}%</span>}
                    {task.status === 'completed' && <span className="text-[10px] font-mono text-cyber-green/60">✓</span>}
                  </motion.div>
                ))}
              </div>
            )}

            {/* BIG Call button with heartbeat — CYAN */}
            <motion.button onClick={() => onStartCall()} whileTap={{ scale: 0.9 }} className="relative group mt-2">
              <div className="absolute -inset-4 rounded-full bg-cyber-cyan/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div
                className="relative w-[90px] h-[90px] rounded-full bg-gradient-to-br from-cyber-cyan to-cyan-600 flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.2)',
                    '0 0 50px rgba(0,212,255,0.7), 0 0 90px rgba(0,212,255,0.4)',
                    '0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.2)',
                  ],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Phone size={38} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
              </motion.div>
              <motion.div
                className="absolute -inset-3 rounded-full border-2 border-cyber-cyan/40"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.button>

            <p className="text-[11px] text-cyber-muted/50 font-body tracking-wide">Toca para llamar</p>

            {/* Translation button — simultaneous interpretation */}
            <motion.button onClick={() => onStartCall('translate')} whileTap={{ scale: 0.9 }} className="relative group">
              <div className="absolute -inset-2 rounded-full bg-cyber-magenta/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div
                className="relative w-[55px] h-[55px] rounded-full bg-gradient-to-br from-cyber-magenta-bright to-cyber-magenta flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 15px rgba(255,21,208,0.4), 0 0 25px rgba(255,21,208,0.2)',
                    '0 0 35px rgba(255,21,208,0.7), 0 0 60px rgba(255,64,240,0.4)',
                    '0 0 15px rgba(255,21,208,0.4), 0 0 25px rgba(255,21,208,0.2)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Languages size={22} className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />
              </motion.div>
            </motion.button>
            <p className="text-[10px] text-cyber-magenta/50 font-body tracking-wide">Traduccion simultanea</p>

            {/* Action buttons — solo Noticias centrado */}
            <div className="flex items-center justify-center">
              <motion.button onClick={() => setNewsOpen(true)} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan/80 hover:bg-cyber-cyan/20 transition-all">
                <Newspaper size={16} />
                <span className="text-[11px] font-body">Noticias</span>
              </motion.button>
            </div>

            {error && <div className="w-full bg-cyber-red/5 border border-cyber-red/10 rounded-xl p-3"><p className="text-xs text-cyber-red/80 font-body text-center">{error}</p></div>}
          </motion.div>
        )}

        {isCallActive && (
          <motion.div key="call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 w-full">
            <CallTimer isActive={isCallActive} />
            <JarvisAvatar status={avatarStatus} />
            <div className="w-full space-y-2.5 min-h-[60px]">
              {userTranscript && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-cyber-cyan/5 border border-cyber-cyan/10 rounded-2xl p-3">
                  <p className="text-[10px] font-display tracking-[0.15em] text-cyber-cyan/50 mb-1">TÚ</p>
                  <p className="text-sm text-cyber-white/80 font-body leading-relaxed line-clamp-3">{userTranscript.split(' ').slice(-25).join(' ')}</p>
                </motion.div>
              )}
              {assistantTranscript && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-cyber-purple/5 border border-cyber-purple/10 rounded-2xl p-3">
                  <p className="text-[10px] font-display tracking-[0.15em] text-cyber-purple/50 mb-1">JARVIS</p>
                  <p className="text-sm text-cyber-white/80 font-body leading-relaxed line-clamp-3">{assistantTranscript.slice(-250)}</p>
                </motion.div>
              )}
              {connectionState === 'connected' && !userTranscript && !assistantTranscript && (
                <p className="text-center text-sm text-cyber-muted/40 font-body py-3 italic">Háblame, te escucho...</p>
              )}
            </div>
            {activeTaskCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-amber/10 border border-cyber-amber/20">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-amber animate-pulse" />
                <span className="text-[10px] font-mono text-cyber-amber/80">{activeTaskCount} en progreso</span>
              </motion.div>
            )}
            {error && <div className="w-full bg-cyber-red/5 border border-cyber-red/10 rounded-xl p-3"><p className="text-xs text-cyber-red/80 font-body text-center">{error}</p></div>}
            <motion.button onClick={onEndCall} whileTap={{ scale: 0.9 }} className="relative mt-2 group">
              <div className="absolute -inset-2 rounded-full bg-cyber-red/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-[60px] h-[60px] rounded-full bg-gradient-to-br from-cyber-red to-red-700 flex items-center justify-center shadow-[0_0_30px_rgba(255,68,102,0.3)] animate-hangup-pulse">
                <PhoneOff size={26} className="text-white" />
              </div>
            </motion.button>
            <p className="text-[10px] text-cyber-muted/30 font-body">Toca para colgar</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{neoChatOpen && <NeoChat isOpen={neoChatOpen} onClose={() => setNeoChatOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{uploadOpen && <FileUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{newsOpen && <NewsPage isOpen={newsOpen} onClose={() => setNewsOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function CallTimer({ isActive }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isActive) { setSeconds(0); return; }
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [isActive]);
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse shadow-[0_0_6px_rgba(0,212,255,0.5)]" />
      <span className="font-mono text-sm text-cyber-muted/70 tabular-nums">{m}:{s}</span>
    </div>
  );
}
