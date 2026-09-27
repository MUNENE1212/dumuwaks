import React from 'react';
import { Crown, Zap, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subscription } from '@/types';

interface ProBadgeProps {
  subscription?: Subscription;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ProBadge: React.FC<ProBadgeProps> = ({
  subscription,
  size = 'md',
  showLabel = true,
  className
}) => {
  // Check if user has active pro/premium subscription
  const isPro = subscription?.plan && ['pro', 'premium'].includes(subscription.plan);
  const isActive = subscription?.status === 'active';
  const notExpired = !subscription?.endDate || new Date(subscription.endDate) > new Date();

  if (!isPro || !isActive || !notExpired) {
    return null;
  }

  const isPremium = subscription.plan === 'premium';

  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'h-3 w-3'
    },
    md: {
      container: 'px-3 py-1 text-sm',
      icon: 'h-4 w-4'
    },
    lg: {
      container: 'px-4 py-1.5 text-base',
      icon: 'h-5 w-5'
    }
  };

  const badgeConfig = isPremium
    ? {
        label: 'Premium',
        icon: Crown,
        gradient: ' bg-purple-600',
        textColor: 'text-ink',
        glowColor: 'shadow-purple-500/50'
      }
    : {
        label: 'Pro',
        icon: Zap,
        gradient: ' bg-blue-600',
        textColor: 'text-ink',
        glowColor: 'shadow-blue-500/50'
      };

  const Icon = badgeConfig.icon;
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-1 rounded-full font-semibold',
        badgeConfig.gradient,
        badgeConfig.textColor,
        sizes.container,
        'shadow-lg',
        badgeConfig.glowColor,
        'animate-pulse-slow',
        className
      )}
      title={`${badgeConfig.label} Verified Technician - Enhanced visibility and features`}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{badgeConfig.label}</span>}
      <CheckCircle className={sizes.icon} />
    </div>
  );
};

export default ProBadge;
