<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__ . '/..';

// Turso test endpoint (before session, bypasses api.php)
if ($uri === '/turso-test.php' || $uri === '/turso-test') {
    require $root . '/turso-test.php';
    return;
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
