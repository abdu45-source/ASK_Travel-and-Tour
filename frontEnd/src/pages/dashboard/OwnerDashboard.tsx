import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Save,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Layers,
  Compass,
  Filter,
  FileText,
  Download,
  BarChart2,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Percent,
  Award,
  Briefcase,
  Eye,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { Permission, PermissionScope, User as UserType, Destination } from '../../types';

export const OwnerDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionsList, setPermissionsList] = useState<string[]>([]);
  const [managers, setManagers] = useState<UserType[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Analytics Filter & Commission Intelligence State
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
  const [analyticsStatus, setAnalyticsStatus] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Dynamic RBAC State
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [rolePermissionsDraft, setRolePermissionsDraft] = useState<
    Record<string, PermissionScope | 'NONE'>
  >({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Create Manager Modal
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerPhone, setNewManagerPhone] = useState('');
  const [newManagerPass, setNewManagerPass] = useState('Manager@2026!');

  const fetchDashboardData = async () => {
    try {
      const [dashRes, rolesRes, permsRes, mgrRes, auditRes, destsRes] = await Promise.all([
        api.get('/dashboard/owner'),
        api.get('/roles'),
        api.get('/roles/permissions-list'),
        api.get('/users?role=MANAGER'),
        api.get('/audit-logs?limit=15'),
        api.get('/destinations/admin'),
      ]);

      setData(dashRes.data);
      setRoles(rolesRes.data);
      setPermissionsList(permsRes.data);
      setManagers(mgrRes.data.items || []);
      setAuditLogs(auditRes.data.items || []);
      setDestinations(destsRes.data || []);

      if (rolesRes.data.length > 0 && !selectedRole) {
        selectRoleForEdit(rolesRes.data[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (analyticsPeriod) params.append('period', analyticsPeriod);
      if (analyticsStatus && analyticsStatus !== 'ALL') params.append('status', analyticsStatus);
      if (minPrice && !isNaN(Number(minPrice))) params.append('minPrice', minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.append('maxPrice', maxPrice);

      const res = await api.get(`/dashboard/owner/analytics?${params.toString()}`);
      setAnalyticsData(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingAnalytics(false);
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download PDF.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleToggleDestinationStatus = async (dest: Destination) => {
    const nextStatus = dest.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      await api.patch(`/destinations/${dest.id}`, { status: nextStatus });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update destination status');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAnalytics();
  }, [analyticsPeriod, analyticsStatus]);

  const selectRoleForEdit = (role: any) => {
    setSelectedRole(role);
    const draft: Record<string, PermissionScope | 'NONE'> = {};
    for (const rp of role.rolePermissions || []) {
      draft[rp.permission] = rp.scope;
    }
    setRolePermissionsDraft(draft);
    setSaveSuccess(false);
  };

  const handleScopeChange = (permission: string, scope: PermissionScope | 'NONE') => {
    setRolePermissionsDraft((prev) => ({
      ...prev,
      [permission]: scope,
    }));
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    setSaveSuccess(false);
    try {
      const permissionsArray: { permission: Permission; scope: PermissionScope }[] = [];
      Object.entries(rolePermissionsDraft).forEach(([perm, scope]) => {
        if (scope !== 'NONE') {
          permissionsArray.push({
            permission: perm as Permission,
            scope: scope as PermissionScope,
          });
        }
      });

      await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: permissionsArray,
      });

      setSaveSuccess(true);
      fetchDashboardData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/managers', {
        name: newManagerName,
        email: newManagerEmail,
        phone: newManagerPhone,
        password: newManagerPass,
      });
      setShowCreateManager(false);
      setNewManagerName('');
      setNewManagerEmail('');
      setNewManagerPhone('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create manager');
    }
  };

  const handleManagerStatus = async (id: string, action: 'suspend' | 'revoke' | 'activate') => {
    if (!confirm(`Are you sure you want to ${action} this manager account?`)) return;
    try {
      await api.post(`/users/managers/${id}/${action}`);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-stone-200 rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-stone-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-3xl bg-white p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Gross Revenue</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">
              {Number(data?.totalRevenue || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </h3>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
              Approved & Completed Tours
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">2% Penalties Retained</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">
              {Number(data?.totalPenalties || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </h3>
            <span className="text-[10px] text-stone-400 mt-1 inline-block">
              Collected from client cancellations
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Commission Liability</p>
            <h3 className="text-2xl font-bold text-primary-800 mt-1">
              {Number(data?.commissionLiability || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </h3>
            <span className="text-[10px] text-stone-400 mt-1 inline-block">
              Pending agent wallet balances
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase">Network Scale</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">
              {data?.metrics?.totalClients || 0} Clients
            </h3>
            <span className="text-[10px] text-stone-500 mt-1 inline-block">
              {data?.metrics?.totalAgents || 0} Registered Agents
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Executive Commercial Analytics & Commission Intelligence Control Center */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Executive Commercial Analytics & Commission Intelligence
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Multi-dimensional ledger analytics filtered by timeframe, status, and price range. Track exact manager overrides and agent referral commissions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchAnalytics}
              disabled={loadingAnalytics}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Analytics Dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin text-primary-600' : ''}`} />
              <span>{loadingAnalytics ? 'Refreshing...' : 'Live Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar */}
        <div className="rounded-2xl bg-stone-50/80 border border-stone-200 p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Period Tabs: Day, Week, Month, Year, All */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Time Horizon Filter
              </span>
              <div className="inline-flex p-1 bg-stone-200/70 rounded-xl gap-1">
                {(
                  [
                    { key: 'day', label: 'Today (Day)' },
                    { key: 'week', label: 'Week (7D)' },
                    { key: 'month', label: 'Month (30D)' },
                    { key: 'year', label: 'Year (365D)' },
                    { key: 'all', label: 'All Time' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setAnalyticsPeriod(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      analyticsPeriod === p.key
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter Pills: ALL, APPROVED, CANCELLED, REJECTED, PENDING */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Moderation Status Filter
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'ALL', label: 'All Statuses' },
                  { key: 'APPROVED', label: 'Approved (Accepted)' },
                  { key: 'CANCELLED', label: 'Cancelled' },
                  { key: 'REJECTED', label: 'Rejected' },
                  { key: 'PENDING', label: 'Pending' },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setAnalyticsStatus(s.key)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      analyticsStatus === s.key
                        ? 'bg-primary-800 text-white border-primary-900 shadow-sm'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price Range Filter (Min ETB / Max ETB) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-200/70 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Price Range (ETB):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min ETB"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white font-mono text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
                <span className="text-stone-400 font-bold">—</span>
                <input
                  type="number"
                  placeholder="Max ETB"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white font-mono text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <button
                onClick={fetchAnalytics}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-bold transition-all shadow-sm active:scale-95 text-xs"
              >
                Apply Price
              </button>
              {(minPrice || maxPrice) && (
                <button
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setTimeout(fetchAnalytics, 0);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-all text-xs"
                >
                  Reset Price
                </button>
              )}
            </div>

            <div className="text-[11px] text-stone-500">
              Showing <span className="font-bold text-stone-900">{analyticsData?.filterCounts?.filteredCount ?? (data?.metrics?.totalBookings || 0)}</span> filtered bookings
              {analyticsData?.filterCounts?.totalPeriodBookings !== undefined && (
                <span> out of {analyticsData.filterCounts.totalPeriodBookings} in period</span>
              )}
            </div>
          </div>
        </div>

        {/* Analytics KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Moderation Outcomes: Accepted vs Rejected */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Moderation Decisions
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {analyticsData?.filterCounts?.acceptanceRate ?? 100}% Accepted
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Accepted</span>
                <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                  {analyticsData?.filterCounts?.acceptedCount ?? data?.bookingsByStatus?.APPROVED ?? 0}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Rejected</span>
                <span className="text-2xl font-black text-rose-900 mt-0.5 block">
                  {analyticsData?.filterCounts?.rejectedCount ?? data?.bookingsByStatus?.REJECTED ?? 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
              <span>Cancelled: <strong className="text-rose-700">{analyticsData?.filterCounts?.cancelledCount ?? data?.bookingsByStatus?.CANCELLED ?? 0}</strong></span>
              <span>Pending: <strong className="text-amber-700">{analyticsData?.filterCounts?.pendingCount ?? data?.bookingsByStatus?.PENDING ?? 0}</strong></span>
            </div>
          </div>

          {/* Revenue & Escrow Retained */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Filtered Gross Revenue
            </span>
            <div className="space-y-0.5">
              <h4 className="text-2xl font-bold text-stone-900">
                {Number(analyticsData?.financials?.grossRevenue ?? data?.totalRevenue ?? 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
              </h4>
              <p className="text-[11px] text-stone-500">
                Penalties: <strong className="text-amber-700">{Number(analyticsData?.financials?.totalPenalties ?? data?.totalPenalties ?? 0).toLocaleString()} ETB</strong>
              </p>
            </div>
            <div className="pt-2 border-t border-stone-200/60 text-[11px] text-stone-600 space-y-1">
              <div className="flex justify-between">
                <span>Net Refunds Remitted:</span>
                <span className="font-bold text-stone-800">{Number(analyticsData?.financials?.totalRefunds ?? 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Agency Net Retained:</span>
                <span>{Math.max(0, Number(analyticsData?.financials?.agencyNetRetained ?? 0)).toLocaleString()} ETB</span>
              </div>
            </div>
          </div>

          {/* Agency Net Retained Balance Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                Agency Net Retained
              </span>
              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                0 ETB Manager Comm.
              </span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-2xl font-black text-emerald-950">
                {Math.max(0, Number(analyticsData?.financials?.agencyNetRetained ?? 0)).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
              </h4>
              <p className="text-[11px] text-emerald-900 leading-tight">
                Net operational revenue retained by agency. Managers receive zero commissions (operational staff). Only referring agents receive commissions.
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-200 text-[10px] text-emerald-800 flex items-center justify-between font-semibold">
              <span>Governance:</span>
              <span>Only Agents Earn Commission</span>
            </div>
          </div>

          {/* Agent Commissions Card */}
          <div className="rounded-2xl border border-primary-200 bg-primary-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary-800 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-primary-700" />
                Agent Commissions
              </span>
              <span className="text-[10px] font-bold text-primary-900 bg-primary-100 px-2 py-0.5 rounded-full">
                Referred Only
              </span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-2xl font-black text-primary-950">
                {Number(analyticsData?.financials?.totalAgentCommissions ?? 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
              </h4>
              <p className="text-[11px] text-primary-900 leading-tight">
                Commissions paid exclusively to the agent whose reference code was attached to the booking (10% on approved, 2%/4%/8% on cancelled).
              </p>
            </div>
            <div className="pt-2 border-t border-primary-200 text-[10px] text-primary-800 flex items-center justify-between font-semibold">
              <span>Direct Clients:</span>
              <span className="font-mono font-bold text-stone-600">0.00 ETB Commission</span>
            </div>
          </div>
        </div>

        {/* Commercial Ledger Table (Itemized by Booking) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg font-bold text-stone-900">
              Commercial Bookings Ledger & Commission Breakdown
            </h4>
            <span className="text-xs text-stone-400">
              Click "Voucher / Statement (PDF)" to inspect official verified 1-page document
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Booking Ref & Tour</th>
                  <th className="py-3 px-4">Traveler / Client</th>
                  <th className="py-3 px-4">Agent Partner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Booking Total</th>
                  <th className="py-3 px-4">Penalty / Refund</th>
                  <th className="py-3 px-4 bg-emerald-50/70 text-emerald-900">Agency Retained</th>
                  <th className="py-3 px-4 bg-primary-50/70 text-primary-900">Agent Comm.</th>
                  <th className="py-3 px-4 text-right">Official Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {analyticsData?.items && analyticsData.items.length > 0 ? (
                  analyticsData.items.map((row: any) => {
                    const isApproved = row.status === 'APPROVED' || row.status === 'COMPLETED';
                    const isCancelled = row.status === 'CANCELLED';
                    const isRejected = row.status === 'REJECTED';
                    const isPending = row.status === 'PENDING';

                    return (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {row.destinationImage ? (
                              <img
                                src={row.destinationImage}
                                alt={row.destinationTitle}
                                className="h-9 w-9 rounded-xl object-cover shrink-0 border border-stone-200"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                                <MapPin className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-mono font-bold text-stone-900 text-[11px]">
                                #{row.bookingRef}
                              </p>
                              <span className="text-[11px] font-medium text-stone-600 block line-clamp-1">
                                {row.destinationTitle}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {row.travelDate} ({row.travelers} Pax)
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-stone-900">{row.clientName}</p>
                          <span className="text-[10px] text-stone-400 block">{row.clientEmail}</span>
                          <span className="text-[10px] text-stone-500 font-mono">{row.clientPhone}</span>
                        </td>

                        <td className="py-3 px-4">
                          {row.agentName ? (
                            <div>
                              <span className="font-bold text-primary-900 block">{row.agentName}</span>
                              <span className="text-[10px] font-mono text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded border border-primary-200 inline-block">
                                {row.agentReferralCode}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-400 text-[11px] italic">Direct Organic</span>
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
                            {row.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-stone-900 font-mono">
                          {Number(row.totalPrice).toLocaleString()} ETB
                        </td>

                        <td className="py-3 px-4 text-[11px]">
                          {isCancelled ? (
                            <div className="space-y-0.5">
                              <span className="text-rose-700 font-bold block">
                                Penalty: {Number(row.penaltyFee).toFixed(2)} ETB ({row.penaltyPercentage}%)
                              </span>
                              <span className="text-emerald-700 text-[10px] block">
                                Refund: {Number(row.refundAmount).toFixed(2)} ETB
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">No Penalty</span>
                          )}
                        </td>

                        <td className="py-3 px-4 bg-emerald-50/40">
                          <span className="font-bold text-emerald-950 font-mono block">
                            {Number(row.agencyRetained).toFixed(2)} ETB
                          </span>
                          <span className="text-[9px] text-emerald-700">
                            {isCancelled
                              ? 'Retained penalty'
                              : isApproved
                              ? 'Net tour revenue'
                              : 'Pending'}
                          </span>
                        </td>

                        <td className="py-3 px-4 bg-primary-50/40">
                          <span className="font-bold text-primary-950 font-mono block">
                            {Number(row.agentCommission).toFixed(2)} ETB
                          </span>
                          <span className="text-[9px] text-primary-700">
                            {row.agentName
                              ? isCancelled
                                ? `${row.penaltyPercentage}% of penalty`
                                : isApproved
                                ? '10% partner referral'
                                : 'Pending'
                              : 'Direct (0 ETB Comm.)'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              handleDownloadPdf(
                                row.id,
                                isCancelled
                                  ? `ASK_Cancellation_Statement_${row.bookingRef}.pdf`
                                  : `ASK_Expedition_Voucher_${row.bookingRef}.pdf`,
                              )
                            }
                            disabled={downloadingPdfId === row.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Download verified 1-page PDF voucher or cancellation statement"
                          >
                            {downloadingPdfId === row.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-primary-700" />
                            )}
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 text-xs">
                      No bookings matching current period, status, and price filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tour Packages & Catalog Operations (Executive View) */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Tour Packages & Catalog Commercial Operations
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Direct executive oversight over all 12+ Ethiopian expeditions, live publishing status, and pricing structures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/destinations"
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Catalog Control Center</span>
            </Link>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Total Tours</span>
            <p className="text-xl font-bold text-stone-900 mt-0.5">{destinations.length}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Active in Catalog</span>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">
              {destinations.filter((d) => d.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Drafts / Inactive</span>
            <p className="text-xl font-bold text-amber-800 mt-0.5">
              {destinations.filter((d) => d.status !== 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
            <span className="text-[10px] font-bold text-primary-700 uppercase">Average Base Price</span>
            <p className="text-xl font-bold text-primary-900 mt-0.5">
              {destinations.length > 0
                ? Math.round(
                    destinations.reduce((acc, d) => acc + Number(d.base_price), 0) /
                      destinations.length,
                  ).toLocaleString()
                : 0}{' '}
              <span className="text-xs font-normal">ETB</span>
            </p>
          </div>
        </div>

        {/* Destinations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Tour Destination</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Duration & Capacity</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Catalog Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {destinations.slice(0, 10).map((d) => {
                const isActive = d.status === 'ACTIVE';

                return (
                  <tr key={d.id} className="hover:bg-stone-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={d.gallery_images?.[0] || '/images/destinations/gondar-fasilides-castle-unesco.jpg'}
                          alt={d.title}
                          className="h-9 w-9 rounded-xl object-cover shrink-0 border border-stone-200"
                        />
                        <div>
                          <p className="font-bold text-stone-900 leading-tight">{d.title}</p>
                          <span className="text-[10px] text-stone-400">/{d.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-semibold">{d.region}</td>
                    <td className="py-3 px-4 text-stone-500">
                      {d.duration_days} Days · Max {d.capacity || 20} pax
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {Number(d.base_price).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleDestinationStatus(d)}
                        className={`font-bold hover:underline text-[11px] ${
                          isActive ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isActive ? 'Set Draft' : 'Publish'}
                      </button>
                      <Link
                        to={`/destinations/${d.slug}`}
                        className="text-primary-700 font-bold hover:underline text-[11px]"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic RBAC Authorization Engine */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Dynamic Attribute-Based Authorization Engine (ABAC)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Reconciled attribute-based engine: Modify role permissions & scopes dynamically in the PostgreSQL database at runtime without code deployment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Updated in Database!
              </span>
            )}
            <button
              onClick={saveRolePermissions}
              disabled={savingPermissions}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingPermissions ? 'Saving...' : 'Save Permissions'}</span>
            </button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-stone-100">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRoleForEdit(r)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedRole?.id === r.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {r.role_name}
            </button>
          ))}
        </div>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
          {permissionsList.map((perm) => {
            const currentScope = rolePermissionsDraft[perm] || 'NONE';
            const isAssigned = currentScope !== 'NONE';

            return (
              <div
                key={perm}
                className={`rounded-2xl p-3 border text-xs flex items-center justify-between transition-colors ${
                  isAssigned
                    ? 'bg-primary-50/40 border-primary-200'
                    : 'bg-stone-50/60 border-stone-200 text-stone-500'
                }`}
              >
                <div className="pr-2">
                  <p className="font-mono font-bold text-[11px] text-stone-900 break-all">{perm}</p>
                </div>

                <select
                  value={currentScope}
                  onChange={(e) => handleScopeChange(perm, e.target.value as any)}
                  className={`text-[11px] font-bold rounded-lg px-2 py-1 border focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                    isAssigned
                      ? 'bg-white border-primary-300 text-primary-800'
                      : 'bg-white border-stone-200 text-stone-400'
                  }`}
                >
                  <option value="NONE">DISABLED (-)</option>
                  <option value="ANY">ANY (All)</option>
                  <option value="OWN">OWN (Self)</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="TEAM">TEAM</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Managers Management */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Agency Managers Management
            </h3>
            <p className="text-xs text-stone-500">
              Create, suspend, or revoke operational manager accounts with immediate session revocation.
            </p>
          </div>
          <button
            onClick={() => setShowCreateManager(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Manager</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Manager Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {managers.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/60">
                  <td className="py-3 px-4 font-bold text-stone-900">{m.name}</td>
                  <td className="py-3 px-4 text-stone-600">{m.email}</td>
                  <td className="py-3 px-4 text-stone-500">{m.phone || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'SUSPENDED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {m.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleManagerStatus(m.id, 'suspend')}
                        className="text-amber-700 font-bold hover:underline"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleManagerStatus(m.id, 'activate')}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleManagerStatus(m.id, 'revoke')}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Manager */}
      {showCreateManager && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-serif text-xl font-bold text-stone-900">Create Agency Manager</h4>
            <form onSubmit={handleCreateManager} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  placeholder="Manager Name"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newManagerEmail}
                  onChange={(e) => setNewManagerEmail(e.target.value)}
                  placeholder="manager@askdigital.et"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newManagerPhone}
                  onChange={(e) => setNewManagerPhone(e.target.value)}
                  placeholder="+251 92 123 4567"
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Initial Password</label>
                <input
                  type="text"
                  value={newManagerPass}
                  onChange={(e) => setNewManagerPass(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateManager(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Stream */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            Immutable Audit Trail Stream (Audit Logs)
          </h3>
          <span className="text-[10px] font-mono text-stone-400">Append-Only</span>
        </div>

        <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto text-xs font-mono">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-stone-600">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-800">
                  {log.action}
                </span>
                <span>{log.entity_type} {log.entity_id ? `(#${log.entity_id.substring(0, 8)})` : ''}</span>
              </div>
              <span className="text-[10px] text-stone-400">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
