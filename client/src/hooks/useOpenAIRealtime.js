import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useOpenAIRealtime v2 — GA Realtime API via WebSocket relay
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
  const audioLogIntervalRef = useRef(null);
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

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
        if (isIOS && isHTTP) {
          throw new Error('iOS requiere HTTPS para usar el micrófono. Accede desde un túnel HTTPS (ngrok) o usa localhost.');
        }
        throw new Error('Tu navegador no soporta acceso al micrófono. Usa Chrome, Edge o Safari en HTTPS.');
      }

      setDebugInfo('Solicitando micrófono...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      // Connect to a silent gain node to keep audio graph alive (no echo)
      const silenceGain = audioCtx.createGain();
      silenceGain.gain.value = 0;
      processor.connect(silenceGain);
      silenceGain.connect(audioCtx.destination);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const isGitHubPages = hostname.includes('github.io');
      
      // Build WebSocket URL: local dev → proxy, GitHub Pages → auto-discover tunnel
      let wsUrl;
      if (isGitHubPages) {
        setDebugInfo('Buscando tunel activo...');
        
        // First try: read tunnel.json from our own GitHub Pages (updated by jarvis-start)
        let foundTunnel = null;
        try {
          const resp = await fetch('/jarvis-voice-factory/tunnel.json', { signal: AbortSignal.timeout(3000) });
          if (resp.ok) {
            const data = await resp.json();
            if (data.tunnelUrl) {
              const testResp = await fetch(`${data.tunnelUrl}/health`, { signal: AbortSignal.timeout(3000) });
              if (testResp.ok) {
                foundTunnel = data.tunnelUrl;
              }
            }
          }
        } catch {}
        
        // Second try: known candidates via /tunnel-url endpoint
        if (!foundTunnel) {
          const candidates = [
            'https://jarvis-neo-david.loca.lt',
          ];
          for (const candidate of candidates) {
            try {
              const resp = await fetch(`${candidate}/tunnel-url`, { signal: AbortSignal.timeout(3000) });
              if (resp.ok) {
                const data = await resp.json();
                if (data.active && data.tunnelUrl) {
                  foundTunnel = data.tunnelUrl;
                  break;
                }
              }
            } catch {}
            try {
              const resp = await fetch(`${candidate}/health`, { signal: AbortSignal.timeout(2000) });
              if (resp.ok) { foundTunnel = candidate; break; }
            } catch {}
          }
        }
        
        if (foundTunnel) {
          const wsProto = foundTunnel.startsWith('https') ? 'wss' : 'ws';
          wsUrl = `${wsProto}://${new URL(foundTunnel).host}/realtime`;
          setDebugInfo('Tunel: ' + new URL(foundTunnel).host);
        } else {
          throw new Error(
            'Tunel no disponible. Ejecuta jarvis-start en WSL para activarlo.'
          );
        }
      } else {
        wsUrl = `${protocol}//${window.location.host}/realtime`;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setDebugInfo('WS conectado, enviando start...');
        ws.send(JSON.stringify({ type: 'start', instructions, voice: 'coral', mode }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setDebugInfo(' AUDIO: ' + event.data.byteLength + ' bytes de JARVIS');
          playPCM16Audio(event.data, audioCtx);
          return;
        }
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) { /* ignore */ }
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        setIsCallActive(false);
      };

      ws.onerror = () => { 
        setError('Error de conexion con JARVIS. Verifica que el servidor backend este corriendo en :4000.');
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(inputData);
        ws.send(pcm16.buffer);
      };

      // Log audio sending periodically
      let audioChunksSent = 0;
      audioLogIntervalRef.current = setInterval(() => {
        if (audioChunksSent > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          setDebugInfo(' Enviando audio... (' + audioChunksSent + ' chunks)');
          audioChunksSent = 0;
        }
      }, 2000);
      const origProcessor = processor.onaudioprocess;
      processor.onaudioprocess = (event) => {
        audioChunksSent++;
        origProcessor(event);
      };
    } catch (err) {
      console.error('[Realtime] Start error:', err);
      setError(err.message || 'Error al iniciar llamada.');
      setConnectionState('disconnected');
      setIsCallActive(false);
    }
  }, []);

  const endCall = useCallback(() => {
    if (audioLogIntervalRef.current) { clearInterval(audioLogIntervalRef.current); audioLogIntervalRef.current = null; }
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'stop', mode: currentModeRef.current })); wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch (e) {}; processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) {}; audioContextRef.current = null; }
    setConnectionState('disconnected');
    setIsCallActive(false);
    setError(null);
  }, []);

  const handleServerMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'connected': setConnectionState('connected'); setIsCallActive(true); setDebugInfo('JARVIS conectado. ¡Habla!'); break;
      case 'transcript.user': {
        setDebugInfo('Te he oído: ' + (msg.text || '').slice(0, 40));
        const text = msg.text || '';
        setUserTranscript((prev) => prev + ' ' + text);
        if (userSpeechCallbackRef.current) userSpeechCallbackRef.current(text.trim());
        break;
      }
      case 'transcript.assistant_delta': {
        setDebugInfo('JARVIS respondiendo...');
        assistantBufferRef.current += (msg.delta || '');
        setAssistantTranscript(assistantBufferRef.current);
        break;
      }
      case 'transcript.assistant_done': setDebugInfo('JARVIS terminó de hablar.'); break;
      case 'debug':
        setDebugInfo('OpenAI: ' + (msg.event || '?'));
        break;
      case 'disconnected': setConnectionState('disconnected'); setIsCallActive(false); break;
      case 'error': setError(msg.message); setDebugInfo('Error: ' + msg.message); break;
    }
  }, []);

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

    // Schedule at current time to prevent overlap
    if (!playPCM16Audio._nextTime || playPCM16Audio._nextTime < audioCtx.currentTime) {
      playPCM16Audio._nextTime = audioCtx.currentTime;
    }
    source.start(playPCM16Audio._nextTime);
    playPCM16Audio._nextTime += buffer.duration;
  } catch (e) {}
}
playPCM16Audio._nextTime = 0;
