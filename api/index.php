<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// API endpoints → api.php
if ($uri === '/api' || $uri === '/api.php' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/../api.php';
    return;
}

// Pages
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
