/**
 * Miroir localStorage → API serveur (fichier data/store.json).
 * Chargé uniquement sur dashboard.php avant dashboard.js.
 */
(function () {
  const mem = {};
  let persistTimer = null;

  function persist() {
    const body = JSON.stringify(mem);
    console.info('[PM DEBUG] Persist async storage', { keys: Object.keys(mem).length });
    return fetch('api/storage', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body
    }).catch(() => {});
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      void persist();
    }, 120);
  }
  // Sauvegarde immédiate pour données critiques (TAJ/FPR/Rapports...)
  window.pmPersistNow = function pmPersistNow(){
    if(persistTimer){ clearTimeout(persistTimer); persistTimer=null; }
    return persist();
  };

  /** Envoie tout de suite les changements en attente (évite d’écraser la mémoire locale avant le PUT). */
  window.pmFlushPendingStorage = async function pmFlushPendingStorage() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
      await persist();
    }
  };

  /** Recharge le miroir depuis le serveur (GET /api/storage), après flush des écritures différées. */
  window.pmReloadStorageFromServer = async function pmReloadStorageFromServer() {
    if (typeof window.pmFlushPendingStorage === 'function') {
      await window.pmFlushPendingStorage();
    }
    const stRes = await fetch('api/storage', { credentials: 'same-origin' });
    if (!stRes.ok) {
      return false;
    }
    const data = await stRes.json();
    Object.keys(mem).forEach((k) => delete mem[k]);
    Object.assign(mem, data);
    return true;
  };

  /** Dernière chance avant fermeture d’onglet (cookie de session envoyé automatiquement). */
  function flushSync() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (Object.keys(mem).length === 0) return;
    const body = JSON.stringify(mem);
    try {
      console.info('[PM DEBUG] Flush storage pagehide', { keys: Object.keys(mem).length });
      fetch('api/storage', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  window.addEventListener('pagehide', flushSync);

  window.pmLocalStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },
    setItem(key, value) {
      mem[key] = String(value);
      schedulePersist();
    }
  };

  function fetchWithTimeout(url, opts, ms=4000){
    const ctrl = new AbortController();
    const t = setTimeout(()=> ctrl.abort(), ms);
    const o = Object.assign({}, opts, { signal: ctrl.signal });
    return fetch(url, o).finally(()=> clearTimeout(t));
  }
  window.__pmStorageReady = (async function initPmStorage() {
    console.info('[PM DEBUG] Vérification session /api/auth/me');
    let meRes;
    try{
      meRes = await fetchWithTimeout('api/auth/me', { credentials: 'same-origin' }, 3000);
    }catch(e){
      console.warn('[PM DEBUG] api/auth/me timeout/erreur, passage en mode public', e && e.message);
      sessionStorage.removeItem('currentUser');
      return;
    }
    if (!meRes || !meRes.ok) {
      console.warn('[PM DEBUG] Session invalide, mode public (pas de redirection)', { status: meRes && meRes.status });
      sessionStorage.removeItem('currentUser');
      return;
    }
    let user;
    try{ user = await meRes.json(); }catch(e){ console.warn('[PM DEBUG] JSON user invalide, mode public'); return; }
    try{ sessionStorage.setItem('currentUser', JSON.stringify(user)); }catch(e){}
    let stRes;
    try{
      stRes = await fetchWithTimeout('api/storage', { credentials: 'same-origin' }, 3000);
    }catch(e){
      console.warn('[PM DEBUG] api/storage timeout, mode public');
      return;
    }
    if (!stRes || !stRes.ok) {
      console.error('[Intranet PM] Échec chargement données (', stRes && stRes.status, ') — mode public');
      return;
    }
    let data;
    try{ data = await stRes.json(); }catch(e){ console.warn('[PM DEBUG] JSON storage invalide'); return; }
    Object.keys(mem).forEach((k) => delete mem[k]);
    Object.assign(mem, data);
  })();
})();
