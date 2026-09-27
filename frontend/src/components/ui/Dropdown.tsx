import React, {
  useState,
  useRef,
  useEffect,
  ButtonHTMLAttributes,
  forwardRef,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  triggerClassName?: string;
}

/**
 * Dropdown/Select component
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'option1', label: 'Option 1' },
 *   { value: 'option2', label: 'Option 2' },
 * ];
 * <Dropdown
 *   options={options}
 *   value={value}
 *   onChange={setValue}
 *   placeholder="Select an option"
 * />
 * ```
 */
const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  (
    {
      className,
      options,
      value,
      onChange,
      placeholder = 'Select...',
      label,
      error,
      triggerClassName,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const internalButtonRef = useRef<HTMLButtonElement>(null) as React.MutableRefObject<HTMLButtonElement | null>;

    // Create a stable ref callback using useCallback
    const setRef = useCallback((node: HTMLButtonElement | null) => {
      // Store locally for our own use
      internalButtonRef.current = node;
      // Forward to parent ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        // For mutable refs, we need to be careful about readonly
        // This is a TypeScript limitation - we'll use type assertion
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    }, [ref]);

    const selectedOption = options.find((opt) => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
      if (isOpen && !disabled) {
        const firstOption = dropdownRef.current?.querySelector(
          '[role="option"]:not([disabled])'
        ) as HTMLElement;
        firstOption?.focus();
      }
    }, [isOpen, disabled]);

    const handleSelect = (optionValue: string) => {
      const option = options.find((opt) => opt.value === optionValue);
      if (option && !option.disabled) {
        onChange?.(optionValue);
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        // Handle arrow key navigation
        const options = Array.from(
          dropdownRef.current?.querySelectorAll('[role="option"]:not([disabled])') || []
        );
        const currentIndex = options.indexOf(document.activeElement as HTMLElement);
        const nextIndex =
          e.key === 'ArrowDown'
            ? Math.min(currentIndex + 1, options.length - 1)
            : Math.max(currentIndex - 1, 0);
        (options[nextIndex] as HTMLElement)?.focus();
      }
    };

    return (
      <div className="w-full" ref={dropdownRef}>
        {label && (
          <label className="label mb-2 block text-sm font-medium text-ink-muted">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Trigger */}
          <button
            ref={setRef}
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              'w-full min-h-[48px] px-4 py-3 rounded-xl border transition-all duration-200',
              'flex items-center justify-between gap-2',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20 dark:border-error-400'
                : 'focus:ring-primary-500/20 border-line focus:border-primary-400',
              'bg-surface-100',
              'text-ink',
              isOpen && 'ring-2 ring-primary-500 ring-offset-2',
              triggerClassName
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            {...props}
          >
            <span className="flex items-center gap-2 flex-1 truncate">
              {selectedOption?.icon && <span>{selectedOption.icon}</span>}
              <span className={cn(!selectedOption && 'text-ink-muted')}>
                {selectedOption?.label || placeholder}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-ink-muted transition-transform duration-200 flex-shrink-0',
                isOpen && 'transform rotate-180'
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              className="absolute z-dropdown w-full mt-2 bg-surface-100 border border-line rounded-xl shadow-lg overflow-hidden"
              role="listbox"
              aria-activedescendant={value ? `option-${value}` : undefined}
            >
              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {options.map((option) => (
                  <div
                    key={option.value}
                    id={`option-${option.value}`}
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => handleSelect(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                    className={cn(
                      'px-4 py-3 cursor-pointer transition-colors duration-150 min-h-[48px] flex items-center gap-2',
                      'focus:outline-none focus:bg-surface-200',
                      value === option.value
                        ? 'bg-primary-950 text-primary-300'
                        : 'text-ink-muted hover:bg-surface-200',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    tabIndex={option.disabled ? -1 : 0}
                  >
                    {option.icon && <span>{option.icon}</span>}
                    <span className="flex-1">{option.label}</span>
                    {value === option.value && (
                      <Check className="w-5 h-5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-error-500 dark:text-error-400 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export { Dropdown };
