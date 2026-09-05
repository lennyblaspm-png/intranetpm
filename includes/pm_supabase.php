<?php
declare(strict_types=1);

/**
 * Client Supabase REST API — utilisation de curl (dispo sur Vercel).
 * Table : store (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)
 */

define('PM_SUPABASE_URL', 'https://vlhmozvizmfttyitipfg.supabase.co');
define('PM_SUPABASE_KEY', getenv('SUPABASE_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaG1venZpem1mdHR5aXRpcGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDMyNTMsImV4cCI6MjEwNDAxOTI1M30.9bwZWwNp9EKcdpTnTYLBUFrd662_92aHhb0ZgyuqJrU');

function pm_supabase_request(string $method, string $table, $body = null, array $extraHeaders = []): array
{
    $url = PM_SUPABASE_URL . '/rest/v1/' . $table;
    $headers = [
        'apikey: ' . PM_SUPABASE_KEY,
        'Authorization: Bearer ' . PM_SUPABASE_KEY,
        'Content-Type: application/json',
    ];
    foreach ($extraHeaders as $h) {
        $headers[] = $h;
    }
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => $headers,
    ];
    if ($method === 'GET') {
        // nothing extra
    } elseif ($method === 'POST') {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE) : '';
    } elseif ($method === 'DELETE') {
        $opts[CURLOPT_CUSTOMREQUEST] = 'DELETE';
    }
    curl_setopt_array($ch, $opts);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    error_log('[PM SUPABASE] ' . $method . ' ' . $table . ' HTTP ' . $code . ($err ? ' err=' . $err : ''));
    if ($resp !== false && $code >= 400) {
        error_log('[PM SUPABASE] body: ' . substr($resp, 0, 500));
    }
    if ($resp === false || $err !== '') {
        return ['_error' => $err ?: 'curl_failed'];
    }
    $decoded = json_decode($resp, true);
    return ['code' => $code, 'data' => is_array($decoded) ? $decoded : []];
}

function pm_supabase_kv_get_all(): array
{
    $r = pm_supabase_request('GET', 'store', null, ['Accept: application/json']);
    $rows = $r['data'] ?? [];
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

function pm_supabase_kv_set(string $key, string $value): void
{
    $r = pm_supabase_request('POST', 'store', [
        ['key' => $key, 'value' => $value, 'updated_at' => gmdate('c')],
    ], ['Prefer: resolution=merge-duplicates']);
    if (isset($r['_error']) || (($r['code'] ?? 0) >= 400)) {
        error_log('[PM SUPABASE] kv_set FAILED key=' . $key);
    }
}

function pm_supabase_kv_set_all(array $data): void
{
    if ($data === []) return;
    $rows = [];
    foreach ($data as $key => $value) {
        if (!is_string($key)) continue;
        $rows[] = [
            'key'   => $key,
            'value' => is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE),
            'updated_at' => gmdate('c'),
        ];
    }
    if ($rows !== []) {
        $r = pm_supabase_request('POST', 'store', $rows, ['Prefer: resolution=merge-duplicates']);
        if (isset($r['_error']) || (($r['code'] ?? 0) >= 400)) {
            error_log('[PM SUPABASE] kv_set_all FAILED count=' . count($rows));
        } else {
            error_log('[PM SUPABASE] kv_set_all OK count=' . count($rows));
        }
    }
}
