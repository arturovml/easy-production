"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../ui/components/PageHeader';
import { EmptyState } from '../../../ui/components/EmptyState';
import { LoadingSkeleton } from '../../../ui/components/LoadingSkeleton';
import { DataTable } from '../../../ui/components/DataTable';
import {
  fetchOperations,
  createOperation,
  updateOperation,
  type CreateOperationInput,
  type UpdateOperationInput,
} from '../../../services/ui/operationService';
import { Operation } from '../../../shared/schemas';

const OperationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  operationCode: z.string().min(1, 'Operation code is required'),
  samMinutes: z.number().int().positive('SAM must be greater than 0'),
  qualityGate: z.boolean().default(false),
});

type OperationFormData = z.infer<typeof OperationFormSchema>;

export default function OperationsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: operations, isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: fetchOperations,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OperationFormData>({
    resolver: zodResolver(OperationFormSchema),
    defaultValues: {
      qualityGate: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: createOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      reset();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOperationInput }) => updateOperation(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      setEditingId(null);
      reset();
    },
  });

  const onSubmit = (data: OperationFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (operation: Operation) => {
    setEditingId(operation.id);
    setShowForm(true);
    reset({
      name: operation.name,
      operationCode: operation.code,
      samMinutes: operation.durationMinutes,
      qualityGate: operation.qualityGate ?? false,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Operations"
        subtitle="Manage operation catalog"
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
              Create Operation
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Operation' : 'Create Operation'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input id="name" {...register('name')} className="w-full border rounded p-2" autoFocus />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="operationCode" className="block text-sm font-medium mb-1">
                Operation Code <span className="text-red-500">*</span>
              </label>
              <input id="operationCode" {...register('operationCode')} className="w-full border rounded p-2" />
              {errors.operationCode && <p className="text-red-500 text-sm mt-1">{errors.operationCode.message}</p>}
            </div>
            <div>
              <label htmlFor="samMinutes" className="block text-sm font-medium mb-1">
                SAM (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="samMinutes"
                {...register('samMinutes', { valueAsNumber: true })}
                min="1"
                step="1"
                className="w-full border rounded p-2"
              />
              {errors.samMinutes && <p className="text-red-500 text-sm mt-1">{errors.samMinutes.message}</p>}
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('qualityGate')} className="rounded" />
                <span className="text-sm">Quality Gate</span>
              </label>
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
          Error: {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create operation'}
        </div>
      )}
      {updateMutation.isError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update operation'}
        </div>
      )}

      {operations && operations.length === 0 && !isLoading && (
        <EmptyState title="No operations" subtitle="Create your first operation to get started" />
      )}

      {operations && operations.length > 0 && (
        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-right">SAM (min)</th>
              <th className="p-2 text-center">Quality Gate</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.id} className="hover:bg-slate-50">
                <td className="p-2">{operation.code}</td>
                <td className="p-2">{operation.name}</td>
                <td className="p-2 text-right">{operation.durationMinutes}</td>
                <td className="p-2 text-center">{operation.qualityGate ? '✓' : '-'}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(operation)}
                    className="px-2 py-1 text-sm bg-slate-200 rounded hover:bg-slate-300"
                  >
                    Edit
                  </button>
                  {/* TODO: Disable delete if operation is in use */}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

