<?php
declare(strict_types=1);
session_start();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <title>Police Municipale — Intranet</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        :root {
            --bg: #f0f2f5;
            --card: #ffffff;
            --border: #e2e8f0;
            --text: #0f172a;
            --muted: #64748b;
            --accent: #2563eb;
            --accent-hover: #1d4ed8;
            --navy: #0f172a;
            --navy2: #1e293b;
        }
        html { height:100%; }
        body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); font-size:14px; line-height:1.55; min-height:100vh; min-height:100dvh; display:flex; flex-direction:column; }
        .pub-wrapper { flex: 1 0 auto; width:100%; }
        #section-accueil.active { display:flex; flex-direction:column; flex:1; }
        a { text-decoration:none; color:inherit; }
        ul { list-style:none; }
        button { font-family:inherit; }

        /* NAVBAR - fidèle maquette */
        .pub-nav {
            position:sticky; top:0; z-index:200;
            background:#ffffff;
            border-bottom:1px solid #e2e8f0;
            display:flex; align-items:center;
            padding:0 20px; height:64px; gap:16px;
            box-shadow:0 1px 3px rgba(0,0,0,0.04);
        }
        .pub-nav-brand { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .pub-nav-brand img { height:38px; }
        .pub-nav-brand .brand-93 { height:36px; border-radius:6px; margin-left:4px; }
        .pub-nav-brand-text { display:flex; flex-direction:column; line-height:1; }
        .pub-nav-brand-text .t1 { font-weight:900; font-size:15px; color:#0f172a; letter-spacing:0.02em; }
        .pub-nav-brand-text .t2 { font-weight:700; font-size:11px; color:#2563eb; letter-spacing:0.08em; }
        .nav-sep { width:1px; height:28px; background:#e2e8f0; margin:0 4px; }
        .pub-nav-links { display:flex; gap:6px; flex:1; align-items:center; background:#f8fafc; padding:6px; border-radius:12px; border:1px solid #e2e8f0; }
        .pub-nav-links a { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:20px; color:#64748b; font-size:13px; font-weight:600; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); white-space:nowrap; border:1px solid transparent; }
        .pub-nav-links a:hover { background:#fff; color:#0f172a; border-color:#e2e8f0; transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .pub-nav-links a.active { background:#0f172a; color:#fff; border-color:#0f172a; box-shadow:0 4px 12px rgba(15,23,42,0.18); }
        .pub-nav-links a.active i { color:#f0d060; }
        .nav-right { display:flex; align-items:center; gap:14px; flex-shrink:0; }
        .nav-search { display:flex; align-items:center; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; gap:8px; min-width:200px; }
        .nav-search input { border:none; background:transparent; outline:none; font-size:13px; color:#334155; width:100%; }
        .nav-search input::placeholder { color:#94a3b8; }
        .nav-icon-btn { position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#f1f5f9; color:#334155; cursor:pointer; border:none; }
        .nav-icon-btn:hover { background:#e2e8f0; }
        .nav-icon-badge { position:absolute; top:-4px; right:-4px; width:16px; height:16px; background:#2563eb; color:#fff; font-size:10px; font-weight:700; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .nav-user { display:flex; align-items:center; gap:10px; cursor:pointer; padding:4px 8px; border-radius:10px; transition:background .15s; }
        .nav-user:hover { background:#f1f5f9; }
        .nav-user img { width:36px; height:36px; border-radius:50%; object-fit:cover; }
        .nav-user-info { text-align:left; line-height:1.2; }
        .nav-user-name { font-size:13px; font-weight:700; color:#0f172a; }
        .nav-user-role { font-size:11px; color:#64748b; }
        .nav-cta { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; border-radius:8px; background:var(--accent); color:#fff!important; font-size:13px; font-weight:700; transition:background .15s; }
        .nav-cta:hover { background:var(--accent-hover); }
        .nav-mobile-btn { display:none; background:none; border:none; font-size:20px; cursor:pointer; color:#0f172a; }

        /* HERO - maquette exacte */
        .pub-hero { position:relative; overflow:hidden; min-height:380px; display:flex; align-items:center; background:#0f172a; margin:0 14px; border-radius:12px; margin-top:14px; }
        .pub-hero-img { position:absolute; inset:0; background:url('assets/img/hero-bg.png') center 35% / cover no-repeat; }
        .pub-hero-overlay { position:absolute; inset:0; background:linear-gradient(90deg, #0f172a 0%, #0f172a 45%, rgba(15,23,42,0.55) 65%, rgba(15,23,42,0.15) 100%); }
        .pub-hero-content { position:relative; z-index:2; padding:48px 56px; max-width:620px; }
        .pub-hero-kicker { font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#60a5fa; margin-bottom:12px; }
        .pub-hero-content h1 { font-size:36px; font-weight:800; color:#fff; line-height:1.18; margin-bottom:14px; }
        .pub-hero-content p { font-size:14.5px; color:rgba(255,255,255,.82); line-height:1.6; margin-bottom:24px; max-width:520px; }
        .pub-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }
        .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; background:var(--accent); color:#fff; border-radius:8px; font-size:14px; font-weight:700; border:none; cursor:pointer; transition:background .15s; }
        .btn-primary:hover { background:var(--accent-hover); }
        .btn-secondary { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; background:transparent; color:#fff; border:1px solid rgba(255,255,255,.35); border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
        .btn-secondary:hover { background:rgba(255,255,255,.08); }

        /* WRAPPER */
        .pub-wrapper { max-width:1280px; margin:0 auto; padding:22px 14px 40px; }
        .sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .sec-title { font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#1e40af; }
        .sec-link { font-size:12px; font-weight:600; color:var(--accent); display:flex; align-items:center; gap:4px; }

        /* ACCES RAPIDE - 6 cartes maquette */
        .acces-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin-bottom:24px; }
        @media(max-width:1200px){ .acces-grid{grid-template-columns:repeat(3,1fr);} }
        @media(max-width:700px){ .acces-grid{grid-template-columns:repeat(2,1fr);} }
        .acces-card { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:20px 16px 16px; position:relative; transition:box-shadow .15s, transform .15s; cursor:pointer; min-height:148px; display:flex; flex-direction:column; }
        .acces-card:hover { box-shadow:0 8px 24px rgba(15,23,42,.08); transform:translateY(-2px); border-color:#cbd5e1; }
        .acces-icon { width:38px; height:38px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; margin-bottom:12px; }
        .acces-card h3 { font-size:13px; font-weight:700; margin-bottom:6px; color:#0f172a; }
        .acces-card p { font-size:11.5px; color:#64748b; line-height:1.45; flex:1; }
        .acces-arrow { margin-top:12px; font-size:12px; color:#0f172a; }

        /* BOTTOM GRID - 3 colonnes */
        .bottom-grid { display:grid; grid-template-columns:1.15fr 1fr 0.85fr; gap:14px; }
        @media(max-width:1100px){ .bottom-grid{grid-template-columns:1fr;} }
        .panel { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:20px; }
        .panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid #f1f5f9; padding-bottom:10px; }
        .panel-head h2 { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#1e40af; }
        .panel-head a { font-size:11px; color:#2563eb; font-weight:600; }

        /* Actualités */
        .actu-item { display:flex; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
        .actu-item:last-child{border:none;}
        .actu-thumb { width:68px; height:48px; border-radius:6px; background:#e2e8f0; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:18px; }
        .actu-thumb img{width:100%;height:100%;object-fit:cover;}
        .actu-body{flex:1; min-width:0;}
        .actu-title{font-size:12.5px; font-weight:700; color:#0f172a; line-height:1.3; display:flex; align-items:center; gap:6px; flex-wrap:wrap;}
        .actu-badge{font-size:9px; font-weight:800; background:#2563eb; color:#fff; padding:2px 6px; border-radius:4px; letter-spacing:.05em;}
        .actu-desc{font-size:11.5px; color:#64748b; line-height:1.4; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
        .actu-date{font-size:11px; color:#94a3b8; margin-top:2px;}

        /* Documents */
        .doc-item{display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f1f5f9;}
        .doc-item:last-child{border:none;}
        .doc-icon{width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;}
        .doc-info{flex:1;}
        .doc-name{font-size:12.5px; font-weight:600; color:#0f172a;}
        .doc-meta{font-size:11px; color:#94a3b8; margin-top:1px;}
        .doc-dl{width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#334155; cursor:pointer; border:none;}
        .doc-dl:hover{background:#e2e8f0;}

        /* Liens utiles */
        .link-item{display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #f1f5f9; transition:background .12s; border-radius:6px; padding-left:6px; padding-right:6px;}
        .link-item:last-child{border:none;}
        .link-item:hover{background:#f8fafc;}
        .link-icon{width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; background:#f1f5f9; color:#334155;}
        .link-label{flex:1; font-size:12.5px; font-weight:600; color:#0f172a;}
        .link-arrow{color:#94a3b8; font-size:11px;}

        /* Discord banner */
        .discord-banner{background:linear-gradient(135deg,#5865f2,#4752c4); color:#fff; border-radius:10px; padding:16px 20px; display:flex; align-items:center; gap:14px; margin-bottom:14px; cursor:pointer; transition:opacity .15s;}
        .discord-banner:hover{opacity:.92;}
        .discord-banner i{font-size:28px;}
        .discord-banner b{font-size:14px;}
        .discord-banner span{font-size:12px; opacity:.9;}

        /* SECTIONS */
        .pub-section{display:none; flex:1 0 auto;}
        .pub-section.active{display:block; animation:fadeUp .25s ease;}
        #section-accueil.active{display:flex; flex-direction:column;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

        /* Recrutement etc. - garder style clair */
        .form-card{background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:28px;}
        .form-card h2{font-size:18px; font-weight:700; margin-bottom:6px; color:#0f172a;}
        .form-card .lead{font-size:14px; color:#64748b; margin-bottom:18px;}
        .form-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px 18px;}
        @media(max-width:700px){.form-grid{grid-template-columns:1fr;}}
        .form-field--full{grid-column:1 / -1;}
        .form-field label{display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; letter-spacing:.04em;}
        .form-field input,.form-field textarea,.form-field select{width:100%; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; font-size:14px; font-family:inherit; outline:none;}
        .form-field input:focus,.form-field textarea:focus,.form-field select:focus{border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,.12);}
        .form-actions{display:flex; align-items:center; gap:16px; margin-top:18px; flex-wrap:wrap;}
        .form-alert{padding:11px 14px; border-radius:8px; font-size:13.5px; margin-bottom:16px; display:none;}
        .form-alert.show{display:block;}
        .form-alert--ok{background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;}
        .form-alert--err{background:#fef2f2; color:#991b1b; border:1px solid #fecaca;}

        /* FOOTER — collé en bas */
        .pub-footer{background:#0f172a; color:#94a3b8; text-align:center; padding:18px 20px; font-size:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; max-width:100%; margin-top:auto; flex-shrink:0;}
        .pub-footer a{color:#94a3b8;}
        .pub-footer a:hover{color:#fff;}

        /* MODAL CONNEXION - redesign clair */
        .modal-overlay{display:none; position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.65); backdrop-filter:blur(6px); align-items:center; justify-content:center;}
        .modal-overlay.open{display:flex;}
        .modal-box{background:#fff; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,.2); width:100%; max-width:400px; padding:32px 28px; position:relative; margin:20px;}
        .modal-close{position:absolute; top:14px; right:16px; background:none; border:none; color:#64748b; font-size:22px; cursor:pointer;}
        .modal-logo{text-align:center; margin-bottom:20px;}
        .modal-logo img{height:48px; margin-bottom:8px;}
        .modal-title{font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase;}
        .modal-subtitle{font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-top:2px;}
        .modal-field{margin-bottom:14px;}
        .modal-field label{display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase;}
        .modal-field input{width:100%; padding:11px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; font-size:14px; outline:none;}
        .modal-field input:focus{border-color:var(--accent);}
        .modal-submit{width:100%; padding:12px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; margin-top:6px;}
        .modal-submit:hover{background:var(--accent-hover);}
        .modal-dev{margin-top:18px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center;}
        .civil-divider{display:flex; align-items:center; gap:12px; margin:16px 0; color:#94a3b8; font-size:12px;}
        .civil-divider::before,.civil-divider::after{content:""; flex:1; height:1px; background:#e2e8f0;}
        .btn-civil{width:100%; padding:11px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-weight:600; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px; transition:background .15s;}
        .btn-civil:hover{background:#f8fafc;}
        .btn-civil.google{color:#0f172a;}
        .btn-civil.apple{background:#000; color:#fff; border-color:#000;}
        @media(max-width:900px){
            .pub-nav-links{display:none;}
            .nav-mobile-btn{display:block;}
            .pub-hero-content{padding:32px 20px;}
            .pub-hero-content h1{font-size:26px;}
            .nav-search{display:none;}
            .pub-hero{margin:0; border-radius:0;}
        }
    </style>
</head>
<body>

<nav class="pub-nav" id="pub-nav">
    <div class="pub-nav-brand" onclick="showSection('accueil'); window.scrollTo({top:0,behavior:'smooth'});" role="button" tabindex="0" title="Accueil — Police Municipale" style="cursor:pointer;">
        <img src="assets/logo.png" alt="Logo PM">
        <div class="pub-nav-brand-text"><span class="t1">POLICE</span><span class="t2">MUNICIPALE</span></div>
        <img src="assets/logo-93rp.jpg" alt="93RP" class="brand-93" onerror="this.style.display='none'">
        <span style="font-weight:800; font-size:14px; color:#0f172a; margin-left:6px; border-left:1px solid #e2e8f0; padding-left:12px;">INTRANET</span>
    </div>
    <ul class="pub-nav-links" id="pub-nav-links">
        <li><a href="javascript:void(0)" data-section="accueil" class="active" onclick="event.preventDefault(); showSection('accueil');"><i class="fas fa-house" style="font-size:12px;"></i> Accueil</a></li>
        <li><a href="javascript:void(0)" data-section="actualites" onclick="event.preventDefault(); showSection('actualites');"><i class="fas fa-newspaper" style="font-size:12px;"></i> Actualités</a></li>
        <li><a href="javascript:void(0)" data-section="recruter" onclick="event.preventDefault(); showSection('recruter');"><i class="fas fa-file-lines" style="font-size:12px;"></i> Documents</a></li>
        <li><a href="javascript:void(0)" data-section="procedure" onclick="event.preventDefault(); showSection('procedure');"><i class="fas fa-box-open" style="font-size:12px;"></i> Ressources</a></li>
        <li><a href="javascript:void(0)" data-section="annuaire" onclick="event.preventDefault(); showSection('annuaire');"><i class="fas fa-address-book" style="font-size:12px;"></i> Annuaire</a></li>
    </ul>
    <div class="nav-right">
        <div class="nav-search"><i class="fas fa-search" style="color:#64748b;"></i><input type="text" placeholder="Rechercher..." id="nav-search-input"></div>
        <a href="https://discord.gg/bqQAEGXpwF" target="_blank" class="nav-icon-btn" title="Discord" style="background:#5865f2; color:#fff;"><i class="fab fa-discord"></i></a>
        <img src="assets/logo.png" alt="Profil" title="Profil — Espace Agent" onclick="openModal()" id="profile-agent-img" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid #e2e8f0; cursor:pointer; background:#fff; padding:2px;">
        <a href="#espace-civil" class="nav-cta" id="btn-espace-civil" onclick="openCivilModal();return false;" style="margin-left:4px; background:#0f172a;"><i class="fas fa-user"></i> Espace Civil</a>
        <div id="civil-header-profile" style="display:none; align-items:center; gap:10px; cursor:pointer; background:#f8fafc; border:1px solid #e2e8f0; border-radius:20px; padding:4px 10px 4px 4px;">
            <img id="civil-header-photo" src="" style="width:32px; height:32px; border-radius:50%; object-fit:cover; background:#e2e8f0;">
            <div style="text-align:left; line-height:1.1;">
                <div id="civil-header-name" style="font-size:13px; font-weight:700; color:#0f172a;"></div>
                <div style="font-size:11px; color:#64748b;">Espace Civil</div>
            </div>
            <button onclick="logoutCivil()" title="Déconnexion" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:4px 6px; margin-left:4px;"><i class="fas fa-sign-out-alt"></i></button>
        </div>
        <a href="#espace-agent" id="btn-espace-agent" style="display:none;"></a>
        <button class="nav-mobile-btn" onclick="toggleMobileMenu()"><i class="fas fa-bars"></i></button>
    </div>
</nav>

<div id="section-accueil" class="pub-section active">
    <div class="pub-hero">
        <div class="pub-hero-img"></div>
        <div class="pub-hero-overlay"></div>
        <div class="pub-hero-content">
            <p class="pub-hero-kicker">Bienvenue sur l'Intranet</p>
            <h1>Bienvenue dans votre<br>espace professionnel</h1>
            <p>Votre intranet centralise toutes les informations, outils et ressources nécessaires à votre activité quotidienne.</p>
            <div class="pub-hero-btns">
                <button class="btn-primary" onclick="openModal()"><i class="fas fa-shield-halved"></i> POLICE — Connexion Agent</button>
                <button class="btn-secondary" onclick="openCivilModal()"><i class="fas fa-user"></i> Se connecter — Civil</button>
            </div>
        </div>
    </div>
    <div class="pub-wrapper">
        <div class="sec-head"><span class="sec-title">Accès rapide</span></div>
        <div class="acces-grid">
            <div class="acces-card" onclick="handleRaccourci('candidature')">
                <div class="acces-icon" style="background:#2563eb; color:#fff;"><i class="fas fa-file-lines"></i></div>
                <h3>Candidature</h3>
                <p>Déposez votre candidature — suivi civil en temps réel.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="acces-card" onclick="handleRaccourci('suivi')">
                <div class="acces-icon" style="background:#7c3aed; color:#fff;"><i class="fas fa-clipboard-check"></i></div>
                <h3>Suivi dossier</h3>
                <p>Suivez votre recrutement et échangez avec la Direction.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="acces-card" onclick="handleRaccourci('annuaire')">
                <div class="acces-icon" style="background:#16a34a; color:#fff;"><i class="fas fa-address-book"></i></div>
                <h3>Annuaire</h3>
                <p>Discord, TikTok et numéros utiles.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="acces-card" onclick="handleRaccourci('procedure')">
                <div class="acces-icon" style="background:#f59e0b; color:#fff;"><i class="fas fa-book-open"></i></div>
                <h3>Procédure</h3>
                <p>Les 6 étapes du recrutement civil expliquées.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="acces-card" onclick="handleRaccourci('civil')">
                <div class="acces-icon" style="background:#ef4444; color:#fff;"><i class="fas fa-user-shield"></i></div>
                <h3>Espace Civil</h3>
                <p>Connexion / création de compte civil sécurisée.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="acces-card" onclick="handleRaccourci('support')">
                <div class="acces-icon" style="background:#06b6d4; color:#fff;"><i class="fas fa-life-ring"></i></div>
                <h3>Aide & Support</h3>
                <p>FAQ, Discord et assistance recrutement.</p>
                <span class="acces-arrow"><i class="fas fa-arrow-right"></i></span>
            </div>
        </div>

        <div class="discord-banner" onclick="window.open('https://discord.gg/bqQAEGXpwF','_blank')">
            <i class="fab fa-discord"></i>
            <div><b>Rejoignez notre Discord officiel</b><br><span>https://discord.gg/bqQAEGXpwF — échanges, briefings et support</span></div>
            <i class="fas fa-arrow-right" style="margin-left:auto;"></i>
        </div>

        <div class="bottom-grid">
            <div class="panel">
                <div class="panel-head"><h2>Actualités</h2><a href="#" onclick="showSection('actualites');return false;">Voir toutes les actualités →</a></div>
                <div class="actu-item">
                    <div class="actu-thumb"><img src="assets/img/hero-bg.png" alt="" onerror="this.style.display='none'"></div>
                    <div class="actu-body">
                        <div class="actu-title">Note de service n°2024-45 <span class="actu-badge">NOUVEAU</span></div>
                        <div class="actu-desc">Mise à jour des consignes opérationnelles pour les patrouilles de soirée.</div>
                        <div class="actu-date">27 mai 2024</div>
                    </div>
                </div>
                <div class="actu-item">
                    <div class="actu-thumb"><i class="fas fa-users"></i></div>
                    <div class="actu-body">
                        <div class="actu-title">Réunion mensuelle</div>
                        <div class="actu-desc">La prochaine réunion mensuelle aura lieu le 5 juin à 09h00 en salle de briefing.</div>
                        <div class="actu-date">26 mai 2024</div>
                    </div>
                </div>
                <div class="actu-item">
                    <div class="actu-thumb"><i class="fas fa-graduation-cap"></i></div>
                    <div class="actu-body">
                        <div class="actu-title">Formation secourisme</div>
                        <div class="actu-desc">Inscriptions ouvertes pour la formation PSC1 du mois de juin.</div>
                        <div class="actu-date">24 mai 2024</div>
                    </div>
                </div>
                <div style="text-align:center; margin-top:12px;"><a href="#" onclick="showSection('actualites');return false;" style="font-size:11px; color:#2563eb; font-weight:600;">Voir toutes les actualités →</a></div>
            </div>
            <div class="panel">
                <div class="panel-head"><h2>Documents récents</h2><a href="#" onclick="showSection('recruter');return false;">Voir tous les documents →</a></div>
                <div class="doc-item">
                    <div class="doc-icon" style="background:#fef2f2; color:#ef4444;"><i class="fas fa-file-pdf"></i></div>
                    <div class="doc-info"><div class="doc-name">Procédure intervention</div><div class="doc-meta">PDF · 1.2 Mo · 27/05/2024</div></div>
                    <button class="doc-dl"><i class="fas fa-download"></i></button>
                </div>
                <div class="doc-item">
                    <div class="doc-icon" style="background:#eff6ff; color:#2563eb;"><i class="fas fa-file-word"></i></div>
                    <div class="doc-info"><div class="doc-name">Compte rendu réunion</div><div class="doc-meta">DOCX · 845 Ko · 26/05/2024</div></div>
                    <button class="doc-dl"><i class="fas fa-download"></i></button>
                </div>
                <div class="doc-item">
                    <div class="doc-icon" style="background:#f0fdf4; color:#16a34a;"><i class="fas fa-file-excel"></i></div>
                    <div class="doc-info"><div class="doc-name">Planning des patrouilles</div><div class="doc-meta">XLSX · 320 Ko · 25/05/2024</div></div>
                    <button class="doc-dl"><i class="fas fa-download"></i></button>
                </div>
                <div class="doc-item">
                    <div class="doc-icon" style="background:#fff7ed; color:#f59e0b;"><i class="fas fa-file-powerpoint"></i></div>
                    <div class="doc-info"><div class="doc-name">Présentation sécurité</div><div class="doc-meta">PPTX · 2.4 Mo · 24/05/2024</div></div>
                    <button class="doc-dl"><i class="fas fa-download"></i></button>
                </div>
            </div>
            <div class="panel">
                <div class="panel-head"><h2>Liens utiles</h2></div>
                <a class="link-item" href="https://www.interieur.gouv.fr" target="_blank"><div class="link-icon"><i class="fas fa-landmark"></i></div><span class="link-label">Ministère de l'Intérieur</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://www.cnfpt.fr" target="_blank"><div class="link-icon"><i class="fas fa-building-columns"></i></div><span class="link-label">CNFPT</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://www.service-public.fr" target="_blank"><div class="link-icon" style="background:#eff6ff; color:#2563eb;"><i class="fas fa-globe"></i></div><span class="link-label">Service-Public.fr</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://www.legifrance.gouv.fr" target="_blank"><div class="link-icon" style="background:#fef3c7; color:#d97706;"><i class="fas fa-scale-balanced"></i></div><span class="link-label">Légifrance</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://meteofrance.com" target="_blank"><div class="link-icon" style="background:#e0f2fe; color:#0284c7;"><i class="fas fa-cloud-sun"></i></div><span class="link-label">Météo France</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://discord.gg/bqQAEGXpwF" target="_blank" style="background:#f5f3ff; border:1px solid #ddd6fe; margin-top:8px;"><div class="link-icon" style="background:#5865f2; color:#fff;"><i class="fab fa-discord"></i></div><span class="link-label">Discord 93RP</span><i class="fas fa-arrow-right link-arrow"></i></a>
                <a class="link-item" href="https://www.tiktok.com/@lenky.tv" target="_blank" style="background:#000; color:#fff; border:1px solid #000; margin-top:6px;"><div class="link-icon" style="background:#000; color:#fff;"><i class="fab fa-tiktok"></i></div><span class="link-label" style="color:#fff;">TikTok @lenky.tv</span><i class="fas fa-arrow-right link-arrow" style="color:#fff;"></i></a>
            </div>
        </div>
    </div>
</div>

<div id="section-annuaire" class="pub-section">
    <div class="pub-wrapper" style="max-width:800px;">
        <div class="sec-head"><span class="sec-title">Annuaire</span></div>
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:24px;">
            <h3 style="font-size:15px; font-weight:700; margin-bottom:10px;"><i class="fas fa-address-book" style="color:#2563eb; margin-right:8px;"></i>Contacts utiles</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <a href="https://discord.gg/bqQAEGXpwF" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:10px;"><div style="width:36px; height:36px; background:#5865f2; color:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center;"><i class="fab fa-discord"></i></div><div><div style="font-weight:700; font-size:13px;">Discord 93RP</div><div style="font-size:11px; color:#64748b;">discord.gg/bqQAEGXpwF</div></div><i class="fas fa-arrow-right" style="margin-left:auto; color:#94a3b8;"></i></a>
                <a href="https://www.tiktok.com/@lenky.tv" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#000; border:1px solid #000; border-radius:10px; color:#fff;"><div style="width:36px; height:36px; background:#fff; color:#000; border-radius:8px; display:flex; align-items:center; justify-content:center;"><i class="fab fa-tiktok"></i></div><div><div style="font-weight:700; font-size:13px;">TikTok</div><div style="font-size:11px; color:#a1a1aa;">@lenky.tv</div></div><i class="fas fa-arrow-right" style="margin-left:auto; color:#fff;"></i></a>
            </div>
            <div style="margin-top:18px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                <div style="font-weight:600; font-size:12px; margin-bottom:6px;">Numéros utiles</div>
                <div style="font-size:13px; line-height:1.8; color:#334155;">
                    <div><b>PC Radio:</b> 01 23 45 67 89 — <b>CSU:</b> 01 98 76 54 32</div>
                    <div><b>Standard Mairie:</b> 01 45 67 89 00</div>
                    <div><b>Urgences:</b> 17 / 112</div>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="section-actualites" class="pub-section">
    <div class="pub-wrapper">
        <div class="sec-head"><span class="sec-title">Actualités du service</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px;">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
                <div style="height:120px; background:linear-gradient(135deg,#1e3a5f,#2563eb); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.6); font-size:36px;"><i class="fas fa-bullhorn"></i></div>
                <div style="padding:16px;"><span style="background:#dbeafe; color:#1e40af; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Nouveau</span><div style="font-weight:700; margin-top:8px;">Ouverture des recrutements</div><div style="font-size:13px; color:#64748b; margin-top:6px;">La Police Municipale ouvre ses recrutements BMU et GSI.</div></div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
                <div style="height:120px; background:linear-gradient(135deg,#14532d,#22c55e); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.6); font-size:36px;"><i class="fas fa-graduation-cap"></i></div>
                <div style="padding:16px;"><span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Formation</span><div style="font-weight:700; margin-top:8px;">Formation PSC1</div><div style="font-size:13px; color:#64748b; margin-top:6px;">Inscriptions ouvertes pour le PSC1.</div></div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
                <div style="height:120px; background:linear-gradient(135deg,#7f1d1d,#ef4444); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.6); font-size:36px;"><i class="fas fa-shield-halved"></i></div>
                <div style="padding:16px;"><span style="background:#fee2e2; color:#991b1b; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Opérationnel</span><div style="font-weight:700; margin-top:8px;">Mise à jour consignes</div><div style="font-size:13px; color:#64748b; margin-top:6px;">Consignes de patrouille nocturne mises à jour.</div></div>
            </div>
        </div>
    </div>
</div>

<div id="section-recruter" class="pub-section">
    <div class="pub-wrapper" style="max-width:800px;">
        <div class="form-card" style="margin-bottom:18px; background:linear-gradient(135deg,#eff6ff,#dbeafe); border-color:#bfdbfe;">
            <h2><i class="fas fa-file-pen" style="color:var(--accent); margin-right:8px;"></i>RECRUTEMENT POLICE MUNICIPALE</h2>
            <p class="lead">Déposez votre candidature en ligne.</p>
        </div>
        <div class="form-card">
            <h2>Formulaire de candidature</h2>
            <p class="lead">Renseignez le formulaire — vous recevrez une référence pour le suivi.</p>
            <div id="candid-alert" class="form-alert" role="status"></div>
            <form id="candidature-form" novalidate>
                <div class="form-grid">
                    <div class="form-field"><label for="c-discord">Pseudo Discord *</label><input id="c-discord" name="discord" type="text" placeholder="ex : lenny_pm" required maxlength="80"></div>
                    <div class="form-field"><label for="c-nom">Nom *</label><input id="c-nom" name="nom" type="text" placeholder="Nom" required maxlength="120"></div>
                    <div class="form-field"><label for="c-prenom">Prénom *</label><input id="c-prenom" name="prenom" type="text" placeholder="Prénom" required maxlength="120"></div>
                    <div class="form-field"><label for="c-age">Âge *</label><input id="c-age" name="age" type="text" inputmode="numeric" placeholder="Âge" required maxlength="10"></div>
                    <div class="form-field form-field--full"><label for="c-dispos">Disponibilités</label><input id="c-dispos" name="disponibilites" type="text" placeholder="Ex : soirs et week-ends" maxlength="4000"></div>
                    <div class="form-field form-field--full"><label for="c-exp">Expérience</label><textarea id="c-exp" name="experience" rows="4" placeholder="Décrivez votre expérience..." maxlength="12000"></textarea></div>
                    <div class="form-field form-field--full"><label for="c-motiv">Motivation</label><textarea id="c-motiv" name="motivation" rows="4" placeholder="Expliquez votre motivation..." maxlength="12000"></textarea></div>
                </div>
                <div id="candidature-account-notice" style="margin-top:16px; padding:12px; border-radius:8px; background:#fffbeb; border:1px solid #fcd34d; color:#92400e; font-size:13px; display:none;"><i class="fas fa-exclamation-triangle"></i> Vous devez <a href="#" onclick="openCivilModal();return false;" style="color:#2563eb; font-weight:700; text-decoration:underline;">créer un compte</a> et être connecté pour postuler. Votre compte sera utilisé pour communiquer avec les recruteurs.</div>
                <div class="form-actions"><button type="submit" class="btn-primary" id="candidature-submit-btn"><i class="fas fa-paper-plane"></i> Envoyer la candidature</button><a href="#" onclick="showSection('suivi');return false;" style="color:var(--accent); font-weight:600; font-size:13px;">Suivre mon dossier →</a></div>
            </form>
        </div>
    </div>
</div>

<div id="section-procedure" class="pub-section">
    <div class="pub-wrapper" style="max-width:780px;">
        <div class="sec-head"><span class="sec-title">Procédure de recrutement</span></div>
        <div style="display:flex; flex-direction:column; gap:14px; margin-top:16px;">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #2563eb;"><b>1. Dépôt de candidature</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Remplissez le formulaire depuis « Se faire recruter ».</p></div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #f59e0b;"><b>2. Étude du dossier</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Examen par la Direction recrutement.</p></div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #7c3aed;"><b>3. Entretien Direction</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Entretien sur Discord.</p></div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #16a34a;"><b>4. Acceptation / Refus</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Notification via messagerie candidat.</p></div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #0ea5e9;"><b>5. Code d'intégration</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Code unique pour le formulaire d'intégration.</p></div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; border-left:4px solid #ef4444;"><b>6. Intégration & formation</b><p style="color:#64748b; font-size:13px; margin-top:4px;">Rejoignez en tant que Gardien Stagiaire (STG).</p></div>
        </div>
        <div style="text-align:center; margin-top:20px;"><button class="btn-primary" onclick="showSection('recruter')"><i class="fas fa-file-pen"></i> Déposer une candidature</button></div>
    </div>
</div>

<div id="section-suivi" class="pub-section">
    <div class="pub-wrapper" style="max-width:560px;">
        <div style="text-align:center; margin-bottom:20px;"><span style="font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#2563eb;">Espace Candidat — Suivre mon recrutement</span></div>
        <div id="cand-login-block">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:28px; text-align:center;">
                <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#2563eb; margin-bottom:6px;">Espace candidat</p>
                <h2 style="font-size:20px; font-weight:800; margin-bottom:8px;">Suivre votre dossier</h2>
                <p style="font-size:14px; color:#64748b; margin-bottom:18px;">Votre compte est utilisé pour suivre votre candidature et communiquer avec les recruteurs.</p>
                <div id="suivi-alert" class="form-alert" role="status"></div>
                <div id="suivi-not-logged" style="display:none;">
                    <p style="font-size:13px; color:#92400e; background:#fffbeb; border:1px solid #fcd34d; padding:12px; border-radius:8px; margin-bottom:16px;"><i class="fas fa-exclamation-triangle"></i> Vous devez être connecté avec votre compte pour suivre votre dossier.</p>
                    <button onclick="openCivilModal()" class="btn-primary"><i class="fas fa-user"></i> Se connecter / Créer un compte</button>
                    <div style="margin-top:12px;"><a href="#" onclick="showSection('recruter');return false;" style="color:#2563eb; font-size:13px; font-weight:600;">Pas encore de candidature ? Déposez votre candidature →</a></div>
                </div>
                <div id="suivi-logged" style="display:none;">
                    <p style="font-size:13px; color:#166534; background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:8px; margin-bottom:16px;"><i class="fas fa-check-circle"></i> Connecté en tant que <b id="suivi-user-email"></b></p>
                    <button id="suivi-load-btn" class="btn-primary"><i class="fas fa-sync"></i> Charger mon dossier</button>
                </div>
                <form id="candidat-login-form" novalidate style="display:none;">
                    <input type="hidden" id="login-discord"><input type="hidden" id="login-password">
                </form>
            </div>
        </div>
        <div id="candidat-dossier-section" style="display:none;">
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;"><span id="dossier-statut" style="padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; background:#fef3c7; color:#92400e;">—</span><button type="button" id="candidat-logout-btn" style="padding:6px 12px; border-radius:6px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; font-size:13px;">Déconnecter</button></div>
                <dl style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;"><div><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Référence</dt><dd id="dossier-reference">—</dd></div><div><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Dépôt</dt><dd id="dossier-date">—</dd></div><div><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Discord</dt><dd id="dossier-discord">—</dd></div><div><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Identité</dt><dd id="dossier-identite">—</dd></div><div><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Âge</dt><dd id="dossier-age">—</dd></div><div style="grid-column:1/-1;"><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Disponibilités</dt><dd id="dossier-dispos">—</dd></div><div style="grid-column:1/-1;"><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Expérience</dt><dd id="dossier-exp">—</dd></div><div style="grid-column:1/-1;"><dt style="color:#64748b; font-size:11px; text-transform:uppercase;">Motivation</dt><dd id="dossier-motivation">—</dd></div></dl>
                <div style="margin-top:18px; border:1px solid #e2e8f0; border-radius:10px; padding:16px; background:#f8fafc;">
                    <h3 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-comments" style="color:#2563eb; margin-right:6px;"></i>Messagerie recrutement</h3>
                    <div id="recrut-chat-list" style="max-height:240px; overflow-y:auto; margin-bottom:10px;"></div>
                    <textarea id="recrut-chat-input" rows="3" maxlength="6000" placeholder="Écrire à la Direction recrutement…" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"></textarea>
                    <div style="display:flex; gap:8px; margin-top:8px;"><button type="button" id="recrut-chat-send" style="padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Envoyer</button><button type="button" id="recrut-chat-refresh" style="padding:8px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer;">Actualiser</button></div>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="section-integration" class="pub-section">
    <div class="pub-wrapper" style="max-width:700px;">
        <div style="text-align:center; margin-bottom:20px;"><span style="font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#2563eb;">Formulaire d'intégration</span></div>
        <div class="form-card">
            <h2><i class="fas fa-clipboard-list" style="color:#2563eb; margin-right:8px;"></i>Formulaire d'intégration</h2>
            <p class="lead">Réservé aux candidats ayant reçu un code d'intégration.</p>
            <div id="integ-alert" class="form-alert" role="status"></div>
            <div id="integ-code-step">
                <div class="modal-field"><label>Code d'intégration</label><input id="integ-code-input" type="text" placeholder="Ex : INT-AB12-CD34" maxlength="40" style="text-transform:uppercase; letter-spacing:.06em;"></div>
                <button type="button" id="integ-code-btn" class="btn-primary"><i class="fas fa-key"></i> Valider le code</button>
            </div>
            <div id="integ-form-step" style="display:none; margin-top:20px;">
                <form id="integration-form" novalidate>
                    <input type="hidden" id="integ-code-hidden" name="code" value="">
                    <div class="form-grid">
                        <div class="form-field"><label>Nom *</label><input id="integ-nom" name="nom" type="text" required maxlength="120"></div>
                        <div class="form-field"><label>Prénom *</label><input id="integ-prenom" name="prenom" type="text" required maxlength="120"></div>
                        <div class="form-field"><label>Pseudo Discord *</label><input id="integ-discord" name="discord" type="text" required maxlength="80"></div>
                        <div class="form-field"><label>Âge *</label><input id="integ-age" name="age" type="text" required maxlength="10"></div>
                        <div class="form-field form-field--full"><label>Pourquoi souhaitez-vous rejoindre la Police Municipale ? *</label><textarea id="integ-motivation" name="motivation" rows="4" required maxlength="8000"></textarea></div>
                        <div class="form-field form-field--full"><label>Expériences précédentes</label><textarea id="integ-experience" name="experience" rows="3" maxlength="8000"></textarea></div>
                        <div class="form-field form-field--full"><label>Vos disponibilités *</label><input id="integ-disponibilites" name="disponibilites" type="text" required maxlength="4000"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="btn-primary"><i class="fas fa-paper-plane"></i> Soumettre le formulaire</button></div>
                </form>
            </div>
        </div>
    </div>
</div>

<footer class="pub-footer">
    <span>© <?= date('Y') ?> Police Municipale — Tous droits réservés</span>
    <span><a href="https://discord.gg/bqQAEGXpwF" target="_blank" style="color:#94a3b8; margin-right:10px;"><i class="fab fa-discord"></i> Discord</a> <a href="#" onclick="openModal();return false;" style="color:#60a5fa; font-weight:600;">Espace Agent</a> · <a href="#">Mentions légales</a> · <a href="#">Politique de confidentialité</a> · <a href="#">Contact</a></span>
</footer>

<div id="modal-agent" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Connexion espace agent">
    <div class="modal-box">
        <button class="modal-close" onclick="closeModal()" aria-label="Fermer">×</button>
        <div class="modal-logo">
            <img src="assets/logo.png" alt="Logo PM">
            <div class="modal-title">Police Municipale</div>
            <div class="modal-subtitle">Espace Agent — Connexion</div>
        </div>
        <form id="login-form" novalidate>
            <div class="modal-field"><label for="rio">Numéro RIO</label><input id="rio" type="text" name="rio" autocomplete="username" placeholder="Ex : PM00123" required></div>
            <div class="modal-field"><label for="password">Mot de passe</label><input id="password" type="password" name="password" autocomplete="current-password" placeholder="••••••••" required></div>
            <button type="submit" class="modal-submit"><i class="fas fa-shield-halved" style="margin-right:8px;"></i>Se connecter</button>
        </form>
        <div style="text-align:center; margin-top:12px;"><a href="#" onclick="showSection('recruter');closeModal();return false;" style="font-size:12px; color:#2563eb; font-weight:600;">Créer un compte civil →</a></div>
        <div id="local-libre-acces" hidden class="modal-dev">
            <p>Accès local détecté : <a id="libre-acces-lien-root" href="#" style="color:#2563eb; font-weight:600;"></a></p>
            <button id="btn-libre-acces-local" style="width:100%; padding:10px; background:transparent; color:#64748b; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-weight:600; margin-top:8px;">Accès libre local</button>
        </div>
    </div>
</div>

<div id="modal-civil" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Connexion civil">
    <div class="modal-box" style="max-height:90vh; overflow-y:auto; scrollbar-width:thin;">
        <button class="modal-close" onclick="closeCivilModal()" aria-label="Fermer">×</button>
        <div class="modal-logo">
            <img src="assets/logo.png" alt="Logo PM">
            <div class="modal-title">Espace Civil</div>
            <div class="modal-subtitle">Connexion — Particulier</div>
        </div>

        <form id="civil-login-form" novalidate autocomplete="off">
            <div class="modal-field"><label>Email</label><input type="email" id="civil-email" name="civil_email_login" placeholder="vous@exemple.fr" required autocomplete="email"></div>
            <div class="modal-field"><label>Mot de passe</label><input type="password" id="civil-password" name="civil_password_login" placeholder="••••••••" required autocomplete="current-password"></div>
            <button type="submit" class="modal-submit" style="background:#0f172a;">Se connecter</button>
        </form>
        <div style="text-align:center; margin-top:14px;"><a href="#" onclick="toggleCivilCreate(true);return false;" style="font-size:12px; color:#2563eb; font-weight:600;">Créer un compte civil →</a></div>
        <div id="civil-create-form" style="display:none; margin-top:16px; border-top:1px solid #e2e8f0; padding-top:16px;">
            <div class="modal-field"><label>Nom</label><input type="text" id="civil-nom" placeholder="Nom"></div>
            <div class="modal-field"><label>Prénom</label><input type="text" id="civil-prenom" placeholder="Prénom"></div>
            <div class="modal-field"><label>Email</label><input type="email" id="civil-create-email" name="civil_email_create" placeholder="vous@exemple.fr" autocomplete="email"></div>
            <div class="modal-field"><label>Mot de passe</label><input type="password" id="civil-create-password" name="civil_password_create" placeholder="••••••••" autocomplete="new-password"></div>
            <div class="modal-field"><label>Confirmer mot de passe</label><input type="password" id="civil-create-password2" name="civil_password2_create" placeholder="••••••••" autocomplete="new-password"></div>
            <div class="modal-field"><label>Photo de profil</label><input type="file" id="civil-photo" accept="image/*"><div id="civil-photo-preview" style="width:48px; height:48px; border-radius:50%; background:#f1f5f9; margin-top:8px; overflow:hidden; display:flex; align-items:center; justify-content:center;"><i class="fas fa-user" style="color:#94a3b8;"></i></div></div>
            <button type="button" class="modal-submit" style="background:#2563eb;" onclick="createCivilAccount()">Créer le compte</button>
            <div style="text-align:center; margin-top:8px;"><a href="#" onclick="toggleCivilCreate(false);return false;" style="font-size:12px; color:#64748b;">Retour connexion</a></div>
        </div>
    </div>
</div>

<script src="assets/js/pm-server-storage.js"></script>
<script>
function renderPublicActualites(){
    try{
        const raw = localStorage.getItem('PM_INTRANET_ANNONCES') || '[]';
        let ann = [];
        try{ ann = JSON.parse(raw); }catch(e){ ann=[]; }
        if(!Array.isArray(ann) || ann.length===0) return;
        const grid = document.querySelector('#section-actualites .pub-wrapper > div');
        if(!grid) return;
        const colors = [
            'linear-gradient(135deg,#1e3a5f,#2563eb)',
            'linear-gradient(135deg,#14532d,#22c55e)',
            'linear-gradient(135deg,#7f1d1d,#ef4444)',
            'linear-gradient(135deg,#4a1e6b,#7c3aed)'
        ];
        const badges = [
            '<span style="background:#dbeafe; color:#1e40af; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Nouveau</span>',
            '<span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Formation</span>',
            '<span style="background:#fee2e2; color:#991b1b; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">Opérationnel</span>'
        ];
        grid.innerHTML = ann.slice().reverse().slice(0,6).map((a,i)=>{
            const c = colors[i % colors.length];
            const b = badges[i % badges.length];
            const icon = i%3===0 ? 'fa-bullhorn' : i%3===1 ? 'fa-graduation-cap' : 'fa-shield-halved';
            return `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
                <div style="height:120px; background:${c}; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.6); font-size:36px;"><i class="fas ${icon}"></i></div>
                <div style="padding:16px;">${b}<div style="font-weight:700; margin-top:8px;">${(a.title||'Actualité').replace(/</g,'&lt;')}</div><div style="font-size:13px; color:#64748b; margin-top:6px;">${(a.content||'').slice(0,90).replace(/</g,'&lt;')}</div><div style="font-size:11px; color:#94a3b8; margin-top:8px;">${a.timestamp ? new Date(a.timestamp).toLocaleDateString('fr-FR') : ''} ${a.auteur ? '— '+a.auteur.replace(/</g,'&lt;') : ''}</div></div>
            </div>`;
        }).join('');
    }catch(e){}
}
document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(renderPublicActualites, 800); setInterval(renderPublicActualites, 5000); });
function showSection(name){
    document.querySelectorAll('.pub-section').forEach(function(s){ s.classList.remove('active'); });
    var t=document.getElementById('section-'+name);
    if(t){ t.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'});}
    document.querySelectorAll('.pub-nav-links a[data-section]').forEach(function(a){ a.classList.toggle('active', a.dataset.section===name); });
    if(name==='actualites') setTimeout(renderPublicActualites, 100);
}
function goDash(section){
    try{ sessionStorage.setItem('pm_pending_section', section); }catch(e){}
    window.location.href = 'dashboard.php';
}
function handleRaccourci(key){
    // Raccourcis "Espace Civil" : si FDO (Direction) connecté → dashboard onglet civil (recrutement), sinon → section publique civile
    let isFDO=false;
    try{
        const raw=sessionStorage.getItem('currentUser');
        const u=raw?JSON.parse(raw):null;
        isFDO = !!(u && u.role==='Direction' && ['DPM','DRA','CDP'].includes(String(u.grade||'').toUpperCase()));
    }catch(e){}
    const mapFDO={ candidature:'recrutement', suivi:'recrutement', annuaire:'recherche', procedure:'recrutement', civil:'recrutement', support:'messagerie-recrutement' };
    const mapCivil={ candidature:'recruter', suivi:'suivi', annuaire:'annuaire', procedure:'procedure', civil:'civil', support:'annuaire' };
    if(isFDO && mapFDO[key]){
        goDash(mapFDO[key]);
        return;
    }
    if(key==='civil'){
        // si civil déjà connecté → suivi, sinon → modale civil
        try{
            const c=JSON.parse(localStorage.getItem('pm_civil_session')||'null');
            if(c && c.email){ showSection('suivi'); return; }
        }catch(e){}
        openCivilModal();
        return;
    }
    const target = mapCivil[key] || key;
    showSection(target);
}
function toggleMobileMenu(){
    var l=document.getElementById('pub-nav-links');
    l.style.display=(l.style.display==='flex')?'none':'flex';
    l.style.flexDirection='column'; l.style.position='absolute'; l.style.top='64px'; l.style.left='0'; l.style.right='0'; l.style.background='#fff'; l.style.padding='12px 16px'; l.style.borderBottom='1px solid #e2e8f0'; l.style.zIndex='300';
}
(function(){
    var inp=document.getElementById('nav-search-input');
    if(!inp || inp.dataset.bound) return;
    inp.dataset.bound='1';
    inp.addEventListener('input', function(e){
        var q=e.target.value.toLowerCase().trim();
        var cards=document.querySelectorAll('.acces-card');
        var actus=document.querySelectorAll('.actu-item');
        var panels=document.querySelectorAll('.panel');
        if(!q){
            cards.forEach(function(c){ c.style.display=''; });
            actus.forEach(function(c){ c.style.display='flex'; });
            panels.forEach(function(c){ c.style.display=''; });
            return;
        }
        var any=false;
        cards.forEach(function(c){
            var txt=(c.textContent||'').toLowerCase();
            var show=txt.includes(q);
            c.style.display=show?'':'none';
            if(show) any=true;
        });
        actus.forEach(function(c){
            var txt=(c.textContent||'').toLowerCase();
            c.style.display=txt.includes(q)?'':'none';
        });
        // Si recherche depuis l'accueil et aucun résultat, propose d'aller en dashboard
        if(!any && q.length>2){
            // Optionnel: ne rien faire
        }
    });
    inp.addEventListener('keydown', function(e){
        if(e.key==='Enter'){
            var q=inp.value.trim();
            if(!q) return;
            e.preventDefault();
            // Si FDO connecté, va vers recherche effectif avec query
            try{
                var raw=sessionStorage.getItem('currentUser');
                var u=raw?JSON.parse(raw):null;
                var isFDO=!!(u && u.role==='Direction');
                if(isFDO){
                    sessionStorage.setItem('pm_pending_search', q);
                    window.location.href='dashboard.php';
                    return;
                }
            }catch(e){}
            // Sinon filtre déjà fait en input, scrolle vers accès rapide
            var first=document.querySelector('.acces-card:not([style*="display: none"])');
            if(first) first.scrollIntoView({behavior:'smooth', block:'center'});
        }
    });
})();
function openModal(){ document.getElementById('modal-agent').classList.add('open'); document.getElementById('rio').focus(); }
function closeModal(){ document.getElementById('modal-agent').classList.remove('open'); }
document.getElementById('modal-agent').addEventListener('click', function(e){ if(e.target===this) closeModal(); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });
(function(){
    // Si on vient du dashboard (clic "Se connecter"), on ouvre la modale une fois
    let shouldOpen = false;
    try{ shouldOpen = sessionStorage.getItem('pm_open_login')==='1'; if(shouldOpen) sessionStorage.removeItem('pm_open_login'); }catch(e){}
    if(shouldOpen){
        setTimeout(function(){ openModal(); }, 250);
    }
    // Nettoie l'URL si on arrive avec #espace-agent via bookmark/direct — n'ouvre pas la modale automatiquement
    if(window.location.hash==='#espace-agent'){
        history.replaceState(null,'', window.location.pathname + window.location.search);
    }
    window.addEventListener('hashchange', function(){ if(window.location.hash==='#espace-agent') openModal(); });
})();

// --- Civil Espace ---
function openCivilModal(){
    const m=document.getElementById('modal-civil');
    // nettoie l'autofill agent (RIO) qui pollue le champ email civil
    try{
        const e1=document.getElementById('civil-email');
        const p1=document.getElementById('civil-password');
        if(e1 && (e1.value==='6452182' || /^\d{7}$/.test(e1.value.trim()))) e1.value='';
        // si vide on laisse vide, sinon on garde mais on évite le jaune RIO
        if(e1) e1.setAttribute('autocomplete','email');
        if(p1) p1.value='';
        // reset création si ouverte précédemment
        const ce=document.getElementById('civil-create-email');
        if(ce && /^\d{7}$/.test(ce.value.trim())) ce.value='';
    }catch(e){}
    m.classList.add('open');
    setTimeout(function(){
        const f=document.getElementById('civil-email');
        if(f) f.focus();
    },80);
}
function closeCivilModal(){ document.getElementById('modal-civil').classList.remove('open'); }
function toggleCivilCreate(show){ document.getElementById('civil-create-form').style.display = show ? 'block' : 'none'; }
function updateCivilHeader(){
    try{
        const raw = localStorage.getItem('pm_civil_session');
        const civil = raw ? JSON.parse(raw) : null;
        const agentBtn = document.getElementById('btn-espace-agent');
        const agentImg = document.getElementById('profile-agent-img');
        const civilBox = document.getElementById('civil-header-profile');
        if(civil && civil.email){
            if(agentBtn) agentBtn.style.display='none';
            if(agentImg) agentImg.style.display='none';
            if(civilBox){
                civilBox.style.display='flex';
                document.getElementById('civil-header-name').textContent = (civil.prenom||'')+' '+(civil.nom||'');
                const ph = document.getElementById('civil-header-photo');
                if(ph) ph.src = civil.photo || 'https://i.pravatar.cc/100?u='+encodeURIComponent(civil.email);
            }
        } else {
            if(agentBtn) agentBtn.style.display='';
            if(agentImg) agentImg.style.display='';
            if(civilBox) civilBox.style.display='none';
        }
    }catch(e){}
}
function logoutCivil(){ localStorage.removeItem('pm_civil_session'); updateCivilHeader(); alert('Déconnecté de l’espace civil'); }
function civilOAuth(provider){
    const email = prompt('Entrez votre email '+provider+' (simulation) :');
    if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email invalide');
    const nom = email.split('@')[0].split('.')[0] || 'Civil';
    const prenom = email.split('@')[0].split('.')[1] || '';
    const photo = 'https://i.pravatar.cc/100?u='+encodeURIComponent(email);
    const account={nom: nom.charAt(0).toUpperCase()+nom.slice(1), prenom: prenom.charAt(0).toUpperCase()+prenom.slice(1), email, photo, provider};
    try{
        const raw=localStorage.getItem('pm_civil_accounts');
        const list=raw?JSON.parse(raw):[];
        const arr=Array.isArray(list)?list:[];
        if(!arr.some(function(a){ return a.email && a.email.toLowerCase()===email.toLowerCase(); })){
            arr.push(account);
            localStorage.setItem('pm_civil_accounts', JSON.stringify(arr));
        }
    }catch(e){}
    localStorage.setItem('pm_civil_session', JSON.stringify(account));
    closeCivilModal(); updateCivilHeader(); alert('Connecté via '+provider+' : '+email);
}
function createCivilAccount(){
    const nom=document.getElementById('civil-nom').value.trim();
    const prenom=document.getElementById('civil-prenom').value.trim();
    const email=document.getElementById('civil-create-email').value.trim();
    const pwd=document.getElementById('civil-create-password') ? document.getElementById('civil-create-password').value : '';
    const pwd2=document.getElementById('civil-create-password2') ? document.getElementById('civil-create-password2').value : '';
    if(!nom||!prenom||!email) return alert('Nom, prénom et email requis');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email invalide');
    if(!pwd || pwd.length<8) return alert('Mot de passe requis (min 8 caractères)');
    if(pwd!==pwd2) return alert('Les mots de passe ne correspondent pas');
    // Vérifie doublon
    try{
        const listRaw=localStorage.getItem('pm_civil_accounts');
        const list=listRaw?JSON.parse(listRaw):[];
        if(Array.isArray(list) && list.some(function(a){ return a.email && a.email.toLowerCase()===email.toLowerCase(); })){
            alert('Un compte existe déjà avec cet email. Veuillez vous connecter.');
            return;
        }
    }catch(e){}
    const _cpe=document.getElementById('civil-photo');
    const file=_cpe && _cpe.files ? _cpe.files[0] : null;
    const doCreate=function(photo){
        const account={nom, prenom, email, password:pwd, photo: photo || 'https://i.pravatar.cc/100?u='+encodeURIComponent(email), provider:'local'};
        // stocke dans la liste des comptes civils
        try{
            const raw=localStorage.getItem('pm_civil_accounts');
            const list=raw?JSON.parse(raw):[];
            const arr=Array.isArray(list)?list:[];
            arr.push(account);
            localStorage.setItem('pm_civil_accounts', JSON.stringify(arr));
        }catch(e){}
        localStorage.setItem('pm_civil_session', JSON.stringify(account));
        closeCivilModal(); updateCivilHeader(); alert('Compte civil créé : '+prenom+' '+nom+' — vous pouvez maintenant vous connecter');
        // reset form
        try{ document.getElementById('civil-nom').value=''; document.getElementById('civil-prenom').value=''; document.getElementById('civil-create-email').value=''; document.getElementById('civil-create-password').value=''; document.getElementById('civil-create-password2').value=''; document.getElementById('civil-photo').value=''; }catch(e){}
    };
    if(file){
        const r=new FileReader();
        r.onload=function(e){ doCreate(e.target.result); };
        r.readAsDataURL(file);
    } else {
        doCreate('');
    }
}
document.addEventListener('DOMContentLoaded', updateCivilHeader);
document.getElementById('modal-civil').addEventListener('click', function(e){ if(e.target===this) closeCivilModal(); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeCivilModal(); });
const _civilPhotoEl=document.getElementById('civil-photo');
if(_civilPhotoEl) _civilPhotoEl.addEventListener('change', function(e){
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{
        const img=document.querySelector('#civil-photo-preview img');
        const icon=document.querySelector('#civil-photo-preview i');
        if(img){ img.src=ev.target.result; img.style.display='block'; }
        if(icon) icon.style.display='none';
        const hdr=document.getElementById('civil-photo-preview');
        if(hdr) hdr.style.border='2px solid #2563eb';
    }; r.readAsDataURL(f);
});
document.getElementById('civil-login-form').addEventListener('submit', function(e){
    e.preventDefault();
    const email=document.getElementById('civil-email').value.trim();
    const pwd=document.getElementById('civil-password').value;
    if(!email||!pwd) return alert('Email et mot de passe requis');
    // Vérifie si compte existe (stocké via "Créer un compte")
    try{
        const listRaw=localStorage.getItem('pm_civil_accounts');
        const list=listRaw?JSON.parse(listRaw):[];
        const found = Array.isArray(list) ? list.find(function(a){ return a.email && a.email.toLowerCase()===email.toLowerCase(); }) : null;
        const curRaw=localStorage.getItem('pm_civil_session');
        const cur=curRaw?JSON.parse(curRaw):null;
        const account = found || (cur && cur.email && cur.email.toLowerCase()===email.toLowerCase() ? cur : null);
        if(account){
            // Vérif mot de passe si stocké
            if(account.password && account.password!==pwd){
                alert('Mot de passe incorrect');
                return;
            }
            localStorage.setItem('pm_civil_session', JSON.stringify(account));
            closeCivilModal(); updateCivilHeader(); alert('Connecté : '+account.prenom+' '+account.nom); return;
        }
    }catch(e){}
    alert('Aucun compte trouvé avec cet email. Veuillez d\'abord créer un compte via "Créer un compte civil".');
    toggleCivilCreate(true);
});

document.getElementById('candidature-form').addEventListener('submit', async function(e){
    e.preventDefault(); var a=document.getElementById('candid-alert'); a.className='form-alert'; a.textContent='';
    // Vérifie que l'utilisateur a un compte civil
    var civilRaw = localStorage.getItem('pm_civil_session');
    var civil = null; try{ civil = civilRaw ? JSON.parse(civilRaw) : null; }catch(e){}
    if(!civil || !civil.email){
        a.className='form-alert form-alert--err show';
        a.textContent='Vous devez créer un compte et être connecté pour postuler. Cliquez sur "Se connecter — Civil" en haut de la page.';
        document.getElementById('candidature-account-notice').style.display='block';
        openCivilModal();
        return;
    }
    document.getElementById('candidature-account-notice').style.display='none';
    var body={ discord:document.getElementById('c-discord').value.trim(), nom:document.getElementById('c-nom').value.trim(), prenom:document.getElementById('c-prenom').value.trim(), age:document.getElementById('c-age').value.trim(), pole:'PM', disponibilites:document.getElementById('c-dispos').value.trim(), experience:document.getElementById('c-exp').value.trim(), motivation:document.getElementById('c-motiv').value.trim(), civil_email: civil.email, civil_nom: civil.nom, civil_prenom: civil.prenom };
    if(!body.discord || !body.nom || !body.prenom || !body.age){ a.className='form-alert form-alert--err show'; a.textContent='Veuillez remplir tous les champs obligatoires.'; return; }
    var btn=this.querySelector('button[type="submit"]'); btn.disabled=true; var prev=btn.innerHTML; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Envoi…';
    try{ var res=await fetch('api/candidatures',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(body)}); var data=await res.json().catch(function(){return {};}); if(!res.ok){ a.className='form-alert form-alert--err show'; a.textContent=data.error||'Erreur lors de l\'envoi.';} else { a.className='form-alert form-alert--ok show'; a.textContent='✓ Candidature envoyée ! Référence : '+(data.reference||'—')+'. Suivez votre dossier dans « Suivre mon recrutement » via votre compte ('+civil.email+').'; this.reset(); } }catch(err){ a.className='form-alert form-alert--err show'; a.textContent='Impossible de joindre le serveur.'; } finally{ btn.disabled=false; btn.innerHTML=prev; }
});
async function loadSuiviForCivil(){
    var civilRaw = localStorage.getItem('pm_civil_session');
    var civil = null; try{ civil = civilRaw ? JSON.parse(civilRaw) : null; }catch(e){}
    var notLogged = document.getElementById('suivi-not-logged');
    var logged = document.getElementById('suivi-logged');
    var alertEl = document.getElementById('suivi-alert');
    if(!civil || !civil.email){
        if(notLogged) notLogged.style.display='block';
        if(logged) logged.style.display='none';
        document.getElementById('cand-login-block').style.display='block';
        document.getElementById('candidat-dossier-section').style.display='none';
        return;
    }
    // Logged in
    if(notLogged) notLogged.style.display='none';
    if(logged) { logged.style.display='block'; document.getElementById('suivi-user-email').textContent = civil.email; }
    // Try to load dossier via new endpoint that uses civil_email
    try{
        const res = await fetch('api/candidatures/mine?email='+encodeURIComponent(civil.email), {credentials:'same-origin'});
        const data = await res.json().catch(()=>({}));
        if(res.ok && data.candidature){
            document.getElementById('cand-login-block').style.display='none';
            document.getElementById('candidat-dossier-section').style.display='block';
            fillDossier(data.candidature);
            if(alertEl){ alertEl.className='form-alert form-alert--ok show'; alertEl.textContent='Dossier chargé pour '+civil.email; }
        } else {
            if(alertEl){ alertEl.className='form-alert'; alertEl.textContent='Aucune candidature trouvée pour '+civil.email+'. Déposez une candidature via le formulaire.'; }
            document.getElementById('cand-login-block').style.display='block';
            document.getElementById('candidat-dossier-section').style.display='none';
        }
    }catch(e){
        if(alertEl){ alertEl.className='form-alert form-alert--err show'; alertEl.textContent='Erreur de chargement.'; }
    }
}
document.getElementById('suivi-load-btn')?.addEventListener('click', loadSuiviForCivil);
document.addEventListener('DOMContentLoaded', ()=>{
    // Si on arrive sur la section suivi et qu'on est connecté, charger auto
    const origShowSection = window.showSection;
    window.showSection = function(name){
        origShowSection(name);
        if(name==='suivi') setTimeout(loadSuiviForCivil, 100);
    };
    // Also intercept civil login/logout to refresh
    const origUpdateCivilHeader = window.updateCivilHeader;
    if(origUpdateCivilHeader){
        window.updateCivilHeader = function(){
            origUpdateCivilHeader();
            if(document.getElementById('section-suivi')?.classList.contains('active')){
                loadSuiviForCivil();
            }
        };
    }
});
// Ancien formulaire caché, on le garde pour compatibilité mais il ne sert plus
document.getElementById('candidat-login-form').addEventListener('submit', async function(e){
    e.preventDefault();
    await loadSuiviForCivil();
});
function fillDossier(c){
    var statut=c.statut||'en_attente'; var el=document.getElementById('dossier-statut'); var labels={'en_attente':'En attente','etudiee':'En cours d\'étude','acceptee':'Acceptée','refusee':'Refusée'}; var colors={'en_attente':'#fef3c7;color:#92400e','etudiee':'#dbeafe;color:#1e40af','acceptee':'#dcfce7;color:#166534','refusee':'#fee2e2;color:#991b1b'};
    var col=colors[statut]||'background:#f1f5f9;color:#334155'; el.style.cssText='padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;'+col.replace(';',';'); el.textContent=labels[statut]||statut;
    document.getElementById('dossier-reference').textContent=c.reference||'—';
    document.getElementById('dossier-date').textContent=c.created_at?new Date(c.created_at).toLocaleDateString('fr-FR'):'—';
    document.getElementById('dossier-discord').textContent=c.discord||'—';
    document.getElementById('dossier-identite').textContent=(c.prenom||'')+' '+(c.nom||'');
    document.getElementById('dossier-age').textContent=c.age||'—';
    document.getElementById('dossier-dispos').textContent=c.disponibilites||'—';
    document.getElementById('dossier-exp').textContent=c.experience||'—';
    document.getElementById('dossier-motivation').textContent=c.motivation||'—';
    window.__candidatureId=c.id; refreshChatMessages();
}
document.getElementById('candidat-logout-btn').addEventListener('click', function(){
    document.getElementById('candidat-dossier-section').style.display='none';
    document.getElementById('cand-login-block').style.display='block';
    document.getElementById('candidat-login-form').reset();
    document.getElementById('suivi-alert').className='form-alert';
    window.__candidatureId=null;
});
async function refreshChatMessages(){
    var id=window.__candidatureId; if(!id) return; var list=document.getElementById('recrut-chat-list');
    try{ var res=await fetch('api/recrutement-messages/as-candidat',{credentials:'same-origin'}); var data=await res.json().catch(function(){return {};}); if(!res.ok||!Array.isArray(data.messages)){ list.innerHTML='<div style="text-align:center;color:#94a3b8;font-size:13px;padding:16px;">Impossible de charger les messages.</div>'; return; } if(!data.messages.length){ list.innerHTML='<div style="text-align:center;color:#94a3b8;font-size:13px;padding:16px;">Aucun message pour le moment.</div>'; return; } list.innerHTML=data.messages.map(function(m){ var cls=m.author_type==='direction'?'background:#eff6ff;border-left:3px solid #2563eb':'background:#fef3c7;border-left:3px solid #f59e0b'; var who=m.author_type==='direction'?'Direction':'Vous'; var date=m.created_at?new Date(m.created_at).toLocaleString('fr-FR'):''; return '<div style="padding:10px 12px;border-radius:8px;margin-bottom:8px;font-size:13.5px;'+cls+'"><div style="font-size:11px;color:#64748b;margin-bottom:3px;">'+who+' • '+date+'</div><div>'+m.body.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')+'</div></div>';}).join(''); list.scrollTop=list.scrollHeight; }catch(e){ list.innerHTML='<div style="text-align:center;color:#94a3b8;font-size:13px;padding:16px;">Erreur de chargement.</div>'; }
}
document.getElementById('recrut-chat-send').addEventListener('click', async function(){
    var id=window.__candidatureId; var msg=document.getElementById('recrut-chat-input').value.trim(); if(!id||!msg) return; this.disabled=true;
    try{ var res=await fetch('api/recrutement-messages/as-candidat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify({text:msg})}); if(res.ok){ document.getElementById('recrut-chat-input').value=''; await refreshChatMessages(); } }catch(e){} this.disabled=false;
});
document.getElementById('recrut-chat-refresh').addEventListener('click', function(){ refreshChatMessages(); });
document.getElementById('integ-code-btn').addEventListener('click', async function(){
    var code=document.getElementById('integ-code-input').value.trim().toUpperCase(); var a=document.getElementById('integ-alert'); a.className='form-alert'; a.textContent='';
    if(!code){ a.className='form-alert form-alert--err show'; a.textContent='Veuillez saisir votre code d\'intégration.'; return; }
    this.disabled=true; var prev=this.innerHTML; this.innerHTML='<i class="fas fa-spinner fa-spin"></i> Vérification…';
    try{ var res=await fetch('api/integration/validate-code',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify({code:code})}); var data=await res.json().catch(function(){return {};}); if(!res.ok||!data.ok){ a.className='form-alert form-alert--err show'; a.textContent=data.error||'Code invalide ou déjà utilisé.'; } else { a.className='form-alert form-alert--ok show'; a.textContent='✓ Code validé ! Remplissez le formulaire ci-dessous.'; document.getElementById('integ-code-hidden').value=code; document.getElementById('integ-code-step').style.display='none'; document.getElementById('integ-form-step').style.display='block'; } }catch(e){ a.className='form-alert form-alert--err show'; a.textContent='Impossible de joindre le serveur.'; } finally{ this.disabled=false; this.innerHTML=prev; }
});
document.getElementById('integration-form').addEventListener('submit', async function(e){
    e.preventDefault(); var a=document.getElementById('integ-alert');
    var body={ code:document.getElementById('integ-code-hidden').value, nom:document.getElementById('integ-nom').value.trim(), prenom:document.getElementById('integ-prenom').value.trim(), discord:document.getElementById('integ-discord').value.trim(), age:document.getElementById('integ-age').value.trim(), motivation:document.getElementById('integ-motivation').value.trim(), experience:document.getElementById('integ-experience').value.trim(), disponibilites:document.getElementById('integ-disponibilites').value.trim() };
    var btn=this.querySelector('button[type="submit"]'); btn.disabled=true; var prev=btn.innerHTML; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Envoi…';
    try{ var res=await fetch('api/integration/submit',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(body)}); var data=await res.json().catch(function(){return {};}); if(!res.ok){ a.className='form-alert form-alert--err show'; a.textContent=data.error||'Erreur lors de l\'envoi.'; } else { a.className='form-alert form-alert--ok show'; a.textContent='✓ Formulaire envoyé avec succès ! La Direction reviendra vers vous très prochainement.'; this.reset(); document.getElementById('integ-form-step').style.display='none'; } }catch(e){ a.className='form-alert form-alert--err show'; a.textContent='Impossible de joindre le serveur.'; } finally{ btn.disabled=false; btn.innerHTML=prev; }
});
</script>
<script src="assets/js/auth.js"></script>
</body>
</html>
