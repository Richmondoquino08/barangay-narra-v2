import React, { useState, useEffect, useCallback } from 'react';
import { financeAPI, budgetAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Download, Pencil, Trash2,
  AlertTriangle, CheckCircle, PieChart, Users, Landmark, Filter, BarChart2,
  ShieldAlert, Info, Loader2, BookOpen, AlertCircle
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const PCT = (used, total) => total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

// ── DBM-aligned categories (RA 7160) ──────────────────────────────────────
const INCOME_CATS = [
  'Internal Revenue Allotment (IRA/NTA)',
  'Share in Real Property Tax',
  'Share in Community Tax',
  'National Wealth Share',
  'Barangay Tax — Business/Retail',
  'Service Fees & Charges',
  'Public Utility Charges',
  'Barangay Clearance Fee',
  'Economic Enterprise Income',
  'Subsidy — National Government',
  'Subsidy — Province/City/Municipality',
  'Grants and Donations',
  'Capital/Investment Receipts',
  'Other Income',
];

const EXPENSE_CATS = [
  'Personal Services (PS) — Salaries',
  'Personal Services (PS) — Honoraria',
  'Personal Services (PS) — Other Benefits',
  'MOOE — Office Supplies',
  'MOOE — Utilities (Water/Electricity)',
  'MOOE — Communication',
  'MOOE — Repairs & Maintenance',
  'MOOE — Fuel & Lubricants',
  'MOOE — Other Operating Expenses',
  '20% Dev Fund — Infrastructure',
  '20% Dev Fund — Social Services',
  '20% Dev Fund — Economic Services',
  'BDRRMF — Prevention & Preparedness (70%)',
  'BDRRMF — Quick Response Fund (30%)',
  'SK Fund',
  'Gender & Development (GAD)',
  'BCPC Programs',
  'Senior Citizens & PWD Programs',
  'Capital Outlay (CO)',
  'Debt Service',
  'Other Expenses',
];

const FUND_SOURCES = [
  'General Fund',
  '20% Development Fund (IRA)',
  'BDRRMF — Disaster Fund',
  'SK Fund',
  'GAD Fund',
  'BCPC Fund',
  'Special Fund',
];

const SALARY_TYPES = ['Monthly Salary','Semi-Monthly Salary','Daily Wage','Honoraria','Per Diem','Allowance','Overtime Pay','Terminal Leave','PERA/RATA'];
const PAYMENT_METHODS = ['Cash','Check','Bank Transfer','GCash','Maya'];

// ── Compliance indicator ───────────────────────────────────────────────────
function ComplianceRow({ label, required, allocated, legal, ok }) {
  const color = ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const icon  = ok ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0"/> : <AlertCircle size={14} className="text-rose-500 flex-shrink-0"/>;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-[#2e334a] last:border-0">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500">{legal}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">Required: {fmt(required)}</p>
        <p className={`text-xs font-bold ${color}`}>Budgeted: {fmt(allocated)}</p>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
function BudgetBar({ label, used, total, color = 'indigo' }) {
  const pct  = PCT(used, total);
  const over = pct >= 100;
  const warn = pct >= 80;
  const barColor = over ? 'bg-rose-500' : warn ? 'bg-amber-500' : `bg-${color}-500`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-slate-300 font-medium truncate max-w-[55%]">{label}</span>
        <span className={`font-semibold tabular-nums ${over ? 'text-rose-600' : warn ? 'text-amber-600' : 'text-gray-700 dark:text-slate-200'}`}>
          {fmt(used)} / {fmt(total)} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-[#22263a] rounded-full h-2">
        <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

function CatRow({ cat, total, type }) {
  const color = type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-[#2e334a] last:border-0">
      <span className="text-sm text-gray-700 dark:text-slate-200 truncate max-w-[60%]">{cat || 'Uncategorized'}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{type === 'income' ? '+' : '−'}{fmt(total)}</span>
    </div>
  );
}

// ── Overview tab ───────────────────────────────────────────────────────────
function OverviewTab({ year }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    budgetAPI.getSummary(year)
      .then(r => setSummary(r.data))
      .catch(() => toast('Failed to load summary', 'error'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 size={28} className="text-indigo-500 animate-spin"/></div>;
  if (!summary) return null;

  const { budget, totalIncome, totalExpenses, totalSalary, netBalance, incomeByCategory, expenseByCategory, projectGroups } = summary;
  const totalOut = totalExpenses + totalSalary;

  // Mandatory appropriations compliance (RA 7160)
  const ira       = Number(budget?.ira_share || 0);
  const revenue   = Number(budget?.estimated_local_revenue || totalIncome || 0);
  const genFund   = Number(budget?.general_fund || 0);
  const totalBudg = Number(budget?.total_budget || 0);

  const compliance = budget ? [
    { label: '20% Development Fund', legal: '20% of Annual IRA', required: ira * 0.20, allocated: budget.dev_fund_20pct, ok: Number(budget.dev_fund_20pct) >= ira * 0.20 },
    { label: 'BDRRM Fund', legal: 'At least 5% of Estimated Revenue', required: revenue * 0.05, allocated: budget.drrm_fund_5pct, ok: Number(budget.drrm_fund_5pct) >= revenue * 0.05 },
    { label: 'SK Fund', legal: '10% of General Fund', required: genFund * 0.10, allocated: budget.sk_fund, ok: Number(budget.sk_fund) >= genFund * 0.10 },
    { label: 'Gender & Development (GAD)', legal: '5% of Annual Appropriations', required: totalBudg * 0.05, allocated: budget.gad_fund, ok: Number(budget.gad_fund) >= totalBudg * 0.05 },
    { label: 'BCPC Programs', legal: '1% of IRA Share', required: ira * 0.01, allocated: budget.BCPC_fund, ok: Number(budget.BCPC_fund) >= ira * 0.01 },
    { label: 'Personal Services Cap', legal: 'Max 55% of Local Income', required: null, allocated: budget.ps_budget, ok: revenue > 0 ? Number(budget.ps_budget) <= revenue * 0.55 : true },
  ] : [];

  const compliant = compliance.every(c => c.ok);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Income"   value={fmt(totalIncome)}   icon={TrendingUp}   color="emerald" />
        <StatCard title="Total Expenses" value={fmt(totalExpenses)} icon={TrendingDown}  color="rose" />
        <StatCard title="Salary Paid"    value={fmt(totalSalary)}   icon={Users}         color="amber" />
        <StatCard title="Net Balance"    value={fmt(netBalance)}    icon={DollarSign}    color={netBalance >= 0 ? 'teal' : 'rose'} />
      </div>

      {/* Budget alert */}
      {!budget ? (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 text-amber-800 dark:text-amber-300">
          <ShieldAlert size={18} className="flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold">No budget declared for {year}</p>
            <p className="text-xs mt-0.5">Go to <strong>Budget Management</strong> tab to declare the annual budget per the DBM Local Budgeting guidelines.</p>
          </div>
        </div>
      ) : !compliant ? (
        <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl px-5 py-3 text-rose-800 dark:text-rose-300">
          <AlertTriangle size={17} className="flex-shrink-0"/>
          <p className="text-sm font-medium">Some mandatory appropriations may not meet the legal minimums required by RA 7160. Check the compliance section below.</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle size={17} className="flex-shrink-0"/>
          <p className="text-sm font-medium">All mandatory appropriations meet the legal minimums required by RA 7160.</p>
        </div>
      )}

      {/* Budget utilization */}
      {budget && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Landmark size={16} className="text-indigo-500"/> {year} Budget Utilization
            </h3>
            <span className="text-xs text-gray-400">Total Appropriations: {fmt(budget.total_budget)}</span>
          </div>
          <BudgetBar label="Total Budget" used={totalOut} total={budget.total_budget} color="indigo"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-[#2e334a]">
            <BudgetBar label="General Fund"               used={totalExpenses * 0.5} total={budget.general_fund}    color="blue"/>
            <BudgetBar label="20% Development Fund (IRA)" used={projectGroups?.filter(p=>p.fund_source==='20% Development Fund (IRA)').reduce((s,r)=>s+Number(r.spent_total||0),0) || 0} total={budget.dev_fund_20pct}  color="violet"/>
            <BudgetBar label="BDRRMF"                     used={projectGroups?.filter(p=>p.fund_source==='BDRRMF — Disaster Fund').reduce((s,r)=>s+Number(r.spent_total||0),0) || 0} total={budget.drrm_fund_5pct}  color="rose"/>
            <BudgetBar label="SK Fund"                    used={0} total={budget.sk_fund}          color="amber"/>
          </div>
        </div>
      )}

      {/* Mandatory Appropriations Compliance */}
      {budget && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2 mb-1">
            <BookOpen size={15} className="text-indigo-500"/> Mandatory Appropriations Compliance
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Per RA 7160 (Local Government Code) and DBM guidelines</p>
          <div className="divide-y divide-gray-50 dark:divide-[#2e334a]">
            {compliance.map((c, i) => (
              <ComplianceRow key={i}
                label={c.label} legal={c.legal}
                required={c.required || 0} allocated={c.allocated || 0} ok={c.ok}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2e334a] bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
              <Info size={11} className="flex-shrink-0 mt-0.5"/>
              Personal Services budget cap is 55% of total annual income from local sources of the preceding fiscal year. Essential MOOE expenditures such as utilities and rentals must be given priority.
            </p>
          </div>
        </div>
      )}

      {/* Income / Expense breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-500"/> Income by Source
          </h3>
          {incomeByCategory.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">No income recorded for {year}</p>
            : incomeByCategory.map((r, i) => <CatRow key={i} cat={r.cat} total={r.total} type="income"/>)
          }
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <TrendingDown size={15} className="text-rose-500"/> Expenses by Category
          </h3>
          {expenseByCategory.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">No expenses recorded for {year}</p>
            : expenseByCategory.map((r, i) => <CatRow key={i} cat={r.cat} total={r.total} type="expense"/>)
          }
          {totalSalary > 0 && (
            <div className="flex items-center justify-between py-1.5 mt-1 border-t-2 border-gray-200 dark:border-[#2e334a]">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Salaries & Payroll (PS)</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">−{fmt(totalSalary)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Projects by fund */}
      {projectGroups?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-500"/> Project Spending by Fund Source
          </h3>
          <div className="space-y-3">
            {projectGroups.map((g, i) => (
              <BudgetBar key={i} label={g.fund_source || 'General'} used={Number(g.spent_total||0)} total={Number(g.budget_total||0)} color="indigo"/>
            ))}
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1.5">
            <AlertCircle size={11}/>
            RA 7160 (DBM JMC 2020): PS, admin expenses, travel, training, furniture and vehicles CANNOT be charged to the 20% Development Fund.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Transactions tab ───────────────────────────────────────────────────────
function FinanceForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    transaction_type: 'income', description: '', amount: '',
    category: '', budget_category: '', payment_method: 'Cash',
    receipt_number: '', transaction_date: new Date().toISOString().split('T')[0], notes: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cats = form.transaction_type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {['income','expense'].map(t => (
              <button key={t} type="button" onClick={() => set('transaction_type', t)}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition capitalize
                  ${form.transaction_type === t
                    ? t === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Amount (₱) *</label>
          <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => set('amount', e.target.value)} required/>
        </div>
      </div>
      <div>
        <label className="label">Description *</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} required/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Category (RA 7160)</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select category...</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fund Source</label>
          <select className="input" value={form.budget_category} onChange={e => set('budget_category', e.target.value)}>
            <option value="">Not specified</option>
            {FUND_SOURCES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Transaction Date *</label>
          <input type="date" className="input" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} required/>
        </div>
      </div>
      <div>
        <label className="label">Receipt / O.R. Number</label>
        <input className="input" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} placeholder="Optional"/>
      </div>
      <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}/></div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

function TransactionsTab() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total_income:0, total_expense:0, balance:0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ type:'', startDate:'', endDate:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type) params.transaction_type = filter.type;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      const res = await financeAPI.getAll(params);
      setRecords(res.data.finances || []);
      setSummary(res.data.summary || {});
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await financeAPI.update(modal.id, form);
      else await financeAPI.create(form);
      toast(modal?.id ? 'Updated' : 'Added', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return;
    try { await financeAPI.delete(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  async function handleExport() {
    try {
      const res = await financeAPI.export();
      const url = URL.createObjectURL(new Blob([res.data],{type:'text/csv'}));
      const a = document.createElement('a'); a.href=url; a.download='finances.csv'; a.click();
    } catch { toast('Export failed','error'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2 flex-wrap">
        <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm"><Download size={14}/> Export</button>
        <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/> Add Transaction</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Income"   value={fmt(summary.total_income)}  icon={TrendingUp}  color="emerald"/>
        <StatCard title="Total Expenses" value={fmt(summary.total_expense)} icon={TrendingDown} color="rose"/>
        <StatCard title="Net Balance"    value={fmt(summary.balance)}       icon={DollarSign}  color={summary.balance >= 0 ? 'teal' : 'rose'}/>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400"/>
        <select value={filter.type} onChange={e => setFilter(p=>({...p,type:e.target.value}))}
          className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <input type="date" value={filter.startDate} onChange={e => setFilter(p=>({...p,startDate:e.target.value}))}
          className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={filter.endDate} onChange={e => setFilter(p=>({...p,endDate:e.target.value}))}
          className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
        {(filter.type||filter.startDate||filter.endDate) && (
          <button onClick={() => setFilter({type:'',startDate:'',endDate:''})} className="text-xs text-indigo-600 hover:underline">Clear</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500"><DollarSign size={36} className="mx-auto mb-2 opacity-30"/><p>No transactions found</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Date','Type','Description','Category','Fund Source','O.R. #','Amount',''].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {records.map(r=>(
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td text-gray-500 dark:text-slate-400 whitespace-nowrap">{new Date(r.transaction_date).toLocaleDateString('en-PH')}</td>
                  <td className="table-td"><Badge status={r.transaction_type}/></td>
                  <td className="table-td font-medium text-gray-800 dark:text-slate-100 max-w-[200px] truncate">{r.description}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs max-w-[160px] truncate">{r.category||'—'}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.budget_category||'—'}</td>
                  <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{r.receipt_number||'—'}</td>
                  <td className={`table-td font-semibold tabular-nums ${r.transaction_type==='income'?'text-emerald-600':'text-rose-600'}`}>
                    {r.transaction_type==='expense'?'−':'+'}{fmt(r.amount)}
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>setModal(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={()=>handleDelete(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.id?'Edit Transaction':'New Transaction'} size="lg">
        <FinanceForm initial={modal?.id?modal:null} onSave={handleSave} onCancel={()=>setModal(null)} loading={saving}/>
      </Modal>
    </div>
  );
}

// ── Salary & Payroll tab ───────────────────────────────────────────────────
function SalaryForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    employee_name:'', position:'', payment_type:'Monthly Salary', amount:'',
    period_label:'', paid_date: new Date().toISOString().split('T')[0],
    or_number:'', fund_source:'General Fund', notes:''
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();onSave(form);}} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">Employee Name *</label><input className="input" value={form.employee_name} onChange={e=>set('employee_name',e.target.value)} required/></div>
        <div><label className="label">Position / Designation</label><input className="input" value={form.position} onChange={e=>set('position',e.target.value)} placeholder="e.g. Barangay Captain"/></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">Payment Type</label>
          <select className="input" value={form.payment_type} onChange={e=>set('payment_type',e.target.value)}>
            {SALARY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Amount (₱) *</label><input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e=>set('amount',e.target.value)} required/></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">Period / Month</label><input className="input" value={form.period_label} onChange={e=>set('period_label',e.target.value)} placeholder="e.g. May 2026"/></div>
        <div><label className="label">Date Paid</label><input type="date" className="input" value={form.paid_date} onChange={e=>set('paid_date',e.target.value)}/></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">O.R. Number</label><input className="input" value={form.or_number} onChange={e=>set('or_number',e.target.value)}/></div>
        <div><label className="label">Fund Source</label>
          <select className="input" value={form.fund_source} onChange={e=>set('fund_source',e.target.value)}>
            {FUND_SOURCES.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
        <Info size={12} className="flex-shrink-0 mt-0.5"/>
        <span>Per RA 7160 Sec. 331(b): Total Personal Services must not exceed 55% of total annual income from local sources. This entry creates a Finance expense record automatically.</span>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':'Record Salary'}</button>
      </div>
    </form>
  );
}

function SalaryTab() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords((await budgetAPI.getSalaries({ year: filterYear })).data.records || []); }
    catch { toast('Failed to load salaries', 'error'); }
    finally { setLoading(false); }
  }, [filterYear]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal?.id) await budgetAPI.updateSalary(modal.id, form);
      else await budgetAPI.createSalary(form);
      toast('Salary recorded', 'success');
      setModal(null); load();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this salary record?')) return;
    try { await budgetAPI.deleteSalary(id); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  }

  const totalSalary = records.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2 flex-wrap items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-slate-300 font-medium">Year:</label>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#22263a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {[CURRENT_YEAR, CURRENT_YEAR-1, CURRENT_YEAR-2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-sm text-gray-500 dark:text-slate-400">{records.length} records · Total PS: <strong className="text-rose-600 dark:text-rose-400">{fmt(totalSalary)}</strong></span>
        </div>
        <button onClick={() => setModal({})} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/> Record Salary</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-gray-100 dark:bg-[#22263a] rounded-xl animate-pulse"/>)}</div>
        ) : records.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500"><Users size={36} className="mx-auto mb-2 opacity-30"/><p>No salary records for {filterYear}</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
            <thead><tr className="bg-gray-50 dark:bg-[#1e2233] border-b border-gray-100 dark:border-[#2e334a]">
              {['Employee','Position','Type','Period','Date Paid','O.R. #','Fund Source','Amount',''].map(h=><th key={h} className="table-th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2e334a]">
              {records.map(r=>(
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#22263a]">
                  <td className="table-td font-medium text-gray-800 dark:text-slate-100">{r.employee_name}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.position||'—'}</td>
                  <td className="table-td text-xs"><Badge status="default" label={r.payment_type}/></td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.period_label||'—'}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 whitespace-nowrap">{r.paid_date?new Date(r.paid_date).toLocaleDateString('en-PH'):'—'}</td>
                  <td className="table-td font-mono text-xs text-indigo-700 dark:text-indigo-300">{r.or_number||'—'}</td>
                  <td className="table-td text-gray-500 dark:text-slate-400 text-xs">{r.fund_source||'—'}</td>
                  <td className="table-td font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{fmt(r.amount)}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>setModal(r)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>
                      <button onClick={()=>handleDelete(r.id)} className="act-btn act-red"><Trash2 size={12}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.id?'Edit Salary Record':'Record Salary / Payroll'} size="md">
        <SalaryForm initial={modal?.id?modal:null} onSave={handleSave} onCancel={()=>setModal(null)} loading={saving}/>
      </Modal>
    </div>
  );
}

// ── Budget Management tab ─────────────────────────────────────────────────
function BudgetTab() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canEdit = hasRole(['admin', 'treasurer']);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const EMPTY_FORM = {
    fiscal_year: CURRENT_YEAR,
    total_budget:'', ira_share:'', estimated_local_revenue:'',
    general_fund:'', dev_fund_20pct:'', drrm_fund_5pct:'', special_fund:'',
    sk_fund:'', gad_fund:'', BCPC_fund:'', ps_budget:'', debt_service:'', notes:''
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const load = useCallback(async () => {
    setLoading(true);
    try { setBudgets((await budgetAPI.getAll()).data.budgets || []); }
    catch { toast('Failed to load budgets', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(b) {
    setForm(b ? { ...EMPTY_FORM, ...b, notes: b.notes||'' } : EMPTY_FORM);
    setModal(b || {});
  }

  // Auto-compute per DBM LGU standard (RA 7160)
  function autoCompute() {
    const total  = parseFloat(form.total_budget) || 0;
    const ira    = parseFloat(form.ira_share) || total * 0.60; // IRA ~60% of total for small barangays
    const rev    = parseFloat(form.estimated_local_revenue) || total * 0.40;
    const genF   = total - (ira * 0.20) - (rev * 0.05); // remainder after mandatory appropriations
    const devF   = ira * 0.20;
    const drrmF  = rev * 0.05;
    const skF    = genF * 0.10;
    const gadF   = total * 0.05;
    const BCPCF  = ira * 0.01;
    const psMax  = rev * 0.55;
    const debtMax= rev * 0.20;
    setForm(p => ({
      ...p,
      ira_share: ira.toFixed(2),
      estimated_local_revenue: rev.toFixed(2),
      general_fund: Math.max(0, genF).toFixed(2),
      dev_fund_20pct: devF.toFixed(2),
      drrm_fund_5pct: drrmF.toFixed(2),
      sk_fund: skF.toFixed(2),
      gad_fund: gadF.toFixed(2),
      BCPC_fund: BCPCF.toFixed(2),
      ps_budget: psMax.toFixed(2),
      debt_service: debtMax.toFixed(2),
      special_fund: '0.00',
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try { await budgetAPI.save(form); toast('Budget saved', 'success'); setModal(null); load(); }
    catch { toast('Failed to save budget', 'error'); }
    finally { setSaving(false); }
  }

  const MANDATORY_FIELDS = [
    { key:'dev_fund_20pct', label:'20% Development Fund', note:'20% of Annual IRA',        color:'violet' },
    { key:'drrm_fund_5pct', label:'BDRRM Fund',           note:'Min 5% of Revenue',         color:'rose' },
    { key:'sk_fund',        label:'SK Fund',               note:'10% of General Fund',       color:'amber' },
    { key:'gad_fund',       label:'GAD Budget',            note:'5% of Appropriations',      color:'pink' },
    { key:'BCPC_fund',      label:'BCPC Programs',         note:'1% of IRA',                 color:'teal' },
    { key:'ps_budget',      label:'PS Budget (max)',        note:'Max 55% of Local Income',   color:'blue' },
    { key:'debt_service',   label:'Debt Service (max)',     note:'Max 20% of Regular Income', color:'gray' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-slate-300">Declare the annual budget following RA 7160 mandatory appropriations.</p>
        {canEdit && <button onClick={() => openModal(null)} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14}/> Declare Budget</button>}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-semibold flex items-center gap-1.5"><BookOpen size={14}/> Mandatory Appropriations Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 text-xs">
          <span>• 20% of IRA → Development Fund</span>
          <span>• Min 5% of Revenue → BDRRM Fund</span>
          <span>• 10% of General Fund → SK</span>
          <span>• 5% of Appropriations → GAD</span>
          <span>• 1% of IRA → BCPC</span>
          <span>• Max 55% of Local Income → PS</span>
          <span>• Max 20% of Income → Debt Service</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i)=><div key={i} className="h-40 bg-gray-100 dark:bg-[#22263a] rounded-2xl animate-pulse"/>)}</div>
      ) : budgets.length === 0 ? (
        <div className="py-14 text-center text-gray-400 dark:text-slate-500">
          <Landmark size={36} className="mx-auto mb-2 opacity-30"/>
          <p className="font-medium">No budget declared yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map(b => (
            <div key={b.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg">{b.fiscal_year} Annual Budget</h3>
                  <p className="text-xs text-gray-400 mt-0.5">IRA Share: {fmt(b.ira_share)} · Estimated Local Revenue: {fmt(b.estimated_local_revenue)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{fmt(b.total_budget)}</span>
                  {canEdit && <button onClick={() => openModal(b)} className="act-btn act-sky"><Pencil size={12}/> Edit</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'General Fund',    value: b.general_fund,    color:'blue' },
                  { label:'20% Dev Fund',    value: b.dev_fund_20pct,  color:'violet' },
                  { label:'BDRRMF',          value: b.drrm_fund_5pct,  color:'rose' },
                  { label:'SK Fund',         value: b.sk_fund,         color:'amber' },
                  { label:'GAD Fund',        value: b.gad_fund,        color:'pink' },
                  { label:'BCPC Fund',       value: b.BCPC_fund,       color:'teal' },
                  { label:'PS Budget (max)', value: b.ps_budget,       color:'blue' },
                  { label:'Debt Service',    value: b.debt_service,    color:'gray' },
                ].map(f => (
                  <div key={f.label} className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{f.label}</p>
                    <p className="font-bold text-gray-800 dark:text-slate-100 text-xs mt-0.5 tabular-nums">{fmt(f.value)}</p>
                  </div>
                ))}
              </div>
              {b.notes && <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">{b.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="Declare Annual Budget (RA 7160)" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Fiscal Year *</label><input type="number" min="2020" max="2099" className="input" value={form.fiscal_year} onChange={e=>set('fiscal_year',e.target.value)} required/></div>
            <div><label className="label">Total Budget (₱) *</label><input type="number" min="0" step="0.01" className="input" value={form.total_budget} onChange={e=>set('total_budget',e.target.value)} required placeholder="e.g. 5000000"/></div>
            <div><label className="label">IRA Share (₱)</label><input type="number" min="0" step="0.01" className="input" value={form.ira_share} onChange={e=>set('ira_share',e.target.value)} placeholder="Annual IRA"/></div>
          </div>
          <div><label className="label">Estimated Local Revenue (₱) <span className="text-gray-400 font-normal text-xs">— basis for BDRRMF & PS cap</span></label>
            <input type="number" min="0" step="0.01" className="input" value={form.estimated_local_revenue} onChange={e=>set('estimated_local_revenue',e.target.value)} placeholder="Revenue from local sources"/>
          </div>

          <button type="button" onClick={autoCompute}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-center gap-2">
            ⚡ Auto-Compute Mandatory Appropriations (RA 7160)
          </button>

          <div className="bg-gray-50 dark:bg-[#22263a] rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Mandatory Appropriations (RA 7160)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MANDATORY_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="label text-xs">{f.label} <span className="text-gray-400 font-normal">({f.note})</span></label>
                  <input type="number" min="0" step="0.01" className="input text-sm" value={form[f.key]} onChange={e=>set(f.key,e.target.value)}/>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">General Fund (₱)</label><input type="number" min="0" step="0.01" className="input" value={form.general_fund} onChange={e=>set('general_fund',e.target.value)}/></div>
            <div><label className="label">Special Fund (₱)</label><input type="number" min="0" step="0.01" className="input" value={form.special_fund} onChange={e=>set('special_fund',e.target.value)}/></div>
          </div>
          <div><label className="label">Notes / Resolution Number</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="e.g. Resolution No. 2026-01 dated January 15, 2026"/></div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?<><Loader2 size={14} className="animate-spin"/> Saving...</>:'Save Budget'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Main Finance page ─────────────────────────────────────────────────────
export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [year, setYear] = useState(CURRENT_YEAR);

  const TABS = [
    { id:'overview',     label:'Overview',         icon: PieChart },
    { id:'transactions', label:'Transactions',      icon: DollarSign },
    { id:'salary',       label:'Salary & Payroll',  icon: Users },
    { id:'budget',       label:'Budget Management', icon: Landmark },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign size={22} className="text-emerald-600"/> Finance
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">RA 7160 — Budget · Collections · Expenses · Payroll</p>
        </div>
        {activeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-slate-300">Year:</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="text-sm border border-gray-200 dark:border-[#2e334a] rounded-xl px-3 py-2 bg-white dark:bg-[#1a1d27] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {[CURRENT_YEAR, CURRENT_YEAR-1, CURRENT_YEAR-2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-[#2e334a] gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition
                ${activeTab === t.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
              <Icon size={14}/>{t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview'     && <OverviewTab year={year}/>}
      {activeTab === 'transactions' && <TransactionsTab/>}
      {activeTab === 'salary'       && <SalaryTab/>}
      {activeTab === 'budget'       && <BudgetTab/>}
    </div>
  );
}
