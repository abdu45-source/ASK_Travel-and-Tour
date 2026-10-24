import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  DollarSign,
  TrendingUp,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { api, getAccessToken } from '../../services/api';
import { Booking, BookingStatus } from '../../types';

export const ReportsPage: React.FC = () => {
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingBookingId, setDownloadingBookingId] = useState<string | null>(null);

  const handleDownloadSinglePdf = async (booking: Booking) => {
    setDownloadingBookingId(booking.id);
    try {
      const res = await api.get(`/bookings/${booking.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefix = booking.status === BookingStatus.CANCELLED ? 'Statement' : 'Voucher';
      a.download = `ASK_Travel_${prefix}_${booking.id.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download document PDF');
    } finally {
      setDownloadingBookingId(null);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [dailyRes, bkgRes] = await Promise.all([
        api.get('/reports/daily'),
        api.get(`/reports/bookings?${params.toString()}`),
      ]);

      setDailyReport(dailyRes.data);
      setBookings(bkgRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStatus, startDate, endDate]);

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `http://localhost:3000/api/v1/reports/export/excel?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let errText = 'Failed to generate Excel report';
        try {
          const errJson = await response.json();
          errText = errJson.message || errText;
        } catch {}
        throw new Error(errText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASK_Travel_Bookings_Report_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export Excel report');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `http://localhost:3000/api/v1/reports/export/pdf?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let errText = 'Failed to generate PDF report';
        try {
          const errJson = await response.json();
          errText = errJson.message || errText;
        } catch {}
        throw new Error(errText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASK_Travel_Bookings_Report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.destination?.title.toLowerCase().includes(term) ||
      b.client?.user?.name.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-10">
      {/* Header and Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Operational Reporting & Data Export
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Consolidated daily metrics, financial reconciliation, and export with formula injection sanitization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{downloadingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{downloadingPdf ? 'Generating...' : 'Export PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Daily Summary Cards */}
      {dailyReport && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Today's Approved Sales</span>
            <p className="text-2xl font-bold text-stone-900">
              {Number(dailyReport.approvedSales || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Today's Penalties Retained</span>
            <p className="text-2xl font-bold text-amber-700">
              {Number(dailyReport.penaltiesCollected || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Today's Commissions Credited</span>
            <p className="text-2xl font-bold text-emerald-700">
              {Number(dailyReport.commissionsCredited || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">ETB</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">New Clients Today</span>
            <p className="text-2xl font-bold text-primary-800">
              {dailyReport.newClientsRegistered || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search client, tour, or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white text-stone-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Moderation</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-stone-700"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-stone-700"
          />
        </div>
      </div>

      {/* Bookings Report Table */}
      <div className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="font-serif text-lg font-bold text-stone-900">Detailed Bookings Report</h3>
          <span className="text-xs font-bold text-stone-500">{filteredBookings.length} Records</span>
        </div>

        {loading ? (
          <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
        ) : filteredBookings.length === 0 ? (
          <p className="text-center py-12 text-xs text-stone-400">No records found matching filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 border-b border-stone-100">
                <tr>
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Pax</th>
                  <th className="py-3 px-4">Total (ETB)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4 text-right">PDF Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      #{b.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">{b.client?.user?.name}</td>
                    <td className="py-3 px-4">{b.destination?.title}</td>
                    <td className="py-3 px-4">{b.travel_date}</td>
                    <td className="py-3 px-4">{b.travelers}</td>
                    <td className="py-3 px-4 font-bold text-primary-800">
                      {Number(b.total_price).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === BookingStatus.APPROVED
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === BookingStatus.PENDING
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === BookingStatus.CANCELLED
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                      {b.agent?.referral_code || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownloadSinglePdf(b)}
                        disabled={downloadingBookingId === b.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 transition-colors disabled:opacity-50"
                        title={b.status === BookingStatus.CANCELLED ? 'Download Cancellation Statement' : 'Download Travel Voucher'}
                      >
                        <FileText className="w-3 h-3 text-primary-600" />
                        {b.status === BookingStatus.CANCELLED ? 'Statement' : 'Voucher'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
