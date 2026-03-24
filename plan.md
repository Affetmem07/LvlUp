# LvlUp — Proje Planı & Dokümantasyon

## Proje Özeti

**LvlUp**, Türkçe dilinde geliştirilmiş bir oyun haberleri ve topluluk platformudur. Vanilla JavaScript ile yazılmış, backend gerektirmeyen, tamamen istemci taraflı (client-side) bir SPA (Single-Page Application)'dır. Tüm veriler tarayıcının `localStorage`'ında saklanır.

---

## Klasör Yapısı

```
d:\LvlUp\
├── index.html              → Ana uygulama (SPA giriş noktası)
├── plan.md                 → Bu dosya
│
├── assets/
│   ├── css/
│   │   └── style.css       → Tüm stiller (3672 satır, glassmorphism + dark tema)
│   ├── js/
│   │   └── app.js          → Tüm uygulama mantığı (2664 satır, vanilla JS)
│   └── images/
│       ├── logo.png        → Site logosu
│       ├── favicon.png     → Tarayıcı favicon
│       └── treeman.png     → Dekoratif görsel
│
└── games/
    └── minesweeper.html    → Tarayıcıda oynanabilir Mayın Tarlası oyunu
```

---

## Teknoloji Stack'i

| Katman      | Teknoloji                        |
|-------------|----------------------------------|
| Markup      | HTML5 (semantic, lang="tr")      |
| Stil        | CSS3 (custom properties, flexbox, grid, backdrop-filter) |
| Mantık      | Vanilla JavaScript (ES6+)        |
| Veri        | localStorage (no backend)        |
| Fontlar     | Inter (300–900), Orbitron (600, 700, 900) – Google Fonts |
| Ses         | Web Audio API (Minesweeper için) |
| Routing     | Hash-based (#home, #games, vs.)  |
| Oyun fiyatları | RAWG API + IsThereAnyDeal API v2 |

---

## Özellikler

### Kimlik Doğrulama
- Kullanıcı kaydı (e-posta benzersizliği kontrolü, şifre doğrulama)
- Giriş / Çıkış (localStorage session)
- 5 demo kullanıcı: `pro@lvlup.com`, `pixel@lvlup.com`, `neo@lvlup.com`, `cyber@lvlup.com`, `star@lvlup.com` — hepsi şifre: `123456`

### Haber & Gönderi Akışı
- Ana sayfa (Yeni / Popüler akışı)
- Kategoriler: FPS, RPG, MOBA, Battle Royale, Indie, Strateji, Genel
- Sıralama: En Yeni, En Beğenilen, En Çok Tartışılan
- Trend etiketler: #GTA6, #EldenRing, #Valorant, #PS6, #NintendoSwitch2
- 8 demo gönderi (başlangıç verisi)

### Oyun Veritabanı
- Oyun listesi (RAWG API — metacritic'e göre sıralı, sayfalama destekli)
- Filtreleme: Yüksek puan, En yeni, En eski
- Oyun detay sayfası (hero bölümü, ekran görüntüleri lightbox)
- **💰 Fiyat karşılaştırma** — IsThereAnyDeal API v2 entegrasyonu
  - Oyun adına göre ITAD'da arama (`/games/lookup/v1`)
  - Türkiye bölgesi fiyatları (`/games/prices/v1?country=TR`)
  - İndirim oranı, normal fiyat, mevcut fiyat gösterimi
  - Mağazaya direkt bağlantı (Steam, GOG, Epic, Humble, vb.)
  - API anahtarı: `app.js` içinde `ITAD_API_KEY` sabiti
- Oyuna ait gönderiler

### Tarayıcı Oyunları
- iframe tabanlı oynatma sistemi
- Kategoriler: Aksiyon, Bulmaca, Arcade
- Mevcut oyun: Mayın Tarlası (games/minesweeper.html)

### Kullanıcı Profili
- Banner ve avatar (8 gradyan renk veya özel görsel yükleme)
- Sekmeler: Gönderiler, Beğeniler, Yorumlar, Kaydedilenler
- Profil düzenleme (biyografi, favori oyun, avatar)
- Kullanıcı istatistikleri

### Arama Sistemi
- Global arama overlay'i (`Ctrl+K` / `Cmd+K`)
- Anlık otomatik tamamlama
- Çoklu kategori sonuçları: kullanıcılar, oyunlar, incelemeler, gönderiler
- Arama terimleri vurgulaması

### Sosyal Özellikler
- Gönderi/yorum beğenme & beğeniyi geri alma
- Yorum sistemi
- Yer imi (bookmark)
- Kullanıcı mention ve etiketleme
- Bildirim zili

### Gönderi Oluşturma
- Başlık, içerik, kategori, hashtag
- Opsiyonel görsel URL desteği
- Form doğrulama

---

## Veri Modelleri

### User (Kullanıcı)
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "password": "string",
  "joinDate": "ISO date",
  "avatarImage": "base64 | URL (opsiyonel)",
  "avatarGradient": "0-7 (opsiyonel)",
  "bio": "string (opsiyonel)",
  "favoriteGame": "string (opsiyonel)"
}
```

### Post (Gönderi)
```json
{
  "id": "string",
  "userId": "string",
  "title": "string",
  "content": "string",
  "category": "string",
  "tags": ["string"],
  "imageUrl": "string",
  "likes": ["userId"],
  "comments": [Comment],
  "date": "ISO date"
}
```

### Comment (Yorum)
```json
{
  "id": "string",
  "userId": "string",
  "text": "string",
  "date": "ISO date",
  "likes": ["userId"]
}
```

---

## Tasarım Sistemi

### Renk Paleti
| Değişken                  | Renk         | Kullanım                   |
|---------------------------|--------------|----------------------------|
| `--color-primary`         | `#2D5A43`    | Ana vurgu (koyu orman yeşili) |
| `--color-primary-light`   | `#6BAA75`    | Açık yeşil, hover/aktif    |
| `--color-accent`          | `#A4C639`    | Neon yeşil, CTA butonlar   |
| `--color-surface`         | `#1A3A2A`    | Kart / panel arkaplanı     |
| `--color-danger`          | `#8B0000`    | Hata, silme                |
| `--color-text`            | `#f1f5f9`    | Ana metin                  |

### Tipografi
- **Comic Sans MS** — ana yazı tipi (casual, oyun dostu)
- **Orbitron** — başlıklar / özel vurgular (Google Fonts)
- **Inter** — yardımcı metin (Google Fonts)

### UI Bileşenleri
- Glassmorphism kartlar (backdrop-filter + yarı saydam arka plan)
- Animasyonlu düşen yapraklar (ambient arka plan)
- Neon glow butonlar
- Toast bildirim sistemi
- Modal overlay sistemi
- Özel scrollbar stilleri

---

## Routing (Navigasyon)

Hash-based routing — `navigate()` fonksiyonu ile sayfa geçişleri:

| Hash              | Sayfa                     |
|-------------------|---------------------------|
| `#home`           | Ana haber akışı           |
| `#popular`        | Popüler gönderiler        |
| `#games`          | Oyun veritabanı           |
| `#browser-games`  | Tarayıcı oyunları         |
| `#search`         | Arama sonuçları           |
| `#profile`        | Kullanıcı profili         |

---

## Mayın Tarlası Oyunu (games/minesweeper.html)

Bağımsız HTML dosyası, iframe üzerinden yüklenir.

| Zorluk   | Izgara    | Mayın |
|----------|-----------|-------|
| Kolay    | 9×9       | 10    |
| Orta     | 16×16     | 40    |
| Zor      | 16×30     | 99    |

**Kontroller:**
- Sol tık → Hücre aç
- Sağ tık → Bayrak koy/kaldır
- Orta tık → Chord (işaretlenmemiş komşuları toplu aç)
- İlk tıklamada güvenli alan garantisi

**Ses:** Web Audio API ile synthesize edilmiş: tık, bayrak, patlama, kazanma/kaybetme sesleri.

---

## Dosya Boyutları

| Dosya                      | Boyut    |
|----------------------------|----------|
| assets/js/app.js           | ~116 KB  |
| assets/css/style.css       | ~78 KB   |
| index.html                 | ~35 KB   |
| games/minesweeper.html     | ~21 KB   |
| assets/images/logo.png     | ~306 KB  |
| assets/images/treeman.png  | ~299 KB  |
| assets/images/favicon.png  | ~109 KB  |
| **Toplam**                 | ~964 KB  |

---

## Gelecek Geliştirme Fikirleri

- [ ] Backend entegrasyonu (Node.js/Supabase) ile kalıcı veri
- [ ] Kullanıcı takip / arkadaş sistemi
- [ ] Doğrudan mesajlaşma (DM)
- [ ] Admin moderasyon paneli
- [ ] Sosyal paylaşım (Twitter, Discord)
- [ ] Karanlık/Aydınlık tema geçişi
- [ ] Daha fazla tarayıcı oyunu
- [ ] Kullanıcı başarımları (achievement badge sistemi)
- [ ] Yorum iç içe zincirleme (nested threads)
- [ ] PWA desteği (offline cache, install prompt)
- [ ] i18n çoklu dil desteği

---

## Notlar

- **Sadece client-side:** Backend yok, tüm veri localStorage'da. Farklı tarayıcı/cihazda veri kaybolur.
- **Dil:** Tamamen Türkçe arayüz.
- **Framework yok:** Saf HTML/CSS/JS — hiçbir kütüphane veya build sistemi kullanılmamıştır.
- **treeman.png** şu an hiçbir yerde referans edilmiyor, ileriye dönük bir arka plan/dekorasyon görseli olabilir.
- **ITAD API anahtarı:** `assets/js/app.js` içinde tanımlı (`ITAD_API_KEY`). Ücretsiz anahtar için: https://isthereanydeal.com/dev/app/
