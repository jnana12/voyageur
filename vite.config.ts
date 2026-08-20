import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER === '1';

  return {
    server: {
      host: '0.0.0.0',
      proxy: isVercel ? {} : {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/tomtom': {
          target: 'https://api.tomtom.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tomtom/, ''),
          secure: false,
        }
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      }
    },
    plugins: [react()],
    build: {
      target: 'es2022'
    },
    esbuild: {
      target: 'es2022'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
