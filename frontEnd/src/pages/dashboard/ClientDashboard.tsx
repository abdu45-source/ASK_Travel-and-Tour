import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  Star,
  MessageSquare,
  Shield,
  Lock,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Check,
  Info,
  Sparkles,
  Award,
  Tag,
} from 'lucide-react';
import { api } from '../../services/api';
import { emailService } from '../../services/emailService';
import { useAuth } from '../../context/AuthContext';
import { Booking, BookingStatus } from '../../types';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Tab State: reservations | guidance | feedback | privacy | help
  const [activeTab, setActiveTab] = useState<'reservations' | 'guidance' | 'feedback' | 'privacy' | 'help'>('reservations');

  // Feedback State
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('Tour Organization & Guide');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  // Help FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Cancellation Modal State
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [cancelPreview, setCancelPreview] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundChannel, setRefundChannel] = useState<'TELEBIRR' | 'CBE'>('TELEBIRR');
  const [refundAccount, setRefundAccount] = useState('0900572995');
  const [cancelling, setCancelling] = useState(false);

  const fetchClientData = async () => {
    try {
      const [dashRes, bkgRes] = await Promise.all([
        api.get('/dashboard/client'),
        api.get('/bookings'),
      ]);
      setData(dashRes.data);
      setBookings(bkgRes.data.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const handleDownloadPdf = async (bookingId: string, filename: string) => {
    setDownloadingId(bookingId);
    try {
      const res = await api.get(`/bookings/${bookingId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download PDF document.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenCancelModal = async (b: Booking) => {
    setSelectedBookingForCancel(b);
    try {
      const res = await api.get(`/bookings/${b.id}/cancel-preview`);
      setCancelPreview(res.data);
    } catch {
      const total = Number(b.total_price);
      const penalty = Math.round(total * 0.02 * 100) / 100;
      setCancelPreview({
        diffDays: 1,
        penaltyRate: 0.02,
        penaltyPercentage: 2,
        tierDescription: '1 up to 5 days (2% penalty)',
        totalAmount: total,
        penaltyFee: penalty,
        refundAmount: total - penalty,
      });
    }
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForCancel) return;

    setCancelling(true);
    try {
      const fullReason = cancelReason
        ? `${cancelReason} | Refund Remittance: ${refundChannel} (${refundAccount})`
        : `Refund Remittance requested to ${refundChannel} (${refundAccount})`;

      await api.post(`/bookings/${selectedBookingForCancel.id}/cancel`, {
        reason: fullReason,
      });
      setSelectedBookingForCancel(null);
      setCancelPreview(null);
      setCancelReason('');
      fetchClientData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) {
      alert('Please enter a brief note or comment before submitting.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await emailService.sendEmail({
        to: 'abduselamibrahim85@gmail.com',
        subject: `New Client Feedback: ${rating} Stars (${feedbackCategory})`,
        text: `Traveler Review:\nRating: ${rating} / 5\nCategory: ${feedbackCategory}\nComments: ${feedbackComment}`,
        html: `<div style="font-family:sans-serif;padding:24px;border:1px solid #e7e5e4;border-radius:12px;background:#ffffff;max-width:560px;">
          <h2 style="color:#1c1917;margin-top:0;">Traveler Review Received (${rating} / 5 Stars)</h2>
          <p><strong>Category:</strong> ${feedbackCategory}</p>
          <p><strong>Comments:</strong> ${feedbackComment}</p>
          <hr style="border:none;border-top:1px solid #e7e5e4;margin:16px 0;" />
          <p style="font-size:12px;color:#78716c;">Submitted via ASK Client Dashboard with Brevo delivery service.</p>
        </div>`,
      });
    } catch {
      // Non-blocking fallback
    } finally {
      setSubmittingFeedback(false);
      setFeedbackSuccess(true);
      setFeedbackComment('');
    }
  };

  if (loading) {
    return <div className="h-96 rounded-3xl bg-stone-200 animate-pulse" />;
  }

  return (
    <div className="space-y-10">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Traveler Dashboard
          </span>
          <h2 className="font-serif text-3xl font-bold">Your Ethiopian Adventures</h2>
          <p className="text-xs text-stone-200 max-w-lg">
            Track your expedition reservations, download fast one-page travel vouchers or cancellation statements, and manage cancellations before departure.
          </p>
          {user?.clientProfile?.client_referral_code && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-mono font-bold text-amber-300 shadow-sm">
                <Tag className="w-3.5 h-3.5 text-amber-300" />
                <span>My Client Referral Code: {user.clientProfile.client_referral_code}</span>
              </span>
            </div>
          )}
        </div>

        <Link
          to="/destinations"
          className="rounded-2xl bg-white px-5 py-3 text-xs font-bold text-stone-900 shadow-md hover:bg-stone-100 transition-colors shrink-0"
        >
          Explore Destinations & Book Tour
        </Link>
      </div>

      {/* Instant Status Notifications Banner (FR-CLI-02) */}
      {data?.recentNotifications && data.recentNotifications.length > 0 && (
        <div className="space-y-2">
          {data.recentNotifications.slice(0, 1).map((notif: any) => {
            const isApproved = notif.type === 'BOOKING_APPROVED';
            const isRejected = notif.type === 'BOOKING_REJECTED';
            const isUpdate = notif.type === 'BOOKING_UPDATE';

            return (
              <div
                key={notif.id}
                className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                  isApproved
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : isRejected
                    ? 'bg-red-50/80 border-red-200 text-red-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isApproved
                        ? 'bg-emerald-600 text-white'
                        : isRejected
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-500 text-stone-900'
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isRejected ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80">
                        {notif.title}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-0.5">{notif.body}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className="text-xs font-bold underline hover:opacity-80 px-2 py-1"
                  >
                    View Reservation
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Support Line: Assigned Travel Agent or Agency Manager (FR-CLI-04) */}
      {data?.assignedStaff && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-700 to-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {data.assignedStaff.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {data.assignedStaff.role === 'AGENT'
                    ? 'Your Dedicated Travel Agent'
                    : 'Agency Operations Manager'}
                </span>
                {data.assignedStaff.referralCode && (
                  <span className="text-[10px] font-mono text-stone-400">
                    Partner Code: {data.assignedStaff.referralCode}
                  </span>
                )}
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {data.assignedStaff.name}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  {data.assignedStaff.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {data.assignedStaff.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open:chat'))}
              className="flex-1 md:flex-none rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-primary-600/20 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {data.assignedStaff.role === 'AGENT'
                  ? 'Chat with My Travel Agent'
                  : 'Chat with Agency Concierge'}
              </span>
            </button>

            <a
              href={`tel:${data.assignedStaff.phone}`}
              className="flex-1 md:flex-none rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-stone-600" />
              <span>Call Direct</span>
            </a>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'reservations'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>My Reservations</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'reservations'
                ? 'bg-stone-800 text-stone-200'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('guidance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'guidance'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>User Guidance</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'feedback'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-primary-400" />
          <span>Feedback & Review</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'privacy'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Privacy & Agreement</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'help'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Help & Support Desk</span>
        </button>
      </div>

      {/* TAB 1: RESERVATIONS */}
      {activeTab === 'reservations' && (
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">My Trip Reservations</h3>
            <p className="text-xs text-stone-500">
              Download travel vouchers, view tiered cancellation breakdowns, and manage your trips.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500">{bookings.length} Total</span>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16 text-stone-500 space-y-4">
            <Compass className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold">You haven't reserved any tours yet.</p>
            <Link
              to="/destinations"
              className="inline-block rounded-xl bg-primary-600 px-5 py-2 text-xs font-bold text-white hover:bg-primary-700"
            >
              Discover Ethiopia
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isPending = b.status === BookingStatus.PENDING;
              const isApproved = b.status === BookingStatus.APPROVED;
              const isCancelled = b.status === BookingStatus.CANCELLED;
              const isCompleted = b.status === BookingStatus.COMPLETED;

              // Client can cancel until travel day arrives
              const travelDateObj = new Date(b.travel_date);
              const todayObj = new Date();
              todayObj.setHours(0, 0, 0, 0);
              travelDateObj.setHours(0, 0, 0, 0);
              const isBeforeTravelDate = todayObj < travelDateObj;
              const canCancel = (isPending || isApproved) && isBeforeTravelDate;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-stone-200 p-5 hover:border-primary-200 transition-colors space-y-4 bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg">
                        #{b.id.substring(0, 8).toUpperCase()}
                      </span>
                      <h4 className="font-serif font-bold text-base text-stone-900">
                        {b.destination?.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-800'
                            : isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 block font-medium">Travel Date</span>
                      <span className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-primary-600" />
                        {b.travel_date}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">Travelers</span>
                      <span className="font-bold text-stone-800 mt-0.5 block">{b.travelers} Pax</span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">Total Amount</span>
                      <span className="font-bold text-primary-800 text-sm mt-0.5 block">
                        {Number(b.total_price).toLocaleString()} ETB
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">Travel Status</span>
                      <span className={`font-semibold mt-0.5 block ${isBeforeTravelDate ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {isBeforeTravelDate ? 'Upcoming Expedition' : 'Departed / Past Date'}
                      </span>
                    </div>
                  </div>

                  {/* Manager comments if any */}
                  {b.manager_comment && (
                    <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600 border border-stone-100">
                      <span className="font-bold text-stone-800 block mb-0.5">Agency Notes:</span>
                      {b.manager_comment}
                    </div>
                  )}

                  {/* Cancellation details if cancelled (Real Ethiopian Remittance Appearance) */}
                  {isCancelled && (
                    <div className="rounded-2xl bg-rose-50/70 p-4 text-xs text-rose-950 border border-rose-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2.5">
                        <div className="space-y-0.5">
                          <span className="font-bold flex items-center gap-1.5 text-rose-900 text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            Official Cancellation & Financial Remittance Settlement
                          </span>
                          <p className="text-stone-700 text-xs">
                            Administrative Penalty ({b.penalty_fee ? Math.round((Number(b.penalty_fee) / Number(b.total_price)) * 100) : 2}%):{' '}
                            <span className="font-bold text-rose-700">{Number(b.penalty_fee || 0).toFixed(2)} ETB</span> • Net Refund Remitted:{' '}
                            <span className="font-bold text-emerald-700">{Number(b.refund_amount || (Number(b.total_price) - Number(b.penalty_fee || 0))).toFixed(2)} ETB</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownloadPdf(b.id, `ASK_Travel_Cancellation_Statement_${b.id.substring(0, 8)}.pdf`)}
                          disabled={downloadingId === b.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 shrink-0 shadow-sm"
                        >
                          {downloadingId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          Download Statement (PDF)
                        </button>
                      </div>

                      {/* Remittance Banking Footprint */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-stone-600 bg-white/70 p-2.5 rounded-xl border border-rose-100">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-sans">Remittance Channel:</span>
                          <span className="font-bold text-stone-800">Telebirr / CBE Reversal</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-sans">Settlement Ref:</span>
                          <span className="font-bold text-rose-900">ET-REV-{b.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-sans">Ledger Status:</span>
                          <span className="font-bold text-emerald-700">SETTLED IN WALLET</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                    {isApproved && (
                      <button
                        onClick={() => handleDownloadPdf(b.id, `ASK_Travel_Voucher_${b.id.substring(0, 8)}.pdf`)}
                        disabled={downloadingId === b.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 px-3.5 py-1.5 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                        title="Download official Booking Confirmation & Travel Voucher"
                      >
                        {downloadingId === b.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-primary-600" />
                        )}
                        Download Voucher (PDF)
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleOpenCancelModal(b)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* TAB 2: USER GUIDANCE */}
      {activeTab === 'guidance' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Traveler Onboarding & Roadmap
            </span>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              How ASK Ethiopian Tour & Travel Works
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Follow these 4 simple steps to explore Ethiopia, reserve journeys, and travel with peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/60 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Discover & Tailor Circuit</h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pl-11">
                Browse all 12+ curated destinations across Lalibela, Simien Mountains, Danakil Depression, Gondar, and Lake Tana. Every tour features transparent live seasonal pricing in ETB.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/60 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Instant Reservation & Moderation</h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pl-11">
                Select your preferred travel date and group size. Submit with or without an authorized partner referral code. Our Bahir Dar operations desk moderates and confirms each request swiftly.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/60 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Download Verified 1-Page PDF Voucher</h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pl-11">
                Once approved, download your official 1-page PDF travel voucher directly from your dashboard. It contains full itinerary, monument entry passes, and AC transport dispatch credentials.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/60 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Tiered Protection & Refund Reversals</h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pl-11">
                Plans change? You can cancel any reservation up until the day of departure. Our fair tiered policy deducts 2% (1-5 days), 4% (6-10 days), or 8% (10+ days) and remits your refund to Telebirr or CBE.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRAVELER FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              Traveler Experience & Voice
            </span>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              Share Your Feedback
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Your reviews directly help our operations team, local guides, and software architects refine our services.
            </p>
          </div>

          {feedbackSuccess && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-emerald-950 text-xs">
                  Thank You for Your Review!
                </h4>
                <p className="text-xs text-emerald-800">
                  Your feedback has been logged in our central quality registry and shared with agency management in Bahir Dar.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleFeedbackSubmit} className="space-y-5 max-w-2xl">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Rate Your Overall Experience
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setRating(st)}
                    className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        st <= rating
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-stone-200 text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-stone-600 ml-2">
                  {rating === 5
                    ? 'Exceptional (5/5)'
                    : rating === 4
                    ? 'Very Good (4/5)'
                    : rating === 3
                    ? 'Good (3/5)'
                    : rating === 2
                    ? 'Fair (2/5)'
                    : 'Needs Improvement (1/5)'}
                </span>
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Feedback Focus Area
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Tour Organization & Guide',
                  'AC Vehicle & Transport',
                  'Online Booking & Payment',
                  'Cancellation & Refund Handling',
                  'Heritage Experience',
                ].map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setFeedbackCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      feedbackCategory === cat
                        ? 'bg-primary-800 text-white border-primary-900 shadow-sm'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Your Review & Suggestions
              </label>
              <textarea
                rows={4}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share your thoughts about your Ethiopian trip, booking convenience, guide insights, or app usability..."
                className="w-full rounded-2xl border border-stone-200 p-3.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-stone-400">
                Moderated by lead developer Abduselam Ibrahim (abduselamibrahim85@gmail.com)
              </p>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-6 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: PRIVACY & AGREEMENT INFO */}
      {activeTab === 'privacy' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Legal & Traveler Protection
            </span>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              Privacy & Traveler Agreement
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Clear, transparent legal terms governing your reservations, data privacy, and tiered refund protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide">
                  1. Traveler Data Privacy (256-bit TLS)
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                We store your identity, phone, and travel dates strictly within encrypted databases. Your information is never sold or used for third-party marketing. All communications comply with Ethiopian consumer protection standards.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary-700" />
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide">
                  2. Price Lock & Seasonal Guarantee
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                The price you confirm in Ethiopian Birr (ETB) is final and legally protected against post-booking foreign exchange fluctuations, fuel surcharges, or entrance fee increases at UNESCO heritage sites.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide">
                  3. Tiered Cancellation Agreement
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                You retain full cancellation rights until the scheduled travel day presents:
                <br />
                • <strong>1 up to 5 days elapsed:</strong> 2% administrative penalty fee.
                <br />
                • <strong>6 up to 10 days elapsed:</strong> 4% administrative penalty fee.
                <br />
                • <strong>10 days and above:</strong> 8% administrative penalty fee.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-700" />
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide">
                  4. Escrow Remittance Reversal
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Upon cancellation confirmation, net refund amounts are automatically routed back to your designated Telebirr wallet or CBE bank account with an instant cryptographic statement ID.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HELP & SUPPORT DESK */}
      {activeTab === 'help' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Bahir Dar Central Operations
            </span>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              Help & Support Desk
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Reach our local expedition desk or browse common answers to frequently asked questions.
            </p>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Emergency Hotline
              </span>
              <p className="text-sm font-bold text-stone-900 font-mono">0900572995</p>
              <p className="text-[11px] text-stone-500">+251 58 220 1234 (Bahir Dar HQ)</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary-600" />
                Concierge & Developer
              </span>
              <p className="text-xs font-bold text-stone-900 break-all">
                abduselamibrahim85@gmail.com
              </p>
              <p className="text-[11px] text-stone-500">Abduselam Ibrahim (Lead)</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Dispatch Office
              </span>
              <p className="text-xs font-bold text-stone-900">Kebele 04, Bahir Dar</p>
              <p className="text-[11px] text-stone-500">Amhara Region, Ethiopia</p>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="space-y-3 pt-2">
            <h4 className="font-serif text-lg font-bold text-stone-900">
              Frequently Asked Questions
            </h4>

            {[
              {
                q: 'How do I download and present my 1-page travel voucher?',
                a: 'Once your reservation is approved by agency management, click "Download Voucher (PDF)" on your Reservations tab. You can store the PDF on your phone or print a physical copy to present to your expedition guide.',
              },
              {
                q: 'How does the tiered cancellation penalty work?',
                a: 'You can cancel any booking up until your scheduled travel day. If cancelled within 1-5 days of confirmation, a 2% administrative fee is deducted. Between 6-10 days, 4% is deducted. After 10 days, 8% is deducted. The remainder is remitted immediately.',
              },
              {
                q: 'How quickly is my cancellation refund deposited?',
                a: 'Refund reversals to Telebirr mobile numbers or Commercial Bank of Ethiopia (CBE) accounts are processed within 24 to 48 business hours, accompanied by an official single-page cancellation statement PDF.',
              },
              {
                q: 'Can I reschedule or adjust traveler counts?',
                a: 'Yes! Contact our Bahir Dar operations hotline at 0900572995 or email abduselamibrahim85@gmail.com at least 48 hours prior to departure to adjust your travel party size or schedule.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-stone-200 overflow-hidden transition-all bg-white"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between text-xs font-bold text-stone-900 hover:bg-stone-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-stone-600 border-t border-stone-100 bg-stone-50/50 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tiered Cancellation Confirmation Modal */}
      {selectedBookingForCancel && cancelPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Tiered Cancellation Policy
                </span>
                <h4 className="font-serif text-2xl font-bold text-stone-900">
                  Cancel Tour Reservation?
                </h4>
              </div>
              <button
                onClick={() => setSelectedBookingForCancel(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Reservations can be cancelled up until the scheduled travel day. The cancellation penalty fee is calculated based on days elapsed since booking confirmation:
            </p>

            {/* Policy Tiers Overview */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2.5 rounded-xl border ${cancelPreview.penaltyPercentage === 2 ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-stone-50 border-stone-200 opacity-60'}`}>
                <div className="font-bold text-stone-900">1 – 5 Days</div>
                <div className="text-xs font-extrabold text-amber-700">2% Penalty</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${cancelPreview.penaltyPercentage === 4 ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-400' : 'bg-stone-50 border-stone-200 opacity-60'}`}>
                <div className="font-bold text-stone-900">6 – 10 Days</div>
                <div className="text-xs font-extrabold text-orange-700">4% Penalty</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${cancelPreview.penaltyPercentage === 8 ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' : 'bg-stone-50 border-stone-200 opacity-60'}`}>
                <div className="font-bold text-stone-900">10+ Days</div>
                <div className="text-xs font-extrabold text-rose-700">8% Penalty</div>
              </div>
            </div>

            {/* Financial breakdown for this booking */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-500 pb-2 border-b border-stone-200">
                <span>Days Elapsed Since Confirmation:</span>
                <span className="font-bold text-stone-900">{cancelPreview.diffDays} day(s) ({cancelPreview.tierDescription})</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Original Booking Amount:</span>
                <span className="font-semibold text-stone-900">{Number(cancelPreview.totalAmount).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>Cancellation Penalty ({cancelPreview.penaltyPercentage}%):</span>
                <span>{Number(cancelPreview.penaltyFee).toFixed(2)} ETB</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-sm pt-2 border-t border-stone-200">
                <span>Net Refund to You ({100 - cancelPreview.penaltyPercentage}%):</span>
                <span>{Number(cancelPreview.refundAmount).toFixed(2)} ETB</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCancellation} className="space-y-4 text-xs">
              {/* Ethiopian Refund Channel Selector */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Refund Disbursement Channel (Instant Reversal)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundChannel('TELEBIRR')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      refundChannel === 'TELEBIRR'
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-400 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    Telebirr Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundChannel('CBE')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      refundChannel === 'CBE'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-400 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    CBE Bank Account
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {refundChannel === 'TELEBIRR' ? 'Telebirr Mobile Number' : 'CBE Account Number'}
                </label>
                <input
                  type="text"
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(e.target.value)}
                  placeholder="0900572995"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs font-mono font-bold text-stone-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Reason for Cancellation (Printed on Official PDF Statement)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule adjustment, personal reasons, medical, change of travel dates..."
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Cancelling Booking...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
