import { WorkEvent, OutboxEvent } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export type AppendResult = {
  ok: boolean;
  deduped: boolean;
};

export interface EventRepository {
  append(event: WorkEvent): Promise<AppendResult>;
  listByAggregate(aggregateId: string): Promise<WorkEvent[]>;
  listByAggregateIds(aggregateIds: string[]): Promise<WorkEvent[]>;
}

export class EventRepositoryDexie implements EventRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async append(event: WorkEvent): Promise<AppendResult> {
    try {
      await this.db.workEvents.add(event);
      return { ok: true, deduped: false };
    } catch (error: unknown) {
      // Dexie throws error if key already exists (constraint violation)
      // Check if event already exists
      const existing = await this.db.workEvents.get(event.id);
      if (existing) {
        return { ok: true, deduped: true };
      }
      // Re-throw if it's a different error
      throw error;
    }
  }

  async listByAggregate(aggregateId: string): Promise<WorkEvent[]> {
    return this.db.workEvents.where('aggregateId').equals(aggregateId).sortBy('timestamp');
  }

  async listByAggregateIds(aggregateIds: string[]): Promise<WorkEvent[]> {
    if (aggregateIds.length === 0) return [];
    // Use whereAnyOf for multiple aggregateIds
    return this.db.workEvents
      .where('aggregateId')
      .anyOf(aggregateIds)
      .sortBy('timestamp');
  }
}

// Outbox
export type EnqueueResult = {
  ok: boolean;
  deduped: boolean;
};

export interface OutboxRepository {
  enqueue(event: OutboxEvent): Promise<EnqueueResult>;
  listPending(limit?: number): Promise<OutboxEvent[]>;
  markSent(ids: string[], sentAt: string): Promise<void>;
  markFailed(id: string, errorMessage: string, attemptedAt: string): Promise<void>;
  incrementAttempt(id: string, attemptedAt: string): Promise<void>;
  listFailed(): Promise<OutboxEvent[]>;
  countByStatus(status: 'pending' | 'sent' | 'failed'): Promise<number>;
  resetFailedToPending(ids: string[], resetError?: boolean): Promise<void>;
}

export class OutboxRepositoryDexie implements OutboxRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async enqueue(event: OutboxEvent): Promise<EnqueueResult> {
    try {
      await this.db.outboxEvents.add(event);
      return { ok: true, deduped: false };
    } catch (error: unknown) {
      // Dexie throws error if key already exists (constraint violation)
      // Check if event already exists
      const existing = await this.db.outboxEvents.get(event.id);
      if (existing) {
        return { ok: true, deduped: true };
      }
      // Re-throw if it's a different error
      throw error;
    }
  }

  async listPending(limit: number = 20): Promise<OutboxEvent[]> {
    return this.db.outboxEvents
      .where('status')
      .equals('pending')
      .limit(limit)
      .sortBy('timestamp');
  }

  async markSent(ids: string[], sentAt: string): Promise<void> {
    // Fetch events and update them
    const events = await Promise.all(ids.map((id) => this.db.outboxEvents.get(id)));
    const updates = events
      .filter((e): e is OutboxEvent => e !== undefined)
      .map((e) => ({
        ...e,
        status: 'sent' as const,
        sentAt,
      }));
    await this.db.outboxEvents.bulkPut(updates);
  }

  async markFailed(id: string, errorMessage: string, attemptedAt: string): Promise<void> {
    await this.db.outboxEvents.update(id, {
      status: 'failed' as const,
      errorMessage,
      lastAttemptAt: attemptedAt,
    });
  }

  async incrementAttempt(id: string, attemptedAt: string): Promise<void> {
    const event = await this.db.outboxEvents.get(id);
    if (event) {
      await this.db.outboxEvents.update(id, {
        attemptCount: (event.attemptCount ?? 0) + 1,
        lastAttemptAt: attemptedAt,
        status: 'sending' as const, // Mark as sending during attempt
      });
    }
  }

  async listFailed(): Promise<OutboxEvent[]> {
    return this.db.outboxEvents.where('status').equals('failed').sortBy('lastAttemptAt');
  }

  async countByStatus(status: 'pending' | 'sent' | 'failed'): Promise<number> {
    return this.db.outboxEvents.where('status').equals(status).count();
  }

  async resetFailedToPending(ids: string[], resetError: boolean = true): Promise<void> {
    // Fetch events and update them
    const events = await Promise.all(ids.map((id) => this.db.outboxEvents.get(id)));
    const updates = events
      .filter((e): e is OutboxEvent => e !== undefined && e.status === 'failed')
      .map((e) => ({
        ...e,
        status: 'pending' as const,
        ...(resetError ? { errorMessage: undefined } : {}),
      }));
    await this.db.outboxEvents.bulkPut(updates);
  }
}
