/**
 * TractionPanel Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/setup';
import TractionPanel from './TractionPanel';
import type { TractionData } from '@/types/analytics';

const getTraction = vi.fn();

vi.mock('@/services/analytics.service', () => ({
  getTraction: (...args: unknown[]) => getTraction(...args),
}));

const sample: TractionData = {
  asOf: '2026-11-26T09:00:00.000Z',
  weeks: 12,
  technicians: { registered: 18, verified: 11 },
  customers: { registered: 42 },
  completedJobs: {
    total: 30,
    inWindow: 25,
    perWeek: [
      { weekStart: '2026-11-16', count: 4 },
      { weekStart: '2026-11-23', count: 7 },
    ],
  },
  repeatCustomerRate: 0.25,
  inAppPaymentShare: null,
  platformRevenueByMonth: [
    { month: '2026-10', amountKes: 0 },
    { month: '2026-11', amountKes: 1450 },
  ],
};

describe('TractionPanel', () => {
  beforeEach(() => {
    getTraction.mockReset();
  });

  it('shows the weekly review figures', async () => {
    getTraction.mockResolvedValue(sample);

    render(<TractionPanel />);

    await waitFor(() => expect(screen.getByText('Verified technicians')).toBeInTheDocument());
    expect(getTraction).toHaveBeenCalledWith(12);
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('18 registered')).toBeInTheDocument();
    // this week's completed jobs is the last week in the series
    expect(screen.getByText('Completed jobs this week').nextSibling).toHaveTextContent('7');
    expect(screen.getByText('25%')).toBeInTheDocument();
    // no escrow data yet is shown as a dash, not 0%
    expect(screen.getByText('Paid through escrow').nextSibling).toHaveTextContent('—');
    expect(screen.getByText('Platform revenue this month').nextSibling).toHaveTextContent('KES 1,450');
  });

  it('shows a loading message before data arrives', () => {
    getTraction.mockReturnValue(new Promise(() => {}));

    render(<TractionPanel />);

    expect(screen.getByText('Loading traction figures…')).toBeInTheDocument();
  });
});
