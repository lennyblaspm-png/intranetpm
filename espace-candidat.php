<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Espace candidat — Police Municipale</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --pm-pub-bg: #0a0e1a; --pm-pub-card: #111827; --pm-pub-border: #1e293b; --pm-pub-accent: #3b82f6; --pm-pub-accent2: #f59e0b; --pm-pub-text: #e2e8f0; --pm-pub-muted: #94a3b8; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body.pub-page { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--pm-pub-bg); color: var(--pm-pub-text); min-height: 100vh; }
        .pub-nav { position: sticky; top: 0; z-index: 100; background: rgba(10,14,26,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--pm-pub-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 60px; }
        .pub-nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 16px; color: var(--pm-pub-accent); text-decoration: none; }
        .pub-nav-brand img { height: 36px; }
        .pub-nav-links { display: flex; gap: 4px; list-style: none; }
        .pub-nav-links a { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; color: var(--pm-pub-muted); text-decoration: none; font-size: 13.5px; font-weight: 600; transition: all .2s; white-space: nowrap; }
        .pub-nav-links a:hover, .pub-nav-links a.active { background: rgba(59,130,246,0.12); color: var(--pm-pub-accent); }
        .pub-nav-links a.pub-nav-cta { background: var(--pm-pub-accent); color: #fff; padding: 8px 20px; }
        .pub-nav-links a.pub-nav-cta:hover { background: #2563eb; }
        .pub-nav-mobile-toggle { display: none; background: none; border: none; color: var(--pm-pub-text); font-size: 22px; cursor: pointer; }
        .candidature-shell { max-width: 700px; margin: 40px auto; padding: 0 24px 60px; }
        .candidature-card { background: var(--pm-pub-card); border: 1px solid var(--pm-pub-border); border-radius: 14px; padding: 32px; }
        .candidature-kicker { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pm-pub-accent); margin-bottom: 8px; }
        .candidature-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
        .candidature-lead { font-size: 14px; color: var(--pm-pub-muted); margin-bottom: 24px; line-height: 1.5; }
        .candidature-alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
        .candidature-alert--ok { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); display: block; }
        .candidature-alert--err { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); display: block; }
        .candidature-field { margin-bottom: 16px; }
        .candidature-field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--pm-pub-muted); }
        .candidature-field input, .candidature-field textarea { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--pm-pub-border); background: #0f172a; color: var(--pm-pub-text); font-size: 14px; font-family: inherit; }
        .candidature-field input:focus, .candidature-field textarea:focus { outline: none; border-color: var(--pm-pub-accent); }
        .candidature-submit { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; border: none; background: var(--pm-pub-accent); color: #fff; cursor: pointer; }
        .candidature-submit:hover { background: #2563eb; }
        .candidature-btn-secondary { padding: 10px 20px; border-radius: 8px; border: 1px solid var(--pm-pub-border); background: transparent; color: var(--pm-pub-text); font-size: 13px; font-weight: 600; cursor: pointer; }
        .candidature-btn-secondary:hover { background: rgba(255,255,255,0.05); }
        .candidature-meta { margin-top: 16px; font-size: 13px; color: var(--pm-pub-muted); text-align: center; }
        .candidature-link { color: var(--pm-pub-accent); text-decoration: none; }
        .candidature-link:hover { text-decoration: underline; }
        .candidat-dossier-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
        .candidat-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; }
        .candidat-badge--pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .candidat-badge--ok { background: rgba(34,197,94,0.15); color: #22c55e; }
        .candidat-badge--no { background: rgba(239,68,68,0.15); color: #ef4444; }
        .candidat-dossier-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .candidat-dossier-grid dt { font-size: 12px; color: var(--pm-pub-muted); margin-bottom: 2px; }
        .candidat-dossier-grid dd { font-size: 14px; font-weight: 600; }
        .candidat-dossier-rowspan { grid-column: 1 / -1; }
        .recrut-messaging { background: rgba(255,255,255,0.03); border: 1px solid var(--pm-pub-border); border-radius: 10px; padding: 20px; }
        .recrut-messaging-title { font-size: 16px; margin-bottom: 6px; }
        .recrut-messaging-intro { font-size: 13px; color: var(--pm-pub-muted); margin-bottom: 12px; }
        .recrut-chat-list { max-height: 300px; overflow-y: auto; margin-bottom: 12px; }
        .recrut-msg { padding: 12px; border-radius: 8px; margin-bottom: 8px; }
        .recrut-msg--direction { background: rgba(59,130,246,0.08); border-left: 3px solid var(--pm-pub-accent); }
        .recrut-msg--candidate { background: rgba(245,158,11,0.08); border-left: 3px solid var(--pm-pub-accent2); }
        .recrut-msg-meta { font-size: 11px; color: var(--pm-pub-muted); margin-bottom: 4px; }
        .recrut-msg-body { font-size: 13.5px; white-space: pre-wrap; }
        .recrut-chat-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--pm-pub-muted); }
        .recrut-chat-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--pm-pub-border); background: #0f172a; color: var(--pm-pub-text); font-size: 14px; font-family: inherit; resize: vertical; }
        .recrut-chat-input:focus { outline: none; border-color: var(--pm-pub-accent); }
        .recrut-chat-actions { display: flex; gap: 8px; margin-top: 8px; }
        .recrut-chat-empty { text-align: center; color: var(--pm-pub-muted); font-size: 13px; padding: 20px; }
        .pub-footer { text-align: center; padding: 24px; border-top: 1px solid var(--pm-pub-border); font-size: 12px; color: var(--pm-pub-muted); }
        @media (max-width: 768px) { .candidat-dossier-grid { grid-template-columns: 1fr; } .pub-nav { flex-wrap: wrap; height: auto; padding: 12px 16px; } .pub-nav-mobile-toggle { display: block; } .pub-nav-links { display: none; width: 100%; flex-direction: column; padding-top: 12px; } .pub-nav-links.open { display: flex; } }
    </style>
</head>
<body class="pub-page">
<nav class="pub-nav">
    <a href="index.php" class="pub-nav-brand"><img src="assets/logo.png" alt="Logo PM"><span>Police Municipale</span></a>
    <button class="pub-nav-mobile-toggle" onclick="document.querySelector('.pub-nav-links').classList.toggle('open')"><i class="fas fa-bars"></i></button>
    <ul class="pub-nav-links">
        <li><a href="index.php"><i class="fas fa-home"></i> Accueil</a></li>
        <li><a href="index.php#organigramme"><i class="fas fa-sitemap"></i> Organigramme</a></li>
        <li><a href="candidature.php"><i class="fas fa-file-pen"></i> Candidater</a></li>
        <li><a href="espace-candidat.php" class="active"><i class="fas fa-clipboard-check"></i> Suivre mon recrutement</a></li>
        <li><a href="index.php#cycle"><i class="fas fa-sync"></i> Cycle de Recrutement</a></li>
        <li><a href="index.php#integration"><i class="fas fa-clipboard-list"></i> Formulaire d'intégration</a></li>
        <li><a href="dashboard.php" class="pub-nav-cta"><i class="fas fa-shield-halved"></i> Espace Agent</a></li>
    </ul>
</nav>

<div class="candidature-shell">
    <div class="candidature-card">
        <p class="candidature-kicker">Espace candidat</p>
        <h1 class="candidature-title">Suivre votre dossier</h1>
        <p class="candidature-lead">
            Votre compte est utilisé pour suivre votre candidature et communiquer avec les recruteurs — plus besoin de mot de passe séparé.
        </p>

        <div id="candidature-alert" class="candidature-alert" role="status" hidden></div>

        <section id="candidat-login-section">
            <div id="espace-civil-not-logged" style="display:none; text-align:center; padding:20px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:10px; margin-bottom:16px;">
                <p style="font-size:13px; color:#92400e; margin-bottom:12px;"><i class="fas fa-exclamation-triangle"></i> Vous devez être connecté avec votre compte pour suivre votre dossier.</p>
                <a href="index.php" class="candidature-submit" style="text-decoration:none; display:inline-flex;"><i class="fas fa-user"></i> Se connecter / Créer un compte</a>
            </div>
            <div id="espace-civil-logged" style="display:none; text-align:center; padding:16px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3); border-radius:10px; margin-bottom:16px;">
                <p style="font-size:13px; color:#166534;"><i class="fas fa-check-circle"></i> Connecté en tant que <b id="espace-civil-email"></b> — chargement de votre dossier…</p>
            </div>
            <form id="candidat-login-form" novalidate style="display:none;">
                <input type="hidden" id="login-discord"><input type="hidden" id="login-password">
            </form>
        </section>

        <section id="candidat-dossier-section" hidden>
            <div class="candidat-dossier-head">
                <span id="dossier-statut" class="candidat-badge">—</span>
                <button type="button" id="candidat-logout-btn" class="candidature-btn-secondary">Se déconnecter</button>
            </div>
            <dl class="candidat-dossier-grid">
                <div><dt>Référence</dt><dd id="dossier-reference">—</dd></div>
                <div><dt>Dépôt</dt><dd id="dossier-date">—</dd></div>
                <div><dt>Discord</dt><dd id="dossier-discord">—</dd></div>
                <div><dt>Identité</dt><dd id="dossier-identite">—</dd></div>
                <div><dt>Âge</dt><dd id="dossier-age">—</dd></div>
                <div class="candidat-dossier-rowspan"><dt>Disponibilités</dt><dd id="dossier-dispos">—</dd></div>
                <div class="candidat-dossier-rowspan"><dt>Expérience</dt><dd id="dossier-exp">—</dd></div>
                <div class="candidat-dossier-rowspan"><dt>Motivation</dt><dd id="dossier-motivation">—</dd></div>
            </dl>

            <div class="recrut-messaging" id="recrut-messaging-block">
                <h3 class="recrut-messaging-title"><i class="fas fa-comments" style="color:var(--pm-pub-accent);"></i> Messagerie recrutement</h3>
                <p class="recrut-messaging-intro">Dialoguez avec la Direction au sujet de votre candidature (questions, précisions…).</p>
                <div id="recrut-chat-list" class="recrut-chat-list" aria-live="polite"></div>
                <label for="recrut-chat-input" class="recrut-chat-label">Votre message</label>
                <textarea id="recrut-chat-input" class="recrut-chat-input" rows="3" maxlength="6000" placeholder="Écrire à la Direction recrutement…"></textarea>
                <div class="recrut-chat-actions">
                    <button type="button" id="recrut-chat-send" class="candidature-submit recrut-chat-btn-send">Envoyer</button>
                    <button type="button" id="recrut-chat-refresh" class="candidature-btn-secondary recrut-chat-btn-refresh">Actualiser</button>
                </div>
            </div>
        </section>

        <p class="candidature-meta">
            <a class="candidature-link" href="candidature.php">Déposer une candidature</a> ·
            <a class="candidature-link" href="index.php">Retour accueil</a>
        </p>
    </div>
</div>
<footer class="pub-footer">&copy; 2026 Police Municipale — Tous droits réservés</footer>
<script src="assets/js/candidatures.js"></script>
</body>
</html>
