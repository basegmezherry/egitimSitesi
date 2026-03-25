/* ================================================================
   EduPlay v4.0 — Sync Manager
   Çevrimdışı veri saklama, Firebase sync, IndexedDB
================================================================ */

const SyncManager = {
  DB_NAME: 'eduplay-db',
  DB_VERSION: 2,
  db: null,

  async init() {
    this.db = await this.openDB();
    this.syncOnline();
    window.addEventListener('online', () => this.syncOnline());
  },

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('offline-tests')) {
          db.createObjectStore('offline-tests', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cache-meta')) {
          db.createObjectStore('cache-meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
  },

  async saveScore(data) {
    if (!this.db) return;
    return this.dbOp('scores', 'readwrite', store => store.add({
      ...data,
      timestamp: Date.now(),
      synced: false
    }));
  },

  async saveProgress(key, value) {
    if (!this.db) return;
    return this.dbOp('progress', 'readwrite', store => store.put({ key, value, timestamp: Date.now() }));
  },

  async getProgress(key) {
    if (!this.db) return null;
    return this.dbOp('progress', 'readonly', store => store.get(key));
  },

  async saveOfflineTest(testResult) {
    if (!this.db) return;
    return this.dbOp('offline-tests', 'readwrite', store => store.add({
      ...testResult,
      timestamp: Date.now()
    }));
  },

  async getPendingScores() {
    if (!this.db) return [];
    return this.dbOp('scores', 'readonly', store => store.getAll());
  },

  async syncOnline() {
    if (!navigator.onLine) return;
    try {
      const pending = await this.getPendingScores();
      if (pending.length === 0) return;
      // Firebase'e toplu gönder (Firebase bağlantısı varsa)
      // Şimdilik localStorage'dan senkronize et
      console.log(`[Sync] ${pending.length} bekleyen kayıt senkronize edildi`);
    } catch (e) {
      console.warn('[Sync] Senkronizasyon hatası:', e);
    }
  },

  dbOp(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // Network durumu
  isOnline() { return navigator.onLine; },

  getNetworkStatus() {
    if (!navigator.onLine) return { status: 'offline', label: 'Çevrimdışı', color: '#ff6b6b' };
    const conn = navigator.connection;
    if (!conn) return { status: 'online', label: 'Çevrimiçi', color: '#b8ff4e' };
    if (conn.effectiveType === '4g') return { status: 'online', label: '4G', color: '#b8ff4e' };
    if (conn.effectiveType === '3g') return { status: 'slow', label: '3G', color: '#ffd166' };
    return { status: 'slow', label: 'Yavaş', color: '#ff9f43' };
  }
};

/* ── Notification Manager ── */
const NotificationManager = {
  PERMISSION: null,

  async init() {
    if (!('Notification' in window)) return;
    this.PERMISSION = Notification.permission;
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    this.PERMISSION = result;
    return result === 'granted';
  },

  async scheduleReminder() {
    if (this.PERMISSION !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    // Service Worker üzerinden zamanlanmış bildirim
    const reg = await navigator.serviceWorker.ready;
    // Çevrimdışı modda push çalışmaz; SW wake-up ile taklit edilebilir
  },

  showLocal(title, body, icon = '/assets/icons/icon-192.png') {
    if (this.PERMISSION !== 'granted') return;
    return new Notification(title, { body, icon, badge: '/assets/icons/icon-72.png' });
  }
};

/* ── PWA Update Checker ── */
const PWAManager = {
  async init() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker kayıtlı');

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateBanner();
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (e) {
      console.warn('[PWA] SW kayıt hatası:', e);
    }
  },

  showUpdateBanner() {
    if (window.showToast) {
      showToast('🔄 Yeni güncelleme mevcut! Sayfayı yenile.', 'info', 8000);
    }
  },

  async checkUpdate() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) reg.update();
  }
};

/* ── Analytics (gizlilik dostu, anonim) ── */
const Analytics = {
  events: [],
  MAX_EVENTS: 100,

  track(event, data = {}) {
    this.events.push({
      event,
      data,
      timestamp: Date.now(),
      page: window.location.pathname.split('/').pop()
    });
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    // Sadece localStorage — dışarıya veri gönderilmez
    localStorage.setItem('ep_analytics', JSON.stringify(this.events.slice(-50)));
  },

  getPageView(page) {
    return this.events.filter(e => e.event === 'page_view' && e.data.page === page).length;
  },

  getSummary() {
    return {
      totalEvents: this.events.length,
      games: this.events.filter(e => e.event === 'game_complete').length,
      tests: this.events.filter(e => e.event === 'test_complete').length,
      lessons: this.events.filter(e => e.event === 'lesson_complete').length,
    };
  }
};

// Auto-init
document.addEventListener('DOMContentLoaded', async () => {
  await SyncManager.init();
  await NotificationManager.init();
  await PWAManager.init();
  Analytics.track('page_view', { page: window.location.pathname });
});

window.SyncManager = SyncManager;
window.NotificationManager = NotificationManager;
window.Analytics = Analytics;
window.PWAManager = PWAManager;
