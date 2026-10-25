import React, { useState, useEffect } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Users,
  CreditCard,
  RotateCw,
  Plus,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Tag,
  Calendar,
  DollarSign,
  UserPlus,
  ChevronRight,
  Loader2,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { Booking, Agent, BookingStatus } from '../../types';

export const ManagerDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'moderation' | 'all-bookings' | 'reports' | 'clients' | 'agents'
  const [activeTab, setActiveTab] = useState<'moderation' | 'all-bookings' | 'reports' | 'clients' | 'agents'>('moderation');

  // Search & Filter State for All Bookings
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'travelers'>('date');
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Moderation & Comment Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [moderationAction, setModerationAction] = useState<'APPROVE' | 'REJECT' | 'COMMENT' | null>(null);
  const [commentOrReason, setCommentOrReason] = useState('');
  const [processingModeration, setProcessingModeration] = useState(false);

  // New Agent Modal
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentPayout, setAgentPayout] = useState('Commercial Bank of Ethiopia (CBE)');
  const [agentPass, setAgentPass] = useState('Agent@2026!');

  // Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAgentId, setPayoutAgentId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Commercial Bank of Ethiopia (CBE)');
  const [payoutReference, setPayoutReference] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);

  const fetchManagerData = async () => {
    try {
      const [dashRes, pendingRes, allBkgRes, agtRes, cltRes, dailyRes, appRes] = await Promise.all([
        api.get('/dashboard/manager'),
        api.get('/bookings?status=PENDING'),
        api.get('/bookings'),
        api.get('/agents'),
        api.get('/clients'),
        api.get('/reports/daily').catch(() => ({ data: null })),
        api.get('/agents/pending-applications').catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setPendingBookings(pendingRes.data.items || []);
      setAllBookings(allBkgRes.data.items || []);
      setAgents(agtRes.data || []);
      setClients(cltRes.data || []);
      setDailyReport(dailyRes.data);
      setPendingApplications(appRes?.data || []);

      if (agtRes.data?.length > 0 && !payoutAgentId) {
        setPayoutAgentId(agtRes.data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  const handleApproveApplication = async (id: string) => {
    try {
      await api.post(`/agents/pending-applications/${id}/approve`);
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve application');
    }
  };

  const handleRejectApplication = async (id: string) => {
    if (!window.confirm('Are you sure you want to decline this agent application?')) return;
    try {
      await api.post(`/agents/pending-applications/${id}/reject`);
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject application');
    }
  };

  const handleModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !moderationAction) return;

    setProcessingModeration(true);
    try {
      if (moderationAction === 'APPROVE') {
        await api.post(`/bookings/${selectedBooking.id}/approve`, {
          comment: commentOrReason,
        });
      } else if (moderationAction === 'REJECT') {
        if (!commentOrReason.trim()) {
          alert('Reason is required when rejecting a booking.');
          setProcessingModeration(false);
          return;
        }
        await api.post(`/bookings/${selectedBooking.id}/reject`, {
          reason: commentOrReason,
        });
      } else if (moderationAction === 'COMMENT') {
        if (!commentOrReason.trim()) {
          alert('Comment text is required.');
          setProcessingModeration(false);
          return;
        }
        await api.post(`/bookings/${selectedBooking.id}/comment`, {
          comment: commentOrReason,
        });
      }

      setSelectedBooking(null);
      setModerationAction(null);
      setCommentOrReason('');
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setProcessingModeration(false);
    }
  };

  const handleDownloadPdf = async (bookingId: string, filename: string) => {
    setDownloadingPdfId(bookingId);
    try {
      const res = await api.get(`/bookings/${bookingId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download PDF document.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await api.get('/reports/export/excel', { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASK_Manager_Bookings_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export Excel report.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await api.get('/reports/export/pdf', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASK_Manager_Operational_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/agents', {
        name: agentName,
        email: agentEmail,
        phone: agentPhone,
        payout_details: agentPayout,
        password: agentPass,
      });
      setShowNewAgentModal(false);
      setAgentName('');
      setAgentEmail('');
      setAgentPhone('');
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register agent');
    }
  };

  const handleRotateReferral = async (agentId: string) => {
    if (!confirm('Rotate this agent referral code? Previous code will stop accepting new signups.')) return;
    try {
      await api.post(`/agents/${agentId}/rotate-referral`);
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to rotate referral code');
    }
  };

  const handleToggleDeactivate = async (agentId: string) => {
    try {
      await api.post(`/agents/${agentId}/deactivate`);
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingPayout(true);
    try {
      await api.post('/wallet/payout', {
        agent_id: payoutAgentId,
        amount: parseFloat(payoutAmount),
        method: payoutMethod,
        reference: payoutReference,
      });
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutReference('');
      fetchManagerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payout failed');
    } finally {
      setProcessingPayout(false);
    }
  };

  // Filtered and sorted bookings
  const filteredBookings = allBookings
    .filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        b.id.toLowerCase().includes(term) ||
        (b.client?.user?.name || '').toLowerCase().includes(term) ||
        (b.client?.user?.email || '').toLowerCase().includes(term) ||
        (b.destination?.title || '').toLowerCase().includes(term) ||
        (b.agent?.referral_code || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime();
      } else if (sortBy === 'price') {
        return Number(b.total_price) - Number(a.total_price);
      } else {
        return Number(b.travelers) - Number(a.travelers);
      }
    });

  if (loading) {
    return <div className="h-96 rounded-3xl bg-stone-200 animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & KPI Ribbon */}
      <div className="rounded-3xl bg-stone-900 p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
              Agency Operations Management
            </span>
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300">
              Brevo Email Powered
            </span>
          </div>
          <h2 className="font-serif text-3xl font-bold">Manager Operational Command</h2>
          <p className="text-xs text-stone-300 max-w-xl">
            Moderate incoming client reservation requests, review sales reports, monitor new client registrations, track agent referral codes, and export operational datasets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 rounded-2xl bg-stone-800 hover:bg-stone-700 px-4 py-2.5 text-xs font-bold text-stone-200 border border-stone-700 transition-all active:scale-95"
          >
            {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase">Moderation Queue</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">
              {pendingBookings.length}
            </h3>
            <span className="text-[10px] text-stone-400">Awaiting approval / review</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase">New Clients Today</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">
              {data?.newClientsToday || 0}
            </h3>
            <span className="text-[10px] text-emerald-700 font-semibold">Registered today</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase">Sales Today</p>
            <h3 className="text-2xl font-bold text-primary-800 mt-1">
              {Number(data?.salesToday || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </h3>
            <span className="text-[10px] text-stone-400">Approved tour booking value</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase">Partner Network</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">
              {agents.length} Agents
            </h3>
            <span className="text-[10px] text-stone-400">Registered sales partners</span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'moderation'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Inbox className="w-4 h-4 text-amber-400" />
          <span>Request Moderation</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'moderation' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {pendingBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all-bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'all-bookings'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-primary-400" />
          <span>All Bookings Ledger & Search</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
            {allBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'reports'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Sales & Operational Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'clients'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>New Client Registrations</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
            {clients.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'agents'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Agent Network & Referral Codes</span>
        </button>
      </div>

      {/* TAB 1: REQUEST MODERATION */}
      {activeTab === 'moderation' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Booking Request Moderation Queue
              </h3>
              <p className="text-xs text-stone-500">
                Review and moderate pending client tour bookings. Privilege to <strong>Approve</strong>, <strong>Reject</strong>, or attach <strong>Administrative Comments</strong>.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {pendingBookings.length} Requests Pending
            </span>
          </div>

          {pendingBookings.length === 0 ? (
            <div className="text-center py-14 text-stone-400 text-xs space-y-2">
              <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">All Caught Up!</h4>
              <p>No booking requests are currently awaiting moderation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Traveler / Client</th>
                    <th className="py-3 px-4">Destination Circuit</th>
                    <th className="py-3 px-4">Travel Date</th>
                    <th className="py-3 px-4">Pax</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Agent Referral Code</th>
                    <th className="py-3 px-4">Admin Comment</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {pendingBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        #{b.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-stone-900">{b.client?.user?.name || 'Client'}</p>
                        <span className="text-[10px] text-stone-400">{b.client?.user?.phone || b.client?.user?.email}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800">
                        {b.destination?.title}
                      </td>
                      <td className="py-3 px-4">{b.travel_date}</td>
                      <td className="py-3 px-4">{b.travelers} Pax</td>
                      <td className="py-3 px-4 font-bold text-primary-800">
                        {Number(b.total_price).toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4">
                        {b.agent ? (
                          <div>
                            <span className="font-mono bg-primary-50 text-primary-900 border border-primary-200 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                              {b.agent.referral_code}
                            </span>
                            <span className="text-[9px] text-emerald-700 block mt-0.5">
                              +{(Number(b.total_price) * 0.1).toLocaleString()} ETB (10% Comm.)
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[10px] italic">Direct Organic (0 Comm.)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        {b.manager_comment ? (
                          <span className="text-[11px] text-stone-600 line-clamp-2 italic" title={b.manager_comment}>
                            "{b.manager_comment}"
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">No notes</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setModerationAction('APPROVE');
                            setCommentOrReason(b.manager_comment || 'Confirmed with licensed guide and transport rendezvous.');
                          }}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setModerationAction('REJECT');
                            setCommentOrReason('');
                          }}
                          className="rounded-xl bg-stone-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 px-3 py-1.5 font-bold text-[11px] border border-stone-200 transition-all active:scale-95"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setModerationAction('COMMENT');
                            setCommentOrReason(b.manager_comment || '');
                          }}
                          className="rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1.5 font-bold text-[11px] transition-all active:scale-95"
                          title="Attach administrative comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                          Comment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL BOOKINGS LEDGER, SEARCH & DATA EXPORT */}
      {activeTab === 'all-bookings' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                All Bookings & Operational Ledger
              </h3>
              <p className="text-xs text-stone-500">
                Powerful search, multi-attribute filtering, and verified 1-page PDF downloads with Original/Copy stamps.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-stone-50/80 rounded-2xl border border-stone-200">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ref, client, tour, agent code..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 bg-white font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Statuses ({allBookings.length})</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 shrink-0">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 bg-white font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Travel Date (Newest first)</option>
                <option value="price">Total Price (Highest first)</option>
                <option value="travelers">Travelers Count (Highest first)</option>
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Travel Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Agent Referral Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issuance Mark</th>
                  <th className="py-3 px-4 text-right">Actions & PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400">
                      No bookings match your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isApproved = b.status === 'APPROVED' || b.status === 'COMPLETED';
                    const isCancelled = b.status === 'CANCELLED';
                    const isRejected = b.status === 'REJECTED';
                    const dlCount = Number(b.download_count) || 0;

                    return (
                      <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          #{b.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-stone-900">{b.client?.user?.name || 'Traveler'}</p>
                          <span className="text-[10px] text-stone-400">{b.client?.user?.email}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-800">
                          {b.destination?.title}
                        </td>
                        <td className="py-3 px-4">{b.travel_date}</td>
                        <td className="py-3 px-4 font-bold text-primary-800 font-mono">
                          {Number(b.total_price).toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4">
                          {b.agent?.referral_code ? (
                            <span className="font-mono bg-primary-100 text-primary-900 px-2 py-0.5 rounded text-[10px] font-bold">
                              {b.agent.referral_code}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px] italic">Direct Organic</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : isRejected
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              dlCount === 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {dlCount === 0 ? 'Original Ready' : `Copy (${dlCount} DL)`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handleDownloadPdf(
                                b.id,
                                isCancelled
                                  ? `ASK_Cancellation_${b.id.substring(0, 8)}.pdf`
                                  : `ASK_Voucher_${b.id.substring(0, 8)}.pdf`,
                              )
                            }
                            disabled={downloadingPdfId === b.id}
                            className="inline-flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                            title="Download verified 1-page PDF document"
                          >
                            {downloadingPdfId === b.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-primary-600" />
                            )}
                            <span>{isCancelled ? 'Statement' : 'Voucher'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setModerationAction('COMMENT');
                              setCommentOrReason(b.manager_comment || '');
                            }}
                            className="rounded-xl border border-stone-200 px-2 py-1.5 text-[11px] font-bold text-stone-600 hover:bg-stone-100"
                            title="Attach administrative note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALES & PERFORMANCE REPORTS */}
      {activeTab === 'reports' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Agency Sales & Operational Performance Reports
              </h3>
              <p className="text-xs text-stone-500">
                Detailed sales figures, cancellation penalty revenues, and exportable reconciliation datasets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel Report</span>
              </button>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF Report</span>
              </button>
            </div>
          </div>

          {/* Daily Operational Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Approved Sales Today
              </span>
              <h4 className="text-2xl font-black text-emerald-950">
                {Number(dailyReport?.approvedSales || data?.salesToday || 0).toLocaleString()} ETB
              </h4>
              <p className="text-[11px] text-emerald-700">Gross approved booking value</p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Retained Penalties Today
              </span>
              <h4 className="text-2xl font-black text-amber-950">
                {Number(dailyReport?.penaltiesCollected || 0).toLocaleString()} ETB
              </h4>
              <p className="text-[11px] text-amber-700">From client cancellation fees</p>
            </div>

            <div className="bg-primary-50/60 border border-primary-200 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-primary-800 uppercase tracking-wider">
                Agent Commissions Credited
              </span>
              <h4 className="text-2xl font-black text-primary-950">
                {Number(dailyReport?.commissionsCredited || 0).toLocaleString()} ETB
              </h4>
              <p className="text-[11px] text-primary-700">Paid to referring agents (10% / Tiered)</p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                New Clients Registered
              </span>
              <h4 className="text-2xl font-black text-stone-900">
                {dailyReport?.newClientsRegistered || data?.newClientsToday || 0}
              </h4>
              <p className="text-[11px] text-stone-500">Signups recorded today</p>
            </div>
          </div>

          {/* Today's Bookings Feed */}
          <div className="space-y-3 pt-2">
            <h4 className="font-serif text-base font-bold text-stone-900">
              Today's Expedition Bookings Activity
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Total Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Agent Referral Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {dailyReport?.bookings && dailyReport.bookings.length > 0 ? (
                    dailyReport.bookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          #{b.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">{b.client?.user?.name || 'Traveler'}</td>
                        <td className="py-3 px-4 font-bold text-stone-800">{b.destination?.title}</td>
                        <td className="py-3 px-4 font-bold font-mono">{Number(b.total_price).toLocaleString()} ETB</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {b.agent?.referral_code ? (
                            <span className="font-mono bg-primary-100 text-primary-900 px-2 py-0.5 rounded text-[10px] font-bold">
                              {b.agent.referral_code}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px] italic">Direct Organic</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No new booking requests submitted yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NEW CLIENT REGISTRATIONS */}
      {activeTab === 'clients' && (
        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                New Client Registrations & Referral Attribution
              </h3>
              <p className="text-xs text-stone-500">
                Review recently registered travelers, contact details, and their linked agent referral partner codes.
              </p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-900">
              {clients.length} Total Registered Clients
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Agent Referral Code Attached</th>
                  <th className="py-3 px-4">Onboarding Channel</th>
                  <th className="py-3 px-4">Date Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {clients.map((c) => {
                  const refCode = c.referral_code_used || c.referredByAgent?.referral_code;
                  return (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {c.user?.name || 'Traveler'}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                        {c.user?.email}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                        {c.user?.phone || 'Not provided'}
                      </td>
                      <td className="py-3 px-4">
                        {refCode ? (
                          <span className="font-mono bg-primary-100 text-primary-900 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {refCode}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">Direct Website Access</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            refCode ? 'bg-primary-50 text-primary-800' : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {refCode ? 'Agent Partner Referral' : 'Direct Organic Signup'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-[11px]">
                        {new Date(c.created_at || c.user?.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AGENTS & REFERRAL CODE MANAGEMENT */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Pending Applications Box */}
          {pendingApplications.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <h4 className="font-serif text-lg font-bold text-amber-950">
                    Pending Travel Agent Applications ({pendingApplications.length})
                  </h4>
                </div>
                <span className="text-xs text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full font-bold">
                  Manager Action Required
                </span>
              </div>
              <p className="text-xs text-stone-600">
                The following candidates submitted registration requests via "Join Agent Network". Click Approve to activate their partner profile and issue their unique 8-character referral code.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-stone-900">{app.name}</span>
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded font-mono">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 space-y-0.5 mt-1.5">
                        <p><strong>Email:</strong> {app.email}</p>
                        {app.phone && <p><strong>Phone:</strong> {app.phone}</p>}
                        {app.payout_details && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-100 mt-1">
                            {app.payout_details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => handleApproveApplication(app.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-xs"
                      >
                        ✓ Approve & Issue Code
                      </button>
                      <button
                        onClick={() => handleRejectApplication(app.id)}
                        className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-xs transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Travel Agent Partner Network
              </h3>
              <p className="text-xs text-stone-500">
                Manage authorized sales partners, unique referral codes, and commission balances.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPayoutModal(true)}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
              >
                <CreditCard className="w-4 h-4 text-primary-600" />
                <span>Process Payout</span>
              </button>
              <button
                onClick={() => setShowNewAgentModal(true)}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Agent</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Unique Referral Code</th>
                  <th className="py-3 px-4">Wallet Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {agents.map((agt) => (
                  <tr key={agt.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">{agt.user?.name}</td>
                    <td className="py-3 px-4 text-stone-600">{agt.user?.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono bg-primary-100 text-primary-900 px-2.5 py-1 rounded-lg text-xs font-bold">
                        {agt.referral_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 font-mono">
                      {Number(agt.wallet_balance).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          !agt.deactivated_at ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {!agt.deactivated_at ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleRotateReferral(agt.id)}
                        className="text-stone-600 font-bold hover:text-stone-900 inline-flex items-center gap-1"
                        title="Rotate code"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Rotate
                      </button>
                      <button
                        onClick={() => handleToggleDeactivate(agt.id)}
                        className={`font-bold ${
                          !agt.deactivated_at ? 'text-red-600 hover:underline' : 'text-emerald-700 hover:underline'
                        }`}
                      >
                        {!agt.deactivated_at ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Moderation / Comment Modal */}
      {selectedBooking && moderationAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-serif text-xl font-bold text-stone-900">
              {moderationAction === 'APPROVE'
                ? 'Approve Tour Booking Request'
                : moderationAction === 'REJECT'
                ? 'Reject Tour Booking Request'
                : 'Attach Administrative Comments'}
            </h4>
            <div className="bg-stone-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-stone-200">
              <p>
                <span className="font-bold text-stone-700">Tour Circuit:</span> {selectedBooking.destination?.title}
              </p>
              <p>
                <span className="font-bold text-stone-700">Traveler:</span> {selectedBooking.client?.user?.name} (
                {selectedBooking.travelers} Pax)
              </p>
              <p>
                <span className="font-bold text-stone-700">Total Price:</span>{' '}
                {Number(selectedBooking.total_price).toLocaleString()} ETB
              </p>
              {selectedBooking.agent && moderationAction === 'APPROVE' && (
                <p className="text-emerald-700 font-bold pt-1 border-t border-stone-200 mt-1">
                  10% Agent Commission (+{(Number(selectedBooking.total_price) * 0.1).toLocaleString()} ETB) will be credited to {selectedBooking.agent.user?.name}.
                </p>
              )}
            </div>

            <form onSubmit={handleModeration} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {moderationAction === 'APPROVE'
                    ? 'Manager Comment (Optional)'
                    : moderationAction === 'REJECT'
                    ? 'Rejection Reason (Required)'
                    : 'Administrative Comment / Note'}
                </label>
                <textarea
                  rows={3}
                  required={moderationAction === 'REJECT' || moderationAction === 'COMMENT'}
                  value={commentOrReason}
                  onChange={(e) => setCommentOrReason(e.target.value)}
                  placeholder={
                    moderationAction === 'APPROVE'
                      ? 'Add any trip logistics notes for the traveler...'
                      : moderationAction === 'REJECT'
                      ? 'Explain why the booking cannot be accommodated...'
                      : 'Enter administrative notes or comments on this booking...'
                  }
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    setModerationAction(null);
                  }}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingModeration}
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md transition-all ${
                    moderationAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : moderationAction === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {processingModeration ? 'Saving...' : `Confirm ${moderationAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Agent Modal */}
      {showNewAgentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-serif text-xl font-bold text-stone-900">Register Travel Agent</h4>
            <form onSubmit={handleRegisterAgent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Agent Full Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Dawit Haile"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email (Brevo Welcome Sent)</label>
                <input
                  type="email"
                  required
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="agent@partner.et"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="+251 93 123 4567"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payout Account Details</label>
                <input
                  type="text"
                  value={agentPayout}
                  onChange={(e) => setAgentPayout(e.target.value)}
                  placeholder="Bank name and account number"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewAgentModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-md"
                >
                  Generate Referral Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-serif text-xl font-bold text-stone-900">Process Commission Payout</h4>
            <form onSubmit={handleProcessPayout} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Select Travel Agent</label>
                <select
                  value={payoutAgentId}
                  onChange={(e) => setPayoutAgentId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.user?.name} (Balance: {Number(a.wallet_balance).toLocaleString()} ETB)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payout Amount (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 1000.00"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Telebirr">Telebirr Mobile Money</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Direct Cash Settlement">Direct Cash Settlement</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Bank Reference / Tx ID</label>
                <input
                  type="text"
                  required
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. CBE-TX-99887766"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md"
                >
                  {processingPayout ? 'Recording...' : 'Record Payout & Deduct Wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
