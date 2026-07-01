// Globalisor Client Portal - Enterprise SaaS Logic

const state = {
    user: null,
    currentTab: 'home',
    services: [],
    notifications: [],
    documents: [],
    blogs: [],
    invoices: [],
    catalog: [],
    compliance: null,
    staticContent: [],
    isAIActive: false
};

// Initialize Platform
document.addEventListener('DOMContentLoaded', async () => {
    // Session Recovery
    const authString = localStorage.getItem('client_auth');
    if (!authString) {
        window.location.href = '/login.html';
        return;
    }
    const auth = JSON.parse(authString);

    state.user = auth;
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.innerText = auth.name;
    }
    connectWebSocket();

    // Sequential Data Hydration
    await fetchData();

    // Check portal activation + apply freeze
    await checkPortalActivation();
    
    // Handle deep-linking via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab') || 'home';
    switchTab(targetTab);
    if (urlParams.get('open_ai') === 'true') {
        toggleAIAssistant();
    }
    
    // Lucide Init
    if (window.lucide) window.lucide.createIcons();
    
    // Entrance Animation
    gsap.from("aside", { x: -100, opacity: 0, duration: 1, ease: "power4.out" });
    gsap.from("header", { y: -20, opacity: 0, duration: 1, delay: 0.3, ease: "power4.out" });

    window.addEventListener('appSeqMapUpdated', () => {
        if (state.currentTab === 'services') {
            const view = document.getElementById('main-view');
            renderServices(view);
        }
    });

    // Listen for portal_activated websocket event
    window.addEventListener('ws_portal_activated', () => {
        state.portalActivated = true;
        applyPortalFreezeUI(true);
    });
});

async function fetchData() {
    try {
        // Fetch Services
        const sRes = await fetch(`/api/clients/${state.user.id}/services`);
        if (sRes.ok) {
            const sData = await sRes.json();
            state.services = sData.services.map(s => ({
                id: s.serviceId,
                type: s.serviceType,
                status: s.status === 'pending' ? 'In Progress' : (s.status === 'approved' ? 'Active' : s.status),
                progress: s.status === 'approved' ? 100 : (s.status === 'review' ? 65 : 30),
                company: s.companyName || 'Globalisor Entity',
                date: s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
                staff: (!s.staff || s.staff.toLowerCase() === 'sarah lim' || s.staff.toLowerCase() === 'unassigned') ? 'Unassigned' : s.staff
            }));
        }

        // Fetch Intelligence Feed
        try {
            const bRes = await fetch('/api/blogs');
            if (bRes.ok) {
                const allBlogs = await bRes.json() || [];
                const filtered = allBlogs.filter(b => b.published || b.status === 'published');
                const getBlogTime = (b) => {
                    if (b.lastModified) return b.lastModified;
                    if (b.date) {
                        const parsed = Date.parse(b.date);
                        if (!isNaN(parsed)) return parsed;
                    }
                    return 0;
                };
                state.blogs = filtered.sort((a, b) => getBlogTime(b) - getBlogTime(a));
            } else {
                throw new Error("API response not ok");
            }
        } catch (blogErr) {
            console.warn('REST API blogs endpoint offline, loading from localStorage fallback:', blogErr);
            const cached = localStorage.getItem('admin_blogs');
            if (cached) {
                try {
                    const allBlogs = JSON.parse(cached) || [];
                    const filtered = allBlogs.filter(b => b.published || b.status === 'published');
                    const getBlogTime = (b) => {
                        if (b.lastModified) return b.lastModified;
                        if (b.date) {
                            const parsed = Date.parse(b.date);
                            if (!isNaN(parsed)) return parsed;
                        }
                        return 0;
                    };
                    state.blogs = filtered.sort((a, b) => getBlogTime(b) - getBlogTime(a));
                } catch(e) {
                    state.blogs = [];
                }
            } else {
                state.blogs = [
                    {
                        id: "default-incorporation",
                        title: "Navigating Singapore Startup Incorporation",
                        category: "Compliance",
                        description: "A complete step-by-step walkthrough on incorporation requirements, nominee directors, and local secretarial guidelines.",
                        excerpt: "A complete step-by-step walkthrough on incorporation requirements, nominee directors, and local secretarial guidelines.",
                        content: "<p>Incorporating a startup in Singapore is a popular choice for founders globally due to the country's business-friendly policies, attractive tax structures, and robust intellectual property protections.</p><p>In this guide, we cover structural setups, ACRA requirements, nominee directors, and statutory registration processes to get you running in hours.</p>",
                        coverImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
                        author: "Admin Team",
                        date: "28 May 2026",
                        status: "published",
                        published: true
                    },
                    {
                        id: "default-tax",
                        title: "Understanding Corporate Tax Benefits & Rates",
                        category: "Corporate Tax",
                        description: "Learn how the single-tier territorial tax system and startup exemptions can optimize your company's effective tax liability.",
                        excerpt: "Learn how the single-tier territorial tax system and startup exemptions can optimize your company's effective tax liability.",
                        content: "<p>Singapore corporate tax rates are capped flat at 17%. Thanks to tax exemptions for new startups and partial tax exemptions, the effective tax rate is often significantly lower.</p>",
                        coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c",
                        author: "Tax Advisory",
                        date: "24 May 2026",
                        status: "published",
                        published: true
                    }
                ];
            }
        }

        // Fetch Notifications
        await fetchNotifications();

        // Hydrate Invoices
        const iRes = await fetch(`/api/clients/${state.user.id}/invoices`);
        if (iRes.ok) state.invoices = await iRes.json();

        // Hydrate Documents from KYC
        const kRes = await fetch('/api/kyc');
        if (kRes.ok) {
            const kycList = await kRes.json();
            const clientKYC = kycList.find(k => k.clientId === state.user.id);
            state.kyc = clientKYC;
            if (clientKYC && clientKYC.documents) {
                state.documents = clientKYC.documents.map(d => ({
                    name: d.name,
                    status: d.status,
                    category: d.type || 'Identity',
                    expiry: d.expiry || 'N/A',
                    date: d.uploadedAt || '2026-05-11'
                }));
            }
        }
        // Hydrate Catalog
        const cRes = await fetch('/api/catalog');
        if (cRes.ok) state.catalog = await cRes.json();

        // Hydrate Compliance Status
        const cpRes = await fetch('/api/compliance');
        if (cpRes.ok) {
            const cpList = await cpRes.json();
            state.compliance = cpList.find(c => c.clientId === state.user.id);
        }

        // Fetch Static Content
        const scRes = await fetch('/api/static-content?portal=client');
        if (scRes.ok) state.staticContent = await scRes.json();

        // Fetch Published Onboarding Steps Configuration
        try {
            const osRes = await fetch('/api/onboarding-config/published');
            if (osRes.ok) {
                const osData = await osRes.json();
                if (osData && osData.length > 0) {
                    ONBOARDING_STEPS = osData;
                }
            }
        } catch (osErr) {
            console.error('Error fetching onboarding steps configuration:', osErr);
        }
    } catch (e) {
        console.error('Core Data Hydration Failed:', e);
    }
}

async function fetchNotifications() {
    const nRes = await fetch(`/api/notifications?clientId=${state.user.id}`);
    if (nRes.ok) {
        state.notifications = await nRes.json();
        updateNotificationUI();
    }
}

function updateNotificationUI() {
    const badge = document.getElementById('notif-badge');
    const unread = state.notifications.filter(n => !n.readBy.includes(state.user.id));
    
    if (badge) {
        if (unread.length > 0) {
            badge.innerText = unread.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    const list = document.getElementById('notif-list');
    if (!list) return;
    
    if (state.notifications.length === 0) {
        list.innerHTML = '<div class="p-10 text-center text-slate-400 text-sm">No new blog updates</div>';
        return;
    }

    list.innerHTML = state.notifications.map(n => {
        const isRead = n.readBy.includes(state.user.id);
        return `
            <div class="p-5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-all ${isRead ? '' : 'bg-blue-50/30'}" onclick="handleNotifClick('${n.id}', '${n.type}', '${n.relatedId}')">
                <div class="flex gap-4">
                    <div class="mt-1 w-2 h-2 shrink-0 rounded-full bg-blue-600 ${isRead ? 'opacity-0' : ''}"></div>
                    <div>
                        <div class="text-sm font-bold text-slate-900">${n.title}</div>
                        <div class="text-xs text-slate-500 mt-1 leading-relaxed">${n.message}</div>
                        <div class="flex items-center gap-2 mt-3">
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            ${!isRead ? '<span class="w-1 h-1 rounded-full bg-slate-300"></span><span class="text-[9px] font-bold text-blue-600 uppercase tracking-widest">New</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Portal freeze/lock state
state.portalActivated = false;
state.onboardingData = null;

async function checkPortalActivation() {
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}/status`);
        if (res.ok) {
            const data = await res.json();
            state.portalActivated = data.portalActivated === true;
            state.onboardingStatus = data.status || 'not_started';
            state.onboardingProgress = data.progressPercent || 0;
            state.onboardingId = data.onboardingId;
        }
    } catch(e) {
        state.portalActivated = false;
    }
    applyPortalFreezeUI(state.portalActivated);
}

function applyPortalFreezeUI(activated) {
    const LOCKED_TABS = ['services', 'billing', 'guidance', 'updates'];
    LOCKED_TABS.forEach(tab => {
        const btn = document.getElementById('nav-' + tab);
        if (!btn) return;
        if (activated) {
            btn.classList.remove('portal-locked-btn');
            btn.style.opacity = '';
            btn.style.cursor = '';
            btn.title = '';
        } else {
            btn.classList.add('portal-locked-btn');
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
            btn.title = 'Available after portal activation';
        }
    });

    // Show/hide freeze banner
    const existing = document.getElementById('portal-freeze-banner');
    if (!activated && !existing) {
        const banner = document.createElement('div');
        banner.id = 'portal-freeze-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:900;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:10px 24px;display:flex;align-items:center;justify-center;gap:12px;font-family:Outfit,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.01em;border-top:1px solid rgba(255,255,255,0.1);';
        banner.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style="color:#93c5fd;margin-right:4px;">Onboarding in progress —</span>
            The remaining portal sections will be available after Globalisor completes verification and activation.
            <button onclick="state.activeObStepKey = 'document_checklist'; switchTab('onboarding')" style="margin-left:auto;padding:4px 14px;background:#3b82f6;border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Complete Onboarding →</button>
        `;
        document.body.appendChild(banner);
    } else if (activated && existing) {
        existing.remove();
    }
}

function switchTab(tab) {
    // Block locked tabs if portal not yet activated
    const LOCKED_TABS = ['services', 'billing', 'guidance', 'updates'];
    if (!state.portalActivated && LOCKED_TABS.includes(tab)) {
        const view = document.getElementById('main-view');
        view.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;">
                <div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
                    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#3b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='11' x='3' y='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
                </div>
                <h2 style="font-family:Outfit,sans-serif;font-size:22px;font-weight:800;color:#0f172a;margin-bottom:12px;">Section Locked</h2>
                <p style="font-size:14px;color:#64748b;max-width:420px;line-height:1.7;margin-bottom:28px;">
                    The remaining portal sections will be available after Globalisor completes verification and activation.
                </p>
                <button onclick="state.activeObStepKey = 'document_checklist'; switchTab('onboarding')" style="padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#fff;border:none;border-radius:14px;font-family:Outfit,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(59,130,246,0.3);">
                    Complete Your Onboarding
                </button>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    state.currentTab = tab;
    
    // Sync Navigation UI
    document.querySelectorAll('.nav-btn, .nav-mobile-btn, .module-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id && btn.id.includes(tab));
    });
    if (window.updateClientSidebarActive) {
        window.updateClientSidebarActive(tab);
    }

    const view = document.getElementById('main-view');
    const title = document.getElementById('page-title');

    // Section Routing
    switch(tab) {
        case 'home': title.innerText = 'Client Dashboard'; renderHome(view); break;
        case 'onboarding': title.innerText = 'Onboarding Journey'; renderOnboarding(view); break;
        case 'services': title.innerText = 'Active Workflows'; renderServices(view); break;
        case 'updates': title.innerText = ''; renderUpdates(view); break;
        case 'documents': title.innerText = 'Compliance Vault'; renderDocuments(view); break;
        case 'requests': title.innerText = 'Service Marketplace'; renderRequests(view); break;
        case 'billing': title.innerText = 'Financial Operations'; renderBilling(view); break;
        case 'guidance': title.innerText = 'Platform Guidance'; renderGuidance(view); break;
        case 'messages': title.innerText = 'Support Desk'; renderMessages(view); break;
        case 'profile': title.innerText = 'Executive Profile'; renderProfile(view); break;
    }
    
    // Hide title element if empty to save space
    const header = document.getElementById('global-header');
    if (!title.innerText) {
        title.classList.add('hidden');
        if (header) header.classList.replace('mb-10', 'mb-2');
    } else {
        title.classList.remove('hidden');
        if (header) header.classList.replace('mb-2', 'mb-10');
    }
    
    // Scroll Logic
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Animate view entry
    gsap.from(view, { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" });
    
    if (window.lucide) window.lucide.createIcons();
}

// --- View Renderers ---

function getStepRequiredDocs(stepKey, data) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return [];
    
    const docs = step.requiredDocs || [];
    return docs.filter(doc => {
        if (doc.conditionalOn) {
            const condVal = data[doc.conditionalOn];
            return condVal && String(condVal).trim() === String(doc.conditionalValue).trim();
        }
        return true;
    });
}

function getStepManualFields(stepKey, data) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return [];
    
    const fields = step.manualFields || [];
    return fields.filter(field => {
        if (field.conditionalOn) {
            const condVal = data[field.conditionalOn];
            return condVal && String(condVal).trim() === String(field.conditionalValue).trim();
        }
        return true;
    });
}

function normalizeOnboardingData(ob) {
    if (!ob) return ob;
    if (ob.dynamicSteps) {
        Object.entries(ob.dynamicSteps).forEach(([key, step]) => {
            if (key === 'document_checklist') {
                ob.stepDocumentChecklist = step;
            } else if (key === 'share_capital') {
                ob.stepShareCapital = step;
            } else {
                const targetKey = 'step' + key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (m, c) => c.toUpperCase());
                ob[targetKey] = step;
            }
        });
    }
    return ob;
}

const DEFAULT_ONBOARDING_STEPS = [
    {
        key: 'document_checklist',
        field: 'stepDocumentChecklist',
        title: 'Document Checklist',
        icon: 'clipboard-list',
        description: 'Please review the required documents based on your pre-registration selections.',
        requiredDocs: [],
        manualFields: []
    },
    {
        key: 'director_details',
        field: 'step2DirectorDetails',
        title: 'Director Details',
        icon: 'briefcase',
        description: 'Please upload NRIC/FIN and Address Proof, verify and confirm details.',
        requiredDocs: [
            { type: 'nric', label: 'NRIC / FIN' },
            { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
        ],
        manualFields: [
            { key: 'fullName', label: 'Full Legal Name', type: 'text' },
            { key: 'idNumber', label: 'NRIC / FIN', type: 'text' },
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
        dynamicSection: true,
        dynamicCountKey: 'directorCount'
    },
    {
        key: 'share_capital',
        field: 'stepShareCapital',
        title: 'Share Capital Details',
        icon: 'coins',
        description: 'Configure corporate share capital structure and allocate shares to shareholders.',
        requiredDocs: [],
        manualFields: []
    },
    {
        key: 'individual_shareholder',
        field: 'step3IndividualShareholder',
        title: 'Individual Shareholder Details',
        icon: 'users',
        description: 'Capture individual shareholder information. Ownership ≥ 25% will automatically trigger UBO and AML/KYC screening.',
        requiredDocs: [
            { type: 'nric', label: 'NRIC / FIN' },
            { type: 'address_proof', label: 'Address Proof (Utility Bill / Bank Statement / Mobile Bill)' }
        ],
        manualFields: [
            { key: 'sameAsDirector', label: 'Is individual shareholder same as director?', type: 'checkbox' },
            { key: 'fullName', label: 'Full Name', type: 'text' },
            { key: 'idNumber', label: 'NRIC / FIN', type: 'text' },
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
        dynamicSection: true,
        dynamicCountKey: 'individualShareholderCount'
    },
    {
        key: 'corporate_shareholder',
        field: 'step4CorporateShareholder',
        title: 'Corporate Shareholder Details',
        icon: 'building-2',
        description: 'Upload Bizfile and supporting documents for OCR extraction of company details.',
        requiredDocs: [
            { type: 'bizfile', label: 'Bizfile (ACRA)' },
            { type: 'constitution', label: 'Constitution / M&AA' },
            { type: 'cert_incorporation', label: 'Certificate of Incorporation (non-SG entities)', required: false },
            { type: 'supporting_docs', label: 'Supporting Corporate Documents', required: false }
        ],
        extractedFields: ['companyName','uen','dateOfIncorporation','registeredAddress'],
        manualFields: [
            { key: 'companyName', label: 'Company Name', type: 'text' },
            { key: 'uen', label: 'UEN / Reg Number', type: 'text' },
            { key: 'dateOfIncorporation', label: 'Date of Incorporation', type: 'date' },
            { key: 'registeredAddress', label: 'Registered Address', type: 'text' },
            { key: 'currency', label: 'Currency', type: 'select', options: ['SGD', 'USD'] },
            { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
            { key: 'numberOfSharesPct', label: 'Number of Shares (%)', type: 'number' },
            { key: 'shareCapitalAmountPct', label: 'Share Capital Amount (%)', type: 'number' },
            { key: 'numberOfShares', label: 'Number of Shares', type: 'number', readonly: true },
            { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number', readonly: true },
            { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
            { key: 'uboDeclaration', label: 'Is the Shareholder the Ultimate Beneficial Owner?', type: 'select', options: ['No', 'Yes'] }
        ],
        dynamicSection: true,
        dynamicCountKey: 'corporateShareholderCount'
    },
    {
        key: 'corporate_rep',
        field: 'step6CorporateRep',
        title: 'Corporate Representative',
        icon: 'user-cog',
        description: 'Upload NRIC/FIN and address proof for OCR extraction. Confirm contact details.',
        requiredDocs: [
            { type: 'nric', label: 'NRIC / FIN' },
            { type: 'address_proof', label: 'Address Proof' }
        ],
        extractedFields: ['fullName','idNumber','nationality','dateOfBirth'],
        manualFields: [
            { key: 'fullName', label: 'Full Legal Name', type: 'text' },
            { key: 'idNumber', label: 'NRIC / FIN', type: 'text' },
            { key: 'nationality', label: 'Nationality', type: 'nationality' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
            { key: 'email', label: 'Email Address', type: 'email' },
            { key: 'mobile', label: 'Mobile Number', type: 'phone' }
        ]
    },
    {
        key: 'final_declaration',
        field: 'step7FinalDeclaration',
        title: 'Final Declaration & Consent',
        icon: 'file-signature',
        description: 'Please review all details and declare final consent before submitting your application.',
        requiredDocs: [],
        manualFields: [
            { key: 'declarationAgreed', label: 'I confirm that all the details provided are true and accurate to the best of my knowledge.', type: 'checkbox' },
            { key: 'consentAgreed', label: 'I consent to Globalisor conducting compliance, AML/KYC screening, and verification checks.', type: 'checkbox' },
            { key: 'fye', label: 'Financial Year End (FYE)', type: 'date' }
        ],
        declaration: ''
    }
];

let ONBOARDING_STEPS = [...DEFAULT_ONBOARDING_STEPS];

async function renderOnboarding(container) {
    // Fetch latest onboarding data
    let ob = null;
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}`);
        if (res.ok) ob = await res.json();
    } catch(e) {}

    // Store in global state
    state.onboarding = normalizeOnboardingData(ob || {});
    state.onboardingId = ob && ob.id ? ob.id : null;
    
    // Fetch pre-registration requirements to initialize counts/lists
    let reqData = null;
    try {
        const token = localStorage.getItem('token');
        const reqRes = await fetch('/api/requirements', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (reqRes.ok) {
            const reqJson = await reqRes.json();
            reqData = reqJson.data;
            state.requirements = reqData;
        }
    } catch (e) {
        console.error("Failed to fetch requirements:", e);
    }
    
    if (reqData) {
        // Dynamically adjust ONBOARDING_STEPS
        const reqDirs = reqData.directors || [];
        const reqShs = reqData.shareholders || [];
        const reqInds = reqShs.filter(s => s.type === 'individual');
        const reqCorps = reqShs.filter(s => s.type === 'corporate');

        const indCount = reqInds.length;
        const corpCount = reqCorps.length;
        const dirCount = reqDirs.length;

        let filtered = [...DEFAULT_ONBOARDING_STEPS];
        if (corpCount > 0 && indCount === 0 && dirCount === 0) {
            filtered = filtered.filter(s => ['document_checklist', 'share_capital', 'corporate_shareholder', 'corporate_rep', 'final_declaration'].includes(s.key));
        } else if (indCount > 0 && corpCount === 0) {
            filtered = filtered.filter(s => !['corporate_shareholder', 'corporate_rep'].includes(s.key));
        } else {
            filtered = filtered.filter(s => {
                if (s.key === 'director_details' && dirCount === 0) return false;
                if (s.key === 'individual_shareholder' && indCount === 0) return false;
                if (s.key === 'corporate_shareholder' && corpCount === 0) return false;
                if (s.key === 'corporate_rep' && corpCount === 0) return false;
                return true;
            });
        }
        ONBOARDING_STEPS = filtered;

        let changed = false;
        
        // Initialize document_checklist
        if (!state.onboarding.stepDocumentChecklist) {
            state.onboarding.stepDocumentChecklist = { data: {}, status: 'pending', documents: [] };
        }
        // Initialize share_capital
        if (!state.onboarding.stepShareCapital) {
            state.onboarding.stepShareCapital = { data: { currencies: [] }, status: 'pending', documents: [] };
        } else if (!state.onboarding.stepShareCapital.data) {
            state.onboarding.stepShareCapital.data = { currencies: [] };
        } else if (!state.onboarding.stepShareCapital.data.currencies) {
            state.onboarding.stepShareCapital.data.currencies = [];
        }

        // Sync Share Capital
        const reqCapital = reqData.capital || {};
        const capCurrencies = state.onboarding.stepShareCapital.data.currencies || [];
        if (reqCapital.currency && capCurrencies.length === 0) {
            capCurrencies.push({
                currency: reqCapital.currency || 'SGD',
                customCurrency: '',
                shareClass: reqCapital.type || 'Ordinary',
                numberOfShares: '0',
                shareCapitalAmount: '0',
                paidUpShareCapital: '0'
            });
            state.onboarding.stepShareCapital.data.currencies = capCurrencies;
            changed = true;
        }

        // 1. Directors
        const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
        const dirStepField = dirStep ? dirStep.field : null;
        if (dirStepField) {
            if (!state.onboarding[dirStepField]) {
                state.onboarding[dirStepField] = { data: { list: [] }, status: 'pending', documents: [] };
            }
            const currentList = state.onboarding[dirStepField].data.list || [];
            if (currentList.length !== reqDirs.length) {
                const list = [];
                for (let i = 0; i < reqDirs.length; i++) {
                    const d = reqDirs[i] || {};
                    const existing = currentList[i] || {};
                    list.push({
                        fullName: existing.fullName || d.name || '',
                        idNumber: existing.idNumber || d.idNum || '',
                        nationality: existing.nationality || d.nation || '',
                        dateOfBirth: existing.dateOfBirth || d.dob || '',
                        residentialAddress: existing.residentialAddress || d.addr || '',
                        email: existing.email || d.email || '',
                        mobile: existing.mobile || d.phone || '',
                        disqualificationAcknowledge: existing.disqualificationAcknowledge || false
                    });
                }
                if (list.length === 0) list.push({});
                state.onboarding[dirStepField].data.list = list;
                changed = true;
            }
        }
        
        // 2. Individual Shareholders
        const indStep = ONBOARDING_STEPS.find(s => s.key === 'individual_shareholder');
        const indStepField = indStep ? indStep.field : null;
        if (indStepField) {
            if (!state.onboarding[indStepField]) {
                state.onboarding[indStepField] = { data: { list: [] }, status: 'pending', documents: [] };
            }
            const currentList = state.onboarding[indStepField].data.list || [];
            if (currentList.length !== reqInds.length) {
                const list = [];
                for (let i = 0; i < reqInds.length; i++) {
                    const s = reqInds[i] || {};
                    const existing = currentList[i] || {};
                    list.push({
                        sameAsDirector: existing.sameAsDirector || false,
                        fullName: existing.fullName || s.name || '',
                        idNumber: existing.idNumber || s.idNum || '',
                        nationality: existing.nationality || s.nation || '',
                        dateOfBirth: existing.dateOfBirth || s.dob || '',
                        residentialAddress: existing.residentialAddress || s.addr || '',
                        email: existing.email || s.email || '',
                        mobile: existing.mobile || s.phone || '',
                        totalShares: existing.totalShares || s.totalShares || '',
                        totalShareCapital: existing.totalShareCapital || s.totalShareCapital || '',
                        currency: existing.currency || s.currency || 'Select',
                        shareClass: existing.shareClass || s.shareClass || 'Select',
                        numberOfShares: existing.numberOfShares || s.shares || '',
                        shareCapitalAmount: existing.shareCapitalAmount || s.percent || '',
                        ownershipPercentage: existing.ownershipPercentage || '',
                        uboDeclaration: existing.uboDeclaration || 'Select'
                    });
                }
                if (list.length === 0) list.push({});
                state.onboarding[indStepField].data.list = list;
                changed = true;
            }
        }
        
        // 3. Corporate Shareholders
        const corpStep = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder');
        const corpStepField = corpStep ? corpStep.field : null;
        if (corpStepField) {
            if (!state.onboarding[corpStepField]) {
                state.onboarding[corpStepField] = { data: { list: [] }, status: 'pending', documents: [] };
            }
            const currentList = state.onboarding[corpStepField].data.list || [];
            if (currentList.length !== reqCorps.length) {
                const list = [];
                for (let i = 0; i < reqCorps.length; i++) {
                    const s = reqCorps[i] || {};
                    const existing = currentList[i] || {};
                    list.push({
                        companyName: existing.companyName || s.name || '',
                        uen: existing.uen || s.regNum || '',
                        registeredAddress: existing.registeredAddress || s.addr || '',
                        countryOfIncorporation: existing.countryOfIncorporation || s.regPlace || '',
                        dateOfIncorporation: existing.dateOfIncorporation || s.regDate || '',
                        totalShares: existing.totalShares || s.totalShares || '',
                        totalShareCapital: existing.totalShareCapital || s.totalShareCapital || '',
                        currency: existing.currency || s.currency || 'Select',
                        shareClass: existing.shareClass || s.shareClass || 'Select',
                        numberOfShares: existing.numberOfShares || s.shares || '',
                        shareCapitalAmount: existing.shareCapitalAmount || s.percent || '',
                        ownershipPercentage: existing.ownershipPercentage || '',
                        uboDeclaration: existing.uboDeclaration || 'No'
                    });
                }
                if (list.length === 0) list.push({});
                state.onboarding[corpStepField].data.list = list;
                changed = true;
            }
        }
        
        if (changed && state.onboardingId) {
            try {
                const stepsToSync = ['share_capital', 'director_details', 'individual_shareholder', 'corporate_shareholder'];
                for (const stepKey of stepsToSync) {
                    const targetStep = ONBOARDING_STEPS.find(s => s.key === stepKey);
                    if (targetStep && targetStep.field && state.onboarding[targetStep.field]) {
                        await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                            method: 'PATCH',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({
                                data: state.onboarding[targetStep.field].data,
                                status: 'pending'
                            })
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to auto-save synced onboarding steps:", e);
            }
        }
    }
    
    // Compute active step key if not set
    if (!state.activeObStepKey) {
        state.activeObStepKey = (ONBOARDING_STEPS[0] && ONBOARDING_STEPS[0].key) || 'document_checklist';
    }

    const progress = ob && ob.progressPercent ? ob.progressPercent : 0;
    const isActivated = ob && ob.portalActivated;
    const allSubmitted = ONBOARDING_STEPS.every(s => ['submitted', 'approved', 'under_review'].includes(getFriendlyStatus(s.key, ob)));

    container.innerHTML = `
    <style>
        .wizard-container { display: flex; flex-direction: column; gap: 24px; margin-top: 10px; background: transparent; width: 100%; }
        .wizard-sidebar { 
            display: flex; 
            flex-direction: row; 
            overflow-x: auto; 
            gap: 16px; 
            width: 100%; 
            padding: 4px 4px 14px 4px; 
            -webkit-overflow-scrolling: touch; 
            scrollbar-width: thin;
        }
        .wizard-sidebar::-webkit-scrollbar {
            height: 6px;
        }
        .wizard-sidebar::-webkit-scrollbar-track {
            background: transparent;
        }
        .wizard-sidebar::-webkit-scrollbar-thumb {
            background: rgba(15, 23, 42, 0.08);
            border-radius: 10px;
        }
        .wizard-sidebar::-webkit-scrollbar-thumb:hover {
            background: rgba(15, 23, 42, 0.15);
        }
        .wizard-content { width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02); min-height: 480px; box-sizing: border-box; }
        
        .wizard-step-tab { 
            background: #ffffff; 
            border: 1px solid #e2e8f0; 
            border-radius: 16px; 
            padding: 16px; 
            display: flex; 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 12px; 
            cursor: pointer; 
            transition: all 0.2s ease; 
            position: relative; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
            box-sizing: border-box;
            min-width: 200px;
            flex-shrink: 0;
            flex-grow: 1;
        }
        .wizard-step-tab:hover:not(.locked) { border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.08); }
        .wizard-step-tab.active { background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-color: #1d4ed8; box-shadow: 0 12px 25px rgba(37, 99, 235, 0.25); }
        .wizard-step-tab.locked { opacity: 0.5; cursor: not-allowed; background: #f8fafc; }
        
        .wizard-step-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: all 0.2s; }
        .wizard-step-tab.active .wizard-step-icon { background: rgba(255, 255, 255, 0.12); color: #38bdf8; }
        .wizard-step-tab:not(.active) .wizard-step-icon { background: #eff6ff; color: #3b82f6; }
        .wizard-step-tab.locked .wizard-step-icon { background: #e2e8f0; color: #94a3b8; }
        .wizard-step-tab.completed:not(.active) .wizard-step-icon { background: #f0fdf4; color: #16a34a; }
        
        .wizard-step-info { width: 100%; }
        .wizard-step-title { font-family: Outfit, sans-serif; font-size: 12px; font-weight: 700; white-space: normal; line-height: 1.4; }
        .wizard-step-tab.active .wizard-step-title { color: #ffffff; }
        .wizard-step-tab:not(.active) .wizard-step-title { color: #0f172a; }
        
        .wizard-step-badge { display: inline-flex; align-items: center; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 999px; }
        .badge-not-started { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
        .badge-in-progress { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
        .badge-completed { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-submitted { background: #fefbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-under-review { background: #fefce8; color: #ca8a04; border: 1px solid #fde68a; }
        .badge-approved { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-rejected { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

        .ob-prog-bar { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
        .ob-prog-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); border-radius: 999px; transition: width 0.5s ease; }
        
        .ob-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
        .ob-field { display: flex; flex-direction: column; gap: 6px; }
        .ob-field label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
        .ob-field input, .ob-field select { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-family: Outfit, sans-serif; outline: none; transition: all 0.2s; }
        .ob-field input:focus, .ob-field select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08); }
        .ob-field input[readonly] { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
        
        .ob-doc-upload { border: 2px dashed #e2e8f0; border-radius: 14px; padding: 18px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
        .ob-doc-upload:hover:not([style*="cursor:default"]) { border-color: #3b82f6; background: #eff6ff; }
        
        .ob-submit-btn { padding: 10px 24px; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: #fff; border: none; border-radius: 12px; font-family: Outfit, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
        .ob-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35); }
        .ob-submit-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }

        @media (min-width: 1024px) {
            .wizard-sidebar {
                overflow-x: hidden !important;
                flex-wrap: nowrap;
                gap: 8px;
            }
            .wizard-step-tab {
                min-width: 0 !important;
                flex: 1 1 0px !important;
                flex-shrink: 1 !important;
                padding: 10px 8px !important;
                gap: 8px !important;
                border-radius: 12px !important;
            }
            .wizard-step-title {
                font-size: 11px !important;
            }
            .wizard-step-icon {
                width: 28px !important;
                height: 28px !important;
                font-size: 12px !important;
            }
            .wizard-step-badge {
                padding: 1px 6px !important;
                font-size: 7px !important;
            }
        }
    </style>

    ${isActivated ? `
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:20px;padding:28px;margin-bottom:24px;display:flex;align-items:center;gap:20px;box-shadow: 0 10px 25px rgba(22, 163, 74, 0.05);">
        <div style="width:54px;height:54px;border-radius:16px;background:#16a34a;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow: 0 8px 20px rgba(22, 163, 74, 0.2);">
            <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
        </div>
        <div>
            <div style="font-family:Outfit,sans-serif;font-size:20px;font-weight:800;color:#14532d;">🎉 Your Client Portal is Fully Activated!</div>
            <div style="font-size:13px;color:#166534;margin-top:4px;line-height:1.6;">All onboarding steps are completed and approved. Explore all platform modules now.</div>
        </div>
        <button onclick="switchTab('home')" style="margin-left:auto;padding:12px 24px;background:#16a34a;color:#fff;border:none;border-radius:14px;font-family:Outfit,sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow: 0 4px 15px rgba(22,163,74,0.3);">Go to Dashboard →</button>
    </div>` : (allSubmitted ? `
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:20px;padding:28px;margin-bottom:24px;display:flex;align-items:center;gap:20px;box-shadow: 0 10px 25px rgba(217, 119, 6, 0.05);">
        <div style="width:54px;height:54px;border-radius:16px;background:#d97706;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow: 0 8px 20px rgba(217, 119, 6, 0.2);">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
            <div style="font-family:Outfit,sans-serif;font-size:18px;font-weight:800;color:#92400e;">⏳ Onboarding Submitted & Under Review</div>
            <div style="font-size:13px;color:#b45309;margin-top:4px;line-height:1.6;">Your application is currently being verified and reviewed by the Globalisor team. You will receive full access to the portal once the review is completed and approved.</div>
        </div>
    </div>` : `
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:20px;padding:24px 28px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow: 0 10px 25px rgba(59, 130, 246, 0.03);">
        <div style="flex-grow:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div>
                    <div style="font-family:Outfit,sans-serif;font-size:16px;font-weight:800;color:#1e40af;">Onboarding Wizard Progress</div>
                    <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Complete all steps to submit your onboarding for verification and unlock full access.</div>
                </div>
                <span id="ob-progress-percent" style="font-size:26px;font-weight:900;color:#3b82f6;">${progress}%</span>
            </div>
            <div class="ob-prog-bar"><div id="ob-progress-fill" class="ob-prog-fill" style="width:${progress}%"></div></div>
        </div>
        <button id="ob-submit-verification-btn" onclick="obSubmitAllForVerification()" class="ob-submit-btn" disabled style="height:fit-content;padding:14px 28px;">
            Submit for Verification
        </button>
    </div>`)}

    <div class="wizard-container">
        <!-- Horizontal Navigation Stepper -->
        <div class="wizard-sidebar" id="ob-wizard-sidebar">
            ${ONBOARDING_STEPS.map((step, idx) => {
                return `
                <div class="wizard-step-tab" id="tab-${step.key}" onclick="selectObStep('${step.key}')">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                        <div class="wizard-step-icon" id="icon-${step.key}">
                            <!-- Icon set dynamically -->
                        </div>
                        <span class="wizard-step-badge" id="badge-${step.key}">Not Started</span>
                    </div>
                    <div class="wizard-step-info">
                        <div class="wizard-step-title">Step ${idx+1}: ${step.title}</div>
                    </div>
                </div>`;
            }).join('')}
        </div>
        
        <!-- Main Form Panel -->
        <div class="wizard-content" id="ob-form-workspace">
            <!-- Active step form rendered dynamically -->
        </div>
    </div>
    `;

    // Render active step form
    const formWorkspace = document.getElementById('ob-form-workspace');
    if (formWorkspace) {
        renderActiveStepForm(formWorkspace);
    }
}

let obAutoSaveTimeout = null;

function validateStep(stepKey, ob) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return [];
    
    const stepField = step.field;
    const stepData = ob && ob[stepField] ? ob[stepField] : {};
    const data = stepData.data || {};
    const docs = stepData.documents || [];
    const errors = [];

    const isMultiItem = step && step.dynamicSection === true;

    if (stepKey === 'share_capital') {
        const currencies = data.currencies || [];
        if (currencies.length === 0) {
            errors.push("At least one currency section is required.");
        }
        currencies.forEach((c, idx) => {
            const currencyCode = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
            if (!currencyCode) {
                errors.push(`Section #${idx + 1}: Currency is required.`);
            }

            const numShares = parseFloat(c.numberOfShares) || 0;
            const amount = parseFloat(c.shareCapitalAmount) || 0;

            if (numShares <= 0 || !Number.isInteger(numShares)) {
                errors.push(`Section #${idx + 1} (${currencyCode} - ${c.shareClass}): Number of shares must be a positive whole number.`);
            }
            if (amount < numShares) {
                errors.push(`Section #${idx + 1} (${currencyCode} - ${c.shareClass}): Issued Share Capital Amount cannot be less than the Number of Shares.`);
            }
        });
        return errors;
    }

    if (isMultiItem) {
        const list = data.list || [];
        if (list.length === 0) {
            errors.push("At least one entry is required.");
        }
        list.forEach((item, idx) => {
            const currentRequiredDocs = getStepRequiredDocs(stepKey, item);
            const currentManualFields = getStepManualFields(stepKey, item);
            
            // Check required documents for this item
            if (currentRequiredDocs) {
                currentRequiredDocs.forEach(reqDoc => {
                    const docTypeWithIdx = `${reqDoc.type}_${idx}`;
                    if (stepKey === 'corporate_shareholder') {
                        const country = (item.countryOfIncorporation || '').trim().toLowerCase();
                        const isSG = country === 'singapore' || country === 'sg' || country === '';
                        if (isSG) {
                            if (reqDoc.type !== 'bizfile' && reqDoc.type !== 'constitution') return;
                        } else {
                            if (reqDoc.type === 'bizfile') return;
                        }
                    }
                    if (stepKey === 'individual_shareholder') {
                        if (item.sameAsDirector === true || item.sameAsDirector === 'true') {
                            if (reqDoc.type === 'nric') return;
                        }
                    }
                    const hasDoc = docs.some(d => d.type === docTypeWithIdx);
                    if (!hasDoc) {
                        errors.push(`Entry #${idx + 1}: Document "${reqDoc.label}" is required.`);
                    }
                });
            }
            
            // Check manual fields for this item
            if (currentManualFields) {
                currentManualFields.forEach(field => {
                    if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                        const isPersonalField = ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].includes(field.key);
                        if (isPersonalField) return;
                    }
                    const val = item[field.key];
                    let isEmpty;
                    if (field.type === 'phone') {
                        // phone is stored as code:dial:number — check the number part
                        const numPart = val && val.includes(':') ? val.split(':')[2] : String(val || '');
                        isEmpty = !numPart || numPart.trim() === '';
                    } else if (field.type === 'checkbox') {
                        isEmpty = field.key === 'disqualificationAcknowledge' && val !== true && val !== 'true';
                    } else {
                        isEmpty = val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'Select';
                    }
                    if (isEmpty) {
                        errors.push(`Entry #${idx + 1}: Field "${field.label}" is required.`);
                    }
                });
            }
        });

        // Sum allocations across all shareholders and validate against master limits in Step 2
        if (stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') {
            const currencies = (ob.stepShareCapital && ob.stepShareCapital.data && ob.stepShareCapital.data.currencies) || [];
            
            // Sum allocations across individual shareholders (current state)
            const indStep = ob.step3IndividualShareholder || { data: { list: [] } };
            const indList = (stepKey === 'individual_shareholder') ? (data.list || []) : (indStep.data.list || []);
            
            // Sum allocations across corporate shareholders (current state)
            const corpStep = ob.step4CorporateShareholder || { data: { list: [] } };
            const corpList = (stepKey === 'corporate_shareholder') ? (data.list || []) : (corpStep.data.list || []);

            const allocatedSums = {}; // key: "CURRENCY_CLASS" -> { shares: X, capital: Y }
            
            const addAllocation = (sh, shIdx, shType) => {
                const shCurr = (sh.currency || '').trim().toUpperCase();
                const shClass = (sh.shareClass || '').trim();
                const shShares = parseFloat(sh.numberOfShares) || 0;
                const shCapital = parseFloat(sh.shareCapitalAmount) || 0;
                const shName = shType === 'individual' ? (sh.fullName || 'unnamed') : (sh.companyName || 'unnamed');
                
                if (!shCurr || shCurr === 'SELECT') return;
                const keyCombo = `${shCurr}_${shClass}`;
                if (!allocatedSums[keyCombo]) {
                    allocatedSums[keyCombo] = { shares: 0, capital: 0, names: [] };
                }
                allocatedSums[keyCombo].shares += shShares;
                allocatedSums[keyCombo].capital += shCapital;
                allocatedSums[keyCombo].names.push(`${shType === 'individual' ? 'Ind' : 'Corp'} #${shIdx + 1} (${shName})`);
            };

            indList.forEach((sh, i) => addAllocation(sh, i, 'individual'));
            corpList.forEach((sh, i) => addAllocation(sh, i, 'corporate'));

            Object.keys(allocatedSums).forEach(key => {
                const [shCurr, shClass] = key.split('_');
                const masterItem = currencies.find(c => {
                    const masterCurr = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
                    return masterCurr.toUpperCase() === shCurr && c.shareClass === shClass;
                });

                if (!masterItem) {
                    errors.push(`Allocation error: Currency/Share Class ${shCurr} - ${shClass} is not configured in Share Capital Details (allocated by: ${allocatedSums[key].names.join(', ')}).`);
                } else {
                    const totalSharesAllocated = allocatedSums[key].shares;
                    const totalCapitalAllocated = allocatedSums[key].capital;
                    
                    if (totalSharesAllocated > masterItem.numberOfShares) {
                        errors.push(`Allocation error (${shCurr} - ${shClass}): Total allocated shares (${totalSharesAllocated}) exceeds the master limit (${masterItem.numberOfShares}) configured in Share Capital Details.`);
                    }
                    if (totalCapitalAllocated > masterItem.shareCapitalAmount) {
                        errors.push(`Allocation error (${shCurr} - ${shClass}): Total allocated share capital (${totalCapitalAllocated}) exceeds the master limit (${masterItem.shareCapitalAmount}) configured in Share Capital Details.`);
                    }
                }
            });
        }
    } else {
        const currentRequiredDocs = getStepRequiredDocs(stepKey, data);
        const currentManualFields = getStepManualFields(stepKey, data);

        // 1. Check required documents
        if (currentRequiredDocs) {
            currentRequiredDocs.forEach(reqDoc => {
                const hasDoc = docs.some(d => d.type === reqDoc.type);
                if (!hasDoc) {
                    errors.push(`Document "${reqDoc.label}" is required.`);
                }
            });
        }

        // 2. Check manual fields
        if (currentManualFields) {
            currentManualFields.forEach(field => {
                const val = data[field.key];
                let isEmpty;
                if (field.type === 'phone') {
                    const numPart = val && val.includes(':') ? val.split(':')[2] : String(val || '');
                    isEmpty = !numPart || numPart.trim() === '';
                } else if (field.type === 'checkbox') {
                    isEmpty = (field.key === 'declarationAgreed' || field.key === 'consentAgreed') && val !== true && val !== 'true';
                } else {
                    isEmpty = val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'Select';
                }
                if (isEmpty) {
                    errors.push(`Field "${field.label}" is required.`);
                }
            });
        }
    }

    // 3. Check declaration
    if (step.declaration) {
        if (!data.declarationAgreed) {
            errors.push("You must check and agree to the declaration.");
        }
    }

    return errors;
}

/**
 * Highlight (or clear) invalid fields in the active step form with red styling.
 * @param {string} stepKey - The active step key
 * @param {object} ob - The onboarding object
 * @param {boolean} show - Whether to show or clear highlights
 */
function highlightInvalidFields(stepKey, ob, show) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;

    const stepField = step.field;
    const stepData = ob && ob[stepField] ? ob[stepField] : {};
    const data = stepData.data || {};
    const docs = stepData.documents || [];

    const isMultiItem = step && step.dynamicSection === true;

    const applyFieldStyle = (el, isError) => {
        if (!el) return;
        if (isError) {
            el.style.border = '2px solid #ef4444';
            el.style.background = '#fff5f5';
            el.style.borderRadius = '10px';
            el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)';
        } else {
            el.style.border = '';
            el.style.background = '';
            el.style.boxShadow = '';
        }
    };

    const applyLabelStyle = (label, isError) => {
        if (!label) return;
        if (isError) {
            label.style.color = '#dc2626';
            label.style.fontWeight = '700';
        } else {
            label.style.color = '';
            label.style.fontWeight = '';
        }
    };

    const applyDocStyle = (el, isError) => {
        if (!el) return;
        if (isError) {
            el.style.borderColor = '#ef4444';
            el.style.background = '#fff5f5';
            el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)';
        } else {
            el.style.borderColor = '';
            el.style.background = '';
            el.style.boxShadow = '';
        }
    };

    if (isMultiItem) {
        const list = data.list || [];
        list.forEach((item, idx) => {
            const currentManualFields = getStepManualFields(stepKey, item);
            const currentRequiredDocs = getStepRequiredDocs(stepKey, item);

            if (currentManualFields) {
                currentManualFields.forEach(f => {
                    const inputId = `ob-${stepKey}-${idx}-${f.key}`;
                    const el = document.getElementById(inputId);
                    const container = el ? el.closest('.ob-field') : null;
                    const label = container ? container.querySelector('label') : null;

                    if (!show) {
                        applyFieldStyle(el, false);
                        applyLabelStyle(label, false);
                        return;
                    }

                    // Skip personal fields if sameAsDirector
                    if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                        const isPersonalField = ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].includes(f.key);
                        if (isPersonalField) { applyFieldStyle(el, false); applyLabelStyle(label, false); return; }
                    }

                    const val = item[f.key];
                    let isEmpty;
                    if (f.type === 'phone') {
                        const numPart = val && val.includes(':') ? val.split(':')[2] : String(val || '');
                        isEmpty = !numPart || numPart.trim() === '';
                        // For phone, highlight the wrapper instead of input
                        const wrap = document.getElementById(inputId + '-wrap');
                        if (wrap) {
                            wrap.style.border = isEmpty ? '2px solid #ef4444' : '';
                            wrap.style.background = isEmpty ? '#fff5f5' : '';
                            wrap.style.boxShadow = isEmpty ? '0 0 0 3px rgba(239,68,68,0.12)' : '';
                        }
                        applyLabelStyle(label, isEmpty);
                        return;
                    } else {
                        isEmpty = val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'Select';
                    }
                    applyFieldStyle(el, isEmpty);
                    applyLabelStyle(label, isEmpty);
                });
            }

            if (currentRequiredDocs) {
                currentRequiredDocs.forEach(doc => {
                    const docTypeWithIdx = `${doc.type}_${idx}`;
                    let isReq = true;
                    if (stepKey === 'corporate_shareholder') {
                        const country = (item.countryOfIncorporation || '').trim().toLowerCase();
                        const isSG = country === 'singapore' || country === 'sg' || country === '';
                        isReq = isSG ? (doc.type === 'bizfile' || doc.type === 'constitution') : (doc.type !== 'bizfile');
                    }
                    if (stepKey === 'individual_shareholder') {
                        if (item.sameAsDirector === true || item.sameAsDirector === 'true') isReq = false;
                    }
                    const docEl = document.getElementById(`doc-${stepKey}-${docTypeWithIdx}`);
                    const hasDoc = docs.some(d => d.type === docTypeWithIdx);
                    applyDocStyle(docEl, show && isReq && !hasDoc);
                });
            }
        });
    } else {
        const currentManualFields = getStepManualFields(stepKey, data);
        const currentRequiredDocs = getStepRequiredDocs(stepKey, data);

        if (currentManualFields) {
            currentManualFields.forEach(f => {
                const inputId = `ob-${stepKey}-${f.key}`;
                const el = document.getElementById(inputId);
                const container = el ? el.closest('.ob-field') : null;
                const label = container ? container.querySelector('label') : null;

                if (!show) {
                    applyFieldStyle(el, false);
                    applyLabelStyle(label, false);
                    return;
                }

                const val = data[f.key];
                let isEmpty;
                if (f.type === 'phone') {
                    const numPart = val && val.includes(':') ? val.split(':')[2] : String(val || '');
                    isEmpty = !numPart || numPart.trim() === '';
                    const wrap = document.getElementById(inputId + '-wrap');
                    if (wrap) {
                        wrap.style.border = isEmpty ? '2px solid #ef4444' : '';
                        wrap.style.background = isEmpty ? '#fff5f5' : '';
                        wrap.style.boxShadow = isEmpty ? '0 0 0 3px rgba(239,68,68,0.12)' : '';
                    }
                    applyLabelStyle(label, isEmpty);
                    return;
                } else {
                    isEmpty = val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'Select';
                }
                applyFieldStyle(el, isEmpty);
                applyLabelStyle(label, isEmpty);
            });
        }

        if (currentRequiredDocs) {
            currentRequiredDocs.forEach(doc => {
                const docEl = document.getElementById(`doc-${stepKey}-${doc.type}`);
                const hasDoc = docs.some(d => d.type === doc.type);
                applyDocStyle(docEl, show && !hasDoc);
            });
        }

        // Declaration check
        if (step.declaration) {
            const declEl = document.getElementById(`ob-${stepKey}-declarationAgreed`);
            const container = declEl ? declEl.closest('.ob-field') : null;
            if (declEl) {
                applyFieldStyle(container || declEl, show && !data.declarationAgreed);
            }
        }
    }
}

function getFriendlyStatus(stepKey, ob) {
    if (stepKey === 'document_checklist') return 'completed';
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return 'not_started';
    const stepData = ob && ob[step.field] ? ob[step.field] : {};
    const status = stepData.status || 'pending';
    
    if (status === 'approved') return 'approved';
    if (status === 'submitted') return 'submitted';
    if (status === 'under_review') return 'under_review';
    if (status === 'rejected') return 'rejected';
    if (status === 'additional_info_required') return 'rejected';
    
    const data = stepData.data || {};
    const docs = stepData.documents || [];
    
    const hasData = Object.values(data).some(v => v !== undefined && v !== null && String(v).trim() !== '');
    const hasDocs = docs.length > 0;
    
    if (!hasData && !hasDocs) {
        return 'not_started';
    }
    
    const errors = validateStep(stepKey, ob);
    if (errors.length === 0) {
        return 'completed';
    }
    
    return 'in_progress';
}

function isStepLocked(idx, ob) {
    return false;
}

async function selectObStep(stepKey) {
    const currentIdx = ONBOARDING_STEPS.findIndex(s => s.key === state.activeObStepKey);
    const targetIdx = ONBOARDING_STEPS.findIndex(s => s.key === stepKey);
    if (currentIdx !== -1 && targetIdx > currentIdx) {
        const ob = state.onboarding || {};
        const errors = validateStep(state.activeObStepKey, ob);
        if (errors.length > 0) {
            if (!state.showObErrors) state.showObErrors = {};
            state.showObErrors[state.activeObStepKey] = true;
            updateWizardUIFeedback();
            return;
        }
    }
    if (!state.showObErrors) state.showObErrors = {};
    state.showObErrors[stepKey] = false;

    const idx = ONBOARDING_STEPS.findIndex(s => s.key === stepKey);
    if (isStepLocked(idx, state.onboarding)) {
        alert("Step Locked! Please complete the previous steps in order before proceeding.");
        return;
    }
    
    // Save any pending input immediately before switching
    await forceSaveActiveStep();
    
    state.activeObStepKey = stepKey;
    
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) {
        renderActiveStepForm(workspace);
    }
    
    updateWizardUIFeedback();
}


// ============================================================
// COUNTRY DATA — used for Phone Picker & Nationality Dropdown
// ============================================================
const OB_COUNTRIES = [
    { name: 'Afghanistan', code: 'AF', nationality: 'Afghan', dial: '+93', maxLen: 9 },
    { name: 'Albania', code: 'AL', nationality: 'Albanian', dial: '+355', maxLen: 9 },
    { name: 'Algeria', code: 'DZ', nationality: 'Algerian', dial: '+213', maxLen: 9 },
    { name: 'Argentina', code: 'AR', nationality: 'Argentine', dial: '+54', maxLen: 10 },
    { name: 'Australia', code: 'AU', nationality: 'Australian', dial: '+61', maxLen: 9 },
    { name: 'Austria', code: 'AT', nationality: 'Austrian', dial: '+43', maxLen: 10 },
    { name: 'Bahrain', code: 'BH', nationality: 'Bahraini', dial: '+973', maxLen: 8 },
    { name: 'Bangladesh', code: 'BD', nationality: 'Bangladeshi', dial: '+880', maxLen: 10 },
    { name: 'Belgium', code: 'BE', nationality: 'Belgian', dial: '+32', maxLen: 9 },
    { name: 'Brazil', code: 'BR', nationality: 'Brazilian', dial: '+55', maxLen: 11 },
    { name: 'Brunei', code: 'BN', nationality: 'Bruneian', dial: '+673', maxLen: 7 },
    { name: 'Cambodia', code: 'KH', nationality: 'Cambodian', dial: '+855', maxLen: 9 },
    { name: 'Canada', code: 'CA', nationality: 'Canadian', dial: '+1', maxLen: 10 },
    { name: 'Chile', code: 'CL', nationality: 'Chilean', dial: '+56', maxLen: 9 },
    { name: 'China', code: 'CN', nationality: 'Chinese', dial: '+86', maxLen: 11 },
    { name: 'Colombia', code: 'CO', nationality: 'Colombian', dial: '+57', maxLen: 10 },
    { name: 'Croatia', code: 'HR', nationality: 'Croatian', dial: '+385', maxLen: 9 },
    { name: 'Czech Republic', code: 'CZ', nationality: 'Czech', dial: '+420', maxLen: 9 },
    { name: 'Denmark', code: 'DK', nationality: 'Danish', dial: '+45', maxLen: 8 },
    { name: 'Egypt', code: 'EG', nationality: 'Egyptian', dial: '+20', maxLen: 10 },
    { name: 'Ethiopia', code: 'ET', nationality: 'Ethiopian', dial: '+251', maxLen: 9 },
    { name: 'Finland', code: 'FI', nationality: 'Finnish', dial: '+358', maxLen: 10 },
    { name: 'France', code: 'FR', nationality: 'French', dial: '+33', maxLen: 9 },
    { name: 'Germany', code: 'DE', nationality: 'German', dial: '+49', maxLen: 11 },
    { name: 'Ghana', code: 'GH', nationality: 'Ghanaian', dial: '+233', maxLen: 9 },
    { name: 'Greece', code: 'GR', nationality: 'Greek', dial: '+30', maxLen: 10 },
    { name: 'Hong Kong', code: 'HK', nationality: 'Chinese (Hong Kong)', dial: '+852', maxLen: 8 },
    { name: 'Hungary', code: 'HU', nationality: 'Hungarian', dial: '+36', maxLen: 9 },
    { name: 'India', code: 'IN', nationality: 'Indian', dial: '+91', maxLen: 10 },
    { name: 'Indonesia', code: 'ID', nationality: 'Indonesian', dial: '+62', maxLen: 12 },
    { name: 'Iran', code: 'IR', nationality: 'Iranian', dial: '+98', maxLen: 10 },
    { name: 'Iraq', code: 'IQ', nationality: 'Iraqi', dial: '+964', maxLen: 10 },
    { name: 'Ireland', code: 'IE', nationality: 'Irish', dial: '+353', maxLen: 9 },
    { name: 'Israel', code: 'IL', nationality: 'Israeli', dial: '+972', maxLen: 9 },
    { name: 'Italy', code: 'IT', nationality: 'Italian', dial: '+39', maxLen: 10 },
    { name: 'Japan', code: 'JP', nationality: 'Japanese', dial: '+81', maxLen: 11 },
    { name: 'Jordan', code: 'JO', nationality: 'Jordanian', dial: '+962', maxLen: 9 },
    { name: 'Kenya', code: 'KE', nationality: 'Kenyan', dial: '+254', maxLen: 9 },
    { name: 'Kuwait', code: 'KW', nationality: 'Kuwaiti', dial: '+965', maxLen: 8 },
    { name: 'Lebanon', code: 'LB', nationality: 'Lebanese', dial: '+961', maxLen: 8 },
    { name: 'Libya', code: 'LY', nationality: 'Libyan', dial: '+218', maxLen: 9 },
    { name: 'Luxembourg', code: 'LU', nationality: 'Luxembourgish', dial: '+352', maxLen: 9 },
    { name: 'Malaysia', code: 'MY', nationality: 'Malaysian', dial: '+60', maxLen: 11 },
    { name: 'Maldives', code: 'MV', nationality: 'Maldivian', dial: '+960', maxLen: 7 },
    { name: 'Malta', code: 'MT', nationality: 'Maltese', dial: '+356', maxLen: 8 },
    { name: 'Mexico', code: 'MX', nationality: 'Mexican', dial: '+52', maxLen: 10 },
    { name: 'Morocco', code: 'MA', nationality: 'Moroccan', dial: '+212', maxLen: 9 },
    { name: 'Myanmar', code: 'MM', nationality: 'Burmese', dial: '+95', maxLen: 10 },
    { name: 'Nepal', code: 'NP', nationality: 'Nepalese', dial: '+977', maxLen: 10 },
    { name: 'Netherlands', code: 'NL', nationality: 'Dutch', dial: '+31', maxLen: 9 },
    { name: 'New Zealand', code: 'NZ', nationality: 'New Zealander', dial: '+64', maxLen: 9 },
    { name: 'Nigeria', code: 'NG', nationality: 'Nigerian', dial: '+234', maxLen: 10 },
    { name: 'Norway', code: 'NO', nationality: 'Norwegian', dial: '+47', maxLen: 8 },
    { name: 'Oman', code: 'OM', nationality: 'Omani', dial: '+968', maxLen: 8 },
    { name: 'Pakistan', code: 'PK', nationality: 'Pakistani', dial: '+92', maxLen: 10 },
    { name: 'Palestine', code: 'PS', nationality: 'Palestinian', dial: '+970', maxLen: 9 },
    { name: 'Peru', code: 'PE', nationality: 'Peruvian', dial: '+51', maxLen: 9 },
    { name: 'Philippines', code: 'PH', nationality: 'Filipino', dial: '+63', maxLen: 10 },
    { name: 'Poland', code: 'PL', nationality: 'Polish', dial: '+48', maxLen: 9 },
    { name: 'Portugal', code: 'PT', nationality: 'Portuguese', dial: '+351', maxLen: 9 },
    { name: 'Qatar', code: 'QA', nationality: 'Qatari', dial: '+974', maxLen: 8 },
    { name: 'Romania', code: 'RO', nationality: 'Romanian', dial: '+40', maxLen: 9 },
    { name: 'Russia', code: 'RU', nationality: 'Russian', dial: '+7', maxLen: 10 },
    { name: 'Saudi Arabia', code: 'SA', nationality: 'Saudi', dial: '+966', maxLen: 9 },
    { name: 'Singapore', code: 'SG', nationality: 'Singaporean', dial: '+65', maxLen: 8 },
    { name: 'South Africa', code: 'ZA', nationality: 'South African', dial: '+27', maxLen: 9 },
    { name: 'South Korea', code: 'KR', nationality: 'South Korean', dial: '+82', maxLen: 10 },
    { name: 'Spain', code: 'ES', nationality: 'Spanish', dial: '+34', maxLen: 9 },
    { name: 'Sri Lanka', code: 'LK', nationality: 'Sri Lankan', dial: '+94', maxLen: 9 },
    { name: 'Sweden', code: 'SE', nationality: 'Swedish', dial: '+46', maxLen: 9 },
    { name: 'Switzerland', code: 'CH', nationality: 'Swiss', dial: '+41', maxLen: 9 },
    { name: 'Syria', code: 'SY', nationality: 'Syrian', dial: '+963', maxLen: 9 },
    { name: 'Taiwan', code: 'TW', nationality: 'Taiwanese', dial: '+886', maxLen: 9 },
    { name: 'Tanzania', code: 'TZ', nationality: 'Tanzanian', dial: '+255', maxLen: 9 },
    { name: 'Thailand', code: 'TH', nationality: 'Thai', dial: '+66', maxLen: 9 },
    { name: 'Tunisia', code: 'TN', nationality: 'Tunisian', dial: '+216', maxLen: 8 },
    { name: 'Turkey', code: 'TR', nationality: 'Turkish', dial: '+90', maxLen: 10 },
    { name: 'Uganda', code: 'UG', nationality: 'Ugandan', dial: '+256', maxLen: 9 },
    { name: 'Ukraine', code: 'UA', nationality: 'Ukrainian', dial: '+380', maxLen: 9 },
    { name: 'United Arab Emirates', code: 'AE', nationality: 'Emirati', dial: '+971', maxLen: 9 },
    { name: 'United Kingdom', code: 'GB', nationality: 'British', dial: '+44', maxLen: 10 },
    { name: 'United States', code: 'US', nationality: 'American', dial: '+1', maxLen: 10 },
    { name: 'Vietnam', code: 'VN', nationality: 'Vietnamese', dial: '+84', maxLen: 10 },
    { name: 'Yemen', code: 'YE', nationality: 'Yemeni', dial: '+967', maxLen: 9 },
    { name: 'Zimbabwe', code: 'ZW', nationality: 'Zimbabwean', dial: '+263', maxLen: 9 }
];

// Convert a 2-letter ISO country code to a Unicode flag emoji (works in all modern browsers)
function obFlagEmoji(code) {
    if (!code || code.length !== 2) return '';
    const codePoints = [...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
    return String.fromCodePoint(...codePoints);
}

// Get flag display HTML for a country code: image from flagcdn with proper sizing
function obFlagImg(code, size = 18) {
    if (!code) return '';
    const emoji = obFlagEmoji(code);
    return `<span style="display:inline-flex;align-items:center;" title="${code}">
        <img src="https://flagcdn.com/w20/${code.toLowerCase()}.png" 
             style="width:${size}px;height:${Math.round(size*0.75)}px;object-fit:cover;border-radius:2px;border:1px solid #e2e8f0;" 
             alt="${emoji}" onerror="this.style.display='none'">
    </span>`;
}

// Render a phone picker field (flag + dial code + numeric input with searchable country list)
function obRenderPhoneField({ inputId, val, readonlyAttr, onInputCallback }) {
    // Parse stored value: format "SG:+65:91234567" or plain number
    let selectedCode = 'SG', selectedDial = '+65', phoneNum = '', maxLen = 8;
    if (val && val.includes(':')) {
        const parts = val.split(':');
        selectedCode = parts[0] || 'SG';
        selectedDial = parts[1] || '+65';
        phoneNum = parts[2] || '';
        const found = OB_COUNTRIES.find(c => c.code === selectedCode);
        if (found) maxLen = found.maxLen;
    } else if (val) {
        phoneNum = val.replace(/\D/g, '');
    }

    const isReadOnly = !!readonlyAttr;

    return `<div class="ob-field">
        <label>Mobile Number</label>
        <div style="display:flex;gap:0;align-items:stretch;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;transition:border-color 0.2s;position:relative;" id="${inputId}-wrap"
            onfocusin="this.style.borderColor='#3b82f6'" onfocusout="this.style.borderColor='#e2e8f0'">
            
            <div id="${inputId}-picker-btn" onclick="${isReadOnly ? '' : `obPhoneSearchToggle('${inputId}')`}"
                 style="display:flex;align-items:center;gap:5px;padding:0 10px;background:#f8fafc;border-right:1.5px solid #e2e8f0;min-width:90px;cursor:${isReadOnly ? 'default' : 'pointer'};position:relative;user-select:none;">
                <span id="${inputId}-flag" style="display:flex;align-items:center;">${obFlagImg(selectedCode, 20)}</span>
                <span id="${inputId}-dialcode" style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap;">${selectedDial}</span>
                ${isReadOnly ? '' : `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`}
            </div>

            <input type="hidden" id="${inputId}-country-val" value="${selectedCode}|${selectedDial}|${maxLen}">

            <input type="tel" id="${inputId}" data-full-val="${selectedCode}:${selectedDial}:${phoneNum}" inputmode="numeric" pattern="[0-9]*" value="${phoneNum}" maxlength="${maxLen}" placeholder="${'0'.repeat(maxLen)}"
                style="flex:1;border:none;outline:none;padding:10px 12px;font-size:13px;font-weight:500;color:#1e293b;background:transparent;min-width:0;letter-spacing:0.04em;"
                ${readonlyAttr}
                oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,this.maxLength); obPhoneSyncValue('${inputId}'); ${onInputCallback}"
            >

            <!-- Searchable Dropdown Overlay -->
            <div id="${inputId}-search-container" style="display:none;position:absolute;top:calc(100% + 4px);left:0;width:300px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:2000;padding:8px;box-sizing:border-box;font-family:Outfit,sans-serif;">
                <input type="text" id="${inputId}-search-inp" placeholder="Search country..." oninput="obPhoneSearchCountry('${inputId}')"
                    style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;outline:none;margin-bottom:8px;box-sizing:border-box;">
                <div id="${inputId}-country-items" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;">
                </div>
            </div>
        </div>
    </div>`;
}

// Render nationality searchable dropdown
function obRenderNationalityField({ inputId, val, readonlyAttr, onChangeCallback }) {
    const isReadOnly = !!readonlyAttr;
    const currentVal = val || '';

    return `<div class="ob-field" style="position:relative;">
        <label>${'Nationality'}</label>
        <div style="position:relative;" id="${inputId}-natiwrap">
            <input type="text" id="${inputId}" value="${currentVal}" placeholder="Search nationality..."
                autocomplete="off"
                style="width:100%;padding:10px 36px 10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:500;color:#1e293b;background:#fff;box-sizing:border-box;cursor:${isReadOnly ? 'default' : 'pointer'};"
                ${readonlyAttr}
                oninput="obNatSearch('${inputId}')"
                onkeydown="obNatKeyNav(event,'${inputId}','${onChangeCallback}')"
                onfocus="if(!this.readOnly)obNatSearch('${inputId}')"
                onblur="setTimeout(()=>obNatClose('${inputId}'),200)"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
            <div id="${inputId}-natlist" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.10);z-index:1000;max-height:220px;overflow-y:auto;font-family:Outfit,sans-serif;"></div>
        </div>
    </div>`;
}

window.obPhoneSearchToggle = function(inputId) {
    const container = document.getElementById(inputId + '-search-container');
    if (!container) return;
    const isHidden = container.style.display === 'none';
    
    // Close other dropdowns first
    document.querySelectorAll('[id$="-search-container"]').forEach(dd => dd.style.display = 'none');
    
    if (isHidden) {
        container.style.display = 'block';
        const searchInp = document.getElementById(inputId + '-search-inp');
        if (searchInp) {
            searchInp.value = '';
            searchInp.focus();
        }
        obPhoneSearchCountry(inputId);
        
        const clickOutside = (evt) => {
            if (!container.contains(evt.target) && !document.getElementById(inputId + '-picker-btn').contains(evt.target)) {
                container.style.display = 'none';
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 50);
    } else {
        container.style.display = 'none';
    }
};

window.obPhoneSearchCountry = function(inputId) {
    const searchInp = document.getElementById(inputId + '-search-inp');
    const itemsContainer = document.getElementById(inputId + '-country-items');
    if (!searchInp || !itemsContainer) return;
    
    const q = searchInp.value.trim().toLowerCase();
    const filtered = q
        ? OB_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q))
        : OB_COUNTRIES;
        
    itemsContainer.innerHTML = filtered.length === 0
        ? `<div style="padding:10px;font-size:12px;color:#94a3b8;text-align:center;">No results</div>`
        : filtered.map(c => `
            <div onclick="obPhoneSelectCountry('${inputId}','${c.code}','${c.dial}',${c.maxLen})"
                 style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;font-size:12px;font-weight:500;color:#1e293b;border-radius:6px;transition:background 0.1s;"
                 onmouseenter="this.style.background='#eff6ff'; this.style.color='#2563eb';"
                 onmouseleave="this.style.background=''; this.style.color='';"
            >
                ${obFlagImg(c.code, 18)}
                <span style="flex-grow:1;">${c.name}</span>
                <span style="font-weight:700;color:#64748b;">${c.dial}</span>
            </div>
        `).join('');
};

window.obPhoneSelectCountry = function(inputId, code, dial, maxLen) {
    const hiddenVal = document.getElementById(inputId + '-country-val');
    const flagEl = document.getElementById(inputId + '-flag');
    const dialEl = document.getElementById(inputId + '-dialcode');
    const numInput = document.getElementById(inputId);
    const container = document.getElementById(inputId + '-search-container');
    
    if (hiddenVal) hiddenVal.value = `${code}|${dial}|${maxLen}`;
    if (flagEl) flagEl.innerHTML = obFlagImg(code, 20);
    if (dialEl) dialEl.textContent = dial;
    if (container) container.style.display = 'none';
    
    if (numInput) {
        numInput.maxLength = maxLen;
        numInput.placeholder = '0'.repeat(maxLen);
        numInput.value = numInput.value.replace(/[^0-9]/g, '').slice(0, maxLen);
        numInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

window.obPhoneSyncValue = function(inputId) {
    const numInput = document.getElementById(inputId);
    const hiddenVal = document.getElementById(inputId + '-country-val');
    if (!numInput) return;
    const val = hiddenVal ? hiddenVal.value : 'SG|+65|8';
    const [code, dial] = val.split('|');
    numInput.dataset.fullVal = `${code}:${dial}:${numInput.value}`;
};

// Nationality dropdown: filter list by name or nationality adjective
window.obNatSearch = function(inputId) {
    const inp = document.getElementById(inputId);
    const listEl = document.getElementById(inputId + '-natlist');
    if (!inp || !listEl) return;
    const q = inp.value.trim().toLowerCase();
    const filtered = q 
        ? OB_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.nationality.toLowerCase().includes(q)) 
        : OB_COUNTRIES;
    
    listEl.innerHTML = filtered.length === 0
        ? `<div style="padding:10px 14px;font-size:12px;color:#94a3b8;">No results</div>`
        : filtered.map((c, i) => {
            const natVal = c.nationality || c.name;
            return `
            <div class="ob-nat-item" data-nat="${natVal}" data-idx="${i}"
                style="display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500;color:#1e293b;transition:background 0.1s;"
                onmousedown="obNatSelect('${inputId}','${natVal}','${inputId.replace(/'/g,"\\'")}NatCb')"
                onmouseenter="obNatHover(this)"
                onmouseleave="obNatUnhover(this)"
            >${obFlagImg(c.code, 18)} ${natVal}</div>`;
        }).join('');
    listEl.style.display = 'block';
    // Reset cursor index
    listEl.dataset.cursorIdx = '-1';
};

window.obNatHover = function(el) { el.style.background = '#eff6ff'; el.style.color = '#2563eb'; };
window.obNatUnhover = function(el) { el.style.background = ''; el.style.color = '#1e293b'; };

window.obNatSelect = function(inputId, name, cbName) {
    const inp = document.getElementById(inputId);
    if (inp) { inp.value = name; }
    obNatClose(inputId);
    // Trigger the save callback
    if (cbName && window[cbName]) window[cbName]();
};

window.obNatClose = function(inputId) {
    const listEl = document.getElementById(inputId + '-natlist');
    if (listEl) listEl.style.display = 'none';
};

window.obNatKeyNav = function(event, inputId, cbName) {
    const listEl = document.getElementById(inputId + '-natlist');
    if (!listEl || listEl.style.display === 'none') {
        if (event.key === 'ArrowDown' || event.key === 'Enter') obNatSearch(inputId);
        return;
    }
    const items = listEl.querySelectorAll('.ob-nat-item');
    let cur = parseInt(listEl.dataset.cursorIdx || '-1');
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        cur = Math.min(cur + 1, items.length - 1);
        items.forEach((el, i) => {
            el.style.background = i === cur ? '#dbeafe' : '';
            el.style.color = i === cur ? '#1d4ed8' : '#1e293b';
            el.style.fontWeight = i === cur ? '700' : '500';
        });
        listEl.dataset.cursorIdx = cur;
        if (items[cur]) items[cur].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        cur = Math.max(cur - 1, 0);
        items.forEach((el, i) => {
            el.style.background = i === cur ? '#dbeafe' : '';
            el.style.color = i === cur ? '#1d4ed8' : '#1e293b';
            el.style.fontWeight = i === cur ? '700' : '500';
        });
        listEl.dataset.cursorIdx = cur;
        if (items[cur]) items[cur].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (cur >= 0 && items[cur]) {
            const name = items[cur].dataset.nat;
            obNatSelect(inputId, name, cbName);
        }
    } else if (event.key === 'Escape') {
        obNatClose(inputId);
    }
};

function renderActiveStepForm(container) {
    const stepKey = state.activeObStepKey;
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;

    const stepField = step.field;
    const stepData = state.onboarding[stepField] || { status: 'pending', data: {}, documents: [] };
    const status = stepData.status || 'pending';
    const data = stepData.data || {};
    const docs = stepData.documents || [];
    const reviewNotes = stepData.reviewNotes || '';
    
    const friendlyStatus = getFriendlyStatus(stepKey, state.onboarding);
    const isReadOnly = ['submitted', 'under_review', 'approved'].includes(friendlyStatus);

    const isMultiItem = step && step.dynamicSection === true;
    let contentHtml = '';

    if (stepKey === 'document_checklist') {
        contentHtml = obRenderDocumentChecklistHtml(isReadOnly);
    } else if (stepKey === 'share_capital') {
        contentHtml = obRenderShareCapitalHtml(isReadOnly);
    } else if (isMultiItem) {
        if (!data.list || !Array.isArray(data.list)) {
            data.list = [];
        }
        if (data.list.length === 0) {
            data.list.push({});
        }

        contentHtml = data.list.map((item, idx) => {
            const currentRequiredDocs = getStepRequiredDocs(stepKey, item);
            const currentManualFields = getStepManualFields(stepKey, item);
            
            let itemDocsHtml = '';
            if (currentRequiredDocs && currentRequiredDocs.length > 0) {
                itemDocsHtml = `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Documents for this entry</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            ${currentRequiredDocs.map(doc => {
                                const docTypeWithIdx = `${doc.type}_${idx}`;
                                const uploaded = docs.find(d => d.type === docTypeWithIdx);
                                
                                let isReq = true;
                                if (stepKey === 'corporate_shareholder') {
                                    const country = (item.countryOfIncorporation || '').trim().toLowerCase();
                                    const isSG = country === 'singapore' || country === 'sg' || country === '';
                                    if (isSG) {
                                        isReq = (doc.type === 'bizfile' || doc.type === 'constitution');
                                    } else {
                                        isReq = (doc.type === 'cert_incorporation' || doc.type === 'constitution' || doc.type === 'supporting_docs');
                                    }
                                }
                                if (stepKey === 'individual_shareholder') {
                                    if (item.sameAsDirector === true || item.sameAsDirector === 'true') {
                                        isReq = false;
                                    }
                                }
                                const labelText = doc.label + (isReq ? ' (Required)' : ' (Optional)');
                                
                                return `
                                <div class="ob-doc-upload" id="doc-${stepKey}-${docTypeWithIdx}" 
                                     style="${uploaded ? 'border-color:#16a34a;background:#f0fdf4;' : ''} ${isReadOnly ? 'cursor:default;opacity:0.85;' : ''} padding: 12px; cursor:default;"
                                >
                                    ${uploaded
                                        ? `<div style='color:#16a34a;font-size:11px;font-weight:700;'>
                                            ✅ ${labelText}<br>
                                            <span style='font-size:9px;font-weight:500;color:#374151;word-break:break-all;'>${uploaded.fileName || 'Uploaded'}</span>
                                            ${isReadOnly ? '' : `
                                                <div style="margin-top:6px;text-align:right;">
                                                    <button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('${stepKey}','${docTypeWithIdx}', ${idx})" style="padding:2px 8px;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;color:#dc2626;font-size:9px;font-weight:700;cursor:pointer;">
                                                        Remove Doc
                                                    </button>
                                                </div>
                                            `}
                                           </div>`
                                        : `<div style='color:#64748b;cursor:pointer;' ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('${stepKey}','${docTypeWithIdx}','${doc.label}', ${idx})"`}>
                                            <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='margin:0 auto 4px;display:block;'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' x2='12' y1='3' y2='15'/></svg>
                                            <div style='font-size:11px;font-weight:600;'>${labelText}</div>
                                            ${isReadOnly ? '' : `<div style='font-size:9px;color:#94a3b8;margin-top:2px;'>Click to upload</div>`}
                                           </div>`
                                    }
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            let itemFieldsHtml = '';
            const hasNric = docs.some(d => d.type === `nric_${idx}`);
            const hasAddress = docs.some(d => d.type === `address_proof_${idx}`);
            const showFields = (stepKey !== 'director_details') || (hasNric || hasAddress);

            if (showFields) {
                if (currentManualFields && currentManualFields.length > 0) {
                    itemFieldsHtml = `
                        <div class="ob-field-row">
                            ${currentManualFields.map(f => {
                                const val = item[f.key] !== undefined ? item[f.key] : '';
                                const inputId = `ob-${stepKey}-${idx}-${f.key}`;
                                const readonlyAttr = (f.readonly || isReadOnly) ? 'readonly' : '';
                                
                                if (f.key === 'sameAsDirector') {
                                    const disabledAttr = (f.readonly || isReadOnly) ? 'disabled' : '';
                                    const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
                                    const dirList = dirStep && state.onboarding[dirStep.field] ? (state.onboarding[dirStep.field].data.list || []) : [];
                                    
                                    let selectWrapperHtml = '';
                                    if (val) {
                                        const selectedDirectorIndices = new Set();
                                        const currentStepConfig = ONBOARDING_STEPS.find(s => s.key === stepKey);
                                        const stepField = currentStepConfig ? currentStepConfig.field : 'step3IndividualShareholder';
                                        const shareholdersList = state.onboarding[stepField] && state.onboarding[stepField].data && state.onboarding[stepField].data.list ? state.onboarding[stepField].data.list : [];
                                        shareholdersList.forEach((s, sIdx) => {
                                            if (sIdx !== idx && s.selectedDirectorIdx !== undefined && s.selectedDirectorIdx !== null && s.selectedDirectorIdx !== '') {
                                                selectedDirectorIndices.add(String(s.selectedDirectorIdx));
                                            }
                                        });

                                        selectWrapperHtml = `
                                        <div class="ob-field" style="grid-column: span 2; margin-bottom: 12px;">
                                            <label for="${inputId}-director-select">Select Director Source</label>
                                            <select id="${inputId}-director-select" ${disabledAttr} onchange="obIndividualShareholderSameAsDirectorChange(${idx}, this.value)">
                                                <option value="">Select Director</option>
                                                ${dirList.map((d, dIdx) => {
                                                    const isSelected = item.selectedDirectorIdx === String(dIdx);
                                                    if (!isSelected && selectedDirectorIndices.has(String(dIdx))) {
                                                        return '';
                                                    }
                                                    return `<option value="${dIdx}" ${isSelected ? 'selected' : ''}>Director #${dIdx + 1}: ${d.fullName || '(No Name)'}</option>`;
                                                }).join('')}
                                            </select>
                                        </div>
                                        `;
                                    }
                                    
                                    return `
                                    <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:16px; grid-column: span 2; margin-top: 8px; margin-bottom: 8px;">
                                        <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${disabledAttr} onchange="obIndividualShareholderSameAsDirectorCheckboxChange(${idx}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
                                        <label for="${inputId}" style="cursor:pointer; margin-bottom:0; font-size:12px; font-weight:600; text-transform:none; letter-spacing:normal; color:#475569; user-select:none;">${f.label}</label>
                                    </div>
                                    ${selectWrapperHtml}
                                    `;
                                }
                                
                                if (f.type === 'select') {
                                    let disabledAttr = isReadOnly ? 'disabled' : '';
                                    if (f.key === 'uboDeclaration') {
                                        disabledAttr = 'disabled';
                                    }
                                    
                                    let options = f.options || [];
                                    if (stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') {
                                        const scStep = state.onboarding.stepShareCapital || {};
                                        const scData = scStep.data || {};
                                        const scCurrencies = scData.currencies || [];
                                        
                                        if (f.key === 'currency') {
                                            const configuredCurrs = new Set();
                                            scCurrencies.forEach(c => {
                                                const currCode = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
                                                if (currCode) {
                                                    configuredCurrs.add(currCode);
                                                }
                                            });
                                            if (configuredCurrs.size > 0) {
                                                options = ['Select', ...Array.from(configuredCurrs)];
                                            }
                                        } else if (f.key === 'shareClass') {
                                            const configuredClasses = new Set();
                                            scCurrencies.forEach(c => {
                                                const sc = c.shareClass || '';
                                                if (sc) {
                                                    configuredClasses.add(sc);
                                                }
                                            });
                                            if (configuredClasses.size > 0) {
                                                options = ['Select', ...Array.from(configuredClasses)];
                                            }
                                        }
                                    }
                                    
                                    return `
                                    <div class="ob-field">
                                        <label for="${inputId}">${f.label}</label>
                                        <select id="${inputId}" onchange="triggerMultiItemAutoSave('${stepKey}', ${idx})" ${disabledAttr}>
                                            ${options.map(o => `<option value='${o}' ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
                                        </select>
                                    </div>`;
                                } else if (f.type === 'checkbox') {
                                    const disabledAttr = (f.readonly || isReadOnly) ? 'disabled' : '';
                                    return `
                                    <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:16px; grid-column: span 2; margin-top: 8px; margin-bottom: 8px;">
                                        <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${disabledAttr} onchange="triggerMultiItemAutoSave('${stepKey}', ${idx}, true)" style="width:16px; height:16px; cursor:pointer;">
                                        <label for="${inputId}" style="cursor:pointer; margin-bottom:0; font-size:12px; font-weight:600; text-transform:none; letter-spacing:normal; color:#475569; user-select:none;">${f.label}</label>
                                    </div>`;
                                } else if (f.type === 'phone') {
                                    let fieldReadonlyAttr = readonlyAttr;
                                    if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                                        fieldReadonlyAttr = 'readonly';
                                    }
                                    const cbKey = `${inputId.replace(/-/g,'_')}NatCb`;
                                    return obRenderPhoneField({
                                        inputId,
                                        val: String(val),
                                        readonlyAttr: fieldReadonlyAttr,
                                        onInputCallback: `triggerMultiItemAutoSave('${stepKey}', ${idx})`
                                    });
                                } else if (f.type === 'nationality') {
                                    let fieldReadonlyAttr = readonlyAttr;
                                    if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                                        fieldReadonlyAttr = 'readonly';
                                    }
                                    const cbKey = inputId.replace(/-/g,'_') + 'NatCb';
                                    window[cbKey] = () => {
                                        const el = document.getElementById(inputId);
                                        if (el) {
                                            const stepData = state.onboarding[ONBOARDING_STEPS.find(s=>s.key===stepKey).field];
                                            if (stepData && stepData.data && stepData.data.list && stepData.data.list[idx]) {
                                                stepData.data.list[idx][f.key] = el.value;
                                            }
                                            triggerMultiItemAutoSave(stepKey, idx);
                                        }
                                    };
                                    return obRenderNationalityField({
                                        inputId,
                                        val: String(val),
                                        readonlyAttr: fieldReadonlyAttr,
                                        onChangeCallback: cbKey
                                    });
                                } else {
                                    let fieldReadonlyAttr = readonlyAttr;
                                    if (f.readonly === true) {
                                        fieldReadonlyAttr = 'readonly';
                                    }
                                    if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                                        const isPersonalField = ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].includes(f.key);
                                        if (isPersonalField) fieldReadonlyAttr = 'readonly';
                                    }
                                    
                                    let validationWarningHtml = '';
                                    let isIdDuplicate = false;
                                    if (f.key === 'idNumber' && val) {
                                        const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
                                        const stepData = state.onboarding[stepField] || {};
                                        const list = (stepData.data && stepData.data.list) || [];
                                        isIdDuplicate = list.some((item, itemIdx) => itemIdx !== idx && item.idNumber && String(item.idNumber).trim().toUpperCase() === String(val).trim().toUpperCase());
                                    }
                                    if ((stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') && (f.key === 'numberOfShares' || f.key === 'shareCapitalAmount' || f.key === 'numberOfSharesPct' || f.key === 'shareCapitalAmountPct')) {
                                        const shCurr = (item.currency || '').trim().toUpperCase();
                                        const shClass = (item.shareClass || '').trim();
                                        
                                        if (shCurr && shCurr !== 'SELECT' && shClass && shClass !== 'SELECT') {
                                            const ob = state.onboarding || {};
                                            const currencies = (ob.stepShareCapital && ob.stepShareCapital.data && ob.stepShareCapital.data.currencies) || [];
                                            const masterItem = currencies.find(c => {
                                                const masterCurr = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
                                                return masterCurr.toUpperCase() === shCurr && c.shareClass === shClass;
                                            });

                                            if (!masterItem) {
                                                validationWarningHtml = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">⚠️ Warning: Currency/Class combo (${shCurr} - ${shClass}) not configured in Share Capital Details step.</div>`;
                                            } else {
                                                const indStep = ob.step3IndividualShareholder || { data: { list: [] } };
                                                const indList = indStep.data.list || [];
                                                const corpStep = ob.step4CorporateShareholder || { data: { list: [] } };
                                                const corpList = corpStep.data.list || [];

                                                let usedShares = 0;
                                                let usedCapital = 0;

                                                indList.forEach((sh, shIdx) => {
                                                    if (shIdx === idx && stepKey === 'individual_shareholder') return;
                                                    const c = (sh.currency || '').trim().toUpperCase();
                                                    const cl = (sh.shareClass || '').trim();
                                                    if (c === shCurr && cl === shClass) {
                                                        usedShares += parseFloat(sh.numberOfShares) || 0;
                                                        usedCapital += parseFloat(sh.shareCapitalAmount) || 0;
                                                    }
                                                });

                                                corpList.forEach((sh, shIdx) => {
                                                    if (shIdx === idx && stepKey === 'corporate_shareholder') return;
                                                    const c = (sh.currency || '').trim().toUpperCase();
                                                    const cl = (sh.shareClass || '').trim();
                                                    if (c === shCurr && cl === shClass) {
                                                        usedShares += parseFloat(sh.numberOfShares) || 0;
                                                        usedCapital += parseFloat(sh.shareCapitalAmount) || 0;
                                                    }
                                                });

                                                const availableShares = masterItem.numberOfShares - usedShares;
                                                const availableCapital = masterItem.shareCapitalAmount - usedCapital;

                                                if (f.key === 'numberOfShares' || f.key === 'numberOfSharesPct') {
                                                    const enteredShares = parseFloat(item.numberOfShares) || 0;
                                                    if (enteredShares > availableShares) {
                                                        validationWarningHtml = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">⚠️ Warning: Allocation (${enteredShares}) exceeds available limit of ${availableShares} shares.</div>`;
                                                    } else {
                                                        validationWarningHtml = `<div style="color:#16a34a;font-size:10px;font-weight:600;margin-top:4px;">Available limit: ${availableShares} shares (total master: ${masterItem.numberOfShares})</div>`;
                                                    }
                                                } else if (f.key === 'shareCapitalAmount' || f.key === 'shareCapitalAmountPct') {
                                                    const enteredCapital = parseFloat(item.shareCapitalAmount) || 0;
                                                    if (enteredCapital > availableCapital) {
                                                        validationWarningHtml = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">⚠️ Warning: Allocation (${enteredCapital}) exceeds available limit of ${availableCapital} ${shCurr}.</div>`;
                                                    } else {
                                                        validationWarningHtml = `<div style="color:#16a34a;font-size:10px;font-weight:600;margin-top:4px;">Available limit: ${availableCapital} ${shCurr} (total master: ${masterItem.shareCapitalAmount})</div>`;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    const isIdField = f.key === 'idNumber' || f.key === 'uen';
                                    const isFullWidth = ['residentialAddress', 'alternativeAddress', 'registeredAddress'].includes(f.key);
                                    return `
                                    <div class="ob-field" style="${isFullWidth ? 'grid-column: span 2;' : ''}">
                                        <label for="${inputId}">${f.label}</label>
                                        <input type="${f.type || 'text'}" id="${inputId}" value="${val}" placeholder="Enter ${f.label.toLowerCase()}" ${fieldReadonlyAttr} 
                                            oninput="${isIdField ? 'obIdNumberInputHandler(this); ' : ''}triggerMultiItemAutoSave('${stepKey}', ${idx})">
                                        <div id="${inputId}-warn" style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;display:${(f.key === 'idNumber' && isIdDuplicate) ? 'block' : 'none'};">⚠️ Warning: This NRIC / FIN is already registered for another entry.</div>
                                        ${validationWarningHtml}
                                    </div>`;
                                }
                            }).join('')}
                        </div>
                    `;
                }
            } else {
                itemFieldsHtml = `
                    <div style="margin-top: 16px; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 8px; display: block;"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">Form Fields Locked</div>
                        <div style="font-size: 11px; color: #64748b; line-height: 1.4;">Please upload both the NRIC / FIN and Utility Bill / Bank Statement / Mobile Bill above. Once uploaded, OCR will extract your details and all fields will be unlocked for manual confirmation.</div>
                    </div>
                `;
            }
            
            let itemLabel = 'Entry';
            if (step.title) {
                if (step.title.toLowerCase().endsWith(' details')) {
                    itemLabel = step.title.substring(0, step.title.toLowerCase().lastIndexOf(' details'));
                } else {
                    itemLabel = step.title;
                }
            } else if (stepKey === 'director_details') {
                itemLabel = 'Director';
            } else if (stepKey === 'individual_shareholder') {
                itemLabel = 'Individual Shareholder';
            } else if (stepKey === 'corporate_shareholder') {
                itemLabel = 'Corporate Shareholder';
            }
            
            return `
                <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 20px; background: #ffffff; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="font-family: Outfit, sans-serif; font-size: 14px; font-weight: 800; color: #1e293b; margin: 0;">${itemLabel} #${idx + 1}</h4>
                        ${isReadOnly || data.list.length <= 1 ? '' : `
                            <button type="button" onclick="removeMultiItem('${stepKey}', ${idx})" style="padding: 6px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                                ❌ Remove
                            </button>
                        `}
                    </div>
                    ${itemDocsHtml}
                    ${itemFieldsHtml}
                </div>
            `;
        }).join('');
        
        if (!isReadOnly) {
            let itemLabel = 'Entry';
            if (step.title) {
                if (step.title.toLowerCase().endsWith(' details')) {
                    itemLabel = step.title.substring(0, step.title.toLowerCase().lastIndexOf(' details'));
                } else {
                    itemLabel = step.title;
                }
            } else if (stepKey === 'director_details') {
                itemLabel = 'Director';
            } else if (stepKey === 'individual_shareholder') {
                itemLabel = 'Individual Shareholder';
            } else if (stepKey === 'corporate_shareholder') {
                itemLabel = 'Corporate Shareholder';
            }
            contentHtml += `
                <div style="margin-top: 10px; margin-bottom: 24px;">
                    <button type="button" onclick="addMultiItem('${stepKey}')" style="padding: 10px 20px; background: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-family: Outfit, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        ➕ Add ${itemLabel}
                    </button>
                </div>
            `;
        }
    } else {
        const currentRequiredDocs = getStepRequiredDocs(stepKey, data);
        const currentManualFields = getStepManualFields(stepKey, data);
        
        let docsHtml = '';
        if (currentRequiredDocs && currentRequiredDocs.length > 0) {
            docsHtml = `
                <div style="margin-bottom: 24px;">
                    <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;">Required Document Uploads</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        ${currentRequiredDocs.map(doc => {
                            const uploaded = docs.find(d => d.type === doc.type);
                            const labelText = doc.label + ' (Required)';
                            
                            return `
                            <div class="ob-doc-upload" id="doc-${step.key}-${doc.type}" 
                                 ${isReadOnly ? '' : `onclick="obUploadDoc('${step.key}','${doc.type}','${doc.label}')"`}
                                 style="${uploaded ? 'border-color:#16a34a;background:#f0fdf4;' : ''} ${isReadOnly ? 'cursor:default;opacity:0.85;' : ''}"
                            >
                                ${uploaded
                                    ? `<div style='color:#16a34a;font-size:12px;font-weight:700;'>
                                        ✅ ${labelText}<br>
                                        <span style='font-size:10px;font-weight:500;color:#374151;word-break:break-all;'>${uploaded.fileName || 'Uploaded'}</span>
                                        ${isReadOnly ? '' : `
                                            <div style="margin-top:6px;text-align:right;">
                                                <button type="button" onclick="event.stopPropagation(); obClearDoc('${step.key}','${doc.type}')" style="padding:2px 8px;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;color:#dc2626;font-size:9px;font-weight:700;cursor:pointer;">
                                                    Remove Doc
                                                </button>
                                            </div>
                                        `}
                                       </div>`
                                    : `<div style='color:#64748b;'>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='margin:0 auto 8px;display:block;'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' x2='12' y1='3' y2='15'/></svg>
                                        <div style='font-size:12px;font-weight:600;'>${labelText}</div>
                                        ${isReadOnly ? '' : `<div style='font-size:10px;color:#94a3b8;margin-top:3px;'>Click to upload</div>`}
                                       </div>`
                                }
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        let fieldsHtml = '';
        if (currentManualFields && currentManualFields.length > 0) {
            fieldsHtml = `
                <div style="margin-bottom:24px;">
                    <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;">Information Checklist details</div>
                    <div class="ob-field-row">
                        ${currentManualFields.map(f => {
                            const val = data[f.key] !== undefined ? data[f.key] : '';
                            const inputId = `ob-${step.key}-${f.key}`;
                            const readonlyAttr = (f.readonly || isReadOnly) ? 'readonly' : '';
                            
                            if (f.type === 'select') {
                                return `
                                <div class="ob-field">
                                    <label for="${inputId}">${f.label}</label>
                                    <select id="${inputId}" onchange="triggerAutoSave('${step.key}')" ${isReadOnly ? 'disabled' : ''}>
                                        ${(f.options || []).map(o => `<option value='${o}' ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </div>`;
                            } else if (f.type === 'checkbox') {
                                return `
                                <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:24px;">
                                    <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="triggerAutoSave('${step.key}')" style="width:16px; height:16px; cursor:pointer;">
                                    <label for="${inputId}" style="cursor:pointer; margin-bottom:0; font-size:12px; font-weight:600; text-transform:none; letter-spacing:normal; color:#475569;">${f.label}</label>
                                </div>`;
                            } else if (f.type === 'phone') {
                                return obRenderPhoneField({
                                    inputId,
                                    val: String(val),
                                    readonlyAttr,
                                    onInputCallback: `triggerAutoSave('${step.key}')`
                                });
                            } else if (f.type === 'nationality') {
                                const cbKey = inputId.replace(/-/g,'_') + 'NatCb';
                                window[cbKey] = () => {
                                    const el = document.getElementById(inputId);
                                    if (el) {
                                        const sf = ONBOARDING_STEPS.find(s=>s.key===step.key).field;
                                        if (!state.onboarding[sf]) state.onboarding[sf] = { data:{}, status:'pending', documents:[] };
                                        state.onboarding[sf].data[f.key] = el.value;
                                        triggerAutoSave(step.key);
                                    }
                                };
                                return obRenderNationalityField({
                                    inputId,
                                    val: String(val),
                                    readonlyAttr,
                                    onChangeCallback: cbKey
                                });
                            } else {
                                return `
                                <div class="ob-field">
                                    <label for="${inputId}">${f.label}</label>
                                    <input type="${f.type || 'text'}" id="${inputId}" value="${val}" placeholder="Enter ${f.label.toLowerCase()}" ${readonlyAttr} oninput="triggerAutoSave('${step.key}')">
                                </div>`;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        contentHtml = docsHtml + fieldsHtml;
    }

    if (stepKey === 'final_declaration') {
        const incompleteSteps = ONBOARDING_STEPS.filter(s => s.key !== 'final_declaration' && !['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, state.onboarding)));
        if (incompleteSteps.length > 0) {
            contentHtml = `
                <div style="margin-bottom:24px;background:#fef2f2;border:1px solid #fecaca;border-radius:16px;padding:20px;">
                    <div style="font-size:14px;font-weight:800;color:#dc2626;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Please complete all previous steps first:
                    </div>
                    <ul style="list-style-type:disc;padding-left:20px;font-size:13px;color:#b91c1c;line-height:1.6;margin:0;">
                        ${incompleteSteps.map(s => `<li>${s.title}</li>`).join('')}
                    </ul>
                </div>
            ` + contentHtml;
        } else {
            contentHtml = `
                <div style="margin-bottom:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;display:flex;align-items:center;gap:12px;color:#16a34a;font-weight:600;font-size:13px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    All previous onboarding steps are completed successfully! Please review, sign the declarations, and submit.
                </div>
            ` + contentHtml;
        }
    }

    let declHtml = '';
    if (step.declaration) {
        const disabledAttr = isReadOnly ? 'disabled' : '';
        declHtml = `
            <div style="margin-bottom:24px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 14px;">
                <label style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#475569;cursor:${isReadOnly ? 'default' : 'pointer'};">
                    <input type="checkbox" id="ob-decl-${step.key}" ${data.declarationAgreed ? 'checked' : ''} ${disabledAttr} onchange="triggerAutoSave('${step.key}')" style="margin-top:2px;">
                    ${step.declaration}
                </label>
            </div>
        `;
    }

    let statusBannerHtml = '';
    if (friendlyStatus === 'approved') {
        statusBannerHtml = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:10px;color:#16a34a;font-weight:600;font-size:13px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                This section has been approved by the Globalisor team. It is locked.
            </div>
        `;
    } else if (friendlyStatus === 'submitted' || friendlyStatus === 'under_review') {
        statusBannerHtml = `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:10px;color:#b45309;font-weight:600;font-size:13px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Submitted for verification. This section is locked from editing.
            </div>
        `;
    } else if (friendlyStatus === 'rejected') {
        statusBannerHtml = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px;margin-bottom:20px;display:flex;flex-direction:column;gap:6px;color:#dc2626;font-size:13px;">
                <div style="display:flex;align-items:center;gap:10px;font-weight:700;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Action Required: This step needs your corrections.
                </div>
                ${reviewNotes ? `<div style="font-weight:500;color:#991b1b;margin-left:26px;"><b>Admin notes:</b> ${reviewNotes}</div>` : ''}
            </div>
        `;
    }

    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.key === stepKey);
    const hasPrev = stepIndex > 0;
    const hasNext = stepIndex < ONBOARDING_STEPS.length - 1;

    container.innerHTML = `
        <h3 style="font-family:Outfit,sans-serif;font-size:18px;font-weight:800;color:#0f172a;margin-bottom:6px;">${step.title}</h3>
        <p style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:24px;">${step.description}</p>
        
        ${statusBannerHtml}
        
        <div id="ob-validation-errors" class="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl hidden"></div>
        
        ${contentHtml}
        ${declHtml}
        
        <div style="display:flex;justify-content:space-between;margin-top:32px;padding-top:20px;border-top:1px solid #f1f5f9;">
            ${hasPrev 
                ? `<button onclick="obPrevStep()" style="padding:10px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:#475569;cursor:pointer;display:flex;align-items:center;gap:6px;">← Previous Step</button>` 
                : `<div></div>`
            }
            ${hasNext 
                ? `<button id="ob-continue-btn" onclick="obNextStep()" style="padding:10px 24px;background:#e2e8f0;color:#94a3b8;border:none;border-radius:12px;font-family:Outfit,sans-serif;font-size:13px;font-weight:700;cursor:not-allowed;transition:all 0.2s;display:flex;align-items:center;gap:6px;">Continue to Next Step →</button>`
                : `<button id="ob-final-submit-btn" onclick="obSubmitAllForVerification()" class="ob-submit-btn" disabled style="padding:10px 24px;">Submit for Verification ✓</button>`
            }
        </div>
    `;

    updateWizardUIFeedback();
}

function updateWizardUIFeedback() {
    const ob = state.onboarding || {};
    
    // 1. Calculate progress
    const completedCount = ONBOARDING_STEPS.filter(s => ['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, ob))).length;
    const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);
    
    const progressFill = document.getElementById('ob-progress-fill');
    const progressPctText = document.getElementById('ob-progress-percent');
    if (progressFill) progressFill.style.width = progressPercent + '%';
    if (progressPctText) progressPctText.innerText = progressPercent + '%';

    // 2. Stepper list update
    ONBOARDING_STEPS.forEach((step, idx) => {
        const tab = document.getElementById(`tab-${step.key}`);
        const iconEl = document.getElementById(`icon-${step.key}`);
        const badgeEl = document.getElementById(`badge-${step.key}`);
        if (!tab || !iconEl || !badgeEl) return;

        const friendly = getFriendlyStatus(step.key, ob);
        const locked = isStepLocked(idx, ob);
        const active = (state.activeObStepKey === step.key);

        tab.className = 'wizard-step-tab';
        if (active) tab.classList.add('active');
        if (locked) tab.classList.add('locked');
        if (friendly === 'completed' || friendly === 'approved') tab.classList.add('completed');

        badgeEl.className = `wizard-step-badge badge-${friendly.replace(/_/g, '-')}`;
        let statusText = friendly.replace(/_/g, ' ');
        if (friendly === 'completed') statusText = 'Completed (Draft)';
        badgeEl.innerText = statusText;

        if (locked) {
            iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        } else if (friendly === 'completed' || friendly === 'approved') {
            iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (friendly === 'rejected') {
            iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        } else {
            iconEl.innerHTML = `<span style="font-weight: 800; font-size: 11px;">0${idx+1}</span>`;
        }
    });

    // 3. Validation errors — highlight fields in red instead of showing a list
    const errors = validateStep(state.activeObStepKey, ob);
    const errContainer = document.getElementById('ob-validation-errors');
    const showErrors = !!(errors.length > 0 && state.showObErrors && state.showObErrors[state.activeObStepKey]);

    if (errContainer) {
        if (showErrors) {
            errContainer.classList.remove('hidden');
            errContainer.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:700;color:#991b1b;">
                    ${errors.map(err => `
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:15px;">⚠️</span>
                            <span>${err}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            errContainer.classList.add('hidden');
        }
    }

    // Apply or clear red highlights on individual fields
    highlightInvalidFields(state.activeObStepKey, ob, showErrors);

    // 4. Continue button
    const continueBtn = document.getElementById('ob-continue-btn');
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        continueBtn.style.background = 'linear-gradient(135deg,#3b82f6,#06b6d4)';
    }

    // 5. Submit for Verification button
    const submitBtn = document.getElementById('ob-submit-verification-btn');
    const finalSubmitBtn = document.getElementById('ob-final-submit-btn');
    const allCompleted = ONBOARDING_STEPS.every(s => ['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, ob)));
    const needsSubmission = ONBOARDING_STEPS.some(s => {
        const status = getFriendlyStatus(s.key, ob);
        return status === 'completed' || status === 'rejected';
    });
    
    const canSubmit = allCompleted && needsSubmission;
    if (submitBtn) submitBtn.disabled = !canSubmit;
    if (finalSubmitBtn) {
        finalSubmitBtn.disabled = !canSubmit;
        if (canSubmit) {
            finalSubmitBtn.style.opacity = '1';
            finalSubmitBtn.style.cursor = 'pointer';
            finalSubmitBtn.style.background = 'linear-gradient(135deg,#16a34a,#10b981)';
        } else {
            finalSubmitBtn.style.opacity = '0.5';
            finalSubmitBtn.style.cursor = 'not-allowed';
            finalSubmitBtn.style.background = '#e2e8f0';
        }
    }
}

function triggerAutoSave(stepKey) {
    if (obAutoSaveTimeout) clearTimeout(obAutoSaveTimeout);
    
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    if (!state.onboarding) state.onboarding = {};
    if (!state.onboarding[stepField]) state.onboarding[stepField] = { data: {}, status: 'pending', documents: [] };
    const stepData = state.onboarding[stepField];
    
    if (stepKey === 'individual_verification') {
        const typeEl = document.getElementById('ob-individual_verification-shareholderType');
        if (typeEl) {
            const oldType = stepData.data.shareholderType;
            const newType = typeEl.value;
            if (oldType && oldType !== newType) {
                // Type changed! Update data immediately and re-render.
                stepData.data.shareholderType = newType;
                
                // Clear out other fields
                const keepKeys = ['shareholderType'];
                Object.keys(stepData.data).forEach(k => {
                    if (!keepKeys.includes(k)) {
                        delete stepData.data[k];
                    }
                });
                stepData.documents = [];
                state.onboarding[stepField] = stepData;
                updateWizardUIFeedback();
                
                (async () => {
                    await ensureOnboardingRecord();
                    if (state.onboardingId) {
                        try {
                            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/individual_verification`, {
                                method: 'PATCH',
                                headers: {'Content-Type':'application/json'},
                                body: JSON.stringify({
                                    data: stepData.data,
                                    documents: stepData.documents,
                                    status: 'pending'
                                })
                            });
                            if (res.ok) {
                                state.onboarding = normalizeOnboardingData(await res.json());
                            }
                        } catch (e) {}
                    }
                    const mainView = document.getElementById('main-view');
                    if (mainView) renderOnboarding(mainView);
                })();
                return;
            }
        }
    }

    const currentManualFields = getStepManualFields(stepKey, stepData.data);
    
    if (currentManualFields) {
        currentManualFields.forEach(f => {
            const el = document.getElementById(`ob-${stepKey}-${f.key}`);
            if (el) {
                if (f.type === 'checkbox') {
                    stepData.data[f.key] = el.checked;
                } else if (f.type === 'phone') {
                    stepData.data[f.key] = el.dataset.fullVal || ((() => {
                        const sel = document.getElementById(`ob-${stepKey}-${f.key}-country-val`);
                        if (sel) {
                            const [code, dial] = sel.value.split('|');
                            return `${code}:${dial}:${el.value}`;
                        }
                        return el.value;
                    })());
                } else if (f.type === 'nationality') {
                    stepData.data[f.key] = el.value;
                } else {
                    stepData.data[f.key] = el.value;
                }
            }
        });
    }
    
    const declEl = document.getElementById(`ob-decl-${stepKey}`);
    if (declEl) {
        stepData.data.declarationAgreed = declEl.checked;
    }
    
    if (stepKey === 'individual_shareholder') {
        const sameAsDirectorEl = document.getElementById('ob-individual_shareholder-sameAsDirector');
        if (sameAsDirectorEl && sameAsDirectorEl.checked) {
            const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
            const dirStepField = dirStep ? dirStep.field : null;
            if (dirStepField) {
                const dirData = (state.onboarding[dirStepField] || {}).data || {};
                // Copy fields
                ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(key => {
                    const el = document.getElementById(`ob-individual_shareholder-${key}`);
                    if (el && dirData[key]) {
                        el.value = dirData[key];
                        stepData.data[key] = dirData[key];
                    }
                });
            }
        }
    }
    
    if (stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') {
        const numSharesEl = document.getElementById(`ob-${stepKey}-numberOfShares`);
        const numSharesPctEl = document.getElementById(`ob-${stepKey}-numberOfSharesPct`);
        const shareCapitalAmountEl = document.getElementById(`ob-${stepKey}-shareCapitalAmount`);
        const shareCapitalAmountPctEl = document.getElementById(`ob-${stepKey}-shareCapitalAmountPct`);
        const ownershipEl = document.getElementById(`ob-${stepKey}-ownershipPercentage`);
        const uboEl = document.getElementById(`ob-${stepKey}-uboDeclaration`);
        
        const shCurr = (stepData.data.currency || '').trim().toUpperCase();
        const shClass = (stepData.data.shareClass || '').trim();
        
        let totalSharesForCombo = 0;
        let totalAmountForCombo = 0;
        if (shCurr && shCurr !== 'SELECT' && shClass && shClass !== 'SELECT') {
            const scStep = state.onboarding.stepShareCapital || {};
            const scData = scStep.data || {};
            const scCurrencies = scData.currencies || [];
            const match = scCurrencies.find(c => {
                const scCurr = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
                return scCurr.toUpperCase() === shCurr && c.shareClass === shClass;
            });
            if (match) {
                totalSharesForCombo = parseFloat(match.numberOfShares) || 0;
                totalAmountForCombo = parseFloat(match.shareCapitalAmount) || 0;
            }
        }
        
        let pctVal = 0;
        if (numSharesPctEl) {
            const pct = parseFloat(numSharesPctEl.value) || 0;
            stepData.data.numberOfSharesPct = numSharesPctEl.value === '' ? '' : pct;
            const calculatedShares = Math.round((pct / 100) * totalSharesForCombo);
            stepData.data.numberOfShares = calculatedShares;
            if (numSharesEl) {
                numSharesEl.value = calculatedShares;
            }
            pctVal = pct;
        }
        
        if (shareCapitalAmountPctEl) {
            const pct = parseFloat(shareCapitalAmountPctEl.value) || 0;
            stepData.data.shareCapitalAmountPct = shareCapitalAmountPctEl.value === '' ? '' : pct;
            const calculatedCapital = Math.round((pct / 100) * totalAmountForCombo * 100) / 100;
            stepData.data.shareCapitalAmount = calculatedCapital;
            if (shareCapitalAmountEl) {
                shareCapitalAmountEl.value = calculatedCapital;
            }
        }

        if (ownershipEl) {
            ownershipEl.value = pctVal;
            stepData.data.ownershipPercentage = pctVal;
        }
        if (uboEl) {
            const uboVal = pctVal >= 25 ? 'Yes' : 'No';
            uboEl.value = uboVal;
            stepData.data.uboDeclaration = uboVal;
        }
        
        if (stepKey === 'individual_shareholder' && pctVal >= 25) {
            const uboStep = ONBOARDING_STEPS.find(s => s.key === 'ubo');
            const uboField = uboStep ? uboStep.field : null;
                if (uboField) {
                    if (!state.onboarding[uboField]) state.onboarding[uboField] = { data: {}, status: 'pending', documents: [] };
                    
                    // Copy fields
                    ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile', 'ownershipPercentage'].forEach(key => {
                        const sourceVal = stepData.data[key];
                        if (sourceVal !== undefined) {
                            state.onboarding[uboField].data[key] = sourceVal;
                        }
                    });
                    
                    // Also copy NRIC/FIN document if uploaded in step 3
                    const sourceDocs = stepData.documents || [];
                    const nricDoc = sourceDocs.find(d => d.type === 'nric');
                    if (nricDoc) {
                        const targetDocs = state.onboarding[uboField].documents || [];
                        const hasNric = targetDocs.some(d => d.type === 'nric');
                        if (!hasNric) {
                            targetDocs.push({ ...nricDoc });
                            state.onboarding[uboField].documents = targetDocs;
                        }
                    }
                    
                    // Trigger background save of UBO step data so it persists
                    (async () => {
                        await ensureOnboardingRecord();
                        if (state.onboardingId) {
                            await fetch(`/api/onboarding/${state.onboardingId}/step/ubo`, {
                                method: 'PATCH',
                                headers: {'Content-Type':'application/json'},
                                body: JSON.stringify({
                                    data: state.onboarding[uboField].data,
                                    documents: state.onboarding[uboField].documents,
                                    status: 'pending'
                                })
                            });
                        }
                    })();
                }
            }
        }
    
    state.onboarding[stepField] = stepData;
    updateWizardUIFeedback();

    obAutoSaveTimeout = setTimeout(async () => {
        await ensureOnboardingRecord();
        if (!state.onboardingId) return;
        
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    status: stepData.status
                })
            });
            if (res.ok) {
                const updated = await res.json();
                state.onboarding = normalizeOnboardingData(updated);
                console.log(`Auto-saved step ${stepKey}`);
            }
        } catch (e) {
            console.error('Error auto-saving step:', e);
        }
    }, 1000);
}

async function forceSaveActiveStep() {
    if (obAutoSaveTimeout) {
        clearTimeout(obAutoSaveTimeout);
        obAutoSaveTimeout = null;
        
        const stepKey = state.activeObStepKey;
        const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
        if (!step) return;
        const stepField = step.field;
        const stepData = state.onboarding[stepField];
        if (!stepData) return;
        
        await ensureOnboardingRecord();
        if (!state.onboardingId) return;
        
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    status: stepData.status
                })
            });
            if (res.ok) {
                const updated = await res.json();
                state.onboarding = normalizeOnboardingData(updated);
            }
        } catch (e) {
            console.error('Error flushing auto-save:', e);
        }
    }
}

function extractNricFields(text) {
    const extracted = {};
    const t = text;
    
    // 1. NRIC / FIN Number
    const nricMatch = t.match(/([STFGM]\d{7}[A-Z])/i);
    if (nricMatch) {
        extracted.idNumber = nricMatch[1].toUpperCase();
    }
    
    // 2. Full Name
    const lines = t.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let nameIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase() === 'name' || lines[i].toLowerCase().startsWith('name:')) {
            nameIdx = i;
            break;
        }
    }
    if (nameIdx !== -1) {
        for (let i = nameIdx + 1; i < lines.length; i++) {
            const line = lines[i];
            if (['race', 'date of birth', 'sex', 'country of birth', 'identity card no'].includes(line.toLowerCase())) {
                break;
            }
            if (/^[A-Z\s'\-]+$/.test(line) && line.replace(/[^A-Z]/g, '').length > 3) {
                extracted.fullName = line;
                break;
            }
        }
    }
    
    // 3. Date of Birth
    const dobMatch = t.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dobMatch) {
        let day = dobMatch[1];
        let month = dobMatch[2];
        let year = dobMatch[3];
        extracted.dateOfBirth = `${year}-${month}-${day}`;
    }
    
    // 4. Nationality / Race
    let raceIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase() === 'race' || lines[i].toLowerCase() === 'nationality') {
            raceIdx = i;
            break;
        }
    }
    if (raceIdx !== -1 && raceIdx + 1 < lines.length) {
        const nextLine = lines[raceIdx + 1];
        if (/^[A-Z\s]+$/.test(nextLine)) {
            extracted.nationality = nextLine;
        }
    }
    if (!extracted.nationality) {
        const knownNats = ['CHINESE', 'MALAY', 'INDIAN', 'EURASIAN', 'SINGAPOREAN', 'SINGAPORE', 'INDIA'];
        for (const nat of knownNats) {
            if (t.toUpperCase().includes(nat)) {
                extracted.nationality = nat === 'INDIA' ? 'INDIAN' : nat;
                break;
            }
        }
    }
    
    // 5. Gender / Sex
    const sexMatch = t.match(/(?:sex|gender)[:\s]*(MALE|FEMALE|M|F)/i);
    if (sexMatch) {
        const s = sexMatch[1].toUpperCase();
        extracted.gender = s.startsWith('M') ? 'Male' : 'Female';
    } else {
        if (t.toUpperCase().includes(' SEX ') || t.toUpperCase().includes(' SEX\n')) {
            const sexIndex = t.toUpperCase().indexOf(' SEX');
            const afterSex = t.substring(sexIndex).toUpperCase();
            if (afterSex.includes(' M ') || afterSex.includes('\nM ') || afterSex.includes(' M\n')) {
                extracted.gender = 'Male';
            } else if (afterSex.includes(' F ') || afterSex.includes('\nF ') || afterSex.includes(' F\n')) {
                extracted.gender = 'Female';
            }
        }
    }
    
    // 6. Address
    const postalMatch = t.match(/(?:singapore\s+)?(\d{6})/i);
    if (postalMatch) {
        const postalCode = postalMatch[1];
        let postalLineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(postalCode)) {
                postalLineIdx = i;
                break;
            }
        }
        if (postalLineIdx !== -1) {
            const part1 = postalLineIdx > 0 ? lines[postalLineIdx - 1] : '';
            const part2 = lines[postalLineIdx];
            extracted.residentialAddress = (part1 ? part1 + ', ' : '') + part2;
        }
    }
    
    extracted.email = '';
    extracted.mobile = '';
    
    return extracted;
}

function extractBizfileFields(text) {
    const extracted = {};
    const t = text;
    const uenMatch = t.match(/(?:uen|unique entity number)[:\s]*([0-9A-Z]{9,10})/i) || t.match(/([0-9]{8,9}[A-Z])/);
    if (uenMatch) {
        extracted.uen = uenMatch[1].toUpperCase();
    }
    const coNameMatch = t.match(/(?:entity name|company name|name of entity)[:\s]+([A-Z][^\n]{5,60})/i);
    if (coNameMatch) {
        extracted.companyName = coNameMatch[1].trim();
    }
    const addrMatch = t.match(/(?:registered office address|address)[:\s]+([\d#\-\w][^\n]{10,60})/i);
    if (addrMatch) {
        extracted.registeredAddress = addrMatch[1].trim();
    }
    return extracted;
}

async function performOcrOnFileInput(file, docType) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
            let extracted = {};
            if (docType !== 'address_proof') {
                try {
                    const base64Data = reader.result.split(',')[1];
                    const ocrRes = await fetch('/api/onboarding/ocr-extract', {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ 
                            type: docType, 
                            fileName: file.name,
                            fileData: base64Data,
                            mimeType: file.type
                        })
                    });
                    if (ocrRes.ok) {
                        extracted = await ocrRes.json();
                    }
                } catch(e) {
                    console.error('[Gemini OCR Fallback] Failed:', e);
                }
            }
            resolve({ extracted: extracted, fileData: reader.result });
        };
        reader.onerror = () => {
            resolve({ extracted: {}, fileData: '' });
        };
        reader.readAsDataURL(file);
    });
}

async function obUploadDoc(stepKey, docType, docLabel) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const docEl = document.getElementById(`doc-${stepKey}-${docType}`);
        if (docEl) docEl.innerHTML = `<div style='color:#3b82f6;font-size:12px;font-weight:700;'>⏳ Uploading & extracting...</div>`;

        const ocrResult = await performOcrOnFileInput(file, docType);
        const extracted = ocrResult.extracted;
        const base64DataUri = ocrResult.fileData;

        await ensureOnboardingRecord();
        const ob = state.onboarding || {};
        if (!state.onboardingId) {
            const createRes = await fetch(`/api/onboarding/client/${state.user.id}`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ clientEmail: state.user.email, clientName: state.user.name })
            });
            if (createRes.ok) { const d = await createRes.json(); state.onboardingId = d.id; }
        }

        if (state.onboardingId) {
            const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
            const currentDocs = (state.onboarding[stepField] && state.onboarding[stepField].documents) || [];
            const filteredDocs = currentDocs.filter(d => d.type !== docType);
            filteredDocs.push({
                id: "DOC-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                type: docType,
                label: docLabel,
                fileName: file.name,
                fileData: base64DataUri,
                mimeType: file.type,
                status: 'pending',
                extractedData: extracted,
                uploadedAt: Date.now(),
                ...extracted
            });

            const patchRes = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    documents: filteredDocs
                })
            });
            if (patchRes.ok) {
                const updatedOb = await patchRes.json();
                state.onboarding = normalizeOnboardingData(updatedOb);
                
                // Pre-fill extracted fields
                if (extracted) {
                    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
                    if (step) {
                        Object.entries(extracted).forEach(([k, v]) => {
                            if (v && k !== 'confidence' && k !== 'extractedAt') {
                                state.onboarding[step.field].data[k] = v;
                            }
                        });
                        
                        // Copy Step 1 details to Step 2 if shareholderType is Individual
                        if (stepKey === 'individual_verification') {
                            const currentType = state.onboarding[step.field].data.shareholderType || 'Individual Shareholder';
                            if (currentType === 'Individual Shareholder') {
                                const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
                                if (dirStep) {
                                    if (!state.onboarding[dirStep.field]) state.onboarding[dirStep.field] = { data: {}, status: 'pending', documents: [] };
                                    Object.entries(extracted).forEach(([k, v]) => {
                                        if (v && k !== 'confidence' && k !== 'extractedAt') {
                                            state.onboarding[dirStep.field].data[k] = v;
                                        }
                                    });
                                }
                            }
                        }
                    }
                }

                // Immediate save of pre-filled extracted fields to database
                if (state.onboardingId) {
                    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
                    if (step) {
                        await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                            method: 'PATCH',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({
                                data: state.onboarding[step.field].data,
                                status: 'pending'
                            })
                        });
                    }
                    if (stepKey === 'individual_verification') {
                        const currentType = state.onboarding[step.field].data.shareholderType || 'Individual Shareholder';
                        if (currentType === 'Individual Shareholder') {
                            const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
                            if (dirStep && state.onboarding[dirStep.field]) {
                                await fetch(`/api/onboarding/${state.onboardingId}/step/director_details`, {
                                    method: 'PATCH',
                                    headers: {'Content-Type':'application/json'},
                                    body: JSON.stringify({
                                        data: state.onboarding[dirStep.field].data,
                                        status: 'pending'
                                    })
                                });
                            }
                        }
                    }
                }
                
                // Re-fetch complete onboarding state to sync UI
                try {
                    const freshRes = await fetch(`/api/onboarding/client/${state.user.id}`);
                    if (freshRes.ok) state.onboarding = normalizeOnboardingData(await freshRes.json());
                } catch (e) {}

                const workspace = document.getElementById('ob-form-workspace');
                if (workspace) {
                    renderActiveStepForm(workspace);
                }
            }
        }
    };
    input.click();
}

async function ensureOnboardingRecord() {
    if (state.onboardingId) return;
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ clientEmail: state.user.email, clientName: state.user.name })
        });
        if (res.ok) { const d = await res.json(); state.onboardingId = d.id; }
    } catch(e) {}
}

async function obNextStep() {
    const ob = state.onboarding || {};
    const errors = validateStep(state.activeObStepKey, ob);
    if (errors.length > 0) {
        if (!state.showObErrors) state.showObErrors = {};
        state.showObErrors[state.activeObStepKey] = true;
        updateWizardUIFeedback();
        return;
    }
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.key === state.activeObStepKey);
    if (stepIndex !== -1 && stepIndex < ONBOARDING_STEPS.length - 1) {
        const nextStep = ONBOARDING_STEPS[stepIndex + 1];
        await selectObStep(nextStep.key);
    }
}

async function obPrevStep() {
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.key === state.activeObStepKey);
    if (stepIndex > 0) {
        const prevStep = ONBOARDING_STEPS[stepIndex - 1];
        await selectObStep(prevStep.key);
    }
}

async function obSubmitAllForVerification() {
    await ensureOnboardingRecord();
    const ob = state.onboarding || {};
    if (!state.onboardingId) return;

    // Flush active step inputs
    await forceSaveActiveStep();

    // Filter steps that are not approved/submitted/under_review
    const stepsToSubmit = ONBOARDING_STEPS.filter(step => {
        const status = getFriendlyStatus(step.key, state.onboarding);
        return status === 'completed' || status === 'rejected';
    });

    // Patch each of these steps
    for (const step of stepsToSubmit) {
        const stepField = step.field;
        const stepData = ob[stepField] || { data: {}, status: 'pending', documents: [] };
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${step.key}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    status: 'submitted'
                })
            });
            if (res.ok) {
                const updated = await res.json();
                state.onboarding = normalizeOnboardingData(updated);
            }
        } catch (e) {
            console.error(`Error submitting step ${step.key}:`, e);
        }
    }

    // Re-fetch final status
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}`);
        if (res.ok) state.onboarding = normalizeOnboardingData(await res.json());
    } catch (e) {}

    alert("Onboarding submitted successfully for verification!");
    
    // Re-render onboarding view
    const view = document.getElementById('main-view');
    if (view && state.currentTab === 'onboarding') {
        renderOnboarding(view);
    }
}

function renderHome(container) {
    const activeService = state.services[0];
    const staffName = activeService ? (activeService.staff || 'Unassigned') : 'Unassigned';
    const staffInitial = staffName.charAt(0).toUpperCase();

    const kyc = state.kyc;
    let complianceHtml = '';
    if (!kyc) {
        complianceHtml = `
            <div class="premium-card bg-white border-none shadow-sm flex flex-col items-center justify-center p-8 text-center h-full">
                <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center mb-4 border border-slate-100"><i data-lucide="shield-alert" class="w-6 h-6"></i></div>
                <h3 class="text-base font-bold text-slate-900 mb-1">Compliance Screening Required</h3>
                <p class="text-slate-400 text-xs mb-5">Please verify your identity to enable all platform features.</p>
                <button onclick="openPortalShuftiModal()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">Verify via Shufti Pro</button>
            </div>
        `;
    } else {
        const kStatus = kyc.status || 'pending';
        const kRisk = kyc.risk || 'Low';
        let statusBadge = '';
        let statusColor = '';
        let statusBg = '';

        if (kStatus === 'approved') {
            statusBadge = 'KYC APPROVED'; statusColor = 'text-emerald-600'; statusBg = 'bg-emerald-50 border-emerald-100';
        } else if (kStatus === 'flagged') {
            statusBadge = 'AML ALERT (FLAGGED)'; statusColor = 'text-red-600'; statusBg = 'bg-red-50 border-red-100';
        } else if (kStatus === 'under review') {
            statusBadge = 'UNDER MANUAL REVIEW'; statusColor = 'text-amber-600'; statusBg = 'bg-amber-50 border-amber-100';
        } else {
            statusBadge = 'KYC PENDING'; statusColor = 'text-slate-600'; statusBg = 'bg-slate-50 border-slate-100';
        }

        const idStat = kyc.identityStatus || 'pending';
        const amlStat = kyc.amlStatus || 'pending';
        const pepStat = kyc.pepStatus || 'pending';
        const sancStat = kyc.sanctionsStatus || 'pending';

        complianceHtml = `
            <div class="premium-card bg-white border-none shadow-sm p-6 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="shield" class="w-5 h-5 text-blue-600"></i>
                        <span class="font-bold text-slate-900 text-sm">AML & Compliance Status</span>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg border text-[9px] font-bold tracking-wider ${statusBg} ${statusColor}">${statusBadge}</span>
                </div>
                
                <div class="space-y-3.5 my-3">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="file-digit" class="w-3.5 h-3.5"></i> ID Verification</span>
                        <span class="font-bold ${idStat==='verified'?'text-emerald-500':'text-red-500'}">${idStat==='verified'?'🟢 Verified':(idStat==='failed'?'🔴 Failed':'⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="search" class="w-3.5 h-3.5"></i> AML Screening</span>
                        <span class="font-bold ${amlStat==='clean'?'text-emerald-500':'text-red-500'}">${amlStat==='clean'?'🟢 Clean':(amlStat==='flagged'?'🔴 Flagged':'⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i> PEP Watchlist Search</span>
                        <span class="font-bold ${pepStat==='clean'?'text-emerald-500':'text-red-500'}">${pepStat==='clean'?'🟢 Clean':(pepStat==='match'?'🔴 Match Found':'⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="globe" class="w-3.5 h-3.5"></i> Sanctions Screening</span>
                        <span class="font-bold ${sancStat==='clean'?'text-emerald-500':'text-red-500'}">${sancStat==='clean'?'🟢 Clean':(sancStat==='match'?'🔴 Match Found':'⚪ Pending')}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk: <span class="${kRisk==='High'?'text-red-500':(kRisk==='Medium'?'text-amber-500':'text-emerald-500')}">${kRisk}</span></span>
                    ${kStatus !== 'approved' ? `
                        <button onclick="openPortalShuftiModal()" class="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all">Verify Now</button>
                    ` : `
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">Status: Active</span>
                    `}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="space-y-8">
            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Hero Section: LionPath Trading Banner -->
                <div class="flex-1">
                    <div class="bg-[#0076CE] rounded-[24px] p-8 text-white relative overflow-hidden h-full flex flex-col justify-between">
                        <div class="relative z-10">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h2 class="text-3xl font-bold mb-3">LionPath Trading Pte. Ltd.</h2>
                                    <div class="flex items-center gap-3">
                                        <span class="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase">In Progress</span>
                                        <span class="text-[11px] font-medium opacity-90 flex items-center gap-2"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Est. Completion: 3-5 Business Days</span>
                                    </div>
                                </div>
                                <button onclick="switchTab('services')" class="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                                    Track Progress <i data-lucide="arrow-right" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <div class="mt-12 relative z-10">
                            <div class="flex justify-between items-end mb-3">
                                <span class="text-xs font-bold opacity-80 uppercase tracking-widest">Application Progress</span>
                                <span class="text-sm font-bold">65%</span>
                            </div>
                            <div class="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div class="h-full bg-white rounded-full" style="width: 65%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Staff Sidebar Card -->
                <div class="w-full lg:w-80">
                    <div class="premium-card bg-white border-none shadow-sm h-full flex flex-col items-center justify-center p-8">
                        <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-[#0076CE] text-2xl font-bold mb-4">${staffInitial}</div>
                        <h3 class="text-slate-900 font-bold text-lg">${staffName}</h3>
                        <p class="text-slate-400 text-sm mb-6">Globalisor Staff</p>
                        <button onclick="switchTab('messages')" class="w-full border border-blue-600 text-blue-600 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
                            <i data-lucide="message-square" class="w-4 h-4"></i> Message ${staffName.split(' ')[0]}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Quick Action Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Card 2 -->
                <div class="premium-card bg-white border-none shadow-sm group hover:scale-[1.02] cursor-pointer" onclick="switchTab('services')">
                    <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6"><i data-lucide="map-pin" class="w-6 h-6"></i></div>
                    <h4 class="font-bold text-slate-900 mb-4">Track Application</h4>
                    <span class="text-xs font-bold text-purple-600 flex items-center gap-2">Open <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></span>
                </div>
                <!-- Card 3 -->
                <div class="premium-card bg-white border-none shadow-sm group hover:scale-[1.02] cursor-pointer" onclick="switchTab('documents')">
                    <div class="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6"><i data-lucide="upload" class="w-6 h-6"></i></div>
                    <h4 class="font-bold text-slate-900 mb-4">Upload Documents</h4>
                    <span class="text-xs font-bold text-orange-600 flex items-center gap-2">Open <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></span>
                </div>
                <!-- Card 4 -->
                <div class="premium-card bg-white border-none shadow-sm group hover:scale-[1.02] cursor-pointer" onclick="switchTab('messages')">
                    <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6"><i data-lucide="shield" class="w-6 h-6"></i></div>
                    <h4 class="font-bold text-slate-900 mb-4">Messages</h4>
                    <span class="text-xs font-bold text-emerald-600 flex items-center gap-2">Open <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Compliance Status Widget -->
                ${complianceHtml}

                <!-- Recent Notifications -->
                <div class="premium-card bg-white border-none shadow-sm p-0 overflow-hidden">
                    <div class="p-6 border-b border-slate-50 flex items-center gap-3">
                        <i data-lucide="bell" class="w-5 h-5 text-blue-600"></i>
                        <h3 class="font-bold text-slate-900">Recent Notifications</h3>
                    </div>
                    <div class="p-6">
                        <div class="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                            <div class="flex items-center gap-2 mb-2">
                                <h4 class="font-bold text-slate-900 text-sm">KYC Approved</h4>
                                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-500"></i>
                            </div>
                            <p class="text-xs text-slate-500 leading-relaxed mb-3">Your KYC for LionPath Trading has been approved!</p>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2026-01-20 14:00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBilling(container) {
    container.innerHTML = `
        <div class="space-y-10">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Billing Stats -->
                <div class="premium-card bg-blue-600 text-white border-none p-8 flex flex-col justify-between">
                    <div>
                        <p class="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-2">Next Renewal</p>
                        <h2 class="text-3xl font-extrabold mb-1">SGD 3,000.00</h2>
                        <p class="text-xs text-blue-200">Due in 15 days</p>
                    </div>
                    <button class="mt-8 w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all">Pay Now</button>
                </div>
                <div class="premium-card p-8">
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Year to Date Spent</p>
                    <h2 class="text-3xl font-extrabold text-slate-900">SGD 4,315.00</h2>
                    <div class="flex items-center gap-2 mt-2 text-emerald-600 text-xs font-bold">
                        <i data-lucide="trending-up" class="w-3 h-3"></i> 12% vs last year
                    </div>
                </div>
                <div class="premium-card p-8">
                    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Saved Payment Methods</p>
                    <div class="flex items-center gap-4 mt-2">
                        <div class="w-10 h-7 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center font-bold text-[10px]">VISA</div>
                        <div class="text-sm font-bold text-slate-800">•••• 9012</div>
                    </div>
                    <button class="text-xs font-bold text-blue-600 uppercase tracking-widest mt-6 hover:underline">Manage Methods</button>
                </div>
            </div>

            <!-- Invoices Table -->
            <div class="premium-card p-0 overflow-hidden">
                <div class="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 class="text-xl font-extrabold text-slate-900">Recent Transactions</h3>
                    <button class="text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">Export History</button>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50">
                        <tr>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice ID</th>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${state.invoices.map(inv => `
                            <tr class="hover:bg-slate-50/30 transition-colors">
                                <td class="px-8 py-6 font-bold text-slate-900">${inv.id}</td>
                                <td class="px-8 py-6 text-sm text-slate-500">${inv.service}</td>
                                <td class="px-8 py-6 text-sm text-slate-500">${inv.date}</td>
                                <td class="px-8 py-6 font-bold text-slate-900">${inv.amount}</td>
                                <td class="px-8 py-6 text-center">
                                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}">${inv.status}</span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <button class="p-2 text-slate-400 hover:text-blue-600 transition-colors"><i data-lucide="download"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- AI Assistant Logic ---

function toggleAIAssistant() {
    const windowEl = document.getElementById('ai-assistant-window');
    state.isAIActive = !state.isAIActive;
    
    if (state.isAIActive) {
        windowEl.classList.remove('hidden');
        setTimeout(() => {
            windowEl.classList.remove('translate-y-10', 'opacity-0');
        }, 10);
    } else {
        windowEl.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            windowEl.classList.add('hidden');
        }, 500);
    }
}

async function handleAISend() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    appendAIMessage('user', msg);
    input.value = '';

    // Simulated AI Response
    const chatBody = document.getElementById('ai-chat-body');
    const typing = document.createElement('div');
    typing.className = 'flex gap-3 animate-pulse';
    typing.innerHTML = '<div class="bg-white/60 p-4 rounded-2xl rounded-tl-none text-xs text-slate-400">AI is thinking...</div>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(() => {
        chatBody.removeChild(typing);
        const response = generateAIResponse(msg);
        appendAIMessage('bot', response);
    }, 1500);
}

function appendAIMessage(sender, text) {
    const chatBody = document.getElementById('ai-chat-body');
    const div = document.createElement('div');
    div.className = `flex gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}`;
    div.innerHTML = `
        <div class="${sender === 'user' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white/60 text-slate-700 border border-white/60'} p-4 rounded-2xl ${sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} text-sm shadow-sm" style="white-space: pre-line;">
            ${text}
        </div>
    `;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function generateAIResponse(msg) {
    const m = msg.toLowerCase();
    
    if (m.includes('incorporat') || m.includes('setup') || m.includes('register') || m.includes('start company')) {
        return `To incorporate your company in Singapore, the primary requirements are:
        
1. **Approved Company Name**
2. **Globalisor Address** (Registered Address)
3. **At least 1 Resident Director** (Singapore citizen/PR)
4. **At least 1 Shareholder**
5. **Qualified Company Secretary**

You can complete all of this inside the **Onboarding Journey** tab! Would you like me to guide you to Step 1?`;
    }
    
    if (m.includes('chat') || m.includes('agent') || m.includes('human') || m.includes('support') || m.includes('talk') || m.includes('yes')) {
        return `I have notified a support specialist. You can also chat directly with our incorporation experts in the Messages page, or submit a ticket in the Support Desk. 

A team member will join you shortly!`;
    }
    
    if (m.includes('compliance') || m.includes('annual return') || m.includes('acra')) {
        return `Singapore companies have three main annual compliance milestones:
        
- **Annual General Meeting (AGM)**: Must be held within 6 months of your financial year-end.
- **Annual Returns Filing**: Must be filed with ACRA within 7 months of your financial year-end.
- **Corporate Tax Filing**: Form C-S/C must be submitted to IRAS by November 30.

Globalisor handles all of these filings automatically in your active Workflows!`;
    }

    if (m.includes('director') || m.includes('nominee')) {
        return `Under ACRA regulations, every Singapore company must have at least one director who is ordinarily resident in Singapore. 

If you do not have a local resident director, Globalisor provides a Nominee Resident Director service. You can specify director requirements in Step 2 of the Onboarding Journey.`;
    }

    if (m.includes('share') || m.includes('capital') || m.includes('percent')) {
        return `Singapore companies can be incorporated with a minimum paid-up capital of SGD 1.00. 

You can allocate share percentages for individual or corporate shareholders in Step 3 and Step 4 of Onboarding. The "Number of Shares" and "Share Capital Amount" fields are read-only and will auto-calculate instantly based on the percentages you enter.`;
    }
    
    if (m.includes('address') || m.includes('registered address')) {
        return `Your company must have a physical registered address in Singapore. We provide a premium registered address at **Globalisor Address** which is selected by default in your incorporation package. 

You can review or change this in the Onboarding Journey.`;
    }

    if (m.includes('document') || m.includes('upload')) {
        return "You can manage all your documents in the **Compliance Vault** tab. Currently, we're waiting for your **Proof of Address**. Would you like me to open that section for you?";
    }
    
    if (m.includes('invoice') || m.includes('bill')) {
        return "Your recent invoice **INV-2026-042** for SGD 3,000.00 is pending. You can pay it directly in the **Payments** module.";
    }
    
    if (m.includes('hi') || m.includes('hello')) {
        return "Hello! I'm your Globalisor operational assistant. I can help you track workflows, manage compliance, or answer questions about your Singapore entity. What's on your mind?";
    }
    
    return "That's a great question about Singapore business operations. I'll need a moment to verify the latest ACRA guidelines, or I can connect you with a human expert in the Support Desk.";
}

// --- Legacy Function Wrappers (Kept for compatibility) ---

function logout() {
    localStorage.removeItem('client_auth');
    localStorage.removeItem('token');
    localStorage.removeItem('globalisor_master_v3');
    window.location.href = '/login.html';
}

// Placeholder renderers for missing tabs (standardized)
function renderUpdates(container) {
    if (state.blogs.length === 0) {
        renderPlaceholder(container, 'Blogs', 'zap');
        return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-end">
                <div class="max-w-xl">
                    <h2 class="text-3xl font-extrabold text-slate-900">Blogs Feed</h2>
                    <p class="text-slate-500 mt-2">Critical updates on Singapore regulatory changes, tax deadlines, and global business trends.</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${state.blogs.map(blog => {
                    const displayTitle = blog.publishedTitle || blog.title;
                    const displayExcerpt = blog.publishedExcerpt || blog.description || blog.excerpt || '';
                    const displayCoverImage = blog.publishedCoverImage || blog.coverImage || '';
                    return `
                        <div class="premium-card p-0 overflow-hidden group cursor-pointer" onclick="openBlogDetail('${blog.id}')">
                            ${displayCoverImage ? `
                            <div class="h-48 bg-slate-100 relative overflow-hidden">
                                <img src="${displayCoverImage}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                                <div class="absolute top-4 left-4"><span class="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-bold text-blue-600 uppercase tracking-widest">${blog.category || 'Compliance'}</span></div>
                            </div>
                            ` : ''}
                            <div class="p-8">
                                <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    ${!displayCoverImage ? `<span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">${blog.category || 'Compliance'}</span>` : ''}
                                    <span>${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                                </div>
                                <h3 class="text-xl font-extrabold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">${displayTitle}</h3>
                                <p class="text-sm text-slate-500 line-clamp-3 mb-8 leading-relaxed">${displayExcerpt}</p>
                                <div class="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                                    View Assessment <i data-lucide="arrow-right" class="w-4 h-4"></i>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderServices(container) {
    container.innerHTML = `
        <div class="space-y-10">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div class="max-w-xl">
                    <p class="text-slate-500">Track the real-time progress of your ongoing corporate operations and applications.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-8">
                ${state.services.length === 0 ? '<div class="premium-card p-20 text-center text-slate-400">No active workflows initiated.</div>' : state.services.map(s => `
                    <div class="premium-card">
                        <div class="flex flex-col lg:flex-row gap-12">
                            <div class="lg:w-1/3 space-y-8">
                                <div class="flex items-center gap-5">
                                    <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="activity" class="w-8 h-8"></i></div>
                                    <div>
                                        <h3 class="text-2xl font-extrabold text-slate-900">${s.type}</h3>
                                        <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">${s.company}</p>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow ID</p>
                                        <p class="text-sm font-extrabold text-slate-900">#${window.appSeqMap?.[s.id] || s.id}</p>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Initiated</p>
                                        <p class="text-sm font-extrabold text-slate-900">${s.date}</p>
                                    </div>
                                </div>
                                <button class="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all">Audit Trail</button>
                            </div>
                            
                            <div class="flex-1">
                                <div class="flex justify-between items-center mb-10">
                                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Live Timeline</h4>
                                    <span class="status-badge ${s.status === 'Active' ? 'status-active' : 'status-progress'}">${s.status}</span>
                                </div>
                                <div class="relative space-y-12">
                                    <!-- Journey Line -->
                                    <div class="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                    
                                    <div class="flex gap-6 relative z-10">
                                        <div class="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0"><i data-lucide="check" class="w-6 h-6"></i></div>
                                        <div>
                                            <h5 class="font-bold text-slate-900">Request Received</h5>
                                            <p class="text-sm text-slate-500 mt-1">Application lodged and initial data capture complete.</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-6 relative z-10">
                                        <div class="w-12 h-12 rounded-full ${s.progress >= 65 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'} flex items-center justify-center shrink-0">
                                            <i data-lucide="${s.progress >= 65 ? 'check' : 'loader'}" class="w-6 h-6 ${s.progress < 65 ? 'animate-spin' : ''}"></i>
                                        </div>
                                        <div>
                                            <h5 class="font-bold text-slate-900">Governance Review</h5>
                                            <p class="text-sm text-slate-500 mt-1">Globalisor compliance team performing due diligence.</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-6 relative z-10">
                                        <div class="w-12 h-12 rounded-full ${s.progress >= 100 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-300'} flex items-center justify-center shrink-0"><i data-lucide="flag" class="w-6 h-6"></i></div>
                                        <div>
                                            <h5 class="font-bold ${s.progress >= 100 ? 'text-slate-900' : 'text-slate-400'}">Final Execution</h5>
                                            <p class="text-sm text-slate-400 mt-1">Official registration with ACRA and certificate issuance.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderDocuments(container) {
    container.innerHTML = `
        <div class="space-y-10">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div class="max-w-xl">
                    <p class="text-slate-500">Centralized management of your corporate ID, residential proof, and entity documents.</p>
                </div>
                <div class="flex gap-4">
                    <button class="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Archive</button>
                    <button onclick="triggerUpload()" class="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> New Upload</button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Quick Stats -->
                <div class="lg:col-span-1 space-y-6">
                    <div class="premium-card bg-slate-900 text-white border-none p-8">
                        <h4 class="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6">Security Assessment</h4>
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin flex items-center justify-center">
                                <span class="text-sm font-bold">85%</span>
                            </div>
                            <div>
                                <p class="text-sm font-bold">Health Score</p>
                                <p class="text-[10px] text-slate-400">Excellent Compliance</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="premium-card p-8">
                        <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Action Required</h4>
                        <div class="space-y-4">
                            <div class="flex items-center gap-3 p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                                <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
                                <span class="text-xs font-bold uppercase tracking-tight">Expiring in 30d</span>
                            </div>
                            <p class="text-xs text-slate-500 leading-relaxed">Your **Proof of Address** needs re-verification to maintain KYC status.</p>
                            <button class="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Update Now</button>
                        </div>
                    </div>
                </div>

                <!-- Document Explorer -->
                <div class="lg:col-span-3">
                    <div class="premium-card p-0 overflow-hidden border-slate-100">
                        <div class="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-4">
                            <div class="flex-1 relative">
                                <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <input type="text" placeholder="Search vault..." class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/10">
                            </div>
                        </div>
                        <table class="w-full text-left">
                            <thead>
                                <tr class="bg-white">
                                    <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descriptor</th>
                                    <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                                    <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry</th>
                                    <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th class="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${state.documents.map(d => `
                                    <tr class="hover:bg-slate-50/50 transition-all group">
                                        <td class="px-8 py-6">
                                            <div class="flex items-center gap-4">
                                                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100"><i data-lucide="file-text" class="w-5 h-5"></i></div>
                                                <span class="font-extrabold text-slate-900 text-sm">${d.name}</span>
                                            </div>
                                        </td>
                                        <td class="px-8 py-6"><span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${d.category}</span></td>
                                        <td class="px-8 py-6"><span class="text-xs font-bold ${d.expiry !== 'N/A' ? 'text-slate-900' : 'text-slate-300'}">${d.expiry}</span></td>
                                        <td class="px-8 py-6 text-center">
                                            <span class="status-badge ${d.status === 'Approved' ? 'status-active' : 'status-progress'}">${d.status}</span>
                                        </td>
                                        <td class="px-8 py-6 text-right">
                                            <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button class="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-slate-400"><i data-lucide="eye" class="w-4 h-4"></i></button>
                                                <button class="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-slate-400"><i data-lucide="download" class="w-4 h-4"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderRequests(container) {
    container.innerHTML = `
        <div class="space-y-12">
            <div class="text-center max-w-2xl mx-auto space-y-4">
                <span class="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-[0.2em] border border-blue-100">Operational Expansion</span>
                <p class="text-slate-500 leading-relaxed">Enhance your global footprint with our managed corporate services, optimized for rapid growth and compliance.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                ${state.catalog.map(s => `
                    <div class="premium-card p-10 group hover:border-blue-500/20 transition-all cursor-pointer relative overflow-hidden">
                        <div class="flex gap-8 relative z-10">
                            <div class="w-20 h-20 rounded-[2rem] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-700 shadow-sm shadow-blue-100"><i data-lucide="${s.icon}" class="w-10 h-10"></i></div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">${s.cat}</p>
                                        <h3 class="text-2xl font-extrabold text-slate-900">${s.title}</h3>
                                    </div>
                                    <span class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-extrabold shadow-lg shadow-slate-200">${s.price}</span>
                                </div>
                                <p class="text-slate-500 text-sm leading-relaxed mb-10 mt-4">${s.desc}</p>
                                <div class="flex items-center justify-between">
                                    <button class="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3 group-hover:gap-5 transition-all">Configure Service <i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                        </div>
                        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}


function renderProfile(container) {
    container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-10">
            <div class="premium-card p-12">
                <div class="flex flex-col md:flex-row items-center gap-10 mb-12 pb-12 border-b border-slate-50">
                    <div class="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl shadow-blue-500/30">AS</div>
                    <div class="text-center md:text-left flex-1">
                        <div class="flex flex-col md:flex-row items-center gap-4 mb-4">
                            <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">${state.user.name}</h2>
                            <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">Enterprise Director</span>
                        </div>
                        <p class="text-slate-500 text-lg">Portfolio Identity: <span class="font-bold text-slate-900">${state.user.id}</span> • Globalisor Partner since 2024</p>
                        <div class="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                            <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100"><i data-lucide="check-circle" class="w-4 h-4"></i> KYC Verified</div>
                            <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100"><i data-lucide="zap" class="w-4 h-4"></i> Priority Support</div>
                            <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200"><i data-lucide="globe" class="w-4 h-4"></i> Global Hub</div>
                        </div>
                    </div>
                    <button class="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Edit Global Profile</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div class="space-y-8">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">Platform Credentials <span class="flex-1 h-px bg-slate-50"></span></h4>
                        <div class="grid grid-cols-1 gap-6">
                            <div class="group"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Executive Email</p><p class="text-lg font-bold text-slate-900">director@asifhq.com</p></div>
                            <div class="group"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Operational Contact</p><p class="text-lg font-bold text-slate-900">+65 8821 9900</p></div>
                            <div class="group"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Country of Residence</p><p class="text-lg font-bold text-slate-900">Singapore</p></div>
                        </div>
                    </div>
                    <div class="space-y-8">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">Security & Governance <span class="flex-1 h-px bg-slate-50"></span></h4>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-6 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-all"><i data-lucide="shield-check"></i></div>
                                    <div>
                                        <p class="font-bold text-slate-900">Security Parameters</p>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">2FA / Biometrics</p>
                                    </div>
                                </div>
                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"></i>
                            </div>
                            <div class="flex items-center justify-between p-6 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-all"><i data-lucide="key"></i></div>
                                    <div>
                                        <p class="font-bold text-slate-900">API Gateway</p>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise Access</p>
                                    </div>
                                </div>
                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function openBlogDetail(id) {
    const blog = state.blogs.find(b => b.id === id);
    if (!blog) return;

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');

    const displayTitle = blog.publishedTitle || blog.title;
    const displayExcerpt = blog.publishedExcerpt || blog.description || blog.excerpt || '';
    const displayCoverImage = blog.publishedCoverImage || blog.coverImage || '';
    const displayContent = blog.publishedContent || blog.content || displayExcerpt;

    content.innerHTML = `
        <div class="max-h-[90vh] overflow-y-auto custom-scroll">
            ${displayCoverImage ? `
            <div class="relative h-96">
                <img src="${displayCoverImage}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
                <button onclick="closeModal()" class="absolute top-8 right-8 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all border border-white/30"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            ` : `
            <div class="p-6 flex justify-end">
                <button onclick="closeModal()" class="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-800 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            `}
            <div class="${displayCoverImage ? 'p-12 -mt-32 relative z-10' : 'p-12 pt-4'}">
                <div class="premium-card border-none shadow-2xl p-12">
                    <div class="flex flex-wrap gap-3 mb-8">
                        <span class="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">${blog.category || 'Blogs'}</span>
                        <span class="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-100">${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', {day: '2-digit', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <h2 class="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">${displayTitle}</h2>
                    <div class="prose prose-slate max-w-none text-slate-600 leading-[1.8] text-lg space-y-6">
                        <p class="font-bold text-slate-900 text-xl leading-relaxed">${displayExcerpt}</p>
                        <div class="h-px bg-slate-100 my-10"></div>
                        <div class="whitespace-pre-wrap">${displayContent}</div>
                    </div>
                    ${blog.documentUrl ? `
                        <div class="mt-12 p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div class="flex items-center gap-6">
                                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl shadow-blue-500/5"><i data-lucide="file-text" class="w-8 h-8"></i></div>
                                <div>
                                    <h4 class="font-extrabold text-slate-900">Regulatory Framework</h4>
                                    <p class="text-sm text-slate-500">Official Government Assessment (PDF)</p>
                                </div>
                            </div>
                            <a href="${blog.documentUrl}" target="_blank" class="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all flex items-center gap-3">Download Assessment <i data-lucide="download" class="w-4 h-4"></i></a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.querySelector('#modal-content').classList.remove('scale-95');
    if (window.lucide) window.lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('pointer-events-none', 'opacity-0');
    modal.querySelector('#modal-content').classList.add('scale-95');
}

function renderPlaceholder(c, title, icon) {
    c.innerHTML = `
        <div class="premium-card p-32 text-center flex flex-col items-center">
            <div class="w-24 h-24 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-8"><i data-lucide="${icon}" class="w-12 h-12"></i></div>
            <h3 class="text-2xl font-extrabold text-slate-900">${title}</h3>
            <p class="text-slate-500 max-w-sm mt-3 leading-relaxed">This enterprise module is currently syncing with the Globalisor headquarters. Advanced operations will be available shortly.</p>
            <button onclick="switchTab('home')" class="mt-10 text-xs font-bold text-blue-600 uppercase tracking-[0.2em] hover:underline">Back to Executive Hub</button>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function triggerUpload() {
    // Hidden file input logic
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            appendAIMessage('bot', `System detected upload: **${file.name}**. I'm initiating the security scan and sending it to our compliance team for review.`);
        }
    };
    input.click();
}

// --- Static Content / Guidance System ---
function renderGuidance(container) {
    const categories = [...new Set(state.staticContent.map(c => c.category))];
    const publishedContent = state.staticContent.filter(c => c.isPublished);

    container.innerHTML = `
        <div class="space-y-12">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div class="max-w-xl">
                    <p class="text-slate-500">Official standard operating procedures and technical documentation for your portfolio.</p>
                </div>
                <div class="relative w-full md:w-64">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" id="guidance-search" placeholder="Search guidance..." class="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Category Sidebar -->
                <div class="lg:col-span-1 space-y-2">
                    <button class="w-full text-left px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-between" onclick="filterGuidance('all')">
                        All Resources <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                    ${categories.map(cat => `
                        <button class="w-full text-left px-6 py-4 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-between" onclick="filterGuidance('${cat}')">
                            ${cat} <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
                        </button>
                    `).join('')}
                </div>

                <!-- Content Grid -->
                <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6" id="guidance-list">
                    ${publishedContent.map(item => `
                        <div class="premium-card group cursor-pointer hover:border-blue-200" onclick="openGuidanceDetail('${item.id}')">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest">${item.category}</span>
                                ${item.isPinned ? '<i data-lucide="pin" class="w-3 h-3 text-amber-500"></i>' : ''}
                            </div>
                            <h3 class="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">${item.title}</h3>
                            <p class="text-sm text-slate-500 leading-relaxed line-clamp-2">${item.description}</p>
                            <div class="mt-8 flex items-center justify-between">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated: ${new Date(item.updatedAt).toLocaleDateString()}</span>
                                <i data-lucide="arrow-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-2 transition-all"></i>
                            </div>
                        </div>
                    `).join('')}
                    ${publishedContent.length === 0 ? '<div class="col-span-full p-20 text-center text-slate-400 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">No resources available in this section.</div>' : ''}
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

window.openGuidanceDetail = function(id) {
    const item = state.staticContent.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="flex justify-between items-start mb-10">
            <div>
                <span class="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block">${item.category}</span>
                <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">${item.title}</h2>
            </div>
            <button onclick="closeModal()" class="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="prose prose-slate max-w-none">
            <p class="text-lg text-slate-500 mb-10 font-medium leading-relaxed">${item.description}</p>
            <div class="h-px bg-slate-100 mb-10"></div>
            <div class="text-slate-700 leading-relaxed space-y-6 text-lg">
                ${item.content.split('\n').map(p => `<p>${p}</p>`).join('')}
            </div>
        </div>
        <div class="mt-12 pt-10 border-t border-slate-100 flex justify-between items-center">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Globalisor Knowledge Base • Official Guideline</div>
            <button onclick="closeModal()" class="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all">Understood</button>
        </div>
    `;
    
    modal.classList.remove('pointer-events-none', 'opacity-0');
    content.classList.remove('scale-95');
    if (window.lucide) window.lucide.createIcons();
}

window.filterGuidance = function(category) {
    const list = document.getElementById('guidance-list');
    const items = state.staticContent.filter(c => c.isPublished && (category === 'all' || c.category === category));
    
    list.innerHTML = items.map(item => `
        <div class="premium-card group cursor-pointer hover:border-blue-200" onclick="openGuidanceDetail('${item.id}')">
            <div class="flex items-center gap-2 mb-4">
                <span class="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest">${item.category}</span>
                ${item.isPinned ? '<i data-lucide="pin" class="w-3 h-3 text-amber-500"></i>' : ''}
            </div>
            <h3 class="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">${item.title}</h3>
            <p class="text-sm text-slate-500 leading-relaxed line-clamp-2">${item.description}</p>
            <div class="mt-8 flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated: ${new Date(item.updatedAt).toLocaleDateString()}</span>
                <i data-lucide="arrow-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-2 transition-all"></i>
            </div>
        </div>
    `).join('') || '<div class="col-span-full p-20 text-center text-slate-400 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">No resources available in this section.</div>';
    
    if (window.lucide) window.lucide.createIcons();
}

let socket = null;
let typingTimeout = null;

function connectWebSocket() {
    if (!state.user || socket) return;
    let wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = window.location.host;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]') {
        wsHost = 'globalisor-77d7da9fe8c7.herokuapp.com';
        wsProtocol = 'wss:';
    }
    socket = new WebSocket(`${wsProtocol}//${wsHost}/api/ws/chat?userId=${state.user.id}&role=client`);

    socket.onmessage = async function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'presence') {
                updateSupportPresence();
            } else if (data.type === 'message') {
                if (data.message.clientId === state.user.id || (data.message.clientId.startsWith('chat_') && data.message.clientId.includes(state.user.id))) {
                    if (state.currentTab === 'messages') {
                        fetchMessages();
                        markAsRead();
                    }
                }
            } else if (data.type === 'notification') {
                const notif = data.notification;
                const isMessageFromMe = notif.type === 'message' && notif.message.startsWith(state.user.name + ':');
                if (!isMessageFromMe && (notif.clientId === 'all' || notif.clientId === 'client' || notif.clientId === state.user.id || 
                    (notif.clientId.startsWith('team_group_')) ||
                    (notif.clientId.startsWith('chat_') && notif.clientId.includes(state.user.id)) ||
                    (notif.clientId.startsWith('team_chat_') && notif.clientId.includes(state.user.id)))) {
                    const exists = state.notifications.some(n => n.id === notif.id);
                    if (!exists) {
                        state.notifications.unshift(notif);
                        if (typeof updateNotificationUI === 'function') updateNotificationUI();
                        if (typeof showToastNotification === 'function') showToastNotification(notif);
                    }
                }
            } else if (data.type === 'typing') {
                if (data.clientId === state.user.id && state.currentTab === 'messages') {
                    const statusEl = document.getElementById('chat-header-status');
                    if (statusEl) {
                        if (data.isTyping) {
                            statusEl.innerText = `${data.senderRole === 'admin' ? 'Admin' : 'Staff'} is typing...`;
                            statusEl.className = 'text-[10px] font-bold text-emerald-500 uppercase tracking-widest';
                        } else {
                            updateSupportPresence();
                        }
                    }
                }
            } else if (data.type === 'read_receipt') {
                if (data.clientId === state.user.id && state.currentTab === 'messages') {
                    fetchMessages();
                }
            } else if (data.type === 'compliance_sync') {
                if (data.clientId === state.user.id) {
                    await fetchData();
                    if (state.currentTab === 'home') {
                        const view = document.getElementById('main-view');
                        renderHome(view);
                    }
                }
            }
        } catch (e) { console.error('WS parsing error:', e); }
    };

    socket.onclose = function() {
        socket = null;
        setTimeout(connectWebSocket, 5000);
    };
}

async function updateSupportPresence() {
    try {
        const res = await fetch('/api/messages/presence?role=support');
        const data = await res.json();
        const statusEl = document.getElementById('chat-header-status');
        const dotEl = document.getElementById('chat-header-online-indicator');
        if (!statusEl || !dotEl) return;

        if (data.isOnline) {
            statusEl.innerText = 'Active Now';
            statusEl.className = 'text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1';
            dotEl.classList.remove('hidden');
        } else {
            statusEl.innerText = formatLastSeen(data.lastSeen);
            statusEl.className = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';
            dotEl.classList.add('hidden');
        }
    } catch (e) { console.error('Failed to update support presence:', e); }
}

function formatLastSeen(timestamp) {
    if (!timestamp) return 'Offline';
    const now = new Date();
    const date = new Date(timestamp);
    const isToday = now.toDateString() === date.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Last seen: Today, ${timeStr}`;
    if (isYesterday) return `Last seen: Yesterday, ${timeStr}`;
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `Last seen: ${dateStr}, ${timeStr}`;
}

async function markAsRead() {
    try {
        await fetch(`/api/messages/read-all?clientId=${state.user.id}&senderRole=client`, { method: 'POST' });
    } catch (e) { console.error(e); }
}

function renderMessages(container) {
    container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="premium-card bg-white border-none shadow-xl h-[600px] flex flex-col p-0 overflow-hidden">
                <!-- Chat Header -->
                <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold relative shadow-inner">
                            GS
                            <div id="chat-header-online-indicator" class="hidden absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-900">Globalisor Operations Desk</h3>
                            <div id="chat-header-status" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offline</div>
                        </div>
                    </div>
                </div>

                <!-- Chat Messages Area -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
                    <div class="text-center py-10">
                        <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i>
                        </div>
                        <p class="text-slate-400 text-sm">Connecting to support...</p>
                    </div>
                </div>

                <!-- Chat Input -->
                <div class="p-6 border-t border-slate-100 bg-white">
                    <form id="chat-form" class="flex gap-4">
                        <input type="text" id="chat-input" placeholder="Type your message..." 
                            class="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner">
                        <button type="submit" class="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2">
                            <span>Send</span> <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    
    // Connect WS if not connected
    connectWebSocket();
    
    // Mark as read
    markAsRead();
    
    // Update status
    updateSupportPresence();
    
    // Start polling fallback
    startMessagePolling();

    // Handle form submission
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        await sendMessage(text);
    });

    // Handle typing indicators
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            sendTyping(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                sendTyping(false);
            }, 2000);
        });
    }
}

function sendTyping(isTyping) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'typing',
            clientId: state.user.id,
            senderId: state.user.id,
            senderRole: 'client',
            isTyping: isTyping
        }));
    }
}

let messagePollInterval = null;
function startMessagePolling() {
    if (messagePollInterval) clearInterval(messagePollInterval);
    fetchMessages(); // Initial fetch
    messagePollInterval = setInterval(() => {
        fetchMessages();
        updateSupportPresence();
    }, 5000);
}

async function fetchMessages() {
    try {
        const res = await fetch(`/api/messages?clientId=${state.user.id}`);
        const messages = await res.json();
        renderChatMessages(messages);
    } catch (e) {
        console.error('Failed to fetch messages:', e);
    }
}

async function sendMessage(text) {
    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: state.user.id,
                senderId: state.user.id,
                senderName: state.user.name,
                senderRole: 'client',
                text: text
            })
        });
        const newMsg = await res.json();
        sendTyping(false);
        fetchMessages(); // Refresh immediately
    } catch (e) {
        console.error('Failed to send message:', e);
    }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20">
                <div class="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="message-square" class="w-8 h-8"></i>
                </div>
                <h4 class="font-bold text-slate-900">Start a Conversation</h4>
                <p class="text-slate-500 text-sm mt-2">Send a message to our operations desk for assistance.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const html = messages.map(msg => {
        const isMe = msg.senderId === state.user.id;
        let ticks = '';
        if (isMe) {
            if (msg.isRead) {
                ticks = `<i data-lucide="check-check" class="w-3.5 h-3.5 text-blue-400 shrink-0 select-none"></i>`;
            } else {
                ticks = `<i data-lucide="check" class="w-3.5 h-3.5 text-slate-300 shrink-0 select-none"></i>`;
            }
        }
        return `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'} group">
                <div class="max-w-[80%] ${isMe ? 'order-1' : 'order-2'}">
                    <div class="flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${msg.senderName}</span>
                        <span class="text-[9px] text-slate-300 font-medium">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="px-5 py-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'}">
                        <div class="flex items-end gap-3 justify-between">
                            <span>${msg.text}</span>
                            <span class="flex items-center select-none">${ticks}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    if (shouldScroll || container.innerHTML.length < 1000) { 
        container.scrollTop = container.scrollHeight;
    }
}

function toggleNotifs(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
        dropdown.classList.remove('hidden');
        dropdown.offsetHeight; // force reflow
        dropdown.classList.remove('scale-95', 'opacity-0');
        dropdown.classList.add('scale-100', 'opacity-100');
        fetchNotifications();
    } else {
        dropdown.classList.remove('scale-100', 'opacity-100');
        dropdown.classList.add('scale-95', 'opacity-0');
        setTimeout(() => dropdown.classList.add('hidden'), 200);
    }
}

// Global click listener to close notifications dropdown
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notif-dropdown');
    const bellBtn = document.getElementById('bell-btn');
    if (dropdown && !dropdown.contains(e.target) && bellBtn && !bellBtn.contains(e.target)) {
        dropdown.classList.remove('scale-100', 'opacity-100');
        dropdown.classList.add('scale-95', 'opacity-0');
        setTimeout(() => dropdown.classList.add('hidden'), 200);
    }
});

async function markAllNotificationsAsRead(event) {
    if (event) event.stopPropagation();
    try {
        const res = await fetch(`/api/notifications/read-all?clientId=${state.user.id}`, {
            method: 'POST'
        });
        if (res.ok) {
            state.notifications.forEach(n => {
                if (!n.readBy.includes(state.user.id)) {
                    n.readBy.push(state.user.id);
                }
            });
            updateNotificationUI();
            
            // Show custom toast message
            const container = document.getElementById('toast-container') || (() => {
                const div = document.createElement('div');
                div.id = 'toast-container';
                div.className = 'fixed bottom-5 right-5 space-y-3 z-[9999]';
                document.body.appendChild(div);
                return div;
            })();
            const toast = document.createElement('div');
            toast.className = 'bg-slate-900 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2 translate-y-5 opacity-0 transition-all duration-300';
            toast.innerHTML = `<span>🔔</span><span>All notifications marked as read</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('translate-y-5', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            }, 10);
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-5', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    } catch (e) {
        console.error("Failed to mark all read:", e);
    }
}

async function handleNotifClick(notifId, type, relatedId) {
    try {
        await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifId, clientId: state.user.id })
        });
    } catch (e) {
        console.error("Failed to mark read:", e);
    }
    
    const notif = state.notifications.find(n => n.id === notifId);
    if (notif && !notif.readBy.includes(state.user.id)) {
        notif.readBy.push(state.user.id);
    }
    updateNotificationUI();
    
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) {
        dropdown.classList.remove('scale-100', 'opacity-100');
        dropdown.classList.add('scale-95', 'opacity-0');
        setTimeout(() => dropdown.classList.add('hidden'), 200);
    }
    
    if (type === 'message') {
        window.location.href = 'messages.html';
    } else if (type === 'blog') {
        switchTab('updates');
        if (relatedId) {
            openBlogDetail(relatedId);
        }
    } else if (type === 'status_update' || type === 'assignment') {
        switchTab('services');
    } else if (type === 'document_request') {
        switchTab('documents');
    }
}

function showToastNotification(n) {
    const container = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.className = 'fixed bottom-5 right-5 space-y-3 z-[9999]';
        document.body.appendChild(div);
        return div;
    })();
    
    const toast = document.createElement('div');
    if (n.type === 'error') {
        toast.className = 'bg-rose-50 border border-rose-200 shadow-2xl p-4 rounded-2xl flex items-start gap-3 w-80 translate-y-5 opacity-0 transition-all duration-300 cursor-pointer font-outfit';
    } else {
        toast.className = 'bg-white border border-slate-100 shadow-2xl p-4 rounded-2xl flex items-start gap-3 w-80 translate-y-5 opacity-0 transition-all duration-300 cursor-pointer font-outfit';
    }
    
    let icon = '🔔';
    if (n.type === 'message') icon = '💬';
    else if (n.type === 'blog') icon = '📰';
    else if (n.type === 'status_update') icon = '🔄';
    else if (n.type === 'document_request') icon = '📄';
    else if (n.type === 'assignment') icon = '👤';
    else if (n.type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <div class="text-xl">${icon}</div>
        <div class="flex-1">
            <div class="text-xs font-bold text-slate-900">${n.title}</div>
            <div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${n.message}</div>
        </div>
    `;
    
    toast.onclick = () => {
        toast.remove();
        if (n.type !== 'error') {
            handleNotifClick(n.id, n.type, n.relatedId);
        }
    };
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-5', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Bind to window for HTML inline event handlers
window.logout = logout;
window.switchTab = switchTab;
window.toggleAIAssistant = toggleAIAssistant;
window.handleAISend = handleAISend;
window.openBlogDetail = openBlogDetail;
window.closeModal = closeModal;
window.triggerUpload = triggerUpload;
window.toggleNotifs = toggleNotifs;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.handleNotifClick = handleNotifClick;
window.showToastNotification = showToastNotification;
window.openPortalShuftiModal = openPortalShuftiModal;
window.refreshPortalHome = refreshPortalHome;
window.selectObStep = selectObStep;
window.renderActiveStepForm = renderActiveStepForm;
window.updateWizardUIFeedback = updateWizardUIFeedback;
window.triggerAutoSave = triggerAutoSave;
window.forceSaveActiveStep = forceSaveActiveStep;
window.obUploadDoc = obUploadDoc;
window.obNextStep = obNextStep;
window.obPrevStep = obPrevStep;
window.obSubmitAllForVerification = obSubmitAllForVerification;
window.addMultiItem = addMultiItem;
window.removeMultiItem = removeMultiItem;
window.triggerMultiItemAutoSave = triggerMultiItemAutoSave;
window.obUploadMultiItemDoc = obUploadMultiItemDoc;
window.obRenderDocumentChecklistHtml = obRenderDocumentChecklistHtml;
window.obRenderShareCapitalHtml = obRenderShareCapitalHtml;
window.obIndividualShareholderSameAsDirectorCheckboxChange = obIndividualShareholderSameAsDirectorCheckboxChange;
window.obIndividualShareholderSameAsDirectorChange = obIndividualShareholderSameAsDirectorChange;
window.obIdNumberInputHandler = obIdNumberInputHandler;
window.obClearDoc = obClearDoc;
window.obClearMultiItemDoc = obClearMultiItemDoc;
window.getShareholderAllocation = getShareholderAllocation;

async function openPortalShuftiModal() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    const currentName = state.user ? state.user.name : '';
    
    content.innerHTML = `
        <div class="relative font-outfit">
            <button onclick="closeModal()" class="absolute -top-4 -right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
            
            <div class="text-center mb-6">
                <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100 mx-auto">
                    <i data-lucide="shield-check" class="w-8 h-8"></i>
                </div>
                <h3 class="text-xl font-extrabold text-slate-900">Identity & AML Screening (Shufti Pro)</h3>
                <p class="text-slate-500 text-xs mt-1">Submit your details for real-time KYC/AML verification check.</p>
            </div>

            <form id="portal-shufti-form" class="space-y-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Legal Name</label>
                    <input type="text" id="portal-shufti-name" required value="${currentName}" placeholder="Enter your full name" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nationality</label>
                        <div class="custom-select-wrapper" style="position: relative; width: 100%;">
                            <div id="portal-shufti-nation-trigger" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none flex items-center justify-between cursor-pointer select-none">
                                <span id="portal-shufti-nation-selected" class="flex items-center gap-2">
                                    <img src="https://flagcdn.com/w20/sg.png" style="width: 20px; border-radius: 2px; border: 1px solid #f1f5f9;"> Singapore
                                </span>
                                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                            </div>
                            <div id="portal-shufti-nation-dropdown" class="hidden absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-2xl p-3 z-[100000] box-sizing-border-box">
                                <input type="text" id="portal-shufti-nation-search" placeholder="Search countries..." class="box-sizing-border-box w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs focus:outline-none mb-2 focus:ring-2 focus:ring-blue-500/10">
                                <div id="portal-shufti-nation-options" style="max-height: 160px; overflow-y: auto;" class="flex flex-col gap-0.5">
                                </div>
                            </div>
                            <input type="hidden" id="portal-shufti-nation" value="Singapore">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ID Document Type</label>
                        <select id="portal-shufti-idType" required class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10">
                            <option value="Passport">Passport</option>
                            <option value="National ID" selected>National ID (NRIC/FIN)</option>
                            <option value="Driving License">Driving License</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Document Number</label>
                    <input type="text" id="portal-shufti-idNum" required value="S9876543A" placeholder="Passport or ID reference number" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10">
                </div>

                <button type="submit" class="w-full bg-blue-600 text-white rounded-xl py-3 text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] hover:bg-blue-700 transition-all mt-4 flex items-center justify-center gap-2">
                    <i data-lucide="play" class="w-4 h-4"></i> Start Shufti Pro Scan
                </button>
            </form>

            <div id="portal-shufti-loading" class="hidden flex-col items-center justify-center py-10 text-center space-y-4">
                <div class="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div id="portal-shufti-status" class="text-xs font-bold text-slate-700">Initializing Shufti verification engine...</div>
                <div class="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden relative">
                    <div id="portal-shufti-progress" class="bg-blue-600 h-full w-[10%] transition-all duration-300"></div>
                </div>
            </div>

            <div id="portal-shufti-result" class="hidden flex-col items-center justify-center py-6 text-center space-y-5">
                <!-- Will be dynamically populated -->
            </div>
        </div>
    `;

    modal.classList.remove('pointer-events-none', 'opacity-0');
    content.classList.remove('scale-95');
    if (window.lucide) window.lucide.createIcons();

    // Add change listeners to update placeholder dynamically
    const idTypeSelect = document.getElementById('portal-shufti-idType');
    const idNumInput = document.getElementById('portal-shufti-idNum');
    const updatePlaceholder = () => {
        const val = idTypeSelect.value;
        if (val === 'Passport') {
            idNumInput.placeholder = 'Enter Passport Number';
        } else if (val === 'National ID') {
            idNumInput.placeholder = 'Enter NRIC or FIN Number';
        } else if (val === 'Driving License') {
            idNumInput.placeholder = 'Enter Driving License Number';
        } else {
            idNumInput.placeholder = 'Enter Document ID Number';
        }
    };
    idTypeSelect.addEventListener('change', updatePlaceholder);
    updatePlaceholder();

    // Custom Searchable Country Select Dropdown for Portal
    const countriesList = [
        { code: "af", name: "Afghanistan" },
        { code: "ax", name: "Aland Islands" },
        { code: "al", name: "Albania" },
        { code: "dz", name: "Algeria" },
        { code: "as", name: "American Samoa" },
        { code: "ad", name: "Andorra" },
        { code: "ao", name: "Angola" },
        { code: "ai", name: "Anguilla" },
        { code: "aq", name: "Antarctica" },
        { code: "ag", name: "Antigua and Barbuda" },
        { code: "ar", name: "Argentina" },
        { code: "am", name: "Armenia" },
        { code: "aw", name: "Aruba" },
        { code: "au", name: "Australia" },
        { code: "at", name: "Austria" },
        { code: "az", name: "Azerbaijan" },
        { code: "bs", name: "Bahamas" },
        { code: "bh", name: "Bahrain" },
        { code: "bd", name: "Bangladesh" },
        { code: "bb", name: "Barbados" },
        { code: "by", name: "Belarus" },
        { code: "be", name: "Belgium" },
        { code: "bz", name: "Belize" },
        { code: "bj", name: "Benin" },
        { code: "bm", name: "Bermuda" },
        { code: "bt", name: "Bhutan" },
        { code: "bo", name: "Bolivia" },
        { code: "ba", name: "Bosnia and Herzegovina" },
        { code: "bw", name: "Botswana" },
        { code: "bv", name: "Bouvet Island" },
        { code: "br", name: "Brazil" },
        { code: "io", name: "British Indian Ocean Territory" },
        { code: "bn", name: "Brunei" },
        { code: "bg", name: "Bulgaria" },
        { code: "bf", name: "Burkina Faso" },
        { code: "bi", name: "Burundi" },
        { code: "kh", name: "Cambodia" },
        { code: "cm", name: "Cameroon" },
        { code: "ca", name: "Canada" },
        { code: "cv", name: "Cape Verde" },
        { code: "ky", name: "Cayman Islands" },
        { code: "cf", name: "Central African Republic" },
        { code: "td", name: "Chad" },
        { code: "cl", name: "Chile" },
        { code: "cn", name: "China" },
        { code: "cx", name: "Christmas Island" },
        { code: "cc", name: "Cocos (Keeling) Islands" },
        { code: "co", name: "Colombia" },
        { code: "km", name: "Comoros" },
        { code: "cg", name: "Congo" },
        { code: "cd", name: "Congo, Democratic Republic" },
        { code: "ck", name: "Cook Islands" },
        { code: "cr", name: "Costa Rica" },
        { code: "ci", name: "Cote d'Ivoire" },
        { code: "hr", name: "Croatia" },
        { code: "cu", name: "Cuba" },
        { code: "cy", name: "Cyprus" },
        { code: "cz", name: "Czech Republic" },
        { code: "dk", name: "Denmark" },
        { code: "dj", name: "Djibouti" },
        { code: "dm", name: "Dominica" },
        { code: "do", name: "Dominican Republic" },
        { code: "ec", name: "Ecuador" },
        { code: "eg", name: "Egypt" },
        { code: "sv", name: "El Salvador" },
        { code: "gq", name: "Equatorial Guinea" },
        { code: "er", name: "Eritrea" },
        { code: "ee", name: "Estonia" },
        { code: "et", name: "Ethiopia" },
        { code: "fk", name: "Falkland Islands" },
        { code: "fo", name: "Faroe Islands" },
        { code: "fj", name: "Fiji" },
        { code: "fi", name: "Finland" },
        { code: "fr", name: "France" },
        { code: "gf", name: "French Guiana" },
        { code: "pf", name: "French Polynesia" },
        { code: "tf", name: "French Southern Territories" },
        { code: "ga", name: "Gabon" },
        { code: "gm", name: "Gambia" },
        { code: "ge", name: "Georgia" },
        { code: "de", name: "Germany" },
        { code: "gh", name: "Ghana" },
        { code: "gi", name: "Gibraltar" },
        { code: "gr", name: "Greece" },
        { code: "gl", name: "Greenland" },
        { code: "gd", name: "Grenada" },
        { code: "gp", name: "Guadeloupe" },
        { code: "gu", name: "Guam" },
        { code: "gt", name: "Guatemala" },
        { code: "gg", name: "Guernsey" },
        { code: "gn", name: "Guinea" },
        { code: "gw", name: "Guinea-Bissau" },
        { code: "gy", name: "Guyana" },
        { code: "ht", name: "Haiti" },
        { code: "hm", name: "Heard Island and McDonald Islands" },
        { code: "va", name: "Holy See (Vatican City)" },
        { code: "hn", name: "Honduras" },
        { code: "hk", name: "Hong Kong" },
        { code: "hu", name: "Hungary" },
        { code: "is", name: "Iceland" },
        { code: "in", name: "India" },
        { code: "id", name: "Indonesia" },
        { code: "ir", name: "Iran" },
        { code: "iq", name: "Iraq" },
        { code: "ie", name: "Ireland" },
        { code: "im", name: "Isle of Man" },
        { code: "il", name: "Israel" },
        { code: "it", name: "Italy" },
        { code: "jm", name: "Jamaica" },
        { code: "jp", name: "Japan" },
        { code: "je", name: "Jersey" },
        { code: "jo", name: "Jordan" },
        { code: "kz", name: "Kazakhstan" },
        { code: "ke", name: "Kenya" },
        { code: "ki", name: "Kiribati" },
        { code: "kp", name: "North Korea" },
        { code: "kr", name: "South Korea" },
        { code: "kw", name: "Kuwait" },
        { code: "kg", name: "Kyrgyzstan" },
        { code: "la", name: "Laos" },
        { code: "lv", name: "Latvia" },
        { code: "lb", name: "Lebanon" },
        { code: "ls", name: "Lesotho" },
        { code: "lr", name: "Liberia" },
        { code: "ly", name: "Libya" },
        { code: "li", name: "Liechtenstein" },
        { code: "lt", name: "Lithuania" },
        { code: "lu", name: "Luxembourg" },
        { code: "mo", name: "Macao" },
        { code: "mk", name: "Macedonia" },
        { code: "mg", name: "Madagascar" },
        { code: "mw", name: "Malawi" },
        { code: "my", name: "Malaysia" },
        { code: "mv", name: "Maldives" },
        { code: "ml", name: "Mali" },
        { code: "mt", name: "Malta" },
        { code: "mh", name: "Marshall Islands" },
        { code: "mq", name: "Martinique" },
        { code: "mr", name: "Mauritania" },
        { code: "mu", name: "Mauritius" },
        { code: "yt", name: "Mayotte" },
        { code: "mx", name: "Mexico" },
        { code: "fm", name: "Micronesia" },
        { code: "md", name: "Moldova" },
        { code: "mc", name: "Monaco" },
        { code: "mn", name: "Mongolia" },
        { code: "me", name: "Montenegro" },
        { code: "ms", name: "Montserrat" },
        { code: "ma", name: "Morocco" },
        { code: "mz", name: "Mozambique" },
        { code: "mm", name: "Myanmar" },
        { code: "na", name: "Namibia" },
        { code: "nr", name: "Nauru" },
        { code: "np", name: "Nepal" },
        { code: "nl", name: "Netherlands" },
        { code: "nc", name: "New Caledonia" },
        { code: "nz", name: "New Zealand" },
        { code: "ni", name: "Nicaragua" },
        { code: "ne", name: "Niger" },
        { code: "ng", name: "Nigeria" },
        { code: "nu", name: "Niue" },
        { code: "nf", name: "Norfolk Island" },
        { code: "mp", name: "Northern Mariana Islands" },
        { code: "no", name: "Norway" },
        { code: "om", name: "Oman" },
        { code: "pk", name: "Pakistan" },
        { code: "pw", name: "Palau" },
        { code: "ps", name: "Palestine" },
        { code: "pa", name: "Panama" },
        { code: "pg", name: "Papua New Guinea" },
        { code: "py", name: "Paraguay" },
        { code: "pe", name: "Peru" },
        { code: "ph", name: "Philippines" },
        { code: "pn", name: "Pitcairn" },
        { code: "pl", name: "Poland" },
        { code: "pt", name: "Portugal" },
        { code: "pr", name: "Puerto Rico" },
        { code: "qa", name: "Qatar" },
        { code: "re", name: "Reunion" },
        { code: "ro", name: "Romania" },
        { code: "ru", name: "Russia" },
        { code: "rw", name: "Rwanda" },
        { code: "bl", name: "Saint Barthelemy" },
        { code: "sh", name: "Saint Helena" },
        { code: "kn", name: "Saint Kitts and Nevis" },
        { code: "lc", name: "Saint Lucia" },
        { code: "mf", name: "Saint Martin" },
        { code: "pm", name: "Saint Pierre and Miquelon" },
        { code: "vc", name: "Saint Vincent and the Grenadines" },
        { code: "ws", name: "Samoa" },
        { code: "sm", name: "San Marino" },
        { code: "st", name: "Sao Tome and Principe" },
        { code: "sa", name: "Saudi Arabia" },
        { code: "sn", name: "Senegal" },
        { code: "rs", name: "Serbia" },
        { code: "sc", name: "Seychelles" },
        { code: "sl", name: "Sierra Leone" },
        { code: "sg", name: "Singapore" },
        { code: "sx", name: "Sint Maarten" },
        { code: "sk", name: "Slovakia" },
        { code: "si", name: "Slovenia" },
        { code: "sb", name: "Solomon Islands" },
        { code: "so", name: "Somalia" },
        { code: "za", name: "South Africa" },
        { code: "gs", name: "South Georgia and South Sandwich Islands" },
        { code: "ss", name: "South Sudan" },
        { code: "es", name: "Spain" },
        { code: "lk", name: "Sri Lanka" },
        { code: "sd", name: "Sudan" },
        { code: "sr", name: "Suriname" },
        { code: "sj", name: "Svalbard and Jan Mayen" },
        { code: "sz", name: "Swaziland" },
        { code: "se", name: "Sweden" },
        { code: "ch", name: "Switzerland" },
        { code: "sy", name: "Syria" },
        { code: "tw", name: "Taiwan" },
        { code: "tj", name: "Tajikistan" },
        { code: "tz", name: "Tanzania" },
        { code: "th", name: "Thailand" },
        { code: "tl", name: "Timor-Leste" },
        { code: "tg", name: "Togo" },
        { code: "tk", name: "Tokelau" },
        { code: "to", name: "Tonga" },
        { code: "tt", name: "Trinidad and Tobago" },
        { code: "tn", name: "Tunisia" },
        { code: "tr", name: "Turkey" },
        { code: "tm", name: "Turkmenistan" },
        { code: "tc", name: "Turks and Caicos Islands" },
        { code: "tv", name: "Tuvalu" },
        { code: "ug", name: "Uganda" },
        { code: "ua", name: "Ukraine" },
        { code: "ae", name: "United Arab Emirates" },
        { code: "gb", name: "United Kingdom" },
        { code: "us", name: "United States" },
        { code: "uy", name: "Uruguay" },
        { code: "uz", name: "Uzbekistan" },
        { code: "vu", name: "Vanuatu" },
        { code: "ve", name: "Venezuela" },
        { code: "vn", name: "Vietnam" },
        { code: "vg", name: "Virgin Islands, British" },
        { code: "vi", name: "Virgin Islands, U.S." },
        { code: "wf", name: "Wallis and Futuna" },
        { code: "eh", name: "Western Sahara" },
        { code: "ye", name: "Yemen" },
        { code: "zm", name: "Zambia" },
        { code: "zw", name: "Zimbabwe" }
    ];

    const trigger = document.getElementById('portal-shufti-nation-trigger');
    const dropdown = document.getElementById('portal-shufti-nation-dropdown');
    const search = document.getElementById('portal-shufti-nation-search');
    const optionsContainer = document.getElementById('portal-shufti-nation-options');
    const hiddenInput = document.getElementById('portal-shufti-nation');
    const selectedSpan = document.getElementById('portal-shufti-nation-selected');

    let highlightedIdx = 0;
    let filteredCountries = [...countriesList];

    const setVal = (country) => {
        hiddenInput.value = country.name;
        selectedSpan.innerHTML = `
            <span style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 14px; background: #f1f5f9; border-radius: 2px; border: 1px solid #cbd5e1; overflow: hidden; flex-shrink: 0; font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; box-sizing: border-box; margin-right: 8px;">
                <span style="position: absolute; font-family: monospace; z-index: 1;">${country.code}</span>
                <img src="https://flagcdn.com/w20/${country.code}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" onerror="this.style.display='none';">
            </span>
            ${country.name}
        `;
        dropdown.classList.add('hidden');
    };

    const updateHighlight = (newIdx) => {
        const options = optionsContainer.querySelectorAll('.nation-opt');
        options.forEach((opt, idx) => {
            if (idx === newIdx) {
                opt.classList.add('bg-slate-100', 'font-bold');
            } else {
                opt.classList.remove('bg-slate-100', 'font-bold');
            }
        });
        highlightedIdx = newIdx;
        const activeEl = optionsContainer.children[highlightedIdx];
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    };

    const renderOptions = () => {
        optionsContainer.innerHTML = filteredCountries.map((c, i) => {
            return `
                <div class="nation-opt flex items-center gap-2 p-2 text-xs cursor-pointer rounded-xl transition-all" data-code="${c.code}" data-name="${c.name}">
                    <span class="flag-box" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 14px; background: #f1f5f9; border-radius: 2px; border: 1px solid #cbd5e1; overflow: hidden; flex-shrink: 0; font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        <span style="position: absolute; font-family: monospace; z-index: 1;">${c.code}</span>
                        <img src="https://flagcdn.com/w20/${c.code}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2;" onerror="this.style.display='none';">
                    </span>
                    <span>${c.name}</span>
                </div>
            `;
        }).join('') || `<div class="p-3 text-center text-xs text-slate-400">No countries found</div>`;

        // Bind clicks and mouseover
        Array.from(optionsContainer.children).forEach((el, index) => {
            if (el.classList.contains('nation-opt')) {
                el.onclick = () => {
                    const code = el.getAttribute('data-code');
                    const name = el.getAttribute('data-name');
                    setVal({ code, name });
                };
                el.onmouseover = () => {
                    updateHighlight(index);
                };
            }
        });

        // Set initial highlight style
        if (filteredCountries.length > 0) {
            updateHighlight(highlightedIdx);
        }
    };

    trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            dropdown.classList.add('hidden');
        } else {
            dropdown.classList.remove('hidden');
            search.value = '';
            filteredCountries = [...countriesList];
            highlightedIdx = filteredCountries.findIndex(c => c.name.toLowerCase() === hiddenInput.value.toLowerCase());
            if (highlightedIdx === -1) highlightedIdx = 0;
            renderOptions();
            setTimeout(() => search.focus(), 50);
        }
    };

    search.onclick = (e) => e.stopPropagation();

    search.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        filteredCountries = countriesList.filter(c => c.name.toLowerCase().includes(val));
        highlightedIdx = 0;
        renderOptions();
    };

    search.onkeydown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredCountries.length > 0) {
                const nextIdx = (highlightedIdx + 1) % filteredCountries.length;
                updateHighlight(nextIdx);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredCountries.length > 0) {
                const prevIdx = (highlightedIdx - 1 + filteredCountries.length) % filteredCountries.length;
                updateHighlight(prevIdx);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCountries[highlightedIdx]) {
                setVal(filteredCountries[highlightedIdx]);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
        }
    };

    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
    });

    const initialCountry = countriesList.find(c => c.name.toLowerCase() === (hiddenInput.value || '').toLowerCase()) || { code: 'sg', name: 'Singapore' };
    setVal(initialCountry);

    const form = document.getElementById('portal-shufti-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('portal-shufti-name').value;
        const nation = document.getElementById('portal-shufti-nation').value;
        const idType = document.getElementById('portal-shufti-idType').value;
        const idNum = document.getElementById('portal-shufti-idNum').value;

        form.classList.add('hidden');
        const loadingSection = document.getElementById('portal-shufti-loading');
        loadingSection.classList.remove('hidden');

        const steps = [
            { progress: 25, text: "Scanning identity document & performing OCR..." },
            { progress: 50, text: "Running background database AML checks..." },
            { progress: 75, text: "Screening PEP & Politically Exposed Lists..." },
            { progress: 95, text: "Running global sanctions list monitoring checks..." },
            { progress: 100, text: "Syncing compliance records with Globalisor engine..." }
        ];

        const sleep = (ms) => new Promise(res => setTimeout(res, ms));
        for (const step of steps) {
            document.getElementById('portal-shufti-progress').style.width = `${step.progress}%`;
            document.getElementById('portal-shufti-status').innerText = step.text;
            await sleep(1000);
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/compliance/shufti-verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    clientId: state.user.id,
                    name,
                    idType,
                    idNum,
                    nation
                })
            });

            if (res.ok) {
                const kycRes = await res.json();
                state.kyc = kycRes;
                
                // Hydrate Compliance status too
                const cpRes = await fetch('/api/compliance');
                if (cpRes.ok) {
                    const cpList = await cpRes.json();
                    state.compliance = cpList.find(c => c.clientId === state.user.id);
                }

                loadingSection.classList.add('hidden');
                const resultSection = document.getElementById('portal-shufti-result');
                resultSection.classList.remove('hidden');

                const status = kycRes.status || 'pending';
                let iconClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                let icon = 'shield-check';
                let title = 'KYC Verification Approved';
                let subtitle = 'Your background screening was completed successfully and your profile is approved.';

                if (status === 'flagged') {
                    iconClass = 'bg-red-50 text-red-600 border-red-100';
                    icon = 'shield-alert';
                    title = 'AML Watchlist Hit Flagged';
                    subtitle = 'Screening detected matching entries on PEP or watchlists. Undergoing compliance manual review.';
                } else if (status === 'under review') {
                    iconClass = 'bg-amber-50 text-amber-600 border-amber-100';
                    icon = 'alert-triangle';
                    title = 'Under Manual Review';
                    subtitle = 'Document OCR verification needs further review by our compliance desk.';
                }

                resultSection.innerHTML = `
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto ${iconClass}">
                        <i data-lucide="${icon}" class="w-8 h-8"></i>
                    </div>
                    <div>
                        <h4 class="text-base font-bold text-slate-900">${title}</h4>
                        <p class="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">${subtitle}</p>
                    </div>

                    <div class="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 max-w-md mx-auto space-y-2 text-left">
                        <div class="flex justify-between text-xs">
                            <span class="text-slate-400">Transaction Ref:</span>
                            <code class="font-mono text-[10px] text-slate-600">${kycRes.shuftiRef || 'N/A'}</code>
                        </div>
                        <div class="flex justify-between text-xs">
                            <span class="text-slate-400">Risk Profile:</span>
                            <span class="font-bold ${kycRes.risk === 'High' ? 'text-red-500' : (kycRes.risk === 'Medium' ? 'text-amber-500' : 'text-emerald-500')}">${kycRes.risk || 'Low'}</span>
                        </div>
                    </div>

                    <button onclick="closeModal(); refreshPortalHome();" class="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all w-full max-w-xs shadow-lg shadow-slate-900/10">Understood</button>
                `;
                if (window.lucide) window.lucide.createIcons();
            } else {
                throw new Error("Verification failed");
            }
        } catch (err) {
            console.error(err);
            loadingSection.classList.add('hidden');
            const resultSection = document.getElementById('portal-shufti-result');
            resultSection.classList.remove('hidden');
            resultSection.innerHTML = `
                <div class="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto">
                    <i data-lucide="shield-alert" class="w-8 h-8"></i>
                </div>
                <div>
                    <h4 class="text-base font-bold text-slate-900">Verification Service Offline</h4>
                    <p class="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">The Shufti Pro screening service is temporarily unreachable. Please try again later or contact support.</p>
                </div>
                <button onclick="closeModal()" class="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all w-full max-w-xs shadow-lg">Close</button>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    };
}

function refreshPortalHome() {
    if (state.currentTab === 'home') {
        const view = document.getElementById('main-view');
        renderHome(view);
    }
}

function triggerMultiItemAutoSave(stepKey, idx, isCheckboxChange) {
    if (obAutoSaveTimeout) clearTimeout(obAutoSaveTimeout);
    
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    if (!state.onboarding) state.onboarding = {};
    if (!state.onboarding[stepField]) state.onboarding[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
    const stepData = state.onboarding[stepField];
    if (!stepData.data.list) stepData.data.list = [];
    if (!stepData.data.list[idx]) stepData.data.list[idx] = {};
    const item = stepData.data.list[idx];
    
    const currentManualFields = getStepManualFields(stepKey, item);
    if (currentManualFields) {
        currentManualFields.forEach(f => {
            const el = document.getElementById(`ob-${stepKey}-${idx}-${f.key}`);
            if (el) {
                if (f.type === 'checkbox') {
                    item[f.key] = el.checked;
                } else if (f.type === 'phone') {
                    // Read composite value: code:dial:number from data attribute, fallback to plain number
                    item[f.key] = el.dataset.fullVal || ((() => {
                        const sel = document.getElementById(`ob-${stepKey}-${idx}-${f.key}-country-val`);
                        if (sel) {
                            const [code, dial] = sel.value.split('|');
                            return `${code}:${dial}:${el.value}`;
                        }
                        return el.value;
                    })());
                } else if (f.type === 'nationality') {
                    item[f.key] = el.value;
                } else {
                    item[f.key] = el.value;
                }
            }
        });

        // Dynamic validation warning update for NRIC duplicates in the list
        stepData.data.list.forEach((it, itIdx) => {
            const el = document.getElementById(`ob-${stepKey}-${itIdx}-idNumber`);
            if (el) {
                const isIdDuplicate = stepData.data.list.some((other, otherIdx) => otherIdx !== itIdx && other.idNumber && String(other.idNumber).trim().toUpperCase() === String(el.value).trim().toUpperCase());
                const warnEl = document.getElementById(`${el.id}-warn`);
                if (warnEl) {
                    warnEl.style.display = (isIdDuplicate && el.value.trim()) ? 'block' : 'none';
                }
            }
        });
    }

    if (stepKey === 'individual_shareholder') {
        const sameAsDirectorEl = document.getElementById(`ob-individual_shareholder-${idx}-sameAsDirector`);
        if (sameAsDirectorEl && sameAsDirectorEl.checked) {
            const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
            const dirStepField = dirStep ? dirStep.field : null;
            if (dirStepField) {
                const dirList = (state.onboarding[dirStepField] || {}).data?.list || [];
                const dirData = dirList[idx] || dirList[0] || {};
                
                ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(key => {
                    const el = document.getElementById(`ob-individual_shareholder-${idx}-${key}`);
                    if (el && dirData[key]) {
                        if (key === 'mobile') {
                            let phoneNum = dirData['mobile'];
                            let selectedCode = 'SG';
                            let selectedDial = '+65';
                            if (phoneNum && phoneNum.includes(':')) {
                                const parts = phoneNum.split(':');
                                selectedCode = parts[0] || 'SG';
                                selectedDial = parts[1] || '+65';
                                phoneNum = parts[2] || '';
                            }
                            el.value = phoneNum;
                            el.dataset.fullVal = dirData['mobile'];
                            
                            const flagEl = document.getElementById(`ob-individual_shareholder-${idx}-flag`);
                            if (flagEl) {
                                flagEl.innerHTML = obFlagImg(selectedCode, 20);
                            }
                            const dialcodeEl = document.getElementById(`ob-individual_shareholder-${idx}-dialcode`);
                            if (dialcodeEl) {
                                dialcodeEl.textContent = selectedDial;
                            }
                            const countryValEl = document.getElementById(`ob-individual_shareholder-${idx}-country-val`);
                            if (countryValEl) {
                                countryValEl.value = `${selectedCode}|${selectedDial}|8`;
                            }
                        } else {
                            el.value = dirData[key];
                        }
                        item[key] = dirData[key];
                    }
                });
            }
        }
    }

    if (stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') {
        const numSharesEl = document.getElementById(`ob-${stepKey}-${idx}-numberOfShares`);
        const numSharesPctEl = document.getElementById(`ob-${stepKey}-${idx}-numberOfSharesPct`);
        const shareCapitalAmountEl = document.getElementById(`ob-${stepKey}-${idx}-shareCapitalAmount`);
        const shareCapitalAmountPctEl = document.getElementById(`ob-${stepKey}-${idx}-shareCapitalAmountPct`);
        const ownershipEl = document.getElementById(`ob-${stepKey}-${idx}-ownershipPercentage`);
        const uboEl = document.getElementById(`ob-${stepKey}-${idx}-uboDeclaration`);
        
        const shCurr = (item.currency || '').trim().toUpperCase();
        const shClass = (item.shareClass || '').trim().toUpperCase();
        
        let totalSharesForCombo = 0;
        let totalAmountForCombo = 0;
        
        const scStep = state.onboarding.stepShareCapital || {};
        const scData = scStep.data || {};
        const scCurrencies = scData.currencies || [];
        
        if (shCurr && shCurr !== 'SELECT' && shClass && shClass !== 'SELECT') {
            const match = scCurrencies.find(c => {
                const scCurr = (c.currency === 'Others' ? (c.customCurrency || '') : c.currency).trim().toUpperCase();
                const scClass = (c.shareClass || '').trim().toUpperCase();
                return scCurr === shCurr && scClass === shClass;
            });
            if (match) {
                totalSharesForCombo = parseFloat(match.numberOfShares) || 0;
                totalAmountForCombo = parseFloat(match.shareCapitalAmount) || 0;
            }
        } else if (shCurr && shCurr !== 'SELECT') {
            const matches = scCurrencies.filter(c => {
                const scCurr = (c.currency === 'Others' ? (c.customCurrency || '') : c.currency).trim().toUpperCase();
                return scCurr === shCurr;
            });
            if (matches.length === 1) {
                const match = matches[0];
                totalSharesForCombo = parseFloat(match.numberOfShares) || 0;
                totalAmountForCombo = parseFloat(match.shareCapitalAmount) || 0;
                item.shareClass = match.shareClass || '';
                const classSelect = document.getElementById(`ob-${stepKey}-${idx}-shareClass`);
                if (classSelect) {
                    classSelect.value = match.shareClass || '';
                }
            }
        } else if (scCurrencies.length === 1) {
            const match = scCurrencies[0];
            totalSharesForCombo = parseFloat(match.numberOfShares) || 0;
            totalAmountForCombo = parseFloat(match.shareCapitalAmount) || 0;
        }
        
        console.log("Onboarding auto-calc query debug:", {
            shCurr,
            shClass,
            totalSharesForCombo,
            totalAmountForCombo,
            scCurrencies
        });
        
        let pctVal = 0;
        if (numSharesPctEl) {
            const pct = parseFloat(numSharesPctEl.value) || 0;
            item.numberOfSharesPct = numSharesPctEl.value === '' ? '' : pct;
            const calculatedShares = Math.round((pct / 100) * totalSharesForCombo);
            item.numberOfShares = calculatedShares;
            if (numSharesEl) {
                numSharesEl.value = calculatedShares;
            }
            pctVal = pct;
        }
        
        if (shareCapitalAmountPctEl) {
            const pct = parseFloat(shareCapitalAmountPctEl.value) || 0;
            item.shareCapitalAmountPct = shareCapitalAmountPctEl.value === '' ? '' : pct;
            const calculatedCapital = Math.round((pct / 100) * totalAmountForCombo * 100) / 100;
            item.shareCapitalAmount = calculatedCapital;
            if (shareCapitalAmountEl) {
                shareCapitalAmountEl.value = calculatedCapital;
            }
        }

        if (ownershipEl) {
            ownershipEl.value = pctVal;
            item.ownershipPercentage = pctVal;
        }
        if (uboEl) {
            const uboVal = pctVal >= 25 ? 'Yes' : 'No';
            uboEl.value = uboVal;
            item.uboDeclaration = uboVal;
        }
        
        if (stepKey === 'individual_shareholder' && pctVal >= 25) {
            syncUBOFromIndividualShareholder(idx, item);
        }
    }
    
    state.onboarding[stepField] = stepData;
    updateWizardUIFeedback();
    
    if (isCheckboxChange) {
        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
    }
    
    obAutoSaveTimeout = setTimeout(async () => {
        await ensureOnboardingRecord();
        if (!state.onboardingId) return;
        
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    status: stepData.status
                })
            });
            if (res.ok) {
                const updated = await res.json();
                state.onboarding = updated;
                console.log(`Auto-saved step ${stepKey}`);
            }
        } catch (e) {
            console.error('Error auto-saving step:', e);
        }
    }, 1000);
}

function syncUBOFromIndividualShareholder(idx, item) {
    const uboStep = ONBOARDING_STEPS.find(s => s.key === 'ubo');
    const uboField = uboStep ? uboStep.field : null;
    if (!uboField) return;

    if (!state.onboarding[uboField]) state.onboarding[uboField] = { data: {}, status: 'pending', documents: [] };
    
    ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile', 'ownershipPercentage'].forEach(key => {
        const sourceVal = item[key];
        if (sourceVal !== undefined) {
            state.onboarding[uboField].data[key] = sourceVal;
        }
    });
    
    const indStep = ONBOARDING_STEPS.find(s => s.key === 'individual_shareholder');
    const indStepField = indStep ? indStep.field : null;
    if (indStepField) {
        const sourceDocs = state.onboarding[indStepField].documents || [];
        const nricDoc = sourceDocs.find(d => d.type === `nric_${idx}`);
        if (nricDoc) {
            const targetDocs = state.onboarding[uboField].documents || [];
            const hasNric = targetDocs.some(d => d.type === 'nric');
            if (!hasNric) {
                targetDocs.push({ ...nricDoc, type: 'nric' });
                state.onboarding[uboField].documents = targetDocs;
            }
        }
    }
    
    (async () => {
        await ensureOnboardingRecord();
        if (state.onboardingId) {
            await fetch(`/api/onboarding/${state.onboardingId}/step/ubo`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: state.onboarding[uboField].data,
                    documents: state.onboarding[uboField].documents,
                    status: 'pending'
                })
            });
        }
    })();
}

async function addMultiItem(stepKey) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    if (!state.onboarding[stepField]) state.onboarding[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
    const stepData = state.onboarding[stepField];
    if (!stepData.data.list) stepData.data.list = [];
    
    stepData.data.list.push({});
    state.onboarding[stepField] = stepData;
    
    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch(e) {}
    }
    
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function removeMultiItem(stepKey, idx) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData || !stepData.data.list) return;
    
    stepData.data.list.splice(idx, 1);
    
    if (stepData.documents) {
        const newDocs = [];
        stepData.documents.forEach(d => {
            const docMatch = d.type.match(/^(.+)_(\d+)$/);
            if (docMatch) {
                const docTypePrefix = docMatch[1];
                const docIdx = parseInt(docMatch[2]);
                if (docIdx === idx) {
                    // Deleted
                } else if (docIdx > idx) {
                    d.type = `${docTypePrefix}_${docIdx - 1}`;
                    newDocs.push(d);
                } else {
                    newDocs.push(d);
                }
            } else {
                newDocs.push(d);
            }
        });
        stepData.documents = newDocs;
    }
    
    state.onboarding[stepField] = stepData;
    
    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch(e) {}
    }
    
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obUploadMultiItemDoc(stepKey, docTypeWithIdx, docLabel, idx) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check if this document has already been uploaded for another item in this step
        const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
        const currentDocs = (state.onboarding && state.onboarding[stepField] && state.onboarding[stepField].documents) || [];
        const isDuplicate = currentDocs.some(d => d.fileName === file.name && d.type !== docTypeWithIdx);
        if (isDuplicate) {
            showToastNotification({
                id: "err-" + Date.now(),
                type: "error",
                title: "Duplicate Upload Error",
                message: `The file "${file.name}" has already been uploaded for another entry in this section.`
            });
            return;
        }
        
        const docEl = document.getElementById(`doc-${stepKey}-${docTypeWithIdx}`);
        if (docEl) docEl.innerHTML = `<div style='color:#3b82f6;font-size:11px;font-weight:700;'>⏳ Uploading & extracting...</div>`;
        
        const docType = docTypeWithIdx.split('_')[0];
        const ocrResult = await performOcrOnFileInput(file, docType);
        const extracted = ocrResult.extracted;
        const base64DataUri = ocrResult.fileData;
        
        // Post-Extraction validation: Check if extracted ID number is already registered for another item
        if (extracted && extracted.idNumber) {
            const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
            const stepData = state.onboarding[stepField] || {};
            const list = (stepData.data && stepData.data.list) || [];
            const isIdDuplicate = list.some((item, itemIdx) => itemIdx !== idx && item.idNumber && String(item.idNumber).trim().toUpperCase() === String(extracted.idNumber).trim().toUpperCase());
            if (isIdDuplicate) {
                showToastNotification({
                    id: "err-id-" + Date.now(),
                    type: "error",
                    title: "Duplicate ID Number",
                    message: `The extracted NRIC / FIN "${extracted.idNumber}" from "${file.name}" is already registered for another entry.`
                });
                const workspace = document.getElementById('ob-form-workspace');
                if (workspace) renderActiveStepForm(workspace);
                return;
            }
        }
        
        await ensureOnboardingRecord();
        if (state.onboardingId) {
            const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
            const currentDocs = state.onboarding[stepField].documents || [];
            
            const filteredDocs = currentDocs.filter(d => d.type !== docTypeWithIdx);
            
            const newDoc = {
                id: "DOC-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                type: docTypeWithIdx,
                label: docLabel,
                fileName: file.name,
                fileData: base64DataUri,
                mimeType: file.type,
                status: 'pending',
                extractedData: extracted,
                uploadedAt: Date.now()
            };
            filteredDocs.push(newDoc);
            
            const patchRes = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    documents: filteredDocs
                })
            });
            if (patchRes.ok) {
                const updatedOb = await patchRes.json();
                state.onboarding = normalizeOnboardingData(updatedOb);
                
                if (extracted) {
                    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
                    if (step) {
                        const item = state.onboarding[step.field].data.list[idx];
                        if (item) {
                            Object.entries(extracted).forEach(([k, v]) => {
                                if (v && k !== 'confidence' && k !== 'extractedAt') {
                                    item[k] = v;
                                }
                            });
                        }
                    }
                }
                
                await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                    method: 'PATCH',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        data: state.onboarding[stepField].data
                    })
                });
            }
        }
        
        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
        updateWizardUIFeedback();
    }
    input.click();
}

// ─── Extra Onboarding Helpers ───────────────────────────────────────────────

function obRenderDocumentChecklistHtml(isReadOnly) {
    const req = state.requirements || {};
    const dirs = req.directors || [];
    const shs = req.shareholders || [];
    const inds = shs.filter(s => s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤'))));
    const corps = shs.filter(s => !(s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤')))));

    const cleanContactVal = (val, fallback) => {
        if (!val) return fallback;
        const clean = val.toString().trim().toUpperCase();
        if (clean === '' || clean === 'N/A' || clean === 'N / A' || clean === 'NULL' || clean === 'UNDEFINED') {
            return fallback;
        }
        return val;
    };

    let html = `
    <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 24px; font-family: Outfit, sans-serif;">
        <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            📋 Document Preparation Checklist
        </h4>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.6;">
            Based on your pre-registration selections (<b>${dirs.length} Director(s)</b>, <b>${inds.length} Individual Shareholder(s)</b>, <b>${corps.length} Corporate Shareholder(s)</b>), please prepare the following documents before proceeding:
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
    `;

    if (dirs.length > 0) {
        html += `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    👤 Director Documents (${dirs.length} Director${dirs.length > 1 ? 's' : ''})
                </div>
                <ul style="list-style-type: none; padding-left: 0; margin: 0 0 12px 0; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #475569;">
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 NRIC / FIN (front & back) for all directors</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Proof of Address (Utility Bill / Bank Statement / Mobile Bill dated &lt; 3 months)</li>
                </ul>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Director Registry Details:</div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${dirs.map((d, dIdx) => `
                            <div style="font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                                <div style="font-weight: 600; color: #1e293b;">Director ${dIdx + 1}${d.name && d.name !== 'N/A' ? `: ${d.name}` : ''}</div>
                                <div style="color: #64748b; padding-left: 8px;">1. ${cleanContactVal(d.email, 'Email ID')}</div>
                                <div style="color: #64748b; padding-left: 8px;">2. ${cleanContactVal(d.phone, 'Phone Number')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    if (inds.length > 0) {
        html += `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    👥 Individual Shareholder Documents (${inds.length} Shareholder${inds.length > 1 ? 's' : ''})
                </div>
                <ul style="list-style-type: none; padding-left: 0; margin: 0 0 12px 0; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #475569;">
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 NRIC / FIN (front & back) for all individual shareholders</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Proof of Address for all individual shareholders</li>
                </ul>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Individual Shareholder Registry Details:</div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${inds.map((s, sIdx) => `
                            <div style="font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                                <div style="font-weight: 600; color: #1e293b;">Shareholder ${sIdx + 1}${s.name && s.name !== 'N/A' ? `: ${s.name}` : ''}</div>
                                <div style="color: #64748b; padding-left: 8px;">1. ${cleanContactVal(s.email, 'Email ID')}</div>
                                <div style="color: #64748b; padding-left: 8px;">2. ${cleanContactVal(s.phone, 'Phone Number')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    if (corps.length > 0) {
        const repData = (state.onboarding && state.onboarding.step6CorporateRep && state.onboarding.step6CorporateRep.data) || {};
        html += `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    🏢 Corporate Shareholder Documents (${corps.length} Corporate Shareholder${corps.length > 1 ? 's' : ''})
                </div>
                <ul style="list-style-type: none; padding-left: 0; margin: 0 0 12px 0; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #475569;">
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 ACRA Bizfile (or foreign registry equivalent)</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Company Constitution (M&AA)</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Certificate of Incorporation (for non-Singapore companies)</li>
                </ul>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Corporate Shareholder Registry Details:</div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${corps.map((s, cIdx) => `
                            <div style="font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                                <div style="font-weight: 600; color: #1e293b;">Corporate Shareholder ${cIdx + 1}${s.name && s.name !== 'N/A' ? `: ${s.name}` : ''}</div>
                                <div style="color: #64748b; padding-left: 8px;">1. ${cleanContactVal(s.email, 'Email ID')}</div>
                                <div style="color: #64748b; padding-left: 8px;">2. ${cleanContactVal(s.phone, 'Phone Number')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    👔 Corporate Representative Documents
                </div>
                <ul style="list-style-type: none; padding-left: 0; margin: 0 0 12px 0; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #475569;">
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 NRIC / FIN for the authorized corporate representative</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Proof of Address for the representative</li>
                    <li style="display: flex; align-items: center; gap: 8px;">🔲 Board Resolution or Letter of Authorization appointing the representative</li>
                </ul>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Representative Contact Details:</div>
                    <div style="font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 600; color: #1e293b;">Representative${repData.fullName && repData.fullName !== 'Not Filled Yet' && repData.fullName !== 'N/A' ? `: ${repData.fullName}` : ''}</div>
                        <div style="color: #64748b; padding-left: 8px;">1. ${cleanContactVal(repData.email, 'Email ID')}</div>
                        <div style="color: #64748b; padding-left: 8px;">2. ${cleanContactVal(repData.mobile, 'Phone Number')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    html += `
        </div>
    </div>
    `;

    return html;
}

function obRenderShareCapitalHtml(isReadOnly) {
    const ob = state.onboarding || {};
    if (!ob.stepShareCapital) ob.stepShareCapital = { data: { currencies: [] }, status: 'pending', documents: [] };
    if (!ob.stepShareCapital.data) ob.stepShareCapital.data = { currencies: [] };
    if (!ob.stepShareCapital.data.currencies) {
        ob.stepShareCapital.data.currencies = [];
    }

    const currencies = ob.stepShareCapital.data.currencies;

    // Build the sections HTML
    let sectionsHtml = '';

    if (currencies.length === 0) {
        sectionsHtml = `
            <div style="text-align:center;padding:30px;color:#64748b;font-size:13px;background:#f8fafc;border:2.5px dashed #cbd5e1;border-radius:12px;margin-bottom:20px;">
                No share capital sections added. Click "Add Currency Section" below to start.
            </div>
        `;
    } else {
        sectionsHtml = currencies.map((c, idx) => {
            const isCollapsed = !!c.isCollapsed;
            
            // Validation check for this specific block
            const currCode = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
            const numShares = parseFloat(c.numberOfShares) || 0;
            const amount = parseFloat(c.shareCapitalAmount) || 0;
            
            let errorText = '';
            if (!currCode) {
                errorText = '⚠️ Currency code is required.';
            } else if (numShares <= 0 || !Number.isInteger(numShares)) {
                errorText = '⚠️ Number of Shares must be a positive whole number.';
            } else if (amount < numShares) {
                errorText = '⚠️ Issued Share Capital Amount cannot be less than the Number of Shares.';
            }

            const headerSummary = `${currCode || '???'} – ${numShares.toLocaleString()} ${c.shareClass === 'Ordinary' ? 'ORD' : 'PREF'} – ${currCode || '???'} ${amount.toLocaleString()} Issued`;

            if (isCollapsed) {
                return `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 20px;margin-bottom:16px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);display:flex;justify-content:space-between;align-items:center;transition: all 0.2s ease;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:13px;font-weight:700;color:#1e293b;">${headerSummary}</span>
                        ${errorText ? `<span style="font-size:11px;color:#ef4444;font-weight:600;margin-left:8px;">(Invalid)</span>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button type="button" onclick="obToggleCurrencyCollapse(${idx})" style="padding:6px 12px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">
                            Expand
                        </button>
                        ${isReadOnly ? '' : `
                            <button type="button" onclick="obDeleteCurrencySection(${idx})" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">
                                Delete
                            </button>
                        `}
                    </div>
                </div>
                `;
            }

            // Expanded view
            return `
            <div style="background:#ffffff;border:1.5px solid ${errorText ? '#fecaca' : '#e2e8f0'};border-radius:12px;padding:20px;margin-bottom:16px;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
                    <span style="font-size:13px;font-weight:700;color:#0f172a;">Currency Section #${idx + 1}</span>
                    <div style="display:flex;gap:8px;">
                        <button type="button" onclick="obToggleCurrencyCollapse(${idx})" style="padding:4px 10px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;">
                            Collapse
                        </button>
                        ${isReadOnly ? '' : `
                            <button type="button" onclick="obDeleteCurrencySection(${idx})" style="padding:4px 10px;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;">
                                Delete
                            </button>
                        `}
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
                    <div class="ob-field">
                        <label>Currency</label>
                        <select onchange="obUpdateCurrencyField(${idx}, 'currency', this.value)" ${isReadOnly ? 'disabled' : ''}>
                            <option value="SGD" ${c.currency === 'SGD' ? 'selected' : ''}>SGD</option>
                            <option value="USD" ${c.currency === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="Others" ${c.currency === 'Others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                    <div class="ob-field">
                        <label>Class of Shares</label>
                        <select onchange="obUpdateCurrencyField(${idx}, 'shareClass', this.value)" ${isReadOnly ? 'disabled' : ''}>
                            <option value="Ordinary" ${c.shareClass === 'Ordinary' ? 'selected' : ''}>Ordinary</option>
                            <option value="Preference" ${c.shareClass === 'Preference' ? 'selected' : ''}>Preference</option>
                        </select>
                    </div>
                </div>

                ${c.currency === 'Others' ? `
                    <div class="ob-field" style="margin-bottom:12px;">
                        <label>Specify Custom Currency Code</label>
                        <input type="text" value="${c.customCurrency || ''}" placeholder="e.g. EUR, GBP" oninput="obUpdateCurrencyFieldLocal(${idx}, 'customCurrency', this.value)" onchange="obUpdateCurrencyField(${idx}, 'customCurrency', this.value)" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                ` : ''}

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
                    <div class="ob-field">
                        <label>Total Number of Shares</label>
                        <input type="number" step="1" value="${c.numberOfShares !== undefined && c.numberOfShares !== null ? c.numberOfShares : ''}" placeholder="e.g. 100" oninput="obUpdateCurrencyFieldLocal(${idx}, 'numberOfShares', this.value)" onchange="obUpdateCurrencyField(${idx}, 'numberOfShares', this.value)" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                    <div class="ob-field">
                        <label>Total Issued Share Capital Amount</label>
                        <input type="number" value="${c.shareCapitalAmount !== undefined && c.shareCapitalAmount !== null ? c.shareCapitalAmount : ''}" placeholder="e.g. 100" oninput="obUpdateCurrencyFieldLocal(${idx}, 'shareCapitalAmount', this.value)" onchange="obUpdateCurrencyField(${idx}, 'shareCapitalAmount', this.value)" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                </div>

                ${errorText ? `
                    <div style="color:#ef4444;font-size:11px;font-weight:600;margin-top:8px;background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:8px;">
                        ${errorText}
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');
    }

    // Build consolidated summary HTML
    let summaryHtml = '';
    if (currencies.length > 0) {
        const uniqueCurrencies = new Set();
        let totalShares = 0;
        const capitalByCurrency = {};

        currencies.forEach(c => {
            const currCode = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
            if (currCode) uniqueCurrencies.add(currCode);
            totalShares += parseFloat(c.numberOfShares) || 0;

            if (currCode) {
                capitalByCurrency[currCode] = (capitalByCurrency[currCode] || 0) + (parseFloat(c.shareCapitalAmount) || 0);
            }
        });

        const capitalSummaryStrings = Object.keys(capitalByCurrency).map(curr => {
            return `<strong style="color:#0f172a;">${curr} ${capitalByCurrency[curr].toLocaleString()}</strong>`;
        }).join(', ');

        summaryHtml = `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:20px;">
                <h5 style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                    📊 Consolidated Share Capital Summary
                </h5>
                <div style="display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:16px;font-size:12.5px;color:#475569;">
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:12px;">
                        <span style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Currencies</span>
                        <span style="font-size:16px;font-weight:800;color:#0f172a;">${uniqueCurrencies.size}</span>
                    </div>
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:12px;">
                        <span style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Shares</span>
                        <span style="font-size:16px;font-weight:800;color:#0f172a;">${totalShares.toLocaleString()}</span>
                    </div>
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:8px;padding:12px;">
                        <span style="display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Issued Share Capital</span>
                        <span style="font-size:13px;font-weight:500;">${capitalSummaryStrings || 'None'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    let addBtnHtml = '';
    if (!isReadOnly) {
        addBtnHtml = `
            <div style="margin-bottom:20px;display:flex;gap:10px;">
                <button type="button" onclick="obAddCurrencySection()" style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-family:Outfit,sans-serif;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                    ➕ Add Currency Section
                </button>
            </div>
        `;
    }

    return sectionsHtml + addBtnHtml + summaryHtml;
}

function obUpdateCurrencyFieldLocal(idx, key, val) {
    const ob = state.onboarding || {};
    if (!ob.stepShareCapital) ob.stepShareCapital = { data: { currencies: [] }, status: 'pending', documents: [] };
    if (!ob.stepShareCapital.data) ob.stepShareCapital.data = { currencies: [] };
    if (!ob.stepShareCapital.data.currencies) ob.stepShareCapital.data.currencies = [];

    const c = ob.stepShareCapital.data.currencies[idx];
    if (c) {
        c[key] = val;
    }
}

async function obUpdateCurrencyField(idx, key, val) {
    const ob = state.onboarding || {};
    if (!ob.stepShareCapital) ob.stepShareCapital = { data: { currencies: [] }, status: 'pending', documents: [] };
    if (!ob.stepShareCapital.data) ob.stepShareCapital.data = { currencies: [] };
    if (!ob.stepShareCapital.data.currencies) ob.stepShareCapital.data.currencies = [];

    const c = ob.stepShareCapital.data.currencies[idx];
    if (c) {
        c[key] = val;
    }

    // Auto-save the step data
    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/share_capital`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: ob.stepShareCapital.data,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) {
            console.error("Failed to save share capital step:", e);
        }
    }

    // Refresh UI only, do not auto-navigate during typing/inputs
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obToggleCurrencyCollapse(idx) {
    const ob = state.onboarding || {};
    if (ob.stepShareCapital && ob.stepShareCapital.data && ob.stepShareCapital.data.currencies) {
        const c = ob.stepShareCapital.data.currencies[idx];
        if (c) {
            c.isCollapsed = !c.isCollapsed;
            
            await ensureOnboardingRecord();
            if (state.onboardingId) {
                try {
                    const res = await fetch(`/api/onboarding/${state.onboardingId}/step/share_capital`, {
                        method: 'PATCH',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({
                            data: ob.stepShareCapital.data,
                            status: 'pending'
                        })
                    });
                    if (res.ok) {
                        state.onboarding = normalizeOnboardingData(await res.json());
                    }
                } catch (e) {}
            }
        }
    }
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
}

async function obAddCurrencySection() {
    const ob = state.onboarding || {};
    if (!ob.stepShareCapital) ob.stepShareCapital = { data: { currencies: [] }, status: 'pending', documents: [] };
    if (!ob.stepShareCapital.data) ob.stepShareCapital.data = { currencies: [] };
    if (!ob.stepShareCapital.data.currencies) ob.stepShareCapital.data.currencies = [];

    ob.stepShareCapital.data.currencies.push({
        currency: 'SGD',
        customCurrency: '',
        shareClass: 'Ordinary',
        numberOfShares: 0,
        shareCapitalAmount: 0,
        isCollapsed: false
    });

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/share_capital`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: ob.stepShareCapital.data,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) {}
    }
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obDeleteCurrencySection(idx) {
    const ob = state.onboarding || {};
    if (ob.stepShareCapital && ob.stepShareCapital.data && ob.stepShareCapital.data.currencies) {
        ob.stepShareCapital.data.currencies.splice(idx, 1);
        
        await ensureOnboardingRecord();
        if (state.onboardingId) {
            try {
                const res = await fetch(`/api/onboarding/${state.onboardingId}/step/share_capital`, {
                    method: 'PATCH',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        data: ob.stepShareCapital.data,
                        status: 'pending'
                    })
                });
                if (res.ok) {
                    state.onboarding = normalizeOnboardingData(await res.json());
                }
            } catch (e) {}
        }
    }
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

window.obRenderShareCapitalHtml = obRenderShareCapitalHtml;
window.obUpdateCurrencyField = obUpdateCurrencyField;
window.obToggleCurrencyCollapse = obToggleCurrencyCollapse;
window.obAddCurrencySection = obAddCurrencySection;
window.obDeleteCurrencySection = obDeleteCurrencySection;

function getShareholderAllocation(type, name, idx) {
    const ob = state.onboarding || {};
    const stepData = ob.stepShareCapital || {};
    const allocations = (stepData.data || {}).allocations || [];
    
    // Convert type
    const normalizedType = (type.toLowerCase().includes('individual') || type.includes('👤')) ? 'individual' : 'corporate';
    
    let searchName = (name || '').trim();
    if (!searchName) {
        const req = state.requirements || {};
        const reqShs = req.shareholders || [];
        const filtered = reqShs.filter(s => {
            const isInd = s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤')));
            return normalizedType === 'individual' ? isInd : !isInd;
        });
        if (filtered[idx]) {
            searchName = filtered[idx].name;
        }
    }
    
    if (!searchName) return null;
    
    const found = allocations.find(a => {
        const aType = (a.type || '').toLowerCase();
        const searchType = normalizedType.toLowerCase();
        const isTypeMatch = aType === searchType || 
                            (aType.includes('individual') && searchType.includes('individual')) ||
                            (aType.includes('corporate') && searchType.includes('corporate'));
        
        const aName = (a.name || '').trim().toLowerCase();
        const sName = searchName.trim().toLowerCase();
        return isTypeMatch && aName === sName;
    });
    if (found) {
        return {
            shares: found.numberOfShares,
            amount: found.shareCapitalAmount,
            currency: found.currency,
            shareClass: found.shareClass
        };
    }
    return null;
}

async function obIndividualShareholderSameAsDirectorCheckboxChange(idx, checked) {
    const stepKey = 'individual_shareholder';
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData || !stepData.data || !stepData.data.list || !stepData.data.list[idx]) return;

    const item = stepData.data.list[idx];
    item.sameAsDirector = checked;
    
    if (!checked) {
        item.selectedDirectorIdx = '';
        ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(key => {
            item[key] = '';
        });
        const docsField = stepData.documents || [];
        stepData.documents = docsField.filter(d => d.type !== `nric_${idx}` && d.type !== `address_proof_${idx}`);
    }

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
        } catch (e) {}
    }

    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obIndividualShareholderSameAsDirectorChange(idx, dirIdx) {
    const stepKey = 'individual_shareholder';
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData || !stepData.data || !stepData.data.list || !stepData.data.list[idx]) return;

    const item = stepData.data.list[idx];
    item.selectedDirectorIdx = String(dirIdx);

    if (dirIdx !== '') {
        const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
        const dirList = dirStep && state.onboarding[dirStep.field] ? (state.onboarding[dirStep.field].data.list || []) : [];
        const dirItem = dirList[dirIdx];
        if (dirItem) {
            ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(key => {
                item[key] = dirItem[key] || '';
            });

            const dirDocs = (state.onboarding[dirStep.field] || {}).documents || [];
            const dirNric = dirDocs.find(d => d.type === `nric_${dirIdx}`);
            const dirAddr = dirDocs.find(d => d.type === `address_proof_${dirIdx}`);
            
            const currentDocs = stepData.documents || [];
            const filteredDocs = currentDocs.filter(d => d.type !== `nric_${idx}` && d.type !== `address_proof_${idx}`);

            if (dirNric) {
                filteredDocs.push({
                    ...dirNric,
                    id: "DOC-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                    type: `nric_${idx}`
                });
            }
            if (dirAddr) {
                filteredDocs.push({
                    ...dirAddr,
                    id: "DOC-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                    type: `address_proof_${idx}`
                });
            }
            stepData.documents = filteredDocs;
        }
    } else {
        item.selectedDirectorIdx = '';
        ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(key => {
            item[key] = '';
        });
        const currentDocs = stepData.documents || [];
        stepData.documents = currentDocs.filter(d => d.type !== `nric_${idx}` && d.type !== `address_proof_${idx}`);
    }

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
        } catch (e) {}
    }

    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

function obIdNumberInputHandler(input) {
    const originalValue = input.value;
    const sanitized = originalValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (originalValue !== sanitized) {
        input.value = sanitized;
    }
}

function clearOcrFieldsForDoc(stepKey, docType, data) {
    if (!data) return;
    if (stepKey === 'director_details') {
        if (docType === 'nric') {
            ['fullName', 'idNumber', 'nationality', 'gender', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(k => data[k] = '');
            data.disqualificationAcknowledge = false;
        } else if (docType === 'address_proof') {
            data.residentialAddress = '';
        }
    } else if (stepKey === 'individual_shareholder') {
        if (docType === 'nric') {
            ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(k => data[k] = '');
            data.sameAsDirector = false;
        } else if (docType === 'address_proof') {
            data.residentialAddress = '';
        }
    } else if (stepKey === 'corporate_shareholder') {
        if (docType === 'bizfile') {
            ['companyName', 'uen', 'dateOfIncorporation', 'registeredAddress'].forEach(k => data[k] = '');
        }
    } else if (stepKey === 'corporate_rep') {
        if (docType === 'nric') {
            ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile'].forEach(k => data[k] = '');
        } else if (docType === 'address_proof') {
            data.residentialAddress = '';
        }
    }
}

async function obClearMultiItemDoc(stepKey, docTypeWithIdx, idx) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData) return;

    const currentDocs = stepData.documents || [];
    stepData.documents = currentDocs.filter(d => d.type !== docTypeWithIdx);

    const docType = docTypeWithIdx.split('_')[0];
    const list = stepData.data.list || [];
    const item = list[idx];
    if (item) {
        clearOcrFieldsForDoc(stepKey, docType, item);
    }

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) {
            console.error("Failed to save step after clearing doc:", e);
        }
    }

    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obClearDoc(stepKey, docType) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData) return;

    const currentDocs = stepData.documents || [];
    stepData.documents = currentDocs.filter(d => d.type !== docType);

    clearOcrFieldsForDoc(stepKey, docType, stepData.data);

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) {
            console.error("Failed to save step after clearing doc:", e);
        }
    }

    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

