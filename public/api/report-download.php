<?php
/**
 * Shahid Security — gated report download handler.
 *
 * Deployed at public_html/api/report-download.php on Hostinger shared hosting.
 * Validates a lead-capture form (email, purpose, details), emails the lead to
 * info@shahidiqbal.com, then mints a short-lived download token for
 * report-file.php. Mirrors public/api/contact.php's patterns (rate limiting,
 * honeypot/timing anti-spam, PHPMailer over Hostinger SMTP). Fails safely when
 * config/deps are missing so local/CI checks don't need real credentials.
 */

declare(strict_types=1);

const SITE_PARENT_DIR_LEVELS = 2; // public_html/api/report-download.php -> parent of public_html
const TOKEN_TTL_SECONDS = 172800; // 48 hours

// Slug allowlist — maps a public report identifier to the protected file that
// lives OUTSIDE public_html. Never build this path from user input directly.
const ALLOWED_REPORTS = [
    'iot-smart-campus' => [
        'file' => 'iot-smart-campus-thesis.pdf',
        'title' => 'Threats & Attacks on an IoT-Based Smart Campus System',
    ],
];

function shahid_root(): string
{
    return dirname(__DIR__, SITE_PARENT_DIR_LEVELS);
}

function json_response(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}

function fail(string $message, array $fieldErrors = [], int $status = 400): never
{
    json_response($status, ['success' => false, 'message' => $message, 'fieldErrors' => $fieldErrors]);
}

function succeed(string $downloadUrl): never
{
    json_response(200, ['success' => true, 'downloadUrl' => $downloadUrl]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', [], 405);
}

// ---------------------------------------------------------------------------
// Rate limiting — simple file-based token bucket per IP.
// ---------------------------------------------------------------------------
function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_limit_ok(string $ip, int $maxRequests = 8, int $windowSeconds = 600): bool
{
    $dir = shahid_root() . '/shahid-security-data/ratelimit-report';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        return true;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $timestamps = [];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $decoded = $raw !== false ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $timestamps = $decoded;
        }
    }

    $timestamps = array_values(array_filter($timestamps, fn($t) => $t > $now - $windowSeconds));

    if (count($timestamps) >= $maxRequests) {
        return false;
    }

    $timestamps[] = $now;
    @file_put_contents($file, json_encode($timestamps), LOCK_EX);
    return true;
}

if (!rate_limit_ok(client_ip())) {
    fail('Too many requests. Please try again later.', [], 429);
}

// ---------------------------------------------------------------------------
// Honeypot + minimum time-to-submit.
// ---------------------------------------------------------------------------
$honeypot = trim((string) ($_POST['website'] ?? ''));
$ts = $_POST['ts'] ?? null;
$isBot = false;
if ($honeypot !== '') {
    $isBot = true;
}
if (!$isBot && $ts !== null && ctype_digit((string) $ts)) {
    $elapsedMs = (int) (microtime(true) * 1000) - (int) $ts;
    if ($elapsedMs >= 0 && $elapsedMs < 2000) {
        $isBot = true;
    }
}

// ---------------------------------------------------------------------------
// Load config (outside public_html). Fail safely if it's missing.
// ---------------------------------------------------------------------------
$configPath = shahid_root() . '/shahid-security-config.php';
$configLoaded = is_file($configPath);
if ($configLoaded) {
    require_once $configPath;
}

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------
const ALLOWED_PURPOSES = [
    'Recruiter / hiring review',
    'Academic or research reference',
    'Client due-diligence',
    'Personal interest',
    'Other',
];

function clean_field(mixed $value, int $maxLength): string
{
    $value = trim((string) $value);
    $value = str_replace(["\r", "\n"], '', $value);
    return mb_substr($value, 0, $maxLength);
}

$slug = clean_field($_POST['slug'] ?? '', 100);
if (!array_key_exists($slug, ALLOWED_REPORTS)) {
    fail('Unknown report.', [], 404);
}

$fieldErrors = [];

$emailRaw = clean_field($_POST['email'] ?? '', 254);
$email = filter_var($emailRaw, FILTER_VALIDATE_EMAIL);
if ($email === false) {
    $fieldErrors['email'] = 'Please enter a valid email address.';
}

$purpose = clean_field($_POST['purpose'] ?? '', 100);
if (!in_array($purpose, ALLOWED_PURPOSES, true)) {
    $fieldErrors['purpose'] = 'Please select a purpose.';
}

$details = trim((string) ($_POST['details'] ?? ''));
$details = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $details) ?? '';
$details = mb_substr($details, 0, 2000);
if (mb_strlen($details) < 5) {
    $fieldErrors['details'] = "Please add a short note (at least a few words).";
}

if (!empty($fieldErrors)) {
    fail('Please fix the highlighted fields.', $fieldErrors, 422);
}

// A honeypot/timing trip still returns a convincing success response (a real
// download URL that resolves to nothing new) so bots aren't tipped off, but
// we skip the token mint and lead email entirely.
if ($isBot) {
    succeed('/api/report-file.php?slug=' . urlencode($slug) . '&token=invalid');
}

// ---------------------------------------------------------------------------
// Mint a short-lived download token.
// ---------------------------------------------------------------------------
function mint_token(string $slug, string $email, string $purpose): ?string
{
    $dir = shahid_root() . '/shahid-security-data/report-tokens';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        return null;
    }

    try {
        $token = bin2hex(random_bytes(24));
    } catch (Exception) {
        return null;
    }

    $record = [
        'slug' => $slug,
        'email' => $email,
        'purpose' => $purpose,
        'createdAt' => time(),
        'expiresAt' => time() + TOKEN_TTL_SECONDS,
    ];

    $written = @file_put_contents($dir . '/' . $token . '.json', json_encode($record), LOCK_EX);
    return $written !== false ? $token : null;
}

$token = mint_token($slug, $email, $purpose);
if ($token === null) {
    fail('Sorry, something went wrong on our end. Please email info@shahidiqbal.com instead.', [], 500);
}

// ---------------------------------------------------------------------------
// Notify info@shahidiqbal.com of the lead. Best-effort — a mail failure
// should not block the download, since the token is already valid.
// ---------------------------------------------------------------------------
$vendorAutoload = shahid_root() . '/php/vendor/autoload.php';
if ($configLoaded && is_file($vendorAutoload) && defined('SMTP_HOST')) {
    require_once $vendorAutoload;

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->Timeout = 8; // fail fast — the download must not hang on a mail hiccup
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USERNAME;
        $mail->Password = SMTP_PASSWORD;
        $mail->SMTPSecure = SMTP_ENCRYPTION;
        $mail->Port = SMTP_PORT;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom(CONTACT_FROM_EMAIL, CONTACT_FROM_NAME);
        $mail->addAddress(CONTACT_TO_EMAIL);
        $mail->addReplyTo($email, $email);
        $mail->Subject = 'Report download: ' . ALLOWED_REPORTS[$slug]['title'];
        $mail->Body = implode("\n", [
            "Report: " . ALLOWED_REPORTS[$slug]['title'] . " ($slug)",
            "Requester email: $email",
            "Purpose: $purpose",
            '',
            'Details:',
            $details,
        ]);
        $mail->send();
    } catch (\PHPMailer\PHPMailer\Exception $e) {
        error_log('[shahid-report-download] PHPMailer error: ' . $e->getMessage());
        // Continue — the download itself should still work.
    }
}

succeed('/api/report-file.php?slug=' . urlencode($slug) . '&token=' . urlencode($token));
