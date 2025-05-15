import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const functionsBaseUrl = "https://us-central1-qa-engineer-town.cloudfunctions.net"; // Your deployed function base URL

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Optional: Add aliases for cleaner imports if needed
      // "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Allow connections from any host
    port: 3022,
    // Optional: Configure allowedHosts if running behind a specific proxy/domain in dev
    // allowedHosts: ['qa.roytown.net'],
    proxy: {
      '/api/scan': {
        target: functionsBaseUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/scan/, '/apiScan'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[vite proxy] Sending request ${req.method} ${req.url} to target ${functionsBaseUrl}${proxyReq.path}`);
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('[vite proxy] Proxy error:', err);
          });
        },
      },
    }
  }
})
