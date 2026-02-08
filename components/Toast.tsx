import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Trophy } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'award';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-10 fade-in duration-300 w-80 bg-white ${
            toast.type === 'success' ? 'border-teal-200' : 
            toast.type === 'award' ? 'border-amber-300 bg-amber-50' : 
            'border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0" />
          ) : toast.type === 'award' ? (
            <div className="bg-amber-100 p-1 rounded-full">
               <Trophy className="h-4 w-4 text-amber-600 flex-shrink-0" />
            </div>
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          
          <div className="flex-1">
             {toast.type === 'award' && <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Achievement Unlocked</p>}
             <p className={`text-sm font-medium ${toast.type === 'award' ? 'text-amber-900' : 'text-slate-700'}`}>{toast.message}</p>
          </div>
          
          <button 
            onClick={() => onRemove(toast.id)}
            className={`${toast.type === 'award' ? 'text-amber-400 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'} p-1`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};