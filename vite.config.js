import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served under /melodic-minor on the unified domain (Vercel multi-zone).
  base: '/melodic-minor/',
  plugins: [react()],
})
