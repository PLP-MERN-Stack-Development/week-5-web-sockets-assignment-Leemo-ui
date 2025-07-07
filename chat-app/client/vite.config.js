import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Explicitly set client port
    strictPort: true, // Don't try other ports if 5173 is taken
    proxy: {
      // Proxy WebSocket requests to your backend
      '/socket.io': {
        target: 'ws://localhost:5175',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      // Proxy API requests if needed
      '/api': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // Helpful for debugging
    chunkSizeWarningLimit: 1000 // Adjust based on your needs
  },
  preview: {
    port: 5173, // Match dev server port
    strictPort: true
  },
  optimizeDeps: {
    include: ['socket.io-client'], // Ensure WebSocket client is optimized
    exclude: [] // Add any problematic dependencies here
  }
});