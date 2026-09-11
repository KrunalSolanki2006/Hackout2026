import React from 'react';
import { Check, X, Info } from 'lucide-react';

export default function ExplanationChecklist({
  explanations = [],
  className = '',
  compact = false,
}) {
  if (!explanations || explanations.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>No specific model rationale flags recorded.</span>
      </div>
    );
  }

  return (
    <ul className={`space-y-1.5 ${className}`}>
      {explanations.map((item, idx) => {
        const text = typeof item === 'string' ? item : item.text;
        const isPositive = typeof item === 'object' && item.pass !== undefined ? item.pass : true;

        return (
          <li key={idx} className="flex items-start gap-2 text-xs leading-tight">
            {isPositive ? (
              <span className="p-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mt-0.5 shrink-0">
                <Check className="w-3 h-3 stroke-[2.5]" />
              </span>
            ) : (
              <span className="p-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 mt-0.5 shrink-0">
                <X className="w-3 h-3 stroke-[2.5]" />
              </span>
            )}
            <span className={isPositive ? 'text-gray-700 font-medium' : 'text-gray-400'}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
