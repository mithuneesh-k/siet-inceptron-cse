import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ✅ Fixed: Remove proxy to allow Vite to serve frontend properly
    // The backend will still serve API endpoints via /api paths
    cors: true
  }
})
