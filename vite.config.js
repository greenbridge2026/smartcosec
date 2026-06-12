import { defineConfig } from 'vite';
import { resolve } from 'path';

function cleanUrls() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/client' || url.pathname === '/client/') {
          res.writeHead(302, { Location: '/client/portal.html?tab=home' });
          res.end();
          return;
        }
        if (url.pathname === '/admin' || url.pathname === '/admin/') {
          req.url = '/admin/index.html';
        } else if (url.pathname === '/staff' || url.pathname === '/staff/') {
          req.url = '/staff/index.html';
        }
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
        adminLogin: resolve(__dirname, 'admin/index.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminApplications: resolve(__dirname, 'admin/applications.html'),
        adminBlogs: resolve(__dirname, 'admin/blogs.html'),
        adminCompliance: resolve(__dirname, 'admin/compliance.html'),
        adminContent: resolve(__dirname, 'admin/content.html'),
        adminCountries: resolve(__dirname, 'admin/countries.html'),
        adminKyc: resolve(__dirname, 'admin/kyc.html'),
        adminMessages: resolve(__dirname, 'admin/messages.html'),
        adminPackages: resolve(__dirname, 'admin/packages.html'),
        adminReports: resolve(__dirname, 'admin/reports.html'),
        adminUsers: resolve(__dirname, 'admin/users.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        onboarding: resolve(__dirname, 'onboarding.html'),
        signin: resolve(__dirname, 'signin.html'),
        portal: resolve(__dirname, 'client/portal.html'),
        messages: resolve(__dirname, 'client/messages.html'),
        staffLogin: resolve(__dirname, 'staff/index.html'),
        blogs: resolve(__dirname, 'blogs.html'),
        chooseService: resolve(__dirname, 'choose-service.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
