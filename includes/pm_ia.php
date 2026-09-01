<?php
declare(strict_types=1);

const PM_OLLAMA_URL_DEFAULT = 'http://127.0.0.1:11434';

function pm_ollama_url(): string {
    $store = pm_read_store();
    $custom = trim((string) ($store['PM_INTRANET_OLLAMA_URL'] ?? ''));
    return $custom !== '' && str_starts_with($custom, 'http') ? $custom : PM_OLLAMA_URL_DEFAULT;
}

function pm_ollama_generate(string $model, string $prompt, float $temperature = 0.3): ?string
{
    $payload = json_encode([
        'model' => $model,
        'prompt' => $prompt,
        'stream' => false,
        'options' => [
            'temperature' => $temperature,
            'num_predict' => 256,
        ],
    ]);

    $ch = curl_init(pm_ollama_url() . '/api/generate');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        return null;
    }

    $data = json_decode($response, true);
    return isset($data['response']) ? (string) $data['response'] : null;
}

function pm_analyze_candidature(string $motivation, string $experience): array
{
    $prompt = "Tu es un analyste de recrutement pour la Police Municipale française. Analyse cette candidature et donne un score de qualité sur 100, puis un résumé en 2 lignes. Réponds UNIQUEMENT en JSON valide avec les champs : score (int 0-100), resume (string), points_forts (array de strings), points_faibles (array de strings).

MOTIVATION :
$motivation

EXPÉRIENCE :
$experience";

    $response = pm_ollama_generate('qwen2.5:1.5b', $prompt, 0.2);
    if ($response === null) {
        return ['error' => 'Impossible de contacter le modèle IA.', 'score' => null];
    }

    $json = pm_extract_json($response);
    if ($json === null) {
        return ['error' => 'Réponse IA non parsable.', 'raw' => $response, 'score' => null];
    }

    return $json;
}

function pm_detect_ai_text(string $text): array
{
    $prompt = "Tu es un expert en détection de texte généré par intelligence artificielle. Analyse le texte suivant et donne une probabilité que ce texte ait été écrit par une IA (0% = humain certain, 100% = IA certaine). Réponds UNIQUEMENT en JSON valide avec les champs : probabilite (int 0-100), analyse (string, explication en 1-2 phrases), indicators (array de strings, indices détectés).

TEXTE À ANALYSER :
$text";

    $response = pm_ollama_generate('qwen2.5:1.5b', $prompt, 0.2);
    if ($response === null) {
        return ['error' => 'Impossible de contacter le modèle IA.', 'probabilite' => null];
    }

    $json = pm_extract_json($response);
    if ($json === null) {
        return ['error' => 'Réponse IA non parsable.', 'raw' => $response, 'probabilite' => null];
    }

    return $json;
}

function pm_extract_json(string $text): ?array
{
    $text = trim($text);

    if (str_starts_with($text, '{')) {
        $data = json_decode($text, true);
        if (is_array($data)) return $data;
    }

    $start = strpos($text, '{');
    $end = strrpos($text, '}');
    if ($start !== false && $end !== false && $end > $start) {
        $slice = substr($text, $start, $end - $start + 1);
        $data = json_decode($slice, true);
        if (is_array($data)) return $data;
    }

    $start = strpos($text, '[');
    $end = strrpos($text, ']');
    if ($start !== false && $end !== false && $end > $start) {
        $slice = substr($text, $start, $end - $start + 1);
        $data = json_decode($slice, true);
        if (is_array($data)) return $data;
    }

    return null;
}

function pm_ollama_status(): bool
{
    $ch = curl_init(pm_ollama_url() . '/api/tags');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $response !== false && $httpCode === 200;
}
