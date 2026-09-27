import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle, AlertTriangle, Wrench, Zap, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface Question {
  id: string;
  question: string;
  type: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  required: boolean;
}

interface DiagnosticStartData {
  problemId: string;
  problemName: string;
  serviceCategory: string;
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

interface DIYSolution {
  title: string;
  description: string;
  steps: string[];
  tools: string[];
  materials: string[];
  estimatedTime: string;
  difficulty: string;
  safetyWarnings: string[];
}

interface TechnicianPrep {
  likelyCauses: string[];
  toolsNeeded: string[];
  commonParts: string[];
  estimatedJobDuration: string;
  complexity: string;
}

interface DiagnosisResult {
  problemSummary: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  hasDIYSolution: boolean;
  diySolution?: DIYSolution;
  needsProfessional: boolean;
  technicianPrep?: TechnicianPrep;
  recommendations: string[];
}

interface Problem {
  id: string;
  name: string;
}

interface DiagnosticProps {
  problemId?: string;
  onComplete?: (result: DiagnosisResult) => void;
  onClose?: () => void;
  embedded?: boolean; // If true, doesn't show header/close button
}

export const DiagnosticFlow: React.FC<DiagnosticProps> = ({
  problemId: propProblemId,
  onComplete,
  onClose,
  embedded = false
}) => {
  const [step, setStep] = useState<'select' | 'diagnosing' | 'complete'>('select');
  const [problems, setProblems] = useState<Record<string, Problem[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProblem, setSelectedProblem] = useState<string>('');

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [problemName, setProblemName] = useState('');

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string>('');

  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Load available problems on mount
  useEffect(() => {
    if (propProblemId) {
      // Start directly with provided problem ID
      setSelectedProblem(propProblemId);
      startDiagnostic(propProblemId);
    } else {
      // Show problem selection
      loadProblems();
    }
  }, [propProblemId]);

  const loadProblems = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/v1/diagnostic/problems');
      if (response.data.success) {
        setProblems(response.data.data);
      }
    } catch (error) {
      console.error('Error loading problems:', error);
    }
  };

  const startDiagnostic = async (problemId: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5000/api/v1/diagnostic/${problemId}/start`);
      if (response.data.success) {
        const data: DiagnosticStartData = response.data.data;
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setTotalQuestions(data.totalQuestions);
        setProblemName(data.problemName);
        setAnswers({});
        setStep('diagnosing');
      }
    } catch (error) {
      console.error('Error starting diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedOption) return;

    const newAnswers = { ...answers, [currentQuestion!.id]: selectedOption };
    setAnswers(newAnswers);
    setSelectedOption('');
    setLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/v1/diagnostic/${selectedProblem}/answer`,
        { answers: newAnswers }
      );

      if (response.data.success) {
        const data = response.data.data;

        if (data.hasNextQuestion) {
          setCurrentQuestion(data.question);
          setQuestionNumber(data.questionNumber);
        } else {
          // Diagnostic complete
          setDiagnosis(data.diagnosis);
          setStep('complete');
          onComplete?.(data.diagnosis);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return AlertTriangle;
      case 'urgent': return Zap;
      default: return CheckCircle;
    }
  };

  // Problem Selection View
  if (step === 'select') {
    return (
      <div className="space-y-6">
        {!embedded && (
          <div className="text-center">
            <h3 className="text-xl font-bold text-ink dark:text-ink mb-2">
              🔧 What problem are you experiencing?
            </h3>
            <p className="text-ink-muted">
              I'll help you diagnose the issue and find the best solution
            </p>
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(problems).map(([category, probs]) => (
            <div key={category} className="space-y-2">
              <h4 className="font-semibold text-ink-muted flex items-center gap-2">
                {getCategoryIcon(category)}
                {category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {probs.map((problem) => (
                  <motion.button
                    key={problem.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedProblem(problem.id);
                      startDiagnostic(problem.id);
                    }}
                    className="text-left px-4 py-3 bg-surface-200 rounded-lg border border-line hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <span>{problem.name}</span>
                    <ChevronRight className="h-5 w-5 text-ink-muted group-hover:text-blue-500" />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-ink-muted hover:text-ink hover:text-ink transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Diagnostic Questions View
  if (step === 'diagnosing' && currentQuestion) {
    return (
      <div className="space-y-6">
        {!embedded && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-ink dark:text-ink">
                {problemName}
              </h3>
              <span className="text-sm text-ink-muted">
                {questionNumber} of {totalQuestions}
              </span>
            </div>
            <div className="w-full bg-surface-300 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                className="bg-blue-500 h-2 rounded-full"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-lg font-medium text-ink dark:text-ink">
            {currentQuestion.question}
          </p>

          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedOption(option.value)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                  selectedOption === option.value
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-line bg-surface-200 hover:border-blue-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex-1">{option.label}</span>
                  {selectedOption === option.value && (
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={submitAnswer}
            disabled={!selectedOption || loading}
            className={cn(
              "w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
              selectedOption
                ? " bg-blue-500 text-on-lumen hover:shadow-lg"
                : "bg-surface-300 text-ink-muted cursor-not-allowed"
            )}
          >
            {loading ? (
              <>Analyzing...</>
            ) : (
              <>
                {questionNumber < totalQuestions ? 'Next Question' : 'Get Diagnosis'}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  // Diagnosis Complete View
  if (step === 'complete' && diagnosis) {
    const UrgencyIcon = getUrgencyIcon(diagnosis.urgency);

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-lg border-2 flex items-start gap-3",
            getUrgencyColor(diagnosis.urgency)
          )}
        >
          <UrgencyIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">
              {diagnosis.urgency === 'emergency' && '🚨 EMERGENCY! '}
              {diagnosis.urgency === 'urgent' && '⚡ Urgent Attention Needed'}
              {diagnosis.urgency === 'routine' && '✅ Diagnosis Complete'}
            </h3>
            <p className="text-sm opacity-90 mt-1">
              {diagnosis.problemSummary}
            </p>
          </div>
        </motion.div>

        {/* DIY Solution */}
        {diagnosis.hasDIYSolution && diagnosis.diySolution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-900/20 border-2 border-green-800 rounded-lg p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-green-500 text-on-lumen p-2 rounded-full">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-green-100">
                  💡 You Can Fix This Yourself!
                </h4>
                <p className="text-green-300 mt-1">
                  {diagnosis.diySolution.description}
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-medium">⏱️</span>
                  <span>{diagnosis.diySolution.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">📊</span>
                  <span className="capitalize">{diagnosis.diySolution.difficulty}</span>
                </div>
              </div>

              {diagnosis.diySolution.safetyWarnings && diagnosis.diySolution.safetyWarnings.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                  <p className="font-semibold text-yellow-100 text-sm mb-2">
                    ⚠️ Safety Warnings:
                  </p>
                  <ul className="text-sm text-yellow-200 space-y-1">
                    {diagnosis.diySolution.safetyWarnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="font-semibold text-ink dark:text-ink mb-2">Tools Needed:</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.diySolution.tools.map((tool, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-surface-200 rounded-full text-sm border border-line"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-ink dark:text-ink mb-2">Steps:</p>
                <ol className="space-y-2">
                  {diagnosis.diySolution.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-on-lumen rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-ink-muted text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}

        {/* Technician Recommendation */}
        {diagnosis.needsProfessional && diagnosis.technicianPrep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-900/20 border-2 border-blue-800 rounded-lg p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-500 text-on-lumen p-2 rounded-full">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-blue-100">
                  👷 Professional Help Recommended
                </h4>
                <p className="text-blue-300 mt-1">
                  This issue requires a professional technician for best results
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <p className="font-semibold text-ink dark:text-ink mb-2">Likely Causes:</p>
                <ul className="space-y-1">
                  {diagnosis.technicianPrep.likelyCauses.map((cause, i) => (
                    <li key={i} className="text-ink-muted text-sm flex items-center gap-2">
                      <span className="text-blue-500">•</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold text-ink dark:text-ink mb-2">Technician Will Bring:</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.technicianPrep.toolsNeeded.map((tool, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-surface-200 rounded-full text-sm border border-line"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-surface-200 rounded-lg p-3 border border-line">
                  <p className="text-ink-muted text-xs mb-1">Est. Duration</p>
                  <p className="font-semibold text-ink dark:text-ink">
                    {diagnosis.technicianPrep.estimatedJobDuration}
                  </p>
                </div>
                <div className="bg-surface-200 rounded-lg p-3 border border-line">
                  <p className="text-ink-muted text-xs mb-1">Complexity</p>
                  <p className="font-semibold text-ink dark:text-ink capitalize">
                    {diagnosis.technicianPrep.complexity}
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Navigate to booking with diagnosis info
                window.location.href = `/booking/create?service=${diagnosis.problemSummary}`;
              }}
              className="w-full mt-4 py-3 bg-blue-500 text-on-lumen rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
              Book Prepared Technician
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        )}

        {/* Still want professional? */}
        {diagnosis.hasDIYSolution && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.location.href = `/booking/create?service=${diagnosis.problemSummary}`;
            }}
            className="w-full py-3 bg-surface-200 text-ink-muted rounded-lg font-semibold hover:bg-surface-300 transition-all"
          >
            Still prefer a professional? Book a Technician →
          </motion.button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 text-ink-muted hover:text-ink hover:text-ink transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return null;
};

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Plumbing': '🔧',
    'Electrical': '⚡',
    'Carpentry': '🪵',
    'Appliance Repair': '🔌',
    'Painting': '🎨',
    'Cleaning': '🧹'
  };
  return icons[category] || '🔧';
}
