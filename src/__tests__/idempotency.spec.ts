import { describe, it, expect, beforeEach } from 'vitest';
import { EventRepositoryDexie } from '../data/dexie/eventRepositoryDexie';
import { OutboxRepositoryDexie } from '../data/dexie/eventRepositoryDexie';
import { WorkEventSchema, OutboxEventSchema } from '../shared/schemas';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../infra/dexie/db';

beforeEach(async () => {
  await db.workEvents.clear();
  await db.outboxEvents.clear();
});

describe('EventRepository idempotency', () => {
  it('deduplicates events by id on second append', async () => {
    const eventRepo = new EventRepositoryDexie();
    const event = WorkEventSchema.parse({
      id: uuidv4(),
      type: 'TestEvent',
      aggregateId: uuidv4(),
      workshopId: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: { test: true },
      schemaVersion: 1,
    });

    // First append
    const result1 = await eventRepo.append(event);
    expect(result1.ok).toBe(true);
    expect(result1.deduped).toBe(false);

    // Second append (should be deduped)
    const result2 = await eventRepo.append(event);
    expect(result2.ok).toBe(true);
    expect(result2.deduped).toBe(true);

    // Count should still be 1
    const count = await db.workEvents.count();
    expect(count).toBe(1);
  });
});

describe('OutboxRepository idempotency', () => {
  it('deduplicates outbox events by id on second enqueue', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    const event = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestEvent',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: true },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    // First enqueue
    const result1 = await outboxRepo.enqueue(event);
    expect(result1.ok).toBe(true);
    expect(result1.deduped).toBe(false);

    // Second enqueue (should be deduped)
    const result2 = await outboxRepo.enqueue(event);
    expect(result2.ok).toBe(true);
    expect(result2.deduped).toBe(true);

    // Count should still be 1
    const count = await db.outboxEvents.count();
    expect(count).toBe(1);
  });
});

describe('OutboxRepository retry failed', () => {
  it('resets failed events to pending and allows flush', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    // @ts-expect-error - NodeNext requires .js but Next.js resolves without extension
    const { SyncServiceDexie } = await import('../services/sync/syncService');
    const syncService = new SyncServiceDexie();

    // Create and fail an event
    const event = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestEvent',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: true },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    await outboxRepo.enqueue(event);

    // Flush with 100% failure rate
    await syncService.flushOutboxOnce({ limit: 20, failureRate: 1 });

    // Verify it's failed
    const failed = await outboxRepo.listFailed();
    expect(failed.length).toBe(1);
    expect(failed[0].status).toBe('failed');

    // Reset to pending
    await outboxRepo.resetFailedToPending([event.id], true);

    // Verify it's now pending
    const pending = await outboxRepo.listPending(100);
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('pending');
    expect(pending[0].errorMessage).toBeUndefined();

    // Flush with no failures - should succeed
    const flushResult = await syncService.flushOutboxOnce({ limit: 20, failureRate: 0 });
    expect(flushResult.sent).toBe(1);
    expect(flushResult.failed).toBe(0);
  });
});

