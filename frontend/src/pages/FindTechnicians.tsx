import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  findTechnicians,
  rejectMatch,
  clearMatches,
  clearError,
  FindTechniciansParams,
} from '@/store/slices/matchingSlice';
import SearchFilters from '@/components/matching/SearchFilters';
import TechnicianCard from '@/components/matching/TechnicianCard';
import Loading from '@/components/ui/Loading';
import Alert from '@/components/ui/Alert';
import { Users, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const FindTechnicians: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { matches, isSearching, error } = useAppSelector((state) => state.matching);

  const [hasSearched, setHasSearched] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    // Clear any previous searches when component mounts
    dispatch(clearMatches());
  }, [dispatch]);

  useEffect(() => {
    // Clear error after 5 seconds
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSearch = async (params: FindTechniciansParams) => {
    setHasSearched(true);
    const result = await dispatch(findTechnicians(params));

    if (findTechnicians.fulfilled.match(result)) {
      const count = result.payload.data.length;
      if (count === 0) {
        toast.error('No technicians found matching your criteria. Try adjusting your filters.');
      } else {
        toast.success(`Found ${count} matching technician${count > 1 ? 's' : ''}!`);
      }
    }
  };

  const handleViewProfile = (technicianId: string) => {
    navigate(`/technicians/${technicianId}`);
  };

  const handleAccept = (matchId: string) => {
    setSelectedMatchId(matchId);
    setShowAcceptModal(true);
  };

  const handleReject = async (matchId: string) => {
    if (window.confirm('Are you sure you want to reject this match?')) {
      const result = await dispatch(rejectMatch({ matchId }));
      if (rejectMatch.fulfilled.match(result)) {
        toast.success('Match rejected');
      }
    }
  };

  const proceedToBooking = () => {
    if (selectedMatchId) {
      const match = matches.find((m) => m._id === selectedMatchId);
      if (match) {
        // Navigate to booking page with match data
        navigate(`/booking/create`, {
          state: {
            matchId: selectedMatchId,
            technician: match.technician,
            serviceCategory: match.serviceCategory,
            location: match.location,
          },
        });
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="flex flex-col sm:flex-row sm:items-center text-2xl sm:text-3xl font-bold text-ink gap-2">
          <div className="flex items-center">
            <Sparkles className="mr-2 h-6 w-6 sm:h-8 sm:w-8 text-primary-600 flex-shrink-0" />
            <span>Find the Perfect Technician</span>
          </div>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-muted">
          Technicians ranked by skills, distance, ratings and availability.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="error"
            message={error}
            onClose={() => dispatch(clearError())}
          />
        </div>
      )}

      {/* Layout */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Left Column - Search Filters */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-6">
            <SearchFilters onSearch={handleSearch} isSearching={isSearching} />
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-8">
          {isSearching ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-line bg-surface-200">
              <div className="text-center">
                <Loading size="lg" />
                <p className="mt-4 text-ink-muted">Searching for the best technicians...</p>
                <p className="mt-2 text-sm text-ink-muted">
                  Analyzing skills, ratings, location, and availability
                </p>
              </div>
            </div>
          ) : !hasSearched ? (
            <div className="flex min-h-[300px] sm:min-h-[400px] items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-100 p-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-ink-muted" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold text-ink">
                  Start Your Search
                </h3>
                <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-ink-muted px-4">
                  Fill in the search criteria on the left to find technicians matched to your needs.
                  Our AI will rank them based on multiple factors.
                </p>
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface-200 p-6 sm:p-12">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-ink-muted" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold text-ink">No Matches Found</h3>
                <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-ink-muted px-4">
                  We couldn't find any technicians matching your criteria. Try:
                </p>
                <ul className="mt-4 space-y-2 text-left text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>Increasing your maximum distance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>Adjusting your budget range</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>Lowering urgency requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>Being more flexible with dates</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Results Header */}
              <div className="rounded-lg border border-primary-800 bg-primary-900/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-primary-100">
                      {matches.length} Technician{matches.length > 1 ? 's' : ''} Found
                    </h2>
                    <p className="text-xs sm:text-sm text-primary-300">
                      Sorted by match quality - best matches first
                    </p>
                  </div>
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary-400 flex-shrink-0" />
                </div>
              </div>

              {/* Match Cards */}
              {matches.map((match) => (
                <TechnicianCard
                  key={match._id}
                  match={match}
                  onViewProfile={handleViewProfile}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}

              {/* Tips */}
              <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-4">
                <h3 className="mb-3 text-sm sm:text-base font-semibold text-blue-100">Tips for choosing:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-blue-200">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-base">💡</span>
                    <span>
                      Matches with 90+ scores are excellent fits for your requirements
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-base">⭐</span>
                    <span>
                      Check the detailed scores to see exactly why each technician was matched
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-base">📍</span>
                    <span>Closer technicians may arrive faster and have lower travel costs</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accept Match Modal */}
      {showAcceptModal && selectedMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000 bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface-200 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-ink">Proceed to Booking?</h3>
            <p className="mt-2 text-ink-muted">
              You'll be taken to the booking page where you can schedule the service and provide
              additional details.
            </p>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="flex-1 rounded-lg border border-line-strong px-4 py-2 text-ink-muted hover:bg-surface-100 bg-surface-100"
              >
                Cancel
              </button>
              <button
                onClick={proceedToBooking}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-on-lumen hover:bg-primary-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindTechnicians;
