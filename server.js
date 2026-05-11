import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');
console.log('Server using DB at:', DB_FILE);

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ clients: [], services: [], kyc: [], compliance: [] }));
}

const getDb = () => {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.kyc) db.kyc = [];
    if (!db.compliance) db.compliance = [];
    if (!db.blogs) db.blogs = [];
    if (!db.notifications) db.notifications = [];
    return db;
};
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// POST /api/clients/request → create submission (find/create client + create service)
app.post('/api/clients/request', (req, res) => {
    const db = getDb();
    if (!db.services) db.services = [];
    
    const payload = req.body;
    let client = db.clients.find(c => c.email === payload.email);
    
    if (!client) {
        client = {
            clientId: 'C-' + (1000 + db.clients.length + 1),
            name: payload.clientName,
            email: payload.email,
            phone: payload.details?.directors?.[0]?.phone || '',
            createdAt: Date.now()
        };
        db.clients.push(client);
    }
    
    const newService = {
        serviceId: 'SRV-' + (5000 + db.services.length + 1),
        clientId: client.clientId,
        serviceType: payload.services || 'Incorporation',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        totalPrice: payload.totalPrice || 'SGD 0',
        details: payload.details,
        companyName: payload.companyName,
        timestamp: Date.now()
    };
    
    db.services.unshift(newService);
    saveDb(db);
    res.status(201).json({ client, service: newService });
});

// GET /api/dashboard → get aggregate dashboard data
app.get('/api/dashboard', (req, res) => {
    const db = getDb();
    if (!db.services) db.services = [];
    
    // Aggregate clients with their service counts
    const clientsWithStats = db.clients.map(c => {
        const clientServices = db.services.filter(s => s.clientId === c.clientId);
        return {
            ...c,
            serviceCount: clientServices.length,
            latestActivity: clientServices.length > 0 ? clientServices[0].date : 'N/A',
            latestStatus: clientServices.length > 0 ? clientServices[0].status : 'N/A',
            companyNames: clientServices.map(s => s.companyName).filter(Boolean)
        };
    }).sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({
        clients: clientsWithStats,
        stats: {
            totalClients: db.clients.length,
            totalServices: db.services.length,
            pending: db.services.filter(s => s.status === 'pending').length,
            approved: db.services.filter(s => s.status === 'approved').length,
            rejected: db.services.filter(s => s.status === 'rejected').length
        }
    });
});

// GET /api/clients/:id/services → get client and all their services
app.get('/api/clients/:id/services', (req, res) => {
    const db = getDb();
    const client = db.clients.find(c => c.clientId === req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const clientServices = db.services.filter(s => s.clientId === req.params.id);
    res.json({ client, services: clientServices });
});

// PATCH /api/services/:id → update status of a service
app.patch('/api/services/:id', (req, res) => {
    const db = getDb();
    const index = db.services.findIndex(s => s.serviceId === req.params.id);
    if (index !== -1) {
        db.services[index] = { ...db.services[index], ...req.body, lastUpdated: Date.now() };
        saveDb(db);
        res.json(db.services[index]);
    } else {
        res.status(404).json({ error: 'Service not found' });
    }
});

// GET /api/applications → get all services with client details
app.get('/api/applications', (req, res) => {
    const db = getDb();
    const apps = db.services.map(s => {
        const client = db.clients.find(c => c.clientId === s.clientId);
        return { ...s, clientName: client ? client.name : 'Unknown' };
    });
    res.json(apps);
});

// GET /api/kyc → get KYC records with client details
app.get('/api/kyc', (req, res) => {
    const db = getDb();
    const kycRecords = db.kyc.map(k => {
        const client = db.clients.find(c => c.clientId === k.clientId);
        return { ...k, clientName: client ? client.name : 'Unknown' };
    });
    res.json(kycRecords);
});

// GET /api/compliance → get compliance records with client details
app.get('/api/compliance', (req, res) => {
    const db = getDb();
    const complianceRecords = db.compliance.map(c => {
        const client = db.clients.find(cl => cl.clientId === c.clientId);
        return { ...c, clientName: client ? client.name : 'Unknown' };
    });
    res.json(complianceRecords);
});

// GET /api/reports → analytics data
app.get('/api/reports', (req, res) => {
    const db = getDb();
    const totalRevenue = db.services
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => {
            const price = parseInt(s.totalPrice.replace(/[^0-9]/g, '')) || 0;
            return sum + price;
        }, 0);

    res.json({
        totalApplications: db.services.length,
        approved: db.services.filter(s => s.status === 'approved').length,
        rejected: db.services.filter(s => s.status === 'rejected').length,
        pendingKYC: db.kyc.filter(k => k.status === 'pending').length,
        revenue: totalRevenue,
        byService: db.services.reduce((acc, s) => {
            acc[s.serviceType] = (acc[s.serviceType] || 0) + 1;
            return acc;
        }, {})
    });
});

// PATCH /api/kyc/:id
app.patch('/api/kyc/:id', (req, res) => {
    const db = getDb();
    const index = db.kyc.findIndex(k => k.kycId === req.params.id);
    if (index !== -1) {
        db.kyc[index] = { ...db.kyc[index], ...req.body, lastUpdated: Date.now() };
        saveDb(db);
        res.json(db.kyc[index]);
    } else {
        res.status(404).json({ error: 'KYC record not found' });
    }
});

// PATCH /api/compliance/:id
app.patch('/api/compliance/:id', (req, res) => {
    const db = getDb();
    const index = db.compliance.findIndex(c => c.complianceId === req.params.id);
    if (index !== -1) {
        db.compliance[index] = { ...db.compliance[index], ...req.body, lastUpdated: Date.now() };
        saveDb(db);
        res.json(db.compliance[index]);
    } else {
        res.status(404).json({ error: 'Compliance record not found' });
    }
});

// --- BLOG ENDPOINTS ---
app.get('/api/blogs', (req, res) => {
    const db = getDb();
    res.json(db.blogs || []);
});

app.post('/api/blogs', (req, res) => {
    const db = getDb();
    const newBlog = {
        id: 'BLG-' + Date.now(),
        ...req.body,
        published: req.body.published !== undefined ? req.body.published : true,
        createdAt: Date.now()
    };
    db.blogs.unshift(newBlog);
    
    // Create notification for all clients if published
    if (newBlog.published) {
        const newNotif = {
            id: 'notif-' + Date.now(),
            clientId: 'all',
            title: 'New update from Globalisor',
            message: `${newBlog.title} has been published.`,
            type: 'blog',
            relatedId: newBlog.id,
            timestamp: Date.now(),
            readBy: []
        };
        db.notifications.unshift(newNotif);
    }
    
    saveDb(db);
    res.status(201).json(newBlog);
});

app.patch('/api/blogs/:id', (req, res) => {
    const db = getDb();
    const index = db.blogs.findIndex(b => b.id === req.params.id);
    if (index !== -1) {
        db.blogs[index] = { ...db.blogs[index], ...req.body, updatedAt: Date.now() };
        saveDb(db);
        res.json(db.blogs[index]);
    } else {
        res.status(404).json({ error: 'Blog not found' });
    }
});

app.delete('/api/blogs/:id', (req, res) => {
    const db = getDb();
    db.blogs = db.blogs.filter(b => b.id !== req.params.id);
    saveDb(db);
    res.status(204).send();
});

// --- NOTIFICATION ENDPOINTS ---
app.get('/api/notifications', (req, res) => {
    const db = getDb();
    const clientId = req.query.clientId;
    let filtered = db.notifications || [];
    if (clientId) {
        filtered = filtered.filter(n => n.clientId === 'all' || n.clientId === clientId);
    }
    res.json(filtered);
});

app.post('/api/notifications/read', (req, res) => {
    const db = getDb();
    const { notifId, clientId } = req.body;
    const index = db.notifications.findIndex(n => n.id === notifId);
    if (index !== -1) {
        if (!db.notifications[index].readBy.includes(clientId)) {
            db.notifications[index].readBy.push(clientId);
            saveDb(db);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Notification not found' });
    }
});

// GET /api/clients/:id/invoices
app.get('/api/clients/:id/invoices', (req, res) => {
    const db = getDb();
    const clientInvoices = (db.invoices || []).filter(i => i.clientId === req.params.id);
    res.json(clientInvoices);
});

// GET /api/catalog
app.get('/api/catalog', (req, res) => {
    const db = getDb();
    res.json(db.catalog || []);
});

app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
});

app.get(/^\/admin(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});
