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
        const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('admin_auth') || '{}').token;
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
        } else if (res.status === 401) {
            window.logout();
        }
    } catch (e) {
        console.error("Failed to sync application sequence IDs", e);
    }
    return window.appSeqMap || {};
};

// Start background sync
window.initAppSeqMap();

// Global navigation functions
window.toggleSubmenu = function(id) {
    const submenu = document.getElementById(id);
    const btn = document.getElementById('btn-services');
    if (submenu) {
        const isOpen = !submenu.classList.contains('hidden');
        const arrow = btn ? btn.querySelector('.submenu-arrow') : null;
        if (isOpen) {
            submenu.classList.add('hidden');
            if (btn) btn.classList.remove('submenu-open');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        } else {
            submenu.classList.remove('hidden');
            if (btn) btn.classList.add('submenu-open');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
    }
};

window.logout = function() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('token');
    window.location.href = '/auth.html';
};

window.toggleMobileSidebar = function() {
    const switcher = document.getElementById('module-switcher');
    const overlay = document.getElementById('sidebar-overlay');
    if (switcher && overlay) {
        const isOpen = switcher.classList.toggle('open');
        if (isOpen) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
};

window.toggleSidebar = function() {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
        window.toggleMobileSidebar();
    } else {
        document.body.classList.toggle('sidebar-collapsed');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('admin_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 0. Restore sidebar collapse state on load
    if (localStorage.getItem('admin_sidebar_collapsed') === 'true' && window.innerWidth >= 1024) {
        document.body.classList.add('sidebar-collapsed');
    }

    // 1. Inject responsive CSS styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        /* Sidebar transition styles */
        #module-switcher {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .main-container {
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease !important;
        }

        /* On screens smaller than 1024px (mobile/tablet) */
        @media (max-width: 1023px) {
            #module-switcher {
                transform: translateX(-100%);
                top: 60px !important;
                left: 0 !important;
                height: calc(100vh - 60px) !important;
                width: 240px !important;
                z-index: 9999 !important;
                display: flex !important;
                flex-direction: column !important;
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(25px) !important;
                border-right: 1px solid rgba(0, 0, 0, 0.1) !important;
            }
            #module-switcher.open {
                transform: translateX(0) !important;
            }
            .main-container {
                margin-left: 0 !important;
                padding: 1rem !important;
            }
        }
        /* On desktop screens (1024px and up) */
        @media (min-width: 1024px) {
            #module-switcher {
                transform: translateX(0);
            }
            body.sidebar-collapsed #module-switcher {
                transform: translateX(-100%) !important;
            }
            body.sidebar-collapsed .main-container {
                margin-left: 0 !important;
            }
        }
        
        /* Submenu rotation */
        .submenu-arrow {
            transition: transform 0.2s ease;
        }
        .submenu-open .submenu-arrow {
            transform: rotate(180deg);
        }
    `;
    document.head.appendChild(style);

    // 2. Inject Mobile Overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'fixed inset-0 z-[9990] bg-slate-900/40 backdrop-blur-sm hidden lg:hidden';
    overlay.onclick = window.toggleMobileSidebar;
    document.body.appendChild(overlay);

    // 3. Inject hamburger toggle button into top-nav
    const topNavLeft = document.querySelector('.top-nav > div.flex.items-center');
    if (topNavLeft) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebar-toggle';
        toggleBtn.className = 'p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors mr-2 flex items-center justify-center cursor-pointer';
        toggleBtn.title = 'Toggle Sidebar';
        toggleBtn.onclick = window.toggleSidebar;
        toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
        topNavLeft.insertBefore(toggleBtn, topNavLeft.firstChild);
    }

    // 4. Update the content of `#module-switcher` to ensure uniform organized links across all admin pages
    const switcher = document.getElementById('module-switcher');
if (switcher) {
    switcher.innerHTML = `
        <button onclick="window.location.href='dashboard.html'" class="module-nav-btn" id="btn-clients"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Clients</button>
        <button onclick="window.location.href='applications.html'" class="module-nav-btn" id="btn-applications"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> Applications</button>
        <button onclick="window.location.href='kyc.html'" class="module-nav-btn" id="btn-kyc"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> KYC Review</button>
        <button onclick="window.location.href='compliance.html'" class="module-nav-btn" id="btn-compliance"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="m16 16 3-8 3 8c-.87.65-2.24.83-3 .83s-2.13-.18-3-.83Z"/><path d="m2 16 3-8 3 8c-.87.65-2.24.83-3 .83s-2.13-.18-3-.83Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg> Compliance</button>
        <button onclick="window.location.href='reports.html'" class="module-nav-btn" id="btn-reports"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> Reports</button>
        <button onclick="window.location.href='messages.html'" class="module-nav-btn" id="btn-messages"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Messages</button>
        <button onclick="window.location.href='content.html'" class="module-nav-btn" id="btn-content"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Content</button>
        <button onclick="window.location.href='vault.html'" class="module-nav-btn" id="btn-vault"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="M20 8H4"/><path d="M4 13h16"/><rect width="4" height="4" x="10" y="15" rx="1"/></svg> Document Vault</button>
        <!-- Services Accordion Group -->
        <div class="w-full flex flex-col gap-0.5">
            <button onclick="window.toggleSubmenu('services-submenu')" class="module-nav-btn" id="btn-services">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 shrink-0"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span class="flex-1 text-left">Services</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 submenu-arrow transition-transform duration-200 shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div id="services-submenu" class="submenu-container hidden pl-6 flex flex-col gap-0.5 mt-0.5">
                <button onclick="window.location.href='blogs.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-blogs"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Blogs</button>
                <button onclick="window.location.href='countries.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-countries"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Countries</button>
                <button onclick="window.location.href='users.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-users"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg> Users</button>
            </div>
        </div>
        <button onclick="window.location.href='packages.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-packages"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/></svg> Pre-Reg Manager</button>
    `;
}


    // 5. Highlight active menu item
    const path = window.location.pathname;
    let activeId = '';
        if (path.includes('dashboard.html')) activeId = 'btn-clients';
        else if (path.includes('applications.html')) activeId = 'btn-applications';
        else if (path.includes('kyc.html')) activeId = 'btn-kyc';
        else if (path.includes('compliance.html')) activeId = 'btn-compliance';
        else if (path.includes('reports.html')) activeId = 'btn-reports';
        else if (path.includes('messages.html')) activeId = 'btn-messages';
        else if (path.includes('content.html')) activeId = 'btn-content';
        else if (path.includes('vault.html')) activeId = 'btn-vault';
        else if (path.includes('blogs.html')) activeId = 'btn-blogs';
        else if (path.includes('countries.html')) activeId = 'btn-countries';
        else if (path.includes('packages.html')) activeId = 'btn-packages';
        else if (path.includes('users.html')) activeId = 'btn-users';

    // Remove active class from all buttons
    document.querySelectorAll('.module-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (activeId) {
        const activeEl = document.getElementById(activeId);
        if (activeEl) {
            activeEl.classList.add('active');
        }

        // Expand submenu if active item is under Services
        if (['btn-blogs', 'btn-countries', 'btn-packages', 'btn-users'].includes(activeId)) {
            const submenu = document.getElementById('services-submenu');
            const servicesBtn = document.getElementById('btn-services');
            if (submenu) {
                submenu.classList.remove('hidden');
            }
            if (servicesBtn) {
                servicesBtn.classList.add('submenu-open');
                const arrow = servicesBtn.querySelector('.submenu-arrow');
                if (arrow) {
                    arrow.style.transform = 'rotate(180deg)';
                }
            }
        }
    }

    // 6. Inject notification bell into nav right section (if not already present)
    const navRight = document.querySelector('.top-nav > div.flex.items-center.justify-end');
    if (navRight && !document.getElementById('admin-bell-btn') && !document.getElementById('bell-btn')) {
        // Insert bell button before the first child of navRight
        const bellWrapper = document.createElement('div');
        bellWrapper.style.cssText = 'position:relative;display:flex;align-items:center;';
        bellWrapper.innerHTML = `
            <button id="admin-bell-btn" title="Notifications" style="position:relative;padding:0.5rem;border-radius:9999px;background:transparent;border:none;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'" onclick="window._adminToggleBell(event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span id="admin-notif-badge" style="display:none;position:absolute;top:4px;right:4px;min-width:16px;height:16px;padding:0 3px;background:#ef4444;border-radius:9999px;border:2px solid #fff;font-size:9px;font-weight:700;color:#fff;line-height:12px;text-align:center;box-sizing:border-box;font-family:'Outfit',sans-serif;"></span>
            </button>
            <div id="admin-notif-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;width:320px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.12);z-index:99999;overflow:hidden;font-family:'Outfit',sans-serif;">
                <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                    <span style="font-size:13px;font-weight:700;color:#0f172a;">🔔 Notifications</span>
                    <button onclick="window._adminMarkAllRead(event)" style="font-size:11px;color:#3b82f6;font-weight:700;background:none;border:none;cursor:pointer;">Mark all read</button>
                </div>
                <div id="admin-notif-list" style="max-height:300px;overflow-y:auto;"></div>
            </div>
        `;
        navRight.insertBefore(bellWrapper, navRight.firstChild);
    }

    // 7. Notification bell logic for admin pages (shared)
    window._adminNotifications = window._adminNotifications || [];

    window._adminFormatNotifMessage = function(msg) {
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

    window._adminToggleBell = function(e) {
        e.stopPropagation();
        const dd = document.getElementById('admin-notif-dropdown');
        if (!dd) return;
        const isOpen = dd.style.display === 'block';
        dd.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', window._adminCloseBell, { once: true });
            }, 10);
        }
    };

    window._adminCloseBell = function() {
        const dd = document.getElementById('admin-notif-dropdown');
        if (dd) dd.style.display = 'none';
    };

    window._adminMarkAllRead = async function(e) {
        e.stopPropagation();
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';
            await fetch(`/api/notifications/read-all?clientId=${adminId}`, { method: 'POST' });
        } catch(err) { console.warn('Mark all read failed', err); }
        const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
        const adminId = auth.id || auth.userId || 'staff-admin';
        window._adminNotifications = window._adminNotifications.map(n => {
            const readBy = n.readBy || [];
            if (!readBy.includes(adminId)) {
                readBy.push(adminId);
            }
            return { ...n, readBy };
        });
        window._adminRenderNotifications();
    };

    window._adminRenderNotifications = function() {
        const list = document.getElementById('admin-notif-list');
        const badge = document.getElementById('admin-notif-badge');
        if (!list) return;
        const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
        const adminId = auth.id || auth.userId || 'staff-admin';
        const notifs = window._adminNotifications || [];
        const unread = notifs.filter(n => !n.readBy || !n.readBy.includes(adminId)).length;
        if (badge) {
            if (unread > 0) {
                badge.style.display = 'inline-flex';
                badge.textContent = unread > 99 ? '99+' : unread;
            } else {
                badge.style.display = 'none';
            }
        }
        if (notifs.length === 0) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px;">No notifications yet</div>';
            return;
        }
        list.innerHTML = notifs.slice(0, 20).map(n => {
            const isRead = n.readBy && n.readBy.includes(adminId);
            const displayMsg = window._adminFormatNotifMessage(n.message || n.description || '');
            return `
            <div onclick="window._adminNotifClick('${n.id || ''}','${n.link || ''}')" style="padding:12px 16px;border-bottom:1px solid #f8fafc;cursor:pointer;background:${isRead ? '#fff' : '#eff6ff'};transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${isRead ? '#fff' : '#eff6ff'}'">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px;">${n.title || 'Notification'}</div>
                        <div style="font-size:11px;color:#64748b;line-height:1.4;">${displayMsg}</div>
                    </div>
                    ${!isRead ? '<div style="width:6px;height:6px;background:#3b82f6;border-radius:50%;margin-top:3px;flex-shrink:0;"></div>' : ''}
                </div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}</div>
            </div>
            `;
        }).join('');
    };

    window._adminNotifClick = async function(id, link) {
        const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
        const adminId = auth.id || auth.userId || 'staff-admin';
        if (id) {
            try {
                await fetch(`/api/notifications/read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notifId: id, clientId: adminId })
                });
            } catch(e) {}
            const notif = window._adminNotifications.find(n => n.id === id);
            if (notif) {
                if (!notif.readBy) notif.readBy = [];
                if (!notif.readBy.includes(adminId)) {
                    notif.readBy.push(adminId);
                }
                if (!link || link === 'undefined' || link === '') {
                    if (notif.type === 'message') {
                        link = 'messages.html';
                    } else if (notif.type === 'blog') {
                        link = 'blogs.html';
                    } else if (notif.type === 'kyc' || notif.type === 'document_request') {
                        link = 'kyc.html';
                    } else if (notif.type === 'assignment') {
                        link = 'applications.html';
                    }
                }
            }
            window._adminRenderNotifications();
        }
        window._adminCloseBell();
        if (link && link !== 'undefined' && link !== '') {
            window.location.href = link;
        }
    };

    window._adminFetchNotifications = async function() {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';
            const res = await fetch(`/api/notifications?clientId=${adminId}`);
            if (res.ok) {
                const data = await res.json();
                window._adminNotifications = Array.isArray(data) ? data : (data.notifications || []);
                window._adminRenderNotifications();
            }
        } catch(e) { /* silently fail */ }
    };

    // Initial fetch + poll every 10s
    window._adminFetchNotifications();
    if (!window._adminNotifInterval) {
        window._adminNotifInterval = setInterval(window._adminFetchNotifications, 10000);
    }

    // WebSocket listener for real-time notifications
    if (!window._adminWsConnected) {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';
            const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
            const ws = new WebSocket(`${wsProto}://${location.host}/api/ws/chat?userId=${adminId}&role=admin`);
            ws.onmessage = function(evt) {
                try {
                    const msg = JSON.parse(evt.data);
                    if (msg.type === 'notification' || msg.type === 'new_notification') {
                        const notif = msg.notification || msg;
                        if (notif && notif.title) {
                            if (!notif.readBy) notif.readBy = [];
                            const myName = auth.name || 'Admin Team';
                            const isMessageFromMe = notif.type === 'message' && notif.message && notif.message.startsWith(myName + ':');
                            if (!isMessageFromMe) {
                                const exists = window._adminNotifications.some(n => n.id === notif.id);
                                if (!exists) {
                                    window._adminNotifications.unshift(notif);
                                    window._adminRenderNotifications();
                                    window._adminShowToast(notif);
                                }
                            }
                        }
                    }
                } catch(e) {}
            };
            ws.onerror = function() {};
            window._adminWsConnected = true;
        } catch(e) {}
    }

    window._adminShowToast = function(n) {
        const title = n.title || 'Notification';
        const rawMsg = n.message || n.description || '';
        const msg = window._adminFormatNotifMessage(rawMsg);
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.2);z-index:99999;font-family:Outfit,sans-serif;font-size:12px;max-width:280px;animation:slideInToast 0.3s ease;cursor:pointer;';
        toast.innerHTML = `<div style="font-weight:700;margin-bottom:2px;">🔔 ${title}</div><div style="opacity:0.75;">${msg}</div>`;
        
        toast.onclick = () => {
            toast.remove();
            let link = n.link;
            if (!link) {
                if (n.type === 'message') {
                    link = 'messages.html';
                } else if (n.type === 'blog') {
                    link = 'blogs.html';
                } else if (n.type === 'kyc' || n.type === 'document_request') {
                    link = 'kyc.html';
                } else if (n.type === 'assignment') {
                    link = 'applications.html';
                }
            }
            window._adminNotifClick(n.id, link);
        };

        if (!document.getElementById('admin-toast-style')) {
            const s = document.createElement('style');
            s.id = 'admin-toast-style';
            s.textContent = '@keyframes slideInToast{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    };

    // --- Quick Chat Popup Injector ---
    const qAuthObj = JSON.parse(localStorage.getItem('admin_auth') || '{}');
    const qMyId = qAuthObj.id || qAuthObj.userId || 'staff-admin';
    const qMyName = qAuthObj.name || 'Admin Team';
    
    let qTeamContacts = [];
    let qAllTeamMessages = [];
    let qCurrentQuickChatId = null;
    let qQuickChatPoll = null;
    
    const qTeamGroups = [
        { id: 'team_group_general', name: 'General Ops', isGroup: true, description: 'General announcements and operations discussion.' },
        { id: 'team_group_operations', name: 'Compliance & KYC', isGroup: true, description: 'KYC escalation and compliance checks.' },
        { id: 'team_group_support_team', name: 'Support Desk Staff', isGroup: true, description: 'Customer support coordination and shifts.' }
    ];

    function qParseMessageText(text) {
        if (text && text.startsWith('{') && text.endsWith('}')) {
            try {
                return JSON.parse(text);
            } catch(e) {}
        }
        return { text: text, reactions: {}, attachments: [] };
    }

    async function qFetchTeamContacts() {
        try {
            const res = await fetch('/api/admin/staff');
            if (res.ok) {
                const staff = await res.json();
                qTeamContacts = staff.map(s => ({
                    id: s.id,
                    name: (s.firstName + ' ' + s.lastName).trim(),
                    email: s.email,
                    role: 'staff',
                    isOnline: false,
                    lastSeen: null
                }));
                
                // Fetch presence for each staff
                for (let contact of qTeamContacts) {
                    const presenceRes = await fetch(`/api/messages/presence?userId=${contact.id}`);
                    if (presenceRes.ok) {
                        const pres = await presenceRes.json();
                        contact.isOnline = pres.isOnline;
                        contact.lastSeen = pres.lastSeen;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch team contacts", e);
        }
    }

    async function qFetchAllTeamMessages() {
        try {
            const res = await fetch('/api/messages');
            if (res.ok) {
                const allMsgs = await res.json();
                qAllTeamMessages = allMsgs.filter(m => m.clientId && (m.clientId.startsWith('team_chat_') || m.clientId.startsWith('team_group_')));
            }
        } catch (e) {
            console.error(e);
        }
    }

    function qGetOneToOneChatId(idA, idB) {
        const list = [idA, idB].sort();
        return `team_chat_${list[0]}_${list[1]}`;
    }

    window.toggleQuickChat = function() {
        const win = document.getElementById('quick-chat-window');
        if (!win) return;
        const isOpen = win.classList.contains('pointer-events-none');
        if (isOpen) {
            win.classList.remove('pointer-events-none', 'translate-y-10', 'opacity-0');
            win.classList.add('translate-y-0', 'opacity-100');
            window.showQuickChatContacts();
            window.updateQuickChatUnreadBadge();
        } else {
            win.classList.add('pointer-events-none', 'translate-y-10', 'opacity-0');
            win.classList.remove('translate-y-0', 'opacity-100');
            if (qQuickChatPoll) clearInterval(qQuickChatPoll);
            qCurrentQuickChatId = null;
        }
    };

    window.updateQuickChatUnreadBadge = async function() {
        await qFetchAllTeamMessages();
        let totalUnread = 0;
        
        // Channels unread
        qTeamGroups.forEach(g => {
            const chatMsgs = qAllTeamMessages.filter(m => m.clientId === g.id);
            totalUnread += chatMsgs.filter(m => m.senderId !== qMyId && !m.isRead).length;
        });
        // Direct DMs unread
        qTeamContacts.forEach(c => {
            if (c.id === qMyId) return;
            const chatId = qGetOneToOneChatId(qMyId, c.id);
            const chatMsgs = qAllTeamMessages.filter(m => m.clientId === chatId);
            totalUnread += chatMsgs.filter(m => m.senderId !== qMyId && !m.isRead).length;
        });
        
        const badge = document.getElementById('quick-chat-badge');
        if (badge) {
            if (totalUnread > 0) {
                badge.innerText = totalUnread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    };

    window.showQuickChatContacts = async function() {
        const body = document.getElementById('quick-chat-body');
        if (!body) return;
        body.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">Loading contacts...</div>';
        
        await qFetchTeamContacts();
        await qFetchAllTeamMessages();
        
        const getChatDetails = (chatId) => {
            const chatMsgs = qAllTeamMessages.filter(m => m.clientId === chatId);
            const unreadCount = chatMsgs.filter(m => m.senderId !== qMyId && !m.isRead).length;
            const latest = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
            return {
                unreadCount,
                lastMessage: latest ? qParseMessageText(latest.text).text : 'No messages yet'
            };
        };

        const channelsList = qTeamGroups.map(g => {
            const details = getChatDetails(g.id);
            const unread = details.unreadCount > 0 ? `<span class="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">${details.unreadCount}</span>` : '';
            return `
                <div onclick="selectQuickChatRoom('${g.id}', '${g.name}')" class="p-3 border-b border-slate-100 hover:bg-slate-100/50 cursor-pointer flex justify-between items-center transition-all bg-white">
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-bold text-slate-800"># ${g.name}</div>
                        <div class="text-[10px] text-slate-400 truncate">${details.lastMessage}</div>
                    </div>
                    ${unread}
                </div>
            `;
        }).join('');

        const dmsList = qTeamContacts.filter(c => c.id !== qMyId).map(c => {
            const chatId = qGetOneToOneChatId(qMyId, c.id);
            const details = getChatDetails(chatId);
            const unread = details.unreadCount > 0 ? `<span class="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">${details.unreadCount}</span>` : '';
            const onlineDot = c.isOnline ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>` : `<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>`;
            return `
                <div onclick="selectQuickChatRoom('${chatId}', '${c.name}')" class="p-3 border-b border-slate-100 hover:bg-slate-100/50 cursor-pointer flex justify-between items-center transition-all bg-white">
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-bold text-slate-800 flex items-center gap-1">${onlineDot} ${c.name}</div>
                        <div class="text-[10px] text-slate-400 truncate">${details.lastMessage}</div>
                    </div>
                    ${unread}
                </div>
            `;
        }).join('');

        body.innerHTML = `
            <div class="flex-1 overflow-y-auto min-h-0">
                <div class="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/30">Channels</div>
                ${channelsList}
                <div class="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/30">Direct Messages</div>
                ${dmsList}
            </div>
        `;
    };

    window.selectQuickChatRoom = async function(chatId, chatName) {
        qCurrentQuickChatId = chatId;
        const body = document.getElementById('quick-chat-body');
        if (!body) return;
        
        body.innerHTML = `
            <div class="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
                <button onclick="showQuickChatContacts()" class="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"/></svg> Back</button>
                <div class="text-xs font-bold text-slate-800">${chatName}</div>
                <div class="w-10"></div>
            </div>
            <div id="quick-messages-container" class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white">
                <div class="text-center py-6 text-slate-300 text-xs">Loading messages...</div>
            </div>
            <div class="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <form onsubmit="handleSendQuick(event)" class="flex gap-2">
                    <input type="text" id="quick-chat-input" placeholder="Type message..." class="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <button type="submit" class="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
                </form>
            </div>
        `;
        
        await qFetchQuickMessages();
        qMarkTeamMessagesAsRead(chatId);
        
        if (qQuickChatPoll) clearInterval(qQuickChatPoll);
        qQuickChatPoll = setInterval(qFetchQuickMessages, 3000);
    };

    async function qMarkTeamMessagesAsRead(chatId) {
        try {
            const res = await fetch(`/api/messages?clientId=${chatId}`);
            if (res.ok) {
                const messages = await res.json();
                for (let m of messages) {
                    if (m.senderId !== qMyId && !m.isRead) {
                        await fetch(`/api/messages/${m.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isRead: true })
                        });
                    }
                }
            }
        } catch(e) {}
    }

    async function qFetchQuickMessages() {
        if (!qCurrentQuickChatId) return;
        const container = document.getElementById('quick-messages-container');
        if (!container) return;
        
        try {
            const res = await fetch(`/api/messages?clientId=${qCurrentQuickChatId}`);
            if (!res.ok) return;
            const messages = await res.json();
            
            if (messages.length === 0) {
                container.innerHTML = '<div class="text-center py-8 text-slate-300 text-xs">No messages yet.</div>';
                return;
            }
            
            const html = messages.map(m => {
                const isMe = m.senderId === qMyId;
                const payload = qParseMessageText(m.text);
                return `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-[80%]">
                            <div class="text-[8px] font-bold text-slate-400 mb-0.5 ${isMe ? 'text-right' : 'text-left'}">${m.senderName}</div>
                            <div class="px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'} break-words">
                                ${payload.text}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
            container.innerHTML = html;
            if (shouldScroll || container.innerHTML.length < 500) container.scrollTop = container.scrollHeight;
        } catch(e) {}
    }

    window.handleSendQuick = async function(e) {
        e.preventDefault();
        const input = document.getElementById('quick-chat-input');
        if (!input || !qCurrentQuickChatId) return;
        const text = input.value.trim();
        if (!text) return;
        
        const payload = {
            text: text,
            reactions: {},
            attachments: []
        };

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: qCurrentQuickChatId,
                    senderId: qMyId,
                    senderName: qMyName,
                    senderRole: 'admin',
                    text: JSON.stringify(payload)
                })
            });
            input.value = '';
            qFetchQuickMessages();
            window.updateQuickChatUnreadBadge();
        } catch(e) {}
    };

    function initQuickChat() {
        if (!localStorage.getItem('admin_auth')) return;
        if (document.getElementById('quick-chat-fab')) return;
        
        const quickChatDiv = document.createElement('div');
        quickChatDiv.innerHTML = `
            <div id="quick-chat-fab" class="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 cursor-pointer transition-all flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span id="quick-chat-badge" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center hidden">0</span>
            </div>
            <div id="quick-chat-window" class="fixed bottom-24 right-6 w-96 h-[500px] bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-[9999] transform translate-y-10 opacity-0 pointer-events-none transition-all duration-300">
                <div class="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span class="font-bold text-sm">Quick Team Chat</span>
                    </div>
                    <button onclick="toggleQuickChat()" class="text-white/70 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div id="quick-chat-body" class="flex-1 flex flex-col min-h-0 bg-slate-50/50">
                    <!-- Contacts / Messages will render here -->
                </div>
            </div>
        `;
        document.body.appendChild(quickChatDiv);
        
        document.getElementById('quick-chat-fab').onclick = toggleQuickChat;
        
        window.showQuickChatContacts();
        window.updateQuickChatUnreadBadge();
        
        setInterval(window.updateQuickChatUnreadBadge, 5000);
    }

    // Initialize Quick Chat popup
    initQuickChat();

    // 8. Refresh Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
