/**
 * Hermes API Client — bridges voice commands to the Hermes Product Factory
 * Auto-detects backend URL: local dev uses Vite proxy, GitHub Pages uses tunnel
 */

// Detect backend base URL based on environment
function getApiBase() {
  if (typeof window === 'undefined') return '/hermes';
  const host = window.location.hostname;
  // Local dev: use Vite proxy
  if (host === 'localhost' || host === '127.0.0.1') return '/hermes';
  // GitHub Pages: read tunnel URL from tunnel.json
  return null; // Will be resolved async
}

// Cache the tunnel base URL
let cachedTunnelBase = null;

async function resolveApiBase() {
  // If local, use proxy
  const base = getApiBase();
  if (base) return base;

  // If already cached, use it
  if (cachedTunnelBase) return cachedTunnelBase;

  // Try to get tunnel URL from tunnel.json (deployed on GitHub Pages)
  try {
    const resp = await fetch('/jarvis-voice-factory/tunnel.json');
    if (resp.ok) {
      const data = await resp.json();
      if (data.tunnelUrl) {
        // Verify tunnel is alive
        const healthResp = await fetch(`${data.tunnelUrl}/health`);
        if (healthResp.ok) {
          cachedTunnelBase = `${data.tunnelUrl}/hermes`;
          return cachedTunnelBase;
        }
      }
    }
  } catch {}

  // Fallback: try known tunnel
  try {
    const resp = await fetch('https://jarvis-neo-david.loca.lt/health');
    if (resp.ok) {
      cachedTunnelBase = 'https://jarvis-neo-david.loca.lt/hermes';
      return cachedTunnelBase;
    }
  } catch {}

  throw new Error('No se pudo conectar al backend. Ejecuta jarvis-start en WSL.');
}

// Use fetch instead of axios to avoid dependency issues
async function apiPost(path, body) {
  const base = await resolveApiBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiGet(path) {
  const base = await resolveApiBase();
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const hermesClient = {
  async execute(prompt, mode = 'auto') {
    return apiPost('/execute', { prompt, mode, priority: 0 });
  },

  async getTask(taskId) {
    const data = await apiGet(`/task/${taskId}`);
    return data.task;
  },

  async getAllTasks() {
    const data = await apiGet('/tasks');
    return data.tasks;
  },

  subscribeToStream(onEvent) {
    // For GitHub Pages, use polling fallback (SSE doesn't work cross-origin easily)
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // Return polling-based subscription for remote
      const interval = setInterval(async () => {
        try {
          const tasks = await this.getAllTasks();
          for (const task of tasks) {
            onEvent({ task });
          }
        } catch {}
      }, 3000);
      return () => clearInterval(interval);
    }

    // Local dev: use SSE
    const eventSource = new EventSource('/hermes/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch {}
    };
    eventSource.onerror = () => {};
    return () => eventSource.close();
  },
};

export default hermesClient;
