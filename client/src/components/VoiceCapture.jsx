import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VoiceCapture — microphone control and transcript display panel
 *
 * Shows:
 * - Mic button (toggle listening)
 * - Real-time transcript
 * - Interim results (greyed out)
 * - Error messages
 * - Audio level indicator
 */
export default function VoiceCapture({
  isListening,
  isSupported,
  error,
  transcript,
  interimTranscript,
  onToggle,
  systemStatus,
}) {
  return (
    <div className="relative">
      {/* Main panel */}
      <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-jarvis-cyan animate-pulse-glow' : 'bg-jarvis-muted'
            }`} />
            <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
              Voice Input
            </h3>
          </div>

          <motion.button
            onClick={onToggle}
            disabled={!isSupported}
            className={`
              relative p-3 rounded-xl transition-all duration-300
              ${isListening
                ? 'bg-jarvis-cyan/20 text-jarvis-cyan border border-jarvis-cyan/30'
                : 'bg-jarvis-border/30 text-jarvis-muted border border-jarvis-border/30 hover:border-jarvis-cyan/30'
              }
              disabled:opacity-30 disabled:cursor-not-allowed
            `}
            whileTap={{ scale: 0.95 }}
          >
            {isListening ? (
              <>
                <Mic size={20} />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-jarvis-cyan animate-ping" />
              </>
            ) : (
              <MicOff size={20} />
            )}
          </motion.button>
        </div>

        {/* Transcript area */}
        <div className="min-h-[60px] bg-jarvis-bg/60 rounded-xl border border-jarvis-border/30 p-3">
          <AnimatePresence mode="wait">
            {isListening && !transcript && !interimTranscript ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-jarvis-muted"
              >
                <Volume2 size={14} className="animate-pulse" />
                <span className="text-sm font-body">Esperando voz...</span>
              </motion.div>
            ) : !isListening && !transcript ? (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-jarvis-muted font-body"
              >
                Pulsa el micrófono para hablar con JARVIS. Di &ldquo;crea una web de...&rdquo; para empezar.
              </motion.p>
            ) : (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                {transcript && (
                  <p className="text-sm text-jarvis-white font-body leading-relaxed">
                    {transcript}
                  </p>
                )}
                {interimTranscript && (
                  <p className="text-sm text-jarvis-cyan/50 italic font-body">
                    {interimTranscript}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Audio level indicator */}
        {isListening && (
          <div className="flex items-center gap-[2px] justify-center h-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-jarvis-cyan/40 rounded-full"
                animate={{
                  height: [4, Math.random() * 24 + 4, 4],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 0.6 + Math.random() * 0.4,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 bg-jarvis-red/10 border border-jarvis-red/20 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertCircle size={16} className="text-jarvis-red mt-0.5 shrink-0" />
            <p className="text-sm text-jarvis-red/80 font-body">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
