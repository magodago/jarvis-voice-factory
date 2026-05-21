import { WebSocketServer, WebSocket as WSClient } from 'ws';

/**
 * WebSocket relay for OpenAI Realtime API (GA — May 2026)
 *
 * Two modes:
 * - Voice Agent: /v1/realtime?model=gpt-realtime (JARVIS assistant)
 * - Translation: /v1/realtime/translations?model=gpt-realtime-translate
 *
 * Browser connects to our WS relay, we connect to OpenAI.
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
    let currentMode = 'jarvis'; // 'jarvis' or 'translate'

    browserWs.on('message', async (data, isBinary) => {
      try {
        if (isBinary) {
          // Binary = audio PCM16 from browser mic
          if (openaiWs && openaiWs.readyState === 1 && isActive) {
            const base64Audio = Buffer.from(data).toString('base64');
            // GA API: both modes use the same event type (no session. prefix)
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio,
            }));
            if (currentMode === 'translate') {
              console.log('[Translate] Audio sent:', data.length, 'bytes');
            }
          }
          return;
        }

        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'start': {
            if (isActive) return;

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
              browserWs.send(JSON.stringify({ type: 'error', message: 'OPENAI_API_KEY no configurada.' }));
              return;
            }

            const mode = msg.mode || 'jarvis';
            currentMode = mode;

            // === TRANSLATION MODE (GA — /v1/realtime + model=gpt-realtime-translate) ===
            if (mode === 'translate') {
              const openaiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-realtime-translate';

              openaiWs = new WSClient(openaiUrl, [], {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              });

              openaiWs.on('open', () => {
                console.log('[Realtime] Translate GA connected');
                // Wait for session.created before configuring
              });

              openaiWs.on('message', (openaiData, isBinaryMsg) => {
                if (isBinaryMsg) {
                  // Binary = PCM16 audio from OpenAI
                  if (browserWs.readyState === 1) {
                    browserWs.send(openaiData, { binary: true });
                  }
                  return;
                }

                try {
                  const event = JSON.parse(openaiData.toString());
                  // Log ALL events from translate model for debugging
                  console.log('[Translate] Event:', event.type, event.delta ? '(delta:' + (event.delta?.length || '?') + ')' : '');
                  switch (event.type) {
                    case 'session.created':
                      // Session ready — notify browser, start translating immediately
                      console.log('[Realtime] Translate session created:', event.session?.id);
                      isActive = true;
                      browserWs.send(JSON.stringify({ type: 'connected' }));
                      // No session.update needed — translate model works out of the box
                      break;
                    case 'session.updated':
                      break;
                    case 'response.output_audio.delta':
                      if (event.delta && browserWs.readyState === 1) {
                        const audioBuffer = Buffer.from(event.delta, 'base64');
                        browserWs.send(audioBuffer, { binary: true });
                      }
                      break;
                    case 'response.output_audio_transcript.delta':
                      browserWs.send(JSON.stringify({
                        type: 'transcript.assistant_delta',
                        delta: event.delta || '',
                      }));
                      break;
                    case 'response.output_audio_transcript.done':
                      browserWs.send(JSON.stringify({ type: 'transcript.assistant_done' }));
                      break;
                    // Legacy translate events (session.* protocol)
                    case 'session.output_audio.delta':
                      if (event.delta && browserWs.readyState === 1) {
                        const audioBuffer = Buffer.from(event.delta, 'base64');
                        browserWs.send(audioBuffer, { binary: true });
                      }
                      break;
                    case 'session.output_transcript.delta':
                      browserWs.send(JSON.stringify({
                        type: 'transcript.assistant_delta',
                        delta: event.delta || '',
                      }));
                      break;
                    case 'session.output_transcript.done':
                      browserWs.send(JSON.stringify({ type: 'transcript.assistant_done' }));
                      break;
                    case 'session.closed':
                      isActive = false;
                      browserWs.send(JSON.stringify({ type: 'disconnected' }));
                      break;
                    case 'conversation.item.input_audio_transcription.completed':
                      if (event.transcript) {
                        browserWs.send(JSON.stringify({
                          type: 'debug',
                          event: 'heard: ' + event.transcript.slice(0, 40),
                        }));
                      }
                      break;
                    case 'session.created':
                    case 'session.updated':
                      break;
                    case 'response.created':
                    case 'response.output_item.added':
                    case 'response.content_part.added':
                    case 'response.audio.delta':
                    case 'response.audio.done':
                    case 'response.done':
                    case 'input_audio_buffer.speech_started':
                    case 'input_audio_buffer.speech_stopped':
                    case 'input_audio_buffer.committed':
                      break;
                    case 'error':
                      console.error('[Realtime] Translate error:', JSON.stringify(event.error));
                      browserWs.send(JSON.stringify({
                        type: 'error',
                        message: event.error?.message || 'Translation error',
                      }));
                      break;
                    default:
                      if (browserWs.readyState === 1) {
                        browserWs.send(JSON.stringify({ type: 'debug', event: event.type }));
                      }
                  }
                } catch {}
              });

              openaiWs.on('close', (code) => {
                console.log(`[Realtime] Translate disconnected: ${code}`);
                isActive = false;
                if (browserWs.readyState === 1) {
                  browserWs.send(JSON.stringify({ type: 'disconnected', code }));
                }
              });

              openaiWs.on('error', (err) => {
                console.error('[Realtime] Translate WS error:', err.message);
                isActive = false;
                if (browserWs.readyState === 1) {
                  browserWs.send(JSON.stringify({ type: 'error', message: err.message }));
                }
              });

              break;
            }

            // === JARVIS VOICE AGENT MODE ===
            const model = 'gpt-realtime';
            const openaiUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

            openaiWs = new WSClient(openaiUrl, [], {
              headers: { 'Authorization': `Bearer ${apiKey}` },
            });

            openaiWs.on('open', () => {
              console.log('[Realtime] Connected to OpenAI');
              isActive = true;
              browserWs.send(JSON.stringify({ type: 'connected' }));
            });

            openaiWs.on('message', (openaiData, isBinaryMsg) => {
              if (isBinaryMsg) {
                console.log('[Realtime] Audio binary chunk, size:', openaiData.length);
                if (browserWs.readyState === 1) {
                  browserWs.send(openaiData, { binary: true });
                }
                return;
              }

              try {
                const event = JSON.parse(openaiData.toString());
                const eventType = event.type || 'unknown';

                if (browserWs.readyState === 1 &&
                    eventType !== 'session.created' &&
                    eventType !== 'session.updated') {
                  browserWs.send(JSON.stringify({
                    type: 'debug',
                    event: eventType,
                    detail: event.item?.type || event.part?.type || '',
                  }));
                }

                switch (event.type) {
                  case 'session.created': {
                    console.log('[Realtime] Session created:', event.session?.id);
                    openaiWs.send(JSON.stringify({
                      type: 'session.update',
                      session: {
                        type: 'realtime',
                        output_modalities: ['audio'],
                        instructions: msg.instructions || 'Eres J.A.R.V.I.S.',
                        audio: {
                          input: {
                            transcription: { model: 'whisper-1', language: 'es' },
                          },
                          output: {
                            voice: msg.voice || 'coral',
                          },
                        },
                      },
                    }));
                    break;
                  }

                  case 'session.updated':
                    console.log('[Realtime] Session configured');
                    break;

                  case 'conversation.item.input_audio_transcription.completed': {
                    const text = event.transcript || '';
                    if (text.trim()) {
                      console.log('[Realtime] User said:', text);
                      browserWs.send(JSON.stringify({ type: 'transcript.user', text: text.trim() }));
                    }
                    break;
                  }

                  case 'conversation.item.input_audio_transcription.delta': {
                    browserWs.send(JSON.stringify({ type: 'transcript.user_delta', delta: event.delta || '' }));
                    break;
                  }

                  case 'response.output_audio_transcript.delta': {
                    browserWs.send(JSON.stringify({ type: 'transcript.assistant_delta', delta: event.delta || '' }));
                    break;
                  }

                  case 'response.output_audio_transcript.done': {
                    browserWs.send(JSON.stringify({ type: 'transcript.assistant_done' }));
                    break;
                  }

                  case 'response.output_audio.delta': {
                    const audioBase64 = event.delta || '';
                    if (audioBase64 && browserWs.readyState === 1) {
                      const audioBuffer = Buffer.from(audioBase64, 'base64');
                      browserWs.send(audioBuffer, { binary: true });
                    }
                    break;
                  }

                  case 'response.output_audio.done':
                    console.log('[Realtime] Audio response complete');
                    browserWs.send(JSON.stringify({ type: 'debug', event: 'audio.done' }));
                    break;

                  case 'response.text.delta': {
                    browserWs.send(JSON.stringify({ type: 'transcript.assistant_delta', delta: event.delta || '' }));
                    break;
                  }

                  case 'response.created':
                  case 'response.output_item.added':
                  case 'response.content_part.added':
                  case 'response.audio.delta':
                  case 'response.audio.done':
                  case 'response.done':
                  case 'response.audio_transcript.delta':
                    break;

                  case 'response.text.delta': {
                    browserWs.send(JSON.stringify({ type: 'transcript.assistant_delta', delta: event.delta || '' }));
                    break;
                  }

                  case 'input_audio_buffer.speech_started':
                  case 'input_audio_buffer.speech_stopped':
                  case 'input_audio_buffer.committed':
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
                    break;
                }
              } catch (e) {}
            });

            openaiWs.on('close', (code, reason) => {
              console.log(`[Realtime] OpenAI disconnected: ${code}`);
              isActive = false;
              if (browserWs.readyState === 1) {
                browserWs.send(JSON.stringify({ type: 'disconnected', code, reason: reason?.toString() || '' }));
              }
            });

            openaiWs.on('error', (err) => {
              console.error('[Realtime] OpenAI WS error:', err.message);
              isActive = false;
              if (browserWs.readyState === 1) {
                browserWs.send(JSON.stringify({ type: 'error', message: err.message }));
              }
            });

            break;
          }

          case 'stop': {
            isActive = false;
            if (openaiWs) {
              // GA API: just close the WebSocket
              try { openaiWs.close(); } catch (e) {}
              openaiWs = null;
            }
            browserWs.send(JSON.stringify({ type: 'disconnected' }));
            break;
          }
        }
      } catch (err) {
        console.error('[Realtime] Browser msg error:', err);
      }
    });

    browserWs.on('close', () => {
      console.log('[Realtime] Browser disconnected');
      isActive = false;
      if (openaiWs) {
        try { openaiWs.close(); } catch (e) {}
        openaiWs = null;
      }
    });

    browserWs.on('error', (err) => {
      console.error('[Realtime] Browser WS error:', err);
    });
  });

  console.log('[Realtime] WebSocket relay ready (voice + translation)');
}
