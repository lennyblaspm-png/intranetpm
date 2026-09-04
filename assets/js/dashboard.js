// Proxy: queue calls to __pmLoadSection until real impl is ready

(function () {

    var _pending = null;

    var _impl = null;

    window.__pmLoadSection = function (section) {

        if (_impl) {

            _impl(section);

        } else {

            _pending = section;

        }

    };

    window.__pmExposeLoadSection = function (fn) {

        _impl = fn;

        if (_pending) {

            _impl(_pending);

            _pending = null;

        }

    };

})();

document.addEventListener('DOMContentLoaded', async () => {

    // Timeout de sécurité : ne pas bloquer le dashboard si l'API ne répond pas

    try{

        await Promise.race([

            window.__pmStorageReady,

            new Promise((_,rej)=> setTimeout(()=>rej(new Error('storage timeout')), 3500))

        ]);

    }catch(e){

        console.warn('[PM DEBUG] StorageReady timeout ou erreur, passage en mode public', e && e.message);

    }

    console.info('[PM DEBUG] Dashboard init');

    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    let isPublicMode = false;

    if (!currentUser) {
        // Tenter de restaurer la session depuis le backup localStorage
        try {
            const backupRaw = localStorage.getItem('PM_INTRANET_BACKUP_STORE');
            if (backupRaw) {
                const backupData = JSON.parse(backupRaw);
                const accountsRaw = backupData.PM_INTRANET_OFFICIAL_ACCOUNTS;
                const accounts = typeof accountsRaw === 'string' ? JSON.parse(accountsRaw) : (accountsRaw || []);
                // Restaurer le dernier compte utilisé (stocké au logout ou à la connexion)
                const lastRio = localStorage.getItem('PM_LAST_RIO');
                if (lastRio && Array.isArray(accounts)) {
                    const found = accounts.find(a => a.rio && a.rio.toLowerCase() === lastRio.toLowerCase());
                    if (found) {
                        currentUser = Object.assign({}, found);
                        delete currentUser.password;
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                        console.info('[PM DEBUG] Session restaurée depuis localStorage:', currentUser.rio, currentUser.prenom);
                    }
                }
                // Si pas de dernier RIO, prendre le premier compte
                if (!currentUser && Array.isArray(accounts) && accounts.length > 0) {
                    currentUser = Object.assign({}, accounts[0]);
                    delete currentUser.password;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.info('[PM DEBUG] Session auto-restaurée (premier compte):', currentUser.rio, currentUser.prenom);
                }
            }
        } catch(e) {
            console.warn('[PM DEBUG] Erreur restauration session', e);
        }
    }

    if (!currentUser) {
        console.warn('[PM DEBUG] Aucun utilisateur en sessionStorage -- mode public (accueil seul)');
        isPublicMode = true;
        currentUser = { prenom: 'Invité', nom: '', grade: '', role: 'Public', rio: 'public', specialites: [], phone: '', webhookUrl: '' };
    } else {
        console.info('[PM DEBUG] Utilisateur connecté:', currentUser.rio, currentUser.prenom);
    }

    window.__pmIsPublicMode = isPublicMode;

 // --- CONFIGURATION CENTRALISÉE ---

    const STORAGE_KEY = 'PM_INTRANET_OFFICIAL_ACCOUNTS';

    const DISPATCH_KEY = 'PM_INTRANET_DISPATCHS';

    const ANNONCES_KEY = 'PM_INTRANET_ANNONCES';

    const SERVICE_KEY = 'PM_INTRANET_SERVICE_LOGS';

    const MESSAGES_KEY = 'PM_INTRANET_MESSAGES';

    const SALON_DISCUSSION_KEY = 'PM_INTRANET_SALON_DISCUSSION';

    const SALON_MAX_MESSAGES = 500;

    const SALON_MSG_MAX_LEN = 4000;

    const CONGES_KEY = 'PM_INTRANET_CONGES';

    const LOGS_KEY = 'PM_INTRANET_LOGS';

    const FLEET_KEY = 'PM_INTRANET_FLEET';

    const VESTIAIRE_KEY = 'PM_INTRANET_VESTIAIRE';

    const RAPPORTS_KEY = 'PM_INTRANET_RAPPORTS';

    const TAJ_KEY = 'PM_INTRANET_TAJ';

    const FPR_KEY = 'PM_INTRANET_FPR';

    const SPECIALITES_KEY = 'PM_INTRANET_SPECIALITES';

    const INTERVENTION_KEY = 'PM_INTRANET_INTERVENTIONS';

    const TENUE_KEY = 'PM_INTRANET_TENUES';

    const CONTACT_KEY = 'PM_INTRANET_CONTACTS';

    const CONTACT_REMOVED_KEY = 'PM_INTRANET_CONTACTS_REMOVED';

    const PVI_BROUILLONS_KEY = 'PM_INTRANET_PVI_BROUILLONS';

    const WEBHOOKS_KEY = 'PM_INTRANET_WEBHOOKS';
    const NOTIFS_KEY = 'PM_INTRANET_NOTIFICATIONS';
    // --- Notifications + Webhooks ---
    function pmSendWebhook(type, payload){
        try{
            const url = pmGetWebhookUrl(type);
            if(!url) return;
            fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).catch(()=>{});
        }catch(e){}
    }
    function pmAddNotification(type, title, body){
        try{
            const raw=pmLocalStorage.getItem(NOTIFS_KEY)||'[]';
            let arr=[];
            try{ arr=JSON.parse(raw); }catch(e){ arr=[]; }
            if(!Array.isArray(arr)) arr=[];
            const n={ id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), type, title, body: String(body||'').slice(0,300), timestamp: new Date().toISOString(), author: `${currentUser.prenom||''} ${currentUser.nom||''}`.trim(), rio: String(currentUser.rio||''), readBy: [] };
            arr.unshift(n);
            if(arr.length>120) arr=arr.slice(0,120);
            pmLocalStorage.setItem(NOTIFS_KEY, JSON.stringify(arr));
                        if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
// webhook
            pmSendWebhook(type, { content: `**${title}**\n${body}\n_Auteur: ${n.author} (${n.rio})_`, embeds: [{ title, description: body, color: 5814783, author:{name:n.author}, timestamp: n.timestamp }] });
            refreshNotifBadge();
        }catch(e){}
    }
    function pmGetNotifs(){ try{ const r=pmLocalStorage.getItem(NOTIFS_KEY)||'[]'; const a=JSON.parse(r); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
    function pmUnreadCount(){
        const arr=pmGetNotifs();
        const rio=String(currentUser.rio||'');
        return arr.filter(n=> !(n.readBy||[]).includes(rio)).length;
    }
    function refreshNotifBadge(){
        const b=document.getElementById('notif-badge');
        const c=pmUnreadCount();
        if(!b) return;
        if(c>0){ b.textContent=c>99?'99+':String(c); b.style.display='flex'; } else { b.style.display='none'; }
    }
    function renderNotifPanel(){
        const list=document.getElementById('notif-list');
        if(!list) return;
        const arr=pmGetNotifs();
        const rio=String(currentUser.rio||'');
        if(arr.length===0){ list.innerHTML='<div style="padding:20px; text-align:center; color:#94a3b8; font-size:13px;"><i class="fas fa-bell-slash" style="display:block; font-size:20px; margin-bottom:8px;"></i>Aucune notification</div>'; return; }
        list.innerHTML=arr.slice(0,40).map(n=>{
            const isRead=(n.readBy||[]).includes(rio);
            const d=new Date(n.timestamp).toLocaleString('fr-FR');
            const bg=isRead?'#fff':'#f0f7ff';
            const icon={ 'prise-service':'fa-clock', 'rapport':'fa-file-lines', 'taj':'fa-fingerprint', 'fpr':'fa-id-card-clip', 'incident':'fa-triangle-exclamation' }[n.type]||'fa-bell';
            return `<div style="display:flex; gap:10px; padding:10px 12px; border-bottom:1px solid #f1f5f9; background:${bg};">
                <div style="width:32px; height:32px; border-radius:8px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class="fas ${icon}" style="font-size:13px;"></i></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; font-size:12.5px; color:#0f172a;">${escapeHtml(n.title)}</div>
                    <div style="font-size:12px; color:#475569; margin-top:2px; white-space:pre-wrap; word-break:break-word;">${escapeHtml(n.body)}</div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${escapeHtml(n.author)} • ${escapeHtml(d)}</div>
                </div>
                ${isRead?'':`<span style="width:8px; height:8px; background:#2563eb; border-radius:50%; flex-shrink:0; margin-top:6px;"></span>`}
            </div>`;
        }).join('');
    }
    function markAllNotifsRead(){
        const arr=pmGetNotifs();
        const rio=String(currentUser.rio||'');
        let ch=false;
        arr.forEach(n=>{ if(!(n.readBy||[]).includes(rio)){ n.readBy=n.readBy||[]; n.readBy.push(rio); ch=true; } });
        if(ch){ pmLocalStorage.setItem(NOTIFS_KEY, JSON.stringify(arr));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
refreshNotifBadge(); renderNotifPanel(); }
    }


    function pmGetWebhookUrl(type){

        try{

            const raw = pmLocalStorage.getItem(WEBHOOKS_KEY);

            if(!raw) return '';

            const m = JSON.parse(raw);

            if(m && typeof m==='object' && !Array.isArray(m) && m[type]) return String(m[type]).trim();

            if(Array.isArray(m)){

                const f=m.find(w=> String(w.id||w.nom||'').toLowerCase()===String(type).toLowerCase());

                if(f) return String(f.url||'').trim();

                const f2=m.find(w=> String(w.nom||'').toLowerCase().includes(String(type).toLowerCase()));

                if(f2) return String(f2.url||'').trim();

            }

        }catch(e){}

        return '';

    }

    window.__pmGetWebhookUrl = pmGetWebhookUrl;

    /** Inventaire des données métier synchronisées (pmLocalStorage -- `api/storage` -- `data/store.json`). */ const PM_ALL_INTRANET_STORAGE_KEYS =

        [

            STORAGE_KEY,

            DISPATCH_KEY,

            ANNONCES_KEY,

            SERVICE_KEY,

            MESSAGES_KEY,

            SALON_DISCUSSION_KEY,

            CONGES_KEY,

            LOGS_KEY,

            FLEET_KEY,

            VESTIAIRE_KEY,

            RAPPORTS_KEY,

            TAJ_KEY,

            FPR_KEY,

            SPECIALITES_KEY,

            INTERVENTION_KEY,

            TENUE_KEY,

            CONTACT_KEY,

            CONTACT_REMOVED_KEY,

            PVI_BROUILLONS_KEY,

            WEBHOOKS_KEY,
            NOTIFS_KEY,

            'PM_INTRANET_CONTRAST',

            'PM_INTRANET_DISPATCH_ANNONCE',

        ];

    const RESERVE_ROLE_STYLES = {

        BMU: { bg: '#0d6efd', fg: '#ffffff' },

        GSI: { bg: '#198754', fg: '#ffffff' },

        DIRECTION: { bg: '#4fc3f7', fg: '#062033' },

        VICTOR: { bg: '#fd7e14', fg: '#ffffff' },

        OPJ: { bg: '#1e40af', fg: '#ffffff' },

        APJA: { bg: '#7c3aed', fg: '#ffffff' },

        LBD: { bg: '#dc2626', fg: '#ffffff' },

        VTT: { bg: '#059669', fg: '#ffffff' },

        FLUVIALE: { bg: '#0284c7', fg: '#ffffff' },

        CYNOPHILE: { bg: '#a16207', fg: '#ffffff' },

    };

    function generateUniqueRIO() {
        try{
            const data = pmLocalStorage.getItem(STORAGE_KEY);
            let all=[];
            try{ all = data ? JSON.parse(data) : []; }catch(e){ all=[]; }
            if(!Array.isArray(all)) all=[];
            const existing = new Set(all.map(u=>String(u.rio||'').trim()).filter(Boolean));
            for(let i=0;i<200;i++){
                const rio = String(Math.floor(1000000 + Math.random()*9000000)); // 7 chiffres, 1xxx000-9xxx999
                if(!existing.has(rio)) return rio;
            }
        }catch(e){ console.warn('[PM] generateUniqueRIO fallback',e); }
        // fallback garanti 7 chiffres
        let fallback = String(Date.now()).slice(-7);
        while(fallback.length<7) fallback='1'+fallback;
        return fallback;
    }
    window.generateUniqueRIO = generateUniqueRIO;

    const getReserveStyle = (role) => {

        const key = String(role || '')

            .trim()

            .toUpperCase();

        return RESERVE_ROLE_STYLES[key] || { bg: '#6c757d', fg: '#ffffff' };

    };

    /** Spécialités d'affectation : jusqu'à 2 valeurs dans user.specialites (double spécialité MAJ086). */ const PM_ACCOUNT_SPEC_META =

        {

            GSI: "GSI -- Groupe de soutien et d'intervention",

            BMU: 'BMU -- Brigade Motorisée Urbaine',

            VTT: 'Brigade VTT',

            FLUVIALE: 'Brigade Fluviale',

            CYNOPHILE: 'Brigade CYNOPHILE',

        };

    const PM_ACCOUNT_SPEC_CODES = ['GSI','BMU','VTT','FLUVIALE','CYNOPHILE'];

    const PM_ACCOUNT_SPEC_SELECT_HTML = [

        '<option value="">Aucune</option>',

        ...PM_ACCOUNT_SPEC_CODES.map(c=>`<option value="${c}">${PM_ACCOUNT_SPEC_META[c]}</option>`),

    ].join('');

    /** Grades police municipale : ordre hiérarchique décroissant (du plus haut au plus bas). */ const PM_GRADE_DEFINITIONS =

        [

            { code: 'DPM', label: 'Directeur (DPM)' },

            { code: 'DRA', label: 'Directeur Adjoint (DRA)' },

            { code: 'CDP', label: 'Chef de Police (CDP)' },

            { code: 'CDS-1', label: 'Chef de Service de 1re cl. (CDS-1)' },

            { code: 'CDS-2', label: 'Chef de Service de 2e cl. (CDS-2)' },

            { code: 'CDS', label: 'Chef de Service (CDS)' },

            { code: 'CDS-S', label: 'Chef de Service Stagiaire (CDS-S)' },

            { code: 'BCP', label: 'Brigadier Chef Principal (BCP)' },

            { code: 'BCH', label: 'Brigadier Chef (BCH)' },

            { code: 'BGD', label: 'Brigadier (BGD)' },

            { code: 'GRP', label: 'Gardien Principal (GRP)' },

            { code: 'GRT', label: 'Gardien Titulaire (GRT)' },

            { code: 'STG', label: 'Gardien Stagiaire (STG)' },

        ];

    const PM_GRADE_ORDER = PM_GRADE_DEFINITIONS.map((g) => g.code);

    const PM_GRADE_CODES = new Set(PM_GRADE_ORDER);

    const PM_GRADE_OPTIONS_HTML = PM_GRADE_DEFINITIONS.map(

        (g) => `<option value="${g.code}">${g.label}</option>`,

    ).join('');

    /** DPM, DRA, CDP + rôle Direction -- recrutement, messagerie recrutement, gestion des comptes (pas CDS-STG même Direction ; pas Effectif même si grade triade mal saisi). */ const PM_DIRECTION_LEAD_GRADES =

        new Set(['DPM', 'DRA', 'CDP']);

    function normalizePmLeadGrade(grade) {

        return String(grade == null ? '' : grade)

            .replace(/\u00a0/g, ' ')

            .trim()

            .toUpperCase();

    }

    /** Indice pour tri : 0 = grade le plus élevé ; grades inconnus en dernier. */ function pmGradeSortIndex(

        grade,

    ) {

        const g = normalizePmLeadGrade(grade);

        const i = PM_GRADE_ORDER.indexOf(g);

        return i === -1 ? PM_GRADE_ORDER.length : i;

    }

    function compareUsersByGradeThenName(a, b) {

        const d = pmGradeSortIndex(a.grade) - pmGradeSortIndex(b.grade);

        if (d !== 0) return d;

        const ln = String(a.nom || '').localeCompare(

            String(b.nom || ''),

            'fr',

            {

                sensitivity: 'base',

            },

        );

        if (ln !== 0) return ln;

        return String(a.prenom || '').localeCompare(

            String(b.prenom || ''),

            'fr',

            {

                sensitivity: 'base',

            },

        );

    }

    function isPmTriadeGrade(user) {

        if (!user) return false;

        return PM_DIRECTION_LEAD_GRADES.has(normalizePmLeadGrade(user.grade));

    }

    function isPmTriadeLead(user) {

        if (!user) return false;

        if (String(user.role || '').trim() !== 'Direction') return false;

        return isPmTriadeGrade(user);

    }

    /** Rôle Direction ou grade DPM / DRA / CDP -- messagerie intranet, dispatch, congés, fiches, etc. */ function isPmDirectionMember(

        user,

    ) {

        if (!user) return false;

        if (String(user.role || '').trim() === 'Direction') return true;

        return isPmTriadeGrade(user);

    }

    function isRecruteur(user) {

        if (!user) return false;

        return user.isRecruteur === true;

    }

    function normalizeAccountSpecialiteCode(user) {

        const raw = user && Array.isArray(user.specialites) ? user.specialites : [];

        for (const s of raw) {

            const t = String(s).trim(); if (!t) continue;

            const up = t.toUpperCase();

            if (PM_ACCOUNT_SPEC_CODES.includes(up)) return up;

            if (up === 'BMO') return 'BMU';

        }

        for (const s of raw) {

            const t = String(s).trim(); if (!t) continue;

            const up = t.toUpperCase();

            if (up.includes('SOUTIEN') && up.includes('INTERVENT')) return 'GSI';

            if (up.includes('BRIGADE') && up.includes('MOTOR')) return 'BMU';

            if (up.includes('VTT')) return 'VTT';

            if (up.includes('FLUVIAL')) return 'FLUVIALE';

            if (up.includes('CYNOPHILE') || up.includes('CYN')) return 'CYNOPHILE';

        }

        return '';

    }

    function normalizeAccountSpecialiteCodes(user) {

        const raw = user && Array.isArray(user.specialites) ? user.specialites : [];

        const out = []; const seen=new Set();

        for(const s of raw){ const t=String(s).trim(); if(!t) continue; const up=t.toUpperCase();

            let code=null;

            if(PM_ACCOUNT_SPEC_CODES.includes(up)) code=up;

            else if(up==='BMO') code='BMU';

            else if(up.includes('SOUTIEN')&&up.includes('INTERVENT')) code='GSI';

            else if(up.includes('BRIGADE')&&up.includes('MOTOR')) code='BMU';

            else if(up.includes('VTT')) code='VTT';

            else if(up.includes('FLUVIAL')) code='FLUVIALE';

            else if(up.includes('CYNOPHILE')||up.includes('CYN')) code='CYNOPHILE';

            if(code && !seen.has(code)){ out.push(code); seen.add(code); }

            if(out.length>=2) break;

        }

        return out;

    }

    function formatAccountSpecialiteLabel(user) {

        const codes = normalizeAccountSpecialiteCodes(user);

        if(codes.length){ return codes.map(c=>PM_ACCOUNT_SPEC_META[c]||c).join(' + '); }

        const raw = user && Array.isArray(user.specialites) ? user.specialites : [];

        for (const s of raw) { const t = String(s).trim(); if (t) return t; }

        return '--';

    }

    /** Options du select " Ma fiche " (double spécialité MAJ086). */ function htmlAgentSpecialiteAccountSelectOptions(user){

        const codes = normalizeAccountSpecialiteCodes(user);

        const all = [{v:'',label:'Aucune'}, ...PM_ACCOUNT_SPEC_CODES.map(c=>({v:c,label:PM_ACCOUNT_SPEC_META[c]})) ];

        return all.map(o=>`<option value="${escapeHtml(o.v)}"${codes.includes(o.v)?' selected':''}>${escapeHtml(o.label)}</option>`).join('');

    }

    function htmlAgentSpecialiteCheckboxes(user){

        const codes = normalizeAccountSpecialiteCodes(user);

        return PM_ACCOUNT_SPEC_CODES.map(c=>`<label style="display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:${codes.includes(c)?'#eff6ff':'#fff'}"><input type="checkbox" value="${c}" ${codes.includes(c)?'checked':''} class="spec-cb" style="accent-color:#2563eb;"> ${escapeHtml(PM_ACCOUNT_SPEC_META[c])}</label>`).join('');

    }

    /** Options communes pour les selects " indicatif radio " (PVI, prise de vacation--) */ const OPTIONS_SELECT_INDICATIF_RADIO_HTML =

        [

            '<option value="">-- Choisir un indicatif --</option>',

            '<option value="CSU">CSU</option>',

            '<option value="VICTOR-01">VICTOR-01</option>',

            '<option value="VICTOR-02">VICTOR-02</option>',

            '<option value="VICTOR-03">VICTOR-03</option>',

            '<option value="VICTOR-04">VICTOR-04</option>',

            '<option value="MIKE-ALPHA">MIKE-ALPHA</option>',

            '<option value="MIKE-BRAVO">MIKE-BRAVO</option>',

            '<option value="GSI-01">GSI-01</option>',

            '<option value="GSI-02">GSI-02</option>',

        ].join(''); // Fonction utilitaire pour ajouter un log

    const addLog = (action, cible = '') => {

        const logs = JSON.parse(pmLocalStorage.getItem(LOGS_KEY) || '[]');

        logs.push({

            id: Date.now(),

            timestamp: new Date().toISOString(),

            auteur: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

            action: action,

            cible: cible,

        });

        pmLocalStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(-100)));

                if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
};

    const refreshCurrentUser = () => {

        const data = pmLocalStorage.getItem(STORAGE_KEY);

        if (!data) return currentUser;

        const allUsers = JSON.parse(data);

        const updatedUser = allUsers.find(

            (u) =>

                u.rio.toString().toLowerCase() ===

                currentUser.rio.toString().toLowerCase(),

        );

        if (updatedUser) {

            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

            return updatedUser;

        }

        return currentUser;

    };

    const readApiJson = async (res) => {

        const raw = await res.text();

        if (!raw) return {};

        try {

            return JSON.parse(raw);

        } catch {

            return {};

        }

    };

    function setRecrutCandidatureNavBadgeCount(n) {

        const el = document.getElementById('nav-recrut-cand-badge');

        const topEl = document.getElementById('top-tab-recrut-badge');

        if (!el && !topEl) return;

        if (!isPmTriadeLead(refreshCurrentUser())) {

            if (el) {

                el.hidden = true;

                el.textContent = '';

            }

            if (topEl) {

                topEl.hidden = true;

                topEl.textContent = '';

            }

            return;

        }

        const count = Math.max(0, Number(n) || 0);

        const text = count <= 0 ? '' : count > 99 ? '99+' : String(count);

        const hidden = count <= 0;

        if (el) {

            el.textContent = text;

            el.hidden = hidden;

        }

        if (topEl) {

            topEl.textContent = text;

            topEl.hidden = hidden;

        }

    }

    function refreshReceptionBadge(){
        try{
            const badge=document.getElementById('notif-reception-badge');
            if(!badge) return;
            if(!isPmTriadeLead(refreshCurrentUser())){ badge.hidden=true; return; }
            const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]');
            const incidents=all.filter(r=>r.type==='incident');
            const readRaw=pmLocalStorage.getItem('RECEPTION_INCIDENT_READ')||'[]';
            let readSet=new Set();
            try{ readSet=new Set(JSON.parse(readRaw).map(String)); }catch(e){}
            const unread=incidents.filter(r=>!readSet.has(String(r.id))).length;
            if(unread>0){ badge.textContent=unread>99?'99+':String(unread); badge.hidden=false; } else badge.hidden=true;
        }catch(e){}
    }

    async function refreshRecrutCandidatureNavBadge() {

        if (!isPmTriadeLead(refreshCurrentUser())) {

            setRecrutCandidatureNavBadgeCount(0);

            return;

        }

        const el = document.getElementById('nav-recrut-cand-badge');

        if (!el) return;

        try {

            const res = await fetch('api/candidatures/list', {

                credentials: 'same-origin',

            });

            const data = await readApiJson(res);

            if (!res.ok) {

                el.hidden = true;

                return;

            }

            const n = Array.isArray(data.items) ? data.items.length : 0;

            setRecrutCandidatureNavBadgeCount(n);

        } catch {

            el.hidden = true;

        }

    }

    /** Recharge le store serveur dans le miroir local, puis resynchronise léutilisateur courant (fiches agent partagées). */ async function pullServerStoreMirror() {

        if (typeof window.pmReloadStorageFromServer === 'function') {

            await window.pmReloadStorageFromServer();

        }

        currentUser = refreshCurrentUser();

        updateUI(currentUser);

    } // Initialize UI with user info

    const headerUserName = document.getElementById('header-user-name');

    const dropdownUserName = document.getElementById('dropdown-user-name');

    const dropdownUserRole = document.getElementById('dropdown-user-role');

    const directionItems = document.querySelectorAll('.direction-only');

    const recrutementItems = document.querySelectorAll('.recrutement-only');

    const effectifItems = document.querySelectorAll('.effectif-only');

    const updateUI = (user) => {

        if (headerUserName)

            headerUserName.textContent = `${user.prenom} ${user.nom}`;

        const hdrPhoto=document.getElementById('header-user-photo');
        const hdrIcon=document.getElementById('header-user-icon');
        if(hdrPhoto && hdrIcon){
            if(user.photo && String(user.photo).startsWith('data:image')){ hdrPhoto.src=user.photo; hdrPhoto.style.display='block'; hdrIcon.style.display='none'; } else { hdrPhoto.style.display='none'; hdrIcon.style.display=''; }
        }

        if (dropdownUserName)

            dropdownUserName.textContent = `${user.prenom} ${user.nom}`;

        if (dropdownUserRole) {

            const roleLabel = isPmDirectionMember(user) ? 'DIRECTION' : user.role.toUpperCase();

            const roleStyle = getReserveStyle(user.role);

            dropdownUserRole.textContent = roleLabel;

            dropdownUserRole.style.cssText = `background:${roleStyle.bg};color:${roleStyle.fg};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;display:inline-block;`;

        }

        if (isPmTriadeLead(user)) {

            directionItems.forEach((item) => {

                if (item.classList.contains('nav-item')) {

                    item.style.setProperty('display', 'grid', 'important');

                } else if (item.classList.contains('top-tab-group')) {

                    item.style.setProperty('display', 'flex', 'important');

                } else if (item.classList.contains('top-tab-item')) {

                    item.style.setProperty(

                        'display',

                        'inline-flex',

                        'important',

                    );

                } else {

                    item.style.setProperty('display', 'block', 'important');

                }

            });

            void refreshRecrutCandidatureNavBadge();
            refreshReceptionBadge();

        } else {

            directionItems.forEach((item) => {

                item.style.setProperty('display', 'none', 'important');

            });

            setRecrutCandidatureNavBadgeCount(0);

        }

        if (isRecruteur(user)) {

            recrutementItems.forEach((item) => {

                if (item.classList.contains('cat-nav-item')) {

                    item.style.setProperty('display', 'block', 'important');

                } else {

                    item.style.setProperty('display', 'block', 'important');

                }

            });

            void refreshRecrutCandidatureNavBadge();

        } else if (!isPmTriadeLead(user)) {

            recrutementItems.forEach((item) => {

                item.style.setProperty('display', 'none', 'important');

            });

        }

        if (user.role === 'Effectif' && !isPmDirectionMember(user)) {

            effectifItems.forEach((item) => {

                if (item.classList.contains('nav-item')) {

                    item.style.setProperty('display', 'grid', 'important');

                } else {

                    item.style.removeProperty('display');

                }

            });

        } else {

            effectifItems.forEach((item) => {

                item.style.setProperty('display', 'none', 'important');

            });

        }

    };

    currentUser = refreshCurrentUser();

    updateUI(currentUser);
    // Gestion recherche depuis l'accueil public (pm_pending_search)
    (function(){
        try{
            var q=sessionStorage.getItem('pm_pending_search');
            if(q){
                sessionStorage.removeItem('pm_pending_search');
                setTimeout(function(){
                    if(window.__pmGoSection) window.__pmGoSection('recherche');
                    setTimeout(function(){
                        var inp=document.getElementById('search-effectif') || document.getElementById('nav-search-input');
                        if(inp){ inp.value=q; inp.dispatchEvent(new Event('input', {bubbles:true})); inp.focus(); }
                        var inp2=document.getElementById('nav-search-input');
                        if(inp2) inp2.value=q;
                    },600);
                },800);
            }
        }catch(e){}
    })();
    // --- Recherche globale (header) ---
    (function(){
        const inp=document.getElementById('nav-search-input');
        if(!inp || inp.dataset.bound) return;
        inp.dataset.bound='1';
        inp.addEventListener('input', function(e){
            const q=e.target.value.toLowerCase().trim();
            // Si on est sur une page avec des cartes fiches, filtrer directement
            const cards=document.querySelectorAll('.pm-fiche-vue, .effectif-card, .fiche-agent-toutes-card, .reception-card, .taj-card, .fpr-card, .pm-news-item');
            if(cards.length>0 && q){
                let any=false;
                cards.forEach(function(c){
                    const data=(c.dataset.search || c.textContent || '').toLowerCase();
                    const show=data.includes(q);
                    c.style.display=show?'':'none';
                    if(show) any=true;
                });
                return;
            }
            // Sinon, si vide, réafficher tout
            if(!q){
                document.querySelectorAll('.pm-fiche-vue, .effectif-card, .reception-card').forEach(function(c){ c.style.display=''; });
            }
        });
        inp.addEventListener('keydown', function(e){
            if(e.key==='Enter'){
                const q=inp.value.trim();
                if(!q) return;
                e.preventDefault();
                // Redirige vers Recherche Effectif avec la query
                if(window.__pmGoSection){
                    window.__pmGoSection('recherche');
                    setTimeout(function(){
                        const ri=document.getElementById('search-effectif');
                        if(ri){ ri.value=q; ri.dispatchEvent(new Event('input', {bubbles:true})); ri.focus(); }
                        const gi=document.getElementById('search-fiches-tout-personnel');
                        if(gi){ gi.value=q; gi.dispatchEvent(new Event('input', {bubbles:true})); }
                    },500);
                }
            }
        });
        // Loupe cliquable
        const icon=inp.previousElementSibling;
        if(icon && icon.classList.contains('fa-search')){
            icon.style.cursor='pointer';
            icon.addEventListener('click', function(){ inp.focus(); if(inp.value.trim()) inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'})); });
        }
    })();
    // Notifications — init bell + polling
    try{
        refreshNotifBadge(); refreshReceptionBadge();
        const bell=document.getElementById('notif-bell-btn');
        const panel=document.getElementById('notif-panel');
        const markBtn=document.getElementById('notif-mark-read');
        if(bell && panel){
            bell.addEventListener('click', (e)=>{ e.stopPropagation(); const v=panel.style.display==='none' || !panel.style.display || panel.style.display===''; panel.style.display=v?'block':'none'; if(v) renderNotifPanel(); });
            document.addEventListener('click', (e)=>{ if(!e.target.closest('#notif-bell-btn') && !e.target.closest('#notif-panel')) panel.style.display='none'; });
        }
        if(markBtn) markBtn.addEventListener('click', ()=> markAllNotifsRead());
        setInterval(()=>{ refreshNotifBadge(); refreshReceptionBadge(); }, 15000);
        document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ refreshNotifBadge(); refreshReceptionBadge(); } });
    }catch(e){}
    // Contrast Mode

    const CONTRAST_KEY = 'PM_INTRANET_CONTRAST';

    const setContrastMode = (mode) => {

        document.body.classList.remove('contrast-dark', 'contrast-white');

        if (mode === 'dark') {

            document.body.classList.add('contrast-dark');

        } else if (mode === 'white') {

            document.body.classList.add('contrast-white');

        } // Update button states

        document

            .querySelectorAll('.contrast-btn')

            .forEach((btn) => btn.classList.remove('active'));

        document.getElementById(`contrast-${mode}`)?.classList.add('active');

        pmLocalStorage.setItem(CONTRAST_KEY, mode);

    }; // Load saved contrast mode

    const savedContrast = pmLocalStorage.getItem(CONTRAST_KEY) || 'original';

    setContrastMode(savedContrast); // Contrast button event listeners

    document

        .getElementById('contrast-original')

        ?.addEventListener('click', () => setContrastMode('original'));

    document

        .getElementById('contrast-dark')

        ?.addEventListener('click', () => setContrastMode('dark'));

    document

        .getElementById('contrast-white')

        ?.addEventListener('click', () => setContrastMode('white'));

    if (typeof window.pmFlushPendingStorage === 'function') {

        document.addEventListener('visibilitychange', () => {

            if (document.visibilityState === 'hidden') {

                void window.pmFlushPendingStorage();

            }

        });

        setInterval(() => {

            void window.pmFlushPendingStorage();

        }, 180000);

    } // Profile Menu Toggle

    const profileBtn = document.getElementById('profile-toggle-btn');

    const profileMenu = document.getElementById('profile-menu');

    if (profileBtn && profileMenu) {

        profileBtn.addEventListener('click', (e) => {

            e.stopPropagation();

            profileMenu.style.display =

                profileMenu.style.display === 'none' ? 'block' : 'none';

        });

        window.addEventListener('click', () => {

            profileMenu.style.display = 'none';

        });

        profileMenu.addEventListener('click', (e) => {

            e.stopPropagation();

        });

    } // Logout Logic

    const headerLogoutBtn = document.getElementById('header-logout-btn');

    if (headerLogoutBtn) {

        headerLogoutBtn.addEventListener('click', async () => {

            console.info('[PM DEBUG] Logout demandé');

            if (typeof window.pmFlushPendingStorage === 'function') {

                await window.pmFlushPendingStorage();

            }

            fetch('api/auth/logout', {

                method: 'POST',

                credentials: 'same-origin',

            }).finally(() => {

                sessionStorage.removeItem('currentUser');

                console.info(

                    '[PM DEBUG] Session vidée, redirection index.php',

                );

                window.location.href = 'index.php';

            });

        });

    }

    const navItems = document.querySelectorAll('.nav-item');

    const contentArea = document.getElementById('content-area');

    if (contentArea) {

        contentArea.addEventListener('change', async (e) => {

            const t = e.target;

            if (

                !t ||

                !t.classList ||

                !t.classList.contains('recrutement-statut-select')

            )

                return;

            const id = t.getAttribute('data-candidature-id');

            const statut = t.value;

            const prev = t.getAttribute('data-prev-statut') || statut;

            try {

                const res = await fetch('api/candidatures/update', {

                    method: 'PATCH',

                    credentials: 'same-origin',

                    headers: {

                        'Content-Type': 'application/json; charset=UTF-8',

                    },

                    body: JSON.stringify({ id, statut }),

                });

                const data = await readApiJson(res);

                if (!res.ok) {

                    alert(data.error || 'Mise à jour impossible.');

                    t.value = prev;

                    return;

                }

                t.setAttribute('data-prev-statut', statut);

                addLog(

                    'Recrutement -- statut candidature',

                    `${id.slice(0, 12)}-- -- ${statut}`,

                );

            } catch {

                alert('Erreur réseau.');

                t.value = prev;

            }

        });

    }

    navItems.forEach((item) => {

        item.addEventListener('click', () => {

            navItems.forEach((i) => i.classList.remove('active'));

            item.classList.add('active');

            syncTopTabBar(item.dataset.section);

            void loadSection(item.dataset.section);

        });

    }); // -- Top Tab Bar sync --

    const topTabItems = document.querySelectorAll('.top-tab-item');

    function syncTopTabBar(section) {

        topTabItems.forEach((t) =>

            t.classList.toggle('active', t.dataset.section === section),

        );

    }

    topTabItems.forEach((tab) => {

        tab.addEventListener('click', () => {

            const section = tab.dataset.section;

            navItems.forEach((i) => i.classList.remove('active'));

            const sidebarTarget = document.querySelector(

                `.nav-item[data-section="${section}"]`,

            );

            if (sidebarTarget) sidebarTarget.classList.add('active');

            syncTopTabBar(section);

            void loadSection(section);

        });

    });

    document.addEventListener('visibilitychange', () => {

        if (document.visibilityState !== 'visible') return;

        const sec = window.__pmCurrentSection;

        if (sec === 'recherche' || sec === 'fiche-agent') {

            void syncPersonnelFichesGridsFromServer().catch(() => {});

        }

        if (sec === 'salon') {

            void refreshSalonFromServer().catch(() => {});

        }

        if (isPmTriadeLead(refreshCurrentUser())) {

            void refreshRecrutCandidatureNavBadge();

        }

    });

    /** Rafraîchissement automatique des grilles de fiches (tous les effectifs voient les mêmes données serveur). */ let pmFichesAutoSyncInterval =

        null;

    function clearPmFichesAutoSyncInterval() {

        if (pmFichesAutoSyncInterval != null) {

            clearInterval(pmFichesAutoSyncInterval);

            pmFichesAutoSyncInterval = null;

        }

    }

    function startPmFichesAutoSyncInterval() {

        clearPmFichesAutoSyncInterval();

        pmFichesAutoSyncInterval = setInterval(() => {

            if (document.visibilityState !== 'visible') return;

            const sec = window.__pmCurrentSection;

            if (sec !== 'recherche' && sec !== 'fiche-agent') return;

            void syncPersonnelFichesGridsFromServer().catch(() => {});

        }, 90000);

    }

    let pmSalonSyncInterval = null;

    function clearPmSalonSyncInterval() {

        if (pmSalonSyncInterval != null) {

            clearInterval(pmSalonSyncInterval);

            pmSalonSyncInterval = null;

        }

    }

    function startPmSalonSyncInterval() {

        clearPmSalonSyncInterval();

        pmSalonSyncInterval = setInterval(() => {

            if (document.visibilityState !== 'visible') return;

            if (window.__pmCurrentSection !== 'salon') return;

            void refreshSalonFromServer().catch(() => {});

        }, 15000);

    } // Section Loading Router

    const PM_DIRECTION_ONLY_SECTIONS = new Set([

        'recrutement',

        'messagerie-recrutement',

        'gestion-comptes',

        'liste-rio',

        'gestion-webhooks',

        'generer-code-integration',

        'resultats-formulaires',

        'generer-code-examen',

        'resultats-examens',

        'reception-rapports',

    ]);

    const PM_RECRUTEMENT_SECTIONS = new Set([

        'recrutement',

        'messagerie-recrutement',

        'generer-code-integration',

        'resultats-formulaires',

    ]);

    async function loadSection(section) {

        // Mode public : seul accueil accessible sans login

        if (window.__pmIsPublicMode && section !== 'accueil') {

            contentArea.innerHTML = `<div class="card" style="text-align:center; padding:40px 20px;"><h2 class="card-title" style="justify-content:center;"><i class="fas fa-lock"></i> Connexion requise</h2><p style="color:#666; margin:12px 0 20px;">La section <b>${escapeHtml(section)}</b> nécessite une connexion agent.<br>Connectez-vous via l'Espace Agent.</p><button class="btn btn-primary" onclick="try{sessionStorage.setItem('pm_open_login','1');}catch(e){} window.location.href='index.php';"><i class="fas fa-shield-halved"></i> Se connecter</button> <button class="btn btn-secondary" onclick="window.__pmGoSection('accueil')" style="margin-left:8px;">Rester à l\'accueil</button></div>`;

            window.__pmCurrentSection = section;

            syncTopTabBar(section);

            return;

        }

        currentUser = refreshCurrentUser();

        if (

            PM_DIRECTION_ONLY_SECTIONS.has(section) &&

            !isPmTriadeLead(currentUser) &&

            !(PM_RECRUTEMENT_SECTIONS.has(section) && isRecruteur(currentUser))

        ) {

            section = 'accueil';

            navItems.forEach((i) => i.classList.remove('active'));

            const acc = document.querySelector(

                '.nav-item[data-section="accueil"]',

            );

            if (acc) acc.classList.add('active');

            syncTopTabBar(section);

        }

        syncTopTabBar(section);

        switch (section) {

            case 'accueil':

                renderAccueil();

                break;

            case 'fiche-agent':

                await renderFicheAgent();

                break;

            case 'parametres':

                await renderParametres();

                break;

            case 'dispatch':

                renderDispatch();

                break;

            case 'salon':

                await renderSalonDiscussion();

                break;

            case 'annonces':

                renderAnnonces();

                break;

            case 'conges':

                renderConges();

                break;

            case 'vestiaire':

                renderVestiaire();

                break;

            case 'messagerie':

                renderMessagerie();

                break;

            case 'rapports':

                renderRapports();

                break;

            case 'recherche':

                await renderRecherche();

                break;

            case 'parc-auto':

                renderParcAuto();

                break;

            case 'specialites':

                renderSpecialites();

                break;

            case 'recrutement':

                renderRecrutement();

                break;

            case 'messagerie-recrutement':

                renderMessagerieRecrutement();

                break;

            case 'gestion-comptes':

                renderGestionComptes();

                break;

            case 'liste-rio':

                renderListeRIO();

                break;

            case 'gestion-webhooks':

                renderGestionWebhooks();

                break;

            case 'generer-code-integration':

                renderGenererCodeIntegration();

                break;

            case 'resultats-formulaires':

                renderResultatsFormulaires();

                break;

            case 'commencer-examen':

                renderCommencerExamen();

                break;

            case 'generer-code-examen':

                renderGenererCodeExamen();

                break;

            case 'resultats-examens':

                renderResultatsExamens();

                break;

            case 'pointeuse':

                renderPointeuse();

                break;

            case 'prise-service':

                renderPriseService();

                break;

            case 'fin-service':

                renderFinService();

                break;

            case 'rapport-interpellation':

                renderRapportInterpellation();

                break;

            case 'rapport-saisie':

                renderRapportSaisie();

                break;

            case 'rapport-tir':

                renderRapportTir();

                break;

            case 'rapport-incident':

                renderRapportIncident();

                break;

            case 'reception-rapports':

                renderReceptionRapports();

                break;

            case 'trame-stagiaire':

                renderTrameStagiaire();

                break;

            case 'taj':

                renderTAJ();

                break;

            case 'fpr':

                renderFPR();

                break;

            default:

                renderAccueil();

        }

        window.__pmCurrentSection = section;

        clearPmFichesAutoSyncInterval();

        clearPmSalonSyncInterval();

        if (section === 'fiche-agent' || section === 'recherche') {

            startPmFichesAutoSyncInterval();

        }

        if (section === 'salon') {

            startPmSalonSyncInterval();

        }

    }

    window.__pmExposeLoadSection(loadSection); // --- Render Functions ---

    function renderAccueil() {

        const u = refreshCurrentUser();

        const roleStyle = getReserveStyle(u.role);

        const gradeLabel = String(u.grade || '').trim();

        const nomComplet = `${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}`;

        contentArea.innerHTML = `

            <div class="pm-hero">

                <div class="pm-hero-content">

                    <span class="pm-hero-tag">Bienvenue sur l\'intranet</span>

                    <h1>Bienvenue dans votre<br>espace professionnel</h1>

                    <div class="pm-hero-btns">

                        <button type="button" class="pm-hero-btn pm-hero-btn-primary" onclick="window.__pmGoSection('pointeuse')"><i class="fas fa-stopwatch"></i> Pointeuse</button>

                        <button type="button" class="pm-hero-btn pm-hero-btn-outline" onclick="window.__pmGoSection('annonces')"><i class="fas fa-newspaper"></i> Actualités</button>

                    </div>

                </div>

            </div>

            <p class="pm-section-title">Accès rapide</p>

            <div class="pm-quick-grid">

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('fiche-agent')">

                    <div class="pm-quick-card-icon" style="background:#eff6ff;color:#2563eb;"><i class="fas fa-user-tie"></i></div>

                    <h3>Ma Fiche Agent</h3>

                    <p>Consultez et gérez vos informations personnelles.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('dispatch')">

                    <div class="pm-quick-card-icon" style="background:#f0fdf4;color:#16a34a;"><i class="fas fa-list-check"></i></div>

                    <h3>Dispatch</h3>

                    <p>Consultez les dispatchs et affectations du jour.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('salon')">

                    <div class="pm-quick-card-icon" style="background:#fef3c7;color:#d97706;"><i class="fas fa-comments"></i></div>

                    <h3>Salon Discussion</h3>

                    <p>échangez avec vos collègues en temps réel.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('messagerie')">

                    <div class="pm-quick-card-icon" style="background:#fce7f3;color:#db2777;"><i class="fas fa-envelope"></i></div>

                    <h3>Messagerie</h3>

                    <p>Consultez vos messages et notifications.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('taj')">

                    <div class="pm-quick-card-icon" style="background:#fef2f2;color:#dc2626;"><i class="fas fa-fingerprint"></i></div>

                    <h3>TAJ</h3>

                    <p>Gestion des dossiers et traces judiciaires.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

                <div class="pm-quick-card" role="button" tabindex="0" onclick="window.__pmGoSection('recherche')">

                    <div class="pm-quick-card-icon" style="background:#f5f3ff;color:#7c3aed;"><i class="fas fa-users-viewfinder"></i></div>

                    <h3>Recherche Effectif</h3>

                    <p>Recherchez un collègue dans l\'organigramme.</p>

                    <span class="pm-quick-card-arrow"><i class="fas fa-arrow-right"></i></span>

                </div>

            </div>

            <div class="pm-bottom-grid">

                <div class="pm-section-card">

                    <div class="pm-section-card-header">

                        <h2><i class="fas fa-fingerprint" style="margin-right:8px;"></i>TAJ RÉCENT</h2>

                        <div style="display:flex; gap:8px; align-items:center;"><a href="#" onclick="window.__pmGoSection('taj');return false;">Voir tous <i class="fas fa-arrow-right"></i></a></div>

                    </div>

                    <div id="acc-taj-list">
                        ${(()=>{ const list=JSON.parse(pmLocalStorage.getItem(TAJ_KEY)||'[]'); if(list.length===0) return `<div class="pm-news-item"><div class="pm-news-thumb"><i class="fas fa-fingerprint"></i></div><div class="pm-news-info"><p class="pm-news-title">Aucun TAJ récent</p><p class="pm-news-desc">Aucun dossier TAJ n'a été enregistré.</p><p class="pm-news-date">${new Date().toLocaleDateString('fr-FR')}</p></div></div>`; return list.slice().reverse().slice(0,3).map(r=>`<div class="pm-news-item"><div class="pm-news-thumb"><i class="fas fa-fingerprint"></i></div><div class="pm-news-info"><p class="pm-news-title">${escapeHtml(r.person||r.tajId||'Dossier TAJ')}</p><p class="pm-news-desc">${escapeHtml((r.place||r.context||r.facts||'').slice(0,90))}</p><p class="pm-news-date">${r.timestamp? new Date(r.timestamp).toLocaleDateString('fr-FR'):''} ${r.tajId? '• '+escapeHtml(r.tajId):''}</p></div></div>`).join(''); })()}
                    </div>
                </div>

                <div class="pm-section-card" style="border:2px solid #dc2626;">
                    <div class="pm-section-card-header" style="border-bottom:2px solid #fecaca;">
                        <h2 style="color:#dc2626;"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>FPR ACTIF</h2>
                        <a href="#" onclick="window.__pmGoSection('fpr');return false;" style="color:#dc2626;">Voir tous <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div id="acc-fpr-actif-list">
                        ${(()=>{ try{ const raw=pmLocalStorage.getItem(FPR_KEY)||'[]'; const list=JSON.parse(raw); const actifs=list.filter(f=>{ const s=String(f.status||'').toUpperCase(); return s.includes('ACTIF') && !s.includes('INACTIF'); }); if(actifs.length===0) return `<div style="text-align:center; padding:20px; color:#16a34a;"><i class="fas fa-check-circle" style="font-size:24px; margin-bottom:8px; display:block;"></i>Aucun FPR actif</div>`; return actifs.slice(0,4).map(f=>`<div class="pm-doc-item" style="border-left:3px solid #dc2626; padding-left:10px; background:#fef2f2; border-radius:6px; margin-bottom:8px;"><div class="pm-doc-icon" style="background:#dc2626;color:#fff;"><i class="fas fa-id-card-clip"></i></div><div class="pm-doc-info"><p class="pm-doc-name" style="color:#991b1b;">${escapeHtml(f.person||'Inconnu')} — <span style="color:#dc2626; font-weight:800;">${escapeHtml(f.status||'FPR ACTIF')}</span></p><p class="pm-doc-meta" style="color:#7f1d1d;">${escapeHtml((f.facts||'').slice(0,60))} ${f.dob? '• '+escapeHtml(f.dob):''}</p></div></div>`).join('') + (actifs.length>4? `<div style="text-align:center; margin-top:8px;"><a href="#" onclick="window.__pmGoSection('fpr');return false;" style="font-size:12px; color:#dc2626; font-weight:700;">+ ${actifs.length-4} autres FPR actifs →</a></div>` : ''); }catch(e){ return `<div style="color:#991b1b; padding:12px;">Erreur chargement FPR</div>`; } })()}
                    </div>
                </div>

                <div class="pm-section-card">

                    <div class="pm-section-card-header">

                        <h2><i class="fas fa-link" style="margin-right:8px;"></i>Liens utiles</h2>

                    </div>

                    <a class="pm-link-item" href="https://www.interior.gouv.fr" target="_blank" rel="noopener">

                        <div class="pm-link-icon" style="background:#eff6ff;color:#2563eb;"><i class="fas fa-landmark"></i></div>

                        <span class="pm-link-label">Ministère de l'Intérieur</span>

                        <i class="fas fa-arrow-right pm-link-arrow"></i>

                    </a>

                    <a class="pm-link-item" href="https://www.cnfpt.fr" target="_blank" rel="noopener">

                        <div class="pm-link-icon" style="background:#f0fdf4;color:#16a34a;"><i class="fas fa-building-columns"></i></div>

                        <span class="pm-link-label">CNFPT</span>

                        <i class="fas fa-arrow-right pm-link-arrow"></i>

                    </a>

                    <a class="pm-link-item" href="https://www.service-public.fr" target="_blank" rel="noopener">

                        <div class="pm-link-icon" style="background:#f5f3ff;color:#7c3aed;"><i class="fas fa-globe"></i></div>

                        <span class="pm-link-label">Service-Public.fr</span>

                        <i class="fas fa-arrow-right pm-link-arrow"></i>

                    </a>

                    <a class="pm-link-item" href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener">

                        <div class="pm-link-icon" style="background:#fef3c7;color:#d97706;"><i class="fas fa-scale-balanced"></i></div>

                        <span class="pm-link-label">Légifrance</span>

                        <i class="fas fa-arrow-right pm-link-arrow"></i>

                    </a>

                    <a class="pm-link-item" href="https://meteofrance.com" target="_blank" rel="noopener">

                        <div class="pm-link-icon" style="background:#e0f2fe;color:#0284c7;"><i class="fas fa-cloud-sun"></i></div>

                        <span class="pm-link-label">Météo France</span>

                        <i class="fas fa-arrow-right pm-link-arrow"></i>

                    </a>

                </div>

            </div>

            <div class="pm-bottom-grid" style="margin-top:14px;">

                <div class="pm-section-card">

                    <div class="pm-section-card-header"><h2><i class="fas fa-stopwatch" style="margin-right:8px;"></i>Service -- Pointeuse</h2><a href="#" onclick="window.__pmGoSection('pointeuse');return false;">Ouvrir <i class="fas fa-arrow-right"></i></a></div>

                    <div style="font-size:13px; color:#475569;">Prise / Pause / Fin de service -- suivi serveur. Dernier pointage: ${(()=>{ const ls=JSON.parse(pmLocalStorage.getItem(SERVICE_KEY)||'[]'); const my=ls.filter(l=>String(l.rio)===String(u.rio)).sort((a,b)=> new Date(b.timestamp)-new Date(a.timestamp))[0]; if(!my) return 'Aucun'; const s=my.start? new Date(my.start).toLocaleString('fr-FR'):''; const e=my.end? new Date(my.end).toLocaleString('fr-FR'):'en cours'; return s+' -> '+e; })()}</div>

                    <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="window.__pmGoSection('pointeuse')"><i class="fas fa-stopwatch"></i> Pointeuse</button>

                </div>

                <div class="pm-section-card">

                    <div class="pm-section-card-header"><h2><i class="fas fa-address-book" style="margin-right:8px;"></i>Annuaire -- Numéros utiles</h2><a href="#" onclick="window.__pmGoSection('recherche');return false;">Annuaire <i class="fas fa-arrow-right"></i></a></div>

                    <div style="font-size:12px; line-height:1.8;">

                        <div><b>PC Radio:</b> 01 23 45 67 89 -- <b>CSU:</b> 01 98 76 54 32</div>

                        <div><b>OPJ de permanence:</b> via Messagerie</div>

                        <div><b>Parc Auto:</b> voir onglet Ressources -> Parc</div>

                        <div style="margin-top:6px; color:#64748b;">Recherche effectif pour téléphones individuels.</div>

                    </div>

                </div>

                <div class="pm-section-card">

                    <div class="pm-section-card-header"><h2><i class="fas fa-life-ring" style="margin-right:8px;"></i>Aide -- Liens</h2></div>

                    <div style="display:flex; flex-direction:column; gap:6px; font-size:13px;">

                        <a href="https://discord.gg/bqQAEGXpwF" target="_blank" style="color:#2563eb; font-weight:600;"><i class="fab fa-discord"></i> Discord 93RP</a>

                        <a href="https://www.legifrance.gouv.fr" target="_blank" style="color:#334155;">Légifrance</a>

                        <a href="https://www.service-public.fr" target="_blank" style="color:#334155;">Service-Public.fr</a>

                        <a href="#" onclick="window.__pmGoSection('messagerie');return false;" style="color:#334155;">Contacter la Direction</a>

                    </div>

                </div>

            </div>

            ${isPmDirectionMember(u) ? `

            <div class="card" style="margin-top:8px;">

                <h2 class="card-title"><i class="fas fa-database"></i> Enregistrement des données</h2>

                <p style="color:#666;font-size:13px;margin:0 0 12px;">${PM_ALL_INTRANET_STORAGE_KEYS.length} types de données suivis. Forcer l\'envoi ou télécharger une copie JSON.</p>

                <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">

                    <button type="button" class="btn btn-primary" id="pm-backup-save-server"><i class="fas fa-cloud-arrow-up"></i> Enregistrer</button>

                    <button type="button" class="btn btn-secondary" id="pm-backup-download-json"><i class="fas fa-download"></i> Télécharger JSON</button>

                    <button type="button" class="btn btn-secondary" id="pm-backup-import-trigger"><i class="fas fa-upload"></i> Importer</button>

                    <input type="file" id="pm-backup-import-file" accept=".json" style="display:none;">

                    <span id="pm-backup-status" style="font-size:12px;margin-left:8px;"></span>

                </div>

            </div>` : ''}

            <div class="pm-footer">

                -- ${new Date().getFullYear()} Police Municipale ? Tous droits réservés

            </div>`;

        if (isPmDirectionMember(u)) {

            const statusEl = document.getElementById('pm-backup-status');

            const setBackupStatus = (msg, ok) => {

                if (!statusEl) return;

                statusEl.textContent = msg;

                statusEl.style.color = ok ? '#198754' : '#c0392b';

            };

            document.getElementById('pm-backup-save-server')?.addEventListener('click', async () => {

                setBackupStatus('Enregistrement?', true);

                try {

                    if (typeof window.pmFlushPendingStorage === 'function') await window.pmFlushPendingStorage();

                    setBackupStatus('Données envoyées.', true);

                } catch { setBackupStatus('--chec.', false); }

            });

            document.getElementById('pm-backup-download-json')?.addEventListener('click', async () => {

                try {

                    if (typeof window.pmFlushPendingStorage === 'function') await window.pmFlushPendingStorage();

                    const res = await fetch('api/storage', { credentials: 'same-origin' });

                    if (!res.ok) throw new Error(String(res.status));

                    const snap = await res.json();

                    const iso = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

                    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json;charset=utf-8' });

                    const a = document.createElement('a');

                    a.href = URL.createObjectURL(blob);

                    a.download = `intranet_pm_sauvegarde_${iso}.json`;

                    a.click();

                    URL.revokeObjectURL(a.href);

                    setBackupStatus('Copie téléchargée.', true);

                } catch { setBackupStatus('Erreur.', false); }

            });

            document.getElementById('pm-backup-import-trigger')?.addEventListener('click', () => {

                document.getElementById('pm-backup-import-file')?.click();

            });

            document.getElementById('pm-backup-import-file')?.addEventListener('change', (e) => {

                const input = e.target;

                const file = input.files && input.files[0];

                input.value = '';

                if (!file) return;

                if (!confirm('Remplacer les données du serveur ?')) return;

                const reader = new FileReader();

                reader.onload = async (ev) => {

                    try {

                        const parsed = JSON.parse(String(ev.target.result || ''));

                        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad');

                        let count = 0;

                        for (const [k, v] of Object.entries(parsed)) {

                            if (typeof k !== 'string' || typeof v !== 'string') continue;

                            pmLocalStorage.setItem(k, v);

                            count++;

                        }

                        if (typeof window.pmFlushPendingStorage === 'function') await window.pmFlushPendingStorage();

                        addLog('Import sauvegarde', `${count} clés`);

                        alert('Import terminé. Rechargement?');

                        window.location.reload();

                    } catch { alert('Fichier invalide.'); }

                };

                reader.readAsText(file);

            });

        }

    }

    function escapeHtml(s) {

        if (s == null) return '';

        return String(s)

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/"/g, '&quot;')

            .replace(/'/g, '&#39;');

    }

    /** Slug CSS à partir du grade (1er mot) pour colorer les cartes fiche / effectif. */ function pmFicheVueGradeClassSuffix(

        u,

    ) {

        const raw = String(u?.grade ?? '')

            .replace(/\u00a0/g, ' ')

            .trim();

        const first = raw.split(/\s+/)[0] || 'autre';

        const slug = first.toLowerCase().replace(/[^a-z0-9-]/g, '');

        return slug || 'autre';

    }

    function pmFicheVueGradeClassAttr(u) {

        return `pm-fiche-vue--grade-${pmFicheVueGradeClassSuffix(u)}`;

    }

    /** Contenu interne de la fiche vue (sans conteneur). */ function renderAgentFicheVueInnerHtml(

        u,

    ) {

        const title =

            `${escapeHtml(u.grade || '')} ${escapeHtml(u.nom || '')} ${escapeHtml(u.prenom || '')}`.trim();

        const rio = escapeHtml(String(u.rio ?? '--'));

        const role = escapeHtml(String(u.role ?? '--'));

        const phone = escapeHtml(u.phone || '--');

        const spec = escapeHtml(formatAccountSpecialiteLabel(u));

        const ar = escapeHtml(u.serieArmeService || '--');

        const pie = escapeHtml(u.seriePie || '--');

        const lbd = escapeHtml(u.serieLbd || '--');

        return `                <div class="pm-fiche-vue__title">${title}</div>                <div class="pm-fiche-vue__row"><span class="pm-fiche-vue__label">RIO&nbsp;:</span> <span class="pm-fiche-vue__value">${rio}</span></div>                <div class="pm-fiche-vue__row"><span class="pm-fiche-vue__label">Rôle&nbsp;:</span> <span class="pm-fiche-vue__value">${role}</span></div>                <div class="pm-fiche-vue__row"><span class="pm-fiche-vue__label">Téléphone&nbsp;:</span> <span class="pm-fiche-vue__value">${phone}</span></div>                <div class="pm-fiche-vue__row"><span class="pm-fiche-vue__label pm-fiche-vue__label--speciale">Spécialité&nbsp;:</span> <span class="pm-fiche-vue__value">${spec}</span></div>                <div class="pm-fiche-vue__equip pm-fiche-vue__equip--first">Arme (SP 22)</div>                <div class="pm-fiche-vue__serial">${ar}</div>                <div class="pm-fiche-vue__equip">PIE</div>                <div class="pm-fiche-vue__serial">${pie}</div>                <div class="pm-fiche-vue__equip">LBD</div>                <div class="pm-fiche-vue__serial">${lbd}</div>`;

    }

    /** Carte lecture seule (grade, RIO, rôle, téléphone, spécialité GSI/BMU, équipement) -- même rendu partout. */ function renderAgentFicheVueCardHtml(

        u,

    ) {

        return `<div class="pm-fiche-vue ${pmFicheVueGradeClassAttr(u)}">${renderAgentFicheVueInnerHtml(u)}</div>`;

    }

    /** Grille de cartes fiche (recherche effectif + vue direction sur " Ma fiche "). */ function htmlEffectifFichesGrid(

        allUsers,

        cardExtraClass = 'effectif-card',

    ) {

        const extra = cardExtraClass ? ` ${cardExtraClass}` : '';

        return [...allUsers]

            .sort(compareUsersByGradeThenName)

            .map((user) => {

                const ds = String(

                    `${user.grade || ''} ${user.nom} ${user.prenom} ${user.rio} ${user.phone || ''} ${formatAccountSpecialiteLabel(user)} ${user.serieArmeService || ''} ${user.seriePie || ''} ${user.serieLbd || ''}`,

                )

                    .toLowerCase()

                    .replace(/"/g, '');

                return `<div class="pm-fiche-vue ${pmFicheVueGradeClassAttr(user)}${extra}" data-search="${ds}">${renderAgentFicheVueInnerHtml(user)}</div>`;

            })

            .join('');

    }

    function bindEffectifFichesSearch(inputId, cardSelector) {

        const input = document.getElementById(inputId);

        if (!input) return;

        input.oninput = (e) => {

            const searchTerm = e.target.value.toLowerCase();

            document.querySelectorAll(cardSelector).forEach((card) => {

                const searchData = card.dataset.search || '';

                card.style.display = searchData.includes(searchTerm)

                    ? 'block'

                    : 'none';

            });

        };

    }

    /** Recharge le serveur et met à jour les grilles de fiches visibles (sans recharger toute la page " Ma fiche "). */ async function syncPersonnelFichesGridsFromServer() {

        await pullServerStoreMirror();

        const u = refreshCurrentUser();

        currentUser = u;

        const data = pmLocalStorage.getItem(STORAGE_KEY);

        const allUsers = data ? JSON.parse(data) : [];

        const wrap = document.querySelector('.pm-fiche-vue-wrap');

        if (wrap && window.__pmCurrentSection === 'fiche-agent') {

            wrap.innerHTML = renderAgentFicheVueCardHtml(u);

        }

        const gMa = document.getElementById('fiches-tout-personnel-grid');

        if (gMa) {

            gMa.innerHTML = htmlEffectifFichesGrid(

                allUsers,

                'effectif-card fiche-agent-toutes-card',

            );

            bindEffectifFichesSearch(

                'search-fiches-tout-personnel',

                '.fiche-agent-toutes-card',

            );

        }

        const gRe = document.querySelector('#effectif-list .pm-fiche-vue-grid');

        if (gRe) {

            gRe.innerHTML = htmlEffectifFichesGrid(allUsers);

            bindEffectifFichesSearch('search-effectif', '.effectif-card');

        }

    }

    async function onSyncFichesButtonClick(btn) {

        if (!btn) return;

        btn.disabled = true;

        try {

            await syncPersonnelFichesGridsFromServer();

        } catch (err) {

            console.error('[PM] sync fiches', err);

            alert(

                'Synchronisation impossible pour le moment. Vérifiez la connexion au serveur.',

            );

        } finally {

            btn.disabled = false;

        }

    }

    async function renderFicheAgent() {

        contentArea.innerHTML = `            <div class="card">                <p class="dash-welcome-sub" style="margin:0 0 12px;">Synchronisation des fiches avec le serveur...</p>            </div>`;

        await pullServerStoreMirror();

        const u = refreshCurrentUser();

        currentUser = u;

        const canEditSpecialiteMaFiche =

            String(u.role || '').trim() === 'Direction';

        const dataAll = pmLocalStorage.getItem(STORAGE_KEY);

        const allUsers = dataAll ? JSON.parse(dataAll) : [];

        const introFiches =

            'Votre fiche est éditable ci-dessous. <strong>Tout l\'effectif et la direction</strong> voient la même grille des fiches du personnel (lecture seule), alignée sur le serveur -- vous pouvez aussi utiliser <strong>Recherche effectif</strong> dans le menu.';

        const blocToutesFiches = `                <hr style="margin: 28px 0;">                <h3 class="card-title">Toutes les fiches agent</h3>                <p class="dash-welcome-sub" style="margin-top:0;">Fiches lecture seule pour tout le monde -- recherche par nom, RIO, téléphone, <strong>spécialité</strong> ou n° de série. Synchronisation automatique environ toutes les 90&nbsp;s sur cette page.</p>                <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; margin-bottom:14px; align-items:center;">                    <button type="button" class="btn btn-secondary btn-sm" id="btn-sync-fiches-ma-fiche" title="Récupérer les dernières fiches depuis le serveur">                        <i class="fas fa-arrows-rotate" aria-hidden="true"></i> Synchroniser les fiches                    </button>                    <input type="text" id="search-fiches-tout-personnel" placeholder="Rechercher dans les fiches..." style="padding: 8px 12px; border:1px solid var(--pm-border); border-radius:4px; width:min(100%, 320px);">                </div>                <div class="pm-fiche-vue-grid" id="fiches-tout-personnel-grid">                    ${htmlEffectifFichesGrid(allUsers, 'effectif-card fiche-agent-toutes-card')}                </div>`;

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title">Ma Fiche Agent</h2>                <p class="dash-welcome-sub" style="margin-top:0;">${introFiches}</p>                <div class="pm-fiche-vue-wrap" style="margin-bottom:22px;">                    ${renderAgentFicheVueCardHtml(u)}                </div>
                <div style="display:flex; gap:16px; align-items:center; margin-bottom:18px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
                    <div id="agent-photo-preview" style="width:80px; height:80px; border-radius:50%; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; border:2px solid #cbd5e1; flex-shrink:0;">
                        ${u.photo ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-user" style="color:#94a3b8; font-size:32px;"></i>`}
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:700; font-size:13px;">Photo de profil</label>
                        <input type="file" id="agent-photo" accept="image/*" style="margin-top:6px; display:block;">
                        <div style="font-size:11px; color:#64748b; margin-top:4px;">JPG/PNG max 2 Mo — visible par tout l'effectif</div>
                        <button type="button" id="btn-update-photo" class="btn btn-primary btn-sm" style="margin-top:8px;"><i class="fas fa-camera"></i> Enregistrer photo</button>
                        <button type="button" id="btn-remove-photo" class="btn btn-secondary btn-sm" style="margin-top:8px; margin-left:6px;">Supprimer</button>
                    </div>
                </div>
                <div class="form-grid">                    <div class="form-group">                        <label>RIO</label>                        <input type="text" value="${u.rio}" disabled>                    </div>                    <div class="form-group">                        <label>Nom</label>                        <input type="text" value="${u.nom}" disabled>                    </div>                    <div class="form-group">                        <label>Prénom</label>                        <input type="text" value="${u.prenom}" disabled>                    </div>                    <div class="form-group">                        <label>Grade</label>                        <input type="text" value="${u.grade}" disabled>                    </div>                    <div class="form-group">                        <label>Téléphone</label>                        <input type="text" id="agent-phone" value="${escapeHtml(u.phone || '')}" placeholder="Ex: 06 00 00 00 00">                    </div>                    <div class="form-group" style="grid-column:1/-1;">

                        ${canEditSpecialiteMaFiche ? `<label class="fiche-agent-label-spec">Spécialités (double spécialité possible -- max 2)</label><div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">${htmlAgentSpecialiteCheckboxes(u)}</div><button type="button" id="btn-update-specialite" class="btn btn-primary btn-sm" style="margin-top:8px;"><i class="fas fa-save"></i> Enregistrer spécialités</button>` : `<label class="fiche-agent-label-spec">Spécialité</label><input type="text" value="${escapeHtml(formatAccountSpecialiteLabel(u))}" disabled>`}

                    </div>



                    <div class="form-group" style="display:none;"><label class="fiche-agent-label-spec" for="agent-specialite">Spécialité legacy</label><select id="agent-specialite" style="display:none;">${htmlAgentSpecialiteAccountSelectOptions(u)}</select>}                    </div>                </div>                <div class="fiche-agent-series" role="group" aria-label="Numéros de série équipement">                    <div class="fiche-agent-serie-block">                        <span class="fiche-agent-serie-label">Numéro Série De Votre Arme De Service&nbsp;: Sig Sauer SP 22</span>                        <input type="text" class="fiche-agent-serie-input" id="agent-serie-arme" value="${escapeHtml(u.serieArmeService || '')}" placeholder="Ex&nbsp;: 992341POL839676" autocomplete="off">                    </div>                    <div class="fiche-agent-serie-block">                        <span class="fiche-agent-serie-label">Numéro Série De Votre PIE&nbsp;: Pistolet A Impulsion Electrique</span>                        <input type="text" class="fiche-agent-serie-input" id="agent-serie-pie" value="${escapeHtml(u.seriePie || '')}" placeholder="Ex&nbsp;: 968885POL917752" autocomplete="off">                    </div>                    <div class="fiche-agent-serie-block">                        <span class="fiche-agent-serie-label">Numéro Série De Votre LBD&nbsp;: Lanceur De Balles De Défense</span>                        <input type="text" class="fiche-agent-serie-input" id="agent-serie-lbd" value="${escapeHtml(u.serieLbd || '')}" placeholder="Numéro de série" autocomplete="off">                    </div>                </div>                <div class="fiche-agent-actions">                    <button type="button" class="btn btn-primary" id="btn-update-series">Enregistrer les numéros de série</button>                    <button type="button" class="btn btn-primary" id="btn-update-phone">Mettre à jour le téléphone</button>                    ${canEditSpecialiteMaFiche ? '<button type="button" class="btn btn-primary" id="btn-update-specialite">Enregistrer ma spécialité</button>' : ''}                </div>                <hr style="margin: 20px 0;">                <h3 class="card-title">Changer le mot de passe</h3>                <form id="change-pwd-form">                    <div class="form-group" style="max-width: 300px;">                        <label>Nouveau mot de passe</label>                        <input type="password" id="new-pwd" required>                    </div>                    <button type="submit" class="btn btn-primary">Mettre à jour le mot de passe</button>                </form>                ${blocToutesFiches}            </div>        `;

        document.getElementById('btn-update-series').onclick = async () => {

            const serieArmeService = document

                .getElementById('agent-serie-arme')

                .value.trim();

            const seriePie = document

                .getElementById('agent-serie-pie')

                .value.trim();

            const serieLbd = document

                .getElementById('agent-serie-lbd')

                .value.trim();

            const data = pmLocalStorage.getItem(STORAGE_KEY);

            let allUsers = data ? JSON.parse(data) : [];

            const index = allUsers.findIndex(

                (x) => x.rio.toString() === currentUser.rio.toString(),

            );

            if (index !== -1) {

                allUsers[index].serieArmeService = serieArmeService;

                allUsers[index].seriePie = seriePie;

                allUsers[index].serieLbd = serieLbd;

                pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));

                            if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser.serieArmeService = serieArmeService;

                currentUser.seriePie = seriePie;

                currentUser.serieLbd = serieLbd;

                sessionStorage.setItem(

                    'currentUser',

                    JSON.stringify(currentUser),

                );

                alert('Numéros de série enregistrés.');

                await syncPersonnelFichesGridsFromServer().catch(() => {});

            }

        };

        document.getElementById('btn-update-phone').onclick = async () => {

            const newPhone = document

                .getElementById('agent-phone')

                .value.trim();

            const data = pmLocalStorage.getItem(STORAGE_KEY);

            let allUsers = data ? JSON.parse(data) : [];

            const index = allUsers.findIndex(

                (u) => u.rio.toString() === currentUser.rio.toString(),

            );

            if (index !== -1) {

                allUsers[index].phone = newPhone;

                pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));

                            if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser.phone = newPhone;

                sessionStorage.setItem(

                    'currentUser',

                    JSON.stringify(currentUser),

                );

                alert('Téléphone mis à jour !');

                await syncPersonnelFichesGridsFromServer().catch(() => {});

            }

        };

        const btnUpdateSpecialite = document.getElementById(

            'btn-update-specialite',

        );

        if (btnUpdateSpecialite) {

            btnUpdateSpecialite.onclick = async () => {

                if (String(currentUser.role || '').trim() !== 'Direction') {

                    alert(

                        'Seuls les comptes avec le rôle Direction peuvent modifier la spécialité ici.',

                    );

                    return;

                }

                // double spécialité MAJ086 : checkboxes (max 2)

                let specialites=[];

                const cbs=document.querySelectorAll('.spec-cb:checked');

                if(cbs.length){ specialites=[...cbs].map(c=>c.value).slice(0,2); }

                else {

                    const sel = document.getElementById('agent-specialite');

                    if (sel) { const raw = String(sel.value || '').trim(); if(raw) specialites=[raw]; }

                }

                if(specialites.length>2) specialites=specialites.slice(0,2);

                const data = pmLocalStorage.getItem(STORAGE_KEY);

                let allUsers = data ? JSON.parse(data) : [];

                const index = allUsers.findIndex(

                    (x) => x.rio.toString() === currentUser.rio.toString(),

                );

                if (index !== -1) {

                    allUsers[index].specialites = specialites;

                    pmLocalStorage.setItem(

                        STORAGE_KEY,

                        JSON.stringify(allUsers),

                    );

                    currentUser.specialites = specialites;

                    sessionStorage.setItem(

                        'currentUser',

                        JSON.stringify(currentUser),

                    );

                    alert('Spécialité(s) enregistrée(s) : '+(specialites.join(' + ')||'Aucune')+'.');

                    await syncPersonnelFichesGridsFromServer().catch(() => {});

                }

            };

        }

        // Webhook MAJ085 - champ dans Ma fiche agent

        // Photo de profil — Ma fiche
        const agentPhotoInput=document.getElementById('agent-photo');
        const agentPhotoPreview=document.getElementById('agent-photo-preview');
        let pendingPhotoDataUrl=null;
        if(agentPhotoInput){
            agentPhotoInput.addEventListener('change', (e)=>{
                const f=e.target.files && e.target.files[0];
                if(!f) return;
                if(f.size>2*1024*1024){ alert('Image trop lourde (max 2 Mo)'); e.target.value=''; return; }
                const fr=new FileReader();
                fr.onload=(ev)=>{ pendingPhotoDataUrl=ev.target.result; if(agentPhotoPreview){ agentPhotoPreview.innerHTML=`<img src="${pendingPhotoDataUrl}" style="width:100%;height:100%;object-fit:cover;">`; } };
                fr.readAsDataURL(f);
            });
        }
        const btnUpdatePhoto=document.getElementById('btn-update-photo');
        if(btnUpdatePhoto){
            btnUpdatePhoto.onclick=async()=>{
                if(!pendingPhotoDataUrl){ alert('Sélectionnez d\'abord une image'); return; }
                const data=pmLocalStorage.getItem(STORAGE_KEY);
                let all= data? JSON.parse(data):[];
                const idx=all.findIndex(x=>String(x.rio)===String(currentUser.rio));
                if(idx!==-1){ all[idx].photo=pendingPhotoDataUrl; pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(all));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser.photo=pendingPhotoDataUrl; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); updateUI(currentUser); alert('Photo enregistrée'); await syncPersonnelFichesGridsFromServer().catch(()=>{}); }
            };
        }
        const btnRemovePhoto=document.getElementById('btn-remove-photo');
        if(btnRemovePhoto){
            btnRemovePhoto.onclick=async()=>{
                pendingPhotoDataUrl=null;
                const data=pmLocalStorage.getItem(STORAGE_KEY);
                let all= data? JSON.parse(data):[];
                const idx=all.findIndex(x=>String(x.rio)===String(currentUser.rio));
                if(idx!==-1){ all[idx].photo=''; pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(all));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser.photo=''; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); if(agentPhotoPreview) agentPhotoPreview.innerHTML=`<i class="fas fa-user" style="color:#94a3b8; font-size:32px;"></i>`; const inp=document.getElementById('agent-photo'); if(inp) inp.value=''; updateUI(currentUser); alert('Photo supprimée'); await syncPersonnelFichesGridsFromServer().catch(()=>{}); }
            };
        }

        document.getElementById('change-pwd-form').onsubmit = (e) => {

            e.preventDefault();

            const newPwd = document.getElementById('new-pwd').value;

            const data = pmLocalStorage.getItem(STORAGE_KEY);

            let allUsers = data ? JSON.parse(data) : [];

            const index = allUsers.findIndex(

                (u) => u.rio.toString() === currentUser.rio.toString(),

            );

            if (index !== -1) {

                allUsers[index].password = newPwd;

                allUsers[index].mustChangePassword = false;

                pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));

                            if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser.password = newPwd;

                currentUser.mustChangePassword = false;

                sessionStorage.setItem(

                    'currentUser',

                    JSON.stringify(currentUser),

                );

                alert('Mot de passe mis à jour !');

            }

        };

        bindEffectifFichesSearch(

            'search-fiches-tout-personnel',

            '.fiche-agent-toutes-card',

        );

        document

            .getElementById('btn-sync-fiches-ma-fiche')

            ?.addEventListener('click', (e) => {

                void onSyncFichesButtonClick(e.currentTarget);

            });

    }

    async function renderParametres(){
        await pullServerStoreMirror();
        const u=refreshCurrentUser();
        currentUser=u;
        contentArea.innerHTML=`            <div class="card" style="max-width:780px;">
                <h2 class="card-title"><i class="fas fa-gear"></i> Paramètres de mon profil</h2>
                <p class="dash-welcome-sub">Modifiez vos informations personnelles. Ces données sont visibles par la Direction et synchronisées sur le serveur.</p>
                <div style="display:grid; grid-template-columns:80px 1fr; gap:18px; margin:18px 0; align-items:start;">
                    <div style="text-align:center;">
                        <div id="param-photo-preview" style="width:80px; height:80px; border-radius:50%; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; border:2px solid #cbd5e1; margin:0 auto;">
                            ${u.photo ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-user" style="color:#94a3b8; font-size:32px;"></i>`}
                        </div>
                        <label for="param-photo" style="display:inline-block; margin-top:8px; font-size:11px; color:#2563eb; cursor:pointer; font-weight:600;">Changer photo</label>
                        <input type="file" id="param-photo" accept="image/*" style="display:none;">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="form-group"><label>RIO</label><input type="text" value="${u.rio}" disabled></div>
                        <div class="form-group"><label>Grade</label><input type="text" value="${escapeHtml(u.grade||'')}" disabled></div>
                        <div class="form-group"><label>Nom</label><input type="text" value="${escapeHtml(u.nom||'')}" disabled></div>
                        <div class="form-group"><label>Prénom</label><input type="text" value="${escapeHtml(u.prenom||'')}" disabled></div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                    <div class="form-group"><label>Téléphone</label><input type="text" id="param-phone" value="${escapeHtml(u.phone||'')}" placeholder="06 00 00 00 00"></div>
                    <div class="form-group"><label>Téléphone IG</label><input type="tel" id="param-phone-ig" value="${escapeHtml(u.phoneIG||'')}" placeholder="06 12 34 56 78"></div>
                    <div class="form-group"><label>Email IG</label><input type="email" id="param-email-ig" value="${escapeHtml(u.emailIG||'')}" placeholder="prenom.nom@ig.pm"></div>
                    <div class="form-group"><label>Email perso (Gmail)</label><input type="email" id="param-email-perso" value="${escapeHtml(u.emailPerso||'')}" placeholder="prenom.nom@gmail.com"></div>
                    <div class="form-group"><label>ID Discord</label><input type="text" id="param-discord" value="${escapeHtml(u.discordId||'')}" placeholder="jean_martin"></div>
                    <div class="form-group"><label>Webhook Discord perso</label><input type="url" id="param-webhook" value="${escapeHtml(u.webhookUrl||'')}" placeholder="https://discord.com/api/webhooks/..."></div>
                </div>
                <div style="margin-top:18px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px;">
                    <h3 style="margin:0 0 10px; font-size:14px; color:#1e40af;"><i class="fas fa-key"></i> Changer le mot de passe</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <input type="password" id="param-new-pwd" placeholder="Nouveau mot de passe (min 8)" style="padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px;">
                        <input type="password" id="param-confirm-pwd" placeholder="Confirmer" style="padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px;">
                    </div>
                    <div style="font-size:11px; color:#64748b; margin-top:6px;">Laissez vide pour ne pas changer.</div>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-primary" id="btn-save-parametres"><i class="fas fa-save"></i> Enregistrer les modifications</button>
                    <button type="button" class="btn btn-secondary" id="btn-cancel-parametres" onclick="window.__pmGoSection('accueil')">Annuler</button>
                </div>
                <div id="param-alert" style="margin-top:14px;"></div>
            </div>`;
        // photo preview handler
        const pIn=document.getElementById('param-photo');
        const pPrev=document.getElementById('param-photo-preview');
        let pendingPhoto=null;
        if(pIn && pPrev){
            pIn.addEventListener('change', (e)=>{
                const f=e.target.files && e.target.files[0];
                if(!f) return;
                if(f.size>2*1024*1024){ alert('Image trop lourde (max 2 Mo)'); e.target.value=''; return; }
                const fr=new FileReader();
                fr.onload=(ev)=>{ pendingPhoto=ev.target.result; pPrev.innerHTML=`<img src="${pendingPhoto}" style="width:100%;height:100%;object-fit:cover;">`; };
                fr.readAsDataURL(f);
            });
        }
        document.getElementById('btn-save-parametres').onclick=async()=>{
            const alertEl=document.getElementById('param-alert');
            const phone=document.getElementById('param-phone').value.trim();
            const phoneIG=document.getElementById('param-phone-ig').value.trim();
            const emailIG=document.getElementById('param-email-ig').value.trim();
            const emailPerso=document.getElementById('param-email-perso').value.trim();
            const discordId=document.getElementById('param-discord').value.trim();
            const webhook=document.getElementById('param-webhook').value.trim();
            const newPwd=document.getElementById('param-new-pwd').value;
            const confirmPwd=document.getElementById('param-confirm-pwd').value;
            if(webhook && !webhook.startsWith('https://discord.com/api/webhooks/')){ alertEl.innerHTML='<div class="pub-alert pub-alert--err">Webhook invalide — doit commencer par https://discord.com/api/webhooks/</div>'; return; }
            if(newPwd || confirmPwd){ if(newPwd.length<8){ alertEl.innerHTML='<div class="pub-alert pub-alert--err">Mot de passe min 8 caractères</div>'; return; } if(newPwd!==confirmPwd){ alertEl.innerHTML='<div class="pub-alert pub-alert--err">Mots de passe différents</div>'; return; } }
            const data=pmLocalStorage.getItem(STORAGE_KEY);
            let all=data? JSON.parse(data):[];
            const idx=all.findIndex(x=>String(x.rio)===String(currentUser.rio));
            if(idx===-1){ alertEl.innerHTML='<div class="pub-alert pub-alert--err">Compte introuvable</div>'; return; }
            all[idx].phone=phone; all[idx].phoneIG=phoneIG; all[idx].emailIG=emailIG; all[idx].emailPerso=emailPerso; all[idx].discordId=discordId; all[idx].webhookUrl=webhook;
            if(pendingPhoto) all[idx].photo=pendingPhoto;
            if(newPwd){ all[idx].password=newPwd; all[idx].mustChangePassword=false; }
            pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                        if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
currentUser=all[idx];
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUI(currentUser);
            alertEl.innerHTML='<div class="pub-alert pub-alert--ok" style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:10px; border-radius:8px;">Paramètres enregistrés</div>';
            await syncPersonnelFichesGridsFromServer().catch(()=>{});
        };
    }

    function renderDispatch() {

        const data = pmLocalStorage.getItem(STORAGE_KEY);

        const allUsers = data ? JSON.parse(data) : [];

        const dispatchs = JSON.parse(

            pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

        );

        contentArea.innerHTML = `            <div class="card">                <div class="dispatch-annonce-card" id="dispatch-annonce-root">                    <h3 class="dispatch-annonce-title">Annonce Dispatch</h3>                    <p class="dispatch-annonce-meta" id="dispatch-annonce-meta"></p>                    <div class="dispatch-annonce-display" id="dispatch-annonce-display">Chargement--</div>                    ${isPmDirectionMember(currentUser) ? `                    <div class="dispatch-annonce-edit">                        <label class="dispatch-annonce-label" for="dispatch-annonce-textarea">Texte (visible par tout l\'effectif connecté)</label>                        <textarea id="dispatch-annonce-textarea" rows="5" maxlength="20000" placeholder="Consignes, points d\'attention, message du jour--"></textarea>                        <button type="button" class="btn btn-primary" id="btn-save-dispatch-annonce">Enregistrer l\'annonce</button>                    </div>` : ''}                </div>                <div class="card-header">                    <h2 class="card-title">Générateur de Dispatch</h2>                    ${isPmDirectionMember(currentUser) ? '<button class="btn btn-primary" id="btn-new-dispatch"><i class="fas fa-plus"></i> Nouveau Dispatch</button>' : ''}                </div>                <div id="dispatch-form-area" style="display: none; margin-bottom: 25px; border: 1px solid var(--pm-blue); padding: 20px; border-radius: 8px; background: #f0f7ff;">                    <h3 class="card-title">Créer un dispatch</h3>                    <div class="form-grid">                        <div class="form-group"><label>Date</label><input type="date" id="disp-date" value="${new Date().toISOString().split('T')[0]}"></div>                        <div class="form-group"><label>Heure</label><input type="time" id="disp-time" value="08:00"></div>                        <div class="form-group"><label>Lieu / Secteur</label><input type="text" id="disp-lieu" placeholder="Ex: Centre-Ville / Gare"></div>                        <div class="form-group"><label>Responsable</label><input type="text" id="disp-resp" value="${currentUser.nom} ${currentUser.prenom}"></div>                    </div>                    <div style="margin-top: 20px; display: flex; gap: 10px;">                        <button class="btn btn-success" id="btn-save-dispatch">Publier le dispatch</button>                        <button class="btn btn-secondary" id="btn-cancel-dispatch">Annuler</button>                    </div>                </div>                <div id="dispatch-list">                    ${

            dispatchs.length === 0

                ? '<p style="text-align: center; color: #666; padding: 20px;">Aucun dispatch publié.</p>'

                : dispatchs

                      .sort(

                          (a, b) =>

                              new Date(b.timestamp) - new Date(a.timestamp),

                      )

                      .map((d) => {

                          const reactions = d.reactions || {};

                          const myReaction = reactions[currentUser.rio] || null;

                          return `                            <div class="card" style="border-left: 5px solid var(--pm-blue); margin-bottom: 15px;">                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">                                    <div>                                        <h3 style="color: var(--pm-text-color); margin: 0;">Dispatch du ${d.date} à ${d.time}</h3>                                        <p style="margin: 5px 0;"><strong>Lieu :</strong> ${d.lieu}</p>                                        <p style="margin: 5px 0;"><strong>Responsable :</strong> ${d.responsable}</p>                                    </div>                                    <span style="font-size: 12px; color: #888;">Publié par ${d.auteur}</span>                                </div>                                <div style="margin-top:15px;">                                    <strong>Votre présence :</strong>                                    <div style="display:flex; gap:10px; margin-top:10px; flex-wrap: wrap;">                                        <button class="btn ${myReaction === 'present' ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="setDispatchReaction('${d.id}', 'present')">                                            <i class="fas fa-check"></i> Présent                                        </button>                                        <button class="btn ${myReaction === 'late' ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="setDispatchReaction('${d.id}', 'late')">                                            <i class="fas fa-clock"></i> En retard                                        </button>                                        <button class="btn ${myReaction === 'absent' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="setDispatchReaction('${d.id}', 'absent')">                                            <i class="fas fa-times"></i> Absent                                        </button>                                        ${myReaction ? `<button class="btn btn-danger btn-sm" onclick="deleteDispatchReaction('${d.id}')"><i class="fas fa-trash"></i> Supprimer ma réaction</button>` : ''}                                    </div>                                    ${

                              isPmDirectionMember(currentUser)

                                  ? `                                        <div style="margin-top:10px;">                                            <strong>Résumé des présences :</strong>                                            <ul>${Object.entries(

                                        reactions,

                                    )

                                        .map(([rio, react]) => {

                                            const u = allUsers.find(

                                                (uu) =>

                                                    uu.rio.toString() ===

                                                    rio.toString(),

                                            );

                                            const name = u

                                                ? `${u.grade} ${u.nom} ${u.prenom}`

                                                : rio;

                                            const color =

                                                react === 'present'

                                                    ? '#28a745'

                                                    : react === 'late'

                                                      ? '#ffc107'

                                                      : '#dc3545';

                                            return `<li style="color: ${color}; display:flex; justify-content:space-between; align-items:center; margin:5px 0;">                                                    <span>${name} - ${react}</span>                                                    <button class="btn btn-danger btn-sm" onclick="deleteDispatchReactionByDirection('${d.id}', '${rio}')" title="Supprimer la réaction">                                                        <i class="fas fa-trash"></i>                                                    </button>                                                </li>`;

                                        })

                                        .join(

                                            '',

                                        )}</ul>                                        </div>                                    `

                                  : ''

                          }                                </div>                                ${isPmDirectionMember(currentUser) ? `                                    <div style="margin-top: 10px; text-align: right;">                                        <button class="btn btn-danger btn-sm" onclick="deleteDispatch('${d.id}')">Supprimer</button>                                    </div>                                ` : ''}                            </div>                        `;

                      })

                      .join('')

        }                </div>            </div>        `;

        window.setDispatchReaction = (dispatchId, reaction) => {

            let currentDispatchs = JSON.parse(

                pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

            );

            const index = currentDispatchs.findIndex(

                (d) => d.id === dispatchId,

            );

            if (index !== -1) {

                if (!currentDispatchs[index].reactions)

                    currentDispatchs[index].reactions = {};

                currentDispatchs[index].reactions[currentUser.rio] = reaction;

                pmLocalStorage.setItem(

                    DISPATCH_KEY,

                    JSON.stringify(currentDispatchs),

                );

                renderDispatch();

            }

        };

        window.deleteDispatchReaction = (dispatchId) => {

            let currentDispatchs = JSON.parse(

                pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

            );

            const index = currentDispatchs.findIndex(

                (d) => d.id === dispatchId,

            );

            if (index !== -1) {

                if (currentDispatchs[index].reactions) {

                    delete currentDispatchs[index].reactions[currentUser.rio];

                }

                pmLocalStorage.setItem(

                    DISPATCH_KEY,

                    JSON.stringify(currentDispatchs),

                );

                renderDispatch();

            }

        };

        window.deleteDispatchReactionByDirection = (dispatchId, agentRio) => {

            let currentDispatchs = JSON.parse(

                pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

            );

            const index = currentDispatchs.findIndex(

                (d) => d.id === dispatchId,

            );

            if (index !== -1) {

                if (currentDispatchs[index].reactions) {

                    delete currentDispatchs[index].reactions[agentRio];

                }

                pmLocalStorage.setItem(

                    DISPATCH_KEY,

                    JSON.stringify(currentDispatchs),

                );

                renderDispatch();

            }

        };

        if (isPmDirectionMember(currentUser)) {

            document.getElementById('btn-new-dispatch').onclick = () => {

                document.getElementById('dispatch-form-area').style.display =

                    'block';

                document.getElementById('btn-new-dispatch').style.display =

                    'none';

            };

            document.getElementById('btn-cancel-dispatch').onclick = () => {

                document.getElementById('dispatch-form-area').style.display =

                    'none';

                document.getElementById('btn-new-dispatch').style.display =

                    'block';

            };

            document.getElementById('btn-save-dispatch').onclick = () => {

                const date = document.getElementById('disp-date').value;

                const time = document.getElementById('disp-time').value;

                const lieu = document.getElementById('disp-lieu').value.trim();

                const responsable = document

                    .getElementById('disp-resp')

                    .value.trim();

                if (!lieu || !responsable) {

                    alert('Veuillez remplir tous les champs.');

                    return;

                }

                const newDispatch = {

                    id: Date.now().toString(),

                    timestamp: new Date().toISOString(),

                    date,

                    time,

                    lieu,

                    responsable,

                    auteur: `${currentUser.prenom} ${currentUser.nom}`,

                    reactions: {},

                };

                const currentDispatchs = JSON.parse(

                    pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

                );

                currentDispatchs.push(newDispatch);

                pmLocalStorage.setItem(

                    DISPATCH_KEY,

                    JSON.stringify(currentDispatchs),

                );

                alert('Dispatch publié avec succès !');

                renderDispatch();

            };

            window.deleteDispatch = (id) => {

                if (confirm('Supprimer ce dispatch ?')) {

                    const currentDispatchs = JSON.parse(

                        pmLocalStorage.getItem(DISPATCH_KEY) || '[]',

                    );

                    const filtered = currentDispatchs.filter(

                        (d) => d.id !== id,

                    );

                    pmLocalStorage.setItem(

                        DISPATCH_KEY,

                        JSON.stringify(filtered),

                    );

                    renderDispatch();

                }

            };

        }

        const fmtShort = (iso) => {

            if (!iso) return '';

            const d = new Date(iso);

            return Number.isNaN(d.getTime())

                ? String(iso)

                : d.toLocaleString('fr-FR', {

                      dateStyle: 'short',

                      timeStyle: 'short',

                  });

        };

        const hydrateDispatchAnnonce = async () => {

            const display = document.getElementById('dispatch-annonce-display');

            const meta = document.getElementById('dispatch-annonce-meta');

            const ta = document.getElementById('dispatch-annonce-textarea');

            const saveBtn = document.getElementById(

                'btn-save-dispatch-annonce',

            );

            if (!display) return;

            try {

                const res = await fetch('api/dispatch-annonce', {

                    credentials: 'same-origin',

                });

                const data = await readApiJson(res);

                const text = typeof data.text === 'string' ? data.text : '';

                display.textContent =

                    text.trim() !== ''

                        ? text

                        : 'Aucune annonce publiée pour le moment.';

                if (meta) {

                    const when = fmtShort(data.updated_at);

                    const who = data.updated_by ? String(data.updated_by) : '';

                    meta.textContent =

                        when || who

                            ? `Dernière mise à jour${when ? ` le ${when}` : ''}${who ? ` -- ${who}` : ''}`

                            : '';

                }

                if (ta) ta.value = text;

                if (saveBtn && ta) {

                    saveBtn.onclick = async () => {

                        saveBtn.disabled = true;

                        try {

                            const putRes = await fetch('api/dispatch-annonce', {

                                method: 'PUT',

                                credentials: 'same-origin',

                                headers: {

                                    'Content-Type':

                                        'application/json; charset=UTF-8',

                                },

                                body: JSON.stringify({ text: ta.value }),

                            });

                            const putData = await readApiJson(putRes);

                            if (!putRes.ok) {

                                alert(

                                    putData.error ||

                                        'Enregistrement impossible.',

                                );

                                return;

                            }

                            await hydrateDispatchAnnonce();

                            alert('Annonce enregistrée.');

                        } catch {

                            alert('Erreur réseau.');

                        } finally {

                            saveBtn.disabled = false;

                        }

                    };

                }

            } catch {

                display.textContent = "Impossible de charger l'annonce.";

            }

        };

        void hydrateDispatchAnnonce();

    }

    function renderAnnonces() {

        const annonces = JSON.parse(

            pmLocalStorage.getItem(TAJ_KEY) || '[]',

        );

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title">Annonces & Notes de Service</h2>                    ${isPmDirectionMember(currentUser) ? '<button class="btn btn-primary" id="btn-show-annonce-form"><i class="fas fa-plus"></i> Publier</button>' : ''}                </div>                <div id="annonce-form-area" style="display: none; margin-bottom: 25px; border: 1px solid var(--pm-blue); padding: 20px; border-radius: 8px; background: #f9f9f9;">                    <h3 class="card-title">Nouvelle Annonce / Note de Service</h3>                    <div class="form-group">                        <label>Type</label>                        <select id="ann-type">                            <option value="Annonce">Annonce</option>                            <option value="Note de Service">Note de Service</option>                        </select>                    </div>                    <div class="form-group">                        <label>Titre de la note</label>                        <input type="text" id="ann-title" placeholder="Ex: Rappel procédures fourrière">                    </div>                    <div class="form-group">                        <label>Contenu de l\'annonce</label>                        <textarea id="ann-content" rows="5" placeholder="Détail de l\'annonce..."></textarea>                    </div>                    <div style="display: flex; gap: 10px; margin-top: 15px;">                        <button class="btn btn-success" id="btn-save-annonce">Publier maintenant</button>                        <button class="btn btn-secondary" id="btn-cancel-annonce">Annuler</button>                    </div>                </div>                <div class="annonces-list">                    ${

            annonces.length === 0

                ? '<p style="text-align: center; color: #666; padding: 20px;">Aucune annonce publiée.</p>'

                : annonces

                      .sort(

                          (a, b) =>

                              new Date(b.timestamp) - new Date(a.timestamp),

                      )

                      .map((a) => {

                          const hasRead =

                              a.lectures &&

                              a.lectures.includes(currentUser.rio);

                          return `                                <div class="card" style="border-left: 4px solid var(--pm-blue); margin-bottom: 15px; opacity: ${hasRead ? '0.8' : '1'};">                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">                                        <div style="display: flex; align-items: center; gap: 10px;">                                            <strong style="font-size: 1.1em; color: var(--pm-text-color);">${a.title}</strong>                                            <span class="badge" style="background: var(--pm-light-blue); color: white;">${a.type}</span>                                            ${!hasRead ? '<span class="badge" style="background: var(--pm-accent); color: white;">Nouveau</span>' : ''}                                        </div>                                        <span style="font-size: 12px; color: #666;">${new Date(a.timestamp).toLocaleString('fr-FR')}</span>                                    </div>                                    <p style="margin-top: 10px; white-space: pre-wrap;">${a.content}</p>                                                                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">                                        <span style="font-size: 12px; color: #888;">Par : ${a.auteur}</span>                                        <div style="display: flex; gap: 10px;">                                            ${!hasRead ? `                                                <button class="btn btn-success btn-sm" onclick="markAnnonceRead('${a.id}')">                                                    <i class="fas fa-check"></i> Lu et Approuvé                                                </button>                                            ` : '<span style="color: #28a745; font-size: 13px;"><i class="fas fa-check-double"></i> Lu et Approuvé</span>'}                                                                                        ${isPmDirectionMember(currentUser) ? `                                                <button class="btn btn-secondary btn-sm" onclick="viewLectures('${a.id}')" title="Voir qui a lu">                                                    <i class="fas fa-eye"></i> (${a.lectures ? a.lectures.length : 0})                                                </button>                                                <button class="btn btn-danger btn-sm" onclick="deleteAnnonce('${a.id}')">                                                    <i class="fas fa-trash"></i>                                                </button>                                            ` : ''}                                        </div>                                    </div>                                </div>                            `;

                      })

                      .join('')

        }                </div>            </div>        `;

        window.markAnnonceRead = (id) => {

            const currentAnnonces = JSON.parse(

                pmLocalStorage.getItem(TAJ_KEY) || '[]',

            );

            const index = currentAnnonces.findIndex((a) => a.id === id);

            if (index !== -1) {

                if (!currentAnnonces[index].lectures)

                    currentAnnonces[index].lectures = [];

                if (

                    !currentAnnonces[index].lectures.includes(currentUser.rio)

                ) {

                    currentAnnonces[index].lectures.push(currentUser.rio);

                    pmLocalStorage.setItem(

                        ANNONCES_KEY,

                        JSON.stringify(currentAnnonces),

                    );

                    renderAnnonces();

                }

            }

        };

        window.viewLectures = (id) => {

            const currentAnnonces = JSON.parse(

                pmLocalStorage.getItem(TAJ_KEY) || '[]',

            );

            const annonce = currentAnnonces.find((a) => a.id === id);

            if (annonce && annonce.lectures) {

                const data = pmLocalStorage.getItem(STORAGE_KEY);

                const allUsers = data ? JSON.parse(data) : [];

                const lecteurs = annonce.lectures.map((rio) => {

                    const u = allUsers.find(

                        (user) => user.rio.toString() === rio.toString(),

                    );

                    return u ? `${u.grade} ${u.nom} ${u.prenom}` : rio;

                });

                alert(

                    'Agents ayant approuvé :\n\n' +

                        (lecteurs.join('\n') || 'Personne pour le moment.'),

                );

            } else {

                alert('Aucune lecture pour le moment.');

            }

        };

        if (isPmDirectionMember(currentUser)) {

            document.getElementById('btn-show-annonce-form').onclick = () => {

                document.getElementById('annonce-form-area').style.display =

                    'block';

                document.getElementById('btn-show-annonce-form').style.display =

                    'none';

            };

            document.getElementById('btn-cancel-annonce').onclick = () => {

                document.getElementById('annonce-form-area').style.display =

                    'none';

                document.getElementById('btn-show-annonce-form').style.display =

                    'block';

            };

            document.getElementById('btn-save-annonce').onclick = () => {

                const type = document.getElementById('ann-type').value;

                const title = document.getElementById('ann-title').value.trim();

                const content = document

                    .getElementById('ann-content')

                    .value.trim();

                if (!title || !content) {

                    alert('Veuillez remplir le titre et le contenu.');

                    return;

                }

                const newAnnonce = {

                    id: Date.now().toString(),

                    timestamp: new Date().toISOString(),

                    type,

                    title,

                    content,

                    auteur: `${currentUser.prenom} ${currentUser.nom}`,

                    lectures: [],

                };

                const currentAnnonces = JSON.parse(

                    pmLocalStorage.getItem(TAJ_KEY) || '[]',

                );

                currentAnnonces.push(newAnnonce);

                pmLocalStorage.setItem(

                    ANNONCES_KEY,

                    JSON.stringify(currentAnnonces),

                );

                addLog("Publication d'une annonce", title);

                alert('Annonce publiée !');

                renderAnnonces();

            };

            window.deleteAnnonce = (id) => {

                const currentAnnonces = JSON.parse(

                    pmLocalStorage.getItem(TAJ_KEY) || '[]',

                );

                const target = currentAnnonces.find((a) => a.id === id);

                if (confirm('Supprimer cette annonce ?')) {

                    const filtered = currentAnnonces.filter((a) => a.id !== id);

                    pmLocalStorage.setItem(

                        ANNONCES_KEY,

                        JSON.stringify(filtered),

                    );

                    addLog(

                        "Suppression d'une annonce",

                        target ? target.title : id,

                    );

                    renderAnnonces();

                }

            };

        }

    }

    function renderPointeuse() {

        const logs = JSON.parse(pmLocalStorage.getItem(SERVICE_KEY) || '[]');

        const myLogs = logs.filter(l=> String(l.rio)===String(currentUser.rio)).sort((a,b)=> new Date(b.timestamp)-new Date(a.timestamp));

        const last = myLogs.find(l=> !l.end) || null;

        const isEnService = !!last && !last.pause;

        const isEnPause = !!last && !!last.pause && !last.end;

        const whUrl = pmGetWebhookUrl('pointeuse') || (currentUser.webhookUrl||'');

        contentArea.innerHTML = `

            <div class="card">

                <div class="card-header"><h2 class="card-title"><i class="fas fa-stopwatch"></i> Pointeuse -- Serveur</h2><span style="font-size:12px; padding:4px 10px; border-radius:12px; background:${isEnService?'#dcfce7;color:#166534':isEnPause?'#fef3c7;color:#92400e':'#f1f5f9;color:#64748b'};">${isEnService?'EN SERVICE':isEnPause?'EN PAUSE':'HORS SERVICE'}</span></div>

                <p style="color:#666; font-size:13px; margin-bottom:16px;">Pointeuse serveur : <b>Prendre son service</b> -> <b>Pause</b> -> <b>Terminer</b>. Historique synchronisé.</p>

                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px;">

                    <button class="btn btn-success" id="btn-ptr-prise" ${isEnService||isEnPause?'disabled':''}><i class="fas fa-play"></i> Prendre son service</button>

                    <button class="btn btn-secondary" id="btn-ptr-pause" ${!isEnService?'disabled':''}><i class="fas fa-pause"></i> Pause de service</button>

                    <button class="btn btn-primary" id="btn-ptr-reprise" ${!isEnPause?'disabled':''}><i class="fas fa-play"></i> Reprendre</button>

                    <button class="btn btn-danger" id="btn-ptr-fin" ${(isEnService||isEnPause)?'':'disabled'}><i class="fas fa-stop"></i> Terminer mon service</button>

                </div>

                ${whUrl?`<div style="font-size:11px; color:#64748b; margin-bottom:12px;">Webhook pointeuse: <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; word-break:break-all;">${escapeHtml(whUrl)}</code></div>`:''}

                <div style="margin-top:16px;">

                    <h3 class="card-title" style="font-size:14px;">Historique (7 derniers jours)</h3>

                    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">

                        <thead><tr style="border-bottom:2px solid #e5e7eb;"><th style="padding:8px; text-align:left;">Date</th><th>Début</th><th>Pause</th><th>Fin</th><th>Durée</th></tr></thead>

                        <tbody id="ptr-tbody"></tbody>

                    </table>

                </div>

            </div>`;

        // render tbody

        const tbody = document.getElementById('ptr-tbody');

        const weekAgo = new Date(Date.now()-7*864e5);

        const rows = myLogs.filter(l=> new Date(l.timestamp) >= weekAgo).slice(0,20);

        if(rows.length===0){

            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#999;">Aucun pointage cette semaine.</td></tr>';

        } else {

            tbody.innerHTML = rows.map(l=>{

                const s = l.start? new Date(l.start): null;

                const e = l.end? new Date(l.end): null;

                const p = l.pauseStart? new Date(l.pauseStart): null;

                const pe = l.pauseEnd? new Date(l.pauseEnd): null;

                let dur='--';

                if(s && e){

                    let ms = e - s;

                    if(l.pauseMs) ms -= l.pauseMs;

                    const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);

                    dur = h+'h '+m+'m';

                }

                return `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px;">${new Date(l.timestamp).toLocaleDateString('fr-FR')}</td><td style="padding:8px;">${s? s.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'--'}</td><td style="padding:8px;">${p? p.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'--'}</td><td style="padding:8px;">${e? e.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'--'}</td><td style="padding:8px;">${dur}</td></tr>`;

            }).join('');

        }

        function sendWh(action){

            if(!whUrl) return;

            fetch(whUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[POINTEUSE]** ${currentUser.grade} ${currentUser.nom} ${currentUser.prenom} (${currentUser.rio}) -- ${action} à ${new Date().toLocaleString('fr-FR')}`, username:'PM Pointeuse'})}).catch(()=>{});

        }

        document.getElementById('btn-ptr-prise').onclick=()=>{

            const rec={id:Date.now().toString(), timestamp:new Date().toISOString(), rio: currentUser.rio, start:new Date().toISOString(), pause:false, pauseStart:null, pauseEnd:null, pauseMs:0, end:null};

            const all=JSON.parse(pmLocalStorage.getItem(SERVICE_KEY)||'[]'); all.push(rec); pmLocalStorage.setItem(SERVICE_KEY, JSON.stringify(all))
                try{ pmAddNotification('prise-service', 'Prise de service', `${currentUser.prenom} ${currentUser.nom} (${currentUser.rio}) a effectue une prise de service`);             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
}catch(e){}; sendWh('Prise de service'); addLog('Pointeuse -- Prise', currentUser.rio); renderPointeuse();

        };

        document.getElementById('btn-ptr-pause').onclick=()=>{

            const all=JSON.parse(pmLocalStorage.getItem(SERVICE_KEY)||'[]'); const idx=[...all].reverse().findIndex(l=> String(l.rio)===String(currentUser.rio) && !l.end); if(idx===-1) return; const realIdx=all.length-1-idx; all[realIdx].pause=true; all[realIdx].pauseStart=new Date().toISOString(); pmLocalStorage.setItem(SERVICE_KEY, JSON.stringify(all));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
sendWh('Pause'); renderPointeuse();

        };

        document.getElementById('btn-ptr-reprise').onclick=()=>{

            const all=JSON.parse(pmLocalStorage.getItem(SERVICE_KEY)||'[]'); const idx=[...all].reverse().findIndex(l=> String(l.rio)===String(currentUser.rio) && l.pause && !l.end); if(idx===-1) return; const realIdx=all.length-1-idx; const rec=all[realIdx]; rec.pause=false; rec.pauseEnd=new Date().toISOString(); if(rec.pauseStart) rec.pauseMs = (rec.pauseMs||0) + (new Date(rec.pauseEnd)-new Date(rec.pauseStart)); rec.pauseStart=null; pmLocalStorage.setItem(SERVICE_KEY, JSON.stringify(all));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
sendWh('Reprise'); renderPointeuse();

        };

        document.getElementById('btn-ptr-fin').onclick=()=>{

            const all=JSON.parse(pmLocalStorage.getItem(SERVICE_KEY)||'[]'); const idx=[...all].reverse().findIndex(l=> String(l.rio)===String(currentUser.rio) && !l.end); if(idx===-1) return; const realIdx=all.length-1-idx; all[realIdx].end=new Date().toISOString(); if(all[realIdx].pause && all[realIdx].pauseStart){ all[realIdx].pauseEnd=new Date().toISOString(); all[realIdx].pauseMs = (all[realIdx].pauseMs||0) + (new Date(all[realIdx].pauseEnd)-new Date(all[realIdx].pauseStart)); all[realIdx].pause=false; } pmLocalStorage.setItem(SERVICE_KEY, JSON.stringify(all));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
sendWh('Fin de service'); addLog('Pointeuse -- Fin', currentUser.rio); renderPointeuse();

        };

    }

    function renderPriseService() {

        const serviceLogs = JSON.parse(

            pmLocalStorage.getItem(SERVICE_KEY) || '[]',

        );

        const today = new Date();

        const startOfWeek = new Date(

            today.getFullYear(),

            today.getMonth(),

            today.getDate() - today.getDay(),

        );

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-clock"></i> Prise de service</h2>                    <button class="btn btn-primary" id="btn-start-service">Prendre son service</button>                </div>                <div style="margin-top:20px;">                    <h3 class="card-title">Récapitulatif de la semaine</h3>                    <table>                        <thead>                            <tr>                                <th>Date</th>                                <th>Début</th>                                <th>Fin</th>                                <th>Durée</th>                            </tr>                        </thead>                        <tbody>                            ${

            serviceLogs

                .filter((log) => {

                    const logDate = new Date(log.timestamp);

                    return (

                        logDate >= startOfWeek && log.rio === currentUser.rio

                    );

                })

                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

                .map((log) => {

                    const start = log.start ? new Date(log.start) : null;

                    const end = log.end ? new Date(log.end) : null;

                    let duration = '';

                    if (start && end) {

                        const diff = end - start;

                        const hours = Math.floor(diff / (1000 * 60 * 60));

                        const minutes = Math.floor(

                            (diff % (1000 * 60 * 60)) / (1000 * 60),

                        );

                        duration = `${hours}h ${minutes}min`;

                    }

                    return `                                    <tr style="border-bottom:1px solid var(--pm-border);">                                        <td style="padding:10px;">${new Date(log.timestamp).toLocaleDateString('fr-FR')}</td>                                        <td style="padding:10px;">${start ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>                                        <td style="padding:10px;">${end ? end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>                                        <td style="padding:10px;">${duration}</td>                                    </tr>                                `;

                })

                .join('') ||

            '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Aucun log pour cette semaine.</td></tr>'

        }                        </tbody>                    </table>                </div>            </div>        `;

        document.getElementById('btn-start-service').onclick = () => {

            const newLog = {

                id: Date.now().toString(),

                timestamp: new Date().toISOString(),

                rio: currentUser.rio,

                start: new Date().toISOString(),

                end: null,

            };

            const currentLogs = JSON.parse(

                pmLocalStorage.getItem(SERVICE_KEY) || '[]',

            );

            currentLogs.push(newLog);

            pmLocalStorage.setItem(SERVICE_KEY, JSON.stringify(currentLogs));

                        if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
alert('Prise de service enregistrée !');

            renderPriseService();

        };

    }

    function renderFinService() {

        const serviceLogs = JSON.parse(

            pmLocalStorage.getItem(SERVICE_KEY) || '[]',

        );

        const today = new Date();

        const startOfWeek = new Date(

            today.getFullYear(),

            today.getMonth(),

            today.getDate() - today.getDay(),

        );

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-history"></i> Fin de service</h2>                    <button class="btn btn-primary" id="btn-end-service">Terminer son service</button>                </div>                <div style="margin-top:20px;">                    <h3 class="card-title">Récapitulatif de la semaine</h3>                    <table>                        <thead>                            <tr>                                <th>Date</th>                                <th>Début</th>                                <th>Fin</th>                                <th>Durée</th>                            </tr>                        </thead>                        <tbody>                            ${

            serviceLogs

                .filter((log) => {

                    const logDate = new Date(log.timestamp);

                    return (

                        logDate >= startOfWeek && log.rio === currentUser.rio

                    );

                })

                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

                .map((log) => {

                    const start = log.start ? new Date(log.start) : null;

                    const end = log.end ? new Date(log.end) : null;

                    let duration = '';

                    if (start && end) {

                        const diff = end - start;

                        const hours = Math.floor(diff / (1000 * 60 * 60));

                        const minutes = Math.floor(

                            (diff % (1000 * 60 * 60)) / (1000 * 60),

                        );

                        duration = `${hours}h ${minutes}min`;

                    }

                    return `                                    <tr style="border-bottom:1px solid var(--pm-border);">                                        <td style="padding:10px;">${new Date(log.timestamp).toLocaleDateString('fr-FR')}</td>                                        <td style="padding:10px;">${start ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>                                        <td style="padding:10px;">${end ? end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>                                        <td style="padding:10px;">${duration}</td>                                    </tr>                                `;

                })

                .join('') ||

            '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Aucun log pour cette semaine.</td></tr>'

        }                        </tbody>                    </table>                </div>            </div>        `;

        document.getElementById('btn-end-service').onclick = () => {

            const currentLogs = JSON.parse(

                pmLocalStorage.getItem(SERVICE_KEY) || '[]',

            );

            const lastLog = currentLogs

                .filter(

                    (log) =>

                        log.rio === currentUser.rio && log.start && !log.end,

                )

                .sort(

                    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),

                )[0];

            if (!lastLog) {

                alert('Aucune prise de service en cours trouvée !');

                return;

            }

            const index = currentLogs.findIndex((log) => log.id === lastLog.id);

            if (index !== -1) {

                currentLogs[index].end = new Date().toISOString();

                pmLocalStorage.setItem(

                    SERVICE_KEY,

                    JSON.stringify(currentLogs),

                );

                alert('Fin de service enregistrée !');

                renderFinService();

            }

        };

    }

    function migrateContactsToThreads(raw) {

        let dirty = false;

        const list = (Array.isArray(raw) ? raw : []).map((c) => {

            if (!c || typeof c !== 'object') return c;

            if (Array.isArray(c.thread) && c.thread.length > 0) return c;

            dirty = true;

            const tid = String(c.id || Date.now());

            const thread = [];

            thread.push({

                id: `${tid}-legacy-0`,

                at: c.timestamp || new Date().toISOString(),

                authorRio: String(c.rio || ''),

                authorLabel: String(c.agentName || ''),

                body: String(c.message || ''),

                role: 'agent',

            });

            if (c.status === 'accepté') {

                thread.push({

                    id: `${tid}-legacy-dir`,

                    at: c.timestamp || new Date().toISOString(),

                    authorRio: '',

                    authorLabel: 'Direction',

                    body: String(c.reason || 'Demande acceptée.'),

                    role: 'direction',

                });

            } else if (c.status === 'refusé') {

                thread.push({

                    id: `${tid}-legacy-dir`,

                    at: c.timestamp || new Date().toISOString(),

                    authorRio: '',

                    authorLabel: 'Direction',

                    body: `Refus : ${String(c.reason || '')}`.trim(),

                    role: 'direction',

                });

            }

            return {

                id: c.id,

                timestamp: c.timestamp,

                rio: c.rio,

                agentName: c.agentName,

                subject: c.subject,

                thread,

                updatedAt: c.timestamp || new Date().toISOString(),

            };

        });

        return { list, dirty };

    }

    function parseContactRemovedIds() {

        try {

            const raw = pmLocalStorage.getItem(CONTACT_REMOVED_KEY);

            const arr = raw ? JSON.parse(raw) : [];

            return Array.isArray(arr) ? arr.map((x) => String(x)) : [];

        } catch {

            return [];

        }

    }

    function addContactRemovedId(id) {

        const s = String(id);

        const set = new Set(parseContactRemovedIds());

        set.add(s);

        pmLocalStorage.setItem(

            CONTACT_REMOVED_KEY,

            JSON.stringify([...set].sort()),

        );

    }

    function contactsStripRemoved(list, removedIds) {

        const r = new Set(removedIds.map(String));

        return (Array.isArray(list) ? list : []).filter(

            (c) => c && !r.has(String(c.id)),

        );

    }

    function contactLastActivityMs(c) {

        if (!c.thread || !c.thread.length)

            return new Date(c.timestamp || 0).getTime();

        return Math.max(...c.thread.map((m) => new Date(m.at || 0).getTime()));

    }

    function parseSalonMessages() {

        try {

            const raw = pmLocalStorage.getItem(SALON_DISCUSSION_KEY);

            const arr = raw ? JSON.parse(raw) : [];

            return Array.isArray(arr) ? arr.filter((m) => m && m.id) : [];

        } catch {

            return [];

        }

    }

    function saveSalonMessages(messages) {

        const trimmed = messages

            .slice()

            .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))

            .slice(-SALON_MAX_MESSAGES);

        pmLocalStorage.setItem(SALON_DISCUSSION_KEY, JSON.stringify(trimmed));

        return trimmed;

    }

    function pmSalonGradeClass(grade) {

        const g = String(grade || '')

            .trim()

            .toLowerCase()

            .replace(/\s+/g, '-')

            .replace(/[^a-z0-9-]/g, '');

        return g ? `pm-salon-msg--grade-${g}` : 'pm-salon-msg--grade-autre';

    }

    function salonAuthorLabel(user) {

        return `${user.grade || ''} ${user.nom || ''} ${user.prenom || ''}`.trim();

    }

    function canDeleteSalonMessage(msg) {

        if (!msg) return false;

        if (String(msg.authorRio) === String(currentUser.rio)) return true;

        return isPmDirectionMember(currentUser);

    }

    function htmlSalonMessages(messages) {

        if (!messages.length) {

            return '<p class="pm-salon-empty">Aucun message pour le moment. Soyez le premier à écrire.</p>';

        }

        const sorted = [...messages].sort(

            (a, b) => new Date(a.at || 0) - new Date(b.at || 0),

        );

        return sorted

            .map((m) => {

                const mine = String(m.authorRio) === String(currentUser.rio);

                const gradeCls = pmSalonGradeClass(m.grade);

                const del = canDeleteSalonMessage(m)

                    ? `<button type="button" class="pm-salon-msg-delete btn btn-danger btn-sm" data-salon-id="${escapeHtml(String(m.id))}" title="Supprimer">—</button>`

                    : '';

                return `<article class="pm-salon-msg ${gradeCls}${mine ? ' pm-salon-msg--mine' : ''}" data-id="${escapeHtml(String(m.id))}">                    <div class="pm-salon-msg__head">                        <span class="pm-salon-msg__author">${escapeHtml(m.authorLabel || 'Agent')}</span>                        <span class="pm-salon-msg__meta">${escapeHtml(new Date(m.at || 0).toLocaleString('fr-FR'))}</span>                        ${del}                    </div>                    <div class="pm-salon-msg__body">${escapeHtml(m.body || '').replace(/\n/g, '<br>')}</div>                </article>`;

            })

            .join('');

    }

    function bindSalonMessageList(root) {

        const listEl = root && root.querySelector('#pm-salon-messages');

        if (!listEl) return;

        listEl.querySelectorAll('.pm-salon-msg-delete').forEach((btn) => {

            btn.addEventListener('click', () => {

                const id = btn.getAttribute('data-salon-id');

                if (!id || !confirm('Supprimer ce message ?')) return;

                const next = parseSalonMessages().filter(

                    (m) => String(m.id) !== String(id),

                );

                saveSalonMessages(next);

                addLog('Salon discussion', 'Message supprimé');

                paintSalonMessages(listEl, next, false);

            });

        });

    }

    function paintSalonMessages(listEl, messages, stickBottom) {

        if (!listEl) return;

        const nearBottom =

            listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;

        listEl.innerHTML = htmlSalonMessages(messages);

        bindSalonMessageList(listEl.closest('#pm-salon-root') || document);

        if (stickBottom || nearBottom) {

            listEl.scrollTop = listEl.scrollHeight;

        }

    }

    async function refreshSalonFromServer() {

        const listEl = document.getElementById('pm-salon-messages');

        if (!listEl) return;

        await pullServerStoreMirror();

        paintSalonMessages(listEl, parseSalonMessages(), false);

    }

    async function renderSalonDiscussion() {

        await pullServerStoreMirror();

        const messages = parseSalonMessages();

        contentArea.innerHTML = `            <div class="card pm-salon-card" id="pm-salon-root">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-comments" aria-hidden="true"></i> Salon discussion</h2>                    <button type="button" class="btn btn-secondary btn-sm" id="pm-salon-refresh" title="Récupérer les messages du serveur">                        <i class="fas fa-arrows-rotate" aria-hidden="true"></i> Actualiser                    </button>                </div>                <p class="dash-welcome-sub" style="margin-top:0;">                    Espace dééchange ouvert à <strong>tous les grades</strong> (DPM, DRA, CDP, CDS, effectif, stagiaires--).                    Les messages sont partagés sur le serveur de léintranet et se mettent à jour automatiquement.                </p>                <div id="pm-salon-messages" class="pm-salon-messages" aria-live="polite"></div>                <div class="pm-salon-compose">                    <label for="pm-salon-input" class="pm-salon-compose-label">Votre message</label>                    <textarea id="pm-salon-input" class="pm-salon-input" rows="3" maxlength="${SALON_MSG_MAX_LEN}" placeholder="écrire au service-- (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"></textarea>                    <div class="pm-salon-compose-actions">                        <button type="button" class="btn btn-primary" id="pm-salon-send">Envoyer</button>                        <span class="pm-salon-hint">${messages.length} message(s) · max ${SALON_MAX_MESSAGES} conservés</span>                    </div>                </div>            </div>        `;

        const root = document.getElementById('pm-salon-root');

        const listEl = document.getElementById('pm-salon-messages');

        const inputEl = document.getElementById('pm-salon-input');

        const sendBtn = document.getElementById('pm-salon-send');

        const refreshBtn = document.getElementById('pm-salon-refresh');

        paintSalonMessages(listEl, messages, true);

        const sendSalonMessage = () => {

            const text = String(inputEl?.value || '').trim();

            if (!text) {

                alert('écrivez un message avant envoi.');

                return;

            }

            if (text.length > SALON_MSG_MAX_LEN) {

                alert(

                    `Message trop long (max ${SALON_MSG_MAX_LEN} caractères).`,

                );

                return;

            }

            const row = {

                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,

                at: new Date().toISOString(),

                authorRio: String(currentUser.rio),

                authorLabel: salonAuthorLabel(currentUser),

                grade: String(currentUser.grade || ''),

                body: text,

            };

            const next = saveSalonMessages([...parseSalonMessages(), row]);

            if (inputEl) inputEl.value = '';

            paintSalonMessages(listEl, next, true);

            addLog('Salon discussion', text.slice(0, 48));

            if (typeof window.pmFlushPendingStorage === 'function') {

                void window.pmFlushPendingStorage();

            }

        };

        sendBtn?.addEventListener('click', sendSalonMessage);

        inputEl?.addEventListener('keydown', (ev) => {

            if (ev.key === 'Enter' && !ev.shiftKey) {

                ev.preventDefault();

                sendSalonMessage();

            }

        });

        refreshBtn?.addEventListener('click', () => {

            void refreshSalonFromServer();

        });

    }

    function renderMessagerie() {

        const rawContacts = JSON.parse(

            pmLocalStorage.getItem(CONTACT_KEY) || '[]',

        );

        const { list: migrated, dirty } = migrateContactsToThreads(rawContacts);

        const removedIds = parseContactRemovedIds();

        const filtered = contactsStripRemoved(migrated, removedIds);

        if (dirty || filtered.length !== migrated.length) {

            pmLocalStorage.setItem(CONTACT_KEY, JSON.stringify(filtered));

                    if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
}

        const contacts = filtered;

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-envelope"></i> Messagerie</h2>                    <div class="card-header-actions">                        <button type="button" class="btn btn-primary" id="btn-contact-direction">Contacter la Direction</button>                        <button type="button" class="btn btn-primary" id="btn-contact-recrut-bmu" title="Brigade motorisée urbaine">Recrutement BMU</button>                        <button type="button" class="btn btn-primary" id="btn-contact-recrut-gsi" title="Groupe de soutien et d\'intervention">Recrutement GSI</button>                    </div>                </div>                <div id="contact-form" style="display:none; margin-top:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f0f7ff;">                    <div class="form-group">                        <label>Sujet</label>                        <input type="text" id="contact-subject" placeholder="Ex: Demande de congé">                    </div>                    <div class="form-group">                        <label>Message</label>                        <textarea id="contact-message" rows="5" placeholder="Votre message..."></textarea>                    </div>                    <div style="display:flex; gap:10px; margin-top:10px;">                        <button class="btn btn-success" id="btn-send-contact">Envoyer</button>                        <button class="btn btn-secondary" id="btn-cancel-contact">Annuler</button>                    </div>                </div>                <div id="messagerie-historique" style="margin-top:20px;">                    <h3 class="card-title">Historique des messages</h3>                    ${

            contacts.length === 0

                ? '<p style="text-align:center; color:#666; padding:20px;">Aucun message.</p>'

                : contacts

                      .filter(

                          (c) =>

                              c.rio === currentUser.rio ||

                              isPmDirectionMember(currentUser),

                      )

                      .sort(

                          (a, b) =>

                              contactLastActivityMs(b) -

                              contactLastActivityMs(a),

                      )

                      .map((c) => {

                          const isMine =

                              String(c.rio) === String(currentUser.rio);

                          const cardMod = isMine

                              ? 'msg-thread-card--mine'

                              : 'msg-thread-card--other';

                          const threadSorted = [...(c.thread || [])].sort(

                              (a, b) =>

                                  new Date(a.at || 0) - new Date(b.at || 0),

                          );

                          const bubbles = threadSorted

                              .map((m) => {

                                  const bubbleClass =

                                      m.role === 'direction'

                                          ? 'msg-bubble--direction'

                                          : 'msg-bubble--agent';

                                  return `<div class="msg-bubble ${bubbleClass}">                                            <div class="msg-bubble__meta">${escapeHtml(m.authorLabel || '')} · ${escapeHtml(new Date(m.at || 0).toLocaleString('fr-FR'))}</div>                                            <div class="msg-bubble__body">${escapeHtml(m.body || '').replace(/\n/g, '<br>')}</div>                                        </div>`;

                              })

                              .join('');

                          const canReply =

                              isPmDirectionMember(currentUser) ||

                              String(c.rio) === String(currentUser.rio);

                          const rid = String(c.id).replace(/'/g, '');

                          const replyBlock = canReply

                              ? `<div class="msg-reply-row">                                        <textarea id="reply-msg-${rid}" rows="2" maxlength="4000" placeholder="écrire une réponse--" aria-label="Réponse"></textarea>                                        <button type="button" class="btn btn-primary btn-sm" onclick="appendContactReply('${rid}')">Envoyer</button>                                    </div>`

                              : '';

                          const delBtn =

                              isPmDirectionMember(currentUser) ||

                              String(c.rio) === String(currentUser.rio)

                                  ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteContact('${rid}')">Supprimer la conversation</button>`

                                  : '';

                          return `<div class="msg-thread-card ${cardMod}">                                    <div class="msg-thread-head">                                        <span class="msg-thread-subject">${escapeHtml(c.subject || '')}</span>                                        <span class="msg-thread-meta">${escapeHtml(c.agentName || '')} · RIO ${escapeHtml(String(c.rio || ''))}</span>                                    </div>                                    <div class="msg-thread-list">${bubbles}</div>                                    ${replyBlock}                                    <div class="msg-thread-actions">${delBtn}</div>                                </div>`;

                      })

                      .join('')

        }                </div>            </div>        `;

        const contactFormEl = document.getElementById('contact-form');

        const contactSubjectEl = document.getElementById('contact-subject');

        const openContactForm = (presetSubject) => {

            if (contactSubjectEl) {

                contactSubjectEl.value =

                    presetSubject !== undefined && presetSubject !== null

                        ? presetSubject

                        : '';

            }

            if (contactFormEl) contactFormEl.style.display = 'block';

        };

        document.getElementById('btn-contact-direction').onclick = () => {

            openContactForm('');

        };

        document.getElementById('btn-contact-recrut-bmu').onclick = () => {

            openContactForm('Recrutement -- Brigade motorisée urbaine');

        };

        document.getElementById('btn-contact-recrut-gsi').onclick = () => {

            openContactForm(

                "Recrutement -- Groupe de soutien et d'intervention",

            );

        };

        document.getElementById('btn-cancel-contact').onclick = () => {

            document.getElementById('contact-form').style.display = 'none';

        };

        document.getElementById('btn-send-contact').onclick = () => {

            const subject = document

                .getElementById('contact-subject')

                .value.trim();

            const message = document

                .getElementById('contact-message')

                .value.trim();

            if (!subject || !message) {

                alert('Veuillez remplir le sujet et le message.');

                return;

            }

            const nowIso = new Date().toISOString();

            const tid = Date.now().toString();

            const newContact = {

                id: tid,

                timestamp: nowIso,

                updatedAt: nowIso,

                rio: currentUser.rio,

                agentName: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

                subject,

                thread: [

                    {

                        id: `${tid}-0`,

                        at: nowIso,

                        authorRio: String(currentUser.rio),

                        authorLabel: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

                        body: message,

                        role: 'agent',

                    },

                ],

            };

            const currentContacts = JSON.parse(

                pmLocalStorage.getItem(CONTACT_KEY) || '[]',

            );

            currentContacts.push(newContact);

            pmLocalStorage.setItem(

                CONTACT_KEY,

                JSON.stringify(currentContacts),

            );

            alert('Message envoyé à la Direction !');

            renderMessagerie();

        };

        window.appendContactReply = (contactId) => {

            const ta = document.getElementById(`reply-msg-${contactId}`);

            const text = ta && ta.value ? ta.value.trim() : '';

            if (!text) {

                alert('écrivez un message avant envoi.');

                return;

            }

            let currentContacts = JSON.parse(

                pmLocalStorage.getItem(CONTACT_KEY) || '[]',

            );

            const index = currentContacts.findIndex(

                (c) => String(c.id) === String(contactId),

            );

            if (index === -1) return;

            const c = currentContacts[index];

            if (

                !isPmDirectionMember(currentUser) &&

                String(c.rio) !== String(currentUser.rio)

            ) {

                return;

            }

            const role = isPmDirectionMember(currentUser)

                ? 'direction'

                : 'agent';

            const row = {

                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,

                at: new Date().toISOString(),

                authorRio: String(currentUser.rio),

                authorLabel: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

                body: text,

                role,

            };

            if (!Array.isArray(c.thread)) {

                c.thread = [];

            }

            c.thread.push(row);

            c.updatedAt = row.at;

            pmLocalStorage.setItem(

                CONTACT_KEY,

                JSON.stringify(currentContacts),

            );

            addLog(

                'Messagerie -- réponse',

                String(c.subject || '').slice(0, 48),

            );

            renderMessagerie();

        };

        window.deleteContact = (id) => {

            if (!confirm('Supprimer ce message ?')) {

                return;

            }

            addContactRemovedId(id);

            let currentContacts = JSON.parse(

                pmLocalStorage.getItem(CONTACT_KEY) || '[]',

            );

            pmLocalStorage.setItem(

                CONTACT_KEY,

                JSON.stringify(

                    currentContacts.filter((c) => String(c.id) !== String(id)),

                ),

            );

            renderMessagerie();

        };

    }

    function renderConges() {

        const conges = JSON.parse(pmLocalStorage.getItem(CONGES_KEY) || '[]');

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-calendar-day"></i> Congés</h2>                    <button class="btn btn-primary" id="btn-demand-conge">Demander un congé</button>                </div>                <div id="conge-form" style="display:none; margin-top:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f0f7ff;">                    <div class="form-grid">                        <div class="form-group">                            <label>Date de début</label>                            <input type="date" id="conge-start">                        </div>                        <div class="form-group">                            <label>Date de fin</label>                            <input type="date" id="conge-end">                        </div>                    </div>                    <div class="form-group">                        <label>Raison</label>                        <textarea id="conge-reason" rows="3" placeholder="Raison de la demande..."></textarea>                    </div>                    <div style="display:flex; gap:10px; margin-top:10px;">                        <button class="btn btn-success" id="btn-send-conge">Envoyer la demande</button>                        <button class="btn btn-secondary" id="btn-cancel-conge">Annuler</button>                    </div>                </div>                <div style="margin-top:20px;">                    <h3 class="card-title">Historique des demandes</h3>                    ${

            conges.length === 0

                ? '<p style="text-align:center; color:#666; padding:20px;">Aucune demande de congé.</p>'

                : conges

                      .sort(

                          (a, b) =>

                              new Date(b.timestamp) - new Date(a.timestamp),

                      )

                      .filter(

                          (c) =>

                              c.rio === currentUser.rio ||

                              isPmDirectionMember(currentUser),

                      )

                      .map(

                          (c) =>

                              `                                <div class="card" style="border-left:5px solid ${c.status === 'accepté' ? '#28a745' : c.status === 'refusé' ? '#dc3545' : '#ffc107'}; margin-bottom:10px;">                                    <div style="display:flex; justify-content:space-between;">                                        <strong>${c.agentName}</strong>                                        <span style="font-size:12px; color:#666;">${new Date(c.timestamp).toLocaleDateString('fr-FR')}</span>                                    </div>                                    <p style="margin:5px 0;"><strong>Du:</strong> ${new Date(c.startDate).toLocaleDateString('fr-FR')} <strong>Au:</strong> ${new Date(c.endDate).toLocaleDateString('fr-FR')}</p>                                    <p style="margin:10px 0;"><strong>Raison:</strong> ${c.reason}</p>                                    ${c.status ? `<p style="margin-top:10px; padding:10px; background:${c.status === 'accepté' ? '#d4edda' : c.status === 'refusé' ? '#f8d7da' : '#fff3cd'}; border-radius:4px;"><strong>Statut:</strong> ${c.status}${c.reasonRefus ? '<br><strong>Raison:</strong> ' + c.reasonRefus : ''}</p>` : '<p style="margin-top:10px; color:#666;">En attente de validation</p>'}                                    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap: wrap;">                                        ${isPmDirectionMember(currentUser) && !c.status ? `                                            <button class="btn btn-success btn-sm" onclick="respondConge('${c.id}', 'accepté')">Accepter</button>                                            <button class="btn btn-danger btn-sm" onclick="promptRefuseConge('${c.id}')">Refuser</button>                                        ` : ''}                                        ${isPmDirectionMember(currentUser) || c.rio === currentUser.rio ? `                                            <button class="btn btn-danger btn-sm" onclick="deleteConge('${c.id}')">Supprimer</button>                                        ` : ''}                                    </div>                                </div>                            `,

                      )

                      .join('')

        }                </div>            </div>        `;

        document.getElementById('btn-demand-conge').onclick = () => {

            document.getElementById('conge-form').style.display = 'block';

        };

        document.getElementById('btn-cancel-conge').onclick = () => {

            document.getElementById('conge-form').style.display = 'none';

        };

        document.getElementById('btn-send-conge').onclick = () => {

            const start = document.getElementById('conge-start').value;

            const end = document.getElementById('conge-end').value;

            const reason = document.getElementById('conge-reason').value.trim();

            if (!start || !end || !reason) {

                alert('Veuillez remplir tous les champs.');

                return;

            }

            const newConge = {

                id: Date.now().toString(),

                timestamp: new Date().toISOString(),

                rio: currentUser.rio,

                agentName: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

                startDate: new Date(start).toISOString(),

                endDate: new Date(end).toISOString(),

                reason,

                status: null,

                reasonRefus: null,

            };

            const currentConges = JSON.parse(

                pmLocalStorage.getItem(CONGES_KEY) || '[]',

            );

            currentConges.push(newConge);

            pmLocalStorage.setItem(CONGES_KEY, JSON.stringify(currentConges));

                        if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
alert('Demande de congé envoyée !');

            renderConges();

        };

        window.respondConge = (id, status) => {

            let currentConges = JSON.parse(

                pmLocalStorage.getItem(CONGES_KEY) || '[]',

            );

            const index = currentConges.findIndex((c) => c.id === id);

            if (index !== -1) {

                currentConges[index].status = status;

                pmLocalStorage.setItem(

                    CONGES_KEY,

                    JSON.stringify(currentConges),

                );

                renderConges();

            }

        };

        window.promptRefuseConge = (id) => {

            const reason = prompt('Raison du refus :');

            if (reason) {

                let currentConges = JSON.parse(

                    pmLocalStorage.getItem(CONGES_KEY) || '[]',

                );

                const index = currentConges.findIndex((c) => c.id === id);

                if (index !== -1) {

                    currentConges[index].status = 'refusé';

                    currentConges[index].reasonRefus = reason;

                    pmLocalStorage.setItem(

                        CONGES_KEY,

                        JSON.stringify(currentConges),

                    );

                    renderConges();

                }

            }

        };

        window.deleteConge = (id) => {

            if (confirm('Supprimer cette demande de congé ?')) {

                let currentConges = JSON.parse(

                    pmLocalStorage.getItem(CONGES_KEY) || '[]',

                );

                pmLocalStorage.setItem(

                    CONGES_KEY,

                    JSON.stringify(currentConges.filter((c) => c.id !== id)),

                );

                renderConges();

            }

        };

    }

    function renderVestiaire() {

        const tenues = JSON.parse(pmLocalStorage.getItem(TENUE_KEY) || '[]');

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-shirt"></i> Vestiaire (Tenue)</h2>                    ${isPmDirectionMember(currentUser) ? '<button class="btn btn-primary" id="btn-add-tenue"><i class="fas fa-plus"></i> Ajouter une tenue</button>' : ''}                </div>                <div id="tenue-form" style="display:none; margin-top:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f0f7ff;">                    <div class="form-group">                        <label>Nom de la tenue</label>                        <input type="text" id="tenue-nom" placeholder="Ex: Tenue opérationnelle">                    </div>                    <div class="form-group">                        <label>Code tenue</label>                        <input type="text" id="tenue-code" placeholder="Ex: T001">                    </div>                    <div class="form-group">                        <label>Photo de la tenue</label>                        <input type="file" id="tenue-photo" accept="image/*">                    </div>                    <div style="display:flex; gap:10px; margin-top:10px;">                        <button class="btn btn-success" id="btn-save-tenue">Enregistrer</button>                        <button class="btn btn-secondary" id="btn-cancel-tenue">Annuler</button>                    </div>                </div>                <div style="margin-top:20px; display:grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap:20px;">                    ${tenues.length === 0 ? '<p style="text-align:center; color:#666; grid-column:1/-1; padding:20px;">Aucune tenue enregistrée.</p>' : tenues.map((t) => `                            <div class="card" style="border-left:5px solid var(--pm-blue);">                                <h3 style="margin:0 0 10px 0; color:var(--pm-text-color);">${t.nom}</h3>                                <p style="margin:5px 0;"><strong>Code:</strong> ${t.code}</p>                                ${t.photo ? `<img src="${t.photo}" alt="${t.nom}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-top:10px;">` : ''}                                ${isPmDirectionMember(currentUser) ? `                                    <div style="margin-top:10px; text-align:right;">                                        <button class="btn btn-danger btn-sm" onclick="deleteTenue('${t.id}')">Supprimer</button>                                    </div>                                ` : ''}                            </div>                        `).join('')}                </div>            </div>        `;

        if (isPmDirectionMember(currentUser)) {

            document.getElementById('btn-add-tenue').onclick = () => {

                document.getElementById('tenue-form').style.display = 'block';

            };

            document.getElementById('btn-cancel-tenue').onclick = () => {

                document.getElementById('tenue-form').style.display = 'none';

            };

            document.getElementById('btn-save-tenue').onclick = () => {

                const nom = document.getElementById('tenue-nom').value.trim();

                const code = document.getElementById('tenue-code').value.trim();

                const photoInput = document.getElementById('tenue-photo');

                if (!nom || !code) {

                    alert('Veuillez remplir le nom et le code de la tenue.');

                    return;

                }

                const newTenue = {

                    id: Date.now().toString(),

                    nom,

                    code,

                    photo: null,

                };

                if (photoInput.files && photoInput.files[0]) {

                    const reader = new FileReader();

                    reader.onload = function (e) {

                        newTenue.photo = e.target.result;

                        const currentTenues = JSON.parse(

                            pmLocalStorage.getItem(TENUE_KEY) || '[]',

                        );

                        currentTenues.push(newTenue);

                        pmLocalStorage.setItem(

                            TENUE_KEY,

                            JSON.stringify(currentTenues),

                        );

                        renderVestiaire();

                    };

                    reader.readAsDataURL(photoInput.files[0]);

                } else {

                    const currentTenues = JSON.parse(

                        pmLocalStorage.getItem(TENUE_KEY) || '[]',

                    );

                    currentTenues.push(newTenue);

                    pmLocalStorage.setItem(

                        TENUE_KEY,

                        JSON.stringify(currentTenues),

                    );

                    renderVestiaire();

                }

            };

            window.deleteTenue = (id) => {

                if (confirm('Supprimer cette tenue ?')) {

                    const currentTenues = JSON.parse(

                        pmLocalStorage.getItem(TENUE_KEY) || '[]',

                    );

                    pmLocalStorage.setItem(

                        TENUE_KEY,

                        JSON.stringify(

                            currentTenues.filter((t) => t.id !== id),

                        ),

                    );

                    renderVestiaire();

                }

            };

        }

    }

    async function renderCodePenal() {

        contentArea.innerHTML = `        <div class="card">            <div class="card-header">                <h2 class="card-title"><i class="fas fa-book"></i> Code Pénal / CSI</h2>            </div>            <div id="custom-codepenal-area">                <div style="display: flex; gap: 8px; padding: 12px 12px 0;">                    <button id="tab-infraction" style="padding: 8px 12px; border: 1px solid #dcdcdc; border-bottom: 2px solid #3498db; background: #fff; cursor: pointer;">                        Infraction                    </button>                    <button id="tab-delit" style="padding: 8px 12px; border: 1px solid #dcdcdc; border-bottom: 2px solid transparent; background: #f7f7f7; cursor: pointer;">                        Délit                    </button>                </div>                <div id="codepenal-content" style="padding: 12px; overflow: auto; max-height: 75vh;">                    <div id="view-infraction">                        <iframe                            src="./Infraction.php"                            title="Infraction"                            style="width: 100%; height: 70vh; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff;"                        ></iframe>                    </div>                    <div id="view-delit" style="display: none;">                        <iframe                            src="./Delit.php"                            title="Délit"                            style="width: 100%; height: 70vh; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff;"                        ></iframe>                    </div>                </div>            </div>        </div>    `;

        const tabInfraction = document.getElementById('tab-infraction');

        const tabDelit = document.getElementById('tab-delit');

        const viewInfraction = document.getElementById('view-infraction');

        const viewDelit = document.getElementById('view-delit');

        const setActiveTab = (tab) => {

            if (!tabInfraction || !tabDelit || !viewInfraction || !viewDelit) {

                return;

            }

            if (tab === 'infraction') {

                tabInfraction.style.background = '#fff';

                tabInfraction.style.borderBottom = '2px solid #3498db';

                tabDelit.style.background = '#f7f7f7';

                tabDelit.style.borderBottom = '2px solid transparent';

                viewInfraction.style.display = '';

                viewDelit.style.display = 'none';

            } else {

                tabDelit.style.background = '#fff';

                tabDelit.style.borderBottom = '2px solid #3498db';

                tabInfraction.style.background = '#f7f7f7';

                tabInfraction.style.borderBottom = '2px solid transparent';

                viewInfraction.style.display = 'none';

                viewDelit.style.display = '';

            }

        };

        tabInfraction?.addEventListener('click', () =>

            setActiveTab('infraction'),

        );

        tabDelit?.addEventListener('click', () => setActiveTab('delit'));

    }

    function renderRapports() {

        const rapports = JSON.parse(

            pmLocalStorage.getItem(RAPPORTS_KEY) || '[]',

        );

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title">Générateur de Rapports</h2>                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">                    <button class="btn btn-primary" id="btn-vacation">Prise de Vacation</button>                    <button class="btn btn-primary" id="btn-fin-vacation">Fin de Vacation</button>                    <button class="btn btn-primary" id="btn-saisie">Rapport de Saisie</button>                    ${isPmDirectionMember(currentUser) ? '<button class="btn btn-secondary" id="btn-view-all-rapports">Consulter les rapports</button>' : ''}                </div>                <div id="rapport-form-area">                    <p>Sélectionnez un type de rapport.</p>                </div>            </div>        `;

        const saveRapport = (type, data) => {

            const currentRapports = JSON.parse(

                pmLocalStorage.getItem(RAPPORTS_KEY) || '[]',

            );

            currentRapports.push({

                id: Date.now(),

                timestamp: new Date().toISOString(),

                type: type,

                auteur: `${currentUser.grade} ${currentUser.nom} ${currentUser.prenom}`,

                rio: currentUser.rio,

                data: data,

            });

            pmLocalStorage.setItem(

                RAPPORTS_KEY,

                JSON.stringify(currentRapports),

            );

            alert('Rapport envoyé à la direction !');

            renderRapports();

        };

        document.getElementById('btn-vacation').onclick = () => {

            document.getElementById('rapport-form-area').innerHTML =

                `                <div class="card" style="background: #f9f9f9;">                    <h3>Prise de Vacation</h3>                    <div class="form-grid">                        <div class="form-group"><label>Date</label><input type="date" id="vac-date" value="${new Date().toISOString().split('T')[0]}"></div>                        <div class="form-group"><label>Heure Début</label><input type="time" id="vac-start"></div>                        <div class="form-group"><label>Véhicule</label><input type="text" id="vac-vehicule" placeholder="Ex: PM-01"></div>                        <div class="form-group"><label>Nombre de personnes</label><input type="number" id="vac-nombre-personnes" value="1" min="1"></div>                    </div>                    <div class="form-grid">                        <div class="form-group"><label>Nom et Prénom</label><input type="text" id="vac-nom-prenom" value="${currentUser.nom} ${currentUser.prenom}"></div>                        <div class="form-group"><label>Indicatif Radio</label><select id="vac-indicatif">${OPTIONS_SELECT_INDICATIF_RADIO_HTML}</select></div>                    </div>                    <div class="form-group">                        <label>Remarques initiales</label>                        <textarea rows="5" id="vac-remarques"></textarea>                    </div>                    <div style="display: flex; gap: 10px;">                        <button class="btn btn-success" id="btn-submit-vacation">Envoyer à la direction</button>                    </div>                </div>            `;

            document.getElementById('btn-submit-vacation').onclick = () => {

                const vacIndEl = document.getElementById('vac-indicatif');

                const indicatif = vacIndEl

                    ? String(vacIndEl.value || '').trim()

                    : '';

                if (!indicatif) {

                    alert('Veuillez choisir un indicatif radio.');

                    return;

                }

                const data = {

                    date: document.getElementById('vac-date').value,

                    start: document.getElementById('vac-start').value,

                    vehicule: document.getElementById('vac-vehicule').value,

                    nombrePersonnes: document.getElementById(

                        'vac-nombre-personnes',

                    ).value,

                    nomPrenom: document.getElementById('vac-nom-prenom').value,

                    indicatif,

                    remarques: document.getElementById('vac-remarques').value,

                };

                saveRapport('Prise de Vacation', data);

            };

        };

        document.getElementById('btn-fin-vacation').onclick = () => {

            document.getElementById('rapport-form-area').innerHTML =

                `                <div class="card" style="background: #f9f9f9;">                    <h3>Rapport de fin de vacation</h3>                    <div class="form-grid">                        <div class="form-group"><label>Date</label><input type="date" id="vac-date" value="${new Date().toISOString().split('T')[0]}"></div>                        <div class="form-group"><label>Heure Début</label><input type="time" id="vac-start"></div>                        <div class="form-group"><label>Heure Fin</label><input type="time" id="vac-end"></div>                        <div class="form-group"><label>Effectifs</label><input type="text" id="vac-effectifs" value="${currentUser.nom} ${currentUser.prenom}"></div>                    </div>                    <div class="form-group">                        <label>Résumé de la vacation</label>                        <textarea rows="5" id="vac-summary"></textarea>                    </div>                    <div style="display: flex; gap: 10px;">                        <button class="btn btn-success" id="btn-submit-fin-vacation">Envoyer à la direction</button>                    </div>                </div>            `;

            document.getElementById('btn-submit-fin-vacation').onclick = () => {

                const data = {

                    date: document.getElementById('vac-date').value,

                    start: document.getElementById('vac-start').value,

                    end: document.getElementById('vac-end').value,

                    effectifs: document.getElementById('vac-effectifs').value,

                    summary: document.getElementById('vac-summary').value,

                };

                saveRapport('Fin de Vacation', data);

            };

        };

        document.getElementById('btn-saisie').onclick = () => {

            document.getElementById('rapport-form-area').innerHTML =

                `                <div class="card" style="background: #f9f9f9;">                    <h3>Rapport de Saisie</h3>                    <div class="form-grid">                        <div class="form-group"><label>Date/Heure</label><input type="datetime-local" id="saisie-date" value="${new Date().toISOString().slice(0, 16)}"></div>                        <div class="form-group"><label>Lieu</label><input type="text" id="saisie-lieu" placeholder="Adresse précise"></div>                        <div class="form-group"><label>Type de saisie</label><select id="saisie-type"><option>Stupéfiants</option><option>Arme</option><option>Véhicule</option><option>Autre</option></select></div>                        <div class="form-group"><label>Agent Rapporteur</label><input type="text" id="saisie-agent" value="${currentUser.nom} ${currentUser.prenom}"></div>                    </div>                    <div class="form-group">                        <label>Description des objets saisis</label>                        <textarea rows="5" id="saisie-desc" placeholder="Détaillez les objets, quantités, etc."></textarea>                    </div>                    <div style="display: flex; gap: 10px;">                        <button class="btn btn-success" id="btn-submit-saisie">Envoyer à la direction</button>                    </div>                </div>            `;

            document.getElementById('btn-submit-saisie').onclick = () => {

                const data = {

                    date: document.getElementById('saisie-date').value,

                    lieu: document.getElementById('saisie-lieu').value,

                    type: document.getElementById('saisie-type').value,

                    agent: document.getElementById('saisie-agent').value,

                    desc: document.getElementById('saisie-desc').value,

                };

                saveRapport('Rapport de Saisie', data);

            };

        };

        if (isPmDirectionMember(currentUser)) {

            document.getElementById('btn-view-all-rapports').onclick = () => {

                const list = rapports

                    .sort((a, b) => b.id - a.id)

                    .map(

                        (r) =>

                            `                    <div class="card" style="margin-bottom: 10px; border-left: 4px solid var(--pm-blue);">                        <div style="display: flex; justify-content: space-between;">                            <strong>${r.type}</strong>                            <span style="font-size: 12px; color: #888;">${new Date(r.timestamp).toLocaleString('fr-FR')}</span>                        </div>                        <p style="font-size: 13px; margin: 5px 0;"><strong>Auteur:</strong> ${r.auteur}</p>                        <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; font-size: 13px; margin-top: 10px;">                            ${Object.entries(

                                r.data,

                            )

                                .map(

                                    ([key, val]) =>

                                        `<strong>${key}:</strong> ${val}`,

                                )

                                .join(

                                    '<br>',

                                )}                        </div>                    </div>                `,

                    )

                    .join('');

                document.getElementById('rapport-form-area').innerHTML =

                    list || '<p>Aucun rapport reçu.</p>';

            };

        }

    }

    function renderRapportInterpellation() {

        const sections = [

            {

                title: 'I -- Informations générales',

                questions: [

                    { id: 'dateFaits', label: 'Date des faits', type: 'date', required: true },

                    { id: 'heureFaits', label: 'Heure des faits', type: 'time', required: true },

                    { id: 'lieu', label: "Lieu de l'interpellation", type: 'text', placeholder: 'Ex : Place de la République', required: true },

                    { id: 'indicatif', label: 'Indicatif radio', type: 'select', options: ['CSU', 'VICTOR-01', 'VICTOR-02', 'VICTOR-03', 'VICTOR-04', 'MIKE-ALPHA', 'MIKE-BRAVO', 'GSI-01', 'GSI-02'], required: true },

                    { id: 'typeVehicule', label: 'Type de véhicule de service', type: 'text', placeholder: 'Ex : Skoda Enyaq', required: true },

                    { id: 'serigraphie', label: 'Sérigraphie du véhicule', type: 'select', options: ['sérigraphié Police Municipale', 'banalisé'], required: true },

                    { id: 'agents', label: 'Agents à bord (noms et prénoms)', type: 'text', placeholder: 'Ex : BLAS Lenny, BABYLONE Zion', required: true },

                ],

            },

            {

                title: 'II -- Identité de la personne interpellée',

                questions: [

                    { id: 'nomIndividu', label: "Nom de l'individu", type: 'text', placeholder: 'Ex : PAPRIKA', required: true },

                    { id: 'prenomIndividu', label: "Prénom de l'individu", type: 'text', placeholder: 'Ex : Nabil', required: true },

                    { id: 'dateNaissance', label: 'Date de naissance', type: 'date', required: true },

                    { id: 'lieuNaissance', label: 'Lieu de naissance', type: 'text', placeholder: 'Ex : Marseille', required: true },

                    { id: 'nationalite', label: 'Nationalité', type: 'text', placeholder: 'Ex : Française', required: true },

                    { id: 'adresse', label: 'Adresse / Domicile', type: 'text', placeholder: 'Ex : 15 rue Victor Hugo ou Sans domicile fixe', required: true },

                ],

            },

            {

                title: 'III -- Circonstances de l\'intervention',

                questions: [

                    { id: 'motifControle', label: 'Motif du contrôle / circonstances', type: 'textarea', placeholder: 'Décrivez ce qui a motivé le contrôle...', required: true },

                    { id: 'fuite', label: "L'individu a-t-il pris la fuite ?", type: 'select', options: ['Oui', 'Non'], required: true },

                    { id: 'description', label: "Description de l'individu / vêtements", type: 'textarea', placeholder: 'Ex : Vêtu de noir, casque moto...', required: false },

                    { id: 'refusObtemperer', label: "Refus d'obtempérer constaté ?", type: 'select', options: ['Oui', 'Non'], required: true },

                    { id: 'circumstances', label: "Circonstances de l'interpellation (suite de la fuite, AVP, etc.)", type: 'textarea', placeholder: 'Ex : Perte de contrôle, percuté une poubelle...', required: true },

                    { id: 'usageForce', label: 'Usage de la force nécessaire ?', type: 'select', options: ['Non', 'Oui'], required: true },

                ],

            },

            {

                title: 'IV -- Contrôle d\'identité & palpation',

                questions: [

                    { id: 'heureControleIdentite', label: "Heure du contrôle d'identité", type: 'time', required: true },

                    { id: 'resultatFPR', label: 'Résultat FPR', type: 'select', options: ['Néant', 'Actif'], required: true },

                    { id: 'heurePalpation', label: 'Heure de la palpation', type: 'time', required: true },

                    { id: 'resultatPalpation', label: 'Résultat de la palpation', type: 'textarea', placeholder: 'Ex : Rien de suspect', required: true },

                    { id: 'fouille', label: 'Fouille complémentaire effectuée ?', type: 'select', options: ['Oui', 'Non'], required: true },

                    { id: 'fouilleResultat', label: 'Résultat de la fouille complémentaire', type: 'textarea', placeholder: 'Ex : Aucun autre élément', required: false },

                ],

            },

            {

                title: 'V -- Infractions & preuves',

                questions: [

                    { id: 'infractions', label: 'Infractions retenues (une par ligne)', type: 'textarea', placeholder: "Ex : Refus d'obtempérer\nDétention de stupéfiants\nDétention arme catégorie D", required: true },

                    { id: 'preuves', label: 'éléments de preuve (une par ligne)', type: 'textarea', placeholder: 'Ex : Enregistrements véhicule\nCaméra GoPro\néléments CSU', required: false },

                ],

            },

            {

                title: 'VI -- Garde à vue',

                questions: [

                    { id: 'nomOPJ', label: "Nom de l'OPJ en charge", type: 'text', placeholder: 'Ex : BLAS Lenny', required: true },

                    { id: 'heureNotifDroits', label: 'Heure de notification des droits', type: 'time', required: true },

                    { id: 'droits', label: 'Droits énoncés / réponses de l\'intéressé', type: 'textarea', placeholder: 'Ex : A demandé un avocat, pas de médecin...', required: true },

                    { id: 'heureGAV', label: 'Heure de mise en garde à vue', type: 'time', required: true },

                    { id: 'etatIntegrite', label: "état de l'intéressé (blessures, comportement)", type: 'textarea', placeholder: 'Ex : Calme, aucune blessure...', required: true },

                    { id: 'suiteProcedure', label: 'Suite donnée à la procédure', type: 'textarea', placeholder: 'Ex : Comparution immédiale...', required: true },

                ],

            },

        ];

        const allQuestions = sections.flatMap((s) => s.questions);

        let answers = {};

        function saveAllAnswers() {

            allQuestions.forEach((q) => {

                const el = document.getElementById('pvi-q-' + q.id);

                if (el) answers[q.id] = el.value;

            });

        }

        function renderForm() {

            let sectionsHtml = '';

            let qIndex = 0;

            sections.forEach((section) => {

                let fieldsHtml = '';

                section.questions.forEach((q) => {

                    const val = answers[q.id] || '';

                    let input = '';

                    if (q.type === 'textarea') {

                        input = `<textarea id="pvi-q-${q.id}" rows="3" placeholder="${q.placeholder || ''}" style="width:100%;padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;resize:vertical;" autocomplete="off">${escapeHtml(val)}</textarea>`;

                    } else if (q.type === 'select') {

                        input = `<select id="pvi-q-${q.id}" style="width:100%;padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;"><option value="">-- Choisir --</option>${q.options.map((o) => `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;

                    } else {

                        input = `<input type="${q.type}" id="pvi-q-${q.id}" value="${escapeHtml(val)}" placeholder="${q.placeholder || ''}" style="width:100%;padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;" autocomplete="off">`;

                    }

                    fieldsHtml += `

                        <div style="display:flex;flex-direction:column;gap:4px;">

                            <label style="font-weight:600;font-size:13px;color:var(--pm-text-color);">${escapeHtml(q.label)}${q.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>

                            ${input}

                        </div>`;

                });

                sectionsHtml += `

                    <div style="background:var(--pm-pub-card);border:1px solid var(--pm-pub-border);border-radius:12px;padding:20px 24px;">

                        <h3 style="margin:0 0 16px 0;font-size:15px;color:var(--pm-blue);font-weight:700;">${section.title}</h3>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

                            ${fieldsHtml}

                        </div>

                    </div>`;

            });

            contentArea.innerHTML = `

                <div class="card">

                    <h2 class="card-title"><i class="fas fa-handcuffs"></i> Générateur de PVI</h2>

                    <p style="color:#666;margin-bottom:24px;font-size:14px;">Remplissez tous les champs, puis cliquez sur <strong>Générer</strong> pour valider. Vous pourrez modifier vos réponses avant l\'export final.</p>

                    <div id="pvi-alert" class="pub-alert" role="status" style="margin-bottom:16px;"></div>

                    ${sectionsHtml}

                    <div style="display:flex;justify-content:flex-end;margin-top:24px;">

                        <button type="button" class="btn btn-primary" id="pvi-validate-btn"><i class="fas fa-check"></i> Générer le PVI</button>

                    </div>

                </div>`;

            document.getElementById('pvi-validate-btn').onclick = () => {

                saveAllAnswers();

                const missing = allQuestions.filter((q) => q.required && !answers[q.id]?.trim());

                if (missing.length > 0) {

                    const alertEl = document.getElementById('pvi-alert');

                    alertEl.className = 'pub-alert pub-alert--err';

                    alertEl.innerHTML = '<strong>' + missing.length + ' champ(s) obligatoire(s) manquant(s) :</strong> ' + missing.map((q) => '"' + q.label + '"').join(', ');

                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    return;

                }

                renderReview();

            };

        }

        function renderReview() {

            let rows = '';

            allQuestions.forEach((q) => {

                const val = answers[q.id] || '--';

                rows += `

                    <tr>

                        <td style="padding:10px 14px;border-bottom:1px solid var(--pm-border);font-weight:600;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(q.label)}</td>

                        <td style="padding:10px 14px;border-bottom:1px solid var(--pm-border);font-size:14px;max-width:500px;word-break:break-word;">${escapeHtml(val)}</td>

                    </tr>`;

            });

            contentArea.innerHTML = `

                <div class="card">

                    <h2 class="card-title"><i class="fas fa-clipboard-check"></i> Vérification des réponses</h2>

                    <p style="color:#666;margin-bottom:20px;font-size:14px;">Vérifiez vos réponses ci-dessous. Si tout est correct, cliquez sur <strong>Générer le PVI</strong>. Vous pouvez aussi modifier une réponse.</p>

                    <div style="overflow-x:auto;">

                        <table style="width:100%;border-collapse:collapse;background:var(--pm-pub-card);border:1px solid var(--pm-pub-border);border-radius:12px;overflow:hidden;">

                            ${rows}

                        </table>

                    </div>

                    <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap;justify-content:space-between;">

                        <button type="button" class="btn btn-secondary" id="pvi-back-btn"><i class="fas fa-arrow-left"></i> Modifier mes réponses</button>

                        <button type="button" class="btn btn-primary" id="pvi-generate-btn"><i class="fas fa-file-alt"></i> Générer le PVI</button>

                    </div>

                </div>`;

            document.getElementById('pvi-back-btn').onclick = () => renderForm();

            document.getElementById('pvi-generate-btn').onclick = () => generatePVI();

        }

        function generatePVI() {

            const d = new Date();

            const dateStr = answers.dateFaits ? answers.dateFaits.split('-').reverse().join('/') : d.toLocaleDateString('fr-FR');

            const dateLong = answers.dateFaits

                ? new Date(answers.dateFaits).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

                : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

            const matricule = currentUser?.rio || '--';

            const grade = currentUser?.grade || '--';

            const infractions = (answers.infractions || '').split('\n').filter((l) => l.trim()).map((l) => '* **' + l.trim() + ' ;**').join('\n');

            const preuves = (answers.preuves || '').split('\n').filter((l) => l.trim()).map((l) => '* **' + l.trim() + ' ;**').join('\n');

            const pvi = `# PROCèS-VERBAL DE PLACEMENT EN GARDE à VUE

**POLICE MUNICIPALE -- UNITé ${answers.indicatif || 'CSU'}**

**Date : ${dateLong}**

## I -- AGENT RÉDACTEUR ET OFFICIER DE POLICE JUDICIAIRE

Nous, soussigné :

**${grade} ${answers.nomOPJ || '--'}**

**${grade} de la Police Municipale -- Officier de Police Judiciaire (OPJ)**

Matricule : **${matricule}**

Unité / indicatif : **${answers.indicatif || 'CSU'}**

Agissant en qualité d'**Officier de Police Judiciaire**, rapportons les faits, constatations et opérations ayant conduit à l'interpellation et au placement en garde à vue de la personne désignée ci-après.

---

## II -- IDENTITà DE LA PERSONNE INTERPELLÉE

**Nom :** ${answers.nomIndividu || '--'}

**Prénom :** ${answers.prenomIndividu || '--'}

**Date de naissance :** ${answers.dateNaissance ? new Date(answers.dateNaissance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '--'}

**Lieu de naissance :** ${answers.lieuNaissance || '--'}

**Nationalité :** ${answers.nationalite || '--'}

**Domicile :** ${answers.adresse || '--'}

---

## III -- CIRCONSTANCES DE L'INTERVENTION

Le **${dateLong} à ${answers.heureFaits || '--'}**, alors que nous effectuions notre vacation sous l'indicatif **${answers.indicatif || 'CSU'}**, à bord d'un **${answers.typeVehicule || '--'} ${answers.serigraphie || '--'}**, avec à son bord **${answers.agents || '--'}**, nous avons été requis par la station directrice à la suite d'un signalement concernant ${answers.motifControle || 'des faits'}.

${answers.description ? 'Le signalement faisait état : ' + answers.description + '.\n\n' : ''}à notre arrivée dans le secteur de **${answers.lieu || '--'}**, nous avons identifié un individu correspondant à la description communiquée.

${answers.fuite === 'Oui' ? "à la vue des forces de l'ordre, l'individu a pris la fuite.\n\nNous avons alors activé les avertisseurs sonores et lumineux du véhicule de service et avons entrepris de suivre l'intéressé, lequel a refusé de se soumettre aux injonctions des fonctionnaires." + (answers.refusObtemperer === 'Oui' ? "\n\nUn **refus d'obtempérer** a ainsi été constaté." : '') : ''}

${answers.circumstances ? answers.circumstances + '.' : ''}

${answers.usageForce === 'Oui' ? "Un usage de la force a été nécessaire pour maîtriser l'intéressé." : "Aucun usage de la force n'a été nécessaire. L'intéressé s'est montré calme lors de sa prise en charge."}

---

## IV -- DÉCLARATIONS DE L'INTÉRESSÉ

à la suite de son accident et de son interpellation, **${answers.prenomIndividu || '--'} ${answers.nomIndividu || '--'}** a été auditionné.

Ces déclarations ont été prises en compte parmi les éléments recueillis dans le cadre de la procédure.

---

## V -- PALPATION, FOUILLE ET SAISIES

Une palpation de sécurité a été effectuée sur l'intéressé à **${answers.heurePalpation || '--'}**.

Cette palpation a permis de découvrir :

${answers.resultatPalpation ? answers.resultatPalpation.split('\n').filter((l) => l.trim()).map((l) => '* **' + l.trim() + ' ;**').join('\n') : '* **éléments saisis ;**'}

${answers.fouille === 'Oui' ? "Une fouille complémentaire de l'intéressé a été effectuée" + (answers.fouilleResultat ? ' et ' + answers.fouilleResultat.toLowerCase() : '') + '.' : ''}

---

## VI -- INFRACTIONS RETENUES

Au regard des constatations effectuées et des éléments recueillis, les faits susceptibles d'être reprochés à **${answers.prenomIndividu || '--'} ${answers.nomIndividu || '--'}** sont les suivants :

${infractions || '* **Infractions à déterminer ;**'}

---

## VII -- éLÉMENTS DE PREUVE

Sont susceptibles d'être exploités dans le cadre de la procédure :

${preuves || '* Les constatations effectuées par les fonctionnaires intervenants ;'}

---

## VIII -- NOTIFICATION DES DROITS

à **${answers.heureNotifDroits || '--'}**, **${answers.nomOPJ || '--'}**, agissant en qualité d'**Officier de Police Judiciaire**, a procédé à la notification des droits de la personne placée en garde à vue à **${answers.prenomIndividu || '--'} ${answers.nomIndividu || '--'}**.

L'intéressé a déclaré avoir **compris les droits qui lui étaient notifiés**.

${answers.droits || "L'intéressé a été informé de l'ensemble de ses droits conformément à la loi."}

---

## IX -- PLACEMENT EN GARDE à VUE

à **${answers.heureGAV || '--'}**, **${answers.nomOPJ || '--'}**, agissant en qualité d'**Officier de Police Judiciaire**, a décidé du **placement en garde à vue de ${answers.prenomIndividu || '--'} ${answers.nomIndividu || '--'}** au regard des éléments recueillis et des nécessités de la procédure.

L'intéressé a été conduit au **Commissariat de la Police Nationale**, où il a été placé à disposition dans le cadre de la procédure.

La garde à vue est maintenue dans l'attente des suites de la procédure, notamment de l'audition de l'intéressé.

---

## X -- ÉTAT DE L'INTÉRESSÉ

${answers.etatIntegrite || "Lors de sa prise en charge, l'intéressé ne présentait aucune blessure apparente."}

---

## XI -- CLÉTURE

De tout ce qui précède, nous avons établi le présent procès-verbal afin de rendre compte fidèlement des circonstances de l'intervention, de l'interpellation, de la notification des droits et du placement en garde à vue de **${answers.prenomIndividu || '--'} ${answers.nomIndividu || '--'}**.

${answers.suiteProcedure || 'La personne concernée est placée en garde à vue.'}

Fait le **${dateLong}**.

### OFFICIER DE POLICE JUDICIAIRE

**${grade} ${answers.nomOPJ || '--'}**

${grade} de la Police Municipale

OPJ -- Matricule **${matricule}**

Unité **${answers.indicatif || 'CSU'}**

**Signature :**

---`;

            showPVIGenerated(pvi);

        }

        function showPVIGenerated(pviText) {

            contentArea.innerHTML = `

                <div class="card">

                    <h2 class="card-title"><i class="fas fa-check-circle" style="color:#22c55e;"></i> PVI Généré</h2>

                    <div style="max-width:900px;margin:0 auto;">

                        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;">

                            <p style="margin:0;color:#166534;font-size:14px;"><i class="fas fa-info-circle"></i> Votre Procès-Verbal a été généré. Vous pouvez le copier, le télécharger en PDF, ou revenir en arrière pour modifier.</p>

                        </div>

                        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">

                            <button type="button" class="btn btn-secondary" id="pvi-back-review-btn"><i class="fas fa-arrow-left"></i> Modifier mes réponses</button>

                            <button type="button" class="btn btn-primary" id="pvi-copy-btn"><i class="fas fa-copy"></i> Copier le texte</button>

                            <button type="button" class="btn btn-secondary" id="pvi-pdf-btn"><i class="fas fa-file-pdf"></i> Télécharger PDF</button>

                            <button type="button" class="btn btn-secondary" id="pvi-restart-btn"><i class="fas fa-redo"></i> Nouveau PVI</button>

                        </div>

                        <textarea id="pvi-final-text" style="width:100%;min-height:500px;padding:16px;border:1px solid var(--pm-border);border-radius:8px;font-family:monospace;font-size:13px;line-height:1.6;resize:vertical;white-space:pre-wrap;" autocomplete="off">${escapeHtml(pviText)}</textarea>

                    </div>

                </div>`;

            document.getElementById('pvi-back-review-btn').onclick = () => renderReview();

            document.getElementById('pvi-copy-btn').onclick = () => {

                const ta = document.getElementById('pvi-final-text');

                ta.select();

                document.execCommand('copy');

                alert('Texte copié dans le presse-papier !');

            };

            document.getElementById('pvi-restart-btn').onclick = () => {

                answers = {};

                renderForm();

            };

            document.getElementById('pvi-pdf-btn')?.addEventListener('click', () => {

                window.telechargerPVI_pdf();

            });

        }

        renderForm();

    }

    window.telechargerPVI_pdf = function () {

        const el = document.getElementById('pvi-final-text');

        const raw = el ? (el.value || el.textContent || '') : '';

        if (!raw.trim()) { alert("Aucun texte à exporter. Générez d'abord le PVI."); return; }

        const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

        if (!JsPDF) { alert('Bibliothèque PDF non chargée.'); return; }

        const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });

        const W = 210, M = 20, CW = W - 2 * M;

        let y = 25;

        function addPageIfNeeded(h) {

            if (y + (h || 6) > 280) { doc.addPage(); y = 25; }

        }

        function writeBold(text, x, yPos) {

            doc.setFont('times', 'bold');

            doc.text(text, x, yPos);

            doc.setFont('times', 'normal');

        }

        function clean(text) {

            return text.replace(/\*\*/g, '').replace(/^[#]+ /, '').trim();

        }

        const mdLines = raw.split('\n');

        for (let i = 0; i < mdLines.length; i++) {

            const line = mdLines[i].replace(/\u00a0/g, ' ').trimEnd();

            if (line === '---') {

                addPageIfNeeded(10);

                y += 2;

                doc.setDrawColor(180, 180, 180);

                doc.line(M, y, W - M, y);

                y += 5;

                continue;

            }

            if (line === '') { y += 2; continue; }

            const h3Match = line.match(/^### (.+)/);

            const h2Match = line.match(/^## (.+)/);

            const h1Match = line.match(/^# (.+)/);

            if (h1Match) {

                addPageIfNeeded(14);

                y += 4;

                doc.setFontSize(15);

                writeBold(clean(h1Match[1]), M, y);

                y += 8;

                doc.setFontSize(11);

                continue;

            }

            if (h2Match) {

                addPageIfNeeded(12);

                y += 3;

                doc.setFontSize(13);

                writeBold(clean(h2Match[1]), M, y);

                y += 7;

                doc.setFontSize(11);

                continue;

            }

            if (h3Match) {

                addPageIfNeeded(10);

                y += 2;

                doc.setFontSize(12);

                writeBold(clean(h3Match[1]), M, y);

                y += 6;

                doc.setFontSize(11);

                continue;

            }

            const plain = clean(line);

            if (!plain) continue;

            const parts = [];

            const re = /\*\*(.+?)\*\*/g;

            let last = 0, m;

            while ((m = re.exec(plain)) !== null) {

                if (m.index > last) parts.push({ t: plain.slice(last, m.index), b: false });

                parts.push({ t: m[1], b: true });

                last = re.lastIndex;

            }

            if (last < plain.length) parts.push({ t: plain.slice(last), b: false });

            const wrapped = doc.splitTextToSize(parts.map((p) => p.t).join(''), CW);

            for (const wl of wrapped) {

                addPageIfNeeded();

                let cx = M;

                for (const p of parts) {

                    const pLines = doc.splitTextToSize(p.t, CW);

                    const txt = pLines[0] || '';

                    if (p.b) {

                        doc.setFont('times', 'bold');

                    }

                    doc.text(txt, cx, y);

                    cx += doc.getTextWidth(txt);

                    if (p.b) {

                        doc.setFont('times', 'normal');

                    }

                }

                y += 5;

            }

        }

        doc.save('PVI_' + new Date().toISOString().slice(0, 10) + '.pdf');

    };

    function renderRapportSaisie() {

        const rapports = JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY) || '[]');

        const saisies = rapports.filter(r=>r.type==='saisie');

        contentArea.innerHTML = `

            <div class="card">

                <div class="card-header"><h2 class="card-title"><i class="fas fa-clipboard-list"></i> Rapport de Saisie</h2><button class="btn btn-primary" id="btn-show-saisie-form"><i class="fas fa-plus"></i> Nouveau rapport</button></div>

                <div id="saisie-form" style="display:none; margin-bottom:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f8fafc;">

                    <h3 class="card-title">Formulaire de saisie</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Date de saisie *</label><input type="date" id="saisie-date" value="${new Date().toISOString().split('T')[0]}"></div>

                        <div class="form-group"><label>Heure *</label><input type="time" id="saisie-heure" value="${new Date().toTimeString().slice(0,5)}"></div>

                        <div class="form-group"><label>Lieu de la saisie *</label><input type="text" id="saisie-lieu" placeholder="Ex : Rue de la République"></div>

                        <div class="form-group"><label>Nature de la saisie *</label><select id="saisie-nature"><option value="">-- Choisir --</option><option>Stupéfiants</option><option>Arme blanche</option><option>Arme à feu</option><option>Objet volé</option><option>Véhicule</option><option>Numéraire</option><option>Autre</option></select></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Description / Objet(s) saisi(s) *</label><textarea id="saisie-objet" rows="3" placeholder="Description précise des objets saisis..."></textarea></div>

                        <div class="form-group"><label>Quantité / Poids</label><input type="text" id="saisie-qte" placeholder="Ex : 120g, 2 unités"></div>

                        <div class="form-group"><label>Agent saisissant *</label><input type="text" id="saisie-agent" value="${escapeHtml(currentUser.prenom+' '+currentUser.nom)}"></div>

                        <div class="form-group"><label>OPJ référent</label><input type="text" id="saisie-opj" placeholder="Nom de l'OPJ"></div>

                        <div class="form-group"><label>Webhook Discord (optionnel)</label><input type="url" id="saisie-webhook" placeholder="https://discord.com/api/webhooks/..." value="${escapeHtml(currentUser.webhookUrl||'')}"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Observations</label><textarea id="saisie-obs" rows="3" placeholder="Circonstances, scellés, suite judiciaire..."></textarea></div>

                    </div>

                    <div style="display:flex; gap:10px; margin-top:16px;"><button class="btn btn-success" id="btn-save-saisie"><i class="fas fa-save"></i> Enregistrer</button><button class="btn btn-secondary" id="btn-cancel-saisie">Annuler</button><button class="btn btn-primary" id="btn-pdf-saisie" style="margin-left:auto;"><i class="fas fa-file-pdf"></i> PDF</button></div>

                </div>

                <div id="saisie-list">${saisies.length===0?'<p style="text-align:center; color:#666; padding:20px;">Aucun rapport de saisie.</p>': saisies.slice().reverse().map(r=>`<div class="card" style="border-left:4px solid #2563eb; margin-bottom:12px;"><div style="display:flex; justify-content:space-between;"><b>${escapeHtml(r.lieu)} -- ${escapeHtml(r.nature)}</b><span style="font-size:11px; color:#666;">${escapeHtml(r.date)} ${escapeHtml(r.heure||'')}</span></div><div style="font-size:13px; margin-top:6px;"><b>Objet:</b> ${escapeHtml(r.objet)} -- <b>Qte:</b> ${escapeHtml(r.qte||'--')}</div><div style="font-size:12px; color:#666; margin-top:4px;"><b>Agent:</b> ${escapeHtml(r.agent)}${r.opj?' -- <b>OPJ:</b> '+escapeHtml(r.opj):''}</div><div style="font-size:12px; margin-top:6px; white-space:pre-wrap;">${escapeHtml(r.obs||'')}</div><div style="text-align:right; margin-top:8px;"><button class="btn btn-secondary btn-sm" onclick="deleteRapport('${r.id}')">Supprimer</button></div></div>`).join('')}</div>

            </div>`;

        document.getElementById('btn-show-saisie-form').onclick=()=>document.getElementById('saisie-form').style.display='block';

        document.getElementById('btn-cancel-saisie').onclick=()=>document.getElementById('saisie-form').style.display='none';

        document.getElementById('btn-save-saisie').onclick=()=>{

            const rec={id:Date.now().toString(), type:'saisie', timestamp:new Date().toISOString(), date:document.getElementById('saisie-date').value, heure:document.getElementById('saisie-heure').value, lieu:document.getElementById('saisie-lieu').value.trim(), nature:document.getElementById('saisie-nature').value, objet:document.getElementById('saisie-objet').value.trim(), qte:document.getElementById('saisie-qte').value.trim(), agent:document.getElementById('saisie-agent').value.trim(), opj:document.getElementById('saisie-opj').value.trim(), webhook:document.getElementById('saisie-webhook').value.trim(), obs:document.getElementById('saisie-obs').value.trim(), auteur: currentUser.rio };

            if(!rec.date||!rec.lieu||!rec.nature||!rec.objet||!rec.agent) return alert('Veuillez remplir les champs obligatoires (*).');

            const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]'); all.push(rec); pmLocalStorage.setItem(RAPPORTS_KEY, JSON.stringify(all));
                                if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
try{ const _nt = (typeof type !== 'undefined' ? type : (typeof rapportType !== 'undefined' ? rapportType : 'rapport')); pmAddNotification(_nt==='incident'?'incident':_nt==='saisie'?'saisie':_nt==='tir'?'tir':_nt==='interpellation'?'interpellation':'rapport', 'Nouveau rapport — '+String(_nt).toUpperCase(), `${currentUser.prenom} ${currentUser.nom} a depose un rapport ${_nt}`); }catch(e){}

            const whGlobal = pmGetWebhookUrl('saisie');

            const whToUse = rec.webhook || whGlobal;

            if(whToUse){ fetch(whToUse,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[SAISIE]** ${rec.nature} -- ${rec.lieu} le ${rec.date} par ${rec.agent}\nObjet: ${rec.objet} (${rec.qte})`, username:'PM Rapport'})}).catch(()=>{}); }

            addLog('Rapport de saisie', rec.lieu); renderRapportSaisie();

        };

        document.getElementById('btn-pdf-saisie').onclick=()=>{

            const {jsPDF}=window.jspdf||{}; if(!jsPDF) return alert('jsPDF non chargé');

            const doc=new jsPDF(); doc.setFontSize(14); doc.text('POLICE MUNICIPALE -- RAPPORT DE SAISIE',14,20); doc.setFontSize(10);

            const d=document.getElementById('saisie-date').value, h=document.getElementById('saisie-heure').value, l=document.getElementById('saisie-lieu').value, n=document.getElementById('saisie-nature').value, o=document.getElementById('saisie-objet').value, q=document.getElementById('saisie-qte').value, a=document.getElementById('saisie-agent').value, op=document.getElementById('saisie-opj').value, ob=document.getElementById('saisie-obs').value;

            let y=30; const lines=[`Date/Heure: ${d} ${h}`,`Lieu: ${l}`,`Nature: ${n}`,`Objet: ${o}`,`Quantité: ${q}`,`Agent: ${a}`,`OPJ: ${op}`,`Observations:`,...doc.splitTextToSize(ob||'--',180)];

            lines.forEach(line=>{ doc.text(line,14,y); y+=7; if(y>280){doc.addPage(); y=20;}});

            doc.save(`saisie_${d||'rapport'}.pdf`);

        };

        window.deleteRapport=(id)=>{ if(!confirm('Supprimer ce rapport ?')) return; const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]'); pmLocalStorage.setItem(RAPPORTS_KEY, JSON.stringify(all.filter(r=>r.id!==id)));             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
renderRapportSaisie(); };

    }

    function renderRapportTir() {

        const rapports = JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY) || '[]');

        const tirs = rapports.filter(r=>r.type==='tir');

        contentArea.innerHTML = `

            <div class="card">

                <div class="card-header"><h2 class="card-title"><i class="fas fa-crosshairs"></i> Rapport de Tir</h2><button class="btn btn-primary" id="btn-show-tir-form"><i class="fas fa-plus"></i> Nouveau rapport</button></div>

                <div id="tir-form" style="display:none; margin-bottom:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#fff5f5;">

                    <h3 class="card-title">Formulaire de tir</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Date *</label><input type="date" id="tir-date" value="${new Date().toISOString().split('T')[0]}"></div>

                        <div class="form-group"><label>Heure *</label><input type="time" id="tir-heure" value="${new Date().toTimeString().slice(0,5)}"></div>

                        <div class="form-group"><label>Lieu *</label><input type="text" id="tir-lieu" placeholder="Stand de tir / Lieu d\'intervention"></div>

                        <div class="form-group"><label>Type d\'arme *</label><select id="tir-arme"><option value="">-- Choisir --</option><option>PA 9mm</option><option>LBD</option><option>PIE</option><option>Fusil d\'assaut</option><option>Autre</option></select></div>

                        <div class="form-group"><label>Nombre de cartouches *</label><input type="number" id="tir-nb" min="1" placeholder="Ex: 3"></div>

                        <div class="form-group"><label>Distance de tir</label><input type="text" id="tir-distance" placeholder="Ex: 15m"></div>

                        <div class="form-group"><label>Motif / Contexte *</label><input type="text" id="tir-motif" placeholder="Ex: Entraînement, Légitime défense"></div>

                        <div class="form-group"><label>Webhook Discord (optionnel)</label><input type="url" id="tir-webhook" placeholder="https://discord.com/api/webhooks/..." value="${escapeHtml(currentUser.webhookUrl||'')}"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Résultat / Observations *</label><textarea id="tir-obs" rows="3" placeholder="Résultat du tir, impacts, suite..."></textarea></div>

                    </div>

                    <div style="display:flex; gap:10px; margin-top:16px;"><button class="btn btn-success" id="btn-save-tir"><i class="fas fa-save"></i> Enregistrer</button><button class="btn btn-secondary" id="btn-cancel-tir">Annuler</button><button class="btn btn-primary" id="btn-pdf-tir" style="margin-left:auto;"><i class="fas fa-file-pdf"></i> PDF</button></div>

                </div>

                <div id="tir-list">${tirs.length===0?'<p style="text-align:center; color:#666; padding:20px;">Aucun rapport de tir.</p>': tirs.slice().reverse().map(r=>`<div class="card" style="border-left:4px solid #dc2626; margin-bottom:12px;"><div style="display:flex; justify-content:space-between;"><b>${escapeHtml(r.lieu)} -- ${escapeHtml(r.arme)} (${escapeHtml(r.nb)} cart.)</b><span style="font-size:11px; color:#666;">${escapeHtml(r.date)} ${escapeHtml(r.heure||'')}</span></div><div style="font-size:13px; margin-top:6px;"><b>Motif:</b> ${escapeHtml(r.motif)} -- <b>Distance:</b> ${escapeHtml(r.distance||'--')}</div><div style="font-size:12px; margin-top:6px; white-space:pre-wrap;">${escapeHtml(r.obs||'')}</div><div style="text-align:right; margin-top:8px;"><button class="btn btn-secondary btn-sm" onclick="deleteRapport('${r.id}')">Supprimer</button></div></div>`).join('')}</div>

            </div>`;

        document.getElementById('btn-show-tir-form').onclick=()=>document.getElementById('tir-form').style.display='block';

        document.getElementById('btn-cancel-tir').onclick=()=>document.getElementById('tir-form').style.display='none';

        document.getElementById('btn-save-tir').onclick=()=>{

            const rec={id:Date.now().toString(), type:'tir', timestamp:new Date().toISOString(), date:document.getElementById('tir-date').value, heure:document.getElementById('tir-heure').value, lieu:document.getElementById('tir-lieu').value.trim(), arme:document.getElementById('tir-arme').value, nb:document.getElementById('tir-nb').value.trim(), distance:document.getElementById('tir-distance').value.trim(), motif:document.getElementById('tir-motif').value.trim(), webhook:document.getElementById('tir-webhook').value.trim(), obs:document.getElementById('tir-obs').value.trim(), auteur: currentUser.rio };

            if(!rec.date||!rec.lieu||!rec.arme||!rec.nb||!rec.motif||!rec.obs) return alert('Champs obligatoires manquants (*).');

            const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]'); all.push(rec); pmLocalStorage.setItem(RAPPORTS_KEY, JSON.stringify(all));
                                if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
try{ const _nt = (typeof type !== 'undefined' ? type : (typeof rapportType !== 'undefined' ? rapportType : 'rapport')); pmAddNotification(_nt==='incident'?'incident':_nt==='saisie'?'saisie':_nt==='tir'?'tir':'rapport', 'Nouveau rapport — '+String(_nt).toUpperCase(), `${currentUser.prenom} ${currentUser.nom} a depose un rapport ${_nt}`); }catch(e){}

            const whGlobalTir = pmGetWebhookUrl('tir');

            const whToUseTir = rec.webhook || whGlobalTir;

            if(whToUseTir){ fetch(whToUseTir,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[TIR]** ${rec.arme} -- ${rec.lieu} le ${rec.date} (${rec.nb} cart.) Motif: ${rec.motif}`, username:'PM Rapport'})}).catch(()=>{}); }

            addLog('Rapport de tir', rec.lieu); renderRapportTir();

        };

        document.getElementById('btn-pdf-tir').onclick=()=>{

            const {jsPDF}=window.jspdf||{}; if(!jsPDF) return alert('jsPDF non chargé');

            const doc=new jsPDF(); doc.setFontSize(14); doc.text('POLICE MUNICIPALE -- RAPPORT DE TIR',14,20); doc.setFontSize(10);

            const d=document.getElementById('tir-date').value, h=document.getElementById('tir-heure').value, l=document.getElementById('tir-lieu').value, a=document.getElementById('tir-arme').value, nb=document.getElementById('tir-nb').value, dist=document.getElementById('tir-distance').value, m=document.getElementById('tir-motif').value, ob=document.getElementById('tir-obs').value;

            let y=30; const lines=[`Date/Heure: ${d} ${h}`,`Lieu: ${l}`,`Arme: ${a}`,`Cartouches: ${nb}`,`Distance: ${dist}`,`Motif: ${m}`,`Observations:`,...doc.splitTextToSize(ob||'--',180)];

            lines.forEach(line=>{ doc.text(line,14,y); y+=7; if(y>280){doc.addPage(); y=20;}});

            doc.save(`tir_${d||'rapport'}.pdf`);

        };

    }

    function renderRapportIncident() {

        const rapports = JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY) || '[]');

        const incidents = rapports.filter(r=>r.type==='incident');

        contentArea.innerHTML = `

            <div class="card">

                <div class="card-header"><h2 class="card-title"><i class="fas fa-triangle-exclamation"></i> Rapport d\'incident</h2><button class="btn btn-primary" id="btn-show-incident-form"><i class="fas fa-plus"></i> Nouveau rapport</button></div>

                <div id="incident-form" style="display:none; margin-bottom:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#fffbeb;">

                    <div class="form-grid">

                        <div class="form-group"><label>Date *</label><input type="date" id="inc-date" value="${new Date().toISOString().split('T')[0]}"></div>

                        <div class="form-group"><label>Heure *</label><input type="time" id="inc-heure" value="${new Date().toTimeString().slice(0,5)}"></div>

                        <div class="form-group"><label>Lieu *</label><input type="text" id="inc-lieu" placeholder="Lieu de l\'incident"></div>

                        <div class="form-group"><label>Type d\'incident *</label><select id="inc-type"><option value="">-- Choisir --</option><option>Altercation</option><option>Refus d\'obtempérer</option><option>Outrage</option><option>Dégradation</option><option>Blessure</option><option>Autre</option></select></div>

                        <div class="form-group"><label>Agents présents</label><input type="text" id="inc-agents" placeholder="Noms / RIO"></div>

                        <div class="form-group"><label>Webhook Discord (optionnel)</label><input type="url" id="inc-webhook" placeholder="https://discord.com/api/webhooks/..." value="${escapeHtml(currentUser.webhookUrl||'')}"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Description détaillée *</label><textarea id="inc-desc" rows="4" placeholder="Circonstances, faits, mesures prises..."></textarea></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Suite donnée</label><input type="text" id="inc-suite" placeholder="Ex: Rapport transmis OPJ, main courante..."></div>

                    </div>

                    <div style="display:flex; gap:10px; margin-top:16px;"><button class="btn btn-success" id="btn-save-incident"><i class="fas fa-save"></i> Enregistrer</button><button class="btn btn-secondary" id="btn-cancel-incident">Annuler</button><button class="btn btn-primary" id="btn-pdf-incident" style="margin-left:auto;"><i class="fas fa-file-pdf"></i> PDF</button></div>

                </div>

                <div id="inc-list">${incidents.length===0?'<p style="text-align:center; color:#666; padding:20px;">Aucun rapport d\'incident.</p>': incidents.slice().reverse().map(r=>`<div class="card" style="border-left:4px solid #f59e0b; margin-bottom:12px;"><div style="display:flex; justify-content:space-between;"><b>${escapeHtml(r.lieu)} -- ${escapeHtml(r.incType)}</b><span style="font-size:11px; color:#666;">${escapeHtml(r.date)} ${escapeHtml(r.heure||'')}</span></div><div style="font-size:13px; margin-top:6px; white-space:pre-wrap;">${escapeHtml(r.desc)}</div><div style="font-size:12px; color:#666; margin-top:4px;">Agents: ${escapeHtml(r.agents||'--')} -- Suite: ${escapeHtml(r.suite||'--')}</div><div style="text-align:right; margin-top:8px;"><button class="btn btn-secondary btn-sm" onclick="deleteRapport('${r.id}')">Supprimer</button></div></div>`).join('')}</div>

            </div>`;

        document.getElementById('btn-show-incident-form').onclick=()=>document.getElementById('incident-form').style.display='block';

        document.getElementById('btn-cancel-incident').onclick=()=>document.getElementById('incident-form').style.display='none';

        document.getElementById('btn-save-incident').onclick=()=>{

            const rec={id:Date.now().toString(), type:'incident', timestamp:new Date().toISOString(), date:document.getElementById('inc-date').value, heure:document.getElementById('inc-heure').value, lieu:document.getElementById('inc-lieu').value.trim(), incType:document.getElementById('inc-type').value, agents:document.getElementById('inc-agents').value.trim(), webhook:document.getElementById('inc-webhook').value.trim(), desc:document.getElementById('inc-desc').value.trim(), suite:document.getElementById('inc-suite').value.trim(), auteur: currentUser.rio };

            if(!rec.date||!rec.lieu||!rec.incType||!rec.desc) return alert('Champs obligatoires manquants');

            const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]'); all.push(rec); pmLocalStorage.setItem(RAPPORTS_KEY, JSON.stringify(all));
                                if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
try{ const _nt = (typeof type !== 'undefined' ? type : (typeof rapportType !== 'undefined' ? rapportType : 'rapport')); pmAddNotification(_nt==='incident'?'incident':_nt==='saisie'?'saisie':_nt==='tir'?'tir':'rapport', 'Nouveau rapport — '+String(_nt).toUpperCase(), `${currentUser.prenom} ${currentUser.nom} a depose un rapport ${_nt}`); }catch(e){}

            if(rec.webhook){ fetch(rec.webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[INCIDENT]** ${rec.incType} -- ${rec.lieu} le ${rec.date}`, username:'PM Rapport'})}).catch(()=>{}); }

            addLog('Rapport incident', rec.lieu); renderRapportIncident();

        };

        document.getElementById('btn-pdf-incident').onclick=()=>{

            const {jsPDF}=window.jspdf||{}; if(!jsPDF) return alert('jsPDF non chargé');

            const doc=new jsPDF(); doc.setFontSize(13); doc.text('POLICE MUNICIPALE -- RAPPORT D\'INCIDENT',14,20); doc.setFontSize(10);

            const d=document.getElementById('inc-date').value, h=document.getElementById('inc-heure').value, l=document.getElementById('inc-lieu').value, tp=document.getElementById('inc-type').value, ag=document.getElementById('inc-agents').value, ds=document.getElementById('inc-desc').value, su=document.getElementById('inc-suite').value;

            let y=30; [ `Date/Heure: ${d} ${h}`, `Lieu: ${l}`, `Type: ${tp}`, `Agents: ${ag}`, `Description:`, ...doc.splitTextToSize(ds||'--',180), `Suite: ${su}` ].forEach(line=>{ doc.text(line,14,y); y+=6; if(y>280){doc.addPage(); y=20;}});

            doc.save(`incident_${d}.pdf`);

        };

    }

    function renderReceptionRapports(){
        if(!isPmTriadeLead(refreshCurrentUser())){ contentArea.innerHTML=`<div class="card"><p>Acces reserve a la Direction (DPM/DRA/CDP).</p></div>`; return; }
        const all=JSON.parse(pmLocalStorage.getItem(RAPPORTS_KEY)||'[]');
        const incidents=all.filter(r=>r.type==='incident').slice().reverse();
        const notifKey='RECEPTION_INCIDENT_READ';
        const readRaw=pmLocalStorage.getItem(notifKey)||'[]';
        let readSet=new Set();
        try{ readSet=new Set(JSON.parse(readRaw)); }catch(e){}
        const unread=incidents.filter(r=>!readSet.has(String(r.id))).length;
        contentArea.innerHTML=`            <div class="card">
                <div class="card-header"><h2 class="card-title"><i class="fas fa-inbox"></i> Reception — Rapports d'incident <span style="background:#dc2626; color:#fff; padding:2px 8px; border-radius:12px; font-size:12px; margin-left:8px;">${unread} non lu${unread>1?'s':''}</span></h2>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm" id="btn-mark-all-read-reception"><i class="fas fa-check-double"></i> Tout marquer lu</button>
                        <button class="btn btn-primary btn-sm" onclick="window.__pmGoSection('rapport-incident')"><i class="fas fa-plus"></i> Voir formulaire</button>
                    </div>
                </div>
                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <input type="text" id="search-reception" placeholder="Rechercher (lieu, type, auteur...)" style="flex:1; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px;">
                    <span style="font-size:12px; color:#64748b; align-self:center;">${incidents.length} rapport(s)</span>
                </div>
                <div id="reception-list">${incidents.length===0?'<p style="text-align:center; color:#666; padding:24px;">Aucun rapport d\'incident recu.</p>':incidents.map(r=>{
                    const isRead=readSet.has(String(r.id));
                    return `<div class="card reception-card" data-search="${escapeHtml((r.lieu+' '+r.incType+' '+r.desc+' '+r.auteur).toLowerCase())}" style="border-left:4px solid ${isRead?'#94a3b8':'#dc2626'}; background:${isRead?'#fff':'#fef2f2'}; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="color:${isRead?'#334155':'#991b1b'};">${escapeHtml(r.lieu)} — ${escapeHtml(r.incType)} ${isRead?'':'<span style="background:#dc2626; color:#fff; font-size:10px; padding:2px 6px; border-radius:8px; margin-left:6px;">NOUVEAU</span>'}</b>
                        <span style="font-size:11px; color:#64748b;">${escapeHtml(r.date||'')} ${escapeHtml(r.heure||'')} • ${escapeHtml(r.auteur||'')}</span>
                    </div>
                    <div style="font-size:13px; margin-top:6px; white-space:pre-wrap; color:#1e293b;">${escapeHtml(r.desc||'')}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:6px;">Agents: ${escapeHtml(r.agents||'--')} • Suite: ${escapeHtml(r.suite||'--')}</div>
                    <div style="display:flex; gap:8px; margin-top:10px; justify-content:flex-end;">
                        ${!isRead?`<button class="btn btn-primary btn-sm" onclick="markReceptionRead('${r.id}')"><i class="fas fa-check"></i> Marquer lu</button>`:''}
                        <button class="btn btn-secondary btn-sm" onclick="deleteRapport('${r.id}'); renderReceptionRapports();"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`}).join('')}</div>
            </div>`;
        const sInp=document.getElementById('search-reception');
        if(sInp){ sInp.addEventListener('input', (e)=>{ const q=e.target.value.toLowerCase(); document.querySelectorAll('.reception-card').forEach(c=>{ c.style.display=(c.dataset.search||'').includes(q)?'':'none'; }); }); }
        document.getElementById('btn-mark-all-read-reception').onclick=()=>{
            const allIds=incidents.map(r=>String(r.id));
            pmLocalStorage.setItem(notifKey, JSON.stringify(allIds));
            renderReceptionRapports(); refreshNotifBadge();
        };
        window.markReceptionRead=(id)=>{
            const cur=JSON.parse(pmLocalStorage.getItem(notifKey)||'[]');
            const set=new Set(cur.map(String));
            set.add(String(id));
            pmLocalStorage.setItem(notifKey, JSON.stringify([...set]));
            renderReceptionRapports(); refreshNotifBadge();
        };
        // also update global reception badge
        const badge=document.getElementById('notif-reception-badge');
        if(badge){ if(unread>0){ badge.textContent=unread>99?'99+':String(unread); badge.hidden=false; } else badge.hidden=true; }
    }

    function renderTrameStagiaire() {

        const KEY='PM_TRAME_STAGIAIRE';

        const STG_USERS = (()=>{ try{ const d=pmLocalStorage.getItem(STORAGE_KEY); const all=d?JSON.parse(d):[]; return all.filter(u=> String(u.grade||'').toUpperCase()==='STG').sort(compareUsersByGradeThenName); }catch(e){ return []; } })();

        const selectedMatricule = window.__trameSelectedMatricule || null;

        const saved=JSON.parse(pmLocalStorage.getItem(KEY)||'[]');

        // Si STG passe GRT, son espace est déjà supprimé via gestion comptes

        contentArea.innerHTML = `

            <div class="card">

                <div class="card-header"><h2 class="card-title"><i class="fas fa-graduation-cap"></i> Espaces Trames -- Stagiaires</h2><button class="btn btn-primary" id="btn-new-trame"><i class="fas fa-plus"></i> Nouvelle fiche</button></div>

                <div style="margin-bottom:14px; display:flex; flex-wrap:wrap; gap:8px;">

                    ${STG_USERS.length===0?'<span style="color:#999; font-size:13px;">Aucun stagiaire (grade STG) -- créez un compte STG pour générer son espace.</span>': STG_USERS.map(u=>`<button class="btn ${String(u.rio)===String(selectedMatricule)?'btn-primary':'btn-secondary'} btn-sm" onclick="window.__trameSelectedMatricule='${u.rio}'; renderTrameStagiaire();">${escapeHtml(u.grade)} ${escapeHtml(u.nom)} ${escapeHtml(u.prenom)} (${escapeHtml(String(u.rio))}) -- ${(() => { const k='PM_TRAME_STAGIAIRE'; const all=JSON.parse(pmLocalStorage.getItem(k)||'[]'); const cnt=all.filter(r=> String(r.matricule||'')===String(u.rio)).length; return cnt+' fiche(s)'; })()}</button>`).join('')}

                    ${selectedMatricule?`<button class="btn btn-secondary btn-sm" onclick="window.__trameSelectedMatricule=null; renderTrameStagiaire();">Voir tout</button>`:''}

                </div>

                <p style="color:#666; font-size:13px; margin-bottom:16px;">Document de suivi opérationnel et pédagogique -- Police Municipale. Remplissez, enregistrez et générez le PDF.</p>

                <div id="trame-form" style="display:none; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f8fafc; margin-bottom:20px;">

                    <h3 style="margin:0 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">1. Identification du stagiaire</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Nom *</label><input type="text" id="ts-nom"></div>

                        <div class="form-group"><label>Prénom *</label><input type="text" id="ts-prenom"></div>

                        <div class="form-group"><label>Matricule</label><input type="text" id="ts-matricule"></div>

                        <div class="form-group"><label>Date début stage</label><input type="date" id="ts-debut"></div>

                        <div class="form-group"><label>Tuteur / Agent référent *</label><input type="text" id="ts-tuteur"></div>

                        <div class="form-group"><label>Grade du tuteur</label><input type="text" id="ts-grade-tuteur" placeholder="Ex: BCP, BCH"></div>

                    </div>

                    <h3 style="margin:16px 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">2. Service</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Date de la garde *</label><input type="date" id="ts-date-garde" value="${new Date().toISOString().split('T')[0]}"></div>

                        <div class="form-group"><label>Unité / Service</label><input type="text" id="ts-unite"></div>

                        <div class="form-group"><label>Indicatif radio</label><select id="ts-indicatif">${OPTIONS_SELECT_INDICATIF_RADIO_HTML}</select></div>

                        <div class="form-group"><label>Horaires</label><input type="text" id="ts-horaires" placeholder="Ex: 08h00 -> 18h00"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Véhicule / équipage</label><input type="text" id="ts-vehicule"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Type de service</label><div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:4px;">

                            ${['Patrouille pédestre','Patrouille motorisée','Poste fixe','CSU / Vidéoprotection','Police de proximité','Mission spécifique'].map(v=>`<label style="display:flex;align-items:center;gap:6px; font-weight:400; font-size:13px;"><input type="checkbox" value="${v}" class="ts-type"> ${v}</label>`).join('')}

                            <input type="text" id="ts-type-autre" placeholder="Autre..." style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; width:180px;">

                        </div></div>

                    </div>

                    <h3 style="margin:16px 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">3. Prise de service & 4. Missions</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Heure prise de service</label><input type="time" id="ts-heure-prise"></div>

                        <div class="form-group"><label>Briefing effectué</label><select id="ts-briefing"><option value="">--</option><option>Oui</option><option>Non</option></select></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Consignes particulières</label><textarea id="ts-consignes" rows="2"></textarea></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Missions effectuées (Heure | Lieu | Nature | Rôle | Observations)</label><textarea id="ts-missions" rows="4" placeholder="Ex: 09h30 | Place République | Patrouille | Observation | RAS"></textarea></div>

                    </div>

                    <h3 style="margin:16px 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">5. Interventions</h3>

                    <div class="form-grid">

                        <div class="form-group"><label>Nombre d\'interventions</label><input type="number" id="ts-nb-inter" min="0" value="0"></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Nature des interventions</label><div style="display:flex; flex-wrap:wrap; gap:8px;">

                            ${["Trouble à l\'ordre public","Accident de circulation","Vol / tentative","Dégradation","Nuisances","Contrôle","Assistance à personne","Réquisition"].map(v=>`<label style="display:flex;align-items:center;gap:6px; font-weight:400; font-size:13px;"><input type="checkbox" value="${v}" class="ts-inter"> ${v}</label>`).join('')}

                        </div></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Intervention principale -- Déroulement</label><textarea id="ts-inter-principale" rows="3"></textarea></div>

                    </div>

                    <h3 style="margin:16px 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">6. Compétences observées</h3>

                    <div id="ts-competences" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">

                        ${['Présentation et tenue professionnelle','Respect de la hiérarchie','Communication radio','Communication avec le public','Respect des consignes','Maîtrise de soi','Observation et analyse','Travail en équipe','Connaissance des procédures','Réactivité','Rédaction administrative','Sécurité en intervention'].map(c=>`<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#fff;"><span style="font-size:12px;">${c}</span><select class="ts-comp" data-comp="${c}" style="padding:4px; border-radius:4px; border:1px solid #cbd5e1; font-size:12px;"><option value="">--</option><option>Non acquis</option><option>En cours</option><option>Acquis</option></select></div>`).join('')}

                    </div>

                    <h3 style="margin:16px 0 12px; color:#0f172a; font-size:14px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">7-8-9. Observations & Validation</h3>

                    <div class="form-grid">

                        <div class="form-group" style="grid-column:1/-1;"><label>Points positifs</label><textarea id="ts-points-pos" rows="2"></textarea></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Points à améliorer</label><textarea id="ts-points-ameliorer" rows="2"></textarea></div>

                        <div class="form-group" style="grid-column:1/-1;"><label>Appréciation générale</label><select id="ts-appreciation"><option value="">--</option><option>Insuffisant</option><option>à améliorer</option><option>Satisfaisant</option><option>Très satisfaisant</option><option>Excellent</option></select></div>

                        <div class="form-group"><label>Heure fin de service</label><input type="time" id="ts-heure-fin"></div>

                        <div class="form-group"><label>Webhook Discord (optionnel)</label><input type="url" id="ts-webhook" placeholder="https://discord.com/api/webhooks/..." value="${escapeHtml(currentUser.webhookUrl||'')}"></div>

                    </div>

                    <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;"><button class="btn btn-success" id="btn-save-trame"><i class="fas fa-save"></i> Enregistrer</button><button class="btn btn-primary" id="btn-pdf-trame"><i class="fas fa-file-pdf"></i> Générer PDF</button><button class="btn btn-secondary" id="btn-cancel-trame">Annuler</button></div>

                </div>

                <div id="trame-list">${(()=>{ const list = selectedMatricule ? saved.filter(r=> String(r.matricule||'')===String(selectedMatricule)) : saved; if(list.length===0) return '<p style="text-align:center; color:#666; padding:20px;">'+(selectedMatricule?'Aucune fiche dans cet espace. Cliquez Nouvelle fiche.':'Aucune fiche enregistrée.')+'</p>'; return list.slice().reverse().map(r=>`<div class="card" style="border-left:4px solid #7c3aed; margin-bottom:12px;"><div style="display:flex; justify-content:space-between; align-items:center;"><b>${escapeHtml(r.nom)} ${escapeHtml(r.prenom)} -- ${escapeHtml(r.dateGarde||'')}</b><span style="font-size:11px; color:#666;">${escapeHtml(r.tuteur||'')}</span></div><div style="font-size:12px; color:#666; margin-top:4px;">${escapeHtml(r.unite||'')} -- ${escapeHtml(r.horaires||'')} -- Appréciation: ${escapeHtml(r.appreciation||'--')}</div><div style="text-align:right; margin-top:8px; display:flex; gap:6px; justify-content:flex-end;"><button class="btn btn-secondary btn-sm" onclick="loadTrame('${r.id}')">Voir</button><button class="btn btn-secondary btn-sm" onclick="deleteTrame('${r.id}')">Supprimer</button></div></div>`).join(''); })()}</div>

            </div>`;

        document.getElementById('btn-new-trame').onclick=()=>{ document.getElementById('trame-form').style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); };

        document.getElementById('btn-cancel-trame').onclick=()=>document.getElementById('trame-form').style.display='none';

        document.getElementById('btn-save-trame').onclick=()=>{

            const getVal=id=>document.getElementById(id)?.value.trim()||'';

            const comps={}; document.querySelectorAll('.ts-comp').forEach(s=>{ if(s.value) comps[s.dataset.comp]=s.value; });

            const types=[...document.querySelectorAll('.ts-type:checked')].map(c=>c.value); const autre=getVal('ts-type-autre'); if(autre) types.push(autre);

            const inters=[...document.querySelectorAll('.ts-inter:checked')].map(c=>c.value);

            const rec={id:Date.now().toString(), nom:getVal('ts-nom'), prenom:getVal('ts-prenom'), matricule:getVal('ts-matricule'), debut:getVal('ts-debut'), tuteur:getVal('ts-tuteur'), gradeTuteur:getVal('ts-grade-tuteur'), dateGarde:getVal('ts-date-garde'), unite:getVal('ts-unite'), indicatif:getVal('ts-indicatif'), horaires:getVal('ts-horaires'), vehicule:getVal('ts-vehicule'), types, heurePrise:getVal('ts-heure-prise'), briefing:getVal('ts-briefing'), consignes:getVal('ts-consignes'), missions:getVal('ts-missions'), nbInter:getVal('ts-nb-inter'), inters, interPrincipale:getVal('ts-inter-principale'), competences:comps, pointsPos:getVal('ts-points-pos'), pointsAmel:getVal('ts-points-ameliorer'), appreciation:getVal('ts-appreciation'), heureFin:getVal('ts-heure-fin'), webhook:getVal('ts-webhook'), auteur:currentUser.rio, createdAt:new Date().toISOString()};

            if(!rec.nom||!rec.prenom||!rec.tuteur||!rec.dateGarde) return alert('Champs obligatoires manquants (Nom, Prénom, Tuteur, Date de garde).');

            const all=JSON.parse(pmLocalStorage.getItem(KEY)||'[]'); all.push(rec); pmLocalStorage.setItem(KEY, JSON.stringify(all));

            if(rec.webhook){ fetch(rec.webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[FICHE STAGIAIRE]** ${rec.prenom} ${rec.nom} -- ${rec.dateGarde} -- Tuteur: ${rec.tuteur} -- Appréciation: ${rec.appreciation||'--'}`, username:'PM Stagiaire'})}).catch(()=>{}); }

            addLog('Fiche stagiaire', rec.nom+' '+rec.prenom); renderTrameStagiaire();

        };

        document.getElementById('btn-pdf-trame').onclick=()=>{

            const {jsPDF}=window.jspdf||{}; if(!jsPDF) return alert('jsPDF non chargé');

            const doc=new jsPDF(); doc.setFontSize(12); doc.text('POLICE MUNICIPALE -- FICHE DE GARDE STAGIAIRE',14,16); doc.setFontSize(9);

            const getVal=id=>document.getElementById(id)?.value||'--';

            let y=24; const add=(label,val)=>{ doc.setFont(undefined,'bold'); doc.text(label+':',14,y); doc.setFont(undefined,'normal'); const lines=doc.splitTextToSize(val,160); doc.text(lines, 14+doc.getTextWidth(label+': '), y); y+= Math.max(7, lines.length*5)+2; if(y>280){doc.addPage(); y=20;} };

            add('Stagiaire', getVal('ts-nom')+' '+getVal('ts-prenom')+' -- Mat: '+getVal('ts-matricule'));

            add('Tuteur', getVal('ts-tuteur')+' ('+getVal('ts-grade-tuteur')+')');

            add('Garde', getVal('ts-date-garde')+' — '+getVal('ts-unite')+' — '+getVal('ts-indicatif')+' — '+getVal('ts-horaires'));

            add('Véhicule', getVal('ts-vehicule'));

            add('Missions', getVal('ts-missions'));

            add('Intervention principale', getVal('ts-inter-principale'));

            add('Points positifs', getVal('ts-points-pos'));

            add('Points à améliorer', getVal('ts-points-ameliorer'));

            add('Appréciation', getVal('ts-appreciation'));

            doc.save(`fiche_stagiaire_${getVal('ts-nom')||'stg'}.pdf`);

        };

        window.deleteTrame=(id)=>{ if(!confirm('Supprimer cette fiche ?')) return; const all=JSON.parse(pmLocalStorage.getItem(KEY)||'[]'); pmLocalStorage.setItem(KEY, JSON.stringify(all.filter(r=>r.id!==id))); renderTrameStagiaire(); };

        window.loadTrame=(id)=>{ const all=JSON.parse(pmLocalStorage.getItem(KEY)||'[]'); const r=all.find(x=>x.id===id); if(!r) return; alert('Fiche du '+r.dateGarde+' — '+r.prenom+' '+r.nom+'\nTuteur: '+r.tuteur+'\nAppréciation: '+(r.appreciation||'--')+'\nMissions: '+(r.missions||'').slice(0,200)); };

    }

    function renderTAJ() {

        const tajList = JSON.parse(pmLocalStorage.getItem(TAJ_KEY) || '[]');

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-fingerprint"></i> TAJ</h2>                    <div style="display: flex; gap: 10px;">                        <input type="text" id="taj-search" placeholder="Rechercher une personne..." style="padding: 8px 12px; border: 1px solid var(--pm-border); border-radius: 4px; width: 300px;">                        <button class="btn btn-primary" id="btn-show-taj-form"><i class="fas fa-plus"></i> Nouveau Dossier</button>                    </div>                </div>                <div id="taj-form-area" style="display: none; margin-bottom: 25px; border: 1px solid var(--pm-blue); padding: 20px; border-radius: 8px; background: #fff0f0;">                    <h3 class="card-title">Nouveau dossier TAJ</h3>                    <div class="form-grid">                        <div class="form-group"><label>ID TAJ</label><input type="text" id="taj-id"></div>                        <div class="form-group"><label>Personne concernée</label><input type="text" id="taj-person"></div>                        <div class="form-group"><label>Lieu</label><input type="text" id="taj-place"></div>                        <div class="form-group"><label>OPJ</label><input type="text" id="taj-opj"></div>                    </div>                    <div class="form-group"><label>Effectif(s)</label><input type="text" id="taj-agents"></div>                    <div class="form-group"><label>Contexte</label><textarea id="taj-context" rows="3"></textarea></div>                    <div class="form-group"><label>Faits</label><textarea id="taj-facts" rows="4"></textarea></div>                    <div style="display: flex; gap:10px; margin-top: 15px;">                        <button class="btn btn-danger" id="btn-save-taj">Enregistrer</button>                        <button class="btn btn-secondary" id="btn-cancel-taj">Annuler</button>                    </div>                </div>                <div id="taj-list">                    ${

            tajList.length === 0

                ? '<p style="text-align: center; color: #666; padding: 20px;">Aucun dossier TAJ.</p>'

                : tajList

                      .sort((a, b) => b.id - a.id)

                      .map(

                          (t) =>

                              `                            <div class="card" style="border-left:5px solid #dc3545; margin-bottom: 15px;" data-person="${t.person.toLowerCase()}">                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">                                    <h3 style="margin: 0; color: var(--pm-text-color);">DOSSIER : ${t.tajId}</h3>                                    <span style="font-size: 12px; color: #666;">Enregistré le ${new Date(t.id).toLocaleDateString()}</span>                                </div>                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; font-size: 14px;">                                    <div><strong>Concerné :</strong> ${t.person}</div>                                    <div><strong>OPJ :</strong> ${t.opj}</div>                                      <div><strong>Lieu :</strong> ${t.place}</div>                                    <div><strong>Effectif :</strong> ${t.agents}</div>                                </div>                                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 13px;">                                    <strong>Contexte :</strong><br>${t.context}<br><br>                                    <strong>Faits :</strong><br>${t.facts}                                      </div>                                ${isPmDirectionMember(currentUser) ? `                                    <div style="margin-top: 10px; text-align: right;">                                        <button class="btn btn-danger btn-sm" onclick="deleteTAJ(${t.id})">Supprimer</button>                                    </div>                                ` : ''}                            </div>                        `,

                      )

                      .join('')

        }                </div>            </div>        `;

        const searchInput = document.getElementById('taj-search');

        if (searchInput) {

            searchInput.addEventListener('input', (e) => {

                const searchTerm = e.target.value.toLowerCase();

                document.querySelectorAll('#taj-list .card').forEach((card) => {

                    const person = card.dataset.person || '';

                    card.style.display = person.includes(searchTerm)

                        ? 'block'

                        : 'none';

                });

            });

        }

        document.getElementById('btn-show-taj-form').onclick = () =>

            (document.getElementById('taj-form-area').style.display = 'block');

        document.getElementById('btn-cancel-taj').onclick = () =>

            (document.getElementById('taj-form-area').style.display = 'none');

        document.getElementById('btn-save-taj').onclick = () => {

            const tajId = document.getElementById('taj-id').value.trim();

            const person = document.getElementById('taj-person').value.trim();

            const place = document.getElementById('taj-place').value.trim();

            const opj = document.getElementById('taj-opj').value.trim();

            const agents = document.getElementById('taj-agents').value.trim();

            const context = document.getElementById('taj-context').value.trim();

            const facts = document.getElementById('taj-facts').value.trim();

            if (!tajId || !person || !facts)

                return alert(

                    'Veuillez remplir les champs obligatoires (ID, Personne, Faits).',

                );

            const newTAJ = {

                id: Date.now(),

                tajId,

                person,

                place,

                opj,

                agents,

                context,

                facts,

            };

            const currentTAJ = JSON.parse(

                pmLocalStorage.getItem(TAJ_KEY) || '[]',

            );

            currentTAJ.push(newTAJ);

            pmLocalStorage.setItem(TAJ_KEY, JSON.stringify(currentTAJ))
                try{ pmAddNotification('taj', 'Nouveau TAJ', `${currentUser.prenom} ${currentUser.nom} a cree un dossier TAJ`);             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
}catch(e){};

            addLog('Création dossier TAJ', tajId);

            try{ const wh=pmGetWebhookUrl('taj'); if(wh) fetch(wh,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[TAJ]** Nouveau dossier ${tajId} -- ${person} -- ${place}`, username:'PM TAJ'})}).catch(()=>{}); }catch(e){}

            renderTAJ();

        };

        window.deleteTAJ = (id) => {

            if (confirm('Supprimer ce dossier TAJ ?')) {

                const currentTAJ = JSON.parse(

                    pmLocalStorage.getItem(TAJ_KEY) || '[]',

                );

                pmLocalStorage.setItem(

                    TAJ_KEY,

                    JSON.stringify(currentTAJ.filter((t) => t.id !== id)),

                );

                renderTAJ();

            }

        };

    }

    function renderFPR() {

        const fprList = JSON.parse(pmLocalStorage.getItem(FPR_KEY) || '[]');

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-id-card-clip"></i> Fichier des Personnes Recherchées (FPR)</h2>                    <div style="display: flex; gap: 10px;">                        <input type="text" id="fpr-search" placeholder="Rechercher une personne..." style="padding: 8px 12px; border: 1px solid var(--pm-border); border-radius: 4px; width: 300px;">                        <select id="fpr-filter" style="padding: 8px 12px; border: 1px solid var(--pm-border); border-radius: 4px;">                            <option value="all">Tous</option>                            <option value="FPR ACTIF">Actif</option>                            <option value="FPR INNACTIF">Inactif</option>                        </select>                        <button class="btn btn-primary" id="btn-show-fpr-form"><i class="fas fa-plus"></i> Nouveau Signalement</button>                    </div>                </div>                <div id="fpr-form-area" style="display: none; margin-bottom: 25px; border: 1px solid var(--pm-blue); padding: 20px; border-radius: 8px; background: #fff5f5;">                    <h3 class="card-title">Nouveau signalement FPR</h3>                    <div class="form-grid">                        <div class="form-group"><label>NOM Prénom du concerné</label><input type="text" id="fpr-person"></div>                        <div class="form-group"><label>Date de naissance</label><input type="date" id="fpr-dob"></div>                        <div class="form-group">                            <label>Statut initial</label>                            <select id="fpr-status">                                <option value="FPR ACTIF">ACTIF</option>                                        <option value="FPR INNACTIF">INACTIF</option>                               </select>                        </div>                    </div>                    <div class="form-group">                        <label>Faits reprochés / Motif de recherche</label>                            <textarea id="fpr-facts" rows="3" placeholder="Motif de l\'inscription au FPR..."></textarea>                    </div>                    <div style="display: flex; gap: 10px; margin-top: 15px;">                           <button class="btn btn-danger" id="btn-save-fpr">Inscrire au FPR</button>                        <button class="btn btn-secondary" id="btn-cancel-fpr">Annuler</button>                    </div>                </div>                <div id="fpr-list">                    ${

            fprList.length === 0

                ? '<p style="text-align: center; color: #666; padding: 20px;">Aucun signalement FPR en cours.</p>'

                : fprList

                      .sort((a, b) => b.id - a.id)

                      .map(

                          (f) =>

                              `                            <div class="card fpr-card" style="border-left: 5px solid ${f.status === 'FPR ACTIF' ? '#dc3545' : '#6c757d'}; margin-bottom: 15px;" data-person="${f.person.toLowerCase()}" data-status="${f.status}">                                <div style="display: flex; justify-content: space-between; align-items: center;">                                    <h3 style="margin: 0; color: ${f.status === 'FPR ACTIF' ? '#dc3545' : '#333'};">                                        ${f.person}                                        <span class="badge" style="background: ${f.status === 'FPR ACTIF' ? '#dc3545' : '#6c757d'}; color: white; margin-left: 10px;">                                            ${f.status}                                        </span>                                    </h3>                                    <span style="font-size: 12px; color: #666;">Né(e) le ${new Date(f.dob).toLocaleDateString()}</span>                                </div>                                <div style="margin-top: 10px; padding: 10px; background: #fef2f2; border-radius: 4px; font-size: 14px;">                                    <strong>Faits / Motif :</strong><br>${f.facts}                                </div>                                <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">                                    <span style="font-size: 12px; color: #888;">Signalement du ${new Date(f.id).toLocaleDateString()}</span>                                    <div style="display: flex; gap: 10px;">                                             <button class="btn btn-sm ${f.status === 'FPR ACTIF' ? 'btn-secondary' : 'btn-danger'}" onclick="toggleFPRStatus(${f.id})">                                            ${f.status === 'FPR ACTIF' ? 'Désactiver' : 'Réactiver'}                                        </button>                                        ${isPmDirectionMember(currentUser) ? `<button class="btn btn-danger btn-sm" onclick="deleteFPR(${f.id})"><i class="fas fa-trash"></i></button>` : ''}                                    </div>                                </div>                            </div>                        `,

                      )

                      .join('')

        }                </div>            </div>        `;

        const searchInput = document.getElementById('fpr-search');

        const filterSelect = document.getElementById('fpr-filter');

        const filterCards = () => {

            const searchTerm = searchInput.value.toLowerCase();

            const filterValue = filterSelect.value;

            document.querySelectorAll('.fpr-card').forEach((card) => {

                const person = card.dataset.person || '';

                const status = card.dataset.status || '';

                const matchesSearch = person.includes(searchTerm);

                const matchesFilter =

                    filterValue === 'all' || status === filterValue;

                card.style.display =

                    matchesSearch && matchesFilter ? 'block' : 'none';

            });

        };

        if (searchInput) searchInput.addEventListener('input', filterCards);

        if (filterSelect) filterSelect.addEventListener('change', filterCards);

        document.getElementById('btn-show-fpr-form').onclick = () =>

            (document.getElementById('fpr-form-area').style.display = 'block');

        document.getElementById('btn-cancel-fpr').onclick = () =>

            (document.getElementById('fpr-form-area').style.display = 'none');

        document.getElementById('btn-save-fpr').onclick = () => {

            const person = document.getElementById('fpr-person').value.trim();

            const dob = document.getElementById('fpr-dob').value;

            const status = document.getElementById('fpr-status').value;

            const facts = document.getElementById('fpr-facts').value.trim();

            if (!person || !dob || !facts)

                return alert('Veuillez remplir tous les champs.');

            const newFPR = { id: Date.now(), person, dob, status, facts };

            const currentFPR = JSON.parse(

                pmLocalStorage.getItem(FPR_KEY) || '[]',

            );

            currentFPR.push(newFPR);

            pmLocalStorage.setItem(FPR_KEY, JSON.stringify(currentFPR))
                try{ pmAddNotification('fpr', 'Nouveau FPR', `${currentUser.prenom} ${currentUser.nom} a cree/modifie un FPR`);             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
}catch(e){};

            addLog('Signalement FPR', person);

            try{ const wh=pmGetWebhookUrl('fpr'); if(wh) fetch(wh,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**[FPR]** Nouveau signalement ${person} -- ${status}`, username:'PM FPR'})}).catch(()=>{}); }catch(e){}

            renderFPR();

        };

        window.toggleFPRStatus = (id) => {

            const currentFPR = JSON.parse(

                pmLocalStorage.getItem(FPR_KEY) || '[]',

            );

            const index = currentFPR.findIndex((f) => f.id === id);

            if (index !== -1) {

                currentFPR[index].status =

                    currentFPR[index].status === 'FPR ACTIF'

                        ? 'FPR INNACTIF'

                        : 'FPR ACTIF';

                pmLocalStorage.setItem(FPR_KEY, JSON.stringify(currentFPR))
                try{ pmAddNotification('fpr', 'Nouveau FPR', `${currentUser.prenom} ${currentUser.nom} a cree/modifie un FPR`);             if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
}catch(e){};

                renderFPR();

            }

        };

        window.deleteFPR = (id) => {

            if (confirm('Supprimer ce signalement FPR ?')) {

                const currentFPR = JSON.parse(

                    pmLocalStorage.getItem(FPR_KEY) || '[]',

                );

                pmLocalStorage.setItem(

                    FPR_KEY,

                    JSON.stringify(currentFPR.filter((f) => f.id !== id)),

                );

                renderFPR();

            }

        };

    }

    function renderParcAuto() {

        const fleet = JSON.parse(pmLocalStorage.getItem(FLEET_KEY) || '[]');

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-car"></i> Parc Automobile</h2>                    ${isPmDirectionMember(currentUser) ? `                        <div style="display:flex; gap:10px; flex-wrap:wrap;">                            <button type="button" class="btn btn-secondary" id="btn-edit-vehicle"><i class="fas fa-pen"></i> Modifier</button>                            <button type="button" class="btn btn-primary" id="btn-add-vehicle"><i class="fas fa-plus"></i> Ajouter un véhicule</button>                        </div>                    ` : ''}                </div>                ${isPmDirectionMember(currentUser) ? `                <div id="veh-edit-picker" style="display:none; margin: 0 0 16px; padding: 14px 16px; border: 1px solid var(--pm-border); border-radius: 8px; background: rgba(255,255,255,0.04);">                    <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">                        <div class="form-group" style="margin:0; flex:1; min-width:220px;">                            <label for="veh-edit-select" style="display:block; margin-bottom:6px;">Véhicule à modifier</label>                            <select id="veh-edit-select" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--pm-border);"></select>                        </div>                        <button type="button" class="btn btn-primary" id="btn-veh-edit-open">Ouvrir l'édition</button>                        <button type="button" class="btn btn-secondary" id="btn-veh-edit-picker-close">Fermer</button>                    </div>                </div>                ` : ''}                <div id="vehicle-form" style="display: none; margin-bottom:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f0f7ff;">                    <input type="hidden" id="veh-editing-id" value="">                    <h3 class="card-title" id="vehicle-form-title">Nouveau véhicule</h3>                    <div class="form-grid">                        <div class="form-group"><label>Immatriculation</label><input type="text" id="veh-immat"></div>                        <div class="form-group"><label>Marque / Modèle</label><input type="text" id="veh-modele"></div>                        <div class="form-group"><label>Type</label><select id="veh-type"><option>Voiture</option><option>Fourgon</option><option>Moto</option></select></div>                        <div class="form-group"><label>Véhicule Réservé</label>                            <select id="veh-reserve">                                <option value="">Aucun</option>                                <option value="BMU">BMU</option>                                <option value="GSI">GSI</option>                                <option value="Direction">Direction</option>                                <option value="Victor">Victor</option>                                <option value="OPJ">OPJ</option>                            </select>                        </div>                        <div class="form-group"><label>Photo du véhicule</label><input type="file" id="veh-photo" accept="image/*"><p id="veh-photo-hint" style="margin:6px 0 0; font-size:0.85rem; color:#666; display:none;">Laisser vide pour conserver la photo actuelle.</p></div>                    </div>                    <div class="form-group"><label>état</label><textarea id="veh-etat" rows="2"></textarea></div>                    <div style="display:flex; gap:10px; margin-top:15px;">                        <button class="btn btn-success" id="btn-save-vehicule">Enregistrer</button>                        <button class="btn btn-secondary" id="btn-cancel-vehicule">Annuler</button>                    </div>                </div>                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px;">                    ${fleet.length === 0 ? '<p style="text-align:center; color:#666; grid-column:1/-1;">Aucun véhicule dans le parc.</p>' : fleet.map((v) => `                            <div class="card" style="border-left: 6px solid ${v.reserve ? getReserveStyle(v.reserve).bg : 'var(--pm-blue)'}; padding: 1.25rem;">                                ${v.photo ? `<img src="${v.photo}" alt="${v.immat}" style="width:100%; height:300px; object-fit:cover; border-radius:8px; margin-bottom:14px;">` : ''}                                <h3 style="margin:0 0 12px 0; color: var(--pm-text-color); font-size: 1.65rem; font-weight: 700;">${v.immat}</h3>                                <p style="margin:8px 0; font-size: 1.1rem; line-height: 1.45;"><strong>Modèle:</strong> ${v.modele}</p>                                <p style="margin:8px 0; font-size: 1.1rem; line-height: 1.45;"><strong>Type:</strong> ${v.type}</p>                                ${v.reserve ? `<p style="margin:8px 0; font-size: 1.1rem;"><span class="badge" style="background: ${getReserveStyle(v.reserve).bg}; color: ${getReserveStyle(v.reserve).fg}; font-size: 0.95rem; padding: 0.35em 0.65em;">Réservé: ${v.reserve}</span></p>` : ''}                                <p style="margin:8px 0; font-size: 1.1rem; line-height: 1.45;"><strong>état:</strong> ${v.etat || 'Aucune note'}</p>                                ${isPmDirectionMember(currentUser) ? `                                    <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">                                        <button type="button" class="btn btn-primary btn-sm" onclick="editVehicle('${v.id}')"><i class="fas fa-pen"></i> Modifier</button>                                        <button type="button" class="btn btn-danger btn-sm" onclick="deleteVehicle('${v.id}')">Supprimer</button>                                    </div>                                ` : ''}                            </div>                        `).join('')}                </div>            </div>        `;

        if (isPmDirectionMember(currentUser)) {

            const vehReserveSelect = document.getElementById('veh-reserve');

            const applyReserveSelectStyle = () => {

                if (!vehReserveSelect) return;

                const role = vehReserveSelect.value;

                if (!role) {

                    vehReserveSelect.style.background = '';

                    vehReserveSelect.style.color = '';

                    return;

                }

                const style = getReserveStyle(role);

                vehReserveSelect.style.background = style.bg;

                vehReserveSelect.style.color = style.fg;

            };

            const resetVehicleForm = () => {

                document.getElementById('veh-editing-id').value = '';

                document.getElementById('veh-immat').value = '';

                document.getElementById('veh-modele').value = '';

                document.getElementById('veh-type').selectedIndex = 0;

                document.getElementById('veh-reserve').value = '';

                document.getElementById('veh-etat').value = '';

                document.getElementById('veh-photo').value = '';

                document.getElementById('vehicle-form-title').textContent =

                    'Nouveau véhicule';

                const hint = document.getElementById('veh-photo-hint');

                if (hint) hint.style.display = 'none';

                applyReserveSelectStyle();

            };

            const vehEditPicker = document.getElementById('veh-edit-picker');

            const hideVehEditPicker = () => {

                if (vehEditPicker) vehEditPicker.style.display = 'none';

            };

            const fillVehEditSelect = (currentFleet) => {

                const sel = document.getElementById('veh-edit-select');

                if (!sel) return;

                sel.innerHTML = '';

                currentFleet.forEach((v) => {

                    const opt = document.createElement('option');

                    opt.value = v.id;

                    const immat = String(v.immat || '').trim();

                    const modele = String(v.modele || '').trim();

                    opt.textContent =

                        [immat, modele].filter(Boolean).join(' — ') ||

                        String(v.id);

                    sel.appendChild(opt);

                });

            };

            document.getElementById('btn-add-vehicle').onclick = () => {

                hideVehEditPicker();

                resetVehicleForm();

                document.getElementById('vehicle-form').style.display = 'block';

                document

                    .getElementById('vehicle-form')

                    .scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            };

            document.getElementById('btn-edit-vehicle').onclick = () => {

                const currentFleet = JSON.parse(

                    pmLocalStorage.getItem(FLEET_KEY) || '[]',

                );

                if (currentFleet.length === 0) {

                    alert('Aucun véhicule à modifier.');

                    return;

                }

                fillVehEditSelect(currentFleet);

                if (vehEditPicker) {

                    vehEditPicker.style.display = 'block';

                    vehEditPicker.scrollIntoView({

                        behavior: 'smooth',

                        block: 'nearest',

                    });

                }

            };

            document.getElementById('btn-veh-edit-picker-close').onclick = () =>

                hideVehEditPicker();

            document.getElementById('btn-veh-edit-open').onclick = () => {

                const sel = document.getElementById('veh-edit-select');

                const id = sel && sel.value;

                if (!id) return;

                hideVehEditPicker();

                window.editVehicle(id);

            };

            if (vehReserveSelect) {

                vehReserveSelect.addEventListener(

                    'change',

                    applyReserveSelectStyle,

                );

            }

            applyReserveSelectStyle();

            document.getElementById('btn-cancel-vehicule').onclick = () => {

                hideVehEditPicker();

                document.getElementById('vehicle-form').style.display = 'none';

                resetVehicleForm();

            };

            document.getElementById('btn-save-vehicule').onclick = () => {

                const immat = document.getElementById('veh-immat').value.trim();

                const modele = document

                    .getElementById('veh-modele')

                    .value.trim();

                const type = document.getElementById('veh-type').value;

                const reserve = document.getElementById('veh-reserve').value;

                const etat = document.getElementById('veh-etat').value.trim();

                const photoInput = document.getElementById('veh-photo');

                const editingId = document

                    .getElementById('veh-editing-id')

                    .value.trim();

                if (!immat || !modele)

                    return alert('Veuillez remplir immatriculation et modèle.');

                const applyFleetUpdate = (photoValue) => {

                    const currentFleet = JSON.parse(

                        pmLocalStorage.getItem(FLEET_KEY) || '[]',

                    );

                    if (editingId) {

                        const idx = currentFleet.findIndex(

                            (v) => v.id === editingId,

                        );

                        if (idx === -1) return alert('Véhicule introuvable.');

                        const prev = currentFleet[idx];

                        currentFleet[idx] = {

                            ...prev,

                            immat,

                            modele,

                            type,

                            reserve,

                            etat,

                            photo:

                                photoValue !== null ? photoValue : prev.photo,

                        };

                        pmLocalStorage.setItem(

                            FLEET_KEY,

                            JSON.stringify(currentFleet),

                        );

                        addLog('Modification véhicule', immat);

                    } else {

                        const newVeh = {

                            id: Date.now().toString(),

                            immat,

                            modele,

                            type,

                            reserve,

                            etat,

                            photo: photoValue,

                        };

                        currentFleet.push(newVeh);

                        pmLocalStorage.setItem(

                            FLEET_KEY,

                            JSON.stringify(currentFleet),

                        );

                    }

                    renderParcAuto();

                };

                if (photoInput.files && photoInput.files[0]) {

                    const reader = new FileReader();

                    reader.onload = function (e) {

                        applyFleetUpdate(e.target.result);

                    };

                    reader.readAsDataURL(photoInput.files[0]);

                } else {

                    applyFleetUpdate(null);

                }

            };

            window.editVehicle = (id) => {

                hideVehEditPicker();

                const currentFleet = JSON.parse(

                    pmLocalStorage.getItem(FLEET_KEY) || '[]',

                );

                const v = currentFleet.find((x) => x.id === id);

                if (!v) return alert('Véhicule introuvable.');

                document.getElementById('veh-editing-id').value = v.id;

                document.getElementById('veh-immat').value = v.immat || '';

                document.getElementById('veh-modele').value = v.modele || '';

                const typeSel = document.getElementById('veh-type');

                const types = ['Voiture', 'Fourgon', 'Moto'];

                typeSel.value = types.includes(v.type) ? v.type : 'Voiture';

                document.getElementById('veh-reserve').value = v.reserve || '';

                applyReserveSelectStyle();

                document.getElementById('veh-etat').value = v.etat || '';

                document.getElementById('veh-photo').value = '';

                document.getElementById('vehicle-form-title').textContent =

                    'Modifier le véhicule';

                const hint = document.getElementById('veh-photo-hint');

                if (hint) hint.style.display = v.photo ? 'block' : 'none';

                document.getElementById('vehicle-form').style.display = 'block';

                document

                    .getElementById('vehicle-form')

                    .scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            };

            window.deleteVehicle = (id) => {

                if (confirm('Supprimer ce véhicule ?')) {

                    const currentFleet = JSON.parse(

                        pmLocalStorage.getItem(FLEET_KEY) || '[]',

                    );

                    const vehicleToDelete = currentFleet.find(

                        (v) => v.id === id,

                    );

                    pmLocalStorage.setItem(

                        FLEET_KEY,

                        JSON.stringify(currentFleet.filter((v) => v.id !== id)),

                    );

                    if (vehicleToDelete) {

                        addLog('Suppression véhicule', vehicleToDelete.immat);

                    }

                    renderParcAuto();

                }

            };

        }

    }

    function renderSpecialites() {

        const specialites = JSON.parse(

            pmLocalStorage.getItem(SPECIALITES_KEY) || '[]',

        );

        contentArea.innerHTML = `            <div class="card">                <div class="card-header">                    <h2 class="card-title"><i class="fas fa-star"></i> Spécialités</h2>                    ${isPmDirectionMember(currentUser) ? '<button class="btn btn-primary" id="btn-add-specialite"><i class="fas fa-plus"></i> Ajouter une spécialité</button>' : ''}                </div>                <div id="specialite-form" style="display: none; margin-bottom:20px; border:1px solid var(--pm-blue); padding:20px; border-radius:8px; background:#f0f7ff;">                    <h3 class="card-title">Nouvelle spécialité</h3>                    <div class="form-group"><label>Nom de la spécialité</label><input type="text" id="spec-nom"></div>                    <div class="form-group"><label>Responsable(s)</label><input type="text" id="spec-responsables" placeholder="Noms des responsables séparés par des virgules"></div>                    <div class="form-group"><label>Description</label><textarea id="spec-description" rows="3"></textarea></div>                    <div style="display:flex; gap:10px; margin-top:15px;">                        <button class="btn btn-success" id="btn-save-specialite">Enregistrer</button>                        <button class="btn btn-secondary" id="btn-cancel-specialite">Annuler</button>                    </div>                </div>                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">                    ${specialites.length === 0 ? '<p style="text-align:center; color:#666; grid-column:1/-1;">Aucune spécialité enregistrée.</p>' : specialites.map((s) => `                            <div class="card" style="border-left: 5px solid var(--pm-blue);">                                <h3 style="margin:0 0 10px 0; color: var(--pm-text-color);">${s.nom}</h3>                                ${s.responsables ? `<p style="margin:5px 0;"><strong>Responsable(s):</strong> ${s.responsables}</p>` : ''}                                ${s.description ? `<p style="margin:5px 0;"><strong>Description:</strong> ${s.description}</p>` : ''}                                ${isPmDirectionMember(currentUser) ? `                                    <div style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">                                        <button class="btn btn-secondary btn-sm" onclick="editSpecialite('${s.id}')"><i class="fas fa-edit"></i></button>                                        <button class="btn btn-danger btn-sm" onclick="deleteSpecialite('${s.id}')"><i class="fas fa-trash"></i></button>                                    </div>                                ` : ''}                            </div>                        `).join('')}                </div>            </div>        `;

        if (isPmDirectionMember(currentUser)) {

            document.getElementById('btn-add-specialite').onclick = () => {

                document.getElementById('specialite-form').style.display =

                    'block';

                document.getElementById('specialite-form').dataset.mode = 'add';

                document.getElementById('spec-nom').value = '';

                document.getElementById('spec-responsables').value = '';

                document.getElementById('spec-description').value = '';

            };

            document.getElementById('btn-cancel-specialite').onclick = () => {

                document.getElementById('specialite-form').style.display =

                    'none';

            };

            document.getElementById('btn-save-specialite').onclick = () => {

                const nom = document.getElementById('spec-nom').value.trim();

                const responsables = document

                    .getElementById('spec-responsables')

                    .value.trim();

                const description = document

                    .getElementById('spec-description')

                    .value.trim();

                const mode =

                    document.getElementById('specialite-form').dataset.mode;

                if (!nom) return alert('Veuillez entrer un nom de spécialité.');

                let currentSpecialites = JSON.parse(

                    pmLocalStorage.getItem(SPECIALITES_KEY) || '[]',

                );

                if (mode === 'edit') {

                    const id =

                        document.getElementById('specialite-form').dataset.id;

                    const index = currentSpecialites.findIndex(

                        (s) => s.id === id,

                    );

                    if (index !== -1) {

                        currentSpecialites[index] = {

                            id,

                            nom,

                            responsables,

                            description,

                        };

                    }

                } else {

                    const newSpec = {

                        id: Date.now().toString(),

                        nom,

                        responsables,

                        description,

                    };

                    currentSpecialites.push(newSpec);

                }

                pmLocalStorage.setItem(

                    SPECIALITES_KEY,

                    JSON.stringify(currentSpecialites),

                );

                addLog('Modification spécialité', nom);

                renderSpecialites();

            };

            window.editSpecialite = (id) => {

                const currentSpecialites = JSON.parse(

                    pmLocalStorage.getItem(SPECIALITES_KEY) || '[]',

                );

                const spec = currentSpecialites.find((s) => s.id === id);

                if (spec) {

                    document.getElementById('specialite-form').style.display =

                        'block';

                    document.getElementById('specialite-form').dataset.mode =

                        'edit';

                    document.getElementById('specialite-form').dataset.id = id;

                    document.getElementById('spec-nom').value = spec.nom;

                    document.getElementById('spec-responsables').value =

                        spec.responsables || '';

                    document.getElementById('spec-description').value =

                        spec.description || '';

                }

            };

            window.deleteSpecialite = (id) => {

                if (confirm('Supprimer cette spécialité ?')) {

                    const currentSpecialites = JSON.parse(

                        pmLocalStorage.getItem(SPECIALITES_KEY) || '[]',

                    );

                    pmLocalStorage.setItem(

                        SPECIALITES_KEY,

                        JSON.stringify(

                            currentSpecialites.filter((s) => s.id !== id),

                        ),

                    );

                    renderSpecialites();

                }

            };

        }

    }

    async function renderRecherche() {

        contentArea.innerHTML = `            <div class="card">                <p class="dash-welcome-sub" style="margin:0;">Synchronisation des fiches avec le serveur...</p>            </div>`;

        await pullServerStoreMirror();

        const data = pmLocalStorage.getItem(STORAGE_KEY);

        const allUsers = data ? JSON.parse(data) : [];

        contentArea.innerHTML = `            <div class="card">                <div class="card-header" style="flex-wrap:wrap; gap:12px; align-items:center;">                    <h2 class="card-title">                        <img src="assets/logo.png" alt="Logo" style="height:48px; width:auto; vertical-align: middle; margin-right:10px;">                        Recherche Effectif                    </h2>                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-left:auto; align-items:center;">                        <button type="button" class="btn btn-secondary btn-sm" id="btn-sync-fiches-recherche" title="Récupérer les dernières fiches depuis le serveur">                            <i class="fas fa-arrows-rotate" aria-hidden="true"></i> Synchroniser                        </button>                        <input type="text" id="search-effectif" placeholder="Rechercher par nom, prénom, grade, RIO, téléphone, spécialité ou n° de série--" style="padding: 8px 12px; border:1px solid var(--pm-border); border-radius:4px; width:300px;">                    </div>                </div>                <p class="dash-welcome-sub" style="margin-top:12px;">Fiches lecture seule pour tout le monde (effectif et direction) : mêmes données que sur le serveur -- recherche par nom, RIO, téléphone, <strong>spécialité</strong> ou n° de série. Synchronisation automatique environ toutes les 90&nbsp;s sur cette page.</p>                <div id="effectif-list" style="margin-top:20px;">                    <div class="pm-fiche-vue-grid">                        ${htmlEffectifFichesGrid(allUsers)}                    </div>                </div>            </div>        `;

        bindEffectifFichesSearch('search-effectif', '.effectif-card');

        document

            .getElementById('btn-sync-fiches-recherche')

            ?.addEventListener('click', (e) => {

                void onSyncFichesButtonClick(e.currentTarget);

            });

    }

    function statutCandLabel(s) {

        const m = {

            en_attente: 'En attente',

            etudiee: 'étudiée',

            acceptee: 'Acceptée',

            refusee: 'Refusée',

        };

        return m[s] || s || '--';

    }

    function formatCandDt(iso) {

        if (!iso) return '--';

        const d = new Date(iso);

        return Number.isNaN(d.getTime())

            ? String(iso)

            : d.toLocaleString('fr-FR', {

                  dateStyle: 'short',

                  timeStyle: 'short',

              });

    }

    function candPoleLabel() {

        return 'candidature effectif';

    }

    async function renderRecrutement() {

        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {

            contentArea.innerHTML = `<div class="card"><p>Accès réservé aux recruteurs / formateurs et à la Direction.</p></div>`;

            return;

        }

        let adminPanel = '';

        if (isPmTriadeLead(currentUser)) {

            const data = pmLocalStorage.getItem(STORAGE_KEY);

            const allUsers = data ? JSON.parse(data) : [];

            const effectifs = allUsers.filter(

                (u) => String(u.role || '').trim() !== 'Direction',

            );

            adminPanel = `            <div class="card" style="margin-top: 20px;">                <h2 class="card-title"><i class="fas fa-user-shield" aria-hidden="true"></i> Gestion Recruteur / Formateur</h2>                <p class="dash-welcome-sub" style="margin-top:0;">Attribuez ou retirez le rôle <strong>Recruteur / Formateur</strong> à vos effectifs. Ils pourront gérer les candidatures et la messagerie recrutement.</p>                <div id="admin-recruteur-list">                    <table style="width:100%; border-collapse:collapse;">                        <thead>                            <tr style="border-bottom:2px solid var(--pm-border);">                                <th style="padding:10px; text-align:left;">RIO</th>                                <th style="padding:10px; text-align:left;">Nom</th>                                <th style="padding:10px; text-align:left;">Grade</th>                                <th style="padding:10px; text-align:left;">Rôle</th>                                <th style="padding:10px; text-align:center;">Recruteur</th>                            </tr>                        </thead>                        <tbody>                            ${effectifs.map((u) => `                            <tr style="border-bottom:1px solid var(--pm-border);">                                <td style="padding:10px;">${escapeHtml(String(u.rio))}</td>                                <td style="padding:10px;">${escapeHtml(u.nom)} ${escapeHtml(u.prenom)}</td>                                <td style="padding:10px;">${escapeHtml(u.grade)}</td>                                <td style="padding:10px;">${escapeHtml(u.role)}</td>                                <td style="padding:10px; text-align:center;">                                    <input type="checkbox" class="recruteur-toggle-checkbox" data-rio="${escapeHtml(String(u.rio))}" ${u.isRecruteur ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">                                </td>                            </tr>`).join('')}                        </tbody>                    </table>                </div>            </div>`;

        }

        const subRec =

            'Candidatures reçues via le formulaire public (tous pôles).';

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-clipboard-user" aria-hidden="true"></i> Recrutement</h2>                <p class="dash-welcome-sub" style="margin-top:0;">${subRec}</p>                <div id="recrutement-loader" style="padding:24px 0;">Chargement--</div>                <div id="recrutement-root" style="display:none;"></div>            </div>            ${adminPanel}        `;

        if (isPmTriadeLead(currentUser)) {

            document

                .querySelectorAll('.recruteur-toggle-checkbox')

                .forEach((cb) => {

                    cb.addEventListener('change', async function () {

                        const rio = this.dataset.rio;

                        const newVal = this.checked;

                        const action = newVal ? 'octroyer' : 'retirer';

                        if (

                            !confirm(

                                'Voulez-vous ' +

                                    action +

                                    ' le rôle Recruteur / Formateur à ce compte ?',

                            )

                        ) {

                            this.checked = !newVal;

                            return;

                        }

                        const data = pmLocalStorage.getItem(STORAGE_KEY);

                        let allUsers = data ? JSON.parse(data) : [];

                        const idx = allUsers.findIndex(

                            (u) => String(u.rio) === String(rio),

                        );

                        if (idx !== -1) {

                            allUsers[idx].isRecruteur = newVal;

                            pmLocalStorage.setItem(

                                STORAGE_KEY,

                                JSON.stringify(allUsers),

                            );

                            if (

                                typeof window.pmFlushPendingStorage ===

                                'function'

                            ) {

                                await window.pmFlushPendingStorage();

                            }

                        }

                    });

                });

        }

        const loader = document.getElementById('recrutement-loader');

        const root = document.getElementById('recrutement-root');

        try {

            const res = await fetch('api/candidatures/list', {

                credentials: 'same-origin',

            });

            const data = await readApiJson(res);

            if (!res.ok) {

                if (loader) {

                    loader.innerHTML = `<p style="color:#c62828;">${escapeHtml(data.error || 'Impossible de charger les candidatures.')}</p>`;

                }

                return;

            }

            const items = Array.isArray(data.items) ? data.items : [];

            const displayItems = items;

            if (loader) loader.style.display = 'none';

            if (!root) return;

            root.style.display = 'block';

            const isDeletableStatut = (s) =>

                s === 'etudiee' || s === 'acceptee' || s === 'refusee';

            const processedCount = displayItems.filter((c) =>

                isDeletableStatut(String(c.statut || '')),

            ).length;

            const deleteAllBar =

                processedCount > 0

                    ? `<div class="recrut-toolbar">                    <button type="button" class="btn btn-danger btn-sm" id="recrut-delete-all-processed" title="Efface les candidatures étudiées, acceptées ou refusées">                        <i class="fas fa-trash-alt" aria-hidden="true"></i> Supprimer les dossiers traités (${processedCount})                    </button>                    <span class="dash-welcome-sub" style="margin:0;">Statuts <strong>étudiée</strong>, <strong>Acceptée</strong> ou <strong>Refusée</strong> -- hors en attente -- irréversible.</span>                </div>`

                    : '';

            root.innerHTML =

                displayItems.length === 0

                    ? `<p class="dash-welcome-sub">Aucune candidature pour le moment.</p>`

                    : `${deleteAllBar}<div class="recrutement-list">${displayItems

                          .map((c) => {

                              const rawStatut = String(

                                  c.statut || 'en_attente',

                              );

                              const sid = escapeHtml(rawStatut);

                              const cid = escapeHtml(String(c.id || ''));

                              const opts = [

                                  'en_attente',

                                  'etudiee',

                                  'acceptee',

                                  'refusee',

                              ];

                              const sel = opts

                                  .map(

                                      (val) =>

                                          `<option value="${val}" ${rawStatut === val ? 'selected' : ''}>${statutCandLabel(val)}</option>`,

                                  )

                                  .join('');

                              const br = (t) =>

                                  escapeHtml(t || '--').replace(/\n/g, '<br>');

                              return `              <article class="recrut-card">                <div class="recrut-card__top">                  <div>                    <strong>${escapeHtml(c.reference || '')}</strong>                    <span class="recrut-card__muted"> · ${escapeHtml(formatCandDt(c.created_at))}</span>                  </div>                  <div class="recrut-card__actions">                  <button type="button" class="btn btn-danger btn-sm recrut-delete-one" data-candidature-id="${cid}" title="Supprimer définitivement ce dossier et sa messagerie recrutement">                        <i class="fas fa-trash-alt" aria-hidden="true"></i> Supprimer                    </button>                  <select class="recrutement-statut-select recrut-card__select" data-candidature-id="${cid}" data-prev-statut="${sid}">${sel}</select>                  </div>                </div>                <p class="recrut-card__pole"><span class="badge badge-pole">${escapeHtml(candPoleLabel(c.pole))}</span></p>                <p class="recrut-card__discord"><i class="fab fa-discord" aria-hidden="true"></i> ${escapeHtml(c.discord || '')}</p>                <p><strong>${escapeHtml(c.prenom || '')} ${escapeHtml(c.nom || '')}</strong> -- ${escapeHtml(String(c.age ?? ''))} ans</p>                <details class="recrut-card__details">                  <summary>Voir les textes du candidat</summary>                  <div class="recrut-card__blocks">                    <div><strong>Disponibilités</strong><p>${br(c.disponibilites)}</p></div>                    <div><strong>Expérience</strong><p>${br(c.experience)}</p></div>                    <div><strong>Motivation</strong><p>${br(c.motivation)}</p></div>                                    </div>
                </details>
              </article>`;

                          })

                          .join('')}</div>`;

            setRecrutCandidatureNavBadgeCount(displayItems.length);

            const runDeleteRequest = async (payload) => {

                const res = await fetch('api/candidatures/delete', {

                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {

                        'Content-Type': 'application/json; charset=UTF-8',

                    },

                    body: JSON.stringify(payload),

                });

                const out = await readApiJson(res);

                if (!res.ok) {

                    alert(out.error || 'Suppression impossible.');

                    return false;

                }

                return true;

            };

            root.querySelector(

                '#recrut-delete-all-processed',

            )?.addEventListener('click', async () => {

                const msg = `Supprimer ${processedCount} candidature(s) (étudiée, acceptée ou refusée) ?\nLa messagerie recrutement associée sera effacée.\nAction irréversible.`;

                if (!window.confirm(msg)) return;

                const ok = await runDeleteRequest({

                    delete_all_processed: true,

                });

                if (ok) {

                    addLog(

                        'Recrutement -- purge',

                        `${processedCount} dossier(s) traité(s) supprimé(s).`,

                    );

                    await renderRecrutement();

                }

            });

            // Délégation robuste pour suppression dossier RC (côté recruteur)
            if(!window._recrutDeleteBound){
                window._recrutDeleteBound=true;
                document.addEventListener('click', async function(e){
                    const btn=e.target.closest && e.target.closest('.recrut-delete-one');
                    if(!btn) return;
                    const rootCheck=btn.closest('#recrutement-list') || btn.closest('.recrutement-list');
                    if(!rootCheck) return;
                    e.preventDefault();
                    const idRaw = btn.getAttribute('data-candidature-id');
                    console.info('[PM] Suppression dossier RC', idRaw);
                    if (!idRaw){ alert('ID manquant'); return; }
                    if (!window.confirm('Supprimer définitivement ce dossier et sa messagerie recrutement ?\nTous statuts -- action irréversible.')) return;
                    btn.disabled=true;
                    const prev=btn.innerHTML; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
                    try{
                        const ok = await fetch('api/candidatures/delete', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json; charset=UTF-8'}, body: JSON.stringify({id: idRaw})}).then(async r=>{ const j=await r.json().catch(()=>({})); if(!r.ok){ alert(j.error||'Suppression impossible: '+r.status); return false; } return true; });
                        if(ok){
                            addLog('Recrutement -- suppression', idRaw.slice(0,12)+'--');
                            await renderRecrutement();
                        }
                    }catch(err){ console.error('[PM] Delete RC failed', err); alert('Erreur suppression: '+(err.message||err)); }
                    finally{ btn.disabled=false; btn.innerHTML=prev; }
                });
            }
        } catch (err) {

            console.error('[PM] Recrutement', err);

            if (loader)

                loader.innerHTML = `<p style="color:#c62828;">Erreur réseau.</p>`;

        }

    }

    async function renderMessagerieRecrutement() {

        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {

            contentArea.innerHTML = `<div class="card"><p>Accès réservé aux recruteurs / formateurs et à la Direction.</p></div>`;

            return;

        }

        let cachedThreads = [];

        let selectedCandidatureId = '';

        contentArea.innerHTML = `            <div class="card" id="recrut-msg-card">                <h2 class="card-title"><i class="fas fa-comments" aria-hidden="true"></i> Messagerie recrutement</h2>                <p class="dash-welcome-sub" style="margin-top:0;">échanges sécurisés avec les candidats connectés depuis l\'espace candidat.</p>                <div class="recrut-msg-layout" id="recrut-msg-layout">                    <aside class="recrut-msg-aside">                        <h3 class="recrut-msg-aside-title">Dossiers</h3>                        <div id="recrut-msg-threads-list" class="recrut-msg-threads-list">Chargement--</div>                    </aside>                    <div class="recrut-msg-main">                        <div id="recrut-msg-detail-head" class="recrut-msg-detail-head">--</div>                        <div id="recrut-msg-detail-body" class="recrut-msg-detail-body"></div>                        <div class="recrut-msg-compose">                            <label for="recrut-dir-reply" class="recrut-msg-compose-label">Réponse</label>                            <textarea id="recrut-dir-reply" rows="4" maxlength="6000" disabled placeholder="Sélectionnez un dossier à gauche--"></textarea>                            <button type="button" class="btn btn-primary" id="recrut-dir-send" disabled>Envoyer</button>                        </div>                    </div>                </div>            </div>        `;

        const threadsEl = document.getElementById('recrut-msg-threads-list');

        const headEl = document.getElementById('recrut-msg-detail-head');

        const bodyEl = document.getElementById('recrut-msg-detail-body');

        const ta = document.getElementById('recrut-dir-reply');

        const sendBtn = document.getElementById('recrut-dir-send');

        const renderThreadList = () => {

            if (!threadsEl) return;

            if (!cachedThreads.length) {

                threadsEl.innerHTML =

                    '<p class="dash-welcome-sub">Aucune candidature déposée.</p>';

                return;

            }

            threadsEl.innerHTML = cachedThreads

                .map((t) => {

                    const id = String(t.candidature_id || '');

                    const active =

                        id === selectedCandidatureId

                            ? 'recrut-dir-thread-item--active'

                            : '';

                    const prevRaw =

                        (t.preview && String(t.preview)) ||

                        (Number(t.message_count) === 0

                            ? 'Pas encore de message'

                            : '');

                    const prevEsc = escapeHtml(prevRaw ? String(prevRaw) : '--');

                    return `<button type="button" class="recrut-dir-thread-item ${active}" data-cid="${escapeHtml(id)}">                        <div class="recrut-dir-thread-ref">${escapeHtml(t.reference)}</div>                        <div class="recrut-dir-thread-sub">${escapeHtml(t.prenom)} ${escapeHtml(t.nom)}</div>                        <div class="recrut-dir-thread-discord">${escapeHtml(t.discord)}</div>                        <div class="recrut-dir-thread-preview">${prevEsc}</div>                        <div class="recrut-dir-thread-meta">${t.message_count} message(s) · ${escapeHtml((t.last_at && formatCandDt(t.last_at)) || '--')}</div>                    </button>`;

                })

                .join('');

            threadsEl

                .querySelectorAll('.recrut-dir-thread-item')

                .forEach((btn) => {

                    btn.addEventListener('click', () => {

                        selectThread(btn.getAttribute('data-cid') || '');

                    });

                });

        };

        const renderMessages = (cand, msgs) => {

            if (!headEl || !bodyEl) return;

            headEl.innerHTML = `<strong>${escapeHtml(cand.reference)}</strong> -- ${escapeHtml(cand.prenom)} ${escapeHtml(cand.nom)} <span class="recrut-card__muted">(${escapeHtml(cand.discord)})</span>`;

            bodyEl.innerHTML = '';

            if (!msgs || !msgs.length) {

                const p = document.createElement('p');

                p.className = 'dash-welcome-sub';

                p.textContent =

                    'Aucun message. Vous pouvez écrire au candidat ci-dessous.';

                bodyEl.appendChild(p);

            } else {

                msgs.forEach((m) => {

                    const div = document.createElement('div');

                    const fromDir = (m.from || '') === 'direction';

                    div.className = fromDir

                        ? 'recrut-dir-msg recrut-dir-msg--direction'

                        : 'recrut-dir-msg recrut-dir-msg--candidate';

                    const meta = document.createElement('div');

                    meta.className = 'recrut-dir-msg-meta';

                    meta.textContent = fromDir

                        ? `${formatCandDt(m.created_at)} · ${m.author || 'Direction'}`

                        : `${formatCandDt(m.created_at)} · Candidat`;

                    const b = document.createElement('div');

                    b.className = 'recrut-dir-msg-body';

                    b.style.whiteSpace = 'pre-wrap';

                    b.textContent = m.body || '';

                    div.appendChild(meta);

                    div.appendChild(b);

                    bodyEl.appendChild(div);

                });

            }

            bodyEl.scrollTop = bodyEl.scrollHeight;

        };

        const loadThreadList = async () => {

            const res = await fetch('api/recrutement-messages', {

                credentials: 'same-origin',

            });

            const data = await readApiJson(res);

            if (!res.ok) {

                if (threadsEl)

                    threadsEl.innerHTML = `<p style="color:#c62828">${escapeHtml(data.error || 'Erreur')}</p>`;

                return false;

            }

            cachedThreads = Array.isArray(data.threads) ? data.threads : [];

            renderThreadList();

            return true;

        };

        async function selectThread(cid) {

            if (!cid) return;

            selectedCandidatureId = cid;

            renderThreadList();

            const res = await fetch(

                `api/recrutement-messages?candidature_id=${encodeURIComponent(cid)}`,

                { credentials: 'same-origin' },

            );

            const data = await readApiJson(res);

            if (!res.ok) {

                alert(data.error || 'Impossible de charger la conversation.');

                return;

            }

            renderMessages(

                data.candidature || {},

                Array.isArray(data.messages) ? data.messages : [],

            );

            if (ta) {

                ta.disabled = false;

                ta.placeholder = 'Votre message à ce candidat--';

            }

            if (sendBtn) sendBtn.disabled = false;

        }

        if (sendBtn && ta) {

            sendBtn.addEventListener('click', async () => {

                const cid = selectedCandidatureId;

                const text = String(ta.value || '').trim();

                if (!cid) return;

                if (!text) {

                    alert('Message vide.');

                    return;

                }

                sendBtn.disabled = true;

                try {

                    const res = await fetch('api/recrutement-messages', {

                        method: 'POST',

                        credentials: 'same-origin',

                        headers: {

                            'Content-Type': 'application/json; charset=UTF-8',

                        },

                        body: JSON.stringify({ text, candidature_id: cid }),

                    });

                    const data = await readApiJson(res);

                    if (!res.ok) {

                        alert(data.error || 'Envoi impossible.');

                        return;

                    }

                    ta.value = '';

                    await loadThreadList();

                    await selectThread(cid);

                    addLog(

                        'Messagerie recrutement',

                        `Message envoyé (${cid.slice(0, 12)}--)`,

                    );

                } catch {

                    alert('Erreur réseau.');

                } finally {

                    sendBtn.disabled = false;

                }

            });

        }

        await loadThreadList();

        void refreshRecrutCandidatureNavBadge();

    }

    function renderGestionComptes() {
        if (!isPmTriadeLead(currentUser)) {
            contentArea.innerHTML = `<div class="card"><p>Accès réservé à la tête de triade : grades DPM, DRA ou CDP avec le rôle Direction.</p></div>`;
            return;
        }

        const loadAccounts = () => {
            const data = pmLocalStorage.getItem(STORAGE_KEY);
            const allUsers = data ? JSON.parse(data) : [];
            const tableBody = document.getElementById('accounts-table-body');
            if (tableBody) {
                tableBody.innerHTML = [...allUsers].sort(compareUsersByGradeThenName).map(u => `
                    <tr style="border-bottom: 1px solid var(--pm-border);">
                        <td style="padding: 10px;">${u.rio}</td>
                        <td style="padding: 10px;">${u.nom} ${u.prenom}</td>
                        <td style="padding: 10px;">${u.grade}</td>
                        <td style="padding: 10px;">${u.role}${u.isRecruteur ? ' <span style="background:#e8f5e9;color:#2e7d32;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;margin-left:4px;">Recruteur</span>' : ''}</td>
                        <td style="padding: 10px; font-size: 13px;">${escapeHtml(formatAccountSpecialiteLabel(u))}</td>
                        <td style="padding: 10px;">
                            <button class="btn btn-secondary btn-sm" onclick="editUser('${u.rio}')" title="Modifier"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.rio}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        };

        window.deleteUser = (rio) => {
            if (rio.toString().toLowerCase() === 'admin') {
                alert('Impossible de supprimer le compte administrateur principal.');
                return;
            }
            if (confirm(`Voulez-vous vraiment supprimer le compte RIO: ${rio} ?`)) {
                const data = pmLocalStorage.getItem(STORAGE_KEY);
                let allUsers = data ? JSON.parse(data) : [];
                allUsers = allUsers.filter(u => u.rio.toString().toLowerCase() !== rio.toString().toLowerCase());
                pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
                if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
                loadAccounts();
            }
        };

        window.editUser = (rio) => {
            const data = pmLocalStorage.getItem(STORAGE_KEY);
            const allUsers = data ? JSON.parse(data) : [];
            const user = allUsers.find(u => u.rio.toString().toLowerCase() === rio.toString().toLowerCase());
            if (!user) return;

            const formArea = document.getElementById('create-account-form-area');
            const title = formArea.querySelector('.card-title');

            title.textContent = `Modifier le compte : ${rio}`;
            document.getElementById('new-rio').value = user.rio;
            document.getElementById('new-rio').disabled = true;
            document.getElementById('new-nom').value = user.nom;
            document.getElementById('new-prenom').value = user.prenom;
            document.getElementById('new-grade').value = user.grade;
            document.getElementById('new-role').value = user.role;
            document.getElementById('new-is-recruteur').checked = !!user.isRecruteur;
            document.getElementById('new-password').value = user.password;
            const specEl = document.getElementById('new-specialite');
            if (specEl) specEl.value = normalizeAccountSpecialiteCode(user);
            const sa = document.getElementById('admin-serie-arme');
            const sp = document.getElementById('admin-serie-pie');
            const sl = document.getElementById('admin-serie-lbd');
            if (sa) sa.value = user.serieArmeService || '';
            if (sp) sp.value = user.seriePie || '';
            if (sl) sl.value = user.serieLbd || '';

            formArea.style.display = 'block';
            formArea.dataset.mode = 'edit';
            formArea.scrollIntoView({ behavior: 'smooth' });
        };

        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Gestion des comptes</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary" id="btn-export-accounts" title="Sauvegarder les données"><i class="fas fa-download"></i> Export</button>
                        <button class="btn btn-secondary" id="btn-import-accounts" title="Restaurer les données"><i class="fas fa-upload"></i> Import</button>
                        <button class="btn btn-primary" id="btn-show-create-form"><i class="fas fa-plus"></i> Créer un compte</button>
                    </div>
                </div>
                
                <input type="file" id="import-file-input" style="display: none;" accept=".json">

                <div id="create-account-form-area" style="display: none; margin-bottom: 30px; border: 1px solid var(--pm-blue); padding: 20px; border-radius: 8px; background: rgba(26, 115, 232, 0.05);">
                    <h3 class="card-title">Nouveau compte</h3>
                    <div class="form-grid">
                        <div class="form-group"><label>RIO</label><input type="text" id="new-rio" placeholder="Ex: 123456"></div>
                        <div class="form-group"><label>Nom</label><input type="text" id="new-nom" placeholder="Ex: MARTIN"></div>
                        <div class="form-group"><label>Prénom</label><input type="text" id="new-prenom" placeholder="Ex: Jean"></div>
                        <div class="form-group">
                            <label>Grade</label>
                            <select id="new-grade" class="form-select-native">${PM_GRADE_OPTIONS_HTML}</select>
                        </div>
                        <div class="form-group">
                            <label>Spécialité</label>
                            <select id="new-specialite" class="form-select-native">${PM_ACCOUNT_SPEC_SELECT_HTML}</select>
                        </div>
                        <div class="form-group">
                            <label>Rôle</label>
                            <select id="new-role">
                                <option value="Effectif">Effectif</option>
                                <option value="Direction">Direction</option>
                            </select>
                        </div>
                        <div class="form-group" style="display: flex; align-items: center; gap: 8px; padding-top: 24px;">
                            <input type="checkbox" id="new-is-recruteur" style="width: 18px; height: 18px; cursor: pointer;">
                            <label for="new-is-recruteur" style="cursor: pointer; font-weight: 600;">Recruteur / Formateur</label>
                        </div>
                        <div class="form-group"><label>Mot de passe</label><input type="password" id="new-password"></div>
                    </div>
                    <p class="dash-welcome-sub" style="margin: 18px 0 10px;">Numéros de série équipement (visibles sur la fiche agent et dans la recherche effectif)</p>
                    <div class="fiche-agent-series fiche-agent-series--admin" role="group" aria-label="Numéros de série équipement du compte">
                        <div class="fiche-agent-serie-block">
                            <span class="fiche-agent-serie-label">Numéro Série De Votre Arme De Service&nbsp;: Sig Sauer SP 22</span>
                            <input type="text" class="fiche-agent-serie-input" id="admin-serie-arme" placeholder="Ex&nbsp;: 969506POL593010" autocomplete="off">
                        </div>
                        <div class="fiche-agent-serie-block">
                            <span class="fiche-agent-serie-label">Numéro Série De Votre PIE&nbsp;: Pistolet A Impulsion Electrique</span>
                            <input type="text" class="fiche-agent-serie-input" id="admin-serie-pie" placeholder="Ex&nbsp;: 969506POL593010" autocomplete="off">
                        </div>
                        <div class="fiche-agent-serie-block">
                            <span class="fiche-agent-serie-label">Numéro Série De Votre LBD&nbsp;: Lanceur De Balles De Défense</span>
                            <input type="text" class="fiche-agent-serie-input" id="admin-serie-lbd" placeholder="Ex&nbsp;: 969506POL593010" autocomplete="off">
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-success" id="btn-save-account">Créer / Sauvegarder</button>
                        <button class="btn btn-secondary" id="btn-cancel-form">Annuler</button>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>RIO</th>
                            <th>Nom & Prénom</th>
                            <th>Grade</th>
                            <th>Rôle</th>
                            <th>Spécialité</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="accounts-table-body"></tbody>
                </table>
            </div>
        `;

        loadAccounts();

        document.getElementById('btn-show-create-form').onclick = () => {
            const formArea = document.getElementById('create-account-form-area');
            formArea.style.display = 'block';
            formArea.dataset.mode = 'create';
            formArea.querySelector('.card-title').textContent = 'Nouveau compte';
            document.getElementById('new-rio').disabled = false;
            let newRio = '';
            try { newRio = generateUniqueRIO(); } catch(e) { newRio = String(Date.now()).slice(-7); }
            if (!newRio || newRio.length !== 7) newRio = String(Math.floor(1000000 + Math.random() * 9000000));
            document.getElementById('new-rio').value = newRio;
            document.getElementById('new-nom').value = '';
            document.getElementById('new-prenom').value = '';
            document.getElementById('new-grade').value = 'DPM';
            document.getElementById('new-role').value = 'Effectif';
            document.getElementById('new-is-recruteur').checked = false;
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*';
            let pwd = '';
            for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
            document.getElementById('new-password').value = pwd;
            const specReset = document.getElementById('new-specialite');
            if (specReset) specReset.value = '';
            const sa = document.getElementById('admin-serie-arme');
            const sp = document.getElementById('admin-serie-pie');
            const sl = document.getElementById('admin-serie-lbd');
            if (sa) sa.value = '';
            if (sp) sp.value = '';
            if (sl) sl.value = '';
        };

        document.getElementById('btn-cancel-form').onclick = () => {
            document.getElementById('create-account-form-area').style.display = 'none';
        };

        document.getElementById('btn-save-account').onclick = () => {
            if (typeof window._handleSaveAccount === 'function') window._handleSaveAccount();
        };
        document.getElementById('btn-save-account').addEventListener('click', function(e) {
            if (typeof window._handleSaveAccount === 'function') { e.stopImmediatePropagation(); window._handleSaveAccount(); }
        });

        window._handleSaveAccount = () => {
            const formArea = document.getElementById('create-account-form-area');
            if (!formArea) return;
            const mode = formArea.dataset.mode || 'create';
            const rio = document.getElementById('new-rio').value.trim();
            const nom = document.getElementById('new-nom').value.trim();
            const prenom = document.getElementById('new-prenom').value.trim();
            const grade = document.getElementById('new-grade').value;
            const role = document.getElementById('new-role').value;
            const password = document.getElementById('new-password').value;
            const specRaw = document.getElementById('new-specialite')?.value ?? '';
            const specialites = specRaw ? [specRaw] : [];
            const serieArmeService = document.getElementById('admin-serie-arme')?.value.trim() ?? '';
            const seriePie = document.getElementById('admin-serie-pie')?.value.trim() ?? '';
            const serieLbd = document.getElementById('admin-serie-lbd')?.value.trim() ?? '';
            const isRecruteur = document.getElementById('new-is-recruteur')?.checked === true;

            if (!nom || !prenom) {
                alert('Veuillez remplir Nom et Prénom.');
                return;
            }

            let rioFinal = rio;
            if (!rioFinal) {
                try { rioFinal = generateUniqueRIO(); } catch(e) { rioFinal = String(Date.now()).slice(-7); }
                if (!rioFinal || rioFinal.length !== 7) rioFinal = String(Math.floor(1000000 + Math.random() * 9000000));
            }

            let pwdFinal = password;
            if (!pwdFinal) {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*';
                pwdFinal = '';
                for (let i = 0; i < 10; i++) pwdFinal += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const data = pmLocalStorage.getItem(STORAGE_KEY);
            let allUsers = data ? JSON.parse(data) : [];

            if (mode === 'create') {
                if (allUsers.some(u => u.rio.toString() === rioFinal)) {
                    alert('Ce RIO existe déjà !');
                    return;
                }
                allUsers.push({
                    rio: rioFinal, nom, prenom, grade, role, isRecruteur, password: pwdFinal, specialites, serieArmeService, seriePie, serieLbd,
                });
            } else {
                const index = allUsers.findIndex(u => u.rio.toString() === rioFinal);
                if (index !== -1) {
                    allUsers[index] = { ...allUsers[index], nom, prenom, grade, role, isRecruteur, password: pwdFinal, specialites, serieArmeService, seriePie, serieLbd };
                }
            }

            pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
            if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
            const savedRow = allUsers.find(u => u.rio.toString() === rioFinal);
            if (savedRow && String(savedRow.rio) === String(currentUser.rio)) {
                currentUser = savedRow;
                sessionStorage.setItem('currentUser', JSON.stringify(savedRow));
                updateUI(currentUser);
            }
            addLog(mode === 'create' ? "Création compte" : "Modification compte", `${nom} ${prenom}`);
            if (mode === 'create') {
                alert(`Compte créé !\n\nRIO : ${rioFinal}\nMot de passe : ${pwdFinal}\n\nCommuniquez ces identifiants à l'agent.`);
            } else {
                alert('Compte sauvegardé !');
            }
            loadAccounts();
            void syncPersonnelFichesGridsFromServer().catch(() => {});
            document.getElementById('create-account-form-area').style.display = 'none';
        };

        document.getElementById('btn-export-accounts').onclick = () => {
            const data = pmLocalStorage.getItem(STORAGE_KEY);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'intranet_pm_comptes.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        document.getElementById('btn-import-accounts').onclick = () => {
            document.getElementById('import-file-input').click();
        };

        document.getElementById('import-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        pmLocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                        if(window.pmPersistNow) try{ window.pmPersistNow(); }catch(e){}
                        alert('Import réussi !');
                        loadAccounts();
                        void syncPersonnelFichesGridsFromServer().catch(() => {});
                    } catch (err) {
                        alert('Erreur lors de l\'import : fichier invalide.');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    function renderListeRIO() {
        if (!isPmTriadeLead(currentUser)) {
            contentArea.innerHTML = `<div class="card"><p>Accès réservé à la Direction.</p></div>`;
            return;
        }
        const data = pmLocalStorage.getItem(STORAGE_KEY);
        const allUsers = data ? JSON.parse(data) : [];
        const rows = [...allUsers].sort(compareUsersByGradeThenName).map(u => `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px; font-weight:600;">${escapeHtml(u.nom || '')}</td>
                <td style="padding:10px;">${escapeHtml(u.prenom || '')}</td>
                <td style="padding:10px; font-family:monospace; font-weight:700; color:#0f172a;">${escapeHtml(String(u.rio || ''))}</td>
                <td style="padding:10px;">${escapeHtml(u.grade || '')}</td>
            </tr>
        `).join('');
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Liste des RIO — Effectif</h2>
                    <span style="font-size:12px; color:#64748b;">${allUsers.length} agent(s)</span>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid #cbd5e1; background:#f8fafc;">
                                <th style="padding:12px 10px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Nom</th>
                                <th style="padding:12px 10px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Prénom</th>
                                <th style="padding:12px 10px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">RIO</th>
                                <th style="padding:12px 10px; text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderGestionWebhooks() {

        if (!isPmTriadeLead(currentUser)) {

            contentArea.innerHTML = `<div class="card"><p>Accès réservé à la Direction.</p></div>`;

            return;

        }

        const WEBHOOK_DEFS = [

            {id:'saisie', nom:'Rapport de Saisie', desc:'Nouveau rapport de saisie', ph:'https://discord.com/api/webhooks/...'},

            {id:'tir', nom:'Rapport de Tir', desc:'Nouveau rapport de tir', ph:'https://discord.com/api/webhooks/...'},

            {id:'taj', nom:'TAJ', desc:'Nouveau dossier TAJ', ph:'https://discord.com/api/webhooks/...'},

            {id:'fpr', nom:'FPR', desc:'Nouveau signalement FPR', ph:'https://discord.com/api/webhooks/...'},

            {id:'incident', nom:'Rapport incident', desc:'Nouveau rapport incident (Réception)', ph:'https://discord.com/api/webhooks/...'},

            {id:'interpellation', nom:"Rapport d'Interpellation", desc:'Nouveau rapport interpellation', ph:'https://discord.com/api/webhooks/...'},

            {id:'recrutement', nom:'Recrutement', desc:'Nouvelle candidature / message', ph:'https://discord.com/api/webhooks/...'},

        ];

        // Migration: si ancien format tableau avec noms libres, on mappe

        let raw = JSON.parse(pmLocalStorage.getItem(WEBHOOKS_KEY) || '[]');

        let map = {};

        if (Array.isArray(raw)) {

            raw.forEach(w=>{

                const k = String(w.id||w.nom||'').toLowerCase();

                if(k.includes('saisie')) map['saisie']=w.url||w;

                else if(k.includes('tir')) map['tir']=w.url||w;

                else if(k.includes('pointeuse')||k.includes('pointage')) map['pointeuse']=w.url||w;

                else if(k==='taj') map['taj']=w.url||w;

                else if(k==='fpr') map['fpr']=w.url||w;

                else if(k.includes('recrut')) map['recrutement']=w.url||w;

            });

            // aussi si objet {saisie:url}

            if(!Array.isArray(raw) && typeof raw==='object' && raw!==null) map = raw;

        } else if (raw && typeof raw==='object') map = raw;

        // Normalise map values to url string

        WEBHOOK_DEFS.forEach(d=>{

            if(typeof map[d.id]==='object' && map[d.id]!==null) map[d.id]=map[d.id].url||'';

            if(typeof map[d.id]!=='string') map[d.id]=map[d.id]||'';

        });

        contentArea.innerHTML = `

            <div class="card" style="max-width:900px;">

                <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;"><div style="width:28px; height:28px; border-radius:50%; background:#ede9fe; color:#7c3aed; display:flex; align-items:center; justify-content:center;"><i class="fas fa-globe"></i></div><h2 class="card-title" style="margin:0;">Webhooks Discord</h2></div>

                <p style="color:#64748b; font-size:13px; margin:0 0 18px 38px;">Configurez les URLs des webhooks Discord pour recevoir les notifications automatiques.</p>

                <div id="wh-rows" style="display:flex; flex-direction:column; gap:10px;">

                    ${WEBHOOK_DEFS.map(d=>`

                        <div style="background:#f8f7fb; border-radius:10px; padding:14px 16px; display:flex; align-items:center; gap:16px; flex-wrap:wrap;">

                            <div style="flex:1; min-width:160px;">

                                <div style="font-weight:700; font-size:13px; color:#1e293b;">${d.nom}</div>

                                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${d.desc}</div>

                            </div>

                            <div style="flex:1.6; min-width:260px; display:flex; gap:8px; align-items:center;">

                                <input type="url" id="wh-${d.id}" value="${escapeHtml(map[d.id]||'')}" placeholder="${d.ph}" style="flex:1; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; background:#fff;">

                                <button class="btn btn-secondary btn-sm" onclick="testWh('${d.id}')" title="Tester"><i class="fas fa-paper-plane"></i></button>

                            </div>

                        </div>`).join('')}

                </div>

                <div style="display:flex; gap:10px; margin-top:18px; justify-content:flex-end;">

                    <button class="btn btn-primary" id="btn-save-all-wh"><i class="fas fa-save"></i> Enregistrer tous</button>

                </div>

                <p style="font-size:11px; color:#94a3b8; margin-top:12px;">Chaque URL doit commencer par <code>https://discord.com/api/webhooks/</code>. Les rapports utiliseront automatiquement le webhook correspondant.</p>

            </div>

            </div>`;

        document.getElementById('btn-save-all-wh').onclick= async ()=>{

            const btn=document.getElementById('btn-save-all-wh');
            const prevHtml=btn ? btn.innerHTML : '';
            if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Enregistrement...'; }
            const newMap={};

            let ok=true;

            WEBHOOK_DEFS.forEach(d=>{

                const v=document.getElementById('wh-'+d.id).value.trim();

                if(v && !v.startsWith('https://discord.com/api/webhooks/')){ alert('URL invalide pour '+d.nom+' : doit commencer par https://discord.com/api/webhooks/'); ok=false; }

                newMap[d.id]=v;

            });

            if(!ok){ if(btn){ btn.disabled=false; btn.innerHTML=prevHtml; } return; }

            pmLocalStorage.setItem(WEBHOOKS_KEY, JSON.stringify(newMap));
            // Force l'envoi immédiat au serveur et attend la réponse
            try{
                if(window.pmPersistNow) await window.pmPersistNow();
                // Vérifie que le serveur a bien reçu (GET)
                const chk=await fetch('api/storage', {credentials:'same-origin'});
                if(!chk.ok) throw new Error('Serveur '+chk.status);
            }catch(e){
                console.error('[PM] Webhook save failed', e);
                alert('Erreur sauvegarde serveur : '+(e.message||e));
                if(btn){ btn.disabled=false; btn.innerHTML=prevHtml; }
                return;
            }

            addLog('Webhooks sauvegardés', Object.keys(newMap).filter(k=>newMap[k]).length+' URL(s)');

            alert('Webhooks enregistrés ! ('+Object.keys(newMap).filter(k=>newMap[k]).length+' URL(s))');
            if(btn){ btn.disabled=false; btn.innerHTML=prevHtml; }

            renderGestionWebhooks();

        };

        window.testWh=async(id)=>{

            const v=document.getElementById('wh-'+id).value.trim();

            if(!v) return alert('Renseignez d\'abord l\'URL');

            if(!v.startsWith('https://')) return alert('URL invalide');

            try{

                const r=await fetch(v,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`✅ Test webhook **${id}** depuis intranet Police Municipale`, username:'PM Intranet'})});

                if(r.ok) alert('Test envoyé ! Vérifiez Discord.');

                else alert('échec: '+r.status+' -- vérifiez l\'URL');

            }catch(e){ alert('Erreur réseau: '+e.message); }

        };

        // Helper global pour les rapports : récupère l'URL par type

        window.__pmGetWebhookUrl = (type)=>{

            try{

                const m=JSON.parse(pmLocalStorage.getItem(WEBHOOKS_KEY)||'{}');

                if(m && typeof m==='object' && !Array.isArray(m) && m[type]) return String(m[type]).trim();

                if(Array.isArray(m)){ const f=m.find(w=> String(w.id||w.nom||'').toLowerCase()===type.toLowerCase()); if(f) return String(f.url||'').trim(); }

            }catch(e){}

            // fallback ancien per-user webhook

            return String(currentUser.webhookUrl||'').trim();

        };

    }

    // --- Render Generer Code Integration ---

    async function renderGenererCodeIntegration() {        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {            contentArea.innerHTML = `<div class="card"><p>Accès réservé aux recruteurs / formateurs et à la Direction.</p></div>`;            return;        }        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-key" aria-hidden="true"></i> Générer un code d\'intégration</h2>                <p style="color:#666;margin-bottom:20px;font-size:14px;">Générez des codes d\'accès au formulaire d\'intégration pour les candidats. Chaque code est valide pour une seule utilisation.</p>                <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:24px;">                    <div style="flex:1;min-width:200px;">                        <label style="display:block;font-weight:600;font-size:13px;margin-bottom:6px;">Nombre de codes à générer</label>                        <input type="number" id="gen-code-count" value="1" min="1" max="20" style="width:100%;padding:10px 12px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;">                    </div>                    <button type="button" class="btn btn-primary" id="gen-code-btn"><i class="fas fa-plus-circle"></i> Générer</button>                </div>                <div id="gen-code-result" style="display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;">                    <h3 style="margin:0 0 8px;font-size:14px;color:#166534;"><i class="fas fa-check-circle"></i> Code(s) généré(s)</h3>                    <div id="gen-code-list" style="font-family:monospace;font-size:16px;letter-spacing:1px;"></div>                    <button type="button" class="btn btn-secondary" id="gen-code-copy" style="margin-top:10px;font-size:12px;"><i class="fas fa-copy"></i> Copier tout</button>                </div>                <div>                    <h3 style="font-size:14px;margin-bottom:12px;"><i class="fas fa-list"></i> Codes existants</h3>                    <div id="codes-list-container" style="overflow-x:auto;"></div>                </div>            </div>        `;        document.getElementById('gen-code-btn').onclick = async () => {            const count = parseInt(document.getElementById('gen-code-count').value) || 1;            const btn = document.getElementById('gen-code-btn');            btn.disabled = true;            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';            try {                const res = await fetch('api/integration-codes/generate', {                    method: 'POST', credentials: 'same-origin',                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },                    body: JSON.stringify({ count }),                });                const data = await res.json().catch(() => ({}));                if (!res.ok || !data.ok) { alert(data.error || 'Erreur.'); return; }                const result = document.getElementById('gen-code-result');                const list = document.getElementById('gen-code-list');                result.style.display = '';                list.innerHTML = data.codes.map(c => '<div style="padding:4px 0;color:#166534;">' + escapeHtml(c) + '</div>').join('');                loadExistingCodes();            } catch { alert('Erreur serveur.'); }            finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Générer'; }        };        document.getElementById('gen-code-copy')?.addEventListener('click', () => {            const codes = document.getElementById('gen-code-list').innerText;            navigator.clipboard.writeText(codes).then(() => alert('Codes copiés !'));        });        async function loadExistingCodes() {            const container = document.getElementById('codes-list-container');            try {                const res = await fetch('api/integration-codes/list', { credentials: 'same-origin' });                const data = await res.json().catch(() => ({}));                if (!res.ok || !data.codes || !data.codes.length) {                    container.innerHTML = '<p style="color:#999;font-size:13px;">Aucun code généré pour le moment.</p>';                    return;                }                let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';                html += '<thead><tr style="border-bottom:2px solid var(--pm-border);">';                html += '<th style="padding:8px;text-align:left;">Code</th>';                html += '<th style="padding:8px;text-align:left;">Créé par</th>';                html += '<th style="padding:8px;text-align:left;">Date</th>';                html += '<th style="padding:8px;text-align:center;">Statut</th>';                html += '</tr></thead><tbody>';                data.codes.reverse().forEach(c => {                    const status = c.used ? '<span style="color:#ef4444;font-weight:600;">Utilisé</span>' : '<span style="color:#22c55e;font-weight:600;">Disponible</span>';                    const dt = c.created_at ? new Date(c.created_at).toLocaleString('fr-FR') : '--';                    html += '<tr style="border-bottom:1px solid var(--pm-border);">';                    html += '<td style="padding:8px;font-family:monospace;font-weight:600;">' + escapeHtml(c.code) + '</td>';                    html += '<td style="padding:8px;">' + escapeHtml(c.created_by || '') + '</td>';                    html += '<td style="padding:8px;">' + dt + '</td>';                    html += '<td style="padding:8px;text-align:center;">' + status + '</td>';                    html += '</tr>';                });                html += '</tbody></table>';                container.innerHTML = html;            } catch { container.innerHTML = '<p style="color:#999;">Erreur de chargement.</p>'; }        }        loadExistingCodes();    }    // --- Render Resultats Formulaires ---    async function renderResultatsFormulaires() {        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {            contentArea.innerHTML = `<div class="card"><p>Accès réservé aux recruteurs / formateurs et à la Direction.</p></div>`;            return;        }        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-chart-bar" aria-hidden="true"></i> Résultats des formulaires d\'intégration</h2>                <p style="color:#666;margin-bottom:20px;font-size:14px;">Consultez les résultats des candidats ayant passé le formulaire d\'intégration. Note minimale requise : <strong>50/100</strong>.</p>                <div id="results-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>                <div id="results-table-container" style="overflow-x:auto;"></div>            </div>        `;        try {            const res = await fetch('api/integration-form/results', { credentials: 'same-origin' });            const data = await res.json().catch(() => ({}));            if (!res.ok) { document.getElementById('results-table-container').innerHTML = '<p style="color:#ef4444;">' + (data.error || 'Erreur.') + '</p>'; return; }            const results = data.results || [];            const total = results.length;            const passed = results.filter(r => r.score >= 50).length;            const failed = total - passed;            const avgScore = total > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / total) : 0;            document.getElementById('results-stats').innerHTML = `                <div style="flex:1;min-width:150px;background:var(--pm-white);border:1px solid var(--pm-border);border-radius:10px;padding:16px;text-align:center;">                    <p style="margin:0;font-size:28px;font-weight:800;color:var(--pm-blue);">${total}</p>                    <p style="margin:4px 0 0;font-size:12px;color:#666;">Total passages</p>                </div>                <div style="flex:1;min-width:150px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;">                    <p style="margin:0;font-size:28px;font-weight:800;color:#166534;">${passed}</p>                    <p style="margin:4px 0 0;font-size:12px;color:#166534;">Admis (≥50)</p>                </div>                <div style="flex:1;min-width:150px;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px;text-align:center;">                    <p style="margin:0;font-size:28px;font-weight:800;color:#991b1b;">${failed}</p>                    <p style="margin:4px 0 0;font-size:12px;color:#991b1b;">Non admis (&lt;50)</p>                </div>                <div style="flex:1;min-width:150px;background:var(--pm-white);border:1px solid var(--pm-border);border-radius:10px;padding:16px;text-align:center;">                    <p style="margin:0;font-size:28px;font-weight:800;color:var(--pm-blue);">${avgScore}</p>                    <p style="margin:4px 0 0;font-size:12px;color:#666;">Moyenne /100</p>                </div>            `;            if (total === 0) {                document.getElementById('results-table-container').innerHTML = '<p style="color:#999;font-size:13px;">Aucun résultat pour le moment.</p>';                return;            }            let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';            html += '<thead><tr style="border-bottom:2px solid var(--pm-border);">';            html += '<th style="padding:10px;text-align:left;">#</th>';            html += '<th style="padding:10px;text-align:left;">Candidat</th>';            html += '<th style="padding:10px;text-align:left;">Code</th>';            html += '<th style="padding:10px;text-align:center;">Note</th>';            html += '<th style="padding:10px;text-align:center;">Statut</th>';            html += '<th style="padding:10px;text-align:left;">Date</th>';            html += '<th style="padding:10px;text-align:center;">Détails</th>';            html += '</tr></thead><tbody>';            results.forEach((r, idx) => {                const passed = r.score >= 50;                const badge = passed                    ? '<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:12px;font-weight:600;font-size:12px;">Admis</span>'                    : '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-weight:600;font-size:12px;">Non admis</span>';                const dt = r.submitted_at ? new Date(r.submitted_at).toLocaleString('fr-FR') : '--';                const scoreColor = passed ? '#166534' : '#991b1b';                html += '<tr style="border-bottom:1px solid var(--pm-border);">';                html += '<td style="padding:10px;">' + (idx + 1) + '</td>';                html += '<td style="padding:10px;font-weight:600;">' + escapeHtml(r.candidate_name || 'Anonyme') + '</td>';                html += '<td style="padding:10px;font-family:monospace;">' + escapeHtml(r.code) + '</td>';                html += '<td style="padding:10px;text-align:center;font-weight:800;font-size:16px;color:' + scoreColor + ';">' + r.score + '</td>';                html += '<td style="padding:10px;text-align:center;">' + badge + '</td>';                html += '<td style="padding:10px;">' + dt + '</td>';                html += '<td style="padding:10px;text-align:center;"><button class="btn btn-secondary result-detail-btn" data-idx="' + idx + '" style="font-size:11px;padding:4px 10px;"><i class="fas fa-eye"></i></button></td>';                html += '</tr>';            });            html += '</tbody></table>';            document.getElementById('results-table-container').innerHTML = html;            document.querySelectorAll('.result-detail-btn').forEach(btn => {                btn.onclick = () => {                    const idx = parseInt(btn.dataset.idx);                    const r = results[idx];                    if (!r) return;                    const answers = r.answers || {};                    const questions = [                        { q: 'Quel est le rôle principal de la Police Municipale ?', opts: ['Assurer la sécurité publique sur le territoire municipal', 'Gérer le budget de la commune', 'Organiser les élections locales', 'Contrôler les transports en commun'], correct: 0 },                        { q: 'Quel texte encadre les attributions de la Police Municipale en France ?', opts: ['Le Code civil', 'Le Code général des collectivités territoriales (CGCT)', 'Le Code pénal uniquement', 'La Constitution de 1958'], correct: 1 },                        { q: 'Qui nomme les officiers de police judiciaire de la Police Municipale ?', opts: ['Le Préfet', 'Le Maire', 'Le Ministre de l\'Intérieur', 'Le Directeur Général de la Police Nationale'], correct: 1 },                        { q: 'Un agent de Police Municipale peut-il procéder à une interpellation ?', opts: ['Non, jamais', 'Oui, dans les cas prévus par la loi', 'Oui, pour tout délit', 'Uniquement la nuit'], correct: 1 },                        { q: 'Qu\'est-ce qu\'un TAJ ?', opts: ['Un type d\'alarme', 'Traitement Anticipé de la Justice', 'Technique d\'Animation de la Jeunesse', 'Titre d\'Autorisation Juridique'], correct: 1 },                        { q: 'La rédaction d\'un rapport d\'interpellation est obligatoire lors d\'une interpellation.', opts: ['Oui, toujours', 'Non, jamais', 'Seulement en cas de délit grave', 'Seulement si le procureur le demande'], correct: 0 },                        { q: 'Quelle est la priorité numéro un lors d\'une intervention sur scène ?', opts: ['Répondre à tous les appels simultanément', 'La sécurité des personnes et des biens', 'L\'arrestation immédiate des suspects', 'La prise de photos pour documentation'], correct: 1 },                        { q: 'En cas de découverte d\'un colis suspect, que doit faire un agent ?', opts: ['Le déplacer rapidement', 'Le toucher pour vérifier', 'éloigner les personnes et alerter les services compétents', 'L\'ouvrir prudemment pour identifier le contenu'], correct: 2 },                        { q: 'Que signifie le sigle FPR ?', opts: ['Fichier Permanent de Recrutement', 'Fiche de Police Rapprochée', 'Fichier des Procédures de Référence', 'Formation Permanente des Recrues'], correct: 0 },                        { q: 'Un agent de Police Municipale doit-il porter sa badge d\'identification visible en service ?', opts: ['Non, c\'est optionnel', 'Oui, c\'est une obligation', 'Uniquement lors des interpellations', 'Uniquement de nuit'], correct: 1 },                    ];                    let dHtml = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="modal-overlay">';                    dHtml += '<div style="background:var(--pm-white);border-radius:12px;padding:28px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">';                    dHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';                    dHtml += '<h3 style="margin:0;">Détail — ' + escapeHtml(r.candidate_name || 'Anonyme') + ' (' + r.score + '/100)</h3>';                    dHtml += '<button onclick="document.getElementById(\'modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;">&times;</button></div>';                    questions.forEach((q, qi) => {                        const userAns = answers['iq-' + qi];                        const isCorrect = userAns === q.correct;                        const color = isCorrect ? '#166534' : '#991b1b';                        const icon = isCorrect ? 'fa-check-circle' : 'fa-times-circle';                        dHtml += '<div style="padding:10px 0;border-bottom:1px solid var(--pm-border);">';                        dHtml += '<p style="margin:0;font-size:13px;font-weight:600;"><i class="fas ' + icon + '" style="color:' + color + ';margin-right:6px;"></i>' + (qi + 1) + '. ' + q.q + '</p>';                        dHtml += '<p style="margin:4px 0 0 20px;font-size:12px;color:' + color + ';">Réponse : ' + (userAns !== undefined ? q.opts[userAns] : 'Non répondu') + '</p>';                        if (!isCorrect) dHtml += '<p style="margin:2px 0 0 20px;font-size:12px;color:#166534;">Correct : ' + q.opts[q.correct] + '</p>';                        dHtml += '</div>';                    });                    dHtml += '</div></div>';                    document.body.insertAdjacentHTML('beforeend', dHtml);                    document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') e.target.remove(); });                };            });        } catch { document.getElementById('results-table-container').innerHTML = '<p style="color:#ef4444;">Erreur de chargement.</p>'; }    }    // --- Integration Exam: one question at a time, 30min timer, no back ---

    async function renderCommencerExamen() {

        currentUser = refreshCurrentUser();

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-pen-fancy" aria-hidden="true"></i> Rejoindre un examen</h2>                <p style="color:#666;margin-bottom:20px;font-size:14px;">Entrez le code de l\'examen pour commencer</p>                <div id="examen-start-card" style="max-width:560px;margin:0 auto;">                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">                        <div style="flex:1;min-width:180px;">                            <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Nom</label>                            <input type="text" id="ex-nom" value="${escapeHtml(currentUser.nom || '')}" style="width:100%;padding:10px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;">                        </div>                        <div style="flex:1;min-width:180px;">                            <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Prénom</label>                            <input type="text" id="ex-prenom" value="${escapeHtml(currentUser.prenom || '')}" style="width:100%;padding:10px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;">                        </div>                    </div>                    <div style="margin-bottom:16px;">                        <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Code d\'examen</label>                        <input type="text" id="ex-code" placeholder="EX-INTEGRATION-XXXX-XXXX ou EX-OPJ-XXXX-XXXX" style="width:100%;padding:10px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;font-family:monospace;letter-spacing:1px;">                    </div>                    <div id="examen-type-info" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin-bottom:16px;">                        <p style="margin:0;font-size:13px;color:#0369a1;" id="examen-type-detail"></p>                    </div>                    <div id="examen-start-alert" class="pub-alert" role="status"></div>                    <button type="button" class="btn btn-primary" id="ex-start-btn"><i class="fas fa-play"></i> Rejoindre</button>                </div>                <div id="examen-quiz-wrapper" style="display:none;max-width:720px;margin:0 auto;">                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">                        <div style="display:flex;align-items:center;gap:10px;">                            <div style="width:42px;height:42px;border-radius:50%;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">                                <i class="fas fa-pen-fancy" style="font-size:18px;color:var(--pm-pub-accent);"></i>                            </div>                            <div>                                <h3 style="margin:0;font-size:15px;" id="examen-type-label">Examen d\'intégration</h3>                                <p style="margin:0;color:#666;font-size:12px;" id="examen-cat-label"></p>                            </div>                        </div>                        <div id="examen-timer" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 16px;font-weight:800;font-size:18px;color:#991b1b;font-family:monospace;">30:00</div>                    </div>                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">                        <div style="flex:1;">                            <div id="examen-progress-bar" style="background:#e5e7eb;border-radius:8px;height:6px;overflow:hidden;">                                <div id="examen-progress-fill" style="background:var(--pm-pub-accent);height:100%;width:0%;transition:width 0.3s;border-radius:8px;"></div>                            </div>                        </div>                        <p id="examen-progress-text" style="font-size:12px;color:#666;margin:0;white-space:nowrap;">1 / 100</p>                    </div>                    <div id="examen-question-area"></div>                    <div style="display:flex;justify-content:space-between;margin-top:24px;">                        <div></div>                        <button type="button" class="btn btn-primary" id="ex-next-btn">Suivant <i class="fas fa-arrow-right"></i></button>                    </div>                </div>                <div id="examen-result-wrapper" style="display:none;max-width:600px;margin:0 auto;text-align:center;">                    <div id="examen-result-icon" style="width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"></div>                    <h2 id="examen-result-title" style="margin-bottom:4px;"></h2>                    <p id="examen-result-score" style="font-size:48px;font-weight:800;margin:12px 0;"></p>                    <p id="examen-result-msg" style="color:#666;font-size:14px;margin-bottom:24px;"></p>                    <div id="examen-result-verify" style="display:none;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;"></div>                    <div id="examen-result-details" style="text-align:left;background:var(--pm-pub-bg);border-radius:10px;padding:20px;margin-bottom:24px;max-height:400px;overflow-y:auto;"></div>                    <button type="button" class="btn btn-secondary" id="ex-back-btn"><i class="fas fa-arrow-left"></i> Retour</button>                </div>            </div>        `;

        let examQuestions = [];

        let examAnswers = {};

        let currentIndex = 0;

        let timerInterval = null;

        let timeLeft = 30 * 60;

        let examStarted = false;

        let proctoring = { startTime: 0, tabSwitchCount: 0, copyPasteCount: 0 };

        function onTabSwitch() {

            if (document.hidden) proctoring.tabSwitchCount++;

        }

        function onCopyPaste() {

            proctoring.copyPasteCount++;

        }

        function startTimer() {

            const timerEl = document.getElementById('examen-timer');

            timerInterval = setInterval(() => {

                timeLeft--;

                if (timeLeft <= 0) {

                    clearInterval(timerInterval);

                    submitExam();

                    return;

                }

                const m = Math.floor(timeLeft / 60);

                const s = timeLeft % 60;

                timerEl.textContent =

                    String(m).padStart(2, '0') +

                    ':' +

                    String(s).padStart(2, '0');

                if (timeLeft <= 300) {

                    timerEl.style.background = '#fef2f2';

                    timerEl.style.color = '#991b1b';

                }

                if (timeLeft <= 60) {

                    timerEl.style.background = '#fee2e2';

                    timerEl.style.fontWeight = '900';

                }

            }, 1000);

        }

        function saveCurrentAnswer() {

            const q = examQuestions[currentIndex];

            if (!q) return;

            const key = 'q-' + q.id;

            if (q.type === 'qcm') {

                const sel = document.querySelector(

                    'input[name="eq-' + q.id + '"]:checked',

                );

                examAnswers[key] = sel ? sel.value : '';

            } else if (q.type === 'trou') {

                const inp = document.getElementById('ex-trou-' + q.id);

                examAnswers[key] = inp ? inp.value : '';

            } else if (q.type === 'text') {

                const ta = document.getElementById('ex-text-' + q.id);

                examAnswers[key] = ta ? ta.value : '';

            }

        }

        function renderQuestion(idx) {

            const q = examQuestions[idx];

            if (!q) return;

            const area = document.getElementById('examen-question-area');

            const catLabel = document.getElementById('examen-cat-label');

            const progressText = document.getElementById(

                'examen-progress-text',

            );

            const progressFill = document.getElementById(

                'examen-progress-fill',

            );

            if (catLabel)

                catLabel.textContent =

                    q.cat +

                    ' · ' +

                    (q.type === 'qcm'

                        ? 'QCM'

                        : q.type === 'trou'

                          ? 'Texte à compléter'

                          : 'Réponse écrite');

            if (progressText)

                progressText.textContent =

                    idx + 1 + ' / ' + examQuestions.length;

            if (progressFill)

                progressFill.style.width =

                    Math.round(((idx + 1) / examQuestions.length) * 100) + '%';

            const typeBadge =

                q.type === 'qcm'

                    ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">QCM</span>'

                    : q.type === 'trou'

                      ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">Texte</span>'

                      : '<span style="background:#f3e8ff;color:#6b21a8;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">écrit</span>';

            let html =

                '<div style="background:var(--pm-pub-card);border:1px solid var(--pm-pub-border);border-radius:12px;padding:24px;">';

            html +=

                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">';

            html +=

                '<span style="background:var(--pm-pub-accent);color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">' +

                (idx + 1) +

                '</span>';

            html += typeBadge;

            html +=

                '<span style="color:#999;font-size:11px;">' +

                q.points +

                ' pt' +

                (q.points > 1 ? 's' : '') +

                '</span>';

            html += '</div>';

            if (q.image) {

                html +=

                    '<div style="margin-bottom:16px;"><img src="' +

                    escapeHtml(q.image) +

                    '" alt="Image de la question" style="max-width:100%;border-radius:8px;border:1px solid var(--pm-pub-border);"></div>';

            }

            html +=

                '<p style="font-weight:600;font-size:15px;margin:0 0 16px;line-height:1.5;white-space:pre-line;">' +

                q.q +

                '</p>';

            if (q.type === 'qcm') {

                html +=

                    '<div style="display:flex;flex-direction:column;gap:8px;">';

                (q.opts || []).forEach((opt, oi) => {

                    const inputId = 'eq-' + q.id + '-' + oi;

                    const checked =

                        examAnswers['q-' + q.id] === String(oi)

                            ? 'checked'

                            : '';

                    html +=

                        '<label for="' +

                        inputId +

                        '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--pm-pub-border);border-radius:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--pm-pub-accent)\'" onmouseout="this.style.borderColor=\'var(--pm-pub-border)\'">';

                    html +=

                        '<input type="radio" name="eq-' +

                        q.id +

                        '" id="' +

                        inputId +

                        '" value="' +

                        oi +

                        '" ' +

                        checked +

                        ' style="width:18px;height:18px;accent-color:var(--pm-pub-accent);" required>';

                    html +=

                        '<span style="font-size:13px;">' +

                        escapeHtml(opt) +

                        '</span></label>';

                });

                html += '</div>';

            } else if (q.type === 'trou') {

                const val = escapeHtml(examAnswers['q-' + q.id] || '');

                html +=

                    '<input type="text" id="ex-trou-' +

                    q.id +

                    '" value="' +

                    val +

                    '" placeholder="Votre réponse..." style="width:100%;padding:12px;border:1px solid var(--pm-pub-border);border-radius:8px;font-size:14px;" autocomplete="off">';

            } else if (q.type === 'text') {

                const val = escapeHtml(examAnswers['q-' + q.id] || '');

                html +=

                    '<textarea id="ex-text-' +

                    q.id +

                    '" rows="5" placeholder="Réponds avec tes propres mots..." style="width:100%;padding:12px;border:1px solid var(--pm-pub-border);border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;" autocomplete="off">' +

                    val +

                    '</textarea>';

            }

            html += '</div>';

            area.innerHTML = html;

            const nextBtn = document.getElementById('ex-next-btn');

            if (idx >= examQuestions.length - 1) {

                nextBtn.innerHTML =

                    '<i class="fas fa-paper-plane"></i> Soumettre';

                nextBtn.onclick = () => {

                    saveCurrentAnswer();

                    submitExam();

                };

            } else {

                nextBtn.innerHTML =

                    'Suivant <i class="fas fa-arrow-right"></i>';

                nextBtn.onclick = () => {

                    saveCurrentAnswer();

                    currentIndex++;

                    renderQuestion(currentIndex);

                };

            }

            if (q.type === 'qcm') {

                area.querySelectorAll('input[type="radio"]').forEach((r) => {

                    r.addEventListener('change', () => {

                        examAnswers['q-' + q.id] = r.value;

                    });

                });

            } // Blocage copier-coller sur les champs texte            area.querySelectorAll

            'input[type="text"], textarea'.forEach((el) => {

                el.addEventListener('copy', (e) => e.preventDefault());

                el.addEventListener('cut', (e) => e.preventDefault());

                el.addEventListener('paste', (e) => e.preventDefault());

                el.addEventListener('contextmenu', (e) => e.preventDefault());

                el.addEventListener('drop', (e) => e.preventDefault());

                el.addEventListener('keydown', (e) => {

                    if (

                        (e.ctrlKey || e.metaKey) &&

                        (e.key === 'c' ||

                            e.key === 'x' ||

                            e.key === 'v' ||

                            e.key === 'a')

                    ) {

                        e.preventDefault();

                    }

                });

            });

        }

        async function submitExam() {

            if (timerInterval) clearInterval(timerInterval);

            document.removeEventListener('visibilitychange', onTabSwitch);

            document.removeEventListener('copy', onCopyPaste);

            document.removeEventListener('paste', onCopyPaste);

            document.removeEventListener('cut', onCopyPaste);

            const btn = document.getElementById('ex-next-btn');

            if (btn) {

                btn.disabled = true;

                btn.innerHTML =

                    '<i class="fas fa-spinner fa-spin"></i> Correction--';

            }

            const nom = document.getElementById('ex-nom').value.trim();

            const prenom = document.getElementById('ex-prenom').value.trim();

            const examType = window.__pmCurrentExamType || 'INTEGRATION';

            const examCode = window.__pmCurrentExamCode || '';

            let submitUrl = 'api/integration-exam/submit';

            let totalTime = 30 * 60;

            if (examType === 'OPJ') {

                submitUrl = 'api/opj-exam/submit';

                totalTime = 90 * 60;

            } else if (examType === 'CIAPT_1') {

                submitUrl = 'api/ciapt1-exam/submit';

                totalTime = 20 * 60;

            } else if (examType === 'APJA') {

                submitUrl = 'api/apja-exam/submit';

                totalTime = 20 * 60;

            }

            try {

                const res = await fetch(submitUrl, {

                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {

                        'Content-Type': 'application/json; charset=UTF-8',

                    },

                    body: JSON.stringify({

                        answers: examAnswers,

                        nom,

                        prenom,

                        code: examCode,

                        proctoring: {

                            totalTime: totalTime - timeLeft,

                            tabSwitchCount: proctoring.tabSwitchCount,

                            copyPasteCount: proctoring.copyPasteCount,

                        },

                    }),

                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {

                    alert(data.error || 'Erreur.');

                    if (btn) {

                        btn.disabled = false;

                    }

                    return;

                }

                showResult(data, prenom);

            } catch {

                alert('Erreur réseau.');

                if (btn) {

                    btn.disabled = false;

                }

            }

        }

        function showResult(data, prenom) {

            document.getElementById('examen-quiz-wrapper').style.display =

                'none';

            document.getElementById('examen-start-card').style.display = 'none';

            document.getElementById('examen-result-wrapper').style.display = '';

            const passed = data.passed;

            const iconDiv = document.getElementById('examen-result-icon');

            const titleEl = document.getElementById('examen-result-title');

            const scoreEl = document.getElementById('examen-result-score');

            const msgEl = document.getElementById('examen-result-msg');

            const verifyDiv = document.getElementById('examen-result-verify');

            const detDiv = document.getElementById('examen-result-details');

            if (passed) {

                iconDiv.style.background = 'rgba(34,197,94,0.12)';

                iconDiv.innerHTML =

                    '<i class="fas fa-check-circle" style="font-size:40px;color:#22c55e;"></i>';

                titleEl.textContent = 'Examen réussi !';

                titleEl.style.color = '#22c55e';

                scoreEl.textContent = data.score + ' / ' + data.total;

                scoreEl.style.color = '#22c55e';

                msgEl.textContent =

                    'Félicitations, ' +

                    prenom +

                    ' ! Vous avez atteint ' +

                    data.score +

                    ' points sur ' +

                    data.total +

                    '.';

            } else {

                iconDiv.style.background = 'rgba(239,68,68,0.12)';

                iconDiv.innerHTML =

                    '<i class="fas fa-times-circle" style="font-size:40px;color:#ef4444;"></i>';

                titleEl.textContent = 'Examen non réussi';

                titleEl.style.color = '#ef4444';

                scoreEl.textContent = data.score + ' / ' + data.total;

                scoreEl.style.color = '#ef4444';

                msgEl.textContent =

                    'La note minimale requise est de ' +

                    data.pass_score +

                    '/' +

                    data.total +

                    '. Vous pouvez retenter avec un nouveau code.';

            }

            if (data.verify_count > 0) {

                verifyDiv.style.display = '';

                verifyDiv.innerHTML =

                    '<p style="margin:0 0 6px;font-weight:600;color:#92400e;"><i class="fas fa-exclamation-triangle"></i> ' +

                    data.verify_count +

                    ' réponse(s) à vérifier manuellement</p><p style="margin:0;font-size:12px;color:#78350f;">Certaines réponses écrites ont été détectées comme partiellement correctes et seront vérifiées par un administrateur.</p>';

            } else {

                verifyDiv.style.display = 'none';

            }

            const details = data.details || [];

            let dHtml =

                '<h4 style="margin:0 0 12px;font-size:14px;">Détail (' +

                details.length +

                ' questions) :</h4>';

            let lastCat = '';

            details.forEach((d, i) => {

                if (d.cat !== lastCat) {

                    lastCat = d.cat;

                    dHtml +=

                        '<div style="margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--pm-pub-border);font-size:12px;font-weight:700;color:var(--pm-pub-accent);">' +

                        escapeHtml(d.cat) +

                        '</div>';

                }

                const isOk = d.status === 'correct';

                const isVerify = d.status === 'verify';

                const ico = isOk

                    ? 'fa-check-circle'

                    : isVerify

                      ? 'fa-exclamation-circle'

                      : 'fa-times-circle';

                const c = isOk ? '#22c55e' : isVerify ? '#f59e0b' : '#ef4444';

                const bg = isOk

                    ? 'rgba(34,197,94,0.05)'

                    : isVerify

                      ? 'rgba(245,158,11,0.05)'

                      : 'rgba(239,68,68,0.05)';

                dHtml +=

                    '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05);background:' +

                    bg +

                    ';border-radius:6px;padding:8px 10px;margin-bottom:4px;">';

                dHtml +=

                    '<i class="fas ' +

                    ico +

                    '" style="color:' +

                    c +

                    ';margin-top:2px;flex-shrink:0;"></i><div style="flex:1;min-width:0;">';

                dHtml +=

                    '<p style="margin:0;font-size:12px;font-weight:600;">' +

                    (i + 1) +

                    '. ' +

                    escapeHtml(d.q.substring(0, 80)) +

                    (d.q.length > 80 ? '--' : '') +

                    '</p>';

                dHtml +=

                    '<p style="margin:2px 0 0;font-size:11px;color:' +

                    c +

                    ';">' +

                    escapeHtml(d.userAnswer || '--').substring(0, 100) +

                    '</p>';

                if (isVerify)

                    dHtml +=

                        '<p style="margin:2px 0 0;font-size:11px;color:#f59e0b;font-weight:600;">-- ' +

                        escapeHtml(d.msg) +

                        '</p>';

                dHtml +=

                    '<p style="margin:2px 0 0;font-size:11px;color:#999;">' +

                    d.points_earned +

                    '/' +

                    d.points_possible +

                    ' pts</p>';

                dHtml += '</div></div>';

            });

            detDiv.innerHTML = dHtml;

        }

        document.getElementById('ex-back-btn').onclick = () => {

            document.getElementById('examen-result-wrapper').style.display =

                'none';

            document.getElementById('examen-start-card').style.display = '';

        };

        document.getElementById('ex-start-btn').onclick = async () => {

            const nom = document.getElementById('ex-nom').value.trim();

            const prenom = document.getElementById('ex-prenom').value.trim();

            const code = document.getElementById('ex-code').value.trim();

            const alert = document.getElementById('examen-start-alert');

            const typeInfo = document.getElementById('examen-type-info');

            const typeDetail = document.getElementById('examen-type-detail');

            alert.className = 'pub-alert';

            typeInfo.style.display = 'none';

            if (!nom || !prenom) {

                alert.className = 'pub-alert pub-alert--err';

                alert.textContent = 'Nom et prénom requis.';

                return;

            }

            if (!code) {

                alert.className = 'pub-alert pub-alert--err';

                alert.textContent = 'Code requis.';

                return;

            }

            const btn = document.getElementById('ex-start-btn');

            btn.disabled = true;

            btn.innerHTML =

                '<i class="fas fa-spinner fa-spin"></i> Vérification...';

            try {

                const res = await fetch('api/examens/verify-code', {

                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {

                        'Content-Type': 'application/json; charset=UTF-8',

                    },

                    body: JSON.stringify({ code }),

                });

                const vData = await res.json().catch(() => ({}));

                if (!res.ok || !vData.ok) {

                    alert.className = 'pub-alert pub-alert--err';

                    alert.textContent = vData.error || 'Code invalide.';

                    btn.disabled = false;

                    btn.innerHTML = '<i class="fas fa-play"></i> Rejoindre';

                    return;

                }

                const examType = vData.type || 'INTEGRATION';

                let questionsUrl = 'api/integration-exam/questions';

                let timeMinutes = 30;

                let passScore = 120;

                let totalScore = 200;

                if (examType === 'OPJ') {

                    questionsUrl = 'api/opj-exam/questions';

                    timeMinutes = 90;

                    passScore = 40;

                    totalScore = 100;

                } else if (examType === 'CIAPT_1') {

                    questionsUrl = 'api/ciapt1-exam/questions';

                    timeMinutes = 20;

                    passScore = 12;

                    totalScore = 20;

                } else if (examType === 'APJA') {

                    questionsUrl = 'api/apja-exam/questions';

                    timeMinutes = 20;

                    passScore = 12;

                    totalScore = 20;

                }

                const qRes = await fetch(questionsUrl, {

                    credentials: 'same-origin',

                });

                const qData = await qRes.json().catch(() => ({}));

                if (!qRes.ok || !qData.questions) {

                    alert.className = 'pub-alert pub-alert--err';

                    alert.textContent = 'Erreur chargement questions.';

                    btn.disabled = false;

                    btn.innerHTML = '<i class="fas fa-play"></i> Rejoindre';

                    return;

                }

                examQuestions = qData.questions;

                examAnswers = {};

                currentIndex = 0;

                timeLeft = timeMinutes * 60;

                proctoring = {

                    startTime: Date.now(),

                    tabSwitchCount: 0,

                    copyPasteCount: 0,

                };

                examStarted = true;

                document.getElementById('examen-start-card').style.display =

                    'none';

                document.getElementById('examen-quiz-wrapper').style.display =

                    '';

                document.getElementById('examen-type-label').textContent =

                    vData.type_label + ' — ' + prenom + ' ' + nom;

                document.getElementById('examen-timer').textContent =

                    String(timeMinutes).padStart(2, '0') + ':00';

                document.getElementById('examen-progress-text').textContent =

                    '1 / ' + examQuestions.length;

                window.__pmCurrentExamType = examType;

                window.__pmCurrentExamCode = code;

                renderQuestion(0);

                startTimer();

                document.addEventListener('visibilitychange', onTabSwitch);

                document.addEventListener('copy', onCopyPaste);

                document.addEventListener('paste', onCopyPaste);

                document.addEventListener('cut', onCopyPaste);

            } catch {

                alert.className = 'pub-alert pub-alert--err';

                alert.textContent = 'Erreur serveur.';

                btn.disabled = false;

                btn.innerHTML = '<i class="fas fa-play"></i> Rejoindre';

            } finally {

                btn.disabled = false;

                btn.innerHTML = '<i class="fas fa-play"></i> Commencer';

            }

        };

    } // --- Render Generer Code Examen ---

    async function renderGenererCodeExamen() {

        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {

            contentArea.innerHTML = `<div class="card"><p>Accès réservé à la Direction.</p></div>`;

            return;

        }

        const examTypes = [

            {

                val: 'INTEGRATION',

                label: "Examen d'intégration (100 questions, 200 pts)",

            },

            { val: 'OPJ', label: 'OPJ -- Officier de Police Judiciaire' },

            {

                val: 'APJA',

                label: 'APJA -- Agent de Police Judiciaire Adjoints',

            },

            { val: 'BMU', label: 'BMU -- Brigade Motorisée Urbaine' },

            { val: 'GSI', label: "GSI -- Groupe de Soutien et d'Intervention" },

            { val: 'GARDIEN_TITULAIRE', label: 'Gardien Titulaire' },

            { val: 'CIAPT_1', label: 'CIAPT 1' },

        ];

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-key" aria-hidden="true"></i> Générer un code d\'examen</h2>                <p style="color:#666;margin-bottom:20px;font-size:14px;">Créez des codes d\'accès aux examens pour les candidats. Chaque code est valide pour une seule utilisation.</p>                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:24px;">                    <div style="flex:1;min-width:220px;">                        <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Type d\'examen</label>                        <select id="gen-ex-type" style="width:100%;padding:10px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;">                            ${examTypes.map((t) => '<option value="' + t.val + '">' + t.label + '</option>').join('')}                        </select>                    </div>                    <div style="width:100px;">                        <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">Quantité</label>                        <input type="number" id="gen-ex-count" value="1" min="1" max="20" style="width:100%;padding:10px;border:1px solid var(--pm-border);border-radius:6px;font-size:14px;">                    </div>                    <button type="button" class="btn btn-primary" id="gen-ex-btn"><i class="fas fa-plus-circle"></i> Générer</button>                </div>                <div id="gen-ex-result" style="display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;">                    <h3 style="margin:0 0 8px;font-size:14px;color:#166534;"><i class="fas fa-check-circle"></i> Code(s) généré(s)</h3>                    <div id="gen-ex-list" style="font-family:monospace;font-size:16px;letter-spacing:1px;"></div>                    <button type="button" class="btn btn-secondary" id="gen-ex-copy" style="margin-top:10px;font-size:12px;"><i class="fas fa-copy"></i> Copier tout</button>                </div>                <div>                    <h3 style="font-size:14px;margin-bottom:12px;"><i class="fas fa-list"></i> Codes existants</h3>                    <div id="ex-codes-list" style="overflow-x:auto;"></div>                </div>            </div>        `;

        document.getElementById('gen-ex-btn').onclick = async () => {

            const type = document.getElementById('gen-ex-type').value;

            const count =

                parseInt(document.getElementById('gen-ex-count').value) || 1;

            const btn = document.getElementById('gen-ex-btn');

            btn.disabled = true;

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> --';

            try {

                const res = await fetch('api/examens/codes/generate', {

                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {

                        'Content-Type': 'application/json; charset=UTF-8',

                    },

                    body: JSON.stringify({ type, count }),

                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.ok) {

                    alert(data.error || 'Erreur.');

                    return;

                }

                document.getElementById('gen-ex-result').style.display = '';

                document.getElementById('gen-ex-list').innerHTML = data.codes

                    .map(

                        (c) =>

                            '<div style="padding:3px 0;color:#166534;">' +

                            escapeHtml(c) +

                            '</div>',

                    )

                    .join('');

                loadExCodes();

            } catch {

                alert('Erreur.');

            } finally {

                btn.disabled = false;

                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Générer';

            }

        };

        document

            .getElementById('gen-ex-copy')

            ?.addEventListener('click', () => {

                navigator.clipboard

                    .writeText(document.getElementById('gen-ex-list').innerText)

                    .then(() => alert('Copié !'));

            });

        async function loadExCodes() {

            const container = document.getElementById('ex-codes-list');

            try {

                const res = await fetch('api/examens/codes/list', {

                    credentials: 'same-origin',

                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.codes || !data.codes.length) {

                    container.innerHTML =

                        '<p style="color:#999;font-size:13px;">Aucun code.</p>';

                    return;

                }

                let html =

                    '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:2px solid var(--pm-border);">';

                html +=

                    '<th style="padding:8px;text-align:left;">Code</th><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:left;">Créé par</th><th style="padding:8px;text-align:left;">Date</th><th style="padding:8px;text-align:center;">Statut</th></tr></thead><tbody>';

                data.codes

                    .slice()

                    .reverse()

                    .forEach((c) => {

                        const st = c.used

                            ? '<span style="color:#ef4444;font-weight:600;">Utilisé</span>'

                            : '<span style="color:#22c55e;font-weight:600;">Disponible</span>';

                        const dt = c.created_at

                            ? new Date(c.created_at).toLocaleString('fr-FR')

                            : '--';

                        html +=

                            '<tr style="border-bottom:1px solid var(--pm-border);"><td style="padding:8px;font-family:monospace;font-weight:600;">' +

                            escapeHtml(c.code) +

                            '</td>';

                        html +=

                            '<td style="padding:8px;">' +

                            escapeHtml(c.type || '') +

                            '</td>';

                        html +=

                            '<td style="padding:8px;">' +

                            escapeHtml(c.created_by || '') +

                            '</td>';

                        html += '<td style="padding:8px;">' + dt + '</td>';

                        html +=

                            '<td style="padding:8px;text-align:center;">' +

                            st +

                            '</td></tr>';

                    });

                html += '</tbody></table>';

                container.innerHTML = html;

            } catch {

                container.innerHTML = '<p style="color:#999;">Erreur.</p>';

            }

        }

        loadExCodes();

    } // --- Render Resultats Examens ---

    async function renderResultatsExamens() {

        if (!isPmTriadeLead(currentUser) && !isRecruteur(currentUser)) {

            contentArea.innerHTML = `<div class="card"><p>Accès réservé à la Direction.</p></div>`;

            return;

        }

        contentArea.innerHTML = `            <div class="card">                <h2 class="card-title"><i class="fas fa-chart-bar" aria-hidden="true"></i> Résultats des examens</h2>                <p style="color:#666;margin-bottom:20px;font-size:14px;">Consultez les résultats. Intégration : <strong>120/200</strong> · Autres : <strong>50/100</strong>.</p>                <div id="ex-results-tabs" style="display:flex;gap:8px;margin-bottom:20px;">                    <button class="btn btn-primary btn-sm ex-tab active" data-tab="all" style="font-size:12px;">Tous</button>                    <button class="btn btn-secondary btn-sm ex-tab" data-tab="INTEGRATION" style="font-size:12px;">Intégration</button>                    <button class="btn btn-secondary btn-sm ex-tab" data-tab="other" style="font-size:12px;">Autres examens</button>                </div>                <div id="ex-results-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>                <div id="ex-results-table" style="overflow-x:auto;"></div>            </div>        `;

        try {

            const res = await fetch('api/examens/results', {

                credentials: 'same-origin',

            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {

                document.getElementById('ex-results-table').innerHTML =

                    '<p style="color:#ef4444;">' +

                    (data.error || 'Erreur.') +

                    '</p>';

                return;

            }

            const allResults = data.results || [];

            let currentFilter = 'all';

            function getPassThreshold(r) {

                return r.examen_type === 'INTEGRATION' ? 120 : 50;

            }

            function getMaxScore(r) {

                return r.examen_type === 'INTEGRATION' ? 200 : 100;

            }

            function isPassed(r) {

                return r.score >= getPassThreshold(r);

            }

            function renderFiltered(filter) {

                currentFilter = filter;

                const results =

                    filter === 'all'

                        ? allResults

                        : filter === 'INTEGRATION'

                          ? allResults.filter(

                                (r) => r.examen_type === 'INTEGRATION',

                            )

                          : allResults.filter(

                                (r) => r.examen_type !== 'INTEGRATION',

                            );

                const total = results.length;

                const passed = results.filter((r) => isPassed(r)).length;

                const failed = total - passed;

                const avg =

                    total > 0

                        ? Math.round(

                              results.reduce((s, r) => s + r.score, 0) / total,

                          )

                        : 0;

                const verifyTotal = results.reduce(

                    (s, r) => s + ((r.grading && r.grading.verify_count) || 0),

                    0,

                );

                document.getElementById('ex-results-stats').innerHTML =

                    `                    <div style="flex:1;min-width:120px;background:var(--pm-white);border:1px solid var(--pm-border);border-radius:10px;padding:14px;text-align:center;">                        <p style="margin:0;font-size:28px;font-weight:800;color:var(--pm-blue);">${total}</p><p style="margin:4px 0 0;font-size:12px;color:#666;">Total</p></div>                    <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;text-align:center;">                        <p style="margin:0;font-size:28px;font-weight:800;color:#166534;">${passed}</p><p style="margin:4px 0 0;font-size:12px;color:#166534;">Admis</p></div>                    <div style="flex:1;min-width:120px;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px;text-align:center;">                        <p style="margin:0;font-size:28px;font-weight:800;color:#991b1b;">${failed}</p><p style="margin:4px 0 0;font-size:12px;color:#991b1b;">Non admis</p></div>                    <div style="flex:1;min-width:120px;background:var(--pm-white);border:1px solid var(--pm-border);border-radius:10px;padding:14px;text-align:center;">                        <p style="margin:0;font-size:28px;font-weight:800;color:var(--pm-blue);">${avg}</p><p style="margin:4px 0 0;font-size:12px;color:#666;">Moyenne</p></div>                    ${verifyTotal > 0 ? '<div style="flex:1;min-width:120px;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px;text-align:center;"><p style="margin:0;font-size:28px;font-weight:800;color:#92400e;">' + verifyTotal + '</p><p style="margin:4px 0 0;font-size:12px;color:#92400e;">à vérifier</p></div>' : ''}                `;

                if (total === 0) {

                    document.getElementById('ex-results-table').innerHTML =

                        '<p style="color:#999;font-size:13px;">Aucun résultat.</p>';

                    return;

                }

                let html =

                    '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:2px solid var(--pm-border);">';

                html +=

                    '<th style="padding:10px;text-align:left;">#</th><th style="padding:10px;text-align:left;">Nom</th><th style="padding:10px;text-align:left;">Prénom</th><th style="padding:10px;text-align:left;">Type</th><th style="padding:10px;text-align:center;">Note</th><th style="padding:10px;text-align:center;">Statut</th><th style="padding:10px;text-align:left;">Date</th><th style="padding:10px;text-align:center;">Détail</th></tr></thead><tbody>';

                results.forEach((r, idx) => {

                    const p = isPassed(r);

                    const max = getMaxScore(r);

                    const badge = p

                        ? '<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:12px;font-weight:600;font-size:12px;">Admis</span>'

                        : '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-weight:600;font-size:12px;">Non admis</span>';

                    const verifyCount =

                        (r.grading && r.grading.verify_count) || 0;

                    const verifyBadge =

                        verifyCount > 0

                            ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600;">-- ' +

                              verifyCount +

                              ' à vérifier</span>'

                            : '';

                    const dt = r.submitted_at

                        ? new Date(r.submitted_at).toLocaleString('fr-FR')

                        : '--';

                    const sc = p ? '#166534' : '#991b1b';

                    html +=

                        '<tr style="border-bottom:1px solid var(--pm-border);">';

                    html += '<td style="padding:10px;">' + (idx + 1) + '</td>';

                    html +=

                        '<td style="padding:10px;font-weight:600;">' +

                        escapeHtml(r.nom || '') +

                        '</td>';

                    html +=

                        '<td style="padding:10px;font-weight:600;">' +

                        escapeHtml(r.prenom || '') +

                        '</td>';

                    html +=

                        '<td style="padding:10px;">' +

                        escapeHtml(r.examen_type || '') +

                        verifyBadge +

                        '</td>';

                    html +=

                        '<td style="padding:10px;text-align:center;font-weight:800;font-size:16px;color:' +

                        sc +

                        ';">' +

                        r.score +

                        '/' +

                        max +

                        '</td>';

                    html +=

                        '<td style="padding:10px;text-align:center;">' +

                        badge +

                        '</td>';

                    html += '<td style="padding:10px;">' + dt + '</td>';

                    html +=

                        '<td style="padding:10px;text-align:center;"><button class="btn btn-secondary ex-detail-btn" data-idx="' +

                        idx +

                        '" style="font-size:11px;padding:4px 10px;"><i class="fas fa-eye"></i></button></td>';

                    html += '</tr>';

                });

                html += '</tbody></table>';

                document.getElementById('ex-results-table').innerHTML = html;

                document.querySelectorAll('.ex-detail-btn').forEach((btn) => {

                    btn.onclick = () => {

                        const idx = parseInt(btn.dataset.idx);

                        const r = results[idx];

                        if (!r) return;

                        const max = getMaxScore(r);

                        const threshold = getPassThreshold(r);

                        const isIntegration = r.examen_type === 'INTEGRATION';

                        let dHtml =

                            '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="ex-modal">';

                        dHtml +=

                            '<div style="background:var(--pm-white);border-radius:12px;padding:28px;max-width:650px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">';

                        dHtml +=

                            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';

                        dHtml +=

                            '<h3 style="margin:0;">' +

                            escapeHtml(r.prenom) +

                            ' ' +

                            escapeHtml(r.nom) +

                            ' — ' +

                            r.score +

                            '/' +

                            max +

                            '</h3>';

                        dHtml +=

                            '<button onclick="document.getElementById(\'ex-modal\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;">&times;</button></div>';

                        if (isIntegration && r.grading && r.grading.details) {

                            const details = r.grading.details;

                            let lastCat = '';

                            details.forEach((d, i) => {

                                if (d.cat !== lastCat) {

                                    lastCat = d.cat;

                                    dHtml +=

                                        '<div style="margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid var(--pm-border);font-size:13px;font-weight:700;color:var(--pm-pub-accent);">' +

                                        escapeHtml(d.cat) +

                                        '</div>';

                                }

                                const isOk = d.status === 'correct';

                                const isVerify = d.status === 'verify';

                                const ico = isOk

                                    ? 'fa-check-circle'

                                    : isVerify

                                      ? 'fa-exclamation-circle'

                                      : 'fa-times-circle';

                                const c = isOk

                                    ? '#166534'

                                    : isVerify

                                      ? '#f59e0b'

                                      : '#991b1b';

                                dHtml +=

                                    '<div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.05);">';

                                dHtml +=

                                    '<p style="margin:0;font-size:12px;font-weight:600;"><i class="fas ' +

                                    ico +

                                    '" style="color:' +

                                    c +

                                    ';margin-right:6px;"></i>' +

                                    (i + 1) +

                                    '. ' +

                                    escapeHtml(d.q.substring(0, 100)) +

                                    (d.q.length > 100 ? '--' : '') +

                                    '</p>';

                                dHtml +=

                                    '<p style="margin:2px 0 0 22px;font-size:11px;color:' +

                                    c +

                                    ';">' +

                                    escapeHtml(d.userAnswer || '--').substring(

                                        0,

                                        120,

                                    ) +

                                    '</p>';

                                if (isVerify)

                                    dHtml +=

                                        '<p style="margin:2px 0 0 22px;font-size:11px;color:#f59e0b;font-weight:600;">-- ' +

                                        escapeHtml(d.msg) +

                                        '</p>';

                                dHtml +=

                                    '<p style="margin:2px 0 0 22px;font-size:11px;color:#999;">' +

                                    d.points_earned +

                                    '/' +

                                    d.points_possible +

                                    ' pts</p>';

                                dHtml += '</div>';

                            });

                        } else {

                            dHtml +=

                                '<p style="color:#999;font-size:13px;">Détail non disponible pour cet examen.</p>';

                        }

                        dHtml += '</div></div>';

                        document.body.insertAdjacentHTML('beforeend', dHtml);

                        document

                            .getElementById('ex-modal')

                            .addEventListener('click', (e) => {

                                if (e.target.id === 'ex-modal')

                                    e.target.remove();

                            });

                    };

                });

            }

            document.querySelectorAll('.ex-tab').forEach((tab) => {

                tab.addEventListener('click', () => {

                    document.querySelectorAll('.ex-tab').forEach((t) => {

                        t.classList.remove('active');

                        t.classList.add('btn-secondary');

                        t.classList.remove('btn-primary');

                    });

                    tab.classList.add('active');

                    tab.classList.add('btn-primary');

                    tab.classList.remove('btn-secondary');

                    renderFiltered(tab.dataset.tab);

                });

            });

            renderFiltered('all');

        } catch {

            document.getElementById('ex-results-table').innerHTML =

                '<p style="color:#ef4444;">Erreur.</p>';

        }

    }

    function renderSetup() {

        contentArea.innerHTML = `

            <div style="max-width:600px;margin:40px auto;">

                <div class="card">

                    <h2 class="card-title" style="text-align:center;"><i class="fas fa-user-lock" style="color:var(--pm-blue);"></i> Configuration de votre compte</h2>

                    <p style="color:#666;margin-bottom:24px;font-size:14px;text-align:center;">C'est votre première connexion. Veuillez compléter votre profil et choisir un mot de passe définitif.</p>

                    <div id="setup-alert" class="pub-alert" role="status" style="margin-bottom:16px;"></div>

                    <div style="display:flex;flex-direction:column;gap:16px;">

                        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;">

                            <h3 style="margin:0 0 8px;font-size:14px;color:#1e40af;font-weight:700;"><i class="fas fa-key"></i> Mot de passe définitif</h3>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">Nouveau mot de passe <span style="color:#ef4444;">*</span></label>

                                    <input type="password" id="setup-new-pwd" placeholder="Min. 8 caractères" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;" autocomplete="new-password">

                                </div>

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">Confirmer le mot de passe <span style="color:#ef4444;">*</span></label>

                                    <input type="password" id="setup-confirm-pwd" placeholder="Retapez le mot de passe" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;" autocomplete="new-password">

                                </div>

                            </div>

                        </div>

                        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;">

                            <h3 style="margin:0 0 8px;font-size:14px;color:#166534;font-weight:700;"><i class="fas fa-id-badge"></i> Informations personnelles</h3>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">Numéro de téléphone IG <span style="color:#ef4444;">*</span></label>

                                    <input type="tel" id="setup-phone-ig" placeholder="Ex : 06 12 34 56 78" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;">

                                </div>

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">Adresse email IG <span style="color:#ef4444;">*</span></label>

                                    <input type="email" id="setup-email-ig" placeholder="prenom.nom@ig.pm" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;">

                                </div>

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">Adresse email (Gmail) <span style="color:#ef4444;">*</span></label>

                                    <input type="email" id="setup-email-perso" placeholder="prenom.nom@gmail.com" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;">

                                </div>

                                <div style="display:flex;flex-direction:column;gap:4px;">

                                    <label style="font-weight:600;font-size:13px;">ID Discord <span style="color:#ef4444;">*</span></label>

                                    <input type="text" id="setup-discord-id" placeholder="Ex : jean_martin" style="padding:10px 12px;border:1px solid var(--pm-border);border-radius:8px;font-size:14px;">

                                </div>

                            </div>

                        </div>

                        <button type="button" class="btn btn-primary" id="setup-submit-btn" style="width:100%;padding:12px;font-size:15px;"><i class="fas fa-check-circle"></i> Valider et accéder à l\'intranet</button>

                    </div>

                </div>

            </div>`;

        document.getElementById('setup-submit-btn').onclick = async () => {

            const alertEl = document.getElementById('setup-alert');

            const newPwd = document.getElementById('setup-new-pwd').value;

            const confirmPwd = document.getElementById('setup-confirm-pwd').value;

            const phoneIG = document.getElementById('setup-phone-ig').value.trim();

            const emailIG = document.getElementById('setup-email-ig').value.trim();

            const emailPerso = document.getElementById('setup-email-perso').value.trim();

            const discordId = document.getElementById('setup-discord-id').value.trim();

            if (!newPwd || !confirmPwd || !phoneIG || !emailIG || !emailPerso || !discordId) {

                alertEl.className = 'pub-alert pub-alert--err';

                alertEl.textContent = 'Tous les champs sont obligatoires.';

                return;

            }

            if (newPwd.length < 8) {

                alertEl.className = 'pub-alert pub-alert--err';

                alertEl.textContent = 'Le mot de passe doit faire au moins 8 caractères.';

                return;

            }

            if (newPwd !== confirmPwd) {

                alertEl.className = 'pub-alert pub-alert--err';

                alertEl.textContent = 'Les mots de passe ne correspondent pas.';

                return;

            }

            try {

                const res = await fetch('api/auth/complete-setup', {

                    method: 'POST',

                    credentials: 'same-origin',

                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },

                    body: JSON.stringify({ newPassword: newPwd, confirmPassword: confirmPwd, phoneIG, emailIG, emailPerso, discordId }),

                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {

                    alertEl.className = 'pub-alert pub-alert--err';

                    alertEl.textContent = data.error || 'Erreur lors de la sauvegarde.';

                    return;

                }

                if (data.user) {

                    currentUser = data.user;

                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));

                }

                window.location.href = 'dashboard.php';

            } catch {

                alertEl.className = 'pub-alert pub-alert--err';

                alertEl.textContent = 'Serveur injoignable.';

            }

        };

    }

    // Default load

    window.__pmCurrentSection = 'accueil';

    if (new URLSearchParams(window.location.search).get('setup') === '1' && currentUser.mustChangePassword) {

        renderSetup();

    } else {

        renderAccueil();

    }

    // Navigation depuis l'accueil public (Services/Annuaire/Aide) via pm_pending_section

    try {

        const pending = sessionStorage.getItem('pm_pending_section');

        if (pending) {

            sessionStorage.removeItem('pm_pending_section');

            // Laisse le temps à l'expose avant d'appeler

            setTimeout(() => { if (typeof window.__pmLoadSection === 'function') window.__pmGoSection(pending); }, 300);

        }

    } catch(e) {}

    // Expose loadSection globally for nav (must be after all definitions)

    window.__pmExposeLoadSection(loadSection);

    console.info('[PM DEBUG] __pmLoadSection exposed');

    if (typeof window.__pmTryPending === 'function') {

        window.__pmTryPending();

    }

});

