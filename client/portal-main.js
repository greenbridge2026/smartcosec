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
        window.location.href = '/auth.html';
        return;
    }
    const auth = JSON.parse(authString);
    
    // Authorization Check: Must be approved to view portal
    try {
        const token = localStorage.getItem('token');
        const reqRes = await fetch('/api/requirements', { headers: { 'Authorization': 'Bearer ' + token } });
        if (reqRes.ok) {
            const reqData = await reqRes.json();
            if (reqData.status !== 'approved') {
                window.location.href = '/requirements.html';
                return;
            }
        } else {
            window.location.href = '/requirements.html';
            return;
        }
    } catch (e) {
        window.location.href = '/requirements.html';
        return;
    }

    state.user = auth;
    document.getElementById('user-name').innerText = auth.name;
    connectWebSocket();

    // Sequential Data Hydration
    await fetchData();
    
    // Handle deep-linking via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab') || 'home';
    switchTab(targetTab);
    
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

function switchTab(tab) {
    state.currentTab = tab;
    
    // Sync Navigation UI
    document.querySelectorAll('.nav-btn, .nav-mobile-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id.includes(tab));
    });
    if (window.updateClientSidebarActive) {
        window.updateClientSidebarActive(tab);
    }

    const view = document.getElementById('main-view');
    const title = document.getElementById('page-title');

    // Section Routing
    switch(tab) {
        case 'home': title.innerText = 'Client Dashboard'; renderHome(view); break;
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
    typing.innerHTML = '<div class="w-8 h-8 rounded-lg bg-blue-100"></div><div class="bg-white/60 p-4 rounded-2xl rounded-tl-none text-xs text-slate-400">AI is thinking...</div>';
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
        <div class="w-8 h-8 rounded-lg ${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'} flex items-center justify-center shrink-0">
            <i data-lucide="${sender === 'user' ? 'user' : 'sparkles'}" class="w-4 h-4"></i>
        </div>
        <div class="${sender === 'user' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white/60 text-slate-700 border border-white/60'} p-4 rounded-2xl ${sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} text-sm shadow-sm">
            ${text}
        </div>
    `;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
}

function generateAIResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('document') || m.includes('upload')) return "You can manage all your documents in the **Compliance Vault** tab. Currently, we're waiting for your **Proof of Address**. Would you like me to open that section for you?";
    if (m.includes('invoice') || m.includes('bill')) return "Your recent invoice **INV-2026-042** for SGD 3,000.00 is pending. You can pay it directly in the **Payments** module.";
    if (m.includes('hi') || m.includes('hello')) return "Hello! I'm your Globalisor operational assistant. I can help you track workflows, manage compliance, or answer questions about your Singapore entity. What's on your mind?";
    return "That's a great question about Singapore business operations. I'll need a moment to verify the latest ACRA guidelines, or I can connect you with a human expert in the Support Desk.";
}

// --- Legacy Function Wrappers (Kept for compatibility) ---

function logout() {
    localStorage.removeItem('client_auth');
    localStorage.removeItem('token');
    localStorage.removeItem('globalisor_master_v3');
    window.location.href = '/auth.html';
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
    toast.className = 'bg-white border border-slate-100 shadow-2xl p-4 rounded-2xl flex items-start gap-3 w-80 translate-y-5 opacity-0 transition-all duration-300 cursor-pointer font-outfit';
    
    let icon = '🔔';
    if (n.type === 'message') icon = '💬';
    else if (n.type === 'blog') icon = '📰';
    else if (n.type === 'status_update') icon = '🔄';
    else if (n.type === 'document_request') icon = '📄';
    else if (n.type === 'assignment') icon = '👤';
    
    toast.innerHTML = `
        <div class="text-xl">${icon}</div>
        <div class="flex-1">
            <div class="text-xs font-bold text-slate-900">${n.title}</div>
            <div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${n.message}</div>
        </div>
    `;
    
    toast.onclick = () => {
        toast.remove();
        handleNotifClick(n.id, n.type, n.relatedId);
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

