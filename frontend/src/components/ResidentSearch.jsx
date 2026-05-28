import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';

/**
 * ResidentSearch — searchable resident picker
 *
 * Props:
 *   residents  : array of resident objects (id, full_name, address, contact_number)
 *   value      : currently selected resident id (string or number)
 *   onChange   : (id) => void  — called with the selected id, or '' when cleared
 *   placeholder: string (default "Search resident by name or contact…")
 *   required   : bool
 *   label      : string — if set, renders a <label> above
 */
export default function ResidentSearch({
  residents = [],
  value,
  onChange,
  placeholder = 'Search resident by name or contact…',
  required = false,
  label,
}) {
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);

  /* ── Sync selected when value or residents change ── */
  useEffect(() => {
    if (value) {
      const found = residents.find(r => String(r.id) === String(value));
      setSelected(found || null);
    } else {
      setSelected(null);
    }
  }, [value, residents]);

  /* ── Close dropdown when clicking outside ── */
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Filter logic ── */
  const filtered = (() => {
    const q = query.toLowerCase().trim();
    if (!q) return residents.slice(0, 50);
    return residents.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.contact_number?.includes(q) ||
      r.address?.toLowerCase().includes(q)
    ).slice(0, 50);
  })();

  const pick = (r) => {
    onChange(r.id);
    setSelected(r);
    setOpen(false);
    setQuery('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setSelected(null);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="label">{label}</label>}

      {/* ── Selected state ── */}
      {selected ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <User size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{selected.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{selected.address}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-[#2e334a] flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 transition"
            title="Clear selection"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        /* ── Search input ── */
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            required={required && !selected}
            className="input pl-9"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Dropdown ── */}
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#2e334a] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-gray-400 dark:text-slate-500">
              No residents found for "{query}"
            </div>
          ) : (
            <>
              {!query && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  Showing first 50 — type to filter
                </p>
              )}
              {filtered.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={() => pick(r)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-[#22263a] transition"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#22263a] flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600 dark:text-slate-300">
                    {r.full_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{r.full_name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{r.address}</p>
                  </div>
                  {r.contact_number && (
                    <span className="ml-auto text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">{r.contact_number}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
