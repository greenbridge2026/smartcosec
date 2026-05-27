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
            <div class="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">${initials}</div>
                    <div class="flex flex-col leading-none">
                        <span class="text-xs font-semibold text-white max-w-[120px] truncate">${auth.name || 'Client User'}</span>
                        <span class="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Client</span>
                    </div>
                </div>
                <button onclick="logout()" class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Logout">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </button>
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
