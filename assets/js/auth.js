// Connexion : serveur d'abord, fallback localStorage si le serveur ne trouve pas.

document.addEventListener('DOMContentLoaded', () => {
  const safeReadJson = async (res) => {
    const raw = await res.text();
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  };

  const getAccountsFromBackup = () => {
    try {
      const raw = localStorage.getItem('PM_INTRANET_BACKUP_STORE');
      if (!raw) return [];
      const data = JSON.parse(raw);
      const arr = typeof data.PM_INTRANET_OFFICIAL_ACCOUNTS === 'string'
        ? JSON.parse(data.PM_INTRANET_OFFICIAL_ACCOUNTS)
        : data.PM_INTRANET_OFFICIAL_ACCOUNTS;
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };

  const loginForm = document.getElementById('login-form');
  const localBox = document.getElementById('local-libre-acces');
  const btnLibreLocal = document.getElementById('btn-libre-acces-local');

  const isBrowserLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (localBox && isBrowserLocal) {
    localBox.hidden = false;
    const rootLink = document.getElementById('libre-acces-lien-root');
    if (rootLink) {
      rootLink.href = `${window.location.origin}/`;
      rootLink.textContent = `${window.location.origin}/`;
    }
  }

  if (btnLibreLocal) {
    btnLibreLocal.addEventListener('click', async () => {
      if (btnLibreLocal.disabled) return;
      btnLibreLocal.disabled = true;
      btnLibreLocal.textContent = 'Connexion…';
      try {
        const res = await fetch('api/auth/dev-session', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await safeReadJson(res);
        if (!res.ok) { alert(data.error || 'Accès refusé.'); return; }
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          window.location.href = 'dashboard.php';
          return;
        }
        const meRes = await fetch('api/auth/me', { credentials: 'same-origin' });
        const meData = await safeReadJson(meRes);
        if (meRes.ok && meData && meData.rio) {
          sessionStorage.setItem('currentUser', JSON.stringify(meData));
          window.location.href = 'dashboard.php';
          return;
        }
        alert('Session non récupérée.');
      } catch (err) {
        alert('Impossible de joindre le serveur.');
      } finally {
        btnLibreLocal.disabled = false;
        btnLibreLocal.textContent = 'Accès libre (local)';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rioInput = document.getElementById('rio').value.trim();
      const passwordInput = document.getElementById('password').value.trim();
      if (!rioInput || !passwordInput) { alert('Veuillez remplir tous les champs.'); return; }

      try {
        // Envoyer les comptes locaux au serveur pour les sauvegarder (seed)
        const localAccounts = getAccountsFromBackup();
        const accountsJson = localAccounts.length > 0 ? JSON.stringify(localAccounts) : undefined;

        // 1. Essayer le serveur d'abord
        const loginBody = { rio: rioInput, password: passwordInput };
        if (accountsJson) loginBody.accounts = accountsJson;

        const res = await fetch('api/auth/login', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginBody)
        });
        const data = await safeReadJson(res);

        if (res.ok && data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          localStorage.setItem('PM_LAST_RIO', rioInput);
          window.location.href = 'dashboard.php';
          return;
        }

        // 2. Fallback : vérifier dans le localStorage du navigateur
        if (data.error === 'RIO introuvable.') {
          console.info('[PM DEBUG] Serveur ne trouve pas le RIO, vérification locale...');
          const accounts = getAccountsFromBackup();
          const found = accounts.find(a =>
            a.rio && a.rio.toLowerCase() === rioInput.toLowerCase() &&
            a.password === passwordInput
          );

          if (found) {
            console.info('[PM DEBUG] Compte trouvé localement !');
            const user = Object.assign({}, found);
            delete user.password;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('PM_LAST_RIO', rioInput);
            // Envoyer les comptes au serveur pour seed + retry login
            try {
              await fetch('api/auth/login', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rio: rioInput, password: passwordInput, accounts: accountsJson })
              });
            } catch(_) {}
            window.location.href = 'dashboard.php';
            return;
          }
        }

        alert(data.error || 'Échec de la connexion.');
      } catch (err) {
        // 3. Serveur injoignable — fallback local
        console.warn('[PM DEBUG] Serveur injoignable, fallback local', err && err.message);
        const accounts = getAccountsFromBackup();
        const found = accounts.find(a =>
          a.rio && a.rio.toLowerCase() === rioInput.toLowerCase() &&
          a.password === passwordInput
        );
        if (found) {
          const user = Object.assign({}, found);
          delete user.password;
          sessionStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('PM_LAST_RIO', rioInput);
          window.location.href = 'dashboard.php';
          return;
        }
        alert('Impossible de joindre le serveur et ce compte n\'existe pas en local.');
      }
    });
  }
});
