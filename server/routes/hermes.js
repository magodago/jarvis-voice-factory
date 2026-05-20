import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASKS_DIR = join(__dirname, '..', 'tasks');

// Ensure tasks directory exists
try { mkdirSync(TASKS_DIR, { recursive: true }); } catch {}

const router = Router();

/**
 * POST /hermes/execute
 * Creates a task file for Agente NEO to process
 */
router.post('/execute', (req, res) => {
  const { prompt, mode = 'auto' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'INVALID_PROMPT', message: 'Se requiere "prompt" de tipo string.' });
  }

  const taskId = uuidv4();
  const task = {
    id: taskId,
    prompt,
    mode,
    status: 'pending',
    createdAt: new Date().toISOString(),
    progress: 0,
    statusDetail: 'Enviada a Agente NEO...',
  };

  // Write task to disk for NEO to pick up
  writeFileSync(join(TASKS_DIR, `${taskId}.json`), JSON.stringify(task, null, 2));

  console.log(`[TASK] Created: ${taskId} — "${prompt.substring(0, 80)}..."`);

  res.json({
    taskId,
    status: 'pending',
    message: 'Comando recibido. Agente NEO lo procesará.',
  });
});

/**
 * GET /hermes/task/:taskId
 * Reads task status from disk (updated by NEO)
 */
router.get('/task/:taskId', (req, res) => {
  const taskPath = join(TASKS_DIR, `${req.params.taskId}.json`);
  if (!existsSync(taskPath)) {
    return res.status(404).json({ error: 'TASK_NOT_FOUND', message: 'Tarea no encontrada.' });
  }
  try {
    const task = JSON.parse(readFileSync(taskPath, 'utf-8'));
    res.json({ task });
  } catch {
    res.status(500).json({ error: 'TASK_READ_ERROR' });
  }
});

/**
 * GET /hermes/tasks
 * List all tasks
 */
router.get('/tasks', (_, res) => {
  try {
    const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json'));
    const tasks = files.map(f => {
      try { return JSON.parse(readFileSync(join(TASKS_DIR, f), 'utf-8')); } catch { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ tasks, count: tasks.length });
  } catch {
    res.json({ tasks: [], count: 0 });
  }
});

/**
 * POST /hermes/task/:taskId/update (internal — used by NEO)
 * Updates task status and result
 */
router.post('/task/:taskId/update', (req, res) => {
  const taskPath = join(TASKS_DIR, `${req.params.taskId}.json`);
  if (!existsSync(taskPath)) {
    return res.status(404).json({ error: 'TASK_NOT_FOUND' });
  }
  try {
    const task = JSON.parse(readFileSync(taskPath, 'utf-8'));
    Object.assign(task, req.body, { updatedAt: new Date().toISOString() });
    writeFileSync(taskPath, JSON.stringify(task, null, 2));

    // Emit SSE event
    if (req.app.get('taskSubscribers')) {
      for (const sub of req.app.get('taskSubscribers')) {
        try { sub({ type: 'task:updated', task }); } catch {}
      }
    }

    res.json({ task });
  } catch (e) {
    res.status(500).json({ error: 'TASK_UPDATE_ERROR', message: e.message });
  }
});

// SSE stream for real-time task updates
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  if (!req.app.get('taskSubscribers')) {
    req.app.set('taskSubscribers', []);
  }

  const callback = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  req.app.get('taskSubscribers').push(callback);

  req.on('close', () => {
    const subs = req.app.get('taskSubscribers') || [];
    req.app.set('taskSubscribers', subs.filter(s => s !== callback));
  });
});

export default router;
