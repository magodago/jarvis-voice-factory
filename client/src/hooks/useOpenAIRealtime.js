import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useOpenAIRealtime v4 — WebRTC for JARVIS, WebSocket relay for Translate
 */
export default function useOpenAIRealtime() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const processorRef = useRef(null);
  const audioContextRef = useRef(null);
  const userSpeechCallbackRef = useRef(null);
  const assistantBufferRef = useRef('');
  const currentModeRef = useRef('jarvis');

  useEffect(() => () => endCall(), []);

  const onUserSpeech = useCallback((fn) => { userSpeechCallbackRef.current = fn; }, []);

  // ─── JARVIS via WebRTC ───
  const startJarvisWebRTC = async () => {
    setDebugInfo('Creando sesión WebRTC...');

    // 1. Get mic
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // 2. Create peer connection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // 3. Play remote audio
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioElRef.current = audioEl;
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

    // 4. Add local mic track
    pc.addTrack(stream.getAudioTracks()[0], stream);

    // 5. Data channel for events
    const dc = pc.createDataChannel('oai-events');
    dc.onopen = () => {
      setDebugInfo('Canal de datos abierto');
    };
    dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleWebRTCEvent(event);
      } catch {}
    };

    // 6. Create offer + exchange SDP via backend
    setDebugInfo('Intercambiando SDP...');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch('/session', {
      method: 'POST',
      body: offer.sdp,
      headers: { 'Content-Type': 'application/sdp' },
    });

    if (!sdpResponse.ok) {
      const err = await sdpResponse.text();
      throw new Error('Error SDP: ' + err.slice(0, 100));
    }

    const answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    setDebugInfo('WebRTC conectado');
    setConnectionState('connected');
    setIsCallActive(true);
  };

  const handleWebRTCEvent = (event) => {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript?.trim()) {
          setDebugInfo('Te oí: ' + event.transcript.slice(0, 40));
          setUserTranscript(prev => prev + ' ' + event.transcript);
          if (userSpeechCallbackRef.current) userSpeechCallbackRef.current(event.transcript.trim());
        }
        break;
      case 'response.output_audio_transcript.delta':
        assistantBufferRef.current += (event.delta || '');
        setAssistantTranscript(assistantBufferRef.current);
        break;
      case 'response.output_audio_transcript.done':
        break;
      case 'error':
        setError(event.error?.message || 'Error WebRTC');
        break;
      default:
        // Forward unknown events as debug
        setDebugInfo(event.type);
    }
  };

  // ─── TRANSLATE via WebSocket relay ───
  const startTranslateWS = async () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const isGitHubPages = hostname.includes('github.io');

    let wsUrl;
    if (isGitHubPages) {
      setDebugInfo('Buscando túnel...');
      let foundTunnel = null;
      try {
        const r = await fetch('/jarvis-voice-factory/tunnel.json', { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const d = await r.json();
          if (d.tunnelUrl) {
            const t = await fetch(`${d.tunnelUrl}/health`, { signal: AbortSignal.timeout(4000) });
            if (t.ok) foundTunnel = d.tunnelUrl;
          }
        }
      } catch {}
      if (!foundTunnel) {
        try {
          const r = await fetch('https://jarvis-neo-david.loca.lt/health', { signal: AbortSignal.timeout(3000) });
          if (r.ok) foundTunnel = 'https://jarvis-neo-david.loca.lt';
        } catch {}
      }
      if (foundTunnel) {
        wsUrl = `${foundTunnel.startsWith('https') ? 'wss' : 'ws'}://${new URL(foundTunnel).host}/realtime`;
      } else {
        throw new Error('Túnel no disponible. Ejecuta jarvis-start en WSL.');
      }
    } else {
      wsUrl = `${protocol}//${window.location.host}/realtime`;
    }

    // Audio setup for PCM16 manual processing
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000, channelCount: 1 },
    });
    streamRef.current = stream;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(2048, 1, 1);
    processorRef.current = processor;
    source.connect(processor);
    const silenceGain = audioCtx.createGain();
    silenceGain.gain.value = 0;
    processor.connect(silenceGain);
    silenceGain.connect(audioCtx.destination);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', instructions: '', voice: 'coral', mode: 'translate' }));
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        playPCM16Audio(event.data, audioCtx);
        return;
      }
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'connected':
            setConnectionState('connected');
            setIsCallActive(true);
            setDebugInfo('Traducción activa');
            break;
          case 'transcript.assistant_delta':
            assistantBufferRef.current += (msg.delta || '');
            setAssistantTranscript(assistantBufferRef.current);
            break;
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
      } catch {}
    };

    ws.onclose = () => { setConnectionState('disconnected'); setIsCallActive(false); };
    ws.onerror = () => { setError('Error de conexión'); };

    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = float32ToPCM16(inputData);
      ws.send(pcm16.buffer);
    };
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
        throw new Error('Micrófono no soportado.');
      }

      if (mode === 'translate') {
        await startTranslateWS();
      } else {
        await startJarvisWebRTC();
      }
    } catch (err) {
      console.error('[Realtime]', err);
      setError(err.message || 'Error al iniciar.');
      setConnectionState('disconnected');
      setIsCallActive(false);
    }
  }, []);

  const endCall = useCallback(() => {
    // WebRTC cleanup
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (audioElRef.current) {
      try { audioElRef.current.pause(); audioElRef.current.srcObject = null; } catch {}
      audioElRef.current = null;
    }

    // WebSocket cleanup
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'stop', mode: currentModeRef.current }));
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    // Audio cleanup
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {}; processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {}; audioContextRef.current = null; }

    setConnectionState('disconnected');
    setIsCallActive(false);
    setError(null);
  }, []);

  return { isCallActive, connectionState, userTranscript, assistantTranscript, error, debugInfo, startCall, endCall, onUserSpeech };
}

// ── PCM16 helpers (only for translate WS mode) ──
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
