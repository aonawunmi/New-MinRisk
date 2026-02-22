/**
 * SEC Portal Layout Component
 *
 * Branded layout wrapper for the SEC Nigeria regulatory portal.
 * Activated when VITE_PORTAL_MODE=regulator is set in the environment.
 *
 * Renders a professional, governmental header with SEC Nigeria branding,
 * a main content area for child components (e.g. RegulatorDashboard),
 * and a footer crediting MinRisk.
 *
 * Color scheme: green/emerald reflecting Nigerian national colors
 * and the authority of a financial regulator.
 */

import React from 'react';
import { Shield, Building2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Environment helper
// ---------------------------------------------------------------------------

/**
 * Whether the application is running in regulator portal mode.
 * Set `VITE_PORTAL_MODE=regulator` in the environment to enable.
 */
export const isRegulatorPortal =
  import.meta.env.VITE_PORTAL_MODE === 'regulator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props accepted by SECPortalLayout. */
interface SECPortalLayoutProps {
  /** Page content rendered inside the main content area. */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SECPortalLayout
 *
 * Full-page branded wrapper for the SEC Nigeria Risk-Based Supervision Portal.
 * Provides a consistent header, content area, and footer across all regulator
 * portal views.
 */
export default function SECPortalLayout({ children }: SECPortalLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <header className="bg-emerald-800 text-white shadow-lg">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-white to-emerald-400" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {/* Logo / Shield icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-700 border border-emerald-600">
              <Shield className="w-7 h-7 text-emerald-200" />
            </div>

            {/* Title block */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight truncate">
                SEC Risk-Based Supervision Portal
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-emerald-200 truncate">
                  Securities and Exchange Commission of Nigeria
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom border accent */}
        <div className="h-0.5 bg-emerald-600" />
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Main Content                                                      */}
      {/* ----------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* ----------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ----------------------------------------------------------------- */}
      <footer className="bg-emerald-900 text-emerald-300 border-t border-emerald-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span>Powered by MinRisk</span>
            <span className="text-emerald-400">
              &copy; {currentYear} Securities and Exchange Commission of Nigeria.
              All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
