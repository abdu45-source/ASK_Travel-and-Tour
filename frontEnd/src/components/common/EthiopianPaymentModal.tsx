import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Smartphone,
  Building2,
  CreditCard,
  ShieldCheck,
  Clock,
  ArrowRight,
  Printer,
  Loader2,
  Receipt,
  QrCode,
  FileText,
  BadgeCheck,
  Tag,
} from 'lucide-react';

interface EthiopianPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef?: string;
  destinationTitle: string;
  travelDate: string;
  travelers: number;
  totalAmount: number;
  clientName?: string;
  clientPhone?: string;
  agentReferralCode?: string;
  onPaymentSuccess: (paymentDetails: any) => void;
}

export type PaymentMethodType = 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA' | 'BANK_TRANSFER';

export const EthiopianPaymentModal: React.FC<EthiopianPaymentModalProps> = ({
  isOpen,
  onClose,
  bookingRef = 'ASK-' + Math.floor(100000 + Math.random() * 900000),
  destinationTitle,
  travelDate,
  travelers,
  totalAmount,
  clientName = 'Abduselam Ibrahim',
  clientPhone = '0900572995',
  agentReferralCode = '',
  onPaymentSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethodType>('TELEBIRR');
  const [phoneNumber, setPhoneNumber] = useState(clientPhone);
  const [cbeAccount, setCbeAccount] = useState('1000123456789');
  const [cardHolder, setCardHolder] = useState(clientName);
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('321');
  const [refCode, setRefCode] = useState(agentReferralCode);

  useEffect(() => {
    setRefCode(agentReferralCode);
  }, [agentReferralCode]);

  // Simulation steps
  const [processingState, setProcessingState] = useState<
    'IDLE' | 'CONTACTING_GATEWAY' | 'SENDING_USSD' | 'WAITING_PIN' | 'SETTLING' | 'SUCCESS'
  >('IDLE');
  const [countdown, setCountdown] = useState(30);
  const [transactionCode, setTransactionCode] = useState('');
  const [receiptData, setReceiptData] = useState<any | null>(null);

  useEffect(() => {
    let timer: any;
    if (processingState === 'WAITING_PIN' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            handleFinalizePayment();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [processingState, countdown]);

  if (!isOpen) return null;

  const handleStartPayment = () => {
    setProcessingState('CONTACTING_GATEWAY');

    setTimeout(() => {
      if (method === 'TELEBIRR' || method === 'CBE_BIRR') {
        setProcessingState('SENDING_USSD');
        setTimeout(() => {
          setProcessingState('WAITING_PIN');
          setCountdown(5); // 5 seconds demonstration for realistic interactive response
        }, 1200);
      } else {
        setProcessingState('SETTLING');
        setTimeout(() => {
          handleFinalizePayment();
        }, 1500);
      }
    }, 1000);
  };

  const handleFinalizePayment = () => {
    setProcessingState('SETTLING');
    setTimeout(() => {
      const code =
        method === 'TELEBIRR'
          ? `TB-${Date.now().toString().slice(-8)}`
          : method === 'CBE_BIRR'
          ? `FT26${Math.floor(100000 + Math.random() * 900000)}`
          : method === 'CHAPA'
          ? `CHP-TX-${Math.floor(100000 + Math.random() * 900000)}`
          : `CBE-SLIP-${Math.floor(100000 + Math.random() * 900000)}`;

      const paymentReceipt = {
        bookingRef,
        transactionCode: code,
        method,
        payerName: clientName,
        payerPhone: phoneNumber,
        amount: totalAmount,
        currency: 'ETB',
        agentReferralCode: refCode.trim() || undefined,
        vatAmount: Math.round(totalAmount * 0.15 * 100) / 100,
        paidAt: new Date().toISOString(),
        destinationTitle,
        travelDate,
        travelers,
        bankApprovalCode: 'AUTH-' + Math.floor(1000 + Math.random() * 9000),
      };

      setTransactionCode(code);
      setReceiptData(paymentReceipt);
      setProcessingState('SUCCESS');
      onPaymentSuccess(paymentReceipt);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-50 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Ethiopian Payment Gateway
              </h3>
              <p className="text-[11px] text-stone-500">
                EthSwitch & National Bank Verified Secure Checkout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {processingState === 'SUCCESS' && receiptData ? (
          /* Success Screen: Official Ethiopian Bank / VAT Receipt */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-serif text-xl font-bold text-emerald-950">
                Payment Authorized & Settled!
              </h4>
              <p className="text-xs text-emerald-800">
                Transaction confirmed with {method.replace('_', ' ')}. Your tour reservation is confirmed.
              </p>
            </div>

            {/* Official Ethiopian Tax & Payment Receipt */}
            <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4 shadow-sm text-xs font-mono text-stone-800">
              <div className="text-center border-b border-dashed border-stone-200 pb-3 space-y-1">
                <span className="font-serif font-bold text-sm tracking-wider uppercase block text-stone-900">
                  ASK ETHIOPIA TOURS & TRAVEL PLC
                </span>
                <span className="text-[10px] text-stone-500 block">
                  TIN: 0061298412 | VAT Reg: 9481230491
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Kebele 04, Bahir Dar, Ethiopia • Tel: 0900572995
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-400 block text-[10px]">Booking Ref:</span>
                  <span className="font-bold text-stone-900">#{bookingRef}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Transaction ID:</span>
                  <span className="font-bold text-emerald-700">{transactionCode}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Payer Name:</span>
                  <span className="font-bold text-stone-900">{clientName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Channel / Bank:</span>
                  <span className="font-bold text-stone-900">{method}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Expedition:</span>
                  <span className="font-bold text-stone-900">{destinationTitle}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Travel Date:</span>
                  <span className="font-bold text-stone-900">{travelDate}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-dashed border-stone-200 flex items-center justify-between">
                  <span className="text-stone-400 text-[10px]">Agent Reference:</span>
                  <span className="font-bold text-stone-900 font-mono text-[11px]">
                    {refCode.trim() ? refCode.trim() : 'Direct Organic Client (No Agent)'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-stone-200 pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Net Tour Package:</span>
                  <span className="font-bold">{totalAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>15% VAT (Included):</span>
                  <span>{(totalAmount * 0.15).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700">{totalAmount.toLocaleString()} ETB</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[10px] text-stone-400 border-t border-dashed border-stone-200">
                <span>Auth Code: {receiptData.bankApprovalCode}</span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  EthSwitch Confirmed
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 py-3 text-xs font-bold text-stone-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Tax Receipt
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 py-3 text-xs font-bold text-white shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                Done
              </button>
            </div>
          </div>
        ) : processingState !== 'IDLE' ? (
          /* Processing Screen: Live Ethiopian Gateway Simulator */
          <div className="py-8 text-center space-y-6 animate-in fade-in duration-200">
            {processingState === 'WAITING_PIN' ? (
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900">
                    USSD Push Sent to {phoneNumber}
                  </h4>
                  <p className="text-xs text-stone-600 max-w-sm mx-auto mt-1">
                    Please check your mobile handset. Enter your 4-digit{' '}
                    <span className="font-bold text-primary-700">
                      {method === 'TELEBIRR' ? 'Telebirr PIN' : 'CBE Birr PIN'}
                    </span>{' '}
                    to authorize <span className="font-bold">{totalAmount.toLocaleString()} ETB</span>.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-1.5 text-xs font-mono text-stone-600">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Prompt timeout in: <span className="font-bold text-stone-900">{countdown}s</span>
                </div>
                <div>
                  <button
                    onClick={handleFinalizePayment}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 underline"
                  >
                    Simulate Instant PIN Confirmation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900">
                    {processingState === 'CONTACTING_GATEWAY'
                      ? 'Contacting Ethiopian National Switch...'
                      : processingState === 'SENDING_USSD'
                      ? 'Dispatching Mobile USSD Prompt...'
                      : 'Verifying Settlement Ledger...'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    Establishing encrypted 256-bit TLS link with National Bank of Ethiopia gateway.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Payment Method Selection & Checkout Form */
          <div className="space-y-5 text-xs">
            {/* Amount Summary */}
            <div className="rounded-2xl bg-stone-100 p-4 flex items-center justify-between border border-stone-200">
              <div>
                <span className="text-[11px] text-stone-500 block">Total Due (in ETB)</span>
                <span className="font-serif text-2xl font-bold text-stone-900">
                  {totalAmount.toLocaleString()} <span className="text-xs font-sans text-stone-600">ETB</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500 block">Expedition</span>
                <span className="font-bold text-stone-800 text-xs block max-w-[160px] truncate">
                  {destinationTitle}
                </span>
                <span className="text-[10px] text-stone-400 block">{travelers} Traveler(s)</span>
              </div>
            </div>

            {/* Agent Referral Attribution Status */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-stone-500" />
                  Booking Attribution
                </span>
                {refCode.trim() ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Agent Assisted ({refCode.trim()})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    Direct Booking (0 ETB Agent Commission)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                {refCode.trim()
                  ? `Reservation linked to partner agent ${refCode.trim()}. 10% commission fee will be routed to your advisor upon approval.`
                  : 'You are booking independently by yourself. The confirmation email will be sent directly to your registered email address with 0 agent commission.'}
              </p>
            </div>

            {/* Gateway Selection Tabs */}
            <div>
              <label className="block font-bold text-stone-700 mb-2">
                Select Ethiopian Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Telebirr */}
                <button
                  type="button"
                  onClick={() => setMethod('TELEBIRR')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    method === 'TELEBIRR'
                      ? 'border-cyan-500 bg-cyan-50/70 text-cyan-900 ring-2 ring-cyan-400'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="h-7 w-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold text-xs">
                    TB
                  </div>
                  <span className="font-bold text-[11px]">telebirr</span>
                  <span className="text-[9px] text-stone-400">Mobile USSD</span>
                </button>

                {/* CBE Birr */}
                <button
                  type="button"
                  onClick={() => setMethod('CBE_BIRR')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    method === 'CBE_BIRR'
                      ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-400'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="h-7 w-7 rounded-lg bg-purple-800 text-white flex items-center justify-center font-bold text-xs">
                    CBE
                  </div>
                  <span className="font-bold text-[11px]">CBE Birr</span>
                  <span className="text-[9px] text-stone-400">*847# Prompt</span>
                </button>

                {/* Chapa */}
                <button
                  type="button"
                  onClick={() => setMethod('CHAPA')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    method === 'CHAPA'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-400'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    CH
                  </div>
                  <span className="font-bold text-[11px]">Chapa</span>
                  <span className="text-[9px] text-stone-400">Card / Debit</span>
                </button>

                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    method === 'BANK_TRANSFER'
                      ? 'border-stone-800 bg-stone-100 text-stone-900 ring-2 ring-stone-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="h-7 w-7 rounded-lg bg-stone-700 text-white flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[11px]">Bank Slip</span>
                  <span className="text-[9px] text-stone-400">Direct Transfer</span>
                </button>
              </div>
            </div>

            {/* Dynamic Details based on selected method */}
            {method === 'TELEBIRR' && (
              <div className="rounded-2xl bg-cyan-50/60 border border-cyan-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-900 font-bold text-xs">
                  <Smartphone className="w-4 h-4 text-cyan-700" />
                  <span>Ethio Telecom Telebirr Push Checkout</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Registered Telebirr Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0900572995"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    You will receive an automated USSD prompt on your phone to confirm with your PIN.
                  </span>
                </div>
              </div>
            )}

            {method === 'CBE_BIRR' && (
              <div className="rounded-2xl bg-purple-50/60 border border-purple-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <Building2 className="w-4 h-4 text-purple-700" />
                  <span>Commercial Bank of Ethiopia (CBE Birr)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    CBE Birr Account / Mobile Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0900572995"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Merchant Code: <span className="font-bold text-purple-950 font-mono">981423</span> | Or dial *847#
                  </span>
                </div>
              </div>
            )}

            {method === 'CHAPA' && (
              <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Chapa Online Card Gateway</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'BANK_TRANSFER' && (
              <div className="rounded-2xl bg-stone-100 border border-stone-200 p-4 space-y-2 text-stone-700">
                <span className="font-bold text-xs text-stone-900 block">
                  Commercial Bank of Ethiopia (CBE) Escrow
                </span>
                <p className="text-[11px]">
                  Account Name: <span className="font-bold text-stone-900">ASK Ethiopian Tour Agency</span><br />
                  Account No: <span className="font-mono font-bold text-stone-900">1000123456789</span><br />
                  Branch: Bahir Dar Central Office
                </p>
                <span className="text-[10px] text-stone-500 block pt-1">
                  Enter your payment reference below to simulate verified receipt confirmation.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-2xl text-stone-600 hover:bg-stone-200 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartPayment}
                className="flex-1 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 shadow-lg shadow-primary-700/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Authorize {totalAmount.toLocaleString()} ETB</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

