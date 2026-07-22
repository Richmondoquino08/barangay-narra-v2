import React, { useState, useEffect, useCallback, useRef } from 'react';
import { certificatesAPI, residentsAPI, blotterAPI } from '../api/apiClient';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import { FileText, Plus, Upload, CheckCircle, XCircle, Trash2, Printer, AlertTriangle, Pencil, Layout, Eye, Search, X } from 'lucide-react';
import ResidentSearch from '../components/ResidentSearch';
import CertificateTemplateBuilder from './CertificateTemplateBuilder';
import { openPrintPreview } from '../utils/certificatePrint';

const CERT_TYPES = [
  { value: 'barangay_clearance',  label: 'Barangay Clearance',                              fee: 0 },
  { value: 'residency',           label: 'Certificate of Residency',                         fee: 0   },
  { value: 'indigency',           label: 'Certificate of Indigency',                         fee: 0   },
  { value: 'business_permit',     label: 'Business Permit/Clearance',                        fee: 0 },
  { value: 'good_moral',          label: 'Good Moral Character',                             fee: 0  },
  { value: 'ftjs',                label: 'First Time Job Seeker (FTJS)',                     fee: 0   },
  { value: 'no_income',           label: 'Certificate of No Income',                         fee: 0  },
  { value: 'senior_citizen_cert', label: 'Senior Citizen Certificate',                       fee: 0   },
  { value: 'pwd_cert',            label: 'PWD Certificate',                                  fee: 0   },
  { value: 'cohabitation',        label: 'Certificate of Cohabitation',                      fee: 0 },
  { value: 'guardianship',        label: 'Certificate of Guardianship',                      fee: 0 },
  { value: 'travel_permit',       label: 'Travel Permit',                                    fee: 0  },
  // ── New templates ─────────────────────────────────────────────────────────
  { value: 'cert_ftj',             label: 'Certification — First Time Jobseeker (RA 11261)', fee: 0   },
  { value: 'affidavit_of_loss',    label: 'Affidavit of Loss',                               fee: 0  },
  { value: 'bail_bond',            label: 'Certification for Bail Bond',                     fee: 0 },
  { value: 'clearance_thumbmark',  label: 'Barangay Clearance (with Thumbmark)',              fee: 0 },
  { value: 'residency_thumbmark',  label: 'Certificate of Residency (with Thumbmark)',        fee: 0  },
  { value: 'cert_death',           label: 'Certificate of Death',                            fee: 0   },
  { value: 'solo_parent',          label: 'Certificate of Solo Parent',                      fee: 0  },
  { value: 'cert_appearance',      label: 'Certification of Appearance',                     fee: 0  },
  { value: 'business_closure',     label: 'Certification — Closure of Business',             fee: 0 },
  { value: 'cert_loan',            label: 'Certification for Loan',                          fee: 0  },
  { value: 'no_fixed_income',      label: 'Certification of No Fixed Income',                fee: 0   },
  { value: 'cohabitation_dswd',    label: 'Certification of Cohabitation (DSWD)',            fee: 0 },
  { value: 'tanod_death_claim',    label: 'Certification — Death Claim of Tanod',            fee: 0   },
  { value: 'delayed_registration', label: 'Certification of Delayed Registration',           fee: 0  },
  { value: 'cert_employment',      label: 'Certification of Employment',                     fee: 0  },
  { value: 'permit_to_transfer',   label: 'Permit to Transfer',                              fee: 0  },
  { value: 'endorsement_letter',   label: 'Endorsement Letter',                              fee: 0   },
];

const FEE_MAP = Object.fromEntries(CERT_TYPES.map(t => [t.value, t.fee]));
const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// Custom fields shown in the Generate Modal and Print Modal per certificate type.
// Tags must match {{placeholder}} names used in the body templates.
// Common relationship terms shown in the dropdown before falling back to a
// free-text "Other" option.
const RELATIONSHIP_OPTIONS = [
  'Mother', 'Father', 'Spouse', 'Guardian', 'Sibling', 'Grandmother', 'Grandfather',
  'Son', 'Daughter', 'Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'Employer', 'Friend', 'Neighbor',
];

const CERT_CUSTOM_FIELDS = {
  cert_ftj: [
    { tag: 'requested_by', label: 'Requested By (Name of Requester)', inputType: 'resident_or_text' },
  ],
  affidavit_of_loss: [
    { tag: 'requested_by', label: 'Requested By', inputType: 'resident_or_text' },
    { tag: 'relationship', label: 'Relationship to Resident', inputType: 'relationship' },
    { tag: 'school_name',  label: 'School / Office Name' },
    { tag: 'item_lost',    label: 'Item / Document Lost', multiline: true },
  ],
  bail_bond: [
    { tag: 'case_number', label: 'Case Number' },
    { tag: 'court_name',  label: 'Court Name' },
  ],
  clearance_thumbmark: [
    { tag: 'years_residing_since', label: 'Residing Since (Year)', inputType: 'year' },
  ],
  residency_thumbmark: [
    { tag: 'years_residing_since', label: 'Residing Since (Year)', inputType: 'year' },
  ],
  residency: [
    { tag: 'years_residing_since', label: 'Residing Since (Year)', inputType: 'year' },
  ],
  cert_death: [
    { tag: 'cause_of_death', label: 'Cause of Death' },
    { tag: 'date_of_death',  label: 'Date of Death', inputType: 'date' },
    { tag: 'time_of_death',  label: 'Time of Death', inputType: 'time' },
    { tag: 'requested_by',   label: 'Requested By', inputType: 'resident_or_text' },
  ],
  cert_appearance: [
    { tag: 'organization_name',   label: 'Organization / Office' },
    { tag: 'appearance_date',     label: 'Date of Appearance', inputType: 'date' },
    { tag: 'transaction_purpose', label: 'Transaction / Purpose' },
  ],
  business_closure: [
    { tag: 'owner_name',       label: 'Business Owner Name', inputType: 'resident_or_text' },
    { tag: 'business_name',    label: 'Business / Trade Name' },
    { tag: 'business_address', label: 'Business Address' },
    { tag: 'closure_date',     label: 'Date of Closure', inputType: 'date' },
  ],
  cert_loan: [
    { tag: 'loan_type', label: 'Loan Type' },
    { tag: 'reason',    label: 'Reason / Purpose of Loan' },
  ],
  cohabitation_dswd: [
    { tag: 'partner_1_name',     label: 'Partner 1 Full Name', inputType: 'resident_or_text' },
    { tag: 'partner_2_name',     label: 'Partner 2 Full Name', inputType: 'resident_or_text' },
    { tag: 'cohabitation_since', label: 'Cohabiting Since (Year)', inputType: 'year' },
  ],
  tanod_death_claim: [
    { tag: 'date_of_death', label: 'Date of Death', inputType: 'date' },
    { tag: 'requested_by',  label: 'Requested By', inputType: 'resident_or_text' },
    { tag: 'relationship',  label: 'Relationship to Deceased', inputType: 'relationship' },
  ],
  delayed_registration: [
    { tag: 'birth_date',      label: 'Date of Birth', inputType: 'date' },
    { tag: 'birth_place',     label: 'Place of Birth' },
    { tag: 'requested_by',    label: 'Requested By', inputType: 'resident_or_text' },
    { tag: 'relationship',    label: 'Relationship to Registered', inputType: 'relationship' },
    { tag: 'current_address', label: 'Current Address', multiline: true },
  ],
  cert_employment: [
    { tag: 'position',   label: 'Position / Role' },
    { tag: 'start_date', label: 'Start Date', inputType: 'date' },
    { tag: 'end_date',   label: 'End Date (or "Present")', inputType: 'date-or-present' },
  ],
  permit_to_transfer: [
    { tag: 'member_since',         label: 'Member Since (Year)', inputType: 'year' },
    { tag: 'destination_barangay', label: 'Destination Barangay' },
  ],
  endorsement_letter: [
    { tag: 'recipient_institution', label: 'Recipient Institution' },
    { tag: 'recipient_address',     label: 'Recipient Address' },
    { tag: 'endorsement_reason',    label: 'Reason for Endorsement', multiline: true },
  ],
};

function ordinalDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = d.getDate();
  const month = d.toLocaleDateString('en-PH', { month: 'long' });
  const year = d.getFullYear();
  const suffix = [11, 12, 13].includes(day % 100) ? 'th'
    : day % 10 === 1 ? 'st'
    : day % 10 === 2 ? 'nd'
    : day % 10 === 3 ? 'rd'
    : 'th';
  return `${day}${suffix} day of ${month} ${year}`;
}

// Converts a native date/month/time picker's raw value into the readable
// text that actually gets printed on the certificate (pickers only accept
// ISO-formatted values, e.g. "2026-07-21", which would look wrong verbatim).
function formatCustomFieldValue(inputType, rawValue) {
  if (!rawValue) return '';
  if (inputType === 'date') {
    return new Date(`${rawValue}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (inputType === 'year') {
    return rawValue.split('-')[0] || ''; // "2015-03" -> "2015"
  }
  if (inputType === 'time') {
    const [h, m] = rawValue.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return rawValue;
}

// Dropdown of common relationship terms with a free-text "Other" fallback
// for anything not in the list.
function RelationshipField({ value, onChange }) {
  const isKnown = !value || RELATIONSHIP_OPTIONS.includes(value);
  const [customMode, setCustomMode] = useState(!isKnown);

  return (
    <div className="space-y-2">
      <select className="input" value={customMode ? 'Other' : value}
        onChange={e => {
          if (e.target.value === 'Other') { setCustomMode(true); onChange(''); }
          else { setCustomMode(false); onChange(e.target.value); }
        }} required={!customMode}>
        <option value="" disabled>Select relationship…</option>
        {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        <option value="Other">Other (specify)</option>
      </select>
      {customMode && (
        <input className="input" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="Type relationship…" required autoFocus />
      )}
    </div>
  );
}

// Free-text name field with a live typeahead of Barangay Narra residents —
// pick a suggestion to auto-fill their name, or just keep typing if the
// requester isn't in the resident database.
function RequestedByField({ value, residents, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const q = (value || '').toLowerCase().trim();
  const matches = q ? residents.filter(r => r.full_name?.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <div ref={ref} className="relative">
      <input className="input" value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type a name or search Barangay Narra residents…"
        required />
      {open && q && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#2e334a] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-400 dark:text-slate-500">No matching resident — will be saved as typed.</p>
          ) : matches.map(r => (
            <button type="button" key={r.id} onMouseDown={() => { onChange(r.full_name); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-[#22263a] transition text-sm">
              <span className="font-medium text-gray-900 dark:text-slate-100">{r.full_name}</span>
              {r.address && <span className="block text-xs text-gray-400 dark:text-slate-500 truncate">{r.address}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Certificates() {
  const { hasRole } = useAuth();
  const { toast }   = useToast();
  const canApprove  = hasRole(['admin', 'captain']);

  const [activeTab,    setActiveTab]    = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [templates,    setTemplates]    = useState([]);
  const [residents,    setResidents]    = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [genModal,     setGenModal]     = useState(false);
  const [tplModal,     setTplModal]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  // Print details modal — opened before printing so staff can fill in payment info
  const [printModal,   setPrintModal]   = useState(null); // null | { cert, orNumber, amount, paidUnder, ctcNo, paymentDate }

  const defaultGen = { resident_id: '', certificate_type: 'barangay_clearance', template_id: '', purpose: '', or_number: '', fee: 100, or_date: '', custom_fields: {}, custom_fields_raw: {}, custom_fields_present: {} };
  const [genForm, setGenForm] = useState(defaultGen);
  const [tplForm, setTplForm] = useState({ template_name: '', certificate_type: 'barangay_clearance' });
  const [tplFile, setTplFile] = useState(null);
  const [blotterAlert, setBlotterAlert] = useState(false);
  const [builderOpen, setBuilderOpen]   = useState(false);
  const [editingTpl,  setEditingTpl]    = useState(null);
  const [sysSettings, setSysSettings]  = useState({});
  const [viewCert,    setViewCert]      = useState(null); // view-only modal for rejected certs

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.certificate_type = filterType;
      const [certs, tpls, res, st] = await Promise.all([
        certificatesAPI.getAll(params),
        certificatesAPI.getTemplates(),
        residentsAPI.getAll(1, 5000),
        certificatesAPI.getStats(),
      ]);
      setCertificates(certs.data.certificates || []);
      setTemplates(tpls.data.templates || []);
      setResidents(res.data.residents || []);
      setStats(st.data.stats || {});
    } catch { toast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiClient.get('/settings').then(r => setSysSettings(r.data || {})).catch(() => {});
  }, []);

  async function checkBlotter(residentId) {
    if (!residentId || genForm.certificate_type !== 'barangay_clearance') {
      setBlotterAlert(false); return;
    }
    try {
      const res = await blotterAPI.getAll({});
      const active = (res.data.records || []).filter(r =>
        (r.complainant_id == residentId || r.respondent_id == residentId) &&
        !['settled','closed'].includes(r.status)
      );
      setBlotterAlert(active.length > 0);
    } catch { setBlotterAlert(false); }
  }

  // Most-recently-created custom template dedicated to this certificate type,
  // or '' if none exists yet (falls back to the default barangay format).
  function pickTemplateFor(type) {
    const match = templates.find(t => t.certificate_type === type);
    return match ? match.id : '';
  }

  function setGen(k, v) {
    setGenForm(p => {
      const next = { ...p, [k]: v };
      if (k === 'certificate_type') {
        next.fee = FEE_MAP[v] ?? 0;
        // custom fields are type-specific — reset on type change
        next.custom_fields = {};
        next.custom_fields_raw = {};
        next.custom_fields_present = {};
        next.template_id = pickTemplateFor(v); // auto-use the template dedicated to this type
      }
      return next;
    });
    if (k === 'resident_id') checkBlotter(v);
    if (k === 'certificate_type') setBlotterAlert(false);
  }

  function setCustomField(tag, value) {
    setGenForm(p => ({ ...p, custom_fields: { ...p.custom_fields, [tag]: value } }));
  }

  // Date/month/time pickers store their native ISO value separately (so the
  // picker itself displays correctly) while custom_fields holds the
  // human-readable text that actually gets printed on the certificate.
  function setCustomDateField(tag, inputType, rawValue) {
    setGenForm(p => ({
      ...p,
      custom_fields_raw: { ...p.custom_fields_raw, [tag]: rawValue },
      custom_fields: { ...p.custom_fields, [tag]: formatCustomFieldValue(inputType, rawValue) },
    }));
  }

  function setPresentFlag(tag, present) {
    setGenForm(p => ({
      ...p,
      custom_fields_present: { ...p.custom_fields_present, [tag]: present },
      custom_fields: { ...p.custom_fields, [tag]: present ? 'Present' : formatCustomFieldValue('date', p.custom_fields_raw[tag]) },
    }));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!genForm.resident_id) { toast('Please select a resident', 'warning'); return; }
    const neededFields = CERT_CUSTOM_FIELDS[genForm.certificate_type] || [];
    const missing = neededFields.filter(f => !(genForm.custom_fields[f.tag] || '').trim());
    if (missing.length > 0) {
      toast(`Please fill in: ${missing.map(f => f.label).join(', ')}`, 'warning');
      return;
    }
    setSaving(true);
    try {
      await certificatesAPI.generate(genForm);
      toast('Certificate generated!', 'success');
      setGenModal(false);
      setGenForm(defaultGen);
      setBlotterAlert(false);
      load();
    } catch (err) { toast(err.response?.data?.message || 'Failed to generate', 'error'); }
    finally { setSaving(false); }
  }

  async function handleUploadTemplate(e) {
    e.preventDefault();
    if (!tplFile) { toast('Please select a file', 'warning'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('template', tplFile);
      fd.append('template_name', tplForm.template_name);
      fd.append('certificate_type', tplForm.certificate_type);
      await certificatesAPI.uploadTemplate(fd);
      toast('Template uploaded!', 'success');
      setTplModal(false); setTplFile(null);
      setTplForm({ template_name: '', certificate_type: 'barangay_clearance' });
      load();
    } catch (err) { toast(err.response?.data?.message || 'Upload failed', 'error'); }
    finally { setSaving(false); }
  }

  function buildPrintData(c, paymentOverride = {}) {
    const residentRecord = residents.find(r => r.id == c.resident_id);
    const customFields = typeof c.custom_fields === 'string'
      ? (JSON.parse(c.custom_fields || '{}') || {})
      : (c.custom_fields || {});
    return {
      ...customFields, // template-specific fields (requested_by, case_number, etc.) filled at generation time
      resident_name:     c.resident_name || '',
      age:               residentRecord?.age           || '',
      address:           residentRecord?.address      || '',
      purok:             residentRecord?.purok        || '',
      civil_status:      residentRecord?.civil_status || '',
      profile_image_url: residentRecord?.profile_image_url || '',
      barangay_name: sysSettings.barangay_name    || '',
      city:          sysSettings.city_municipality || '',
      province:      sysSettings.province          || '',
      purpose:       c.purpose   || '',
      or_number:     paymentOverride.orNumber    || c.or_number || '',
      fee:           paymentOverride.amount      != null ? paymentOverride.amount : (c.fee || 0),
      paid_under:    paymentOverride.paidUnder   || '',
      ctc_no:        paymentOverride.ctcNo       || '',
      payment_date:  paymentOverride.paymentDate || '',
      date: ordinalDate(c.issue_date),
      // Server pre-generates this PNG at issuance — used instead of a client-side
      // QR library so printing never depends on an external CDN being reachable.
      qr_image_url: c.qr_code_data ? `/uploads/certificates/qr-${c.qr_code_data}.png` : '',
    };
  }

  function buildDefaultConfig(c) {
    return {
      header: {
        show_republic:       true,
        logo_url:            sysSettings.logo_url        || '',
        right_logo_url:      sysSettings.right_logo_url  || '',
        barangay_name:       sysSettings.barangay_name   || '',
        province:            sysSettings.province         || '',
        city:                sysSettings.city_municipality || '',
        office_label:        true,
        custom_header_image: '',
        logo_size:  76,
        logo_gap:   48,
        text_size:  10.5,
        name_size:  16,
      },
      style: { show_border: true, border_color: '#16a34a', title_size: 14 },
      title: (CERT_TYPES.find(t => t.value === c.certificate_type)?.label || c.certificate_type).toUpperCase(),
      body: `\tThis is to certify that {{resident_name}} is a bonafide resident of {{barangay_name}}, {{city}}, {{province}}.\n\n\tThis certification is issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.\n\nIssued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,
      footer: {
        signatory_name:  sysSettings.signatory_name  || sysSettings.captain || '',
        signatory_title: sysSettings.signatory_title || 'Punong Barangay',
        secretary_name:  sysSettings.secretary_name  || '',
        secretary_title: sysSettings.secretary_title || 'Barangay Secretary / By Authority',
        additional:      [],
        show_payment_info: true,
        validity_text:   sysSettings.cert_validity || 'Valid for three (3) months only',
      },
    };
  }

  // Step 1: open the payment-details modal
  function handlePrint(c) {
    setPrintModal({
      cert:        c,
      orNumber:    c.or_number || '',
      amount:      c.fee       != null ? String(c.fee) : '',
      paidUnder:   '',
      ctcNo:       '',
      paymentDate: new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }),
    });
  }

  // Merge current sysSettings into template header/footer so the barangay seal
  // (incl. watermark) and signatory/secretary always appear even if the
  // template was created before these were configured, or never had a logo
  // uploaded into the template itself.
  function applySettingsFallbacks(cfg) {
    return {
      ...cfg,
      header: {
        ...cfg.header,
        logo_url:       cfg.header?.logo_url       || sysSettings.logo_url       || '',
        right_logo_url: cfg.header?.right_logo_url || sysSettings.right_logo_url || '',
      },
      footer: {
        ...cfg.footer,
        signatory_name:  cfg.footer?.signatory_name  || sysSettings.signatory_name  || sysSettings.captain || '',
        signatory_title: cfg.footer?.signatory_title || sysSettings.signatory_title || 'Punong Barangay',
        secretary_name:  cfg.footer?.secretary_name  || sysSettings.secretary_name  || '',
        secretary_title: cfg.footer?.secretary_title || sysSettings.secretary_title || 'Barangay Secretary / By Authority',
        validity_text:   cfg.footer?.validity_text   !== undefined ? cfg.footer.validity_text : (sysSettings.cert_validity || 'Valid for three (3) months only'),
      },
    };
  }

  // Step 2: actually print with the entered payment details
  function doPrint() {
    const { cert: c, orNumber, amount, paidUnder, ctcNo, paymentDate } = printModal;
    // Use loose == to handle string/number type mismatch from API
    const usedTemplate = c.template_id
      ? templates.find(t => t.id == c.template_id)  // eslint-disable-line eqeqeq
      : null;

    if (usedTemplate) {
      if (usedTemplate.is_custom && usedTemplate.template_config) {
        // Visual custom template — parse config if stored as JSON string
        const cfg = typeof usedTemplate.template_config === 'string'
          ? JSON.parse(usedTemplate.template_config)
          : usedTemplate.template_config;
        openPrintPreview(applySettingsFallbacks(cfg), buildPrintData(c, printModal), c.id);
        setPrintModal(null); return;
      }
      // Uploaded (DOCX/PDF) template — use the default barangay format
      openPrintPreview(applySettingsFallbacks(buildDefaultConfig(c)), buildPrintData(c, printModal), c.id);
      setPrintModal(null); return;
    }

    // No template selected — use barangay settings default format
    openPrintPreview(applySettingsFallbacks(buildDefaultConfig(c)), buildPrintData(c, printModal), c.id);
    setPrintModal(null);

    // ── OLD inline print (unreachable, preserved for reference) ──
    const w = window.open('', '_blank', 'width=800,height=600');
    const certLabel = CERT_TYPES.find(t => t.value === c.certificate_type)?.label || c.certificate_type;
    w.document.write(`
      <html><head><title>${certLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
        h2 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 4px; }
        .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 30px; }
        .cert-title { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 8px; margin: 20px 0; }
        .body { font-size: 14px; line-height: 1.8; margin: 20px 0; }
        .sig { margin-top: 60px; text-align: right; }
        .sig-name { font-weight: bold; font-size: 15px; border-top: 1px solid #000; display: inline-block; min-width: 200px; text-align: center; padding-top: 4px; }
        .meta { font-size: 11px; color: #888; margin-top: 20px; }
        @media print { button { display: none !important; } }
      </style></head>
      <body>
        <h2>Republic of the Philippines</h2>
        <h2>Province of Palawan</h2>
        <h2>BARANGAY NARRA</h2>
        <p class="subtitle">Office of the Punong Barangay</p>
        <div class="cert-title">${certLabel}</div>
        <div class="body">
          <p>TO WHOM IT MAY CONCERN:</p>
          <p style="margin-top:16px">This is to certify that <strong>${c.resident_name}</strong> is a bonafide resident of this barangay and this certificate is issued for the purpose of <strong>${c.purpose || '—'}</strong>.</p>
          <p style="margin-top:16px">Issued this <strong>${new Date(c.issue_date || c.created_at).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</strong>.</p>
          ${c.or_number ? `<p style="margin-top:8px">O.R. No.: <strong>${c.or_number}</strong>${c.fee > 0 ? ` &nbsp;|&nbsp; Amount: <strong>${fmt(c.fee)}</strong>` : ''}</p>` : ''}
        </div>
        <div class="sig">
          <p class="sig-name">PUNONG BARANGAY</p>
        </div>
        <div class="meta">Cert ID: ${c.id} &nbsp;|&nbsp; Issued: ${new Date(c.created_at).toLocaleDateString('en-PH')}</div>
        <br><button onclick="window.print()" style="padding:8px 20px;background:#4F46E5;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print</button>
      </body></html>
    `);
    w.document.close();
  }

  const action = async (fn, msg) => {
    try { await fn(); toast(msg, 'success'); load(); }
    catch (err) { toast(err.response?.data?.message || 'Action failed', 'error'); }
  };

  const statusCounts = certificates.reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});

  const visibleCerts = searchQuery.trim()
    ? certificates.filter(c => {
        const q = searchQuery.toLowerCase();
        const typLabel = CERT_TYPES.find(t => t.value === c.certificate_type)?.label || c.certificate_type;
        return (c.resident_name || '').toLowerCase().includes(q)
          || typLabel.toLowerCase().includes(q)
          || (c.or_number || '').toLowerCase().includes(q)
          || (c.purpose || '').toLowerCase().includes(q);
      })
    : certificates;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={22} className="text-indigo-600" /> Certificates
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {searchQuery ? `${visibleCerts.length} of ${certificates.length}` : certificates.length} total · {CERT_TYPES.length} types supported
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingTpl(null); setBuilderOpen(true); }} className="btn-secondary flex items-center gap-1.5"><Layout size={14}/> Create Template</button>
          <button onClick={() => setTplModal(true)} className="btn-secondary flex items-center gap-1.5"><Upload size={14}/> Upload Template</button>
          <button onClick={() => { setGenForm({ ...defaultGen, template_id: pickTemplateFor(defaultGen.certificate_type) }); setGenModal(true); }} className="btn-primary flex items-center gap-1.5"><Plus size={14}/> Generate Certificate</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4">
        <StatCard title="Total Generated" value={Number(stats.total)||0} icon={FileText} color="indigo" />
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-[#2e334a]">
          {['certificates','templates'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'certificates' && (
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or type…"
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                  <X size={12} />
                </button>
              )}
            </div>
            {/* Type filter */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="ml-auto text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-1.5 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Types</option>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : activeTab === 'certificates' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Resident','Type','Purpose','OR #','Fee','Date','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                {visibleCerts.length === 0 ? (
                  <tr><td colSpan={7} className="py-14 text-center text-gray-400 dark:text-slate-500">
                    <FileText size={32} className="mx-auto mb-2 opacity-30"/>
                    <p>{searchQuery ? `No results for "${searchQuery}"` : 'No certificates found'}</p>
                  </td></tr>
                ) : visibleCerts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                    <td className="table-td"><p className="font-medium text-gray-900 dark:text-slate-100">{c.resident_name}</p></td>
                    <td className="table-td text-gray-600 dark:text-slate-300 text-xs">
                      {CERT_TYPES.find(t => t.value === c.certificate_type)?.label || c.certificate_type}
                    </td>
                    <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{c.purpose || '—'}</td>
                    <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{c.or_number || '—'}</td>
                    <td className="table-td text-gray-600 dark:text-slate-300 text-xs">{Number(c.fee) > 0 ? fmt(c.fee) : <span className="text-emerald-600 text-xs font-semibold">Free</span>}</td>
                    <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => handlePrint(c)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                        <button onClick={() => action(() => certificatesAPI.delete(c.id), 'Deleted')} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                {['Template Name','Type','Kind','Date','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                {templates.length === 0 ? (
                  <tr><td colSpan={5} className="py-14 text-center text-gray-400 dark:text-slate-500">
                    <Upload size={32} className="mx-auto mb-2 opacity-30"/><p>No templates yet — create a custom one or upload a DOCX/PDF</p>
                  </td></tr>
                ) : templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a] transition-colors">
                    <td className="table-td font-medium text-gray-900 dark:text-slate-100">{t.template_name}</td>
                    <td className="table-td text-xs"><Badge status="default" label={CERT_TYPES.find(x => x.value === t.certificate_type)?.label || t.certificate_type}/></td>
                    <td className="table-td">
                      {t.is_custom
                        ? <Badge status="active" label="Visual"/>
                        : <Badge status="default" label="File"/>}
                    </td>
                    <td className="table-td text-gray-400 dark:text-slate-500">{new Date(t.created_at).toLocaleDateString('en-PH')}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        {t.is_custom && (
                          <>
                            <button onClick={() => { setEditingTpl(t); setBuilderOpen(true); }} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                            <button onClick={() => {
                                const cfg = typeof t.template_config === 'string' ? JSON.parse(t.template_config) : (t.template_config || {});
                                const sample = { resident_name:'Juan Dela Cruz', address:'Purok 1', purok:'Purok 1', civil_status:'Single', barangay_name: cfg.header?.barangay_name || '', purpose:'Sample Purpose', date: ordinalDate(), or_number:'2026-001' };
                                openPrintPreview(applySettingsFallbacks(cfg), sample);
                              }} className="act-btn act-gray"><Printer size={12}/> Preview</button>
                          </>
                        )}
                        <button onClick={() => action(() => certificatesAPI.deleteTemplate(t.id), 'Template deleted')} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <Modal open={genModal} onClose={() => { setGenModal(false); setBlotterAlert(false); setGenForm(defaultGen); }} title="Generate Certificate" size="md">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="label">Resident * <span className="text-gray-400 font-normal text-xs">(type to search)</span></label>
            <ResidentSearch residents={residents} value={genForm.resident_id} onChange={v => setGen('resident_id', v)} />
          </div>

          {blotterAlert && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>This resident has an active blotter case. Clearance may be withheld pending resolution.</span>
            </div>
          )}

          <div>
            <label className="label">Certificate Type *</label>
            <select className="input" value={genForm.certificate_type} onChange={e => setGen('certificate_type', e.target.value)} required>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fee (₱)</label>
              <input type="number" min="0" step="0.01" className="input" value={genForm.fee}
                onChange={e => setGen('fee', e.target.value)} />
              {FEE_MAP[genForm.certificate_type] === 0 && <p className="text-xs text-emerald-600 mt-1">Free of charge</p>}
            </div>
            <div>
              <label className="label">O.R. Number</label>
              <input className="input" value={genForm.or_number}
                onChange={e => setGen('or_number', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">O.R. Date</label>
              <input type="date" className="input" value={genForm.or_date} onChange={e => setGen('or_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Template <span className="text-gray-400 font-normal text-xs">(auto-selected for this type)</span></label>
              <select className="input" value={genForm.template_id} onChange={e => setGen('template_id', e.target.value)}>
                <option value="">No template (default format)</option>
                {templates.filter(t => t.certificate_type === genForm.certificate_type).map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
              </select>
              {templates.filter(t => t.certificate_type === genForm.certificate_type).length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No template created for this certificate type yet — the default format will be used.</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Purpose *</label>
            <input className="input" value={genForm.purpose} onChange={e => setGen('purpose', e.target.value)}
              placeholder="e.g. Employment, Scholarship, Bank Loan…" required />
          </div>

          {(CERT_CUSTOM_FIELDS[genForm.certificate_type] || []).length > 0 && (
            <div className="border border-gray-200 dark:border-[#2e334a] rounded-xl p-3 space-y-3 bg-gray-50 dark:bg-[#22263a]">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Additional Details for {CERT_TYPES.find(t => t.value === genForm.certificate_type)?.label}
              </p>
              {CERT_CUSTOM_FIELDS[genForm.certificate_type].map(f => (
                <div key={`${genForm.certificate_type}_${f.tag}`}>
                  <label className="label">{f.label} *</label>
                  {f.multiline ? (
                    <textarea className="input" rows={2} value={genForm.custom_fields[f.tag] || ''}
                      onChange={e => setCustomField(f.tag, e.target.value)} required />
                  ) : f.inputType === 'date-or-present' ? (
                    <div className="flex items-center gap-2">
                      <input type="date" className="input flex-1"
                        disabled={!!genForm.custom_fields_present[f.tag]}
                        value={genForm.custom_fields_raw[f.tag] || ''}
                        onChange={e => setCustomDateField(f.tag, 'date', e.target.value)}
                        required={!genForm.custom_fields_present[f.tag]} />
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap cursor-pointer flex-shrink-0">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded accent-indigo-600"
                          checked={!!genForm.custom_fields_present[f.tag]}
                          onChange={e => setPresentFlag(f.tag, e.target.checked)} />
                        Present
                      </label>
                    </div>
                  ) : f.inputType === 'date' ? (
                    <input type="date" className="input" value={genForm.custom_fields_raw[f.tag] || ''}
                      onChange={e => setCustomDateField(f.tag, 'date', e.target.value)} required />
                  ) : f.inputType === 'year' ? (
                    <input type="month" className="input" value={genForm.custom_fields_raw[f.tag] || ''}
                      onChange={e => setCustomDateField(f.tag, 'year', e.target.value)} required />
                  ) : f.inputType === 'time' ? (
                    <input type="time" className="input" value={genForm.custom_fields_raw[f.tag] || ''}
                      onChange={e => setCustomDateField(f.tag, 'time', e.target.value)} required />
                  ) : f.inputType === 'relationship' ? (
                    <RelationshipField value={genForm.custom_fields[f.tag] || ''}
                      onChange={v => setCustomField(f.tag, v)} />
                  ) : f.inputType === 'resident_or_text' ? (
                    <RequestedByField value={genForm.custom_fields[f.tag] || ''} residents={residents}
                      onChange={v => setCustomField(f.tag, v)} />
                  ) : (
                    <input className="input" value={genForm.custom_fields[f.tag] || ''}
                      onChange={e => setCustomField(f.tag, e.target.value)} required />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setGenModal(false); setBlotterAlert(false); setGenForm(defaultGen); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Generating…' : 'Generate Certificate'}</button>
          </div>
        </form>
      </Modal>

      {/* Upload Template Modal */}
      <Modal open={tplModal} onClose={() => setTplModal(false)} title="Upload Certificate Template" size="sm">
        <form onSubmit={handleUploadTemplate} className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input className="input" value={tplForm.template_name} onChange={e => setTplForm(p => ({ ...p, template_name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Certificate Type *</label>
            <select className="input" value={tplForm.certificate_type} onChange={e => setTplForm(p => ({ ...p, certificate_type: e.target.value }))} required>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File (.docx or .pdf) *</label>
            <input type="file" accept=".docx,.pdf" onChange={e => setTplFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/60 transition cursor-pointer"
              required />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setTplModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Uploading…' : 'Upload Template'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Print Details Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!printModal}
        onClose={() => setPrintModal(null)}
        title="Print Certificate — Payment Details"
        size="sm"
      >
        {printModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Fill in the payment information before printing. These details appear at the bottom of the certificate.
            </div>

            <div>
              <label className="label">Paid Under</label>
              <input className="input" value={printModal.paidUnder}
                onChange={e => setPrintModal(p => ({ ...p, paidUnder: e.target.value }))}
                placeholder="e.g. General Fund, MOOE"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">O.R. Number</label>
                <input className="input font-mono" value={printModal.orNumber}
                  onChange={e => setPrintModal(p => ({ ...p, orNumber: e.target.value }))}
                  placeholder="Official Receipt No."/>
              </div>
              <div>
                <label className="label">Amount (₱)</label>
                <input type="number" min="0" step="0.01" className="input" value={printModal.amount}
                  onChange={e => setPrintModal(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CTC No.</label>
                <input className="input font-mono" value={printModal.ctcNo}
                  onChange={e => setPrintModal(p => ({ ...p, ctcNo: e.target.value }))}
                  placeholder="Community Tax Cert. No."/>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" value={printModal.paymentDate}
                  onChange={e => setPrintModal(p => ({ ...p, paymentDate: e.target.value }))}
                  placeholder="Date of payment"/>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3 text-xs text-gray-500 dark:text-slate-400">
              <p className="font-semibold text-gray-600 dark:text-slate-300 mb-1">Preview of bottom section:</p>
              <div className="space-y-0.5 font-mono">
                <p>Paid Under: {printModal.paidUnder || '___'}</p>
                <p>O.R. No.: {printModal.orNumber || '___'}</p>
                <p>Amount: {printModal.amount ? `₱${Number(printModal.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '___'}</p>
                <p>CTC No.: {printModal.ctcNo || '___'}</p>
                <p>Date: {printModal.paymentDate || '___'}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-[#2e334a]">
              <button onClick={() => setPrintModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={doPrint} className="btn-primary flex items-center gap-2">
                <Printer size={14}/> Print Certificate
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Modal — Rejected Certificates (read-only) ──────────────── */}
      <Modal open={!!viewCert} onClose={() => setViewCert(null)} title="Certificate Details" size="sm">
        {viewCert && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
              <XCircle size={16} className="text-rose-600 flex-shrink-0"/>
              <span className="text-rose-700 dark:text-rose-300 font-semibold">
                This certificate was rejected and cannot be printed or downloaded.
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-4 space-y-2.5 border border-gray-100 dark:border-[#2e334a]">
              {[
                ['Resident',    viewCert.resident_name],
                ['Type',        CERT_TYPES.find(t => t.value === viewCert.certificate_type)?.label || viewCert.certificate_type],
                ['Purpose',     viewCert.purpose || '—'],
                ['OR Number',   viewCert.or_number || '—'],
                ['Fee',         Number(viewCert.fee) > 0 ? fmt(viewCert.fee) : 'Free'],
                ['Status',      'Rejected'],
                ['Date Filed',  new Date(viewCert.created_at).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-gray-500 dark:text-slate-400 w-24 flex-shrink-0 font-medium">{k}</span>
                  <span className={`text-gray-800 dark:text-slate-100 ${k==='Status' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>{v}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={() => setViewCert(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Builder Modal */}
      <Modal
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingTpl(null); }}
        title={editingTpl ? `Edit Template — ${editingTpl.template_name}` : 'Create Certificate Template'}
        size="xl"
      >
        <CertificateTemplateBuilder
          initial={editingTpl ? {
            ...editingTpl,
            template_config: typeof editingTpl.template_config === 'string'
              ? JSON.parse(editingTpl.template_config)
              : (editingTpl.template_config || {}),
          } : null}
          settings={sysSettings}
          onSaved={() => load()}
          onClose={() => { setBuilderOpen(false); setEditingTpl(null); }}
        />
      </Modal>
    </div>
  );
}
