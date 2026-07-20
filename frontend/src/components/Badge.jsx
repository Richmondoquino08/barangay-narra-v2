import React from 'react';

// Each variant: { bg, text, dot, border }
const variants = {
  pending:              { bg:'rgba(245,158,11,0.12)',  text:'#b45309', dot:'#f59e0b', border:'rgba(245,158,11,0.25)' },
  approved:             { bg:'rgba(16,185,129,0.12)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.25)' },
  rejected:             { bg:'rgba(239,68,68,0.12)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.25)'  },
  completed:            { bg:'rgba(59,130,246,0.12)',  text:'#1d4ed8', dot:'#3b82f6', border:'rgba(59,130,246,0.25)' },
  processing:           { bg:'rgba(139,92,246,0.12)',  text:'#6d28d9', dot:'#8b5cf6', border:'rgba(139,92,246,0.25)' },
  draft:                { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },

  // Blotter
  reported:             { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },
  investigating:        { bg:'rgba(249,115,22,0.10)',  text:'#c2410c', dot:'#f97316', border:'rgba(249,115,22,0.20)' },
  summoned:             { bg:'rgba(14,165,233,0.10)',  text:'#0369a1', dot:'#0ea5e9', border:'rgba(14,165,233,0.20)' },
  mediation:            { bg:'rgba(59,130,246,0.10)',  text:'#1d4ed8', dot:'#3b82f6', border:'rgba(59,130,246,0.20)' },
  settled:              { bg:'rgba(16,185,129,0.10)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.20)' },
  referred_pnp:         { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },
  referred_court:       { bg:'rgba(139,92,246,0.10)',  text:'#6d28d9', dot:'#8b5cf6', border:'rgba(139,92,246,0.20)' },
  certified_action:     { bg:'rgba(124,58,237,0.10)',  text:'#5b21b6', dot:'#7c3aed', border:'rgba(124,58,237,0.20)' },
  resolved:             { bg:'rgba(16,185,129,0.10)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.20)' },
  closed:               { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },

  // DRRM alert levels
  green:                { bg:'rgba(16,185,129,0.10)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.20)' },
  yellow:               { bg:'rgba(234,179,8,0.10)',   text:'#854d0e', dot:'#eab308', border:'rgba(234,179,8,0.20)'  },
  orange:               { bg:'rgba(249,115,22,0.10)',  text:'#c2410c', dot:'#f97316', border:'rgba(249,115,22,0.20)' },
  red:                  { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },

  // Finance
  income:               { bg:'rgba(16,185,129,0.10)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.20)' },
  expense:              { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },

  // Projects
  planning:             { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },
  ongoing:              { bg:'rgba(59,130,246,0.10)',  text:'#1d4ed8', dot:'#3b82f6', border:'rgba(59,130,246,0.20)' },
  suspended:            { bg:'rgba(245,158,11,0.10)',  text:'#b45309', dot:'#f59e0b', border:'rgba(245,158,11,0.20)' },

  // Compliance
  compliant:            { bg:'rgba(16,185,129,0.10)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.20)' },
  non_compliant:        { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },
  conditionally_compliant: { bg:'rgba(245,158,11,0.10)', text:'#b45309', dot:'#f59e0b', border:'rgba(245,158,11,0.20)' },

  // ID status
  expired:              { bg:'rgba(239,68,68,0.10)',   text:'#b91c1c', dot:'#ef4444', border:'rgba(239,68,68,0.20)'  },
  no_id:                { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },

  // Roles
  admin:                { bg:'rgba(139,92,246,0.12)',  text:'#6d28d9', dot:'#8b5cf6', border:'rgba(139,92,246,0.25)' },
  secretary:            { bg:'rgba(59,130,246,0.12)',  text:'#1d4ed8', dot:'#3b82f6', border:'rgba(59,130,246,0.25)' },
  captain:              { bg:'rgba(99,102,241,0.12)',  text:'#4338ca', dot:'#6366f1', border:'rgba(99,102,241,0.25)' },
  treasurer:            { bg:'rgba(20,184,166,0.12)',  text:'#0f766e', dot:'#14b8a6', border:'rgba(20,184,166,0.25)' },

  // Generic
  active:               { bg:'rgba(16,185,129,0.12)',  text:'#047857', dot:'#10b981', border:'rgba(16,185,129,0.25)' },
  inactive:             { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },
  monitoring:           { bg:'rgba(234,179,8,0.10)',   text:'#854d0e', dot:'#eab308', border:'rgba(234,179,8,0.20)'  },
  default:              { bg:'rgba(100,116,139,0.10)', text:'#475569', dot:'#94a3b8', border:'rgba(100,116,139,0.20)' },
};

export default function Badge({ status, label, className = '' }) {
  const key   = (status || '').toLowerCase().replace(/\s+/g, '_');
  const v     = variants[key] || variants.default;
  const text  = label || status || '';
  const display = text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g,' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}
      style={{ background: v.bg, color: v.text, border: `1px solid ${v.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.dot, boxShadow: `0 0 4px ${v.dot}` }}/>
      {display}
    </span>
  );
}
