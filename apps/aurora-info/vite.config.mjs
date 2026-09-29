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
    proxy: {
      '/api': {
        target: coreUrl,
        changeOrigin: true,
        secure: false,
        // Append the visitor's (campus) IP as X-Forwarded-For so the core can
        // apply the legacy 131.155.* rule for the "Currently playing" string.
        xfwd: true,
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
