import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, User, CheckCircle } from 'lucide-react';

const BookingStepper = ({
  steps,
  currentStep,
  onStepClick,
  canAccessStep,
  selections = {},
}) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky indicator when scrolled past 100px
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const progressWidth = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  const selectionBadges = [
    selections.serviceLabel && { icon: CreditCard, label: selections.serviceLabel },
    selections.professionalLabel && { icon: User, label: selections.professionalLabel },
    selections.dateLabel && { icon: Calendar, label: selections.dateLabel },
    selections.timeLabel && { icon: Clock, label: selections.timeLabel },
  ].filter(Boolean);

  const currentStepLabel = steps.find(s => s.id === currentStep)?.label || '';

  return (
    <>
      {/* Sticky Mobile Progress Indicator */}
      <div
        className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-40 transition-transform duration-300 md:hidden ${isSticky ? 'translate-y-0' : '-translate-y-full'
          }`}
        style={{ top: '64px' }} // Below the header
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => step.id <= currentStep && onStepClick?.(step.id)}
                    disabled={step.id > currentStep}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${isCompleted
                        ? 'bg-[#2d8659] w-2.5 h-2.5'
                        : isCurrent
                          ? 'bg-[#2d8659] w-3 h-3 ring-2 ring-[#2d8659]/30'
                          : 'bg-gray-300'
                      }`}
                    aria-label={`Etapa ${step.id}: ${step.label}`}
                  />
                );
              })}
            </div>

            {/* Current Step Label */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold text-[#2d8659] whitespace-nowrap">
                Etapa {currentStep}/{steps.length}
              </span>
              <span className="text-xs text-gray-600 truncate">
                {currentStepLabel}
              </span>
            </div>

            {/* Progress Percentage */}
            <div className="text-xs font-bold text-[#2d8659] whitespace-nowrap">
              {Math.round(progressWidth)}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2d8659] to-[#236b47] transition-all duration-500 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Original Desktop Stepper */}
      <div className="mb-12">
        <div className="relative">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-[#2d8659] -z-10 transition-all duration-500 ease-out"
            style={{ width: `${progressWidth}%` }}
          />

          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isEnabled = canAccessStep(step.id);
              const isClickable = step.id <= currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 relative group ${isCompleted
                        ? 'bg-[#2d8659] text-white shadow-lg hover:bg-[#236b47] hover:scale-110'
                        : isCurrent
                          ? 'bg-[#2d8659] text-white shadow-lg ring-4 ring-[#2d8659]/30'
                          : isEnabled
                            ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    title={isClickable ? `Ir para ${step.label}` : 'Complete as etapas anteriores'}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.id}
                    {isClickable && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {isCompleted ? `✓ ${step.label} concluído` : `Voltar para ${step.label}`}
                      </div>
                    )}
                  </button>
                  <p
                    className={`mt-3 text-xs text-center md:text-sm transition-colors font-medium ${isCompleted || isCurrent ? 'text-[#2d8659]' : 'text-gray-500'
                      }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {selectionBadges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {selectionBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <span
                    key={`${badge.label}-${index}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
                  >
                    <Icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BookingStepper;
