import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  // System state
  systemStatus: 'idle', // idle | listening | processing | building | error
  statusMessage: 'Sistema listo. Diga "JARVIS" para comenzar.',

  // Voice state
  isListening: false,
  transcript: '',
  interimTranscript: '',

  // Command state
  lastCommand: null,
  commandHistory: [],

  // Task queue
  tasks: [],
  activeTaskId: null,
  selectedTaskId: null,

  // Hermes connection
  hermesConnected: false,

  // Event log
  events: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SYSTEM_STATUS':
      return { ...state, systemStatus: action.status, statusMessage: action.message };

    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };

    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.final || state.transcript, interimTranscript: action.interim || '' };

    case 'APPEND_TRANSCRIPT':
      return { ...state, transcript: state.transcript + ' ' + action.payload };

    case 'CLEAR_TRANSCRIPT':
      return { ...state, transcript: '', interimTranscript: '' };

    case 'DETECT_COMMAND':
      return {
        ...state,
        lastCommand: action.payload,
        commandHistory: [action.payload, ...state.commandHistory].slice(0, 50),
      };

    case 'ADD_TASK':
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
        activeTaskId: action.payload.id,
      };

    case 'UPDATE_TASK': {
      const updatedTasks = state.tasks.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload } : t
      );
      return { ...state, tasks: updatedTasks };
    }

    case 'SELECT_TASK':
      return { ...state, selectedTaskId: action.payload };

    case 'SET_HERMES_CONNECTED':
      return { ...state, hermesConnected: action.payload };

    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload].slice(-100) };

    case 'CLEAR_EVENTS':
      return { ...state, events: [] };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setSystemStatus = useCallback((status, message) => {
    dispatch({ type: 'SET_SYSTEM_STATUS', status, message });
  }, []);

  const setListening = useCallback((payload) => {
    dispatch({ type: 'SET_LISTENING', payload });
  }, []);

  const setTranscript = useCallback((final, interim) => {
    dispatch({ type: 'SET_TRANSCRIPT', final, interim });
  }, []);

  const clearTranscript = useCallback(() => {
    dispatch({ type: 'CLEAR_TRANSCRIPT' });
  }, []);

  const addTask = useCallback((task) => {
    dispatch({ type: 'ADD_TASK', payload: task });
  }, []);

  const updateTask = useCallback((task) => {
    dispatch({ type: 'UPDATE_TASK', payload: task });
  }, []);

  const selectTask = useCallback((taskId) => {
    dispatch({ type: 'SELECT_TASK', payload: taskId });
  }, []);

  const value = {
    state,
    dispatch,
    setSystemStatus,
    setListening,
    setTranscript,
    clearTranscript,
    addTask,
    updateTask,
    selectTask,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
