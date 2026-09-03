<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__ . '/..';

// Supabase test — direct in api/index.php, no session needed
if ($uri === '/supabase-test.php' || $uri === '/supabase-test') {
    header('Content-Type: application/json');
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    $results = ['step' => 'start'];
    try {
        require_once $root . '/includes/pm_supabase.php';
        $results['step'] = 'supabase_loaded';
    } catch (Throwable $e) {
        $results['error'] = 'load: ' . $e->getMessage();
        echo json_encode($results);
        exit;
    }
    try { $k = '_test_' . time(); pm_supabase_kv_set($k, gmdate('c')); $results['write'] = 'OK key=' . $k; } catch (Throwable $e) { $results['write'] = 'FAIL: ' . $e->getMessage(); }
    try { $all = pm_supabase_kv_get_all(); $results['count'] = count($all); $results['keys'] = array_slice(array_keys($all), 0, 10); } catch (Throwable $e) { $results['count'] = 'FAIL: ' . $e->getMessage(); }
    echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// API endpoints → api.php
if ($uri === '/api' || $uri === '/api.php' || str_starts_with($uri, '/api/')) {
    require $root . '/api.php';
    return;
}

// Static assets
if ($uri !== '/') {
    $file = $root . $uri;
    if (is_file($file) && strtolower(pathinfo($file, PATHINFO_EXTENSION)) !== 'php') {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $types = [
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'webp' => 'image/webp',
            'ico' => 'image/x-icon', 'css' => 'text/css', 'js' => 'application/javascript',
            'json' => 'application/json', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
            'ttf' => 'font/ttf', 'eot' => 'application/vnd.ms-fontobject',
        ];
        if (isset($types[$ext])) {
            header('Content-Type: ' . $types[$ext]);
            header('Cache-Control: public, max-age=31536000');
        }
        readfile($file);
        return;
    }
}

// Pages PHP
$pages = [
    '/'              => '/index.php',
    '/index.php'     => '/index.php',
    '/dashboard.php' => '/dashboard.php',
    '/candidature.php' => '/candidature.php',
    '/espace-candidat.php' => '/espace-candidat.php',
];

if (isset($pages[$uri])) {
    require $root . $pages[$uri];
    return;
}

http_response_code(404);
echo 'Not found';
