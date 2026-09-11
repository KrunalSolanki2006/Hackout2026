import React from 'react';
import { Check } from 'lucide-react';

export default function StepperNav({
  steps = [],
  currentStep = 0,
  onSelectStep,
  allowDirectJump = false,
}) {
  return (
    <nav aria-label="Intake wizard progress" className="w-full">
      <ol className="flex items-center justify-between w-full relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = allowDirectJump || idx <= currentStep;

          return (
            <li
              key={step.id || idx}
              className={`flex-1 flex flex-col items-center relative group ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => isClickable && onSelectStep && onSelectStep(idx)}
            >
              {/* Connector line between circles */}
              {idx !== 0 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-0.5 -z-0 transition-colors ${
                    idx <= currentStep ? 'bg-[#5546E8]' : 'bg-gray-200'
                  }`}
                  style={{ width: '100%', right: '50%' }}
                />
              )}

              {/* Step Icon / Number Indicator */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                  isCompleted
                    ? 'bg-[#5546E8] text-white shadow-xs'
                    : isCurrent
                    ? 'bg-white border-2 border-[#5546E8] text-[#5546E8] ring-4 ring-[#5546E8]/10'
                    : 'bg-white border border-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <p
                  className={`text-xs transition-colors ${
                    isCurrent
                      ? 'text-[#5546E8] font-bold'
                      : isCompleted
                      ? 'text-gray-800 font-semibold'
                      : 'text-gray-400 font-medium'
                  }`}
                >
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="text-[10px] text-gray-400 hidden sm:block mt-0.5">
                    {step.sublabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
