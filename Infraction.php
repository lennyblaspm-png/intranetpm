<?php
declare(strict_types=1);

$infractions = [
    // Circulation — vitesse
    ['categorie' => 'Circulation', 'infraction' => 'Conduite d\'un véhicule à une vitesse excessive eu égard aux circonstances', 'article' => 'R413-17', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse par un conducteur de véhicule sans moteur', 'article' => 'R413-17', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Circulation', 'infraction' => 'Conduite d\'un véhicule ou engin à une vitesse excédant l\'allure du pas sur un trottoir', 'article' => 'R412-34', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse d\'au moins 20 km/h et inférieur à 30 km/h par un conducteur de véhicule à moteur', 'article' => 'R413-14', 'amende' => '135 EUR', 'points' => '2'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse d\'au moins 30 km/h et inférieur à 40 km/h par un conducteur de véhicule à moteur', 'article' => 'R413-14', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse d\'au moins 40 km/h et inférieur à 50 km/h par un conducteur de véhicule à moteur', 'article' => 'R413-14', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse inférieur à 20 km/h par un conducteur de véhicule à moteur', 'article' => 'R413-14', 'amende' => '68 EUR', 'points' => '1'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse supérieure à 40 km/h par un conducteur de véhicule à moteur', 'article' => 'R413-14', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Circulation', 'infraction' => 'Circulation d\'un véhicule en marche normale à une vitesse anormalement réduite', 'article' => 'R413-19', 'amende' => '35 EUR', 'points' => '0'],
    ['categorie' => 'Circulation', 'infraction' => 'Excès de vitesse inférieur à 20 km/h par un conducteur de véhicule à moteur — vitesse max. autorisée 50 km/h', 'article' => 'R413-14', 'amende' => '68 EUR', 'points' => '1'],
    // Permis — document
    ['categorie' => 'Permis', 'infraction' => 'Conduite d\'un véhicule sans permis', 'article' => 'L221-2', 'amende' => '15 000 EUR', 'points' => 'N/A'],
    ['categorie' => 'Permis', 'infraction' => 'Non présentation immédiate par le conducteur d\'un véhicule du permis de conduire', 'article' => 'R233-1', 'amende' => '11 EUR', 'points' => '0'],
    ['categorie' => 'Permis', 'infraction' => 'Non justification dans les 5 jours de la possession du permis de conduire', 'article' => 'R233-1', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Permis', 'infraction' => 'Conduite d\'un véhicule avec un permis de conduire d\'une catégorie n\'autorisant pas sa conduite', 'article' => 'L221-2', 'amende' => '15 000 EUR', 'points' => 'N/A'],
    // Signalisation
    ['categorie' => 'Signalisation', 'infraction' => 'Inobservation par un conducteur de véhicule de l\'arrêt imposé par un feu rouge', 'article' => 'R412-30', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Signalisation', 'infraction' => 'Inobservation par un conducteur de véhicule de l\'arrêt absolu imposé par le panneau STOP à une intersection de route', 'article' => 'R415-6', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Signalisation', 'infraction' => 'Refus de priorité à une intersection où l\'obligation de céder le passage est signalisée', 'article' => 'R415-7', 'amende' => '135 EUR', 'points' => '4'],
    // Stationnement / arrêt
    ['categorie' => 'Stationnement', 'infraction' => 'Arrêt d\'un véhicule très gênant pour la circulation publique', 'article' => 'R417-11', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Stationnement', 'infraction' => 'Arrêt dangereux de véhicule', 'article' => 'R417-9', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Stationnement', 'infraction' => 'Stationnement dangereux de véhicule', 'article' => 'R417-9', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Stationnement', 'infraction' => 'Stationnement gênant d\'un véhicule sur un trottoir', 'article' => 'R417-10', 'amende' => '35 EUR', 'points' => '0'],
    ['categorie' => 'Stationnement', 'infraction' => 'Stationnement gênant', 'article' => 'R417-10', 'amende' => '35 EUR', 'points' => '0'],
    // Conduite
    ['categorie' => 'Conduite', 'infraction' => 'Circulation de véhicule en sens interdit', 'article' => 'R412-28', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Conduite', 'infraction' => 'Circulation sur la bande d\'arrêt d\'urgence', 'article' => 'R412-8', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Conduite', 'infraction' => 'Circulation de véhicule en contresens', 'article' => 'R412-28', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Conduite', 'infraction' => 'Dépassement de véhicule par la droite', 'article' => 'R414-6', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Conduite', 'infraction' => 'Franchissement d\'une ligne continue par le conducteur d\'un véhicule', 'article' => 'R412-19', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Conduite', 'infraction' => 'Conduite sous empire d\'un état alcoolémique', 'article' => 'L234-1', 'amende' => '4 500 EUR', 'points' => '4'],
    ['categorie' => 'Conduite', 'infraction' => 'Conduite sous stupéfiants', 'article' => 'L235-1', 'amende' => '4 500 EUR', 'points' => '6'],
    ['categorie' => 'Conduite', 'infraction' => 'Circulation de véhicule à moteur non muni de feu de croisement conforme', 'article' => 'R313-2', 'amende' => '68 EUR', 'points' => '2'],
    ['categorie' => 'Conduite', 'infraction' => 'Conduite d\'une motocyclette sans port d\'un casque homologué et attaché', 'article' => 'R431-1', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Conduite', 'infraction' => 'Conduite d\'un cyclomoteur sans port d\'un casque homologué et attaché', 'article' => 'R431-1', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Conduite', 'infraction' => 'Non port d\'un casque homologué et attaché par passager d\'une motocyclette', 'article' => 'R431-1', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Conduite', 'infraction' => 'Non port d\'un casque homologué et attaché par passager d\'un cyclomoteur', 'article' => 'R431-1', 'amende' => '135 EUR', 'points' => '3'],
    // Véhicule
    ['categorie' => 'Véhicule', 'infraction' => 'Circulation d\'un véhicule à moteur équipé ou orné d\'élément extérieur saillant, tranchant ou pointu', 'article' => 'R317-23', 'amende' => '68 EUR', 'points' => '3'],
    ['categorie' => 'Véhicule', 'infraction' => 'Circulation d\'un véhicule à moteur fortement endommagé', 'article' => 'R323-1', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Véhicule', 'infraction' => 'Conduite d\'un véhicule à moteur non homologué pour la circulation publique', 'article' => 'R321-4', 'amende' => '135 EUR', 'points' => '3'],
    ['categorie' => 'Véhicule', 'infraction' => 'Usage abusif de jour de l\'avertissement sonore d\'un véhicule', 'article' => 'R416-1', 'amende' => '35 EUR', 'points' => '2'],
    ['categorie' => 'Véhicule', 'infraction' => 'Circulation d\'un véhicule à moteur ne permettant pas la visibilité du conducteur ou passager', 'article' => 'R316-3', 'amende' => '68 EUR', 'points' => '2'],
    // Priorité
    ['categorie' => 'Priorité', 'infraction' => 'Refus de faciliter le dépassement d\'un véhicule d\'intérêt général usant signaux spéciaux', 'article' => 'R414-17', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Priorité', 'infraction' => 'Refus de priorité à droite à une intersection de route', 'article' => 'R415-5', 'amende' => '135 EUR', 'points' => '4'],
    ['categorie' => 'Priorité', 'infraction' => 'Refus de priorité par un conducteur de véhicule à un piéton régulièrement engagé dans la traversée d\'une chaussée', 'article' => 'R415-11', 'amende' => '135 EUR', 'points' => '6'],
    // Nuisance
    ['categorie' => 'Nuisance', 'infraction' => 'Bruit ou tapage nocturne troublant la tranquillité d\'autrui', 'article' => 'R623-2', 'amende' => '68 EUR', 'points' => '0'],
    ['categorie' => 'Nuisance', 'infraction' => 'Bruit ou tapage injurieux troublant la tranquillité d\'autrui', 'article' => 'R623-2', 'amende' => '68 EUR', 'points' => '0'],
    ['categorie' => 'Nuisance', 'infraction' => 'Dépôt ou abandon d\'ordures, déchets, matériaux ou objets hors emplacement autorisés', 'article' => 'R634-2', 'amende' => '135 EUR', 'points' => '0'],
    ['categorie' => 'Nuisance', 'infraction' => 'Occupation en réunion d\'un espace commun d\'immeuble collectif d\'habitation empêchant délibérément l\'accès ou la circulation des personnes', 'article' => 'R644-2', 'amende' => '135 EUR', 'points' => '0'],
    // Trouble / autres infractions
    ['categorie' => 'Trouble à l\'ordre public', 'infraction' => 'Trouble à l\'ordre public', 'article' => '—', 'amende' => '2 000 EUR', 'points' => 'N/A'],
    ['categorie' => 'Trouble à l\'ordre public', 'infraction' => 'Ivresse publique manifeste', 'article' => 'L3341-1', 'amende' => '35 EUR', 'points' => '0'],
    ['categorie' => 'Trouble à l\'ordre public', 'infraction' => 'Consommation de matière stupéfiante ou assimilée sur la voie publique', 'article' => 'L3421-1', 'amende' => '3 750 EUR', 'points' => '0'],
    ['categorie' => 'Trouble à l\'ordre public', 'infraction' => 'Atteinte à la pudeur', 'article' => '222-32', 'amende' => '15 000 EUR', 'points' => 'N/A'],
    ['categorie' => 'Conduite', 'infraction' => 'Dissimulation volontaire afin d\'empêcher l\'identification visuelle', 'article' => 'R431-1-1', 'amende' => '135 EUR', 'points' => '0'],
    // Crimes — tarifs min. / forfaitaire / max.
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Vol à mains armées', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 7 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Violence volontaire avec intention de donner la mort', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 10 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Violence volontaire avec arme', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 12 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Homicide volontaire', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 25 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Homicide involontaire', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 12 500 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — contre les personnes', 'infraction' => 'Homicide volontaire ou involontaire sur un agent dépositaire d\'une autorité publique', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 30 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — détention / usage d\'arme', 'infraction' => 'Détention d\'une arme à feu sans autorisation', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 5 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — détention / usage d\'arme', 'infraction' => 'Usage d\'une arme à feu', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 10 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — détention / usage d\'arme', 'infraction' => 'Usage d\'un engin d\'artifice à l\'encontre des forces de l\'ordre', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 5 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — détention / usage d\'arme', 'infraction' => 'Détention de munition ou chargeur', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 2 500 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — détention / usage d\'arme', 'infraction' => 'Menace avec arme', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 6 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — violence en réunion', 'infraction' => 'Violence urbaine', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 3 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — violence en réunion', 'infraction' => 'Mise en danger d\'autrui', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 4 500 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — corruption', 'infraction' => 'Corruption', 'article' => 'CP', 'amende' => 'Forfaitaire 15 750 EUR (min. 2 000 / max. 45 550)', 'points' => 'N/A'],
    ['categorie' => 'Crimes — finance', 'infraction' => 'Blanchiment', 'article' => 'CP', 'amende' => '50 000 / 15 750 / 45 550 EUR (minoré · forfaitaire · majoré)', 'points' => 'N/A'],
];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Infractions - Code Penal / CSI</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        body { background: #f5f7fa; padding: 16px; }
        .cp-wrap { max-width: 1200px; margin: 0 auto; }
        .cp-card { background: #fff; border: 1px solid #d8dde4; border-radius: 10px; box-shadow: 0 6px 22px rgba(0,0,0,.06); overflow: hidden; }
        .cp-head { padding: 16px 20px; background: #002b5c; color: #fff; }
        .cp-head h1 { margin: 0; font-size: 20px; }
        .cp-head p { margin: 6px 0 0; opacity: .9; font-size: 13px; }
        .cp-tools { padding: 14px 20px; border-bottom: 1px solid #eef1f5; display: flex; gap: 10px; align-items: center; }
        .cp-tools input { max-width: 340px; }
        .cp-table-wrap { overflow: auto; max-height: 70vh; }
        .cp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .cp-table th, .cp-table td { padding: 10px 12px; border-bottom: 1px solid #edf0f4; text-align: left; }
        .cp-table thead th { position: sticky; top: 0; background: #f8fafc; color: #002b5c; z-index: 1; }
        .cp-badge { display: inline-block; font-size: 12px; padding: 4px 8px; border-radius: 999px; background: #e8f0ff; color: #204a87; }
        .cp-col-sel { width: 40px; text-align: center; vertical-align: middle; }
        .cp-col-sel input { width: auto; margin: 0; cursor: pointer; }
        tr.cp-row-selected { background: #f5f9ff; }
        .cp-calc { margin: 0 20px 14px; padding: 14px 16px; border: 1px solid #c9d8ec; border-radius: 8px; background: #f8fbff; }
        .cp-calc-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .cp-calc-title { font-weight: 700; color: #002b5c; font-size: 14px; }
        .cp-calc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-btn { padding: 8px 12px; border-radius: 6px; border: 1px solid #8fa8c9; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #143a61; }
        .cp-btn:hover { background: #e8f0ff; }
        .cp-btn-ghost { border-color: #dcdcdc; color: #444; }
        .cp-calc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 18px; font-size: 13px; color: #333; }
        .cp-calc-grid strong { color: #111; }
        .cp-calc-disclaimer, .cp-calc-notes { margin: 10px 0 0; font-size: 11px; color: #666; line-height: 1.35; }
        .cp-calc-notes { margin-top: 6px; font-style: italic; }
        .cp-calc-extras { display: flex; flex-wrap: wrap; gap: 16px 24px; align-items: flex-end; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #c9d8ec; font-size: 13px; }
        .cp-calc-extras label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; color: #444; }
        .cp-calc-extras input[type="number"] { max-width: 100px; padding: 8px 10px; border-radius: 6px; border: 1px solid #cfcfcf; font-size: 14px; }
        .cp-amende-detail { margin-top: 8px; font-size: 12px; color: #555; line-height: 1.45; }
    </style>
</head>
<body>
    <div class="cp-wrap">
        <section class="cp-card">
            <header class="cp-head">
                <h1>Infractions</h1>
                <p>Referentiel synthetique Code Penal / CSI - version locale</p>
            </header>
            <div class="cp-tools">
                <label for="search">Recherche :</label>
                <input id="search" type="text" placeholder="Article, categorie, infraction...">
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
                </div>
                <div class="cp-calc-extras">
                    <label for="cp-pochons">Pochons (AFD) × 300 EUR
                        <input type="number" id="cp-pochons" min="0" step="1" placeholder="0" title="Ajout au total amendes lorsque pertinent (référent stupéfiants au tableau délits / infractions)">
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
                <table class="cp-table" id="infractions-table">
                    <thead>
                        <tr>
                            <th class="cp-col-sel"><input type="checkbox" id="cp-master" title="Tout cocher (lignes visibles)"></th>
                            <th>Categorie</th>
                            <th>Infraction</th>
                            <th>Article</th>
                            <th>Amende</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($infractions as $item): ?>
                        <tr
                            data-cp-amende="<?php echo htmlspecialchars($item['amende'], ENT_QUOTES, 'UTF-8'); ?>"
                            data-cp-points="<?php echo htmlspecialchars($item['points'], ENT_QUOTES, 'UTF-8'); ?>"
                        >
                            <td class="cp-col-sel"><input type="checkbox" class="cp-row-sel"></td>
                            <td><span class="cp-badge"><?php echo htmlspecialchars($item['categorie'], ENT_QUOTES, 'UTF-8'); ?></span></td>
                            <td><?php echo htmlspecialchars($item['infraction'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['article'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['amende'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($item['points'], ENT_QUOTES, 'UTF-8'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
    <script src="assets/js/codepenal-calc.js"></script>
    <script>
        initCodePenalCalculator({ table: '#infractions-table', mode: 'infraction' });
    </script>
</body>
</html>
