import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, ShieldQuestion } from 'lucide-react';

/**
 * Every technician is shown as either ID-verified (an admin has checked their ID)
 * or not yet verified. The platform never claims all technicians are verified.
 */

interface VerifiableUser {
  verification?: { isVerified?: boolean; verifiedAt?: string | null };
  kyc?: { verified?: boolean };
}

export const isVerifiedTechnician = (user?: unknown): boolean => {
  const u = user as VerifiableUser | null | undefined;
  return Boolean(u?.verification?.isVerified ?? u?.kyc?.verified);
};

// `user` is any technician shape from the API; only `verification` / `kyc.verified` are read
const VerifiedBadge: React.FC<{ user?: unknown; size?: 'sm' | 'md'; className?: string }> = ({
  user,
  size = 'sm',
  className,
}) => {
  const verified = isVerifiedTechnician(user);
  const Icon = verified ? ShieldCheck : ShieldQuestion;
  return (
    <span
      className={clsx('chip', verified ? 'bg-ok/10 text-ok-ink' : 'bg-surface-300 text-ink-muted', size === 'md' && 'h-7 px-3', className)}
      title={verified ? 'Dumuwaks has checked this technician’s ID' : 'Dumuwaks has not checked this technician’s ID yet'}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {verified ? 'ID verified' : 'Not yet verified'}
    </span>
  );
};

export default VerifiedBadge;
