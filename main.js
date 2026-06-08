const icons = {
    formation: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`,
    secretarial: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    accounting: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    tax: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    advisory: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    private: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    fund: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    digital: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
};

const services = [
    { name: "Company Formation", icon: icons.formation, desc: "End-to-end entity structuring and multi-jurisdictional registration services." },
    { name: "Corporate Secretarial", icon: icons.secretarial, desc: "Maintaining uncompromising governance and statutory compliance standards." },
    { name: "Accounting & Payroll", icon: icons.accounting, desc: "Precision financial management with automated global reporting cycles." },
    { name: "Tax Compliance", icon: icons.tax, desc: "Strategic tax optimization within international regulatory frameworks." },
    { name: "Business Advisory", icon: icons.advisory, desc: "Intelligence-driven strategy and operational excellence consulting." },
    { name: "Private Client Services", icon: icons.private, desc: "Discrete wealth structuring and residency planning for global citizens." },
    { name: "Fund Administration", icon: icons.fund, desc: "Institutional-grade administration for complex investment structures." },
    { name: "Digital Lab", icon: icons.digital, desc: "Innovative fintech infrastructure and digital transformation solutions." }
];

async function init() {
    const grid = document.getElementById('services-grid');
    const journeyContainer = document.getElementById('journey-container');
    const journeyProgressBar = document.getElementById('journey-progress-bar');
    const timelineProgress = document.getElementById('timeline-progress');
    const timelineContainer = document.querySelector('.timeline-container') || document.querySelector('.process-section');

    // 1. Inject Services
    if (grid) {
        services.forEach((service, i) => {
            const cleanName = service.name.replace(/^(SG|HK)\s*[-–—]?\s*/i, '');
            const el = document.createElement('div');
            el.className = 'service-card';
            el.innerHTML = `
                <div class="card-icon">${service.icon}</div>
                <div class="card-header">
                    <h3 class="card-title">${cleanName}</h3>
                    <p class="card-desc">${service.desc}</p>
                </div>
                <div class="card-cta">
                    <div class="cta-line"></div>
                    <span>Learn More</span>
                </div>
            `;
            grid.appendChild(el);
        });
    }

    // 2. Intersection Observer for Reveals
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                if (entry.target.classList.contains('service-card') || entry.target.classList.contains('journey-card')) {
                    entry.target.classList.add('revealed');
                }
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.service-card, .journey-card').forEach(item => {
        revealObserver.observe(item);
    });

    // 2.1 Journey Progress Logic
    if (journeyContainer && journeyProgressBar) {
        journeyContainer.addEventListener('scroll', () => {
            const scrollLeft = journeyContainer.scrollLeft;
            const scrollWidth = journeyContainer.scrollWidth - journeyContainer.clientWidth;
            const progress = (scrollLeft / scrollWidth) * 100;
            journeyProgressBar.style.width = `${progress}%`;
        });
    }

    // 3. Scroll-Sync Logic
    const pricingSidebar = document.querySelector('.pricing-sidebar');
    const pricingSection = document.getElementById('pricing');

    function updatePricingSidebarVisibility() {
        if (window.innerWidth <= 1024 && pricingSidebar && pricingSection) {
            const rect = pricingSection.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            pricingSidebar.style.transform = isVisible ? 'translateY(0)' : 'translateY(120%)';
            pricingSidebar.style.transition = 'transform 0.3s ease';
        } else if (pricingSidebar) {
            pricingSidebar.style.transform = '';
            pricingSidebar.style.transition = '';
        }
    }

    updatePricingSidebarVisibility();

    window.addEventListener('scroll', () => {
        updatePricingSidebarVisibility();

        if (window.innerWidth <= 1024) {
            document.querySelectorAll('.timeline-item').forEach(step => step.classList.add('active'));
            return;
        }

        const processSection = document.querySelector('.process-section');
        if (processSection && timelineProgress) {
            const rect = processSection.getBoundingClientRect();
            const scrollTotal = rect.height - window.innerHeight;
            let progress = 0;
            if (scrollTotal > 0) {
                progress = -rect.top / scrollTotal;
                progress = Math.max(0, Math.min(1, progress));
            }
            timelineProgress.style.height = `${progress * 100}%`;
            const steps = document.querySelectorAll('.timeline-item');
            const totalSteps = steps.length;
            if (totalSteps > 0) {
                let activeIndex = Math.floor(progress * totalSteps);
                activeIndex = Math.min(activeIndex, totalSteps - 1);
                steps.forEach((step, index) => {
                    step.classList.toggle('active', index === activeIndex);
                });
            }
        }
    });

    window.addEventListener('resize', () => {
        updatePricingSidebarVisibility();
        if (window.innerWidth <= 1024) {
            document.querySelectorAll('.timeline-item').forEach(step => step.classList.add('active'));
        }
    });

    if (window.innerWidth <= 1024) {
        document.querySelectorAll('.timeline-item').forEach(step => step.classList.add('active'));
    }

    // 4. Chatbot Window Toggle
    const chatbotTrigger = document.getElementById('chatbot-trigger');
    const chatWindow = document.getElementById('chat-window');
    const headerClose = document.querySelector('.header-close');

    if (chatbotTrigger && chatWindow) {
        const openChat = () => {
            chatbotTrigger.classList.add('active');
            chatWindow.classList.add('open');
        };

        chatbotTrigger.addEventListener('click', () => {
            chatbotTrigger.classList.toggle('active');
            chatWindow.classList.toggle('open');
        });

        const pricingGetStarted = document.getElementById('pricing-get-started');
        if (pricingGetStarted) {
            pricingGetStarted.addEventListener('click', openChat);
        }

        document.querySelectorAll('.btn-inc-now').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openChat();
            });
        });

        if (headerClose) {
            headerClose.addEventListener('click', (e) => {
                e.stopPropagation();
                chatbotTrigger.classList.remove('active');
                chatWindow.classList.remove('open');
            });
        }

        // 4b. Chatbot AI Logic
        const chatInput = document.querySelector('.chat-input');
        const sendIcon = document.querySelector('.send-icon');
        const chatBody = document.querySelector('.chat-body');

        if (chatInput && sendIcon && chatBody) {
            const handleSendMessage = () => {
                const message = chatInput.value.trim();
                if (message) {
                    appendMessage('user', message);
                    chatInput.value = '';
                    generateAIResponse(message);
                }
            };

            const appendMessage = (sender, text) => {
                const messageGroup = document.createElement('div');
                messageGroup.className = 'message-group' + (sender === 'user' ? ' user-message' : '');
                
                messageGroup.innerHTML = `
                    ${sender === 'bot' ? '<div class="bot-avatar">G</div>' : ''}
                    <div class="messages">
                        <div class="msg-bubble">${text}</div>
                    </div>
                    ${sender === 'user' ? '<div class="user-avatar">U</div>' : ''}
                `;
                
                chatBody.appendChild(messageGroup);
                chatBody.scrollTop = chatBody.scrollHeight;
            };

            const generateAIResponse = (userMessage) => {
                const lowerMsg = userMessage.toLowerCase();
                let response = "I'm not sure about that, but I can certainly find out for you. Would you like to speak with a consultant?";
                
                if (lowerMsg.includes('pricing') || lowerMsg.includes('cost')) {
                    response = "Our base incorporation package starts at SGD 1,315. You can customize it with various add-ons in the Pricing section!";
                } else if (lowerMsg.includes('service') || lowerMsg.includes('what do you do')) {
                    response = "We offer a range of services including Company Formation, Tax Compliance, Accounting, and Business Advisory. Which one interests you?";
                } else if (lowerMsg.includes('contact') || lowerMsg.includes('email') || lowerMsg.includes('call')) {
                    response = "You can reach us at contact@globalisor.com or call us at +65 6XXX XXXX. Would you like me to schedule a callback?";
                } else if (lowerMsg.includes('hi') || lowerMsg.includes('hello')) {
                    response = "Hello! How can Globalisor help you expand your business today?";
                }

                // Simulate "typing" delay
                setTimeout(() => {
                    appendMessage('bot', response);
                }, 800);
            };

            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendMessage();
            });

            sendIcon.addEventListener('click', handleSendMessage);
        }
    }

    // 5. Interactive Pricing Logic
    const addonCards = document.querySelectorAll('.addon-card');
    const breakdownContainer = document.getElementById('price-breakdown');
    const finalTotalDisplay = document.getElementById('final-total');
    let basePrice = 1315;
    let selectedAddons = new Map();

    function updatePrice() {
        let total = basePrice;
        let html = `
            <div class="breakdown-item">
                <span>Base Package</span>
                <span>SGD 1,315</span>
            </div>
        `;

        selectedAddons.forEach((price, name) => {
            total += price;
            html += `
                <div class="breakdown-item">
                    <span>${name}</span>
                    <span>SGD ${price.toLocaleString()}</span>
                </div>
            `;
        });

        if (breakdownContainer) breakdownContainer.innerHTML = html;
        if (finalTotalDisplay) {
            finalTotalDisplay.innerText = `SGD ${total.toLocaleString()}`;
            finalTotalDisplay.style.transform = 'scale(1.05)';
            setTimeout(() => finalTotalDisplay.style.transform = 'scale(1)', 100);
        }
    }

    addonCards.forEach(card => {
        card.addEventListener('click', () => {
            const name = card.getAttribute('data-name');
            const price = parseInt(card.getAttribute('data-price'));

            if (selectedAddons.has(name)) {
                selectedAddons.delete(name);
                card.classList.remove('selected');
            } else {
                selectedAddons.set(name, price);
                card.classList.add('selected');
            }
            updatePrice();
        });
    });

    // 4. Interactive Services Logic
    const nodePositioners = document.querySelectorAll('.node-positioner');
    const activeTitleDisplay = document.getElementById('active-title');
    const activeDescDisplay = document.getElementById('active-desc');
    const activeFeaturesDisplay = document.getElementById('active-features');
    const hubContent = document.getElementById('hub-content');
    
    const servicesData = [
        {
            title: "Company Formation",
            icon: "🌍",
            description: "Establish your global presence. Know the cross border regulations before you take the plunge.",
            features: [
                { title: "REGISTERED OFFICE ADDRESS", desc: "All companies must have a local registered address. We will provide you with one in Central Business District." },
                { title: "NOMINEE DIRECTOR", desc: "At least one of your directors has to be a Singapore resident. If you do not have one, you could hire a Nominee." },
                { title: "SECRETARY", desc: "Each company must appoint a secretary to maintain statutory records and ensure compliances with Companies Act." }
            ]
        },
        {
            title: "Corporate Secretarial",
            icon: "📜",
            description: "Focused on seamless compliance. We manage your board meetings, ADR, and annual filings so you can focus on growth.",
            features: [
                { title: "BOARD MANAGEMENT", desc: "We organize and manage all required board meetings to keep your company fully compliant." },
                { title: "ANNUAL FILINGS", desc: "Timely preparation and filing of annual returns with regulatory bodies." },
                { title: "STATUTORY RECORDS", desc: "Maintenance of all required registers and statutory records for your business." }
            ]
        },
        {
            title: "Accounting & Payroll",
            icon: "📉",
            description: "Timely management reporting for critical decision-making. Full-cycle bookkeeping, statutory audit, and payroll management.",
            features: [
                { title: "BOOKKEEPING", desc: "Accurate and timely recording of all financial transactions." },
                { title: "PAYROLL", desc: "Complete payroll processing including tax calculations and statutory contributions." },
                { title: "AUDIT SUPPORT", desc: "Preparation of financial statements and seamless coordination with external auditors." }
            ]
        },
        {
            title: "Tax Compliance",
            icon: "⚖️",
            description: "Optimize your tax profile with favorable structures. Expert handling of Corporate Tax, GST/VAT, and Transfer Pricing.",
            features: [
                { title: "CORPORATE TAX", desc: "Strategic tax planning and timely filing of corporate tax returns." },
                { title: "GST/VAT", desc: "Registration, calculation, and periodic filing of consumption taxes." },
                { title: "TRANSFER PRICING", desc: "Ensuring all inter-company transactions meet local and international tax standards." }
            ]
        },
        {
            title: "Business Advisory",
            icon: "🤝",
            description: "Strategic advice for inorganic growth. Specializing in M&A transactions under $20M, valuations, and fundraising.",
            features: [
                { title: "M&A SUPPORT", desc: "End-to-end guidance on mergers, acquisitions, and restructuring." },
                { title: "VALUATION", desc: "Accurate business valuation services for transactions or regulatory requirements." },
                { title: "FUNDRAISING", desc: "Assistance in preparing pitch decks and connecting with potential investors." }
            ]
        },
        {
            title: "Private Client Services",
            icon: "💎",
            description: "Structured solutions for global HNIs and family offices. Expert guidance on VCC structures in Singapore.",
            features: [
                { title: "FAMILY OFFICE", desc: "Setup and management of single or multi-family office structures." },
                { title: "WEALTH STRUCTURING", desc: "Creating robust trusts and foundations for asset protection." },
                { title: "VCC SETUP", desc: "End-to-end formation of Variable Capital Companies for funds." }
            ]
        },
        {
            title: "Fund Administration",
            icon: "🏦",
            description: "Management of non-core activities for funds, including investor liaison, compliance management, and fund accounting.",
            features: [
                { title: "FUND ACCOUNTING", desc: "NAV calculations and comprehensive financial reporting for your funds." },
                { title: "INVESTOR RELATIONS", desc: "Managing investor onboarding, capital calls, and distributions." },
                { title: "COMPLIANCE", desc: "Ensuring adherence to AML/KYC and all regulatory requirements." }
            ]
        },
        {
            title: "Digital Lab",
            icon: "💻",
            description: "The innovation hub for I.T. and startups. Co-creation, startup industry landscaping, and growth hacking strategies.",
            features: [
                { title: "IT STRATEGY", desc: "Aligning your technological infrastructure with long-term business goals." },
                { title: "GROWTH HACKING", desc: "Implementing rapid experimentation to identify optimal growth channels." },
                { title: "STARTUP MENTORSHIP", desc: "Guidance on product-market fit, scaling, and market positioning." }
            ]
        }
    ];

    const serviceSVGs = {
        "Company Formation": `
            <svg viewBox="0 0 350 150" class="explainer-formation-svg">
                <line x1="10" y1="140" x2="340" y2="140" stroke="#e2e8f0" stroke-width="2" />
                <g class="building b-small">
                    <rect x="40" y="80" width="40" height="60" fill="#f1f5f9" />
                    <polygon points="35,80 60,60 85,80" fill="#4b9a9d" />
                    <rect x="55" y="110" width="10" height="30" fill="#334155" />
                </g>
                <g class="building b-medium">
                    <rect x="110" y="60" width="80" height="80" fill="#f1f5f9" />
                    <polygon points="100,60 150,30 200,60" fill="#4b9a9d" />
                </g>
                <g class="building b-large">
                    <rect x="230" y="40" width="80" height="100" fill="#f1f5f9" />
                    <polygon points="220,40 270,10 320,40" fill="#4b9a9d" />
                </g>
            </svg>
        `,
        "Corporate Secretarial": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <rect x="30" y="25" width="40" height="55" rx="2" stroke="#298486" stroke-width="1.5" fill="none" class="draw-path" />
                <line x1="38" y1="40" x2="62" y2="40" stroke="#cbd5e1" stroke-width="1.5" class="draw-line-1" />
                <line x1="38" y1="50" x2="62" y2="50" stroke="#cbd5e1" stroke-width="1.5" class="draw-line-2" />
                <line x1="38" y1="60" x2="50" y2="60" stroke="#cbd5e1" stroke-width="1.5" class="draw-line-3" />
                <path d="M65 70 L80 50" stroke="#4b9a9d" stroke-width="2" class="anim-pen" />
            </svg>
        `,
        "Accounting & Payroll": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <rect x="20" y="65" width="12" height="15" fill="#298486" class="bar-grow-1" />
                <rect x="40" y="45" width="12" height="35" fill="#4b9a9d" class="bar-grow-2" />
                <rect x="60" y="55" width="12" height="25" fill="#298486" class="bar-grow-3" />
                <path d="M15 70 Q 40 30, 85 40" stroke="#6a6aed" stroke-width="2" fill="none" class="draw-path" />
            </svg>
        `,
        "Tax Compliance": `
            <svg viewBox="0 0 350 150" class="explainer-tax-svg">
                <g class="tax-doc">
                    <rect x="130" y="20" width="90" height="110" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" />
                </g>
                <g class="tax-stamp">
                    <circle cx="175" cy="75" r="30" fill="none" stroke="#10b981" stroke-width="4" stroke-dasharray="6 4" class="stamp-circle" />
                    <path d="M 160 75 L 170 85 L 190 60" fill="none" stroke="#10b981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                </g>
                <circle cx="100" cy="50" r="12" fill="none" stroke="#3b82f6" stroke-width="4" stroke-dasharray="5 3" class="tax-gear g1" />
            </svg>
        `,
        "Business Advisory": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <circle cx="35" cy="50" r="15" stroke="#298486" stroke-width="1.5" fill="none" />
                <circle cx="65" cy="50" r="15" stroke="#4b9a9d" stroke-width="1.5" fill="none" />
                <circle cx="50" cy="50" r="5" fill="#6a6aed" class="pulse-ring" />
                <path d="M10 50 H20 M80 50 H90 M50 10 V20 M50 80 V90" stroke="#cbd5e1" stroke-width="1" class="rotate-inf" />
            </svg>
        `,
        "Private Client Services": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <path d="M50 25 L75 45 L65 75 L35 75 L25 45 Z" fill="none" stroke="#6a6aed" stroke-width="1.5" class="draw-path" />
                <path d="M25 45 H75 M35 75 L50 25 L65 75" stroke="#6a6aed" stroke-width="1" opacity="0.4" />
                <circle cx="50" cy="50" r="2" fill="#6a6aed" class="sparkle" />
            </svg>
        `,
        "Fund Administration": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <!-- Background Orbits -->
                <circle cx="50" cy="50" r="38" stroke="#e2e8f0" stroke-width="0.5" fill="none" stroke-dasharray="4 4" />
                <circle cx="50" cy="50" r="28" stroke="#e2e8f0" stroke-width="0.5" fill="none" stroke-dasharray="4 4" />
                
                <!-- Central Hub Node -->
                <g class="anim-bank">
                    <rect x="38" y="48" width="24" height="18" fill="#f8fafc" stroke="#298486" stroke-width="1.2" />
                    <path d="M34 48 L50 34 L66 48" fill="#298486" />
                    <rect x="47" y="58" width="6" height="8" fill="#334155" />
                </g>

                <!-- Dynamic Data Points -->
                <g class="move-orbit-slow">
                    <circle cx="88" cy="50" r="3.5" fill="#6a6aed" />
                    <rect x="80" y="32" width="16" height="6" rx="1" fill="#6a6aed" opacity="0.2" />
                    <text x="88" y="37" font-size="4" text-anchor="middle" fill="#6a6aed" font-weight="bold" font-family="Outfit">NAV</text>
                </g>
                
                <g class="move-orbit-fast">
                    <circle cx="12" cy="50" r="3.5" fill="#4b9a9d" />
                    <rect x="4" y="32" width="16" height="6" rx="1" fill="#4b9a9d" opacity="0.2" />
                    <text x="12" y="37" font-size="4" text-anchor="middle" fill="#4b9a9d" font-weight="bold" font-family="Outfit">KYC</text>
                </g>

                <g class="move-orbit-mid">
                    <circle cx="50" cy="12" r="3.5" fill="#298486" />
                    <text x="50" y="8" font-size="4" text-anchor="middle" fill="#298486" font-weight="bold" font-family="Outfit">AML</text>
                </g>
            </svg>
        `,
        "Digital Lab": `
            <svg viewBox="0 0 100 100" class="explainer-svg">
                <rect x="25" y="35" width="50" height="35" rx="2" stroke="#334155" stroke-width="1.5" fill="none" />
                <rect x="30" y="40" width="40" height="25" fill="#f1f5f9" />
                <path d="M40 70 L35 75 H65 L60 70" fill="#334155" />
                <path d="M45 45 L55 55 M55 45 L45 55" stroke="#298486" stroke-width="1" class="blink-code" />
            </svg>
        `
    };

    let typewriterInterval;
    function typeText(element, text) {
        clearInterval(typewriterInterval);
        element.innerHTML = '';
        let i = 0;
        typewriterInterval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(typewriterInterval);
            }
        }, 25);
    }

    nodePositioners.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            const service = servicesData[index];
            
            if (service && !item.classList.contains('active')) {
                nodePositioners.forEach(node => {
                    node.classList.remove('active');
                    node.querySelector('.circle-node').classList.remove('active');
                    node.querySelector('.node-label').classList.remove('active');
                    const glow = node.querySelector('.node-glow');
                    if (glow) glow.remove();
                });
                
                item.classList.add('active');
                item.querySelector('.circle-node').classList.add('active');
                item.querySelector('.node-label').classList.add('active');
                
                const glow = document.createElement('span');
                glow.className = 'node-glow';
                item.querySelector('.circle-node').appendChild(glow);
                
                hubContent.innerHTML = serviceSVGs[service.title] || '';
                const cleanTitle = service.title.replace(/^(SG|HK)\s*[-–—]?\s*/i, '');
                activeTitleDisplay.innerText = cleanTitle;
                typeText(activeDescDisplay, service.description);
                
                activeFeaturesDisplay.innerHTML = service.features.map((f, idx) => `
                    <div class="service-feature-item" style="animation-delay: ${idx * 0.15}s">
                        <div class="feature-card-inner">
                            <h4 class="feature-title">${f.title}</h4>
                            <p class="feature-desc">${f.desc}</p>
                        </div>
                    </div>
                `).join('');
            }
        });
    });

    // 6. Terms Accordion
    document.querySelectorAll('.terms-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.parentElement;
            item.classList.toggle('open');
        });
    });

    // 7. Hero Typewriter Animation
    const typewriterElement = document.getElementById('typewriter-text');
    const heroWords = ["Global.", "Digital.", "Compliance.", "Beyond."];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 150;

    function type() {
        const currentWord = heroWords[wordIndex];
        if (isDeleting) {
            typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50;
        } else {
            typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 150;
        }

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typeSpeed = 2000;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % heroWords.length;
            typeSpeed = 500;
        }
        setTimeout(type, typeSpeed);
    }
    if (typewriterElement) type();

    // 8. Service Selection System Logic
    const statusCards = document.querySelectorAll('.status-card');
    const servicesStep = document.getElementById('services-step');
    const statusStep = document.getElementById('status-step');
    const servicesGrid = document.getElementById('interactive-services-grid');
    const backBtn = document.querySelector('.btn-back-step');
    const summaryBar = document.getElementById('selection-summary-bar');
    const selectedCountBadge = document.getElementById('selected-count');
    const selectedNamesText = document.getElementById('selected-services-names');
    const clearBtn = document.querySelector('.btn-clear-selection');
    const dropdownOptions = document.getElementById('dropdown-options');

    const allServices = [
        { id: 'inc-local', name: 'Incorporation for Locals', category: 'Incorporation', icon: 'building', desc: 'Fast-track registration for Singapore citizens and PRs.' },
        { id: 'inc-foreign', name: 'Incorporation for Foreigners', category: 'Incorporation', icon: 'globe', desc: 'Specialized setup for international entrepreneurs and offshore entities.' },
        { id: 'accounting', name: 'Accounting & Bookkeeping', category: 'Finance', icon: 'calculator', desc: 'Precision financial records and monthly management reporting.' },
        { id: 'payroll', name: 'Payroll Services', category: 'Finance', icon: 'users', desc: 'Automated salary processing and statutory CPF contributions.' },
        { id: 'secretary', name: 'Corporate Secretary', category: 'Compliance', icon: 'file-check', desc: 'Mandatory statutory compliance and ACRA filing management.' },
        { id: 'visas', name: 'Visas & Immigration', category: 'Operations', icon: 'passport', desc: 'Employment Pass and dependent visa application support.' },
        { id: 'address', name: 'Registered Address', category: 'Operations', icon: 'map-pin', desc: 'Premium CBD address and digital mailroom solutions.' },
        { id: 'director', name: 'Nominee Director', category: 'Compliance', icon: 'user-check', desc: 'Local resident director service for foreign-owned companies.' }
    ];

    const statusMapping = {
        'new': ['inc-local', 'inc-foreign', 'director', 'address', 'secretary'],
        'existing': ['accounting', 'payroll', 'secretary', 'address', 'visas'],
        'client': ['visas', 'payroll', 'accounting', 'director']
    };

    let currentSelectedServices = new Set();

    function renderServices(status) {
        const allowedIds = statusMapping[status];
        const filteredServices = allServices.filter(s => allowedIds.includes(s.id));
        
        servicesGrid.innerHTML = filteredServices.map(service => {
             const cleanName = service.name.replace(/^(SG|HK)\s*[-–—]?\s*/i, '');
             return `
             <div class="service-select-card ${currentSelectedServices.has(service.id) ? 'selected' : ''}" data-id="${service.id}">
                 <div class="service-select-icon">
                     <i data-lucide="${service.icon}" class="w-5 h-5"></i>
                 </div>
                 <h3 class="service-select-title">${cleanName}</h3>
                 <p class="service-select-desc">${service.desc}</p>
             </div>
             `;
         }).join('');

        if (window.lucide) window.lucide.createIcons();

        document.querySelectorAll('.service-select-card').forEach(card => {
            card.addEventListener('click', () => toggleService(card.getAttribute('data-id')));
        });

        renderDropdown(filteredServices);
    }

    function renderDropdown(filteredServices) {
        if (!dropdownOptions) return;
        const groups = {};
        filteredServices.forEach(s => {
            if (!groups[s.category]) groups[s.category] = [];
            groups[s.category].push(s);
        });

        let html = '';
        for (const [category, items] of Object.entries(groups)) {
            html += `<div class="quick-select-group-label">${category}</div>`;
             items.forEach(item => {
                 const cleanName = item.name.replace(/^(SG|HK)\s*[-–—]?\s*/i, '');
                 html += `<div class="quick-select-dropdown-item" data-id="${item.id}">${cleanName}</div>`;
             });
        }
        dropdownOptions.innerHTML = html;

        document.querySelectorAll('.quick-select-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleService(item.getAttribute('data-id'));
            });
        });
    }

    function toggleService(id) {
        if (currentSelectedServices.has(id)) {
            currentSelectedServices.delete(id);
        } else {
            currentSelectedServices.add(id);
        }
        updateUI();
    }

    function updateUI() {
        document.querySelectorAll('.service-select-card').forEach(card => {
            const id = card.getAttribute('data-id');
            card.classList.toggle('selected', currentSelectedServices.has(id));
        });

        const count = currentSelectedServices.size;
        selectedCountBadge.innerText = count;
        
        if (count > 0) {
            summaryBar.classList.add('active');
            const names = Array.from(currentSelectedServices)
                .map(id => allServices.find(s => s.id === id).name)
                .join(' + ');
            selectedNamesText.innerText = names;
        } else {
            summaryBar.classList.remove('active');
            selectedNamesText.innerText = 'None selected yet';
        }
    }

    statusCards.forEach(card => {
        card.addEventListener('click', () => {
            const status = card.dataset.status;
            
            if (status === 'new') {
                const token = localStorage.getItem('token');
                if (token) {
                    window.location.href = '/requirements.html';
                } else {
                    window.location.href = '/auth.html';
                }
                return;
            }

            if (status === 'existing') {
                window.location.href = '/onboarding.html?flow=existing-co';
                return;
            }

            if (status === 'client') {
                window.location.href = '/onboarding.html?flow=client';
                return;
            }

            statusCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            statusStep.classList.add('hidden');
            servicesStep.classList.remove('hidden');
            setTimeout(() => {
                servicesStep.classList.remove('opacity-0', 'translate-y-10');
            }, 50);

            renderServices(status);
        });
    });

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            servicesStep.classList.add('opacity-0', 'translate-y-10');
            setTimeout(() => {
                servicesStep.classList.add('hidden');
                statusStep.classList.remove('hidden');
            }, 500);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentSelectedServices.clear();
            updateUI();
        });
    }

    // 9. Dynamic Blog System
    const DEFAULT_BLOGS = [
        {
            id: "default-incorporation",
            title: "Navigating Singapore Startup Incorporation",
            category: "Compliance",
            excerpt: "A complete step-by-step walkthrough on incorporation requirements, nominee directors, and local secretarial guidelines.",
            description: "A complete step-by-step walkthrough on incorporation requirements, nominee directors, and local secretarial guidelines.",
            content: "<p>Incorporating a startup in Singapore is a popular choice for founders globally due to the country's business-friendly policies, attractive tax structures, and robust intellectual property protections.</p><p>In this guide, we cover structural setups, ACRA requirements, nominee directors, and statutory registration processes to get you running in hours.</p>",
            coverImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
            author: "Admin Team",
            date: "28 May 2026",
            status: "published",
            published: true
        },
        {
            id: "default-tax",
            title: "Understanding Corporate Tax Benefits & Rates",
            category: "Corporate Tax",
            excerpt: "Learn how the single-tier territorial tax system and startup exemptions can optimize your company's effective tax liability.",
            description: "Learn how the single-tier territorial tax system and startup exemptions can optimize your company's effective tax liability.",
            content: "<p>Singapore corporate tax rates are capped flat at 17%. Thanks to tax exemptions for new startups and partial tax exemptions, the effective tax rate is often significantly lower.</p>",
            coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c",
            author: "Tax Advisory",
            date: "24 May 2026",
            status: "published",
            published: true
        }
    ];

    async function initBlogs() {
        const grid = document.getElementById('landing-blog-grid');
        if (!grid) return;

        let blogsList = [];
        try {
            const res = await fetch('/api/blogs');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                blogsList = data;
            } else {
                throw new Error("No blogs returned from API");
            }
        } catch (e) {
            console.warn('REST API blogs endpoint offline, loading from localStorage fallback:', e);
            const cached = localStorage.getItem('admin_blogs');
            if (cached === null) {
                blogsList = DEFAULT_BLOGS;
            } else {
                try {
                    blogsList = JSON.parse(cached);
                    if (!Array.isArray(blogsList)) {
                        blogsList = DEFAULT_BLOGS;
                    }
                } catch(err) {
                    blogsList = DEFAULT_BLOGS;
                }
            }
        }

        window.landingBlogsList = blogsList;
        
        const getBlogTime = (b) => {
            if (b.lastModified) return b.lastModified;
            if (b.date) {
                const parsed = Date.parse(b.date);
                if (!isNaN(parsed)) return parsed;
            }
            return 0;
        };
        blogsList.sort((a, b) => getBlogTime(b) - getBlogTime(a));

        const publishedBlogs = blogsList.filter(b => b.published || b.status === 'published').slice(0, 3);

        if (publishedBlogs.length === 0) {
            grid.innerHTML = '<p class="text-slate-400 text-center col-span-full py-12">No updates published yet. Stay tuned!</p>';
            return;
        }

        grid.innerHTML = publishedBlogs.map(blog => {
            const displayTitle = blog.publishedTitle || blog.title;
            const displayExcerpt = blog.publishedExcerpt || blog.description || blog.excerpt || '';
            const displayCoverImage = blog.publishedCoverImage || blog.coverImage || '';
            
            return `
            <div onclick="window.openLandingBlogDetail('${blog.id}')" class="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] transition-all duration-500 cursor-pointer">
                ${displayCoverImage ? `
                <div class="h-56 bg-slate-100 relative overflow-hidden">
                    <img src="${displayCoverImage}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                    <div class="absolute top-6 left-6">
                        <span class="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                            ${blog.category}
                        </span>
                    </div>
                </div>
                ` : ''}
                <div class="p-8">
                    <div class="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                        ${!displayCoverImage ? `
                        <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">
                            ${blog.category}
                        </span>
                        ` : ''}
                        <div class="flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>${blog.date || new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">${displayTitle}</h3>
                    <p class="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6">${displayExcerpt}</p>
                    <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                        Read Full Insight 
                        <svg class="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }
    initBlogs();

    window.openLandingBlogDetail = function(id) {
        const blog = (window.landingBlogsList || []).find(b => b.id === id);
        if (!blog) return;

        const modal = document.getElementById('landing-blog-modal');
        const body = document.getElementById('landing-blog-modal-body');
        if (!modal || !body) return;

        const displayTitle = blog.publishedTitle || blog.title;
        const displayExcerpt = blog.publishedExcerpt || blog.description || blog.excerpt || '';
        const displayCoverImage = blog.publishedCoverImage || blog.coverImage || '';
        const displayContent = blog.publishedContent || blog.content || displayExcerpt;

        body.innerHTML = `
            <div class="max-h-[90vh] overflow-y-auto custom-scroll">
                ${displayCoverImage ? `
                <div class="w-full bg-white border-b border-slate-100/80 flex items-center justify-center p-6 relative">
                    <img src="${displayCoverImage}" class="max-w-full h-auto block rounded-2xl shadow-sm border border-slate-50" style="max-height: 420px; object-fit: contain;">
                    <button onclick="event.stopPropagation(); window.closeLandingBlogModal()" class="absolute top-6 right-6 w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-600 transition-all cursor-pointer border border-slate-200 shadow-sm z-20" title="Close details">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                ` : `
                <div class="p-6 flex justify-end">
                    <button onclick="event.stopPropagation(); window.closeLandingBlogModal()" class="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-600 transition-all cursor-pointer border border-slate-200 shadow-sm" title="Close details">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                `}
                
                <div class="p-8 md:p-12">
                    <div class="flex flex-wrap gap-3 mb-8">
                        <span class="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">${blog.category || 'Blogs'}</span>
                        <span class="px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-100">${blog.date || new Date().toLocaleDateString('en-SG', {day: '2-digit', month: 'long', year: 'numeric'})}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">${displayTitle}</h2>
                    <div class="prose prose-slate max-w-none text-slate-600 leading-[1.8] text-lg space-y-6">
                        <p class="font-bold text-slate-900 text-xl leading-relaxed">${displayExcerpt}</p>
                        <div class="h-px bg-slate-100 my-10"></div>
                        <div class="whitespace-pre-wrap">${displayContent}</div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.querySelector('#landing-blog-modal-content').classList.remove('scale-95');
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeLandingBlogModal = function() {
        const modal = document.getElementById('landing-blog-modal');
        if (!modal) return;
        modal.classList.add('pointer-events-none', 'opacity-0');
        modal.querySelector('#landing-blog-modal-content').classList.add('scale-95');
    };
 
    // 10. Global Presence Map Logic (Futuristic Fintech D3 Globe)
    const DEFAULT_COUNTRIES = [
        { id: "CNTRY-singapore", name: "Singapore", code: "SG", uen: "9-character alphanumeric", tax: "17% (flat rate)", compliance: "99.5%", status: "ACTIVE", basePrice: 1315, priceSecretary: 900, priceDirector: 3000, priceAddress: 600, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"] },
        { id: "CNTRY-hong-kong", name: "Hong Kong", code: "HK", uen: "8-digit registration no.", tax: "16.5% (two-tier)", compliance: "98.8%", status: "ACTIVE", basePrice: 1650, priceSecretary: 800, priceDirector: 2500, priceAddress: 500, priceTax: 1200, priceBank: 400, services: ["Company Incorporation", "Corporate Secretary", "Office Address", "Tax & Compliance"] },
        { id: "CNTRY-united-states", name: "United States", code: "USA", uen: "9-digit EIN number", tax: "21% (federal flat)", compliance: "97.2%", status: "ACTIVE", basePrice: 1200, priceSecretary: 1000, priceDirector: 3000, priceAddress: 700, priceTax: 1500, priceBank: 500, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"] },
        { id: "CNTRY-dubai", name: "Dubai", code: "UAE", uen: "Varies by Free Zone", tax: "9% (above 375k AED)", compliance: "99.1%", status: "ACTIVE", basePrice: 2500, priceSecretary: 1200, priceDirector: 4000, priceAddress: 900, priceTax: 1800, priceBank: 600, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"] },
        { id: "CNTRY-australia", name: "Australia", code: "AUS", uen: "9-digit ACN number", tax: "25% - 30%", compliance: "96.8%", status: "ACTIVE", basePrice: 1400, priceSecretary: 950, priceDirector: 3100, priceAddress: 650, priceTax: 1600, priceBank: 550, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"] },
        { id: "CNTRY-united-kingdom", name: "United Kingdom", code: "UK", uen: "8-digit CRN number", tax: "19% - 25%", compliance: "98.5%", status: "ACTIVE", basePrice: 1300, priceSecretary: 850, priceDirector: 2800, priceAddress: 550, priceTax: 1400, priceBank: 450, services: ["Company Incorporation", "Corporate Secretary", "Nominee Director", "Office Address", "Tax & Compliance"] }
    ];

    let countriesList = [];
    try {
        const res = await fetch('/api/countries');
        if (res.ok) {
            countriesList = await res.json();
        } else {
            throw new Error("HTTP error " + res.status);
        }
    } catch (e) {
        console.warn('API error, falling back to static/localStorage:', e);
        const _cachedCountries = localStorage.getItem('admin_countries');
        
        const getMappedDefaultCountries = () => DEFAULT_COUNTRIES.map(c => {
            const newC = { ...c, published: true };
            newC.publishedData = {
                name: c.name,
                code: c.code,
                uen: c.uen,
                tax: c.tax,
                compliance: c.compliance,
                services: c.services ? [...c.services] : [],
                basePrice: c.basePrice,
                priceSecretary: c.priceSecretary,
                priceDirector: c.priceDirector,
                priceAddress: c.priceAddress,
                priceTax: c.priceTax,
                priceBank: c.priceBank,
                customPrices: c.customPrices ? {...c.customPrices} : {}
            };
            return newC;
        });

        if (_cachedCountries === null) {
            countriesList = getMappedDefaultCountries();
            localStorage.setItem('admin_countries', JSON.stringify(countriesList));
        } else {
            try {
                countriesList = JSON.parse(_cachedCountries);
                const isInvalid = !Array.isArray(countriesList) || countriesList.length === 0 || countriesList.some(c => !c.id || c.basePrice === undefined || c.services === undefined);
                if (isInvalid) {
                    throw new Error("Outdated cache format");
                }
            } catch(err) {
                countriesList = getMappedDefaultCountries();
                localStorage.setItem('admin_countries', JSON.stringify(countriesList));
            }
        }
    }

    function getPublishedCountry(c) {
        if (!c.publishedData || Object.keys(c.publishedData).length === 0) return c;
        return {
            ...c,
            name: c.publishedData.name !== undefined ? c.publishedData.name : c.name,
            code: c.publishedData.code !== undefined ? c.publishedData.code : c.code,
            uen: c.publishedData.uen !== undefined ? c.publishedData.uen : c.uen,
            tax: c.publishedData.tax !== undefined ? c.publishedData.tax : c.tax,
            compliance: c.publishedData.compliance !== undefined ? c.publishedData.compliance : c.compliance,
            services: c.publishedData.services !== undefined ? c.publishedData.services : c.services,
            basePrice: c.publishedData.basePrice !== undefined ? c.publishedData.basePrice : c.basePrice,
            priceSecretary: c.publishedData.priceSecretary !== undefined ? c.publishedData.priceSecretary : c.priceSecretary,
            priceDirector: c.publishedData.priceDirector !== undefined ? c.publishedData.priceDirector : c.priceDirector,
            priceAddress: c.publishedData.priceAddress !== undefined ? c.publishedData.priceAddress : c.priceAddress,
            priceTax: c.publishedData.priceTax !== undefined ? c.publishedData.priceTax : c.priceTax,
            priceBank: c.publishedData.priceBank !== undefined ? c.publishedData.priceBank : c.priceBank,
            customPrices: c.publishedData.customPrices !== undefined ? c.publishedData.customPrices : c.customPrices
        };
    }

    const activeCountries = countriesList
        .filter(c => c.published === true || (c.published === undefined && c.status === 'ACTIVE'))
        .map(getPublishedCountry);

    // Dynamically inject the active country cards into the DOM
    const countriesGrid = document.querySelector('.country-chips-grid');
    if (countriesGrid) {
        countriesGrid.innerHTML = activeCountries.map(c => {
            const dataCountry = c.name.toLowerCase().replace(/\s+/g, '_');
            return `
                <div class="country-chip country-item" data-country="${dataCountry}" data-name="${c.name}" title="Click to view ${c.name} services">
                    <div class="country-chip-header">
                        <svg class="country-chip-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                    <span class="country-chip-name">${c.name}</span>
                </div>
            `;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    const countryItems = document.querySelectorAll('.country-item');
    const canvas = document.getElementById('globe-canvas');
    const mapCaption = document.getElementById('map-caption');
    const mapCaptionText = document.getElementById('map-caption-text');
 
    if (canvas && window.d3 && window.topojson) {
        const ctx = canvas.getContext('2d');
        let width = canvas.offsetWidth || 450;
        let height = canvas.offsetHeight || 450;
 
        // Set canvas resolution for HD rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
 
        // Define Orthographic projection
        const projection = d3.geoOrthographic()
            .scale(width / 2.1)
            .translate([width / 2, height / 2])
            .clipAngle(90);
 
        const path = d3.geoPath(projection, ctx);
        const graticule = d3.geoGraticule();
 
        let worldData = null;
        let countries = [];
         
        // Coordinates for centering countries
        const countryCoords = {
            'singapore': [103.8198, 1.3521],
            'hong_kong': [114.1694, 22.3193],
            'usa': [-95.7129, 37.0902],
            'united_states': [-95.7129, 37.0902],
            'united_states_of_america': [-95.7129, 37.0902],
            'dubai': [55.2708, 25.2048],
            'united_arab_emirates': [55.2708, 25.2048],
            'uae': [55.2708, 25.2048],
            'australia': [133.7751, -25.2744],
            'uk': [-1.1743, 52.3555],
            'united_kingdom': [-1.1743, 52.3555],
            'indonesia': [113.9213, -0.7893],
            'malaysia': [101.9758, 4.2105],
            'india': [78.9629, 20.5937],
            'vietnam': [108.2772, 14.0583],
            'thailand': [100.9925, 15.8700],
            'philippines': [121.7740, 12.8797],
            'japan': [138.2529, 36.2048],
            'germany': [10.4515, 51.1657],
            'france': [2.2137, 46.2276],
            'canada': [-106.3468, 56.1304]
        };
 
        // Network connections dynamically drawn from Singapore to all active countries
        const connections = [];
        activeCountries.forEach((c, idx) => {
            const key = c.name.toLowerCase().replace(/\s+/g, '_');
            if (key !== 'singapore' && countryCoords[key]) {
                connections.push({
                    from: [103.8198, 1.3521], // Singapore
                    to: countryCoords[key],
                    speed: 1800 + Math.random() * 1200,
                    offset: idx * 0.15
                });
            }
        });
        // Add backup connections
        if (countryCoords['uk'] && countryCoords['usa']) {
            connections.push({
                from: countryCoords['uk'],
                to: countryCoords['usa'],
                speed: 1500,
                offset: 0.1
            });
        }
 
        // Match country name to TopoJSON IDs for highlighting
        const countryIds = {
            'singapore': 702,
            'hong_kong': 344,
            'usa': 840,
            'united_states': 840,
            'united_states_of_america': 840,
            'dubai': 784,
            'united_arab_emirates': 784,
            'uae': 784,
            'australia': 36,
            'uk': 826,
            'united_kingdom': 826,
            'indonesia': 360,
            'malaysia': 458,
            'india': 356,
            'vietnam': 704,
            'thailand': 764,
            'philippines': 608,
            'japan': 392,
            'germany': 276,
            'france': 250,
            'canada': 124
        };

        // Determine currently active country TopoJSON IDs
        const activeIds = [];
        activeCountries.forEach(c => {
            const key = c.name.toLowerCase().replace(/\s+/g, '_');
            if (countryIds[key]) {
                activeIds.push(countryIds[key]);
            }
        });
 
        // Fintech corporate map colors (Clean light slate / grey with vibrant blue highlighting)
        function getCountryColor(d) {
            const numericId = Number(d.id);
            if (activeCountryId && numericId === activeCountryId) {
                return '#2563eb'; // Deep glowing blue for active hovered country
            }
            if (activeIds.includes(numericId)) {
                return '#93c5fd'; // Soft blue for network hubs
            }
            return '#cbd5e1'; // Light grey/slate for non-hub countries
        }
 
        let rotation = [0, -15];
        let targetRotation = [0, -15];
        let currentScale = width / 2.1;
        let targetScale = width / 2.1;
        let isHovered = false;
        let activeCountryId = null;

        // Fetch World Atlas TopoJSON
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(data => {
                worldData = data;
                countries = topojson.feature(data, data.objects.countries).features;
                requestAnimationFrame(render);
            })
            .catch(err => {
                console.error('Failed to load globe data, falling back to local simulation:', err);
            });

        // Animation/Render Loop
        function render() {
            ctx.clearRect(0, 0, width, height);

            // Interpolation for rotations and scale
            if (isHovered) {
                rotation[0] += (targetRotation[0] - rotation[0]) * 0.08;
                rotation[1] += (targetRotation[1] - rotation[1]) * 0.08;
                currentScale += (targetScale - currentScale) * 0.08;
            } else {
                rotation[0] += 0.2; // Continuous slow rolling
                rotation[1] += (-15 - rotation[1]) * 0.05; // Lock tilt
                currentScale += ((width / 2.1) - currentScale) * 0.08;
            }

            projection.rotate(rotation).scale(currentScale);

            // 1. Draw Ocean (Ultra clean light blue-slate fill)
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, projection.scale(), 0, 2 * Math.PI);
            ctx.fillStyle = '#f1f5f9'; 
            ctx.fill();

            // 2. Draw Subtle Earth Grid (Graticules for high-tech grid look)
            ctx.beginPath();
            path(graticule());
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            if (countries.length > 0) {
                // 3. Draw Landmasses (Slate / light blue theme)
                countries.forEach(d => {
                    ctx.beginPath();
                    path(d);
                    ctx.fillStyle = getCountryColor(d);
                    ctx.fill();
                });

                // 4. Draw Country Borders (Subtle border for high-end feel)
                ctx.beginPath();
                countries.forEach(d => {
                    path(d);
                });
                ctx.strokeStyle = '#e2e8f0'; 
                ctx.lineWidth = 0.75;
                ctx.stroke();

                // 5. Draw Connection Lines and Animated Glowing Pulses
                connections.forEach(conn => {
                    // Draw the network arc path
                    ctx.beginPath();
                    path({ type: 'LineString', coordinates: [conn.from, conn.to] });
                    ctx.strokeStyle = 'rgba(37, 99, 235, 0.12)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Calculate interpolation along the arc
                    const interpolator = d3.geoInterpolate(conn.from, conn.to);
                    const t = (Date.now() / conn.speed + conn.offset) % 1.0;
                    const pulseCoords = interpolator(t);

                    // Check if point is on the visible front hemisphere of the globe
                    const centerCoords = projection.invert([width / 2, height / 2]);
                    const distance = d3.geoDistance(centerCoords, pulseCoords);

                    if (distance < Math.PI / 2) {
                        const pt = projection(pulseCoords);
                        ctx.beginPath();
                        ctx.arc(pt[0], pt[1], 3.5, 0, 2 * Math.PI);
                        ctx.fillStyle = '#2563eb';
                        
                        // Add glow shadow
                        ctx.shadowColor = '#3b82f6';
                        ctx.shadowBlur = 8;
                        ctx.fill();
                        ctx.shadowBlur = 0; // Reset shadow blur immediately
                    }
                });

                // 5.5 Draw Singapore and Hong Kong prominent markers
                const centerCoords = projection.invert([width / 2, height / 2]);
                ['singapore', 'hong_kong'].forEach(key => {
                    const coords = countryCoords[key];
                    if (!coords) return;
                    const distance = d3.geoDistance(centerCoords, coords);
                    // Only draw if on the visible front hemisphere of the globe
                    if (distance < Math.PI / 2) {
                        const pt = projection(coords);
                        const isCurrent = activeCountryId === countryIds[key];
                        
                        // Draw a solid circle anyway, so they are visible like other countries
                        ctx.beginPath();
                        ctx.arc(pt[0], pt[1], isCurrent ? 12 : 5, 0, 2 * Math.PI);
                        ctx.fillStyle = isCurrent ? '#2563eb' : '#93c5fd';
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(pt[0], pt[1], isCurrent ? 12 : 5, 0, 2 * Math.PI);
                        ctx.strokeStyle = isCurrent ? '#ffffff' : '#93c5fd';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        
                        // Draw pulsing rings
                        const pulseRadius = (isCurrent ? 12 : 5) + (Date.now() % 1500) / 1500 * (isCurrent ? 25 : 12);
                        const opacity = 1 - (Date.now() % 1500) / 1500;
                        
                        ctx.beginPath();
                        ctx.arc(pt[0], pt[1], pulseRadius, 0, 2 * Math.PI);
                        ctx.strokeStyle = `rgba(37, 99, 235, ${opacity * (isCurrent ? 0.9 : 0.4)})`;
                        ctx.lineWidth = isCurrent ? 2.5 : 1.5;
                        ctx.stroke();

                        // If hovered/active, draw a second outer pulsing ring and crosshair lines
                        if (isCurrent) {
                            const pulseRadius2 = 12 + ((Date.now() + 500) % 1500) / 1500 * 35;
                            const opacity2 = 1 - ((Date.now() + 500) % 1500) / 1500;
                            
                            ctx.beginPath();
                            ctx.arc(pt[0], pt[1], pulseRadius2, 0, 2 * Math.PI);
                            ctx.strokeStyle = `rgba(37, 99, 235, ${opacity2 * 0.5})`;
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            // Crosshair ticks
                            ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)';
                            ctx.lineWidth = 1.5;
                            
                            // Horizontal ticks
                            ctx.beginPath();
                            ctx.moveTo(pt[0] - pulseRadius - 5, pt[1]);
                            ctx.lineTo(pt[0] - pulseRadius, pt[1]);
                            ctx.moveTo(pt[0] + pulseRadius, pt[1]);
                            ctx.lineTo(pt[0] + pulseRadius + 5, pt[1]);
                            // Vertical ticks
                            ctx.moveTo(pt[0], pt[1] - pulseRadius - 5);
                            ctx.lineTo(pt[0], pt[1] - pulseRadius);
                            ctx.moveTo(pt[0], pt[1] + pulseRadius);
                            ctx.lineTo(pt[0], pt[1] + pulseRadius + 5);
                            ctx.stroke();
                        }
                    }
                });
            }

            requestAnimationFrame(render);
        }

        // Wire up list hover and click events
        countryItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                countryItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const key = item.getAttribute('data-country');
                const coords = countryCoords[key];
                if (coords) {
                    isHovered = true;
                    activeCountryId = countryIds[key];

                    // Center projection on the hovered country (shortest path)
                    const targetLon = -coords[0];
                    const targetLat = -coords[1];
                    const diff = ((targetLon - rotation[0] + 180) % 360) - 180;
                    targetRotation = [rotation[0] + diff, targetLat];
                    targetScale = (width / 2.1) * (key === 'singapore' || key === 'hong_kong' ? 4.8 : 1.45); // Zoom in
                }

                // Update caption
                mapCaptionText.textContent = item.getAttribute('data-name');
                mapCaption.classList.add('show');
            });

            // Handle click redirection to details modal
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                const countryObj = activeCountries.find(c => c.name === name);
                if (countryObj) {
                    if (name.toLowerCase() === 'singapore') {
                        localStorage.setItem('selected_country_detail', JSON.stringify(countryObj));
                        window.location.href = '/pricing.html';
                    } else {
                        window.openCountryDetailModal(countryObj);
                    }
                }
            });
        });

        // Reset to auto-spin when mouse leaves list container
        const countryListContainer = document.querySelector('.country-chips-grid');
        if (countryListContainer) {
            countryListContainer.addEventListener('mouseleave', () => {
                countryItems.forEach(i => i.classList.remove('active'));
                isHovered = false;
                activeCountryId = null;
                mapCaption.classList.remove('show');
            });
        }

        // Handle window resizing
        window.addEventListener('resize', () => {
            const newWidth = canvas.offsetWidth;
            const newHeight = canvas.offsetHeight;
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);
                projection.translate([width / 2, height / 2]);
                if (!isHovered) {
                    currentScale = width / 2.1;
                }
            }
        });
    }

    // Smooth scroll for internal hash links (e.g. Services link)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Restore modal if hash is #services on page load
    if (window.location.hash === '#services') {
        const cachedCountry = localStorage.getItem('selected_country_detail');
        if (cachedCountry) {
            try {
                const country = JSON.parse(cachedCountry);
                if (country && country.name) {
                    window.openCountryDetailModal(country);
                }
            } catch (e) {
                console.error('Error parsing stored country:', e);
            }
        } else {
            // Default to Singapore if no cached country exists
            const singaporeObj = activeCountries.find(c => c.name.toLowerCase() === 'singapore') || activeCountries[0];
            if (singaporeObj) {
                window.openCountryDetailModal(singaporeObj);
            }
        }
    }
}

window.openCountryDetailModal = function(country) {
    const modal = document.getElementById('country-detail-modal');
    if (!modal) return;
    
    // Save to localStorage so it persists across refreshes
    localStorage.setItem('selected_country_detail', JSON.stringify(country));
    // Set hash to '#services'
    window.location.hash = 'services';
    
    // Fill in values safely
    const codeEl = document.getElementById('detail-country-flag-icon');
    if (codeEl) {
        const code = country.code || country.name.substring(0, 2).toUpperCase();
        codeEl.textContent = code;
    }
    
    const nameEl = document.getElementById('detail-country-name');
    if (nameEl) nameEl.textContent = country.name;
    
    const taxEl = document.getElementById('detail-country-tax');
    if (taxEl) taxEl.textContent = country.tax || 'N/A';
    
    const complianceEl = document.getElementById('detail-country-compliance');
    if (complianceEl) complianceEl.textContent = country.compliance || 'N/A';
    
    const uenEl = document.getElementById('detail-country-uen');
    if (uenEl) {
        uenEl.textContent = country.uen || 'N/A';
        uenEl.title = country.uen || 'N/A';
    }

    const jurEl = document.getElementById('detail-country-jurisdiction');
    if (jurEl) jurEl.textContent = country.jurisdiction || country.name;
    
    // Detailed services list
    const allServicesList = [
        { id: 'local-inc', name: 'Local Incorporation', icon: 'building', desc: 'Fast-track registration for Singapore citizens and PRs.' },
        { id: 'foreign-inc', name: 'Foreign Incorporation', icon: 'globe', desc: 'Specialized entity setup for international founders.' },
        { id: 'nominee-dir', name: 'Nominee Director', icon: 'user-check', desc: 'Fulfill statutory local resident director requirements securely.' },
        { id: 'visa-ep', name: 'Work Visa & EP', icon: 'contact', desc: 'Employment Pass and dependant visa application support.' },
        { id: 'accounting', name: 'Accounting & Bookkeeping', icon: 'calculator', desc: 'SFRS bookkeeping, management reports, and compilation.' },
        { id: 'payroll', name: 'Payroll', icon: 'users', desc: 'Salary processing, CPF contributions, and year-end IR8A tax form filing.' },
        { id: 'address', name: 'Registered Address & Digital Mailroom', icon: 'map-pin', desc: 'CBD office address with instant digitization and email mail alerts.' },
        { id: 'secretary', name: 'Corporate Secretary', icon: 'file-text', desc: 'Certified secretarial services, statutory filings, and AGM documents.' },
        { id: 'gst-filing', name: 'GST Registration and Filing', icon: 'percent', desc: 'Complete GST registration guidance and quarterly returns filing.' },
        { id: 'tax-filing', name: 'Final tax filing', icon: 'scale', desc: 'ECI compilation and Form C-S/C corporate tax filings with IRAS.' },
        { id: 'bank-opening', name: 'Bank Account Opening', icon: 'wallet', desc: 'Assistance with setup and corporate bank account opening with major banks.' }
    ];

    // Filter services based on mapped services from the admin
    const hasConfiguredServices = country.services !== undefined && country.services !== null;
    const mappedServices = country.services || [];
    const servicesList = allServicesList.filter(s => {
        // If no services are mapped (e.g. not configured at all), show all
        if (!hasConfiguredServices) return true;

        if (s.id === 'local-inc' || s.id === 'foreign-inc') {
            return mappedServices.includes('Company Incorporation');
        }
        if (s.id === 'nominee-dir') {
            return mappedServices.includes('Nominee Director');
        }
        if (s.id === 'secretary') {
            return mappedServices.includes('Corporate Secretary');
        }
        if (s.id === 'address') {
            return mappedServices.includes('Office Address');
        }
        if (s.id === 'accounting' || s.id === 'gst-filing' || s.id === 'tax-filing') {
            return mappedServices.includes('Tax & Compliance');
        }
        if (s.id === 'bank-opening') {
            return mappedServices.includes('Bank Account Opening');
        }
        if (s.id === 'visa-ep') {
            return mappedServices.includes('Work Visa & EP') || mappedServices.includes('Visas & Immigration') || mappedServices.includes('Visa & Immigration');
        }
        if (s.id === 'payroll') {
            return mappedServices.includes('Payroll') || mappedServices.includes('Payroll Services');
        }
        return false;
    });

    // Custom currency mapper
    const CURRENCY_MAP = {
        "SG": { currency: "SGD", rate: 1.35, isAlreadyLocal: true },
        "HK": { currency: "HKD", rate: 7.8, isAlreadyLocal: true },
        "USA": { currency: "USD", rate: 1.0 },
        "CAN": { currency: "CAD", rate: 1.36 },
        "UK": { currency: "GBP", rate: 0.78 },
        "DE": { currency: "EUR", rate: 0.92 },
        "FR": { currency: "EUR", rate: 0.92 },
        "UAE": { currency: "AED", rate: 3.67 },
        "AUS": { currency: "AUD", rate: 1.50 },
        "ID": { currency: "IDR", rate: 16250 },
        "MY": { currency: "MYR", rate: 4.70 },
        "IN": { currency: "INR", rate: 83.50 },
        "VN": { currency: "VND", rate: 25400 },
        "TH": { currency: "THB", rate: 36.70 },
        "PH": { currency: "PHP", rate: 58.50 },
        "JP": { currency: "JPY", rate: 156.0 }
    };

    function getCurrencyAndPrice(countryCode, usdPrice) {
        const code = (countryCode || '').toUpperCase();
        const info = CURRENCY_MAP[code] || { currency: "USD", rate: 1.0 };
        const price = info.isAlreadyLocal ? usdPrice : Math.round(usdPrice * info.rate);
        return { currency: info.currency, price: price };
    }

    const standardServicesList = [
        "Company Incorporation",
        "Corporate Secretary",
        "Nominee Director",
        "Office Address",
        "Tax & Compliance",
        "Bank Account Opening"
    ];
    const customPrices = country.customPrices || {};
    
    // Add active custom services
    mappedServices.forEach(svc => {
        if (!standardServicesList.includes(svc)) {
            const usdPrice = customPrices[svc] !== undefined ? customPrices[svc] : 0;
            const currencyInfo = getCurrencyAndPrice(country.code, usdPrice);
            servicesList.push({
                id: svc,
                name: svc,
                icon: 'settings',
                desc: `Price: ${currencyInfo.currency} ${currencyInfo.price.toLocaleString()} &mdash; Custom service configured for ${country.name}.`
            });
        }
    });

    const grid = document.getElementById('country-fullpage-services-grid');
    let selectedServices = new Set();

    function renderFullPageServices() {
        if (!grid) return;
        grid.innerHTML = servicesList.map(s => {
            const isSelected = selectedServices.has(s.id);
            return `
                <div class="service-select-premium-card ${isSelected ? 'selected' : ''}" data-id="${s.id}">
                    <div class="select-indicator">
                        ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                    </div>
                    <div class="service-icon-wrapper ${s.id}">
                        <i data-lucide="${s.icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="service-content">
                        <h3>${s.name}</h3>
                        <p>${s.desc}</p>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Add event listeners to cards
        grid.querySelectorAll('.service-select-premium-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                if (selectedServices.has(id)) {
                    selectedServices.delete(id);
                } else {
                    selectedServices.add(id);
                }
                updateSelectionState();
            });
        });
    }

    function updateSelectionState() {
        // Update cards selection styling
        grid.querySelectorAll('.service-select-premium-card').forEach(card => {
            const id = card.getAttribute('data-id');
            const isSelected = selectedServices.has(id);
            card.classList.toggle('selected', isSelected);
            const indicator = card.querySelector('.select-indicator');
            if (indicator) {
                indicator.innerHTML = isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '';
            }
        });

        // Update selected count
        const countBadge = document.getElementById('fullpage-selected-count');
        if (countBadge) countBadge.textContent = selectedServices.size;

        // Update select all box
        const selectAllBox = document.getElementById('select-all-box');
        if (selectAllBox) {
            const allSelected = selectedServices.size === servicesList.length;
            selectAllBox.innerHTML = allSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '';
        }

        // Enable/Disable continue button
        const continueBtnEl = document.getElementById('fullpage-btn-continue');
        if (continueBtnEl) {
            continueBtnEl.disabled = selectedServices.size === 0;
        }
    }

    // Set up Select All logic
    const selectAllBtn = document.getElementById('fullpage-select-all');
    if (selectAllBtn) {
        // Clean up previous event listeners by cloning
        const newSelectAllBtn = selectAllBtn.cloneNode(true);
        selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);
        newSelectAllBtn.addEventListener('click', () => {
            if (selectedServices.size === servicesList.length) {
                selectedServices.clear();
            } else {
                servicesList.forEach(s => selectedServices.add(s.id));
            }
            updateSelectionState();
        });
    }

    // Set up Continue to Pricing button logic
    const continueBtn = document.getElementById('fullpage-btn-continue');
    if (continueBtn) {
        const newContinueBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
        newContinueBtn.addEventListener('click', () => {
            // Pass all selected services as a comma-separated list in query params
            const servicesParam = Array.from(selectedServices).join(',');
            window.location.href = `/pricing.html?services=${encodeURIComponent(servicesParam)}`;
        });
    }

    renderFullPageServices();
    updateSelectionState();

    // Show full screen page overlay
    modal.classList.remove('hidden');
    modal.offsetHeight; // force reflow
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    
    // Prevent background scrolling while viewing full page
    document.body.style.overflow = 'hidden';
}

window.closeCountryDetailModal = function() {
    const modal = document.getElementById('country-detail-modal');
    if (!modal) return;

    // Clear hash without jumping/scrolling
    if (window.location.hash === '#services') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    // Remove stored country details
    localStorage.removeItem('selected_country_detail');

    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    // Restore scrolling
    document.body.style.overflow = '';

    // Scroll to Worldwide Presence section
    const worldwidePresenceEl = document.getElementById('worldwide-presence');
    if (worldwidePresenceEl) {
        worldwidePresenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.addEventListener('DOMContentLoaded', init);
