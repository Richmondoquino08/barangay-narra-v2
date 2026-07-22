import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Printer, Settings2, Eye, Save, RotateCcw, FileText, Info, Minus, Plus, User, Clock, Trash2, Search, X } from 'lucide-react';
import apiClient from '../api/apiClient';

const HISTORY_KEY = 'cheque_print_history_v1';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function appendHistory(entry) {
  const hist = loadHistory();
  hist.unshift({ ...entry, id: Date.now(), printedAt: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 200)));
}

const LS_KEY = 'lbp_cheque_layout_v5'; // bumped: 8x3in size + dateSpacing replace v4's 8.5x3.5in + hardcoded offsets

function amountToWords(num) {
  const n = parseFloat(num);
  if (!num || isNaN(n) || n < 0) return '';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function c(x) {
    if (x===0) return '';
    if (x<20) return ones[x];
    if (x<100) return tens[Math.floor(x/10)]+(x%10?' '+ones[x%10]:'');
    if (x<1000) return ones[Math.floor(x/100)]+' Hundred'+(x%100?' '+c(x%100):'');
    if (x<1e6) return c(Math.floor(x/1000))+' Thousand'+(x%1000?' '+c(x%1000):'');
    if (x<1e9) return c(Math.floor(x/1e6))+' Million'+(x%1e6?' '+c(x%1e6):'');
    return c(Math.floor(x/1e9))+' Billion'+(x%1e9?' '+c(x%1e9):'');
  }
  const [pStr,cStr] = n.toFixed(2).split('.');
  const p=parseInt(pStr), cs=parseInt(cStr);
  return cs===0 ? `${c(p)} Pesos Only` : `${c(p)} Pesos and ${c(cs)} Centavos Only`;
}

const MATRIX_FONT = "'Courier New', Courier, monospace";

// Parse date string into { mm, dd, yyyy } — accepts YYYY-MM-DD (input type=date) or MM/DD/YYYY
function parseDateForCheque(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return { mm: m, dd: d, yyyy: y };
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [m, d, y] = dateStr.split('/');
    return { mm: m, dd: d, yyyy: y };
  }
  return null;
}

// ── Only the fields the user needs to fill (everything else is pre-printed) ──
// Cheque: 8" wide × 3" tall (landscape) — measured directly off the physical
// Landbank cheque, not the generic 8.5×3.5 checkbook standard.
const DEFAULT_LAYOUT = {
  chequeWidth:  8,
  chequeHeight: 3,
  // Date digit box spacing, in points (1/72in) — the "hard to set up" part:
  // now tunable instead of a hardcoded offset table. boxWidth = width of one
  // MM/DD/YYYY digit box; digitGap = gap between two digits in the same
  // group (e.g. the two M's); groupGap = the wider gap where a "/" sits
  // between groups; boxHeight = visual height of the pre-printed box.
  dateSpacing: { boxWidth: 13, digitGap: 1.5, groupGap: 7, boxHeight: 20 },
  fields: {
    date:        { top: 21, left: 63, fontSize: 9,  bold: false, label: 'Date' },
    payee:       { top: 34, left: 18, fontSize: 11, bold: true,  label: 'Payee Name' },
    amountNum:   { top: 34, left: 67, fontSize: 11, bold: true,  label: 'Amount (numbers)' },
    amountWords: { top: 45, left:  9, fontSize: 10, bold: false, label: 'Amount in Words' },
    signer1:     { top: 78, left: 35, fontSize: 8,  bold: true,  label: 'Signatory 1' },
    signer2:     { top: 78, left: 60, fontSize: 8,  bold: true,  label: 'Signatory 2' },
  }
};

// Turns dateSpacing into 8 left-offsets (points, from the first box) for the
// M M D D Y Y Y Y digits. Shared by the on-screen preview and the print
// output so both always agree on exactly where each digit lands.
function computeDateOffsets({ boxWidth, digitGap, groupGap }) {
  const groupSizes = [2, 2, 4]; // MM, DD, YYYY
  const offsets = [];
  let pos = 0, first = true;
  for (const size of groupSizes) {
    for (let i = 0; i < size; i++) {
      if (!first) pos += boxWidth + (i === 0 ? groupGap : digitGap);
      offsets.push(pos);
      first = false;
    }
  }
  return offsets;
}

function loadLayout() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) {
      const p = JSON.parse(s);
      return {
        ...DEFAULT_LAYOUT, ...p,
        fields:      { ...DEFAULT_LAYOUT.fields,      ...p.fields },
        dateSpacing: { ...DEFAULT_LAYOUT.dateSpacing, ...p.dateSpacing },
      };
    }
  } catch(_) {}
  return DEFAULT_LAYOUT;
}

// ── Cheque Preview — matches actual Landbank cheque layout ────────────────
function ChequePreview({ details, layout, scale = 1 }) {
  const W = layout.chequeWidth  * 96 * scale;
  const H = layout.chequeHeight * 96 * scale;
  // `pt()` here is a cosmetic pixel unit for the pre-printed mockup
  // decoration only (labels, dividers, barcode, logo...) — none of that is
  // ever actually printed, so it's fine for these to just be "whatever looks
  // right on screen." `ptTrue()` is different: it's used for the values that
  // are ALSO sent to the print output as literal "Npt" CSS (font sizes for
  // typed-in data, and the date-box geometry) — those must convert real
  // points (1/72in) to CSS px (96dpi) or the preview and the physical
  // printout disagree on size, which is what was actually causing prints to
  // land in the wrong place even when the on-screen preview looked aligned.
  const pt = v => v * scale;
  const ptTrue = v => v * (96 / 72) * scale;
  const f = layout.fields;
  const dateOffsetsPt = computeDateOffsets(layout.dateSpacing);

  const gray   = '#aaa';
  const lgray  = '#ccc';
  const MATRIX = "'Courier New', Courier, monospace"; // dot-matrix printer look
  const pre    = (extra={}) => ({ color: gray, fontFamily:'Arial,sans-serif', ...extra });
  // All user-entered data uses the matrix font
  const data   = (extra={}) => ({ fontFamily: MATRIX, color: '#000', ...extra });

  const amtWords = details.amount ? amountToWords(details.amount) : '';
  const amtNum   = details.amount
    ? parseFloat(details.amount).toLocaleString('en-PH',{minimumFractionDigits:2})
    : '';

  return (
    <div style={{
      width:W, height:H, position:'relative', flexShrink:0,
      background:'#f7f6f2',
      border:`${pt(1)}px solid #999`,
      borderRadius: pt(3),
      fontFamily:'Arial,Helvetica,sans-serif',
      overflow:'hidden', boxSizing:'border-box', color:'#000',
    }}>

      {/* ── DOCUMENTARY STAMPS PAID — vertical strip on left ── */}
      <div style={{
        position:'absolute', left:0, top:0, bottom:`${pt(28)}px`,
        width:`${pt(14)}px`,
        background:'#ece9e0',
        borderRight:`${pt(0.5)}px solid ${lgray}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        <div style={{
          transform:'rotate(-90deg)', whiteSpace:'nowrap',
          fontSize:pt(6), color: gray, letterSpacing:pt(0.5),
        }}>DOCUMENTARY STAMPS PAID</div>
      </div>

      {/* ── Top section: Account info (upper left, after the vertical strip) ── */}
      {/* ACCOUNT No. label + value */}
      <div style={{ position:'absolute', top:`${pt(6)}px`, left:`${pt(20)}px` }}>
        <div style={pre({ fontSize:pt(6.5) })}>ACCOUNT No.</div>
        <div style={{ fontSize:pt(8), color: details.accountNo ? '#000' : lgray, fontWeight:details.accountNo?'400':'400' }}>
          {details.accountNo || '___-____-__'}
        </div>
      </div>

      {/* ACCOUNT NAME label + value */}
      <div style={{ position:'absolute', top:`${pt(6)}px`, left:`${W*0.17}px` }}>
        <div style={pre({ fontSize:pt(6.5) })}>ACCOUNT NAME</div>
        <div style={{ fontSize:pt(8), color: details.accountName ? '#000' : lgray }}>
          {details.accountName || 'BRGY NAME'}
        </div>
      </div>

      {/* Barcode placeholder (center top) */}
      <div style={{ position:'absolute', top:`${pt(4)}px`, left:'40%', right:'30%', textAlign:'center' }}>
        <div style={{ display:'flex', gap:pt(1.5), justifyContent:'center', height:pt(18) }}>
          {[...Array(20)].map((_,i)=>(
            <div key={i} style={{ width:pt(i%3===0?2:1), background:lgray, height:'100%' }}/>
          ))}
        </div>
        <div style={pre({ fontSize:pt(6.5), marginTop:pt(1) })}>674</div>
      </div>

      {/* CHECK No. label + value (top right) */}
      <div style={{ position:'absolute', top:`${pt(4)}px`, left:`${W*0.65}px` }}>
        <div style={pre({ fontSize:pt(6.5) })}>CHECK No.</div>
        <div style={{ fontSize:pt(9), fontWeight:'700', color: details.chequeNo?'#000':lgray, fontFamily:'monospace' }}>
          {details.chequeNo || '0000000000'}
        </div>
      </div>

      {/* BRSTN (far top right) */}
      <div style={{ position:'absolute', top:`${pt(4)}px`, right:`${pt(6)}px`, textAlign:'right' }}>
        <div style={pre({ fontSize:pt(6.5) })}>BRSTN</div>
        <div style={pre({ fontSize:pt(7.5), fontFamily:'monospace' })}>{details.brstn || '31035\n0071'}</div>
      </div>

      {/* Divider line 1 — below top info */}
      <div style={{ position:'absolute', top:'22%', left:`${pt(14)}px`, right:0,
        borderTop:`${pt(0.5)}px solid ${lgray}` }}/>

      {/* "Member: PDIC" */}
      <div style={{ position:'absolute', top:'23%', left:`${pt(20)}px`,
        ...pre({ fontSize:pt(7.5), fontStyle:'italic' }) }}>
        "Member: PDIC"
      </div>

      {/* DATE section — label, pre-printed decorative boxes, and the actual
          printed digits are ONE positioned unit (f.date.top/left). Boxes and
          digits share the exact same offset math inside it, so they are
          always pixel-locked to each other no matter how dateSpacing or
          f.date.top/left get tuned — previously these were two independent
          coordinate systems that had to be manually reconciled and easily
          drifted apart (digits floating above/beside their boxes). */}
      <div style={{ position:'absolute', top:`${f.date.top}%`, left:`${f.date.left}%` }}>
        <div style={pre({ fontSize:pt(7) })}>DATE</div>
        <div style={{ position:'relative', marginTop:pt(2), height:ptTrue(layout.dateSpacing.boxHeight) }}>
          {dateOffsetsPt.map((offsetPt, i) => (
            <div key={i} style={{
              position:'absolute', left:ptTrue(offsetPt), top:0,
              width:ptTrue(layout.dateSpacing.boxWidth), height:ptTrue(layout.dateSpacing.boxHeight),
              border:`${pt(0.5)}px solid ${lgray}`, background:'#fff',
            }}/>
          ))}
          {/* "/" separators, centered in the gap between MM|DD and DD|YYYY */}
          {[1, 3].map(afterIdx => {
            const gapCenterPt = dateOffsetsPt[afterIdx] + layout.dateSpacing.boxWidth
              + layout.dateSpacing.groupGap / 2;
            return (
              <div key={afterIdx} style={{
                position:'absolute', left:ptTrue(gapCenterPt), top:0,
                height:ptTrue(layout.dateSpacing.boxHeight),
                display:'flex', alignItems:'center', transform:'translateX(-50%)',
                ...pre({ fontSize:pt(8) }),
              }}>/</div>
            );
          })}
          {/* DATE digits — same offsets as the boxes above, so they always
              land exactly inside them */}
          {(() => {
            const parsed = parseDateForCheque(details.date);
            if (!parsed) return null;
            const { mm, dd, yyyy } = parsed;
            const digits = [mm[0], mm[1], dd[0], dd[1], yyyy[0], yyyy[1], yyyy[2], yyyy[3]];
            return digits.map((digit, i) => (
              <div key={i} style={{
                position:'absolute', left:ptTrue(dateOffsetsPt[i]), top:0,
                width:ptTrue(layout.dateSpacing.boxWidth), height:ptTrue(layout.dateSpacing.boxHeight),
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily: MATRIX_FONT,
                fontSize: ptTrue(f.date.fontSize),
                fontWeight: '700', color: '#000',
              }}>
                {digit}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── PAY TO THE ORDER OF section ── */}
      <div style={{ position:'absolute', top:'29%', left:`${pt(20)}px` }}>
        <div style={pre({ fontSize:pt(7.5) })}>PAY TO THE</div>
        <div style={pre({ fontSize:pt(7.5) })}>ORDER OF</div>
      </div>

      {/* Payee line — follows f.payee.top so it moves together with the
          text (same "locked together" pattern used for the date boxes),
          instead of drifting apart as an independently-fixed position. */}
      <div style={{
        position:'absolute', top:`${f.payee.top + 3}%`, left:`${W*0.16}px`, right:`${W*0.33}px`,
        borderBottom:`${pt(0.5)}px solid ${lgray}`,
      }}/>
      {/* Payee value */}
      <div style={{
        position:'absolute', top:`${f.payee.top}%`, left:`${f.payee.left}%`,
        fontSize:ptTrue(f.payee.fontSize), fontWeight:f.payee.bold?'700':'400',
        ...data({ whiteSpace:'nowrap' }),
      }}>
        {details.payee || <span style={{color:'#ddd',fontStyle:'italic',fontWeight:'400',fontFamily:'Arial'}}>Payee Name</span>}
      </div>

      {/* P label + Amount box — follows f.amountNum.top/left so the box
          moves together with the amount text instead of staying fixed
          while the text is tuned away from it. */}
      <div style={{ position:'absolute', top:`${f.amountNum.top - 5}%`, left:`${f.amountNum.left - 3}%` }}>
        <div style={pre({ fontSize:pt(8) })}>P</div>
        <div style={{
          border:`${pt(0.8)}px solid ${lgray}`, marginTop:pt(2),
          width:`${W*0.246}px`, // 5cm measured width
          height:`${H*0.07}px`, // was 0.15 — that plus the "P" label above it pushed
          background:'#fff',   // the box down into PESOS / Amount in words below
        }}/>
      </div>
      {/* Amount number value */}
      <div style={{
        position:'absolute', top:`${f.amountNum.top}%`, left:`${f.amountNum.left}%`,
        fontSize:ptTrue(f.amountNum.fontSize), fontWeight:f.amountNum.bold?'700':'400',
        ...data({ whiteSpace:'nowrap' }),
      }}>
        {amtNum || <span style={{color:'#ddd',fontStyle:'italic',fontWeight:'400',fontFamily:'Arial'}}>0.00</span>}
      </div>

      {/* ── PESOS section ── */}
      <div style={{ position:'absolute', top:'42%', left:`${pt(20)}px`, ...pre({ fontSize:pt(7.5) }) }}>
        PESOS
      </div>
      {/* Pesos line — follows f.amountWords.top, same reasoning as the payee line */}
      <div style={{
        position:'absolute', top:`${f.amountWords.top + 2}%`, left:`${W*0.08}px`, right:`${W*0.04}px`,
        borderBottom:`${pt(0.5)}px solid ${lgray}`,
      }}/>
      {/* Amount in words value */}
      <div style={{
        position:'absolute', top:`${f.amountWords.top}%`, left:`${f.amountWords.left}%`,
        fontSize:ptTrue(f.amountWords.fontSize), fontWeight:f.amountWords.bold?'700':'400',
        ...data({ maxWidth:'68%', wordBreak:'break-word', lineHeight:1.3 }),
      }}>
        {amtWords || <span style={{color:'#ddd',fontStyle:'italic',fontFamily:'Arial'}}>Amount in words</span>}
      </div>

      {/* Fine print (waiver text) */}
      <div style={{
        position:'absolute', top:'50%', left:`${W*0.35}px`, right:`${W*0.04}px`,
        ...pre({ fontSize:pt(5.5), lineHeight:1.3 }),
      }}>
        "I/We allow the electronic clearing of this check and hereby waive the presentation for payment of this original to LANDBANK."
      </div>

      {/* ── Memo line ── */}
      {(details.memo) && (
        <div style={{
          position:'absolute', top:`${f.memo.top}%`, left:`${f.memo.left}%`,
          fontSize:ptTrue(f.memo.fontSize), color:'#000', whiteSpace:'nowrap',
        }}>
          {details.memo}
        </div>
      )}

      {/* ── LANDBANK logo + branch info (lower left) ── */}
      <div style={{ position:'absolute', top:'57%', left:`${pt(20)}px` }}>
        <div style={{ display:'flex', alignItems:'center', gap:pt(4), marginBottom:pt(3) }}>
          {/* Landbank gear/leaf logo */}
          <div style={{
            width:pt(22), height:pt(22), borderRadius:'50%',
            border:`${pt(1.5)}px solid ${gray}`, display:'flex',
            alignItems:'center', justifyContent:'center', flexShrink:0,
            fontSize:pt(11),
          }}>🌿</div>
          <div style={{ fontWeight:'900', fontSize:pt(14), color:gray, letterSpacing:pt(0.5) }}>
            LANDBANK
          </div>
        </div>
        <div style={pre({ fontSize:pt(6.5), lineHeight:1.5 })}>
          {details.branchName || 'BRANCH NAME'}<br/>
          {details.branchAddress || 'Branch Address, National Highway'}
        </div>
      </div>

      {/* ── Two signature boxes (center-right of lower section) ──
          Measured off the physical cheque: each box 4.5cm wide × 1cm tall,
          0.5cm gap between them (=> 22.15% / 13.1% / 2.46% of an 8"×3" cheque). */}
      {/* Sig box 1 — follows f.signer1.top/left, same "moves with the data"
          pattern as the date boxes, so tuning the signatory position keeps
          the reference box lined up with it instead of leaving it behind. */}
      <div style={{
        position:'absolute', top:`${f.signer1.top - 18}%`, left:`${f.signer1.left}%`,
        width:`${W*0.2215}px`, height:`${H*0.131}px`,
        border:`${pt(0.5)}px solid ${lgray}`,
      }}/>
      {/* Sig 1 name (printed) */}
      <div style={{
        position:'absolute', top:`${f.signer1.top}%`, left:`${f.signer1.left}%`,
        fontSize:ptTrue(f.signer1.fontSize), fontWeight:'700',
        ...data({ minWidth:`${W*0.2215}px`, textAlign:'center' }),
      }}>
        {details.signer1Name || <span style={{color:lgray,fontWeight:'400',fontStyle:'italic',fontFamily:'Arial',fontSize:pt(7)}}>Signatory 1</span>}
        {details.signer1Title && <div style={{fontSize:pt(6.5),fontWeight:'400',color:'#444'}}>{details.signer1Title}</div>}
      </div>

      {/* Sig box 2 — follows f.signer2.top/left the same way */}
      <div style={{
        position:'absolute', top:`${f.signer2.top - 18}%`, left:`${f.signer2.left}%`,
        width:`${W*0.2215}px`, height:`${H*0.131}px`,
        border:`${pt(0.5)}px solid ${lgray}`,
      }}/>
      {/* Sig 2 name (printed) */}
      <div style={{
        position:'absolute', top:`${f.signer2.top}%`, left:`${f.signer2.left}%`,
        fontSize:ptTrue(f.signer2.fontSize), fontWeight:'700',
        ...data({ minWidth:`${W*0.2215}px`, textAlign:'center' }),
      }}>
        {details.signer2Name || <span style={{color:lgray,fontWeight:'400',fontStyle:'italic',fontFamily:'Arial',fontSize:pt(7)}}>Signatory 2</span>}
        {details.signer2Title && <div style={{fontSize:pt(6.5),fontWeight:'400',color:'#444'}}>{details.signer2Title}</div>}
      </div>

      {/* ── MICR strip ── */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        borderTop:`${pt(1)}px solid #999`,
        height:`${pt(22)}px`,
        background:'#fff',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:`0 ${pt(8)}px`,
        fontSize:pt(9), fontFamily:'"MICR",monospace', color:'#000', letterSpacing:pt(2),
      }}>
        <span>⑆{details.chequeNo||'0000654351'}⑆&nbsp;{details.brstn||'31035'}⑆⑆{details.brstn?.split(' ')[1]||'0071'}⑆⑆</span>
        <span>⑈{details.accountNo||'002482100131'}⑈</span>
        <span>000</span>
      </div>
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────
function FieldRow({ fieldKey, field, onChange }) {
  const spin = (key, delta) => {
    const next = Math.round((field[key]+delta)*10)/10;
    onChange(fieldKey, key, Math.max(0, Math.min(key==='fontSize'?24:98, next)));
  };
  return (
    <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{field.label}</p>
      <div className="grid grid-cols-3 gap-2">
        {[{key:'top',label:'Top %',step:0.5},{key:'left',label:'Left %',step:0.5},{key:'fontSize',label:'Font px',step:0.5}].map(({key,label,step})=>(
          <div key={key}>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1">{label}</p>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={()=>spin(key,-step)}
                className="w-6 h-6 rounded bg-gray-200 dark:bg-[#1a1d27] hover:bg-gray-300 flex items-center justify-center text-gray-600 dark:text-slate-300">
                <Minus size={9}/>
              </button>
              <input type="number" value={field[key]} step={step}
                onChange={e=>onChange(fieldKey,key,parseFloat(e.target.value)||0)}
                className="w-14 text-center text-xs border border-gray-200 dark:border-[#2e334a] rounded py-0.5 bg-white dark:bg-[#1a1d27] text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
              <button type="button" onClick={()=>spin(key,step)}
                className="w-6 h-6 rounded bg-gray-200 dark:bg-[#1a1d27] hover:bg-gray-300 flex items-center justify-center text-gray-600 dark:text-slate-300">
                <Plus size={9}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!field.bold} onChange={e=>onChange(fieldKey,'bold',e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-indigo-600"/>
        <span className="text-[10px] text-gray-500 dark:text-slate-400">Bold</span>
      </label>
    </div>
  );
}

// ── Autocomplete Input ────────────────────────────────────────────────────
function AutocompleteInput({ value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = suggestions.filter(s =>
    s.name.toLowerCase().includes(value.toLowerCase()) && value.length > 0
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value, null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e2233] border border-gray-200 dark:border-[#2e334a] rounded-xl shadow-xl overflow-hidden">
          {filtered.map((s, i) => (
            <button key={i} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s.name, s); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-between gap-4">
              <span className="font-semibold text-sm text-gray-800 dark:text-slate-100">{s.name}</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 flex-shrink-0">{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function ChequePrint() {
  const { toast }    = useToast();
  const location     = useLocation();
  const [activeTab, setActiveTab] = useState('details');
  const [layout, setLayout] = useState(loadLayout);
  const [history,       setHistory]       = useState(loadHistory);
  const [historySearch, setHistorySearch] = useState('');
  // Each tab needs its own ref + scale so switching tabs recomputes correctly
  const previewRef = useRef(null);
  const layoutRef  = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [layoutScale,  setLayoutScale]  = useState(1);

  // ResizeObserver fires when the element first appears (tab switch) AND on resize
  function useContainerScale(ref, setScaleFn) {
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const compute = () =>
        setScaleFn(Math.min(1, (el.offsetWidth - 48) / (layout.chequeWidth * 96)));
      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      return () => ro.disconnect();
    });
  }
  useContainerScale(previewRef, setPreviewScale);
  useContainerScale(layoutRef,  setLayoutScale);

  const [details, setDetails] = useState({
    payee:        '',
    date:         new Date().toISOString().split('T')[0], // YYYY-MM-DD for input type=date
    amount:       '',
    signer1Name:  '',
    signer1Title: '',
    signer2Name:  '',
    signer2Title: '',
  });
  const [suggestions, setSuggestions] = useState([]); // [{name, title}]

  const setD = (k, v) => setDetails(p => ({ ...p, [k]: v }));

  // Pre-populate from navigation state (e.g. from Disbursement Voucher page)
  useEffect(() => {
    const s = location.state;
    if (!s) return;
    setDetails(p => ({
      ...p,
      payee:  s.payee  || p.payee,
      amount: s.amount ? String(s.amount) : p.amount,
      date:   s.date   ? s.date.slice(0,10) : p.date,
    }));
    // Clear the navigation state so refreshing doesn't re-apply
    window.history.replaceState({}, '');
  }, []);

  // Load signatories from settings for autocomplete suggestions
  useEffect(() => {
    apiClient.get('/settings').then(res => {
      const s = res.data || {};
      const list = [];
      const captainName   = s.signatory_name || s.captain || '';
      const treasurerName = s.treasurer_name || '';
      if (captainName)   list.push({ name: captainName.toUpperCase(),   title: s.signatory_title  || 'Punong Barangay'   });
      if (treasurerName) list.push({ name: treasurerName.toUpperCase(), title: s.treasurer_title  || 'Barangay Treasurer' });
      setSuggestions(list);
    }).catch(()=>{});
  }, []);


  function saveLayout()  { localStorage.setItem(LS_KEY,JSON.stringify(layout)); toast('Layout saved!','success'); }
  function resetLayout() { setLayout(DEFAULT_LAYOUT); localStorage.removeItem(LS_KEY); toast('Layout reset','success'); }
  function updateField(fk,prop,val) {
    setLayout(p=>({...p,fields:{...p.fields,[fk]:{...p.fields[fk],[prop]:val}}}));
  }
  function updateDateSpacing(prop,val) {
    setLayout(p=>({...p,dateSpacing:{...p.dateSpacing,[prop]:val}}));
  }

  const isReady = () => details.payee.trim() && details.amount && parseFloat(details.amount)>0;

  // PRINT — uses absolute INCH positions so output is physically accurate regardless of browser/scale
  function handlePrint() {
    if (!isReady()) { toast('Fill in Payee and Amount first.', 'warning'); return; }
    const W = layout.chequeWidth;   // inches
    const H = layout.chequeHeight;  // inches
    const f = layout.fields;
    const amtWords = amountToWords(details.amount);
    const amtNum   = parseFloat(details.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });

    // Convert layout % fields to absolute inches for precise print output
    const toIn = (pct, total) => ((pct / 100) * total).toFixed(5);
    const MF   = "'Courier New',Courier,monospace";

    // Generates an absolutely-positioned style string in INCHES
    const posIn = (field, extra = '') =>
      `position:absolute;top:${toIn(field.top,H)}in;left:${toIn(field.left,W)}in;` +
      `font-size:${field.fontSize}pt;font-weight:${field.bold?'700':'400'};font-family:${MF};${extra}`;

    // Date digits — each placed in its exact box using inch offsets, driven
    // by the same tunable dateSpacing (boxWidth/digitGap/groupGap) the
    // Layout Editor and preview use, instead of a hardcoded offset table.
    const dateHtml = (() => {
      const parsed = parseDateForCheque(details.date);
      if (!parsed) return '';
      const { mm, dd, yyyy } = parsed;
      const digits    = [mm[0], mm[1], dd[0], dd[1], yyyy[0], yyyy[1], yyyy[2], yyyy[3]];
      const offsetsPt = computeDateOffsets(layout.dateSpacing); // pt from first box
      const baseLeft  = (f.date.left / 100) * W;          // inches
      const topIn     = toIn(f.date.top, H);
      const boxWIn    = (layout.dateSpacing.boxWidth / 72).toFixed(5); // pt -> inches
      return digits.map((d, i) => {
        const leftIn = (baseLeft + offsetsPt[i] / 72).toFixed(5);
        return `<div style="position:absolute;top:${topIn}in;left:${leftIn}in;` +
               `width:${boxWIn}in;font-size:${f.date.fontSize}pt;font-weight:700;` +
               `font-family:${MF};text-align:center;">${d}</div>`;
      }).join('');
    })();

    appendHistory({
      payee:       details.payee,
      amount:      details.amount,
      date:        details.date,
      signer1Name: details.signer1Name,
      signer2Name: details.signer2Name,
    });
    setHistory(loadHistory());

    const win = window.open('', '_blank', 'width=900,height=500');
    win.document.write(`<!DOCTYPE html><html><head><title>Cheque Print</title>
    <style>
      @page { size:${W}in ${H}in; margin:0; }
      *  { box-sizing:border-box; margin:0; padding:0; }
      html, body {
        width:${W}in; height:${H}in;
        overflow:hidden;
        font-family:${MF};
        color:#000;
        background:transparent;
      }
      .chq { position:relative; width:${W}in; height:${H}in; }
      @media print { .no-print { display:none !important; } }
    </style></head><body>
    <div class="chq">

      ${dateHtml}

      <div style="${posIn(f.payee,'white-space:nowrap;')}">${details.payee}</div>

      <div style="${posIn(f.amountNum,'text-align:right;min-width:${(W*0.22).toFixed(3)}in;white-space:nowrap;')}">${amtNum}</div>

      <div style="${posIn(f.amountWords,`max-width:${(W*0.68).toFixed(3)}in;white-space:normal;word-break:break-word;line-height:1.4;`)}">${amtWords}</div>

      ${details.signer1Name ? `
      <div style="${posIn(f.signer1,`text-align:center;min-width:${(W*0.18).toFixed(3)}in;`)}">
        ${details.signer1Name}
        ${details.signer1Title ? `<br><span style="font-size:6.5pt;font-weight:400;font-family:${MF};">${details.signer1Title}</span>` : ''}
      </div>` : ''}

      ${details.signer2Name ? `
      <div style="${posIn(f.signer2,`text-align:center;min-width:${(W*0.18).toFixed(3)}in;`)}">
        ${details.signer2Name}
        ${details.signer2Title ? `<br><span style="font-size:6.5pt;font-weight:400;font-family:${MF};">${details.signer2Title}</span>` : ''}
      </div>` : ''}

    </div>

    <!-- Screen-only toolbar -->
    <div class="no-print" style="
      position:fixed;bottom:0;left:0;right:0;
      background:#1a5c1a;color:#fff;
      padding:10px 20px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      font-family:Arial,sans-serif;font-size:13px;">
      <div>
        <p style="margin:0;font-weight:bold;">⚠️ Before printing:</p>
        <p style="margin:0;font-size:11px;opacity:0.85;">
          Set Margins = None · Scale = 100% · Uncheck Headers &amp; Footers · Paper = ${W}" × ${H}"
        </p>
      </div>
      <button onclick="window.print()" style="
        padding:10px 28px;background:#fff;color:#1a5c1a;
        border:none;border-radius:8px;cursor:pointer;
        font-size:14px;font-weight:bold;white-space:nowrap;">
        🖨 Print on Cheque
      </button>
    </div>
    </body></html>`);
    win.document.close();
  }

  const TABS = [
    { id:'details', label:'Cheque Details', icon:FileText },
    { id:'preview', label:'Preview',        icon:Eye },
    { id:'layout',  label:'Layout Editor',  icon:Settings2 },
    { id:'history', label:`History${history.length ? ` (${history.length})` : ''}`, icon:Clock },
  ];

  const historyFiltered = historySearch.trim()
    ? history.filter(h => {
        const q = historySearch.toLowerCase();
        return (h.payee || '').toLowerCase().includes(q)
          || String(h.amount || '').includes(q)
          || (h.signer1Name || '').toLowerCase().includes(q)
          || (h.signer2Name || '').toLowerCase().includes(q);
      })
    : history;

  function deleteHistoryEntry(id) {
    const next = history.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  }

  function clearHistory() {
    if (!confirm('Clear all print history?')) return;
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  function reprintFromHistory(h) {
    setDetails(p => ({
      ...p,
      payee:       h.payee || '',
      amount:      h.amount || '',
      date:        h.date || new Date().toISOString().slice(0,10),
      signer1Name: h.signer1Name || '',
      signer2Name: h.signer2Name || '',
    }));
    setActiveTab('details');
    toast('Form filled from history', 'success');
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Printer size={22} className="text-indigo-600"/> Cheque Printing
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Only data fields are printed onto the pre-printed Landbank cheque.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetLayout} className="btn-secondary flex items-center gap-1.5 text-sm"><RotateCcw size={14}/> Reset Layout</button>
          <button onClick={saveLayout}  className="btn-secondary flex items-center gap-1.5 text-sm"><Save size={14}/> Save Layout</button>
          <button onClick={handlePrint} disabled={!isReady()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Printer size={15}/> Print Cheque
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-[#2e334a] gap-1">
        {TABS.map(t=>{ const Icon=t.icon; return (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition
              ${activeTab===t.id?'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                :'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            <Icon size={14}/>{t.label}
          </button>
        );})}
      </div>

      {/* ── DETAILS ─────────────────────────────────────────────────── */}
      {activeTab==='details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Payment — left column */}
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm uppercase tracking-wide">Payment Details</h3>

            <div>
              <label className="label">Pay to the Order of *</label>
              <input className="input font-semibold" value={details.payee}
                onChange={e=>setD('payee',e.target.value)} placeholder="Full name of payee"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={details.date}
                  onChange={e=>setD('date',e.target.value)}/>
                {details.date && (() => {
                  const p = parseDateForCheque(details.date);
                  return p ? <p className="text-xs text-gray-400 mt-1">{p.mm}/{p.dd}/{p.yyyy}</p> : null;
                })()}
              </div>
              <div>
                <label className="label">Amount (₱) *</label>
                <input type="number" min="0" step="0.01" className="input" value={details.amount}
                  onChange={e=>setD('amount',e.target.value)} placeholder="0.00"/>
              </div>
            </div>

            {details.amount && parseFloat(details.amount)>0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Amount in Words (auto)</p>
                <p className="text-sm font-semibold text-green-900 dark:text-green-200">{amountToWords(details.amount)}</p>
              </div>
            )}

            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
              isReady() ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isReady()?'bg-emerald-500':'bg-amber-400'}`}/>
              {isReady() ? 'Ready to print' : 'Payee and Amount are required'}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">ℹ️ How it prints</p>
              <p>Only the data you enter here is printed onto the cheque. Account No., Check No., BRSTN, branch name, and all labels are already pre-printed on your Landbank cheque paper.</p>
            </div>
          </div>

          {/* Signatories — right column */}
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm uppercase tracking-wide">Signatories</h3>

            {suggestions.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                <User size={11}/> Start typing to see suggestions from your barangay officials
              </p>
            )}

            <div>
              <label className="label">Signatory 1 — Name</label>
              <AutocompleteInput
                className="input font-semibold"
                value={details.signer1Name}
                suggestions={suggestions}
                placeholder="e.g. Juan Dela Cruz"
                onChange={(name, s) => {
                  setD('signer1Name', name);
                  if (s) setD('signer1Title', s.title);
                }}
              />
            </div>
            <div>
              <label className="label">Signatory 1 — Title</label>
              <input className="input" value={details.signer1Title}
                onChange={e=>setD('signer1Title',e.target.value)} placeholder="e.g. Barangay Treasurer"/>
            </div>

            <div className="border-t border-gray-100 dark:border-[#2e334a] pt-4">
              <label className="label">Signatory 2 — Name</label>
              <AutocompleteInput
                className="input font-semibold"
                value={details.signer2Name}
                suggestions={suggestions}
                placeholder="e.g. Juan Dela Cruz"
                onChange={(name, s) => {
                  setD('signer2Name', name);
                  if (s) setD('signer2Title', s.title);
                }}
              />
            </div>
            <div>
              <label className="label">Signatory 2 — Title</label>
              <input className="input" value={details.signer2Title}
                onChange={e=>setD('signer2Title',e.target.value)} placeholder="e.g. Punong Barangay"/>
            </div>

            {(details.signer1Name || details.signer2Name) && (
              <button type="button" onClick={()=>{setD('signer1Name','');setD('signer1Title','');setD('signer2Name','');setD('signer2Title','');}}
                className="text-xs text-rose-500 hover:text-rose-700 transition">
                Clear signatories
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────── */}
      {activeTab==='preview' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-800 dark:text-green-300">
            <Info size={15} className="flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-semibold">Preview Guide</p>
              <p className="text-xs mt-0.5"><span style={{color:'#aaa'}}>Gray</span> = pre-printed on your physical Landbank cheque (not printed by this system). <strong>Black</strong> = what gets printed onto the cheque.</p>
            </div>
          </div>
          <div ref={previewRef} className="bg-gray-300 dark:bg-[#1a1d27] rounded-2xl p-6 overflow-x-auto">
            <div style={{display:'inline-block'}}>
              <ChequePreview details={details} layout={layout} scale={previewScale}/>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-gray-800 dark:text-slate-100 mb-3">Cheque Paper Dimensions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Width (inches)</label>
                <input type="number" min="4" max="12" step="0.25" className="input" value={layout.chequeWidth}
                  onChange={e=>setLayout(p=>({...p,chequeWidth:parseFloat(e.target.value)||8.5}))}/>
              </div>
              <div>
                <label className="label">Height (inches)</label>
                <input type="number" min="2" max="6" step="0.25" className="input" value={layout.chequeHeight}
                  onChange={e=>setLayout(p=>({...p,chequeHeight:parseFloat(e.target.value)||3.5}))}/>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 w-full">
                  <p className="font-semibold text-gray-700 dark:text-slate-300 mb-1">Landbank Government Cheque</p>
                  <p>Standard size: 8" × 3" (measured off the physical Landbank cheque)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────── */}
      {activeTab==='history' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"/>
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search by payee, amount…"
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12}/>
                </button>
              )}
            </div>
            <p className="text-sm text-gray-400 dark:text-slate-500 ml-1">
              {historyFiltered.length} of {history.length} records
            </p>
            {history.length > 0 && (
              <button onClick={clearHistory}
                className="ml-auto text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1.5 transition">
                <Trash2 size={12}/> Clear all
              </button>
            )}
          </div>

          {/* List */}
          {history.length === 0 ? (
            <div className="card p-10 text-center">
              <Clock size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-600"/>
              <p className="text-sm text-gray-400 dark:text-slate-500">No cheques printed yet. History appears here after each print.</p>
            </div>
          ) : historyFiltered.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">No results for "{historySearch}"</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
                    {['Printed At','Payee','Amount','Signatories','Actions'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
                  {historyFiltered.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                      <td className="table-td text-gray-400 dark:text-slate-500 whitespace-nowrap text-xs">
                        <p>{new Date(h.printedAt).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })}</p>
                        <p className="text-[10px] mt-0.5">{new Date(h.printedAt).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</p>
                      </td>
                      <td className="table-td font-semibold text-gray-900 dark:text-slate-100">
                        {h.payee}
                        {h.date && <p className="text-[10px] text-gray-400 mt-0.5">Date: {new Date(h.date).toLocaleDateString('en-PH')}</p>}
                      </td>
                      <td className="table-td font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₱{parseFloat(h.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-td text-xs text-gray-500 dark:text-slate-400">
                        {h.signer1Name && <p>{h.signer1Name}</p>}
                        {h.signer2Name && <p>{h.signer2Name}</p>}
                        {!h.signer1Name && !h.signer2Name && <span className="text-gray-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button onClick={() => reprintFromHistory(h)} className="act-btn act-indigo"><Printer size={12}/> Reprint</button>
                          <button onClick={() => deleteHistoryEntry(h.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LAYOUT EDITOR ───────────────────────────────────────────── */}
      {activeTab==='layout' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <Info size={15} className="flex-shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold">Fine-tune alignment</p>
                <p className="text-xs mt-0.5">Print a test page on plain paper, lay it over the blank cheque, hold up to light. Adjust by 0.5% at a time. Save when aligned. Moving Payee, Amount, or a Signatory also moves its printed line/box in the preview, so they stay lined up with each other.</p>
              </div>
            </div>
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-slate-100">Date Digit Spacing</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 -mt-1">
                Controls the gap between the M M / D D / Y Y Y Y boxes — the part that's normally hardest to line up. All values in points (1pt = 1/72 in).
              </p>
              <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key:'boxWidth',  label:'Box Width'  },
                  { key:'digitGap',  label:'Digit Gap'  },
                  { key:'groupGap',  label:'Group Gap ( / )' },
                  { key:'boxHeight', label:'Box Height' },
                ].map(({key,label}) => (
                  <div key={key}>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1">{label}</p>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={()=>updateDateSpacing(key, Math.max(0, Math.round((layout.dateSpacing[key]-0.5)*10)/10))}
                        className="w-6 h-6 rounded bg-gray-200 dark:bg-[#1a1d27] hover:bg-gray-300 flex items-center justify-center text-gray-600 dark:text-slate-300">
                        <Minus size={9}/>
                      </button>
                      <input type="number" value={layout.dateSpacing[key]} step={0.5}
                        onChange={e=>updateDateSpacing(key, parseFloat(e.target.value)||0)}
                        className="w-14 text-center text-xs border border-gray-200 dark:border-[#2e334a] rounded py-0.5 bg-white dark:bg-[#1a1d27] text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
                      <button type="button" onClick={()=>updateDateSpacing(key, Math.round((layout.dateSpacing[key]+0.5)*10)/10)}
                        className="w-6 h-6 rounded bg-gray-200 dark:bg-[#1a1d27] hover:bg-gray-300 flex items-center justify-center text-gray-600 dark:text-slate-300">
                        <Plus size={9}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-slate-100">Field Positions</h3>
              <div className="overflow-y-auto space-y-3 pr-1" style={{maxHeight:'calc(100vh - 340px)',minHeight:200}}>
                {Object.entries(layout.fields).map(([key,field])=>(
                  <FieldRow key={key} fieldKey={key} field={field} onChange={updateField}/>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveLayout} className="btn-primary flex items-center gap-2 flex-1 justify-center"><Save size={14}/> Save Layout</button>
              <button onClick={resetLayout} className="btn-secondary flex items-center gap-2"><RotateCcw size={14}/> Reset</button>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Eye size={12}/> Live Preview
            </p>
            <div ref={layoutRef} className="overflow-x-auto bg-gray-300 dark:bg-[#1a1d27] rounded-xl p-3">
              <div style={{display:'inline-block'}}>
                <ChequePreview details={details} layout={layout} scale={layoutScale}/>
              </div>
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 space-y-1 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
              <p>• <strong>Top %</strong>: higher = lower on cheque</p>
              <p>• <strong>Left %</strong>: higher = further right</p>
              <p>• Adjust 0.5% at a time for precise alignment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

