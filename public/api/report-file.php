<?php
/**
 * Shahid Security — gated report file streamer.
 *
 * Deployed at public_html/api/report-file.php on Hostinger shared hosting.
 * Streams a protected PDF from OUTSIDE public_html only when given a valid,
 * unexpired token minted by report-download.php for the matching slug.
 */

declare(strict_types=1);

const SITE_PARENT_DIR_LEVELS = 2; // public_html/api/report-file.php -> parent of public_html

const ALLOWED_REPORTS = [
    'iot-smart-campus' => [
        'file' => 'iot-smart-campus-thesis.pdf',
        'downloadName' => 'Shahid-Iqbal-IoT-Smart-Campus-Threats-Report.pdf',
    ],
];

function shahid_root(): string
{
    return dirname(__DIR__, SITE_PARENT_DIR_LEVELS);
}

function deny(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

$slug = (string) ($_GET['slug'] ?? '');
$token = (string) ($_GET['token'] ?? '');

if (!array_key_exists($slug, ALLOWED_REPORTS)) {
    deny(404, 'Not found.');
}

if ($token === '' || !ctype_xdigit($token) || strlen($token) !== 48) {
    deny(403, 'Invalid or expired link. Please request the report again.');
}

$tokenPath = shahid_root() . '/shahid-security-data/report-tokens/' . $token . '.json';
if (!is_file($tokenPath)) {
    deny(403, 'Invalid or expired link. Please request the report again.');
}

$record = json_decode((string) @file_get_contents($tokenPath), true);
if (
    !is_array($record) ||
    ($record['slug'] ?? null) !== $slug ||
    !isset($record['expiresAt']) ||
    (int) $record['expiresAt'] < time()
) {
    deny(403, 'Invalid or expired link. Please request the report again.');
}

$filePath = shahid_root() . '/php/protected/reports/' . ALLOWED_REPORTS[$slug]['file'];
if (!is_file($filePath)) {
    error_log("[shahid-report-file] Missing protected file for slug '$slug': $filePath");
    deny(500, 'Sorry, this report is temporarily unavailable. Please email info@shahidiqbal.com.');
}

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . ALLOWED_REPORTS[$slug]['downloadName'] . '"');
header('Content-Length: ' . (string) filesize($filePath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($filePath);
exit;
