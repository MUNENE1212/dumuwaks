import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  className,
  threshold = 100
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotate = useTransform(y, [0, threshold], [0, 360]);
  const opacity = useTransform(y, [0, threshold], [0, 1]);
  const indicatorY = useTransform(y, [0, 120], [-60, 0]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        y.set(0);
      }, 500);
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Refresh Indicator */}
      <motion.div
        style={{ y: indicatorY }}
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center h-16 pointer-events-none"
      >
        <motion.div
          style={{ rotate, opacity }}
          className="bg-primary-900 p-3 rounded-full shadow-lg"
        >
          <RefreshCw className={cn(
            'h-6 w-6 text-primary-400',
            isRefreshing && 'animate-spin'
          )} />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={containerRef}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 120 }}
        dragElastic={0.1}
        onDragEnd={async (_, info) => {
          if (info.offset.y > threshold && !isRefreshing) {
            await handleRefresh();
          } else {
            y.set(0);
          }
        }}
        className="touch-auto"
      >
        {children}
      </motion.div>
    </div>
  );
};
