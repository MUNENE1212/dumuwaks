import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Calendar, MapPin, CreditCard, Wrench, MessageCircle, Bot } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createBooking, CreateBookingData } from '@/store/slices/bookingSlice';
import { acceptMatch, AcceptMatchParams } from '@/store/slices/matchingSlice';
import { Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { generateBotResponse } from '@/lib/problemDetection';
import ServiceTypeSelector from './ServiceTypeSelector';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { hapticMedium } from '@/lib/haptics';
import { CameraCapture } from '@/components/camera';
import { bookingStepSchemas } from '@/lib/validation';

const SERVICE_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'welding', label: 'Welding' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'general_handyman', label: 'General Handyman' },
  { value: 'other', label: 'Other' },
];

interface BookingWizardProps {
  matchId?: string;
  technician?: { _id: string; firstName: string; lastName: string };
  serviceCategory?: string;
  location?: { coordinates: [number, number]; address: string };
  prefilledData?: {
    service: string;
    problem: string;
    date: string;
    time: string;
    location: string;
  };
}

interface BotMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  options?: string[];
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  matchId,
  technician,
  serviceCategory: initialCategory,
  location: initialLocation,
  prefilledData
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isCreating } = useAppSelector((state) => state.bookings);

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);

  // Map service name to category value
  const getServiceCategoryValue = (serviceName: string): string => {
    const category = SERVICE_CATEGORIES.find(c =>
      serviceName.toLowerCase().includes(c.label.toLowerCase()) ||
      serviceName.toLowerCase().includes(c.value.toLowerCase())
    );
    return category?.value || serviceName.toLowerCase().replace(/\s+/g, '_');
  };

  const [formData, setFormData] = useState<CreateBookingData>({
    serviceType: '',
    serviceCategory: prefilledData?.service ? getServiceCategoryValue(prefilledData.service) : (initialCategory || ''),
    description: prefilledData?.problem || '',
    scheduledDate: prefilledData?.date || '',
    scheduledTime: prefilledData?.time || '',
    estimatedDuration: 120,
    serviceLocation: {
      coordinates: initialLocation?.coordinates || [0, 0],
      address: prefilledData?.location || initialLocation?.address || '',
      landmarks: '',
      accessInstructions: '',
    },
    technician: technician?._id || '',
    urgency: 'medium',
    images: [],
    quantity: 1,
  });

  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: '1',
      role: 'bot',
      content: prefilledData
        ? `I've pre-filled your booking details based on our conversation:\n\n• Service: ${prefilledData.service}\n• Issue: ${prefilledData.problem}\n• When: ${prefilledData.date} at ${prefilledData.time}\n• Where: ${prefilledData.location}\n\nPlease review and complete the booking!`
        : "Hi! 👋 I'm here to help you describe your problem. Tell me what's happening and I'll provide guidance.",
      options: prefilledData ? ['Looks good!', 'I need to make changes'] : SERVICE_CATEGORIES.slice(0, 6).map(c => c.label)
    }
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [problemImage, setProblemImage] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Service', icon: Wrench },
    { id: 2, title: 'Problem', icon: MessageCircle },
    { id: 3, title: 'Details', icon: Calendar },
    { id: 4, title: 'Location', icon: MapPin },
    { id: 5, title: 'Confirm', icon: Check },
  ];

  // Swipe gestures for mobile navigation
  useSwipeGestures({
    onSwipeLeft: () => {
      if (currentStep < steps.length) {
        setDirection(1);
        setCurrentStep(currentStep + 1);
        hapticMedium();
      }
    },
    onSwipeRight: () => {
      if (currentStep > 1) {
        setDirection(-1);
        setCurrentStep(currentStep - 1);
        hapticMedium();
      }
    }
  });

  const nextStep = () => {
    const { valid, error } = validateCurrentStep();
    if (!valid) {
      toast.error(error || 'Please complete all required fields');
      return;
    }
    if (currentStep < steps.length) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBotMessage = async (message: string) => {
    const userMessage: BotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message
    };

    setBotMessages(prev => [...prev, userMessage]);
    setIsBotTyping(true);

    setTimeout(() => {
      const response = generateBotResponse(message, botMessages);
      setBotMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'bot',
        content: response.content,
        options: response.options
      }]);
      setIsBotTyping(false);

      // Auto-fill service category if detected
      const category = SERVICE_CATEGORIES.find(c =>
        message.toLowerCase().includes(c.label.toLowerCase()) ||
        message.toLowerCase().includes(c.value.toLowerCase())
      );
      if (category && !formData.serviceCategory) {
        setFormData(prev => ({ ...prev, serviceCategory: category.value }));
      }
    }, 1000);
  };

  const handleSubmit = async () => {
    try {
      if (matchId) {
        const acceptParams: AcceptMatchParams = {
          matchId,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime!,
          description: formData.description,
          estimatedDuration: formData.estimatedDuration,
          serviceType: formData.serviceType,
          quantity: formData.quantity || 1,
        };

        const result = await dispatch(acceptMatch(acceptParams)).unwrap();
        toast.success('Booking created successfully!');
        navigate(`/bookings/${result.data.booking._id}`);
      } else {
        const result = await dispatch(createBooking(formData)).unwrap();
        toast.success('Booking created successfully!');
        navigate(`/bookings/${result.booking._id}`);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create booking'));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-ink dark:text-ink">Select Service Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SERVICE_CATEGORIES.map((category) => (
                  <motion.button
                    key={category.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData(prev => ({ ...prev, serviceCategory: category.value }))}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      formData.serviceCategory === category.value
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <span className="text-sm font-medium text-ink dark:text-ink">{category.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {formData.serviceCategory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ServiceTypeSelector
                  serviceCategory={formData.serviceCategory}
                  value={formData.serviceType}
                  onChange={(type) => setFormData(prev => ({ ...prev, serviceType: type }))}
                />
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-ink dark:text-ink">Describe Your Problem</h3>
              <p className="text-sm text-ink-muted mb-4">
                Let our AI help you identify and describe the issue accurately
              </p>
            </div>

            {/* AI Chat Assistant */}
            <div className="bg-surface-200 rounded-xl p-4 border border-line">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-ink dark:text-ink">AI Problem Assistant</span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {botMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      'max-w-[80%] p-3 rounded-2xl text-sm',
                      msg.role === 'user'
                        ? 'bg-blue-500 text-on-lumen'
                        : 'bg-surface-300 text-ink text-ink border border-line-strong'
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.options && (
                        <div className="mt-3 space-y-2">
                          {msg.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleBotMessage(option)}
                              className="w-full text-left px-3 py-2 bg-surface-400 rounded-lg text-xs font-medium hover:bg-ink-faint transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isBotTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2"
                  >
                    <div className="bg-surface-300 px-4 py-3 rounded-2xl">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Type your problem or use AI suggestions above..."
                  className="flex-1 px-4 py-3 bg-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-ink"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => formData.description && handleBotMessage(formData.description)}
                  className="bg-blue-500 text-on-lumen px-4 rounded-xl font-medium"
                >
                  Send
                </motion.button>
              </div>
            </div>

            <Textarea
              label="Additional Details (Optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Any additional details that might help the technician..."
            />

            {/* Camera Capture for Problem Photo */}
            <div>
              <h4 className="text-sm font-medium text-ink dark:text-ink mb-3">
                Add Photo of the Problem (Optional)
              </h4>
              <CameraCapture
                onCapture={(imageUrl) => {
                  setProblemImage(imageUrl);
                  setFormData(prev => ({
                    ...prev,
                    images: [...(prev.images || []), imageUrl]
                  }));
                }}
                label="Take or Upload Photo"
                aspectRatio="auto"
              />
              {problemImage && (
                <p className="text-xs text-green-400 mt-2">
                  Photo added successfully!
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-ink dark:text-ink">Schedule Your Service</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Duration (hours)
                </label>
                <Input
                  type="number"
                  value={formData.estimatedDuration ? (formData.estimatedDuration / 60).toString() : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const hours = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, estimatedDuration: Math.round(hours * 60) }));
                  }}
                  min="0.5"
                  step="0.5"
                  placeholder="2"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Quantity / Units
              </label>
              <Input
                type="number"
                value={formData.quantity || 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                min={1}
                max={100}
                placeholder="1"
                className="w-full"
              />
              <p className="mt-1 text-xs text-ink-muted">
                For per-unit services (e.g., number of sockets, fans, fixtures)
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-ink dark:text-ink">Service Location</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.serviceLocation.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                    ...prev,
                    serviceLocation: { ...prev.serviceLocation, address: e.target.value }
                  }))}
                  placeholder="Street address, city, county"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Nearby Landmarks
                </label>
                <Input
                  type="text"
                  value={formData.serviceLocation.landmarks}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                    ...prev,
                    serviceLocation: { ...prev.serviceLocation, landmarks: e.target.value }
                  }))}
                  placeholder="e.g., Near City Mall, opposite Barclays Bank"
                  className="w-full"
                />
              </div>

              <Textarea
                label="Access Instructions"
                value={formData.serviceLocation.accessInstructions}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  serviceLocation: { ...prev.serviceLocation, accessInstructions: e.target.value }
                }))}
                rows={2}
                placeholder="Any special instructions for finding or accessing the location..."
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-ink dark:text-ink">Confirm Your Booking</h3>
            </div>

            <div className="bg-surface-200 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-line">
                <span className="text-sm text-ink-muted">Service Category</span>
                <span className="font-medium text-ink dark:text-ink">
                  {SERVICE_CATEGORIES.find(c => c.value === formData.serviceCategory)?.label || 'Not selected'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-line">
                <span className="text-sm text-ink-muted">Service Type</span>
                <span className="font-medium text-ink dark:text-ink">{formData.serviceType || 'Not specified'}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-line">
                <span className="text-sm text-ink-muted">Date & Time</span>
                <span className="font-medium text-ink dark:text-ink">
                  {formData.scheduledDate && formData.scheduledTime
                    ? `${formData.scheduledDate} at ${formData.scheduledTime}`
                    : 'Not specified'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-line">
                <span className="text-sm text-ink-muted">Location</span>
                <span className="font-medium text-ink dark:text-ink max-w-xs truncate">
                  {formData.serviceLocation.address || 'Not specified'}
                </span>
              </div>

              {technician && (
                <div className="flex justify-between items-center pt-3">
                  <span className="text-sm text-ink-muted">Technician</span>
                  <span className="font-medium text-ink dark:text-ink">
                    {technician.firstName} {technician.lastName}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800">
              <p className="text-sm text-blue-200">
                <strong>Note:</strong> A booking fee will be required to confirm your appointment. You'll be prompted to pay after confirming this booking.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const validateCurrentStep = (): { valid: boolean; error?: string } => {
    const stepIndex = currentStep - 1;
    if (stepIndex >= bookingStepSchemas.length) return { valid: true };

    const schema = bookingStepSchemas[stepIndex];
    const result = schema.safeParse(formData);
    if (result.success) return { valid: true };

    const firstError = result.error.errors[0]?.message;
    return { valid: false, error: firstError };
  };

  const isStepValid = () => {
    return validateCurrentStep().valid;
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-24 md:pb-8">
      {/* Progress Header */}
      <div className="bg-surface-200 border-b border-line sticky top-0 z-30">
        <div className="container mx-auto px-4 py-6">
          {/* Step Progress */}
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <motion.div
                  animate={{ scale: currentStep >= step.id ? 1 : 0.9 }}
                  className={cn(
                    'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center relative z-10 transition-all',
                    currentStep > step.id
                      ? 'bg-green-500 text-on-lumen'
                      : currentStep === step.id
                      ? ' bg-blue-500 text-on-lumen'
                      : 'bg-surface-300 text-ink-muted'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5 md:h-6 md:w-6" />
                  ) : (
                    <step.icon className="h-5 w-5 md:h-6 md:w-6" />
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-2 md:mx-4 rounded-full transition-all',
                      currentStep > step.id ? '' : 'bg-surface-300'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Title */}
          <motion.h1
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl md:text-2xl font-bold text-ink dark:text-ink"
          >
            {steps[currentStep - 1].title}
          </motion.h1>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-surface-200 rounded-2xl shadow-lg p-6 md:p-8">
              {renderStepContent()}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              currentStep === 1
                ? 'bg-surface-200 text-ink-muted cursor-not-allowed'
                : 'bg-surface-300 text-ink text-ink hover:bg-surface-400'
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </motion.button>

          {currentStep < steps.length ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={nextStep}
              disabled={!isStepValid()}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                isStepValid()
                  ? ' bg-blue-500 text-on-lumen hover:shadow-lg'
                  : 'bg-surface-300 text-ink-muted cursor-not-allowed'
              )}
            >
              Continue
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isCreating}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                isCreating
                  ? 'bg-surface-300 text-ink-muted cursor-wait'
                  : ' bg-green-500 text-on-lumen hover:shadow-lg'
              )}
            >
              {isCreating ? 'Creating...' : 'Complete Booking'}
              <Check className="h-5 w-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};
