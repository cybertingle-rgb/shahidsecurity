# Shahid Security Invoice Generator

Reproduces the exact branded invoice layout used for client billing (dark navy page, purple→gold accent bar, purple table header, purple TOTAL box, branded footer with contact icons) — built so a new invoice is a data file, not a redesign.

## Usage

1. Copy `data.example.json` to a new file for the client/project.
2. Fill in the fields (see shape below).
3. Run:
   ```bash
   node generate.mjs path/to/your-data.json path/to/Output_Invoice_Name.pdf
   ```
   (the output path argument is optional — defaults to `Invoice_<invoiceNo>.pdf` in this folder)

## Data file shape

```jsonc
{
  "invoiceNo": "SS-2026-002",
  "dateOfIssue": "26 November 2026",
  "paymentMethod": "Bank Transfer",        // or "JazzCash", "Easypaisa", etc.
  "discountReference": "",                  // leave "" or omit if not applicable
  "currency": "PKR",                        // or "USD", "AED", etc.
  "billedTo": {
    "name": "Client Company Name",
    "lines": ["Attn: Contact Person", "Phone number", "Another line if needed"]
  },
  "project": "Short project description — clientdomain.com",
  "items": [
    { "title": "Line item title", "subtitle": "Optional detail line", "amount": 1234 }
  ],
  "total": null   // optional — omit to auto-sum items; set explicitly to apply a discount
}
```

The page always sizes itself to fit the content on exactly one page, however many line items there are.

## Notes

- The logo is read live from `public/brand/logo-stacked-dark-bg.png` — if that file ever moves, update the path in `generate.mjs`.
- Colors were sampled directly from the reference invoice pixel-by-pixel with ImageMagick, not eyeballed, so they should match closely. If the business's invoice branding changes, the palette lives in the `:root` CSS variables at the top of `generate.mjs`'s template.
- This tool is internal business tooling, not part of the public website build — it lives outside `src/` on purpose and isn't deployed.
