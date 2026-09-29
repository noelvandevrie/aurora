import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
const coreUrl = process.env.VITE_CORE_URL || 'http://localhost:3000';

// The public info page polls core only, same origin: the dev server (or the
// production nginx) proxies /api to core, so the browser never needs CORS.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8082,
    // Mirrors docker/nginx.conf: only the two public endpoints reach core, and
    // the visitor address is passed as X-Real-IP (overwritten, not appended).
    proxy: {
      '^/api/public/info/(room-status|pc-usage)$': {
        target: coreUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.removeHeader('x-forwarded-for');
            proxyReq.setHeader('x-real-ip', req.socket.remoteAddress ?? '');
          });
        },
      },
    },
  },
  build: {
    outDir: './dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      },
    },
    chunkSizeWarningLimit: 750,
  },
  publicDir: './public',
});
