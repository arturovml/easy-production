import React from 'react';

export function StatCard({ title, value, small, subtitle }: { title: string; value: React.ReactNode; small?: boolean; subtitle?: string }) {
  return (
    <div className="p-4 bg-white border rounded">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`text-xl font-semibold ${small ? 'text-lg' : ''}`}>{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}
