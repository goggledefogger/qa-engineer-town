import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Optional: Add aliases for cleaner imports if needed
      // "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Allow connections from any host
    port: 3020, // Use port 3020
    // Optional: Configure allowedHosts if running behind a specific proxy/domain in dev
    // allowedHosts: ['qa.roytown.net'],
    // Optional: Proxy API requests to Firebase Emulator or deployed functions
    // proxy: {
    //   '/api': {
    //     target: 'http://127.0.0.1:5001/your-firebase-project-id/us-central1',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //   },
    // },
  }
})
