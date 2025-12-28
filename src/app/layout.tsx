import './globals.css';
import React from 'react';
import Link from 'next/link';
import Providers from './Providers';

export const metadata = {
  title: 'Easy Production',
  description: 'MES ligero - demo'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="flex">
              <aside className="w-64 bg-white border-r hidden md:block">
                <div className="p-4 font-bold text-xl">Easy Production</div>
                <nav className="p-4 space-y-2">
                  <Link className="block p-2 rounded hover:bg-slate-100" href="/orders">Orders</Link>
                  <Link className="block p-2 rounded hover:bg-slate-100" href="/catalog">Catalog (Coming soon)</Link>
                  <Link className="block p-2 rounded hover:bg-slate-100" href="/record">Record (Coming soon)</Link>
                </nav>
              </aside>
              <main className="flex-1 p-6">
                <header className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-semibold">Easy Production</h1>
                    <span className="text-sm text-muted-foreground">Light MES demo</span>
                  </div>
                </header>
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
