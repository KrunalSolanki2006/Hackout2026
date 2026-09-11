import React from 'react';

export default function LoadingSkeleton({ variant = 'kpi', count = 4, className = '' }) {
  if (variant === 'kpi') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="panel-card p-5 animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-8 w-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-7 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-40 pt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`panel-card p-6 animate-pulse space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-64 bg-gray-50 rounded-xl flex items-end justify-between p-4 gap-2 border border-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-t w-full"
              style={{ height: `${20 + (i * 15) % 75}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`panel-card p-5 animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        {Array.from({ length: count || 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-100 rounded w-1/6" />
            <div className="h-3 bg-gray-200 rounded w-1/6" />
            <div className="h-3 bg-gray-100 rounded w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  // default 'cards'
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count || 3 }).map((_, i) => (
        <div key={i} className="panel-card p-5 animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-5 bg-gray-100 rounded w-16" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
