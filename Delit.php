<?php
declare(strict_types=1);

$delits = [
    // Forces de l'ordre — contrôle, identification
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Refus d\'obtempérer', 'article' => 'L233-1', 'amende' => '5 000 EUR', 'points' => '6', 'detention' => 'Oui'],
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Refus de se soumettre à un contrôle d\'un agent dépositaire d\'une autorité publique', 'article' => 'L233-2', 'amende' => '4 000 EUR', 'points' => '4', 'detention' => 'Oui'],
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Refus d\'identité à un agent dépositaire d\'une autorité publique', 'article' => '78-3 CPP', 'amende' => '2 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Outrage sur un agent dépositaire d\'une autorité publique', 'article' => '433-5 CP', 'amende' => '1 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Rébellion contre un agent dépositaire d\'une autorité publique', 'article' => '433-6 CP', 'amende' => '7 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Agent / autorité publique', 'delit' => 'Violence volontaire à l\'encontre d\'un agent dépositaire d\'une autorité publique', 'article' => '209 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Mission d\'intérêt général', 'delit' => 'Obstruction à une intervention d\'intérêt général', 'article' => '431-3 CP', 'amende' => '4 000 EUR', 'points' => '4', 'detention' => 'Oui'],
    ['categorie' => 'Mission d\'intérêt général', 'delit' => 'Dégradation volontaire sur un bien public servant une mission d\'intérêt général', 'article' => '322-1 CP', 'amende' => '1 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Routier', 'delit' => 'Refus de se soumettre à un dépistage de l\'alcoolémie', 'article' => 'L234-8', 'amende' => '2 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Routier', 'delit' => 'Conduite d\'un véhicule sans assurance', 'article' => 'R221 CR', 'amende' => '3 750 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Routier', 'delit' => 'Refus de se soumettre à un dépistage de stupéfiants', 'article' => 'L235-3', 'amende' => '2 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    // Stupéfiants
    ['categorie' => 'Stupéfiants', 'delit' => 'Possession de produits stupéfiants', 'article' => 'L3421-1', 'amende' => '20 000 EUR + 300 EUR/pochon (AFD)', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Stupéfiants', 'delit' => 'Vente de matière stupéfiante', 'article' => '222-37 CP', 'amende' => '30 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Stupéfiants', 'delit' => 'Transport de matière stupéfiante en quantité importante (> 500 pochons)', 'article' => '222-37 CP', 'amende' => '35 000 EUR', 'points' => '6', 'detention' => 'Oui'],
    // Dégradations
    ['categorie' => 'Dégradation', 'delit' => 'Dégradation volontaire d\'un bien public ou appartenant au domaine public', 'article' => '322-1 et 322-3-1 CP', 'amende' => '1 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Dégradation', 'delit' => 'Dégradation involontaire d\'un bien public ou privé', 'article' => 'R625-3', 'amende' => '2 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Dégradation', 'delit' => 'Dégradation volontaire d\'un bien privé', 'article' => '322-1 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    // Menaces
    ['categorie' => 'Menaces', 'delit' => 'Menace de mort réitérée', 'article' => '222-17 CP', 'amende' => '7 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Menaces', 'delit' => 'Menace d\'attenter à l\'intégrité physique d\'un agent administratif ou personnel soignant', 'article' => '222-17 CP', 'amende' => '7 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Menaces', 'delit' => 'Menace de crime sur une personne', 'article' => '222-18 CP', 'amende' => '7 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Menaces', 'delit' => 'Menace ou intimidation sur une victime', 'article' => '222-17 et 222-18 CP', 'amende' => '7 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Menaces', 'delit' => 'Menace de délit', 'article' => '222-17 CP', 'amende' => '7 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    // Violences
    ['categorie' => 'Violences', 'delit' => 'Violence volontaire', 'article' => '222-7 à 222-16-3 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence sur conjoint', 'article' => '222-7 à 222-16-4 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence avec arme de catégorie D', 'article' => '222-7 à 222-13 CP', 'amende' => '10 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence sur un personnel soignant', 'article' => '222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence sous empire d\'un état d\'alcoolémie', 'article' => '222-7 à 222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence avec arme par destination', 'article' => '222-7 à 222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence volontaire en réunion', 'article' => '222-7 à 222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence volontaire sous stupéfiants', 'article' => '222-7 à 222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violences', 'delit' => 'Violence volontaire sur un élu d\'État', 'article' => '222-7 à 222-13 CP', 'amende' => '6 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    // Personne — identité, honneur
    ['categorie' => 'Personne', 'delit' => 'Usurpation d\'identité', 'article' => '226-4-1 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Personne', 'delit' => 'Faux et usage de faux documents', 'article' => '441-1 à 441-12 CP', 'amende' => '7 500 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Personne', 'delit' => 'Diffamation', 'article' => '29', 'amende' => '2 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Personne', 'delit' => 'Outrage à un agent d\'État ou personnel soignant', 'article' => '433-5 CP', 'amende' => '3 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Personne', 'delit' => 'Discrimination', 'article' => '225-1 à 225-4 CP', 'amende' => '4 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    // Vol
    ['categorie' => 'Vol', 'delit' => 'Vol', 'article' => '311-1 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Vol', 'delit' => 'Vol avec violence', 'article' => '311-1 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Vol', 'delit' => 'Recel de vol', 'article' => '311-1 CP', 'amende' => '2 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    // Moral
    ['categorie' => 'Moral', 'delit' => 'Abus de faiblesse', 'article' => '223-15-2 CP', 'amende' => '2 000 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Moral', 'delit' => 'Filouterie', 'article' => '313-5 CP', 'amende' => '3 500 EUR', 'points' => '—', 'detention' => 'Possible'],
    ['categorie' => 'Moral', 'delit' => 'Délit de fuite', 'article' => 'L231-1', 'amende' => '7 500 EUR', 'points' => '4', 'detention' => 'Oui'],
    ['categorie' => 'Moral', 'delit' => 'Abus de confiance', 'article' => '314-1 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    // Violations
    ['categorie' => 'Violation', 'delit' => 'Violation d\'une zone à entrée restreinte', 'article' => '413-7 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violation', 'delit' => 'Violation de domicile', 'article' => '226-4 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
    ['categorie' => 'Violation', 'delit' => 'Violation d\'une zone militaire ou de sécurité publique', 'article' => '413-5 à 413-7 CP', 'amende' => '5 000 EUR', 'points' => '—', 'detention' => 'Oui'],
];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delits - Code Penal / CSI</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        body { background: #f5f7fa; padding: 16px; }
        .cp-wrap { max-width: 1200px; margin: 0 auto; }
        .cp-card { background: #fff; border: 1px solid #d8dde4; border-radius: 10px; box-shadow: 0 6px 22px rgba(0,0,0,.06); overflow: hidden; }
        .cp-head { padding: 16px 20px; background: #8a1c1c; color: #fff; }
        .cp-head h1 { margin: 0; font-size: 20px; }
        .cp-head p { margin: 6px 0 0; opacity: .9; font-size: 13px; }
        .cp-tools { padding: 14px 20px; border-bottom: 1px solid #eef1f5; display: flex; gap: 10px; align-items: center; }
        .cp-tools input { max-width: 340px; }
        .cp-table-wrap { overflow: auto; max-height: 70vh; }
        .cp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .cp-table th, .cp-table td { padding: 10px 12px; border-bottom: 1px solid #edf0f4; text-align: left; }
        .cp-table thead th { position: sticky; top: 0; background: #f8fafc; color: #8a1c1c; z-index: 1; }
        .cp-badge { display: inline-block; font-size: 12px; padding: 4px 8px; border-radius: 999px; background: #ffe8e8; color: #8a1c1c; }
        .cp-col-sel { width: 40px; text-align: center; vertical-align: middle; }
        .cp-col-sel input { width: auto; margin: 0; cursor: pointer; }
        tr.cp-row-selected { background: #fff8f0; }
        .cp-calc { margin: 0 20px 14px; padding: 14px 16px; border: 1px solid #e8c9c9; border-radius: 8px; background: #fffdfb; }
        .cp-calc-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .cp-calc-title { font-weight: 700; color: #8a1c1c; font-size: 14px; }
        .cp-calc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-btn { padding: 8px 12px; border-radius: 6px; border: 1px solid #c9a0a0; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #6b1f1f; }
        .cp-btn:hover { background: #ffe8e8; }
        .cp-btn-ghost { border-color: #dcdcdc; color: #444; }
        .cp-calc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 18px; font-size: 13px; color: #333; }
        .cp-calc-grid strong { color: #111; }
        .cp-calc-disclaimer, .cp-calc-notes { margin: 10px 0 0; font-size: 11px; color: #666; line-height: 1.35; }
        .cp-calc-notes { margin-top: 6px; font-style: italic; }
        .cp-calc-extras { display: flex; flex-wrap: wrap; gap: 16px 24px; align-items: flex-end; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e0c4c4; font-size: 13px; }
        .cp-calc-extras label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; color: #444; }
        .cp-calc-extras input[type="number"] { max-width: 100px; padding: 8px 10px; border-radius: 6px; border: 1px solid #cfcfcf; font-size: 14px; }
        .cp-amende-detail { margin-top: 8px; font-size: 12px; color: #555; line-height: 1.45; }
    </style>
</head>
<body>
    <div class="cp-wrap">
        <section class="cp-card">
            <header class="cp-head">
                <h1>Delits</h1>
                <p>Referentiel synthetique Code Penal / CSI - version locale</p>
            </header>
            <div class="cp-tools">
                <label for="search">Recherche :</label>
                <input id="search" type="text" placeholder="Article, categorie, delit...">
            </div>
            <div class="cp-calc" id="cp-calc-bar">
                <div class="cp-calc-head">
                    <span class="cp-calc-title">Tableur — sélection et totaux automatiques</span>
                    <div class="cp-calc-actions">
                        <button type="button" class="cp-btn" id="cp-calc-select-visible">Cocher lignes visibles</button>
                        <button type="button" class="cp-btn cp-btn-ghost" id="cp-calc-clear">Tout décocher</button>
                    </div>
                </div>
                <div class="cp-calc-grid">
                    <div>Lignes sélectionnées : <strong id="cp-calc-count">0</strong></div>
                    <div>Total amendes (estim.) : <strong id="cp-total-amende">—</strong></div>
                    <div>Total points (permis) : <strong id="cp-total-points">—</strong></div>
                    <div>Détention (récap.) : <strong id="cp-total-detention">—</strong></div>
                </div>
                <div class="cp-calc-extras">
                    <label for="cp-pochons">Pochons (AFD) × 300 EUR
                        <input type="number" id="cp-pochons" min="0" step="1" placeholder="0" title="Ajout au total lorsque la saisie est utilisée pour la ligne possession (réf.)">
                    </label>
                    <label for="cp-supplement">Supplément manuel (EUR)
                        <input type="number" id="cp-supplement" min="0" step="50" placeholder="0" title="Majoration ou autre montant à ajouter au total amendes">
                    </label>
                </div>
                <p id="cp-amende-detail" class="cp-amende-detail" aria-live="polite"></p>
                <p class="cp-calc-disclaimer">Total amendes déduit du libellé du référentiel (approximation — vérifier les cas à majorations ou fourchettes).</p>
                <p class="cp-calc-notes" id="cp-calc-notes"></p>
            </div>
            <div class="cp-table-wrap">
                <table class="cp-table" id="delits-table">
                    <thead>
                        <tr>
                            <th class="cp-col-sel"><input type="checkbox" id="cp-master" title="Tout cocher (lignes visibles)"></th>
                            <th>Categorie</th>
                            <th>Delit</th>
                            <th>Article</th>
                            <th>Amende</th>
                            <th>Points</th>
                            <th>Détention</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($delits as $item): ?>
                        <tr
                            data-cp-amende="<?php echo htmlspecialchars($item['amende'], ENT_QUOTES, 'UTF-8'); ?>"
                            data-cp-points="<?php echo htmlspecialchars($item['points'], ENT_QUOTES, 'UTF-8'); ?>"
                            data-cp-detention="<?php echo htmlspecialchars($item['detention'], ENT_QUOTES, 'UTF-8'); ?>"
                        >
                            <td class="cp-col-sel"><input type="checkbox" class="cp-row-sel"></td>
                            <td><span class="cp-badge"><?php echo htmlspecialchars($item['categorie'], ENT_QUOTES, 'UTF-8'); ?></span></td>
                            <td><?php echo htmlspecialchars($item['delit'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['article'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['amende'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['points'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['detention'], ENT_QUOTES, 'UTF-8'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
    <script src="assets/js/codepenal-calc.js"></script>
    <script>
        initCodePenalCalculator({ table: '#delits-table', mode: 'delit' });
    </script>
</body>
</html>
