#!/usr/bin/env node
// Shahid Security invoice generator — reproduces the exact layout of the
// business's existing invoice design: dark navy page, purple->gold
// gradient accent bar, orange/purple card accents, purple table header,
// purple TOTAL box, branded footer.
//
// Usage: node generate.mjs <data.json> [output.pdf]
// See data.example.json for the exact shape expected.

import fs from 'node:fs';
import path from 'node:path';
import pkg from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pkg;

const dir = import.meta.dirname;
const repoRoot = path.resolve(dir, '../..');

const dataPath = process.argv[2];
if (!dataPath) {
  console.error('Usage: node generate.mjs <data.json> [output.pdf]');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const outPath = process.argv[3] ?? path.join(dir, `Invoice_${data.invoiceNo ?? 'output'}.pdf`);

const logoPath = path.join(repoRoot, 'public/brand/logo-stacked-dark-bg.png');
const logoB64 = fs.readFileSync(logoPath).toString('base64');

const fmt = (n) => Number(n).toLocaleString('en-US');

const currency = data.currency ?? 'PKR';
const subtotal = data.items.reduce((sum, item) => sum + Number(item.amount), 0);
const total = data.total ?? subtotal;

// Brand-glyph SVG paths reused verbatim from src/components/SocialRail.astro
// so the footer icons match the live site's own brand marks, not generic
// stand-ins.
const ICONS = {
  website: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.93 9h-3.05a15.5 15.5 0 0 0-1.14-5.1A8.02 8.02 0 0 1 19.93 11ZM12 4.06c.86 1.1 1.84 3.07 2.1 6.94H9.9c.26-3.87 1.24-5.84 2.1-6.94ZM9.9 13h4.2c-.26 3.87-1.24 5.84-2.1 6.94-.86-1.1-1.84-3.07-2.1-6.94ZM8.26 5.9A15.5 15.5 0 0 0 7.12 11H4.07a8.02 8.02 0 0 1 4.19-5.1ZM4.07 13h3.05c.14 1.9.52 3.62 1.14 5.1A8.02 8.02 0 0 1 4.07 13Zm11.67 5.1c.62-1.48 1-3.2 1.14-5.1h3.05a8.02 8.02 0 0 1-4.19 5.1Z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.3 7.3 5.7a.8.8 0 0 0 1 0l7.3-5.7a.5.5 0 0 0-.3-.8H4.5a.5.5 0 0 0-.3.8Z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.4 1.26 4.83L2 22l5.36-1.26a9.9 9.9 0 0 0 4.68 1.19h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.8 14.24c-.24.68-1.4 1.3-1.93 1.37-.5.07-1.1.1-1.77-.11-.4-.13-.92-.3-1.6-.6-2.8-1.2-4.6-4.04-4.74-4.23-.14-.19-1.14-1.5-1.14-2.87s.72-2.03.98-2.3c.26-.28.56-.35.75-.35h.54c.17 0 .4-.03.62.47.24.56.81 1.95.88 2.09.07.14.12.3.02.49-.1.19-.15.3-.3.47-.14.17-.3.37-.43.5-.14.14-.29.3-.12.59.17.28.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.28.14.45.12.62-.07.17-.19.72-.84.91-1.13.19-.28.38-.24.64-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36Z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.92-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.07 4.849-.07M12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.668-.072-4.948C23.73 2.7 21.308.273 16.95.072 15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>`,
};

function icon(name) {
  return `<span class="c-icon">${ICONS[name]}</span>`;
}

const itemsHtml = data.items
  .map(
    (item, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="desc">
        <div class="desc-title">${item.title}</div>
        ${item.subtitle ? `<div class="desc-sub">${item.subtitle}</div>` : ''}
      </td>
      <td class="amt">${fmt(item.amount)}</td>
    </tr>`,
  )
  .join('');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'InvoiceSans';
    src: local('Arial');
  }
  :root {
    --bg: #17161c;
    --card: #22212b;
    --card-border: #32303d;
    --purple: #4b3a9a;
    --purple-light: #7c5cd6;
    --gold: #e99e36;
    --green: #00bf63;
    --text: #f4f2ef;
    --text-muted: #9c98a8;
    --text-faint: #6f6c7a;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'InvoiceSans', Arial, Helvetica, sans-serif;
  }
  .page {
    width: 794px;
    padding: 48px 56px 40px;
    position: relative;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .logo { height: 58px; }
  .title-block { text-align: right; }
  .title-block h1 {
    margin: 0;
    font-size: 42px;
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--text);
  }
  .title-block .sub {
    margin-top: 2px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--gold);
  }
  .accent-bar {
    height: 4px;
    margin: 22px 0 28px;
    background: linear-gradient(90deg, var(--purple-light), var(--gold));
    border-radius: 2px;
  }
  .meta-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .meta-row .label, .label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--gold);
    text-transform: uppercase;
    margin: 0 0 6px;
  }
  .meta-row .value {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 26px;
  }
  .card {
    background: var(--card);
    border-radius: 10px;
    padding: 18px 20px;
    border-left: 3px solid var(--gold);
  }
  .card.from { border-left-color: var(--purple-light); }
  .card .name {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 8px;
    line-height: 1.25;
  }
  .card .line {
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.7;
  }
  .project-block { margin-bottom: 20px; }
  .project-block .value { font-size: 15px; font-weight: 700; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  table.items thead th {
    background: var(--purple);
    color: #fff;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    text-align: left;
    padding: 11px 14px;
  }
  table.items thead th:first-child { border-radius: 8px 0 0 8px; width: 34px; text-align: center; }
  table.items thead th:last-child { border-radius: 0 8px 8px 0; text-align: right; }
  table.items tbody td {
    padding: 14px;
    border-bottom: 1px solid var(--card-border);
    vertical-align: top;
  }
  table.items tbody tr:last-child td { border-bottom: none; }
  td.num {
    color: var(--gold);
    font-weight: 700;
    font-size: 13px;
    text-align: center;
    width: 34px;
  }
  .desc-title { font-size: 13.5px; font-weight: 700; }
  .desc-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
  td.amt {
    text-align: right;
    font-weight: 700;
    font-size: 13.5px;
    white-space: nowrap;
  }

  .totals-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: stretch;
    margin: 20px 0 28px;
  }
  .payment-card {
    background: var(--card);
    border-radius: 10px;
    padding: 16px 20px;
  }
  .payment-card .bold { font-size: 13px; font-weight: 700; margin: 2px 0; }
  .payment-card .note { font-size: 11px; color: var(--text-muted); margin-top: 6px; line-height: 1.6; }
  .totals-right { display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; }
  .subtotal-line {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-muted);
    padding: 0 4px;
  }
  .total-box {
    background: var(--purple-light);
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-box .label {
    color: #fff;
    opacity: 0.9;
    font-size: 11px;
    letter-spacing: 1px;
  }
  .total-box .amount {
    color: #fff;
    font-size: 22px;
    font-weight: 800;
  }

  .thanks h2 { font-size: 16px; margin: 0 0 4px; }
  .thanks p { font-size: 12px; color: var(--text-muted); margin: 0 0 22px; }

  .footer {
    background: var(--card);
    border-radius: 10px;
    padding: 18px 22px;
  }
  .footer-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .footer-logo { height: 34px; }
  .footer-tagline { color: var(--green); font-weight: 700; font-size: 13px; }
  .footer-connect { font-size: 9.5px; color: var(--gold); letter-spacing: 1px; font-weight: 700; margin-top: 2px; }
  .contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 24px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    padding: 4px 0;
  }
  .contact-row .c-icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .contact-row .c-icon svg { width: 100%; height: 100%; }
  .contact-row .c-label { color: var(--text-faint); width: 68px; flex-shrink: 0; }
  .contact-row .c-value { font-weight: 700; color: var(--text); }

  .disclaimer {
    text-align: center;
    font-size: 9.5px;
    color: var(--text-faint);
    margin-top: 16px;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header-row">
      <img class="logo" src="data:image/png;base64,${logoB64}" alt="Shahid Security" />
      <div class="title-block">
        <h1>INVOICE</h1>
        <div class="sub">CYBERSECURITY &middot; SECURE WEB DEVELOPMENT</div>
      </div>
    </div>

    <div class="accent-bar"></div>

    <div class="meta-row">
      <div><p class="label">Invoice No.</p><p class="value">${data.invoiceNo}</p></div>
      <div><p class="label">Date of Issue</p><p class="value">${data.dateOfIssue}</p></div>
      <div><p class="label">Payment Method</p><p class="value">${data.paymentMethod}</p></div>
      <div><p class="label">Discount Reference</p><p class="value">${data.discountReference || '&mdash;'}</p></div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="label">Billed To</p>
        <p class="name">${data.billedTo.name}</p>
        ${data.billedTo.lines.map((l) => `<div class="line">${l}</div>`).join('')}
      </div>
      <div class="card from">
        <p class="label">From</p>
        <p class="name">Shahid Security</p>
        <div class="line">Islamabad, Pakistan</div>
        <div class="line">info@shahidiqbal.com</div>
        <div class="line">shahidiqbal.com</div>
        <div class="line">+92 311 623 4126</div>
      </div>
    </div>

    <div class="project-block">
      <p class="label">Project</p>
      <p class="value">${data.project}</p>
    </div>

    <table class="items">
      <thead>
        <tr><th>#</th><th>Description</th><th>Amount (${currency})</th></tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-row">
      <div class="payment-card">
        <p class="label">Payment</p>
        <p class="bold">Method: ${data.paymentMethod}</p>
        ${data.discountReference ? `<p class="bold" style="font-weight:500;">Discount reference: ${data.discountReference}</p>` : ''}
        <p class="note">Please quote invoice no. ${data.invoiceNo} with payment.</p>
      </div>
      <div class="totals-right">
        <div class="subtotal-line"><span>Subtotal</span><span>${currency} ${fmt(subtotal)}</span></div>
        <div class="total-box">
          <span class="label">TOTAL</span>
          <span class="amount">${currency} ${fmt(total)}</span>
        </div>
      </div>
    </div>

    <div class="thanks">
      <h2>Thank you for choosing Shahid Security.</h2>
      <p>It was a pleasure building your online presence. We are here for any support you need.</p>
    </div>

    <div class="footer">
      <div class="footer-top">
        <img class="footer-logo" src="data:image/png;base64,${logoB64}" alt="Shahid Security" />
        <div>
          <div class="footer-tagline">Protect. Build. Scale.</div>
          <div class="footer-connect">CONNECT WITH US</div>
        </div>
      </div>
      <div class="contact-grid">
        <div class="contact-row">${icon('website')}<span class="c-label">Website</span><span class="c-value">shahidiqbal.com</span></div>
        <div class="contact-row">${icon('instagram')}<span class="c-label">Instagram</span><span class="c-value">@shahidsecurityofficial</span></div>
        <div class="contact-row">${icon('email')}<span class="c-label">Email</span><span class="c-value">info@shahidiqbal.com</span></div>
        <div class="contact-row">${icon('x')}<span class="c-label">X</span><span class="c-value">@shahidsecurity</span></div>
        <div class="contact-row">${icon('whatsapp')}<span class="c-label">WhatsApp</span><span class="c-value">+92 311 623 4126</span></div>
        <div class="contact-row">${icon('linkedin')}<span class="c-label">LinkedIn</span><span class="c-value">/in/shahidlooper</span></div>
        <div class="contact-row">${icon('facebook')}<span class="c-label">Facebook</span><span class="c-value">/shahidsecurityofficial</span></div>
      </div>
    </div>

    <div class="disclaimer">SHAHID SECURITY &middot; Sole proprietorship of Muhammad Shahid Iqbal &middot; Islamabad, Pakistan &middot; This is a computer-generated invoice.</div>
  </div>
</body>
</html>`;

const htmlPath = path.join(dir, '.last-render.html');
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto('file://' + htmlPath, { waitUntil: 'load' });

// The invoice is a single self-contained document, not a multi-page report
// — the page height must always match the actual rendered content exactly
// (which varies with the number of line items), or the footer silently
// spills onto a blank second page instead of fitting on one.
const contentHeight = await page.evaluate(() => document.querySelector('.page').scrollHeight);

await page.pdf({
  path: outPath,
  width: '794px',
  height: `${contentHeight}px`,
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
});
await browser.close();
console.log('Invoice written to', outPath);
