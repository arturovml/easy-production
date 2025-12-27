import { WorkEvent, OutboxEvent } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface EventRepository {
  append(event: WorkEvent): Promise<void>;
  listByAggregate(aggregateId: string): Promise<WorkEvent[]>;
}

export class EventRepositoryDexie implements EventRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async append(event: WorkEvent): Promise<void> {
    await this.db.workEvents.add(event);
  }
  async listByAggregate(aggregateId: string): Promise<WorkEvent[]> {
    return this.db.workEvents.where('aggregateId').equals(aggregateId).sortBy('timestamp');
  }
}

// Outbox
export class OutboxRepositoryDexie {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async enqueue(event: OutboxEvent): Promise<void> {
    await this.db.outboxEvents.add(event);
  }
  async listPending(): Promise<OutboxEvent[]> {
    return this.db.outboxEvents.where('status').equals('pending').toArray();
  }
  async markSent(id: string): Promise<void> {
    await this.db.outboxEvents.update(id, { status: 'sent' });
  }
  async markFailed(id: string): Promise<void> {
    await this.db.outboxEvents.update(id, { status: 'failed' });
  }
}
