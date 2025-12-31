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
  fetchWorkCenters,
  createWorkCenter,
  updateWorkCenter,
  type CreateWorkCenterInput,
  type UpdateWorkCenterInput,
} from '../../../services/ui/workCenterService';
import { WorkCenter } from '../../../shared/schemas';

const WorkCenterFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional(),
});

type WorkCenterFormData = z.infer<typeof WorkCenterFormSchema>;

export default function WorkCentersPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: workCenters, isLoading } = useQuery({
    queryKey: ['workCenters'],
    queryFn: fetchWorkCenters,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WorkCenterFormData>({
    resolver: zodResolver(WorkCenterFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: createWorkCenter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workCenters'] });
      reset();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkCenterInput }) => updateWorkCenter(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workCenters'] });
      setEditingId(null);
      reset();
    },
  });

  const onSubmit = (data: WorkCenterFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (workCenter: WorkCenter) => {
    setEditingId(workCenter.id);
    setShowForm(true);
    reset({
      name: workCenter.name,
      type: workCenter.type || '',
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
        title="Work Centers"
        subtitle="Manage work center catalog"
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
              Create Work Center
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Work Center' : 'Create Work Center'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input id="name" {...register('name')} className="w-full border rounded p-2" autoFocus />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Type
              </label>
              <input id="type" {...register('type')} className="w-full border rounded p-2" />
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
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
          Error: {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create work center'}
        </div>
      )}
      {updateMutation.isError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update work center'}
        </div>
      )}

      {workCenters && workCenters.length === 0 && !isLoading && (
        <EmptyState title="No work centers" subtitle="Create your first work center to get started" />
      )}

      {workCenters && workCenters.length > 0 && (
        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workCenters.map((workCenter) => (
              <tr key={workCenter.id} className="hover:bg-slate-50">
                <td className="p-2">{workCenter.name}</td>
                <td className="p-2">{workCenter.type || '-'}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(workCenter)}
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

