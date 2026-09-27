import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Wallet, DollarSign, Shield, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface BookingFeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  bookingId: string;
  onPaymentSuccess: (transactionId: string) => void;
}

type PaymentMethod = 'mpesa' | 'card' | 'wallet';

const BookingFeePaymentModal: React.FC<BookingFeePaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'KES',
  bookingId,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');

  if (!isOpen) return null;

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Validate input based on payment method
      if (paymentMethod === 'mpesa' && !mpesaPhone) {
        toast.error('Please enter your M-Pesa phone number');
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === 'card') {
        if (!cardNumber || !cardExpiry || !cardCVC) {
          toast.error('Please fill in all card details');
          setIsProcessing(false);
          return;
        }
      }

      let transactionId: string;

      if (paymentMethod === 'mpesa') {
        // M-Pesa STK Push
        transactionId = await handleMpesaPayment();
      } else if (paymentMethod === 'card') {
        // Card payment (Stripe/Flutterwave)
        transactionId = await handleCardPayment();
      } else {
        // Wallet payment
        transactionId = await handleWalletPayment();
      }

      toast.success('Payment successful!');
      onPaymentSuccess(transactionId);
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Payment failed. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaPayment = async (): Promise<string> => {
    const axiosInstance = (await import('@/lib/axios')).default;

    // Initiate STK Push
    const stkResponse = await axiosInstance.post('/payments/mpesa/stkpush', {
      phoneNumber: mpesaPhone,
      bookingId,
      amount,
      type: 'booking_fee',
    });

    if (!stkResponse.data.success) {
      throw new Error(stkResponse.data.message || 'STK Push failed');
    }

    const { transactionId, checkoutRequestId } = stkResponse.data.data;

    toast.success('STK Push sent! Please check your phone and enter your M-Pesa PIN');

    // Poll for payment status (for up to 60 seconds)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const statusResponse = await axiosInstance.get(
          `/payments/mpesa/status/${transactionId}`
        );

        if (statusResponse.data.transaction.status === 'completed') {
          return transactionId;
        } else if (statusResponse.data.transaction.status === 'failed') {
          throw new Error(
            statusResponse.data.transaction.failureReason || 'Payment failed'
          );
        }
      } catch (error) {
        console.error('Status check error:', error);
      }

      attempts++;
    }

    throw new Error('Payment timeout. Please check your phone or try again.');
  };

  const handleCardPayment = async (): Promise<string> => {
    // TODO: Integrate with Stripe or Flutterwave
    // This is a placeholder
    throw new Error('Card payment not yet implemented');
  };

  const handleWalletPayment = async (): Promise<string> => {
    // TODO: Integrate with wallet system
    // This is a placeholder
    throw new Error('Wallet payment not yet implemented');
  };

  const paymentMethods = [
    {
      id: 'mpesa' as PaymentMethod,
      name: 'M-Pesa',
      icon: Smartphone,
      description: 'Pay via M-Pesa',
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Card',
      icon: CreditCard,
      description: 'Credit/Debit Card',
    },
    {
      id: 'wallet' as PaymentMethod,
      name: 'Wallet',
      icon: Wallet,
      description: 'Pay from wallet',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-overlay-medium flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-fee-payment-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 id="booking-fee-payment-title" className="text-xl font-bold text-bone">Pay Booking Fee</h2>
            <p className="text-sm text-steel mt-1">
              Secure payment protected by escrow
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-steel hover:text-bone transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount */}
          <div className="bg-success-bg rounded-lg p-4 mb-6 border border-success/30">
            <div className="text-sm text-success mb-1">Amount to Pay</div>
            <div className="text-3xl font-bold text-bone">
              {amount.toLocaleString()} {currency}
            </div>
            <div className="text-xs text-success mt-1">
              20% refundable booking deposit
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-bone mb-3">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === method.id
                        ? 'border-lumen bg-lumen/20 led-glow'
                        : 'border-line hover:border-default glass'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === method.id ? 'text-lumen-ink' : 'text-steel'
                      }`}
                    />
                    <div
                      className={`text-xs font-medium ${
                        paymentMethod === method.id ? 'text-lumen-ink' : 'text-steel'
                      }`}
                    >
                      {method.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6">
            {paymentMethod === 'mpesa' && (
              <div>
                <label className="block text-sm font-medium text-bone mb-2">
                  M-Pesa Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMpesaPhone(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-steel mt-1">
                  You will receive an STK push notification on your phone
                </p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-bone mb-2">
                    Card Number
                  </label>
                  <Input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardNumber(e.target.value)}
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bone mb-2">
                      Expiry Date
                    </label>
                    <Input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardExpiry(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bone mb-2">
                      CVC
                    </label>
                    <Input
                      type="text"
                      placeholder="123"
                      value={cardCVC}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardCVC(e.target.value)}
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="glass rounded-lg p-4 border border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-steel">Wallet Balance:</span>
                  <span className="font-semibold text-bone">5,000 {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-steel">After Payment:</span>
                  <span className="font-semibold text-bone">
                    {(5000 - amount).toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Security Features */}
          <div className="bg-info-bg rounded-lg p-4 mb-6 border border-lumen/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-lumen-ink" />
              <span className="font-semibold text-lumen-ink">
                Payment Protection
              </span>
            </div>
            <ul className="space-y-1 text-sm text-steel">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Funds held securely in escrow
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                100% refundable if you cancel
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Released after job completion
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 glass-button"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-line mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFeePaymentModal;
