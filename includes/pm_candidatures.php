<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'pm_store.php';

function pm_candidatures_json_path(): string
{
    return pm_data_dir() . DIRECTORY_SEPARATOR . 'candidatures.json';
}

/**
 * @return array{version:int, items:list<array<string, mixed>>}
 */
function pm_default_candidatures_store(): array
{
    return ['version' => 1, 'items' => []];
}

/**
 * @return array{version:int, items:list<array<string, mixed>>}
 */
function pm_read_candidatures_store(): array
{
    pm_ensure_data_dir();
    $path = pm_candidatures_json_path();
    if (!is_file($path)) {
        $empty = pm_default_candidatures_store();
        file_put_contents(
            $path,
            json_encode($empty, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            LOCK_EX
        );
        return $empty;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return pm_default_candidatures_store();
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        return pm_default_candidatures_store();
    }
    $data['version'] = isset($data['version']) && is_int($data['version']) ? $data['version'] : 1;
    return $data;
}

/**
 * @param array{version:int, items:list<array<string, mixed>>} $store
 */
function pm_write_candidatures_store(array $store): void
{
    pm_ensure_data_dir();
    file_put_contents(
        pm_candidatures_json_path(),
        json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function pm_trim_text(string $s, int $max): string
{
    $t = trim($s);
    if (mb_strlen($t, 'UTF-8') <= $max) {
        return $t;
    }
    return mb_substr($t, 0, $max, 'UTF-8');
}

function pm_generate_candidature_reference(): string
{
    return 'PMC-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
}

/**
 * @param array{version:int, items:list<mixed>} $store
 */
function pm_allocate_unique_candidature_reference(array $store): string
{
    for ($i = 0; $i < 8; $i++) {
        $ref = pm_generate_candidature_reference();
        $taken = false;
        foreach ($store['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (($item['reference'] ?? '') === $ref) {
                $taken = true;
                break;
            }
        }
        if (!$taken) {
            return $ref;
        }
    }
    return pm_generate_candidature_reference() . '-' . strtoupper(bin2hex(random_bytes(2)));
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function pm_candidature_public_payload(array $row): array
{
    $allowed = ['id', 'reference', 'created_at', 'discord', 'nom', 'prenom', 'age', 'disponibilites', 'experience', 'motivation', 'statut', 'pole'];
    $out = [];
    foreach ($allowed as $k) {
        if (isset($row[$k])) {
            $out[$k] = $row[$k];
        }
    }
    return $out;
}

/**
 * @return array{item:array<string, mixed>, error?:never}|array{item?:never, error:string}
 */
function pm_find_latest_candidature_by_discord_and_password(array $store, string $discord, string $password): array
{
    $needle = strtolower(trim($discord));
    if ($needle === '') {
        return ['error' => 'Identifiants incorrects.'];
    }
    /** @var list<array<string, mixed>> $matches */
    $matches = [];
    foreach ($store['items'] as $item) {
        if (!is_array($item)) {
            continue;
        }
        /** @var array<string, mixed> $item */
        $d = isset($item['discord']) ? strtolower(trim((string) $item['discord'])) : '';
        if ($d !== $needle) {
            continue;
        }
        $hash = isset($item['password_hash']) ? (string) $item['password_hash'] : '';
        if ($hash === '' || !password_verify($password, $hash)) {
            continue;
        }
        $matches[] = $item;
    }
    if ($matches === []) {
        return ['error' => 'Identifiants incorrects.'];
    }
    usort(
        $matches,
        static function (array $a, array $b): int {
            $ta = strtotime((string) ($a['created_at'] ?? '')) ?: 0;
            $tb = strtotime((string) ($b['created_at'] ?? '')) ?: 0;
            return $tb <=> $ta;
        }
    );
    return ['item' => $matches[0]];
}

/**
 * @param array{version:int, items:list<mixed>} $cStore
 * @return array<string, mixed>|null
 */
function pm_find_candidature_row_by_id(array $cStore, string $id): ?array
{
    if ($id === '') {
        return null;
    }
    foreach ($cStore['items'] as $row) {
        if (is_array($row) && (($row['id'] ?? '') === $id)) {
            return $row;
        }
    }
    return null;
}

/** Statuts autorisés pour suppression par la Direction (hors en attente). */
function pm_candidature_statuts_supprimables(): array
{
    return ['etudiee', 'acceptee', 'refusee'];
}

/**
 * Supprime une candidature si étudiée, acceptée ou refusée.
 *
 * @param array{version:int, items:list<mixed>} $cStore
 */
function pm_try_delete_closed_candidature(array &$cStore, string $id): bool
{
    if ($id === '') {
        return false;
    }
    $ok = pm_candidature_statuts_supprimables();
    $found = false;
    foreach ($cStore['items'] as $idx => $row) {
        if (!is_array($row) || (($row['id'] ?? '') !== $id)) {
            continue;
        }
        $st = (string) ($row['statut'] ?? '');
        if (!in_array($st, $ok, true)) {
            return false;
        }
        unset($cStore['items'][$idx]);
        $found = true;
        break;
    }
    if (!$found) {
        return false;
    }
    $cStore['items'] = array_values($cStore['items']);

    return true;
}

/**
 * Supprime une candidature par identifiant, quel que soit le statut (réservé Direction côté API).
 *
 * @param array{version:int, items:list<mixed>} $cStore
 */
function pm_try_delete_candidature_by_id(array &$cStore, string $id): bool
{
    $id = trim($id);
    if ($id === '') {
        return false;
    }
    $found = false;
    foreach ($cStore['items'] as $idx => $row) {
        if (!is_array($row) || (trim((string)($row['id'] ?? '')) !== $id)) {
            continue;
        }
        unset($cStore['items'][$idx]);
        $found = true;
        break;
    }
    if (!$found) {
        return false;
    }
    $cStore['items'] = array_values($cStore['items']);

    return true;
}

/**
 * Supprime toutes les candidatures étudiées, acceptées ou refusées.
 *
 * @param array{version:int, items:list<mixed>} $cStore
 * @return list<string>
 */
function pm_delete_all_processed_candidatures(array &$cStore): array
{
    $ok = pm_candidature_statuts_supprimables();
    $removedIds = [];
    $keep = [];
    foreach ($cStore['items'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $st = (string) ($row['statut'] ?? '');
        $rid = (string) ($row['id'] ?? '');
        if ($rid !== '' && in_array($st, $ok, true)) {
            $removedIds[] = $rid;
            continue;
        }
        $keep[] = $row;
    }
    $cStore['items'] = $keep;

    return $removedIds;
}
