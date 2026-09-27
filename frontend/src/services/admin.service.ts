import axios from '@/lib/axios';

// ===== TYPES =====

export interface AdminDashboardStats {
  users: {
    total: number;
    newToday: number;
    technicians: number;
    activeTechnicians: number;
    customers: number;
  };
  bookings: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    completionRate: string | number;
  };
  revenue: {
    total: number;
    pendingPayouts: number;
    averageBookingValue: number;
  };
  platform: {
    averageRating: string | number;
    uptime: string;
    avgResponseTime: string;
    errorRate: string;
  };
  timeRange: string;
}

export interface AdminActivityItem {
  _id: string;
  type: 'user' | 'booking' | 'post' | 'payment' | 'support';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface TopTechnician {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  rating: number;
  ratingCount: number;
  bookings: number;
  earnings: number;
}

export interface UserListItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  createdAt: string;
  profilePicture?: string;
}

export interface PaginatedUsers {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AnalyticsData {
  bookingTrends?: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
  userGrowth?: Array<{
    _id: {
      date: string;
      role: string;
    };
    count: number;
  }>;
}

// ===== API FUNCTIONS =====

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (timeRange: 'today' | 'week' | 'month' | 'all' = 'week'): Promise<AdminDashboardStats> => {
  try {
    const response = await axios.get('/admin/stats', {
      params: { timeRange }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Get recent platform activity
 */
export const getRecentActivity = async (limit: number = 20): Promise<AdminActivityItem[]> => {
  try {
    const response = await axios.get('/admin/activity', {
      params: { limit }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * Get top performing technicians
 */
export const getTopTechnicians = async (
  limit: number = 10,
  sortBy: 'earnings' | 'bookings' | 'rating' = 'earnings'
): Promise<TopTechnician[]> => {
  try {
    const response = await axios.get('/admin/top-technicians', {
      params: { limit, sortBy }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching top technicians:', error);
    throw error;
  }
};

/**
 * Get all users with filtering and pagination
 */
export const getUsers = async (params: {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
} = {}): Promise<PaginatedUsers> => {
  try {
    const response = await axios.get('/admin/users', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Mark a technician ID-verified (or remove it) after checking their ID
 */
export const setTechnicianVerification = async (userId: string, verified: boolean) => {
  const response = await axios.patch(`/admin/users/${userId}/verification`, { verified });
  return response.data.data as { verification: { isVerified: boolean; verifiedAt: string | null } };
};

/**
 * Update user status (activate/suspend/ban)
 */
export const updateUserStatus = async (
  userId: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string
): Promise<UserListItem> => {
  try {
    const response = await axios.patch(`/admin/users/${userId}/status`, {
      status,
      reason
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

/**
 * Get platform analytics
 */
export const getAnalytics = async (
  type: 'overview' | 'bookings' | 'users' = 'overview',
  startDate?: string,
  endDate?: string
): Promise<AnalyticsData> => {
  try {
    const response = await axios.get('/admin/analytics', {
      params: { type, startDate, endDate }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

/**
 * Get complete dashboard data (stats + activity + top technicians)
 */
export const getCompleteDashboard = async (timeRange: 'today' | 'week' | 'month' | 'all' = 'week') => {
  try {
    const [stats, activity, topTechnicians] = await Promise.all([
      getDashboardStats(timeRange),
      getRecentActivity(20),
      getTopTechnicians(10, 'earnings')
    ]);

    return {
      stats,
      activity,
      topTechnicians
    };
  } catch (error: any) {
    console.error('Error fetching complete dashboard:', error);
    throw error;
  }
};

/**
 * Get single user by ID
 */
export const getUserById = async (userId: string): Promise<UserListItem> => {
  try {
    const response = await axios.get(`/admin/users/${userId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Update user details
 */
export const updateUser = async (userId: string, updates: Partial<UserListItem>): Promise<UserListItem> => {
  try {
    const response = await axios.patch(`/admin/users/${userId}`, updates);
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (userId: string, reason?: string): Promise<void> => {
  try {
    await axios.delete(`/admin/users/${userId}`, {
      data: { reason }
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Restore deleted user
 */
export const restoreUser = async (userId: string): Promise<UserListItem> => {
  try {
    const response = await axios.post(`/admin/users/${userId}/restore`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error restoring user:', error);
    throw error;
  }
};

/**
 * Get pricing configuration
 */
export const getPricingConfig = async (): Promise<any> => {
  try {
    const response = await axios.get('/admin/settings/pricing');
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching pricing config:', error);
    throw error;
  }
};

/**
 * Update platform fee
 */
export const updatePlatformFee = async (type: 'percentage' | 'fixed', value: number): Promise<any> => {
  try {
    const response = await axios.patch('/admin/settings/platform-fee', { type, value });
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating platform fee:', error);
    throw error;
  }
};

/**
 * Update tax configuration
 */
export const updateTax = async (tax: { enabled?: boolean; rate?: number; name?: string }): Promise<any> => {
  try {
    const response = await axios.patch('/admin/settings/tax', tax);
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating tax:', error);
    throw error;
  }
};

/**
 * Update discount configuration
 */
export const updateDiscounts = async (discounts: any): Promise<any> => {
  try {
    const response = await axios.patch('/admin/settings/discounts', discounts);
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating discounts:', error);
    throw error;
  }
};

/**
 * Update service rates
 */
export const updateServiceRates = async (rateData: {
  serviceCategory: string;
  serviceType: string;
  basePrice: number;
  priceUnit?: string;
  estimatedDuration?: number;
}): Promise<any> => {
  try {
    const response = await axios.patch('/admin/settings/service-rates', rateData);
    return response.data.data;
  } catch (error: any) {
    console.error('Error updating service rates:', error);
    throw error;
  }
};

/**
 * Get comprehensive reports
 */
export const getReports = async (startDate?: string, endDate?: string): Promise<any> => {
  try {
    const response = await axios.get('/admin/reports', {
      params: { startDate, endDate }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    throw error;
  }
};

// ===== ESCROW MANAGEMENT =====

export interface EscrowRecord {
  _id: string;
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  technicianId: string;
  technicianName: string;
  technicianPhone: string;
  amount: number;
  platformFee: number;
  technicianAmount: number;
  status: 'pending' | 'funded' | 'held' | 'disputed' | 'released' | 'refunded';
  fundedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  disputeReason?: string;
  createdAt: string;
  updatedAt: string;
  serviceType: string;
  serviceCategory: string;
}

export interface EscrowStats {
  totalActive: number;
  totalHeld: number;
  totalDisputed: number;
  pendingRelease: number;
  totalValue: number;
  averageHoldTime: number;
}

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    id: string;
    reason: string;
  }>;
}

/**
 * Get escrow statistics
 */
export const getEscrowStats = async (): Promise<EscrowStats> => {
  try {
    const response = await axios.get('/admin/escrow/stats');
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching escrow stats:', error);
    throw error;
  }
};

/**
 * Get all escrows with filters
 */
export const getEscrows = async (params: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
} = {}): Promise<{ escrows: EscrowRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  try {
    const response = await axios.get('/admin/escrow', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching escrows:', error);
    throw error;
  }
};

/**
 * Get escrow by ID
 */
export const getEscrowById = async (escrowId: string): Promise<EscrowRecord> => {
  try {
    const response = await axios.get(`/admin/escrow/${escrowId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching escrow:', error);
    throw error;
  }
};

/**
 * Release escrow to technician
 */
export const releaseEscrow = async (escrowId: string, notes?: string): Promise<EscrowRecord> => {
  try {
    const response = await axios.post(`/admin/escrow/${escrowId}/release`, { notes });
    return response.data.data;
  } catch (error: any) {
    console.error('Error releasing escrow:', error);
    throw error;
  }
};

/**
 * Refund escrow to customer
 */
export const refundEscrow = async (escrowId: string, reason: string): Promise<EscrowRecord> => {
  try {
    const response = await axios.post(`/admin/escrow/${escrowId}/refund`, { reason });
    return response.data.data;
  } catch (error: any) {
    console.error('Error refunding escrow:', error);
    throw error;
  }
};

/**
 * Bulk release escrows
 */
export const bulkReleaseEscrows = async (escrowIds: string[]): Promise<BulkActionResult> => {
  try {
    const response = await axios.post('/admin/escrow/bulk-release', { escrowIds });
    return response.data.data;
  } catch (error: any) {
    console.error('Error bulk releasing escrows:', error);
    throw error;
  }
};

/**
 * Export escrows to CSV
 */
export const exportEscrows = async (params: { status?: string } = {}): Promise<Blob> => {
  try {
    const response = await axios.get('/admin/escrow/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    console.error('Error exporting escrows:', error);
    throw error;
  }
};

// ===== TRANSACTION MANAGEMENT =====

export interface TransactionRecord {
  _id: string;
  transactionId: string;
  bookingId?: string;
  bookingNumber?: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'technician';
  type: 'payment' | 'payout' | 'refund' | 'platform_fee' | 'booking_fee';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'mpesa' | 'card' | 'wallet' | 'internal';
  mpesaReceipt?: string;
  mpesaReference?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  paymentMethod?: string;
  search?: string;
}

/**
 * Get transactions with filters
 */
export const getTransactions = async (params: TransactionFilter & {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
} = {}): Promise<{ transactions: TransactionRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  try {
    const response = await axios.get('/admin/transactions', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (transactionId: string): Promise<TransactionRecord> => {
  try {
    const response = await axios.get(`/admin/transactions/${transactionId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

/**
 * Lookup M-Pesa receipt
 */
export const lookupMpesaReceipt = async (transactionId: string): Promise<Record<string, any>> => {
  try {
    const response = await axios.get(`/admin/transactions/${transactionId}/mpesa-lookup`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error looking up M-Pesa receipt:', error);
    throw error;
  }
};

/**
 * Export transactions to CSV
 */
export const exportTransactions = async (params: TransactionFilter = {}): Promise<Blob> => {
  try {
    const response = await axios.get('/admin/transactions/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    console.error('Error exporting transactions:', error);
    throw error;
  }
};

// ===== DISPUTE MANAGEMENT =====

export interface DisputeResolution {
  disputeId: string;
  escrowId: string;
  bookingId: string;
  raisedBy: 'customer' | 'technician';
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: {
    type: 'release_to_technician' | 'refund_customer' | 'partial_refund' | 'escalate';
    amount?: number;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Get disputes
 */
export const getDisputes = async (params: {
  status?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ disputes: DisputeResolution[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  try {
    const response = await axios.get('/admin/disputes', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching disputes:', error);
    throw error;
  }
};

/**
 * Get dispute by ID
 */
export const getDisputeById = async (disputeId: string): Promise<DisputeResolution> => {
  try {
    const response = await axios.get(`/admin/disputes/${disputeId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching dispute:', error);
    throw error;
  }
};

/**
 * Resolve dispute
 */
export const resolveDispute = async (
  disputeId: string,
  resolution: DisputeResolution['resolution']
): Promise<DisputeResolution> => {
  try {
    const response = await axios.post(`/admin/disputes/${disputeId}/resolve`, resolution);
    return response.data.data;
  } catch (error: any) {
    console.error('Error resolving dispute:', error);
    throw error;
  }
};

// ===== REPORTS =====

export interface FinancialReport {
  period: { start: string; end: string };
  summary: {
    totalRevenue: number;
    totalPayouts: number;
    totalRefunds: number;
    platformFees: number;
    netRevenue: number;
  };
  breakdown: {
    payments: number;
    payouts: number;
    refunds: number;
    pendingPayouts: number;
    escrowHeld: number;
  };
}

export interface ServiceReport {
  period: { start: string; end: string };
  summary: {
    totalServices: number;
    activeServices: number;
    pendingApprovals: number;
    avgApprovalTime: number;
  };
  categories: Array<{ category: string; count: number; revenue: number }>;
}

export interface TechnicianReport {
  period: { start: string; end: string };
  summary: {
    totalTechnicians: number;
    activeTechnicians: number;
    avgRating: number;
    totalJobsCompleted: number;
  };
  performance: Array<{
    _id: string;
    name: string;
    completedBookings: number;
    totalEarnings: number;
    averageRating: number;
  }>;
}

/**
 * Generate financial report
 */
export const generateFinancialReport = async (params: {
  startDate: string;
  endDate: string;
}): Promise<FinancialReport> => {
  try {
    const response = await axios.get('/admin/reports/financial', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error generating financial report:', error);
    throw error;
  }
};

/**
 * Generate service report
 */
export const generateServiceReport = async (params: {
  startDate: string;
  endDate: string;
}): Promise<ServiceReport> => {
  try {
    const response = await axios.get('/admin/reports/service', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error generating service report:', error);
    throw error;
  }
};

/**
 * Generate technician report
 */
export const generateTechnicianReport = async (params: {
  startDate: string;
  endDate: string;
}): Promise<TechnicianReport> => {
  try {
    const response = await axios.get('/admin/reports/technician', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error generating technician report:', error);
    throw error;
  }
};

/**
 * Export report to file
 */
export const exportReport = async (params: {
  type: 'financial' | 'service' | 'technician';
  startDate: string;
  endDate: string;
  format: 'csv' | 'pdf';
}): Promise<Blob> => {
  try {
    const response = await axios.get('/admin/reports/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

// ===== ACTIVITY LOG =====

export interface ActivityLogEntry {
  _id: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

/**
 * Get admin activity log
 */
export const getActivityLog = async (params: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
} = {}): Promise<{ logs: ActivityLogEntry[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
  try {
    const response = await axios.get('/admin/activity-log', { params });
    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching activity log:', error);
    throw error;
  }
};

export default {
  getDashboardStats,
  getRecentActivity,
  getTopTechnicians,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  restoreUser,
  getAnalytics,
  getCompleteDashboard,
  getPricingConfig,
  updatePlatformFee,
  updateTax,
  updateDiscounts,
  updateServiceRates,
  getReports,
  // Escrow
  getEscrowStats,
  getEscrows,
  getEscrowById,
  releaseEscrow,
  refundEscrow,
  bulkReleaseEscrows,
  exportEscrows,
  // Transactions
  getTransactions,
  getTransactionById,
  lookupMpesaReceipt,
  exportTransactions,
  // Disputes
  getDisputes,
  getDisputeById,
  resolveDispute,
  // Reports
  generateFinancialReport,
  generateServiceReport,
  generateTechnicianReport,
  exportReport,
  // Activity Log
  getActivityLog,
};
