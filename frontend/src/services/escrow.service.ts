/**
 * Escrow Service
 *
 * API client for the platform escrow system.
 * Handles all HTTP requests related to escrows.
 *
 * @module services/escrow.service
 */

import axios from '@/lib/axios';
import type {
  Escrow,
  CreateEscrowRequest,
  FundEscrowRequest,
  ReleaseEscrowRequest,
  ReleaseMilestoneRequest,
  RefundEscrowRequest,
  OpenDisputeRequest,
  ResolveDisputeRequest,
  EscrowStats,
  EscrowFilters,
  PaginatedEscrowsResponse
} from '@/types/escrow';

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  escrow?: T;
  escrows?: T[];
  stats?: EscrowStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  results?: {
    processed: number;
    released: string[];
    errors: Array<{ escrowId: string; error: string }>;
  };
}

/**
 * Create a new escrow
 *
 * @param data - Escrow creation data
 * @returns Created escrow
 */
export async function createEscrow(data: CreateEscrowRequest): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>('/escrow', data);

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to create escrow');
  }

  return response.data.escrow;
}

/**
 * Get escrow by ID
 *
 * @param escrowId - Escrow ID
 * @returns Escrow details
 */
export async function getEscrow(escrowId: string): Promise<Escrow> {
  const response = await axios.get<ApiResponse<Escrow>>(`/escrow/${escrowId}`);

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to get escrow');
  }

  return response.data.escrow;
}

/**
 * Get escrow by booking ID
 *
 * @param bookingId - Booking ID
 * @returns Escrow details
 */
export async function getEscrowByBooking(bookingId: string): Promise<Escrow> {
  const response = await axios.get<ApiResponse<Escrow>>(`/escrow/booking/${bookingId}`);

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to get escrow');
  }

  return response.data.escrow;
}

/**
 * Fund escrow (after M-Pesa payment)
 *
 * @param escrowId - Escrow ID
 * @param data - Funding details
 * @returns Updated escrow
 */
export async function fundEscrow(
  escrowId: string,
  data: FundEscrowRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/fund`,
    data
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to fund escrow');
  }

  return response.data.escrow;
}

/**
 * Release escrow to technician
 *
 * @param escrowId - Escrow ID
 * @param data - Release details
 * @returns Updated escrow
 */
export async function releaseEscrow(
  escrowId: string,
  data?: ReleaseEscrowRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/release`,
    data || {}
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to release escrow');
  }

  return response.data.escrow;
}

/**
 * Release milestone payment
 *
 * @param escrowId - Escrow ID
 * @param data - Milestone release data
 * @returns Updated escrow
 */
export async function releaseMilestone(
  escrowId: string,
  data: ReleaseMilestoneRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/release-milestone`,
    data
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to release milestone');
  }

  return response.data.escrow;
}

/**
 * Refund escrow to customer
 *
 * @param escrowId - Escrow ID
 * @param data - Refund details
 * @returns Updated escrow
 */
export async function refundEscrow(
  escrowId: string,
  data: RefundEscrowRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/refund`,
    data
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to refund escrow');
  }

  return response.data.escrow;
}

/**
 * Open dispute on escrow
 *
 * @param escrowId - Escrow ID
 * @param data - Dispute details
 * @returns Updated escrow
 */
export async function openDispute(
  escrowId: string,
  data: OpenDisputeRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/dispute`,
    data
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to open dispute');
  }

  return response.data.escrow;
}

/**
 * Resolve dispute
 *
 * @param escrowId - Escrow ID
 * @param data - Resolution details
 * @returns Updated escrow
 */
export async function resolveDispute(
  escrowId: string,
  data: ResolveDisputeRequest
): Promise<Escrow> {
  const response = await axios.post<ApiResponse<Escrow>>(
    `/escrow/${escrowId}/resolve`,
    data
  );

  if (!response.data.success || !response.data.escrow) {
    throw new Error(response.data.message || 'Failed to resolve dispute');
  }

  return response.data.escrow;
}

/**
 * Get current user's escrows
 *
 * @param filters - Filter options
 * @returns Paginated escrows
 */
export async function getMyEscrows(
  filters?: EscrowFilters
): Promise<PaginatedEscrowsResponse> {
  const response = await axios.get<ApiResponse<Escrow>>('/escrow/my-escrows', {
    params: filters
  });

  return {
    success: response.data.success,
    escrows: response.data.escrows || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  };
}

/**
 * Get all escrows (admin/support only)
 *
 * @param filters - Filter options
 * @returns Paginated escrows
 */
export async function getAllEscrows(
  filters?: EscrowFilters
): Promise<PaginatedEscrowsResponse> {
  const response = await axios.get<ApiResponse<Escrow>>('/escrow', {
    params: filters
  });

  return {
    success: response.data.success,
    escrows: response.data.escrows || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  };
}

/**
 * Get escrow statistics (admin only)
 *
 * @param startDate - Start date filter
 * @param endDate - End date filter
 * @returns Escrow statistics
 */
export async function getEscrowStats(
  startDate?: string,
  endDate?: string
): Promise<EscrowStats> {
  const response = await axios.get<ApiResponse<Escrow>>('/escrow/stats', {
    params: { startDate, endDate }
  });

  if (!response.data.success || !response.data.stats) {
    throw new Error(response.data.message || 'Failed to get escrow stats');
  }

  return response.data.stats;
}

/**
 * Format amount as KES currency
 *
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate time remaining until expiry
 *
 * @param expiresAt - Expiry date string
 * @returns Time remaining in milliseconds or null
 */
export function getTimeUntilExpiry(expiresAt: string | Date | undefined): number | null {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();

  return Math.max(0, expiry - now);
}

/**
 * Format time remaining as human-readable string
 *
 * @param milliseconds - Time in milliseconds
 * @returns Human-readable time string
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  }

  if (minutes > 0) {
    return `${minutes}m remaining`;
  }

  return `${seconds}s remaining`;
}

/**
 * Get status color class
 *
 * @param status - Escrow status
 * @returns Tailwind CSS color classes
 */
export function getStatusColorClasses(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending: {
      bg: 'bg-yellow-900/30',
      text: 'text-yellow-300',
      border: 'border-yellow-700'
    },
    funded: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-300',
      border: 'border-blue-700'
    },
    partial_release: {
      bg: 'bg-indigo-900/30',
      text: 'text-indigo-300',
      border: 'border-indigo-700'
    },
    released: {
      bg: 'bg-green-900/30',
      text: 'text-green-300',
      border: 'border-green-700'
    },
    refunded: {
      bg: 'bg-purple-900/30',
      text: 'text-purple-300',
      border: 'border-purple-700'
    },
    disputed: {
      bg: 'bg-red-900/30',
      text: 'text-red-300',
      border: 'border-red-700'
    },
    cancelled: {
      bg: 'bg-surface-200',
      text: 'text-ink-muted',
      border: 'border-line-strong'
    }
  };

  return colors[status] || colors.cancelled;
}

export default {
  createEscrow,
  getEscrow,
  getEscrowByBooking,
  fundEscrow,
  releaseEscrow,
  releaseMilestone,
  refundEscrow,
  openDispute,
  resolveDispute,
  getMyEscrows,
  getAllEscrows,
  getEscrowStats,
  formatKES,
  getTimeUntilExpiry,
  formatTimeRemaining,
  getStatusColorClasses
};
