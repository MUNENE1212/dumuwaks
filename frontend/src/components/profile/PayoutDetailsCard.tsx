import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Landmark, Smartphone } from 'lucide-react';
import paymentsService, { Bank, PayoutDestinationView } from '@/services/payments.service';
import { getErrorMessage } from '@/lib/errorUtils';

/**
 * Where a technician is paid. Saving needs a 6-digit code sent to the
 * receiving M-Pesa line (or the account phone for a bank). A change of
 * existing details pauses payouts for 24 hours.
 */
const PayoutDetailsCard: React.FC = () => {
  const [view, setView] = useState<PayoutDestinationView | null>(null);
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [phone, setPhone] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    paymentsService
      .payoutDestination()
      .then(setView)
      .catch(() => setView({ current: null, pending: null }));
  }, []);

  useEffect(() => {
    if (editing && method === 'bank' && !banks.length) {
      paymentsService
        .banks()
        .then((list) => setBanks([...list].sort((a, b) => a.bank_name.localeCompare(b.bank_name))))
        .catch(() => toast.error('Bank list unavailable right now'));
    }
  }, [editing, method, banks.length]);

  const request = async () => {
    setBusy(true);
    try {
      const res = await paymentsService.requestPayoutDestination(
        method === 'mpesa' ? { method, phone } : { method, ...bank },
      );
      setSentTo(res.sentTo);
      toast(`Code sent to ${res.sentTo}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      setView(await paymentsService.verifyPayoutDestination(code));
      toast.success('Payout details saved');
      setEditing(false);
      setSentTo(null);
      setCode('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const current = view?.current;
  const heldUntil =
    current?.payoutsHeldUntil && new Date(current.payoutsHeldUntil) > new Date() ? current.payoutsHeldUntil : null;

  return (
    <section className="rounded-md border border-line bg-surface-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-heading">Payout details</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            Where your job payments are sent when a customer confirms the work.
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-outline btn-sm shrink-0">
            {current ? 'Change' : 'Add'}
          </button>
        )}
      </div>

      {!editing && (
        <div className="mt-5">
          {current ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="eyebrow">{current.method === 'mpesa' ? 'M-Pesa' : current.bankName}</dt>
                <dd className="mt-1 font-mono text-spec text-ink">
                  {current.method === 'mpesa' ? current.phone : current.accountNumber}
                </dd>
              </div>
              {current.accountName && (
                <div>
                  <dt className="eyebrow">Account name</dt>
                  <dd className="mt-1 text-body-sm text-ink">{current.accountName}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="rounded-sm border border-warn/40 bg-warn/10 p-3 text-body-sm text-warn-ink">
              Add payout details so we can pay you. Payments wait here until you do.
            </p>
          )}
          {heldUntil && (
            <p className="mt-4 text-caption text-warn-ink">
              Details changed recently: payouts are paused until{' '}
              {new Date(heldUntil).toLocaleString('en-KE', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              for your safety.
            </p>
          )}
        </div>
      )}

      {editing && !sentTo && (
        <div className="mt-5 space-y-4">
          <div role="radiogroup" aria-label="Payout method" className="grid grid-cols-2 gap-2">
            {(
              [
                ['mpesa', 'M-Pesa', Smartphone],
                ['bank', 'Bank (PesaLink)', Landmark],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="radio"
                aria-checked={method === key}
                onClick={() => setMethod(key)}
                className={clsx(
                  'flex h-12 items-center justify-center gap-2 rounded-md border text-body-sm font-medium',
                  method === key
                    ? 'border-lumen bg-lumen/10 text-ink'
                    : 'border-line-strong text-ink-muted hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {method === 'mpesa' ? (
            <div>
              <label htmlFor="payout-phone" className="mb-1.5 block text-body-sm font-medium text-ink">
                M-Pesa number
              </label>
              <input
                id="payout-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="input font-mono"
              />
              <p className="mt-1.5 text-caption text-ink-muted">We send a code to this number to confirm it's yours.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="payout-bank" className="mb-1.5 block text-body-sm font-medium text-ink">
                  Bank
                </label>
                <select
                  id="payout-bank"
                  value={bank.bankCode}
                  onChange={(e) => setBank((b) => ({ ...b, bankCode: e.target.value }))}
                  className="input"
                >
                  <option value="">Choose your bank</option>
                  {banks.map((b) => (
                    <option key={b.bank_code} value={b.bank_code}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={bank.accountNumber}
                onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))}
                placeholder="Account number"
                inputMode="numeric"
                className="input font-mono"
              />
              <input
                value={bank.accountName}
                onChange={(e) => setBank((b) => ({ ...b, accountName: e.target.value }))}
                placeholder="Account name, exactly as the bank has it"
                className="input"
              />
              <p className="text-caption text-ink-muted">We send a code to your account phone to confirm the change.</p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={request} disabled={busy} className="btn btn-primary btn-sm">
              {busy ? 'Sending…' : 'Send code'}
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
          {current && <p className="text-caption text-ink-faint">Changing details pauses payouts for 24 hours.</p>}
        </div>
      )}

      {editing && sentTo && (
        <div className="mt-5 space-y-3">
          <label htmlFor="payout-code" className="block text-body-sm font-medium text-ink">
            Code sent to <span className="font-mono">{sentTo}</span>
          </label>
          <input
            id="payout-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="input w-40 text-center font-mono text-lead tracking-[0.3em]"
          />
          <div className="flex gap-2">
            <button onClick={verify} disabled={busy || code.length !== 6} className="btn btn-primary btn-sm">
              Confirm
            </button>
            <button onClick={() => setSentTo(null)} className="btn btn-ghost btn-sm">
              Back
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PayoutDetailsCard;
