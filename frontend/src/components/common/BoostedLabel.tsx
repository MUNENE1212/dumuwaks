import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoostedLabelProps {
  boostLevel?: 'pro' | 'premium' | null;
  className?: string;
}

const BoostedLabel: React.FC<BoostedLabelProps> = ({ boostLevel, className }) => {
  if (!boostLevel) return null;

  const isPremium = boostLevel === 'premium';

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-1 rounded-md px-2 py-1 text-xs font-medium',
        isPremium
          ? ' bg-purple-50 text-purple-700 border border-purple-200'
          : ' bg-blue-50 text-blue-700 border border-blue-200',
        className
      )}
      title="Boosted post - Enhanced visibility"
    >
      {isPremium ? (
        <Sparkles className="h-3 w-3" />
      ) : (
        <TrendingUp className="h-3 w-3" />
      )}
      <span>Boosted</span>
    </div>
  );
};

export default BoostedLabel;
