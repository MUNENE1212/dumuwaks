import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: React.ReactNode; label: string; color: string };
  rightAction?: { icon: React.ReactNode; label: string; color: string };
  className?: string;
  swipeThreshold?: number;
}

export const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  swipeThreshold = 100
}: SwipeableCardProps) => {
  const x = useMotionValue(0);
  const [isDragged, setIsDragged] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > swipeThreshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -swipeThreshold && onSwipeLeft) {
      onSwipeLeft();
    }

    setIsDragged(false);
  };

  const opacityLeft = useTransform(x, [-150, 0], [1, 0]);
  const opacityRight = useTransform(x, [0, 150], [0, 1]);

  return (
    <div className={cn('relative', className)}>
      {/* Left Action Background */}
      {leftAction && (
        <motion.div
          style={{ opacity: opacityLeft }}
          className={cn(
            'absolute inset-0 flex items-center justify-start px-6 text-ink rounded-2xl',
            leftAction.color
          )}
        >
          <div className="flex items-center gap-2">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <motion.div
          style={{ opacity: opacityRight }}
          className={cn(
            'absolute inset-0 flex items-center justify-end px-6 text-ink rounded-2xl',
            rightAction.color
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}

      {/* Card Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsDragged(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileTap={{ scale: 0.98 }}
        className="relative bg-surface-100 rounded-2xl shadow-lg touch-pan-x"
      >
        {children}

        {/* Visual indicators */}
        {!isDragged && (leftAction || rightAction) && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <ChevronLeft className="h-8 w-8 text-ink-muted" />
          </div>
        )}

        {!isDragged && (leftAction || rightAction) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronRight className="h-8 w-8 text-ink-muted" />
          </div>
        )}
      </motion.div>
    </div>
  );
};
