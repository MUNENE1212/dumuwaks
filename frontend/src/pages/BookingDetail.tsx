import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBooking, cancelBooking } from '@/store/slices/bookingSlice';
import { fetchMyGallery, addGalleryImage } from '@/store/slices/workGallerySlice';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import BookingFeePaymentModal from '@/components/bookings/BookingFeePaymentModal';
import EscrowPanel from '@/components/payment/EscrowPanel';
import TechnicianStatusActions from '@/components/bookings/TechnicianStatusActions';
import CompletionConfirmation from '@/components/bookings/CompletionConfirmation';
import WorkGalleryUploadModal from '@/components/workgallery/WorkGalleryUploadModal';
import TechnicianTracker from '@/components/booking/TechnicianTracker';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Clock,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Camera,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { formatRating } from '@/utils/rating';
import { getErrorMessage } from '@/lib/errorUtils';
import type { ImageUploadFormData } from '@/types/workGallery';
import type { LucideIcon } from 'lucide-react';
import VerifiedBadge from '@/components/common/VerifiedBadge';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: Clock,
  },
  matching: {
    label: 'Finding Technician',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Clock,
  },
  assigned: {
    label: 'Assigned',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: User,
  },
  accepted: {
    label: 'Accepted',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  en_route: {
    label: 'On The Way',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: MapPin,
  },
  arrived: {
    label: 'Arrived',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: MapPin,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  verified: {
    label: 'Verified',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: CheckCircle,
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
  },
  disputed: {
    label: 'Disputed',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: AlertCircle,
  },
};

const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const { currentBooking: booking, isLoading, isUpdating } = useAppSelector(
    (state) => state.bookings
  );
  const { user } = useAppSelector((state) => state.auth);
  const { images: workGalleryImages, isUploading: isGalleryUploading } = useAppSelector(
    (state) => state.workGallery
  );

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showWorkGalleryPrompt, setShowWorkGalleryPrompt] = useState(false);

  // Determine user role (needed for useEffect hooks below)
  const isCustomer = user?.role === 'customer';
  const isTechnician = user?.role === 'technician';

  useEffect(() => {
    if (id) {
      dispatch(fetchBooking(id));
    }
  }, [id, dispatch]);

  // Check for ?action=pay query parameter and auto-open payment modal
  useEffect(() => {
    if (searchParams.get('action') === 'pay' && booking && booking.paymentProvider !== 'intasend' && booking.bookingFee?.status === 'pending') {
      setIsPaymentModalOpen(true);
    }
  }, [searchParams, booking]);

  // Fetch work gallery and check if prompt should be shown
  useEffect(() => {
    if (booking && isTechnician && booking.status === 'completed') {
      dispatch(fetchMyGallery());

      // Show prompt if booking was just completed (within last 24 hours)
      // and user has less than 5 images
      const completedDate = new Date(booking.updatedAt);
      const hoursSinceCompletion = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCompletion < 24 && workGalleryImages.length < 5) {
        setShowWorkGalleryPrompt(true);
      }
    }
  }, [booking, isTechnician, dispatch, workGalleryImages.length]);

  const handleCancelBooking = async () => {
    if (!booking) return;

    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return; // User cancelled the prompt

    try {
      await dispatch(
        cancelBooking({
          bookingId: booking._id,
          reason: reason || undefined,
        })
      ).unwrap();
      setShowCancelDialog(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to cancel booking'));
    }
  };

  const handleUpdate = () => {
    // Refresh booking data after any status update
    if (id) {
      dispatch(fetchBooking(id));
    }
  };

  const handleSendMessage = () => {
    navigate('/messages');
  };

  // Handle work gallery upload
  const handleWorkGalleryUpload = async (data: ImageUploadFormData) => {
    try {
      await dispatch(addGalleryImage(data)).unwrap();
      toast.success('Work photo added to your gallery!');
      setIsUploadModalOpen(false);
      setShowWorkGalleryPrompt(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to add work photo'));
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading size="lg" text="Loading booking details..." />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/bookings')}
          className="mb-4 flex items-center text-ink-muted hover:text-ink text-ink"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink">
              Booking #{booking.bookingNumber}
            </h1>
            <p className="mt-2 text-ink-muted">{booking.serviceType}</p>
          </div>

          {/* Status Badge */}
          <div className={cn('flex items-center space-x-2 rounded-full px-4 py-2', statusConfig.bgColor)}>
            <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
            <span className={cn('font-semibold', statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Service Details */}
          <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
              <FileText className="mr-2 h-5 w-5 text-primary-600" />
              Service Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink-muted">Service Category</label>
                <p className="mt-1 font-medium capitalize text-ink">
                  {booking.serviceCategory.replace('_', ' ')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-muted">Description</label>
                <p className="mt-1 text-ink">{booking.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-muted">Urgency</label>
                <p className="mt-1 font-medium capitalize text-ink">{booking.urgency}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
              <Calendar className="mr-2 h-5 w-5 text-primary-600" />
              Schedule
            </h2>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-ink-muted" />
                <div>
                  <p className="text-sm text-ink-muted">Date</p>
                  <p className="font-medium text-ink">
                    {format(new Date(booking.timeSlot.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-ink-muted" />
                <div>
                  <p className="text-sm text-ink-muted">Time</p>
                  <p className="font-medium text-ink">
                    {booking.timeSlot.startTime}
                    {booking.timeSlot.endTime && ` - ${booking.timeSlot.endTime}`}
                  </p>
                </div>
              </div>

              {booking.timeSlot.estimatedDuration && (
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-ink-muted" />
                  <div>
                    <p className="text-sm text-ink-muted">Estimated Duration</p>
                    <p className="font-medium text-ink">
                      {booking.timeSlot.estimatedDuration} minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
              <MapPin className="mr-2 h-5 w-5 text-primary-600" />
              Service Location
            </h2>

            <div className="space-y-2">
              <p className="text-ink">{booking.serviceLocation.address}</p>
              {booking.serviceLocation.landmarks && (
                <p className="text-sm text-ink-muted">
                  <strong>Landmarks:</strong> {booking.serviceLocation.landmarks}
                </p>
              )}
              {booking.serviceLocation.accessInstructions && (
                <p className="text-sm text-ink-muted">
                  <strong>Access Instructions:</strong> {booking.serviceLocation.accessInstructions}
                </p>
              )}
            </div>
          </div>

          {/* Real-time Technician Tracking - Show when en_route */}
          {isCustomer && booking.status === 'en_route' && booking.technician && booking.serviceLocation.coordinates && (
            <TechnicianTracker
              bookingId={booking._id}
              destination={{
                coordinates: booking.serviceLocation.coordinates as [number, number],
                address: booking.serviceLocation.address
              }}
              technicianName={`${booking.technician.firstName} ${booking.technician.lastName}`}
              technicianId={booking.technician._id}
              onTrackingCompleted={() => {
                // Refresh booking when technician arrives
                if (id) {
                  dispatch(fetchBooking(id));
                }
              }}
            />
          )}

          {/* Pricing */}
          {booking.pricing && (
            <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                <DollarSign className="mr-2 h-5 w-5 text-primary-600" />
                Pricing
              </h2>

              <div className="space-y-3">
                {booking.pricing.basePrice && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Base Price</span>
                    <span className="font-medium text-ink">
                      KES {booking.pricing.basePrice.toLocaleString()}
                    </span>
                  </div>
                )}
                {booking.pricing.platformFee && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Platform Fee</span>
                    <span className="font-medium text-ink">
                      KES {booking.pricing.platformFee.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="border-t border-line pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-ink">Total</span>
                    <span className="text-lg font-bold text-primary-600">
                      KES {booking.pricing.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - People & Actions */}
        <div className="space-y-6">
          {/* Technician Info */}
          {booking.technician && (
            <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">
                {isCustomer ? 'Your Technician' : 'Technician'}
              </h2>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {booking.technician.profilePicture ? (
                    <img
                      src={booking.technician.profilePicture}
                      alt={booking.technician.firstName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                      {booking.technician.firstName[0]}
                      {booking.technician.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ink">
                      {booking.technician.firstName} {booking.technician.lastName}
                    </p>
                    <VerifiedBadge user={booking.technician} className="mt-1" />
                    {booking.technician.rating && (
                      <p className="text-sm text-ink-muted">
                        ⭐ {formatRating(booking.technician.rating)}
                      </p>
                    )}
                  </div>
                </div>

                {isCustomer && !booking.contactsHidden && booking.technician?.phoneNumber && !booking.technician.phoneNumber.includes('[Hidden') && (
                  <div className="space-y-2">
                    <a
                      href={`tel:${booking.technician.phoneNumber}`}
                      className="flex items-center space-x-2 rounded-lg border border-line-strong px-4 py-2 text-ink-muted hover:bg-surface-300"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{booking.technician.phoneNumber}</span>
                    </a>

                    <button
                      onClick={handleSendMessage}
                      className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-on-lumen hover:bg-primary-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">Send Message</span>
                    </button>
                  </div>
                )}

                {isCustomer && (booking.contactsHidden || !booking.technician || booking.technician.phoneNumber?.includes('[Hidden')) && (
                  <div className="mt-4 rounded-lg bg-yellow-900/20 border border-yellow-800 p-4">
                    <p className="text-sm text-yellow-300">
                      {booking.contactsHiddenReason || 'Complete payment to view technician contact details and begin communication.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Info (for technician) */}
          {isTechnician && booking.customer && (
            <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">Customer</h2>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {booking.customer.profilePicture ? (
                    <img
                      src={booking.customer.profilePicture}
                      alt={booking.customer.firstName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-300 text-lg font-bold text-ink-muted">
                      {booking.customer.firstName[0]}
                      {booking.customer.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ink">
                      {booking.customer.firstName} {booking.customer.lastName}
                    </p>
                  </div>
                </div>

                {!booking.contactsHidden && booking.customer?.phoneNumber && !booking.customer.phoneNumber.includes('[Hidden') && (
                  <div className="space-y-2">
                    <a
                      href={`tel:${booking.customer.phoneNumber}`}
                      className="flex items-center space-x-2 rounded-lg border border-line-strong px-4 py-2 text-ink-muted hover:bg-surface-300"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{booking.customer.phoneNumber}</span>
                    </a>

                    <button
                      onClick={handleSendMessage}
                      className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-on-lumen hover:bg-primary-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">Send Message</span>
                    </button>
                  </div>
                )}

                {(booking.contactsHidden || booking.customer.phoneNumber?.includes('[Hidden')) && (
                  <div className="mt-4 rounded-lg bg-yellow-900/20 border border-yellow-800 p-4">
                    <p className="text-sm text-yellow-300">
                      {booking.contactsHiddenReason || 'Customer contact details will be available once booking payment is confirmed.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real escrow: pay, held, released */}
          {booking.paymentProvider === 'intasend' && booking.technician && (
            <EscrowPanel
              bookingId={booking._id}
              role={isCustomer ? 'customer' : isTechnician ? 'technician' : 'staff'}
              onChange={() => id && dispatch(fetchBooking(id))}
            />
          )}

          {/* Payment Required Alert (bookings on the earlier 20% fee flow) */}
          {isCustomer && booking.paymentProvider !== 'intasend' && booking.bookingFee?.status === 'pending' && (
            <div className="rounded-lg bg-red-900/20 border border-red-800 p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-300">Payment Required</h3>
                  <p className="text-sm text-red-400 mt-1">
                    Complete the booking fee payment to proceed with technician assignment and unlock contact details.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="mt-3 w-full bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Pay Booking Fee (KES {booking.bookingFee.amount.toLocaleString()})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Customer - Completion Confirmation */}
          {isCustomer && booking.status === 'completed' && (
            <CompletionConfirmation booking={booking} onUpdate={handleUpdate} />
          )}

          {/* Technician - Status Actions */}
          {isTechnician && (
            <TechnicianStatusActions booking={booking} onUpdate={handleUpdate} />
          )}

          {/* Cancel Booking Button (Customer) */}
          {isCustomer && ['pending', 'matching', 'assigned', 'accepted'].includes(booking.status) && (
            <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="w-full text-red-600 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Booking
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000 bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface-200 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-ink">Cancel Booking?</h3>
            <p className="mt-2 text-ink-muted">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <div className="mt-6 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                className="flex-1"
                disabled={isUpdating}
              >
                Keep Booking
              </Button>
              <Button
                variant="primary"
                onClick={handleCancelBooking}
                disabled={isUpdating}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isUpdating ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {booking && (
        <BookingFeePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bookingId={booking._id}
          amount={booking.bookingFee?.amount || 0}
          onPaymentSuccess={() => {
            setIsPaymentModalOpen(false);
            toast.success('Payment completed successfully!');
            // Refresh booking data
            if (id) {
              dispatch(fetchBooking(id));
            }
          }}
        />
      )}

      {/* Work Gallery Prompt for Technicians after completion */}
      {showWorkGalleryPrompt && isTechnician && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm">
          <div className="bg-surface-200 rounded-lg shadow-lg border border-primary-800 overflow-hidden">
            <div className="bg-primary-600 px-4 py-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-ink" />
                <span className="font-semibold text-ink">Showcase Your Work!</span>
              </div>
              <button
                onClick={() => setShowWorkGalleryPrompt(false)}
                className="text-ink/80 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-ink-muted mb-3">
                Great job completing this booking! Add photos of your work to your gallery to attract more customers.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWorkGalleryPrompt(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowWorkGalleryPrompt(false);
                    setIsUploadModalOpen(true);
                  }}
                  className="flex-1"
                >
                  Add Photos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Gallery Upload Modal */}
      <WorkGalleryUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleWorkGalleryUpload}
        currentImageCount={workGalleryImages.length}
        isUploading={isGalleryUploading}
      />
    </div>
  );
};

export default BookingDetail;
