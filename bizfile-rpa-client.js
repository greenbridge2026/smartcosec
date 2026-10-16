/**
 * BizFile RPA Client Automation Helper
 * Human-in-the-Loop browser automation for Singapore BizFile (bizfile.gov.sg)
 * Annual Return Filing with Singpass QR authentication
 */

(function() {
    // Status configuration mapping
    const BZF_STATUS_MAP = {
        'CREATED':          { step: 1, icon: '🚀', badge: 'Launching...', color: '#059669' },
        'LAUNCHED':         { step: 1, icon: '🖥️', badge: 'Browser Opened', color: '#059669' },
        'NAVIGATING':       { step: 2, icon: '🌐', badge: 'Navigating...', color: '#059669' },
        'OPENED':           { step: 2, icon: '🌐', badge: 'BizFile Opened', color: '#059669' },
        'LOGIN_MODAL':      { step: 2, icon: '🔓', badge: 'Login Modal Open', color: '#059669' },
        'WAITING_QR_SCAN':  { step: 4, icon: '📱', badge: 'Scan QR Now', color: '#d97706' },
        'LOGGED_IN':        { step: 4, icon: '✅', badge: 'Logged In!', color: '#059669' },
        'ERROR':            { step: 0, icon: '❌', badge: 'Error', color: '#dc2626' },
        'TIMEOUT':          { step: 0, icon: '⏰', badge: 'Timed Out', color: '#dc2626' },
        'CLOSED':           { step: 0, icon: '🔒', badge: 'Closed', color: '#64748b' }
    };

    window._bizFilePollTimer = null;

    /**
     * Show or create BizFile RPA Progress Modal
     */
    window.showBizFileModal = function(status, message) {
        let modal = document.getElementById('bizfile-rpa-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bizfile-rpa-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
            modal.innerHTML = `
            <div style="background:white;border-radius:1.25rem;width:100%;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;animation:bzfModalFadeIn 0.2s ease-out;font-family:'Outfit',sans-serif;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#065f46,#059669);padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="background:rgba(255,255,255,0.2);border-radius:0.625rem;padding:0.5rem;display:flex;align-items:center;justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </div>
                        <div>
                            <div style="color:white;font-weight:700;font-size:0.95rem;letter-spacing:-0.01em;">BizFile Annual Return</div>
                            <div style="color:rgba(255,255,255,0.8);font-size:0.72rem;">bizfile.gov.sg — SingPass Business Automation</div>
                        </div>
                    </div>
                    <button onclick="closeBizFileModal()" style="background:rgba(255,255,255,0.18);border:none;border-radius:0.5rem;padding:0.4rem;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <!-- Steps Progress -->
                <div style="padding:1.25rem 1.5rem 0.5rem;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;gap:0;position:relative;">
                        <div id="bzf-step-1" class="bzf-step" style="flex:1;text-align:center;padding:0.5rem 0.25rem;font-size:0.65rem;font-weight:700;color:#059669;position:relative;">
                            <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:#dcfce7;border:2px solid #059669;margin:0 auto 0.25rem;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:#059669;">1</div>
                            Open Browser
                        </div>
                        <div id="bzf-step-2" class="bzf-step" style="flex:1;text-align:center;padding:0.5rem 0.25rem;font-size:0.65rem;font-weight:700;color:#94a3b8;position:relative;">
                            <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:#f1f5f9;border:2px solid #cbd5e1;margin:0 auto 0.25rem;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:#94a3b8;">2</div>
                            Click Login
                        </div>
                        <div id="bzf-step-3" class="bzf-step" style="flex:1;text-align:center;padding:0.5rem 0.25rem;font-size:0.65rem;font-weight:700;color:#94a3b8;position:relative;">
                            <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:#f1f5f9;border:2px solid #cbd5e1;margin:0 auto 0.25rem;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:#94a3b8;">3</div>
                            Business User
                        </div>
                        <div id="bzf-step-4" class="bzf-step" style="flex:1;text-align:center;padding:0.5rem 0.25rem;font-size:0.65rem;font-weight:700;color:#94a3b8;position:relative;">
                            <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:#f1f5f9;border:2px solid #cbd5e1;margin:0 auto 0.25rem;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:#94a3b8;">4</div>
                            Scan QR
                        </div>
                    </div>
                </div>
                <!-- Status Area -->
                <div style="padding:1.25rem 1.5rem;text-align:center;">
                    <div id="bzf-status-icon" style="text-align:center;margin-bottom:0.75rem;font-size:2.25rem;">🚀</div>
                    <div id="bzf-status-badge" style="display:inline-flex;align-items:center;gap:0.375rem;background:#dcfce7;color:#065f46;border:1px solid #a7f3d0;border-radius:9999px;padding:0.25rem 0.75rem;font-size:0.72rem;font-weight:700;margin-bottom:0.625rem;">
                        <div style="width:6px;height:6px;border-radius:50%;background:#10b981;"></div>
                        Launching...
                    </div>
                    <div id="bzf-status-msg" style="font-size:0.82rem;color:#475569;line-height:1.5;min-height:2.5rem;font-weight:500;">Opening browser window. Please wait...</div>
                </div>
                <!-- Screenshot Preview -->
                <div id="bzf-screenshot-wrap" style="padding:0 1.5rem 1rem;display:none;">
                    <div style="font-size:0.65rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.375rem;">Live Browser Preview</div>
                    <img id="bzf-screenshot" src="" alt="Browser preview" style="width:100%;border-radius:0.625rem;border:1px solid #e2e8f0;max-height:220px;object-fit:cover;object-position:top;" />
                </div>
                <!-- QR Scan Instruction (shown when waiting) -->
                <div id="bzf-qr-instruction" style="margin:0 1.5rem 1rem;background:#fffbeb;border:1px solid #fcd34d;border-radius:0.75rem;padding:0.875rem;display:none;text-align:left;">
                    <div style="display:flex;gap:0.625rem;align-items:flex-start;">
                        <span style="font-size:1.35rem;">📱</span>
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:#92400e;margin-bottom:0.25rem;">Action Required — Scan QR Code</div>
                            <div style="font-size:0.7rem;color:#78350f;line-height:1.5;">Open your <strong>SingPass mobile app</strong> and scan the QR code shown in the browser window to authenticate as a Business User (Corppass).</div>
                        </div>
                    </div>
                </div>
                <!-- Footer -->
                <div style="padding:0.875rem 1.5rem;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.68rem;color:#94a3b8;">A browser window has been opened on this computer</div>
                    <button onclick="closeBizFileModal()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:0.5rem;padding:0.375rem 0.875rem;font-size:0.75rem;font-weight:600;color:#475569;cursor:pointer;">Close</button>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }

        if (status === 'error') {
            const iconEl = document.getElementById('bzf-status-icon');
            const badgeEl = document.getElementById('bzf-status-badge');
            const msgEl = document.getElementById('bzf-status-msg');
            if (iconEl) iconEl.textContent = '❌';
            if (badgeEl) {
                badgeEl.textContent = 'Error';
                badgeEl.style.background = '#fef2f2';
                badgeEl.style.color = '#dc2626';
                badgeEl.style.borderColor = '#fecaca';
            }
            if (msgEl) msgEl.textContent = message || 'An error occurred while launching BizFile RPA.';
        } else if (status === 'launching') {
            const iconEl = document.getElementById('bzf-status-icon');
            const badgeEl = document.getElementById('bzf-status-badge');
            const msgEl = document.getElementById('bzf-status-msg');
            if (iconEl) iconEl.textContent = '🚀';
            if (badgeEl) {
                badgeEl.textContent = 'Launching...';
                badgeEl.style.background = '#dcfce7';
                badgeEl.style.color = '#065f46';
                badgeEl.style.borderColor = '#a7f3d0';
            }
            if (msgEl) msgEl.textContent = 'Opening browser window to bizfile.gov.sg. Please wait...';
            const qrInstr = document.getElementById('bzf-qr-instruction');
            if (qrInstr) qrInstr.style.display = 'none';
            const wrap = document.getElementById('bzf-screenshot-wrap');
            if (wrap) wrap.style.display = 'none';
        }

        modal.style.display = 'flex';
    };

    /**
     * Close modal
     */
    window.closeBizFileModal = function() {
        const modal = document.getElementById('bizfile-rpa-modal');
        if (modal) modal.style.display = 'none';
    };

    /**
     * Update modal UI according to current status
     */
    window.updateBizFileModal = function(data) {
        const statusKey = data.status || 'CREATED';
        const map = BZF_STATUS_MAP[statusKey] || { step: 1, icon: '⏳', badge: statusKey, color: '#059669' };

        const iconEl = document.getElementById('bzf-status-icon');
        if (iconEl) iconEl.textContent = map.icon;

        const badgeEl = document.getElementById('bzf-status-badge');
        if (badgeEl) {
            badgeEl.textContent = map.badge;
            badgeEl.style.background = map.color + '18';
            badgeEl.style.color = map.color;
            badgeEl.style.borderColor = map.color + '44';
        }

        const msgEl = document.getElementById('bzf-status-msg');
        if (msgEl) msgEl.textContent = data.message || '';

        // Highlight steps
        [1, 2, 3, 4].forEach(i => {
            const el = document.getElementById(`bzf-step-${i}`);
            if (!el) return;
            const stepDiv = el.querySelector('div');
            if (i < map.step) {
                el.style.color = '#059669';
                if (stepDiv) { stepDiv.style.background = '#dcfce7'; stepDiv.style.borderColor = '#059669'; stepDiv.style.color = '#059669'; stepDiv.textContent = '✓'; }
            } else if (i === map.step) {
                el.style.color = '#059669';
                if (stepDiv) { stepDiv.style.background = '#dcfce7'; stepDiv.style.borderColor = '#059669'; stepDiv.style.color = '#059669'; stepDiv.textContent = i; }
            } else {
                el.style.color = '#94a3b8';
                if (stepDiv) { stepDiv.style.background = '#f1f5f9'; stepDiv.style.borderColor = '#cbd5e1'; stepDiv.style.color = '#94a3b8'; stepDiv.textContent = i; }
            }
        });

        // Show QR instruction when waiting
        const qrInstr = document.getElementById('bzf-qr-instruction');
        if (qrInstr) qrInstr.style.display = statusKey === 'WAITING_QR_SCAN' ? 'block' : 'none';

        // Show screenshot if available
        if (data.screenshot) {
            const wrap = document.getElementById('bzf-screenshot-wrap');
            const img = document.getElementById('bzf-screenshot');
            if (wrap && img) {
                img.src = 'data:image/png;base64,' + data.screenshot;
                wrap.style.display = 'block';
            }
        }
    };

    function getAuthToken() {
        return localStorage.getItem('token') ||
               JSON.parse(localStorage.getItem('staff_auth') || localStorage.getItem('admin_auth') || '{}').token || '';
    }

    /**
     * Poll BizFile session status
     */
    window.pollBizFileSession = function(sessionId, btn, originalBtnHtml) {
        let pollCount = 0;
        const maxPolls = 150; // 5 min timeout
        const token = getAuthToken();
        const pollHeaders = token ? { 'Authorization': 'Bearer ' + token } : {};

        if (window._bizFilePollTimer) {
            clearInterval(window._bizFilePollTimer);
        }

        window._bizFilePollTimer = setInterval(async () => {
            pollCount++;
            if (pollCount > maxPolls) {
                clearInterval(window._bizFilePollTimer);
                showBizFileModal('error', 'Session timed out. Please try again.');
                if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHtml; }
                return;
            }

            try {
                const res = await fetch(`/api/bizfile/session/${sessionId}/status`, { headers: pollHeaders });
                const data = await res.json();

                if (!res.ok || !data.success) return;

                updateBizFileModal(data);

                if (data.status === 'LOGGED_IN') {
                    clearInterval(window._bizFilePollTimer);
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">✅ Logged In</span>`;
                    }
                } else if (data.status === 'ERROR' || data.status === 'TIMEOUT' || data.status === 'CLOSED') {
                    clearInterval(window._bizFilePollTimer);
                    if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHtml; }
                }
            } catch (e) {
                console.warn('BizFile poll error:', e.message);
            }
        }, 2000);
    };

    /**
     * Launch BizFile RPA session
     */
    window.launchBizFileRpa = async function(applicationId, applicationData, btn) {
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><span class="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> <span>Launching...</span></span>`;
        }

        showBizFileModal('launching');

        const token = getAuthToken();
        const reqHeaders = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };

        try {
            const res = await fetch('/api/bizfile/session/start', {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ applicationId: applicationId || 'manual', applicationData: applicationData || {} })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const sessionId = data.sessionId;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">🌐 BizFile Running...</span>`;
                }
                pollBizFileSession(sessionId, btn, originalHtml);
            } else {
                showBizFileModal('error', data.error || 'Failed to start BizFile automation session');
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            }
        } catch (err) {
            showBizFileModal('error', err.message);
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
        }
    };

    /**
     * Handler for Company Detail page (Admin & Staff)
     */
    window.syncBizFileFromDetail = async function() {
        const btn = document.getElementById('bizfile-sync-btn') || document.getElementById('bizfile-sync-dropdown-btn');
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('clientId') || 'client';

        let compName = '';
        let uen = '';
        let contactPerson = '';
        let email = '';

        if (window.clientData) {
            const c = window.clientData.client || {};
            const service = window.clientData.services && window.clientData.services.length > 0 ? window.clientData.services[0] : null;
            const details = service ? (service.details || {}) : {};
            const excel = details.excelData || {};

            compName = excel.companyName || c.name || details.companyName || document.getElementById('company-name')?.innerText || 'Company';
            uen = excel.uen || details.uen || c.uen || document.getElementById('company-uen-badge')?.innerText?.replace('UEN:', '').trim() || '';
            contactPerson = c.contactPerson || details.contactPerson || '';
            email = c.email || details.email || '';
        } else {
            compName = document.getElementById('company-name')?.innerText || 'Company';
            uen = document.getElementById('company-uen-badge')?.innerText?.replace('UEN:', '').trim() || '';
        }

        await launchBizFileRpa(clientId, {
            companyName: compName,
            uen: uen,
            contactPerson: contactPerson,
            email: email
        }, btn);
    };

    /**
     * Handler for Admin Dashboard slide-over panel
     */
    window.adminSyncBizFile = async function() {
        const btn = document.getElementById('admin-sync-bizfile-btn');
        const compName = document.getElementById('detail-company')?.innerText || (window.activeServiceData && window.activeServiceData.companyName) || 'Company';
        const clientId = window.activeClientId || (typeof currentClientId !== 'undefined' ? currentClientId : 'admin-client');
        const details = (window.activeServiceData && window.activeServiceData.details) || {};

        await launchBizFileRpa(clientId, {
            companyName: compName,
            uen: details.uen || details.companyUen || '',
            contactPerson: details.contactPerson || '',
            email: details.email || ''
        }, btn);
    };

})();
