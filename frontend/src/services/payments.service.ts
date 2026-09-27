import axios from '@/lib/axios';

export type EscrowStatus =
  | 'unpaid'
  | 'pending'
  | 'funded'
  | 'release_pending'
  | 'released'
  | 'refunding'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'cancelled';

export interface EscrowCollection {
  _id: string;
  kind: 'initial' | 'topup';
  amount: number;
  state: 'REQUESTING' | 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  providerRef?: string;
  phone?: string;
  requestedAt: string;
  confirmedAt?: string;
  failedReason?: string;
}

export interface EscrowTopup {
  _id: string;
  amount: number;
  reason: string;
  status: 'proposed' | 'approved' | 'rejected' | 'paid';
  proposedAt: string;
}

export interface EscrowPayout {
  _id: string;
  kind: 'technician' | 'refund' | 'platform_share' | 'platform_topup';
  amount: number;
  status: 'queued' | 'needs_review' | 'initiated' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  providerRef?: string;
  completedAt?: string;
  method?: 'mpesa' | 'bank' | 'wallet';
  reviewReason?: string;
  failureReason?: string;
}

export interface EscrowView {
  _id?: string;
  status: EscrowStatus;
  provider?: 'legacy' | 'intasend';
  amountDue?: number;
  canPay?: boolean;
  totalAmount?: number;
  platformFee?: number;
  tax?: number;
  technicianPayout?: number;
  held?: number;
  fundedAt?: string;
  autoReleaseAt?: string | null;
  collections?: EscrowCollection[];
  topups?: EscrowTopup[];
  payouts?: EscrowPayout[];
  dispute?: { reason?: string; openedAt?: string; resolution?: string };
}

export interface PayoutDestinationView {
  current: null | {
    method: 'mpesa' | 'bank';
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    verifiedAt?: string;
    changedAt?: string;
    payoutsHeldUntil?: string | null;
  };
  pending: null | { method: 'mpesa' | 'bank'; expires: string };
}

export interface Bank {
  bank_name: string;
  bank_code: string;
}


export interface FinanceOverview {
  env: 'sandbox' | 'live';
  configured: boolean;
  held: number;
  wallet: { available?: number; current?: number; error?: string } | null;
  drift: number | null;
  escrows: Record<string, { count: number; amount: number }>;
  payoutsNeedingReview: number;
  payoutsFailed: number;
  lastReconciliation: { ok: boolean; drift?: number; createdAt: string; error?: string } | null;
  approvalThreshold: number;
}

export interface AdminPayout extends EscrowPayout {
  escrow: string;
  recipient?: { firstName: string; lastName: string; phoneNumber?: string };
  booking?: { bookingNumber: string };
  destination?: { method: string; phone?: string; bankName?: string; accountNumber?: string; accountName?: string };
  createdAt: string;
}

export interface AdminEscrowRow {
  _id: string;
  status: EscrowStatus;
  totalAmount: number;
  booking?: { _id: string; bookingNumber: string; status: string };
  customer?: { firstName: string; lastName: string };
  technician?: { firstName: string; lastName: string };
  fundedAt?: string;
  updatedAt?: string;
}

export interface LedgerRow {
  _id: string;
  kind: string;
  direction: 'in' | 'out';
  amount: number;
  providerRef?: string;
  at: string;
}

const base = (bookingId: string) => `/payments/bookings/${bookingId}/escrow`;

export interface PaymentsConfig {
  escrow: boolean;
  /** IntaSend keys are live: the Pay button works */
  ready: boolean;
  minJobAmount: number;
}

let configPromise: Promise<PaymentsConfig> | null = null;

const paymentsService = {
  /** Cached for the session: whether bookings pay into escrow after acceptance. */
  config(): Promise<PaymentsConfig> {
    if (!configPromise) {
      configPromise = axios
        .get('/payments/config')
        .then((r) => r.data.data)
        .catch(() => {
          configPromise = null;
          return { escrow: true, ready: false, minJobAmount: 0 };
        });
    }
    return configPromise;
  },
  async escrow(bookingId: string): Promise<EscrowView> {
    const { data } = await axios.get(base(bookingId));
    return data.data;
  },
  async pay(bookingId: string, phone: string): Promise<{ invoiceId: string; amount: number; phone: string }> {
    const { data } = await axios.post(`${base(bookingId)}/pay`, { phone });
    return data.data;
  },
  async proposeTopup(bookingId: string, amount: number, reason: string): Promise<EscrowView> {
    const { data } = await axios.post(`${base(bookingId)}/topups`, { amount, reason });
    return data.data;
  },
  async decideTopup(bookingId: string, topupId: string, approve: boolean, phone?: string) {
    const { data } = await axios.post(`${base(bookingId)}/topups/${topupId}`, { approve, phone });
    return data.data;
  },
  async dispute(bookingId: string, reason: string): Promise<EscrowView> {
    const { data } = await axios.post(`${base(bookingId)}/dispute`, { reason });
    return data.data;
  },

  async payoutDestination(): Promise<PayoutDestinationView> {
    const { data } = await axios.get('/payments/payout-destination');
    return data.data;
  },
  async requestPayoutDestination(
    body: { method: 'mpesa'; phone: string } | { method: 'bank'; bankCode: string; accountNumber: string; accountName: string }
  ): Promise<{ sentTo: string; via: string }> {
    const { data } = await axios.put('/payments/payout-destination', body);
    return data.data;
  },
  async verifyPayoutDestination(code: string): Promise<PayoutDestinationView> {
    const { data } = await axios.post('/payments/payout-destination/verify', { code });
    return data.data;
  },
  async banks(): Promise<Bank[]> {
    const { data } = await axios.get('/payments/bank-codes');
    return data.data;
  },

  // ---- admin finance ----
  async financeOverview(): Promise<FinanceOverview> {
    const { data } = await axios.get('/payments/admin/overview');
    return data.data;
  },
  async financePayouts(status?: string): Promise<AdminPayout[]> {
    const { data } = await axios.get('/payments/admin/payouts', { params: { status, limit: 50 } });
    return data.data;
  },
  async approvePayout(id: string): Promise<AdminPayout> {
    const { data } = await axios.post(`/payments/admin/payouts/${id}/approve`);
    return data.data;
  },
  async refreshPayout(id: string): Promise<AdminPayout> {
    const { data } = await axios.post(`/payments/admin/payouts/${id}/refresh`);
    return data.data;
  },
  async financeEscrows(status?: string): Promise<AdminEscrowRow[]> {
    const { data } = await axios.get('/payments/admin/escrows', { params: { status, limit: 50 } });
    return data.data;
  },
  async escrowDetail(id: string): Promise<EscrowView & { ledger: LedgerRow[] }> {
    const { data } = await axios.get(`/payments/admin/escrows/${id}`);
    return data.data;
  },
  async resolveDispute(id: string, resolution: 'customer_favor' | 'technician_favor' | 'split', technicianShare?: number, notes?: string) {
    const { data } = await axios.post(`/payments/admin/escrows/${id}/resolve`, { resolution, technicianShare, notes });
    return data.data;
  },
  async runReconciliation() {
    const { data } = await axios.post('/payments/admin/reconciliation');
    return data.data;
  },
};

export default paymentsService;
