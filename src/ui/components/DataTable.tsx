import React from 'react';

export function DataTable({ children }: { children?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto bg-white border rounded">
      <table className="min-w-full divide-y table-auto">
        {children}
      </table>
    </div>
  );
}
