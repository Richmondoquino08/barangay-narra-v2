import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const palette = {
  blue:    { bg: '#EFF6FF', icon: '#2563EB', ring: '#BFDBFE', dbg: 'rgba(37,99,235,0.15)', dring: 'rgba(37,99,235,0.30)' },
  emerald: { bg: '#ECFDF5', icon: '#059669', ring: '#A7F3D0', dbg: 'rgba(5,150,105,0.15)',  dring: 'rgba(5,150,105,0.30)' },
  violet:  { bg: '#F5F3FF', icon: '#7C3AED', ring: '#DDD6FE', dbg: 'rgba(124,58,237,0.15)', dring: 'rgba(124,58,237,0.30)' },
  amber:   { bg: '#FFFBEB', icon: '#D97706', ring: '#FDE68A', dbg: 'rgba(217,119,6,0.15)',  dring: 'rgba(217,119,6,0.30)' },
  rose:    { bg: '#FFF1F2', icon: '#E11D48', ring: '#FECDD3', dbg: 'rgba(225,29,72,0.15)',  dring: 'rgba(225,29,72,0.30)' },
  teal:    { bg: '#F0FDFA', icon: '#0D9488', ring: '#99F6E4', dbg: 'rgba(13,148,136,0.15)', dring: 'rgba(13,148,136,0.30)' },
  indigo:  { bg: '#EEF2FF', icon: '#4338CA', ring: '#C7D2FE', dbg: 'rgba(67,56,202,0.15)', dring: 'rgba(67,56,202,0.30)' },
  orange:  { bg: '#FFF7ED', icon: '#EA580C', ring: '#FED7AA', dbg: 'rgba(234,88,12,0.15)',  dring: 'rgba(234,88,12,0.30)' },
};

function useCountUp(rawValue, duration = 900) {
  const [display, setDisplay] = useState(rawValue);
  const rafRef = useRef(null);

  useEffect(() => {
    const str = String(rawValue ?? '');
    const prefix   = /^[₱$€£¥]/.test(str) ? str[0] : '';
    const numStr   = str.replace(/[^0-9.]/g, '');
    const target   = parseFloat(numStr);
    const useComma = str.includes(',');

    if (!numStr || isNaN(target)) { setDisplay(rawValue); return; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const fmt = n => prefix + (useComma ? Math.round(n).toLocaleString() : Math.round(n).toString());
    const startTime = performance.now();
    const tick = now => {
      const t     = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fmt(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else        setDisplay(rawValue);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [rawValue, duration]);

  return display;
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const c           = palette[color] || palette.blue;
  const animated    = useCountUp(value);
  const { darkMode } = useTheme();

  const iconBg   = darkMode ? c.dbg   : c.bg;
  const iconRing = darkMode ? c.dring : c.ring;

  return (
    <div className="card px-5 py-4 flex items-center gap-4">
      {Icon && (
        <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: iconBg, border: `1.5px solid ${iconRing}` }}>
          <Icon size={20} style={{ color: c.icon }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-0.5 truncate">
          {title}
        </p>
        <p className="text-2xl font-black text-gray-900 dark:text-slate-50 leading-none tabular-nums">
          {animated}
        </p>
        {subtitle && (
          <p className="text-xs mt-1 text-gray-400 dark:text-slate-500 truncate">{subtitle}</p>
        )}
      </div>

      {trend !== undefined && (
        <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full
          ${trend >= 0
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/25 dark:text-rose-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}
