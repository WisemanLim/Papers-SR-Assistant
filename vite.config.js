import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Semantic Scholar API proxy — the API's error responses (e.g. 429) lack CORS
// headers, so browser-direct calls fail unpredictably; proxying avoids CORS entirely.
const s2Proxy = {
  '/s2api': {
    target: 'https://api.semanticscholar.org',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/s2api/, ''),
  },
  // Local Ollama LLM (Gemini fallback) — same-origin via proxy
  '/ollama': {
    target: 'http://localhost:11434',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ollama/, ''),
  },
  // arXiv PDF fetch for the in-app viewer — arxiv.org sends no CORS headers
  '/arxiv': {
    target: 'https://arxiv.org',
    changeOrigin: true,
    followRedirects: true,
    rewrite: (path) => path.replace(/^\/arxiv/, ''),
  },
  // Real-time collaboration WebSocket server (node server/collab-server.mjs)
  '/collab': {
    target: 'http://localhost:8787',
    ws: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: s2Proxy },
  preview: { proxy: s2Proxy },
})
