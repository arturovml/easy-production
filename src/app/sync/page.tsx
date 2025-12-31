"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../ui/components/PageHeader';
import { StatCard } from '../../ui/components/StatCard';
import { DataTable } from '../../ui/components/DataTable';
import { OutboxRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { MockTransportDexie } from '../../services/sync/mockTransport';
import { syncService, type FlushResult } from '../../services/sync/syncService';
import { OutboxEvent } from '../../shared/schemas';

const outboxRepo = new OutboxRepositoryDexie();
const transport = new MockTransportDexie();

export default function SyncPage() {
  const queryClient = useQueryClient();
  const [failureRate, setFailureRate] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'failed'>('pending');
  const [selectedFailedIds, setSelectedFailedIds] = useState<Set<string>>(new Set());

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ['outboxCounts'],
    queryFn: async () => {
      const [pending, sent, failed, remote] = await Promise.all([
        outboxRepo.countByStatus('pending'),
        outboxRepo.countByStatus('sent'),
        outboxRepo.countByStatus('failed'),
        transport.countReceived(),
      ]);
      return { pending, sent, failed, remote };
    },
  });

  // Fetch pending events
  const { data: pendingEvents } = useQuery({
    queryKey: ['outboxPending'],
    queryFn: () => outboxRepo.listPending(100),
  });

  // Fetch failed events
  const { data: failedEvents } = useQuery({
    queryKey: ['outboxFailed'],
    queryFn: () => outboxRepo.listFailed(),
  });

  // Flush mutation
  const flushMutation = useMutation({
    mutationFn: (args?: { limit?: number; failureRate?: number }) => syncService.flushOutboxOnce(args),
    onSuccess: (result: FlushResult) => {
      queryClient.invalidateQueries({ queryKey: ['outboxCounts'] });
      queryClient.invalidateQueries({ queryKey: ['outboxPending'] });
      queryClient.invalidateQueries({ queryKey: ['outboxFailed'] });
      // Show toast-like message
      const message = `Flush completed: ${result.sent} sent, ${result.failed} failed, ${result.deduped} deduped`;
      console.log(message);
      alert(message); // Simple alert for now, can be replaced with toast component
    },
    onError: (error: Error) => {
      console.error('Flush failed:', error);
      alert(`Flush failed: ${error.message}`);
    },
  });

  const handleFlush = () => {
    flushMutation.mutate({ limit: 20, failureRate });
  };

  // Retry failed mutation
  const retryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await outboxRepo.resetFailedToPending(ids, true); // Reset error messages
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outboxCounts'] });
      queryClient.invalidateQueries({ queryKey: ['outboxPending'] });
      queryClient.invalidateQueries({ queryKey: ['outboxFailed'] });
      setSelectedFailedIds(new Set());
      alert('Failed events reset to pending. You can now flush them.');
    },
    onError: (error: Error) => {
      console.error('Retry failed:', error);
      alert(`Retry failed: ${error.message}`);
    },
  });

  const handleRetrySelected = () => {
    if (selectedFailedIds.size === 0) {
      alert('Please select events to retry');
      return;
    }
    retryMutation.mutate(Array.from(selectedFailedIds));
  };

  const handleRetryAll = () => {
    if (!failedEvents || failedEvents.length === 0) {
      alert('No failed events to retry');
      return;
    }
    retryMutation.mutate(failedEvents.map((e) => e.id));
  };

  const toggleFailedSelection = (id: string) => {
    const newSet = new Set(selectedFailedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFailedIds(newSet);
  };

  const displayEvents = activeTab === 'pending' ? pendingEvents : failedEvents;

  const getEventType = (event: OutboxEvent): string => {
    const payload = event.payload as Record<string, unknown> | undefined;
    return (payload?.type as string) ?? 'Unknown';
  };

  const getAggregateId = (event: OutboxEvent): string => {
    return event.aggregateId ?? 'N/A';
  };

  return (
    <div>
      <PageHeader title="Sync" subtitle="Outbox sync simulator (dev only)" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending" value={counts?.pending ?? 0} />
        <StatCard title="Sent" value={counts?.sent ?? 0} />
        <StatCard title="Failed" value={counts?.failed ?? 0} />
        <StatCard title="Remote Received" value={counts?.remote ?? 0} />
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="failureRate" className="block text-sm font-medium mb-2">
              Failure Rate: {(failureRate * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              id="failureRate"
              min="0"
              max="1"
              step="0.1"
              value={failureRate}
              onChange={(e) => setFailureRate(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <button
            onClick={handleFlush}
            disabled={flushMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {flushMutation.isPending ? 'Flushing...' : 'Flush Outbox Now'}
          </button>
          {activeTab === 'failed' && failedEvents && failedEvents.length > 0 && (
            <>
              <button
                onClick={handleRetrySelected}
                disabled={retryMutation.isPending || selectedFailedIds.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {retryMutation.isPending ? 'Retrying...' : `Retry Selected (${selectedFailedIds.size})`}
              </button>
              <button
                onClick={handleRetryAll}
                disabled={retryMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Retry All Failed
              </button>
            </>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border rounded-lg">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending ({pendingEvents?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'failed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Failed ({failedEvents?.length ?? 0})
            </button>
          </div>
        </div>

        <DataTable>
          <thead className="bg-slate-50">
            <tr>
              {activeTab === 'failed' && (
                <th className="p-2 text-left">
                  <input
                    type="checkbox"
                    checked={failedEvents && failedEvents.length > 0 && selectedFailedIds.size === failedEvents.length}
                    onChange={(e) => {
                      if (e.target.checked && failedEvents) {
                        setSelectedFailedIds(new Set(failedEvents.map((e) => e.id)));
                      } else {
                        setSelectedFailedIds(new Set());
                      }
                    }}
                  />
                </th>
              )}
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Aggregate ID</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Attempts</th>
              <th className="p-2 text-left">Last Attempt</th>
              <th className="p-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {!displayEvents || displayEvents.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'failed' ? 8 : 7} className="p-4 text-center text-muted-foreground">
                  No {activeTab} events
                </td>
              </tr>
            ) : (
              displayEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50">
                  {activeTab === 'failed' && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedFailedIds.has(event.id)}
                        onChange={() => toggleFailedSelection(event.id)}
                      />
                    </td>
                  )}
                  <td className="p-2 font-mono text-xs">{event.id.slice(0, 8)}...</td>
                  <td className="p-2">{getEventType(event)}</td>
                  <td className="p-2 font-mono text-xs">{getAggregateId(event).slice(0, 8)}...</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        event.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : event.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="p-2 text-right">{event.attemptCount ?? 0}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {event.lastAttemptAt
                      ? new Date(event.lastAttemptAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="p-2 text-xs text-red-600">{event.errorMessage ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}

