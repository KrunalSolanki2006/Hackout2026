import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function EmptyState({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon: Icon = Sparkles,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`panel-card p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5546E8] flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary flex items-center gap-2 text-xs sm:text-sm"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
