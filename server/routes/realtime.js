import { WebSocketServer, WebSocket as WSClient } from 'ws';

/**
 * WebSocket relay for OpenAI Realtime API (GA — May 2026)
 *
 * Architecture:
 *   Browser ←WS→ Our Server ←WS→ OpenAI Realtime API
 *
 * Critical GA differences from beta:
 * - Model: gpt-realtime (not gpt-4o-realtime-preview)
 * - session.type must be "realtime"
 * - output_modalities: ['audio'] OR ['text'], not both
 * - turn_detection is inside audio.input, not top-level
 * - voice is inside audio.output, not top-level
 * - input_audio_buffer.append: audio is base64 PCM16
 * - Transcription: audio.input.transcription { model: 'whisper-1' }
 */

export function setupRealtimeWS(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/realtime') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (browserWs) => {
    console.log('[Realtime] Browser connected');
    let openaiWs = null;
    let isActive = false;

    browserWs.on('message', async (data, isBinary) => {
      try {
        if (isBinary) {
          // Binary = audio PCM16 from browser mic
          if (openaiWs && openaiWs.readyState === 1 && isActive) {
            const base64Audio = Buffer.from(data).toString('base64');
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio,
            }));
          }
          return;
        }

        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'start': {
            if (isActive) return;

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
              browserWs.send(JSON.stringify({
                type: 'error',
                message: 'OPENAI_API_KEY no configurada.',
              }));
              return;
            }

            const model = 'gpt-realtime';
            const openaiUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

            openaiWs = new WSClient(openaiUrl, [], {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
            });

            openaiWs.on('open', () => {
              console.log('[Realtime] Connected to OpenAI');
              isActive = true;
              browserWs.send(JSON.stringify({ type: 'connected' }));
            });

            openaiWs.on('message', (openaiData, isBinary) => {
              if (isBinary) {
                // Binary audio from OpenAI assistant voice
                console.log('[Realtime] Audio binary chunk received, size:', openaiData.length);
                if (browserWs.readyState === 1) {
                  browserWs.send(openaiData, { binary: true });
                }
                return;
              }

              try {
                const event = JSON.parse(openaiData.toString());
                const eventType = event.type || 'unknown';
                
                // Forward ALL events to browser for debugging
                if (browserWs.readyState === 1 && 
                    eventType !== 'session.created' && 
                    eventType !== 'session.updated') {
                  browserWs.send(JSON.stringify({
                    type: 'debug',
                    event: eventType,
                    detail: event.item?.type || event.part?.type || event.error?.code || '',
                  }));
                }

                switch (event.type) {
                  // Session created — send configuration
                  case 'session.created': {
                    console.log('[Realtime] Session created:', event.session?.id);
                    openaiWs.send(JSON.stringify({
                      type: 'session.update',
                      session: {
                        type: 'realtime',
                        output_modalities: ['audio'],
                        instructions: msg.instructions || 'Eres J.A.R.V.I.S., el asistente de inteligencia artificial de Tony Stark.',
                        audio: {
                          input: {
                            transcription: { model: 'whisper-1', language: msg.mode === 'translate' ? 'auto' : 'es' },
                          },
                          output: {
                            voice: msg.voice || 'alloy',
                          },
                        },
                        // Faster turn detection for translation mode
                        ...(msg.mode === 'translate' ? {
                          turn_detection: {
                            type: 'server_vad',
                            threshold: 0.3,
                            prefix_padding_ms: 100,
                            silence_duration_ms: 250,
                          }
                        } : {}),
                      },
                    }));
                    break;
                  }

                  case 'session.updated': {
                    console.log('[Realtime] Session configured');
                    break;
                  }

                  // User speech transcription (complete phrase)
                  case 'conversation.item.input_audio_transcription.completed': {
                    const text = event.transcript || '';
                    if (text.trim()) {
                      console.log('[Realtime] User said:', text);
                      browserWs.send(JSON.stringify({
                        type: 'transcript.user',
                        text: text.trim(),
                      }));
                    }
                    break;
                  }

                  // User speech transcription (partial - for display)
                  case 'conversation.item.input_audio_transcription.delta': {
                    browserWs.send(JSON.stringify({
                      type: 'transcript.user_delta',
                      delta: event.delta || '',
                    }));
                    break;
                  }

                  // Assistant text transcript (GA event name)
                  case 'response.output_audio_transcript.delta': {
                    browserWs.send(JSON.stringify({
                      type: 'transcript.assistant_delta',
                      delta: event.delta || '',
                    }));
                    break;
                  }

                  case 'response.output_audio_transcript.done': {
                    browserWs.send(JSON.stringify({
                      type: 'transcript.assistant_done',
                    }));
                    break;
                  }

                  // Audio delta from assistant — base64 in JSON (GA format)
                  case 'response.output_audio.delta': {
                    const audioBase64 = event.delta || '';
                    if (audioBase64 && browserWs.readyState === 1) {
                      // Convert base64 to binary and forward
                      const audioBuffer = Buffer.from(audioBase64, 'base64');
                      browserWs.send(audioBuffer, { binary: true });
                    }
                    break;
                  }

                  case 'response.output_audio.done': {
                    console.log('[Realtime] Audio response complete');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'audio.done' }));
                    break;
                  }

                  case 'response.text.delta': {
                    browserWs.send(JSON.stringify({
                      type: 'transcript.assistant_delta',
                      delta: event.delta || '',
                    }));
                    break;
                  }

                  // Response lifecycle events (debug)
                  case 'response.created':
                    console.log('[Realtime] Response started');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'response.created' }));
                    break;
                  case 'response.output_item.added':
                    console.log('[Realtime] Output item:', event.item?.type);
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'output_item.' + event.item?.type }));
                    break;
                  case 'response.content_part.added':
                    console.log('[Realtime] Content part:', event.part?.type);
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'content_part.' + event.part?.type }));
                    break;
                  case 'response.audio.delta':
                    // Audio deltas come as binary, but there might be JSON metadata too
                    break;
                  case 'response.audio.done':
                    console.log('[Realtime] Audio response complete');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'audio.done' }));
                    break;
                  case 'response.done':
                    console.log('[Realtime] Response complete');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'response.done' }));
                    break;

                  // Input audio buffer events (debug)
                  case 'input_audio_buffer.speech_started':
                    console.log('[Realtime] Speech detected');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'speech_started' }));
                    break;
                  case 'input_audio_buffer.speech_stopped':
                    console.log('[Realtime] Speech ended, waiting for response...');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'speech_stopped' }));
                    break;
                  case 'input_audio_buffer.committed':
                    console.log('[Realtime] Audio buffer committed');
                    break;

                  case 'error': {
                    console.error('[Realtime] OpenAI error:', JSON.stringify(event.error));
                    browserWs.send(JSON.stringify({
                      type: 'error',
                      message: event.error?.message || 'Realtime API error',
                    }));
                    break;
                  }

                  default:
                    // Log unknown events for debugging
                    console.log('[Realtime] Unknown event:', event.type);
                    break;
                }
              } catch (e) {
                // Non-JSON, ignore
              }
            });

            openaiWs.on('close', (code, reason) => {
              console.log(`[Realtime] OpenAI disconnected: ${code}`);
              isActive = false;
              if (browserWs.readyState === 1) {
                browserWs.send(JSON.stringify({
                  type: 'disconnected',
                  code,
                  reason: reason?.toString() || '',
                }));
              }
            });

            openaiWs.on('error', (err) => {
              console.error('[Realtime] OpenAI WS error:', err.message);
              isActive = false;
              if (browserWs.readyState === 1) {
                browserWs.send(JSON.stringify({
                  type: 'error',
                  message: err.message,
                }));
              }
            });

            break;
          }

          case 'stop': {
            isActive = false;
            if (openaiWs) {
              try { openaiWs.close(); } catch (e) { /* ignore */ }
              openaiWs = null;
            }
            browserWs.send(JSON.stringify({ type: 'disconnected' }));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[Realtime] Browser msg error:', err);
      }
    });

    browserWs.on('close', () => {
      console.log('[Realtime] Browser disconnected');
      isActive = false;
      if (openaiWs) {
        try { openaiWs.close(); } catch (e) { /* ignore */ }
        openaiWs = null;
      }
    });

    browserWs.on('error', (err) => {
      console.error('[Realtime] Browser WS error:', err);
    });
  });

  console.log('[Realtime] WebSocket relay ready');
}
