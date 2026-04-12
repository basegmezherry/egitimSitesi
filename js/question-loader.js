/* ================================================================
   EduPlay v4.1 — Soru Yükleyici (Question Loader)
   Lazy loading: sadece kullanılacak kategori yüklenir
   Cache: localStorage + Memory
================================================================ */

const QuestionLoader = (() => {

  const CACHE_PREFIX = 'ep_qcache_';
  const CACHE_TTL    = 24 * 60 * 60 * 1000; // 24 saat
  const DATA_BASE    = '../data/';           // pages/ altından bakıldığında

  // Bellek önbelleği (sayfa yenilenmeden silinmez)
  const memCache = {};

  // Tüm kategori indeksini yükle
  async function loadIndex() {
    if (memCache['_index']) return memCache['_index'];
    try {
      const res  = await fetch(DATA_BASE + 'index.json');
      const data = await res.json();
      memCache['_index'] = data;
      return data;
    } catch (e) {
      console.error('[QL] index.json yüklenemedi:', e);
      return null;
    }
  }

  // Tek kategori yükle (lazy)
  async function loadCategory(catId) {
    if (memCache[catId]) return memCache[catId];

    // localStorage cache kontrolü
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + catId);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) {
          memCache[catId] = parsed.data;
          return parsed.data;
        }
      }
    } catch (_) {}

    // Ağdan yükle
    try {
      const index = await loadIndex();
      const catMeta = index?.categories.find(c => c.id === catId);
      if (!catMeta) throw new Error('Kategori bulunamadı: ' + catId);

      const res  = await fetch(DATA_BASE + catMeta.file);
      const data = await res.json();

      memCache[catId] = data;
      try {
        localStorage.setItem(CACHE_PREFIX + catId, JSON.stringify({ ts: Date.now(), data }));
      } catch (_) {}

      return data;
    } catch (e) {
      console.error('[QL] Kategori yüklenemedi:', catId, e);
      return null;
    }
  }

  // Belirli bir testi getir
  async function getTest(catId, testId) {
    const cat = await loadCategory(catId);
    if (!cat) return null;
    return cat.tests.find(t => t.id === testId) || null;
  }

  // Kategorideki tüm testlerin listesi (sorular olmadan — hafif)
  async function getTestList(catId) {
    const cat = await loadCategory(catId);
    if (!cat) return [];
    return cat.tests.map(t => ({
      id: t.id, title: t.title, difficulty: t.difficulty,
      xp: t.xp, time: t.time, questionCount: t.questions.length
    }));
  }

  // Tüm kategorilerin meta verilerini getir (sorular olmadan)
  async function getAllCategories() {
    const index = await loadIndex();
    return index?.categories || [];
  }

  // Rastgele quiz: birden fazla kategoriden soru karıştır
  async function buildRandomQuiz(options = {}) {
    const {
      catIds    = [],      // Hangi kategorilerden
      count     = 20,      // Toplam soru sayısı
      difficulty = null    // 'easy' | 'medium' | 'hard' | null (hepsi)
    } = options;

    const allQ = [];

    for (const catId of catIds) {
      const cat = await loadCategory(catId);
      if (!cat) continue;
      for (const test of cat.tests) {
        if (difficulty && test.difficulty !== difficulty) continue;
        allQ.push(...test.questions.map(q => ({ ...q, _cat: catId, _test: test.id })));
      }
    }

    // Karıştır ve say kadar al
    shuffleArray(allQ);
    return allQ.slice(0, count);
  }

  // LGS simülasyon quizi: 20 Türkçe + 20 Matematik + 20 Fen
  async function buildLGSQuiz() {
    const [tr, mat, fen] = await Promise.all([
      buildRandomQuiz({ catIds: ['turkish_english'], count: 20, difficulty: 'hard' }),
      buildRandomQuiz({ catIds: ['math78'],           count: 20, difficulty: 'hard' }),
      buildRandomQuiz({ catIds: ['science'],          count: 20, difficulty: 'hard' }),
    ]);
    return [...tr, ...mat, ...fen];
  }

  // Arama: soru metni içinde ara
  async function searchQuestions(query, catIds = null) {
    const index  = await loadIndex();
    const cats   = catIds || index.categories.map(c => c.id);
    const ql     = query.toLowerCase().trim();
    const results = [];

    for (const catId of cats) {
      const cat = await loadCategory(catId);
      if (!cat) continue;
      for (const test of cat.tests) {
        for (const q of test.questions) {
          if (
            q.text.toLowerCase().includes(ql) ||
            q.explanation?.toLowerCase().includes(ql) ||
            q.options.some(o => o.toLowerCase().includes(ql))
          ) {
            results.push({ ...q, _cat: catId, _test: test.id, _testTitle: test.title });
          }
        }
      }
    }
    return results;
  }

  // Cache temizle
  function clearCache(catId = null) {
    if (catId) {
      delete memCache[catId];
      localStorage.removeItem(CACHE_PREFIX + catId);
    } else {
      Object.keys(memCache).forEach(k => delete memCache[k]);
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  }

  // İstatistik — kaç soru var
  async function getStats() {
    const index = await loadIndex();
    if (!index) return {};
    return {
      totalCategories: index.categories.length,
      totalTests: index.totalTests,
      totalQuestions: index.totalQuestions,
      categories: index.categories.map(c => ({
        id: c.id, name: c.name, tests: c.testCount, questions: c.questionCount
      }))
    };
  }

  function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // Public API
  return {
    loadIndex,
    loadCategory,
    getTest,
    getTestList,
    getAllCategories,
    buildRandomQuiz,
    buildLGSQuiz,
    searchQuestions,
    clearCache,
    getStats,
  };
})();

// Global erişim
window.QuestionLoader = QuestionLoader;

// Test sayfası kullanımı için kısayol
window.loadTest = async (catId, testId, callback) => {
  const test = await QuestionLoader.getTest(catId, testId);
  if (callback) callback(test);
  return test;
};
