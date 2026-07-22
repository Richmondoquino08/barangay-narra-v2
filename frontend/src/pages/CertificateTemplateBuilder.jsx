import React, { useState, useRef } from 'react';
import { certificatesAPI } from '../api/apiClient';
import { useToast } from '../components/Toast';
import { resolveAssetUrl } from '../contexts/ThemeContext';
import { Upload, X, Eye, Save, Loader2, Image, PenLine, AlignLeft, FileText } from 'lucide-react';
import { escapeHtml, boldOrdinalDate, openPrintPreview, withLocationPrefix, SIGNATURE_THUMBPRINT_HTML } from '../utils/certificatePrint';

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

const CERT_TYPES = [
  // ── Existing types ──────────────────────────────────────────────────────
  { value: 'barangay_clearance',  label: 'Barangay Clearance' },
  { value: 'residency',           label: 'Certificate of Residency' },
  { value: 'indigency',           label: 'Certificate of Indigency' },
  { value: 'business_permit',     label: 'Business Permit/Clearance' },
  { value: 'good_moral',          label: 'Good Moral Character' },
  { value: 'ftjs',                label: 'First Time Job Seeker (FTJS)' },
  { value: 'no_income',           label: 'Certificate of No Income' },
  { value: 'senior_citizen_cert', label: 'Senior Citizen Certificate' },
  { value: 'pwd_cert',            label: 'PWD Certificate' },
  { value: 'cohabitation',        label: 'Certificate of Cohabitation' },
  { value: 'guardianship',        label: 'Certificate of Guardianship' },
  { value: 'travel_permit',       label: 'Travel Permit' },
  // ── Extended types (Barangay Narra templates) ───────────────────────────
  { value: 'cert_ftj',             label: 'Certification — First Time Jobseeker (RA 11261)' },
  { value: 'affidavit_of_loss',    label: 'Affidavit of Loss' },
  { value: 'bail_bond',            label: 'Certification for Bail Bond' },
  { value: 'clearance_thumbmark',  label: 'Barangay Clearance (with Thumbmark)' },
  { value: 'residency_thumbmark',  label: 'Certificate of Residency (with Thumbmark)' },
  { value: 'cert_death',           label: 'Certificate of Death' },
  { value: 'solo_parent',          label: 'Certificate of Solo Parent' },
  { value: 'cert_appearance',      label: 'Certification of Appearance' },
  { value: 'business_closure',     label: 'Certification — Closure of Business' },
  { value: 'cert_loan',            label: 'Certification for Loan' },
  { value: 'no_fixed_income',      label: 'Certification of No Fixed Income' },
  { value: 'cohabitation_dswd',    label: 'Certification of Cohabitation (DSWD)' },
  { value: 'tanod_death_claim',    label: 'Certification — Death Claim of Tanod' },
  { value: 'delayed_registration', label: 'Certification of Delayed Registration' },
  { value: 'cert_employment',      label: 'Certification of Employment' },
  { value: 'permit_to_transfer',   label: 'Permit to Transfer' },
  { value: 'endorsement_letter',   label: 'Endorsement Letter' },
];

// Standard Philippine barangay certificate body templates
const DEFAULT_BODIES = {
  barangay_clearance:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. is a bonafide resident of this Barangay and has no derogatory record filed or pending against him/her in this Office.

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  residency:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}, is a bonafide resident of this Barangay, and has been living here since {{years_residing_since}} up to present.

\tThis certification is being issued upon the request of the above-named person as proof of residency. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  indigency:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. belongs to an indigent family whose income falls below the poverty threshold and is a recipient of government assistance programs.

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  good_moral:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. is a person of good moral character and has no derogatory record known within this community.

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  ftjs:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. is a first-time job seeker who has not been previously employed in any private or government office or establishment, pursuant to Republic Act No. 11261 (First Time Jobseekers Assistance Act).

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  no_income:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. has no known source of income and is not gainfully employed.

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  business_permit:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. is authorized to operate/conduct business within the jurisdiction of this Barangay.

\tThis clearance is issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  // ── Extended templates ─────────────────────────────────────────────────
  cert_ftj:
`\tThis is to certify that {{resident_name}}, {{age}} years of age, with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}} is a qualified awardee of the First Time Jobseekers Assistance Act of 2019 (RA 11261).

\tThis will further certify that the holder/bearer was informed of his/her rights, including the Duties and Responsibilities accorded by RA 11261, through the Oath of Undertaking he/she has signed and executed in the presence of our Barangay Official.

\tThis certification is being issued upon the request of {{requested_by}} for the purpose of employment.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  affidavit_of_loss:
`\tIn behalf of {{relationship}}, {{resident_name}}, of {{address}}, {{barangay_name}}, {{city}}, {{province}}, hereby depose and say:
\t1. That he/she is a student of {{school_name}};
\t2. That he/she lost the following item: {{item_lost}};
\t3. That diligent search was made but the item could not be found;
\t4. That this affidavit is being executed to attest to the loss of the said item.

\tThis affidavit is being issued upon the request of {{requested_by}}, legal guardian, for whatever legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  bail_bond:
`\tThis is to certify that {{resident_name}} is a bonafide resident of {{address}}, {{barangay_name}}, {{city}}, {{province}}.

\tThis is to further certify that the above-named person is the accused in Criminal Case No. {{case_number}} pending before the {{court_name}}.

\tThis certification is issued upon the request of the person mentioned above for identification purposes, as required by the court for posting bail bond.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  clearance_thumbmark:
`\tThis is to certify that {{resident_name}}, whose picture, signature, and thumbprint appear below, is a resident of this Barangay with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}.

{{signature_thumbprint}}

\tThis further certifies that he/she is known to be a peaceful, law-abiding citizen, a person of good moral character, and has no derogatory record in this Barangay.

\tThis certification is being issued upon the request of the above-named person for {{purpose}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  residency_thumbmark:
`\tThis is to certify that {{resident_name}} is a resident of this Barangay with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}, and has been living here since {{years_residing_since}} up to present.

\tThis further certifies that he/she is known to be a peaceful, law-abiding citizen, a person of good moral character, and has no derogatory record in this Barangay.

\tThis certification is being issued upon the request of the above-named person for {{purpose}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  cert_death:
`\tThis is to certify that {{resident_name}}, {{age}} years old, died at his/her residence at {{address}}, {{barangay_name}}, {{city}}, {{province}} due to {{cause_of_death}} at {{time_of_death}}, {{date_of_death}}.

\tThis certification is being issued upon the request of {{requested_by}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  solo_parent:
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}} is a Solo Parent.

\tThis certification is being issued upon the request of {{resident_name}} for being a solo parent, for the purpose of {{purpose}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  cert_appearance:
`\tThis is to certify that {{resident_name}} of {{organization_name}} has appeared in this Office on {{appearance_date}} to transact for {{transaction_purpose}}.

\tThis certification is being issued upon the request of the above-named person for whatever purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  business_closure:
`\tThis is to certify that {{owner_name}}, owner/operator of {{business_name}} with business address at {{business_address}}, {{barangay_name}}, {{city}}, {{province}}, has already stopped its operation since {{closure_date}} up to present.

\tThis certification is issued upon the request of the named person above for business closure purposes.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  cert_loan:
`\tThis is to certify that {{resident_name}}, of legal age, is a resident of {{address}}, {{barangay_name}}, {{city}}, {{province}}.

\tThat due to {{reason}}, his/her family has been affected.

\tThis certification is issued upon the request of the said person as a supporting document for {{loan_type}}.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  no_fixed_income:
`\tThis is to certify that {{resident_name}}, {{age}} years old, with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}, is a bonafide resident of this Barangay.

\tThis further attests that the above-named person belongs to one of the indigent families in our Barangay.

\tThis certification is being issued upon the request of the bearer, certifying that he/she has not engaged in any business and has no fixed income.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  cohabitation_dswd:
`\tThis is to certify that {{partner_1_name}} and {{partner_2_name}} are living together as common-law husband and wife at {{address}}, {{barangay_name}}, {{city}}, {{province}}, since {{cohabitation_since}} up to present.

\tThis certification is being issued upon the request of {{requested_by}} as required by the Department of Social Welfare and Development (DSWD).

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  tanod_death_claim:
`\tThis is to certify that, as per records filed in this office, {{resident_name}} of this Barangay is the duly appointed and incumbent Barangay Tanod at the time of his/her death on {{date_of_death}}.

\tThis further certifies that he/she was known to be a peaceful, law-abiding citizen, a person of good moral character, with no derogatory record in this Barangay.

\tIssued upon the request of {{requested_by}}, {{relationship}} of the above-named, for death claim purposes.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  delayed_registration:
`\tThis is to certify that {{resident_name}} was born on {{birth_date}} at {{birth_place}}.

\tBearer is {{requested_by}} ({{relationship}}), presently residing at {{current_address}}, {{barangay_name}}, {{city}}, {{province}}.

\tThis certification is being issued upon the request of {{requested_by}} for the purpose of delayed registration of Birth Certificate.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  cert_employment:
`\tThis is to certify that {{resident_name}} was appointed as {{position}} of Sangguniang {{barangay_name}} from {{start_date}} up to {{end_date}}, based on our Barangay record.

\tThis certification is being issued upon the request of the aforementioned name for whatever lawful purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  permit_to_transfer:
`\tThis is to certify that {{resident_name}} is a resident of this Barangay with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}, and is a registered member of this Barangay since {{member_since}}. He/She will transfer to {{destination_barangay}}.

\tThis certification is issued upon the request of {{resident_name}} as proof of residency, for whatever purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`,

  endorsement_letter:
`TO: {{recipient_institution}}
\t{{recipient_address}}

\tThis is to endorse to your good office, {{resident_name}}, with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}, as {{endorsement_reason}}.

\tHoping for your kind consideration.

Respectfully,`,
};

// Layers current system settings under a template's header/footer so the
// signatory section and barangay seal (incl. watermark) always render the
// way they will at actual print time — even if the saved template config
// was created before these settings existed, or never had a logo uploaded
// into the template itself (see the identical fallback in Certificates.jsx).
function applySettingsFallback(cfg, s) {
  return {
    ...cfg,
    header: {
      ...cfg.header,
      logo_url:       cfg.header?.logo_url       || s.logo_url       || '',
      right_logo_url: cfg.header?.right_logo_url || s.right_logo_url || '',
    },
    footer: {
      ...cfg.footer,
      signatory_name:  cfg.footer?.signatory_name  || s.signatory_name  || s.captain || '',
      signatory_title: cfg.footer?.signatory_title || s.signatory_title || 'Punong Barangay',
      secretary_name:  cfg.footer?.secretary_name  || s.secretary_name  || '',
      secretary_title: cfg.footer?.secretary_title || s.secretary_title || 'Barangay Secretary / By Authority',
      validity_text:   cfg.footer?.validity_text   !== undefined ? cfg.footer.validity_text : (s.cert_validity || 'Valid for three (3) months only'),
    },
  };
}

const DEFAULT_BODY =
`\tThis is to certify that {{resident_name}} with postal address at {{address}}, {{barangay_name}}, {{city}}, {{province}}. is hereby certified by this office.

\tThis certification is being issued upon the request of the above-named person for the purpose of {{purpose}}. This document can be used for any legal purpose it may serve.

Issued this {{date}} at Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.`;

const PLACEHOLDERS = [
  // ── Auto-filled from resident record / system settings ─────────────────
  { tag: '{{resident_name}}', label: 'Full Name' },
  { tag: '{{age}}',           label: 'Age' },
  { tag: '{{address}}',       label: 'Address' },
  { tag: '{{purok}}',         label: 'Purok' },
  { tag: '{{civil_status}}',  label: 'Civil Status' },
  { tag: '{{barangay_name}}', label: 'Barangay Name' },
  { tag: '{{city}}',          label: 'City/Municipality' },
  { tag: '{{province}}',      label: 'Province' },
  { tag: '{{purpose}}',       label: 'Purpose' },
  { tag: '{{date}}',          label: 'Issue Date' },
  { tag: '{{or_number}}',     label: 'O.R. Number' },
  { tag: '{{fee}}',           label: 'Fee Amount' },
  { tag: '{{signature_thumbprint}}', label: 'Signature & Right Thumbprint Boxes' },
  // ── Staff-filled in print window (template-specific) ───────────────────
  { tag: '{{requested_by}}',         label: 'Requested By' },
  { tag: '{{relationship}}',         label: 'Relationship' },
  { tag: '{{years_residing_since}}', label: 'Year Residing Since' },
  { tag: '{{item_lost}}',            label: 'Item Lost' },
  { tag: '{{school_name}}',          label: 'School Name' },
  { tag: '{{case_number}}',          label: 'Case No.' },
  { tag: '{{court_name}}',           label: 'Court Name' },
  { tag: '{{cause_of_death}}',       label: 'Cause of Death' },
  { tag: '{{time_of_death}}',        label: 'Time of Death' },
  { tag: '{{date_of_death}}',        label: 'Date of Death' },
  { tag: '{{organization_name}}',    label: 'Organization' },
  { tag: '{{appearance_date}}',      label: 'Appearance Date' },
  { tag: '{{transaction_purpose}}',  label: 'Transaction Purpose' },
  { tag: '{{owner_name}}',           label: 'Owner Name' },
  { tag: '{{business_name}}',        label: 'Business Name' },
  { tag: '{{business_address}}',     label: 'Business Address' },
  { tag: '{{closure_date}}',         label: 'Closure Date' },
  { tag: '{{reason}}',               label: 'Reason' },
  { tag: '{{loan_type}}',            label: 'Loan Type' },
  { tag: '{{partner_1_name}}',       label: 'Partner 1 Name' },
  { tag: '{{partner_2_name}}',       label: 'Partner 2 Name' },
  { tag: '{{cohabitation_since}}',   label: 'Cohabiting Since' },
  { tag: '{{birth_date}}',           label: 'Birth Date' },
  { tag: '{{birth_place}}',          label: 'Birth Place' },
  { tag: '{{current_address}}',      label: 'Current Address' },
  { tag: '{{position}}',             label: 'Position/Role' },
  { tag: '{{start_date}}',           label: 'Start Date' },
  { tag: '{{end_date}}',             label: 'End Date' },
  { tag: '{{member_since}}',         label: 'Member Since' },
  { tag: '{{destination_barangay}}', label: 'Destination Barangay' },
  { tag: '{{recipient_institution}}',label: 'Recipient Institution' },
  { tag: '{{recipient_address}}',    label: 'Recipient Address' },
  { tag: '{{endorsement_reason}}',   label: 'Endorsement Reason' },
];

// ── Small image upload zone ────────────────────────────────────────────────
// If currentUrl is empty but fallbackUrl is given (e.g. the barangay logo
// configured once in System Settings), the fallback image is shown so staff
// can see the seal is already automatic — uploading here just overrides it
// for this one template.
function ImageUploadZone({ label, currentUrl, onUploaded, onCleared, hint, fallbackUrl, fallbackLabel }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const { toast } = useToast();

  async function doUpload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    try {
      const res = await certificatesAPI.uploadHeaderImage(fd);
      onUploaded(res.data.url);
      toast('Image uploaded', 'success');
    } catch { toast('Upload failed', 'error'); }
    finally { setUploading(false); }
  }

  const src = currentUrl ? resolveAssetUrl(currentUrl) : '';
  const usingFallback = !src && !!fallbackUrl;
  const displaySrc = src || (usingFallback ? resolveAssetUrl(fallbackUrl) : '');

  return (
    <div className="space-y-1">
      <label className="label text-xs">{label}</label>
      {hint && <p className="text-[10px] text-gray-400 dark:text-slate-500">{hint}</p>}
      <div onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer overflow-hidden transition
          ${displaySrc ? 'h-24' : 'h-16'}
          ${usingFallback ? 'border-emerald-200 dark:border-emerald-800' : 'border-gray-200 dark:border-[#2e334a]'} hover:border-indigo-300`}>
        {displaySrc ? (
          <>
            <img src={displaySrc} alt={label} className="w-full h-full object-contain bg-white dark:bg-[#22263a]"/>
            {usingFallback ? (
              <div className="absolute inset-x-0 bottom-0 bg-emerald-600/90 text-white text-[9px] font-semibold text-center py-0.5">
                Auto — from System Settings
              </div>
            ) : (
              <button type="button" onClick={e => { e.stopPropagation(); onCleared(); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-rose-600 rounded-full flex items-center justify-center text-white transition z-10">
                <X size={10}/>
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-white"/>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400 dark:text-slate-500">
            {uploading ? <Loader2 size={14} className="animate-spin text-indigo-500"/> : <><Upload size={14}/><span className="text-[10px]">Upload</span></>}
          </div>
        )}
      </div>
      {usingFallback && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
          Using {fallbackLabel || 'the system default'} — click to upload a different one just for this template.
        </p>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) doUpload(e.target.files[0]); e.target.value = ''; }}/>
    </div>
  );
}

// ── Live certificate preview ───────────────────────────────────────────────
function CertPreview({ config, sampleData, scale = 0.55 }) {
  const logoL = config.header.logo_url ? resolveAssetUrl(config.header.logo_url) : '';
  const logoR = config.header.right_logo_url ? resolveAssetUrl(config.header.right_logo_url) : '';
  const headerImg = config.header.custom_header_image ? resolveAssetUrl(config.header.custom_header_image) : '';
  const borderColor = config.style?.border_color || '#16a34a';
  const showBorder  = config.style?.show_border !== false;

  function fill(text) {
    return (text || '')
      .replace(/\{\{resident_name\}\}/g, `<strong>${escapeHtml(sampleData.resident_name)}</strong>`)
      .replace(/\{\{age\}\}/g,           escapeHtml(sampleData.age || '{{age}}'))
      .replace(/\{\{address\}\}/g,       escapeHtml(sampleData.address))
      .replace(/\{\{purok\}\}/g,          escapeHtml(sampleData.purok))
      .replace(/\{\{civil_status\}\}/g,  escapeHtml(sampleData.civil_status))
      .replace(/\{\{barangay_name\}\}/g, escapeHtml(config.header.barangay_name || sampleData.barangay_name))
      .replace(/\{\{city\}\}/g,          escapeHtml(config.header.city || sampleData.city))
      .replace(/\{\{province\}\}/g,      escapeHtml(config.header.province || sampleData.province))
      .replace(/\{\{purpose\}\}/g,       escapeHtml(sampleData.purpose))
      .replace(/\{\{date\}\}/g,          boldOrdinalDate(sampleData.date))
      .replace(/\{\{or_number\}\}/g,     sampleData.or_number ? `O.R. No. ${escapeHtml(sampleData.or_number)}` : '')
      .replace(/\{\{signature_thumbprint\}\}/g, SIGNATURE_THUMBPRINT_HTML);
  }

  const W = 816 * scale;
  const fontBase = 11 * scale;

  return (
    <div style={{
      width: W, background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: fontBase, color: '#111', padding: showBorder ? 8 * scale : 0,
      border: showBorder ? `${3 * scale}px solid ${borderColor}` : 'none',
      borderRadius: 4,
    }}>
      <div style={{ border: showBorder ? `${1 * scale}px solid ${borderColor}` : 'none', padding: 16 * scale, position: 'relative', overflow: 'hidden' }}>
        {config.style?.show_watermark && (logoL || logoR) && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:0, pointerEvents:'none' }}>
            <img src={logoL || logoR} alt="" style={{ width:'55%', objectFit:'contain', opacity:(config.style?.watermark_opacity ?? 15)/100 }}/>
          </div>
        )}
        <div style={{ position:'relative', zIndex:1 }}>

        {/* Custom full-width header image */}
        {headerImg ? (
          <img src={headerImg} alt="Header" style={{ width:'100%', maxHeight: 100*scale, objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap: 7*scale, borderBottom: `${2*scale}px solid ${borderColor}`, paddingBottom: 10*scale, marginBottom: 10*scale }}>
            {logoL && <img src={logoL} style={{ width: 76*scale, height: 76*scale, objectFit:'contain', flexShrink: 0 }} alt="L"/>}
            <div style={{ flex:1, textAlign:'center' }}>
              {config.header.show_republic !== false && <p style={{ margin:0, fontSize:10.5*scale, color:'#555' }}>REPUBLIC OF THE PHILIPPINES</p>}
              {config.header.province && <p style={{ margin:0, fontSize:10.5*scale, color:'#555' }}>{withLocationPrefix('PROVINCE OF', config.header.province)}</p>}
              {config.header.city && <p style={{ margin:0, fontSize:10.5*scale, color:'#555' }}>{withLocationPrefix('CITY OF', config.header.city)}</p>}
              <p style={{ margin:`${3*scale}px 0 0`, fontSize:15*scale, fontWeight:'bold' }}>{config.header.barangay_name || 'BARANGAY NAME'}</p>
              {config.header.office_label !== false && (
                <>
                  <div style={{ borderTop:`${1*scale}px solid ${borderColor}`, margin:`${4*scale}px auto`, width:'60%' }}/>
                  <p style={{ margin:0, fontSize:10.5*scale }}>OFFICE OF THE PUNONG BARANGAY</p>
                </>
              )}
            </div>
            {logoR && <img src={logoR} style={{ width: 76*scale, height: 76*scale, objectFit:'contain', flexShrink: 0 }} alt="R"/>}
            {!logoR && logoL && <div style={{ width: 76*scale, flexShrink: 0 }}/>}
          </div>
        )}

        {/* Title */}
        <div style={{ textAlign:'center', margin:`${14*scale}px 0 ${10*scale}px` }}>
          <p style={{ margin:0, fontWeight:'bold', fontSize:14*scale, textDecoration:'underline', letterSpacing: 2*scale }}>{config.title}</p>
        </div>

        {/* Body — fill() escapes all interpolated values then adds trusted <strong> tags.
            Structural blocks (e.g. signature/thumbprint boxes) render as a <div>, not
            wrapped in a <p>, since a block element can't legally nest inside one. */}
        <div style={{ lineHeight: 1.8, margin:`${8*scale}px 0 ${16*scale}px` }}>
          {fill(config.body).split('\n').map((l, i) => {
            const trimmed = (l || '').trim();
            if (!trimmed) return <p key={i} style={{ margin:`${3*scale}px 0` }}>&nbsp;</p>;
            if (trimmed.startsWith('<div')) return <div key={i} dangerouslySetInnerHTML={{ __html: l }} />;
            return <p key={i} style={{ margin:`${3*scale}px 0` }} dangerouslySetInnerHTML={{ __html: l }} />;
          })}
        </div>

        {/* Signatures */}
        <div style={{ marginTop: 24*scale }}>
          {/* Additional signatories */}
          {(config.footer.additional || []).length > 0 && (
            <div style={{ display:'flex', gap: 48*scale, marginBottom: 12*scale }}>
              {config.footer.additional.map((s, i) => (
                <div key={i} style={{ textAlign:'center', minWidth: 150*scale }}>
                  <div style={{ borderTop:`${scale}px solid #111`, paddingTop: 3*scale }}>
                    <p style={{ margin:0, fontWeight:'bold', fontSize:10*scale }}>{s.name}</p>
                    <p style={{ margin:0, fontSize:9*scale, color:'#555' }}>{s.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Primary + secondary signatories right-aligned */}
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'inline-block', textAlign:'center' }}>
              <p style={{ margin:0, fontWeight:'bold', fontSize:11*scale, textDecoration:'underline' }}>
                {config.footer.signatory_name ? `HON. ${config.footer.signatory_name.toUpperCase()}` : 'HON. PUNONG BARANGAY'}
              </p>
              <p style={{ margin:`${2*scale}px 0 ${12*scale}`, fontSize:9*scale }}>{config.footer.signatory_title || 'PUNONG BARANGAY'}</p>
              {config.footer.secretary_name && (
                <>
                  <p style={{ margin:0, fontWeight:'bold', fontSize:11*scale, textDecoration:'underline' }}>{config.footer.secretary_name.toUpperCase()}</p>
                  <p style={{ margin:`${2*scale}px 0 0`, fontSize:9*scale }}>{config.footer.secretary_title || 'Barangay Secretary / By Authority'}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment info + dry seal */}
        {config.footer.show_payment_info !== false && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop: 16*scale, paddingTop: 8*scale, borderTop:`${scale}px solid #e5e7eb` }}>
            <div style={{ fontSize: 9*scale, color:'#333', lineHeight: 2 }}>
              <p style={{ margin:0 }}><em>Paid Under:</em></p>
              <p style={{ margin:0 }}><em>O.R. No.:</em></p>
              <p style={{ margin:0 }}><em>Amount:</em></p>
              <p style={{ margin:0 }}><em>CTC No.:</em></p>
              <p style={{ margin:0 }}><em>Date:</em></p>
            </div>
            <div style={{ textAlign:'right', fontSize: 9*scale, color:'#555', fontStyle:'italic' }}>
              Not valid without dry seal
            </div>
          </div>
        )}

        {/* Validity footer */}
        {config.footer.validity_text !== '' && (
          <div style={{ textAlign:'center', borderTop:`${scale}px solid ${borderColor}`, marginTop: 8*scale, paddingTop: 5*scale }}>
            <p style={{ margin:0, fontSize: 9*scale, fontStyle:'italic', color:'#555' }}>
              ({config.footer.validity_text || 'Valid for three (3) months only'})
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────
export default function CertificateTemplateBuilder({ initial, settings, onSaved, onClose }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('header');

  const s = settings || {};
  const defaultConfig = {
    header: {
      show_republic: true,
      logo_url:      s.logo_url || '',
      right_logo_url:s.right_logo_url || '',
      custom_header_image: '',
      barangay_name: s.barangay_name || '',
      province:      s.province || '',
      city:          s.city_municipality || '',
      office_label:  true,
    },
    style: {
      show_border:  true,
      border_color: '#16a34a',
      show_watermark:    false,
      watermark_opacity: 15,
    },
    title: 'CERTIFICATE OF RESIDENCY',
    body: DEFAULT_BODIES['residency'] || DEFAULT_BODY,
    footer: {
      signatory_name:  s.signatory_name  || s.captain || '',
      signatory_title: s.signatory_title || 'Punong Barangay',
      secretary_name:  s.secretary_name  || '',
      secretary_title: s.secretary_title || 'Barangay Secretary / By Authority',
      additional: [],
      show_payment_info: true,
      validity_text: s.cert_validity || 'Valid for three (3) months only',
    },
  };

  const [name, setName]       = useState(initial?.template_name || '');
  const [certType, setCertType] = useState(initial?.certificate_type || 'residency');
  const [config, setConfig]   = useState(() => {
    if (initial?.template_config && Object.keys(initial.template_config).length > 0) {
      const tc = initial.template_config;
      return {
        ...defaultConfig,
        ...tc,
        header:  { ...defaultConfig.header,  ...(tc.header  || {}) },
        style:   { ...defaultConfig.style,   ...(tc.style   || {}) },
        footer:  { ...defaultConfig.footer,  ...(tc.footer  || {}) },
      };
    }
    return {
      ...defaultConfig,
      title: 'CERTIFICATE OF RESIDENCY',
      body:  DEFAULT_BODIES['residency'] || DEFAULT_BODY,
    };
  });

  const setH = (k, v) => setConfig(p => ({ ...p, header: { ...p.header, [k]: v } }));
  const setF = (k, v) => setConfig(p => ({ ...p, footer: { ...p.footer, [k]: v } }));
  const setSt = (k, v) => setConfig(p => ({ ...p, style: { ...p.style, [k]: v } }));

  function handleTypeChange(t) {
    setCertType(t);
    const label = CERT_TYPES.find(x => x.value === t)?.label?.toUpperCase() || 'CERTIFICATE';
    setConfig(p => ({
      ...p,
      title: label,
      body: !initial ? (DEFAULT_BODIES[t] || DEFAULT_BODY) : p.body,
    }));
  }

  function insertPlaceholder(tag) {
    setConfig(p => ({ ...p, body: p.body + ' ' + tag }));
  }

  // Tab inserts a real tab character (used for paragraph indent on print) instead
  // of shifting focus to the next field. Shift+Tab removes one leading tab.
  function handleBodyKeyDown(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const { selectionStart: start, selectionEnd: end } = el;
    const value = config.body;

    if (e.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      if (value[lineStart] !== '\t') return;
      const newValue = value.slice(0, lineStart) + value.slice(lineStart + 1);
      const newPos = Math.max(lineStart, start - 1);
      setConfig(p => ({ ...p, body: newValue }));
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = newPos; });
      return;
    }

    const newValue = value.slice(0, start) + '\t' + value.slice(end);
    setConfig(p => ({ ...p, body: newValue }));
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 1; });
  }

  function addSignatory() {
    setF('additional', [...(config.footer.additional || []), { name: '', title: '' }]);
  }

  function updateSignatory(i, key, val) {
    const updated = [...(config.footer.additional || [])];
    updated[i] = { ...updated[i], [key]: val };
    setF('additional', updated);
  }

  function removeSignatory(i) {
    setF('additional', (config.footer.additional || []).filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) { toast('Template name is required', 'warning'); return; }
    setSaving(true);
    try {
      const payload = { template_name: name, certificate_type: certType, template_config: config };
      if (initial?.id) {
        await certificatesAPI.updateCustomTemplate(initial.id, payload);
        toast('Template updated', 'success');
      } else {
        await certificatesAPI.createCustomTemplate(payload);
        toast('Template created', 'success');
      }
      onSaved();
      onClose();
    } catch { toast('Failed to save template', 'error'); }
    finally { setSaving(false); }
  }

  const sampleData = {
    resident_name: 'MS. MARYROSE FLORES BAYRON',
    age:           '35',
    address:       '#120 GUIHO ST. Barangay ' + (config.header.barangay_name || 'Narra') + ' ' + (config.header.city || 'San Pedro City') + ' ' + (config.header.province || 'Laguna'),
    purok:         'Purok 1',
    civil_status:  'Single',
    barangay_name: config.header.barangay_name || 'Narra',
    city:          config.header.city || 'San Pedro City',
    province:      config.header.province || 'Laguna',
    purpose:       'Employment',
    date:          ordinalDate(),
    or_number:     '2025-001',
  };

  // What will actually print — raw config with current settings layered in as
  // fallback, so the editor's preview matches production exactly.
  const previewConfig = applySettingsFallback(config, s);

  // Watermark can use a seal uploaded directly on this template, or fall back
  // to the barangay logo configured in System Settings — no upload required.
  const hasWatermarkLogo = !!(config.header.logo_url || config.header.right_logo_url || s.logo_url || s.right_logo_url);

  const SECTIONS = [
    { id:'header',  label:'Header',   icon: Image },
    { id:'content', label:'Content',  icon: AlignLeft },
    { id:'footer',  label:'Footer',   icon: PenLine },
    { id:'preview', label:'Preview',  icon: Eye },
  ];

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Top bar */}
      <div className="flex gap-3 pb-4 border-b border-gray-100 dark:border-[#2e334a] flex-shrink-0">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Template Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Residency"/>
          </div>
          <div>
            <label className="label">Certificate Type</label>
            <select className="input" value={certType} onChange={e => handleTypeChange(e.target.value)}>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 py-3 border-b border-gray-100 dark:border-[#2e334a] flex-shrink-0">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${activeSection === s.id ? 'text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#22263a]'}`}
              style={activeSection === s.id ? { backgroundColor: 'var(--primary)' } : {}}>
              <Icon size={14}/>{s.label}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-1.5 text-sm min-w-[110px] justify-center">
            {saving ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : <><Save size={13}/> Save</>}
          </button>
        </div>
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        {activeSection === 'header' && (
          <div className="space-y-4">
            {/* Custom letterhead */}
            <div className="card p-4">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200 mb-3">
                Full-Width Letterhead Image <span className="text-gray-400 font-normal text-xs">(overrides text header when set)</span>
              </h4>
              <ImageUploadZone
                label="Header Letterhead"
                currentUrl={config.header.custom_header_image}
                onUploaded={url => setH('custom_header_image', url)}
                onCleared={() => setH('custom_header_image', '')}
                hint="Upload a pre-made letterhead image. Recommended: 900×140px PNG."
              />
            </div>

            {/* Text header config */}
            <div className="card p-4 space-y-4">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200">Text Header (used when no letterhead image)</h4>

              {/* Logos row */}
              <div className="grid grid-cols-2 gap-4">
                <ImageUploadZone
                  label="Left Seal (Barangay Logo)"
                  currentUrl={config.header.logo_url}
                  onUploaded={url => setH('logo_url', url)}
                  onCleared={() => setH('logo_url', '')}
                  fallbackUrl={s.logo_url}
                  fallbackLabel="the Barangay Logo from System Settings"
                  hint="Barangay seal shown on the left side of the header. Leave empty to auto-use System Settings."/>
                <ImageUploadZone
                  label="Right Seal (City/Municipality)"
                  currentUrl={config.header.right_logo_url}
                  onUploaded={url => setH('right_logo_url', url)}
                  onCleared={() => setH('right_logo_url', '')}
                  fallbackUrl={s.right_logo_url}
                  fallbackLabel="the City/Municipality Seal from System Settings"
                  hint="City/municipality seal shown on the right side. Leave empty to auto-use System Settings."/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Province</label>
                  <input className="input" value={config.header.province}
                    onChange={e => setH('province', e.target.value)} placeholder="e.g. Laguna"/>
                </div>
                <div>
                  <label className="label">City / Municipality</label>
                  <input className="input" value={config.header.city}
                    onChange={e => setH('city', e.target.value)} placeholder="e.g. San Pedro City"/>
                </div>
              </div>
              <div>
                <label className="label">Barangay Name</label>
                <input className="input" value={config.header.barangay_name}
                  onChange={e => setH('barangay_name', e.target.value)} placeholder="e.g. Barangay Narra"/>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                    checked={config.header.show_republic !== false}
                    onChange={e => setH('show_republic', e.target.checked)}/>
                  <span className="text-sm text-gray-700 dark:text-slate-300">Show "Republic of the Philippines"</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                    checked={config.header.office_label !== false}
                    onChange={e => setH('office_label', e.target.checked)}/>
                  <span className="text-sm text-gray-700 dark:text-slate-300">Show "Office of the Punong Barangay"</span>
                </label>
              </div>
            </div>

            {/* Certificate title + border */}
            <div className="card p-4 space-y-3">
              <div>
                <label className="label">Certificate Title</label>
                <input className="input uppercase font-bold tracking-widest" value={config.title}
                  onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. CERTIFICATE OF RESIDENCY"/>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                    checked={config.style?.show_border !== false}
                    onChange={e => setSt('show_border', e.target.checked)}/>
                  <span className="text-sm text-gray-700 dark:text-slate-300">Show border around certificate</span>
                </label>
                {config.style?.show_border !== false && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-slate-300">Border color:</label>
                    <input type="color" value={config.style?.border_color || '#16a34a'}
                      onChange={e => setSt('border_color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"/>
                    <span className="text-xs text-gray-400">{config.style?.border_color || '#16a34a'}</span>
                  </div>
                )}
              </div>

              {/* Watermark */}
              <div className="pt-1 border-t border-gray-100 dark:border-[#2e334a]">
                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                    disabled={!hasWatermarkLogo}
                    checked={!!config.style?.show_watermark}
                    onChange={e => setSt('show_watermark', e.target.checked)}/>
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    Show barangay seal as background watermark
                  </span>
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  {hasWatermarkLogo
                    ? 'Automatically uses the barangay seal from Header (or System Settings if none is set here).'
                    : 'No barangay seal found. Upload one above or set it in System Settings to enable the watermark.'}
                </p>
                {config.style?.show_watermark && hasWatermarkLogo && (
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap">Transparency:</label>
                    <input type="range" min="5" max="60" step="1"
                      value={config.style?.watermark_opacity ?? 15}
                      onChange={e => setSt('watermark_opacity', Number(e.target.value))}
                      className="flex-1 accent-indigo-600"/>
                    <span className="text-xs text-gray-400 w-10 text-right">{config.style?.watermark_opacity ?? 15}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT ─────────────────────────────────────────────── */}
        {activeSection === 'content' && (
          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Click to insert placeholder at cursor position
              </p>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map(p => (
                  <button key={p.tag} type="button" onClick={() => insertPlaceholder(p.tag)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-mono hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition border border-indigo-200 dark:border-indigo-800">
                    {p.tag} <span className="font-sans text-gray-400">· {p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Certificate Body Text *</label>
              <textarea className="input resize-y font-mono text-xs" rows={16}
                value={config.body}
                onChange={e => setConfig(p => ({ ...p, body: e.target.value }))}
                onKeyDown={handleBodyKeyDown}
                placeholder="Enter body text with {{placeholders}}..."/>
              <p className="text-xs text-gray-400 mt-1">Press Tab at the start of a line to indent (Shift+Tab to remove). Line breaks are preserved.</p>
            </div>
            <button type="button" onClick={() => setConfig(p => ({ ...p, body: DEFAULT_BODIES[certType] || DEFAULT_BODY }))}
              className="btn-secondary text-sm">Reset to Default Body</button>
          </div>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        {activeSection === 'footer' && (
          <div className="space-y-4">
            {/* Primary signatory */}
            <div className="card p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200">Primary Signatory (Punong Barangay)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={config.footer.signatory_name}
                    onChange={e => setF('signatory_name', e.target.value)} placeholder="e.g. Juan Dela Cruz"/>
                  <p className="text-xs text-gray-400 mt-1">Displayed as "HON. [NAME]"</p>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={config.footer.signatory_title}
                    onChange={e => setF('signatory_title', e.target.value)} placeholder="PUNONG BARANGAY"/>
                </div>
              </div>
            </div>

            {/* Second signatory */}
            <div className="card p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200">Second Signatory (By Authority)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={config.footer.secretary_name}
                    onChange={e => setF('secretary_name', e.target.value)} placeholder="e.g. Juan Dela Cruz"/>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={config.footer.secretary_title}
                    onChange={e => setF('secretary_title', e.target.value)} placeholder="Barangay Secretary / By Authority"/>
                </div>
              </div>
            </div>

            {/* Additional signatories */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200">Other Signatories</h4>
                <button type="button" onClick={addSignatory}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">+ Add</button>
              </div>
              {(config.footer.additional || []).map((s, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-[#22263a] p-3 rounded-xl relative">
                  <div><label className="label text-xs">Name</label>
                    <input className="input text-sm" value={s.name} onChange={e => updateSignatory(i,'name',e.target.value)}/></div>
                  <div><label className="label text-xs">Title</label>
                    <input className="input text-sm" value={s.title} onChange={e => updateSignatory(i,'title',e.target.value)}/></div>
                  <button type="button" onClick={() => removeSignatory(i)}
                    className="absolute top-2 right-2 w-5 h-5 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 rounded-full flex items-center justify-center text-rose-600">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Payment info + validity */}
            <div className="card p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-200">Bottom Section</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                  checked={config.footer.show_payment_info !== false}
                  onChange={e => setF('show_payment_info', e.target.checked)}/>
                <span className="text-sm text-gray-700 dark:text-slate-300">Show Payment Info block (Paid Under, O.R. No., Amount, CTC No., Date) + "Not valid without dry seal"</span>
              </label>
              <div>
                <label className="label">Validity Note</label>
                <input className="input" value={config.footer.validity_text}
                  onChange={e => setF('validity_text', e.target.value)}
                  placeholder="Valid for three (3) months only"/>
                <p className="text-xs text-gray-400 mt-1">Leave blank to hide. Shown in parentheses at the very bottom.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW ─────────────────────────────────────────────── */}
        {activeSection === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Live preview with sample data. Switch sections to edit.
              </p>
              <button type="button" onClick={() => openPrintPreview(previewConfig, sampleData)}
                className="btn-secondary flex items-center gap-1.5 text-sm">
                <Eye size={13}/> Full Print Preview
              </button>
            </div>
            <div className="bg-gray-100 dark:bg-[#22263a] rounded-2xl p-4 overflow-x-auto">
              <CertPreview config={previewConfig} sampleData={sampleData}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
