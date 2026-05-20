import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Mic, Image, X, CheckCircle, Loader2 } from 'lucide-react';

export default function FileUpload({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/upload/file', { method: 'POST', body: form });
      const data = await res.json();
      setUploaded(data);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  if (!isOpen) return null;

  const fileIcon = file?.type?.startsWith('audio') ? Mic
    : file?.type?.startsWith('image') ? Image
    : FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-40 flex items-end justify-center pb-4 px-4"
    >
      <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[400px] bg-cyber-panel/90 backdrop-blur-xl rounded-2xl border border-cyber-cyan/20 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs tracking-[0.15em] text-cyber-cyan">Enviar archivo a NEO</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cyber-border/20"><X size={18} className="text-cyber-muted" /></button>
        </div>

        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-cyber-border/40 rounded-2xl p-8 text-center cursor-pointer hover:border-cyber-cyan/40 transition-colors"
          >
            <Upload size={32} className="mx-auto mb-3 text-cyber-muted/50" />
            <p className="text-sm text-cyber-muted font-body">Toca para subir un archivo</p>
            <p className="text-[11px] text-cyber-muted/40 mt-1 font-body">Audio, documento, imagen — máx 50MB</p>
            <input ref={inputRef} type="file" className="hidden" onChange={handleFile} accept="*/*" />
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-3 p-4 bg-cyber-amber/5 border border-cyber-amber/10 rounded-xl">
            <Loader2 size={18} className="text-cyber-amber animate-spin" />
            <div>
              <p className="text-sm text-cyber-white font-body">Subiendo {file.name}...</p>
            </div>
          </div>
        )}

        {uploaded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-cyber-green/5 border border-cyber-green/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-cyber-green" />
              <p className="text-sm text-cyber-green font-body">Archivo enviado a NEO</p>
            </div>
            <p className="text-xs text-cyber-muted font-mono truncate">{uploaded.originalName}</p>
            <p className="text-[10px] text-cyber-muted/40 mt-1 font-body">NEO lo analizará en breve</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
