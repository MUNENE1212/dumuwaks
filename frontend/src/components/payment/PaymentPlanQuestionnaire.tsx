import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Tag,
  Flag,
  FileText,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Briefcase,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import type { PlanType, PaymentPlanFormData, ServiceInfo } from '@/types/paymentPlan';
import { PLAN_TYPE_LABELS, PAYMENT_PLAN_CONSTRAINTS } from '@/types/paymentPlan';
import { createPlan, fetchPlanTypes } from '@/store/slices/paymentPlanSlice';
import {
  selectPlanTypes,
  selectPaymentPlansActionLoading,
  selectPaymentPlansError
} from '@/store/slices/paymentPlanSlice';
import Button from '@/components/ui/Button';

interface PaymentPlanQuestionnaireProps {
  services: ServiceInfo[];
  onComplete?: () => void;
  skipable?: boolean;
}

interface QuestionnaireStep {
  id: string;
  title: string;
  description: string;
}

const STEPS: QuestionnaireStep[] = [
  {
    id: 'service',
    title: 'Select Service',
    description: 'Choose which service you want to set up pricing for'
  },
  {
    id: 'pricing',
    title: 'Pricing Model',
    description: 'Choose how you want to charge for this service'
  },
  {
    id: 'details',
    title: 'Pricing Details',
    description: 'Set your rates and payment terms'
  },
  {
    id: 'policy',
    title: 'Policies',
    description: 'Set deposit requirements and cancellation terms'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review your payment plan before saving'
  }
];

const PLAN_TYPE_RECOMMENDATIONS: Record<string, { title: string; description: string; bestFor: string[] }> = {
  hourly: {
    title: 'Hourly Rate',
    description: 'Charge clients based on time spent. Great for ongoing or variable work.',
    bestFor: ['Consultations', 'Repairs', 'Maintenance', 'Troubleshooting']
  },
  fixed: {
    title: 'Fixed Price',
    description: 'Set a single price for the entire job. Best for well-defined tasks.',
    bestFor: ['Installations', 'Replacements', 'Standard repairs', 'Inspections']
  },
  milestone: {
    title: 'Milestone-based',
    description: 'Break payment into phases. Ideal for large projects.',
    bestFor: ['Renovations', 'New installations', 'Major repairs', 'Multi-day projects']
  },
  per_project: {
    title: 'Per Project',
    description: 'Provide custom quotes for each project. Flexible for complex work.',
    bestFor: ['Custom work', 'Large projects', 'Variable scope', 'Commercial jobs']
  },
  negotiable: {
    title: 'Negotiable',
    description: 'Allow clients to negotiate. Good for flexible pricing.',
    bestFor: ['Unique projects', 'Varied complexity', 'First-time clients', 'Trial work']
  }
};

const PaymentPlanQuestionnaire: React.FC<PaymentPlanQuestionnaireProps> = ({
  services,
  onComplete,
  skipable = true
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const actionLoading = useSelector(selectPaymentPlansActionLoading);
  const error = useSelector(selectPaymentPlansError);

  const [currentStep, setCurrentStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('hourly');
  const [hourlyRate, setHourlyRate] = useState({ amount: 0, currency: 'KES', minimumHours: 1 });
  const [fixedPrice, setFixedPrice] = useState({ amount: 0, currency: 'KES', includesMaterials: false });
  const [milestones, setMilestones] = useState([{ name: '', percentage: 100 }]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [perProject, setPerProject] = useState({ requiresQuote: true, estimatedRange: { min: 0, max: 0 } });
  const [deposit, setDeposit] = useState({ required: false, percentage: 0, minimumAmount: 0 });
  const [cancellationPolicy, setCancellationPolicy] = useState({ freeCancellationHours: 24, cancellationFeePercent: 0 });
  const [terms, setTerms] = useState('');

  // Fetch plan types on mount
  useEffect(() => {
    dispatch(fetchPlanTypes() as never);
  }, [dispatch]);

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'service':
        return !!selectedService;
      case 'pricing':
        return !!selectedPlanType;
      case 'details':
        return validateDetails();
      case 'policy':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const validateDetails = () => {
    switch (selectedPlanType) {
      case 'hourly':
        return hourlyRate.amount >= PAYMENT_PLAN_CONSTRAINTS.MIN_HOURLY_RATE;
      case 'fixed':
        return fixedPrice.amount >= PAYMENT_PLAN_CONSTRAINTS.MIN_FIXED_PRICE;
      case 'milestone': {
        const totalPercent = milestones.reduce((sum, m) => sum + m.percentage, 0);
        return milestones.length > 0 && Math.abs(totalPercent - 100) < 0.01;
      }
      case 'per_project':
        return perProject.requiresQuote || (perProject.estimatedRange.min > 0 && perProject.estimatedRange.max > 0);
      case 'negotiable':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete?.();
    navigate('/dashboard');
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    try {
      const planData: PaymentPlanFormData = {
        service: selectedService,
        planType: selectedPlanType,
        isActive: true,
        deposit,
        cancellationPolicy,
        terms
      };

      switch (selectedPlanType) {
        case 'hourly':
          planData.hourlyRate = hourlyRate;
          break;
        case 'fixed':
          planData.fixedPrice = fixedPrice;
          break;
        case 'milestone':
          planData.milestones = milestones.map(m => ({
            ...m,
            amount: (totalAmount * m.percentage) / 100,
            isCompleted: false
          }));
          break;
        case 'per_project':
          planData.perProject = perProject;
          break;
      }

      await dispatch(createPlan(planData) as never);
      onComplete?.();
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create payment plan');
    }
  };

  const addMilestone = () => {
    if (milestones.length < PAYMENT_PLAN_CONSTRAINTS.MAX_MILESTONES) {
      setMilestones([...milestones, { name: '', percentage: 0 }]);
    }
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'service':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--dw-text-primary)]">
              Which service do you want to set up pricing for?
            </h3>
            <div className="grid gap-3">
              {services.map((service) => (
                <button
                  key={service._id}
                  onClick={() => setSelectedService(service._id)}
                  className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                    selectedService === service._id
                      ? 'border-[var(--dw-accent-primary)] bg-[var(--dw-color-info-bg)]'
                      : 'border-[var(--dw-border-default)] bg-[var(--dw-bg-secondary)] hover:border-[var(--dw-accent-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-[var(--dw-accent-primary)]" />
                    <div>
                      <p className="font-medium text-[var(--dw-text-primary)]">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-[var(--dw-text-secondary)]">{service.description}</p>
                      )}
                    </div>
                    {selectedService === service._id && (
                      <CheckCircle className="w-5 h-5 text-[var(--dw-accent-primary)] ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--dw-text-primary)]">
              How do you want to charge for this service?
            </h3>
            <div className="grid gap-3">
              {Object.entries(PLAN_TYPE_RECOMMENDATIONS).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setSelectedPlanType(type as PlanType)}
                  className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                    selectedPlanType === type
                      ? 'border-[var(--dw-accent-primary)] bg-[var(--dw-color-info-bg)]'
                      : 'border-[var(--dw-border-default)] bg-[var(--dw-bg-secondary)] hover:border-[var(--dw-accent-primary)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedPlanType === type
                        ? 'bg-[var(--dw-accent-primary)] text-ink'
                        : 'bg-[var(--dw-bg-tertiary)] text-[var(--dw-text-secondary)]'
                    }`}>
                      {type === 'hourly' && <Clock className="w-5 h-5" />}
                      {type === 'fixed' && <Tag className="w-5 h-5" />}
                      {type === 'milestone' && <Flag className="w-5 h-5" />}
                      {type === 'per_project' && <FileText className="w-5 h-5" />}
                      {type === 'negotiable' && <MessageCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--dw-text-primary)]">{info.title}</p>
                      <p className="text-sm text-[var(--dw-text-secondary)] mt-1">{info.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {info.bestFor.map((item, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-[var(--dw-bg-tertiary)] rounded text-[var(--dw-text-tertiary)]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedPlanType === type && (
                      <CheckCircle className="w-5 h-5 text-[var(--dw-accent-primary)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--dw-text-primary)]">
              Set your {PLAN_TYPE_LABELS[selectedPlanType].toLowerCase()} details
            </h3>

            {selectedPlanType === 'hourly' && (
              <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Your hourly rate (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dw-text-tertiary)]" />
                    <input
                      type="number"
                      value={hourlyRate.amount || ''}
                      onChange={(e) => setHourlyRate({ ...hourlyRate, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      placeholder="e.g., 1500"
                    />
                  </div>
                  {hourlyRate.amount < PAYMENT_PLAN_CONSTRAINTS.MIN_HOURLY_RATE && (
                    <p className="text-xs text-[var(--dw-color-warning)] mt-1">
                      Minimum rate is KES {PAYMENT_PLAN_CONSTRAINTS.MIN_HOURLY_RATE}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Minimum hours required
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={hourlyRate.minimumHours}
                    onChange={(e) => setHourlyRate({ ...hourlyRate, minimumHours: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                  />
                </div>
              </div>
            )}

            {selectedPlanType === 'fixed' && (
              <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Fixed price (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dw-text-tertiary)]" />
                    <input
                      type="number"
                      value={fixedPrice.amount || ''}
                      onChange={(e) => setFixedPrice({ ...fixedPrice, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      placeholder="e.g., 5000"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fixedPrice.includesMaterials}
                    onChange={(e) => setFixedPrice({ ...fixedPrice, includesMaterials: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--dw-border-default)] bg-[var(--dw-bg-tertiary)] text-[var(--dw-accent-primary)]"
                  />
                  <span className="text-sm text-[var(--dw-text-secondary)]">Price includes materials</span>
                </label>
              </div>
            )}

            {selectedPlanType === 'milestone' && (
              <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Total project amount (KES)
                  </label>
                  <input
                    type="number"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[var(--dw-text-secondary)]">Milestones</label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-xs text-[var(--dw-accent-primary)] hover:underline"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)] text-sm"
                        placeholder="Milestone name"
                      />
                      <input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(index, 'percentage', parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)] text-sm"
                        placeholder="%"
                      />
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="p-2 text-[var(--dw-color-error)] hover:bg-[var(--dw-color-error-bg)] rounded-md"
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                  ))}
                  <p className={`text-xs ${
                    Math.abs(milestones.reduce((sum, m) => sum + m.percentage, 0) - 100) < 0.01
                      ? 'text-[var(--dw-color-success)]'
                      : 'text-[var(--dw-color-warning)]'
                  }`}>
                    Total: {milestones.reduce((sum, m) => sum + m.percentage, 0).toFixed(1)}% (must equal 100%)
                  </p>
                </div>
              </div>
            )}

            {selectedPlanType === 'per_project' && (
              <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={perProject.requiresQuote}
                    onChange={(e) => setPerProject({ ...perProject, requiresQuote: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--dw-border-default)] bg-[var(--dw-bg-tertiary)] text-[var(--dw-accent-primary)]"
                  />
                  <span className="text-sm text-[var(--dw-text-secondary)]">Requires custom quote for each project</span>
                </label>
                {!perProject.requiresQuote && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">Est. Min (KES)</label>
                      <input
                        type="number"
                        value={perProject.estimatedRange.min || ''}
                        onChange={(e) => setPerProject({
                          ...perProject,
                          estimatedRange: { ...perProject.estimatedRange, min: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">Est. Max (KES)</label>
                      <input
                        type="number"
                        value={perProject.estimatedRange.max || ''}
                        onChange={(e) => setPerProject({
                          ...perProject,
                          estimatedRange: { ...perProject.estimatedRange, max: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedPlanType === 'negotiable' && (
              <div className="p-4 bg-[var(--dw-color-info-bg)] rounded-lg border border-[var(--dw-color-info)]">
                <p className="text-sm text-[var(--dw-text-secondary)]">
                  With negotiable pricing, clients will contact you to discuss the project details and agree on a price.
                  This gives you flexibility to adjust based on the specific requirements.
                </p>
              </div>
            )}
          </div>
        );

      case 'policy':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-[var(--dw-text-primary)]">
              Set your payment policies
            </h3>

            <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--dw-text-primary)]">Require Deposit</h4>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deposit.required}
                    onChange={(e) => setDeposit({ ...deposit, required: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--dw-border-default)] bg-[var(--dw-bg-tertiary)] text-[var(--dw-accent-primary)]"
                  />
                  <span className="text-sm text-[var(--dw-text-secondary)]">Yes, require deposit</span>
                </label>
              </div>

              {deposit.required && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">Deposit %</label>
                    <input
                      type="number"
                      value={deposit.percentage || ''}
                      onChange={(e) => setDeposit({ ...deposit, percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">Min Amount (KES)</label>
                    <input
                      type="number"
                      value={deposit.minimumAmount || ''}
                      onChange={(e) => setDeposit({ ...deposit, minimumAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
              <h4 className="text-sm font-medium text-[var(--dw-text-primary)]">Cancellation Policy</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Free cancellation (hours before)
                  </label>
                  <input
                    type="number"
                    value={cancellationPolicy.freeCancellationHours}
                    onChange={(e) => setCancellationPolicy({
                      ...cancellationPolicy,
                      freeCancellationHours: parseInt(e.target.value) || 24
                    })}
                    className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                    Late cancellation fee %
                  </label>
                  <input
                    type="number"
                    value={cancellationPolicy.cancellationFeePercent}
                    onChange={(e) => setCancellationPolicy({
                      ...cancellationPolicy,
                      cancellationFeePercent: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
              <label className="block text-sm text-[var(--dw-text-secondary)] mb-1">
                Additional Terms (optional)
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                maxLength={PAYMENT_PLAN_CONSTRAINTS.MAX_TERMS_LENGTH}
                className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)] resize-none"
                placeholder="Any specific terms or conditions for your services..."
              />
            </div>
          </div>
        );

      case 'review': {
        const selectedServiceData = services.find(s => s._id === selectedService);
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-[var(--dw-text-primary)]">
              Review your payment plan
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <h4 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">Service</h4>
                <p className="text-[var(--dw-text-primary)]">{selectedServiceData?.name}</p>
              </div>

              <div className="p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <h4 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">Pricing Model</h4>
                <p className="text-[var(--dw-text-primary)]">{PLAN_TYPE_LABELS[selectedPlanType]}</p>
              </div>

              <div className="p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                <h4 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">Pricing Details</h4>
                {selectedPlanType === 'hourly' && (
                  <p className="text-[var(--dw-text-primary)]">KES {hourlyRate.amount.toLocaleString()}/hr (min. {hourlyRate.minimumHours} hrs)</p>
                )}
                {selectedPlanType === 'fixed' && (
                  <div>
                    <p className="text-[var(--dw-text-primary)]">KES {fixedPrice.amount.toLocaleString()}</p>
                    {fixedPrice.includesMaterials && (
                      <p className="text-xs text-[var(--dw-color-success)]">Materials included</p>
                    )}
                  </div>
                )}
                {selectedPlanType === 'milestone' && (
                  <div className="space-y-1">
                    {milestones.map((m, i) => (
                      <p key={i} className="text-sm text-[var(--dw-text-primary)]">
                        {m.name}: KES {((totalAmount * m.percentage) / 100).toLocaleString()} ({m.percentage}%)
                      </p>
                    ))}
                    <p className="text-sm font-medium text-[var(--dw-text-primary)] mt-2">
                      Total: KES {totalAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedPlanType === 'per_project' && (
                  perProject.requiresQuote ? (
                    <p className="text-[var(--dw-text-primary)]">Requires custom quote</p>
                  ) : (
                    <p className="text-[var(--dw-text-primary)]">
                      KES {perProject.estimatedRange.min.toLocaleString()} - KES {perProject.estimatedRange.max.toLocaleString()}
                    </p>
                  )
                )}
                {selectedPlanType === 'negotiable' && (
                  <p className="text-[var(--dw-text-primary)]">Price negotiable with client</p>
                )}
              </div>

              {deposit.required && (
                <div className="p-4 bg-[var(--dw-bg-secondary)] rounded-lg border border-[var(--dw-border-subtle)]">
                  <h4 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">Deposit</h4>
                  <p className="text-[var(--dw-text-primary)]">
                    {deposit.percentage}% required
                    {deposit.minimumAmount > 0 && ` (min. KES ${deposit.minimumAmount.toLocaleString()})`}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-1 mx-0.5 rounded-full transition-colors duration-200 ${
                index <= currentStep
                  ? 'bg-[var(--dw-accent-primary)]'
                  : 'bg-[var(--dw-border-subtle)]'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`${
                index === currentStep
                  ? 'text-[var(--dw-accent-primary)] font-medium'
                  : index < currentStep
                    ? 'text-[var(--dw-color-success)]'
                    : 'text-[var(--dw-text-tertiary)]'
              }`}
            >
              {index < currentStep ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[var(--dw-bg-primary)] rounded-xl p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Error Display */}
      {(submitError || error) && (
        <div className="mb-4 p-3 bg-[var(--dw-color-error-bg)] border border-[var(--dw-color-error)] rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--dw-color-error)]" />
          <span className="text-sm text-[var(--dw-color-error)]">{submitError || error}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 ? (
            <Button variant="secondary" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : skipable ? (
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          ) : null}
        </div>
        <div>
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={actionLoading} disabled={!canProceed()}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPlanQuestionnaire;
