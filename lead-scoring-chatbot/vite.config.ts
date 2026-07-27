import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.CHATBOX_BASE || '/'
const outDir = process.env.CHATBOX_OUT || 'dist'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir,
    emptyOutDir: true,
  },
})
