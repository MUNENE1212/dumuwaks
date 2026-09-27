import React, { useState } from 'react';
import { MapPin, Play, CheckCircle, Pause, XCircle } from 'lucide-react';
import { Booking } from '@/store/slices/bookingSlice';
import {
  updateToEnRoute,
  updateToArrived,
  updateToInProgress,
  requestCompletion,
  pauseJob,
  cancelBooking,
} from '@/store/slices/bookingSlice';
import { useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface TechnicianStatusActionsProps {
  booking: Booking;
  onUpdate?: () => void;
}

const TechnicianStatusActions: React.FC<TechnicianStatusActionsProps> = ({ booking, onUpdate }) => {
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleStatusUpdate = async (action: any, successMessage: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      await dispatch(action).unwrap();
      setNotes('');
      setShowNotes(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Status update error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnRoute = () => {
    handleStatusUpdate(
      updateToEnRoute({ bookingId: booking._id, notes }),
      'Status updated to en route'
    );
  };

  const handleArrived = () => {
    handleStatusUpdate(
      updateToArrived({ bookingId: booking._id, notes }),
      'Status updated to arrived'
    );
  };

  const handleStartWork = () => {
    handleStatusUpdate(
      updateToInProgress({ bookingId: booking._id, notes }),
      'Work started'
    );
  };

  const handleRequestCompletion = () => {
    handleStatusUpdate(
      requestCompletion({ bookingId: booking._id, notes }),
      'Completion request sent to customer'
    );
  };

  const handlePause = () => {
    const reason = prompt('Please provide a reason for pausing the job (optional):');
    if (reason === null) return; // User cancelled

    handleStatusUpdate(
      pauseJob({ bookingId: booking._id, reason }),
      'Job paused'
    );
  };

  const handleCancel = () => {
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return; // User cancelled

    handleStatusUpdate(
      cancelBooking({ bookingId: booking._id, reason }),
      'Booking cancelled'
    );
  };

  // Determine what actions are available based on current status
  const renderActions = () => {
    const { status } = booking;

    switch (status) {
      case 'accepted':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleEnRoute}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center"
              >
                <MapPin className="mr-2 h-4 w-4" />
                {isProcessing ? 'Updating...' : 'Set as En Route'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'en_route':
        return (
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleArrived}
              disabled={isProcessing}
              className="w-full flex items-center justify-center"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {isProcessing ? 'Updating...' : 'Mark as Arrived'}
            </Button>
          </div>
        );

      case 'arrived':
        return (
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleStartWork}
              disabled={isProcessing}
              className="w-full flex items-center justify-center"
            >
              <Play className="mr-2 h-4 w-4" />
              {isProcessing ? 'Starting...' : 'Start Work'}
            </Button>
          </div>
        );

      case 'in_progress':
        return (
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleRequestCompletion}
              disabled={isProcessing}
              className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isProcessing ? 'Requesting...' : 'Request Completion'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePause}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'paused':
        return (
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleStartWork}
              disabled={isProcessing}
              className="w-full flex items-center justify-center"
            >
              <Play className="mr-2 h-4 w-4" />
              {isProcessing ? 'Resuming...' : 'Resume Work'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Booking
            </Button>
          </div>
        );

      case 'completed':
        return (
          <div className="rounded-lg bg-yellow-900/20 border border-yellow-800 p-4">
            <p className="text-sm text-yellow-300 font-medium">
              ⏳ Awaiting customer confirmation
            </p>
            <p className="text-xs text-yellow-400 mt-1">
              The customer has 48 hours to confirm or report issues
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-line bg-surface-200 p-4">
      <h3 className="text-lg font-semibold text-ink mb-4">
        Update Status
      </h3>
      {renderActions()}
    </div>
  );
};

export default TechnicianStatusActions;
