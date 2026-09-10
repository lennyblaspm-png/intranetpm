<?php
declare(strict_types=1);

/**
 * Script de seed — Importe les comptes dans MySQL
 * À exécuter une seule fois sur InfinityFree après configuration de config.mysql.php
 * URL : https://ton-site.com/seed.php
 */

require_once __DIR__ . '/config.mysql.php';

echo "<h2>Seed MySQL — Intranet PM 93RP</h2>";

try {
    $pdo = pm_mysql_connect_global();
    echo "<p style='color:green'>✓ Connexion MySQL OK</p>";
} catch (Throwable $e) {
    echo "<p style='color:red'>✗ Erreur: " . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
}

$pdo->exec("CREATE TABLE IF NOT EXISTS `store` (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    `value` MEDIUMTEXT NOT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "<p style='color:green'>✓ Table 'store' créée</p>";

$accounts = [
    ['rio'=>'6452182','password'=>'Lenny2010+','nom'=>'BLAS','prenom'=>'Lenny','grade'=>'DPM','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'4470235','password'=>'WNVqLrTWuG','nom'=>'RIBEIRO','prenom'=>'Diego','grade'=>'CDS','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'1005069','password'=>'HErj7vsvWy','nom'=>'MARTEL','prenom'=>'Louis','grade'=>'CDS','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'5123658','password'=>'n%srjtgHs8','nom'=>'SCOT','prenom'=>'Erwann','grade'=>'DRA','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'7819013','password'=>'Z6H$R$96X@','nom'=>'BESCONDS','prenom'=>'Ludovic','grade'=>'CDS','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6529845','password'=>'XT8q4P*AxX','nom'=>'ALCON','prenom'=>'Jimmy','grade'=>'CDS','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'3265879','password'=>'uwQHVyWct$','nom'=>'LARGARDE','prenom'=>'Fabien','grade'=>'CDS-1','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'9412325','password'=>'VL@j*tvw6E','nom'=>'HERNANDEZ','prenom'=>'Noah','grade'=>'CDS','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6993201','password'=>'6fMC3H39eV','nom'=>'HENRICO','prenom'=>'Elio','grade'=>'CDS-S','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6350126','password'=>'4VNhznJ4ma','nom'=>'MORALES','prenom'=>'Daniel','grade'=>'CDS-S','role'=>'Direction','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'2302502','password'=>'P9uAsjMRnV','nom'=>'PALLY','prenom'=>'Marley','grade'=>'STG','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6652214','password'=>'dbfndLygck','nom'=>'RATA','prenom'=>'Patrick','grade'=>'STG','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'9087659','password'=>'nEXUTJ2nph','nom'=>'ALMA','prenom'=>'Valentin','grade'=>'STG','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6520032','password'=>'z6QbzvhMq4','nom'=>'LORENTOS','prenom'=>'Juice','grade'=>'STG','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'2186584','password'=>'jMpDcna3w&','nom'=>'BENSAOUI','prenom'=>'Walid','grade'=>'STG','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'4510089','password'=>'uG&v3#b&AV','nom'=>'ANDERSON','prenom'=>'Warren','grade'=>'GRT','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'7756201','password'=>'PELtLaKrPx','nom'=>'BENSAID','prenom'=>'Ilyes','grade'=>'GRT','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'1508931','password'=>'S7sm2MYp5S','nom'=>'LATTOUR','prenom'=>'Brayan','grade'=>'GRP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'1256789','password'=>'235URbkk&f','nom'=>'DA SILVA','prenom'=>'Hugo','grade'=>'GRP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'8897520','password'=>'S9Y#v#8zTj','nom'=>'LEROIT','prenom'=>'Baptiste','grade'=>'GRP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'7321524','password'=>'BP%rwZb4Ad','nom'=>'SUPERSTAR','prenom'=>'John','grade'=>'GP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'4789750','password'=>'@ms37&dP7B','nom'=>'FOLLET','prenom'=>'Elyon','grade'=>'GP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'8597563','password'=>'JBD6fGBByR','nom'=>'ANGELY','prenom'=>'Antony','grade'=>'BCP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'2532957','password'=>'ERN84eLA6d','nom'=>'GONSALEZ','prenom'=>'Justin','grade'=>'BCP','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'6385123','password'=>'d%4sKYNJUW','nom'=>'MONTANA','prenom'=>'Romain','grade'=>'BCH','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'3020152','password'=>'g4GkTWSQ@s','nom'=>'BOUNIR','prenom'=>'Max','grade'=>'BGD','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'5908051','password'=>'#YMgfXRBaV','nom'=>'LEPOINTE','prenom'=>'Noah','grade'=>'BGD','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'7485145','password'=>'RmTuvk2ym*','nom'=>'BABYLONE','prenom'=>'Zion','grade'=>'BGD','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'7509365','password'=>'Rs957vkRYM','nom'=>'BENAZOUZ','prenom'=>'Walid','grade'=>'BGD','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
    ['rio'=>'8574698','password'=>'&KcfJ7RYn6','nom'=>'BROOKS','prenom'=>'Lyam','grade'=>'BGD','role'=>'Effectif','specialites'=>[],'webhookUrl'=>''],
];

$value = json_encode($accounts, JSON_UNESCAPED_UNICODE);

$stmt = $pdo->prepare("INSERT INTO `store` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()");
$stmt->execute(['PM_INTRANET_OFFICIAL_ACCOUNTS', $value]);

$count = count($accounts);
echo "<p style='color:green'>✓ <strong>$count comptes importés</strong></p>";

$rows = $pdo->query("SELECT `key`, LENGTH(`value`) as len FROM `store`")->fetchAll();
echo "<h3>Table 'store' :</h3>";
echo "<table border='1' cellpadding='5'><tr><th>Key</th><th>Taille</th></tr>";
foreach ($rows as $row) {
    echo "<tr><td>" . htmlspecialchars($row['key']) . "</td><td>" . $row['len'] . " octets</td></tr>";
}
echo "</table>";
echo "<p><strong>Terminé !</strong> Supprime seed.php après.</p>";
