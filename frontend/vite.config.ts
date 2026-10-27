import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API runs on :8000. In production the app and API share one domain.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
