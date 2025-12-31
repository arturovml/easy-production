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
    return data.filter((d) => 
      d.orderId.includes(search) || 
      d.productId.includes(search) || 
      d.productName.toLowerCase().includes(search.toLowerCase()) ||
      (d.productSku && d.productSku.toLowerCase().includes(search.toLowerCase()))
    );
  }, [data, search]);

  const stats = useMemo(() => {
    const total = data?.length ?? 0;
    const active = data?.filter((d) => d.completionPercent < 100).length ?? 0;
    const completed = data?.reduce((s, x) => s + x.completedPieces, 0) ?? 0;
    const wip = data?.reduce((s, x) => s + x.wipPieces, 0) ?? 0;
    const scrap = data?.reduce((s, x) => s + x.scrapPieces, 0) ?? 0;
    const avg = data && data.length > 0 ? Math.round(data.reduce((s, x) => s + x.completionPercent, 0) / data.length) : 0;
    return { total, active, completed, wip, scrap, avg };
  }, [data]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="List of production orders">
        <div className="flex gap-2">
          <input aria-label="Search" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search orders" className="border p-2 rounded" />
          <Link href="/orders/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
            New Order
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <div className="hidden md:inline">
              <SeedDemoButton />
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Orders" value={stats.active} />
        <StatCard title="Completed Pieces" value={stats.completed} subtitle={`Processed: ${stats.completed + stats.wip}`} />
        <StatCard title="WIP Pieces" value={stats.wip} />
        <StatCard title="Scrap Pieces" value={stats.scrap} />
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
              <th className="p-2 text-right">Completed</th>
              <th className="p-2 text-right">Scrap</th>
              <th className="p-2 text-right">% Complete</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.orderId} className="hover:bg-slate-50 cursor-pointer">
                <td className="p-2">
                  <Link href={`/orders/${r.orderId}`} className="font-medium">
                    Order {r.orderId.slice(0, 8)}
                  </Link>
                  <div className="text-xs text-muted-foreground">ID: {r.orderId.slice(0, 8)}...</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        r.trackingMode === 'piece'
                          ? 'bg-blue-100 text-blue-800'
                          : r.trackingMode === 'lot'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {r.trackingMode}
                    </span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="font-medium">{r.productName}</div>
                  {r.productSku && <div className="text-xs text-muted-foreground">SKU: {r.productSku}</div>}
                  <div className="text-xs text-muted-foreground">ID: {r.productId.slice(0, 8)}...</div>
                </td>
                <td className="p-2 text-right">{r.targetPieces}</td>
                <td className="p-2 text-right">
                  <div className="font-medium">{r.completedPieces}</div>
                  {r.wipPieces > 0 && <div className="text-xs text-muted-foreground">WIP: {r.wipPieces}</div>}
                </td>
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
