import React from 'react';
import { Lock, X } from 'lucide-react';

export default function NoAccessModal({ open, onClose, feature }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700 animate-pop-in overflow-hidden">
        {/* Red top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />

        <div className="p-6 text-center">
          <button onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X size={16} />
          </button>

          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
            <Lock size={26} className="text-rose-600 dark:text-rose-400" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Access Restricted</h2>
          {feature && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-1 inline-block mb-3">
              {feature}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            You don't have permission to access this feature. Please contact your administrator if you believe this is a mistake.
          </p>

          <button onClick={onClose}
            className="mt-5 w-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}