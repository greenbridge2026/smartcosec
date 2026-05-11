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
    isAIActive: false
};

// Initialize Platform
document.addEventListener('DOMContentLoaded', async () => {
    // Session Recovery
    const auth = JSON.parse(localStorage.getItem('client_auth') || '{"name": "Mohammad Asif", "id": "C-1004"}');
    state.user = auth;
    document.getElementById('user-name').innerText = auth.name;

    // Sequential Data Hydration
    await fetchData();
    switchTab('home');
    
    // Lucide Init
    if (window.lucide) window.lucide.createIcons();
    
    // Entrance Animation
    gsap.from("aside", { x: -100, opacity: 0, duration: 1, ease: "power4.out" });
    gsap.from("header", { y: -20, opacity: 0, duration: 1, delay: 0.3, ease: "power4.out" });
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
                date: s.date
            }));
        }

        // Fetch Intelligence Feed
        const bRes = await fetch('/api/blogs');
        if (bRes.ok) state.blogs = await bRes.json();

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
    
    if (unread.length > 0) {
        badge.innerText = unread.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    const list = document.getElementById('notif-list');
    if (!list) return;
    
    if (state.notifications.length === 0) {
        list.innerHTML = '<div class="p-10 text-center text-slate-400 text-sm">No new intelligence updates</div>';
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

    const view = document.getElementById('main-view');
    const title = document.getElementById('page-title');

    // Section Routing
    switch(tab) {
        case 'home': title.innerText = 'Executive Hub'; renderHome(view); break;
        case 'services': title.innerText = 'Active Workflows'; renderServices(view); break;
        case 'updates': title.innerText = 'Market Intelligence'; renderUpdates(view); break;
        case 'documents': title.innerText = 'Compliance Vault'; renderDocuments(view); break;
        case 'requests': title.innerText = 'Service Marketplace'; renderRequests(view); break;
        case 'billing': title.innerText = 'Financial Operations'; renderBilling(view); break;
        case 'messages': title.innerText = 'Support Desk'; renderMessages(view); break;
        case 'profile': title.innerText = 'Executive Profile'; renderProfile(view); break;
    }
    
    // Scroll Logic
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Animate view entry
    gsap.from(view, { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" });
    
    if (window.lucide) window.lucide.createIcons();
}

// --- View Renderers ---

function renderHome(container) {
    const pendingActions = state.notifications.filter(n => !n.readBy.includes(state.user.id)).length;
    const latestBlog = state.blogs[0];
    
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Strategic Overview -->
            <div class="lg:col-span-2 space-y-10">
                <div class="premium-card bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none relative overflow-hidden group p-10">
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] border border-blue-500/30">Enterprise Priority</span>
                        </div>
                        <h2 class="text-4xl font-extrabold mb-4 tracking-tight">System Status: <span class="text-blue-400">Operational</span></h2>
                        <p class="text-slate-400 max-w-md mb-8 leading-relaxed">Welcome, ${state.user.name}. Your portfolio is currently healthy with ${state.services.length} active services and 0 critical compliance issues.</p>
                        <div class="flex gap-4">
                            <button onclick="switchTab('services')" class="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Operational Tracking</button>
                            <button onclick="switchTab('documents')" class="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all">Compliance Vault</button>
                        </div>
                    </div>
                    <i data-lucide="shield" class="absolute right-[-40px] bottom-[-40px] w-80 h-80 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-[2000ms]"></i>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div class="premium-card p-8 text-center group hover:border-blue-200">
                        <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 mx-auto transition-transform group-hover:rotate-12"><i data-lucide="layers" class="w-7 h-7"></i></div>
                        <div class="text-3xl font-extrabold text-slate-900">${state.services.length}</div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Active Entities</div>
                    </div>
                    <div class="premium-card p-8 text-center group hover:border-emerald-200">
                        <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 mx-auto transition-transform group-hover:rotate-12"><i data-lucide="shield-check" class="w-7 h-7"></i></div>
                        <div class="text-3xl font-extrabold text-slate-900">${state.documents.filter(d => d.status === 'Approved').length}</div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Verified Docs</div>
                    </div>
                    <div class="premium-card p-8 text-center group hover:border-amber-200">
                        <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 mx-auto transition-transform group-hover:rotate-12"><i data-lucide="bell" class="w-7 h-7"></i></div>
                        <div class="text-3xl font-extrabold text-slate-900">${pendingActions}</div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Intelligence Updates</div>
                    </div>
                </div>

                <!-- Workflow Stream -->
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-extrabold text-slate-900">Current Workflows</h3>
                        <button onclick="switchTab('services')" class="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">View All Operations</button>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        ${state.services.map(s => `
                            <div class="premium-card hover:border-blue-100 group cursor-pointer" onclick="switchTab('services')">
                                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div class="flex items-center gap-5">
                                        <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 transition-colors"><i data-lucide="activity"></i></div>
                                        <div>
                                            <h4 class="font-bold text-slate-900 text-lg">${s.type}</h4>
                                            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">${s.company} • SG Portfolio</p>
                                        </div>
                                    </div>
                                    <div class="flex-1 max-w-[240px]">
                                        <div class="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
                                            <span>Workflow Completion</span>
                                            <span class="text-slate-900">${s.progress}%</span>
                                        </div>
                                        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="h-full bg-blue-600 rounded-full transition-all duration-1000" style="width: ${s.progress}%"></div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-6">
                                        <span class="status-badge ${s.status === 'Active' ? 'status-active' : 'status-progress'}">${s.status}</span>
                                        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-2 transition-all"></i>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Intelligence & Support Sidebar -->
            <div class="space-y-10">
                <!-- Market Intelligence -->
                ${latestBlog ? `
                    <div class="premium-card p-0 overflow-hidden group">
                        <div class="h-40 bg-slate-900 relative">
                            <img src="${latestBlog.coverImage || ''}" class="w-full h-full object-cover opacity-60">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                            <div class="absolute bottom-6 left-6 right-6">
                                <span class="px-2 py-1 rounded bg-blue-600 text-[9px] font-bold text-white uppercase tracking-[0.2em] mb-2 inline-block">Market Intel</span>
                                <h4 class="text-white font-extrabold text-lg leading-tight line-clamp-2">${latestBlog.title}</h4>
                            </div>
                        </div>
                        <div class="p-8">
                            <p class="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-8">${latestBlog.description}</p>
                            <button onclick="switchTab('updates'); openBlogDetail('${latestBlog.id}')" class="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-bold text-xs hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest border border-slate-100">Full Assessment</button>
                        </div>
                    </div>
                ` : ''}

                <!-- Compliance Health -->
                <div class="premium-card ${state.compliance?.status === 'compliant' ? 'bg-emerald-600' : 'bg-amber-600'} text-white border-none shadow-xl">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><i data-lucide="${state.compliance?.status === 'compliant' ? 'shield-check' : 'alert-triangle'}" class="w-6 h-6"></i></div>
                        <div>
                            <h3 class="font-extrabold">Health Check</h3>
                            <p class="text-xs opacity-80">Portfolio Compliance</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center text-sm font-bold">
                            <span class="opacity-80">System Status</span>
                            <span class="uppercase tracking-widest text-[10px]">${state.compliance?.status || 'Reviewing'}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm font-bold">
                            <span class="opacity-80">Active Flags</span>
                            <span>${state.compliance?.flags?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- Support Shortcut -->
                <div class="premium-card bg-slate-50 border-slate-100">
                    <h3 class="text-lg font-extrabold text-slate-900 mb-2">Need an Expert?</h3>
                    <p class="text-sm text-slate-500 mb-6">Your dedicated manager is available for strategic advisory.</p>
                    <button onclick="switchTab('messages')" class="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest">Connect Now</button>
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

// --- AI Assistant Intelligence ---

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

    // Simulated Intelligence
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
    window.location.href = '/auth.html';
}

// Placeholder renderers for missing tabs (standardized)
function renderUpdates(container) {
    if (state.blogs.length === 0) {
        renderPlaceholder(container, 'Market Intelligence', 'zap');
        return;
    }

    container.innerHTML = `
        <div class="space-y-10">
            <div class="flex justify-between items-end">
                <div class="max-w-xl">
                    <h2 class="text-3xl font-extrabold text-slate-900">Intelligence Feed</h2>
                    <p class="text-slate-500 mt-2">Critical updates on Singapore regulatory changes, tax deadlines, and global business trends.</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${state.blogs.map(blog => `
                    <div class="premium-card p-0 overflow-hidden group cursor-pointer" onclick="openBlogDetail('${blog.id}')">
                        <div class="h-48 bg-slate-100 relative overflow-hidden">
                            ${blog.coverImage ? `<img src="${blog.coverImage}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="image" class="w-12 h-12"></i></div>`}
                            <div class="absolute top-4 left-4"><span class="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-bold text-blue-600 uppercase tracking-widest">${blog.category || 'Compliance'}</span></div>
                        </div>
                        <div class="p-8">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', {day: '2-digit', month: 'short', year: 'numeric'})}</div>
                            <h3 class="text-xl font-extrabold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">${blog.title}</h3>
                            <p class="text-sm text-slate-500 line-clamp-3 mb-8 leading-relaxed">${blog.description}</p>
                            <div class="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                                View Assessment <i data-lucide="arrow-right" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>
                `).join('')}
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
                    <h2 class="text-3xl font-extrabold text-slate-900">Active Workflows</h2>
                    <p class="text-slate-500 mt-2">Track the real-time progress of your ongoing corporate operations and applications.</p>
                </div>
                <button onclick="switchTab('requests')" class="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">Launch New Workflow</button>
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
                                        <p class="text-sm font-extrabold text-slate-900">#${s.id}</p>
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
                    <h2 class="text-3xl font-extrabold text-slate-900">Compliance Vault</h2>
                    <p class="text-slate-500 mt-2">Centralized management of your corporate ID, residential proof, and entity documents.</p>
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
                <h2 class="text-4xl font-extrabold text-slate-900">Service Marketplace</h2>
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

function renderMessages(container) {
    container.innerHTML = `
        <div class="premium-card h-[700px] flex flex-col p-0 overflow-hidden border-slate-100 bg-white">
            <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-lg font-extrabold shadow-lg shadow-slate-200">G</div>
                    <div>
                        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight">Globalisor Ops Desk</h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Active Monitoring</p>
                        </div>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button class="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><i data-lucide="phone" class="w-5 h-5"></i></button>
                    <button class="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><i data-lucide="more-horizontal" class="w-5 h-5"></i></button>
                </div>
            </div>
            
            <div class="flex-1 p-10 overflow-y-auto space-y-8 bg-slate-50/20" id="chat-stream">
                <!-- System Time -->
                <div class="flex justify-center"><span class="px-4 py-1.5 bg-white rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">Strategic Update • Today</span></div>

                <div class="flex gap-5">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">G</div>
                    <div class="space-y-3 max-w-[75%]">
                        <div class="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-100 text-sm text-slate-700 shadow-sm leading-relaxed">
                            Good morning, Director. We've successfully completed the regulatory review for **${state.services[0].company}**. 
                        </div>
                        <div class="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-100 text-sm text-slate-700 shadow-sm leading-relaxed">
                            To finalize the corporate constitution, we require your residential proof to be uploaded to the **Compliance Vault**.
                        </div>
                        <span class="text-[9px] font-bold text-slate-400 ml-2 uppercase tracking-widest">10:45 AM</span>
                    </div>
                </div>

                <div class="flex gap-5 flex-row-reverse">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-lg shadow-blue-500/20">AS</div>
                    <div class="space-y-3 max-w-[75%]">
                        <div class="bg-blue-600 p-6 rounded-3xl rounded-tr-none text-sm text-white shadow-xl shadow-blue-500/20 leading-relaxed">
                            Acknowledged. I will provide the documents within the hour. Is there anything else required for the GST registration phase?
                        </div>
                        <span class="text-[9px] font-bold text-slate-400 mr-2 text-right block uppercase tracking-widest">11:02 AM</span>
                    </div>
                </div>
            </div>

            <div class="p-8 bg-white border-t border-slate-100 flex gap-5">
                <div class="flex-1 relative">
                    <input type="text" placeholder="Direct query to Globalisor Experts..." class="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                    <div class="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3 text-slate-300">
                        <button class="hover:text-blue-600 transition-colors"><i data-lucide="paperclip" class="w-5 h-5"></i></button>
                        <button class="hover:text-blue-600 transition-colors"><i data-lucide="smile" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <button class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-105 transition-all active:scale-95"><i data-lucide="send" class="w-6 h-6"></i></button>
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

    content.innerHTML = `
        <div class="max-h-[90vh] overflow-y-auto custom-scroll">
            <div class="relative h-96">
                ${blog.coverImage ? `<img src="${blog.coverImage}" class="w-full h-full object-cover">` : '<div class="w-full h-full bg-slate-900"></div>'}
                <div class="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
                <button onclick="closeModal()" class="absolute top-8 right-8 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all border border-white/30"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-12 -mt-32 relative z-10">
                <div class="premium-card border-none shadow-2xl p-12">
                    <div class="flex flex-wrap gap-3 mb-8">
                        <span class="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">${blog.category || 'Intelligence'}</span>
                        <span class="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-100">${new Date(blog.createdAt || blog.date).toLocaleDateString('en-SG', {day: '2-digit', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <h2 class="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">${blog.title}</h2>
                    <div class="prose prose-slate max-w-none text-slate-600 leading-[1.8] text-lg space-y-6">
                        <p class="font-bold text-slate-900 text-xl leading-relaxed">${blog.description}</p>
                        <div class="h-px bg-slate-100 my-10"></div>
                        <div class="whitespace-pre-wrap">${blog.content || blog.description}</div>
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
                            <a href="${blog.documentUrl}" target="_blank" class="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all flex items-center gap-3">Download Intelligence <i data-lucide="download" class="w-4 h-4"></i></a>
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


