<?php
/**
 * Shahid Security — consultation booking handler.
 *
 * Deployed at public_html/api/book.php on Hostinger shared hosting. Same
 * validation/anti-spam/mail approach as contact.php (see that file's header
 * comment and README.md / php/README.md for setup) — this just handles a
 * different, smaller field set: name, country, phone, preferred date/time.
 *
 * Note: this is a "request a time" form, not a live-availability calendar —
 * there is no database tracking existing bookings (by design, this site has
 * none), so it cannot prevent double-booking automatically. Each request is
 * emailed to CONTACT_TO_EMAIL for manual confirmation.
 */

declare(strict_types=1);

const SITE_PARENT_DIR_LEVELS = 2; // public_html/api/book.php -> parent of public_html

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
    header('Location: /book/?error=1');
    exit;
}

function succeed(): never
{
    if (wants_json()) {
        json_response(200, ['success' => true]);
    }
    header('Location: /book/thanks/');
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', [], 405);
}

// ---------------------------------------------------------------------------
// Rate limiting — same file-based token bucket approach as contact.php, in
// its own sub-directory so the two forms don't share a request budget.
// ---------------------------------------------------------------------------
function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_limit_ok(string $ip, int $maxRequests = 5, int $windowSeconds = 600): bool
{
    $dir = shahid_root() . '/shahid-security-data/ratelimit-booking';
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
// Validation. Keep in sync with src/components/BookingForm.astro.
// Business hours: Monday-Saturday, 10:00-20:00 PKT (see src/lib/site.ts).
// ---------------------------------------------------------------------------
function clean_field(mixed $value, int $maxLength): string
{
    $value = trim((string) $value);
    $value = str_replace(["\r", "\n"], '', $value);
    return mb_substr($value, 0, $maxLength);
}

$fieldErrors = [];

$name = clean_field($_POST['name'] ?? '', 200);
if ($name === '') {
    $fieldErrors['name'] = 'Please enter your name.';
}

$country = clean_field($_POST['country'] ?? '', 100);
if ($country === '') {
    $fieldErrors['country'] = 'Please enter your country.';
}

$phone = clean_field($_POST['phone'] ?? '', 50);
if ($phone === '') {
    $fieldErrors['phone'] = 'Please enter a phone/WhatsApp number.';
}

$dateRaw = clean_field($_POST['date'] ?? '', 20);
$date = \DateTime::createFromFormat('!Y-m-d', $dateRaw);
$dateErrors = \DateTime::getLastErrors();
if (!$date || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))) {
    $fieldErrors['date'] = 'Please pick a valid date.';
} else {
    $today = new \DateTime('today');
    if ($date < $today) {
        $fieldErrors['date'] = 'Please pick a date in the future.';
    } elseif ((int) $date->format('w') === 0) {
        // Sunday — closed.
        $fieldErrors['date'] = "We're closed Sundays — please pick Monday-Saturday.";
    }
}

$time = clean_field($_POST['time'] ?? '', 10);
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
    $fieldErrors['time'] = 'Please pick a valid time.';
} else {
    [$h, $m] = array_map('intval', explode(':', $time));
    $minutes = $h * 60 + $m;
    if ($minutes < 10 * 60 || $minutes > 19 * 60 + 30) {
        $fieldErrors['time'] = 'Please pick a time between 10:00 and 20:00 PKT.';
    }
}

if (!empty($fieldErrors)) {
    fail('Please fix the highlighted fields.', $fieldErrors, 422);
}

// ---------------------------------------------------------------------------
// Send mail.
// ---------------------------------------------------------------------------
$vendorAutoload = shahid_root() . '/php/vendor/autoload.php';

if (!$configLoaded || !is_file($vendorAutoload) || !defined('SMTP_HOST')) {
    error_log('[shahid-book] Mail not sent: config or PHPMailer dependency missing.');
    fail('Sorry, something went wrong on our end. Please WhatsApp us instead.', [], 500);
}

require_once $vendorAutoload;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

function send_booking_mail(string $name, string $country, string $phone, string $date, string $time): bool
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
        $mail->Subject = "New consultation request: $date $time";
        $mail->Body = implode("\n", [
            "Name: $name",
            "Country: $country",
            "Phone/WhatsApp: $phone",
            "Requested date: $date",
            "Requested time: $time PKT",
            '',
            'No email address was collected — reply via phone/WhatsApp to confirm.',
            'This is a request, not a confirmed booking — check your own calendar before replying.',
        ]);
        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        error_log('[shahid-book] PHPMailer error: ' . $e->getMessage());
        return false;
    }
}

if (!send_booking_mail($name, $country, $phone, $dateRaw, $time)) {
    fail('Sorry, something went wrong sending your request. Please WhatsApp us instead.', [], 500);
}

succeed();
