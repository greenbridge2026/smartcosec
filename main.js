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

function init() {
    const grid = document.getElementById('services-grid');
    const journeyContainer = document.getElementById('journey-container');
    const journeyProgressBar = document.getElementById('journey-progress-bar');
    const timelineProgress = document.getElementById('timeline-progress');
    const timelineContainer = document.querySelector('.timeline-container') || document.querySelector('.process-section');

    // 1. Inject Services
    if (grid) {
        services.forEach((service, i) => {
            const el = document.createElement('div');
            el.className = 'service-card';
            el.innerHTML = `
                <div class="card-icon">${service.icon}</div>
                <div class="card-header">
                    <h3 class="card-title">${service.name}</h3>
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
    window.addEventListener('scroll', () => {
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
                    if (index === activeIndex) {
                        step.classList.add('active');
                    } else {
                        step.classList.remove('active');
                    }
                });
            }
        }
    });

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
                // Update active states
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
                
                // Add glow to active node
                const glow = document.createElement('span');
                glow.className = 'node-glow';
                item.querySelector('.circle-node').appendChild(glow);
                
                // Update Hub SVG
                hubContent.innerHTML = serviceSVGs[service.title] || '';
                
                // Update Title & Description (Typewriter)
                activeTitleDisplay.innerText = service.title;
                typeText(activeDescDisplay, service.description);
                
                // Update Features
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
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % heroWords.length;
            typeSpeed = 500;
        }

        setTimeout(type, typeSpeed);
    }

    if (typewriterElement) type();
}

init();

console.log('Globalisor Professional Ecosystem Initialized');
