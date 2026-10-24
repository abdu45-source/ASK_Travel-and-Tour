import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  Users,
  Clock,
  XCircle,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  DollarSign,
  TrendingUp,
  History,
  QrCode,
  Building2,
  Smartphone,
  ArrowRight,
  Printer,
  ShieldCheck,
  BadgeCheck,
  X,
  Loader2,
  UserPlus,
  MessageSquare,
  Search,
  Filter,
  AlertTriangle,
  Mail,
  Phone,
  Send,
  Calendar,
  MapPin,
  Sparkles,
  ChevronRight,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import { PipelineStats, PipelineRequest, PipelineClient, MessageItem } from '../../types';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Pipeline Filter & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DAILY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Register Client Modal State
  const [isRegisterClientOpen, setIsRegisterClientOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Email Referral Code to Client Modal State
  const [isEmailInviteOpen, setIsEmailInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Manager Support Chat Modal / Drawer State
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ethiopian Bank Disbursement / Payout State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutBank, setPayoutBank] = useState<'CBE' | 'TELEBIRR' | 'AWASH'>('CBE');
  const [payoutAccount, setPayoutAccount] = useState('1000123456789');
  const [payoutAmount, setPayoutAmount] = useState<number>(1000);
  const [payoutStep, setPayoutStep] = useState<'FORM' | 'ROUTING' | 'SUCCESS'>('FORM');
  const [payoutVoucher, setPayoutVoucher] = useState<any | null>(null);

  const fetchAgentData = async () => {
    try {
      const [pipeRes, wallRes] = await Promise.all([
        api.get('/agents/my-pipeline'),
        api.get('/wallet'),
      ]);
      setPipeline(pipeRes.data);
      setWallet(wallRes.data);
      if (wallRes.data?.walletBalance) {
        setPayoutAmount(Math.min(2000, Number(wallRes.data.walletBalance)));
      }
    } catch (err) {
      console.error('Failed to load agent pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, []);

  const referralCode = pipeline?.referralCode || user?.agentProfile?.referral_code || 'ETHIOPIA10';
  const referralUrl = `${window.location.origin}/register?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Dynamic Referral Code Handlers
  const handleGenerateDynamicCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await api.post('/agents/generate-dynamic-code');
      await fetchAgentData();
      return res.data;
    } catch (err) {
      console.error('Failed to generate dynamic code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleSendClientReferralEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setSendingInvite(true);

    try {
      const res = await api.post('/agents/send-referral-email', {
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        personalNote: inviteNote.trim() || undefined,
      });

      setInviteSuccess(
        res.data.message ||
          `One-time dynamic referral code ${res.data.code} has been dispatched to ${inviteEmail}!`
      );
      setInviteEmail('');
      setInviteName('');
      setInviteNote('');
      await fetchAgentData();
    } catch (err: any) {
      setInviteError(
        err.response?.data?.message ||
          'Failed to dispatch referral email to client. Please check the email address.'
      );
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendReferralEmail = async (codeId: string) => {
    setResendingId(codeId);
    try {
      const res = await api.post(`/agents/resend-referral-email/${codeId}`);
      alert(res.data.message || 'Invitation email successfully resent to client!');
      await fetchAgentData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend invitation email.');
    } finally {
      setResendingId(null);
    }
  };

  // 1. Direct Client Registration by Agent
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    setRegistering(true);

    try {
      const res = await api.post('/auth/register-initiate', {
        name: clientName.trim(),
        email: clientEmail.toLowerCase().trim(),
        phone: clientPhone ? clientPhone.trim() : undefined,
        password: 'Client@2026!',
        role: 'CLIENT',
        referral_code: referralCode,
      });

      setRegisterSuccess(
        `Client "${clientName}" registered successfully! A referral verification code has been dispatched to ${clientEmail}. They are permanently bound to your agent profile.`
      );
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      await fetchAgentData();
    } catch (err: any) {
      setRegisterError(err.response?.data?.message || 'Failed to register client. Please check details.');
    } finally {
      setRegistering(false);
    }
  };

  // 2. Open Manager Chat (Optionally with booking dispute context)
  const handleOpenManagerChat = async (disputeContext?: string) => {
    setIsManagerChatOpen(true);
    setChatLoading(true);
    if (disputeContext) {
      setChatInput(disputeContext);
    }

    try {
      const res = await api.post('/conversations/agent-manager');
      const convId = res.data.id;
      setConversationId(convId);

      const msgRes = await api.get(`/conversations/${convId}/messages`);
      setChatMessages(msgRes.data.items || []);

      const s = getSocket();
      s.emit('join:conversation', { conversationId: convId });

      s.off('message:new');
      s.on('message:new', (msg: MessageItem) => {
        if (msg.conversation_id === convId) {
          setChatMessages((prev) => [...prev, msg]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      });

      s.off('typing:status');
      s.on('typing:status', (data: { userId: string; isTyping: boolean }) => {
        if (data.userId !== user?.id) {
          setIsTyping(data.isTyping);
        }
      });

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to open manager chat:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !conversationId) return;

    const s = getSocket();
    s.emit('message:send', {
      conversationId,
      body: chatInput.trim(),
    });

    setChatInput('');
  };

  // 3. Payout Simulation (Real Ethiopian Banking Appearance)
  const handleOpenPayout = () => {
    setIsPayoutModalOpen(true);
    setPayoutStep('FORM');
    const bal = Number(wallet?.walletBalance || 0);
    setPayoutAmount(bal > 0 ? Math.min(2000, bal) : 500);
  };

  const handleConfirmPayout = () => {
    setPayoutStep('ROUTING');
    setTimeout(() => {
      const voucherRef =
        payoutBank === 'CBE'
          ? `CBE-PAYOUT-${Math.floor(100000 + Math.random() * 900000)}`
          : payoutBank === 'TELEBIRR'
          ? `TB-PAYOUT-${Math.floor(100000 + Math.random() * 900000)}`
          : `AWA-DISB-${Math.floor(100000 + Math.random() * 900000)}`;

      const voucher = {
        voucherRef,
        bank:
          payoutBank === 'CBE'
            ? 'Commercial Bank of Ethiopia (CBE)'
            : payoutBank === 'TELEBIRR'
            ? 'Ethio Telecom Telebirr Partner Gateway'
            : 'Awash International Bank',
        account: payoutAccount,
        beneficiary: user?.name || 'Dawit Haile (Partner Agent)',
        amount: payoutAmount,
        currency: 'ETB',
        fee: 0,
        settledAt: new Date().toISOString(),
        authCode: 'ET-SWITCH-' + Math.floor(1000 + Math.random() * 9000),
      };

      setPayoutVoucher(voucher);
      setPayoutStep('SUCCESS');
      setWallet((prev: any) => ({
        ...prev,
        walletBalance: Math.max(0, Number(prev?.walletBalance || 0) - payoutAmount),
      }));
    }, 1500);
  };

  // Filter Pipeline Requests
  const requestsList = pipeline?.requests || [];
  const filteredRequests = requestsList.filter((req) => {
    const matchesSearch =
      req.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.destinationTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.bookingRef.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return req.status === 'PENDING';
    if (activeTab === 'APPROVED') return req.status === 'APPROVED';
    if (activeTab === 'REJECTED') return req.status === 'REJECTED';
    if (activeTab === 'DAILY') return req.isDailyRegistered;
    return true;
  });

  // Recent Financial Notification
  const recentCommission = wallet?.transactions?.find(
    (tx: any) => tx.type === 'COMMISSION_CREDIT'
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-stone-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 rounded-3xl bg-stone-200" />
          <div className="h-32 rounded-3xl bg-stone-200" />
          <div className="h-32 rounded-3xl bg-stone-200" />
          <div className="h-32 rounded-3xl bg-stone-200" />
        </div>
        <div className="h-96 rounded-3xl bg-stone-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Financial Notification Dispatch Banner */}
      {recentCommission && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50 to-stone-50 border border-amber-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Instant Commission Credit Notification
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  <BadgeCheck className="w-3 h-3" /> Settled
                </span>
              </div>
              <p className="text-xs text-stone-700 mt-0.5">
                Earned <strong className="text-emerald-700 font-bold">+{Number(recentCommission.amount).toFixed(2)} ETB</strong> (10% Automated Commission) on {recentCommission.reference}.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-stone-500 block">
              {new Date(recentCommission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(recentCommission.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-600 block mb-1">
            Travel Agent Hub · Sales & Referral Partner
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Client Pipeline & Commission Wallet
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Auto-generate unique referral codes, track client lifecycle in real-time, and chat directly with Agency Managers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setIsEmailInviteOpen(true);
              setInviteError(null);
              setInviteSuccess(null);
            }}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email Dynamic Code</span>
          </button>

          <button
            onClick={() => {
              setIsRegisterClientOpen(true);
              setRegisterError(null);
              setRegisterSuccess(null);
            }}
            className="rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-primary-600/20 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Client</span>
          </button>

          <button
            onClick={() => handleOpenManagerChat()}
            className="rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 px-4 py-2.5 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Manager Support & Dispute</span>
          </button>
        </div>
      </div>

      {/* Top 4 Pipeline Counters (FR-AGT / SRS 6.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setActiveTab('DAILY')}
          className={`cursor-pointer rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${
            activeTab === 'DAILY' ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-400/40' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Daily Registered</p>
              <h3 className="text-3xl font-bold text-stone-900 mt-1">
                {pipeline?.dailyRegistered || 0}
              </h3>
              <span className="text-[10px] text-primary-700 font-semibold">Clients registered today</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('PENDING')}
          className={`cursor-pointer rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${
            activeTab === 'PENDING' ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Pending Approval</p>
              <h3 className="text-3xl font-bold text-amber-700 mt-1">
                {pipeline?.pendingApproval || 0}
              </h3>
              <span className="text-[10px] text-stone-400">Moderation in progress</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`cursor-pointer rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${
            activeTab === 'APPROVED' ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/40' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Approved Bookings</p>
              <h3 className="text-3xl font-bold text-emerald-700 mt-1">
                {pipeline?.approved || 0}
              </h3>
              <span className="text-[10px] text-emerald-600 font-semibold">10% Commission Earned</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`cursor-pointer rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${
            activeTab === 'REJECTED' ? 'bg-red-50 border-red-500 ring-2 ring-red-400/40' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase">Rejected Requests</p>
              <h3 className="text-3xl font-bold text-stone-800 mt-1">
                {pipeline?.rejected || 0}
              </h3>
              <span className="text-[10px] text-stone-400">Click to review comments</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link & Wallet Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Referral Card (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-950 to-primary-950 text-white p-7 sm:p-8 shadow-xl flex flex-col justify-between border border-stone-800">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                <Share2 className="w-3.5 h-3.5" />
                <span>Dynamic One-Time Referral Engine</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3" />
                <span>Single-Use Protected</span>
              </div>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              Dynamic Referral Codes & 10% Commission
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
              Each generated code is single-use and dynamic. Dispatch directly to prospective travelers by email, or share your active activation link. Once a traveler completes registration with the code, it is marked <strong>CLAIMED</strong> and they are permanently bound to your agent profile for automated 10% commission fee on approved bookings.
            </p>
          </div>

          <div className="mt-8 space-y-4 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-auto flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">Dynamic Code:</span>
                <span className="font-mono font-bold text-lg text-white tracking-wider">{referralCode}</span>
              </div>

              <div className="flex-1 w-full flex items-center justify-between bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-xs text-stone-300 truncate">
                <span className="truncate">{referralUrl}</span>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto rounded-2xl bg-amber-500 px-5 py-3 text-xs font-bold text-stone-950 hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg"
              >
                {copied ? <Check className="w-4 h-4 text-stone-950" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleGenerateDynamicCode}
                  disabled={generatingCode}
                  className="rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3.5 py-2 text-xs font-bold border border-white/15 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingCode ? 'animate-spin text-amber-300' : 'text-stone-300'}`} />
                  <span>Generate Fresh Dynamic Code</span>
                </button>

                <button
                  onClick={() => {
                    setIsEmailInviteOpen(true);
                    setInviteError(null);
                    setInviteSuccess(null);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Code to Client</span>
                </button>
              </div>

              <span className="text-[11px] text-stone-400">
                Single-use policy: 1 code per traveler registration
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-stone-400 pt-2 border-t border-white/5">
              <span>Dynamic Codes Generated: <strong className="text-white">{pipeline?.dynamicCodes?.length || 0}</strong></span>
              <span>Referred Clients: <strong className="text-white">{pipeline?.totalClients || 0}</strong></span>
              <span>Automated Commission: <strong className="text-amber-300">10% on Booking</strong></span>
              <span>Manager Commission: <strong className="text-stone-400">0 ETB</strong></span>
            </div>
          </div>
        </div>

        {/* Wallet Balance Card (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-stone-200 p-7 sm:p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                My Commission Wallet
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div>
              <span className="text-3xl sm:text-4xl font-bold text-stone-900">
                {Number(wallet?.walletBalance || 0).toLocaleString()} <span className="text-sm font-normal text-stone-500">ETB</span>
              </span>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Available for Instant Payout Request</p>
            </div>

            <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100 text-xs text-stone-600 space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Bank Account on File</span>
              <p className="font-semibold text-stone-800">
                {user?.agentProfile?.payout_details || 'Commercial Bank of Ethiopia (CBE)'}
              </p>
            </div>

            <button
              onClick={handleOpenPayout}
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Request Bank Disbursement (CBE / Telebirr)</span>
            </button>
          </div>

          <div className="pt-6 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Settled directly via National Bank of Ethiopia RTGS.</span>
            <span className="font-mono text-[10px] text-emerald-700 font-bold">Fee: 0.00 ETB</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          CLIENT PIPELINE TRACKING (SRS 6.2 / FR-AGT)
          Real-time tracking of Daily Registered, Pending Approval,
          Approved, and Rejected client requests
          ======================================================== */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Client Pipeline Tracking Ledger
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time pipeline monitoring for client bookings, commission earnings, and moderation status.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, tour, or ref..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-stone-50/50"
            />
          </div>
        </div>

        {/* Tab Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Requests ({requestsList.length})
          </button>

          <button
            onClick={() => setActiveTab('DAILY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DAILY'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
            }`}
          >
            Daily Registered Clients ({pipeline?.dailyRegistered || 0})
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending Approval ({pipeline?.pendingApproval || 0})
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Approved · 10% Earned ({pipeline?.approved || 0})
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'REJECTED'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Rejected ({pipeline?.rejected || 0})
          </button>
        </div>

        {/* Requests Cards List */}
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-8 space-y-3">
            <Users className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="font-bold text-sm text-stone-700">No Pipeline Requests Found</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {activeTab === 'DAILY'
                ? 'No clients have registered today under your referral link yet.'
                : activeTab === 'PENDING'
                ? 'No client bookings currently pending moderation.'
                : activeTab === 'REJECTED'
                ? 'Great news! There are no rejected client requests.'
                : 'Use your referral link or the "Register New Client" button above to onboard your travelers.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((req) => {
              const isApproved = req.status === 'APPROVED';
              const isPending = req.status === 'PENDING';
              const isRejected = req.status === 'REJECTED';

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border p-5 transition-all space-y-4 ${
                    isApproved
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isRejected
                      ? 'border-red-200 bg-red-50/20'
                      : isPending
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center font-bold text-stone-700">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 text-sm">{req.destinationTitle}</h4>
                          <span className="font-mono text-[10px] text-stone-400 font-bold">
                            #{req.bookingRef}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          Client: <strong className="text-stone-800">{req.clientName}</strong> ({req.clientEmail})
                          {req.clientPhone && req.clientPhone !== 'Not provided' && ` • ${req.clientPhone}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.isDailyRegistered && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-800">
                          New Today
                        </span>
                      )}

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isRejected
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & 10% Commission Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-stone-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Scheduled Date</span>
                      <span className="font-semibold text-stone-800 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {req.travelDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Travelers</span>
                      <span className="font-semibold text-stone-800 mt-0.5 block">{req.travelers} Pax</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Total Booking Price</span>
                      <span className="font-bold text-stone-900 mt-0.5 block">{req.totalPrice.toLocaleString()} ETB</span>
                    </div>

                    <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/50">
                      <span className="text-[10px] text-amber-900 block uppercase font-bold">
                        10% Partner Commission
                      </span>
                      <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                        +{req.commissionAmount.toFixed(2)} ETB
                      </span>
                    </div>
                  </div>

                  {/* Rejection / Manager Comment Banner (Dispute Trigger) */}
                  {req.managerComment && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-start justify-between gap-3 ${
                        isRejected
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-stone-50 border border-stone-200 text-stone-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isRejected ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold block text-[11px]">
                            Agency Manager Administrative Comment:
                          </span>
                          <p className="mt-0.5 leading-relaxed">{req.managerComment}</p>
                        </div>
                      </div>

                      {/* Dispute / Discuss with Manager Button */}
                      <button
                        onClick={() =>
                          handleOpenManagerChat(
                            `Hello Manager, I would like guidance/dispute regarding rejected booking #${req.bookingRef} for client ${req.clientName} (${req.destinationTitle}). Reason given: "${req.managerComment}". Could we adjust details or reconsider?`
                          )
                        }
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-[11px] shadow-sm flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        <span>Dispute / Discuss</span>
                      </button>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>Logged in pipeline: {new Date(req.createdAt).toLocaleDateString()}</span>
                    {!req.managerComment && (
                      <button
                        onClick={() =>
                          handleOpenManagerChat(
                            `Hello Manager, inquiring about client request #${req.bookingRef} (${req.destinationTitle}) for client ${req.clientName}.`
                          )
                        }
                        className="text-primary-700 hover:underline font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat with Manager</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          DYNAMIC REFERRAL CODES & EMAIL DISPATCH LEDGER
          ======================================================== */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Dynamic Referral Codes & Email Dispatches
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Single-use dynamic codes generated for prospective travelers. Codes transition from <strong className="text-amber-600">PENDING</strong> to <strong className="text-emerald-600">CLAIMED</strong> once the client registers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleGenerateDynamicCode}
              disabled={generatingCode}
              className="rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingCode ? 'animate-spin text-amber-600' : 'text-stone-600'}`} />
              <span>Generate Dynamic Code</span>
            </button>

            <button
              onClick={() => {
                setIsEmailInviteOpen(true);
                setInviteError(null);
                setInviteSuccess(null);
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Code to Client</span>
            </button>
          </div>
        </div>

        {/* Dynamic Codes List / Table */}
        {!pipeline?.dynamicCodes || pipeline.dynamicCodes.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-6 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-stone-700">No Dynamic Codes Generated Yet</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Click <strong>"Email Code to Client"</strong> above to enter a traveler's email. The system will dynamically generate a unique single-use code and send a real invitation email via Brevo / SMTP!
            </p>
            <button
              onClick={() => {
                setIsEmailInviteOpen(true);
                setInviteError(null);
                setInviteSuccess(null);
              }}
              className="rounded-xl bg-emerald-600 text-white font-bold px-4 py-2 text-xs hover:bg-emerald-700 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Dispatch First Client Email</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400 font-bold bg-stone-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Dynamic Code</th>
                  <th className="py-3 px-4">Recipient Traveler</th>
                  <th className="py-3 px-4">Personal Note</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Lifecycle State</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-normal">
                {pipeline.dynamicCodes.map((d) => {
                  const isClaimed = d.status === 'CLAIMED';
                  const isActive = d.status === 'ACTIVE';
                  const directUrl = `${window.location.origin}/register?ref=${d.code}`;

                  return (
                    <tr key={d.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-900 font-mono font-bold tracking-wider">
                            {d.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {d.clientEmail ? (
                          <div>
                            <p className="font-bold text-stone-900">{d.clientName || 'Valued Traveler'}</p>
                            <span className="text-[11px] text-stone-500 font-mono">{d.clientEmail}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Direct Share Link (No email bound)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-stone-600">
                        {d.personalNote ? (
                          <span title={d.personalNote} className="truncate block">
                            "{d.personalNote}"
                          </span>
                        ) : (
                          <span className="text-stone-300 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {d.clientEmail ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700">
                              <Send className="w-3 h-3 text-emerald-600" />
                              Dispatched ({d.sentCount}x)
                            </span>
                            <span className="text-[10px] text-stone-400 block">
                              {d.lastSentAt ? new Date(d.lastSentAt).toLocaleDateString() : new Date(d.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Manual Share</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Claimed & Registered
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Active · Pending Use
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                            Expired
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(directUrl);
                              alert(`Copied activation link: ${directUrl}`);
                            }}
                            title="Copy Direct Registration Link"
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {isActive && d.clientEmail && (
                            <button
                              onClick={() => handleResendReferralEmail(d.id)}
                              disabled={resendingId === d.id}
                              title="Resend Invitation Email"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {resendingId === d.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Mail className="w-3 h-3" />
                              )}
                              <span>Resend</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wallet Ledger Transactions & Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ledger */}
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary-600" />
              <h4 className="font-serif text-lg font-bold text-stone-900">Wallet Ledger History</h4>
            </div>
            <span className="text-[10px] font-mono text-stone-400">Append-Only</span>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {!wallet?.transactions || wallet.transactions.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              wallet.transactions.map((tx: any) => {
                const isCredit = Number(tx.amount) > 0;
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-800">{tx.reference || tx.type}</p>
                      <span className="text-[10px] text-stone-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-stone-800'}`}>
                        {isCredit ? '+' : ''}{Number(tx.amount).toFixed(2)} ETB
                      </p>
                      <span className="text-[10px] text-stone-400">
                        Bal: {Number(tx.balance_after).toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Referred Clients Roster */}
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              <h4 className="font-serif text-lg font-bold text-stone-900">Referred Clients Roster</h4>
            </div>
            <span className="text-xs font-bold text-stone-500">
              {pipeline?.clients?.length || 0} Registered
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {!pipeline?.clients || pipeline.clients.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                Share your referral link or use "Register New Client" to onboard your first traveler!
              </p>
            ) : (
              pipeline.clients.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-stone-900">{c.name}</p>
                      {c.isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-100 text-primary-800">
                          Registered Today
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400">{c.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL 1: REGISTER NEW CLIENT DIRECTLY
          ======================================================== */}
      {isRegisterClientOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900">
                    Register Client Under Your Code
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Partner Referral Code: <strong className="font-mono text-primary-700">{referralCode}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterClientOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{registerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterClient} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Client Full Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Almaz Kebede"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Client Email Address</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  The client will receive an activation email with their confirmation code.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Client Phone (Optional)</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0911223344"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/60 text-amber-900 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Automated 10% Attribution Guarantee
                </span>
                <p>
                  This client will be permanently linked to your agent profile. When they book and get approved, 10% of their booking price will be automatically deposited in your wallet.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterClientOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 shadow-md shadow-primary-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {registering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: INTEGRATED MANAGER SUPPORT & DISPUTE CHAT
          Direct real-time communication channel with Agency Managers
          ======================================================== */}
      {isManagerChatOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full h-[580px] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-white">
                    Agency Manager Support & Dispute Channel
                  </h4>
                  <p className="text-[11px] text-amber-300">
                    Direct Line for Guidance, Tour Moderation & Disputes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManagerChatOpen(false)}
                className="text-white/80 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50 text-xs">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="p-4 text-center rounded-2xl bg-amber-50/60 border border-amber-200/50 m-2 space-y-1">
                  <p className="font-bold text-stone-800">
                    Welcome to the Agency Manager Channel!
                  </p>
                  <p className="text-[11px] text-stone-600">
                    Ask questions about client bookings, request approval guidance, or resolve rejected request disputes directly with operations.
                  </p>
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-stone-400 mb-1 px-1">
                        {isMe ? 'You (Partner Agent)' : m.sender?.name || 'Agency Manager'}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-amber-600 text-white rounded-br-none'
                            : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}

              {isTyping && (
                <div className="text-[11px] text-stone-400 italic px-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                  <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span>Manager is typing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your dispute or inquiry for the Agency Manager..."
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white p-2.5 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: ETHIOPIAN BANK COMMISSION DISBURSEMENT
          ======================================================== */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-50 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900">
                    Partner Commission Disbursement
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    National Bank of Ethiopia RTGS Direct Wire
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutStep === 'SUCCESS' && payoutVoucher ? (
              /* Official Bank Disbursement Advice Voucher */
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h5 className="font-serif text-lg font-bold text-emerald-950">
                    Bank Disbursement Confirmed!
                  </h5>
                  <p className="text-xs text-emerald-800">
                    Funds successfully wired to your verified Ethiopian bank account.
                  </p>
                </div>

                {/* Bank Advice Voucher Slip */}
                <div className="rounded-2xl bg-white border border-stone-200 p-4 space-y-3 font-mono text-xs shadow-sm">
                  <div className="text-center border-b border-dashed border-stone-200 pb-2 space-y-0.5">
                    <span className="font-serif font-bold text-xs uppercase tracking-wider block text-stone-900">
                      ELECTRONIC FUNDS TRANSFER ADVICE
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      EthSwitch National Payment System (NPS)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Voucher Ref:</span>
                      <span className="font-bold text-stone-900">{payoutVoucher.voucherRef}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Disbursement Date:</span>
                      <span className="font-bold text-stone-900">{new Date(payoutVoucher.settledAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Beneficiary Name:</span>
                      <span className="font-bold text-stone-900">{payoutVoucher.beneficiary}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Settlement Channel:</span>
                      <span className="font-bold text-stone-900">{payoutVoucher.bank}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-400 block text-[10px]">Account / Wallet ID:</span>
                      <span className="font-bold text-stone-900">{payoutVoucher.account}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-stone-200 pt-2 flex items-center justify-between text-stone-900">
                    <span className="font-bold">Disbursed Amount:</span>
                    <span className="text-sm font-bold text-emerald-700">{payoutVoucher.amount.toLocaleString()} ETB</span>
                  </div>

                  <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-[10px] text-stone-400">
                    <span>Approval Code: {payoutVoucher.authCode}</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Status: SETTLED IN ACCOUNT
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 py-2.5 text-xs font-bold text-stone-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Voucher
                  </button>
                  <button
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : payoutStep === 'ROUTING' ? (
              /* Bank Routing Simulator */
              <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <h5 className="font-serif text-base font-bold text-stone-900">
                  Routing via EthSwitch Inter-Bank Switch...
                </h5>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Authorizing debit of {payoutAmount.toLocaleString()} ETB to {payoutBank} account {payoutAccount}.
                </p>
              </div>
            ) : (
              /* Payout Request Form */
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-stone-100 p-3.5 flex items-center justify-between border border-stone-200">
                  <span className="text-stone-600 font-medium">Available Wallet Balance:</span>
                  <span className="font-serif font-bold text-base text-stone-900">
                    {Number(wallet?.walletBalance || 0).toLocaleString()} ETB
                  </span>
                </div>

                {/* Bank Selector */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">
                    Select Ethiopian Payout Channel
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutBank('CBE')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        payoutBank === 'CBE'
                          ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-400 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4 mx-auto mb-1 text-purple-700" />
                      CBE Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutBank('TELEBIRR')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        payoutBank === 'TELEBIRR'
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-400 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 mx-auto mb-1 text-cyan-700" />
                      Telebirr
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutBank('AWASH')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        payoutBank === 'AWASH'
                          ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-400 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                      Awash Bank
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {payoutBank === 'TELEBIRR' ? 'Telebirr Mobile Number' : 'Bank Account Number'}
                  </label>
                  <input
                    type="text"
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    placeholder="1000123456789"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-700">Withdrawal Amount (ETB)</label>
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(Number(wallet?.walletBalance || 0))}
                      className="text-[10px] text-emerald-700 hover:underline font-bold"
                    >
                      Withdraw Full Balance
                    </button>
                  </div>
                  <input
                    type="number"
                    min={100}
                    max={Number(wallet?.walletBalance || 999999)}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                    <span>Transfer Network Fee: <strong className="text-emerald-700">0.00 ETB (Free)</strong></span>
                    <span>Estimated Settlement: <strong className="text-stone-800">Instant (RTGS)</strong></span>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-200 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayout}
                    disabled={payoutAmount <= 0}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Disburse {payoutAmount.toLocaleString()} ETB</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: EMAIL DYNAMIC REFERRAL CODE TO CLIENT
          Dispatches real email with dynamic one-time code to traveler
          ======================================================== */}
      {isEmailInviteOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900">
                    Email Dynamic Referral Code
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Generate single-use code & email to traveler
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailInviteOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">Email Successfully Dispatched!</p>
                  <p className="mt-0.5">{inviteSuccess}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSendClientReferralEmail} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Client Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="traveler@example.com"
                    className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  A fresh, one-time referral code (AGT-XXXXXX) will be generated and dispatched to this address.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Client Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Almaz Kebede"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Personal Welcome Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="e.g. Hi Almaz! Excited to help you plan your Ethiopian tour. Use this code when registering."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/60 text-amber-900 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Real Email Delivery with 1-Click Activation Link
                </span>
                <p>
                  The traveler will receive a transactional email containing their unique code and a direct 1-click registration link. Once completed, the code is marked CLAIMED and they are tied to your 10% commission.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailInviteOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Dynamic Referral Code</span>
                    </>
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