import axios from 'axios';

const API_BASE = '/hermes';

/**
 * Hermes API Client — bridges voice commands to the Hermes Product Factory
 */
const hermesClient = {
  /**
   * Execute a product creation command
   * @param {string} prompt - The project description
   * @param {string} mode - Execution mode (auto, manual, interactive)
   * @returns {Promise<{taskId: string, status: string}>}
   */
  async execute(prompt, mode = 'auto') {
    const { data } = await axios.post(`${API_BASE}/execute`, {
      prompt,
      mode,
      priority: 0,
    });
    return data;
  },

  /**
   * Check task status
   * @param {string} taskId
   * @returns {Promise<object>}
   */
  async getTask(taskId) {
    const { data } = await axios.get(`${API_BASE}/task/${taskId}`);
    return data.task;
  },

  /**
   * Get all tasks
   * @returns {Promise<Array>}
   */
  async getAllTasks() {
    const { data } = await axios.get(`${API_BASE}/tasks`);
    return data.tasks;
  },

  /**
   * Subscribe to real-time task updates via SSE
   * @param {function} onEvent - Callback for each SSE event
   * @returns {function} Unsubscribe function
   */
  subscribeToStream(onEvent) {
    const eventSource = new EventSource(`${API_BASE}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  },
};

export default hermesClient;
