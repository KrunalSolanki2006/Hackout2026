import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function Toast() {
  const { toasts, removeToast } = useFacilityAssessment();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-dropdown border flex items-center justify-between gap-3 text-xs font-medium bg-white transition-all duration-300 animate-slide-in ${
              isSuccess
                ? 'border-emerald-200 text-gray-900'
                : isError
                ? 'border-rose-200 text-gray-900'
                : 'border-gray-200 text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-[#5546E8] shrink-0" />}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
