import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { fallbackContent } from './src/lib/content.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: mode === 'demo' ? 'node_modules/.vite-demo' : 'node_modules/.vite',
  plugins: [react(), ...(mode === 'demo' ? [{
    name: 'local-demo-content',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { language = 'en', ...options } = JSON.parse(body || '{}');
            const content = fallbackContent(req.url.split('?')[0], language, Math.random, options);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...content, fallback: true }));
          } catch { res.statusCode = 400; res.end('{}'); }
        });
      });
    },
  }] : [])],
  resolve: mode === 'demo' ? { alias: {
    'firebase/database': fileURLToPath(new URL('./src/demo/database.js', import.meta.url)),
  } } : {},
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))
