import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
  delay?: number;
}

/**
 * Tooltip component for displaying helpful information
 *
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip" placement="top">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  children,
  className,
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  // Position tooltip
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left + scrollX - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + scrollX + 8;
          break;
      }

      tooltipRef.current.style.top = `${top}px`;
      tooltipRef.current.style.left = `${left}px`;
    }
  }, [isVisible, placement]);

  // Clone child and add ref and event handlers
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    'aria-describedby': isVisible ? 'tooltip-content' : undefined,
  });

  return (
    <>
      {trigger}
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={cn(
            'fixed z-tooltip px-3 py-2 max-w-xs',
            'bg-surface-300',
            'text-ink text-ink',
            'text-sm font-medium rounded-lg',
            'pointer-events-none',
            'animate-fade-in',
            className
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-2 h-2 bg-surface-300 rotate-45',
              {
                'bottom-[-4px] left-1/2 -translate-x-1/2': placement === 'top',
                'top-[-4px] left-1/2 -translate-x-1/2': placement === 'bottom',
                'right-[-4px] top-1/2 -translate-y-1/2': placement === 'left',
                'left-[-4px] top-1/2 -translate-y-1/2': placement === 'right',
              }
            )}
          />
        </div>
      )}
    </>
  );
};

Tooltip.displayName = 'Tooltip';
