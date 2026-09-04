/**
 * Miroir localStorage → API serveur.
 * Le navigateur EST la source de vérité pour les comptes.
 * Le serveur est un backup secondaire (best-effort).
 */
(function () {
  const mem = {};
  const BACKUP_KEY = 'PM_INTRANET_BACKUP_STORE';
  let persistTimer = null;

  function saveBackup() {
    try {
      const data = {};
      for (const [k, v] of Object.entries(mem)) {
        if (typeof v === 'string') data[k] = v;
      }
      localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function loadBackup() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function persist() {
    saveBackup();
    const body = JSON.stringify(mem);
    console.info('[PM DEBUG] Persist', { keys: Object.keys(mem).length });
    return fetch('api/storage', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body
    }).catch(function(e) {
      console.warn('[PM DEBUG] Persist serveur échoué (pas grave, backup local OK)', e && e.message);
    });
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function() {
      persistTimer = null;
      void persist();
    }, 150);
  }

  window.pmPersistNow = function pmPersistNow() {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    return persist();
  };

  window.pmFlushPendingStorage = async function pmFlushPendingStorage() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
      await persist();
    }
  };

  // NE JAMAIS écraser les données navigateur avec le serveur
  window.pmReloadStorageFromServer = async function pmReloadStorageFromServer() {
    if (typeof window.pmFlushPendingStorage === 'function') {
      await window.pmFlushPendingStorage();
    }
    // Ne fait RIEN — le navigateur EST la source de vérité
    return true;
  };

  function flushSync() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (Object.keys(mem).length === 0) return;
    saveBackup();
    var body = JSON.stringify(mem);
    try {
      fetch('api/storage', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(function() {});
    } catch (_) {}
  }

  window.addEventListener('pagehide', flushSync);

  window.pmLocalStorage = {
    getItem: function(key) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },
    setItem: function(key, value) {
      mem[key] = String(value);
      saveBackup();
      schedulePersist();
    }
  };

  // === INIT : le navigateur EST la source de vérité ===
  window.__pmStorageReady = (async function initPmStorage() {
    console.info('[PM DEBUG] Init storage — navigateur = source de vérité');

    // 1. Toujours charger depuis le backup local d'abord
    var backup = loadBackup();
    if (backup && Object.keys(backup).length > 0) {
      console.info('[PM DEBUG] Backup local trouvé (' + Object.keys(backup).length + ' keys) — restauration');
      Object.keys(mem).forEach(function(k) { delete mem[k]; });
      Object.assign(mem, backup);
    }

    // 2. Vérifier la session serveur (auth/me) — ne pas bloquer, ne pas écraser le login local
    var existingUser = null;
    try { existingUser = JSON.parse(sessionStorage.getItem('currentUser')); } catch(e) {}
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 3000);
      var meRes = await fetch('api/auth/me', { credentials: 'same-origin', signal: ctrl.signal });
      clearTimeout(timer);
      if (meRes && meRes.ok) {
        var user = await meRes.json();
        // Ne met à jour que si l'utilisateur serveur correspond au RIO déjà connecté
        if (user && user.rio && existingUser && user.rio === existingUser.rio) {
          try { sessionStorage.setItem('currentUser', JSON.stringify(user)); } catch(e) {}
        }
        // Si serveur retourne un AUTRE utilisateur, on ignore — le login local prime
      }
    } catch(e) {
      console.warn('[PM DEBUG] api/auth/me timeout — on garde la session locale');
    }

    // 3. Essayer de sync le serveur en arrière-plan (best-effort)
    try {
      var stRes = await fetch('api/storage', { credentials: 'same-origin' });
      if (stRes && stRes.ok) {
        var serverData = await stRes.json();
        var serverAccounts = parseAccounts(serverData['PM_INTRANET_OFFICIAL_ACCOUNTS']);
        var localAccounts = parseAccounts(mem['PM_INTRANET_OFFICIAL_ACCOUNTS']);

        if (serverAccounts.length > localAccounts.length) {
          console.info('[PM DEBUG] Serveur a plus de comptes (' + serverAccounts.length + '>' + localAccounts.length + ') — fusion');
          Object.keys(serverData).forEach(function(k) {
            if (!mem[k]) mem[k] = serverData[k];
          });
          saveBackup();
        }
      }
    } catch(e) {
      console.warn('[PM DEBUG] Sync serveur échoué (pas grave)', e && e.message);
    }

    // 4. S'assurer que les comptes initiaux existent
    ensureInitialAccounts();
  })();

  function ensureInitialAccounts() {
    var raw = mem['PM_INTRANET_OFFICIAL_ACCOUNTS'];
    var accounts;
    try {
      accounts = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch(e) {
      accounts = [];
    }
    if (!Array.isArray(accounts)) accounts = [];
    if (accounts.length === 0) {
      accounts = [
        {rio:'123',password:'123',nom:'TEST',prenom:'Agent',grade:'GRP',role:'Effectif',specialites:['BMU'],webhookUrl:''},
        {rio:'6452182',password:'Lenny2010+',nom:'BLAS',prenom:'Lenny',grade:'DPM',role:'Direction',specialites:[],webhookUrl:''},
        {rio:'4528259',password:'350075Mn@.',nom:'DUPONT',prenom:'Quentin',grade:'CDP',role:'Direction',specialites:['BMU'],webhookUrl:''}
      ];
      mem['PM_INTRANET_OFFICIAL_ACCOUNTS'] = JSON.stringify(accounts, null, 2);
      saveBackup();
      persist();
      console.info('[PM DEBUG] Comptes initiaux créés');
    }
  }

  function parseAccounts(json) {
    try {
      var arr = typeof json === 'string' ? JSON.parse(json) : json;
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
})();
