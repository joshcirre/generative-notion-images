import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Laravel Cloud serves `public/` as the document root, so the build lands
  // there. `static/` holds the files copied in verbatim (index.php), which
  // keeps them clear of the directory Vite empties on each build.
  publicDir: 'static',
  build: { outDir: 'public' },
  server: { host: '127.0.0.1', port: 5180 },
})
