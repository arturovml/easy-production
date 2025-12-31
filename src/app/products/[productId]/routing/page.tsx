"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { PageHeader } from '../../../../ui/components/PageHeader';
import { EmptyState } from '../../../../ui/components/EmptyState';
import { LoadingSkeleton } from '../../../../ui/components/LoadingSkeleton';
import { DataTable } from '../../../../ui/components/DataTable';
import { fetchProductById } from '../../../../services/ui/productService';
import {
  fetchRoutingVersionsByProduct,
  fetchRoutingOperationsByVersion,
  createRoutingVersion,
  addRoutingOperation,
  deleteRoutingOperation,
  reorderRoutingOperations,
  publishRoutingVersion,
  type AddRoutingOperationInput,
} from '../../../../services/ui/routingService';
import { fetchOperations } from '../../../../services/ui/operationService';
import { fetchWorkCenters } from '../../../../services/ui/workCenterService';
import { RoutingVersion, RoutingOperation, Operation, WorkCenter } from '../../../../shared/schemas';

type OperationTableProps = {
  operations: RoutingOperation[];
  availableOperations: Operation[];
  workCenters: WorkCenter[];
  isDraft: boolean;
  onMove: (direction: 'up' | 'down', operationId: string) => void;
  onDelete: (operationId: string) => void;
  moveLoading: boolean;
  deleteLoading: boolean;
};

function OperationTable({
  operations,
  availableOperations,
  workCenters,
  isDraft,
  onMove,
  onDelete,
  moveLoading,
  deleteLoading,
}: OperationTableProps) {
  const getOperationName = (operationId: string): string => {
    const op = availableOperations.find((o) => o.id === operationId);
    return op ? `${op.code} - ${op.name}` : operationId.slice(0, 8);
  };

  const getOperationSAM = (op: RoutingOperation): number | null => {
    if (op.standardMinutesOverride) return op.standardMinutesOverride;
    const operation = availableOperations.find((o) => o.id === op.operationId);
    return operation ? operation.durationMinutes : null;
  };

  const getWorkCenterName = (workCenterId: string | undefined): string => {
    if (!workCenterId) return '-';
    const wc = workCenters.find((w) => w.id === workCenterId);
    return wc ? wc.name : workCenterId.slice(0, 8);
  };

  return (
    <DataTable>
      <thead className="bg-slate-50">
        <tr>
          <th className="p-2 text-center">Seq</th>
          <th className="p-2 text-left">Operation</th>
          <th className="p-2 text-right">SAM (min)</th>
          <th className="p-2 text-left">Work Center</th>
          {isDraft && <th className="p-2 text-center">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {operations.map((op, index) => {
          const sam = getOperationSAM(op);
          return (
            <tr key={op.id} className="hover:bg-slate-50">
              <td className="p-2 text-center">{op.sequence}</td>
              <td className="p-2">{getOperationName(op.operationId)}</td>
              <td className="p-2 text-right">
                {sam !== null ? (
                  <>
                    {sam}
                    {op.standardMinutesOverride && <span className="text-xs text-muted-foreground ml-1">(override)</span>}
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td className="p-2">{getWorkCenterName(op.workCenterIdOverride)}</td>
              {isDraft && (
                <td className="p-2">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => onMove('up', op.id)}
                      disabled={index === 0 || moveLoading}
                      className="px-2 py-1 text-sm bg-slate-200 rounded hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => onMove('down', op.id)}
                      disabled={index === operations.length - 1 || moveLoading}
                      className="px-2 py-1 text-sm bg-slate-200 rounded hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => onDelete(op.id)}
                      disabled={deleteLoading}
                      className="px-2 py-1 text-sm bg-red-200 rounded hover:bg-red-300 disabled:bg-slate-100"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

const AddOperationFormSchema = z.object({
  operationId: z.string().uuid('Operation is required'),
  standardMinutesOverride: z.preprocess(
    (val) => (val === '' || isNaN(Number(val)) ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  workCenterIdOverride: z.union([z.string().uuid(), z.literal('')]).optional(),
});

type AddOperationFormData = z.infer<typeof AddOperationFormSchema>;

export default function RoutingEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params?.productId as string;

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAddOperation, setShowAddOperation] = useState(false);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => (productId ? fetchProductById(productId) : undefined),
    enabled: !!productId,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['routingVersions', productId],
    queryFn: () => (productId ? fetchRoutingVersionsByProduct(productId) : []),
    enabled: !!productId,
  });

  const { data: operations, isLoading: operationsLoading } = useQuery({
    queryKey: ['routingOperations', selectedVersionId],
    queryFn: () => (selectedVersionId ? fetchRoutingOperationsByVersion(selectedVersionId) : []),
    enabled: !!selectedVersionId,
  });

  const { data: availableOperations } = useQuery({
    queryKey: ['operations'],
    queryFn: fetchOperations,
  });

  const { data: workCenters } = useQuery({
    queryKey: ['workCenters'],
    queryFn: fetchWorkCenters,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddOperationFormData>({
    resolver: zodResolver(AddOperationFormSchema),
  });

  const createVersionMutation = useMutation({
    mutationFn: () => (productId ? createRoutingVersion({ productId }) : Promise.reject(new Error('Product ID required'))),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ['routingVersions', productId] });
      setSelectedVersionId(newVersion.id);
    },
  });

  const addOperationMutation = useMutation({
    mutationFn: (input: AddRoutingOperationInput) => addRoutingOperation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingOperations', selectedVersionId] });
      reset();
      setShowAddOperation(false);
    },
  });

  const deleteOperationMutation = useMutation({
    mutationFn: (id: string) => deleteRoutingOperation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingOperations', selectedVersionId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => publishRoutingVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingVersions', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });

  const moveOperationMutation = useMutation({
    mutationFn: ({ direction, operationId }: { direction: 'up' | 'down'; operationId: string }) => {
      if (!operations) throw new Error('Operations not loaded');
      const currentIndex = operations.findIndex((op) => op.id === operationId);
      if (currentIndex === -1) throw new Error('Operation not found');
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= operations.length) throw new Error('Cannot move operation');

      const newOrder = [...operations.map((op) => op.id)];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

      return reorderRoutingOperations(selectedVersionId!, newOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingOperations', selectedVersionId] });
    },
  });

  const selectedVersion = versions?.find((v) => v.id === selectedVersionId);
  const isDraft = selectedVersion?.isDraft ?? false;

  const onAddOperation = async (data: AddOperationFormData) => {
    if (!selectedVersionId) return;
    await addOperationMutation.mutateAsync({
      routingVersionId: selectedVersionId,
      operationId: data.operationId,
      standardMinutesOverride: data.standardMinutesOverride,
      workCenterIdOverride: data.workCenterIdOverride && data.workCenterIdOverride !== '' ? data.workCenterIdOverride : undefined,
    });
  };

  const handleMove = (direction: 'up' | 'down', operationId: string) => {
    moveOperationMutation.mutate({ direction, operationId });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this operation from the routing?')) {
      deleteOperationMutation.mutate(id);
    }
  };

  const handlePublish = () => {
    if (!selectedVersionId) return;
    if (confirm('Publishing this version will make it active for new production orders. Continue?')) {
      publishMutation.mutate(selectedVersionId);
    }
  };

  if (productLoading || versionsLoading) {
    return <LoadingSkeleton />;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Routing Editor: ${product.name}`}
        subtitle={product.sku ? `SKU: ${product.sku}` : undefined}
        actions={
          <Link href="/catalog/products" className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">
            Back to Products
          </Link>
        }
      />

      {/* Routing Versions List */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Routing Versions</h3>
          <button
            onClick={() => createVersionMutation.mutate()}
            disabled={createVersionMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300"
          >
            {createVersionMutation.isPending ? 'Creating...' : 'Create New Version'}
          </button>
        </div>

        {versions && versions.length === 0 && <EmptyState title="No routing versions" subtitle="Create your first routing version" />}

        {versions && versions.length > 0 && (
          <div className="space-y-2">
            {versions.map((version) => {
              const isSelected = version.id === selectedVersionId;
              const isActive = product.activeRoutingVersionId === version.id;
              return (
                <div
                  key={version.id}
                  className={`p-4 border rounded cursor-pointer ${isSelected ? 'border-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Version {version.version}</span>
                      {version.isDraft && <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 rounded">Draft</span>}
                      {isActive && !version.isDraft && <span className="ml-2 px-2 py-1 text-xs bg-green-200 rounded">Active</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(version.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Routing Operations Editor */}
      {selectedVersionId && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Routing Operations</h3>
              {selectedVersion && (
                <p className="text-sm text-muted-foreground">
                  {selectedVersion.isDraft ? (
                    <span className="text-yellow-600">Draft version - Edit operations and publish when ready</span>
                  ) : (
                    <span className="text-green-600">Published version - Read only</span>
                  )}
                </p>
              )}
            </div>
            {isDraft && (
              <div className="flex gap-2">
                {!showAddOperation && (
                  <button
                    onClick={() => setShowAddOperation(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    Add Operation
                  </button>
                )}
                <button
                  onClick={handlePublish}
                  disabled={publishMutation.isPending || (operations && operations.length === 0)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-300"
                >
                  {publishMutation.isPending ? 'Publishing...' : 'Publish Version'}
                </button>
              </div>
            )}
          </div>

          {isDraft && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Publishing a version will affect new production orders only. Existing orders will continue using their snapshot.
              </p>
            </div>
          )}

          {showAddOperation && isDraft && (
            <div className="mb-6 p-4 border rounded">
              <h4 className="font-medium mb-4">Add Operation</h4>
              <form onSubmit={handleSubmit(onAddOperation)} className="space-y-4">
                <div>
                  <label htmlFor="operationId" className="block text-sm font-medium mb-1">
                    Operation <span className="text-red-500">*</span>
                  </label>
                  <select id="operationId" {...register('operationId')} className="w-full border rounded p-2">
                    <option value="">Select operation...</option>
                    {availableOperations?.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.code} - {op.name} (SAM: {op.durationMinutes} min)
                      </option>
                    ))}
                  </select>
                  {errors.operationId && <p className="text-red-500 text-sm mt-1">{errors.operationId.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="standardMinutesOverride" className="block text-sm font-medium mb-1">
                      Override SAM (minutes)
                    </label>
                    <input
                      type="number"
                      id="standardMinutesOverride"
                      {...register('standardMinutesOverride', { valueAsNumber: true })}
                      min="1"
                      step="1"
                      className="w-full border rounded p-2"
                      placeholder="Use operation default"
                    />
                    {errors.standardMinutesOverride && (
                      <p className="text-red-500 text-sm mt-1">{errors.standardMinutesOverride.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="workCenterIdOverride" className="block text-sm font-medium mb-1">
                      Override Work Center
                    </label>
                    <select id="workCenterIdOverride" {...register('workCenterIdOverride')} className="w-full border rounded p-2">
                      <option value="">Use operation default</option>
                      {workCenters?.map((wc) => (
                        <option key={wc.id} value={wc.id}>
                          {wc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addOperationMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300"
                  >
                    {addOperationMutation.isPending ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOperation(false);
                      reset();
                    }}
                    className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {operationsLoading && <LoadingSkeleton />}

          {operations && operations.length === 0 && !operationsLoading && (
            <EmptyState title="No operations" subtitle="Add operations to this routing version" />
          )}

          {operations && operations.length > 0 && (
            <OperationTable
              operations={operations}
              availableOperations={availableOperations || []}
              workCenters={workCenters || []}
              isDraft={isDraft}
              onMove={handleMove}
              onDelete={handleDelete}
              moveLoading={moveOperationMutation.isPending}
              deleteLoading={deleteOperationMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

