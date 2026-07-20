// Shared helpers for the Finance modules

export const BRGY = {
  barangay: 'NARRA',
  city: 'SAN PEDRO',
  province: 'LAGUNA',
  tel: '887-24-21',
  captain: 'HON. ERNESTO D. DONCILLO',
  treasurer: 'FELIX TAN BALDAD JR.',
  budgetOfficer: 'HON. WILMAR BHOY J. MARQUEZ',
};

export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ageFromDOB(dob) {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d)) return '';
  const diff = Date.now() - d.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

export function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Read cached settings that ThemeContext saves to localStorage
function ls(key, fallback = '') {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function getSettings() {
  return {
    barangayName: ls('bn_name',       `BARANGAY ${BRGY.barangay}`),
    province:     ls('bn_province',    BRGY.province),
    city:         ls('bn_city',        BRGY.city),
    address:      ls('bn_address',     ''),
    logoUrl:      ls('bn_logo',        ''),
    rightLogoUrl: ls('bn_right_logo',  ''),
  };
}

// Open a clean government-style print window
export function printDoc(title, innerHtml) {
  const w = window.open('', '_blank', 'width=870,height=1050');
  w.document.write(`<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: Letter portrait; margin: 0.55in 0.65in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #000; font-size: 12.5px; line-height: 1.5; }

    /* ── Government Header ─────────────────────── */
    .gov-header { margin-bottom: 10px; }
    .gov-header-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .gov-logo-wrap {
      width: 72px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gov-logo-wrap img {
      width: 68px;
      height: 68px;
      object-fit: contain;
    }
    .gov-logo-placeholder {
      width: 68px;
      height: 68px;
    }
    .gov-center {
      flex: 1;
      text-align: center;
      line-height: 1.4;
    }
    .gov-center .rp       { font-size: 11.5px; }
    .gov-center .location { font-size: 11.5px; }
    .gov-center .brgy     { font-size: 17px; font-weight: bold; letter-spacing: 0.5px; margin: 3px 0; }
    .gov-center .office   { font-size: 11px; font-style: italic; color: #333; }
    .gov-center .tel      { font-size: 10.5px; color: #444; }
    .gov-header-divider {
      border: none;
      border-top: 2.5px solid #000;
      margin: 8px 0 12px;
    }

    /* ── Document title ────────────────────────── */
    .doc-title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin: 0 0 14px;
    }

    /* ── Table styles ──────────────────────────── */
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11.5px; vertical-align: top; }
    th { background: #f0f0f0; text-align: center; font-weight: bold; }
    td.right, th.right { text-align: right; }
    td.center, th.center { text-align: center; }

    /* ── Row / label utilities ─────────────────── */
    .row { display: flex; gap: 8px; margin: 5px 0; font-size: 12px; }
    .row .lbl { font-weight: bold; }
    .line { border-bottom: 1px solid #000; display: inline-block; min-width: 180px; }

    /* ── Signature block ───────────────────────── */
    .sig-block {
      margin-top: 44px;
      display: flex;
      justify-content: space-around;
      gap: 30px;
      text-align: center;
    }
    .sig-entry { min-width: 180px; }
    .sig-name {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12px;
      border-top: 1px solid #000;
      padding-top: 4px;
      display: inline-block;
      min-width: 200px;
    }
    .sig-title { font-size: 10.5px; margin-top: 2px; }

    /* ── Misc ──────────────────────────────────── */
    .cert { margin-top: 20px; font-style: italic; font-size: 12px; }
    .meta { font-size: 9.5px; color: #666; margin-top: 16px; }
    .info-row { font-size: 12px; margin: 6px 0; }
    .info-row b { margin-right: 4px; }

    @media print { .no-print { display: none !important; } }
  </style>
  </head><body>
  ${innerHtml}
  <div class="no-print" style="text-align:center;margin-top:32px;padding-bottom:20px;">
    <button onclick="window.print()"
      style="padding:9px 28px;background:#7c6cff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:0.3px;">
      🖨 Print
    </button>
  </div>
  </body></html>`);
  w.document.close();
}

export function govHeader(extraTitle) {
  const s = getSettings();

  const leftLogo = s.logoUrl
    ? `<div class="gov-logo-wrap"><img src="${s.logoUrl}" alt="Barangay Logo" /></div>`
    : `<div class="gov-logo-wrap"><div class="gov-logo-placeholder"></div></div>`;

  const rightLogo = s.rightLogoUrl
    ? `<div class="gov-logo-wrap"><img src="${s.rightLogoUrl}" alt="Seal" /></div>`
    : `<div class="gov-logo-wrap"><div class="gov-logo-placeholder"></div></div>`;

  // Resolve display values — fall back to BRGY constants if settings empty
  const brgyName = s.barangayName || `BARANGAY ${BRGY.barangay}`;
  const province = s.province || BRGY.province;
  const city     = s.city || BRGY.city;

  return `
    <div class="gov-header">
      <div class="gov-header-row">
        ${leftLogo}
        <div class="gov-center">
          <p class="rp">Republic of the Philippines</p>
          <p class="location">Province of ${province}</p>
          <p class="location">City/Municipality of ${city}</p>
          <p class="brgy">${brgyName.toUpperCase()}</p>
          <p class="office">Office of the Punong Barangay</p>
          <p class="tel">Tel. No. ${BRGY.tel}</p>
        </div>
        ${rightLogo}
      </div>
      <hr class="gov-header-divider" />
    </div>
    ${extraTitle ? `<div class="doc-title">${extraTitle}</div>` : ''}
  `;
}
