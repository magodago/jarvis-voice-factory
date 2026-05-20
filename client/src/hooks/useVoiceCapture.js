import { useEffect, useRef, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';

/**
 * useVoiceCapture — continuous voice capture via Web Speech API
 *
 * Features:
 * - Continuous listening (never stops until manually paused)
 * - Interim results (real-time transcription display)
 * - Final results (complete phrases for intent detection)
 * - Auto-restart on silence/error
 * - Wake word detection ("JARVIS")
 * - Browser compatibility handling
 */
export default function useVoiceCapture() {
  const { setListening, setTranscript, setSystemStatus } = useApp();
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Callback for when a final transcript phrase is ready
  const onFinalTranscriptRef = useRef(null);

  const setOnFinalTranscript = useCallback((fn) => {
    onFinalTranscriptRef.current = fn;
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech Recognition no está disponible en este navegador. Usa Chrome o Edge.');
      return;
    }

    if (isActiveRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES'; // Spanish primary

      recognition.onstart = () => {
        isActiveRef.current = true;
        setListening(true);
        setSystemStatus('listening', 'Escuchando...');
        setError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (final) {
          finalTranscriptRef.current += final;
          setTranscript(finalTranscriptRef.current.trim(), '');
          // Fire callback for intent detection
          if (onFinalTranscriptRef.current) {
            onFinalTranscriptRef.current(final.trim());
          }
        }

        if (interim) {
          setTranscript(finalTranscriptRef.current.trim(), interim);
        }

        // Reset silence timer on any speech
        resetSilenceTimer();
      };

      recognition.onerror = (event) => {
        console.error('[VoiceCapture] Error:', event.error);

        if (event.error === 'not-allowed') {
          setError('Permiso de micrófono denegado. Concede acceso al micrófono para usar JARVIS.');
          setSystemStatus('error', 'Micrófono no disponible');
          stopListening();
          return;
        }

        if (event.error === 'no-speech') {
          // No speech detected — this is normal, just restart
          if (isActiveRef.current) {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }
          return;
        }

        // For other errors, restart after delay
        if (isActiveRef.current && event.error !== 'aborted') {
          setTimeout(() => {
            if (isActiveRef.current) {
              try { recognition.start(); } catch (e) { /* ignore */ }
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still active
        if (isActiveRef.current) {
          setTimeout(() => {
            if (isActiveRef.current) {
              try { recognition.start(); } catch (e) {
                console.error('[VoiceCapture] Restart failed:', e);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[VoiceCapture] Start error:', err);
      setIsSupported(false);
    }
  }, [SpeechRecognition, setListening, setTranscript, setSystemStatus]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setListening(false);
    setSystemStatus('idle', 'Sistema en espera.');
  }, [setListening, setSystemStatus]);

  const toggleListening = useCallback(() => {
    if (isActiveRef.current) {
      stopListening();
    } else {
      finalTranscriptRef.current = '';
      startListening();
    }
  }, [startListening, stopListening]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      // Just reset the visual state, don't stop listening
      setSystemStatus('listening', 'Esperando comando...');
    }, 5000);
  }, [setSystemStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return {
    isSupported,
    isListening: isActiveRef,
    error,
    startListening,
    stopListening,
    toggleListening,
    setOnFinalTranscript,
  };
}
