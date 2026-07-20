import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashbookAPI } from '../../api/apiClient';
import { useToast } from '../../components/Toast';
import { FileStack, Printer } from 'lucide-react';
import { BRGY, peso, fmtDate, printDoc, govHeader } from './financeHelpers';

export default function ChecksIssued() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoad] = useState(true);
  const [range, setRange] = useState({ from:'', to:'' });

  const load = useCallback(async (params) => {
    setLoad(true);
    try {
      const r = await cashbookAPI.checksIssued(params);
      setRows(r.data.checks || []); setTotal(r.data.total || 0);
    } catch { toast('Failed to load checks issued', 'error'); }
    finally { setLoad(false); }
  }, []);
  useEffect(() => { load({}); }, [load]);

  function applyFilter() { load({ from: range.from || undefined, to: range.to || undefined }); }
  function clearFilter() { setRange({ from:'', to:'' }); load({}); }

  function print() {
    printDoc('Summary of Checks Issued', `
      ${govHeader('SUMMARY/SCHEDULE OF CHECKS ISSUED (SCkI)')}
      ${(range.from||range.to) ? `<p class="meta">Period: ${range.from?fmtDate(range.from):'—'} to ${range.to?fmtDate(range.to):'—'}</p>` : ''}
      <table>
        <tr><th>Date Paid</th><th>Check No.</th><th>DV Ref</th><th>Payee</th><th>Particulars</th><th>Fund</th><th>Amount</th></tr>
        ${rows.map(r=>`<tr><td>${fmtDate(r.paid_date)}</td><td>${r.check_no||''}</td><td>${r.dv_ref_no}</td><td>${r.payee}</td><td>${r.particulars}</td><td>${r.fund_key}</td><td style="text-align:right;">${peso(r.amount)}</td></tr>`).join('')}
        <tr><td colspan="6" style="text-align:right;"><b>TOTAL</b></td><td style="text-align:right;"><b>${peso(total)}</b></td></tr>
      </table>
      <div class="sig-block">
        <div><div class="sig-name" style="min-width:220px;">${BRGY.treasurer}</div><div class="sig-title">Certified Correct — Barangay Treasurer</div></div>
      </div>
    `);
  }

  const inp = "border border-gray-300 dark:border-[#2e334a] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="w-full space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <FileStack size={22} className="text-indigo-600"/> Summary of Checks Issued (SCkI)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Auto-generated live from paid Disbursement Vouchers — no manual entry, always in sync</p>
        </div>
        <button onClick={print} className="btn-secondary flex items-center gap-1.5"><Printer size={15}/> Print</button>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div><label className="block text-xs font-bold uppercase text-gray-400 mb-1">From</label><input type="date" className={inp} value={range.from} onChange={e=>setRange(p=>({...p,from:e.target.value}))}/></div>
        <div><label className="block text-xs font-bold uppercase text-gray-400 mb-1">To</label><input type="date" className={inp} value={range.to} onChange={e=>setRange(p=>({...p,to:e.target.value}))}/></div>
        <button onClick={applyFilter} className="btn-primary">Filter</button>
        <button onClick={clearFilter} className="btn-secondary">Clear</button>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400 uppercase font-bold">Total Checks Issued</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{peso(total)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Date Paid','Check No.','DV Ref','Payee','Particulars','Fund','Amount',''].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              : rows.length===0 ? <tr><td colSpan={8} className="py-14 text-center text-gray-400">No checks issued in this period</td></tr>
              : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td text-gray-400 whitespace-nowrap">{fmtDate(r.paid_date)}</td>
                  <td className="table-td font-mono text-gray-600 dark:text-slate-300">{r.check_no}</td>
                  <td className="table-td font-mono text-[11px] text-indigo-500">{r.dv_ref_no}</td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{r.payee}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 max-w-xs truncate">{r.particulars}</td>
                  <td className="table-td text-gray-400 text-xs">{r.fund_key}</td>
                  <td className="table-td text-right font-semibold text-gray-900 dark:text-slate-100">{peso(r.amount)}</td>
                  <td className="table-td">
                    <button onClick={() => navigate('/cheque-print', { state:{ payee: r.payee, amount: r.amount, date: r.paid_date } })} className="act-btn act-indigo"><Printer size={12}/> Reprint</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

