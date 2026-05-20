import { useEffect, useCallback } from 'react';
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

const TRANSLATE_INSTRUCTIONS = `Translate everything you hear into Spanish. Be accurate, literal, and immediate. Do not add anything extra — just the translation.`;

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

  const handleStartCall = useCallback((mode = 'jarvis') => { 
    const instructions = mode === 'translate' ? TRANSLATE_INSTRUCTIONS : SYSTEM_INSTRUCTIONS;
    startCall(instructions, mode); 
  }, [startCall]);
  const handleEndCall = useCallback(() => { endCall(); dispatch({ type: 'CLEAR_TRANSCRIPT' }); }, [endCall, dispatch]);

  const recentTasks = state.tasks.slice(0, 5);
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-cyber-bg text-cyber-white overflow-hidden relative no-overscroll touch-none">
      <CyanRain />

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
