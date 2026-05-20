/**
 * TaskQueue — In-memory task queue with SSE event emission
 *
 * Features:
 * - Priority-based enqueue
 * - Status tracking (queued → processing → completed/failed)
 * - Progress updates
 * - SSE subscribers for real-time UI updates
 * - Concurrent processing (configurable)
 */

export default class TaskQueue {
  constructor(concurrency = 3) {
    this.tasks = new Map();
    this.queue = [];
    this.processing = new Set();
    this.subscribers = new Set();
    this.concurrency = concurrency;
    this.processor = null;
  }

  /**
   * Add a task to the queue
   */
  enqueue(task) {
    this.tasks.set(task.id, { ...task, status: 'queued', progress: 0 });
    this.queue.push(task.id);
    this._emit({ type: 'task:queued', task: this.tasks.get(task.id) });
    // Trigger processing if processor is set
    if (this.processor) {
      this._processNext();
    }
    return this.tasks.get(task.id);
  }

  /**
   * Get a task by ID
   */
  getTask(id) {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks sorted by creation time (newest first)
   */
  getAllTasks() {
    return Array.from(this.tasks.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Update a task's fields and emit event
   */
  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) return;

    Object.assign(task, updates);
    this.tasks.set(id, task);

    this._emit({
      type: `task:${updates.status || 'updated'}`,
      task: { ...task },
    });

    // On completion, remove from processing set
    if (updates.status === 'completed' || updates.status === 'failed') {
      this.processing.delete(id);
      this._processNext();
    }
  }

  /**
   * Get queue size (pending tasks)
   */
  size() {
    return this.queue.length;
  }

  /**
   * Start the queue processor with a handler function
   */
  startProcessing(handler) {
    this.processor = handler;
    this._processNext();
  }

  /**
   * Process next batch of tasks from the queue
   */
  async _processNext() {
    while (this.processing.size < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      const task = this.tasks.get(taskId);

      if (!task) continue;

      this.processing.add(taskId);
      this.updateTask(taskId, { status: 'processing' });

      // Fire and forget — processor handles updates
      this.processor(task).catch((err) => {
        console.error(`[QUEUE] Unhandled error for task ${taskId}:`, err);
        this.updateTask(taskId, { status: 'failed', error: err.message });
      });
    }
  }

  /**
   * Subscribe to queue events (SSE)
   * Returns an unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Emit event to all subscribers
   */
  _emit(event) {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error('[QUEUE] Subscriber error:', err);
      }
    }
  }
}
