import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // listen on 0.0.0.0
    port: 5173,
    proxy: {
      "/api": {
        target: "https://74b6651db45d.ngrok-free.app",
        changeOrigin: true,
      },
    },
  },
})
