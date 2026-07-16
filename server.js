import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8081;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_FILE = path.join(__dirname, 'db.json');
console.log('Server using DB at:', DB_FILE);

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ clients: [], services: [], kyc: [], compliance: [] }));
}

const userPresenceStatus = {};

const getDb = () => {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.kyc) db.kyc = [];
    if (!db.compliance) db.compliance = [];
    if (!db.blogs) db.blogs = [];
    if (!db.notifications) db.notifications = [];
    if (!db.staticContent) db.staticContent = [];
    if (!db.documents) db.documents = [];
    if (!db.messages) db.messages = [];
    if (!db.groups) db.groups = [];
    if (!db.requirements) db.requirements = [];
    if (!db.onboarding) db.onboarding = [];
    if (!db.users) {
        db.users = [
            {
                id: "usr-admin",
                email: "admin@globalisor.com",
                password: "password123",
                firstName: "Admin",
                lastName: "User",
                role: "ADMIN"
            },
            {
                id: "usr-staff",
                email: "staff@globalisor.com",
                password: "password123",
                firstName: "Sarah",
                lastName: "Lim",
                role: "STAFF"
            }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    if (!db.countries) {
        db.countries = [
            { id: "CNTRY-singapore", name: "Singapore", code: "SG", uen: "9-character alphanumeric", tax: "17% (flat rate)", compliance: "99.5%", status: "ACTIVE", basePrice: 1315, priceSecretary: 900, priceDirector: 3000, priceAddress: 600, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], published: true, orderIndex: 0, customPrices: {}, publishedData: { name: "Singapore", code: "SG", uen: "9-character alphanumeric", tax: "17% (flat rate)", compliance: "99.5%", basePrice: 1315, priceSecretary: 900, priceDirector: 3000, priceAddress: 600, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], customPrices: {} } },
            { id: "CNTRY-hong-kong", name: "Hong Kong", code: "HK", uen: "8-digit registration no.", tax: "16.5% (two-tier)", compliance: "98.8%", status: "ACTIVE", basePrice: 1650, priceSecretary: 800, priceDirector: 2500, priceAddress: 500, priceTax: 1200, priceBank: 400, services: ["Company Incorporation", "Corporate Secretary", "Office Address", "Tax & Compliance"], published: true, orderIndex: 1, customPrices: {}, publishedData: { name: "Hong Kong", code: "HK", uen: "8-digit registration no.", tax: "16.5% (two-tier)", compliance: "98.8%", basePrice: 1650, priceSecretary: 800, priceDirector: 2500, priceAddress: 500, priceTax: 1200, priceBank: 400, services: ["Company Incorporation", "Corporate Secretary", "Office Address", "Tax & Compliance"], customPrices: {} } },
            { id: "CNTRY-united-states", name: "United States", code: "USA", uen: "9-digit EIN number", tax: "21% (federal flat)", compliance: "97.2%", status: "ACTIVE", basePrice: 1200, priceSecretary: 1000, priceDirector: 3000, priceAddress: 700, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], published: true, orderIndex: 2, customPrices: {}, publishedData: { name: "United States", code: "USA", uen: "9-digit EIN number", tax: "21% (federal flat)", compliance: "97.2%", basePrice: 1200, priceSecretary: 1000, priceDirector: 3000, priceAddress: 700, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], customPrices: {} } },
            { id: "CNTRY-dubai", name: "Dubai", code: "UAE", uen: "Varies by Free Zone", tax: "9% (above 375k AED)", compliance: "99.1%", status: "ACTIVE", basePrice: 2500, priceSecretary: 1200, priceDirector: 4000, priceAddress: 900, priceTax: 1800, priceBank: 600, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], published: true, orderIndex: 3, customPrices: {}, publishedData: { name: "Dubai", code: "UAE", uen: "Varies by Free Zone", tax: "9% (above 375k AED)", compliance: "99.1%", basePrice: 2500, priceSecretary: 1200, priceDirector: 4000, priceAddress: 900, priceTax: 1800, priceBank: 600, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], customPrices: {} } },
            { id: "CNTRY-australia", name: "Australia", code: "AUS", uen: "9-digit ACN number", tax: "25% - 30%", compliance: "96.8%", status: "ACTIVE", basePrice: 1400, priceSecretary: 950, priceDirector: 3100, priceAddress: 650, priceTax: 1600, priceBank: 550, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], published: true, orderIndex: 4, customPrices: {}, publishedData: { name: "Australia", code: "AUS", uen: "9-digit ACN number", tax: "25% - 30%", compliance: "96.8%", basePrice: 1400, priceSecretary: 950, priceDirector: 3100, priceAddress: 650, priceTax: 1600, priceBank: 550, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], customPrices: {} } },
            { id: "CNTRY-united-kingdom", name: "United Kingdom", code: "UK", uen: "8-digit CRN number", tax: "19% - 25%", compliance: "98.5%", status: "ACTIVE", basePrice: 1300, priceSecretary: 850, priceDirector: 2800, priceAddress: 550, priceTax: 1400, priceBank: 450, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], published: true, orderIndex: 5, customPrices: {}, publishedData: { name: "United Kingdom", code: "UK", uen: "8-digit CRN number", tax: "19% - 25%", compliance: "98.5%", basePrice: 1300, priceSecretary: 850, priceDirector: 2800, priceAddress: 550, priceTax: 1400, priceBank: 450, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"], customPrices: {} } }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    if (!db.ssicActivities) {
        db.ssicActivities = [
            {
                id: "ssic-62011",
                code: "62011",
                name: "Development of software for interactive digital media",
                category: "Information and Communications",
                description: "Development of mobile apps, games, e-commerce platforms and interactive digital products.",
                sectionCode: "J",
                sectionName: "Information and Communications",
                divisionCode: "62",
                divisionName: "Computer programming, consultancy and related activities",
                groupCode: "620",
                groupName: "Computer programming, consultancy and related activities",
                classCode: "6201",
                className: "Computer programming activities",
                keywords: "software, programming, development, app",
                synonyms: "software dev, mobile apps, games",
                abbreviations: "dev, app",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: 0,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now()
            },
            {
                id: "ssic-62021",
                code: "62021",
                name: "Information technology consultancy",
                category: "Information and Communications",
                description: "Consultancy services for computer systems, network designs, and IT systems integration.",
                sectionCode: "J",
                sectionName: "Information and Communications",
                divisionCode: "62",
                divisionName: "Computer programming, consultancy and related activities",
                groupCode: "620",
                groupName: "Computer programming, consultancy and related activities",
                classCode: "6202",
                className: "Computer consultancy activities",
                keywords: "it, consultancy, system integration",
                synonyms: "tech consulting, it support, network design",
                abbreviations: "it, consulting",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: 1,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now()
            },
            {
                id: "ssic-46900",
                code: "46900",
                name: "General wholesale trade (including general importers and exporters)",
                category: "Wholesale Trade",
                description: "Import, export, and wholesale of a wide variety of goods without a dominant product line.",
                sectionCode: "G",
                sectionName: "Wholesale and Retail Trade",
                divisionCode: "46",
                divisionName: "Wholesale trade",
                groupCode: "469",
                groupName: "General wholesale trade",
                classCode: "4690",
                className: "General wholesale trade",
                keywords: "trading, import, export, general trade",
                synonyms: "importer, exporter, wholesale",
                abbreviations: "general, trade",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: 2,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now()
            },
            {
                id: "ssic-70201",
                code: "70201",
                name: "Management consultancy services",
                category: "Professional, Scientific and Technical Activities",
                description: "Providing advisory and operational assistance to businesses on management, strategy, and logistics.",
                sectionCode: "M",
                sectionName: "Professional, Scientific and Technical Activities",
                divisionCode: "70",
                divisionName: "Activities of head offices; management consultancy activities",
                groupCode: "702",
                groupName: "Management consultancy activities",
                classCode: "7020",
                className: "Management consultancy activities",
                keywords: "consulting, business advisory, management",
                synonyms: "business consultant, management advisor, corporate advisor",
                abbreviations: "mc, consulting",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: 3,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now()
            },
            {
                id: "ssic-64201",
                code: "64201",
                name: "Holding companies",
                category: "Financial and Insurance Activities",
                description: "Investment holding companies that hold shares in subsidiary companies.",
                sectionCode: "K",
                sectionName: "Financial and Insurance Activities",
                divisionCode: "64",
                divisionName: "Financial service activities, except insurance and pension funding",
                groupCode: "642",
                groupName: "Activities of holding companies",
                classCode: "6420",
                className: "Activities of holding companies",
                keywords: "holding, investment, shares, asset management",
                synonyms: "investment holding, parent company, shares holder",
                abbreviations: "holding, inv",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: 4,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now()
            }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    if (!db.preregSections) {
        db.preregSections = [
            {
                id: "sec-names",
                key: "names",
                title: "SSIC & Industry Name",
                description: "Proposed names and activities for ACRA verification",
                type: "form",
                sortOrder: 1,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [
                    { key: "names[0]", label: "Proposed Name Option 1", type: "text", required: true, placeholder: "Primary preferred name" },
                    { key: "names[1]", label: "Proposed Name Option 2", type: "text", required: true, placeholder: "Backup name if Option 1 is unavailable" },
                    { key: "names[2]", label: "Proposed Name Option 3", type: "text", required: false, placeholder: "Alternative name or enter NA" },
                    { key: "activities.primary", label: "Primary Business Activity (SSIC Code)", type: "ssic-single", required: true, placeholder: "Search by SSIC code or activity name" },
                    { key: "activities.secondary", label: "Secondary Business Activity (SSIC Code)", type: "ssic-single", required: false, placeholder: "Search by SSIC code or activity name" },
                    { key: "names[3]", label: "Proposed Name Option 4", type: "text", required: false, placeholder: "" }
                ],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            },
            {
                id: "sec-directors-shareholders",
                key: "directors-shareholders",
                title: "Directors & Shareholders",
                description: "Details of company directors and shareholders",
                type: "form",
                sortOrder: 2,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [
                    { key: "secretary.required", label: "Corporate secretary", type: "switch", required: false, placeholder: "$720 per year", hint: "Required within 6 months. Handles annual filings and board minutes." }
                ],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            },
            {
                id: "sec-addons",
                key: "addons",
                title: "Add-on Services",
                description: "Select additional corporate and compliance services",
                type: "form",
                sortOrder: 3,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [
                    { key: "addons.bankIntro", label: "Bank account introduction", type: "switch", required: false, placeholder: "$350 one-time", hint: "Warm intros to DBS, OCBC, HSBC, Aspire, Wio, Mashreq. We prepare KYC and stay on the call." },
                    { key: "addons.statCompliance", label: "Statutory & compliance package", type: "switch", required: false, placeholder: "$480 per year", hint: "Annual filings, AGM resolutions, statutory registers maintained, ESOP support when needed." },
                    { key: "addons.accounting", label: "Accounting & bookkeeping", type: "switch", required: false, placeholder: "$220 per month", hint: "Monthly bookkeeping in Xero, financial statements compiled to standards, payroll with CPF processing." },
                    { key: "addons.taxCompliance", label: "Tax compliance package", type: "switch", required: false, placeholder: "$720 per year", hint: "Compilation of corporate tax returns (Form C-S), filing of ECI, GST advisory and filings." },
                    { key: "addons.crossBorderTax", label: "Cross-Border Tax Structuring", type: "switch", required: false, placeholder: "$4,500 one-time", hint: "Advisory on IP holding, transfer pricing policy documentation, setup of offshore corporate wrappers." },
                    { key: "addons.apostille", label: "Apostille + Notarisation", type: "switch", required: false, placeholder: "$280 one-time", hint: "Legalisation of incorporation files for use in foreign countries. Includes courier fees." }
                ],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            },
            {
                id: "sec-office",
                key: "office",
                title: "Registered Office",
                description: "Singapore registered office details",
                type: "form",
                sortOrder: 4,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [
                    { key: "office.useService", label: "Registered office address", type: "switch", required: false, placeholder: "$480 per year", hint: "Statutorily required. Real address in Singapore, mail scanned weekly." },
                    { key: "office.address", label: "Office Address", type: "textarea", required: true, placeholder: "Enter your own address if not using Globalisor service", condKey: "office.useService", condOperator: "equals", condValue: "false", hint: "Please enter full address details." }
                ],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            },
            {
                id: "sec-package-next",
                key: "contact",
                title: "Your package is up Next",
                description: "Provide your contact information for package processing",
                type: "form",
                sortOrder: 5,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [
                    { key: "contact.firstName", label: "First Name", type: "text", required: true, placeholder: "First name" },
                    { key: "contact.lastName", label: "Last Name", type: "text", required: true, placeholder: "Last name" },
                    { key: "contact.phone", label: "Contact Number", type: "text", required: true, placeholder: "1234 5678" },
                    { key: "contact.email", label: "Email ID", type: "text", required: true, placeholder: "email@example.com" }
                ],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            },
            {
                id: "sec-checkout",
                key: "checkout",
                title: "Package Summary & Payment",
                description: "Review your details, select packages, and complete payment",
                type: "form",
                sortOrder: 6,
                status: "PUBLISHED",
                lastUpdatedBy: "System",
                lastUpdatedAt: Date.now(),
                fields: [],
                documents: [],
                checklists: [],
                attachments: [],
                faqs: [],
                publishedData: null
            }
        ];

        db.preregSections.forEach(s => {
            s.publishedData = {
                id: s.id,
                key: s.key,
                title: s.title,
                description: s.description,
                type: s.type,
                sortOrder: s.sortOrder,
                fields: s.fields,
                applicableServices: "All",
                checklists: s.checklists,
                faqs: s.faqs,
                attachments: s.attachments,
                documents: s.documents
            };
        });

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    return db;
};
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- AUTH ENDPOINTS ---
app.post('/api/auth/signup', (req, res) => {
    const db = getDb();
    const { firstName, lastName, email, password, role } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    
    const newUser = {
        id: 'usr-' + Date.now(),
        firstName: firstName || '',
        lastName: lastName || '',
        email: normalizedEmail,
        password: password,
        role: role || 'CLIENT'
    };
    
    db.users.push(newUser);
    saveDb(db);
    
    res.status(201).json({ message: 'Signup successful' });
});

app.post('/api/auth/signin', (req, res) => {
    const db = getDb();
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials or unauthorized access.' });
    }
    
    const token = 'mock-jwt-token-' + Math.random().toString(36).substring(2) + '-' + user.id;
    
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: token
    });
});


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
            companyName: clientServices.length > 0 ? clientServices[0].companyName : 'N/A',
            priority: clientServices.length > 0 ? clientServices[0].priority : 'Normal',
            deadline: clientServices.length > 0 ? clientServices[0].deadline : 'N/A',
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

// GET /api/applications → get all services with client details for detailed table
app.get('/api/applications', (req, res) => {
    const db = getDb();
    const apps = db.services.map(s => {
        const client = db.clients.find(c => c.clientId === s.clientId);
        return { 
            id: s.serviceId.replace('SRV-', 'APP-'),
            business: s.companyName || 'N/A',
            client: client ? client.name : 'Unknown',
            staff: s.assignedStaff || 'Sarah Lim',
            status: s.status || 'pending',
            priority: s.priority || 'Normal',
            deadline: s.deadline || 'N/A',
            kyc: s.kycStatus || 'Approved',
            docs: s.docsStatus?.pending > 0 ? `${s.docsStatus.pending} Docs Pending` : 'All Docs OK',
            date: s.date
        };
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

// --- DOCUMENT ENDPOINTS ---
app.get('/api/documents', (req, res) => {
    const db = getDb();
    const docs = (db.documents || []).map(d => {
        const client = db.clients.find(c => c.clientId === d.clientId);
        return {
            ...d,
            clientName: client ? client.name : 'Unknown',
            client: `${client ? client.name : 'Unknown'} - ${d.clientId.replace('C-', 'APP-')}`,
            company: client && db.services.find(s => s.clientId === client.clientId) 
                ? db.services.find(s => s.clientId === client.clientId).companyName 
                : 'Unknown'
        };
    });
    res.json(docs);
});

// --- STATIC CONTENT ENDPOINTS ---
app.get('/api/static-content', (req, res) => {
    const db = getDb();
    const { portal, category } = req.query;
    let filtered = db.staticContent || [];
    if (portal) filtered = filtered.filter(c => c.portal === portal);
    if (category) filtered = filtered.filter(c => c.category === category);
    res.json(filtered);
});

app.post('/api/static-content', (req, res) => {
    const db = getDb();
    const newItem = {
        id: 'sc-' + Date.now(),
        ...req.body,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    db.staticContent.unshift(newItem);
    saveDb(db);
    res.status(201).json(newItem);
});

app.patch('/api/static-content/:id', (req, res) => {
    const db = getDb();
    const index = db.staticContent.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
        db.staticContent[index] = { 
            ...db.staticContent[index], 
            ...req.body, 
            updatedAt: Date.now() 
        };
        saveDb(db);
        res.json(db.staticContent[index]);
    } else {
        res.status(404).json({ error: 'Content not found' });
    }
});

app.delete('/api/static-content/:id', (req, res) => {
    const db = getDb();
    db.staticContent = db.staticContent.filter(c => c.id !== req.params.id);
    saveDb(db);
    res.status(204).send();
});

// POST /api/requirements/pay → mock payment and email dispatch
app.post('/api/requirements/pay', (req, res) => {
    const data = req.body;
    const email = data.contact?.email || 'customer@example.com';
    const name = `${data.contact?.firstName || ''} ${data.contact?.lastName || ''}`.trim() || 'Valued Customer';
    
    console.log(`\n==================================================`);
    console.log(`[Email Dispatch Simulation] Sending receipt & summary to: ${email}`);
    console.log(`--------------------------------------------------`);
    console.log(`Dear ${name},`);
    console.log(`Thank you for choosing Globalisor! We have received your payment.`);
    console.log(`Here is a summary of your company setup details:`);
    console.log(`- Company Type: ${data.companyType || 'Pte Ltd'}`);
    console.log(`- Proposed Name 1: ${data.names?.[0] || 'N/A'}`);
    console.log(`- Proposed Name 2: ${data.names?.[1] || 'N/A'}`);
    console.log(`- Primary Activity: ${data.activities?.primary || 'N/A'}`);
    console.log(`- Registered Office: ${data.office?.useService ? 'Globalisor Premium CBD Address' : (data.office?.address || 'Own Address')}`);
    
    const selectedServices = [];
    if (data.office?.useService) selectedServices.push('Registered Office Address ($480/yr)');
    if (data.secretary?.required) selectedServices.push('Corporate Secretary Service ($720/yr)');
    if (data.addons?.bankIntro) selectedServices.push('Bank Account Introduction ($350)');
    if (data.addons?.statCompliance) selectedServices.push('Statutory & Compliance ($480/yr)');
    if (data.addons?.accounting) selectedServices.push('Accounting & Bookkeeping ($220/mo)');
    if (data.addons?.taxCompliance) selectedServices.push('Tax Compliance Package ($720/yr)');
    if (data.addons?.crossBorderTax) selectedServices.push('Cross-Border Tax Structuring ($4,500)');
    if (data.addons?.apostille) selectedServices.push('Apostille + Notarisation ($280)');
    
    console.log(`- Selected Add-on Services (${selectedServices.length}):`);
    selectedServices.forEach(srv => console.log(`  * ${srv}`));
    console.log(`\nPlease complete the remaining details (Share Capital & Secretary fields) in the portal.`);
    console.log(`Best regards,\nThe Globalisor Team`);
    console.log(`==================================================\n`);
    
    res.json({ success: true, message: 'Payment registered, email sent.' });
});

// GET /api/requirements → retrieve requirement draft
app.get('/api/requirements', (req, res) => {
    const db = getDb();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const parts = token.split('-');
    let userId = parts[parts.length - 1];
    if (parts.length >= 2 && parts[parts.length - 2] === 'usr') {
        userId = 'usr-' + userId;
    }

    let requirement = (db.requirements || []).find(r => r.userId === userId);
    if (!requirement) {
        requirement = {
            id: 'SRV-' + (5000 + (db.services || []).length + 1),
            userId: userId,
            status: 'pending',
            data: {},
            sectionStatuses: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        if (!db.requirements) db.requirements = [];
        db.requirements.push(requirement);
        saveDb(db);
    }

    res.json({
        status: requirement.status,
        data: requirement.data,
        sectionStatuses: requirement.sectionStatuses,
        applicationId: requirement.id
    });
});

// POST /api/requirements → save requirement draft
app.post('/api/requirements', (req, res) => {
    const db = getDb();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const parts = token.split('-');
    let userId = parts[parts.length - 1];
    if (parts.length >= 2 && parts[parts.length - 2] === 'usr') {
        userId = 'usr-' + userId;
    }

    let requirement = (db.requirements || []).find(r => r.userId === userId);
    if (!requirement) {
        requirement = {
            id: 'SRV-' + (5000 + (db.services || []).length + 1),
            userId: userId,
            status: 'pending',
            data: req.body || {},
            sectionStatuses: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        if (!db.requirements) db.requirements = [];
        db.requirements.push(requirement);
    } else {
        requirement.data = req.body || {};
        requirement.updatedAt = Date.now();
    }
    saveDb(db);

    res.json({
        status: requirement.status,
        data: requirement.data,
        sectionStatuses: requirement.sectionStatuses,
        applicationId: requirement.id
    });
});

// POST /api/requirements/submit → submit requirement
app.post('/api/requirements/submit', (req, res) => {
    const db = getDb();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const parts = token.split('-');
    let userId = parts[parts.length - 1];
    if (parts.length >= 2 && parts[parts.length - 2] === 'usr') {
        userId = 'usr-' + userId;
    }

    let requirement = (db.requirements || []).find(r => r.userId === userId);
    if (!requirement) {
        return res.status(400).json({ message: 'No requirement found to submit' });
    }

    requirement.status = 'under review';
    requirement.updatedAt = Date.now();

    // Create client/service in db if they don't exist
    const user = db.users.find(u => u.id === userId);
    if (user) {
        let client = db.clients.find(c => c.email === user.email);
        if (!client) {
            client = {
                clientId: 'C-' + (1000 + db.clients.length + 1),
                name: (user.firstName + ' ' + user.lastName).trim(),
                email: user.email,
                phone: requirement.data?.contact?.phone || '',
                createdAt: Date.now()
            };
            db.clients.push(client);
        }

        const existingService = db.services.find(s => s.clientId === client.clientId && s.serviceId === requirement.id);
        if (!existingService) {
            const newService = {
                serviceId: requirement.id,
                clientId: client.clientId,
                serviceType: requirement.data?.companyType || 'Incorporation',
                status: 'In Progress',
                companyName: requirement.data?.names?.[0] || 'Unknown',
                assignedStaff: 'Sarah Lim',
                priority: 'Normal',
                kycStatus: 'Pending',
                docsStatus: { pending: 1, ok: 0 },
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now()
            };
            db.services.unshift(newService);
        } else {
            existingService.status = 'In Progress';
            existingService.companyName = requirement.data?.names?.[0] || existingService.companyName;
        }
    }

    saveDb(db);

    res.json({
        status: requirement.status,
        data: requirement.data,
        sectionStatuses: requirement.sectionStatuses,
        applicationId: requirement.id
    });
});

// POST /api/requirements/public/submit → submit requirement as guest (and auto-create user/client)
app.post('/api/requirements/public/submit', (req, res) => {
    const db = getDb();
    const data = req.body || {};
    const contact = data.contact || {};
    const email = contact.email;
    let firstName = contact.firstName || '';
    let lastName = contact.lastName || '';

    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Contact email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    let rawPassword = '';

    if (user) {
        rawPassword = user.password || 'password123';
    } else {
        const randomNum = Math.floor(Math.random() * 9000) + 1000;
        rawPassword = 'Glob-' + randomNum;
        user = {
            id: 'usr-' + Date.now(),
            firstName: firstName,
            lastName: lastName,
            email: normalizedEmail,
            password: rawPassword,
            role: 'CLIENT'
        };
        db.users.push(user);

        // Auto-initialize KYC
        if (!db.kyc) db.kyc = [];
        db.kyc.push({
            id: 'KYC-' + Date.now(),
            clientId: user.id,
            name: (firstName + ' ' + lastName).trim(),
            idType: 'N/A',
            idNum: 'N/A',
            nation: 'N/A',
            status: 'pending',
            risk: 'Low',
            lastUpdated: Date.now(),
            auditLogs: ['KYC profile initialized on user registration.']
        });

        // Auto-initialize Compliance
        if (!db.compliance) db.compliance = [];
        db.compliance.push({
            id: 'COMP-' + Date.now(),
            clientId: user.id,
            name: (firstName + ' ' + lastName).trim(),
            type: 'AML Screening',
            status: 'pending',
            risk: 'Low',
            lastUpdated: Date.now(),
            auditLogs: ['AML compliance monitoring initialized on registration.']
        });
    }

    // Ensure client record exists
    if (!db.clients) db.clients = [];
    let client = db.clients.find(c => c.email === normalizedEmail);
    if (!client) {
        client = {
            clientId: 'C-' + (1000 + db.clients.length + 1),
            name: (firstName + ' ' + lastName).trim(),
            email: normalizedEmail,
            phone: contact.phone || '',
            createdAt: Date.now()
        };
        db.clients.push(client);
    }

    // Ensure requirement record exists
    if (!db.requirements) db.requirements = [];
    let requirement = db.requirements.find(r => r.userId === user.id);
    if (requirement) {
        requirement.data = data;
        requirement.status = 'under review';
        requirement.updatedAt = Date.now();
    } else {
        requirement = {
            id: 'SRV-' + (5000 + (db.services || []).length + 1),
            userId: user.id,
            status: 'under review',
            data: data,
            sectionStatuses: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        db.requirements.push(requirement);
    }

    // Ensure service record exists
    if (!db.services) db.services = [];
    let service = db.services.find(s => s.clientId === client.clientId && s.serviceId === requirement.id);
    if (!service) {
        service = {
            serviceId: requirement.id,
            clientId: client.clientId,
            serviceType: data.companyType || 'Incorporation',
            status: 'In Progress',
            companyName: data.names?.[0] || 'Unknown',
            assignedStaff: 'Sarah Lim',
            priority: 'Normal',
            kycStatus: 'Pending',
            docsStatus: { pending: 1, ok: 0 },
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        };
        db.services.unshift(service);
    }

    saveDb(db);

    res.json({
        status: requirement.status,
        data: requirement.data,
        applicationId: requirement.id,
        email: email,
        password: rawPassword,
        firstName: firstName,
        lastName: lastName,
        clientId: user.id
    });
});

// GET /api/onboarding-config/published → get published onboarding steps configuration
app.get('/api/onboarding-config/published', (req, res) => {
    const journeyType = req.query.journeyType || 'LOCAL';
    if (journeyType === 'FOREIGNER') {
        res.json([
            {
                key: 'document_checklist',
                field: 'stepDocumentChecklist',
                title: 'Document Checklist',
                icon: 'clipboard-list',
                description: 'Please review the document checklist based on foreign incorporation selections before starting onboarding.',
                sortOrder: 0,
                status: 'PUBLISHED',
                manualFields: [],
                requiredDocs: []
            },
            {
                key: 'director_details',
                field: 'step2DirectorDetails',
                title: 'Director Details',
                icon: 'briefcase',
                description: 'Please verify director details and upload passport/NRIC copies.',
                sortOrder: 1,
                status: 'PUBLISHED',
                dynamicSection: true,
                dynamicCountKey: 'directorCount',
                manualFields: [
                    { key: 'fullName', label: 'Full Legal Name', type: 'text' },
                    { key: 'idNumber', label: 'NRIC / Passport / ID Number', type: 'text' },
                    { key: 'nationality', label: 'Nationality', type: 'nationality' },
                    { key: 'gender', label: 'Gender', type: 'select', options: ['Select', 'Male', 'Female', 'Other'] },
                    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                    { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                    { key: 'useDifferentAddress', label: 'I want to provide a different residential address', type: 'checkbox' },
                    { key: 'alternativeAddress', label: 'Alternative Residential Address', type: 'text', conditionalOn: 'useDifferentAddress', conditionalValue: 'true' },
                    { key: 'disqualificationAcknowledge', label: 'I confirm that I am not disqualified from acting as a director under the laws of Singapore.', type: 'checkbox', mandatory: true }
                ],
                requiredDocs: [
                    { type: 'nric', label: 'NRIC / Passport Copy' },
                    { type: 'address_proof', label: 'Utility Bill / Bank Statement' }
                ]
            },
            {
                key: 'share_capital',
                field: 'stepShareCapital',
                title: 'Share Capital Details',
                icon: 'coins',
                description: 'Configure corporate share capital structure and allocate shares to shareholders.',
                sortOrder: 2,
                status: 'PUBLISHED',
                manualFields: [],
                requiredDocs: []
            },
            {
                key: 'shareholder_details',
                field: 'stepShareholderDetails',
                title: 'Shareholder Details',
                icon: 'users',
                description: 'Collect tabular details for all company shareholders.',
                sortOrder: 3,
                status: 'PUBLISHED',
                manualFields: [],
                requiredDocs: []
            },
            {
                key: 'individual_shareholder',
                field: 'step3IndividualShareholder',
                title: 'Individual Shareholder Details',
                icon: 'user-check',
                description: 'Capture individual shareholder information. Ownership ≥ 25% will automatically trigger UBO and AML/KYC screening.',
                sortOrder: 4,
                status: 'PUBLISHED',
                dynamicSection: true,
                dynamicCountKey: 'individualShareholderCount',
                manualFields: [
                    { key: 'shareholderType', label: 'Shareholder Type', type: 'select', options: ['Select', 'Local', 'Foreigner'] },
                    { key: 'sameAsDirector', label: 'Is individual shareholder same as director?', type: 'checkbox' },
                    { key: 'fullName', label: 'Full Name', type: 'text' },
                    { key: 'idNumber', label: 'NRIC / ID Number', type: 'text' },
                    { key: 'nationality', label: 'Nationality', type: 'nationality' },
                    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                    { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                    { key: 'useDifferentAddress', label: 'I want to provide a different residential address', type: 'checkbox' },
                    { key: 'alternativeAddress', label: 'Alternative Residential Address', type: 'text', conditionalOn: 'useDifferentAddress', conditionalValue: 'true' },
                    { key: 'currency', label: 'Currency', type: 'select', options: ['Select', 'SGD', 'USD'] },
                    { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
                    { key: 'numberOfSharesPct', label: 'Number of Shares (%)', type: 'number' },
                    { key: 'shareCapitalAmountPct', label: 'Share Capital Amount (%)', type: 'number' },
                    { key: 'numberOfShares', label: 'Number of Shares', type: 'number', readonly: true },
                    { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number', readonly: true },
                    { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
                    { key: 'uboDeclaration', label: 'Is the Shareholder the Ultimate Beneficial Owner?', type: 'select', options: ['Select', 'No', 'Yes'] }
                ],
                requiredDocs: [
                    { type: 'nric', label: 'NRIC / Passport Copy' },
                    { type: 'address_proof', label: 'Address Proof' }
                ]
            },
            {
                key: 'corporate_shareholder',
                field: 'step4CorporateShareholder',
                title: 'Corporate Shareholder Details',
                icon: 'building-2',
                description: 'Upload Bizfile and supporting documents for corporate shareholders.',
                sortOrder: 5,
                status: 'PUBLISHED',
                dynamicSection: true,
                dynamicCountKey: 'corporateShareholderCount',
                manualFields: [
                    { key: 'companyName', label: 'Company Name', type: 'text' },
                    { key: 'uen', label: 'UEN / Reg Number', type: 'text' },
                    { key: 'dateOfIncorporation', label: 'Date of Incorporation', type: 'date' },
                    { key: 'registeredAddress', label: 'Registered Address', type: 'text' },
                    { key: 'countryOfIncorporation', label: 'Country of Incorporation', type: 'text' },
                    { key: 'currency', label: 'Currency', type: 'select', options: ['SGD', 'USD'] },
                    { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
                    { key: 'numberOfSharesPct', label: 'Number of Shares (%)', type: 'number' },
                    { key: 'shareCapitalAmountPct', label: 'Share Capital Amount (%)', type: 'number' },
                    { key: 'numberOfShares', label: 'Number of Shares', type: 'number', readonly: true },
                    { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number', readonly: true },
                    { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
                    { key: 'uboDeclaration', label: 'Is the Shareholder the Ultimate Beneficial Owner?', type: 'select', options: ['No', 'Yes'] }
                ],
                requiredDocs: [
                    { type: 'bizfile', label: 'Bizfile (ACRA)' },
                    { type: 'constitution', label: 'Constitution / Shareholding Structure' },
                    { type: 'cert_incorporation', label: 'Certificate of Incorporation', required: false },
                    { type: 'supporting_docs', label: 'Supporting Corporate Documents', required: false }
                ]
            },
            {
                key: 'ubo',
                field: 'step5UBO',
                title: 'Ultimate Beneficial Owner (UBO)',
                icon: 'key',
                description: 'Provide details and documents for Ultimate Beneficial Owners.',
                sortOrder: 6,
                status: 'PUBLISHED',
                manualFields: [
                    { key: 'fullName', label: 'Full Legal Name', type: 'text' },
                    { key: 'idNumber', label: 'NRIC / Passport Number', type: 'text' },
                    { key: 'nationality', label: 'Nationality', type: 'nationality' },
                    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                    { key: 'residentialAddress', label: 'Residential Address', type: 'text' }
                ],
                requiredDocs: [
                    { type: 'ubo_nric', label: 'NRIC / Passport Copy' },
                    { type: 'ubo_address_proof', label: 'Address Proof' }
                ]
            },
            {
                key: 'corporate_rep',
                field: 'step6CorporateRep',
                title: 'Corporate Representative',
                icon: 'user-cog',
                description: 'Capture details and authorization documents for corporate representatives.',
                sortOrder: 7,
                status: 'PUBLISHED',
                dynamicSection: true,
                dynamicCountKey: 'corporateRepCount',
                manualFields: [
                    { key: 'fullName', label: 'Full Name', type: 'text' },
                    { key: 'idNumber', label: 'Passport / ID Number', type: 'text' },
                    { key: 'nationality', label: 'Nationality', type: 'nationality' },
                    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                    { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                    { key: 'email', label: 'Email Address', type: 'email' },
                    { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                    { key: 'corporateShareholderUen', label: 'Select Corporate Shareholder Representative For', type: 'select', options: ['Select'] }
                ],
                requiredDocs: [
                    { type: 'nric', label: 'Passport Copy' },
                    { type: 'address_proof', label: 'Address Proof' }
                ]
            },
            {
                key: 'rons',
                field: 'stepRons',
                title: 'Register of Nominee Shareholders (RONS)',
                icon: 'users-cog',
                description: 'Declare nominee shareholders and capture their details and required documents.',
                sortOrder: 8,
                status: 'PUBLISHED',
                manualFields: [],
                requiredDocs: []
            },
            {
                key: 'final_declaration',
                field: 'step7FinalDeclaration',
                title: 'Final Declaration & Consent',
                icon: 'file-signature',
                description: 'Please review all details and declare final consent before submitting your application.',
                sortOrder: 9,
                status: 'PUBLISHED',
                manualFields: [
                    { key: 'declarationAgreed', label: 'I confirm that all the details provided are true and accurate to the best of my knowledge.', type: 'checkbox' },
                    { key: 'consentAgreed', label: 'I consent to Globalisor conducting compliance, AML/KYC screening, and verification checks.', type: 'checkbox' },
                    { key: 'fye', label: 'Financial Year End (FYE)', type: 'date' }
                ],
                requiredDocs: []
            }
        ]);
        return;
    }

    res.json([
        {
            key: 'document_checklist',
            field: 'stepDocumentChecklist',
            title: 'Document Checklist',
            icon: 'clipboard-list',
            description: 'Please review the document checklist based on pre-registration selections before starting onboarding.',
            sortOrder: 0,
            status: 'PUBLISHED',
            manualFields: [],
            requiredDocs: []
        },
        {
            key: 'director_details',
            field: 'step2DirectorDetails',
            title: 'Director Details',
            icon: 'briefcase',
            description: 'Please upload NRIC/FIN and Address Proof, verify and confirm details.',
            sortOrder: 1,
            status: 'PUBLISHED',
            dynamicSection: true,
            dynamicCountKey: 'directorCount',
            manualFields: [
                { key: 'fullName', label: 'Full Legal Name', type: 'text' },
                { key: 'idNumber', label: 'NRIC / FIN', type: 'text' },
                { key: 'nationality', label: 'Nationality', type: 'nationality' },
                { key: 'gender', label: 'Gender', type: 'select', options: ['Select', 'Male', 'Female', 'Other'] },
                { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                { key: 'disqualificationAcknowledge', label: 'I confirm that I am not disqualified from acting as a director under the laws of Singapore.', type: 'checkbox', mandatory: true }
            ],
            requiredDocs: [
                { type: 'nric', label: 'NRIC / FIN' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
            ]
        },
        {
            key: 'share_capital',
            field: 'stepShareCapital',
            title: 'Share Capital Details',
            icon: 'coins',
            description: 'Configure corporate share capital structure and allocate shares to shareholders.',
            sortOrder: 2,
            status: 'PUBLISHED',
            manualFields: [],
            requiredDocs: []
        },
        {
            key: 'shareholder_details',
            field: 'stepShareholderDetails',
            title: 'Shareholder Details',
            icon: 'users',
            description: 'Collect tabular details for all company shareholders.',
            sortOrder: 3,
            status: 'PUBLISHED',
            manualFields: [],
            requiredDocs: []
        },
        {
            key: 'individual_shareholder',
            field: 'step3IndividualShareholder',
            title: 'Individual Shareholder Details',
            icon: 'user-check',
            description: 'Capture individual shareholder information. Ownership ≥ 25% will automatically trigger UBO and AML/KYC screening.',
            sortOrder: 4,
            status: 'PUBLISHED',
            dynamicSection: true,
            dynamicCountKey: 'individualShareholderCount',
            manualFields: [
                { key: 'sameAsDirector', label: 'Is individual shareholder same as director?', type: 'checkbox' },
                { key: 'fullName', label: 'Full Name', type: 'text' },
                { key: 'idNumber', label: 'NRIC / FIN', type: 'text' },
                { key: 'nationality', label: 'Nationality', type: 'nationality' },
                { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                { key: 'totalShares', label: 'Total Number of Shares of the Company', type: 'number' },
                { key: 'totalShareCapital', label: 'Total Share Capital Amount of the Company', type: 'number' },
                { key: 'currency', label: 'Currency', type: 'select', options: ['Select', 'SGD', 'USD'] },
                { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
                { key: 'numberOfShares', label: 'Number of Shares', type: 'number' },
                { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number' },
                { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
                { key: 'uboDeclaration', label: 'UBO Declaration', type: 'select', options: ['Select', 'Yes', 'No'] }
            ],
            requiredDocs: [
                { type: 'nric', label: 'NRIC / FIN' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
            ]
        },
        {
            key: 'corporate_shareholder',
            field: 'step4CorporateShareholder',
            title: 'Corporate Shareholder Details',
            icon: 'building',
            description: 'Capture corporate shareholder details, including UEN, corporate structure, and UBO declarations.',
            sortOrder: 5,
            status: 'PUBLISHED',
            dynamicSection: true,
            dynamicCountKey: 'corporateShareholderCount',
            manualFields: [
                { key: 'companyName', label: 'Company Name', type: 'text' },
                { key: 'uen', label: 'UEN / Registration Number', type: 'text' },
                { key: 'registeredAddress', label: 'Registered Address', type: 'text' },
                { key: 'countryOfIncorporation', label: 'Country of Incorporation', type: 'text' },
                { key: 'dateOfIncorporation', label: 'Date of Incorporation', type: 'date' },
                { key: 'totalShares', label: 'Total Number of Shares of the Company', type: 'number' },
                { key: 'totalShareCapital', label: 'Total Share Capital Amount of the Company', type: 'number' },
                { key: 'currency', label: 'Currency', type: 'select', options: ['Select', 'SGD', 'USD'] },
                { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
                { key: 'numberOfShares', label: 'Number of Shares', type: 'number' },
                { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number' },
                { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
                { key: 'uboDeclaration', label: 'UBO Declaration', type: 'select', options: ['Select', 'Yes', 'No'] }
            ],
            requiredDocs: [
                { type: 'bizfile', label: 'BizFile / Corporate Profile' },
                { type: 'constitution', label: 'Company Constitution' },
                { type: 'cert_incorporation', label: 'Certificate of Incorporation' },
                { type: 'supporting_docs', label: 'Supporting Documents' }
            ]
        },
        {
            key: 'ubo',
            field: 'step5UBO',
            title: 'Ultimate Beneficial Owner (UBO)',
            icon: 'key',
            description: 'Provide details and documents for Ultimate Beneficial Owners (individuals holding >= 25% ownership).',
            sortOrder: 6,
            status: 'PUBLISHED',
            manualFields: [
                { key: 'fullName', label: 'Full Legal Name', type: 'text' },
                { key: 'idNumber', label: 'NRIC / Passport Number', type: 'text' },
                { key: 'nationality', label: 'Nationality', type: 'nationality' },
                { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { key: 'residentialAddress', label: 'Residential Address', type: 'text' }
            ],
            requiredDocs: [
                { type: 'ubo_nric', label: 'NRIC / Passport Copy' },
                { type: 'ubo_address_proof', label: 'Address Proof' }
            ]
        },
        {
            key: 'corporate_rep',
            field: 'step6CorporateRep',
            title: 'Corporate Representative',
            icon: 'user-tie',
            description: 'Capture details and authorization documents for the appointed corporate representative.',
            sortOrder: 7,
            status: 'PUBLISHED',
            manualFields: [
                { key: 'fullName', label: 'Full Name', type: 'text' },
                { key: 'idNumber', label: 'NRIC / Passport Number', type: 'text' },
                { key: 'nationality', label: 'Nationality', type: 'nationality' },
                { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                { key: 'email', label: 'Email Address', type: 'email' },
                { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                { key: 'corporateShareholderUen', label: 'Select Corporate Shareholder Representative For', type: 'select', options: ['Select'] }
            ],
            requiredDocs: [
                { type: 'nric', label: 'NRIC / Passport Copy' },
                { type: 'address_proof', label: 'Address Proof' },
                { type: 'auth_letter', label: 'Authorization Letter' }
            ]
        },
        {
            key: 'rons',
            field: 'stepRons',
            title: 'Register of Nominee Shareholders (RONS)',
            icon: 'users-cog',
            description: 'Declare nominee shareholders and capture their details and required documents.',
            sortOrder: 8,
            status: 'PUBLISHED',
            manualFields: [],
            requiredDocs: []
        },
        {
            key: 'final_declaration',
            field: 'step7FinalDeclaration',
            title: 'Final Declaration & Consent',
            icon: 'file-signature',
            description: 'Please review all details and declare final consent before submitting your application.',
            sortOrder: 9,
            status: 'PUBLISHED',
            manualFields: [
                { key: 'declarationAgreed', label: 'I confirm that all the details provided are true and accurate to the best of my knowledge.', type: 'checkbox' },
                { key: 'consentAgreed', label: 'I consent to Globalisor conducting compliance, AML/KYC screening, and verification checks.', type: 'checkbox' },
                { key: 'fye', label: 'Financial Year End (FYE)', type: 'date' }
            ]
        }
    ]);
});

const getMergedValue = (existing, existingKey, source, sourceKey) => {
    if (existing && existing[existingKey] !== undefined && existing[existingKey] !== null && String(existing[existingKey]).trim() !== '') {
        return existing[existingKey];
    }
    if (source && source[sourceKey] !== undefined && source[sourceKey] !== null) {
        return source[sourceKey];
    }
    return '';
};

const getMergedObject = (existing, existingKey, source, sourceKey, defaultVal) => {
    if (existing && existing[existingKey] !== undefined && existing[existingKey] !== null) {
        if (typeof existing[existingKey] === 'string' && String(existing[existingKey]).trim() === '') {
            // skip empty string fallback
        } else {
            return existing[existingKey];
        }
    }
    if (source && source[sourceKey] !== undefined && source[sourceKey] !== null) {
        return source[sourceKey];
    }
    return defaultVal;
};

// GET /api/onboarding/client/:clientId → get client onboarding progress and synchronize from pre-registration
app.get('/api/onboarding/client/:clientId', (req, res) => {
    const db = getDb();
    const { clientId } = req.params;

    let ob = db.onboarding.find(o => o.clientId === clientId);
    let isNew = false;
    if (!ob) {
        ob = {
            id: 'ob-' + Date.now(),
            clientId: clientId,
            clientEmail: '',
            clientName: '',
            portalActivated: false,
            status: 'in_progress',
            progressPercent: 0,
            stepDocumentChecklist: { key: 'document_checklist', title: 'Document Checklist', status: 'pending', data: {}, documents: [] },
            step2DirectorDetails: { key: 'director_details', title: 'Director Details', status: 'pending', data: { list: [] }, documents: [] },
            stepShareCapital: { key: 'share_capital', title: 'Share Capital Details', status: 'pending', data: { allocations: [], currencies: [] }, documents: [] },
            stepShareholderDetails: { key: 'shareholder_details', title: 'Shareholder Details', status: 'pending', data: {}, documents: [] },
            step3IndividualShareholder: { key: 'individual_shareholder', title: 'Individual Shareholder Details', status: 'pending', data: { list: [] }, documents: [] },
            step4CorporateShareholder: { key: 'corporate_shareholder', title: 'Corporate Shareholder Details', status: 'pending', data: { list: [] }, documents: [] },
            step5UBO: { key: 'ubo', title: 'Ultimate Beneficial Owner', status: 'pending', data: {}, documents: [] },
            step6CorporateRep: { key: 'corporate_rep', title: 'Corporate Representative', status: 'pending', data: {}, documents: [] },
            stepRons: { key: 'rons', title: 'Register of Nominee Shareholders (RONS)', status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] },
            step7FinalDeclaration: { key: 'final_declaration', title: 'Final Declaration & Consent', status: 'pending', data: {}, documents: [] },
            auditLogs: ['Onboarding initiated automatically at ' + new Date()],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        const user = db.users.find(u => u.id === clientId);
        if (user) {
            ob.clientEmail = user.email;
            ob.clientName = (user.firstName + ' ' + user.lastName).trim();
        }
        db.onboarding.push(ob);
        isNew = true;
    }

    // Sync from requirements
    const requirement = (db.requirements || []).find(r => r.userId === clientId);
    if (requirement && requirement.data) {
        const reqData = requirement.data;
        let changed = false;

        // --- Sync Directors ---
        const reqDirs = reqData.directors || [];
        const dirStep = ob.step2DirectorDetails;
        if (!dirStep.data) dirStep.data = { list: [] };
        if (!dirStep.data.list) dirStep.data.list = [];

        const newDirs = [];
        for (let i = 0; i < reqDirs.length; i++) {
            const existing = dirStep.data.list[i] || {};
            const rDir = reqDirs[i] || {};

            newDirs.push({
                fullName: getMergedValue(existing, 'fullName', rDir, 'name'),
                idNumber: getMergedValue(existing, 'idNumber', rDir, 'idNum'),
                nationality: getMergedValue(existing, 'nationality', rDir, 'nation'),
                dateOfBirth: getMergedValue(existing, 'dateOfBirth', rDir, 'dob'),
                residentialAddress: getMergedValue(existing, 'residentialAddress', rDir, 'addr'),
                email: getMergedValue(existing, 'email', rDir, 'email'),
                mobile: getMergedValue(existing, 'mobile', rDir, 'phone'),
                disqualificationAcknowledge: getMergedObject(existing, 'disqualificationAcknowledge', rDir, 'disqualificationAcknowledge', false)
            });
        }
        if (newDirs.length === 0) newDirs.push({});
        if (JSON.stringify(dirStep.data.list) !== JSON.stringify(newDirs)) {
            dirStep.data.list = newDirs;
            changed = true;
        }

        // --- Sync Shareholders ---
        const reqShs = reqData.shareholders || [];
        const reqInds = reqShs.filter(s => s.type === 'individual');
        const reqCorps = reqShs.filter(s => s.type === 'corporate');

        // Sync Individual Shareholders
        const indStep = ob.step3IndividualShareholder;
        if (!indStep.data) indStep.data = { list: [] };
        if (!indStep.data.list) indStep.data.list = [];

        const newInds = [];
        for (let i = 0; i < reqInds.length; i++) {
            const existing = indStep.data.list[i] || {};
            const rInd = reqInds[i] || {};

            newInds.push({
                sameAsDirector: getMergedObject(existing, 'sameAsDirector', rInd, 'sameAsDirector', false),
                selectedDirectorIdx: getMergedValue(existing, 'selectedDirectorIdx', rInd, 'selectedDirectorIdx'),
                fullName: getMergedValue(existing, 'fullName', rInd, 'name'),
                idNumber: getMergedValue(existing, 'idNumber', rInd, 'idNum'),
                nationality: getMergedValue(existing, 'nationality', rInd, 'nation'),
                dateOfBirth: getMergedValue(existing, 'dateOfBirth', rInd, 'dob'),
                residentialAddress: getMergedValue(existing, 'residentialAddress', rInd, 'addr'),
                email: getMergedValue(existing, 'email', rInd, 'email'),
                mobile: getMergedValue(existing, 'mobile', rInd, 'phone'),
                totalShares: getMergedValue(existing, 'totalShares', rInd, 'totalShares'),
                totalShareCapital: getMergedValue(existing, 'totalShareCapital', rInd, 'totalShareCapital'),
                currency: getMergedValue(existing, 'currency', rInd, 'currency') || 'Select',
                shareClass: getMergedValue(existing, 'shareClass', rInd, 'shareClass') || 'Select',
                numberOfShares: getMergedValue(existing, 'numberOfShares', rInd, 'shares'),
                shareCapitalAmount: getMergedValue(existing, 'shareCapitalAmount', rInd, 'percent'),
                numberOfSharesPct: getMergedValue(existing, 'numberOfSharesPct', rInd, 'numberOfSharesPct'),
                shareCapitalAmountPct: getMergedValue(existing, 'shareCapitalAmountPct', rInd, 'shareCapitalAmountPct'),
                ownershipPercentage: getMergedValue(existing, 'ownershipPercentage', rInd, 'ownershipPercentage'),
                uboDeclaration: getMergedValue(existing, 'uboDeclaration', rInd, 'uboDeclaration') || 'Select'
            });
        }
        if (newInds.length === 0) newInds.push({});
        if (JSON.stringify(indStep.data.list) !== JSON.stringify(newInds)) {
            indStep.data.list = newInds;
            changed = true;
        }

        // Sync Corporate Shareholders
        const corpStep = ob.step4CorporateShareholder;
        if (!corpStep.data) corpStep.data = { list: [] };
        if (!corpStep.data.list) corpStep.data.list = [];

        const newCorps = [];
        for (let i = 0; i < reqCorps.length; i++) {
            const existing = corpStep.data.list[i] || {};
            const rCorp = reqCorps[i] || {};

            newCorps.push({
                companyName: getMergedValue(existing, 'companyName', rCorp, 'name'),
                uen: getMergedValue(existing, 'uen', rCorp, 'regNum'),
                registeredAddress: getMergedValue(existing, 'registeredAddress', rCorp, 'addr'),
                countryOfIncorporation: getMergedValue(existing, 'countryOfIncorporation', rCorp, 'regPlace'),
                dateOfIncorporation: getMergedValue(existing, 'dateOfIncorporation', rCorp, 'regDate'),
                totalShares: getMergedValue(existing, 'totalShares', rCorp, 'totalShares'),
                totalShareCapital: getMergedValue(existing, 'totalShareCapital', rCorp, 'totalShareCapital'),
                currency: getMergedValue(existing, 'currency', rCorp, 'currency') || 'Select',
                shareClass: getMergedValue(existing, 'shareClass', rCorp, 'shareClass') || 'Select',
                numberOfShares: getMergedValue(existing, 'numberOfShares', rCorp, 'shares'),
                shareCapitalAmount: getMergedValue(existing, 'shareCapitalAmount', rCorp, 'percent'),
                numberOfSharesPct: getMergedValue(existing, 'numberOfSharesPct', rCorp, 'numberOfSharesPct'),
                shareCapitalAmountPct: getMergedValue(existing, 'shareCapitalAmountPct', rCorp, 'shareCapitalAmountPct'),
                ownershipPercentage: getMergedValue(existing, 'ownershipPercentage', rCorp, 'ownershipPercentage'),
                uboDeclaration: getMergedValue(existing, 'uboDeclaration', rCorp, 'uboDeclaration') || 'No'
            });
        }
        if (newCorps.length === 0) newCorps.push({});
        if (JSON.stringify(corpStep.data.list) !== JSON.stringify(newCorps)) {
            corpStep.data.list = newCorps;
            changed = true;
        }

        if (changed || isNew) {
            ob.updatedAt = Date.now();
            saveDb(db);
        }
    } else if (isNew) {
        saveDb(db);
    }

    res.json(ob);
});

// GET /api/onboarding/client/:clientId/status → get brief portal activation status
app.get('/api/onboarding/client/:clientId/status', (req, res) => {
    const db = getDb();
    const { clientId } = req.params;
    const ob = db.onboarding.find(o => o.clientId === clientId);
    if (ob) {
        res.json({
            portalActivated: ob.portalActivated,
            status: ob.status,
            progressPercent: ob.progressPercent,
            onboardingId: ob.id
        });
    } else {
        res.json({
            portalActivated: false,
            status: 'not_started',
            progressPercent: 0
        });
    }
});

// POST /api/onboarding/client/:clientId → create/update onboarding
app.post('/api/onboarding/client/:clientId', (req, res) => {
    const db = getDb();
    const { clientId } = req.params;
    const payload = req.body || {};

    let ob = db.onboarding.find(o => o.clientId === clientId);
    if (!ob) {
        ob = {
            id: 'ob-' + Date.now(),
            clientId: clientId,
            clientEmail: payload.clientEmail || '',
            clientName: payload.clientName || '',
            portalActivated: false,
            status: 'in_progress',
            progressPercent: 0,
            stepDocumentChecklist: { key: 'document_checklist', title: 'Document Checklist', status: 'pending', data: {}, documents: [] },
            step2DirectorDetails: { key: 'director_details', title: 'Director Details', status: 'pending', data: { list: [] }, documents: [] },
            stepShareCapital: { key: 'share_capital', title: 'Share Capital Details', status: 'pending', data: { allocations: [], currencies: [] }, documents: [] },
            stepShareholderDetails: { key: 'shareholder_details', title: 'Shareholder Details', status: 'pending', data: {}, documents: [] },
            step3IndividualShareholder: { key: 'individual_shareholder', title: 'Individual Shareholder Details', status: 'pending', data: { list: [] }, documents: [] },
            step4CorporateShareholder: { key: 'corporate_shareholder', title: 'Corporate Shareholder Details', status: 'pending', data: { list: [] }, documents: [] },
            step5UBO: { key: 'ubo', title: 'Ultimate Beneficial Owner', status: 'pending', data: {}, documents: [] },
            step6CorporateRep: { key: 'corporate_rep', title: 'Corporate Representative', status: 'pending', data: {}, documents: [] },
            stepRons: { key: 'rons', title: 'Register of Nominee Shareholders (RONS)', status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] },
            step7FinalDeclaration: { key: 'final_declaration', title: 'Final Declaration & Consent', status: 'pending', data: {}, documents: [] },
            auditLogs: ['Onboarding record created.'],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        db.onboarding.push(ob);
    } else {
        if (payload.clientEmail) ob.clientEmail = payload.clientEmail;
        if (payload.clientName) ob.clientName = payload.clientName;
        ob.updatedAt = Date.now();
    }
    saveDb(db);
    res.json(ob);
});

// Helper for step retrieval in mock server
const getMockStep = (ob, stepKey) => {
    if (stepKey === 'rons' && !ob.stepRons) {
        ob.stepRons = { key: 'rons', title: 'Register of Nominee Shareholders (RONS)', status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] };
    }
    switch (stepKey) {
        case 'document_checklist': return ob.stepDocumentChecklist;
        case 'director_details': return ob.step2DirectorDetails;
        case 'share_capital': return ob.stepShareCapital;
        case 'shareholder_details':
            if (!ob.stepShareholderDetails) ob.stepShareholderDetails = { key: 'shareholder_details', title: 'Shareholder Details', status: 'pending', data: {}, documents: [] };
            return ob.stepShareholderDetails;
        case 'individual_shareholder': return ob.step3IndividualShareholder;
        case 'corporate_shareholder': return ob.step4CorporateShareholder;
        case 'ubo': return ob.step5UBO;
        case 'corporate_rep': return ob.step6CorporateRep;
        case 'rons': return ob.stepRons;
        case 'final_declaration': return ob.step7FinalDeclaration;
        default: return null;
    }
};

// Helper for progress calculation in mock server
const calculateMockProgress = (ob) => {
    const statuses = [
        ob.stepDocumentChecklist.status,
        ob.step2DirectorDetails.status,
        ob.stepShareCapital.status,
        ob.stepShareholderDetails ? ob.stepShareholderDetails.status : 'pending',
        ob.step3IndividualShareholder.status,
        ob.step4CorporateShareholder.status,
        ob.step5UBO.status,
        ob.step6CorporateRep.status,
        ob.stepRons ? ob.stepRons.status : 'pending',
        ob.step7FinalDeclaration.status
    ];
    const approved = statuses.filter(s => s === 'approved').length;
    const submitted = statuses.filter(s => s === 'submitted' || s === 'under_review').length;
    return Math.floor(((approved * 100) + (submitted * 50)) / statuses.length);
};

// GET /api/onboarding → get all onboarding records for admin/staff review
app.get('/api/onboarding', (req, res) => {
    const db = getDb();
    res.json(db.onboarding || []);
});

// PATCH /api/onboarding/:id/step/:stepKey → update onboarding step details/status
app.patch('/api/onboarding/:id/step/:stepKey', (req, res) => {
    const db = getDb();
    const { id, stepKey } = req.params;
    const payload = req.body || {};

    const ob = db.onboarding.find(o => o.id === id);
    if (!ob) return res.status(404).json({ message: 'Onboarding record not found' });

    const step = getMockStep(ob, stepKey);
    if (!step) return res.status(400).json({ message: 'Unknown step key: ' + stepKey });

    if (payload.data) {
        step.data = { ...step.data, ...payload.data };
    }
    if (payload.status) {
        step.status = payload.status;
    }
    if (payload.documents) {
        step.documents = payload.documents;
    }

    ob.progressPercent = calculateMockProgress(ob);
    ob.updatedAt = Date.now();

    saveDb(db);
    res.json(ob);
});

// PATCH /api/onboarding/:id/step/:stepKey/review → admin/staff review of onboarding steps
app.patch('/api/onboarding/:id/step/:stepKey/review', (req, res) => {
    const db = getDb();
    const { id, stepKey } = req.params;
    const payload = req.body || {};

    const ob = db.onboarding.find(o => o.id === id);
    if (!ob) return res.status(404).json({ message: 'Onboarding record not found' });

    const step = getMockStep(ob, stepKey);
    if (!step) return res.status(400).json({ message: 'Unknown step key: ' + stepKey });

    if (payload.status) {
        step.status = payload.status;
    }
    step.reviewNotes = payload.notes || '';
    step.reviewedBy = payload.reviewedBy || 'Admin';
    step.reviewedAt = Date.now();

    ob.progressPercent = calculateMockProgress(ob);
    ob.updatedAt = Date.now();

    saveDb(db);
    res.json(ob);
});

// POST /api/onboarding/:id/activate → admin/staff portal activation
app.post('/api/onboarding/:id/activate', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const payload = req.body || {};

    const ob = db.onboarding.find(o => o.id === id);
    if (!ob) return res.status(404).json({ message: 'Onboarding record not found' });

    ob.portalActivated = true;
    ob.status = 'approved';
    ob.progressPercent = 100;
    ob.activatedBy = payload.activatedBy || 'Admin';
    ob.activatedAt = Date.now();
    ob.updatedAt = Date.now();

    if (!ob.auditLogs) ob.auditLogs = [];
    ob.auditLogs.push(`Client portal activated by ${ob.activatedBy} at ${new Date()}`);

    saveDb(db);
    res.json(ob);
});

// POST /api/onboarding/ocr-extract → simulate OCR extraction
app.post('/api/onboarding/ocr-extract', (req, res) => {
    const { type } = req.body || {};
    const extracted = {};
    if (type === 'nric' || type === 'fin') {
        const randomId = 1000000 + Math.floor(Math.random() * 9000000);
        Object.assign(extracted, {
            fullName: `MOCK NAME ${randomId}`,
            idNumber: `S${randomId}G`,
            nationality: "SINGAPOREAN",
            gender: "Male",
            dateOfBirth: "1980-01-01",
            residentialAddress: "BLK 123 Ang Mo Kio Ave 4 #05-67, Singapore 560123",
            email: "",
            mobile: ""
        });
    } else if (type === 'bizfile') {
        Object.assign(extracted, {
            companyName: "GRAAS PTE. LTD.",
            uen: "201538449N",
            dateOfIncorporation: "2015-10-22",
            registeredAddress: "8 CRAIG ROAD, #02-01, SINGAPORE 089668",
            principalActivity: "DEVELOPMENT OF SOFTWARE AND APPLICATIONS (EXCEPT GAMES AND CYBERSECURITY) (62011)",
            countryOfIncorporation: "Singapore",
            companyType: "PRIVATE COMPANY LIMITED BY SHARES",
            companyStatus: "LIVE COMPANY",
            formerName: "SELLINALL PTE. LTD.",
            dateOfChangeOfName: "2023-03-07",
            secondaryActivity: "WHOLESALE OF COMPUTER SOFTWARE (EXCEPT GAMES AND CYBERSECURITY SOFTWARE) (46512)",
            auditFirm: "GRANT THORNTON AUDIT LLP",
            numberOfShares: 1998815,
            shareCapitalAmount: 8297985.82,
            totalShares: 1998815,
            totalShareCapital: 8297985.82,
            fye: "31 DEC",
            currency: "SGD"
        });
    } else if (type === 'ubo_nric') {
        const randomId = 1000000 + Math.floor(Math.random() * 9000000);
        Object.assign(extracted, {
            uboName: `MOCK UBO ${randomId}`,
            uboIdNumber: `S${randomId}F`
        });
    } else if (type === 'ubo_address_proof') {
        Object.assign(extracted, {
            uboAddress: "12 MARINA BOULEVARD, #30-02, MBFC TOWER 3, SINGAPORE 018982",
            email: "client.representative@graas.ai",
            mobile: "+65 8765 4321"
        });
    }
    extracted.confidence = 0.94;
    extracted.extractedAt = Date.now();
    res.json(extracted);
});

app.post('/api/ocr/save', (req, res) => {
    const db = getDb();
    if (!db.ocrResults) db.ocrResults = [];
    const item = req.body || {};
    item.id = item.id || 'ocr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    item.createdAt = item.createdAt || Date.now();
    db.ocrResults.push(item);
    saveDb(db);
    res.json(item);
});

app.get('/api/ocr/all', (req, res) => {
    const db = getDb();
    res.json(db.ocrResults || []);
});

app.post('/api/ocr/:id/confirm', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const item = (db.ocrResults || []).find(r => r.id === id);
    if (item) {
        item.reviewedByClient = true;
        item.status = 'COMPLETE';
        saveDb(db);
        res.json({ success: true, item });
    } else {
        res.status(404).json({ message: 'OCR result not found' });
    }
});

app.get('/api/requirements/all-drafts', (req, res) => {
    const db = getDb();
    res.json(db.requirements || []);
});

app.post('/api/ocr/save-corrected', (req, res) => {
    const db = getDb();
    const { id, fieldPath, userId, correctedFields } = req.body || {};
    
    // 1. Update OCR record
    const ocrItem = (db.ocrResults || []).find(r => r.id === id);
    if (ocrItem) {
        ocrItem.extractedFields = { ...ocrItem.extractedFields, ...correctedFields };
        ocrItem.status = 'COMPLETE';
        ocrItem.reviewedByClient = true;
    }
    
    // 2. Update Onboarding step if exist
    const onboardingItem = (db.onboarding || []).find(o => o.clientId === userId || o.id === userId || o.clientEmail === userId);
    if (onboardingItem) {
        const parts = fieldPath.split('.');
        let current = onboardingItem;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]]) {
                current = current[parts[i]];
            }
        }
        const lastPart = parts[parts.length - 1];
        if (current && current[lastPart]) {
            Object.entries(correctedFields).forEach(([k, v]) => {
                current[lastPart][k] = v.value;
            });
            const stepKey = fieldPath.includes('step2DirectorDetails') ? 'director_details' : 
                            fieldPath.includes('step3IndividualShareholder') ? 'individual_shareholder' :
                            fieldPath.includes('step4CorporateShareholder') ? 'corporate_shareholder' :
                            fieldPath.includes('step6CorporateRep') ? 'corporate_rep' : '';
            if (stepKey) {
                const s = getMockStep(onboardingItem, stepKey);
                if (s) s.status = 'approved';
            }
        }
    }
    
    // 3. Update Pre-Reg requirements if exist
    const reqDraft = (db.requirements || []).find(r => r.userId === userId);
    if (reqDraft && reqDraft.data) {
        const parts = fieldPath.split('.');
        let current = reqDraft.data;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]]) {
                current = current[parts[i]];
            }
        }
        const lastPart = parts[parts.length - 1];
        if (current && current[lastPart]) {
            Object.entries(correctedFields).forEach(([k, v]) => {
                current[lastPart][k] = v.value;
            });
        }
    }
    
    saveDb(db);
    res.json({ success: true, ocrItem });
});
    const db = getDb();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const parts = token.split('-');
    let userId = parts[parts.length - 1];
    if (parts.length >= 2 && parts[parts.length - 2] === 'usr') {
        userId = 'usr-' + userId;
    }

    const initialLength = (db.requirements || []).length;
    if (db.requirements) {
        db.requirements = db.requirements.filter(r => r.userId !== userId);
    }

    if ((db.requirements || []).length !== initialLength) {
        saveDb(db);
        res.json({ message: 'Requirement deleted successfully' });
    } else {
        res.status(404).json({ message: 'Requirement not found' });
    }
});

app.listen(port, () => {
    console.log(`Backend API running on http://localhost:${port}`);
});

// --- MESSAGING ENDPOINTS ---
app.get('/api/messages', (req, res) => {
    const db = getDb();
    const { clientId } = req.query;
    let filtered = db.messages || [];
    if (clientId) {
        filtered = filtered.filter(m => m.clientId === clientId);
    }
    res.json(filtered);
});

app.post('/api/messages', (req, res) => {
    const db = getDb();
    const newMessage = {
        id: 'msg-' + Date.now(),
        isRead: false,
        ...req.body,
        timestamp: Date.now()
    };
    if (!db.messages) db.messages = [];
    db.messages.push(newMessage);
    saveDb(db);
    res.status(201).json(newMessage);
});

app.patch('/api/messages/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const index = db.messages ? db.messages.findIndex(m => m.id === id) : -1;
    if (index !== -1) {
        db.messages[index] = { ...db.messages[index], ...req.body };
        saveDb(db);
        res.json(db.messages[index]);
    } else {
        res.status(404).json({ error: 'Message not found' });
    }
});

app.post('/api/messages/read-all', (req, res) => {
    const db = getDb();
    const { clientId, senderRole, userId } = req.query;
    
    if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
    }
    
    let changed = false;
    if (db.messages && Array.isArray(db.messages)) {
        db.messages.forEach(m => {
            if (m.clientId === clientId) {
                if (userId) {
                    if (m.senderId !== userId && !m.isRead) {
                        m.isRead = true;
                        changed = true;
                    }
                } else if (senderRole) {
                    if (senderRole === 'client') {
                        if ((m.senderRole === 'admin' || m.senderRole === 'staff') && !m.isRead) {
                            m.isRead = true;
                            changed = true;
                        }
                    } else {
                        if (m.senderRole === 'client' && !m.isRead) {
                            m.isRead = true;
                            changed = true;
                        }
                    }
                } else {
                    if (!m.isRead) {
                        m.isRead = true;
                        changed = true;
                    }
                }
            }
        });
    }
    
    if (changed) {
        saveDb(db);
    }
    
    res.json({ success: true, changed });
});

// GET /api/messages/conversations - For Admin/Staff to see list of chats
app.get('/api/messages/conversations', (req, res) => {
    const db = getDb();
    const messages = db.messages || [];
    const conversations = {};
    
    messages.forEach(m => {
        if (!conversations[m.clientId] || m.timestamp > conversations[m.clientId].lastMessageTime) {
            const client = db.clients.find(c => c.clientId === m.clientId);
            const clientMsgs = messages.filter(msg => msg.clientId === m.clientId);
            const unreadCount = clientMsgs.filter(msg => msg.senderRole === 'client' && !msg.isRead).length;
            
            conversations[m.clientId] = {
                clientId: m.clientId,
                clientName: client ? client.name : 'Unknown',
                lastMessage: m.text,
                lastMessageTime: m.timestamp,
                unreadCount: unreadCount
            };
        }
    });
    
    res.json(Object.values(conversations).sort((a, b) => b.lastMessageTime - a.lastMessageTime));
});

// --- COUNTRIES ENDPOINTS ---
app.get('/api/countries', (req, res) => {
    const db = getDb();
    const sorted = [...db.countries].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    res.json(sorted);
});

app.post('/api/countries', (req, res) => {
    const db = getDb();
    const newCountry = req.body;
    if (!newCountry.id) {
        newCountry.id = "CNTRY-" + Date.now();
    }
    if (newCountry.orderIndex === undefined) {
        newCountry.orderIndex = db.countries.length;
    }
    db.countries.push(newCountry);
    saveDb(db);
    res.status(201).json(newCountry);
});

app.put('/api/countries/reorder', (req, res) => {
    const db = getDb();
    const { orderedIds } = req.body;
    if (orderedIds && Array.isArray(orderedIds)) {
        orderedIds.forEach((id, index) => {
            const country = db.countries.find(c => c.id === id);
            if (country) {
                country.orderIndex = index;
            }
        });
        saveDb(db);
    }
    const sorted = [...db.countries].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    res.json(sorted);
});

app.put('/api/countries/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.countries.findIndex(c => c.id === id);
    if (index !== -1) {
        db.countries[index] = { ...db.countries[index], ...req.body };
        saveDb(db);
        res.json(db.countries[index]);
    } else {
        res.status(404).json({ error: 'Country not found' });
    }
});

app.delete('/api/countries/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    db.countries = db.countries.filter(c => c.id !== id);
    saveDb(db);
    res.status(204).send();
});

// --- SSIC ENDPOINTS ---
app.get('/api/ssic-activities', (req, res) => {
    const db = getDb();
    let list = db.ssicActivities || [];
    
    // Filter out archived unless explicitly requested
    if (req.query.includeArchived !== 'true') {
        list = list.filter(a => !a.isArchived);
    }
    
    // Sort by orderIndex ascending, fallback to code ascending
    const sorted = [...list].sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? a.orderIndex : 999999;
        const orderB = b.orderIndex !== undefined ? b.orderIndex : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.code || '').localeCompare(b.code || '');
    });
    res.json(sorted);
});

app.get('/api/ssic-activities/published', (req, res) => {
    const db = getDb();
    const published = (db.ssicActivities || [])
        .filter(a => a.status === 'PUBLISHED' && !a.isArchived)
        .sort((a, b) => {
            const orderA = a.orderIndex !== undefined ? a.orderIndex : 999999;
            const orderB = b.orderIndex !== undefined ? b.orderIndex : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.code || '').localeCompare(b.code || '');
        });
    res.json(published);
});

app.post('/api/ssic-activities', (req, res) => {
    const db = getDb();
    if (!db.ssicActivities) db.ssicActivities = [];
    
    const { code, name } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: 'Code and name are required' });
    }
    
    const maxOrder = db.ssicActivities.reduce((max, a) => Math.max(max, a.orderIndex !== undefined ? a.orderIndex : 0), 0);
    
    const newActivity = {
        id: "ssic-" + Date.now(),
        status: "DRAFT",
        version: 1,
        history: [],
        isArchived: false,
        orderIndex: maxOrder + 1,
        lastUpdatedBy: req.body.lastUpdatedBy || "Admin",
        lastUpdatedAt: Date.now(),
        ...req.body
    };
    
    db.ssicActivities.push(newActivity);
    saveDb(db);
    res.status(201).json(newActivity);
});

app.put('/api/ssic-activities/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.ssicActivities ? db.ssicActivities.findIndex(a => a.id === id) : -1;
    if (index !== -1) {
        const existing = db.ssicActivities[index];
        
        // Exclude auditing fields when checking for modifications
        const auditKeys = ['id', 'history', 'version', 'lastUpdatedBy', 'lastUpdatedAt', 'orderIndex', 'isArchived'];
        let hasChanges = false;
        for (const key of Object.keys(req.body)) {
            if (auditKeys.includes(key)) continue;
            if (req.body[key] !== existing[key]) {
                hasChanges = true;
                break;
            }
        }
        
        if (hasChanges) {
            const prevVersion = existing.version || 1;
            const historyEntry = {
                version: prevVersion,
                updatedBy: existing.lastUpdatedBy || "Admin",
                updatedAt: existing.lastUpdatedAt || Date.now(),
                state: {
                    code: existing.code,
                    name: existing.name,
                    category: existing.category,
                    description: existing.description,
                    sectionCode: existing.sectionCode,
                    sectionName: existing.sectionName,
                    divisionCode: existing.divisionCode,
                    divisionName: existing.divisionName,
                    groupCode: existing.groupCode,
                    groupName: existing.groupName,
                    classCode: existing.classCode,
                    className: existing.className,
                    keywords: existing.keywords,
                    synonyms: existing.synonyms,
                    abbreviations: existing.abbreviations,
                    status: existing.status
                }
            };
            if (!existing.history) existing.history = [];
            existing.history.push(historyEntry);
            
            db.ssicActivities[index] = {
                ...existing,
                ...req.body,
                version: prevVersion + 1,
                lastUpdatedBy: req.body.lastUpdatedBy || "Admin",
                lastUpdatedAt: Date.now()
            };
        } else {
            // Just update orderIndex or simple non-content field if sent
            db.ssicActivities[index] = {
                ...existing,
                ...req.body
            };
        }
        
        saveDb(db);
        res.json(db.ssicActivities[index]);
    } else {
        res.status(404).json({ error: 'SSIC Activity not found' });
    }
});

app.delete('/api/ssic-activities/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.ssicActivities ? db.ssicActivities.findIndex(a => a.id === id) : -1;
    if (index !== -1) {
        db.ssicActivities[index].isArchived = true;
        db.ssicActivities[index].status = 'ARCHIVED';
        db.ssicActivities[index].lastUpdatedBy = "Admin";
        db.ssicActivities[index].lastUpdatedAt = Date.now();
        saveDb(db);
        res.json(db.ssicActivities[index]);
    } else {
        res.status(404).json({ error: 'SSIC Activity not found' });
    }
});

app.post('/api/ssic-activities/:id/publish', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.ssicActivities ? db.ssicActivities.findIndex(a => a.id === id) : -1;
    if (index !== -1) {
        db.ssicActivities[index].status = 'PUBLISHED';
        db.ssicActivities[index].lastUpdatedBy = "Admin";
        db.ssicActivities[index].lastUpdatedAt = Date.now();
        saveDb(db);
        res.json(db.ssicActivities[index]);
    } else {
        res.status(404).json({ error: 'SSIC Activity not found' });
    }
});

app.post('/api/ssic-activities/:id/unpublish', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.ssicActivities ? db.ssicActivities.findIndex(a => a.id === id) : -1;
    if (index !== -1) {
        db.ssicActivities[index].status = 'UNPUBLISHED';
        db.ssicActivities[index].lastUpdatedBy = "Admin";
        db.ssicActivities[index].lastUpdatedAt = Date.now();
        saveDb(db);
        res.json(db.ssicActivities[index]);
    } else {
        res.status(404).json({ error: 'SSIC Activity not found' });
    }
});

// --- SSIC EXTENSIONS (IMPORT & REORDER) ---
app.post('/api/ssic-activities/import', (req, res) => {
    const db = getDb();
    const imported = req.body.activities;
    if (!Array.isArray(imported)) {
        return res.status(400).json({ error: 'Invalid payload: activities array required' });
    }
    if (!db.ssicActivities) db.ssicActivities = [];
    
    let addedCount = 0;
    let updatedCount = 0;
    
    imported.forEach(item => {
        if (!item.code) return;
        const index = db.ssicActivities.findIndex(a => a.code === item.code);
        if (index !== -1) {
            // Update existing with draft version
            const existing = db.ssicActivities[index];
            const prevVersion = existing.version || 1;
            
            // Check for changes
            const auditKeys = ['id', 'history', 'version', 'lastUpdatedBy', 'lastUpdatedAt', 'orderIndex', 'isArchived'];
            let hasChanges = false;
            for (const key of Object.keys(item)) {
                if (auditKeys.includes(key)) continue;
                if (item[key] !== existing[key]) {
                    hasChanges = true;
                    break;
                }
            }
            
            if (hasChanges) {
                const historyEntry = {
                    version: prevVersion,
                    updatedBy: existing.lastUpdatedBy || "Admin",
                    updatedAt: existing.lastUpdatedAt || Date.now(),
                    state: {
                        code: existing.code,
                        name: existing.name,
                        category: existing.category,
                        description: existing.description,
                        sectionCode: existing.sectionCode,
                        sectionName: existing.sectionName,
                        divisionCode: existing.divisionCode,
                        divisionName: existing.divisionName,
                        groupCode: existing.groupCode,
                        groupName: existing.groupName,
                        classCode: existing.classCode,
                        className: existing.className,
                        keywords: existing.keywords,
                        synonyms: existing.synonyms,
                        abbreviations: existing.abbreviations,
                        status: existing.status
                    }
                };
                if (!existing.history) existing.history = [];
                existing.history.push(historyEntry);
                
                db.ssicActivities[index] = {
                    ...existing,
                    ...item,
                    version: prevVersion + 1,
                    status: 'DRAFT', // draft status for safety/review
                    isArchived: false,
                    lastUpdatedBy: "Import Utility",
                    lastUpdatedAt: Date.now()
                };
                updatedCount++;
            }
        } else {
            // Add new as Draft
            const maxOrder = db.ssicActivities.reduce((max, a) => Math.max(max, a.orderIndex !== undefined ? a.orderIndex : 0), 0);
            const newActivity = {
                id: "ssic-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                status: "DRAFT",
                version: 1,
                history: [],
                isArchived: false,
                orderIndex: maxOrder + 1,
                lastUpdatedBy: "Import Utility",
                lastUpdatedAt: Date.now(),
                ...item
            };
            db.ssicActivities.push(newActivity);
            addedCount++;
        }
    });
    
    saveDb(db);
    res.json({ success: true, added: addedCount, updated: updatedCount });
});

app.post('/api/ssic-activities/reorder', (req, res) => {
    const db = getDb();
    const orderedIds = req.body;
    if (orderedIds && Array.isArray(orderedIds)) {
        orderedIds.forEach((id, index) => {
            const aIdx = db.ssicActivities.findIndex(a => a.id === id);
            if (aIdx !== -1) {
                db.ssicActivities[aIdx].orderIndex = index;
            }
        });
        saveDb(db);
        res.status(200).send();
    } else {
        res.status(400).json({ error: 'Invalid payload' });
    }
});

app.get('/api/prereg-sections', (req, res) => {
    const db = getDb();
    const journey = req.query.journeyType || 'LOCAL';
    let filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === journey);
    if (filtered.length === 0 && journey === 'FOREIGNER') {
        filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === 'LOCAL');
    }
    const sorted = [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    res.json(sorted);
});

app.get('/api/prereg-sections/published', (req, res) => {
    const db = getDb();
    const journey = req.query.journeyType || 'LOCAL';
    let filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === journey);
    if (filtered.length === 0 && journey === 'FOREIGNER') {
        filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === 'LOCAL');
    }
    const sorted = [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const published = sorted
        .filter(s => s.status === 'PUBLISHED' && s.publishedData)
        .map(s => s.publishedData);
    res.json(published);
});

app.get('/api/prereg-sections/preview', (req, res) => {
    const db = getDb();
    const journey = req.query.journeyType || 'LOCAL';
    let filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === journey);
    if (filtered.length === 0 && journey === 'FOREIGNER') {
        filtered = (db.preregSections || []).filter(s => (s.journeyType || 'LOCAL') === 'LOCAL');
    }
    const sorted = [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const preview = sorted.filter(s => s.status !== 'UNPUBLISHED');
    res.json(preview);
});

app.post('/api/prereg-sections', (req, res) => {
    const db = getDb();
    if (!db.preregSections) db.preregSections = [];
    const maxOrder = db.preregSections.reduce((max, s) => Math.max(max, s.sortOrder || 0), 0);
    
    const newSection = {
        id: "prereg-" + Date.now(),
        status: "DRAFT",
        sortOrder: maxOrder + 1,
        lastUpdatedBy: "Admin",
        lastUpdatedAt: Date.now(),
        fields: [],
        documents: [],
        checklists: [],
        attachments: [],
        faqs: [],
        publishedData: null,
        ...req.body
    };
    db.preregSections.push(newSection);
    saveDb(db);
    res.status(201).json(newSection);
});

app.put('/api/prereg-sections/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.preregSections ? db.preregSections.findIndex(s => s.id === id) : -1;
    if (index !== -1) {
        const existing = db.preregSections[index];
        const wasPublished = existing.status === 'PUBLISHED';
        
        const updates = { ...req.body };
        if (id.startsWith('sec-')) {
            delete updates.key;
        }

        db.preregSections[index] = {
            ...existing,
            ...updates,
            lastUpdatedBy: "Admin",
            lastUpdatedAt: Date.now()
        };

        if (wasPublished) {
            db.preregSections[index].status = 'PUBLISHED';
            db.preregSections[index].publishedData = {
                id: db.preregSections[index].id,
                key: db.preregSections[index].key,
                title: db.preregSections[index].title,
                description: db.preregSections[index].description,
                type: db.preregSections[index].type,
                sortOrder: db.preregSections[index].sortOrder,
                fields: db.preregSections[index].fields,
                applicableServices: db.preregSections[index].applicableServices || "All",
                checklists: db.preregSections[index].checklists || [],
                faqs: db.preregSections[index].faqs || [],
                attachments: db.preregSections[index].attachments || [],
                documents: db.preregSections[index].documents || []
            };
        } else {
            db.preregSections[index].status = 'DRAFT';
        }

        saveDb(db);
        res.json(db.preregSections[index]);
    } else {
        res.status(404).json({ error: 'Section not found' });
    }
});

app.delete('/api/prereg-sections/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    if (db.preregSections) {
        db.preregSections = db.preregSections.filter(s => s.id !== id);
        saveDb(db);
        res.status(200).send();
    } else {
        res.status(404).json({ error: 'Section not found' });
    }
});

app.post('/api/prereg-sections/:id/publish', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.preregSections ? db.preregSections.findIndex(s => s.id === id) : -1;
    if (index !== -1) {
        const s = db.preregSections[index];
        s.status = 'PUBLISHED';
        s.lastUpdatedBy = "Admin";
        s.lastUpdatedAt = Date.now();
        s.publishedData = {
            id: s.id,
            key: s.key,
            title: s.title,
            description: s.description,
            type: s.type,
            sortOrder: s.sortOrder,
            fields: s.fields || [],
            applicableServices: s.applicableServices || "All",
            checklists: s.checklists || [],
            faqs: s.faqs || [],
            attachments: s.attachments || [],
            documents: s.documents || []
        };
        saveDb(db);
        res.json(s);
    } else {
        res.status(404).json({ error: 'Section not found' });
    }
});

app.post('/api/prereg-sections/:id/unpublish', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.preregSections ? db.preregSections.findIndex(s => s.id === id) : -1;
    if (index !== -1) {
        db.preregSections[index].status = 'UNPUBLISHED';
        db.preregSections[index].lastUpdatedBy = "Admin";
        db.preregSections[index].lastUpdatedAt = Date.now();
        saveDb(db);
        res.json(db.preregSections[index]);
    } else {
        res.status(404).json({ error: 'Section not found' });
    }
});

app.post('/api/prereg-sections/reorder', (req, res) => {
    const db = getDb();
    const orderIds = req.body;
    if (orderIds && Array.isArray(orderIds) && db.preregSections) {
        orderIds.forEach((id, index) => {
            const sIdx = db.preregSections.findIndex(s => s.id === id);
            if (sIdx !== -1) {
                db.preregSections[sIdx].sortOrder = index + 1;
                db.preregSections[sIdx].lastUpdatedBy = "Admin";
                db.preregSections[sIdx].lastUpdatedAt = Date.now();
                if (db.preregSections[sIdx].publishedData) {
                    db.preregSections[sIdx].publishedData.sortOrder = index + 1;
                }
            }
        });
        saveDb(db);
        res.status(200).send();
    } else {
        res.status(400).json({ error: 'Invalid payload' });
    }
});

// --- STAFF ENDPOINTS ---
app.get('/api/admin/staff', (req, res) => {
    const db = getDb();
    const staffList = db.users
        .filter(u => u.role === 'STAFF')
        .map(u => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            password: u.password // plain password, in mock it's raw
        }));
    res.json(staffList);
});

app.post('/api/admin/staff', (req, res) => {
    const db = getDb();
    const { firstName, lastName } = req.body;
    
    // Generate email: firstname.lastname@globalisor.com
    const baseEmail = (firstName + "." + lastName).toLowerCase().replace(/[^a-z0-9]/g, "");
    let email = baseEmail + "@globalisor.com";
    
    let suffix = 1;
    while (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        email = baseEmail + suffix + "@globalisor.com";
        suffix++;
    }
    
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const password = "Glob-" + randomNum;
    
    const newStaff = {
        id: "usr-" + Date.now(),
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        role: "STAFF"
    };
    
    db.users.push(newStaff);
    saveDb(db);
    
    res.status(201).json({
        id: newStaff.id,
        email: newStaff.email,
        password: newStaff.password,
        firstName: newStaff.firstName,
        lastName: newStaff.lastName
    });
});

app.put('/api/admin/staff/update', (req, res) => {
    const db = getDb();
    const { email, firstName, lastName } = req.body;
    
    const index = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'STAFF');
    if (index !== -1) {
        if (firstName) db.users[index].firstName = firstName;
        if (lastName) db.users[index].lastName = lastName;
        saveDb(db);
        res.json({
            id: db.users[index].id,
            email: db.users[index].email,
            firstName: db.users[index].firstName,
            lastName: db.users[index].lastName
        });
    } else {
        res.status(404).json({ error: 'Staff not found' });
    }
});

app.delete('/api/admin/staff/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const index = db.users.findIndex(u => u.id === id && u.role === 'STAFF');
    if (index !== -1) {
        db.users.splice(index, 1);
        saveDb(db);
        res.status(204).send();
    } else {
        res.status(404).json({ error: 'Staff not found' });
    }
});

// --- ADDITIONAL COLLABORATION ENDPOINTS (PRESENCE, USER DIRECTORY, GROUP CHATS) ---

app.get('/api/messages/users', (req, res) => {
    const db = getDb();
    const list = db.users.map(u => ({
        id: u.id,
        name: (u.firstName + ' ' + u.lastName).trim(),
        role: u.role,
        email: u.email
    }));
    res.json(list);
});

app.get('/api/messages/presence', (req, res) => {
    const { userId, role } = req.query;
    if (userId) {
        const status = userPresenceStatus[userId] || 'offline';
        res.json({
            userId,
            isOnline: status !== 'offline',
            status: status,
            lastSeen: Date.now() - 60000
        });
    } else if (role === 'support') {
        const db = getDb();
        const supportUsers = db.users.filter(u => u.role === 'ADMIN' || u.role === 'STAFF');
        const anyOnline = supportUsers.some(u => (userPresenceStatus[u.id] || 'offline') !== 'offline');
        res.json({
            isOnline: anyOnline,
            lastSeen: Date.now()
        });
    } else {
        res.json({ isOnline: false });
    }
});

app.post('/api/messages/presence', (req, res) => {
    const { userId, status } = req.body;
    if (userId && status) {
        userPresenceStatus[userId] = status;
        res.json({ success: true, userId, status });
    } else {
        res.status(400).json({ error: 'Missing userId or status' });
    }
});

app.get('/api/messages/groups', (req, res) => {
    const { userId } = req.query;
    const db = getDb();
    const groups = (db.groups || []).filter(g => !userId || g.memberIds.includes(userId));
    res.json(groups);
});

app.post('/api/messages/groups', (req, res) => {
    const db = getDb();
    const group = req.body;
    if (!group.id) {
        group.id = "group-" + Date.now();
    }
    if (!group.createdTime) {
        group.createdTime = Date.now();
    }
    if (!db.groups) db.groups = [];
    db.groups.push(group);
    saveDb(db);
    res.status(201).json(group);
});

app.put('/api/messages/groups/:id', (req, res) => {
    const db = getDb();
    const { name, description } = req.body;
    const index = db.groups.findIndex(g => g.id === req.params.id);
    if (index !== -1) {
        if (name) db.groups[index].name = name;
        if (description) db.groups[index].description = description;
        saveDb(db);
        res.json(db.groups[index]);
    } else {
        res.status(404).json({ error: 'Group not found' });
    }
});

app.post('/api/messages/groups/:id/members', (req, res) => {
    const db = getDb();
    const { userIds } = req.body;
    const index = db.groups.findIndex(g => g.id === req.params.id);
    if (index !== -1) {
        if (userIds && Array.isArray(userIds)) {
            userIds.forEach(uid => {
                if (!db.groups[index].memberIds.includes(uid)) {
                    db.groups[index].memberIds.push(uid);
                }
            });
            saveDb(db);
        }
        res.json(db.groups[index]);
    } else {
        res.status(404).json({ error: 'Group not found' });
    }
});

app.delete('/api/messages/groups/:id/members/:userId', (req, res) => {
    const db = getDb();
    const { id, userId } = req.params;
    const index = db.groups.findIndex(g => g.id === id);
    if (index !== -1) {
        db.groups[index].memberIds = db.groups[index].memberIds.filter(uid => uid !== userId);
        saveDb(db);
        res.json(db.groups[index]);
    } else {
        res.status(404).json({ error: 'Group not found' });
    }
});

app.get(/^\/admin(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});
