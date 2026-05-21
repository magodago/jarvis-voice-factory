import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useOpenAIRealtime v3
 * - JARVIS voice agent: via backend WebSocket relay
 * - TRANSLATE mode: direct OpenAI WebSocket (uses session.* protocol)
 */
export default function useOpenAIRealtime() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const userSpeechCallbackRef = useRef(null);
  const assistantBufferRef = useRef('');
  const currentModeRef = useRef('jarvis');

  useEffect(() => { return () => { endCall(); }; }, []);

  const onUserSpeech = useCallback((fn) => { userSpeechCallbackRef.current = fn; }, []);

  const startCall = useCallback(async (instructions, mode = 'jarvis') => {
    try {
      setError(null);
      setDebugInfo('');
      setConnectionState('connecting');
      setUserTranscript('');
      setAssistantTranscript('');
      assistantBufferRef.current = '';
      currentModeRef.current = mode;

      if (!navigator.mediaDevices?.getUserMedia) {
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
        if (isIOS && isHTTP) throw new Error('iOS requiere HTTPS para usar el micrófono.');
        throw new Error('Micrófono no soportado.');
      }

      setDebugInfo('Solicitando micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000, channelCount: 1 },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const bufferSize = mode === 'translate' ? 2048 : 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      const silenceGain = audioCtx.createGain();
      silenceGain.gain.value = 0;
      processor.connect(silenceGain);
      silenceGain.connect(audioCtx.destination);

      // ── BUILD WS URL ──
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const isGitHubPages = hostname.includes('github.io');

      let wsUrl;
      let useDirectOpenAI = false;

      if (mode === 'translate') {
        // Translate connects DIRECTLY to OpenAI (no relay)
        useDirectOpenAI = true;
        setDebugInfo('Obteniendo API key...');
        let apiKey;
        try {
          const resp = await fetch('/realtime/key');
          const data = await resp.json();
          apiKey = data.key;
        } catch {
          throw new Error('No se pudo obtener la API key');
        }
        // OpenAI WS supports api_key query param
        wsUrl = `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate&api_key=${encodeURIComponent(apiKey)}`;
      } else if (isGitHubPages) {
        setDebugInfo('Buscando tunel...');
        let foundTunnel = null;
        try {
          const r = await fetch('/jarvis-voice-factory/tunnel.json', { signal: AbortSignal.timeout(3000) });
          if (r.ok) {
            const d = await r.json();
            if (d.tunnelUrl) {
              const t = await fetch(`${d.tunnelUrl}/health`, { signal: AbortSignal.timeout(3000) });
              if (t.ok) foundTunnel = d.tunnelUrl;
            }
          }
        } catch {}
        if (!foundTunnel) {
          try {
            const r = await fetch('https://jarvis-neo-david.loca.lt/health', { signal: AbortSignal.timeout(2000) });
            if (r.ok) foundTunnel = 'https://jarvis-neo-david.loca.lt';
          } catch {}
        }
        if (foundTunnel) {
          const wsProto = foundTunnel.startsWith('https') ? 'wss' : 'ws';
          wsUrl = `${wsProto}://${new URL(foundTunnel).host}/realtime`;
        } else {
          throw new Error('Tunel no disponible. Ejecuta jarvis-start en WSL.');
        }
      } else {
        wsUrl = `${protocol}//${window.location.host}/realtime`;
      }

      // ── CONNECT ──
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setDebugInfo(useDirectOpenAI ? 'OpenAI directo — configurando...' : 'Conectado');
        if (useDirectOpenAI) {
          // Configure translate session
          ws.send(JSON.stringify({
            type: 'session.update',
            session: { audio: { output: { language: 'es' } } },
          }));
        } else {
          ws.send(JSON.stringify({ type: 'start', instructions, voice: 'coral', mode }));
        }
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          playPCM16Audio(event.data, audioCtx);
          return;
        }
        try {
          const msg = JSON.parse(event.data);
          if (useDirectOpenAI) {
            handleTranslateEvent(msg);
          } else {
            handleRelayMessage(msg);
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        setIsCallActive(false);
      };

      ws.onerror = () => {
        setError(useDirectOpenAI
          ? 'Error de conexión con OpenAI Translate. Verifica API key.'
          : 'Error de conexión con backend :4000');
      };

      // ── AUDIO SENDER ──
      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(inputData);

        if (useDirectOpenAI) {
          // Translate: send as base64 JSON
          const base64 = bufferToBase64(pcm16.buffer);
          ws.send(JSON.stringify({
            type: 'session.input_audio_buffer.append',
            audio: base64,
          }));
        } else {
          // JARVIS: send raw PCM16 binary
          ws.send(pcm16.buffer);
        }
      };
    } catch (err) {
      console.error('[Realtime] Start error:', err);
      setError(err.message || 'Error al iniciar llamada.');
      setConnectionState('disconnected');
      setIsCallActive(false);
    }
  }, []);

  const endCall = useCallback(() => {
    if (wsRef.current) {
      try {
        if (currentModeRef.current === 'translate') {
          wsRef.current.send(JSON.stringify({ type: 'session.close' }));
        } else {
          wsRef.current.send(JSON.stringify({ type: 'stop', mode: currentModeRef.current }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {}; processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {}; audioContextRef.current = null; }
    setConnectionState('disconnected');
    setIsCallActive(false);
    setError(null);
  }, []);

  // ── TRANSLATE events (direct OpenAI) ──
  function handleTranslateEvent(msg) {
    switch (msg.type) {
      case 'session.output_audio.delta':
        if (msg.delta && audioContextRef.current) {
          try {
            const raw = atob(msg.delta);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            const pcm16 = new Int16Array(bytes.buffer);
            playPCM16FromInt16(pcm16, audioContextRef.current);
          } catch {}
        }
        break;
      case 'session.output_transcript.delta':
        assistantBufferRef.current += (msg.delta || '');
        setAssistantTranscript(assistantBufferRef.current);
        break;
      case 'session.output_transcript.done':
        break;
      case 'session.closed':
        setConnectionState('disconnected');
        setIsCallActive(false);
        break;
      case 'session.created':
        setConnectionState('connected');
        setIsCallActive(true);
        setDebugInfo('Translate activo. ¡Habla!');
        break;
      case 'session.updated':
        break;
      case 'error':
        console.error('[Translate]', msg.error);
        setError(msg.error?.message || 'Error traducción');
        break;
      default:
        if (msg.type?.startsWith('session.')) {
          setDebugInfo(msg.type);
        }
    }
  }

  // ── RELAY messages (backend proxy) ──
  function handleRelayMessage(msg) {
    switch (msg.type) {
      case 'connected':
        setConnectionState('connected');
        setIsCallActive(true);
        setDebugInfo('JARVIS conectado. ¡Habla!');
        break;
      case 'transcript.user': {
        const text = msg.text || '';
        setUserTranscript(prev => prev + ' ' + text);
        if (userSpeechCallbackRef.current) userSpeechCallbackRef.current(text.trim());
        break;
      }
      case 'transcript.assistant_delta':
        assistantBufferRef.current += (msg.delta || '');
        setAssistantTranscript(assistantBufferRef.current);
        break;
      case 'transcript.assistant_done':
        break;
      case 'disconnected':
        setConnectionState('disconnected');
        setIsCallActive(false);
        break;
      case 'error':
        setError(msg.message);
        break;
    }
  }

  return { isCallActive, connectionState, userTranscript, assistantTranscript, error, debugInfo, startCall, endCall, onUserSpeech };
}

// ── Helpers ──
function float32ToPCM16(float32) {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function playPCM16Audio(arrayBuffer, audioCtx) {
  try {
    const pcm16 = new Int16Array(arrayBuffer);
    playPCM16FromInt16(pcm16, audioCtx);
  } catch {}
}

function playPCM16FromInt16(pcm16, audioCtx) {
  try {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;
    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    if (!playPCM16FromInt16._nextTime || playPCM16FromInt16._nextTime < audioCtx.currentTime) {
      playPCM16FromInt16._nextTime = audioCtx.currentTime;
    }
    source.start(playPCM16FromInt16._nextTime);
    playPCM16FromInt16._nextTime += buffer.duration;
  } catch {}
}
playPCM16FromInt16._nextTime = 0;
