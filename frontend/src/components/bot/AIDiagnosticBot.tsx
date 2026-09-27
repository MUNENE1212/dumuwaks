import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Maximize2, Bot, User, Calendar, Search, MessageCircle, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticFlow } from '../diagnostic/DiagnosticFlow';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  options?: string[];
  action?: 'booking' | 'navigate' | 'diagnose';
  actionData?: Record<string, string>;
}

interface BookingFlowData {
  active: boolean;
  step: number;
  data: {
    service: string;
    problem: string;
    date: string;
    time: string;
    location: string;
    description: string;
  };
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  action: () => void;
}

export const AIDiagnosticBot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: "Hi! 👋 I'm Dumu Bot, your AI assistant. I can help you:\n\n• 🔧 Diagnose problems\n• 📅 Book appointments\n• 🔍 Find technicians\n• 💬 Answer questions\n\nHow can I help you today?",
      timestamp: new Date(),
      options: ['🔧 Diagnose Problem', '📅 Book Appointment', '🔍 Find Technician', '❓ Ask Question']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingFlow, setBookingFlow] = useState<BookingFlowData>({
    active: false,
    step: 0,
    data: {
      service: '',
      problem: '',
      date: '',
      time: '',
      location: '',
      description: ''
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickActions: QuickAction[] = [
    {
      icon: '🔧',
      label: 'Diagnose',
      description: 'Diagnose a problem',
      action: () => {
        setDiagnosticMode(true);
        setIsOpen(true);
      }
    },
    {
      icon: '📅',
      label: 'Book Now',
      description: 'Schedule a technician',
      action: () => {
        setDiagnosticMode(false);
        setBookingFlow({ active: true, step: 1, data: { service: '', problem: '', date: '', time: '', location: '', description: '' } });
        const response: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: "Great! Let's book an appointment for you.\n\n**Step 1/5:** What type of service do you need?",
          timestamp: new Date(),
          options: ['🔧 Plumbing', '⚡ Electrical', '🪵 Carpentry', '🔌 Appliance Repair', '🏠 General Maintenance']
        };
        setMessages(prev => [...prev, response]);
        setIsOpen(true);
      }
    },
    {
      icon: '🔍',
      label: 'Find Technicians',
      description: 'Browse available pros',
      action: () => {
        setDiagnosticMode(false);
        navigate('/find-technicians');
        setIsOpen(false);
      }
    },
    {
      icon: '💬',
      label: 'Get Support',
      description: 'Talk to support',
      action: () => {
        setDiagnosticMode(false);
        navigate('/support');
        setIsOpen(false);
      }
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleBookingFlow = (userInput: string): Message => {
    const step = bookingFlow.step;
    const currentData = bookingFlow.data;

    switch (step) {
      case 1: // Service type selected
        setBookingFlow(prev => ({ ...prev, step: 2, data: { ...prev.data, service: userInput } }));
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `**Step 2/5:** Got it! You need **${userInput}**.\n\nPlease describe your problem in a few words.\n\nFor example:\n• "Kitchen faucet dripping"\n• "No power in living room"\n• "Door not closing properly"`,
          timestamp: new Date()
        };

      case 2: // Problem described
        setBookingFlow(prev => ({ ...prev, step: 3, data: { ...prev.data, problem: userInput } }));
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `**Step 3/5:** When would you like the technician to come?\n\nSelect a date or type "tomorrow", "this week", etc.`,
          timestamp: new Date(),
          options: ['Today', 'Tomorrow', 'This Week', 'Next Week']
        };

      case 3: // Date selected
        setBookingFlow(prev => ({ ...prev, step: 4, data: { ...prev.data, date: userInput } }));
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `**Step 4/5:** What time works best for you?\n\nWe have technicians available:\n• Morning (8AM - 12PM)\n• Afternoon (12PM - 4PM)\n• Evening (4PM - 8PM)`,
          timestamp: new Date(),
          options: ['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)', 'Anytime']
        };

      case 4: // Time selected
        setBookingFlow(prev => ({ ...prev, step: 5, data: { ...prev.data, time: userInput } }));
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `**Step 5/5:** Almost done! Please provide your location:\n\n• Enter your address\n• Or share your current location`,
          timestamp: new Date()
        };

      case 5: { // Location provided - Complete booking
        const bookingData = {
          service: currentData.service,
          problem: currentData.problem,
          date: currentData.date,
          time: currentData.time,
          location: userInput
        };

        setBookingFlow(prev => ({ ...prev, step: 6, data: { ...prev.data, location: userInput } }));

        // Navigate to booking confirmation after a delay
        setTimeout(() => {
          navigate('/booking/create', { state: { prefilledData: bookingData } });
        }, 2500);

        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `✅ **Perfect!** Here's your booking summary:\n\n**Service:** ${bookingData.service}\n**Issue:** ${bookingData.problem}\n**When:** ${bookingData.date} at ${bookingData.time}\n**Where:** ${userInput}\n\n🚀 I'm taking you to the confirmation page now...`,
          timestamp: new Date()
        };
      }

      default:
        // Reset booking flow
        setBookingFlow({ active: false, step: 0, data: { service: '', problem: '', date: '', time: '', location: '', description: '' } });
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: "Let's start over. What would you like to do?",
          timestamp: new Date(),
          options: ['📅 Book Appointment', '🔍 Find Technicians', '🔧 Diagnose Problem']
        };
    }
  };

  const generateBotResponse = (userInput: string, conversationHistory: Message[]): Message => {
    const input = userInput.toLowerCase();

    // Check for booking intent
    if (input.includes('book') || input.includes('appointment') || input.includes('schedule')) {
      setBookingFlow(prev => ({ ...prev, active: true, step: 1 }));
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: "Great! I'll help you book an appointment. Let me ask a few questions:\n\n**Step 1/5:** What type of service do you need?",
        timestamp: new Date(),
        options: ['🔧 Plumbing', '⚡ Electrical', '🪵 Carpentry', '🔌 Appliance Repair', '🏠 General Maintenance']
      };
    }

    // Check for find technician intent
    if (input.includes('find') || input.includes('technician') || input.includes('search')) {
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: "I'll help you find the right technician!\n\nYou can:\n• Browse all available technicians\n• Filter by service type\n• Check ratings and reviews\n\nWhat service are you looking for?",
        timestamp: new Date(),
        options: ['🔧 Plumbers', '⚡ Electricians', '🪵 Carpenters', '🔌 Appliance Repair'],
        action: 'navigate',
        actionData: { path: '/find-technicians' }
      };
    }

    // Check for pricing intent
    if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: "Here's our pricing guide:\n\n**Service Call:** KES 500-800\n**Plumbing:** KES 1,500-5,000\n**Electrical:** KES 2,000-6,000\n**Carpentry:** KES 1,500-4,000\n\nFinal price depends on:\n• Job complexity\n• Parts needed\n• Urgency\n\nWould you like a specific estimate?",
        timestamp: new Date(),
        options: ['Get Estimate', 'Book Appointment']
      };
    }

    // Problem detection - Plumbing
    if (input.includes('leak') || input.includes('dripping') || input.includes('water') || input.includes('faucet') || input.includes('pipe')) {
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: "I understand you have a water leak issue. Let me help diagnose:\n\n📍 **Where is the leak?**\n• Faucet\n• Pipe\n• Toilet\n• Water heater\n\nOr would you like me to connect you with a plumber directly?",
        timestamp: new Date(),
        options: ['Faucet', 'Pipe', 'Toilet', 'Water Heater', 'Book Plumber Now'],
        action: 'booking',
        actionData: { service: 'Plumbing', problem: 'Leak' }
      };
    }

    // Problem detection - Electrical
    if (input.includes('power') || input.includes('electricity') || input.includes('outlet') || input.includes('switch') || input.includes('breaker')) {
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: "I see you're having electrical issues. This is potentially dangerous. ⚠️\n\nQuick safety check:\n• Is there a burning smell? → **Turn off power immediately**\n• Are sparks visible? → **Emergency - call electrician**\n\nWhat type of electrical problem are you experiencing?",
        timestamp: new Date(),
        options: ['Outlet not working', 'Lights flickering', 'Circuit breaker trips', 'Burning smell', 'Book Electrician Now'],
        action: 'booking',
        actionData: { service: 'Electrical', problem: 'Power issue' }
      };
    }

    // Default helpful response
    return {
      id: Date.now().toString(),
      role: 'bot',
      content: "I'm here to help! Here's what I can do:\n\n1. 🔧 **Diagnose a problem** - Describe your issue\n2. 📅 **Book an appointment** - Schedule a technician\n3. 🔍 **Find technicians** - Browse available pros\n4. 💰 **Get estimates** - Check pricing\n\nWhat would you like to do?",
      timestamp: new Date(),
      options: ['Diagnose Problem', 'Book Appointment', 'Find Technicians', 'Check Pricing']
    };
  };

  const handleSendMessage = async (content?: string) => {
    const messageText = content || inputValue;
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Check if booking flow is active first
    if (bookingFlow.active && bookingFlow.step > 0) {
      setTimeout(() => {
        const botResponse = handleBookingFlow(messageText);
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 500);
      return;
    }

    // Call DumuBot API
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Only add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/v1/dumubot/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageText })
      });

      const data = await response.json();

      if (data.success) {
        const botResponse: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Fallback to local response if API fails
        const botResponse = generateBotResponse(messageText, messages);
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('DumuBot API error:', error);
      // Fallback to local response on error
      const botResponse = generateBotResponse(messageText, messages);
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionClick = (option: string, message: Message) => {
    // Check for action-based options
    if (message.action === 'navigate' && message.actionData?.path) {
      navigate(message.actionData.path);
      setIsOpen(false);
      return;
    }

    if (message.action === 'booking' && message.actionData) {
      setBookingFlow({
        active: true,
        step: 2,
        data: {
          service: message.actionData.service || '',
          problem: message.actionData.problem || '',
          date: '',
          time: '',
          location: '',
          description: ''
        }
      });

      const response: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: `Great choice! Let's book a ${message.actionData.service} for you.\n\n**Step 2/5:** Please describe your ${message.actionData.problem?.toLowerCase() || 'problem'} in detail.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
      return;
    }

    // Handle special booking quick actions
    if (option === 'Book Plumber Now') {
      setBookingFlow({
        active: true,
        step: 2,
        data: { service: 'Plumbing', problem: 'Leak', date: '', time: '', location: '', description: '' }
      });
      const response: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: "Great choice! Let's book a Plumber for you.\n\n**Step 2/5:** Please describe the leak in detail.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
      return;
    }

    if (option === 'Book Electrician Now') {
      setBookingFlow({
        active: true,
        step: 2,
        data: { service: 'Electrical', problem: 'Power issue', date: '', time: '', location: '', description: '' }
      });
      const response: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: "Great choice! Let's book an Electrician for you.\n\n**Step 2/5:** Please describe the electrical issue in detail.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
      return;
    }

    // Handle diagnostic option
    if (option === '🔧 Diagnose Problem') {
      setDiagnosticMode(true);
      return;
    }

    // Handle booking option
    if (option === '📅 Book Appointment') {
      setDiagnosticMode(false);
      setBookingFlow({ active: true, step: 1, data: { service: '', problem: '', date: '', time: '', location: '', description: '' } });
      const response: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: "Great! Let's book an appointment for you.\n\n**Step 1/5:** What type of service do you need?",
        timestamp: new Date(),
        options: ['🔧 Plumbing', '⚡ Electrical', '🪵 Carpentry', '🔌 Appliance Repair', '🏠 General Maintenance']
      };
      setMessages(prev => [...prev, response]);
      return;
    }

    // Handle navigation options
    if (option === '🔍 Find Technician' || option === 'Find Technicians') {
      navigate('/find-technicians');
      setIsOpen(false);
      return;
    }

    if (option === '❓ Ask Question' || option === 'Get Support') {
      navigate('/support');
      setIsOpen(false);
      return;
    }

    // Default: Send as message
    handleSendMessage(option);
  };

  return (
    <>
      {/* Quick Action Buttons (shown when chat is closed) */}
      {!isOpen && showQuickActions && (
        <div className="fixed bottom-36 md:bottom-32 right-4 md:right-8 flex flex-col gap-2 z-30">
          {quickActions.map((action, idx) => (
            <motion.button
              key={idx}
              initial={{ scale: 0, x: 20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.action}
              className="bg-surface-200 shadow-lg rounded-full p-4 text-2xl border border-line hover:shadow-xl transition-all"
              title={action.label}
            >
              {action.icon}
            </motion.button>
          ))}
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsOpen(true);
            setShowQuickActions(false);
          }}
          onHoverStart={() => setShowQuickActions(true)}
          onHoverEnd={() => setShowQuickActions(false)}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 inline-flex h-12 items-center gap-2 rounded-md border border-line-strong bg-surface-200 px-4 text-ink shadow-float hover:border-ink-muted"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-5 w-5 text-lumen-ink" />
          <span className="hidden text-body-sm font-semibold sm:inline">Assistant</span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40",
              "bg-surface-200 rounded-lg shadow-float border border-line-strong",
              isMinimized ? "w-80" : "w-[calc(100vw-2rem)] md:w-[450px] h-[600px]"
            )}
          >
            {/* Header */}
            <div className="bg-surface-300 text-ink p-4 rounded-t-lg border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-ink/20 p-2 rounded-full">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Dumu Bot</h3>
                  <p className="text-xs text-ink/80">AI Assistant • Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-ink/20 rounded-full transition-colors"
                  aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setDiagnosticMode(false);
                    setBookingFlow({ active: false, step: 0, data: { service: '', problem: '', date: '', time: '', location: '', description: '' } });
                  }}
                  className="p-2 hover:bg-ink/20 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Diagnostic Mode OR Messages Area */}
                {diagnosticMode ? (
                  <div className="h-[calc(600px-140px)] overflow-y-auto p-4">
                    <DiagnosticFlow
                      embedded={true}
                      onClose={() => setDiagnosticMode(false)}
                      onComplete={(result) => {
                        // Add a message summarizing the diagnosis
                        const summaryMsg: Message = {
                          id: Date.now().toString(),
                          role: 'bot',
                          content: `📊 Diagnosis Complete!\n\n${result.hasDIYSolution ? '✅ DIY Solution Available' : '👷 Professional Help Recommended'}\n\n${result.needsProfessional ? 'I can connect you with a prepared technician.' : 'You can fix this yourself!'}`,
                          timestamp: new Date()
                        };
                        setMessages(prev => [...prev, summaryMsg]);
                        setDiagnosticMode(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-[calc(600px-180px)] overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'bot' && (
                        <div className="bg-blue-900 p-2 rounded-full flex-shrink-0">
                          <Bot className="h-4 w-4 text-blue-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] p-3 rounded-2xl",
                          message.role === 'user'
                            ? "bg-lumen text-on-lumen"
                            : "bg-surface-300 text-ink text-ink"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.options && (
                          <div className="mt-3 space-y-2">
                            {message.options.map((option, idx) => (
                              <motion.button
                                key={idx}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleOptionClick(option, message)}
                                className="w-full text-left px-3 py-2 bg-surface-400 rounded-lg text-sm font-medium hover:shadow-md transition-all flex items-center justify-between group"
                              >
                                <span>{option}</span>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="bg-surface-400 p-2 rounded-full flex-shrink-0">
                          <User className="h-4 w-4 text-ink-muted" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="bg-blue-900 p-2 rounded-full">
                        <Bot className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="bg-surface-300 px-4 py-3 rounded-2xl">
                        <div className="flex gap-1">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-2 h-2 bg-ink-faint rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                            className="w-2 h-2 bg-ink-faint rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                            className="w-2 h-2 bg-ink-faint rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                )}
                {/* Input Area - hide during diagnostic or booking flow */}
                {!diagnosticMode && !bookingFlow.active && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-line bg-surface-200 rounded-b-2xl">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Describe your problem or ask a question..."
                      className="flex-1 px-4 py-3 bg-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lumen text-ink"
                      aria-label="Message input"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim()}
                      className="bg-lumen text-on-lumen p-3 rounded-md hover:bg-lumen-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Send message"
                    >
                      <Send className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
