/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The Express server (server/index.ts, run via `npm run server`) holds the
      // Anthropic API key and does the AI deep scan — never call it directly from
      // the browser with a key baked into the frontend bundle.
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
