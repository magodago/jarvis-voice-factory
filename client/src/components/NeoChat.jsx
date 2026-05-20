import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, Loader2, CheckCircle } from 'lucide-react';

/**
 * NeoChat — direct text chat with Agente NEO (Hermes bridge)
 */
export default function NeoChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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
      const res = await fetch('/hermes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      if (data.taskId) {
        const neoMsg = {
          id: Date.now() + 1,
          role: 'neo',
          text: `Tarea enviada al Agente NEO.\nID: ${data.taskId.slice(0, 8)}\nEstado: ${data.status}`,
          taskId: data.taskId,
          time: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, neoMsg]);

        // Poll for completion
        pollTask(data.taskId, (task) => {
          setMessages((prev) => prev.map((m) =>
            m.taskId === task.id
              ? { ...m, text: `Tarea completada.\nID: ${task.id.slice(0, 8)}\nEstado: ${task.status}\nProyecto: ${task.result?.projectType || 'WebApp'}` }
              : m
          ));
        });
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          role: 'neo',
          text: `Error: ${data.error || 'No se pudo crear la tarea'}`,
          time: new Date().toLocaleTimeString(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'neo',
        text: 'Error de conexión con el Agente NEO.',
        time: new Date().toLocaleTimeString(),
      }]);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-40 flex items-end justify-center pb-4 px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-md" onClick={onClose} />

      {/* Chat panel */}
      <div className="relative w-full max-w-[400px] h-[500px] bg-cyber-panel/90 backdrop-blur-xl rounded-2xl border border-cyber-cyan/20 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border/30">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyber-cyan" />
            <span className="font-display text-xs tracking-[0.15em] text-cyber-cyan">Chat con Agente NEO</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cyber-border/20 text-cyber-muted">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="text-center py-8 text-cyber-muted/40">
              <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-body">Envía tu petición directamente al Agente NEO</p>
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

        {/* Input */}
        <div className="p-3 border-t border-cyber-border/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ej: "crea una web de restaurante"...'
              className="flex-1 bg-cyber-bg/60 border border-cyber-border/40 rounded-xl px-4 py-2.5 text-sm text-cyber-white font-body placeholder:text-cyber-muted/40 focus:outline-none focus:border-cyber-cyan/40"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
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

async function pollTask(taskId, onComplete) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(`/hermes/task/${taskId}`);
      const data = await res.json();
      if (data.task?.status === 'completed' || data.task?.status === 'failed') {
        onComplete(data.task);
        return;
      }
    } catch {}
  }
}
