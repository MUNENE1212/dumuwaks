import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import * as bookingService from '@/services/booking.service';
import type {
  Service,
  AvailableTechnician,
  PaymentPlan,
  BookingFlowState,
} from '@/types/booking';

// Types
export interface ServiceLocation {
  type: string;
  coordinates: [number, number];
  address: string;
  city?: string;
  county?: string;
  landmarks?: string;
  accessInstructions?: string;
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  estimatedDuration?: number;
}

export interface BookingPricing {
  basePrice?: number;
  serviceCharge?: number;
  platformFee?: number;
  tax?: number;
  discount?: number;
  totalAmount: number;
  currency: string;
  bookingFee?: number;
}

export interface BookingFee {
  required: boolean;
  percentage: number;
  amount: number;
  status: 'pending' | 'paid' | 'held' | 'released' | 'refunded';
  paidAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  heldInEscrow?: boolean;
  escrowReleaseCondition?: 'job_verified' | 'support_approved' | 'auto_released';
  transactionId?: string;
  refundTransactionId?: string;
  notes?: string;
}

export interface BookingUser {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePicture?: string;
  rating?: number;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  customer: BookingUser;
  technician?: BookingUser;
  serviceCategory: string;
  serviceType: string;
  description: string;
  urgency: string;
  serviceLocation: ServiceLocation;
  timeSlot: TimeSlot;
  status: string;
  pricing: BookingPricing;
  bookingFee?: BookingFee;
  images?: Array<{ url: string; caption?: string }>;
  contactsHidden?: boolean;
  contactsHiddenReason?: string;
  createdAt: string;
  updatedAt: string;
  /** `intasend`: full price held in escrow (EscrowPanel). `legacy`: 20% booking fee. */
  paymentProvider?: 'legacy' | 'intasend';
}

export interface CreateBookingData {
  serviceType: string;
  serviceCategory?: string;
  description: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  serviceLocation: {
    coordinates: [number, number];
    address: string;
    landmarks?: string;
    accessInstructions?: string;
  };
  technician?: string;
  urgency?: string;
  images?: string[];
  quantity?: number;
}

export interface UpdateBookingStatusData {
  bookingId: string;
  status: string;
  notes?: string;
}

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    total: number;
    byStatus: Array<{ _id: string; count: number; totalRevenue: number }>;
  } | null;

  // WORD BANK integration state
  bookingFlow: BookingFlowState;
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  stats: null,

  // WORD BANK integration initial state
  bookingFlow: {
    currentStep: 1,
    selectedService: null,
    selectedTechnician: null,
    selectedPaymentPlan: null,
    availableTechnicians: [],
    scheduledDate: '',
    scheduledTime: '',
    location: {
      address: '',
      coordinates: undefined,
    },
    description: '',
    attachments: [],
    quantity: 1,
    escrowDeposit: 0,
    isSubmitting: false,
    createdBooking: null,
    // Pre-selection state for matching flow integration
    preSelectedTechnicianId: null,
    preSelectedServiceId: null,
    matchingRequestId: null,
    isFromMatching: false,
    // Price estimation state
    priceEstimate: null,
    isLoadingEstimate: false,
    // Urgency display
    urgency: 'medium',
    // Estimated duration
    estimatedDuration: 120,
  },
};

// Async thunks
export const createBooking = createAsyncThunk(
  'bookings/create',
  async (bookingData: CreateBookingData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/bookings', bookingData);
      toast.success('Booking created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchBookings = createAsyncThunk(
  'bookings/fetchAll',
  async (
    params: { status?: string; page?: number; limit?: number; sort?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.get('/bookings', { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchOne',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/bookings/${bookingId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booking');
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateStatus',
  async (data: UpdateBookingStatusData, { rejectWithValue }) => {
    try {
      const { bookingId, ...updateData } = data;
      const response = await axios.put(`/bookings/${bookingId}/status`, updateData);
      toast.success(response.data.message || 'Booking updated successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchBookingStats = createAsyncThunk(
  'bookings/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/bookings/stats');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

// Accept booking (Technician)
export const acceptBooking = createAsyncThunk(
  'bookings/accept',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/bookings/${bookingId}/accept`);
      return response.data.booking;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept booking');
    }
  }
);

// Reject booking (Technician)
export const rejectBooking = createAsyncThunk(
  'bookings/reject',
  async ({ bookingId, reason }: { bookingId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/bookings/${bookingId}/reject`, { reason });
      return response.data.booking;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject booking');
    }
  }
);

// Submit counter offer (Technician)
export const submitCounterOffer = createAsyncThunk(
  'bookings/submitCounterOffer',
  async (
    { bookingId, proposedAmount, reason, additionalNotes }: { bookingId: string; proposedAmount: number; reason: string; additionalNotes?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(`/bookings/${bookingId}/counter-offer`, {
        proposedAmount,
        reason,
        additionalNotes,
      });
      return response.data.booking;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit counter offer');
    }
  }
);

// Respond to counter offer (Customer)
export const respondToCounterOffer = createAsyncThunk(
  'bookings/respondToCounterOffer',
  async ({ bookingId, accepted, notes }: { bookingId: string; accepted: boolean; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/bookings/${bookingId}/counter-offer/respond`, {
        accepted,
        notes,
      });
      return response.data.booking;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to respond to counter offer');
    }
  }
);

// ===== NEW STATUS MANAGEMENT THUNKS =====

// Technician: Update to en_route
export const updateToEnRoute = createAsyncThunk(
  'bookings/updateToEnRoute',
  async ({ bookingId, notes }: { bookingId: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingService.updateToEnRoute(bookingId, notes);
      toast.success('Status updated to en route');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Technician: Update to arrived
export const updateToArrived = createAsyncThunk(
  'bookings/updateToArrived',
  async ({ bookingId, notes }: { bookingId: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingService.updateToArrived(bookingId, notes);
      toast.success('Status updated to arrived');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Technician: Update to in_progress
export const updateToInProgress = createAsyncThunk(
  'bookings/updateToInProgress',
  async ({ bookingId, notes }: { bookingId: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingService.updateToInProgress(bookingId, notes);
      toast.success('Work started');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Technician: Request completion (requires customer confirmation)
export const requestCompletion = createAsyncThunk(
  'bookings/requestCompletion',
  async (
    { bookingId, notes, completionImages }: { bookingId: string; notes?: string; completionImages?: Array<{ url: string; caption?: string }> },
    { rejectWithValue }
  ) => {
    try {
      const response = await bookingService.requestCompletion(bookingId, { notes, completionImages });
      toast.success('Completion request sent to customer');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to request completion';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Customer/Support: Confirm completion
export const confirmCompletion = createAsyncThunk(
  'bookings/confirmCompletion',
  async (
    { bookingId, approved, feedback, issues }: { bookingId: string; approved: boolean; feedback?: string; issues?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await bookingService.confirmCompletion(bookingId, { approved, feedback, issues });
      toast.success(approved ? 'Job completion confirmed' : 'Completion rejected - technician notified');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to confirm completion';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Technician: Pause job
export const pauseJob = createAsyncThunk(
  'bookings/pauseJob',
  async ({ bookingId, reason }: { bookingId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingService.pauseJob(bookingId, reason);
      toast.success('Job paused');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to pause job';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Cancel booking
export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ bookingId, reason }: { bookingId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingService.cancelBooking(bookingId, reason);
      toast.success('Booking cancelled');
      return response.booking;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },

    // ===== WORD BANK BOOKING FLOW REDUCERS =====

    /**
     * Set current booking step
     */
    setBookingStep: (state, action: PayloadAction<number>) => {
      state.bookingFlow.currentStep = action.payload;
    },

    /**
     * Set selected service from WORD BANK
     */
    setSelectedService: (state, action: PayloadAction<Service | null>) => {
      state.bookingFlow.selectedService = action.payload;
      // Reset dependent fields when service changes
      state.bookingFlow.selectedTechnician = null;
      state.bookingFlow.selectedPaymentPlan = null;
      state.bookingFlow.availableTechnicians = [];
    },

    /**
     * Set selected technician
     */
    setSelectedTechnician: (state, action: PayloadAction<AvailableTechnician | null>) => {
      state.bookingFlow.selectedTechnician = action.payload;
      // Reset payment plan when technician changes
      state.bookingFlow.selectedPaymentPlan = null;
    },

    /**
     * Set selected payment plan
     */
    setSelectedPaymentPlan: (state, action: PayloadAction<PaymentPlan | null>) => {
      state.bookingFlow.selectedPaymentPlan = action.payload;
      // Update escrow deposit based on payment plan
      if (action.payload && state.bookingFlow.selectedService) {
        const basePrice = (state.bookingFlow.selectedService as Service).basePriceMin || 0;
        state.bookingFlow.escrowDeposit = Math.round(
          basePrice * (action.payload.depositPercentage / 100)
        );
      }
    },

    /**
     * Set available technicians for selected service
     */
    setAvailableTechnicians: (state, action: PayloadAction<AvailableTechnician[]>) => {
      state.bookingFlow.availableTechnicians = action.payload;
    },

    /**
     * Set scheduled date
     */
    setScheduledDate: (state, action: PayloadAction<string>) => {
      state.bookingFlow.scheduledDate = action.payload;
    },

    /**
     * Set scheduled time
     */
    setScheduledTime: (state, action: PayloadAction<string>) => {
      state.bookingFlow.scheduledTime = action.payload;
    },

    /**
     * Set service location
     */
    setBookingLocation: (state, action: PayloadAction<{
      address: string;
      coordinates?: { lat: number; lng: number };
      landmarks?: string;
      accessInstructions?: string;
    }>) => {
      state.bookingFlow.location = action.payload;
    },

    /**
     * Set job description
     */
    setBookingDescription: (state, action: PayloadAction<string>) => {
      state.bookingFlow.description = action.payload;
    },

    /**
     * Set attachments
     */
    setBookingAttachments: (state, action: PayloadAction<File[]>) => {
      state.bookingFlow.attachments = action.payload;
    },

    /**
     * Set quantity
     */
    setBookingQuantity: (state, action: PayloadAction<number>) => {
      state.bookingFlow.quantity = action.payload;
    },

    /**
     * Set escrow deposit amount
     */
    setEscrowDeposit: (state, action: PayloadAction<number>) => {
      state.bookingFlow.escrowDeposit = action.payload;
    },

    /**
     * Set submitting state
     */
    setBookingSubmitting: (state, action: PayloadAction<boolean>) => {
      state.bookingFlow.isSubmitting = action.payload;
    },

    /**
     * Set created booking
     */
    setCreatedBooking: (state, action: PayloadAction<any>) => {
      state.bookingFlow.createdBooking = action.payload;
    },

    /**
     * Reset booking flow to initial state
     */
    resetBookingFlow: (state) => {
      state.bookingFlow = initialState.bookingFlow;
    },

    /**
     * Go to next step
     */
    nextBookingStep: (state) => {
      if (state.bookingFlow.currentStep < 5) {
        state.bookingFlow.currentStep += 1;
      }
    },

    /**
     * Go to previous step
     */
    prevBookingStep: (state) => {
      if (state.bookingFlow.currentStep > 1) {
        state.bookingFlow.currentStep -= 1;
      }
    },

    /**
     * Set pre-selected technician from matching
     */
    setPreSelectedTechnician: (state, action: PayloadAction<{
      technicianId: string;
      technician: AvailableTechnician;
      matchingRequestId?: string;
    }>) => {
      state.bookingFlow.preSelectedTechnicianId = action.payload.technicianId;
      state.bookingFlow.selectedTechnician = action.payload.technician;
      state.bookingFlow.matchingRequestId = action.payload.matchingRequestId || null;
      state.bookingFlow.isFromMatching = true;
      // Reset payment plan when technician changes
      state.bookingFlow.selectedPaymentPlan = null;
    },

    /**
     * Set pre-selected service from service page
     */
    setPreSelectedService: (state, action: PayloadAction<{
      serviceId: string;
      service: Service;
    }>) => {
      state.bookingFlow.preSelectedServiceId = action.payload.serviceId;
      state.bookingFlow.selectedService = action.payload.service;
      // Reset dependent fields when service changes
      state.bookingFlow.selectedTechnician = null;
      state.bookingFlow.selectedPaymentPlan = null;
      state.bookingFlow.availableTechnicians = [];
    },

    /**
     * Clear pre-selection state
     */
    clearPreSelection: (state) => {
      state.bookingFlow.preSelectedTechnicianId = null;
      state.bookingFlow.preSelectedServiceId = null;
      state.bookingFlow.matchingRequestId = null;
      state.bookingFlow.isFromMatching = false;
    },

    /**
     * Set price estimate
     */
    setPriceEstimate: (state, action: PayloadAction<any>) => {
      state.bookingFlow.priceEstimate = action.payload;
    },

    /**
     * Set loading estimate state
     */
    setLoadingEstimate: (state, action: PayloadAction<boolean>) => {
      state.bookingFlow.isLoadingEstimate = action.payload;
    },

    /**
     * Set urgency level
     */
    setBookingUrgency: (state, action: PayloadAction<'low' | 'medium' | 'high' | 'emergency'>) => {
      state.bookingFlow.urgency = action.payload;
    },

    /**
     * Set estimated duration
     */
    setEstimatedDuration: (state, action: PayloadAction<number>) => {
      state.bookingFlow.estimatedDuration = action.payload;
    },

    /**
     * Restore booking flow state from localStorage draft
     * This restores all saved state except for File objects (attachments)
     */
    restoreBookingDraft: (state, action: PayloadAction<{
      currentStep: number;
      selectedService: Service | null;
      selectedTechnician: AvailableTechnician | null;
      selectedPaymentPlan: PaymentPlan | null;
      scheduledDate: string;
      scheduledTime: string;
      location: {
        address: string;
        coordinates?: { lat: number; lng: number };
        landmarks?: string;
        accessInstructions?: string;
      };
      description: string;
      quantity: number;
      escrowDeposit: number;
      urgency: 'low' | 'medium' | 'high' | 'emergency';
      estimatedDuration: number;
      preSelectedTechnicianId: string | null;
      preSelectedServiceId: string | null;
      matchingRequestId: string | null;
      isFromMatching: boolean;
    }>) => {
      const draft = action.payload;
      state.bookingFlow = {
        ...state.bookingFlow,
        currentStep: draft.currentStep,
        selectedService: draft.selectedService,
        selectedTechnician: draft.selectedTechnician,
        selectedPaymentPlan: draft.selectedPaymentPlan,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime,
        location: draft.location,
        description: draft.description,
        // Attachments cannot be restored from localStorage, user must re-upload
        attachments: [],
        quantity: draft.quantity,
        escrowDeposit: draft.escrowDeposit,
        urgency: draft.urgency,
        estimatedDuration: draft.estimatedDuration,
        preSelectedTechnicianId: draft.preSelectedTechnicianId,
        preSelectedServiceId: draft.preSelectedServiceId,
        matchingRequestId: draft.matchingRequestId,
        isFromMatching: draft.isFromMatching,
        isSubmitting: false,
        createdBooking: null,
        priceEstimate: null,
        isLoadingEstimate: false,
        availableTechnicians: [],
      };
    },

    /**
     * Clear the booking draft (for manual clear or after booking completion)
     * This is an alias for resetBookingFlow but with clearer intent for persistence
     */
    clearBookingDraft: (state) => {
      state.bookingFlow = initialState.bookingFlow;
    },
  },
  extraReducers: (builder) => {
    // Create booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isCreating = false;
        state.bookings.unshift(action.payload.booking);
        state.currentBooking = action.payload.booking;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // Fetch bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload.bookings || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
          pages: action.payload.pages || 0,
        };
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single booking
    builder
      .addCase(fetchBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBooking = action.payload.booking;
      })
      .addCase(fetchBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update booking status
    builder
      .addCase(updateBookingStatus.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload.booking;
        // Update in bookings list
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        // Update current booking
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Fetch stats
    builder
      .addCase(fetchBookingStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBookingStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = {
          total: action.payload.total || 0,
          byStatus: action.payload.stats || [],
        };
      })
      .addCase(fetchBookingStats.rejected, (state) => {
        state.isLoading = false;
      });

    // Accept booking
    builder
      .addCase(acceptBooking.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(acceptBooking.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(acceptBooking.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Reject booking
    builder
      .addCase(rejectBooking.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(rejectBooking.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(rejectBooking.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Submit counter offer
    builder
      .addCase(submitCounterOffer.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(submitCounterOffer.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(submitCounterOffer.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Respond to counter offer
    builder
      .addCase(respondToCounterOffer.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(respondToCounterOffer.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(respondToCounterOffer.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // ===== NEW STATUS MANAGEMENT REDUCERS =====

    // Update to en_route
    builder
      .addCase(updateToEnRoute.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateToEnRoute.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(updateToEnRoute.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Update to arrived
    builder
      .addCase(updateToArrived.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateToArrived.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(updateToArrived.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Update to in_progress
    builder
      .addCase(updateToInProgress.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateToInProgress.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(updateToInProgress.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Request completion
    builder
      .addCase(requestCompletion.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(requestCompletion.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(requestCompletion.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Confirm completion
    builder
      .addCase(confirmCompletion.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(confirmCompletion.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(confirmCompletion.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Pause job
    builder
      .addCase(pauseJob.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(pauseJob.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(pauseJob.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Cancel booking
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedBooking = action.payload;
        const index = state.bookings.findIndex((b) => b._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking && state.currentBooking._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentBooking,
  // WORD BANK flow actions
  setBookingStep,
  setSelectedService,
  setSelectedTechnician,
  setSelectedPaymentPlan,
  setAvailableTechnicians,
  setScheduledDate,
  setScheduledTime,
  setBookingLocation,
  setBookingDescription,
  setBookingAttachments,
  setBookingQuantity,
  setEscrowDeposit,
  setBookingSubmitting,
  setCreatedBooking,
  resetBookingFlow,
  nextBookingStep,
  prevBookingStep,
  // Pre-selection actions
  setPreSelectedTechnician,
  setPreSelectedService,
  clearPreSelection,
  // Price estimation actions
  setPriceEstimate,
  setLoadingEstimate,
  // Urgency and duration actions
  setBookingUrgency,
  setEstimatedDuration,
  // Persistence actions
  restoreBookingDraft,
  clearBookingDraft,
} = bookingSlice.actions;
export default bookingSlice.reducer;
