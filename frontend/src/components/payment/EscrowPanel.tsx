import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Check, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import socketService from '@/services/socket';
import paymentsService, { EscrowView } from '@/services/payments.service';
import { getErrorMessage } from '@/lib/errorUtils';

/**
 * Real escrow for one booking: the customer pays the full price by M-Pesa, it
 * is held by Dumuwaks, and it goes to the technician when the customer confirms
 * the work (or 3 days after completion if nothing is reported).
 */

const kes = (n?: number) => {
  const v = Number(n || 0);
  const decimals = Number.isInteger(v) ? 0 : 2;
  return `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
};
const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

interface Props {
  bookingId: string;
  role: 'customer' | 'technician' | 'staff';
  onChange?: () => void;
}

type Step = {
  label: string;
  detail?: string;
  state: 'done' | 'current' | 'todo' | 'live';
};

function steps(v: EscrowView): Step[] {
  const paid = v.collections?.find((c) => c.kind === 'initial' && c.state === 'COMPLETE');
  const extras = v.collections?.filter((c) => c.kind === 'topup' && c.state === 'COMPLETE') || [];
  const tech = v.payouts?.find((p) => p.kind === 'technician');
  const refund = v.payouts?.find((p) => p.kind === 'refund');
  const s = v.status;
  const list: Step[] = [
    {
      label: paid ? 'Paid and held by Dumuwaks' : 'Pay into escrow',
      detail: paid
        ? [paid, ...extras]
            .map(
              (c) =>
                `${c.kind === 'topup' ? '+ ' : ''}${kes(c.amount)} · M-Pesa ${c.providerRef || ''} · ${fmt(c.confirmedAt)}`,
            )
            .join('\n')
        : undefined,
      state: paid ? 'done' : 'current',
    },
    {
      label: 'Work confirmed',
      detail:
        v.autoReleaseAt && s === 'funded'
          ? `Released automatically ${fmt(v.autoReleaseAt)} unless a problem is reported`
          : undefined,
      state: ['release_pending', 'released'].includes(s) ? 'done' : paid && s === 'funded' ? 'current' : 'todo',
    },
  ];
  if (refund || ['refunding', 'refunded', 'partially_refunded'].includes(s)) {
    list.push({
      label: refund?.status === 'succeeded' ? 'Refunded to your M-Pesa' : 'Refund on its way',
      detail: refund ? `${kes(refund.amount)}${refund.providerRef ? ` · Ref ${refund.providerRef}` : ''}` : undefined,
      state: refund?.status === 'succeeded' ? 'done' : 'live',
    });
  }
  if (tech || s === 'release_pending' || s === 'released') {
    list.push({
      label: tech?.status === 'succeeded' ? 'Paid to the technician' : 'Payment to technician on its way',
      detail: tech ? `${kes(tech.amount)}${tech.providerRef ? ` · Ref ${tech.providerRef}` : ''}` : undefined,
      state: tech?.status === 'succeeded' ? 'done' : tech ? 'live' : 'todo',
    });
  } else if (!refund) {
    list.push({ label: 'Paid to the technician', state: 'todo' });
  }
  return list;
}

const EscrowPanel: React.FC<Props> = ({ bookingId, role, onChange }) => {
  const { user } = useAppSelector((s) => s.auth);
  const [view, setView] = useState<EscrowView | null>(null);
  const [phone, setPhone] = useState(user?.phoneNumber?.replace(/^\+254/, '0') || '');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [topup, setTopup] = useState({ amount: '', reason: '' });
  const [showTopup, setShowTopup] = useState(false);
  const [problem, setProblem] = useState('');
  const [showProblem, setShowProblem] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    paymentsService.config().then((c) => setReady(c.ready));
  }, []);

  const load = useCallback(async () => {
    try {
      const v = await paymentsService.escrow(bookingId);
      setView(v);
      return v;
    } catch {
      return null;
    }
  }, [bookingId]);

  useEffect(() => {
    load().then((v) => {
      // A prompt still on the customer's phone (e.g. after a page reload): keep waiting for it
      const last = v?.collections?.[v.collections.length - 1];
      if (
        last &&
        ['REQUESTING', 'PENDING', 'PROCESSING'].includes(last.state) &&
        Date.now() - new Date(last.requestedAt).getTime() < 3 * 60 * 1000
      ) {
        startWaitingRef.current?.();
      }
    });
  }, [load]);

  const stopWaiting = useCallback(() => {
    setWaiting(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  // Live updates from the server, with polling as a fallback while a prompt is out
  useEffect(() => {
    const refresh = async (data: { bookingId?: string }) => {
      if (data?.bookingId && data.bookingId !== bookingId) return;
      const v = await load();
      if (v && v.status !== 'pending' && v.status !== 'unpaid') {
        stopWaiting();
        onChange?.();
      }
    };
    const failed = () => {
      stopWaiting();
      toast.error('The M-Pesa payment was not completed. You can try again.');
      load();
    };
    socketService.on('escrow:funded', refresh);
    socketService.on('escrow:closed', refresh);
    socketService.on('escrow:collection_failed', failed);
    return () => {
      socketService.off('escrow:funded', refresh);
      socketService.off('escrow:closed', refresh);
      socketService.off('escrow:collection_failed', failed);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, load, onChange, stopWaiting]);

  const startWaitingRef = useRef<(() => void) | null>(null);
  const startWaiting = () => {
    setWaiting(true);
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      const v = await load();
      const last = v?.collections?.[v.collections.length - 1];
      if (v && (v.status === 'funded' || last?.state === 'COMPLETE')) {
        stopWaiting();
        toast.success('Payment received and held');
        onChange?.();
      } else if (last?.state === 'FAILED' || Date.now() - started > 3 * 60 * 1000) {
        stopWaiting();
        if (last?.state === 'FAILED') toast.error(last.failedReason || 'Payment not completed');
      }
    }, 5000);
  };

  startWaitingRef.current = startWaiting;

  const pay = async (topupId?: string) => {
    setBusy(true);
    try {
      if (topupId) await paymentsService.decideTopup(bookingId, topupId, true, phone);
      else await paymentsService.pay(bookingId, phone);
      toast('Check your phone and enter your M-Pesa PIN');
      startWaiting();
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const declineTopup = async (topupId: string) => {
    setBusy(true);
    try {
      await paymentsService.decideTopup(bookingId, topupId, false);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const proposeTopup = async () => {
    setBusy(true);
    try {
      await paymentsService.proposeTopup(bookingId, Number(topup.amount), topup.reason);
      toast.success('Sent to the customer');
      setShowTopup(false);
      setTopup({ amount: '', reason: '' });
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reportProblem = async () => {
    setBusy(true);
    try {
      await paymentsService.dispute(bookingId, problem);
      toast.success('Payment frozen. The Dumuwaks team will contact you.');
      setShowProblem(false);
      await load();
      onChange?.();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!view || view.provider === 'legacy') return null;

  const unpaid = view.status === 'unpaid' || view.status === 'pending';
  const amount = view.totalAmount ?? view.amountDue;
  const proposed = view.topups?.find((t) => t.status === 'proposed' || t.status === 'approved');

  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface-200" aria-label="Payment">
      <header className="border-b border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Escrow
          </p>
          <span
            className={clsx(
              'chip shrink-0',
              unpaid && 'bg-warn/10 text-warn-ink',
              view.status === 'funded' && 'bg-lumen/10 text-lumen-ink',
              view.status === 'disputed' && 'bg-fault/10 text-fault-ink',
              ['release_pending', 'refunding'].includes(view.status) && 'bg-circuit/10 text-circuit-ink',
              ['released', 'refunded', 'partially_refunded'].includes(view.status) && 'bg-ok/10 text-ok-ink',
            )}
          >
            {
              {
                unpaid: 'Awaiting payment',
                pending: 'Awaiting payment',
                funded: 'Held',
                release_pending: 'Paying out',
                released: 'Paid out',
                refunding: 'Refunding',
                refunded: 'Refunded',
                partially_refunded: 'Settled',
                disputed: 'Frozen',
                cancelled: 'Cancelled',
              }[view.status]
            }
          </span>
        </div>
        <p className="mt-3 whitespace-nowrap font-mono text-[26px] leading-none text-ink">{kes(amount)}</p>
        <p className="mt-2 text-caption text-ink-muted">
          {unpaid
            ? 'Held by Dumuwaks until the job is done — the technician is not paid before you confirm.'
            : view.status === 'disputed'
              ? 'Frozen while the Dumuwaks team reviews the problem.'
              : view.status === 'released'
                ? 'Paid out.'
                : view.status === 'release_pending'
                  ? 'Being sent to the technician now.'
                  : view.status === 'refunding'
                    ? 'Being returned to your M-Pesa now.'
                    : ['refunded', 'partially_refunded'].includes(view.status)
                      ? 'Settled.'
                      : role === 'staff'
                        ? `${kes(view.held)} in the escrow wallet after charges.`
                        : role === 'technician'
                          ? "Held for this job. You're paid when the customer confirms the work."
                          : 'Held by Dumuwaks until you confirm the work is done.'}
        </p>
      </header>

      {/* Payments not switched on yet (IntaSend keys pending) */}
      {unpaid && role === 'customer' && !ready && (
        <p className="border-b border-line p-5 text-body-sm text-warn-ink">
          M-Pesa payments are being switched on. You'll be able to pay here shortly — we'll message you on WhatsApp.
        </p>
      )}

      {/* Customer pays */}
      {unpaid && role === 'customer' && ready && (
        <div className="border-b border-line p-5">
          {waiting ? (
            <div className="flex items-start gap-3" role="status" aria-live="polite">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-lumen-ink" />
              <div>
                <p className="text-body-sm font-medium text-ink">Check your phone</p>
                <p className="text-caption text-ink-muted">
                  Enter your M-Pesa PIN on the prompt for {kes(amount)}. This page updates by itself.
                </p>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="escrow-phone" className="mb-1.5 block text-body-sm font-medium text-ink">
                M-Pesa number
              </label>
              <div className="flex flex-col gap-3">
                <input
                  id="escrow-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="input font-mono"
                />
                <button onClick={() => pay()} disabled={busy || !phone} className="btn btn-primary">
                  <Lock className="h-4 w-4" />
                  {busy ? 'Sending…' : `Pay ${kes(amount)}`}
                </button>
              </div>
              <p className="mt-3 text-caption text-ink-faint">
                Cancel more than 24 hours before and you get everything back.
              </p>
            </>
          )}
        </div>
      )}

      {unpaid && role === 'technician' && (
        <p className="border-b border-line p-5 text-body-sm text-ink-muted">
          Waiting for the customer to pay. You'll be notified, and you can start travel as soon as the money is held.
        </p>
      )}

      {/* Extra cost awaiting the customer */}
      {proposed && (
        <div className="border-b border-line bg-lumen/10 p-5">
          <p className="eyebrow">Extra cost</p>
          <p className="mt-1 text-body-sm text-ink">
            <span className="font-mono">{kes(proposed.amount)}</span> — {proposed.reason}
          </p>
          {role === 'customer' && !waiting && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => pay(proposed._id)} disabled={busy} className="btn btn-primary btn-sm">
                Approve and pay
              </button>
              {proposed.status === 'proposed' && (
                <button onClick={() => declineTopup(proposed._id)} disabled={busy} className="btn btn-ghost btn-sm">
                  Decline
                </button>
              )}
            </div>
          )}
          {role === 'technician' && <p className="mt-1 text-caption text-ink-muted">Waiting for the customer.</p>}
        </div>
      )}

      {/* Timeline */}
      {!unpaid && (
        <ol className="p-5">
          {steps(view).map((s, i, arr) => (
            <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
              {i < arr.length - 1 && (
                <span
                  aria-hidden
                  className={clsx(
                    'absolute left-[7px] top-4 h-full w-px',
                    s.state === 'done' ? 'bg-lumen' : 'bg-line-strong',
                  )}
                />
              )}
              <span
                className={clsx(
                  'relative z-10 mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center',
                  s.state === 'done' && 'bg-lumen',
                  s.state === 'live' && 'bg-circuit',
                  s.state === 'current' && 'border border-lumen bg-surface-200',
                  s.state === 'todo' && 'border border-line-strong bg-surface-200',
                )}
              >
                {s.state === 'done' && <Check className="h-2.5 w-2.5 text-on-lumen" strokeWidth={3} />}
              </span>
              <div>
                <p className={clsx('text-body-sm', s.state === 'todo' ? 'text-ink-faint' : 'text-ink')}>{s.label}</p>
                {s.detail && <p className="whitespace-pre-line font-mono text-caption text-ink-muted">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Actions while held */}
      {view.status === 'funded' && (
        <div className="flex flex-wrap gap-2 border-t border-line p-4">
          {role === 'technician' && !proposed && (
            <button onClick={() => setShowTopup((v) => !v)} className="btn btn-outline btn-sm">
              Add extra cost
            </button>
          )}
          {role !== 'staff' && (
            <button onClick={() => setShowProblem((v) => !v)} className="btn btn-ghost btn-sm text-fault-ink">
              Report a problem
            </button>
          )}
        </div>
      )}

      {showTopup && (
        <div className="space-y-3 border-t border-line p-5">
          <p className="text-caption text-ink-muted">
            Agree it with the customer first. They approve and pay it into the same escrow.
          </p>
          <input
            type="number"
            min={1}
            value={topup.amount}
            onChange={(e) => setTopup((t) => ({ ...t, amount: e.target.value }))}
            placeholder="Amount (KES)"
            className="input font-mono"
          />
          <input
            value={topup.reason}
            onChange={(e) => setTopup((t) => ({ ...t, reason: e.target.value }))}
            placeholder="What is it for? e.g. extra pipe fitting"
            className="input"
          />
          <button
            onClick={proposeTopup}
            disabled={busy || !topup.amount || topup.reason.length < 3}
            className="btn btn-primary btn-sm"
          >
            Send to customer
          </button>
        </div>
      )}

      {showProblem && (
        <div className="space-y-3 border-t border-line p-5">
          <p className="text-caption text-ink-muted">
            This freezes the payment — nobody is paid until the Dumuwaks team has spoken to you both.
          </p>
          <textarea
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="What went wrong?"
            className="input h-auto py-2.5"
          />
          <button
            onClick={reportProblem}
            disabled={busy || problem.trim().length < 5}
            className="btn btn-sm bg-fault text-on-lumen"
          >
            Freeze payment
          </button>
        </div>
      )}
    </section>
  );
};

export default EscrowPanel;
