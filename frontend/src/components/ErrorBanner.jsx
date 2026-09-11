import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function ErrorBanner({
  title = 'System Notice',
  message = 'An error occurred while loading data.',
  onRetry,
  onDismiss,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-semibold text-rose-900">{title}</p>
          <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs font-semibold text-rose-800 hover:text-rose-900 flex items-center gap-1.5 underline underline-offset-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry request</span>
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-rose-500 hover:text-rose-800 p-1 rounded-md hover:bg-rose-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
