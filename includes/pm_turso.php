<?php
declare(strict_types=1);

define('PM_TURSO_URL', 'libsql://intranetpm-lenky.aws-ap-northeast-1.turso.io');
define('PM_TURSO_TOKEN', 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJFcGY5aDZiMkVmR0FaR0lHaTI2T29RIiwib3JnX2lkIjoxMDAwMjM1MDI1fQ.GCRDXNe9xIRTPZl-6Jyhik0Ieaq5TUZWbnrd4QHiG7JRqw9fEdafl3-ZglEoUNJ92hZKslZbD8B0f_TSMQfdDA');

function pm_turso_pipeline(array $requests): array
{
    $url = PM_TURSO_URL . '/v2/pipeline';
    $payload = json_encode(['requests' => $requests], JSON_UNESCAPED_SLASHES);
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer " . PM_TURSO_TOKEN . "\r\nContent-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ];
    $resp = @file_get_contents($url, false, stream_context_create($opts));
    if ($resp === false) {
        error_log('[PM TURSO] pipeline request failed');
        return ['results' => []];
    }
    $decoded = json_decode($resp, true);
    return is_array($decoded) ? $decoded : ['results' => []];
}

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
    $results = $result['results'] ?? [];
    if (!is_array($results) || $results === []) return [];
    $first = $results[0] ?? null;
    if (!is_array($first)) return [];
    $response = $first['response'] ?? $first;
    if (!is_array($response)) return [];
    return $response;
}

function pm_turso_query(string $sql, array $args = []): array
{
    $response = pm_turso_execute($sql, $args);
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

function pm_turso_init_tables(): void
{
    $sql = "CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )";
    $response = pm_turso_execute($sql);
    error_log('[PM TURSO] init tables: ' . json_encode($response));
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
    pm_turso_execute(
        "INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [
            ['type' => 'text', 'value' => $key],
            ['type' => 'text', 'value' => $value],
        ]
    );
}

function pm_turso_kv_delete(string $key): void
{
    pm_turso_execute(
        "DELETE FROM kv_store WHERE key = ?",
        [['type' => 'text', 'value' => $key]]
    );
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
        pm_turso_pipeline($reqs);
    }
}
