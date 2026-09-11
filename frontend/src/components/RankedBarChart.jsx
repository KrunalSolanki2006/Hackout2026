import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function RankedBarChart({
  data = [],
  onSelectLeakPoint,
  height = 300,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No leak points calculated yet.
      </div>
    );
  }

  // Format chart data for horizontal bar
  const chartData = data.map((d) => ({
    name: d.name || d.leak_point_ref,
    leak_point_ref: d.leak_point_ref,
    co2e: d.co2e,
    pct: Math.round(d.pct_contribution * 100),
    severity: d.severity,
    category: d.category,
  }));

  const getBarColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#EF4444'; // Rose / Red
      case 'medium':
        return '#F59E0B'; // Amber
      default:
        return '#5546E8'; // Purple
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-dropdown text-xs space-y-1.5 min-w-[210px]">
          <div className="flex items-center justify-between font-semibold text-gray-900 pb-1 border-b border-gray-100">
            <span>{item.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                item.severity === 'high'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : item.severity === 'medium'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-indigo-50 text-[#5546E8] border border-indigo-200'
              }`}
            >
              {item.severity} Severity
            </span>
          </div>
          <div className="flex justify-between text-gray-600 pt-1">
            <span>CO₂e Emissions:</span>
            <span className="font-mono font-bold text-gray-900">{item.co2e} t CO₂e</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Share of Plant Total:</span>
            <span className="font-mono font-semibold text-[#5546E8]">{item.pct}%</span>
          </div>
          <div className="flex justify-between text-gray-400 text-[11px] pt-1 border-t border-gray-100">
            <span>Process Stream:</span>
            <span className="capitalize text-gray-700 font-medium">{item.category}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="w-full"
      role="region"
      aria-label="Ranked horizontal bar chart of industrial emission leak points"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
        >
          <XAxis
            type="number"
            unit="%"
            domain={[0, 'dataMax + 10']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Bar
            dataKey="pct"
            radius={[0, 4, 4, 0]}
            className="cursor-pointer transition-opacity hover:opacity-90"
            onClick={(entry) => onSelectLeakPoint && onSelectLeakPoint(entry.leak_point_ref)}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.severity)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
