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

export default defineConfig(({ mode }) => {
  const isMock = mode === 'mock';
  const apiTarget = isMock ? 'http://localhost:8081' : 'http://localhost:8080';

  return {
    plugins: [cleanUrls()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          auth: resolve(__dirname, 'auth.html'),
          login: resolve(__dirname, 'login.html'),
          requirements: resolve(__dirname, 'requirements.html'),
          requirementsForeigner: resolve(__dirname, 'requirements-foreigner.html'),
          staff: resolve(__dirname, 'staff/dashboard.html'),
          adminLogin: resolve(__dirname, 'admin/index.html'),
          adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
          adminSidebar: resolve(__dirname, 'admin/admin-sidebar.js'),
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
          adminSsic: resolve(__dirname, 'admin/ssic.html'),
          adminOnboardingManager: resolve(__dirname, 'admin/onboarding-manager.html'),
          adminOnboarding: resolve(__dirname, 'admin/onboarding.html'),
          adminVault: resolve(__dirname, 'admin/vault.html'),
          adminOcrReview: resolve(__dirname, 'admin/ocr-review.html'),
          adminMigration: resolve(__dirname, 'admin/migration.html'),
          adminCompanyDetail: resolve(__dirname, 'admin/company-detail.html'),
          adminDocumentViewer: resolve(__dirname, 'admin/document-viewer.html'),
          pricing: resolve(__dirname, 'pricing.html'),
          onboarding: resolve(__dirname, 'onboarding.html'),
          signin: resolve(__dirname, 'signin.html'),
          portal: resolve(__dirname, 'client/portal.html'),
          messages: resolve(__dirname, 'client/messages.html'),
          staffLogin: resolve(__dirname, 'staff/index.html'),
          blogs: resolve(__dirname, 'blogs.html'),
          chooseService: resolve(__dirname, 'choose-service.html'),
          adminStaffIdCards: resolve(__dirname, 'admin/staff-id-cards.html'),
          adminAttendance: resolve(__dirname, 'admin/attendance.html'),
          verifyStaff: resolve(__dirname, 'verify-staff.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
