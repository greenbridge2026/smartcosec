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

let allBlogs = [];
let currentCategory = 'All';
let searchQuery = '';

async function initBlogsPage() {
    const grid = document.getElementById('public-blog-grid');
    if (!grid) return;

    // Load blogs from API / fallback
    try {
        const res = await fetch('/api/blogs');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            allBlogs = data;
        } else {
            throw new Error("No blogs returned from API");
        }
    } catch (e) {
        console.warn('REST API blogs endpoint offline, loading from localStorage fallback:', e);
        const cached = localStorage.getItem('admin_blogs');
        if (cached === null) {
            allBlogs = DEFAULT_BLOGS;
        } else {
            try {
                allBlogs = JSON.parse(cached);
                if (!Array.isArray(allBlogs)) {
                    allBlogs = DEFAULT_BLOGS;
                }
            } catch(err) {
                allBlogs = DEFAULT_BLOGS;
            }
        }
    }

    // Filter only published blogs and exclude test/placeholder titles
    allBlogs = allBlogs.filter(b => {
        if (!b) return false;
        if (!b.published && b.status !== 'published') return false;
        const title = (b.publishedTitle || b.title || '').trim().toLowerCase();
        const excerpt = (b.publishedExcerpt || b.description || b.excerpt || '').trim().toLowerCase();
        if (title === 'hi' || title === 'vietnam tax' || title === 'tax' || title === 'test') return false;
        if (excerpt === 'hi' || excerpt === 'tax' || excerpt.startsWith('hi - tax') || excerpt === 'test') return false;
        if (title.length < 4 && excerpt.length < 5) return false;
        return true;
    });

    // Sort blogs descending by lastModified activity time
    const getBlogTime = (b) => {
        if (b.lastModified) return b.lastModified;
        if (b.date) {
            const parsed = Date.parse(b.date);
            if (!isNaN(parsed)) return parsed;
        }
        return 0;
    };
    allBlogs.sort((a, b) => getBlogTime(b) - getBlogTime(a));

    // Build category filters dynamically
    renderCategoryFilters();

    // Setup search listener
    const searchInput = document.getElementById('blog-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderBlogGrid();
        });
    }

    // Render the grid
    renderBlogGrid();
}

function renderCategoryFilters() {
    const container = document.getElementById('blog-category-filters');
    if (!container) return;

    const categories = ['All', ...new Set(allBlogs.map(b => b.category).filter(Boolean))];
    
    container.innerHTML = categories.map(cat => {
        const isActive = cat === currentCategory;
        return `
            <button onclick="window.filterBlogsByCategory('${cat}')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                isActive 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }">
                ${cat}
            </button>
        `;
    }).join('');
}

window.filterBlogsByCategory = function(category) {
    currentCategory = category;
    renderCategoryFilters();
    renderBlogGrid();
};

function renderBlogGrid() {
    const grid = document.getElementById('public-blog-grid');
    if (!grid) return;

    let filtered = currentCategory === 'All' 
        ? allBlogs 
        : allBlogs.filter(b => b.category === currentCategory);

    if (searchQuery) {
        filtered = filtered.filter(b => {
            const displayTitle = (b.publishedTitle || b.title || '').toLowerCase();
            const displayExcerpt = (b.publishedExcerpt || b.description || b.excerpt || '').toLowerCase();
            const displayContent = (b.publishedContent || b.content || '').toLowerCase();
            const category = (b.category || '').toLowerCase();
            const author = (b.author || '').toLowerCase();
            return displayTitle.includes(searchQuery) || 
                   displayExcerpt.includes(searchQuery) || 
                   displayContent.includes(searchQuery) ||
                   category.includes(searchQuery) ||
                   author.includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = searchQuery 
            ? '<p class="text-slate-400 text-center col-span-full py-16">No insights found matching your search.</p>'
            : '<p class="text-slate-400 text-center col-span-full py-16">No insights published in this category yet.</p>';
        return;
    }

    grid.innerHTML = filtered.map(blog => {
        const displayTitle = blog.publishedTitle || blog.title;
        const displayExcerpt = blog.publishedExcerpt || blog.description || blog.excerpt || '';
        const displayCoverImage = blog.publishedCoverImage || blog.coverImage || '';

        return `
        <div onclick="window.openLandingBlogDetail('${blog.id}')" class="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] transition-all duration-500 cursor-pointer flex flex-col h-full">
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
            <div class="p-8 flex-1 flex flex-col justify-between">
                <div>
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
                    <h3 class="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">${displayTitle}</h3>
                    <p class="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6">${displayExcerpt}</p>
                </div>
                <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all pt-4 border-t border-slate-50 mt-auto">
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

window.openLandingBlogDetail = function(id) {
    const blog = allBlogs.find(b => b.id === id);
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

document.addEventListener('DOMContentLoaded', initBlogsPage);
