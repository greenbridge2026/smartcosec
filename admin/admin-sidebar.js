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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject responsive CSS styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        /* On screens smaller than 1024px (mobile/tablet) */
        @media (max-width: 1023px) {
            #module-switcher {
                transform: translateX(-100%);
                transition: transform 0.3s ease-in-out;
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
                transform: translateX(0);
            }
            .main-container {
                margin-left: 0 !important;
                padding: 1rem !important;
            }
            #mobile-menu-toggle {
                display: flex !important;
            }
        }
        /* On desktop screens (1024px and up) */
        @media (min-width: 1024px) {
            #module-switcher {
                transform: translateX(0) !important;
            }
            #mobile-menu-toggle {
                display: none !important;
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
        toggleBtn.id = 'mobile-menu-toggle';
        toggleBtn.className = 'p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors lg:hidden hidden mr-2';
        toggleBtn.onclick = window.toggleMobileSidebar;
        toggleBtn.innerHTML = `<i data-lucide="menu" class="w-6 h-6"></i>`;
        topNavLeft.insertBefore(toggleBtn, topNavLeft.firstChild);
    }

    // 4. Update the content of `#module-switcher` to ensure uniform organized links across all admin pages
    const switcher = document.getElementById('module-switcher');
    if (switcher) {
        switcher.innerHTML = `
            <button onclick="window.location.href='dashboard.html'" class="module-nav-btn" id="btn-clients"><i data-lucide="users" class="w-4 h-4"></i> Clients</button>
            <button onclick="window.location.href='applications.html'" class="module-nav-btn" id="btn-applications"><i data-lucide="file-text" class="w-4 h-4"></i> Applications</button>
            <button onclick="window.location.href='kyc.html'" class="module-nav-btn" id="btn-kyc"><i data-lucide="shield-check" class="w-4 h-4"></i> KYC Review</button>
            <button onclick="window.location.href='compliance.html'" class="module-nav-btn" id="btn-compliance"><i data-lucide="balance-scale" class="w-4 h-4"></i> Compliance</button>
            
            <button onclick="window.location.href='reports.html'" class="module-nav-btn" id="btn-reports"><i data-lucide="bar-chart-3" class="w-4 h-4"></i> Reports</button>
            <button onclick="window.location.href='messages.html'" class="module-nav-btn" id="btn-messages"><i data-lucide="message-square" class="w-4 h-4"></i> Messages</button>
            <button onclick="window.location.href='content.html'" class="module-nav-btn" id="btn-content"><i data-lucide="book-open" class="w-4 h-4"></i> Content</button>

            <!-- Services Accordion Group -->
            <div class="w-full flex flex-col gap-0.5">
                <button onclick="window.toggleSubmenu('services-submenu')" class="module-nav-btn" id="btn-services">
                    <i data-lucide="briefcase" class="w-4 h-4"></i>
                    <span class="flex-1 text-left">Services</span>
                    <i data-lucide="chevron-down" class="w-3 h-3 submenu-arrow transition-transform"></i>
                </button>
                <div id="services-submenu" class="submenu-container hidden pl-6 flex flex-col gap-0.5 mt-0.5">
                    <button onclick="window.location.href='blogs.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-blogs"><i data-lucide="layout" class="w-3.5 h-3.5"></i> Blogs</button>
                    <button onclick="window.location.href='countries.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-countries"><i data-lucide="globe" class="w-3.5 h-3.5"></i> Countries</button>
                    <button onclick="window.location.href='packages.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-packages"><i data-lucide="package" class="w-3.5 h-3.5"></i> Packages</button>
                    <button onclick="window.location.href='users.html'" class="module-nav-btn py-1.5 text-[0.75rem]" id="btn-users"><i data-lucide="user-plus" class="w-3.5 h-3.5"></i> Users</button>
                </div>
            </div>
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
