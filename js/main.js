// ============================================
// EduPlay - Ana JavaScript Dosyası
// ============================================

// ── Firebase Konfigürasyonu ──
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Firebase başlatma (firebase SDK yüklüyse)
let firebaseApp = null;
let db = null;
let auth = null;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      console.log('✅ Firebase bağlandı');
    } else {
      console.warn('⚠️ Firebase SDK bulunamadı. Demo modunda çalışılıyor.');
    }
  } catch (e) {
    console.warn('⚠️ Firebase başlatılamadı:', e.message);
  }
}

// ── Local Storage Yöneticisi ──
const Storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(`eduplay_${key}`);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(`eduplay_${key}`, JSON.stringify(value));
    } catch (e) { console.warn('Storage error:', e); }
  },
  remove(key) {
    localStorage.removeItem(`eduplay_${key}`);
  }
};

// ── Kullanıcı Durumu ──
const UserState = {
  current: null,

  init() {
    this.current = Storage.get('user', {
      id: 'demo_user',
      name: 'Kullanıcı',
      email: 'user@eduplay.com',
      avatar: '🎓',
      level: 5,
      xp: 2450,
      xpNext: 3000,
      coins: 840,
      streak: 7,
      joinDate: new Date().toISOString(),
      completedLessons: [],
      gameScores: {},
      achievements: ['first_lesson', 'week_streak'],
      settings: {
        theme: 'dark',
        sound: true,
        notifications: true,
        language: 'tr'
      }
    });
    this.updateUI();
    return this.current;
  },

  save() {
    Storage.set('user', this.current);
  },

  addXP(amount) {
    this.current.xp += amount;
    if (this.current.xp >= this.current.xpNext) {
      this.current.level++;
      this.current.xp -= this.current.xpNext;
      this.current.xpNext = Math.floor(this.current.xpNext * 1.3);
      showToast(`🎉 Seviye atlama! Seviye ${this.current.level}`, 'success');
    }
    this.save();
    this.updateUI();
  },

  addCoins(amount) {
    this.current.coins += amount;
    this.save();
    this.updateUI();
  },

  updateUI() {
    document.querySelectorAll('[data-user-xp]').forEach(el => {
      el.textContent = this.current.xp.toLocaleString();
    });
    document.querySelectorAll('[data-user-level]').forEach(el => {
      el.textContent = this.current.level;
    });
    document.querySelectorAll('[data-user-coins]').forEach(el => {
      el.textContent = this.current.coins.toLocaleString();
    });
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = this.current.name;
    });
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      el.textContent = this.current.avatar;
    });
    document.querySelectorAll('[data-xp-bar]').forEach(bar => {
      const pct = (this.current.xp / this.current.xpNext) * 100;
      bar.style.width = `${pct}%`;
    });
  }
};

// ── Toast Bildirimleri ──
function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal Sistemi ──
function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.add('open');
}

function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.remove('open');
}

// Modal dışına tıkla kapat
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Active Nav Link ──
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-nav a, .mobile-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') && path.includes(a.getAttribute('href').replace('../', '').replace('.html', ''))) {
      if (a.getAttribute('href') !== '../index.html' || path === '/' || path.endsWith('index.html')) {
        a.classList.add('active');
      }
    }
  });
}

// ── Mobile Menu ──
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.mobile-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
      btn.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
  }
}

// ── Animasyonlu Sayaçlar ──
function animateCounter(el, target, duration = 1000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

// ── Reklam Yöneticisi ──
const AdManager = {
  adSlots: [
    { id: 'ad-top', type: 'banner', size: '728x90' },
    { id: 'ad-sidebar', type: 'rectangle', size: '300x250' },
    { id: 'ad-bottom', type: 'banner', size: '728x90' }
  ],

  // Google AdSense entegrasyonu
  init() {
    // AdSense script yüklüyse
    if (typeof adsbygoogle !== 'undefined') {
      this.loadAdsense();
    } else {
      this.loadFallbackAds();
    }
  },

  loadAdsense() {
    document.querySelectorAll('.ad-adsense').forEach(el => {
      (adsbygoogle = window.adsbygoogle || []).push({});
    });
  },

  loadFallbackAds() {
    document.querySelectorAll('.ad-placeholder').forEach(el => {
      const size = el.dataset.adSize || '728x90';
      el.innerHTML = `
        <div style="color:#7b8499;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Reklam</div>
        <div style="font-size:15px;color:#e8eaf0;margin-bottom:4px">📚 EduPlay Premium</div>
        <div style="font-size:13px;color:#7b8499">Reklamlara son ver, hızlandırıcılar kazan!</div>
        <a href="pages/apk.html" style="color:#00f5d4;font-size:13px;font-weight:600;text-decoration:none;margin-top:8px;display:inline-block">Daha fazla →</a>
      `;
    });
  }
};

// ── Leaderboard Yöneticisi ──
const LeaderboardManager = {
  async getLeaderboard(category = 'xp') {
    // Firebase'den çek veya demo veri döndür
    if (db) {
      try {
        const snapshot = await db.collection('leaderboard')
          .orderBy(category, 'desc')
          .limit(20)
          .get();
        return snapshot.docs.map((doc, i) => ({ id: doc.id, rank: i + 1, ...doc.data() }));
      } catch (e) {
        console.warn('Leaderboard fetch error:', e);
      }
    }
    return this.getDemoData();
  },

  getDemoData() {
    const names = ['Ahmet Y.', 'Elif K.', 'Burak T.', 'Selin A.', 'Murat D.', 'Zeynep B.', 'Emre C.', 'Ayşe N.', 'Kerem S.', 'Fatma Ö.'];
    const avatars = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐬', '🦄', '🐉', '🦩'];
    return names.map((name, i) => ({
      rank: i + 1,
      name,
      avatar: avatars[i],
      xp: Math.floor(9500 - i * 800 + Math.random() * 200),
      level: Math.floor(15 - i * 1.2),
      streak: Math.floor(30 - i * 2)
    }));
  },

  async saveScore(userId, category, score) {
    if (db) {
      try {
        await db.collection('leaderboard').doc(userId).set({
          [category]: score,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn('Score save error:', e);
      }
    }
    // Local fallback
    const scores = Storage.get('leaderboard_scores', {});
    if (!scores[userId]) scores[userId] = {};
    scores[userId][category] = score;
    Storage.set('leaderboard_scores', scores);
  }
};

// ── Utility Functions ──
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// ── Tema Yöneticisi ──
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  Storage.set('theme', theme);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  UserState.init();
  setActiveNav();
  initMobileMenu();
  AdManager.init();

  // Tema uygula
  const savedTheme = Storage.get('theme', 'dark');
  applyTheme(savedTheme);

  // Scroll animasyonları
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

  console.log('🎓 EduPlay başlatıldı');
});
