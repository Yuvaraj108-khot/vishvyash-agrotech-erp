import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env for current mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  // Dev proxy target: VITE_API_URL if explicitly set in .env, else local server
  // - For office server dev:    set VITE_API_URL= (empty) → proxies to localhost:4000
  // - For Render testing:       set VITE_API_URL=https://vishvyash-agrotech-erp.onrender.com
  const devProxyTarget = env.VITE_API_URL || 'http://localhost:4000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: devProxyTarget.startsWith('https'),
        },
        '/pdfs': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: devProxyTarget.startsWith('https'),
        },
      },
    },
    build: {
      outDir: 'dist',
      // Warn if any chunk is > 1MB
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor libraries for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
