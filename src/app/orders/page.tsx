"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOrdersList, OrdersListVM } from '../../services/ui/orderService';
import { PageHeader } from '../../ui/components/PageHeader';
import { StatCard } from '../../ui/components/StatCard';
import { DataTable } from '../../ui/components/DataTable';
import { EmptyState } from '../../ui/components/EmptyState';
import SeedDemoButton from '../../components/dev/SeedDemoButton';

declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test' | string;
  };
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<OrdersListVM[]>({ queryKey: ['ordersList'], queryFn: fetchOrdersList });

  const filtered: OrdersListVM[] = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => d.orderId.includes(search) || d.productId.includes(search));
  }, [data, search]);

  const stats = useMemo(() => {
    const total = data?.length ?? 0;
    const active = data?.filter((d) => d.completionPercent < 100).length ?? 0;
    const done = data?.reduce((s, x) => s + x.donePieces, 0) ?? 0;
    const scrap = data?.reduce((s, x) => s + x.scrapPieces, 0) ?? 0;
    const avg = data && data.length > 0 ? Math.round(data.reduce((s, x) => s + x.completionPercent, 0) / data.length) : 0;
    return { total, active, done, scrap, avg };
  }, [data]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="List of production orders">
        <div className="flex gap-2">
          <input aria-label="Search" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search orders" className="border p-2 rounded" />
          {process.env.NODE_ENV === 'development' && (
            <div className="hidden md:inline">
              <SeedDemoButton />
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Orders" value={stats.active} />
        <StatCard title="Done Pieces" value={stats.done} />
        <StatCard title="Scrap Pieces" value={stats.scrap} />
        <StatCard title="Avg Completion %" value={`${stats.avg}%`} small />
      </div>

      {isLoading && <div className="space-y-2"><div className="h-6 w-1/3 bg-slate-200 rounded animate-pulse"/></div>}
      {isError && <div className="text-red-600">Error loading orders. <button onClick={() => refetch()} className="underline">Retry</button></div>}

      {data && data.length === 0 && (
        <EmptyState
          title="No orders"
          subtitle="Seed demo data to get started"
          action={process.env.NODE_ENV === 'development' ? <SeedDemoButton /> : undefined}
        />
      )}

      {data && data.length > 0 && (
        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Order</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-right">Target</th>
              <th className="p-2 text-right">Done</th>
              <th className="p-2 text-right">Scrap</th>
              <th className="p-2 text-right">% Complete</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.orderId} className="hover:bg-slate-50 cursor-pointer">
                <td className="p-2"><Link href={`/orders/${r.orderId}`}>{r.orderId.slice(0,8)}</Link></td>
                <td className="p-2">{r.productId.slice(0,8)}</td>
                <td className="p-2 text-right">{r.targetPieces}</td>
                <td className="p-2 text-right">{r.donePieces}</td>
                <td className="p-2 text-right">{r.scrapPieces}</td>
                <td className="p-2 text-right">{Math.round(r.completionPercent)}%</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
