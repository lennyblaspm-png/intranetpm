<?php
declare(strict_types=1);

$poleGet = isset($_GET['pole']) ? strtoupper(trim((string) $_GET['pole'])) : '';
$poleFormValue = 'PM';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candidature — Police Municipale</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --pm-pub-bg: #0a0e1a; --pm-pub-card: #111827; --pm-pub-border: #1e293b; --pm-pub-accent: #3b82f6; --pm-pub-text: #e2e8f0; --pm-pub-muted: #94a3b8; }
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
        .candidature-alert--ok { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .candidature-alert--err { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .candidature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .candidature-field { margin-bottom: 16px; }
        .candidature-field--full { grid-column: 1 / -1; }
        .candidature-field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--pm-pub-muted); }
        .candidature-field input, .candidature-field textarea, .candidature-field select { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--pm-pub-border); background: #0f172a; color: var(--pm-pub-text); font-size: 14px; font-family: inherit; }
        .candidature-field input:focus, .candidature-field textarea:focus { outline: none; border-color: var(--pm-pub-accent); }
        .candidature-submit { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; border: none; background: var(--pm-pub-accent); color: #fff; cursor: pointer; }
        .candidature-submit:hover { background: #2563eb; }
        .candidature-meta { margin-top: 16px; font-size: 13px; color: var(--pm-pub-muted); }
        .candidature-link { color: var(--pm-pub-accent); text-decoration: none; }
        .candidature-link:hover { text-decoration: underline; }
        .pub-footer { text-align: center; padding: 24px; border-top: 1px solid var(--pm-pub-border); font-size: 12px; color: var(--pm-pub-muted); }
        @media (max-width: 768px) { .candidature-grid { grid-template-columns: 1fr; } .pub-nav { flex-wrap: wrap; height: auto; padding: 12px 16px; } .pub-nav-mobile-toggle { display: block; } .pub-nav-links { display: none; width: 100%; flex-direction: column; padding-top: 12px; } .pub-nav-links.open { display: flex; } }
    </style>
</head>
<body class="pub-page">
<nav class="pub-nav">
    <a href="index.php" class="pub-nav-brand"><img src="assets/logo.png" alt="Logo PM"><span>Police Municipale</span></a>
    <button class="pub-nav-mobile-toggle" onclick="document.querySelector('.pub-nav-links').classList.toggle('open')"><i class="fas fa-bars"></i></button>
    <ul class="pub-nav-links">
        <li><a href="index.php"><i class="fas fa-home"></i> Accueil</a></li>
        <li><a href="index.php#organigramme"><i class="fas fa-sitemap"></i> Organigramme</a></li>
        <li><a href="candidature.php" class="active"><i class="fas fa-file-pen"></i> Candidater</a></li>
        <li><a href="espace-candidat.php"><i class="fas fa-clipboard-check"></i> Suivre mon recrutement</a></li>
        <li><a href="index.php#cycle"><i class="fas fa-sync"></i> Cycle de Recrutement</a></li>
        <li><a href="index.php#integration"><i class="fas fa-clipboard-list"></i> Formulaire d'intégration</a></li>
        <li><a href="dashboard.php" class="pub-nav-cta"><i class="fas fa-shield-halved"></i> Espace Agent</a></li>
    </ul>
</nav>

<div class="candidature-shell">
    <div class="candidature-card">
        <p class="candidature-kicker">RECRUTEMENT POLICE MUNICIPALE</p>
        <h1 class="candidature-title">Déposer une candidature</h1>
        <p class="candidature-lead">
            Remplissez ce formulaire. Votre candidature sera envoyée au recrutement et vous pourrez ensuite suivre votre dossier depuis votre espace candidat.
        </p>

        <div id="candidature-alert" class="candidature-alert" role="status" hidden></div>

        <form id="candidature-form" novalidate>
            <div class="candidature-grid">
                <div class="candidature-field">
                    <label for="discord">Pseudo Discord</label>
                    <input id="discord" name="discord" type="text" autocomplete="username" placeholder="Ex : lenny_blas" required maxlength="80">
                </div>
                <div class="candidature-field">
                    <label for="nom">Nom</label>
                    <input id="nom" name="nom" type="text" autocomplete="family-name" placeholder="Nom" required maxlength="120">
                </div>
                <div class="candidature-field">
                    <label for="prenom">Prénom</label>
                    <input id="prenom" name="prenom" type="text" autocomplete="given-name" placeholder="Prénom" required maxlength="120">
                </div>
                <div class="candidature-field">
                    <label for="age">Âge</label>
                    <input id="age" name="age" type="text" inputmode="numeric" autocomplete="off" placeholder="Âge" required maxlength="10">
                </div>
            </div>

            <input type="hidden" id="pole" name="pole" value="<?php echo htmlspecialchars($poleFormValue, ENT_QUOTES, 'UTF-8'); ?>">

            <div class="candidature-field candidature-field--full">
                <label for="disponibilites">Disponibilités</label>
                <input id="disponibilites" name="disponibilites" type="text" placeholder="Ex : soirs et week-ends" required maxlength="4000">
            </div>
            <div class="candidature-field candidature-field--full">
                <label for="experience">Expérience</label>
                <textarea id="experience" name="experience" rows="5" placeholder="Décrivez votre expérience…" required maxlength="12000"></textarea>
            </div>
            <div class="candidature-field candidature-field--full">
                <label for="motivation">Motivation</label>
                <textarea id="motivation" name="motivation" rows="5" placeholder="Expliquez votre motivation…" required maxlength="12000"></textarea>
            </div>
            <div id="candidature-account-notice" style="margin: 16px 0; padding:12px; border-radius:8px; background:#fffbeb; border:1px solid #fcd34d; color:#92400e; font-size:13px; display:none;"><i class="fas fa-exclamation-triangle"></i> Vous devez <a href="index.php" style="color:#2563eb; font-weight:700; text-decoration:underline;">créer un compte</a> et être connecté pour postuler.</div>

            <div class="candidature-actions">
                <button type="submit" class="candidature-submit">Envoyer la candidature</button>
                <p class="candidature-meta">
                    <a class="candidature-link" href="espace-candidat.php">Accéder à l'espace candidat</a> ·
                    <a class="candidature-link" href="index.php">Retour accueil</a>
                </p>
            </div>
        </form>
    </div>
</div>
<footer class="pub-footer">&copy; 2026 Police Municipale — Tous droits réservés</footer>
<script src="assets/js/candidatures.js"></script>
</body>
</html>
