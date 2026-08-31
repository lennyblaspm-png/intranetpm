'use strict';

const safeReadJson = async (res) => {
    const raw = await res.text();
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

function showAlert(el, type, msg) {
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.remove('candidature-alert--ok', 'candidature-alert--err');
    if (type === 'ok') el.classList.add('candidature-alert--ok');
    if (type === 'err') el.classList.add('candidature-alert--err');
}

function clearAlert(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('candidature-alert--ok', 'candidature-alert--err');
}

function formatIsoDate(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function statutLabel(s) {
    const m = {
        en_attente: 'En attente',
        etudiee: 'Étudiée',
        acceptee: 'Acceptée',
        refusee: 'Refusée',
    };
    return m[s] || s || '—';
}

document.addEventListener('DOMContentLoaded', () => {
    const alertEl = document.getElementById('candidature-alert');

    const form = document.getElementById('candidature-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert(alertEl);
            const btn = form.querySelector('button[type="submit"]');
            const prev = btn ? btn.textContent : '';
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Envoi en cours…';
            }
            const civilRaw = localStorage.getItem('pm_civil_session');
            let civil = null; try{ civil = civilRaw ? JSON.parse(civilRaw) : null; }catch(e){}
            if(!civil || !civil.email){
                showAlert(alertEl, 'err', 'Vous devez créer un compte et être connecté pour postuler. Veuillez vous connecter via l\'espace civil (bouton en haut à droite).');
                const notice = document.getElementById('candidature-account-notice');
                if(notice) notice.style.display='block';
                if (btn) { btn.disabled = false; btn.textContent = prev || 'Envoyer la candidature'; }
                return;
            }
            const payload = {
                discord: (document.getElementById('discord') || {}).value || '',
                nom: (document.getElementById('nom') || {}).value || '',
                prenom: (document.getElementById('prenom') || {}).value || '',
                age: (document.getElementById('age') || {}).value || '',
                pole: (document.getElementById('pole') || {}).value || '',
                disponibilites: (document.getElementById('disponibilites') || {}).value || '',
                experience: (document.getElementById('experience') || {}).value || '',
                motivation: (document.getElementById('motivation') || {}).value || '',
                civil_email: civil.email,
                civil_nom: civil.nom,
                civil_prenom: civil.prenom,
            };
            try {
                const res = await fetch('api/candidatures', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                    body: JSON.stringify(payload),
                });
                const data = await safeReadJson(res);
                if (!res.ok) {
                    showAlert(alertEl, 'err', data.error || 'Envoi impossible. Réessayez plus tard.');
                    return;
                }
                const ref = data.reference || '';
                showAlert(
                    alertEl,
                    'ok',
                    `Candidature enregistrée. Référence : ${ref}. Vous pouvez suivre votre dossier depuis l’espace candidat.`
                );
                form.reset();
            } catch {
                showAlert(alertEl, 'err', 'Impossible de joindre le serveur.');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = prev || 'Envoyer la candidature';
                }
            }
        });
    }

    const loginForm = document.getElementById('candidat-login-form');
    const loginSection = document.getElementById('candidat-login-section');
    const dossierSection = document.getElementById('candidat-dossier-section');
    const logoutBtn = document.getElementById('candidat-logout-btn');

    const fillDossier = (c) => {
        const st = document.getElementById('dossier-statut');
        if (st) {
            st.textContent = statutLabel(c.statut);
            st.classList.remove('candidat-badge--pending', 'candidat-badge--ok', 'candidat-badge--no');
            const x = String(c.statut || '');
            if (x === 'acceptee') st.classList.add('candidat-badge--ok');
            else if (x === 'refusee') st.classList.add('candidat-badge--no');
            else st.classList.add('candidat-badge--pending');
        }
        const set = (id, v) => {
            const n = document.getElementById(id);
            if (n) n.textContent = v == null || v === '' ? '—' : String(v);
        };
        set('dossier-reference', c.reference);
        set('dossier-date', formatIsoDate(c.created_at));
        set('dossier-discord', c.discord);
        set('dossier-identite', `${c.prenom || ''} ${c.nom || ''}`.trim());
        set('dossier-age', c.age);
        set('dossier-dispos', c.disponibilites);
        set('dossier-exp', c.experience);
        set('dossier-motivation', c.motivation);
        loadCandidatRecrutMsgs();
    };

    const chatList = document.getElementById('recrut-chat-list');
    const chatInput = document.getElementById('recrut-chat-input');
    const chatSend = document.getElementById('recrut-chat-send');
    const chatRefresh = document.getElementById('recrut-chat-refresh');

    function renderCandidatRecrutMsgs(msgs) {
        if (!chatList) return;
        chatList.innerHTML = '';
        if (!msgs || !msgs.length) {
            const p = document.createElement('p');
            p.className = 'recrut-chat-empty';
            p.textContent =
                'Aucun message pour le moment. Écrivez à la Direction ci-dessous (réponse sous quelques délais ouvrés).';
            chatList.appendChild(p);
            return;
        }
        msgs.forEach((m) => {
            const wrap = document.createElement('div');
            const dir = (m.from || '') === 'direction';
            wrap.className = dir ? 'recrut-msg recrut-msg--direction' : 'recrut-msg recrut-msg--candidate';
            const meta = document.createElement('div');
            meta.className = 'recrut-msg-meta';
            meta.textContent = dir
                ? `${formatIsoDate(m.created_at)} · Recrutement${m.author ? ' (' + String(m.author) + ')' : ''}`
                : `${formatIsoDate(m.created_at)} · Vous`;
            const body = document.createElement('div');
            body.className = 'recrut-msg-body';
            body.style.whiteSpace = 'pre-wrap';
            body.textContent = m.body || '';
            wrap.appendChild(meta);
            wrap.appendChild(body);
            chatList.appendChild(wrap);
        });
        chatList.scrollTop = chatList.scrollHeight;
    }

    async function loadCandidatRecrutMsgs() {
        if (!chatList || !dossierSection || dossierSection.hidden) return;
        try {
            const res = await fetch('api/recrutement-messages/as-candidat', {
                credentials: 'same-origin',
            });
            const data = await safeReadJson(res);
            if (!res.ok) return;
            renderCandidatRecrutMsgs(Array.isArray(data.messages) ? data.messages : []);
        } catch {
            /* ignoré si hors session */
        }
    }

    async function refreshDossier() {
        clearAlert(alertEl);
        // Nouveau : utilise le compte civil connecté
        const civilRaw = localStorage.getItem('pm_civil_session');
        let civil = null; try{ civil = civilRaw ? JSON.parse(civilRaw) : null; }catch(e){}
        const notLoggedEl = document.getElementById('espace-civil-not-logged');
        const loggedEl = document.getElementById('espace-civil-logged');
        const emailEl = document.getElementById('espace-civil-email');
        if (!civil || !civil.email) {
            if (notLoggedEl) notLoggedEl.style.display = 'block';
            if (loggedEl) loggedEl.style.display = 'none';
            if (loginSection) loginSection.hidden = false;
            if (dossierSection) dossierSection.hidden = true;
            return;
        }
        if (emailEl) emailEl.textContent = civil.email;
        if (notLoggedEl) notLoggedEl.style.display = 'none';
        if (loggedEl) loggedEl.style.display = 'block';
        try {
            const res = await fetch('api/candidatures/mine?email=' + encodeURIComponent(civil.email), { credentials: 'same-origin' });
            const data = await safeReadJson(res);
            if (!res.ok || !data || !data.ok || !data.candidature) {
                if (loginSection) loginSection.hidden = false;
                if (dossierSection) dossierSection.hidden = true;
                showAlert(alertEl, 'err', data.error || 'Aucune candidature trouvée pour ce compte. Déposez une candidature d\'abord.');
                return;
            }
            if (loginSection) loginSection.hidden = true;
            if (dossierSection) dossierSection.hidden = false;
            fillDossier(data.candidature);
        } catch {
            if (loginSection) loginSection.hidden = false;
            if (dossierSection) dossierSection.hidden = true;
        }
    }

    if (loginForm && loginSection && dossierSection) {
        refreshDossier();
        // Ancien formulaire caché : on le garde pour compatibilité mais il redirige vers le compte civil
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await refreshDossier();
        });
        // Recharge quand le compte civil change
        window.addEventListener('storage', (e)=>{
            if(e.key==='pm_civil_session') refreshDossier();
        });
        // Bouton de rafraichissement manuel si on a ajouté un bouton
        const refreshBtn = document.getElementById('espace-civil-refresh');
        if(refreshBtn) refreshBtn.addEventListener('click', refreshDossier);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            clearAlert(alertEl);
            try {
                await fetch('api/candidatures/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                    body: '{}',
                });
            } catch {
                /* ignore */
            }
            if (loginSection) loginSection.hidden = false;
            if (dossierSection) dossierSection.hidden = true;
            if (chatList) chatList.innerHTML = '';
            if (chatInput) chatInput.value = '';
        });
    }

    if (chatSend && chatInput) {
        chatSend.addEventListener('click', async () => {
            const text = String(chatInput.value || '').trim();
            if (!text) {
                showAlert(alertEl, 'err', 'Écrivez un message avant envoi.');
                return;
            }
            chatSend.disabled = true;
            const prevBtn = chatSend.textContent;
            chatSend.textContent = 'Envoi…';
            try {
                const res = await fetch('api/recrutement-messages/as-candidat', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                    body: JSON.stringify({ text }),
                });
                const data = await safeReadJson(res);
                if (!res.ok) {
                    showAlert(alertEl, 'err', data.error || 'Envoi impossible.');
                    return;
                }
                chatInput.value = '';
                clearAlert(alertEl);
                await loadCandidatRecrutMsgs();
            } catch {
                showAlert(alertEl, 'err', 'Erreur réseau.');
            } finally {
                chatSend.disabled = false;
                chatSend.textContent = prevBtn || 'Envoyer';
            }
        });
    }

    if (chatRefresh) {
        chatRefresh.addEventListener('click', () => loadCandidatRecrutMsgs());
    }
});
