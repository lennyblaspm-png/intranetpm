// Connexion via l'API PHP (session + cookie).

document.addEventListener('DOMContentLoaded', () => {
  const safeReadJson = async (res) => {
    const raw = await res.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      console.warn('[PM DEBUG] Réponse non-JSON', raw.slice(0, 180));
      return {};
    }
  };

  const finalizeLoginFromSession = async (contextLabel) => {
    const meRes = await fetch('api/auth/me', { credentials: 'same-origin' });
    const meData = await safeReadJson(meRes);
    console.info('[PM DEBUG] Vérification session après login', {
      context: contextLabel,
      status: meRes.status,
      ok: meRes.ok,
      hasUser: Boolean(meData && meData.rio)
    });
    if (!meRes.ok || !meData || !meData.rio) {
      alert('Connexion incomplète: session non récupérée. Vérifie les logs PHP/Apache.');
      return;
    }
    sessionStorage.setItem('currentUser', JSON.stringify(meData));
    window.location.href = 'dashboard.php';
  };

  console.info('[PM DEBUG] Auth init', { path: window.location.pathname, origin: window.location.origin });
  const loginForm = document.getElementById('login-form');
  const localBox = document.getElementById('local-libre-acces');
  const btnLibreLocal = document.getElementById('btn-libre-acces-local');

  const isBrowserLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (localBox && isBrowserLocal) {
    localBox.hidden = false;
    const rootLink = document.getElementById('libre-acces-lien-root');
    if (rootLink) {
      const root = `${window.location.origin}/`;
      rootLink.href = root;
      rootLink.textContent = root;
    }
  }

  if (btnLibreLocal) {
    btnLibreLocal.addEventListener('click', async () => {
      if (btnLibreLocal.disabled) return;
      btnLibreLocal.disabled = true;
      const prev = btnLibreLocal.textContent;
      btnLibreLocal.textContent = 'Connexion…';
      try {
        console.info('[PM DEBUG] Tentative dev-session');
        const res = await fetch('api/auth/dev-session', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await safeReadJson(res);
        console.info('[PM DEBUG] Réponse dev-session', { status: res.status, ok: res.ok });
        if (!res.ok) {
          alert(data.error || 'Accès refusé (utilisez bien l\'URL locale de cet intranet sur cette machine).');
          return;
        }
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          console.info('[PM DEBUG] Redirection vers dashboard.php (dev-session user)');
          window.location.href = 'dashboard.php';
          return;
        }
        await finalizeLoginFromSession('dev-session');
      } catch (err) {
        console.error('[PM DEBUG] Erreur dev-session', err);
        alert('Impossible de joindre le serveur.');
      } finally {
        btnLibreLocal.disabled = false;
        btnLibreLocal.textContent = prev;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rioInput = document.getElementById('rio').value.trim();
      const passwordInput = document.getElementById('password').value.trim();

      if (!rioInput || !passwordInput) {
        alert('Veuillez remplir tous les champs.');
        return;
      }

      try {
        console.info('[PM DEBUG] Tentative login', { rio: rioInput });
        const res = await fetch('api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rio: rioInput, password: passwordInput })
        });
        const data = await safeReadJson(res);
        console.info('[PM DEBUG] Réponse login', { status: res.status, ok: res.ok, hasUser: Boolean(data.user) });

        if (!res.ok) {
          alert(data.error || 'Échec de la connexion.');
          return;
        }

        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          console.info('[PM DEBUG] Redirection vers dashboard.php (login user)');
          window.location.href = 'dashboard.php';
          return;
        }
        await finalizeLoginFromSession('login');
      } catch (err) {
        console.error('[PM DEBUG] Erreur login', err);
        alert('Impossible de joindre le serveur PHP. Vérifiez Apache/XAMPP (ou lancez « php -S localhost:PORT router.php » à la racine du projet).');
      }
    });
  }
});
