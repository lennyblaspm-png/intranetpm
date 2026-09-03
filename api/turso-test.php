<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', '0');

$results = ['step' => 'start'];

try {
    require_once __DIR__ . '/../includes/pm_turso.php';
    $results['step'] = 'turso_loaded';
} catch (Throwable $e) {
    $results['error'] = 'load: ' . $e->getMessage();
    echo json_encode($results);
    exit;
}

try {
    pm_turso_init_tables();
    $results['init'] = 'OK';
} catch (Throwable $e) {
    $results['init'] = 'FAIL: ' . $e->getMessage();
}

try {
    $testKey = '_test_' . time();
    pm_turso_kv_set($testKey, gmdate('c'));
    $results['write'] = 'OK key=' . $testKey;
} catch (Throwable $e) {
    $results['write'] = 'FAIL: ' . $e->getMessage();
}

try {
    $all = pm_turso_kv_get_all();
    $results['count'] = count($all);
    $results['keys'] = array_slice(array_keys($all), 0, 10);
} catch (Throwable $e) {
    $results['count'] = 'FAIL: ' . $e->getMessage();
}

echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
