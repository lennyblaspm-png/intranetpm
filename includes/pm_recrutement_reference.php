<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'pm_store.php';

/** @return 'bmu'|'gsi' */
function pm_recrutement_reference_normalize_kind(string $kind): string
{
    $k = strtolower(trim($kind));
    return $k === 'gsi' ? 'gsi' : 'bmu';
}

function pm_intranet_comptes_reference_path_by_kind(string $kind): string
{
    $k = pm_recrutement_reference_normalize_kind($kind);
    if ($k === 'gsi') {
        return pm_data_dir() . DIRECTORY_SEPARATOR . 'intranet_pm_comptes_reference_gsi.json';
    }

    return pm_data_dir() . DIRECTORY_SEPARATOR . 'intranet_pm_comptes_reference.json';
}

function pm_intranet_comptes_reference_path(): string
{
    return pm_intranet_comptes_reference_path_by_kind('bmu');
}

/**
 * Comptes de référence (export intranet) — jamais de mot de passe dans la sortie.
 *
 * @return list<array{rio:string,nom:string,prenom:string,grade:string,role:string,specialites:list<string>}>
 */
function pm_read_intranet_comptes_reference_safe_from_file(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    $out = [];
    foreach ($data as $row) {
        if (!is_array($row)) {
            continue;
        }
        $spec = $row['specialites'] ?? [];
        if (!is_array($spec)) {
            $spec = [];
        }
        $spec = array_values(array_filter(array_map('strval', $spec)));
        $out[] = [
            'rio' => (string) ($row['rio'] ?? ''),
            'nom' => (string) ($row['nom'] ?? ''),
            'prenom' => (string) ($row['prenom'] ?? ''),
            'grade' => (string) ($row['grade'] ?? ''),
            'role' => (string) ($row['role'] ?? ''),
            'specialites' => $spec,
        ];
    }
    return $out;
}

/**
 * @return list<array{rio:string,nom:string,prenom:string,grade:string,role:string,specialites:list<string>}>
 */
function pm_read_intranet_comptes_reference_safe_kind(string $kind): array
{
    $path = pm_intranet_comptes_reference_path_by_kind($kind);

    return pm_read_intranet_comptes_reference_safe_from_file($path);
}

/**
 * @return list<array{rio:string,nom:string,prenom:string,grade:string,role:string,specialites:list<string>}>
 */
function pm_read_intranet_comptes_reference_safe(): array
{
    return pm_read_intranet_comptes_reference_safe_kind('bmu');
}
