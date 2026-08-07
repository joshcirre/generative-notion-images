import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `npm start` serves this directory on Laravel Cloud.
  build: { outDir: 'public' },
  server: { host: '127.0.0.1', port: 5180 },
})
