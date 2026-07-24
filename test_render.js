
    let state = {"requirements":{"directors":[{"name":"A","email":"a@a.com","phone":"123"}],"shareholders":[]},"onboarding":{}};
    function obRenderDocumentChecklistHtml(isReadOnly) {
    const req = state.requirements || {};
    const dirs = req.directors || [];
    const shs = req.shareholders || [];
    const inds = shs.filter(s => s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤'))));
    const corps = shs.filter(s => !(s.type === 'individual' || s.type === '👤' || (typeof s.type === 'string' && (s.type.toLowerCase().includes('individual') || s.type.includes('👤')))));
    const repData = (state.onboarding && state.onboarding.step6CorporateRep && state.onboarding.step6CorporateRep.data) || {};

    const cleanContactVal = (val, fallback) => {
        if (!val) return fallback;
        const clean = val.toString().trim().toUpperCase();
        if (clean === '' || clean === 'N/A' || clean === 'N / A' || clean === 'NULL' || clean === 'UNDEFINED') {
            return fallback;
        }
        return val;
    };

    let html = `
    <div style="background: #ffffff; border-radius: 16px; padding: 0; font-family: 'Outfit', sans-serif;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 0 0 0;">
            <div style="font-size: 12.5px; color: #475569; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #334155;">Mandatory for all:</div>
                <div>1. Email ID</div>
                <div>2. Phone Number</div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; font-size: 13px; color: #64748b; font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 16px; height: 16px; background: #c084fc; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Mandatory</span>
                </div>
                <div style="width: 1px; height: 16px; background: #e2e8f0;"></div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>As per selection</span>
                </div>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 16px; padding: 0 0 0 0;">
    `;

    const renderSection = (config) => {
        const { theme, icon, title, count, checkboxes, detailsTitle, detailsList } = config;
        const colors = {
            purple: { bg: '#faf5ff', iconBg: '#f3e8ff', text: '#9333ea', border: '#e9d5ff', dark: '#6b21a8' },
            green: { bg: '#f0fdf4', iconBg: '#dcfce7', text: '#22c55e', border: '#bbf7d0', dark: '#15803d' },
            orange: { bg: '#fff7ed', iconBg: '#ffedd5', text: '#f97316', border: '#fed7aa', dark: '#c2410c' },
            blue: { bg: '#eff6ff', iconBg: '#dbeafe', text: '#3b82f6', border: '#bfdbfe', dark: '#1d4ed8' }
        };
        const c = colors[theme];

        let rightContent = '';
        if (detailsList && detailsList.length > 0) {
            const detailsHtml = detailsList.map((item, idx) => `
                <div style="margin-bottom: 12px; font-family: 'Inter', sans-serif;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-bottom: 6px;">${item.name}</div>
                    <div style="color: #475569; font-size: 12.5px; line-height: 1.6; padding-left: 2px;">
                        ${item.email !== 'Email ID' ? `<div>${item.email}</div>` : ''}
                        ${item.phone !== 'Phone Number' ? `<div>${item.phone}</div>` : ''}
                    </div>
                </div>
            `).join('');

            rightContent = `
                <div style="width: 420px; background: ${c.bg}; border: 1px solid ${c.bg}; border-radius: 12px; padding: 20px 24px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: flex-start; margin: 4px 4px 4px 0;">
                    <div style="flex-grow: 1;">
                        <div style="font-size: 11px; font-weight: 800; color: ${c.text}; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">${detailsTitle}</div>
                        ${detailsHtml}
                    </div>
                    <div style="color: #64748b; padding-top: 2px; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>
            `;
        }

        const checkboxHtml = checkboxes.map(text => `
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <div style="width: 18px; height: 18px; background: ${c.text}; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div style="font-size: 13.5px; color: #475569; font-weight: 500; font-family: 'Inter', sans-serif;">${text}</div>
            </div>
        `).join('');

        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 16px; display: flex; overflow: hidden; background: #fff; min-height: 120px;">
                <div style="flex-grow: 1; padding: 24px; display: flex; gap: 20px;">
                    <div style="width: 48px; height: 48px; background-color: ${c.iconBg}; color: ${c.dark}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${icon}
                    </div>
                    <div style="flex-grow: 1; padding-top: 2px;">
                        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">
                            ${title} ${count ? `(${count})` : ''}
                        </div>
                        <div>
                            ${checkboxHtml}
                        </div>
                    </div>
                </div>
                ${rightContent}
            </div>
        `;
    };

    if (dirs.length > 0) {
        html += renderSection({
            theme: 'purple',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            title: 'Director Documents',
            count: `${dirs.length} Director${dirs.length > 1 ? 's' : ''}`,
            checkboxes: [
                'NRIC / FIN (front & back) for all directors',
                'Proof of Address (Utility Bill / Bank Statement /<br/>Mobile Bill dated Within 3 months)'
            ],
            detailsTitle: 'DIRECTOR REGISTRY DETAILS',
            detailsList: dirs.map((d, dIdx) => ({
                name: `Director ${dIdx + 1}${d.name && d.name !== 'N/A' ? ` - ${d.name}` : ''}`,
                email: cleanContactVal(d.email, 'Email ID'),
                phone: cleanContactVal(d.phone, 'Phone Number')
            }))
        });
    }

    if (inds.length > 0) {
        html += renderSection({
            theme: 'green',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
            title: 'Individual Shareholder Documents',
            count: `${inds.length} Shareholder${inds.length > 1 ? 's' : ''}`,
            checkboxes: [
                'NRIC / FIN (front & back) for all individual shareholders',
                'Proof of Address for all individual shareholders'
            ],
            detailsTitle: 'INDIVIDUAL SHAREHOLDER REGISTRY DETAILS',
            detailsList: inds.map((s, sIdx) => ({
                name: `Shareholder ${sIdx + 1}${s.name && s.name !== 'N/A' ? ` - ${s.name}` : ''}`,
                email: cleanContactVal(s.email, 'Email ID'),
                phone: cleanContactVal(s.phone, 'Phone Number')
            }))
        });
    }

    if (corps.length > 0) {
        html += renderSection({
            theme: 'orange',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`,
            title: 'Corporate Shareholder Documents',
            count: `${corps.length} Corporate Shareholder${corps.length > 1 ? 's' : ''}`,
            checkboxes: [
                'ACRA Bizfile (or foreign registry equivalent)',
                'Company Constitution (M&AA)',
                'Certificate of Incorporation (for non-Singapore companies)'
            ],
            detailsTitle: 'CORPORATE SHAREHOLDER REGISTRY DETAILS',
            detailsList: corps.map((s, cIdx) => ({
                name: `Corporate Shareholder ${cIdx + 1}${s.name && s.name !== 'N/A' ? ` - ${s.name}` : ''}`,
                email: cleanContactVal(s.email, 'Email ID'),
                phone: cleanContactVal(s.phone, 'Phone Number')
            }))
        });

        html += renderSection({
            theme: 'blue',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><circle cx="12" cy="13" r="3"></circle><path d="M17 19v-1a4 4 0 0 0-8 0v1"></path></svg>`,
            title: 'Corporate Representative Documents',
            count: null,
            checkboxes: [
                'NRIC / FIN for the authorized corporate representative',
                'Proof of Address for the representative',
                'Board Resolution or Letter of Authorization appointing the representative'
            ],
            detailsTitle: 'REPRESENTATIVE CONTACT DETAILS',
            detailsList: [{
                name: `Representative${repData.fullName && repData.fullName !== 'Not Filled Yet' && repData.fullName !== 'N/A' ? ` - ${repData.fullName}` : ''}`,
                email: cleanContactVal(repData.email, 'Email ID'),
                phone: cleanContactVal(repData.mobile, 'Phone Number')
            }]
        });
    }

    html += `
        </div>
    </div>
    `;

    return html;
}

    try {
        console.log('OUTPUT:', obRenderDocumentChecklistHtml(false).substring(0, 50));
    } catch(e) {
        console.error('ERROR RENDER:', e);
    }
