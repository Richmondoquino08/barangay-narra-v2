import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const palette = {
  blue:    { light: 'bg-blue-50   border-blue-100',   dark: 'dark:bg-blue-950/40   dark:border-blue-900/50',   icon: 'bg-blue-500',    text: 'text-blue-700   dark:text-blue-300' },
  emerald: { light: 'bg-emerald-50 border-emerald-100',dark: 'dark:bg-emerald-950/40 dark:border-emerald-900/50',icon: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  violet:  { light: 'bg-violet-50  border-violet-100', dark: 'dark:bg-violet-950/40  dark:border-violet-900/50', icon: 'bg-violet-500',  text: 'text-violet-700  dark:text-violet-300' },
  amber:   { light: 'bg-amber-50   border-amber-100',  dark: 'dark:bg-amber-950/40   dark:border-amber-900/50',  icon: 'bg-amber-500',   text: 'text-amber-700   dark:text-amber-300' },
  rose:    { light: 'bg-rose-50    border-rose-100',   dark: 'dark:bg-rose-950/40    dark:border-rose-900/50',   icon: 'bg-rose-500',    text: 'text-rose-700    dark:text-rose-300' },
  teal:    { light: 'bg-teal-50    border-teal-100',   dark: 'dark:bg-teal-950/40    dark:border-teal-900/50',   icon: 'bg-teal-500',    text: 'text-teal-700    dark:text-teal-300' },
  indigo:  { light: 'bg-indigo-50  border-indigo-100', dark: 'dark:bg-indigo-950/40  dark:border-indigo-900/50', icon: 'bg-indigo-500',  text: 'text-indigo-700  dark:text-indigo-300' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const c = palette[color] || palette.blue;
  return (
    <div className={`rounded-2xl p-5 border flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow ${c.light} ${c.dark}`}>
      <div className={`${c.icon} p-2.5 rounded-xl shadow-sm flex-shrink-0`}>
        {Icon && <Icon size={20} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-0.5 truncate">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}
