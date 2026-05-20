import { useEffect, useCallback, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import CallInterface from './components/CallInterface';
import TaskToast from './components/TaskToast';
import CyanRain from './components/CyanRain';
import useOpenAIRealtime from './hooks/useOpenAIRealtime';
import useIntentDetector from './hooks/useIntentDetector';
import useHermesBridge from './hooks/useHermesBridge';

const SYSTEM_INSTRUCTIONS = `Eres J.A.R.V.I.S., asistente de IA. Hablas SIEMPRE en español, tono profesional, 1-2 frases máximo.
Cuando el usuario pida crear, hacer, generar o construir software (web, webapp, SaaS, tienda online, juego indie, curso, automatización, documento, presentación), responde: "Recibido. Transfiriendo la orden al Agente NEO."
NO ofrezcas ayuda adicional. Responde solo lo necesario.`;

function AppContent() {
  const { state, dispatch } = useApp();
  const { sendCommand } = useHermesBridge();

  const { isCallActive, connectionState, userTranscript, assistantTranscript,
    error: realtimeError, startCall, endCall, onUserSpeech } = useOpenAIRealtime();

  const handleCommandDetected = useCallback(async (commandData) => {
    const tempTaskId = 'temp-' + Date.now();
    dispatch({ type: 'ADD_TASK', payload: {
      id: tempTaskId, prompt: commandData.prompt, type: commandData.type,
      status: 'queued', progress: 0, createdAt: new Date().toISOString(),
    }});
    dispatch({ type: 'DETECT_COMMAND', payload: commandData });
    try {
      const result = await sendCommand(commandData);
      dispatch({ type: 'UPDATE_TASK', payload: { id: tempTaskId, ...result, status: result.status || 'queued' }});
    } catch (err) {
      console.error('[App] Failed:', err);
      dispatch({ type: 'UPDATE_TASK', payload: { id: tempTaskId, status: 'failed' }});
    }
  }, [sendCommand, dispatch]);

  const { processTranscript } = useIntentDetector(handleCommandDetected);
  useEffect(() => { onUserSpeech((text) => { processTranscript(text); }); }, [onUserSpeech, processTranscript]);

  const handleStartCall = useCallback(() => { startCall(SYSTEM_INSTRUCTIONS); }, [startCall]);
  const handleEndCall = useCallback(() => { endCall(); dispatch({ type: 'CLEAR_TRANSCRIPT' }); }, [endCall, dispatch]);

  const recentTasks = state.tasks.slice(0, 5);
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

  // Detect if running on GitHub Pages (static) vs localhost (full features)
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const [dismissedBanner, setDismissedBanner] = useState(false);

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-white overflow-hidden relative no-overscroll touch-none">
      <CyanRain />

      {/* GitHub Pages banner — warn about limited features */}
      {isGitHubPages && !dismissedBanner && (
        <div className="fixed top-10 left-0 right-0 z-50 mx-4 mt-2 bg-cyber-amber/15 border border-cyber-amber/40 rounded-2xl p-3 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display tracking-[0.1em] text-cyber-amber mb-1">VISTA PREVIA ESTÁTICA</p>
              <p className="text-[11px] text-cyber-white/60 font-body">
                Las llamadas de voz y noticias requieren el servidor local.{' '}
                <span className="text-cyber-cyan/70">Accede desde localhost:5173</span> para funcionalidad completa.
              </p>
            </div>
            <button onClick={() => setDismissedBanner(true)} className="text-cyber-muted/50 hover:text-cyber-white shrink-0">✕</button>
          </div>
        </div>
      )}

      <TaskToast tasks={recentTasks.filter(t => t.status !== 'idle')} />

      <CallInterface
        isCallActive={isCallActive} connectionState={connectionState}
        userTranscript={userTranscript} assistantTranscript={assistantTranscript}
        error={realtimeError} onStartCall={handleStartCall} onEndCall={handleEndCall}
        recentTasks={recentTasks}
      />

      {/* Status bar — centered DAVID OS with date */}
      <div className="fixed top-0 left-0 right-0 z-20 h-10 bg-gradient-to-b from-cyber-bg/90 to-transparent flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-4">
            <span className="text-[9px] font-display tracking-[0.2em] text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]">
            {isCallActive ? '📞 EN LLAMADA' : 'DAVID OS'}
          </span>
          <span className="text-[9px] font-mono text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]">{dateStr}</span>
          {state.tasks.filter(t => t.status === 'processing').length > 0 && (
            <span className="text-[9px]">⚡</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
