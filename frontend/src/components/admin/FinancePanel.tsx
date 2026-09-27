import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import paymentsService, {
  AdminEscrowRow,
  AdminPayout,
  EscrowView,
  FinanceOverview,
  LedgerRow,
} from '@/services/payments.service';
import { getErrorMessage } from '@/lib/errorUtils';

const kes = (n?: number | null) =>
  n === null || n === undefined ? '—' : `KES ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const PAYOUT_TABS = [
  { key: 'needs_review', label: 'Needs approval' },
  { key: 'processing,initiated', label: 'In flight' },
  { key: 'failed', label: 'Failed' },
  { key: 'succeeded', label: 'Paid' },
];

const ESCROW_TABS = [
  { key: 'funded', label: 'Held' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'release_pending,refunding', label: 'Paying out' },
  { key: 'released,refunded,partially_refunded', label: 'Closed' },
];

const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'fault' | 'warn';
}> = ({ label, value, tone }) => (
  <div className="bg-surface-100 p-5">
    <p className="eyebrow">{label}</p>
    <p
      className={clsx(
        'mt-2 font-mono text-[22px] leading-none',
        tone === 'fault'
          ? 'text-fault-ink'
          : tone === 'warn'
            ? 'text-warn-ink'
            : tone === 'ok'
              ? 'text-ok-ink'
              : 'text-ink',
      )}
    >
      {value}
    </p>
  </div>
);

const FinancePanel: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === 'admin';
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [payoutTab, setPayoutTab] = useState(PAYOUT_TABS[0].key);
  const [escrowTab, setEscrowTab] = useState(ESCROW_TABS[0].key);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [escrows, setEscrows] = useState<AdminEscrowRow[]>([]);
  const [detail, setDetail] = useState<(EscrowView & { ledger: LedgerRow[] }) | null>(null);
  const [share, setShare] = useState('50');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, p, e] = await Promise.all([
        paymentsService.financeOverview(),
        paymentsService.financePayouts(payoutTab),
        paymentsService.financeEscrows(escrowTab),
      ]);
      setOverview(o);
      setPayouts(p);
      setEscrows(e);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [payoutTab, escrowTab]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
      if (detail?._id) setDetail(await paymentsService.escrowDetail(detail._id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const drift = overview?.drift;
  const driftTone = drift === null || drift === undefined ? undefined : Math.abs(drift) <= 1 ? 'ok' : 'fault';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Finance · IntaSend {overview?.env}</p>
          <h1 className="mt-2 text-title">Escrow & payouts</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => act(paymentsService.runReconciliation, 'Reconciliation run')}
              disabled={busy}
              className="btn btn-outline btn-sm"
            >
              Reconcile now
            </button>
          )}
        </div>
      </div>

      {overview && !overview.configured && (
        <p className="rounded-md border border-warn/40 bg-warn/10 p-4 text-body-sm text-warn-ink">
          Payments are not configured on the server. See docs/PAYMENTS.md.
        </p>
      )}

      <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Held (ledger)" value={kes(overview?.held)} />
        <Stat
          label="Escrow wallet"
          value={overview?.wallet?.error ? 'unreachable' : kes(overview?.wallet?.available)}
          tone={overview?.wallet?.error ? 'fault' : undefined}
        />
        <Stat label="Difference" value={drift === null || drift === undefined ? '—' : kes(drift)} tone={driftTone} />
        <Stat
          label="Payouts to approve"
          value={overview?.payoutsNeedingReview ?? '—'}
          tone={overview?.payoutsNeedingReview ? 'warn' : undefined}
        />
      </div>
      {overview?.lastReconciliation && (
        <p className="-mt-5 text-caption text-ink-muted">
          Last reconciliation {when(overview.lastReconciliation.createdAt)}:{' '}
          <span className={overview.lastReconciliation.ok ? 'text-ok-ink' : 'text-fault-ink'}>
            {overview.lastReconciliation.ok
              ? 'balanced'
              : overview.lastReconciliation.error || `off by ${kes(overview.lastReconciliation.drift)}`}
          </span>
          . Payouts above {kes(overview.approvalThreshold)} need approval.
        </p>
      )}

      {/* Payouts */}
      <section>
        <div role="tablist" className="flex gap-6 border-b border-line">
          {PAYOUT_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={payoutTab === t.key}
              onClick={() => setPayoutTab(t.key)}
              className={clsx(
                'relative h-11 text-body-sm font-medium',
                payoutTab === t.key
                  ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lumen'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-left text-body-sm">
            <thead className="bg-surface-000">
              <tr className="eyebrow">
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="bg-surface-100 px-4 py-6 text-center text-ink-muted">
                    Nothing here.
                  </td>
                </tr>
              )}
              {payouts.map((p) => (
                <tr key={p._id} className="border-t border-line bg-surface-100 align-top">
                  <td className="px-4 py-3 font-mono text-spec">{p.booking?.bookingNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="block text-ink">
                      {p.kind === 'refund'
                        ? 'Customer refund'
                        : p.kind.startsWith('platform')
                          ? 'Platform wallet'
                          : `${p.recipient?.firstName || ''} ${p.recipient?.lastName || ''}`}
                    </span>
                    <span className="block font-mono text-caption text-ink-muted">
                      {p.destination?.method === 'bank'
                        ? `${p.destination.bankName} ${p.destination.accountNumber}`
                        : p.destination?.phone || ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-spec text-ink">{kes(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="block text-ink">{p.status.replace('_', ' ')}</span>
                    {(p.reviewReason || p.failureReason) && (
                      <span className="block text-caption text-warn-ink">{p.reviewReason || p.failureReason}</span>
                    )}
                    {p.providerRef && (
                      <span className="block font-mono text-caption text-ink-muted">{p.providerRef}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && ['needs_review', 'failed'].includes(p.status) && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Send ${kes(p.amount)} now? If the note says "outcome unknown", check the IntaSend dashboard first.`,
                            )
                          ) {
                            act(() => paymentsService.approvePayout(p._id), 'Payout approved');
                          }
                        }}
                        disabled={busy}
                        className="btn btn-primary btn-sm"
                      >
                        Approve
                      </button>
                    )}
                    {['processing', 'initiated'].includes(p.status) && (
                      <button
                        onClick={() => act(() => paymentsService.refreshPayout(p._id), 'Checked with IntaSend')}
                        disabled={busy}
                        className="btn btn-ghost btn-sm"
                      >
                        Check
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Escrows */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div role="tablist" className="flex gap-6 border-b border-line">
            {ESCROW_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={escrowTab === t.key}
                onClick={() => setEscrowTab(t.key)}
                className={clsx(
                  'relative h-11 text-body-sm font-medium',
                  escrowTab === t.key
                    ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lumen'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <ul className="mt-4 overflow-hidden rounded-md border border-line">
            {escrows.length === 0 && (
              <li className="bg-surface-100 p-6 text-center text-body-sm text-ink-muted">Nothing here.</li>
            )}
            {escrows.map((e) => (
              <li key={e._id} className="border-b border-line last:border-b-0">
                <button
                  onClick={async () => setDetail(await paymentsService.escrowDetail(e._id))}
                  className={clsx(
                    'flex w-full items-center justify-between gap-4 px-4 py-3 text-left',
                    detail?._id === e._id ? 'bg-lumen/10' : 'bg-surface-100 hover:bg-surface-200',
                  )}
                >
                  <span>
                    <span className="block font-mono text-spec text-ink">{e.booking?.bookingNumber}</span>
                    <span className="block text-caption text-ink-muted">
                      {e.customer?.firstName} → {e.technician?.firstName} · {e.status.replace('_', ' ')}
                    </span>
                  </span>
                  <span className="font-mono text-spec text-ink">{kes(e.totalAmount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-line bg-surface-200">
          {!detail ? (
            <p className="p-8 text-center text-body-sm text-ink-muted">Pick an escrow to see its ledger.</p>
          ) : (
            <div>
              <div className="flex items-start justify-between border-b border-line p-5">
                <div>
                  <p className="eyebrow">{detail.status.replace('_', ' ')}</p>
                  <p className="mt-1 font-mono text-[22px] text-ink">{kes(detail.totalAmount)}</p>
                  <p className="text-caption text-ink-muted">Held now {kes(detail.held)}</p>
                </div>
              </div>
              <table className="w-full text-left text-body-sm">
                <tbody>
                  {detail.ledger.map((l) => (
                    <tr key={l._id} className="border-b border-line">
                      <td className="px-5 py-2 text-ink">{l.kind.replace(/_/g, ' ')}</td>
                      <td
                        className={clsx(
                          'px-5 py-2 text-right font-mono',
                          l.direction === 'in' ? 'text-ok-ink' : 'text-ink',
                        )}
                      >
                        {l.direction === 'in' ? '+' : '−'}
                        {kes(l.amount).replace('KES ', '')}
                      </td>
                      <td className="px-5 py-2 font-mono text-caption text-ink-muted">{l.providerRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.status === 'disputed' && isAdmin && (
                <div className="space-y-3 p-5">
                  <p className="eyebrow">Resolve dispute</p>
                  {detail.dispute?.reason && <p className="text-body-sm text-ink">“{detail.dispute.reason}”</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        act(
                          () => paymentsService.resolveDispute(detail._id!, 'technician_favor'),
                          'Released to technician',
                        )
                      }
                      disabled={busy}
                      className="btn btn-outline btn-sm"
                    >
                      Pay technician
                    </button>
                    <button
                      onClick={() =>
                        act(() => paymentsService.resolveDispute(detail._id!, 'customer_favor'), 'Refunded to customer')
                      }
                      disabled={busy}
                      className="btn btn-outline btn-sm"
                    >
                      Refund customer
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={share}
                      onChange={(e) => setShare(e.target.value)}
                      className="input w-24 font-mono"
                      aria-label="Technician share percent"
                    />
                    <span className="text-body-sm text-ink-muted">% to technician</span>
                    <button
                      onClick={() =>
                        act(
                          () => paymentsService.resolveDispute(detail._id!, 'split', Number(share) / 100),
                          'Split paid out',
                        )
                      }
                      disabled={busy || !(Number(share) > 0 && Number(share) < 100)}
                      className="btn btn-primary btn-sm"
                    >
                      Split
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FinancePanel;
