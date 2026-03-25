/* ==========================================================
   LvlUp – Gaming News & Community | Application Logic
   ========================================================== */

// ── Data Store (localStorage-based) ──
const STORAGE_KEYS = {
    users: 'lvlup_users',
    posts: 'lvlup_posts',
    currentUser: 'lvlup_currentUser',
};

function getStore(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
}

function setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ── State ──
let currentUser = getStore(STORAGE_KEYS.currentUser);
let allPosts = getStore(STORAGE_KEYS.posts) || [];
let allUsers = getStore(STORAGE_KEYS.users) || [];
let currentPage = 'home';
let currentSort = 'newest';
let currentCategory = null;
let allGames = [];
let currentGameFilter = 'all';
let currentGameSearch = '';
let currentProfileTab = 'posts';
let selectedAvatarColor = 0;

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

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
    if (allPosts.length === 0) seedData();
    updateAuthUI();

    // Generate Ambient Leaves (Dark Forest)
    const ambientBg = document.getElementById('ambient-background');
    if (ambientBg) {
        const leafIcons = [
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%231B452D' xmlns='http://www.w3.org/2000/svg'><path d='M12 2C12 2 8 5 8 8C8 10 5 10 5 12C5 14 8 14 8 16C8 19 12 22 12 22C12 22 16 19 16 16C16 14 19 14 19 12C19 10 16 10 16 8C16 5 12 2 12 2Z'/></svg>")`,
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%2312301A' xmlns='http://www.w3.org/2000/svg'><path d='M12,1 L17,6 L15,9 L20,11 L16,15 L18,20 L12,18 L6,20 L8,15 L4,11 L9,9 L7,6 L12,1 Z'/></svg>")`,
            `url("data:image/svg+xml;utf8,<svg viewBox='0 0 24 24' fill='%230D2614' xmlns='http://www.w3.org/2000/svg'><path d='M12 22C12 22 20 18 20 10C20 6 16 2 12 2C8 2 4 6 4 10C4 18 12 22 12 22Z'/></svg>")`
        ];

        for (let i = 0; i < 25; i++) {
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

    // Scroll to top button visibility
    const scrollBtn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }, { passive: true });
});

// ── Scroll to Top ──
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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
            imageUrl: '',
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

    // Update navigation active state
    document.querySelectorAll('[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.sidebar-item[data-category]').forEach(el => {
        el.classList.remove('active');
    });

    const titles = {
        home: 'Ana Sayfa',
        popular: 'Popüler',
        games: 'Oyunlar',
        profile: 'Profilim',
        reviews: 'İncelemeler',
        'browser-games': 'Hazır Oyunlar',
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
        if (page === 'games') {
            gamesPage.style.display = 'block';
            if (allGames.length === 0) { loadGames(); } else { renderGamesGrid(); }
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
            document.getElementById('feedTitle').textContent = titles[page] || 'Ana Sayfa';
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
        document.getElementById('feedTitle').textContent = catNames[cat] || cat;
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
        posts.sort((a, b) => b.likes.length - a.likes.length);
    } else if (currentPage === 'reviews') {
        posts = posts.filter(p => p.title.toLowerCase().includes('inceleme') || p.title.toLowerCase().includes('review'));
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
        posts.sort((a, b) => b.likes.length - a.likes.length);
    } else if (currentSort === 'discussed') {
        posts.sort((a, b) => b.comments.length - a.comments.length);
    }

    const container = document.getElementById('postsContainer');

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎮</div>
                <h3>Henüz gönderi yok</h3>
                <p>Bu kategoride henüz bir gönderi bulunmuyor. İlk haberi sen paylaş!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => renderPostCard(post)).join('');
}

function renderPostCard(post) {
    const author = allUsers.find(u => u.id === post.userId) || { username: 'Bilinmeyen', id: '' };
    const initial = author.username.charAt(0).toUpperCase();
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const isBookmarked = currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(post.id);
    const timeAgo = getTimeAgo(post.date);
    const topComments = post.comments.slice(-2);

    // Avatar colors per user
    const avatarGradients = [
        'linear-gradient(135deg, #2D5A43, #8FBC8F)',
        'linear-gradient(135deg, #BC6C25, #DDA15E)',
        'linear-gradient(135deg, #606C38, #283618)',
        'linear-gradient(135deg, #A4C639, #6BAA75)',
    ];
    const gradientIndex = author.avatarGradient !== undefined ? author.avatarGradient : (author.id ? parseInt(author.id.replace('u', '')) % avatarGradients.length : 0);
    const customAvatarStyle = author.avatarImage
        ? `background-image: url('${author.avatarImage}'); background-size: cover; background-position: center;`
        : `background: ${AVATAR_GRADIENTS[gradientIndex] || avatarGradients[gradientIndex]};`;
    const avatarContent = author.avatarImage ? '' : initial;

    let commentsPreview = '';
    if (topComments.length > 0) {
        const commentsHtml = topComments.map(c => {
            const cAuthor = allUsers.find(u => u.id === c.userId) || { username: 'Bilinmeyen' };
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
            <div class="post-header" onclick="expandPost('${post.id}')">
                <div class="post-avatar" style="${customAvatarStyle}">${avatarContent}</div>
                <div class="post-meta">
                    <div class="post-author">${escapeHtml(author.username)}</div>
                    <div class="post-time">${timeAgo}</div>
                </div>
                <span class="post-category-badge badge-${post.category}">${getCategoryName(post.category)}</span>
            </div>
            <div class="post-title" onclick="expandPost('${post.id}')">${escapeHtml(post.title)}</div>
            <div class="post-content" onclick="expandPost('${post.id}')">${escapeHtml(post.content)}</div>
            ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" class="post-image" alt="${escapeHtml(post.title)}" onerror="this.style.display='none'">` : ''}
            ${post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="post-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
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
            ${commentsPreview}
            <div class="post-quick-comment">
                <input type="text" placeholder="Yorum yaz..." id="quick-comment-${post.id}" 
                       onkeydown="handleQuickComment(event, '${post.id}')" onclick="event.stopPropagation()">
                <button class="send-btn" onclick="submitQuickComment('${post.id}'); event.stopPropagation();">Gönder</button>
            </div>
        </article>
    `;
}

// ── Expanded Post ──
function expandPost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const author = allUsers.find(u => u.id === post.userId) || { username: 'Bilinmeyen' };
    const isLiked = currentUser && post.likes.includes(currentUser.id);

    const avatarGradients = [
        'linear-gradient(135deg, #2D5A43, #8FBC8F)',
        'linear-gradient(135deg, #BC6C25, #DDA15E)',
        'linear-gradient(135deg, #606C38, #283618)',
        'linear-gradient(135deg, #A4C639, #6BAA75)',
        'linear-gradient(135deg, #4A3E3F, #7B6B67)',
        'linear-gradient(135deg, #3A5A40, #588157)',
        'linear-gradient(135deg, #344E41, #A3B18A)',
        'linear-gradient(135deg, #354F52, #52796F)',
    ];
    const gradientIndex = author.id ? parseInt(author.id.replace('u', '')) % avatarGradients.length : 0;

    // Render expanded post content
    document.getElementById('expandedPost').innerHTML = `
        <div class="post-header">
            <div class="post-avatar" style="background:${avatarGradients[gradientIndex]}">${author.username.charAt(0).toUpperCase()}</div>
            <div class="post-meta">
                <div class="post-author">${escapeHtml(author.username)}</div>
                <div class="post-time">${getTimeAgo(post.date)} • ${new Date(post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <span class="post-category-badge badge-${post.category}">${getCategoryName(post.category)}</span>
        </div>
        <div class="post-title">${escapeHtml(post.title)}</div>
        ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" class="post-image" alt="${escapeHtml(post.title)}" onerror="this.style.display='none'">` : ''}
        <div class="post-content">${escapeHtml(post.content)}</div>
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
        </div>
    `;

    // Render comments panel
    const commentsHtml = post.comments.map(c => {
        const cAuthor = allUsers.find(u => u.id === c.userId) || { username: 'Bilinmeyen' };
        const cLiked = currentUser && c.likes.includes(currentUser.id);
        const cIdx = cAuthor.id ? parseInt(cAuthor.id.replace('u', '')) % avatarGradients.length : 0;
        return `
            <div class="comment-item">
                <div class="comment-avatar" style="background:${avatarGradients[cIdx]}">${cAuthor.username.charAt(0).toUpperCase()}</div>
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
}

function closeExpandedPost(e) {
    if (e && e.target !== document.getElementById('postOverlay')) return;
    document.getElementById('postOverlay').classList.remove('active');
    document.body.style.overflow = '';
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
    const category = document.getElementById('postCategory').value;
    const imageUrl = document.getElementById('postImageUrl').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const tagsRaw = document.getElementById('postTags').value.trim();

    const tags = tagsRaw
        ? tagsRaw.split(',').map(t => {
            t = t.trim();
            return t.startsWith('#') ? t : '#' + t;
        })
        : [];

    const newPost = {
        id: 'p' + Date.now(),
        userId: currentUser.id,
        title,
        content,
        category,
        tags,
        imageUrl,
        likes: [],
        comments: [],
        date: new Date().toISOString(),
    };

    allPosts.unshift(newPost);
    setStore(STORAGE_KEYS.posts, allPosts);
    closeModal('newPostModal');
    document.getElementById('newPostForm').reset();
    refreshCurrentView();
    showToast('Gönderi yayınlandı! 🎉', 'success');
}

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

    const avatarGradients = [
        'linear-gradient(135deg, #2D5A43, #8FBC8F)',
        'linear-gradient(135deg, #BC6C25, #DDA15E)',
        'linear-gradient(135deg, #606C38, #283618)',
        'linear-gradient(135deg, #A4C639, #6BAA75)',
        'linear-gradient(135deg, #4A3E3F, #7B6B67)',
        'linear-gradient(135deg, #3A5A40, #588157)',
        'linear-gradient(135deg, #344E41, #A3B18A)',
        'linear-gradient(135deg, #354F52, #52796F)',
    ];

    if (filteredPosts.length > 0) {
        filteredPostsEl.innerHTML = `
            <div class="filtered-posts-label">İçerikler (${filteredPosts.length} sonuç)</div>
            ${filteredPosts.map(p => {
            const author = allUsers.find(u => u.id === p.userId) || { username: 'Bilinmeyen', id: 'u0' };
            const initial = author.username.charAt(0).toUpperCase();
            const gIdx = author.id ? parseInt(author.id.replace('u', '')) % avatarGradients.length : 0;
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
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';

    // Stop iframe when closed
    if (id === 'browserGameOverlay') {
        const iframe = document.getElementById('browserGameIframe');
        if (iframe) iframe.src = '';
    }
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
    updateAuthUI();
    refreshCurrentView();
    closeModal('editProfileModal');
    showToast('Profil güncellendi! ✨', 'success');
}

// ================================================================
//   GAMES SYSTEM – RAWG API Integration
// ================================================================

const RAWG_API_KEY = '52931a33c5114be6b7a159707f66a3c2';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// ── IsThereAnyDeal API v2 ──
// API anahtarı almak için: https://isthereanydeal.com/dev/app/
const ITAD_API_KEY = 'e1e3c61f7355f9f2944860d2bbac454b4bd4ca8a';
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
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const ws = norm(searched).split(' ').filter(Boolean);
    const wc = new Set(norm(candidate).split(' ').filter(Boolean));
    if (ws.length === 0 || wc.size === 0) return 0;
    const matched = ws.filter(w => wc.has(w)).length;
    // Dice: 2 × kesişim / (|A| + |B|)
    return (2 * matched) / (ws.length + wc.size);
}

// ── IsThereAnyDeal: oyun başlığına göre fiyat listesi çek ──
async function fetchGamePrices(gameTitle) {
    try {
        // ITAD arama yardımcısı: sadece 'game' tiplerini döndürür
        const itadSearch = async (query) => {
            const res = await fetch(
                `${ITAD_BASE}/games/search/v1?title=${encodeURIComponent(query)}&results=15&key=${ITAD_API_KEY}`
            );
            if (!res.ok) return [];
            const list = await res.json();
            return list.filter(g => g.type === 'game');
        };

        // Aşama 1: Orijinal başlıkla ara
        let candidates = await itadSearch(gameTitle);

        // Aşama 2: En iyi skor 0.6'nın altındaysa rakamları çıkarıp tekrar ara
        // Örnek: "Resident Evil 9: Requiem" → "Resident Evil : Requiem" → "Resident Evil Requiem"
        const bestScore1 = candidates.length
            ? Math.max(...candidates.map(g => itadTitleScore(gameTitle, g.title)))
            : 0;

        if (bestScore1 < 0.6) {
            const simplified = gameTitle
                .replace(/\b\d+\b/g, '')   // Bağımsız rakamları sil: "9" → ""
                .replace(/\s+/g, ' ')
                .trim();

            if (simplified && simplified !== gameTitle) {
                const candidates2 = await itadSearch(simplified);
                // Birleştir ve tekrarları kaldır
                const seen = new Set(candidates.map(g => g.id));
                candidates2.forEach(g => { if (!seen.has(g.id)) { candidates.push(g); seen.add(g.id); } });
                console.log(`ITAD: 2. geçiş → "${simplified}" (${candidates2.length} ek sonuç)`);
            }
        }

        // Her aday için orijinal başlığa göre skor hesapla, en iyiyi seç
        const scored = candidates
            .map(g => ({ game: g, score: itadTitleScore(gameTitle, g.title) }))
            .sort((a, b) => b.score - a.score);

        const MATCH_THRESHOLD = 0.45;
        if (!scored.length || scored[0].score < MATCH_THRESHOLD) {
            console.log(`ITAD: "${gameTitle}" → eşleşme bulunamadı (en iyi: ${scored[0]?.score?.toFixed(2) ?? 'N/A'})`);
            return null;
        }

        const bestMatch = scored[0].game;
        const gameID = bestMatch.id;
        const slug = bestMatch.slug || '';
        console.log(`ITAD: "${gameTitle}" → "${bestMatch.title}" (skor: ${scored[0].score.toFixed(2)})`);

        // Fiyatları çek (POST endpoint) — country=TR ile Türkiye bölgesi fiyatları
        const pricesRes = await fetch(
            `${ITAD_BASE}/games/prices/v3?key=${ITAD_API_KEY}&nondeals=true&vouchers=true&country=TR`,
            {
                method: 'POST',
                body: JSON.stringify([gameID])
                // Content-Type header kaldırıldı → CORS preflight tetiklenmez
            }
        );
        if (!pricesRes.ok) return null;
        const pricesData = await pricesRes.json();
        const gameData = pricesData[0] || null;

        return {
            deals: gameData?.deals || [],
            historyLow: gameData?.historyLow?.all || null,
            gameID,
            slug,
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
        const url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=40&search=${encodeURIComponent(query)}&dates=1970-01-01,${getTodayDate()}`;
        const result = await fetchAndFilterGames(url, myRequestId);
        if (!result) return;

        gamesNextPageUrl = result.nextUrl;
        const queryLower = query.toLowerCase();
        
        // Filter, map, then smart-sort: title matches first, then by rating
        allGames = result.games
            .sort((a, b) => {
                const aMatch = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
                const bMatch = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
                if (bMatch !== aMatch) return bMatch - aMatch; // Title matches first
                return (b.rating || 0) - (a.rating || 0); // Then by rating
            })
            .slice(0, 20);
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
            <div class="bgc-badge">${escapeHtml(game.category)}</div>
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
    const countEl = document.getElementById('bgPageCount');
    if (countEl) countEl.textContent = allBrowserGames.length + ' oyun';
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
    let yearTo   = parseInt(yearToEl?.value   || '0', 10) || 0;

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
    advFilters.yearTo   = yearTo   ? String(yearTo)   : '';

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
    const genreMap = { action:'Aksiyon', adventure:'Macera', 'role-playing-games-rpg':'RPG', shooter:'Nişancı', strategy:'Strateji', simulation:'Simülasyon', puzzle:'Bulmaca', sports:'Spor', racing:'Yarış', fighting:'Dövüş', indie:'Indie', platformer:'Platform' };
    const platMap = { 4:'PC', 187:'PS5', 18:'PS4', 186:'Xbox Series X', 1:'Xbox One', 7:'Nintendo Switch', 3:'iOS', 21:'Android' };
    const orderMap = { '-released':'En Yeni', released:'En Eski', '-rating':'Kullanıcı Puanı' };
    const modeMap = { singleplayer:'Tek Oyunculu', multiplayer:'Çok Oyunculu', 'co-op':'Eşli (Co-op)' };
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
        if (advFilters.genre)    url += `&genres=${advFilters.genre}`;
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

    grid.innerHTML = games.map(game => renderGameCard(game)).join('');

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
function renderGameCard(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

    return `
        <div class="game-card" onclick="openGameDetail('${game.id}')">
            <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="game-card-cover" 
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%231c1c28%22 width=%22300%22 height=%22400%22/%3E%3Ctext fill=%22%23666%22 font-size=%2220%22 x=%22150%22 y=%22200%22 text-anchor=%22middle%22%3E🎮%3C/text%3E%3C/svg%3E'">
            <div class="game-card-overlay">
                ${game.rating > 0 ? `
                    <div class="game-card-rating ${ratingClass}">
                        ${starSvg}
                        ${game.rating}
                    </div>
                ` : `
                    <div class="game-card-rating medium">
                        ⭐ TBA
                    </div>
                `}
                <div class="game-card-info">
                    <div class="game-card-title">${escapeHtml(game.title)}</div>
                    <div class="game-card-meta">
                        <span class="game-card-developer">${escapeHtml(game.developer || game.genres[0] || '')}</span>
                        <span class="game-card-year">${game.releaseYear || 'TBA'}</span>
                    </div>
                    <div class="game-card-extras">
                        ${game.genres.slice(0, 2).map(g => `<span class="game-card-genre">${escapeHtml(g)}</span>`).join('')}
                        ${game.platforms.length > 0 ? `<span class="game-card-platform">${escapeHtml(game.platforms[0])}${game.platforms.length > 1 ? ' +' + (game.platforms.length - 1) : ''}</span>` : ''}
                    </div>
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

    // Show overlay immediately with basic data
    renderGameDetailContent(game);
    document.getElementById('gameDetailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';

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
            renderGameDetailContent(game);
        }
    }

    // Fiyatları paralel olarak çek ve güncelle
    fetchGamePrices(game.title).then(result => renderITADPricesSection(result));
}

// ── Render Game Detail Content ──
function renderGameDetailContent(game) {
    const ratingClass = getRatingClass(game.rating);
    const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

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
                <h2 class="game-detail-title">${escapeHtml(game.title)}</h2>
                <div class="game-detail-hero-meta">
                    <span class="game-detail-developer">${escapeHtml(game.developer || 'Yükleniyor...')}</span>
                    <span class="game-detail-year-badge">${game.releaseYear || 'TBA'}</span>
                    ${game.rating > 0 ? `
                        <span class="game-detail-rating-large ${ratingClass}">
                            ${starSvg}
                            ${game.rating}/100
                        </span>
                    ` : `
                        <span class="game-detail-rating-large medium">
                            ⭐ Henüz Puanlanmadı
                        </span>
                    `}
                </div>
                <div class="game-detail-genres">
                    ${game.genres.map(g => `<span class="game-detail-genre-tag">${escapeHtml(g)}</span>`).join('')}
                </div>
            </div>
            <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" class="game-detail-rawg-watermark" title="Veriler RAWG Database'inden alınmıştır">RAWG.io'dan alınmıştır</a>
        </div>
    `;

    // Info section
    const platformIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';

    const description = game.description || 'Açıklama yükleniyor...';
    const developer = game.developer || 'Yükleniyor...';
    const publisher = game.publisher || 'Yükleniyor...';
    const displayPlatforms = game.allPlatforms && game.allPlatforms.length > 0 ? game.allPlatforms : game.platforms;

    document.getElementById('gameDetailInfo').innerHTML = `
        <p class="game-detail-description">${escapeHtml(description)}</p>
        <div class="game-detail-stats">
            <div class="game-detail-stat">
                <div class="game-detail-stat-value">${game.rating > 0 ? game.rating : '—'}</div>
                <div class="game-detail-stat-label">Metacritic</div>
            </div>
            <div class="game-detail-stat">
                <div class="game-detail-stat-value">${game.rawRating ? game.rawRating.toFixed(1) + '/5' : '—'}</div>
                <div class="game-detail-stat-label">Kullanıcı Puanı</div>
            </div>
            <div class="game-detail-stat">
                <div class="game-detail-stat-value">${game.releaseYear || 'TBA'}</div>
                <div class="game-detail-stat-label">Çıkış Yılı</div>
            </div>
            <div class="game-detail-stat">
                <div class="game-detail-stat-value">${game.playtime || '—'}</div>
                <div class="game-detail-stat-label">Ort. Oynama Süresi</div>
            </div>
        </div>

        <div class="game-detail-info-grid">
            <div class="game-detail-info-section">
                <div class="game-detail-info-label">🎮 Platformlar</div>
                <div class="game-detail-platforms">
                    ${displayPlatforms.map(p => `
                        <div class="game-detail-platform-badge">
                            ${platformIcon}
                            ${escapeHtml(p)}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="game-detail-info-section">
                <div class="game-detail-info-label">🎯 Yapımcı & Yayıncı</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
                    ${publisher !== developer
                        ? `<strong style="color: var(--accent-light);">${escapeHtml(developer)}</strong> <span style="color: var(--text-muted);">•</span> ${escapeHtml(publisher)}`
                        : `<strong style="color: var(--accent-light);">${escapeHtml(developer)}</strong>`
                    }
                </div>
                ${game.esrbRating ? `
                    <div style="margin-top: 8px;">
                        <div class="game-detail-info-label" style="margin-bottom: 4px;">🏷️ ESRB</div>
                        <span style="font-size: 0.88rem; color: var(--text-secondary); font-weight: 600;">${escapeHtml(game.esrbRating)}</span>
                    </div>
                ` : ''}
            </div>
        </div>

        ${game.tags && game.tags.length > 0 ? `
            <div style="margin-top: 24px;">
                <div class="game-detail-info-label" style="margin-bottom: 10px;">🏷️ Etiketler</div>
                <div class="game-detail-tags">
                    ${game.tags.map(t => `<span class="game-detail-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
        ` : ''}

        <div class="itad-section">
            <div class="game-detail-info-label itad-header">
                <span>💰 Fırsat &amp; Fiyatlar</span>
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

