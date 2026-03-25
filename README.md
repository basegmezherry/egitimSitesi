# 🎓 EduPlay — Türkçe Eğitim Platformu

Oyunlaştırılmış öğrenme deneyimi sunan Türkçe web platformu.

## 🚀 Özellikler
- 📚 Ders modülü (Matematik, Fen, Tarih, Türkçe)
- ✅ Testler ve sınav sistemi
- 🎮 5 mini oyun (Math Rush, Hafıza, Quiz Blitz, Kelime Avı, Kelime Zinciri)
- 🏆 Firebase destekli liderlik tablosu
- 👤 Kullanıcı profili, XP ve rozet sistemi
- ⚙️ Ayarlar sayfası
- 📱 APK indirme sayfası
- 💰 Google AdSense entegrasyonu

---

## ⚙️ Kurulum

### 1. Firebase Yapılandırması

`js/main.js` dosyasını aç ve aşağıdaki bölümü doldur:

```javascript
const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "PROJE_ADI.firebaseapp.com",
  projectId: "BURAYA_PROJE_ID",
  storageBucket: "PROJE_ADI.appspot.com",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId: "BURAYA_APP_ID"
};
```

> **Firebase Console:** https://console.firebase.google.com
> - Yeni proje oluştur
> - Firestore Database → Test mode
> - Authentication → Google Sign-In'i etkinleştir
> - Project Settings → Web uygulaması ekle → Config kopyala

### 2. Google AdSense Yapılandırması

Her HTML sayfasında `<head>` içindeki yorum satırını aç:

```html
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script> -->
```

`ca-pub-XXXXXXXXXX` yerine kendi Publisher ID'ni yaz.

Aynı zamanda `js/main.js` içindeki AdManager'da:
```javascript
const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXX'; // ← buraya yaz
```

### 3. APK URL Yapılandırması

`pages/apk.html` dosyasında:
```javascript
const APK_URL = 'https://yourdomain.com/eduplay.apk'; // ← APK dosya linki
```

---

## 🌐 Netlify'da Yayınlama

### Yöntem 1: Drag & Drop (En Kolay)
1. https://app.netlify.com git
2. "Add new site" → "Deploy manually"
3. Bu klasörü sürükle bırak
4. Hazır! 🎉

### Yöntem 2: GitHub Entegrasyonu
```bash
git init
git add .
git commit -m "EduPlay ilk sürüm"
git remote add origin https://github.com/KULLANICI/eduplay.git
git push -u origin main
```
Sonra Netlify → "Import from Git" → GitHub repo seç → Deploy

### Yöntem 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## 📁 Dosya Yapısı

```
edusite/
├── index.html              ← Ana sayfa
├── netlify.toml            ← Netlify yapılandırması
├── css/
│   └── style.css           ← Ana stil dosyası
├── js/
│   └── main.js             ← Firebase, AdSense, yardımcı fonksiyonlar
├── data/
│   └── tests.json          ← Test soruları veritabanı
└── pages/
    ├── learn.html          ← Dersler
    ├── test.html           ← Testler
    ├── games.html          ← Oyun merkezi
    ├── leaderboard.html    ← Liderlik tablosu
    ├── profile.html        ← Kullanıcı profili
    ├── settings.html       ← Ayarlar
    ├── apk.html            ← APK indirme
    ├── about.html          ← Hakkında
    └── games/
        ├── math-rush.html
        ├── memory-match.html
        ├── quiz-blitz.html
        ├── word-hunt.html
        └── word-chain.html
```

---

## 🛠️ Geliştirme

Yerel geliştirme için basit bir HTTP sunucusu:
```bash
# Python
python3 -m http.server 3000

# Node.js
npx serve .

# VS Code
Live Server eklentisini kullan
```

---

## 📝 Lisans
MIT Lisansı — Özgürce kullanabilirsin.

---

© 2025 EduPlay
