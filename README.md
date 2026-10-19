# JERVISH Business Suite — Free Edition v2

A free, local-first invoice / quotation / business-management app with a reference-inspired A4 invoice design and **real server-side PDF generation**.

## What changed in v2
- **View** on an invoice/quotation opens the actual generated PDF in a new browser tab.
- **Download PDF** saves the PDF file directly as `INV-....pdf` / `QUO-....pdf`.
- PDF generation uses Node.js + Express + Puppeteer, based on the server-side PDF approach from the reference code supplied for this project.
- Every invoice PDF has **Sales Invoice** at the top by default.
- Every quotation PDF has **Quotation** at the top by default.
- A4 portrait layout, purple header, lavender party/bank panels, GST columns, totals, terms and electronic-document footer.
- Inter-state output keeps the reference-style **IGST + Tax** columns; intra-state output uses **CGST + SGST**.
- Actual reference party/business values are not hard-coded.

## Run on Windows
1. Install Node.js LTS.
2. Extract this ZIP to a folder.
3. Open Command Prompt / PowerShell in that folder.
4. Run:

```bash
npm install
npm start
```

5. Open `http://localhost:3000` in Chrome.

Puppeteer will install its Chromium browser during `npm install`. The first PDF generation can take a little longer while the browser starts.

## Important
This version uses browser localStorage for business data. The Node server is used for PDF generation only; it does not automatically create a cloud database or upload your business data anywhere.

If you open `index.html` directly with `file://`, the real PDF endpoint cannot run. **Run `npm install` + `npm start` and use `http://localhost:3000` for the PDF View/Download buttons.**

## Invoice data
- Business settings: name, GSTIN, PAN, phone, email, state, address, logo, bank details and terms.
- Party master: party name, state, phone, email, GSTIN, PAN and address.
- Item master: item, HSN/SAC, price and GST rate.
- Same-state GST => CGST + SGST.
- Different-state GST => IGST.
- JSON backup / restore remains available.
