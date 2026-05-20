import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Wifi, WifiOff, Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

/**
 * StatusPanel — system status dashboard with real-time indicators
 *
 * Shows:
 * - Current status (idle/listening/processing/building/error)
 * - Hermes connection state
 * - Active task count
 * - Uptime / system health
 */
export default function StatusPanel({ systemStatus, statusMessage, taskCount, hermesConnected, isListening }) {
  const statusConfig = {
    idle: { icon: Cpu, color: 'text-jarvis-cyan', bg: 'bg-jarvis-cyan/10', border: 'border-jarvis-cyan/20', label: 'IDLE' },
    listening: { icon: Activity, color: 'text-jarvis-cyan', bg: 'bg-jarvis-cyan/10', border: 'border-jarvis-cyan/30', label: 'LISTENING', pulse: true },
    processing: { icon: Clock, color: 'text-jarvis-amber', bg: 'bg-jarvis-amber/10', border: 'border-jarvis-amber/20', label: 'PROCESSING', pulse: true },
    building: { icon: Cpu, color: 'text-jarvis-green', bg: 'bg-jarvis-green/10', border: 'border-jarvis-green/20', label: 'BUILDING', pulse: true },
    error: { icon: AlertTriangle, color: 'text-jarvis-red', bg: 'bg-jarvis-red/10', border: 'border-jarvis-red/20', label: 'ERROR' },
  };

  const config = statusConfig[systemStatus] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-4">
      <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
        System Status
      </h3>

      {/* Status indicator */}
      <div className={`
        flex items-center gap-3 p-3 rounded-xl border ${config.border} ${config.bg}
        transition-all duration-500
      `}>
        <div className="relative">
          <Icon size={20} className={config.color} />
          {config.pulse && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.color.replace('text', 'bg')} animate-ping`} />
          )}
        </div>
        <div>
          <p className={`font-display text-xs tracking-[0.15em] ${config.color}`}>{config.label}</p>
          <p className="text-xs text-jarvis-muted mt-0.5 font-body">{statusMessage}</p>
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hermesConnected ? (
            <Wifi size={14} className="text-jarvis-green" />
          ) : (
            <WifiOff size={14} className="text-jarvis-red" />
          )}
          <span className="text-xs text-jarvis-muted font-body">Hermes Bridge</span>
        </div>
        <span className={`text-xs font-mono ${hermesConnected ? 'text-jarvis-green' : 'text-jarvis-red'}`}>
          {hermesConnected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      {/* Task counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-jarvis-cyan" />
          <span className="text-xs text-jarvis-muted font-body">Active Tasks</span>
        </div>
        <span className="text-xs font-mono text-jarvis-cyan">{taskCount}</span>
      </div>

      {/* Voice status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-jarvis-cyan animate-pulse' : 'bg-jarvis-muted'}`} />
          <span className="text-xs text-jarvis-muted font-body">Microphone</span>
        </div>
        <span className={`text-xs font-mono ${isListening ? 'text-jarvis-cyan' : 'text-jarvis-muted'}`}>
          {isListening ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {/* Mini system info bar */}
      <div className="pt-3 border-t border-jarvis-border/30">
        <div className="flex items-center justify-between text-[10px] font-mono text-jarvis-muted/60">
          <span>v1.0.0</span>
          <span>JARVIS OS</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
