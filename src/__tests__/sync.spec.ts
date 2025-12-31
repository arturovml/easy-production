import { describe, it, expect, beforeEach } from 'vitest';
import { MockTransportDexie } from '../services/sync/mockTransport';
import { SyncServiceDexie } from '../services/sync/syncService';
import { OutboxRepositoryDexie } from '../data/dexie/eventRepositoryDexie';
import { OutboxEventSchema, WorkEventSchema } from '../shared/schemas';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../infra/dexie/db';

// Setup fake-indexeddb before tests
beforeEach(async () => {
  await db.remoteEvents.clear();
  await db.outboxEvents.clear();
});

describe('MockTransport idempotency', () => {
  it('deduplicates events by id on second send', async () => {
    const transport = new MockTransportDexie();
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

    // First send
    const result1 = await transport.send(event);
    expect(result1.ok).toBe(true);
    expect(result1.deduped).toBe(false);

    // Second send (should be deduped)
    const result2 = await transport.send(event);
    expect(result2.ok).toBe(true);
    expect(result2.deduped).toBe(true);

    // Count should still be 1
    const count = await transport.countReceived();
    expect(count).toBe(1);
  });
});

describe('SyncService flushOutboxOnce', () => {
  it('sends 2 pending events successfully', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    const syncService = new SyncServiceDexie();

    // Create 2 pending events
    const event1 = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestEvent1',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: 1 },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    const event2 = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestEvent2',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: 2 },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    await outboxRepo.enqueue(event1);
    await outboxRepo.enqueue(event2);

    // Flush with no failures
    const result = await syncService.flushOutboxOnce({ limit: 20, failureRate: 0 });

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.deduped).toBe(0);

    // Verify events are marked as sent
    const pending = await outboxRepo.listPending(100);
    expect(pending.length).toBe(0);

    const sentCount = await outboxRepo.countByStatus('sent');
    expect(sentCount).toBe(2);
  });

  it('fails events with failureRate=1 and increments attemptCount', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    const syncService = new SyncServiceDexie();

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
    const result = await syncService.flushOutboxOnce({ limit: 20, failureRate: 1 });

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

    // Verify event is marked as failed
    const failed = await outboxRepo.listFailed();
    expect(failed.length).toBe(1);
    expect(failed[0].status).toBe('failed');
    expect(failed[0].attemptCount).toBe(1);
    expect(failed[0].errorMessage).toBeDefined();

    // Verify pending does not include failed
    const pending = await outboxRepo.listPending(100);
    expect(pending.length).toBe(0);
  });

  it('retries failed events after reset (if reset implemented)', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    const syncService = new SyncServiceDexie();

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

    // First flush with failure
    await syncService.flushOutboxOnce({ limit: 20, failureRate: 1 });
    const failed1 = await outboxRepo.listFailed();
    expect(failed1.length).toBe(1);

    // Note: Reset failed to pending is not implemented yet
    // This test documents the expected behavior when it's implemented
    // For now, we verify that failed events don't appear in pending
    const pending = await outboxRepo.listPending(100);
    expect(pending.length).toBe(0);

    // TODO: Implement resetFailedToPending() method
    // Then test: reset -> flush with failureRate=0 -> should succeed
  });

  it('isolates per-item failures (one fails, one succeeds)', async () => {
    const outboxRepo = new OutboxRepositoryDexie();
    const syncService = new SyncServiceDexie();

    // Create event that will fail (type contains "Fail")
    const failEvent = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestFailEvent',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: 'fail' },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    // Create event that will succeed
    const successEvent = OutboxEventSchema.parse({
      ...WorkEventSchema.parse({
        id: uuidv4(),
        type: 'TestSuccessEvent',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { test: 'success' },
        schemaVersion: 1,
      }),
      status: 'pending',
      attemptCount: 0,
    });

    await outboxRepo.enqueue(failEvent);
    await outboxRepo.enqueue(successEvent);

    // Flush (failEvent will fail due to type containing "Fail")
    const result = await syncService.flushOutboxOnce({ limit: 20, failureRate: 0 });

    expect(result.processed).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);

    // Verify one sent, one failed
    const sentCount = await outboxRepo.countByStatus('sent');
    const failedCount = await outboxRepo.countByStatus('failed');
    expect(sentCount).toBe(1);
    expect(failedCount).toBe(1);
  });
});

