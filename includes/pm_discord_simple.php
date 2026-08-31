<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'pm_candidatures.php';

/**
 * Message simple (content) pour salon log / alertes Discord.
 *
 * @return array{ok:bool, http_code:int, error?:string}
 */
function pm_discord_send_content_webhook(string $webhookUrl, string $content): array
{
    $content = pm_trim_text($content, 1900);
    if ($content === '') {
        return ['ok' => false, 'http_code' => 0, 'error' => 'Message vide.'];
    }
    if ($webhookUrl === '' || strlen($webhookUrl) > 512) {
        return ['ok' => false, 'http_code' => 0, 'error' => 'URL absente.'];
    }
    if (!preg_match('#^https://(?:discord\\.com|discordapp\\.com)/api/webhooks/\d+/[\w-]+$#', $webhookUrl)) {
        return ['ok' => false, 'http_code' => 0, 'error' => 'URL webhook invalide.'];
    }

    $payload = json_encode(
        [
            'content' => $content,
            'allowed_mentions' => ['parse' => []],
        ],
        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );

    $curl = curl_init($webhookUrl);
    if ($curl === false) {
        return ['ok' => false, 'http_code' => 0, 'error' => 'curl_init failed'];
    }
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=UTF-8',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_USERAGENT => 'IntranetPM/Log-Discord (PHP)',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    curl_exec($curl);
    $code = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $cerr = curl_error($curl);
    curl_close($curl);

    if ($cerr !== '') {
        return ['ok' => false, 'http_code' => $code, 'error' => $cerr];
    }
    return ['ok' => $code >= 200 && $code < 300, 'http_code' => $code];
}
