/* ================================================================
   EduPlay v3.0 — Reklam Yönetim Sistemi
   KVKK + COPPA + GDPR uyumlu
   Platform: Ezoic (NPA) + Infolinks + Adsterra (sadece banner)
================================================================ */

const AdsConfig = {
  // ── KİMLİKLER — DOLDUR ──────────────────────────────────
  EZOIC_ID:         'YOUR_EZOIC_ID',        // ezoic.com panelinden
  INFOLINKS_PID:    'YOUR_INFOLINKS_PID',   // infolinks.com panelinden
  INFOLINKS_WSID:   'YOUR_INFOLINKS_WSID',
  ADSTERRA_KEY:     'YOUR_ADSTERRA_KEY',    // sadece APK sayfası

  // ── SAYFA KURALLARI ──────────────────────────────────────
  PAGES: {
    'index':       { ezoic: true,  infolinks: true,  adsterra: false },
    'learn':       { ezoic: true,  infolinks: true,  adsterra: false },
    'test':        { ezoic: true,  infolinks: false, adsterra: false },
    'games':       { ezoic: true,  infolinks: false, adsterra: false },
    'leaderboard': { ezoic: true,  infolinks: false, adsterra: false },
    'profile':     { ezoic: false, infolinks: false, adsterra: false },
    'settings':    { ezoic: false, infolinks: false, adsterra: false },
    'about':       { ezoic: true,  infolinks: true,  adsterra: false },
    'apk':         { ezoic: false, infolinks: false, adsterra: true  },
    'game-inner':  { ezoic: false, infolinks: false, adsterra: false },
  },

  // ── KVKK/COPPA ───────────────────────────────────────────
  NPA: true,             // Non-Personalized Ads — ortaokul için ŞART
  COPPA: true,           // 13 yaş altı koruması
  CONSENT_KEY: 'ep_consent_v3',
};

// ── Ana Yönetici ─────────────────────────────────────────────
const AdsManager = {
  page: null,
  consented: false,

  init() {
    this.page = this._getPage();
    this.consented = localStorage.getItem(AdsConfig.CONSENT_KEY) === '1';
    this._renderAdSlots();   // Placeholder'ları hemen göster

    if (this.consented) {
      this._boot();
    } else {
      this._showConsent();
    }
  },

  _getPage() {
    const p = window.location.pathname;
    if (p.includes('/games/')) return 'game-inner';
    const keys = Object.keys(AdsConfig.PAGES);
    for (const k of keys) {
      if (p.includes(k)) return k;
    }
    return 'index';
  },

  _boot() {
    const rules = AdsConfig.PAGES[this.page] || {};
    if (rules.ezoic)     this._loadEzoic();
    if (rules.infolinks) this._loadInfolinks();
    if (rules.adsterra)  this._loadAdsterra();
  },

  _loadEzoic() {
    if (!AdsConfig.EZOIC_ID || AdsConfig.EZOIC_ID.startsWith('YOUR')) return;
    window.ezConsentData = { gdpr: true, npa: '1', coppa: '1' };
    const s = document.createElement('script');
    s.src = '//www.ezojs.com/ezoic/sa.min.js';
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    document.head.appendChild(s);
  },

  _loadInfolinks() {
    if (!AdsConfig.INFOLINKS_PID || AdsConfig.INFOLINKS_PID.startsWith('YOUR')) return;
    window.infolinks_pid  = AdsConfig.INFOLINKS_PID;
    window.infolinks_wsid = AdsConfig.INFOLINKS_WSID;
    const s = document.createElement('script');
    s.src = '//resources.infolinks.com/js/infolinks_main.js';
    s.async = true;
    document.body.appendChild(s);
  },

  _loadAdsterra() {
    if (!AdsConfig.ADSTERRA_KEY || AdsConfig.ADSTERRA_KEY.startsWith('YOUR')) return;
    // SADECE display banner — pop/push ASLA
    document.querySelectorAll('[data-ad-platform="adsterra"]').forEach(el => {
      const s = document.createElement('script');
      s.async = true;
      s.src = `//pl${AdsConfig.ADSTERRA_KEY}.profitableratecpm.com/${AdsConfig.ADSTERRA_KEY}/invoke.js`;
      el.appendChild(s);
    });
  },

  _renderAdSlots() {
    document.querySelectorAll('.ad-slot').forEach(el => {
      if (el.querySelector('.ad-inner')) return;
      const inner = document.createElement('div');
      inner.className = 'ad-inner';
      inner.style.cssText = 'display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.15);font-size:11px;font-family:monospace;';
      inner.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg> reklam';
      el.appendChild(inner);
    });
  },

  // ── KVKK Onay Banner ─────────────────────────────────────
  _showConsent() {
    if (document.getElementById('ep-consent')) return;

    const banner = document.createElement('div');
    banner.id = 'ep-consent';
    banner.innerHTML = `
      <div class="ep-consent-text">
        🍪 <strong>Çerez Bildirimi</strong> — EduPlay, içerik bazlı
        <strong>kişiselleştirilmemiş</strong> reklamlar gösterir.
        Kişisel veri toplamaz. KVKK kapsamında bilgilendirme zorunludur.
        <a href="/pages/about.html">Daha fazla bilgi</a>
      </div>
      <div class="ep-consent-btns">
        <button class="btn btn-ghost btn-sm" onclick="AdsManager.deny()">Reddet</button>
        <button class="btn btn-primary btn-sm" onclick="AdsManager.accept()">✓ Kabul Et</button>
      </div>`;
    document.body.appendChild(banner);
  },

  accept() {
    localStorage.setItem(AdsConfig.CONSENT_KEY, '1');
    localStorage.setItem('ep_consent_date', new Date().toISOString());
    this.consented = true;
    document.getElementById('ep-consent')?.remove();
    this._boot();
  },

  deny() {
    localStorage.setItem(AdsConfig.CONSENT_KEY, '0');
    document.getElementById('ep-consent')?.remove();
  },

  // ── Gelir Tahmini (Dashboard kullanımı için) ─────────────
  estimate(monthlyVisitors) {
    const pv = monthlyVisitors * 2.5;
    const ezoicNet    = (pv / 1000) * 1.5 * 0.9;
    const infoNet     = (pv / 1000) * 0.4;
    const adsterraNet = (pv * 0.05 / 1000) * 0.3;
    const total = ezoicNet + infoNet + adsterraNet;
    return {
      visitors: monthlyVisitors,
      pageViews: Math.round(pv),
      ezoic: +ezoicNet.toFixed(2),
      infolinks: +infoNet.toFixed(2),
      adsterra: +adsterraNet.toFixed(2),
      total: +total.toFixed(2),
      totalTRY: Math.round(total * 32.5),
    };
  }
};

// Toast sistemi (global)
window.showToast = function(msg, type = 'info', duration = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, duration);
};

document.addEventListener('DOMContentLoaded', () => AdsManager.init());
