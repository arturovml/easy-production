import React from 'react';

export function LoadingSkeleton({ className = 'h-6 bg-slate-200 rounded' }: { className?: string }) {
  return <div className={`${className} animate-pulse`}></div>;
}
