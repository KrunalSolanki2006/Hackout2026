import React from 'react';

export default function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  trend,
  badge,
  badgeColor = 'emerald',
  className = '',
}) {
  const badgeClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-indigo-50 text-[#5546E8] border-indigo-200',
  };

  const iconClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-indigo-50 text-[#5546E8] border-indigo-100',
  };

  return (
    <div className={`panel-card p-5 relative overflow-hidden transition-all duration-200 hover:shadow-card-hover ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <div className="flex items-baseline space-x-2 pt-1">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
              {value}
            </span>
            {unit && <span className="text-xs font-medium text-gray-500">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${iconClasses[badgeColor] || iconClasses.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-gray-500 truncate mr-2">{subtitle}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeClasses[badgeColor] || badgeClasses.emerald}`}>
              {badge}
            </span>
          )}
          {trend && (
            <span
              className={`flex items-center gap-1 font-medium ${
                trend.positive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              <span>{trend.positive ? '↓' : '↑'}</span>
              <span>{trend.value}</span>
              <span className="text-gray-400 font-normal">{trend.label}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
