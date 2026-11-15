import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // In development, proxy all /api/* calls to the Express backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Suppress the 500 kB advisory (recharts + lodash are unavoidably large)
    chunkSizeWarningLimit: 800,
    sourcemap: false,

    rollupOptions: {
      output: {
        // Split vendor bundles for better browser caching
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-axios':    ['axios'],
        },
      },
    },
  },

  // Ensure VITE_ env vars are picked up in production
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
});
