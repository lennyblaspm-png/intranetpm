<?php
declare(strict_types=1);

require_once __DIR__ . '/pm_supabase.php';

const PM_ROLES_DIRECTION = 'Direction';
const PM_ROLES_EFFECTIF = 'Effectif';

/**
 * Rôle Direction ou grade DPM / DRA / CDP — droits opérationnels (messagerie intranet, dispatch, congés, etc.).
 */
function pm_is_direction_member(?array $actor): bool
{
    if ($actor === null) {
        return false;
    }
    if ((string) ($actor['role'] ?? '') === PM_ROLES_DIRECTION) {
        return true;
    }

    return pm_is_triade_grade($actor);
}

/** Grade directeur, adjoint ou chef de police (indépendamment du rôle fiche). */
function pm_is_triade_grade(?array $actor): bool
{
    if ($actor === null) {
        return false;
    }
    $g = strtoupper(str_replace("\xc2\xa0", ' ', trim((string) ($actor['grade'] ?? ''))));

    return $g === 'DPM' || $g === 'DRA' || $g === 'CDP';
}

/**
 * Tête de triade : grade DPM / DRA / CDP et rôle Direction — recrutement, messagerie recrutement, gestion des comptes.
 * (Un grade triade avec rôle Effectif — fiche mal paramétrée — ne modifie pas les comptes ni le recrutement.)
 */
function pm_is_triade_lead(?array $actor): bool
{
    if ($actor === null) {
        return false;
    }
    if ((string) ($actor['role'] ?? '') !== PM_ROLES_DIRECTION) {
        return false;
    }

    return pm_is_triade_grade($actor);
}

const PM_LENNY_RIO = '6452182';
const PM_STORAGE_KEY = 'PM_INTRANET_OFFICIAL_ACCOUNTS';
/** JSON dans store.json : texte d'annonce Dispatch (lecture tout effectif, écriture Direction). */
const PM_DISPATCH_ANNONCE_KEY = 'PM_INTRANET_DISPATCH_ANNONCE';
/** JSON : messagerie « Contacter la Direction » (fusion serveur à chaque PUT /storage). */
const PM_INTRANET_CONTACTS_KEY = 'PM_INTRANET_CONTACTS';
/** JSON : liste d’identifiants de conversations définitivement supprimées (réunion serveur ∪ client). */
const PM_INTRANET_CONTACTS_REMOVED_KEY = 'PM_INTRANET_CONTACTS_REMOVED';

/** @return list<array{rio:string,password:string,nom:string,prenom:string,grade:string,role:string,specialites:list<string>}> */
function pm_initial_accounts(): array
{
    // MAJ086: retrait du compte direction générique (admin) — seuls comptes nominatifs conservés
    return [
        ['rio' => '123', 'password' => '123', 'nom' => 'TEST', 'prenom' => 'Agent', 'grade' => 'GRP', 'role' => PM_ROLES_EFFECTIF, 'specialites' => ['BMU'], 'webhookUrl' => ''],
        ['rio' => PM_LENNY_RIO, 'password' => 'Lenny2010+', 'nom' => 'BLAS', 'prenom' => 'Lenny', 'grade' => 'DPM', 'role' => PM_ROLES_DIRECTION, 'specialites' => [], 'webhookUrl' => ''],
        ['rio' => '4528259', 'password' => '350075Mn@.', 'nom' => 'DUPONT', 'prenom' => 'Quentin', 'grade' => 'CDP', 'role' => PM_ROLES_DIRECTION, 'specialites' => ['BMU'], 'webhookUrl' => ''],
    ];
}

function pm_project_root(): string
{
    return dirname(__DIR__);
}

function pm_data_dir(): string
{
    if (pm_is_vercel()) {
        $tmp = '/tmp/pm_data';
        if (!is_dir($tmp)) @mkdir($tmp, 0775, true);
        // Seed from deployment on first request
        $seed = pm_project_root() . DIRECTORY_SEPARATOR . 'data';
        if (is_dir($seed) && $tmp !== $seed) {
            foreach (['store.json', 'candidatures.json', 'recrutement_messages.json'] as $f) {
                $src = $seed . DIRECTORY_SEPARATOR . $f;
                $dst = $tmp . DIRECTORY_SEPARATOR . $f;
                if (is_file($src) && !is_file($dst)) {
                    @copy($src, $dst);
                }
            }
        }
        return $tmp;
    }
    return pm_project_root() . DIRECTORY_SEPARATOR . 'data';
}

function pm_store_path(): string
{
    return pm_data_dir() . DIRECTORY_SEPARATOR . 'store.json';
}

function pm_ensure_data_dir(): void
{
    $dir = pm_data_dir();
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
}

/** @return array<string, mixed> */
function pm_default_store(): array
{
    return [PM_STORAGE_KEY => json_encode(pm_initial_accounts(), JSON_UNESCAPED_UNICODE)];
}

function pm_is_vercel(): bool
{
    $url  = $_SERVER['VERCEL_URL'] ?? getenv('VERCEL_URL') ?: '';
    $env  = $_SERVER['VERCEL_ENV'] ?? getenv('VERCEL_ENV') ?: '';
    return str_contains($url, 'vercel.app') || strtolower($env) === 'production';
}

/**
 * @return array<string, mixed>
 */
function pm_read_store(): array
{
    if (pm_is_vercel()) {
        try {
            $all = pm_supabase_kv_get_all();
            if ($all !== []) {
                return $all;
            }
            // Supabase vide : retourner les defaults SANS écrire (écriture = PUT /storage ou seed)
            return pm_default_store();
        } catch (\Throwable $e) {
            error_log('[PM SUPABASE] read_store failed: ' . $e->getMessage());
            return pm_default_store();
        }
    }
    // Local file fallback
    pm_ensure_data_dir();
    $path = pm_store_path();
    if (!is_file($path)) {
        $d = pm_default_store();
        file_put_contents($path, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        return $d;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return pm_default_store();
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return pm_default_store();
    }
    return $data;
}

/**
 * @param array<string, mixed> $store
 */
function pm_write_store(array $store): void
{
    if (pm_is_vercel()) {
        try {
            pm_supabase_kv_set_all($store);
            return;
        } catch (\Throwable $e) {
            error_log('[PM SUPABASE] write_store failed: ' . $e->getMessage());
        }
    }
    // Local file fallback
    pm_ensure_data_dir();
    file_put_contents(pm_store_path(), json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

/**
 * @param array<string, mixed> $store
 */
function pm_ensure_lenny_in_accounts(array &$store): void
{
    $raw = $store[PM_STORAGE_KEY] ?? '[]';
    $accounts = json_decode(is_string($raw) ? $raw : '[]', true);
    if (!is_array($accounts)) {
        $accounts = pm_initial_accounts();
    }
    $list = [];
    foreach ($accounts as $row) {
        if (is_array($row)) {
            $list[] = $row;
        }
    }
    $accounts = $list;
    $hasLenny = false;
    foreach ($accounts as $u) {
        if (isset($u['rio']) && (string) $u['rio'] === PM_LENNY_RIO) {
            $hasLenny = true;
            break;
        }
    }
    if (!$hasLenny) {
        foreach (pm_initial_accounts() as $u) {
            if ($u['rio'] === PM_LENNY_RIO) {
                $accounts[] = $u;
                break;
            }
        }
        $store[PM_STORAGE_KEY] = json_encode($accounts, JSON_UNESCAPED_UNICODE);
        pm_write_store($store);
    }
}

/**
 * @param array<string, mixed> $store
 * @return list<array<string, mixed>>
 */
function pm_get_accounts_from_store(array $store): array
{
    $raw = $store[PM_STORAGE_KEY] ?? '[]';
    $arr = json_decode(is_string($raw) ? $raw : '[]', true);
    if (!is_array($arr)) {
        return pm_initial_accounts();
    }
    $out = [];
    foreach ($arr as $row) {
        if (is_array($row)) {
            $out[] = $row;
        }
    }
    return $out !== [] ? $out : pm_initial_accounts();
}

/**
 * Met à jour uniquement la ligne du compte connecté (fiche agent : séries, téléphone, mot de passe).
 * Les autres comptes restent ceux du serveur — utilisé sur PUT /storage si l’acteur n’est pas tête de triade.
 *
 * @return string|null JSON du tableau comptes, ou null si rien à appliquer
 */
function pm_apply_account_self_service_patch(array $currentStore, string $clientAccountsJson, array $actor): ?string
{
    $rioNorm = strtolower(trim((string) ($actor['rio'] ?? '')));
    if ($rioNorm === '') {
        return null;
    }
    $clientDecoded = json_decode($clientAccountsJson, true);
    if (!is_array($clientDecoded)) {
        return null;
    }
    $selfFromClient = null;
    foreach ($clientDecoded as $row) {
        if (!is_array($row)) {
            continue;
        }
        if (strtolower(trim((string) ($row['rio'] ?? ''))) === $rioNorm) {
            $selfFromClient = $row;
            break;
        }
    }
    if ($selfFromClient === null) {
        return null;
    }
    $allowed = ['serieArmeService', 'seriePie', 'serieLbd', 'phone', 'password', 'webhookUrl', 'specialites', 'photo', 'email', 'emailIG', 'emailPerso', 'phoneIG', 'discordId'];
    $patch = [];
    foreach ($allowed as $k) {
        if (!array_key_exists($k, $selfFromClient)) continue;
        $v = $selfFromClient[$k];
        if ($k === 'specialites') {
            if (is_array($v)) {
                $clean = [];
                foreach ($v as $s) { $t = trim((string)$s); if ($t !== '' && count($clean) < 2) $clean[] = $t; }
                $patch[$k] = $clean;
            }
            continue;
        }
        if ($k === 'webhookUrl') {
            $patch[$k] = is_string($v) ? trim($v) : '';
            if ($patch[$k] !== '' && !str_starts_with($patch[$k], 'https://')) $patch[$k] = '';
            continue;
        }
        if ($k === 'photo') {
            $s = is_string($v) ? trim($v) : '';
            if ($s !== '' && !str_starts_with($s, 'data:image/')) $s = '';
            if (strlen($s) > 500000) $s = substr($s, 0, 500000);
            $patch[$k] = $s;
            continue;
        }
        $patch[$k] = is_string($v) || is_int($v) || is_float($v) ? (string) $v : '';
    }
    if ($patch === []) {
        return null;
    }
    $serverAccounts = pm_get_accounts_from_store($currentStore);
    $out = [];
    $found = false;
    foreach ($serverAccounts as $row) {
        if (!is_array($row)) {
            continue;
        }
        if (strtolower(trim((string) ($row['rio'] ?? ''))) === $rioNorm) {
            $found = true;
            $out[] = array_merge($row, $patch);
        } else {
            $out[] = $row;
        }
    }
    if (!$found) {
        return null;
    }

    return json_encode($out, JSON_UNESCAPED_UNICODE);
}

/**
 * @param array<string, mixed>|null $user
 * @return array<string, mixed>|null
 */
function pm_public_user(?array $user): ?array
{
    if ($user === null) {
        return null;
    }
    $out = $user;
    unset($out['password']);
    $out['mustChangePassword'] = !empty($out['mustChangePassword']);
    return $out;
}

/**
 * @param array<string, mixed> $store
 * @return array{error?:string,user?:array<string,mixed>,accounts:list<array<string,mixed>>}
 */
function pm_find_user(array $store, string $rio, string $password): array
{
    $accounts = pm_get_accounts_from_store($store);
    $rioNorm = strtolower(trim($rio));
    $u = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower(trim((string) $a['rio'])) === $rioNorm) {
            $u = $a;
            break;
        }
    }
    if ($u === null) {
        return ['error' => 'rio', 'accounts' => $accounts];
    }
    if ((string) ($u['password'] ?? '') !== trim($password)) {
        return ['error' => 'password', 'accounts' => $accounts];
    }
    return ['user' => $u, 'accounts' => $accounts];
}

function pm_is_local_loopback_request(): bool
{
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $hostname = explode(':', $host, 2)[0];
    if ($hostname !== 'localhost' && $hostname !== '127.0.0.1') {
        return false;
    }
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $devBypass = getenv('DEV_LOOPBACK_SOFT') === '1' || getenv('DEV_LOOPBACK_SOFT') === 'true';
    if ($devBypass) {
        return true;
    }
    return $ip === '127.0.0.1'
        || $ip === '::1'
        || $ip === '::ffff:127.0.0.1'
        || $ip === '::ffff:127.1';
}

/**
 * Compte intranet correspondant à la session (sans revalidation du mot de passe).
 *
 * @param array<string, mixed> $store
 * @return array<string, mixed>|null
 */
function pm_auth_user_from_session(array $store): ?array
{
    $rio = isset($_SESSION['rio']) ? trim((string) $_SESSION['rio']) : '';
    if ($rio === '') {
        return null;
    }
    $accounts = pm_get_accounts_from_store($store);
    $rioLow = strtolower($rio);
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower(trim((string) $a['rio'])) === $rioLow) {
            return $a;
        }
    }
    return null;
}

function pm_sanitize_dispatch_annonce_text(string $body): string
{
    $t = trim(strip_tags($body));
    $max = 20000;
    if (mb_strlen($t, 'UTF-8') > $max) {
        return mb_substr($t, 0, $max, 'UTF-8');
    }
    return $t;
}

/**
 * @param array<string, mixed> $store
 * @return array{text:string,updated_at:string,updated_by:string}
 */
function pm_dispatch_annonce_get(array $store): array
{
    $raw = $store[PM_DISPATCH_ANNONCE_KEY] ?? '';
    if (!is_string($raw) || $raw === '') {
        return ['text' => '', 'updated_at' => '', 'updated_by' => ''];
    }
    $j = json_decode($raw, true);
    if (!is_array($j)) {
        return ['text' => '', 'updated_at' => '', 'updated_by' => ''];
    }
    return [
        'text' => (string) ($j['text'] ?? ''),
        'updated_at' => (string) ($j['updated_at'] ?? ''),
        'updated_by' => (string) ($j['updated_by'] ?? ''),
    ];
}

/**
 * @param array<string, mixed> $store
 */
function pm_dispatch_annonce_set(array &$store, string $text, string $authorLabel): void
{
    $store[PM_DISPATCH_ANNONCE_KEY] = json_encode(
        [
            'text' => $text,
            'updated_at' => gmdate('c'),
            'updated_by' => $authorLabel,
        ],
        JSON_UNESCAPED_UNICODE
    );
}

/**
 * @return string JSON array of unique string ids (max ~4000 entries).
 */
function pm_merge_contact_removed_ids(?string $serverJson, ?string $clientJson): string
{
    $out = [];
    foreach ([$serverJson, $clientJson] as $raw) {
        $arr = json_decode((string) ($raw ?? '[]'), true);
        if (!is_array($arr)) {
            continue;
        }
        foreach ($arr as $id) {
            $sid = trim((string) $id);
            if ($sid !== '') {
                $out[$sid] = true;
            }
        }
    }
    $list = array_keys($out);
    if (count($list) > 4000) {
        $list = array_slice($list, 0, 4000);
    }
    sort($list, SORT_STRING);

    return json_encode($list, JSON_UNESCAPED_UNICODE);
}

/**
 * Fusionne deux états JSON de messagerie intranet (conversations + fils) pour éviter
 * qu’une session obsolète (ex. Direction) n’écrase les messages d’un autre utilisateur.
 */
function pm_merge_intranet_contact_threads(array $a, array $b): array
{
    $byMid = [];
    foreach ([$a, $b] as $conv) {
        $th = $conv['thread'] ?? null;
        if (!is_array($th)) {
            continue;
        }
        foreach ($th as $m) {
            if (!is_array($m)) {
                continue;
            }
            $mid = isset($m['id']) ? (string) $m['id'] : '';
            if ($mid === '') {
                continue;
            }
            $byMid[$mid] = $m;
        }
    }
    $thread = array_values($byMid);
    usort(
        $thread,
        static function (array $x, array $y): int {
            $tx = strtotime((string) ($x['at'] ?? '')) ?: 0;
            $ty = strtotime((string) ($y['at'] ?? '')) ?: 0;
            return $tx <=> $ty;
        }
    );

    return $thread;
}

/**
 * @return array<string, mixed>
 */
function pm_merge_intranet_contact_row(array $left, array $right): array
{
    $tuLeft = strtotime((string) ($left['updatedAt'] ?? $left['timestamp'] ?? '')) ?: 0;
    $tuRight = strtotime((string) ($right['updatedAt'] ?? $right['timestamp'] ?? '')) ?: 0;
    $meta = $tuRight >= $tuLeft ? $right : $left;
    $meta['thread'] = pm_merge_intranet_contact_threads($left, $right);
    $lastMs = 0;
    foreach ($meta['thread'] as $m) {
        if (!is_array($m)) {
            continue;
        }
        $lastMs = max($lastMs, strtotime((string) ($m['at'] ?? '')) ?: 0);
    }
    if ($lastMs > 0) {
        $meta['updatedAt'] = gmdate('c', $lastMs);
    }

    return $meta;
}

function pm_merge_intranet_contacts(string $serverJson, string $clientJson, string $removedIdsJson): string
{
    $removed = json_decode($removedIdsJson, true);
    if (!is_array($removed)) {
        $removed = [];
    }
    $removedFlip = [];
    foreach ($removed as $rid) {
        $removedFlip[trim((string) $rid)] = true;
    }

    $serverList = json_decode($serverJson, true);
    $clientList = json_decode($clientJson, true);
    if (!is_array($serverList)) {
        $serverList = [];
    }
    if (!is_array($clientList)) {
        $clientList = [];
    }
    $byId = [];
    foreach ($serverList as $c) {
        if (!is_array($c) || !isset($c['id'])) {
            continue;
        }
        $id = (string) $c['id'];
        if (isset($removedFlip[$id])) {
            continue;
        }
        $byId[$id] = $c;
    }
    foreach ($clientList as $c) {
        if (!is_array($c) || !isset($c['id'])) {
            continue;
        }
        $id = (string) $c['id'];
        if (isset($removedFlip[$id])) {
            unset($byId[$id]);
            continue;
        }
        if (!isset($byId[$id])) {
            $byId[$id] = $c;
            continue;
        }
        $byId[$id] = pm_merge_intranet_contact_row($byId[$id], $c);
    }
    $list = array_values($byId);
    usort(
        $list,
        static function (array $x, array $y): int {
            $tx = strtotime((string) ($x['updatedAt'] ?? $x['timestamp'] ?? '')) ?: 0;
            $ty = strtotime((string) ($y['updatedAt'] ?? $y['timestamp'] ?? '')) ?: 0;
            return $ty <=> $tx;
        }
    );

    return json_encode($list, JSON_UNESCAPED_UNICODE);
}
