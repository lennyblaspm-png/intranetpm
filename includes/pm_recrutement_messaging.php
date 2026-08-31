<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'pm_store.php';

function pm_recrutement_messages_path(): string
{
    return pm_data_dir() . DIRECTORY_SEPARATOR . 'recrutement_messages.json';
}

/**
 * @return array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>}
 */
function pm_default_recrutement_messages(): array
{
    return ['version' => 1, 'by_candidature_id' => []];
}

/**
 * @return array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>}
 */
function pm_read_recrutement_messages(): array
{
    pm_ensure_data_dir();
    $path = pm_recrutement_messages_path();
    if (!is_file($path)) {
        $empty = pm_default_recrutement_messages();
        file_put_contents(
            $path,
            json_encode($empty, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );
        return $empty;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return pm_default_recrutement_messages();
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['by_candidature_id']) || !is_array($data['by_candidature_id'])) {
        return pm_default_recrutement_messages();
    }
    $data['version'] = isset($data['version']) && is_int($data['version']) ? $data['version'] : 1;
    return $data;
}

/**
 * @param array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>} $store
 */
function pm_write_recrutement_messages(array $store): void
{
    pm_ensure_data_dir();
    file_put_contents(
        pm_recrutement_messages_path(),
        json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function pm_sanitize_recrutement_message_body(string $body): string
{
    $t = trim(strip_tags($body));
    $max = 6000;
    if (mb_strlen($t, 'UTF-8') > $max) {
        return mb_substr($t, 0, $max, 'UTF-8');
    }
    return $t;
}

/**
 * @param array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>} $msgStore
 * @return list<array<string, mixed>>
 */
function pm_recrutement_get_thread(array $msgStore, string $candidatureId): array
{
    if ($candidatureId === '') {
        return [];
    }
    $threads = $msgStore['by_candidature_id'];
    if (!isset($threads[$candidatureId]) || !is_array($threads[$candidatureId])) {
        return [];
    }
    /** @var list<array<string, mixed>> $out */
    $out = [];
    foreach ($threads[$candidatureId] as $m) {
        if (is_array($m)) {
            $out[] = $m;
        }
    }
    return $out;
}

/**
 * @param array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>} $msgStore
 * @return array<string, mixed>
 */
function pm_recrutement_append_message(array &$msgStore, string $candidatureId, string $from, string $body, ?string $author): array
{
    if (!isset($msgStore['by_candidature_id'][$candidatureId]) || !is_array($msgStore['by_candidature_id'][$candidatureId])) {
        $msgStore['by_candidature_id'][$candidatureId] = [];
    }
    $row = [
        'from' => $from,
        'body' => $body,
        'created_at' => gmdate('c'),
    ];
    if ($author !== null && $author !== '') {
        $row['author'] = $author;
    }
    $msgStore['by_candidature_id'][$candidatureId][] = $row;
    return $row;
}

/**
 * @param array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>} $msgStore
 * @param list<string> $ids
 */
function pm_recrutement_remove_threads_for(array &$msgStore, array $ids): void
{
    foreach ($ids as $id) {
        if (!is_string($id) || $id === '') {
            continue;
        }
        unset($msgStore['by_candidature_id'][$id]);
    }
}

/**
 * @param array{version:int, by_candidature_id: array<string, list<array<string, mixed>>>} $msgStore
 */
function pm_recrutement_remove_thread_one(array &$msgStore, string $candidatureId): void
{
    if ($candidatureId === '') {
        return;
    }
    unset($msgStore['by_candidature_id'][$candidatureId]);
}
