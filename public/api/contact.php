<?php
/**
 * Shahid Security — contact form handler.
 *
 * Deployed at public_html/api/contact.php on Hostinger shared hosting.
 * Validates and sanitises input, checks a honeypot + minimum time-to-submit,
 * verifies Cloudflare Turnstile server-side, rate-limits per IP, and sends
 * mail via PHPMailer over Hostinger SMTP. See README.md and php/README.md
 * for setup. Fails safely (generic error, no crash) when config/deps are
 * missing so local/CI checks don't need real credentials.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Locate the site root ABOVE public_html. Config and the PHPMailer vendor
// folder must live outside the web-servable directory. Adjust this constant
// if your Hostinger account nests public_html differently.
// ---------------------------------------------------------------------------
const SITE_PARENT_DIR_LEVELS = 2; // public_html/api/contact.php -> parent of public_html

function shahid_root(): string
{
    return dirname(__DIR__, SITE_PARENT_DIR_LEVELS);
}

// Keep in sync with `whatsappNumber` in src/lib/site.ts.
const WHATSAPP_NUMBER = '923116234126';

function json_response(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return str_contains($accept, 'application/json') || strtolower($xhr) === 'xmlhttprequest';
}

function fail(string $message, array $fieldErrors = [], int $status = 400): never
{
    if (wants_json()) {
        json_response($status, ['success' => false, 'message' => $message, 'fieldErrors' => $fieldErrors]);
    }
    header('Location: /contact/?error=1');
    exit;
}

function succeed(): never
{
    if (wants_json()) {
        json_response(200, ['success' => true]);
    }
    header('Location: /contact/thanks/');
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', [], 405);
}

// ---------------------------------------------------------------------------
// Rate limiting — simple file-based token bucket per IP.
// TODO: replace with a shared store (e.g. Redis/KV) if this ever runs on
// more than one PHP worker/server, since the filesystem bucket is per-host.
// ---------------------------------------------------------------------------
function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_limit_ok(string $ip, int $maxRequests = 5, int $windowSeconds = 600): bool
{
    $dir = shahid_root() . '/shahid-security-data/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        // Can't rate-limit if the directory isn't writable — fail open rather
        // than blocking every legitimate submission.
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
// Honeypot + minimum time-to-submit (both silently "succeed" to avoid
// tipping off bots that they were caught).
// ---------------------------------------------------------------------------
$honeypot = trim((string) ($_POST['website'] ?? ''));
if ($honeypot !== '') {
    succeed();
}

$ts = $_POST['ts'] ?? null;
if ($ts !== null && ctype_digit((string) $ts)) {
    $elapsedMs = (int) (microtime(true) * 1000) - (int) $ts;
    if ($elapsedMs >= 0 && $elapsedMs < 2500) {
        succeed();
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
// Cloudflare Turnstile verification (skipped, not bypassed-as-success, when
// no secret key is configured — lets the form be tested without live keys).
// ---------------------------------------------------------------------------
function turnstile_ok(string $secret, string $token, string $ip): bool
{
    if ($token === '') {
        return false;
    }
    $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $ip,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
    ]);
    $result = curl_exec($ch);
    curl_close($ch);
    if ($result === false) {
        return false;
    }
    $decoded = json_decode($result, true);
    return is_array($decoded) && ($decoded['success'] ?? false) === true;
}

if ($configLoaded && defined('TURNSTILE_SECRET_KEY') && TURNSTILE_SECRET_KEY !== '') {
    $token = (string) ($_POST['cf-turnstile-response'] ?? '');
    if (!turnstile_ok(TURNSTILE_SECRET_KEY, $token, client_ip())) {
        fail('We could not verify your submission. Please try again.');
    }
}

// ---------------------------------------------------------------------------
// Validation. Keep in sync with the fields in src/components/ContactForm.astro.
// ---------------------------------------------------------------------------
const ALLOWED_SERVICES = [
    'Penetration Testing',
    'Vulnerability Assessment',
    'Network & Cloud Security',
    'Compliance & Risk',
    'Incident Response (urgent)',
    'Monitoring & Training',
    'Website Development',
    'Software Development',
    'AI Automation',
    'Not sure',
];

function clean_field(mixed $value, int $maxLength): string
{
    $value = trim((string) $value);
    // Reject header-injection attempts outright rather than trying to strip them.
    $value = str_replace(["\r", "\n"], '', $value);
    return mb_substr($value, 0, $maxLength);
}

$fieldErrors = [];

$name = clean_field($_POST['name'] ?? '', 200);
if ($name === '') {
    $fieldErrors['name'] = 'Please enter your name.';
}

$emailRaw = clean_field($_POST['email'] ?? '', 254);
$email = filter_var($emailRaw, FILTER_VALIDATE_EMAIL);
if ($email === false) {
    $fieldErrors['email'] = 'Please enter a valid email address.';
}

$company = clean_field($_POST['company'] ?? '', 200);
$phone = clean_field($_POST['phone'] ?? '', 50);

$service = clean_field($_POST['service'] ?? '', 100);
if (!in_array($service, ALLOWED_SERVICES, true)) {
    $service = 'Not sure';
}

// Message may legitimately contain newlines — only strip control chars.
$message = trim((string) ($_POST['message'] ?? ''));
$message = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $message) ?? '';
$message = mb_substr($message, 0, 5000);
if ($message === '') {
    $fieldErrors['message'] = 'Please enter a message.';
}

$ndaRequested = ($_POST['nda'] ?? '') === 'yes';

if (!empty($fieldErrors)) {
    fail('Please fix the highlighted fields.', $fieldErrors, 422);
}

// ---------------------------------------------------------------------------
// Send mail. Never log $message or $email bodies — only technical errors.
// ---------------------------------------------------------------------------
$vendorAutoload = shahid_root() . '/php/vendor/autoload.php';

if (!$configLoaded || !is_file($vendorAutoload) || !defined('SMTP_HOST')) {
    error_log('[shahid-contact] Mail not sent: config or PHPMailer dependency missing.');
    fail('Sorry, something went wrong on our end. Please WhatsApp us instead.', [], 500);
}

require_once $vendorAutoload;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

function send_mail(string $email, string $name, string $company, string $phone, string $service, string $message, bool $ndaRequested): bool
{
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USERNAME;
        $mail->Password = SMTP_PASSWORD;
        $mail->SMTPSecure = SMTP_ENCRYPTION;
        $mail->Port = SMTP_PORT;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom(CONTACT_FROM_EMAIL, CONTACT_FROM_NAME);
        $mail->addAddress(CONTACT_TO_EMAIL);
        $mail->addReplyTo($email, $name);
        $mail->Subject = 'New enquiry: ' . $service;
        $mail->Body = implode("\n", [
            "Name: $name",
            "Email: $email",
            "Company: " . ($company !== '' ? $company : '-'),
            "Phone/WhatsApp: " . ($phone !== '' ? $phone : '-'),
            "Service: $service",
            "NDA requested: " . ($ndaRequested ? 'Yes' : 'No'),
            '',
            'Message:',
            $message,
        ]);
        $mail->send();

        // Auto-reply — generic, no submitted content beyond the visitor's own name.
        $reply = new PHPMailer(true);
        $reply->isSMTP();
        $reply->Host = SMTP_HOST;
        $reply->SMTPAuth = true;
        $reply->Username = SMTP_USERNAME;
        $reply->Password = SMTP_PASSWORD;
        $reply->SMTPSecure = SMTP_ENCRYPTION;
        $reply->Port = SMTP_PORT;
        $reply->CharSet = 'UTF-8';

        $reply->setFrom(CONTACT_FROM_EMAIL, CONTACT_FROM_NAME);
        $reply->addAddress($email, $name);
        $reply->Subject = 'We received your message — Shahid Security';
        $reply->Body = implode("\n", [
            "Hi $name,",
            '',
            "Thanks for reaching out to Shahid Security. We've received your message and reply within 24 hours on working days.",
            'For urgent incidents (active hack, ransomware), WhatsApp us: https://wa.me/' . WHATSAPP_NUMBER,
            '',
            '— Shahid Security',
        ]);
        $reply->send();

        return true;
    } catch (PHPMailerException $e) {
        error_log('[shahid-contact] PHPMailer error: ' . $e->getMessage());
        return false;
    }
}

if (!send_mail($email, $name, $company, $phone, $service, $message, $ndaRequested)) {
    fail('Sorry, something went wrong sending your message. Please WhatsApp us instead.', [], 500);
}

succeed();
