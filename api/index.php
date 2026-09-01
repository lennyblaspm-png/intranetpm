<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = getcwd();

// API endpoints → api.php
if ($uri === '/api' || $uri === '/api.php' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/../api.php';
    return;
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

// Fallback
http_response_code(404);
echo 'Not found';
