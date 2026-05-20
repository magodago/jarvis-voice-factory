/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#080013',
          panel: '#0d0020',
          border: '#1a0040',
          white: '#e8e0ff',
          muted: '#6b5b8a',
          magenta: '#ff15d0',
          'magenta-bright': '#ff40f0',
          purple: '#7b00ff',
          cyan: '#00d4ff',
          'cyan-bright': '#40f0ff',
          amber: '#ffb347',
          green: '#00ff88',
          red: '#ff4466',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'heartbeat': 'heartbeat 1.2s ease-in-out infinite',
        'cyber-pulse': 'cyberPulse 2s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 10px rgba(255,21,208,0.3), 0 0 20px rgba(255,21,208,0.15)' },
          '15%': { transform: 'scale(1.08)', boxShadow: '0 0 25px rgba(255,21,208,0.6), 0 0 50px rgba(255,21,208,0.3)' },
          '30%': { transform: 'scale(1)', boxShadow: '0 0 10px rgba(255,21,208,0.3), 0 0 20px rgba(255,21,208,0.15)' },
        },
        cyberPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,21,208,0.2), 0 0 40px rgba(255,21,208,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(255,21,208,0.5), 0 0 80px rgba(255,21,208,0.25)' },
        },
      },
    },
  },
  plugins: [],
};
