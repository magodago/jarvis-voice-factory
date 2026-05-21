import express from 'express';
import cors from 'cors';
import http from 'http';
import hermesRoutes from './routes/hermes.js';
import pushRoutes, { sendPushNotification } from './routes/push.js';
import uploadRoutes from './routes/upload.js';
import newsRoutes from './routes/news.js';
import { setupRealtimeWS } from './routes/realtime.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// Setup WebSocket relay for OpenAI Realtime
setupRealtimeWS(server);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'online', system: 'JARVIS Voice Factory Bridge', version: '1.0.0' });
});

// Hermes bridge routes (includes /hermes/stream SSE)
app.use('/hermes', hermesRoutes);

// Push notifications
app.use('/push', pushRoutes);

// File uploads
app.use('/upload', uploadRoutes);
app.use('/uploads', express.static('uploads'));

// News proxy (RSS feeds)
app.use('/news', newsRoutes);

// Tunnel URL endpoint — frontend auto-discovers active tunnel
app.get('/tunnel-url', async (_req, res) => {
  try {
    const fs = await import('fs');
    const url = fs.readFileSync('/tmp/jarvis-tunnel-url.txt', 'utf-8').trim();
    if (url && url.startsWith('https://')) {
      return res.json({ tunnelUrl: url, active: true });
    }
  } catch {}
  res.json({ tunnelUrl: null, active: false });
});

// API key endpoint — used by frontend for direct OpenAI Realtime connection (translate mode)
app.get('/realtime/key', (_req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });
  res.json({ key });
});

// === WebRTC Session endpoint (JARVIS voice agent) ===
// Browser POSTs SDP offer → server exchanges with OpenAI → returns answer SDP
app.post('/session', express.text({ type: ['application/sdp', 'text/plain'] }), async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const sessionConfig = JSON.stringify({
      type: 'realtime',
      model: 'gpt-realtime-2',
      audio: {
        output: { voice: 'coral' },
        input: {
          transcription: { model: 'whisper-1', language: 'es' },
        },
      },
    });

    const fd = new FormData();
    fd.set('sdp', req.body);
    fd.set('session', sessionConfig);

    const r = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Safety-Identifier': 'jarvis-voice-user',
      },
      body: fd,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[WebRTC] OpenAI error:', errText);
      return res.status(502).json({ error: 'OpenAI rejected session', detail: errText });
    }

    const answerSdp = await r.text();
    console.log('[WebRTC] Session created, SDP answer length:', answerSdp.length);
    res.type('application/sdp').send(answerSdp);
  } catch (err) {
    console.error('[WebRTC] Session error:', err);
    res.status(500).json({ error: 'Session creation failed' });
  }
});

// Serve push sw.js with correct content type
app.get('/sw.js', (_, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile('sw.js', { root: '../client/public' });
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   JARVIS Voice Factory — API Bridge    ║
║   Server listening on port ${PORT}        ║
║   /hermes/execute  — POST endpoint      ║
║   /hermes/stream   — SSE stream         ║
║   /realtime        — WS relay           ║
╚══════════════════════════════════════════╝
  `);
});
