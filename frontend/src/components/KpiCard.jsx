import React from 'react';
import AnimatedCounter from './AnimatedCounter';

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
  const themeConfig = {
    rose: {
      borderTop: 'border-t-rose-500',
      gradientBg: 'from-rose-50/40 via-white to-white',
      iconBox: 'bg-rose-50 border-rose-200/70 text-rose-600',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    amber: {
      borderTop: 'border-t-amber-500',
      gradientBg: 'from-amber-50/40 via-white to-white',
      iconBox: 'bg-amber-50 border-amber-200/70 text-amber-600',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    emerald: {
      borderTop: 'border-t-emerald-500',
      gradientBg: 'from-emerald-50/40 via-white to-white',
      iconBox: 'bg-emerald-50 border-emerald-200/70 text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    blue: {
      borderTop: 'border-t-[#5546E8]',
      gradientBg: 'from-indigo-50/40 via-white to-white',
      iconBox: 'bg-indigo-50 border-indigo-200/70 text-[#5546E8]',
      badge: 'bg-indigo-50 text-[#5546E8] border-indigo-200',
    },
  };

  const theme = themeConfig[badgeColor] || themeConfig.blue;
  const strVal = String(value || '');
  const isLongValue = strVal.length > 12;

  return (
    <div
      className={`panel-card p-4 sm:p-5 relative rounded-2xl border border-gray-200/80 border-t-4 ${theme.borderTop} bg-gradient-to-b ${theme.gradientBg} flex flex-col justify-between h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${className}`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono leading-tight">
              {title}
            </p>
          </div>
          {Icon && (
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 group-hover:scale-105 ${theme.iconBox}`}
            >
              <Icon className="w-6 h-6 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Primary Value & Unit */}
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
          <span
            className={`font-extrabold font-mono tracking-tight text-gray-900 tabular-nums ${
              isLongValue ? 'text-xl sm:text-2xl leading-tight' : 'text-3xl'
            }`}
          >
            <AnimatedCounter value={value} />
          </span>
          {unit && (
            <span className="text-xs font-semibold text-gray-500 font-sans tracking-normal">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Structured Compact Footer: Single unified line without extra empty space */}
      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-2.5 border-t border-gray-100/90 flex items-center justify-between gap-2 flex-wrap text-xs">
          {subtitle && (
            <span className="text-xs text-gray-500 font-normal leading-normal">
              {subtitle}
            </span>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {badge && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-tight ${theme.badge}`}
              >
                {badge}
              </span>
            )}

            {trend && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  trend.positive
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                    : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                }`}
              >
                <span>{trend.positive ? '↓' : '↑'}</span>
                <span>{trend.value}</span>
                <span className="text-gray-500 font-normal hidden sm:inline">{trend.label}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
