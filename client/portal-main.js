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

    // Show global loading state during initial hydration
    const view = document.getElementById('main-view');
    if (view) {
        view.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:120px 20px; width:100%; height:100%;">
                <div style="width:48px; height:48px; border:4px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:global-spin 1s linear infinite;"></div>
                <div style="margin-top:20px; font-family:'Outfit', sans-serif; font-size:16px; font-weight:600; color:#475569;">Initializing Workspace...</div>
                <style>@keyframes global-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
    }

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
        const promises = [
            fetch(`/api/clients/${state.user.id}/services`).then(async sRes => {
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
            }),
            fetch('/api/blogs').then(async bRes => {
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
                    throw new Error("REST API blogs offline");
                }
            }).catch(blogErr => {
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
                    } catch (e) {
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
            }),
            fetchNotifications(),
            fetch(`/api/clients/${state.user.id}/invoices`).then(async iRes => {
                if (iRes.ok) state.invoices = await iRes.json();
            }),
            fetch('/api/kyc').then(async kRes => {
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
            }),
            fetch('/api/catalog').then(async cRes => {
                if (cRes.ok) state.catalog = await cRes.json();
            }),
            fetch('/api/compliance').then(async cpRes => {
                if (cpRes.ok) {
                    const cpList = await cpRes.json();
                    state.compliance = cpList.find(c => c.clientId === state.user.id);
                }
            }),
            fetch('/api/static-content?portal=client').then(async scRes => {
                if (scRes.ok) state.staticContent = await scRes.json();
            }),
            fetch('/api/onboarding-config/published').then(async osRes => {
                try {
                    if (osRes.ok) {
                        const osData = await osRes.json();
                        if (osData && osData.length > 0) {
                            ONBOARDING_STEPS = osData;
                        }
                    }
                } catch (osErr) {
                    console.error('Error parsing onboarding steps configuration:', osErr);
                }
            })
        ];

        await Promise.allSettled(promises);
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
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        const res = await fetch(`/api/onboarding/client/${state.user.id}/status?_t=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            state.portalActivated = data.portalActivated === true;
            state.onboardingStatus = data.status || 'not_started';
            state.onboardingProgress = data.progressPercent || 0;
            state.onboardingId = data.onboardingId;
        }
    } catch (e) {
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

    const existing = document.getElementById('portal-freeze-banner');
    if (existing) {
        existing.remove();
    }
}

function obStartOnboarding() {
    state.activeObStepKey = 'document_checklist';
    switchTab('onboarding');
}

function obSetShareholderTab(tabKey) {
    state.activeShareholderTab = tabKey;
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
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
                <button onclick="obStartOnboarding()" style="padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#fff;border:none;border-radius:14px;font-family:Outfit,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(59,130,246,0.3);">
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
    switch (tab) {
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

    const isForeigner = state.onboarding && state.onboarding.journeyType === 'FOREIGNER';
    let docs = step.requiredDocs || [];

    if (stepKey === 'director_details' && isForeigner) {
        if (data && data.source === 'globalisor') {
            return []; // Nominee has no uploads
        }
        if (data && data.idType === 'foreign') {
            return [
                { type: 'passport', label: 'Passport Copy' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
            ];
        } else {
            return [
                { type: 'nric', label: 'NRIC' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement' }
            ];
        }
    }

    if (stepKey === 'individual_shareholder' && isForeigner) {
        if (data && (data.sameAsDirector === true || data.sameAsDirector === 'true')) {
            return [];
        }
        const st = data ? String(data.shareholderType || '').trim().toLowerCase() : '';
        const isLocal = st === 'local';
        const isForeignerSh = st === 'foreigner';
        if (isLocal) {
            return [
                { type: 'nric', label: 'NRIC' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
            ];
        } else if (isForeignerSh) {
            return [
                { type: 'passport', label: 'Passport' },
                { type: 'address_proof', label: 'Utility Bill / Bank Statement / Mobile Bill' }
            ];
        } else {
            return [];
        }
    }

    if (stepKey === 'corporate_shareholder' && isForeigner) {
        const isSG = data && ((data.countryOfIncorporation || '').trim().toLowerCase() === 'singapore' || (data.countryOfIncorporation || '').trim().toLowerCase() === 'sg');
        if (isSG) {
            return [
                { type: 'bizfile', label: 'BizFile' },
                { type: 'constitution', label: 'Constitution' },
                { type: 'supporting_docs', label: 'Additional Supporting Document', required: false }
            ];
        } else {
            return [
                { type: 'cert_incorporation', label: 'Certificate of Incorporation (Non-Singapore Entity)' },
                { type: 'constitution', label: 'Shareholding Structure' },
                { type: 'supporting_docs', label: 'Additional Supporting Document 1', required: false },
                { type: 'supporting_docs_2', label: 'Additional Supporting Document 2', required: false }
            ];
        }
    }

    if (stepKey === 'corporate_rep' && isForeigner) {
        return [
            { type: 'nric', label: 'Passport Copy' },
            { type: 'address_proof', label: 'Address Proof' }
        ];
    }

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

    const isForeigner = state.onboarding && state.onboarding.journeyType === 'FOREIGNER';
    let fields = step.manualFields || [];

    if (stepKey === 'director_details' && isForeigner) {
        if (data && data.source === 'globalisor') {
            return []; // Nominee has no fields
        }
        // Always remove these checkboxes for all directors in foreigner journey
        fields = fields.filter(f => !['useDifferentAddress', 'alternativeAddress', 'disqualificationAcknowledge'].includes(f.key));

        const isLocal = data && data.idType === 'local';
        if (!isLocal) {
            // Foreign Director
            fields = fields.map(f => {
                if (f.key === 'idNumber') {
                    return { ...f, label: 'ID Number' };
                }
                return f;
            });
            if (!fields.some(f => f.key === 'passportExpiry')) {
                fields.push({ key: 'passportExpiry', label: 'Passport Expiry Date', type: 'date' });
            }
        } else {
            // Local Director
            fields = fields.map(f => {
                if (f.key === 'idNumber') {
                    return { ...f, label: 'NRIC' };
                }
                return f;
            });
        }
    }

    if (stepKey === 'individual_shareholder' && isForeigner) {
        if (!fields.some(f => f.key === 'shareholderType')) {
            fields = [{ key: 'shareholderType', label: 'Shareholder Type', type: 'select', options: ['Select', 'Local', 'Foreigner'], mandatory: true }, ...fields];
        }
        fields = fields.map(f => {
            if (f.key === 'idNumber') {
                const isLocal = data && data.shareholderType === 'Local';
                const isForeignerSh = data && data.shareholderType === 'Foreigner';
                let labelVal = 'NRIC / FIN';
                if (isLocal) labelVal = 'NRIC';
                if (isForeignerSh) labelVal = 'ID Number';
                return { ...f, label: labelVal };
            }
            return f;
        });
    }

    if (stepKey === 'corporate_rep' && isForeigner) {
        // do not ask for NRIC/FIN, only Passport. Rename label.
        fields = fields.map(f => {
            if (f.key === 'idNumber') {
                return { ...f, label: 'Passport Number' };
            }
            return f;
        });
        if (!fields.some(f => f.key === 'passportExpiry')) {
            fields.push({ key: 'passportExpiry', label: 'Passport Expiry Date', type: 'date' });
        }
    }

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
    
    // Explicit mappings for standard keys to match portal-main.js step fields
    const explicitMappings = {
        'document_checklist': 'stepDocumentChecklist',
        'director_details': 'step2DirectorDetails',
        'share_capital': 'stepShareCapital',
        'shareholder_details': 'stepShareholderDetails',
        'individual_shareholder': 'step3IndividualShareholder',
        'corporate_shareholder': 'step4CorporateShareholder',
        'ubo': 'step5UBO',
        'corporate_rep': 'step6CorporateRep',
        'final_declaration': 'step7FinalDeclaration'
    };

    if (ob.dynamicSteps) {
        Object.entries(ob.dynamicSteps).forEach(([key, step]) => {
            const targetKey = explicitMappings[key] || ('step' + key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (m, c) => c.toUpperCase()));
            ob[targetKey] = step;
        });
    }

    // Ensure standard keys are initialized if not present
    Object.values(explicitMappings).forEach(field => {
        if (!ob[field]) {
            ob[field] = { data: { list: [] }, status: 'pending', documents: [] };
        }
        if (!ob[field].data) {
            ob[field].data = { list: [] };
        }
        if (!ob[field].data.list) {
            ob[field].data.list = [];
        }
        if (!ob[field].documents) {
            ob[field].documents = [];
        }
        
        // Sync percentages for individual and corporate shareholders
        if ((field === 'step3IndividualShareholder' || field === 'step4CorporateShareholder') && ob[field].data.list) {
            ob[field].data.list.forEach(item => {
                if (item.numberOfSharesPct && !item.shareCapitalAmountPct) {
                    item.shareCapitalAmountPct = item.numberOfSharesPct;
                } else if (item.shareCapitalAmountPct && !item.numberOfSharesPct) {
                    item.numberOfSharesPct = item.shareCapitalAmountPct;
                }
            });
        }
    });

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
        key: 'shareholder_details',
        field: 'stepShareholderDetails',
        title: 'Shareholder Details',
        icon: 'users',
        description: 'Collect tabular details for all company shareholders.',
        requiredDocs: [],
        manualFields: []
    },
    {
        key: 'individual_shareholder',
        field: 'step3IndividualShareholder',
        title: 'Individual Shareholder Details',
        icon: 'user-check',
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
            { key: 'shareCapitalAmountPct', label: 'Share Capital Amount (%)', type: 'number' },
            { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number', readonly: true },
            { key: 'numberOfSharesPct', label: 'Number of Shares (%)', type: 'number' },
            { key: 'numberOfShares', label: 'Number of Shares', type: 'number', readonly: true },
            { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
            { key: 'uboDeclaration', label: 'Is the Shareholder the Ultimate Beneficial Owner?', type: 'select', options: ['Select', 'No', 'Yes'] },
            { key: 'isNominee', label: 'Is the shareholder a nominee shareholder?', type: 'checkbox' }
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
        extractedFields: ['companyName', 'uen', 'dateOfIncorporation', 'registeredAddress'],
        manualFields: [
            { key: 'companyName', label: 'Company Name', type: 'text' },
            { key: 'uen', label: 'UEN / Reg Number', type: 'text' },
            { key: 'dateOfIncorporation', label: 'Date of Incorporation', type: 'date' },
            { key: 'registeredAddress', label: 'Registered Address', type: 'text' },
            { key: 'currency', label: 'Currency', type: 'select', options: ['SGD', 'USD'] },
            { key: 'shareClass', label: 'Share Class', type: 'select', options: ['Select', 'Ordinary', 'Preference'] },
            { key: 'shareCapitalAmountPct', label: 'Share Capital Amount (%)', type: 'number' },
            { key: 'shareCapitalAmount', label: 'Share Capital Amount', type: 'number', readonly: true },
            { key: 'numberOfSharesPct', label: 'Number of Shares (%)', type: 'number' },
            { key: 'numberOfShares', label: 'Number of Shares', type: 'number', readonly: true },
            { key: 'ownershipPercentage', label: 'Ownership % (auto-calculated)', type: 'number', readonly: true },
            { key: 'uboDeclaration', label: 'Is the Shareholder the Ultimate Beneficial Owner?', type: 'select', options: ['No', 'Yes'] },
            { key: 'anyAdditionalController', label: 'Any Additional Controller?', type: 'checkbox' },
            { key: 'isNominee', label: 'Is the shareholder a nominee shareholder?', type: 'checkbox' }
        ],
        dynamicSection: true,
        dynamicCountKey: 'corporateShareholderCount'
    },
    {
        key: 'corporate_rep',
        field: 'step6CorporateRep',
        title: 'Corporate Representative',
        icon: 'user-cog',
        description: 'Upload Passport and Address Proof for all corporate representatives.',
        requiredDocs: [
            { type: 'nric', label: 'Passport Copy' },
            { type: 'address_proof', label: 'Address Proof' }
        ],
        extractedFields: ['fullName', 'nationality', 'dateOfBirth', 'passportExpiry'],
        manualFields: [
            { key: 'fullName', label: 'Full Legal Name', type: 'text' },
            { key: 'nationality', label: 'Nationality', type: 'nationality' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
            { key: 'email', label: 'Email Address', type: 'email' },
            { key: 'mobile', label: 'Mobile Number', type: 'phone' },
            { key: 'passportExpiry', label: 'Passport Expiry Date', type: 'date' }
        ],
        dynamicSection: true,
        dynamicCountKey: 'corporateRepCount'
    },
    {
        key: 'rons',
        field: 'stepRons',
        title: 'Register of Nominee Shareholders (RONS)',
        icon: 'users-cog',
        description: 'Declare nominee shareholders and capture their details and required documents.',
        requiredDocs: [],
        manualFields: []
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
    // Optimistic/Cached Render: If onboarding details are already loaded from previous page views, render instantly!
    const hasCache = state.onboarding && ONBOARDING_STEPS.length > 0;
    if (hasCache) {
        drawOnboardingLayout(container);
        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
    } else {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:100px 20px; width:100%;">
                <div style="width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:ob-spin 1s linear infinite;"></div>
                <div style="margin-top:16px; font-family:'Outfit', sans-serif; font-size:15px; font-weight:600; color:#64748b;">Loading Onboarding Details...</div>
                <style>@keyframes ob-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
    }

    // Fetch latest onboarding data
    let ob = null;
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}?_t=${Date.now()}`);
        if (res.ok) ob = await res.json();
    } catch (e) { }

    // Store in global state
    state.onboarding = normalizeOnboardingData(ob || {});
    state.onboardingId = ob && ob.id ? ob.id : null;

    // Fetch steps matching client's journeyType
    const journey = state.onboarding.journeyType || 'LOCAL';
    try {
        const osRes = await fetch(`/api/onboarding-config/published?journeyType=${journey}`);
        if (osRes.ok) {
            const osData = await osRes.json();
            if (osData && osData.length > 0) {
                ONBOARDING_STEPS = osData;
            }
        }
    } catch (osErr) {
        console.error('Error fetching onboarding steps configuration:', osErr);
    }

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
                numberOfShares: reqCapital.numShares ? String(reqCapital.numShares) : '',
                shareCapitalAmount: reqCapital.issued ? String(reqCapital.issued) : '',
                paidUpShareCapital: reqCapital.paidUp ? String(reqCapital.paidUp) : ''
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
                        passportExpiry: existing.passportExpiry || d.passportExpiry || '',
                        disqualificationAcknowledge: existing.disqualificationAcknowledge || false,
                        idType: existing.idType || d.idType || 'local',
                        source: existing.source || d.source || 'self'
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
                        passportExpiry: existing.passportExpiry || s.passportExpiry || '',
                        totalShares: existing.totalShares || s.totalShares || '',
                        totalShareCapital: existing.totalShareCapital || s.totalShareCapital || '',
                        currency: existing.currency || s.currency || 'Select',
                        shareClass: existing.shareClass || s.shareClass || 'Select',
                        numberOfShares: existing.numberOfShares || s.shares || '',
                        numberOfSharesPct: existing.numberOfSharesPct || '',
                        shareCapitalAmount: existing.shareCapitalAmount || s.percent || '',
                        shareCapitalAmountPct: existing.shareCapitalAmountPct || '',
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

        const repStep = ONBOARDING_STEPS.find(s => s.key === 'corporate_rep');
        const repStepField = repStep ? repStep.field : null;
        if (repStepField) {
            if (!state.onboarding[repStepField]) {
                state.onboarding[repStepField] = { data: { list: [] }, status: 'pending', documents: [] };
            }
            const currentList = state.onboarding[repStepField].data.list || [];
            if (currentList.length === 0) {
                state.onboarding[repStepField].data.list = [{}];
                changed = true;
            }
        }

        if (changed && state.onboardingId) {
            try {
                const stepsToSync = ['share_capital', 'director_details', 'individual_shareholder', 'corporate_shareholder', 'corporate_rep'];
                for (const stepKey of stepsToSync) {
                    const targetStep = ONBOARDING_STEPS.find(s => s.key === stepKey);
                    if (targetStep && targetStep.field && state.onboarding[targetStep.field]) {
                        await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
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

    drawOnboardingLayout(container);

    // Render active step form
    const formWorkspace = document.getElementById('ob-form-workspace');
    if (formWorkspace) {
        renderActiveStepForm(formWorkspace);
    }
}

function drawOnboardingLayout(container) {
    const ob = state.onboarding || {};
    const progress = ob.progressPercent || 0;
    const isActivated = ob.portalActivated;
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
                min-width: 100px !important;
                flex: 1 1 0px !important;
                flex-shrink: 1 !important;
                padding: 10px 8px !important;
                gap: 6px !important;
                border-radius: 12px !important;
            }
            .wizard-step-title {
                font-size: 11px !important;
                white-space: normal !important;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.25 !important;
            }
            .wizard-step-icon {
                width: 24px !important;
                height: 24px !important;
                font-size: 11px !important;
            }
            .wizard-step-badge {
                padding: 1px 4px !important;
                font-size: 7px !important;
            }
        }
    </style>

    <style>
        body { overflow-y: scroll; }
        .wizard-layout-row { display: flex; flex-direction: column; gap: 24px; margin-top: 10px; width: 100%; }
        .wizard-main-col { display: flex; flex-direction: column; gap: 24px; width: 100%; min-width: 0; }
    </style>
    <div class="wizard-layout-row">
        <!-- Main Column (Progress Banner + Steps Stepper + Form Panel) -->
        <div class="wizard-main-col">
            <!-- Progress Banner -->
            ${isActivated ? `
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:20px;padding:28px;margin-bottom:0;display:flex;align-items:center;gap:20px;box-shadow: 0 10px 25px rgba(22, 163, 74, 0.05);">
                <div style="width:54px;height:54px;border-radius:16px;background:#16a34a;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow: 0 8px 20px rgba(22, 163, 74, 0.2);">
                    <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
                </div>
                <div>
                    <div style="font-family:Outfit,sans-serif;font-size:20px;font-weight:800;color:#14532d;">🎉 Your Client Portal is Fully Activated!</div>
                    <div style="font-size:13px;color:#166534;margin-top:4px;line-height:1.6;">All onboarding steps are completed and approved. Explore all platform modules now.</div>
                </div>
                <button onclick="switchTab('home')" style="margin-left:auto;padding:12px 24px;background:#16a34a;color:#fff;border:none;border-radius:14px;font-family:Outfit,sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow: 0 4px 15px rgba(22,163,74,0.3);">Go to Dashboard →</button>
            </div>` : (allSubmitted ? `
            <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:20px;padding:28px;margin-bottom:0;display:flex;align-items:center;gap:20px;box-shadow: 0 10px 25px rgba(217, 119, 6, 0.05);">
                <div style="width:54px;height:54px;border-radius:16px;background:#d97706;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow: 0 8px 20px rgba(217, 119, 6, 0.2);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                    <div style="font-family:Outfit,sans-serif;font-size:18px;font-weight:800;color:#92400e;">⏳ Onboarding Submitted & Under Review</div>
                    <div style="font-size:13px;color:#b45309;margin-top:4px;line-height:1.6;">Your application is currently being verified and reviewed by the Globalisor team. You will receive full access to the portal once the review is completed and approved.</div>
                </div>
            </div>` : `
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-bottom:0;display:flex;align-items:center;justify-content:space-between;gap:32px;box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); width:100%; box-sizing:border-box;">
                <div style="display: flex; align-items: center; gap: 24px; flex-grow: 1; width:100%;">
                    <div style="width: 56px; height: 56px; background-color: #eff6ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#0d6efd" stroke="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="8 12 11 15 16 9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
                    </div>
                    
                    <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px; min-width:0;">
                        <div style="font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 500; color: #334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            Complete all steps to submit your onboarding for verification and unlock full access.
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div class="ob-prog-bar" style="flex-grow: 1; height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin: 0; border: none; box-shadow: none;">
                                <div id="ob-progress-fill" class="ob-prog-fill" style="width:${progress}%; height: 100%; background: #0d6efd; border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <span id="ob-progress-percent" style="font-size:28px;font-weight:800;color:#0d6efd;font-family: 'Outfit', sans-serif; flex-shrink: 0; min-width: 60px; text-align: right;">${progress}%</span>
                </div>
            </div>`)}

            <!-- Horizontal Stepper Progress Cards at the Top -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); width: 100%; box-sizing:border-box;">
                <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">Your Progress</div>
                <div class="wizard-sidebar" id="ob-wizard-sidebar" style="display: flex; gap: 12px; overflow-x: auto; width: 100%; box-sizing: border-box;">
                    ${ONBOARDING_STEPS.map((step, idx) => {
                        return `
                        <div class="wizard-step-tab" id="tab-${step.key}" onclick="selectObStep('${step.key}')" style="min-width: 180px; flex: 1; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; box-sizing: border-box;">
                            <div class="wizard-step-icon" id="icon-${step.key}" style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; background: #eff6ff; color: #3b82f6; flex-shrink: 0;">
                                <span style="font-weight: 800;">${idx + 1}</span>
                            </div>
                            <div style="flex-grow: 1; min-width: 0;">
                                <div class="wizard-step-title" id="title-${step.key}" style="font-size: 12px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${step.title}</div>
                                <div class="wizard-step-badge" id="badge-${step.key}" style="font-size: 8px; font-weight: bold; margin-top: 2px;">Not started</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            
            <!-- Main Form Panel -->
            <div class="wizard-content" id="ob-form-workspace" style="width: 100%; box-sizing: border-box;">
                <!-- Active step form rendered dynamically -->
            </div>
        </div>
    </div>
    `;
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
        if (!data.isConfirmed) {
            errors.push("Please confirm the share capital details by checking the box at the bottom.");
        }
        currencies.forEach((c, idx) => {
            const currencyCode = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
            if (!currencyCode) {
                errors.push(`Section #${idx + 1}: Currency is required.`);
            }

            const numShares = parseFloat(c.numberOfShares);
            const amount = parseFloat(c.shareCapitalAmount);

            if (isNaN(numShares) || numShares <= 0) {
                errors.push(`Section #${idx + 1} (${currencyCode} - ${c.shareClass}): Number of shares must be a positive number.`);
            }
            if (isNaN(amount) || amount <= 0) {
                errors.push(`Section #${idx + 1} (${currencyCode} - ${c.shareClass}): Issued Share Capital must be a positive number.`);
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
                    if (reqDoc.required === false) return;
                    const docTypeWithIdx = `${reqDoc.type}_${idx}`;
                    if (stepKey === 'corporate_shareholder') {
                        const country = (item.countryOfIncorporation || '').trim().toLowerCase();
                        const isSG = country === 'singapore' || country === 'sg';
                        if (isSG) {
                            if (reqDoc.type !== 'bizfile' && reqDoc.type !== 'constitution') return;
                        } else {
                            if (reqDoc.type === 'bizfile') return;
                        }
                    }
                    if (stepKey === 'individual_shareholder') {
                        if (item.sameAsDirector === true || item.sameAsDirector === 'true') {
                            return; // Exempt all documents if they are mapped to an existing director
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
                    if (stepKey === 'corporate_rep' && field.key === 'passportExpiry' && val) {
                        const expiryDate = new Date(val);
                        if (!isNaN(expiryDate.getTime())) {
                            const threeMonthsLater = new Date();
                            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                            if (expiryDate < threeMonthsLater) {
                                errors.push(`Entry #${idx + 1}: Passport is expiring within 3 months. Please upload a valid passport.`);
                            }
                        }
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
                const shShares = parseFloat(String(sh.numberOfShares || '0').replace(/,/g, '')) || 0;
                const shCapital = parseFloat(String(sh.shareCapitalAmount || '0').replace(/,/g, '')) || 0;
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

                    const mShares = parseFloat(String(masterItem.numberOfShares || '0').replace(/,/g, '')) || 0;
                    const mCapital = parseFloat(String(masterItem.shareCapitalAmount || '0').replace(/,/g, '')) || 0;

                    if (totalSharesAllocated > mShares + 0.001) {
                        errors.push(`Allocation error (${shCurr} - ${shClass}): Total allocated shares (${totalSharesAllocated.toLocaleString()}) exceeds the master limit (${mShares.toLocaleString()}) configured in Share Capital Details.`);
                    }
                    if (totalCapitalAllocated > mCapital + 0.001) {
                        errors.push(`Allocation error (${shCurr} - ${shClass}): Total allocated share capital (${totalCapitalAllocated.toLocaleString()}) exceeds the master limit (${mCapital.toLocaleString()}) configured in Share Capital Details.`);
                    }
                }
            });
        }
    } else if (stepKey === 'rons') {
        const hasNom = data.hasNominee || 'No';
        if (hasNom === 'Yes') {
            const nomineeList = data.nomineeList || [];
            if (nomineeList.length === 0) {
                errors.push("At least one nominee shareholder details must be provided if Yes is selected.");
            }
            nomineeList.forEach((nom, idx) => {
                if (!nom.shareholderId) {
                    errors.push(`Nominee #${idx + 1}: Select Shareholder is required.`);
                } else {
                    const shType = nom.type;
                    if (!nom.email || nom.email.trim() === '') {
                        errors.push(`Nominee #${idx + 1}: Email Address is required.`);
                    }
                    if (!nom.mobile || nom.mobile.trim() === '') {
                        errors.push(`Nominee #${idx + 1}: Contact Number is required.`);
                    }
                    if (shType === 'individual') {
                        const idDoc = docs.some(d => d.type === `rons_id_proof_${idx}`);
                        if (!idDoc) errors.push(`Nominee #${idx + 1}: ID Proof document is required.`);
                        const addrDoc = docs.some(d => d.type === `rons_addr_proof_${idx}`);
                        if (!addrDoc) errors.push(`Nominee #${idx + 1}: Address Proof document is required.`);
                    } else if (shType === 'corporate') {
                        const bizDoc = docs.some(d => d.type === `rons_bizfile_${idx}`);
                        if (!bizDoc) errors.push(`Nominee #${idx + 1}: BizFile document is required.`);
                        const constDoc = docs.some(d => d.type === `rons_constitution_${idx}`);
                        if (!constDoc) errors.push(`Nominee #${idx + 1}: Constitution document is required.`);
                    }
                }
            });
        }
        return errors;
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
                        const isSG = country === 'singapore' || country === 'sg';
                        isReq = isSG ? (doc.type === 'bizfile' || doc.type === 'constitution') : (doc.type === 'cert_incorporation' || doc.type === 'constitution');
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

async function selectObStep(stepKey, isFromContinue = false) {
    let actualStepKey = stepKey;
    const ob = state.onboarding || {};
    
    if (isFromContinue) {
        while (true) {
            const step = ONBOARDING_STEPS.find(s => s.key === actualStepKey);
            if (!step) break;
            
            const isAutomaticSection = ['individual_shareholder', 'corporate_shareholder', 'corporate_rep', 'rons'].includes(actualStepKey);
            if (isAutomaticSection) {
                const stepField = step.field;
                const stepData = ob[stepField] || { status: 'pending', data: {}, documents: [] };
                const errors = validateStep(actualStepKey, ob);
                if (errors.length === 0) {
                    stepData.status = 'completed';
                    ob[stepField] = stepData;
                    
                    const nextIdx = ONBOARDING_STEPS.findIndex(s => s.key === actualStepKey) + 1;
                    if (nextIdx < ONBOARDING_STEPS.length) {
                        actualStepKey = ONBOARDING_STEPS[nextIdx].key;
                        continue;
                    }
                }
            }
            break;
        }
    }

    const currentIdx = ONBOARDING_STEPS.findIndex(s => s.key === state.activeObStepKey);
    const targetIdx = ONBOARDING_STEPS.findIndex(s => s.key === actualStepKey);
    if (currentIdx !== -1 && targetIdx > currentIdx) {
        const errors = validateStep(state.activeObStepKey, ob);
        if (errors.length > 0) {
            if (!state.showObErrors) state.showObErrors = {};
            state.showObErrors[state.activeObStepKey] = true;
            updateWizardUIFeedback();
            return;
        }
    }
    if (!state.showObErrors) state.showObErrors = {};
    state.showObErrors[actualStepKey] = false;

    const idx = ONBOARDING_STEPS.findIndex(s => s.key === actualStepKey);
    if (isStepLocked(idx, state.onboarding)) {
        alert("Step Locked! Please complete the previous steps in order before proceeding.");
        return;
    }

    // Save any pending input immediately before switching
    await forceSaveActiveStep();

    state.activeObStepKey = actualStepKey;

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
    { name: 'Andorra', code: 'AD', nationality: 'Andorran', dial: '+376', maxLen: 6 },
    { name: 'Angola', code: 'AO', nationality: 'Angolan', dial: '+244', maxLen: 9 },
    { name: 'Antigua and Barbuda', code: 'AG', nationality: 'Antiguan/Barbudan', dial: '+1-268', maxLen: 7 },
    { name: 'Argentina', code: 'AR', nationality: 'Argentine', dial: '+54', maxLen: 10 },
    { name: 'Armenia', code: 'AM', nationality: 'Armenian', dial: '+374', maxLen: 8 },
    { name: 'Australia', code: 'AU', nationality: 'Australian', dial: '+61', maxLen: 9 },
    { name: 'Austria', code: 'AT', nationality: 'Austrian', dial: '+43', maxLen: 10 },
    { name: 'Azerbaijan', code: 'AZ', nationality: 'Azerbaijani', dial: '+994', maxLen: 9 },
    { name: 'Bahamas', code: 'BS', nationality: 'Bahamian', dial: '+1-242', maxLen: 7 },
    { name: 'Bahrain', code: 'BH', nationality: 'Bahraini', dial: '+973', maxLen: 8 },
    { name: 'Bangladesh', code: 'BD', nationality: 'Bangladeshi', dial: '+880', maxLen: 10 },
    { name: 'Barbados', code: 'BB', nationality: 'Barbadian', dial: '+1-246', maxLen: 7 },
    { name: 'Belarus', code: 'BY', nationality: 'Belarusian', dial: '+375', maxLen: 9 },
    { name: 'Belgium', code: 'BE', nationality: 'Belgian', dial: '+32', maxLen: 9 },
    { name: 'Belize', code: 'BZ', nationality: 'Belizean', dial: '+501', maxLen: 7 },
    { name: 'Benin', code: 'BJ', nationality: 'Beninese', dial: '+229', maxLen: 8 },
    { name: 'Bhutan', code: 'BT', nationality: 'Bhutanese', dial: '+975', maxLen: 8 },
    { name: 'Bolivia', code: 'BO', nationality: 'Bolivian', dial: '+591', maxLen: 8 },
    { name: 'Bosnia and Herzegovina', code: 'BA', nationality: 'Bosnian/Herzegovinian', dial: '+387', maxLen: 8 },
    { name: 'Botswana', code: 'BW', nationality: 'Motswana', dial: '+267', maxLen: 8 },
    { name: 'Brazil', code: 'BR', nationality: 'Brazilian', dial: '+55', maxLen: 11 },
    { name: 'Brunei', code: 'BN', nationality: 'Bruneian', dial: '+673', maxLen: 7 },
    { name: 'Bulgaria', code: 'BG', nationality: 'Bulgarian', dial: '+359', maxLen: 9 },
    { name: 'Burkina Faso', code: 'BF', nationality: 'Burkinabe', dial: '+226', maxLen: 8 },
    { name: 'Burundi', code: 'BI', nationality: 'Burundian', dial: '+257', maxLen: 8 },
    { name: 'Cabo Verde', code: 'CV', nationality: 'Cabo Verdean', dial: '+238', maxLen: 7 },
    { name: 'Cambodia', code: 'KH', nationality: 'Cambodian', dial: '+855', maxLen: 9 },
    { name: 'Cameroon', code: 'CM', nationality: 'Cameroonian', dial: '+237', maxLen: 9 },
    { name: 'Canada', code: 'CA', nationality: 'Canadian', dial: '+1', maxLen: 10 },
    { name: 'Central African Republic', code: 'CF', nationality: 'Central African', dial: '+236', maxLen: 8 },
    { name: 'Chad', code: 'TD', nationality: 'Chadian', dial: '+235', maxLen: 8 },
    { name: 'Chile', code: 'CL', nationality: 'Chilean', dial: '+56', maxLen: 9 },
    { name: 'China', code: 'CN', nationality: 'Chinese', dial: '+86', maxLen: 11 },
    { name: 'Colombia', code: 'CO', nationality: 'Colombian', dial: '+57', maxLen: 10 },
    { name: 'Comoros', code: 'KM', nationality: 'Comorian', dial: '+269', maxLen: 7 },
    { name: 'Congo', code: 'CG', nationality: 'Congolese', dial: '+242', maxLen: 9 },
    { name: 'Costa Rica', code: 'CR', nationality: 'Costa Rican', dial: '+506', maxLen: 8 },
    { name: 'Cote d\'Ivoire', code: 'CI', nationality: 'Ivorian', dial: '+225', maxLen: 10 },
    { name: 'Croatia', code: 'HR', nationality: 'Croatian', dial: '+385', maxLen: 9 },
    { name: 'Cuba', code: 'CU', nationality: 'Cuban', dial: '+53', maxLen: 8 },
    { name: 'Cyprus', code: 'CY', nationality: 'Cypriot', dial: '+357', maxLen: 8 },
    { name: 'Czech Republic', code: 'CZ', nationality: 'Czech', dial: '+420', maxLen: 9 },
    { name: 'Denmark', code: 'DK', nationality: 'Danish', dial: '+45', maxLen: 8 },
    { name: 'Djibouti', code: 'DJ', nationality: 'Djiboutian', dial: '+253', maxLen: 8 },
    { name: 'Dominica', code: 'DM', nationality: 'Dominican', dial: '+1-767', maxLen: 7 },
    { name: 'Dominican Republic', code: 'DO', nationality: 'Dominican', dial: '+1-809', maxLen: 7 },
    { name: 'Ecuador', code: 'EC', nationality: 'Ecuadorian', dial: '+593', maxLen: 9 },
    { name: 'Egypt', code: 'EG', nationality: 'Egyptian', dial: '+20', maxLen: 10 },
    { name: 'El Salvador', code: 'SV', nationality: 'Salvadoran', dial: '+503', maxLen: 8 },
    { name: 'Equatorial Guinea', code: 'GQ', nationality: 'Equatoguinean', dial: '+240', maxLen: 9 },
    { name: 'Eritrea', code: 'ER', nationality: 'Eritrean', dial: '+291', maxLen: 7 },
    { name: 'Estonia', code: 'EE', nationality: 'Estonian', dial: '+372', maxLen: 8 },
    { name: 'Ethiopia', code: 'ET', nationality: 'Ethiopian', dial: '+251', maxLen: 9 },
    { name: 'Eswatini', code: 'SZ', nationality: 'Swazi', dial: '+268', maxLen: 8 },
    { name: 'Fiji', code: 'FJ', nationality: 'Fijian', dial: '+679', maxLen: 7 },
    { name: 'Finland', code: 'FI', nationality: 'Finnish', dial: '+358', maxLen: 10 },
    { name: 'France', code: 'FR', nationality: 'French', dial: '+33', maxLen: 9 },
    { name: 'Gabon', code: 'GA', nationality: 'Gabonese', dial: '+241', maxLen: 7 },
    { name: 'Gambia', code: 'GM', nationality: 'Gambian', dial: '+220', maxLen: 7 },
    { name: 'Georgia', code: 'GE', nationality: 'Georgian', dial: '+995', maxLen: 9 },
    { name: 'Germany', code: 'DE', nationality: 'German', dial: '+49', maxLen: 11 },
    { name: 'Ghana', code: 'GH', nationality: 'Ghanaian', dial: '+233', maxLen: 9 },
    { name: 'Greece', code: 'GR', nationality: 'Greek', dial: '+30', maxLen: 10 },
    { name: 'Grenada', code: 'GD', nationality: 'Grenadian', dial: '+1-473', maxLen: 7 },
    { name: 'Guatemala', code: 'GT', nationality: 'Guatemalan', dial: '+502', maxLen: 8 },
    { name: 'Guinea', code: 'GN', nationality: 'Guinean', dial: '+224', maxLen: 9 },
    { name: 'Guyana', code: 'GY', nationality: 'Guyanese', dial: '+592', maxLen: 7 },
    { name: 'Haiti', code: 'HT', nationality: 'Haitian', dial: '+509', maxLen: 8 },
    { name: 'Honduras', code: 'HN', nationality: 'Honduran', dial: '+504', maxLen: 8 },
    { name: 'Hong Kong', code: 'HK', nationality: 'Chinese (Hong Kong)', dial: '+852', maxLen: 8 },
    { name: 'Hungary', code: 'HU', nationality: 'Hungarian', dial: '+36', maxLen: 9 },
    { name: 'Iceland', code: 'IS', nationality: 'Icelander', dial: '+354', maxLen: 7 },
    { name: 'India', code: 'IN', nationality: 'Indian', dial: '+91', maxLen: 10 },
    { name: 'Indonesia', code: 'ID', nationality: 'Indonesian', dial: '+62', maxLen: 12 },
    { name: 'Iran', code: 'IR', nationality: 'Iranian', dial: '+98', maxLen: 10 },
    { name: 'Iraq', code: 'IQ', nationality: 'Iraqi', dial: '+964', maxLen: 10 },
    { name: 'Ireland', code: 'IE', nationality: 'Irish', dial: '+353', maxLen: 9 },
    { name: 'Israel', code: 'IL', nationality: 'Israeli', dial: '+972', maxLen: 9 },
    { name: 'Italy', code: 'IT', nationality: 'Italian', dial: '+39', maxLen: 10 },
    { name: 'Jamaica', code: 'JM', nationality: 'Jamaican', dial: '+1-876', maxLen: 7 },
    { name: 'Japan', code: 'JP', nationality: 'Japanese', dial: '+81', maxLen: 11 },
    { name: 'Jordan', code: 'JO', nationality: 'Jordanian', dial: '+962', maxLen: 9 },
    { name: 'Kazakhstan', code: 'KZ', nationality: 'Kazakhstani', dial: '+7', maxLen: 10 },
    { name: 'Kenya', code: 'KE', nationality: 'Kenyan', dial: '+254', maxLen: 9 },
    { name: 'Kuwait', code: 'KW', nationality: 'Kuwaiti', dial: '+965', maxLen: 8 },
    { name: 'Kyrgyzstan', code: 'KG', nationality: 'Kyrgyz', dial: '+996', maxLen: 9 },
    { name: 'Laos', code: 'LA', nationality: 'Lao', dial: '+856', maxLen: 8 },
    { name: 'Latvia', code: 'LV', nationality: 'Latvian', dial: '+371', maxLen: 8 },
    { name: 'Lebanon', code: 'LB', nationality: 'Lebanese', dial: '+961', maxLen: 8 },
    { name: 'Lesotho', code: 'LS', nationality: 'Basotho', dial: '+266', maxLen: 8 },
    { name: 'Liberia', code: 'LR', nationality: 'Liberian', dial: '+231', maxLen: 7 },
    { name: 'Libya', code: 'LY', nationality: 'Libyan', dial: '+218', maxLen: 9 },
    { name: 'Liechtenstein', code: 'LI', nationality: 'Liechtensteiner', dial: '+423', maxLen: 7 },
    { name: 'Lithuania', code: 'LT', nationality: 'Lithuanian', dial: '+370', maxLen: 8 },
    { name: 'Luxembourg', code: 'LU', nationality: 'Luxembourgish', dial: '+352', maxLen: 9 },
    { name: 'Madagascar', code: 'MG', nationality: 'Malagasy', dial: '+261', maxLen: 9 },
    { name: 'Malawi', code: 'MW', nationality: 'Malawian', dial: '+265', maxLen: 9 },
    { name: 'Malaysia', code: 'MY', nationality: 'Malaysian', dial: '+60', maxLen: 11 },
    { name: 'Maldives', code: 'MV', nationality: 'Maldivian', dial: '+960', maxLen: 7 },
    { name: 'Mali', code: 'ML', nationality: 'Malian', dial: '+223', maxLen: 8 },
    { name: 'Malta', code: 'MT', nationality: 'Maltese', dial: '+356', maxLen: 8 },
    { name: 'Mauritania', code: 'MR', nationality: 'Mauritanian', dial: '+222', maxLen: 8 },
    { name: 'Mauritius', code: 'MU', nationality: 'Mauritian', dial: '+230', maxLen: 7 },
    { name: 'Mexico', code: 'MX', nationality: 'Mexican', dial: '+52', maxLen: 10 },
    { name: 'Moldova', code: 'MD', nationality: 'Moldovan', dial: '+373', maxLen: 8 },
    { name: 'Monaco', code: 'MC', nationality: 'Monégasque', dial: '+377', maxLen: 8 },
    { name: 'Mongolia', code: 'MN', nationality: 'Mongolian', dial: '+976', maxLen: 8 },
    { name: 'Montenegro', code: 'ME', nationality: 'Montenegrin', dial: '+382', maxLen: 8 },
    { name: 'Morocco', code: 'MA', nationality: 'Moroccan', dial: '+212', maxLen: 9 },
    { name: 'Mozambique', code: 'MZ', nationality: 'Mozambican', dial: '+258', maxLen: 9 },
    { name: 'Myanmar', code: 'MM', nationality: 'Burmese', dial: '+95', maxLen: 10 },
    { name: 'Namibia', code: 'NA', nationality: 'Namibian', dial: '+264', maxLen: 9 },
    { name: 'Nepal', code: 'NP', nationality: 'Nepalese', dial: '+977', maxLen: 10 },
    { name: 'Netherlands', code: 'NL', nationality: 'Dutch', dial: '+31', maxLen: 9 },
    { name: 'New Zealand', code: 'NZ', nationality: 'New Zealander', dial: '+64', maxLen: 9 },
    { name: 'Nicaragua', code: 'NI', nationality: 'Nicaraguan', dial: '+505', maxLen: 8 },
    { name: 'Niger', code: 'NE', nationality: 'Nigerien', dial: '+227', maxLen: 8 },
    { name: 'Nigeria', code: 'NG', nationality: 'Nigerian', dial: '+234', maxLen: 10 },
    { name: 'North Macedonia', code: 'MK', nationality: 'Macedonian', dial: '+389', maxLen: 8 },
    { name: 'Norway', code: 'NO', nationality: 'Norwegian', dial: '+47', maxLen: 8 },
    { name: 'Oman', code: 'OM', nationality: 'Omani', dial: '+968', maxLen: 8 },
    { name: 'Pakistan', code: 'PK', nationality: 'Pakistani', dial: '+92', maxLen: 10 },
    { name: 'Palestine', code: 'PS', nationality: 'Palestinian', dial: '+970', maxLen: 9 },
    { name: 'Panama', code: 'PA', nationality: 'Panamanian', dial: '+507', maxLen: 8 },
    { name: 'Papua New Guinea', code: 'PG', nationality: 'Papua New Guinean', dial: '+675', maxLen: 8 },
    { name: 'Paraguay', code: 'PY', nationality: 'Paraguayan', dial: '+595', maxLen: 9 },
    { name: 'Peru', code: 'PE', nationality: 'Peruvian', dial: '+51', maxLen: 9 },
    { name: 'Philippines', code: 'PH', nationality: 'Filipino', dial: '+63', maxLen: 10 },
    { name: 'Poland', code: 'PL', nationality: 'Polish', dial: '+48', maxLen: 9 },
    { name: 'Portugal', code: 'PT', nationality: 'Portuguese', dial: '+351', maxLen: 9 },
    { name: 'Qatar', code: 'QA', nationality: 'Qatari', dial: '+974', maxLen: 8 },
    { name: 'Romania', code: 'RO', nationality: 'Romanian', dial: '+40', maxLen: 9 },
    { name: 'Russia', code: 'RU', nationality: 'Russian', dial: '+7', maxLen: 10 },
    { name: 'Rwanda', code: 'RW', nationality: 'Rwandan', dial: '+250', maxLen: 9 },
    { name: 'Saint Kitts and Nevis', code: 'KN', nationality: 'Kittitian/Nevisian', dial: '+1-869', maxLen: 7 },
    { name: 'Saint Lucia', code: 'LC', nationality: 'Saint Lucian', dial: '+1-758', maxLen: 7 },
    { name: 'Samoa', code: 'WS', nationality: 'Samoan', dial: '+685', maxLen: 7 },
    { name: 'San Marino', code: 'SM', nationality: 'Sammarinese', dial: '+378', maxLen: 10 },
    { name: 'Saudi Arabia', code: 'SA', nationality: 'Saudi', dial: '+966', maxLen: 9 },
    { name: 'Senegal', code: 'SN', nationality: 'Senegalese', dial: '+221', maxLen: 9 },
    { name: 'Serbia', code: 'RS', nationality: 'Serbian', dial: '+381', maxLen: 9 },
    { name: 'Seychelles', code: 'SC', nationality: 'Seychellois', dial: '+248', maxLen: 7 },
    { name: 'Sierra Leone', code: 'SL', nationality: 'Sierra Leonean', dial: '+232', maxLen: 8 },
    { name: 'Singapore', code: 'SG', nationality: 'Singaporean', dial: '+65', maxLen: 8 },
    { name: 'Slovakia', code: 'SK', nationality: 'Slovak', dial: '+421', maxLen: 9 },
    { name: 'Slovenia', code: 'SI', nationality: 'Slovenian', dial: '+386', maxLen: 8 },
    { name: 'Solomon Islands', code: 'SB', nationality: 'Solomon Islander', dial: '+677', maxLen: 7 },
    { name: 'Somalia', code: 'SO', nationality: 'Somali', dial: '+252', maxLen: 8 },
    { name: 'South Africa', code: 'ZA', nationality: 'South African', dial: '+27', maxLen: 9 },
    { name: 'South Korea', code: 'KR', nationality: 'South Korean', dial: '+82', maxLen: 10 },
    { name: 'Spain', code: 'ES', nationality: 'Spanish', dial: '+34', maxLen: 9 },
    { name: 'Sri Lanka', code: 'LK', nationality: 'Sri Lankan', dial: '+94', maxLen: 9 },
    { name: 'Sudan', code: 'SD', nationality: 'Sudanese', dial: '+249', maxLen: 9 },
    { name: 'Suriname', code: 'SR', nationality: 'Surinamer', dial: '+597', maxLen: 7 },
    { name: 'Sweden', code: 'SE', nationality: 'Swedish', dial: '+46', maxLen: 9 },
    { name: 'Switzerland', code: 'CH', nationality: 'Swiss', dial: '+41', maxLen: 9 },
    { name: 'Syria', code: 'SY', nationality: 'Syrian', dial: '+963', maxLen: 9 },
    { name: 'Taiwan', code: 'TW', nationality: 'Taiwanese', dial: '+886', maxLen: 9 },
    { name: 'Tajikistan', code: 'TJ', nationality: 'Tajik', dial: '+992', maxLen: 9 },
    { name: 'Tanzania', code: 'TZ', nationality: 'Tanzanian', dial: '+255', maxLen: 9 },
    { name: 'Thailand', code: 'TH', nationality: 'Thai', dial: '+66', maxLen: 9 },
    { name: 'Togo', code: 'TG', nationality: 'Togolese', dial: '+228', maxLen: 8 },
    { name: 'Tonga', code: 'TO', nationality: 'Tongan', dial: '+676', maxLen: 7 },
    { name: 'Trinidad and Tobago', code: 'TT', nationality: 'Trinidadian/Tobagonian', dial: '+1-868', maxLen: 7 },
    { name: 'Tunisia', code: 'TN', nationality: 'Tunisian', dial: '+216', maxLen: 8 },
    { name: 'Turkey', code: 'TR', nationality: 'Turkish', dial: '+90', maxLen: 10 },
    { name: 'Turkmenistan', code: 'TM', nationality: 'Turkmen', dial: '+993', maxLen: 8 },
    { name: 'Tuvalu', code: 'TV', nationality: 'Tuvaluan', dial: '+688', maxLen: 5 },
    { name: 'Uganda', code: 'UG', nationality: 'Ugandan', dial: '+256', maxLen: 9 },
    { name: 'Ukraine', code: 'UA', nationality: 'Ukrainian', dial: '+380', maxLen: 9 },
    { name: 'United Arab Emirates', code: 'AE', nationality: 'Emirati', dial: '+971', maxLen: 9 },
    { name: 'United Kingdom', code: 'GB', nationality: 'British', dial: '+44', maxLen: 10 },
    { name: 'United States', code: 'US', nationality: 'American', dial: '+1', maxLen: 10 },
    { name: 'Uruguay', code: 'UY', nationality: 'Uruguayan', dial: '+598', maxLen: 8 },
    { name: 'Uzbekistan', code: 'UZ', nationality: 'Uzbekistani', dial: '+998', maxLen: 9 },
    { name: 'Vanuatu', code: 'VU', nationality: 'Ni-Vanuatu', dial: '+678', maxLen: 7 },
    { name: 'Vatican City', code: 'VA', nationality: 'Vatican', dial: '+39', maxLen: 10 },
    { name: 'Venezuela', code: 'VE', nationality: 'Venezuelan', dial: '+58', maxLen: 10 },
    { name: 'Vietnam', code: 'VN', nationality: 'Vietnamese', dial: '+84', maxLen: 10 },
    { name: 'Yemen', code: 'YE', nationality: 'Yemeni', dial: '+967', maxLen: 9 },
    { name: 'Zambia', code: 'ZM', nationality: 'Zambian', dial: '+260', maxLen: 9 },
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
             style="width:${size}px;height:${Math.round(size * 0.75)}px;object-fit:cover;border-radius:2px;border:1px solid #e2e8f0;" 
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
        <div style="display:flex;gap:0;align-items:stretch;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;transition:border-color 0.2s;position:relative;" id="${inputId}-wrap"
            onfocusin="this.style.borderColor='#3b82f6'" onfocusout="this.style.borderColor='#e2e8f0'">
            
            <div id="${inputId}-picker-btn" onclick="${isReadOnly ? '' : `obPhoneSearchToggle('${inputId}')`}"
                 style="display:flex;align-items:center;gap:5px;padding:0 10px;background:#f8fafc;border-right:1.5px solid #e2e8f0;min-width:90px;cursor:${isReadOnly ? 'default' : 'pointer'};position:relative;user-select:none; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
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

window.obPhoneSearchToggle = function (inputId) {
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

window.obPhoneSearchCountry = function (inputId) {
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
                <span style="flex-grow:1;">${c.name} (${c.code})</span>
                <span style="font-weight:700;color:#64748b;">${c.dial}</span>
            </div>
        `).join('');
};

window.obPhoneSelectCountry = function (inputId, code, dial, maxLen) {
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

window.obPhoneSyncValue = function (inputId) {
    const numInput = document.getElementById(inputId);
    const hiddenVal = document.getElementById(inputId + '-country-val');
    if (!numInput) return;
    const val = hiddenVal ? hiddenVal.value : 'SG|+65|8';
    const [code, dial] = val.split('|');
    numInput.dataset.fullVal = `${code}:${dial}:${numInput.value}`;
};

// Nationality dropdown: filter list by name or nationality adjective
window.obNatSearch = function (inputId) {
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
                onmousedown="obNatSelect('${inputId}','${natVal}','${inputId.replace(/'/g, "\\'")}NatCb')"
                onmouseenter="obNatHover(this)"
                onmouseleave="obNatUnhover(this)"
            >${obFlagImg(c.code, 18)} ${natVal}</div>`;
        }).join('');
    listEl.style.display = 'block';
    // Reset cursor index
    listEl.dataset.cursorIdx = '-1';
};

window.obNatHover = function (el) { el.style.background = '#eff6ff'; el.style.color = '#2563eb'; };
window.obNatUnhover = function (el) { el.style.background = ''; el.style.color = '#1e293b'; };

window.obNatSelect = function (inputId, name, cbName) {
    const inp = document.getElementById(inputId);
    if (inp) { inp.value = name; }
    obNatClose(inputId);
    // Trigger the save callback
    if (cbName && window[cbName]) window[cbName]();
};

window.obNatClose = function (inputId) {
    const listEl = document.getElementById(inputId + '-natlist');
    if (listEl) listEl.style.display = 'none';
};

window.obNatKeyNav = function (event, inputId, cbName) {
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
    // Save focus and cursor position
    const activeEl = document.activeElement;
    const activeId = activeEl ? activeEl.id : null;
    let selectionStart = null;
    let selectionEnd = null;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        try {
            selectionStart = activeEl.selectionStart;
            selectionEnd = activeEl.selectionEnd;
        } catch (e) { }
    }

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
    } else if (stepKey === 'shareholder_details') {
        contentHtml = obRenderIndividualShareholderHtml(isReadOnly);
    } else if (stepKey === 'rons') {
        contentHtml = obRenderRonsHtml(isReadOnly);
    } else if (isMultiItem) {
        contentHtml = renderMultiItemStepHtml(stepKey, isReadOnly);
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
                                        ${(f.options || []).map(o => `<option value='${o}' ${String(val).trim().toLowerCase() === String(o).trim().toLowerCase() ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </div>`;
                } else if (f.type === 'checkbox') {
                    const mandatoryMark = f.mandatory ? '<span style="color:#ef4444; margin-left:2px;">*</span>' : '';
                    return `
                                <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:24px;">
                                    <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="triggerAutoSave('${step.key}')" style="width:16px; height:16px; cursor:pointer;">
                                    <label for="${inputId}" style="cursor:pointer; margin-bottom:0; font-size:12px; font-weight:600; text-transform:none; letter-spacing:normal; color:#475569;">${f.label}${mandatoryMark}</label>
                                </div>`;
                } else if (f.type === 'phone') {
                    return obRenderPhoneField({
                        inputId,
                        val: String(val),
                        readonlyAttr,
                        onInputCallback: `triggerAutoSave('${step.key}')`
                    });
                } else if (f.type === 'nationality') {
                    const cbKey = inputId.replace(/-/g, '_') + 'NatCb';
                    window[cbKey] = () => {
                        const el = document.getElementById(inputId);
                        if (el) {
                            const sf = ONBOARDING_STEPS.find(s => s.key === step.key).field;
                            if (!state.onboarding[sf]) state.onboarding[sf] = { data: {}, status: 'pending', documents: [] };
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
        let bannerHtml = '';
        if (incompleteSteps.length > 0) {
            bannerHtml = `
                <div style="margin-bottom:24px;background:#fef2f2;border:1px solid #fecaca;border-radius:16px;padding:20px;">
                    <div style="font-size:14px;font-weight:800;color:#dc2626;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Please complete all previous steps first:
                    </div>
                    <ul style="list-style-type:disc;padding-left:20px;font-size:13px;color:#b91c1c;line-height:1.6;margin:0;">
                        ${incompleteSteps.map(s => `<li>${s.title}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            bannerHtml = `
                <div style="margin-bottom:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;display:flex;align-items:center;gap:12px;color:#16a34a;font-weight:600;font-size:13px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    All previous onboarding steps are completed successfully! Please review, sign the declarations, and submit.
                </div>
            `;
        }

        const fyeVal = data['fye'] !== undefined ? data['fye'] : '';
        const declVal = data['declarationAgreed'] ? 'checked' : '';
        const consentVal = data['consentAgreed'] ? 'checked' : '';

        const allCompleted = ONBOARDING_STEPS.every(s => ['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, state.onboarding)));
        const needsSubmission = ONBOARDING_STEPS.some(s => {
            if (s.key === 'document_checklist') return false;
            const st = getFriendlyStatus(s.key, state.onboarding);
            return st === 'completed' || st === 'rejected';
        });
        const isFinalSubmitted = allCompleted && !needsSubmission;
        const finalReadOnly = isReadOnly || isFinalSubmitted;

        const readonlyAttr = finalReadOnly ? 'disabled' : '';
        const readonlyInput = finalReadOnly ? 'disabled' : ''; // Use disabled instead of readonly for the date picker

        let customFieldsHtml = `
            <div style="background:linear-gradient(145deg, #ffffff, #f8fafc); border:1px solid #e2e8f0; border-radius:16px; padding:28px; box-shadow:0 10px 25px rgba(0,0,0,0.03); margin-bottom:24px;">
                <h4 style="font-family:'Outfit', sans-serif; font-size:18px; font-weight:700; color:#0f172a; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Corporate Details
                </h4>
                <div class="ob-field" style="max-width: 300px;">
                    <label for="ob-final_declaration-fye" style="font-weight:600; color:#475569;">Financial Year End (FYE) <span style="color:#ef4444; margin-left:2px;">*</span></label>
                    <input type="date" id="ob-final_declaration-fye" value="${fyeVal}" ${readonlyInput} oninput="triggerAutoSave('final_declaration')" style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:12px 14px; width:100%; font-size:14px; font-weight:500; color:#334155; transition:all 0.2s; outline:none;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#cbd5e1';">
                </div>
            </div>

            <div style="background:linear-gradient(145deg, #f8fafc, #f1f5f9); border:1px solid #e2e8f0; border-radius:16px; padding:28px; box-shadow:inset 0 2px 4px rgba(255,255,255,0.5); margin-bottom:24px;">
                <h4 style="font-family:'Outfit', sans-serif; font-size:18px; font-weight:700; color:#0f172a; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    Declarations & Consent
                </h4>
                
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <label style="display:flex; align-items:flex-start; gap:12px; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; cursor:${finalReadOnly ? 'default' : 'pointer'}; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.02);" onmouseover="if(!${finalReadOnly}) { this.style.borderColor='#3b82f6'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.1)'; }" onmouseout="if(!${finalReadOnly}) { this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; }">
                        <input type="checkbox" id="ob-final_declaration-declarationAgreed" ${declVal} ${readonlyAttr} onchange="triggerAutoSave('final_declaration')" style="width:20px; height:20px; margin-top:2px; accent-color:#0d6efd; cursor:${finalReadOnly ? 'default' : 'pointer'};">
                        <div style="font-size:14px; font-weight:600; color:#334155; line-height:1.5;">
                            I confirm that all the details provided are true and accurate to the best of my knowledge. <span style="color:#ef4444; margin-left:2px;">*</span>
                        </div>
                    </label>

                    <label style="display:flex; align-items:flex-start; gap:12px; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; cursor:${finalReadOnly ? 'default' : 'pointer'}; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.02);" onmouseover="if(!${finalReadOnly}) { this.style.borderColor='#3b82f6'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.1)'; }" onmouseout="if(!${finalReadOnly}) { this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; }">
                        <input type="checkbox" id="ob-final_declaration-consentAgreed" ${consentVal} ${readonlyAttr} onchange="triggerAutoSave('final_declaration')" style="width:20px; height:20px; margin-top:2px; accent-color:#0d6efd; cursor:${finalReadOnly ? 'default' : 'pointer'};">
                        <div style="font-size:14px; font-weight:600; color:#334155; line-height:1.5;">
                            I consent to Globalisor conducting compliance, AML/KYC screening, and verification checks. <span style="color:#ef4444; margin-left:2px;">*</span>
                        </div>
                    </label>
                </div>
            </div>
        `;

        contentHtml = bannerHtml + customFieldsHtml;
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

    // Restore focus and cursor position
    if (activeId) {
        const restoredEl = document.getElementById(activeId);
        if (restoredEl) {
            restoredEl.focus();
            if (restoredEl.type === 'number') {
                try {
                    restoredEl.type = 'text';
                    restoredEl.setSelectionRange(restoredEl.value.length, restoredEl.value.length);
                    restoredEl.type = 'number';
                } catch (e) { }
            } else if (selectionStart !== null && selectionEnd !== null) {
                try {
                    restoredEl.setSelectionRange(selectionStart, selectionEnd);
                } catch (e) { }
            }
        }
    }
}

function updateWizardUIFeedback() {
    const ob = state.onboarding || {};

    // 1. Calculate progress
    const completedCount = ONBOARDING_STEPS.filter(s => ['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, ob))).length;
    const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

    const progressFill = document.getElementById('ob-progress-fill');
    const progressPctText = document.getElementById('ob-progress-percent');
    const sidebarProgress = document.getElementById('sidebar-progress');
    if (progressFill) progressFill.style.width = progressPercent + '%';
    if (progressPctText) progressPctText.innerText = progressPercent + '%';
    if (sidebarProgress) sidebarProgress.innerText = progressPercent + '%';

    // 2. Stepper list update
    ONBOARDING_STEPS.forEach((step, idx) => {
        const tab = document.getElementById(`tab-${step.key}`);
        const iconEl = document.getElementById(`icon-${step.key}`);
        const badgeEl = document.getElementById(`badge-${step.key}`);
        if (!tab || !iconEl || !badgeEl) return;

        const friendly = getFriendlyStatus(step.key, ob);
        const locked = isStepLocked(idx, ob);
        const active = (state.activeObStepKey === step.key);

        if (tab.classList.contains('wizard-step-vertical')) {
            const titleEl = document.getElementById(`title-${step.key}`);

            let statusText = friendly.replace(/_/g, ' ');
            if (friendly === 'completed') statusText = 'Completed';
            statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
            badgeEl.innerText = statusText;

            if (active) {
                iconEl.style.background = '#0d6efd';
                iconEl.style.borderColor = '#0d6efd';
                iconEl.innerHTML = `<div id="inner-dot-${step.key}" style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff; transition: all 0.2s;"></div>`;
                titleEl.style.color = '#0f172a';
                titleEl.style.fontWeight = '800';
            } else if (friendly === 'completed' || friendly === 'approved') {
                iconEl.style.background = '#0d6efd';
                iconEl.style.borderColor = '#0d6efd';
                iconEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                titleEl.style.color = '#334155';
                titleEl.style.fontWeight = '600';
            } else {
                iconEl.style.background = '#ffffff';
                iconEl.style.borderColor = '#cbd5e1';
                iconEl.innerHTML = `<div id="inner-dot-${step.key}" style="width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; transition: all 0.2s;"></div>`;
                titleEl.style.color = '#475569';
                titleEl.style.fontWeight = '500';
            }
        } else {
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
                iconEl.innerHTML = `<span style="font-weight: 800; font-size: 11px;">0${idx + 1}</span>`;
            }
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
        let disableBtn = false;
        if (state.activeObStepKey === 'share_capital') {
            const hasNumError = errors.some(e => e.includes('positive whole number') || e.includes('positive number'));
            const missingConfirmation = errors.some(e => e.includes('Please confirm the share capital details'));
            if (hasNumError || missingConfirmation) disableBtn = true;
        } else if (state.activeObStepKey === 'director_details') {
            const missingDirectorConfirmation = errors.some(e => e.includes('I confirm that I am not disqualified'));
            const missingEmail = errors.some(e => e.includes('Field "Email" is required'));
            const missingMobile = errors.some(e => e.includes('Field "Mobile Number" is required'));
            if (missingDirectorConfirmation || missingEmail || missingMobile) disableBtn = true;
        } else if (state.activeObStepKey === 'individual_shareholder') {
            const missingEmail = errors.some(e => e.includes('Field "Email" is required'));
            const missingMobile = errors.some(e => e.includes('Field "Mobile Number" is required'));
            const missingShareDetails = errors.some(e =>
                e.includes('Field "Currency" is required') ||
                e.includes('Field "Share Class" is required') ||
                e.includes('Field "Number of Shares') ||
                e.includes('Field "Share Capital Amount') ||
                e.includes('Allocation error')
            );
            if (missingEmail || missingMobile || missingShareDetails) disableBtn = true;
        } else if (state.activeObStepKey === 'corporate_rep') {
            const missingEmail = errors.some(e => e.includes('Field "Email" is required'));
            const missingMobile = errors.some(e => e.includes('Field "Mobile Number" is required'));
            if (missingEmail || missingMobile) disableBtn = true;
        } else if (state.activeObStepKey === 'corporate_shareholder') {
            let notFullyAllocated = false;
            const obCurrent = state.onboarding || {};
            const currencies = (obCurrent.stepShareCapital && obCurrent.stepShareCapital.data && obCurrent.stepShareCapital.data.currencies) || [];

            const indStep = obCurrent.step3IndividualShareholder || { data: { list: [] } };
            const indList = indStep.data.list || [];
            const corpStep = obCurrent.step4CorporateShareholder || { data: { list: [] } };
            const corpList = corpStep.data.list || [];

            const usage = {};
            const countUsage = (list) => {
                list.forEach(sh => {
                    const shCurr = (sh.currency || '').trim().toUpperCase();
                    const shClass = (sh.shareClass || '').trim();
                    if (shCurr && shCurr !== 'SELECT' && shClass && shClass.toUpperCase() !== 'SELECT') {
                        const key = `${shCurr}_${shClass}`;
                        if (!usage[key]) usage[key] = { shares: 0, capital: 0 };
                        usage[key].shares += parseFloat(String(sh.numberOfShares || '0').replace(/,/g, '')) || 0;
                        usage[key].capital += parseFloat(String(sh.shareCapitalAmount || '0').replace(/,/g, '')) || 0;
                    }
                });
            };
            countUsage(indList);
            countUsage(corpList);

            currencies.forEach(masterItem => {
                const mCurr = masterItem.currency === 'Others' ? (masterItem.customCurrency || '').trim().toUpperCase() : (masterItem.currency || '').toUpperCase();
                const mClass = (masterItem.shareClass || '').trim();
                const mShares = parseFloat(String(masterItem.numberOfShares || '0').replace(/,/g, '')) || 0;
                const mCapital = parseFloat(String(masterItem.shareCapitalAmount || '0').replace(/,/g, '')) || 0;

                const key = `${mCurr}_${mClass}`;
                const usedShares = usage[key] ? usage[key].shares : 0;
                const usedCapital = usage[key] ? usage[key].capital : 0;

                if (Math.abs(usedShares - mShares) > 0.001 || Math.abs(usedCapital - mCapital) > 0.001) {
                    notFullyAllocated = true;
                }
            });

            if (notFullyAllocated) disableBtn = true;
        }

        if (disableBtn) {
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
            continueBtn.style.cursor = 'not-allowed';
            continueBtn.style.background = '#e2e8f0';
            continueBtn.style.color = '#94a3b8';
        } else {
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            continueBtn.style.background = '#2563eb';
            continueBtn.style.color = '#ffffff';
        }
    }

    // 5. Submit for Verification button
    const submitBtn = document.getElementById('ob-submit-verification-btn');
    const finalSubmitBtn = document.getElementById('ob-final-submit-btn');
    const allCompleted = ONBOARDING_STEPS.every(s => ['completed', 'approved', 'submitted', 'under_review'].includes(getFriendlyStatus(s.key, ob)));
    const needsSubmission = ONBOARDING_STEPS.some(s => {
        if (s.key === 'document_checklist') return false;
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
            finalSubmitBtn.innerHTML = 'Submit for Verification ✓';
        } else {
            finalSubmitBtn.style.opacity = '0.5';
            finalSubmitBtn.style.cursor = 'not-allowed';
            finalSubmitBtn.style.background = '#e2e8f0';
            if (allCompleted && !needsSubmission) {
                finalSubmitBtn.innerHTML = 'Submitted ✓';
            } else {
                finalSubmitBtn.innerHTML = 'Submit for Verification ✓';
            }
        }
    }
}

async function saveOnboardingDraft() {
    const stepKey = state.activeObStepKey;
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return;
    const stepField = step.field;
    const stepData = state.onboarding[stepField];
    if (!stepData) return;

    await ensureOnboardingRecord();
    if (!state.onboardingId) return;

    if (obAutoSaveTimeout) clearTimeout(obAutoSaveTimeout);
    obAutoSaveTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: stepData.data,
                    status: stepData.status || 'pending'
                })
            });
            if (res.ok) {
                const updated = await res.json();
                state.onboarding = normalizeOnboardingData(updated);
                console.log(`Auto-saved step ${stepKey}`);
            }
        } catch (e) {
            console.error('Error auto-saving step draft:', e);
        }
    }, 1000);
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
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    data: stepData.data,
                                    documents: stepData.documents,
                                    status: 'pending'
                                })
                            });
                            if (res.ok) {
                                state.onboarding = normalizeOnboardingData(await res.json());
                            }
                        } catch (e) { }
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
                            headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
                        headers: { 'Content-Type': 'application/json' },
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
                } catch (e) {
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
    input.accept = '.jpg,.jpeg,.png,.pdf,.JPG,.JPEG,.PNG,.PDF';
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientEmail: state.user.email, clientName: state.user.name })
            });
            if (createRes.ok) { const d = await createRes.json(); state.onboardingId = d.id; }
        }

        if (state.onboardingId) {
            const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
            if (!state.onboarding[stepField]) {
                state.onboarding[stepField] = { data: {}, status: 'pending', documents: [] };
            }
            if (!state.onboarding[stepField].data) {
                state.onboarding[stepField].data = {};
            }
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
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
                            headers: { 'Content-Type': 'application/json' },
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
                                    headers: { 'Content-Type': 'application/json' },
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
                    const freshRes = await fetch(`/api/onboarding/client/${state.user.id}?_t=${Date.now()}`);
                    if (freshRes.ok) state.onboarding = normalizeOnboardingData(await freshRes.json());
                } catch (e) { }

                const workspace = document.getElementById('ob-form-workspace');
                if (workspace) {
                    renderActiveStepForm(workspace);
                }
            }
        }
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

async function ensureOnboardingRecord() {
    if (state.onboardingId) return;
    try {
        const res = await fetch(`/api/onboarding/client/${state.user.id}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientEmail: state.user.email, clientName: state.user.name })
        });
        if (res.ok) { const d = await res.json(); state.onboardingId = d.id; }
    } catch (e) { }
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
        const btn = document.getElementById('ob-continue-btn');
        if (btn) {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg> Processing...`;
            btn.style.opacity = '0.8';
            btn.style.pointerEvents = 'none';
        }
        const nextStep = ONBOARDING_STEPS[stepIndex + 1];
        await selectObStep(nextStep.key, true);
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
    const btn = document.getElementById('ob-final-submit-btn');
    if (btn) {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg> Submitting...`;
        btn.style.opacity = '0.8';
        btn.style.pointerEvents = 'none';
    }

    await ensureOnboardingRecord();
    const ob = state.onboarding || {};
    if (!state.onboardingId) return;

    // Flush active step inputs
    await forceSaveActiveStep();

    // Filter steps that are not approved/submitted/under_review
    const stepsToSubmit = ONBOARDING_STEPS.filter(step => {
        if (step.key === 'document_checklist') return false;
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
                headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`/api/onboarding/client/${state.user.id}?_t=${Date.now()}`);
        if (res.ok) state.onboarding = normalizeOnboardingData(await res.json());
    } catch (e) { }

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
                        <span class="font-bold ${idStat === 'verified' ? 'text-emerald-500' : 'text-red-500'}">${idStat === 'verified' ? '🟢 Verified' : (idStat === 'failed' ? '🔴 Failed' : '⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="search" class="w-3.5 h-3.5"></i> AML Screening</span>
                        <span class="font-bold ${amlStat === 'clean' ? 'text-emerald-500' : 'text-red-500'}">${amlStat === 'clean' ? '🟢 Clean' : (amlStat === 'flagged' ? '🔴 Flagged' : '⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i> PEP Watchlist Search</span>
                        <span class="font-bold ${pepStat === 'clean' ? 'text-emerald-500' : 'text-red-500'}">${pepStat === 'clean' ? '🟢 Clean' : (pepStat === 'match' ? '🔴 Match Found' : '⚪ Pending')}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500 font-medium flex items-center gap-1.5"><i data-lucide="globe" class="w-3.5 h-3.5"></i> Sanctions Screening</span>
                        <span class="font-bold ${sancStat === 'clean' ? 'text-emerald-500' : 'text-red-500'}">${sancStat === 'clean' ? '🟢 Clean' : (sancStat === 'match' ? '🔴 Match Found' : '⚪ Pending')}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk: <span class="${kRisk === 'High' ? 'text-red-500' : (kRisk === 'Medium' ? 'text-amber-500' : 'text-emerald-500')}">${kRisk}</span></span>
                    ${kStatus !== 'approved' ? `
                        <button onclick="openPortalShuftiModal()" class="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all">Verify Now</button>
                    ` : `
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">Status: Active</span>
                    `}
                </div>
            </div>
        `;
    }

    let companyDisplayName = "My Company";
    let companyStatus = "In Progress";
    let companyPercent = 65;
    
    if (state.requirements) {
        if (state.requirements.excelData && state.requirements.excelData.companyName) {
            companyDisplayName = state.requirements.excelData.companyName;
            companyStatus = "Completed";
            companyPercent = 100;
        } else if (state.requirements.names && state.requirements.names[0]) {
            companyDisplayName = state.requirements.names[0];
        }
    }
    
    if (activeService) {
        companyDisplayName = activeService.companyName || companyDisplayName;
        companyStatus = activeService.status || companyStatus;
        if (companyStatus === 'approved' || companyStatus === 'completed') {
            companyPercent = 100;
        }
    }

    let registerHtml = '';
    if (state.requirements && state.requirements.excelData) {
        const ed = state.requirements.excelData;
        registerHtml = `
            <!-- Corporate Register -->
            <div class="premium-card bg-white border-none shadow-sm p-6">
                <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 class="font-bold text-slate-900 text-lg">Corporate Register</h3>
                        <p class="text-xs text-slate-400 mt-1">Your official company records and registers.</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg border text-[10px] font-bold bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-wider">Active</span>
                </div>
                
                <!-- Register Tabs -->
                <div class="flex border-b border-slate-100 mb-6 overflow-x-auto gap-4">
                    <button onclick="switchRegisterTab('company')" id="reg-tab-company" class="reg-tab-btn px-4 py-2 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-all">Company Profile</button>
                    <button onclick="switchRegisterTab('directors')" id="reg-tab-directors" class="reg-tab-btn px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all">Directors (${ed.directors ? ed.directors.length : 0})</button>
                    <button onclick="switchRegisterTab('secretaries')" id="reg-tab-secretaries" class="reg-tab-btn px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all">Secretaries (${ed.secretaries ? ed.secretaries.length : 0})</button>
                    <button onclick="switchRegisterTab('members')" id="reg-tab-members" class="reg-tab-btn px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all">Shareholders (${ed.members ? ed.members.length : 0})</button>
                    <button onclick="switchRegisterTab('controllers')" id="reg-tab-controllers" class="reg-tab-btn px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all">Controllers / UBOs (${ed.controllers ? ed.controllers.length : 0})</button>
                </div>
                
                <!-- Register Tab Contents -->
                <div id="reg-content-company" class="reg-tab-content space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Name</span>
                            <div class="font-bold text-slate-800">${ed.companyName || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">UEN (Unique Entity Number)</span>
                            <div class="font-mono font-bold text-slate-800">${ed.uen || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Type</span>
                            <div class="font-bold text-slate-800">${ed.companyType || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Activity (SSIC)</span>
                            <div class="font-bold text-slate-800">${ed.primaryActivity || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Secondary Activity (SSIC)</span>
                            <div class="font-bold text-slate-800">${ed.secondaryActivity || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Financial Year End (FYE)</span>
                            <div class="font-bold text-slate-800">${ed.fye || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100 lg:col-span-2">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Registered Address</span>
                            <div class="font-medium text-slate-800">${ed.registeredOfficeAddress || '—'}</div>
                        </div>
                        <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Last AGM Date</span>
                            <div class="font-bold text-slate-800">${ed.lastAgmDate || '—'}</div>
                        </div>
                    </div>
                </div>
                
                <div id="reg-content-directors" class="reg-tab-content hidden space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${ed.directors && ed.directors.length > 0 ? ed.directors.map(d => `
                            <div class="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                                <div class="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <span class="font-bold text-slate-800 text-sm">${d.name}</span>
                                    <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">${d.type}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600">
                                    <div><strong>ID/Passport:</strong> ${d.idNumber || '—'}</div>
                                    <div><strong>Nationality:</strong> ${d.nationality || '—'}</div>
                                    <div><strong>DOB:</strong> ${d.dob || '—'}</div>
                                    <div><strong>Appointed:</strong> ${d.appointmentDate || '—'}</div>
                                    <div><strong>Email:</strong> ${d.email || '—'}</div>
                                    <div><strong>Mobile:</strong> ${d.mobile || '—'}</div>
                                    <div class="col-span-2"><strong>Address:</strong> ${d.address || '—'}</div>
                                </div>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400 text-center py-4">No directors registered.</div>'}
                    </div>
                </div>
                
                <div id="reg-content-secretaries" class="reg-tab-content hidden space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${ed.secretaries && ed.secretaries.length > 0 ? ed.secretaries.map(s => `
                            <div class="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                                <div class="pb-2 border-b border-slate-100">
                                    <span class="font-bold text-slate-800 text-sm">${s.name}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600">
                                    <div><strong>ID/Passport:</strong> ${s.idNumber || '—'}</div>
                                    <div><strong>Nationality:</strong> ${s.nationality || '—'}</div>
                                    <div><strong>Appointed:</strong> ${s.appointmentDate || '—'}</div>
                                    <div class="col-span-2"><strong>Address:</strong> ${s.address || '—'}</div>
                                </div>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400 text-center py-4">No secretaries registered.</div>'}
                    </div>
                </div>
                
                <div id="reg-content-members" class="reg-tab-content hidden space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${ed.members && ed.members.length > 0 ? ed.members.map(m => `
                            <div class="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                                <div class="pb-2 border-b border-slate-100">
                                    <span class="font-bold text-slate-800 text-sm">${m.name}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600">
                                    <div><strong>ID/UEN:</strong> ${m.idNumber || '—'}</div>
                                    <div><strong>Nationality:</strong> ${m.nationality || '—'}</div>
                                    <div><strong>Entered:</strong> ${m.dateEntered || '—'}</div>
                                    <div class="col-span-2"><strong>Address:</strong> ${m.address || '—'}</div>
                                </div>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400 text-center py-4">No shareholders registered.</div>'}
                    </div>
                </div>
                
                <div id="reg-content-controllers" class="reg-tab-content hidden space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${ed.controllers && ed.controllers.length > 0 ? ed.controllers.map(c => `
                            <div class="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                                <div class="pb-2 border-b border-slate-100">
                                    <span class="font-bold text-slate-800 text-sm">${c.name}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600">
                                    <div><strong>ID/Passport:</strong> ${c.idNumber || '—'}</div>
                                    <div><strong>Nationality:</strong> ${c.nationality || '—'}</div>
                                    <div><strong>DOB:</strong> ${c.dob || '—'}</div>
                                    <div><strong>Date of Entry:</strong> ${c.dateOfEntry || '—'}</div>
                                    <div class="col-span-2"><strong>Address:</strong> ${c.address || '—'}</div>
                                </div>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400 text-center py-4">No controllers registered.</div>'}
                    </div>
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
                                    <h2 class="text-3xl font-bold mb-3">${companyDisplayName}</h2>
                                    <div class="flex items-center gap-3">
                                        <span class="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase">${companyStatus}</span>
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
                                <span class="text-sm font-bold">${companyPercent}%</span>
                            </div>
                            <div class="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                <div class="h-full bg-white rounded-full transition-all duration-500" style="width: ${companyPercent}%"></div>
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
            
            ${registerHtml}
            
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

    const chatBody = document.getElementById('ai-chat-body');
    const typing = document.createElement('div');
    typing.id = 'ai-typing-indicator';
    typing.className = 'flex gap-3 animate-pulse';
    typing.innerHTML = '<div class="bg-white/60 p-4 rounded-2xl rounded-tl-none text-xs text-slate-400 font-semibold">AI is analyzing database...</div>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        if (!state.clientAiThreadId) {
            state.clientAiThreadId = localStorage.getItem('globalisor_client_ai_thread_id') || ('th_client_' + Date.now());
            localStorage.setItem('globalisor_client_ai_thread_id', state.clientAiThreadId);
        }
        let url = '/api/admin/intelligence/ask?q=' + encodeURIComponent(msg) + '&threadId=' + encodeURIComponent(state.clientAiThreadId);
        if (state.clientAiCompany) {
            url += '&company=' + encodeURIComponent(state.clientAiCompany);
        }
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const typeEl = document.getElementById('ai-typing-indicator');
            if (typeEl) typeEl.remove();
            if (data && data.reply) {
                if (data.activeCompany || data.companyName) {
                    state.clientAiCompany = data.activeCompany || data.companyName;
                }
                appendAIMessage('bot', data.reply);
                return;
            }
        }
    } catch(err) {
        console.error("Client AI query error:", err);
    }

    const typeEl = document.getElementById('ai-typing-indicator');
    if (typeEl) typeEl.remove();
    const response = generateAIResponse(msg);
    appendAIMessage('bot', response);
}

function appendAIMessage(sender, text) {
    const chatBody = document.getElementById('ai-chat-body');
    const div = document.createElement('div');
    div.className = `flex gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}`;
    
    let formatted = text || '';
    if (sender !== 'user') {
        formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md transition no-underline my-1.5">$1 ↗</a>')
                             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                             .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-xs">$1</code>')
                             .replace(/\n/g, '<br>');
    }

    div.innerHTML = `
        <div class="${sender === 'user' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white/90 text-slate-800 border border-white/60'} p-4 rounded-2xl ${sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} text-xs leading-relaxed shadow-sm">
            ${formatted}
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
                                    <span>${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
                        <span class="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-100">${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
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
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
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

window.openGuidanceDetail = function (id) {
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

window.filterGuidance = function (category) {
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

    socket.onmessage = async function (event) {
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

    socket.onclose = function () {
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

function switchRegisterTab(tabId) {
    document.querySelectorAll('.reg-tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-slate-500', 'hover:text-slate-700');
    });
    document.querySelectorAll('.reg-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeBtn = document.getElementById('reg-tab-' + tabId);
    if (activeBtn) {
        activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        activeBtn.classList.remove('text-slate-500', 'hover:text-slate-700');
    }
    
    const activeContent = document.getElementById('reg-content-' + tabId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

// Bind to window for HTML inline event handlers
window.logout = logout;
window.switchTab = switchTab;
window.switchRegisterTab = switchRegisterTab;
window.obStartOnboarding = obStartOnboarding;
window.obSetShareholderTab = obSetShareholderTab;
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
                    if (f.key === 'passportExpiry' && el.value) {
                        const expiryDate = new Date(el.value);
                        if (!isNaN(expiryDate.getTime())) {
                            const threeMonthsLater = new Date();
                            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                            if (expiryDate < threeMonthsLater) {
                                if (el.dataset.lastAlertVal !== el.value) {
                                    el.dataset.lastAlertVal = el.value;
                                    if (stepKey === 'corporate_rep') {
                                        alert("Passport validity is less than 3 months. Please upload your latest passport.");
                                    } else {
                                        alert("Passport validity is less than 3 months");
                                    }
                                }
                            }
                        }
                    }
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

        if (numSharesPctEl && document.activeElement === numSharesPctEl) {
            if (shareCapitalAmountPctEl) {
                shareCapitalAmountPctEl.value = numSharesPctEl.value;
            }
        } else if (shareCapitalAmountPctEl && document.activeElement === shareCapitalAmountPctEl) {
            if (numSharesPctEl) {
                numSharesPctEl.value = shareCapitalAmountPctEl.value;
            }
        }

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
    updateAllocationLimitsUI();

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
                headers: { 'Content-Type': 'application/json' },
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

function syncUBOFromIndividualShareholder(idx, item) {
    const uboStep = ONBOARDING_STEPS.find(s => s.key === 'ubo');
    const uboField = uboStep ? uboStep.field : null;
    if (!uboField) return;

    if (!state.onboarding[uboField]) state.onboarding[uboField] = { data: {}, status: 'pending', documents: [] };

    ['fullName', 'idNumber', 'nationality', 'dateOfBirth', 'residentialAddress', 'email', 'mobile', 'passportExpiry', 'ownershipPercentage'].forEach(key => {
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: stepData.data,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) { }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) { }
    }

    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

async function obUploadMultiItemDoc(stepKey, docTypeWithIdx, docLabel, idx) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf,.JPG,.JPEG,.PNG,.PDF';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const docEl = document.getElementById(`doc-${stepKey}-${docTypeWithIdx}`);
        if (docEl) docEl.innerHTML = `<div style='color:#3b82f6;font-size:11px;font-weight:700;'>⏳ Uploading & extracting...</div>`;

        const stepField = ONBOARDING_STEPS.find(s => s.key === stepKey).field;
        if (!state.onboarding[stepField]) {
            state.onboarding[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
        }
        if (!state.onboarding[stepField].data) {
            state.onboarding[stepField].data = { list: [] };
        }
        if (!state.onboarding[stepField].data.list) {
            state.onboarding[stepField].data.list = [];
        }
        while (state.onboarding[stepField].data.list.length <= idx) {
            state.onboarding[stepField].data.list.push({});
        }

        let docType = docTypeWithIdx.split('_')[0];
        if (docType === 'nric') {
            const item = state.onboarding[stepField].data.list[idx];
            if (stepKey === 'director_details') {
                if (item.idType === 'foreign') docType = 'passport';
            } else if (stepKey === 'individual_shareholder') {
                if (item.shareholderType !== 'Local') docType = 'passport';
            } else if (stepKey === 'corporate_rep') {
                docType = 'passport';
            }
        }
        const ocrResult = await performOcrOnFileInput(file, docType);
        const extracted = ocrResult.extracted;
        const base64DataUri = ocrResult.fileData;

        // Post-Extraction validation: Check if extracted ID number is already registered for another item
        if (extracted && extracted.idNumber) {
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
                headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: state.onboarding[stepField].data
                    })
                });
            }
        }

        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
        updateWizardUIFeedback();
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// ─── Extra Onboarding Helpers ───────────────────────────────────────────────

function obRenderDocumentChecklistHtml(isReadOnly) {
    const req = state.requirements || {};
    const dirs = req.directors || [];
    const shs = req.shareholders || [];
    const inds = shs.filter(s => s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤'))));
    const corps = shs.filter(s => !(s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤')))));
    const repData = (state.onboarding && state.onboarding.step6CorporateRep && state.onboarding.step6CorporateRep.data) || {};

    const cleanContactVal = (val, fallback) => {
        if (!val) return fallback;
        const clean = val.toString().trim().toUpperCase();
        if (clean === '' || clean === 'N/A' || clean === 'N / A' || clean === 'NULL' || clean === 'UNDEFINED') {
            return fallback;
        }
        return val;
    };

    let html = `
    <div style="background: #ffffff; border-radius: 16px; padding: 0; font-family: 'Outfit', sans-serif;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 24px; padding: 0 0 0 0;">
            <div style="display: flex; align-items: center; gap: 20px; font-size: 13px; color: #64748b; font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 16px; height: 16px; background: #c084fc; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Mandatory</span>
                </div>
                <div style="width: 1px; height: 16px; background: #e2e8f0;"></div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>As per selection</span>
                </div>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 16px; padding: 0 0 0 0;">
    `;

    const renderSection = (config) => {
        const { theme, icon, title, count, checkboxes, detailsTitle, detailsList } = config;
        const colors = {
            purple: { bg: '#faf5ff', iconBg: '#f3e8ff', text: '#9333ea', border: '#e9d5ff', dark: '#6b21a8' },
            green: { bg: '#f0fdf4', iconBg: '#dcfce7', text: '#22c55e', border: '#bbf7d0', dark: '#15803d' },
            orange: { bg: '#fff7ed', iconBg: '#ffedd5', text: '#f97316', border: '#fed7aa', dark: '#c2410c' },
            blue: { bg: '#eff6ff', iconBg: '#dbeafe', text: '#3b82f6', border: '#bfdbfe', dark: '#1d4ed8' }
        };
        const c = colors[theme];

        let leftDetailsHtml = '';
        if (detailsList && detailsList.length > 0) {
            const detailsHtml = detailsList.map((item, idx) => `
                <div style="margin-bottom: 12px; font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-bottom: 6px;">${item.name}</div>
                    <div style="color: #475569; font-size: 12.5px; line-height: 1.6; padding-left: 2px;">
                        ${item.email !== 'Email ID' ? '<div>' + item.email + '</div>' : ''}
                        ${item.phone !== 'Phone Number' ? '<div>' + item.phone + '</div>' : ''}
                    </div>
                </div>
            `).join('');

            leftDetailsHtml = `
                <div style="width: 320px; background: ${c.bg}; border-right: 1px solid ${c.border}; padding: 20px 24px; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-start; margin: 4px 0 4px 4px; border-radius: 12px 0 0 12px;">
                    <div style="font-size: 11px; font-weight: 800; color: ${c.text}; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">${detailsTitle}</div>
                    <div style="flex-grow: 1;">
                        ${detailsHtml}
                    </div>
                </div>
            `;
        }

        const checkboxHtml = checkboxes.map(text => {
            if (text.startsWith('HEADER:')) {
                return `<div style="font-size: 13.5px; color: #1e293b; font-weight: 700; margin: 16px 0 8px 0;">${text.replace('HEADER:', '')}</div>`;
            }
            return `
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <div style="width: 18px; height: 18px; background: ${c.text}; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div style="font-size: 13.5px; color: #475569; font-weight: 500; font-family: 'Inter', sans-serif;">${text}</div>
            </div>
            `;
        }).join('');

        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 16px; display: flex; overflow: hidden; background: #fff; min-height: 120px; box-shadow: 0 4px 15px rgba(0,0,0,0.015);">
                ${leftDetailsHtml}
                <div style="flex-grow: 1; padding: 24px; display: flex; gap: 20px;">
                    <div style="width: 44px; height: 44px; background-color: ${c.iconBg}; color: ${c.dark}; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                        ${icon}
                    </div>
                    <div style="flex-grow: 1; padding-top: 2px;">
                        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">
                            ${title} ${count ? `(${count})` : ''}
                        </div>
                        <div>
                            ${checkboxHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    if (dirs.length > 0) {
        html += renderSection({
            theme: 'purple',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            title: 'Director Documents',
            count: `${dirs.length} Director${dirs.length > 1 ? 's' : ''}`,
            checkboxes: [
                'NRIC / FIN / Notarised Passport (validity at least 3 months) – JPG or PDF (front and back)',
                'Proof of Residential Address (in the name of the individual) dated within the last 3 months: Utility Bill / Bank Statement / Mobile Bill (notarised in case of foreigners)'
            ],
            detailsTitle: 'DIRECTOR REGISTRY DETAILS',
            detailsList: dirs.map((d, dIdx) => ({
                name: `Director ${dIdx + 1}${d.name && d.name !== 'N/A' ? ` - ${d.name}` : ''}`,
                email: cleanContactVal(d.email, 'Email ID'),
                phone: cleanContactVal(d.phone, 'Phone Number')
            }))
        });
    }

    if (inds.length > 0) {
        html += renderSection({
            theme: 'green',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
            title: 'Individual Shareholder Documents',
            count: `${inds.length} Shareholder${inds.length > 1 ? 's' : ''}`,
            checkboxes: [
                'NRIC / FIN / Notarised Passport (validity at least 3 months) – JPG or PDF (front and back)',
                'Proof of Residential Address (in the name of the individual) dated within the last 3 months: Utility Bill / Bank Statement / Mobile Bill (notarised in case of foreigners)'
            ],
            detailsTitle: 'INDIVIDUAL SHAREHOLDER REGISTRY DETAILS',
            detailsList: inds.map((s, sIdx) => ({
                name: `Shareholder ${sIdx + 1}${s.name && s.name !== 'N/A' ? ` - ${s.name}` : ''}`,
                email: cleanContactVal(s.email, 'Email ID'),
                phone: cleanContactVal(s.phone, 'Phone Number')
            }))
        });
    }

    if (corps.length > 0) {
        html += renderSection({
            theme: 'orange',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`,
            title: 'Corporate Shareholder Documents',
            count: `${corps.length} Corporate Shareholder${corps.length > 1 ? 's' : ''}`,
            checkboxes: [
                'HEADER:If the Corporate Shareholder is a Singapore Company:',
                'ACRA BizFile',
                'Company Constitution (M&AA)',
                'HEADER:If the Corporate Shareholder is a Non-Singapore Company:',
                'Certificate of Incorporation / Registration',
                'Company Constitution (M&AA or equivalent)',
                'Supporting Corporate Registration Documents'
            ],
            detailsTitle: 'CORPORATE SHAREHOLDER REGISTRY DETAILS',
            detailsList: corps.map((s, cIdx) => ({
                name: `Corporate Shareholder ${cIdx + 1}${s.name && s.name !== 'N/A' ? ` - ${s.name}` : ''}`,
                email: cleanContactVal(s.email, 'Email ID'),
                phone: cleanContactVal(s.phone, 'Phone Number')
            }))
        });

        html += renderSection({
            theme: 'blue',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><circle cx="12" cy="13" r="3"></circle><path d="M17 19v-1a4 4 0 0 0-8 0v1"></path></svg>`,
            title: 'Corporate Representative Documents',
            count: null,
            checkboxes: [
                'NRIC / FIN / Passport (validity at least 3 months) – JPG or PDF (front and back)',
                'Proof of Residential Address (in the name of the individual) dated within the last 3 months: Utility Bill / Bank Statement / Mobile Bill (notarised in case of foreigners)'
            ],
            detailsTitle: 'REPRESENTATIVE CONTACT DETAILS',
            detailsList: [{
                name: `Representative${repData.fullName && repData.fullName !== 'Not Filled Yet' && repData.fullName !== 'N/A' ? ` - ${repData.fullName}` : ''}`,
                email: cleanContactVal(repData.email, 'Email ID'),
                phone: cleanContactVal(repData.mobile, 'Phone Number')
            }]
        });
    }

    html += `
            <div style="font-size: 13.5px; color: #475569; font-style: italic; margin-top: 12px; padding: 0 16px;">
                Please ensure all documents are clear, valid, and legible before proceeding.
            </div>
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
            <div style="text-align:center;padding:40px 20px;background:linear-gradient(180deg, #f8fafc, #f1f5f9);border:2px dashed #cbd5e1;border-radius:16px;margin-bottom:24px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                <div style="width:48px;height:48px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 4px 10px rgba(0,0,0,0.03);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;color:#1e293b;margin-bottom:8px;">No Share Capital Configured</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;max-width:350px;margin:0 auto;">Add a currency section below to define your company's share capital structure.</div>
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
            }

            const headerSummary = `${currCode || '???'} – ${numShares.toLocaleString()} ${c.shareClass === 'Ordinary' ? 'ORD' : 'PREF'} – ${currCode || '???'} ${amount.toLocaleString()} Issued`;

            if (isCollapsed) {
                return `
                <div style="background:#ffffff;border:1px solid ${errorText ? '#fecaca' : '#e2e8f0'};border-radius:16px;padding:16px 24px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.03);display:flex;justify-content:space-between;align-items:center;transition:all 0.2s ease;border-left:4px solid ${errorText ? '#ef4444' : '#3b82f6'};" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 16px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.03)';">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:${errorText ? '#fef2f2' : '#eff6ff'};display:flex;align-items:center;justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${errorText ? '#ef4444' : '#3b82f6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                        </div>
                        <div>
                            <span style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:#0f172a;">${headerSummary}</span>
                            ${errorText ? `<div style="font-size:11.5px;color:#ef4444;font-weight:600;margin-top:2px;">⚠️ Needs attention</div>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button type="button" onclick="obToggleCurrencyCollapse(${idx})" style="padding:8px 16px;background:#f8fafc;color:#334155;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            Expand
                        </button>
                        ${isReadOnly ? '' : `
                            <button type="button" onclick="obDeleteCurrencySection(${idx})" style="padding:8px;background:#ffffff;color:#ef4444;border:1px solid #fecaca;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;box-shadow:0 2px 4px rgba(239,68,68,0.05);" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#ffffff'" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        `}
                    </div>
                </div>
                `;
            }

            // Expanded view
            return `
            <div style="background:#ffffff;border:1px solid ${errorText ? '#fecaca' : '#e2e8f0'};border-left:4px solid ${errorText ? '#ef4444' : '#2563eb'};border-radius:12px;padding:24px;margin-bottom:24px;position:relative;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <div style="width:40px;height:40px;border-radius:10px;background:${errorText ? '#fef2f2' : '#eff6ff'};display:flex;align-items:center;justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${errorText ? '#ef4444' : '#2563eb'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                        </div>
                        <h4 style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:#0f172a;margin:0;">Currency Section #${idx + 1}</h4>
                    </div>
                    <div style="display:flex;gap:12px;">
                        <button type="button" onclick="obToggleCurrencyCollapse(${idx})" style="padding:8px 16px;background:#ffffff;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            Collapse
                        </button>
                        ${isReadOnly ? '' : `
                            <button type="button" onclick="obDeleteCurrencySection(${idx})" style="padding:8px 16px;background:#ffffff;color:#ef4444;border:1px solid #fca5a5;border-radius:8px;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background='#fef2f2';" onmouseout="this.style.background='#ffffff';">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                Remove
                            </button>
                        `}
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:16px;">
                    <div class="ob-field" style="gap:8px;">
                        <label style="color:#64748b;font-weight:700;font-size:11px;letter-spacing:0.5px;">CURRENCY</label>
                        <select id="ob-share-capital-${idx}-currency" onchange="obUpdateCurrencyField(${idx}, 'currency', this.value)" ${isReadOnly ? 'disabled' : ''} style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-family:'Inter',sans-serif;appearance:none;background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230f172a%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>');background-repeat:no-repeat;background-position:right 16px center;">
                            <option value="SGD" ${c.currency === 'SGD' ? 'selected' : ''}>SGD</option>
                            <option value="USD" ${c.currency === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="Others" ${c.currency === 'Others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                    <div class="ob-field" style="gap:8px;">
                        <label style="color:#64748b;font-weight:700;font-size:11px;letter-spacing:0.5px;">CLASS OF SHARES</label>
                        <select id="ob-share-capital-${idx}-shareClass" onchange="obUpdateCurrencyField(${idx}, 'shareClass', this.value)" ${isReadOnly ? 'disabled' : ''} style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-family:'Inter',sans-serif;appearance:none;background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230f172a%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>');background-repeat:no-repeat;background-position:right 16px center;">
                            <option value="Ordinary" ${c.shareClass === 'Ordinary' ? 'selected' : ''}>Ordinary</option>
                            <option value="Preference" ${c.shareClass === 'Preference' ? 'selected' : ''}>Preference</option>
                        </select>
                    </div>
                </div>

                ${c.currency === 'Others' ? `
                    <div class="ob-field" style="margin-bottom:16px;gap:8px;">
                        <label style="color:#64748b;font-weight:700;font-size:11px;letter-spacing:0.5px;">SPECIFY CUSTOM CURRENCY CODE</label>
                        <input type="text" id="ob-share-capital-${idx}-customCurrency" value="${c.customCurrency || ''}" placeholder="e.g. EUR, GBP" oninput="obUpdateCurrencyFieldLocal(${idx}, 'customCurrency', this.value)" onchange="obUpdateCurrencyField(${idx}, 'customCurrency', this.value)" ${isReadOnly ? 'disabled' : ''} style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-family:'Inter',sans-serif;box-sizing:border-box;">
                    </div>
                ` : ''}

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:12px;">
                    <div class="ob-field" style="gap:8px;">
                        <label style="color:#64748b;font-weight:700;font-size:11px;letter-spacing:0.5px;">TOTAL NUMBER OF SHARES</label>
                        <input type="text" id="ob-share-capital-${idx}-numberOfShares" value="${c.numberOfShares !== undefined && c.numberOfShares !== null ? (Number(c.numberOfShares) ? Number(c.numberOfShares).toLocaleString() : c.numberOfShares) : ''}" placeholder="e.g. 1,000" oninput="obUpdateCurrencyFieldLocal(${idx}, 'numberOfShares', this.value.replace(/,/g, ''))" onchange="obUpdateCurrencyField(${idx}, 'numberOfShares', this.value.replace(/,/g, ''))" ${isReadOnly ? 'disabled' : ''} style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-family:'Inter',sans-serif;box-sizing:border-box;">
                    </div>
                    <div class="ob-field" style="gap:8px;">
                        <label style="color:#64748b;font-weight:700;font-size:11px;letter-spacing:0.5px;">TOTAL ISSUED SHARE CAPITAL AMOUNT</label>
                        <div style="position:relative;display:flex;align-items:center;">
                            <input type="text" id="ob-share-capital-${idx}-shareCapitalAmount" value="${c.shareCapitalAmount !== undefined && c.shareCapitalAmount !== null ? (Number(c.shareCapitalAmount) ? Number(c.shareCapitalAmount).toLocaleString() : c.shareCapitalAmount) : ''}" placeholder="e.g. 1,000" oninput="obUpdateCurrencyFieldLocal(${idx}, 'shareCapitalAmount', this.value.replace(/,/g, ''))" onchange="obUpdateCurrencyField(${idx}, 'shareCapitalAmount', this.value.replace(/,/g, ''))" ${isReadOnly ? 'disabled' : ''} style="width:100%;padding:12px 16px;padding-right:60px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-family:'Inter',sans-serif;box-sizing:border-box;">
                            <div style="position:absolute;right:8px;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;padding:4px 8px;border-radius:8px;">
                                ${currCode || 'SGD'}
                            </div>
                        </div>
                    </div>
                </div>

                ${errorText ? `
                    <div style="color:#ef4444;font-size:11.5px;font-weight:600;margin-top:12px;background:#fef2f2;border:1px solid #fecaca;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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
            return `${curr} ${capitalByCurrency[curr].toLocaleString()}`;
        }).join(', ');

        summaryHtml = `
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-top:32px;">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#16a34a;font-size:24px;font-weight:700;font-family:'Outfit',sans-serif;">$</span>
                    </div>
                    <div>
                        <h5 style="margin:0;font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;color:#0f172a;">Consolidated Summary</h5>
                        <div style="font-size:13px;color:#64748b;margin-top:2px;">Overview of your configured share capital</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:16px;">
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;">
                        <div style="width:48px;height:48px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path><path d="M16.7 16H16v-4"></path></svg>
                        </div>
                        <div>
                            <span style="display:block;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Currencies</span>
                            <span style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:800;color:#0f172a;line-height:1;">${uniqueCurrencies.size}</span>
                        </div>
                    </div>
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;">
                        <div style="width:48px;height:48px;border-radius:12px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                        </div>
                        <div>
                            <span style="display:block;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Shares</span>
                            <span style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:800;color:#0f172a;line-height:1;">${totalShares.toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;">
                        <div style="width:48px;height:48px;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M2 10h20"></path><path d="M12 2l10 5H2z"></path></svg>
                        </div>
                        <div>
                            <span style="display:block;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Total Issued Capital</span>
                            <span style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#0f172a;line-height:1.2;display:block;">${capitalSummaryStrings || 'None'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    let addBtnHtml = '';
    if (!isReadOnly) {
        addBtnHtml = `
            <div style="margin:24px 0 32px 0;display:flex;justify-content:center;">
                <button type="button" onclick="obAddCurrencySection()" style="padding:12px 24px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:14px;color:#3b82f6;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#93c5fd';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Currency Section
                </button>
            </div>
        `;
    }

    const isConfirmed = ob.stepShareCapital.data.isConfirmed === true;
    const confirmHtml = `
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px dashed #cbd5e1;">
            <label style="display:flex; align-items:flex-start; gap:12px; cursor:pointer; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                <input type="checkbox" ${isConfirmed ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} 
                    onchange="obUpdateShareCapitalConfirm(this.checked)"
                    style="width:18px; height:18px; accent-color:#3b82f6; margin-top:2px; cursor:pointer;">
                <span style="font-size:14px; color:#334155; font-weight:600; line-height:1.5;">
                    I have reviewed and confirmed that the Share Capital details above are correct.
                </span>
            </label>
        </div>
    `;

    return sectionsHtml + addBtnHtml + summaryHtml + confirmHtml;
}

window.obUpdateShareCapitalConfirm = function (checked) {
    const ob = state.onboarding;
    if (ob && ob.stepShareCapital && ob.stepShareCapital.data) {
        ob.stepShareCapital.data.isConfirmed = checked;
        triggerAutoSave('share_capital');
        renderActiveStepForm(document.getElementById('ob-dynamic-form'));
        updateStepsSidebar();
    }
};

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
                headers: { 'Content-Type': 'application/json' },
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
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: ob.stepShareCapital.data,
                            status: 'pending'
                        })
                    });
                    if (res.ok) {
                        state.onboarding = normalizeOnboardingData(await res.json());
                    }
                } catch (e) { }
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
        numberOfShares: '',
        shareCapitalAmount: '',
        isCollapsed: false
    });

    await ensureOnboardingRecord();
    if (state.onboardingId) {
        try {
            const res = await fetch(`/api/onboarding/${state.onboardingId}/step/share_capital`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: ob.stepShareCapital.data,
                    status: 'pending'
                })
            });
            if (res.ok) {
                state.onboarding = normalizeOnboardingData(await res.json());
            }
        } catch (e) { }
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: ob.stepShareCapital.data,
                        status: 'pending'
                    })
                });
                if (res.ok) {
                    state.onboarding = normalizeOnboardingData(await res.json());
                }
            } catch (e) { }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
        } catch (e) { }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: stepData.data,
                    documents: stepData.documents,
                    status: 'pending'
                })
            });
        } catch (e) { }
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
        } else if (docType === 'external') {
            ['externalName', 'externalIdNumber', 'externalNationality', 'externalDateOfBirth', 'externalResidentialAddress', 'externalPassportExpiry'].forEach(k => data[k] = '');
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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

async function obSaveStepData(stepKey, data) {
    await ensureOnboardingRecord();
    if (!state.onboardingId) return;

    try {
        const res = await fetch(`/api/onboarding/${state.onboardingId}/step/${stepKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: data,
                status: 'pending'
            })
        });
        if (res.ok) {
            const updated = await res.json();
            state.onboarding = normalizeOnboardingData(updated);
        }
    } catch (e) {
        console.error('Error saving step:', e);
    }
}

window.obCorporateShareholderAnyAdditionalControllerCheckboxChange = (idx, checked) => {
    const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
    const item = state.onboarding[stepField].data.list[idx];
    if (item) {
        item.anyAdditionalController = checked;
        if (!checked) {
            item.additionalControllerDirectors = [];
            item.externalControllers = [];
            if (state.onboarding[stepField].documents) {
                const prefix = `external_passport_${idx}_`;
                state.onboarding[stepField].documents = state.onboarding[stepField].documents.filter(d => !d.type.startsWith(prefix));
            }
        }
        triggerMultiItemAutoSave('corporate_shareholder', idx, true);
    }
};

window.obCorporateShareholderAdditionalControllersCheckboxChange = (idx, dIdx, checked) => {
    const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
    const item = state.onboarding[stepField].data.list[idx];
    if (item) {
        if (!item.additionalControllerDirectors) item.additionalControllerDirectors = [];
        const selected = new Set(item.additionalControllerDirectors);
        if (checked) {
            selected.add(String(dIdx));
        } else {
            selected.delete(String(dIdx));
        }
        item.additionalControllerDirectors = Array.from(selected);
        triggerMultiItemAutoSave('corporate_shareholder', idx);
    }
};

window.obUpdateExternalControllerField = (idx, extIdx, key, value) => {
    const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
    const item = state.onboarding[stepField].data.list[idx];
    if (item && item.externalControllers && item.externalControllers[extIdx]) {
        item.externalControllers[extIdx][key] = value;

        if (key === 'nationality' && value.trim()) {
            const natVal = value.trim();
            const foundCountry = OB_COUNTRIES.find(c => c.name.toLowerCase() === natVal.toLowerCase() || (c.nationality && c.nationality.toLowerCase() === natVal.toLowerCase()));
            if (foundCountry) {
                const mobileInputId = `ob-corporate_shareholder-${idx}-ext-${extIdx}-mobile`;
                if (document.getElementById(mobileInputId)) {
                    obPhoneSelectCountry(mobileInputId, foundCountry.code, foundCountry.dial, foundCountry.maxLen);
                }
            }
        }

        triggerMultiItemAutoSave('corporate_shareholder', idx);
    }
};

window.obUpdateExternalControllerFieldPhone = (idx, extIdx, inputId) => {
    const el = document.getElementById(inputId);
    if (el) {
        const val = el.getAttribute('data-full-val');
        const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
        const item = state.onboarding[stepField].data.list[idx];
        if (item && item.externalControllers && item.externalControllers[extIdx]) {
            item.externalControllers[extIdx].mobile = val;
            triggerMultiItemAutoSave('corporate_shareholder', idx);
        }
    }
};

window.obAddExternalController = (idx) => {
    const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
    const item = state.onboarding[stepField].data.list[idx];
    if (item) {
        if (!item.externalControllers) item.externalControllers = [];
        item.externalControllers.push({
            fullName: '',
            idNumber: '',
            nationality: '',
            dateOfBirth: '',
            residentialAddress: '',
            email: '',
            mobile: '',
            passportExpiry: '',
            passportDoc: ''
        });
        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
        triggerMultiItemAutoSave('corporate_shareholder', idx, true);
    }
};

window.obRemoveExternalController = (idx, extIdx) => {
    const stepField = ONBOARDING_STEPS.find(s => s.key === 'corporate_shareholder').field;
    const item = state.onboarding[stepField].data.list[idx];
    if (item && item.externalControllers) {
        const docKey = `external_passport_${idx}_${extIdx}`;
        if (state.onboarding[stepField].documents) {
            state.onboarding[stepField].documents = state.onboarding[stepField].documents.filter(d => d.type !== docKey);
        }
        item.externalControllers.splice(extIdx, 1);
        const workspace = document.getElementById('ob-form-workspace');
        if (workspace) renderActiveStepForm(workspace);
        triggerMultiItemAutoSave('corporate_shareholder', idx, true);
    }
};

function updateAllocationLimitsUI() {
    const ob = state.onboarding || {};
    const currencies = (ob.stepShareCapital && ob.stepShareCapital.data && ob.stepShareCapital.data.currencies) || [];

    const indStep = ob.step3IndividualShareholder || { data: { list: [] } };
    const indList = indStep.data.list || [];
    const corpStep = ob.step4CorporateShareholder || { data: { list: [] } };
    const corpList = corpStep.data.list || [];

    const usage = {};
    const countUsage = (list) => {
        list.forEach(sh => {
            const shCurr = (sh.currency || '').trim().toUpperCase();
            const shClass = (sh.shareClass || '').trim();
            if (shCurr && shCurr !== 'SELECT' && shClass && shClass.toUpperCase() !== 'SELECT') {
                const key = `${shCurr}_${shClass}`;
                if (!usage[key]) usage[key] = { shares: 0, capital: 0 };
                usage[key].shares += parseFloat(sh.numberOfShares) || 0;
                usage[key].capital += parseFloat(sh.shareCapitalAmount) || 0;
            }
        });
    };
    countUsage(indList);
    countUsage(corpList);

    const updateUI = (list, stepKey) => {
        list.forEach((sh, shIdx) => {
            const shCurr = (sh.currency || '').trim().toUpperCase();
            const shClass = (sh.shareClass || '').trim();
            if (shCurr && shCurr !== 'SELECT' && shClass && shClass.toUpperCase() !== 'SELECT') {
                const masterItem = currencies.find(c => {
                    const masterCurr = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
                    return masterCurr.toUpperCase() === shCurr && c.shareClass === shClass;
                });

                if (masterItem) {
                    const key = `${shCurr}_${shClass}`;
                    const usedShares = usage[key] ? usage[key].shares : 0;
                    const usedCapital = usage[key] ? usage[key].capital : 0;

                    const myShares = parseFloat(sh.numberOfShares) || 0;
                    const myCapital = parseFloat(sh.shareCapitalAmount) || 0;

                    const otherUsedShares = usedShares - myShares;
                    const otherUsedCapital = usedCapital - myCapital;

                    const availableShares = masterItem.numberOfShares - otherUsedShares;
                    const availableCapital = masterItem.shareCapitalAmount - otherUsedCapital;

                    const sharesWarnEl = document.getElementById(`ob-${stepKey}-${shIdx}-numberOfShares-limit-warn`);
                    if (sharesWarnEl) {
                        if (myShares > availableShares) {
                            sharesWarnEl.innerHTML = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">⚠️ Warning: Allocation (${myShares}) exceeds available limit of ${availableShares} shares.</div>`;
                        } else {
                            sharesWarnEl.innerHTML = `<div style="color:#16a34a;font-size:10px;font-weight:600;margin-top:4px;">Available limit: ${availableShares} shares (total master: ${masterItem.numberOfShares})</div>`;
                        }
                    }

                    const capitalWarnEl = document.getElementById(`ob-${stepKey}-${shIdx}-shareCapitalAmount-limit-warn`);
                    if (capitalWarnEl) {
                        if (myCapital > availableCapital) {
                            capitalWarnEl.innerHTML = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">⚠️ Warning: Allocation (${myCapital}) exceeds available limit of ${availableCapital} ${shCurr}.</div>`;
                        } else {
                            capitalWarnEl.innerHTML = `<div style="color:#16a34a;font-size:10px;font-weight:600;margin-top:4px;">Available limit: ${availableCapital} ${shCurr} (total master: ${masterItem.shareCapitalAmount})</div>`;
                        }
                    }
                }
            }
        });
    };

    updateUI(indList, 'individual_shareholder');
    updateUI(corpList, 'corporate_shareholder');
}
window.updateAllocationLimitsUI = updateAllocationLimitsUI;

function obRenderIndividualShareholderHtml(isReadOnly) {
    const ob = state.onboarding || {};

    // Generate progress bars from share capital details
    const scStep = ob.stepShareCapital || {};
    const scData = scStep.data || {};
    const scCurrencies = scData.currencies || [];

    let progressBarsHtml = '';
    if (scCurrencies.length === 0) {
        progressBarsHtml = `
            <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:16px; margin-bottom:24px; color:#b45309; font-size:13px; font-weight:600; text-align:center;">
                ⚠️ No Share Capital details configured. Please configure Share Capital Details first.
            </div>
        `;
    } else {
        const allocations = {};
        scCurrencies.forEach(c => {
            const code = c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
            const sClass = c.shareClass || 'Ordinary';
            const key = `${code}_${sClass}`;
            allocations[key] = {
                totalShares: parseFloat(String(c.numberOfShares || '0').replace(/,/g, '')) || 0,
                totalCapital: parseFloat(String(c.shareCapitalAmount || '0').replace(/,/g, '')) || 0,
                allocatedShares: 0,
                allocatedCapital: 0,
                currency: code,
                shareClass: sClass
            };
        });

        // Sum Individual Shareholders
        const indStep = ob.step3IndividualShareholder || {};
        const indList = (indStep.data && indStep.data.list) || [];
        indList.forEach(sh => {
            const shCurr = (sh.currency || '').trim().toUpperCase();
            const shClass = (sh.shareClass || '').trim();
            const key = `${shCurr}_${shClass}`;
            if (allocations[key]) {
                allocations[key].allocatedShares += parseFloat(String(sh.numberOfShares || '0').replace(/,/g, '')) || 0;
                allocations[key].allocatedCapital += parseFloat(String(sh.shareCapitalAmount || '0').replace(/,/g, '')) || 0;
            }
        });

        // Sum Corporate Shareholders
        const corpStep = ob.step4CorporateShareholder || {};
        const corpList = (corpStep.data && corpStep.data.list) || [];
        corpList.forEach(sh => {
            const shCurr = (sh.currency || '').trim().toUpperCase();
            const shClass = (sh.shareClass || '').trim();
            const key = `${shCurr}_${shClass}`;
            if (allocations[key]) {
                allocations[key].allocatedShares += parseFloat(String(sh.numberOfShares || '0').replace(/,/g, '')) || 0;
                allocations[key].allocatedCapital += parseFloat(String(sh.shareCapitalAmount || '0').replace(/,/g, '')) || 0;
            }
        });

        progressBarsHtml = `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:20px; margin-bottom:24px; display:flex; flex-direction:column; gap:16px;">
            <h5 style="font-size:13.5px; font-weight:700; color:#334155; margin:0;">📈 Capital Allocation Progress (Step 2 Configurations)</h5>`;

        Object.values(allocations).forEach(alloc => {
            const pct = alloc.totalShares > 0 ? Math.min(100, Math.round((alloc.allocatedShares / alloc.totalShares) * 100)) : 0;
            let barColor = '#3b82f6';
            if (Math.abs(alloc.allocatedShares - alloc.totalShares) < 0.1) {
                barColor = '#10b981';
            } else if (alloc.allocatedShares > alloc.totalShares) {
                barColor = '#ef4444';
            }

            progressBarsHtml += `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">
                        <span>${alloc.currency} ${alloc.shareClass} Shares</span>
                        <span>${alloc.allocatedShares.toLocaleString()} / ${alloc.totalShares.toLocaleString()} Shares (${pct}%)</span>
                    </div>
                    <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:4px; transition:width 0.3s;"></div>
                    </div>
                </div>
            `;
        });
        progressBarsHtml += `</div>`;
    }

    const activeTab = state.activeShareholderTab || 'individual';

    const tabStyles = `
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 8px;
        flex-wrap: wrap;
    `;

    const getTabBtnClass = (tabKey) => {
        const isActive = activeTab === tabKey;
        return `
            padding: 10px 20px;
            font-size: 13.5px;
            font-weight: 600;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            background: ${isActive ? '#eff6ff' : 'transparent'};
            color: ${isActive ? '#2563eb' : '#64748b'};
            box-shadow: ${isActive ? '0 2px 4px rgba(37, 99, 235, 0.05)' : 'none'};
        `;
    };

    const tabsHtml = `
        <div style="${tabStyles}">
            <button type="button" style="${getTabBtnClass('individual')}" onclick="obSetShareholderTab('individual')">
                👤 Individual Shareholders
            </button>
            <button type="button" style="${getTabBtnClass('corporate')}" onclick="obSetShareholderTab('corporate')">
                🏢 Corporate Shareholders
            </button>
            <button type="button" style="${getTabBtnClass('rep')}" onclick="obSetShareholderTab('rep')">
                👔 Corporate Representatives
            </button>
            <button type="button" style="${getTabBtnClass('rons')}" onclick="obSetShareholderTab('rons')">
                🤝 Nominee Shareholders (RONS)
            </button>
        </div>
    `;

    let contentHtml = '';
    if (activeTab === 'individual') {
        contentHtml = obRenderIndividualShareholderTableHtml(isReadOnly);
    } else if (activeTab === 'corporate') {
        contentHtml = obRenderCorporateShareholderTableHtml(isReadOnly);
    } else if (activeTab === 'rep') {
        contentHtml = obRenderCorporateRepTableHtml(isReadOnly);
    } else if (activeTab === 'rons') {
        contentHtml = obRenderRonsTableHtml(isReadOnly);
    }

    return `
        <div style="font-family:'Outfit', sans-serif;">
            ${progressBarsHtml}
            ${tabsHtml}
            <div style="margin-top: 16px;">
                ${contentHtml}
            </div>
        </div>
    `;
}

function obRenderIndividualShareholderTableHtml(isReadOnly) {
    const ob = state.onboarding || {};
    const stepField = 'step3IndividualShareholder';
    const stepData = ob[stepField] || { status: 'pending', data: {}, documents: [] };
    const data = stepData.data || {};
    const list = data.list || [];

    if (!Array.isArray(list) || list.length === 0) {
        if (!data.list) data.list = [];
        data.list.push({
            fullName: '',
            numberOfSharesPct: '',
            shareCapitalAmountPct: '',
            numberOfShares: '',
            shareCapitalAmount: '',
            currency: 'Select',
            shareClass: 'Select',
            email: '',
            mobile: '',
            idNumber: '',
            residentialAddress: '',
            sameAsDirector: false,
            selectedDirectorIdx: '',
            uboDeclaration: 'Select',
            isNominee: false
        });
    }

    const scStep = ob.stepShareCapital || {};
    const scData = scStep.data || {};
    const scCurrencies = scData.currencies || [];
    
    const currenciesList = Array.from(new Set(scCurrencies.map(c => {
        if (!c) return '';
        return c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
    }))).filter(Boolean);
    const classesList = Array.from(new Set(scCurrencies.map(c => c ? c.shareClass : ''))).filter(Boolean);

    const currs = currenciesList.length > 0 ? ['Select', ...currenciesList] : ['Select', 'SGD', 'USD'];
    const classes = classesList.length > 0 ? ['Select', ...classesList] : ['Select', 'Ordinary', 'Preference'];

    const dirStep = ONBOARDING_STEPS.find(s => s.key === 'director_details');
    const dirList = dirStep && ob[dirStep.field] ? (ob[dirStep.field].data.list || []) : [];

    let rowsHtml = data.list.map((item, idx) => {
        const isSame = item.sameAsDirector === true || item.sameAsDirector === 'true';

        // Auto-default if only one option is available
        if (!item.currency && currenciesList.length === 1) {
            item.currency = currenciesList[0];
        }
        if (!item.shareClass && classesList.length === 1) {
            item.shareClass = classesList[0];
        }

        // Unique director selection list
        const selectedDirectorIndices = new Set();
        data.list.forEach((sh, shIdx) => {
            if (shIdx !== idx && (sh.sameAsDirector === true || sh.sameAsDirector === 'true') && sh.selectedDirectorIdx !== undefined && sh.selectedDirectorIdx !== '') {
                selectedDirectorIndices.add(String(sh.selectedDirectorIdx));
            }
        });

        const dirDropdownOptions = dirList.map((d, dIdx) => {
            const isSelected = String(item.selectedDirectorIdx) === String(dIdx);
            if (!isSelected && selectedDirectorIndices.has(String(dIdx))) {
                return '';
            }
            return `<option value="${dIdx}" ${isSelected ? 'selected' : ''}>Director #${dIdx + 1}: ${d.fullName || 'Unnamed'}</option>`;
        }).join('');

        const amtVal = (item.shareCapitalAmount !== undefined && item.shareCapitalAmount !== '') ? parseFloat(item.shareCapitalAmount).toLocaleString() : '';
        const sharesVal = (item.numberOfShares !== undefined && item.numberOfShares !== '') ? parseFloat(item.numberOfShares).toLocaleString() : '';

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="text-align:center; padding:12px 8px; font-weight:700; color:#64748b; font-size:12.5px;">${idx + 1}</td>
                <td style="padding:8px;">
                    <input type="text" id="ob-individual_shareholder-${idx}-fullName" value="${item.fullName || ''}" placeholder="Name" ${isReadOnly || isSame ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateIndividualShareholderField(${idx}, 'fullName', this.value)" style="width:100%; min-width:140px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px; text-align:center;">
                    <input type="checkbox" id="ob-individual_shareholder-${idx}-sameAsDirector" ${isSame ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obIndividualShareholderSameAsDirectorCheckboxChange(${idx}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
                </td>
                <td style="padding:8px;">
                    ${isSame ? `
                        <select id="ob-individual_shareholder-${idx}-sameAsDirectorSelect" onchange="obIndividualShareholderSameAsDirectorChange(${idx}, this.value)" ${isReadOnly ? 'disabled' : ''} style="width:100%; min-width:140px; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; font-size:12px; outline:none; background:#ffffff; color:#334155;">
                            <option value="">Select Director</option>
                            ${dirDropdownOptions}
                        </select>
                    ` : `<span style="color:#94a3b8; font-size:12px; font-style:italic;">Manual Entry</span>`}
                </td>
                <td style="padding:8px;">
                    <input type="number" id="ob-individual_shareholder-${idx}-numberOfSharesPct" value="${item.numberOfSharesPct || ''}" placeholder="%" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateIndividualShareholderField(${idx}, 'numberOfSharesPct', this.value)" style="width:100%; min-width:60px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-individual_shareholder-${idx}-shareCapitalAmount" value="${amtVal}" readonly style="width:100%; min-width:100px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; color:#64748b; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-individual_shareholder-${idx}-numberOfShares" value="${sharesVal}" readonly style="width:100%; min-width:100px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; color:#64748b; outline:none;">
                </td>
                <td style="padding:8px;">
                    <select id="ob-individual_shareholder-${idx}-currency" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateIndividualShareholderField(${idx}, 'currency', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        ${currs.map(c => `<option value="${c}" ${String(item.currency).trim().toUpperCase() === String(c).trim().toUpperCase() ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:8px;">
                    <select id="ob-individual_shareholder-${idx}-shareClass" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateIndividualShareholderField(${idx}, 'shareClass', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        ${classes.map(c => `<option value="${c}" ${String(item.shareClass).trim().toLowerCase() === String(c).trim().toLowerCase() ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:8px;">
                    <input type="email" id="ob-individual_shareholder-${idx}-email" value="${item.email || ''}" placeholder="Email" ${isReadOnly || isSame ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateIndividualShareholderField(${idx}, 'email', this.value)" style="width:100%; min-width:120px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-individual_shareholder-${idx}-mobile" value="${item.mobile || ''}" placeholder="Phone" ${isReadOnly || isSame ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateIndividualShareholderField(${idx}, 'mobile', this.value)" style="width:100%; min-width:110px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-individual_shareholder-${idx}-idNumber" value="${item.idNumber || ''}" placeholder="ID / NRIC" ${isReadOnly || isSame ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateIndividualShareholderField(${idx}, 'idNumber', this.value)" style="width:100%; min-width:100px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <select id="ob-individual_shareholder-${idx}-uboDeclaration" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateIndividualShareholderField(${idx}, 'uboDeclaration', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        <option value="Select" ${item.uboDeclaration === 'Select' ? 'selected' : ''}>Select</option>
                        <option value="No" ${item.uboDeclaration === 'No' ? 'selected' : ''}>No</option>
                        <option value="Yes" ${item.uboDeclaration === 'Yes' ? 'selected' : ''}>Yes</option>
                    </select>
                </td>
                <td style="padding:8px; text-align:center;">
                    <input type="checkbox" id="ob-individual_shareholder-${idx}-isNominee" ${item.isNominee === true || item.isNominee === 'true' ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateIndividualShareholderField(${idx}, 'isNominee', this.checked)" style="width:16px; height:16px; cursor:pointer;">
                </td>
                <td style="padding:12px 8px; text-align:center;">
                    ${isReadOnly ? '' : `
                        <button type="button" onclick="removeMultiItem('individual_shareholder', ${idx})" style="padding:6px; background:#fee2e2; border:none; border-radius:8px; color:#ef4444; cursor:pointer;" title="Delete Row">🗑️</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    const actionButtonHtml = isReadOnly ? '' : `
        <div style="margin-top:16px; display:flex; justify-content:center; padding:12px;">
            <button type="button" onclick="addMultiItem('individual_shareholder')" style="padding:10px 20px; background:#eff6ff; border:1px dashed #bfdbfe; border-radius:12px; color:#2563eb; font-weight:700; font-family:'Inter'; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                ➕ Add Shareholder Row
            </button>
        </div>
    `;

    return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.015); margin-bottom:24px;">
            <div style="overflow-x:auto; width:100%;">
                <table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Inter', sans-serif;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:40px;">S.No.</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Shareholder Name</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px; text-align:center;">Same as Dir?</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Director Source</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px;">Share Capital %</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Share Capital Amt</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Number of Shares</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:95px;">Currency</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:110px;">Share Class</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Email</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Mobile</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">ID / NRIC</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px;">UBO</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px; text-align:center;">Nominee</th>
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:50px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ${actionButtonHtml}
        </div>
    `;
}

function obRenderCorporateShareholderTableHtml(isReadOnly) {
    const ob = state.onboarding || {};
    const stepField = 'step4CorporateShareholder';
    const stepData = ob[stepField] || { status: 'pending', data: {}, documents: [] };
    const data = stepData.data || {};
    const list = data.list || [];

    if (!Array.isArray(list) || list.length === 0) {
        if (!data.list) data.list = [];
        data.list.push({
            companyName: '',
            uen: '',
            dateOfIncorporation: '',
            registeredAddress: '',
            numberOfSharesPct: '',
            shareCapitalAmountPct: '',
            numberOfShares: '',
            shareCapitalAmount: '',
            currency: 'Select',
            shareClass: 'Select',
            uboDeclaration: 'Select',
            isNominee: false
        });
    }

    const scStep = ob.stepShareCapital || {};
    const scData = scStep.data || {};
    const scCurrencies = scData.currencies || [];
    
    const currenciesList = Array.from(new Set(scCurrencies.map(c => {
        if (!c) return '';
        return c.currency === 'Others' ? (c.customCurrency || '').trim().toUpperCase() : c.currency;
    }))).filter(Boolean);
    const classesList = Array.from(new Set(scCurrencies.map(c => c ? c.shareClass : ''))).filter(Boolean);

    const currs = currenciesList.length > 0 ? ['Select', ...currenciesList] : ['Select', 'SGD', 'USD'];
    const classes = classesList.length > 0 ? ['Select', ...classesList] : ['Select', 'Ordinary', 'Preference'];

    let rowsHtml = data.list.map((item, idx) => {
        // Auto-default if only one option is available
        if (!item.currency && currenciesList.length === 1) {
            item.currency = currenciesList[0];
        }
        if (!item.shareClass && classesList.length === 1) {
            item.shareClass = classesList[0];
        }

        const amtVal = (item.shareCapitalAmount !== undefined && item.shareCapitalAmount !== '') ? parseFloat(item.shareCapitalAmount).toLocaleString() : '';
        const sharesVal = (item.numberOfShares !== undefined && item.numberOfShares !== '') ? parseFloat(item.numberOfShares).toLocaleString() : '';

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="text-align:center; padding:12px 8px; font-weight:700; color:#64748b; font-size:12.5px;">${idx + 1}</td>
                <td style="padding:8px;">
                    <input type="text" id="ob-corporate_shareholder-${idx}-companyName" value="${item.companyName || ''}" placeholder="Company Name" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateShareholderField(${idx}, 'companyName', this.value)" style="width:100%; min-width:140px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-corporate_shareholder-${idx}-uen" value="${item.uen || ''}" placeholder="UEN / Reg Number" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateShareholderField(${idx}, 'uen', this.value)" style="width:100%; min-width:120px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="date" id="ob-corporate_shareholder-${idx}-dateOfIncorporation" value="${item.dateOfIncorporation || ''}" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateShareholderField(${idx}, 'dateOfIncorporation', this.value)" style="width:100%; min-width:130px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-corporate_shareholder-${idx}-registeredAddress" value="${item.registeredAddress || ''}" placeholder="Address" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateShareholderField(${idx}, 'registeredAddress', this.value)" style="width:100%; min-width:160px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="number" id="ob-corporate_shareholder-${idx}-numberOfSharesPct" value="${item.numberOfSharesPct || ''}" placeholder="%" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateCorporateShareholderField(${idx}, 'numberOfSharesPct', this.value)" style="width:100%; min-width:60px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-corporate_shareholder-${idx}-shareCapitalAmount" value="${amtVal}" readonly style="width:100%; min-width:100px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; color:#64748b; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" id="ob-corporate_shareholder-${idx}-numberOfShares" value="${sharesVal}" readonly style="width:100%; min-width:100px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; color:#64748b; outline:none;">
                </td>
                <td style="padding:8px;">
                    <select id="ob-corporate_shareholder-${idx}-currency" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateCorporateShareholderField(${idx}, 'currency', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        ${currs.map(c => `<option value="${c}" ${String(item.currency).trim().toUpperCase() === String(c).trim().toUpperCase() ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:8px;">
                    <select id="ob-corporate_shareholder-${idx}-shareClass" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateCorporateShareholderField(${idx}, 'shareClass', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        ${classes.map(c => `<option value="${c}" ${String(item.shareClass).trim().toLowerCase() === String(c).trim().toLowerCase() ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:8px;">
                    <select id="ob-corporate_shareholder-${idx}-uboDeclaration" ${isReadOnly ? 'disabled' : ''} onchange="obUpdateCorporateShareholderField(${idx}, 'uboDeclaration', this.value)" style="width:100%; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        <option value="Select" ${item.uboDeclaration === 'Select' ? 'selected' : ''}>Select</option>
                        <option value="No" ${item.uboDeclaration === 'No' ? 'selected' : ''}>No</option>
                        <option value="Yes" ${item.uboDeclaration === 'Yes' ? 'selected' : ''}>Yes</option>
                    </select>
                </td>
                <td style="padding:8px; text-align:center;">
                    <input type="checkbox" id="ob-corporate_shareholder-${idx}-isNominee" ${item.isNominee === true || item.isNominee === 'true' ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateCorporateShareholderField(${idx}, 'isNominee', this.checked)" style="width:16px; height:16px; cursor:pointer;">
                </td>
                <td style="padding:12px 8px; text-align:center;">
                    ${isReadOnly ? '' : `
                        <button type="button" onclick="removeMultiItem('corporate_shareholder', ${idx})" style="padding:6px; background:#fee2e2; border:none; border-radius:8px; color:#ef4444; cursor:pointer;" title="Delete Row">🗑️</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    const actionButtonHtml = isReadOnly ? '' : `
        <div style="margin-top:16px; display:flex; justify-content:center; padding:12px;">
            <button type="button" onclick="addMultiItem('corporate_shareholder')" style="padding:10px 20px; background:#eff6ff; border:1px dashed #bfdbfe; border-radius:12px; color:#2563eb; font-weight:700; font-family:'Inter'; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                ➕ Add Corporate Shareholder Row
            </button>
        </div>
    `;

    return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.015); margin-bottom:24px;">
            <div style="overflow-x:auto; width:100%;">
                <table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Inter', sans-serif;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:40px;">S.No.</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Company Name</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">UEN / Reg Number</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Incorporation Date</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Registered Address</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px;">Share Capital %</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Share Capital Amt</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Number of Shares</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:95px;">Currency</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:110px;">Share Class</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px;">UBO</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569; width:90px; text-align:center;">Nominee</th>
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:50px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ${actionButtonHtml}
        </div>
    `;
}

function obRenderCorporateRepTableHtml(isReadOnly) {
    const ob = state.onboarding || {};
    const repField = 'step6CorporateRep';
    const repData = ob[repField] || { status: 'pending', data: { list: [] }, documents: [] };
    const data = repData.data || { list: [] };
    const list = data.list || [];

    if (!Array.isArray(list) || list.length === 0) {
        if (!data.list) data.list = [];
        data.list.push({
            corporateShareholderUen: '',
            fullName: '',
            idNumber: '',
            nationality: '',
            dateOfBirth: '',
            residentialAddress: '',
            email: '',
            mobile: '',
            passportExpiry: ''
        });
    }

    const corpStep = ob.step4CorporateShareholder || {};
    const corpList = (corpStep.data && corpStep.data.list) || [];

    let rowsHtml = list.map((item, idx) => {
        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="text-align:center; padding:12px 8px; font-weight:700; color:#64748b; font-size:12.5px;">${idx + 1}</td>
                <td style="padding:8px;">
                    <select ${isReadOnly ? 'disabled' : ''} onchange="obUpdateCorporateRepField(${idx}, 'corporateShareholderUen', this.value)" style="width:100%; min-width:150px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                        <option value="">Select Company</option>
                        ${corpList.map(c => `<option value="${c.uen || ''}" ${String(item.corporateShareholderUen) === String(c.uen) ? 'selected' : ''}>${c.companyName || 'Unnamed'}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${item.fullName || ''}" placeholder="Name" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'fullName', this.value)" style="width:100%; min-width:140px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${item.idNumber || ''}" placeholder="ID / Passport" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'idNumber', this.value)" style="width:100%; min-width:110px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${item.nationality || ''}" placeholder="Nationality" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'nationality', this.value)" style="width:100%; min-width:110px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="date" value="${item.dateOfBirth || ''}" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'dateOfBirth', this.value)" style="width:100%; min-width:130px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${item.residentialAddress || ''}" placeholder="Address" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'residentialAddress', this.value)" style="width:100%; min-width:160px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="email" value="${item.email || ''}" placeholder="Email" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'email', this.value)" style="width:100%; min-width:120px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${item.mobile || ''}" placeholder="Mobile" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'mobile', this.value)" style="width:100%; min-width:110px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:8px;">
                    <input type="date" value="${item.passportExpiry || ''}" ${isReadOnly ? 'readonly style="background:#f8fafc; color:#64748b;"' : ''} oninput="obUpdateCorporateRepField(${idx}, 'passportExpiry', this.value)" style="width:100%; min-width:130px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                </td>
                <td style="padding:12px 8px; text-align:center;">
                    ${isReadOnly ? '' : `
                        <button type="button" onclick="removeMultiItem('corporate_rep', ${idx})" style="padding:6px; background:#fee2e2; border:none; border-radius:8px; color:#ef4444; cursor:pointer;" title="Delete Row">🗑️</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    const actionButtonHtml = isReadOnly ? '' : `
        <div style="margin-top:16px; display:flex; justify-content:center; padding:12px;">
            <button type="button" onclick="addMultiItem('corporate_rep')" style="padding:10px 20px; background:#eff6ff; border:1px dashed #bfdbfe; border-radius:12px; color:#2563eb; font-weight:700; font-family:'Inter'; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                ➕ Add Representative Row
            </button>
        </div>
    `;

    return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.015); margin-bottom:24px;">
            <div style="overflow-x:auto; width:100%;">
                <table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Inter', sans-serif;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:40px;">S.No.</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Corporate Shareholder</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Representative Name</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Passport / ID</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Nationality</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Date of Birth</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Residential Address</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Email</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Mobile Number</th>
                            <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Passport Expiry Date</th>
                            <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:50px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ${actionButtonHtml}
        </div>
    `;
}

function obRenderRonsTableHtml(isReadOnly) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    const stepData = ob[stepField] || { status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] };
    const data = stepData.data || { hasNominee: 'No', nomineeList: [] };

    if (!data.nomineeList) data.nomineeList = [];
    if (!data.hasNominee) data.hasNominee = 'No';

    const isYes = data.hasNominee === 'Yes';

    // Get all nominee-flagged shareholders
    const indStep = ob.step3IndividualShareholder || { data: { list: [] } };
    const indList = indStep.data.list || [];
    const corpStep = ob.step4CorporateShareholder || { data: { list: [] } };
    const corpList = corpStep.data.list || [];

    const nomineeShareholders = [];
    indList.forEach((sh, idx) => {
        if (sh.isNominee === true || sh.isNominee === 'true') {
            nomineeShareholders.push({
                id: `individual_${idx}`,
                name: sh.fullName || `Unnamed Individual Shareholder #${idx + 1}`
            });
        }
    });
    corpList.forEach((sh, idx) => {
        if (sh.isNominee === true || sh.isNominee === 'true') {
            nomineeShareholders.push({
                id: `corporate_${idx}`,
                name: sh.companyName || `Unnamed Corporate Shareholder #${idx + 1}`
            });
        }
    });

    let tableHtml = '';
    if (isYes) {
        if (nomineeShareholders.length === 0) {
            tableHtml = `
                <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:16px; color:#b45309; font-size:13px; font-weight:600; text-align:center; margin-top:16px;">
                    ⚠️ Please check the "Nominee" checkbox for the nominee shareholders in the Individual or Corporate tabs first.
                </div>
            `;
        } else {
            if (data.nomineeList.length === 0) {
                data.nomineeList.push({ shareholderId: '', type: '', email: '', mobile: '' });
            }

            let rowsHtml = data.nomineeList.map((nom, idx) => {
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="text-align:center; padding:12px 8px; font-weight:700; color:#64748b; font-size:12.5px;">${idx + 1}</td>
                        <td style="padding:8px;">
                            <select ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsNomineeShareholder(${idx}, this.value)" style="width:100%; min-width:180px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none; background:#ffffff; color:#334155;">
                                <option value="">Select Nominee Shareholder</option>
                                ${nomineeShareholders.map(s => `<option value="${s.id}" ${nom.shareholderId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </td>
                        <td style="padding:8px;">
                            <input type="email" value="${nom.email || ''}" placeholder="Email" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateRonsNomineeField(${idx}, 'email', this.value)" style="width:100%; min-width:150px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                        </td>
                        <td style="padding:8px;">
                            <input type="text" value="${nom.mobile || ''}" placeholder="Mobile" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateRonsNomineeField(${idx}, 'mobile', this.value)" style="width:100%; min-width:120px; font-size:12.5px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; outline:none;">
                        </td>
                        <td style="padding:12px 8px; text-align:center;">
                            ${isReadOnly ? '' : `
                                <button type="button" onclick="obRemoveRonsNominee(${idx})" style="padding:6px; background:#fee2e2; border:none; border-radius:8px; color:#ef4444; cursor:pointer;" title="Delete Row">🗑️</button>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');

            const actionButtonHtml = isReadOnly ? '' : `
                <div style="margin-top:16px; display:flex; justify-content:center; padding:12px;">
                    <button type="button" onclick="obAddRonsNominee()" style="padding:10px 20px; background:#eff6ff; border:1px dashed #bfdbfe; border-radius:12px; color:#2563eb; font-weight:700; font-family:'Inter'; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        ➕ Add Nominee Row
                    </button>
                </div>
            `;

            tableHtml = `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.015); margin-top:20px; margin-bottom:24px;">
                    <div style="overflow-x:auto; width:100%;">
                        <table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Inter', sans-serif;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                                    <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:40px;">S.No.</th>
                                    <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Nominee Shareholder</th>
                                    <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Email Address</th>
                                    <th style="padding:12px 8px; font-size:12px; font-weight:700; color:#475569;">Contact Number</th>
                                    <th style="padding:12px 8px; text-align:center; font-size:12px; font-weight:700; color:#475569; width:50px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    ${actionButtonHtml}
                </div>
            `;
        }
    } else {
        tableHtml = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px; padding:20px; text-align:center; color:#166534; font-size:13.5px; font-weight:500; margin-top:20px; font-family:'Inter';">
                ✅ No nominee shareholders declared.
            </div>
        `;
    }

    return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.015);">
            <div style="font-size:14px; font-weight:600; color:#334155; margin-bottom:12px;">Is any shareholder a nominee shareholder?</div>
            <div style="display:flex; gap:24px; margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#475569; cursor:pointer;">
                    <input type="radio" name="hasNominee" value="Yes" ${isYes ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsHasNominee('Yes')" style="width:18px; height:18px; cursor:pointer;">
                    Yes
                </label>
                <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#475569; cursor:pointer;">
                    <input type="radio" name="hasNominee" value="No" ${!isYes ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsHasNominee('No')" style="width:18px; height:18px; cursor:pointer;">
                    No
                </label>
            </div>
            ${tableHtml}
        </div>
    `;
}

function obUpdateCorporateShareholderField(idx, key, value) {
    const ob = state.onboarding || {};
    const stepField = 'step4CorporateShareholder';
    
    if (!ob[stepField]) {
        ob[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
    }
    if (!ob[stepField].data) {
        ob[stepField].data = { list: [] };
    }
    if (!ob[stepField].data.list) {
        ob[stepField].data.list = [];
    }
    if (!ob[stepField].data.list[idx]) {
        ob[stepField].data.list[idx] = {};
    }
    
    ob[stepField].data.list[idx][key] = value;
    
    if (key === 'numberOfSharesPct') {
        ob[stepField].data.list[idx].shareCapitalAmountPct = value;
        if (value === '') {
            ob[stepField].data.list[idx].numberOfShares = '';
            ob[stepField].data.list[idx].shareCapitalAmount = '';
            ob[stepField].data.list[idx].ownershipPercentage = '';
        }
    }

    try {
        if (key === 'numberOfSharesPct' || key === 'currency' || key === 'shareClass') {
            const pctValStr = String(ob[stepField].data.list[idx].numberOfSharesPct || '').trim();
            if (pctValStr === '') {
                ob[stepField].data.list[idx].numberOfShares = '';
                ob[stepField].data.list[idx].shareCapitalAmount = '';
                ob[stepField].data.list[idx].ownershipPercentage = '';
            } else {
                const pct = parseFloat(pctValStr) || 0;
                const currEl = document.getElementById(`ob-corporate_shareholder-${idx}-currency`);
                const classEl = document.getElementById(`ob-corporate_shareholder-${idx}-shareClass`);
                const shCurr = (ob[stepField].data.list[idx].currency || (currEl ? currEl.value : '') || '').trim().toUpperCase();
                const shClass = (ob[stepField].data.list[idx].shareClass || (classEl ? classEl.value : '') || '').trim();

                const scStep = ob.stepShareCapital || {};
                const scCurrencies = (scStep.data && scStep.data.currencies) || [];
                const masterItem = scCurrencies.find(c => {
                    if (!c) return false;
                    const masterCurr = String(c.currency === 'Others' ? (c.customCurrency || '') : (c.currency || '')).trim().toUpperCase();
                    const masterClass = String(c.shareClass || '').trim().toLowerCase();
                    return masterCurr === shCurr.toUpperCase() && masterClass === shClass.toLowerCase();
                });

                if (masterItem) {
                    const mShares = parseFloat(String(masterItem.numberOfShares || '0').replace(/,/g, '')) || 0;
                    const mCapital = parseFloat(String(masterItem.shareCapitalAmount || '0').replace(/,/g, '')) || 0;

                    const calculatedShares = Math.round((pct / 100) * mShares);
                    const calculatedCapital = (pct / 100) * mCapital;

                    ob[stepField].data.list[idx].numberOfShares = calculatedShares;
                    ob[stepField].data.list[idx].shareCapitalAmount = calculatedCapital;
                    ob[stepField].data.list[idx].ownershipPercentage = pct;

                    if (!ob[stepField].data.list[idx].currency) {
                        ob[stepField].data.list[idx].currency = shCurr;
                    }
                    if (!ob[stepField].data.list[idx].shareClass) {
                        ob[stepField].data.list[idx].shareClass = shClass;
                    }
                } else {
                    ob[stepField].data.list[idx].numberOfShares = '';
                    ob[stepField].data.list[idx].shareCapitalAmount = '';
                    ob[stepField].data.list[idx].ownershipPercentage = '';
                }
            }
        }
    } catch (err) {
        console.error("Error calculating corporate shareholder fields:", err);
    }

    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

function obUpdateCorporateRepField(idx, key, value) {
    const ob = state.onboarding || {};
    const stepField = 'step6CorporateRep';
    
    if (!ob[stepField]) {
        ob[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
    }
    if (!ob[stepField].data) {
        ob[stepField].data = { list: [] };
    }
    if (!ob[stepField].data.list) {
        ob[stepField].data.list = [];
    }
    if (!ob[stepField].data.list[idx]) {
        ob[stepField].data.list[idx] = {};
    }
    
    ob[stepField].data.list[idx][key] = value;
    
    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

window.obRenderIndividualShareholderTableHtml = obRenderIndividualShareholderTableHtml;
window.obRenderCorporateShareholderTableHtml = obRenderCorporateShareholderTableHtml;
window.obRenderCorporateRepTableHtml = obRenderCorporateRepTableHtml;
window.obRenderRonsTableHtml = obRenderRonsTableHtml;
window.obUpdateCorporateShareholderField = obUpdateCorporateShareholderField;
window.obUpdateCorporateRepField = obUpdateCorporateRepField;

function obUpdateIndividualShareholderField(idx, key, value) {
    const ob = state.onboarding || {};
    const stepField = 'step3IndividualShareholder';
    
    if (!ob[stepField]) {
        ob[stepField] = { data: { list: [] }, status: 'pending', documents: [] };
    }
    if (!ob[stepField].data) {
        ob[stepField].data = { list: [] };
    }
    if (!ob[stepField].data.list) {
        ob[stepField].data.list = [];
    }
    if (!ob[stepField].data.list[idx]) {
        ob[stepField].data.list[idx] = {};
    }
    
    ob[stepField].data.list[idx][key] = value;
    
    if (key === 'numberOfSharesPct') {
        ob[stepField].data.list[idx].shareCapitalAmountPct = value;
        if (value === '') {
            ob[stepField].data.list[idx].numberOfShares = '';
            ob[stepField].data.list[idx].shareCapitalAmount = '';
            ob[stepField].data.list[idx].ownershipPercentage = '';
        }
    }

    // Auto-calculate logic here!
    try {
        if (key === 'numberOfSharesPct' || key === 'currency' || key === 'shareClass') {
            const pctValStr = String(ob[stepField].data.list[idx].numberOfSharesPct || '').trim();
            if (pctValStr === '') {
                ob[stepField].data.list[idx].numberOfShares = '';
                ob[stepField].data.list[idx].shareCapitalAmount = '';
                ob[stepField].data.list[idx].ownershipPercentage = '';
            } else {
                // Calculate shares and capital based on percentage
                const pct = parseFloat(pctValStr) || 0;
                const currEl = document.getElementById(`ob-individual_shareholder-${idx}-currency`);
                const classEl = document.getElementById(`ob-individual_shareholder-${idx}-shareClass`);
                const shCurr = (ob[stepField].data.list[idx].currency || (currEl ? currEl.value : '') || '').trim().toUpperCase();
                const shClass = (ob[stepField].data.list[idx].shareClass || (classEl ? classEl.value : '') || '').trim();

                const scStep = ob.stepShareCapital || {};
                const scCurrencies = (scStep.data && scStep.data.currencies) || [];
                const masterItem = scCurrencies.find(c => {
                    if (!c) return false;
                    const masterCurr = String(c.currency === 'Others' ? (c.customCurrency || '') : (c.currency || '')).trim().toUpperCase();
                    const masterClass = String(c.shareClass || '').trim().toLowerCase();
                    return masterCurr === shCurr.toUpperCase() && masterClass === shClass.toLowerCase();
                });

                if (masterItem) {
                    const mShares = parseFloat(String(masterItem.numberOfShares || '0').replace(/,/g, '')) || 0;
                    const mCapital = parseFloat(String(masterItem.shareCapitalAmount || '0').replace(/,/g, '')) || 0;

                    const calculatedShares = Math.round((pct / 100) * mShares);
                    const calculatedCapital = (pct / 100) * mCapital;

                    ob[stepField].data.list[idx].numberOfShares = calculatedShares;
                    ob[stepField].data.list[idx].shareCapitalAmount = calculatedCapital;
                    ob[stepField].data.list[idx].ownershipPercentage = pct;

                    // Sync fallback values back to the model
                    if (!ob[stepField].data.list[idx].currency) {
                        ob[stepField].data.list[idx].currency = shCurr;
                    }
                    if (!ob[stepField].data.list[idx].shareClass) {
                        ob[stepField].data.list[idx].shareClass = shClass;
                    }
                } else {
                    ob[stepField].data.list[idx].numberOfShares = '';
                    ob[stepField].data.list[idx].shareCapitalAmount = '';
                    ob[stepField].data.list[idx].ownershipPercentage = '';
                }
            }
        }
    } catch (err) {
        console.error("Error calculating individual shareholder fields:", err);
    }

    saveOnboardingDraft();

    // Re-render the active step form workspace
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

window.obRenderIndividualShareholderHtml = obRenderIndividualShareholderHtml;
window.obUpdateIndividualShareholderField = obUpdateIndividualShareholderField;

function obRenderRonsHtml(isReadOnly) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    const stepData = ob[stepField] || { status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] };
    const data = stepData.data || { hasNominee: 'No', nomineeList: [] };
    const docs = stepData.documents || [];

    if (!data.nomineeList) data.nomineeList = [];
    if (!data.hasNominee) data.hasNominee = 'No';

    // Get all individual and corporate shareholders
    const indStep = ob.step3IndividualShareholder || { data: { list: [] } };
    const indList = indStep.data.list || [];
    const corpStep = ob.step4CorporateShareholder || { data: { list: [] } };
    const corpList = corpStep.data.list || [];

    const shareholders = [];
    indList.forEach((sh, idx) => {
        shareholders.push({
            id: `individual_${idx}`,
            name: sh.fullName || `Unnamed Individual Shareholder #${idx + 1}`,
            type: 'individual'
        });
    });
    corpList.forEach((sh, idx) => {
        shareholders.push({
            id: `corporate_${idx}`,
            name: sh.companyName || `Unnamed Corporate Shareholder #${idx + 1}`,
            type: 'corporate'
        });
    });

    const isYes = data.hasNominee === 'Yes';

    let nomineeSectionHtml = '';
    if (isYes) {
        if (data.nomineeList.length === 0) {
            data.nomineeList.push({ shareholderId: '', type: '', email: '', mobile: '' });
        }

        nomineeSectionHtml = `
            <div style="margin-top:24px;">
                <h4 style="font-family:'Outfit'; font-size:16px; font-weight:700; color:#1e293b; margin-bottom:16px;">👤 Nominee Shareholder Details</h4>
                <div style="display:flex; flex-direction:column; gap:20px;">
                    ${data.nomineeList.map((nom, idx) => {
            const selectedSh = shareholders.find(s => s.id === nom.shareholderId);
            const shType = selectedSh ? selectedSh.type : nom.type;

            let docFieldsHtml = '';
            if (shType === 'individual') {
                const idDocType = `rons_id_proof_${idx}`;
                const addrDocType = `rons_addr_proof_${idx}`;

                const idUploaded = docs.find(d => d.type === idDocType);
                const addrUploaded = docs.find(d => d.type === addrDocType);

                docFieldsHtml = `
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
                                    <div class="ob-doc-upload" id="doc-rons-${idDocType}" style="${idUploaded ? 'border-color:#10b981; background:#f0fdf4;' : 'border-color:#e2e8f0; background:#f8fafc;'} border-radius:12px; padding:16px; cursor:${isReadOnly ? 'default' : 'pointer'};" ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('rons', '${idDocType}', 'ID Proof', ${idx})"`}>
                                        ${idUploaded ? `
                                            <div style="color:#059669; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                                                <span>✅ ID Proof</span>
                                                ${isReadOnly ? '' : `<button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('rons', '${idDocType}', ${idx})" style="border:none; background:transparent; color:#ef4444; font-size:11px; cursor:pointer;" title="Delete">❌</button>`}
                                            </div>
                                            <div style="font-size:10px; color:#475569; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📄 ${idUploaded.fileName}</div>
                                        ` : `<div style="text-align:center; font-size:12px; color:#64748b;">📤 Upload ID Proof</div>`}
                                    </div>
                                    <div class="ob-doc-upload" id="doc-rons-${addrDocType}" style="${addrUploaded ? 'border-color:#10b981; background:#f0fdf4;' : 'border-color:#e2e8f0; background:#f8fafc;'} border-radius:12px; padding:16px; cursor:${isReadOnly ? 'default' : 'pointer'};" ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('rons', '${addrDocType}', 'Address Proof', ${idx})"`}>
                                        ${addrUploaded ? `
                                            <div style="color:#059669; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                                                <span>✅ Address Proof</span>
                                                ${isReadOnly ? '' : `<button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('rons', '${addrDocType}', ${idx})" style="border:none; background:transparent; color:#ef4444; font-size:11px; cursor:pointer;" title="Delete">❌</button>`}
                                            </div>
                                            <div style="font-size:10px; color:#475569; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📄 ${addrUploaded.fileName}</div>
                                        ` : `<div style="text-align:center; font-size:12px; color:#64748b;">📤 Upload Address Proof</div>`}
                                    </div>
                                </div>
                            `;
            } else if (shType === 'corporate') {
                const bizDocType = `rons_bizfile_${idx}`;
                const constDocType = `rons_constitution_${idx}`;

                const bizUploaded = docs.find(d => d.type === bizDocType);
                const constUploaded = docs.find(d => d.type === constDocType);

                docFieldsHtml = `
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
                                    <div class="ob-doc-upload" id="doc-rons-${bizDocType}" style="${bizUploaded ? 'border-color:#10b981; background:#f0fdf4;' : 'border-color:#e2e8f0; background:#f8fafc;'} border-radius:12px; padding:16px; cursor:${isReadOnly ? 'default' : 'pointer'};" ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('rons', '${bizDocType}', 'BizFile', ${idx})"`}>
                                        ${bizUploaded ? `
                                            <div style="color:#059669; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                                                <span>✅ BizFile</span>
                                                ${isReadOnly ? '' : `<button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('rons', '${bizDocType}', ${idx})" style="border:none; background:transparent; color:#ef4444; font-size:11px; cursor:pointer;" title="Delete">❌</button>`}
                                            </div>
                                            <div style="font-size:10px; color:#475569; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📄 ${bizUploaded.fileName}</div>
                                        ` : `<div style="text-align:center; font-size:12px; color:#64748b;">📤 Upload BizFile</div>`}
                                    </div>
                                    <div class="ob-doc-upload" id="doc-rons-${constDocType}" style="${constUploaded ? 'border-color:#10b981; background:#f0fdf4;' : 'border-color:#e2e8f0; background:#f8fafc;'} border-radius:12px; padding:16px; cursor:${isReadOnly ? 'default' : 'pointer'};" ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('rons', '${constDocType}', 'Constitution', ${idx})"`}>
                                        ${constUploaded ? `
                                            <div style="color:#059669; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                                                <span>✅ Constitution</span>
                                                ${isReadOnly ? '' : `<button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('rons', '${constDocType}', ${idx})" style="border:none; background:transparent; color:#ef4444; font-size:11px; cursor:pointer;" title="Delete">❌</button>`}
                                            </div>
                                            <div style="font-size:10px; color:#475569; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📄 ${constUploaded.fileName}</div>
                                        ` : `<div style="text-align:center; font-size:12px; color:#64748b;">📤 Upload Constitution</div>`}
                                    </div>
                                </div>
                            `;
            }

            return `
                            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.015); position:relative;">
                                ${isReadOnly ? '' : `
                                    <button type="button" onclick="obRemoveRonsNominee(${idx})" style="position:absolute; top:16px; right:16px; border:none; background:#fee2e2; color:#ef4444; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">Remove</button>
                                `}
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                                    <div class="ob-field">
                                        <label style="font-family:'Outfit'; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Select Nominee Shareholder</label>
                                        <select ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsNomineeShareholder(${idx}, this.value)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; outline:none; background:white;">
                                            <option value="">Select Shareholder</option>
                                            ${shareholders.map(s => `<option value="${s.id}" ${nom.shareholderId === s.id ? 'selected' : ''}>${s.name} (${s.type === 'individual' ? 'Individual' : 'Corporate'})</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="ob-field" style="display:flex; flex-direction:row; gap:16px;">
                                        <div style="flex:1;">
                                            <label style="font-family:'Outfit'; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Email Address</label>
                                            <input type="email" value="${nom.email || ''}" placeholder="Email" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateRonsNomineeField(${idx}, 'email', this.value)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; outline:none;">
                                        </div>
                                        <div style="flex:1;">
                                            <label style="font-family:'Outfit'; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase;">Contact Number</label>
                                            <input type="text" value="${nom.mobile || ''}" placeholder="Contact Number" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateRonsNomineeField(${idx}, 'mobile', this.value)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; outline:none;">
                                        </div>
                                    </div>
                                </div>
                                ${docFieldsHtml}
                            </div>
                        `;
        }).join('')}
                </div>
                ${isReadOnly ? '' : `
                    <div style="display:flex; justify-content:center; margin-top:20px;">
                        <button type="button" onclick="obAddRonsNominee()" style="padding:10px 20px; background:#eff6ff; border:1px dashed #bfdbfe; border-radius:12px; color:#2563eb; font-weight:700; font-family:'Inter'; font-size:13px; cursor:pointer;">
                            ➕ Add Nominee Shareholder
                        </button>
                    </div>
                `}
            </div>
        `;
    } else {
        nomineeSectionHtml = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px; padding:20px; text-align:center; color:#166534; font-size:13.5px; font-weight:500; margin-top:24px; font-family:'Inter';">
                ✅ No nominee shareholders declared. You can proceed directly to Final Declaration & Consent.
            </div>
        `;
    }

    return `
        <div style="font-family:'Outfit';">
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.015);">
                <div style="font-size:14.5px; font-weight:600; color:#334155; margin-bottom:12px;">Is any shareholder a nominee shareholder?</div>
                <div style="display:flex; gap:24px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#475569; cursor:pointer;">
                        <input type="radio" name="hasNominee" value="Yes" ${isYes ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsHasNominee('Yes')" style="width:18px; height:18px; cursor:pointer;">
                        Yes
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:#475569; cursor:pointer;">
                        <input type="radio" name="hasNominee" value="No" ${!isYes ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} onchange="obUpdateRonsHasNominee('No')" style="width:18px; height:18px; cursor:pointer;">
                        No
                    </label>
                </div>
            </div>
            ${nomineeSectionHtml}
        </div>
    `;
}

function obUpdateRonsHasNominee(val) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    if (!ob[stepField]) ob[stepField] = { key: 'rons', title: 'Register of Nominee Shareholders (RONS)', status: 'pending', data: { hasNominee: 'No', nomineeList: [] }, documents: [] };
    ob[stepField].data.hasNominee = val;
    if (val === 'No') {
        ob[stepField].data.nomineeList = [];
        ob[stepField].documents = [];
    } else {
        if (!ob[stepField].data.nomineeList || ob[stepField].data.nomineeList.length === 0) {
            ob[stepField].data.nomineeList = [{ shareholderId: '', type: '', email: '', mobile: '' }];
        }
    }
    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

function obUpdateRonsNomineeShareholder(idx, value) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    if (!ob[stepField].data.nomineeList[idx]) ob[stepField].data.nomineeList[idx] = {};
    ob[stepField].data.nomineeList[idx].shareholderId = value;

    if (value) {
        const type = value.startsWith('individual_') ? 'individual' : 'corporate';
        ob[stepField].data.nomineeList[idx].type = type;
    } else {
        ob[stepField].data.nomineeList[idx].type = '';
    }

    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

function obUpdateRonsNomineeField(idx, key, value) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    if (!ob[stepField].data.nomineeList[idx]) ob[stepField].data.nomineeList[idx] = {};
    ob[stepField].data.nomineeList[idx][key] = value;
    saveOnboardingDraft();
}

function obAddRonsNominee() {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    ob[stepField].data.nomineeList.push({ shareholderId: '', type: '', email: '', mobile: '' });
    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

function obRemoveRonsNominee(idx) {
    const ob = state.onboarding || {};
    const stepField = 'stepRons';
    ob[stepField].data.nomineeList.splice(idx, 1);

    // Also clean up any associated documents for this index
    const prefix = `_${idx}`;
    ob[stepField].documents = (ob[stepField].documents || []).filter(d => !d.type.endsWith(prefix));

    saveOnboardingDraft();
    const workspace = document.getElementById('ob-form-workspace');
    if (workspace) renderActiveStepForm(workspace);
    updateWizardUIFeedback();
}

window.obRenderRonsHtml = obRenderRonsHtml;
window.obUpdateRonsHasNominee = obUpdateRonsHasNominee;
window.obUpdateRonsNomineeShareholder = obUpdateRonsNomineeShareholder;
window.obUpdateRonsNomineeField = obUpdateRonsNomineeField;
window.obAddRonsNominee = obAddRonsNominee;
window.obRemoveRonsNominee = obRemoveRonsNominee;

function renderMultiItemStepHtml(stepKey, isReadOnly) {
    const step = ONBOARDING_STEPS.find(s => s.key === stepKey);
    if (!step) return '';
    
    const stepField = step.field;
    const ob = state.onboarding || {};
    const stepData = ob[stepField] || { status: 'pending', data: {}, documents: [] };
    const data = stepData.data || {};
    const docs = stepData.documents || [];
    
    if (!data.list || !Array.isArray(data.list)) {
        data.list = [];
    }
    if (data.list.length === 0) {
        data.list.push({});
    }

    let cardsHtml = data.list.map((item, idx) => {
        const currentRequiredDocs = getStepRequiredDocs(stepKey, item);
        let currentManualFields = getStepManualFields(stepKey, item);

        let topFieldsHtml = '';
        if (stepKey === 'individual_shareholder') {
            const shTypeIdx = currentManualFields.findIndex(f => f.key === 'shareholderType');
            if (shTypeIdx !== -1) {
                const f = currentManualFields[shTypeIdx];
                currentManualFields.splice(shTypeIdx, 1); // Remove from main list

                const val = item[f.key] !== undefined ? item[f.key] : '';
                const inputId = `ob-${stepKey}-${idx}-${f.key}`;
                const disabledAttr = isReadOnly ? 'disabled' : '';
                const options = f.options || [];

                topFieldsHtml = `
                    <div class="ob-field-row" style="margin-bottom: 24px;">
                        <div class="ob-field">
                            <label for="${inputId}">${f.label}</label>
                            <select id="${inputId}" ${disabledAttr} onchange="triggerMultiItemAutoSave('${stepKey}', ${idx}, true)">
                                ${options.map(o => `<option value="${o}" ${String(val).trim().toLowerCase() === String(o).trim().toLowerCase() ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            }
        }

        let itemDocsHtml = '';
        if (currentRequiredDocs && currentRequiredDocs.length > 0) {
            itemDocsHtml = `
                <div style="margin-bottom: 0;">
                    <div style="font-family: 'Inter', sans-serif; font-size:13.5px;font-weight:600;color:#334155;margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Required Documents
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        ${currentRequiredDocs.map(doc => {
                const docTypeWithIdx = `${doc.type}_${idx}`;
                const uploaded = docs.find(d => d.type === docTypeWithIdx);

                let isReq = true;
                if (stepKey === 'corporate_shareholder') {
                    const country = (item.countryOfIncorporation || '').trim().toLowerCase();
                    const isSG = country === 'singapore' || country === 'sg';
                    if (isSG) {
                        isReq = (doc.type === 'bizfile' || doc.type === 'constitution');
                    } else {
                        isReq = (doc.type === 'cert_incorporation' || doc.type === 'constitution');
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
                                 style="${uploaded ? 'border-color:#10b981;background:#f0fdf4;' : 'border-color:#e2e8f0;background:#f8fafc;'} border-radius: 14px; transition: all 0.2s; ${isReadOnly ? 'cursor:default;opacity:0.85;' : ''} padding: 16px; cursor:${isReadOnly ? 'default' : 'pointer'};"
                                 ${isReadOnly ? '' : `onclick="obUploadMultiItemDoc('${stepKey}','${docTypeWithIdx}','${doc.label}', ${idx})"`}
                            >
                                ${uploaded
                        ? `<div style='display:flex; justify-content:space-between; align-items:flex-start;'>
                                         <div style="text-align: left;">
                                             <div style='color:#059669;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px;'><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${labelText}</div>
                                             <div style='font-size:11px;font-weight:500;color:#475569;margin-top:6px;word-break:break-all; max-width: 90%;'>📄 ${uploaded.fileName || 'Uploaded'}</div>
                                         </div>
                                         ${isReadOnly ? '' : `
                                             <button type="button" onclick="event.stopPropagation(); obClearMultiItemDoc('${stepKey}','${docTypeWithIdx}', ${idx})" style="padding:6px;background:#fee2e2;border:none;border-radius:8px;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" title="Remove Document">
                                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                             </button>
                                         `}
                                       </div>`
                        : `<div style='text-align:center;'>
                                        <div style="width:40px;height:40px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                                            <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#3b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' x2='12' y1='3' y2='15'/></svg>
                                        </div>
                                        <div style='font-size:12.5px;font-weight:600;color:#1e293b;'>${labelText}</div>
                                        ${isReadOnly ? '' : `<div style='font-size:11px;color:#64748b;margin-top:4px;'>Click or drag file to upload</div>`}
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
        const hasPassport = docs.some(d => d.type === `passport_${idx}`);
        const hasAddress = docs.some(d => d.type === `address_proof_${idx}`);
        const showFields = (stepKey !== 'director_details') || (hasNric || hasPassport || hasAddress) || (item.source === 'globalisor');

        if (item.source === 'globalisor') {
            itemFieldsHtml = `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 12px; width: 100%;">
                    <div style="font-size: 13px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 8px;">
                        <span>👤</span> Nominee Director service will be provided by Globalisor. No action is required.
                    </div>
                </div>
            `;
        } else if (showFields) {
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
                                    return ''; // Restored unique selection block!
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

                    if (f.key === 'anyAdditionalController') {
                        const disabledAttr = (f.readonly || isReadOnly) ? 'disabled' : '';
                        const maxOwnership = (() => {
                            let max = 0;
                            const ob = state.onboarding || {};
                            const indList = (ob.step3IndividualShareholder && ob.step3IndividualShareholder.data && ob.step3IndividualShareholder.data.list) || [];
                            const corpList = (ob.step4CorporateShareholder && ob.step4CorporateShareholder.data && ob.step4CorporateShareholder.data.list) || [];
                            indList.forEach(it => {
                                const pct = parseFloat(it.numberOfSharesPct) || parseFloat(it.shareCapitalAmountPct) || 0;
                                if (pct > max) max = pct;
                            });
                            corpList.forEach(it => {
                                const pct = parseFloat(it.numberOfSharesPct) || parseFloat(it.shareCapitalAmountPct) || 0;
                                if (pct > max) max = pct;
                            });
                            return max;
                        })();

                        if (maxOwnership >= 25) {
                            return '';
                        }

                        let selectWrapperHtml = '';
                        if (val) {
                            const dirStep = state.onboarding.step2DirectorDetails || {};
                            const dirList = (dirStep.data && dirStep.data.list) || [];
                            const selectedDirectors = item.additionalControllerDirectors || [];

                            const externalControllers = item.externalControllers || [];
                            let externalFormHtml = `
                                     <div style="margin-top:12px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; display:flex; flex-direction:column; gap:16px; width:100%; box-sizing:border-box;">
                                         <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e2e8f0; padding-bottom:8px;">
                                             <h5 style="font-size:12px; font-weight:700; color:#1e293b; margin:0;">External Additional Controllers</h5>
                                             ${isReadOnly ? '' : `
                                                 <button type="button" onclick="obAddExternalController(${idx})" style="padding: 6px 12px; background: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 8px; color: #2563eb; font-size:11px; font-weight:700; cursor:pointer;">
                                                     ➕ Add External Controller
                                                 </button>
                                             `}
                                         </div>
                                     `;

                            if (externalControllers.length === 0) {
                                externalFormHtml += `
                                         <div style="text-align:center; padding:12px; font-size:12px; color:#64748b;">
                                             No external controllers added yet. Click the button to add.
                                         </div>
                                         `;
                            } else {
                                externalControllers.forEach((ext, extIdx) => {
                                    const docKey = `external_passport_${idx}_${extIdx}`;
                                    const corpStepData = state.onboarding.step4CorporateShareholder || {};
                                    const docsList = corpStepData.documents || [];
                                    const uploadedDoc = docsList.find(d => d.type === docKey);
                                    let uploadHtml = '';
                                    if (uploadedDoc) {
                                        uploadHtml = `
                                                 <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; margin-top:8px;">
                                                     <span style="font-size:11px; font-weight:600; color:#16a34a;">✅ Passport Uploaded: ${uploadedDoc.fileName}</span>
                                                     <button type="button" onclick="obClearMultiItemDoc('corporate_shareholder', '${docKey}', ${idx})" style="background:transparent; border:none; color:#ef4444; font-size:11px; font-weight:700; cursor:pointer;">Delete</button>
                                                 </div>`;
                                    } else {
                                        uploadHtml = `
                                                 <div id="doc-corporate_shareholder-${docKey}" style="margin-top:8px;">
                                                     <button type="button" onclick="obUploadMultiItemDoc('corporate_shareholder', '${docKey}', 'External Controller Passport', ${idx})" class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed text-slate-700 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all">
                                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg> Upload Passport Copy (Required)
                                                     </button>
                                                 </div>`;
                                    }

                                    const extFields = [
                                        { key: 'fullName', label: 'Full Legal Name', type: 'text' },
                                        { key: 'idNumber', label: 'Passport / ID Number', type: 'text' },
                                        { key: 'nationality', label: 'Nationality', type: 'nationality' },
                                        { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                                        { key: 'residentialAddress', label: 'Residential Address', type: 'text' },
                                        { key: 'email', label: 'Email Address', type: 'email' },
                                        { key: 'mobile', label: 'Mobile Number', type: 'phone' },
                                        { key: 'passportExpiry', label: 'Passport Expiry Date', type: 'date' }
                                    ];

                                    const extFieldsHtml = extFields.map(ef => {
                                        const extVal = ext[ef.key] || '';
                                        const extInputId = `ob-corporate_shareholder-${idx}-ext-${extIdx}-${ef.key}`;

                                        if (ef.type === 'nationality') {
                                            const cbKey = `ob_corp_sh_${idx}_ext_${extIdx}_nat_cb`;
                                            window[cbKey] = () => {
                                                const el = document.getElementById(extInputId);
                                                if (el) {
                                                    obUpdateExternalControllerField(idx, extIdx, ef.key, el.value);
                                                }
                                            };
                                            return obRenderNationalityField({
                                                inputId: extInputId,
                                                val: String(extVal),
                                                readonlyAttr: isReadOnly ? 'readonly' : '',
                                                onChangeCallback: cbKey
                                            });
                                        } else if (ef.type === 'phone') {
                                            return obRenderPhoneField({
                                                inputId: extInputId,
                                                val: String(extVal),
                                                readonlyAttr: isReadOnly ? 'readonly' : '',
                                                onInputCallback: `obUpdateExternalControllerFieldPhone(${idx}, ${extIdx}, '${extInputId}')`
                                            });
                                        } else {
                                            return `
                                                     <div class="ob-field" style="margin-top:8px;">
                                                         <label>${ef.label}</label>
                                                         <input type="${ef.type}" id="${extInputId}" value="${extVal}" placeholder="Enter ${ef.label.toLowerCase()}" ${isReadOnly ? 'readonly' : ''} oninput="obUpdateExternalControllerField(${idx}, ${extIdx}, '${ef.key}', this.value)">
                                                     </div>`;
                                        }
                                    }).join('');

                                    externalFormHtml += `
                                             <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: white; margin-bottom: 12px; position:relative; box-sizing:border-box;">
                                                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:8px;">
                                                     <span style="font-size:12px; font-weight:700; color:#334155;">External Controller #${extIdx + 1}</span>
                                                     ${isReadOnly ? '' : `
                                                         <button type="button" onclick="obRemoveExternalController(${idx}, ${extIdx})" style="padding: 4px 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size:10px; font-weight:700; cursor:pointer;">
                                                             Remove
                                                         </button>
                                                     `}
                                                 </div>
                                                 ${uploadHtml}
                                                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
                                                     ${extFieldsHtml}
                                                 </div>
                                             </div>
                                             `;
                                });
                            }

                            externalFormHtml += `</div>`;

                            selectWrapperHtml = `
                                     <div style="grid-column: span 2; margin-top:12px; padding:16px; background:#f1f5f9; border-radius:12px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; width:100%;">
                                         <div class="ob-field" style="width:100%; box-sizing:border-box;">
                                             <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Select Director(s) as Controller</div>
                                             <div style="display:flex; flex-direction:column; gap:8px; border:1px solid #cbd5e1; border-radius:8px; padding:12px; background:white; max-height:150px; overflow-y:auto; box-sizing:border-box; width:100%;">
                                                 ${dirList.length === 0 ? `
                                                     <div style="font-size:12px; color:#64748b; text-align:center; padding:8px;">No directors found to select.</div>
                                                 ` : dirList.map((d, dIdx) => {
                                const isSelected = selectedDirectors.includes(String(dIdx));
                                const cbId = `${inputId}-director-cb-${dIdx}`;
                                return `
                                                     <label for="${cbId}" style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; color:#334155; cursor:pointer; margin-bottom:0; text-transform:none; letter-spacing:normal; width:100%;">
                                                         <input type="checkbox" id="${cbId}" ${isSelected ? 'checked' : ''} ${disabledAttr} onchange="obCorporateShareholderAdditionalControllersCheckboxChange(${idx}, ${dIdx}, this.checked)" style="width:16px; height:16px; cursor:pointer; margin:0;">
                                                         Director #${dIdx + 1}: ${d.fullName || d.name || '(No Name)'}
                                                     </label>
                                                     `;
                            }).join('')}
                                             </div>
                                         </div>
                                         ${externalFormHtml}
                                     </div>
                                     `;
                        }

                        return `
                                  <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:16px; grid-column: span 2; margin-top: 8px; margin-bottom: 8px;">
                                      <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${disabledAttr} onchange="obCorporateShareholderAnyAdditionalControllerCheckboxChange(${idx}, this.checked)" style="width:16px; height:16px; cursor:pointer;">
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
                            const scStep = ob.stepShareCapital || {};
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
                        } else if (stepKey === 'corporate_rep' && f.key === 'corporateShareholderUen') {
                            const corpStep = ob.step4CorporateShareholder || {};
                            const corpList = (corpStep.data && corpStep.data.list) || [];
                            options = ['Select', ...corpList.map(c => (c.companyName || 'Unnamed Corporate') + ' (' + (c.uen || 'No UEN') + ')')];
                        }

                        return `
                                 <div class="ob-field">
                                     <label for="${inputId}">${f.label}</label>
                                     <select id="${inputId}" onchange="triggerMultiItemAutoSave('${stepKey}', ${idx})" ${disabledAttr}>
                                         ${options.map(o => `<option value='${o}' ${String(val).trim().toLowerCase() === String(o).trim().toLowerCase() ? 'selected' : ''}>${o}</option>`).join('')}
                                     </select>
                                 </div>`;
                    } else if (f.type === 'checkbox') {
                        const disabledAttr = (f.readonly || isReadOnly) ? 'disabled' : '';
                        const mandatoryMark = f.mandatory ? '<span style="color:#ef4444; margin-left:2px;">*</span>' : '';
                        return `
                                <div class="ob-field" style="flex-direction:row; align-items:center; gap:8px; padding-top:16px; grid-column: span 2; margin-top: 8px; margin-bottom: 8px;">
                                    <input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} ${disabledAttr} onchange="triggerMultiItemAutoSave('${stepKey}', ${idx}, true)" style="width:16px; height:16px; cursor:pointer;">
                                    <label for="${inputId}" style="cursor:pointer; margin-bottom:0; font-size:12px; font-weight:600; text-transform:none; letter-spacing:normal; color:#475569; user-select:none;">${f.label}${mandatoryMark}</label>
                                </div>`;
                    } else if (f.type === 'phone') {
                        let fieldReadonlyAttr = readonlyAttr;
                        if (stepKey === 'individual_shareholder' && (item.sameAsDirector === true || item.sameAsDirector === 'true')) {
                            fieldReadonlyAttr = 'readonly';
                        }
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
                        const cbKey = `${inputId.replace(/-/g, '_')}NatCb`;
                        window[cbKey] = () => {
                            const el = document.getElementById(inputId);
                            if (el) {
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
                        if (f.key === 'passportExpiry' && val) {
                            const expiryDate = new Date(val);
                            const threeMonthsLater = new Date();
                            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                            if (expiryDate < threeMonthsLater) {
                                validationWarningHtml = `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:4px;">Passport validity is less than 3 months. Please upload your latest passport.</div>`;
                            }
                        }
                        let isIdDuplicate = false;
                        if (f.key === 'idNumber' && val) {
                            const stepFieldConfig = ONBOARDING_STEPS.find(s => s.key === stepKey);
                            const list = (ob[stepFieldConfig.field] && ob[stepFieldConfig.field].data && ob[stepFieldConfig.field].data.list) || [];
                            isIdDuplicate = list.some((item, itemIdx) => itemIdx !== idx && item.idNumber && String(item.idNumber).trim().toUpperCase() === String(val).trim().toUpperCase());
                        }
                        if ((stepKey === 'individual_shareholder' || stepKey === 'corporate_shareholder') && (f.key === 'numberOfShares' || f.key === 'shareCapitalAmount' || f.key === 'numberOfSharesPct' || f.key === 'shareCapitalAmountPct')) {
                            const shCurr = (item.currency || '').trim().toUpperCase();
                            const shClass = (item.shareClass || '').trim();

                            if (shCurr && shCurr.toUpperCase() !== 'SELECT' && shClass && shClass.toUpperCase() !== 'SELECT') {
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
                                    <div id="${inputId}-limit-warn">${validationWarningHtml}</div>
                                </div>`;
                    }
                }).join('')}
                    </div>
                `;
            }
        } else {
            itemFieldsHtml = `
                <div style="margin-top: 24px; padding: 32px 20px; background: linear-gradient(180deg, #f8fafc, #f1f5f9); border: 1px dashed #cbd5e1; border-radius: 16px; text-align: center;">
                    <div style="width: 48px; height: 48px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Form Fields Locked</div>
                    <div style="font-size: 13px; color: #64748b; line-height: 1.6; max-width: 400px; margin: 0 auto;">Please upload the required documents above. Once uploaded, OCR will extract the details and unlock the fields for manual confirmation.</div>
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

        let headingText = `${itemLabel} #${idx + 1}`;
        if (stepKey === 'director_details') {
            const isForeignerJourney = state.onboarding && state.onboarding.journeyType === 'FOREIGNER';
            if (isForeignerJourney) {
                if (item.source === 'globalisor') {
                    headingText = 'Nominee Director (Globalisor)';
                } else if (item.idType === 'local') {
                    const localIdx = data.list.filter((d, dIdx) => dIdx <= idx && d.idType === 'local' && d.source !== 'globalisor').length;
                    headingText = `Local Director #${localIdx}`;
                } else {
                    const foreignIdx = data.list.filter((d, dIdx) => dIdx <= idx && d.idType === 'foreign').length;
                    headingText = `Foreign Director #${foreignIdx}`;
                }
            }
        }
        let itemIconSvg = '';
        if (stepKey === 'director_details') {
            itemIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`;
        } else if (stepKey === 'individual_shareholder') {
            itemIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
        } else {
            itemIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`;
        }

        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 20px; margin-bottom: 24px; background: #ffffff; position: relative; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); overflow: hidden; transition: all 0.3s;" onmouseover="this.style.boxShadow='0 8px 30px rgba(0, 0, 0, 0.06)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='0 4px 20px rgba(0, 0, 0, 0.03)'; this.style.transform='translateY(0)';">
                <div style="height: 4px; width: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4);"></div>
                <div style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; display: flex; align-items: center; justify-content: center;">
                                ${itemIconSvg}
                            </div>
                            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">${headingText}</h4>
                        </div>
                        ${isReadOnly || data.list.length <= 1 ? '' : `
                            <button type="button" onclick="removeMultiItem('${stepKey}', ${idx})" style="padding: 8px 16px; background: #ffffff; border: 1px solid #fecaca; border-radius: 10px; color: #ef4444; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.05);" onmouseover="this.style.background='#fef2f2'; this.style.borderColor='#ef4444';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#fecaca';">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Remove
                            </button>
                        `}
                    </div>
                    ${topFieldsHtml}
                    ${itemDocsHtml}
                    ${itemDocsHtml && itemFieldsHtml ? '<div style="height: 1px; background: #f1f5f9; margin: 24px 0;"></div>' : ''}
                    ${itemFieldsHtml}
                </div>
            </div>
        `;
    }).join('');

    let addButtonHtml = '';
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
        addButtonHtml = `
            <div style="margin-top: 16px; margin-bottom: 32px; display: flex; justify-content: center;">
                <button type="button" onclick="addMultiItem('${stepKey}')" style="padding: 12px 24px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; color: #3b82f6; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#93c5fd';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Another ${itemLabel}
                </button>
            </div>
        `;
    }

    return cardsHtml + addButtonHtml;
}

window.renderMultiItemStepHtml = renderMultiItemStepHtml;
window.obRemoveRonsNominee = obRemoveRonsNominee;
