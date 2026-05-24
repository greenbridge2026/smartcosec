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
        staff: resolve(__dirname, 'staff/dashboard.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        onboarding: resolve(__dirname, 'onboarding.html'),
        signin: resolve(__dirname, 'signin.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://globalisor-77d7da9fe8c7.herokuapp.com',
        changeOrigin: true,
      },
    },
  },
});
