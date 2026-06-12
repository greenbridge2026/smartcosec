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
                <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
        </header>
    `;

    const getLinkHtml = (tabId, icon, label) => {
        if (isMessagesPage) {
            return `<a href="portal.html?tab=${tabId}" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-${tabId}">
                <i data-lucide="${icon}" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> ${label}
            </a>`;
        } else {
            return `<button onclick="switchTab('${tabId}'); if(window.innerWidth < 1024) toggleMobileSidebar();" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm text-left" id="nav-${tabId}">
                <i data-lucide="${icon}" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> ${label}
            </button>`;
        }
    };

    const sidebar = `
        <div id="sidebar-overlay" onclick="toggleMobileSidebar()" class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden hidden"></div>
        <aside id="left-sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="px-6 py-8 border-b border-slate-800 flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">G</div>
                <div>
                    <h1 class="font-outfit font-black text-white text-base leading-none uppercase tracking-wider">Globalisor</h1>
                    <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Client Portal</span>
                </div>
            </div>
            <div class="flex-1 px-4 py-6 overflow-y-auto space-y-1">
                ${getLinkHtml('home', 'layout-grid', 'Dashboard')}
                ${getLinkHtml('services', 'activity', 'Workflows')}
                ${getLinkHtml('documents', 'shield-check', 'Vault')}
                ${getLinkHtml('billing', 'credit-card', 'Billing')}
                ${getLinkHtml('guidance', 'book-open', 'Guidance')}
                ${getLinkHtml('updates', 'zap', 'Blogs')}
                
                <a href="messages.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-messages">
                    <i data-lucide="message-square" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Messages
                </a>
            </div>
            <div class="p-4 border-t border-slate-800">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">${initials}</div>
                        <div class="flex flex-col leading-none min-w-0">
                            <span class="text-xs font-semibold text-white max-w-[100px] truncate">${auth.name || 'Client User'}</span>
                            <span class="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Client</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <div style="position:relative;">
                            <button id="client-bell-btn" onclick="window._clientToggleBell(event)" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative" title="Notifications">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                <span id="client-notif-badge" style="display:none;position:absolute;top:4px;right:4px;min-width:14px;height:14px;padding:0 2px;background:#ef4444;border-radius:9999px;border:2px solid #1e293b;font-size:8px;font-weight:700;color:#fff;line-height:10px;text-align:center;box-sizing:border-box;"></span>
                            </button>
                            <div id="client-notif-dropdown" style="display:none;position:absolute;bottom:calc(100% + 8px);right:0;width:300px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);z-index:99999;overflow:hidden;font-family:'Outfit',sans-serif;">
                                <div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                                    <span style="font-size:12px;font-weight:700;color:#0f172a;">🔔 Notifications</span>
                                    <button onclick="window._clientMarkAllRead(event)" style="font-size:10px;color:#3b82f6;font-weight:700;background:none;border:none;cursor:pointer;">Mark all read</button>
                                </div>
                                <div id="client-notif-list" style="max-height:280px;overflow-y:auto;"></div>
                            </div>
                        </div>
                        <button onclick="logout()" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Logout">
                            <i data-lucide="log-out" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', mobileHeader + sidebar);

    // Set active navigation highlight
    window.updateClientSidebarActive = function(tabId) {
        document.querySelectorAll('#left-sidebar a, #left-sidebar button').forEach(el => {
            if (el.id === 'nav-' + tabId) {
                el.classList.add('bg-emerald-600', 'text-white');
                el.classList.remove('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
                const icon = el.querySelector('i');
                if (icon) icon.classList.remove('text-slate-400');
                if (icon) icon.classList.add('text-white');
            } else {
                el.classList.remove('bg-emerald-600', 'text-white');
                el.classList.add('text-slate-300');
                const icon = el.querySelector('i');
                if (icon) icon.classList.add('text-slate-400');
                if (icon) icon.classList.remove('text-white');
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
                const ws = new WebSocket(`${wsProto}://${location.host}/api/ws/chat?userId=${clientId}&role=client`);
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

window.logout = function() {
    localStorage.removeItem('client_auth');
    localStorage.removeItem('token');
    localStorage.removeItem('globalisor_master_v3');
    window.location.href = '/auth.html';
};
