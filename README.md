# JARVIS — Voice Controlled AI Factory

> *"At your service, sir."* — Speak. Build. Deploy.

A futuristic voice-controlled web application that lets you create software projects just by speaking. Built with a premium J.A.R.V.I.S. / Iron Man aesthetic.

---

## How It Works

1. **Speak** into your microphone
2. JARVIS **listens** continuously via Web Speech API
3. The **Intent Detector** identifies product creation commands
4. Commands are sent to the **Hermes Product Factory** via API bridge
5. Projects are **generated in parallel** while you keep talking
6. Results appear in the **Project Viewer** in real-time

### Example Commands

- "Crea una web de portafolio con React"
- "Haz un SaaS de gestión de tareas"
- "Construye una tienda online de café"
- "Genera un juego de naves espaciales"
- "Crea una automatización para enviar emails diarios"

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS 3 + Framer Motion |
| Voice | Web Speech API (SpeechRecognition) |
| Backend | Express.js |
| Task Queue | In-memory with SSE streaming |
| Fonts | Orbitron (display) + Inter (body) + JetBrains Mono (code) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Chrome or Edge (for Web Speech API)
- Microphone access

### Install & Run

```bash
# 1. Clone the project
cd jarvis-voice-factory

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install

# 4. Start the server (terminal 1)
cd ../server
npm run dev
# → Server running on http://localhost:4000

# 5. Start the client (terminal 2)
cd ../client
npm run dev
# → Client running on http://localhost:3000
```

### One-Command Start

```bash
# From project root:
(cd server && npm install && npm run dev &) && (cd client && npm install && npm run dev)
```

---

## Usage

1. Open **http://localhost:3000** in Chrome/Edge
2. Click the **central orb** or press **SPACE** to activate the microphone
3. Allow microphone access when prompted
4. Speak a command like: *"Crea una web de restaurante con React"*
5. Watch the orb pulse, the task queue fill, and your project appear!

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `SPACE` | Toggle microphone on/off |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    BROWSER (React SPA)                │
│                                                       │
│  ┌───────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │ Voice     │──→│ Intent       │──→│ Hermes      │ │
│  │ Capture   │   │ Detector     │   │ Bridge      │ │
│  │ (Web STT) │   │ (Keywords +  │   │ (REST/SSE)  │ │
│  │           │   │  Patterns)   │   │             │ │
│  └───────────┘   └──────────────┘   └──────┬──────┘ │
│                                             │        │
│                                    POST /hermes/     │
│                                    execute          │
│                                             │        │
│  ┌───────────┐   ┌──────────────┐   ┌──────▼──────┐ │
│  │ JARVIS    │   │ Task         │   │ Express     │ │
│  │ Orb UI    │   │ Queue        │   │ API Server  │ │
│  │ (Animated)│   │ (SSE Stream) │   │ (Bridge)    │ │
│  └───────────┘   └──────────────┘   └──────┬──────┘ │
│                                             │        │
│  ┌───────────┐   ┌──────────────┐           │        │
│  │ Status    │   │ Project      │           │        │
│  │ Panel     │   │ Viewer       │           │        │
│  └───────────┘   └──────────────┘           │        │
└──────────────────────────────────────┬──────┘        │
                                       │               │
                              ┌────────▼──────────┐    │
                              │ Hermes Agent       │    │
                              │ Product Factory    │    │
                              └───────────────────┘    │
```

---

## API Reference

### `POST /hermes/execute`
Send a command to the Hermes Product Factory.

**Request:**
```json
{
  "prompt": "Crea una web de restaurante con React y Tailwind",
  "mode": "auto",
  "priority": 0
}
```

**Response:**
```json
{
  "taskId": "uuid-here",
  "status": "queued",
  "message": "Comando recibido. Procesando en cola de tareas...",
  "queuePosition": 1
}
```

### `GET /hermes/task/:taskId`
Check task status and get results.

### `GET /hermes/stream`
SSE endpoint for real-time task updates.

### `GET /health`
Server health check.

---

## File Structure

```
jarvis-voice-factory/
├── client/
│   ├── public/
│   │   └── favicon.svg                 # Animated JARVIS orb favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── JarvisOrb.jsx           # Central holographic orb (animated)
│   │   │   ├── VoiceCapture.jsx        # Mic control + transcript panel
│   │   │   ├── StatusPanel.jsx         # System status dashboard
│   │   │   ├── TaskQueue.jsx           # Task pipeline with progress bars
│   │   │   ├── CommandLog.jsx          # Voice command history
│   │   │   ├── ProjectViewer.jsx       # Generated project display
│   │   │   ├── Header.jsx              # Top bar with branding
│   │   │   └── HolographicGrid.jsx     # Animated sci-fi background
│   │   ├── hooks/
│   │   │   ├── useVoiceCapture.js      # Web Speech API hook
│   │   │   ├── useIntentDetector.js    # Command detection hook
│   │   │   └── useHermesBridge.js      # API bridge hook
│   │   ├── utils/
│   │   │   ├── intentDetector.js       # Intent detection engine
│   │   │   └── hermesClient.js         # API client + SSE
│   │   ├── context/
│   │   │   └── AppContext.jsx          # Global state (useReducer)
│   │   ├── App.jsx                     # Main application
│   │   ├── index.css                   # JARVIS OS styles
│   │   └── main.jsx                    # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── server/
│   ├── routes/
│   │   └── hermes.js                   # /hermes/execute endpoint + processor
│   ├── services/
│   │   └── queue.js                    # In-memory task queue with SSE
│   ├── index.js                        # Express server
│   └── package.json
├── .env.example
└── README.md
```

---

## Integration with Hermes Agent

When Hermes Agent is running, the server bridges voice commands to the Product Factory:

1. User says "Crea un SaaS de..."
2. Frontend sends `POST /hermes/execute { prompt }`
3. Server processes the task (currently simulated — ready for real Hermes API)
4. SSE streams progress back to the frontend
5. Project result is displayed in the viewer

To connect the real Hermes Agent, edit `server/routes/hermes.js` and replace
`simulateHermesProcessing()` with a call to the actual Hermes Agent API.

---

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Web Speech API | ✅ Full | ✅ Full | ⚠️ Limited | ✅ 14.1+ |
| Framer Motion | ✅ | ✅ | ✅ | ✅ |
| CSS Backdrop Filter | ✅ | ✅ | ✅ | ✅ |

**Recommended:** Chrome or Edge for best voice recognition accuracy.

---

## License

MIT — Built with the Hermes Product Factory.

---

*"Sometimes you gotta run before you can walk."* — Tony Stark
