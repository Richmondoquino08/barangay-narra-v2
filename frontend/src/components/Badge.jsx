import React from 'react';

const variants = {
  // Status
  pending:      'bg-amber-100 text-amber-800 border border-amber-200',
  approved:     'bg-emerald-100 text-emerald-800 border border-emerald-200',
  rejected:     'bg-rose-100 text-rose-800 border border-rose-200',
  completed:    'bg-blue-100 text-blue-800 border border-blue-200',
  processing:   'bg-purple-100 text-purple-800 border border-purple-200',
  draft:        'bg-gray-100 text-gray-600 border border-gray-200',
  // Blotter
  reported:     'bg-red-100 text-red-800 border border-red-200',
  investigating:'bg-orange-100 text-orange-800 border border-orange-200',
  resolved:     'bg-emerald-100 text-emerald-800 border border-emerald-200',
  closed:       'bg-gray-100 text-gray-600 border border-gray-200',
  // Finance
  income:       'bg-emerald-100 text-emerald-800 border border-emerald-200',
  expense:      'bg-rose-100 text-rose-800 border border-rose-200',
  // Roles
  admin:        'bg-violet-100 text-violet-800 border border-violet-200',
  secretary:    'bg-blue-100 text-blue-800 border border-blue-200',
  captain:      'bg-indigo-100 text-indigo-800 border border-indigo-200',
  treasurer:    'bg-teal-100 text-teal-800 border border-teal-200',
  // Generic
  active:       'bg-emerald-100 text-emerald-800 border border-emerald-200',
  inactive:     'bg-gray-100 text-gray-500 border border-gray-200',
  default:      'bg-gray-100 text-gray-700 border border-gray-200',
};

export default function Badge({ status, label, className = '' }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_');
  const style = variants[key] || variants.default;
  const text  = label || status || '';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
}