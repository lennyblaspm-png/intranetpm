<?php
declare(strict_types=1);

const PM_INTEGRATION_FORM_FILE = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'integration_form.json';

function pm_read_integration_form_store(): array
{
    if (!file_exists(PM_INTEGRATION_FORM_FILE)) {
        return ['codes' => [], 'results' => []];
    }
    $raw = file_get_contents(PM_INTEGRATION_FORM_FILE);
    if ($raw === false || $raw === '') {
        return ['codes' => [], 'results' => []];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['codes' => [], 'results' => []];
    }
    if (!isset($data['codes'])) $data['codes'] = [];
    if (!isset($data['results'])) $data['results'] = [];
    return $data;
}

function pm_write_integration_form_store(array $store): void
{
    $dir = dirname(PM_INTEGRATION_FORM_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    file_put_contents(PM_INTEGRATION_FORM_FILE, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function pm_generate_integration_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $part1 = '';
    $part2 = '';
    for ($i = 0; $i < 2; $i++) {
        $part1 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    for ($i = 0; $i < 2; $i++) {
        $part1 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    for ($i = 0; $i < 2; $i++) {
        $part2 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    for ($i = 0; $i < 2; $i++) {
        $part2 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return 'INT-' . $part1 . '-' . $part2;
}

function pm_find_valid_code(array $store, string $code): ?array
{
    $code = strtoupper(trim($code));
    foreach ($store['codes'] as $c) {
        if (isset($c['code']) && $c['code'] === $code && empty($c['used'])) {
            return $c;
        }
    }
    return null;
}

function pm_mark_code_used(array &$store, string $code): void
{
    foreach ($store['codes'] as &$c) {
        if (isset($c['code']) && $c['code'] === $code) {
            $c['used'] = true;
            $c['used_at'] = gmdate('c');
            break;
        }
    }
}

function pm_add_integration_result(array &$store, string $code, int $score, array $answers, ?string $candidateName = null): void
{
    $store['results'][] = [
        'id' => (string) time() . '-' . bin2hex(random_bytes(4)),
        'code' => $code,
        'score' => $score,
        'answers' => $answers,
        'candidate_name' => $candidateName,
        'submitted_at' => gmdate('c'),
    ];
}
