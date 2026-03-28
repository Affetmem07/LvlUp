/* ==========================================================
   LvlUp – Gaming News & Community | Application Logic
   ========================================================== */

// ── Data Store (localStorage-based) ──
const STORAGE_KEYS = {
    users: 'lvlup_users',
    posts: 'lvlup_posts',
    currentUser: 'lvlup_currentUser',
    gamePopularity: 'lvlup_game_popularity',
};

function getStore(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
}

function splitGameTitleForHeroV3(title) {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [title || '', ''];
    const splitIndex = Math.ceil(words.length / 2);
    return [
        words.slice(0, splitIndex).join(' '),
        words.slice(splitIndex).join(' ')
    ];
}

function formatCompactNumberV3(value) {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
}

function parseRequirementTextV3(text) {
    if (!text) return [];
    return String(text)
        .replace(/\r/g, '\n')
        .split(/\n+/)
        .map(line => line.replace(/\t/g, ' ').trim())
        .filter(Boolean)
        .map(line => line.replace(/^[-*]\s*/, ''))
        .map(line => {
            const match = line.match(/^([^:]{2,40}):\s*(.+)$/);
            if (!match) return null;
            return {
                label: match[1].trim(),
                value: match[2].trim()
            };
        })
        .filter(Boolean);
}

function renderRequirementCardV3(title, variant, text, fallbackText) {
    const items = parseRequirementTextV3(text);
    if (!text && !fallbackText) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <div class="gd-spec-empty">RAWG tarafinda bu katman icin veri bulunamadi.</div>
            </div>
        `;
    }

    if (!items.length) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <pre class="sysreq-text">${escapeHtml(text || fallbackText)}</pre>
            </div>
        `;
    }

    return `
        <div class="gd-spec-card gd-spec-card--${variant}">
            <div class="gd-spec-card-title">${title}</div>
            <div class="gd-spec-list">
                ${items.map(item => `
                    <div class="gd-spec-row">
                        <span>${escapeHtml(item.label)}</span>
                        <strong>${escapeHtml(item.value)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSystemRequirementCardsV3(requirements) {
    if (!requirements || requirements.length === 0) {
        return `
            <div class="gd-spec-duo">
                <div class="gd-spec-card gd-spec-card--minimum">
                    <div class="gd-spec-card-title">Minimum Tiers</div>
                    <div class="gd-spec-empty">RAWG bu oyun icin sistem gereksinimi donmuyor.</div>
                </div>
                <div class="gd-spec-card gd-spec-card--recommended">
                    <div class="gd-spec-card-title">Ultimate Spec</div>
                    <div class="gd-spec-empty">Detay geldikce burada onerilen donanim gorunecek.</div>
                </div>
            </div>
        `;
    }

    const primary = requirements.find(req => /pc|windows/i.test(req.platform)) || requirements[0];
    const platformLabel = primary.platform ? `<div class="gd-spec-platform">${escapeHtml(primary.platform)}</div>` : '';

    return `
        <div class="gd-spec-stack">
            ${platformLabel}
            <div class="gd-spec-duo">
                ${renderRequirementCardV3('Minimum Tiers', 'minimum', primary.minimum, primary.minimum || primary.recommended)}
                ${renderRequirementCardV3('Ultimate Spec', 'recommended', primary.recommended, primary.recommended || primary.minimum)}
            </div>
        </div>
    `;
}

function renderITADPricesSectionV3(result) {
    const container = document.getElementById('itadPricesSection');
    if (!container) return;

    const searchUrl = result?.slug
        ? `https://isthereanydeal.com/game/${result.slug}/info/`
        : `https://isthereanydeal.com/search/?q=${encodeURIComponent(result?.title || '')}`;

    const formatCurrency = (amount, currency) => {
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
        } catch {
            return `${currency || '$'} ${amount.toFixed(2)}`;
        }
    };

    if (!result?.deals?.length) {
        container.innerHTML = `
            <div class="itad-offer-card itad-offer-card--empty">
                <div class="itad-offer-label">ITAD live price</div>
                <div class="itad-offer-empty">Bu oyun icin su an aktif teklif bulunamadi.</div>
                <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                    ITAD'da kontrol et
                </a>
            </div>
        `;
        return;
    }

    const sortedDeals = [...result.deals]
        .filter(deal => TR_POPULAR_SHOPS.has(deal.shop?.name))
        .sort((a, b) => (b.cut || 0) - (a.cut || 0))
        .slice(0, 8);
    const dealsToShow = sortedDeals.length > 0 ? sortedDeals : [...result.deals].slice(0, 8);
    const featuredDeal = [...dealsToShow].sort((a, b) => {
        const aAmount = a.price?.amount ?? Number.MAX_SAFE_INTEGER;
        const bAmount = b.price?.amount ?? Number.MAX_SAFE_INTEGER;
        return aAmount - bAmount;
    })[0];

    const dealsHtml = dealsToShow.map(deal => {
        const shopNameRaw = deal.shop?.name || 'Magaza';
        const shopName = ITAD_SHOP_NAME_MAP[shopNameRaw] || shopNameRaw;
        const shopIcon = ITAD_SHOP_ICONS[shopNameRaw] || 'Store';
        const cut = deal.cut || 0;
        const isDiscounted = cut > 0;
        const priceCur = deal.price?.currency || 'USD';
        const currentPrice = deal.price?.amount != null ? formatCurrency(deal.price.amount, priceCur) : '?';
        const regularPrice = deal.regular?.amount != null ? formatCurrency(deal.regular.amount, priceCur) : null;
        const buyUrl = deal.url || searchUrl;

        return `
            <a href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-deal-card${isDiscounted ? ' is-sale' : ''}">
                <span class="itad-shop-name">${escapeHtml(shopIcon)} ${escapeHtml(shopName)}</span>
                <span class="itad-price-row">
                    ${isDiscounted && regularPrice ? `<span class="itad-regular-price">${regularPrice}</span>` : ''}
                    <span class="itad-current-price">${currentPrice}</span>
                    ${isDiscounted ? `<span class="itad-deal-badge">-%${cut}</span>` : ''}
                </span>
            </a>
        `;
    }).join('');

    const featuredCurrent = featuredDeal?.price?.amount != null
        ? formatCurrency(featuredDeal.price.amount, featuredDeal.price.currency)
        : '?';
    const featuredRegular = featuredDeal?.regular?.amount != null
        ? formatCurrency(featuredDeal.regular.amount, featuredDeal.regular.currency)
        : null;
    const featuredCut = featuredDeal?.cut || 0;
    const featuredBuyUrl = featuredDeal?.url || searchUrl;
    const historyLowHtml = result.historyLow?.amount != null
        ? `<div class="itad-history-low">Tum zamanlarin en dusugu: <strong>${formatCurrency(result.historyLow.amount, result.historyLow.currency)}</strong></div>`
        : '';

    container.innerHTML = `
        <div class="itad-offer-card">
            <div class="itad-offer-label">Best offer</div>
            <div class="itad-offer-price-wrap">
                <div class="itad-offer-price">${featuredCurrent}</div>
                ${featuredRegular ? `<div class="itad-offer-regular">${featuredRegular}</div>` : ''}
                ${featuredCut > 0 ? `<div class="itad-offer-discount">-%${featuredCut}</div>` : ''}
            </div>
            ${historyLowHtml}
            <a href="${escapeHtml(featuredBuyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                Satin al
            </a>
            <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-wishlist-btn">
                Tum fiyatlari gor
            </a>
            <div class="itad-offer-meta">
                <span>TR market scan</span>
                <span>Digital delivery</span>
            </div>
        </div>
        <div class="itad-deals-grid">${dealsHtml}</div>
    `;
}

function renderGameDetailContentV3(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const description = game.description || 'Aciklama yukleniyor...';
    const developer = game.developer || 'Yukleniyor...';
    const publisher = game.publisher || 'Yukleniyor...';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;
    const screenshots = (game.screenshots || []).slice(0, 3);
    const heroBlurb = description.length > 220 ? `${description.slice(0, 220).trim()}...` : description;
    const splitTitle = splitGameTitleForHeroV3(game.title);
    const statsRibbon = [
        { label: 'Playtime', value: game.playtime || '—' },
        { label: 'Active', value: game.added ? `${formatCompactNumberV3(game.added)}+` : '—' },
        { label: 'Reviews', value: game.ratingsCount ? `${formatCompactNumberV3(game.ratingsCount)}+` : '—' }
    ];

    document.getElementById('gameDetailHero').innerHTML = `
        <img src="${escapeHtml(game.backgroundUrl || game.coverUrl)}" alt="" class="game-detail-hero-bg"
             onerror="this.style.background='var(--bg-elevated)'">
        <div class="gd-hero-backdrop"></div>
        <div class="gd-hero-orb gd-hero-orb--one"></div>
        <div class="gd-hero-orb gd-hero-orb--two"></div>
        <div class="game-detail-hero-content gd-cinematic-hero">
            <div class="gd-hero-copy">
                <div class="gd-hero-meta-strip">
                    ${game.rating > 0 ? `<span class="gd-score-pill ${ratingClass}">${starSvg} ${game.rating}</span>` : ''}
                    <span class="gd-meta-inline">Release Year: ${game.releaseYear || 'TBA'}</span>
                    ${game.esrbRating ? `<span class="gd-meta-inline">${escapeHtml(game.esrbRating)}</span>` : ''}
                </div>
                <h2 class="game-detail-title gd-cinematic-title">
                    <span>${escapeHtml(splitTitle[0])}</span>
                    ${splitTitle[1] ? `<span class="accent">${escapeHtml(splitTitle[1])}</span>` : ''}
                </h2>
                <div class="game-detail-genres gd-hero-tag-row">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
            </div>

            <aside class="gd-hero-side">
                <div class="gd-poster-card" ${game.screenshots && game.screenshots.length > 0 ? `onclick="openScreenshotLightbox('${escapeHtml(game.id)}')"` : ''}>
                    <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
                         onerror="this.style.background='var(--bg-elevated)'">
                    ${(game.screenshots && game.screenshots.length > 0) ? `<div class="game-detail-cover-badge">${game.screenshots.length} shots</div>` : ''}
                </div>
                <div class="gd-hero-stats-card">
                    ${statsRibbon.map(item => `
                        <div class="gd-hero-stat">
                            <span>${escapeHtml(item.label)}</span>
                            <strong>${escapeHtml(item.value)}</strong>
                        </div>
                    `).join('')}
                </div>
            </aside>
        </div>
        <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="game-detail-rawg-watermark" title="Veriler RAWG Database'inden alinmistir">RAWG.io</a>
    `;

    document.getElementById('gameDetailInfo').innerHTML = `
        <div class="gd-detail-layout">
            <section class="gd-section gd-section--about">
                <div class="gd-section-title">
                    <span></span>
                    <h3>Game description</h3>
                </div>
                <div class="gd-about-grid">
                    <div class="gd-about-main">
                        <p class="gd-lead-copy">${escapeHtml(heroBlurb)}</p>
                        <div class="gd-desc-box" id="gdDescBox" onclick="toggleGameDescV3()">
                            <p class="gd-desc-text" id="gdDescText">${escapeHtml(description)}</p>
                            <div class="gd-desc-fade"></div>
                            <div class="gd-desc-toggle">Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></div>
                        </div>
                        ${screenshots.length > 0 ? `
                            <div class="gd-inline-gallery">
                                ${screenshots.map((shot, index) => `
                                    <button class="gd-inline-shot" onclick="event.stopPropagation();openScreenshotLightbox('${escapeHtml(game.id)}')" aria-label="Screenshot ${index + 1}">
                                        <img src="${escapeHtml(shot)}" alt="${escapeHtml(game.title)} screenshot ${index + 1}">
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <aside class="gd-info-card">
                        <div class="gd-info-block">
                            <div class="gd-info-label">Developed by</div>
                            <div class="gd-info-value gd-info-value--stack">
                                ${(game.developerData && game.developerData.length > 0
            ? game.developerData.map(d => `<button class="creator-link" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(d.name)}','${escapeHtml(d.slug)}','developer')">${escapeHtml(d.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(developer)}</span>`)}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">Published by</div>
                            <div class="gd-info-value gd-info-value--stack">
                                ${(game.publisherData && game.publisherData.length > 0
            ? game.publisherData.map(p => `<button class="creator-link creator-link--publisher" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(p.name)}','${escapeHtml(p.slug)}','publisher')">${escapeHtml(p.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(publisher)}</span>`)}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">Platforms</div>
                            <div class="gd-platforms">
                                ${displayPlatforms.map(p => `<span class="gd-platform-chip">${escapeHtml(p)}</span>`).join('')}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">RAWG stats</div>
                            <div class="gd-rawg-stat-list">
                                <div><span>Metacritic</span><strong>${game.rating > 0 ? game.rating : '—'}</strong></div>
                                <div><span>User rating</span><strong>${game.rawRating ? game.rawRating.toFixed(1) : '—'}</strong></div>
                                <div><span>Release</span><strong>${game.released ? escapeHtml(game.released) : (game.releaseYear || 'TBA')}</strong></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            ${(game.tags && game.tags.length > 0) ? `
                <section class="gd-section gd-section--tags">
                    <div class="gd-section-heading">Tags</div>
                    <div class="gd-tags">
                        ${game.tags.map(t => `<span class="game-detail-tag">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                </section>
            ` : ''}

            <section class="gd-section gd-section--specs">
                <div class="gd-specs-header">
                    <div>
                        <div class="gd-section-heading">Technical Specifications</div>
                        <p>Donanim bilgileri RAWG uzerinden geliyor, fiyat taramasi ITAD ile ayrik tutuluyor.</p>
                    </div>
                </div>
                <div class="gd-specs-layout">
                    <div class="gd-specs-grid">
                        ${renderSystemRequirementCardsV3(game.systemRequirements)}
                    </div>
                    <aside class="gd-price-column">
                        <div class="gd-price-card">
                            <div class="gd-price-head">
                                <strong>ITAD</strong>
                            </div>
                            <div id="itadPricesSection" class="itad-prices-section">
                                <div class="itad-loading">
                                    <div class="games-loading-spinner" style="width:18px;height:18px;border-width:2px;margin:0;"></div>
                                    <span>Fiyatlar yukleniyor...</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    `;
}

function toggleGameDescV3() {
    const box = document.getElementById('gdDescBox');
    if (!box) return;
    const isExpanded = box.classList.toggle('expanded');
    const btn = box.querySelector('.gd-desc-toggle');
    if (btn) btn.innerHTML = isExpanded
        ? 'Kucult <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
}

function setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function createGamePopularitySnapshot(game) {
    if (!game || !game.id) return null;
    const rawgId = Number(game.rawgId || game.id);
    return {
        id: String(game.id),
        rawgId: Number.isFinite(rawgId) ? rawgId : null,
        title: game.title || game.name || 'Bilinmeyen',
        coverUrl: game.coverUrl || game.backgroundUrl || '',
        backgroundUrl: game.backgroundUrl || game.coverUrl || '',
        genres: Array.isArray(game.genres) ? game.genres : [],
        platforms: Array.isArray(game.platforms) ? game.platforms : [],
        releaseYear: Number(game.releaseYear) || 0,
        released: game.released || '',
        rating: Number(game.rating) || 0,
        added: Number(game.added) || 0,
        slug: game.slug || '',
    };
}

function normalizeGamePopularityStore(store) {
    if (!store || typeof store !== 'object') return {};

    return Object.values(store).reduce((acc, entry) => {
        const snapshot = createGamePopularitySnapshot(entry);
        if (!snapshot) return acc;

        acc[snapshot.id] = {
            ...snapshot,
            visitCount: Math.max(0, Number(entry.visitCount) || 0),
            lastVisitedAt: entry.lastVisitedAt || '',
        };
        return acc;
    }, {});
}

function createPostCoverDataUrl(options = {}) {
    const {
        label = 'LVLUP',
        title = 'Gaming Spotlight',
        accent = '#6BAA75',
        secondary = '#2D5A43',
        background = '#08130e'
    } = options;

    const safeLabel = escapeHtml(String(label).slice(0, 18).toUpperCase());
    const rawTitle = String(title).replace(/\s+/g, ' ').trim().slice(0, 44);
    const titleWords = rawTitle.split(' ');
    const titleLines = [];
    let currentLine = '';

    titleWords.forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (nextLine.length <= 16 || currentLine.length === 0) {
            currentLine = nextLine;
            return;
        }

        if (titleLines.length < 2) titleLines.push(currentLine);
        currentLine = word;
    });

    if (currentLine && titleLines.length < 2) titleLines.push(currentLine);
    while (titleLines.length < 2) titleLines.push('');

    const safeTitleLines = titleLines.map((line) => escapeHtml(line));
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${background}" />
                    <stop offset="55%" stop-color="${secondary}" />
                    <stop offset="100%" stop-color="#05110b" />
                </linearGradient>
                <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16" />
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                </linearGradient>
            </defs>
            <rect width="1200" height="675" fill="url(#bg)" />
            <circle cx="950" cy="120" r="180" fill="${accent}" opacity="0.16" />
            <circle cx="1080" cy="560" r="220" fill="${accent}" opacity="0.1" />
            <path d="M720 40 L1160 40 L840 360 L420 360 Z" fill="url(#shine)" opacity="0.38" />
            <rect x="430" y="74" rx="24" ry="24" width="340" height="54" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.14" />
            <text x="600" y="109" text-anchor="middle" fill="${accent}" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="3">${safeLabel}</text>
            <text x="600" y="470" text-anchor="middle" fill="#f4f7f5" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="800">
                <tspan x="600" dy="0">${safeTitleLines[0]}</tspan>
                <tspan x="600" dy="76">${safeTitleLines[1]}</tspan>
            </text>
            <rect x="400" y="580" rx="10" ry="10" width="400" height="10" fill="#ffffff" fill-opacity="0.14" />
            <rect x="470" y="608" rx="10" ry="10" width="260" height="10" fill="#ffffff" fill-opacity="0.08" />
        </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const DEMO_POST_IMAGE_MAP = {
    p1: createPostCoverDataUrl({ label: 'FPS', title: 'GTA 6', accent: '#7FE08D', secondary: '#1C4C37', background: '#091710' }),
    p2: createPostCoverDataUrl({ label: 'RPG', title: 'Elden Ring DLC', accent: '#B6E07D', secondary: '#314E24', background: '#0d1308' }),
    p3: createPostCoverDataUrl({ label: 'MOBA', title: 'Valorant Tour', accent: '#7AE0C4', secondary: '#11463D', background: '#071411' }),
    p4: createPostCoverDataUrl({ label: 'GENEL', title: 'PS6 Leak', accent: '#87C5FF', secondary: '#1D3D5B', background: '#08111a' }),
    p5: createPostCoverDataUrl({ label: 'GENEL', title: 'Switch 2', accent: '#F6D86B', secondary: '#5E4C1B', background: '#171108' }),
    p6: createPostCoverDataUrl({ label: 'ONLINE', title: 'Fortnite Event', accent: '#C996FF', secondary: '#40316B', background: '#0d0b19' }),
    p7: createPostCoverDataUrl({ label: 'INDIE', title: 'Hollow Knight', accent: '#A8C2FF', secondary: '#2C355E', background: '#090d18' }),
    p8: createPostCoverDataUrl({ label: 'STRATEJI', title: 'Civilization VII', accent: '#8DE0B9', secondary: '#1F4F45', background: '#081612' }),
};

function normalizeDemoPostImages(posts) {
    let changed = false;
    const normalized = posts.map((post) => {
        const fallbackImage = DEMO_POST_IMAGE_MAP[post.id];
        if (!fallbackImage) return post;

        if (post.imageUrl !== fallbackImage) {
            changed = true;
            return { ...post, imageUrl: fallbackImage };
        }

        return post;
    });

    return { posts: normalized, changed };
}

// ── State ──
let currentUser = getStore(STORAGE_KEYS.currentUser);
let allPosts = getStore(STORAGE_KEYS.posts) || [];
let allUsers = getStore(STORAGE_KEYS.users) || [];
let gamePopularityStore = normalizeGamePopularityStore(getStore(STORAGE_KEYS.gamePopularity) || {});

// O(1) user lookup map — rebuild whenever allUsers changes
let userMap = new Map(allUsers.map(u => [u.id, u]));
function rebuildUserMap() { userMap = new Map(allUsers.map(u => [u.id, u])); }

const AVATAR_GRADIENTS_LIST = [
    'linear-gradient(135deg, #2D5A43, #8FBC8F)',
    'linear-gradient(135deg, #BC6C25, #DDA15E)',
    'linear-gradient(135deg, #606C38, #283618)',
    'linear-gradient(135deg, #A4C639, #6BAA75)',
];
let currentPage = 'home';
let currentSort = 'newest';
let currentCategory = null;
let allGames = [];
let currentGameFilter = 'all';
let currentGameSearch = '';
let currentProfileTab = 'posts';
let selectedAvatarColor = 0;
let hasLoadedGamesCatalog = false;
let homeHeroGames = {
    newest: [],
    popular: [],
    loading: false,
    loaded: false,
    error: false,
};

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2D5A43, #8FBC8F)', // Forest
    'linear-gradient(135deg, #BC6C25, #DDA15E)', // Autumn
    'linear-gradient(135deg, #606C38, #283618)', // Moss
    'linear-gradient(135deg, #A4C639, #6BAA75)', // Sage
    'linear-gradient(135deg, #4A3E3F, #7B6B67)', // Wood
    'linear-gradient(135deg, #3A5A40, #588157)', // Leaf
    'linear-gradient(135deg, #344E41, #A3B18A)', // Sage Dark
    'linear-gradient(135deg, #354F52, #52796F)', // Pine
];

let RAWG_API_KEY = '';
let ITAD_API_KEY = '';
const POST_POPULARITY_WEIGHTS = {
    like: 4,
    comment: 6,
    bookmark: 5,
};

function saveGamePopularityStore() {
    setStore(STORAGE_KEYS.gamePopularity, gamePopularityStore);
}

function buildBookmarkCountMap(users = allUsers) {
    const counts = new Map();
    users.forEach((user) => {
        (user.bookmarks || []).forEach((postId) => {
            counts.set(postId, (counts.get(postId) || 0) + 1);
        });
    });
    return counts;
}

function getPostPopularityLabel(score) {
    if (score >= 42) return 'Alevde';
    if (score >= 24) return 'Yukseliste';
    if (score >= 10) return 'One cikiyor';
    return 'Kesfediliyor';
}

function getPostPopularity(post, bookmarkCountMap = buildBookmarkCountMap()) {
    const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
    const bookmarkCount = bookmarkCountMap.get(post.id) || 0;
    const score = (likeCount * POST_POPULARITY_WEIGHTS.like)
        + (commentCount * POST_POPULARITY_WEIGHTS.comment)
        + (bookmarkCount * POST_POPULARITY_WEIGHTS.bookmark);

    return {
        likeCount,
        commentCount,
        bookmarkCount,
        score,
        label: getPostPopularityLabel(score),
    };
}

function comparePostsByPopularity(a, b, bookmarkCountMap = buildBookmarkCountMap()) {
    const aPopularity = getPostPopularity(a, bookmarkCountMap);
    const bPopularity = getPostPopularity(b, bookmarkCountMap);

    if (bPopularity.score !== aPopularity.score) {
        return bPopularity.score - aPopularity.score;
    }
    if (bPopularity.commentCount !== aPopularity.commentCount) {
        return bPopularity.commentCount - aPopularity.commentCount;
    }
    if (bPopularity.likeCount !== aPopularity.likeCount) {
        return bPopularity.likeCount - aPopularity.likeCount;
    }
    return new Date(b.date) - new Date(a.date);
}

function sortPostsByPopularity(posts) {
    const bookmarkCountMap = buildBookmarkCountMap();
    return [...posts].sort((a, b) => comparePostsByPopularity(a, b, bookmarkCountMap));
}

function getGamePopularityEntry(gameId) {
    return gamePopularityStore[String(gameId)] || null;
}

function compareGamesByPopularity(a, b) {
    const visitDiff = (Number(b.visitCount) || 0) - (Number(a.visitCount) || 0);
    if (visitDiff !== 0) return visitDiff;

    const lastVisitedDiff = new Date(b.lastVisitedAt || 0) - new Date(a.lastVisitedAt || 0);
    if (lastVisitedDiff !== 0) return lastVisitedDiff;

    return (Number(b.added) || 0) - (Number(a.added) || 0);
}

function upsertGamePopularity(game, { increment = false } = {}) {
    const snapshot = createGamePopularitySnapshot(game);
    if (!snapshot) return null;

    const existing = gamePopularityStore[snapshot.id] || {};
    const visitCount = Math.max(0, Number(existing.visitCount) || 0) + (increment ? 1 : 0);

    gamePopularityStore[snapshot.id] = {
        ...existing,
        ...snapshot,
        visitCount,
        lastVisitedAt: increment ? new Date().toISOString() : (existing.lastVisitedAt || ''),
    };

    saveGamePopularityStore();
    mergeGamesIntoLibrary([gamePopularityStore[snapshot.id]]);
    return gamePopularityStore[snapshot.id];
}

function recordGameVisit(game) {
    return upsertGamePopularity(game, { increment: true });
}

function syncGamePopularitySnapshot(game) {
    return upsertGamePopularity(game, { increment: false });
}

function getHomePopularGames(limit = 3, excludedIds = new Set()) {
    const storedPopularGames = Object.values(gamePopularityStore)
        .filter((game) => (game.visitCount || 0) > 0 && !excludedIds.has(String(game.id)))
        .sort(compareGamesByPopularity);
    const storedIds = new Set(storedPopularGames.map((game) => String(game.id)));
    const fallbackGames = (homeHeroGames.popular || []).filter((game) => {
        const id = String(game.id);
        return !excludedIds.has(id) && !storedIds.has(id);
    });

    return dedupeMappedGames([...storedPopularGames, ...fallbackGames]).slice(0, limit);
}

async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('API anahtarları alınamadı');
        const data = await response.json();
        RAWG_API_KEY = data.RAWG_API_KEY || '';
        ITAD_API_KEY = data.ITAD_API_KEY || '';
        if (!RAWG_API_KEY || !ITAD_API_KEY) {
            console.warn('Bazı API anahtarları eksik. Lütfen Vercel ayarlarını kontrol edin.');
        }
    } catch (err) {
        console.error('Konfigürasyon yüklenirken hata oluştu:', err);
        showToast('Sistem ayarları yüklenemedi. Bazı özellikler çalışmayabilir.', 'error');
    }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', async () => {
    await fetchConfig();
    if (allPosts.length === 0) seedData();
    const normalizedPosts = normalizeDemoPostImages(allPosts);
    if (normalizedPosts.changed) {
        allPosts = normalizedPosts.posts;
        setStore(STORAGE_KEYS.posts, allPosts);
    }
    if (Object.keys(gamePopularityStore).length > 0) {
        mergeGamesIntoLibrary(Object.values(gamePopularityStore));
    }
    updateAuthUI();

    // Generate Ambient Leaves (Dark Forest)
    const ambientBg = document.getElementById('ambient-background');
    if (ambientBg) {
        const leafIcons = [
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%231B452D' xmlns='http://www.w3.org/2000/svg'><path d='M12 2C12 2 8 5 8 8C8 10 5 10 5 12C5 14 8 14 8 16C8 19 12 22 12 22C12 22 16 19 16 16C16 14 19 14 19 12C19 10 16 10 16 8C16 5 12 2 12 2Z'/></svg>")`,
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%2312301A' xmlns='http://www.w3.org/2000/svg'><path d='M12,1 L17,6 L15,9 L20,11 L16,15 L18,20 L12,18 L6,20 L8,15 L4,11 L9,9 L7,6 L12,1 Z'/></svg>")`,
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%230D2614' xmlns='http://www.w3.org/2000/svg'><path d='M12 22C12 22 20 18 20 10C20 6 16 2 12 2C8 2 4 6 4 10C4 18 12 22 12 22Z'/></svg>")`
        ];

        for (let i = 0; i < 18; i++) {
            const leaf = document.createElement('div');
            leaf.classList.add('leaf');
            leaf.style.backgroundImage = leafIcons[Math.floor(Math.random() * leafIcons.length)];
            leaf.style.left = Math.random() * 100 + 'vw';
            const size = 15 + Math.random() * 25;
            leaf.style.width = size + 'px';
            leaf.style.height = size + 'px';
            leaf.style.animationDuration = (12 + Math.random() * 18) + 's';
            leaf.style.animationDelay = (Math.random() * -20) + 's';
            ambientBg.appendChild(leaf);
        }
    }

    // Handle initial route from URL hash
    handleRoute();

    // Listen for hash changes (browser back/forward buttons)
    window.addEventListener('hashchange', handleRoute);

    // Search – overlay approach
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearchOverlayInput);

    // Ctrl+K shortcut to open search
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearchOverlay();
        }
        if (e.key === 'Escape') {
            if (document.getElementById('searchOverlay').classList.contains('active')) {
                closeSearchOverlay();
            } else {
                closeAllModals();
                closeExpandedPost();
            }
        }
        // Arrow key navigation in autocomplete
        if (document.getElementById('searchOverlay').classList.contains('active')) {
            handleSearchKeyNav(e);
        }
    });



    // Logo click → home
    document.getElementById('logo').addEventListener('click', () => navigate('home'));

    // Scroll to top button visibility (throttled via rAF)
    const scrollBtn = document.getElementById('scrollToTop');
    let scrollRafPending = false;
    window.addEventListener('scroll', () => {
        if (scrollRafPending) return;
        scrollRafPending = true;
        requestAnimationFrame(() => {
            updateScrollToTopVisibility();
            scrollRafPending = false;
        });
    }, { passive: true });
});

// ── Scroll to Top ──
function updateScrollToTopVisibility() {
    const scrollBtn = document.getElementById('scrollToTop');
    if (!scrollBtn) return;
    scrollBtn.classList.toggle('visible', currentPage !== 'home' && window.scrollY > 300);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Mobile Bottom Nav Actions ──
function mobileNavAction() {
    if (currentUser) {
        openModal('newPostModal');
    } else {
        openModal('loginModal');
    }
}

function mobileNavProfile() {
    if (currentUser) {
        navigate('profile');
    } else {
        openModal('loginModal');
    }
}

// ── Seed Data ──
function seedData() {
    const demoUsers = [
        { id: 'u1', username: 'ProGamer42', email: 'pro@lvlup.com', password: '123456', joinDate: '2025-11-10T10:00:00Z' },
        { id: 'u2', username: 'PixelHunter', email: 'pixel@lvlup.com', password: '123456', joinDate: '2025-12-01T10:00:00Z' },
        { id: 'u3', username: 'NeoKnight', email: 'neo@lvlup.com', password: '123456', joinDate: '2026-01-05T10:00:00Z' },
        { id: 'u4', username: 'CyberWolf', email: 'cyber@lvlup.com', password: '123456', joinDate: '2026-01-15T10:00:00Z' },
        { id: 'u5', username: 'StarForge', email: 'star@lvlup.com', password: '123456', joinDate: '2026-02-01T10:00:00Z' },
    ];

    const demoPosts = [
        {
            id: 'p1',
            userId: 'u1',
            title: 'GTA 6 İçin Yeni Oynanış Videosu Yayınlandı!',
            content: 'Rockstar Games, merakla beklenen GTA 6 için yepyeni bir oynanış videosu yayınladı. Video, Vice City\'nin modern yorumunu ve geliştirilmiş fizik motorunu gözler önüne seriyor. Karakterlerin yüz ifadeleri, araç hasarı modeli ve açık dünya detayları hayranları büyüledi. Oyunun 2026 sonbaharında çıkması bekleniyor.',
            category: 'fps',
            tags: ['#GTA6', '#RockstarGames', '#OpenWorld'],
            imageUrl: DEMO_POST_IMAGE_MAP.p1,
            likes: ['u2', 'u3', 'u4', 'u5'],
            comments: [
                { id: 'c1', userId: 'u2', text: 'Sonunda gerçek oynanış! Grafiklere inanamıyorum 🤯', date: '2026-02-22T14:30:00Z', likes: ['u1', 'u3'] },
                { id: 'c2', userId: 'u3', text: 'Vice City geri dönüyor! 80ler vibeı tam hissediliyor.', date: '2026-02-22T15:10:00Z', likes: ['u4'] },
                { id: 'c3', userId: 'u4', text: 'Fizik motoru muhteşem görünüyor, araçların hasar modeli çok gerçekçi.', date: '2026-02-22T16:00:00Z', likes: [] },
                { id: 'c4', userId: 'u5', text: 'Online modu da bu seviyeyse saatlerce oynarım.', date: '2026-02-22T17:30:00Z', likes: ['u1'] },
            ],
            date: '2026-02-22T12:00:00Z',
        },
        {
            id: 'p2',
            userId: 'u2',
            title: 'Elden Ring DLC: Shadow of the Erdtree İnceleme',
            content: 'FromSoftware bir kez daha hayal gücünün sınırlarını zorladı. Shadow of the Erdtree DLC\'si, ana oyunun sunduğu deneyimi yepyeni bölgeler, patronlar ve mekaniklerle zenginleştiriyor. Yeni silah türleri ve büyülerin eklenmesiyle savaş sistemi daha da derinleşti. Zorluk seviyesine rağmen, her anı ödüllendirici hissettiren bir başyapıt.',
            category: 'rpg',
            tags: ['#EldenRing', '#FromSoftware', '#RPG'],
            imageUrl: DEMO_POST_IMAGE_MAP.p2,
            likes: ['u1', 'u3', 'u5'],
            comments: [
                { id: 'c5', userId: 'u1', text: 'Son boss\'u 50 denemede geçtim ama her saniyesine değdi! 💀', date: '2026-02-21T09:00:00Z', likes: ['u2', 'u5'] },
                { id: 'c6', userId: 'u5', text: 'DLC\'deki yeni bölgelerin art direction\'ı muhteşem.', date: '2026-02-21T10:30:00Z', likes: ['u3'] },
            ],
            date: '2026-02-21T08:00:00Z',
        },
        {
            id: 'p3',
            userId: 'u3',
            title: 'Valorant Champions Tour 2026 Başlıyor',
            content: 'Riot Games, Valorant Champions Tour 2026 sezonunun detaylarını açıkladı. Bu yıl turnuva formatı tamamen yenileniyor: daha fazla bölgesel lig, genişletilmiş takım havuzu ve rekor düzeyde ödül havuzu. Türk takımlarının da yer alacağı EMEA liginde heyecan dorukta. İlk maçlar Mart ayında başlayacak.',
            category: 'moba',
            tags: ['#Valorant', '#VCT2026', '#ESports'],
            imageUrl: DEMO_POST_IMAGE_MAP.p3,
            likes: ['u1', 'u2'],
            comments: [
                { id: 'c7', userId: 'u1', text: 'Türk takımları bu sene şampiyon olur inşallah! 🇹🇷', date: '2026-02-20T11:00:00Z', likes: ['u3', 'u4', 'u5'] },
                { id: 'c8', userId: 'u4', text: 'Yeni format çok daha adil görünüyor, beğendim.', date: '2026-02-20T12:30:00Z', likes: [] },
                { id: 'c9', userId: 'u2', text: 'Ödül havuzu ne kadar büyümüş, inanılmaz! 💰', date: '2026-02-20T13:00:00Z', likes: ['u1'] },
            ],
            date: '2026-02-20T10:00:00Z',
        },
        {
            id: 'p4',
            userId: 'u4',
            title: 'PS6 Teknik Özellikleri Sızdırıldı!',
            content: 'Sony\'nin yeni nesil konsolu PlayStation 6\'nın teknik özellikleri sızdırıldı. AMD\'nin yeni Zen 6 mimarisine dayalı özel bir işlemci, RDNA 5 grafik kartı ve 2TB SSD ile gelecek olan konsol, 8K oyun deneyimi sunmayı hedefliyor. Ayrıca geriye dönük uyumluluk PS1\'e kadar genişletilecek.',
            category: 'genel',
            tags: ['#PS6', '#PlayStation', '#Sony', '#NextGen'],
            imageUrl: DEMO_POST_IMAGE_MAP.p4,
            likes: ['u1', 'u2', 'u3', 'u5'],
            comments: [
                { id: 'c10', userId: 'u1', text: '8K oyun oynayabilecek miyiz gerçekten? Heyecanlandım! 🎮', date: '2026-02-19T16:00:00Z', likes: ['u4'] },
                { id: 'c11', userId: 'u5', text: 'PS1 geriye dönük uyumluluk müthiş olur, nostalji!', date: '2026-02-19T17:00:00Z', likes: ['u2', 'u3'] },
                { id: 'c12', userId: 'u3', text: 'Fiyatı ne olacak acaba? 💸', date: '2026-02-19T18:00:00Z', likes: [] },
            ],
            date: '2026-02-19T15:00:00Z',
        },
        {
            id: 'p5',
            userId: 'u5',
            title: 'Nintendo Switch 2: İlk İzlenimler',
            content: 'Nintendo\'nun yeni nesil konsolu Switch 2 resmi olarak tanıtıldı. OLED ekranının 8 inçe büyütüldüğü, DLSS destekli özel NVIDIA çipine sahip konsol, AAA oyunları taşınabilir formda sunabilecek. Mario, Zelda ve Metroid gibi sevilen serilerin lansman oyunları olarak geleceği doğrulandı.',
            category: 'genel',
            tags: ['#NintendoSwitch2', '#Nintendo', '#Gaming'],
            imageUrl: DEMO_POST_IMAGE_MAP.p5,
            likes: ['u1', 'u3'],
            comments: [
                { id: 'c13', userId: 'u1', text: 'Nintendo bir kez daha oyun değiştirici bir ürün sunuyor!', date: '2026-02-18T14:00:00Z', likes: ['u5'] },
                { id: 'c14', userId: 'u3', text: 'Yeni Zelda lansmanda gelirse gün 1 alırım 🗡️', date: '2026-02-18T15:00:00Z', likes: ['u1', 'u5'] },
            ],
            date: '2026-02-18T12:00:00Z',
        },
        {
            id: 'p6',
            userId: 'u1',
            title: 'Fortnite Chapter 6 Season 2 Haritası Gösterildi',
            content: 'Epic Games, Fortnite\'ın yeni sezonuyla haritada büyük değişiklikler yapacağını duyurdu. Tamamen yenilenen biom sistemi, su altı keşif mekanikleri ve yıkılabilir yapıların genişletilmesi oyuncuları bekliyor. Yeni sezon ayrıca Marvel ve DC evreninden karakter crossover\'ları ile dikkat çekiyor.',
            category: 'battle-royale',
            tags: ['#Fortnite', '#BattleRoyale', '#EpicGames'],
            imageUrl: DEMO_POST_IMAGE_MAP.p6,
            likes: ['u2', 'u4'],
            comments: [
                { id: 'c15', userId: 'u2', text: 'Su altı mekaniği harika olabilir, merak ediyorum!', date: '2026-02-17T10:00:00Z', likes: [] },
            ],
            date: '2026-02-17T09:00:00Z',
        },
        {
            id: 'p7',
            userId: 'u2',
            title: 'Indie Oyun "Hollow Abyss" Steam\'de Zirveye Çıktı',
            content: '3 kişilik bağımsız bir stüdyo tarafından geliştirilen metroidvania türündeki "Hollow Abyss", Steam\'de tüm zamanların en iyi inceleme puanına sahip oyun oldu. El çizimi sanat stili, etkileyici müzikleri ve derin hikaesiyle oyuncuları büyüleyen yapım, indie oyunların gücünü bir kez daha kanıtladı.',
            category: 'indie',
            tags: ['#HollowAbyss', '#IndieGame', '#Metroidvania'],
            imageUrl: DEMO_POST_IMAGE_MAP.p7,
            likes: ['u1', 'u3', 'u4', 'u5'],
            comments: [
                { id: 'c16', userId: 'u3', text: 'Sanat stili inanılmaz, her kare bir tablo gibi 🎨', date: '2026-02-16T11:00:00Z', likes: ['u2', 'u1'] },
                { id: 'c17', userId: 'u4', text: 'Müzikleri Spotify\'da da dinliyorum, o kadar iyi!', date: '2026-02-16T12:30:00Z', likes: ['u5'] },
                { id: 'c18', userId: 'u1', text: 'İndie oyunlar AAA\'yı geçiyor artık, helal olsun!', date: '2026-02-16T14:00:00Z', likes: ['u3'] },
            ],
            date: '2026-02-16T10:00:00Z',
        },
        {
            id: 'p8',
            userId: 'u4',
            title: 'Civilization VII Strateji Oyunlarını Yeniden Tanımlıyor',
            content: 'Firaxis Games\'in yeni strateji oyunu Civilization VII, serinin köklü mekaniklerini modernize ederek büyük beğeni topluyor. Dinamik iklim sistemi, geliştirilmiş diplomasi mekanikleri ve yapay zeka iyileştirmeleri oyunu öncekilerden ayıran özellikler. Modding desteği de oyunun ömrünü uzatacak.',
            category: 'strateji',
            tags: ['#Civilization7', '#Strateji', '#4XGames'],
            imageUrl: DEMO_POST_IMAGE_MAP.p8,
            likes: ['u1', 'u2', 'u5'],
            comments: [
                { id: 'c19', userId: 'u5', text: '"Bir tur daha" sendromu geri döndü, 14 saat aralıksız oynadım 😅', date: '2026-02-15T20:00:00Z', likes: ['u4', 'u1'] },
                { id: 'c20', userId: 'u1', text: 'Diplomasi sistemi artık gerçekçi, çok beğendim.', date: '2026-02-15T21:00:00Z', likes: [] },
            ],
            date: '2026-02-15T18:00:00Z',
        },
    ];

    allUsers = demoUsers;
    allPosts = demoPosts;
    setStore(STORAGE_KEYS.users, allUsers);
    setStore(STORAGE_KEYS.posts, allPosts);
    rebuildUserMap();
}

// ── Auth UI Update ──
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        const initial = currentUser.username.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        let avatarSrc = '';
        if (currentUser.avatarImage) {
            avatarSrc = `background-image: url('${currentUser.avatarImage}'); background-size: cover; background-position: center; border:none; color: transparent;`;
            document.getElementById('userAvatar').innerHTML = '';
        } else {
            const gradientIdx = currentUser.avatarGradient !== undefined ? currentUser.avatarGradient : (parseInt(currentUser.id.replace('u', '')) % AVATAR_GRADIENTS.length);
            avatarSrc = `background: ${AVATAR_GRADIENTS[gradientIdx]};`;
            document.getElementById('userAvatar').textContent = initial;
        }
        document.getElementById('userAvatar').style.cssText = avatarSrc;
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// ── Auth Handlers ──
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const user = allUsers.find(u => u.email === email && u.password === password);
    if (!user) {
        showToast('E-posta veya şifre hatalı!', 'error');
        return;
    }

    currentUser = user;
    setStore(STORAGE_KEYS.currentUser, currentUser);
    updateAuthUI();
    closeModal('loginModal');
    showToast(`Hoş geldin, ${user.username}! 🎮`, 'success');
    document.getElementById('loginForm').reset();
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;

    if (password !== confirm) {
        showToast('Şifreler eşleşmiyor!', 'error');
        return;
    }

    if (allUsers.find(u => u.email === email)) {
        showToast('Bu e-posta zaten kayıtlı!', 'error');
        return;
    }

    if (allUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        showToast('Bu kullanıcı adı zaten alınmış!', 'error');
        return;
    }

    const newUser = {
        id: 'u' + Date.now(),
        username,
        email,
        password,
        joinDate: new Date().toISOString(),
    };

    allUsers.push(newUser);
    setStore(STORAGE_KEYS.users, allUsers);
    rebuildUserMap();
    currentUser = newUser;
    setStore(STORAGE_KEYS.currentUser, currentUser);
    updateAuthUI();
    closeModal('registerModal');
    showToast(`Kayıt başarılı! Hoş geldin, ${username}! 🚀`, 'success');
    document.getElementById('registerForm').reset();
}

function logout() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    updateAuthUI();

    showToast('Çıkış yapıldı. Görüşürüz! 👋', 'info');

    // Profilden çıkış yapılırsa ana sayfaya yönlendir
    if (window.location.hash.includes('#profile')) {
        navigate('home');
    } else {
        refreshCurrentView();
    }
}

// ── Hash-Based Routing ──
let isRouting = false;

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';

    // Check if it's a category route (e.g., #category/fps)
    if (hash.startsWith('category/')) {
        const cat = hash.split('/')[1];
        if (cat) {
            isRouting = true;
            filterCategory(cat);
            isRouting = false;
            return;
        }
    }

    // Otherwise it's a page route
    const validPages = ['home', 'popular', 'games', 'reviews', 'profile', 'browser-games'];
    // Handle search route
    if (hash.startsWith('search')) {
        const query = hash.split('?q=')[1];
        if (query) {
            isRouting = true;
            navigate('search');
            renderSearchResultsPage(decodeURIComponent(query));
            isRouting = false;
            return;
        }
    }
    const page = validPages.includes(hash) ? hash : 'home';

    isRouting = true;
    navigate(page);
    isRouting = false;
}

// ── Navigation ──
function navigate(page) {
    // Update hash (skip if already routing from hashchange)
    if (!isRouting) {
        const newHash = page === 'home' ? '#home' : `#${page}`;
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
            return; // hashchange will trigger handleRoute → navigate
        }
    }

    currentPage = page;
    currentCategory = null;
    updateScrollToTopVisibility();

    // Disconnect reviews infinite scroll when leaving reviews
    if (page !== 'reviews' && reviewsScrollObserver) {
        reviewsScrollObserver.disconnect();
        reviewsScrollObserver = null;
    }

    // Update navigation active state
    document.querySelectorAll('[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.sidebar-item[data-category]').forEach(el => {
        el.classList.remove('active');
    });

    // Update mobile bottom nav active state
    const mbnMap = { home: 'mbnHome', games: 'mbnGames', 'browser-games': 'mbnBrowserGames', profile: 'mbnProfile' };
    document.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
    if (mbnMap[page]) document.getElementById(mbnMap[page])?.classList.add('active');

    const titles = {
        home: 'Ana Sayfa',
        popular: 'Popüler',
        games: 'Oyunlar',
        profile: 'Profilim',
        reviews: 'İncelemeler',
        'browser-games': 'Hazır Oyunlar',
    };

    const icons = {
        home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        popular: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>',
        reviews: '<circle cx="12" cy="8" r="6"></circle><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>'
    };

    // Toggle Trending Section and Feed Tabs (Show only on popular)
    const trendSect = document.getElementById('trendingSection');
    const tabsSect = document.getElementById('feedTabsContainer');
    if (trendSect) trendSect.style.display = (page === 'popular') ? 'block' : 'none';
    if (tabsSect) tabsSect.style.display = (page === 'popular') ? 'block' : 'none';

    // Toggle between feed, games and profile page with animation
    const feed = document.getElementById('feed');
    const gamesPage = document.getElementById('gamesPage');
    const profilePage = document.getElementById('profilePage');
    const browserGamesPage = document.getElementById('browserGamesPage');
    const searchResultsPage = document.getElementById('searchResultsPage');
    const allPageEls = [feed, gamesPage, profilePage, browserGamesPage, searchResultsPage];
    const outgoing = allPageEls.find(p => p && p.style.display !== 'none' && p.offsetParent !== null) || feed;

    let incoming = feed;
    if (page === 'games') incoming = gamesPage;
    else if (page === 'profile') incoming = profilePage;
    else if (page === 'browser-games') incoming = browserGamesPage;
    else if (page === 'search') incoming = searchResultsPage;

    // Helper: set up the new page content and play enter animation
    const showIncoming = () => {
        // Hide sidebar for non-home pages
        const homeSidebar = document.getElementById('homeSidebar');
        const mainLayout = document.getElementById('mainLayout');
        if (page !== 'home' && page !== 'popular' && page !== 'reviews') {
            if (homeSidebar) homeSidebar.style.display = 'none';
            if (mainLayout) mainLayout.classList.remove('has-sidebar');
        }

        if (page === 'games') {
            gamesPage.style.display = 'block';
            if (!hasLoadedGamesCatalog) {
                resetGamesPageState();
                loadGames();
            } else {
                renderGamesGrid();
            }
            setupGamesInfiniteScroll();
        } else if (page === 'profile') {
            profilePage.style.display = 'block';
            renderProfilePage();
        } else if (page === 'browser-games') {
            browserGamesPage.style.display = 'block';
            renderBrowserGamesGrid();
        } else if (page === 'search') {
            searchResultsPage.style.display = 'block';
        } else {
            feed.style.display = '';
            document.getElementById('feedTitleText').textContent = (titles[page] || 'Ana Sayfa').toUpperCase();
            const feedIcon = document.getElementById('feedTitleIcon');
            if (feedIcon) {
                feedIcon.innerHTML = icons[page] || icons['home'];
            }
            renderFeed();
        }

        incoming.classList.remove('page-enter');
        void incoming.offsetWidth;
        incoming.classList.add('page-enter');
        incoming.addEventListener('animationend', () => incoming.classList.remove('page-enter'), { once: true });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Always: exit current → switch → enter new
    outgoing.classList.remove('page-enter', 'page-exit');
    outgoing.classList.add('page-exit');

    outgoing.addEventListener('animationend', () => {
        outgoing.classList.remove('page-exit');

        // If switching containers, hide old and show new
        if (outgoing !== incoming) {
            outgoing.style.display = 'none';
        }

        showIncoming();
    }, { once: true });
}

function filterCategory(cat) {
    // Update hash (skip if already routing from hashchange)
    if (!isRouting) {
        const newHash = `#category/${cat}`;
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
            return; // hashchange will trigger handleRoute → filterCategory
        }
    }

    currentCategory = cat;
    currentPage = 'home';

    document.querySelectorAll('.sidebar-item[data-page]').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-item[data-category]').forEach(el => {
        el.classList.toggle('active', el.dataset.category === cat);
    });

    const catNames = {
        fps: 'FPS', rpg: 'RPG', moba: 'MOBA',
        'battle-royale': 'Battle Royale', indie: 'Indie', strateji: 'Strateji',
    };

    const feed = document.getElementById('feed');
    const gamesPage = document.getElementById('gamesPage');

    const showFeed = () => {
        feed.style.display = '';
        document.getElementById('feedTitleText').textContent = (catNames[cat] || cat).toUpperCase();
        const feedIcon = document.getElementById('feedTitleIcon');
        if (feedIcon) {
            feedIcon.innerHTML = '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>';
        }
        renderFeed();
        feed.classList.remove('page-enter');
        void feed.offsetWidth;
        feed.classList.add('page-enter');
        feed.addEventListener('animationend', () => feed.classList.remove('page-enter'), { once: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // If games or profile page is visible, animate it out first
    const profilePage2 = document.getElementById('profilePage');
    const visibleAlt = [gamesPage, profilePage2].find(p => p.style.display !== 'none' && p.offsetParent !== null);
    if (visibleAlt) {
        visibleAlt.classList.add('page-exit');
        visibleAlt.addEventListener('animationend', () => {
            visibleAlt.classList.remove('page-exit');
            visibleAlt.style.display = 'none';
            showFeed();
        }, { once: true });
    } else {
        showFeed();
    }
}

function sortFeed(sort) {
    currentSort = sort;
    document.querySelectorAll('.feed-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.sort === sort);
    });
    renderFeed();
}

// ── Render Feed ──
function refreshCurrentView() {
    const profilePage = document.getElementById('profilePage');
    const isProfileVisible = profilePage && profilePage.style.display !== 'none' && profilePage.offsetParent !== null;

    if (isProfileVisible) {
        renderProfilePage();
    } else {
        renderFeed();
    }
}

function renderFeed() {
    let posts = [...allPosts];

    // Filter by page
    if (currentPage === 'popular') {
        posts = sortPostsByPopularity(posts);
    } else if (currentPage === 'reviews') {
        // show all posts, newest first — handled below
    } else if (currentPage === 'games') {
        posts = posts.filter(p => !['genel'].includes(p.category));
    }

    // Filter by category
    if (currentCategory) {
        posts = posts.filter(p => p.category === currentCategory);
    }

    // Sort
    if (currentSort === 'newest') {
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (currentSort === 'hot') {
        posts = sortPostsByPopularity(posts);
    } else if (currentSort === 'discussed') {
        posts.sort((a, b) => b.comments.length - a.comments.length);
    }

    const container = document.getElementById('postsContainer');
    const feed = document.getElementById('feed');
    const sidebar = document.getElementById('homeSidebar');
    const mainLayout = document.getElementById('mainLayout');

    if (posts.length === 0) {
        if (feed) feed.classList.remove('home-pinterest-mode');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎮</div>
                <h3>Henüz gönderi yok</h3>
                <p>Bu kategoride henüz bir gönderi bulunmuyor. İlk haberi sen paylaş!</p>
            </div>
        `;
        return;
    }

    const isHomeFeed = (currentPage === 'home' || !currentPage) && !currentCategory;
    const isReviewsFeed = currentPage === 'reviews';

    if (isHomeFeed && posts.length > 0) {
        if (feed) feed.classList.add('home-pinterest-mode');
        if (sidebar) sidebar.style.display = 'none';
        if (mainLayout) mainLayout.classList.remove('has-sidebar');
        container.innerHTML = renderPinterestHome(posts);
        ensureHomeHeroGamesLoaded();
    } else if (isReviewsFeed) {
        if (feed) feed.classList.add('home-pinterest-mode');
        if (sidebar) sidebar.style.display = 'none';
        if (mainLayout) mainLayout.classList.remove('has-sidebar');
        // Sort by newest first
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        reviewsDisplayCount = REVIEWS_PAGE_SIZE;
        container.innerHTML = renderPinterestReviews(posts, reviewsDisplayCount);
        setupReviewsInfiniteScroll(posts);
    } else {
        if (feed) feed.classList.remove('home-pinterest-mode');
        container.innerHTML = posts.map(post => renderPostCard(post)).join('');
        if (sidebar) sidebar.style.display = 'none';
        if (mainLayout) mainLayout.classList.remove('has-sidebar');
    }
}

function renderPinterestHome(posts) {
    const bookmarkCountMap = buildBookmarkCountMap();
    const popularPosts = [...posts].sort((a, b) => comparePostsByPopularity(a, b, bookmarkCountMap));
    const tags = [...new Set(popularPosts.flatMap(post => post.tags || []))].slice(0, 8);

    return `
        <section class="pinterest-home-shell">
            <div class="pinterest-hero-card">
                <div class="pinterest-hero-copy">
                    <span class="pinterest-eyebrow">İlham al • keşfet • kaydet</span>
                    <h2>Oyun dünyasında ilgini çeken her şeyi keşfet.</h2>
                    <p>
                        LvlUp; oyun dünyasının öne çıkan haberlerini, taze incelemelerini, keşfedilecek yapımlarını ve topluluk enerjisini aynı yerde buluşturur. Giriş yapmasan bile burada gezinebilirsin.
                    </p>
                    <div class="pinterest-topic-row">
                        ${tags.map(tag => `<button class="pinterest-topic-chip" onclick="openSearchOverlay()">${escapeHtml(tag)}</button>`).join('')}
                    </div>
                </div>
                <div class="pinterest-hero-stack">
                    ${renderPinterestHomeHeroGames()}
                </div>
            </div>

            <div class="pinterest-masonry-grid">
                ${popularPosts.slice(0, 8).map((post, index) => renderPinterestPin(post, index, bookmarkCountMap)).join('')}
            </div>
        </section>`;
}

function renderPinterestReviews(posts, count) {
    const bookmarkCountMap = buildBookmarkCountMap();
    const visible = posts.slice(0, count);
    const hasMore = count < posts.length;
    return `
        <section class="pinterest-home-shell reviews-pinterest-shell">
            <div class="pinterest-masonry-grid">
                ${visible.map((post, index) => renderPinterestPin(post, index, bookmarkCountMap)).join('')}
            </div>
            ${hasMore ? '<div id="reviewsScrollSentinel" class="reviews-scroll-sentinel"></div>' : ''}
        </section>`;
}

function setupReviewsInfiniteScroll(allReviewPosts) {
    if (reviewsScrollObserver) {
        reviewsScrollObserver.disconnect();
        reviewsScrollObserver = null;
    }

    const sentinel = document.getElementById('reviewsScrollSentinel');
    if (!sentinel) return;

    reviewsScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            reviewsScrollObserver.disconnect();
            reviewsScrollObserver = null;

            reviewsDisplayCount += REVIEWS_PAGE_SIZE;
            const bookmarkCountMap = buildBookmarkCountMap();
            const shell = document.querySelector('.reviews-pinterest-shell');
            if (!shell) return;

            const grid = shell.querySelector('.pinterest-masonry-grid');
            const newPosts = allReviewPosts.slice(reviewsDisplayCount - REVIEWS_PAGE_SIZE, reviewsDisplayCount);
            newPosts.forEach((post, i) => {
                const div = document.createElement('div');
                div.innerHTML = renderPinterestPin(post, reviewsDisplayCount - REVIEWS_PAGE_SIZE + i, bookmarkCountMap);
                const article = div.firstElementChild;
                if (article) grid.appendChild(article);
            });

            // Remove old sentinel and add new one if more remain
            const oldSentinel = document.getElementById('reviewsScrollSentinel');
            if (oldSentinel) oldSentinel.remove();

            if (reviewsDisplayCount < allReviewPosts.length) {
                const newSentinel = document.createElement('div');
                newSentinel.id = 'reviewsScrollSentinel';
                newSentinel.className = 'reviews-scroll-sentinel';
                shell.appendChild(newSentinel);
                setupReviewsInfiniteScroll(allReviewPosts);
            }
        });
    }, { root: null, rootMargin: '400px', threshold: 0 });

    reviewsScrollObserver.observe(sentinel);
}

function renderPinterestHomeHeroGames() {
    const cards = getHomeHeroCardSequence();
    return cards.map((item, index) => renderPinterestSpotlightGame(item, index)).join('');
}

function getHomeHeroCardSequence() {
    const newest = homeHeroGames.newest || [];
    const newestIds = new Set(newest.map((game) => String(game.id)));
    const popular = getHomePopularGames(3, newestIds);

    if (!newest.length && !popular.length) {
        return Array.from({ length: 5 }, (_, index) => ({ kind: 'placeholder', id: `hero-placeholder-${index}` }));
    }

    return [
        newest[0] || popular[0] || null,
        popular[0] || newest[0] || null,
        popular[1] || newest[1] || popular[0] || null,
        newest[1] || newest[0] || popular[1] || null,
        popular[2] || popular[1] || newest[1] || null,
    ].map((game, index) => game ? { kind: index === 0 || index === 3 ? 'newest' : 'popular', game } : { kind: 'placeholder', id: `hero-fallback-${index}` });
}

function renderPinterestSpotlightGame(item, index) {
    if (!item || item.kind === 'placeholder' || !item.game) {
        return `
            <article class="pinterest-spotlight-card spotlight-${index + 1} is-placeholder">
                <div class="pinterest-spotlight-media no-image">
                    <div class="pinterest-spotlight-fallback">RAWG</div>
                </div>
                <div class="pinterest-spotlight-overlay">
                    <span>${homeHeroGames.error ? 'Bağlantı' : 'Yükleniyor'}</span>
                    <strong>${homeHeroGames.error ? 'Oyunlar şu an alınamadı' : 'Oyunlar hazırlanıyor...'}</strong>
                </div>
            </article>`;
    }

    const { game, kind } = item;
    const image = game.backgroundUrl || game.coverUrl;
    const kicker = kind === 'newest' ? 'En Yeni' : 'Popüler';
    const subLabel = game.genres && game.genres.length > 0
        ? game.genres[0]
        : (game.platforms && game.platforms.length > 0 ? game.platforms[0] : 'Oyun');
    const gamePopularity = getGamePopularityEntry(game.id);
    const meta = kind === 'newest'
        ? (game.released ? formatGameReleaseDate(game.released) : (game.releaseYear || 'TBA'))
        : ((gamePopularity && gamePopularity.visitCount > 0)
            ? `${gamePopularity.visitCount.toLocaleString('tr-TR')} kez acildi`
            : `${Math.max(0, game.added || 0).toLocaleString('tr-TR')} takip`);
    const imageMarkup = image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(game.title)}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-image')">`
        : `<div class="pinterest-spotlight-fallback">${escapeHtml(subLabel)}</div>`;

    return `
        <article class="pinterest-spotlight-card spotlight-${index + 1}" onclick="openGameDetail('${game.id}')">
            <div class="pinterest-spotlight-media">${imageMarkup}</div>
            <div class="pinterest-spotlight-overlay">
                <span>${escapeHtml(kicker)}</span>
                <strong>${escapeHtml(game.title)}</strong>
                <small>${escapeHtml(subLabel)} • ${escapeHtml(String(meta))}</small>
            </div>
        </article>`;
}

function mergeGamesIntoLibrary(games) {
    games.forEach((game) => {
        if (!game || !game.id) return;
        const existingIndex = allGames.findIndex((item) => item.id === game.id);
        if (existingIndex === -1) {
            allGames.push(game);
        } else {
            allGames[existingIndex] = { ...allGames[existingIndex], ...game };
        }
    });
}

function resetGamesPageState() {
    currentGameFilter = 'all';
    currentGameSearch = '';
    allGames = [];
    gamesNextPageUrl = null;

    document.querySelectorAll('.games-filter-chip').forEach((el) => {
        el.classList.toggle('active', el.dataset.filter === 'all');
    });

    const searchInput = document.getElementById('gamesSearchInput');
    if (searchInput) searchInput.value = '';

    const advFieldDefaults = {
        advGenre: '',
        advPlatform: '',
        advOrdering: '',
        advGameMode: '',
        advMinRating: '',
        advMaxRating: '',
        advYearFrom: '',
        advYearTo: '',
    };

    Object.entries(advFieldDefaults).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });

    advFilters = { genre: '', platform: '', ordering: '', gameMode: '', minRating: 0, maxRating: 0, yearFrom: '', yearTo: '' };
    updateAdvFilterTags();
}

function formatGameReleaseDate(dateStr) {
    if (!dateStr) return 'TBA';
    try {
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

function getDateBeforeToday({ years = 0, months = 0, days = 0 } = {}) {
    const date = new Date();
    if (years) date.setFullYear(date.getFullYear() - years);
    if (months) date.setMonth(date.getMonth() - months);
    if (days) date.setDate(date.getDate() - days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateForApi(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCurrentWeekDateRange() {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(today);
    start.setDate(today.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        start: formatDateForApi(start),
        end: formatDateForApi(end),
    };
}

function isValidHomeHeroRawgGame(game) {
    return Boolean(
        game &&
        game.name &&
        game.background_image &&
        game.released
    );
}

function dedupeMappedGames(games) {
    const seen = new Set();
    return games.filter((game) => {
        if (!game || !game.id || seen.has(game.id)) return false;
        seen.add(game.id);
        return true;
    });
}

async function fetchHomeHeroGames() {
    if (!RAWG_API_KEY) {
        homeHeroGames = { newest: [], popular: [], loading: false, loaded: true, error: true };
        return;
    }

    homeHeroGames.loading = true;
    homeHeroGames.error = false;

    try {
        const today = getTodayDate();
        const currentWeek = getCurrentWeekDateRange();
        const popularStartDate = getDateBeforeToday({ years: 3 });
        const newestUrl = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=20&ordering=-released&dates=${currentWeek.start},${currentWeek.end}`;
        const popularUrl = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=20&ordering=-added&dates=${popularStartDate},${today}`;

        const [newestRes, popularRes] = await Promise.all([
            fetch(newestUrl),
            fetch(popularUrl),
        ]);

        if (!newestRes.ok || !popularRes.ok) {
            throw new Error(`RAWG home hero fetch failed: ${newestRes.status}/${popularRes.status}`);
        }

        const [newestData, popularData] = await Promise.all([
            newestRes.json(),
            popularRes.json(),
        ]);

        const newestGames = dedupeMappedGames((newestData.results || [])
            .filter(isValidHomeHeroRawgGame)
            .map(mapRawgGame)
            .sort((a, b) => new Date(b.released || 0) - new Date(a.released || 0)))
            .slice(0, 2);

        const newestIds = new Set(newestGames.map((game) => game.id));
        const popularGames = dedupeMappedGames((popularData.results || [])
            .filter(isValidHomeHeroRawgGame)
            .map(mapRawgGame)
            .filter((game) => !newestIds.has(game.id))
            .sort((a, b) => (b.added || 0) - (a.added || 0)))
            .slice(0, 3);

        mergeGamesIntoLibrary([...newestGames, ...popularGames]);
        homeHeroGames = {
            newest: newestGames,
            popular: popularGames,
            loading: false,
            loaded: true,
            error: false,
        };
    } catch (error) {
        console.error('Ana sayfa RAWG oyunları alınamadı:', error);
        homeHeroGames = { newest: [], popular: [], loading: false, loaded: true, error: true };
    }
}

function ensureHomeHeroGamesLoaded() {
    if (currentPage !== 'home' || homeHeroGames.loading || homeHeroGames.loaded) return;

    fetchHomeHeroGames().then(() => {
        if (currentPage === 'home') {
            renderFeed();
        }
    });
}

function renderPinterestPin(post, index, bookmarkCountMap = buildBookmarkCountMap()) {
    const author = userMap.get(post.userId) || { username: 'Bilinmeyen', id: '' };
    const { bg, initial } = getAuthorStyle(author);
    const liked = currentUser && post.likes.includes(currentUser.id);
    const saved = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(post.id);
    const popularity = getPostPopularity(post, bookmarkCountMap);
    const hasImage = !!post.imageUrl;
    const pinSize = hasImage ? ['pin-tall', 'pin-medium', 'pin-short', 'pin-medium'][index % 4] : 'pin-text';

    const mediaBlock = hasImage ? `
            <div class="pinterest-pin-media" onclick="expandPost('${post.id}')">
                <img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.closest('.pinterest-pin-media').classList.add('fallback')">
                <div class="pinterest-pin-kicker">${escapeHtml(getCategoryName(post.category))} &bull; ${escapeHtml(popularity.label)}</div>
                <div class="pinterest-pin-hover">
                    <button class="pinterest-save-btn${saved ? ' saved' : ''}" onclick="bookmarkPost('${post.id}', event)" aria-label="${saved ? 'Kaydedildi' : 'Kaydet'}" title="${saved ? 'Kaydedildi' : 'Kaydet'}">
                        <svg viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <div class="pinterest-pin-hover-actions">
                        <button class="pinterest-round-btn" onclick="sharePost('${post.id}', event)" aria-label="Paylaş">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                        <button class="pinterest-round-btn" onclick="expandPost('${post.id}')" aria-label="Aç">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                        </button>
                    </div>
                </div>
            </div>` : '';

    const textKicker = !hasImage ? `<div class="pin-text-kicker">${escapeHtml(getCategoryName(post.category))} &bull; ${escapeHtml(popularity.label)}</div>` : '';
    const textActions = !hasImage ? `
            <div class="pin-text-hover-actions">
                <button class="pinterest-round-btn" onclick="sharePost('${post.id}', event)" aria-label="Paylaş">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button class="pinterest-round-btn" onclick="expandPost('${post.id}')" aria-label="Aç">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                </button>
            </div>` : '';

    return `
        <article class="pinterest-pin ${pinSize}" id="post-${post.id}">
            ${mediaBlock}
            <div class="pinterest-pin-body">
                ${textKicker}
                <h3 onclick="expandPost('${post.id}')">${escapeHtml(post.title)}</h3>
                <div class="md-body pinterest-pin-md" onclick="expandPost('${post.id}')">${renderMarkdown(post.content)}</div>
                ${textActions}
                <div class="pinterest-pin-footer">
                    <div class="pinterest-pin-author" onclick="expandPost('${post.id}')">
                        <div class="pinterest-author-avatar" style="${bg}">${initial}</div>
                        <span>@${escapeHtml(author.username)}</span>
                    </div>
                    <div class="pinterest-pin-stats">
                        <button class="pinterest-stat-btn${liked ? ' liked' : ''}" onclick="toggleLike('${post.id}', event)">
                            <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            <span>${post.likes.length}</span>
                        </button>
                        <button class="pinterest-stat-btn" onclick="expandPost('${post.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span>${post.comments.length}</span>
                        </button>
                        <button class="pinterest-stat-btn${saved ? ' saved' : ''}" onclick="bookmarkPost('${post.id}', event)">
                            <svg viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            <span>${popularity.bookmarkCount}</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>`;
}

function getAuthorStyle(author) {
    const idx = author.avatarGradient !== undefined
        ? author.avatarGradient
        : (author.id ? parseInt(author.id.replace('u', '')) % AVATAR_GRADIENTS_LIST.length : 0);
    if (author.avatarImage) {
        return { bg: `background-image:url('${author.avatarImage}');background-size:cover;background-position:center;`, initial: '' };
    }
    return { bg: `background:${AVATAR_GRADIENTS[idx] || AVATAR_GRADIENTS_LIST[idx]};`, initial: author.username.charAt(0).toUpperCase() };
}

function renderFeaturedPost(post) {
    const author = userMap.get(post.userId) || { username: 'Bilinmeyen', id: '' };
    const { bg, initial } = getAuthorStyle(author);
    const liked = currentUser && post.likes.includes(currentUser.id);
    const bookmarked = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(post.id);
    const likeCount = post.likes.length > 999 ? (post.likes.length / 1000).toFixed(1) + 'k' : post.likes.length;

    const top = post.imageUrl
        ? `<div class="fp-img-wrap" onclick="expandPost('${post.id}')">
               <img src="${escapeHtml(post.imageUrl)}" alt="" onerror="this.parentElement.style.display='none'">
               <div class="fp-author-overlay">
                   <div class="fp-avatar-wrap">
                       <div class="fp-avatar" style="${bg}">${initial}</div>
                       <div class="fp-online"></div>
                   </div>
                   <div class="fp-author-info">
                       <div class="fp-author-name">@${escapeHtml(author.username)}</div>
                       <div class="fp-author-role">${getCategoryName(post.category)}</div>
                   </div>
               </div>
           </div>`
        : `<div class="fp-noimg-header" onclick="expandPost('${post.id}')">
               <div class="fp-noimg-avatar" style="${bg}">${initial}</div>
               <div>
                   <div class="fp-noimg-name">@${escapeHtml(author.username)}</div>
                   <div class="fp-noimg-role">${getCategoryName(post.category)}</div>
               </div>
           </div>`;

    return `
    <article class="featured-post-card" id="post-${post.id}">
        ${top}
        <div class="fp-body" onclick="expandPost('${post.id}')">
            <div class="fp-title">${escapeHtml(post.title)}</div>
            <div class="fp-desc">${escapeHtml(post.content)}</div>
        </div>
        <div class="fp-actions">
            <div class="fp-actions-left">
                <button class="fp-btn${liked ? ' liked' : ''}" onclick="toggleLike('${post.id}',event)">
                    <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="${liked ? 'none' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>${likeCount}</span>
                </button>
                <button class="fp-btn" onclick="expandPost('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>${post.comments.length}</span>
                </button>
                <button class="fp-btn" onclick="sharePost('${post.id}',event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
            </div>
            <button class="fp-btn${bookmarked ? ' bookmarked' : ''}" onclick="bookmarkPost('${post.id}',event)">
                <svg viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
        </div>
    </article>`;
}

function renderMiniPostCard(post) {
    // artık kullanılmıyor – tüm home postlar renderFeaturedPost ile gösterilir
    return renderFeaturedPost(post);
}

function renderHomeSidebar(posts) {
    const sidebar = document.getElementById('homeSidebar');
    const mainLayout = document.getElementById('mainLayout');
    if (!sidebar) return;

    sidebar.style.display = 'flex';
    mainLayout.classList.add('has-sidebar');

    /* --- Trending tags --- */
    const tagScore = {}, tagCat = {};
    posts.forEach(p => p.tags.forEach(t => {
        tagScore[t] = (tagScore[t] || 0) + p.likes.length + 1;
        if (!tagCat[t]) tagCat[t] = getCategoryName(p.category);
    }));
    const top5 = Object.entries(tagScore).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const badges = ['+12%', 'Hot', 'New', 'Trend', 'Rising'];
    const trendList = document.getElementById('sidebarTrendList');
    if (trendList) {
        trendList.innerHTML = top5.length
            ? top5.map(([tag], i) => `
                <div class="sidebar-trend-item" onclick="openSearchOverlay()">
                    <div class="sidebar-trend-left">
                        <div class="sidebar-trend-category">${escapeHtml(tagCat[tag] || 'Genel')}</div>
                        <div class="sidebar-trend-tag">${escapeHtml(tag)}</div>
                    </div>
                    <span class="sidebar-trend-badge">${badges[i]}</span>
                </div>`).join('')
            : `<p style="font-size:.8rem;color:#64748b">Henüz trend yok</p>`;
    }

    /* --- Sidebar post previews hidden --- */
    const el = document.getElementById('sidebarFeaturedPost');
    if (el) el.style.display = 'none';
}

function renderPostCard(post) {
    const author = userMap.get(post.userId) || { username: 'Bilinmeyen', id: '' };
    const initial = author.username.charAt(0).toUpperCase();
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const isBookmarked = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(post.id);
    const timeAgo = getTimeAgo(post.date);
    const topComments = post.comments.slice(-2);

    const gradientIndex = author.avatarGradient !== undefined ? author.avatarGradient : (author.id ? parseInt(author.id.replace('u', '')) % AVATAR_GRADIENTS_LIST.length : 0);
    const customAvatarStyle = author.avatarImage
        ? `background-image: url('${author.avatarImage}'); background-size: cover; background-position: center;`
        : `background: ${AVATAR_GRADIENTS[gradientIndex] || AVATAR_GRADIENTS_LIST[gradientIndex]};`;
    const avatarContent = author.avatarImage ? '' : initial;

    let commentsPreview = '';
    if (topComments.length > 0) {
        const commentsHtml = topComments.map(c => {
            const cAuthor = userMap.get(c.userId) || { username: 'Bilinmeyen' };
            return `<div class="preview-comment">
                <span class="preview-comment-author">${escapeHtml(cAuthor.username)}</span>
                <span class="preview-comment-text">${escapeHtml(c.text)}</span>
            </div>`;
        }).join('');

        const totalComments = post.comments.length;
        commentsPreview = `
            <div class="post-comments-preview">
                ${commentsHtml}
                ${totalComments > 2 ? `<div class="view-all-comments" onclick="expandPost('${post.id}')">Tüm ${totalComments} yorumu gör</div>` : ''}
            </div>
        `;
    }

    return `
        <article class="post-card" id="post-${post.id}">
            ${post.imageUrl ? `
            <div class="post-hero" onclick="expandPost('${post.id}')">
                <img src="${escapeHtml(post.imageUrl)}" class="post-hero-img" alt="${escapeHtml(post.title)}" onerror="this.parentElement.classList.add('post-hero--hidden')">
                <div class="post-hero-gradient"></div>
                <div class="post-hero-author">
                    <div class="post-avatar" style="${customAvatarStyle}">${avatarContent}</div>
                    <div class="post-meta">
                        <div class="post-author">${escapeHtml(author.username)}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                    <span class="post-category-badge badge-${post.category}">${getCategoryName(post.category)}</span>
                </div>
            </div>
            ` : `
            <div class="post-header" onclick="expandPost('${post.id}')">
                <div class="post-avatar" style="${customAvatarStyle}">${avatarContent}</div>
                <div class="post-meta">
                    <div class="post-author">${escapeHtml(author.username)}</div>
                    <div class="post-time">${timeAgo}</div>
                </div>
                <span class="post-category-badge badge-${post.category}">${getCategoryName(post.category)}</span>
            </div>
            `}
            <div class="post-body" onclick="expandPost('${post.id}')">
                <div class="post-title">${escapeHtml(post.title)}</div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                ${post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="post-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', event)">
                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>${post.likes.length}</span>
                </button>
                <button class="action-btn" onclick="expandPost('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>${post.comments.length}</span>
                </button>
                <div class="action-spacer"></div>
                <button class="action-btn" onclick="sharePost('${post.id}', event)" title="Paylaş">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
                <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="bookmarkPost('${post.id}', event)" title="Kaydet">
                    <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            </div>
        </article>
    `;
}

// ── Expanded Post ──
function expandPost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const author = userMap.get(post.userId) || { username: 'Bilinmeyen' };
    const isLiked = currentUser && post.likes.includes(currentUser.id);

    const gradientIndex = author.id ? parseInt(author.id.replace('u', '')) % AVATAR_GRADIENTS_LIST.length : 0;
    const authorBg = AVATAR_GRADIENTS[gradientIndex] || AVATAR_GRADIENTS_LIST[gradientIndex] || 'linear-gradient(135deg,#2D5A43,#8FBC8F)';

    // Render expanded post content
    document.getElementById('expandedPost').innerHTML = `
        <div class="post-header">
            <div class="post-avatar" style="background:${authorBg}">${author.username.charAt(0).toUpperCase()}</div>
            <div class="post-meta">
                <div class="post-author">${escapeHtml(author.username)}</div>
                <div class="post-time">${getTimeAgo(post.date)} • ${new Date(post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <span class="post-category-badge badge-${post.category}">${getCategoryName(post.category)}</span>
        </div>
        <div class="post-title">${escapeHtml(post.title)}</div>
        ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" class="post-image" alt="${escapeHtml(post.title)}" onerror="this.style.display='none'">` : ''}
        ${post.gameRef ? `<div class="post-game-ref"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/></svg>${escapeHtml(post.gameRef)}</div>` : ''}
        ${post.videoUrl && !post.imageUrl ? `<video class="post-image" src="${escapeHtml(post.videoUrl)}" controls style="width:100%;border-radius:12px;"></video>` : ''}
        <div class="post-content md-body">${renderMarkdown(post.content)}</div>
        ${post.tags.length ? `<div class="post-tags" style="padding:12px 0">${post.tags.map(t => `<span class="post-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', event); expandPost('${post.id}');">
                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>${post.likes.length} beğeni</span>
            </button>
            <button class="action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${post.comments.length} yorum</span>
            </button>
            ${currentUser && currentUser.id === post.userId ? `
            <button class="action-btn action-btn-delete" onclick="deletePost('${post.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                <span>Sil</span>
            </button>` : ''}
        </div>
    `;

    // Render comments panel
    const commentsHtml = post.comments.map(c => {
        const cAuthor = userMap.get(c.userId) || { username: 'Bilinmeyen' };
        const cLiked = currentUser && c.likes.includes(currentUser.id);
        const cIdx = cAuthor.id ? parseInt(cAuthor.id.replace('u', '')) % AVATAR_GRADIENTS_LIST.length : 0;
        const cBg = AVATAR_GRADIENTS[cIdx] || AVATAR_GRADIENTS_LIST[cIdx] || 'linear-gradient(135deg,#2D5A43,#8FBC8F)';
        return `
            <div class="comment-item">
                <div class="comment-avatar" style="background:${cBg}">${cAuthor.username.charAt(0).toUpperCase()}</div>
                <div class="comment-body">
                    <span class="comment-author">${escapeHtml(cAuthor.username)}</span>
                    <span class="comment-time">${getTimeAgo(c.date)}</span>
                    <div class="comment-text">${escapeHtml(c.text)}</div>
                    <div class="comment-actions-row">
                        <button class="comment-action-btn ${cLiked ? 'liked' : ''}" onclick="toggleCommentLike('${post.id}', '${c.id}')">
                            ❤️ ${c.likes.length}
                        </button>
                        <button class="comment-action-btn" onclick="document.getElementById('expandedCommentInput').focus()">
                            💬 Yanıtla
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('expandedComments').innerHTML = `
        <div class="expanded-comments-header">
            <span>Yorumlar (${post.comments.length})</span>
            <button class="btn-icon" onclick="closeExpandedPost()" style="font-size:1.4rem; color:var(--text-muted);">&times;</button>
        </div>
        <div class="comments-list">
            ${commentsHtml || '<div class="empty-state" style="padding:40px 0"><div class="empty-state-icon">💬</div><h3>Henüz yorum yok</h3><p>İlk yorumu sen yap!</p></div>'}
        </div>
        <div class="comment-input-area">
            <textarea id="expandedCommentInput" placeholder="${currentUser ? 'Yorumunu yaz...' : 'Yorum yapmak için giriş yap'}" 
                      ${currentUser ? '' : 'disabled'} rows="1"
                      oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px'"></textarea>
            <button class="send-comment-btn" onclick="submitExpandedComment('${post.id}')" ${currentUser ? '' : 'disabled'}>Gönder</button>
        </div>
    `;

    document.getElementById('postOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
}

function closeExpandedPost(e) {
    if (e && e.target !== document.getElementById('postOverlay')) return;
    document.getElementById('postOverlay').classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
}

function deletePost(postId) {
    if (!currentUser) return;
    const post = allPosts.find(p => p.id === postId);
    if (!post || post.userId !== currentUser.id) {
        showToast('Bu gönderiyi silme yetkin yok.', 'error');
        return;
    }
    if (!confirm('Bu gönderiyi silmek istediğinden emin misin?')) return;
    allPosts = allPosts.filter(p => p.id !== postId);
    setStore(STORAGE_KEYS.posts, allPosts);
    document.getElementById('postOverlay').classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    refreshCurrentView();
    showToast('Gönderi silindi.', 'success');
}

// ── Like / Unlike ──
function toggleLike(postId, event) {
    if (event) event.stopPropagation();
    if (!currentUser) {
        showToast('Beğenmek için giriş yapmalısın!', 'error');
        openModal('loginModal');
        return;
    }

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const idx = post.likes.indexOf(currentUser.id);
    if (idx === -1) {
        post.likes.push(currentUser.id);
    } else {
        post.likes.splice(idx, 1);
    }

    setStore(STORAGE_KEYS.posts, allPosts);
    refreshCurrentView();
}

function toggleCommentLike(postId, commentId) {
    if (!currentUser) {
        showToast('Beğenmek için giriş yapmalısın!', 'error');
        return;
    }

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) return;

    const idx = comment.likes.indexOf(currentUser.id);
    if (idx === -1) {
        comment.likes.push(currentUser.id);
    } else {
        comment.likes.splice(idx, 1);
    }

    setStore(STORAGE_KEYS.posts, allPosts);
    expandPost(postId); // Re-render expanded view
}

// ── Comments ──
function handleQuickComment(e, postId) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitQuickComment(postId);
    }
}

function submitQuickComment(postId) {
    event && event.stopPropagation();
    if (!currentUser) {
        showToast('Yorum yapmak için giriş yapmalısın!', 'error');
        openModal('loginModal');
        return;
    }

    const input = document.getElementById(`quick-comment-${postId}`);
    const text = input.value.trim();
    if (!text) return;

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    post.comments.push({
        id: 'c' + Date.now(),
        userId: currentUser.id,
        text,
        date: new Date().toISOString(),
        likes: [],
    });

    setStore(STORAGE_KEYS.posts, allPosts);
    input.value = '';
    refreshCurrentView();
    showToast('Yorum eklendi! 💬', 'success');
}

function submitExpandedComment(postId) {
    if (!currentUser) {
        showToast('Yorum yapmak için giriş yapmalısın!', 'error');
        return;
    }

    const input = document.getElementById('expandedCommentInput');
    const text = input.value.trim();
    if (!text) return;

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    post.comments.push({
        id: 'c' + Date.now(),
        userId: currentUser.id,
        text,
        date: new Date().toISOString(),
        likes: [],
    });

    setStore(STORAGE_KEYS.posts, allPosts);
    expandPost(postId); // Re-render
    refreshCurrentView();
    showToast('Yorum eklendi! 💬', 'success');
}

// ── New Post ──
function handleNewPost(e) {
    e.preventDefault();
    if (!currentUser) {
        showToast('Gönderi oluşturmak için giriş yapmalısın!', 'error');
        return;
    }

    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value || 'genel';
    const content = document.getElementById('postContent').value.trim();
    const gameRef = document.getElementById('npeGameRef').value.trim();
    const gameRefImage = document.getElementById('npeGameImageRef').value.trim();

    // Determine media
    let imageUrl = '';
    let videoUrl = '';
    const isUrlTab = document.getElementById('npeUrlPane').style.display !== 'none';
    if (isUrlTab) {
        const urlVal = (document.getElementById('postImageUrl').value || '').trim();
        if (urlVal && /\.(mp4|webm|ogg)(\?|$)/i.test(urlVal)) {
            videoUrl = urlVal;
        } else {
            imageUrl = urlVal;
        }
    } else if (npeMediaData) {
        if (npeMediaData.type === 'image') imageUrl = npeMediaData.dataUrl;
        else videoUrl = npeMediaData.dataUrl;
    }
    // Use game cover as image fallback
    if (!imageUrl && !videoUrl && gameRefImage) imageUrl = gameRefImage;

    const tags = npeTags.length ? npeTags : [];

    const newPost = {
        id: 'p' + Date.now(),
        userId: currentUser.id,
        title,
        content,
        category,
        tags,
        imageUrl,
        videoUrl,
        gameRef,
        likes: [],
        comments: [],
        date: new Date().toISOString(),
    };

    allPosts.unshift(newPost);
    setStore(STORAGE_KEYS.posts, allPosts);
    closeModal('newPostModal');
    refreshCurrentView();
    showToast('Gönderi yayınlandı! 🎉', 'success');
}

// ── New Post Editor Helpers ──

function npeInit() {
    if (!currentUser) return;
    const chip = document.getElementById('npeUserChip');
    if (chip) {
        const { bg, initial } = getAuthorStyle(currentUser);
        const av = currentUser.avatarImage
            ? `<div class="npe-avatar" style="background-image:url('${escapeHtml(currentUser.avatarImage)}');background-size:cover;background-position:center;"></div>`
            : `<div class="npe-avatar" style="${bg}">${initial}</div>`;
        chip.innerHTML = `${av}<span>@${escapeHtml(currentUser.username)}</span>`;
    }
}

function npeReset() {
    // Clear tags
    npeTags = [];
    npeRenderTags();
    // Clear media
    if (npeMediaData && npeMediaData.isObjectUrl) URL.revokeObjectURL(npeMediaData.dataUrl);
    npeMediaData = null;
    const previewImg = document.getElementById('npePreviewImg');
    const previewVid = document.getElementById('npePreviewVid');
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
    if (previewVid) { previewVid.src = ''; previewVid.style.display = 'none'; }
    const mediaPrev = document.getElementById('npeMediaPreview');
    if (mediaPrev) mediaPrev.style.display = 'none';
    const dz = document.getElementById('npeDropzone');
    if (dz) dz.style.display = '';
    const fileInput = document.getElementById('npeFileInput');
    if (fileInput) fileInput.value = '';
    // Clear game
    npeGameSelected = null;
    npeGameSearchResults = [];
    clearTimeout(npeGameSearchTimeout);
    if (npeGameAbortController) npeGameAbortController.abort();
    npeGameRequestId++;
    const gameInput = document.getElementById('npeGameInput');
    if (gameInput) gameInput.value = '';
    const gameBadge = document.getElementById('npeGameBadge');
    if (gameBadge) gameBadge.style.display = 'none';
    const gameTrigger = document.getElementById('npeGameTrigger');
    if (gameTrigger) gameTrigger.style.display = '';
    const gameRef = document.getElementById('npeGameRef');
    if (gameRef) gameRef.value = '';
    const gameImgRef = document.getElementById('npeGameImageRef');
    if (gameImgRef) gameImgRef.value = '';
    const gameDD = document.getElementById('npeGameDropdown');
    if (gameDD) { gameDD.innerHTML = ''; gameDD.classList.remove('active'); }
    const gameResults = document.getElementById('npeGameResults');
    if (gameResults) gameResults.innerHTML = '';
    closeNpeGameOverlay();
    // Reset category
    document.querySelectorAll('.npe-cat-pill').forEach(p => p.classList.toggle('active', p.dataset.val === 'genel'));
    const catHidden = document.getElementById('postCategory');
    if (catHidden) catHidden.value = 'genel';
    const catLabel = document.getElementById('npeCatLabel');
    if (catLabel) catLabel.textContent = 'Genel';
    // Reset editor
    const ta = document.getElementById('postContent');
    if (ta) ta.value = '';
    npeContentInput();
    const writePn = document.getElementById('npeWritePane');
    const prevPn = document.getElementById('npePreviewPane');
    if (writePn) writePn.style.display = '';
    if (prevPn) prevPn.style.display = 'none';
    document.querySelectorAll('.npe-etab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'write'));
    // Reset media tabs
    document.querySelectorAll('.npe-mtab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'upload'));
    const uploadPn = document.getElementById('npeUploadPane');
    const urlPn = document.getElementById('npeUrlPane');
    if (uploadPn) uploadPn.style.display = '';
    if (urlPn) urlPn.style.display = 'none';
    const urlInput = document.getElementById('postImageUrl');
    if (urlInput) urlInput.value = '';
    // Reset title
    const titleIn = document.getElementById('postTitle');
    if (titleIn) titleIn.value = '';
}

function npeSetCat(el) {
    document.querySelectorAll('.npe-cat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    const val = el.dataset.val;
    document.getElementById('postCategory').value = val;
    const label = document.getElementById('npeCatLabel');
    if (label) label.textContent = el.textContent.trim();
}

// Game reference
function npeSearchGameLegacy(q) {
    clearTimeout(npeGameSearchTimeout);
    const dd = document.getElementById('npeGameDropdown');
    if (!dd) return;
    if (!q || q.length < 2) { dd.innerHTML = ''; dd.classList.remove('active'); return; }
    dd.innerHTML = '<div class="npe-game-opt npe-game-loading">Aranıyor…</div>';
    dd.classList.add('active');
    npeGameSearchTimeout = setTimeout(async () => {
        if (!RAWG_API_KEY) {
            const local = allGames
                .filter(g => g.title && g.title.toLowerCase().includes(q.toLowerCase()))
                .map(g => ({
                    title: g.title,
                    imageUrl: g.backgroundUrl || g.coverUrl || '',
                    rating: g.rating || 0
                }));
            const localMatches = sortGamesBySearchQuery(local, q)
                .slice(0, 6)
                .map(g => ({ title: g.title, imageUrl: g.imageUrl }));
            npeRenderGameDD(localMatches, q);
            return;
        }
        try {
            const res = await fetch(`${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=6&search=${encodeURIComponent(q)}&search_precise=true`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const games = (data.results || []).map(g => ({ title: g.name, imageUrl: g.background_image || '' }));
            npeRenderGameDD(games, q);
        } catch {
            dd.innerHTML = '<div class="npe-game-opt npe-game-empty">Sonuç bulunamadı</div>';
        }
    }, 350);
}

npeSearchGame = function (q) {
    clearTimeout(npeGameSearchTimeout);
    const dd = document.getElementById('npeGameDropdown');
    if (!dd) return;
    if (!q || q.length < 2) {
        if (npeGameAbortController) npeGameAbortController.abort();
        npeGameRequestId++;
        dd.innerHTML = '';
        dd.classList.remove('active');
        return;
    }

    dd.innerHTML = '<div class="npe-game-opt npe-game-loading">AranÄ±yorâ€¦</div>';
    dd.classList.add('active');
    dd.innerHTML = '<div class="npe-game-opt npe-game-loading">Araniyor...</div>';

    npeGameSearchTimeout = setTimeout(async () => {
        if (!RAWG_API_KEY) {
            const localMatches = sortGamesBySearchQuery(
                allGames
                    .filter(g => g.title && g.title.toLowerCase().includes(q.toLowerCase()))
                    .map(g => ({
                        title: g.title,
                        imageUrl: g.backgroundUrl || g.coverUrl || '',
                        rating: g.rating || 0
                    })),
                q
            )
                .slice(0, 6)
                .map(g => ({ title: g.title, imageUrl: g.imageUrl }));

            npeRenderGameDD(localMatches, q);
            return;
        }

        try {
            if (npeGameAbortController) npeGameAbortController.abort();
            npeGameAbortController = new AbortController();
            const myRequestId = ++npeGameRequestId;

            const result = await searchRawgGames(q, {
                signal: npeGameAbortController.signal
            });
            if (myRequestId !== npeGameRequestId) return;

            const games = result.games
                .slice(0, 6)
                .map(g => ({ title: g.title, imageUrl: g.backgroundUrl || g.coverUrl || '' }));

            npeRenderGameDD(games, q);
            if (dd.innerHTML.includes('Sonu')) {
                dd.innerHTML = '<div class="npe-game-opt npe-game-empty">Sonuc bulunamadi</div>';
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            setTimeout(() => {
                if (dd.innerHTML.includes('Sonu')) {
                    dd.innerHTML = '<div class="npe-game-opt npe-game-empty">Sonuc bulunamadi</div>';
                }
            }, 0);
            return void (dd.innerHTML = '<div class="npe-game-opt npe-game-empty">Sonuc bulunamadi</div>');
            dd.innerHTML = '<div class="npe-game-opt npe-game-empty">SonuÃ§ bulunamadÄ±</div>';
        }
    }, 350);
};

function npeRenderGameDD(games, q) {
    const dd = document.getElementById('npeGameDropdown');
    if (!dd) return;
    if (games.length === 0) {
        dd.innerHTML = `<div class="npe-game-opt npe-game-empty">"${escapeHtml(q)}" için sonuç yok</div>`;
        return;
    }
    dd.innerHTML = games.map(g => `
        <div class="npe-game-opt" onclick="npeSelectGame('${escapeHtml(g.title.replace(/'/g, "&#39;"))}','${escapeHtml(g.imageUrl)}')">
            ${g.imageUrl ? `<img src="${escapeHtml(g.imageUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="npe-game-opt-noimg"></div>'}
            <span>${escapeHtml(g.title)}</span>
        </div>`).join('');
    dd.classList.add('active');
}

function npeSelectGame(title, imageUrl) {
    npeGameSelected = { title, imageUrl };
    npeGameSearchResults = [];
    document.getElementById('npeGameRef').value = title;
    document.getElementById('npeGameImageRef').value = imageUrl;
    const inp = document.getElementById('npeGameInput');
    if (inp) inp.value = '';
    const results = document.getElementById('npeGameResults');
    if (results) results.innerHTML = '';
    const dd = document.getElementById('npeGameDropdown');
    if (dd) { dd.innerHTML = ''; dd.classList.remove('active'); }
    const badge = document.getElementById('npeGameBadge');
    const trigger = document.getElementById('npeGameTrigger');
    if (badge) {
        badge.style.display = 'flex';
        const img = document.getElementById('npeGameBadgeImg');
        if (img) { img.src = imageUrl; img.style.display = imageUrl ? '' : 'none'; }
        const nm = document.getElementById('npeGameBadgeName');
        if (nm) nm.textContent = title;
    }
    if (trigger) trigger.style.display = 'none';
    closeNpeGameOverlay();
}

function npeClearGame() {
    npeGameSelected = null;
    npeGameSearchResults = [];
    document.getElementById('npeGameRef').value = '';
    document.getElementById('npeGameImageRef').value = '';
    const badge = document.getElementById('npeGameBadge');
    if (badge) badge.style.display = 'none';
    const trigger = document.getElementById('npeGameTrigger');
    if (trigger) trigger.style.display = '';
    closeNpeGameOverlay();
}

// Media
function npeSetMediaTab(el) {
    document.querySelectorAll('.npe-mtab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const isUpload = el.dataset.tab === 'upload';
    document.getElementById('npeUploadPane').style.display = isUpload ? '' : 'none';
    document.getElementById('npeUrlPane').style.display = isUpload ? 'none' : '';
}

function npeDragOver(e) {
    e.preventDefault();
    document.getElementById('npeDropzone').classList.add('drag-over');
}

function npeDragLeave(e) {
    document.getElementById('npeDropzone').classList.remove('drag-over');
}

function npeDrop(e) {
    e.preventDefault();
    document.getElementById('npeDropzone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) npeProcessFile(file);
}

function npeFileChange(e) {
    const file = e.target.files[0];
    if (file) npeProcessFile(file);
}

async function npeProcessFile(file) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { showToast('Desteklenmeyen dosya türü', 'error'); return; }
    const dz = document.getElementById('npeDropzone');
    const prev = document.getElementById('npeMediaPreview');
    const imgEl = document.getElementById('npePreviewImg');
    const vidEl = document.getElementById('npePreviewVid');
    const lbl = document.getElementById('npePreviewLabel');
    if (isImage) {
        try {
            const dataUrl = await npeCompressImage(file);
            npeMediaData = { type: 'image', dataUrl, fileName: file.name };
            imgEl.src = dataUrl; imgEl.style.display = '';
            vidEl.style.display = 'none';
            lbl.textContent = file.name;
        } catch { showToast('Resim yüklenemedi', 'error'); return; }
    } else {
        const objUrl = URL.createObjectURL(file);
        npeMediaData = { type: 'video', dataUrl: objUrl, fileName: file.name, isObjectUrl: true };
        vidEl.src = objUrl; vidEl.style.display = '';
        imgEl.style.display = 'none';
        lbl.textContent = file.name + ' (Yalnızca bu oturumda görünür)';
    }
    dz.style.display = 'none';
    prev.style.display = '';
}

function npeCompressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const MAX = 1200;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                let q = 0.85, dataUrl = canvas.toDataURL('image/jpeg', q);
                while (dataUrl.length > 450000 && q > 0.3) { q -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', q); }
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function npeClearMedia() {
    if (npeMediaData && npeMediaData.isObjectUrl) URL.revokeObjectURL(npeMediaData.dataUrl);
    npeMediaData = null;
    const imgEl = document.getElementById('npePreviewImg');
    const vidEl = document.getElementById('npePreviewVid');
    if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
    if (vidEl) { vidEl.src = ''; vidEl.style.display = 'none'; }
    const lbl = document.getElementById('npePreviewLabel');
    if (lbl) lbl.textContent = '';
    const prev = document.getElementById('npeMediaPreview');
    if (prev) prev.style.display = 'none';
    const dz = document.getElementById('npeDropzone');
    if (dz) dz.style.display = '';
    const fi = document.getElementById('npeFileInput');
    if (fi) fi.value = '';
}

// Editor
function npeSetEditorTab(el) {
    document.querySelectorAll('.npe-etab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const isWrite = el.dataset.tab === 'write';
    document.getElementById('npeWritePane').style.display = isWrite ? '' : 'none';
    const prevPane = document.getElementById('npePreviewPane');
    const toolbarEl = document.getElementById('npeMdToolbar');
    if (isWrite) {
        prevPane.style.display = 'none';
        if (toolbarEl) toolbarEl.style.opacity = '1';
    } else {
        prevPane.style.display = '';
        if (toolbarEl) toolbarEl.style.opacity = '0.4';
        const ta = document.getElementById('postContent');
        prevPane.innerHTML = ta && ta.value.trim() ? renderMarkdown(ta.value) : '<p class="npe-preview-empty">Önizlenecek içerik yok.</p>';
    }
}

function npeInsert(type) {
    const ta = document.getElementById('postContent');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.substring(s, e);
    let before = '', after = '', dflt = '', isBlock = false;
    switch (type) {
        case 'bold': before = '**'; after = '**'; dflt = 'kalın metin'; break;
        case 'italic': before = '*'; after = '*'; dflt = 'italik metin'; break;
        case 'strike': before = '~~'; after = '~~'; dflt = 'üstü çizgili'; break;
        case 'h2': before = '## '; dflt = 'Başlık'; isBlock = true; break;
        case 'h3': before = '### '; dflt = 'Alt Başlık'; isBlock = true; break;
        case 'quote': before = '> '; dflt = 'Alıntı'; isBlock = true; break;
        case 'code': before = '`'; after = '`'; dflt = 'kod'; break;
        case 'link': before = '['; after = '](https://)'; dflt = 'bağlantı metni'; break;
        case 'list': before = '- '; dflt = 'madde'; isBlock = true; break;
    }
    // Block elements must start on their own line
    let prefix = '';
    if (isBlock && s > 0 && ta.value[s - 1] !== '\n') prefix = '\n';
    const text = sel || dflt;
    const rep = prefix + before + text + after;
    ta.value = ta.value.substring(0, s) + rep + ta.value.substring(e);
    const textStart = s + prefix.length + before.length;
    ta.setSelectionRange(textStart, textStart + text.length);
    ta.focus();
    npeContentInput();
}

function npeContentInput() {
    const ta = document.getElementById('postContent');
    const cnt = document.getElementById('npeCharCount');
    if (ta && cnt) cnt.textContent = `${ta.value.length} / 5000`;
}

function npeContentKeydown(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') { e.preventDefault(); npeInsert('bold'); }
        if (e.key === 'i') { e.preventDefault(); npeInsert('italic'); }
        if (e.key === 'k') { e.preventDefault(); npeInsert('link'); }
    }
    // Tab = indent
    if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.target;
        const s = ta.selectionStart;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
    }
}

// Tags
function npeTagKeydown(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = e.target.value.replace(/,/g, '').trim();
        if (val) npeAddTag(val);
        e.target.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && npeTags.length) {
        npeRemoveTag(npeTags[npeTags.length - 1]);
    }
}

function npeAddTag(raw) {
    if (npeTags.length >= 6) { showToast('En fazla 6 etiket ekleyebilirsin', 'info'); return; }
    const clean = '#' + raw.replace(/^#+/, '').toLowerCase().replace(/\s+/g, '');
    if (clean.length < 2) return;
    if (!npeTags.includes(clean)) { npeTags.push(clean); npeRenderTags(); }
}

function npeRemoveTag(tag) {
    npeTags = npeTags.filter(t => t !== tag);
    npeRenderTags();
}

function npeRenderTags() {
    const list = document.getElementById('npeTagList');
    if (!list) return;
    list.innerHTML = npeTags.map(tag => `
        <span class="npe-tag-pill">
            ${escapeHtml(tag)}
            <button type="button" onclick="npeRemoveTag('${escapeHtml(tag.replace(/'/g, '&#39;'))}')" aria-label="Kaldır">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="9" height="9"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        </span>`).join('');
    const hidden = document.getElementById('postTags');
    if (hidden) hidden.value = npeTags.join(',');
}

// Markdown renderer
function renderMarkdown(raw) {
    if (!raw) return '';
    const lines = raw.split('\n');
    let html = '';
    let inCode = false, codeBuf = '', inList = false;
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (ln.startsWith('```')) {
            if (!inCode) { if (inList) { html += '</ul>'; inList = false; } inCode = true; codeBuf = ''; }
            else { inCode = false; html += `<pre class="md-pre"><code>${escapeHtml(codeBuf)}</code></pre>`; }
            continue;
        }
        if (inCode) { codeBuf += (codeBuf ? '\n' : '') + ln; continue; }
        const h3 = ln.match(/^###\s+(.*)/); if (h3) { if (inList) { html += '</ul>'; inList = false; } html += `<h3 class="md-h3">${mdInline(h3[1])}</h3>`; continue; }
        const h2 = ln.match(/^##\s+(.*)/); if (h2) { if (inList) { html += '</ul>'; inList = false; } html += `<h2 class="md-h2">${mdInline(h2[1])}</h2>`; continue; }
        const h1 = ln.match(/^#\s+(.*)/); if (h1) { if (inList) { html += '</ul>'; inList = false; } html += `<h1 class="md-h1">${mdInline(h1[1])}</h1>`; continue; }
        if (ln.startsWith('> ')) { if (inList) { html += '</ul>'; inList = false; } html += `<blockquote class="md-quote">${mdInline(ln.slice(2))}</blockquote>`; continue; }
        if (ln.match(/^(---+|\*\*\*+)$/)) { if (inList) { html += '</ul>'; inList = false; } html += '<hr class="md-hr">'; continue; }
        if (ln.match(/^[-*]\s+/)) { if (!inList) { html += '<ul class="md-ul">'; inList = true; } html += `<li>${mdInline(ln.replace(/^[-*]\s+/, ''))}</li>`; continue; }
        if (ln.trim() === '') { if (inList) { html += '</ul>'; inList = false; } continue; }
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="md-p">${mdInline(ln)}</p>`;
    }
    if (inList) html += '</ul>';
    if (inCode) html += `<pre class="md-pre"><code>${escapeHtml(codeBuf)}</code></pre>`;
    return html;
}

function mdInline(t) {
    t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    t = t.replace(/`([^`]+)`/g, '<code class="md-ic">$1</code>');
    t = t.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-a" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return t;
}

// Close NPE game dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#npeGameTrigger') && !e.target.closest('#npeGameDropdown')) {
        const dd = document.getElementById('npeGameDropdown');
        if (dd) { dd.innerHTML = ''; dd.classList.remove('active'); }
    }
});

// ── Share / Bookmark (UI feedback) ──
function sharePost(postId, event) {
    if (event) event.stopPropagation();
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(`LvlUp – ${post.title}`).then(() => {
            showToast('Bağlantı panoya kopyalandı! 📋', 'info');
        });
    } else {
        showToast('Paylaşım linki oluşturuldu!', 'info');
    }
}

function bookmarkPost(postId, event) {
    if (event) event.stopPropagation();
    if (!currentUser) {
        showToast('Kaydetmek için giriş yapmalısın!', 'error');
        openModal('loginModal');
        return;
    }
    if (!currentUser.bookmarks) currentUser.bookmarks = [];
    const idx = currentUser.bookmarks.indexOf(postId);
    if (idx === -1) {
        currentUser.bookmarks.push(postId);
        showToast('Gönderi kaydedildi! 🔖', 'success');
    } else {
        currentUser.bookmarks.splice(idx, 1);
        showToast('Kayıt kaldırıldı.', 'info');
    }
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) allUsers[userIdx] = { ...currentUser };
    setStore(STORAGE_KEYS.users, allUsers);
    setStore(STORAGE_KEYS.currentUser, currentUser);
    rebuildUserMap();
    refreshCurrentView();
}

// ── Search Overlay System ──
let searchSelectedIndex = -1;

function openSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('searchInput');
    input.value = '';
    input.focus();
    searchSelectedIndex = -1;
    document.getElementById('searchAutocomplete').innerHTML = '';
    document.getElementById('searchAutocomplete').classList.remove('has-items');
    document.getElementById('searchFilteredPosts').innerHTML = '';
}

function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    searchSelectedIndex = -1;
}

function closeSearchOverlayOnBg(e) {
    if (e.target === document.getElementById('searchOverlay')) {
        closeSearchOverlay();
    }
}

function handleSearchOverlayInput() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const autocompleteEl = document.getElementById('searchAutocomplete');
    const filteredPostsEl = document.getElementById('searchFilteredPosts');
    searchSelectedIndex = -1;

    if (query.length < 1) {
        autocompleteEl.innerHTML = '';
        autocompleteEl.classList.remove('has-items');
        filteredPostsEl.innerHTML = '';
        return;
    }

    // --- Autocomplete Completions ---
    // Collect all searchable terms: post titles, tags, category names
    const completionSources = [];
    const seenCompletions = new Set();

    allPosts.forEach(p => {
        // Title-based completions
        const titleLower = p.title.toLowerCase();
        if (titleLower.includes(query) && !seenCompletions.has(titleLower)) {
            seenCompletions.add(titleLower);
            completionSources.push({
                text: p.title,
                type: 'post',
                icon: '📰',
                meta: getCategoryName(p.category),
                postId: p.id
            });
        }

        // Tag-based completions
        p.tags.forEach(tag => {
            const tagLower = tag.toLowerCase();
            if (tagLower.includes(query) && !seenCompletions.has(tagLower)) {
                seenCompletions.add(tagLower);
                completionSources.push({
                    text: tag,
                    type: 'tag',
                    icon: '#️⃣',
                    meta: 'Etiket',
                    postId: null
                });
            }
        });
    });

    // Category completions
    const categoryNames = {
        fps: 'FPS', rpg: 'RPG', moba: 'MOBA',
        'battle-royale': 'Battle Royale', indie: 'Indie',
        strateji: 'Strateji', genel: 'Genel'
    };
    Object.entries(categoryNames).forEach(([key, name]) => {
        const nameLower = name.toLowerCase();
        if (nameLower.includes(query) && !seenCompletions.has(nameLower)) {
            seenCompletions.add(nameLower);
            completionSources.push({
                text: name,
                type: 'category',
                icon: '🎮',
                meta: 'Kategori',
                postId: null,
                categoryKey: key
            });
        }
    });

    const completions = completionSources.slice(0, 5);

    if (completions.length > 0) {
        autocompleteEl.innerHTML = `
            <div class="autocomplete-label">Tamamlamalar</div>
            ${completions.map((c, i) => `
                <div class="autocomplete-item ${i === searchSelectedIndex ? 'selected' : ''}" 
                     data-index="${i}" 
                     onclick="handleAutocompleteClick(${i})"
                     onmouseenter="searchSelectedIndex = ${i}; updateAutocompleteSelection()">
                    <div class="autocomplete-item-icon">${c.icon}</div>
                    <div class="autocomplete-item-text">
                        <div class="autocomplete-item-title">${highlightCompletion(escapeHtml(c.text), query)}</div>
                        <div class="autocomplete-item-meta">${c.meta}</div>
                    </div>
                    <span class="autocomplete-item-action">Enter ↵</span>
                </div>
            `).join('')}
        `;
        autocompleteEl.classList.add('has-items');
    } else {
        autocompleteEl.innerHTML = '';
        autocompleteEl.classList.remove('has-items');
    }

    // --- Filtered Posts ---
    const filteredPosts = allPosts.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query)) ||
        getCategoryName(p.category).toLowerCase().includes(query)
    ).slice(0, 6);

    if (filteredPosts.length > 0) {
        filteredPostsEl.innerHTML = `
            <div class="filtered-posts-label">İçerikler (${filteredPosts.length} sonuç)</div>
            ${filteredPosts.map(p => {
            const author = userMap.get(p.userId) || { username: 'Bilinmeyen', id: 'u0' };
            const initial = author.username.charAt(0).toUpperCase();
            const gIdx = author.id ? parseInt(author.id.replace('u', '')) % AVATAR_GRADIENTS_LIST.length : 0;
            const snippet = getSnippet(p.content, query);
            return `
                    <div class="filtered-post-item" onclick="selectSearchPost('${p.id}')">
                        <div class="filtered-post-avatar" style="background:${avatarGradients[gIdx]}">${initial}</div>
                        <div class="filtered-post-info">
                            <div class="filtered-post-title">${highlightCompletion(escapeHtml(p.title), query)}</div>
                            <div class="filtered-post-snippet">${highlightCompletion(escapeHtml(snippet), query)}</div>
                            <div class="filtered-post-meta">
                                <span class="filtered-post-badge badge-${p.category}">${getCategoryName(p.category)}</span>
                                <span>${escapeHtml(author.username)}</span>
                                <span>• ${getTimeAgo(p.date)}</span>
                                <span>❤️ ${p.likes.length}</span>
                                <span>💬 ${p.comments.length}</span>
                            </div>
                        </div>
                    </div>
                `;
        }).join('')}
        `;
    } else if (query.length >= 2) {
        filteredPostsEl.innerHTML = `
            <div class="search-no-results">
                <div class="search-no-results-icon">🔍</div>
                <h4>"${escapeHtml(query)}" için sonuç bulunamadı</h4>
                <p>Farklı anahtar kelimeler deneyebilirsiniz</p>
            </div>
        `;
    } else {
        filteredPostsEl.innerHTML = '';
    }

    // Store completions data for keyboard navigation
    window._searchCompletions = completions;
}

function highlightCompletion(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function getSnippet(content, query) {
    const lowerContent = content.toLowerCase();
    const idx = lowerContent.indexOf(query);
    if (idx === -1) return content.slice(0, 120) + (content.length > 120 ? '...' : '');
    const start = Math.max(0, idx - 40);
    const end = Math.min(content.length, idx + query.length + 80);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
}

function handleAutocompleteClick(index) {
    const completions = window._searchCompletions || [];
    if (!completions[index]) return;
    const c = completions[index];

    if (c.postId) {
        closeSearchOverlay();
        expandPost(c.postId);
    } else if (c.type === 'tag') {
        // Fill the search input with the tag and re-search
        document.getElementById('searchInput').value = c.text.replace('#', '');
        handleSearchOverlayInput();
    } else if (c.type === 'category' && c.categoryKey) {
        closeSearchOverlay();
        filterCategory(c.categoryKey);
    }
}

function selectSearchPost(postId) {
    closeSearchOverlay();
    expandPost(postId);
}

function handleSearchKeyNav(e) {
    const completions = window._searchCompletions || [];

    if (e.key === 'ArrowDown') {
        if (completions.length === 0) return;
        e.preventDefault();
        searchSelectedIndex = Math.min(searchSelectedIndex + 1, completions.length - 1);
        updateAutocompleteSelection();
    } else if (e.key === 'ArrowUp') {
        if (completions.length === 0) return;
        e.preventDefault();
        searchSelectedIndex = Math.max(searchSelectedIndex - 1, -1);
        updateAutocompleteSelection();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchSelectedIndex >= 0) {
            handleAutocompleteClick(searchSelectedIndex);
        } else {
            // No item selected, execute global search
            const query = document.getElementById('searchInput').value.trim();
            if (query.length > 0) {
                closeSearchOverlay();
                window.location.hash = `#search?q=${encodeURIComponent(query)}`;
            }
        }
    }
}

// ── Search Results Page Rendering ──
function renderSearchResultsPage(query) {
    document.getElementById('searchResultsKeyword').textContent = '"' + query + '"';
    query = query.toLowerCase();

    // 1. Users
    const users = allUsers.filter(u => u.username.toLowerCase().includes(query) || (u.bio && u.bio.toLowerCase().includes(query)));
    const usersContainer = document.getElementById('searchResUsersContainer');
    const usersGrid = document.getElementById('searchResUsers');
    if (users.length > 0) {
        usersContainer.style.display = 'block';
        usersGrid.innerHTML = users.map(u => {
            const avatarGradients = ['linear-gradient(135deg, #2D5A43, #8FBC8F)', 'linear-gradient(135deg, #BC6C25, #DDA15E)', 'linear-gradient(135deg, #606C38, #283618)', 'linear-gradient(135deg, #A4C639, #6BAA75)'];
            const gradientIndex = parseInt(u.id.replace('u', '')) % avatarGradients.length || 0;
            const bg = u.avatarImage ? `background-image: url('${u.avatarImage}'); background-size: cover;` : `background: ${AVATAR_GRADIENTS[gradientIndex] || avatarGradients[gradientIndex]};`;
            return `
                <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;" onclick="navigate('profile')">
                    <div style="width: 50px; height: 50px; border-radius: 50%; ${bg} display: flex; align-items:center; justify-content:center; font-weight:bold; color:#fff;">
                        ${!u.avatarImage ? u.username[0].toUpperCase() : ''}
                    </div>
                    <span style="font-size:0.8rem; margin-top:5px; color:var(--text-primary); font-weight:600;">${escapeHtml(u.username)}</span>
                </div>
            `;
        }).join('');
    } else {
        usersContainer.style.display = 'none';
        usersGrid.innerHTML = '';
    }

    // 2. Games
    const games = allGames.filter(g =>
        (g.name && g.name.toLowerCase().includes(query)) ||
        (g.tags && g.tags.some(t => t && t.toLowerCase().includes(query))) ||
        (g.developer && g.developer.toLowerCase().includes(query))
    );
    const gamesContainer = document.getElementById('searchResGamesContainer');
    const gamesGrid = document.getElementById('searchResGames');
    if (games.length > 0) {
        gamesContainer.style.display = 'block';
        gamesGrid.innerHTML = games.map(g => {
            return `
                <div class="game-card" onclick="openGameDetail('${g.id}')">
                    <img src="${g.coverUrl || ''}" alt="${escapeHtml(g.name)}" class="game-card-cover" onerror="this.style.display='none'">
                    <div class="game-card-overlay">
                        <div class="game-card-title">${escapeHtml(g.name)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        gamesContainer.style.display = 'none';
        gamesGrid.innerHTML = '';
    }

    // 3. Browser Games
    let bGames = [];
    if (typeof allBrowserGames !== 'undefined') {
        bGames = allBrowserGames.filter(g => g.title.toLowerCase().includes(query));
    }
    const bGamesContainer = document.getElementById('searchResBrowserGamesContainer');
    const bGamesGrid = document.getElementById('searchResBrowserGames');
    if (bGames.length > 0) {
        bGamesContainer.style.display = 'block';
        bGamesGrid.innerHTML = bGames.map(g => {
            return `
                <div class="game-card">
                    <img src="${g.coverUrl || ''}" alt="${escapeHtml(g.name)}" class="game-card-cover" onerror="this.style.display='none'">
                    <div class="game-card-overlay">
                        <div class="game-card-title">${escapeHtml(g.name)}</div>
                        <div style="font-size: 0.75rem; color:var(--text-muted);">${escapeHtml(g.developer)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        bGamesContainer.style.display = 'none';
        bGamesGrid.innerHTML = '';
    }

    // 4. Posts and Reviews
    const matchedPosts = allPosts.filter(p =>
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.content && p.content.toLowerCase().includes(query)) ||
        (p.tags && p.tags.some(t => t && t.toLowerCase().includes(query)))
    );
    const reviews = matchedPosts.filter(p => p.category === 'inceleme');
    const otherPosts = matchedPosts.filter(p => p.category !== 'inceleme');

    const reviewsContainer = document.getElementById('searchResReviewsContainer');
    const reviewsGrid = document.getElementById('searchResReviews');
    if (reviews.length > 0) {
        reviewsContainer.style.display = 'block';
        reviewsGrid.innerHTML = reviews.map(p => renderPostCard(p)).join('');
    } else {
        reviewsContainer.style.display = 'none';
        reviewsGrid.innerHTML = '';
    }

    const postsContainer = document.getElementById('searchResPostsContainer');
    const postsGrid = document.getElementById('searchResPosts');
    if (otherPosts.length > 0) {
        postsContainer.style.display = 'block';
        postsGrid.innerHTML = otherPosts.map(p => renderPostCard(p)).join('');
    } else {
        postsContainer.style.display = 'none';
        postsGrid.innerHTML = '';
    }

    // Empty state check
    const emptyContainer = document.getElementById('searchResEmpty');
    if (users.length === 0 && games.length === 0 && bGames.length === 0 && reviews.length === 0 && otherPosts.length === 0) {
        emptyContainer.style.display = 'block';
    } else {
        emptyContainer.style.display = 'none';
    }
}

function updateAutocompleteSelection() {
    const items = document.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === searchSelectedIndex);
    });
}

function showProfile() {
    navigate('profile');
}

function showMyPosts() {
    currentProfileTab = 'posts';
    navigate('profile');
}

// ── Modal Helpers ──
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'newPostModal') npeInit();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';

    // Stop iframe when closed
    if (id === 'browserGameOverlay') {
        const iframe = document.getElementById('browserGameIframe');
        if (iframe) iframe.src = '';
    }
    if (id === 'newPostModal') npeReset();
}

function closeModalOnOverlay(e, id) {
    if (e.target === document.getElementById(id)) {
        closeModal(id);
    }
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => openModal(toId), 150);
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(el => {
        el.classList.remove('active');
        if (el.id === 'browserGameOverlay') {
            const iframe = document.getElementById('browserGameIframe');
            if (iframe) iframe.src = '';
        }
    });
    document.body.style.overflow = '';
}

// ── User Dropdown ──
function toggleUserDropdown() {
    // Dropdown removed – clicking avatar goes directly to profile
}

function toggleNotifications() {
    showToast('Bildirimler yakında aktif olacak! 🔔', 'info');
}

// ── Toast ──
function showToast(message, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Utility ──
function getTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getCategoryName(cat) {
    const names = {
        fps: 'FPS', rpg: 'RPG', moba: 'MOBA',
        'battle-royale': 'Battle Royale', indie: 'Indie',
        strateji: 'Strateji', genel: 'Genel',
    };
    return names[cat] || cat;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ================================================================
//   PROFILE PAGE SYSTEM
// ================================================================

function renderProfilePage() {
    const tabsWrapper = document.getElementById('profileTabsWrapper');
    const statsGrid = document.getElementById('profileStatsGrid');
    const tabContent = document.getElementById('profileTabContent');
    const headerSection = document.getElementById('profileHeaderSection');

    if (!currentUser) {
        headerSection.innerHTML = `
            <div class="profile-login-required" style="width:100%;">
                <div class="profile-login-icon">🔒</div>
                <h2>Giriş Yapmalısın</h2>
                <p>Profilini görüntülemek için giriş yap veya kayıt ol.</p>
                <button class="btn btn-primary" onclick="openModal('loginModal')">Giriş Yap</button>
            </div>
        `;
        statsGrid.innerHTML = '';
        tabContent.innerHTML = '';
        tabsWrapper.style.display = 'none';
        return;
    }

    tabsWrapper.style.display = '';
    const user = currentUser;
    const initial = user.username.charAt(0).toUpperCase();
    const gradientIdx = user.avatarGradient !== undefined ? user.avatarGradient : (parseInt(user.id.replace('u', '')) % AVATAR_GRADIENTS.length);
    const gradient = AVATAR_GRADIENTS[gradientIdx];
    const joinDate = new Date(user.joinDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const stats = calculateProfileStats(user.id);

    const avatarStyle = user.avatarImage
        ? `background-image: url('${user.avatarImage}');`
        : `background: ${gradient};`;
    const avatarContent = user.avatarImage ? '' : initial;

    const bannerEl = document.querySelector('.profile-banner');
    if (bannerEl) {
        if (user.bannerImage) {
            bannerEl.style.backgroundImage = `url('${user.bannerImage}')`;
        } else {
            bannerEl.style.backgroundImage = '';
        }
    }

    let extrasHtml = '';
    if (user.favGame) {
        extrasHtml = `<div class="profile-extras"><span class="profile-fav-game">🎮 ${escapeHtml(user.favGame)}</span></div>`;
    }

    headerSection.innerHTML = `
        <div class="profile-avatar-lg" style="${avatarStyle}">${avatarContent}</div>
        <div class="profile-info">
            <h1 class="profile-username">${escapeHtml(user.username)}</h1>
            ${extrasHtml}
            ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}
            <p class="profile-email">${escapeHtml(user.email)}</p>
            <div class="profile-join-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${joinDate} tarihinden beri üye</span>
            </div>
        </div>
        <div class="profile-actions">
            <button class="btn btn-ghost profile-edit-btn" onclick="openEditProfile()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Profili Düzenle
            </button>
            <button class="btn btn-logout" onclick="logout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Çıkış Yap
            </button>
        </div>
    `;

    statsGrid.innerHTML = `
        <div class="profile-stat-card">
            <div class="profile-stat-icon">📝</div>
            <div class="profile-stat-value">${stats.totalPosts}</div>
            <div class="profile-stat-label">Gönderi</div>
        </div>
        <div class="profile-stat-card">
            <div class="profile-stat-icon">❤️</div>
            <div class="profile-stat-value">${stats.totalLikesReceived}</div>
            <div class="profile-stat-label">Beğeni Aldı</div>
        </div>
        <div class="profile-stat-card">
            <div class="profile-stat-icon">💬</div>
            <div class="profile-stat-value">${stats.totalComments}</div>
            <div class="profile-stat-label">Yorum</div>
        </div>
        <div class="profile-stat-card">
            <div class="profile-stat-icon">⭐</div>
            <div class="profile-stat-value">${stats.totalLikesGiven}</div>
            <div class="profile-stat-label">Beğeni Verdi</div>
        </div>
    `;

    switchProfileTab(currentProfileTab);
}

function calculateProfileStats(userId) {
    const userPosts = allPosts.filter(p => p.userId === userId);
    let totalLikesReceived = 0;
    userPosts.forEach(p => { totalLikesReceived += p.likes.length; });
    let totalComments = 0;
    let totalLikesGiven = 0;
    allPosts.forEach(p => {
        p.comments.forEach(c => { if (c.userId === userId) totalComments++; });
        if (p.likes.includes(userId)) totalLikesGiven++;
    });
    return { totalPosts: userPosts.length, totalLikesReceived, totalComments, totalLikesGiven };
}

function switchProfileTab(tab) {
    currentProfileTab = tab;
    document.querySelectorAll('.profile-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.ptab === tab);
    });
    const container = document.getElementById('profileTabContent');
    if (tab === 'posts') renderProfilePosts(container);
    else if (tab === 'likes') renderProfileLikes(container);
    else if (tab === 'comments') renderProfileComments(container);
    else if (tab === 'bookmarks') renderProfileBookmarks(container);
    container.style.animation = 'none';
    void container.offsetWidth;
    container.style.animation = '';
}

function renderProfilePosts(container) {
    if (!currentUser) return;
    const myPosts = allPosts.filter(p => p.userId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (myPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>Henüz gönderin yok</h3>
                <p>İlk gönderini oluştur ve oyun dünyasıyla paylaş!</p>
                <button class="btn btn-primary" style="margin-top:16px;" onclick="openModal('newPostModal')">Gönderi Oluştur</button>
            </div>`;
        return;
    }
    container.innerHTML = myPosts.map(post => renderPostCard(post)).join('');
}

function renderProfileLikes(container) {
    if (!currentUser) return;
    const likedPosts = allPosts.filter(p => p.likes.includes(currentUser.id)).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (likedPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❤️</div>
                <h3>Henüz beğendiğin gönderi yok</h3>
                <p>Beğendiğin gönderiler burada görünecek.</p>
            </div>`;
        return;
    }
    container.innerHTML = likedPosts.map(post => renderPostCard(post)).join('');
}

function renderProfileComments(container) {
    if (!currentUser) return;
    const userComments = [];
    allPosts.forEach(post => {
        post.comments.forEach(comment => {
            if (comment.userId === currentUser.id) {
                userComments.push({ ...comment, post });
            }
        });
    });
    userComments.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (userComments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3>Henüz yorum yapmadın</h3>
                <p>Yaptığın yorumlar burada görünecek.</p>
            </div>`;
        return;
    }
    const gradientIdx = currentUser.avatarGradient !== undefined ? currentUser.avatarGradient : (parseInt(currentUser.id.replace('u', '')) % AVATAR_GRADIENTS.length);
    container.innerHTML = userComments.map(item => `
        <div class="profile-comment-item" onclick="expandPost('${item.post.id}')">
            <div class="comment-avatar" style="background:${AVATAR_GRADIENTS[gradientIdx]}">${currentUser.username.charAt(0).toUpperCase()}</div>
            <div style="flex:1; min-width:0;">
                <div class="profile-comment-post-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    ${escapeHtml(item.post.title)}
                </div>
                <div class="profile-comment-text">${escapeHtml(item.text)}</div>
                <div class="profile-comment-meta">
                    <span>${getTimeAgo(item.date)}</span>
                    <span>❤️ ${item.likes.length}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderProfileBookmarks(container) {
    if (!currentUser) return;
    const bookmarkIds = currentUser.bookmarks || [];
    const bookmarkedPosts = allPosts.filter(p => bookmarkIds.includes(p.id));
    if (bookmarkedPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔖</div>
                <h3>Henüz kaydettiğin gönderi yok</h3>
                <p>Gönderilerdeki kaydet ikonuna tıklayarak burada biriktir.</p>
            </div>`;
        return;
    }
    container.innerHTML = bookmarkedPosts.map(post => renderPostCard(post)).join('');
}

function openEditProfile() {
    if (!currentUser) return;
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editBio').value = currentUser.bio || '';
    const gradientIdx = currentUser.avatarGradient !== undefined ? currentUser.avatarGradient : (parseInt(currentUser.id.replace('u', '')) % AVATAR_GRADIENTS.length);
    selectedAvatarColor = gradientIdx;
    document.querySelectorAll('.avatar-color-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.gradient) === gradientIdx);
    });
    const favGameVal = currentUser.favGame || '';
    document.getElementById('editFavGame').value = favGameVal;
    document.getElementById('favGameSelectText').textContent = favGameVal || 'Oyun Seçilmedi';

    document.getElementById('editAvatarImage').value = '';
    document.getElementById('editBannerImage').value = '';

    openModal('editProfileModal');
}

// ── Game Select Logic ──
const popularGamesList = [
    'The Witcher 3: Wild Hunt', 'Grand Theft Auto V', 'Grand Theft Auto VI', 'Red Dead Redemption 2',
    'Minecraft', 'Counter-Strike 2', 'Valorant', 'League of Legends', 'Dota 2',
    'Elden Ring', 'Cyberpunk 2077', "Baldur's Gate 3", 'Apex Legends', 'Overwatch 2',
    'Call of Duty: Warzone', 'Fortnite', 'PUBG: Battlegrounds', 'Half-Life 2',
    'Portal 2', 'God of War', "Marvel's Spider-Man", 'The Last of Us Part I',
    'Resident Evil 4', 'Hollow Knight', 'Stardew Valley', 'Hades', 'Genshin Impact'
];

function toggleFavGameDropdown() {
    const menu = document.getElementById('favGameSelectMenu');
    const isActive = menu.classList.contains('active');

    if (!isActive) {
        menu.classList.add('active');
        document.getElementById('favGameSearchInput').value = '';
        renderFavGameOptions(popularGamesList);
        document.getElementById('favGameSearchInput').focus();
    } else {
        menu.classList.remove('active');
    }
}

let favGameSearchTimeout = null;

function filterFavGames() {
    clearTimeout(favGameSearchTimeout);
    const query = document.getElementById('favGameSearchInput').value.trim();

    if (query.length === 0) {
        renderFavGameOptions(popularGamesList);
        return;
    }

    // Listeyi yükleniyor durumuna al
    document.getElementById('favGameOptionsList').innerHTML = `<div class="custom-option" style="text-align:center; color: var(--text-muted);">Arama yapılıyor...</div>`;

    favGameSearchTimeout = setTimeout(async () => {
        try {
            const url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=10&search=${encodeURIComponent(query)}&search_precise=true`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            const gameNames = data.results && data.results.length > 0
                ? data.results.map(g => g.name)
                : [];

            renderFavGameOptions(gameNames, query);
        } catch (error) {
            console.error('RAWG Fav Game Search Error:', error);
            // Hata olursa yine de oyuncunun kendi yazdığını seçmesine izin verelim
            renderFavGameOptions([], query);
        }
    }, 400); // 400ms debounce
}

function renderFavGameOptions(games, query = '') {
    const list = document.getElementById('favGameOptionsList');
    if (games.length === 0 && query !== '') {
        // If not found, let them add it as a custom entry
        list.innerHTML = `<div class="custom-option" onclick="selectFavGame('${escapeHtml(query)}')">"${escapeHtml(query)}" olarak kaydet</div>`;
        return;
    }

    list.innerHTML = games.map(g => `<div class="custom-option" onclick="selectFavGame('${escapeHtml(g)}')">${escapeHtml(g)}</div>`).join('');
}

function selectFavGame(gameName) {
    document.getElementById('editFavGame').value = gameName;
    document.getElementById('favGameSelectText').textContent = gameName;
    document.getElementById('favGameSelectMenu').classList.remove('active');
}

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    const container = e.target.closest('.custom-select-container');
    if (!container) {
        const menu = document.getElementById('favGameSelectMenu');
        if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
        }
    }
});

function selectAvatarColor(idx) {
    selectedAvatarColor = idx;
    document.querySelectorAll('.avatar-color-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.gradient) === idx);
    });
}

async function handleEditProfile(e) {
    e.preventDefault();
    if (!currentUser) return;
    const newUsername = document.getElementById('editUsername').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    if (allUsers.find(u => u.id !== currentUser.id && u.username.toLowerCase() === newUsername.toLowerCase())) {
        showToast('Bu kullanıcı adı zaten alınmış!', 'error');
        return;
    }
    currentUser.username = newUsername;
    currentUser.bio = newBio;
    currentUser.avatarGradient = selectedAvatarColor;
    currentUser.favGame = document.getElementById('editFavGame').value.trim();

    const convertToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const avatarFile = document.getElementById('editAvatarImage').files[0];
    const bannerFile = document.getElementById('editBannerImage').files[0];

    try {
        if (avatarFile) currentUser.avatarImage = await convertToBase64(avatarFile);
        if (bannerFile) currentUser.bannerImage = await convertToBase64(bannerFile);
    } catch (err) {
        showToast('Resim yüklenirken hata oluştu', 'error');
        return;
    }

    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) allUsers[userIdx] = { ...currentUser };
    setStore(STORAGE_KEYS.users, allUsers);
    setStore(STORAGE_KEYS.currentUser, currentUser);
    rebuildUserMap();
    updateAuthUI();
    refreshCurrentView();
    closeModal('editProfileModal');
    showToast('Profil güncellendi! ✨', 'success');
}

// ================================================================
//   GAMES SYSTEM – RAWG API Integration
// ================================================================

// (API keys are now fetched dynamically from Vercel environment variables)
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// ── IsThereAnyDeal API v2 ──
// API anahtarı almak için: https://isthereanydeal.com/dev/app/
const ITAD_BASE = 'https://api.isthereanydeal.com';
const ITAD_SHOP_ICONS = {
    'Steam': '🎮', 'GOG': '🔮', 'Epic Game Store': '⚡',
    'Humble Store': '💚', 'Humble Bundle': '💚', 'IndieGala': '🎁',
};
// Görüntülenecek isim düzeltmeleri (API adı → kullanıcıya gösterilen ad)
const ITAD_SHOP_NAME_MAP = {
    'Humble Store': 'Humble Bundle',
};
// Türkiye'de yaygın kullanılan mağazalar
const TR_POPULAR_SHOPS = new Set([
    'Steam', 'GOG', 'Epic Game Store',
    'Humble Store', 'Humble Bundle', 'IndieGala',
]);
let gamesNextPageUrl = null;
let gamesIsLoading = false;
let gamesSearchTimeout = null;
let gamesScrollObserver = null;
let gamesAbortController = null;
let gamesRequestId = 0;

// ── Reviews Pinterest State ──
let reviewsScrollObserver = null;
let reviewsDisplayCount = 20;
const REVIEWS_PAGE_SIZE = 20;

// ── New Post Editor (NPE) State ──
let npeTags = [];
let npeMediaData = null;
let npeGameSelected = null;
let npeGameSearchTimeout = null;
let npeGameAbortController = null;
let npeGameRequestId = 0;
let npeGameSearchResults = [];

// Helper: get today's date in YYYY-MM-DD format for API filtering
function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Başlık benzerlik skoru: Dice katsayısı (0-1 arası) ──
// İki başlığın kelime kümelerinin örtüşmesini ölçer.
// Örnek: "Resident Evil 9: Requiem" vs "Resident Evil 4 (2005)" → ~0.5 (düşük, reddedilir)
//        "Resident Evil 4 Remake" vs "Resident Evil 4 (2023)"    → ~0.75 (kabul edilir)
function itadTitleScore(searched, candidate) {
    // Roma rakamlarını Arap rakamlarına çevir: "Part II" → "Part 2"
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const norm = s => s.toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(w => ROMAN[w] !== undefined ? String(ROMAN[w]) : w)
        .join(' ');

    const ns = norm(searched);
    const nc = norm(candidate);

    // Tam eşleşme → maksimum skor (ör. "The Last of Us Part I" = "Part 1")
    if (ns === nc) return 1.0;

    const ws = ns.split(' ').filter(Boolean);
    const wcA = nc.split(' ').filter(Boolean);
    const wc = new Set(wcA);

    if (ws.length === 0 || wc.size === 0) return 0;

    const matched = ws.filter(w => wc.has(w)).length;
    const dice = (2 * matched) / (ws.length + wcA.length);

    // Aday başlık aranandan uzunsa kelime oranı kadar ceza uygula
    // "Minecraft" vs "Minecraft Dungeons": 0.667 × 0.5 = 0.333 → reddedilir
    const lengthPenalty = wcA.length > ws.length ? ws.length / wcA.length : 1;

    return dice * lengthPenalty;
}

// ── IsThereAnyDeal: oyun başlığına göre fiyat listesi çek ──
async function fetchGamePrices(gameTitle, rawgId) {
    try {
        let itadGameId = null;
        let itadSlug = null;

        // ── Aşama 1: RAWG'dan Steam ID al → ITAD'da birebir lookup ──
        if (rawgId) {
            try {
                const storesRes = await fetch(`${RAWG_BASE_URL}/games/${rawgId}/stores?key=${RAWG_API_KEY}`);
                if (storesRes.ok) {
                    const storesData = await storesRes.json();
                    const steamEntry = (storesData.results || []).find(s => s.store_id === 1);
                    if (steamEntry?.url) {
                        const m = steamEntry.url.match(/\/app\/(\d+)/);
                        if (m) {
                            const steamAppId = m[1];
                            const lookupRes = await fetch(
                                `${ITAD_BASE}/games/lookup/v1?key=${ITAD_API_KEY}&shop=steam&game_id=${steamAppId}`
                            );
                            if (lookupRes.ok) {
                                const lookupData = await lookupRes.json();
                                if (lookupData?.game?.id) {
                                    itadGameId = lookupData.game.id;
                                    itadSlug = lookupData.game.slug || '';
                                    console.log(`ITAD: Steam ID ${steamAppId} → "${lookupData.game.title}"`);
                                }
                            }
                        }
                    }
                }
            } catch (e) { /* Steam lookup başarısız, title search'e geç */ }
        }

        // ── Aşama 2: Steam ID bulunamazsa title search (fallback) ──
        if (!itadGameId) {
            const itadSearch = async (query) => {
                const res = await fetch(
                    `${ITAD_BASE}/games/search/v1?title=${encodeURIComponent(query)}&results=15&key=${ITAD_API_KEY}`
                );
                if (!res.ok) return [];
                return (await res.json()).filter(g => g.type === 'game');
            };

            let candidates = await itadSearch(gameTitle);

            const bestScore1 = candidates.length
                ? Math.max(...candidates.map(g => itadTitleScore(gameTitle, g.title)))
                : 0;

            if (bestScore1 < 0.6) {
                const simplified = gameTitle.replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim();
                if (simplified && simplified !== gameTitle) {
                    const c2 = await itadSearch(simplified);
                    const seen = new Set(candidates.map(g => g.id));
                    c2.forEach(g => { if (!seen.has(g.id)) { candidates.push(g); seen.add(g.id); } });
                }
            }

            const scored = candidates
                .map(g => ({ game: g, score: itadTitleScore(gameTitle, g.title) }))
                .sort((a, b) => b.score - a.score);

            const MATCH_THRESHOLD = 0.45;
            if (!scored.length || scored[0].score < MATCH_THRESHOLD) {
                console.log(`ITAD: "${gameTitle}" → eşleşme bulunamadı`);
                return null;
            }

            itadGameId = scored[0].game.id;
            itadSlug = scored[0].game.slug || '';
            console.log(`ITAD title match: "${gameTitle}" → "${scored[0].game.title}" (${scored[0].score.toFixed(2)})`);
        }

        // ── Aşama 3: Fiyatları çek ──
        const pricesRes = await fetch(
            `${ITAD_BASE}/games/prices/v3?key=${ITAD_API_KEY}&nondeals=true&vouchers=true&country=TR`,
            {
                method: 'POST',
                body: JSON.stringify([itadGameId])
            }
        );
        if (!pricesRes.ok) return null;
        const pricesData = await pricesRes.json();
        const gameData = pricesData[0] || null;

        return {
            deals: gameData?.deals || [],
            historyLow: gameData?.historyLow?.all || null,
            gameID: itadGameId,
            slug: itadSlug,
            title: gameTitle
        };
    } catch (e) {
        console.error('ITAD fetch error:', e);
        return null;
    }
}

// ── IsThereAnyDeal: fiyat bölümünü render et ──
function renderITADPricesSection(result) {
    const container = document.getElementById('itadPricesSection');
    if (!container) return;

    const searchUrl = result?.slug
        ? `https://isthereanydeal.com/game/${result.slug}/info/`
        : `https://isthereanydeal.com/search/?q=${encodeURIComponent(result?.title || '')}`;

    if (!result?.deals?.length) {
        container.innerHTML = `
            <p class="itad-empty">Bu oyun için şu an aktif fırsat bulunamadı.</p>
            <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-see-more">
                IsThereAnyDeal'da kontrol et →
            </a>
        `;
        return;
    }

    // Para birimi formatlayıcı: TRY → ₺12.345,00 | USD → $12.34 | EUR → €12.34
    const formatCurrency = (amount, currency) => {
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
        } catch {
            return `${currency || '$'} ${amount.toFixed(2)}`;
        }
    };

    const historyLowHtml = result.historyLow?.amount != null
        ? `<div class="itad-history-low">Tüm zamanların en düşüğü: <strong>${formatCurrency(result.historyLow.amount, result.historyLow.currency)}</strong></div>`
        : '';

    // Türkiye'de popüler mağazaları filtrele, indirim oranına göre sırala, en fazla 8 göster
    const sortedDeals = [...result.deals]
        .filter(deal => TR_POPULAR_SHOPS.has(deal.shop?.name))
        .sort((a, b) => (b.cut || 0) - (a.cut || 0))
        .slice(0, 8);

    const dealsHtml = sortedDeals.map(deal => {
        const shopNameRaw = deal.shop?.name || 'Mağaza';
        const shopName = ITAD_SHOP_NAME_MAP[shopNameRaw] || shopNameRaw;
        const shopIcon = ITAD_SHOP_ICONS[shopNameRaw] || '🏪';
        const cut = deal.cut || 0;
        const isDiscounted = cut > 0;
        const priceCur = deal.price?.currency || 'USD';
        const currentPrice = deal.price?.amount != null ? formatCurrency(deal.price.amount, priceCur) : '?';
        const regularPrice = deal.regular?.amount != null ? formatCurrency(deal.regular.amount, priceCur) : null;
        const buyUrl = deal.url || searchUrl;

        const regularHtml = isDiscounted && regularPrice
            ? `<span class="itad-regular-price">${regularPrice}</span>`
            : '';
        const badgeHtml = isDiscounted
            ? `<span class="itad-deal-badge">-%${cut}</span>`
            : '';
        const voucherHtml = deal.voucher
            ? `<span class="itad-voucher" title="Kupon: ${escapeHtml(deal.voucher)}">🎟️</span>`
            : '';
        return `
            <a href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-deal-card${isDiscounted ? ' is-sale' : ''}">
                <span class="itad-shop-name">${shopIcon} ${escapeHtml(shopName)} ${voucherHtml}</span>
                <span class="itad-price-row">
                    ${regularHtml}
                    <span class="itad-current-price">${currentPrice}</span>
                    ${badgeHtml}
                </span>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        ${historyLowHtml}
        <div class="itad-deals-grid">${dealsHtml}</div>
        <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-see-more">
            IsThereAnyDeal'da tüm fiyatları gör →
        </a>
    `;
}

// ── Shared Game Validity Check ──
function isValidGameForDisplay(g) {
    if (!g.background_image) return false;

    // Oyunun hesaplanan puanı
    const score = g.metacritic || Math.round((g.rating || 0) * 20);
    if (score === 0) return false;

    // Gelişmiş filtrelerde puan aralığı varsa her yerde (sonsuz kaydırmada bile) süz
    const hasRatingFilter = advFilters?.minRating > 0 || advFilters?.maxRating > 0;
    if (hasRatingFilter) {
        const effectiveMin = advFilters.minRating > 0 ? advFilters.minRating : 0;
        const effectiveMax = advFilters.maxRating > 0 ? advFilters.maxRating : 100;
        if (score < effectiveMin || score > effectiveMax) return false;
    }

    return true;
}

// ── Map RAWG API response to internal game format ──
function mapRawgGame(rawgGame) {
    const releaseDate = rawgGame.released || '';
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
    const platforms = (rawgGame.platforms || []).map(p => p.platform.name);
    const genres = (rawgGame.genres || []).map(g => g.name);
    const rating = rawgGame.metacritic || Math.round((rawgGame.rating || 0) * 20);

    // Parent platform names for a cleaner display
    const parentPlatforms = (rawgGame.parent_platforms || []).map(p => p.platform.name);

    return {
        id: String(rawgGame.id),
        rawgId: rawgGame.id,
        title: rawgGame.name || 'Bilinmeyen',
        developer: '', // Will be fetched on detail view
        publisher: '', // Will be fetched on detail view
        releaseYear: releaseYear,
        released: releaseDate,
        rating: rating,
        rawRating: rawgGame.rating || 0,
        ratingTop: rawgGame.rating_top || 5,
        ratingsCount: rawgGame.ratings_count || 0,
        coverUrl: rawgGame.background_image || '',
        backgroundUrl: rawgGame.background_image || '',
        description: '', // Will be fetched on detail view
        genres: genres,
        platforms: parentPlatforms.length > 0 ? parentPlatforms : platforms,
        allPlatforms: platforms,
        metacritic: rawgGame.metacritic || null,
        playtime: rawgGame.playtime ? `${rawgGame.playtime} saat` : null,
        added: rawgGame.added || 0,
        tags: (rawgGame.tags || []).slice(0, 6).map(t => t.name),
        esrbRating: rawgGame.esrb_rating ? rawgGame.esrb_rating.name : null,
        screenshots: (rawgGame.short_screenshots || []).map(s => s.image),
        slug: rawgGame.slug || '',
    };
}

// ── Helper: Auto-fetch API pages until enough games pass local filters ──
async function fetchAndFilterGames(initialUrl, requestTrackerId, minValid = 12, maxPages = 5) {
    let currentUrl = initialUrl;
    let fetchCount = 0;
    let validGames = [];

    while (currentUrl && fetchCount < maxPages && validGames.length < minValid) {
        fetchCount++;
        const response = await fetch(currentUrl, { signal: gamesAbortController.signal });
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        if (requestTrackerId !== gamesRequestId) return null; // Aborted/Stale request

        const data = await response.json();
        currentUrl = data.next;

        const mappedChunk = (data.results || [])
            .filter(isValidGameForDisplay)
            .map(mapRawgGame);

        validGames.push(...mappedChunk);
    }

    return {
        games: validGames,
        nextUrl: currentUrl
    };
}

function sortGamesBySearchQuery(games, query) {
    const queryLower = (query || '').trim().toLowerCase();

    return [...games].sort((a, b) => {
        const aMatch = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
        const bMatch = b.title.toLowerCase().includes(queryLower) ? 1 : 0;

        if (bMatch !== aMatch) return bMatch - aMatch;
        return (b.rating || 0) - (a.rating || 0);
    });
}

async function searchRawgGames(query, options = {}) {
    const {
        signal = null,
        pageSize = 40,
        minValid = 12,
        maxPages = 5,
        fetchAll = false
    } = options;

    const normalizedQuery = (query || '').trim();
    if (!RAWG_API_KEY || normalizedQuery.length < 2) {
        return { games: [], nextUrl: null };
    }

    let currentUrl = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=${pageSize}&search=${encodeURIComponent(normalizedQuery)}&dates=1970-01-01,${getTodayDate()}`;
    let fetchCount = 0;
    let validGames = [];

    while (currentUrl && (fetchAll || (fetchCount < maxPages && validGames.length < minValid))) {
        fetchCount++;

        const response = await fetch(currentUrl, signal ? { signal } : undefined);
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);

        const data = await response.json();
        currentUrl = data.next;

        const mappedChunk = (data.results || [])
            .filter(isValidGameForDisplay)
            .map(mapRawgGame);

        validGames.push(...mappedChunk);
    }

    return {
        games: sortGamesBySearchQuery(validGames, normalizedQuery),
        nextUrl: currentUrl
    };
}

async function searchRawgGamesProgressive(query, options = {}) {
    const {
        signal = null,
        pageSize = 40,
        onChunk = null
    } = options;

    const normalizedQuery = (query || '').trim();
    if (!RAWG_API_KEY || normalizedQuery.length < 2) {
        return { games: [], nextUrl: null };
    }

    let currentUrl = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=${pageSize}&search=${encodeURIComponent(normalizedQuery)}&dates=1970-01-01,${getTodayDate()}`;
    const seenIds = new Set();
    let validGames = [];

    while (currentUrl) {
        const response = await fetch(currentUrl, signal ? { signal } : undefined);
        if (!response.ok) throw new Error(`API HatasÄ±: ${response.status}`);

        const data = await response.json();
        currentUrl = data.next;

        const mappedChunk = (data.results || [])
            .filter(isValidGameForDisplay)
            .map(mapRawgGame)
            .filter(game => {
                if (seenIds.has(game.id)) return false;
                seenIds.add(game.id);
                return true;
            });

        validGames.push(...mappedChunk);

        if (typeof onChunk === 'function') {
            onChunk({
                games: sortGamesBySearchQuery(validGames, normalizedQuery),
                nextUrl: currentUrl,
                isComplete: !currentUrl
            });
        }
    }

    return {
        games: sortGamesBySearchQuery(validGames, normalizedQuery),
        nextUrl: currentUrl
    };
}

// ── Load Games from RAWG API ──
async function loadGames(append = false) {
    if (gamesIsLoading && append) return;
    // Don't load default games if a search is active
    if (currentGameSearch && !append) return;

    // Abort any previous request
    if (gamesAbortController) gamesAbortController.abort();
    gamesAbortController = new AbortController();
    const myRequestId = ++gamesRequestId;

    gamesIsLoading = true;

    const loading = document.getElementById('gamesLoading');
    const grid = document.getElementById('gamesGrid');

    if (!append) {
        grid.innerHTML = Array.from({ length: 12 }, () =>
            '<div class="game-card-skeleton"></div>'
        ).join('');
    }
    loading.style.display = 'block';

    try {
        let url;
        if (append && gamesNextPageUrl) {
            url = gamesNextPageUrl;
        } else {
            url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=40&ordering=-metacritic&dates=1970-01-01,${getTodayDate()}`;
        }

        const result = await fetchAndFilterGames(url, myRequestId);
        if (!result) return; // Stale

        gamesNextPageUrl = result.nextUrl;

        // Default loadGames fetches by -metacritic, we sort locally just to be perfectly uniform
        const newGames = result.games.sort((a, b) => b.rating - a.rating);

        if (append) {
            allGames = [...allGames, ...newGames];
        } else {
            allGames = newGames;
        }
        hasLoadedGamesCatalog = true;

        renderGamesGrid();
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('RAWG API Hatası:', error);
        const grid = document.getElementById('gamesGrid');
        if (!append || allGames.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Oyunlar yüklenemedi</h3>
                    <p>API bağlantısında bir sorun oluştu. Lütfen tekrar deneyin.</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="loadGames()">Tekrar Dene</button>
                </div>
            `;
        }
        showToast('Oyunlar yüklenirken bir hata oluştu!', 'error');
    } finally {
        if (myRequestId === gamesRequestId) {
            loading.style.display = 'none';
            gamesIsLoading = false;
        }
    }
}

function splitGameTitleForHero(title) {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [title || '', ''];
    const splitIndex = Math.ceil(words.length / 2);
    return [
        words.slice(0, splitIndex).join(' '),
        words.slice(splitIndex).join(' ')
    ];
}

function formatCompactNumber(value) {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
}

function parseRequirementText(text) {
    if (!text) return [];
    return String(text)
        .replace(/\r/g, '\n')
        .split(/\n+/)
        .map(line => line.replace(/\t/g, ' ').trim())
        .filter(Boolean)
        .map(line => line.replace(/^[-*]\s*/, ''))
        .map(line => {
            const match = line.match(/^([^:]{2,40}):\s*(.+)$/);
            if (!match) return null;
            return {
                label: match[1].trim(),
                value: match[2].trim()
            };
        })
        .filter(Boolean);
}

function renderRequirementCard(title, variant, text, fallbackText) {
    const items = parseRequirementText(text);
    if (!text && !fallbackText) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <div class="gd-spec-empty">RAWG tarafinda bu katman icin veri bulunamadi.</div>
            </div>
        `;
    }

    if (!items.length) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <pre class="sysreq-text">${escapeHtml(text || fallbackText)}</pre>
            </div>
        `;
    }

    return `
        <div class="gd-spec-card gd-spec-card--${variant}">
            <div class="gd-spec-card-title">${title}</div>
            <div class="gd-spec-list">
                ${items.map(item => `
                    <div class="gd-spec-row">
                        <span>${escapeHtml(item.label)}</span>
                        <strong>${escapeHtml(item.value)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSystemRequirementCards(requirements) {
    if (!requirements || requirements.length === 0) {
        return `
            <div class="gd-spec-duo">
                <div class="gd-spec-card gd-spec-card--minimum">
                    <div class="gd-spec-card-title">Minimum Tiers</div>
                    <div class="gd-spec-empty">RAWG bu oyun icin sistem gereksinimi donmuyor.</div>
                </div>
                <div class="gd-spec-card gd-spec-card--recommended">
                    <div class="gd-spec-card-title">Ultimate Spec</div>
                    <div class="gd-spec-empty">Detay geldikce burada onerilen donanim gorunecek.</div>
                </div>
            </div>
        `;
    }

    const primary = requirements.find(req => /pc|windows/i.test(req.platform)) || requirements[0];
    const platformLabel = primary.platform ? `<div class="gd-spec-platform">${escapeHtml(primary.platform)}</div>` : '';

    return `
        <div class="gd-spec-stack">
            ${platformLabel}
            <div class="gd-spec-duo">
                ${renderRequirementCard('Minimum Tiers', 'minimum', primary.minimum, primary.minimum || primary.recommended)}
                ${renderRequirementCard('Ultimate Spec', 'recommended', primary.recommended, primary.recommended || primary.minimum)}
            </div>
        </div>
    `;
}

function renderITADPricesSection(result) {
    const container = document.getElementById('itadPricesSection');
    if (!container) return;

    const searchUrl = result?.slug
        ? `https://isthereanydeal.com/game/${result.slug}/info/`
        : `https://isthereanydeal.com/search/?q=${encodeURIComponent(result?.title || '')}`;

    const formatCurrency = (amount, currency) => {
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
        } catch {
            return `${currency || '$'} ${amount.toFixed(2)}`;
        }
    };

    if (!result?.deals?.length) {
        container.innerHTML = `
            <div class="itad-offer-card itad-offer-card--empty">
                <div class="itad-offer-label">ITAD live price</div>
                <div class="itad-offer-empty">Bu oyun icin su an aktif teklif bulunamadi.</div>
                <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                    ITAD'da kontrol et
                </a>
            </div>
        `;
        return;
    }

    const sortedDeals = [...result.deals]
        .filter(deal => TR_POPULAR_SHOPS.has(deal.shop?.name))
        .sort((a, b) => (b.cut || 0) - (a.cut || 0))
        .slice(0, 8);
    const dealsToShow = sortedDeals.length > 0 ? sortedDeals : [...result.deals].slice(0, 8);
    const featuredDeal = [...dealsToShow].sort((a, b) => {
        const aAmount = a.price?.amount ?? Number.MAX_SAFE_INTEGER;
        const bAmount = b.price?.amount ?? Number.MAX_SAFE_INTEGER;
        return aAmount - bAmount;
    })[0];

    const dealsHtml = dealsToShow.map(deal => {
        const shopNameRaw = deal.shop?.name || 'Magaza';
        const shopName = ITAD_SHOP_NAME_MAP[shopNameRaw] || shopNameRaw;
        const shopIcon = ITAD_SHOP_ICONS[shopNameRaw] || 'Store';
        const cut = deal.cut || 0;
        const isDiscounted = cut > 0;
        const priceCur = deal.price?.currency || 'USD';
        const currentPrice = deal.price?.amount != null ? formatCurrency(deal.price.amount, priceCur) : '?';
        const regularPrice = deal.regular?.amount != null ? formatCurrency(deal.regular.amount, priceCur) : null;
        const buyUrl = deal.url || searchUrl;

        return `
            <a href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-deal-card${isDiscounted ? ' is-sale' : ''}">
                <span class="itad-shop-name">${escapeHtml(shopIcon)} ${escapeHtml(shopName)}</span>
                <span class="itad-price-row">
                    ${isDiscounted && regularPrice ? `<span class="itad-regular-price">${regularPrice}</span>` : ''}
                    <span class="itad-current-price">${currentPrice}</span>
                    ${isDiscounted ? `<span class="itad-deal-badge">-%${cut}</span>` : ''}
                </span>
            </a>
        `;
    }).join('');

    const featuredCurrent = featuredDeal?.price?.amount != null
        ? formatCurrency(featuredDeal.price.amount, featuredDeal.price.currency)
        : '?';
    const featuredRegular = featuredDeal?.regular?.amount != null
        ? formatCurrency(featuredDeal.regular.amount, featuredDeal.regular.currency)
        : null;
    const featuredCut = featuredDeal?.cut || 0;
    const featuredBuyUrl = featuredDeal?.url || searchUrl;
    const historyLowHtml = result.historyLow?.amount != null
        ? `<div class="itad-history-low">Tum zamanlarin en dusugu: <strong>${formatCurrency(result.historyLow.amount, result.historyLow.currency)}</strong></div>`
        : '';

    container.innerHTML = `
        <div class="itad-offer-card">
            <div class="itad-offer-label">Best offer</div>
            <div class="itad-offer-price-wrap">
                <div class="itad-offer-price">${featuredCurrent}</div>
                ${featuredRegular ? `<div class="itad-offer-regular">${featuredRegular}</div>` : ''}
                ${featuredCut > 0 ? `<div class="itad-offer-discount">-%${featuredCut}</div>` : ''}
            </div>
            ${historyLowHtml}
            <a href="${escapeHtml(featuredBuyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                Satin al
            </a>
            <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-wishlist-btn">
                Tum fiyatlari gor
            </a>
            <div class="itad-offer-meta">
                <span>TR market scan</span>
                <span>Digital delivery</span>
            </div>
        </div>
        <div class="itad-deals-grid">${dealsHtml}</div>
    `;
}

function renderGameDetailContentV2(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const description = game.description || 'Aciklama yukleniyor...';
    const developer = game.developer || 'Yukleniyor...';
    const publisher = game.publisher || 'Yukleniyor...';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;
    const screenshots = (game.screenshots || []).slice(0, 3);
    const heroBlurb = description.length > 220 ? `${description.slice(0, 220).trim()}...` : description;
    const splitTitle = splitGameTitleForHero(game.title);
    const statsRibbon = [
        { label: 'Playtime', value: game.playtime || '-' },
        { label: 'Active', value: game.added ? `${formatCompactNumber(game.added)}+` : '-' },
        { label: 'Reviews', value: game.ratingsCount ? `${formatCompactNumber(game.ratingsCount)}+` : '-' }
    ];

    document.getElementById('gameDetailHero').innerHTML = `
        <img src="${escapeHtml(game.backgroundUrl || game.coverUrl)}" alt="" class="game-detail-hero-bg"
             onerror="this.style.background='var(--bg-elevated)'">
        <div class="gd-hero-backdrop"></div>
        <div class="gd-hero-orb gd-hero-orb--one"></div>
        <div class="gd-hero-orb gd-hero-orb--two"></div>
        <div class="game-detail-hero-content gd-cinematic-hero">
            <div class="gd-hero-copy">
                <div class="gd-hero-meta-strip">
                    ${game.rating > 0 ? `<span class="gd-score-pill ${ratingClass}">${starSvg} ${game.rating}</span>` : ''}
                    <span class="gd-meta-inline">Release Year: ${game.releaseYear || 'TBA'}</span>
                    ${game.esrbRating ? `<span class="gd-meta-inline">${escapeHtml(game.esrbRating)}</span>` : ''}
                </div>
                <h2 class="game-detail-title gd-cinematic-title">
                    <span>${escapeHtml(splitTitle[0])}</span>
                    ${splitTitle[1] ? `<span class="accent">${escapeHtml(splitTitle[1])}</span>` : ''}
                </h2>
                <div class="game-detail-genres gd-hero-tag-row">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
            </div>

            <aside class="gd-hero-side">
                <div class="gd-poster-card" ${game.screenshots && game.screenshots.length > 0 ? `onclick="openScreenshotLightbox('${escapeHtml(game.id)}')"` : ''}>
                    <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
                         onerror="this.style.background='var(--bg-elevated)'">
                    ${(game.screenshots && game.screenshots.length > 0) ? `<div class="game-detail-cover-badge">${game.screenshots.length} shots</div>` : ''}
                </div>
                <div class="gd-hero-stats-card">
                    ${statsRibbon.map(item => `
                        <div class="gd-hero-stat">
                            <span>${escapeHtml(item.label)}</span>
                            <strong>${escapeHtml(item.value)}</strong>
                        </div>
                    `).join('')}
                </div>
            </aside>
        </div>
        <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="game-detail-rawg-watermark" title="Veriler RAWG Database'inden alinmistir">RAWG.io</a>
    `;

    document.getElementById('gameDetailInfo').innerHTML = `
        <div class="gd-detail-layout">
            <section class="gd-section gd-section--about">
                <div class="gd-section-title">
                    <span></span>
                    <h3>Game description</h3>
                </div>
                <div class="gd-about-grid">
                    <div class="gd-about-main">
                        <div class="gd-desc-box" id="gdDescBox" onclick="toggleGameDesc()">
                            <p class="gd-desc-text" id="gdDescText">${escapeHtml(description)}</p>
                            <div class="gd-desc-fade"></div>
                            <div class="gd-desc-toggle">Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></div>
                        </div>
                    </div>
                    <aside class="gd-info-card">
                        <div class="gd-info-block">
                            <div class="gd-info-label">Developed by</div>
                            <div class="gd-info-value gd-info-value--stack">
                                ${(game.developerData && game.developerData.length > 0
            ? game.developerData.map(d => `<button class="creator-link" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(d.name)}','${escapeHtml(d.slug)}','developer')">${escapeHtml(d.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(developer)}</span>`)}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">Published by</div>
                            <div class="gd-info-value gd-info-value--stack">
                                ${(game.publisherData && game.publisherData.length > 0
            ? game.publisherData.map(p => `<button class="creator-link creator-link--publisher" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(p.name)}','${escapeHtml(p.slug)}','publisher')">${escapeHtml(p.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(publisher)}</span>`)}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">Platforms</div>
                            <div class="gd-platforms">
                                ${displayPlatforms.map(p => `<span class="gd-platform-chip">${escapeHtml(p)}</span>`).join('')}
                            </div>
                        </div>
                        <div class="gd-info-block">
                            <div class="gd-info-label">RAWG stats</div>
                            <div class="gd-rawg-stat-list">
                                <div><span>Metacritic</span><strong>${game.rating > 0 ? game.rating : '-'}</strong></div>
                                <div><span>User rating</span><strong>${game.rawRating ? game.rawRating.toFixed(1) : '-'}</strong></div>
                                <div><span>Release</span><strong>${formattedReleaseDate}</strong></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            <section class="gd-section gd-section--specs">
                <div class="gd-specs-header">
                    <div>
                        <div class="gd-section-heading">Technical Specifications</div>
                        <p>Donanim bilgileri RAWG uzerinden geliyor, fiyat taramasi ITAD ile ayrik tutuluyor.</p>
                    </div>
                </div>
                <div class="gd-specs-layout">
                    <div class="gd-specs-grid">
                        ${renderSystemRequirementCards(game.systemRequirements)}
                    </div>
                    <aside class="gd-price-column">
                        <div class="gd-price-card">
                            <div class="gd-price-head">
                                <strong>ITAD</strong>
                            </div>
                            <div id="itadPricesSection" class="itad-prices-section">
                                <div class="itad-loading">
                                    <div class="games-loading-spinner" style="width:18px;height:18px;border-width:2px;margin:0;"></div>
                                    <span>Fiyatlar yukleniyor...</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    `;
}

function toggleGameDesc() {
    const box = document.getElementById('gdDescBox');
    if (!box) return;
    const isExpanded = box.classList.toggle('expanded');
    const btn = box.querySelector('.gd-desc-toggle');
    if (btn) btn.innerHTML = isExpanded
        ? 'Kucult <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
}

// ── Search Games from RAWG API ──
async function searchGamesFromAPI(query) {
    // Abort any previous request
    if (gamesAbortController) gamesAbortController.abort();
    gamesAbortController = new AbortController();
    const myRequestId = ++gamesRequestId;

    gamesIsLoading = true;

    const loading = document.getElementById('gamesLoading');
    const grid = document.getElementById('gamesGrid');

    grid.innerHTML = Array.from({ length: 8 }, () =>
        '<div class="game-card-skeleton"></div>'
    ).join('');
    loading.style.display = 'block';

    try {
        const result = await searchRawgGames(query, {
            signal: gamesAbortController.signal,
            pageSize: 40,
            minValid: 12,
            maxPages: 5
        });
        if (myRequestId !== gamesRequestId) return;
        if (!result) return;

        gamesNextPageUrl = result.nextUrl;
        allGames = result.games.slice(0, 20);
        hasLoadedGamesCatalog = true;
        renderGamesGrid();
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('RAWG Arama Hatası:', error);
        showToast('Arama sırasında bir hata oluştu!', 'error');
        renderGamesGrid();
    } finally {
        if (myRequestId === gamesRequestId) {
            loading.style.display = 'none';
            gamesIsLoading = false;
        }
    }
}

// ── Fetch Game Details from RAWG API ──
async function fetchGameDetails(gameId) {
    try {
        // Fetch game details
        const detailRes = await fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`);
        if (!detailRes.ok) throw new Error(`API Hatası: ${detailRes.status}`);
        const detail = await detailRes.json();

        // Update the game in allGames with detailed info
        const gameIndex = allGames.findIndex(g => g.id === String(gameId));
        if (gameIndex !== -1) {
            // Clean HTML from description
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = detail.description || '';
            const cleanDescription = tempDiv.textContent || tempDiv.innerText || '';

            allGames[gameIndex].description = cleanDescription;
            allGames[gameIndex].developer = (detail.developers || []).map(d => d.name).join(', ') || 'Bilinmiyor';
            allGames[gameIndex].publisher = (detail.publishers || []).map(p => p.name).join(', ') || 'Bilinmiyor';
            allGames[gameIndex].developerData = (detail.developers || []).map(d => ({ name: d.name, slug: d.slug }));
            allGames[gameIndex].publisherData = (detail.publishers || []).map(p => ({ name: p.name, slug: p.slug }));
            allGames[gameIndex].backgroundUrl = detail.background_image_additional || detail.background_image || allGames[gameIndex].coverUrl;
            allGames[gameIndex].website = detail.website || '';
            allGames[gameIndex].redditUrl = detail.reddit_url || '';

            if (detail.metacritic) {
                allGames[gameIndex].metacritic = detail.metacritic;
                allGames[gameIndex].rating = detail.metacritic;
            }
            if (detail.playtime) {
                allGames[gameIndex].playtime = `${detail.playtime} saat`;
            }
            if (detail.esrb_rating) {
                allGames[gameIndex].esrbRating = detail.esrb_rating.name;
            }

            // Extract system requirements
            const requirements = [];
            if (detail.platforms) {
                detail.platforms.forEach(p => {
                    if (p.requirements && (p.requirements.minimum || p.requirements.recommended)) {
                        requirements.push({
                            platform: p.platform.name,
                            minimum: p.requirements.minimum || '',
                            recommended: p.requirements.recommended || ''
                        });
                    }
                });
            }
            allGames[gameIndex].systemRequirements = requirements;

            // Fetch screenshots
            try {
                const ssRes = await fetch(`${RAWG_BASE_URL}/games/${gameId}/screenshots?key=${RAWG_API_KEY}&page_size=20`);
                if (ssRes.ok) {
                    const ssData = await ssRes.json();
                    allGames[gameIndex].screenshots = (ssData.results || []).map(s => s.image);
                }
            } catch (ssErr) {
                console.warn('Screenshots alınamadı:', ssErr);
            }
        }

        return allGames[gameIndex] || null;
    } catch (error) {
        console.error('Oyun detayı alınırken hata:', error);
        return null;
    }
}

// ── Browser Games Data & Logic ──
const allBrowserGames = [
    { id: 'minesweeper', title: 'Mayın Tarlası', category: 'Bulmaca', imageUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="mineGrad" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#2D5A43" /><stop offset="100%" stop-color="#0F1D17" /></radialGradient></defs><g stroke="#6BAA75" stroke-width="6" stroke-linecap="round"><line x1="50" y1="20" x2="50" y2="6" /><line x1="50" y1="80" x2="50" y2="94" /><line x1="20" y1="50" x2="6" y2="50" /><line x1="80" y1="50" x2="94" y2="50" /><line x1="28" y1="28" x2="16" y2="16" /><line x1="72" y1="72" x2="84" y2="84" /><line x1="28" y1="72" x2="16" y2="84" /><line x1="72" y1="28" x2="84" y2="16" /></g><circle cx="50" cy="50" r="34" fill="url(#mineGrad)" stroke="#1A3A2A" stroke-width="4"/><circle cx="38" cy="38" r="8" fill="#ffffff" opacity="0.15" /><circle cx="50" cy="50" r="8" fill="#A4C639" /><circle cx="52" cy="48" r="3" fill="#ffffff" opacity="0.6" /></svg>'), description: 'Klasik mayın tarlası oyunu. Mayınlara dikkat et!' },
    { id: 'sudoku', title: 'Sudoku', category: 'Bulmaca', imageUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="sudGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1A3A2A" /><stop offset="100%" stop-color="#0F1D17" /></linearGradient></defs><rect width="100" height="100" fill="url(#sudGrad)" rx="12"/><g stroke="#6BAA75" stroke-width="1" opacity="0.4"><line x1="33" y1="10" x2="33" y2="90"/><line x1="67" y1="10" x2="67" y2="90"/><line x1="10" y1="33" x2="90" y2="33"/><line x1="10" y1="67" x2="90" y2="67"/></g><g stroke="#6BAA75" stroke-width="2.5" opacity="0.9"><line x1="10" y1="10" x2="90" y2="10"/><line x1="10" y1="90" x2="90" y2="90"/><line x1="10" y1="10" x2="10" y2="90"/><line x1="90" y1="10" x2="90" y2="90"/></g><g fill="#A4C639" font-family="monospace" font-weight="bold" font-size="11" text-anchor="middle" dominant-baseline="middle"><text x="21" y="21">5</text><text x="55" y="21" fill="#6BAA75" font-size="9">3</text><text x="80" y="21">7</text><text x="21" y="50" fill="#6BAA75" font-size="9">6</text><text x="50" y="50">9</text><text x="80" y="50">1</text><text x="21" y="80">4</text><text x="50" y="80" fill="#6BAA75" font-size="9">8</text><text x="80" y="80">2</text></g></svg>'), description: 'Klasik 9×9 sayı bulmacası. Mantık ve stratejiyle tamamla!' }
];

let currentBrowserGameFilter = 'all';

function setBrowserGameFilter(filter) {
    currentBrowserGameFilter = filter;
    document.querySelectorAll('#browserGamesFilterBar .games-filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderBrowserGamesGrid();
}

function filterBrowserGames() {
    renderBrowserGamesGrid();
}

function renderBrowserGameCard(game) {
    return `
        <div class="browser-game-card" onclick="openBrowserGame('${game.id}')">
            <div class="bgc-art">
                <img src="${game.imageUrl}" alt="${escapeHtml(game.title)}"
                     style="width:100%;height:100%;object-fit:contain;padding:18%;filter:drop-shadow(0 12px 28px rgba(0,0,0,0.7));"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%230f1d17%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%236baa75%22 font-size=%2240%22 x=%2250%22 y=%2255%22 text-anchor=%22middle%22%3E🎮%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="bgc-overlay"></div>
            <div class="bgc-play-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div class="bgc-footer">
                <div class="bgc-title">${escapeHtml(game.title)}</div>
                <div class="bgc-desc">${escapeHtml(game.description)}</div>
            </div>
        </div>
    `;
}

function openBrowserGame(id) {
    const game = allBrowserGames.find(g => g.id === id);
    if (!game) return;

    document.getElementById('browserGameOverlayTitle').textContent = game.title;

    // Set iframe source based on game id
    const iframe = document.getElementById('browserGameIframe');
    if (id === 'minesweeper') {
        iframe.src = '/games/minesweeper.html';
    } else if (id === 'sudoku') {
        iframe.src = '/games/sudoku.html';
    } else {
        iframe.src = 'about:blank'; // Placeholders
    }

    openModal('browserGameOverlay');
}

function renderBrowserGamesGrid() {
    const grid = document.getElementById('browserGamesGrid');
    if (!grid) return;
    grid.innerHTML = allBrowserGames.map(game => renderBrowserGameCard(game)).join('');
}

// ── Advanced Game Filters ──
let advFilters = {
    genre: '',
    platform: '',
    ordering: '',
    gameMode: '',
    minRating: 0,
    maxRating: 0,
    yearFrom: '',
    yearTo: '',
};

function toggleAdvFilter() {
    const panel = document.getElementById('advFilterPanel');
    const toggle = document.getElementById('advFilterToggle');
    const isOpen = panel.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
}

function applyAdvFilters(changedField) {
    advFilters.genre = document.getElementById('advGenre')?.value || '';
    advFilters.platform = document.getElementById('advPlatform')?.value || '';
    advFilters.ordering = document.getElementById('advOrdering')?.value ?? '';
    advFilters.gameMode = document.getElementById('advGameMode')?.value || '';

    const minEl = document.getElementById('advMinRating');
    const maxEl = document.getElementById('advMaxRating');

    let minVal = parseInt(minEl?.value || '0', 10) || 0;
    let maxVal = parseInt(maxEl?.value || '0', 10) || 0;

    // 100'ü geçemesin
    minVal = Math.min(Math.max(minVal, 0), 100);
    maxVal = Math.min(Math.max(maxVal, 0), 100);

    // Max her zaman Min'den büyük veya eşit olmalı
    if (maxVal > 0 && minVal > 0 && minVal > maxVal) {
        showToast('Minimum puan, maksimum puandan büyük olamaz!', 'error');
        // Hatalı alanı bir sonraki render döngüsünde temizle
        requestAnimationFrame(() => {
            if (changedField === 'min') {
                minEl.value = '';
            } else {
                maxEl.value = '';
            }
        });
        return;
    }

    // Clamplanmış puan değerlerini inputlara yaz
    if (minEl?.value) minEl.value = minVal;
    if (maxEl?.value) maxEl.value = maxVal;

    advFilters.minRating = minVal;
    advFilters.maxRating = maxVal;

    // ── Yıl Aralığı Validasyonu ──
    const yearFromEl = document.getElementById('advYearFrom');
    const yearToEl = document.getElementById('advYearTo');

    let yearFrom = parseInt(yearFromEl?.value || '0', 10) || 0;
    let yearTo = parseInt(yearToEl?.value || '0', 10) || 0;

    // 1980-2026 aralığına sıkıştır ve inputlara yaz
    if (yearFrom) {
        yearFrom = Math.min(Math.max(yearFrom, 1980), 2026);
        yearFromEl.value = yearFrom;
    }
    if (yearTo) {
        yearTo = Math.min(Math.max(yearTo, 1980), 2026);
        yearToEl.value = yearTo;
    }

    // Bitiş yılı başlangıçtan küçük olamaz
    if (yearFrom && yearTo && yearFrom > yearTo) {
        showToast('Başlangıç yılı, bitiş yılından büyük olamaz!', 'error');
        requestAnimationFrame(() => {
            if (changedField === 'yearFrom') {
                yearFromEl.value = '';
            } else {
                yearToEl.value = '';
            }
        });
        return;
    }

    advFilters.yearFrom = yearFrom ? String(yearFrom) : '';
    advFilters.yearTo = yearTo ? String(yearTo) : '';

    updateAdvFilterTags();
    loadGamesWithAdvFilters();
}

function resetAdvFilters() {
    document.getElementById('advGenre').value = '';
    document.getElementById('advPlatform').value = '';
    document.getElementById('advOrdering').value = '';
    document.getElementById('advGameMode').value = '';
    document.getElementById('advMinRating').value = '';
    document.getElementById('advMaxRating').value = '';
    document.getElementById('advYearFrom').value = '';
    document.getElementById('advYearTo').value = '';
    advFilters = { genre: '', platform: '', ordering: '', gameMode: '', minRating: 0, maxRating: 0, yearFrom: '', yearTo: '' };
    updateAdvFilterTags();
    loadGames();
}

function updateAdvFilterTags() {
    const container = document.getElementById('advFilterActiveTags');
    if (!container) return;
    const tags = [];
    const genreMap = { action: 'Aksiyon', adventure: 'Macera', 'role-playing-games-rpg': 'RPG', shooter: 'Nişancı', strategy: 'Strateji', simulation: 'Simülasyon', puzzle: 'Bulmaca', sports: 'Spor', racing: 'Yarış', fighting: 'Dövüş', indie: 'Indie', platformer: 'Platform' };
    const platMap = { 4: 'PC', 187: 'PS5', 18: 'PS4', 186: 'Xbox Series X', 1: 'Xbox One', 7: 'Nintendo Switch', 3: 'iOS', 21: 'Android' };
    const orderMap = { '-released': 'En Yeni', released: 'En Eski', '-rating': 'Kullanıcı Puanı' };
    const modeMap = { singleplayer: 'Tek Oyunculu', multiplayer: 'Çok Oyunculu', 'co-op': 'Eşli (Co-op)' };
    if (advFilters.genre) tags.push(genreMap[advFilters.genre] || advFilters.genre);
    if (advFilters.platform) tags.push(platMap[advFilters.platform] || advFilters.platform);
    if (advFilters.ordering) tags.push(orderMap[advFilters.ordering] || advFilters.ordering); // boş = Tümü, etiket gösterme
    if (advFilters.gameMode) tags.push(modeMap[advFilters.gameMode] || advFilters.gameMode);
    if (advFilters.minRating > 0 || advFilters.maxRating > 0) {
        const minStr = advFilters.minRating > 0 ? String(advFilters.minRating) : '0';
        const maxStr = advFilters.maxRating > 0 ? String(advFilters.maxRating) : '100';
        tags.push(`⭐ ${minStr}–${maxStr}`);
    }
    if (advFilters.yearFrom) tags.push(`${advFilters.yearFrom}–`);
    if (advFilters.yearTo) tags.push(`–${advFilters.yearTo}`);
    container.innerHTML = tags.map(t => `<span class="adv-active-tag">${t}</span>`).join('');
    container.style.display = tags.length ? 'flex' : 'none';
}

async function loadGamesWithAdvFilters() {
    if (gamesAbortController) gamesAbortController.abort();
    gamesAbortController = new AbortController();
    const myRequestId = ++gamesRequestId;
    gamesIsLoading = true;

    const loading = document.getElementById('gamesLoading');
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = Array.from({ length: 12 }, () => '<div class="game-card-skeleton"></div>').join('');
    loading.style.display = 'block';

    try {
        // Tümü (ordering='') → -metacritic, diğer seçenekler direkt API'ye geçer
        const isDateOrdering = advFilters.ordering === '-released' || advFilters.ordering === 'released';
        const apiOrdering = advFilters.ordering || '-metacritic';

        let url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=40&ordering=${apiOrdering}&dates=1970-01-01,${getTodayDate()}`;
        if (advFilters.genre) url += `&genres=${advFilters.genre}`;
        if (advFilters.platform) url += `&platforms=${advFilters.platform}`;
        if (advFilters.gameMode) url += `&tags=${advFilters.gameMode}`;

        // Yıl aralığı — API'ye gönder (bu güvenli, yıl Metacritic ile bağlantısız)
        if (advFilters.yearFrom) {
            const dateTo = advFilters.yearTo ? `${advFilters.yearTo}-12-31` : getTodayDate();
            url += `&dates=${advFilters.yearFrom}-01-01,${dateTo}`;
        } else if (advFilters.yearTo) {
            url += `&dates=1970-01-01,${advFilters.yearTo}-12-31`;
        }

        // ÖNEMLİ: Puan aralığını API'ye GÖNDERMİYORUZ.
        // Metacritic skoru henüz olmayan (2026 gibi yeni) oyunları elemek istemiyoruz.
        // Puan filtresi ve auto-pagination tamamen client-side hesaplanacak.

        const result = await fetchAndFilterGames(url, myRequestId, 15, 6);
        if (!result) return;

        gamesNextPageUrl = result.nextUrl;

        // Sadece "Tümü" seçiliyken (ordering='') client-side puan sıralaması uygula.
        // Diğer seçeneklerde (En Yeni, En Eski, Kullanıcı Puanı) API sıralamasını koru.
        allGames = advFilters.ordering === ''
            ? result.games.sort((a, b) => b.rating - a.rating)
            : result.games;
        hasLoadedGamesCatalog = true;

        renderGamesGrid();

    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('RAWG Gelişmiş Filtre Hatası:', error);
        showToast('Filtre uygulanırken hata oluştu!', 'error');
    } finally {
        if (myRequestId === gamesRequestId) {
            loading.style.display = 'none';
            gamesIsLoading = false;
        }
    }
}

// ── Render Games Grid ──
function renderGamesGrid() {
    const grid = document.getElementById('gamesGrid');
    let games = [...allGames];

    // Apply local filter (search is done via API now)
    if (currentGameFilter === 'high-rated') {
        games = games.filter(g => g.rating >= 80);
        games.sort((a, b) => b.rating - a.rating);
    } else if (currentGameFilter === 'newest') {
        games.sort((a, b) => b.releaseYear - a.releaseYear);
    } else if (currentGameFilter === 'oldest') {
        games.sort((a, b) => a.releaseYear - b.releaseYear);
    }

    if (games.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🎮</div>
                <h3>Oyun bulunamadı</h3>
                <p>Farklı bir arama terimi veya filtre deneyin.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = renderGamesBrickLayout(games);

    // Add sentinel element for infinite scroll
    if (gamesNextPageUrl) {
        grid.innerHTML += `
            <div id="gamesScrollSentinel" style="grid-column: 1 / -1; text-align: center; padding: 40px 0;">
                <div class="games-loading-spinner" style="width:28px; height:28px; margin:0 auto; opacity:0.5;"></div>
            </div>
        `;
        // Re-observe the new sentinel
        if (gamesScrollObserver) {
            const sentinel = document.getElementById('gamesScrollSentinel');
            if (sentinel) gamesScrollObserver.observe(sentinel);
        }
    }
}

// ── Infinite Scroll for Games ──
function setupGamesInfiniteScroll() {
    // Disconnect previous observer
    if (gamesScrollObserver) {
        gamesScrollObserver.disconnect();
    }

    gamesScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !gamesIsLoading && gamesNextPageUrl) {
                loadGames(true);
            }
        });
    }, {
        root: null,
        rootMargin: '400px',
        threshold: 0
    });

    const sentinel = document.getElementById('gamesScrollSentinel');
    if (sentinel) gamesScrollObserver.observe(sentinel);
}

// ── Render Game Card ──
function renderGamesBrickLayout(games) {
    let html = '';

    for (let i = 0; i < games.length; i += 7) {
        const chunk = games.slice(i, i + 7);
        const topRow = chunk.slice(0, 4);
        const bottomRow = chunk.slice(4, 7);

        if (topRow.length) {
            html += `<div class="games-brick-row">${topRow.map(game => renderGameCard(game)).join('')}</div>`;
        }

        if (bottomRow.length) {
            html += `<div class="games-brick-row games-brick-row--bottom">${bottomRow.map(game => renderGameCard(game)).join('')}</div>`;
        }
    }

    return html;
}

function renderCreatorGamesBrickLayout(games) {
    return renderGamesBrickLayout(games);
}

function renderCreatorHeader(name, label, gameCount = null) {
    const countText = Number.isFinite(gameCount) && gameCount >= 0
        ? `${gameCount.toLocaleString('tr-TR')} oyun`
        : 'Secilmis katalog';

    return `
        <div class="creator-header-copy">
            <div class="creator-header-label">${label}</div>
            <h2 class="creator-header-title">${escapeHtml(name)}</h2>
        </div>
        <div class="creator-header-meta">
            <span class="creator-header-badge">${countText}</span>
        </div>
    `;
}

function renderGameCard(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

    return `
        <div class="game-card game-card--list" onclick="openGameDetail('${game.id}')">
            <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-card-cover"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 675%22%3E%3Crect fill=%22%23111d17%22 width=%221200%22 height=%22675%22/%3E%3Ctext fill=%22%236baa75%22 font-size=%2260%22 x=%2250%25%22 y=%2254%25%22 text-anchor=%22middle%22%3EGame%3C/text%3E%3C/svg%3E'">
            <div class="game-card-overlay game-card-overlay--hover">
                ${game.rating > 0 ? `
                    <div class="game-card-rating game-card-rating--corner ${ratingClass}">
                        ${starSvg}
                        ${game.rating}
                    </div>
                ` : ''}
                <div class="game-card-overlay-body">
                    <div class="game-card-title">${escapeHtml(game.title)}</div>
                </div>
            </div>
        </div>
    `;
}

// ── Rating Class Helper ──
function getRatingClass(rating) {
    if (rating >= 80) return 'high';
    if (rating >= 60) return 'medium';
    return 'low';
}

// ── Open Game Detail ──
async function openGameDetail(gameId) {
    let game = allGames.find(g => g.id === String(gameId));
    if (!game) return;

    // If creator overlay is open, close it first
    document.getElementById('creatorOverlay').classList.remove('active');

    // Show overlay immediately with basic data
    renderGameDetailContentV2(game);
    document.getElementById('gameDetailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    recordGameVisit(game);
    if (currentPage === 'home' && !currentCategory) {
        renderFeed();
    }

    // If we haven't fetched detailed info yet, fetch it now
    if (!game.description || !game.developer) {
        // Show loading state in the info section
        document.getElementById('gameDetailInfo').innerHTML = `
            <div style="text-align:center; padding:40px 0;">
                <div class="games-loading-spinner" style="margin:0 auto 12px;"></div>
                <p style="color:var(--text-muted);">Detaylar yükleniyor...</p>
            </div>
        `;

        const detailed = await fetchGameDetails(game.rawgId || gameId);
        if (detailed) {
            game = detailed;
            syncGamePopularitySnapshot(game);
            renderGameDetailContentV2(game);
        }
    }

    // Fiyatları paralel olarak çek ve güncelle
    fetchGamePrices(game.title, game.rawgId || game.id).then(result => renderITADPricesSection(result));
}

// ── Render Game Detail Content ──
function renderGameDetailContent(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    // Hero section
    document.getElementById('gameDetailHero').innerHTML = `
        <img src="${escapeHtml(game.backgroundUrl || game.coverUrl)}" alt="" class="game-detail-hero-bg"
             onerror="this.style.background='var(--bg-elevated)'">
        <div class="game-detail-hero-content">
            <div class="game-detail-cover-wrapper" onclick="openScreenshotLightbox('${escapeHtml(game.id)}')">
                <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
                     onerror="this.style.background='var(--bg-elevated)'">
                ${(game.screenshots && game.screenshots.length > 0) ? `<div class="game-detail-cover-badge">📷 ${game.screenshots.length}</div>` : ''}
            </div>
            <div class="game-detail-hero-info">
                <div class="game-detail-genres">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
                <h2 class="game-detail-title">${escapeHtml(game.title)}</h2>
                <div class="game-detail-hero-meta">
                    <span class="game-detail-developer">${escapeHtml(game.developer || 'Yükleniyor...')}</span>
                    <span class="game-detail-year-badge">${game.releaseYear || 'TBA'}</span>
                    ${game.rating > 0 ? `
                        <span class="game-detail-rating-large ${ratingClass}">${starSvg} ${game.rating}/100</span>
                    ` : `
                        <span class="game-detail-rating-large medium">⭐ Henüz Puanlanmadı</span>
                    `}
                    ${game.esrbRating ? `<span class="game-detail-esrb-badge">${escapeHtml(game.esrbRating)}</span>` : ''}
                </div>
            </div>
        </div>
        <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="game-detail-rawg-watermark" title="Veriler RAWG Database'inden alınmıştır">RAWG.io</a>
    `;

    const description = game.description || 'Açıklama yükleniyor...';
    const developer = game.developer || 'Yükleniyor...';
    const publisher = game.publisher || 'Yükleniyor...';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;

    document.getElementById('gameDetailInfo').innerHTML = `

        <div class="gd-desc-box" id="gdDescBox" onclick="toggleGameDesc()">
            <p class="gd-desc-text" id="gdDescText">${escapeHtml(description)}</p>
            <div class="gd-desc-fade"></div>
            <div class="gd-desc-toggle">Devamını Gör <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></div>
        </div>

        <div class="gd-info-row">
            <div class="gd-stats">
                <div class="gd-stat gd-stat--metacritic">
                    <div class="gd-stat-icon">🎯</div>
                    <div class="gd-stat-value">${game.rating > 0 ? game.rating : '—'}</div>
                    <div class="gd-stat-label">Metacritic</div>
                </div>
                <div class="gd-stat gd-stat--user">
                    <div class="gd-stat-icon">⭐</div>
                    <div class="gd-stat-value">${game.rawRating ? game.rawRating.toFixed(1) : '—'}</div>
                    <div class="gd-stat-label">Kullanıcı Puanı</div>
                </div>
                <div class="gd-stat gd-stat--year">
                    <div class="gd-stat-icon">📅</div>
                    <div class="gd-stat-value">${game.releaseYear || 'TBA'}</div>
                    <div class="gd-stat-label">Çıkış Yılı</div>
                </div>
                <div class="gd-stat gd-stat--playtime">
                    <div class="gd-stat-icon">⏱️</div>
                    <div class="gd-stat-value">${game.playtime || '—'}</div>
                    <div class="gd-stat-label">Ort. Oynama</div>
                </div>
            </div>

            <div class="gd-meta-col">
                <div class="gd-meta-block">
                    <div class="gd-meta-label">🎮 Platformlar</div>
                    <div class="gd-platforms">
                        ${displayPlatforms.map(p => `<span class="gd-platform-chip">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </div>
                <div class="gd-meta-block">
                    <div class="gd-meta-label">🎯 Yapımcı & Yayıncı</div>
                    <div class="gd-creators">
                        ${(game.developerData && game.developerData.length > 0
            ? game.developerData.map(d => `<button class="creator-link" onclick="openCreatorGames('${escapeHtml(d.name)}','${escapeHtml(d.slug)}','developer')">${escapeHtml(d.name)}</button>`).join('<span class="gd-dot">·</span>')
            : `<span class="gd-creator-plain">${escapeHtml(developer)}</span>`
        )}
                        ${(game.publisherData && game.publisherData.length > 0 && publisher !== developer
            ? '<span class="gd-dot">·</span>' + game.publisherData.map(p => `<button class="creator-link creator-link--publisher" onclick="openCreatorGames('${escapeHtml(p.name)}','${escapeHtml(p.slug)}','publisher')">${escapeHtml(p.name)}</button>`).join('<span class="gd-dot">·</span>')
            : ''
        )}
                    </div>
                </div>
            </div>
        </div>

        ${game.tags && game.tags.length > 0 ? `
            <div class="gd-tags-row">
                <div class="gd-meta-label">🏷️ Etiketler</div>
                <div class="gd-tags">
                    ${game.tags.map(t => `<span class="game-detail-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
        ` : ''}

        ${game.systemRequirements && game.systemRequirements.length > 0 ? `
        <div class="game-detail-sysreq">
            <div class="gd-meta-label" style="margin-bottom: 12px;">💻 Sistem Gereksinimleri</div>
            ${game.systemRequirements.map(req => `
                <div class="sysreq-platform-block">
                    ${game.systemRequirements.length > 1 ? `<div class="sysreq-platform-name">${escapeHtml(req.platform)}</div>` : ''}
                    <div class="sysreq-columns">
                        ${req.minimum ? `<div class="sysreq-col"><div class="sysreq-col-title sysreq-minimum">Minimum</div><pre class="sysreq-text">${escapeHtml(req.minimum)}</pre></div>` : ''}
                        ${req.recommended ? `<div class="sysreq-col"><div class="sysreq-col-title sysreq-recommended">Önerilen</div><pre class="sysreq-text">${escapeHtml(req.recommended)}</pre></div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="itad-section">
            <div class="gd-itad-header">
                <span class="gd-meta-label">💰 Fırsat &amp; Fiyatlar</span>
                <span class="itad-powered-by">IsThereAnyDeal</span>
            </div>
            <div id="itadPricesSection" class="itad-prices-section">
                <div class="itad-loading">
                    <div class="games-loading-spinner" style="width:18px;height:18px;border-width:2px;margin:0;"></div>
                    <span>Fiyatlar yükleniyor...</span>
                </div>
            </div>
        </div>
    `;
}

function renderGameDetailContentV2(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const description = game.description || 'Aciklama yukleniyor...';
    const developer = game.developer || 'Yukleniyor...';
    const publisher = game.publisher || 'Yukleniyor...';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;
    const heroBlurb = description.length > 220 ? `${description.slice(0, 220).trim()}...` : description;
    const screenshots = (game.screenshots || []).slice(0, 3);

    document.getElementById('gameDetailHero').innerHTML = `
        <img src="${escapeHtml(game.backgroundUrl || game.coverUrl)}" alt="" class="game-detail-hero-bg"
             onerror="this.style.background='var(--bg-elevated)'">
        <div class="game-detail-hero-noise"></div>
        <div class="game-detail-hero-content game-detail-hero-content--chaos">
            <div class="gd-poster-column">
                <div class="game-detail-cover-wrapper gd-cover-chaos" onclick="openScreenshotLightbox('${escapeHtml(game.id)}')">
                    <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
                         onerror="this.style.background='var(--bg-elevated)'">
                    ${(game.screenshots && game.screenshots.length > 0) ? `<div class="game-detail-cover-badge">Shots ${game.screenshots.length}</div>` : ''}
                </div>
                ${screenshots.length > 0 ? `
                    <div class="gd-shot-strip">
                        ${screenshots.map((shot, index) => `
                            <button class="gd-shot-chip" onclick="event.stopPropagation();openScreenshotLightbox('${escapeHtml(game.id)}')" aria-label="Screenshot ${index + 1}">
                                <img src="${escapeHtml(shot)}" alt="${escapeHtml(game.title)} screenshot ${index + 1}">
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="game-detail-hero-info gd-hero-card">
                <div class="gd-hero-topline">
                    <span class="gd-hero-kicker">Spotlight</span>
                    <span class="gd-hero-release">${game.releaseYear || 'TBA'}</span>
                </div>
                <div class="game-detail-genres">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
                <h2 class="game-detail-title">${escapeHtml(game.title)}</h2>
                <p class="gd-hero-blurb">${escapeHtml(heroBlurb)}</p>
                <div class="game-detail-hero-meta">
                    <span class="game-detail-developer">${escapeHtml(developer)}</span>
                    ${game.rating > 0 ? `
                        <span class="game-detail-rating-large ${ratingClass}">${starSvg} ${game.rating}/100</span>
                    ` : `
                        <span class="game-detail-rating-large medium">Skor bekleniyor</span>
                    `}
                    ${game.esrbRating ? `<span class="game-detail-esrb-badge">${escapeHtml(game.esrbRating)}</span>` : ''}
                </div>
                <div class="gd-hero-stat-ribbon">
                    <div class="gd-hero-stat">
                        <strong>${game.rawRating ? game.rawRating.toFixed(1) : '—'}</strong>
                        <span>Kullanici</span>
                    </div>
                    <div class="gd-hero-stat">
                        <strong>${displayPlatforms.length || '—'}</strong>
                        <span>Platform</span>
                    </div>
                    <div class="gd-hero-stat">
                        <strong>${game.playtime || '—'}</strong>
                        <span>Saat</span>
                    </div>
                </div>
                <div class="gd-hero-actions">
                    ${(game.screenshots && game.screenshots.length > 0) ? `<button class="gd-hero-action-btn" onclick="event.stopPropagation();openScreenshotLightbox('${escapeHtml(game.id)}')">Galeriyi Ac</button>` : ''}
                    <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="gd-hero-action-btn gd-hero-action-btn--ghost">RAWG.io</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('gameDetailInfo').innerHTML = `
        <div class="gd-chaos-layout">
            <section class="gd-panel gd-panel--story">
                <div class="gd-panel-head">
                    <span>Hikaye Katmani</span>
                    <strong>Oyunun Evreni</strong>
                </div>
                <div class="gd-desc-box" id="gdDescBox" onclick="toggleGameDesc()">
                    <p class="gd-desc-text" id="gdDescText">${escapeHtml(description)}</p>
                    <div class="gd-desc-fade"></div>
                    <div class="gd-desc-toggle">Devamini Gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></div>
                </div>
            </section>

            <section class="gd-panel gd-panel--stats">
                <div class="gd-panel-head">
                    <span>Hizli Okuma</span>
                    <strong>Temel Istatistikler</strong>
                </div>
                <div class="gd-stats">
                    <div class="gd-stat gd-stat--metacritic">
                        <div class="gd-stat-icon">M</div>
                        <div class="gd-stat-value">${game.rating > 0 ? game.rating : '—'}</div>
                        <div class="gd-stat-label">Metacritic</div>
                    </div>
                    <div class="gd-stat gd-stat--user">
                        <div class="gd-stat-icon">U</div>
                        <div class="gd-stat-value">${game.rawRating ? game.rawRating.toFixed(1) : '—'}</div>
                        <div class="gd-stat-label">Kullanici</div>
                    </div>
                    <div class="gd-stat gd-stat--year">
                        <div class="gd-stat-icon">Y</div>
                        <div class="gd-stat-value">${game.releaseYear || 'TBA'}</div>
                        <div class="gd-stat-label">Cikis</div>
                    </div>
                    <div class="gd-stat gd-stat--playtime">
                        <div class="gd-stat-icon">S</div>
                        <div class="gd-stat-value">${game.playtime || '—'}</div>
                        <div class="gd-stat-label">Saat</div>
                    </div>
                </div>
            </section>

            <section class="gd-panel gd-panel--meta">
                <div class="gd-panel-head">
                    <span>Baglantilar</span>
                    <strong>Platform ve Studyo</strong>
                </div>
                <div class="gd-meta-block">
                    <div class="gd-meta-label">Platformlar</div>
                    <div class="gd-platforms">
                        ${displayPlatforms.map(p => `<span class="gd-platform-chip">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </div>
                <div class="gd-meta-block">
                    <div class="gd-meta-label">Yapimci ve Yayinci</div>
                    <div class="gd-creators">
                        ${(game.developerData && game.developerData.length > 0
            ? game.developerData.map(d => `<button class="creator-link" onclick="openCreatorGames('${escapeHtml(d.name)}','${escapeHtml(d.slug)}','developer')">${escapeHtml(d.name)}</button>`).join('<span class="gd-dot">·</span>')
            : `<span class="gd-creator-plain">${escapeHtml(developer)}</span>`)}
                        ${(game.publisherData && game.publisherData.length > 0 && publisher !== developer
            ? '<span class="gd-dot">·</span>' + game.publisherData.map(p => `<button class="creator-link creator-link--publisher" onclick="openCreatorGames('${escapeHtml(p.name)}','${escapeHtml(p.slug)}','publisher')">${escapeHtml(p.name)}</button>`).join('<span class="gd-dot">·</span>')
            : '')}
                    </div>
                </div>
            </section>

            ${game.tags && game.tags.length > 0 ? `
                <section class="gd-panel gd-panel--tags">
                    <div class="gd-panel-head">
                        <span>Kesif Katmani</span>
                        <strong>Etiket Bulutu</strong>
                    </div>
                    <div class="gd-tags">
                        ${game.tags.map(t => `<span class="game-detail-tag">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                </section>
            ` : ''}

            ${game.systemRequirements && game.systemRequirements.length > 0 ? `
                <section class="gd-panel gd-panel--sysreq-wrap">
                    <div class="gd-panel-head">
                        <span>Donanim</span>
                        <strong>Sistem Gereksinimleri</strong>
                    </div>
                    <div class="game-detail-sysreq">
                        ${game.systemRequirements.map(req => `
                            <div class="sysreq-platform-block">
                                ${game.systemRequirements.length > 1 ? `<div class="sysreq-platform-name">${escapeHtml(req.platform)}</div>` : ''}
                                <div class="sysreq-columns">
                                    ${req.minimum ? `<div class="sysreq-col"><div class="sysreq-col-title sysreq-minimum">Minimum</div><pre class="sysreq-text">${escapeHtml(req.minimum)}</pre></div>` : ''}
                                    ${req.recommended ? `<div class="sysreq-col"><div class="sysreq-col-title sysreq-recommended">Onerilen</div><pre class="sysreq-text">${escapeHtml(req.recommended)}</pre></div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            ` : ''}

            <section class="gd-panel gd-panel--market">
                <div class="gd-panel-head">
                    <span>Pazar Taramasi</span>
                    <strong>Firsat ve Fiyatlar</strong>
                </div>
                <div class="itad-section">
                    <div class="gd-itad-header">
                        <span class="gd-meta-label">Canli fiyat akisi</span>
                        <span class="itad-powered-by">IsThereAnyDeal</span>
                    </div>
                    <div id="itadPricesSection" class="itad-prices-section">
                        <div class="itad-loading">
                            <div class="games-loading-spinner" style="width:18px;height:18px;border-width:2px;margin:0;"></div>
                            <span>Fiyatlar yukleniyor...</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function toggleGameDesc() {
    const box = document.getElementById('gdDescBox');
    if (!box) return;
    const isExpanded = box.classList.toggle('expanded');
    const btn = box.querySelector('.gd-desc-toggle');
    if (btn) btn.innerHTML = isExpanded
        ? 'Küçült <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Devamını Gör <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
}

// ── Creator Games Overlay ──
async function openCreatorGames(name, slug, type) {
    const overlay = document.getElementById('creatorOverlay');
    const header = document.getElementById('creatorHeader');
    const grid = document.getElementById('creatorGrid');

    const label = type === 'developer' ? 'Yapımcı' : 'Yayıncı';
    header.innerHTML = renderCreatorHeader(name, label);
    grid.innerHTML = `
        <div class="creator-loading">
            <div class="games-loading-spinner"></div>
            <span>Oyunlar yükleniyor...</span>
        </div>
    `;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        const param = type === 'developer' ? 'developers' : 'publishers';
        const today = getTodayDate();
        const baseUrl = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&${param}=${encodeURIComponent(slug)}&page_size=40&ordering=-metacritic&metacritic=1,100&dates=1970-01-01,${today}`;

        let allResults = [];
        let nextUrl = baseUrl;
        while (nextUrl) {
            const res = await fetch(nextUrl);
            if (!res.ok) throw new Error(`API Hatası: ${res.status}`);
            const data = await res.json();
            allResults = allResults.concat(data.results || []);
            nextUrl = data.next || null;
        }
        const games = allResults.map(mapRawgGame).filter(g => g.rating > 0 && g.releaseYear > 0);

        if (games.length === 0) {
            grid.innerHTML = `<div class="creator-empty">Bu ${label.toLowerCase()} için oyun bulunamadı.</div>`;
            return;
        }

        // Merge into allGames so openGameDetail works
        games.forEach(g => {
            if (!allGames.find(ag => ag.id === g.id)) allGames.push(g);
        });

        header.innerHTML = renderCreatorHeader(name, label, games.length);
        grid.innerHTML = renderCreatorGamesBrickLayout(games);
    } catch (err) {
        console.error('Creator oyunları alınırken hata:', err);
        grid.innerHTML = `<div class="creator-empty">Oyunlar yüklenirken hata oluştu.</div>`;
    }
}

function closeCreatorOverlay(e) {
    if (e && e.target !== document.getElementById('creatorOverlay')) return;
    document.getElementById('creatorOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function renderNpeGameOverlayHeader(query = '', gameCount = null, isLoading = false) {
    const cleanQuery = (query || '').trim();
    let badgeText = 'Tum sonuclar listelenir';

    if (Number.isFinite(gameCount)) {
        badgeText = isLoading
            ? `${gameCount.toLocaleString('tr-TR')}+ oyun yukleniyor`
            : `${gameCount.toLocaleString('tr-TR')} oyun`;
    } else if (cleanQuery.length >= 2) {
        badgeText = 'Araniyor...';
    }

    return `
        <div class="creator-header-copy">
            <div class="creator-header-label">Gonderi Oyunu</div>
            <h2 class="creator-header-title">${escapeHtml(cleanQuery.length >= 2 ? `"${cleanQuery}"` : 'Oyuna atif ekle')}</h2>
        </div>
        <div class="creator-header-meta">
            <span class="creator-header-badge">${escapeHtml(badgeText)}</span>
        </div>
    `;
}

function renderNpeGameSearchCard(game) {
    const ratingClass = getRatingClass(game.rating || 0);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    const coverUrl = game.coverUrl || game.backgroundUrl || game.imageUrl || '';
    const escapedId = escapeHtml(String(game.id || ''));

    return `
        <div class="game-card game-card--list npe-game-card" onclick="npeSelectSearchResult('${escapedId}')">
            <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(game.title)}" class="game-card-cover"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 675%22%3E%3Crect fill=%22%23111d17%22 width=%221200%22 height=%22675%22/%3E%3Ctext fill=%22%236baa75%22 font-size=%2260%22 x=%2250%25%22 y=%2254%25%22 text-anchor=%22middle%22%3EGame%3C/text%3E%3C/svg%3E'">
            <div class="game-card-overlay game-card-overlay--hover">
                ${game.rating > 0 ? `
                    <div class="game-card-rating game-card-rating--corner ${ratingClass}">
                        ${starSvg}
                        ${game.rating}
                    </div>
                ` : ''}
                <div class="game-card-overlay-body">
                    <div class="game-card-title">${escapeHtml(game.title)}</div>
                    <span class="npe-game-card-badge">Sec</span>
                </div>
            </div>
        </div>
    `;
}

function renderNpeGameSearchLayout(games) {
    let html = '';

    for (let i = 0; i < games.length; i += 7) {
        const chunk = games.slice(i, i + 7);
        const topRow = chunk.slice(0, 4);
        const bottomRow = chunk.slice(4, 7);

        if (topRow.length) {
            html += `<div class="games-brick-row">${topRow.map(game => renderNpeGameSearchCard(game)).join('')}</div>`;
        }

        if (bottomRow.length) {
            html += `<div class="games-brick-row games-brick-row--bottom">${bottomRow.map(game => renderNpeGameSearchCard(game)).join('')}</div>`;
        }
    }

    return html;
}

function openNpeGameOverlay() {
    const overlay = document.getElementById('npeGameOverlay');
    const header = document.getElementById('npeGameOverlayHeader');
    const results = document.getElementById('npeGameResults');
    const input = document.getElementById('npeGameInput');
    const npeModal = document.getElementById('npeModal');
    if (!overlay || !header || !results || !input) return;

    overlay.classList.add('active');
    if (npeModal) npeModal.style.overflow = 'hidden';
    overlay.scrollTop = 0;
    results.scrollTop = 0;
    input.value = '';
    npeGameSearchResults = [];
    header.innerHTML = renderNpeGameOverlayHeader();
    results.innerHTML = `<div class="creator-empty">Aramak icin en az 2 karakter yaz.</div>`;

    requestAnimationFrame(() => input.focus());
}

function closeNpeGameOverlay(e) {
    if (e && e.target !== document.getElementById('npeGameOverlay')) return;
    clearTimeout(npeGameSearchTimeout);
    if (npeGameAbortController) npeGameAbortController.abort();
    npeGameRequestId++;
    const overlay = document.getElementById('npeGameOverlay');
    const npeModal = document.getElementById('npeModal');
    if (overlay) overlay.classList.remove('active');
    if (npeModal) npeModal.style.overflow = '';
}

function npeSelectSearchResult(gameId) {
    const game = npeGameSearchResults.find(item => String(item.id) === String(gameId));
    if (!game) return;
    npeSelectGame(game.title, game.imageUrl || game.coverUrl || game.backgroundUrl || '');
}

function npeRenderGameOverlayResults(games, query, isLoading = false) {
    const header = document.getElementById('npeGameOverlayHeader');
    const results = document.getElementById('npeGameResults');
    if (!header || !results) return;

    npeGameSearchResults = games;
    header.innerHTML = renderNpeGameOverlayHeader(query, games.length, isLoading);

    if (games.length === 0) {
        results.innerHTML = isLoading
            ? `
                <div class="creator-loading">
                    <div class="games-loading-spinner"></div>
                    <span>Oyunlar araniyor...</span>
                </div>
            `
            : `<div class="creator-empty">"${escapeHtml(query)}" icin sonuc bulunamadi.</div>`;
        return;
    }

    results.innerHTML = renderNpeGameSearchLayout(games) + (isLoading
        ? `
            <div class="creator-loading npe-game-loading-more">
                <div class="games-loading-spinner"></div>
                <span>Daha fazla sonuc yukleniyor...</span>
            </div>
        `
        : '');
}

npeSearchGame = function (q) {
    clearTimeout(npeGameSearchTimeout);

    const header = document.getElementById('npeGameOverlayHeader');
    const results = document.getElementById('npeGameResults');
    if (!header || !results) return;

    const query = (q || '').trim();
    if (query.length < 2) {
        if (npeGameAbortController) npeGameAbortController.abort();
        npeGameRequestId++;
        npeGameSearchResults = [];
        results.scrollTop = 0;
        header.innerHTML = renderNpeGameOverlayHeader();
        results.innerHTML = `<div class="creator-empty">Aramak icin en az 2 karakter yaz.</div>`;
        return;
    }

    results.scrollTop = 0;
    header.innerHTML = renderNpeGameOverlayHeader(query);
    results.innerHTML = `
        <div class="creator-loading">
            <div class="games-loading-spinner"></div>
            <span>Oyunlar araniyor...</span>
        </div>
    `;

    npeGameSearchTimeout = setTimeout(async () => {
        if (!RAWG_API_KEY) {
            const localMatches = sortGamesBySearchQuery(
                allGames.filter(g => g.title && g.title.toLowerCase().includes(query.toLowerCase())),
                query
            ).map(g => ({
                ...g,
                imageUrl: g.backgroundUrl || g.coverUrl || ''
            }));

            npeRenderGameOverlayResults(localMatches, query);
            return;
        }

        try {
            if (npeGameAbortController) npeGameAbortController.abort();
            npeGameAbortController = new AbortController();
            const myRequestId = ++npeGameRequestId;

            await searchRawgGamesProgressive(query, {
                signal: npeGameAbortController.signal,
                onChunk: ({ games, isComplete }) => {
                    if (myRequestId !== npeGameRequestId) return;

                    games.forEach(game => {
                        if (!allGames.find(existing => existing.id === game.id)) {
                            allGames.push(game);
                        }
                    });

                    npeRenderGameOverlayResults(games.map(g => ({
                        ...g,
                        imageUrl: g.backgroundUrl || g.coverUrl || ''
                    })), query, !isComplete);
                }
            });
            if (myRequestId !== npeGameRequestId) return;
        } catch (error) {
            if (error.name === 'AbortError') return;
            header.innerHTML = renderNpeGameOverlayHeader(query, 0);
            results.innerHTML = `<div class="creator-empty">Oyunlar yuklenirken hata olustu.</div>`;
        }
    }, 350);
};

// ── Close Game Detail ──
function closeGameDetail(e) {
    if (e && e.target !== document.getElementById('gameDetailOverlay')) return;
    document.getElementById('gameDetailOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ── Screenshot Lightbox ──
let screenshotList = [];
let screenshotIndex = 0;

function openScreenshotLightbox(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    screenshotList = [];
    if (game.coverUrl) screenshotList.push(game.coverUrl);
    if (game.screenshots && game.screenshots.length > 0) {
        game.screenshots.forEach(s => {
            if (s !== game.coverUrl) screenshotList.push(s);
        });
    }

    if (screenshotList.length === 0) return;

    screenshotIndex = 0;
    updateLightboxImage();
    document.getElementById('screenshotLightbox').classList.add('active');
}

function closeScreenshotLightbox(e) {
    if (e && e.target !== document.getElementById('screenshotLightbox')) return;
    document.getElementById('screenshotLightbox').classList.remove('active');
}

function navigateScreenshot(dir) {
    event.stopPropagation();
    screenshotIndex += dir;
    if (screenshotIndex < 0) screenshotIndex = screenshotList.length - 1;
    if (screenshotIndex >= screenshotList.length) screenshotIndex = 0;
    updateLightboxImage();
}

function updateLightboxImage() {
    document.getElementById('screenshotLightboxImg').src = screenshotList[screenshotIndex];
    document.getElementById('screenshotLightboxCounter').textContent = `${screenshotIndex + 1} / ${screenshotList.length}`;
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('screenshotLightbox');
    if (!lb || !lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeScreenshotLightbox();
    if (e.key === 'ArrowLeft') navigateScreenshot(-1);
    if (e.key === 'ArrowRight') navigateScreenshot(1);
});

// ── Get Related Posts (Relevance Scoring) ──
function getRelatedPosts(game) {
    // Stop words to ignore (common words that cause false matches)
    const stopWords = new Set([
        'the', 'of', 'and', 'in', 'to', 'a', 'an', 'is', 'it', 'for', 'on', 'at',
        'by', 'with', 'from', 'as', 'or', 'but', 'not', 'be', 'are', 'was', 'were',
        'has', 'had', 'have', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
        'may', 'might', 'shall', 'should', 'ii', 'iii', 'iv', 'vs', 'new', 'all'
    ]);

    const gameTitle = game.title.toLowerCase().trim();
    const gameSlug = (game.slug || '').toLowerCase().replace(/-/g, ' ');

    // Extract significant words from game title (length > 2, not stop words)
    const titleWords = gameTitle
        .split(/[\s:;,\-–—.'"!?()]+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    // Also match against full game name as a phrase
    const fullTitleClean = gameTitle.replace(/[^a-z0-9\sğüşıöç]/gi, '').trim();

    // Build scored results
    const scored = allPosts.map(post => {
        const postTitle = post.title.toLowerCase();
        const postContent = post.content.toLowerCase();
        const postTags = post.tags.map(t => t.toLowerCase().replace('#', ''));
        const allPostText = postTitle + ' ' + postContent + ' ' + postTags.join(' ');

        let score = 0;

        // 1. Exact full game title found in post (highest relevance)
        if (allPostText.includes(fullTitleClean)) {
            score += 10;
        }

        // 2. Game slug match (e.g., "grand-theft-auto-v" words)
        if (gameSlug) {
            const slugWords = gameSlug.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
            slugWords.forEach(sw => {
                if (allPostText.includes(sw)) score += 2;
            });
        }

        // 3. Individual significant title words (only count words >= 4 chars for safety)
        titleWords.forEach(word => {
            if (word.length >= 4 && allPostText.includes(word)) {
                score += 3;
            }
        });

        // 4. Tag match with game title (e.g., tag "#GTA6" matching game "Grand Theft Auto VI")
        postTags.forEach(tag => {
            const cleanTag = tag.replace(/[^a-z0-9ğüşıöç]/gi, '');
            // Check if tag contains game name abbreviation or slug parts
            if (cleanTag.length >= 3 && fullTitleClean.includes(cleanTag)) {
                score += 4;
            }
            // Check if game title words appear in tags
            titleWords.forEach(word => {
                if (word.length >= 3 && cleanTag.includes(word)) {
                    score += 2;
                }
            });
        });

        return { post, score };
    });

    // Only return posts with a meaningful score (>= 3 avoids weak/false matches)
    return scored
        .filter(s => s.score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => s.post);
}

// ── Filter Games (Search with API) ──
function filterGames() {
    const query = document.getElementById('gamesSearchInput').value.trim();

    // Clear previous timeout
    if (gamesSearchTimeout) clearTimeout(gamesSearchTimeout);

    if (query.length === 0) {
        // Reset to default listing
        currentGameSearch = '';
        allGames = [];
        gamesIsLoading = false;
        loadGames();
        return;
    }

    if (query.length < 2) return; // Min 2 chars

    currentGameSearch = query;

    // Debounce API search
    gamesSearchTimeout = setTimeout(() => {
        searchGamesFromAPI(query);
    }, 400);
}

function setGameFilter(filter) {
    currentGameFilter = filter;
    document.querySelectorAll('.games-filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === filter);
    });

    // If search is active, just re-render with local filter
    if (currentGameSearch) {
        renderGamesGrid();
    } else {
        // Reload from API with appropriate ordering
        allGames = [];
        gamesNextPageUrl = null;

        const grid = document.getElementById('gamesGrid');
        grid.innerHTML = Array.from({ length: 12 }, () =>
            '<div class="game-card-skeleton"></div>'
        ).join('');

        let ordering = '-metacritic';
        if (filter === 'newest') ordering = '-released';
        else if (filter === 'oldest') ordering = 'released';
        else if (filter === 'high-rated') ordering = '-metacritic';

        loadGamesWithOrdering(ordering);
    }
}

// ── Load games with specific ordering ──
async function loadGamesWithOrdering(ordering) {
    // Abort any previous request
    if (gamesAbortController) gamesAbortController.abort();
    gamesAbortController = new AbortController();
    const myRequestId = ++gamesRequestId;

    gamesIsLoading = true;

    const loading = document.getElementById('gamesLoading');
    loading.style.display = 'block';

    try {
        const url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=20&ordering=${ordering}&dates=1970-01-01,${getTodayDate()}`;
        const response = await fetch(url, { signal: gamesAbortController.signal });
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        if (myRequestId !== gamesRequestId) return;

        const data = await response.json();
        gamesNextPageUrl = data.next;

        allGames = (data.results || [])
            .filter(g => g.background_image && (g.metacritic || Math.round((g.rating || 0) * 20)) > 0)
            .map(mapRawgGame);
        renderGamesGrid();
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('RAWG API Hatası:', error);
        showToast('Oyunlar yüklenirken bir hata oluştu!', 'error');
    } finally {
        if (myRequestId === gamesRequestId) {
            loading.style.display = 'none';
            gamesIsLoading = false;
        }
    }
}

const splitGameTitleForHeroLatest = (title) => {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [title || '', ''];
    const splitIndex = Math.ceil(words.length / 2);
    return [
        words.slice(0, splitIndex).join(' '),
        words.slice(splitIndex).join(' ')
    ];
};

const formatCompactNumberLatest = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
};

const parseRequirementTextLatest = (text) => {
    if (!text) return [];
    return String(text)
        .replace(/\r/g, '\n')
        .split(/\n+/)
        .map(line => line.replace(/\t/g, ' ').trim())
        .filter(Boolean)
        .map(line => line.replace(/^[-*]\s*/, ''))
        .map(line => {
            const match = line.match(/^([^:]{2,40}):\s*(.+)$/);
            if (!match) return null;
            return { label: match[1].trim(), value: match[2].trim() };
        })
        .filter(Boolean);
};

const renderRequirementCardLatest = (title, variant, text, fallbackText) => {
    const items = parseRequirementTextLatest(text);
    if (!text && !fallbackText) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <div class="gd-spec-empty">RAWG tarafinda bu katman icin veri bulunamadi.</div>
            </div>
        `;
    }

    if (!items.length) {
        return `
            <div class="gd-spec-card gd-spec-card--${variant}">
                <div class="gd-spec-card-title">${title}</div>
                <pre class="sysreq-text">${escapeHtml(text || fallbackText)}</pre>
            </div>
        `;
    }

    return `
        <div class="gd-spec-card gd-spec-card--${variant}">
            <div class="gd-spec-card-title">${title}</div>
            <div class="gd-spec-list">
                ${items.map(item => `
                    <div class="gd-spec-row">
                        <span>${escapeHtml(item.label)}</span>
                        <strong>${escapeHtml(item.value)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

const renderSystemRequirementCardsLatest = (requirements) => {
    if (!requirements || requirements.length === 0) {
        return `
            <div class="gd-spec-duo">
                <div class="gd-spec-card gd-spec-card--minimum">
                    <div class="gd-spec-card-title">Minimum</div>
                    <div class="gd-spec-empty">Oyunun sistem gereksinimleri RAWG.io uzerinde olmadigindan dolayi sistem gereksinimi bulunamamistir.</div>
                </div>
                <div class="gd-spec-card gd-spec-card--recommended">
                    <div class="gd-spec-card-title">Onerilen</div>
                    <div class="gd-spec-empty">Oyunun sistem gereksinimleri RAWG.io uzerinde olmadigindan dolayi sistem gereksinimi bulunamamistir.</div>
                </div>
            </div>
        `;
    }

    const primary = requirements.find(req => /pc|windows/i.test(req.platform)) || requirements[0];
    const platformLabel = primary.platform ? `<div class="gd-spec-platform">${escapeHtml(primary.platform)}</div>` : '';

    return `
        <div class="gd-spec-stack">
            ${platformLabel}
            <div class="gd-spec-duo">
                ${renderRequirementCardLatest('Minimum', 'minimum', primary.minimum, primary.minimum || primary.recommended)}
                ${renderRequirementCardLatest('Onerilen', 'recommended', primary.recommended, primary.recommended || primary.minimum)}
            </div>
        </div>
    `;
};

let gameDetailMasonryFrame = null;

function syncGameDetailMasonry() {
    const layout = document.querySelector('#gameDetailInfo .gd-detail-layout--masonry');
    if (!layout) return;

    const cards = layout.querySelectorAll('.gd-masonry-card');
    if (window.innerWidth <= 980) {
        cards.forEach(card => {
            card.style.gridRowEnd = '';
        });
        return;
    }

    const styles = window.getComputedStyle(layout);
    const rowUnit = parseFloat(styles.getPropertyValue('--gd-masonry-row')) || parseFloat(styles.gridAutoRows) || 8;
    const rowGap = parseFloat(styles.rowGap || styles.gap) || 22;

    cards.forEach(card => {
        card.style.gridRowEnd = '';
        const span = Math.ceil((card.getBoundingClientRect().height + rowGap) / (rowUnit + rowGap));
        card.style.gridRowEnd = `span ${Math.max(span, 1)}`;
    });
}

function queueGameDetailMasonrySync() {
    if (gameDetailMasonryFrame) {
        cancelAnimationFrame(gameDetailMasonryFrame);
    }

    gameDetailMasonryFrame = requestAnimationFrame(() => {
        gameDetailMasonryFrame = null;
        syncGameDetailMasonry();
    });
}

window.addEventListener('resize', queueGameDetailMasonrySync);

renderITADPricesSection = function (result) {
    const container = document.getElementById('itadPricesSection');
    if (!container) return;

    const searchUrl = result?.slug
        ? `https://isthereanydeal.com/game/${result.slug}/info/`
        : `https://isthereanydeal.com/search/?q=${encodeURIComponent(result?.title || '')}`;

    const formatCurrency = (amount, currency) => {
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
        } catch {
            return `${currency || '$'} ${amount.toFixed(2)}`;
        }
    };

    if (!result?.deals?.length) {
        container.innerHTML = `
            <div class="itad-offer-card itad-offer-card--empty">
                <div class="itad-offer-label">ITAD live price</div>
                <div class="itad-offer-empty">Bu oyun icin su an aktif teklif bulunamadi.</div>
                <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                    ITAD'da kontrol et
                </a>
            </div>
        `;
        queueGameDetailMasonrySync();
        return;
    }

    const sortedDeals = [...result.deals]
        .filter(deal => TR_POPULAR_SHOPS.has(deal.shop?.name))
        .sort((a, b) => (b.cut || 0) - (a.cut || 0))
        .slice(0, 8);
    const dealsToShow = sortedDeals.length > 0 ? sortedDeals : [...result.deals].slice(0, 8);
    const featuredDeal = [...dealsToShow].sort((a, b) => {
        const aAmount = a.price?.amount ?? Number.MAX_SAFE_INTEGER;
        const bAmount = b.price?.amount ?? Number.MAX_SAFE_INTEGER;
        return aAmount - bAmount;
    })[0];

    const dealsHtml = dealsToShow.map(deal => {
        const shopNameRaw = deal.shop?.name || 'Magaza';
        const shopName = ITAD_SHOP_NAME_MAP[shopNameRaw] || shopNameRaw;
        const shopIcon = ITAD_SHOP_ICONS[shopNameRaw] || 'Store';
        const cut = deal.cut || 0;
        const isDiscounted = cut > 0;
        const priceCur = deal.price?.currency || 'USD';
        const currentPrice = deal.price?.amount != null ? formatCurrency(deal.price.amount, priceCur) : '?';
        const regularPrice = deal.regular?.amount != null ? formatCurrency(deal.regular.amount, priceCur) : null;
        const buyUrl = deal.url || searchUrl;

        return `
            <a href="${escapeHtml(buyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-deal-card${isDiscounted ? ' is-sale' : ''}">
                <span class="itad-shop-name">${escapeHtml(shopIcon)} ${escapeHtml(shopName)}</span>
                <span class="itad-price-row">
                    ${isDiscounted && regularPrice ? `<span class="itad-regular-price">${regularPrice}</span>` : ''}
                    <span class="itad-current-price">${currentPrice}</span>
                    ${isDiscounted ? `<span class="itad-deal-badge">-%${cut}</span>` : ''}
                </span>
            </a>
        `;
    }).join('');

    const featuredCurrent = featuredDeal?.price?.amount != null
        ? formatCurrency(featuredDeal.price.amount, featuredDeal.price.currency)
        : '?';
    const featuredRegular = featuredDeal?.regular?.amount != null
        ? formatCurrency(featuredDeal.regular.amount, featuredDeal.regular.currency)
        : null;
    const featuredCut = featuredDeal?.cut || 0;
    const featuredBuyUrl = featuredDeal?.url || searchUrl;
    const historyLowHtml = result.historyLow?.amount != null
        ? `<div class="itad-history-low">Tum zamanlarin en dusugu: <strong>${formatCurrency(result.historyLow.amount, result.historyLow.currency)}</strong></div>`
        : '';

    container.innerHTML = `
        <div class="itad-offer-card">
            <div class="itad-offer-label">En iyi teklif</div>
            <div class="itad-offer-price-wrap">
                <div class="itad-offer-price">${featuredCurrent}</div>
                ${featuredRegular ? `<div class="itad-offer-regular">${featuredRegular}</div>` : ''}
                ${featuredCut > 0 ? `<div class="itad-offer-discount">-%${featuredCut}</div>` : ''}
            </div>
            ${historyLowHtml}
            <a href="${escapeHtml(featuredBuyUrl)}" target="_blank" rel="noopener noreferrer" class="itad-buy-btn">
                Satin al
            </a>
            <a href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" class="itad-wishlist-btn">
                Tum fiyatlari gor
            </a>
        </div>
        <div class="itad-deals-grid">${dealsHtml}</div>
    `;
    queueGameDetailMasonrySync();
};

renderGameDetailContentV2 = function (game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const description = game.description || 'Aciklama yukleniyor...';
    const developer = game.developer || 'Bilinmiyor';
    const publisher = game.publisher || 'Bilinmiyor';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;
    const splitTitle = splitGameTitleForHeroLatest(game.title);
    const formattedReleaseDate = game.released
        ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(game.released))
        : (game.releaseYear || 'Yakinda');
    const statsRibbon = [
        { label: 'Oynama suresi', value: game.playtime || '-' }
    ];

    document.getElementById('gameDetailHero').innerHTML = `
        <img src="${escapeHtml(game.backgroundUrl || game.coverUrl)}" alt="" class="game-detail-hero-bg"
             onerror="this.style.background='var(--bg-elevated)'">
        <div class="gd-hero-backdrop"></div>
        <div class="gd-hero-orb gd-hero-orb--one"></div>
        <div class="gd-hero-orb gd-hero-orb--two"></div>
        <div class="game-detail-hero-content gd-cinematic-hero">
            <div class="gd-hero-copy">
                <div class="gd-hero-meta-strip">
                    ${game.rating > 0 ? `<span class="gd-score-pill ${ratingClass}">${starSvg} ${game.rating}</span>` : ''}
                    <span class="gd-meta-inline">Cikis yili: ${game.releaseYear || 'Yakinda'}</span>
                    ${game.esrbRating ? `<span class="gd-meta-inline">${escapeHtml(game.esrbRating)}</span>` : ''}
                </div>
                <h2 class="game-detail-title gd-cinematic-title">
                    <span>${escapeHtml(splitTitle[0])}</span>
                    ${splitTitle[1] ? `<span class="accent">${escapeHtml(splitTitle[1])}</span>` : ''}
                </h2>
                <div class="game-detail-genres gd-hero-tag-row">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
            </div>

            <aside class="gd-hero-side">
                <div class="gd-poster-card" ${game.screenshots && game.screenshots.length > 0 ? `onclick="openScreenshotLightbox('${escapeHtml(game.id)}')"` : ''}>
                    <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
                         onerror="this.style.background='var(--bg-elevated)'">
                    ${(game.screenshots && game.screenshots.length > 0) ? `<div class="game-detail-cover-badge">${game.screenshots.length} gorsel</div>` : ''}
                </div>
                <div class="gd-hero-stats-card">
                    ${statsRibbon.map(item => `
                        <div class="gd-hero-stat">
                            <span>${escapeHtml(item.label)}</span>
                            <strong>${escapeHtml(item.value)}</strong>
                        </div>
                    `).join('')}
                </div>
            </aside>
        </div>
        <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="game-detail-rawg-watermark" title="Veriler RAWG Database'inden alinmistir">RAWG.io</a>
    `;

    document.getElementById('gameDetailInfo').innerHTML = `
        <div class="gd-detail-layout gd-detail-layout--masonry">
            <section class="gd-section gd-masonry-card gd-masonry-card--about">
                <div class="gd-section-title">
                    <span></span>
                    <h3>Oyun aciklamasi</h3>
                </div>
                <div class="gd-desc-box" id="gdDescBox" onclick="toggleGameDesc()">
                    <p class="gd-desc-text" id="gdDescText">${escapeHtml(description)}</p>
                    <div class="gd-desc-fade"></div>
                    <div class="gd-desc-toggle">Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></div>
                </div>
            </section>

            <aside class="gd-section gd-masonry-card gd-masonry-card--studios">
                <div class="gd-section-title gd-section-title--compact">
                    <span></span>
                    <h3>Yapim ekibi</h3>
                </div>
                <div class="gd-card-stack">
                    <div class="gd-info-block">
                        <div class="gd-info-label">Gelistirici</div>
                        <div class="gd-info-value gd-info-value--stack">
                            ${(game.developerData && game.developerData.length > 0
            ? game.developerData.map(d => `<button class="creator-link" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(d.name)}','${escapeHtml(d.slug)}','developer')">${escapeHtml(d.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(developer)}</span>`)}
                        </div>
                        </div>
                    <div class="gd-info-block">
                        <div class="gd-info-label">Yayinci</div>
                        <div class="gd-info-value gd-info-value--stack">
                            ${(game.publisherData && game.publisherData.length > 0
            ? game.publisherData.map(p => `<button class="creator-link creator-link--publisher" onclick="event.stopPropagation();openCreatorGames('${escapeHtml(p.name)}','${escapeHtml(p.slug)}','publisher')">${escapeHtml(p.name)}</button>`).join('')
            : `<span class="gd-creator-plain">${escapeHtml(publisher)}</span>`)}
                        </div>
                    </div>
                </div>
            </aside>

            <aside class="gd-section gd-masonry-card gd-masonry-card--platforms">
                <div class="gd-section-title gd-section-title--compact">
                    <span></span>
                    <h3>Platformlar</h3>
                </div>
                <div class="gd-platforms">
                    ${(displayPlatforms && displayPlatforms.length > 0)
            ? displayPlatforms.map(p => `<span class="gd-platform-chip">${escapeHtml(p)}</span>`).join('')
            : '<span class="gd-platform-empty">Platform bilgisi bulunamadi.</span>'}
                </div>
            </aside>

            <aside class="gd-section gd-masonry-card gd-masonry-card--stats">
                <div class="gd-section-title gd-section-title--compact">
                    <span></span>
                    <h3>RAWG verileri</h3>
                </div>
                <div class="gd-rawg-stat-list">
                    <div><span>Metacritic</span><strong>${game.rating > 0 ? game.rating : '-'}</strong></div>
                    <div><span>Kullanici puani</span><strong>${game.rawRating ? game.rawRating.toFixed(1) : '-'}</strong></div>
                    <div><span>Cikis tarihi</span><strong>${formattedReleaseDate}</strong></div>
                </div>
            </aside>

            <section class="gd-section gd-masonry-card gd-masonry-card--specs">
                <div class="gd-section-title">
                    <span></span>
                    <h3>Teknik ozellikler</h3>
                </div>
                <div class="gd-specs-grid">
                    ${renderSystemRequirementCardsLatest(game.systemRequirements)}
                </div>
            </section>

            <aside class="gd-section gd-masonry-card gd-masonry-card--price">
                <div class="gd-price-card gd-price-card--flush">
                    <div class="gd-price-head">
                        <span>Canli fiyat takibi</span>
                        <a href="https://isthereanydeal.com/" target="_blank" rel="noopener noreferrer" class="gd-price-brand">ITAD.com</a>
                    </div>
                    <div id="itadPricesSection" class="itad-prices-section">
                        <div class="itad-loading">
                            <div class="games-loading-spinner" style="width:18px;height:18px;border-width:2px;margin:0;"></div>
                            <span>Fiyatlar yukleniyor...</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    `;

    queueGameDetailMasonrySync();
};

toggleGameDesc = function () {
    const box = document.getElementById('gdDescBox');
    if (!box) return;
    const isExpanded = box.classList.toggle('expanded');
    const btn = box.querySelector('.gd-desc-toggle');
    if (btn) btn.innerHTML = isExpanded
        ? 'Kucult <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Devamini gor <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
    queueGameDetailMasonrySync();
};

