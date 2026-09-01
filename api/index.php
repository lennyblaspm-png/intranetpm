<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// API endpoints → api.php
if ($uri === '/api' || $uri === '/api.php' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/../api.php';
    return;
}

// Static assets: serve from project root
$root = __DIR__ . '/..';
$file = $root . $uri;
if ($uri !== '/' && is_file($file)) {
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
        readfile($file);
        return;
    }
    header('Content-Type: application/octet-stream');
    readfile($file);
    return;
}

// Pages PHP
$pages = [
    '/'              => __DIR__ . '/../index.php',
    '/index.php'     => __DIR__ . '/../index.php',
    '/dashboard.php' => __DIR__ . '/../dashboard.php',
    '/candidature.php' => __DIR__ . '/../candidature.php',
    '/espace-candidat.php' => __DIR__ . '/../espace-candidat.php',
];

if (isset($pages[$uri])) {
    require $pages[$uri];
    return;
}

http_response_code(404);
echo 'Not found';
