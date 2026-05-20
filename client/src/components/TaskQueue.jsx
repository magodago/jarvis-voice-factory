import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Clock, CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react';

/**
 * TaskQueue — displays the pipeline of active and completed tasks
 *
 * Shows tasks in real-time as they flow through:
 * queued → processing → completed/failed
 */
export default function TaskQueue({ tasks, onSelectTask, selectedTaskId }) {
  const activeTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'processing');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'failed');

  if (tasks.length === 0) {
    return (
      <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-4">
        <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
          Task Pipeline
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-jarvis-muted/40">
          <Layers size={32} className="mb-3" />
          <p className="text-sm font-body">No tasks in pipeline</p>
          <p className="text-xs font-body mt-1">Voice commands will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jarvis-panel/80 backdrop-blur-xl rounded-2xl border border-jarvis-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[0.2em] uppercase text-jarvis-muted">
          Task Pipeline
        </h3>
        <span className="text-[10px] font-mono text-jarvis-cyan">{tasks.length} total</span>
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-display tracking-[0.15em] uppercase text-jarvis-amber/60">
            Active — {activeTasks.length}
          </p>
          <AnimatePresence>
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onClick={() => onSelectTask(task.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Recent tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-display tracking-[0.15em] uppercase text-jarvis-muted/60">
            Recent — {completedTasks.length}
          </p>
          <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
            {completedTasks.slice(0, 10).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onClick={() => onSelectTask(task.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, isSelected, onClick, compact = false }) {
  const statusIcons = {
    queued: Clock,
    processing: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
  };

  const statusColors = {
    queued: 'text-jarvis-muted border-jarvis-muted/20',
    processing: 'text-jarvis-amber border-jarvis-amber/20',
    completed: 'text-jarvis-green border-jarvis-green/20',
    failed: 'text-jarvis-red border-jarvis-red/20',
  };

  const Icon = statusIcons[task.status] || Clock;
  const colorClass = statusColors[task.status] || '';

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`
        w-full text-left rounded-xl border p-3 transition-all duration-300
        ${colorClass}
        ${isSelected ? 'bg-jarvis-cyan/5 border-jarvis-cyan/30' : 'bg-jarvis-bg/40 hover:bg-jarvis-bg/60'}
      `}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={compact ? 14 : 16}
          className={`shrink-0 ${task.status === 'processing' ? 'animate-spin' : ''}`}
        />

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-body truncate ${task.status === 'completed' ? 'text-jarvis-white' : 'text-jarvis-white/80'}`}>
            {task.prompt}
          </p>
          {!compact && task.status === 'processing' && (
            <div className="mt-2">
              <div className="h-1 bg-jarvis-border/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-jarvis-amber/60 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress || 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-jarvis-muted mt-1 font-mono">
                {task.progress || 0}% — {task.statusDetail || task.status}
              </p>
            </div>
          )}
          {compact && (
            <p className="text-[10px] text-jarvis-muted mt-0.5 font-mono">
              {task.status}
            </p>
          )}
        </div>

        <ChevronRight size={14} className="text-jarvis-muted/40 shrink-0" />
      </div>
    </motion.button>
  );
}
