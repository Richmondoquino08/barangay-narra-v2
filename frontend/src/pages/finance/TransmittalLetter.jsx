import React, { useState, useEffect, useCallback } from 'react';
import { transmittalAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { Mail, Plus, Printer, Trash2, X } from 'lucide-react';
import { BRGY, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY_DOC = { type:'', ref_no:'', description:'' };
const EMPTY = { letter_date:'', addressee:'', office_address:'', subject:'', prepared_by:'', documents:[{...EMPTY_DOC}] };

export default function TransmittalLetter() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await transmittalAPI.getAll()).data.letters || []); }
    catch { toast('Failed to load transmittal letters', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));
  const setDoc = (i,k,v) => setForm(p => { const documents = [...p.documents]; documents[i] = { ...documents[i], [k]: v }; return { ...p, documents }; });
  const addDoc = () => setForm(p => ({ ...p, documents: [...p.documents, {...EMPTY_DOC}] }));
  const rmDoc = (i) => setForm(p => ({ ...p, documents: p.documents.filter((_,idx)=>idx!==i) }));

  function openNew() { setForm({ ...EMPTY, letter_date: new Date().toISOString().slice(0,10) }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.addressee || !form.subject) { toast('Addressee and subject required', 'warning'); return; }
    setSaving(true);
    try { await transmittalAPI.create(form); toast('Transmittal letter saved', 'success'); setModal(false); load(); }
    catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this transmittal letter?')) return;
    try { await transmittalAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    const docs = JSON.parse(r.documents || '[]');
    printDoc('Transmittal Letter', `
      ${govHeader('TRANSMITTAL LETTER')}
      <p style="margin-top:10px;">${fmtDate(r.letter_date)}</p>
      <p style="margin-top:14px;"><b>${r.addressee}</b><br/>${(r.office_address||'').replace(/\n/g,'<br/>')}</p>
      <p style="margin-top:14px;">Subject: <b>${r.subject}</b></p>
      <p style="margin-top:14px;">Madam/Sir,</p>
      <p>Please find attached/enclosed the following document(s) for your reference and appropriate action:</p>
      <table>
        <tr><th>Type</th><th>Reference No.</th><th>Description</th></tr>
        ${docs.map(d=>`<tr><td>${d.type}</td><td>${d.ref_no}</td><td>${d.description}</td></tr>`).join('')}
      </table>
      <p style="margin-top:14px;">Thank you.</p>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${r.prepared_by||BRGY.treasurer}</div><div class="sig-title">Prepared by</div></div>
      </div>
      <p class="meta">Ref: ${r.ref_no||'—'}</p>
    `);
  }

  const inp = "w-full border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1";

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Mail size={22} className="text-indigo-600"/> Transmittal Letter
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Cover letter for forwarding documents/reports to other offices</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Transmittal</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Addressee','Subject','Prepared By','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={6} className="py-14 text-center text-gray-400">No transmittal letters</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.letter_date)}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.addressee}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{r.subject}</td>
                  <td className="table-td text-gray-400 text-xs">{r.prepared_by}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="New Transmittal Letter" size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.letter_date} onChange={e=>set('letter_date',e.target.value)}/></div>
            <div><label className={lbl}>Prepared By</label><input className={inp} value={form.prepared_by} onChange={e=>set('prepared_by',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Addressee *</label><input className={inp} value={form.addressee} onChange={e=>set('addressee',e.target.value)}/></div>
          <div><label className={lbl}>Office Address</label><textarea className={inp} rows={2} value={form.office_address} onChange={e=>set('office_address',e.target.value)}/></div>
          <div><label className={lbl}>Subject *</label><input className={inp} value={form.subject} onChange={e=>set('subject',e.target.value)}/></div>

          <div className="border-t border-gray-100 dark:border-[#2e334a] pt-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Documents Attached</p>
              <button type="button" onClick={addDoc} className="btn-secondary text-xs flex items-center gap-1"><Plus size={12}/> Add Document</button>
            </div>
            <div className="space-y-2">
              {form.documents.map((d,i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inp} col-span-3`} placeholder="Type (e.g. DV)" value={d.type} onChange={e=>setDoc(i,'type',e.target.value)}/>
                  <input className={`${inp} col-span-3`} placeholder="Reference No." value={d.ref_no} onChange={e=>setDoc(i,'ref_no',e.target.value)}/>
                  <input className={`${inp} col-span-5`} placeholder="Description" value={d.description} onChange={e=>setDoc(i,'description',e.target.value)}/>
                  <button type="button" onClick={()=>rmDoc(i)} className="col-span-1 icon-btn" style={{color:'#ef4444'}}><X size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Transmittal'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

