import { useCallback, useRef } from 'react';
import { classifyMessage } from '../utils/intentDetector';

/**
 * useIntentDetector — detects product creation commands from voice transcripts
 *
 * Wraps the intent detection logic with:
 * - Debouncing (avoid duplicate commands)
 * - Confidence threshold
 * - Wake word detection
 */
export default function useIntentDetector(onCommandDetected) {
  const lastCommandRef = useRef('');
  const lastCommandTimeRef = useRef(0);
  const DEBOUNCE_MS = 3000; // 3 seconds between commands
  const CONFIDENCE_THRESHOLD = 0.4;

  const processTranscript = useCallback((text) => {
    if (!text || text.length < 5) return null;

    // Debounce: skip if same command within 3s
    const now = Date.now();
    if (
      text === lastCommandRef.current &&
      now - lastCommandTimeRef.current < DEBOUNCE_MS
    ) {
      return null;
    }

    const result = classifyMessage(text);

    if (result.isProductCommand && result.intent.confidence >= CONFIDENCE_THRESHOLD) {
      lastCommandRef.current = text;
      lastCommandTimeRef.current = now;

      if (onCommandDetected) {
        onCommandDetected({
          type: result.intent.type,
          command: text,
          prompt: result.prompt,
          confidence: result.intent.confidence,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    }

    return null;
  }, [onCommandDetected]);

  return { processTranscript };
}
