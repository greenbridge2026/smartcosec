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
        // Hide button to collapse sidebar
        const hideBtn = document.createElement('button');
        hideBtn.id = 'sidebar-hide-btn';
        hideBtn.className = 'p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors mr-2 flex items-center justify-center cursor-pointer';
        hideBtn.title = 'Hide Sidebar';
        hideBtn.onclick = window.toggleSidebar;
        hideBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M6 9l6 6 6-6"/></svg>`;
        topNavLeft.insertBefore(hideBtn, topNavLeft.firstChild);
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
        <button onclick="window.location.href='packages.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-packages"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0"><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/></svg> Packages</button>
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

    // 6. Refresh Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
