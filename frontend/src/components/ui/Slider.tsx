import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

/**
 * Slider component for range input
 *
 * @example
 * ```tsx
 * <Slider
 *   min={0}
 *   max={100}
 *   value={value}
 *   onChange={setValue}
 *   label="Price Range"
 *   showValue
 *   formatValue={(v) => `KES ${v}`}
 * />
 * ```
 */
const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value: controlledValue,
      onChange,
      label,
      showValue = false,
      formatValue,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(min);
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    };

    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <label className="text-sm font-medium text-ink-muted">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-primary-500">
                {formatValue ? formatValue(value) : value}
              </span>
            )}
          </div>
        )}

        <div className="relative h-6 flex items-center">
          {/* Track */}
          <div className="absolute w-full h-2 bg-surface-200 rounded-full overflow-hidden">
            {/* Fill */}
            <div
              className="h-full bg-gradient-primary rounded-full transition-all duration-150"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Input */}
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'relative w-full h-2 bg-transparent appearance-none cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Thumb styling
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface-200 [&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500',
              '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-surface-200 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-500',
              '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110',
              disabled && '[&::-webkit-slider-thumb]:bg-line-strong [&::-moz-range-thumb]:bg-line-strong',
              className
            )}
            {...props}
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between mt-1 text-xs text-ink-muted">
          <span>{formatValue ? formatValue(min) : min}</span>
          <span>{formatValue ? formatValue(max) : max}</span>
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
