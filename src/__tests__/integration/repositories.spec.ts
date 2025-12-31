import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { AppDB } from '../../infra/dexie/db';
import { ProductSchema, OperationSchema, RoutingVersionSchema, RoutingOperationSchema, ProductionOrderSchema, WorkEventSchema, OutboxEventSchema } from '../../shared/schemas';
import { ProductRepositoryDexie } from '../../data/dexie/productRepositoryDexie';
import { OperationRepositoryDexie } from '../../data/dexie/operationRepositoryDexie';
import { RoutingRepositoryDexie } from '../../data/dexie/routingRepositoryDexie';
import { ProductionOrderRepositoryDexie } from '../../data/dexie/workOrderRepositoryDexie';
import { EventRepositoryDexie, OutboxRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';

function uniqueDbName() {
  return `EasyProductionTest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('repositories integration (dexie in Node via fake-indexeddb)', () => {
  let db: AppDB;

  beforeEach(async () => {
    db = new AppDB(uniqueDbName());
    // Ensure empty db
    await db.delete();
    // re-create instance
    db = new AppDB(uniqueDbName());
  });

  it('ProductRepository: add/get/list', async () => {
    const repo = new ProductRepositoryDexie(db);
    const p = ProductSchema.parse({ id: uuidv4(), sku: 'X1', name: 'TestProd' });
    await repo.add(p);
    const got = await repo.getById(p.id);
    expect(got).toBeDefined();
    expect(got?.sku).toBe('X1');
    const list = await repo.list();
    expect(list.length).toBe(1);
  });

  it('OperationRepository: add/list', async () => {
    const repo = new OperationRepositoryDexie(db);
    const op = OperationSchema.parse({ id: uuidv4(), code: 'OPX', name: 'OpX', durationMinutes: 5 });
    await repo.add(op);
    const list = await repo.list();
    expect(list.length).toBe(1);
  });

  it('RoutingRepository: create version and operations and fetch ordered', async () => {
    const repo = new RoutingRepositoryDexie(db);
    const rv = RoutingVersionSchema.parse({ id: uuidv4(), productId: uuidv4(), version: 1, createdAt: new Date().toISOString() });
    await repo.addRoutingVersion(rv);
    const ro1 = RoutingOperationSchema.parse({ id: uuidv4(), routingVersionId: rv.id, operationId: uuidv4(), sequence: 2 });
    const ro2 = RoutingOperationSchema.parse({ id: uuidv4(), routingVersionId: rv.id, operationId: uuidv4(), sequence: 1 });
    await repo.addRoutingOperation(ro1);
    await repo.addRoutingOperation(ro2);
    const ops = await repo.listRoutingOperationsByVersion(rv.id);
    expect(ops.length).toBe(2);
    expect(ops[0].sequence).toBe(1);
    expect(ops[1].sequence).toBe(2);
  });

  it('ProductionOrderRepository: create + fetch by workshop', async () => {
    const repo = new ProductionOrderRepositoryDexie(db);
    const po = ProductionOrderSchema.parse({ id: uuidv4(), productId: uuidv4(), quantityRequested: 50, workshopId: uuidv4(), routingVersionSnapshot: { id: uuidv4(), operations: [] } });
    await repo.add(po);
    const got = await repo.getById(po.id);
    expect(got?.id).toBe(po.id);
    const list = await repo.listByWorkshop(po.workshopId);
    expect(list.length).toBe(1);
  });

  it('EventRepository + Outbox: append and query', async () => {
    const eventRepo = new EventRepositoryDexie(db);
    const outboxRepo = new OutboxRepositoryDexie(db);
    const ev = WorkEventSchema.parse({ id: uuidv4(), type: 'PieceProduced', aggregateId: 'orderX', workshopId: uuidv4(), timestamp: new Date().toISOString(), payload: { qtyDone: 2 }, schemaVersion: 1 });
    await eventRepo.append(ev);
    const evs = await eventRepo.listByAggregate('orderX');
    expect(evs.length).toBe(1);

    const outEv = OutboxEventSchema.parse({ ...ev, status: 'pending' });
    await outboxRepo.enqueue(outEv);
    const pending = await outboxRepo.listPending();
    expect(pending.length).toBe(1);

    await outboxRepo.markSent([pending[0].id], new Date().toISOString());
    const pendingAfter = await outboxRepo.listPending();
    expect(pendingAfter.length).toBe(0);
  });

  it('seedDemoData works in Node with shim', async () => {
    // Importing seed and running should not throw when shim is active (setupFiles ensures shim)
    const { seedDemoData } = await import('../../seeds/seedDemoData.js');
    const result = await seedDemoData({ trackingMode: 'piece' as const });
    expect(result.products.length).toBeGreaterThanOrEqual(2);
  });
});
