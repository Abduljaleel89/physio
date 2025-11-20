import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useRouter } from 'next/router';
import NotificationsBell from './NotificationsBell';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'PHYSIOTHERAPIST', 'RECEPTIONIST', 'PATIENT'] },
    { href: '/notifications', label: 'Notifications', roles: ['ADMIN', 'PHYSIOTHERAPIST', 'RECEPTIONIST', 'PATIENT'] },
    { href: '/patients/exercises', label: 'My Exercises', roles: ['PATIENT'] },
    { href: '/billing', label: 'Billing', roles: ['PATIENT'] },
    { href: '/doctor/plans', label: 'Doctor Plans', roles: ['PHYSIOTHERAPIST'] },
    { href: '/doctor/patients', label: 'Doctor Patients', roles: ['PHYSIOTHERAPIST'] },
    { href: '/requests', label: 'My Requests', roles: ['PATIENT'] },
    { href: '/exercises', label: 'Exercises', roles: ['ADMIN', 'PHYSIOTHERAPIST', 'RECEPTIONIST'] },
    { href: '/therapy-plans', label: 'Therapy Plans', roles: ['ADMIN', 'PHYSIOTHERAPIST', 'RECEPTIONIST', 'PATIENT'] },
    { href: '/appointments', label: 'Appointments', roles: ['ADMIN', 'PHYSIOTHERAPIST', 'RECEPTIONIST', 'PATIENT'] },
    { href: '/admin/invoices', label: 'Invoices', roles: ['ADMIN', 'RECEPTIONIST'] },
    { href: '/admin/payment-proofs', label: 'Payment Proofs', roles: ['ADMIN', 'RECEPTIONIST'] },
    { href: '/admin/requests', label: 'Requests', roles: ['ADMIN', 'RECEPTIONIST', 'PHYSIOTHERAPIST'] },
    { href: '/admin/users', label: 'Users', roles: ['ADMIN'] },
    { href: '/admin/assignments', label: 'Assignments', roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="min-h-screen transition-colors duration-500">
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-soft border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50 transition-all duration-500 animate-fade-in">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-6">
          <div className="grid grid-cols-[auto_1fr_auto] items-center h-14 sm:h-16 gap-1 sm:gap-2 lg:gap-3">
            {/* Left side: Logo - compact */}
            <div className="flex items-center min-w-0">
              <Link href="/dashboard" className="flex items-center space-x-1 sm:space-x-1.5 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 dark:from-primary-400 dark:via-primary-300 dark:to-primary-400 bg-clip-text text-transparent hover:from-primary-700 hover:via-primary-600 hover:to-primary-700 dark:hover:from-primary-300 dark:hover:via-primary-200 dark:hover:to-primary-300 transition-all duration-300 animate-shimmer bg-[length:200%_auto]">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 transition-all duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline text-sm lg:text-base xl:text-lg">Physio Platform</span>
                <span className="sm:hidden">Physio</span>
              </Link>
            </div>
            
            {/* Middle: Navigation links - constrained with overflow */}
            <div className="hidden md:flex items-center min-w-0 overflow-hidden">
              <div className="flex items-center space-x-0.5 lg:space-x-0.5 xl:space-x-1 overflow-x-auto scrollbar-hide w-full">
                {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex items-center px-1 sm:px-1.5 lg:px-1.5 xl:px-2 py-1.5 lg:py-1.5 xl:py-2 rounded-lg text-[10px] lg:text-[10px] xl:text-[11px] font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    router.pathname === item.href
                      ? 'bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent dark:hover:from-primary-900/20 dark:hover:to-transparent hover:text-primary-700 dark:hover:text-primary-300 hover:scale-105'
                  }`}
                >
                  {item.label}
                </Link>
                ))}
              </div>
            </div>
            
            {/* Right side: User actions - fixed column width */}
            <div className="flex items-center justify-end space-x-1 sm:space-x-1.5 lg:space-x-2 flex-shrink-0">
              {user && (
                <>
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-xl hover:bg-gradient-to-br hover:from-primary-50 hover:to-accent-50 dark:hover:from-primary-900/30 dark:hover:to-accent-900/30 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 flex-shrink-0 group"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 dark:text-yellow-300 transition-all duration-500 rotate-0 group-hover:rotate-180 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300 transition-all duration-500 rotate-0 group-hover:rotate-12 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-shrink-0">
                    <NotificationsBell />
                  </div>
                  <div className="hidden lg:flex flex-col items-end min-w-0 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-50 truncate max-w-[120px] xl:max-w-[150px] transition-colors duration-300">{user.email}</span>
                    <span className="text-[10px] text-gray-600 dark:text-gray-300 transition-colors duration-300">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center px-2.5 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-xs sm:text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 whitespace-nowrap flex-shrink-0"
                  >
                    <span className="hidden sm:inline">Logout</span>
                    <span className="sm:hidden">Out</span>
                  </button>
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden inline-flex items-center justify-center p-1.5 sm:p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0 transition-colors"
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300 relative z-40">
            <div className="px-2 pt-2 pb-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-300 ${
                    router.pathname === item.href
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate transition-colors duration-300">{user.email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">{user.role}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}

