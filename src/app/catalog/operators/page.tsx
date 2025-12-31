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
import { fetchOperators, createOperator, updateOperator, type CreateOperatorInput, type UpdateOperatorInput } from '../../../services/ui/operatorService';
import { Operator } from '../../../shared/schemas';

const OperatorFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type OperatorFormData = z.infer<typeof OperatorFormSchema>;

export default function OperatorsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: fetchOperators,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OperatorFormData>({
    resolver: zodResolver(OperatorFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: createOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      reset();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOperatorInput }) => updateOperator(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      setEditingId(null);
      reset();
    },
  });

  const onSubmit = (data: OperatorFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (operator: Operator) => {
    setEditingId(operator.id);
    setShowForm(true);
    reset({ name: operator.name });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    reset();
  };

  return (
    <div>
      <PageHeader
        title="Operators"
        subtitle="Manage operator catalog"
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
              Create Operator
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Operator' : 'Create Operator'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input id="name" {...register('name')} className="w-full border rounded p-2" autoFocus />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
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
          Error: {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create operator'}
        </div>
      )}
      {updateMutation.isError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update operator'}
        </div>
      )}

      {operators && operators.length === 0 && !isLoading && (
        <EmptyState title="No operators" subtitle="Create your first operator to get started" />
      )}

      {operators && operators.length > 0 && (
        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => (
              <tr key={operator.id} className="hover:bg-slate-50">
                <td className="p-2">{operator.name}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(operator)}
                    className="px-2 py-1 text-sm bg-slate-200 rounded hover:bg-slate-300"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

