import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, FolderTree, Package, Layers, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * ProjectViewer — displays generated project details from Hermes
 *
 * Shows:
 * - Project summary & type
 * - Architecture diagram (text-based)
 * - Tech stack badges
 * - File structure tree
 * - Copy-to-clipboard for prompts
 */
export default function ProjectViewer({ task, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!task || !task.result) {
    return (
      <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 flex items-center justify-center min-h-[200px]">
        <div className="text-center text-jarvis-muted/40">
          <FileCode size={40} className="mx-auto mb-3" />
          <p className="text-sm font-body">Select a completed task to view</p>
        </div>
      </div>
    );
  }

  const { result } = task;

  const handleCopy = () => {
    navigator.clipboard.writeText(task.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileCode },
    { id: 'structure', label: 'Structure', icon: FolderTree },
    { id: 'stack', label: 'Stack', icon: Package },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-jarvis-border/30">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-display tracking-[0.15em] uppercase text-jarvis-cyan bg-jarvis-cyan/10 px-2 py-0.5 rounded">
                {result.projectType}
              </span>
              <span className="text-[10px] font-mono text-jarvis-muted">
                {task.id?.slice(0, 8)}
              </span>
            </div>
            <h3 className="font-display text-sm text-jarvis-white truncate">
              {task.prompt}
            </h3>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-jarvis-border/30 transition-colors"
              title="Copy prompt"
            >
              {copied ? <Check size={16} className="text-jarvis-green" /> : <Copy size={16} className="text-jarvis-muted" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-jarvis-border/30">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-body transition-all
                ${activeTab === tab.id
                  ? 'text-jarvis-cyan border-b-2 border-jarvis-cyan bg-jarvis-cyan/5'
                  : 'text-jarvis-muted hover:text-jarvis-white border-b-2 border-transparent'
                }
              `}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div>
                <p className="text-xs text-jarvis-muted font-body mb-1">Project Summary</p>
                <p className="text-sm text-jarvis-white/80 font-body">{result.summary}</p>
              </div>

              <div>
                <p className="text-xs text-jarvis-muted font-body mb-1">Architecture</p>
                <p className="text-sm text-jarvis-cyan/80 font-mono">{result.architecture}</p>
              </div>

              <div>
                <p className="text-xs text-jarvis-muted font-body mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-jarvis-green/10 border border-jarvis-green/20 text-[11px] text-jarvis-green font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-jarvis-green" />
                  GENERATED
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === 'structure' && (
            <motion.div
              key="structure"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-jarvis-bg/80 rounded-xl border border-jarvis-border/30 p-4 font-mono text-xs">
                <div className="text-jarvis-cyan mb-2">~/project/</div>
                {result.fileStructure?.map((dir, i) => (
                  <div key={i} className="text-jarvis-white/70 pl-4 border-l border-jarvis-cyan/10 ml-1">
                    {dir}
                  </div>
                ))}
                <div className="text-jarvis-muted/60 pl-4 border-l border-jarvis-cyan/10 ml-1 mt-1">
                  + {result.codeFiles || 'N'} source files
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stack' && (
            <motion.div
              key="stack"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {result.techStack && Object.entries(result.techStack).map(([key, value]) => (
                <div key={key}>
                  <p className="text-[10px] font-display tracking-[0.15em] uppercase text-jarvis-muted mb-1">
                    {key}
                  </p>
                  <p className="text-sm text-jarvis-white/80 font-mono">{value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
