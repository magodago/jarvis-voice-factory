import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    https: {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    },
    proxy: {
      '/hermes': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/news': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/realtime': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
