import React, { useState, useEffect } from 'react';
import { residentsAPI, financeAPI, blotterAPI, certificatesAPI } from '../api/apiClient';
import apiClient from '../api/apiClient';
import { useToast } from '../components/Toast';
import { resolveAssetUrl, useTheme } from '../contexts/ThemeContext';
import { withLocationPrefix } from '../utils/certificatePrint';
import { BarChart2, Printer, FileText, Users, DollarSign, AlertTriangle, Settings } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'residents_all',    label: 'Resident Masterlist',    icon: Users,         desc: 'Complete list of all registered residents', color: '#3b82f6', from:'#3b82f6', to:'#2563eb' },
  { id: 'residents_voters', label: 'Registered Voters List', icon: Users,         desc: 'Residents tagged as registered voters',     color: '#6366f1', from:'#6366f1', to:'#4f46e5' },
  { id: 'residents_senior', label: 'Senior Citizens List',   icon: Users,         desc: 'Residents aged 60 and above',               color: '#8b5cf6', from:'#8b5cf6', to:'#7c3aed' },
  { id: 'residents_pwd',    label: 'PWD Masterlist',         icon: Users,         desc: 'Residents tagged as PWD',                   color: '#a855f7', from:'#a855f7', to:'#9333ea' },
  { id: 'residents_4ps',    label: '4Ps Beneficiaries',      icon: Users,         desc: 'Residents tagged as 4Ps beneficiaries',     color: '#ec4899', from:'#ec4899', to:'#db2777' },
  { id: 'finance_income',   label: 'Income Summary',         icon: DollarSign,    desc: 'All income transactions',                   color: '#10b981', from:'#10b981', to:'#059669' },
  { id: 'finance_expense',  label: 'Expense Summary',        icon: DollarSign,    desc: 'All expense transactions',                  color: '#f59e0b', from:'#f59e0b', to:'#d97706' },
  { id: 'finance_all',      label: 'Financial Ledger',       icon: DollarSign,    desc: 'Complete financial record',                 color: '#14b8a6', from:'#14b8a6', to:'#0d9488' },
  { id: 'blotter_all',      label: 'Blotter Logbook',        icon: AlertTriangle, desc: 'All blotter cases',                         color: '#ef4444', from:'#ef4444', to:'#dc2626' },
  { id: 'blotter_pending',  label: 'Pending Cases',          icon: AlertTriangle, desc: 'Blotter cases still pending',               color: '#f97316', from:'#f97316', to:'#ea580c' },
  { id: 'certs_issued',     label: 'Certificates Issued',    icon: FileText,      desc: 'All generated certificates',                color: '#0ea5e9', from:'#0ea5e9', to:'#0284c7' },
  { id: 'certs_by_type',    label: 'Certificates by Type',   icon: FileText,      desc: 'Certificate count grouped by type',         color: '#22c55e', from:'#22c55e', to:'#16a34a' },
];

// â”€â”€ Build the HTML header block used in all print windows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildHeader(settings, reportTitle) {
  const borderColor = '#16a34a';
  const logoL = settings.logo_url       ? resolveAssetUrl(settings.logo_url)       : '';
  const logoR = settings.right_logo_url ? resolveAssetUrl(settings.right_logo_url) : '';
  const brgy  = settings.barangay_name    || 'Barangay';
  const prov  = settings.province         || '';
  const city  = settings.city_municipality || '';

  const leftLogo  = logoL
    ? `<img src="${logoL}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0;">`
    : `<div style="width:64px;flex-shrink:0;"></div>`;
  const rightLogo = logoR
    ? `<img src="${logoR}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0;">`
    : `<div style="width:64px;flex-shrink:0;"></div>`;

  return `
    <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid ${borderColor};padding-bottom:10px;margin-bottom:10px;">
      ${leftLogo}
      <div style="text-align:center;flex:1;">
        <p style="margin:0;font-size:9px;color:#555;" contenteditable="true" spellcheck="false">REPUBLIC OF THE PHILIPPINES</p>
        ${prov ? `<p style="margin:0;font-size:9px;color:#555;" contenteditable="true" spellcheck="false">${withLocationPrefix('PROVINCE OF', prov)}</p>` : ''}
        ${city ? `<p style="margin:0;font-size:9px;color:#555;" contenteditable="true" spellcheck="false">${withLocationPrefix('CITY/MUNICIPALITY OF', city)}</p>` : ''}
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#0f172a;" contenteditable="true" spellcheck="false">${brgy}</p>
        <div style="border-top:1px solid ${borderColor};width:60%;margin:4px auto;"></div>
        <p style="margin:0;font-size:9px;color:#333;" contenteditable="true" spellcheck="false">OFFICE OF THE PUNONG BARANGAY</p>
      </div>
      ${rightLogo}
    </div>
    <div style="text-align:center;padding:8px 0 6px;">
      <p style="margin:0;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1e293b;" contenteditable="true" spellcheck="false">${reportTitle}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#64748b;" contenteditable="true" spellcheck="false">Generated: ${new Date().toLocaleString('en-PH', { dateStyle:'long', timeStyle:'short' })}</p>
    </div>
  `.trim();
}

// â”€â”€ Build the signature block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildSignature(settings) {
  const sigName  = settings.signatory_name  || settings.captain || 'PUNONG BARANGAY';
  const sigTitle = settings.signatory_title || 'Punong Barangay';
  return `
    <div style="margin-top:48px;text-align:right;">
      <div style="display:inline-block;text-align:center;" contenteditable="true" spellcheck="false">
        <p style="margin:0;font-weight:bold;font-size:13px;border-top:1px solid #1e293b;padding-top:4px;min-width:200px;">${sigName.toUpperCase()}</p>
        <p style="margin:2px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#475569;">${sigTitle}</p>
      </div>
    </div>
  `;
}

// â”€â”€ Print a table report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function printTable(settings, title, headers, rows) {
  const w = window.open('', '_blank', 'width=1100,height=750');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    @page { size: auto; margin: 0.4in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; }

    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    thead th {
      background: #1e3a8a; color: #fff;
      padding: 8px 10px; text-align: left;
      font-size: 11px; font-weight: 600;
    }
    thead th[contenteditable="true"] { cursor: text; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: 2px solid #1e293b; }
    .footer-note { margin-top: 12px; font-size: 10px; color: #94a3b8; text-align: center; }

    [contenteditable="true"] { outline: none; cursor: text; }
    [contenteditable="true"]:hover  { background: rgba(59,130,246,0.06); border-radius: 3px; }
    [contenteditable="true"]:focus  { background: rgba(59,130,246,0.10); border-radius: 3px;
                                      box-shadow: 0 0 0 2px rgba(59,130,246,0.30); }

    @media print {
      .no-print { display: none !important; }
      .report-page { padding: 0 !important; }
      [contenteditable]:hover,
      [contenteditable]:focus { background: transparent !important; box-shadow: none !important; }
    }
    @media screen {
      body { background: #d1d5db; padding-bottom: 40px; }
      .report-page {
        max-width: 8.5in; margin: 80px auto 0;
        background: #fff; padding: 40px 48px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      }
    }
  </style></head><body>

  <!-- â”€â”€ Toolbar â”€â”€ -->
  <div class="no-print" style="
    position:fixed;top:0;left:0;right:0;z-index:999;
    background:#1e3a5f;color:#fff;
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 20px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    font-family:Arial,sans-serif;font-size:13px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:18px;">âœï¸</span>
      <div>
        <p style="margin:0;font-weight:bold;color:#fff;">Edit Before Printing</p>
        <p style="margin:0;font-size:11px;color:#93c5fd;">Click any text to edit. Changes are for this print only.</p>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-left:16px;background:rgba(255,255,255,0.08);padding:6px 12px;border-radius:8px;">
        <label style="font-size:12px;color:#bfdbfe;white-space:nowrap;">Font Size:</label>
        <select onchange="document.getElementById('report-body').style.fontSize=this.value+'px'"
          style="padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.20);
                 background:#2d5282;color:#fff;font-size:12px;cursor:pointer;">
          <option value="9">9px</option>
          <option value="10">10px</option>
          <option value="11">11px</option>
          <option value="12" selected>12px</option>
          <option value="13">13px</option>
          <option value="14">14px</option>
          <option value="15">15px</option>
          <option value="16">16px</option>
        </select>
      </div>
    </div>
    <button onclick="window.print()" style="
      padding:10px 28px;background:#16a34a;color:#fff;
      border:none;border-radius:8px;cursor:pointer;
      font-size:14px;font-weight:bold;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">
      ðŸ–¨&nbsp; Print / Save as PDF
    </button>
  </div>

  <!-- â”€â”€ Report Content â”€â”€ -->
  <div class="report-page" id="report-body">
    ${buildHeader(settings, title)}
    <table>
      <thead><tr>${headers.map(h => `<th contenteditable="true" spellcheck="false">${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(r => `<tr>${r.map(c => `<td contenteditable="true" spellcheck="false">${c ?? 'â€”'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    <p class="footer-note" contenteditable="true" spellcheck="false">Total records: ${rows.length}</p>
    ${buildSignature(settings)}
  </div>

  </body></html>`);
  w.document.close();
}

export default function Reports() {
  const { toast }       = useToast();
  const { darkMode: D } = useTheme();
  const [selected,  setSelected]  = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [generating, setGenerating] = useState(false);
  const [settings,  setSettings]  = useState({});

  // Fetch barangay settings once for use in headers
  useEffect(() => {
    apiClient.get('/settings').then(r => setSettings(r.data || {})).catch(() => {});
  }, []);

  async function generateReport() {
    if (!selected) { toast('Please select a report type', 'warning'); return; }
    setGenerating(true);
    try {
      if (selected === 'residents_all') {
        const res = await residentsAPI.getAll(1, 10000, {});
        const rows = (res.data.residents || []).map(r => [
          r.full_name, r.gender, r.age, r.purok||'â€”', r.address,
          r.civil_status, r.contact_number||'â€”', r.occupation||'â€”',
          r.voter_status?'Yes':'No', r.senior_citizen?'Yes':'No', r.is_pwd?'Yes':'No', r.is_4ps?'Yes':'No'
        ]);
        printTable(settings, 'Resident Masterlist',
          ['Full Name','Gender','Age','Purok','Address','Civil Status','Contact','Occupation','Voter','Senior','PWD','4Ps'], rows);

      } else if (selected === 'residents_voters') {
        const res = await residentsAPI.getAll(1, 10000, { voter_status: 'true' });
        const rows = (res.data.residents || []).map(r => [r.full_name, r.gender, r.age, r.purok||'â€”', r.address, r.contact_number||'â€”']);
        printTable(settings, 'Registered Voters List', ['Full Name','Gender','Age','Purok','Address','Contact'], rows);

      } else if (selected === 'residents_senior') {
        const res = await residentsAPI.getAll(1, 10000, { senior_citizen: 'true' });
        const rows = (res.data.residents || []).map(r => [r.full_name, r.gender, r.age, r.purok||'â€”', r.address, r.contact_number||'â€”']);
        printTable(settings, 'Senior Citizens List', ['Full Name','Gender','Age','Purok','Address','Contact'], rows);

      } else if (selected === 'residents_pwd') {
        const res = await residentsAPI.getAll(1, 10000, { is_pwd: 'true' });
        const rows = (res.data.residents || []).map(r => [r.full_name, r.gender, r.age, r.purok||'â€”', r.address, r.contact_number||'â€”']);
        printTable(settings, 'PWD Masterlist', ['Full Name','Gender','Age','Purok','Address','Contact'], rows);

      } else if (selected === 'residents_4ps') {
        const res = await residentsAPI.getAll(1, 10000, { is_4ps: 'true' });
        const rows = (res.data.residents || []).map(r => [r.full_name, r.gender, r.age, r.purok||'â€”', r.address, r.contact_number||'â€”']);
        printTable(settings, '4Ps Beneficiaries List', ['Full Name','Gender','Age','Purok','Address','Contact'], rows);

      } else if (selected === 'finance_income') {
        const params = { transaction_type: 'income' };
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo)   params.endDate   = dateTo;
        const res = await financeAPI.getAll(params);
        const list = res.data.finances || [];
        const total = list.reduce((s,f) => s + Number(f.amount||0), 0);
        const rows = list.map(f => [
          new Date(f.transaction_date).toLocaleDateString('en-PH'), f.description,
          f.category||'â€”', f.payment_method||'â€”', f.receipt_number||'â€”',
          `â‚±${Number(f.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}`
        ]);
        rows.push(['','','','','TOTAL', `â‚±${total.toLocaleString('en-PH',{minimumFractionDigits:2})}`]);
        printTable(settings, 'Income Summary', ['Date','Description','Category','Payment Method','O.R. #','Amount'], rows);

      } else if (selected === 'finance_expense') {
        const params = { transaction_type: 'expense' };
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo)   params.endDate   = dateTo;
        const res = await financeAPI.getAll(params);
        const list = res.data.finances || [];
        const total = list.reduce((s,f) => s + Number(f.amount||0), 0);
        const rows = list.map(f => [
          new Date(f.transaction_date).toLocaleDateString('en-PH'), f.description,
          f.category||'â€”', f.payment_method||'â€”',
          `â‚±${Number(f.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}`
        ]);
        rows.push(['','','','TOTAL', `â‚±${total.toLocaleString('en-PH',{minimumFractionDigits:2})}`]);
        printTable(settings, 'Expense Summary', ['Date','Description','Category','Payment Method','Amount'], rows);

      } else if (selected === 'finance_all') {
        const params = {};
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo)   params.endDate   = dateTo;
        const res = await financeAPI.getAll(params);
        const list = res.data.finances || [];
        const income  = list.filter(f=>f.transaction_type==='income').reduce((s,f)=>s+Number(f.amount||0),0);
        const expense = list.filter(f=>f.transaction_type==='expense').reduce((s,f)=>s+Number(f.amount||0),0);
        const rows = list.map(f => [
          new Date(f.transaction_date).toLocaleDateString('en-PH'),
          f.transaction_type.toUpperCase(),
          f.description, f.category||'â€”', f.payment_method||'â€”', f.receipt_number||'â€”',
          `${f.transaction_type==='expense'?'âˆ’':''}â‚±${Number(f.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}`
        ]);
        rows.push(['','INCOME','','','','Total', `â‚±${income.toLocaleString('en-PH',{minimumFractionDigits:2})}`]);
        rows.push(['','EXPENSE','','','','Total', `â‚±${expense.toLocaleString('en-PH',{minimumFractionDigits:2})}`]);
        rows.push(['','NET BALANCE','','','','', `â‚±${(income-expense).toLocaleString('en-PH',{minimumFractionDigits:2})}`]);
        printTable(settings, 'Financial Ledger', ['Date','Type','Description','Category','Payment','O.R. #','Amount'], rows);

      } else if (selected === 'blotter_all') {
        const res = await blotterAPI.getAll({});
        const rows = (res.data.records || []).map(r => [
          r.case_number, r.incident_type,
          r.complainant_name||r.complainant_name_manual||'â€”',
          r.respondent_name||r.respondent_name_manual||'â€”',
          r.incident_date ? new Date(r.incident_date).toLocaleDateString('en-PH') : 'â€”',
          r.incident_location||'â€”', r.status, r.kagawad_assigned||'â€”'
        ]);
        printTable(settings, 'Blotter Logbook',
          ['Case #','Type','Complainant','Respondent','Date','Location','Status','Kagawad'], rows);

      } else if (selected === 'blotter_pending') {
        const res = await blotterAPI.getAll({ status: 'pending' });
        const rows = (res.data.records || []).map(r => [
          r.case_number, r.incident_type,
          r.complainant_name||r.complainant_name_manual||'â€”',
          r.respondent_name||r.respondent_name_manual||'â€”',
          r.incident_date ? new Date(r.incident_date).toLocaleDateString('en-PH') : 'â€”',
          r.kagawad_assigned||'â€”'
        ]);
        printTable(settings, 'Pending Blotter Cases',
          ['Case #','Type','Complainant','Respondent','Date','Kagawad'], rows);

      } else if (selected === 'certs_issued') {
        const res = await certificatesAPI.getAll({});
        const rows = (res.data.certificates || []).map(c => [
          c.resident_name,
          c.certificate_type.replace(/_/g,' '),
          c.purpose||'â€”', c.or_number||'â€”',
          c.fee > 0 ? `â‚±${Number(c.fee).toLocaleString('en-PH')}` : 'Free',
          c.status, new Date(c.created_at).toLocaleDateString('en-PH')
        ]);
        printTable(settings, 'Certificates Issued',
          ['Resident','Type','Purpose','O.R. #','Fee','Status','Date Issued'], rows);

      } else if (selected === 'certs_by_type') {
        const res = await certificatesAPI.getAll({});
        const grouped = (res.data.certificates || []).reduce((a, c) => {
          const t = c.certificate_type.replace(/_/g,' ');
          a[t] = (a[t] || 0) + 1;
          return a;
        }, {});
        const rows = Object.entries(grouped).sort((a,b) => b[1]-a[1]).map(([t,n]) => [t, n]);
        printTable(settings, 'Certificates by Type', ['Certificate Type','Count'], rows);
      }

      toast('Report generated â€” check the new window', 'success');
    } catch (err) {
      toast('Failed to generate report: ' + (err.message || 'Unknown error'), 'error');
    } finally { setGenerating(false); }
  }

  const selectedReport = REPORT_TYPES.find(r => r.id === selected);
  const needsDate = selected?.startsWith('finance');

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 size={22} className="text-indigo-600"/> Reports Generator
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {REPORT_TYPES.length} report types Â· Header uses barangay settings
          </p>
        </div>
        {/* Settings shortcut */}
        {settings.barangay_name ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-[#2e334a] rounded-xl px-3 py-2 shadow-sm">
            <Settings size={13} className="text-indigo-500"/>
            <span>Header: <strong>{settings.barangay_name}</strong> Â· Signed by: <strong>{settings.signatory_name || settings.captain || 'â€”'}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            <Settings size={13}/>
            <span>Configure barangay info in Settings for proper report headers</span>
          </div>
        )}
      </div>

      {/* Report type grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(r => {
          const Icon = r.icon;
          const isSelected = selected === r.id;
          return (
            <button key={r.id}
              onClick={() => setSelected(prev => prev === r.id ? '' : r.id)}
              className="text-left rounded-2xl p-4 transition-all duration-200 relative overflow-hidden group"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg,${r.from}22 0%,${r.to}12 100%)`
                  : D ? 'rgba(18,21,31,0.92)' : 'rgba(255,255,255,0.92)',
                border: isSelected
                  ? `1.5px solid ${r.color}45`
                  : D ? '1.5px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(226,232,240,0.70)',
                boxShadow: isSelected
                  ? `0 4px 20px ${r.color}22, 0 1px 3px rgba(0,0,0,0.08)`
                  : D ? '0 2px 12px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
                backdropFilter:'blur(12px)',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.border=`1.5px solid ${r.color}40`;
                  e.currentTarget.style.boxShadow=`0 6px 24px ${r.color}18, 0 2px 8px rgba(0,0,0,0.10)`;
                  e.currentTarget.style.transform='translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.border= D ? '1.5px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(226,232,240,0.70)';
                  e.currentTarget.style.boxShadow= D ? '0 2px 12px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform='';
                }
              }}>

              {/* Glow blob behind icon */}
              <div className="absolute top-0 left-0 w-24 h-24 rounded-full pointer-events-none"
                style={{ background:`radial-gradient(circle,${r.color}12 0%,transparent 70%)`, transform:'translate(-30%,-30%)', opacity: isSelected ? 1 : 0.6 }}/>

              {/* Icon */}
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 relative"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg,${r.from},${r.to})`
                    : `${r.color}15`,
                  boxShadow: isSelected ? `0 4px 14px ${r.color}40` : 'none',
                }}>
                <Icon size={18} style={{ color: isSelected ? '#fff' : r.color }}/>
              </div>

              <p className="font-bold text-sm mb-1 relative"
                style={{ color: isSelected ? r.color : D ? '#c4ccdf' : '#1e293b' }}>
                {r.label}
              </p>
              <p className="text-xs relative" style={{ color: D ? 'rgba(140,150,180,0.65)' : 'rgba(100,116,139,0.75)' }}>
                {r.desc}
              </p>

              {/* Selected check indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg,${r.from},${r.to})`, boxShadow:`0 2px 8px ${r.color}40` }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Generate panel */}
      {selected && (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#2e334a] shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            {(() => { const Icon = selectedReport?.icon || FileText; return <Icon size={16} className="text-indigo-500"/>; })()}
            <h3 className="font-semibold text-gray-800 dark:text-slate-100">
              Generate: {selectedReport?.label}
            </h3>
          </div>

          {needsDate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date From <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Date To <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={generateReport} disabled={generating}
              className="btn-primary flex items-center gap-2 min-w-[180px] justify-center">
              {generating
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Generatingâ€¦</>
                : <><Printer size={15}/> Generate &amp; Print</>
              }
            </button>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Opens in a new window Â· Print or Save as PDF
            </p>
          </div>

          {/* Mini header preview */}
          <div className="rounded-xl border border-gray-100 dark:border-[#2e334a] overflow-hidden bg-gray-50 dark:bg-[#22263a]">
            <div className="px-3 py-1.5 bg-white dark:bg-[#1a1d27] border-b border-gray-100 dark:border-[#2e334a]">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Report header preview</p>
            </div>
            <div className="p-3 text-xs text-gray-700 dark:text-slate-300 space-y-0.5 font-mono">
              <p className="text-center text-gray-400">Republic of the Philippines</p>
              <p className="text-center font-bold">{settings.barangay_name || '[ Barangay Name â€” set in Settings ]'}</p>
              <p className="text-center text-gray-400">{settings.address || '[ Address ]'}</p>
              <p className="text-center text-indigo-600 font-bold mt-1 uppercase tracking-widest">{selectedReport?.label}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
