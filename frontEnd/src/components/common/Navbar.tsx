import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, User, LogOut, LayoutDashboard, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.roles.includes('OWNER')) return '/dashboard/owner';
    if (user.roles.includes('MANAGER')) return '/dashboard/manager';
    if (user.roles.includes('AGENT')) return '/dashboard/agent';
    return '/dashboard/client';
  };

  const primaryRole = user?.roles[0] || 'GUEST';

  const handleScrollTo = (hashId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/${hashId}`);
    } else {
      const el = document.getElementById(hashId.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <header
      className={`${
        isAuthPage ? 'relative' : 'sticky top-0'
      } z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-all`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary-700 via-primary-600 to-amber-500 flex items-center justify-center shadow-lg shadow-primary-700/20 group-hover:scale-105 transition-transform">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-stone-900 group-hover:text-primary-800 transition-colors">
              ASK <span className="text-primary-600 font-sans font-semibold text-lg">TOURS</span>
            </span>
            <span className="block text-[10px] tracking-wider uppercase font-semibold text-stone-500">
              Ethiopia Premier Travel
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
          <Link
            to="/"
            className={`hover:text-primary-700 transition-colors ${
              location.pathname === '/' ? 'text-primary-700 font-semibold' : ''
            }`}
          >
            Home
          </Link>
          <Link
            to="/destinations"
            className={`hover:text-primary-700 transition-colors ${
              location.pathname.startsWith('/destinations') ? 'text-primary-700 font-semibold' : ''
            }`}
          >
            Explore Destinations
          </Link>
          <button
            type="button"
            onClick={() => handleScrollTo('#about')}
            className="hover:text-primary-700 transition-colors cursor-pointer text-sm font-medium text-stone-600 bg-transparent border-none p-0"
          >
            Our Story
          </button>
          <button
            type="button"
            onClick={() => handleScrollTo('#contact')}
            className="hover:text-primary-700 transition-colors cursor-pointer text-sm font-medium text-stone-600 bg-transparent border-none p-0"
          >
            Bahir Dar HQ
          </button>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationDropdown />

              <Link
                to={getDashboardPath()}
                className="hidden sm:flex items-center gap-2 rounded-xl bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary-800 hover:bg-primary-100 transition-colors border border-primary-200/60"
              >
                <LayoutDashboard className="w-4 h-4 text-primary-600" />
                <span>Dashboard</span>
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1.5 sm:px-3 sm:py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="font-semibold text-stone-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <span className="text-[10px] text-primary-700 font-bold uppercase tracking-wider">
                      {primaryRole}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden border border-stone-100 py-1">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs font-bold text-stone-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                      </div>

                      <Link
                        to={getDashboardPath()}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-primary-600" />
                        Dashboard
                      </Link>

                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary-600/20 hover:bg-primary-700 transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 px-6 py-4 space-y-3 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-stone-800 hover:text-primary-700"
          >
            Home
          </Link>
          <Link
            to="/destinations"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-stone-800 hover:text-primary-700"
          >
            Explore Destinations
          </Link>
          <button
            type="button"
            onClick={() => handleScrollTo('#about')}
            className="block w-full text-left py-2 text-sm font-semibold text-stone-800 hover:text-primary-700 bg-transparent border-none p-0"
          >
            Our Story
          </button>
          <button
            type="button"
            onClick={() => handleScrollTo('#contact')}
            className="block w-full text-left py-2 text-sm font-semibold text-stone-800 hover:text-primary-700 bg-transparent border-none p-0"
          >
            Bahir Dar HQ
          </button>
          {user && (
            <Link
              to={getDashboardPath()}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-bold text-primary-700"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
