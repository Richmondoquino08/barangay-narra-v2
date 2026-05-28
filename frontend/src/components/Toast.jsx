import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info };
  const styles = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
    error:   'bg-rose-50 border-rose-400 text-rose-800',
    warning: 'bg-amber-50 border-amber-400 text-amber-800',
    info:    'bg-blue-50 border-blue-400 text-blue-800',
  };
  const iconColors = { success: 'text-emerald-500', error: 'text-rose-500', warning: 'text-amber-500', info: 'text-blue-500' };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-in ${styles[t.type]}`}>
              <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColors[t.type]}`} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 transition">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);