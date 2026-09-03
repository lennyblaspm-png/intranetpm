/**
 * Miroir localStorage → API serveur (data/store.json) + backup localStorage navigateur.
 * Le localStorage navigateur sert de backup : si le serveur perd les données
 * (cold start Vercel), le navigateur restaure depuis son propre localStorage.
 */
(function () {
  const mem = {};
  const LOCAL_BACKUP_KEY = 'PM_INTRANET_BACKUP_STORE';
  let persistTimer = null;

  /** Sauvegarde dans le vrai localStorage du navigateur (backup local). */
  function saveToBrowserBackup() {
    try {
      const data = {};
      for (const [k, v] of Object.entries(mem)) {
        if (typeof v === 'string') data[k] = v;
      }
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  /** Restaure depuis le vrai localStorage du navigateur (backup local). */
  function loadFromBrowserBackup() {
    try {
      const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function persist() {
    const body = JSON.stringify(mem);
    console.info('[PM DEBUG] Persist async storage', { keys: Object.keys(mem).length });
    saveToBrowserBackup();
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

  window.pmPersistNow = function pmPersistNow(){
    if(persistTimer){ clearTimeout(persistTimer); persistTimer=null; }
    return persist();
  };

  window.pmFlushPendingStorage = async function pmFlushPendingStorage() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
      await persist();
    }
  };

  window.pmReloadStorageFromServer = async function pmReloadStorageFromServer() {
    if (typeof window.pmFlushPendingStorage === 'function') {
      await window.pmFlushPendingStorage();
    }
    const stRes = await fetch('api/storage', { credentials: 'same-origin' });
    if (!stRes.ok) return false;
    const data = await stRes.json();

    const serverAccounts = parseAccounts(data['PM_INTRANET_OFFICIAL_ACCOUNTS']);
    const backup = loadFromBrowserBackup();
    const backupAccounts = backup ? parseAccounts(backup['PM_INTRANET_OFFICIAL_ACCOUNTS']) : [];

    if (backupAccounts.length > serverAccounts.length) {
      console.info('[PM DEBUG] pullServer: backup plus récent (' + backupAccounts.length + '>' + serverAccounts.length + ') — on garde le backup');
      return true;
    }

    Object.keys(mem).forEach((k) => delete mem[k]);
    Object.assign(mem, data);
    saveToBrowserBackup();
    return true;
  };

  function flushSync() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (Object.keys(mem).length === 0) return;
    saveToBrowserBackup();
    const body = JSON.stringify(mem);
    try {
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
      saveToBrowserBackup();
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
      console.warn('[PM DEBUG] api/auth/me timeout/erreur', e && e.message);
      sessionStorage.removeItem('currentUser');
      loadBackupIntoMem();
      return;
    }
    if (!meRes || !meRes.ok) {
      console.warn('[PM DEBUG] Session invalide', { status: meRes && meRes.status });
      sessionStorage.removeItem('currentUser');
      loadBackupIntoMem();
      return;
    }
    let user;
    try{ user = await meRes.json(); }catch(e){ return; }
    try{ sessionStorage.setItem('currentUser', JSON.stringify(user)); }catch(e){}

    let stRes;
    try{
      stRes = await fetchWithTimeout('api/storage', { credentials: 'same-origin' }, 3000);
    }catch(e){
      console.warn('[PM DEBUG] api/storage timeout');
      loadBackupIntoMem();
      return;
    }
    if (!stRes || !stRes.ok) {
      console.error('[PM DEBUG] api/storage failed', stRes && stRes.status);
      loadBackupIntoMem();
      return;
    }
    let data;
    try{ data = await stRes.json(); }catch(e){ loadBackupIntoMem(); return; }

    const serverAccounts = parseAccounts(data['PM_INTRANET_OFFICIAL_ACCOUNTS']);
    const backup = loadFromBrowserBackup();
    const backupAccounts = backup ? parseAccounts(backup['PM_INTRANET_OFFICIAL_ACCOUNTS']) : [];

    if (serverAccounts.length >= backupAccounts.length) {
      Object.keys(mem).forEach((k) => delete mem[k]);
      Object.assign(mem, data);
      saveToBrowserBackup();
    } else {
      console.info('[PM DEBUG] Backup local plus récent (' + backupAccounts.length + ' vs ' + serverAccounts.length + ' comptes) — restauration locale');
      Object.keys(mem).forEach((k) => delete mem[k]);
      Object.assign(mem, backup);
      saveToBrowserBackup();
      persist();
    }
  })();

  function parseAccounts(json) {
    try {
      const arr = typeof json === 'string' ? JSON.parse(json) : json;
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  function loadBackupIntoMem() {
    const backup = loadFromBrowserBackup();
    if (backup && Object.keys(backup).length > 0) {
      console.info('[PM DEBUG] Restauration depuis backup localStorage');
      Object.keys(mem).forEach((k) => delete mem[k]);
      Object.assign(mem, backup);
    }
  }
})();
