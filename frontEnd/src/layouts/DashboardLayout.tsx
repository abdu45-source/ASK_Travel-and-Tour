import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  MapPin,
  Users,
  ShieldAlert,
  Wallet,
  FileSpreadsheet,
  MessageSquare,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from '../components/common/NotificationDropdown';
import { ChatWidget } from '../components/common/ChatWidget';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center p-8 bg-white rounded-3xl shadow-lg border border-stone-200">
          <p className="text-stone-700 font-semibold mb-4">You must be signed in to access the dashboard.</p>
          <Link
            to="/login"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user.roles.includes('OWNER');
  const isManager = user.roles.includes('MANAGER');
  const isAgent = user.roles.includes('AGENT');
  const isClient = user.roles.includes('CLIENT');

  const navLinks = [
    // Owner items
    ...(isOwner
      ? [
          { name: 'Executive Overview', path: '/dashboard/owner', icon: LayoutDashboard },
          { name: 'Destinations & Catalog', path: '/destinations', icon: MapPin },
          { name: 'Reports & Export', path: '/dashboard/reports', icon: FileSpreadsheet },
        ]
      : []),

    // Manager items
    ...(isManager
      ? [
          { name: 'Moderation & Operations', path: '/dashboard/manager', icon: LayoutDashboard },
          { name: 'Operational Reports', path: '/dashboard/reports', icon: FileSpreadsheet },
        ]
      : []),

    // Agent items
    ...(isAgent
      ? [
          { name: 'Agent Pipeline & Wallet', path: '/dashboard/agent', icon: LayoutDashboard },
          { name: 'Browse Destinations', path: '/destinations', icon: MapPin },
        ]
      : []),

    // Client items
    ...(isClient
      ? [
          { name: 'My Trips & Bookings', path: '/dashboard/client', icon: ClipboardList },
          { name: 'Browse Destinations', path: '/destinations', icon: MapPin },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-900 border-r border-stone-800 text-stone-300">
        <div className="p-6 border-b border-stone-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-white">ASK TOURS</span>
              <span className="block text-[10px] tracking-wider uppercase text-amber-400 font-semibold">
                {user.roles.join(' · ')}
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-700/30'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 text-xs text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Public Catalog
            </span>
            <ChevronRight className="w-3 h-3" />
          </Link>

          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-stone-200 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-sm sm:text-base font-bold text-stone-800">
              {isOwner && 'System Owner Control Panel'}
              {isManager && 'Operations & Moderation Hub'}
              {isAgent && 'Agent Portal & Commission Pipeline'}
              {isClient && 'Traveler Portal'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <NotificationDropdown />

            <div className="flex items-center gap-2.5 pl-3 border-l border-stone-200">
              <div className="h-8 w-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center font-bold text-xs text-primary-800">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-stone-900 leading-none">{user.name}</p>
                <span className="text-[10px] text-stone-500">{user.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-stone-900 text-stone-300 p-4 border-b border-stone-800 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-stone-300 hover:bg-stone-800"
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
    </div>
  );
};
