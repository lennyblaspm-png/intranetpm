<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/pm_hosting_config.php';
require_once __DIR__ . '/includes/pm_store.php';

// Quick Supabase test — before session_start to avoid crash blocking
$uri_quick = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($uri_quick === '/api/debug/supabase') {
    header('Content-Type: application/json');
    $r = [];
    try { pm_supabase_kv_set('_test_' . time(), gmdate('c')); $r['write'] = 'OK'; } catch (\Throwable $e) { $r['write'] = 'FAIL: ' . $e->getMessage(); }
    try { $all = pm_supabase_kv_get_all(); $r['count'] = count($all); $r['keys'] = array_slice(array_keys($all), 0, 10); } catch (\Throwable $e) { $r['count'] = 'FAIL: ' . $e->getMessage(); }
    echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function pm_send_discord_webhook(string $url, array $payload): void {
    if ($url === '' || !str_starts_with($url, 'https://')) return;
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) return;
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $json,
            'timeout' => 4,
            'ignore_errors' => true,
        ]
    ];
    @file_get_contents($url, false, stream_context_create($opts));
}
function pm_get_webhook_url(array $store, string $type): string {
    $raw = $store['PM_INTRANET_WEBHOOKS'] ?? '';
    if (!is_string($raw) || $raw === '') return '';
    $data = json_decode($raw, true);
    if (!is_array($data)) return '';
    // Format objet {saisie:url, tir:url, ...}
    if (isset($data[$type]) && is_string($data[$type])) return trim($data[$type]);
    // Format tableau [{id,url,nom},...]
    foreach ($data as $row) {
        if (!is_array($row)) continue;
        $id = strtolower(trim((string)($row['id'] ?? $row['nom'] ?? '')));
        if ($id === strtolower($type)) {
            $url = trim((string)($row['url'] ?? ''));
            if ($url !== '') return $url;
        }
        // fallback partiel
        if (str_contains($id, strtolower($type))) {
            $url = trim((string)($row['url'] ?? ''));
            if ($url !== '') return $url;
        }
    }
    return '';
}

$pmHostingConfig = pm_load_hosting_config();
$secure = pm_session_cookie_secure($pmHostingConfig);
$cookiePath = pm_cookie_path($pmHostingConfig);
$sessionPath = (str_contains($_SERVER['VERCEL_URL'] ?? '', 'vercel.app') ? '/tmp' : __DIR__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'sessions';
if (!is_dir($sessionPath)) {
    @mkdir($sessionPath, 0775, true);
}
if (is_dir($sessionPath) && is_writable($sessionPath)) {
    session_save_path($sessionPath);
} else {
    error_log('[PM DEBUG] Session path not writable: ' . $sessionPath);
}

session_set_cookie_params([
    'lifetime' => 7 * 24 * 60 * 60,
    'path' => $cookiePath,
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_name('pm_intranet_sid');
ini_set('session.use_strict_mode', '1');
// Renforce l'entropie du cookie de session (équivalent conceptuel au secret côté Node).
ini_set('session.sid_length', '48');
session_start();
error_log('[PM DEBUG] Session start id=' . session_id() . ' save_path=' . session_save_path() . ' cookie_path=' . $cookiePath);

/**
 * @param mixed $data
 */
function pm_json_response($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function pm_require_session(): void
{
    if (!empty($_SESSION['rio'])) return;
    // Cookie auth fallback for serverless (Vercel)
    pm_load_auth_cookie();
    if (!empty($_SESSION['rio'])) return;
    pm_json_response(['error' => 'Non connecté.'], 401);
}

function pm_auth_secret(): string {
    return 'pm_intr_key_93RP_2024';
}

function pm_set_auth_cookie(string $rio): void {
    $secret = pm_auth_secret();
    $payload = $rio . '|' . time();
    $sig = hash_hmac('sha256', $payload, $secret);
    $token = base64_encode($payload . '|' . $sig);
    setcookie('pm_auth', $token, [
        'expires' => time() + 7 * 24 * 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function pm_load_auth_cookie(): void {
    $token = $_COOKIE['pm_auth'] ?? '';
    if ($token === '') return;
    $decoded = base64_decode($token, true);
    if ($decoded === false) return;
    $parts = explode('|', $decoded);
    if (count($parts) !== 3) return;
    [$rio, $ts, $sig] = $parts;
    $payload = $rio . '|' . $ts;
    $expected = hash_hmac('sha256', $payload, pm_auth_secret());
    if (!hash_equals($expected, $sig)) return;
    if (time() - (int)$ts > 7 * 24 * 3600) return;
    $_SESSION['rio'] = $rio;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
$path = pm_normalize_uri_path($rawPath, $pmHostingConfig);

// Normaliser /api et /api/...
if (!str_starts_with($path, '/api')) {
    pm_json_response(['error' => 'Not found.'], 404);
}

$sub = substr($path, strlen('/api'));
if ($sub === '' || $sub === false) {
    $sub = '/';
} else {
    $sub = '/' . ltrim($sub, '/');
}

// ─── IA Routes ───────────────────────────────────────────────────

// ─── Integration Exam API ───
require_once __DIR__ . '/includes/pm_examens.php';
require_once __DIR__ . '/includes/pm_candidatures.php';

// GET /api/integration-exam/questions — get randomized questions (authenticated)
if ($method === 'GET' && $sub === '/integration-exam/questions') {
    pm_require_session();
    $questions = pm_get_integration_questions_randomized();
    $safe = array_map(function ($q) {
        unset($q['correct'], $q['accept']);
        return $q;
    }, $questions);
    pm_json_response([
        'questions' => $safe,
        'total_questions' => count($safe),
        'pass_score' => PM_INTEGRATION_PASS_SCORE,
        'total_score' => PM_INTEGRATION_TOTAL_SCORE,
        'time_minutes' => PM_INTEGRATION_TIME_MINUTES,
    ]);
}

// POST /api/integration-exam/submit — grade and store results (authenticated)
if ($method === 'POST' && $sub === '/integration-exam/submit') {
    pm_require_session();
    set_time_limit(60);
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $answers = $body['answers'] ?? [];
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $proctoring = is_array($body['proctoring'] ?? null) ? $body['proctoring'] : [];

    if ($nom === '' || $prenom === '') {
        pm_json_response(['error' => 'Nom et prénom requis.'], 400);
    }

    $questions = pm_get_integration_questions();
    $grading = pm_grade_integration_exam($answers, $questions);

    $store = pm_read_examens_store();
    $code = 'INT-' . strtoupper(bin2hex(random_bytes(4)));
    pm_add_examen_result($store, $code, 'INTEGRATION', $nom, $prenom, $grading['earned_points'], $answers, $proctoring, $grading);
    pm_write_examens_store($store);

    pm_json_response([
        'ok' => true,
        'score' => $grading['earned_points'],
        'total' => $grading['total_points'],
        'passed' => $grading['passed'],
        'pass_score' => PM_INTEGRATION_PASS_SCORE,
        'verify_count' => $grading['verify_count'],
        'details' => $grading['details'],
    ]);
}

// GET /api/opj-exam/questions — get OPJ randomized questions (authenticated)
if ($method === 'GET' && $sub === '/opj-exam/questions') {
    pm_require_session();
    $questions = pm_get_opj_questions_randomized();
    $safe = array_map(function ($q) {
        unset($q['correct'], $q['accept']);
        return $q;
    }, $questions);
    pm_json_response([
        'questions' => $safe,
        'total_questions' => count($safe),
        'pass_score' => PM_OPJ_PASS_SCORE,
        'total_score' => PM_OPJ_TOTAL_SCORE,
        'time_minutes' => PM_OPJ_TIME_MINUTES,
    ]);
}

// POST /api/opj-exam/submit — grade and store OPJ results (authenticated)
if ($method === 'POST' && $sub === '/opj-exam/submit') {
    pm_require_session();
    set_time_limit(60);
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $answers = $body['answers'] ?? [];
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $proctoring = is_array($body['proctoring'] ?? null) ? $body['proctoring'] : [];

    if ($nom === '' || $prenom === '') {
        pm_json_response(['error' => 'Nom et prénom requis.'], 400);
    }

    $questions = pm_get_opj_questions();
    $grading = pm_grade_opj_exam($answers, $questions);

    $store = pm_read_examens_store();
    pm_add_examen_result($store, $code, 'OPJ', $nom, $prenom, $grading['earned_points'], $answers, $proctoring, $grading);
    pm_write_examens_store($store);

    pm_json_response([
        'ok' => true,
        'score' => $grading['earned_points'],
        'total' => $grading['total_points'],
        'passed' => $grading['passed'],
        'pass_score' => PM_OPJ_PASS_SCORE,
        'verify_count' => $grading['verify_count'],
        'details' => $grading['details'],
    ]);
}

// GET /api/ciapt1-exam/questions — get CIAPT 1 randomized questions (authenticated)
if ($method === 'GET' && $sub === '/ciapt1-exam/questions') {
    pm_require_session();
    $questions = pm_get_ciapt1_questions_randomized();
    $safe = array_map(function ($q) {
        unset($q['correct'], $q['accept']);
        return $q;
    }, $questions);
    pm_json_response([
        'questions' => $safe,
        'total_questions' => count($safe),
        'pass_score' => PM_CIAPT1_PASS_SCORE,
        'total_score' => PM_CIAPT1_TOTAL_SCORE,
        'time_minutes' => PM_CIAPT1_TIME_MINUTES,
    ]);
}

// POST /api/ciapt1-exam/submit — grade and store CIAPT 1 results (authenticated)
if ($method === 'POST' && $sub === '/ciapt1-exam/submit') {
    pm_require_session();
    set_time_limit(60);
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $answers = $body['answers'] ?? [];
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $proctoring = is_array($body['proctoring'] ?? null) ? $body['proctoring'] : [];

    if ($nom === '' || $prenom === '') {
        pm_json_response(['error' => 'Nom et prénom requis.'], 400);
    }

    $questions = pm_get_ciapt1_questions();
    $grading = pm_grade_ciapt1_exam($answers, $questions);

    $store = pm_read_examens_store();
    pm_add_examen_result($store, $code, 'CIAPT_1', $nom, $prenom, $grading['earned_points'], $answers, $proctoring, $grading);
    pm_write_examens_store($store);

    pm_json_response([
        'ok' => true,
        'score' => $grading['earned_points'],
        'total' => $grading['total_points'],
        'passed' => $grading['passed'],
        'pass_score' => PM_CIAPT1_PASS_SCORE,
        'verify_count' => $grading['verify_count'],
        'details' => $grading['details'],
    ]);
}

// GET /api/apja-exam/questions — get APJA randomized questions (authenticated)
if ($method === 'GET' && $sub === '/apja-exam/questions') {
    pm_require_session();
    $questions = pm_get_apja_questions_randomized();
    $safe = array_map(function ($q) {
        unset($q['correct'], $q['accept']);
        return $q;
    }, $questions);
    pm_json_response([
        'questions' => $safe,
        'total_questions' => count($safe),
        'pass_score' => PM_APJA_PASS_SCORE,
        'total_score' => PM_APJA_TOTAL_SCORE,
        'time_minutes' => PM_APJA_TIME_MINUTES,
    ]);
}

// POST /api/apja-exam/submit — grade and store APJA results (authenticated)
if ($method === 'POST' && $sub === '/apja-exam/submit') {
    pm_require_session();
    set_time_limit(60);
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $answers = $body['answers'] ?? [];
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $proctoring = is_array($body['proctoring'] ?? null) ? $body['proctoring'] : [];

    if ($nom === '' || $prenom === '') {
        pm_json_response(['error' => 'Nom et prénom requis.'], 400);
    }

    $questions = pm_get_apja_questions();
    $grading = pm_grade_apja_exam($answers, $questions);

    $store = pm_read_examens_store();
    pm_add_examen_result($store, $code, 'APJA', $nom, $prenom, $grading['earned_points'], $answers, $proctoring, $grading);
    pm_write_examens_store($store);

    pm_json_response([
        'ok' => true,
        'score' => $grading['earned_points'],
        'total' => $grading['total_points'],
        'passed' => $grading['passed'],
        'pass_score' => PM_APJA_PASS_SCORE,
        'verify_count' => $grading['verify_count'],
        'details' => $grading['details'],
    ]);
}

// GET /api/integration-exam/results — list all integration exam results (Direction only)
if ($method === 'GET' && $sub === '/integration-exam/results') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction.'], 403);
    }

    $exStore = pm_read_examens_store();
    $results = array_filter($exStore['results'], function ($r) {
        return ($r['examen_type'] ?? '') === 'INTEGRATION';
    });
    $results = array_values($results);
    usort($results, function ($a, $b) {
        return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    });
    pm_json_response(['results' => $results]);
}

// --- Integration Form API ---

require_once __DIR__ . '/includes/pm_integration_form.php';

// POST /api/integration-codes/generate (Direction/Recruteur only)
if ($method === 'POST' && $sub === '/integration-codes/generate') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $count = max(1, min(20, (int) ($body['count'] ?? 1)));

    $formStore = pm_read_integration_form_store();
    $codes = [];
    for ($i = 0; $i < $count; $i++) {
        $code = pm_generate_integration_code();
        $formStore['codes'][] = [
            'code' => $code,
            'created_by' => $rio,
            'created_at' => gmdate('c'),
            'used' => false,
        ];
        $codes[] = $code;
    }
    pm_write_integration_form_store($formStore);
    pm_json_response(['ok' => true, 'codes' => $codes]);
}

// GET /api/integration-codes/list (Direction/Recruteur only)
if ($method === 'GET' && $sub === '/integration-codes/list') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $formStore = pm_read_integration_form_store();
    pm_json_response(['codes' => $formStore['codes']]);
}

// POST /api/integration-form/verify-code (public)
if ($method === 'POST' && $sub === '/integration-form/verify-code') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    if ($code === '') {
        pm_json_response(['error' => 'Code requis.'], 400);
    }

    $formStore = pm_read_integration_form_store();
    $valid = pm_find_valid_code($formStore, $code);
    if ($valid === null) {
        pm_json_response(['error' => 'Code invalide ou déjà utilisé.'], 401);
    }
    pm_json_response(['ok' => true]);
}

// GET /api/integration-form/questions (public — requires valid code via header)
if ($method === 'GET' && $sub === '/integration-form/questions') {
    $code = strtoupper(trim((string) ($_GET['code'] ?? '')));
    if ($code === '') {
        pm_json_response(['error' => 'Code requis.'], 400);
    }
    $formStore = pm_read_integration_form_store();
    $valid = pm_find_valid_code($formStore, $code);
    if ($valid === null) {
        pm_json_response(['error' => 'Code invalide ou déjà utilisé.'], 401);
    }
    $questions = pm_get_integration_questions_randomized();
    $safe = array_map(function ($q) {
        unset($q['correct'], $q['accept']);
        return $q;
    }, $questions);
    pm_json_response([
        'ok' => true,
        'questions' => $safe,
        'total_questions' => count($safe),
        'total_points' => PM_INTEGRATION_TOTAL_SCORE,
        'pass_score' => PM_INTEGRATION_PASS_SCORE,
        'time_minutes' => PM_INTEGRATION_TIME_MINUTES,
    ]);
}

// POST /api/integration-form/submit (public — server-side grading)
if ($method === 'POST' && $sub === '/integration-form/submit') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $answers = $body['answers'] ?? [];
    $nom = trim((string) ($body['nom'] ?? ''));
    $prenom = trim((string) ($body['prenom'] ?? ''));

    if ($code === '') {
        pm_json_response(['error' => 'Code requis.'], 400);
    }

    $formStore = pm_read_integration_form_store();
    $valid = pm_find_valid_code($formStore, $code);
    if ($valid === null) {
        pm_json_response(['error' => 'Code invalide ou déjà utilisé.'], 401);
    }

    $questions = pm_get_integration_questions();
    $grading = pm_grade_integration_exam($answers, $questions);

    pm_mark_code_used($formStore, $code);

    $candidateName = null;
    if (!empty($_SESSION['rio'])) {
        $accounts = pm_get_accounts_from_store(pm_read_store());
        $actorRio = strtolower((string) $_SESSION['rio']);
        foreach ($accounts as $a) {
            if (isset($a['rio']) && strtolower((string) $a['rio']) === $actorRio) {
                $candidateName = trim(($a['prenom'] ?? '') . ' ' . ($a['nom'] ?? ''));
                break;
            }
        }
    }
    if ($nom !== '' || $prenom !== '') {
        $candidateName = trim($prenom . ' ' . $nom);
    }

    pm_add_integration_result($formStore, $code, $grading['earned_points'], $answers, $candidateName !== '' ? $candidateName : null);
    pm_write_integration_form_store($formStore);
    pm_json_response([
        'ok' => true,
        'score' => $grading['earned_points'],
        'total' => $grading['total_points'],
        'passed' => $grading['passed'],
        'pass_score' => PM_INTEGRATION_PASS_SCORE,
        'verify_count' => $grading['verify_count'],
        'details' => $grading['details'],
    ]);
}

// GET /api/integration-form/results (Direction/Recruteur only)
if ($method === 'GET' && $sub === '/integration-form/results') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $formStore = pm_read_integration_form_store();
    $results = $formStore['results'];
    usort($results, function ($a, $b) {
        return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    });
    pm_json_response(['results' => $results]);
}

// --- Routes ---

if ($method === 'POST' && $sub === '/auth/login') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) {
        $body = [];
    }
    $rio = isset($body['rio']) ? (string) $body['rio'] : '';
    $password = isset($body['password']) ? (string) $body['password'] : '';
    error_log('[PM DEBUG] POST /api/auth/login attempt rio=' . $rio);
    if ($rio === '' || $password === '') {
        error_log('[PM DEBUG] POST /api/auth/login rejected: missing fields');
        pm_json_response(['error' => 'Champs requis.'], 400);
    }
    $store = pm_read_store();
    pm_ensure_lenny_in_accounts($store);
    $store = pm_read_store();
    $found = pm_find_user($store, $rio, $password);
    if (isset($found['error']) && $found['error'] === 'rio') {
        error_log('[PM DEBUG] POST /api/auth/login rejected: rio not found (' . $rio . ')');
        pm_json_response(['error' => 'RIO introuvable.'], 401);
    }
    if (isset($found['error']) && $found['error'] === 'password') {
        error_log('[PM DEBUG] POST /api/auth/login rejected: wrong password (' . $rio . ')');
        pm_json_response(['error' => 'Mot de passe incorrect.'], 401);
    }
    if (!isset($found['user'])) {
        error_log('[PM DEBUG] POST /api/auth/login failed: user not resolved');
        pm_json_response(['error' => 'Échec de connexion.'], 500);
    }
    $_SESSION['rio'] = (string) ($found['user']['rio'] ?? '');
    pm_set_auth_cookie($_SESSION['rio']);
    session_write_close();
    error_log('[PM DEBUG] POST /api/auth/login success rio=' . $_SESSION['rio']);
    pm_json_response(['user' => pm_public_user($found['user'])]);
}

if ($method === 'POST' && $sub === '/auth/dev-session') {
    error_log('[PM DEBUG] POST /api/auth/dev-session attempt');
    if (!pm_is_local_loopback_request()) {
        error_log('[PM DEBUG] POST /api/auth/dev-session rejected: not loopback');
        pm_json_response(['error' => 'Accès réservé à localhost depuis la machine locale.'], 403);
    }
    $store = pm_read_store();
    pm_ensure_lenny_in_accounts($store);
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $admin = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === 'admin') {
            $admin = $a;
            break;
        }
    }
    if ($admin === null && $accounts !== []) {
        $admin = $accounts[0];
    }
    if ($admin === null) {
        error_log('[PM DEBUG] POST /api/auth/dev-session failed: no account');
        pm_json_response(['error' => 'Aucun compte.'], 500);
    }
    $_SESSION['rio'] = (string) ($admin['rio'] ?? '');
    pm_set_auth_cookie($_SESSION['rio']);
    session_write_close();
    pm_json_response([
        'user' => pm_public_user($admin),
        'notice' => 'Accès libre (développement local).',
    ]);
}

if ($method === 'POST' && $sub === '/auth/logout') {
    error_log('[PM DEBUG] POST /api/auth/logout rio=' . (string) ($_SESSION['rio'] ?? ''));
    $p = session_get_cookie_params();
    $sessName = session_name();
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    setcookie($sessName, '', [
        'expires' => time() - 43200,
        'path' => $p['path'] ?: '/',
        'domain' => $p['domain'] ?: '',
        'secure' => (bool) ($p['secure'] ?? false),
        'httponly' => true,
        'samesite' => is_string($p['samesite'] ?? null) ? $p['samesite'] : 'Lax',
    ]);
    setcookie('pm_auth', '', ['expires' => time() - 43200, 'path' => '/']);
    pm_json_response(['ok' => true]);
}

if ($method === 'GET' && $sub === '/auth/me') {
    pm_load_auth_cookie();
    $rio = isset($_SESSION['rio']) ? (string) $_SESSION['rio'] : '';
    if ($rio === '') {
        error_log('[PM DEBUG] GET /api/auth/me unauthorized: missing session');
        pm_json_response(['error' => 'Non connecté.'], 401);
    }
    $store = pm_read_store();
    pm_ensure_lenny_in_accounts($store);
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $user = null;
    $rioLow = strtolower($rio);
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rioLow) {
            $user = $a;
            break;
        }
    }
    if ($user === null) {
        error_log('[PM DEBUG] GET /api/auth/me invalid session for rio=' . $rio);
        $_SESSION = [];
        session_destroy();
        pm_json_response(['error' => 'Session invalide.'], 401);
    }
    error_log('[PM DEBUG] GET /api/auth/me success rio=' . $rio);
    pm_json_response(pm_public_user($user));
}

if ($method === 'POST' && $sub === '/auth/complete-setup') {
    $rio = isset($_SESSION['rio']) ? trim((string) $_SESSION['rio']) : '';
    if ($rio === '') {
        pm_json_response(['error' => 'Non connecté.'], 401);
    }
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) {
        $body = [];
    }
    $newPassword = isset($body['newPassword']) ? trim((string) $body['newPassword']) : '';
    $confirmPassword = isset($body['confirmPassword']) ? trim((string) $body['confirmPassword']) : '';
    $phoneIG = isset($body['phoneIG']) ? trim((string) $body['phoneIG']) : '';
    $emailIG = isset($body['emailIG']) ? trim((string) $body['emailIG']) : '';
    $emailPerso = isset($body['emailPerso']) ? trim((string) $body['emailPerso']) : '';
    $discordId = isset($body['discordId']) ? trim((string) $body['discordId']) : '';

    if ($newPassword === '' || $confirmPassword === '') {
        pm_json_response(['error' => 'Le mot de passe est obligatoire.'], 400);
    }
    if (mb_strlen($newPassword, 'UTF-8') < 8) {
        pm_json_response(['error' => 'Le mot de passe doit faire au moins 8 caractères.'], 400);
    }
    if ($newPassword !== $confirmPassword) {
        pm_json_response(['error' => 'Les mots de passe ne correspondent pas.'], 400);
    }
    if ($phoneIG === '' || $emailIG === '' || $emailPerso === '' || $discordId === '') {
        pm_json_response(['error' => 'Tous les champs sont obligatoires.'], 400);
    }

    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rioLow = strtolower($rio);
    $index = -1;
    foreach ($accounts as $i => $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rioLow) {
            $index = $i;
            break;
        }
    }
    if ($index === -1) {
        pm_json_response(['error' => 'Compte introuvable.'], 404);
    }

    $accounts[$index]['password'] = $newPassword;
    $accounts[$index]['mustChangePassword'] = false;
    $accounts[$index]['phoneIG'] = $phoneIG;
    $accounts[$index]['emailIG'] = $emailIG;
    $accounts[$index]['emailPerso'] = $emailPerso;
    $accounts[$index]['discordId'] = $discordId;

    $store['PM_INTRANET_OFFICIAL_ACCOUNTS'] = json_encode($accounts, JSON_UNESCAPED_UNICODE);
    pm_write_store($store);

    error_log('[PM DEBUG] POST /api/auth/complete-setup success rio=' . $rio);
    pm_json_response(['ok' => true, 'user' => pm_public_user($accounts[$index])]);
}

if ($method === 'GET' && $sub === '/storage') {
    pm_require_session();
    $store = pm_read_store();
    pm_ensure_lenny_in_accounts($store);
    $store = pm_read_store();
    $out = [];
    foreach ($store as $k => $v) {
        if (is_string($k) && is_string($v)) {
            $out[$k] = $v;
        }
    }
    pm_json_response($out);
}

if ($method === 'PUT' && $sub === '/storage') {
    pm_require_session();
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) {
        pm_json_response(['error' => 'Corps JSON invalide.'], 400);
    }
    $next = [];
    foreach ($body as $k => $v) {
        if (is_string($k) && is_string($v)) {
            $next[$k] = $v;
        }
    }
    // Merge avec le store serveur pour ne jamais perdre une clé (tous s'enregistre)
    $current = pm_read_store();
    $merged = $current;
    foreach ($next as $k => $v) {
        $merged[$k] = $v;
    }
    // Supprime les clés explicitement vidées par le client (optionnel)
    pm_ensure_lenny_in_accounts($merged);
    pm_write_store($merged);
    pm_json_response(['ok' => true]);
}

// --- Candidatures API ---

require_once __DIR__ . '/includes/pm_candidatures.php';
require_once __DIR__ . '/includes/pm_recrutement_messaging.php';
require_once __DIR__ . '/includes/pm_recrutement_reference.php';

// Candidature session helpers (session already started at top of api.php)
function pm_candidature_set_session(string $candidatureId): void
{
    $_SESSION['candidature_id'] = $candidatureId;
}
function pm_candidature_get_session(): string
{
    return isset($_SESSION['candidature_id']) ? (string) $_SESSION['candidature_id'] : '';
}
function pm_candidature_clear_session(): void
{
    unset($_SESSION['candidature_id']);
}

// POST /api/candidatures — Submit candidature (compte obligatoire)
if ($method === 'POST' && $sub === '/candidatures') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];

    $discord = pm_trim_text((string) ($body['discord'] ?? ''), 80);
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $age = pm_trim_text((string) ($body['age'] ?? ''), 10);
    $pole = strtoupper(trim((string) ($body['pole'] ?? '')));
    $disponibilites = pm_trim_text((string) ($body['disponibilites'] ?? ''), 4000);
    $experience = pm_trim_text((string) ($body['experience'] ?? ''), 12000);
    $motivation = pm_trim_text((string) ($body['motivation'] ?? ''), 12000);
    $password = (string) ($body['password'] ?? '');
    $civilEmail = pm_trim_text((string) ($body['civil_email'] ?? ''), 200);
    $civilNom = pm_trim_text((string) ($body['civil_nom'] ?? ''), 120);
    $civilPrenom = pm_trim_text((string) ($body['civil_prenom'] ?? ''), 120);

    // Nouveau : compte obligatoire — civil_email requis, password optionnel (ancien système rétro-compatible)
    $hasCivil = $civilEmail !== '' && filter_var($civilEmail, FILTER_VALIDATE_EMAIL);
    $hasPassword = $password !== '';

    if ($discord === '' || $nom === '' || $prenom === '' || $age === '') {
        pm_json_response(['error' => 'Champs obligatoires manquants.'], 400);
    }
    if (!$hasCivil && !$hasPassword) {
        pm_json_response(['error' => 'Compte requis : veuillez créer un compte et vous connecter pour postuler.'], 401);
    }
    if ($hasPassword && strlen($password) < 8) {
        pm_json_response(['error' => 'Le mot de passe doit faire au moins 8 caractères.'], 400);
    }
    if ($hasCivil && !filter_var($civilEmail, FILTER_VALIDATE_EMAIL)) {
        pm_json_response(['error' => 'Email civil invalide.'], 400);
    }
    if ($pole !== 'BMU' && $pole !== 'GSI' && $pole !== 'PM') {
        $pole = 'PM';
    }

    $store = pm_read_candidatures_store();
    $reference = pm_allocate_unique_candidature_reference($store);
    $newItem = [
        'id' => (string) time() . '-' . bin2hex(random_bytes(4)),
        'reference' => $reference,
        'created_at' => gmdate('c'),
        'discord' => $discord,
        'nom' => $nom,
        'prenom' => $prenom,
        'age' => $age,
        'pole' => $pole,
        'disponibilites' => $disponibilites,
        'experience' => $experience,
        'motivation' => $motivation,
        'password_hash' => $hasPassword ? password_hash($password, PASSWORD_DEFAULT) : '',
        'civil_email' => $hasCivil ? strtolower($civilEmail) : '',
        'civil_nom' => $civilNom,
        'civil_prenom' => $civilPrenom,
        'statut' => 'en_attente',
    ];
    $store['items'][] = $newItem;
    pm_write_candidatures_store($store);
    // Webhook Discord — Recrutement (embed)
    try {
        $mainStore = pm_read_store();
        $webhookUrl = pm_get_webhook_url($mainStore, 'recrutement');
        if ($webhookUrl !== '') {
            $embed = [
                'title' => "[RECRUTEMENT] Nouvelle candidature — {$pole} ({$reference})",
                'color' => 0x2563eb,
                'timestamp' => gmdate('c'),
                'footer' => ['text' => 'Police Municipale — Recrutement'],
                'fields' => [
                    ['name' => 'Candidat', 'value' => "{$prenom} {$nom} ({$discord}) — {$age} ans", 'inline' => false],
                    ['name' => 'Pôle', 'value' => $pole, 'inline' => true],
                    ['name' => 'Référence', 'value' => $reference, 'inline' => true],
                    ['name' => 'Disponibilités', 'value' => $disponibilites !== '' ? $disponibilites : '—', 'inline' => false],
                    ['name' => 'Expérience', 'value' => $experience !== '' ? mb_substr($experience, 0, 1024, 'UTF-8') : '—', 'inline' => false],
                    ['name' => 'Motivation', 'value' => $motivation !== '' ? mb_substr($motivation, 0, 1024, 'UTF-8') : '—', 'inline' => false],
                    ['name' => 'Compte civil', 'value' => "{$civilPrenom} {$civilNom} <{$civilEmail}>", 'inline' => false],
                ]
            ];
            pm_send_discord_webhook($webhookUrl, ['username' => 'PM Recrutement', 'embeds' => [$embed]]);
        }
    } catch (Throwable $e) { error_log('[PM Webhook] recrutement failed: '.$e->getMessage()); }
    // Si compte civil, on auto-lie la candidature à la session pour suivi immédiat
    if ($hasCivil) {
        pm_candidature_set_session((string) $newItem['id']);
    }
    pm_json_response(['ok' => true, 'reference' => $reference, 'id' => $newItem['id']]);
}

// GET /api/candidatures/mine?email=... — Suivi via compte civil (sans mot de passe)
if ($method === 'GET' && $sub === '/candidatures/mine') {
    $email = strtolower(trim((string) ($_GET['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        pm_json_response(['error' => 'Email requis.'], 400);
    }
    $store = pm_read_candidatures_store();
    $matches = [];
    foreach ($store['items'] as $item) {
        if (!is_array($item)) continue;
        $ce = isset($item['civil_email']) ? strtolower(trim((string) $item['civil_email'])) : '';
        if ($ce === $email) {
            $matches[] = $item;
        }
    }
    if ($matches === []) {
        pm_json_response(['error' => 'Aucune candidature trouvée pour ce compte.'], 404);
    }
    usort($matches, static function(array $a, array $b): int {
        $ta = strtotime((string) ($a['created_at'] ?? '')) ?: 0;
        $tb = strtotime((string) ($b['created_at'] ?? '')) ?: 0;
        return $tb <=> $ta;
    });
    $item = $matches[0];
    pm_candidature_set_session((string) ($item['id'] ?? ''));
    pm_json_response(['ok' => true, 'candidature' => pm_candidature_public_payload($item)]);
}

// POST /api/candidatures/login
if ($method === 'POST' && $sub === '/candidatures/login') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];

    $discord = (string) ($body['discord'] ?? '');
    $password = (string) ($body['password'] ?? '');

    if ($discord === '' || $password === '') {
        pm_json_response(['error' => 'Identifiants requis.'], 400);
    }

    $store = pm_read_candidatures_store();
    $result = pm_find_latest_candidature_by_discord_and_password($store, $discord, $password);
    if (isset($result['error'])) {
        pm_json_response(['error' => $result['error']], 401);
    }

    $item = $result['item'];
    pm_candidature_set_session((string) ($item['id'] ?? ''));
    pm_json_response(['ok' => true, 'candidature' => pm_candidature_public_payload($item)]);
}

// GET /api/candidatures/me
if ($method === 'GET' && $sub === '/candidatures/me') {
    $candId = pm_candidature_get_session();
    if ($candId === '') {
        pm_json_response(['error' => 'Non connecté.'], 401);
    }
    $store = pm_read_candidatures_store();
    $row = pm_find_candidature_row_by_id($store, $candId);
    if ($row === null) {
        pm_candidature_clear_session();
        pm_json_response(['error' => 'Candidature introuvable.'], 404);
    }
    pm_json_response(pm_candidature_public_payload($row));
}

// POST /api/candidatures/logout
if ($method === 'POST' && $sub === '/candidatures/logout') {
    pm_candidature_clear_session();
    pm_json_response(['ok' => true]);
}

// GET /api/candidatures/list (Direction only)
if ($method === 'GET' && $sub === '/candidatures/list') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }
    $cStore = pm_read_candidatures_store();
    $items = array_values(array_map('pm_candidature_public_payload', $cStore['items']));
    pm_json_response(['items' => $items]);
}

// PATCH /api/candidatures/update (Direction only)
if ($method === 'PATCH' && $sub === '/candidatures/update') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];

    $id = (string) ($body['id'] ?? '');
    $statut = (string) ($body['statut'] ?? '');
    $allowed = ['en_attente', 'etudiee', 'acceptee', 'refusee'];
    if ($id === '' || !in_array($statut, $allowed, true)) {
        pm_json_response(['error' => 'Paramètres invalides.'], 400);
    }

    $cStore = pm_read_candidatures_store();
    foreach ($cStore['items'] as &$row) {
        if (is_array($row) && ($row['id'] ?? '') === $id) {
            $row['statut'] = $statut;
            break;
        }
    }
    unset($row);
    pm_write_candidatures_store($cStore);
    pm_json_response(['ok' => true]);
}

// POST /api/candidatures/delete (Direction only)
if ($method === 'POST' && $sub === '/candidatures/delete') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    error_log('[PM DELETE] session_rio=' . $rio . ' cookie=' . ($_COOKIE['pm_auth'] ?? 'NONE'));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];

    $cStore = pm_read_candidatures_store();
    $msgStore = pm_read_recrutement_messages();

    if (!empty($body['delete_all_processed'])) {
        $removedIds = pm_delete_all_processed_candidatures($cStore);
        pm_recrutement_remove_threads_for($msgStore, $removedIds);
        pm_write_candidatures_store($cStore);
        pm_write_recrutement_messages($msgStore);
        pm_json_response(['ok' => true, 'deleted' => count($removedIds)]);
    }

    $id = trim((string) ($body['id'] ?? ''));
    if ($id === '') {
        pm_json_response(['error' => 'ID requis.'], 400);
    }

    $deleted = pm_try_delete_candidature_by_id($cStore, $id);
    if ($deleted) {
        pm_recrutement_remove_thread_one($msgStore, $id);
        pm_write_candidatures_store($cStore);
        pm_write_recrutement_messages($msgStore);
        pm_json_response(['ok' => true]);
    }
    pm_json_response(['error' => 'Candidature introuvable.'], 404);
}

// --- Recruitment Messaging ---

// GET/POST /api/recrutement-messages (Direction)
if ($sub === '/recrutement-messages' && strpos((string)($_SERVER['QUERY_STRING'] ?? ''), 'as-candidat') === false) {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction / Recruteurs.'], 403);
    }

    $msgStore = pm_read_recrutement_messages();
    $cStore = pm_read_candidatures_store();

    if ($method === 'GET') {
        $candidatureId = (string) ($_GET['candidature_id'] ?? '');
        if ($candidatureId === '') {
            $threads = [];
            foreach ($msgStore['by_candidature_id'] as $cid => $msgs) {
                if (!is_array($msgs)) continue;
                $row = pm_find_candidature_row_by_id($cStore, $cid);
                $lastMsg = end($msgs);
                $threads[] = [
                    'candidature_id' => $cid,
                    'reference' => $row ? (string) ($row['reference'] ?? '') : '',
                    'prenom' => $row ? (string) ($row['prenom'] ?? '') : '',
                    'nom' => $row ? (string) ($row['nom'] ?? '') : '',
                    'discord' => $row ? (string) ($row['discord'] ?? '') : '',
                    'statut' => $row ? (string) ($row['statut'] ?? '') : '',
                    'message_count' => count($msgs),
                    'preview' => ($lastMsg && isset($lastMsg['body'])) ? mb_substr((string) $lastMsg['body'], 0, 80, 'UTF-8') : '',
                    'last_at' => ($lastMsg && isset($lastMsg['created_at'])) ? (string) $lastMsg['created_at'] : '',
                ];
            }
            pm_json_response(['threads' => $threads]);
        }
        $messages = pm_recrutement_get_thread($msgStore, $candidatureId);
        $candRow = pm_find_candidature_row_by_id($cStore, $candidatureId);
        $candidature = $candRow ? pm_candidature_public_payload($candRow) : null;
        pm_json_response(['messages' => $messages, 'candidature' => $candidature]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $body = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($body)) $body = [];
        $candidatureId = (string) ($body['candidature_id'] ?? '');
        $text = pm_sanitize_recrutement_message_body((string) ($body['text'] ?? ''));
        if ($candidatureId === '' || $text === '') {
            pm_json_response(['error' => 'Paramètres invalides.'], 400);
        }
        $authorName = trim(($actor['prenom'] ?? '') . ' ' . ($actor['nom'] ?? ''));
        $msg = pm_recrutement_append_message($msgStore, $candidatureId, 'direction', $text, $authorName !== '' ? $authorName : null);
        pm_write_recrutement_messages($msgStore);
        pm_json_response(['ok' => true, 'message' => $msg]);
    }
}

// GET/POST /api/recrutement-messages/as-candidat
if ($sub === '/recrutement-messages/as-candidat') {
    $candId = pm_candidature_get_session();
    if ($candId === '') {
        pm_json_response(['error' => 'Non connecté.'], 401);
    }

    $msgStore = pm_read_recrutement_messages();

    if ($method === 'GET') {
        $messages = pm_recrutement_get_thread($msgStore, $candId);
        pm_json_response(['messages' => $messages]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $body = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($body)) $body = [];
        $text = pm_sanitize_recrutement_message_body((string) ($body['text'] ?? ''));
        if ($text === '') {
            pm_json_response(['error' => 'Message vide.'], 400);
        }
        $msg = pm_recrutement_append_message($msgStore, $candId, 'candidate', $text, null);
        pm_write_recrutement_messages($msgStore);
        pm_json_response(['ok' => true, 'message' => $msg]);
    }
}

// --- Examens API ---

require_once __DIR__ . '/includes/pm_examens.php';

// POST /api/examens/codes/generate (Direction only)
if ($method === 'POST' && $sub === '/examens/codes/generate') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction.'], 403);
    }

    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $examenType = strtoupper(trim((string) ($body['type'] ?? '')));
    $count = max(1, min(20, (int) ($body['count'] ?? 1)));

    if (!array_key_exists($examenType, PM_EXAM_TYPES)) {
        pm_json_response(['error' => 'Type d\'examen invalide.'], 400);
    }

    $exStore = pm_read_examens_store();
    $codes = [];
    for ($i = 0; $i < $count; $i++) {
        $code = pm_generate_examen_code($examenType);
        $exStore['codes'][] = [
            'code' => $code,
            'type' => $examenType,
            'created_by' => $rio,
            'created_at' => gmdate('c'),
            'used' => false,
        ];
        $codes[] = $code;
    }
    pm_write_examens_store($exStore);
    pm_json_response(['ok' => true, 'codes' => $codes]);
}

// GET /api/examens/codes/list (Direction only)
if ($method === 'GET' && $sub === '/examens/codes/list') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction.'], 403);
    }

    $exStore = pm_read_examens_store();
    pm_json_response(['codes' => $exStore['codes']]);
}

// POST /api/examens/verify-code (authenticated users)
if ($method === 'POST' && $sub === '/examens/verify-code') {
    pm_require_session();
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    if ($code === '') {
        pm_json_response(['error' => 'Code requis.'], 400);
    }

    $exStore = pm_read_examens_store();
    $valid = pm_find_valid_examen_code($exStore, $code);
    if ($valid === null) {
        pm_json_response(['error' => 'Code invalide ou déjà utilisé.'], 401);
    }
    pm_json_response(['ok' => true, 'type' => $valid['type'] ?? '', 'type_label' => PM_EXAM_TYPES[$valid['type']] ?? $valid['type'] ?? '']);
}

// POST /api/examens/submit (authenticated users)
if ($method === 'POST' && $sub === '/examens/submit') {
    pm_require_session();
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) $body = [];
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    $score = (int) ($body['score'] ?? -1);
    $answers = $body['answers'] ?? [];
    $nom = pm_trim_text((string) ($body['nom'] ?? ''), 120);
    $prenom = pm_trim_text((string) ($body['prenom'] ?? ''), 120);
    $proctoring = is_array($body['proctoring'] ?? null) ? $body['proctoring'] : [];

    if ($code === '' || $score < 0 || $score > 100 || $nom === '' || $prenom === '') {
        pm_json_response(['error' => 'Paramètres invalides.'], 400);
    }

    $exStore = pm_read_examens_store();
    $valid = pm_find_valid_examen_code($exStore, $code);
    if ($valid === null) {
        pm_json_response(['error' => 'Code invalide ou déjà utilisé.'], 401);
    }

    $examenType = $valid['type'] ?? '';
    pm_mark_examen_code_used($exStore, $code);
    pm_add_examen_result($exStore, $code, $examenType, $nom, $prenom, $score, $answers, $proctoring);
    pm_write_examens_store($exStore);
    pm_json_response(['ok' => true, 'score' => $score, 'passed' => $score >= 50]);
}

// GET /api/examens/results (Direction only)
if ($method === 'GET' && $sub === '/examens/results') {
    pm_require_session();
    $store = pm_read_store();
    $accounts = pm_get_accounts_from_store($store);
    $rio = strtolower((string) ($_SESSION['rio'] ?? ''));
    $actor = null;
    foreach ($accounts as $a) {
        if (isset($a['rio']) && strtolower((string) $a['rio']) === $rio) {
            $actor = $a;
            break;
        }
    }
    if (!pm_is_triade_lead($actor) && empty($actor['isRecruteur'])) {
        pm_json_response(['error' => 'Accès réservé à la Direction.'], 403);
    }

    $exStore = pm_read_examens_store();
    $results = $exStore['results'];
    usort($results, function ($a, $b) {
        return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    });
    pm_json_response(['results' => $results]);
}

// GET /api/debug/supabase — public test endpoint for Supabase connectivity
if ($method === 'GET' && $sub === '/debug/supabase') {
    $results = [];
    try {
        pm_supabase_kv_set('_test_' . time(), gmdate('c'));
        $results['write'] = 'OK';
    } catch (\Throwable $e) {
        $results['write'] = 'FAIL: ' . $e->getMessage();
    }
    try {
        $all = pm_supabase_kv_get_all();
        $results['count'] = count($all);
        $results['keys'] = array_slice(array_keys($all), 0, 10);
    } catch (\Throwable $e) {
        $results['count'] = 'FAIL: ' . $e->getMessage();
    }
    pm_json_response($results);
}

pm_json_response(['error' => 'Not found.'], 404);
