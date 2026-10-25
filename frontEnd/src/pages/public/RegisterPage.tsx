import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  Mail,
  Lock,
  User,
  Phone,
  Tag,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Edit3,
  ShieldCheck,
  Sparkles,
  Building2,
  Briefcase,
  Luggage,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { initiateRegistration, confirmRegistration, resendRegistrationCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step: 1 = Initial Details, 2 = Verify Email Referral Code
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Form Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hasAgentCode, setHasAgentCode] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Step 2 Form Data (The Second Form)
  const [emailCode, setEmailCode] = useState('');
  const [simulationCode, setSimulationCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIp, setBlockedIp] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('https://app.brevo.com/security/authorised_ips');
  const [isRealSent, setIsRealSent] = useState(false);

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Auto-fill referred by code from URL query ?ref=...
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setHasAgentCode(true);
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Submit Details & Trigger Referral Code Dispatch to User's Email
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (hasAgentCode && !referralCode.trim()) {
      setError('Agent Referral Code is mandatory when registering through a Travel Agent. If you are exploring on your own, please select "Direct Traveler".');
      return;
    }

    setLoading(true);

    try {
      const res: any = await initiateRegistration({
        name,
        email,
        password,
        phone: phone ? phone.trim() : undefined,
        role: 'CLIENT',
        referral_code: hasAgentCode && referralCode ? referralCode.toUpperCase().trim() : undefined,
      });

      setSuccessMsg(res.message || 'Verification activation code sent to your email.');
      if (res.simulationCode) {
        setSimulationCode(res.simulationCode);
      }
      if (res.ipBlocked) {
        setIpBlocked(true);
        setBlockedIp(res.blockedIp || '196.188.252.99');
        if (res.authUrl) setAuthUrl(res.authUrl);
      } else if (res.isRealSent) {
        setIsRealSent(true);
      }
      setResendCooldown(30);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate registration. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: The New Second Form - Submit Referral Code from Email to Gain Access
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await confirmRegistration(email, emailCode.toUpperCase().trim());
      // Navigate to the user's role page
      if (user.roles?.includes('AGENT')) {
        navigate('/dashboard/agent');
      } else {
        navigate('/dashboard/client');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired referral code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Referral Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res: any = await resendRegistrationCode(email);
      setSuccessMsg(res.message || 'A fresh referral code was sent to your email.');
      if (res.simulationCode) {
        setSimulationCode(res.simulationCode);
      }
      if (res.ipBlocked) {
        setIpBlocked(true);
        setBlockedIp(res.blockedIp || '196.188.252.99');
      } else if (res.isRealSent) {
        setIsRealSent(true);
      }
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-stone-50/60">
      <div className="relative z-10 max-w-lg w-full space-y-6 bg-white p-7 sm:p-9 rounded-3xl shadow-xl border border-stone-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-700 via-primary-600 to-amber-500 items-center justify-center text-white shadow-lg shadow-primary-700/20 mb-1">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {step === 1 ? 'Create Traveler Account' : 'Verify Your Email'}
          </h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {step === 1
              ? 'Join ASK Tours to reserve Ethiopian expeditions, access seasonal itineraries, and manage bookings.'
              : 'Enter the 6-character activation code sent to your email to verify and access your account.'}
          </p>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex items-center justify-center gap-3 pt-1 pb-2">
          <div
            onClick={() => step === 2 && setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              step === 1
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Your Information</span>
          </div>

          <div className="w-8 h-0.5 bg-stone-200" />

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              step === 2
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 text-stone-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">2</span>
            <span>Enter Email Code</span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ========================================================
            STEP 1: FILL FULL NAME, EMAIL & DETAILS
            ======================================================== */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {/* Traveler Badge (Replacing amateur role switcher) */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-primary-50/80 border border-primary-200/60 text-primary-950 text-xs font-semibold">
              <div className="h-7 w-7 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                <Luggage className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-stone-900 block">Traveler & Expedition Membership</span>
                <span className="text-[11px] text-stone-500 font-normal">Personal travel account for browsing, booking & support</span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abduselam Ibrahim"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="traveler@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0911223344"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">Used for travel expedition alerts and coordination.</span>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-stone-400">At least 8 chars with uppercase, lowercase, & number.</p>
            </div>

            {/* Registration Mode: Direct vs Agent-Referred */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-stone-700">
                How are you registering today?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasAgentCode(false);
                    setReferralCode('');
                    if (error) setError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    !hasAgentCode
                      ? 'border-primary-600 bg-primary-50 text-primary-900 ring-1 ring-primary-500 font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-primary-700" />
                    <span>Direct Traveler</span>
                  </div>
                  <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                    Self-access (No code needed)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasAgentCode(true);
                    if (error) setError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    hasAgentCode
                      ? 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500 font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>Referred by Agent</span>
                  </div>
                  <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                    Attach agent referral code
                  </span>
                </button>
              </div>

              {hasAgentCode ? (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-800 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>Agent Referral Code</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-700">Mandatory</span>
                  </div>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-amber-600 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase());
                        if (error) setError(null);
                      }}
                      placeholder="e.g. AGT-XXXXXX or ETHIOPIA10"
                      maxLength={16}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-mono font-bold uppercase tracking-wider text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Enter the single-use dynamic code or agent referral code sent to your email.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-[10px] text-stone-500 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Direct traveler: You are booking on your own. No referral code required.</span>
                </div>
              )}
            </div>

            {/* Step 1 Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-600 py-3 text-xs font-bold text-white shadow-md shadow-primary-600/30 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Sending Verification Code...' : 'Continue: Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ========================================================
            STEP 2: THE NEW SECOND FORM - ENTER REFERRAL CODE
            ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            
            {/* Informational Email Banner */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">Recipient Email:</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 font-semibold text-primary-700 hover:underline"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Details</span>
                </button>
              </div>
              <div className="font-mono text-xs font-bold text-stone-800 bg-white px-3 py-1.5 rounded-lg border border-stone-200 truncate">
                {email}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                We have generated and dispatched your 6-character <strong>Security Verification Code</strong> to the email above. Please inspect your inbox and enter it below.
              </p>
            </div>

            {/* Real Delivery Notification */}
            {isRealSent && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Real Email Dispatched via Brevo!</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    A real transactional message has been transmitted to <strong className="font-mono">{email}</strong>. Please check your inbox (and spam/promotions tab).
                  </p>
                </div>
              </div>
            )}

            {/* Brevo IP Whitelist Notice (Explains why live email delivery was restricted) */}
            {ipBlocked && (
              <div className="rounded-2xl bg-amber-50/90 border-2 border-amber-300 p-4 space-y-2.5 text-xs text-amber-950 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Real Email Delivery Blocked by Brevo IP Security</span>
                </div>
                <p className="leading-relaxed text-amber-900 text-xs">
                  Brevo detected that your outbound IP (<strong className="font-mono font-bold">{blockedIp || '196.188.252.99'}</strong>) has not been authorized in your Brevo account yet, so Brevo blocked live external delivery.
                </p>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 space-y-1.5 text-[11px]">
                  <div className="font-bold text-stone-900">To allow real emails to hit your inbox (takes 10 seconds):</div>
                  <ol className="list-decimal pl-4 space-y-1 text-stone-700">
                    <li>
                      Open Brevo Authorized IPs:{' '}
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-700 underline font-bold"
                      >
                        {authUrl}
                      </a>
                    </li>
                    <li>
                      Click <strong>"Deactivate blocking"</strong> (or add IP <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold text-stone-900">{blockedIp || '196.188.252.99'}</code>)
                    </li>
                    <li>
                      Alternatively, check the verification email that Brevo sent to <strong>npath254@gmail.com</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Demo Simulation Helper Badge (Ensures seamless testing) */}
            {simulationCode && (
              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Your Verification Code: <strong className="font-mono font-bold tracking-wider">{simulationCode}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailCode(simulationCode)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors shrink-0 shadow-sm"
                >
                  Fill Code
                </button>
              </div>
            )}

            {/* The Verification Code Input Field */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 text-center">
                Enter Verification Code from Email
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-amber-600 absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ASK-729401"
                  maxLength={16}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50/20 text-center font-mono text-base font-extrabold tracking-widest text-stone-900 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all uppercase"
                />
              </div>
              <p className="text-[11px] text-stone-400 text-center mt-1.5">
                The code is case-insensitive.
              </p>
            </div>

            {/* Step 2 Submit Button */}
            <button
              type="submit"
              disabled={loading || !emailCode.trim()}
              className="w-full rounded-2xl bg-amber-600 py-3.5 text-xs font-bold text-white shadow-md shadow-amber-600/30 hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Verifying Code...' : 'Verify Code & Access Account'}</span>
            </button>

            {/* Resend and Navigation Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-stone-500 hover:text-stone-800 font-medium transition-colors"
              >
                ← Change Email or Details
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || resending}
                className="flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>
                  {resending
                    ? 'Resending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Email Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer & Partner Agent Sign In Link */}
        <div className="space-y-3 pt-2 text-center text-xs text-stone-500">
          <div>
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary-700 hover:underline">
              Sign In here
            </Link>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Authorized Travel Agent?</span>
            <Link to="/login" className="font-bold text-amber-700 hover:underline flex items-center gap-1">
              <span>Partner Agent Portal Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
