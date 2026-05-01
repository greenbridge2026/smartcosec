import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = './db.json';

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ clients: [], services: [] }));
}

const getDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
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

app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
});
