<?php
declare(strict_types=1);

const PM_EXAMENS_FILE = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'examens.json';

const PM_EXAM_TYPES = [
    'INTEGRATION' => 'Examen d\'intégration',
    'OPJ' => 'Officier de Police Judiciaire',
    'APJA' => 'Agent de Police Judiciaire Adjoints',
    'BMU' => 'Brigade Motorisée Urbaine',
    'GSI' => 'Groupe de Soutien et d\'Intervention',
    'GARDIEN_TITULAIRE' => 'Gardien Titulaire',
    'CIAPT_1' => 'CIAPT 1',
];

const PM_INTEGRATION_PASS_SCORE = 120;
const PM_INTEGRATION_TOTAL_SCORE = 200;
const PM_INTEGRATION_TIME_MINUTES = 30;

const PM_OPJ_PASS_SCORE = 40;
const PM_OPJ_TOTAL_SCORE = 100;
const PM_OPJ_TIME_MINUTES = 90;

const PM_CIAPT1_PASS_SCORE = 12;
const PM_CIAPT1_TOTAL_SCORE = 20;
const PM_CIAPT1_TIME_MINUTES = 20;

const PM_APJA_PASS_SCORE = 12;
const PM_APJA_TOTAL_SCORE = 20;
const PM_APJA_TIME_MINUTES = 20;

function pm_read_examens_store(): array
{
    if (!file_exists(PM_EXAMENS_FILE)) {
        return ['codes' => [], 'results' => []];
    }
    $raw = file_get_contents(PM_EXAMENS_FILE);
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

function pm_write_examens_store(array $store): void
{
    $dir = dirname(PM_EXAMENS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    file_put_contents(PM_EXAMENS_FILE, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function pm_generate_examen_code(string $type): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $part = '';
    for ($i = 0; $i < 4; $i++) {
        $part .= $chars[random_int(0, strlen($chars) - 1)];
    }
    $part2 = '';
    for ($i = 0; $i < 4; $i++) {
        $part2 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return 'EX-' . strtoupper($type) . '-' . $part . '-' . $part2;
}

function pm_find_valid_examen_code(array $store, string $code): ?array
{
    $code = strtoupper(trim($code));
    foreach ($store['codes'] as $c) {
        if (isset($c['code']) && $c['code'] === $code && empty($c['used'])) {
            return $c;
        }
    }
    return null;
}

function pm_mark_examen_code_used(array &$store, string $code): void
{
    foreach ($store['codes'] as &$c) {
        if (isset($c['code']) && $c['code'] === $code) {
            $c['used'] = true;
            $c['used_at'] = gmdate('c');
            break;
        }
    }
}

function pm_add_examen_result(array &$store, string $code, string $examenType, string $nom, string $prenom, int $score, array $answers, array $proctoring = [], array $grading = []): void
{
    $store['results'][] = [
        'id' => (string) time() . '-' . bin2hex(random_bytes(4)),
        'code' => $code,
        'examen_type' => $examenType,
        'nom' => $nom,
        'prenom' => $prenom,
        'score' => $score,
        'answers' => $answers,
        'proctoring' => $proctoring,
        'grading' => $grading,
        'submitted_at' => gmdate('c'),
    ];
}

// ─── Integration Exam Questions (100 questions, 200 points) ─────

function pm_get_integration_questions(): array
{
    return [
        // ─── PARTIE 1 — QCM (15 questions, 30 points) ───
        ['id' => 1, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Que signifie APJA ?',
         'opts' => ['Agent de Police Judiciaire Adjoint', 'Agent Principal de Justice Administrative', 'Autorité de Police Judiciaire Adjointe', 'Agent de Protection Juridique Administrative'],
         'correct' => 0, 'points' => 2],
        ['id' => 2, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Quelle qualification possède des pouvoirs étendus permettant de mener des enquêtes de manière autonome ?',
         'opts' => ['APJ-A', 'APJ', 'OPJ', 'PM'],
         'correct' => 2, 'points' => 2],
        ['id' => 3, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Quel article est cité concernant le contrôle d\'identité ?',
         'opts' => ['Article 122-5 du CP', 'Article 78-2 du CPP', 'Article 803 du CPP', 'Article L435-1 du CSI'],
         'correct' => 1, 'points' => 2],
        ['id' => 4, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Selon le cours, laquelle de ces situations peut justifier un contrôle d\'identité ?',
         'opts' => ['Une personne marche dans la rue', 'Une personne est connue du policier', 'Il existe une raison plausible de soupçonner qu\'elle a commis ou tenté de commettre une infraction', 'Une personne refuse simplement de parler'],
         'correct' => 2, 'points' => 2],
        ['id' => 5, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Lors d\'un contrôle routier, lequel des éléments suivants n\'est PAS cité dans le cours ?',
         'opts' => ['Permis de conduire', 'Certificat d\'immatriculation', 'Attestation d\'assurance', 'Carte d\'identité'],
         'correct' => 3, 'points' => 2],
        ['id' => 6, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Le menottage est encadré dans le cours par :',
         'opts' => ['L\'article 78-2', 'L\'article 803 du CPP', 'L\'article 311-1', 'L\'article 221-1'],
         'correct' => 1, 'points' => 2],
        ['id' => 7, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Selon le cours, une personne peut être menottée lorsqu\'elle est :',
         'opts' => ['Insultante uniquement', 'Dangereuse pour autrui ou elle-même', 'Susceptible de prendre la fuite', 'B et C'],
         'correct' => 3, 'points' => 2],
        ['id' => 8, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Combien de types d\'infractions sont présentés ?',
         'opts' => ['2', '3', '4', '5'],
         'correct' => 1, 'points' => 2],
        ['id' => 9, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Le feu rouge non respecté est donné comme exemple de :',
         'opts' => ['Contravention', 'Délit', 'Crime', 'Infraction administrative'],
         'correct' => 0, 'points' => 2],
        ['id' => 10, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Le vol prévu par l\'article 311-1 est présenté comme :',
         'opts' => ['Une contravention', 'Un délit', 'Un crime', 'Une infraction civile'],
         'correct' => 1, 'points' => 2],
        ['id' => 11, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'L\'homicide prévu par l\'article 221-1 est présenté comme :',
         'opts' => ['Une contravention', 'Un délit', 'Un crime', 'Une infraction routière'],
         'correct' => 2, 'points' => 2],
        ['id' => 12, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Quel article du Code pénal concerne la légitime défense présentée dans le cours ?',
         'opts' => ['78-2', '803', '122-5', 'L435-1'],
         'correct' => 2, 'points' => 2],
        ['id' => 13, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Quel article du CSI encadre l\'usage des armes présenté dans le cours ?',
         'opts' => ['L233-1', 'L435-1', 'R412-30', '311-1'],
         'correct' => 1, 'points' => 2],
        ['id' => 14, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Dans le cadre de l\'article L435-1, l\'usage de l\'arme doit être :',
         'opts' => ['Automatique', 'Nécessaire et proportionné', 'Systématique en cas de fuite', 'Autorisé dès qu\'une personne refuse un contrôle'],
         'correct' => 1, 'points' => 2],
        ['id' => 15, 'cat' => 'QCM', 'type' => 'qcm', 'q' => 'Dans l\'acronyme AMER, le « A » signifie :',
         'opts' => ['Arme', 'Autorité', 'Atteinte à l\'intégrité physique de soi-même ou d\'autrui', 'Assistance'],
         'correct' => 2, 'points' => 2],

        // ─── PARTIE 2 — PHRASES À TROUS (10 questions, 20 points) ───
        ['id' => 16, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Un cadre juridique est un ensemble de ________, ________ et ________ qui définissent les droits, responsabilités et limites.',
         'accept' => ['lois', 'règles', 'réglementations'], 'points' => 2],
        ['id' => 17, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Pour n\'importe quelle action que vous êtes amené à faire, vous devez avoir un ________ ________.',
         'accept' => ['cadre', 'juridique'], 'points' => 2],
        ['id' => 18, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Le contrôle d\'identité est notamment encadré par l\'article ________ du Code de procédure pénale.',
         'accept' => ['78-2'], 'points' => 2],
        ['id' => 19, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Le menottage est notamment encadré par l\'article ________ du Code de procédure pénale.',
         'accept' => ['803'], 'points' => 2],
        ['id' => 20, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : La légitime défense est notamment encadrée par l\'article ________ du Code pénal.',
         'accept' => ['122-5'], 'points' => 2],
        ['id' => 21, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : L\'usage des armes par les forces de l\'ordre est notamment encadré par l\'article ________ du Code de la sécurité intérieure.',
         'accept' => ['L435-1'], 'points' => 2],
        ['id' => 22, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Une infraction est un acte ou un comportement qui enfreint la ________ ou une règle établie par une autorité compétente.',
         'accept' => ['loi'], 'points' => 2],
        ['id' => 23, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Les trois types d\'infractions sont les infractions ____________, ____________ et ____________.',
         'accept' => ['contraventionnelles', 'délictuelles', 'criminelles'], 'points' => 2],
        ['id' => 24, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Lors d\'une communication radio, il est impératif d\'attendre que le CSU dise « __________ » afin d\'être sûr que le message a bien été transmis.',
         'accept' => ['transmettez'], 'points' => 2],
        ['id' => 25, 'cat' => 'Phrases à trous', 'type' => 'trou', 'q' => 'Complète : Dans AMER, le « M » correspond à une __________ avec arme.',
         'accept' => ['menace'], 'points' => 2],

        // ─── PARTIE 3 — ACRONYMES ET TERMINOLOGIE (15 questions, 30 points) ───
        ['id' => 26, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : CIAT =',
         'accept' => ['commissariat'], 'points' => 2],
        ['id' => 27, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : CHU =',
         'accept' => ['centre hospitalier universitaire'], 'points' => 2],
        ['id' => 28, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : TJ =',
         'accept' => ['tribunal judiciaire'], 'points' => 2],
        ['id' => 29, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : GAV =',
         'accept' => ['garde à vue'], 'points' => 2],
        ['id' => 30, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : MAD =',
         'accept' => ['mise à disposition'], 'points' => 2],
        ['id' => 31, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : CP =',
         'accept' => ['code pénal'], 'points' => 2],
        ['id' => 32, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : CPP =',
         'accept' => ['code de procédure pénale'], 'points' => 2],
        ['id' => 33, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : CSI =',
         'accept' => ['code de la sécurité intérieure'], 'points' => 2],
        ['id' => 34, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : APJA =',
         'accept' => ['agent de police judiciaire adjoint'], 'points' => 2],
        ['id' => 35, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : APJ =',
         'accept' => ['agent de police judiciaire'], 'points' => 2],
        ['id' => 36, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : OPJ =',
         'accept' => ['officier de police judiciaire'], 'points' => 2],
        ['id' => 37, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : GN =',
         'accept' => ['gendarmerie nationale'], 'points' => 2],
        ['id' => 38, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : SAMU =',
         'accept' => ['service d\'aide médicale urgente'], 'points' => 2],
        ['id' => 39, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : AVP =',
         'accept' => ['accident voie publique'], 'points' => 2],
        ['id' => 40, 'cat' => 'Acronymes', 'type' => 'trou', 'q' => 'Signification : IPM =',
         'accept' => ['ivresse publique et manifeste'], 'points' => 2],

        // ─── PARTIE 4 — CADRE JURIDIQUE (10 questions, 20 points) ───
        ['id' => 41, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Explique avec tes propres mots ce qu\'est un cadre juridique.',
         'accept' => ['ensemble de lois règles réglementations définissant droits responsabilités limites'], 'points' => 2],
        ['id' => 42, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Pourquoi est-il important pour un policier de connaître le cadre juridique correspondant à son action ?',
         'accept' => ['toute action cadre juridique', 'action encadrée juridiquement', 'obligation légale'], 'points' => 2],
        ['id' => 43, 'cat' => 'Cadre juridique', 'type' => 'qcm', 'q' => 'Quel cadre juridique est cité pour justifier le contrôle d\'identité ?',
         'opts' => ['Article 78-2 du CPP', 'Article 122-5 du CP', 'Article 803 du CPP', 'Article L435-1 du CSI'],
         'correct' => 0, 'points' => 2],
        ['id' => 44, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Cite les trois documents que le conducteur doit présenter lors d\'un contrôle routier.',
         'accept' => ['permis de conduire', 'certificat d\'immatriculation', 'attestation d\'assurance'], 'points' => 2],
        ['id' => 45, 'cat' => 'Cadre juridique', 'type' => 'qcm', 'q' => 'Quel cadre juridique concerne le recours aux menottes ?',
         'opts' => ['Article 78-2 du CPP', 'Article 122-5 du CP', 'Article 803 du CPP', 'Article L435-1 du CSI'],
         'correct' => 2, 'points' => 2],
        ['id' => 46, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Le cours permet-il de retenir le risque de fuite comme condition du menottage ? Explique.',
         'accept' => ['oui', 'fuite', 'dangereuse', 'risque'], 'points' => 2],
        ['id' => 47, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Explique la différence entre APJ-A / APJ / OPJ en précisant les pouvoirs.',
         'accept' => ['apj-a pouvoirs limités', 'apj délégation', 'opj pouvoirs étendus', 'autonome'], 'points' => 2],
        ['id' => 48, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Pourquoi le cours précise-t-il qu\'un APJ-A dispose de pouvoirs limités d\'enquête ?',
         'accept' => ['supervision', 'pas mêmes pouvoirs', 'apj', 'agitation'], 'points' => 2],
        ['id' => 49, 'cat' => 'Cadre juridique', 'type' => 'text', 'q' => 'Quelle différence fais-tu entre contravention / délit / crime ?',
         'accept' => ['contravention feu rouge', 'délit vol', 'crime homicide', 'gravité'], 'points' => 2],
        ['id' => 50, 'cat' => 'Cadre juridique', 'type' => 'qcm', 'q' => 'Associe : Contravention = ?',
         'opts' => ['Homicide', 'Vol', 'Non-respect feu rouge', 'Aucune'],
         'correct' => 2, 'points' => 2],

        // ─── PARTIE 5 — PROCÉDURE RADIO (10 questions, 20 points) ───
        ['id' => 51, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Que signifie CI dans le contexte des procédures ?',
         'accept' => ['comparution immédiate'], 'points' => 2],
        ['id' => 52, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Que signifie PVI ?',
         'accept' => ['procès-verbal d\'interpellation'], 'points' => 2],
        ['id' => 53, 'cat' => 'Procédure radio', 'type' => 'text', 'q' => 'Quelle différence entre PVI et GAV ?',
         'accept' => ['pvi procès-verbal', 'gav garde à vue', 'interpellation', 'garde'], 'points' => 2],
        ['id' => 54, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Que signifie MAD ?',
         'accept' => ['mise à disposition'], 'points' => 2],
        ['id' => 55, 'cat' => 'Procédure radio', 'type' => 'text', 'q' => 'Quelle différence entre CP, CPP et CSI ?',
         'accept' => ['code pénal', 'procédure pénale', 'sécurité intérieure'], 'points' => 2],
        ['id' => 56, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Quel acronyme désigne un accident de la voie publique ?',
         'accept' => ['avp'], 'points' => 2],
        ['id' => 57, 'cat' => 'Procédure radio', 'type' => 'text', 'q' => 'Que signifie IPM et dans quel contexte ?',
         'accept' => ['ivresse publique manifeste', 'contrôle'], 'points' => 2],
        ['id' => 58, 'cat' => 'Procédure radio', 'type' => 'text', 'q' => 'Quelle différence entre MO et RO ?',
         'accept' => ['maintien ordre', 'rétablissement ordre'], 'points' => 2],
        ['id' => 59, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Que signifie VPE ?',
         'accept' => ['vol par effraction'], 'points' => 2],
        ['id' => 60, 'cat' => 'Procédure radio', 'type' => 'trou', 'q' => 'Que signifie PS dans les indicatifs radio ?',
         'accept' => ['police secours'], 'points' => 2],

        // ─── PARTIE 6 — RADIO QUESTIONS PIÈGES (10 questions, 20 points) ───
        ['id' => 61, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => '« GS Dumas : CSU du GS Devillier » — Qui appelle qui ?',
         'accept' => ['gs dumas appelle', 'gs dumas csu', 'dumas devillier'], 'points' => 2],
        ['id' => 62, 'cat' => 'Radio pièges', 'type' => 'trou', 'q' => 'Que doit répondre le CSU avant que le GS Dumas transmette son message ?',
         'accept' => ['transmettez'], 'points' => 2],
        ['id' => 63, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Reconstitue l\'ordre logique d\'une prise de service radio.',
         'accept' => ['appeler csu', 'attendre', 'transmettez', 'message'], 'points' => 2],
        ['id' => 64, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Quelle information le GS Dumas doit-il communiquer lors de sa prise de service ?',
         'accept' => ['prise de service', 'attente', 'affectation'], 'points' => 2],
        ['id' => 65, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Que peut faire le CSU après l\'annonce de prise de service ?',
         'accept' => ['affecter', 'patrouille', 'attente'], 'points' => 2],
        ['id' => 66, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Lors d\'une fin de service, quelle formule utilise le GS Dumas ?',
         'accept' => ['fin de service', 'bonne soirée', 'annoncer'], 'points' => 2],
        ['id' => 67, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Dans l\'exemple de contrôle routier, quelles informations sont données ?',
         'accept' => ['sportive noire', 'deux occupants', 'avenue de gaulle', 'contrôle routier'], 'points' => 2],
        ['id' => 68, 'cat' => 'Radio pièges', 'type' => 'qcm', 'q' => 'Vrai ou faux : Un agent peut transmettre immédiatement après avoir appelé le CSU.',
         'opts' => ['Vrai', 'Faux — il doit attendre « Transmettez »', 'Vrai si urgence', 'Faux toujours'],
         'correct' => 1, 'points' => 2],
        ['id' => 69, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Pourquoi le cours insiste-t-il sur l\'attente du mot « Transmettez » ?',
         'accept' => ['message transmis', 'entendu', 'opérateur', 'réception'], 'points' => 2],
        ['id' => 70, 'cat' => 'Radio pièges', 'type' => 'text', 'q' => 'Complète : « VT-01 : CSU de ________ » puis « CSU : ________ » puis « VT-01 : Débutons un ________ »',
         'accept' => ['vt-01', 'transmettez', 'contrôle'], 'points' => 2],

        // ─── PARTIE 7 — CADRES JURIDIQUES DIFFICILE (10 questions, 20 points) ───
        ['id' => 71, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Donne la définition complète d\'un cadre juridique.',
         'accept' => ['ensemble lois règles réglementations', 'droits responsabilités limites', 'domaine'], 'points' => 2],
        ['id' => 72, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Pourquoi toute action réalisée par un agent doit-elle avoir un cadre juridique ?',
         'accept' => ['encadrée juridiquement', 'obligation', 'légalité'], 'points' => 2],
        ['id' => 73, 'cat' => 'Cadre juridique avancé', 'type' => 'trou', 'q' => 'Quel article encadre le contrôle d\'identité ?',
         'accept' => ['78-2'], 'points' => 2],
        ['id' => 74, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Dans quelles circonstances l\'article 78-2 permet-il d\'inviter une personne à justifier son identité ?',
         'accept' => ['raison plausible', 'infraction', 'crime', 'délit', 'commis', 'tenté', 'prépare'], 'points' => 2],
        ['id' => 75, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Cite les deux situations de suspicion mentionnées dans le cours.',
         'accept' => ['commis tenté infraction', 'prépare crime délit'], 'points' => 2],
        ['id' => 76, 'cat' => 'Cadre juridique avancé', 'type' => 'trou', 'q' => 'Quel article encadre le contrôle routier ?',
         'accept' => ['r233-1', 'r 233-1'], 'points' => 2],
        ['id' => 77, 'cat' => 'Cadre juridique avancé', 'type' => 'trou', 'q' => 'Quel article encadre le menottage ?',
         'accept' => ['803'], 'points' => 2],
        ['id' => 78, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Cite les deux conditions permettant le port des menottes.',
         'accept' => ['dangereuse', 'autrui', 'elle-même', 'fuite', 'susceptible'], 'points' => 2],
        ['id' => 79, 'cat' => 'Cadre juridique avancé', 'type' => 'qcm', 'q' => 'Vrai ou faux : Une personne peut être menottée uniquement parce qu\'elle a commis une infraction.',
         'opts' => ['Vrai', 'Faux', 'Vrai si délit', 'Vrai si crime'],
         'correct' => 1, 'points' => 2],
        ['id' => 80, 'cat' => 'Cadre juridique avancé', 'type' => 'text', 'q' => 'Quelle différence entre le cadre juridique du contrôle d\'identité et celui du menottage ?',
         'accept' => ['78-2', '803', 'identité', 'menottage', 'dangerosité', 'fuite'], 'points' => 2],

        // ─── PARTIE 8 — USAGE DE L'ARME (10 questions, 20 points) ───
        ['id' => 81, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Quels sont les deux articles principaux concernant l\'usage de l\'arme ?',
         'accept' => ['122-5', 'l435-1', 'code pénal', 'sécurité intérieure'], 'points' => 2],
        ['id' => 82, 'cat' => 'Usage de l\'arme', 'type' => 'trou', 'q' => 'Quel article relève du Code pénal ?',
         'accept' => ['122-5'], 'points' => 2],
        ['id' => 83, 'cat' => 'Usage de l\'arme', 'type' => 'trou', 'q' => 'Quel article relève du Code de la sécurité intérieure ?',
         'accept' => ['l435-1'], 'points' => 2],
        ['id' => 84, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Que signifie « en cas d\'absolue nécessité » dans L435-1 ?',
         'accept' => ['nécessité', 'conditions prévues', 'réellement nécessaire'], 'points' => 2],
        ['id' => 85, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Que signifie « de manière strictement proportionnée » ?',
         'accept' => ['adaptée', 'gravité', 'menace', 'pas excessive', 'proportionnalité'], 'points' => 2],
        ['id' => 86, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Dans quelles circonstances une personne armée peut-elle représenter une menace ?',
         'accept' => ['menace', 'vie', 'intégrité physique', 'agents', 'autrui'], 'points' => 2],
        ['id' => 87, 'cat' => 'Usage de l\'arme', 'type' => 'trou', 'q' => 'Combien de situations numérotées sont présentées dans L435-1 ?',
         'accept' => ['5'], 'points' => 2],
        ['id' => 88, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Pour un véhicule dont le conducteur n\'obtempère pas, quelles conditions pour les occupants ?',
         'accept' => ['susceptibles', 'perpétrer', 'fuite', 'atteintes', 'vie', 'intégrité'], 'points' => 2],
        ['id' => 89, 'cat' => 'Usage de l\'arme', 'type' => 'trou', 'q' => 'Combien de sommations sont mentionnées dans les situations où elles sont prévues ?',
         'accept' => ['2', 'deux'], 'points' => 2],
        ['id' => 90, 'cat' => 'Usage de l\'arme', 'type' => 'text', 'q' => 'Différence entre les conditions de l\'article 122-5 et celles de L435-1 ?',
         'accept' => ['122-5 légitime défense', 'l435-1 forces de l\'ordre', 'fonctions', 'atteinte injustifiée'], 'points' => 2],

        // ─── PARTIE 9 — COMPRÉHENSION (10 questions, 20 points) ───
        ['id' => 91, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Quels sont les deux éléments essentiels de la légitime défense ?',
         'accept' => ['même temps', 'proportion', 'moyens', 'gravité'], 'points' => 2],
        ['id' => 92, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Un individu tente de porter un coup avec un couteau. Pourquoi l\'utilisation de l\'arme peut-elle être envisagée ?',
         'accept' => ['menace directe', 'vie', 'couteau', 'stopper', 'action'], 'points' => 2],
        ['id' => 93, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Selon l\'article 122-5, que doit respecter la défense concernant les moyens employés ?',
         'accept' => ['proportionnés', 'gravité', 'atteinte', 'proportionnalité'], 'points' => 2],
        ['id' => 94, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Pourquoi la proportionnalité est-elle importante dans l\'utilisation de la force ?',
         'accept' => ['disproportion', 'gravité', 'atteinte', 'adaptée'], 'points' => 2],
        ['id' => 95, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Cite au moins trois situations dans lesquelles L435-1 prévoit l\'utilisation de l\'arme.',
         'accept' => ['vie', 'intégrité physique', 'arme', 'véhicule', 'garde', 'meurtres'], 'points' => 2],
        ['id' => 96, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Dans quelles circonstances les sommations sont-elles mentionnées dans L435-1 ?',
         'accept' => ['sommations', 'lieux', 'personnes', 'contraindre', 's\'arrêter'], 'points' => 2],
        ['id' => 97, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Concernant un véhicule dont le conducteur n\'obtempère pas, quelles conditions supplémentaires pour les occupants ?',
         'accept' => ['susceptibles', 'perpétrer', 'fuite', 'atteintes', 'vie', 'intégrité'], 'points' => 2],
        ['id' => 98, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Pour une personne cherchant à échapper à sa garde, quelles conditions ?',
         'accept' => ['échapper', 'garde', 'investigations', 'susceptible', 'fuite', 'atteintes'], 'points' => 2],
        ['id' => 99, 'cat' => 'Compréhension', 'type' => 'text', 'q' => 'Dans quel but exclusif l\'usage de l\'arme peut-il être utilisé dans la dernière situation ?',
         'accept' => ['empêcher', 'réitération', 'meurtres', 'tentatives', 'temps rapproché'], 'points' => 2],
        ['id' => 100, 'cat' => 'Compréhension', 'type' => 'text', 'q' => '🏆 QUESTION ULTIME : Tu es policier municipal. Une situation évolue rapidement : un individu représente une menace, possède une arme et tente de fuir. Explique étape par étape ta réflexion juridique avant tout usage de ton arme. (cadre juridique, nécessité, proportionnalité, menace, sommations, AMER)',
         'accept' => ['cadre juridique', 'nécessité', 'proportionnalité', 'menace', 'sommations', 'amer', '122-5', 'l435-1', 'ultime recours', 'environnement'], 'points' => 2],
    ];
}

function pm_get_integration_questions_randomized(): array
{
    $questions = pm_get_integration_questions();
    $byCat = [];
    foreach ($questions as $q) {
        $byCat[$q['cat']][] = $q;
    }
    foreach ($byCat as $cat => &$qs) {
        shuffle($qs);
    }
    unset($qs);
    $result = [];
    $cats = array_keys($byCat);
    shuffle($cats);
    foreach ($cats as $cat) {
        foreach ($byCat[$cat] as $q) {
            $result[] = $q;
        }
    }
    return $result;
}

// ─── OPJ Exam Questions (40 questions, 100 points) ─────

function pm_get_opj_questions(): array
{
    return [
        // ─── PARTIE 1 — QUESTIONS DE CONNAISSANCES (14 questions) ───
        ['id' => 1, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Que signifie l\'abréviation OPJ ?',
         'accept' => ['officier', 'police', 'judiciaire'], 'points' => 2],
        ['id' => 2, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Donnez la définition d\'un Officier de Police Judiciaire.',
         'accept' => ['officier', 'police', 'judiciaire', 'fonctions', 'enquête'], 'points' => 2],
        ['id' => 3, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quelles sont les principales missions d\'un OPJ ?',
         'accept' => ['constatation', 'infractions', 'enquête', 'recherche', 'poursuite'], 'points' => 2],
        ['id' => 4, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quelle différence fondamentale existe entre un OPJ et un APJ ?',
         'accept' => ['pouvoirs', 'autonome', 'délégation', 'supervision'], 'points' => 2],
        ['id' => 5, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quel est le rôle de l\'OPJ dans la constatation des infractions ?',
         'accept' => ['constatation', 'infractions', 'constater', 'procédure'], 'points' => 2],
        ['id' => 6, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quel est le rôle de l\'OPJ dans la direction d\'une enquête judiciaire ?',
         'accept' => ['direction', 'enquête', 'judiciaire', 'conduire', 'mener'], 'points' => 2],
        ['id' => 7, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quels sont les principaux actes judiciaires pouvant être réalisés par un OPJ ?',
         'accept' => ['perquisition', 'saisie', 'audition', 'garde à vue', 'interpellation'], 'points' => 2],
        ['id' => 8, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quelles responsabilités l\'OPJ exerce-t-il lors d\'une intervention ?',
         'accept' => ['responsabilité', 'intervention', 'décision', 'direction'], 'points' => 2],
        ['id' => 9, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quel est le rôle de l\'OPJ vis-à-vis des agents qui ne sont pas OPJ ?',
         'accept' => ['direction', 'supervision', 'coordination', 'guide'], 'points' => 2],
        ['id' => 10, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Que doivent faire les policiers non OPJ lorsqu\'ils interviennent sous la direction d\'un OPJ ?',
         'accept' => ['obéissance', 'instructions', 'directives', 'exécuter'], 'points' => 2],
        ['id' => 11, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Selon la formation, qui est habilité à rendre compte au gradé de permanence ?',
         'accept' => ['opj', 'officier', 'police', 'judiciaire'], 'points' => 2],
        ['id' => 12, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Que signifie OE-02 ?',
         'accept' => ['ouverture', 'enquête', '02'], 'points' => 2],
        ['id' => 13, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Quel est l\'objectif de l\'ouverture d\'une enquête OE-02 ?',
         'accept' => ['enquête', 'judiciaire', 'ouverture', 'début'], 'points' => 2],
        ['id' => 14, 'cat' => 'Connaissances', 'type' => 'text', 'q' => 'Pourquoi le traitement et le suivi des enquêtes judiciaires sont-ils importants ?',
         'accept' => ['efficacité', 'résultat', 'justice', 'poursuite'], 'points' => 2],

        // ─── PARTIE 2 — GARDE À VUE ET DROITS (11 questions) ───
        ['id' => 15, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Qu\'est-ce qu\'une garde à vue ?',
         'accept' => ['privation', 'liberté', 'garde', 'détention', 'provisoire'], 'points' => 2],
        ['id' => 16, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Qui est habilité à décider d\'un placement en garde à vue ?',
         'accept' => ['opj', 'officier', 'procureur', 'juge'], 'points' => 2],
        ['id' => 17, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quelle est la durée initiale de la garde à vue indiquée dans la formation ?',
         'accept' => ['24', 'heures', 'vingt-quatre'], 'points' => 2],
        ['id' => 18, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Dans quelles conditions une garde à vue peut-elle être prolongée selon la formation ?',
         'accept' => ['prolongation', 'nécessaire', 'enquête', 'complexité'], 'points' => 2],
        ['id' => 19, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quelle autorité intervient dans le cadre de cette prolongation ?',
         'accept' => ['procureur', 'juge', 'autorité', 'magistrat'], 'points' => 2],
        ['id' => 20, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Citez au minimum 5 droits dont bénéficie une personne placée en garde à vue.',
         'accept' => ['avocat', 'médecin', 'silence', 'interprète', 'prévenir', 'famille'], 'points' => 2],
        ['id' => 21, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quel droit concerne l\'assistance d\'un avocat ?',
         'accept' => ['avocat', 'assistance', 'défense', 'droit'], 'points' => 2],
        ['id' => 22, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quel droit concerne la possibilité d\'être examiné par un médecin ?',
         'accept' => ['médecin', 'examen', 'santé', 'visite'], 'points' => 2],
        ['id' => 23, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quel droit concerne la possibilité de bénéficier d\'un interprète ?',
         'accept' => ['interprète', 'traduction', 'langue', 'compréhension'], 'points' => 2],
        ['id' => 24, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Qui la personne placée en garde à vue peut-elle demander à prévenir ?',
         'accept' => ['famille', 'proche', 'personne', 'contact'], 'points' => 2],
        ['id' => 25, 'cat' => 'Garde à vue', 'type' => 'text', 'q' => 'Quelle question doit poser l\'OPJ après avoir énoncé les droits de la personne gardée à vue ?',
         'accept' => ['comprend', 'droits', 'accepte', 'question'], 'points' => 2],

        // ─── PARTIE 3 — PV-IMG, PERQUISITIONS, SAISIES (5 questions) ───
        ['id' => 26, 'cat' => 'PV-IMG', 'type' => 'text', 'q' => 'Quel est l\'objectif du PV-IMG dans le traitement d\'une procédure ?',
         'accept' => ['constat', 'imagerie', 'preuve', 'documentation'], 'points' => 2],
        ['id' => 27, 'cat' => 'PV-IMG', 'type' => 'text', 'q' => 'Pourquoi les actes liés à une garde à vue doivent-ils être correctement retranscrits dans la procédure ?',
         'accept' => ['preuve', 'legal', 'validité', 'procédure'], 'points' => 2],
        ['id' => 28, 'cat' => 'PV-IMG', 'type' => 'text', 'q' => 'Quel article du CPP est cité dans la formation concernant les perquisitions en flagrance ?',
         'accept' => ['53', 'article', 'cpp', 'flagrance'], 'points' => 2],
        ['id' => 29, 'cat' => 'PV-IMG', 'type' => 'text', 'q' => 'Quelle différence la formation présente-t-elle entre une perquisition en flagrance et une perquisition en enquête préliminaire ?',
         'accept' => ['flagrance', 'préliminaire', 'conditions', 'autorisation'], 'points' => 2],
        ['id' => 30, 'cat' => 'PV-IMG', 'type' => 'text', 'q' => 'Quel est le rôle de l\'OPJ concernant les saisies effectuées dans le cadre d\'une procédure ?',
         'accept' => ['saisie', 'sécurisation', 'conservation', 'inventaire'], 'points' => 2],

        // ─── PARTIE 4 — AUDITIONS, RÉQUISITIONS, CONTRÔLE D'IDENTITÉ (5 questions) ───
        ['id' => 31, 'cat' => 'Auditions', 'type' => 'text', 'q' => 'Qu\'est-ce qu\'une audition libre ?',
         'accept' => ['volontaire', 'libre', 'sans contrainte', 'spontanée'], 'points' => 2],
        ['id' => 32, 'cat' => 'Auditions', 'type' => 'text', 'q' => 'Quels sont les principaux droits de la personne entendue librement ?',
         'accept' => ['silence', 'avocat', 'droits', 'renoncer'], 'points' => 2],
        ['id' => 33, 'cat' => 'Auditions', 'type' => 'text', 'q' => 'Qu\'est-ce qu\'une réquisition dans le cadre d\'une enquête judiciaire ?',
         'accept' => ['demande', 'autorité', 'obligation', 'mobilisation'], 'points' => 2],
        ['id' => 34, 'cat' => 'Auditions', 'type' => 'text', 'q' => 'Auprès de qui une réquisition peut-elle être effectuée ?',
         'accept' => ['services', 'publics', 'privés', 'professionnels'], 'points' => 2],
        ['id' => 35, 'cat' => 'Auditions', 'type' => 'text', 'q' => 'Que prévoit l\'article 78-2 du CPP concernant le contrôle d\'identité ?',
         'accept' => ['contrôle', 'identité', '78-2', 'vérification'], 'points' => 2],

        // ─── PARTIE 5 — ENQUÊTE, INFORMATION JUDICIAIRE, RECHERCHE (5 questions) ───
        ['id' => 36, 'cat' => 'Enquête', 'type' => 'text', 'q' => 'Qu\'est-ce qu\'une enquête préliminaire ?',
         'accept' => ['préliminaire', 'début', 'enquête', 'première'], 'points' => 2],
        ['id' => 37, 'cat' => 'Enquête', 'type' => 'text', 'q' => 'Quel est le rôle du juge d\'instruction dans le cadre d\'une information judiciaire ?',
         'accept' => ['instruction', 'juge', 'enquête', 'direction'], 'points' => 2],
        ['id' => 38, 'cat' => 'Enquête', 'type' => 'text', 'q' => 'Quel est le rôle de l\'OPJ lorsqu\'il agit dans le cadre d\'une commission rogatoire ?',
         'accept' => ['commission', 'rogatoire', 'exécution', 'délégation'], 'points' => 2],
        ['id' => 39, 'cat' => 'Enquête', 'type' => 'text', 'q' => 'Quel est le rôle de la police judiciaire dans la recherche des auteurs d\'infractions ?',
         'accept' => ['recherche', 'auteurs', 'identification', 'localisation'], 'points' => 2],
        ['id' => 40, 'cat' => 'Enquête', 'type' => 'text', 'q' => 'Quels éléments ou informations peuvent être exploités dans le cadre du suivi et du recoupement des informations judiciaires ?',
         'accept' => ['informations', 'recoupement', 'bases', 'données', 'fichiers'], 'points' => 2],

        // ─── PARTIE 6 — RÉDACTION D'UN PVI (1 question, 20 points) ───
        ['id' => 41, 'cat' => 'Rédaction PVI', 'type' => 'text',
         'image' => 'assets/pvi-exercice.png',
         'q' => "En vous basant sur l'énoncé ci-dessus, rédigez un Procès-Verbal d'Interpellation (PVI) complet en qualité d'Officier de Police Judiciaire.\n\n" .
                "Le PVI doit être : Chronologique — Précis — Objectif — Professionnel — Cohérent — Détaillé.\n" .
                "Ne rajoutez pas d'informations qui ne sont pas fournies dans le sujet.",
         'accept' => ['procès-verbal', 'interpellation', 'opj', 'qualité', 'identité', 'date', 'heure', 'lieu',
                      'circonstances', 'faits', 'victime', 'déclarations', 'témoin', 'auteur', 'signalement',
                      'interpellation', 'personne', 'téléphone', 'découverte', 'constatations', 'actes',
                      'mesures', 'suites', 'judiciaires', 'clôture', 'transmission', 'procédure',
                      'vol', 'violence', 'martin', 'lucas', 'durand', 'thomas', 'république'],
         'points' => 20],
    ];
}

function pm_get_opj_questions_randomized(): array
{
    $questions = pm_get_opj_questions();
    $pviQuestion = null;
    $otherQuestions = [];
    foreach ($questions as $q) {
        if ($q['id'] == 41) {
            $pviQuestion = $q;
        } else {
            $otherQuestions[] = $q;
        }
    }
    $byCat = [];
    foreach ($otherQuestions as $q) {
        $byCat[$q['cat']][] = $q;
    }
    foreach ($byCat as $cat => &$qs) {
        shuffle($qs);
    }
    unset($qs);
    $result = [];
    $cats = array_keys($byCat);
    shuffle($cats);
    foreach ($cats as $cat) {
        foreach ($byCat[$cat] as $q) {
            $result[] = $q;
        }
    }
    if ($pviQuestion !== null) {
        $result[] = $pviQuestion;
    }
    return $result;
}

function pm_grade_opj_exam(array $answers, array $questions): array
{
    $totalPoints = 0;
    $earnedPoints = 0;
    $details = [];
    $verifyCount = 0;

    foreach ($questions as $q) {
        $qId = (string) $q['id'];
        $points = $q['points'] ?? 2;
        $totalPoints += $points;
        $userAnswer = $answers['q-' . $qId] ?? '';

        $grade = pm_grade_written_answer((string) $userAnswer, $q['accept'] ?? []);

        $earned = (int) round($points * $grade['score']);
        $earnedPoints += $earned;
        if ($grade['status'] === 'verify') $verifyCount++;

        $details[] = [
            'id' => $qId,
            'cat' => $q['cat'],
            'q' => $q['q'],
            'type' => $q['type'],
            'userAnswer' => $userAnswer,
            'points_possible' => $points,
            'points_earned' => $earned,
            'status' => $grade['status'],
            'msg' => $grade['msg'],
        ];
    }

    return [
        'total_points' => $totalPoints,
        'earned_points' => $earnedPoints,
        'passed' => $earnedPoints >= PM_OPJ_PASS_SCORE,
        'verify_count' => $verifyCount,
        'details' => $details,
    ];
}

// ─── CIAPT 1 Exam Questions (20 questions, 20 points) ─────

function pm_get_ciapt1_questions(): array
{
    return [
        // ─── PARTIE 1 — CONNAISSANCES SIG SAUER SP-2022 (12 questions) ───
        ['id' => 1, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quel est le modèle de l\'arme présentée dans la formation ?',
         'accept' => ['sig', 'sauer', 'sp-2022', 'sp2022'], 'points' => 1],
        ['id' => 2, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quel est le calibre du SIG SAUER SP-2022 ?',
         'accept' => ['9mm', 'parabellum', '9 x 19'], 'points' => 1],
        ['id' => 3, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quelle est la longueur totale de l\'arme ?',
         'accept' => ['190', 'mm', 'millimètres'], 'points' => 1],
        ['id' => 4, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quelle est la longueur du canon ?',
         'accept' => ['98', 'mm', 'millimètres'], 'points' => 1],
        ['id' => 5, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quel est le poids de l\'arme à vide ?',
         'accept' => ['720', 'g', 'grammes'], 'points' => 1],
        ['id' => 6, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quel est le poids de l\'arme avec un chargeur garni ?',
         'accept' => ['850', 'g', 'grammes'], 'points' => 1],
        ['id' => 7, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Quelle est la capacité d\'un chargeur du SIG SAUER SP-2022 ?',
         'accept' => ['15', 'quinze', 'cartouches'], 'points' => 1],
        ['id' => 8, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Combien de chargeurs l\'agent doit-il porter lors d\'une patrouille et comment sont-ils répartis ?',
         'accept' => ['3', 'trois', 'un', 'poche', 'ceinture'], 'points' => 1],
        ['id' => 9, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Combien de cartouches doivent être présentes dans chaque chargeur lors du contrôle personnel de sécurité (CPS) ?',
         'accept' => ['15', 'quinze', 'plein'], 'points' => 1],
        ['id' => 10, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Que doit vérifier l\'agent concernant la chambre lors de son CPS ?',
         'accept' => ['chambre', 'vide', 'sûreté', 'verrou'], 'points' => 1],
        ['id' => 11, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Que doit faire l\'agent avec son arme une fois le CPS terminé ?',
         'accept' => ['holster', 'holster', 'fourreau', 'rengainer'], 'points' => 1],
        ['id' => 12, 'cat' => 'Connaissances SIG', 'type' => 'text', 'q' => 'Que doit faire l\'agent à son retour de patrouille concernant son arme ?',
         'accept' => ['cps', 'contrôle', 'sécurité', 'vérifier'], 'points' => 1],

        // ─── PARTIE 2 — RÈGLES DE SÉCURITÉ (4 questions) ───
        ['id' => 13, 'cat' => 'Règles de sécurité', 'type' => 'text', 'q' => 'Quelle est la première règle fondamentale concernant une arme à feu ?',
         'accept' => ['toujours', 'charger', 'décharger', 'charger comme', 'chargée'], 'points' => 1],
        ['id' => 14, 'cat' => 'Règles de sécurité', 'type' => 'text', 'q' => 'Que doit faire l\'agent concernant la direction du canon ?',
         'accept' => ['jamais', 'pointer', 'diriger', 'personne', 'canon'], 'points' => 1],
        ['id' => 15, 'cat' => 'Règles de sécurité', 'type' => 'text', 'q' => 'Où doit se trouver l\'index tant que les organes de visée ne sont pas sur l\'objectif ?',
         'accept' => ['dehors', 'gâchette', 'rainure', 'index', 'hors'], 'points' => 1],
        ['id' => 16, 'cat' => 'Règles de sécurité', 'type' => 'text', 'q' => 'Que signifie la règle : « Être sûr de son objectif et de son environnement » ?',
         'accept' => ['viser', 'tirer', 'cible', 'environnement', 'prudence'], 'points' => 1],

        // ─── PARTIE 3 — AMER ET CADRE LÉGAL (4 questions) ───
        ['id' => 17, 'cat' => 'AMER et cadre légal', 'type' => 'text', 'q' => 'Que signifie l\'acronyme AMER ?',
         'accept' => ['absolue', 'nécessité', 'menace', 'atteinte', 'réelle'], 'points' => 1],
        ['id' => 18, 'cat' => 'AMER et cadre légal', 'type' => 'text', 'q' => 'Que signifie le A dans l\'acronyme AMER ?',
         'accept' => ['absolue', 'nécessité', 'a'], 'points' => 1],
        ['id' => 19, 'cat' => 'AMER et cadre légal', 'type' => 'text', 'q' => 'Que signifie le M dans l\'acronyme AMER ?',
         'accept' => ['menace', 'arme', 'm'], 'points' => 1],
        ['id' => 20, 'cat' => 'AMER et cadre légal', 'type' => 'text', 'q' => 'Quels sont les principaux cadres légaux cités dans la formation concernant l\'usage de l\'arme ?',
         'accept' => ['122-5', 'l435-1', 'code pénal', 'sécurité intérieure', 'légitime défense'], 'points' => 1],
    ];
}

function pm_get_ciapt1_questions_randomized(): array
{
    $questions = pm_get_ciapt1_questions();
    $byCat = [];
    foreach ($questions as $q) {
        $byCat[$q['cat']][] = $q;
    }
    foreach ($byCat as $cat => &$qs) {
        shuffle($qs);
    }
    unset($qs);
    $result = [];
    $cats = array_keys($byCat);
    shuffle($cats);
    foreach ($cats as $cat) {
        foreach ($byCat[$cat] as $q) {
            $result[] = $q;
        }
    }
    return $result;
}

function pm_grade_ciapt1_exam(array $answers, array $questions): array
{
    $totalPoints = 0;
    $earnedPoints = 0;
    $details = [];
    $verifyCount = 0;

    foreach ($questions as $q) {
        $qId = (string) $q['id'];
        $points = $q['points'] ?? 1;
        $totalPoints += $points;
        $userAnswer = $answers['q-' . $qId] ?? '';

        $grade = pm_grade_written_answer((string) $userAnswer, $q['accept'] ?? []);

        $earned = (int) round($points * $grade['score']);
        $earnedPoints += $earned;
        if ($grade['status'] === 'verify') $verifyCount++;

        $details[] = [
            'id' => $qId,
            'cat' => $q['cat'],
            'q' => $q['q'],
            'type' => $q['type'],
            'userAnswer' => $userAnswer,
            'points_possible' => $points,
            'points_earned' => $earned,
            'status' => $grade['status'],
            'msg' => $grade['msg'],
        ];
    }

    return [
        'total_points' => $totalPoints,
        'earned_points' => $earnedPoints,
        'passed' => $earnedPoints >= PM_CIAPT1_PASS_SCORE,
        'verify_count' => $verifyCount,
        'details' => $details,
    ];
}

// ─── APJA Exam Questions (20 questions, 20 points) ─────

function pm_get_apja_questions(): array
{
    return [
        // ─── PARTIE 1 — PRÉSENTATION DE L'APJ-A (7 questions) ───
        ['id' => 1, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Que signifie l\'abréviation APJ-A ?',
         'accept' => ['agent', 'police', 'judiciaire', 'adjoint'], 'points' => 1],
        ['id' => 2, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Quel article du Code de procédure pénale définit les agents de police judiciaire adjoints ?',
         'accept' => ['15', 'article', 'cpp', 'procédure', 'pénale'], 'points' => 1],
        ['id' => 3, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Quelles sont les principales missions d\'un APJ-A ?',
         'accept' => ['constatation', 'infractions', 'aide', 'secours', 'assistance'], 'points' => 1],
        ['id' => 4, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Quelles sont les principales différences entre les pouvoirs d\'un APJ-A, d\'un APJ et d\'un OPJ ?',
         'accept' => ['pouvoirs', 'limités', 'délégation', 'autonome', 'supervision'], 'points' => 1],
        ['id' => 5, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Un APJ-A peut-il mener une enquête de police judiciaire ? Justifiez.',
         'accept' => ['non', 'pas', 'enquête', 'limité', 'supervision'], 'points' => 1],
        ['id' => 6, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Un APJ-A peut-il placer un mis en cause en garde à vue ?',
         'accept' => ['non', 'pas', 'garde', 'vue', 'opj'], 'points' => 1],
        ['id' => 7, 'cat' => 'Présentation APJ-A', 'type' => 'text', 'q' => 'Quel document l\'APJ-A doit-il rédiger lorsqu\'il constate une infraction ?',
         'accept' => ['rapport', 'procès-verbal', 'pv', 'constatation'], 'points' => 1],

        // ─── PARTIE 2 — POLICE JUDICIAIRE (4 questions) ───
        ['id' => 8, 'cat' => 'Police judiciaire', 'type' => 'text', 'q' => 'Quel article du Code de procédure pénale définit la police judiciaire ?',
         'accept' => ['12', 'article', 'cpp', 'procédure', 'pénale'], 'points' => 1],
        ['id' => 9, 'cat' => 'Police judiciaire', 'type' => 'text', 'q' => 'Quelles sont les principales missions de la police judiciaire ?',
         'accept' => ['recherche', 'auteurs', 'constatation', 'infractions', 'poursuite'], 'points' => 1],
        ['id' => 10, 'cat' => 'Police judiciaire', 'type' => 'text', 'q' => 'Qui est présenté comme le directeur de la police judiciaire dans le document ?',
         'accept' => ['procureur', 'juge', 'directeur', 'magistrat'], 'points' => 1],
        ['id' => 11, 'cat' => 'Police judiciaire', 'type' => 'text', 'q' => 'Quelles sont les différentes catégories de personnels composant la police judiciaire selon la formation ?',
         'accept' => ['opj', 'apj', 'apj-a', 'officier', 'agent'], 'points' => 1],

        // ─── PARTIE 3 — PRÉROGATIVES DE L'APJ-A (3 questions) ───
        ['id' => 12, 'cat' => 'Prérrogatives APJ-A', 'type' => 'text', 'q' => 'Citez les deux principaux documents qu\'un APJ-A peut rédiger selon la formation.',
         'accept' => ['rapport', 'procès-verbal', 'pv', 'constatation'], 'points' => 1],
        ['id' => 13, 'cat' => 'Prérrogatives APJ-A', 'type' => 'text', 'q' => 'Quel type d\'infractions peut faire l\'objet d\'un procès-verbal rédigé par un APJ-A ?',
         'accept' => ['contravention', 'délit', 'infraction', 'flagrance'], 'points' => 1],
        ['id' => 14, 'cat' => 'Prérrogatives APJ-A', 'type' => 'text', 'q' => 'Quelle aide l\'APJ-A apporte-t-il à l\'OPJ ou à l\'APJ lors d\'une procédure judiciaire ?',
         'accept' => ['assistance', 'aide', 'soutien', 'présence', 'témoignage'], 'points' => 1],

        // ─── PARTIE 4 — PROCÉDURE D'INTERVENTION (6 questions) ───
        ['id' => 15, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Que prévoit l\'article 73 du Code de procédure pénale concernant l\'appréhension de l\'auteur d\'un crime ou d\'un délit flagrant ?',
         'accept' => ['73', 'appréhension', 'flagrant', 'auteur', 'crime'], 'points' => 1],
        ['id' => 16, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Lors de l\'interpellation d\'un individu, pourquoi les objets de sûreté doivent-ils être placés ?',
         'accept' => ['sûreté', 'sécurité', 'menottage', 'menottes', 'contrôle'], 'points' => 1],
        ['id' => 17, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Quelle information concernant la privation de liberté doit être relevée lors de l\'interpellation ?',
         'accept' => ['heure', 'moment', 'début', 'privation', 'liberté'], 'points' => 1],
        ['id' => 18, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Quel est l\'objectif de la palpation de sécurité ?',
         'accept' => ['recherche', 'arme', 'objet', 'sécurité', 'palpation'], 'points' => 1],
        ['id' => 19, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Quelles informations constituent l\'identité d\'une personne selon la formation ?',
         'accept' => ['nom', 'prénom', 'date', 'naissance', 'adresse', 'identité'], 'points' => 1],
        ['id' => 20, 'cat' => 'Procédure intervention', 'type' => 'text', 'q' => 'Quelles sont les différentes étapes de la procédure d\'intervention présentées dans la formation, depuis l\'interpellation jusqu\'à la rédaction du rapport ?',
         'accept' => ['interpellation', 'palpation', 'identité', 'menottage', 'rapport', 'rédaction'], 'points' => 1],
    ];
}

function pm_get_apja_questions_randomized(): array
{
    $questions = pm_get_apja_questions();
    $byCat = [];
    foreach ($questions as $q) {
        $byCat[$q['cat']][] = $q;
    }
    foreach ($byCat as $cat => &$qs) {
        shuffle($qs);
    }
    unset($qs);
    $result = [];
    $cats = array_keys($byCat);
    shuffle($cats);
    foreach ($cats as $cat) {
        foreach ($byCat[$cat] as $q) {
            $result[] = $q;
        }
    }
    return $result;
}

function pm_grade_apja_exam(array $answers, array $questions): array
{
    $totalPoints = 0;
    $earnedPoints = 0;
    $details = [];
    $verifyCount = 0;

    foreach ($questions as $q) {
        $qId = (string) $q['id'];
        $points = $q['points'] ?? 1;
        $totalPoints += $points;
        $userAnswer = $answers['q-' . $qId] ?? '';

        $grade = pm_grade_written_answer((string) $userAnswer, $q['accept'] ?? []);

        $earned = (int) round($points * $grade['score']);
        $earnedPoints += $earned;
        if ($grade['status'] === 'verify') $verifyCount++;

        $details[] = [
            'id' => $qId,
            'cat' => $q['cat'],
            'q' => $q['q'],
            'type' => $q['type'],
            'userAnswer' => $userAnswer,
            'points_possible' => $points,
            'points_earned' => $earned,
            'status' => $grade['status'],
            'msg' => $grade['msg'],
        ];
    }

    return [
        'total_points' => $totalPoints,
        'earned_points' => $earnedPoints,
        'passed' => $earnedPoints >= PM_APJA_PASS_SCORE,
        'verify_count' => $verifyCount,
        'details' => $details,
    ];
}

// ─── Similarity Detection ───

function pm_normalize_text(string $text): string
{
    $text = mb_strtolower(trim($text), 'UTF-8');
    $text = preg_replace('/[^\p{L}\p{N}\s]/u', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    $stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'en', 'et', 'ou', 'est', 'sont', 'a', 'au', 'aux', 'ce', 'se', 'ne', 'que', 'qui', 'dans', 'pour', 'par', 'sur', 'pas', 'plus', 'avec', 'son', 'sa', 'ses', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'je', 'tu', 'on', 'c', 'n', 's', 'qu', 'l'];
    $words = explode(' ', $text);
    $words = array_filter($words, function ($w) use ($stopWords) { return !in_array($w, $stopWords) && strlen($w) > 1; });
    return implode(' ', $words);
}

function pm_text_similarity(string $a, string $b): float
{
    $a = pm_normalize_text($a);
    $b = pm_normalize_text($b);
    if ($a === '' && $b === '') return 1.0;
    if ($a === '' || $b === '') return 0.0;

    $wordsA = explode(' ', $a);
    $wordsB = explode(' ', $b);
    $setA = array_unique($wordsA);
    $setB = array_unique($wordsB);
    $intersection = array_intersect($setA, $setB);
    $union = array_unique(array_merge($setA, $setB));
    if (count($union) === 0) return 0.0;
    return count($intersection) / count($union);
}

function pm_keywords_present(string $answer, array $keywords): int
{
    $norm = pm_normalize_text($answer);
    $found = 0;
    foreach ($keywords as $kw) {
        $kwNorm = pm_normalize_text($kw);
        if ($kwNorm !== '' && strpos($norm, $kwNorm) !== false) {
            $found++;
        }
    }
    return $found;
}

function pm_grade_written_answer(string $userAnswer, array $acceptKeywords): array
{
    $userAnswer = trim($userAnswer);
    if ($userAnswer === '') {
        return ['score' => 0, 'status' => 'empty', 'msg' => 'Pas de réponse'];
    }

    $found = pm_keywords_present($userAnswer, $acceptKeywords);
    $total = count($acceptKeywords);
    $ratio = $total > 0 ? $found / $total : 0;

    if ($ratio >= 0.7) {
        return ['score' => 1.0, 'status' => 'correct', 'msg' => 'Réponse correcte'];
    } elseif ($ratio >= 0.4) {
        return ['score' => 0.5, 'status' => 'verify', 'msg' => 'Réponse partielle — à vérifier'];
    } else {
        $bestSim = 0.0;
        foreach ($acceptKeywords as $kw) {
            $sim = pm_text_similarity($userAnswer, $kw);
            if ($sim > $bestSim) $bestSim = $sim;
        }
        if ($bestSim >= 0.5) {
            return ['score' => 0.5, 'status' => 'verify', 'msg' => 'Similarité détectée — à vérifier'];
        }
        return ['score' => 0, 'status' => 'incorrect', 'msg' => 'Réponse incorrecte'];
    }
}

function pm_grade_trou_answer(string $userAnswer, array $accept): array
{
    $userAnswer = trim(mb_strtolower($userAnswer, 'UTF-8'));
    $userAnswer = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $userAnswer);
    foreach ($accept as $a) {
        $aNorm = trim(mb_strtolower($a, 'UTF-8'));
        $aNorm = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $aNorm);
        if ($userAnswer === $aNorm) {
            return ['score' => 1.0, 'status' => 'correct', 'msg' => 'Exact'];
        }
        if (pm_text_similarity($userAnswer, $aNorm) >= 0.6) {
            return ['score' => 0.5, 'status' => 'verify', 'msg' => 'Similarité détectée — à vérifier'];
        }
    }
    return ['score' => 0, 'status' => 'incorrect', 'msg' => 'Réponse incorrecte'];
}

function pm_grade_integration_exam(array $answers, array $questions): array
{
    $totalPoints = 0;
    $earnedPoints = 0;
    $details = [];
    $verifyCount = 0;

    foreach ($questions as $q) {
        $qId = (string) $q['id'];
        $points = $q['points'] ?? 2;
        $totalPoints += $points;
        $userAnswer = $answers['q-' . $qId] ?? '';

        $grade = ['score' => 0, 'status' => 'incorrect', 'msg' => ''];

        if ($q['type'] === 'qcm') {
            $idx = is_numeric($userAnswer) ? (int) $userAnswer : -1;
            if ($idx === ($q['correct'] ?? -1)) {
                $grade = ['score' => 1.0, 'status' => 'correct', 'msg' => 'Bonne réponse'];
            } else {
                $grade = ['score' => 0, 'status' => 'incorrect', 'msg' => 'Mauvaise réponse'];
            }
        } elseif ($q['type'] === 'trou') {
            $grade = pm_grade_trou_answer((string) $userAnswer, $q['accept'] ?? []);
        } elseif ($q['type'] === 'text') {
            $grade = pm_grade_written_answer((string) $userAnswer, $q['accept'] ?? []);
        }

        $earned = (int) round($points * $grade['score']);
        $earnedPoints += $earned;
        if ($grade['status'] === 'verify') $verifyCount++;

        $details[] = [
            'id' => $qId,
            'cat' => $q['cat'],
            'q' => $q['q'],
            'type' => $q['type'],
            'userAnswer' => $userAnswer,
            'points_possible' => $points,
            'points_earned' => $earned,
            'status' => $grade['status'],
            'msg' => $grade['msg'],
        ];
    }

    return [
        'total_points' => $totalPoints,
        'earned_points' => $earnedPoints,
        'passed' => $earnedPoints >= PM_INTEGRATION_PASS_SCORE,
        'verify_count' => $verifyCount,
        'details' => $details,
    ];
}
