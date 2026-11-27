/**
 * Traction Panel
 *
 * The numbers reviewed every Friday: technicians onboarded and verified,
 * completed jobs per week, repeat customers, in-app payment share and
 * platform revenue. Figures come from GET /admin/analytics/traction.
 *
 * @module components/admin/TractionPanel
 */

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { getTraction } from '@/services/analytics.service';
import type { TractionData } from '@/types/analytics';
import { getErrorMessage } from '@/lib/errorUtils';

const percent = (value: number | null) =>
  value === null ? '—' : `${Math.round(value * 100)}%`;

const kes = (amount: number) =>
  `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const shortDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

const Stat: React.FC<{ label: string; value: React.ReactNode; note?: string }> = ({ label, value, note }) => (
  <div className="bg-surface-100 p-5">
    <p className="eyebrow">{label}</p>
    <p className="mt-2 font-mono text-[22px] leading-none text-ink">{value}</p>
    {note && <p className="mt-2 text-body-sm text-ink-muted">{note}</p>}
  </div>
);

const TractionPanel: React.FC = () => {
  const [data, setData] = useState<TractionData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTraction(12));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perWeek = data?.completedJobs.perWeek ?? [];
  const thisWeek = perWeek.length ? perWeek[perWeek.length - 1].count : 0;
  const busiestWeek = Math.max(1, ...perWeek.map((w) => w.count));
  const months = data?.platformRevenueByMonth ?? [];
  const revenueThisMonth = months.length ? months[months.length - 1].amountKes : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics · weekly review</p>
          <h1 className="mt-2 text-title">Traction</h1>
          {data && (
            <p className="mt-1 text-body-sm text-ink-muted">
              As of {new Date(data.asOf).toLocaleString('en-KE')} · weeks start Monday, East Africa Time
            </p>
          )}
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh" disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading && !data && <p className="text-body-sm text-ink-muted">Loading traction figures…</p>}

      {data && (
        <>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Verified technicians"
              value={data.technicians.verified}
              note={`${data.technicians.registered} registered`}
            />
            <Stat label="Registered customers" value={data.customers.registered} />
            <Stat
              label="Completed jobs this week"
              value={thisWeek}
              note={`${data.completedJobs.inWindow} in the last ${data.weeks} weeks · ${data.completedJobs.total} all time`}
            />
            <Stat
              label="Repeat customers"
              value={percent(data.repeatCustomerRate)}
              note="Customers with 2+ completed jobs, of those with 1+"
            />
            <Stat
              label="Paid through escrow"
              value={percent(data.inAppPaymentShare)}
              note={`Completed jobs in the last ${data.weeks} weeks`}
            />
            <Stat
              label="Platform revenue this month"
              value={kes(revenueThisMonth)}
            />
          </div>

          <section aria-label="Completed jobs per week">
            <h2 className="eyebrow">Completed jobs per week</h2>
            <div className="mt-4 flex h-40 items-end gap-2 border-b border-line">
              {perWeek.map((w) => (
                <div key={w.weekStart} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="font-mono text-[11px] text-ink-muted">{w.count}</span>
                  <div
                    className="w-full bg-lumen"
                    style={{ height: `${(w.count / busiestWeek) * 100}%`, minHeight: w.count ? 2 : 0 }}
                    title={`Week of ${shortDate(w.weekStart)}: ${w.count}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              {perWeek.map((w) => (
                <span key={w.weekStart} className="flex-1 text-center font-mono text-[10px] text-ink-muted">
                  {shortDate(w.weekStart)}
                </span>
              ))}
            </div>
          </section>

          {data.platformRevenueByMonth && (
            <section aria-label="Platform revenue by month">
              <h2 className="eyebrow">Platform revenue by month</h2>
              <table className="mt-3 w-full text-body-sm">
                <tbody>
                  {data.platformRevenueByMonth.map((m) => (
                    <tr key={m.month} className="border-b border-line">
                      <td className="py-2 text-ink-muted">{m.month}</td>
                      <td className="py-2 text-right font-mono text-ink">{kes(m.amountKes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <p className="text-body-sm text-ink-muted">
            Public, revenue-free figures are served at <code className="font-mono">/api/v1/public/traction</code> for
            the founder's portfolio and pitch material.
          </p>
        </>
      )}
    </div>
  );
};

export default TractionPanel;
