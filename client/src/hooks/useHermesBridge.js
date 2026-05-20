import { useEffect, useCallback, useRef } from 'react';
import hermesClient from '../utils/hermesClient';
import { useApp } from '../context/AppContext';

/**
 * useHermesBridge — connects the frontend to the Hermes API bridge
 *
 * Handles:
 * - Sending commands to /hermes/execute
 * - Real-time task updates via SSE
 * - Task status polling (fallback if SSE unavailable)
 * - Connection state management
 */
export default function useHermesBridge() {
  const { addTask, updateTask, setSystemStatus, state } = useApp();
  const sseUnsubscribeRef = useRef(null);
  const pollingRef = useRef(null);

  // Subscribe to SSE for real-time updates
  useEffect(() => {
    try {
      sseUnsubscribeRef.current = hermesClient.subscribeToStream((event) => {
        if (event.task) {
          updateTask(event.task);

          // Update system status based on task state
          if (event.task.status === 'processing') {
            setSystemStatus('building', 'Construyendo proyecto...');
          } else if (event.task.status === 'completed') {
            setSystemStatus('idle', 'Proyecto completado. Listo para siguiente comando.');
          }
        }
      });
    } catch (err) {
      console.warn('[HermesBridge] SSE unavailable, falling back to polling');
      // Fallback: poll active tasks every 2 seconds
      startPolling();
    }

    return () => {
      if (sseUnsubscribeRef.current) sseUnsubscribeRef.current();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [updateTask, setSystemStatus]);

  const startPolling = useCallback(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const tasks = await hermesClient.getAllTasks();
        for (const task of tasks) {
          updateTask(task);
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 2000);
  }, [updateTask]);

  /**
   * Send a command to Hermes for processing
   */
  const sendCommand = useCallback(async (commandData) => {
    try {
      setSystemStatus('processing', 'Enviando comando a Hermes Product Factory...');

      const result = await hermesClient.execute(commandData.prompt, 'auto');

      // Add task to local state immediately
      addTask({
        id: result.taskId,
        prompt: commandData.prompt,
        type: commandData.type,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
      });

      setSystemStatus('building', `Comando encolado. ${result.message}`);

      return result;
    } catch (err) {
      console.error('[HermesBridge] Error sending command:', err);
      setSystemStatus('error', 'Error de conexión con Hermes. Reintentando...');
      throw err;
    }
  }, [addTask, setSystemStatus]);

  /**
   * Check connection health
   */
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/health');
      if (res.ok) {
        setSystemStatus('idle', 'Sistema conectado. Di "JARVIS" para comenzar.');
        return true;
      }
    } catch {
      // Server not available
    }
    return false;
  }, [setSystemStatus]);

  return { sendCommand, checkHealth };
}
