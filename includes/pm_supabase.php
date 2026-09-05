<?php
declare(strict_types=1);

/**
 * Client Supabase REST API — utilisation de curl (dispo sur Vercel).
 * Table : store (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)
 */

define('PM_SUPABASE_URL', 'https://vlhmozvizmfttyitipfg.supabase.co');
define('PM_SUPABASE_KEY', getenv('SUPABASE_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaG1venZpem1mdHR5aXRpcGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDMyNTMsImV4cCI6MjEwNDAxOTI1M30.9bwZWwNp9EKcdpTnTYLBUFrd662_92aHhb0ZgyuqJrU');

/**
 * Requête GET Supabase REST API.
 * @return array Lignes retournées
 */
function pm_supabase_get(string $table, array $params = []): array
{
    $url = PM_SUPABASE_URL . '/rest/v1/' . $table;
    if ($params !== []) {
        $url .= '?' . http_build_query($params);
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . PM_SUPABASE_KEY,
            'Authorization: Bearer ' . PM_SUPABASE_KEY,
            'Accept: application/json',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $err !== '') {
        error_log('[PM SUPABASE] GET error: ' . $err);
        return [];
    }
    if ($code >= 400) {
        error_log('[PM SUPABASE] GET HTTP ' . $code . ' body=' . substr($resp, 0, 300));
        return [];
    }
    $decoded = json_decode($resp, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Requête POST (insert/upsert) Supabase REST API.
 */
function pm_supabase_post(string $table, array $rows, bool $upsert = false): bool
{
    $url = PM_SUPABASE_URL . '/rest/v1/' . $table;
    $headers = [
        'apikey: ' . PM_SUPABASE_KEY,
        'Authorization: Bearer ' . PM_SUPABASE_KEY,
        'Content-Type: application/json',
        'Prefer: return=minimal',
    ];
    if ($upsert) {
        $headers[] = 'Prefer: resolution=merge-duplicates,return=minimal';
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($rows, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $err !== '') {
        error_log('[PM SUPABASE] POST error: ' . $err);
        return false;
    }
    if ($code >= 400) {
        error_log('[PM SUPABASE] POST HTTP ' . $code . ' body=' . substr($resp, 0, 300));
        return false;
    }
    return true;
}

/**
 * DELETE des lignes par clé.
 */
function pm_supabase_delete_by_keys(string $table, array $keys): bool
{
    if ($keys === []) return true;
    $url = PM_SUPABASE_URL . '/rest/v1/' . $table . '?key=in.(' . implode(',', $keys) . ')';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'DELETE',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . PM_SUPABASE_KEY,
            'Authorization: Bearer ' . PM_SUPABASE_KEY,
            'Prefer: return=minimal',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $err !== '') {
        error_log('[PM SUPABASE] DELETE error: ' . $err);
        return false;
    }
    if ($code >= 400) {
        error_log('[PM SUPABASE] DELETE HTTP ' . $code);
        return false;
    }
    return true;
}

// ─── API simplifiée pour pm_store.php ───

/**
 * Lit toutes les paires clé/valeur du store.
 * @return array<string, string>
 */
function pm_supabase_kv_get_all(): array
{
    $rows = pm_supabase_get('store', ['select' => 'key,value']);
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

/**
 * Écrit une paire clé/valeur (upsert).
 */
function pm_supabase_kv_set(string $key, string $value): void
{
    $ok = pm_supabase_post('store', [
        ['key' => $key, 'value' => $value],
    ], true);
    if (!$ok) {
        error_log('[PM SUPABASE] kv_set FAILED key=' . $key);
    }
}

/**
 * Écrit toutes les paires clé/valeur d'un coup (upsert batch).
 */
function pm_supabase_kv_set_all(array $data): void
{
    if ($data === []) return;
    $rows = [];
    foreach ($data as $key => $value) {
        if (!is_string($key)) continue;
        $rows[] = [
            'key'   => $key,
            'value' => is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE),
        ];
    }
    if ($rows !== []) {
        $ok = pm_supabase_post('store', $rows, true);
        if (!$ok) {
            error_log('[PM SUPABASE] kv_set_all FAILED');
        }
    }
}
