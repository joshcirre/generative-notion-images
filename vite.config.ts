import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Source assets live outside the build target so Vite can safely replace
  // `public/` during production builds.
  publicDir: 'static',
  // `npm start` serves this directory on Laravel Cloud.
  build: { outDir: 'public' },
  server: { host: '127.0.0.1', port: 5180 },
})
