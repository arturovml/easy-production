"use client";

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function SeedDemoButton({ className }: { className?: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [message, error]);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // dynamic import to ensure this runs only on client and not bundled for server
      const { seedDemoData } = await import('../../seeds/seedDemoData');
      const result = await seedDemoData({ trackingMode: 'hybrid' });
      setMessage('Seed completed');
      // Invalidate relevant queries
      await qc.invalidateQueries(['ordersList']);
      await qc.invalidateQueries();
      console.debug('Seed result', result);
    } catch (e: any) {
      console.error('Seed failed', e);
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`inline-block ${className ?? ''}`}>
      <button
        aria-label="Seed demo data"
        onClick={handleSeed}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded ${loading ? 'bg-slate-300 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
          </svg>
        ) : (
          'Seed demo data'
        )}
      </button>

      {/* simple toast */}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50">
        {message && (
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow">{message}</div>
        )}
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow">Error: {error}</div>
        )}
      </div>
    </div>
  );
}
