<?php
// Vercel Serverless Function - routeur pour tout le site (api + pages)
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Normalise
if ($uri === '/' || $uri === '/index.php') {
    require_once __DIR__ . '/../index.php';
    return;
}
if (str_starts_with($uri, '/api/') || $uri === '/api' || $uri === '/api.php') {
    require_once __DIR__ . '/../api.php';
    return;
}
// Pages principales
$map = [
    '/dashboard.php' => '/../dashboard.php',
    '/candidature.php' => '/../candidature.php',
    '/espace-candidat.php' => '/../espace-candidat.php',
];
if (isset($map[$uri])) {
    require_once __DIR__ . $map[$uri];
    return;
}
// Fallback : assets/statiques gérés par Vercel, sinon 404
http_response_code(404);
echo 'Not found: ' . htmlspecialchars($uri);
