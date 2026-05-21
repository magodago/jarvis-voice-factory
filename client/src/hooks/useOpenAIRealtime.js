import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useOpenAIRealtime v3.1
 * ALL modes via backend WebSocket relay (API key stays server-side).
 * - JARVIS voice agent
 * - TRANSLATE mode
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

  useEffect(() => () => endCall(), []);

  const onUserSpeech = useCallback((fn) => { userSpeechCallbackRef.current = fn; }, []);

  const discoverTunnel = async (hostname) => {
    const isGitHubPages = hostname.includes('github.io');

    if (!isGitHubPages) {
      // Local dev: use same host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/realtime`;
    }

    // GitHub Pages → find tunnel
    setDebugInfo('Buscando túnel...');

    // 1. tunnel.json (updated by jarvis-start)
    try {
      const r = await fetch('/jarvis-voice-factory/tunnel.json', { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const d = await r.json();
        if (d.tunnelUrl) {
          setDebugInfo('Probando túnel: ' + new URL(d.tunnelUrl).host);
          const t = await fetch(`${d.tunnelUrl}/health`, { signal: AbortSignal.timeout(4000) });
          if (t.ok) {
            const wsProto = d.tunnelUrl.startsWith('https') ? 'wss' : 'ws';
            return `${wsProto}://${new URL(d.tunnelUrl).host}/realtime`;
          }
        }
      }
    } catch (e) {
      setDebugInfo('tunnel.json falló: ' + e.message);
    }

    // 2. Known candidates
    const candidates = [
      'https://jarvis-neo-david.loca.lt',
    ];
    for (const c of candidates) {
      try {
        setDebugInfo('Probando: ' + new URL(c).host);
        const r = await fetch(`${c}/health`, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          const wsProto = c.startsWith('https') ? 'wss' : 'ws';
          return `${wsProto}://${new URL(c).host}/realtime`;
        }
      } catch {}
    }

    throw new Error(
      'Túnel no disponible.\\nEjecuta: jarvis-start en WSL\\n' +
      'Y espera 10s a que el túnel se active.'
    );
  };

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

      setDebugInfo('Micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000, channelCount: 1 },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const bufferSize = 2048; // 85ms — good for both modes
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      const silenceGain = audioCtx.createGain();
      silenceGain.gain.value = 0;
      processor.connect(silenceGain);
      silenceGain.connect(audioCtx.destination);

      // Discover tunnel / build WS URL (SAME for both modes)
      const wsUrl = await discoverTunnel(window.location.hostname);

      setDebugInfo('Conectando...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setDebugInfo('Conectado. Iniciando sesión ' + mode + '...');
        ws.send(JSON.stringify({ type: 'start', instructions, voice: 'coral', mode }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          playPCM16Audio(event.data, audioCtx);
          return;
        }
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch {}
      };

      ws.onclose = (e) => {
        setConnectionState('disconnected');
        setIsCallActive(false);
        setDebugInfo('Desconectado (code: ' + e.code + ')');
      };

      ws.onerror = () => {
        setError('Error de conexión. ¿Backend corriendo en :4000?');
      };

      // Audio sender
      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(inputData);
        ws.send(pcm16.buffer);
      };
    } catch (err) {
      console.error('[Realtime]', err);
      setError(err.message || 'Error al iniciar.');
      setConnectionState('disconnected');
      setIsCallActive(false);
    }
  }, []);

  const endCall = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'stop', mode: currentModeRef.current }));
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

  function handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        setConnectionState('connected');
        setIsCallActive(true);
        setDebugInfo(currentModeRef.current === 'translate' ? 'Traducción activa. ¡Habla!' : 'JARVIS conectado. ¡Habla!');
        break;
      case 'transcript.user': {
        const text = msg.text || '';
        setUserTranscript(prev => prev + ' ' + text);
        if (userSpeechCallbackRef.current) userSpeechCallbackRef.current(text.trim());
        break;
      }
      case 'transcript.user_delta': break;
      case 'transcript.assistant_delta':
        assistantBufferRef.current += (msg.delta || '');
        setAssistantTranscript(assistantBufferRef.current);
        break;
      case 'transcript.assistant_done': break;
      case 'disconnected':
        setConnectionState('disconnected');
        setIsCallActive(false);
        break;
      case 'error':
        setError(msg.message);
        break;
      case 'debug':
        setDebugInfo(msg.event || '');
        break;
    }
  }

  return { isCallActive, connectionState, userTranscript, assistantTranscript, error, debugInfo, startCall, endCall, onUserSpeech };
}

function float32ToPCM16(float32) {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

function playPCM16Audio(arrayBuffer, audioCtx) {
  try {
    const pcm16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;
    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    if (!playPCM16Audio._nextTime || playPCM16Audio._nextTime < audioCtx.currentTime) {
      playPCM16Audio._nextTime = audioCtx.currentTime;
    }
    source.start(playPCM16Audio._nextTime);
    playPCM16Audio._nextTime += buffer.duration;
  } catch {}
}
playPCM16Audio._nextTime = 0;
