"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../../ui/components/PageHeader';
import { fetchOrderDetail, type OrderDetailVM } from '../../../services/ui/orderService';
import { StatCard } from '../../../ui/components/StatCard';
import { DataTable } from '../../../ui/components/DataTable';
import { EmptyState } from '../../../ui/components/EmptyState';

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

  const { order, stages, processedPieces, completedPieces, wipPieces, completionPercent, avgStageProgress, lots } = data as OrderDetailVM;
  const scrap = stages.reduce((s, st) => s + st.scrapPieces, 0);
  const stdMinutes = stages.reduce((s, st) => s + st.standardMinutesProduced, 0);
  const trackingMode = order.trackingMode ?? 'piece';

  return (
    <div>
      <PageHeader 
        title={`Order ${order.id.slice(0, 8)}`} 
        subtitle={`Product ID: ${order.productId.slice(0, 8)}...`}
        actions={
          <span
            className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
              trackingMode === 'piece'
                ? 'bg-blue-100 text-blue-800'
                : trackingMode === 'lot'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {trackingMode} tracking
          </span>
        }
      />

      <div className={`grid grid-cols-1 gap-4 mb-6 ${wipPieces > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <StatCard title="Completed" value={completedPieces} subtitle={`Processed: ${processedPieces}`} />
        {wipPieces > 0 && <StatCard title="WIP" value={wipPieces} />}
        <StatCard title="Scrap" value={scrap} />
        <StatCard title="% Complete" value={`${Math.round(completionPercent)}%`} subtitle={avgStageProgress !== undefined ? `Avg stage: ${Math.round(avgStageProgress)}%` : undefined} />
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
          {stages.map((s) => (
            <tr key={s.operationId} className="hover:bg-slate-50">
              <td className="p-2">{s.sequence}</td>
              <td className="p-2">
                <div className="font-medium">{s.operationName || `Operation (${s.operationId.slice(0, 8)}...)`}</div>
                <div className="text-xs text-muted-foreground">ID: {s.operationId.slice(0, 8)}...</div>
              </td>
              <td className="p-2 text-right">{s.standardMinutesProduced > 0 ? Math.round(s.standardMinutesProduced / Math.max(1, s.donePieces - s.scrapPieces)) : 0}</td>
              <td className="p-2 text-right">{s.donePieces}</td>
              <td className="p-2 text-right">{s.scrapPieces}</td>
              <td className="p-2 text-right">{s.standardMinutesProduced}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {/* Lots Section (only for lot/hybrid tracking) */}
      {trackingMode !== 'piece' && (
        <div className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Lots</h3>
            <p className="text-sm text-muted-foreground">Lots associated with this order</p>
          </div>
          {!lots || lots.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This order requires lots but none exist. This should not happen for new orders.
              </p>
              <p className="text-xs text-yellow-700 mt-1">TODO: Implement lot creation UI</p>
            </div>
          ) : (
            <DataTable>
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">Lot Number</th>
                  <th className="p-2 text-right">Planned</th>
                  <th className="p-2 text-right">Done</th>
                  <th className="p-2 text-right">Remaining</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50">
                    <td className="p-2 font-medium">Lot #{lot.lotNumber}</td>
                    <td className="p-2 text-right">{lot.plannedPieces}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>{lot.donePieces}</span>
                        {lot.overProduced && (
                          <span className="text-xs text-orange-600 font-medium" title="Over produced">
                            (Over)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">{lot.remainingPieces}</td>
                    <td className="p-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lot.status === 'not_started'
                            ? 'bg-gray-100 text-gray-800'
                            : lot.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {lot.status === 'not_started'
                          ? 'Not started'
                          : lot.status === 'in_progress'
                          ? 'In progress'
                          : 'Done'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      )}
    </div>
  );
}
