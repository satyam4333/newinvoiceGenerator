const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));

function esc(v='') {
  return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function invoicePdfHTML(doc, settings, kind='invoice') {
  const s = settings || {};
  const c = doc.client || {};
  const same = !!doc.intraState;
  const title = kind === 'quotation' ? 'Quotation' : 'Sales Invoice';
  const lines = Array.isArray(doc.lines) ? doc.lines : [];
  const rows = lines.map((l, i) => {
    const unit = l.unit || 'pcs';
    const tax = Number(l.tax || 0);
    const cg = same ? tax / 2 : 0;
    const sg = same ? tax / 2 : 0;
    const ig = same ? 0 : tax;
    return `<tr>
      <td>${i + 1}.</td>
      <td><span class="itemname">${esc(l.name)}</span><span class="unitline">${esc(unit)}</span></td>
      <td>${esc(l.hsn || '')}</td>
      <td>${Number(l.gst || 0)}%</td>
      <td>${Number(l.qty || 0).toLocaleString('en-IN')} ${esc(unit)}</td>
      <td>${money(l.rate)}</td>
      <td>${money(l.base)}</td>
      ${same ? `<td>${money(cg)}</td><td>${money(sg)}</td>` : `<td>${money(ig)}</td><td>${money(ig)}</td>`}
      <td>${money(l.total)}</td>
    </tr>`;
  }).join('');

  const taxHeaders = same ? '<th>CGST</th><th>SGST</th>' : '<th>IGST</th><th>Tax</th>';
  const taxTotal = same
    ? `<div><span>CGST</span><span>${money(doc.cgst)}</span></div><div><span>SGST</span><span>${money(doc.sgst)}</span></div>`
    : `<div><span>IGST</span><span>${money(doc.igst)}</span></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.no || title)}</title>
<style>
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#333;font-family:Arial,Helvetica,sans-serif}
.invoice{width:210mm;min-height:297mm;padding:10mm 10mm 7mm;font-size:11px;line-height:1.28;position:relative;box-sizing:border-box;background:#fff}
.invoice h2{margin:0}.invoiceLogo{position:absolute;top:9mm;right:10mm;width:42mm;max-height:29mm;object-fit:contain;object-position:right top}.invhead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;min-height:32mm}.invhead>div:first-child{width:58%}.invhead .invmeta{width:42%;text-align:right}.invhead .invmeta h2{font-size:24px;line-height:1.1;color:#6a3bc2;font-weight:500;margin:0 0 11px}.invhead .invmeta div{margin:4px 0}.invlabel{font-size:12px;font-weight:500;color:#6a3bc2;margin-bottom:5px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:0 0 5mm}.partybox{background:#eee9f8;border-radius:6px;padding:5mm 4mm;min-height:41mm;color:#333}.partybox b{font-size:11.5px;display:block;margin-bottom:2px}.partybox div{margin:1px 0}.partybox .invlabel{font-size:16px;color:#6a3bc2;margin-bottom:4px;font-weight:500}
.invtable{width:100%;border-collapse:collapse;table-layout:fixed;margin:0;font-size:10.2px}.invtable th{background:#6a38c2;color:#fff;border:0;padding:3.2mm 1.3mm;text-align:center;font-weight:600;vertical-align:middle}.invtable td{border:1px solid #ddd;padding:2.7mm 1.4mm;vertical-align:top}.invtable th:nth-child(1){width:5%}.invtable th:nth-child(2){width:22%}.invtable th:nth-child(3){width:12%}.invtable th:nth-child(4){width:8%}.invtable th:nth-child(5){width:10%}.invtable th:nth-child(6){width:10%}.invtable th:nth-child(7){width:12%}.invtable th:nth-child(8){width:11%}.invtable th:nth-child(9){width:11%}.invtable td:first-child{text-align:center}.invtable td:nth-child(3),.invtable td:nth-child(4),.invtable td:nth-child(5),.invtable td:nth-child(n+7){text-align:right}.invtable tbody tr:nth-child(even){background:#eee9f8}.unitline{display:block;margin-top:5px;color:#444}.itemname{display:block;white-space:normal;word-break:break-word}
.bankterms{display:grid;grid-template-columns:57% 43%;gap:0;margin-top:5mm;align-items:start}.bankbox{background:#eee9f8;border-radius:6px;padding:4mm 4mm;min-height:40mm;font-size:10.5px}.bankbox>b{display:block;color:#6a3bc2;font-size:16px;font-weight:500;margin-bottom:3px}.bankbox div{display:grid;grid-template-columns:32% 68%;margin:2px 0}.totals{margin-left:auto;width:90%;margin-top:0;font-size:11px}.totals div{display:flex;justify-content:space-between;padding:2.3mm 0}.grand{font-weight:700;border-top:1.5px solid #555;border-bottom:1.5px solid #555;margin-top:2mm;padding:3mm 0!important;font-size:16px}.termsbox{padding:6mm 0 0;font-size:10.5px}.termsbox>b{display:block;color:#6a3bc2;font-size:16px;font-weight:500;margin-bottom:2mm}.termsbox p{margin:0;white-space:pre-line}.contactline{margin-top:10mm;text-align:center;font-size:10.5px}.docfooter{position:absolute;bottom:3mm;left:0;right:0;text-align:center;font-size:7px;color:#555}
</style></head><body><div class="invoice">
${s.logo ? `<img src="${esc(s.logo)}" class="invoiceLogo">` : ''}
<div class="invhead"><div><h2></h2></div><div class="invmeta"><h2>${title}</h2><div><b>${kind === 'quotation' ? 'Quotation No #' : 'Invoice No #'}</b> &nbsp; ${esc(doc.no)}</div><div><b>${kind === 'quotation' ? 'Quotation Date' : 'Invoice Date'}</b> &nbsp; ${esc(doc.date)}</div>${doc.dueDate ? `<div><b>Due Date</b> &nbsp; ${esc(doc.dueDate)}</div>` : ''}</div></div>
<div class="parties"><div class="partybox"><div class="invlabel">Billed By</div><b>${esc(s.name)}</b><div>${esc(s.address)}</div>${s.state ? `<div>${esc(s.state)}</div>` : ''}${s.gstin ? `<div>GSTIN: ${esc(s.gstin)}</div>` : ''}${s.pan ? `<div>PAN: ${esc(s.pan)}</div>` : ''}</div><div class="partybox"><div class="invlabel">Billed To</div><b>${esc(c.name || doc.clientName)}</b><div>${esc(c.address || '')}</div>${c.state ? `<div>${esc(c.state)}</div>` : ''}${c.gstin ? `<div>GSTIN: ${esc(c.gstin)}</div>` : ''}${c.pan ? `<div>PAN: ${esc(c.pan)}</div>` : ''}</div></div>
<table class="invtable"><thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th>GST<br>Rate</th><th>Quantity</th><th>Rate</th><th>Amount</th>${taxHeaders}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="bankterms"><div class="bankbox"><b>Bank Details</b><div><span>Account Name</span><span>${esc(s.accname || s.name)}</span></div><div><span>Account Number</span><span>${esc(s.accno || '')}</span></div><div><span>IFSC</span><span>${esc(s.ifsc || '')}</span></div><div><span>Account Type</span><span>${esc(s.acctype || '')}</span></div><div><span>Bank</span><span>${esc(s.bank || '')}</span></div></div><div><div class="totals"><div><span>Amount</span><span>${money(doc.subtotal)}</span></div>${taxTotal}<div><span>Round Up</span><span>${money(Math.round(Number(doc.total || 0)) - Number(doc.total || 0))}</span></div><div class="grand"><span>Total (INR)</span><span>${money(Math.round(Number(doc.total || 0)))}</span></div></div></div></div>
<div class="termsbox"><b>Terms and Conditions</b><p>${esc(s.terms || doc.notes || '')}</p></div>
<div class="contactline">For any enquiry, reach out via email at <b>${esc(s.email || '')}</b>${s.phone ? `, call on <b>${esc(s.phone)}</b>` : ''}</div>
<div class="docfooter">This is an electronically generated document, no signature is required.</div>
</div></body></html>`;
}

let browserPromise;
async function getBrowser() {
  if (!browserPromise) browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  return browserPromise;
}

app.post('/api/pdf', async (req, res) => {
  try {
    const { document: doc, settings, kind = 'invoice' } = req.body || {};
    if (!doc || !doc.no) return res.status(400).json({ error: 'Invalid document data' });
    const html = invoicePdfHTML(doc, settings, kind);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await page.close();
    const safeName = String(doc.no).replace(/[^a-zA-Z0-9._-]/g, '_');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safeName}.pdf"`, 'Content-Length': pdf.length, 'Cache-Control': 'no-store' });
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const server = app.listen(PORT, () => console.log(`JERVISH Business Suite running at http://localhost:${PORT}`));
process.on('SIGINT', async () => { try { const b = await browserPromise; if (b) await b.close(); } catch {} server.close(() => process.exit(0)); });
process.on('SIGTERM', async () => { try { const b = await browserPromise; if (b) await b.close(); } catch {} server.close(() => process.exit(0)); });
