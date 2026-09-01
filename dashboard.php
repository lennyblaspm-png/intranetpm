<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <title>Dashboard - Police Municipale</title>
    <link rel="stylesheet" href="assets/css/style.css?v=<?= filemtime(__DIR__.'/assets/css/style.css') ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .dashboard-container { display: flex; flex-direction: column; min-height: 100vh; }

        .top-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: #fff; min-height: 64px; border-bottom: 3px solid #c9a227; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-right { margin-left: auto; display: flex; align-items: center; gap: 15px; }
        .header-logo { height: 36px; }
        .header-toolbar { display: flex; align-items: center; gap: 14px; }
        .contrast-btn-group { display: flex; gap: 4px; }
        .contrast-btn { padding: 4px 8px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.3s; }
        .contrast-btn:hover { background: rgba(255,255,255,0.2); }
        .contrast-btn.active { background: white; color: var(--pm-text-color); border-color: white; }
        .header-icon-accent { color: var(--pm-accent); cursor: pointer; opacity: 0.9; }
        .header-icon-accent:hover { opacity: 1; }

        /* ── Category Nav Bar — redesign premium — */
        .cat-nav {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #0f172a;
            padding: 8px 16px;
            position: sticky;
            top: 0;
            z-index: 90;
            border-bottom: 1px solid #1e293b;
            overflow: visible;
            flex-wrap: wrap;
        }
        .cat-nav-item {
            position: relative;
            flex-shrink: 0;
        }
        .cat-nav-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 14px;
            background: transparent;
            border: 1px solid transparent;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 700;
            font-family: inherit;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            white-space: nowrap;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .cat-nav-btn:hover {
            background: rgba(255,255,255,0.08);
            color: #fff;
            border-color: rgba(255,255,255,0.1);
        }
        .cat-nav-btn.active {
            background: rgba(201,162,39,0.18);
            color: #f0d060;
            border-color: rgba(201,162,39,0.3);
            box-shadow: inset 0 -2px 0 #c9a227;
        }
        .cat-nav-btn i { font-size: 13px; transition: transform 0.2s; }
        .cat-nav-btn:hover i { transform: scale(1.15) rotate(3deg); }
        .cat-nav-btn.active i { color: #f0d060; }
        .cat-nav-btn { position: relative; overflow: hidden; }
        .cat-nav-btn::after {
            content: '';
            position: absolute;
            left: 14px; right: 14px; bottom: 4px;
            height: 2px;
            background: #c9a227;
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
            border-radius: 1px;
        }
        .cat-nav-btn.active::after { transform: scaleX(1); }
        .cat-nav-btn:hover::after { transform: scaleX(0.6); opacity: 0.5; }
        .cat-nav-btn.active:hover::after { transform: scaleX(1); opacity: 1; }

        /* ── Dropdown — animé ── */
        @keyframes navSlideIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes navItemIn {
            from { opacity: 0; transform: translateX(-6px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .cat-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.18);
            min-width: 240px;
            padding: 8px 0;
            z-index: 200;
            overflow: hidden;
        }
        .cat-nav-item:hover > .cat-dropdown,
        .cat-nav-item.open > .cat-dropdown { display: block; animation: navSlideIn 0.22s cubic-bezier(0.16,1,0.3,1); }
        .cat-dropdown-item { animation: navItemIn 0.22s both; }
        .cat-dropdown-item:nth-child(1) { animation-delay: 0.02s; }
        .cat-dropdown-item:nth-child(2) { animation-delay: 0.06s; }
        .cat-dropdown-item:nth-child(3) { animation-delay: 0.10s; }
        .cat-dropdown-item:nth-child(4) { animation-delay: 0.14s; }
        .cat-dropdown-item:nth-child(5) { animation-delay: 0.18s; }
        .cat-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 22px;
            background: none;
            border: none;
            color: #333;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: background 0.12s;
        }
        .cat-dropdown-item:hover {
            background: #f0f0f0;
            color: #111;
        }
        .cat-dropdown-item.active {
            color: #c0392b;
            font-weight: 700;
            background: #fdf2f2;
        }
        .cat-dropdown-item i { width: 18px; text-align: center; font-size: 14px; color: #999; }
        .cat-dropdown-item:hover i { color: #555; }
        .cat-dropdown-item.active i { color: #c0392b; }
        .cat-dropdown-divider { height: 1px; background: #e5e5e5; margin: 4px 0; }

        .main-content { flex: 1; overflow-y: auto; background: var(--pm-gray); }
        .main-content-inner { padding: 24px 28px 32px; }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <!-- Header -->
        <header class="top-header">
            <div class="header-left">
                <img src="assets/logo.png" alt="Logo PM" style="height: 36px;">
                <span style="font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">POLICE MUNICIPALE</span>
                <div class="header-toolbar" style="margin-left: 16px;">
                    <div class="contrast-btn-group">
                        <button type="button" class="contrast-btn active" id="contrast-original" title="Normal"><i class="fas fa-palette"></i></button>
                        <button type="button" class="contrast-btn" id="contrast-dark" title="Sombre"><i class="fas fa-moon"></i></button>
                        <button type="button" class="contrast-btn" id="contrast-white" title="Clair"><i class="fas fa-sun"></i></button>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div style="position:relative; margin-right:6px;">
                    <button id="notif-bell-btn" style="background:rgba(255,255,255,0.12); border:none; color:#fff; width:38px; height:38px; border-radius:8px; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-bell"></i>
                        <span id="notif-badge" style="display:none; position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff; font-size:10px; font-weight:800; min-width:16px; height:16px; border-radius:8px; padding:0 4px; align-items:center; justify-content:center; line-height:16px;">0</span>
                    </button>
                    <div id="notif-panel" style="display:none; position:absolute; top:46px; right:0; background:#fff; color:#1e293b; width:360px; max-height:420px; overflow:auto; border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,0.22); border:1px solid #e2e8f0; z-index:300;">
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #e2e8f0; position:sticky; top:0; background:#fff; border-radius:12px 12px 0 0;">
                            <b style="font-size:13px;">Notifications</b>
                            <button id="notif-mark-read" style="font-size:11px; color:#2563eb; background:none; border:none; cursor:pointer; font-weight:700;">Tout marquer lu</button>
                        </div>
                        <div id="notif-list" style="padding:8px;"></div>
                    </div>
                </div>
                <div class="user-profile-dropdown" style="position: relative;">
                    <button id="profile-toggle-btn" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 5px 15px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 500;">
                        <img id="header-user-photo" src="" alt="" style="display:none; width:28px; height:28px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.3);">
                        <i id="header-user-icon" class="fas fa-user-circle"></i>
                        <span id="header-user-name">—</span>
                        <i class="fas fa-chevron-down" style="font-size: 11px;"></i>
                    </button>
                    <div id="profile-menu" style="display: none; position: absolute; top: 42px; right: 0; background: white; color: #333; min-width: 240px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 200; padding: 18px;">
                        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Connecté en tant que</div>
                        <div style="font-weight: 700; color: #003366; margin-bottom: 4px;" id="dropdown-user-name">—</div>
                        <div style="font-size: 13px; margin-bottom: 14px;">Rôle : <strong id="dropdown-user-role">—</strong></div>
                        <button id="header-logout-btn" style="width: 100%; background: #d9534f; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-sign-out-alt"></i> Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Category Navigation Bar -->
        <nav class="cat-nav" id="cat-nav">
            <div class="cat-nav-item" data-cat="general">
                <button class="cat-nav-btn active" data-cat="general" onclick="window.__pmGoSection('accueil')"><i class="fas fa-house"></i> Accueil</button>
            </div>
            <div class="cat-nav-item" data-cat="operationnel">
                <button class="cat-nav-btn" data-cat="operationnel" onclick="window.__pmToggleCat(this)"><i class="fas fa-car-side"></i> Opérationnel <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item" data-section="pointeuse" onclick="window.__pmGoSection('pointeuse')"><i class="fas fa-stopwatch"></i> Pointeuse</button>
                    <button class="cat-dropdown-item" data-section="dispatch" onclick="window.__pmGoSection('dispatch')"><i class="fas fa-list-check"></i> Dispatch</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item" data-section="salon" onclick="window.__pmGoSection('salon')"><i class="fas fa-comments"></i> Salon discussion</button>
                    <button class="cat-dropdown-item" data-section="annonces" onclick="window.__pmGoSection('annonces')"><i class="fas fa-bullhorn"></i> Annonces</button>
                </div>
            </div>
            <div class="cat-nav-item" data-cat="rapports">
                <button class="cat-nav-btn" data-cat="rapports" onclick="window.__pmToggleCat(this)"><i class="fas fa-file-lines"></i> Rapports <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item" data-section="rapport-interpellation" onclick="window.__pmGoSection('rapport-interpellation')"><i class="fas fa-file-signature"></i> Rapport d'interpellation</button>
                    <button class="cat-dropdown-item" data-section="rapport-saisie" onclick="window.__pmGoSection('rapport-saisie')"><i class="fas fa-clipboard-list"></i> Rapport de Saisie</button>
                    <button class="cat-dropdown-item" data-section="rapport-tir" onclick="window.__pmGoSection('rapport-tir')"><i class="fas fa-crosshairs"></i> Rapport de Tir</button>
                    <button class="cat-dropdown-item" data-section="rapport-incident" onclick="window.__pmGoSection('rapport-incident')"><i class="fas fa-triangle-exclamation"></i> Rapport d'incident</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item direction-only" data-section="reception-rapports" onclick="window.__pmGoSection('reception-rapports')"><i class="fas fa-inbox"></i> Réception <span id="notif-reception-badge" class="nav-candidatures-badge" hidden></span></button>
                </div>
            </div>
            <div class="cat-nav-item" data-cat="fichiers">
                <button class="cat-nav-btn" data-cat="fichiers" onclick="window.__pmToggleCat(this)"><i class="fas fa-folder-open"></i> Fichiers <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item" data-section="taj" onclick="window.__pmGoSection('taj')"><i class="fas fa-fingerprint"></i> TAJ</button>
                    <button class="cat-dropdown-item" data-section="fpr" onclick="window.__pmGoSection('fpr')"><i class="fas fa-id-card-clip"></i> FPR</button>
                </div>
            </div>
            <div class="cat-nav-item" data-cat="ressources">
                <button class="cat-nav-btn" data-cat="ressources" onclick="window.__pmToggleCat(this)"><i class="fas fa-box-open"></i> Ressources <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item" data-section="fiche-agent" onclick="window.__pmGoSection('fiche-agent')"><i class="fas fa-user-tie"></i> Ma Fiche Agent</button>
                    <button class="cat-dropdown-item" data-section="parametres" onclick="window.__pmGoSection('parametres')"><i class="fas fa-gear"></i> Paramètres <span id="notif-parametres-badge" class="nav-candidatures-badge" hidden></span></button>
                    <button class="cat-dropdown-item" data-section="messagerie" onclick="window.__pmGoSection('messagerie')"><i class="fas fa-envelope"></i> Messagerie</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item" data-section="conges" onclick="window.__pmGoSection('conges')"><i class="fas fa-calendar-day"></i> Congés</button>
                    <button class="cat-dropdown-item" data-section="vestiaire" onclick="window.__pmGoSection('vestiaire')"><i class="fas fa-shirt"></i> Vestiaire</button>
                    <button class="cat-dropdown-item" data-section="parc-auto" onclick="window.__pmGoSection('parc-auto')"><i class="fas fa-car"></i> Parc Automobile</button>
                    <button class="cat-dropdown-item" data-section="specialites" onclick="window.__pmGoSection('specialites')"><i class="fas fa-star"></i> Spécialités</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item" data-section="trame-stagiaire" onclick="window.__pmGoSection('trame-stagiaire')"><i class="fas fa-graduation-cap"></i> Trame Gardien Stagiaire</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item" data-section="recherche" onclick="window.__pmGoSection('recherche')"><i class="fas fa-users-viewfinder"></i> Recherche Effectif</button>
                </div>
            </div>
            <div class="cat-nav-item direction-only recrutement-only" data-cat="recrutement">
                <button class="cat-nav-btn direction-only recrutement-only" data-cat="recrutement" onclick="window.__pmToggleCat(this)"><i class="fas fa-clipboard-user"></i> Recrutement <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item direction-only recrutement-only" data-section="recrutement" onclick="window.__pmGoSection('recrutement')"><i class="fas fa-clipboard-user"></i> Candidatures <span id="top-tab-recrut-badge" class="nav-candidatures-badge" hidden></span></button>
                    <button class="cat-dropdown-item direction-only recrutement-only" data-section="messagerie-recrutement" onclick="window.__pmGoSection('messagerie-recrutement')"><i class="fas fa-comments"></i> Messagerie recrutement</button>
                    <div class="cat-dropdown-divider"></div>
                    <button class="cat-dropdown-item direction-only recrutement-only" data-section="generer-code-integration" onclick="window.__pmGoSection('generer-code-integration')"><i class="fas fa-key"></i> Générer un code</button>
                    <button class="cat-dropdown-item direction-only recrutement-only" data-section="resultats-formulaires" onclick="window.__pmGoSection('resultats-formulaires')"><i class="fas fa-chart-bar"></i> Résultats formulaires</button>
                </div>
            </div>
            <div class="cat-nav-item" data-cat="examens">
                <button class="cat-nav-btn" data-cat="examens" onclick="window.__pmToggleCat(this)"><i class="fas fa-pen-fancy"></i> Examen <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item" data-section="commencer-examen" onclick="window.__pmGoSection('commencer-examen')"><i class="fas fa-play-circle"></i> Rejoindre un examen</button>
                    <button class="cat-dropdown-item direction-only" data-section="generer-code-examen" onclick="window.__pmGoSection('generer-code-examen')"><i class="fas fa-key"></i> Générer un code d'examen</button>
                    <button class="cat-dropdown-item direction-only" data-section="resultats-examens" onclick="window.__pmGoSection('resultats-examens')"><i class="fas fa-chart-bar"></i> Résultat examen</button>
                </div>
            </div>
            <div class="cat-nav-item direction-only" data-cat="admin">
                <button class="cat-nav-btn direction-only" data-cat="admin" onclick="window.__pmToggleCat(this)"><i class="fas fa-gear"></i> Administration <i class="fas fa-chevron-down" style="font-size:9px;margin-left:2px;"></i></button>
                <div class="cat-dropdown">
                    <button class="cat-dropdown-item direction-only" data-section="gestion-comptes" onclick="window.__pmGoSection('gestion-comptes')"><i class="fas fa-user-gear"></i> Gestion des comptes</button>
                    <button class="cat-dropdown-item direction-only" data-section="gestion-webhooks" onclick="window.__pmGoSection('gestion-webhooks')"><i class="fas fa-link"></i> Gestion des webhooks</button>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="main-content">
            <div class="main-content-inner">
                <div id="content-area">
                    <div class="card">
                        <h2 class="card-title">Chargement…</h2>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
    (function() {
        window.__pmGoSection = function(section) {
            document.querySelectorAll('.cat-nav-item').forEach(function(c){ c.classList.remove('open'); });
            document.querySelectorAll('.cat-dropdown-item').forEach(function(d){ d.classList.remove('active'); });
            document.querySelectorAll('.cat-nav-btn').forEach(function(b){ b.classList.remove('active'); });
            var item = document.querySelector('.cat-dropdown-item[data-section="' + section + '"]');
            if (item) item.classList.add('active');
            var group = item ? item.closest('.cat-nav-item') : null;
            if (group) {
                var btn = group.querySelector('.cat-nav-btn');
                if (btn) btn.classList.add('active');
            }
            window.__pmLoadSection(section);
        };

        window.__pmToggleCat = function(btn) {
            var parent = btn.closest('.cat-nav-item');
            if (!parent) return;
            var wasOpen = parent.classList.contains('open');
            document.querySelectorAll('.cat-nav-item').forEach(function(c){ c.classList.remove('open'); });
            if (!wasOpen) parent.classList.add('open');
        };

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.cat-nav-item')) {
                document.querySelectorAll('.cat-nav-item').forEach(function(c){ c.classList.remove('open'); });
            }
        });
    })();
    </script>
    <script src="assets/js/vendor/jspdf.umd.min.js"></script>
    <script src="assets/js/pm-server-storage.js?v=<?= filemtime(__DIR__.'/assets/js/pm-server-storage.js') ?>"></script>
    <script src="assets/js/dashboard.js?v=<?= filemtime(__DIR__.'/assets/js/dashboard.js') ?>"></script>
</body>
</html>
