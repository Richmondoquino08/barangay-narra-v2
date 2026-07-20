import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { financeFormsAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { Car, Plus, Printer, Pencil, Trash2 } from 'lucide-react';
import { BRGY, fmtDate, printDoc, govHeader } from './financeHelpers';

const EMPTY = {
  trip_date:'', driver_name:'', plate_no:'', places_visited:'', purpose:'',
  time_departure:'', time_arrival:'', distance_km:'',
  gas_balance_start:'', gas_purchased:'', gas_consumed:'',
  gear_oil:'', lubricating_oil:'', grease_oil:'', speedometer:'', remarks:'',
};

export default function TripTicket() {
  const { toast } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoad]= useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [editId, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fDriver, setFD]  = useState('');
  const [fPlate, setFP]   = useState('');
  const [fDate, setFDate] = useState('');

  const load = useCallback(async () => {
    setLoad(true);
    try { setRows((await financeFormsAPI.tripGetAll()).data.tickets || []); }
    catch { toast('Failed to load trip tickets', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  // auto-computed gasoline
  const gasTotal = (Number(form.gas_balance_start)||0) + (Number(form.gas_purchased)||0);
  const gasEnd   = gasTotal - (Number(form.gas_consumed)||0);

  const filtered = useMemo(() => rows.filter(r => {
    if (fDriver && !r.driver_name?.toLowerCase().includes(fDriver.toLowerCase())) return false;
    if (fPlate && !r.plate_no?.toLowerCase().includes(fPlate.toLowerCase())) return false;
    if (fDate && (!r.trip_date || r.trip_date.slice(0,10) !== fDate)) return false;
    return true;
  }), [rows, fDriver, fPlate, fDate]);

  function openNew()  { setForm({ ...EMPTY, trip_date: new Date().toISOString().slice(0,10) }); setEdit(null); setModal(true); }
  function openEdit(r){ setForm({ ...r, trip_date: r.trip_date?.slice(0,10)||'' }); setEdit(r.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.driver_name) { toast('Driver name required', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) { await financeFormsAPI.tripUpdate(editId, form); toast('Trip ticket updated', 'success'); }
      else        { await financeFormsAPI.tripCreate(form);         toast('Trip ticket saved', 'success'); }
      setModal(false); load();
    } catch (err) { toast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this trip ticket?')) return;
    try { await financeFormsAPI.tripDelete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  function print(r) {
    printDoc('Driver Trip Ticket', `
      ${govHeader("DRIVER'S TRIP TICKET")}
      <table>
        <tr><th colspan="2" style="text-align:left;">A. To be filled by the Administration Official</th></tr>
        <tr><td style="width:38%;"><b>Date</b></td><td>${fmtDate(r.trip_date)}</td></tr>
        <tr><td><b>Name of Driver</b></td><td>${r.driver_name||''}</td></tr>
        <tr><td><b>Government Car Plate No.</b></td><td>${r.plate_no||''}</td></tr>
        <tr><td><b>Place(s) to be visited / inspected</b></td><td>${r.places_visited||''}</td></tr>
        <tr><td><b>Purpose of trip</b></td><td>${r.purpose||''}</td></tr>
      </table>
      <table>
        <tr><th colspan="2" style="text-align:left;">B. To be filled by the Driver</th></tr>
        <tr><td style="width:38%;"><b>Time Departure</b></td><td>${r.time_departure||''}</td></tr>
        <tr><td><b>Time of Arrival</b></td><td>${r.time_arrival||''}</td></tr>
        <tr><td><b>Approx. Distance Travelled</b></td><td>${r.distance_km||0} km</td></tr>
        <tr><td><b>Gasoline — Balance in tank (start)</b></td><td>${r.gas_balance_start||0} L</td></tr>
        <tr><td><b>Add: Purchased during trip</b></td><td>${r.gas_purchased||0} L</td></tr>
        <tr><td><b>Total</b></td><td>${r.gas_total||0} L</td></tr>
        <tr><td><b>Deduct: Consumed during trip</b></td><td>${r.gas_consumed||0} L</td></tr>
        <tr><td><b>Balance in tank (end of trip)</b></td><td>${r.gas_balance_end||0} L</td></tr>
        <tr><td><b>Gear oil issued</b></td><td>${r.gear_oil||''}</td></tr>
        <tr><td><b>Lubricating oil issued</b></td><td>${r.lubricating_oil||''}</td></tr>
        <tr><td><b>Grease oil issued</b></td><td>${r.grease_oil||''}</td></tr>
        <tr><td><b>Speedometer reading (beginning)</b></td><td>${r.speedometer||0} km</td></tr>
        <tr><td><b>Remarks</b></td><td>${r.remarks||''}</td></tr>
      </table>
      <div style="display:flex;gap:30px;margin-top:30px;">
        <div style="flex:1;">
          <p style="font-size:11.5px;font-style:italic;">I HEREBY CERTIFY to the correctness of the above statement as a record of the travel.</p>
          <div class="sig-block" style="margin-top:34px;"><div><div class="sig-name" style="min-width:200px;">${r.driver_name||''}</div><div class="sig-title">Driver</div></div></div>
        </div>
        <div style="flex:1;">
          <p style="font-size:11.5px;font-style:italic;">I HEREBY CERTIFY that I issued this car/jeep on official business as stated above.</p>
          <div class="sig-block" style="margin-top:34px;"><div><div class="sig-name" style="min-width:220px;">${BRGY.captain}</div><div class="sig-title">Barangay Captain</div></div></div>
        </div>
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
            <Car size={22} className="text-indigo-600"/> Driver's Trip Ticket
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{rows.length} trip records</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5"><Plus size={15}/> New Trip Ticket</button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className={lbl}>Driver</label><input className={inp} value={fDriver} onChange={e=>setFD(e.target.value)} placeholder="name…"/></div>
        <div><label className={lbl}>Plate No.</label><input className={inp} value={fPlate} onChange={e=>setFP(e.target.value)} placeholder="plate…"/></div>
        <div><label className={lbl}>Date</label><input type="date" className={inp} value={fDate} onChange={e=>setFDate(e.target.value)}/></div>
        <button onClick={()=>{setFD('');setFP('');setFDate('');}} className="btn-secondary text-sm">Clear</button>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} shown</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Ref','Date','Driver','Plate','Destination','Distance','Gas End','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No trip tickets</td></tr>
              : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.ref_no}</td>
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.trip_date)}</td>
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">{r.driver_name}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.plate_no}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{r.places_visited}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.distance_km} km</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.gas_balance_end} L</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>print(r)} className="act-btn act-gray"><Printer size={12}/> Print</button>
                      <button onClick={()=>openEdit(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={()=>del(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Trip Ticket':'New Trip Ticket'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Section A — Administration Official</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.trip_date} onChange={e=>set('trip_date',e.target.value)}/></div>
            <div><label className={lbl}>Name of Driver *</label><input className={inp} value={form.driver_name} onChange={e=>set('driver_name',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Government Car Plate No.</label><input className={inp} value={form.plate_no} onChange={e=>set('plate_no',e.target.value)}/></div>
          <div><label className={lbl}>Place(s) to be visited / inspected</label><input className={inp} value={form.places_visited} onChange={e=>set('places_visited',e.target.value)}/></div>
          <div><label className={lbl}>Purpose of trip</label><textarea className={inp} rows={2} value={form.purpose} onChange={e=>set('purpose',e.target.value)}/></div>

          <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 pt-2 border-t border-gray-100 dark:border-[#2e334a]">Section B — Driver</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Time Departure</label><input className={inp} value={form.time_departure} onChange={e=>set('time_departure',e.target.value)} placeholder="8:00 AM"/></div>
            <div><label className={lbl}>Time Arrival</label><input className={inp} value={form.time_arrival} onChange={e=>set('time_arrival',e.target.value)} placeholder="5:00 PM"/></div>
            <div><label className={lbl}>Distance (km)</label><input type="number" step="0.01" className={inp} value={form.distance_km} onChange={e=>set('distance_km',e.target.value)}/></div>
          </div>
          <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3 grid grid-cols-3 gap-3">
            <div><label className={lbl}>Gas Balance (start) L</label><input type="number" step="0.01" className={inp} value={form.gas_balance_start} onChange={e=>set('gas_balance_start',e.target.value)}/></div>
            <div><label className={lbl}>+ Purchased L</label><input type="number" step="0.01" className={inp} value={form.gas_purchased} onChange={e=>set('gas_purchased',e.target.value)}/></div>
            <div><label className={lbl}>Total L (auto)</label><input className={inp} value={gasTotal.toFixed(2)} disabled/></div>
            <div><label className={lbl}>− Consumed L</label><input type="number" step="0.01" className={inp} value={form.gas_consumed} onChange={e=>set('gas_consumed',e.target.value)}/></div>
            <div><label className={lbl}>Balance End L (auto)</label><input className={inp} value={gasEnd.toFixed(2)} disabled/></div>
            <div><label className={lbl}>Speedometer (km)</label><input type="number" step="0.01" className={inp} value={form.speedometer} onChange={e=>set('speedometer',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Gear Oil</label><input className={inp} value={form.gear_oil} onChange={e=>set('gear_oil',e.target.value)}/></div>
            <div><label className={lbl}>Lubricating Oil</label><input className={inp} value={form.lubricating_oil} onChange={e=>set('lubricating_oil',e.target.value)}/></div>
            <div><label className={lbl}>Grease Oil</label><input className={inp} value={form.grease_oil} onChange={e=>set('grease_oil',e.target.value)}/></div>
          </div>
          <div><label className={lbl}>Remarks</label><textarea className={inp} rows={2} value={form.remarks} onChange={e=>set('remarks',e.target.value)}/></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save Trip Ticket'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

