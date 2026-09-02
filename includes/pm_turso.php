<?php
declare(strict_types=1);

// Turso HTTP API — la DB URL doit être en https:// pour le pipeline
define('PM_TURSO_URL', 'https://intranetpm-lenky.turso.io');
define('PM_TURSO_TOKEN', 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJFcGY5aDZiMkVmR0FaR0lHaTI2T29RIiwib3JnX2lkIjoxMDAwMjM1MDI1fQ.GCRDXNe9xIRTPZl-6Jyhik0Ieaq5TUZWbnrd4QHiG7JRqw9fEdafl3-ZglEoUNJ92hZKslZbD8B0f_TSMQfdDA');

/**
 * Envoie une requête pipeline Turso via curl (dispo sur Vercel).
 * @param array $requests Requêtes pipeline
 * @return array Réponse décodée
 */
function pm_turso_pipeline(array $requests): array
{
    $url = PM_TURSO_URL . '/v2/pipeline';
    $payload = json_encode(['requests' => $requests], JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . PM_TURSO_TOKEN,
            'Content-Type: application/json',
        ],
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resp === false || $err !== '') {
        error_log('[PM TURSO] curl error: ' . $err . ' url=' . $url);
        return ['results' => [], '_error' => $err];
    }
    if ($code >= 400) {
        error_log('[PM TURSO] HTTP ' . $code . ' body=' . substr($resp, 0, 500));
        return ['results' => [], '_error' => 'HTTP ' . $code];
    }
    $decoded = json_decode($resp, true);
    return is_array($decoded) ? $decoded : ['results' => [], '_error' => 'invalid_json'];
}

/**
 * Exécute une requête SQL et retourne la réponse raw pipeline.
 */
function pm_turso_execute(string $sql, array $args = []): array
{
    $stmt = ['sql' => $sql];
    if ($args !== []) {
        $stmt['args'] = $args;
    }
    $result = pm_turso_pipeline([
        ['type' => 'execute', 'stmt' => $stmt],
        ['type' => 'close'],
    ]);

    if (isset($result['_error'])) {
        error_log('[PM TURSO] execute error for: ' . substr($sql, 0, 100));
        return $result;
    }

    $results = $result['results'] ?? [];
    if (!is_array($results) || $results === []) return [];
    $first = $results[0] ?? null;
    if (!is_array($first)) return [];
    $response = $first['response'] ?? $first;
    if (!is_array($response)) return [];
    return $response;
}

/**
 * Exécute un SELECT et retourne les lignes (tableau associatif).
 */
function pm_turso_query(string $sql, array $args = []): array
{
    $response = pm_turso_execute($sql, $args);
    if (isset($response['_error'])) return [];

    $resultData = $response['result'] ?? $response;
    if (!is_array($resultData)) return [];
    $cols = [];
    if (isset($resultData['cols']) && is_array($resultData['cols'])) {
        foreach ($resultData['cols'] as $c) {
            $cols[] = $c['name'] ?? '';
        }
    }
    $rows = [];
    if (isset($resultData['rows']) && is_array($resultData['rows'])) {
        foreach ($resultData['rows'] as $row) {
            $r = [];
            if (is_array($row)) {
                foreach ($row as $i => $cell) {
                    $k = $cols[$i] ?? ("col_$i");
                    if (is_array($cell)) {
                        $r[$k] = $cell['value'] ?? $cell;
                    } else {
                        $r[$k] = $cell;
                    }
                }
            }
            $rows[] = $r;
        }
    }
    return $rows;
}

/**
 * Crée la table kv_store si elle n'existe pas.
 */
function pm_turso_init_tables(): void
{
    static $initialized = false;
    if ($initialized) return;
    $initialized = true;
    $response = pm_turso_execute("CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    if (isset($response['_error'])) {
        error_log('[PM TURSO] init_tables FAILED: ' . json_encode($response));
    } else {
        error_log('[PM TURSO] init_tables OK');
    }
}

function pm_turso_kv_get(string $key): ?string
{
    $rows = pm_turso_query(
        "SELECT value FROM kv_store WHERE key = ?",
        [['type' => 'text', 'value' => $key]]
    );
    if ($rows === []) return null;
    return $rows[0]['value'] ?? null;
}

function pm_turso_kv_set(string $key, string $value): void
{
    $r = pm_turso_execute(
        "INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [
            ['type' => 'text', 'value' => $key],
            ['type' => 'text', 'value' => $value],
        ]
    );
    if (isset($r['_error'])) {
        error_log('[PM TURSO] kv_set FAILED key=' . $key . ' err=' . json_encode($r));
    }
}

function pm_turso_kv_get_all(): array
{
    $rows = pm_turso_query("SELECT key, value FROM kv_store");
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
 * Upsert toutes les paires clé/valeur d'un coup via pipeline batch.
 */
function pm_turso_kv_set_all(array $data): void
{
    $reqs = [];
    foreach ($data as $key => $value) {
        if (!is_string($key)) continue;
        $reqs[] = [
            'type' => 'execute',
            'stmt' => [
                'sql' => 'INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                'args' => [
                    ['type' => 'text', 'value' => $key],
                    ['type' => 'text', 'value' => is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE)],
                ],
            ],
        ];
    }
    if ($reqs !== []) {
        $reqs[] = ['type' => 'close'];
        $result = pm_turso_pipeline($reqs);
        if (isset($result['_error'])) {
            error_log('[PM TURSO] kv_set_all FAILED: ' . $result['_error']);
        }
    }
}
