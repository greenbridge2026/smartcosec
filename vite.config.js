import { defineConfig } from 'vite';
import { resolve } from 'path';

function cleanUrls() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Only append .html to paths without extensions that aren't the root
        if (!req.url.includes('.') && req.url !== '/' && !req.url.startsWith('/api/')) {
          req.url += '.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [cleanUrls()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        login: resolve(__dirname, 'login.html'),
        requirements: resolve(__dirname, 'requirements.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api/auth': 'http://localhost:8080',
      '/api/requirements': 'http://localhost:8080',
      '/api/dashboard': 'http://localhost:8080',
      '/api/clients': 'http://localhost:8080',
      '/api/services': 'http://localhost:8080',
      '/api': 'http://localhost:3000',
    },
  },
});
