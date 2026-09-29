import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.GRAPH_API_TARGET || 'http://127.0.0.1:8000';

// Dev-only convenience: point the SPA at the FastAPI graph endpoints without
// needing CORS. Production deployments should serve the API same-origin.
const proxy = {
  '/api/v1/graph/stream': { target: apiTarget, changeOrigin: true, ws: true },
  '/api': { target: apiTarget, changeOrigin: true },
  '/ready': { target: apiTarget, changeOrigin: true },
  '/health': { target: apiTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false, proxy },
  preview: { port: 4173, strictPort: false, proxy },
});
