
        let allApplications = [];
        let staffList = [];
        let activeTabFilter = 'pending';
        let currentReviewingApp = null;

        function sanitizeApplicantText(str, fallback = '') {
            if (!str || typeof str !== 'string') return fallback;
            // Strip script blocks and content completely (constructed dynamically to avoid terminating HTML script tag)
            let clean = str.replace(new RegExp('<script[\\s\\S]*?<\\/script>', 'gi'), '');
            // Strip any remaining HTML tags
            clean = clean.replace(/<[^>]+>/g, '');
            // Strip suspicious execution / injection patterns
            clean = clean.replace(/fetch\s*\([^)]*\)/gi, '');
            clean = clean.replace(/document\.cookie/gi, '');
            clean = clean.replace(/javascript\s*:/gi, '');
            clean = clean.replace(/\b(alert|eval|prompt)\s*\([^)]*\)/gi, '');
            clean = clean.trim().replace(/\s+/g, ' ');
            return clean || fallback;
        }

        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function getAvatarInitial(name, fallback = 'A') {
            const clean = sanitizeApplicantText(name, '');
            const match = clean.match(/[a-zA-Z0-9]/);
            return match ? match[0].toUpperCase() : fallback;
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const bgClass = type === 'success' ? 'bg-emerald-600 text-white' : (type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white');
            const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
            toast.className = `${bgClass} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-right duration-300`;
            toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i> <span>${message}</span>`;
            container.appendChild(toast);
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        async function loadStaffList() {
            let remoteStaff = [];
            try {
                const authObj = JSON.parse(localStorage.getItem('admin_auth') || '{}');
                const token = authObj.token;
                const res = await fetch('/api/admin/staff', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (res.ok) {
                    remoteStaff = await res.json();
                }
            } catch (e) {
                console.error("Failed to load remote staff", e);
            }

            let localStaff = [];
            try {
                localStaff = JSON.parse(localStorage.getItem('local_staff_accounts') || '[]');
            } catch (e) { }

            const mergedMap = new Map();
            remoteStaff.forEach(s => {
                const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || s.email;
                if (fullName) mergedMap.set(fullName.toLowerCase(), { id: s.id, name: fullName, email: s.email });
            });
            localStaff.forEach(s => {
                const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || s.email;
                if (fullName && !mergedMap.has(fullName.toLowerCase())) {
                    mergedMap.set(fullName.toLowerCase(), { id: s.id || ('local_' + Date.now()), name: fullName, email: s.email });
                }
            });

            staffList = Array.from(mergedMap.values());

            // Populate staff dropdown
            const select = document.getElementById('approve-staff-select');
            if (select) {
                select.innerHTML = '<option value="">-- Select Staff Member --</option>' +
                    staffList.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name} (${s.email || 'Staff'})</option>`).join('');
            }
        }

        async function fetchCounts() {
            try {
                const res = await fetch('/api/applications/counts');
                if (res.ok) {
                    const counts = await res.json();
                    const badgePending = document.getElementById('badge-pending-count');
                    const badgeRejected = document.getElementById('badge-rejected-count');
                    const badgeAll = document.getElementById('badge-all-count');

                    if (badgePending) badgePending.innerText = counts.pending ?? 0;
                    if (badgeRejected) badgeRejected.innerText = counts.rejected ?? 0;
                    if (badgeAll) badgeAll.innerText = counts.all ?? 0;
                }
            } catch (e) {
                console.warn("Could not fetch application counts", e);
            }
        }

        function renderSmartTableLoader() {
            return `
                <tr>
                    <td colspan="7" class="p-10 text-center">
                        <div class="flex flex-col items-center justify-center py-6">
                            <!-- Smart Dual-Orbit Hologram Spinner -->
                            <div class="relative w-20 h-20 mb-4 flex items-center justify-center">
                                <div class="absolute inset-0 rounded-full bg-blue-500/15 blur-xl smart-pulse-node"></div>
                                <div class="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40 smart-orbit-ring"></div>
                                <div class="absolute inset-2 rounded-full border-2 border-indigo-500/60 border-t-transparent border-l-transparent smart-orbit-ring-fast"></div>
                                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white smart-pulse-node">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                    </svg>
                                </div>
                            </div>
                            <!-- Dynamic Glowing Status Caption -->
                            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 tracking-wide uppercase font-outfit">
                                <span>Synchronizing applications</span>
                                <span class="inline-flex gap-0.5 text-blue-600 font-extrabold text-sm leading-none">
                                    <span class="smart-dot-1">.</span>
                                    <span class="smart-dot-2">.</span>
                                    <span class="smart-dot-3">.</span>
                                </span>
                            </div>
                            <span class="text-[11px] font-medium text-slate-400 mt-1">Fetching live queue from server</span>
                        </div>
                    </td>
                </tr>
                <!-- Shimmer Skeleton Rows -->
                ${[1, 2, 3].map(() => `
                    <tr class="animate-pulse">
                        <td class="px-6 py-4"><div class="h-4 w-40 rounded-lg smart-shimmer mb-1.5"></div><div class="h-3 w-24 rounded smart-shimmer"></div></td>
                        <td class="px-6 py-4"><div class="h-4 w-32 rounded-lg smart-shimmer mb-1.5"></div><div class="h-3 w-28 rounded smart-shimmer"></div></td>
                        <td class="px-6 py-4"><div class="h-6 w-24 rounded-full smart-shimmer"></div></td>
                        <td class="px-6 py-4"><div class="h-6 w-20 rounded-full smart-shimmer"></div></td>
                        <td class="px-6 py-4"><div class="h-5 w-16 rounded-md smart-shimmer"></div></td>
                        <td class="px-6 py-4"><div class="h-4 w-28 rounded smart-shimmer"></div></td>
                        <td class="px-6 py-4 text-right"><div class="h-8 w-24 rounded-xl smart-shimmer ml-auto"></div></td>
                    </tr>
                `).join('')}
            `;
        }

        async function fetchApplications(tab = activeTabFilter, isSilent = false) {
            const tableBody = document.getElementById('applications-table-body');
            if (tableBody && !isSilent && (!allApplications || allApplications.length === 0)) {
                tableBody.innerHTML = renderSmartTableLoader();
            }

            try {
                const staffPromise = loadStaffList();
                const countsPromise = fetchCounts();
                const appPromise = fetch(`/api/applications?tab=${encodeURIComponent(tab)}`).then(r => r.ok ? r.json() : []);

                const [_, __, apps] = await Promise.all([staffPromise, countsPromise, appPromise]);
                allApplications = apps || [];

                if (allApplications && Array.isArray(allApplications)) {
                    // Sort newest applications first
                    allApplications.sort((a, b) => {
                        const tA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
                        const tB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
                        if (tB !== tA) return tB - tA;
                        return String(b.id || b.rawId || '').localeCompare(String(a.id || a.rawId || ''));
                    });

                    filterApplications();
                }
            } catch (e) {
                console.error("Failed to fetch applications", e);
                if (!isSilent) {
                    showToast("Could not load applications from server.", "error");
                }
            }
        }

        window.setTabFilter = function (tab) {
            activeTabFilter = tab;
            ['pending', 'rejected', 'all'].forEach(t => {
                const btn = document.getElementById(`tab-${t}`);
                if (btn) {
                    if (t === tab) {
                        btn.className = 'badge-tab flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm';
                    } else {
                        btn.className = 'badge-tab flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
                    }
                }
            });
            // Load filtered data from backend for selected tab
            fetchApplications(tab);
        };

        window.filterApplications = function () {
            const statusFilter = document.getElementById('filter-status').value;
            const priorityFilter = document.getElementById('filter-priority').value;
            const searchQuery = (document.getElementById('app-search-input')?.value || '').toLowerCase().trim();

            const filtered = allApplications.filter((app, idx) => {
                const s = (app.status || 'pending').toLowerCase();
                const p = (app.priority || 'Normal').toLowerCase();

                // Status Dropdown Filter
                if (statusFilter !== 'All') {
                    if (!s.includes(statusFilter.toLowerCase())) return false;
                }

                // Priority Filter
                if (priorityFilter !== 'All') {
                    if (p !== priorityFilter.toLowerCase()) return false;
                }

                // Search query
                if (searchQuery) {
                    const matchBusiness = (app.business || '').toLowerCase().includes(searchQuery);
                    const matchClient = (app.client || '').toLowerCase().includes(searchQuery);
                    const matchId = String(app.id || app.rawId || '').toLowerCase().includes(searchQuery);
                    const matchStaff = (app.staff || app.assignedStaffName || '').toLowerCase().includes(searchQuery);
                    const namesList = Array.isArray(app.data?.names) ? app.data.names.join(' ').toLowerCase() : '';
                    const matchNames = namesList.includes(searchQuery);
                    if (!matchBusiness && !matchClient && !matchId && !matchStaff && !matchNames) return false;
                }

                return true;
            });

            renderTable(filtered);
        };

        function getNameBadges(data) {
            if (!data) return '<span class="text-slate-300 text-[10px] italic">Not checked</span>';
            let names = [];
            if (Array.isArray(data.names) && data.names.length > 0) {
                names = [...data.names];
            } else if (data.companyName) {
                names.push(data.companyName.trim());
                if (data.alternativeCompanyName1) names.push(data.alternativeCompanyName1.trim());
                if (data.alternativeCompanyName2) names.push(data.alternativeCompanyName2.trim());
            } else if (data.proposedCompanyName) {
                names.push(data.proposedCompanyName.trim());
            }
            if (names.length === 0) return '<span class="text-slate-300 text-[10px] italic">None</span>';

            const checks = data.nameChecks || {};

            return names.map((name, i) => {
                if (!name) return '';
                const check = checks[`names[${i}]`] || checks[name] || {};
                const status = check.status || 'pending';
                let dot = '⚪';
                let style = 'bg-slate-100 text-slate-600 border-slate-200';
                if (status === 'available') { dot = '🟢'; style = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
                else if (status === 'taken' || status === 'invalid') { dot = '🔴'; style = 'bg-red-50 text-red-700 border-red-200'; }
                else if (status === 'similar') { dot = '🟡'; style = 'bg-amber-50 text-amber-700 border-amber-200'; }

                return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${style} mr-1 mb-1">
                    <span>${dot}</span> ${name.substring(0, 18)}${name.length > 18 ? '…' : ''}
                </span>`;
            }).filter(Boolean).join('');
        }

        function renderTable(data) {
            const tbody = document.getElementById('applications-table-body');
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-12 text-center text-slate-400 italic">No applications found matching criteria.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map((app, idx) => {
                const staffName = app.staff && app.staff !== 'Sarah Lim' ? app.staff : (app.assignedStaffName || 'Unassigned');
                const isUnassigned = !staffName || staffName === 'Unassigned';

                const status = (app.status || 'pending').toLowerCase();
                let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600">Pending</span>`;
                if (status.includes('approved') || status.includes('completed')) {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>`;
                } else if (status.includes('rejected')) {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200">Rejected</span>`;
                } else if (status.includes('progress') || status.includes('assigned')) {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">In Progress</span>`;
                } else if (isUnassigned) {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">Open Queue</span>`;
                } else {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">Under Review</span>`;
                }

                const nameBadges = getNameBadges(app.data);
                const appId = app.id || app.rawId;

                return `
                <tr class="hover:bg-slate-50/80 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-900 text-sm">${app.business || 'Singapore Pte Ltd'}</div>
                        <div class="font-bold text-slate-900 text-sm">${escapeHtml(sanitizeApplicantText(app.business, 'Singapore Pte Ltd'))}</div>
                        <div class="text-[11px] text-slate-400">Incorporation Service</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-800 text-xs">${app.client || 'Applicant'}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${app.date || ''}</div>
                        <div class="font-bold text-slate-800 text-xs">${escapeHtml(sanitizeApplicantText(app.client, 'Applicant'))}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${escapeHtml(app.date || '')}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 font-bold text-xs ${isUnassigned ? 'text-slate-400 italic' : 'text-slate-700'}">
                            <span class="w-6 h-6 rounded-full ${isUnassigned ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'} flex items-center justify-center text-[10px]">
                                ${isUnassigned ? '?' : staffName.charAt(0)}
                            </span>
                            ${staffName}
                        </span>
                    </td>
                    <td class="px-6 py-4">${statusBadge}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${app.priority === 'High' || app.priority === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600'}">${app.priority || 'Normal'}</span>
                    </td>
                    <td class="px-6 py-4 max-w-xs">${nameBadges}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="openReviewModal('${appId}')" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i> Review Details
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            if (window.lucide) lucide.createIcons();
        }

        // --- REVIEW MODAL LOGIC ---
        window.openReviewModal = async function (appId) {
            const modal = document.getElementById('review-modal');
            const contentArea = document.getElementById('modal-content-area');
            contentArea.innerHTML = `
                <div class="p-16 text-center flex flex-col items-center justify-center">
                    <div class="relative w-24 h-24 mb-5 flex items-center justify-center">
                        <div class="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl smart-pulse-node"></div>
                        <div class="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/50 smart-orbit-ring"></div>
                        <div class="absolute inset-2.5 rounded-full border-2 border-violet-500/70 border-t-transparent border-r-transparent smart-orbit-ring-fast"></div>
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/40 flex items-center justify-center text-white smart-pulse-node">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase font-outfit">
                        <span>Decrypting Application Manifest</span>
                        <span class="inline-flex gap-0.5 text-indigo-600 font-extrabold text-sm leading-none">
                            <span class="smart-dot-1">.</span>
                            <span class="smart-dot-2">.</span>
                            <span class="smart-dot-3">.</span>
                        </span>
                    </div>
                    <p class="text-[11px] font-medium text-slate-400 mt-1">Retrieving verified KYC, AML screening, and company activity data</p>
                </div>
            `;
            modal.classList.remove('hidden');

            const localApp = (window.allApplications || []).find(a => String(a.id || a.rawId) === String(appId));

            try {
                const res = await fetch(`/api/admin/applications/${appId}`);
                if (res.ok) {
                    const data = await res.json();
                    currentReviewingApp = data;
                    renderReviewModalContent(data);
                    return;
                }
            } catch (e) {
                console.warn("API fetch failed, falling back to local dataset:", e);
            }

            if (localApp) {
                currentReviewingApp = localApp;
                renderReviewModalContent(localApp);
            } else {
                contentArea.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Could not load application details. Please try again.</div>`;
            }
        };

        window.closeReviewModal = function () {
            document.getElementById('review-modal').classList.add('hidden');
            currentReviewingApp = null;
        };

        // Document Preview Helpers
        window.previewAppDoc = function (docData, docName) {
            const modal = document.getElementById('doc-preview-modal');
            const titleEl = document.getElementById('doc-preview-title');
            const bodyEl = document.getElementById('doc-preview-body');
            const downloadBtn = document.getElementById('doc-preview-download-btn');

            titleEl.innerText = docName || 'Uploaded Document';
            downloadBtn.href = docData || '#';
            downloadBtn.download = docName || 'document';

            if (!docData) {
                bodyEl.innerHTML = `<div class="text-slate-400 text-xs italic">No document data available.</div>`;
            } else if (docData.startsWith('data:image/') || docData.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) {
                bodyEl.innerHTML = `<img src="${docData}" alt="${docName}" class="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md">`;
            } else if (docData.startsWith('data:application/pdf') || docData.match(/\.pdf($|\?)/i)) {
                bodyEl.innerHTML = `<iframe src="${docData}" class="w-full h-[60vh] rounded-xl border border-slate-300"></iframe>`;
            } else {
                bodyEl.innerHTML = `
                    <div class="text-center p-8 bg-white rounded-2xl border border-slate-200">
                        <i data-lucide="file-check" class="w-12 h-12 mx-auto text-blue-600 mb-3"></i>
                        <h4 class="font-bold text-slate-800 text-sm mb-1">${docName}</h4>
                        <p class="text-xs text-slate-500 mb-4">Click download to view this file locally.</p>
                        <a href="${docData}" download="${docName}" target="_blank" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm">Download File</a>
                    </div>
                `;
            }

            modal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        };

        window.closeDocPreviewModal = function () {
            document.getElementById('doc-preview-modal').classList.add('hidden');
        };

        window.runLiveAcraNameCheck = async function (encodedName, encodedSuffix, index) {
            const name = decodeURIComponent(encodedName || '');
            const suffix = decodeURIComponent(encodedSuffix || 'Pte. Ltd.');
            const badgeEl = document.getElementById(`acra-badge-${index}`);
            const alertEl = document.getElementById(`acra-detail-${index}`);
            if (!badgeEl) return;

            badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
            badgeEl.innerText = 'Checking ACRA Warehouse...';
            if (alertEl) alertEl.classList.add('hidden');

            try {
                const res = await fetch('/api/name-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, suffix: suffix })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'available' || data.available) {
                        badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                        badgeEl.innerText = '🟢 Available in ACRA';
                        if (alertEl) {
                            alertEl.className = 'text-[11px] font-medium text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 mt-2 block';
                            alertEl.innerHTML = `✓ <strong>Cleared:</strong> No identical or confusingly similar registered entities found in Singapore ACRA registry.`;
                            alertEl.classList.remove('hidden');
                        }
                    } else if (data.status === 'similar') {
                        badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300';
                        const simName = data.similarEntity || 'Existing Entity';
                        badgeEl.innerText = `🟡 Similar: ${simName}`;
                        badgeEl.title = data.message || '';
                        if (alertEl) {
                            alertEl.className = 'text-[11px] font-medium text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2 block space-y-1';
                            alertEl.innerHTML = `
                                <div class="font-bold flex items-center gap-1.5 text-amber-900">
                                    <span>⚠️</span> <span>ACRA Similarity Detected:</span>
                                </div>
                                <div>${data.message || `Similar entity '${simName}' found.`}</div>
                                <div class="text-[10px] text-amber-700 font-mono">Conflicting UEN: ${data.similarUen || 'N/A'} • Rule: ACRA Section 27(1)(a)</div>
                            `;
                            alertEl.classList.remove('hidden');
                        }
                    } else if (data.status === 'restricted') {
                        badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
                        badgeEl.innerText = '⚠️ Restricted Word';
                        badgeEl.title = data.message || '';
                        if (alertEl) {
                            alertEl.className = 'text-[11px] font-medium text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2 block';
                            alertEl.innerHTML = `⚠️ <strong>Ministerial Approval Required:</strong> ${data.message}`;
                            alertEl.classList.remove('hidden');
                        }
                    } else {
                        badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200';
                        const conflictName = data.matchedEntityName || (data.conflicts && data.conflicts[0] ? data.conflicts[0].entityName : '');
                        badgeEl.innerText = conflictName ? `🔴 Taken (${conflictName})` : '🔴 Taken / In Use';
                        badgeEl.title = data.message || '';
                        if (alertEl) {
                            alertEl.className = 'text-[11px] font-medium text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2 block space-y-1';
                            alertEl.innerHTML = `
                                <div class="font-bold flex items-center gap-1.5 text-red-900">
                                    <span>🔴</span> <span>Identical / Base Name Conflict:</span>
                                </div>
                                <div>${data.message || `An entity with this name is already registered.`}</div>
                                <div class="text-[10px] text-red-700 font-mono">UEN: ${data.matchedUen || 'N/A'} • Status: ${data.matchedStatus || 'Registered'}</div>
                            `;
                            alertEl.classList.remove('hidden');
                        }
                    }
                } else {
                    badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200';
                    badgeEl.innerText = 'Check Failed';
                }
            } catch (err) {
                badgeEl.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200';
                badgeEl.innerText = 'Check Error';
            }
        };

        function renderReviewModalContent(app) {
            const d = app.data || {};
            const contact = d.contact || {};

            // 1. Company Names
            let names = [];
            if (Array.isArray(d.names) && d.names.length > 0) {
                names = [...d.names];
            } else {
                if (d.companyName && typeof d.companyName === "string" && d.companyName.trim()) {
                    names.push(d.companyName.trim());
                } else if (d.proposedCompanyName && typeof d.proposedCompanyName === "string" && d.proposedCompanyName.trim()) {
                    names.push(d.proposedCompanyName.trim());
                }
                if (d.alternativeCompanyName1 && typeof d.alternativeCompanyName1 === "string" && d.alternativeCompanyName1.trim()) {
                    names.push(d.alternativeCompanyName1.trim());
                }
                if (d.alternativeCompanyName2 && typeof d.alternativeCompanyName2 === "string" && d.alternativeCompanyName2.trim()) {
                    names.push(d.alternativeCompanyName2.trim());
                }
            }
            if (names.length === 0) {
                names.push("Proposed Singapore Company");
            }

            const checks = d.nameChecks || {};
            const suffix = d.companySuffix || (d.entityType === "private_limited" ? "Pte. Ltd." : "Pte. Ltd.");
            const jurisdiction = d.jurisdiction || "Singapore";

            let entityTypeLabel = "Private Limited Company";
            if (d.entityType === "sole_proprietorship") entityTypeLabel = "Sole Proprietorship";
            else if (d.entityType === "llp") entityTypeLabel = "Limited Liability Partnership (LLP)";
            else if (d.entityType) entityTypeLabel = d.entityType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

            // 2. SSIC & Business Scope
            const acts = (typeof d.activities === "object" && d.activities !== null) ? d.activities : {};
            const actsPrimary = Array.isArray(acts) ? acts[0] : (acts.primary || d["activities.primary"] || null);
            const actsSecondary = Array.isArray(acts) ? acts[1] : (acts.secondary || d["activities.secondary"] || null);

            const priSsic = (typeof actsPrimary === "object" && actsPrimary !== null ? actsPrimary : null)
                || (typeof d.primarySsic === "object" && d.primarySsic !== null ? d.primarySsic : null)
                || (typeof d.primaryActivity === "object" && d.primaryActivity !== null ? d.primaryActivity : null)
                || {};
            const secSsic = (typeof actsSecondary === "object" && actsSecondary !== null ? actsSecondary : null)
                || (typeof d.secondarySsic === "object" && d.secondarySsic !== null ? d.secondarySsic : null)
                || (typeof d.secondaryActivity === "object" && d.secondaryActivity !== null ? d.secondaryActivity : null)
                || {};

            const priString = (typeof actsPrimary === "string" ? actsPrimary : "")
                || (typeof d.primaryActivity === "string" ? d.primaryActivity : "")
                || (typeof d.primarySsic === "string" ? d.primarySsic : "")
                || (typeof d.activity === "string" ? d.activity : "");
            const secString = (typeof actsSecondary === "string" ? actsSecondary : "")
                || (typeof d.secondaryActivity === "string" ? d.secondaryActivity : "")
                || (typeof d.secondarySsic === "string" ? d.secondarySsic : "");

            const primaryCode = d.primaryActivityCode
                || priSsic.code
                || priSsic.ssic
                || (priString.match(/^\d{5}/) ? priString.match(/^\d{5}/)[0] : "")
                || "";

            let primaryTitle = priSsic.name
                || priSsic.title
                || priSsic.description
                || (priString ? priString.replace(/^\d{5}\s*[-–:]*\s*/, "") : "")
                || "";
            if (primaryCode && primaryTitle.startsWith(primaryCode)) {
                primaryTitle = primaryTitle.substring(primaryCode.length).replace(/^[\s\-–:]+/, "").trim();
            }
            if (!primaryTitle && primaryCode) {
                primaryTitle = priString || primaryCode;
            }
            if (!primaryTitle && !primaryCode) {
                primaryTitle = "Not specified";
            }

            const primaryCustom = d.primaryActivityDescription
                || d.customPrimaryActivity
                || priSsic.customDescription
                || (priSsic.description && priSsic.description !== priSsic.name && priSsic.description !== primaryTitle ? priSsic.description : "");

            const secondaryCode = d.secondaryActivityCode
                || secSsic.code
                || secSsic.ssic
                || (secString.match(/^\d{5}/) ? secString.match(/^\d{5}/)[0] : "")
                || "";

            let secondaryTitle = secSsic.name
                || secSsic.title
                || secSsic.description
                || (secString ? secString.replace(/^\d{5}\s*[-–:]*\s*/, "") : "")
                || "";
            if (secondaryCode && secondaryTitle.startsWith(secondaryCode)) {
                secondaryTitle = secondaryTitle.substring(secondaryCode.length).replace(/^[\s\-–:]+/, "").trim();
            }
            if (!secondaryTitle && secondaryCode) {
                secondaryTitle = secString || secondaryCode;
            }

            const secondaryCustom = d.secondaryActivityDescription
                || d.customSecondaryActivity
                || secSsic.customDescription
                || (secSsic.description && secSsic.description !== secSsic.name && secSsic.description !== secondaryTitle ? secSsic.description : "");

            // 3. Governance: Shareholders & Directors Counts
            const individualShareholders = d.individualShareholders !== undefined ? parseInt(d.individualShareholders, 10) : (Array.isArray(d.shareholders) ? d.shareholders.filter(s => s.type !== "corporate").length : 1);
            const corporateShareholders = d.corporateShareholders !== undefined ? parseInt(d.corporateShareholders, 10) : (Array.isArray(d.shareholders) ? d.shareholders.filter(s => s.type === "corporate").length : 0);
            const totalShareholders = individualShareholders + corporateShareholders;

            const localDirectors = d.localDirectors !== undefined ? parseInt(d.localDirectors, 10) : (Array.isArray(d.directors) ? d.directors.filter(dir => !dir.isForeign).length : 1);
            const foreignDirectors = d.foreignDirectors !== undefined ? parseInt(d.foreignDirectors, 10) : (Array.isArray(d.directors) ? d.directors.filter(dir => dir.isForeign).length : 0);
            const totalDirectors = localDirectors + foreignDirectors;
            const needNomineeDirector = d.needNomineeDirector === true || d.needNomineeDirector === "true";

            // 4. Registered Office Address
            const hasOwnAddress = (d.hasRegisteredAddress === true || d.hasRegisteredAddress === "true") && !!(d.addressStreet && d.addressStreet.trim());
            let registeredAddressLine = "100 Cecil Street, #10-01 The Globe, Singapore 069541";
            let registeredAddressSubtext = "Globalisor CBD Statutory Registered Office Service (includes registered address filing, digital mail handling & ACRA statutory notices)";
            if (hasOwnAddress) {
                const street = (d.addressStreet || "").trim();
                const unit = (d.addressUnit || "").trim();
                const postal = (d.addressPostalCode || "").trim();
                registeredAddressLine = `${street}${unit ? ", #" + unit : ""}${postal ? ", Singapore " + postal : ", Singapore"}`;
                registeredAddressSubtext = "Client\x27s own registered premise in Singapore";
            }

            // 5. Applicant & Contact Particulars
            const contactTitle = contact.title || "";
            const rawFirstName = contact.firstName || app.clientFirstName || "";
            const rawLastName = contact.lastName || app.clientLastName || "";
            const rawFullName = `${contactTitle ? contactTitle + " " : ""}${rawFirstName} ${rawLastName}`.trim() || app.client || "Applicant";
            const contactFullName = sanitizeApplicantText(rawFullName, "Applicant");
            const contactEmail = sanitizeApplicantText(contact.email || app.clientEmail || "", "N/A");
            const rawPhone = contact.phone ? `${contact.countryCode || ""} ${contact.phone}`.trim() : (app.clientPhone || "");
            const contactPhone = sanitizeApplicantText(rawPhone, "N/A");

            // 6. Application Meta
            const appRef = app.applicationReferenceNo || app.applicationId || app.id || "N/A";
            const submissionDate = app.createdAt ? new Date(app.createdAt).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" }) : (app.date || "Recently submitted");
            const status = (app.status || "under review").toLowerCase();

            // Update Modal Header DOM elements
            const companyTitle = sanitizeApplicantText(`${names[0]} ${suffix}`.trim(), "Proposed Singapore Company Pte. Ltd.");
            const titleEl = document.getElementById("modal-company-title");
            if (titleEl) titleEl.innerText = companyTitle;

            const subEl = document.getElementById("modal-applicant-subtitle");
            if (subEl) subEl.innerText = `Applicant: ${contactFullName} • ${contactEmail} • ${contactPhone}`;

            const badge = document.getElementById("modal-status-badge");
            if (badge) {
                if (status.includes("approved") || status.includes("completed")) {
                    badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30";
                    badge.innerText = "Approved";
                } else if (status.includes("rejected")) {
                    badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-400/20 text-red-300 border border-red-400/30";
                    badge.innerText = "Needs Revision";
                } else {
                    badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30";
                    badge.innerText = "Under Review";
                }
            }

            const refBadge = document.getElementById("modal-app-ref-badge");
            if (refBadge) {
                refBadge.innerText = appRef;
            }

            const amlBadge = document.getElementById("modal-aml-header-badge");
            if (amlBadge) {
                amlBadge.classList.add("hidden");
            }

            // --- Section 1: Names HTML ---
            let namesHtml = names.map((name, i) => {
                if (!name) return "";
                const c = checks[`names[${i}]`] || checks[name] || {};
                const s = c.status || "pending";
                let tag = `<span id="acra-badge-${i}" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">⚪ Pending ACRA Check</span>`;
                if (s === "available") tag = `<span id="acra-badge-${i}" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Available in ACRA</span>`;
                else if (s === "taken") tag = `<span id="acra-badge-${i}" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">🔴 Taken / In Use</span>`;
                else if (s === "similar") tag = `<span id="acra-badge-${i}" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">🟡 Similar Name Exists</span>`;

                return `
                    <div class="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${i === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}">
                                        ${i === 0 ? "Primary Preferred Choice" : `Alternative Choice #${i}`}
                                    </span>
                                </div>
                                <div class="text-base font-bold text-slate-900 mt-1">
                                    ${escapeHtml(name)} <span class="text-sm font-semibold text-slate-500">${escapeHtml(suffix)}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${tag}
                                <button type="button" onclick="window.runLiveAcraNameCheck('${encodeURIComponent(name).replace(/'/g, "%27")}', '${encodeURIComponent(suffix).replace(/'/g, "%27")}', ${i})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                                    <i data-lucide="search" class="w-3.5 h-3.5"></i> Verify ACRA
                                </button>
                            </div>
                        </div>
                        <div id="acra-detail-${i}" class="hidden mt-2.5"></div>
                    </div>
                `;
            }).filter(Boolean).join("");

            // Assemble clean, modern Content HTML
            const contentHtml = `
                <div class="space-y-5">
                    <!-- 1. Company Name & ACRA Verification Card -->
                    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div class="flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                    <i data-lucide="building-2" class="w-4 h-4"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-slate-900">Proposed Company Name & ACRA Availability</h4>
                                    <p class="text-[11px] text-slate-400">Jurisdiction: ${jurisdiction} • Structure: ${entityTypeLabel}</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                                ${names.length} Option${names.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <div class="space-y-2.5">
                            ${namesHtml || "<p class=\"text-xs text-slate-400 italic\">No names submitted</p>"}
                        </div>
                    </div>

                    <!-- 2. Business Activities (SSIC 2025) Card -->
                    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                        <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <i data-lucide="briefcase" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900">Business Activities (SSIC 2025)</h4>
                                <p class="text-[11px] text-slate-400">Singapore Standard Industrial Classification</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Primary SSIC -->
                            <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Activity</span>
                                    ${primaryCode ? `<span class="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200">SSIC ${primaryCode}</span>` : ""}
                                </div>
                                <div class="text-sm font-bold text-slate-900 leading-snug">${escapeHtml(primaryTitle)}</div>
                                ${primaryCustom ? `
                                    <div class="pt-2 border-t border-slate-200/60">
                                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Custom Activity Scope</span>
                                        <p class="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80">"${escapeHtml(primaryCustom)}"</p>
                                    </div>
                                ` : ""}
                            </div>

                            <!-- Secondary SSIC -->
                            <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Secondary Activity</span>
                                    ${secondaryCode ? `<span class="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">SSIC ${secondaryCode}</span>` : ""}
                                </div>
                                <div class="text-sm font-bold ${secondaryCode || (secondaryTitle && secondaryTitle !== "None") ? "text-slate-900" : "text-slate-400 italic"} leading-snug">
                                    ${escapeHtml(secondaryTitle || "None specified")}
                                </div>
                                ${secondaryCustom ? `
                                    <div class="pt-2 border-t border-slate-200/60">
                                        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Custom Activity Scope</span>
                                        <p class="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80">"${escapeHtml(secondaryCustom)}"</p>
                                    </div>
                                ` : ""}
                            </div>
                        </div>
                    </div>

                    <!-- 3. Structure & Governance Card -->
                    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                        <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <i data-lucide="users" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900">Governance & Board Structure</h4>
                                <p class="text-[11px] text-slate-400">Shareholders, Directors & Nominee Director Requirement</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <!-- Shareholders Box -->
                            <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shareholders</span>
                                    <i data-lucide="pie-chart" class="w-4 h-4 text-purple-600"></i>
                                </div>
                                <div>
                                    <div class="text-xl font-extrabold text-slate-900">${totalShareholders} <span class="text-xs font-normal text-slate-500">Member${totalShareholders !== 1 ? "s" : ""}</span></div>
                                    <div class="text-[11px] text-slate-600 mt-1 font-medium space-y-0.5">
                                        <div>• <strong>${individualShareholders}</strong> Individual Member${individualShareholders !== 1 ? "s" : ""}</div>
                                        <div>• <strong>${corporateShareholders}</strong> Corporate Member${corporateShareholders !== 1 ? "s" : ""}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Directors Box -->
                            <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Directors</span>
                                    <i data-lucide="user-check" class="w-4 h-4 text-blue-600"></i>
                                </div>
                                <div>
                                    <div class="text-xl font-extrabold text-slate-900">${totalDirectors} <span class="text-xs font-normal text-slate-500">Director${totalDirectors !== 1 ? "s" : ""}</span></div>
                                    <div class="text-[11px] text-slate-600 mt-1 font-medium space-y-0.5">
                                        <div>• <strong>${localDirectors}</strong> Local Resident${localDirectors !== 1 ? "s" : ""}</div>
                                        <div>• <strong>${foreignDirectors}</strong> Foreign Resident${foreignDirectors !== 1 ? "s" : ""}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Nominee Service Box -->
                            <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nominee Director</span>
                                    <i data-lucide="shield" class="w-4 h-4 ${needNomineeDirector ? "text-amber-600" : "text-emerald-600"}"></i>
                                </div>
                                <div>
                                    <div class="text-sm font-bold ${needNomineeDirector ? "text-amber-800" : "text-emerald-700"}">
                                        ${needNomineeDirector ? "Service Requested" : "Self-Provided"}
                                    </div>
                                    <div class="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
                                        ${needNomineeDirector ? "Globalisor Resident Nominee Director needed" : "Meets SG Companies Act local director requirement"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Registered Office Address Card -->
                    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div class="flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-slate-900">Registered Office Address</h4>
                                    <p class="text-[11px] text-slate-400">Singapore Statutory Registered Office Premise</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${hasOwnAddress ? "bg-slate-100 text-slate-700 border border-slate-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}">
                                ${hasOwnAddress ? "Own Office Address" : "Globalisor CBD Address Package"}
                            </span>
                        </div>
                        <div class="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
                            <div class="space-y-0.5">
                                <div class="text-sm font-bold text-slate-900">${escapeHtml(registeredAddressLine)}</div>
                                <p class="text-xs text-slate-500">${escapeHtml(registeredAddressSubtext)}</p>
                            </div>
                            <div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                                <i data-lucide="navigation" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>

                    <!-- 5. Primary Applicant Particulars & Meta Card -->
                    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                        <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                <i data-lucide="user" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900">Applicant Contact & Application Records</h4>
                                <p class="text-[11px] text-slate-400">Primary Contact Person & System Filing Details</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applicant Name</span>
                                <div class="text-xs font-bold text-slate-900 truncate">${escapeHtml(contactFullName)}</div>
                                <div class="text-[10px] text-slate-400">Authorised Contact</div>
                            </div>
                            <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                                <div class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</div>
                                <div class="text-[10px] text-slate-400">Portal Login Account</div>
                            </div>
                            <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                                <div class="text-xs font-bold text-slate-900 truncate">${escapeHtml(contactPhone)}</div>
                                <div class="text-[10px] text-slate-400">Direct Contact</div>
                            </div>
                            <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filing Reference</span>
                                <div class="text-xs font-bold text-slate-900 truncate font-mono">${escapeHtml(appRef)}</div>
                                <div class="text-[10px] text-slate-400">${submissionDate}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById("modal-content-area").innerHTML = contentHtml;
            if (window.lucide) lucide.createIcons();
        }

        // --- APPROVE FLOW ---
        window.openApproveStaffSection = function () {
            if (!currentReviewingApp) return;
            document.getElementById('approve-dialog').classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        };

        window.closeApproveStaffSection = function () {
            document.getElementById('approve-dialog').classList.add('hidden');
        };

        window.executeApplicationApproval = async function () {
            if (!currentReviewingApp) return;
            const staffSelect = document.getElementById('approve-staff-select');
            const staffId = staffSelect.value;
            const selectedOption = staffSelect.options[staffSelect.selectedIndex];
            const staffName = selectedOption ? selectedOption.getAttribute('data-name') : '';

            if (!staffId) {
                alert("Please select a staff member to assign this incorporation task to.");
                return;
            }

            const priority = document.querySelector('input[name="approve-priority"]:checked')?.value || 'HIGH';
            const notes = document.getElementById('approve-admin-notes').value;
            const btn = document.getElementById('btn-confirm-approve');
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Approving...`;
            if (window.lucide) lucide.createIcons();

            try {
                const res = await fetch(`/api/admin/applications/${currentReviewingApp.id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        staffId: staffId,
                        staffName: staffName,
                        priority: priority,
                        notes: notes
                    })
                });

                if (!res.ok) throw new Error("Approval failed");

                showToast(`Application approved! Client activated and task assigned to ${staffName}.`, 'success');
                closeApproveStaffSection();
                closeReviewModal();
                fetchApplications();
            } catch (e) {
                console.error(e);
                showToast("Failed to approve application. Please try again.", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Confirm Approval`;
            }
        };

        // --- REJECT FLOW ---
        window.openRejectReasonSection = function () {
            if (!currentReviewingApp) return;
            document.getElementById('reject-dialog').classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        };

        window.closeRejectReasonSection = function () {
            document.getElementById('reject-dialog').classList.add('hidden');
        };

        window.executeApplicationRejection = async function () {
            if (!currentReviewingApp) return;
            const reason = document.getElementById('reject-reason-text').value.trim();
            if (!reason) {
                alert("Please enter the reason for returning/rejecting this application.");
                return;
            }

            const btn = document.getElementById('btn-confirm-reject');
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Submitting...`;
            if (window.lucide) lucide.createIcons();

            try {
                const res = await fetch(`/api/admin/applications/${currentReviewingApp.id}/reject`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: reason })
                });

                if (!res.ok) throw new Error("Rejection failed");

                showToast("Application returned for revision. Notification sent to client.", "info");
                closeRejectReasonSection();
                closeReviewModal();
                fetchApplications();
            } catch (e) {
                console.error(e);
                showToast("Failed to reject application.", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Send Revision Request`;
            }
        };

        window.toggleSubmenu = function (id) {
            const submenu = document.getElementById(id);
            const btn = document.getElementById('btn-services');
            if (submenu) {
                const isOpen = !submenu.classList.contains('hidden');
                if (isOpen) {
                    submenu.classList.add('hidden');
                    btn.classList.remove('submenu-open');
                } else {
                    submenu.classList.remove('hidden');
                    btn.classList.add('submenu-open');
                }
            }
        };

        // --- REAL-TIME APPLICATION AML & SANCTIONS VALIDATION ---
        window.runApplicationAmlScreen = async function () {
            if (!currentReviewingApp) return;

            const btn = document.getElementById('btn-run-app-aml');
            const indicator = document.getElementById('app-aml-status-indicator');
            const directive = document.getElementById('app-aml-directive');
            const latencyEl = document.getElementById('app-aml-latency');
            const partiesGrid = document.getElementById('app-aml-parties-grid');
            const summaryBanner = document.getElementById('app-aml-summary-banner');
            const headerPill = document.getElementById('modal-aml-header-badge');

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Scanning 820k DB...</span>`;
            }
            if (indicator) {
                indicator.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-blue-600"></i><span class="text-xs font-bold text-slate-700">Screening all application officers in MongoDB Atlas...</span>`;
            }
            if (window.lucide) lucide.createIcons();

            const t0 = performance.now();
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;

                // Pre-sanitize payload copy before sending to AML screening endpoint
                const sanitizedPayload = JSON.parse(JSON.stringify(currentReviewingApp));
                if (sanitizedPayload.data) {
                    const c = sanitizedPayload.data.contact;
                    if (c) {
                        if (c.firstName) c.firstName = sanitizeApplicantText(c.firstName);
                        if (c.lastName) c.lastName = sanitizeApplicantText(c.lastName);
                    }
                    if (Array.isArray(sanitizedPayload.data.directors)) {
                        sanitizedPayload.data.directors.forEach(d => {
                            if (d.name) d.name = sanitizeApplicantText(d.name);
                        });
                    }
                    if (Array.isArray(sanitizedPayload.data.shareholders)) {
                        sanitizedPayload.data.shareholders.forEach(s => {
                            if (s.name) s.name = sanitizeApplicantText(s.name);
                        });
                    }
                }
                if (sanitizedPayload.clientFirstName) sanitizedPayload.clientFirstName = sanitizeApplicantText(sanitizedPayload.clientFirstName);
                if (sanitizedPayload.clientLastName) sanitizedPayload.clientLastName = sanitizeApplicantText(sanitizedPayload.clientLastName);
                if (sanitizedPayload.client) sanitizedPayload.client = sanitizeApplicantText(sanitizedPayload.client);

                const res = await fetch('/api/admin/aml/screen-application', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(sanitizedPayload)
                });

                if (!res.ok) throw new Error('Screening endpoint returned ' + res.status);
                const data = await res.json();
                const latency = Math.round(performance.now() - t0);
                if (latencyEl) latencyEl.innerText = `${latency} ms latency`;

                const isClean = data.overallAmlStatus === 'clean';
                const isPep = Boolean(data.isPep);
                const isSanction = Boolean(data.isSanction);
                const risk = data.overallRiskLevel || 'Low';

                // Update Header Pill
                if (headerPill) {
                    if (isSanction) {
                        headerPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500 text-white border border-red-600';
                        headerPill.innerText = 'AML: SANCTION BLOCKED';
                    } else if (isPep) {
                        headerPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white border border-amber-600';
                        headerPill.innerText = 'AML: PEP (EDD REQUIRED)';
                    } else {
                        headerPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white border border-emerald-600';
                        headerPill.innerText = 'AML: PASSED CLEAN';
                    }
                }

                // Update Summary Banner
                if (summaryBanner) {
                    summaryBanner.className = `p-4 rounded-xl border ${isSanction ? 'border-red-200 bg-red-50/70' : (isPep ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70')} space-y-2`;
                }
                if (indicator) {
                    indicator.innerHTML = isSanction
                        ? `<span class="px-2.5 py-0.5 bg-red-600 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5"><i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> SANCTION HIT</span><span class="text-xs font-bold text-red-950">${escapeHtml(data.summary)}</span>`
                        : (isPep
                            ? `<span class="px-2.5 py-0.5 bg-amber-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> PEP FLAGGED</span><span class="text-xs font-bold text-amber-950">${escapeHtml(data.summary)}</span>`
                            : `<span class="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> 0 MATCHES</span><span class="text-xs font-bold text-emerald-950">${escapeHtml(data.summary)}</span>`);
                }
                if (directive) {
                    directive.innerHTML = `<strong class="text-slate-800">Singapore ACRA / MAS Compliance Directive:</strong> ${escapeHtml(data.regulatoryDirective || 'Application approved.')}`;
                }

                // Render Screened Parties Breakdown
                const parties = data.parties || [];
                if (partiesGrid) {
                    if (parties.length === 0) {
                        partiesGrid.innerHTML = `<p class="text-xs text-slate-400 italic">No party details extracted.</p>`;
                    } else {
                        partiesGrid.innerHTML = parties.map(p => {
                            const sr = p.screeningResult || {};
                            const pHit = sr.matchFound;
                            const pPep = sr.pep;
                            const pSanc = sr.sanction;
                            const pRisk = sr.riskLevel || 'Low';
                            const safePartyName = escapeHtml(sanitizeApplicantText(p.name, 'Officer'));
                            const safeRole = escapeHtml(p.role || 'Officer');
                            const safeId = escapeHtml(p.idNumber || 'On file');

                            let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            let statusLabel = 'Clean';
                            if (pSanc) {
                                badgeColor = 'bg-red-50 text-red-700 border-red-200';
                                statusLabel = 'Sanction Hit';
                            } else if (pPep) {
                                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                                statusLabel = `Foreign PEP (${sr.highestConfidence}%)`;
                            }

                            return `
                                <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs font-bold text-slate-900">${p.name}</span>
                                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">${p.role}</span>
                                            <span class="text-xs font-bold text-slate-900">${safePartyName}</span>
                                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">${safeRole}</span>
                                        </div>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeColor}">${statusLabel}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-[11px] text-slate-500">
                                        <span>ID: <strong class="font-mono text-slate-700">${p.idNumber || 'On file'}</strong></span>
                                        <span>ID: <strong class="font-mono text-slate-700">${safeId}</strong></span>
                                        <span>Risk: <strong class="${pRisk === 'Critical' ? 'text-red-600' : (pRisk === 'High' ? 'text-amber-700' : 'text-emerald-700')}">${pRisk}</strong></span>
                                    </div>
                                    ${pHit && sr.matches && sr.matches.length > 0 ? `
                                        <div class="p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-[10px] text-slate-600 mt-1 space-y-0.5">
                                            <div><strong>Match:</strong> ${sr.matches[0].primaryName} (${sr.matches[0].source} • ${sr.matches[0].recordId})</div>
                                            <div class="text-slate-400 truncate">${sr.matches[0].remarks || ''}</div>
                                            <div><strong>Match:</strong> ${escapeHtml(sr.matches[0].primaryName)} (${escapeHtml(sr.matches[0].source)} • ${escapeHtml(sr.matches[0].recordId)})</div>
                                            <div class="text-slate-400 truncate">${escapeHtml(sr.matches[0].remarks || '')}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('');
                    }
                }

                // Also update individual Director & Shareholder badges in Section 3 & Section 4
                parties.forEach(p => {
                    const sr = p.screeningResult || {};
                    const pHit = sr.matchFound;
                    const pPep = sr.pep;
                    const pSanc = sr.sanction;

                    let badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 AML: Clean</span>`;
                    if (pSanc) {
                        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">🔴 AML: Sanction Hit</span>`;
                    } else if (pPep) {
                        badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">🟠 AML: Foreign PEP (${sr.highestConfidence}%)</span>`;
                    }

                    document.querySelectorAll(`[id^="dir-aml-badge-"]`).forEach(el => {
                        const parent = el.closest('.space-y-3') || el.closest('.p-4');
                        if (parent && parent.innerText.toLowerCase().includes(p.name.toLowerCase())) {
                            el.outerHTML = badgeHtml;
                        }
                    });
                    const pName = (p.name || '').toLowerCase().trim();
                    if (pName) {
                        document.querySelectorAll(`[id^="dir-aml-badge-"]`).forEach(el => {
                            const parent = el.closest('.space-y-3') || el.closest('.p-4');
                            if (parent && parent.innerText.toLowerCase().includes(pName)) {
                                el.outerHTML = badgeHtml;
                            }
                        });

                        document.querySelectorAll(`[id^="sh-aml-badge-"]`).forEach(el => {
                            const parent = el.closest('.space-y-3') || el.closest('.p-4');
                            if (parent && parent.innerText.toLowerCase().includes(p.name.toLowerCase())) {
                                el.outerHTML = badgeHtml;
                            }
                        });
                        document.querySelectorAll(`[id^="sh-aml-badge-"]`).forEach(el => {
                            const parent = el.closest('.space-y-3') || el.closest('.p-4');
                            if (parent && parent.innerText.toLowerCase().includes(pName)) {
                                el.outerHTML = badgeHtml;
                            }
                        });
                    }
                });

            } catch (err) {
                console.error('Application AML screening error:', err);
                if (indicator) {
                    indicator.innerHTML = `<span class="text-xs font-bold text-red-600">Screening failed: ${err.message}</span>`;
                    indicator.innerHTML = `<span class="text-xs font-bold text-red-600">Screening failed: ${escapeHtml(err.message)}</span>`;
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>Re-Screen Officers</span>`;
                }
                if (window.lucide) lucide.createIcons();
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
            fetchApplications();
        });

        // 30s background sync (silent mode without interrupting modal or table view)
        setInterval(() => {
            const modal = document.getElementById('review-modal');
            const isModalOpen = modal && !modal.classList.contains('hidden');
            if (!isModalOpen) {
                fetchApplications(activeTabFilter, true);
            }
        }, 30000);
    