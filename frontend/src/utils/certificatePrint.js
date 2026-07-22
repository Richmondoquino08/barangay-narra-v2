import { resolveAssetUrl } from '../contexts/ThemeContext';

// fill() injects real HTML (<strong> tags) into the body, so every
// interpolated value must be escaped first to avoid breaking the markup or
// letting typed text (e.g. Purpose, Requested By) inject arbitrary HTML.
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Renders the "Nth day of Month Year" issue-date phrase with the day and the
// month/year bolded — matches the barangay's standard printed certificate style.
export function boldOrdinalDate(text) {
  if (!text) return '';
  const m = /^(\d+(?:st|nd|rd|th))\s+day of\s+(.+)$/i.exec(text);
  if (!m) return escapeHtml(text);
  return `<strong>${escapeHtml(m[1])}</strong> day of <strong>${escapeHtml(m[2])}</strong>`;
}

// Builds header lines like "PROVINCE OF LAGUNA" without doubling the prefix
// if one was already typed into the Settings field (e.g. "Province of Laguna"
// or "City of San Pedro" entered instead of just the bare name) — strips any
// known location prefix first, then adds the one actually requested, so it
// works even when the baked-in prefix doesn't match this call's own prefix
// (e.g. stored as "City of ..." but this header wants "City/Municipality of ...").
const LOCATION_PREFIXES = ['PROVINCE OF', 'CITY/MUNICIPALITY OF', 'CITY OF', 'MUNICIPALITY OF'];
export function withLocationPrefix(prefix, value) {
  let v = (value || '').trim().toUpperCase();
  if (!v) return '';
  for (const p of LOCATION_PREFIXES) {
    if (v.startsWith(p)) { v = v.slice(p.length).trim(); break; }
  }
  return v ? `${prefix} ${v}` : '';
}

// Empty boxes for the resident to physically sign and thumbprint after
// printing (used by "with Thumbmark" certificate types). Sized in em, not
// pt/px, so it scales correctly whether rendered at full size in the actual
// print output or shrunk down inside the live editor's scaled preview.
export const SIGNATURE_THUMBPRINT_HTML =
  '<div style="display:flex;gap:2.5em;justify-content:center;margin:0.8em 0;">' +
    '<div style="text-align:center;">' +
      '<div style="width:7em;height:4em;border:0.12em solid #111;margin:0 auto;"></div>' +
      '<p style="margin:0.2em 0 0;font-size:0.75em;font-weight:bold;letter-spacing:0.5px;">SIGNATURE</p>' +
    '</div>' +
    '<div style="text-align:center;">' +
      '<div style="width:7em;height:4em;border:0.12em solid #111;margin:0 auto;"></div>' +
      '<p style="margin:0.2em 0 0;font-size:0.75em;font-weight:bold;letter-spacing:0.5px;">RIGHT THUMBPRINT</p>' +
    '</div>' +
  '</div>';

// ── Print window renderer (matches Philippine certificate format exactly) ──
export function openPrintPreview(config, data, certId) {
  const w = window.open('', '_blank', 'width=960,height=800');
  const borderColor = config.style?.border_color || '#16a34a';
  const showBorder  = config.style?.show_border !== false;

  const logoL = config.header.logo_url ? resolveAssetUrl(config.header.logo_url) : '';
  const logoR = config.header.right_logo_url ? resolveAssetUrl(config.header.right_logo_url) : '';
  const headerImg = config.header.custom_header_image ? resolveAssetUrl(config.header.custom_header_image) : '';

  const watermarkSrc = logoL || logoR;
  const watermarkOpacity = (config.style?.watermark_opacity ?? 15) / 100;
  const watermarkHtml = config.style?.show_watermark && watermarkSrc
    ? `<div class="cert-watermark"><img src="${watermarkSrc}" style="width:55%;object-fit:contain;opacity:${watermarkOpacity};"></div>`
    : '';

  function fill(text) {
    let out = (text || '')
      .replace(/\{\{resident_name\}\}/g, `<strong>${escapeHtml(data.resident_name || '')}</strong>`)
      .replace(/\{\{age\}\}/g,           escapeHtml(data.age || ''))
      .replace(/\{\{address\}\}/g,       escapeHtml(data.address || ''))
      .replace(/\{\{purok\}\}/g,          escapeHtml(data.purok || ''))
      .replace(/\{\{civil_status\}\}/g,  escapeHtml(data.civil_status || ''))
      .replace(/\{\{barangay_name\}\}/g, escapeHtml(config.header.barangay_name || data.barangay_name || ''))
      .replace(/\{\{city\}\}/g,          escapeHtml(config.header.city || data.city || ''))
      .replace(/\{\{province\}\}/g,      escapeHtml(config.header.province || data.province || ''))
      .replace(/\{\{purpose\}\}/g,       escapeHtml(data.purpose || ''))
      .replace(/\{\{date\}\}/g,          boldOrdinalDate(data.date || ''))
      .replace(/\{\{or_number\}\}/g,     data.or_number ? `O.R. No.: ${escapeHtml(data.or_number)}` : '')
      .replace(/\{\{fee\}\}/g,           data.fee ? `₱${Number(data.fee).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '')
      .replace(/\{\{signature_thumbprint\}\}/g, SIGNATURE_THUMBPRINT_HTML);
    // Template-specific custom fields (requested_by, case_number, cause_of_death, etc.)
    // filled in at generation time — auto-fill any remaining {{tag}} found in data.
    out = out.replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, tag) =>
      Object.prototype.hasOwnProperty.call(data, tag) && data[tag] ? escapeHtml(data[tag]) : match
    );
    return out;
  }

  // Structural blocks (e.g. the signature/thumbprint boxes) are block-level
  // HTML and must not be wrapped in a <p> — the HTML parser would otherwise
  // force-close the <p> early, so the box would render outside the intended
  // flow position instead of exactly where it was placed in the body text.
  const bodyHtml = fill(config.body).split('\n').map(l => {
    const trimmed = l.trim();
    if (trimmed === '') return '<br>';
    if (trimmed.startsWith('<div')) return trimmed;
    return `<p style="margin:6px 0;line-height:1.8;">${l.replace(/^\t/, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}</p>`;
  }).join('');

  const addlSigs = (config.footer.additional || []).map(s =>
    `<div style="text-align:center;min-width:160px;">
       <div style="border-top:1px solid #111;padding-top:4px;">
         <p style="margin:0;font-weight:bold;font-size:11pt;text-decoration:underline;">${s.name}</p>
         <p style="margin:0;font-size:9pt;">${s.title}</p>
       </div>
     </div>`
  ).join('');

  const signatoryName = config.footer.signatory_name
    ? `HON. ${config.footer.signatory_name.toUpperCase()}`
    : 'HON. PUNONG BARANGAY';

  const secondSig = config.footer.secretary_name
    ? `<br><p style="margin:0;font-weight:bold;font-size:11pt;text-decoration:underline;">${config.footer.secretary_name.toUpperCase()}</p>
       <p style="margin:2pt 0 0;font-size:9pt;">${config.footer.secretary_title || 'Barangay Secretary / By Authority'}</p>`
    : '';

  const headerBlock = headerImg
    ? `<img src="${headerImg}" style="width:100%;display:block;max-height:120pt;object-fit:cover;">`
    : `<div style="display:flex;align-items:center;gap:8pt;border-bottom:2pt solid ${borderColor};padding-bottom:10pt;margin-bottom:10pt;">
        ${logoL ? `<img src="${logoL}" style="width:76pt;height:76pt;object-fit:contain;flex-shrink:0;">` : ''}
        <div style="flex:1;text-align:center;">
          ${config.header.show_republic !== false ? '<p style="margin:0;font-size:10.5pt;color:#555;">REPUBLIC OF THE PHILIPPINES</p>' : ''}
          ${config.header.province ? `<p style="margin:0;font-size:10.5pt;color:#555;">${withLocationPrefix('PROVINCE OF', config.header.province)}</p>` : ''}
          ${config.header.city ? `<p style="margin:0;font-size:10.5pt;color:#555;">${withLocationPrefix('CITY OF', config.header.city)}</p>` : ''}
          <p style="margin:4pt 0 0;font-size:16pt;font-weight:bold;">${config.header.barangay_name || 'BARANGAY'}</p>
          ${config.header.office_label !== false ? `<div style="border-top:1pt solid ${borderColor};width:60%;margin:4pt auto;"></div><p style="margin:0;font-size:10.5pt;">OFFICE OF THE PUNONG BARANGAY</p>` : ''}
        </div>
        ${logoR ? `<img src="${logoR}" style="width:76pt;height:76pt;object-fit:contain;flex-shrink:0;">` : (logoL ? '<div style="width:76pt;flex-shrink:0;"></div>' : '')}
      </div>`;

  const fmt = n => n ? `₱${Number(n).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '';
  // Uses the QR PNG the server already generated at issuance (served as a
  // static file) instead of drawing one client-side — a client-side library
  // loaded from an external CDN can silently fail to load inside a blank
  // window.open() popup, which is why the QR previously disappeared.
  const qrUrl = data.qr_image_url ? resolveAssetUrl(data.qr_image_url) : '';
  const paymentBlock = config.footer.show_payment_info !== false
    ? `<div style="padding-top:4pt;border-top:0.5pt solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;break-inside:avoid;page-break-inside:avoid;">
         <div style="font-size:9pt;line-height:1.45;color:#333;">
           <p style="margin:0;"><em>Paid Under:</em>&nbsp;&nbsp;${data.paid_under || ''}</p>
           <p style="margin:0;"><em>O.R. No.:</em>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${data.or_number || ''}</p>
           <p style="margin:0;"><em>Amount:</em>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${data.fee ? fmt(data.fee) : ''}</p>
           <p style="margin:0;"><em>CTC No.:</em>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${data.ctc_no || ''}</p>
           <p style="margin:0;"><em>Date:</em>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${data.payment_date || ''}</p>
         </div>
         ${certId ? `
         <div style="text-align:center;break-inside:avoid;page-break-inside:avoid;">
           ${qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="width:52pt;height:52pt;display:inline-block;object-fit:contain;">` : ''}
           <p style="font-size:8pt;color:#555;margin:2pt 0 0;letter-spacing:0.4px;">Certificate ID: ${certId}</p>
         </div>` : ''}
         <div style="text-align:right;font-size:9pt;font-style:italic;color:#555;align-self:flex-end;">
           <p style="margin:0;">Not valid without dry seal</p>
         </div>
       </div>`
    : '';

  // Build border CSS classes (applied via <style> not inline so flex works)
  const outerBorderStyle = showBorder ? `border:3pt solid ${borderColor};padding:5pt;box-sizing:border-box;` : '';
  const innerBorderStyle = showBorder ? `border:1pt solid ${borderColor};padding:12pt;box-sizing:border-box;` : 'padding:12pt;box-sizing:border-box;';

  w.document.write(`<!DOCTYPE html><html><head><title>${config.title}</title>
  <style>
    /* ── Page setup — auto fits any paper size ──────────────────────────── */
    /* Margin trimmed from the original 0.4in — every side reclaimed here is
       extra room for the footer (payment info/QR/validity) to fit without
       needing a 2nd page on Letter/Short, the shortest common paper size. */
    @page { size: auto; margin: 0.3in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #111; }

    /* Natural document flow — content takes only the height it needs.
       (Previously used flex-grow to pin the payment/validity block to the
       bottom of the page, but browsers don't fragment flex layouts reliably
       across a print page boundary — short certificates would overflow onto
       an almost-empty 2nd sheet. Letting it flow naturally fixes that.) */
    .cert-page  { display: flex; flex-direction: column; ${outerBorderStyle} }
    .cert-inner { display: flex; flex-direction: column; position: relative; ${innerBorderStyle} }
    .cert-body  { display: flex; flex-direction: column; position: relative; z-index: 1; }
    /* Watermark sits behind all content, centered within cert-inner */
    .cert-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 0; pointer-events: none; }
    p { margin: 6px 0; line-height: 1.8; }

    /* ── Editable content styling ───────────────────────────────────────── */
    [contenteditable="true"] { outline: none; }
    [contenteditable="true"]:hover { background: rgba(59,130,246,0.05); border-radius: 3px; }
    [contenteditable="true"]:focus { background: rgba(59,130,246,0.08); border-radius: 3px;
                                     box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }

    /* ── Print: fill full page so border reaches edges, on any paper size ── */
    /* size:auto on @page lets the OS/print-dialog paper selection (Letter,   */
    /* Legal/Long, A4, etc.) govern dimensions — nothing here is hardcoded to */
    /* one size. 100% (not 100vh, which is unreliable across browsers when   */
    /* printing) keeps the certificate filling whatever page size is chosen. */
    @media print {
      .no-print { display: none !important; }
      .cert-page {
        width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      [contenteditable="true"]:hover,
      [contenteditable="true"]:focus { background: transparent !important; box-shadow: none !important; }
    }

    /* ── Screen: page preview ────────────────────────────────────────────── */
    @media screen {
      body { background: #d1d5db; padding-bottom: 40px; }
      .cert-page {
        /* 8.27in = A4 width — the narrowest of Letter/Legal/A4. Text wraps
           onto more lines at this width than at Letter's 8.5in, so measuring
           against it (see the shrink-to-fit script below) gives the worst
           case height across all paper sizes, not just whichever is 8.5in
           wide. No fixed min-height here either, so short certificates
           aren't measured as taller than they really are. */
        width: 8.27in;
        margin: 80px auto 0;
        background: #fff;
        box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      }
    }
  </style></head><body>

  <!-- ── Toolbar (screen only) ────────────────────────────────────────── -->
  <div class="no-print" style="
    position:fixed; top:0; left:0; right:0; z-index:999;
    background:#1e3a5f; color:#fff;
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 20px; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.3);
    font-family:Arial,sans-serif; font-size:13px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">✏️</span>
      <div>
        <p style="margin:0;font-weight:bold;color:#fff;">Edit Before Printing</p>
        <p style="margin:0;font-size:11px;color:#93c5fd;">Click on any text in the certificate to edit it. Changes are only for this print — not saved.</p>
      </div>
    </div>
    <button onclick="window.print()" style="
      padding:10px 28px;
      background:#16a34a; color:#fff;
      border:none; border-radius:8px;
      cursor:pointer; font-size:14px; font-weight:bold;
      white-space:nowrap; flex-shrink:0;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);">
      🖨&nbsp; Print / Save as PDF
    </button>
  </div>

  <!-- ── Certificate ──────────────────────────────────────────────────── -->
  <div class="cert-page">
    <div class="cert-inner">
      ${watermarkHtml}

      <div class="cert-body">

        <!-- Header (non-editable — logos/images) -->
        <div>${headerBlock}</div>

        <!-- Title — editable -->
        <div style="text-align:center;margin:12pt 0 8pt;"
             contenteditable="true" spellcheck="false">
          <p style="margin:0;font-weight:bold;font-size:14pt;text-decoration:underline;letter-spacing:2px;">${config.title}</p>
        </div>

        <!-- Body — fully editable -->
        <div style="margin:8pt 0 14pt;"
             contenteditable="true" spellcheck="false">
          ${data.profile_image_url ? `<div style="float:right;margin:0 0 10pt 16pt;text-align:center;border:1pt solid #ccc;padding:4pt;background:#fafafa;">
            <img src="${data.profile_image_url}" style="width:1.4in;height:1.4in;object-fit:cover;display:block;">
            <p style="margin:3pt 0 0;font-size:8pt;letter-spacing:1px;color:#555;">2x2 PHOTO</p>
          </div>` : ''}
          ${bodyHtml}
          <div style="clear:both;"></div>
        </div>

        <!-- Additional signatories — editable -->
        ${addlSigs ? `<div style="display:flex;gap:48pt;justify-content:flex-start;margin-top:16pt;" contenteditable="true" spellcheck="false">${addlSigs}</div>` : ''}

        <!-- Primary signatory — editable -->
        <div style="text-align:right;margin-top:16pt;break-inside:avoid;page-break-inside:avoid;"
             contenteditable="true" spellcheck="false">
          <div style="display:inline-block;text-align:center;">
            <p style="margin:0;font-weight:bold;font-size:11pt;text-decoration:underline;">${signatoryName}</p>
            <p style="margin:2pt 0 0;font-size:9pt;">${config.footer.signatory_title || 'PUNONG BARANGAY'}</p>
            ${secondSig}
          </div>
        </div>

      </div><!-- /cert-body -->

      <!-- Payment block — follows body content directly -->
      <div style="position:relative;z-index:1;break-inside:avoid;page-break-inside:avoid;" contenteditable="true" spellcheck="false">
        ${paymentBlock}
      </div>

      <!-- Validity — at the very bottom -->
      ${config.footer.validity_text ? `
      <div style="position:relative;z-index:1;text-align:center;border-top:1pt solid ${borderColor};margin-top:6pt;padding-top:4pt;break-inside:avoid;page-break-inside:avoid;" contenteditable="true" spellcheck="false">
        <p style="margin:0;font-size:9pt;font-style:italic;color:#555;">(${config.footer.validity_text})</p>
      </div>` : ''}

    </div>
  </div>

  <script>
    // Safety net: guarantees the certificate fits on ONE page even on the
    // shortest common paper size (Short/Letter, 8.5x11in) regardless of how
    // long a given certificate type's body text runs. Content that already
    // fits is left untouched — this only shrinks it down when it doesn't.
    function fitToOnePage() {
      var page = document.querySelector('.cert-page');
      if (!page) return;
      // Slightly under the true ~10.4in usable height (11in page minus 0.3in
      // top+bottom @page margin) as a safety margin for measurement rounding.
      var USABLE_HEIGHT_PX = 96 * 10.2;
      var actual = page.scrollHeight;
      if (actual > USABLE_HEIGHT_PX) {
        var scale = USABLE_HEIGHT_PX / actual;
        // zoom (not transform:scale) — transform is paint-only and doesn't
        // change the layout size the print engine paginates against, so a
        // scaled-down block would still get pushed onto page 2 in full even
        // though it visually looked smaller. zoom actually shrinks the box.
        page.style.zoom = scale.toFixed(4);
      }
    }
    // scrollHeight is only accurate once every image (QR code, seals, 2x2
    // photo) has actually loaded — measuring too early under-counts their
    // height and lets content slip past the page boundary anyway.
    window.addEventListener('load', function() {
      var pending = Array.prototype.filter.call(document.images, function(img) { return !img.complete; });
      if (pending.length === 0) {
        requestAnimationFrame(function() { requestAnimationFrame(fitToOnePage); });
        return;
      }
      var remaining = pending.length;
      function onOneDone() {
        remaining--;
        if (remaining <= 0) requestAnimationFrame(function() { requestAnimationFrame(fitToOnePage); });
      }
      pending.forEach(function(img) {
        img.addEventListener('load', onOneDone);
        img.addEventListener('error', onOneDone);
      });
    });
  <\/script>

  </body></html>`);
  w.document.close();
}
