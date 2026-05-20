import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Sparkles, Loader2, ExternalLink } from 'lucide-react';

// Detect backend URL — same logic as hermesClient
async function getApiBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';
  
  try {
    const resp = await fetch('/jarvis-voice-factory/tunnel.json');
    if (resp.ok) {
      const data = await resp.json();
      if (data.tunnelUrl) return data.tunnelUrl;
    }
  } catch {}
  
  try {
    const resp = await fetch('https://jarvis-neo-david.loca.lt/health');
    if (resp.ok) return 'https://jarvis-neo-david.loca.lt';
  } catch {}
  
  return null;
}

async function apiPost(base, path, body) {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiGet(base, path) {
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function NeoChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [apiBase, setApiBase] = useState(null);
  const [connecting, setConnecting] = useState(true);
  const bottomRef = useRef(null);
  const pollingRef = useRef({});

  useEffect(() => {
    getApiBase().then(base => {
      setApiBase(base);
      setConnecting(false);
      if (!base && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setMessages([{
          id: Date.now(), role: 'neo',
          text: '⚠️ No se pudo conectar al backend. Ejecuta jarvis-start en WSL para activar el túnel.',
          time: new Date().toLocaleTimeString(),
        }]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: Date.now(), role: 'user', text, time: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const base = apiBase || '';
      const data = await apiPost(base, '/hermes/execute', { prompt: text });
      if (data.taskId) {
        const neoMsg = {
          id: Date.now() + 1, role: 'neo',
          text: `✅ Tarea enviada al Agente NEO.\nID: ${data.taskId.slice(0, 8)}\nEstado: Procesando...`,
          taskId: data.taskId,
          time: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, neoMsg]);

        // Poll for completion — show progress too
        pollTask(base, data.taskId, (task) => {
          const url = task.result?.url || task.result?.repo || '';
          setMessages((prev) => prev.map((m) =>
            m.taskId === task.id
              ? { ...m, text: `✅ TAREA COMPLETADA\nProyecto: ${task.result?.projectType || 'WebApp'}\n${url ? '🔗 ' + url : ''}`, url }
              : m
          ));
        }, (task) => {
          // Progress update
          setMessages((prev) => prev.map((m) =>
            m.taskId === task.id
              ? { ...m, text: `⚙️ Agente NEO trabajando... (${task.progress || 0}%)\nID: ${task.id.slice(0, 8)}` }
              : m
          ));
        });
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1, role: 'neo',
          text: `❌ Error: ${data.error || 'No se pudo crear la tarea'}`,
          time: new Date().toLocaleTimeString(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'neo',
        text: '❌ Error de conexión. ¿Has ejecutado jarvis-start?',
        time: new Date().toLocaleTimeString(),
      }]);
    }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-40 flex items-end justify-center pb-4 px-4"
    >
      <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[400px] h-[500px] bg-cyber-panel/90 backdrop-blur-xl rounded-2xl border border-cyber-cyan/20 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border/30">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyber-cyan" />
            <span className="font-display text-xs tracking-[0.15em] text-cyber-cyan">Chat con Agente NEO</span>
            {apiBase && <span className="w-1.5 h-1.5 rounded-full bg-cyber-green" title="Conectado" />}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cyber-border/20 text-cyber-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {connecting && (
            <div className="flex items-center justify-center py-8 gap-2 text-cyber-muted">
              <Loader2 size={16} className="animate-spin text-cyber-cyan" />
              <span className="text-xs font-body">Conectando...</span>
            </div>
          )}
          {!connecting && messages.length === 0 && (
            <div className="text-center py-8 text-cyber-muted/40">
              <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-body">Envía tu petición al Agente NEO</p>
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-cyber-cyan/15 border border-cyber-cyan/20'
                  : 'bg-cyber-purple/10 border border-cyber-purple/15'
              }`}>
                <p className="text-xs text-cyber-white/80 font-body whitespace-pre-wrap">{msg.text}</p>
                {msg.url && (
                  <a href={msg.url} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-cyber-cyan/80 hover:text-cyber-cyan bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg px-2 py-1 transition-colors">
                    <ExternalLink size={10} /> Abrir proyecto
                  </a>
                )}
                <p className="text-[9px] text-cyber-muted/40 mt-1 font-mono">{msg.time}</p>
              </div>
            </motion.div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-cyber-purple/10 border border-cyber-purple/15 rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                <Loader2 size={14} className="text-cyber-cyan animate-spin" />
                <span className="text-xs text-cyber-muted font-body">Enviando a NEO...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-cyber-border/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder='Ej: "crea una web de restaurante"...'
              className="flex-1 bg-cyber-bg/60 border border-cyber-border/40 rounded-xl px-4 py-2.5 text-sm text-cyber-white font-body placeholder:text-cyber-muted/40 focus:outline-none focus:border-cyber-cyan/40"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || connecting}
              className="p-2.5 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan/30 text-cyber-cyan disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyber-cyan/30 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

async function pollTask(base, taskId, onComplete, onProgress) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const data = await apiGet(base || '', `/hermes/task/${taskId}`);
      const task = data.task;
      if (!task) continue;
      if (task.status === 'processing') onProgress(task);
      if (task.status === 'completed' || task.status === 'failed') {
        onComplete(task);
        return;
      }
    } catch {}
  }
}
