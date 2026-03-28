import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Takt-Flow Recovery System',
  description: 'Construction schedule tracking with recovery scoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">Takt-Flow</h1>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Recovery System</span>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/tracking" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/tracking/import" className="text-gray-600 hover:text-gray-900">Import</a>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
