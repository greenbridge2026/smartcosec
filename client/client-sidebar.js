// Synchronously load sequence ID map from localStorage if available
try {
    const cached = localStorage.getItem('globalisor_app_seq_map');
    if (cached) {
        window.appSeqMap = JSON.parse(cached);
    }
} catch (e) {
    console.error("Error loading cached app sequence map", e);
}

// Sync from other tabs/portals
window.addEventListener('storage', (e) => {
    if (e.key === 'globalisor_app_seq_map') {
        try {
            window.appSeqMap = JSON.parse(e.newValue);
            window.dispatchEvent(new CustomEvent('appSeqMapUpdated', { detail: window.appSeqMap }));
        } catch (err) {
            console.error("Error updating sequence map from storage", err);
        }
    }
});

// Background sync function
window.initAppSeqMap = async function() {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/applications', { headers });
        if (res.ok) {
            const apps = await res.json();
            if (apps && Array.isArray(apps)) {
                // Sort chronologically (oldest first)
                apps.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
                const map = {};
                apps.forEach((app, idx) => {
                    map[app.id] = 101 + idx;
                });
                localStorage.setItem('globalisor_app_seq_map', JSON.stringify(map));
                window.appSeqMap = map;
                // Trigger customized event for real-time rendering refresh if needed
                window.dispatchEvent(new CustomEvent('appSeqMapUpdated', { detail: map }));
                return map;
            }
        }
    } catch (e) {
        console.error("Failed to sync application sequence IDs", e);
    }
    return window.appSeqMap || {};
};

// Start background sync
window.initAppSeqMap();
document.addEventListener('DOMContentLoaded', () => {
    // Restore sidebar collapse preference before rendering to prevent layout shift/flicker
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
        document.body.classList.add('sidebar-collapsed');
    }

    // 0. Inject custom client styles (font size enlargement & sidebar collapse)
    const style = document.createElement('style');
    style.id = 'client-sidebar-custom-styles';
    style.textContent = `
        html {
            font-size: 16.5px !important;
        }

        .main-container {
            padding-bottom: 6.5rem !important;
            transition: padding-left 0.3s ease-in-out;
        }

        #left-sidebar {
            transition: transform 0.3s ease-in-out, width 0.3s ease-in-out !important;
        }

        @media (max-width: 1023px) {
            .main-container {
                padding-bottom: 6.5rem !important;
            }
        }

        /* Sidebar Collapse System */
        @media (min-width: 1024px) {
            body.sidebar-collapsed #left-sidebar {
                width: 80px !important;
                transform: translateX(0) !important;
            }
            body.sidebar-collapsed .lg\\:pl-64 {
                padding-left: 80px !important;
            }
            body.sidebar-collapsed #left-sidebar .sidebar-text {
                display: none !important;
            }
            body.sidebar-collapsed #left-sidebar a,
            body.sidebar-collapsed #left-sidebar button {
                justify-content: center !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                gap: 0 !important;
            }
            body.sidebar-collapsed #left-sidebar .px-6 {
                padding-left: 0 !important;
                padding-right: 0 !important;
                justify-content: center !important;
                flex-direction: column !important;
                gap: 12px !important;
                padding-top: 24px !important;
                padding-bottom: 24px !important;
            }
        }

        @media (max-width: 1023px) {
            body.sidebar-collapsed #left-sidebar {
                transform: translateX(-100%) !important;
            }
            body.sidebar-collapsed .lg\\:pl-64 {
                padding-left: 0 !important;
            }
        }
    `;
    document.head.appendChild(style);

    // 1. Remove/Hide old top-nav
    const oldNav = document.querySelector('.top-nav');
    if (oldNav) {
        oldNav.remove();
    }

    // 2. Wrap main container
    const main = document.querySelector('.main-container');
    if (main) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lg:pl-64 min-h-screen flex flex-col';
        main.parentNode.insertBefore(wrapper, main);
        wrapper.appendChild(main);
    }

    // Get auth user details
    const authString = localStorage.getItem('client_auth');
    const auth = authString ? JSON.parse(authString) : { name: 'Client User' };
    const initials = auth.name ? auth.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'CL';

    // 3. Inject Mobile Header & Sidebar
    const isMessagesPage = window.location.pathname.includes('messages.html');

    const mobileHeader = `
        <header class="lg:hidden flex items-center justify-between px-6 py-4 bg-white/40 border-b border-white/60 sticky top-0 z-30 backdrop-blur-md">
            <div class="flex items-center gap-2 cursor-pointer" onclick="window.location.href='portal.html'">
                <span class="font-outfit font-black text-slate-900 text-lg uppercase tracking-wider">Globalisor</span>
            </div>
            <button onclick="toggleMobileSidebar()" class="p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
        </header>
    `;

    const SIDEBAR_SVGS = {
        'home': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
        'profile': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
        'onboarding': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M12 10h.01"/></svg>`,
        'services': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        'documents': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        'billing': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
        'guidance': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
        'updates': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        'messages': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        'calendar': `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    };

    const getLinkHtml = (tabId, icon, label) => {
        const svgIcon = SIDEBAR_SVGS[tabId] || '';
        if (isMessagesPage) {
            return `<a href="portal.html?tab=${tabId}" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group font-semibold text-sm text-slate-600" id="nav-${tabId}" title="${label}">
                ${svgIcon} <span class="sidebar-text">${label}</span>
            </a>`;
        } else {
            return `<button onclick="switchTab('${tabId}'); if(window.innerWidth < 1024) toggleMobileSidebar();" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group font-semibold text-sm text-left text-slate-600" id="nav-${tabId}" title="${label}">
                ${svgIcon} <span class="sidebar-text">${label}</span>
            </button>`;
        }
    };

    const sidebar = `
        <div id="sidebar-overlay" onclick="toggleMobileSidebar()" class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden hidden"></div>
        <aside id="left-sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="px-6 py-8 border-b border-slate-100 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">G</div>
                    <div class="sidebar-text">
                        <h1 class="font-outfit font-black text-slate-900 text-base leading-none uppercase tracking-wider">Globalisor</h1>
                        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Client Portal</span>
                    </div>
                </div>
                <button onclick="toggleDesktopSidebar()" class="hidden lg:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors" title="Hide Menu Bar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
            <div class="flex-1 px-4 py-6 overflow-y-auto space-y-1">
                ${getLinkHtml('home', 'layout-grid', 'Dashboard')}
                ${getLinkHtml('calendar', 'calendar', 'Compliance Calendar')}
                ${getLinkHtml('profile', 'building', 'Company Details & Registers')}
                ${getLinkHtml('onboarding', 'clipboard-list', 'Onboarding')}
                ${getLinkHtml('billing', 'credit-card', 'Billing')}
                ${getLinkHtml('updates', 'zap', 'Blogs')}
                
                <a href="messages.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group font-semibold text-sm text-slate-600" id="nav-messages" title="Messages">
                    ${SIDEBAR_SVGS['messages']} <span class="sidebar-text">Messages</span>
                </a>
            </div>
            <div class="p-4 border-t border-slate-100 flex items-center justify-center">
                <span class="text-[10px] text-slate-400 font-medium sidebar-text">© 2026 Globalisor</span>
            </div>
        </aside>
    `;

    const expandBtnHtml = `
        <button id="sidebar-expand-btn" onclick="toggleDesktopSidebar()" class="fixed top-6 left-6 z-40 bg-white text-slate-600 border border-slate-200 p-3 rounded-2xl shadow-xl hover:scale-105 hover:bg-slate-50 transition-all hidden" title="Show Menu Bar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </button>
    `;
    document.body.insertAdjacentHTML('afterbegin', mobileHeader + sidebar + expandBtnHtml);

    // Inject profile section into the top-right corner of global-header
    const globalHeader = document.getElementById('global-header');
    if (globalHeader) {
        globalHeader.style.position = 'relative';
        globalHeader.style.zIndex = '100';
        const profileDiv = document.createElement('div');
        profileDiv.className = 'flex items-center gap-4 relative';
        profileDiv.style.zIndex = '10000';
        profileDiv.innerHTML = `
            <!-- Chat AI Trigger -->
            <button id="client-ai-btn" onclick="window._clientToggleAI(event)" class="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative" title="Globalisor AI Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>

            <!-- Notifications -->
            <div style="position:relative;">
                <button id="client-bell-btn" onclick="window._clientToggleBell(event)" class="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative" title="Notifications">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span id="client-notif-badge" style="display:none;position:absolute;top:4px;right:4px;min-width:14px;height:14px;padding:0 2px;background:#ef4444;border-radius:9999px;border:2px solid #fff;font-size:8px;font-weight:700;color:#fff;line-height:10px;text-align:center;box-sizing:border-box;"></span>
                </button>
                <div id="client-notif-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;width:300px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);z-index:99999;overflow:hidden;font-family:'Outfit',sans-serif;">
                    <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                        <span style="font-size:12px;font-weight:700;color:#0f172a;">🔔 Notifications</span>
                        <button onclick="window._clientMarkAllRead(event)" style="font-size:10px;color:#3b82f6;font-weight:700;background:none;border:none;cursor:pointer;">Mark all read</button>
                    </div>
                    <div id="client-notif-list" style="max-height:280px;overflow-y:auto;"></div>
                </div>
            </div>

            <!-- Profile Info -->
            <div class="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">${initials}</div>
                <div class="flex flex-col leading-none">
                    <span id="user-name" class="text-xs font-semibold text-slate-900 max-w-[150px] truncate">${auth.name || 'Client User'}</span>
                    <button onclick="logout()" class="text-[10px] text-red-500 font-bold hover:underline text-left mt-0.5 border-0 bg-transparent cursor-pointer">Logout</button>
                </div>
            </div>
        `;
        globalHeader.appendChild(profileDiv);
    }

    // Set active navigation highlight
    window.updateClientSidebarActive = function(tabId) {
        document.querySelectorAll('#left-sidebar a, #left-sidebar button').forEach(el => {
            if (el.id === 'nav-' + tabId) {
                el.classList.add('bg-blue-50', 'text-blue-600');
                el.classList.remove('hover:bg-slate-100', 'hover:text-slate-900', 'text-slate-600');
                const icon = el.querySelector('svg');
                if (icon) {
                    icon.classList.remove('text-slate-400');
                    icon.classList.add('text-blue-600');
                }
            } else {
                el.classList.remove('bg-blue-50', 'text-blue-600');
                el.classList.add('text-slate-600');
                const icon = el.querySelector('svg');
                if (icon) {
                    icon.classList.add('text-slate-400');
                    icon.classList.remove('text-blue-600');
                }
            }
        });
    };

    if (isMessagesPage) {
        updateClientSidebarActive('messages');
    } else {
        // Active tab on portal.html will be updated by portal-main.js on load
        const urlParams = new URLSearchParams(window.location.search);
        const targetTab = urlParams.get('tab') || 'home';
        updateClientSidebarActive(targetTab);
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // ---- Client Notification Bell Logic ----
    window._clientNotifications = [];

    window._clientFormatNotifMessage = function(msg) {
        if (!msg) return "";
        const colonIdx = msg.indexOf(':');
        if (colonIdx !== -1) {
            const prefix = msg.substring(0, colonIdx + 1);
            const rest = msg.substring(colonIdx + 1).trim();
            if (rest.startsWith('{') && rest.endsWith('}')) {
                try {
                    const parsed = JSON.parse(rest);
                    if (parsed && typeof parsed.text === 'string') {
                        return prefix + " " + parsed.text;
                    }
                } catch (e) {}
            }
        }
        if (msg.startsWith('{') && msg.endsWith('}')) {
            try {
                const parsed = JSON.parse(msg);
                if (parsed && typeof parsed.text === 'string') {
                    return parsed.text;
                }
            } catch (e) {}
        }
        return msg;
    };

    window._clientToggleBell = function(e) {
        e.stopPropagation();
        const dd = document.getElementById('client-notif-dropdown');
        if (!dd) return;
        const isOpen = dd.style.display === 'block';
        dd.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            setTimeout(() => {
                document.addEventListener('click', window._clientCloseBell, { once: true });
            }, 10);
        }
    };

    window._clientCloseBell = function() {
        const dd = document.getElementById('client-notif-dropdown');
        if (dd) dd.style.display = 'none';
    };

    window._clientMarkAllRead = async function(e) {
        e.stopPropagation();
        try {
            const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
            const clientId = auth.id || auth.userId || '';
            if (clientId) await fetch(`/api/notifications/read-all?clientId=${clientId}`, { method: 'POST' });
        } catch(err) {}
        const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
        const clientId = auth.id || auth.userId || '';
        window._clientNotifications = window._clientNotifications.map(n => {
            const readBy = n.readBy || [];
            if (!readBy.includes(clientId)) {
                readBy.push(clientId);
            }
            return { ...n, readBy };
        });
        window._clientRenderNotifications();
    };

    window._clientRenderNotifications = function() {
        const list = document.getElementById('client-notif-list');
        const badge = document.getElementById('client-notif-badge');
        if (!list) return;
        const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
        const clientId = auth.id || auth.userId || '';
        const notifs = window._clientNotifications || [];
        const unread = notifs.filter(n => !n.readBy || !n.readBy.includes(clientId)).length;
        if (badge) {
            if (unread > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = unread > 99 ? '99+' : unread;
            } else {
                badge.style.display = 'none';
            }
        }
        if (notifs.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">No notifications yet</div>';
            return;
        }
        list.innerHTML = notifs.slice(0, 20).map(n => {
            const isRead = n.readBy && n.readBy.includes(clientId);
            const displayMsg = window._clientFormatNotifMessage(n.message || n.description || '');
            return `
            <div onclick="window._clientNotifClick('${n.id || ''}','${n.link || ''}')" style="padding:10px 14px;border-bottom:1px solid #f8fafc;cursor:pointer;background:${isRead ? '#fff' : '#eff6ff'};">
                <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px;">${n.title || 'Notification'}</div>
                <div style="font-size:11px;color:#64748b;line-height:1.4;">${displayMsg}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}</div>
            </div>
            `;
        }).join('');
    };

    window._clientNotifClick = async function(id, link) {
        const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
        const clientId = auth.id || auth.userId || '';
        if (id) {
            try {
                await fetch(`/api/notifications/read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notifId: id, clientId: clientId })
                });
            } catch(e) {}
            const n = window._clientNotifications.find(n => n.id === id);
            if (n) {
                if (!n.readBy) n.readBy = [];
                if (!n.readBy.includes(clientId)) {
                    n.readBy.push(clientId);
                }
            }
            window._clientRenderNotifications();
        }
        window._clientCloseBell();
        if (link && link !== 'undefined' && link !== '') window.location.href = link;
    };

    window._clientFetchNotifications = async function() {
        try {
            const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
            const clientId = auth.id || auth.userId || '';
            if (!clientId) return;
            const res = await fetch(`/api/notifications?clientId=${clientId}`);
            if (res.ok) {
                const data = await res.json();
                window._clientNotifications = Array.isArray(data) ? data : (data.notifications || []);
                window._clientRenderNotifications();
            }
        } catch(e) {}
    };

    window._clientFetchNotifications();
    if (!window._clientNotifInterval) {
        window._clientNotifInterval = setInterval(window._clientFetchNotifications, 10000);
    }

    // WebSocket for real-time client notifications
    if (!window._clientWsConnected) {
        try {
            const auth = JSON.parse(localStorage.getItem('client_auth') || '{}');
            const clientId = auth.id || auth.userId || '';
            if (clientId) {
                const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
                let wsHost = location.host;
                let wsProtocol = wsProto;
                if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '[::1]') {
                    wsHost = 'globalisor-77d7da9fe8c7.herokuapp.com';
                    wsProtocol = 'wss';
                }
                const ws = new WebSocket(`${wsProtocol}://${wsHost}/api/ws/chat?userId=${clientId}&role=client`);
                ws.onmessage = function(evt) {
                    try {
                        const msg = JSON.parse(evt.data);
                        if (msg.type === 'notification' || msg.type === 'new_notification') {
                            const notif = msg.notification || msg;
                            if (notif && notif.title) {
                                if (!notif.readBy) notif.readBy = [];
                                const myName = auth.name || 'Client User';
                                const isMessageFromMe = notif.type === 'message' && notif.message && notif.message.startsWith(myName + ':');
                                if (!isMessageFromMe) {
                                    const exists = window._clientNotifications.some(n => n.id === notif.id);
                                    if (!exists) {
                                        window._clientNotifications.unshift(notif);
                                        window._clientRenderNotifications();
                                        const toast = document.createElement('div');
                                        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.2);z-index:99999;font-family:Outfit,sans-serif;font-size:12px;max-width:280px;';
                                        const displayMsg = window._clientFormatNotifMessage(notif.message || notif.description || '');
                                        toast.innerHTML = `<div style="font-weight:700;margin-bottom:2px;">🔔 ${notif.title}</div><div style="opacity:0.75;">${displayMsg}</div>`;
                                        document.body.appendChild(toast);
                                        setTimeout(() => toast.remove(), 4000);
                                    }
                                }
                            }
                        }
                    } catch(e) {}
                };
                ws.onerror = function() {};
                window._clientWsConnected = true;
            }
        } catch(e) {}
    }
});

window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('left-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    }
};

window.toggleDesktopSidebar = function() {
    document.body.classList.toggle('sidebar-collapsed');
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
};

window._clientToggleAI = function(e) {
    if (e) e.stopPropagation();
    if (typeof window.toggleAIAssistant === 'function') {
        window.toggleAIAssistant();
    } else {
        window.location.href = 'portal.html?open_ai=true';
    }
};

window.logout = function() {
    localStorage.removeItem('client_auth');
    localStorage.removeItem('token');
    localStorage.removeItem('globalisor_master_v3');
    window.location.href = '/login.html';
};
