import { OutboxEvent } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export type SendResult = {
  ok: boolean;
  deduped: boolean;
  error?: string;
};

export interface MockTransport {
  send(event: OutboxEvent, failureRate?: number): Promise<SendResult>;
  countReceived(): Promise<number>;
  clear(): Promise<void>;
}

export class MockTransportDexie implements MockTransport {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async send(event: OutboxEvent, failureRate: number = 0): Promise<SendResult> {
    // Check if already received (idempotency)
    const existing = await this.db.remoteEvents.get(event.id);
    if (existing) {
      return { ok: true, deduped: true };
    }

    // Simulate failure based on failureRate
    if (failureRate > 0 && Math.random() < failureRate) {
      return {
        ok: false,
        deduped: false,
        error: 'Simulated transport failure',
      };
    }

    // Simulate failure if event type contains "Fail" (for deterministic testing)
    // Check both event.type (from WorkEvent) and payload.type
    const eventType = event.type || ((event.payload as Record<string, unknown>)?.type as string);
    if (typeof eventType === 'string' && eventType.includes('Fail')) {
      return {
        ok: false,
        deduped: false,
        error: 'Simulated failure for test event',
      };
    }

    // Success: store in remoteEvents
    const now = new Date().toISOString();
    await this.db.remoteEvents.add({
      id: event.id,
      receivedAt: now,
      payload: event.payload,
    });

    return { ok: true, deduped: false };
  }

  async countReceived(): Promise<number> {
    return this.db.remoteEvents.count();
  }

  async clear(): Promise<void> {
    await this.db.remoteEvents.clear();
  }
}

