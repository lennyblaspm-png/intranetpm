<?php
declare(strict_types=1);

/**
 * @return array{base_path:string,session_cookie_secure:?bool}
 */
function pm_load_hosting_config(): array
{
    $defaults = [
        'base_path' => '',
        'session_cookie_secure' => null,
    ];
    $local = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config.local.php';
    if (!is_file($local)) {
        return $defaults;
    }
    $m = require $local;
    return is_array($m) ? array_merge($defaults, $m) : $defaults;
}

function pm_request_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443') {
        return true;
    }
    if (strtolower((string) ($_SERVER['REQUEST_SCHEME'] ?? '')) === 'https') {
        return true;
    }
    if (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
        return true;
    }
    $cf = (string) ($_SERVER['HTTP_CF_VISITOR'] ?? '');
    if ($cf !== '' && str_contains($cf, '"scheme":"https"')) {
        return true;
    }
    return false;
}

function pm_session_cookie_secure(array $config): bool
{
    $e = getenv('SESSION_COOKIE_SECURE');
    if ($e === '1' || strtolower((string) $e) === 'true') {
        return true;
    }
    if ($e === '0' || strtolower((string) $e) === 'false') {
        return false;
    }
    $v = $config['session_cookie_secure'] ?? null;
    if ($v === true) {
        return true;
    }
    if ($v === false) {
        return false;
    }
    return pm_request_is_https();
}

/** Chemin du cookie de session (sous-dossier du site, ex. /intranet/). */
function pm_cookie_path(array $config): string
{
    $base = rtrim((string) ($config['base_path'] ?? ''), '/');
    return $base === '' ? '/' : $base . '/';
}

/**
 * Retire le préfixe base_path de l’URI pour router /api comme à la racine.
 */
function pm_normalize_uri_path(string $path, array $config): string
{
    $path = $path !== '' ? rtrim($path, '/') : '/';
    if ($path === '') {
        $path = '/';
    }
    $base = rtrim((string) ($config['base_path'] ?? ''), '/');
    if ($base !== '' && str_starts_with($path, $base)) {
        $path = substr($path, strlen($base));
        if ($path === '' || $path === false) {
            $path = '/';
        }
        if ($path === '' || $path[0] !== '/') {
            $path = '/' . ltrim((string) $path, '/');
        }
    }
    return $path;
}
