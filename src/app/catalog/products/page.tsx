"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { PageHeader } from '../../../ui/components/PageHeader';
import { EmptyState } from '../../../ui/components/EmptyState';
import { LoadingSkeleton } from '../../../ui/components/LoadingSkeleton';
import { DataTable } from '../../../ui/components/DataTable';
import { fetchProducts, createProduct, updateProduct, type CreateProductInput, type UpdateProductInput } from '../../../services/ui/productService';
import { Product } from '../../../shared/schemas';

const ProductFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
});

type ProductFormData = z.infer<typeof ProductFormSchema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reset();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => updateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingId(null);
      reset();
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setShowForm(true);
    reset({ name: product.name, sku: product.sku || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage product catalog"
        actions={
          !showForm && (
            <button
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
                reset();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Create Product
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Product' : 'Create Product'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                {...register('name')}
                className="w-full border rounded p-2"
                autoFocus
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="sku" className="block text-sm font-medium mb-1">
                SKU
              </label>
              <input id="sku" {...register('sku')} className="w-full border rounded p-2" />
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <LoadingSkeleton />}
      {createMutation.isError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create product'}
        </div>
      )}
      {updateMutation.isError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update product'}
        </div>
      )}

      {products && products.length === 0 && !isLoading && (
        <EmptyState title="No products" subtitle="Create your first product to get started" />
      )}

      {products && products.length > 0 && (
        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="p-2">{product.name}</td>
                <td className="p-2">{product.sku || '-'}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-2 py-1 text-sm bg-slate-200 rounded hover:bg-slate-300"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/products/${product.id}/routing`}
                      className="px-2 py-1 text-sm bg-blue-200 rounded hover:bg-blue-300"
                    >
                      Configure Routing
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

