import React from 'react';

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="p-6 border rounded text-center">
      <h3 className="text-lg font-medium">{title}</h3>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
