'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fix #6: Close menu on pathname change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Extract planId from path like /schedule/123 or /schedule/123/site-walk
  const planMatch = pathname.match(/^\/schedule\/(\d+)/);
  const planId = planMatch ? planMatch[1] : null;

  // Whether we're inside a plan context (bottom nav handles plan links on mobile)
  const inPlanContext = !!planId;

  // Derive current plan name from path segment (will be shown generically)
  const planLinks = planId
    ? [
        { href: `/schedule/${planId}`, label: 'Timeline' },
        { href: `/schedule/${planId}/site-walk`, label: 'Site Walk' },
        { href: `/schedule/${planId}/map`, label: 'Map' },
        { href: `/schedule/${planId}/scorecard`, label: 'Scorecard' },
      ]
    : [];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Takt-Flow</h1>
            <span className={`text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ${inPlanContext ? 'hidden sm:inline' : ''}`}>
              Recovery System
            </span>
          </Link>
          {planId && (
            <span className="text-sm text-gray-500 border-l border-gray-200 pl-3 ml-1">
              Plan #{planId}
            </span>
          )}
        </div>

        {/* Desktop nav — Fix #6: min-h-[44px] flex items-center */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${
              pathname === '/' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/import"
            className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${
              pathname === '/import' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Import
          </Link>
          <Link
            href="/companies"
            className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${
              pathname === '/companies' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Companies
          </Link>
          <Link
            href="/settings"
            className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${
              pathname === '/settings' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Settings
          </Link>
          {planLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2.5 rounded-lg transition min-h-[44px] flex items-center ${
                isActive(link.href)
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Hamburger button for mobile — Fix #6: min-w-[48px] min-h-[48px] */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-3 rounded-lg hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <nav className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={`px-3 py-3 rounded-lg text-sm transition min-h-[48px] flex items-center ${
              pathname === '/' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/import"
            onClick={() => setMenuOpen(false)}
            className={`px-3 py-3 rounded-lg text-sm transition ${
              pathname === '/import' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Import Schedule
          </Link>
          <Link
            href="/companies"
            onClick={() => setMenuOpen(false)}
            className={`px-3 py-3 rounded-lg text-sm transition ${
              pathname === '/companies' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Companies
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className={`px-3 py-3 rounded-lg text-sm transition ${
              pathname === '/settings' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Settings
          </Link>
          {/* Map link shown in hamburger when in plan context — Map is not in bottom bar (per D-10) */}
          {inPlanContext && planId && (
            <Link
              href={`/schedule/${planId}/map`}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-3 rounded-lg text-sm transition min-h-[48px] flex items-center ${
                pathname.includes('/map') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Map
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
