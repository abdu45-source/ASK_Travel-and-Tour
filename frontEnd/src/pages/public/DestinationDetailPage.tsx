import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { Destination } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EthiopianPaymentModal } from '../../components/common/EthiopianPaymentModal';

export const DestinationDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dest, setDest] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Booking Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [travelDate, setTravelDate] = useState(defaultDate);
  const [travelers, setTravelers] = useState(2);
  const [clientNotes, setClientNotes] = useState('');
  const [bookingViaAgent, setBookingViaAgent] = useState(false);
  const [agentReferralCode, setAgentReferralCode] = useState('');
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);
  const [appliedRuleName, setAppliedRuleName] = useState<string | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paidDetails, setPaidDetails] = useState<any | null>(null);

  const isOwner = Boolean(user?.roles?.includes('OWNER'));
  const isManager = Boolean(user?.roles?.includes('MANAGER'));
  const isStaff = isOwner || isManager;

  const handleToggleStatus = async () => {
    if (!dest) return;
    const nextStatus = dest.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      await api.patch(`/destinations/${dest.id}`, { status: nextStatus });
      setDest({ ...dest, status: nextStatus as any });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  useEffect(() => {
    const fetchDest = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/destinations/${slug}`);
        setDest(res.data);
        if (res.data.gallery_images?.length) {
          setSelectedImage(res.data.gallery_images[0]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchDest();
  }, [slug]);

  // Recalculate price when date changes
  useEffect(() => {
    if (!dest || !travelDate) return;
    const fetchPrice = async () => {
      setCalculatingPrice(true);
      try {
        const res = await api.get(
          `/pricing/calculate?destinationId=${dest.id}&date=${travelDate}`,
        );
        setEffectivePrice(res.data.effectivePrice);
        setAppliedRuleName(res.data.appliedRuleName);
      } catch {
        setEffectivePrice(Number(dest.base_price));
      } finally {
        setCalculatingPrice(false);
      }
    };
    fetchPrice();
  }, [dest, travelDate]);

  const handleOpenPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (bookingViaAgent && !agentReferralCode.trim()) {
      setBookingError(
        'Agent Referral Code is mandatory when booking with Travel Agent assistance. Please enter the referral code provided by your agent or select "Direct Booking (By Self)".',
      );
      return;
    }
    setBookingError(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentDetails: any) => {
    if (!dest) return;
    setPaidDetails(paymentDetails);
    setIsSubmitting(true);
    setBookingError(null);
    try {
      const codeToAttach = bookingViaAgent
        ? (paymentDetails.agentReferralCode || agentReferralCode || '').trim().toUpperCase()
        : undefined;

      const res = await api.post('/bookings', {
        destination_id: dest.id,
        travel_date: travelDate,
        travelers,
        booking_via_agent: bookingViaAgent,
        referral_code: codeToAttach || undefined,
        client_notes: clientNotes
          ? `${clientNotes} | Paid via ${paymentDetails.method} (Ref: ${paymentDetails.transactionCode})${codeToAttach ? ` | Ref Code: ${codeToAttach}` : ''}`
          : `Paid via ${paymentDetails.method} (Ref: ${paymentDetails.transactionCode})${codeToAttach ? ` | Ref Code: ${codeToAttach}` : ''}`,
      });
      setBookingSuccess(res.data.id);
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse space-y-8">
        <div className="h-96 rounded-3xl bg-stone-200" />
        <div className="h-10 w-2/3 bg-stone-200 rounded-xl" />
        <div className="h-40 bg-stone-200 rounded-3xl" />
      </div>
    );
  }

  if (!dest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Destination Not Found</h2>
        <Link to="/destinations" className="mt-4 inline-block text-xs text-primary-700 font-bold hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const unitRate = effectivePrice !== null ? effectivePrice : Number(dest.base_price);
  const totalAmount = unitRate * travelers;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Gallery & Header */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-stone-900">Home</Link>
            <span>/</span>
            <Link to="/destinations" className="hover:text-stone-900">Destinations</Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">{dest.title}</span>
          </div>

          {/* Staff Badge */}
          {isStaff && (
            <div className="flex items-center gap-2 bg-stone-900 text-white px-3 py-1 rounded-xl text-[11px] font-bold">
              <span>{isOwner ? 'OWNER VIEW' : 'MANAGER VIEW'}</span>
              <span className="text-stone-400">|</span>
              <span className={dest.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}>
                STATUS: {dest.status}
              </span>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="ml-2 bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded text-[10px] text-amber-300 font-semibold"
              >
                Toggle to {dest.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-800">
                {dest.region}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-stone-500">
                <Clock className="w-3.5 h-3.5" />
                {dest.duration_days} Days / {dest.duration_days - 1} Nights
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900">
              {dest.title}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-400 block font-medium">Standard Base Price</span>
            <span className="text-2xl sm:text-3xl font-bold text-stone-900">
              {Number(dest.base_price).toLocaleString()} <span className="text-sm font-normal text-stone-500">ETB / traveler</span>
            </span>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="space-y-3">
          <div className="h-[420px] sm:h-[500px] w-full rounded-3xl overflow-hidden shadow-md">
            <img
              src={selectedImage || dest.gallery_images[0]}
              alt={dest.title}
              className="h-full w-full object-cover"
            />
          </div>

          {dest.gallery_images?.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {dest.gallery_images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`h-20 w-32 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? 'border-primary-600 scale-95' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Details (Left 7 cols) & Booking Panel (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-10">
          {/* Overview */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold text-stone-900">Expedition Overview</h3>
            <p className="text-sm text-stone-600 leading-relaxed font-light">
              {dest.description}
            </p>
          </div>

          {/* Day by Day Itinerary */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold text-stone-900">Daily Itinerary</h3>
            <div className="space-y-3">
              {dest.itinerary?.map((item) => (
                <div
                  key={item.day}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-100 text-xs font-bold text-primary-800 shrink-0">
                      D{item.day}
                    </span>
                    <h4 className="font-bold text-sm text-stone-900">{item.title}</h4>
                  </div>
                  <p className="text-xs text-stone-600 pl-10 leading-relaxed">{item.activities}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="rounded-3xl bg-emerald-50/70 border border-emerald-100 p-6 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Included in Package
              </h4>
              <ul className="space-y-2 text-xs text-emerald-950">
                {dest.inclusions?.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-rose-50/70 border border-rose-100 p-6 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-rose-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Excluded
              </h4>
              <ul className="space-y-2 text-xs text-rose-950">
                {dest.exclusions?.map((exc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Booking Card & Pricing Engine Panel */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Request Booking
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Guaranteed Departure
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">Reserve Your Tour</h3>
            </div>

            {bookingSuccess ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-stone-900">Booking Request Submitted!</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Your booking (#
                  {bookingSuccess.substring(0, 8)}) is now in review by our agency moderation team. You will receive an instant notification when approved.
                </p>
                <Link
                  to="/dashboard/client"
                  className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700"
                >
                  Go to My Bookings
                </Link>
              </div>
            ) : (
              <form onSubmit={handleOpenPaymentModal} className="space-y-4">
                {bookingError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Travel Date */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Select Travel Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Number of Travelers */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Number of Travelers
                  </label>
                  <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="px-4 py-2 bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-sm text-stone-900">
                      {travelers} Traveler{travelers > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers(travelers + 1)}
                      className="px-4 py-2 bg-stone-100 text-stone-700 font-bold hover:bg-stone-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Booking Arrangement Selector (Direct vs Agent) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Booking Arrangement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingViaAgent(false);
                        setBookingError(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        !bookingViaAgent
                          ? 'border-primary-600 bg-primary-50 text-primary-900 ring-1 ring-primary-500 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-primary-700" />
                        <span>Direct Booking</span>
                      </div>
                      <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                        Booking by self (No code needed)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBookingViaAgent(true);
                        setBookingError(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        bookingViaAgent
                          ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <Tag className="w-3.5 h-3.5 text-amber-700" />
                        <span>Via Travel Agent</span>
                      </div>
                      <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                        Referral code is mandatory
                      </span>
                    </button>
                  </div>

                  {bookingViaAgent ? (
                    <div className="pt-1.5 space-y-1 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-stone-800 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-600" />
                          <span>Agent Referral Code</span>
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-700">Mandatory</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={agentReferralCode}
                        onChange={(e) => {
                          setAgentReferralCode(e.target.value.toUpperCase());
                          if (bookingError) setBookingError(null);
                        }}
                        placeholder="e.g. AGT-XXXXXX or ETHIOPIA10"
                        className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-stone-900 placeholder:normal-case placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-stone-500">
                        Enter the unique referral code received from your partner agent. 10% commission will be attributed to them upon approval.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-[10px] text-stone-500 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Direct reservation: 0 agent commission. Confirmation will be sent directly to your email.</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Special Requests or Dietary Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="E.g., Vegetarian diet, airport pickup needed..."
                    className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Live Seasonal Price Breakdown */}
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-500">
                    <span>Base rate per traveler</span>
                    <span>{Number(dest.base_price).toLocaleString()} ETB</span>
                  </div>

                  {appliedRuleName && (
                    <div className="flex items-center justify-between text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {appliedRuleName}
                      </span>
                      <span>
                        {unitRate > Number(dest.base_price) ? '+' : ''}
                        {(unitRate - Number(dest.base_price)).toLocaleString()} ETB
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-stone-700 font-medium pt-2 border-t border-stone-200">
                    <span>Effective Rate</span>
                    <span>{unitRate.toLocaleString()} ETB × {travelers}</span>
                  </div>

                  <div className="flex items-center justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Total Booking Price</span>
                    <span className="text-primary-700">{totalAmount.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Submit button with Ethiopian Payment Gateway */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] py-3.5 text-xs font-bold text-white shadow-lg shadow-primary-700/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>{user ? 'Pay & Confirm Reservation (Telebirr / CBE Birr)' : 'Sign In & Reserve'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Protected by fair tiered cancellation policy (2% / 4% / 8%)
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {dest && (
        <EthiopianPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          destinationTitle={dest.title}
          travelDate={travelDate}
          travelers={travelers}
          totalAmount={totalAmount}
          clientName={user?.name || 'Abduselam Ibrahim'}
          clientPhone={user?.phone || '0900572995'}
          agentReferralCode={agentReferralCode}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
