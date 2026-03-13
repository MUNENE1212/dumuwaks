import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { Card, Input, Button } from '@/components/ui';
import axios from '@/lib/axios';
import { customServiceInputSchema } from '@/lib/validation';

interface ServiceType {
  serviceType: string;
  description: string;
  basePrice: number;
  priceUnit: string;
  estimatedDuration: number;
  isGeneral?: boolean;
  similarity?: number;
}

interface ServiceTypeSelectorProps {
  serviceCategory: string;
  value: string;
  onChange: (serviceType: string) => void;
  className?: string;
}

const ServiceTypeSelector: React.FC<ServiceTypeSelectorProps> = ({
  serviceCategory,
  value,
  onChange,
  className = ''
}) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<ServiceType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ServiceType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Fetch available service types when category changes
  useEffect(() => {
    if (serviceCategory) {
      fetchServiceTypes();
    }
  }, [serviceCategory]);

  // Filter service types based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = serviceTypes.filter(
        st =>
          st.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          st.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTypes(filtered);
    } else {
      setFilteredTypes(serviceTypes);
    }
  }, [searchTerm, serviceTypes]);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/pricing/service-types/${serviceCategory}`
      );

      if (response.data.success) {
        setServiceTypes(response.data.serviceTypes);
        setFilteredTypes(response.data.serviceTypes);
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCustomInput = async () => {
    if (!customInput.trim()) return;

    const parseResult = customServiceInputSchema.safeParse(customInput.trim());
    if (!parseResult.success) {
      setValidationMessage(parseResult.error.errors[0]?.message || 'Invalid input');
      setShowSuggestions(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/pricing/validate-service', {
        serviceCategory,
        serviceType: customInput.trim()
      });

      if (response.data.success) {
        if (response.data.valid) {
          // Exact match found
          handleSelectServiceType(response.data.match);
          setShowCustomInput(false);
          setCustomInput('');
        } else {
          // Show suggestions
          setSuggestions(response.data.suggestions || []);
          setValidationMessage(response.data.message);
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Error validating service type:', error);
      setValidationMessage('Error validating service type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectServiceType = (serviceType: ServiceType) => {
    setSelectedType(serviceType);
    onChange(serviceType.serviceType);
    setShowSuggestions(false);
    setShowCustomInput(false);
    setSearchTerm('');
  };

  const handleUseFallback = () => {
    const generalService = serviceTypes.find(st => st.serviceType === 'general');
    if (generalService) {
      handleSelectServiceType(generalService);
    }
  };

  const formatPrice = (price: number, unit: string) => {
    const priceFormatted = price.toLocaleString();
    const unitMap: { [key: string]: string } = {
      fixed: 'flat fee',
      per_hour: 'per hour',
      per_sqm: 'per m²',
      per_unit: 'per unit'
    };
    return `KES ${priceFormatted} (${unitMap[unit] || unit})`;
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Service Type
      </label>

      {/* Selected Service Display */}
      {selectedType && (
        <Card className="mb-4 bg-green-50 border-green-200">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900">
                    {selectedType.description || selectedType.serviceType}
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    {formatPrice(selectedType.basePrice, selectedType.priceUnit)}
                    {' • '}
                    ~{selectedType.estimatedDuration}hrs
                  </p>
                  {selectedType.isGeneral && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      General service - Final price determined by specific requirements
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedType(null);
                  onChange('');
                }}
              >
                Change
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Service Selection Interface */}
      {!selectedType && (
        <>
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search service types..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Service Types List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading services...</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredTypes.map((st) => (
                <div
                  key={st.serviceType}
                  onClick={() => handleSelectServiceType(st)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectServiceType(st);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {st.description || st.serviceType}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatPrice(st.basePrice, st.priceUnit)}
                        {' • '}
                        ~{st.estimatedDuration}hrs estimated
                      </p>
                      {st.isGeneral && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          Fallback option for unlisted services
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredTypes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No services found matching your search.
                </div>
              )}
            </div>
          )}

          {/* Custom Service Input */}
          <div className="mt-4">
            {!showCustomInput ? (
              <Button
                variant="outline"
                onClick={() => setShowCustomInput(true)}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Can't find your service? Enter custom description
              </Button>
            ) : (
              <Card>
                <div className="p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter Service Description
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g., 'underground pipe laying'"
                      value={customInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomInput(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && validateCustomInput()}
                      className="flex-1"
                    />
                    <Button onClick={validateCustomInput} disabled={loading}>
                      {loading ? 'Checking...' : 'Check'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomInput('');
                        setShowSuggestions(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Suggestions from Validation */}
          {showSuggestions && (
            <Card className="mt-4 border-orange-300">
              <div className="p-4">
                <div className="flex items-start gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900">
                      Service Not Found
                    </h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {validationMessage}
                    </p>
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                      Did you mean:
                    </h5>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectServiceType(suggestion)}
                          className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectServiceType(suggestion);
                            }
                          }}
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {suggestion.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatPrice(suggestion.basePrice, suggestion.priceUnit)}
                            {suggestion.similarity && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                {Math.round(suggestion.similarity * 100)}% match
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleUseFallback}
                    className="w-full"
                  >
                    Use General {serviceCategory.charAt(0).toUpperCase() + serviceCategory.slice(1)} Service
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    We'll provide a custom quote based on your specific needs
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ServiceTypeSelector;
