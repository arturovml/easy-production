"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { PageHeader } from '../../ui/components/PageHeader';
import { EmptyState } from '../../ui/components/EmptyState';
import { LoadingSkeleton } from '../../ui/components/LoadingSkeleton';
import { RecordProductionFormSchema, type RecordProductionFormData } from '../../shared/recordSchemas';
import { fetchOrdersList, type OrdersListVM } from '../../services/ui/orderService';
import { fetchOrderDetail } from '../../services/ui/orderService';
import {
  recordProduction,
  fetchOperators,
  fetchWorkCenters,
  fetchLotsByProduct,
} from '../../services/ui/recordService';
import { fetchOperations } from '../../services/ui/operationService';

type RoutingOperationSnapshot = {
  operationId: string;
  sequence: number;
  standardMinutes?: number;
  operationName?: string;
  operationCode?: string;
  defaultSAM?: number;
};

type RoutingSnapshot = {
  id: string;
  productId: string;
  operations: RoutingOperationSnapshot[];
};

export default function RecordPage() {
  const queryClient = useQueryClient();
  const [showScrap, setShowScrap] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<'piece' | 'lot' | 'hybrid'>('piece');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<RecordProductionFormData>({
    resolver: zodResolver(RecordProductionFormSchema),
    defaultValues: {
      qtyDonePieces: 1,
      qtyScrapPieces: 0,
    },
  });

  const watchedOrderId = watch('orderId');
  const watchedLotId = watch('lotId');

  // Fetch orders list
  const { data: orders, isLoading: ordersLoading } = useQuery<OrdersListVM[]>({
    queryKey: ['ordersList'],
    queryFn: fetchOrdersList,
  });

  // Fetch order detail when order is selected
  const { data: orderDetail, isLoading: orderDetailLoading } = useQuery({
    queryKey: ['orderDetail', watchedOrderId],
    queryFn: () => (watchedOrderId ? fetchOrderDetail(watchedOrderId) : null),
    enabled: !!watchedOrderId,
  });

  // Fetch operators
  const { data: operators, isLoading: operatorsLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: fetchOperators,
  });

  // Fetch work centers
  const { data: workCenters, isLoading: workCentersLoading } = useQuery({
    queryKey: ['workCenters'],
    queryFn: fetchWorkCenters,
  });

  // Fetch lots when order is selected and trackingMode != piece
  const orderProductId = orderDetail?.order?.productId;
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots', orderProductId],
    queryFn: () => (orderProductId ? fetchLotsByProduct(orderProductId) : []),
    enabled: !!orderProductId && trackingMode !== 'piece',
  });

  // Determine tracking mode based on lots availability
  useEffect(() => {
    if (lots && lots.length > 0) {
      setTrackingMode('hybrid'); // If lots exist, assume hybrid (could be lot or hybrid)
    } else if (orderProductId) {
      setTrackingMode('piece');
    }
  }, [lots, orderProductId]);

  // Fetch operations for display names
  const { data: allOperations } = useQuery({
    queryKey: ['operations'],
    queryFn: fetchOperations,
  });

  // Get routing operations from order detail, enriched with operation names
  const routingOperations = useMemo(() => {
    if (!orderDetail?.order?.routingVersionSnapshot) return [];
    const snapshot = orderDetail.order.routingVersionSnapshot as RoutingSnapshot;
    const ops = snapshot.operations || [];
    
    // Enrich with operation names
    return ops.map((op) => {
      const operation = allOperations?.find((o) => o.id === op.operationId);
      return {
        ...op,
        operationName: operation?.name,
        operationCode: operation?.code,
        defaultSAM: operation?.durationMinutes,
      };
    });
  }, [orderDetail, allOperations]);


  // Mutation for recording production
  const recordMutation = useMutation({
    mutationFn: recordProduction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ordersList'] });
      queryClient.invalidateQueries({ queryKey: ['orderDetail', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const onSubmit = async (data: RecordProductionFormData) => {
    try {
      // Validate lotId is required if trackingMode != piece
      if (trackingMode !== 'piece' && (!data.lotId || data.lotId === '')) {
        throw new Error('Lot is required when tracking mode is not piece');
      }

      // Clean up empty strings to undefined
      const cleanData = {
        ...data,
        workCenterId: data.workCenterId === '' ? undefined : data.workCenterId,
        lotId: data.lotId === '' ? undefined : data.lotId,
        note: data.note?.trim() === '' ? undefined : data.note?.trim(),
      };

      await recordMutation.mutateAsync(cleanData);
      // Success - form will be reset by success handler
    } catch (error) {
      // Error is handled by mutation error state
      console.error('Error recording production:', error);
      throw error;
    }
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    setValue('orderId', orderId);
    // Reset dependent fields
    setValue('operationId', '');
    setValue('lotId', '');
  };

  const selectedOrder = orders?.find((o) => o.orderId === watchedOrderId);
  const isLoading = ordersLoading || orderDetailLoading || operatorsLoading || workCentersLoading;

  return (
    <div>
      <PageHeader title="Record Production" subtitle="Register production output and scrap" />

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Selection */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Order Selection</h3>
            {ordersLoading ? (
              <LoadingSkeleton />
            ) : !orders || orders.length === 0 ? (
              <EmptyState title="No orders available" subtitle="Seed demo data to get started" />
            ) : (
              <div className="space-y-2">
                <label htmlFor="orderId" className="block text-sm font-medium">
                  Production Order <span className="text-red-500">*</span>
                </label>
                <select
                  id="orderId"
                  {...register('orderId')}
                  onChange={(e) => {
                    handleOrderSelect(e.target.value);
                  }}
                  className="w-full border rounded p-2"
                  autoFocus
                >
                  <option value="">Select an order...</option>
                  {orders.map((order) => {
                    const orderDisplay = order.orderId.slice(0, 8);
                    const productDisplay = order.productName || `Product (${order.productId.slice(0, 8)}...)`;
                    return (
                      <option key={order.orderId} value={order.orderId}>
                        Order {orderDisplay} — {productDisplay} — Target: {order.targetPieces} ({Math.round(order.completionPercent)}% complete)
                      </option>
                    );
                  })}
                </select>
                {errors.orderId && <p className="text-red-500 text-sm">{errors.orderId.message}</p>}
                {selectedOrder && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Target: {selectedOrder.targetPieces} pieces</p>
                    <p>Completed: {selectedOrder.completedPieces} | Scrap: {selectedOrder.scrapPieces}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Operation Selection */}
          {watchedOrderId && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Operation Selection</h3>
              {orderDetailLoading ? (
                <LoadingSkeleton />
              ) : routingOperations.length === 0 ? (
                <EmptyState title="No operations found" subtitle="Order routing snapshot is invalid" />
              ) : (
                <div className="space-y-2">
                  <label htmlFor="operationId" className="block text-sm font-medium">
                    Operation <span className="text-red-500">*</span>
                  </label>
                  <select id="operationId" {...register('operationId')} className="w-full border rounded p-2">
                    <option value="">Select an operation...</option>
                    {routingOperations.map((op) => {
                      const operationName = op.operationName || `Operation (${op.operationId.slice(0, 8)}...)`;
                      const sam = op.standardMinutes ?? op.defaultSAM ?? null;
                      const samDisplay = sam !== null ? ` — SAM ${sam} min` : '';
                      return (
                        <option key={op.operationId} value={op.operationId}>
                          {op.sequence}. {operationName}{samDisplay}
                        </option>
                      );
                    })}
                  </select>
                  {errors.operationId && <p className="text-red-500 text-sm">{errors.operationId.message}</p>}
                </div>
              )}
            </div>
          )}

          {/* Operator and Work Center */}
          {watchedOrderId && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="operatorId" className="block text-sm font-medium">
                    Operator <span className="text-red-500">*</span>
                  </label>
                  {operatorsLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <select id="operatorId" {...register('operatorId')} className="w-full border rounded p-2">
                      <option value="">Select operator...</option>
                      {operators?.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.operatorId && <p className="text-red-500 text-sm">{errors.operatorId.message}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="workCenterId" className="block text-sm font-medium">
                    Work Center
                  </label>
                  {workCentersLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <select id="workCenterId" {...register('workCenterId')} className="w-full border rounded p-2">
                      <option value="">None</option>
                      {workCenters?.map((wc) => (
                        <option key={wc.id} value={wc.id}>
                          {wc.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.workCenterId && <p className="text-red-500 text-sm">{errors.workCenterId.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Lot Selection (only if trackingMode != piece) */}
          {watchedOrderId && trackingMode !== 'piece' && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Lot Selection</h3>
              {lotsLoading ? (
                <LoadingSkeleton />
              ) : !lots || lots.length === 0 ? (
                <EmptyState
                  title="No lots available"
                  subtitle="Create lots for this product to record production. TODO: Implement lot creation"
                />
              ) : (
                <div className="space-y-2">
                  <label htmlFor="lotId" className="block text-sm font-medium">
                    Lot <span className="text-red-500">*</span>
                  </label>
                  <select id="lotId" {...register('lotId')} className="w-full border rounded p-2">
                    <option value="">Select a lot...</option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        Lot {lot.id.slice(0, 8)} - Qty: {lot.quantity}
                      </option>
                    ))}
                  </select>
                  {errors.lotId && <p className="text-red-500 text-sm">{errors.lotId.message}</p>}
                </div>
              )}
            </div>
          )}

          {/* Quantity Done */}
          {watchedOrderId && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Production Output</h3>
              <div className="space-y-2">
                <label htmlFor="qtyDonePieces" className="block text-sm font-medium">
                  Quantity Done (pieces) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="qtyDonePieces"
                  {...register('qtyDonePieces', { valueAsNumber: true })}
                  min="1"
                  step="1"
                  className="w-full border rounded p-2"
                />
                {errors.qtyDonePieces && <p className="text-red-500 text-sm">{errors.qtyDonePieces.message}</p>}
              </div>
            </div>
          )}

          {/* Scrap Section (Collapsible) */}
          {watchedOrderId && (
            <div className="bg-white border rounded-lg p-6">
              <button
                type="button"
                onClick={() => setShowScrap(!showScrap)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-medium">Report Scrap (Optional)</h3>
                <span className="text-sm">{showScrap ? '−' : '+'}</span>
              </button>
              {showScrap && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="qtyScrapPieces" className="block text-sm font-medium">
                      Scrap Quantity (pieces)
                    </label>
                    <input
                      type="number"
                      id="qtyScrapPieces"
                      {...register('qtyScrapPieces', { valueAsNumber: true })}
                      min="0"
                      step="1"
                      className="w-full border rounded p-2"
                    />
                    {errors.qtyScrapPieces && <p className="text-red-500 text-sm">{errors.qtyScrapPieces.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="note" className="block text-sm font-medium">
                      Note (optional)
                    </label>
                    <textarea
                      id="note"
                      {...register('note')}
                      rows={3}
                      maxLength={500}
                      className="w-full border rounded p-2"
                      placeholder="Add any notes about this production record..."
                    />
                    {errors.note && <p className="text-red-500 text-sm">{errors.note.message}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {watchedOrderId && (
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || recordMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSubmitting || recordMutation.isPending ? 'Recording...' : 'Record Production'}
              </button>
              {recordMutation.isSuccess && (
                <>
                  <Link
                    href={`/orders/${watchedOrderId}`}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 inline-block text-center"
                  >
                    View Order
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setSelectedOrderId(null);
                      setShowScrap(false);
                      recordMutation.reset();
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
                  >
                    Record Another
                  </button>
                </>
              )}
            </div>
          )}

          {/* Error Toast */}
          {recordMutation.isError && (
            <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow z-50">
              Error: {recordMutation.error instanceof Error ? recordMutation.error.message : 'Failed to record production'}
            </div>
          )}

          {/* Success Toast */}
          {recordMutation.isSuccess && (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
              Production recorded successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

