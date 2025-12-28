"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../../ui/components/PageHeader';
import { fetchOrderDetail } from '../../../services/ui/orderService';
import { StatCard } from '../../../ui/components/StatCard';
import { DataTable } from '../../../ui/components/DataTable';
import type { StageProgressVM } from '../../../domain/viewModels';

export default function OrderDetailPageClient() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const { data, isLoading, isError } = useQuery(
    ['orderDetail', id],
    async () => (id ? await fetchOrderDetail(id) : null),
    { enabled: !!id }
  );

  if (isLoading) return <div>Loading...</div>;
  if (isError || !data) return <div>Order not found</div>;

  const { order, stages } = data as { order: any; stages: StageProgressVM[] };
  const done = stages.reduce((s, st) => s + st.donePieces, 0);
  const scrap = stages.reduce((s, st) => s + st.scrapPieces, 0);
  const target = order.quantityRequested;
  const completion = target > 0 ? Math.min(100, (done / target) * 100) : 0;
  const stdMinutes = stages.reduce((s, st) => s + st.standardMinutesProduced, 0);

  return (
    <div>
      <PageHeader title={`Order ${order.id.slice(0,8)}`} subtitle={`Product ${order.productId.slice(0,8)}`} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Done" value={done} />
        <StatCard title="Scrap" value={scrap} />
        <StatCard title="% Complete" value={`${Math.round(completion)}%`} />
        <StatCard title="Standard Minutes" value={Math.round(stdMinutes)} />
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium">Operations</h3>
        <p className="text-sm text-muted-foreground">Per operation progress and standard minutes</p>
      </div>

      <DataTable>
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 text-left">Seq</th>
            <th className="p-2 text-left">Operation</th>
            <th className="p-2 text-right">SAM</th>
            <th className="p-2 text-right">Done</th>
            <th className="p-2 text-right">Scrap</th>
            <th className="p-2 text-right">Std minutes</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s: StageProgressVM) => (
            <tr key={s.operationId} className="hover:bg-slate-50">
              <td className="p-2">{s.sequence}</td>
              <td className="p-2">{s.operationId.slice(0,8)}</td>
              <td className="p-2 text-right">{s.standardMinutesProduced > 0 ? Math.round(s.standardMinutesProduced / Math.max(1, s.donePieces - s.scrapPieces)) : 0}</td>
              <td className="p-2 text-right">{s.donePieces}</td>
              <td className="p-2 text-right">{s.scrapPieces}</td>
              <td className="p-2 text-right">{s.standardMinutesProduced}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
