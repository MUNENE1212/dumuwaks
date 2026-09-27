import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { getNotificationPreferences, updateNotificationPreferences } from '@/services/notification.service';
import { WhatsAppGlyph } from '@/components/common/WhatsAppButton';

/** Booking and payment updates on WhatsApp — on by default, same as sending STOP/START in the chat. */
const WhatsAppUpdatesCard: React.FC<{ phoneNumber?: string }> = ({ phoneNumber }) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then((res) => setEnabled(res?.preferences?.whatsapp !== false))
      .catch(() => setEnabled(true));
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    const next = !enabled;
    setSaving(true);
    setEnabled(next);
    try {
      await updateNotificationPreferences({ whatsappNotifications: next });
      toast.success(next ? 'WhatsApp updates on' : 'WhatsApp updates off');
    } catch {
      setEnabled(!next);
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-line bg-surface-200 p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-2 text-heading">
            <WhatsAppGlyph className="h-5 w-5 text-whatsapp" />
            WhatsApp updates
          </h2>
          <p className="mt-2 max-w-md text-body-sm text-ink-muted">
            Booking and M-Pesa updates sent to{' '}
            <span className="font-mono text-ink">{phoneNumber || 'your account number'}</span>: accepted, on the way,
            work done, payment received.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(enabled)}
          aria-label="WhatsApp updates"
          onClick={toggle}
          disabled={enabled === null || saving}
          className={clsx(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
            enabled ? 'border-lumen bg-lumen' : 'border-line-strong bg-surface-300'
          )}
        >
          <span
            className={clsx(
              'inline-block h-5 w-5 rounded-full transition-transform',
              enabled ? 'translate-x-6 bg-on-lumen' : 'translate-x-1 bg-ink-muted'
            )}
          />
        </button>
      </div>
    </section>
  );
};

export default WhatsAppUpdatesCard;
