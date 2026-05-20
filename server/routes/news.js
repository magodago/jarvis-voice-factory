import { Router } from 'express';

const router = Router();

/**
 * GET /news/search?q=...
 * Proxy for DuckDuckGo Instant Answers API (avoids CORS issues)
 */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'INVALID_QUERY', message: 'Se requiere parámetro "q".' });
  }

  try {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1&t=jarvis-news`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[News] Error fetching news:', err.message);
    res.status(502).json({ error: 'UPSTREAM_ERROR', message: 'No se pudo contactar con DuckDuckGo.' });
  }
});

export default router;
