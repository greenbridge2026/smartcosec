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

    // 3. Inject Mobile Header & Sidebar
    const mobileHeader = `
        <header class="lg:hidden flex items-center justify-between px-6 py-4 bg-white/40 border-b border-white/60 sticky top-0 z-30 backdrop-blur-md">
            <div class="flex items-center gap-2 cursor-pointer" onclick="window.location.href='dashboard.html'">
                <span class="font-outfit font-black text-slate-900 text-lg uppercase tracking-wider">Globalisor</span>
            </div>
            <button onclick="toggleMobileSidebar()" class="p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors">
                <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
        </header>
    `;

    const sidebar = `
        <div id="sidebar-overlay" onclick="toggleMobileSidebar()" class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden hidden"></div>
        <aside id="left-sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="px-6 py-8 border-b border-slate-800 flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">G</div>
                <div>
                    <h1 class="font-outfit font-black text-white text-base leading-none uppercase tracking-wider">Globalisor</h1>
                    <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Admin Panel</span>
                </div>
            </div>
            <div class="flex-1 px-4 py-6 overflow-y-auto space-y-1">
                <a href="dashboard.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-clients">
                    <i data-lucide="users" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Clients
                </a>
                <a href="applications.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-applications">
                    <i data-lucide="file-text" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Applications
                </a>
                <a href="kyc.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-kyc">
                    <i data-lucide="shield-check" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> KYC Review
                </a>
                <a href="compliance.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-compliance">
                    <i data-lucide="scale" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Compliance
                </a>
                <div class="space-y-1">
                    <button onclick="toggleSidebarSubmenu('submenu-services')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm text-left">
                        <span class="flex items-center gap-3">
                            <i data-lucide="layers" class="w-5 h-5 text-slate-400 group-hover:text-white"></i>
                            <span>Services</span>
                        </span>
                        <i data-lucide="chevron-down" id="arrow-services" class="w-4 h-4 text-slate-400 group-hover:text-white transition-transform"></i>
                    </button>
                    <div id="submenu-services" class="hidden pl-11 pr-4 py-1 space-y-1">
                        <a href="content.html" class="block py-2 text-xs font-semibold hover:text-white transition-colors" id="sub-btn-content">Add-On Services</a>
                        <a href="blogs.html" class="block py-2 text-xs font-semibold hover:text-white transition-colors" id="sub-btn-blogs">Blogs</a>
                    </div>
                </div>
                <a href="reports.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-reports">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Reports
                </a>
                <a href="messages.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-messages">
                    <i data-lucide="message-square" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Messages
                </a>
                <a href="users.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors group font-semibold text-sm" id="nav-btn-users">
                    <i data-lucide="user-plus" class="w-5 h-5 text-slate-400 group-hover:text-white"></i> Users
                </a>
            </div>
            <div class="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">A</div>
                    <div class="flex flex-col leading-none">
                        <span class="text-xs font-semibold text-white">Admin Team</span>
                        <span class="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Admin Role</span>
                    </div>
                </div>
                <button onclick="logout()" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Sign Out">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </button>
            </div>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', mobileHeader + sidebar);

    // 4. Set active navigation
    const path = window.location.pathname;
    let activeId = '';
    if (path.includes('dashboard.html')) activeId = 'nav-btn-clients';
    else if (path.includes('applications.html')) activeId = 'nav-btn-applications';
    else if (path.includes('kyc.html')) activeId = 'nav-btn-kyc';
    else if (path.includes('compliance.html')) activeId = 'nav-btn-compliance';
    else if (path.includes('reports.html')) activeId = 'nav-btn-reports';
    else if (path.includes('messages.html')) activeId = 'nav-btn-messages';
    else if (path.includes('users.html')) activeId = 'nav-btn-users';

    if (path.includes('content.html')) {
        const el = document.getElementById('submenu-services');
        const arrow = document.getElementById('arrow-services');
        if (el) el.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
        const subBtn = document.getElementById('sub-btn-content');
        if (subBtn) subBtn.classList.add('text-white', 'underline');
    } else if (path.includes('blogs.html')) {
        const el = document.getElementById('submenu-services');
        const arrow = document.getElementById('arrow-services');
        if (el) el.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
        const subBtn = document.getElementById('sub-btn-blogs');
        if (subBtn) subBtn.classList.add('text-white', 'underline');
    }

    if (activeId) {
        const activeEl = document.getElementById(activeId);
        if (activeEl) {
            activeEl.classList.add('bg-blue-600', 'text-white');
            activeEl.classList.remove('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
            const icon = activeEl.querySelector('i');
            if (icon) icon.classList.remove('text-slate-400');
            if (icon) icon.classList.add('text-white');
        }
    }

    // 5. Recreate lucide icons for sidebar
    if (window.lucide) {
        window.lucide.createIcons();
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

window.toggleSidebarSubmenu = function(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById('arrow-services');
    if (el) {
        const isHidden = el.classList.contains('hidden');
        if (isHidden) {
            el.classList.remove('hidden');
            if (arrow) arrow.classList.add('rotate-180');
        } else {
            el.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    }
};

window.logout = function() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('token');
    window.location.href = '/auth.html';
};
