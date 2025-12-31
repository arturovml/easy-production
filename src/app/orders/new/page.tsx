"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { PageHeader } from '../../../ui/components/PageHeader';
import { EmptyState } from '../../../ui/components/EmptyState';
import { LoadingSkeleton } from '../../../ui/components/LoadingSkeleton';
import { CreateOrderFormSchema, type CreateOrderFormData } from '../../../shared/orderSchemas';
import { fetchProducts } from '../../../services/ui/productService';
import { createProductionOrder, type CreateProductionOrderInput } from '../../../services/ui/orderService';

export default function NewOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(CreateOrderFormSchema),
    defaultValues: {
      quantityRequested: 100,
      trackingMode: 'piece',
    },
  });

  const selectedProductId = watch('productId');
  const trackingMode = watch('trackingMode');
  const selectedProduct = useMemo(() => {
    return products?.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const createMutation = useMutation({
    mutationFn: (input: CreateProductionOrderInput) => createProductionOrder(input),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['ordersList'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push(`/orders/${order.id}`);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const onSubmit = async (data: CreateOrderFormData) => {
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync({
        productId: data.productId,
        quantityRequested: data.quantityRequested,
        trackingMode: data.trackingMode,
        lotSize: data.lotSize,
        notes: data.notes,
      });
    } catch (error) {
      // Error is handled by mutation onError
      console.error('Error creating order:', error);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create Production Order"
        subtitle="Create a new production order from a product with published routing"
        actions={
          <Link href="/orders" className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">
            Back to Orders
          </Link>
        }
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Order Details</h3>

            {/* Product Selection */}
            <div className="space-y-2 mb-4">
              <label htmlFor="productId" className="block text-sm font-medium">
                Product <span className="text-red-500">*</span>
              </label>
              {productsLoading ? (
                <LoadingSkeleton />
              ) : !products || products.length === 0 ? (
                <EmptyState
                  title="No products available"
                  subtitle="Create a product first"
                  action={
                    <Link href="/catalog/products" className="text-blue-600 underline">
                      Go to Products Catalog
                    </Link>
                  }
                />
              ) : (
                <>
                  <select
                    id="productId"
                    {...register('productId')}
                    className="w-full border rounded p-2"
                    autoFocus
                  >
                    <option value="">Select a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.sku ? `(${product.sku})` : ''}
                        {product.activeRoutingVersionId ? ' ✓' : ' (no routing)'}
                      </option>
                    ))}
                  </select>
                  {errors.productId && <p className="text-red-500 text-sm">{errors.productId.message}</p>}
                  {selectedProduct && !selectedProduct.activeRoutingVersionId && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>No active routing:</strong> This product needs a published routing version.
                      </p>
                      <Link
                        href={`/products/${selectedProduct.id}/routing`}
                        className="text-sm text-blue-600 underline mt-1 inline-block"
                      >
                        Configure routing →
                      </Link>
                    </div>
                  )}
                  {selectedProduct && selectedProduct.activeRoutingVersionId && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800">
                        <strong>✓ Active routing available</strong>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Target Pieces */}
            <div className="space-y-2 mb-4">
              <label htmlFor="quantityRequested" className="block text-sm font-medium">
                Target Pieces <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantityRequested"
                {...register('quantityRequested', { valueAsNumber: true })}
                min="1"
                step="1"
                className="w-full border rounded p-2"
              />
              {errors.quantityRequested && <p className="text-red-500 text-sm">{errors.quantityRequested.message}</p>}
            </div>

            {/* Tracking Mode */}
            <div className="space-y-2 mb-4">
              <label htmlFor="trackingMode" className="block text-sm font-medium">
                Tracking Mode <span className="text-red-500">*</span>
              </label>
              <select id="trackingMode" {...register('trackingMode')} className="w-full border rounded p-2">
                <option value="piece">Piece - Track by individual pieces</option>
                <option value="lot">Lot - Track by lots, requires choosing a lot when recording</option>
                <option value="hybrid">Hybrid - Allows recording by lot but keeps piece-level counts</option>
              </select>
              {errors.trackingMode && <p className="text-red-500 text-sm">{errors.trackingMode.message}</p>}
              {trackingMode === 'lot' && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Lot tracking:</strong> Tracks progress by lots, requires choosing a lot when recording.
                  </p>
                </div>
              )}
              {trackingMode === 'hybrid' && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Hybrid tracking:</strong> Allows recording by lot but keeps piece-level counts.
                  </p>
                </div>
              )}
            </div>

            {/* Lot Size (conditional) */}
            {trackingMode !== 'piece' && (
              <div className="space-y-2 mb-4">
                <label htmlFor="lotSize" className="block text-sm font-medium">
                  Lot Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="lotSize"
                  {...register('lotSize', { valueAsNumber: true })}
                  min="1"
                  step="1"
                  className="w-full border rounded p-2"
                  placeholder="Pieces per lot"
                />
                {errors.lotSize && <p className="text-red-500 text-sm">{errors.lotSize.message}</p>}
                {watch('quantityRequested') && watch('lotSize') && (
                  <p className="text-sm text-muted-foreground">
                    Will create {Math.ceil((watch('quantityRequested') || 0) / (watch('lotSize') || 1))} lot(s)
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={3}
                maxLength={1000}
                className="w-full border rounded p-2"
                placeholder="Add any notes about this order..."
              />
              {errors.notes && <p className="text-red-500 text-sm">{errors.notes.message}</p>}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              <p className="text-red-800 font-medium">Error creating order</p>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
              {errorMessage.includes('Publish a routing version') && selectedProduct && (
                <Link
                  href={`/products/${selectedProduct.id}/routing`}
                  className="text-sm text-blue-600 underline mt-2 inline-block"
                >
                  Go to routing editor →
                </Link>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createMutation.isPending || !selectedProduct?.activeRoutingVersionId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Order'}
            </button>
            <Link href="/orders" className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

