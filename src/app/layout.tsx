import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NavBar } from './NavBar';

export const metadata: Metadata = {
  title: 'Takt-Flow Recovery System',
  description: 'Construction schedule tracking with recovery scoring',
};

// Fix #11: Explicit viewport for tablet optimization
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <NavBar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
