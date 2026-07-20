import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const { darkMode } = useTheme();

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm:'max-w-md', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' };

  const D = darkMode;

  const modal = (
    /* Portal root — fixed to viewport, covers everything including sidebar & header */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop — covers the FULL viewport */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: D ? 'rgba(0,0,0,0.62)' : 'rgba(15,23,42,0.40)',
        }}
      />

      {/* Modal panel */}
      <div
        className={`relative w-full ${sizes[size]}`}
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: D ? '#14172a' : '#ffffff',
          boxShadow: D
            ? '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.70)'
            : '0 0 0 1px rgba(0,0,0,0.07), 0 24px 80px rgba(0,0,0,0.20)',
          animation: 'modal-enter 0.20s cubic-bezier(0.34,1.56,0.64,1) both',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: D ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: D ? '#e8ecf4' : '#111827' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: D ? '#4a5878' : '#9ca3af',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D ? '#4a5878' : '#9ca3af'; }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modal-enter {
          from { opacity:0; transform:scale(0.96) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  // Render at document.body level — bypasses sidebar/header stacking context
  return ReactDOM.createPortal(modal, document.body);
}
