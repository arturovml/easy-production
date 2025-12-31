import { OutboxRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { MockTransportDexie } from './mockTransport';

export type FlushItemResult = {
  id: string;
  status: 'sent' | 'failed';
  deduped?: boolean;
  error?: string;
};

export type FlushResult = {
  processed: number;
  sent: number;
  failed: number;
  deduped: number;
  items: FlushItemResult[];
};

export interface SyncService {
  flushOutboxOnce(args?: { limit?: number; failureRate?: number }): Promise<FlushResult>;
}

export class SyncServiceDexie implements SyncService {
  private outboxRepo: OutboxRepositoryDexie;
  private transport: MockTransportDexie;

  constructor() {
    this.outboxRepo = new OutboxRepositoryDexie();
    this.transport = new MockTransportDexie();
  }

  async flushOutboxOnce(args?: { limit?: number; failureRate?: number }): Promise<FlushResult> {
    const limit = args?.limit ?? 20;
    const failureRate = args?.failureRate ?? 0;

    const pending = await this.outboxRepo.listPending(limit);
    const result: FlushResult = {
      processed: pending.length,
      sent: 0,
      failed: 0,
      deduped: 0,
      items: [],
    };

    const now = new Date().toISOString();
    const sentIds: string[] = [];
    const failedItems: Array<{ id: string; error: string }> = [];

    // Process each event individually (isolate failures)
    for (const event of pending) {
      try {
        // Increment attempt count
        await this.outboxRepo.incrementAttempt(event.id, now);

        // Attempt to send
        const sendResult = await this.transport.send(event, failureRate);

        if (sendResult.ok) {
          if (sendResult.deduped) {
            result.deduped++;
            result.items.push({
              id: event.id,
              status: 'sent',
              deduped: true,
            });
          } else {
            result.sent++;
            result.items.push({
              id: event.id,
              status: 'sent',
              deduped: false,
            });
          }
          sentIds.push(event.id);
        } else {
          result.failed++;
          const errorMessage = sendResult.error ?? 'Unknown error';
          failedItems.push({ id: event.id, error: errorMessage });
          result.items.push({
            id: event.id,
            status: 'failed',
            error: errorMessage,
          });
        }
      } catch (error) {
        // Isolate per-item failures
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedItems.push({ id: event.id, error: errorMessage });
        result.items.push({
          id: event.id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    // Batch update sent events
    if (sentIds.length > 0) {
      await this.outboxRepo.markSent(sentIds, now);
    }

    // Mark failed events
    for (const { id, error } of failedItems) {
      await this.outboxRepo.markFailed(id, error, now);
    }

    return result;
  }
}

// Export singleton instance
export const syncService = new SyncServiceDexie();

