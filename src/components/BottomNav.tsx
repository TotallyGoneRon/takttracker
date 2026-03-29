'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ListTodo, Footprints, Trophy } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function BottomNav() {
  const pathname = usePathname();

  // Only show bottom nav inside plan context (e.g. /schedule/123, /schedule/123/site-walk)
  const planMatch = pathname.match(/^\/schedule\/(\d+)/);
  if (!planMatch) return null;

  const planId = planMatch[1];

  const tabs: Tab[] = [
    { href: '/', icon: Home, label: 'Home' },
    { href: `/schedule/${planId}`, icon: ListTodo, label: 'Timeline' },
    { href: `/schedule/${planId}/site-walk`, icon: Footprints, label: 'Walk' },
    { href: `/schedule/${planId}/scorecard`, icon: Trophy, label: 'Score' },
  ];

  const isActive = (tab: Tab) => {
    if (tab.label === 'Home') return pathname === '/';
    if (tab.label === 'Timeline') return pathname === `/schedule/${planId}`;
    if (tab.label === 'Walk') return pathname.startsWith(`/schedule/${planId}/site-walk`);
    if (tab.label === 'Score') return pathname.startsWith(`/schedule/${planId}/scorecard`);
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50 safe-area-pb">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 min-h-[48px] min-w-[48px] justify-center ${
              active ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
