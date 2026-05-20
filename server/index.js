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

// News proxy (DuckDuckGo)
app.use('/news', newsRoutes);

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
