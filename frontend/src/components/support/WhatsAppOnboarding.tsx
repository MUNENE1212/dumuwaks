import React, { useState } from 'react';
import { X, User, Search, Calendar, MessageCircle, Check, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { format } from 'date-fns';

interface WhatsAppOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
}

interface Technician {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  rating: {
    average: number;
    count: number;
  };
  skills: Array<{
    name: string;
    level: string;
  }>;
  availability?: {
    isAvailable: boolean;
  };
}

interface BookingData {
  customerId: string;
  technicianId: string;
  serviceType: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  urgency: string;
  estimatedDuration: number;
}

const WhatsAppOnboarding: React.FC<WhatsAppOnboardingProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: {}
  });
  const [createdCustomer, setCreatedCustomer] = useState<any>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');

  // Technician search and selection
  const [searchQuery, setSearchQuery] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  // Booking data
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    serviceType: '',
    description: '',
    scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    scheduledTime: '',
    urgency: 'normal',
    estimatedDuration: 120
  });

  const [createdBooking, setCreatedBooking] = useState<any>(null);

  const handleCreateCustomer = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/support/create-customer', {
        ...customerData,
        source: 'whatsapp'
      });

      setCreatedCustomer(response.data.customer);
      setTemporaryPassword(response.data.temporaryPassword || '');
      toast.success('Customer account created successfully!');
      setStep(2);
    } catch (error: unknown) {
      console.error('Error creating customer:', error);
      const errObj = error && typeof error === 'object' ? error as Record<string, unknown> : null;
      const response = (errObj?.response as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      if (response?.existingUser) {
        // User already exists, use existing user
        setCreatedCustomer(response.existingUser);
        toast('Customer already exists. Using existing account.');
        setStep(2);
      } else {
        toast.error(getErrorMessage(error, 'Failed to create customer account'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTechnicians = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/support/search-technicians', {
        params: {
          search: searchQuery,
          availability: 'true',
          limit: 10
        }
      });
      setTechnicians(response.data.technicians || []);
      if (response.data.technicians.length === 0) {
        toast('No technicians found matching your search');
      }
    } catch (error: unknown) {
      console.error('Error searching technicians:', error);
      toast.error(getErrorMessage(error, 'Failed to search technicians'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!createdCustomer || !selectedTechnician) {
      toast.error('Please select a technician');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post('/support/create-booking', {
        customerId: createdCustomer.id,
        technicianId: selectedTechnician._id,
        ...bookingData
      });

      setCreatedBooking(response.data.booking);
      toast.success('Booking created successfully!');
      setStep(4);
    } catch (error: unknown) {
      console.error('Error creating booking:', error);
      toast.error(getErrorMessage(error, 'Failed to create booking'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep(1);
    setCustomerData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: {}
    });
    setCreatedCustomer(null);
    setTemporaryPassword('');
    setSearchQuery('');
    setTechnicians([]);
    setSelectedTechnician(null);
    setBookingData({
      serviceType: '',
      description: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: '',
      urgency: 'normal',
      estimatedDuration: 120
    });
    setCreatedBooking(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                WhatsApp Customer Onboarding
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {step} of 4: {step === 1 ? 'Customer Info' : step === 2 ? 'Find Technician' : step === 3 ? 'Booking Details' : 'Complete'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  s <= step ? 'bg-cyan-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Customer Information */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full mb-3">
                  <User className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Customer Account</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enter customer information from WhatsApp conversation
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={customerData.firstName}
                    onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={customerData.lastName}
                    onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={customerData.phoneNumber}
                      onChange={(e) => setCustomerData({ ...customerData, phoneNumber: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="+254 7XX XXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={customerData.address.street || ''}
                  onChange={(e) => setCustomerData({
                    ...customerData,
                    address: { ...customerData.address, street: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={customerData.address.city || ''}
                  onChange={(e) => setCustomerData({
                    ...customerData,
                    address: { ...customerData.address, city: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={customerData.address.state || ''}
                  onChange={(e) => setCustomerData({
                    ...customerData,
                    address: { ...customerData.address, state: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="State"
                />
                <input
                  type="text"
                  value={customerData.address.postalCode || ''}
                  onChange={(e) => setCustomerData({
                    ...customerData,
                    address: { ...customerData.address, postalCode: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Postal Code"
                />
              </div>

              <button
                onClick={handleCreateCustomer}
                disabled={!customerData.firstName || !customerData.lastName || !customerData.phoneNumber || isLoading}
                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Creating Account...' : 'Create Account & Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Find Technician */}
          {step === 2 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full mb-3">
                  <Search className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Find Technician</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Search for available technicians to match with the customer
                </p>
              </div>

              {/* Customer Created Confirmation */}
              {createdCustomer && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Customer account created: {createdCustomer.firstName} {createdCustomer.lastName}
                    </p>
                    {temporaryPassword && (
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Temporary password: <span className="font-mono font-bold">{temporaryPassword}</span>
                        <br />
                        <span className="text-green-600 dark:text-green-400">Please share this with the customer via WhatsApp</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchTechnicians()}
                  placeholder="Search by name or skills..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleSearchTechnicians}
                  disabled={isLoading}
                  className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              {/* Technicians List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {technicians.map((tech) => (
                  <div
                    key={tech._id}
                    onClick={() => setSelectedTechnician(tech)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTechnician?._id === tech._id
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {tech.firstName.charAt(0)}{tech.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {tech.firstName} {tech.lastName}
                          </h4>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-yellow-500">★</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {tech.rating.average.toFixed(1)} ({tech.rating.count})
                            </span>
                          </div>
                          {tech.availability?.isAvailable && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                              Available
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tech.phoneNumber}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tech.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedTechnician?._id === tech._id && (
                        <Check className="h-6 w-6 text-cyan-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!selectedTechnician}
                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Continue to Booking Details
              </button>
            </div>
          )}

          {/* Step 3: Booking Details */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full mb-3">
                  <Calendar className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Configure the booking information
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Type
                  </label>
                  <select
                    value={bookingData.serviceType}
                    onChange={(e) => setBookingData({ ...bookingData, serviceType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select service type</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="painting">Painting</option>
                    <option value="hvac">HVAC</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={bookingData.description}
                    onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Describe the service needed..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.scheduledDate}
                      onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={bookingData.scheduledTime}
                      onChange={(e) => setBookingData({ ...bookingData, scheduledTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Urgency
                    </label>
                    <select
                      value={bookingData.urgency}
                      onChange={(e) => setBookingData({ ...bookingData, urgency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={bookingData.estimatedDuration}
                      onChange={(e) => setBookingData({ ...bookingData, estimatedDuration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateBooking}
                disabled={!bookingData.description || isLoading}
                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Creating Booking...' : 'Create Booking'}
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Onboarding Complete!
              </h3>

              <p className="text-gray-600 dark:text-gray-400">
                Customer account and booking have been created successfully
              </p>

              {createdBooking && (
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-left space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Booking Summary:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {createdBooking.customer?.firstName} {createdBooking.customer?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Technician:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {createdBooking.technician?.firstName} {createdBooking.technician?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Service:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{bookingData.serviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded">
                        {createdBooking.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {temporaryPassword && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="inline h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <span className="text-sm text-yellow-900 dark:text-yellow-100">
                    Don't forget to send the temporary password to the customer via WhatsApp!
                  </span>
                </div>
              )}

              <button
                onClick={handleComplete}
                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOnboarding;
