/* ================================================================
   EduPlay v4.0 — Router & Navigation Manager
   Sayfa geçişleri, aktif link yönetimi, geri/ileri desteği
================================================================ */

const Router = {
  history: [],

  init() {
    this.setActive();
    this.trackVisit();
    this.updateNavXP();
    this.checkDailyLogin();
    this.initInstallBanner();
  },

  // Aktif nav linkini işaretle
  setActive() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const linkPage = href.split('/').pop();
      a.classList.toggle('active', linkPage === path);
    });
  },

  // Ziyareti localStorage'a kaydet
  trackVisit() {
    try {
      const s = Store.get();
      const today = new Date().toDateString();

      if (s.lastVisit !== today) {
        // Yeni gün
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (s.lastVisit === yesterday) {
          s.streak = (s.streak || 0) + 1;
        } else if (s.lastVisit && s.lastVisit !== today) {
          s.streak = 1; // Seri kırıldı
        } else {
          s.streak = (s.streak || 0) + 1;
        }
        s.lastVisit = today;
        s.weeklyDays = Math.min(7, (s.weeklyDays || 0) + 1);

        // Aktivite ekle
        s.activities = s.activities || [];
        s.activities.push({ icon: '🌅', text: 'Günlük giriş yapıldı', xp: '+25 XP', time: 'Az önce' });
        if (s.activities.length > 20) s.activities = s.activities.slice(-20);

        // Günlük giriş XP
        s.xp = (s.xp || 0) + 25;
        s.coins = (s.coins || 0) + 5;

        // Günlük görev güncelle
        s.dailyProgress = s.dailyProgress || {};
        s.dailyProgress['m5'] = 1;

        Store.set(s);

        // Hoş geldin toast
        if (window.showToast) {
          setTimeout(() => showToast(`🌅 Hoş geldin! +25 XP günlük giriş bonusu`, 'success', 4000), 500);
        }
      }
    } catch (e) {}
  },

  // Navbar XP güncelle
  updateNavXP() {
    try {
      const s = Store.get();
      const xpEl = document.getElementById('navXP');
      const avEl = document.getElementById('navAvatar');
      if (xpEl) xpEl.textContent = (s.xp || 0).toLocaleString('tr-TR');
      if (avEl && s.name) {
        avEl.textContent = s.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      }
    } catch (e) {}
  },

  // Günlük login kontrolü
  checkDailyLogin() {
    try {
      const s = Store.get();
      const today = new Date().toDateString();
      if (s.lastVisit === today && s.streak >= 3 && !s.streakCongratulated) {
        if (window.showToast) {
          setTimeout(() => showToast(`🔥 ${s.streak} günlük serin devam ediyor!`, 'warning', 3000), 2000);
        }
        s.streakCongratulated = today;
        Store.set(s);
      }
    } catch (e) {}
  },

  // PWA Install Banner
  initInstallBanner() {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'flex';
    });

    window.installApp = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
          const banner = document.getElementById('installBanner');
          if (banner) banner.style.display = 'none';
        });
      }
    };

    window.dismissInstall = () => {
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'none';
      localStorage.setItem('ep_install_dismissed', '1');
    };
  }
};

/* ── Store: merkezi localStorage yönetimi ── */
const Store = {
  KEY: 'eduplay_user',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch { return {}; }
  },

  set(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); }
    catch {}
  },

  update(fn) {
    const s = this.get();
    fn(s);
    this.set(s);
  },

  addXP(amount, reason) {
    this.update(s => {
      s.xp = (s.xp || 0) + amount;
      s.activities = s.activities || [];
      s.activities.push({ icon: '⚡', text: reason, xp: '+' + amount + ' XP', time: 'Az önce' });
      if (s.activities.length > 20) s.activities = s.activities.slice(-20);
      // Level kontrolü
      const newLevel = Math.floor(Math.sqrt(s.xp / 100)) + 1;
      if (newLevel > (s.level || 1)) {
        s.level = newLevel;
        if (window.showToast) setTimeout(() => showToast(`🎉 Seviye ${newLevel}! Tebrikler!`, 'success', 5000), 300);
      }
    });
    if (window.showToast) showToast(`⚡ +${amount} XP — ${reason}`, 'info', 2500);
  },

  addCoins(amount) {
    this.update(s => { s.coins = (s.coins || 0) + amount; });
  },

  addBadge(id, name, icon) {
    this.update(s => {
      s.badges = s.badges || [];
      if (!s.badges.includes(id)) {
        s.badges.push(id);
        if (window.showToast) setTimeout(() => showToast(`${icon} Yeni Rozet: ${name}!`, 'success', 4000), 500);
      }
    });
  },

  markLessonComplete(lessonId) {
    this.update(s => {
      s.completedLessons = s.completedLessons || [];
      if (!s.completedLessons.includes(lessonId)) {
        s.completedLessons.push(lessonId);
        s.dailyProgress = s.dailyProgress || {};
        s.dailyProgress['m1'] = (s.dailyProgress['m1'] || 0) + 1;
      }
    });
  },

  markTestComplete(testId, score, total) {
    this.update(s => {
      s.testsCompleted = (s.testsCompleted || 0) + 1;
      s.testHistory = s.testHistory || [];
      s.testHistory.push({ id: testId, score, total, date: new Date().toISOString() });
      if (s.testHistory.length > 50) s.testHistory = s.testHistory.slice(-50);
      s.dailyProgress = s.dailyProgress || {};
      s.dailyProgress['m2'] = (s.dailyProgress['m2'] || 0) + 1;
    });
  },

  markGameComplete(gameId, gameScore) {
    this.update(s => {
      s.gamesPlayed = (s.gamesPlayed || 0) + 1;
      s.dailyProgress = s.dailyProgress || {};
      s.dailyProgress['m3'] = (s.dailyProgress['m3'] || 0) + 1;
    });
  }
};

/* ── Toast sistemi (global) ── */
window.showToast = function(msg, type = 'info', duration = 3000) {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  root.appendChild(t);
  setTimeout(() => {
    t.style.cssText = 'opacity:0;transform:translateX(110%);transition:all .3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
};

/* ── Drawer toggle (global) ── */
window.toggleDrawer = function() {
  const d = document.getElementById('navDrawer');
  if (d) d.classList.toggle('open');
};

document.addEventListener('click', e => {
  const d = document.getElementById('navDrawer');
  if (d && d.classList.contains('open') && !d.contains(e.target) && !e.target.closest('.nav-hamburger')) {
    d.classList.remove('open');
  }
});

/* ── Gamification helpers ── */
window.Gamification = {
  LEVELS: [
    { min: 0,    title: '🌱 Başlangıç',  color: '#8fa3bf' },
    { min: 5,    title: '📖 Öğrenci',    color: '#63dbff' },
    { min: 10,   title: '🎯 Çalışkan',   color: '#b8ff4e' },
    { min: 15,   title: '⭐ Yıldız',     color: '#ffd166' },
    { min: 20,   title: '🚀 Uzman',      color: '#c77dff' },
    { min: 30,   title: '🔥 Efsane',     color: '#ff6b6b' },
    { min: 50,   title: '👑 Efsanevi',   color: '#ffd700' },
  ],

  getTitle(level) {
    let t = this.LEVELS[0];
    for (const l of this.LEVELS) if (level >= l.min) t = l;
    return t;
  },

  xpForLevel(l) { return l * l * 100; },

  levelFromXP(xp) { return Math.floor(Math.sqrt(xp / 100)) + 1; },

  progressToNext(xp) {
    const level = this.levelFromXP(xp);
    const curr = this.xpForLevel(level);
    const next = this.xpForLevel(level + 1);
    return Math.min(100, ((xp - curr) / (next - curr)) * 100);
  }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => Router.init());
