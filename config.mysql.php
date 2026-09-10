<?php
declare(strict_types=1);

/**
 * Configuration MySQL — InfinityFree
 * Remplis ces valeurs après création de la base de données sur InfinityFree.
 */
define('PM_MYSQL_HOST', getenv('MYSQL_HOST') ?: 'sql301.infinityfree.com');
define('PM_MYSQL_DB',   getenv('MYSQL_DB')   ?: 'if0_42885489_intranet');
define('PM_MYSQL_USER', getenv('MYSQL_USER') ?: 'if0_42885489');
define('PM_MYSQL_PASS', getenv('MYSQL_PASS') ?: '7wGGAlmWqFNQ');
define('PM_MYSQL_CHARSET', 'utf8mb4');

function pm_mysql_connect_global(): \PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $dsn = 'mysql:host=' . PM_MYSQL_HOST . ';dbname=' . PM_MYSQL_DB . ';charset=' . PM_MYSQL_CHARSET;
    $pdo = new \PDO($dsn, PM_MYSQL_USER, PM_MYSQL_PASS, [
        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function pm_mysql_kv_get_all(): array
{
    $pdo = pm_mysql_connect_global();
    $pdo->exec("CREATE TABLE IF NOT EXISTS `store` (
        `key` VARCHAR(255) NOT NULL PRIMARY KEY,
        `value` MEDIUMTEXT NOT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $rows = $pdo->query("SELECT `key`, `value` FROM `store`")->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $k = $row['key'] ?? '';
        $v = $row['value'] ?? '';
        if ($k !== '') {
            $out[$k] = $v;
        }
    }
    return $out;
}

function pm_mysql_kv_set(string $key, string $value): void
{
    $pdo = pm_mysql_connect_global();
    $stmt = $pdo->prepare("INSERT INTO `store` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()");
    $stmt->execute([$key, $value]);
}

function pm_mysql_kv_set_all(array $data): void
{
    if ($data === []) return;
    $pdo = pm_mysql_connect_global();
    $stmt = $pdo->prepare("INSERT INTO `store` (`key`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()");
    $pdo->beginTransaction();
    try {
        foreach ($data as $key => $value) {
            if (!is_string($key)) continue;
            $v = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
            $stmt->execute([$key, $v]);
        }
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
