import React from 'react';

export function PageHeader({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  const right = actions ?? children;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div>{right}</div>
      </div>
    </div>
  );
}
