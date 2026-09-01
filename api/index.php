<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = getcwd();

// API endpoints → api.php
if ($uri === '/api' || $uri === '/api.php' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/../api.php';
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
            readfile($file);
            return;
        }
        header('Content-Type: application/octet-stream');
        readfile($file);
        return;
    }
}

// Also try __DIR__ fallback
$root2 = __DIR__ . '/..';
if ($uri !== '/') {
    $file = $root2 . $uri;
    if (is_file($file) && strtolower(pathinfo($file, PATHINFO_EXTENSION)) !== 'php') {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $types = [
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'webp' => 'image/webp',
            'ico' => 'image/x-icon', 'css' => 'text/css', 'js' => 'application/javascript',
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
}

// Pages PHP
$pages = [
    '/'              => $root . '/index.php',
    '/index.php'     => $root . '/index.php',
    '/dashboard.php' => $root . '/dashboard.php',
    '/candidature.php' => $root . '/candidature.php',
    '/espace-candidat.php' => $root . '/espace-candidat.php',
];

if (isset($pages[$uri])) {
    require $pages[$uri];
    return;
}

http_response_code(404);
echo 'Not found: ' . htmlspecialchars($uri) . ' | cwd=' . getcwd() . ' | dir=' . __DIR__;
