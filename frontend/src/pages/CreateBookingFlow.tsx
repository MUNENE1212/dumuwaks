import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import BookingStepper from '@/components/booking/BookingStepper';
import TechnicianSelector from '@/components/booking/TechnicianSelector';
import BookingSummary from '@/components/booking/BookingSummary';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import ServiceDiscovery from '@/components/services/ServiceDiscovery';
import BookingFeePaymentModal from '@/components/bookings/BookingFeePaymentModal';
import paymentsService from '@/services/payments.service';
import LocationInput, { LocationData } from '@/components/booking/LocationInput';
import PriceEstimate from '@/components/bookings/PriceEstimate';
import ResumeBookingModal from '@/components/booking/ResumeBookingModal';
import {
  setBookingStep,
  setSelectedService,
  setSelectedTechnician,
  setSelectedPaymentPlan,
  setAvailableTechnicians,
  setScheduledDate,
  setScheduledTime,
  setBookingLocation,
  setBookingDescription,
  setBookingQuantity,
  setEscrowDeposit,
  setBookingSubmitting,
  setCreatedBooking,
  resetBookingFlow,
  nextBookingStep,
  prevBookingStep,
  createBooking,
  setPreSelectedTechnician,
  setPreSelectedService,
  clearPreSelection,
  setPriceEstimate,
  setLoadingEstimate,
  setBookingUrgency,
  setEstimatedDuration,
  restoreBookingDraft,
  clearBookingDraft,
} from '@/store/slices/bookingSlice';
import { acceptMatch, AcceptMatchParams } from '@/store/slices/matchingSlice';
import type {
  BookingStep,
  Service,
  AvailableTechnician,
  PaymentPlan,
  BookingSummaryData,
  BookingConfirmationData,
  CreateBookingData as NewCreateBookingData,
} from '@/types/booking';
import { BOOKING_STEPS, calculateEscrowDeposit, calculatePlatformFee } from '@/types/booking';
import type { Service as ServiceType } from '@/types/service';
import { ArrowLeft, Calendar, MapPin, Clock, FileText, Sparkles, AlertTriangle, Check, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { format } from 'date-fns';
import { getPriceEstimate, calculatePrice, PricingBreakdown } from '@/services/pricing.service';
import {
  saveBookingDraft,
  loadBookingDraft,
  clearBookingDraft as clearPersistedDraft,
  hasBookingDraft,
  type SerializableBookingDraft,
} from '@/lib/bookingPersistence';

/**
 * Props for pre-selection from matching or service pages
 */
interface CreateBookingFlowProps {
  preSelectedTechnicianId?: string;
  preSelectedServiceId?: string;
  matchingRequestId?: string;
}

/**
 * Location state from navigation (matching flow)
 */
interface LocationState {
  matchId?: string;
  technician?: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    rating?: number;
    hourlyRate?: number;
    location?: { coordinates: [number, number] };
    paymentPlans?: PaymentPlan[];
    priceRange?: { min: number; max: number };
    completedJobs?: number;
    skills?: Array<{ name: string; category: string; yearsOfExperience: number }>;
    availability?: { isAvailable: boolean };
  };
  serviceCategory?: string;
  serviceType?: string;
  location?: { coordinates: [number, number]; address: string };
}

/**
 * CreateBookingFlow Page
 * 5-step booking flow with WORD BANK integration:
 * 1. Select Service - Browse WORD BANK categories and select a service
 * 2. Choose Technician - View technicians offering the service
 * 3. Payment Plan - Select technician's payment plan
 * 4. Schedule & Details - Pick date/time, enter location and job details
 * 5. Confirm & Pay - Review summary and pay escrow deposit
 *
 * Enhanced with:
 * - Matching flow integration (pre-selected technician)
 * - Real-time price estimation
 * - Saved address toggle
 * - Urgency display
 */
const CreateBookingFlow: React.FC<CreateBookingFlowProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Redux state
  const { isCreating } = useAppSelector((state) => state.bookings);
  const { user } = useAppSelector((state) => state.auth);
  const bookingFlow = useAppSelector((state) => state.bookings.bookingFlow);

  // Local state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Real escrow: the full price is paid after the technician accepts, not at booking time
  const [escrowMode, setEscrowMode] = useState(false);
  useEffect(() => {
    paymentsService.config().then((c) => setEscrowMode(c.escrow));
  }, []);
  const [confirmationData, setConfirmationData] =
    useState<BookingConfirmationData | null>(null);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>({
    address: '',
    city: '',
    county: '',
    landmarks: '',
    accessInstructions: '',
    coordinates: [0, 0],
  });

  // Persistence state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<SerializableBookingDraft | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get location state for matching flow
  const locationState = location.state as LocationState | null;

  // Check if user has a saved address in profile
  const hasSavedAddress = useMemo(() => {
    return !!(user?.location?.address);
  }, [user?.location?.address]);

  // Determine starting step based on pre-selection
  const getStartingStep = useCallback((): number => {
    if (locationState?.matchId && locationState?.technician) {
      // From matching: skip steps 1 & 2, start at step 3 (Payment Plan)
      return 3;
    }
    if (locationState?.serviceCategory && locationState?.serviceType) {
      // From service page: skip step 1, start at step 2 (Technician)
      return 2;
    }
    return 1;
  }, [locationState]);

  // Initialize pre-selection from location state on mount
  useEffect(() => {
    if (locationState?.matchId && locationState?.technician) {
      // Set pre-selected technician from matching
      const technician: AvailableTechnician = {
        _id: locationState.technician._id,
        firstName: locationState.technician.firstName,
        lastName: locationState.technician.lastName,
        profilePicture: locationState.technician.profilePicture,
        rating: {
          average: locationState.technician.rating || 0,
          count: 0,
        },
        hourlyRate: locationState.technician.hourlyRate,
        location: locationState.technician.location ? {
          coordinates: locationState.technician.location.coordinates,
        } : undefined,
        skills: locationState.technician.skills || [],
        availability: locationState.technician.availability || { isAvailable: true },
        completedJobs: locationState.technician.completedJobs || 0,
        priceRange: locationState.technician.priceRange || {
          min: locationState.technician.hourlyRate || 0,
          max: (locationState.technician.hourlyRate || 0) * 2,
        },
        paymentPlans: locationState.technician.paymentPlans || [],
      };

      dispatch(setPreSelectedTechnician({
        technicianId: locationState.technician._id,
        technician,
        matchingRequestId: locationState.matchId,
      }));

      // Set initial escrow deposit
      if (technician.paymentPlans && technician.paymentPlans.length > 0) {
        dispatch(setSelectedPaymentPlan(technician.paymentPlans[0]));
        const deposit = calculateEscrowDeposit(
          technician.priceRange.min,
          technician.paymentPlans[0].depositPercentage
        );
        dispatch(setEscrowDeposit(deposit));
      } else {
        const deposit = calculateEscrowDeposit(technician.priceRange.min, 20);
        dispatch(setEscrowDeposit(deposit));
      }

      // Set starting step
      dispatch(setBookingStep(getStartingStep()));

      // Set location from matching if provided
      if (locationState.location) {
        setLocationData({
          address: locationState.location.address || '',
          city: '',
          county: '',
          landmarks: '',
          accessInstructions: '',
          coordinates: locationState.location.coordinates,
        });
        dispatch(setBookingLocation({
          address: locationState.location.address || '',
          coordinates: {
            lat: locationState.location.coordinates[1],
            lng: locationState.location.coordinates[0],
          },
        }));
      }
    }
  }, [locationState, dispatch, getStartingStep]);

  // Sync locationData with bookingFlow.location
  useEffect(() => {
    dispatch(setBookingLocation({
      address: locationData.address,
      coordinates: locationData.coordinates[0] !== 0 ? {
        lat: locationData.coordinates[1],
        lng: locationData.coordinates[0],
      } : undefined,
      landmarks: locationData.landmarks,
      accessInstructions: locationData.accessInstructions,
    }));
  }, [locationData, dispatch]);

  // Initialize saved address if available
  useEffect(() => {
    if (hasSavedAddress && !locationState?.location && user?.location) {
      setUseSavedAddress(true);
      setLocationData({
        address: user.location.address || '',
        city: user.location.city || '',
        county: user.location.county || '',
        landmarks: '',
        accessInstructions: '',
        coordinates: user.location.coordinates || [0, 0],
      });
    }
  }, [hasSavedAddress, locationState, user?.location]);

  /**
   * Check for saved draft on mount
   * Shows resume modal if a valid draft exists
   */
  useEffect(() => {
    // Skip if coming from matching flow (locationState exists)
    if (locationState?.matchId || locationState?.serviceCategory) {
      setIsInitialized(true);
      return;
    }

    // Check for saved draft
    const draft = loadBookingDraft();
    if (draft) {
      // Check if draft has meaningful data (not just initial state)
      const hasData =
        draft.selectedService ||
        draft.selectedTechnician ||
        draft.scheduledDate ||
        draft.description ||
        draft.location.address;

      if (hasData) {
        setSavedDraft(draft);
        setShowResumeModal(true);
      } else {
        // Draft has no meaningful data, clear it
        clearPersistedDraft();
      }
    }
    setIsInitialized(true);
  }, [locationState]);

  /**
   * Auto-save booking flow state to localStorage
   * Debounced to avoid excessive writes
   */
  useEffect(() => {
    // Don't save if not initialized or if showing resume modal
    if (!isInitialized || showResumeModal) {
      return;
    }

    // Don't save if submitting or if booking is complete
    if (bookingFlow.isSubmitting || bookingFlow.createdBooking) {
      return;
    }

    // Don't save the initial empty state
    const hasData =
      bookingFlow.selectedService ||
      bookingFlow.selectedTechnician ||
      bookingFlow.scheduledDate ||
      bookingFlow.description ||
      bookingFlow.location.address;

    if (!hasData) {
      return;
    }

    // Debounce save operation
    const saveTimer = setTimeout(() => {
      const saved = saveBookingDraft(bookingFlow);
      if (saved) {
        console.debug('BookingPersistence: Draft auto-saved');
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimer);
  }, [bookingFlow, isInitialized, showResumeModal]);

  /**
   * Clear draft when booking is successfully completed
   */
  useEffect(() => {
    if (confirmationData) {
      clearPersistedDraft();
      dispatch(clearBookingDraft());
      toast.success('Booking draft cleared');
    }
  }, [confirmationData, dispatch]);

  /**
   * Handle resume booking from draft
   */
  const handleResumeBooking = useCallback(() => {
    if (savedDraft) {
      dispatch(restoreBookingDraft({
        currentStep: savedDraft.currentStep,
        selectedService: savedDraft.selectedService,
        selectedTechnician: savedDraft.selectedTechnician,
        selectedPaymentPlan: savedDraft.selectedPaymentPlan,
        scheduledDate: savedDraft.scheduledDate,
        scheduledTime: savedDraft.scheduledTime,
        location: savedDraft.location,
        description: savedDraft.description,
        quantity: savedDraft.quantity,
        escrowDeposit: savedDraft.escrowDeposit,
        urgency: savedDraft.urgency,
        estimatedDuration: savedDraft.estimatedDuration,
        preSelectedTechnicianId: savedDraft.preSelectedTechnicianId,
        preSelectedServiceId: savedDraft.preSelectedServiceId,
        matchingRequestId: savedDraft.matchingRequestId,
        isFromMatching: savedDraft.isFromMatching,
      }));

      // Restore location data
      if (savedDraft.location.address) {
        setLocationData({
          address: savedDraft.location.address,
          city: '',
          county: '',
          landmarks: savedDraft.location.landmarks || '',
          accessInstructions: savedDraft.location.accessInstructions || '',
          coordinates: savedDraft.location.coordinates
            ? [savedDraft.location.coordinates.lng, savedDraft.location.coordinates.lat]
            : [0, 0],
        });
      }

      toast.success('Booking draft restored');
    }
    setShowResumeModal(false);
    setSavedDraft(null);
  }, [savedDraft, dispatch]);

  /**
   * Handle start fresh (clear draft)
   */
  const handleStartFresh = useCallback(() => {
    clearPersistedDraft();
    dispatch(resetBookingFlow());
    setShowResumeModal(false);
    setSavedDraft(null);
    toast.success('Starting with a fresh booking');
  }, [dispatch]);

  /**
   * Handle manual clear draft
   */
  const handleClearDraft = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to clear your draft? All progress will be lost.'
    );
    if (confirmed) {
      clearPersistedDraft();
      dispatch(resetBookingFlow());
      // Reset location data
      setLocationData({
        address: '',
        city: '',
        county: '',
        landmarks: '',
        accessInstructions: '',
        coordinates: [0, 0],
      });
      toast.success('Draft cleared');
    }
  }, [dispatch]);

  // Get steps with current status
  const getSteps = (): BookingStep[] => {
    return BOOKING_STEPS.map((step) => ({
      ...step,
      status:
        step.id < bookingFlow.currentStep
          ? 'completed'
          : step.id === bookingFlow.currentStep
          ? 'active'
          : 'pending',
    }));
  };

  /**
   * Fetch price estimate when relevant fields change
   */
  useEffect(() => {
    const fetchEstimate = async () => {
      // Need service and some location data for estimate
      if (!bookingFlow.selectedService || !bookingFlow.location.address) {
        dispatch(setPriceEstimate(null));
        return;
      }

      dispatch(setLoadingEstimate(true));

      try {
        const coordinates: [number, number] = bookingFlow.location.coordinates
          ? [bookingFlow.location.coordinates.lng, bookingFlow.location.coordinates.lat]
          : locationData.coordinates[0] !== 0
            ? [locationData.coordinates[0], locationData.coordinates[1]]
            : [-1.2921, 36.8219]; // Nairobi default

        const scheduledDateTime = bookingFlow.scheduledDate
          ? `${bookingFlow.scheduledDate}T${bookingFlow.scheduledTime || '09:00'}`
          : undefined;

        // If technician is selected, use calculatePrice for accurate estimate
        if (bookingFlow.selectedTechnician?._id) {
          const response = await calculatePrice({
            serviceCategory: (bookingFlow.selectedService as any).categoryId || '',
            serviceType: bookingFlow.selectedService.name,
            urgency: bookingFlow.urgency,
            serviceLocation: {
              type: 'Point',
              coordinates,
            },
            technicianLocation: bookingFlow.selectedTechnician.location?.coordinates,
            technicianId: bookingFlow.selectedTechnician._id,
            scheduledDateTime,
            quantity: bookingFlow.quantity || 1,
          });

          if (response.success && response.pricing) {
            dispatch(setPriceEstimate(response.pricing));

            // Update urgency based on API response
            if (response.pricing.details?.urgency?.level) {
              dispatch(setBookingUrgency(response.pricing.details.urgency.level as any));
            }
          }
        } else {
          // No technician selected, use general estimate
          const response = await getPriceEstimate({
            serviceCategory: (bookingFlow.selectedService as any).categoryId || '',
            serviceType: bookingFlow.selectedService.name,
            urgency: bookingFlow.urgency,
            serviceLocation: {
              type: 'Point',
              coordinates,
            },
            scheduledDateTime,
            quantity: bookingFlow.quantity || 1,
          });

          if (response.success) {
            dispatch(setPriceEstimate(response.estimate));
          }
        }
      } catch (error) {
        console.error('Failed to fetch price estimate:', error);
        // Don't show toast for estimate failures - just clear the estimate
        dispatch(setPriceEstimate(null));
      } finally {
        dispatch(setLoadingEstimate(false));
      }
    };

    // Debounce the API call
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 800);

    return () => clearTimeout(timer);
  }, [
    bookingFlow.selectedService,
    bookingFlow.selectedTechnician,
    bookingFlow.urgency,
    bookingFlow.location,
    bookingFlow.scheduledDate,
    bookingFlow.scheduledTime,
    bookingFlow.quantity,
    dispatch,
    locationData.coordinates,
  ]);

  /**
   * Handle "Use Saved Address" toggle
   */
  const handleUseSavedAddressToggle = useCallback(() => {
    if (!useSavedAddress && user?.location) {
      // Enable saved address - populate from profile
      const savedLocation: LocationData = {
        address: user.location.address || '',
        city: user.location.city || '',
        county: user.location.county || '',
        landmarks: '',
        accessInstructions: '',
        coordinates: user.location.coordinates || [0, 0],
      };
      setLocationData(savedLocation);
    }
    setUseSavedAddress(!useSavedAddress);
  }, [useSavedAddress, user?.location]);

  /**
   * Handle service selection from WORD BANK
   */
  const handleServiceSelect = useCallback(
    (service: ServiceType) => {
      dispatch(setSelectedService(service as unknown as Service));

      // Clear pre-selected service if manually selecting
      if (bookingFlow.preSelectedServiceId) {
        dispatch(clearPreSelection());
      }

      // Fetch available technicians for this service
      fetchTechniciansForService(service._id);

      // Move to next step
      dispatch(nextBookingStep());
    },
    [dispatch, bookingFlow.preSelectedServiceId]
  );

  /**
   * Fetch technicians offering a specific service
   */
  const fetchTechniciansForService = async (serviceId: string) => {
    setIsLoadingTechnicians(true);
    try {
      const response = await fetch(`/api/v1/services/${serviceId}/technicians`);
      const data = await response.json();

      if (data.success) {
        dispatch(setAvailableTechnicians(data.technicians));
      } else {
        toast.error('Failed to load technicians');
        dispatch(setAvailableTechnicians([]));
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to load available technicians');
      dispatch(setAvailableTechnicians([]));
    } finally {
      setIsLoadingTechnicians(false);
    }
  };

  /**
   * Handle technician selection
   */
  const handleTechnicianSelect = useCallback(
    (technician: AvailableTechnician) => {
      dispatch(setSelectedTechnician(technician));

      // Clear pre-selected if manually changing
      if (bookingFlow.preSelectedTechnicianId && bookingFlow.preSelectedTechnicianId !== technician._id) {
        dispatch(clearPreSelection());
      }

      // Auto-select first payment plan if available
      if (technician.paymentPlans && technician.paymentPlans.length > 0) {
        dispatch(setSelectedPaymentPlan(technician.paymentPlans[0]));

        // Calculate escrow deposit based on payment plan
        const basePrice = technician.priceRange.min;
        const deposit = calculateEscrowDeposit(
          basePrice,
          technician.paymentPlans[0].depositPercentage
        );
        dispatch(setEscrowDeposit(deposit));
      } else {
        // Default 20% deposit
        const deposit = calculateEscrowDeposit(technician.priceRange.min, 20);
        dispatch(setEscrowDeposit(deposit));
      }

      // Move to next step
      dispatch(nextBookingStep());
    },
    [dispatch, bookingFlow.preSelectedTechnicianId]
  );

  /**
   * Handle "Change Technician" from pre-selection
   */
  const handleChangeTechnician = useCallback(() => {
    dispatch(clearPreSelection());
    dispatch(setBookingStep(2)); // Go to technician selection step
  }, [dispatch]);

  /**
   * Handle payment plan selection
   */
  const handlePaymentPlanSelect = useCallback(
    (plan: PaymentPlan) => {
      dispatch(setSelectedPaymentPlan(plan));

      // Update escrow deposit
      if (bookingFlow.selectedTechnician) {
        const basePrice = bookingFlow.selectedTechnician.priceRange.min;
        const deposit = calculateEscrowDeposit(basePrice, plan.depositPercentage);
        dispatch(setEscrowDeposit(deposit));
      }
    },
    [dispatch, bookingFlow.selectedTechnician]
  );

  /**
   * Handle step navigation (for completed steps)
   */
  const handleStepClick = useCallback(
    (stepId: number) => {
      if (stepId < bookingFlow.currentStep) {
        dispatch(setBookingStep(stepId));
      }
    },
    [dispatch, bookingFlow.currentStep]
  );

  /**
   * Handle form field changes
   */
  const handleFieldChange = useCallback(
    (field: string, value: string | number) => {
      switch (field) {
        case 'scheduledDate':
          dispatch(setScheduledDate(value as string));
          break;
        case 'scheduledTime':
          dispatch(setScheduledTime(value as string));
          break;
        case 'quantity':
          dispatch(setBookingQuantity(value as number));
          break;
        case 'description':
          dispatch(setBookingDescription(value as string));
          break;
        case 'estimatedDuration':
          dispatch(setEstimatedDuration(value as number));
          break;
      }

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [dispatch, errors]
  );

  /**
   * Validate current step
   */
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (bookingFlow.currentStep) {
      case 1:
        if (!bookingFlow.selectedService) {
          newErrors.service = 'Please select a service';
        }
        break;

      case 2:
        if (!bookingFlow.selectedTechnician) {
          newErrors.technician = 'Please select a technician';
        }
        break;

      case 4:
        if (!bookingFlow.scheduledDate) {
          newErrors.scheduledDate = 'Please select a date';
        }
        if (!bookingFlow.scheduledTime) {
          newErrors.scheduledTime = 'Please select a time';
        }
        if (!bookingFlow.location.address.trim()) {
          newErrors.address = 'Please enter the service address';
        }
        if (!bookingFlow.description.trim()) {
          newErrors.description = 'Please describe the job';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle next button click
   */
  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      dispatch(nextBookingStep());
    }
  }, [dispatch, bookingFlow.currentStep]);

  /**
   * Handle back button click
   */
  const handleBack = useCallback(() => {
    if (bookingFlow.currentStep > 1) {
      dispatch(prevBookingStep());
    } else {
      navigate(-1);
    }
  }, [dispatch, bookingFlow.currentStep, navigate]);

  /**
   * Handle booking submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    dispatch(setBookingSubmitting(true));

    try {
      // If from matching, use acceptMatch endpoint
      if (bookingFlow.isFromMatching && bookingFlow.matchingRequestId) {
        const acceptParams: AcceptMatchParams = {
          matchId: bookingFlow.matchingRequestId,
          scheduledDate: bookingFlow.scheduledDate,
          scheduledTime: bookingFlow.scheduledTime,
          description: bookingFlow.description,
          estimatedDuration: bookingFlow.estimatedDuration,
          serviceType: bookingFlow.selectedService?.name,
          quantity: bookingFlow.quantity,
        };

        const result = await dispatch(acceptMatch(acceptParams)).unwrap();
        const booking = result.data.booking;

        dispatch(setCreatedBooking(booking));
        if (booking.paymentProvider === 'intasend') {
          toast.success("Request sent. You'll pay into escrow once the technician accepts.");
          navigate(`/bookings/${booking._id}`);
        } else {
          setShowPaymentModal(true);
          toast.success('Booking created! Please complete payment.');
        }
      } else {
        // Direct booking creation
        const bookingData: NewCreateBookingData = {
          service: bookingFlow.selectedService!._id,
          serviceCategory: (bookingFlow.selectedService as unknown as ServiceType).categoryId,
          serviceType: bookingFlow.selectedService!.name,
          technician: bookingFlow.selectedTechnician!._id,
          paymentPlan: bookingFlow.selectedPaymentPlan?._id,
          scheduledDate: bookingFlow.scheduledDate,
          scheduledTime: bookingFlow.scheduledTime,
          location: bookingFlow.location,
          description: bookingFlow.description,
          quantity: bookingFlow.quantity,
          escrowDeposit: bookingFlow.escrowDeposit,
          urgency: bookingFlow.urgency,
          // Legacy fields for backward compatibility
          serviceLocation: {
            coordinates: bookingFlow.location.coordinates
              ? [bookingFlow.location.coordinates.lng, bookingFlow.location.coordinates.lat]
              : [0, 0],
            address: bookingFlow.location.address,
            landmarks: bookingFlow.location.landmarks,
            accessInstructions: bookingFlow.location.accessInstructions,
          },
          estimatedDuration: bookingFlow.estimatedDuration,
        };

        const result = await dispatch(createBooking(bookingData as any)).unwrap();
        const booking = result.booking;

        dispatch(setCreatedBooking(booking));
        if (booking.paymentProvider === 'intasend') {
          toast.success("Request sent. You'll pay into escrow once the technician accepts.");
          navigate(`/bookings/${booking._id}`);
        } else {
          setShowPaymentModal(true);
          toast.success('Booking created! Please complete payment.');
        }
      }
    } catch (error: unknown) {
      console.error('Failed to create booking:', error);
      toast.error(getErrorMessage(error, 'Failed to create booking'));
    } finally {
      dispatch(setBookingSubmitting(false));
    }
  }, [dispatch, bookingFlow, navigate]);

  /**
   * Handle payment success
   */
  const handlePaymentSuccess = useCallback(
    (transactionId: string) => {
      toast.success('Payment successful!');

      // Create confirmation data
      if (bookingFlow.createdBooking) {
        setConfirmationData({
          bookingId: bookingFlow.createdBooking._id,
          bookingNumber: bookingFlow.createdBooking.bookingNumber,
          escrowStatus: 'funded',
          escrowDeposit: bookingFlow.escrowDeposit,
          service: {
            name: bookingFlow.selectedService?.name || '',
            category: (bookingFlow.selectedService as any)?.categoryId || '',
          },
          technician: {
            _id: bookingFlow.selectedTechnician?._id || '',
            firstName: bookingFlow.selectedTechnician?.firstName || '',
            lastName: bookingFlow.selectedTechnician?.lastName || '',
            profilePicture: bookingFlow.selectedTechnician?.profilePicture,
          },
          scheduledDate: bookingFlow.scheduledDate,
          scheduledTime: bookingFlow.scheduledTime,
          nextSteps: [
            'Your booking has been confirmed and escrow deposit received.',
            'The technician will be notified of your booking.',
            'You can contact the technician through our messaging system.',
            'On the scheduled date, the technician will arrive to complete the job.',
            'After job completion, verify the work and release the payment.',
          ],
        });
      }

      setShowPaymentModal(false);
    },
    [bookingFlow]
  );

  /**
   * Handle payment modal close
   */
  const handlePaymentClose = useCallback(() => {
    const confirm = window.confirm(
      'Payment is required to proceed. Close without paying? Your booking will remain pending.'
    );
    if (confirm) {
      setShowPaymentModal(false);
      if (bookingFlow.createdBooking) {
        navigate(`/bookings/${bookingFlow.createdBooking._id}`);
      }
    }
  }, [navigate, bookingFlow.createdBooking]);

  /**
   * Handle new booking
   */
  const handleNewBooking = useCallback(() => {
    dispatch(resetBookingFlow());
    setConfirmationData(null);
  }, [dispatch]);

  // Set minimum date to today on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!bookingFlow.scheduledDate) {
      dispatch(setScheduledDate(today));
    }
  }, []);

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (bookingFlow.currentStep) {
      case 1:
        return (
          <div data-testid="step-service-selection">
            <ServiceDiscovery
              onServiceSelect={handleServiceSelect}
              showCustomServiceOption={true}
            />
            {errors.service && (
              <p className="mt-4 text-sm text-error">{errors.service}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div data-testid="step-technician-selection" className="space-y-4">
            {/* Pre-selected technician badge */}
            {bookingFlow.isFromMatching && bookingFlow.preSelectedTechnicianId && (
              <Card variant="glass" className="p-4 border-lumen/50 bg-lumen/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-lumen-ink" />
                    <span className="text-lumen-ink font-medium">Technician Selected for You</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangeTechnician}
                  >
                    Change
                  </Button>
                </div>
              </Card>
            )}

            <TechnicianSelector
              technicians={bookingFlow.availableTechnicians}
              selectedTechnicianId={bookingFlow.selectedTechnician?._id || null}
              onTechnicianSelect={handleTechnicianSelect}
              loading={isLoadingTechnicians}
            />
            {errors.technician && (
              <p className="mt-4 text-sm text-error">{errors.technician}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div data-testid="step-payment-plan" className="space-y-4">
            {/* Quick Book Badge */}
            {bookingFlow.isFromMatching && (
              <div className="flex items-center gap-2 text-lumen-ink">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Quick Book - Steps 1 & 2 skipped</span>
              </div>
            )}

            <h3 className="text-lg font-semibold text-bone">Select Payment Plan</h3>

            {bookingFlow.selectedTechnician?.paymentPlans &&
            bookingFlow.selectedTechnician.paymentPlans.length > 0 ? (
              <div className="space-y-3">
                {bookingFlow.selectedTechnician.paymentPlans.map((plan) => (
                  <Card
                    key={plan._id}
                    variant={
                      bookingFlow.selectedPaymentPlan?._id === plan._id
                        ? 'glass'
                        : 'default'
                    }
                    className={clsx(
                      'p-4 cursor-pointer transition-all duration-200',
                      bookingFlow.selectedPaymentPlan?._id === plan._id &&
                        'border-lumen shadow-led'
                    )}
                    onClick={() => handlePaymentPlanSelect(plan)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-bone font-medium">{plan.name}</h4>
                        <p className="text-sm text-steel mt-1">
                          {plan.description}
                        </p>
                        {plan.installments && (
                          <p className="text-xs text-steel mt-1">
                            {plan.installments} installments
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lumen-ink font-bold">
                          {plan.depositPercentage}% deposit
                        </p>
                        <p className="text-xs text-steel">
                          {plan.frequency.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card variant="default" className="p-6 text-center">
                <p className="text-steel">
                  This technician uses the standard payment plan.
                </p>
                <p className="text-bone font-medium mt-2">
                  {escrowMode ? 'Full price held in escrow' : '20% deposit required upfront'}
                </p>
                <p className="text-sm text-steel mt-1">
                  {escrowMode
                    ? 'You pay by M-Pesa after the technician accepts. They are paid when you confirm the work.'
                    : 'Remaining balance due after job completion'}
                </p>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div data-testid="step-schedule-details" className="space-y-6">
            {/* Scheduling */}
            <Card variant="default" className="p-6">
              <h3 className="flex items-center text-lg font-semibold text-bone mb-4">
                <Calendar className="mr-2 h-5 w-5 text-lumen-ink" />
                Scheduling
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={bookingFlow.scheduledDate}
                    onChange={(e) =>
                      handleFieldChange('scheduledDate', e.target.value)
                    }
                    min={new Date().toISOString().split('T')[0]}
                    error={errors.scheduledDate}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={bookingFlow.scheduledTime}
                    onChange={(e) =>
                      handleFieldChange('scheduledTime', e.target.value)
                    }
                    error={errors.scheduledTime}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1">
                    Quantity / Units
                  </label>
                  <Input
                    type="number"
                    value={bookingFlow.quantity}
                    onChange={(e) =>
                      handleFieldChange('quantity', parseInt(e.target.value) || 1)
                    }
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              {/* Urgency Display */}
              <div className="mt-4 bg-lumen/10 rounded-lg p-4 border border-lumen/30">
                <p className="text-sm text-bone">
                  <span className="font-semibold text-lumen-ink">Pricing Tip:</span> Urgency level is automatically calculated based on your scheduled date and time:
                </p>
                <ul className="mt-2 text-xs text-steel space-y-1 ml-4">
                  <li>Within 4 hours = Emergency (2.0x base price)</li>
                  <li>Within 24 hours = High urgency (1.5x base price)</li>
                  <li>Within 3 days = Medium urgency (1.2x base price)</li>
                  <li>3+ days ahead = Low urgency (standard price)</li>
                </ul>
                {bookingFlow.priceEstimate?.details?.urgency && (
                  <div className="mt-2 pt-2 border-t border-lumen/20">
                    <p className="text-xs text-lumen-ink">
                      Current: {bookingFlow.priceEstimate.details.urgency.level.toUpperCase()} urgency
                      ({bookingFlow.priceEstimate.details.urgency.multiplier}x)
                      - {bookingFlow.priceEstimate.details.urgency.reason}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Location - Enhanced with LocationInput and Saved Address Toggle */}
            <Card variant="default" className="p-6">
              <h3 className="flex items-center text-lg font-semibold text-bone mb-4">
                <MapPin className="mr-2 h-5 w-5 text-lumen-ink" />
                Service Location
              </h3>

              {/* Use Saved Address Option */}
              {hasSavedAddress && (
                <div className="mb-4 flex items-center">
                  <button
                    type="button"
                    onClick={handleUseSavedAddressToggle}
                    disabled={isCreating}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
                      'text-sm font-medium',
                      useSavedAddress
                        ? 'bg-lumen/20 border-lumen text-lumen-ink'
                        : 'bg-transparent border-steel/40 text-steel hover:border-lumen hover:text-lumen-ink',
                      isCreating && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      useSavedAddress
                        ? 'bg-lumen border-lumen'
                        : 'border-steel/60 bg-transparent'
                    )}>
                      {useSavedAddress && <Check className="w-3 h-3 text-ink" />}
                    </div>
                    <span>Use my saved address</span>
                  </button>
                  {useSavedAddress && (
                    <span className="ml-2 text-xs text-steel">
                      ({user?.location?.address})
                    </span>
                  )}
                </div>
              )}

              <LocationInput
                value={locationData}
                onChange={setLocationData}
                errors={{
                  address: errors.address,
                }}
                disabled={isCreating || useSavedAddress}
              />
            </Card>

            {/* Job Description */}
            <Card variant="default" className="p-6">
              <h3 className="flex items-center text-lg font-semibold text-bone mb-4">
                <FileText className="mr-2 h-5 w-5 text-lumen-ink" />
                Job Description
              </h3>

              <div className="space-y-4">
                <Textarea
                  label="Describe the job"
                  value={bookingFlow.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  rows={4}
                  placeholder="Describe the issue or service needed in detail..."
                  error={errors.description}
                  required
                />
                <div className="flex justify-end">
                  <p className={clsx(
                    'text-xs',
                    bookingFlow.description.length >= 1000 ? 'text-warning' : 'text-steel'
                  )}>
                    {bookingFlow.description.length}/1000
                  </p>
                </div>

                {/* Estimated Duration */}
                <div>
                  <label className="block text-sm font-medium text-bone mb-1">
                    Estimated Duration (hours)
                  </label>
                  <Input
                    type="number"
                    value={bookingFlow.estimatedDuration ? (bookingFlow.estimatedDuration / 60).toString() : ''}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      handleFieldChange('estimatedDuration', Math.round(hours * 60));
                    }}
                    min="0.5"
                    step="0.5"
                    placeholder="e.g., 2 for 2 hours"
                  />
                  <p className="mt-1 text-xs text-steel">
                    Default: 2 hours
                  </p>
                </div>
              </div>
            </Card>

            {/* Price Estimate Display */}
            {bookingFlow.priceEstimate && (
              <PriceEstimate pricing={bookingFlow.priceEstimate as PricingBreakdown} isEstimate={true} />
            )}

            {bookingFlow.isLoadingEstimate && (
              <Card variant="default" className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lumen"></div>
                  <span className="ml-3 text-steel">Calculating price estimate...</span>
                </div>
              </Card>
            )}
          </div>
        );

      case 5:
        const summaryData: BookingSummaryData = {
          service: bookingFlow.selectedService!,
          technician: bookingFlow.selectedTechnician!,
          paymentPlan: bookingFlow.selectedPaymentPlan || undefined,
          scheduledDate: bookingFlow.scheduledDate,
          scheduledTime: bookingFlow.scheduledTime,
          location: bookingFlow.location,
          description: bookingFlow.description,
          escrowDeposit: bookingFlow.escrowDeposit,
          platformFee: bookingFlow.priceEstimate?.platformFee ||
            calculatePlatformFee(bookingFlow.selectedTechnician?.priceRange.min || 0),
          totalAmount: bookingFlow.priceEstimate?.totalAmount ||
            bookingFlow.selectedTechnician?.priceRange.min || 0,
          quantity: bookingFlow.quantity,
        };

        return (
          <div data-testid="step-confirm-pay" className="space-y-4">
            {/* Quick Book Badge */}
            {bookingFlow.isFromMatching && (
              <Card variant="glass" className="p-3 border-lumen/50 bg-lumen/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lumen-ink" />
                  <span className="text-sm text-lumen-ink font-medium">
                    Quick Book - Booked from AI matching
                  </span>
                </div>
              </Card>
            )}

            <BookingSummary
              summary={summaryData}
              onEditStep={(step) => dispatch(setBookingStep(step))}
              isProcessing={bookingFlow.isSubmitting}
            />

            {/* Price Estimate Summary */}
            {bookingFlow.priceEstimate && (
              <Card variant="glass" className="p-4">
                <h4 className="text-bone font-medium mb-3">Price Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-steel">Base Price</span>
                    <span className="text-bone">KES {bookingFlow.priceEstimate.basePrice.toLocaleString()}</span>
                  </div>
                  {bookingFlow.priceEstimate.distanceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-steel">Distance Fee</span>
                      <span className="text-bone">KES {bookingFlow.priceEstimate.distanceFee.toLocaleString()}</span>
                    </div>
                  )}
                  {bookingFlow.priceEstimate.urgencyMultiplier > 1 && (
                    <div className="flex justify-between">
                      <span className="text-steel">Urgency ({bookingFlow.priceEstimate.urgencyMultiplier}x)</span>
                      <span className="text-warning">+KES {Math.round((bookingFlow.priceEstimate.subtotal * (bookingFlow.priceEstimate.urgencyMultiplier - 1))).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-steel">Platform Fee</span>
                    <span className="text-bone">KES {bookingFlow.priceEstimate.platformFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-line pt-2 flex justify-between font-medium">
                    <span className="text-bone">Total</span>
                    <span className="text-lumen-ink">KES {bookingFlow.priceEstimate.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Show confirmation screen if booking is complete
  if (confirmationData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BookingConfirmation
          confirmation={confirmationData}
          onNewBooking={handleNewBooking}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center text-ink-muted hover:text-ink text-ink"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {bookingFlow.currentStep > 1 ? 'Previous Step' : 'Back'}
        </button>

        <h1 className="text-3xl font-bold text-ink">
          {bookingFlow.isFromMatching ? 'Complete Your Booking' : 'Book a Service'}
        </h1>
        <p className="mt-2 text-ink-muted">
          {bookingFlow.isFromMatching ? (
            <>
              Booking with <span className="text-lumen-ink font-medium">
                {bookingFlow.selectedTechnician?.firstName} {bookingFlow.selectedTechnician?.lastName}
              </span>
            </>
          ) : (
            `Complete the ${5 - bookingFlow.currentStep + 1} remaining step(s) to create your booking`
          )}
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <BookingStepper
          steps={getSteps()}
          currentStep={bookingFlow.currentStep}
          onStepClick={handleStepClick}
          allowNavigation={true}
        />
      </div>

      {/* Step content */}
      <div className="mb-8">{renderStepContent()}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={bookingFlow.isSubmitting}
        >
          {bookingFlow.currentStep > 1 ? 'Previous' : 'Cancel'}
        </Button>

        {bookingFlow.currentStep < 5 ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            disabled={bookingFlow.isSubmitting}
            className="min-w-[200px]"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={bookingFlow.isSubmitting}
            className="min-w-[200px]"
          >
            {bookingFlow.isSubmitting
              ? 'Processing...'
              : escrowMode
                ? 'Send booking request'
                : `Pay Deposit (KES ${bookingFlow.escrowDeposit.toLocaleString()})`}
          </Button>
        )}
      </div>

      {/* Payment Modal */}
      {bookingFlow.createdBooking && (
        <BookingFeePaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          amount={bookingFlow.escrowDeposit}
          currency="KES"
          bookingId={bookingFlow.createdBooking._id}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default CreateBookingFlow;
