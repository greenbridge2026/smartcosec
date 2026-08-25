// --- SPA ROUTER & RESOURCE TRACKER SYSTEM ---
let activeIntervals = [];
let activeTimeouts = [];
let activeEventListeners = [];
let activeWebSockets = [];

const originalSetInterval = window.setInterval;
window.setInterval = function(handler, timeout, ...args) {
    const id = originalSetInterval(handler, timeout, ...args);
    activeIntervals.push(id);
    return id;
};

const originalSetTimeout = window.setTimeout;
window.setTimeout = function(handler, timeout, ...args) {
    const id = originalSetTimeout(handler, timeout, ...args);
    activeTimeouts.push(id);
    return id;
};

const originalAddEventListener = window.addEventListener;
window.addEventListener = function(type, listener, options) {
    if (type !== 'popstate' && type !== 'storage') {
        activeEventListeners.push({ target: window, type, listener, options });
    }
    originalAddEventListener.call(window, type, listener, options);
};

const originalDocAddEventListener = document.addEventListener;
document.addEventListener = function(type, listener, options) {
    if (type !== 'DOMContentLoaded') {
        activeEventListeners.push({ target: document, type, listener, options });
    }
    originalDocAddEventListener.call(document, type, listener, options);
};

const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    activeWebSockets.push(ws);
    return ws;
};
window.WebSocket.prototype = originalWebSocket.prototype;
Object.getOwnPropertyNames(originalWebSocket).forEach(prop => {
    if (!(prop in window.WebSocket)) {
        try {
            window.WebSocket[prop] = originalWebSocket[prop];
        } catch (e) {}
    }
});

// Intercept document.getElementById to prevent TypeErrors in legacy scripts
const originalGetElementById = document.getElementById;
document.getElementById = function(id) {
    const el = originalGetElementById.call(document, id);
    if (!el && (id === 'btn-services' || id === 'services-submenu')) {
        const mockEl = document.createElement('div');
        mockEl.id = id;
        mockEl.classList.add = () => {};
        mockEl.classList.remove = () => {};
        mockEl.classList.toggle = () => {};
        mockEl.classList.contains = () => false;
        return mockEl;
    }
    return el;
};

function cleanupPageResources() {
    // 1. Brute-force clear intervals
    const maxIntervalId = originalSetInterval(() => {}, 9999);
    for (let i = 1; i <= maxIntervalId; i++) {
        clearInterval(i);
    }
    activeIntervals = [];

    // 2. Brute-force clear timeouts
    const maxTimeoutId = originalSetTimeout(() => {}, 9999);
    for (let i = 1; i <= maxTimeoutId; i++) {
        clearTimeout(i);
    }
    activeTimeouts = [];

    // 3. Clear tracked event listeners
    activeEventListeners.forEach(({ target, type, listener, options }) => {
        try {
            target.removeEventListener(type, listener, options);
        } catch (e) {}
    });
    activeEventListeners = [];

    // 4. Close tracked WebSockets
    activeWebSockets.forEach(ws => {
        try {
            if (ws.readyState === originalWebSocket.OPEN || ws.readyState === originalWebSocket.CONNECTING) {
                ws.close();
            }
        } catch (e) {}
    });
    activeWebSockets = [];

    // 5. Clean up dashboard specific global references
    delete window.switchDashboardModule;
}

function isLocalAdminLink(url) {
    if (!url) return false;
    const loc = window.location;
    let urlStr = url;
    if (urlStr.startsWith(loc.origin)) {
        urlStr = urlStr.substring(loc.origin.length);
    }
    if (urlStr.includes('://')) return false;
    const path = urlStr.split('?')[0].split('#')[0];
    if (path.includes('document-viewer')) return false;
    return (path.endsWith('.html') || !path.includes('.')) && !path.includes('/auth.html');
}

function updateActiveSidebarItem(url) {
    // Clear current active classes
    document.querySelectorAll('.submenu-item, .direct-link-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.category-btn').forEach(el => el.classList.remove('active-category', 'open-category'));
    document.querySelectorAll('.submenu-wrapper').forEach(el => el.classList.remove('open'));

    // Parse the path and query from url
    try {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        const search = urlObj.search;

        let activeId = '';
        let activeCatId = '';
        let activeSubId = '';

        if (path.includes('dashboard.html')) {
            if (search.includes('view=clients') || search.includes('tab=clients')) {
                activeId = 'nav-clients';
            } else {
                activeId = 'nav-dashboard';
            }
        } else if (path.includes('applications.html')) {
            activeId = 'nav-applications';
            activeCatId = 'cat-operations';
            activeSubId = 'sub-operations';
        } else if (path.includes('kyc.html')) {
            activeId = 'nav-kyc';
            activeCatId = 'cat-operations';
            activeSubId = 'sub-operations';
        } else if (path.includes('onboarding.html')) {
            activeId = 'nav-onboarding';
            activeCatId = 'cat-operations';
            activeSubId = 'sub-operations';
        } else if (path.includes('compliance.html')) {
            activeId = 'nav-compliance';
            activeCatId = 'cat-operations';
            activeSubId = 'sub-operations';
        } else if (path.includes('messages.html')) {
            activeId = 'nav-messages';
        } else if (path.includes('content.html')) {
            activeId = 'nav-content';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('blogs.html')) {
            activeId = 'nav-blogs';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('countries.html')) {
            activeId = 'nav-countries';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('users.html')) {
            activeId = 'nav-users';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('packages.html')) {
            activeId = 'nav-packages';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('ssic.html')) {
            activeId = 'nav-ssic';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('onboarding-manager.html')) {
            activeId = 'nav-onboarding-manager';
            activeCatId = 'cat-services';
            activeSubId = 'sub-services';
        } else if (path.includes('vault.html')) {
            activeId = 'nav-vault';
            activeCatId = 'cat-documents';
            activeSubId = 'sub-documents';
        } else if (path.includes('reports.html')) {
            activeId = 'nav-reports';
            activeCatId = 'cat-analytics';
            activeSubId = 'sub-analytics';
        } else if (path.includes('staff-id-cards.html')) {
            activeId = 'nav-staff-id-cards';
            activeCatId = 'cat-hr';
            activeSubId = 'sub-hr';
        } else if (path.includes('attendance.html')) {
            activeId = 'nav-attendance';
            activeCatId = 'cat-hr';
            activeSubId = 'sub-hr';
        }

        if (activeId) {
            const activeEl = document.getElementById(activeId);
            if (activeEl) {
                activeEl.classList.add('active');
            }
        }
        
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        if (!isCollapsed && activeCatId && activeSubId) {
            const catBtn = document.getElementById(activeCatId);
            const subWrapper = document.getElementById(activeSubId);
            if (catBtn) catBtn.classList.add('active-category', 'open-category');
            if (subWrapper) subWrapper.classList.add('open');
        }

        const breadcrumbEl = document.getElementById('top-nav-page-header');
        if (breadcrumbEl) {
            const menuNames = {
                'nav-dashboard': 'Dashboard',
                'nav-clients': 'Clients',
                'nav-applications': 'Applications',
                'nav-kyc': 'KYC Review',
                'nav-onboarding': 'Client Onboarding',
                'nav-compliance': 'Compliance',
                'nav-messages': 'Messages',
                'nav-content': 'Content',
                'nav-blogs': 'Blogs',
                'nav-countries': 'Countries',
                'nav-users': 'Credentials & Users',
                'nav-packages': 'Requirements Page Manager',
                'nav-ssic': 'SSIC Codes Manager',
                'nav-onboarding-manager': 'Onboarding Manager',
                'nav-vault': 'Document Vault',
                'nav-reports': 'Reports',
                'nav-staff-id-cards': 'Staff ID Cards',
                'nav-attendance': 'Attendance'
            };
            
            const categoryNames = {
                'cat-operations': 'Operations',
                'cat-services': 'Services',
                'cat-documents': 'Documents',
                'cat-analytics': 'Analytics',
                'cat-hr': 'HR Management'
            };

            let breadcrumbHtml = '';
            if (activeCatId && activeId) {
                const catName = categoryNames[activeCatId] || '';
                const pageName = menuNames[activeId] || '';
                breadcrumbHtml = `<span class="category">${catName}</span> <span class="separator">/</span> <span class="page">${pageName}</span>`;
            } else if (activeId) {
                const pageName = menuNames[activeId] || '';
                breadcrumbHtml = `<span class="page">${pageName}</span>`;
            }
            breadcrumbEl.innerHTML = breadcrumbHtml;
        }
    } catch (e) {
        console.error("Error updating active sidebar item:", e);
    }
}



// Global navigateTo router interceptor (defined read-only if not already)
window.spaNavigate = async function(url, pushState = true) {
    // If it's a dashboard sub-module path and we have the switchDashboardModule handler:
    if (!url.includes('.html') && window.switchDashboardModule) {
        cleanupPageResources();
        let module = 'clients';
        if (url.includes('applications')) module = 'applications';
        else if (url.includes('kyc')) module = 'kyc';
        else if (url.includes('compliance')) module = 'compliance';
        else if (url.includes('blogs')) module = 'blogs';
        else if (url.includes('content')) module = 'content';
        else if (url.includes('reports')) module = 'reports';
        else if (url.includes('users')) module = 'users';

        if (pushState) {
            history.pushState({ url }, '', url);
        }
        window.switchDashboardModule(module);
        return;
    }

    // Direct redirection to target page
    window.location.href = url;
};

// Always overwrite navigateTo on the window object so it refers to spaNavigate
Object.defineProperty(window, 'navigateTo', {
    value: window.spaNavigate,
    configurable: true,
    writable: false
});

window.addEventListener('popstate', (event) => {
    window.navigateTo(window.location.href, false);
});

document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a');
    if (anchor) {
        if (anchor.target === '_blank' || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
            return;
        }
        if (isLocalAdminLink(anchor.href)) {
            event.preventDefault();
            window.navigateTo(anchor.href);
            return;
        }
    }

    const clickable = event.target.closest('[onclick]');
    if (clickable) {
        const onclickAttr = clickable.getAttribute('onclick');
        const match = onclickAttr.match(/(?:window\.)?location\.href\s*=\s*([^;\n]+)/);
        if (match) {
            try {
                const url = eval(match[1].trim());
                if (isLocalAdminLink(url)) {
                    event.preventDefault();
                    event.stopPropagation();
                    window.navigateTo(url);
                    return;
                }
            } catch (e) {
                console.warn("Failed to evaluate location.href expression", e);
            }
        }
    }
}, true);

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
        const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}').token;
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/applications', { headers });
        if (res.ok) {
            const apps = await res.json();
            const seqMap = {};
            apps.forEach((app, idx) => {
                seqMap[app.id] = 101 + idx;
            });
            window.appSeqMap = seqMap;
            localStorage.setItem('globalisor_app_seq_map', JSON.stringify(seqMap));
            window.dispatchEvent(new CustomEvent('appSeqMapUpdated', { detail: seqMap }));
        }
    } catch (e) {
        console.error("Error fetching application sequences", e);
    }
};
window.initAppSeqMap();

// Global navigation functions
Object.defineProperty(window, 'toggleSubmenu', {
    value: function(id, btnId) {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        const submenu = document.getElementById(id);
        if (isCollapsed && submenu) {
            const firstLink = submenu.querySelector('a');
            if (firstLink && firstLink.href) {
                window.navigateTo(firstLink.href);
                return;
            }
        }

        let btn = btnId ? document.getElementById(btnId) : null;
        if (!btn) {
            btn = document.querySelector(`button[onclick*="${id}"]`);
        }
        
        if (submenu) {
            const isOpen = submenu.classList.contains('open');
            if (isOpen) {
                submenu.classList.remove('open');
                if (btn) btn.classList.remove('open-category');
            } else {
                // Close other submenus first to reduce clutter
                document.querySelectorAll('.submenu-wrapper').forEach(sub => {
                    if (sub.id !== id) {
                        sub.classList.remove('open');
                    }
                });
                document.querySelectorAll('.category-btn').forEach(cBtn => {
                    if (cBtn.id !== btnId) {
                        cBtn.classList.remove('open-category');
                    }
                });
                
                submenu.classList.add('open');
                if (btn) btn.classList.add('open-category');
            }
        }
    },
    writable: false,
    configurable: true
});

window.logout = function() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('staff_auth');
    localStorage.removeItem('token');
    window.location.href = '/auth.html';
};

window.toggleMobileSidebar = function() {
    const switcher = document.getElementById('module-switcher');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (switcher && overlay) {
        const isOpen = switcher.classList.toggle('open');
        if (isOpen) {
            overlay.classList.remove('hidden');
            if (toggleBtn) toggleBtn.classList.add('mobile-open');
        } else {
            overlay.classList.add('hidden');
            if (toggleBtn) toggleBtn.classList.remove('mobile-open');
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

    // 1. Inject responsive CSS styles
    const style = document.createElement('style');
    style.id = 'admin-sidebar-custom-styles';
    style.textContent = `
        #module-switcher {
            padding: 1.25rem 0.75rem !important;
            gap: 0.25rem !important;
            background: #f8fafc !important;
            overflow-y: auto;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-sizing: border-box !important;
        }
        
        .main-container {
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            padding-bottom: 6.5rem !important;
        }

        .category-group {
            display: flex;
            flex-direction: column;
            width: 100%;
        }
        
        .category-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0.65rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 750;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-radius: 10px;
            transition: all 0.2s ease-in-out;
            background: transparent;
            border: none;
            cursor: pointer;
            outline: none;
            box-sizing: border-box;
        }
        
        .category-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
        }
        
        .submenu-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.55rem 0.75rem;
            font-size: 0.825rem;
            font-weight: 600;
            color: #64748b;
            border-radius: 8px;
            transition: all 0.15s ease-in-out;
            background: transparent;
            border: none;
            cursor: pointer;
            text-decoration: none;
            width: 100%;
            box-sizing: border-box;
            outline: none;
        }
        
        .submenu-item:hover {
            color: #0f172a;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        
        .submenu-item.active {
            color: #3b82f6;
            background: #eff6ff !important;
            font-weight: 700;
        }
        
        .category-btn.active-category {
            color: #3b82f6;
        }
        
        .submenu-wrapper {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.25s ease-out;
        }
        
        .submenu-wrapper.open {
            grid-template-rows: 1fr;
        }
        
        .submenu-content {
            overflow: hidden;
            padding-left: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            margin-top: 0.125rem;
            margin-bottom: 0.25rem;
        }
        
        .direct-link-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.65rem 0.75rem;
            font-size: 0.825rem;
            font-weight: 750;
            color: #475569;
            border-radius: 10px;
            transition: all 0.2s ease-in-out;
            background: transparent;
            border: none;
            cursor: pointer;
            text-decoration: none;
            box-sizing: border-box;
            outline: none;
        }
        
        .direct-link-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
        }
        
        .direct-link-btn.active {
            color: #3b82f6;
            background: #eff6ff !important;
            font-weight: 800;
        }
        
        .category-arrow {
            transition: transform 0.2s ease;
        }
        
        .category-btn.open-category .category-arrow {
            transform: rotate(180deg);
        }

        @media (min-width: 1024px) {
            body.sidebar-collapsed #module-switcher {
                width: 70px !important;
                padding: 1.25rem 0.5rem !important;
                overflow: visible !important;
            }
            body.sidebar-collapsed .main-container {
                margin-left: 70px !important;
            }
            body.sidebar-collapsed .submenu-item span,
            body.sidebar-collapsed .category-btn > span > span,
            body.sidebar-collapsed .direct-link-btn span,
            body.sidebar-collapsed .category-arrow {
                display: none !important;
            }
            body.sidebar-collapsed .submenu-item,
            body.sidebar-collapsed .category-btn,
            body.sidebar-collapsed .direct-link-btn {
                justify-content: center !important;
                padding: 0.65rem 0 !important;
            }
            body.sidebar-collapsed .submenu-content {
                padding-left: 0 !important;
            }
            body.sidebar-collapsed .submenu-wrapper.open .submenu-content {
                overflow: visible !important;
            }
            
            /* Tooltips for collapsed sidebar items */
            body.sidebar-collapsed .direct-link-btn,
            body.sidebar-collapsed .category-btn,
            body.sidebar-collapsed .submenu-item {
                position: relative !important;
            }
            
            /* Tooltip bubble styling */
            body.sidebar-collapsed .direct-link-btn::after,
            body.sidebar-collapsed .category-btn::after,
            body.sidebar-collapsed .submenu-item::after {
                content: attr(data-tooltip);
                position: absolute;
                left: 100%;
                top: 50%;
                transform: translateY(-50%) translateX(8px);
                background: #0f172a;
                color: #ffffff;
                padding: 0.35rem 0.65rem;
                font-size: 0.75rem;
                font-weight: 600;
                border-radius: 6px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
                z-index: 99999;
                font-family: 'Outfit', sans-serif;
                text-transform: none;
                letter-spacing: normal;
            }
            
            /* Tooltip arrow styling */
            body.sidebar-collapsed .direct-link-btn::before,
            body.sidebar-collapsed .category-btn::before,
            body.sidebar-collapsed .submenu-item::before {
                content: '';
                position: absolute;
                left: 100%;
                top: 50%;
                transform: translateY(-50%) translateX(2px);
                border-width: 4px;
                border-style: solid;
                border-color: transparent #0f172a transparent transparent;
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 99999;
            }
            
            /* Tooltip hover trigger states */
            body.sidebar-collapsed .direct-link-btn:hover::after,
            body.sidebar-collapsed .category-btn:hover::after,
            body.sidebar-collapsed .submenu-item:hover::after {
                opacity: 1;
                transform: translateY(-50%) translateX(12px);
            }
            
            body.sidebar-collapsed .direct-link-btn:hover::before,
            body.sidebar-collapsed .category-btn:hover::before,
            body.sidebar-collapsed .submenu-item:hover::before {
                opacity: 1;
                transform: translateY(-50%) translateX(4px);
            }

            /* Center Header in Top Nav */
            .top-nav-header {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.85rem;
                font-weight: 700;
                color: #0f172a;
                pointer-events: none;
                font-family: 'Outfit', sans-serif;
                letter-spacing: 0.03em;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                text-transform: uppercase;
                z-index: 10;
            }
            .top-nav-header span.category {
                color: #94a3b8;
                font-weight: 600;
            }
            .top-nav-header span.separator {
                color: #cbd5e1;
                font-weight: 400;
            }
            .top-nav-header span.page {
                color: #0f172a;
                font-weight: 800;
            }
        }

        @media (max-width: 1023px) {
            .top-nav-header {
                display: none !important;
            }
        }
        
        @media (max-width: 1023px) {
            #module-switcher {
                transform: translateX(-100%) !important;
                left: 0 !important;
                position: fixed !important;
                top: 60px !important;
                height: calc(100vh - 60px) !important;
                width: 240px !important;
                z-index: 9999 !important;
                box-shadow: 10px 0 30px rgba(0,0,0,0.05) !important;
            }
            #module-switcher.open {
                transform: translateX(0) !important;
            }
            .main-container {
                margin-left: 0 !important;
                padding: 1.5rem 1.5rem 6.5rem 1.5rem !important;
            }
            #sidebar-overlay {
                position: fixed;
                inset: 60px 0 0 0;
                background: rgba(15, 23, 42, 0.3);
                backdrop-filter: blur(4px);
                z-index: 9998;
                transition: opacity 0.3s ease;
            }
            #sidebar-overlay.hidden {
                display: none !important;
            }
        }

        #sidebar-toggle {
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
            align-items: center !important;
            justify-content: center !important;
        }
        #sidebar-toggle span {
            display: block;
            width: 20px;
            height: 2px;
            background: #64748b;
            border-radius: 2px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
        }
        body.sidebar-collapsed #sidebar-toggle span:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
        }
        body.sidebar-collapsed #sidebar-toggle span:nth-child(2) {
            opacity: 0;
            transform: scaleX(0);
        }
        body.sidebar-collapsed #sidebar-toggle span:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
        }
        
        #sidebar-toggle.mobile-open span:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
        }
        #sidebar-toggle.mobile-open span:nth-child(2) {
            opacity: 0;
            transform: scaleX(0);
        }
        #sidebar-toggle.mobile-open span:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
        }

        /* Fix actions dropdown clipping */
        tr:last-child .staff-actions-dropdown,
        tr:nth-last-child(2) .staff-actions-dropdown,
        tr:last-child .dropdown-container div[id^="actions-dropdown-"],
        tr:nth-last-child(2) .dropdown-container div[id^="actions-dropdown-"] {
            top: auto !important;
            bottom: calc(100% + 4px) !important;
            margin-top: 0 !important;
            margin-bottom: 4px !important;
        }

        /* Increase base font-size across admin portal */
        html {
            font-size: 16.5px !important;
        }
        
        .admin-table th {
            font-size: 11px !important;
        }
    `;
    document.head.appendChild(style);

    // 2. Inject mobile toggle button if missing
    const topNav = document.querySelector('.top-nav > div.flex.items-center');
    if (topNav && !document.getElementById('sidebar-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebar-toggle';
        toggleBtn.className = 'p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer mr-2 flex flex-col gap-1.5 items-center justify-center shrink-0';
        toggleBtn.style.width = '32px';
        toggleBtn.style.height = '32px';
        toggleBtn.style.background = 'transparent';
        toggleBtn.style.border = 'none';
        toggleBtn.title = 'Toggle Sidebar';
        toggleBtn.innerHTML = `
            <span class="block w-5 h-0.5 bg-slate-500 rounded-sm transition-all duration-300 transform-origin-center"></span>
            <span class="block w-5 h-0.5 bg-slate-500 rounded-sm transition-all duration-300 transform-origin-center"></span>
            <span class="block w-5 h-0.5 bg-slate-500 rounded-sm transition-all duration-300 transform-origin-center"></span>
        `;
        toggleBtn.onclick = window.toggleSidebar;
        topNav.insertBefore(toggleBtn, topNav.firstChild);
    }

    // 3. Inject mobile overlay
    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'hidden';
        overlay.onclick = window.toggleMobileSidebar;
        document.body.appendChild(overlay);
    }

    // 4. Inject switcher innerHTML
    const switcher = document.getElementById('module-switcher');
    if (switcher) {
        switcher.innerHTML = `
            <!-- Dashboard (Direct Link) -->
            <a href="dashboard.html" class="direct-link-btn" id="nav-dashboard" data-tooltip="Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="10" rx="1"/><rect width="7" height="5" x="3" y="14" rx="1"/></svg>
                <span>Dashboard</span>
            </a>

            <!-- Clients (Direct Link) -->
            <a href="dashboard.html?view=clients" class="direct-link-btn" id="nav-clients" data-tooltip="Clients">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Clients</span>
            </a>

            <!-- Messages (Direct Link) -->
            <a href="messages.html" class="direct-link-btn" id="nav-messages" data-tooltip="Messages">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Messages</span>
                <span id="admin-messages-unread-badge" class="ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white leading-none hidden">0</span>
            </a>
            
            <div class="h-[1px] bg-slate-200/60 my-1 shrink-0"></div>
            
            <!-- Operations Accordion -->
            <div class="category-group">
                <button class="category-btn" id="cat-operations" onclick="window.toggleSubmenu('sub-operations', 'cat-operations')" data-tooltip="Operations">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M20 7h-9M14 17H5M10 12H3M21 17h-3M17 7H7"/></svg>
                        <span>Operations</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="category-arrow shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="sub-operations" class="submenu-wrapper">
                    <div class="submenu-content">
                        <a href="applications.html" class="submenu-item" id="nav-applications" data-tooltip="Applications">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                            <span>Applications</span>
                        </a>
                        <a href="kyc.html" class="submenu-item" id="nav-kyc" data-tooltip="KYC Review">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            <span>KYC Review</span>
                        </a>
                        <a href="onboarding.html" class="submenu-item" id="nav-onboarding" data-tooltip="Client Onboarding">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                            <span>Client Onboarding</span>
                        </a>
                        <a href="compliance.html" class="submenu-item" id="nav-compliance" data-tooltip="Compliance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m16 16 3-8 3 8c-.87.65-2.24.83-3 .83s-2.13-.18-3-.83Z"/><path d="m2 16 3-8 3 8c-.87.65-2.24.83-3 .83s-2.13-.18-3-.83Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>
                            <span>Compliance</span>
                        </a>
                    </div>

                </div>
            </div>
            
            <!-- Services Accordion -->
            <div class="category-group">
                <button class="category-btn" id="cat-services" onclick="window.toggleSubmenu('sub-services', 'cat-services')" data-tooltip="Services">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        <span>Services</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="category-arrow shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="sub-services" class="submenu-wrapper">
                    <div class="submenu-content">
                        <a href="content.html" class="submenu-item" id="nav-content" data-tooltip="Content">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            <span>Content</span>
                        </a>
                        <a href="blogs.html" class="submenu-item" id="nav-blogs" data-tooltip="Blogs">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            <span>Blogs</span>
                        </a>
                        <a href="countries.html" class="submenu-item" id="nav-countries" data-tooltip="Countries">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                            <span>Countries</span>
                        </a>
                        <a href="users.html" class="submenu-item" id="nav-users" data-tooltip="Credentials & Users">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                            <span>Credentials & Users</span>
                        </a>
                        <a href="packages.html" class="submenu-item" id="nav-packages" data-tooltip="Requirements Page Manager">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-8M16 2v5M8 2v5M3 11h18"/></svg>
                            <span>Requirements Page Manager</span>
                        </a>
                        <a href="ssic.html" class="submenu-item" id="nav-ssic" data-tooltip="SSIC Codes Manager">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V2.5A2.5 2.5 0 0 1 6.5 0H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6 6h10M6 10h10"/></svg>
                            <span>SSIC Codes Manager</span>
                        </a>
                        <a href="onboarding-manager.html" class="submenu-item" id="nav-onboarding-manager" data-tooltip="Onboarding Manager">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="m9 12 2 2 4-4"/></svg>
                            <span>Onboarding Manager</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Documents Accordion -->
            <div class="category-group">
                <button class="category-btn" id="cat-documents" onclick="window.toggleSubmenu('sub-documents', 'cat-documents')" data-tooltip="Documents">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                        <span>Documents</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="category-arrow shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="sub-documents" class="submenu-wrapper">
                    <div class="submenu-content">
                        <a href="vault.html" class="submenu-item" id="nav-vault" data-tooltip="Document Vault">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>Document Vault</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Analytics Accordion -->
            <div class="category-group">
                <button class="category-btn" id="cat-analytics" onclick="window.toggleSubmenu('sub-analytics', 'cat-analytics')" data-tooltip="Analytics">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        <span>Analytics</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="category-arrow shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="sub-analytics" class="submenu-wrapper">
                    <div class="submenu-content">
                        <a href="reports.html" class="submenu-item" id="nav-reports" data-tooltip="Reports">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                            <span>Reports</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- HR Accordion -->
            <div class="category-group">
                <button class="category-btn" id="cat-hr" onclick="window.toggleSubmenu('sub-hr', 'cat-hr')" data-tooltip="HR Management">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>HR Management</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="category-arrow shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="sub-hr" class="submenu-wrapper">
                    <div class="submenu-content">
                        <a href="staff-id-cards.html" class="submenu-item" id="nav-staff-id-cards" data-tooltip="Staff ID Cards">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            <span>Staff ID Cards</span>
                        </a>
                        <a href="attendance.html" class="submenu-item" id="nav-attendance" data-tooltip="Attendance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>Attendance</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // 5. Active category and submenu auto-expanding logic based on URL route
    const path = window.location.pathname;
    const search = window.location.search;
    let activeId = '';
    let activeCatId = '';
    let activeSubId = '';
    
    if (path.includes('dashboard.html')) {
        if (search.includes('view=clients') || search.includes('tab=clients')) {
            activeId = 'nav-clients';
        } else {
            activeId = 'nav-dashboard';
        }
    } else if (path.includes('applications.html')) {
        activeId = 'nav-applications';
        activeCatId = 'cat-operations';
        activeSubId = 'sub-operations';
    } else if (path.includes('kyc.html')) {
        activeId = 'nav-kyc';
        activeCatId = 'cat-operations';
        activeSubId = 'sub-operations';
    } else if (path.includes('onboarding.html')) {
        activeId = 'nav-onboarding';
        activeCatId = 'cat-operations';
        activeSubId = 'sub-operations';
    } else if (path.includes('compliance.html')) {
        activeId = 'nav-compliance';
        activeCatId = 'cat-operations';
        activeSubId = 'sub-operations';
    } else if (path.includes('messages.html')) {
        activeId = 'nav-messages';
    } else if (path.includes('content.html')) {
        activeId = 'nav-content';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('blogs.html')) {
        activeId = 'nav-blogs';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('countries.html')) {
        activeId = 'nav-countries';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('users.html')) {
        activeId = 'nav-users';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('packages.html')) {
        activeId = 'nav-packages';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('ssic.html')) {
        activeId = 'nav-ssic';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('onboarding-manager.html')) {
        activeId = 'nav-onboarding-manager';
        activeCatId = 'cat-services';
        activeSubId = 'sub-services';
    } else if (path.includes('vault.html')) {
        activeId = 'nav-vault';
        activeCatId = 'cat-documents';
        activeSubId = 'sub-documents';
    } else if (path.includes('reports.html')) {
        activeId = 'nav-reports';
        activeCatId = 'cat-analytics';
        activeSubId = 'sub-analytics';
    } else if (path.includes('staff-id-cards.html')) {
        activeId = 'nav-staff-id-cards';
        activeCatId = 'cat-hr';
        activeSubId = 'sub-hr';
    } else if (path.includes('attendance.html')) {
        activeId = 'nav-attendance';
        activeCatId = 'cat-hr';
        activeSubId = 'sub-hr';
    }
    
    if (activeId) {
        const activeEl = document.getElementById(activeId);
        if (activeEl) {
            activeEl.classList.add('active');
        }
    }
    
    if (activeCatId && activeSubId) {
        const catBtn = document.getElementById(activeCatId);
        const subWrapper = document.getElementById(activeSubId);
        if (catBtn) catBtn.classList.add('active-category', 'open-category');
        if (subWrapper) subWrapper.classList.add('open');
    }

    // Injected Top Nav Header Logic
    const topNavContainer = document.querySelector('.top-nav');
    if (topNavContainer && !document.getElementById('top-nav-page-header')) {
        const headerDiv = document.createElement('div');
        headerDiv.id = 'top-nav-page-header';
        headerDiv.className = 'top-nav-header';
        
        const menuNames = {
            'nav-dashboard': 'Dashboard',
            'nav-clients': 'Clients',
            'nav-applications': 'Applications',
            'nav-kyc': 'KYC Review',
            'nav-onboarding': 'Client Onboarding',
            'nav-compliance': 'Compliance',
            'nav-messages': 'Messages',
            'nav-content': 'Content',
            'nav-blogs': 'Blogs',
            'nav-countries': 'Countries',
            'nav-users': 'Users',
            'nav-packages': 'Requirements Page Manager',
            'nav-ssic': 'SSIC Codes Manager',
            'nav-onboarding-manager': 'Onboarding Manager',
            'nav-vault': 'Document Vault',
            'nav-reports': 'Reports',
            'nav-staff-id-cards': 'Staff ID Cards',
            'nav-attendance': 'Attendance'
        };
        
        const categoryNames = {
            'cat-operations': 'Operations',
            'cat-services': 'Services',
            'cat-documents': 'Documents',
            'cat-analytics': 'Analytics',
            'cat-hr': 'HR Management'
        };

        let breadcrumbHtml = '';
        if (activeCatId && activeId) {
            const catName = categoryNames[activeCatId] || '';
            const pageName = menuNames[activeId] || '';
            breadcrumbHtml = `<span class="category">${catName}</span> <span class="separator">/</span> <span class="page">${pageName}</span>`;
        } else if (activeId) {
            const pageName = menuNames[activeId] || '';
            breadcrumbHtml = `<span class="page">${pageName}</span>`;
        }
        
        headerDiv.innerHTML = breadcrumbHtml;
        topNavContainer.appendChild(headerDiv);
     }

    // 5.5. Inject and manage global top-nav back button next to notification bell
    window._updateTopNavBackButton = function() {
        const navRight = document.querySelector('.top-nav > div.flex.items-center.justify-end');
        if (!navRight) return;

        let backBtn = document.getElementById('top-nav-back-btn');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.id = 'top-nav-back-btn';
            backBtn.className = 'px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm';
            backBtn.style.marginRight = '1.25rem';
            backBtn.style.alignItems = 'center';
            backBtn.style.display = 'none'; // hidden by default until checked
            backBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back
            `;
            backBtn.onclick = function() {
                if (window.navigateTo) {
                    window.navigateTo('/admin/dashboard.html?view=clients');
                } else {
                    window.location.href = '/admin/dashboard.html?view=clients';
                }
            };
            navRight.insertBefore(backBtn, navRight.firstChild);
        }

        const isDetailsPage = window.location.pathname.includes('company-detail.html') || window.location.search.includes('clientId=');
        backBtn.style.display = isDetailsPage ? 'flex' : 'none';
    };

    window._updateTopNavBackButton();

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
            const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';
            await fetch(`/api/notifications/read-all?clientId=${adminId}`, { method: 'POST' });
        } catch(err) { console.warn('Mark all read failed', err); }
        const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
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
        const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
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
        if (typeof window._adminFetchUnreadMessagesCount === 'function') {
            window._adminFetchUnreadMessagesCount();
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
        const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
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
                if (notif.type === 'CHANGE_OF_ADDRESS_REQUEST' || link === 'chat_request') {
                    window._adminRenderNotifications();
                    window.openAddressChangeRequestInChat(notif.relatedId || '', notif.message || '', notif.title || '');
                    return;
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
        if (link && link !== 'undefined' && link !== '' && link !== 'chat_request') {
            window.location.href = link;
        }
    };

    window.openQuickChatWindow = function() {
        const win = document.getElementById('quick-chat-window');
        if (!win) return;
        win.classList.remove('pointer-events-none', 'translate-y-10', 'opacity-0');
        win.classList.add('translate-y-0', 'opacity-100');
    };

    window.openAddressChangeRequestInChat = function(docId, notifMsg, notifTitle) {
        window._adminCloseBell();
        window.chatWidgetMode = 'bi';
        window.openQuickChatWindow();

        const viewUrl = `/admin/document-viewer.html?docId=${encodeURIComponent(docId)}&type=change_of_address`;
        const downloadUrl = `/api/admin/intelligence/document/${encodeURIComponent(docId)}/download?type=change_of_address`;

        const formattedMsg = (notifMsg || 'Client submitted a request for registered address change.')
            .replace(/\n/g, '<br>');

        const chatText = `📍 **${notifTitle || 'Change of Registered Office Address Request'}**\n\n${formattedMsg}\n\n---\n📄 **Statutory DRIW Resolution Prepared:**\nClick below to open the draft resolution document in a **new tab** for review or download:`;

        const requestMsg = {
            id: 'msg_' + Date.now(),
            sender: 'bot',
            text: chatText,
            docId: docId,
            type: 'change_of_address_document',
            viewUrl: viewUrl,
            downloadUrl: downloadUrl
        };

        if (!window.biMessagesHistory) window.biMessagesHistory = [];
        
        const exists = window.biMessagesHistory.some(m => m.docId === docId && m.type === 'change_of_address_document');
        if (!exists) {
            window.biMessagesHistory.push(requestMsg);
        }

        window.biShowThreadsView = false;
        window.showBusinessAiAssistant();
    };

    window._adminFetchUnreadMessagesCount = async function() {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';

            let count = 0;
            const res = await fetch('/api/messages/conversations');
            if (res.ok) {
                const convs = await res.json();
                if (Array.isArray(convs)) {
                    convs.forEach(c => {
                        count += (c.unreadCount || 0);
                    });
                }
            }

            if (window._adminNotifications && Array.isArray(window._adminNotifications)) {
                const notifMsgUnread = window._adminNotifications.filter(n =>
                    n.type === 'message' && (!n.readBy || !n.readBy.includes(adminId))
                ).length;
                if (notifMsgUnread > count) {
                    count = notifMsgUnread;
                }
            }

            const badge = document.getElementById('admin-messages-unread-badge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                    badge.style.display = 'inline-flex';
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = 'none';
                }
            }
        } catch(e) {}
    };

    window._adminFetchNotifications = async function() {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
            const adminId = auth.id || auth.userId || 'admin';
            const res = await fetch(`/api/notifications?clientId=${encodeURIComponent(adminId)}`);
            if (res.ok) {
                const data = await res.json();
                const fetched = Array.isArray(data) ? data : (data.notifications || []);
                const existing = window._adminNotifications || [];
                const mergedMap = new Map();
                fetched.forEach(n => mergedMap.set(n.id, n));
                existing.forEach(n => {
                    if (!mergedMap.has(n.id)) {
                        mergedMap.set(n.id, n);
                    }
                });
                window._adminNotifications = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                window._adminRenderNotifications();
            }
        } catch(e) { /* silently fail */ }
        window._adminFetchUnreadMessagesCount();
    };

    // Initial fetch + poll every 10s
    window._adminFetchNotifications();
    window._adminFetchUnreadMessagesCount();
    if (!window._adminNotifInterval) {
        window._adminNotifInterval = setInterval(() => {
            window._adminFetchNotifications();
            window._adminFetchUnreadMessagesCount();
        }, 10000);
    }

    // WebSocket listener for real-time notifications
    if (!window._adminWsConnected) {
        try {
            const auth = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
            const adminId = auth.id || auth.userId || 'staff-admin';
            const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
            let wsHost = location.host;
            let wsProtocol = wsProto;
            if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '[::1]') {
                wsHost = 'globalisor-77d7da9fe8c7.herokuapp.com';
                wsProtocol = 'wss';
            }
            const ws = new WebSocket(`${wsProtocol}://${wsHost}/api/ws/chat?userId=${adminId}&role=admin`);
            ws.onmessage = function(evt) {
                try {
                    const msg = JSON.parse(evt.data);
                    if (msg.type === 'notification' || msg.type === 'new_notification' || msg.type === 'new_message' || msg.type === 'chat_message') {
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
                    window._adminFetchUnreadMessagesCount();
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
        }, 15000);
    };

    // --- Quick Chat Popup Injector ---
    const qAuthObj = JSON.parse(localStorage.getItem('admin_auth') || localStorage.getItem('staff_auth') || '{}');
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
            if (window.chatWidgetMode === 'team') {
                window.showQuickChatContacts();
            } else {
                window.showBusinessAiAssistant();
            }
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

    window.chatWidgetMode = 'bi';
    window.biMessagesHistory = [];
    window.biThreads = [];
    window.biActiveThreadId = localStorage.getItem('globalisor_bi_thread_id') || null;
    window.biActiveCompany = localStorage.getItem('globalisor_bi_company') || null;
    window.biShowThreadsView = false;

    window.switchChatWidgetMode = function(mode) {
        window.chatWidgetMode = mode;
        const btnBi = document.getElementById('btn-mode-bi');
        const btnTeam = document.getElementById('btn-mode-team');
        if (mode === 'bi') {
            if (btnBi) { btnBi.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white transition-all shadow-sm'; }
            if (btnTeam) { btnTeam.className = 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-all'; }
            window.showBusinessAiAssistant();
        } else {
            if (btnTeam) { btnTeam.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white transition-all shadow-sm'; }
            if (btnBi) { btnBi.className = 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-all'; }
            window.showQuickChatContacts();
        }
    };

    window.loadBiThreads = async function(targetThreadId) {
        try {
            const res = await fetch('/api/admin/intelligence/threads?userId=admin');
            if (res.ok) {
                const threads = await res.json();
                window.biThreads = Array.isArray(threads) ? threads : [];
                
                let selected = null;
                if (targetThreadId) {
                    selected = window.biThreads.find(t => t.id === targetThreadId);
                }
                if (!selected && window.biActiveThreadId) {
                    selected = window.biThreads.find(t => t.id === window.biActiveThreadId);
                }
                if (!selected && window.biThreads.length > 0) {
                    selected = window.biThreads[0];
                }

                if (selected) {
                    window.biActiveThreadId = selected.id;
                    localStorage.setItem('globalisor_bi_thread_id', selected.id);
                    window.biActiveCompany = selected.activeCompany || null;
                    if (selected.activeCompany) {
                        localStorage.setItem('globalisor_bi_company', selected.activeCompany);
                    } else {
                        localStorage.removeItem('globalisor_bi_company');
                    }
                    window.biMessagesHistory = Array.isArray(selected.messages) ? selected.messages : [];
                } else {
                    window.biActiveThreadId = null;
                    window.biMessagesHistory = [];
                }
            }
        } catch(e) {
            console.warn('[BI Threads] Failed to load threads from backend:', e);
        }
        window.showBusinessAiAssistant();
    };

    window.createNewBiThread = async function() {
        try {
            const res = await fetch('/api/admin/intelligence/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'admin', title: 'New Conversation' })
            });
            if (res.ok) {
                const newThread = await res.json();
                window.biActiveThreadId = newThread.id;
                localStorage.setItem('globalisor_bi_thread_id', newThread.id);
                window.biActiveCompany = null;
                localStorage.removeItem('globalisor_bi_company');
                window.biMessagesHistory = [];
                window.biShowThreadsView = false;
                await window.loadBiThreads(newThread.id);
                return;
            }
        } catch(e) {
            console.error('[BI Threads] Error creating thread:', e);
        }
        // Fallback
        window.biActiveThreadId = 'th_' + Date.now();
        localStorage.setItem('globalisor_bi_thread_id', window.biActiveThreadId);
        window.biActiveCompany = null;
        localStorage.removeItem('globalisor_bi_company');
        window.biMessagesHistory = [];
        window.biShowThreadsView = false;
        window.showBusinessAiAssistant();
    };

    window.switchBiThread = async function(threadId) {
        window.biActiveThreadId = threadId;
        localStorage.setItem('globalisor_bi_thread_id', threadId);
        window.biShowThreadsView = false;
        await window.loadBiThreads(threadId);
    };

    window.deleteBiThread = async function(e, threadId) {
        if (e) e.stopPropagation();
        if (!confirm('Are you sure you want to delete this conversation thread?')) return;
        try {
            await fetch('/api/admin/intelligence/threads/' + encodeURIComponent(threadId), { method: 'DELETE' });
            if (window.biActiveThreadId === threadId) {
                window.biActiveThreadId = null;
                localStorage.removeItem('globalisor_bi_thread_id');
            }
            await window.loadBiThreads();
        } catch(err) {
            console.error('Error deleting thread:', err);
        }
    };

    window.clearBiActiveCompany = async function(e) {
        if (e) e.stopPropagation();
        window.biActiveCompany = null;
        localStorage.removeItem('globalisor_bi_company');
        if (window.biActiveThreadId) {
            try {
                await fetch('/api/admin/intelligence/threads/' + encodeURIComponent(window.biActiveThreadId) + '/context', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ company: '', uen: '' })
                });
            } catch(err) {}
        }
        window.showBusinessAiAssistant();
    };

    window.toggleBiThreadsView = function() {
        window.biShowThreadsView = !window.biShowThreadsView;
        window.showBusinessAiAssistant();
    };

    window.showBusinessAiAssistant = function() {
        const body = document.getElementById('quick-chat-body');
        if (!body) return;

        // 1. Thread selection banner & Context Pill
        const currentThread = window.biThreads.find(t => t.id === window.biActiveThreadId);
        const threadTitle = currentThread ? currentThread.title : 'Active Thread';
        const displayComp = window.biActiveCompany ? window.biActiveCompany.replace('PTE. LTD.', '').replace('PTE LTD', '').trim() : '';

        const contextBadgeHtml = window.biActiveCompany ? `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[11px] font-bold shadow-2xs max-w-[210px]" title="Active Context: ${window.biActiveCompany}">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                <span class="truncate">${displayComp}</span>
                <button onclick="clearBiActiveCompany(event)" class="text-blue-400 hover:text-red-500 ml-0.5 font-black text-xs transition" title="Clear entity context">✕</button>
            </div>
        ` : `
            <div class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[11px] font-medium" title="No entity locked. Ask about any client or select a suggestion.">
                <span>🌐</span>
                <span>All Clients</span>
            </div>
        `;

        const threadControlsHtml = `
            <div class="px-3.5 py-2 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    ${contextBadgeHtml}
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button onclick="toggleBiThreadsView()" class="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs" title="View all conversation threads">
                        <span>🧵</span>
                        <span class="max-w-[80px] truncate">${threadTitle}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button onclick="createNewBiThread()" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs flex items-center gap-1" title="Start a fresh chat thread">
                        <span>+ New</span>
                    </button>
                </div>
            </div>
        `;

        // 2. Render Threads View or Chat View
        if (window.biShowThreadsView) {
            const threadListHtml = window.biThreads.length === 0 ? `
                <div class="text-center p-6 text-xs text-slate-400 font-semibold">No saved threads yet. Start a new conversation!</div>
            ` : window.biThreads.map(t => {
                const isActive = t.id === window.biActiveThreadId;
                const msgCount = Array.isArray(t.messages) ? t.messages.length : 0;
                const compTag = t.activeCompany ? `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold truncate max-w-[120px]">${t.activeCompany.replace('PTE. LTD.', '').trim()}</span>` : '';
                return `
                    <div onclick="switchBiThread('${t.id}')" class="p-3 rounded-xl border ${isActive ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/30' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'} cursor-pointer transition shadow-2xs flex items-center justify-between gap-2 group">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="text-xs font-bold text-slate-800 truncate">${t.title || 'Conversation'}</span>
                                ${compTag}
                            </div>
                            <div class="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                                <span>💬 ${msgCount} messages</span>
                                <span>•</span>
                                <span>${t.updatedAt ? new Date(t.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                            </div>
                        </div>
                        <button onclick="deleteBiThread(event, '${t.id}')" class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete thread">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                `;
            }).join('');

            body.innerHTML = `
                <div class="flex-1 flex flex-col min-h-0 bg-slate-50">
                    <div class="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                        <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>🧵 Conversation Threads (${window.biThreads.length})</span>
                        </div>
                        <button onclick="toggleBiThreadsView()" class="text-xs font-bold text-blue-600 hover:text-blue-800 transition">← Back to Chat</button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-3 space-y-2">
                        ${threadListHtml}
                    </div>
                    <div class="p-3 bg-white border-t border-slate-200 shrink-0">
                        <button onclick="createNewBiThread()" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5">
                            <span>+ Start Fresh Thread</span>
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // 3. Normal Chat View
        let chatHtml = '';
        if (window.biMessagesHistory.length === 0) {
            const contextTip = window.biActiveCompany ? `Currently focused on <strong>${window.biActiveCompany}</strong>. Subsequent questions will automatically use this company.` : `Ask any question about your clients or documents. Once a company is mentioned, it will be remembered for all follow-up questions!`;
            
            chatHtml = `
                <div class="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl text-xs shadow-md leading-relaxed">
                    👋 <strong>Globalisor Thread-Aware AI Assistant</strong><br><br>
                    ${contextTip}
                </div>
                <div class="space-y-1.5 pt-2">
                    <div class="text-[10px] uppercase font-black text-slate-400">Suggested Prompts:</div>
                    <button onclick="sendBiQuery('give me document of nominee director')" class="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl font-bold text-xs text-slate-700 hover:text-blue-600 transition shadow-2xs flex items-center gap-2">
                        📄 <span>give me document of nominee director</span>
                    </button>
                    <button onclick="sendBiQuery('give me document of director')" class="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl font-bold text-xs text-slate-700 hover:text-blue-600 transition shadow-2xs flex items-center gap-2">
                        👔 <span>give me document of director</span>
                    </button>
                    <button onclick="sendBiQuery('give me document of change of address')" class="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl font-bold text-xs text-slate-700 hover:text-blue-600 transition shadow-2xs flex items-center gap-2">
                        📍 <span>give me document of change of address</span>
                    </button>
                    <button onclick="sendBiQuery('Tell me about Abbey Holdings')" class="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl font-bold text-xs text-slate-700 hover:text-blue-600 transition shadow-2xs flex items-center gap-2">
                        🏢 <span>Tell me about Abbey Holdings</span>
                    </button>
                    <button onclick="sendBiQuery('Who is the current director?')" class="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl font-bold text-xs text-slate-700 hover:text-blue-600 transition shadow-2xs flex items-center gap-2">
                        👨‍💼 <span>Who is the current director? (uses thread context)</span>
                    </button>
                </div>
            `;
        } else {
            chatHtml = window.biMessagesHistory.map(m => {
                if (m.sender === 'user') {
                    return `
                        <div class="flex justify-end">
                            <div class="bg-slate-900 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs text-xs font-semibold max-w-[85%] shadow-sm">
                                ${m.text}
                            </div>
                        </div>
                    `;
                } else {
                    const formatted = (m.text || '').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md transition no-underline my-1.5">$1 ↗</a>')
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono font-bold">$1</code>')
                                                    .replace(/\n/g, '<br>');

                    // 1. Options Buttons
                    let optionsHtml = '';
                    if (m.options && Array.isArray(m.options) && m.options.length > 0) {
                        const compEscaped = (m.companyName || window.biActiveCompany || '').replace(/'/g, "\\'");
                        optionsHtml = `
                            <div class="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-200/80">
                                ${m.options.map(opt => `
                                    <button onclick="sendBiQuery('${opt}', '${compEscaped}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs rounded-xl border border-blue-200/80 transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                        ${opt.toLowerCase().includes('nominee') ? '🏛️' : '👔'} ${opt}
                                    </button>
                                `).join('')}
                            </div>
                        `;
                    }

                    // 2. Document Card (Preserved & Enhanced)
                    let docCardHtml = '';
                    if (m.docId || m.viewUrl) {
                        const docViewerUrl = m.viewUrl || `/admin/document-viewer.html?docId=${m.docId}&type=${m.type || 'nominee_director'}`;
                        const docDownloadUrl = m.downloadUrl || `/api/admin/intelligence/document/${m.docId}/download`;
                        const docTitle = m.type === 'change_of_address_document' ? 'Change of Registered Office Address Resolution' :
                                        (m.type === 'director_appointment_document' ? 'Director Appointment Package (2 Documents)' : 'Nominee Director Package (3 Documents)');
                        
                        docCardHtml = `
                            <div class="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50/80 border border-blue-200 rounded-xl space-y-2">
                                <div class="flex items-center justify-between">
                                    <div class="text-[11px] font-extrabold text-blue-900 flex items-center gap-1.5">
                                        <span>📑</span>
                                        <span>${docTitle}</span>
                                    </div>
                                    <span class="px-1.5 py-0.5 bg-blue-600 text-white font-black text-[9px] rounded-md uppercase">Ready</span>
                                </div>
                                <div class="text-[11px] text-slate-600 font-medium">
                                    Generated for <strong>${m.companyName || window.biActiveCompany || 'Selected Client'}</strong>
                                </div>
                                <div class="flex items-center gap-2 pt-1">
                                    <a href="${docViewerUrl}" target="_blank" class="flex-1 text-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition no-underline flex items-center justify-center gap-1">
                                        <span>📄 Open in Editor</span>
                                    </a>
                                    <a href="${docDownloadUrl}" class="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg font-bold text-xs transition no-underline flex items-center justify-center gap-1 shadow-2xs" title="Download .DOCX file">
                                        <span>⬇️ .DOCX</span>
                                    </a>
                                </div>
                            </div>
                        `;
                    }

                    return `
                        <div class="flex justify-start">
                            <div class="bg-white border border-slate-200 text-slate-800 p-3.5 rounded-2xl rounded-tl-xs text-xs leading-relaxed max-w-[92%] shadow-sm">
                                ${formatted}
                                ${docCardHtml}
                                ${optionsHtml}
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        body.innerHTML = `
            <div class="flex-1 flex flex-col min-h-0 bg-slate-50/70">
                ${threadControlsHtml}
                <div id="bi-chat-container" class="flex-1 overflow-y-auto p-4 space-y-3 pr-2">
                    ${chatHtml}
                </div>
                <form onsubmit="handleBiFormSubmit(event)" class="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2 shrink-0">
                    <input type="text" id="bi-chat-input" placeholder="${window.biActiveCompany ? `Ask about ${displayComp}... (e.g. who is the secretary?)` : 'Ask AI... (e.g. Tell me about Abbey Holdings)'}" class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white shadow-2xs transition">
                    <button type="submit" class="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3.5 h-3.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </form>
            </div>
        `;

        const container = document.getElementById('bi-chat-container');
        if (container) container.scrollTop = container.scrollHeight;
    };

    window.sendBiQuery = async function(text, companyHint) {
        if (!text || !text.trim()) return;
        const qText = text.trim();
        const activeCompany = companyHint || window.biActiveCompany || '';
        const threadId = window.biActiveThreadId || '';

        window.biMessagesHistory.push({ sender: 'user', text: qText });
        window.showBusinessAiAssistant();

        const container = document.getElementById('bi-chat-container');
        if (container) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'bi-loading-indicator';
            loadingDiv.className = 'flex justify-start';
            loadingDiv.innerHTML = `
                <div class="bg-white border border-slate-200 text-slate-500 p-3 rounded-2xl rounded-tl-xs text-xs font-bold flex items-center gap-2 shadow-sm">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                    ${activeCompany ? `Reasoning for <strong>${activeCompany}</strong>...` : 'Analyzing database & resolving context...'}
                </div>
            `;
            container.appendChild(loadingDiv);
            container.scrollTop = container.scrollHeight;
        }

        try {
            let url = '/api/admin/intelligence/ask?q=' + encodeURIComponent(qText);
            if (activeCompany) {
                url += '&company=' + encodeURIComponent(activeCompany);
            }
            if (threadId) {
                url += '&threadId=' + encodeURIComponent(threadId);
            }

            const res = await fetch(url);
            const data = await res.json();
            const reply = data.reply || "Sorry, I couldn't process this query right now.";

            if (data.threadId) {
                window.biActiveThreadId = data.threadId;
                localStorage.setItem('globalisor_bi_thread_id', data.threadId);
            }

            if (data.activeCompany || data.companyName) {
                window.biActiveCompany = data.activeCompany || data.companyName;
                localStorage.setItem('globalisor_bi_company', window.biActiveCompany);
            }

            const loadEl = document.getElementById('bi-loading-indicator');
            if (loadEl) loadEl.remove();

            window.biMessagesHistory.push({
                sender: 'assistant',
                text: reply,
                options: data.options,
                type: data.type,
                companyName: data.companyName || window.biActiveCompany,
                docId: data.docId,
                viewUrl: data.viewUrl,
                downloadUrl: data.downloadUrl,
                docCount: data.docCount
            });

            window.showBusinessAiAssistant();

            // Refresh thread list in background
            try {
                const tRes = await fetch('/api/admin/intelligence/threads?userId=admin');
                if (tRes.ok) {
                    window.biThreads = await tRes.json();
                }
            } catch(e) {}

        } catch(err) {
            console.error("BI Query error:", err);
            const loadEl = document.getElementById('bi-loading-indicator');
            if (loadEl) loadEl.remove();

            window.biMessagesHistory.push({ sender: 'assistant', text: "⚠️ Error querying database. Please check your backend connection." });
            window.showBusinessAiAssistant();
        }
    };

    window.handleBiFormSubmit = function(event) {
        if (event) event.preventDefault();
        const input = document.getElementById('bi-chat-input');
        if (!input || !input.value.trim()) return;
        const val = input.value.trim();
        input.value = '';
        window.sendBiQuery(val, window.biActiveCompany);
    };

    function initQuickChat() {
        if (!localStorage.getItem('admin_auth') && !localStorage.getItem('staff_auth')) return;
        if (document.getElementById('quick-chat-fab')) return;
        
        const quickChatDiv = document.createElement('div');
        quickChatDiv.innerHTML = `
            <div id="quick-chat-fab" class="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 cursor-pointer transition-all flex items-center justify-center ring-4 ring-blue-600/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span id="quick-chat-badge" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center hidden">0</span>
            </div>
            <div id="quick-chat-window" class="fixed bottom-24 right-6 w-[420px] h-[560px] bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-[9999] transform translate-y-10 opacity-0 pointer-events-none transition-all duration-300">
                <div class="p-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                            <button id="btn-mode-bi" onclick="switchChatWidgetMode('bi')" class="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white transition-all shadow-sm">
                                🤖 Business AI
                            </button>
                            <button id="btn-mode-team" onclick="switchChatWidgetMode('team')" class="px-3 py-1 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-all">
                                💬 Team Chat
                            </button>
                        </div>
                    </div>
                    <button onclick="toggleQuickChat()" class="text-white/70 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div id="quick-chat-body" class="flex-1 flex flex-col min-h-0 bg-slate-50/50">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(quickChatDiv);
        
        document.getElementById('quick-chat-fab').onclick = toggleQuickChat;
        
        // Initial thread load
        window.loadBiThreads();
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
