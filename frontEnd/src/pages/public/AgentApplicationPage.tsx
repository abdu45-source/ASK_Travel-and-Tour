import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Wallet,
  Compass,
} from 'lucide-react';
import { api } from '../../services/api';

export const AgentApplicationPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [cityOrRegion, setCityOrRegion] = useState('Addis Ababa');
  const [experienceNotes, setExperienceNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/agents/apply', {
        name,
        email,
        phone: phone ? phone.trim() : undefined,
        password,
        payout_details: payoutDetails.trim(),
        city_or_region: cityOrRegion,
        experience_notes: experienceNotes.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to submit agent application. Please check your details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/80 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider">
            <Briefcase className="w-4 h-4 text-amber-700" />
            <span>Official Partner Program</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
            Join the ASK Travel Agent Network
          </h1>
          <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Partner with Ethiopia's premier licensed tour operator. Refer travelers to authentic expeditions across Lalibela, Simien, Danakil, and Lake Tana, and earn an automated 10% commission on every booking.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-stone-200 shadow-xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">10% Automated Commission</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Transparent commission credited directly to your digital partner wallet upon booking approval.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-stone-200 shadow-xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Flexible Local Payouts</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Fast withdrawals directly to your Commercial Bank of Ethiopia (CBE) account or Telebirr mobile wallet.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-stone-200 shadow-xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 text-primary-700 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Dedicated Agent Portal</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Access real-time booking pipelines, generate dynamic one-time referral codes, and chat directly with our Agency Manager.
            </p>
          </div>
        </div>

        {/* Main Application Form or Success Confirmation */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-stone-200 shadow-xl">
          {submitted ? (
            <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                  Application Submitted for Review!
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Thank you, <strong>{name}</strong>! Your application to join the ASK Travel Partner Agent Network has been forwarded to our <strong>Agency Manager</strong> and <strong>System Owner</strong>.
                </p>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 text-left text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>What happens next?</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-stone-700 text-[11px] leading-relaxed">
                  <li>An acknowledgement email has been dispatched to <strong>{email}</strong>.</li>
                  <li>Our management team will verify your credentials and payout details.</li>
                  <li>Once approved by the Manager/Owner, you will receive an activation email containing your official <strong>8-character exclusive referral code</strong> to begin earning commissions!</li>
                </ul>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/"
                  className="rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors"
                >
                  Return to Home
                </Link>
                <Link
                  to="/destinations"
                  className="rounded-xl bg-primary-50 px-6 py-2.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  Explore Tour Catalog
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                  Partner Agent Registration Form
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Complete the fields below. Once submitted, your profile will be sent to the Agency Manager and Owner for review and account issuance.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Full Name / Agency Representative *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dawit Haile"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. dawit@travelagency.et"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Phone Number (Mobile) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0911223344"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Operating Region */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Operating City / Region *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <select
                      value={cityOrRegion}
                      onChange={(e) => setCityOrRegion(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                    >
                      <option value="Addis Ababa">Addis Ababa</option>
                      <option value="Bahir Dar">Bahir Dar</option>
                      <option value="Gondar">Gondar</option>
                      <option value="Hawassa">Hawassa</option>
                      <option value="Mekele">Mekele</option>
                      <option value="Arba Minch">Arba Minch</option>
                      <option value="Dire Dawa">Dire Dawa</option>
                      <option value="International / Diaspora">International / Diaspora</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Preferred Portal Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bank Payout Details */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Bank Payout Details (CBE Account / Telebirr Number) *
                </label>
                <input
                  type="text"
                  required
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="e.g. CBE: 1000123456789 (Dawit Haile) or Telebirr: 0911223344"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Used by agency accounting for automated commission payouts upon tour approval.
                </span>
              </div>

              {/* Experience / Motivation */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Travel Agency / Tourism Experience (Optional)
                </label>
                <textarea
                  rows={3}
                  value={experienceNotes}
                  onChange={(e) => setExperienceNotes(e.target.value)}
                  placeholder="Tell our manager briefly about your client network or tours you promote..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-amber-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Submitting Application to Management...'
                    : 'Submit Application to Agency Manager & Owner'}
                </span>
              </button>

              <div className="text-center pt-2 text-xs text-stone-500">
                Already an authorized agent?{' '}
                <Link to="/login" className="font-bold text-primary-700 hover:underline">
                  Sign In to Agent Portal
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

