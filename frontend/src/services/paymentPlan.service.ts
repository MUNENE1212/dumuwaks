import axios from '@/lib/axios';
import type {
  PaymentPlan,
  PaymentPlanFormData,
  PaymentPlansResponse,
  PaymentPlanResponse,
  PlanTypesResponse,
  AnalyticsResponse,
  CalculateResponse,
  ValidateResponse,
  CalculateOptions,
  CalculationResult,
  PlanTypeInfo
} from '@/types/paymentPlan';

/**
 * Payment Plan Service
 * API client for technician payment plan operations
 */

const API_BASE = '/payment-plans';

/**
 * Get all available payment plan types
 * @returns Promise with plan types
 */
export const getPaymentPlanTypes = async (): Promise<PlanTypesResponse> => {
  const response = await axios.get(`${API_BASE}/types`);
  return response.data;
};

/**
 * Create a new payment plan
 * @param data - Payment plan form data
 * @returns Promise with created payment plan
 */
export const createPaymentPlan = async (
  data: PaymentPlanFormData
): Promise<PaymentPlanResponse> => {
  const response = await axios.post(`${API_BASE}`, data);
  return response.data;
};

/**
 * Get technician's own payment plans
 * @param activeOnly - Only return active plans
 * @returns Promise with payment plans list
 */
export const getMyPaymentPlans = async (
  activeOnly: boolean = true
): Promise<PaymentPlansResponse> => {
  const response = await axios.get(`${API_BASE}/my-plans`, {
    params: { activeOnly }
  });
  return response.data;
};

/**
 * Get all payment plans for a service (public)
 * @param serviceId - Service ID
 * @param options - Pagination options
 * @returns Promise with payment plans list
 */
export const getServicePaymentPlans = async (
  serviceId: string,
  options?: {
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'newest';
  }
): Promise<PaymentPlansResponse> => {
  const response = await axios.get(`${API_BASE}/service/${serviceId}`, {
    params: options
  });
  return response.data;
};

/**
 * Get a single payment plan by ID
 * @param planId - Payment plan ID
 * @returns Promise with payment plan
 */
export const getPaymentPlanById = async (
  planId: string
): Promise<PaymentPlanResponse> => {
  const response = await axios.get(`${API_BASE}/${planId}`);
  return response.data;
};

/**
 * Get active payment plan for technician-service combination
 * @param technicianId - Technician ID
 * @param serviceId - Service ID
 * @returns Promise with payment plan
 */
export const getTechnicianServicePlan = async (
  technicianId: string,
  serviceId: string
): Promise<PaymentPlanResponse> => {
  const response = await axios.get(
    `${API_BASE}/technician/${technicianId}/service/${serviceId}`
  );
  return response.data;
};

/**
 * Update a payment plan
 * @param planId - Payment plan ID
 * @param data - Updated payment plan data
 * @returns Promise with updated payment plan
 */
export const updatePaymentPlan = async (
  planId: string,
  data: Partial<PaymentPlanFormData>
): Promise<PaymentPlanResponse> => {
  const response = await axios.put(`${API_BASE}/${planId}`, data);
  return response.data;
};

/**
 * Delete a payment plan permanently
 * @param planId - Payment plan ID
 * @returns Promise with deletion confirmation
 */
export const deletePaymentPlan = async (
  planId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axios.delete(`${API_BASE}/${planId}`);
  return response.data;
};

/**
 * Deactivate a payment plan (soft delete)
 * @param planId - Payment plan ID
 * @returns Promise with deactivation confirmation
 */
export const deactivatePaymentPlan = async (
  planId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axios.patch(`${API_BASE}/${planId}/deactivate`);
  return response.data;
};

/**
 * Calculate total price for a payment plan
 * @param planId - Payment plan ID
 * @param options - Calculation options
 * @returns Promise with calculation result
 */
export const calculateTotal = async (
  planId: string,
  options: CalculateOptions = {}
): Promise<CalculateResponse> => {
  const response = await axios.post(`${API_BASE}/${planId}/calculate`, options);
  return response.data;
};

/**
 * Get payment plan analytics for technician
 * @returns Promise with analytics data
 */
export const getPaymentPlanAnalytics = async (): Promise<AnalyticsResponse> => {
  const response = await axios.get(`${API_BASE}/analytics`);
  return response.data;
};

/**
 * Validate payment plan data (for frontend validation)
 * @param data - Payment plan data to validate
 * @returns Promise with validation result
 */
export const validatePaymentPlan = async (
  data: Partial<PaymentPlanFormData>
): Promise<ValidateResponse> => {
  const response = await axios.post(`${API_BASE}/validate`, data);
  return response.data;
};

/**
 * Client-side validation helpers
 */

/**
 * Validate hourly rate configuration
 * @param hourlyRate - Hourly rate config
 * @returns Array of error messages
 */
export const validateHourlyRate = (hourlyRate?: { amount?: number; minimumHours?: number }): string[] => {
  const errors: string[] = [];

  if (!hourlyRate?.amount || hourlyRate.amount <= 0) {
    errors.push('Hourly rate amount is required');
  }

  if (hourlyRate?.amount && hourlyRate.amount < 100) {
    errors.push('Hourly rate must be at least KES 100');
  }

  if (hourlyRate?.minimumHours && hourlyRate.minimumHours < 0.5) {
    errors.push('Minimum hours must be at least 0.5');
  }

  return errors;
};

/**
 * Validate fixed price configuration
 * @param fixedPrice - Fixed price config
 * @returns Array of error messages
 */
export const validateFixedPrice = (fixedPrice?: { amount?: number }): string[] => {
  const errors: string[] = [];

  if (!fixedPrice?.amount || fixedPrice.amount <= 0) {
    errors.push('Fixed price amount is required');
  }

  if (fixedPrice?.amount && fixedPrice.amount < 100) {
    errors.push('Fixed price must be at least KES 100');
  }

  return errors;
};

/**
 * Validate milestones configuration
 * @param milestones - Milestones array
 * @returns Array of error messages
 */
export const validateMilestones = (milestones?: { name?: string; percentage?: number }[]): string[] => {
  const errors: string[] = [];

  if (!milestones || milestones.length === 0) {
    errors.push('At least one milestone is required');
    return errors;
  }

  milestones.forEach((milestone, index) => {
    if (!milestone.name?.trim()) {
      errors.push(`Milestone ${index + 1}: Name is required`);
    }
    if (milestone.percentage === undefined || milestone.percentage < 0 || milestone.percentage > 100) {
      errors.push(`Milestone ${index + 1}: Percentage must be between 0 and 100`);
    }
  });

  const totalPercentage = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push('Milestone percentages must sum to 100%');
  }

  return errors;
};

/**
 * Validate per-project configuration
 * @param perProject - Per-project config
 * @returns Array of error messages
 */
export const validatePerProject = (perProject?: { baseAmount?: number; estimatedRange?: { min?: number; max?: number } }): string[] => {
  const errors: string[] = [];

  if (perProject?.estimatedRange) {
    if (perProject.estimatedRange.min && perProject.estimatedRange.max) {
      if (perProject.estimatedRange.min > perProject.estimatedRange.max) {
        errors.push('Minimum estimate cannot be greater than maximum');
      }
    }
  }

  return errors;
};

/**
 * Validate deposit configuration
 * @param deposit - Deposit config
 * @returns Array of error messages
 */
export const validateDeposit = (deposit?: { required?: boolean; percentage?: number }): string[] => {
  const errors: string[] = [];

  if (deposit?.required) {
    if (!deposit.percentage && deposit.percentage !== 0) {
      errors.push('Deposit percentage is required when deposit is required');
    }
    if (deposit.percentage && (deposit.percentage < 0 || deposit.percentage > 100)) {
      errors.push('Deposit percentage must be between 0 and 100');
    }
  }

  return errors;
};

/**
 * Format price for display
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted price string
 */
export const formatPrice = (amount: number, currency: string = 'KES'): string => {
  return `${currency} ${amount.toLocaleString()}`;
};

/**
 * Get display price for a payment plan
 * @param plan - Payment plan
 * @returns Display price string
 */
export const getDisplayPrice = (plan: PaymentPlan): string => {
  switch (plan.planType) {
    case 'hourly':
      return `${formatPrice(plan.hourlyRate?.amount || 0, plan.hourlyRate?.currency)}/hr`;
    case 'fixed':
      return formatPrice(plan.fixedPrice?.amount || 0, plan.fixedPrice?.currency);
    case 'milestone': {
      const total = plan.milestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
      return `${formatPrice(total)} (milestones)`;
    }
    case 'per_project':
      if (plan.perProject?.estimatedRange?.min && plan.perProject?.estimatedRange?.max) {
        return `${formatPrice(plan.perProject.estimatedRange.min)} - ${formatPrice(plan.perProject.estimatedRange.max)}`;
      }
      return 'Quote required';
    case 'negotiable':
      return 'Negotiable';
    default:
      return 'Contact for pricing';
  }
};

/**
 * Get plan type label
 * @param planType - Plan type
 * @returns Human-readable label
 */
export const getPlanTypeLabel = (planType: string): string => {
  const labels: Record<string, string> = {
    hourly: 'Hourly Rate',
    fixed: 'Fixed Price',
    milestone: 'Milestone-based',
    per_project: 'Per Project',
    negotiable: 'Negotiable'
  };
  return labels[planType] || planType;
};

/**
 * Get plan type icon name (for Lucide icons)
 * @param planType - Plan type
 * @returns Icon name
 */
export const getPlanTypeIcon = (planType: string): string => {
  const icons: Record<string, string> = {
    hourly: 'Clock',
    fixed: 'Tag',
    milestone: 'Flag',
    per_project: 'FileText',
    negotiable: 'MessageCircle'
  };
  return icons[planType] || 'DollarSign';
};
